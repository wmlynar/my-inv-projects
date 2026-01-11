const fs = require('fs');
const path = require('path');
const MotionKernel = require('../../../packages/robokit-lib/motion_kernel');

const NODE_TYPE_MAP = {
  LocationMark: 'locationMark',
  ActionPoint: 'actionPoint',
  ChargePoint: 'chargePoint',
  ParkPoint: 'parkPoint'
};

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function normalizeNodeType(className) {
  const name = String(className || '').trim();
  if (!name) return 'unknown';
  if (NODE_TYPE_MAP[name]) return NODE_TYPE_MAP[name];
  return name[0].toLowerCase() + name.slice(1);
}

function decodeBase64(value) {
  if (!value) return null;
  try {
    return Buffer.from(String(value), 'base64').toString('utf8');
  } catch (_err) {
    return null;
  }
}

function readPropertyValue(prop) {
  if (prop == null || typeof prop !== 'object') return undefined;
  if (prop.int32Value !== undefined) return prop.int32Value;
  if (prop.doubleValue !== undefined) return prop.doubleValue;
  if (prop.boolValue !== undefined) return prop.boolValue;
  if (prop.stringValue !== undefined) return prop.stringValue;
  if (!prop.value) return undefined;
  const decoded = decodeBase64(prop.value);
  if (decoded == null) return undefined;
  const type = String(prop.type || '').toLowerCase();
  if (type.includes('int')) {
    const parsed = Number.parseInt(decoded, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (type.includes('double') || type.includes('float')) {
    const parsed = Number.parseFloat(decoded);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (type.includes('bool')) {
    if (decoded === 'true') return true;
    if (decoded === 'false') return false;
    return undefined;
  }
  return decoded;
}

function parseProperties(entries) {
  const props = {};
  if (!Array.isArray(entries)) return props;
  for (const entry of entries) {
    const key = entry && entry.key;
    if (!key) continue;
    const value = readPropertyValue(entry);
    if (value !== undefined) {
      props[key] = value;
    }
  }
  return props;
}

function toPoint(pos) {
  if (!pos) return null;
  const x = Number(pos.x);
  const y = Number(pos.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { xM: x, yM: y };
}

function toKernelPoint(point) {
  if (!point) return null;
  return { x: point.xM, y: point.yM };
}

function computeBezierLength(p0, p1, p2, p3) {
  if (!p0 || !p1 || !p2 || !p3) return 0;
  const approx =
    Math.hypot(p1.xM - p0.xM, p1.yM - p0.yM) +
    Math.hypot(p2.xM - p1.xM, p2.yM - p1.yM) +
    Math.hypot(p3.xM - p2.xM, p3.yM - p2.yM);
  if (!MotionKernel || !MotionKernel.sampleBezierPoints) {
    return approx;
  }
  const sampleStep = 0.2;
  const samples = Math.max(8, Math.min(120, Math.ceil(approx / sampleStep)));
  const points = MotionKernel.sampleBezierPoints(
    toKernelPoint(p0),
    toKernelPoint(p1),
    toKernelPoint(p2),
    toKernelPoint(p3),
    samples
  );
  const polyline = MotionKernel.buildPolyline(points);
  return polyline.totalLength;
}

function parseNodes(list) {
  if (!Array.isArray(list)) return [];
  const nodes = [];
  for (const entry of list) {
    const id = entry.instanceName || entry.nodeId;
    const pos = toPoint(entry.pos);
    if (!id || !pos) continue;
    const className = entry.className || entry.nodeType;
    const node = {
      nodeId: id,
      nodeType: normalizeNodeType(className),
      className,
      pos
    };
    if (Number.isFinite(entry.dir)) {
      node.angleRad = Number(entry.dir);
    }
    nodes.push(node);
  }
  return nodes;
}

function parseEdges(list) {
  if (!Array.isArray(list)) return [];
  const edges = [];
  for (const entry of list) {
    if (!entry || entry.className !== 'DegenerateBezier') continue;
    const edgeId = entry.instanceName || entry.edgeId;
    const startNodeId = entry.startPos?.instanceName || null;
    const endNodeId = entry.endPos?.instanceName || null;
    const p0 = toPoint(entry.startPos?.pos);
    const p3 = toPoint(entry.endPos?.pos);
    if (!edgeId || !p0 || !p3) continue;
    const p1 = toPoint(entry.controlPos1) || p0;
    const p2 = toPoint(entry.controlPos2) || p3;
    const props = parseProperties(entry.property);
    const lengthM = computeBezierLength(p0, p1, p2, p3);
    edges.push({
      edgeId,
      className: entry.className,
      startNodeId,
      endNodeId,
      p0,
      p1,
      p2,
      p3,
      props,
      lengthM
    });
  }
  return edges;
}

function parseSmapData(smap) {
  const nodes = parseNodes(smap.advancedPointList || []);
  const edges = parseEdges(smap.advancedCurveList || []);
  return { nodes, edges };
}

function parseSmap(filePath) {
  const resolved = path.resolve(filePath);
  const data = readJson(resolved);
  return parseSmapData(data);
}

module.exports = {
  parseSmap,
  parseSmapData
};
