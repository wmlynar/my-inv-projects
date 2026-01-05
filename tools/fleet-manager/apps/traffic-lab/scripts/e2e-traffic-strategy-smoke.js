const assert = require("node:assert/strict");

const { createLocalFleetSim } = require("../src/local_fleet_sim");
const { TrafficStrategies } = require("@fleet-manager/core-mapf");

const DEFAULT_ROBOT_MODEL = { head: 0.5, tail: 2, width: 1 };
const DEFAULT_ROBOT_MODEL_NAME = "forklift";

const STRATEGIES = [
  {
    name: "simple",
    time: false,
    segment: false,
    conflict: false,
    full: false,
    global: false,
    routePlanner: "spatial",
    reservationMode: "none",
    avoidanceMode: "none",
    conflictMode: "none",
    optimality: "heuristic",
    kinematics: "point",
    resolution: "none"
  },
  {
    name: "pulse-mapf",
    time: false,
    segment: false,
    conflict: false,
    full: false,
    global: false,
    routePlanner: "spatial",
    reservationMode: "none",
    avoidanceMode: "none",
    conflictMode: "none",
    optimality: "heuristic",
    kinematics: "point",
    resolution: "none"
  },
  {
    name: "pulse-mapf-avoid",
    time: false,
    segment: false,
    conflict: false,
    full: false,
    global: false,
    routePlanner: "spatial",
    reservationMode: "none",
    avoidanceMode: "zones",
    conflictMode: "none",
    optimality: "heuristic",
    kinematics: "point",
    resolution: "none"
  },
  {
    name: "pulse-mapf-time",
    time: true,
    segment: false,
    conflict: false,
    full: false,
    global: false,
    routePlanner: "time-expanded",
    reservationMode: "time",
    avoidanceMode: "none",
    conflictMode: "none",
    optimality: "heuristic",
    kinematics: "point",
    resolution: "none"
  },
  {
    name: "sipp",
    time: true,
    segment: true,
    conflict: false,
    full: false,
    global: false,
    routePlanner: "time-expanded",
    reservationMode: "segment",
    avoidanceMode: "locks",
    conflictMode: "none",
    optimality: "heuristic",
    kinematics: "point",
    resolution: "none"
  },
  {
    name: "sipp-kinodynamic",
    time: true,
    segment: true,
    conflict: false,
    full: false,
    global: false,
    routePlanner: "time-expanded",
    reservationMode: "segment",
    avoidanceMode: "locks",
    conflictMode: "none",
    optimality: "heuristic",
    kinematics: "kinodynamic",
    resolution: "none"
  },
  {
    name: "sipp-robust",
    time: true,
    segment: true,
    conflict: false,
    full: false,
    global: false,
    routePlanner: "time-expanded",
    reservationMode: "segment",
    avoidanceMode: "locks",
    conflictMode: "none",
    optimality: "heuristic",
    kinematics: "point",
    resolution: "none"
  },
  {
    name: "ecbs-sipp",
    time: true,
    segment: true,
    conflict: false,
    full: false,
    global: false,
    routePlanner: "time-expanded",
    reservationMode: "segment",
    avoidanceMode: "locks",
    conflictMode: "none",
    optimality: "bounded",
    kinematics: "point",
    resolution: "none"
  },
  {
    name: "cbs-sipp",
    time: true,
    segment: true,
    conflict: true,
    full: false,
    global: false,
    routePlanner: "time-expanded",
    reservationMode: "segment",
    avoidanceMode: "locks",
    conflictMode: "local",
    optimality: "optimal",
    kinematics: "point",
    resolution: "backtracking"
  },
  {
    name: "cbs-full",
    time: true,
    segment: true,
    conflict: true,
    full: true,
    global: false,
    routePlanner: "time-expanded",
    reservationMode: "segment",
    avoidanceMode: "locks",
    conflictMode: "full",
    optimality: "optimal",
    kinematics: "point",
    resolution: "backtracking"
  },
  {
    name: "mapf-global",
    time: true,
    segment: true,
    conflict: true,
    full: false,
    global: true,
    routePlanner: "global",
    reservationMode: "segment",
    avoidanceMode: "locks",
    conflictMode: "global",
    optimality: "heuristic",
    kinematics: "point",
    resolution: "replanning"
  },
  {
    name: "mapf-pibt",
    time: true,
    segment: true,
    conflict: true,
    full: false,
    global: true,
    routePlanner: "global",
    reservationMode: "segment",
    avoidanceMode: "locks",
    conflictMode: "global",
    optimality: "heuristic",
    kinematics: "point",
    resolution: "replanning"
  },
  {
    name: "mapf-mstar",
    time: true,
    segment: true,
    conflict: true,
    full: false,
    global: true,
    routePlanner: "global",
    reservationMode: "segment",
    avoidanceMode: "locks",
    conflictMode: "global",
    optimality: "heuristic",
    kinematics: "point",
    resolution: "replanning"
  },
  {
    name: "mapf-smt",
    time: true,
    segment: true,
    conflict: true,
    full: false,
    global: true,
    routePlanner: "global",
    reservationMode: "segment",
    avoidanceMode: "locks",
    conflictMode: "global",
    optimality: "optimal",
    kinematics: "point",
    resolution: "replanning"
  }
];

function makeNode(id, x, y) {
  return { id, pos: { x, y } };
}

function applyDefaultModel(robots) {
  return (robots || []).map((robot) => {
    if (!robot) return robot;
    if (robot.model) return robot;
    return { ...robot, model: DEFAULT_ROBOT_MODEL_NAME };
  });
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

function getRoute(sim, robotId) {
  const debug = sim.getDebugState();
  const robot = debug.robots.find((item) => item.id === robotId);
  return robot ? robot.route : null;
}

function runStrategyFlags(entry) {
  const strategy = TrafficStrategies.create(entry.name, {});
  assert.equal(strategy.getName(), entry.name, `Expected strategy name ${entry.name}`);
  assert.equal(Boolean(strategy.useTimeReservations()), entry.time, `${entry.name} time flag`);
  assert.equal(
    Boolean(strategy.useSegmentReservations()),
    entry.segment,
    `${entry.name} segment flag`
  );
  assert.equal(Boolean(strategy.useConflictSearch?.()), entry.conflict, `${entry.name} conflict flag`);
  assert.equal(
    Boolean(strategy.useFullConflictSearch?.()),
    entry.full,
    `${entry.name} full conflict flag`
  );
  assert.equal(
    Boolean(strategy.useGlobalConflictSearch?.()),
    entry.global,
    `${entry.name} global conflict flag`
  );
}

function runStrategyCatalog(entry) {
  const described = TrafficStrategies.describe(entry.name, {});
  assert.ok(described, `${entry.name} expected catalog entry`);
  const dimensions = described.dimensions || {};
  const categories = described.categories || {};
  assert.equal(
    dimensions.routePlanner?.searchSpace,
    entry.routePlanner,
    `${entry.name} routePlanner searchSpace`
  );
  assert.equal(
    dimensions.reservation?.granularity,
    entry.reservationMode,
    `${entry.name} reservation granularity`
  );
  assert.equal(
    dimensions.avoidance?.mechanism,
    entry.avoidanceMode,
    `${entry.name} avoidance mechanism`
  );
  assert.equal(
    dimensions.conflict?.search,
    entry.conflictMode,
    `${entry.name} conflict search`
  );
  assert.equal(
    dimensions.routePlanner?.optimality,
    entry.optimality,
    `${entry.name} optimality`
  );
  assert.equal(
    dimensions.routePlanner?.kinematics,
    entry.kinematics,
    `${entry.name} kinematics`
  );
  assert.equal(
    dimensions.conflict?.resolution,
    entry.resolution,
    `${entry.name} conflict resolution`
  );
  assert.equal(categories.routePlanner, entry.routePlanner, `${entry.name} category routePlanner`);
  assert.equal(categories.reservation, entry.reservationMode, `${entry.name} category reservation`);
  assert.equal(categories.avoidance, entry.avoidanceMode, `${entry.name} category avoidance`);
  assert.equal(categories.conflictSearch, entry.conflictMode, `${entry.name} category conflictSearch`);
}

function runStrategyRoute(entry) {
  const corridorLength = 30;
  const nodes = [makeNode("S", 0, 0), makeNode("G", corridorLength, 0)];
  const edges = [{ id: "S-G", start: "S", end: "G", props: { width: 4 } }];
  const robots = [
    { id: "RB-01", pos: { x: 0, y: 0 } },
    { id: "RB-02", pos: { x: 0, y: 0 } }
  ];
  const traffic = {
    strategy: entry.name,
    segmentLength: 3,
    yieldRecovery: false,
    reservationWaits: false,
    avoidanceLocks: false,
    avoidanceZones: false
  };

  const sim = createLocalFleetSim({ tickMs: 1000 });
  sim.loadBundle(buildBundle({ nodes, edges, robots, traffic }));
  sim.stopSim();
  sim.setRobotManualMode("RB-01", true);
  sim.setRobotManualMode("RB-02", true);
  assert.equal(sim.goPoint("RB-01", corridorLength, 0), true, `${entry.name} accept goal #1`);
  assert.equal(sim.goPoint("RB-02", corridorLength, 0), true, `${entry.name} accept goal #2`);
  const route2 = getRoute(sim, "RB-02");
  assert.ok(route2, `${entry.name} planned a route`);
  assert.ok(route2.schedule.length > 0, `${entry.name} schedule should exist`);
  assert.ok(
    Number.isFinite(route2.schedule[0].waitMs),
    `${entry.name} schedule should include waitMs`
  );
  const hasSegments = (route2.segments || []).some(
    (segment) => segment.edgeGroupKey && segment.edgeGroupKey.includes("::")
  );
  assert.equal(hasSegments, entry.segment, `${entry.name} segmented corridor`);
  sim.stopSim();
}

function run() {
  STRATEGIES.forEach((entry) => {
    runStrategyFlags(entry);
    runStrategyCatalog(entry);
    runStrategyRoute(entry);
    console.log(`E2E traffic strategy ok: ${entry.name}`);
  });
}

run();
