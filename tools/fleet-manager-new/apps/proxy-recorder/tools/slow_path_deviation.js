#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

function usage() {
  console.log('Usage: slow_path_deviation.js --state-file <path> [--api 11100]');
  console.log('   or: slow_path_deviation.js --session-dir <path> [--api 11100]');
}

function parseArgs(argv) {
  const args = { api: 11100 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--state-file') {
      args.stateFile = argv[i + 1];
      i += 1;
    } else if (arg === '--session-dir') {
      args.sessionDir = argv[i + 1];
      i += 1;
    } else if (arg === '--api') {
      args.api = Number(argv[i + 1]);
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else {
      args.unknown = arg;
    }
  }
  return args;
}

function findLargestStateFile(sessionDir) {
  const stateDir = path.join(sessionDir, 'tcp', 'state');
  if (!fs.existsSync(stateDir)) {
    throw new Error(`state dir not found: ${stateDir}`);
  }
  const files = fs.readdirSync(stateDir)
    .filter((name) => name.includes('frames_') && name.endsWith('.jsonl'))
    .map((name) => {
      const full = path.join(stateDir, name);
      const stat = fs.statSync(full);
      return { name, full, size: stat.size };
    })
    .sort((a, b) => b.size - a.size);
  if (!files.length) {
    throw new Error(`no state frame logs in ${stateDir}`);
  }
  return files[0].full;
}

function distPointToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) {
    return Math.hypot(px - ax, py - ay);
  }
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) {
    return Math.hypot(px - bx, py - by);
  }
  const t = c1 / c2;
  const projX = ax + t * vx;
  const projY = ay + t * vy;
  return Math.hypot(px - projX, py - projY);
}

function distPointToPolyline(px, py, points) {
  if (points.length === 0) return null;
  if (points.length === 1) {
    const [ax, ay] = points[0];
    return Math.hypot(px - ax, py - ay);
  }
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    const d = distPointToSegment(px, py, ax, ay, bx, by);
    if (d < best) best = d;
  }
  return best;
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const t = idx - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
}

function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.unknown || (!args.stateFile && !args.sessionDir)) {
    if (args.unknown) console.error(`unknown arg: ${args.unknown}`);
    usage();
    process.exit(args.unknown ? 1 : 0);
  }

  const stateFile = args.stateFile || findLargestStateFile(args.sessionDir);
  if (!fs.existsSync(stateFile)) {
    throw new Error(`state file not found: ${stateFile}`);
  }

  const perFrame = [];
  const allDists = [];
  let framesWithSlow = 0;
  let framesWithPath = 0;
  let framesWithBoth = 0;
  let slowPointsTotal = 0;
  let pathPointsTotal = 0;
  let slowWithEmptyPath = 0;

  const rl = readline.createInterface({
    input: fs.createReadStream(stateFile, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch (err) {
      continue;
    }
    const apiNo = obj?.header?.apiNo;
    if (apiNo !== args.api) continue;
    const payload = obj.json;
    if (!payload) continue;

    const slowPoints = payload?.slow_path?.point;
    const pathPointsRaw = payload?.path;
    const slowIsArray = Array.isArray(slowPoints);
    const pathIsArray = Array.isArray(pathPointsRaw);

    if (slowIsArray) framesWithSlow += 1;
    if (pathIsArray) framesWithPath += 1;

    if (!slowIsArray || slowPoints.length === 0) continue;
    if (!pathIsArray || pathPointsRaw.length === 0) {
      slowWithEmptyPath += 1;
      continue;
    }

    const pathPoints = pathPointsRaw
      .map((entry) => (Array.isArray(entry) ? entry : null))
      .filter((entry) => entry && entry.length >= 2)
      .map((entry) => [Number(entry[0]), Number(entry[1])]);

    if (!pathPoints.length) {
      slowWithEmptyPath += 1;
      continue;
    }

    framesWithBoth += 1;
    slowPointsTotal += slowPoints.length;
    pathPointsTotal += pathPoints.length;

    const distances = [];
    for (const pt of slowPoints) {
      if (!pt || typeof pt.x !== 'number' || typeof pt.y !== 'number') continue;
      const d = distPointToPolyline(pt.x, pt.y, pathPoints);
      if (d != null) distances.push(d);
    }

    if (!distances.length) continue;
    const maxDist = Math.max(...distances);
    const meanDist = mean(distances);
    allDists.push(...distances);
    perFrame.push({
      tsMs: obj.tsMs,
      slowCount: slowPoints.length,
      pathCount: pathPoints.length,
      maxDist,
      meanDist,
    });
  }

  const maxDist = allDists.length ? Math.max(...allDists) : null;
  const p95 = percentile(allDists, 0.95);
  const p50 = percentile(allDists, 0.5);
  const avg = mean(allDists);

  const topFrames = perFrame
    .slice()
    .sort((a, b) => b.maxDist - a.maxDist)
    .slice(0, 5);

  console.log(`state file: ${stateFile}`);
  console.log(`api: ${args.api}`);
  console.log(`frames with slow_path field: ${framesWithSlow}`);
  console.log(`frames with path field: ${framesWithPath}`);
  console.log(`frames with slow_path+path (non-empty): ${framesWithBoth}`);
  console.log(`frames with slow_path but empty path: ${slowWithEmptyPath}`);
  console.log(`avg slow_path points per frame: ${framesWithBoth ? (slowPointsTotal / framesWithBoth).toFixed(2) : 'n/a'}`);
  console.log(`avg path points per frame: ${framesWithBoth ? (pathPointsTotal / framesWithBoth).toFixed(2) : 'n/a'}`);
  if (!allDists.length) {
    console.log('no distance samples collected');
    return;
  }
  console.log(`distance stats (m): max=${maxDist.toFixed(4)} p95=${p95.toFixed(4)} median=${p50.toFixed(4)} mean=${avg.toFixed(4)}`);
  console.log('top frames by max deviation:');
  for (const frame of topFrames) {
    console.log(`  tsMs=${frame.tsMs} max=${frame.maxDist.toFixed(4)} mean=${frame.meanDist.toFixed(4)} slowPoints=${frame.slowCount} pathPoints=${frame.pathCount}`);
  }
}

main().catch((err) => {
  console.error(err?.stack || err);
  process.exit(1);
});
