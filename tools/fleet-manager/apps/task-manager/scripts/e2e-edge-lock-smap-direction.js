const path = require('path');

const { loadMapGraphLight } = require('@fleet-manager/core-graph');
const { EdgeLockPolicy } = require('../lib/edge_lock_policy');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const graphPath = process.env.E2E_GRAPH_PATH || path.resolve(repoRoot, 'seer', 'smap', 'maps', '1.smap');
const graph = loadMapGraphLight(graphPath);

function assertOk(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function findDirectedEdge(graphData) {
  const edges = graphData && Array.isArray(graphData.edges) ? graphData.edges : [];
  const edgeKeys = new Set(edges.map((edge) => `${edge.start}->${edge.end}`));
  for (const edge of edges) {
    const rawDirection = edge && edge.props ? edge.props.direction : null;
    const direction = Number.isFinite(Number(rawDirection)) ? Number(rawDirection) : null;
    if (!direction || direction === 0) {
      continue;
    }
    const reverseKey = `${edge.end}->${edge.start}`;
    if (!edgeKeys.has(reverseKey)) {
      return edge;
    }
  }
  return null;
}

function run() {
  assertOk(graph && Array.isArray(graph.nodes) && graph.nodes.length > 0, 'expected smap graph nodes');
  const directedEdge = findDirectedEdge(graph);
  assertOk(directedEdge, 'expected at least one directed edge without reverse in smap');

  const policy = new EdgeLockPolicy({ lockTimeoutMs: 3000, allowSameDirection: true });
  const cache = policy.getGraphCache(graph);
  assertOk(cache && cache.adjacency, 'expected adjacency from smap graph');

  const forwardEdges = cache.adjacency.get(directedEdge.start) || [];
  const reverseEdges = cache.adjacency.get(directedEdge.end) || [];
  assertOk(
    forwardEdges.some((entry) => entry.to === directedEdge.end),
    'expected adjacency to include directed edge'
  );
  assertOk(
    !reverseEdges.some((entry) => entry.to === directedEdge.start),
    'expected adjacency to omit reverse edge for one-way segment'
  );

  const statusMap = { 'RB-01': { current_station: directedEdge.start } };
  const allow = policy.allowDispatch({
    robotId: 'RB-01',
    targetId: directedEdge.end,
    graph,
    statusMap
  });
  assertOk(allow.ok, 'expected dispatch to reserve directed path');
  assertOk(policy.edgeLocks.size > 0, 'expected edge_lock to reserve at least one path segment');

  console.log('E2E ok: smap directed edges honored in edge_lock adjacency.');
}

try {
  run();
} catch (err) {
  console.error(`E2E failed: ${err.message}`);
  process.exit(1);
}
