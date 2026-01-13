const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { buildDataset } = require('../lib/log_pipeline');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'robokit-obstacle-'));
}

function writeJsonl(filePath, records) {
  const lines = records.map((record) => JSON.stringify(record));
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function createStateLog(dir, records) {
  const stateDir = path.join(dir, 'tcp', 'state');
  fs.mkdirSync(stateDir, { recursive: true });
  const filePath = path.join(stateDir, 'conn_c0001_frames_000001.jsonl');
  writeJsonl(filePath, records);
  return dir;
}

test('buildDataset extracts trajectory, blocks, nearest, and errors', async () => {
  const dir = makeTempDir();
  createStateLog(dir, [
    {
      tsMs: 1000,
      dir: 's2c',
      header: { apiNo: 11100 },
      json: {
        x: 1,
        y: 2,
        block_x: 5,
        block_y: 6,
        nearest_obstacles: [{ x: 7, y: 8 }],
        errors: [{ code: 123, desc: 'boom' }],
        warnings: [{ code: 9, desc: 'warn' }],
        running_status: 1,
        task_status: 2
      }
    }
  ]);

  const dataset = await buildDataset({ logDir: dir });
  assert.equal(dataset.trajectory.length, 1);
  assert.equal(dataset.blocks.length, 1);
  assert.equal(dataset.nearest.length, 1);
  assert.equal(dataset.errors.length, 1);
});

test('buildDataset ignores frames without x/y', async () => {
  const dir = makeTempDir();
  createStateLog(dir, [
    {
      tsMs: 1000,
      dir: 's2c',
      header: { apiNo: 11100 },
      json: { x: 1 }
    }
  ]);

  const dataset = await buildDataset({ logDir: dir });
  assert.equal(dataset.trajectory.length, 0);
});

test('buildDataset filters out non-11100 frames', async () => {
  const dir = makeTempDir();
  createStateLog(dir, [
    {
      tsMs: 1000,
      dir: 's2c',
      header: { apiNo: 11111 },
      json: { x: 1, y: 1 }
    },
    {
      tsMs: 1100,
      dir: 's2c',
      header: { apiNo: 11100 },
      json: { x: 2, y: 3 }
    }
  ]);

  const dataset = await buildDataset({ logDir: dir });
  assert.equal(dataset.trajectory.length, 1);
  assert.equal(dataset.trajectory[0].x, 2);
  assert.equal(dataset.trajectory[0].y, 3);
});
