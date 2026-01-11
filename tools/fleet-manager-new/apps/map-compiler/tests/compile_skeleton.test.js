const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const CLI_PATH = path.resolve(__dirname, '..', 'cli', 'cli.js');
const FIXTURE_PATH = path.resolve(__dirname, 'fixtures', 'basic.smap');
const ROBOT_PROFILE_PATH = path.resolve(__dirname, 'fixtures', 'robot_profile.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

test('compile writes artifacts from smap for visualizer', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'map-compiler-'));
  const smapPath = path.join(tempRoot, 'input.smap');
  const outDir = path.join(tempRoot, 'out');
  fs.copyFileSync(FIXTURE_PATH, smapPath);

  execFileSync(
    'node',
    [
      CLI_PATH,
      'compile',
      '--smap',
      smapPath,
      '--out-dir',
      outDir,
      '--robot-profile',
      ROBOT_PROFILE_PATH
    ],
    {
      stdio: 'ignore',
      env: { ...process.env }
    }
  );

  const sceneGraphPath = path.join(outDir, 'sceneGraph.json');
  const compiledMapPath = path.join(outDir, 'compiledMap.json');
  const metaPath = path.join(outDir, 'meta.json');

  assert.ok(fs.existsSync(sceneGraphPath), 'sceneGraph.json is missing');
  assert.ok(fs.existsSync(compiledMapPath), 'compiledMap.json is missing');
  assert.ok(fs.existsSync(metaPath), 'meta.json is missing');

  const sceneGraph = readJson(sceneGraphPath);
  assert.ok(Array.isArray(sceneGraph.nodes), 'sceneGraph.nodes missing');
  assert.ok(Array.isArray(sceneGraph.edges), 'sceneGraph.edges missing');
  assert.ok(sceneGraph.nodes.length >= 2, 'sceneGraph.nodes should have at least 2 items');
  assert.ok(sceneGraph.edges.length >= 1, 'sceneGraph.edges should have at least 1 item');

  const nodeIds = sceneGraph.nodes.map((node) => node.nodeId);
  assert.ok(nodeIds.includes('LM1'));
  assert.ok(nodeIds.includes('AP1'));

  const edgeIds = sceneGraph.edges.map((edge) => edge.edgeId);
  assert.ok(edgeIds.includes('LM1-AP1'));

  const edge = sceneGraph.edges[0];
  assert.equal(edge.className, 'DegenerateBezier');
  assert.ok(edge.p0 && edge.p3, 'edge points missing');
  assert.ok(Number.isFinite(edge.lengthM) && edge.lengthM > 0, 'edge lengthM invalid');

  const compiledMap = readJson(compiledMapPath);
  assert.ok(compiledMap.compiledMapVersion, 'compiledMapVersion missing');
  assert.ok(Array.isArray(compiledMap.corridors), 'compiledMap.corridors missing');
  assert.ok(Array.isArray(compiledMap.cells), 'compiledMap.cells missing');
  assert.equal(compiledMap.corridors.length, 1);
  assert.ok(compiledMap.cells.length > 0, 'compiledMap.cells should not be empty');

  const corridor = compiledMap.corridors[0];
  const expectedA = ['LM1', 'AP1'].sort()[0];
  const expectedB = expectedA === 'LM1' ? 'AP1' : 'LM1';
  const corridorPrefix = `C:${expectedA}\u2192${expectedB}:`;
  assert.equal(corridor.aNodeId, expectedA);
  assert.equal(corridor.bNodeId, expectedB);
  assert.ok(corridor.corridorId.startsWith(corridorPrefix));
  assert.ok(/^[0-9a-f]{8}$/.test(corridor.corridorId.slice(corridorPrefix.length)));
  assert.ok(Number.isFinite(corridor.lengthM) && corridor.lengthM > 0);
  assert.ok(Math.abs(corridor.lengthM - 2) < 0.05);
  assert.equal(corridor.segments.length, 1);
  assert.equal(corridor.segments[0].edgeId, 'LM1-AP1');
  assert.equal(corridor.segments[0].corridorS0M, 0);
  assert.ok(Math.abs(corridor.segments[0].corridorS1M - 2) < 0.05);

  const meta = readJson(metaPath);
  assert.equal(meta.source, smapPath);
  assert.ok(Number.isFinite(meta.compiledTsMs), 'meta.compiledTsMs missing');
});
