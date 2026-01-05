const fs = require('fs');
const path = require('path');
const net = require('net');

const { API, PORTS, encodeFrame, responseApi, RbkParser } = require('@fleet-manager/adapters-robokit');
const { loadMapGraphLight } = require('@fleet-manager/core-graph');
const { startHttpStub } = require('./http_stub');
const { SimModule } = require('./syspy-js');
const { createRobokitCoreAdapter } = require('./core_adapter');
const { MotionKernel } = require('@fleet-manager/sim-runtime');

const {
  clamp,
  normalizeAngle,
  toRad,
  distancePointToSegmentCoords,
  unitVector,
  sampleBezierPoints,
  buildPolyline,
  reversePolyline,
  polylineAtDistance
} = MotionKernel;

const GRAPH_PATH = process.env.GRAPH_PATH || path.resolve(__dirname, 'graph.json');
const ROBOKIT_TRAFFIC_STRATEGY = process.env.ROBOKIT_TRAFFIC_STRATEGY || 'pulse-mapf-time';
const ROBOD_PORT = Number.parseInt(process.env.ROBOD_PORT || String(PORTS.ROBOD), 10);
const STATE_PORT = Number.parseInt(process.env.STATE_PORT || String(PORTS.STATE), 10);
const CTRL_PORT = Number.parseInt(process.env.CTRL_PORT || String(PORTS.CTRL), 10);
const TASK_PORT = Number.parseInt(process.env.TASK_PORT || String(PORTS.TASK), 10);
const CONFIG_PORT = Number.parseInt(process.env.CONFIG_PORT || String(PORTS.CONFIG), 10);
const KERNEL_PORT = Number.parseInt(process.env.KERNEL_PORT || String(PORTS.KERNEL), 10);
const OTHER_PORT = Number.parseInt(process.env.OTHER_PORT || String(PORTS.OTHER), 10);
const PUSH_PORT = Number.parseInt(process.env.PUSH_PORT || String(PORTS.PUSH), 10);
const BIND_HOST = process.env.BIND_HOST || '';
const ROBOT_CONFIG_PATH = process.env.ROBOT_CONFIG_PATH || '';
const ROBOT_ID = process.env.ROBOT_ID || 'RB-01';
const ROBOT_MODEL = process.env.ROBOT_MODEL || 'AMB-150';
const ROBOT_VERSION = process.env.ROBOT_VERSION || '0.1.9.250814';
const ROBOT_MODEL_MD5 = process.env.ROBOT_MODEL_MD5 || '37a63ba417e16fa02449a06ac720980b';
const ROBOT_PRODUCT = process.env.ROBOT_PRODUCT || 'RDSCore';
const ROBOT_NOTE = process.env.ROBOT_NOTE || 'RDSCore';
const ROBOT_VEHICLE_ID = process.env.ROBOT_VEHICLE_ID || 'RDS core';
const ROBOT_ARCH = process.env.ROBOT_ARCH || 'x86_64';
const ROBOT_DSP_VERSION = process.env.ROBOT_DSP_VERSION || 'RDS core';
const ROBOT_GYRO_VERSION = process.env.ROBOT_GYRO_VERSION || 'RDS core';
const ROBOT_ECHOID = process.env.ROBOT_ECHOID || ROBOT_ID;
const ROBOT_ECHOID_TYPE = process.env.ROBOT_ECHOID_TYPE || '0x2';
const ROBOT_MOTOR_NAMES = process.env.ROBOT_MOTOR_NAMES || 'drive';
const ROBOSHOP_MIN_VERSION_REQUIRED = process.env.ROBOSHOP_MIN_VERSION_REQUIRED || 'v2.3.2.6';
const RDS_PARAMS_PATH = process.env.RDS_PARAMS_PATH || path.resolve(__dirname, 'rds_params.json');
const RDS_DEVICE_TYPES_PATH =
  process.env.RDS_DEVICE_TYPES_PATH || path.resolve(__dirname, 'rds_device_types.json');
const START_NODE_ID = process.env.START_NODE_ID || '';
const TICK_MS = Number.parseInt(process.env.TICK_MS || '200', 10);
const RELOC_MS = Number.parseInt(process.env.RELOC_MS || '500', 10);
const SPEED_M_S = Number.parseFloat(process.env.SPEED_M_S || '0.6');
const ACCEL_M_S2 = Number.parseFloat(process.env.ACCEL_M_S2 || '0.6');
const DECEL_M_S2 = Number.parseFloat(process.env.DECEL_M_S2 || '0.9');
const ARRIVAL_EPS = Number.parseFloat(process.env.ARRIVAL_EPS || '0.05');
const CURRENT_POINT_DIST = Number.parseFloat(process.env.CURRENT_POINT_DIST || '0.3');
const ROTATE_SPEED_RAD_S = Number.parseFloat(process.env.ROTATE_SPEED_RAD_S || '1.2');
const ROT_ACCEL_RAD_S2 = Number.parseFloat(process.env.ROT_ACCEL_RAD_S2 || '2.4');
const ROT_DECEL_RAD_S2 = Number.parseFloat(process.env.ROT_DECEL_RAD_S2 || '3.2');
const ROTATE_EPS_RAD = Number.parseFloat(process.env.ROTATE_EPS_RAD || '0.03');
const WHEELBASE_M = Number.parseFloat(process.env.WHEELBASE_M || '1.1');
const ROBOT_RADIUS_M = Number.parseFloat(process.env.ROBOT_RADIUS_M || '0.6');
const DEFAULT_ROBOT_MODEL = { head: 0.5, tail: 2, width: 1 };
const ROBOT_MODEL_HEAD_M = Number.parseFloat(process.env.ROBOT_MODEL_HEAD_M || '');
const ROBOT_MODEL_TAIL_M = Number.parseFloat(process.env.ROBOT_MODEL_TAIL_M || '');
const ROBOT_MODEL_WIDTH_M = Number.parseFloat(process.env.ROBOT_MODEL_WIDTH_M || '');
const ROBOT_MODEL_DIMS = {
  head:
    Number.isFinite(ROBOT_MODEL_HEAD_M) && ROBOT_MODEL_HEAD_M > 0
      ? ROBOT_MODEL_HEAD_M
      : DEFAULT_ROBOT_MODEL.head,
  tail:
    Number.isFinite(ROBOT_MODEL_TAIL_M) && ROBOT_MODEL_TAIL_M > 0
      ? ROBOT_MODEL_TAIL_M
      : DEFAULT_ROBOT_MODEL.tail,
  width:
    Number.isFinite(ROBOT_MODEL_WIDTH_M) && ROBOT_MODEL_WIDTH_M > 0
      ? ROBOT_MODEL_WIDTH_M
      : DEFAULT_ROBOT_MODEL.width
};
const PATH_SAMPLE_STEP = Number.parseFloat(process.env.PATH_SAMPLE_STEP || '0.2');
const PATH_MIN_SAMPLES = Number.parseInt(process.env.PATH_MIN_SAMPLES || '12', 10);
const PATH_MAX_SAMPLES = Number.parseInt(process.env.PATH_MAX_SAMPLES || '120', 10);
const LINE_MATCH_MAX_DIST = Number.parseFloat(process.env.LINE_MATCH_MAX_DIST || '0.6');
const LINE_MATCH_ANGLE_DEG = Number.parseFloat(process.env.LINE_MATCH_ANGLE_DEG || '30');
const MAX_BODY_LENGTH = Number.parseInt(process.env.MAX_BODY_LENGTH || '1048576', 10);
const PUSH_MIN_INTERVAL_MS = Number.parseInt(process.env.PUSH_MIN_INTERVAL_MS || '200', 10);
const FORK_SPEED_M_S = Number.parseFloat(process.env.FORK_SPEED_M_S || '0.05');
const FORK_ACCEL_M_S2 = Number.parseFloat(process.env.FORK_ACCEL_M_S2 || '0.15');
const FORK_EPS = Number.parseFloat(process.env.FORK_EPS || '0.003');
const FORK_MIN_HEIGHT = Number.parseFloat(process.env.FORK_MIN_HEIGHT || '0');
const FORK_MAX_HEIGHT = Number.parseFloat(process.env.FORK_MAX_HEIGHT || '1.2');
const OBSTACLE_RADIUS_M = Number.parseFloat(process.env.OBSTACLE_RADIUS_M || '0.8');
const OBSTACLE_CLEARANCE_M = Number.parseFloat(process.env.OBSTACLE_CLEARANCE_M || '0.25');
const OBSTACLE_LOOKAHEAD_M = Number.parseFloat(process.env.OBSTACLE_LOOKAHEAD_M || '2.2');
const OBSTACLE_AVOID_ENABLED = process.env.OBSTACLE_AVOID_ENABLED !== 'false';
const BLOCK_REASON_OBSTACLE = Number.parseInt(process.env.BLOCK_REASON_OBSTACLE || '1001', 10);
const BLOCK_REASON_MANUAL = Number.parseInt(process.env.BLOCK_REASON_MANUAL || '1000', 10);
const STATUS_HIDE_CURRENT_STATION = ['1', 'true'].includes(
  String(process.env.STATUS_HIDE_CURRENT_STATION || '').trim().toLowerCase()
);
const STATUS_FORCE_CURRENT_STATION = String(process.env.STATUS_FORCE_CURRENT_STATION || '').trim();
const STATUS_HIDE_LAST_STATION = ['1', 'true'].includes(
  String(process.env.STATUS_HIDE_LAST_STATION || '').trim().toLowerCase()
);
const STATUS_HIDE_POSE = ['1', 'true'].includes(
  String(process.env.STATUS_HIDE_POSE || '').trim().toLowerCase()
);
const STATUS_LAST_STATION_IS_CURRENT = ['1', 'true'].includes(
  String(process.env.STATUS_LAST_STATION_IS_CURRENT || '').trim().toLowerCase()
);
const USE_CORE_SIM = true;
let coreAdapter = null;

function nowMs() {
  return Date.now();
}

function createOn() {
  return new Date().toISOString();
}

const graph = loadMapGraphLight(GRAPH_PATH);

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return null;
  }
}

function parseNameList(value) {
  if (!value) {
    return [];
  }
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function createMotorStates(names) {
  const list = Array.isArray(names) && names.length > 0 ? names : ['drive'];
  return list.map((name) => ({ motor_name: name, position: 0, speed: 0 }));
}

function approachValue(current, target, accel, decel, dt) {
  if (!Number.isFinite(current)) current = 0;
  if (!Number.isFinite(target)) target = 0;
  if (!Number.isFinite(dt) || dt <= 0) return target;
  if (current === target) return target;
  const delta = target - current;
  const rate = delta > 0 ? accel : decel;
  const step = Math.abs(rate) * dt;
  if (Math.abs(delta) <= step) {
    return target;
  }
  return current + Math.sign(delta) * step;
}

function clampForkHeight(height) {
  if (!Number.isFinite(height)) return 0;
  return clamp(height, FORK_MIN_HEIGHT, FORK_MAX_HEIGHT);
}

function addSimObstacle(payload) {
  if (coreAdapter) {
    return coreAdapter.addObstacle(payload || {});
  }
  const x = payload && Number.isFinite(payload.x) ? payload.x : null;
  const y = payload && Number.isFinite(payload.y) ? payload.y : null;
  if (x === null || y === null) {
    return { ok: false, error: 'invalid_obstacle' };
  }
  const radius = payload && Number.isFinite(payload.radius) ? payload.radius : OBSTACLE_RADIUS_M;
  const modeRaw = payload && payload.mode ? String(payload.mode).toLowerCase() : 'block';
  const mode = modeRaw === 'avoid' ? 'avoid' : 'block';
  const obstacle = {
    id: obstacleSeq++,
    x,
    y,
    radius,
    mode
  };
  simObstacles.push(obstacle);
  return { ok: true, obstacle };
}

function clearSimObstacles() {
  if (coreAdapter) {
    coreAdapter.clearObstacles();
    return;
  }
  simObstacles.length = 0;
}

function listSimObstacles() {
  if (coreAdapter) {
    const result = coreAdapter.listObstacles();
    return result?.obstacles || [];
  }
  return simObstacles.map((obs) => ({
    id: obs.id,
    x: obs.x,
    y: obs.y,
    radius: obs.radius,
    mode: obs.mode
  }));
}

function setRobotBlockedState(blocked, options = {}) {
  robot.blocked = Boolean(blocked);
  if (!robot.blocked) {
    robot.blockReason = 0;
    robot.blockId = 0;
    robot.blockPos = { x: 0, y: 0 };
    if (robot.currentTask && !robot.paused) {
      robot.taskStatus = 2;
    }
    return;
  }
  robot.blockReason = Number.isFinite(options.reason) ? options.reason : BLOCK_REASON_MANUAL;
  robot.blockId = Number.isFinite(options.id) ? options.id : robot.blockId || 0;
  if (Number.isFinite(options.x) && Number.isFinite(options.y)) {
    robot.blockPos = { x: options.x, y: options.y };
  }
  if (robot.currentTask) {
    robot.taskStatus = 3;
  }
}

const motorNames = parseNameList(ROBOT_MOTOR_NAMES);
const rdsParamsPayload = readJsonSafe(RDS_PARAMS_PATH);
const rdsDeviceTypesPayload = readJsonSafe(RDS_DEVICE_TYPES_PATH);
const ROBOT_FEATURES = [
  { active: false, name: 'core' },
  { active: false, name: 'rds_custom' },
  { active: false, name: 'rds_operator' },
  { active: false, name: 'rds_bizCommon' },
  { active: false, name: 'rds_syncService' },
  { active: false, name: 'rds_forkApp' }
];

const simObstacles = [];
let obstacleSeq = 1;

function defaultRobotConfigPath(mapPath) {
  const dir = path.dirname(mapPath);
  const base = path.basename(mapPath, path.extname(mapPath));
  return path.join(dir, `${base}.robots.json`);
}

function loadRobotConfig(mapPath) {
  const configPath = ROBOT_CONFIG_PATH || defaultRobotConfigPath(mapPath);
  if (!configPath || !fs.existsSync(configPath)) {
    return null;
  }
  const data = readJsonSafe(configPath);
  if (!data || typeof data !== 'object') {
    return null;
  }
  return { path: configPath, data };
}


function buildGraph(data) {
  const nodes = new Map();
  for (const node of data.nodes || []) {
    if (node && node.id && node.pos && Number.isFinite(node.pos.x) && Number.isFinite(node.pos.y)) {
      nodes.set(node.id, node);
    }
  }

  const adjacency = new Map();
  for (const nodeId of nodes.keys()) {
    adjacency.set(nodeId, []);
  }

  const edgesByKey = new Map();
  const lineConstraints = [];
  const angleThreshold = Math.cos(toRad(LINE_MATCH_ANGLE_DEG));

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
      if (dist > LINE_MATCH_MAX_DIST) {
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
    const samples = clamp(
      Math.ceil(roughDist / PATH_SAMPLE_STEP),
      PATH_MIN_SAMPLES,
      PATH_MAX_SAMPLES
    );
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

const robotConfigInfo = loadRobotConfig(GRAPH_PATH);
const robotConfigs = robotConfigInfo ? robotConfigInfo.data : null;

function findRobotConfigEntry(config, robotId) {
  if (!config || typeof config !== 'object') {
    return null;
  }
  const list = Array.isArray(config.robots) ? config.robots : [];
  if (list.length === 0) {
    return null;
  }
  return (
    list.find((entry) => entry && entry.id === robotId) ||
    list.find((entry) => entry && entry.name === robotId) ||
    null
  );
}

const robotConfigEntry = findRobotConfigEntry(robotConfigs, ROBOT_ID);

function resolveStartPose(entry) {
  if (!entry || !entry.start_pos) {
    return null;
  }
  const pos = entry.start_pos;
  if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
    return null;
  }
  return {
    x: pos.x,
    y: pos.y,
    angle: Number.isFinite(pos.angle) ? pos.angle : 0
  };
}

function resolveStartNode(preferredId, entry, poseOverride) {
  const fromConfig =
    entry &&
    (entry.start_station ||
      entry.start_point ||
      entry.start_node ||
      entry.start_action_point ||
      entry.start_location);
  if (fromConfig && nodesById.has(fromConfig)) {
    return fromConfig;
  }
  if (poseOverride) {
    const nearest = findNearestNode(poseOverride.x, poseOverride.y);
    if (nearest) {
      return nearest.id;
    }
  }
  if (preferredId && nodesById.has(preferredId)) {
    return preferredId;
  }
  const chargePoint = (graph.nodes || []).find((node) => node.className === 'ChargePoint' && nodesById.has(node.id));
  if (chargePoint) {
    return chargePoint.id;
  }
  const parkPoint = (graph.nodes || []).find((node) => node.className === 'ParkPoint' && nodesById.has(node.id));
  if (parkPoint) {
    return parkPoint.id;
  }
  const actionPoint = (graph.nodes || []).find((node) => node.className === 'ActionPoint' && nodesById.has(node.id));
  if (actionPoint) {
    return actionPoint.id;
  }
  const firstId = nodesById.keys().next().value;
  if (!firstId) {
    throw new Error('graph has no nodes');
  }
  return firstId;
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
    if (!prev) {
      break;
    }
    path.push(prev);
    cursor = prev;
  }
  path.reverse();
  return path;
}

function distanceObstacleToPolyline(obstacle, polyline) {
  if (!polyline || !Array.isArray(polyline.points) || polyline.points.length < 2) {
    return Number.POSITIVE_INFINITY;
  }
  let best = Number.POSITIVE_INFINITY;
  const points = polyline.points;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const dist = distancePointToSegmentCoords(obstacle.x, obstacle.y, a.x, a.y, b.x, b.y);
    if (dist < best) {
      best = dist;
    }
  }
  return best;
}

function findBlockingObstacleOnPolyline(polyline) {
  if (!simObstacles.length || !polyline) {
    return null;
  }
  for (const obstacle of simObstacles) {
    const lookahead = OBSTACLE_LOOKAHEAD_M + obstacle.radius;
    const distToRobot = Math.hypot(obstacle.x - robot.pose.x, obstacle.y - robot.pose.y);
    if (distToRobot > lookahead) {
      continue;
    }
    const distToPath = distanceObstacleToPolyline(obstacle, polyline);
    if (distToPath <= obstacle.radius + OBSTACLE_CLEARANCE_M + ROBOT_RADIUS_M) {
      return obstacle;
    }
  }
  return null;
}

function smoothstep(t) {
  const clamped = clamp(t, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function projectPointToPolyline(polyline, point) {
  if (!polyline || !point || !Array.isArray(polyline.points)) {
    return null;
  }
  const points = polyline.points;
  if (points.length < 2) {
    return null;
  }
  let best = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const abLenSq = abx * abx + aby * aby;
    if (abLenSq === 0) {
      continue;
    }
    const apx = point.x - a.x;
    const apy = point.y - a.y;
    const t = clamp((apx * abx + apy * aby) / abLenSq, 0, 1);
    const cx = a.x + abx * t;
    const cy = a.y + aby * t;
    const dist = Math.hypot(point.x - cx, point.y - cy);
    if (dist < bestDist) {
      bestDist = dist;
      const segLen = Math.sqrt(abLenSq);
      const s = polyline.lengths[i] + t * segLen;
      const heading = Math.atan2(aby, abx);
      best = {
        s,
        point: { x: cx, y: cy },
        heading,
        tangent: unitVector(abx, aby)
      };
    }
  }
  return best;
}

function collectSegmentObstacles(segment, progress, maxOffset, mode) {
  if (!segment || !segment.polyline || !simObstacles.length) {
    return [];
  }
  const list = [];
  const totalLength = segment.polyline.totalLength;
  const effectiveOffset = Math.max(0, maxOffset || 0);
  for (const obstacle of simObstacles) {
    if (mode && obstacle.mode !== mode) {
      continue;
    }
    const lookahead = OBSTACLE_LOOKAHEAD_M + obstacle.radius + ROBOT_RADIUS_M + effectiveOffset;
    const distToRobot = Math.hypot(obstacle.x - robot.pose.x, obstacle.y - robot.pose.y);
    if (distToRobot > lookahead) {
      continue;
    }
    const projection = projectPointToPolyline(segment.polyline, obstacle);
    if (!projection) {
      continue;
    }
    const normal = { x: -projection.tangent.y, y: projection.tangent.x };
    const signedDist =
      (obstacle.x - projection.point.x) * normal.x +
      (obstacle.y - projection.point.y) * normal.y;
    const required = obstacle.radius + ROBOT_RADIUS_M + OBSTACLE_CLEARANCE_M;
    if (Math.abs(signedDist) > required + effectiveOffset) {
      continue;
    }
    if (Number.isFinite(progress)) {
      const behindLimit = required + OBSTACLE_CLEARANCE_M;
      if (projection.s + behindLimit < progress) {
        continue;
      }
    }
    if (projection.s > totalLength + required) {
      continue;
    }
    list.push({
      obstacle,
      projection,
      signedDist,
      required,
      distToRobot
    });
  }
  list.sort((a, b) => a.distToRobot - b.distToRobot);
  return list;
}

function buildAllowedOffsetRanges(obstacles, maxOffset) {
  const forbidden = [];
  for (const info of obstacles) {
    let start = info.signedDist - info.required;
    let end = info.signedDist + info.required;
    if (end < -maxOffset || start > maxOffset) {
      continue;
    }
    start = clamp(start, -maxOffset, maxOffset);
    end = clamp(end, -maxOffset, maxOffset);
    if (start <= end) {
      forbidden.push([start, end]);
    }
  }
  forbidden.sort((a, b) => a[0] - b[0]);
  const allowed = [];
  let cursor = -maxOffset;
  for (const [start, end] of forbidden) {
    if (end <= cursor) {
      continue;
    }
    if (start > cursor) {
      allowed.push([cursor, Math.min(start, maxOffset)]);
    }
    cursor = Math.max(cursor, end);
    if (cursor >= maxOffset) {
      break;
    }
  }
  if (cursor < maxOffset) {
    allowed.push([cursor, maxOffset]);
  }
  return allowed;
}

function chooseOffsetFromRanges(ranges, preferred) {
  if (!ranges.length) {
    return null;
  }
  if (Number.isFinite(preferred)) {
    for (const [start, end] of ranges) {
      if (preferred >= start && preferred <= end) {
        return preferred;
      }
    }
  }
  let best = null;
  for (const [start, end] of ranges) {
    let candidate = null;
    if (start <= 0 && end >= 0) {
      candidate = 0;
    } else if (end < 0) {
      candidate = end;
    } else {
      candidate = start;
    }
    if (best === null || Math.abs(candidate) < Math.abs(best)) {
      best = candidate;
    }
  }
  return best;
}

function buildAvoidPlan(segment, obstacles, preferredOffset) {
  if (!segment || !segment.polyline || !obstacles || obstacles.length === 0) {
    return null;
  }
  const corridorWidth = Number.isFinite(segment.corridorWidth) ? segment.corridorWidth : 0;
  if (corridorWidth <= 0) {
    return null;
  }
  const maxOffset = corridorWidth / 2 - ROBOT_RADIUS_M - OBSTACLE_CLEARANCE_M;
  if (maxOffset <= 0) {
    return null;
  }
  const allowed = buildAllowedOffsetRanges(obstacles, maxOffset);
  const offset = chooseOffsetFromRanges(allowed, preferredOffset);
  if (!Number.isFinite(offset)) {
    return null;
  }
  let s0 = Number.POSITIVE_INFINITY;
  let s1 = Number.NEGATIVE_INFINITY;
  let maxRequired = 0;
  for (const info of obstacles) {
    const buffer = info.required + OBSTACLE_CLEARANCE_M;
    s0 = Math.min(s0, info.projection.s - buffer);
    s1 = Math.max(s1, info.projection.s + buffer);
    if (info.required > maxRequired) {
      maxRequired = info.required;
    }
  }
  if (!Number.isFinite(s0) || !Number.isFinite(s1) || s0 > s1) {
    return null;
  }
  const totalLength = segment.polyline.totalLength;
  s0 = clamp(s0, 0, totalLength);
  s1 = clamp(s1, 0, totalLength);
  const ramp = clamp(maxRequired * 0.6, 0.4, 1.2);
  const r0 = clamp(s0 - ramp, 0, s0);
  const r1 = clamp(s1 + ramp, s1, totalLength);
  return {
    obstacleIds: obstacles.map((info) => info.obstacle.id),
    offset,
    s0,
    s1,
    r0,
    r1
  };
}

function avoidOffsetAtS(plan, s) {
  if (!plan) {
    return 0;
  }
  if (s <= plan.r0 || s >= plan.r1) {
    return 0;
  }
  if (s < plan.s0) {
    const denom = plan.s0 - plan.r0;
    if (denom <= 0) {
      return plan.offset;
    }
    return plan.offset * smoothstep((s - plan.r0) / denom);
  }
  if (s <= plan.s1) {
    return plan.offset;
  }
  const denom = plan.r1 - plan.s1;
  if (denom <= 0) {
    return plan.offset;
  }
  return plan.offset * smoothstep((plan.r1 - s) / denom);
}

function segmentPoseAtDistance(segment, distance) {
  const base = polylineAtDistance(segment.polyline, distance);
  const plan = segment.avoidPlan;
  if (!plan) {
    return { x: base.x, y: base.y, heading: base.heading };
  }
  const offset = avoidOffsetAtS(plan, distance);
  if (offset === 0) {
    return { x: base.x, y: base.y, heading: base.heading };
  }
  const normal = { x: -Math.sin(base.heading), y: Math.cos(base.heading) };
  return {
    x: base.x + normal.x * offset,
    y: base.y + normal.y * offset,
    heading: base.heading
  };
}

function edgeBlockedByObstacle(edge, obstacle) {
  if (!edge || !edge.polyline) {
    return false;
  }
  const dist = distanceObstacleToPolyline(obstacle, edge.polyline);
  return dist <= obstacle.radius + OBSTACLE_CLEARANCE_M + ROBOT_RADIUS_M;
}

function findPathAvoidingObstacles(startId, endId) {
  if (!nodesById.has(startId) || !nodesById.has(endId)) {
    return null;
  }
  if (!simObstacles.length) {
    return findPath(startId, endId);
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
      if (visited.has(nodeId)) continue;
      if (dist < bestDist) {
        bestDist = dist;
        current = nodeId;
      }
    }
    if (!current || current === endId) {
      break;
    }
    visited.add(current);
    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor.to)) continue;
      const edge = edgesByKey.get(`${current}->${neighbor.to}`);
      if (!edge) continue;
      let blocked = false;
      for (const obstacle of simObstacles) {
        if (edgeBlockedByObstacle(edge, obstacle)) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
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

function clampBattery(value) {
  return Math.max(1, Math.min(100, value));
}

function batteryRatio(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value > 1) {
    return clamp(value / 100, 0, 1);
  }
  return clamp(value, 0, 1);
}

function createScriptPathState() {
  return {
    active: false,
    done: false,
    plan: null,
    progress: 0,
    mode: 'idle',
    reachDist: ARRIVAL_EPS,
    reachAngle: ROTATE_EPS_RAD,
    maxSpeed: SPEED_M_S,
    maxRot: ROTATE_SPEED_RAD_S,
    backMode: false,
    useOdo: false,
    holdDir: 999,
    targetAngle: null,
    startHeading: 0
  };
}

function createRobot(startNodeId, poseOverride) {
  const node = nodesById.get(startNodeId);
  const pos = node ? node.pos : { x: 0, y: 0 };
  const pose = poseOverride && Number.isFinite(poseOverride.x) && Number.isFinite(poseOverride.y) ? poseOverride : pos;
  const angle = poseOverride && Number.isFinite(poseOverride.angle) ? poseOverride.angle : 0;
  return {
    id: ROBOT_ID,
    model: ROBOT_MODEL,
    version: ROBOT_VERSION,
    currentIp: '127.0.0.1',
    currentMap: '',
    currentMapMd5: '',
    online: true,
    dispatchable: true,
    controlled: true,
    blocked: false,
    blockReason: 0,
    blockPos: { x: 0, y: 0 },
    blockId: 0,
    slowDown: false,
    slowReason: 0,
    slowPos: { x: 0, y: 0 },
    slowId: 0,
    emergency: false,
    driverEmc: false,
    electric: false,
    softEmc: false,
    brake: false,
    confidence: 0.98,
    battery: 92,
    batteryTemp: 28,
    controllerTemp: 36,
    voltage: 48.2,
    current: 2.3,
    requestVoltage: 0,
    requestCurrent: 0,
    batteryCycle: 12,
    charging: false,
    odo: 0,
    todayOdo: 0,
    bootAt: nowMs(),
    motors: createMotorStates(motorNames),
    pose: { x: pose.x, y: pose.y, angle },
    velocity: {
      vx: 0,
      vy: 0,
      w: 0,
      steer: 0,
      spin: 0,
      r_vx: 0,
      r_vy: 0,
      r_w: 0,
      r_steer: 0,
      r_spin: 0
    },
    motion: {
      linearSpeed: 0,
      angularSpeed: 0
    },
    manual: {
      active: false,
      vx: 0,
      vy: 0,
      w: 0,
      steer: 0,
      realSteer: 0
    },
    fork: {
      height: 0,
      targetHeight: 0,
      speed: 0,
      heightInPlace: true,
      autoFlag: false,
      forwardVal: 0,
      forwardInPlace: false,
      pressureActual: 0
    },
    io: {
      di: {},
      do: {},
      diMeta: {},
      doMeta: {}
    },
    alarms: {
      fatals: [],
      errors: [],
      warnings: [],
      notices: []
    },
    scriptPath: createScriptPathState(),
    containers: [],
    goods: { hasGoods: false, shape: null },
    sound: { name: '', loop: false, count: 0, playing: false },
    gData: {},
    modbus: { '0x': {}, '1x': {}, '3x': {}, '4x': {} },
    disabledSensors: { depth: [], laser: [] },
    laserWidths: {},
    lockInfo: { locked: false, nick_name: '' },
    currentStation: startNodeId,
    lastStation: startNodeId,
    homeStation: startNodeId || null,
    relocStatus: 1,
    relocCompleteAt: null,
    taskStatus: 0,
    taskType: 0,
    paused: false,
    currentTask: null,
    lastTask: null,
    updatedAt: nowMs()
  };
}

const startPose = resolveStartPose(robotConfigEntry);
const startNodeId = resolveStartNode(START_NODE_ID, robotConfigEntry, startPose);
const robot = createRobot(startNodeId, startPose);
coreAdapter = USE_CORE_SIM
  ? createRobokitCoreAdapter({
      graph,
      robotId: robot.id,
      startPose: robot.pose,
      tickMs: TICK_MS,
      traffic: ROBOKIT_TRAFFIC_STRATEGY ? { strategy: ROBOKIT_TRAFFIC_STRATEGY } : null,
      robotRadius: ROBOT_RADIUS_M,
      robotModel: ROBOT_MODEL_DIMS
    })
  : null;
const simModule = new SimModule({
  robot,
  graph,
  nodesById,
  startMoveToNode,
  startMoveToPoint,
  startMultiStationTask,
  updateVelocity,
  resetVelocity,
  helpers: MotionKernel,
  reachDist: ARRIVAL_EPS,
  reachAngle: ROTATE_EPS_RAD,
  maxSpeed: SPEED_M_S,
  maxRot: ROTATE_SPEED_RAD_S,
  holdDir: 999,
  log: (...args) => console.log(...args)
});
robot.scriptApi = simModule;
let taskCounter = 1;

function updateVelocity(vx, vy, w, steer, spin) {
  robot.velocity = {
    vx,
    vy,
    w,
    steer,
    spin,
    r_vx: vx,
    r_vy: vy,
    r_w: w,
    r_steer: steer,
    r_spin: spin
  };
  const speed = Math.hypot(vx, vy);
  if (robot.motion) {
    robot.motion.linearSpeed = speed;
    robot.motion.angularSpeed = Number.isFinite(w) ? w : 0;
  }
  for (const motor of robot.motors) {
    motor.speed = speed;
  }
}

function resetVelocity() {
  updateVelocity(0, 0, 0, 0, 0);
}

function isStopped() {
  return Math.abs(robot.velocity.vx) + Math.abs(robot.velocity.vy) + Math.abs(robot.velocity.w) < 1e-3;
}

function tickFork(dt) {
  if (!robot.fork) {
    return;
  }
  const target = clampForkHeight(robot.fork.targetHeight);
  const diff = target - robot.fork.height;
  if (Math.abs(diff) <= FORK_EPS) {
    robot.fork.height = target;
    robot.fork.speed = 0;
    robot.fork.heightInPlace = true;
    robot.fork.forwardVal = 0;
    robot.fork.forwardInPlace = true;
    return;
  }
  const direction = diff > 0 ? 1 : -1;
  const maxStepSpeed = Math.min(FORK_SPEED_M_S, Math.abs(diff) / dt);
  robot.fork.speed = approachValue(robot.fork.speed || 0, maxStepSpeed, FORK_ACCEL_M_S2, FORK_ACCEL_M_S2, dt);
  const step = direction * robot.fork.speed * dt;
  robot.fork.height += step;
  if ((direction > 0 && robot.fork.height > target) || (direction < 0 && robot.fork.height < target)) {
    robot.fork.height = target;
  }
  robot.fork.heightInPlace = Math.abs(robot.fork.height - target) <= FORK_EPS;
  robot.fork.forwardVal = direction * robot.fork.speed;
  robot.fork.forwardInPlace = robot.fork.heightInPlace;
}

function applyOdo(distance) {
  if (!Number.isFinite(distance) || distance <= 0) {
    return;
  }
  robot.odo += distance;
  robot.todayOdo += distance;
  robot.battery = clampBattery(robot.battery - distance * 0.02);
  for (const motor of robot.motors) {
    motor.position += distance;
  }
}

function snapshotTask(task) {
  if (!task) {
    return null;
  }
  return {
    id: task.id,
    target_id: task.targetId,
    target_point: task.targetPoint || null,
    task_type: task.taskType || 0,
    path_nodes: task.pathNodes,
    visited_nodes: task.visitedNodes,
    started_at: task.startedAt,
    completed_at: task.completedAt || null
  };
}

function currentTaskSnapshot() {
  return snapshotTask(robot.currentTask) || snapshotTask(robot.lastTask);
}

function getTaskPaths(task) {
  if (!task) {
    return { finished: [], unfinished: [] };
  }
  const finished = Array.isArray(task.visitedNodes) ? task.visitedNodes : [];
  const nextIndex = Number.isFinite(task.pathIndex) ? task.pathIndex : 0;
  const unfinished = Array.isArray(task.pathNodes) ? task.pathNodes.slice(nextIndex) : [];
  return { finished, unfinished };
}

function buildRbkReport() {
  const task = currentTaskSnapshot();
  return {
    x: robot.pose.x,
    y: robot.pose.y,
    angle: robot.pose.angle,
    confidence: robot.confidence,
    current_station: robot.currentStation,
    last_station: robot.lastStation,
    battery_level: batteryRatio(robot.battery),
    blocked: robot.blocked,
    task_status: robot.taskStatus,
    task_id: task ? task.id : null,
    target_id: task ? task.target_id : null,
    path_nodes: task ? task.path_nodes : [],
    visited_nodes: task ? task.visited_nodes : [],
    vx: robot.velocity.vx,
    vy: robot.velocity.vy,
    w: robot.velocity.w,
    steer: robot.velocity.steer,
    spin: robot.velocity.spin,
    fork: {
      fork_height: robot.fork.height
    }
  };
}

function buildFallbackPolyline(startId, endId) {
  const startNode = nodesById.get(startId);
  const endNode = nodesById.get(endId);
  if (!startNode || !endNode) {
    return null;
  }
  const points = [
    { x: startNode.pos.x, y: startNode.pos.y },
    { x: endNode.pos.x, y: endNode.pos.y }
  ];
  return buildPolyline(points);
}

function buildTaskSegments(pathNodes) {
  const segments = [];
  for (let i = 0; i < pathNodes.length - 1; i += 1) {
    const startId = pathNodes[i];
    const endId = pathNodes[i + 1];
    const edge = edgesByKey.get(`${startId}->${endId}`);
    const polyline = edge ? edge.polyline : buildFallbackPolyline(startId, endId);
    if (!polyline) {
      continue;
    }
    const width = edge && Number.isFinite(Number(edge.width)) ? Number(edge.width) : 0;
    segments.push({
      startId,
      endId,
      polyline,
      totalLength: polyline.totalLength,
      startHeading: polyline.headings[0] || 0,
      driveBackward: edge ? Boolean(edge.driveBackward) : false,
      corridorWidth: width,
      avoidPlan: null
    });
  }
  return segments;
}

function rebuildTaskPath(task, pathNodes) {
  if (!task || !Array.isArray(pathNodes) || pathNodes.length === 0) {
    return false;
  }
  task.pathNodes = pathNodes;
  task.pathIndex = pathNodes.length > 1 ? 1 : pathNodes.length;
  task.segments = buildTaskSegments(pathNodes);
  task.segmentIndex = 0;
  task.segmentProgress = 0;
  task.segmentMode = task.segments.length > 0 ? 'rotate' : 'idle';
  task.visitedNodes = [pathNodes[0]];
  task.targetId = pathNodes[pathNodes.length - 1];
  const targetNode = nodesById.get(task.targetId);
  task.targetPoint = targetNode ? { x: targetNode.pos.x, y: targetNode.pos.y, angle: 0 } : null;
  return true;
}

function tryAvoidObstacle(task) {
  if (!OBSTACLE_AVOID_ENABLED || !task) {
    return false;
  }
  const currentNodeId = robot.currentStation;
  const currentNode = currentNodeId ? nodesById.get(currentNodeId) : null;
  if (!currentNode || !currentNode.pos) {
    return false;
  }
  const distToNode = Math.hypot(currentNode.pos.x - robot.pose.x, currentNode.pos.y - robot.pose.y);
  if (distToNode > CURRENT_POINT_DIST) {
    return false;
  }
  const targetId = task.targetId;
  if (!targetId || !nodesById.has(targetId)) {
    return false;
  }
  const newPath = findPathAvoidingObstacles(currentNodeId, targetId);
  if (!newPath) {
    return false;
  }
  return rebuildTaskPath(task, newPath);
}

function shouldBlockForObstacle(polyline, task, segment) {
  if (segment) {
    const corridorWidth = Number.isFinite(segment.corridorWidth) ? segment.corridorWidth : 0;
    const maxOffset =
      corridorWidth > 0 ? corridorWidth / 2 - ROBOT_RADIUS_M - OBSTACLE_CLEARANCE_M : 0;
    const progress = task && Number.isFinite(task.segmentProgress) ? task.segmentProgress : 0;
    const blockingObstacles = collectSegmentObstacles(segment, progress, maxOffset, 'block');
    if (blockingObstacles.length) {
      if (segment.avoidPlan) {
        segment.avoidPlan = null;
      }
      const blockObstacle = blockingObstacles[0].obstacle;
      setRobotBlockedState(true, {
        reason: BLOCK_REASON_OBSTACLE,
        id: blockObstacle.id,
        x: blockObstacle.x,
        y: blockObstacle.y
      });
      return blockObstacle;
    }
    const avoidObstacles = collectSegmentObstacles(segment, progress, maxOffset, 'avoid');
    if (!avoidObstacles.length) {
      if (segment.avoidPlan) {
        segment.avoidPlan = null;
      }
      if (robot.blocked && robot.blockReason === BLOCK_REASON_OBSTACLE) {
        setRobotBlockedState(false);
      }
      return null;
    }
    if (corridorWidth > 0) {
      const preferredOffset = segment.avoidPlan ? segment.avoidPlan.offset : null;
      const plan = buildAvoidPlan(segment, avoidObstacles, preferredOffset);
      if (plan) {
        segment.avoidPlan = plan;
        if (robot.blocked && robot.blockReason === BLOCK_REASON_OBSTACLE) {
          setRobotBlockedState(false);
        }
        return null;
      }
    }
    const blockObstacle = avoidObstacles[0].obstacle;
    setRobotBlockedState(true, {
      reason: BLOCK_REASON_OBSTACLE,
      id: blockObstacle.id,
      x: blockObstacle.x,
      y: blockObstacle.y
    });
    return blockObstacle;
  }

  const obstacle = findBlockingObstacleOnPolyline(polyline);
  if (!obstacle) {
    if (robot.blocked && robot.blockReason === BLOCK_REASON_OBSTACLE) {
      setRobotBlockedState(false);
    }
    return null;
  }
  if (obstacle.mode === 'avoid' && task && tryAvoidObstacle(task)) {
    if (robot.blocked && robot.blockReason === BLOCK_REASON_OBSTACLE) {
      setRobotBlockedState(false);
    }
    return null;
  }
  setRobotBlockedState(true, {
    reason: BLOCK_REASON_OBSTACLE,
    id: obstacle.id,
    x: obstacle.x,
    y: obstacle.y
  });
  return obstacle;
}

function createTaskWithPath(pathNodes, targetId, taskType, targetPoint) {
  const segments = buildTaskSegments(pathNodes);
  const task = {
    id: `move-${taskCounter++}`,
    targetId,
    targetPoint: targetPoint || null,
    taskType: taskType || 0,
    pathNodes,
    pathIndex: pathNodes.length > 1 ? 1 : pathNodes.length,
    visitedNodes: [robot.currentStation],
    segments,
    segmentIndex: 0,
    segmentProgress: 0,
    segmentMode: segments.length > 0 ? 'rotate' : 'idle',
    startedAt: nowMs(),
    completedAt: null
  };
  robot.currentTask = task;
  robot.taskType = task.taskType;
  robot.taskStatus = pathNodes.length > 1 ? 2 : 4;
  robot.manual.active = false;
  robot.paused = false;
  if (robot.scriptPath) {
    robot.scriptPath.active = false;
    robot.scriptPath.done = false;
  }

  if (pathNodes.length <= 1 || segments.length === 0) {
    task.completedAt = nowMs();
    robot.taskStatus = 4;
    robot.lastTask = task;
    robot.currentTask = null;
  }
  return task;
}

function startMoveToNode(targetId, taskType) {
  if (coreAdapter) {
    return coreAdapter.goTarget(targetId, nodesById);
  }
  const pathNodes = findPath(robot.currentStation, targetId);
  if (!pathNodes) {
    return { ok: false, error: 'path_not_found' };
  }
  const targetNode = nodesById.get(targetId);
  const targetPoint = targetNode ? { x: targetNode.pos.x, y: targetNode.pos.y, angle: 0 } : null;
  const task = createTaskWithPath(pathNodes, targetId, taskType, targetPoint);
  return { ok: true, task };
}

function startMoveToPoint(x, y, angle) {
  if (coreAdapter) {
    return coreAdapter.goPoint(x, y, angle, nodesById);
  }
  const node = findNearestNode(x, y);
  if (!node) {
    return { ok: false, error: 'target_not_found' };
  }
  const pathNodes = findPath(robot.currentStation, node.id);
  if (!pathNodes) {
    return { ok: false, error: 'path_not_found' };
  }
  const task = createTaskWithPath(pathNodes, node.id, 1, { x, y, angle: angle || 0 });
  return { ok: true, task };
}

function normalizeStationId(value) {
  if (!value) {
    return null;
  }
  const text = String(value);
  if (text.toUpperCase() === 'SELF_POSITION') {
    return robot.currentStation || null;
  }
  return text;
}

function extractTaskTargetId(entry) {
  if (!entry) {
    return null;
  }
  if (typeof entry === 'string' || typeof entry === 'number') {
    return entry;
  }
  return (
    entry.id ||
    entry.dest_id ||
    entry.target_id ||
    entry.station_id ||
    entry.location ||
    entry.target ||
    entry.station ||
    entry.point ||
    entry.node ||
    entry.name ||
    null
  );
}

function extractTaskSourceId(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  return (
    entry.source_id ||
    entry.sourceId ||
    entry.start_id ||
    entry.startId ||
    entry.from_id ||
    entry.from ||
    entry.source ||
    null
  );
}

function normalizeTaskListPayload(payload) {
  if (!payload) {
    return null;
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  if (typeof payload !== 'object') {
    return null;
  }
  const list =
    payload.move_task_list ||
    payload.tasks ||
    payload.task_list ||
    payload.taskList ||
    payload.blocks ||
    payload.block_list ||
    payload.targets ||
    payload.target_list ||
    payload.targetList ||
    payload.points ||
    payload.stations ||
    payload.list ||
    null;
  return Array.isArray(list) ? list : null;
}

function shouldAppendTask(payload) {
  if (!payload || typeof payload !== 'object') {
    return Boolean(robot.currentTask);
  }
  if (payload.append === true) {
    return true;
  }
  if (payload.append === false || payload.replace === true) {
    return false;
  }
  const mode = String(payload.mode || payload.append_mode || payload.task_mode || '').toLowerCase();
  if (['replace', 'reset', 'overwrite'].includes(mode)) {
    return false;
  }
  if (['append', 'queue', 'enqueue', 'add'].includes(mode)) {
    return true;
  }
  return Boolean(robot.currentTask);
}

function buildExplicitPath(taskList, options = {}) {
  const baseSource = options.startNode || null;
  const pathNodes = [];
  let lastNode = null;
  for (const entry of taskList) {
    if (!entry) {
      continue;
    }
    const rawTarget = extractTaskTargetId(entry);
    if (!rawTarget) {
      return { ok: false, error: 'invalid_target' };
    }
    const rawSource = extractTaskSourceId(entry);
    const normalizedSource = normalizeStationId(rawSource);
    if (pathNodes.length === 0 && baseSource && normalizedSource && normalizedSource !== baseSource) {
      return { ok: false, error: 'path_disconnected' };
    }
    const source = normalizeStationId(
      normalizedSource ||
        lastNode ||
        pathNodes[pathNodes.length - 1] ||
        baseSource ||
        robot.currentStation
    );
    const dest = normalizeStationId(rawTarget);
    if (!source || !dest) {
      return { ok: false, error: 'invalid_target' };
    }
    if (pathNodes.length === 0) {
      pathNodes.push(source);
    } else if (pathNodes[pathNodes.length - 1] !== source) {
      return { ok: false, error: 'path_disconnected' };
    }
    if (!edgesByKey.has(`${source}->${dest}`)) {
      return { ok: false, error: 'edge_not_found' };
    }
    pathNodes.push(dest);
    lastNode = dest;
  }
  if (pathNodes.length < 2) {
    return { ok: false, error: 'empty_task_list' };
  }
  if (baseSource && pathNodes[0] !== baseSource) {
    return { ok: false, error: 'path_disconnected' };
  }
  return { ok: true, pathNodes };
}

function collectTargets(taskList) {
  const targets = [];
  for (const entry of taskList) {
    const dest = normalizeStationId(extractTaskTargetId(entry));
    if (!dest || !nodesById.has(dest)) {
      return { ok: false, error: 'invalid_target' };
    }
    targets.push(dest);
  }
  if (!targets.length) {
    return { ok: false, error: 'empty_task_list' };
  }
  return { ok: true, targets };
}

function buildPathFromTargets(targets, startNode) {
  const combined = [];
  let current = startNode || robot.currentStation;
  for (const dest of targets) {
    const path = findPath(current, dest);
    if (!path) {
      return { ok: false, error: 'path_not_found' };
    }
    if (combined.length > 0) {
      combined.pop();
    }
    combined.push(...path);
    current = dest;
  }
  if (combined.length < 2) {
    return { ok: false, error: 'empty_task_list' };
  }
  return { ok: true, pathNodes: combined, targetId: current };
}

function appendTaskPath(task, pathNodes, targets) {
  if (!task) {
    return { ok: false, error: 'no_active_task' };
  }
  if (!Array.isArray(pathNodes) || pathNodes.length < 2) {
    return { ok: false, error: 'empty_task_list' };
  }
  const currentEnd = task.pathNodes && task.pathNodes.length ? task.pathNodes[task.pathNodes.length - 1] : null;
  if (!currentEnd) {
    return { ok: false, error: 'path_disconnected' };
  }
  let appendNodes = pathNodes;
  if (appendNodes[0] === currentEnd) {
    appendNodes = appendNodes.slice(1);
  } else {
    return { ok: false, error: 'path_disconnected' };
  }
  if (appendNodes.length === 0) {
    return { ok: true, task };
  }
  const segmentNodes = [currentEnd, ...appendNodes];
  const newSegments = buildTaskSegments(segmentNodes);
  if (newSegments.length !== segmentNodes.length - 1) {
    return { ok: false, error: 'path_not_found' };
  }
  task.pathNodes.push(...appendNodes);
  task.segments.push(...newSegments);
  const targetId = task.pathNodes[task.pathNodes.length - 1];
  task.targetId = targetId;
  const targetNode = nodesById.get(targetId);
  if (targetNode && targetNode.pos) {
    task.targetPoint = { x: targetNode.pos.x, y: targetNode.pos.y, angle: 0 };
  }
  if (Array.isArray(targets) && targets.length) {
    if (!Array.isArray(task.multiTargets)) {
      task.multiTargets = [];
    }
    task.multiTargets.push(...targets);
  }
  return { ok: true, task };
}

function startMultiStationTask(payload) {
  if (coreAdapter) {
    const list = normalizeTaskListPayload(payload);
    if (!Array.isArray(list) || list.length === 0) {
      return { ok: false, error: 'empty_task_list' };
    }
    const targetId = normalizeStationId(extractTaskTargetId(list[0]));
    if (!targetId) {
      return { ok: false, error: 'invalid_target' };
    }
    return coreAdapter.goTarget(targetId, nodesById);
  }
  const list = normalizeTaskListPayload(payload);
  if (!Array.isArray(list) || list.length === 0) {
    return { ok: false, error: 'empty_task_list' };
  }

  const hasExplicitSource = list.some((entry) => Boolean(extractTaskSourceId(entry)));
  const append = shouldAppendTask(payload);
  const currentTask = append ? robot.currentTask : null;
  const startNode =
    currentTask && Array.isArray(currentTask.pathNodes) && currentTask.pathNodes.length
      ? currentTask.pathNodes[currentTask.pathNodes.length - 1]
      : null;
  const appendTask = Boolean(currentTask && startNode);

  if (hasExplicitSource) {
    const explicit = buildExplicitPath(list, { startNode });
    if (!explicit.ok) {
      return { ok: false, error: explicit.error };
    }
    const targets = collectTargets(list);
    if (!targets.ok) {
      return { ok: false, error: targets.error };
    }
    if (appendTask) {
      return appendTaskPath(currentTask, explicit.pathNodes, targets.targets);
    }
    const finalTarget = explicit.pathNodes[explicit.pathNodes.length - 1];
    const task = createTaskWithPath(explicit.pathNodes, finalTarget, 3, null);
    task.multiTargets = targets.targets;
    return { ok: true, task };
  }

  const targets = collectTargets(list);
  if (!targets.ok) {
    return { ok: false, error: targets.error };
  }
  const pathResult = buildPathFromTargets(targets.targets, (appendTask && startNode) || robot.currentStation);
  if (!pathResult.ok) {
    return { ok: false, error: pathResult.error };
  }
  if (appendTask) {
    return appendTaskPath(currentTask, pathResult.pathNodes, targets.targets);
  }
  const task = createTaskWithPath(pathResult.pathNodes, pathResult.targetId, 3, null);
  task.multiTargets = targets.targets;
  return { ok: true, task };
}

function finishScriptPath() {
  const sp = robot.scriptPath;
  if (!sp) {
    return;
  }
  sp.active = false;
  sp.done = true;
  sp.mode = 'idle';
  robot.taskStatus = 4;
  resetVelocity();
  const nearest = findNearestNode(robot.pose.x, robot.pose.y);
  if (nearest) {
    const dist = Math.hypot(nearest.pos.x - robot.pose.x, nearest.pos.y - robot.pose.y);
    if (dist <= CURRENT_POINT_DIST) {
      robot.lastStation = robot.currentStation;
      robot.currentStation = nearest.id;
    }
  }
}

function tickScriptPath(now, dt) {
  const sp = robot.scriptPath;
  if (!sp || !sp.active || !sp.plan || !sp.plan.polyline) {
    return false;
  }
  if (robot.blocked && robot.blockReason === BLOCK_REASON_MANUAL) {
    resetVelocity();
    return true;
  }
  if (shouldBlockForObstacle(sp.plan.polyline)) {
    resetVelocity();
    return true;
  }
  if (robot.paused) {
    resetVelocity();
    return true;
  }
  const maxRot = Number.isFinite(sp.maxRot) ? sp.maxRot : ROTATE_SPEED_RAD_S;
  const maxSpeed = Number.isFinite(sp.maxSpeed) ? sp.maxSpeed : SPEED_M_S;

  if (sp.mode === 'rotate') {
    const holdDir = Number.isFinite(sp.holdDir) && sp.holdDir !== 999 ? sp.holdDir : null;
    const targetHeading = holdDir !== null
      ? normalizeAngle(toRad(holdDir))
      : sp.backMode
        ? normalizeAngle((sp.startHeading || 0) + Math.PI)
        : sp.startHeading || 0;
    const diff = normalizeAngle(targetHeading - robot.pose.angle);
    if (Math.abs(diff) <= sp.reachAngle) {
      robot.pose = { x: robot.pose.x, y: robot.pose.y, angle: targetHeading };
      sp.mode = 'move';
      resetVelocity();
      return true;
    }
    const direction = diff >= 0 ? 1 : -1;
    const desiredW = direction * Math.min(maxRot, Math.abs(diff) / dt);
    const nextW = approachValue(robot.motion.angularSpeed, desiredW, ROT_ACCEL_RAD_S2, ROT_DECEL_RAD_S2, dt);
    let delta = nextW * dt;
    if (Math.abs(delta) > Math.abs(diff)) {
      delta = diff;
    }
    const actualW = dt > 0 ? delta / dt : 0;
    robot.pose = { x: robot.pose.x, y: robot.pose.y, angle: normalizeAngle(robot.pose.angle + delta) };
    updateVelocity(0, 0, actualW, 0, actualW);
    robot.taskStatus = 2;
    return true;
  }

  if (sp.mode === 'final-rotate' && Number.isFinite(sp.targetAngle)) {
    const targetHeading = normalizeAngle(sp.targetAngle);
    const diff = normalizeAngle(targetHeading - robot.pose.angle);
    if (Math.abs(diff) <= sp.reachAngle) {
      robot.pose = { x: robot.pose.x, y: robot.pose.y, angle: targetHeading };
      finishScriptPath();
      return true;
    }
    const direction = diff >= 0 ? 1 : -1;
    const desiredW = direction * Math.min(maxRot, Math.abs(diff) / dt);
    const nextW = approachValue(robot.motion.angularSpeed, desiredW, ROT_ACCEL_RAD_S2, ROT_DECEL_RAD_S2, dt);
    let delta = nextW * dt;
    if (Math.abs(delta) > Math.abs(diff)) {
      delta = diff;
    }
    const actualW = dt > 0 ? delta / dt : 0;
    robot.pose = { x: robot.pose.x, y: robot.pose.y, angle: normalizeAngle(robot.pose.angle + delta) };
    updateVelocity(0, 0, actualW, 0, actualW);
    robot.taskStatus = 2;
    return true;
  }

  const prevProgress = sp.progress;
  const remaining = sp.plan.polyline.totalLength - prevProgress;
  const stopSpeed = Math.sqrt(Math.max(0, 2 * DECEL_M_S2 * remaining));
  const desiredSpeed = Math.min(maxSpeed, stopSpeed);
  const nextSpeed = approachValue(robot.motion.linearSpeed, desiredSpeed, ACCEL_M_S2, DECEL_M_S2, dt);
  const travel = Math.min(remaining, nextSpeed * dt);
  const nextProgress = prevProgress + travel;
  sp.progress = nextProgress;

  const prevAngle = robot.pose.angle;
  const pose = polylineAtDistance(sp.plan.polyline, nextProgress);
  const distanceMoved = nextProgress - prevProgress;
  const speed = dt > 0 ? distanceMoved / dt : 0;
  const holdDir = Number.isFinite(sp.holdDir) && sp.holdDir !== 999 ? sp.holdDir : null;
  const pathHeading = pose.heading;
  let heading = sp.backMode ? normalizeAngle(pathHeading + Math.PI) : pathHeading;
  if (holdDir !== null) {
    heading = normalizeAngle(toRad(holdDir));
  }
  const vx = Math.cos(pathHeading) * speed;
  const vy = Math.sin(pathHeading) * speed;
  const w = dt > 0 ? normalizeAngle(heading - prevAngle) / dt : 0;
  const steer = speed > 0 ? Math.atan(WHEELBASE_M * (w / speed)) : 0;
  robot.pose = { x: pose.x, y: pose.y, angle: heading };
  updateVelocity(vx, vy, w, steer, 0);
  applyOdo(distanceMoved);
  robot.taskStatus = 2;

  if (sp.plan.polyline.totalLength - nextProgress <= sp.reachDist) {
    const endPos = polylineAtDistance(sp.plan.polyline, sp.plan.polyline.totalLength);
    robot.pose = { x: endPos.x, y: endPos.y, angle: heading };
    if (Number.isFinite(sp.targetAngle)) {
      sp.mode = 'final-rotate';
      return true;
    }
    finishScriptPath();
  }
  return true;
}

function tickSimulation() {
  const now = nowMs();
  const dt = TICK_MS / 1000;
  robot.updatedAt = now;
  if (coreAdapter) {
    coreAdapter.syncRobot(robot, nodesById, { currentPointDist: CURRENT_POINT_DIST });
    return;
  }
  tickFork(dt);

  if (tickScriptPath(now, dt)) {
    return;
  }

  if (robot.relocStatus === 2 && robot.relocCompleteAt && now >= robot.relocCompleteAt) {
    robot.relocStatus = 1;
    robot.relocCompleteAt = null;
  }

  if (robot.paused) {
    resetVelocity();
    return;
  }
  if (robot.blocked && robot.blockReason === BLOCK_REASON_MANUAL) {
    resetVelocity();
    return;
  }

  const task = robot.currentTask;
  if (task) {
    const segment = task.segments[task.segmentIndex];
    if (!segment) {
      task.completedAt = now;
      robot.taskStatus = 4;
      robot.lastTask = task;
      robot.currentTask = null;
      resetVelocity();
      return;
    }

    if (task.segmentMode === 'rotate') {
      const targetHeading = segment.driveBackward
        ? normalizeAngle((segment.startHeading || 0) + Math.PI)
        : segment.startHeading || 0;
      const diff = normalizeAngle(targetHeading - robot.pose.angle);
      if (Math.abs(diff) <= ROTATE_EPS_RAD) {
        robot.pose = { x: robot.pose.x, y: robot.pose.y, angle: targetHeading };
        task.segmentMode = 'move';
        resetVelocity();
        return;
      }
      const direction = diff >= 0 ? 1 : -1;
      const desiredW = direction * Math.min(ROTATE_SPEED_RAD_S, Math.abs(diff) / dt);
      const nextW = approachValue(robot.motion.angularSpeed, desiredW, ROT_ACCEL_RAD_S2, ROT_DECEL_RAD_S2, dt);
      let delta = nextW * dt;
      if (Math.abs(delta) > Math.abs(diff)) {
        delta = diff;
      }
      const actualW = dt > 0 ? delta / dt : 0;
      robot.pose = { x: robot.pose.x, y: robot.pose.y, angle: normalizeAngle(robot.pose.angle + delta) };
      updateVelocity(0, 0, actualW, 0, actualW);
      robot.taskStatus = 2;
      return;
    }

    if (shouldBlockForObstacle(segment.polyline, task, segment)) {
      resetVelocity();
      return;
    }

    const prevProgress = task.segmentProgress;
    const remaining = segment.totalLength - prevProgress;
    const stopSpeed = Math.sqrt(Math.max(0, 2 * DECEL_M_S2 * remaining));
    const desiredSpeed = Math.min(SPEED_M_S, stopSpeed);
    const nextSpeed = approachValue(robot.motion.linearSpeed, desiredSpeed, ACCEL_M_S2, DECEL_M_S2, dt);
    const travel = Math.min(remaining, nextSpeed * dt);
    const nextProgress = prevProgress + travel;
    task.segmentProgress = nextProgress;

    const prevAngle = robot.pose.angle;
    const prevPose = segmentPoseAtDistance(segment, prevProgress);
    const pose = segmentPoseAtDistance(segment, nextProgress);
    const dx = pose.x - prevPose.x;
    const dy = pose.y - prevPose.y;
    const distanceMoved = Math.hypot(dx, dy);
    const speed = dt > 0 ? distanceMoved / dt : 0;
    let pathHeading = pose.heading;
    if (distanceMoved > 1e-6) {
      pathHeading = Math.atan2(dy, dx);
    }
    const heading = segment.driveBackward ? normalizeAngle(pathHeading + Math.PI) : pathHeading;
    const vx = Math.cos(pathHeading) * speed;
    const vy = Math.sin(pathHeading) * speed;
    const w = dt > 0 ? normalizeAngle(heading - prevAngle) / dt : 0;
    const steer = speed > 0 ? Math.atan(WHEELBASE_M * (w / speed)) : 0;
    robot.pose = { x: pose.x, y: pose.y, angle: heading };
    updateVelocity(vx, vy, w, steer, 0);
    applyOdo(distanceMoved);
    robot.taskStatus = 2;

    if (segment.totalLength - nextProgress <= ARRIVAL_EPS) {
      const endPose = segmentPoseAtDistance(segment, segment.totalLength);
      robot.pose = { x: endPose.x, y: endPose.y, angle: heading };
      if (robot.currentStation !== segment.endId) {
        robot.lastStation = robot.currentStation;
        robot.currentStation = segment.endId;
      }
      if (!task.visitedNodes.includes(segment.endId)) {
        task.visitedNodes.push(segment.endId);
      }
      task.pathIndex = Math.min(task.pathNodes.length, task.pathIndex + 1);
      task.segmentIndex += 1;
      task.segmentProgress = 0;
      task.segmentMode = 'rotate';
      segment.avoidPlan = null;

      if (task.segmentIndex >= task.segments.length) {
        task.completedAt = now;
        robot.taskStatus = 4;
        robot.lastTask = task;
        robot.currentTask = null;
        resetVelocity();
      }
    }
    return;
  }

  if (robot.manual.active) {
    robot.pose = {
      x: robot.pose.x + robot.manual.vx * dt,
      y: robot.pose.y + robot.manual.vy * dt,
      angle: robot.pose.angle + robot.manual.w * dt
    };
    updateVelocity(robot.manual.vx, robot.manual.vy, robot.manual.w, robot.manual.steer, 0);
    const distanceMoved = Math.hypot(robot.manual.vx, robot.manual.vy) * dt;
    applyOdo(distanceMoved);
    const nearest = findNearestNode(robot.pose.x, robot.pose.y);
    if (nearest && Math.hypot(nearest.pos.x - robot.pose.x, nearest.pos.y - robot.pose.y) <= ARRIVAL_EPS) {
      robot.lastStation = robot.currentStation;
      robot.currentStation = nearest.id;
    }
    robot.taskStatus = 0;
    return;
  }

  resetVelocity();
  robot.taskStatus = 0;
}

function buildBaseResponse(extra) {
  return {
    ret_code: 0,
    err_msg: 'OK',
    message: 'OK',
    create_on: createOn(),
    ...extra
  };
}

function buildErrorResponse(message, code = 1) {
  return {
    ret_code: code,
    err_msg: message,
    message,
    create_on: createOn()
  };
}

function handleReloc(payload) {
  const targetId =
    payload && (payload.id || payload.station_id || payload.target_id || payload.point_id);
  const homeRequested = Boolean(payload && payload.home === true);
  const autoRequested = Boolean(payload && (payload.isAuto === true || payload.is_auto === true));
  const x = payload && Number.isFinite(payload.x) ? payload.x : null;
  const y = payload && Number.isFinite(payload.y) ? payload.y : null;
  const angle = payload && Number.isFinite(payload.angle) ? payload.angle : 0;
  let node = null;

  if (targetId && nodesById.has(targetId)) {
    node = nodesById.get(targetId);
  } else if (homeRequested) {
    const homeId = robot.homeStation || robot.currentStation;
    if (homeId && nodesById.has(homeId)) {
      node = nodesById.get(homeId);
    }
  } else if (x !== null && y !== null) {
    node = findNearestNode(x, y);
  }

  if (!node && (x === null || y === null) && !autoRequested) {
    return buildErrorResponse('invalid_reloc');
  }

  if (node) {
    robot.lastStation = robot.currentStation;
    robot.currentStation = node.id;
  }
  const poseX = x !== null ? x : node ? node.pos.x : robot.pose.x;
  const poseY = y !== null ? y : node ? node.pos.y : robot.pose.y;
  robot.pose = { x: poseX, y: poseY, angle };
  robot.currentTask = null;
  robot.taskStatus = 0;
  robot.manual.active = false;
  robot.paused = false;
  robot.relocStatus = 2;
  robot.relocCompleteAt = nowMs() + RELOC_MS;
  if (coreAdapter) {
    coreAdapter.reloc({ x: poseX, y: poseY, angle });
  }

  return buildBaseResponse({ current_station: robot.currentStation });
}

function handleConfirmLoc() {
  robot.relocStatus = 1;
  robot.relocCompleteAt = null;
  return buildBaseResponse({});
}

function handleCancelReloc() {
  robot.relocStatus = 0;
  robot.relocCompleteAt = null;
  return buildBaseResponse({});
}

function handleGoTarget(payload) {
  const targetId = (payload && (payload.id || payload.target_id || payload.target)) || null;
  if (!targetId) {
    return buildErrorResponse('missing_target');
  }
  if (!nodesById.has(targetId)) {
    return buildErrorResponse('unknown_target');
  }

  const result = startMoveToNode(targetId, 3);
  if (!result.ok) {
    return buildErrorResponse(result.error);
  }

  return buildBaseResponse({
    task_id: result.task.id,
    target_id: targetId,
    path_nodes: result.task.pathNodes
  });
}

function handleGoPoint(payload) {
  const x = payload && Number.isFinite(payload.x) ? payload.x : null;
  const y = payload && Number.isFinite(payload.y) ? payload.y : null;
  const angle = payload && Number.isFinite(payload.angle) ? payload.angle : 0;
  if (x === null || y === null) {
    return buildErrorResponse('missing_target');
  }

  const result = startMoveToPoint(x, y, angle);
  if (!result.ok) {
    return buildErrorResponse(result.error);
  }

  return buildBaseResponse({
    task_id: result.task.id,
    target_id: result.task.targetId,
    path_nodes: result.task.pathNodes
  });
}

function handleMultiStation(payload) {
  const result = startMultiStationTask(payload || []);
  if (!result.ok) {
    return buildErrorResponse(result.error);
  }
  return buildBaseResponse({
    task_id: result.task.id,
    target_id: result.task.targetId,
    path_nodes: result.task.pathNodes
  });
}

function handlePauseTask() {
  if (coreAdapter) {
    coreAdapter.pause();
    return buildBaseResponse({});
  }
  if (robot.currentTask) {
    robot.paused = true;
    robot.taskStatus = 3;
  }
  return buildBaseResponse({});
}

function handleResumeTask() {
  if (coreAdapter) {
    coreAdapter.resume();
    return buildBaseResponse({});
  }
  robot.paused = false;
  if (robot.currentTask) {
    robot.taskStatus = 2;
  }
  return buildBaseResponse({});
}

function clearTaskState(status) {
  if (coreAdapter) {
    coreAdapter.cancel();
  }
  const hadTask = Boolean(robot.currentTask);
  if (hadTask) {
    robot.lastTask = { ...robot.currentTask, completedAt: nowMs() };
  }
  robot.currentTask = null;
  robot.taskStatus = hadTask ? status : 0;
  robot.taskType = 0;
  robot.paused = false;
  if (robot.scriptPath) {
    robot.scriptPath.active = false;
  }
  resetVelocity();
}

function handleCancelTask() {
  clearTaskState(6);
  return buildBaseResponse({});
}

function handleClearTask() {
  clearTaskState(0);
  return buildBaseResponse({});
}

function handleClearMultiStation() {
  clearTaskState(0);
  return buildBaseResponse({});
}

function handleStopControl() {
  if (coreAdapter) {
    coreAdapter.stop();
    return buildBaseResponse({});
  }
  robot.manual.active = false;
  robot.manual.vx = 0;
  robot.manual.vy = 0;
  robot.manual.w = 0;
  robot.manual.steer = 0;
  robot.manual.realSteer = 0;
  robot.paused = true;
  if (robot.scriptPath) {
    robot.scriptPath.active = false;
  }
  resetVelocity();
  return buildBaseResponse({});
}

function handleMotionControl(payload) {
  if (coreAdapter) {
    coreAdapter.motion(payload || {});
    return buildBaseResponse({});
  }
  const vx = payload && Number.isFinite(payload.vx) ? payload.vx : 0;
  const vy = payload && Number.isFinite(payload.vy) ? payload.vy : 0;
  const w = payload && Number.isFinite(payload.w) ? payload.w : 0;
  const steer = payload && Number.isFinite(payload.steer) ? payload.steer : 0;
  const realSteer = payload && Number.isFinite(payload.real_steer) ? payload.real_steer : 0;

  robot.manual.active = true;
  robot.manual.vx = vx;
  robot.manual.vy = vy;
  robot.manual.w = w;
  robot.manual.steer = steer;
  robot.manual.realSteer = realSteer;
  robot.paused = false;
  if (robot.scriptPath) {
    robot.scriptPath.active = false;
    robot.scriptPath.done = false;
  }
  updateVelocity(vx, vy, w, steer, 0);
  return buildBaseResponse({});
}

function handleSetForkHeight(payload) {
  const height = payload && Number.isFinite(payload.height) ? payload.height : 0;
  const target = clampForkHeight(height);
  robot.fork.targetHeight = target;
  robot.fork.heightInPlace = Math.abs(robot.fork.height - target) <= FORK_EPS;
  robot.fork.forwardInPlace = robot.fork.heightInPlace;
  robot.fork.autoFlag = true;
  return buildBaseResponse({ fork_height: robot.fork.height });
}

function handleForkStop() {
  robot.fork.targetHeight = robot.fork.height;
  robot.fork.speed = 0;
  robot.fork.forwardVal = 0;
  robot.fork.heightInPlace = true;
  robot.fork.forwardInPlace = true;
  return buildBaseResponse({});
}

function setIoValue(type, id, status, source = 'normal') {
  if (!robot.io) {
    robot.io = { di: {}, do: {}, diMeta: {}, doMeta: {} };
  }
  const key = type === 'di' ? 'di' : 'do';
  const metaKey = type === 'di' ? 'diMeta' : 'doMeta';
  if (!robot.io[key]) {
    robot.io[key] = {};
  }
  robot.io[key][id] = Boolean(status);
  if (!robot.io[metaKey]) {
    robot.io[metaKey] = {};
  }
  if (!robot.io[metaKey][id]) {
    robot.io[metaKey][id] = {};
  }
  if (source) {
    robot.io[metaKey][id].source = source;
  }
  if (type === 'di' && robot.io[metaKey][id].valid === undefined) {
    robot.io[metaKey][id].valid = true;
  }
}

function handleSetDo(payload) {
  const id = payload && payload.id;
  const status = payload && typeof payload.status === 'boolean' ? payload.status : Boolean(payload && payload.value);
  if (id !== undefined) {
    setIoValue('do', id, status, 'normal');
  }
  return buildBaseResponse({});
}

function handleSetDoBatch(payload) {
  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const id = entry && entry.id;
      const status = entry && typeof entry.status === 'boolean' ? entry.status : Boolean(entry && entry.value);
      if (id !== undefined) {
        setIoValue('do', id, status, 'normal');
      }
    }
  }
  return buildBaseResponse({});
}

function handleSetDi(payload) {
  const id = payload && payload.id;
  const status = payload && typeof payload.status === 'boolean' ? payload.status : Boolean(payload && payload.value);
  if (id !== undefined) {
    setIoValue('di', id, status, 'normal');
  }
  return buildBaseResponse({});
}

function buildInfoResponse() {
  return {
    architecture: ROBOT_ARCH,
    create_on: createOn(),
    current_map: robot.currentMap || '',
    current_map_md5: robot.currentMapMd5 || '',
    dsp_version: ROBOT_DSP_VERSION,
    echoid: ROBOT_ECHOID,
    echoid_type: ROBOT_ECHOID_TYPE,
    features: ROBOT_FEATURES,
    gyro_version: ROBOT_GYRO_VERSION,
    id: robot.id,
    model: ROBOT_MODEL,
    model_md5: ROBOT_MODEL_MD5,
    product: ROBOT_PRODUCT,
    ret_code: 0,
    roboshop_min_version_required: ROBOSHOP_MIN_VERSION_REQUIRED,
    robot_note: ROBOT_NOTE,
    vehicle_id: ROBOT_VEHICLE_ID,
    version: ROBOT_VERSION
  };
}

function buildLocResponse() {
  const pose = STATUS_HIDE_POSE
    ? { x: null, y: null, angle: null }
    : { x: robot.pose.x, y: robot.pose.y, angle: robot.pose.angle };
  const currentStation = STATUS_FORCE_CURRENT_STATION
    ? STATUS_FORCE_CURRENT_STATION
    : STATUS_HIDE_CURRENT_STATION
    ? ''
    : robot.currentStation;
  let lastStation = STATUS_HIDE_LAST_STATION ? '' : robot.lastStation;
  if (!STATUS_HIDE_LAST_STATION && STATUS_LAST_STATION_IS_CURRENT) {
    lastStation = currentStation;
  }
  return buildBaseResponse({
    x: pose.x,
    y: pose.y,
    angle: pose.angle,
    confidence: robot.confidence,
    current_station: currentStation,
    last_station: lastStation
  });
}

function buildSpeedResponse() {
  return buildBaseResponse({
    vx: robot.velocity.vx,
    vy: robot.velocity.vy,
    w: robot.velocity.w,
    steer: robot.velocity.steer,
    spin: robot.velocity.spin,
    r_vx: robot.velocity.r_vx,
    r_vy: robot.velocity.r_vy,
    r_w: robot.velocity.r_w,
    r_steer: robot.velocity.r_steer,
    r_spin: robot.velocity.r_spin,
    motor_cmd: robot.motors.map((motor) => ({
      motor_name: motor.motor_name,
      value: motor.speed
    })),
    steer_angles: robot.velocity.steer,
    is_stop: isStopped()
  });
}

function buildMotorResponse(payload) {
  const requested = payload && Array.isArray(payload.motor_names) ? payload.motor_names : null;
  const motors = requested && requested.length > 0
    ? robot.motors.filter((motor) => requested.includes(motor.motor_name))
    : robot.motors;
  const entries = motors.map((motor) => ({
    motor_name: motor.motor_name,
    position: motor.position,
    speed: motor.speed
  }));
  return buildBaseResponse({
    motor_info: entries,
    motors: entries
  });
}

function buildRunResponse() {
  const time = nowMs() - robot.bootAt;
  return buildBaseResponse({
    odo: robot.odo,
    today_odo: robot.todayOdo,
    time,
    total_time: time,
    controller_temp: robot.controllerTemp,
    motor_info: robot.motors.map((motor) => ({
      motor_name: motor.motor_name,
      position: motor.position
    })),
    running_status: robot.taskStatus,
    procBusiness: robot.taskStatus === 2
  });
}

function buildModeResponse() {
  return buildBaseResponse({
    mode: 1,
    manual: false,
    auto: true
  });
}

function buildBatteryResponse() {
  return buildBaseResponse({
    battery_level: batteryRatio(robot.battery),
    battery_temp: robot.batteryTemp,
    charging: robot.charging,
    voltage: robot.voltage,
    current: robot.current,
    max_charge_voltage: robot.voltage,
    max_charge_current: robot.current,
    manual_charge: false,
    auto_charge: false,
    battery_cycle: robot.batteryCycle
  });
}

function buildPathResponse() {
  const task = robot.currentTask || robot.lastTask;
  const path = task && Array.isArray(task.pathNodes) ? task.pathNodes : [];
  return buildBaseResponse({ path });
}

function buildAreaResponse() {
  return buildBaseResponse({
    area_id: 0,
    area_name: ''
  });
}

function buildDiList() {
  const meta = robot.io.diMeta || {};
  return Object.entries(robot.io.di || {}).map(([id, value]) => {
    const info = meta[id] || {};
    return {
      id: Number(id),
      source: info.source || 'normal',
      status: Boolean(value),
      valid: info.valid !== undefined ? Boolean(info.valid) : true
    };
  });
}

function buildDoList() {
  const meta = robot.io.doMeta || {};
  return Object.entries(robot.io.do || {}).map(([id, value]) => {
    const info = meta[id] || {};
    return {
      id: Number(id),
      source: info.source || 'normal',
      status: Boolean(value)
    };
  });
}

function buildIoResponse() {
  const diEntries = Object.entries(robot.io.di || {});
  const doEntries = Object.entries(robot.io.do || {});
  const diList = buildDiList();
  const doList = buildDoList();
  return buildBaseResponse({
    di: robot.io.di,
    do: robot.io.do,
    di_list: diEntries.map(([id, value]) => ({ id: Number(id), value: Boolean(value) })),
    do_list: doEntries.map(([id, value]) => ({ id: Number(id), value: Boolean(value) })),
    DI: diList,
    DO: doList
  });
}

function buildBlockResponse() {
  return buildBaseResponse({
    blocked: robot.blocked,
    block_reason: robot.blockReason,
    block_x: robot.blockPos.x,
    block_y: robot.blockPos.y,
    block_id: robot.blockId || 0,
    slow_down: robot.slowDown,
    slow_reason: robot.slowReason,
    slow_x: robot.slowPos.x,
    slow_y: robot.slowPos.y,
    slow_id: robot.slowId || 0
  });
}

function buildBrakeResponse() {
  return buildBaseResponse({
    brake: robot.brake
  });
}

function buildLaserResponse() {
  return buildBaseResponse({
    lasers: []
  });
}

function buildUltrasonicResponse() {
  return buildBaseResponse({
    ultrasonic: []
  });
}

function buildPolygonResponse() {
  return buildBaseResponse({
    polygons: []
  });
}

function buildObstacleResponse() {
  return buildBaseResponse({
    obstacles: listSimObstacles()
  });
}

function buildEmergencyResponse() {
  return buildBaseResponse({
    emergency: robot.emergency,
    driver_emc: robot.driverEmc,
    electric: robot.electric,
    soft_emc: robot.softEmc
  });
}

function buildImuResponse() {
  return buildBaseResponse({
    yaw: 0,
    roll: 0,
    pitch: 0
  });
}

function buildRelocStatusResponse() {
  return buildBaseResponse({
    reloc_status: robot.relocStatus,
    current_station: robot.currentStation
  });
}

function buildLoadmapStatusResponse() {
  return buildBaseResponse({
    map: graph.meta && graph.meta.mapName ? graph.meta.mapName : '',
    map_status: 0
  });
}

function buildCalibrationStatusResponse() {
  return buildBaseResponse({
    calibration_status: 0
  });
}

function buildTrackingStatusResponse() {
  return buildBaseResponse({
    tracking_status: 0
  });
}

function buildSlamStatusResponse() {
  return buildBaseResponse({
    slam_status: 0
  });
}

function buildForkResponse() {
  return buildBaseResponse({
    fork_height: robot.fork.height,
    fork_height_in_place: robot.fork.heightInPlace,
    fork_auto_flag: robot.fork.autoFlag,
    forward_val: robot.fork.forwardVal,
    forward_in_place: robot.fork.forwardInPlace,
    fork_pressure_actual: robot.fork.pressureActual
  });
}

function buildTaskStatusResponse(payload) {
  const task = robot.currentTask || robot.lastTask;
  const paths = getTaskPaths(task);
  const simple = Boolean(payload && payload.simple === true);
  const response = {
    task_status: robot.taskStatus,
    task_type: robot.taskType,
    task_id: task ? task.id : null,
    target_id: task ? task.targetId : null,
    target_point: task ? task.targetPoint : null,
    move_status: 0
  };
  if (!simple) {
    response.finished_path = paths.finished;
    response.unfinished_path = paths.unfinished;
  }
  return buildBaseResponse(response);
}

function buildTasklistStatusResponse() {
  return buildBaseResponse({
    tasklist_status: robot.taskStatus,
    tasklist: []
  });
}

function buildAlarmResponse() {
  const alarms = robot.alarms;
  return buildBaseResponse({
    fatals: alarms.fatals,
    errors: alarms.errors,
    warnings: alarms.warnings,
    notices: alarms.notices,
    alarms
  });
}

function buildInitResponse() {
  return {
    create_on: createOn(),
    init_status: 1,
    ret_code: 0
  };
}

function buildMapResponse() {
  const mapName = graph.meta && graph.meta.mapName ? graph.meta.mapName : '';
  return buildBaseResponse({
    current_map: mapName,
    maps: mapName ? [mapName] : []
  });
}

function buildStationResponse() {
  const stations = (graph.nodes || [])
    .filter((node) => node.className === 'LocationMark' || node.className === 'ActionPoint')
    .map((node) => node.id);
  return buildBaseResponse({
    stations
  });
}

function buildParamsResponse() {
  if (rdsParamsPayload && typeof rdsParamsPayload === 'object') {
    return {
      ...rdsParamsPayload,
      create_on: createOn()
    };
  }
  return {
    create_on: createOn(),
    ret_code: 0,
    params: {}
  };
}

function buildDeviceTypesResponse() {
  const deviceTypes =
    rdsDeviceTypesPayload && Array.isArray(rdsDeviceTypesPayload.deviceTypes)
      ? rdsDeviceTypesPayload.deviceTypes
      : [];
  return {
    model: ROBOT_MODEL,
    deviceTypes
  };
}

function buildAllResponse() {
  return {
    create_on: createOn(),
    current_map: robot.currentMap || '',
    current_map_md5: robot.currentMapMd5 || '',
    model_md5: ROBOT_MODEL_MD5,
    ret_code: 0
  };
}

function buildTaskPathResponse() {
  const task = robot.currentTask || robot.lastTask;
  const path = task && Array.isArray(task.pathNodes) ? task.pathNodes : [];
  return buildBaseResponse({ path });
}

function buildTaskListStatus() {
  const status = robot.taskStatus;
  return buildBaseResponse({
    tasklist_status: status,
    robot_status: {
      battery_level: batteryRatio(robot.battery)
    }
  });
}

function buildTaskListNames() {
  return buildBaseResponse({ tasklists: [] });
}

function buildAudioList() {
  return buildBaseResponse({ audios: [] });
}

function handleRequest(apiNo, payload, allowedApis) {
  if (allowedApis && !allowedApis.has(apiNo)) {
    return buildErrorResponse('wrong_port', 60000);
  }
  if (coreAdapter) {
    coreAdapter.syncRobot(robot, nodesById, { currentPointDist: CURRENT_POINT_DIST });
  }

  switch (apiNo) {
    case API.robot_status_info_req:
      return buildInfoResponse();
    case API.robot_status_run_req:
      return buildRunResponse();
    case API.robot_status_mode_req:
      return buildModeResponse();
    case API.robot_status_loc_req:
      return buildLocResponse();
    case API.robot_status_speed_req:
      return buildSpeedResponse();
    case API.robot_status_motor_req:
      return buildMotorResponse(payload || {});
    case API.robot_status_path_req:
      return buildPathResponse();
    case API.robot_status_area_req:
      return buildAreaResponse();
    case API.robot_status_block_req:
      return buildBlockResponse();
    case API.robot_status_battery_req:
      return buildBatteryResponse();
    case API.robot_status_brake_req:
      return buildBrakeResponse();
    case API.robot_status_laser_req:
      return buildLaserResponse();
    case API.robot_status_ultrasonic_req:
      return buildUltrasonicResponse();
    case API.robot_status_polygon_req:
      return buildPolygonResponse();
    case API.robot_status_obstacle_req:
      return buildObstacleResponse();
    case API.robot_status_emergency_req:
      return buildEmergencyResponse();
    case API.robot_status_io_res:
    case API.robot_status_io_req:
      return buildIoResponse();
    case API.robot_status_imu_req:
      return buildImuResponse();
    case API.robot_status_reloc_req:
      return buildRelocStatusResponse();
    case API.robot_status_loadmap_req:
      return buildLoadmapStatusResponse();
    case API.robot_status_calibration_req:
      return buildCalibrationStatusResponse();
    case API.robot_status_tracking_req:
      return buildTrackingStatusResponse();
    case API.robot_status_slam_req:
      return buildSlamStatusResponse();
    case API.robot_status_tasklist_req:
      return buildTasklistStatusResponse();
    case API.robot_status_task_req:
      return buildTaskStatusResponse(payload || {});
    case API.robot_status_fork_req:
      return buildForkResponse();
    case API.robot_status_alarm_req:
    case API.robot_status_alarm_res:
      return buildAlarmResponse();
    case API.robot_status_all1_req:
      return buildAllResponse();
    case API.robot_status_all2_req:
      return buildAllResponse();
    case API.robot_status_all3_req:
      return buildAllResponse();
    case API.robot_status_all4_req:
      return buildAllResponse();
    case API.robot_status_init_req:
      return buildInitResponse();
    case API.robot_status_map_req:
      return buildMapResponse();
    case API.robot_status_station_req:
      return buildStationResponse();
    case API.robot_status_params_req:
      return buildParamsResponse();
    case API.robot_status_device_types_req:
      return buildDeviceTypesResponse();
    case API.robot_status_file_req:
      return null;
    case API.robot_control_reloc_req:
      return handleReloc(payload || {});
    case API.robot_control_stop_req:
      return handleStopControl();
    case API.robot_control_gyrocal_req:
      return buildBaseResponse({});
    case API.robot_control_comfirmloc_req:
      return handleConfirmLoc();
    case API.robot_control_cancelreloc_req:
      return handleCancelReloc();
    case API.robot_control_clearencoder_req:
      return buildBaseResponse({});
    case API.robot_control_motion_req:
      return handleMotionControl(payload || {});
    case API.robot_control_loadmap_req:
      return buildBaseResponse({});
    case API.robot_task_gotarget_req:
      return handleGoTarget(payload || {});
    case API.robot_task_gopoint_req:
      return handleGoPoint(payload || {});
    case API.robot_task_multistation_req:
      return handleMultiStation(payload || {});
    case API.robot_task_pause_req:
      return handlePauseTask();
    case API.robot_task_resume_req:
      return handleResumeTask();
    case API.robot_task_cancel_req:
      return handleCancelTask();
    case API.robot_task_target_path_req:
      return buildTaskPathResponse();
    case API.robot_task_translate_req:
      return buildBaseResponse({});
    case API.robot_task_turn_req:
      return buildBaseResponse({});
    case API.robot_task_gostart_req:
      return buildBaseResponse({});
    case API.robot_task_goend_req:
      return buildBaseResponse({});
    case API.robot_task_gowait_req:
      return buildBaseResponse({});
    case API.robot_task_charge_req:
      return buildBaseResponse({});
    case API.robot_task_test_req:
      return buildBaseResponse({});
    case API.robot_task_goshelf_req:
      return buildBaseResponse({});
    case API.robot_task_uwb_follow_req:
      return buildBaseResponse({});
    case API.robot_task_calibwheel_req:
      return buildBaseResponse({});
    case API.robot_task_caliblaser_req:
      return buildBaseResponse({});
    case API.robot_task_calibminspeed_req:
      return buildBaseResponse({});
    case API.robot_task_calibcancel_req:
      return buildBaseResponse({});
    case API.robot_task_calibclear_req:
      return buildBaseResponse({});
    case API.robot_tasklist_req:
      return buildBaseResponse({});
    case API.robot_task_clear_multistation_req:
      return handleClearMultiStation();
    case API.robot_task_clear_task_req:
      return handleClearTask();
    case API.robot_tasklist_status_req:
      return buildTaskListStatus();
    case API.robot_tasklist_pause_req:
      return buildBaseResponse({});
    case API.robot_tasklist_resume_req:
      return buildBaseResponse({});
    case API.robot_tasklist_cancel_req:
      return buildBaseResponse({});
    case API.robot_tasklist_next_req:
      return buildBaseResponse({});
    case API.robot_tasklist_result_req:
      return buildBaseResponse({});
    case API.robot_tasklist_result_list_req:
      return buildBaseResponse({});
    case API.robot_tasklist_upload_req:
      return buildBaseResponse({});
    case API.robot_tasklist_download_req:
      return buildBaseResponse({});
    case API.robot_tasklist_delete_req:
      return buildBaseResponse({});
    case API.robot_tasklist_list_req:
      return buildTaskListNames();
    case API.robot_tasklist_name_req:
      return buildBaseResponse({});
    case API.robot_other_audio_play_req:
      return buildBaseResponse({});
    case API.robot_other_setdo_req:
      return handleSetDo(payload || {});
    case API.robot_other_setdobatch_req:
      return handleSetDoBatch(payload || []);
    case API.robot_other_softemc_req:
      robot.softEmc = Boolean(payload && payload.status);
      return buildBaseResponse({});
    case API.robot_other_audiopause_req:
      return buildBaseResponse({});
    case API.robot_other_audiocont_req:
      return buildBaseResponse({});
    case API.robot_other_setdi_req:
      return handleSetDi(payload || {});
    case API.robot_other_audiolist_req:
      return buildAudioList();
    case API.robot_other_forkheight_req:
      return handleSetForkHeight(payload || {});
    case API.robot_other_forkstop_req:
      return handleForkStop();
    case API.robot_config_push_req:
      return handlePushConfig(payload || {});
    default:
      return buildErrorResponse(`unsupported_api_${apiNo}`);
  }
}

const allowedStateApis = new Set([
  API.robot_status_info_req,
  API.robot_status_run_req,
  API.robot_status_mode_req,
  API.robot_status_loc_req,
  API.robot_status_speed_req,
  API.robot_status_motor_req,
  API.robot_status_path_req,
  API.robot_status_area_req,
  API.robot_status_block_req,
  API.robot_status_battery_req,
  API.robot_status_brake_req,
  API.robot_status_laser_req,
  API.robot_status_ultrasonic_req,
  API.robot_status_polygon_req,
  API.robot_status_obstacle_req,
  API.robot_status_emergency_req,
  API.robot_status_io_res,
  API.robot_status_io_req,
  API.robot_status_imu_req,
  API.robot_status_reloc_req,
  API.robot_status_loadmap_req,
  API.robot_status_calibration_req,
  API.robot_status_tracking_req,
  API.robot_status_slam_req,
  API.robot_status_tasklist_req,
  API.robot_status_task_req,
  API.robot_status_fork_req,
  API.robot_status_alarm_req,
  API.robot_status_alarm_res,
  API.robot_status_all1_req,
  API.robot_status_all2_req,
  API.robot_status_all3_req,
  API.robot_status_all4_req,
  API.robot_status_init_req,
  API.robot_status_map_req,
  API.robot_status_station_req,
  API.robot_status_params_req,
  API.robot_status_device_types_req,
  API.robot_status_file_req,
  API.robot_control_reloc_req
]);
const allowedCtrlApis = new Set([
  API.robot_control_stop_req,
  API.robot_control_gyrocal_req,
  API.robot_control_reloc_req,
  API.robot_control_comfirmloc_req,
  API.robot_control_cancelreloc_req,
  API.robot_control_clearencoder_req,
  API.robot_control_motion_req,
  API.robot_control_loadmap_req,
  API.robot_status_speed_req
]);
const allowedTaskApis = new Set([
  API.robot_task_pause_req,
  API.robot_task_resume_req,
  API.robot_task_cancel_req,
  API.robot_task_gopoint_req,
  API.robot_task_gotarget_req,
  API.robot_task_target_path_req,
  API.robot_task_translate_req,
  API.robot_task_turn_req,
  API.robot_task_gostart_req,
  API.robot_task_goend_req,
  API.robot_task_gowait_req,
  API.robot_task_charge_req,
  API.robot_task_test_req,
  API.robot_task_goshelf_req,
  API.robot_task_multistation_req,
  API.robot_task_clear_multistation_req,
  API.robot_task_clear_task_req,
  API.robot_task_uwb_follow_req,
  API.robot_task_calibwheel_req,
  API.robot_task_caliblaser_req,
  API.robot_task_calibminspeed_req,
  API.robot_task_calibcancel_req,
  API.robot_task_calibclear_req,
  API.robot_tasklist_req,
  API.robot_tasklist_status_req,
  API.robot_tasklist_pause_req,
  API.robot_tasklist_resume_req,
  API.robot_tasklist_cancel_req,
  API.robot_tasklist_next_req,
  API.robot_tasklist_result_req,
  API.robot_tasklist_result_list_req,
  API.robot_tasklist_upload_req,
  API.robot_tasklist_download_req,
  API.robot_tasklist_delete_req,
  API.robot_tasklist_list_req,
  API.robot_tasklist_name_req
]);
const allowedOtherApis = new Set([
  API.robot_other_audio_play_req,
  API.robot_other_setdo_req,
  API.robot_other_setdobatch_req,
  API.robot_other_softemc_req,
  API.robot_other_audiopause_req,
  API.robot_other_audiocont_req,
  API.robot_other_setdi_req,
  API.robot_other_audiolist_req,
  API.robot_other_forkheight_req,
  API.robot_other_forkstop_req
]);
const allowedRobodApis = null;
const allowedKernelApis = null;
const allowedConfigApis = new Set([API.robot_config_push_req]);

function createServer(port, allowedApis, label) {
  const server = net.createServer((socket) => {
    const parser = new RbkParser({ maxBodyLength: MAX_BODY_LENGTH });

    socket.on('data', (chunk) => {
      let messages = [];
      try {
        messages = parser.push(chunk);
      } catch (err) {
        socket.destroy();
        return;
      }

      for (const msg of messages) {
        const responsePayload = handleRequest(msg.apiNo, msg.payload, allowedApis);
        const frame = encodeFrame(msg.seq, responseApi(msg.apiNo), responsePayload);
        socket.write(frame);
      }
    });
  });

  server.listen(port, BIND_HOST || undefined, () => {
    const hostLabel = BIND_HOST || '0.0.0.0';
    console.log(`robokit-sim ${label} listening on tcp://${hostLabel}:${port}`);
  });

  return server;
}

const pushConnections = new Map();
let pushSeq = 1;
const pushDefaults = {
  intervalMs: 1000,
  includedFields: null,
  excludedFields: null
};

function cloneFieldList(list) {
  return Array.isArray(list) ? [...list] : null;
}

function applyPushConfig(target, payload) {
  if (!payload || typeof payload !== 'object') {
    return { ok: true };
  }
  const included = Array.isArray(payload.included_fields)
    ? payload.included_fields
    : Array.isArray(payload.include_fields)
      ? payload.include_fields
      : null;
  const excluded = Array.isArray(payload.excluded_fields)
    ? payload.excluded_fields
    : Array.isArray(payload.exclude_fields)
      ? payload.exclude_fields
      : null;
  if (included && excluded) {
    return { ok: false, error: 'include_exclude_conflict' };
  }
  const interval = Number.parseInt(payload.interval, 10);
  if (Number.isFinite(interval)) {
    target.intervalMs = interval;
  }
  if (included) {
    target.includedFields = cloneFieldList(included);
    target.excludedFields = null;
  }
  if (excluded) {
    target.excludedFields = cloneFieldList(excluded);
    target.includedFields = null;
  }
  return { ok: true };
}

function handlePushConfig(payload) {
  const result = applyPushConfig(pushDefaults, payload);
  if (!result.ok) {
    return buildErrorResponse(result.error);
  }
  for (const conn of pushConnections.values()) {
    applyPushConfig(conn, payload);
    startPushTimer(conn);
  }
  return buildBaseResponse({});
}

function getCurrentStationForPush() {
  const nearest = findNearestNode(robot.pose.x, robot.pose.y);
  if (!nearest) {
    return '';
  }
  const dist = Math.hypot(nearest.pos.x - robot.pose.x, nearest.pos.y - robot.pose.y);
  if (dist > CURRENT_POINT_DIST) {
    return '';
  }
  return nearest.id;
}

function buildPushFields() {
  const task = robot.currentTask || robot.lastTask;
  const paths = getTaskPaths(task);
  const mapName = graph.meta && graph.meta.mapName ? graph.meta.mapName : '';
  const diList = buildDiList();
  const doList = buildDoList();
  return {
    controller_temp: robot.controllerTemp,
    x: robot.pose.x,
    y: robot.pose.y,
    angle: robot.pose.angle,
    current_station: getCurrentStationForPush(),
    vx: robot.velocity.vx,
    vy: robot.velocity.vy,
    w: robot.velocity.w,
    steer: robot.velocity.steer,
    blocked: robot.blocked,
    battery_level: batteryRatio(robot.battery),
    charging: robot.charging,
    emergency: robot.emergency,
    DI: diList,
    DO: doList,
    fatals: robot.alarms.fatals,
    errors: robot.alarms.errors,
    warnings: robot.alarms.warnings,
    notices: robot.alarms.notices,
    current_map: mapName,
    vehicle_id: robot.id,
    requestVoltage: robot.requestVoltage,
    requestCurrent: robot.requestCurrent,
    brake: robot.brake,
    confidence: robot.confidence,
    is_stop: isStopped(),
    fork: { fork_height: robot.fork.height },
    target_point: task ? task.targetPoint : null,
    target_label: '',
    target_id: task ? task.targetId : '',
    target_dist: 0,
    task_status: robot.taskStatus,
    task_staus: robot.taskStatus,
    running_status: robot.taskStatus,
    task_type: robot.taskType,
    map: mapName,
    battery_temp: robot.batteryTemp,
    voltage: robot.voltage,
    current: robot.current,
    finished_path: paths.finished,
    unfinished_path: paths.unfinished
  };
}

function buildPushPayload(conn) {
  const values = buildPushFields();
  const payload = buildBaseResponse({});
  const included = conn && Array.isArray(conn.includedFields) ? conn.includedFields : null;
  const excluded = conn && Array.isArray(conn.excludedFields) ? conn.excludedFields : null;
  if (included) {
    for (const field of included) {
      if (Object.prototype.hasOwnProperty.call(values, field)) {
        payload[field] = values[field];
      }
    }
    return payload;
  }
  const excludedSet = new Set(excluded || []);
  for (const [key, value] of Object.entries(values)) {
    if (!excludedSet.has(key)) {
      payload[key] = value;
    }
  }
  return payload;
}

function startPushTimer(conn) {
  if (conn.timer) {
    clearInterval(conn.timer);
  }
  const interval = Math.max(PUSH_MIN_INTERVAL_MS, Number.parseInt(conn.intervalMs || 1000, 10));
  conn.timer = setInterval(() => {
    if (conn.socket.destroyed) {
      clearInterval(conn.timer);
      return;
    }
    const payload = buildPushPayload(conn);
    const frame = encodeFrame(pushSeq++, API.robot_push, payload);
    conn.socket.write(frame);
  }, interval);
}

function createPushServer(port) {
  const server = net.createServer((socket) => {
    const parser = new RbkParser({ maxBodyLength: MAX_BODY_LENGTH });
    const conn = {
      socket,
      intervalMs: pushDefaults.intervalMs,
      includedFields: cloneFieldList(pushDefaults.includedFields),
      excludedFields: cloneFieldList(pushDefaults.excludedFields),
      timer: null
    };
    pushConnections.set(socket, conn);

    socket.on('data', (chunk) => {
      let messages = [];
      try {
        messages = parser.push(chunk);
      } catch (err) {
        socket.destroy();
        return;
      }

      for (const msg of messages) {
        if (msg.apiNo !== API.robot_push_config_req) {
          const frame = encodeFrame(msg.seq, responseApi(msg.apiNo), buildErrorResponse('unsupported_api'), {
            reserved: msg.reserved
          });
          socket.write(frame);
          continue;
        }
        const payload = msg.payload || {};
        const result = applyPushConfig(conn, payload);
        const responsePayload = result.ok ? buildBaseResponse({}) : buildErrorResponse(result.error);
        const frame = encodeFrame(msg.seq, responseApi(msg.apiNo), responsePayload, { reserved: msg.reserved });
        socket.write(frame);
        if (result.ok) {
          startPushTimer(conn);
        }
      }
    });

    socket.on('close', () => {
      if (conn.timer) {
        clearInterval(conn.timer);
      }
      pushConnections.delete(socket);
    });
  });

  server.listen(port, BIND_HOST || undefined, () => {
    const hostLabel = BIND_HOST || '0.0.0.0';
    console.log(`robokit-sim push listening on tcp://${hostLabel}:${port}`);
  });

  return server;
}

function handleHttpSetOrder(order) {
  const blocks = order && Array.isArray(order.blocks) ? order.blocks : null;
  if (!blocks || blocks.length === 0) {
    return buildErrorResponse('missing_blocks');
  }
  const result = startMultiStationTask(order);
  if (!result.ok) {
    return buildErrorResponse(result.error);
  }
  return buildBaseResponse({
    task_id: result.task.id,
    target_id: result.task.targetId,
    path_nodes: result.task.pathNodes
  });
}

function handleHttpAddObstacle(payload) {
  const result = addSimObstacle(payload || {});
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, obstacle: result.obstacle, obstacles: listSimObstacles() };
}

function handleHttpClearObstacles() {
  clearSimObstacles();
  if (coreAdapter?.sim?.handleBlocked) {
    coreAdapter.sim.handleBlocked({ robotId: robot.id, blocked: false });
  }
  if (robot.blocked && robot.blockReason === BLOCK_REASON_OBSTACLE) {
    setRobotBlockedState(false);
  }
  return { ok: true, obstacles: [] };
}

function handleHttpListObstacles() {
  return { ok: true, obstacles: listSimObstacles() };
}

function normalizeBlockedValue(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  let blocked = payload.blocked;
  if (blocked === undefined) blocked = payload.status;
  if (blocked === undefined) blocked = payload.enabled;
  if (blocked === undefined) blocked = payload.enable;
  if (blocked === undefined) blocked = payload.value;
  if (blocked === undefined) return null;
  if (typeof blocked === 'string') {
    const lowered = blocked.trim().toLowerCase();
    return lowered !== 'false' && lowered !== '0' && lowered !== '';
  }
  return Boolean(blocked);
}

function handleHttpSetBlocked(payload) {
  const blocked = normalizeBlockedValue(payload);
  if (blocked === null) {
    return { ok: false, error: 'missing_blocked' };
  }
  if (coreAdapter?.sim?.handleBlocked) {
    coreAdapter.sim.handleBlocked({ robotId: robot.id, blocked, reason: payload?.reason });
  }
  if (blocked) {
    const x = Number.isFinite(payload.x) ? payload.x : robot.pose.x;
    const y = Number.isFinite(payload.y) ? payload.y : robot.pose.y;
    setRobotBlockedState(true, {
      reason: payload.reason,
      id: payload.id,
      x,
      y
    });
  } else {
    setRobotBlockedState(false);
  }
  return {
    ok: true,
    blocked: robot.blocked,
    block_reason: robot.blockReason,
    block_id: robot.blockId || 0,
    block_x: robot.blockPos.x,
    block_y: robot.blockPos.y
  };
}

setInterval(tickSimulation, TICK_MS);

createServer(ROBOD_PORT, allowedRobodApis, 'robod');
createServer(STATE_PORT, allowedStateApis, 'state');
createServer(CTRL_PORT, allowedCtrlApis, 'ctrl');
createServer(TASK_PORT, allowedTaskApis, 'task');
createServer(KERNEL_PORT, allowedKernelApis, 'kernel');
createServer(OTHER_PORT, allowedOtherApis, 'other');
createServer(CONFIG_PORT, allowedConfigApis, 'config');
createPushServer(PUSH_PORT);
startHttpStub({
  onSetOrder: handleHttpSetOrder,
  onAddObstacle: handleHttpAddObstacle,
  onClearObstacles: handleHttpClearObstacles,
  onListObstacles: handleHttpListObstacles,
  onSetBlocked: handleHttpSetBlocked
});

console.log(`robokit-sim using graph: ${GRAPH_PATH}`);
console.log(`robokit-sim start node: ${robot.currentStation}`);
if (robotConfigInfo) {
  console.log(`robokit-sim robot config: ${robotConfigInfo.path}`);
}
