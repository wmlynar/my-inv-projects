const path = require('path');

const { loadMapGraphLight } = require('@fleet-manager/core-graph');
const { EdgeLockPolicy } = require('../lib/edge_lock_policy');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const testDataDir = path.resolve(repoRoot, 'apps', 'task-manager', 'testdata');
const graphPath = process.env.E2E_GRAPH_PATH || path.resolve(testDataDir, 'graph-direction.json');
const graph = loadMapGraphLight(graphPath);

function edgeGroupKey(a, b) {
  return a < b ? `${a}<->${b}` : `${b}<->${a}`;
}

function assertOk(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  const policy = new EdgeLockPolicy({ lockTimeoutMs: 3000, allowSameDirection: true });
  const statusMap = {
    'RB-01': { current_station: 'N1' },
    'RB-02': { current_station: 'N2' }
  };

  const allowForward = policy.allowDispatch({
    robotId: 'RB-01',
    targetId: 'N3',
    graph,
    statusMap
  });
  assertOk(allowForward.ok, 'expected forward dispatch on directed edges to succeed');

  const lock12 = policy.edgeLocks.get(edgeGroupKey('N1', 'N2'));
  const lock23 = policy.edgeLocks.get(edgeGroupKey('N2', 'N3'));
  assertOk(lock12 && lock12.edgeKey === 'N1->N2', 'expected N1->N2 edgeKey lock');
  assertOk(lock23 && lock23.edgeKey === 'N2->N3', 'expected N2->N3 edgeKey lock');

  const allowReverse = policy.allowDispatch({
    robotId: 'RB-02',
    targetId: 'N1',
    graph,
    statusMap
  });
  assertOk(allowReverse.ok, 'expected reverse dispatch to skip locking without a path');
  assertOk(lock12.robots.has('RB-01'), 'expected forward lock to remain held by RB-01');
  const rb2Locks = policy.robotLocks.get('RB-02');
  assertOk(!rb2Locks || rb2Locks.size === 0, 'expected no locks for reverse dispatch');

  console.log('E2E ok: edge_lock respects directed edges in path locking.');
}

try {
  run();
} catch (err) {
  console.error(`E2E failed: ${err.message}`);
  process.exit(1);
}
