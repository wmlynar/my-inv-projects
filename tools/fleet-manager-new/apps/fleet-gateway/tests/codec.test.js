const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateCommand, normalizeStatus } = require('../lib/codec');

test('codec.validateCommand_goTarget_ok', () => {
  const result = validateCommand({
    type: 'goTarget',
    payload: { targetRef: { nodeId: 'AP1' } }
  });
  assert.equal(result.ok, true);
});

test('codec.validateCommand_forkHeight_requires_number', () => {
  const result = validateCommand({
    type: 'forkHeight',
    payload: { toHeightM: 'x' }
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'toHeightM');
});

test('codec.validateCommand_stop_ok', () => {
  const result = validateCommand({ type: 'stop' });
  assert.equal(result.ok, true);
});

test('codec.validateCommand_unknown_reject', () => {
  const result = validateCommand({ type: 'fly' });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'type');
});

test('codec.normalizeStatus_minimal', () => {
  const normalized = normalizeStatus({
    nodeId: 'LM1',
    pose: { x: 1, y: 2, angle: 0 }
  });
  assert.equal(normalized.nodeId, 'LM1');
  assert.equal(normalized.pose.x, 1);
  assert.equal(normalized.pose.y, 2);
  assert.equal(normalized.pose.angle, 0);
});
