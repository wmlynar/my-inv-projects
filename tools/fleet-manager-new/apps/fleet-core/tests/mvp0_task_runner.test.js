const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPickDropSteps,
  updateTaskForRobot
} = require('../mvp0/task_runner');

test('buildPickDropSteps generates 5 ordered steps when parking is set', () => {
  const steps = buildPickDropSteps({
    taskId: 'T1',
    fromNodeId: 'AP_PICK',
    toNodeId: 'AP_DROP',
    parkNodeId: 'AP_PARK',
    pickHeightM: 1.2,
    dropHeightM: 0.1
  });

  assert.equal(steps.length, 5);
  assert.equal(steps[0].type, 'moveTo');
  assert.equal(steps[0].targetRef.nodeId, 'AP_PICK');
  assert.equal(steps[1].type, 'forkHeight');
  assert.equal(steps[1].params.toHeightM, 1.2);
  assert.equal(steps[2].type, 'moveTo');
  assert.equal(steps[2].targetRef.nodeId, 'AP_DROP');
  assert.equal(steps[3].type, 'forkHeight');
  assert.equal(steps[3].params.toHeightM, 0.1);
  assert.equal(steps[4].type, 'moveTo');
  assert.equal(steps[4].targetRef.nodeId, 'AP_PARK');
});

test('updateTaskForRobot advances steps based on robot state', () => {
  const task = {
    taskId: 'T2',
    status: 'assigned',
    assignedRobotId: 'R1',
    fromNodeId: 'AP_PICK',
    toNodeId: 'AP_DROP',
    pickHeightM: 1.2,
    dropHeightM: 0.1
  };
  const robotAtPick = {
    robotId: 'R1',
    nodeId: 'AP_PICK',
    forkHeightM: 0.1,
    status: 'online'
  };

  const first = updateTaskForRobot(task, robotAtPick, { toleranceM: 0.02 });
  assert.equal(first.task.status, 'running');
  assert.equal(first.task.steps[0].status, 'completed');
  assert.equal(first.activeStep.type, 'forkHeight');

  const robotForked = {
    ...robotAtPick,
    forkHeightM: 1.2
  };
  const second = updateTaskForRobot(task, robotForked, { toleranceM: 0.02 });
  assert.equal(second.task.steps[1].status, 'completed');
  assert.equal(second.activeStep.type, 'moveTo');
});
