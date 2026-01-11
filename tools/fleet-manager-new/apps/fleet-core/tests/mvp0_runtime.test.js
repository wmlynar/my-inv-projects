const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRuntime } = require('../mvp0/runtime');

test('mvp0 runtime executes pick->drop->park flow for single robot', () => {
  const runtime = createRuntime({ statusAgeMaxMs: 5000, commandCooldownMs: 0 });
  const now = 1000;

  runtime.upsertRobotStatus('R1', {
    status: 'online',
    nodeId: 'LM_START',
    forkHeightM: 0.1
  }, now);

  runtime.createTask({
    taskId: 'T1',
    kind: 'pickDrop',
    fromNodeId: 'AP_PICK',
    toNodeId: 'AP_DROP',
    parkNodeId: 'AP_PARK',
    pickHeightM: 1.2,
    dropHeightM: 0.1
  }, now);

  let decision = runtime.tick({ nowMs: now });
  assert.equal(decision.commands.length, 1);
  assert.equal(decision.commands[0].type, 'goTarget');
  assert.equal(decision.commands[0].payload.targetRef.nodeId, 'AP_PICK');

  runtime.upsertRobotStatus('R1', { nodeId: 'AP_PICK' }, now + 1000);
  decision = runtime.tick({ nowMs: now + 1000 });
  assert.equal(decision.commands[0].type, 'forkHeight');
  assert.equal(decision.commands[0].payload.toHeightM, 1.2);

  runtime.upsertRobotStatus('R1', { forkHeightM: 1.2 }, now + 2000);
  decision = runtime.tick({ nowMs: now + 2000 });
  assert.equal(decision.commands[0].type, 'goTarget');
  assert.equal(decision.commands[0].payload.targetRef.nodeId, 'AP_DROP');

  runtime.upsertRobotStatus('R1', { nodeId: 'AP_DROP' }, now + 3000);
  decision = runtime.tick({ nowMs: now + 3000 });
  assert.equal(decision.commands[0].type, 'forkHeight');
  assert.equal(decision.commands[0].payload.toHeightM, 0.1);

  runtime.upsertRobotStatus('R1', { forkHeightM: 0.1 }, now + 4000);
  decision = runtime.tick({ nowMs: now + 4000 });
  assert.equal(decision.commands[0].type, 'goTarget');
  assert.equal(decision.commands[0].payload.targetRef.nodeId, 'AP_PARK');

  runtime.upsertRobotStatus('R1', { nodeId: 'AP_PARK' }, now + 5000);
  decision = runtime.tick({ nowMs: now + 5000 });
  const task = decision.tasks.find((entry) => entry.taskId === 'T1');
  assert.equal(task.status, 'completed');
  assert.equal(decision.commands.length, 0);
});

test('mvp0 runtime skips park when pending tasks exist', () => {
  const runtime = createRuntime({ statusAgeMaxMs: 5000, commandCooldownMs: 0 });
  const now = 2000;

  runtime.upsertRobotStatus('R1', {
    status: 'online',
    nodeId: 'LM_START',
    forkHeightM: 0.1
  }, now);

  runtime.createTask({
    taskId: 'T1',
    kind: 'pickDrop',
    fromNodeId: 'AP_PICK_1',
    toNodeId: 'AP_DROP_1',
    parkNodeId: 'AP_PARK',
    pickHeightM: 1.2,
    dropHeightM: 0.1
  }, now);

  runtime.createTask({
    taskId: 'T2',
    kind: 'pickDrop',
    fromNodeId: 'AP_PICK_2',
    toNodeId: 'AP_DROP_2',
    parkNodeId: 'AP_PARK',
    pickHeightM: 1.2,
    dropHeightM: 0.1
  }, now);

  let decision = runtime.tick({ nowMs: now });
  assert.equal(decision.commands[0].payload.targetRef.nodeId, 'AP_PICK_1');

  runtime.upsertRobotStatus('R1', { nodeId: 'AP_PICK_1' }, now + 1000);
  decision = runtime.tick({ nowMs: now + 1000 });
  assert.equal(decision.commands[0].type, 'forkHeight');

  runtime.upsertRobotStatus('R1', { forkHeightM: 1.2 }, now + 2000);
  decision = runtime.tick({ nowMs: now + 2000 });
  assert.equal(decision.commands[0].payload.targetRef.nodeId, 'AP_DROP_1');

  runtime.upsertRobotStatus('R1', { nodeId: 'AP_DROP_1' }, now + 3000);
  decision = runtime.tick({ nowMs: now + 3000 });
  assert.equal(decision.commands[0].type, 'forkHeight');

  runtime.upsertRobotStatus('R1', { forkHeightM: 0.1 }, now + 4000);
  decision = runtime.tick({ nowMs: now + 4000 });
  const parkCmd = decision.commands.find((cmd) => cmd.payload?.targetRef?.nodeId === 'AP_PARK');
  assert.equal(Boolean(parkCmd), false);
  const task1 = decision.tasks.find((entry) => entry.taskId === 'T1');
  assert.equal(task1.status, 'completed');

  decision = runtime.tick({ nowMs: now + 5000 });
  assert.equal(decision.commands[0].payload.targetRef.nodeId, 'AP_PICK_2');
});

test('mvp0 runtime holds robot when offline', () => {
  const runtime = createRuntime({ statusAgeMaxMs: 1000, commandCooldownMs: 0 });
  const now = 0;

  runtime.upsertRobotStatus('R1', {
    status: 'online',
    nodeId: 'LM_START',
    forkHeightM: 0.1
  }, now);

  runtime.createTask({
    taskId: 'T2',
    kind: 'pickDrop',
    fromNodeId: 'AP_PICK',
    toNodeId: 'AP_DROP'
  }, now);

  const decision = runtime.tick({ nowMs: now + 5000 });
  assert.equal(decision.holds.length, 1);
  assert.equal(decision.holds[0].robotId, 'R1');
  const stop = decision.commands.find((cmd) => cmd.type === 'stop');
  assert.ok(stop);
});
