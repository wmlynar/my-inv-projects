const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGateway } = require('../lib/gateway');
const { createRuntime } = require('../../fleet-core/mvp0/runtime');

class SimProvider {
  constructor(robotId) {
    this.kind = 'internalSim';
    this.robotId = robotId;
    this.connectionStatus = 'online';
    this.state = { nodeId: 'PARK-01', forkHeightM: 0.1 };
  }

  getSnapshot() {
    return { kind: this.kind, status: this.connectionStatus, lastSeenTsMs: Date.now(), lastError: null };
  }

  async getStatus() {
    return { raw: { ...this.state }, normalized: { ...this.state } };
  }

  async sendCommand(command) {
    if (command.type === 'goTarget') {
      this.state.nodeId = command.payload?.targetRef?.nodeId || this.state.nodeId;
    }
    if (command.type === 'forkHeight') {
      this.state.forkHeightM = command.payload?.toHeightM ?? this.state.forkHeightM;
    }
    return { ok: true, robotAck: { status: 'received' } };
  }
}

test('e2e_task_completes_via_gateway', async () => {
  const provider = new SimProvider('RB-01');
  const gateway = createGateway(
    { robots: [{ robotId: 'RB-01' }] },
    { createProvider: () => provider }
  );

  const runtime = createRuntime({ statusAgeMaxMs: 5000, commandCooldownMs: 0 });
  const start = 1000;

  runtime.upsertRobotStatus('RB-01', {
    status: 'online',
    nodeId: 'PARK-01',
    forkHeightM: 0.1
  }, start);

  runtime.createTask({
    taskId: 'T1',
    kind: 'pickDrop',
    fromNodeId: 'AP-PICK',
    toNodeId: 'AP-DROP',
    parkNodeId: 'PARK-01',
    pickHeightM: 1.2,
    dropHeightM: 0.1
  }, start);

  let completed = false;
  for (let step = 0; step < 10; step += 1) {
    const now = start + step * 1000;
    const decision = runtime.tick({ nowMs: now });
    for (const cmd of decision.commands) {
      await gateway.sendCommand('RB-01', cmd, now);
    }
    const status = await gateway.getRobotStatus('RB-01');
    if (status?.normalized) {
      runtime.upsertRobotStatus('RB-01', { status: 'online', ...status.normalized }, now + 100);
    }
    const task = decision.tasks.find((entry) => entry.taskId === 'T1');
    if (task && task.status === 'completed') {
      completed = true;
      break;
    }
  }

  assert.equal(completed, true);
});

test('e2e_provider_switch_hold', async () => {
  let connectCount = 0;
  class SwitchProvider extends SimProvider {
    async connect() {
      this.connectionStatus = 'connecting';
      connectCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      this.connectionStatus = 'online';
      return true;
    }
  }

  const gateway = createGateway(
    { robots: [{ robotId: 'RB-01', provider: 'internalSim' }] },
    {
      createProvider: (robot) => {
        if (robot.provider === 'robokitSim') {
          return new SwitchProvider(robot.robotId);
        }
        return new SimProvider(robot.robotId);
      }
    }
  );

  const switchPromise = gateway.switchProvider('RB-01', 'robokitSim');

  const command = { type: 'stop', payload: {} };
  const pending = await gateway.sendCommand('RB-01', command, Date.now());
  assert.equal(pending.ok, false);

  const switchResult = await switchPromise;
  assert.equal(switchResult.ok, true);

  await new Promise((resolve) => setTimeout(resolve, 15));
  const after = await gateway.sendCommand('RB-01', command, Date.now());
  assert.equal(after.ok, true);
  assert.ok(connectCount >= 1);
});
