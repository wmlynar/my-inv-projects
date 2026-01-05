const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createLocalFleetSim } = require("../src/local_fleet_sim");

const rootDir = path.resolve(__dirname, "..");
const graph = JSON.parse(fs.readFileSync(path.join(rootDir, "scenes", "traffic", "graph.json"), "utf8"));
const workflow = JSON.parse(
  fs.readFileSync(path.join(rootDir, "scenes", "traffic", "workflow.json5"), "utf8")
);
const robotsConfig = JSON.parse(
  fs.readFileSync(path.join(rootDir, "scenes", "traffic", "robots.json"), "utf8")
);
const packaging = JSON.parse(
  fs.readFileSync(path.join(rootDir, "scenes", "traffic", "packaging.json"), "utf8")
);

const bundle = { graph, workflow, robotsConfig, packaging };

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(predicate, options = {}) {
  const timeoutMs = options.timeoutMs ?? 2000;
  const intervalMs = options.intervalMs ?? 25;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true;
    await delay(intervalMs);
  }
  return false;
}

async function withSim(run) {
  const sim = createLocalFleetSim({ tickMs: 25 });
  sim.loadBundle(bundle);
  try {
    await run(sim);
  } finally {
    sim.stopSim();
  }
}

function getRobot(sim, id) {
  return sim.getStatus(false).robots.find((robot) => robot.id === id) || null;
}

function findAnyNodePos() {
  const node = (graph.nodes || []).find((entry) => entry?.pos) || null;
  return node?.pos ? { x: node.pos.x, y: node.pos.y } : { x: 0, y: 0 };
}

async function testRobotStateToggles() {
  await withSim(async (sim) => {
    let robot = getRobot(sim, "RB-01");
    assert.equal(robot.controlled, false, "Robot should start uncontrolled");

    sim.setRobotControlled("RB-01", true);
    sim.setRobotDispatchable("RB-01", false);
    robot = getRobot(sim, "RB-01");
    assert.equal(robot.controlled, true, "Robot should be controlled after toggle");
    assert.equal(robot.dispatchable, false, "Robot should be undispatchable after toggle");
    const prevDispatchable = robot.dispatchable;

    const manualDenied = sim.goPoint("RB-01", 0, 0);
    assert.equal(manualDenied, false, "Manual goPoint should fail when manual mode is off");

    sim.setRobotManualMode("RB-01", true);
    robot = getRobot(sim, "RB-01");
    assert.equal(robot.manualMode, true, "Robot should enter manual mode");
    assert.equal(robot.dispatchable, false, "Manual mode should disable dispatchable");

    const manualAllowed = sim.goPoint("RB-01", 0, 0);
    assert.equal(manualAllowed, true, "Manual goPoint should succeed when manual mode is on");

    sim.setRobotManualMode("RB-01", false);
    robot = getRobot(sim, "RB-01");
    assert.equal(robot.manualMode, false, "Robot should exit manual mode");
    assert.equal(robot.dispatchable, prevDispatchable, "Robot should restore dispatchable after manual off");

    sim.setRobotControlled("RB-01", false);
    robot = getRobot(sim, "RB-01");
    assert.equal(robot.controlled, false, "Robot should release control when toggled off");
  });
}

async function testCollisionBlocksBoth() {
  await withSim(async (sim) => {
    const pos = findAnyNodePos();
    assert.ok(Number.isFinite(pos.x) && Number.isFinite(pos.y), "Expected valid position");
    sim.setRobotPose("RB-01", pos);
    sim.setRobotPose("RB-02", pos);

    const blocked = await waitFor(() => {
      const diag = sim.getDiagnostics({
        includeHistory: false,
        includeRoute: false,
        includeObstacles: false
      });
      const rb1 = diag.robots?.find((entry) => entry.robot?.id === "RB-01");
      const rb2 = diag.robots?.find((entry) => entry.robot?.id === "RB-02");
      const reason1 = rb1?.robot?.diagnostics?.reason || null;
      const reason2 = rb2?.robot?.diagnostics?.reason || null;
      return reason1 === "blocked_collision" || reason2 === "blocked_collision";
    }, { timeoutMs: 2000 });
    assert.ok(blocked, "Collision should block at least one robot");

    const robot1 = getRobot(sim, "RB-01");
    const robot2 = getRobot(sim, "RB-02");
    assert.ok(
      robot1.blocked || robot2.blocked,
      "At least one robot should be blocked after collision"
    );
  });
}

async function testDispatchableBlocksAssignment() {
  await withSim(async (sim) => {
    sim.setRobotControlled("RB-01", true);
    sim.setRobotControlled("RB-02", true);
    sim.setRobotDispatchable("RB-01", false);
    sim.setRobotDispatchable("RB-02", false);

    sim.updateWorksite("PICK-A1", { filled: true });
    sim.updateWorksite("DROP-A1", { filled: false });

    await delay(200);
    const emptyTasks = sim.getStatus(false).tasks;
    assert.equal(emptyTasks.length, 0, "No tasks should dispatch when robots are undispatchable");

    sim.setRobotDispatchable("RB-01", true);
    const assigned = await waitFor(
      () => sim.getStatus(false).tasks.some((task) => task.pickId === "PICK-A1"),
      { timeoutMs: 2000 }
    );
    assert.ok(assigned, "Task should dispatch once a robot is dispatchable");
    const task = sim.getStatus(false).tasks.find((item) => item.pickId === "PICK-A1");
    assert.equal(task.robotId, "RB-01", "Dispatch should assign to available robot");
  });
}

async function testNearestAssignment() {
  await withSim(async (sim) => {
    sim.setRobotControlled("RB-01", true);
    sim.setRobotControlled("RB-02", true);

    sim.updateWorksite("PICK-A4", { filled: true });
    sim.updateWorksite("DROP-A4", { filled: false });

    const assigned = await waitFor(
      () => sim.getStatus(false).tasks.some((task) => task.pickId === "PICK-A4"),
      { timeoutMs: 2000 }
    );
    assert.ok(assigned, "Expected task to be assigned");
    const task = sim.getStatus(false).tasks.find((item) => item.pickId === "PICK-A4");
    assert.equal(task.robotId, "RB-02", "Nearest robot should be selected for PICK-A4");
  });
}

async function testFallbackAssignmentWhenNearestUnavailable() {
  await withSim(async (sim) => {
    sim.setRobotControlled("RB-01", true);
    sim.setRobotControlled("RB-02", true);
    sim.setRobotDispatchable("RB-02", false);

    sim.updateWorksite("PICK-A4", { filled: true });
    sim.updateWorksite("DROP-A4", { filled: false });

    const assigned = await waitFor(
      () => sim.getStatus(false).tasks.some((task) => task.pickId === "PICK-A4"),
      { timeoutMs: 2000 }
    );
    assert.ok(assigned, "Expected task to be assigned with fallback robot");
    const task = sim.getStatus(false).tasks.find((item) => item.pickId === "PICK-A4");
    assert.equal(task.robotId, "RB-01", "Fallback robot should take task when nearest unavailable");
  });
}

async function testManualPausesTask() {
  await withSim(async (sim) => {
    sim.setRobotControlled("RB-01", true);
    sim.setRobotControlled("RB-02", true);

    sim.updateWorksite("PICK-A1", { filled: true });
    sim.updateWorksite("DROP-A1", { filled: false });

    const assigned = await waitFor(
      () => sim.getStatus(false).tasks.some((task) => task.pickId === "PICK-A1"),
      { timeoutMs: 2000 }
    );
    assert.ok(assigned, "Expected task assignment before manual pause");

    let task = sim.getStatus(false).tasks.find((item) => item.pickId === "PICK-A1");
    const robotId = task.robotId;
    sim.setRobotManualMode(robotId, true);

    task = sim.getStatus(false).tasks.find((item) => item.id === task.id);
    assert.equal(task.status, "paused", "Task should pause when robot enters manual mode");

    sim.setRobotManualMode(robotId, false);
    const resumed = await waitFor(
      () => {
        const next = sim.getStatus(false).tasks.find((item) => item.id === task.id);
        return next && next.status === "in_progress";
      },
      { timeoutMs: 2000 }
    );
    assert.ok(resumed, "Task should resume after manual mode ends");
  });
}

async function testReloadClearsState() {
  await withSim(async (sim) => {
    sim.setRobotControlled("RB-01", true);
    sim.updateWorksite("PICK-A1", { filled: true });
    sim.updateWorksite("DROP-A1", { filled: false });

    const assigned = await waitFor(
      () => sim.getStatus(false).tasks.some((task) => task.pickId === "PICK-A1"),
      { timeoutMs: 2000 }
    );
    assert.ok(assigned, "Expected task assignment before reload");

    sim.loadBundle(bundle);
    await delay(100);
    const status = sim.getStatus(true);
    assert.equal(status.tasks.length, 0, "Reload should clear tasks");
    const pick = status.worksites.find((site) => site.id === "PICK-A1");
    assert.ok(pick && pick.filled === false, "Reload should reset worksite occupancy");
  });
}

async function run() {
  await testRobotStateToggles();
  await testCollisionBlocksBoth();
  await testDispatchableBlocksAssignment();
  await testNearestAssignment();
  await testFallbackAssignmentWhenNearestUnavailable();
  await testManualPausesTask();
  await testReloadClearsState();
  console.log("E2E sim state ok: dispatch/assignment/manual/reload scenarios pass.");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
