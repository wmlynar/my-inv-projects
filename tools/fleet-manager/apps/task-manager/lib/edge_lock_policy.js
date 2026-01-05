const DEFAULT_LOCK_TIMEOUT_MS = 15000;

function nowMs() {
  return Date.now();
}

function distance(a, b) {
  if (!a || !b) return 0;
  return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
}

function makeEdgeGroupKey(fromId, toId) {
  if (!fromId || !toId) return null;
  return fromId < toId ? `${fromId}<->${toId}` : `${toId}<->${fromId}`;
}

function edgeAllowsDirection(edge, fromId) {
  if (!edge || !fromId) return true;
  const raw = edge.props ? edge.props.direction : null;
  const direction = Number.isFinite(Number(raw)) ? Number(raw) : null;
  if (direction === 1) {
    return edge.start === fromId;
  }
  if (direction === 2 || direction === -1) {
    return edge.end === fromId;
  }
  return true;
}

function buildGraphCache(graph) {
  const nodesById = new Map();
  for (const node of graph.nodes || []) {
    if (node && node.id && node.pos) {
      nodesById.set(node.id, node);
    }
  }

  const adjacency = new Map();
  const edgeLookup = new Map();

  const addEdge = (fromId, toId, edge, cost) => {
    if (!adjacency.has(fromId)) {
      adjacency.set(fromId, []);
    }
    const edgeKey = `${fromId}->${toId}`;
    const edgeGroupKey = makeEdgeGroupKey(fromId, toId);
    adjacency.get(fromId).push({ to: toId, cost, edgeKey, edgeGroupKey });
    edgeLookup.set(edgeKey, { edgeKey, edgeGroupKey });
  };

  for (const edge of graph.edges || []) {
    const startNode = nodesById.get(edge.start);
    const endNode = nodesById.get(edge.end);
    if (!startNode || !endNode) {
      continue;
    }
    const startPos = edge.startPos || startNode.pos;
    const endPos = edge.endPos || endNode.pos;
    const cost = distance(startPos, endPos) || 1;

    if (edgeAllowsDirection(edge, edge.start)) {
      addEdge(edge.start, edge.end, edge, cost);
    }
    if (edgeAllowsDirection(edge, edge.end)) {
      addEdge(edge.end, edge.start, edge, cost);
    }
  }

  return { nodesById, adjacency, edgeLookup };
}

function findNearestNodeId(nodesById, pos) {
  if (!pos || !nodesById.size) return null;
  let best = null;
  let bestDist = Infinity;
  for (const node of nodesById.values()) {
    const dx = node.pos.x - pos.x;
    const dy = node.pos.y - pos.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = node;
    }
  }
  return best ? best.id : null;
}

function resolveStartNodeId(robotId, statusMap, nodesById) {
  const status = statusMap ? statusMap[robotId] : null;
  if (!status) return null;
  if (status.current_station && nodesById.has(status.current_station)) {
    return status.current_station;
  }
  if (status.last_station && nodesById.has(status.last_station)) {
    return status.last_station;
  }
  if (Number.isFinite(status.x) && Number.isFinite(status.y)) {
    return findNearestNodeId(nodesById, { x: status.x, y: status.y });
  }
  return null;
}

function findShortestPath(adjacency, startId, endId) {
  if (!adjacency || !startId || !endId) return null;
  if (startId === endId) return [startId];

  const dist = new Map();
  const prev = new Map();
  const visited = new Set();
  const queue = [{ id: startId, cost: 0 }];
  dist.set(startId, 0);

  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();
    if (!current) break;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    if (current.id === endId) break;
    const neighbors = adjacency.get(current.id) || [];
    for (const edge of neighbors) {
      const nextCost = current.cost + edge.cost;
      const known = dist.get(edge.to);
      if (known === undefined || nextCost < known) {
        dist.set(edge.to, nextCost);
        prev.set(edge.to, current.id);
        queue.push({ id: edge.to, cost: nextCost });
      }
    }
  }

  if (!dist.has(endId)) return null;
  const path = [];
  let current = endId;
  while (current) {
    path.unshift(current);
    if (current === startId) break;
    current = prev.get(current);
    if (!current) return null;
  }
  return path;
}

class EdgeLockPolicy {
  constructor({ allowSameDirection = true, lockTimeoutMs = DEFAULT_LOCK_TIMEOUT_MS } = {}) {
    this.allowSameDirection = allowSameDirection;
    this.lockTimeoutMs = lockTimeoutMs;
    this.edgeLocks = new Map();
    this.robotLocks = new Map();
    this.nodeLocks = new Map();
    this.robotNodeLocks = new Map();
    this.cacheByGraph = new WeakMap();
  }

  getGraphCache(graph) {
    if (!graph) return null;
    if (!this.cacheByGraph.has(graph)) {
      this.cacheByGraph.set(graph, buildGraphCache(graph));
    }
    return this.cacheByGraph.get(graph);
  }

  reservePath(robotId, edgeKeys, nodeKeys = []) {
    if (!robotId || !edgeKeys.length) return { ok: true };
    const now = nowMs();

    for (const edge of edgeKeys) {
      const lock = this.edgeLocks.get(edge.edgeGroupKey);
      if (!lock) continue;
      if (lock.edgeKey && edge.edgeKey && lock.edgeKey !== edge.edgeKey) {
        return { ok: false, holder: [...lock.robots][0] || null };
      }
      if (!this.allowSameDirection) {
        return { ok: false, holder: [...lock.robots][0] || null };
      }
    }

    for (const node of nodeKeys) {
      if (!node || !node.nodeId) continue;
      const lock = this.nodeLocks.get(node.nodeId);
      if (!lock) continue;
      if (lock.edgeGroupKey && node.edgeGroupKey && lock.edgeGroupKey !== node.edgeGroupKey) {
        return { ok: false, holder: [...lock.robots][0] || null };
      }
      if (!this.allowSameDirection) {
        return { ok: false, holder: [...lock.robots][0] || null };
      }
    }

    this.releaseRobot(robotId);
    const lockedKeys = new Set();
    const lockedNodes = new Set();

    for (const edge of edgeKeys) {
      if (!edge.edgeGroupKey) continue;
      let lock = this.edgeLocks.get(edge.edgeGroupKey);
      if (!lock) {
        lock = { edgeKey: edge.edgeKey || null, robots: new Set(), updatedAt: now };
        this.edgeLocks.set(edge.edgeGroupKey, lock);
      } else if (edge.edgeKey) {
        lock.edgeKey = edge.edgeKey;
      }
      lock.robots.add(robotId);
      lock.updatedAt = now;
      lockedKeys.add(edge.edgeGroupKey);
    }

    if (lockedKeys.size) {
      const set = this.robotLocks.get(robotId) || new Set();
      lockedKeys.forEach((key) => set.add(key));
      this.robotLocks.set(robotId, set);
    }

    for (const node of nodeKeys) {
      if (!node || !node.nodeId) continue;
      let lock = this.nodeLocks.get(node.nodeId);
      if (!lock) {
        lock = { edgeGroupKey: node.edgeGroupKey || null, robots: new Set(), updatedAt: now };
        this.nodeLocks.set(node.nodeId, lock);
      } else if (node.edgeGroupKey) {
        lock.edgeGroupKey = node.edgeGroupKey;
      }
      lock.robots.add(robotId);
      lock.updatedAt = now;
      lockedNodes.add(node.nodeId);
    }

    if (lockedNodes.size) {
      const set = this.robotNodeLocks.get(robotId) || new Set();
      lockedNodes.forEach((key) => set.add(key));
      this.robotNodeLocks.set(robotId, set);
    }

    return { ok: true };
  }

  releaseRobot(robotId) {
    if (!robotId) return;
    const keys = this.robotLocks.get(robotId);
    if (!keys) return;
    for (const key of keys) {
      const lock = this.edgeLocks.get(key);
      if (!lock) continue;
      lock.robots.delete(robotId);
      if (!lock.robots.size) {
        this.edgeLocks.delete(key);
      }
    }
    this.robotLocks.delete(robotId);

    const nodeKeys = this.robotNodeLocks.get(robotId);
    if (!nodeKeys) return;
    for (const key of nodeKeys) {
      const lock = this.nodeLocks.get(key);
      if (!lock) continue;
      lock.robots.delete(robotId);
      if (!lock.robots.size) {
        this.nodeLocks.delete(key);
      }
    }
    this.robotNodeLocks.delete(robotId);
  }

  hasRobotLocks(robotId) {
    if (!robotId) return false;
    const edgeLocks = this.robotLocks.get(robotId);
    if (edgeLocks && edgeLocks.size) return true;
    const nodeLocks = this.robotNodeLocks.get(robotId);
    return Boolean(nodeLocks && nodeLocks.size);
  }

  ensureRobotLocks({ robotId, targetId, graph, statusMap }) {
    if (!robotId || !targetId || !graph) return { ok: true };
    if (this.hasRobotLocks(robotId)) return { ok: true, already: true };
    return this.allowDispatch({ robotId, targetId, graph, statusMap });
  }

  onArrive({ robotId }) {
    this.releaseRobot(robotId);
  }

  onTick({ now, tasks, pendingActions }) {
    const touched = new Set();
    if (Array.isArray(tasks)) {
      tasks.forEach((task) => {
        if (task && task.status === 'in_progress' && task.robotId) {
          touched.add(task.robotId);
        }
      });
    }
    if (pendingActions && pendingActions.size) {
      for (const robotId of pendingActions.keys()) {
        touched.add(robotId);
      }
    }
    for (const robotId of touched) {
      const keys = this.robotLocks.get(robotId);
      if (!keys) continue;
      keys.forEach((key) => {
        const lock = this.edgeLocks.get(key);
        if (lock) {
          lock.updatedAt = now;
        }
      });

      const nodeKeys = this.robotNodeLocks.get(robotId);
      if (!nodeKeys) continue;
      nodeKeys.forEach((key) => {
        const lock = this.nodeLocks.get(key);
        if (lock) {
          lock.updatedAt = now;
        }
      });
    }
    this.expireLocks(now);
  }

  expireLocks(now) {
    if (this.edgeLocks.size) {
      for (const [key, lock] of this.edgeLocks.entries()) {
        if (now - lock.updatedAt <= this.lockTimeoutMs) continue;
        this.edgeLocks.delete(key);
        for (const robotId of lock.robots) {
          const keys = this.robotLocks.get(robotId);
          if (keys) {
            keys.delete(key);
            if (!keys.size) {
              this.robotLocks.delete(robotId);
            }
          }
        }
      }
    }

    if (this.nodeLocks.size) {
      for (const [key, lock] of this.nodeLocks.entries()) {
        if (now - lock.updatedAt <= this.lockTimeoutMs) continue;
        this.nodeLocks.delete(key);
        for (const robotId of lock.robots) {
          const keys = this.robotNodeLocks.get(robotId);
          if (keys) {
            keys.delete(key);
            if (!keys.size) {
              this.robotNodeLocks.delete(robotId);
            }
          }
        }
      }
    }
  }

  allowDispatch({ robotId, targetId, graph, statusMap }) {
    if (!robotId || !targetId || !graph) return { ok: true };
    const cache = this.getGraphCache(graph);
    if (!cache) return { ok: true };
    if (!cache.nodesById.has(targetId)) {
      return { ok: true };
    }
    const startId = resolveStartNodeId(robotId, statusMap, cache.nodesById);
    if (!startId || !cache.nodesById.has(startId)) {
      return { ok: true };
    }
    const path = findShortestPath(cache.adjacency, startId, targetId);
    if (!path || path.length < 2) {
      return { ok: true };
    }
    const edges = [];
    const nodes = [];
    for (let i = 0; i < path.length - 1; i += 1) {
      const edgeKey = `${path[i]}->${path[i + 1]}`;
      const entry = cache.edgeLookup.get(edgeKey) || {
        edgeKey,
        edgeGroupKey: makeEdgeGroupKey(path[i], path[i + 1])
      };
      edges.push(entry);
      nodes.push({ nodeId: path[i + 1], edgeGroupKey: entry.edgeGroupKey });
    }
    return this.reservePath(robotId, edges, nodes);
  }
}

module.exports = {
  EdgeLockPolicy
};
