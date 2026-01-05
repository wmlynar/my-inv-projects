const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createLocalFleetSim } = require("../src/local_fleet_sim");
const {
  resolveTrafficStrategies,
  resolveYieldModes,
  resolveSegmentLengths,
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
  process.env.TRAFFIC_ENTRY_STRATEGIES || process.env.E2E_TRAFFIC_STRATEGIES,
  tierConfig.strategies
);
const YIELD_MODES = resolveYieldModes(
  process.env.TRAFFIC_ENTRY_YIELD_MODES || process.env.E2E_TRAFFIC_YIELD_MODES,
  ["yield", "no-yield"]
);
const SEGMENT_LENGTHS = resolveSegmentLengths(
  process.env.TRAFFIC_ENTRY_SEGMENT_LENGTHS || process.env.E2E_TRAFFIC_SEGMENT_LENGTHS,
  tierConfig.segmentLengths
);
const SCENARIOS = buildTrafficScenarios({
  strategies: STRATEGIES,
  yieldModes: YIELD_MODES,
  segmentLengths: SEGMENT_LENGTHS
});
if (!SCENARIOS.length) {
  throw new Error("No traffic entry scenarios selected");
}

const MONITOR_DURATION_MS = 22000;
const MONITOR_INTERVAL_MS = 120;
const MAX_ENTRY_HOLD_MS = 10000;
const WAIT_JUMP_MS = 900;
const MAX_WAIT_RESETS = 2;
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

function buildBundle() {
  return { graph, workflow, robotsConfig, packaging };
}

function findNodePos(nodeId) {
  const node = (graph.nodes || []).find((entry) => entry.id === nodeId);
  return node?.pos || null;
}

async function monitorReservationEntry(sim, robotIds, durationMs, intervalMs) {
  const entryWatch = new Map();
  const errors = [];
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    const snapshot = sim.getDiagnostics({
      includeHistory: false,
      includeRoute: false,
      includeObstacles: false,
      includeSwitching: true
    });
    const diagById = new Map();
    for (const entry of snapshot.robots || []) {
      const robot = entry.robot || {};
      if (!robot.id) continue;
      diagById.set(robot.id, robot.diagnostics || {});
    }
    const now = snapshot.now || Date.now();
    for (const entry of snapshot.robots || []) {
      const robot = entry.robot || {};
      if (!robotIds.includes(robot.id)) continue;
      const diag = robot.diagnostics || {};
      const reason = diag.reason || null;
      const state = diag.state || null;
      const shouldMove = Boolean(diag.shouldMove);
      const moving = Boolean(diag.moving);
      const waitMs = Number.isFinite(diag.detail?.waitMs) ? diag.detail.waitMs : null;
      const conflict = diag.detail?.conflict || null;
      if (diag.switching?.detected) {
        errors.push(
          `${robot.id} switching detected (${diag.switching.stateChanges}/${diag.switching.reasonChanges})`
        );
      }
      const holderId = conflict?.holder || null;
      const holderDiag = holderId ? diagById.get(holderId) : null;
      const holderConflict = holderDiag?.detail?.conflict || null;
      const holderHolding =
        holderDiag?.state === "holding" &&
        holderDiag?.reason === "reservation_entry" &&
        Boolean(holderDiag?.shouldMove) &&
        !Boolean(holderDiag?.moving);
      const mutualHold =
        holderHolding &&
        (holderConflict?.holder === robot.id ||
          (holderConflict?.key && holderConflict.key === conflict?.key));
      if (state === "holding" && reason === "reservation_entry" && shouldMove && !moving) {
        if (!holderId || !mutualHold) {
          entryWatch.delete(robot.id);
          continue;
        }
        const current = entryWatch.get(robot.id) || {
          since: now,
          lastWaitMs: null,
          resetCount: 0,
          conflict
        };
        if (Number.isFinite(waitMs) && Number.isFinite(current.lastWaitMs)) {
          if (waitMs > current.lastWaitMs + WAIT_JUMP_MS) {
            current.resetCount += 1;
          }
        }
        current.lastWaitMs = Number.isFinite(waitMs) ? waitMs : current.lastWaitMs;
        current.conflict = conflict || current.conflict;
        entryWatch.set(robot.id, current);
        const heldMs = now - current.since;
        if (heldMs > MAX_ENTRY_HOLD_MS) {
          errors.push(
            `${robot.id} reservation_entry ${heldMs}ms conflict=${JSON.stringify(current.conflict)}`
          );
        } else if (current.resetCount >= MAX_WAIT_RESETS) {
          errors.push(
            `${robot.id} reservation_entry wait reset x${current.resetCount} conflict=${JSON.stringify(current.conflict)}`
          );
        }
      } else {
        entryWatch.delete(robot.id);
      }
    }
    if (errors.length) {
      return errors;
    }
    await delay(intervalMs);
  }
  return errors;
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
  const sim = createLocalFleetSim({ tickMs: 25 });
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
    trafficStrategy: scenario.strategy,
    trafficOptions
  });
  try {
    const startA = findNodePos("AP2");
    const startB = findNodePos("AP3");
    const targetA = findNodePos("AP8");
    const targetB = findNodePos("AP7");
    assert.ok(startA && startB && targetA && targetB, "Expected node positions");

    sim.setRobotPose("RB-01", startA);
    sim.setRobotPose("RB-02", startB);
    sim.setRobotControlled("RB-01", true);
    sim.setRobotControlled("RB-02", true);
    sim.setRobotManualMode("RB-01", true);
    sim.setRobotManualMode("RB-02", true);

    assert.equal(sim.goPoint("RB-01", targetA.x, targetA.y), true, "RB-01 goPoint");
    assert.equal(sim.goPoint("RB-02", targetB.x, targetB.y), true, "RB-02 goPoint");

    await delay(500);

    const errors = await monitorReservationEntry(
      sim,
      ["RB-01", "RB-02"],
      MONITOR_DURATION_MS,
      MONITOR_INTERVAL_MS
    );
    assert.equal(
      errors.length,
      0,
      `${scenario.label}: reservation-entry deadlock -> ${errors.join(", ")}`
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
      console.log(`E2E reservation entry ok: ${scenario.label}`);
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
