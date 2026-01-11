const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildGraph } = require('../orchestrator/graph');
const { buildRoutePlan } = require('../orchestrator/route_plan');
const { estimateProgress } = require('../orchestrator/progress');
const { makeDclMap } = require('./fixtures/dcl_map');

test('buildRoutePlan builds corridor segments with routeS', () => {
  const graph = buildGraph(makeDclMap());
  const plan = buildRoutePlan(graph, 'A', 'C', { robotId: 'R1' });

  assert.ok(plan);
  assert.equal(plan.routeLengthM, 4);
  assert.deepEqual(plan.nodes, ['A', 'B', 'C']);
  assert.equal(plan.corridorSegments.length, 2);
  assert.equal(plan.corridorSegments[0].corridorId, 'C:A-B');
  assert.equal(plan.corridorSegments[0].dir, 'A_TO_B');
  assert.equal(plan.corridorSegments[0].startRouteS, 0);
  assert.equal(plan.corridorSegments[0].endRouteS, 2);
});

test('estimateProgress falls back to nodeId when routeProgress missing', () => {
  const graph = buildGraph(makeDclMap());
  const plan = buildRoutePlan(graph, 'A', 'C', { robotId: 'R1' });

  const progress = estimateProgress({ robot: { robotId: 'R1', nodeId: 'B' }, routePlan: plan });
  assert.equal(progress.routeS, 2);
  assert.equal(progress.reasonCode, 'NONE');
});

test('estimateProgress marks off-route nodes', () => {
  const graph = buildGraph(makeDclMap());
  const plan = buildRoutePlan(graph, 'A', 'C', { robotId: 'R1' });

  const progress = estimateProgress({ robot: { robotId: 'R1', nodeId: 'X' }, routePlan: plan });
  assert.equal(progress.routeS, null);
  assert.equal(progress.reasonCode, 'OFF_ROUTE');
});
