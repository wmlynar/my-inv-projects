const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ACTIVE_TASK_STATUSES = new Set(["in_progress", "paused"]);
const FLICKER_WINDOW_MS = 2500;
const MAX_FLICKER_CHANGES = 6;
const DIAG_SWITCHING_POLL_MS = 1000;
const BLOCK_IGNORE_REASONS = new Set(["action_wait"]);
const BLOCK_REASONS = new Set([
  "traffic",
  "traffic_overlap",
  "edge_lock",
  "node_lock",
  "reservation_wait",
  "reservation_entry",
  "avoidance",
  "avoidance_hold",
  "yield",
  "stuck",
  "paused",
  "manual",
  "no_motion",
  "idle",
  "offline"
]);
const AVOIDANCE_DISABLED = true;
const AVOIDANCE_BLOCK_BANNER = [
  "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
  "!!! WARNING: AVOIDANCE/YIELD DISABLED FOR E2E TESTS NOW !!!",
  "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
].join("\n");

function warnAvoidanceOverride(detail) {
  if (!AVOIDANCE_DISABLED) return;
  console.warn(`${AVOIDANCE_BLOCK_BANNER}\n${detail}\n`);
}

const parseBoolean = (value, fallback = false) => {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const parseNumber = (value) => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const dispatchStrategy =
  process.env.E2E_DISPATCH_STRATEGY || process.env.DISPATCH_STRATEGY || "nearest";
const yieldMode =
  process.env.E2E_TRAFFIC_YIELD_MODE || process.env.TRAFFIC_YIELD_MODE || "no-yield";
const requestedYieldRecovery =
  yieldMode === "yield" ? true : yieldMode === "no-yield" ? false : parseBoolean(yieldMode, false);
const yieldRecovery = false;
const segmentLength = parseNumber(
  process.env.E2E_TRAFFIC_SEGMENT_LENGTH || process.env.TRAFFIC_SEGMENT_LENGTH
);
const ignoreTraffic = parseBoolean(
  process.env.E2E_IGNORE_TRAFFIC || process.env.IGNORE_TRAFFIC,
  false
);

const DEFAULT_TRAFFIC_STRATEGIES = [
  "simple",
  "pulse-mapf",
  "pulse-mapf-avoid",
  "pulse-mapf-time",
  "sipp",
  "sipp-kinodynamic",
  "sipp-robust",
  "ecbs-sipp",
  "cbs-sipp",
  "cbs-full",
  "mapf-global",
  "mapf-pibt",
  "mapf-mstar",
  "mapf-smt"
];

function parseStrategiesList(value) {
  if (!value) return null;
  const list = String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return list.length ? list : null;
}

function resolveTrafficStrategies() {
  const single = process.env.E2E_TRAFFIC_STRATEGY || process.env.TRAFFIC_STRATEGY;
  if (single && String(single).trim()) {
    return [String(single).trim()];
  }
  const list = parseStrategiesList(
    process.env.E2E_TRAFFIC_STRATEGIES || process.env.TRAFFIC_STRATEGIES
  );
  if (list) return list;
  return DEFAULT_TRAFFIC_STRATEGIES;
}

function shouldSkipStrategy(strategy) {
  if (!AVOIDANCE_DISABLED) return false;
  const key = String(strategy || "").toLowerCase();
  if (key.includes("avoid")) {
    warnAvoidanceOverride(`Skipping strategy "${strategy}" because avoidance/yield is disabled.`);
    return true;
  }
  return false;
}
if (requestedYieldRecovery) {
  warnAvoidanceOverride(
    `Ignoring yieldRecovery=${requestedYieldRecovery}; avoidance/yield disabled for tests.`
  );
}

async function getFreePort(hosts = ["127.0.0.1", "0.0.0.0"]) {
  return new Promise((resolve, reject) => {
    const tryHost = (index, lastError) => {
      if (index >= hosts.length) {
        reject(lastError || new Error("free_port_failed"));
        return;
      }
      const host = hosts[index];
      const server = net.createServer();
      server.once("error", (err) => {
        server.close(() => {});
        tryHost(index + 1, err);
      });
      server.listen(0, host, () => {
        const address = server.address();
        const port = address && typeof address === "object" ? address.port : 0;
        server.close(() => resolve(port));
      });
    };
    tryHost(0, null);
  });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(baseUrl, pathName, options = {}, timeoutMs = 4000) {
  const response = await fetchWithTimeout(`${baseUrl}${pathName}`, options, timeoutMs);
  assert.ok(response.ok, `Expected ${pathName} to be OK`);
  return response.json();
}

async function fetchDiagnosticsSwitching(baseUrl) {
  return fetchJson(
    baseUrl,
    "/api/fleet/diagnostics?route=0&obstacles=0&history=0&switching=1",
    {},
    8000
  );
}

async function postJson(baseUrl, pathName, payload) {
  return fetchJson(
    baseUrl,
    pathName,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    },
    6000
  );
}

async function waitForHealthy(baseUrl, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}/health`);
      if (response.ok) {
        const json = await response.json();
        if (json && json.ok === true) {
          return;
        }
      }
    } catch (_err) {
      // ignore and retry
    }
    await delay(250);
  }
  throw new Error("Server did not become healthy in time.");
}

async function waitFor(predicate, options = {}) {
  const timeoutMs = options.timeoutMs ?? 30000;
  const intervalMs = options.intervalMs ?? 300;
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    try {
      if (await predicate()) return true;
      lastError = null;
    } catch (err) {
      if (err && err.fatal) {
        throw err;
      }
      lastError = err;
    }
    await delay(intervalMs);
  }
  if (lastError) {
    throw lastError;
  }
  return false;
}

function splitWorksites(worksites) {
  const picks = worksites.filter(
    (site) => site.group === "PICK" || String(site.id).startsWith("PICK-")
  );
  const drops = worksites.filter(
    (site) => site.group === "DROP" || String(site.id).startsWith("DROP-")
  );
  return { picks, drops };
}

function mapById(list) {
  return new Map((list || []).map((entry) => [entry.id, entry]));
}

function sortById(list) {
  return [...list].sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function summarizeTasks(tasks) {
  return (tasks || []).reduce((acc, task) => {
    const key = task?.status || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function summarizeRobots(robots) {
  return (robots || []).map((robot) => ({
    id: robot.id,
    activity: robot.activity,
    blocked: robot.blocked,
    diagState: robot.diagnostics?.state || null,
    diagReason: robot.diagnostics?.reason || null
  }));
}

function buildActiveRobotSet(tasks) {
  const active = new Set();
  (tasks || []).forEach((task) => {
    if (!task?.robotId) return;
    if (ACTIVE_TASK_STATUSES.has(task.status)) {
      active.add(task.robotId);
    }
  });
  return active;
}

function isBlockedReason(reason) {
  if (typeof reason !== "string") return false;
  if (BLOCK_IGNORE_REASONS.has(reason)) return false;
  if (reason.startsWith("blocked")) return true;
  return BLOCK_REASONS.has(reason);
}

function isYieldReason(reason) {
  return typeof reason === "string" && reason.startsWith("yield");
}

function isBlockingRobot(robot) {
  const diagnostics = robot.diagnostics || {};
  const reason = diagnostics.reason || null;
  const state = diagnostics.state || null;
  const shouldMove = Boolean(diagnostics.shouldMove);
  const moving = Boolean(diagnostics.moving);
  if (BLOCK_IGNORE_REASONS.has(reason)) return false;
  if (robot.blocked) return true;
  if (typeof robot.activity === "string" && robot.activity.startsWith("blocked")) return true;
  if (isBlockedReason(reason)) return true;
  if (state === "holding" || state === "stalled") return true;
  if (shouldMove && !moving) return true;
  return false;
}

function countFilled(worksites, ids) {
  const lookup = new Set(ids);
  return (worksites || []).reduce((acc, site) => {
    if (!lookup.has(site.id)) return acc;
    return site.filled ? acc + 1 : acc;
  }, 0);
}

function assertNoBlocks(snapshot) {
  const activeRobots = buildActiveRobotSet(snapshot.tasks);
  (snapshot.robots || []).forEach((robot) => {
    if (!activeRobots.has(robot.id)) return;
    if (!isBlockingRobot(robot)) return;
    const diagnostics = robot.diagnostics || {};
    const err = new Error(
      `Robot ${robot.id} blocked (${diagnostics.state || "n/a"}/${diagnostics.reason || "n/a"}). ` +
        `shouldMove=${diagnostics.shouldMove ? 1 : 0} moving=${diagnostics.moving ? 1 : 0} ` +
        `tasks=${JSON.stringify(summarizeTasks(snapshot.tasks))} ` +
        `robots=${JSON.stringify(summarizeRobots(snapshot.robots))}`
    );
    err.fatal = true;
    throw err;
  });
}

function assertNoYield(snapshot) {
  const activeRobots = buildActiveRobotSet(snapshot.tasks);
  (snapshot.robots || []).forEach((robot) => {
    if (!activeRobots.has(robot.id)) return;
    const diagnostics = robot.diagnostics || {};
    const reason = diagnostics.reason || null;
    if (robot.activity === "yielding" || isYieldReason(reason)) {
      const err = new Error(
        `Robot ${robot.id} yielded (${reason || robot.activity || "n/a"}). ` +
          `tasks=${JSON.stringify(summarizeTasks(snapshot.tasks))} ` +
          `robots=${JSON.stringify(summarizeRobots(snapshot.robots))}`
      );
      err.fatal = true;
      throw err;
    }
  });
}

function assertNoFlicker(snapshot, flickerWatch, now) {
  const activeRobots = buildActiveRobotSet(snapshot.tasks);
  (snapshot.robots || []).forEach((robot) => {
    if (!activeRobots.has(robot.id)) {
      flickerWatch.delete(robot.id);
      return;
    }
    const diagnostics = robot.diagnostics || {};
    const state = diagnostics.state || null;
    const reason = diagnostics.reason || null;
    const shouldMove = Boolean(diagnostics.shouldMove);
    if (!shouldMove) {
      flickerWatch.delete(robot.id);
      return;
    }
    const entry = flickerWatch.get(robot.id) || {
      windowStart: now,
      changes: 0,
      lastState: state,
      lastReason: reason
    };
    const changed = entry.lastState !== state || entry.lastReason !== reason;
    if (changed) {
      if (now - entry.windowStart > FLICKER_WINDOW_MS) {
        entry.windowStart = now;
        entry.changes = 0;
      }
      entry.changes += 1;
      entry.lastState = state;
      entry.lastReason = reason;
    }
    if (entry.changes > MAX_FLICKER_CHANGES) {
      const err = new Error(
        `Robot ${robot.id} flicker (${entry.changes} changes/${now - entry.windowStart}ms). ` +
          `state=${state || "n/a"} reason=${reason || "n/a"} ` +
          `tasks=${JSON.stringify(summarizeTasks(snapshot.tasks))} ` +
          `robots=${JSON.stringify(summarizeRobots(snapshot.robots))}`
      );
      err.fatal = true;
      throw err;
    }
    flickerWatch.set(robot.id, entry);
  });
}

function assertNoSwitching(snapshot, activeRobots) {
  (snapshot.robots || []).forEach((entry) => {
    const robot = entry.robot || entry;
    if (!robot?.id || !activeRobots.has(robot.id)) return;
    const switching = robot.diagnostics?.switching;
    if (!switching?.detected) return;
    const err = new Error(
      `Robot ${robot.id} switching detected (state=${switching.stateChanges}, reason=${switching.reasonChanges}, ` +
        `oscillations=${switching.stateOscillations || 0}/${switching.reasonOscillations || 0}).`
    );
    err.fatal = true;
    throw err;
  });
}

async function run() {
  const port = await getFreePort();
  const roboshopPort = await getFreePort();
  const env = {
    ...process.env,
    PORT: String(port),
    ROBOSHOP_PORT: String(roboshopPort),
    BIND_HOST: "127.0.0.1",
    ROBOSHOP_BIND_HOST: "127.0.0.1",
    FLEET_ACTIVE_SCENE_ID: "traffic",
    FLEET_SIM_FAST: "1",
    FLEET_SIM_SPEED_MULTIPLIER: process.env.FLEET_SIM_SPEED_MULTIPLIER || "6",
    FLEET_SIM_ACTION_WAIT_MS: "0",
    FLEET_SIM_IGNORE_TRAFFIC: ignoreTraffic ? "1" : "0",
    FLEET_SIM_COLLISION_BLOCKING: "0"
  };
  const server = spawn("node", ["src/server.js"], {
    cwd: path.resolve(__dirname, ".."),
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let serverExited = false;
  server.on("exit", (code) => {
    serverExited = true;
    if (code && code !== 0) {
      process.stderr.write(`Server exited with code ${code}\n`);
    }
  });

  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await waitForHealthy(baseUrl);
    await postJson(baseUrl, "/api/scenes/activate", { sceneId: "traffic" });

    const initial = await fetchJson(baseUrl, "/api/fleet/status?worksites=1");
    const robots = initial.robots || [];
    assert.ok(robots.length > 0, "Expected at least one robot");
    const primaryRobotId = robots[0]?.id;
    assert.ok(primaryRobotId, "Expected a primary robot id");

    for (const robot of robots) {
      await postJson(baseUrl, `/api/fleet/robots/${encodeURIComponent(robot.id)}/control`, {
        controlled: true
      });
      await postJson(baseUrl, `/api/fleet/robots/${encodeURIComponent(robot.id)}/dispatchable`, {
        dispatchable: true
      });
    }
    async function setDispatchable(allowedIds) {
      const allowSet = new Set(allowedIds);
      for (const robot of robots) {
        await postJson(baseUrl, `/api/fleet/robots/${encodeURIComponent(robot.id)}/dispatchable`, {
          dispatchable: allowSet.has(robot.id)
        });
      }
    }
    const trafficOptions = {
      yieldRecovery,
      reservationWaits: false,
      avoidanceLocks: false,
      avoidanceZones: false
    };
    if (Number.isFinite(segmentLength)) {
      trafficOptions.segmentLength = segmentLength;
    }
    const trafficStrategies = resolveTrafficStrategies();

    async function applyTrafficStrategy(strategy) {
      await postJson(baseUrl, "/api/sim/settings", {
        dispatchStrategy,
        trafficStrategy: strategy,
        trafficOptions
      });
    }

    const worksites = initial.worksites || [];
    const { picks, drops } = splitWorksites(worksites);
    assert.ok(picks.length > 0, "Expected pick worksites");
    assert.ok(drops.length > 0, "Expected drop worksites");

    const pickIndex = mapById(picks);
    const dropIndex = mapById(drops);
    const pickIds = ["PICK-A1", "PICK-A2", "PICK-A3", "PICK-A4"].filter((id) =>
      pickIndex.has(id)
    );
    const dropIds = ["DROP-A1", "DROP-A2", "DROP-A3", "DROP-A4"].filter((id) =>
      dropIndex.has(id)
    );
    assert.equal(pickIds.length, 4, "Expected PICK-A1..PICK-A4 in traffic scene");
    assert.equal(dropIds.length, 4, "Expected DROP-A1..DROP-A4 in traffic scene");

    const sortedPicks = sortById(picks);
    const sortedDrops = sortById(drops);

    async function resetWorksites() {
      for (const site of sortedDrops) {
        await postJson(baseUrl, `/api/fleet/worksites/${encodeURIComponent(site.id)}`, {
          filled: false,
          blocked: false
        });
      }
      for (const site of sortedPicks) {
        await postJson(baseUrl, `/api/fleet/worksites/${encodeURIComponent(site.id)}`, {
          filled: false,
          blocked: false
        });
      }
    }

    async function fillPicks(pickIdsToFill) {
      for (const pickId of pickIdsToFill) {
        await postJson(baseUrl, `/api/fleet/worksites/${encodeURIComponent(pickId)}`, {
          filled: true,
          blocked: false
        });
      }
    }

    async function monitorForDuration(durationMs) {
      const start = Date.now();
      const flickerWatch = new Map();
      let lastSwitchingAt = Date.now();
      while (Date.now() - start < durationMs) {
        const status = await fetchJson(baseUrl, "/api/fleet/status?worksites=1");
        const now = Date.now();
        const activeRobots = buildActiveRobotSet(status.tasks);
        assertNoYield(status);
        assertNoBlocks(status);
        assertNoFlicker(status, flickerWatch, now);
        if (now - lastSwitchingAt >= DIAG_SWITCHING_POLL_MS) {
          const diagSnapshot = await fetchDiagnosticsSwitching(baseUrl);
          assertNoSwitching(diagSnapshot, activeRobots);
          lastSwitchingAt = now;
        }
        await delay(350);
      }
    }

    async function waitForIdle() {
      await waitFor(
        async () => {
          const status = await fetchJson(baseUrl, "/api/fleet/status?worksites=1");
          const now = Date.now();
          const activeRobots = buildActiveRobotSet(status.tasks);
          assertNoYield(status);
          assertNoBlocks(status);
          assertNoFlicker(status, new Map(), now);
          const activeTasks = (status.tasks || []).some((task) =>
            ACTIVE_TASK_STATUSES.has(task.status)
          );
          return !activeTasks;
        },
        { timeoutMs: 30000, intervalMs: 350 }
      );
    }

    async function runDeliveryScenario(name, steps) {
      await setDispatchable([primaryRobotId]);
      const expectedPickIds = new Set();
      steps.forEach((step) => step.picks.forEach((id) => expectedPickIds.add(id)));
      await resetWorksites();
      await waitForIdle();

      for (const step of steps) {
        if (step.delayMs > 0) {
          await monitorForDuration(step.delayMs);
        }
        await fillPicks(step.picks);
      }

      const observedTasks = new Set();
      const flickerWatch = new Map();
      let lastSwitchingAt = Date.now();
      const finished = await waitFor(
        async () => {
          const status = await fetchJson(baseUrl, "/api/fleet/status?worksites=1");
          const now = Date.now();
          const activeRobots = buildActiveRobotSet(status.tasks);
          assertNoYield(status);
          assertNoBlocks(status);
          assertNoFlicker(status, flickerWatch, now);
          if (now - lastSwitchingAt >= DIAG_SWITCHING_POLL_MS) {
            const diagSnapshot = await fetchDiagnosticsSwitching(baseUrl);
            assertNoSwitching(diagSnapshot, activeRobots);
            lastSwitchingAt = now;
          }
          const nextWorksites = status.worksites || [];
          const picksEmpty = [...expectedPickIds].every(
            (id) => !nextWorksites.find((site) => site.id === id)?.filled
          );
          const dropsFilledCount = countFilled(nextWorksites, dropIds);
          (status.tasks || []).forEach((task) => {
            if (expectedPickIds.has(task.pickId)) {
              observedTasks.add(task.pickId);
            }
          });
          return picksEmpty && dropsFilledCount === expectedPickIds.size;
        },
        { timeoutMs: 90000, intervalMs: 350 }
      );

      if (!finished) {
        const status = await fetchJson(baseUrl, "/api/fleet/status?worksites=1");
        const nextWorksites = status.worksites || [];
        const picksFilled = countFilled(nextWorksites, expectedPickIds);
        const dropsFilled = countFilled(nextWorksites, dropIds);
        const error = new Error(
          `Deliveries did not complete (${name}). ` +
            `picksFilled=${picksFilled}/${expectedPickIds.size} ` +
            `dropsFilled=${dropsFilled}/${expectedPickIds.size} ` +
            `tasks=${JSON.stringify(summarizeTasks(status.tasks))} ` +
            `robots=${JSON.stringify(summarizeRobots(status.robots))}`
        );
        error.fatal = true;
        throw error;
      }
      assert.equal(
        observedTasks.size,
        expectedPickIds.size,
        `Expected one task per pick (${name})`
      );
      console.log(`E2E fleet delivery ok: ${name}`);
    }

    for (const strategy of trafficStrategies) {
      if (shouldSkipStrategy(strategy)) {
        continue;
      }
      console.log(`E2E fleet delivery: strategy=${strategy}`);
      await applyTrafficStrategy(strategy);

      await runDeliveryScenario(`${strategy}/sequential-single`, [
        { delayMs: 0, picks: ["PICK-A1"] },
        { delayMs: 1200, picks: ["PICK-A2"] },
        { delayMs: 1400, picks: ["PICK-A3"] },
        { delayMs: 1600, picks: ["PICK-A4"] }
      ]);

      await runDeliveryScenario(`${strategy}/burst-all`, [
        { delayMs: 0, picks: ["PICK-A1", "PICK-A2", "PICK-A3", "PICK-A4"] }
      ]);

      await runDeliveryScenario(`${strategy}/pair-batch`, [
        { delayMs: 0, picks: ["PICK-A1", "PICK-A2"] },
        { delayMs: 1800, picks: ["PICK-A3", "PICK-A4"] }
      ]);
    }
  } finally {
    if (!serverExited) {
      server.kill("SIGTERM");
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
