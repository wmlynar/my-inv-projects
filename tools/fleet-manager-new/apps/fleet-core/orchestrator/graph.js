const { validateCorridorSegment } = require('./model');

function edgeDirectionFlags(edge) {
  const raw = edge?.props?.direction;
  if (raw === undefined || raw === null) {
    return { forward: true, reverse: true };
  }
  const text = typeof raw === 'string' ? raw.trim().toLowerCase() : null;
  if (text) {
    if (text === 'bidirectional' || text === 'both') return { forward: true, reverse: true };
    if (text === 'forward' || text === 'forwardonly' || text === 'a_to_b') {
      return { forward: true, reverse: false };
    }
    if (text === 'reverse' || text === 'backward' || text === 'backwardonly' || text === 'b_to_a') {
      return { forward: false, reverse: true };
    }
  }
  const value = Number(raw);
  if (value === 0) return { forward: true, reverse: true };
  if (value === 1) return { forward: true, reverse: false };
  if (value === 2 || value === -1) return { forward: false, reverse: true };
  return { forward: true, reverse: true };
}

function buildGraph(compiledMap) {
  if (!compiledMap || typeof compiledMap !== 'object') {
    throw new Error('compiledMap missing');
  }
  const nodes = Array.isArray(compiledMap.nodes) ? compiledMap.nodes : [];
  const edges = Array.isArray(compiledMap.edges) ? compiledMap.edges : [];
  const corridors = Array.isArray(compiledMap.corridors) ? compiledMap.corridors : [];
  const nodesById = new Map();
  const edgesById = new Map();
  const corridorsById = new Map();
  const adjacency = new Map();

  for (const node of nodes) {
    if (!node?.nodeId) continue;
    nodesById.set(node.nodeId, node);
  }
  for (const edge of edges) {
    if (!edge?.edgeId) continue;
    edgesById.set(edge.edgeId, edge);
  }

  for (const corridor of corridors) {
    if (!corridor?.corridorId) continue;
    const aNodeId = corridor.aNodeId;
    const bNodeId = corridor.bNodeId;
    if (!nodesById.has(aNodeId) || !nodesById.has(bNodeId)) continue;
    const segments = Array.isArray(corridor.segments) ? corridor.segments : [];
    let allowAToB = segments.length > 0;
    let allowBToA = segments.length > 0;

    for (const segment of segments) {
      const edge = edgesById.get(segment.edgeId);
      if (!edge) {
        allowAToB = false;
        allowBToA = false;
        break;
      }
      const flags = edgeDirectionFlags(edge);
      if (segment.aligned) {
        if (!flags.forward) allowAToB = false;
        if (!flags.reverse) allowBToA = false;
      } else {
        if (!flags.reverse) allowAToB = false;
        if (!flags.forward) allowBToA = false;
      }
    }

    const lengthM = Number.isFinite(corridor.lengthM) ? corridor.lengthM : null;
    if (!Number.isFinite(lengthM) || lengthM <= 0) continue;

    const entry = {
      corridorId: corridor.corridorId,
      fromNodeId: aNodeId,
      toNodeId: bNodeId,
      lengthM,
      singleLane: corridor.singleLane !== false,
      directions: { aToB: allowAToB, bToA: allowBToA }
    };
    const validation = validateCorridorSegment(entry);
    if (!validation.ok) continue;

    corridorsById.set(entry.corridorId, entry);

    if (entry.directions.aToB) {
      addAdjacency(adjacency, entry.fromNodeId, {
        to: entry.toNodeId,
        corridorId: entry.corridorId,
        lengthM: entry.lengthM
      });
    }
    if (entry.directions.bToA) {
      addAdjacency(adjacency, entry.toNodeId, {
        to: entry.fromNodeId,
        corridorId: entry.corridorId,
        lengthM: entry.lengthM
      });
    }
  }

  for (const [key, list] of adjacency.entries()) {
    list.sort((a, b) => {
      if (a.to !== b.to) return a.to.localeCompare(b.to);
      return a.corridorId.localeCompare(b.corridorId);
    });
    adjacency.set(key, list);
  }

  return {
    nodesById,
    edgesById,
    corridorsById,
    adjacency
  };
}

function addAdjacency(adjacency, from, entry) {
  if (!adjacency.has(from)) adjacency.set(from, []);
  adjacency.get(from).push(entry);
}

function planRoute(graph, startNodeId, goalNodeId) {
  if (!graph?.adjacency || !graph.nodesById) return null;
  if (!graph.nodesById.has(startNodeId) || !graph.nodesById.has(goalNodeId)) return null;
  if (startNodeId === goalNodeId) {
    return { nodes: [startNodeId], corridors: [], lengthM: 0 };
  }

  const dist = new Map();
  const prev = new Map();
  const prevCorridor = new Map();
  const unvisited = new Set(graph.nodesById.keys());

  for (const nodeId of unvisited) {
    dist.set(nodeId, nodeId === startNodeId ? 0 : Number.POSITIVE_INFINITY);
  }

  while (unvisited.size) {
    let current = null;
    let best = Number.POSITIVE_INFINITY;
    for (const nodeId of unvisited) {
      const value = dist.get(nodeId);
      if (value < best) {
        best = value;
        current = nodeId;
      }
    }
    if (current === null) break;
    if (current === goalNodeId) break;
    unvisited.delete(current);

    const neighbors = graph.adjacency.get(current) || [];
    for (const edge of neighbors) {
      if (!unvisited.has(edge.to)) continue;
      const alt = dist.get(current) + edge.lengthM;
      if (alt < dist.get(edge.to)) {
        dist.set(edge.to, alt);
        prev.set(edge.to, current);
        prevCorridor.set(edge.to, edge.corridorId);
      }
    }
  }

  if (!prev.has(goalNodeId)) return null;

  const nodes = [];
  const corridors = [];
  let cursor = goalNodeId;
  while (cursor) {
    nodes.push(cursor);
    const prevNode = prev.get(cursor);
    if (!prevNode) break;
    const corridorId = prevCorridor.get(cursor);
    if (corridorId) corridors.push(corridorId);
    cursor = prevNode;
  }
  nodes.reverse();
  corridors.reverse();

  return {
    nodes,
    corridors,
    lengthM: dist.get(goalNodeId)
  };
}

function concatRoutes(first, second) {
  if (!first) return second;
  if (!second) return first;
  if (!first.nodes.length) return second;
  if (!second.nodes.length) return first;
  const nodes = first.nodes.slice();
  const corridors = first.corridors.slice();
  for (let i = 1; i < second.nodes.length; i += 1) {
    nodes.push(second.nodes[i]);
  }
  corridors.push(...second.corridors);
  return { nodes, corridors, lengthM: first.lengthM + second.lengthM };
}

module.exports = {
  buildGraph,
  planRoute,
  concatRoutes
};
