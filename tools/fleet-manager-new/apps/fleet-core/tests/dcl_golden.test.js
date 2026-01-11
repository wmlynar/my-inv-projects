const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Orchestrator } = require('../orchestrator/core');
const { createMemoryLogSink } = require('../orchestrator/log_sink');
const { makeDclMap } = require('./fixtures/dcl_map');

test('golden scenario stays deterministic', () => {
  const goldenPath = path.resolve(__dirname, 'golden', 'dcl_single_lane.jsonl');
  const goldenLines = fs.readFileSync(goldenPath, 'utf8').trim().split('\n');
  const goldenRecords = goldenLines.map((line) => JSON.parse(line));

  const sink = createMemoryLogSink();
  const orchestrator = new Orchestrator(makeDclMap(), { logSink: sink });
  orchestrator.step({
    nowMs: 1000,
    robots: [{ robotId: 'R1', nodeId: 'A', status: 'online' }],
    tasks: [{ taskId: 'T1', status: 'created', fromNodeId: 'A', toNodeId: 'B', priority: 1 }],
    reservations: []
  });

  const normalized = sink.records.map((record) => JSON.parse(JSON.stringify(record)));
  assert.deepEqual(normalized, goldenRecords);
});
