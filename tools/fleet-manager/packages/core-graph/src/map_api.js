const { loadMapGraphLight } = require('./map_loader');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function distancePointToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLenSq = abx * abx + aby * aby;
  if (abLenSq === 0) {
    return Math.hypot(px - ax, py - ay);
  }
  const t = clamp((apx * abx + apy * aby) / abLenSq, 0, 1);
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

function unitVector(dx, dy) {
  const len = Math.hypot(dx, dy);
  if (len === 0) {
    return { x: 0, y: 0 };
  }
  return { x: dx / len, y: dy / len };
}

function directionFromLine(line) {
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
  return {
    dirVec,
    driveBackward: Number(props.direction) < 0
  };
}

class MapApi {
  constructor(graph) {
    this.graph = graph;
    this.nodesById = new Map();
    this.nodesByClass = new Map();
    this.edgesById = new Map();
    this.edgesByNode = new Map();
    this.linesById = new Map();
    this.binsById = new Map();

    for (const node of graph.nodes || []) {
      this.nodesById.set(node.id, node);
      if (!this.nodesByClass.has(node.className)) {
        this.nodesByClass.set(node.className, []);
      }
      this.nodesByClass.get(node.className).push(node);
    }

    for (const edge of graph.edges || []) {
      this.edgesById.set(edge.id, edge);
      if (!this.edgesByNode.has(edge.start)) {
        this.edgesByNode.set(edge.start, []);
      }
      if (!this.edgesByNode.has(edge.end)) {
        this.edgesByNode.set(edge.end, []);
      }
      this.edgesByNode.get(edge.start).push(edge);
      this.edgesByNode.get(edge.end).push(edge);
    }

    for (const line of graph.lines || []) {
      this.linesById.set(line.id, line);
    }

    for (const bin of graph.bins || []) {
      this.binsById.set(bin.instanceName, bin);
    }
  }

  static load(mapPath) {
    return new MapApi(loadMapGraphLight(mapPath));
  }

  getMeta() {
    return this.graph.meta || {};
  }

  getNode(id) {
    return this.nodesById.get(id) || null;
  }

  listNodes() {
    return [...this.nodesById.values()];
  }

  listNodesByClass(className) {
    return this.nodesByClass.get(className) || [];
  }

  listActionPoints() {
    return this.listNodesByClass('ActionPoint');
  }

  listLocationMarks() {
    return this.listNodesByClass('LocationMark');
  }

  listChargePoints() {
    return this.listNodesByClass('ChargePoint');
  }

  listParkPoints() {
    return this.listNodesByClass('ParkPoint');
  }

  listEdges() {
    return [...this.edgesById.values()];
  }

  getEdge(id) {
    return this.edgesById.get(id) || null;
  }

  listEdgesFrom(nodeId, { respectDirection = true } = {}) {
    const edges = this.edgesByNode.get(nodeId) || [];
    if (!respectDirection) {
      return edges;
    }
    return edges.filter((edge) => {
      const directionRaw = edge.props ? edge.props.direction : null;
      const direction = Number.isFinite(Number(directionRaw)) ? Number(directionRaw) : null;
      if (direction === 1) {
        return edge.start === nodeId;
      }
      if (direction === 2 || direction === -1) {
        return edge.end === nodeId;
      }
      return true;
    });
  }

  listLines() {
    return [...this.linesById.values()];
  }

  getLine(id) {
    return this.linesById.get(id) || null;
  }

  getLineDirection(id) {
    const line = this.getLine(id);
    if (!line) {
      return null;
    }
    return directionFromLine(line);
  }

  matchLineForSegment(startPos, endPos, { maxDistance = 0.6, angleDeg = 30 } = {}) {
    const edgeVec = unitVector(endPos.x - startPos.x, endPos.y - startPos.y);
    const angleThreshold = Math.cos(toRad(angleDeg));
    const mid = {
      x: (startPos.x + endPos.x) / 2,
      y: (startPos.y + endPos.y) / 2
    };
    let best = null;
    let bestDot = -1;
    for (const line of this.linesById.values()) {
      const dist = distancePointToSegment(
        mid.x,
        mid.y,
        line.startPos.x,
        line.startPos.y,
        line.endPos.x,
        line.endPos.y
      );
      if (dist > maxDistance) {
        continue;
      }
      const { dirVec, driveBackward } = directionFromLine(line);
      if (dirVec.x === 0 && dirVec.y === 0) {
        continue;
      }
      const dot = edgeVec.x * dirVec.x + edgeVec.y * dirVec.y;
      if (Math.abs(dot) < angleThreshold) {
        continue;
      }
      if (Math.abs(dot) > bestDot) {
        bestDot = Math.abs(dot);
        best = { line, dot, driveBackward };
      }
    }
    return best;
  }

  listBins() {
    return [...this.binsById.values()];
  }

  getBin(name) {
    return this.binsById.get(name) || null;
  }

  findNearestNode(x, y) {
    let best = null;
    let bestDist = Infinity;
    for (const node of this.nodesById.values()) {
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
}

module.exports = { MapApi };
