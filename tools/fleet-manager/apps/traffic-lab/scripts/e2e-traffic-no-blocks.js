const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createLocalFleetSim } = require("../src/local_fleet_sim");
const {
  resolveTrafficStrategies,
  resolveYieldModes,
  resolveSegmentLengths,
  resolveIgnoreTrafficModes,
  resolveDispatchStrategies,
  resolveTierConfig,
  buildTrafficScenarios
} = require("./e2e-traffic-matrix");

const rootDir = path.resolve(__dirname, "..");
const graph = JSON.parse(
  fs.readFileSync(path.join(rootDir, "scenes", "traffic", "graph.json"), "utf8")
);
const workflow = JSON.parse(
  fs.readFileSync(path.join(rootDir, "scenes", "traffic", "workflow.json5"), "utf8")
);
const robotsConfig = JSON.parse(
  fs.readFileSync(path.join(rootDir, "scenes", "traffic", "robots.json"), "utf8")
);
const packaging = JSON.parse(
  fs.readFileSync(path.join(rootDir, "scenes", "traffic", "packaging.json"), "utf8")
);

const tierConfig = resolveTierConfig(process.env.E2E_TIER || process.env.E2E_TRAFFIC_TIER);
const STRATEGIES = resolveTrafficStrategies(
  process.env.E2E_TRAFFIC_STRATEGIES || process.env.TRAFFIC_STRATEGIES,
  tierConfig.strategies
);
const YIELD_MODES = resolveYieldModes(
  process.env.E2E_TRAFFIC_YIELD_MODES || process.env.TRAFFIC_YIELD_MODES,
  tierConfig.yieldModes
);
const SEGMENT_LENGTHS = resolveSegmentLengths(
  process.env.E2E_TRAFFIC_SEGMENT_LENGTHS || process.env.TRAFFIC_SEGMENT_LENGTHS,
  tierConfig.segmentLengths
);
const IGNORE_TRAFFIC_MODES = resolveIgnoreTrafficModes(
  process.env.E2E_IGNORE_TRAFFIC_MODES || process.env.TRAFFIC_IGNORE_TRAFFIC,
  tierConfig.ignoreTrafficModes
);
const DISPATCH_STRATEGIES = resolveDispatchStrategies(
  process.env.E2E_DISPATCH_STRATEGIES || process.env.DISPATCH_STRATEGIES,
  tierConfig.dispatchStrategies
);
const SCENARIOS = buildTrafficScenarios({
  strategies: STRATEGIES,
  yieldModes: YIELD_MODES,
  segmentLengths: SEGMENT_LENGTHS,
  ignoreTrafficModes: IGNORE_TRAFFIC_MODES,
  dispatchStrategies: DISPATCH_STRATEGIES
});
if (!SCENARIOS.length) {
  throw new Error("No traffic scenarios selected");
}

const MONITOR_DURATION_MS = 8000;
const MONITOR_INTERVAL_MS = 100;
const FLICKER_WINDOW_MS = 2000;
const MAX_FLICKER_CHANGES = 6;
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
  "!!! WARNING: AVOIDANCE/YIELD TEST BLOCKED (DISABLED NOW) !!!",
  "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
].join("\n");

function blockAvoidanceScenario(label, reason) {
  if (!AVOIDANCE_DISABLED) return false;
  console.warn(`${AVOIDANCE_BLOCK_BANNER}\nBlocked scenario: ${label}\nReason: ${reason}\n`);
  return true;
}

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

function buildBundle() {
  return { graph, workflow, robotsConfig, packaging };
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
  const diag = robot.diagnostics || {};
  const reason = diag.reason || null;
  const state = diag.state || null;
  const shouldMove = Boolean(diag.shouldMove);
  const moving = Boolean(diag.moving);
  if (BLOCK_IGNORE_REASONS.has(reason)) return false;
  if (robot.blocked) return true;
  if (typeof robot.activity === "string" && robot.activity.startsWith("blocked")) return true;
  if (isBlockedReason(reason)) return true;
  if (state === "holding" || state === "stalled") return true;
  if (shouldMove && !moving) return true;
  return false;
}

async function monitorNoBlocks(sim, robotIds, durationMs, intervalMs) {
  const flickerWatch = new Map();
  const violations = [];
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    const snapshot = sim.getDiagnostics({
      includeHistory: false,
      includeRoute: false,
      includeObstacles: false,
      includeSwitching: true
    });
    const now = snapshot.now || Date.now();
    for (const entry of snapshot.robots || []) {
      const robot = entry.robot || {};
      if (!robotIds.includes(robot.id)) continue;
      const diag = robot.diagnostics || {};
      const shouldMove = Boolean(diag.shouldMove);
      const reason = diag.reason || null;
      if (isBlockingRobot(robot)) {
        violations.push(`${robot.id}:block:${diag.state || "n/a"}:${reason || "n/a"}`);
      } else if (robot.activity === "yielding" || isYieldReason(reason)) {
        violations.push(`${robot.id}:yield:${reason || "activity"}`);
      }
      const switching = diag.switching;
      if (switching?.detected) {
        violations.push(
          `${robot.id}:switching:${switching.stateChanges}/${switching.reasonChanges}`
        );
      }
      if (shouldMove) {
        const state = diag.state || null;
        const flickerEntry = flickerWatch.get(robot.id) || {
          windowStart: now,
          changes: 0,
          lastState: state,
          lastReason: reason
        };
        const changed =
          flickerEntry.lastState !== state || flickerEntry.lastReason !== reason;
        if (changed) {
          if (now - flickerEntry.windowStart > FLICKER_WINDOW_MS) {
            flickerEntry.windowStart = now;
            flickerEntry.changes = 0;
          }
          flickerEntry.changes += 1;
          flickerEntry.lastState = state;
          flickerEntry.lastReason = reason;
        }
        if (flickerEntry.changes > MAX_FLICKER_CHANGES) {
          violations.push(`${robot.id}:flicker:${state || "n/a"}:${reason || "n/a"}`);
        }
        flickerWatch.set(robot.id, flickerEntry);
      } else {
        flickerWatch.delete(robot.id);
      }
    }
    if (violations.length) return violations;
    await delay(intervalMs);
  }
  return violations;
}

async function runScenario(scenario) {
  if (scenario.yieldRecovery && blockAvoidanceScenario(scenario.label, "Requires yield recovery.")) {
    return false;
  }
  const avoidanceMode = scenario.categories?.avoidance;
  if (
    (scenario.capabilities?.avoidanceZones || scenario.capabilities?.avoidanceLocks) &&
    blockAvoidanceScenario(scenario.label, "Requires avoidance locks/zones.")
  ) {
    return false;
  }
  if (
    avoidanceMode &&
    avoidanceMode !== "none" &&
    blockAvoidanceScenario(scenario.label, `Avoidance mode=${avoidanceMode}.`)
  ) {
    return false;
  }
  const sim = createLocalFleetSim({ tickMs: 25, ignoreTraffic: scenario.ignoreTraffic });
  sim.loadBundle(buildBundle());
  const trafficOptions = {
    yieldRecovery: false,
    reservationWaits: false,
    avoidanceLocks: false,
    avoidanceZones: false
  };
  if (Number.isFinite(scenario.segmentLength)) {
    trafficOptions.segmentLength = scenario.segmentLength;
  }
  sim.updateSimSettings({
    dispatchStrategy: scenario.dispatchStrategy || "nearest",
    trafficStrategy: scenario.strategy,
    trafficOptions
  });
  try {
    sim.setRobotControlled("RB-01", true);
    sim.setRobotControlled("RB-02", true);
    sim.setRobotDispatchable("RB-01", true);
    sim.setRobotDispatchable("RB-02", true);

    sim.updateWorksite("PICK-A2", { filled: true });
    sim.updateWorksite("PICK-A3", { filled: true });
    sim.updateWorksite("DROP-A2", { filled: false });
    sim.updateWorksite("DROP-A3", { filled: false });

    const assigned = await waitFor(
      () => sim.getStatus(false).tasks.length >= 2,
      { timeoutMs: 3000 }
    );
    assert.ok(assigned, `${scenario.label}: expected two tasks assigned`);

    const violations = await monitorNoBlocks(
      sim,
      ["RB-01", "RB-02"],
      MONITOR_DURATION_MS,
      MONITOR_INTERVAL_MS
    );
    assert.equal(
      violations.length,
      0,
      `${scenario.label}: unexpected blocks -> ${violations.join(", ")}`
    );
  } finally {
    sim.stopSim();
  }
  return true;
}

async function run() {
  for (const scenario of SCENARIOS) {
    const ran = await runScenario(scenario);
    if (ran) {
      console.log(`E2E traffic no-blocks ok: ${scenario.label}`);
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
