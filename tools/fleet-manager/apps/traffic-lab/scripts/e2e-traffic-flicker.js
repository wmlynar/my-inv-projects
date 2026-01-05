const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createLocalFleetSim } = require("../src/local_fleet_sim");

const rootDir = path.resolve(__dirname, "..");

function parseJson5(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    try {
      return Function(`"use strict"; return (${text});`)();
    } catch (fallbackErr) {
      throw err;
    }
  }
}

function parseJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  if (filePath.endsWith(".json5")) {
    return parseJson5(raw);
  }
  return JSON.parse(raw);
}

function loadScene(sceneName) {
  const sceneDir = path.join(rootDir, "scenes", sceneName);
  return {
    name: sceneName,
    graph: parseJsonFile(path.join(sceneDir, "graph.json")),
    workflow: parseJsonFile(path.join(sceneDir, "workflow.json5")),
    robotsConfig: parseJsonFile(path.join(sceneDir, "robots.json")),
    packaging: parseJsonFile(path.join(sceneDir, "packaging.json"))
  };
}

const trafficScene = loadScene("traffic");
const entryScene = loadScene("entry-reservation");

const STRATEGIES = ["pulse-mapf-time", "sipp", "cbs-sipp"];
const ENTRY_STRATEGIES = ["pulse-mapf-time", "sipp"];
const MANUAL_SWAP_STRATEGIES = ["pulse-mapf-time", "sipp"];
const ENTRY_REPEAT_STRATEGIES = ["pulse-mapf-time"];

const MONITOR_DURATION_MS = 8000;
const ENTRY_MONITOR_DURATION_MS = 10000;
const LONG_MONITOR_DURATION_MS = 25000;
const LONG_TIMELINE_INTERVAL_MS = 1500;
const LONG_ROBOT_COUNT = 4;
const PAUSE_RESUME_MONITOR_MS = 14000;
const PAUSE_RESUME_INTERVAL_MS = 1200;
const MANUAL_SWAP_MONITOR_MS = 12000;
const MANUAL_SWAP_INTERVAL_MS = 2500;
const OBSTACLE_CHURN_MONITOR_MS = 16000;
const OBSTACLE_CHURN_INTERVAL_MS = 1800;
const STRATEGY_SWITCH_MONITOR_MS = 15000;
const STRATEGY_SWITCH_INTERVAL_MS = 2600;
const CROWD_ROBOT_COUNT = 6;
const CROWD_MONITOR_MS = 32000;
const CROWD_MANUAL_COUNT = 0;
const CROWD_MANUAL_INTERVAL_MS = 2200;
const MONITOR_INTERVAL_MS = 100;
const MOVE_EPS = 0.03;
const MAX_FLICKER_CHANGES = 6;
const MAX_HOLD_MS = 6000;
const LONG_MAX_FLICKER_CHANGES = 10;
const LONG_MAX_HOLD_MS = 12000;
const MAX_WAIT_MS = 8000;
const LONG_MAX_WAIT_MS = 17000;
const CROWD_MAX_WAIT_MS = 30000;
const MAX_STALLED_MS = 6000;
const LONG_MAX_STALLED_MS = 12000;
const CROWD_MAX_STALLED_MS = 25000;
const MAX_HOLD_MOVE_FLAPS = 4;
const LONG_MAX_HOLD_MOVE_FLAPS = 10;
const HOLD_MOVE_FLAP_WINDOW_MS = 2000;
const MUTUAL_WAIT_BUCKET_MS = 250;
const MUTUAL_WAIT_MIN_MS = 1000;
const LONG_MUTUAL_WAIT_MIN_MS = 2000;
const CONCURRENT_WAIT_MIN_MS = 1000;
const LONG_CONCURRENT_WAIT_MIN_MS = 2000;
const MAX_STATE_OSCILLATIONS = 2;
const MAX_REASON_OSCILLATIONS = 2;
const OSCILLATION_WINDOW_MS = Math.max(MONITOR_INTERVAL_MS * 6, 600);
const DEADLOCK_REASONS = new Set(["traffic", "edge_lock", "node_lock"]);
const BLOCKING_REASONS = new Set([
  "blocked",
  "blocked_obstacle",
  "blocked_no_route",
  "blocked_pick",
  "blocked_collision",
  "stuck"
]);
const YIELD_REASONS = new Set(["yield"]);
const WAIT_REASONS = new Set([
  "reservation_wait",
  "reservation_entry",
  "edge_lock",
  "node_lock",
  "traffic",
  "traffic_overlap",
  "yield"
]);
const AVOIDANCE_DISABLED = true;
const AVOIDANCE_BLOCK_BANNER = [
  "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
  "!!! WARNING: AVOIDANCE/YIELD TEST BLOCKED (DISABLED NOW) !!!",
  "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
].join("\n");

function blockAvoidanceScenario(name, reason) {
  if (!AVOIDANCE_DISABLED) return false;
  console.warn(
    `${AVOIDANCE_BLOCK_BANNER}\nBlocked scenario: ${name}\nReason: ${reason}\n`
  );
  return true;
}
const ROBOT_IDS = ["RB-01", "RB-02"];
const TRAFFIC_PICK_SITES = ["PICK-A1", "PICK-A2", "PICK-A3", "PICK-A4"];
const TRAFFIC_DROP_SITES = ["DROP-A1", "DROP-A2", "DROP-A3", "DROP-A4"];
const OBSTACLE_POSITIONS = [
  { x: 7.5, y: 5, radius: 0.5 },
  { x: 7.5, y: 0, radius: 0.5 }
];
const STRATEGY_SWITCH_SEQUENCE = ["pulse-mapf-time", "sipp"];
const CROWD_TARGET_IDS = ["AP1", "AP4"];
const CROWD_SPAWN_REFS = ["PP1", "PP2", "AP1", "AP2", "AP3", "AP4"];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(predicate, options = {}) {
  const timeoutMs = options.timeoutMs ?? 3000;
  const intervalMs = options.intervalMs ?? 50;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true;
    await delay(intervalMs);
  }
  return false;
}

function distance(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  if (!Number.isFinite(a.x) || !Number.isFinite(a.y)) return Number.POSITIVE_INFINITY;
  if (!Number.isFinite(b.x) || !Number.isFinite(b.y)) return Number.POSITIVE_INFINITY;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isWaiting(sample) {
  return sample &&
    sample.state === "holding" &&
    sample.shouldMove === true &&
    sample.moving === false;
}

function buildBundle(scene) {
  return {
    graph: scene.graph,
    workflow: scene.workflow,
    robotsConfig: scene.robotsConfig,
    packaging: scene.packaging
  };
}

function cloneJson(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

function buildNodeIndex(graph) {
  return new Map((graph?.nodes || []).map((node) => [node.id, node.pos]));
}

function pickTargets(nodeIndex, ids) {
  return ids.map((id) => nodeIndex.get(id)).filter(Boolean);
}

function buildRobotIds(count) {
  const safeCount = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1;
  return Array.from({ length: safeCount }, (_, idx) =>
    `RB-${String(idx + 1).padStart(2, "0")}`
  );
}

function buildMultiRobotScene(scene, count, options = {}) {
  const robotCount = Number.isFinite(count) ? Math.max(2, Math.floor(count)) : 2;
  const robotsConfig = cloneJson(scene.robotsConfig || {});
  const models = robotsConfig?.models && typeof robotsConfig.models === "object"
    ? robotsConfig.models
    : {};
  const modelName = typeof robotsConfig.defaultModel === "string"
    ? robotsConfig.defaultModel
    : null;
  const spawnRefs = Array.isArray(options.spawnRefs) && options.spawnRefs.length
    ? options.spawnRefs
    : ["PP1", "PP2", "AP1", "AP2", "AP3", "AP4", "AP5", "AP6", "AP7", "AP8"];
  const robots = buildRobotIds(robotCount).map((id, idx) => {
    const robot = {
      id,
      name: `Robot ${String(idx + 1).padStart(2, "0")}`,
      ref: spawnRefs[idx % spawnRefs.length],
      controlled: true,
      manualMode: false
    };
    if (modelName && models[modelName]) {
      robot.model = modelName;
    }
    return robot;
  });
  robotsConfig.robots = robots;
  return { ...scene, robotsConfig };
}

async function monitorDiagnostics(sim, robotIds, durationMs, intervalMs) {
  const history = new Map(robotIds.map((id) => [id, []]));
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    const snapshot = sim.getDiagnostics({
      includeHistory: false,
      includeRoute: false,
      includeObstacles: false
    });
    for (const entry of snapshot.robots || []) {
      const robot = entry.robot || {};
      if (!robotIds.includes(robot.id)) continue;
      const diag = robot.diagnostics || {};
      const pose = robot.pose || {};
      const samples = history.get(robot.id);
      samples.push({
        at: snapshot.now,
        state: diag.state || null,
        reason: diag.reason || null,
        detail: diag.detail || null,
        shouldMove: Boolean(diag.shouldMove),
        moving: Boolean(diag.moving),
        pose: {
          x: pose.x,
          y: pose.y
        }
      });
    }
    await delay(intervalMs);
  }
  return history;
}

function analyzeFlicker(history, options = {}) {
  const maxFlickerChanges = Number.isFinite(options.maxFlickerChanges)
    ? options.maxFlickerChanges
    : MAX_FLICKER_CHANGES;
  const maxHoldMs = Number.isFinite(options.maxHoldMs) ? options.maxHoldMs : null;
  const deadlockReasons = options.deadlockReasons || DEADLOCK_REASONS;
  const failures = [];
  history.forEach((samples, robotId) => {
    let flickerCount = 0;
    let holdSpanMs = 0;
    let longestHoldMs = 0;
    for (let i = 1; i < samples.length; i += 1) {
      const prev = samples[i - 1];
      const curr = samples[i];
      const moved = distance(prev.pose, curr.pose) > MOVE_EPS;
      const shouldHold =
        prev.state === "holding" &&
        curr.state === "holding" &&
        prev.shouldMove &&
        curr.shouldMove &&
        !moved;
      if (shouldHold && prev.reason !== curr.reason) {
        flickerCount += 1;
      }
      const deadlockHold =
        curr.state === "holding" &&
        curr.shouldMove &&
        !curr.moving &&
        deadlockReasons.has(curr.reason);
      if (deadlockHold) {
        holdSpanMs += MONITOR_INTERVAL_MS;
        longestHoldMs = Math.max(longestHoldMs, holdSpanMs);
      } else {
        holdSpanMs = 0;
      }
    }
    if (flickerCount > maxFlickerChanges) {
      failures.push(
        `${robotId} flicker transitions=${flickerCount} (max ${maxFlickerChanges})`
      );
    }
    if (maxHoldMs != null && longestHoldMs > maxHoldMs) {
      failures.push(`${robotId} hold ${longestHoldMs}ms (max ${maxHoldMs}ms)`);
    }
  });
  return failures;
}

function countOscillations(samples, key, options = {}) {
  const windowMs = Number.isFinite(options.windowMs) ? options.windowMs : OSCILLATION_WINDOW_MS;
  let count = 0;
  for (let i = 2; i < samples.length; i += 1) {
    const prev = samples[i - 2];
    const mid = samples[i - 1];
    const curr = samples[i];
    if (!prev || !mid || !curr) continue;
    if (!prev[key] || !mid[key] || !curr[key]) continue;
    if (prev[key] !== curr[key] || prev[key] === mid[key]) continue;
    if (curr.at - prev.at > windowMs) continue;
    if (options.requireHold) {
      if (prev.state !== "holding" || mid.state !== "holding" || curr.state !== "holding") {
        continue;
      }
    }
    if (options.requireShouldMove) {
      if (!prev.shouldMove || !mid.shouldMove || !curr.shouldMove) continue;
    }
    if (options.requireNotMoving) {
      if (prev.moving || mid.moving || curr.moving) continue;
    }
    if (options.requireNoPoseChange && distance(prev.pose, curr.pose) > MOVE_EPS) {
      continue;
    }
    count += 1;
  }
  return count;
}

function analyzeOscillations(history, options = {}) {
  const maxStateOscillations = Number.isFinite(options.maxStateOscillations)
    ? options.maxStateOscillations
    : MAX_STATE_OSCILLATIONS;
  const maxReasonOscillations = Number.isFinite(options.maxReasonOscillations)
    ? options.maxReasonOscillations
    : MAX_REASON_OSCILLATIONS;
  const windowMs = Number.isFinite(options.windowMs) ? options.windowMs : OSCILLATION_WINDOW_MS;
  const failures = [];
  history.forEach((samples, robotId) => {
    const reasonOscillations = countOscillations(samples, "reason", {
      windowMs,
      requireHold: true,
      requireShouldMove: true,
      requireNotMoving: true,
      requireNoPoseChange: true
    });
    const stateOscillations = countOscillations(samples, "state", {
      windowMs,
      requireShouldMove: true,
      requireNotMoving: true,
      requireNoPoseChange: true
    });
    if (reasonOscillations > maxReasonOscillations) {
      failures.push(
        `${robotId} reason oscillations=${reasonOscillations} (max ${maxReasonOscillations})`
      );
    }
    if (stateOscillations > maxStateOscillations) {
      failures.push(
        `${robotId} state oscillations=${stateOscillations} (max ${maxStateOscillations})`
      );
    }
  });
  return failures;
}

function analyzeHoldMoveFlaps(history, options = {}) {
  const maxFlaps = Number.isFinite(options.maxFlaps) ? options.maxFlaps : MAX_HOLD_MOVE_FLAPS;
  const windowMs = Number.isFinite(options.windowMs) ? options.windowMs : HOLD_MOVE_FLAP_WINDOW_MS;
  const failures = [];
  history.forEach((samples, robotId) => {
    let flaps = 0;
    for (let i = 1; i < samples.length; i += 1) {
      const prev = samples[i - 1];
      const curr = samples[i];
      if (!prev || !curr) continue;
      if (!Number.isFinite(prev.at) || !Number.isFinite(curr.at)) continue;
      if (curr.at - prev.at > windowMs) continue;
      const moved = distance(prev.pose, curr.pose) > MOVE_EPS;
      if (moved) continue;
      if (!prev.shouldMove || !curr.shouldMove) continue;
      const toggled =
        (prev.state === "holding" && curr.state === "moving") ||
        (prev.state === "moving" && curr.state === "holding");
      if (toggled) {
        flaps += 1;
      }
    }
    if (flaps > maxFlaps) {
      failures.push(`${robotId} holding/moving flaps=${flaps} (max ${maxFlaps})`);
    }
  });
  return failures;
}

function analyzeMutualWaits(history, options = {}) {
  const bucketMs = Number.isFinite(options.bucketMs) ? options.bucketMs : MUTUAL_WAIT_BUCKET_MS;
  const minDurationMs = Number.isFinite(options.minDurationMs)
    ? options.minDurationMs
    : MUTUAL_WAIT_MIN_MS;
  const waitReasons = options.waitReasons || new Set(["reservation_wait", "reservation_entry"]);
  const buckets = new Map();
  history.forEach((samples, robotId) => {
    samples.forEach((sample) => {
      if (!sample || !isWaiting(sample)) return;
      if (!waitReasons.has(sample.reason)) return;
      const holder =
        sample.detail?.conflict?.holder ||
        sample.detail?.holder ||
        sample.detail?.blockingId ||
        sample.detail?.opponentId ||
        null;
      if (!holder) return;
      const bucket = Math.round(sample.at / bucketMs) * bucketMs;
      if (!buckets.has(bucket)) buckets.set(bucket, new Map());
      buckets.get(bucket).set(robotId, holder);
    });
  });
  const times = Array.from(buckets.keys()).sort((a, b) => a - b);
  const segments = [];
  let current = null;
  times.forEach((t) => {
    const map = buckets.get(t);
    if (!map || map.size < 2) return;
    const ids = Array.from(map.keys());
    let hasMutual = false;
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const a = ids[i];
        const b = ids[j];
        if (map.get(a) === b && map.get(b) === a) {
          hasMutual = true;
          break;
        }
      }
      if (hasMutual) break;
    }
    if (!hasMutual) return;
    if (!current) {
      current = { start: t, end: t };
      return;
    }
    if (t - current.end <= bucketMs + 5) {
      current.end = t;
    } else {
      segments.push(current);
      current = { start: t, end: t };
    }
  });
  if (current) segments.push(current);

  const failures = [];
  segments.forEach((seg) => {
    const duration = seg.end - seg.start;
    if (duration >= minDurationMs) {
      failures.push(`mutual reservation wait ${duration}ms (min ${minDurationMs}ms)`);
    }
  });
  return failures;
}

function analyzeConcurrentWaits(history, options = {}) {
  const bucketMs = Number.isFinite(options.bucketMs) ? options.bucketMs : MUTUAL_WAIT_BUCKET_MS;
  const minDurationMs = Number.isFinite(options.minDurationMs)
    ? options.minDurationMs
    : CONCURRENT_WAIT_MIN_MS;
  const waitReasons = options.waitReasons || new Set(["reservation_wait", "reservation_entry"]);
  const byKey = new Map();
  history.forEach((samples, robotId) => {
    samples.forEach((sample) => {
      if (!sample || !isWaiting(sample)) return;
      if (!waitReasons.has(sample.reason)) return;
      const key =
        sample.detail?.edgeKey ||
        sample.detail?.edgeGroupKey ||
        sample.detail?.nodeId ||
        null;
      if (!key) return;
      const bucket = Math.round(sample.at / bucketMs) * bucketMs;
      if (!byKey.has(key)) byKey.set(key, new Map());
      const timeMap = byKey.get(key);
      if (!timeMap.has(bucket)) timeMap.set(bucket, new Set());
      timeMap.get(bucket).add(robotId);
    });
  });
  const failures = [];
  byKey.forEach((timeMap, key) => {
    const times = Array.from(timeMap.keys()).sort((a, b) => a - b);
    let current = null;
    times.forEach((t) => {
      const set = timeMap.get(t);
      if (!set || set.size < 2) return;
      if (!current) {
        current = { start: t, end: t };
        return;
      }
      if (t - current.end <= bucketMs + 5) {
        current.end = t;
      } else {
        const duration = current.end - current.start;
        if (duration >= minDurationMs) {
          failures.push(`concurrent wait ${key} ${duration}ms (min ${minDurationMs}ms)`);
        }
        current = { start: t, end: t };
      }
    });
    if (current) {
      const duration = current.end - current.start;
      if (duration >= minDurationMs) {
        failures.push(`concurrent wait ${key} ${duration}ms (min ${minDurationMs}ms)`);
      }
    }
  });
  return failures;
}

function analyzeWaitDurations(history, options = {}) {
  const maxWaitMs = Number.isFinite(options.maxWaitMs) ? options.maxWaitMs : MAX_WAIT_MS;
  const waitReasons = options.waitReasons || WAIT_REASONS;
  const failures = [];
  history.forEach((samples, robotId) => {
    let startAt = null;
    let longest = 0;
    samples.forEach((sample) => {
      if (!sample || !Number.isFinite(sample.at)) return;
      const waiting =
        sample.state === "holding" &&
        sample.shouldMove &&
        !sample.moving &&
        waitReasons.has(sample.reason);
      if (waiting) {
        if (startAt == null) startAt = sample.at;
        longest = Math.max(longest, sample.at - startAt);
      } else {
        startAt = null;
      }
    });
    if (longest > maxWaitMs) {
      failures.push(`${robotId} long wait ${longest}ms (max ${maxWaitMs}ms)`);
    }
  });
  return failures;
}

function analyzeBlockingReasons(history, options = {}) {
  const blockingReasons = options.blockingReasons || BLOCKING_REASONS;
  const failures = [];
  history.forEach((samples, robotId) => {
    const hit = samples.find((sample) => sample && blockingReasons.has(sample.reason));
    if (hit) {
      failures.push(`${robotId} blocked reason=${hit.reason}`);
    }
  });
  return failures;
}

function analyzeYielding(history, options = {}) {
  const yieldReasons = options.yieldReasons || YIELD_REASONS;
  const failures = [];
  history.forEach((samples, robotId) => {
    const hit = samples.find((sample) => sample && yieldReasons.has(sample.reason));
    if (hit) {
      failures.push(`${robotId} yielding reason=${hit.reason}`);
    }
  });
  return failures;
}

function analyzeStalledDurations(history, options = {}) {
  const maxStalledMs = Number.isFinite(options.maxStalledMs) ? options.maxStalledMs : MAX_STALLED_MS;
  const failures = [];
  history.forEach((samples, robotId) => {
    let startAt = null;
    let longest = 0;
    samples.forEach((sample) => {
      if (!sample || !Number.isFinite(sample.at)) return;
      const stalled =
        sample.state === "stalled" &&
        sample.shouldMove &&
        !sample.moving;
      if (stalled) {
        if (startAt == null) startAt = sample.at;
        longest = Math.max(longest, sample.at - startAt);
      } else {
        startAt = null;
      }
    });
    if (longest > maxStalledMs) {
      failures.push(`${robotId} stalled ${longest}ms (max ${maxStalledMs}ms)`);
    }
  });
  return failures;
}

async function runTrafficWorksiteTimeline(sim, durationMs, intervalMs) {
  if (!sim) return;
  if (!TRAFFIC_PICK_SITES.length || !TRAFFIC_DROP_SITES.length) return;
  const start = Date.now();
  TRAFFIC_DROP_SITES.forEach((id) => sim.updateWorksite(id, { filled: false }));
  let step = 0;
  while (Date.now() - start < durationMs) {
    const pickA = TRAFFIC_PICK_SITES[step % TRAFFIC_PICK_SITES.length];
    const pickB = TRAFFIC_PICK_SITES[(step + 1) % TRAFFIC_PICK_SITES.length];
    const pickC = TRAFFIC_PICK_SITES[
      (step + TRAFFIC_PICK_SITES.length - 1) % TRAFFIC_PICK_SITES.length
    ];
    const pickD = TRAFFIC_PICK_SITES[
      (step + TRAFFIC_PICK_SITES.length - 2) % TRAFFIC_PICK_SITES.length
    ];
    sim.updateWorksite(pickA, { filled: true });
    sim.updateWorksite(pickB, { filled: true });
    sim.updateWorksite(pickC, { filled: false });
    sim.updateWorksite(pickD, { filled: false });
    const drop = TRAFFIC_DROP_SITES[step % TRAFFIC_DROP_SITES.length];
    sim.updateWorksite(drop, { filled: false });
    step += 1;
    await delay(intervalMs);
  }
}

async function runPauseResumeTimeline(sim, durationMs, robotIds, intervalMs) {
  if (!sim || !Array.isArray(robotIds) || !robotIds.length) return;
  const worksitePromise = runTrafficWorksiteTimeline(
    sim,
    durationMs,
    Math.max(800, intervalMs || LONG_TIMELINE_INTERVAL_MS)
  );
  const start = Date.now();
  let index = 0;
  while (Date.now() - start < durationMs) {
    await delay(2000);
    if (Date.now() - start >= durationMs) break;
    const robotId = robotIds[index % robotIds.length];
    sim.pause(robotId);
    await delay(intervalMs || PAUSE_RESUME_INTERVAL_MS);
    sim.resume(robotId);
    index += 1;
  }
  await worksitePromise;
}

async function runManualSwapTimeline(sim, durationMs, targets, intervalMs) {
  if (!sim || !targets?.a || !targets?.b) return;
  const start = Date.now();
  let flip = false;
  while (Date.now() - start < durationMs) {
    await delay(intervalMs || MANUAL_SWAP_INTERVAL_MS);
    if (Date.now() - start >= durationMs) break;
    flip = !flip;
    const targetA = flip ? targets.b : targets.a;
    const targetB = flip ? targets.a : targets.b;
    sim.goPoint("RB-01", targetA.x, targetA.y);
    sim.goPoint("RB-02", targetB.x, targetB.y);
  }
}

async function runManualShuffleTimeline(sim, durationMs, robotIds, targets, intervalMs) {
  if (!sim || !Array.isArray(robotIds) || !robotIds.length) return;
  if (!Array.isArray(targets) || !targets.length) return;
  const start = Date.now();
  let offset = 0;
  while (Date.now() - start < durationMs) {
    await delay(intervalMs || CROWD_MANUAL_INTERVAL_MS);
    if (Date.now() - start >= durationMs) break;
    robotIds.forEach((robotId, idx) => {
      const target = targets[(offset + idx) % targets.length];
      if (!target) return;
      sim.goPoint(robotId, target.x, target.y);
    });
    offset += 1;
  }
}

async function runObstacleChurnTimeline(sim, durationMs, intervalMs, positions = []) {
  if (!sim || !positions.length) return;
  const start = Date.now();
  let obstacleId = null;
  let index = 0;
  while (Date.now() - start < durationMs) {
    if (obstacleId) {
      sim.removeObstacleById(obstacleId);
      obstacleId = null;
    }
    const pos = positions[index % positions.length];
    const result = sim.addSimObstacle({
      x: pos.x,
      y: pos.y,
      radius: pos.radius,
      mode: "block"
    });
    obstacleId = result?.obstacle?.id || null;
    index += 1;
    await delay(intervalMs || OBSTACLE_CHURN_INTERVAL_MS);
  }
  if (obstacleId) {
    sim.removeObstacleById(obstacleId);
  }
  sim.clearObstacles();
}

async function runStrategySwitchTimeline(sim, durationMs, intervalMs, sequence = []) {
  if (!sim || !sequence.length) return;
  const start = Date.now();
  let index = 0;
  while (Date.now() - start < durationMs) {
    await delay(intervalMs || STRATEGY_SWITCH_INTERVAL_MS);
    if (Date.now() - start >= durationMs) break;
    const strategy = sequence[index % sequence.length];
    sim.updateSimSettings({
      trafficStrategy: strategy,
      trafficOptions: {
        yieldRecovery: false,
        reservationWaits: false,
        avoidanceLocks: false,
        avoidanceZones: false
      }
    });
    index += 1;
  }
}

async function runScenario(scene, strategyName, setup, options = {}) {
  const sim = createLocalFleetSim({ tickMs: 25, collisionBlocking: false });
  sim.loadBundle(buildBundle(scene));
  sim.updateSimSettings({
    trafficStrategy: strategyName,
    trafficOptions: {
      yieldRecovery: false,
      reservationWaits: false,
      avoidanceLocks: false,
      avoidanceZones: false
    }
  });

  try {
    if (setup) {
      await setup(sim);
    }

    const monitorDurationMs = options.monitorDurationMs || MONITOR_DURATION_MS;
    const robotIds = options.robotIds || ROBOT_IDS;
    const historyPromise = monitorDiagnostics(
      sim,
      robotIds,
      monitorDurationMs,
      MONITOR_INTERVAL_MS
    );
    if (options.timeline) {
      const timelinePromise = options.timeline(sim, monitorDurationMs);
      const [history] = await Promise.all([historyPromise, timelinePromise]);
      const flickerFailures = analyzeFlicker(history, options.flicker || {});
      const oscillationFailures = analyzeOscillations(history, options.oscillation || {});
      const blockFailures = analyzeBlockingReasons(history, options.blocking || {});
      const yieldFailures = analyzeYielding(history, options.yielding || {});
      const flapFailures = analyzeHoldMoveFlaps(history, options.flap || {});
      const mutualWaitFailures = analyzeMutualWaits(history, options.mutualWait || {});
      const concurrentWaitFailures = analyzeConcurrentWaits(history, options.concurrentWait || {});
      const waitFailures = analyzeWaitDurations(history, options.wait || {});
      const stalledFailures = analyzeStalledDurations(history, options.stalled || {});
      const failures = flickerFailures
        .concat(oscillationFailures)
        .concat(blockFailures)
        .concat(yieldFailures)
        .concat(flapFailures)
        .concat(mutualWaitFailures)
        .concat(concurrentWaitFailures)
        .concat(waitFailures)
        .concat(stalledFailures);
      assert.equal(
        failures.length,
        0,
        `${options.label || strategyName}: oscillation detected -> ${failures.join(", ")}`
      );
      return;
    }
    const history = await historyPromise;
    const flickerFailures = analyzeFlicker(history, options.flicker || {});
    const oscillationFailures = analyzeOscillations(history, options.oscillation || {});
    const blockFailures = analyzeBlockingReasons(history, options.blocking || {});
    const yieldFailures = analyzeYielding(history, options.yielding || {});
    const flapFailures = analyzeHoldMoveFlaps(history, options.flap || {});
    const mutualWaitFailures = analyzeMutualWaits(history, options.mutualWait || {});
    const concurrentWaitFailures = analyzeConcurrentWaits(history, options.concurrentWait || {});
    const waitFailures = analyzeWaitDurations(history, options.wait || {});
    const stalledFailures = analyzeStalledDurations(history, options.stalled || {});
    const failures = flickerFailures
      .concat(oscillationFailures)
      .concat(blockFailures)
      .concat(yieldFailures)
      .concat(flapFailures)
      .concat(mutualWaitFailures)
      .concat(concurrentWaitFailures)
      .concat(waitFailures)
      .concat(stalledFailures);
    assert.equal(
      failures.length,
      0,
      `${options.label || strategyName}: oscillation detected -> ${failures.join(", ")}`
    );
  } finally {
    sim.stopSim();
  }
}

async function run() {
  for (const strategy of STRATEGIES) {
    await runScenario(
      trafficScene,
      strategy,
      async (sim) => {
        sim.setRobotControlled("RB-01", true);
        sim.setRobotControlled("RB-02", true);

        sim.updateWorksite("PICK-A2", { filled: true });
        sim.updateWorksite("PICK-A3", { filled: true });
        sim.updateWorksite("DROP-A2", { filled: false });
        sim.updateWorksite("DROP-A3", { filled: false });

        const assigned = await waitFor(
          () => sim.getStatus(false).tasks.length >= 2,
          { timeoutMs: 3000 }
        );
        assert.ok(assigned, `${strategy}: expected two tasks assigned`);
      },
      {
        label: `traffic/${strategy}`,
        flicker: { maxFlickerChanges: MAX_FLICKER_CHANGES, maxHoldMs: MAX_HOLD_MS },
        flap: { maxFlaps: MAX_HOLD_MOVE_FLAPS },
        mutualWait: { minDurationMs: MUTUAL_WAIT_MIN_MS },
        concurrentWait: { minDurationMs: CONCURRENT_WAIT_MIN_MS },
        wait: { maxWaitMs: MAX_WAIT_MS, waitReasons: WAIT_REASONS },
        stalled: { maxStalledMs: MAX_STALLED_MS }
      }
    );
    console.log(`E2E traffic flicker ok: traffic/${strategy}`);
  }

  const trafficNodeIndex = buildNodeIndex(trafficScene.graph);
  const trafficP1 = trafficNodeIndex.get("PP1");
  const trafficP2 = trafficNodeIndex.get("PP2");
  assert.ok(trafficP1 && trafficP2, "Traffic scene requires PP1/PP2 nodes");

  const entryNodeIndex = buildNodeIndex(entryScene.graph);
  const entryP1 = entryNodeIndex.get("P1");
  const entryP2 = entryNodeIndex.get("P2");
  assert.ok(entryP1 && entryP2, "Entry reservation scene requires P1/P2 nodes");

  for (const strategy of ENTRY_STRATEGIES) {
    await runScenario(
      entryScene,
      strategy,
      async (sim) => {
        sim.setRobotManualMode("RB-01", true);
        sim.setRobotManualMode("RB-02", true);

        assert.equal(
          sim.goPoint("RB-01", entryP2.x, entryP2.y),
          true,
          `${strategy}: RB-01 should accept swap goal`
        );
        assert.equal(
          sim.goPoint("RB-02", entryP1.x, entryP1.y),
          true,
          `${strategy}: RB-02 should accept swap goal`
        );

        const started = await waitFor(
          () => {
            const robots = sim.getStatus(false).robots || [];
            return robots.some((robot) => robot.id === "RB-01" && robot.activity === "manual_move") ||
              robots.some((robot) => robot.id === "RB-02" && robot.activity === "manual_move");
          },
          { timeoutMs: 2000 }
        );
        assert.ok(started, `${strategy}: expected manual navigation to start`);
      },
      {
        label: `entry-reservation/${strategy}`,
        monitorDurationMs: ENTRY_MONITOR_DURATION_MS,
        flicker: { maxFlickerChanges: MAX_FLICKER_CHANGES },
        flap: { maxFlaps: MAX_HOLD_MOVE_FLAPS },
        mutualWait: { minDurationMs: MUTUAL_WAIT_MIN_MS },
        concurrentWait: { minDurationMs: CONCURRENT_WAIT_MIN_MS },
        wait: { maxWaitMs: MAX_WAIT_MS, waitReasons: WAIT_REASONS },
        stalled: { maxStalledMs: MAX_STALLED_MS }
      }
    );
    console.log(`E2E traffic flicker ok: entry-reservation/${strategy}`);
  }

  for (const strategy of ENTRY_REPEAT_STRATEGIES) {
    await runScenario(
      entryScene,
      strategy,
      async (sim) => {
        sim.setRobotManualMode("RB-01", true);
        sim.setRobotManualMode("RB-02", true);
        assert.equal(
          sim.goPoint("RB-01", entryP2.x, entryP2.y),
          true,
          `${strategy}: RB-01 should accept repeat swap goal`
        );
        assert.equal(
          sim.goPoint("RB-02", entryP1.x, entryP1.y),
          true,
          `${strategy}: RB-02 should accept repeat swap goal`
        );
      },
      {
        label: `entry-reservation-repeat/${strategy}`,
        monitorDurationMs: MANUAL_SWAP_MONITOR_MS,
        timeline: (sim, durationMs) =>
          runManualSwapTimeline(sim, durationMs, { a: entryP1, b: entryP2 }),
        flicker: { maxFlickerChanges: MAX_FLICKER_CHANGES, maxHoldMs: MAX_HOLD_MS },
        flap: { maxFlaps: MAX_HOLD_MOVE_FLAPS },
        mutualWait: { minDurationMs: MUTUAL_WAIT_MIN_MS },
        concurrentWait: { minDurationMs: CONCURRENT_WAIT_MIN_MS },
        wait: { maxWaitMs: MAX_WAIT_MS, waitReasons: WAIT_REASONS },
        stalled: { maxStalledMs: MAX_STALLED_MS }
      }
    );
    console.log(`E2E traffic flicker ok: entry-reservation-repeat/${strategy}`);
  }

  for (const strategy of MANUAL_SWAP_STRATEGIES) {
    await runScenario(
      trafficScene,
      strategy,
      async (sim) => {
        sim.setRobotManualMode("RB-01", true);
        sim.setRobotManualMode("RB-02", true);
        sim.setRobotControlled("RB-01", true);
        sim.setRobotControlled("RB-02", true);
        assert.equal(
          sim.goPoint("RB-01", trafficP2.x, trafficP2.y),
          true,
          `${strategy}: RB-01 should accept manual swap goal`
        );
        assert.equal(
          sim.goPoint("RB-02", trafficP1.x, trafficP1.y),
          true,
          `${strategy}: RB-02 should accept manual swap goal`
        );
      },
      {
        label: `traffic-manual-swap/${strategy}`,
        monitorDurationMs: MANUAL_SWAP_MONITOR_MS,
        timeline: (sim, durationMs) =>
          runManualSwapTimeline(sim, durationMs, { a: trafficP1, b: trafficP2 }),
        flicker: { maxFlickerChanges: MAX_FLICKER_CHANGES, maxHoldMs: MAX_HOLD_MS },
        flap: { maxFlaps: MAX_HOLD_MOVE_FLAPS },
        mutualWait: { minDurationMs: MUTUAL_WAIT_MIN_MS },
        concurrentWait: { minDurationMs: CONCURRENT_WAIT_MIN_MS },
        wait: { maxWaitMs: MAX_WAIT_MS, waitReasons: WAIT_REASONS },
        stalled: { maxStalledMs: MAX_STALLED_MS }
      }
    );
    console.log(`E2E traffic flicker ok: traffic-manual-swap/${strategy}`);
  }

  if (
    !blockAvoidanceScenario(
      "traffic-obstacle-churn/pulse-mapf-time",
      "Uses obstacle churn/avoidance."
    )
  ) {
    await runScenario(
      trafficScene,
      "pulse-mapf-time",
      async (sim) => {
        sim.setRobotControlled("RB-01", true);
        sim.setRobotControlled("RB-02", true);
        sim.updateWorksite("PICK-A1", { filled: true });
        sim.updateWorksite("PICK-A4", { filled: true });
        sim.updateWorksite("DROP-A1", { filled: false });
        sim.updateWorksite("DROP-A4", { filled: false });
        const assigned = await waitFor(
          () => sim.getStatus(false).tasks.length >= 2,
          { timeoutMs: 4000 }
        );
        assert.ok(assigned, "traffic-obstacle-churn: expected tasks assigned");
      },
      {
        label: "traffic-obstacle-churn/pulse-mapf-time",
        monitorDurationMs: OBSTACLE_CHURN_MONITOR_MS,
        timeline: (sim, durationMs) =>
          Promise.all([
            runTrafficWorksiteTimeline(sim, durationMs, LONG_TIMELINE_INTERVAL_MS),
            runObstacleChurnTimeline(sim, durationMs, OBSTACLE_CHURN_INTERVAL_MS, OBSTACLE_POSITIONS)
          ]),
        flicker: { maxFlickerChanges: MAX_FLICKER_CHANGES, maxHoldMs: MAX_HOLD_MS },
        flap: { maxFlaps: MAX_HOLD_MOVE_FLAPS },
        mutualWait: { minDurationMs: MUTUAL_WAIT_MIN_MS },
        concurrentWait: { minDurationMs: CONCURRENT_WAIT_MIN_MS },
        wait: { maxWaitMs: MAX_WAIT_MS, waitReasons: WAIT_REASONS },
        stalled: { maxStalledMs: MAX_STALLED_MS }
      }
    );
    console.log("E2E traffic flicker ok: traffic-obstacle-churn/pulse-mapf-time");
  }

  await runScenario(
    trafficScene,
    "pulse-mapf-time",
    async (sim) => {
      sim.setRobotControlled("RB-01", true);
      sim.setRobotControlled("RB-02", true);
      sim.updateWorksite("PICK-A2", { filled: true });
      sim.updateWorksite("PICK-A3", { filled: true });
      sim.updateWorksite("DROP-A2", { filled: false });
      sim.updateWorksite("DROP-A3", { filled: false });
      const assigned = await waitFor(
        () => sim.getStatus(false).tasks.length >= 2,
        { timeoutMs: 4000 }
      );
      assert.ok(assigned, "traffic-strategy-switch: expected tasks assigned");
    },
    {
      label: "traffic-strategy-switch",
      monitorDurationMs: STRATEGY_SWITCH_MONITOR_MS,
      timeline: (sim, durationMs) =>
        Promise.all([
          runTrafficWorksiteTimeline(sim, durationMs, LONG_TIMELINE_INTERVAL_MS),
          runStrategySwitchTimeline(
            sim,
            durationMs,
            STRATEGY_SWITCH_INTERVAL_MS,
            STRATEGY_SWITCH_SEQUENCE
          )
        ]),
      flicker: { maxFlickerChanges: MAX_FLICKER_CHANGES, maxHoldMs: MAX_HOLD_MS },
      flap: { maxFlaps: MAX_HOLD_MOVE_FLAPS },
      mutualWait: { minDurationMs: MUTUAL_WAIT_MIN_MS },
      concurrentWait: { minDurationMs: CONCURRENT_WAIT_MIN_MS },
      wait: { maxWaitMs: MAX_WAIT_MS, waitReasons: WAIT_REASONS },
      stalled: { maxStalledMs: MAX_STALLED_MS }
    }
  );
  console.log("E2E traffic flicker ok: traffic-strategy-switch");

  await runScenario(
    trafficScene,
    "pulse-mapf-time",
    async (sim) => {
      sim.setRobotControlled("RB-01", true);
      sim.setRobotControlled("RB-02", true);
      sim.updateWorksite("PICK-A1", { filled: true });
      sim.updateWorksite("PICK-A4", { filled: true });
      sim.updateWorksite("DROP-A1", { filled: false });
      sim.updateWorksite("DROP-A4", { filled: false });
      const assigned = await waitFor(
        () => sim.getStatus(false).tasks.length >= 2,
        { timeoutMs: 4000 }
      );
      assert.ok(assigned, "traffic-pause-resume: expected tasks assigned");
    },
    {
      label: "traffic-pause-resume/pulse-mapf-time",
      monitorDurationMs: PAUSE_RESUME_MONITOR_MS,
      timeline: (sim, durationMs) =>
        runPauseResumeTimeline(sim, durationMs, ROBOT_IDS, PAUSE_RESUME_INTERVAL_MS),
      flicker: { maxFlickerChanges: MAX_FLICKER_CHANGES, maxHoldMs: MAX_HOLD_MS },
      flap: { maxFlaps: MAX_HOLD_MOVE_FLAPS },
      mutualWait: { minDurationMs: MUTUAL_WAIT_MIN_MS },
      concurrentWait: { minDurationMs: CONCURRENT_WAIT_MIN_MS },
      wait: { maxWaitMs: MAX_WAIT_MS, waitReasons: WAIT_REASONS },
      stalled: { maxStalledMs: MAX_STALLED_MS }
    }
  );
  console.log("E2E traffic flicker ok: traffic-pause-resume/pulse-mapf-time");

  if (process.env.E2E_CROWD === "1") {
    const crowdTargets = pickTargets(trafficNodeIndex, CROWD_TARGET_IDS);
    assert.ok(crowdTargets.length >= 2, "Traffic scene requires crowd target nodes");
    const crowdScene = buildMultiRobotScene(trafficScene, CROWD_ROBOT_COUNT, {
      spawnRefs: CROWD_SPAWN_REFS
    });
    const crowdRobotIds = buildRobotIds(CROWD_ROBOT_COUNT);
    const crowdManualCount = Math.min(CROWD_MANUAL_COUNT, crowdRobotIds.length);
    const crowdManualIds = crowdRobotIds.slice(-crowdManualCount);
    await runScenario(
      crowdScene,
      "sipp",
      async (sim) => {
        crowdRobotIds.forEach((id) => sim.setRobotControlled(id, true));
        crowdManualIds.forEach((id) => sim.setRobotManualMode(id, true));
        crowdManualIds.forEach((id, idx) => {
          const target = crowdTargets[idx % crowdTargets.length];
          assert.equal(
            sim.goPoint(id, target.x, target.y),
            true,
            `traffic-crowd: ${id} should accept manual goal`
          );
        });
        TRAFFIC_DROP_SITES.forEach((id) => sim.updateWorksite(id, { filled: false }));
        TRAFFIC_PICK_SITES.forEach((id, idx) =>
          sim.updateWorksite(id, { filled: idx % 2 === 0 })
        );
        const active = await waitFor(
          () => {
            const robots = sim.getStatus(false).robots || [];
            const activeCount = robots.filter((robot) => {
              const activity = robot?.activity;
              if (!activity || typeof activity !== "string") return false;
              return !["idle", "manual_idle"].includes(activity);
            }).length;
            return activeCount >= Math.min(3, crowdRobotIds.length);
          },
          { timeoutMs: 5000 }
        );
        assert.ok(active, "traffic-crowd: expected active robots");
      },
      {
        label: `traffic-crowd/sipp/${CROWD_ROBOT_COUNT}`,
        monitorDurationMs: CROWD_MONITOR_MS,
        robotIds: crowdRobotIds,
        timeline: (sim, durationMs) =>
          Promise.all([
            runTrafficWorksiteTimeline(sim, durationMs, LONG_TIMELINE_INTERVAL_MS),
            runManualShuffleTimeline(
              sim,
              durationMs,
              crowdManualIds,
              crowdTargets,
              CROWD_MANUAL_INTERVAL_MS
            )
          ]),
        flicker: {
          maxFlickerChanges: LONG_MAX_FLICKER_CHANGES,
          maxHoldMs: LONG_MAX_HOLD_MS
        },
        flap: { maxFlaps: LONG_MAX_HOLD_MOVE_FLAPS },
        mutualWait: { minDurationMs: LONG_MUTUAL_WAIT_MIN_MS },
        concurrentWait: { minDurationMs: LONG_CONCURRENT_WAIT_MIN_MS },
        wait: { maxWaitMs: CROWD_MAX_WAIT_MS, waitReasons: WAIT_REASONS },
        stalled: { maxStalledMs: CROWD_MAX_STALLED_MS }
      }
    );
    console.log(`E2E traffic flicker ok: traffic-crowd/sipp/${CROWD_ROBOT_COUNT}`);
  }

  const multiRobotScene = buildMultiRobotScene(trafficScene, LONG_ROBOT_COUNT);
  const multiRobotIds = buildRobotIds(LONG_ROBOT_COUNT);
  await runScenario(
    multiRobotScene,
    "pulse-mapf-time",
    async (sim) => {
      multiRobotIds.forEach((id) => sim.setRobotControlled(id, true));
      TRAFFIC_DROP_SITES.forEach((id) => sim.updateWorksite(id, { filled: false }));
      TRAFFIC_PICK_SITES.slice(0, 2).forEach((id) => sim.updateWorksite(id, { filled: true }));
      const assigned = await waitFor(
        () => sim.getStatus(false).tasks.length >= 2,
        { timeoutMs: 4000 }
      );
      assert.ok(assigned, "traffic-long: expected tasks assigned");
    },
    {
      label: `traffic-long/pulse-mapf-time/${LONG_ROBOT_COUNT}`,
      monitorDurationMs: LONG_MONITOR_DURATION_MS,
      robotIds: multiRobotIds,
      timeline: (sim, durationMs) =>
        runTrafficWorksiteTimeline(sim, durationMs, LONG_TIMELINE_INTERVAL_MS),
      flicker: {
        maxFlickerChanges: LONG_MAX_FLICKER_CHANGES,
        maxHoldMs: LONG_MAX_HOLD_MS
      },
      flap: { maxFlaps: LONG_MAX_HOLD_MOVE_FLAPS },
      mutualWait: { minDurationMs: LONG_MUTUAL_WAIT_MIN_MS },
      concurrentWait: { minDurationMs: LONG_CONCURRENT_WAIT_MIN_MS },
      wait: { maxWaitMs: LONG_MAX_WAIT_MS, waitReasons: WAIT_REASONS },
      stalled: { maxStalledMs: LONG_MAX_STALLED_MS }
    }
  );
  console.log(`E2E traffic flicker ok: traffic-long/${LONG_ROBOT_COUNT}`);
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
