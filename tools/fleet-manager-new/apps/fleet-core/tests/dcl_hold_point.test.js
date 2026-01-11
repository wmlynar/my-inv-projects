const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildGraph } = require('../orchestrator/graph');
const { buildRoutePlan } = require('../orchestrator/route_plan');
const { computeHoldPoint } = require('../orchestrator/hold_point');
const { selectRollingTarget } = require('../orchestrator/rtp_controller');
const { makeDclMap } = require('./fixtures/dcl_map');

test('computeHoldPoint uses last granted cell routeS', () => {
  const request = {
    progressRouteS: 0,
    cellRouteS: {
      'C:A-B#i=0#dir=A_TO_B': { s0: 0, s1: 1 },
      'C:A-B#i=1#dir=A_TO_B': { s0: 1, s1: 2 }
    }
  };
  const grant = {
    grantedCells: ['C:A-B#i=0#dir=A_TO_B', 'C:A-B#i=1#dir=A_TO_B']
  };
  const holdPoint = computeHoldPoint({
    request,
    grant,
    stopDistanceM: 0,
    safetyBufferM: 0
  });
  assert.equal(holdPoint, 2);
});

test('selectRollingTarget respects holdPointRouteS', () => {
  const graph = buildGraph(makeDclMap());
  const plan = buildRoutePlan(graph, 'A', 'C', { robotId: 'R1' });

  const target = selectRollingTarget({
    routePlan: plan,
    targetNodeId: 'C',
    holdPointRouteS: 2
  });

  assert.equal(target.targetNodeId, 'B');
  assert.equal(target.targetRouteS, 2);
});
