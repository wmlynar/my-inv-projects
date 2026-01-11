const path = require('path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { parseSmap } = require('../lib/smap_parser');
const { buildCompiledMap } = require('../lib/compiler');

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'basic.smap');
const ROBOT_PROFILE_PATH = path.join(__dirname, 'fixtures', 'robot_profile.json');

function loadRobotModel() {
  const profile = JSON.parse(fs.readFileSync(ROBOT_PROFILE_PATH, 'utf8'));
  return profile.model;
}

test('buildCompiledMap creates corridors from undirected chains', () => {
  const sceneGraph = parseSmap(FIXTURE_PATH);
  const compiledMap = buildCompiledMap(sceneGraph, {
    smapPath: FIXTURE_PATH,
    robotModel: loadRobotModel()
  });

  assert.equal(compiledMap.corridors.length, 1);
  const corridor = compiledMap.corridors[0];
  const edge = sceneGraph.edges[0];
  const expectedA = ['LM1', 'AP1'].sort()[0];
  const expectedB = expectedA === 'LM1' ? 'AP1' : 'LM1';
  assert.ok(corridor.corridorId.startsWith(`C:${expectedA}\u2192${expectedB}:`));
  assert.equal(corridor.segments[0].edgeId, edge.edgeId);
  assert.ok(Math.abs(corridor.lengthM - edge.lengthM) < 0.05);
});
