function createNavigation(deps) {
  const {
    graph,
    motion,
    pathSampleStep,
    pathMinSamples,
    pathMaxSamples,
    lineMatchMaxDist,
    lineMatchAngleDeg
  } = deps;

  const {
    clamp,
    toRad,
    distancePointToSegmentCoords,
    unitVector,
    sampleBezierPoints,
    buildPolyline,
    reversePolyline,
    polylineAtDistance
  } = motion;

  function buildGraph(data) {
    const nodes = new Map();
    const adjacency = new Map();
    const edgesByKey = new Map();
    for (const node of data.nodes || []) {
      if (!node || !node.id || !node.pos) {
        continue;
      }
      nodes.set(node.id, node);
      adjacency.set(node.id, []);
    }

    const lineConstraints = [];
    const angleThreshold = Math.cos(toRad(lineMatchAngleDeg));

    for (const line of data.lines || []) {
      if (!line || !line.startPos || !line.endPos) {
        continue;
      }
      const props = line.props || {};
      const directionPosX = props.directionPosX;
      const directionPosY = props.directionPosY;
      let dirStart = line.startPos;
      let dirEnd = line.endPos;
      if (Number.isFinite(directionPosX) && Number.isFinite(directionPosY)) {
        const distStart = Math.hypot(directionPosX - line.startPos.x, directionPosY - line.startPos.y);
        const distEnd = Math.hypot(directionPosX - line.endPos.x, directionPosY - line.endPos.y);
        if (distStart < distEnd) {
          dirStart = line.endPos;
          dirEnd = line.startPos;
        }
      }
      const dirVec = unitVector(dirEnd.x - dirStart.x, dirEnd.y - dirStart.y);
      if (dirVec.x === 0 && dirVec.y === 0) {
        continue;
      }
      lineConstraints.push({
        startPos: line.startPos,
        endPos: line.endPos,
        dirVec,
        driveBackward: Number(props.direction) < 0,
        angleThreshold
      });
    }

    function applyLineConstraints(edgeStartPos, edgeEndPos, polyline) {
      if (lineConstraints.length === 0) {
        return { hasConstraint: false, allowed: true, driveBackward: false };
      }
      const edgeMid = polylineAtDistance(polyline, polyline.totalLength * 0.5);
      const edgeDir = unitVector(edgeEndPos.x - edgeStartPos.x, edgeEndPos.y - edgeStartPos.y);
      let best = null;
      let bestDot = -1;
      for (const line of lineConstraints) {
        const dist = distancePointToSegmentCoords(
          edgeMid.x,
          edgeMid.y,
          line.startPos.x,
          line.startPos.y,
          line.endPos.x,
          line.endPos.y
        );
        if (dist > lineMatchMaxDist) {
          continue;
        }
        const dot = edgeDir.x * line.dirVec.x + edgeDir.y * line.dirVec.y;
        if (Math.abs(dot) < line.angleThreshold) {
          continue;
        }
        if (Math.abs(dot) > bestDot) {
          bestDot = Math.abs(dot);
          best = { dot, line };
        }
      }
      if (!best) {
        return { hasConstraint: false, allowed: true, driveBackward: false };
      }
      if (best.dot < 0) {
        return { hasConstraint: true, allowed: false, driveBackward: false };
      }
      return { hasConstraint: true, allowed: true, driveBackward: best.line.driveBackward };
    }

    for (const edge of data.edges || []) {
      if (!edge || !edge.start || !edge.end) {
        continue;
      }
      const startNode = nodes.get(edge.start);
      const endNode = nodes.get(edge.end);
      if (!startNode || !endNode) {
        continue;
      }
      const startPos = edge.startPos ? edge.startPos : { x: startNode.pos.x, y: startNode.pos.y };
      const endPos = edge.endPos ? edge.endPos : { x: endNode.pos.x, y: endNode.pos.y };
      const controlPos1 = edge.controlPos1 || null;
      const controlPos2 = edge.controlPos2 || null;
      const roughDist = Math.hypot(endPos.x - startPos.x, endPos.y - startPos.y);
      const samples = clamp(Math.ceil(roughDist / pathSampleStep), pathMinSamples, pathMaxSamples);
      const points =
        controlPos1 && controlPos2
          ? sampleBezierPoints(startPos, controlPos1, controlPos2, endPos, samples)
          : [startPos, endPos];
      const polyline = buildPolyline(points);

      const directionRaw = edge.props ? edge.props.direction : null;
      const widthRaw = edge.props ? edge.props.width : null;
      const width = Number.isFinite(Number(widthRaw)) ? Number(widthRaw) : 0;
      const direction = Number.isFinite(Number(directionRaw)) ? Number(directionRaw) : null;
      const allowForward = direction === 1 ? true : direction === 2 || direction === -1 ? false : true;
      const allowReverse = direction === 2 || direction === -1 ? true : direction === 1 ? false : true;

      const forwardConstraint = applyLineConstraints(startPos, endPos, polyline);
      const reverseConstraint = applyLineConstraints(endPos, startPos, reversePolyline(polyline));

      if (allowForward && forwardConstraint.allowed) {
        edgesByKey.set(`${startNode.id}->${endNode.id}`, {
          startId: startNode.id,
          endId: endNode.id,
          polyline,
          driveBackward: forwardConstraint.driveBackward,
          width
        });
        adjacency.get(startNode.id).push({ to: endNode.id, cost: polyline.totalLength });
      }
      if (allowReverse && reverseConstraint.allowed) {
        edgesByKey.set(`${endNode.id}->${startNode.id}`, {
          startId: endNode.id,
          endId: startNode.id,
          polyline: reversePolyline(polyline),
          driveBackward: reverseConstraint.driveBackward,
          width
        });
        adjacency.get(endNode.id).push({ to: startNode.id, cost: polyline.totalLength });
      }
    }

    return { nodes, adjacency, edgesByKey };
  }

  const { nodes: nodesById, adjacency, edgesByKey } = buildGraph(graph);
  const incomingAdjacency = new Map();
  for (const [fromId, neighbors] of adjacency.entries()) {
    for (const neighbor of neighbors) {
      if (!incomingAdjacency.has(neighbor.to)) {
        incomingAdjacency.set(neighbor.to, []);
      }
      incomingAdjacency.get(neighbor.to).push({ from: fromId, cost: neighbor.cost });
    }
  }

  function findNearestNode(x, y) {
    let best = null;
    let bestDist = Infinity;
    for (const node of nodesById.values()) {
      const dx = node.pos.x - x;
      const dy = node.pos.y - y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = node;
      }
    }
    return best;
  }

  function findNearestNodeFromIds(x, y, nodeIds) {
    let best = null;
    let bestDistSq = Infinity;
    if (nodeIds) {
      for (const id of nodeIds) {
        const node = nodesById.get(id);
        if (!node || !node.pos) {
          continue;
        }
        const dx = node.pos.x - x;
        const dy = node.pos.y - y;
        const distSq = dx * dx + dy * dy;
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          best = node;
        }
      }
    } else {
      for (const node of nodesById.values()) {
        const dx = node.pos.x - x;
        const dy = node.pos.y - y;
        const distSq = dx * dx + dy * dy;
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          best = node;
        }
      }
    }
    return { node: best, dist: Number.isFinite(bestDistSq) ? Math.sqrt(bestDistSq) : Infinity };
  }

  function findPath(startId, endId) {
    if (!nodesById.has(startId) || !nodesById.has(endId)) {
      return null;
    }
    if (startId === endId) {
      return [startId];
    }

    const distances = new Map();
    const previous = new Map();
    const visited = new Set();

    for (const nodeId of nodesById.keys()) {
      distances.set(nodeId, Infinity);
    }
    distances.set(startId, 0);

    while (true) {
      let current = null;
      let bestDist = Infinity;
      for (const [nodeId, dist] of distances.entries()) {
        if (visited.has(nodeId)) {
          continue;
        }
        if (dist < bestDist) {
          bestDist = dist;
          current = nodeId;
        }
      }

      if (!current) {
        break;
      }
      if (current === endId) {
        break;
      }
      visited.add(current);
      const neighbors = adjacency.get(current) || [];
      for (const neighbor of neighbors) {
        if (visited.has(neighbor.to)) {
          continue;
        }
        const nextDist = bestDist + neighbor.cost;
        if (nextDist < distances.get(neighbor.to)) {
          distances.set(neighbor.to, nextDist);
          previous.set(neighbor.to, current);
        }
      }
    }

    if (!previous.has(endId) && startId !== endId) {
      return null;
    }
    const path = [endId];
    let cursor = endId;
    while (cursor !== startId) {
      const prev = previous.get(cursor);
      if (!prev) break;
      path.push(prev);
      cursor = prev;
    }
    path.reverse();
    return path;
  }

  function computeDistancesToTarget(targetId) {
    const distances = new Map();
    for (const nodeId of nodesById.keys()) {
      distances.set(nodeId, Infinity);
    }
    if (!nodesById.has(targetId)) {
      return distances;
    }
    distances.set(targetId, 0);
    const visited = new Set();

    while (true) {
      let current = null;
      let bestDist = Infinity;
      for (const [nodeId, dist] of distances.entries()) {
        if (visited.has(nodeId)) {
          continue;
        }
        if (dist < bestDist) {
          bestDist = dist;
          current = nodeId;
        }
      }
      if (!current) {
        break;
      }
      visited.add(current);
      const neighbors = incomingAdjacency.get(current) || [];
      for (const neighbor of neighbors) {
        if (visited.has(neighbor.from)) {
          continue;
        }
        const nextDist = bestDist + neighbor.cost;
        if (nextDist < distances.get(neighbor.from)) {
          distances.set(neighbor.from, nextDist);
        }
      }
    }
    return distances;
  }

  return {
    nodesById,
    adjacency,
    edgesByKey,
    incomingAdjacency,
    findNearestNode,
    findNearestNodeFromIds,
    findPath,
    computeDistancesToTarget
  };
}

module.exports = {
  createNavigation
};
