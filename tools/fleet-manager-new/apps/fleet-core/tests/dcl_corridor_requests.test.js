const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildGraph } = require('../orchestrator/graph');
const { buildRoutePlan } = require('../orchestrator/route_plan');
const { estimateProgress } = require('../orchestrator/progress');
const { buildMapIndex } = require('../orchestrator/map_index');
const { buildCorridorRequest } = require('../orchestrator/corridor_requests');
const { makeDclMap } = require('./fixtures/dcl_map');

test('buildCorridorRequest builds ordered cells with corridor dir token', () => {
  const compiledMap = makeDclMap();
  const mapIndex = buildMapIndex(compiledMap);
  const graph = buildGraph(compiledMap);
  const plan = buildRoutePlan(graph, 'A', 'C', { robotId: 'R1' });
  const progress = estimateProgress({ robot: { robotId: 'R1', nodeId: 'A' }, routePlan: plan });

  const request = buildCorridorRequest({
    robotId: 'R1',
    routePlan: plan,
    progress,
    mapIndex,
    lockLookaheadM: 1.5,
    lockLookbackM: 0,
    targetNodeId: 'B'
  });

  assert.ok(request);
  assert.equal(request.desiredCells.length, 2);
  assert.equal(request.desiredCells[0], 'C:A-B#i=0#dir=A_TO_B');
  assert.equal(request.desiredCells[1], 'C:A-B#i=1#dir=A_TO_B');
  assert.equal(request.desiredCorridorDirs.length, 1);
  assert.equal(request.desiredCorridorDirs[0].corridorId, 'C:A-B');
  assert.equal(request.desiredCorridorDirs[0].dir, 'A_TO_B');
  assert.equal(request.desiredNodeStopZones[0], 'B');
});
