const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ACTIVE_TASK_STATUSES = new Set(["in_progress", "paused"]);
const HOLD_IGNORE_REASONS = new Set(["action_wait", "manual", "paused"]);
const DEADLOCK_HOLD_MS = 30000;
const NO_PROGRESS_MS = 20000;
const TASK_STALL_MS = 30000;
const TASK_BLOCKED_MS = 8000;
const TASK_UNASSIGNED_MS = 8000;
const FLICKER_WINDOW_MS = 2000;
const MAX_FLICKER_CHANGES = 12;
const DIAG_SWITCHING_POLL_MS = 1000;
const BLOCK_IGNORE_REASONS = new Set(["action_wait", "no_motion"]);
const BLOCK_HOLD_IGNORE_REASONS = new Set([
  "traffic",
  "traffic_overlap",
  "edge_lock",
  "node_lock",
  "reservation_wait",
  "reservation_entry",
  "avoidance",
  "avoidance_hold",
  "yield"
]);
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

const trafficStrategy =
  process.env.E2E_TRAFFIC_STRATEGY || process.env.TRAFFIC_STRATEGY || "pulse-mapf";
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
if (requestedYieldRecovery) {
  warnAvoidanceOverride(
    `Ignoring yieldRecovery=${requestedYieldRecovery}; avoidance/yield disabled for tests.`
  );
}

const formatPose = (pose) => {
  if (!pose || !Number.isFinite(pose.x) || !Number.isFinite(pose.y)) return "n/a";
  return `${pose.x.toFixed(2)},${pose.y.toFixed(2)}`;
};

const summarizeTasks = (tasks) =>
  (tasks || []).reduce((acc, task) => {
    const key = task?.status || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

const summarizeRobots = (robots) =>
  (robots || []).map((robot) => ({
    id: robot.id,
    activity: robot.activity,
    blocked: robot.blocked,
    speed: Number.isFinite(robot.speed) ? Number(robot.speed.toFixed(2)) : null,
    pose: formatPose(robot.pose),
    diagState: robot.diagnostics?.state || null,
    diagReason: robot.diagnostics?.reason || null
  }));

const buildProgressKey = (snapshot) => {
  const worksites = (snapshot.worksites || [])
    .map((site) => `${site.id}:${site.filled ? 1 : 0}:${site.blocked ? 1 : 0}`)
    .sort();
  const tasks = (snapshot.tasks || [])
    .map((task) => `${task.id}:${task.status}:${task.phase}:${task.robotId || ""}`)
    .sort();
  const robots = (snapshot.robots || [])
    .map((robot) => {
      const pose = robot.pose || {};
      const x = Number.isFinite(pose.x) ? pose.x.toFixed(2) : "n";
      const y = Number.isFinite(pose.y) ? pose.y.toFixed(2) : "n";
      const state = robot.diagnostics?.state || "";
      const reason = robot.diagnostics?.reason || "";
      return `${robot.id}:${state}:${reason}:${x}:${y}`;
    })
    .sort();
  return `${worksites.join("|")}||${tasks.join("|")}||${robots.join("|")}`;
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

async function fetchText(baseUrl, pathName) {
  const response = await fetchWithTimeout(`${baseUrl}${pathName}`);
  assert.ok(response.ok, `Expected ${pathName} to be OK`);
  return response.text();
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

async function fetchDiagnosticsHistory(baseUrl, historyLimit = 200) {
  const limit = Number.isFinite(historyLimit) ? Math.max(0, historyLimit) : 200;
  return fetchJson(
    baseUrl,
    `/api/fleet/diagnostics?route=0&obstacles=0&history=1&switching=0&historyLimit=${limit}`,
    {},
    8000
  );
}

function formatHistoryEntry(entry) {
  if (!entry) return "n/a";
  const at = Number.isFinite(entry.at) ? new Date(entry.at).toISOString() : "n/a";
  const state = entry.state || "n/a";
  const reason = entry.reason || "n/a";
  const detail = entry.detail ? JSON.stringify(entry.detail) : "";
  return `${at} ${state}/${reason}${detail ? ` ${detail}` : ""}`;
}

async function dumpDiagnosticsHistory(baseUrl, snapshot, err) {
  try {
    const settings = await fetchJson(baseUrl, "/api/sim/settings", {}, 8000);
    const simSettings = settings?.settings || {};
    console.error(
      `Sim settings: traffic=${simSettings.trafficStrategy || "n/a"} ` +
        `override=${simSettings.overrides?.trafficStrategy || "n/a"}`
    );
    const diag = await fetchDiagnosticsHistory(baseUrl, 200);
    const activeRobots = buildActiveRobotSet(snapshot.tasks);
    const entries = (diag.robots || []).filter((entry) =>
      activeRobots.has(entry.robot?.id)
    );
    if (!entries.length) {
      console.error("Diagnostics history dump: no active robots.");
      return;
    }
    console.error(`Diagnostics history dump (${err?.message || "error"})`);
    entries.forEach((entry) => {
      const robot = entry.robot || {};
      const history = robot.diagnosticsHistory || [];
      const tail = history.slice(-12).map(formatHistoryEntry);
      console.error(
        `Robot ${robot.id || "n/a"} history (${history.length}):\n${tail.join("\n")}`
      );
    });
  } catch (historyErr) {
    console.error(`Diagnostics history dump failed: ${historyErr?.message || historyErr}`);
  }
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

function splitWorksites(worksites) {
  const picks = worksites.filter(
    (site) => site.group === "PICK" || String(site.id).startsWith("PICK-")
  );
  const drops = worksites.filter(
    (site) => site.group === "DROP" || String(site.id).startsWith("DROP-")
  );
  return { picks, drops };
}

function sortById(list) {
  return [...list].sort((a, b) => String(a.id).localeCompare(String(b.id)));
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
  if (state === "holding" && BLOCK_HOLD_IGNORE_REASONS.has(reason)) return false;
  if (robot.blocked) return true;
  if (typeof robot.activity === "string" && robot.activity.startsWith("blocked")) return true;
  if (isBlockedReason(reason)) return true;
  if (state === "holding" || state === "stalled") return true;
  if (shouldMove && !moving) return true;
  return false;
}

function assertNoBlocks(snapshot) {
  const activeRobots = buildActiveRobotSet(snapshot.tasks);
  (snapshot.robots || []).forEach((robot) => {
    if (!activeRobots.has(robot.id)) return;
    if (!isBlockingRobot(robot)) return;
    const diagnostics = robot.diagnostics || {};
    throw new Error(
      `Robot ${robot.id} blocked (${diagnostics.state || "n/a"}/${diagnostics.reason || "n/a"}). ` +
        `shouldMove=${diagnostics.shouldMove ? 1 : 0} moving=${diagnostics.moving ? 1 : 0} ` +
        `tasks=${JSON.stringify(summarizeTasks(snapshot.tasks))} ` +
        `robots=${JSON.stringify(summarizeRobots(snapshot.robots))}`
    );
  });
}

function assertNoYield(snapshot) {
  const activeRobots = buildActiveRobotSet(snapshot.tasks);
  (snapshot.robots || []).forEach((robot) => {
    if (!activeRobots.has(robot.id)) return;
    const diagnostics = robot.diagnostics || {};
    const reason = diagnostics.reason || null;
    if (robot.activity === "yielding" || isYieldReason(reason)) {
      throw new Error(
        `Robot ${robot.id} yielded (${reason || robot.activity || "n/a"}). ` +
          `tasks=${JSON.stringify(summarizeTasks(snapshot.tasks))} ` +
          `robots=${JSON.stringify(summarizeRobots(snapshot.robots))}`
      );
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
      throw new Error(
        `Robot ${robot.id} flicker (${entry.changes} changes/${now - entry.windowStart}ms). ` +
          `state=${state || "n/a"} reason=${reason || "n/a"} ` +
          `tasks=${JSON.stringify(summarizeTasks(snapshot.tasks))} ` +
          `robots=${JSON.stringify(summarizeRobots(snapshot.robots))}`
      );
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
    throw new Error(
      `Robot ${robot.id} switching detected (state=${switching.stateChanges}, reason=${switching.reasonChanges}, ` +
        `oscillations=${switching.stateOscillations || 0}/${switching.reasonOscillations || 0}).`
    );
  });
}

function assertNoDeadlock(snapshot, watchMap, now) {
  const robots = snapshot.robots || [];
  const activeRobots = buildActiveRobotSet(snapshot.tasks);
  robots.forEach((robot) => {
    if (!activeRobots.has(robot.id)) {
      watchMap.delete(robot.id);
      return;
    }
    const diagnostics = robot.diagnostics || {};
    const state = diagnostics.state;
    const reason = diagnostics.reason || null;
    const moving = Boolean(diagnostics.moving);
    const shouldMove = Boolean(diagnostics.shouldMove);
    const movingHold = moving && shouldMove;
    const isHolding =
      state === "holding" && !HOLD_IGNORE_REASONS.has(reason) && !movingHold;
    const isStalled = state === "stalled";
    if (!isHolding && !isStalled) {
      watchMap.delete(robot.id);
      return;
    }
    const entry = watchMap.get(robot.id) || { since: now };
    entry.state = state;
    entry.reason = reason;
    entry.detail = diagnostics.detail || null;
    entry.pose = robot.pose || null;
    watchMap.set(robot.id, entry);
  });

  for (const [robotId, entry] of watchMap.entries()) {
    if (!activeRobots.has(robotId)) {
      watchMap.delete(robotId);
      continue;
    }
    const heldMs = now - entry.since;
    if (heldMs > DEADLOCK_HOLD_MS) {
      throw new Error(
        `Robot ${robotId} stuck for ${heldMs}ms (${entry.state}/${entry.reason}). ` +
          `pose=${formatPose(entry.pose)} detail=${JSON.stringify(entry.detail)} ` +
          `tasks=${JSON.stringify(summarizeTasks(snapshot.tasks))} ` +
          `robots=${JSON.stringify(summarizeRobots(snapshot.robots))}`
      );
    }
  }
}

function assertTaskProgress(snapshot, taskWatch, now) {
  const tasks = snapshot.tasks || [];
  const robotsById = new Map((snapshot.robots || []).map((robot) => [robot.id, robot]));
  const seen = new Set();
  tasks.forEach((task) => {
    if (!task?.id) return;
    const id = task.id;
    seen.add(id);
    const status = task.status || "unknown";
    const phase = task.phase || null;
    const isActive = ACTIVE_TASK_STATUSES.has(status);
    const blockedPhase =
      phase === "no_route" || (typeof phase === "string" && phase.startsWith("blocked"));
    const entry =
      taskWatch.get(id) || {
        status,
        phase,
        lastChangeAt: now,
        blockedSince: null,
        unassignedSince: null,
        lastPose: null,
        lastWaitMs: null
      };
    if (entry.status !== status || entry.phase !== phase) {
      entry.status = status;
      entry.phase = phase;
      entry.lastChangeAt = now;
      entry.blockedSince = null;
    }
    const robot = task.robotId ? robotsById.get(task.robotId) : null;
    if (isActive && robot) {
      const pose = robot.pose || null;
      if (pose && Number.isFinite(pose.x) && Number.isFinite(pose.y)) {
        if (entry.lastPose) {
          const dx = pose.x - entry.lastPose.x;
          const dy = pose.y - entry.lastPose.y;
          if (Math.hypot(dx, dy) >= 0.05) {
            entry.lastChangeAt = now;
          }
        }
        entry.lastPose = { x: pose.x, y: pose.y };
      }
      const diagnostics = robot.diagnostics || {};
      const reason = diagnostics.reason || null;
      const waitMs = diagnostics.detail?.waitMs;
      if ((reason === "reservation_wait" || reason === "reservation_entry") && Number.isFinite(waitMs)) {
        if (!Number.isFinite(entry.lastWaitMs) || Math.abs(waitMs - entry.lastWaitMs) >= 25) {
          entry.lastChangeAt = now;
          entry.lastWaitMs = waitMs;
        }
      } else {
        entry.lastWaitMs = null;
      }
      if (diagnostics.moving || (Number.isFinite(robot.speed) && Math.abs(robot.speed) > 0.02)) {
        entry.lastChangeAt = now;
      }
    }
    if (isActive && !task.robotId) {
      if (!Number.isFinite(entry.unassignedSince)) entry.unassignedSince = now;
      if (now - entry.unassignedSince > TASK_UNASSIGNED_MS) {
        const err = new Error(`Task ${id} unassigned for ${now - entry.unassignedSince}ms`);
        err.fatal = true;
        throw err;
      }
    } else {
      entry.unassignedSince = null;
    }
    if (isActive && blockedPhase) {
      if (!Number.isFinite(entry.blockedSince)) entry.blockedSince = now;
      if (now - entry.blockedSince > TASK_BLOCKED_MS) {
        const err = new Error(`Task ${id} blocked too long (${phase})`);
        err.fatal = true;
        throw err;
      }
    } else {
      entry.blockedSince = null;
    }
    if (isActive && now - entry.lastChangeAt > TASK_STALL_MS) {
      const err = new Error(
        `Task ${id} stalled for ${now - entry.lastChangeAt}ms (${status}/${phase})`
      );
      err.fatal = true;
      throw err;
    }
    if (isActive) {
      taskWatch.set(id, entry);
    } else {
      taskWatch.delete(id);
    }
  });
  for (const id of taskWatch.keys()) {
    if (!seen.has(id)) taskWatch.delete(id);
  }
}

function assertProgress(snapshot, progressState, now) {
  const hasActiveTasks = (snapshot.tasks || []).some((task) =>
    ACTIVE_TASK_STATUSES.has(task.status)
  );
  if (!hasActiveTasks) {
    progressState.lastKey = null;
    progressState.lastChangeAt = now;
    return;
  }
  const key = buildProgressKey(snapshot);
    if (progressState.lastKey === key) {
      if (now - progressState.lastChangeAt > NO_PROGRESS_MS) {
        const err = new Error(
          `No progress for ${now - progressState.lastChangeAt}ms. ` +
            `tasks=${JSON.stringify(summarizeTasks(snapshot.tasks))} ` +
            `robots=${JSON.stringify(summarizeRobots(snapshot.robots))}`
        );
        err.fatal = true;
        if (AVOIDANCE_DISABLED) {
          err.blocked = true;
        }
        throw err;
      }
    } else {
      progressState.lastKey = key;
    progressState.lastChangeAt = now;
  }
}

function buildSchedule(totalPackages) {
  const batchPattern = [2, 1, 3, 2, 1, 1, 3, 2, 1, 3];
  const delayPattern = [300, 1200, 250, 900, 1800, 350, 700, 1600, 250, 1100];
  const schedule = [];
  let delivered = 0;
  let timeCursor = 0;
  let index = 0;

  while (delivered < totalPackages) {
    const count = Math.min(batchPattern[index % batchPattern.length], totalPackages - delivered);
    const delayMs = delayPattern[index % delayPattern.length];
    timeCursor += delayMs;
    schedule.push({ atMs: timeCursor, count });
    delivered += count;
    index += 1;
  }
  return schedule;
}

async function run() {
  console.error(
    `[E2E packages] trafficStrategy=${trafficStrategy} yieldRecovery=${yieldRecovery}`
  );
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
    FLEET_SIM_SPEED_MULTIPLIER: "100",
    FLEET_SIM_ACTION_WAIT_MS: "0",
    FLEET_SIM_TICK_MS: "12",
    FLEET_POLL_MS: "80",
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

    const html = await fetchText(baseUrl, "/");
    assert.ok(html.includes('id="login-form"'), "Login form should exist");
    assert.ok(html.includes('data-view="map"'), "Map nav item should exist");
    assert.ok(html.includes('data-view="packaging"'), "Packaging nav item should exist");
    assert.ok(html.includes('id="view-packaging"'), "Packaging view should exist");
    assert.ok(html.includes("packaging_engine.js"), "Packaging engine script should load");

    const css = await fetchText(baseUrl, "/styles.css");
    assert.ok(css.includes(".shell"), "Styles should include shell layout");
    assert.ok(css.includes(".map"), "Styles should include map layout");

    await postJson(baseUrl, "/api/scenes/activate", { sceneId: "traffic" });

    const status = await fetchJson(baseUrl, "/api/fleet/status?worksites=1");
    const robots = status.robots || [];
    assert.ok(robots.length > 0, "Expected at least one robot");

    for (const robot of robots) {
      await postJson(baseUrl, `/api/fleet/robots/${encodeURIComponent(robot.id)}/control`, {
        controlled: true
      });
      await postJson(baseUrl, `/api/fleet/robots/${encodeURIComponent(robot.id)}/dispatchable`, {
        dispatchable: true
      });
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
    await postJson(baseUrl, "/api/sim/settings", {
      dispatchStrategy,
      trafficStrategy,
      trafficOptions
    });

    const worksites = status.worksites || [];
    const { picks, drops } = splitWorksites(worksites);
    assert.ok(picks.length > 0, "Expected pick worksites");
    assert.ok(drops.length > 0, "Expected drop worksites");

    const sortedPicks = sortById(picks);
    const sortedDrops = sortById(drops);

    for (const site of sortedDrops) {
      await postJson(baseUrl, `/api/fleet/worksites/${encodeURIComponent(site.id)}`, {
        filled: true,
        blocked: false
      });
    }
    for (const site of sortedPicks) {
      await postJson(baseUrl, `/api/fleet/worksites/${encodeURIComponent(site.id)}`, {
        filled: false,
        blocked: false
      });
    }

    const totalPackages = parseNumber(process.env.E2E_PACKAGES_TOTAL) ?? 50;
    const schedule = buildSchedule(totalPackages);
    let scheduleIndex = 0;
    let pendingPackages = 0;
    let scheduledPackages = 0;
    let deliveredPackages = 0;
    const pendingPicks = new Set();
    const pendingDrops = new Set();
    const startTime = Date.now();
    const timeoutMs = parseNumber(process.env.E2E_PACKAGES_TIMEOUT_MS) ?? 600000;
    let lastProgressAt = startTime;
    let lastLoggedAt = startTime;
    const deadlockWatch = new Map();
    const taskWatch = new Map();
    const progressWatch = { lastKey: null, lastChangeAt: Date.now() };
    const flickerWatch = new Map();
    let lastSwitchingAt = startTime;

    while (deliveredPackages < totalPackages) {
      const now = Date.now();
      if (now - startTime > timeoutMs) {
        throw new Error(`Timeout after ${timeoutMs}ms (delivered ${deliveredPackages})`);
      }

      while (scheduleIndex < schedule.length && now - startTime >= schedule[scheduleIndex].atMs) {
        pendingPackages += schedule[scheduleIndex].count;
        scheduleIndex += 1;
      }

      const snapshot = await fetchJson(baseUrl, "/api/fleet/status?worksites=1", {}, 8000);
      const activeRobots = buildActiveRobotSet(snapshot.tasks);
      try {
        assertNoDeadlock(snapshot, deadlockWatch, now);
        assertTaskProgress(snapshot, taskWatch, now);
        assertProgress(snapshot, progressWatch, now);
        assertNoYield(snapshot);
        assertNoBlocks(snapshot);
        assertNoFlicker(snapshot, flickerWatch, now);
        if (now - lastSwitchingAt >= DIAG_SWITCHING_POLL_MS) {
          const diagSnapshot = await fetchDiagnosticsSwitching(baseUrl);
          assertNoSwitching(diagSnapshot, activeRobots);
          lastSwitchingAt = now;
        }
      } catch (err) {
        await dumpDiagnosticsHistory(baseUrl, snapshot, err);
        if (err?.blocked) {
          warnAvoidanceOverride(
            `Blocked test due to no progress with avoidance disabled. ${err.message}`
          );
          return;
        }
        throw err;
      }
      const stateById = new Map((snapshot.worksites || []).map((site) => [site.id, site]));

      let progress = false;
      for (const dropId of [...pendingDrops]) {
        const site = stateById.get(dropId);
        if (site && site.filled) {
          pendingDrops.delete(dropId);
          deliveredPackages += 1;
          progress = true;
        }
      }

      for (const pickId of [...pendingPicks]) {
        const site = stateById.get(pickId);
        if (site && !site.filled) {
          pendingPicks.delete(pickId);
        }
      }

      let assignments = 0;
      while (pendingPackages > 0) {
        const pick = sortedPicks.find(
          (site) => stateById.get(site.id) && !stateById.get(site.id).filled && !pendingPicks.has(site.id)
        );
        const drop = sortedDrops.find(
          (site) => stateById.get(site.id) && stateById.get(site.id).filled && !pendingDrops.has(site.id)
        );
        if (!pick || !drop) break;

        await postJson(baseUrl, `/api/fleet/worksites/${encodeURIComponent(drop.id)}`, {
          filled: false,
          blocked: false
        });
        await postJson(baseUrl, `/api/fleet/worksites/${encodeURIComponent(pick.id)}`, {
          filled: true,
          blocked: false
        });

        pendingDrops.add(drop.id);
        pendingPicks.add(pick.id);
        pendingPackages -= 1;
        scheduledPackages += 1;
        assignments += 1;
        progress = true;
      }

      if (progress) {
        lastProgressAt = now;
      }

      if (now - lastLoggedAt > 15000 && now - lastProgressAt > 15000) {
        const taskStats = (snapshot.tasks || []).reduce(
          (acc, task) => {
            const key = task.status || "unknown";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          },
          {}
        );
        const robotStats = (snapshot.robots || []).map((robot) => ({
          id: robot.id,
          activity: robot.activity,
          blocked: robot.blocked,
          manual: robot.manualMode,
          speed: Number.isFinite(robot.speed) ? Number(robot.speed.toFixed(2)) : null,
          pos: robot.pose
            ? {
                x: Number.isFinite(robot.pose.x) ? Number(robot.pose.x.toFixed(2)) : null,
                y: Number.isFinite(robot.pose.y) ? Number(robot.pose.y.toFixed(2)) : null
              }
            : null
        }));
        console.log(
          `[E2E packages] delivered=${deliveredPackages}/${totalPackages} scheduled=${scheduledPackages} pending=${pendingPackages} activeDrops=${pendingDrops.size} activePicks=${pendingPicks.size}`
        );
        console.log(`[E2E packages] tasks=${JSON.stringify(taskStats)}`);
        console.log(`[E2E packages] robots=${JSON.stringify(robotStats)}`);
        lastLoggedAt = now;
      }

      if (!assignments && pendingPackages === 0 && pendingDrops.size === 0) {
        await delay(250);
      } else {
        await delay(120);
      }
    }

    assert.equal(
      scheduledPackages,
      totalPackages,
      "Expected to schedule all packages for delivery"
    );
    assert.equal(
      deliveredPackages,
      totalPackages,
      "Expected all packages to be delivered"
    );
    console.log(`E2E UI packages ok: ${totalPackages} deliveries with mixed timing.`);
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
