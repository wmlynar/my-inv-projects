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

function run() {
  const lockTimeoutMs = 200;
  const policy = new EdgeLockPolicy({ lockTimeoutMs, allowSameDirection: true });
  const statusMap = {
    'RB-01': { current_station: 'N1' },
    'RB-02': { current_station: 'N2' }
  };

  const allow = policy.allowDispatch({ robotId: 'RB-01', targetId: 'N2', graph, statusMap });
  assertOk(allow.ok, 'expected RB-01 dispatch to reserve');
  assertOk(policy.edgeLocks.size > 0, 'expected edge lock to be created');

  const now = Date.now();
  policy.onTick({
    now: now + lockTimeoutMs + 20,
    tasks: [],
    pendingActions: new Map([['RB-01', { type: 'go_target' }]])
  });
  assertOk(policy.edgeLocks.size > 0, 'expected lock refresh while pending action exists');

  policy.onTick({
    now: now + lockTimeoutMs * 2 + 60,
    tasks: [],
    pendingActions: new Map()
  });
  assertOk(policy.edgeLocks.size === 0, 'expected lock to expire without activity');

  console.log('E2E ok: edge_lock refresh while pending covered.');
}

try {
  run();
} catch (err) {
  console.error(`E2E failed: ${err.message}`);
  process.exit(1);
}
