const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createLocalFleetSim } = require("../src/local_fleet_sim");
const { ROBOKIT_TASK_STATUS } = require(path.resolve(
  __dirname,
  "..",
  "..",
  "shared",
  "task_status_contract"
));

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
  const timeoutMs = options.timeoutMs ?? 4000;
  const intervalMs = options.intervalMs ?? 40;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = predicate();
    if (result) return result;
    await delay(intervalMs);
  }
  return null;
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

function getTaskByPick(sim, pickId) {
  return sim.getStatus(false).tasks.find((task) => task.pickId === pickId) || null;
}

async function prepareSingleRobotTask(sim, pickId = "PICK-A1", dropId = "DROP-A1") {
  sim.setRobotControlled("RB-01", true);
  sim.setRobotControlled("RB-02", true);
  sim.setRobotDispatchable("RB-02", false);
  sim.setRobotDispatchable("RB-01", true);

  const worksites = sim.getWorksites();
  (worksites || []).forEach((site) => {
    if (!site?.id) return;
    if (site.id.startsWith("PICK")) {
      sim.updateWorksite(site.id, { filled: site.id === pickId });
    } else if (site.id.startsWith("DROP")) {
      sim.updateWorksite(site.id, { filled: site.id !== dropId });
    }
  });

  const task = await waitFor(() => getTaskByPick(sim, pickId), { timeoutMs: 3000 });
  assert.ok(task, "Expected task assignment");
  return task;
}

async function testRunningPausedStatus() {
  await withSim(async (sim) => {
    const task = await prepareSingleRobotTask(sim);
    const robotId = task.robotId;

    const running = await waitFor(() => {
      const currentTask = sim.getStatus(false).tasks.find((item) => item.id === task.id);
      const robot = getRobot(sim, robotId);
      return currentTask?.status === "in_progress" && robot?.taskStatus === ROBOKIT_TASK_STATUS.running;
    });
    assert.ok(running, "Robot and task should report running status");

    assert.ok(sim.pause(robotId), "Pause should return ok");
    const paused = await waitFor(() => {
      const currentTask = sim.getStatus(false).tasks.find((item) => item.id === task.id);
      const robot = getRobot(sim, robotId);
      return currentTask?.status === "paused" && robot?.taskStatus === ROBOKIT_TASK_STATUS.paused;
    });
    assert.ok(paused, "Robot and task should report paused status");

    assert.ok(sim.resume(robotId), "Resume should return ok");
    const resumed = await waitFor(() => {
      const currentTask = sim.getStatus(false).tasks.find((item) => item.id === task.id);
      const robot = getRobot(sim, robotId);
      return currentTask?.status === "in_progress" && robot?.taskStatus === ROBOKIT_TASK_STATUS.running;
    });
    assert.ok(resumed, "Robot and task should report running after resume");
  });
}

async function testFailedStatus() {
  await withSim(async (sim) => {
    const task = await prepareSingleRobotTask(sim);
    const robotId = task.robotId;
    const failed = await waitFor(
      () => (sim.simulatePickProblem(robotId) ? true : null),
      { timeoutMs: 1000, intervalMs: 50 }
    );
    assert.ok(failed, "Pick problem should trigger task failure");

    const failure = await waitFor(() => {
      const currentTask = sim.getStatus(false).tasks.find((item) => item.id === task.id);
      const robot = getRobot(sim, robotId);
      return currentTask?.status === "failed" && robot?.taskStatus === ROBOKIT_TASK_STATUS.failed;
    });
    assert.ok(failure, "Robot and task should report failed status");
  });
}

async function testCompletedStatus() {
  await withSim(async (sim) => {
    const task = await prepareSingleRobotTask(sim, "PICK-A2", "DROP-A2");
    const robotId = task.robotId;
    const completed = await waitFor(() => {
      const currentTask = sim.getStatus(false).tasks.find((item) => item.id === task.id);
      const robot = getRobot(sim, robotId);
      return currentTask?.status === "completed" && robot?.taskStatus === ROBOKIT_TASK_STATUS.completed;
    }, { timeoutMs: 60000 });
    assert.ok(completed, "Robot and task should report completed status");
  });
}

async function run() {
  await testRunningPausedStatus();
  await testFailedStatus();
  await testCompletedStatus();
  console.log("E2E status contract ok: task_status mapping consistent across core/Robokit.");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
