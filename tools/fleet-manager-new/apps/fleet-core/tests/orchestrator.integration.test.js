const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Orchestrator } = require('../orchestrator/core');
const { makeDclMap } = require('./fixtures/dcl_map');

test('orchestrator assigns best robot and produces command + locks', () => {
  const orchestrator = new Orchestrator(makeDclMap(), { speedMps: 1 });
  const decision = orchestrator.step({
    nowMs: 1000,
    robots: [
      { robotId: 'R1', nodeId: 'A', status: 'online' },
      { robotId: 'R2', nodeId: 'B', status: 'online' }
    ],
    tasks: [
      {
        taskId: 'T1',
        status: 'created',
        fromNodeId: 'B',
        toNodeId: 'C',
        priority: 1
      }
    ],
    reservations: []
  });

  assert.equal(decision.assignments.length, 1);
  assert.equal(decision.assignments[0].robotId, 'R2');

  assert.equal(decision.commands.length, 1);
  assert.equal(decision.commands[0].payload.targetRef.nodeId, 'C');

  const grants = decision.locks.grants;
  assert.ok(grants.length >= 1);
  const r2 = grants.find((entry) => entry.robotId === 'R2');
  assert.ok(r2);
  assert.ok(r2.grantedCells.length > 0);
});

test('orchestrator advances steps when robot is already at target', () => {
  const orchestrator = new Orchestrator(makeDclMap(), { speedMps: 1 });
  const decision = orchestrator.step({
    nowMs: 2000,
    robots: [{ robotId: 'R1', nodeId: 'B', status: 'online' }],
    tasks: [
      {
        taskId: 'T2',
        status: 'assigned',
        assignedRobotId: 'R1',
        fromNodeId: 'B',
        toNodeId: 'C',
        steps: [
          {
            stepId: 'T2:step:1',
            type: 'moveTo',
            status: 'pending',
            targetRef: { nodeId: 'B' }
          },
          {
            stepId: 'T2:step:2',
            type: 'moveTo',
            status: 'pending',
            targetRef: { nodeId: 'C' }
          }
        ]
      }
    ],
    reservations: []
  });

  const task = decision.tasks[0];
  assert.equal(task.status, 'running');
  assert.equal(task.steps[0].status, 'completed');
  assert.equal(decision.commands[0].payload.targetRef.nodeId, 'C');
});
