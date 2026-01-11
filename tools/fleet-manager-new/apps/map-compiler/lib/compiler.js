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
  tangentEpsRad: 0.0873,
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
    tangentEpsRad: Number.isFinite(merged.tangentEpsRad)
      ? merged.tangentEpsRad
      : Number.isFinite(merged.tangentEps)
        ? merged.tangentEps
        : DEFAULT_PARAMS.tangentEpsRad,
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
  const text = typeof raw === 'string' ? raw.trim().toLowerCase() : null;
  if (text) {
    if (text === 'bidirectional' || text === 'both') {
      return { forward: true, reverse: true };
    }
    if (text === 'forward' || text === 'forwardonly' || text === 'a_to_b') {
      return { forward: true, reverse: false };
    }
    if (text === 'reverse' || text === 'backward' || text === 'backwardonly' || text === 'b_to_a') {
      return { forward: false, reverse: true };
    }
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

function normalizePoint(point) {
  if (!point) return null;
  const x = Number(point.xM ?? point.x);
  const y = Number(point.yM ?? point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { xM: x, yM: y };
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
  const normalized = normalizePoint(point);
  if (!normalized) return null;
  return { x: normalized.xM, y: normalized.yM };
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

function buildEdgeSamples(edge, params) {
  const polyline = buildEdgePolyline(edge, params);
  if (!polyline) {
    const lengthM = edgeLengthFallback(edge);
    const points = edge?.p0 && edge?.p3 ? [edge.p0, edge.p3] : [];
    return {
      polyline: null,
      lengthM,
      samples: points.length
        ? {
            arcLengthM: lengthM,
            stepM: params.arcLutStepM || DEFAULT_PARAMS.arcLutStepM,
            points: points.map((pt) => ({ xM: pt.xM, yM: pt.yM }))
          }
        : null
    };
  }
  const points = polyline.points.map((pt) => ({ xM: pt.x, yM: pt.y }));
  const lengthM = polyline.totalLength;
  return {
    polyline,
    lengthM,
    samples: {
      arcLengthM: lengthM,
      stepM: params.arcLutStepM || DEFAULT_PARAMS.arcLutStepM,
      points
    }
  };
}

function resolveForbiddenRotAngleRad(props) {
  if (!props || typeof props !== 'object') return undefined;
  const raw =
    props.forbiddenRotAngleRad ??
    props.forbiddenRotAngle ??
    props.forbidden_rot_angle ??
    props.forbiddenRotAngleDeg;
  if (!Number.isFinite(raw)) return undefined;
  const abs = Math.abs(raw);
  if (abs > Math.PI * 2 + 1e-3) {
    return MotionKernel?.toRad ? MotionKernel.toRad(raw) : (raw * Math.PI) / 180;
  }
  return raw;
}

function buildEdgePropsCompiled(edge, lengthM) {
  const flags = edgeDirectionFlags(edge);
  let direction = 'bidirectional';
  if (flags.forward && !flags.reverse) {
    direction = 'forwardOnly';
  } else if (!flags.forward && flags.reverse) {
    direction = 'backwardOnly';
  }
  const props = edge?.props || {};
  const rawWidth =
    props.corridorWidthM ??
    props.corridorWidth ??
    props.widthM ??
    props.width ??
    props.corridor_width;
  const corridorWidthM = Number.isFinite(rawWidth) ? Number(rawWidth) : undefined;
  const forbiddenRotAngleRad = resolveForbiddenRotAngleRad(props);
  const result = {
    direction,
    lengthM
  };
  if (Number.isFinite(corridorWidthM)) {
    result.corridorWidthM = corridorWidthM;
  }
  if (Number.isFinite(forbiddenRotAngleRad)) {
    result.forbiddenRotAngleRad = forbiddenRotAngleRad;
  }
  return result;
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

function buildSpatialIndex(cells, gridSize) {
  const size = Number.isFinite(gridSize) && gridSize > 0 ? gridSize : 1;
  const buckets = new Map();
  cells.forEach((cell, index) => {
    const bbox = cell?.sweptShape?.bbox;
    if (!bbox) return;
    const minX = Math.floor(bbox.minXM / size);
    const maxX = Math.floor(bbox.maxXM / size);
    const minY = Math.floor(bbox.minYM / size);
    const maxY = Math.floor(bbox.maxYM / size);
    for (let gx = minX; gx <= maxX; gx += 1) {
      for (let gy = minY; gy <= maxY; gy += 1) {
        const key = `${gx},${gy}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(index);
      }
    }
  });
  return { size, buckets };
}

function querySpatialIndex(index, bbox) {
  if (!index || !bbox) return [];
  const { size, buckets } = index;
  const minX = Math.floor(bbox.minXM / size);
  const maxX = Math.floor(bbox.maxXM / size);
  const minY = Math.floor(bbox.minYM / size);
  const maxY = Math.floor(bbox.maxYM / size);
  const result = new Set();
  for (let gx = minX; gx <= maxX; gx += 1) {
    for (let gy = minY; gy <= maxY; gy += 1) {
      const key = `${gx},${gy}`;
      const bucket = buckets.get(key);
      if (!bucket) continue;
      for (const idx of bucket) {
        result.add(idx);
      }
    }
  }
  return Array.from(result);
}

function buildConflictSets(cells, params, spatialIndex) {
  const list = Array.isArray(cells) ? [...cells] : [];
  list.sort((a, b) => a.cellId.localeCompare(b.cellId));
  const cellById = new Map();
  list.forEach((cell) => {
    if (cell?.cellId) {
      cell.conflictSet = [cell.cellId];
      cellById.set(cell.cellId, cell);
    }
  });

  const gridSize = Math.max(params.cellLenM || 1, 0.5);
  const index = spatialIndex || buildSpatialIndex(list, gridSize);
  const eps = params.geomEpsM;
  for (let i = 0; i < list.length; i += 1) {
    const cellA = list[i];
    if (!cellA?.cellId) continue;
    const candidates = querySpatialIndex(index, cellA?.sweptShape?.bbox);
    candidates.sort((a, b) => a - b);
    for (const j of candidates) {
      if (j <= i) continue;
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

  return { cellById, spatialIndex: index };
}

function circleBbox(circle) {
  return {
    minXM: circle.xM - circle.radiusM,
    minYM: circle.yM - circle.radiusM,
    maxXM: circle.xM + circle.radiusM,
    maxYM: circle.yM + circle.radiusM
  };
}

function circleIntersectsRect(circle, rect, eps) {
  const angle = Number.isFinite(rect.angleRad) ? rect.angleRad : 0;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = circle.xM - rect.cxM;
  const dy = circle.yM - rect.cyM;
  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;
  const distX = Math.abs(localX) - rect.hxM;
  const distY = Math.abs(localY) - rect.hyM;
  const clampedX = Math.max(distX, 0);
  const clampedY = Math.max(distY, 0);
  const radius = circle.radiusM + (Number.isFinite(eps) ? eps : DEFAULT_PARAMS.geomEpsM);
  return clampedX * clampedX + clampedY * clampedY <= radius * radius;
}

function cellIntersectsCircle(cell, circle, eps) {
  const bbox = cell?.sweptShape?.bbox;
  if (!bbox) return false;
  const circleBox = circleBbox(circle);
  if (!bboxIntersects(bbox, circleBox)) return false;
  const rects = Array.isArray(cell?.sweptShape?.rects) ? cell.sweptShape.rects : [];
  for (const rect of rects) {
    if (circleIntersectsRect(circle, rect, eps)) return true;
  }
  return false;
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

function unitVector(dx, dy) {
  const len = Math.hypot(dx, dy);
  if (!Number.isFinite(len) || len <= 1e-9) return { x: 0, y: 0, valid: false };
  return { x: dx / len, y: dy / len, valid: true };
}

function computeEdgeTangent(edge, atStart, reverse) {
  let dx = 0;
  let dy = 0;
  if (atStart) {
    dx = edge.p1.xM - edge.p0.xM;
    dy = edge.p1.yM - edge.p0.yM;
  } else {
    dx = edge.p3.xM - edge.p2.xM;
    dy = edge.p3.yM - edge.p2.yM;
  }
  const fallback = unitVector(edge.p3.xM - edge.p0.xM, edge.p3.yM - edge.p0.yM);
  const base = unitVector(dx, dy);
  let vec = base.valid ? base : fallback;
  if (reverse) {
    vec = { x: -vec.x, y: -vec.y, valid: vec.valid };
  }
  return vec;
}

function buildDirectedEdges(edges) {
  const directed = [];
  for (const edge of edges) {
    if (!edge?.edgeId || !edge.startNodeId || !edge.endNodeId) continue;
    const flags = edgeDirectionFlags(edge);
    const baseStyle = normalizeMoveStyle(edge?.props?.movestyle ?? edge?.props?.moveStyle);
    if (flags.forward) {
      directed.push({
        edgeId: edge.edgeId,
        edgeDir: 'forward',
        startNodeId: edge.startNodeId,
        endNodeId: edge.endNodeId,
        movestyle: baseStyle,
        tangentAtStart: computeEdgeTangent(edge, true, false),
        tangentAtEnd: computeEdgeTangent(edge, false, false)
      });
    }
    if (flags.reverse) {
      directed.push({
        edgeId: edge.edgeId,
        edgeDir: 'reverse',
        startNodeId: edge.endNodeId,
        endNodeId: edge.startNodeId,
        movestyle: invertMoveStyle(baseStyle),
        tangentAtStart: computeEdgeTangent(edge, false, true),
        tangentAtEnd: computeEdgeTangent(edge, true, true)
      });
    }
  }
  return directed;
}

function classifyTransitions(nodes, edges, params) {
  const directed = buildDirectedEdges(edges);
  const incoming = new Map();
  const outgoing = new Map();

  const add = (map, nodeId, entry) => {
    if (!map.has(nodeId)) map.set(nodeId, []);
    map.get(nodeId).push(entry);
  };

  for (const entry of directed) {
    add(outgoing, entry.startNodeId, entry);
    add(incoming, entry.endNodeId, entry);
  }

  const tangentEps = params.tangentEpsRad ?? DEFAULT_PARAMS.tangentEpsRad;
  const transitions = [];
  const nodeIds = nodes.map((node) => node.nodeId).sort();
  for (const nodeId of nodeIds) {
    const inList = incoming.get(nodeId) || [];
    const outList = outgoing.get(nodeId) || [];
    for (const inEdge of inList) {
      for (const outEdge of outList) {
        let kind = 'NON_TANGENT';
        if (inEdge.tangentAtEnd.valid && outEdge.tangentAtStart.valid) {
          const angleIn = Math.atan2(inEdge.tangentAtEnd.y, inEdge.tangentAtEnd.x);
          const angleOut = Math.atan2(outEdge.tangentAtStart.y, outEdge.tangentAtStart.x);
          const diff = Math.abs(normalizeAngle(angleOut - angleIn));
          const movestyleOk = inEdge.movestyle === outEdge.movestyle;
          if (diff <= tangentEps && movestyleOk) {
            kind = 'TANGENT';
          }
        }
        transitions.push({
          nodeId,
          inEdgeId: inEdge.edgeId,
          outEdgeId: outEdge.edgeId,
          inEdgeDir: inEdge.edgeDir,
          outEdgeDir: outEdge.edgeDir,
          transitionGeomKind: kind
        });
      }
    }
  }
  transitions.sort((a, b) => {
    if (a.nodeId !== b.nodeId) return a.nodeId.localeCompare(b.nodeId);
    if (a.inEdgeId !== b.inEdgeId) return a.inEdgeId.localeCompare(b.inEdgeId);
    if (a.outEdgeId !== b.outEdgeId) return a.outEdgeId.localeCompare(b.outEdgeId);
    if (a.inEdgeDir !== b.inEdgeDir) return a.inEdgeDir.localeCompare(b.inEdgeDir);
    return a.outEdgeDir.localeCompare(b.outEdgeDir);
  });
  return transitions;
}

function computeNodeStopZoneRadius(robotModel) {
  const frontExt = robotModel.head + robotModel.safetyFront;
  const rearExt = robotModel.tail + robotModel.safetyRear;
  const sideExt = robotModel.width / 2 + robotModel.safetySide;
  const rFront = Math.hypot(frontExt, sideExt);
  const rRear = Math.hypot(rearExt, sideExt);
  const rTurn = Math.max(rFront, rRear);
  return rTurn + robotModel.poseMargin + robotModel.trackingMargin;
}

function buildNodeStopZones(nodes, cells, params, robotModel, spatialIndex) {
  const zones = [];
  const radiusM = computeNodeStopZoneRadius(robotModel);
  const eps = params.geomEpsM;
  const gridSize = Math.max(params.cellLenM || 1, 0.5);
  const index = spatialIndex || buildSpatialIndex(cells, gridSize);
  for (const node of nodes) {
    const pos = node?.pos;
    if (!pos || !Number.isFinite(pos.xM) || !Number.isFinite(pos.yM)) continue;
    const circle = { xM: pos.xM, yM: pos.yM, radiusM };
    const candidates = querySpatialIndex(index, circleBbox(circle));
    const conflictCells = [];
    for (const idx of candidates) {
      const cell = cells[idx];
      if (!cell?.cellId) continue;
      if (cellIntersectsCircle(cell, circle, eps)) {
        conflictCells.push(cell.cellId);
      }
    }
    conflictCells.sort();
    zones.push({
      nodeId: node.nodeId,
      radiusM,
      capacity: 1,
      conflictCells
    });
  }
  zones.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  return zones;
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
    const segLenCanonical = segS1 - segS0;
    const segLenActual = Number.isFinite(segment.lengthM) ? segment.lengthM : segLenCanonical;
    const scale = segLenCanonical > eps ? segLenActual / segLenCanonical : 1;
    let edgeS0 = (overlapS0 - segS0) * scale;
    let edgeS1 = (overlapS1 - segS0) * scale;
    if (!segment.aligned) {
      edgeS0 = segLenActual - (overlapS1 - segS0) * scale;
      edgeS1 = segLenActual - (overlapS0 - segS0) * scale;
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

function buildMappingSegments(segments) {
  const mapped = [];
  let cursor = 0;
  for (const segment of segments) {
    const segLenCanonical = segment.corridorS1M - segment.corridorS0M;
    const segLenActual = Number.isFinite(segment.lengthM) ? segment.lengthM : segLenCanonical;
    mapped.push({
      ...segment,
      mapS0M: cursor,
      mapS1M: cursor + segLenActual,
      lengthM: segLenActual
    });
    cursor += segLenActual;
  }
  return mapped;
}

function mapCorridorDistance(mappedSegments, corridorS) {
  if (!mappedSegments || !mappedSegments.length) return corridorS;
  const eps = 1e-6;
  for (const segment of mappedSegments) {
    if (corridorS >= segment.corridorS0M - eps && corridorS <= segment.corridorS1M + eps) {
      const segLenCanonical = segment.corridorS1M - segment.corridorS0M;
      if (segLenCanonical <= eps) return segment.mapS0M;
      const ratio = segment.lengthM / segLenCanonical;
      const offset = corridorS - segment.corridorS0M;
      return segment.mapS0M + offset * ratio;
    }
  }
  const last = mappedSegments[mappedSegments.length - 1];
  if (corridorS <= mappedSegments[0].corridorS0M) return mappedSegments[0].mapS0M;
  return last.mapS1M;
}

function mapPolylineDistance(mappedSegments, polylineS) {
  if (!mappedSegments || !mappedSegments.length) return polylineS;
  const eps = 1e-6;
  for (const segment of mappedSegments) {
    if (polylineS >= segment.mapS0M - eps && polylineS <= segment.mapS1M + eps) {
      const segLenActual = segment.mapS1M - segment.mapS0M;
      if (segLenActual <= eps) return segment.corridorS0M;
      const ratio = (segment.corridorS1M - segment.corridorS0M) / segLenActual;
      const offset = polylineS - segment.mapS0M;
      return segment.corridorS0M + offset * ratio;
    }
  }
  const last = mappedSegments[mappedSegments.length - 1];
  if (polylineS <= mappedSegments[0].mapS0M) return mappedSegments[0].corridorS0M;
  return last.corridorS1M;
}

function buildCellsForCorridor(corridor, dir, polyline, params, robotModel, options = {}) {
  const cells = [];
  if (!polyline) return cells;
  const lengthM = Number.isFinite(options.lengthM) ? options.lengthM : corridor.lengthM;
  if (!Number.isFinite(lengthM) || lengthM <= 0) return cells;
  const cellLenM = params.cellLenM;
  const cellCount = Math.max(1, Math.ceil(lengthM / cellLenM));
  const eps = 1e-6;
  const spanSegments = options.spanSegments || corridor.segments || [];
  const mapSegments = options.mapSegments || null;
  const polylineToCorridor = mapSegments
    ? (s) => mapPolylineDistance(mapSegments, s)
    : (s) => s;
  for (let index = 0; index < cellCount; index += 1) {
    const corridorS0M = index * cellLenM;
    const corridorS1M = Math.min(lengthM, corridorS0M + cellLenM);
    if (corridorS1M <= corridorS0M + eps) continue;
    const spans = buildCellSpans(spanSegments, corridorS0M, corridorS1M);
    const movestyleAt =
      dir === 'A_TO_B'
        ? (s) => movestyleForCorridorS(corridor.segments, polylineToCorridor(s), dir)
        : (s) =>
            movestyleForCorridorS(corridor.segments, lengthM - polylineToCorridor(s), dir);
    let s0 = corridorS0M;
    let s1 = corridorS1M;
    if (dir === 'B_TO_A') {
      s0 = lengthM - corridorS1M;
      s1 = lengthM - corridorS0M;
    }
    if (mapSegments) {
      s0 = mapCorridorDistance(mapSegments, s0);
      s1 = mapCorridorDistance(mapSegments, s1);
    }
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

function normalizeSceneGraph(sceneGraph, params) {
  const parameters = normalizeCompileParams(params);
  const rawNodes = Array.isArray(sceneGraph?.nodes) ? sceneGraph.nodes : [];
  const rawEdges = Array.isArray(sceneGraph?.edges) ? sceneGraph.edges : [];
  const nodes = [];
  const edges = [];
  const nodeById = new Map();

  for (const raw of rawNodes) {
    const nodeId = raw.nodeId || raw.id;
    const pos = normalizePoint(raw.pos || raw.position);
    if (!nodeId || !pos) {
      throw new Error('invalid node: missing nodeId or position');
    }
    if (nodeById.has(nodeId)) {
      throw new Error(`duplicate nodeId: ${nodeId}`);
    }
    const node = { ...raw, nodeId, pos };
    nodes.push(node);
    nodeById.set(nodeId, node);
  }

  for (const raw of rawEdges) {
    const edgeId = raw.edgeId || raw.id;
    const startNodeId = raw.startNodeId || raw.start;
    const endNodeId = raw.endNodeId || raw.end;
    if (!edgeId || !startNodeId || !endNodeId) {
      throw new Error('invalid edge: missing edgeId or endpoints');
    }
    if (!nodeById.has(startNodeId) || !nodeById.has(endNodeId)) {
      throw new Error(`dangling edge ${edgeId}: missing node reference`);
    }
    const p0 = normalizePoint(raw.p0 || raw.geometry?.p0 || raw.startPos);
    const p3 = normalizePoint(raw.p3 || raw.geometry?.p3 || raw.endPos);
    if (!p0 || !p3) {
      throw new Error(`invalid edge ${edgeId}: missing geometry endpoints`);
    }
    const p1 = normalizePoint(raw.p1 || raw.geometry?.p1) || p0;
    const p2 = normalizePoint(raw.p2 || raw.geometry?.p2) || p3;
    const props = raw.props || {};
    const direction = props.direction;
    if (direction !== undefined && direction !== null) {
      const directionNum = Number(direction);
      if (Number.isFinite(directionNum)) {
        if (![0, 1, 2, -1].includes(directionNum)) {
          throw new Error(`invalid direction on edge ${edgeId}: ${direction}`);
        }
      } else {
        const directionText = String(direction).trim().toLowerCase();
        const validText = [
          'bidirectional',
          'forward',
          'forwardonly',
          'reverse',
          'backward',
          'backwardonly'
        ];
        if (!validText.includes(directionText)) {
          throw new Error(`invalid direction on edge ${edgeId}: ${direction}`);
        }
      }
    }
    const edge = {
      ...raw,
      edgeId,
      startNodeId,
      endNodeId,
      p0,
      p1,
      p2,
      p3,
      props
    };
    const { lengthM, samples } = buildEdgeSamples(edge, parameters);
    if (!Number.isFinite(lengthM) || lengthM <= 0) {
      throw new Error(`invalid edge length: ${edgeId}`);
    }
    const propsCompiled = buildEdgePropsCompiled(edge, lengthM);
    edges.push({
      ...edge,
      lengthM,
      samples,
      propsCompiled
    });
  }

  nodes.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  edges.sort((a, b) => a.edgeId.localeCompare(b.edgeId));

  const normalized = { nodes, edges };
  Object.defineProperty(normalized, '__normalized', { value: true });
  return normalized;
}

function buildCanonicalCompiledMap(compiledMap) {
  const nodes = Array.isArray(compiledMap.nodes)
    ? [...compiledMap.nodes].sort((a, b) => a.nodeId.localeCompare(b.nodeId))
    : [];
  const edges = Array.isArray(compiledMap.edges)
    ? [...compiledMap.edges].sort((a, b) => a.edgeId.localeCompare(b.edgeId))
    : [];
  const corridors = Array.isArray(compiledMap.corridors)
    ? [...compiledMap.corridors].sort((a, b) => a.corridorId.localeCompare(b.corridorId))
    : [];
  const cells = Array.isArray(compiledMap.cells)
    ? [...compiledMap.cells].sort((a, b) => a.cellId.localeCompare(b.cellId))
    : [];
  const nodeStopZones = Array.isArray(compiledMap.nodeStopZones)
    ? [...compiledMap.nodeStopZones].sort((a, b) => a.nodeId.localeCompare(b.nodeId))
    : [];
  const transitions = Array.isArray(compiledMap.transitions)
    ? [...compiledMap.transitions].sort((a, b) => {
        if (a.nodeId !== b.nodeId) return a.nodeId.localeCompare(b.nodeId);
        if (a.inEdgeId !== b.inEdgeId) return a.inEdgeId.localeCompare(b.inEdgeId);
        if (a.outEdgeId !== b.outEdgeId) return a.outEdgeId.localeCompare(b.outEdgeId);
        if (a.inEdgeDir !== b.inEdgeDir) return a.inEdgeDir.localeCompare(b.inEdgeDir);
        return a.outEdgeDir.localeCompare(b.outEdgeDir);
      })
    : [];
  return {
    ...compiledMap,
    nodes,
    edges,
    corridors,
    cells,
    nodeStopZones,
    transitions
  };
}

function computeCompiledMapHash(compiledMap) {
  const canonical = buildCanonicalCompiledMap(compiledMap);
  const payload = canonicalizeValue(canonical);
  const json = JSON.stringify(payload);
  const hash = crypto.createHash('sha256').update(json).digest('hex');
  return `sha256:${hash}`;
}

function computeParamsHash(parameters, robotModel) {
  const payload = canonicalizeValue({ parameters, robotModel });
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

  const normalizedScene =
    sceneGraph && sceneGraph.__normalized ? sceneGraph : normalizeSceneGraph(sceneGraph, parameters);

  const { entries, groupsByKey } = buildCorridorEntries(normalizedScene);
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

    const segmentInfos = [];
    for (const segment of segments) {
      const group = groupsByKey.get(segment.key);
      if (!group) continue;
      const forward = pickEdgeForDirection(group, segment.fromNodeId, segment.toNodeId);
      const reverse = pickEdgeForDirection(group, segment.toNodeId, segment.fromNodeId);
      const forwardEdge = forward?.edge || null;
      const reverseEdge = reverse?.edge || null;
      const fallbackEdge = forwardEdge || reverseEdge || group.primaryEdge || null;
      const forwardLengthM = forwardEdge
        ? Number.isFinite(forwardEdge.lengthM)
          ? forwardEdge.lengthM
          : edgeLengthFallback(forwardEdge)
        : null;
      const reverseLengthM = reverseEdge
        ? Number.isFinite(reverseEdge.lengthM)
          ? reverseEdge.lengthM
          : edgeLengthFallback(reverseEdge)
        : null;
      const fallbackLengthM = fallbackEdge
        ? Number.isFinite(fallbackEdge.lengthM)
          ? fallbackEdge.lengthM
          : edgeLengthFallback(fallbackEdge)
        : null;
      segmentInfos.push({
        segment,
        forward,
        reverse,
        forwardEdge,
        reverseEdge,
        forwardLengthM,
        reverseLengthM,
        fallbackEdge,
        fallbackLengthM
      });
    }

    const allowAToB = segmentInfos.length > 0 && segmentInfos.every((info) => info.forwardEdge);
    const allowBToA = segmentInfos.length > 0 && segmentInfos.every((info) => info.reverseEdge);
    const corridorDirection = allowAToB ? 'A_TO_B' : allowBToA ? 'B_TO_A' : 'MIXED';

    let cursor = 0;
    const internalSegments = [];
    for (const info of segmentInfos) {
      const segment = info.segment;
      let edge = null;
      let lengthM = null;
      if (corridorDirection === 'A_TO_B') {
        edge = info.forwardEdge;
        lengthM = info.forwardLengthM;
      } else if (corridorDirection === 'B_TO_A') {
        edge = info.reverseEdge;
        lengthM = info.reverseLengthM;
      } else {
        edge = info.forwardEdge || info.reverseEdge || info.fallbackEdge;
        lengthM =
          info.forwardLengthM ??
          info.reverseLengthM ??
          info.fallbackLengthM ??
          (edge ? edgeLengthFallback(edge) : null);
      }
      if (!edge) continue;
      if (!Number.isFinite(lengthM)) {
        lengthM = edgeLengthFallback(edge);
      }
      const aligned = edge.startNodeId === segment.fromNodeId;
      internalSegments.push({
        edgeId: edge.edgeId,
        edge,
        corridorS0M: cursor,
        corridorS1M: cursor + lengthM,
        aligned,
        fromNodeId: segment.fromNodeId,
        toNodeId: segment.toNodeId,
        forwardEdge: info.forwardEdge,
        reverseEdge: info.reverseEdge,
        forwardAligned: info.forward ? info.forward.aligned : null,
        reverseAligned: info.reverse ? info.reverse.aligned : null,
        forwardLengthM: info.forwardLengthM,
        reverseLengthM: info.reverseLengthM,
        forwardMoveStyle: info.forward ? info.forward.movestyle : null,
        reverseMoveStyle: info.reverse ? info.reverse.movestyle : null
      });
      cursor += lengthM;
    }

    const passingPlace = internalSegments.some((segment) => {
      const props = segment.edge?.props || {};
      return props.passingPlace === true || props.passingPlace === 1 || props.passing_place === true;
    });

    const corridor = {
      corridorId,
      aNodeId,
      bNodeId,
      lengthM: cursor,
      singleLane: !passingPlace,
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
    const allowAToB = internalSegments.length > 0 && internalSegments.every((seg) => seg.forwardMoveStyle);
    const allowBToA = internalSegments.length > 0 && internalSegments.every((seg) => seg.reverseMoveStyle);
    const forwardPolyline = allowAToB
      ? buildCorridorPolyline(
          internalSegments.map((segment) => ({
            edge: segment.forwardEdge,
            aligned: segment.forwardAligned
          })),
          parameters
        )
      : null;
    const reversePolyline = allowBToA
      ? buildCorridorPolyline(
          internalSegments
            .slice()
            .reverse()
            .map((segment) => ({
              edge: segment.reverseEdge,
              aligned: segment.reverseAligned
            })),
          parameters
        )
      : null;
    const cellSegments = internalSegments.map((segment) => ({
      edgeId: segment.edgeId,
      corridorS0M: segment.corridorS0M,
      corridorS1M: segment.corridorS1M,
      aligned: segment.aligned,
      forwardMoveStyle: segment.forwardMoveStyle,
      reverseMoveStyle: segment.reverseMoveStyle
    }));
    const corridorMeta = { ...corridor, segments: cellSegments };

    const forwardSpanSegments = allowAToB
      ? internalSegments.map((segment) => ({
          edgeId: segment.forwardEdge?.edgeId,
          corridorS0M: segment.corridorS0M,
          corridorS1M: segment.corridorS1M,
          aligned: segment.forwardAligned,
          lengthM: segment.forwardLengthM
        }))
      : null;
    const forwardMapSegments = allowAToB ? buildMappingSegments(forwardSpanSegments) : null;

    const reverseSpanSegments = allowBToA
      ? internalSegments.map((segment) => ({
          edgeId: segment.reverseEdge?.edgeId,
          corridorS0M: segment.corridorS0M,
          corridorS1M: segment.corridorS1M,
          aligned: segment.reverseEdge ? segment.reverseEdge.startNodeId === segment.fromNodeId : null,
          lengthM: segment.reverseLengthM
        }))
      : null;
    const reverseMapSegments =
      allowBToA && reverseSpanSegments
        ? buildMappingSegments(
            reverseSpanSegments
              .slice()
              .reverse()
              .map((segment) => ({
                ...segment,
                corridorS0M: corridor.lengthM - segment.corridorS1M,
                corridorS1M: corridor.lengthM - segment.corridorS0M
              }))
          )
        : null;

    if (allowAToB) {
      cells.push(
        ...buildCellsForCorridor(corridorMeta, 'A_TO_B', forwardPolyline, parameters, model, {
          spanSegments: forwardSpanSegments,
          mapSegments: forwardMapSegments
        })
      );
    }
    if (allowBToA) {
      cells.push(
        ...buildCellsForCorridor(corridorMeta, 'B_TO_A', reversePolyline, parameters, model, {
          spanSegments: reverseSpanSegments,
          mapSegments: reverseMapSegments
        })
      );
    }
  }

  cells.sort((a, b) => a.cellId.localeCompare(b.cellId));
  const gridSize = Math.max(parameters.cellLenM || 1, 0.5);
  const spatialIndex = buildSpatialIndex(cells, gridSize);
  buildConflictSets(cells, parameters, spatialIndex);

  const nodeStopZones = buildNodeStopZones(
    normalizedScene.nodes,
    cells,
    parameters,
    model,
    spatialIndex
  );
  const transitions = classifyTransitions(normalizedScene.nodes, normalizedScene.edges, parameters);

  const compiledMap = {
    compiledMapVersion: '0.5.0',
    source: { smapPath },
    parameters,
    nodes: normalizedScene.nodes,
    edges: normalizedScene.edges,
    corridors,
    cells,
    nodeStopZones,
    transitions
  };
  const paramsHash = computeParamsHash(parameters, model);
  const compiledMapHash = computeCompiledMapHash(compiledMap);
  compiledMap.meta = { compiledMapHash, paramsHash, compileParams: parameters };
  return compiledMap;
}

module.exports = {
  buildCompiledMap,
  normalizeSceneGraph,
  normalizeCompileParams
};
