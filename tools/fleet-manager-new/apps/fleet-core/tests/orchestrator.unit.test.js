const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateRobot,
  validateTask,
  validateCorridorSegment
} = require('../orchestrator/model');
const { buildGraph, planRoute } = require('../orchestrator/graph');
const { buildMapIndex } = require('../orchestrator/map_index');
const { lockManagerTick } = require('../orchestrator/lock_manager_dcl');
const { buildCommandForStep } = require('../orchestrator/adapter');

function makeCompiledMap() {
  const corridorAB = 'C:A-B';
  const cells = [
    {
      cellId: `${corridorAB}#i=0#dir=A_TO_B`,
      corridorId: corridorAB,
      dir: 'A_TO_B',
      corridorS0M: 0,
      corridorS1M: 1,
      spans: [{ edgeId: 'A-B', edgeS0M: 0, edgeS1M: 1 }],
      conflictSet: [`${corridorAB}#i=0#dir=A_TO_B`, `${corridorAB}#i=0#dir=B_TO_A`]
    },
    {
      cellId: `${corridorAB}#i=0#dir=B_TO_A`,
      corridorId: corridorAB,
      dir: 'B_TO_A',
      corridorS0M: 0,
      corridorS1M: 1,
      spans: [{ edgeId: 'A-B', edgeS0M: 0, edgeS1M: 1 }],
      conflictSet: [`${corridorAB}#i=0#dir=A_TO_B`, `${corridorAB}#i=0#dir=B_TO_A`]
    }
  ];

  return {
    nodes: [
      { nodeId: 'A', pos: { xM: 0, yM: 0 } },
      { nodeId: 'B', pos: { xM: 5, yM: 0 } },
      { nodeId: 'C', pos: { xM: 8, yM: 0 } },
      { nodeId: 'D', pos: { xM: 5, yM: 4 } }
    ],
    edges: [
      {
        edgeId: 'A-B',
        startNodeId: 'A',
        endNodeId: 'B',
        props: { direction: 1 },
        lengthM: 5
      },
      {
        edgeId: 'B-C',
        startNodeId: 'B',
        endNodeId: 'C',
        props: { direction: 0 },
        lengthM: 3
      },
      {
        edgeId: 'B-D',
        startNodeId: 'B',
        endNodeId: 'D',
        props: { direction: 0 },
        lengthM: 4
      }
    ],
    corridors: [
      {
        corridorId: 'C:A-B',
        aNodeId: 'A',
        bNodeId: 'B',
        lengthM: 5,
        singleLane: true,
        segments: [{ edgeId: 'A-B', corridorS0M: 0, corridorS1M: 5, aligned: true }]
      },
      {
        corridorId: 'C:B-C',
        aNodeId: 'B',
        bNodeId: 'C',
        lengthM: 3,
        singleLane: false,
        segments: [{ edgeId: 'B-C', corridorS0M: 0, corridorS1M: 3, aligned: true }]
      },
      {
        corridorId: 'C:B-D',
        aNodeId: 'B',
        bNodeId: 'D',
        lengthM: 4,
        singleLane: true,
        segments: [{ edgeId: 'B-D', corridorS0M: 0, corridorS1M: 4, aligned: true }]
      }
    ],
    cells
  };
}

test('model validation accepts valid entries', () => {
  assert.ok(validateRobot({ robotId: 'R1', nodeId: 'A', status: 'online' }).ok);
  assert.ok(
    validateTask({ taskId: 'T1', status: 'created', fromNodeId: 'A', toNodeId: 'B' }).ok
  );
  assert.ok(
    validateCorridorSegment({
      corridorId: 'C:A-B',
      fromNodeId: 'A',
      toNodeId: 'B',
      lengthM: 5
    }).ok
  );
});

test('graph builder respects direction flags', () => {
  const graph = buildGraph(makeCompiledMap());
  const neighborsA = graph.adjacency.get('A') || [];
  const neighborsB = graph.adjacency.get('B') || [];
  assert.ok(neighborsA.some((entry) => entry.to === 'B'));
  assert.ok(!neighborsB.some((entry) => entry.to === 'A'));
});

test('planner finds shortest path and blocks invalid direction', () => {
  const graph = buildGraph(makeCompiledMap());
  const route = planRoute(graph, 'A', 'C');
  assert.ok(route);
  assert.deepEqual(route.nodes, ['A', 'B', 'C']);
  assert.equal(route.lengthM, 8);
  const back = planRoute(graph, 'C', 'A');
  assert.equal(back, null);
});

test('lock manager denies conflicting cells on single lane', () => {
  const mapIndex = buildMapIndex(makeCompiledMap());
  const requests = [
    {
      robotId: 'R1',
      desiredCells: ['C:A-B#i=0#dir=A_TO_B'],
      desiredCorridorDirs: [{ corridorId: 'C:A-B', dir: 'A_TO_B' }],
      desiredNodeStopZones: [],
      occupiedCells: []
    },
    {
      robotId: 'R2',
      desiredCells: ['C:A-B#i=0#dir=B_TO_A'],
      desiredCorridorDirs: [{ corridorId: 'C:A-B', dir: 'B_TO_A' }],
      desiredNodeStopZones: [],
      occupiedCells: []
    }
  ];
  const result = lockManagerTick({ requests, mapIndex });
  const r1 = result.grants.find((entry) => entry.robotId === 'R1');
  const r2 = result.grants.find((entry) => entry.robotId === 'R2');
  assert.ok(r1);
  assert.ok(r2);
  assert.notEqual(r1.grantedCells.length > 0, r2.grantedCells.length > 0);
});

test('adapter builds goTarget and forkHeight commands', () => {
  const robot = { robotId: 'R1' };
  const moveCmd = buildCommandForStep(robot, {
    type: 'moveTo',
    targetRef: { nodeId: 'A' }
  });
  assert.equal(moveCmd.type, 'goTarget');
  assert.equal(moveCmd.payload.targetRef.nodeId, 'A');

  const forkCmd = buildCommandForStep(robot, {
    type: 'forkHeight',
    params: { toHeightM: 1.2 }
  });
  assert.equal(forkCmd.type, 'forkHeight');
  assert.equal(forkCmd.payload.toHeightM, 1.2);
});
