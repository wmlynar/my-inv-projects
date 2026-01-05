const path = require('path');

const { loadMapGraphLight } = require('@fleet-manager/core-graph');
const { EdgeLockPolicy } = require('../lib/edge_lock_policy');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const testDataDir = path.resolve(repoRoot, 'apps', 'task-manager', 'testdata');
const graphPath = process.env.E2E_GRAPH_PATH || path.resolve(testDataDir, 'graph-direction.json');
const graph = loadMapGraphLight(graphPath);

function assertOk(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  const policy = new EdgeLockPolicy({ lockTimeoutMs: 3000, allowSameDirection: false });
  const statusMap = {
    'RB-01': { current_station: 'N1' },
    'RB-02': { current_station: 'N1' }
  };

  const first = policy.allowDispatch({ robotId: 'RB-01', targetId: 'N3', graph, statusMap });
  assertOk(first.ok, 'expected RB-01 dispatch to reserve');

  const second = policy.allowDispatch({ robotId: 'RB-02', targetId: 'N2', graph, statusMap });
  assertOk(!second.ok, 'expected RB-02 blocked when same-direction sharing disabled');

  console.log('E2E ok: allowSameDirection=false blocks same-direction sharing.');
}

try {
  run();
} catch (err) {
  console.error(`E2E failed: ${err.message}`);
  process.exit(1);
}
