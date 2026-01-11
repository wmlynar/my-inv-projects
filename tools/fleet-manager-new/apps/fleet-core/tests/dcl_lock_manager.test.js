const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildMapIndex } = require('../orchestrator/map_index');
const { lockManagerTick } = require('../orchestrator/lock_manager_dcl');
const { makeDclMap } = require('./fixtures/dcl_map');

test('lock manager grants one robot on single lane conflict', () => {
  const mapIndex = buildMapIndex(makeDclMap());
  const requests = [
    {
      robotId: 'R1',
      desiredCells: ['C:A-B#i=0#dir=A_TO_B', 'C:A-B#i=1#dir=A_TO_B'],
      desiredCorridorDirs: [{ corridorId: 'C:A-B', dir: 'A_TO_B' }],
      desiredNodeStopZones: [],
      occupiedCells: []
    },
    {
      robotId: 'R2',
      desiredCells: ['C:A-B#i=0#dir=B_TO_A', 'C:A-B#i=1#dir=B_TO_A'],
      desiredCorridorDirs: [{ corridorId: 'C:A-B', dir: 'B_TO_A' }],
      desiredNodeStopZones: [],
      occupiedCells: []
    }
  ];

  const result = lockManagerTick({ requests, mapIndex });
  assert.equal(result.grants.length, 2);
  const r1 = result.grants.find((entry) => entry.robotId === 'R1');
  const r2 = result.grants.find((entry) => entry.robotId === 'R2');
  assert.ok(r1);
  assert.ok(r2);

  const grantedR1 = r1.grantedCells.length > 0;
  const grantedR2 = r2.grantedCells.length > 0;
  assert.notEqual(grantedR1, grantedR2);
});

test('lock manager keeps occupied cells granted', () => {
  const mapIndex = buildMapIndex(makeDclMap());
  const result = lockManagerTick({
    requests: [
      {
        robotId: 'R1',
        desiredCells: ['C:A-B#i=0#dir=A_TO_B'],
        desiredCorridorDirs: [{ corridorId: 'C:A-B', dir: 'A_TO_B' }],
        desiredNodeStopZones: [],
        occupiedCells: ['C:A-B#i=0#dir=A_TO_B']
      }
    ],
    mapIndex
  });

  const grant = result.grants[0];
  assert.ok(grant.grantedCells.includes('C:A-B#i=0#dir=A_TO_B'));
});
