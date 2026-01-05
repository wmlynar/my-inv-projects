const assert = require("node:assert/strict");

const { TrafficStrategies } = require("@fleet-manager/core-mapf");
const { ReservationTable } = require("@fleet-manager/core-reservations");
const { create } = TrafficStrategies;

function testReservationTableConflicts() {
  const table = new ReservationTable({ safetyMs: 100, horizonMs: 4000 });
  const first = table.reserveEdge("A<->B", "RB-01", 1000, 2000);
  assert.ok(first.ok, "First reservation should succeed");

  const overlap = table.reserveEdge("A<->B", "RB-02", 1500, 2100);
  assert.equal(overlap.ok, false, "Overlapping reservation should be rejected");
  assert.equal(overlap.holder, "RB-01", "Holder should point to first robot");

  const clear = table.reserveEdge("A<->B", "RB-02", 2300, 2600);
  assert.ok(clear.ok, "Non-overlapping reservation should succeed");
  console.log("E2E traffic v2: reservation conflicts ok.");
}

function testReservationTableRelease() {
  const table = new ReservationTable({ safetyMs: 80 });
  table.reserveEdge("A<->B", "RB-01", 500, 900);
  table.reserveNode("N1", "RB-01", 700, 150);
  table.releaseRobot("RB-01");

  const edge = table.reserveEdge("A<->B", "RB-02", 600, 800);
  const node = table.reserveNode("N1", "RB-02", 650, 100);
  assert.ok(edge.ok, "Edge reservation should succeed after release");
  assert.ok(node.ok, "Node reservation should succeed after release");
  console.log("E2E traffic v2: release clears reservations.");
}

function testTimeStrategyDefaults() {
  const strategy = create("pulse-mapf-time", {});
  assert.equal(strategy.getName(), "pulse-mapf-time", "Strategy name should match");
  assert.equal(strategy.useTimeReservations(), true, "Time reservations should be enabled");
  assert.ok(strategy.getReservationHorizonMs() > 0, "Horizon should be > 0");
  assert.ok(strategy.getReservationStepMs() > 0, "Step should be > 0");
  assert.ok(strategy.getReservationSafetyMs() >= 0, "Safety should be >= 0");
  assert.ok(strategy.getReservationNodeDwellMs() >= 0, "Node dwell should be >= 0");
  console.log("E2E traffic v2: default strategy options ok.");
}

function testTimeStrategyOverrides() {
  const strategy = create("pulse-mapf-time", {
    reservationHorizonMs: 12000,
    reservationStepMs: 250,
    reservationSafetyMs: 180,
    reservationNodeDwellMs: 400
  });
  assert.equal(strategy.getReservationHorizonMs(), 12000, "Horizon override should apply");
  assert.equal(strategy.getReservationStepMs(), 250, "Step override should apply");
  assert.equal(strategy.getReservationSafetyMs(), 180, "Safety override should apply");
  assert.equal(strategy.getReservationNodeDwellMs(), 400, "Node dwell override should apply");
  console.log("E2E traffic v2: overrides ok.");
}

function testReservationProfiles() {
  const conservative = create("sipp", { reservationProfile: "conservative" });
  assert.equal(conservative.getReservationHorizonMs(), 14000, "Profile horizon should apply");
  assert.equal(conservative.getReservationStepMs(), 250, "Profile step should apply");
  assert.equal(conservative.getReservationSafetyMs(), 180, "Profile safety should apply");
  assert.equal(conservative.getReservationNodeDwellMs(), 450, "Profile dwell should apply");
  assert.equal(conservative.getScheduleSlackMs(), 220, "Profile slack should apply");
  assert.equal(conservative.useScheduleRepair(), true, "Profile schedule repair should apply");
  assert.equal(conservative.useTurnTimeReservations(), true, "Profile turn time should apply");

  const aggressive = create("sipp", { reservationProfile: "aggressive" });
  assert.equal(aggressive.getReservationHorizonMs(), 6000, "Aggressive horizon should apply");
  assert.equal(aggressive.getReservationStepMs(), 150, "Aggressive step should apply");
  assert.equal(aggressive.getReservationSafetyMs(), 90, "Aggressive safety should apply");
  assert.equal(aggressive.getReservationNodeDwellMs(), 220, "Aggressive dwell should apply");
  assert.equal(aggressive.getScheduleSlackMs(), 60, "Aggressive slack should apply");
  assert.equal(aggressive.useScheduleRepair(), true, "Aggressive schedule repair should apply");
  assert.equal(aggressive.useTurnTimeReservations(), false, "Aggressive turn time should apply");
  console.log("E2E traffic v2: reservation profiles ok.");
}

function testRobustOverrides() {
  const strategy = create("sipp", {
    reservationProfile: "balanced",
    reservationHorizonMs: 7000,
    scheduleSlackMs: 90,
    scheduleRepair: false,
    turnTimeReservations: false
  });
  assert.equal(strategy.getReservationHorizonMs(), 7000, "Explicit horizon should override");
  assert.equal(strategy.getScheduleSlackMs(), 90, "Explicit slack should override");
  assert.equal(strategy.useScheduleRepair(), false, "Explicit schedule repair should override");
  assert.equal(strategy.useTurnTimeReservations(), false, "Explicit turn time should override");

  const cross = create("cbs-sipp", {
    scheduleRepair: true,
    scheduleSlackMs: 140,
    turnTimeReservations: true
  });
  assert.equal(cross.useScheduleRepair(), true, "Robust flags should apply across strategies");
  assert.equal(cross.getScheduleSlackMs(), 140, "Slack should apply across strategies");
  assert.equal(cross.useTurnTimeReservations(), true, "Turn time should apply across strategies");
  console.log("E2E traffic v2: robust overrides ok.");
}

function testEcbsSippDefaults() {
  const strategy = create("ecbs-sipp", {});
  assert.equal(strategy.getName(), "ecbs-sipp", "Strategy name should match");
  assert.equal(strategy.useTimeReservations(), true, "Time reservations should be enabled");
  assert.equal(strategy.useSegmentReservations(), true, "Segment reservations should be enabled");
  assert.equal(strategy.useAvoidanceLocks(), true, "Avoidance locks should be enabled");
  assert.ok(strategy.getPlannerWeight() > 1, "Planner weight should be > 1");
  assert.equal(strategy.getReplanDistance(), 2.0, "Replan distance default should apply");
  assert.equal(strategy.getReplanIntervalMs(), 900, "Replan interval default should apply");
  console.log("E2E traffic v2: ecbs-sipp defaults ok.");
}

function testSippKinodynamicDefaults() {
  const strategy = create("sipp-kinodynamic", {});
  assert.equal(strategy.getName(), "sipp-kinodynamic", "Strategy name should match");
  assert.equal(strategy.useTimeReservations(), true, "Time reservations should be enabled");
  assert.equal(strategy.useSegmentReservations(), true, "Segment reservations should be enabled");
  assert.equal(strategy.useTurnTimeReservations(), true, "Turn-time reservations should be enabled");
  console.log("E2E traffic v2: sipp-kinodynamic defaults ok.");
}

function testSippRobustDefaults() {
  const strategy = create("sipp-robust", {});
  assert.equal(strategy.getName(), "sipp-robust", "Strategy name should match");
  assert.equal(strategy.useTimeReservations(), true, "Time reservations should be enabled");
  assert.equal(strategy.useSegmentReservations(), true, "Segment reservations should be enabled");
  assert.equal(strategy.useScheduleRepair(), true, "Schedule repair should be enabled");
  assert.ok(strategy.getScheduleSlackMs() >= 0, "Schedule slack should be >= 0");
  assert.equal(strategy.useYieldRecovery(), false, "Yield recovery should be disabled");
  assert.equal(strategy.useRecoveryMoves(), false, "Recovery moves should be disabled");
  console.log("E2E traffic v2: sipp-robust defaults ok.");
}

function testCbsSippDefaults() {
  const strategy = create("cbs-sipp", {});
  assert.equal(strategy.getName(), "cbs-sipp", "Strategy name should match");
  assert.equal(strategy.useTimeReservations(), true, "Time reservations should be enabled");
  assert.equal(strategy.useSegmentReservations(), true, "Segment reservations should be enabled");
  assert.equal(strategy.useAvoidanceLocks(), true, "Avoidance locks should be enabled");
  assert.equal(strategy.useConflictSearch(), true, "Conflict search should be enabled");
  assert.equal(strategy.getPlannerWeight(), 1, "Planner weight default should be 1");
  assert.ok(strategy.getConflictSearchDepth() >= 1, "Conflict depth default should be >= 1");
  console.log("E2E traffic v2: cbs-sipp defaults ok.");
}

function testCbsFullDefaults() {
  const strategy = create("cbs-full", {});
  assert.equal(strategy.getName(), "cbs-full", "Strategy name should match");
  assert.equal(strategy.useTimeReservations(), true, "Time reservations should be enabled");
  assert.equal(strategy.useSegmentReservations(), true, "Segment reservations should be enabled");
  assert.equal(strategy.useAvoidanceLocks(), true, "Avoidance locks should be enabled");
  assert.equal(strategy.useConflictSearch(), true, "Conflict search should be enabled");
  assert.equal(strategy.useFullConflictSearch(), true, "Full conflict search should be enabled");
  assert.equal(strategy.getPlannerWeight(), 1, "Planner weight default should be 1");
  assert.ok(strategy.getConflictSearchDepth() >= 2, "Conflict depth default should be >= 2");
  console.log("E2E traffic v2: cbs-full defaults ok.");
}

function testMapfGlobalDefaults() {
  const strategy = create("mapf-global", {});
  assert.equal(strategy.getName(), "mapf-global", "Strategy name should match");
  assert.equal(strategy.useTimeReservations(), true, "Time reservations should be enabled");
  assert.equal(strategy.useSegmentReservations(), true, "Segment reservations should be enabled");
  assert.equal(strategy.useAvoidanceLocks(), true, "Avoidance locks should be enabled");
  assert.equal(strategy.useConflictSearch(), true, "Conflict search should be enabled");
  assert.equal(strategy.useGlobalConflictSearch(), true, "Global MAPF search should be enabled");
  assert.equal(strategy.getGlobalSolverType(), "astar", "Global solver should be astar");
  assert.equal(strategy.getPlannerWeight(), 1, "Planner weight default should be 1");
  assert.ok(strategy.getConflictSearchDepth() >= 2, "Conflict depth default should be >= 2");
  console.log("E2E traffic v2: mapf-global defaults ok.");
}

function testMapfPibtDefaults() {
  const strategy = create("mapf-pibt", {});
  assert.equal(strategy.getName(), "mapf-pibt", "Strategy name should match");
  assert.equal(strategy.useTimeReservations(), true, "Time reservations should be enabled");
  assert.equal(strategy.useSegmentReservations(), true, "Segment reservations should be enabled");
  assert.equal(strategy.useAvoidanceLocks(), true, "Avoidance locks should be enabled");
  assert.equal(strategy.useConflictSearch(), true, "Conflict search should be enabled");
  assert.equal(strategy.useGlobalConflictSearch(), true, "Global MAPF search should be enabled");
  assert.equal(strategy.getGlobalSolverType(), "pibt", "Global solver should be pibt");
  console.log("E2E traffic v2: mapf-pibt defaults ok.");
}

function testMapfMStarDefaults() {
  const strategy = create("mapf-mstar", {});
  assert.equal(strategy.getName(), "mapf-mstar", "Strategy name should match");
  assert.equal(strategy.useTimeReservations(), true, "Time reservations should be enabled");
  assert.equal(strategy.useSegmentReservations(), true, "Segment reservations should be enabled");
  assert.equal(strategy.useAvoidanceLocks(), true, "Avoidance locks should be enabled");
  assert.equal(strategy.useConflictSearch(), true, "Conflict search should be enabled");
  assert.equal(strategy.useGlobalConflictSearch(), true, "Global MAPF search should be enabled");
  assert.equal(strategy.getGlobalSolverType(), "mstar", "Global solver should be mstar");
  console.log("E2E traffic v2: mapf-mstar defaults ok.");
}

function testMapfSmtDefaults() {
  const strategy = create("mapf-smt", {});
  assert.equal(strategy.getName(), "mapf-smt", "Strategy name should match");
  assert.equal(strategy.useTimeReservations(), true, "Time reservations should be enabled");
  assert.equal(strategy.useSegmentReservations(), true, "Segment reservations should be enabled");
  assert.equal(strategy.useAvoidanceLocks(), true, "Avoidance locks should be enabled");
  assert.equal(strategy.useConflictSearch(), true, "Conflict search should be enabled");
  assert.equal(strategy.useGlobalConflictSearch(), true, "Global MAPF search should be enabled");
  assert.equal(strategy.getGlobalSolverType(), "csp", "Global solver should be csp");
  assert.equal(strategy.getPlannerWeight(), 1, "Planner weight default should be 1");
  assert.ok(strategy.getConflictSearchDepth() >= 2, "Conflict depth default should be >= 2");
  console.log("E2E traffic v2: mapf-smt defaults ok.");
}

function run() {
  testReservationTableConflicts();
  testReservationTableRelease();
  testTimeStrategyDefaults();
  testTimeStrategyOverrides();
  testReservationProfiles();
  testRobustOverrides();
  testEcbsSippDefaults();
  testSippKinodynamicDefaults();
  testSippRobustDefaults();
  testCbsSippDefaults();
  testCbsFullDefaults();
  testMapfGlobalDefaults();
  testMapfPibtDefaults();
  testMapfMStarDefaults();
  testMapfSmtDefaults();
}

run();
