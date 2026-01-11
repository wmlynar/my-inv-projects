const path = require('path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseSmap } = require('../lib/smap_parser');

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'basic.smap');

test('parseSmap builds SceneGraph nodes and edges', () => {
  const sceneGraph = parseSmap(FIXTURE_PATH);

  assert.ok(sceneGraph, 'sceneGraph missing');
  assert.equal(sceneGraph.nodes.length, 2);
  assert.equal(sceneGraph.edges.length, 1);

  const nodeIds = sceneGraph.nodes.map((node) => node.nodeId);
  assert.ok(nodeIds.includes('LM1'));
  assert.ok(nodeIds.includes('AP1'));

  const edge = sceneGraph.edges[0];
  assert.equal(edge.edgeId, 'LM1-AP1');
  assert.equal(edge.className, 'DegenerateBezier');
  assert.equal(edge.startNodeId, 'LM1');
  assert.equal(edge.endNodeId, 'AP1');
  assert.deepEqual(edge.p0, { xM: 0, yM: 0 });
  assert.deepEqual(edge.p3, { xM: 2, yM: 0 });
  assert.ok(Number.isFinite(edge.lengthM) && edge.lengthM > 0);
  assert.ok(Math.abs(edge.lengthM - 2) < 0.05);
  assert.equal(edge.props.direction, 1);
  assert.equal(edge.props.movestyle, 0);
  assert.equal(edge.props.width, 2.5);
});
