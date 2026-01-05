const assert = require("node:assert/strict");

const { createLocalFleetSim } = require("../src/local_fleet_sim");

const DEFAULT_ROBOT_MODEL = { head: 0.5, tail: 2, width: 1 };
const DEFAULT_ROBOT_MODEL_NAME = "forklift";

const PROFILES = ["conservative", "balanced", "aggressive"];
const MONITOR_DURATION_MS = Number(process.env.E2E_ROBUST_DURATION_MS) || 20000;
const MONITOR_INTERVAL_MS = Number(process.env.E2E_ROBUST_INTERVAL_MS) || 200;
const DEADLOCK_TIMEOUT_MS = Number(process.env.E2E_ROBUST_DEADLOCK_MS) || 5000;
const SEED = Number(process.env.E2E_ROBUST_SEED) || Date.now();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const makeNode = (id, x, y, props = {}) => ({ id, pos: { x, y }, props });
const makeEdge = (id, start, end, width = 1, props = {}) => ({
  id,
  start,
  end,
  props: { width, ...props }
});

const buildGraph = () => {
  const nodes = [
    makeNode("W", 0, 0),
    makeNode("C", 4, 0, { criticalSectionId: "center" }),
    makeNode("E", 8, 0),
    makeNode("N", 4, 4),
    makeNode("S", 4, -4)
  ];
  const edges = [
    makeEdge("W-C", "W", "C"),
    makeEdge("C-E", "C", "E"),
    makeEdge("C-N", "C", "N"),
    makeEdge("C-S", "C", "S")
  ];
  return { nodes, edges, lines: [] };
};

const buildBundle = (profile, seed) => {
  const graph = buildGraph();
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 }, model: DEFAULT_ROBOT_MODEL_NAME },
    { id: "RB-02", pos: { x: 8, y: 0 }, model: DEFAULT_ROBOT_MODEL_NAME },
    { id: "RB-03", pos: { x: 4, y: 4 }, model: DEFAULT_ROBOT_MODEL_NAME },
    { id: "RB-04", pos: { x: 4, y: -4 }, model: DEFAULT_ROBOT_MODEL_NAME }
  ];
  return {
    graph,
    workflow: { bin_locations: {} },
    robotsConfig: {
      models: { [DEFAULT_ROBOT_MODEL_NAME]: { ...DEFAULT_ROBOT_MODEL } },
      defaultModel: DEFAULT_ROBOT_MODEL_NAME,
      robots,
      traffic: {
        strategy: "sipp",
        yieldRecovery: false,
        reservationWaits: false,
        avoidanceLocks: false,
        avoidanceZones: false,
        robustnessProfile: profile,
        criticalSections: {
          enabled: true,
          mode: "ORDERING",
          maxRobotsPerSection: 1
        },
        chaos: {
          enabled: true,
          seed,
          segmentDelayMs: [0, 300],
          stopChance: 0.08,
          stopDurationMs: [200, 600]
        }
      }
    },
    packaging: null
  };
};

const getNodePos = (graph, nodeId) => {
  const node = (graph.nodes || []).find((entry) => entry.id === nodeId);
  return node?.pos || null;
};

const formatMetrics = (metrics) => {
  if (!metrics) return "no metrics";
  const counts = metrics.counts || {};
  const slip = metrics.slip || {};
  const criticalWait = metrics.criticalWait || {};
  return [
    `holds=${counts.holds || 0}`,
    `repairsOk=${counts.repairsSucceeded || 0}`,
    `repairsFail=${counts.repairsFailed || 0}`,
    `replans=${counts.replans || 0}`,
    `deadlocks=${counts.deadlockWarnings || 0}`,
    `violations=${counts.reservationViolations || 0}`,
    `slipP95=${Number.isFinite(slip.p95) ? slip.p95.toFixed(0) : "n/a"}`,
    `criticalWaitP95=${Number.isFinite(criticalWait.p95) ? criticalWait.p95.toFixed(0) : "n/a"}`
  ].join(" ");
};

const monitorScenario = async (sim, durationMs, intervalMs) => {
  const start = Date.now();
  let lastSnapshot = null;
  while (Date.now() - start < durationMs) {
    const snapshot = sim.getDiagnostics({
      includeHistory: false,
      includeDebug: true,
      includeRoute: false,
      includeObstacles: false
    });
    lastSnapshot = snapshot;
    const metrics = snapshot?.traffic?.metrics;
    if (metrics?.counts?.reservationViolations > 0) {
      return { ok: false, error: "reservation_violations", snapshot };
    }
    if (metrics?.counts?.deadlockWarnings > 0) {
      return { ok: false, error: "deadlock_warning", snapshot };
    }
    for (const entry of snapshot.robots || []) {
      const robot = entry.robot || {};
      const runtime = entry.runtime || {};
      if (runtime.blockedReason === "collision") {
        return { ok: false, error: `collision:${robot.id}`, snapshot };
      }
      const moveInfo = robot.diagnostics?.debug?.movement || null;
      if (moveInfo?.shouldMove && Number.isFinite(moveInfo.lastMoveAgeMs)) {
        if (moveInfo.lastMoveAgeMs > DEADLOCK_TIMEOUT_MS) {
          return { ok: false, error: `no_progress:${robot.id}`, snapshot };
        }
      }
    }
    await delay(intervalMs);
  }
  return { ok: true, snapshot: lastSnapshot };
};

const runProfile = async (profile, seed) => {
  const sim = createLocalFleetSim({ tickMs: 40 });
  const bundle = buildBundle(profile, seed);
  sim.loadBundle(bundle);

  const graph = bundle.graph;
  const targets = new Map([
    ["RB-01", getNodePos(graph, "E")],
    ["RB-02", getNodePos(graph, "W")],
    ["RB-03", getNodePos(graph, "S")],
    ["RB-04", getNodePos(graph, "N")]
  ]);
  for (const [robotId, target] of targets.entries()) {
    assert.ok(target, `Missing target for ${robotId}`);
    sim.setRobotControlled(robotId, true);
    sim.setRobotManualMode(robotId, true);
    const ok = sim.goPoint(robotId, target.x, target.y);
    assert.equal(ok, true, `${robotId} goPoint`);
  }

  const result = await monitorScenario(sim, MONITOR_DURATION_MS, MONITOR_INTERVAL_MS);
  const metrics = result.snapshot?.traffic?.metrics || null;
  sim.stopSim();
  if (!result.ok) {
    assert.fail(`[${profile}] ${result.error} metrics=${formatMetrics(metrics)}`);
  }
  console.log(`[${profile}] ok: ${formatMetrics(metrics)}`);
  return metrics;
};

const run = async () => {
  console.log(`E2E robustness seed=${SEED}`);
  const results = [];
  for (const profile of PROFILES) {
    const metrics = await runProfile(profile, SEED);
    results.push({ profile, metrics });
  }
  console.log(
    "Profiles summary:",
    results
      .map((entry) => `${entry.profile}(${formatMetrics(entry.metrics)})`)
      .join(" | ")
  );
};

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
