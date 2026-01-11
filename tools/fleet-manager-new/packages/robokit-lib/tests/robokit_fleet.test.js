const { test } = require('node:test');
const assert = require('node:assert/strict');
const { RobokitFleet } = require('../robokit_fleet');

test('RobokitFleet add/remove/list is deterministic', () => {
  const fleet = new RobokitFleet();
  const c1 = fleet.addRobot('R1', { host: '127.0.0.1' });
  const c2 = fleet.addRobot('R2', { host: '127.0.0.1' });
  const again = fleet.addRobot('R1', { host: '127.0.0.1' });

  assert.equal(c1, again);
  assert.deepEqual(fleet.listRobots().sort(), ['R1', 'R2']);

  const removed = fleet.removeRobot('R2');
  assert.ok(removed);
  assert.deepEqual(fleet.listRobots(), ['R1']);
});
