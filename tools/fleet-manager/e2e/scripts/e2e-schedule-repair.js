const assert = require("node:assert/strict");

const { createFleetSim } = require("@fleet-manager/sim-runtime");

const DEFAULT_ROBOT_MODEL = { head: 0.5, tail: 2, width: 1 };
const DEFAULT_ROBOT_MODEL_NAME = "forklift";

function applyDefaultModel(robots) {
  return (robots || []).map((robot) => {
    if (!robot) return robot;
    if (robot.model) return robot;
    return { ...robot, model: DEFAULT_ROBOT_MODEL_NAME };
  });
}

function makeNode(id, x, y) {
  return { id, pos: { x, y } };
}

function makeEdge(id, start, end, width = 4) {
  return { id, start, end, props: { width } };
}

function buildBundle({ nodes, edges, robots, traffic }) {
  return {
    graph: { nodes, edges, lines: [] },
    workflow: { bin_locations: {} },
    robotsConfig: {
      models: { [DEFAULT_ROBOT_MODEL_NAME]: { ...DEFAULT_ROBOT_MODEL } },
      defaultModel: DEFAULT_ROBOT_MODEL_NAME,
      robots: applyDefaultModel(robots),
      traffic
    },
    packaging: null
  };
}

function getScheduleEntry(runtime, segmentIndex) {
  if (!runtime?.route?.schedule?.length) return null;
  return runtime.route.schedule.find((entry) => entry.segmentIndex === segmentIndex) || null;
}

function testRepairSlipNoConflict() {
  const sim = createFleetSim({ tickMs: 500, enableTestHooks: true });
  const nodes = [makeNode("S", 0, 0), makeNode("G", 8, 0)];
  const edges = [makeEdge("S-G", "S", "G")];
  const robots = [{ id: "RB-01", pos: { x: 0, y: 0 } }];
  const traffic = {
    strategy: "sipp",
    reservationProfile: "balanced",
    yieldRecovery: false,
    reservationWaits: false,
    avoidanceLocks: false,
    avoidanceZones: false
  };
  sim.loadBundle(buildBundle({ nodes, edges, robots, traffic }));
  sim.stopSim();

  sim.setRobotManualMode("RB-01", true);
  assert.equal(sim.goPoint("RB-01", 8, 0), true, "Robot should accept goal");
  const runtime = sim.__test.getRuntime("RB-01");
  const entry = getScheduleEntry(runtime, 0);
  assert.ok(entry, "Schedule entry should exist");
  const delayMs = Math.max(800, Math.floor(entry.travelMs / 2));
  const nowMs = entry.startTime + delayMs;
  const repaired = sim.__test.repairSchedule("RB-01", nowMs);
  assert.ok(repaired, "Schedule repair should return data");
  const next = getScheduleEntry(runtime, 0);
  assert.ok(next.startTime >= nowMs, "Retimed slot should not start before now");
  assert.ok(next.startTime > entry.startTime, "Retimed slot should shift forward");
  sim.stopSim();
  console.log("E2E schedule repair: slip without conflict ok.");
}

function testRepairSlipWithConflict() {
  const sim = createFleetSim({ tickMs: 500, enableTestHooks: true });
  const nodes = [makeNode("S", 0, 0), makeNode("G", 8, 0)];
  const edges = [makeEdge("S-G", "S", "G")];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } }
  ];
  const traffic = {
    strategy: "sipp",
    reservationProfile: "balanced",
    yieldRecovery: false,
    reservationWaits: false,
    avoidanceLocks: false,
    avoidanceZones: false
  };
  sim.loadBundle(buildBundle({ nodes, edges, robots, traffic }));
  sim.stopSim();

  sim.setRobotManualMode("RB-01", true);
  sim.setRobotManualMode("RB-02", true);
  assert.equal(sim.goPoint("RB-01", 8, 0), true, "Robot A should accept goal");
  assert.equal(sim.goPoint("RB-02", 8, 0), true, "Robot B should accept goal");

  const runtimeA = sim.__test.getRuntime("RB-01");
  const runtimeB = sim.__test.getRuntime("RB-02");
  const entryA = getScheduleEntry(runtimeA, 0);
  const entryB = getScheduleEntry(runtimeB, 0);
  assert.ok(entryA, "Robot A schedule entry should exist");
  assert.ok(entryB, "Robot B schedule entry should exist");

  const delayMs = Math.max(500, Math.floor(entryA.travelMs / 2));
  let nowMs = entryB.startTime - delayMs;
  if (nowMs <= entryA.startTime) {
    nowMs = entryA.startTime + 200;
  }
  const repaired = sim.__test.repairSchedule("RB-01", nowMs);
  assert.ok(repaired, "Schedule repair should return data");
  const nextA = getScheduleEntry(runtimeA, 0);
  assert.ok(
    nextA.startTime >= entryB.arrivalTime,
    "Retimed slot should move after conflicting reservation"
  );
  sim.stopSim();
  console.log("E2E schedule repair: slip with conflict ok.");
}

function testAdaptiveSlack() {
  const sim = createFleetSim({ tickMs: 500, enableTestHooks: true });
  const nodes = [makeNode("S", 0, 0), makeNode("G", 8, 0)];
  const edges = [makeEdge("S-G", "S", "G")];
  const robots = [{ id: "RB-01", pos: { x: 0, y: 0 } }];
  const traffic = {
    strategy: "sipp",
    reservationProfile: "balanced",
    yieldRecovery: false,
    reservationWaits: false,
    avoidanceLocks: false,
    avoidanceZones: false
  };
  sim.loadBundle(buildBundle({ nodes, edges, robots, traffic }));
  sim.stopSim();

  const baseSlack = sim.__test.getScheduleSlackMs("RB-01");
  assert.ok(Number.isFinite(baseSlack), "Base slack should be numeric");
  assert.equal(baseSlack, 120, "Balanced profile base slack should be 120");

  const ok = sim.__test.recordScheduleDelay("RB-01", 420);
  assert.equal(ok, true, "Should record delay");
  const nextSlack = sim.__test.getScheduleSlackMs("RB-01");
  assert.ok(Number.isFinite(nextSlack), "Adaptive slack should be numeric");
  assert.ok(nextSlack > baseSlack, "Adaptive slack should increase after delay");
  assert.equal(nextSlack, 360, "Adaptive slack should clamp to max for balanced profile");

  sim.stopSim();
  console.log("E2E adaptive slack: increases and clamps ok.");
}

function testAdaptiveSlackOverrides() {
  const sim = createFleetSim({ tickMs: 500, enableTestHooks: true });
  const nodes = [makeNode("S", 0, 0), makeNode("G", 8, 0)];
  const edges = [makeEdge("S-G", "S", "G")];
  const robots = [{ id: "RB-01", pos: { x: 0, y: 0 } }];
  const traffic = {
    strategy: "sipp",
    reservationProfile: "balanced",
    yieldRecovery: false,
    reservationWaits: false,
    avoidanceLocks: false,
    avoidanceZones: false,
    scheduleSlackMs: 80,
    scheduleSlackMinMs: 50,
    scheduleSlackMaxMs: 140
  };
  sim.loadBundle(buildBundle({ nodes, edges, robots, traffic }));
  sim.stopSim();

  const baseSlack = sim.__test.getScheduleSlackMs("RB-01");
  assert.equal(baseSlack, 80, "Explicit slack override should apply");

  const ok = sim.__test.recordScheduleDelay("RB-01", 420);
  assert.equal(ok, true, "Should record delay");
  const nextSlack = sim.__test.getScheduleSlackMs("RB-01");
  assert.equal(nextSlack, 140, "Adaptive slack should clamp to overridden max");

  sim.stopSim();
  console.log("E2E adaptive slack overrides: ok.");
}

function run() {
  testRepairSlipNoConflict();
  testRepairSlipWithConflict();
  testAdaptiveSlack();
  testAdaptiveSlackOverrides();
}

run();
