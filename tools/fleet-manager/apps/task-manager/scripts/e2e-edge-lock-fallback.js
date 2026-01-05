const path = require('path');

const { loadMapGraphLight } = require('@fleet-manager/core-graph');
const { EdgeLockPolicy } = require('../lib/edge_lock_policy');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const testDataDir = path.resolve(repoRoot, 'apps', 'task-manager', 'testdata');
const graphPath = process.env.E2E_GRAPH_PATH || path.resolve(testDataDir, 'graph-fallback.json');
const graph = loadMapGraphLight(graphPath);

function assertOk(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runCase(label, statusMap) {
  const policy = new EdgeLockPolicy({ lockTimeoutMs: 3000, allowSameDirection: true });
  const allow = policy.allowDispatch({ robotId: 'RB-01', targetId: 'N2', graph, statusMap });
  assertOk(allow.ok, `${label}: expected RB-01 dispatch to reserve`);

  const blocked = policy.allowDispatch({ robotId: 'RB-02', targetId: 'N1', graph, statusMap });
  assertOk(!blocked.ok, `${label}: expected RB-02 blocked by opposite lock`);
}

function run() {
  runCase('fallback-last-station', {
    'RB-01': { last_station: 'N1' },
    'RB-02': { current_station: 'N2' }
  });

  runCase('fallback-nearest-node', {
    'RB-01': { x: 0.1, y: 0.1 },
    'RB-02': { current_station: 'N2' }
  });

  console.log('E2E ok: edge_lock start-node fallback covered.');
}

try {
  run();
} catch (err) {
  console.error(`E2E failed: ${err.message}`);
  process.exit(1);
}
