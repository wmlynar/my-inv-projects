const path = require('path');

const { loadMapGraphLight } = require('@fleet-manager/core-graph');
const { EdgeLockPolicy } = require('../lib/edge_lock_policy');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const testDataDir = path.resolve(repoRoot, 'apps', 'task-manager', 'testdata');
const graphPath = process.env.E2E_GRAPH_PATH || path.resolve(testDataDir, 'graph-cycle.json');
const graph = loadMapGraphLight(graphPath);

function assertOk(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  const policy = new EdgeLockPolicy({ lockTimeoutMs: 3000, allowSameDirection: true });
  const statusMap = {
    'RB-01': { current_station: 'N1' },
    'RB-02': { current_station: 'N2' },
    'RB-03': { current_station: 'N3' },
    'RB-04': { current_station: 'N2' }
  };

  const allow1 = policy.allowDispatch({ robotId: 'RB-01', targetId: 'N2', graph, statusMap });
  const allow2 = policy.allowDispatch({ robotId: 'RB-02', targetId: 'N3', graph, statusMap });
  const allow3 = policy.allowDispatch({ robotId: 'RB-03', targetId: 'N1', graph, statusMap });
  assertOk(allow1.ok && allow2.ok && allow3.ok, 'expected cycle moves in same direction to succeed');

  const block = policy.allowDispatch({ robotId: 'RB-04', targetId: 'N1', graph, statusMap });
  assertOk(!block.ok, 'expected opposite-direction move to be blocked on a locked edge');

  console.log('E2E ok: edge_lock allows same-direction cycle and blocks opposite direction.');
}

try {
  run();
} catch (err) {
  console.error(`E2E failed: ${err.message}`);
  process.exit(1);
}
