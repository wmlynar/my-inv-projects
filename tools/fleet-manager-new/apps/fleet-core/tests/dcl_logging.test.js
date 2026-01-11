const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { Orchestrator } = require('../orchestrator/core');
const { createMemoryLogSink, createJsonlSink } = require('../orchestrator/log_sink');
const { replayRecords, replayJsonl } = require('../orchestrator/replay_runner');
const { makeDclMap } = require('./fixtures/dcl_map');

test('log sink captures tick records', () => {
  const sink = createMemoryLogSink();
  const orchestrator = new Orchestrator(makeDclMap(), { logSink: sink });

  orchestrator.step({
    nowMs: 1000,
    robots: [{ robotId: 'R1', nodeId: 'A', status: 'online' }],
    tasks: [{ taskId: 'T1', status: 'created', fromNodeId: 'A', toNodeId: 'B', priority: 1 }],
    reservations: []
  });

  assert.equal(sink.records.length, 1);
  assert.ok(sink.records[0].locks);
  assert.ok(Array.isArray(sink.records[0].requests));
});

test('replayJsonl replays tick records from file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dcl-log-'));
  const filePath = path.join(dir, 'ticks.jsonl');
  const sink = createJsonlSink(filePath);
  const orchestrator = new Orchestrator(makeDclMap(), { logSink: sink });

  orchestrator.step({
    nowMs: 2000,
    robots: [{ robotId: 'R1', nodeId: 'A', status: 'online' }],
    tasks: [{ taskId: 'T2', status: 'created', fromNodeId: 'A', toNodeId: 'B', priority: 1 }],
    reservations: []
  });

  const replayed = [];
  replayJsonl(filePath, (record) => replayed.push(record));
  assert.equal(replayed.length, 1);

  const inMemory = [];
  replayRecords(replayed, (record) => inMemory.push(record));
  assert.equal(inMemory.length, 1);
});
