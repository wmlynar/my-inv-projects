const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Orchestrator } = require('../orchestrator/core');
const { makeDclMap } = require('./fixtures/dcl_map');

test('single lane contention grants one robot at a time', () => {
  const orchestrator = new Orchestrator(makeDclMap(), { speedMps: 1 });
  const nowMs = 1000;
  const robots = [
    { robotId: 'R1', nodeId: 'A', status: 'online' },
    { robotId: 'R2', nodeId: 'B', status: 'online' }
  ];
  const tasks = [
    { taskId: 'T1', status: 'created', fromNodeId: 'A', toNodeId: 'B', priority: 1 },
    { taskId: 'T2', status: 'created', fromNodeId: 'B', toNodeId: 'A', priority: 1 }
  ];

  const decision1 = orchestrator.step({ nowMs, robots, tasks, reservations: [] });
  assert.equal(decision1.commands.length, 1);
  assert.equal(decision1.holds.length, 1);
  assert.ok(['R1', 'R2'].includes(decision1.holds[0].robotId));

  const tasksNext = decision1.tasks;
  const decision2 = orchestrator.step({
    nowMs: nowMs + 6000,
    robots: [
      { robotId: 'R1', nodeId: 'B', status: 'online' },
      { robotId: 'R2', nodeId: 'B', status: 'online' }
    ],
    tasks: tasksNext,
    reservations: []
  });

  assert.ok(decision2.commands.length >= 1);
  const hasR2 = decision2.commands.some((cmd) => cmd.robotId === 'R2');
  assert.ok(hasR2, 'expected R2 to receive command after reservation expired');
});
