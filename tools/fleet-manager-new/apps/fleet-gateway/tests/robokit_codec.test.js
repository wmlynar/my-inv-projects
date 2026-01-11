const { test } = require('node:test');
const assert = require('node:assert/strict');
const { API, encodeCommandFrame, createFrameAssembler } = require('../lib/robokit');

test('robokit.frame_encode_goTarget', () => {
  const frame = encodeCommandFrame(7, {
    type: 'goTarget',
    payload: { targetRef: { nodeId: 'AP1' } }
  });
  const assembler = createFrameAssembler();
  const messages = assembler.push(frame);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].apiNo, API.robot_task_gotarget_req);
  assert.equal(messages[0].payload.id, 'AP1');
});

test('robokit.frame_decode_partial', () => {
  const frame = encodeCommandFrame(12, {
    type: 'goTarget',
    payload: { targetRef: { nodeId: 'AP1' } }
  });
  const assembler = createFrameAssembler();
  const first = assembler.push(frame.slice(0, 8));
  assert.equal(first.length, 0);
  const second = assembler.push(frame.slice(8));
  assert.equal(second.length, 1);
  assert.equal(second[0].apiNo, API.robot_task_gotarget_req);
});
