const path = require('path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { parseSmap } = require('../lib/smap_parser');
const { buildCompiledMap } = require('../lib/compiler');

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'conflict.smap');
const ROBOT_PROFILE_PATH = path.join(__dirname, 'fixtures', 'robot_profile.json');

test('buildCompiledMap computes symmetric conflictSet with self membership', () => {
  const sceneGraph = parseSmap(FIXTURE_PATH);
  const profile = JSON.parse(fs.readFileSync(ROBOT_PROFILE_PATH, 'utf8'));
  const compiledMap = buildCompiledMap(sceneGraph, {
    smapPath: FIXTURE_PATH,
    robotModel: profile.model
  });
  const cells = compiledMap.cells;

  assert.ok(cells.length > 0, 'cells should not be empty');

  const byId = new Map(cells.map((cell) => [cell.cellId, cell]));
  for (const cell of cells) {
    assert.ok(cell.conflictSet.includes(cell.cellId), 'conflictSet should include self');
    for (const otherId of cell.conflictSet) {
      const other = byId.get(otherId);
      assert.ok(other, `missing cell ${otherId}`);
      assert.ok(other.conflictSet.includes(cell.cellId), 'conflictSet should be symmetric');
    }
  }

  const corridorIds = compiledMap.corridors.map((corridor) => corridor.corridorId);
  assert.equal(corridorIds.length, 2);
  const cellsA = cells.filter((cell) => cell.corridorId === corridorIds[0]);
  const cellsB = cells.filter((cell) => cell.corridorId === corridorIds[1]);
  const cellsBIds = new Set(cellsB.map((cell) => cell.cellId));
  const hasCrossConflict = cellsA.some((cell) =>
    cell.conflictSet.some((otherId) => cellsBIds.has(otherId))
  );
  assert.ok(hasCrossConflict, 'expected conflict between corridors');
});
