const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ACTIVE_TASK_STATUSES = new Set(["in_progress", "paused"]);
const FLICKER_WINDOW_MS = 2500;
const MAX_FLICKER_CHANGES = 6;
const DIAG_SWITCHING_POLL_MS = 1000;

const WAIT_REASONS = new Set([
  "reservation_wait",
  "reservation_entry",
  "edge_lock",
  "node_lock",
  "traffic",
  "traffic_overlap",
  "critical_section_wait"
]);

const HARD_BLOCK_REASONS = new Set([
  "blocked",
  "blocked_collision",
  "paused",
  "manual",
  "manual_override",
  "offline",
  "stuck",
  "no_motion"
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

function isYieldReason(reason) {
  return typeof reason === "string" && reason.startsWith("yield");
}

function isWaiting(robot) {
  const diagnostics = robot.diagnostics || {};
  const reason = diagnostics.reason || null;
  const state = diagnostics.state || null;
  const shouldMove = Boolean(diagnostics.shouldMove);
  return shouldMove && state === "holding" && WAIT_REASONS.has(reason);
}

function isHardBlocked(robot) {
  const diagnostics = robot.diagnostics || {};
  const reason = diagnostics.reason || null;
  const state = diagnostics.state || null;
  const shouldMove = Boolean(diagnostics.shouldMove);
  if (robot.blocked) return true;
  if (typeof robot.activity === "string" && robot.activity.startsWith("blocked")) return true;
  if (HARD_BLOCK_REASONS.has(reason)) return true;
  if (state === "holding" && shouldMove && reason && reason.startsWith("blocked")) return true;
  return false;
}

function assertNoYield(snapshot) {
  const activeRobots = buildActiveRobotSet(snapshot.tasks);
  (snapshot.robots || []).forEach((robot) => {
    if (!activeRobots.has(robot.id)) return;
    const diagnostics = robot.diagnostics || {};
    const reason = diagnostics.reason || null;
    if (robot.activity === "yielding" || isYieldReason(reason)) {
      const err = new Error(
        `Robot ${robot.id} yielded (${reason || robot.activity || "n/a"}).`
      );
      err.fatal = true;
      throw err;
    }
  });
}

function assertNoHardBlocks(snapshot) {
  const activeRobots = buildActiveRobotSet(snapshot.tasks);
  (snapshot.robots || []).forEach((robot) => {
    if (!activeRobots.has(robot.id)) return;
    if (!isHardBlocked(robot)) return;
    const diagnostics = robot.diagnostics || {};
    const err = new Error(
      `Robot ${robot.id} blocked (${diagnostics.state || "n/a"}/${diagnostics.reason || "n/a"}).`
    );
    err.fatal = true;
    throw err;
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
        `Robot ${robot.id} flicker (${entry.changes} changes/${now - entry.windowStart}ms).`
      );
      err.fatal = true;
      throw err;
    }
    flickerWatch.set(robot.id, entry);
  });
}

function assertAtMostOneWaiting(snapshot) {
  const activeRobots = buildActiveRobotSet(snapshot.tasks);
  const waiting = (snapshot.robots || []).filter(
    (robot) => activeRobots.has(robot.id) && isWaiting(robot)
  );
  if (waiting.length > 1) {
    const err = new Error(
      `Expected at most one robot waiting, got ${waiting.map((r) => r.id).join(", ")}.`
    );
    err.fatal = true;
    throw err;
  }
}

async function fetchDiagnosticsSwitching(baseUrl) {
  return fetchJson(
    baseUrl,
    "/api/fleet/diagnostics?route=0&obstacles=0&history=0&switching=1",
    {},
    8000
  );
}

function assertNoSwitching(snapshot, activeRobots) {
  (snapshot.robots || []).forEach((entry) => {
    const robot = entry.robot || entry;
    if (!robot?.id || !activeRobots.has(robot.id)) return;
    const switching = robot.diagnostics?.switching;
    if (!switching?.detected) return;
    const err = new Error(
      `Robot ${robot.id} switching detected (state=${switching.stateChanges}, reason=${switching.reasonChanges}).`
    );
    err.fatal = true;
    throw err;
  });
}

function analyzeWaitHistory(robots) {
  const perRobot = {};
  const bucketMs = 250;
  const waitBuckets = new Map();

  robots.forEach((entry) => {
    const robot = entry.robot || entry;
    const id = robot.id || "unknown";
    const hist = robot.diagnosticsHistory || [];
    let waitCount = 0;
    const reasonCounts = {};

    for (const item of hist) {
      const reason = item.reason || null;
      const state = item.state || null;
      const shouldMove = Boolean(item.shouldMove);
      if (!shouldMove || state !== "holding" || !WAIT_REASONS.has(reason)) continue;
      waitCount += 1;
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      const bucket = Math.floor(item.at / bucketMs);
      const set = waitBuckets.get(bucket) || new Set();
      set.add(id);
      waitBuckets.set(bucket, set);
    }

    perRobot[id] = { waitCount, reasonCounts };
  });

  let maxWaiters = 0;
  waitBuckets.forEach((set) => {
    if (set.size > maxWaiters) maxWaiters = set.size;
  });

  return { perRobot, maxWaiters };
}

async function run() {
  const port = await getFreePort();
  const roboshopPort = await getFreePort();
  const trafficStrategy =
    process.env.E2E_TRAFFIC_STRATEGY || process.env.TRAFFIC_STRATEGY || "pulse-mapf-time";

  if (AVOIDANCE_DISABLED && String(trafficStrategy).toLowerCase().includes("avoid")) {
    warnAvoidanceOverride(`Skipping strategy "${trafficStrategy}" because avoidance/yield is disabled.`);
    return;
  }

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
    await fetchJson(baseUrl, "/api/fleet/diagnostics?history=1&historyClear=1&historyLimit=3000");
    await postJson(baseUrl, "/api/scenes/activate", { sceneId: "traffic" });

    const initial = await fetchJson(baseUrl, "/api/fleet/status?worksites=1");
    const robots = initial.robots || [];
    assert.ok(robots.length >= 2, "Expected at least two robots");

    for (const robot of robots) {
      await postJson(baseUrl, `/api/fleet/robots/${encodeURIComponent(robot.id)}/control`, {
        controlled: true
      });
      await postJson(baseUrl, `/api/fleet/robots/${encodeURIComponent(robot.id)}/dispatchable`, {
        dispatchable: true
      });
      await postJson(baseUrl, `/api/fleet/robots/${encodeURIComponent(robot.id)}/manual`, {
        enabled: false
      });
    }

    await postJson(baseUrl, "/api/sim/settings", {
      dispatchStrategy: process.env.E2E_DISPATCH_STRATEGY || process.env.DISPATCH_STRATEGY || "nearest",
      trafficStrategy,
      trafficOptions: {
        yieldRecovery: false,
        avoidanceLocks: false,
        avoidanceZones: false
      }
    });

    const worksites = initial.worksites || [];
    const pickIds = ["PICK-A1", "PICK-A4"];
    const dropIds = ["DROP-A1", "DROP-A2", "DROP-A3", "DROP-A4"];
    pickIds.forEach((id) => {
      assert.ok(worksites.find((site) => site.id === id), `Missing ${id} in traffic scene`);
    });
    dropIds.forEach((id) => {
      assert.ok(worksites.find((site) => site.id === id), `Missing ${id} in traffic scene`);
    });

    for (const site of worksites) {
      await postJson(baseUrl, `/api/fleet/worksites/${encodeURIComponent(site.id)}`, {
        filled: false,
        blocked: false
      });
    }

    await postJson(baseUrl, "/api/fleet/worksites/DROP-A1", { filled: true, blocked: false });
    await postJson(baseUrl, "/api/fleet/worksites/DROP-A2", { filled: true, blocked: false });
    await postJson(baseUrl, "/api/fleet/worksites/DROP-A3", { filled: false, blocked: false });
    await postJson(baseUrl, "/api/fleet/worksites/DROP-A4", { filled: false, blocked: false });

    await Promise.all(
      pickIds.map((id) =>
        postJson(baseUrl, `/api/fleet/worksites/${encodeURIComponent(id)}`, {
          filled: true,
          blocked: false
        })
      )
    );

    const flickerWatch = new Map();
    let lastSwitchingAt = Date.now();

    const finished = await waitFor(
      async () => {
        const status = await fetchJson(baseUrl, "/api/fleet/status?worksites=1");
        const now = Date.now();
        const activeRobots = buildActiveRobotSet(status.tasks);
        assertNoYield(status);
        assertNoHardBlocks(status);
        assertNoFlicker(status, flickerWatch, now);
        assertAtMostOneWaiting(status);
        if (now - lastSwitchingAt >= DIAG_SWITCHING_POLL_MS) {
          const diagSnapshot = await fetchDiagnosticsSwitching(baseUrl);
          assertNoSwitching(diagSnapshot, activeRobots);
          lastSwitchingAt = now;
        }
        const nextWorksites = status.worksites || [];
        const picksEmpty = pickIds.every(
          (id) => !nextWorksites.find((site) => site.id === id)?.filled
        );
        const dropsFilled = ["DROP-A3", "DROP-A4"].every(
          (id) => nextWorksites.find((site) => site.id === id)?.filled
        );
        return picksEmpty && dropsFilled;
      },
      { timeoutMs: 90000, intervalMs: 350 }
    );

    assert.ok(finished, "Expected extreme pick deliveries to complete");

    const diag = await fetchJson(baseUrl, "/api/fleet/diagnostics?history=1&historyLimit=3000");
    const analysis = analyzeWaitHistory(diag.robots || []);
    const waitedRobots = Object.entries(analysis.perRobot)
      .filter(([, value]) => value.waitCount > 0)
      .map(([id]) => id);

    if (analysis.maxWaiters > 1) {
      throw new Error("Diagnostics history shows simultaneous waiting robots.");
    }
    assert.equal(
      waitedRobots.length,
      1,
      `Expected exactly one robot to wait, got ${waitedRobots.length}. ` +
        `Details=${JSON.stringify(analysis.perRobot)}`
    );

    console.log(`E2E extreme traffic ok: waiting robot=${waitedRobots[0]}`);
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
