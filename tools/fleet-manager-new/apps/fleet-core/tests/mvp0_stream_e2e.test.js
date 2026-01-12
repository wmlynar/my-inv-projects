const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createRuntime } = require('../mvp0/runtime');
const { readJson5 } = require('../../map-compiler/lib/config');

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');

function loadFixture(name) {
  const baseDir = path.join(ROOT_DIR, 'scenes', 'fixtures', name);
  const worksites = readJson5(path.join(baseDir, 'config', 'worksites.json5'));
  const streams = readJson5(path.join(baseDir, 'config', 'streams.json5'));
  return {
    baseDir,
    worksites: worksites.worksites || [],
    initialState: worksites.initialState || [],
    streams: streams.streams || []
  };
}

class StreamScenario {
  constructor({ runtime, worksites, streams }) {
    this.runtime = runtime;
    this.worksites = worksites;
    this.streams = streams;
    this.worksiteById = new Map(worksites.map((site) => [site.worksiteId, site]));
    this.worksiteState = new Map();
    this.taskMeta = new Map();
    this.robotLoadState = new Map();
  }

  setInitialState(state) {
    (state || []).forEach((entry) => {
      this.worksiteState.set(entry.worksiteId, {
        occupancy: entry.occupancy || 'unknown',
        occupancyReasonCode: entry.occupancyReasonCode || 'NONE'
      });
    });
  }

  setRobotLoadState(robotId, loadState) {
    this.robotLoadState.set(robotId, loadState);
  }

  getRobotLoadState(robotId) {
    return this.robotLoadState.get(robotId) || 'unknown';
  }

  setOccupancy(worksiteId, occupancy) {
    this.worksiteState.set(worksiteId, { occupancy, occupancyReasonCode: 'NONE' });
  }

  getOccupancy(worksiteId) {
    return this.worksiteState.get(worksiteId)?.occupancy || 'unknown';
  }

  resolveGroup(groupId) {
    return this.worksites
      .filter((site) => site.groupId === groupId)
      .map((site) => site.worksiteId)
      .sort();
  }

  pickDropCandidate(stream) {
    const params = stream?.params || {};
    const pickGroup = params.pickGroup || params.pickGroupId;
    const dropGroup = params.dropGroup || params.dropGroupOrder || params.dropGroupId;

    const pickIds = Array.isArray(pickGroup)
      ? pickGroup
      : typeof pickGroup === 'string'
        ? this.resolveGroup(pickGroup)
        : [];
    const dropIds = Array.isArray(dropGroup)
      ? dropGroup
      : typeof dropGroup === 'string'
        ? this.resolveGroup(dropGroup)
        : [];

    const pickId = pickIds.find((id) => this.getOccupancy(id) === 'filled');
    if (!pickId) return null;

    const dropId = dropIds.find((id, index) => {
      if (this.getOccupancy(id) !== 'empty') return false;
      if (params.dropPolicy?.accessRule === 'preceding_empty') {
        for (let i = 0; i < index; i += 1) {
          if (this.getOccupancy(dropIds[i]) !== 'empty') return false;
        }
      }
      return true;
    });

    if (!dropId) return null;
    return { pickId, dropId };
  }

  maybeCreateTask(nowMs) {
    const state = this.runtime.getState();
    const hasActiveTask = state.tasks.some((task) => !['completed', 'failed', 'canceled'].includes(task.status));
    if (hasActiveTask) return null;

    for (const stream of this.streams) {
      if (!stream.enabled) continue;
      if (stream.kind !== 'pickDrop') continue;
      const candidate = this.pickDropCandidate(stream);
      if (!candidate) continue;

      const pickSite = this.worksiteById.get(candidate.pickId);
      const dropSite = this.worksiteById.get(candidate.dropId);
      if (!pickSite || !dropSite) continue;

      const fromNodeId = pickSite.actionNodeId || pickSite.entryNodeId;
      const toNodeId = dropSite.actionNodeId || dropSite.entryNodeId;
      const parkSite = this.worksites.find((site) => site.worksiteType === 'park');
      const parkNodeId = parkSite?.entryNodeId || null;

      const task = this.runtime.createTask({
        kind: 'pickDrop',
        fromNodeId,
        toNodeId,
        parkNodeId,
        fromWorksiteId: candidate.pickId,
        toWorksiteId: candidate.dropId,
        pickParams: params.pickParams || null,
        dropParams: params.dropParams || null
      }, nowMs);

      this.taskMeta.set(task.taskId, {
        pickWorksiteId: candidate.pickId,
        dropWorksiteId: candidate.dropId,
        pickApplied: false,
        dropApplied: false,
        pickStepId: null,
        dropStepId: null
      });
      this.setOccupancy(candidate.pickId, 'reserved');
      this.setOccupancy(candidate.dropId, 'reserved');
      return task;
    }
    return null;
  }

  updateTaskMeta(tasks) {
    tasks.forEach((task) => {
      if (!task?.taskId || !Array.isArray(task.steps)) return;
      const meta = this.taskMeta.get(task.taskId);
      if (!meta) return;
      if (!meta.pickStepId || !meta.dropStepId) {
        const pickStep = task.steps.find((step) => step.params?.operation === 'ForkLoad');
        const dropStep = task.steps.find((step) => step.params?.operation === 'ForkUnload');
        if (!meta.pickStepId && pickStep) meta.pickStepId = pickStep.stepId;
        if (!meta.dropStepId && dropStep) meta.dropStepId = dropStep.stepId;
      }
    });
  }

  applyWorksiteTransitions(tasks) {
    tasks.forEach((task) => {
      const meta = this.taskMeta.get(task.taskId);
      if (!meta || !Array.isArray(task.steps)) return;
      const pickStep = task.steps.find((step) => step.stepId === meta.pickStepId);
      if (pickStep?.status === 'completed' && !meta.pickApplied) {
        this.setOccupancy(meta.pickWorksiteId, 'empty');
        if (task.assignedRobotId) this.setRobotLoadState(task.assignedRobotId, 'loaded');
        meta.pickApplied = true;
      }
      const dropStep = task.steps.find((step) => step.stepId === meta.dropStepId);
      if (dropStep?.status === 'completed' && !meta.dropApplied) {
        this.setOccupancy(meta.dropWorksiteId, 'filled');
        if (task.assignedRobotId) this.setRobotLoadState(task.assignedRobotId, 'empty');
        meta.dropApplied = true;
      }
    });
  }

  applyCommands(commands, nowMs) {
    (commands || []).forEach((cmd) => {
      if (!cmd?.robotId) return;
      if (cmd.type === 'goTarget') {
        const nodeId = cmd.payload?.targetRef?.nodeId;
        if (nodeId) {
          this.runtime.upsertRobotStatus(cmd.robotId, { nodeId }, nowMs + 1);
        }
      }
      if (cmd.type === 'forkHeight') {
        const height = cmd.payload?.toHeightM;
        if (Number.isFinite(height)) {
          this.runtime.upsertRobotStatus(cmd.robotId, { forkHeightM: height }, nowMs + 1);
        }
      }
    });
  }

  tick(nowMs, { applyCommands = true } = {}) {
    this.maybeCreateTask(nowMs);
    const decision = this.runtime.tick({ nowMs });
    this.updateTaskMeta(decision.tasks || []);
    this.applyWorksiteTransitions(decision.tasks || []);
    if (applyCommands) {
      this.applyCommands(decision.commands || [], nowMs);
    }
    return {
      decision,
      tasks: decision.tasks || [],
      worksiteState: new Map(this.worksiteState),
      robotLoadState: new Map(this.robotLoadState)
    };
  }
}

function findCommand(commands, type, nodeId, operation) {
  return (commands || []).find((cmd) => {
    if (cmd.type !== type) return false;
    if (!nodeId) return true;
    if (cmd.payload?.targetRef?.nodeId !== nodeId) return false;
    if (operation && cmd.payload?.operation !== operation) return false;
    return true;
  });
}

function getWorksiteByType(worksites, type) {
  return worksites.find((site) => site.worksiteType === type) || null;
}

function getWorksiteById(worksites, id) {
  return worksites.find((site) => site.worksiteId === id) || null;
}

test('mvp0 scenario: park -> pick/drop -> park -> pick/drop', () => {
  const fixture = loadFixture('line_pick_drop');
  const runtime = createRuntime({ statusAgeMaxMs: 5000, commandCooldownMs: 0 });
  const scenario = new StreamScenario({
    runtime,
    worksites: fixture.worksites,
    streams: fixture.streams
  });

  const parkSite = getWorksiteByType(fixture.worksites, 'park');
  const pickSite = getWorksiteById(fixture.worksites, 'PICK_01');
  const dropSite = getWorksiteById(fixture.worksites, 'DROP_01');

  assert.ok(parkSite, 'expected park worksite in fixture');
  assert.ok(pickSite, 'expected pick worksite in fixture');
  assert.ok(dropSite, 'expected drop worksite in fixture');

  const now = 1000;
  scenario.setInitialState(fixture.initialState);
  scenario.setRobotLoadState('RB-01', 'empty');
  runtime.upsertRobotStatus('RB-01', {
    status: 'online',
    nodeId: 'LM1',
    forkHeightM: 0.1,
    parkNodeId: parkSite.entryNodeId
  }, now);

  scenario.setOccupancy('PICK_01', 'empty');
  scenario.setOccupancy('DROP_01', 'empty');

  let result = scenario.tick(now, { applyCommands: false });
  assert.ok(findCommand(result.decision.commands, 'goTarget', parkSite.entryNodeId));

  scenario.setOccupancy('PICK_01', 'filled');
  result = scenario.tick(now + 1000);
  assert.ok(findCommand(result.decision.commands, 'goTarget', pickSite.actionNodeId, 'ForkLoad'));
  assert.equal(scenario.getOccupancy('PICK_01'), 'reserved');
  assert.equal(scenario.getOccupancy('DROP_01'), 'reserved');

  result = scenario.tick(now + 2000);
  assert.ok(findCommand(result.decision.commands, 'goTarget', dropSite.actionNodeId, 'ForkUnload'));
  assert.equal(scenario.getOccupancy('PICK_01'), 'empty');
  assert.equal(scenario.getRobotLoadState('RB-01'), 'loaded');

  result = scenario.tick(now + 4000);
  assert.ok(findCommand(result.decision.commands, 'goTarget', parkSite.entryNodeId));
  assert.equal(scenario.getOccupancy('DROP_01'), 'filled');
  assert.equal(scenario.getRobotLoadState('RB-01'), 'empty');
  const completed = result.tasks.find((task) => task.status === 'completed');
  assert.ok(completed);

  result = scenario.tick(now + 6000);
  assert.equal(result.decision.commands.length, 0);

  scenario.setOccupancy('PICK_01', 'filled');
  result = scenario.tick(now + 7000);
  assert.ok(findCommand(result.decision.commands, 'goTarget', pickSite.actionNodeId, 'ForkLoad'));
});
