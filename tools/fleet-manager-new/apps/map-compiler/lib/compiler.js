const MotionKernel = require('../../../packages/robokit-lib/motion_kernel');
const { normalizeRobotModel } = require('./robot_profile');
const crypto = require('crypto');

const DEFAULT_PARAMS = {
  cellLenM: 0.5,
  arcLutStepM: 0.1,
  sweepSampleStepM: 0.25,
  geomEpsM: 1e-6,
  maxRectsPerCell: 32,
  turningEpsRad: 0.05,
  inflateMarginScale: 1
};

function normalizeCompileParams(params) {
  const merged = { ...DEFAULT_PARAMS, ...(params || {}) };
  return {
    cellLenM: Number.isFinite(merged.cellLenM) ? merged.cellLenM : DEFAULT_PARAMS.cellLenM,
    arcLutStepM: Number.isFinite(merged.arcLutStepM) ? merged.arcLutStepM : DEFAULT_PARAMS.arcLutStepM,
    sweepSampleStepM: Number.isFinite(merged.sweepSampleStepM)
      ? merged.sweepSampleStepM
      : DEFAULT_PARAMS.sweepSampleStepM,
    geomEpsM: Number.isFinite(merged.geomEpsM) ? merged.geomEpsM : DEFAULT_PARAMS.geomEpsM,
    maxRectsPerCell: Number.isFinite(merged.maxRectsPerCell)
      ? Math.max(1, Math.floor(merged.maxRectsPerCell))
      : DEFAULT_PARAMS.maxRectsPerCell,
    turningEpsRad: Number.isFinite(merged.turningEpsRad)
      ? merged.turningEpsRad
      : DEFAULT_PARAMS.turningEpsRad,
    inflateMarginScale: Number.isFinite(merged.inflateMarginScale)
      ? merged.inflateMarginScale
      : DEFAULT_PARAMS.inflateMarginScale
  };
}

function normalizeMoveStyle(value) {
  if (value === undefined || value === null) return 'forward';
  if (typeof value === 'number') {
    return value === 1 ? 'reverse' : 'forward';
  }
  const text = String(value).trim().toLowerCase();
  if (text === 'reverse' || text === 'backward' || text === 'back') return 'reverse';
  return 'forward';
}

function invertMoveStyle(style) {
  const normalized = normalizeMoveStyle(style);
  return normalized === 'reverse' ? 'forward' : 'reverse';
}

function edgeDirectionFlags(edge) {
  const raw = edge?.props?.direction;
  if (raw === undefined || raw === null) {
    return { forward: true, reverse: true };
  }
  const value = Number(raw);
  if (value === 0) {
    return { forward: true, reverse: true };
  }
  if (value === 1) {
    return { forward: true, reverse: false };
  }
  if (value === 2 || value === -1) {
    return { forward: false, reverse: true };
  }
  return { forward: true, reverse: true };
}

function hash32Fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function hash32Hex(text) {
  return hash32Fnv1a(text).toString(16).padStart(8, '0');
}

function roundNumber(value, precision = 1e-6) {
  if (!Number.isFinite(value)) return value;
  return Math.round(value / precision) * precision;
}

function canonicalizeValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number') {
    return roundNumber(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeValue(entry));
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const result = {};
    for (const key of keys) {
      const child = canonicalizeValue(value[key]);
      if (child !== undefined) {
        result[key] = child;
      }
    }
    return result;
  }
  return value;
}

function edgeLengthFallback(edge) {
  const p0 = edge.p0;
  const p3 = edge.p3;
  if (!p0 || !p3) return 0;
  return Math.hypot(p3.xM - p0.xM, p3.yM - p0.yM);
}

function toKernelPoint(point) {
  if (!point) return null;
  return { x: point.xM, y: point.yM };
}

function computeApproxLength(edge) {
  if (!edge?.p0 || !edge?.p1 || !edge?.p2 || !edge?.p3) {
    return edgeLengthFallback(edge);
  }
  return (
    Math.hypot(edge.p1.xM - edge.p0.xM, edge.p1.yM - edge.p0.yM) +
    Math.hypot(edge.p2.xM - edge.p1.xM, edge.p2.yM - edge.p1.yM) +
    Math.hypot(edge.p3.xM - edge.p2.xM, edge.p3.yM - edge.p2.yM)
  );
}

function buildEdgePolyline(edge, params) {
  if (!MotionKernel || !MotionKernel.sampleBezierPoints) return null;
  if (!edge?.p0 || !edge?.p1 || !edge?.p2 || !edge?.p3) return null;
  const approx = computeApproxLength(edge);
  const step = params.arcLutStepM || DEFAULT_PARAMS.arcLutStepM;
  const samples = Math.max(8, Math.min(2000, Math.ceil(approx / step)));
  const points = MotionKernel.sampleBezierPoints(
    toKernelPoint(edge.p0),
    toKernelPoint(edge.p1),
    toKernelPoint(edge.p2),
    toKernelPoint(edge.p3),
    samples
  );
  return MotionKernel.buildPolyline(points);
}

function computeRectBbox(rect) {
  const angle = Number.isFinite(rect.angleRad) ? rect.angleRad : 0;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const corners = [
    { x: -rect.hxM, y: -rect.hyM },
    { x: rect.hxM, y: -rect.hyM },
    { x: rect.hxM, y: rect.hyM },
    { x: -rect.hxM, y: rect.hyM }
  ];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const corner of corners) {
    const x = rect.cxM + corner.x * cos - corner.y * sin;
    const y = rect.cyM + corner.x * sin + corner.y * cos;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minXM: minX, minYM: minY, maxXM: maxX, maxYM: maxY };
}

function computeMultiRectBbox(rects) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  rects.forEach((rect) => {
    const bbox = computeRectBbox(rect);
    minX = Math.min(minX, bbox.minXM);
    minY = Math.min(minY, bbox.minYM);
    maxX = Math.max(maxX, bbox.maxXM);
    maxY = Math.max(maxY, bbox.maxYM);
  });
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { minXM: 0, minYM: 0, maxXM: 0, maxYM: 0 };
  }
  return { minXM: minX, minYM: minY, maxXM: maxX, maxYM: maxY };
}

function rectBasis(rect) {
  const angle = Number.isFinite(rect.angleRad) ? rect.angleRad : 0;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    ux: cos,
    uy: sin,
    vx: -sin,
    vy: cos
  };
}

function rectsIntersect(rectA, rectB, eps) {
  if (!rectA || !rectB) return false;
  const a = rectBasis(rectA);
  const b = rectBasis(rectB);
  const axes = [
    { x: a.ux, y: a.uy },
    { x: a.vx, y: a.vy },
    { x: b.ux, y: b.uy },
    { x: b.vx, y: b.vy }
  ];

  const dx = rectB.cxM - rectA.cxM;
  const dy = rectB.cyM - rectA.cyM;
  const tolerance = Number.isFinite(eps) ? eps : DEFAULT_PARAMS.geomEpsM;

  for (const axis of axes) {
    const proj = dx * axis.x + dy * axis.y;
    const ra =
      rectA.hxM * Math.abs(a.ux * axis.x + a.uy * axis.y) +
      rectA.hyM * Math.abs(a.vx * axis.x + a.vy * axis.y);
    const rb =
      rectB.hxM * Math.abs(b.ux * axis.x + b.uy * axis.y) +
      rectB.hyM * Math.abs(b.vx * axis.x + b.vy * axis.y);
    if (Math.abs(proj) > ra + rb + tolerance) {
      return false;
    }
  }
  return true;
}

function bboxIntersects(a, b) {
  if (!a || !b) return false;
  return !(a.maxXM < b.minXM || a.minXM > b.maxXM || a.maxYM < b.minYM || a.minYM > b.maxYM);
}

function cellsIntersect(cellA, cellB, eps) {
  const bboxA = cellA?.sweptShape?.bbox;
  const bboxB = cellB?.sweptShape?.bbox;
  if (!bboxIntersects(bboxA, bboxB)) return false;
  const rectsA = Array.isArray(cellA?.sweptShape?.rects) ? cellA.sweptShape.rects : [];
  const rectsB = Array.isArray(cellB?.sweptShape?.rects) ? cellB.sweptShape.rects : [];
  for (const rectA of rectsA) {
    for (const rectB of rectsB) {
      if (rectsIntersect(rectA, rectB, eps)) return true;
    }
  }
  return false;
}

function buildConflictSets(cells, params) {
  const list = cells || [];
  const cellById = new Map();
  list.forEach((cell) => {
    if (cell?.cellId) {
      cell.conflictSet = [cell.cellId];
      cellById.set(cell.cellId, cell);
    }
  });

  const eps = params.geomEpsM;
  for (let i = 0; i < list.length; i += 1) {
    const cellA = list[i];
    if (!cellA?.cellId) continue;
    for (let j = i + 1; j < list.length; j += 1) {
      const cellB = list[j];
      if (!cellB?.cellId) continue;
      if (cellsIntersect(cellA, cellB, eps)) {
        cellA.conflictSet.push(cellB.cellId);
        cellB.conflictSet.push(cellA.cellId);
      }
    }
  }

  for (const cell of cellById.values()) {
    cell.conflictSet.sort();
  }

  return cellById;
}

function computeInflatedExtents(robotModel, movestyle, turningExtra, inflateScale) {
  const scale = Number.isFinite(inflateScale) ? inflateScale : 1;
  const frontMargin = scale * (robotModel.safetyFront + robotModel.poseMargin + robotModel.trackingMargin);
  const rearMargin = scale * (robotModel.safetyRear + robotModel.poseMargin + robotModel.trackingMargin);
  const sideMargin =
    scale * (robotModel.safetySide + robotModel.poseMargin + robotModel.trackingMargin + (turningExtra || 0));
  const frontExt = robotModel.head + frontMargin;
  const rearExt = robotModel.tail + rearMargin;
  const sideExt = robotModel.width / 2 + sideMargin;
  const leadExt = movestyle === 'reverse' ? rearExt : frontExt;
  const trailExt = movestyle === 'reverse' ? frontExt : rearExt;
  const frontSign = movestyle === 'reverse' ? -1 : 1;
  return { leadExt, trailExt, sideExt, frontExt, rearExt, frontSign };
}

function buildFootprintRect(pose, heading, extents) {
  const length = extents.leadExt + extents.trailExt;
  const centerOffset = (extents.leadExt - extents.trailExt) / 2;
  const cos = Math.cos(heading);
  const sin = Math.sin(heading);
  const cx = pose.x + cos * centerOffset;
  const cy = pose.y + sin * centerOffset;
  const frontX = pose.x + cos * extents.frontExt * extents.frontSign;
  const frontY = pose.y + sin * extents.frontExt * extents.frontSign;
  return {
    cxM: cx,
    cyM: cy,
    angleRad: heading,
    hxM: length / 2,
    hyM: extents.sideExt,
    pivotXM: pose.x,
    pivotYM: pose.y,
    frontXM: frontX,
    frontYM: frontY
  };
}

function normalizeAngle(angle) {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

function computeSweptShape(polyline, s0, s1, movestyle, robotModel, params) {
  const length = Math.max(0, s1 - s0);
  if (!polyline || length <= 0) {
    return { kind: 'multiRect', bbox: { minXM: 0, minYM: 0, maxXM: 0, maxYM: 0 }, rects: [] };
  }
  const moveStyleAt =
    typeof movestyle === 'function' ? movestyle : () => normalizeMoveStyle(movestyle);
  const baseStep = Math.min(length / 2, params.sweepSampleStepM);
  let step = baseStep > 0 ? baseStep : length;
  const maxRects = params.maxRectsPerCell;
  const approxCount = Math.floor(length / step) + 1;
  if (approxCount > maxRects) {
    step = length / Math.max(1, maxRects - 1);
  }

  const poseStart = MotionKernel.polylineAtDistance(polyline, s0);
  const poseEnd = MotionKernel.polylineAtDistance(polyline, s1);
  const headingDelta = Math.abs(normalizeAngle(poseEnd.heading - poseStart.heading));
  const turningExtra = headingDelta > params.turningEpsRad ? robotModel.turningExtraMargin : 0;

  const rects = [];
  const eps = 1e-6;
  let cursor = s0;
  while (cursor < s1 + eps) {
    const pose = MotionKernel.polylineAtDistance(polyline, cursor);
    const style = normalizeMoveStyle(moveStyleAt(cursor));
    const extents = computeInflatedExtents(
      robotModel,
      style,
      turningExtra,
      params.inflateMarginScale
    );
    rects.push(buildFootprintRect(pose, pose.heading, extents));
    cursor += step;
  }

  const bbox = computeMultiRectBbox(rects);
  return { kind: 'multiRect', bbox, rects };
}

function buildEdgeGroups(edges) {
  const groups = new Map();
  const edgesById = new Map();
  for (const edge of edges) {
    if (!edge?.edgeId || !edge.startNodeId || !edge.endNodeId) continue;
    edgesById.set(edge.edgeId, edge);
    const nodeA = edge.startNodeId;
    const nodeB = edge.endNodeId;
    const [minNode, maxNode] = nodeA < nodeB ? [nodeA, nodeB] : [nodeB, nodeA];
    const key = `${minNode}||${maxNode}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        nodeAId: minNode,
        nodeBId: maxNode,
        edges: []
      };
      groups.set(key, group);
    }
    group.edges.push(edge);
  }
  for (const group of groups.values()) {
    group.edges.sort((a, b) => a.edgeId.localeCompare(b.edgeId));
    group.primaryEdge = group.edges[0];
  }
  return { groupsByKey: groups, edgesById };
}

function buildAdjacency(groupsByKey) {
  const adjacency = new Map();
  for (const group of groupsByKey.values()) {
    const add = (nodeId, otherNodeId) => {
      if (!adjacency.has(nodeId)) adjacency.set(nodeId, []);
      adjacency.get(nodeId).push({ key: group.key, otherNodeId });
    };
    add(group.nodeAId, group.nodeBId);
    add(group.nodeBId, group.nodeAId);
  }
  for (const list of adjacency.values()) {
    list.sort((a, b) => a.key.localeCompare(b.key));
  }
  return adjacency;
}

function pickEdgeForDirection(group, fromNodeId, toNodeId) {
  const candidates = [];
  for (const edge of group.edges) {
    const flags = edgeDirectionFlags(edge);
    if (edge.startNodeId === fromNodeId && edge.endNodeId === toNodeId && flags.forward) {
      candidates.push({ edge, aligned: true, invert: false });
    } else if (edge.startNodeId === toNodeId && edge.endNodeId === fromNodeId && flags.reverse) {
      candidates.push({ edge, aligned: false, invert: true });
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.edge.edgeId.localeCompare(b.edge.edgeId));
  const chosen = candidates[0];
  const baseStyle = normalizeMoveStyle(chosen.edge?.props?.movestyle ?? chosen.edge?.props?.moveStyle);
  const movestyle = chosen.invert ? invertMoveStyle(baseStyle) : baseStyle;
  return { edge: chosen.edge, aligned: chosen.aligned, movestyle };
}

function walkCorridor(startNodeId, startKey, adjacency, groupsByKey, degreeByNode, visited) {
  const nodes = [startNodeId];
  const segments = [];
  let currentNodeId = startNodeId;
  let currentKey = startKey;
  while (currentKey) {
    const group = groupsByKey.get(currentKey);
    const nextNodeId = group.nodeAId === currentNodeId ? group.nodeBId : group.nodeAId;
    visited.add(currentKey);
    segments.push({ key: currentKey, fromNodeId: currentNodeId, toNodeId: nextNodeId });
    nodes.push(nextNodeId);
    currentNodeId = nextNodeId;
    if ((degreeByNode.get(currentNodeId) || 0) !== 2) {
      break;
    }
    const links = adjacency.get(currentNodeId) || [];
    const candidates = links.filter((link) => link.key !== currentKey && !visited.has(link.key));
    if (!candidates.length) {
      break;
    }
    candidates.sort((a, b) => a.key.localeCompare(b.key));
    currentKey = candidates[0].key;
  }
  return { nodes, segments, cycle: false };
}

function walkCycle(startKey, adjacency, groupsByKey, visited) {
  const startGroup = groupsByKey.get(startKey);
  const startNodeId = startGroup.nodeAId;
  const nodes = [startNodeId];
  const segments = [];
  let currentNodeId = startNodeId;
  let currentKey = startKey;
  while (currentKey) {
    const group = groupsByKey.get(currentKey);
    const nextNodeId = group.nodeAId === currentNodeId ? group.nodeBId : group.nodeAId;
    visited.add(currentKey);
    segments.push({ key: currentKey, fromNodeId: currentNodeId, toNodeId: nextNodeId });
    nodes.push(nextNodeId);
    currentNodeId = nextNodeId;
    if (currentNodeId === startNodeId) {
      break;
    }
    const links = adjacency.get(currentNodeId) || [];
    const candidates = links.filter((link) => link.key !== currentKey && !visited.has(link.key));
    if (!candidates.length) {
      break;
    }
    candidates.sort((a, b) => a.key.localeCompare(b.key));
    currentKey = candidates[0].key;
  }
  if (nodes.length > 1 && nodes[0] === nodes[nodes.length - 1]) {
    nodes.pop();
  }
  if (nodes.length > 1) {
    let minIndex = 0;
    for (let i = 1; i < nodes.length; i += 1) {
      if (nodes[i] < nodes[minIndex]) {
        minIndex = i;
      }
    }
    if (minIndex > 0) {
      const rotatedNodes = nodes.slice(minIndex).concat(nodes.slice(0, minIndex));
      const rotatedSegments = segments.slice(minIndex).concat(segments.slice(0, minIndex));
      return { nodes: rotatedNodes, segments: rotatedSegments, cycle: true };
    }
  }
  return { nodes, segments, cycle: true };
}

function buildCorridorEntries(sceneGraph) {
  const edges = Array.isArray(sceneGraph?.edges) ? sceneGraph.edges : [];
  const { groupsByKey } = buildEdgeGroups(edges);
  const adjacency = buildAdjacency(groupsByKey);
  const degreeByNode = new Map();
  for (const [nodeId, links] of adjacency.entries()) {
    degreeByNode.set(nodeId, links.length);
  }

  const visited = new Set();
  const entries = [];
  const nodeIds = Array.from(adjacency.keys()).sort();
  for (const nodeId of nodeIds) {
    if ((degreeByNode.get(nodeId) || 0) === 2) continue;
    const links = adjacency.get(nodeId) || [];
    for (const link of links) {
      if (visited.has(link.key)) continue;
      const corridorPath = walkCorridor(nodeId, link.key, adjacency, groupsByKey, degreeByNode, visited);
      entries.push(corridorPath);
    }
  }

  const groupKeys = Array.from(groupsByKey.keys()).sort();
  for (const key of groupKeys) {
    if (visited.has(key)) continue;
    const cyclePath = walkCycle(key, adjacency, groupsByKey, visited);
    entries.push(cyclePath);
  }

  return { entries, groupsByKey };
}

function buildCorridorPolyline(segments, params) {
  const polylines = [];
  for (const segment of segments) {
    const polyline = buildEdgePolyline(segment.edge, params);
    if (!polyline) return null;
    let oriented = polyline;
    if (!segment.aligned && MotionKernel.reversePolyline) {
      oriented = MotionKernel.reversePolyline(polyline);
    } else if (!segment.aligned) {
      oriented = MotionKernel.buildPolyline(polyline.points.slice().reverse());
    }
    polylines.push(oriented);
  }
  if (!polylines.length) return null;
  const points = [];
  const eps = 1e-9;
  for (const poly of polylines) {
    if (!poly?.points?.length) continue;
    if (!points.length) {
      points.push(...poly.points);
      continue;
    }
    const last = points[points.length - 1];
    const first = poly.points[0];
    const dist = Math.hypot(last.x - first.x, last.y - first.y);
    if (dist < eps) {
      points.push(...poly.points.slice(1));
    } else {
      points.push(...poly.points);
    }
  }
  return MotionKernel.buildPolyline(points);
}

function buildCellSpans(segments, corridorS0M, corridorS1M) {
  const spans = [];
  const eps = 1e-6;
  for (const segment of segments) {
    const segS0 = segment.corridorS0M;
    const segS1 = segment.corridorS1M;
    const overlapS0 = Math.max(corridorS0M, segS0);
    const overlapS1 = Math.min(corridorS1M, segS1);
    if (overlapS1 <= overlapS0 + eps) continue;
    const segLen = segS1 - segS0;
    let edgeS0 = overlapS0 - segS0;
    let edgeS1 = overlapS1 - segS0;
    if (!segment.aligned) {
      edgeS0 = segLen - (overlapS1 - segS0);
      edgeS1 = segLen - (overlapS0 - segS0);
    }
    spans.push({
      edgeId: segment.edgeId,
      edgeS0M: edgeS0,
      edgeS1M: edgeS1
    });
  }
  return spans;
}

function movestyleForCorridorS(segments, corridorS, dir) {
  const eps = 1e-6;
  for (const segment of segments) {
    if (corridorS >= segment.corridorS0M - eps && corridorS <= segment.corridorS1M + eps) {
      return dir === 'A_TO_B' ? segment.forwardMoveStyle : segment.reverseMoveStyle;
    }
  }
  if (!segments.length) return 'forward';
  const tail = segments[segments.length - 1];
  return dir === 'A_TO_B' ? tail.forwardMoveStyle : tail.reverseMoveStyle;
}

function buildCellsForCorridor(corridor, dir, polyline, params, robotModel) {
  const cells = [];
  if (!polyline) return cells;
  const lengthM = corridor.lengthM;
  if (!Number.isFinite(lengthM) || lengthM <= 0) return cells;
  const cellLenM = params.cellLenM;
  const cellCount = Math.max(1, Math.ceil(lengthM / cellLenM));
  const eps = 1e-6;
  for (let index = 0; index < cellCount; index += 1) {
    const corridorS0M = index * cellLenM;
    const corridorS1M = Math.min(lengthM, corridorS0M + cellLenM);
    if (corridorS1M <= corridorS0M + eps) continue;
    const spans = buildCellSpans(corridor.segments, corridorS0M, corridorS1M);
    const movestyleAt =
      dir === 'A_TO_B'
        ? (s) => movestyleForCorridorS(corridor.segments, s, dir)
        : (s) => movestyleForCorridorS(corridor.segments, lengthM - s, dir);
    const [s0, s1] =
      dir === 'A_TO_B'
        ? [corridorS0M, corridorS1M]
        : [lengthM - corridorS1M, lengthM - corridorS0M];
    const sweptShape = computeSweptShape(polyline, s0, s1, movestyleAt, robotModel, params);
    cells.push({
      cellId: `${corridor.corridorId}#i=${index}#dir=${dir}`,
      corridorId: corridor.corridorId,
      dir,
      corridorS0M,
      corridorS1M,
      spans,
      sweptShape,
      conflictSet: []
    });
  }
  return cells;
}

function buildCanonicalCompiledMap(compiledMap) {
  const corridors = Array.isArray(compiledMap.corridors)
    ? [...compiledMap.corridors].sort((a, b) => a.corridorId.localeCompare(b.corridorId))
    : [];
  const cells = Array.isArray(compiledMap.cells)
    ? [...compiledMap.cells].sort((a, b) => a.cellId.localeCompare(b.cellId))
    : [];
  return {
    ...compiledMap,
    corridors,
    cells
  };
}

function computeCompiledMapHash(compiledMap) {
  const canonical = buildCanonicalCompiledMap(compiledMap);
  const payload = canonicalizeValue(canonical);
  const json = JSON.stringify(payload);
  const hash = crypto.createHash('sha256').update(json).digest('hex');
  return `sha256:${hash}`;
}

function buildCompiledMap(sceneGraph, { smapPath, robotModel, compileParams } = {}) {
  const parameters = normalizeCompileParams(compileParams);
  const model = normalizeRobotModel(robotModel);
  if (!model) {
    throw new Error('robot model is required (head/tail/width)');
  }

  const { entries, groupsByKey } = buildCorridorEntries(sceneGraph);
  const corridorEntries = [];

  for (const path of entries) {
    const nodes = path.nodes;
    if (!nodes.length) continue;
    let segments = path.segments;
    let orderedNodes = nodes;
    let aNodeId = nodes[0];
    let bNodeId = path.cycle ? nodes[0] : nodes[nodes.length - 1];

    if (!path.cycle && aNodeId > bNodeId) {
      const reversedNodes = nodes.slice().reverse();
      const reversedSegments = segments
        .slice()
        .reverse()
        .map((segment) => ({
          ...segment,
          fromNodeId: segment.toNodeId,
          toNodeId: segment.fromNodeId
        }));
      segments = reversedSegments;
      orderedNodes = reversedNodes;
      aNodeId = reversedNodes[0];
      bNodeId = reversedNodes[reversedNodes.length - 1];
    }

    const sequence = orderedNodes.join('|');
    const corridorHash = hash32Hex(sequence);
    const corridorId = `C:${aNodeId}\u2192${bNodeId}:${corridorHash}`;

    let cursor = 0;
    const internalSegments = [];
    for (const segment of segments) {
      const group = groupsByKey.get(segment.key);
      if (!group) continue;
      const forward = pickEdgeForDirection(group, segment.fromNodeId, segment.toNodeId);
      const reverse = pickEdgeForDirection(group, segment.toNodeId, segment.fromNodeId);
      const edge = forward?.edge || reverse?.edge || group.primaryEdge;
      if (!edge) continue;
      const lengthM = Number.isFinite(edge.lengthM) ? edge.lengthM : edgeLengthFallback(edge);
      const aligned = edge.startNodeId === segment.fromNodeId;
      internalSegments.push({
        edgeId: edge.edgeId,
        edge,
        corridorS0M: cursor,
        corridorS1M: cursor + lengthM,
        aligned,
        forwardMoveStyle: forward ? forward.movestyle : null,
        reverseMoveStyle: reverse ? reverse.movestyle : null
      });
      cursor += lengthM;
    }

    const corridor = {
      corridorId,
      aNodeId,
      bNodeId,
      lengthM: cursor,
      segments: internalSegments.map((segment) => ({
        edgeId: segment.edgeId,
        corridorS0M: segment.corridorS0M,
        corridorS1M: segment.corridorS1M,
        aligned: segment.aligned
      }))
    };

    corridorEntries.push({
      corridor,
      internalSegments
    });
  }

  corridorEntries.sort((a, b) => a.corridor.corridorId.localeCompare(b.corridor.corridorId));
  const corridors = corridorEntries.map((entry) => entry.corridor);

  const cells = [];
  for (const entry of corridorEntries) {
    const corridor = entry.corridor;
    const internalSegments = entry.internalSegments;
    const allowAToB = internalSegments.every((seg) => seg.forwardMoveStyle);
    const allowBToA = internalSegments.every((seg) => seg.reverseMoveStyle);
    const forwardPolyline = buildCorridorPolyline(
      internalSegments.map((segment) => ({ edge: segment.edge, aligned: segment.aligned })),
      parameters
    );
    const reversePolyline =
      forwardPolyline && MotionKernel.reversePolyline
        ? MotionKernel.reversePolyline(forwardPolyline)
        : forwardPolyline;
    const cellSegments = internalSegments.map((segment) => ({
      edgeId: segment.edgeId,
      corridorS0M: segment.corridorS0M,
      corridorS1M: segment.corridorS1M,
      aligned: segment.aligned,
      forwardMoveStyle: segment.forwardMoveStyle,
      reverseMoveStyle: segment.reverseMoveStyle
    }));
    const corridorMeta = { ...corridor, segments: cellSegments };

    if (allowAToB) {
      cells.push(...buildCellsForCorridor(corridorMeta, 'A_TO_B', forwardPolyline, parameters, model));
    }
    if (allowBToA) {
      cells.push(...buildCellsForCorridor(corridorMeta, 'B_TO_A', reversePolyline, parameters, model));
    }
  }

  buildConflictSets(cells, parameters);
  cells.sort((a, b) => a.cellId.localeCompare(b.cellId));

  const compiledMap = {
    compiledMapVersion: '0.1.0',
    source: { smapPath },
    parameters,
    corridors,
    cells
  };
  const compiledMapHash = computeCompiledMapHash(compiledMap);
  compiledMap.meta = { compiledMapHash };
  return compiledMap;
}

module.exports = {
  buildCompiledMap,
  normalizeCompileParams
};
