const { test } = require('node:test');
const assert = require('node:assert/strict');
const { encodeFrame, RbkParser, responseApi, API, START_MARK, VERSION, HEADER_LEN } = require('../rbk');

test('encodeFrame + RbkParser roundtrip', () => {
  const parser = new RbkParser();
  const seq = 42;
  const apiNo = API.robot_task_gotarget_req;
  const payload = { id: 'LM1' };
  const frame = encodeFrame(seq, apiNo, payload);

  const chunks = [frame.slice(0, 8), frame.slice(8)];
  let messages = [];
  chunks.forEach((chunk) => {
    messages = messages.concat(parser.push(chunk));
  });

  assert.equal(messages.length, 1);
  assert.equal(messages[0].seq, seq);
  assert.equal(messages[0].apiNo, apiNo);
  assert.deepEqual(messages[0].payload, payload);
});

test('responseApi adds RESPONSE_OFFSET', () => {
  const apiNo = API.robot_task_gotarget_req;
  assert.equal(responseApi(apiNo), apiNo + 10000);
});

test('parser resyncs after junk bytes', () => {
  const parser = new RbkParser({ reportErrors: true });
  const frame = encodeFrame(1, API.robot_status_loc_req, { ok: true });
  const junk = Buffer.from([0x00, 0x01, 0x02, 0x03]);

  const messages = parser.push(Buffer.concat([junk, frame]));
  const parsed = messages.find((msg) => msg.apiNo === API.robot_status_loc_req);
  assert.ok(parsed);
  assert.deepEqual(parsed.payload, { ok: true });
});

test('parser respects jsonSizeHeader with binary tail', () => {
  const seq = 7;
  const apiNo = API.robot_status_loc_req;
  const payload = { ok: true };
  const json = Buffer.from(JSON.stringify(payload), 'utf8');
  const binary = Buffer.from([0x01, 0x02, 0x03]);
  const body = Buffer.concat([json, binary]);
  const buffer = Buffer.alloc(HEADER_LEN + body.length);
  const reserved = Buffer.alloc(6, 0);
  reserved[2] = (json.length >> 8) & 0xff;
  reserved[3] = json.length & 0xff;

  buffer.writeUInt8(START_MARK, 0);
  buffer.writeUInt8(VERSION, 1);
  buffer.writeUInt16BE(seq & 0xffff, 2);
  buffer.writeUInt32BE(body.length, 4);
  buffer.writeUInt16BE(apiNo & 0xffff, 8);
  reserved.copy(buffer, 10);
  body.copy(buffer, HEADER_LEN);

  const parser = new RbkParser();
  const messages = parser.push(buffer);
  assert.equal(messages.length, 1);
  assert.deepEqual(messages[0].payload, payload);
  assert.equal(messages[0].binary.length, binary.length);
});
