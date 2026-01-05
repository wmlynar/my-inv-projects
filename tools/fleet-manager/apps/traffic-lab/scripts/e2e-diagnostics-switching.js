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

async function withSim(run) {
  const sim = createLocalFleetSim({ tickMs: 25 });
  sim.loadBundle(bundle);
  try {
    await run(sim);
  } finally {
    sim.stopSim();
  }
}

function getRobotEntry(snapshot, id) {
  return (snapshot.robots || []).find((entry) => entry.robot?.id === id) || null;
}

async function testDiagnosticsHistoryDefaults() {
  await withSim(async (sim) => {
    const snapshot = sim.getDiagnostics({
      includeRoute: false,
      includeObstacles: false
    });
    const entry = getRobotEntry(snapshot, "RB-01");
    assert.ok(entry, "Expected RB-01 diagnostics entry");
    const robot = entry.robot;
    assert.ok(Array.isArray(robot.diagnosticsHistory), "History should be included by default");
    assert.ok(robot.diagnosticsHistoryCount >= 1, "History count should be >= 1");
    assert.equal(
      robot.diagnosticsHistoryCount,
      robot.diagnosticsHistory.length,
      "History count should match history length"
    );
    assert.equal(robot.diagnosticsHistoryLimit, 1000, "Default history limit should be 1000");
    assert.ok(robot.diagnostics?.switching, "Switching summary should be present");
    assert.equal(
      robot.diagnostics.switching.detected,
      false,
      "Initial switching should be false"
    );
  });
}

async function testDiagnosticsSwitchingDetected() {
  await withSim(async (sim) => {
    const robotId = "RB-01";
    const toggles = 6;
    for (let i = 0; i < toggles; i += 1) {
      const blocked = i % 2 === 0;
      const result = sim.handleBlocked({ robotId, blocked });
      assert.ok(result && result.ok !== false, "Blocked toggle should succeed");
      sim.getDiagnostics({ includeRoute: false, includeObstacles: false });
      await delay(5);
    }

    const snapshot = sim.getDiagnostics({
      includeRoute: false,
      includeObstacles: false
    });
    const entry = getRobotEntry(snapshot, robotId);
    assert.ok(entry, "Expected RB-01 diagnostics entry after toggles");
    const switching = entry.robot?.diagnostics?.switching;
    assert.ok(switching, "Switching summary should be present");
    assert.ok(switching.detected, "Switching should be detected after oscillations");
    assert.ok(
      switching.stateChanges >= 4 || switching.reasonChanges >= 4,
      "Expected switching changes to cross threshold"
    );
  });
}

async function run() {
  await testDiagnosticsHistoryDefaults();
  await testDiagnosticsSwitchingDetected();
  console.log("E2E diagnostics switching ok.");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
