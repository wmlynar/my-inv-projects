const path = require('path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { parseSmap } = require('../lib/smap_parser');
const { buildCompiledMap } = require('../lib/compiler');

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'basic.smap');
const ROBOT_PROFILE_PATH = path.join(__dirname, 'fixtures', 'robot_profile.json');

function approxEqual(actual, expected, tolerance = 0.05) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ~= ${expected}`);
}

test('buildCompiledMap builds cells along corridor', () => {
  const sceneGraph = parseSmap(FIXTURE_PATH);
  const profile = JSON.parse(fs.readFileSync(ROBOT_PROFILE_PATH, 'utf8'));
  const compiledMap = buildCompiledMap(sceneGraph, {
    smapPath: FIXTURE_PATH,
    robotModel: profile.model
  });

  const corridor = compiledMap.corridors[0];
  const cells = compiledMap.cells
    .filter((cell) => cell.corridorId === corridor.corridorId)
    .sort((a, b) => a.corridorS0M - b.corridorS0M);
  assert.equal(cells.length, 4);
  const dirSet = new Set(cells.map((cell) => cell.dir));
  assert.equal(dirSet.size, 1);
  assert.ok(dirSet.has('B_TO_A'));

  approxEqual(cells[0].corridorS0M, 0);
  approxEqual(cells[0].corridorS1M, 0.5);
  approxEqual(cells[3].corridorS0M, 1.5);
  approxEqual(cells[3].corridorS1M, 2.0);

  const rect = cells[0].sweptShape.rects[0];
  assert.equal(cells[0].sweptShape.kind, 'multiRect');
  assert.ok(cells[0].sweptShape.rects.length >= 2);
  approxEqual(rect.cyM, 0);
  assert.ok(Math.abs(rect.angleRad) < 0.05);
  approxEqual(rect.hxM, 1.0);
  approxEqual(rect.hyM, 0.5);
});
