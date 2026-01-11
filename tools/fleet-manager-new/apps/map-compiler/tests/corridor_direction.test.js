const path = require('path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { parseSmap } = require('../lib/smap_parser');
const { buildCompiledMap } = require('../lib/compiler');

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'conflict.smap');
const ROBOT_PROFILE_PATH = path.join(__dirname, 'fixtures', 'robot_profile.json');
const SANDEN_PATH = path.resolve(__dirname, '..', '..', '..', 'maps', 'sanden_smalll.smap');
const CLI_PATH = path.resolve(__dirname, '..', 'cli', 'cli.js');

function loadRobotModel() {
  const profile = JSON.parse(fs.readFileSync(ROBOT_PROFILE_PATH, 'utf8'));
  return profile.model;
}

function progressAlong(origin, dir, rect) {
  return (rect.pivotXM - origin.xM) * dir.x + (rect.pivotYM - origin.yM) * dir.y;
}

function edgeConnects(edgeId, a, b) {
  return edgeId === `${a}-${b}` || edgeId === `${b}-${a}`;
}

function normalizeAngle(angle) {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

function angleDelta(a, b) {
  return normalizeAngle(b - a);
}

function sampleAnglesByStep(rects, stepM) {
  const samples = [];
  if (!rects.length) return samples;
  let prev = rects[0];
  samples.push(prev.angleRad);
  let acc = 0;
  for (let i = 1; i < rects.length; i += 1) {
    const rect = rects[i];
    const dx = rect.pivotXM - prev.pivotXM;
    const dy = rect.pivotYM - prev.pivotYM;
    const dist = Math.hypot(dx, dy);
    acc += dist;
    if (acc >= stepM) {
      samples.push(rect.angleRad);
      acc -= stepM;
    }
    prev = rect;
  }
  return samples;
}

test('cells move in a consistent direction along each corridor', () => {
  const sceneGraph = parseSmap(FIXTURE_PATH);
  const compiledMap = buildCompiledMap(sceneGraph, {
    smapPath: FIXTURE_PATH,
    robotModel: loadRobotModel()
  });

  const nodeById = new Map(compiledMap.nodes.map((node) => [node.nodeId, node]));
  const eps = 1e-3;

  for (const corridor of compiledMap.corridors) {
    const nodeA = nodeById.get(corridor.aNodeId);
    const nodeB = nodeById.get(corridor.bNodeId);
    assert.ok(nodeA && nodeB, 'corridor endpoints missing');
    const dx = nodeB.pos.xM - nodeA.pos.xM;
    const dy = nodeB.pos.yM - nodeA.pos.yM;
    const len = Math.hypot(dx, dy);
    assert.ok(len > eps, 'corridor length should be positive');
    const baseDir = { x: dx / len, y: dy / len };

    for (const dir of ['A_TO_B', 'B_TO_A']) {
      const cells = compiledMap.cells
        .filter((cell) => cell.corridorId === corridor.corridorId && cell.dir === dir)
        .sort((a, b) =>
          dir === 'A_TO_B' ? a.corridorS0M - b.corridorS0M : b.corridorS0M - a.corridorS0M
        );
      if (!cells.length) continue;

      const travel = dir === 'A_TO_B' ? baseDir : { x: -baseDir.x, y: -baseDir.y };
      const origin = dir === 'A_TO_B' ? nodeA.pos : nodeB.pos;

      let prev = -Infinity;
      for (const cell of cells) {
        const rects = cell.sweptShape?.rects || [];
        assert.ok(rects.length > 0, 'cell sweptShape is empty');
        const first = rects[0];
        const last = rects[rects.length - 1];
        const start = progressAlong(origin, travel, first);
        const end = progressAlong(origin, travel, last);
        assert.ok(end + eps >= start, 'cell moves backward along corridor');
        assert.ok(start + eps >= prev, 'cells are not ordered along corridor');
        prev = start;
      }
    }
  }
});

test('corridor monotonicity is opposite between directions', () => {
  const sceneGraph = {
    nodes: [
      { nodeId: 'A', pos: { xM: 0, yM: 0 } },
      { nodeId: 'B', pos: { xM: 2, yM: 0 } }
    ],
    edges: [
      {
        edgeId: 'A-B',
        startNodeId: 'A',
        endNodeId: 'B',
        p0: { xM: 0, yM: 0 },
        p1: { xM: 0.7, yM: 0 },
        p2: { xM: 1.3, yM: 0 },
        p3: { xM: 2, yM: 0 },
        props: { direction: 0, movestyle: 0 }
      }
    ]
  };

  const compiledMap = buildCompiledMap(sceneGraph, {
    smapPath: 'inline',
    robotModel: loadRobotModel()
  });

  const nodeById = new Map(compiledMap.nodes.map((node) => [node.nodeId, node]));
  const eps = 1e-3;

  for (const corridor of compiledMap.corridors) {
    const nodeA = nodeById.get(corridor.aNodeId);
    const nodeB = nodeById.get(corridor.bNodeId);
    assert.ok(nodeA && nodeB, 'corridor endpoints missing');
    const dx = nodeB.pos.xM - nodeA.pos.xM;
    const dy = nodeB.pos.yM - nodeA.pos.yM;
    const len = Math.hypot(dx, dy);
    assert.ok(len > eps, 'corridor length should be positive');
    const baseDir = { x: dx / len, y: dy / len };

    const cellsA = compiledMap.cells.filter(
      (cell) => cell.corridorId === corridor.corridorId && cell.dir === 'A_TO_B'
    );
    const cellsB = compiledMap.cells.filter(
      (cell) => cell.corridorId === corridor.corridorId && cell.dir === 'B_TO_A'
    );

    assert.ok(cellsA.length > 0, 'missing A_TO_B cells');
    assert.ok(cellsB.length > 0, 'missing B_TO_A cells');

    const deltasA = cellsA.map((cell) => {
      const rects = cell.sweptShape?.rects || [];
      assert.ok(rects.length > 0, 'cell sweptShape is empty');
      const start = progressAlong(nodeA.pos, baseDir, rects[0]);
      const end = progressAlong(nodeA.pos, baseDir, rects[rects.length - 1]);
      return end - start;
    });
    const deltasB = cellsB.map((cell) => {
      const rects = cell.sweptShape?.rects || [];
      assert.ok(rects.length > 0, 'cell sweptShape is empty');
      const start = progressAlong(nodeA.pos, baseDir, rects[0]);
      const end = progressAlong(nodeA.pos, baseDir, rects[rects.length - 1]);
      return end - start;
    });

    assert.ok(deltasA.every((delta) => delta >= -eps), 'A_TO_B is not monotonic increasing');
    assert.ok(deltasB.every((delta) => delta <= eps), 'B_TO_A is not monotonic decreasing');
  }
});

test('cell pivots stay monotonic within each cell', () => {
  const sceneGraph = {
    nodes: [
      { nodeId: 'A', pos: { xM: 0, yM: 0 } },
      { nodeId: 'B', pos: { xM: 2, yM: 0 } },
      { nodeId: 'C', pos: { xM: 4, yM: 0 } }
    ],
    edges: [
      {
        edgeId: 'A-B',
        startNodeId: 'A',
        endNodeId: 'B',
        p0: { xM: 0, yM: 0 },
        p1: { xM: 0.7, yM: 0 },
        p2: { xM: 1.3, yM: 0 },
        p3: { xM: 2, yM: 0 },
        props: { direction: 0, movestyle: 0 }
      },
      {
        edgeId: 'C-B-forward',
        startNodeId: 'C',
        endNodeId: 'B',
        p0: { xM: 4, yM: 0 },
        p1: { xM: 3.4, yM: 0 },
        p2: { xM: 2.6, yM: 0 },
        p3: { xM: 2, yM: 0 },
        props: { direction: 2, movestyle: 0 }
      },
      {
        edgeId: 'B-C-reverse',
        startNodeId: 'B',
        endNodeId: 'C',
        p0: { xM: 2, yM: 0 },
        p1: { xM: 2.6, yM: 0 },
        p2: { xM: 3.4, yM: 0 },
        p3: { xM: 4, yM: 0 },
        props: { direction: 2, movestyle: 0 }
      }
    ]
  };

  const compiledMap = buildCompiledMap(sceneGraph, {
    smapPath: 'inline',
    robotModel: loadRobotModel()
  });

  const nodeById = new Map(compiledMap.nodes.map((node) => [node.nodeId, node]));
  const eps = 1e-4;

  for (const corridor of compiledMap.corridors) {
    const nodeA = nodeById.get(corridor.aNodeId);
    const nodeB = nodeById.get(corridor.bNodeId);
    assert.ok(nodeA && nodeB, 'corridor endpoints missing');
    const dx = nodeB.pos.xM - nodeA.pos.xM;
    const dy = nodeB.pos.yM - nodeA.pos.yM;
    const len = Math.hypot(dx, dy);
    assert.ok(len > eps, 'corridor length should be positive');
    const baseDir = { x: dx / len, y: dy / len };

    for (const dir of ['A_TO_B', 'B_TO_A']) {
      const cells = compiledMap.cells.filter(
        (cell) => cell.corridorId === corridor.corridorId && cell.dir === dir
      );
      if (!cells.length) continue;

      const travel = dir === 'A_TO_B' ? baseDir : { x: -baseDir.x, y: -baseDir.y };
      const origin = dir === 'A_TO_B' ? nodeA.pos : nodeB.pos;

      for (const cell of cells) {
        const rects = cell.sweptShape?.rects || [];
        assert.ok(rects.length > 1, 'cell sweptShape is empty');
        let prev = -Infinity;
        for (const rect of rects) {
          const value = progressAlong(origin, travel, rect);
          assert.ok(value + eps >= prev, 'pivot order reverses within cell');
          prev = value;
        }
      }
    }
  }
});

test('sanden_smalll pivots stay monotonic from LM8 to LM7 and back', () => {
  assert.ok(fs.existsSync(SANDEN_PATH), 'missing sanden_smalll.smap');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'map-compiler-'));
  const outDir = path.join(tempRoot, 'out');
  execFileSync('node', [CLI_PATH, 'compile', '--smap', SANDEN_PATH, '--out-dir', outDir], {
    stdio: 'ignore',
    env: { ...process.env }
  });
  const compiledMap = JSON.parse(
    fs.readFileSync(path.join(outDir, 'compiledMap.json'), 'utf8')
  );

  const corridor = compiledMap.corridors.find((entry) => {
    const edgeIds = (entry.segments || []).map((segment) => segment.edgeId).filter(Boolean);
    const hasLm6Lm7 = edgeIds.some((edgeId) => edgeConnects(edgeId, 'LM6', 'LM7'));
    const hasLm6Lm8 = edgeIds.some((edgeId) => edgeConnects(edgeId, 'LM6', 'LM8'));
    return hasLm6Lm7 && hasLm6Lm8;
  });
  assert.ok(corridor, 'corridor LM8-LM6-LM7 not found');

  const endpoints = new Set([corridor.aNodeId, corridor.bNodeId]);
  assert.ok(endpoints.has('LM7') && endpoints.has('LM8'), 'corridor endpoints mismatch');

  const nodeById = new Map(compiledMap.nodes.map((node) => [node.nodeId, node]));
  const eps = 1e-4;

  for (const dir of ['A_TO_B', 'B_TO_A']) {
    const startId = dir === 'A_TO_B' ? corridor.aNodeId : corridor.bNodeId;
    const endId = dir === 'A_TO_B' ? corridor.bNodeId : corridor.aNodeId;
    const startNode = nodeById.get(startId);
    const endNode = nodeById.get(endId);
    assert.ok(startNode && endNode, 'corridor endpoints missing');

    const dx = endNode.pos.xM - startNode.pos.xM;
    const dy = endNode.pos.yM - startNode.pos.yM;
    const len = Math.hypot(dx, dy);
    assert.ok(len > eps, 'corridor length should be positive');
    const travel = { x: dx / len, y: dy / len };

    const cells = compiledMap.cells
      .filter((cell) => cell.corridorId === corridor.corridorId && cell.dir === dir)
      .sort((a, b) =>
        dir === 'A_TO_B' ? a.corridorS0M - b.corridorS0M : b.corridorS0M - a.corridorS0M
      );
    assert.ok(cells.length > 0, `missing ${dir} cells`);

    let prev = -Infinity;
    const orderedRects = [];
    for (const cell of cells) {
      const rects = cell.sweptShape?.rects || [];
      assert.ok(rects.length > 0, 'cell sweptShape is empty');
      for (const rect of rects) {
        const heading = { x: Math.cos(rect.angleRad), y: Math.sin(rect.angleRad) };
        const dot = heading.x * travel.x + heading.y * travel.y;
        assert.ok(dot >= -0.01, 'pivot heading flips against corridor direction');
        const value = progressAlong(startNode.pos, travel, rect);
        assert.ok(value + eps >= prev, 'pivot direction flips along corridor');
        prev = value;
        if (
          Number.isFinite(rect.pivotXM) &&
          Number.isFinite(rect.pivotYM) &&
          Number.isFinite(rect.angleRad)
        ) {
          orderedRects.push(rect);
        }
      }
    }

    const stepM = 1.0;
    const maxDeltaRad = Math.PI / 6;
    const cosLimit = Math.cos(maxDeltaRad);
    const samples = sampleAnglesByStep(orderedRects, stepM);
    for (let i = 1; i < samples.length; i += 1) {
      const delta = Math.abs(angleDelta(samples[i - 1], samples[i]));
      assert.ok(delta <= maxDeltaRad + 1e-3, 'pivot angle jumps more than 30 degrees');
    }

    for (let i = 0; i < orderedRects.length - 1; i += 1) {
      const curr = orderedRects[i];
      const next = orderedRects[i + 1];
      const dx = next.pivotXM - curr.pivotXM;
      const dy = next.pivotYM - curr.pivotYM;
      const dist = Math.hypot(dx, dy);
      if (dist < 1e-6) continue;
      const heading = { x: Math.cos(curr.angleRad), y: Math.sin(curr.angleRad) };
      const cosAngle = (heading.x * dx + heading.y * dy) / dist;
      assert.ok(cosAngle >= cosLimit - 1e-3, 'pivot heading deviates more than 30 degrees');
    }

    let prevFrontSign = null;
    for (let i = 0; i < orderedRects.length - 1; i += 1) {
      const curr = orderedRects[i];
      const next = orderedRects[i + 1];
      if (
        !Number.isFinite(curr.frontXM) ||
        !Number.isFinite(curr.frontYM) ||
        !Number.isFinite(curr.pivotXM) ||
        !Number.isFinite(curr.pivotYM)
      ) {
        continue;
      }
      const dx = next.pivotXM - curr.pivotXM;
      const dy = next.pivotYM - curr.pivotYM;
      const dist = Math.hypot(dx, dy);
      if (dist < 1e-6) continue;
      const fx = curr.frontXM - curr.pivotXM;
      const fy = curr.frontYM - curr.pivotYM;
      const dot = fx * dx + fy * dy;
      const sign = dot >= 0 ? 1 : -1;
      if (prevFrontSign !== null) {
        assert.equal(sign, prevFrontSign, 'front direction flips along corridor');
      }
      prevFrontSign = sign;
    }
  }
});
