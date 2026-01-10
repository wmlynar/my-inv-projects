const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const net = require('net');

const {
  API,
  encodeFrame,
  responseApi,
  RbkParser,
  START_MARK,
  VERSION,
  HEADER_LEN
} = require('../../packages/robokit-lib/rbk');
const { loadMapGraphLight } = require('../../packages/robokit-lib/map_loader');
const { startHttpStub } = require('./http_stub');
const { SimModule } = require('./syspy-js');
const MotionKernel = require('../../packages/robokit-lib/motion_kernel');
const config = require('./lib/config');
const { ControlArbiter } = require('./core/control_arbiter');
const { createControlPolicy } = require('./protocol/control_policy');
const { ClientRegistry } = require('./transport/client_registry');

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

const {
  GRAPH_PATH,
  ROBOKIT_TRAFFIC_STRATEGY,
  PORTS: ENV_PORTS,
  BIND_HOST,
  ROBOT_CONFIG_PATH,
  ROBOT_ID,
  ROBOT_MODEL,
  ROBOT_VERSION,
  ROBOT_MODEL_MD5,
  ROBOT_PRODUCT,
  ROBOT_NOTE,
  ROBOT_VEHICLE_ID,
  ROBOT_ARCH,
  ROBOT_DSP_VERSION,
  ROBOT_GYRO_VERSION,
  ROBOT_ECHOID,
  ROBOT_ECHOID_TYPE,
  ROBOT_IP,
  ROBOT_MAC,
  ROBOT_WLAN_MAC,
  ROBOT_MODEL_VERSION,
  ROBOT_MAP_VERSION,
  ROBOT_MODBUS_VERSION,
  ROBOT_NET_PROTOCOL_VERSION,
  ROBOT_SAFE_MODEL_MD5,
  ROBOT_CALIBRATED,
  ROBOT_MOTOR_NAMES,
  ROBOSHOP_MIN_VERSION_REQUIRED,
  ROBOT_TIMEZONE_OFFSET,
  ROBOT_FILE_ROOTS,
  ROBOT_PARAMS_PATH,
  ROBOT_DEVICE_TYPES_PATH,
  ROBOT_DEVICE_TYPES_EXT_PATH,
  ROBOT_DEVICE_TYPES_MODULE_PATH,
  ROBOT_FILE_LIST_PATH,
  ROBOT_FILE_LIST_MODULES_PATH,
  ROBOT_MAP_PROPERTIES_PATH,
  ROBOT_CONFIG_MAP_PATH,
  START_NODE_ID,
  START_POSE_X,
  START_POSE_Y,
  START_POSE_ANGLE,
  START_FORK_HEIGHT,
  APPROACH_MERGE_DIST,
  APPROACH_CONTROL_SCALE,
  APPROACH_TURN_PENALTY,
  APPROACH_REVERSE_PENALTY,
  APPROACH_SAMPLE_STEP,
  IDLE_CURRENT_A,
  IDLE_VOLTAGE_V,
  AUTO_CHARGE_DELAY_MS,
  CHARGE_START_CURRENT_A,
  CHARGE_START_HOLD_MS,
  CHARGE_CURRENT_A,
  CHARGE_CURRENT_RAMP_A_S,
  CHARGE_VOLTAGE_V,
  CHARGE_VOLTAGE_RAMP_V_S,
  MAX_CHARGE_CURRENT_A,
  MAX_CHARGE_VOLTAGE_V,
  TICK_MS,
  RELOC_MS,
  SPEED_M_S,
  ACCEL_M_S2,
  DECEL_M_S2,
  ARRIVAL_EPS,
  CURRENT_POINT_DIST,
  ROTATE_SPEED_RAD_S,
  ROT_ACCEL_RAD_S2,
  ROT_DECEL_RAD_S2,
  ROTATE_EPS_RAD,
  WHEELBASE_M,
  ROBOT_RADIUS_M,
  ROBOT_MODEL_HEAD_M,
  ROBOT_MODEL_TAIL_M,
  ROBOT_MODEL_WIDTH_M,
  PATH_SAMPLE_STEP,
  PATH_MIN_SAMPLES,
  PATH_MAX_SAMPLES,
  LINE_MATCH_MAX_DIST,
  LINE_MATCH_ANGLE_DEG,
  MAX_BODY_LENGTH,
  PUSH_MIN_INTERVAL_MS,
  FORK_SPEED_M_S,
  FORK_ACCEL_M_S2,
  FORK_EPS,
  FORK_TASK_DELAY_MS,
  FORK_MIN_HEIGHT,
  FORK_MAX_HEIGHT,
  OBSTACLE_RADIUS_M,
  OBSTACLE_CLEARANCE_M,
  OBSTACLE_LOOKAHEAD_M,
  OBSTACLE_AVOID_ENABLED,
  BLOCK_REASON_OBSTACLE,
  BLOCK_REASON_MANUAL,
  STATUS_HIDE_CURRENT_STATION,
  STATUS_FORCE_CURRENT_STATION,
  STATUS_HIDE_LAST_STATION,
  STATUS_HIDE_POSE,
  STATUS_LAST_STATION_IS_CURRENT,
  CLIENT_ID_STRATEGY,
  CLIENT_TTL_MS,
  CLIENT_IDLE_MS,
  LOCK_RELEASE_ON_DISCONNECT,
  LOCK_TTL_MS,
  STRICT_UNLOCK,
  REQUIRE_LOCK_FOR_CONTROL,
  REQUIRE_LOCK_FOR_NAV,
  REQUIRE_LOCK_FOR_FORK,
  SOCKET_IDLE_TIMEOUT_MS,
  MAX_CONNECTIONS,
  MAX_CONNECTIONS_PER_CLIENT,
  MAX_CLIENT_SESSIONS,
  PUSH_MAX_INTERVAL_MS,
  PUSH_MAX_QUEUE_BYTES
} = config;

const DEFAULT_ROBOT_MODEL = { head: 0.5, tail: 2, width: 1 };
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
const DEFAULT_LOCK_TYPE = 2;
const FORK_TASK_TYPE = 100;
const EMPTY_GOODS_REGION = Object.freeze({ name: '', point: [] });
const LOADED_GOODS_REGION = Object.freeze({
  name: '',
  point: [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 }
  ]
});
let createOnSpec = null;

function nowMs() {
  return Date.now();
}

function lockTimeSeconds() {
  return Math.floor(Date.now() / 1000);
}

function normalizeRemoteAddress(value) {
  if (!value) return '';
  const text = String(value);
  if (text === '::1') return '127.0.0.1';
  if (text.startsWith('::ffff:')) return text.slice(7);
  return text;
}

function buildCurrentLockPayload(lockInfo) {
  if (!lockInfo || !lockInfo.locked) {
    return { locked: false };
  }
  return {
    desc: lockInfo.desc || '',
    ip: lockInfo.ip || '',
    locked: true,
    nick_name: lockInfo.nick_name || '',
    port: Number.isFinite(lockInfo.port) ? lockInfo.port : 0,
    time_t: Number.isFinite(lockInfo.time_t) ? lockInfo.time_t : 0,
    type: Number.isFinite(lockInfo.type) ? lockInfo.type : DEFAULT_LOCK_TYPE
  };
}

function createOn() {
  return formatOffsetTimestamp(new Date(), createOnSpec);
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return null;
  }
}

function cloneJson(value) {
  if (!value || typeof value !== 'object') {
    return {};
  }
  return JSON.parse(JSON.stringify(value));
}

function cloneGoodsRegion(region) {
  if (!region || typeof region !== 'object') {
    return { name: '', point: [] };
  }
  const points = Array.isArray(region.point)
    ? region.point.map((point) => ({
        x: Number.isFinite(point.x) ? point.x : 0,
        y: Number.isFinite(point.y) ? point.y : 0
      }))
    : [];
  return { name: region.name || '', point: points };
}

function formatTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function parseOffsetSpec(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.toUpperCase() === 'Z') {
    return { minutes: 0, style: 'z' };
  }
  const match = text.match(/^([+-])(\d{2}):?(\d{2})$/);
  if (!match) return null;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number.parseInt(match[2], 10);
  const mins = Number.parseInt(match[3], 10);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
  const total = sign * (hours * 60 + mins);
  return { minutes: total, style: match[0].includes(':') ? 'colon' : 'compact' };
}

function parseOffsetFromTimestamp(value) {
  if (!value) return null;
  const match = String(value).trim().match(/(Z|[+-]\d{2}:?\d{2})$/i);
  if (!match) return null;
  return parseOffsetSpec(match[1]);
}

function resolveCreateOnSpec() {
  const envSpec = parseOffsetSpec(ROBOT_TIMEZONE_OFFSET);
  if (envSpec) {
    return envSpec;
  }
  const samples = [
    statusAllTemplate && statusAllTemplate.create_on,
    robotParamsPayload && robotParamsPayload.create_on,
    fileListAssetsPayload && fileListAssetsPayload.create_on,
    fileListModulesPayload && fileListModulesPayload.create_on,
    mapPropertiesPayload && mapPropertiesPayload.create_on
  ];
  for (const sample of samples) {
    const spec = parseOffsetFromTimestamp(sample);
    if (spec) return spec;
  }
  return null;
}

function formatOffsetTimestamp(date, offsetSpec) {
  if (!offsetSpec) {
    return date.toISOString();
  }
  if (offsetSpec.style === 'z') {
    return date.toISOString();
  }
  const offsetMinutes = Number.isFinite(offsetSpec.minutes) ? offsetSpec.minutes : 0;
  const adjusted = new Date(date.getTime() + offsetMinutes * 60 * 1000);
  const pad = (num, size = 2) => String(num).padStart(size, '0');
  const sign = offsetMinutes < 0 ? '-' : '+';
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;
  const suffix =
    offsetSpec.style === 'colon'
      ? `${sign}${pad(hours)}:${pad(mins)}`
      : `${sign}${pad(hours)}${pad(mins)}`;
  return `${adjusted.getUTCFullYear()}-${pad(adjusted.getUTCMonth() + 1)}-${pad(
    adjusted.getUTCDate()
  )}T${pad(adjusted.getUTCHours())}:${pad(adjusted.getUTCMinutes())}:${pad(
    adjusted.getUTCSeconds()
  )}.${pad(adjusted.getUTCMilliseconds(), 3)}${suffix}`;
}

function computeFileMd5(filePath) {
  if (!filePath) return '';
  try {
    const data = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(data).digest('hex');
  } catch (_err) {
    return '';
  }
}

function resolveMapName(graphData, mapPath) {
  if (graphData && graphData.meta && graphData.meta.mapName) {
    return graphData.meta.mapName;
  }
  if (!mapPath) {
    return '';
  }
  const base = path.basename(mapPath);
  return base.replace(path.extname(base), '');
}

function listMapFiles(mapPath) {
  if (!mapPath) {
    return [];
  }
  let dir = mapPath;
  try {
    if (fs.existsSync(mapPath) && fs.statSync(mapPath).isFile()) {
      dir = path.dirname(mapPath);
    }
  } catch (_err) {
    dir = path.dirname(mapPath);
  }
  let entries = [];
  try {
    entries = fs.readdirSync(dir);
  } catch (_err) {
    entries = [];
  }
  const files = entries
    .filter((name) => name.toLowerCase().endsWith('.smap'))
    .map((name) => {
      const fullPath = path.join(dir, name);
      try {
        const stat = fs.statSync(fullPath);
        return { name, size: stat.size, modified: formatTimestamp(stat.mtime) };
      } catch (_err) {
        return null;
      }
    })
    .filter(Boolean);
  if (files.length === 0 && fs.existsSync(mapPath)) {
    try {
      const stat = fs.statSync(mapPath);
      if (stat.isFile()) {
        files.push({
          name: path.basename(mapPath),
          size: stat.size,
          modified: formatTimestamp(stat.mtime)
        });
      }
    } catch (_err) {
      return files;
    }
  }
  return files;
}

function buildMapInfo(mapPath, graphData) {
  const name = resolveMapName(graphData, mapPath);
  const files = listMapFiles(mapPath);
  const names = files.map((entry) => path.basename(entry.name, path.extname(entry.name)));
  if (name && !names.includes(name)) {
    names.push(name);
  }
  return {
    name,
    md5: computeFileMd5(mapPath),
    files,
    names
  };
}

const graph = loadMapGraphLight(GRAPH_PATH);
const mapInfo = buildMapInfo(GRAPH_PATH, graph);
const statusAllTemplate = readJsonSafe(path.resolve(__dirname, 'data', 'status_all_template.json'));
const mapEntries = mapInfo.name
  ? [{ '3dFeatureTrans': [0, 0, 0], md5: mapInfo.md5 || '', name: mapInfo.name }]
  : [];
const chargeStationIds = new Set(
  (graph.nodes || [])
    .map((node) => {
      if (!node) {
        return null;
      }
      const className = String(node.className || node.type || '').toLowerCase();
      if (className !== 'chargepoint') {
        return null;
      }
      return node.id;
    })
    .filter(Boolean)
);
const fileRoots = Array.from(
  new Set([...ROBOT_FILE_ROOTS, path.dirname(GRAPH_PATH)].filter(Boolean))
);

function resolveRequestedFile(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const filePath =
    payload.file_path || payload.filePath || payload.path || payload.file || payload.fileName;
  if (!filePath) return null;
  const normalized = String(filePath).trim();
  if (!normalized) return null;
  if (path.isAbsolute(normalized)) {
    try {
      return fs.statSync(normalized).isFile() ? normalized : null;
    } catch (_err) {
      return null;
    }
  }
  for (const root of fileRoots) {
    const resolvedRoot = path.resolve(root);
    const candidate = path.resolve(resolvedRoot, normalized);
    if (!candidate.startsWith(`${resolvedRoot}${path.sep}`)) {
      continue;
    }
    try {
      if (fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch (_err) {
      continue;
    }
  }
  return null;
}

function buildFileResponse(payload) {
  const resolved = resolveRequestedFile(payload);
  if (!resolved) return null;
  try {
    return fs.readFileSync(resolved);
  } catch (_err) {
    return null;
  }
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
  simObstacles.length = 0;
}

function listSimObstacles() {
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
    robot.blockDi = 0;
    robot.blockUltrasonicId = 0;
    robot.blockPos = { x: 0, y: 0 };
    if (robot.currentTask && !robot.paused) {
      robot.taskStatus = 2;
    }
    return;
  }
  robot.blockReason = Number.isFinite(options.reason) ? options.reason : BLOCK_REASON_MANUAL;
  robot.blockId = Number.isFinite(options.id) ? options.id : robot.blockId || 0;
  robot.blockDi = Number.isFinite(options.di) ? options.di : robot.blockId || 0;
  robot.blockUltrasonicId = Number.isFinite(options.ultrasonicId)
    ? options.ultrasonicId
    : robot.blockId || 0;
  if (Number.isFinite(options.x) && Number.isFinite(options.y)) {
    robot.blockPos = { x: options.x, y: options.y };
  }
  if (robot.currentTask) {
    robot.taskStatus = 3;
  }
}

const motorNames = ROBOT_MOTOR_NAMES;
const robotParamsPayload = readJsonSafe(ROBOT_PARAMS_PATH);
const deviceTypesPayloadFull = readJsonSafe(ROBOT_DEVICE_TYPES_PATH);
const deviceTypesPayloadExt = readJsonSafe(ROBOT_DEVICE_TYPES_EXT_PATH);
const deviceTypesPayloadModule = readJsonSafe(ROBOT_DEVICE_TYPES_MODULE_PATH);
const fileListAssetsPayload = readJsonSafe(ROBOT_FILE_LIST_PATH);
const fileListModulesPayload = readJsonSafe(ROBOT_FILE_LIST_MODULES_PATH);
const mapPropertiesPayload = readJsonSafe(ROBOT_MAP_PROPERTIES_PATH);
const configMapDataPayload = readJsonSafe(ROBOT_CONFIG_MAP_PATH);
createOnSpec = resolveCreateOnSpec();
const ROBOT_FEATURES = [
  { active: true, expiry_date: 'never-expire', name: 'rbk_diff' },
  { active: true, expiry_date: 'never-expire', name: 'pro_loc_func' },
  { active: true, expiry_date: 'never-expire', name: 'pro_rec_func' },
  { active: true, expiry_date: 'never-expire', name: 'pro_mod_func' }
];
const ROBOT_VERSION_LIST = {
  Calib: '1.0.0-git:master-0c44d2c-desc:Aug  9 2025 16:51:07',
  CalibrationTask: '1.0.0-git:3.4.6-50b8f2e-desc:Aug  9 2025 16:45:13',
  ChargerAdapter: '1.0.0-git:3.4.6-037edd3-desc:Aug  9 2025 16:45:29',
  DSPChassis: '1.0.0-git:3.4.6-ac1ab1de-desc:Aug  9 2025 16:46:51',
  GNSSModulesDriver: '0.1.0-git:3.4.6-e414da8-desc:Aug  9 2025 16:46:25',
  LocalReMap: '1.0.0-git:3.4.6-186ea26-desc:Aug  9 2025 16:46:26',
  MCLoc: '1.0.0-git:3.4.6-b9f47c4-desc:Aug  9 2025 16:51:18',
  MagneticSensor: '1.0.0-git:3.4.6-5a5b84b-desc:Aug  9 2025 16:47:24',
  MailSender: '1.0.0-git:3.4.6-872032c-desc:Aug  9 2025 16:48:08',
  MoveFactory: '4.5.26-git:3.4.6-0efe0f47-desc:Aug  9 2025 16:51:53',
  MultiDcamera: '1.0.0-git:3.4.6-04e0980f-desc:Aug  9 2025 16:51:35',
  MultiLaser: '1.0.0-git:3.4.6-80b237d-desc:Aug  9 2025 16:48:53',
  NetProtocol: '1.0.0-git:3.4-ab30d9b-desc:Aug  9 2025 16:49:37',
  OdoCalculator: '1.0.0-git:3.4.6-0381e4b-desc:Aug  9 2025 16:48:19',
  OnlineMapLogger: '1.0.0-git:3.4.6-4907bc2-desc:Aug  9 2025 16:48:17',
  OpticalMotionCapture: '1.0.0-git:3.4.6-1de3e5b-desc:Aug  9 2025 16:48:19',
  RFIDSensor: '1.0.0-git:3.4.6-7f58730-desc:Aug  9 2025 16:48:39',
  RecoFactory: '1.0.0-git:3.4.6-e4a9366-desc:Aug  9 2025 16:50:05',
  Scanner: '1.0.0-git:3.4.6-1049267-desc:Aug  9 2025 16:48:39',
  SeerRoller: '1.0.0-git:3.4.6-82ae46a-desc:Aug  9 2025 16:48:47',
  SensorFuser: '1.0.0-git:3.4.6-efbbc2b-desc:Aug  9 2025 16:51:41',
  SlaMapping: '1.0.0-git:3.4.6-2c4e23b-desc:Aug  9 2025 16:49:11',
  SoundPlayer: '1.0.0-git:3.4.6-d28c9f7-desc:Aug  9 2025 16:49:37',
  SystemVersion: '0.0.7_20241023172600',
  TaskManager: '1.0.0-git:3.4.6-cd41ea0-desc:Aug  9 2025 16:49:46',
  'arm-patch': '0.9.32'
};
const ROBOT_NETWORK_CONTROLLERS = [
  {
    description: 'Ethernet controller',
    driver: 'unknown',
    driverversion: 'unknown',
    logicalname: 'unknown',
    product: 'Marvell Technology Group Ltd.',
    serial: 'unknown',
    vendor: 'Marvell Technology Group Ltd.'
  },
  {
    description: 'Ethernet interface',
    driver: 'fec',
    driverversion: '5.15.148-seer+',
    logicalname: 'eth0',
    product: 'unknown',
    serial: '00:14:2d:e7:26:32',
    vendor: 'unknown'
  },
  {
    description: 'Ethernet interface',
    driver: 'fec',
    driverversion: '5.15.148-seer+',
    logicalname: 'eth1',
    product: 'unknown',
    serial: '00:14:2d:e7:26:32',
    vendor: 'unknown'
  }
];
const ROBOT_HARDWARE = { cpus: [] };

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
const incomingAdjacency = new Map();
for (const [fromId, neighbors] of adjacency.entries()) {
  for (const neighbor of neighbors) {
    if (!incomingAdjacency.has(neighbor.to)) {
      incomingAdjacency.set(neighbor.to, []);
    }
    incomingAdjacency.get(neighbor.to).push({ from: fromId, cost: neighbor.cost });
  }
}

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

function resolveStartPoseOverride() {
  if (Number.isFinite(START_POSE_X) && Number.isFinite(START_POSE_Y)) {
    return {
      x: START_POSE_X,
      y: START_POSE_Y,
      angle: Number.isFinite(START_POSE_ANGLE) ? START_POSE_ANGLE : 0
    };
  }
  return null;
}

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

function resolveStartNode(preferredId, entry, poseOverride, poseHint) {
  const fromConfig =
    entry &&
    (entry.start_station ||
      entry.start_point ||
      entry.start_node ||
      entry.start_action_point ||
      entry.start_location);
  if (preferredId && nodesById.has(preferredId)) {
    return preferredId;
  }
  if (poseOverride) {
    const nearest = findNearestNode(poseOverride.x, poseOverride.y);
    if (nearest) {
      return nearest.id;
    }
  }
  if (fromConfig && nodesById.has(fromConfig)) {
    return fromConfig;
  }
  if (poseHint) {
    const nearest = findNearestNode(poseHint.x, poseHint.y);
    if (nearest) {
      return nearest.id;
    }
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

function distancePointToPolylinePoints(x, y, points) {
  if (!points || points.length < 2) {
    return Number.POSITIVE_INFINITY;
  }
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const dist = distancePointToSegmentCoords(x, y, a.x, a.y, b.x, b.y);
    if (dist < best) {
      best = dist;
    }
  }
  return best;
}

function distanceToTaskPath(task, x, y) {
  if (!task || !Array.isArray(task.segments) || task.segments.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  let best = Number.POSITIVE_INFINITY;
  for (const segment of task.segments) {
    if (!segment || !segment.polyline || !Array.isArray(segment.polyline.points)) {
      continue;
    }
    const dist = distancePointToPolylinePoints(x, y, segment.polyline.points);
    if (dist < best) {
      best = dist;
    }
  }
  return best;
}

function getRouteNodeIds(task) {
  if (!task || !Array.isArray(task.pathNodes) || task.pathNodes.length === 0) {
    return null;
  }
  return new Set(task.pathNodes);
}

function getReportedCurrentStation() {
  if (STATUS_FORCE_CURRENT_STATION) {
    return STATUS_FORCE_CURRENT_STATION;
  }
  if (STATUS_HIDE_CURRENT_STATION) {
    robot.reportedStationId = '';
    return '';
  }
  const manualMode = robot.manual.active;
  if (manualMode && !isStopped()) {
    robot.reportedStationId = '';
    return '';
  }

  const enterDist = CURRENT_POINT_DIST;
  const exitDist = Math.max(CURRENT_POINT_DIST * 1.5, enterDist);
  const offRouteDist = Math.max(CURRENT_POINT_DIST * 3, ROBOT_RADIUS_M);

  const task = robot.currentTask;
  const routeNodeIds = !manualMode ? getRouteNodeIds(task) : null;
  const hasRoute = routeNodeIds && routeNodeIds.size > 0;
  const hasSegments = Boolean(task && Array.isArray(task.segments) && task.segments.length > 0);
  const offRoute = hasRoute && hasSegments
    ? distanceToTaskPath(task, robot.pose.x, robot.pose.y) > offRouteDist
    : false;
  const candidateSet = hasRoute && !offRoute ? routeNodeIds : null;

  const candidate = findNearestNodeFromIds(robot.pose.x, robot.pose.y, candidateSet);
  const candidateId = candidate.node ? candidate.node.id : '';
  const candidateDist = candidate.dist;

  let reported = '';
  const lastId = robot.reportedStationId;
  if (lastId) {
    const lastNode = nodesById.get(lastId);
    const lastAllowed = !candidateSet || candidateSet.has(lastId);
    if (lastNode && lastAllowed) {
      const distToLast = Math.hypot(lastNode.pos.x - robot.pose.x, lastNode.pos.y - robot.pose.y);
      if (distToLast <= exitDist) {
        reported = lastId;
      }
    }
  }
  if (!reported && candidateId && candidateDist <= enterDist) {
    reported = candidateId;
  }

  robot.reportedStationId = reported || '';
  return reported;
}

function getReportedLastStation(currentStation) {
  if (STATUS_HIDE_LAST_STATION) {
    return '';
  }
  if (STATUS_LAST_STATION_IS_CURRENT && currentStation) {
    return currentStation;
  }
  return robot.lastStation || '';
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
    const incoming = incomingAdjacency.get(current) || [];
    for (const edge of incoming) {
      if (visited.has(edge.from)) {
        continue;
      }
      const nextDist = bestDist + edge.cost;
      if (nextDist < distances.get(edge.from)) {
        distances.set(edge.from, nextDist);
      }
    }
  }
  return distances;
}

function buildApproachCurvePoints(entryPose, entryHeading) {
  const start = { x: robot.pose.x, y: robot.pose.y };
  const end = { x: entryPose.x, y: entryPose.y };
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  if (!Number.isFinite(distance)) {
    return null;
  }
  if (distance <= 1e-4) {
    return [start, end];
  }
  const controlScale = Number.isFinite(APPROACH_CONTROL_SCALE) ? APPROACH_CONTROL_SCALE : 0.5;
  const baseMin = Math.max(0.2, Math.max(0, APPROACH_MERGE_DIST) * 0.5);
  const baseMax = Math.max(baseMin, Math.max(0, APPROACH_MERGE_DIST) * 2.5);
  const controlDist = clamp(distance * controlScale, baseMin, baseMax);
  const startDir = { x: Math.cos(robot.pose.angle), y: Math.sin(robot.pose.angle) };
  const endDir = { x: Math.cos(entryHeading), y: Math.sin(entryHeading) };
  const p1 = { x: start.x + startDir.x * controlDist, y: start.y + startDir.y * controlDist };
  const p2 = { x: end.x - endDir.x * controlDist, y: end.y - endDir.y * controlDist };
  const step = Math.max(0.05, Number.isFinite(APPROACH_SAMPLE_STEP) ? APPROACH_SAMPLE_STEP : 0.2);
  const samples = clamp(Math.ceil(distance / step), 8, 40);
  return sampleBezierPoints(start, p1, p2, end, samples);
}

function scoreApproach(entryPose, entryDist, remaining, distToTarget, headingToEntry) {
  const approachAngle = Math.abs(normalizeAngle(headingToEntry - robot.pose.angle));
  const edgeAngle = Math.abs(normalizeAngle(entryPose.heading - robot.pose.angle));
  let penalty = approachAngle * (Number.isFinite(APPROACH_TURN_PENALTY) ? APPROACH_TURN_PENALTY : 0);
  penalty += edgeAngle * (Number.isFinite(APPROACH_TURN_PENALTY) ? APPROACH_TURN_PENALTY * 0.35 : 0);
  if (approachAngle > Math.PI / 2) {
    penalty += Number.isFinite(APPROACH_REVERSE_PENALTY) ? APPROACH_REVERSE_PENALTY : 0;
  }
  return entryDist + remaining + distToTarget + penalty;
}

function findBestApproach(targetId) {
  const distToTarget = computeDistancesToTarget(targetId);
  const mergeDist = Math.max(0, Number.isFinite(APPROACH_MERGE_DIST) ? APPROACH_MERGE_DIST : 0);
  let best = null;

  for (const edge of edgesByKey.values()) {
    const distFromEnd = distToTarget.get(edge.endId);
    if (!Number.isFinite(distFromEnd)) {
      continue;
    }
    const snap = findPolylineProgress(edge.polyline, robot.pose.x, robot.pose.y);
    const entryProgress = clamp(snap.progress + mergeDist, 0, edge.polyline.totalLength);
    const entryPose = polylineAtDistance(edge.polyline, entryProgress);
    const entryDist = Math.hypot(entryPose.x - robot.pose.x, entryPose.y - robot.pose.y);
    const remaining = edge.polyline.totalLength - entryProgress;
    const headingToEntry = Math.atan2(entryPose.y - robot.pose.y, entryPose.x - robot.pose.x);
    const cost = scoreApproach(entryPose, entryDist, remaining, distFromEnd, headingToEntry);
    if (!best || cost < best.cost) {
      best = {
        cost,
        entryPose,
        entryHeading: entryPose.heading,
        entryProgress,
        entryDist,
        edgeStartId: edge.startId,
        edgeEndId: edge.endId
      };
    }
  }

  if (best) {
    return best;
  }

  for (const [nodeId, distFromNode] of distToTarget.entries()) {
    if (!Number.isFinite(distFromNode)) {
      continue;
    }
    const node = nodesById.get(nodeId);
    if (!node || !node.pos) {
      continue;
    }
    const entryPose = { x: node.pos.x, y: node.pos.y, heading: 0 };
    const entryDist = Math.hypot(entryPose.x - robot.pose.x, entryPose.y - robot.pose.y);
    const headingToEntry = Math.atan2(entryPose.y - robot.pose.y, entryPose.x - robot.pose.x);
    entryPose.heading = headingToEntry;
    const cost = scoreApproach(entryPose, entryDist, 0, distFromNode, headingToEntry);
    if (!best || cost < best.cost) {
      best = {
        cost,
        entryPose,
        entryHeading: entryPose.heading,
        entryProgress: 0,
        entryDist,
        edgeStartId: nodeId,
        edgeEndId: nodeId
      };
    }
  }

  return best;
}

function startScriptPath(points, targetAngle, maxSpeed) {
  if (!Array.isArray(points) || points.length < 2) {
    return false;
  }
  const polyline = buildPolyline(points);
  let sp = robot.scriptPath;
  if (!sp) {
    sp = createScriptPathState();
    robot.scriptPath = sp;
  }
  sp.plan = { polyline, targetAngle };
  sp.active = true;
  sp.done = false;
  sp.progress = 0;
  sp.mode = 'move';
  sp.reachDist = ARRIVAL_EPS;
  sp.reachAngle = ROTATE_EPS_RAD;
  sp.maxSpeed = Number.isFinite(maxSpeed) ? maxSpeed : SPEED_M_S;
  sp.maxRot = ROTATE_SPEED_RAD_S;
  sp.backMode = false;
  sp.useOdo = false;
  sp.holdDir = 999;
  sp.targetAngle = Number.isFinite(targetAngle) ? targetAngle : null;
  sp.startHeading = Number.isFinite(targetAngle) ? targetAngle : robot.pose.angle;
  return true;
}

function startApproachToTarget(targetId, taskType, targetPoint) {
  const approach = findBestApproach(targetId);
  if (!approach) {
    return { ok: false, error: 'path_not_found' };
  }
  const pathNodes = findPath(approach.edgeStartId, targetId);
  if (!pathNodes) {
    return { ok: false, error: 'path_not_found' };
  }
  const task = createTaskWithPath(pathNodes, targetId, taskType, targetPoint);
  if (task && Array.isArray(task.segments) && task.segments.length > 0) {
    const segment = task.segments[0];
    if (
      segment &&
      segment.startId === approach.edgeStartId &&
      segment.endId === approach.edgeEndId &&
      Number.isFinite(approach.entryProgress)
    ) {
      task.segmentProgress = clamp(approach.entryProgress, 0, segment.totalLength);
      task.segmentMode = 'move';
    }
  }
  const curvePoints = buildApproachCurvePoints(approach.entryPose, approach.entryHeading);
  if (!curvePoints || curvePoints.length < 2) {
    return { ok: false, error: 'path_not_found' };
  }
  startScriptPath(curvePoints, approach.entryHeading, SPEED_M_S * 0.8);
  return { ok: true, task };
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

function findPolylineProgress(polyline, x, y) {
  if (!polyline || !Array.isArray(polyline.points) || polyline.points.length < 2) {
    return { progress: 0, dist: Number.POSITIVE_INFINITY };
  }
  const points = polyline.points;
  const lengths = polyline.lengths || [];
  let bestDist = Number.POSITIVE_INFINITY;
  let bestProgress = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const abLenSq = abx * abx + aby * aby;
    const t = abLenSq > 0 ? clamp(((x - a.x) * abx + (y - a.y) * aby) / abLenSq, 0, 1) : 0;
    const cx = a.x + abx * t;
    const cy = a.y + aby * t;
    const dist = Math.hypot(x - cx, y - cy);
    if (dist < bestDist) {
      const base = lengths[i] || 0;
      const segLen =
        lengths[i + 1] !== undefined ? lengths[i + 1] - base : Math.hypot(abx, aby);
      bestDist = dist;
      bestProgress = base + segLen * t;
    }
  }
  return { progress: bestProgress, dist: bestDist };
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
  const forkHeight = Number.isFinite(START_FORK_HEIGHT) ? clampForkHeight(START_FORK_HEIGHT) : 0;
  return {
    id: ROBOT_ID,
    model: ROBOT_MODEL,
    version: ROBOT_VERSION,
    modelVersion: ROBOT_MODEL_VERSION,
    mapVersion: ROBOT_MAP_VERSION,
    modbusVersion: ROBOT_MODBUS_VERSION,
    netProtocolVersion: ROBOT_NET_PROTOCOL_VERSION,
    safeModelMd5: ROBOT_SAFE_MODEL_MD5,
    calibrated: ROBOT_CALIBRATED,
    versionList: ROBOT_VERSION_LIST,
    networkControllers: ROBOT_NETWORK_CONTROLLERS,
    hardware: ROBOT_HARDWARE,
    mac: ROBOT_MAC,
    wlanMac: ROBOT_WLAN_MAC,
    currentIp: ROBOT_IP || '127.0.0.1',
    currentMap: mapInfo.name || '',
    currentMapMd5: mapInfo.md5 || '',
    currentMapEntries: mapEntries,
    online: true,
    dispatchable: true,
    controlled: true,
    blocked: false,
    blockReason: 0,
    blockPos: { x: 0, y: 0 },
    blockId: 0,
    blockDi: 0,
    blockUltrasonicId: 0,
    slowDown: false,
    slowReason: 0,
    slowPos: { x: 0, y: 0 },
    slowId: 0,
    slowDi: 0,
    slowUltrasonicId: 0,
    emergency: false,
    driverEmc: false,
    electric: false,
    softEmc: false,
    softEmcPaused: false,
    brake: false,
    confidence: 0.93,
    battery: 82,
    batteryTemp: 15,
    controllerTemp: 45.2,
    controllerHumi: 16.5,
    controllerVoltage: 23.8,
    voltage: IDLE_VOLTAGE_V,
    current: IDLE_CURRENT_A,
    requestVoltage: 0,
    requestCurrent: 0,
    batteryCycle: 0,
    charging: false,
    chargeTargetId: null,
    chargeEngageAt: null,
    chargeActiveAt: null,
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
    manualBlock: true,
    fork: {
      height: forkHeight,
      targetHeight: forkHeight,
      speed: 0,
      heightInPlace: true,
      autoFlag: true,
      forwardVal: forkHeight,
      forwardInPlace: false,
      pressureActual: 0
    },
    forkTaskActive: false,
    forkTaskMode: null,
    forkTaskReport: false,
    forkPending: null,
    forkHoldTask: false,
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
    goodsRegion: cloneGoodsRegion(EMPTY_GOODS_REGION),
    sound: { name: '', loop: false, count: 0, playing: false },
    gData: {},
    modbus: { '0x': {}, '1x': {}, '3x': {}, '4x': {} },
    disabledSensors: { depth: [], laser: [] },
    laserWidths: {},
    lockInfo: {
      locked: false,
      nick_name: '',
      ip: '',
      port: 0,
      time_t: 0,
      type: DEFAULT_LOCK_TYPE,
      desc: ''
    },
    lockRequest: null,
    currentStation: startNodeId,
    reportedStationId: startNodeId,
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

const startPoseOverride = resolveStartPoseOverride();
const startPoseFromConfig = resolveStartPose(robotConfigEntry);
const startPose = startPoseOverride || startPoseFromConfig;
const startNodeId = resolveStartNode(
  START_NODE_ID,
  robotConfigEntry,
  startPoseOverride,
  startPoseFromConfig
);
const robot = createRobot(startNodeId, startPose);
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

let controlArbiter = null;
const clientRegistry = new ClientRegistry({
  strategy: CLIENT_ID_STRATEGY,
  ttlMs: CLIENT_TTL_MS,
  idleMs: CLIENT_IDLE_MS,
  onSessionEmpty: (session) => {
    if (!LOCK_RELEASE_ON_DISCONNECT || !controlArbiter) {
      return;
    }
    if (controlArbiter.getOwner() === session.id) {
      clearManualControl();
      controlArbiter.release(session.id, 'disconnect');
    }
  }
});

const controlPolicy = createControlPolicy({
  requireControl: REQUIRE_LOCK_FOR_CONTROL,
  requireNav: REQUIRE_LOCK_FOR_NAV,
  requireFork: REQUIRE_LOCK_FOR_FORK
});

function clearManualControl() {
  robot.manual.active = false;
  robot.manual.vx = 0;
  robot.manual.vy = 0;
  robot.manual.w = 0;
  robot.manual.steer = 0;
  robot.manual.realSteer = 0;
  resetVelocity();
}

controlArbiter = new ControlArbiter({
  robot,
  defaultLockType: DEFAULT_LOCK_TYPE,
  strictUnlock: STRICT_UNLOCK,
  lockTtlMs: LOCK_TTL_MS,
  onPreempt: () => {
    clearManualControl();
  }
});

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

function isChargeStationId(id) {
  return Boolean(id && chargeStationIds.has(id));
}

function setChargeTarget(targetId) {
  const nextId = isChargeStationId(targetId) ? targetId : null;
  if (robot.chargeTargetId === nextId) {
    return;
  }
  robot.chargeTargetId = nextId;
  robot.chargeEngageAt = null;
  robot.chargeActiveAt = null;
  if (!nextId) {
    robot.charging = false;
  }
}

function updateCharging(now, dt) {
  if (!Number.isFinite(dt) || dt <= 0) {
    return;
  }
  const chargeTargetId = robot.chargeTargetId;
  const atChargePoint =
    chargeTargetId &&
    robot.currentStation === chargeTargetId &&
    isChargeStationId(chargeTargetId) &&
    isStopped();

  if (atChargePoint) {
    if (!robot.chargeEngageAt) {
      robot.chargeEngageAt = now + Math.max(0, AUTO_CHARGE_DELAY_MS);
    }
    if (now >= robot.chargeEngageAt) {
      if (!robot.charging) {
        robot.charging = true;
        robot.chargeActiveAt = now;
        if (Number.isFinite(CHARGE_START_CURRENT_A)) {
          robot.current = CHARGE_START_CURRENT_A;
        }
      }
    }
  } else {
    robot.chargeEngageAt = null;
    robot.chargeActiveAt = null;
    if (robot.charging) {
      robot.charging = false;
    }
  }

  const holdMs = Math.max(0, CHARGE_START_HOLD_MS || 0);
  const holdActive =
    robot.charging &&
    Number.isFinite(robot.chargeActiveAt) &&
    holdMs > 0 &&
    now - robot.chargeActiveAt < holdMs;
  const useStartCurrent = holdActive && Number.isFinite(CHARGE_START_CURRENT_A);
  const targetCurrent = robot.charging
    ? useStartCurrent
      ? CHARGE_START_CURRENT_A
      : CHARGE_CURRENT_A
    : IDLE_CURRENT_A;
  const targetVoltage = robot.charging ? (holdActive ? IDLE_VOLTAGE_V : CHARGE_VOLTAGE_V) : IDLE_VOLTAGE_V;
  if (Number.isFinite(targetCurrent)) {
    robot.current = approachValue(robot.current, targetCurrent, CHARGE_CURRENT_RAMP_A_S, CHARGE_CURRENT_RAMP_A_S, dt);
  }
  if (Number.isFinite(targetVoltage)) {
    robot.voltage = approachValue(robot.voltage, targetVoltage, CHARGE_VOLTAGE_RAMP_V_S, CHARGE_VOLTAGE_RAMP_V_S, dt);
  }
}

function finalizeForkTask() {
  if (!robot.forkTaskMode) {
    return;
  }
  if (robot.forkTaskMode === 'load') {
    robot.goodsRegion = cloneGoodsRegion(LOADED_GOODS_REGION);
    if (robot.goods) {
      robot.goods.hasGoods = true;
    }
  } else if (robot.forkTaskMode === 'unload') {
    robot.goodsRegion = cloneGoodsRegion(EMPTY_GOODS_REGION);
    if (robot.goods) {
      robot.goods.hasGoods = false;
      robot.goods.shape = null;
    }
  }
  robot.forkTaskMode = null;
}

function completeHeldTask() {
  if (!robot.forkHoldTask) {
    return;
  }
  robot.forkHoldTask = false;
  const task = robot.currentTask;
  if (!task) {
    return;
  }
  task.completedAt = nowMs();
  task.waitingFork = false;
  robot.taskStatus = 4;
  robot.lastTask = task;
  robot.currentTask = null;
  resetVelocity();
}

function syncForkTaskStatus() {
  if (!robot.forkTaskActive) {
    return;
  }
  const inPlace = robot.fork.heightInPlace;
  if (inPlace) {
    robot.forkTaskActive = false;
    finalizeForkTask();
    if (robot.forkHoldTask) {
      completeHeldTask();
    }
  }
  if (!robot.forkTaskReport) {
    if (inPlace) {
      robot.forkTaskReport = false;
    }
    return;
  }
  if (!robot.currentTask) {
    robot.taskType = FORK_TASK_TYPE;
    robot.taskStatus = inPlace ? 4 : 2;
  }
  if (inPlace) {
    robot.forkTaskReport = false;
  }
}

function shouldReportForkTask() {
  return !robot.currentTask && !(robot.scriptPath && robot.scriptPath.active);
}

function startForkTask(target, operation, reportStatus, requestedHeight) {
  maybeReportForkHeightNotice(requestedHeight);
  robot.fork.targetHeight = target;
  robot.fork.heightInPlace = Math.abs(robot.fork.height - target) <= FORK_EPS;
  robot.fork.autoFlag = true;
  robot.fork.forwardVal = target;
  robot.fork.forwardInPlace = false;
  robot.forkTaskMode = operation === 'height' ? null : operation;
  robot.forkTaskActive = !robot.fork.heightInPlace;
  robot.forkTaskReport = reportStatus;
  if (reportStatus && !robot.currentTask) {
    robot.taskType = FORK_TASK_TYPE;
    robot.taskStatus = robot.fork.heightInPlace ? 4 : 2;
  }
  if (robot.fork.heightInPlace) {
    finalizeForkTask();
    robot.forkTaskActive = false;
    robot.forkTaskReport = false;
  }
}

function queueForkTask(targetId, target, operation, requestedHeight) {
  robot.forkPending = {
    targetId,
    targetHeight: target,
    requestedHeight: Number.isFinite(requestedHeight) ? requestedHeight : target,
    mode: operation,
    queuedAt: nowMs(),
    startAt: null,
    attached: false
  };
}

function beginAttachedForkForTask(task) {
  if (!task || !robot.forkPending || robot.forkTaskActive) {
    return false;
  }
  if (robot.forkPending.targetId && task.targetId && robot.forkPending.targetId !== task.targetId) {
    return false;
  }
  task.waitingFork = true;
  robot.forkHoldTask = true;
  robot.taskStatus = 2;
  resetVelocity();
  robot.forkPending.attached = true;
  if (!Number.isFinite(robot.forkPending.startAt)) {
    robot.forkPending.startAt = nowMs() + FORK_TASK_DELAY_MS;
  }
  return true;
}

function maybeStartPendingFork(now) {
  if (!robot.forkPending || robot.forkTaskActive) {
    return false;
  }
  if (Number.isFinite(robot.forkPending.startAt) && now < robot.forkPending.startAt) {
    return false;
  }
  if (robot.forkPending.targetId && robot.forkPending.targetId !== robot.currentStation) {
    return false;
  }
  startForkTask(
    robot.forkPending.targetHeight,
    robot.forkPending.mode,
    false,
    robot.forkPending.requestedHeight
  );
  robot.forkPending = null;
  if (robot.forkHoldTask && !robot.forkTaskActive) {
    completeHeldTask();
  }
  return true;
}

function tickFork(dt) {
  if (!robot.fork) {
    return;
  }
  if (robot.softEmc) {
    robot.fork.speed = 0;
    return;
  }
  const target = clampForkHeight(robot.fork.targetHeight);
  const diff = target - robot.fork.height;
  if (Math.abs(diff) <= FORK_EPS) {
    robot.fork.height = target;
    robot.fork.speed = 0;
    robot.fork.heightInPlace = true;
    syncForkTaskStatus();
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
  syncForkTaskStatus();
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
  const currentStation = getReportedCurrentStation();
  return {
    x: robot.pose.x,
    y: robot.pose.y,
    angle: robot.pose.angle,
    confidence: robot.confidence,
    current_station: currentStation,
    last_station: getReportedLastStation(currentStation),
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
  task.visitedNodes = [];
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
    visitedNodes: [],
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
  setChargeTarget(targetId);
  if (segments.length > 0) {
    const snap = findPolylineProgress(segments[0].polyline, robot.pose.x, robot.pose.y);
    if (snap.dist <= CURRENT_POINT_DIST * 2) {
      task.segmentProgress = Math.min(snap.progress, segments[0].totalLength);
    }
  }

  if (pathNodes.length <= 1 || segments.length === 0) {
    task.completedAt = nowMs();
    robot.taskStatus = 4;
    robot.lastTask = task;
    robot.currentTask = null;
  }
  return task;
}

function startMoveToNode(targetId, taskType, targetPointOverride) {
  const targetNode = nodesById.get(targetId);
  const targetPoint =
    targetPointOverride || (targetNode ? { x: targetNode.pos.x, y: targetNode.pos.y, angle: 0 } : null);
  const pathNodes = findPath(robot.currentStation, targetId);
  if (!pathNodes) {
    const fallback = startApproachToTarget(targetId, taskType, targetPoint);
    if (fallback.ok) {
      return fallback;
    }
    return { ok: false, error: 'path_not_found' };
  }
  const task = createTaskWithPath(pathNodes, targetId, taskType, targetPoint);
  return { ok: true, task };
}

function startMoveToPoint(x, y, angle) {
  const node = findNearestNode(x, y);
  if (!node) {
    return { ok: false, error: 'target_not_found' };
  }
  const targetPoint = { x, y, angle: angle || 0 };
  return startMoveToNode(node.id, 1, targetPoint);
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
  setChargeTarget(targetId);
  if (Array.isArray(targets) && targets.length) {
    if (!Array.isArray(task.multiTargets)) {
      task.multiTargets = [];
    }
    task.multiTargets.push(...targets);
  }
  return { ok: true, task };
}

function startMultiStationTask(payload) {
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
  tickFork(dt);
  updateCharging(now, dt);

  if (tickScriptPath(now, dt)) {
    return;
  }

  if (robot.relocStatus === 2 && robot.relocCompleteAt && now >= robot.relocCompleteAt) {
    robot.relocStatus = 1;
    robot.relocCompleteAt = null;
  }

  if (robot.paused || robot.softEmc) {
    resetVelocity();
    return;
  }
  if (robot.blocked && robot.blockReason === BLOCK_REASON_MANUAL) {
    resetVelocity();
    return;
  }

  const task = robot.currentTask;
  if (task) {
    if (task.waitingFork) {
      maybeStartPendingFork(now);
      resetVelocity();
      robot.taskStatus = 2;
      return;
    }
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
        if (beginAttachedForkForTask(task)) {
          return;
        }
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
    const cosHeading = Math.cos(robot.pose.angle);
    const sinHeading = Math.sin(robot.pose.angle);
    const worldVx = robot.manual.vx * cosHeading - robot.manual.vy * sinHeading;
    const worldVy = robot.manual.vx * sinHeading + robot.manual.vy * cosHeading;
    robot.pose = {
      x: robot.pose.x + worldVx * dt,
      y: robot.pose.y + worldVy * dt,
      angle: normalizeAngle(robot.pose.angle + robot.manual.w * dt)
    };
    updateVelocity(robot.manual.vx, robot.manual.vy, robot.manual.w, robot.manual.steer, 0);
    const distanceMoved = Math.hypot(worldVx, worldVy) * dt;
    applyOdo(distanceMoved);
    const nearest = findNearestNode(robot.pose.x, robot.pose.y);
    if (nearest && Math.hypot(nearest.pos.x - robot.pose.x, nearest.pos.y - robot.pose.y) <= ARRIVAL_EPS) {
      robot.lastStation = robot.currentStation;
      robot.currentStation = nearest.id;
    }
    if (!robot.forkTaskActive && robot.taskType !== FORK_TASK_TYPE) {
      if (robot.taskStatus === 2 || robot.taskStatus === 3) {
        robot.taskStatus = 4;
      }
    }
    return;
  }

  if (maybeStartPendingFork(now)) {
    return;
  }

  resetVelocity();
  if (!robot.forkTaskActive && robot.taskType !== FORK_TASK_TYPE) {
    if (robot.taskStatus === 2 || robot.taskStatus === 3) {
      robot.taskStatus = 4;
    }
  }
}

function buildBaseResponse(extra) {
  return {
    ret_code: 0,
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

function buildCurrentLockResponse() {
  return buildBaseResponse(buildCurrentLockPayload(robot.lockInfo));
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
  setChargeTarget(null);
  robot.relocStatus = 2;
  robot.relocCompleteAt = nowMs() + RELOC_MS;

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

function normalizeForkHeight(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const candidates = [payload.end_height, payload.height, payload.fork_height, payload.value];
  for (const raw of candidates) {
    if (Number.isFinite(raw)) {
      return raw;
    }
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function maybeReportForkHeightNotice(requestedHeight) {
  if (!Number.isFinite(requestedHeight) || requestedHeight >= FORK_MIN_HEIGHT) {
    return;
  }
  const timestamp = lockTimeSeconds();
  const desc = JSON.stringify([
    'fork target too low. min_fork_height = {1} send_height = {2}',
    FORK_MIN_HEIGHT,
    requestedHeight
  ]);
  let notice = robot.alarms.notices.find((entry) => entry && entry.code === 57016);
  if (!notice) {
    notice = {
      code: 57016,
      desc: '',
      describe: '',
      method: '',
      reason: '',
      times: 0,
      timestamp
    };
    robot.alarms.notices.push(notice);
  }
  notice.times = (notice.times || 0) + 1;
  notice.timestamp = timestamp;
  notice[57016] = timestamp;
  notice.dateTime = createOn();
  notice.desc = desc;
}

function getForkOperation(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const operation = payload.operation ? String(payload.operation).trim().toLowerCase() : '';
  if (operation === 'forkheight') return 'height';
  if (operation === 'forkload') return 'load';
  if (operation === 'forkunload') return 'unload';
  return null;
}

function handleForkOperation(payload, operation) {
  const height = normalizeForkHeight(payload);
  if (!Number.isFinite(height)) {
    return buildErrorResponse('invalid_height');
  }
  const target = clampForkHeight(height);
  const targetId = payload && (payload.id || payload.target_id || payload.target);
  if (targetId && targetId !== robot.currentStation) {
    if (!nodesById.has(targetId)) {
      return buildErrorResponse('unknown_target');
    }
    queueForkTask(targetId, target, operation, height);
    if (!robot.currentTask) {
      const result = startMoveToNode(targetId, 3);
      if (!result.ok) {
        robot.forkPending = null;
        return buildErrorResponse(result.error);
      }
    }
    return buildBaseResponse({});
  }
  startForkTask(target, operation, shouldReportForkTask(), height);
  return buildBaseResponse({});
}

function handleGoTarget(payload) {
  const forkOperation = getForkOperation(payload);
  if (forkOperation) {
    return handleForkOperation(payload, forkOperation);
  }
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
  if (robot.currentTask) {
    robot.paused = true;
    robot.taskStatus = 3;
  }
  return buildBaseResponse({});
}

function handleResumeTask() {
  robot.paused = false;
  if (robot.currentTask) {
    robot.taskStatus = 2;
  }
  return buildBaseResponse({});
}

function clearTaskState(status) {
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
  setChargeTarget(null);
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
  if (robot.softEmc) {
    robot.manual.active = false;
    robot.manual.vx = 0;
    robot.manual.vy = 0;
    robot.manual.w = 0;
    robot.manual.steer = 0;
    robot.manual.realSteer = 0;
    resetVelocity();
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

function handleSoftEmc(payload) {
  const enabled = Boolean(payload && payload.status);
  if (enabled) {
    if (!robot.softEmc) {
      robot.softEmcPaused = !robot.paused;
    }
    robot.softEmc = true;
    robot.manual.active = false;
    robot.manual.vx = 0;
    robot.manual.vy = 0;
    robot.manual.w = 0;
    robot.manual.steer = 0;
    robot.manual.realSteer = 0;
    if (!robot.paused) {
      robot.paused = true;
      if (robot.currentTask && robot.taskStatus !== 4) {
        robot.taskStatus = 3;
      }
    }
    resetVelocity();
    return buildBaseResponse({});
  }
  robot.softEmc = false;
  if (robot.softEmcPaused) {
    robot.paused = false;
    if (robot.currentTask && robot.taskStatus === 3) {
      robot.taskStatus = 2;
    }
  }
  robot.softEmcPaused = false;
  return buildBaseResponse({});
}

function handleConfigLock(payload, context) {
  const rawNick = payload && typeof payload.nick_name === 'string' ? payload.nick_name : '';
  const nickName = rawNick || (robot.lockInfo ? robot.lockInfo.nick_name : '');
  const ip = normalizeRemoteAddress(context && context.remoteAddress);
  const port = context && Number.isFinite(context.remotePort) ? context.remotePort : 0;
  if (rawNick) {
    const migrated = clientRegistry.migrateByNick(ip, rawNick);
    if (migrated && context) {
      context.clientId = migrated.id;
      context.clientSession = migrated;
    }
    if (context && context.clientSession) {
      context.clientSession.nickName = rawNick;
    }
  }
  const clientId = context && context.clientId ? context.clientId : ip;
  const requestMeta = { nick_name: rawNick, ip, port };
  const result = controlArbiter.acquire(clientId, {
    nick_name: nickName,
    ip,
    port,
    time_t: lockTimeSeconds(),
    request: requestMeta
  });
  if (!result.ok) {
    return buildErrorResponse(result.error || 'lock_failed');
  }
  robot.manualBlock = true;
  return buildBaseResponse({});
}

function handleConfigUnlock(clientId) {
  if (controlArbiter.shouldRejectUnlock(clientId)) {
    return buildErrorResponse('control_locked', 60001);
  }
  const result = controlArbiter.release(clientId || '', 'unlock');
  if (!result.ok && STRICT_UNLOCK) {
    return buildErrorResponse('control_locked', 60001);
  }
  return buildBaseResponse({});
}

function handleSetForkHeight(payload) {
  const height = normalizeForkHeight(payload);
  if (Number.isFinite(height)) {
    maybeReportForkHeightNotice(height);
  }
  const target = clampForkHeight(Number.isFinite(height) ? height : 0);
  robot.fork.targetHeight = target;
  robot.fork.heightInPlace = Math.abs(robot.fork.height - target) <= FORK_EPS;
  robot.fork.forwardVal = target;
  robot.fork.forwardInPlace = false;
  robot.fork.autoFlag = true;
  return buildBaseResponse({ fork_height: robot.fork.height });
}

function handleForkStop() {
  robot.fork.targetHeight = robot.fork.height;
  robot.fork.speed = 0;
  robot.fork.heightInPlace = true;
  robot.fork.forwardVal = clampForkHeight(robot.fork.height);
  robot.fork.forwardInPlace = false;
  if (robot.forkTaskActive || robot.taskType === FORK_TASK_TYPE) {
    robot.taskType = FORK_TASK_TYPE;
    robot.taskStatus = 4;
    robot.forkTaskActive = false;
  }
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
  const product = String(ROBOT_PRODUCT || '').trim();
  const currentMapEntries = robot.currentMap
    ? [
        {
          '3dFeatureTrans': [0, 0, 0],
          md5: robot.currentMapMd5 || '',
          name: robot.currentMap
        }
      ]
    : [];
  const response = {
    MAC: robot.mac || '',
    VERSION_LIST: robot.versionList || {},
    WLANMAC: robot.wlanMac || '',
    ap_addr: robot.apAddr || '',
    architecture: ROBOT_ARCH,
    calibrated: Boolean(robot.calibrated),
    create_on: createOn(),
    current_map: robot.currentMap || '',
    current_map_entries: currentMapEntries,
    current_map_md5: robot.currentMapMd5 || '',
    current_ip: robot.currentIp || '',
    dsp_version: ROBOT_DSP_VERSION,
    echoid: ROBOT_ECHOID,
    echoid_type: ROBOT_ECHOID_TYPE,
    features: ROBOT_FEATURES,
    gyro_version: ROBOT_GYRO_VERSION,
    hardware: robot.hardware || {},
    id: robot.id,
    map_version: robot.mapVersion || '',
    model_version: robot.modelVersion || '',
    model: ROBOT_MODEL,
    model_md5: ROBOT_MODEL_MD5,
    modbus_version: robot.modbusVersion || '',
    netprotocol_version: robot.netProtocolVersion || '',
    network_controllers: robot.networkControllers || [],
    ret_code: 0,
    roboshop_min_version_required: ROBOSHOP_MIN_VERSION_REQUIRED,
    robot_note: ROBOT_NOTE,
    rssi: robot.rssi || 0,
    safe_model_md5: robot.safeModelMd5 || '',
    ssid: robot.ssid || '',
    vehicle_id: ROBOT_VEHICLE_ID,
    version: ROBOT_VERSION
  };
  if (product && product.toLowerCase() !== 'null') {
    response.product = product;
  }
  return response;
}

function buildLocResponse() {
  const pose = STATUS_HIDE_POSE
    ? { x: null, y: null, angle: null }
    : { x: robot.pose.x, y: robot.pose.y, angle: robot.pose.angle };
  const currentStation = getReportedCurrentStation();
  const lastStation = getReportedLastStation(currentStation);
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
    steer_angles: [robot.velocity.steer],
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
    max_charge_voltage: MAX_CHARGE_VOLTAGE_V,
    max_charge_current: MAX_CHARGE_CURRENT_A,
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
    current_station: getReportedCurrentStation()
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
    forward_in_place: false,
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
  return {
    create_on: createOn(),
    current_map: mapInfo.name || '',
    current_map_md5: mapInfo.md5 || '',
    map_files_info: mapInfo.files,
    maps: mapInfo.names,
    ret_code: 0
  };
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
  if (robotParamsPayload && typeof robotParamsPayload === 'object') {
    const payload = cloneJson(robotParamsPayload);
    payload.create_on = createOn();
    payload.ret_code = 0;
    return payload;
  }
  return {
    create_on: createOn(),
    ret_code: 0,
    params: {}
  };
}

function buildDeviceTypesResponse() {
  if (deviceTypesPayloadFull && typeof deviceTypesPayloadFull === 'object') {
    const payload = cloneJson(deviceTypesPayloadFull);
    if (ROBOT_MODEL) {
      payload.model = ROBOT_MODEL;
    }
    return payload;
  }
  return { model: ROBOT_MODEL, deviceTypes: [] };
}

function buildFileListResponse() {
  if (fileListAssetsPayload && typeof fileListAssetsPayload === 'object') {
    const payload = cloneJson(fileListAssetsPayload);
    payload.create_on = createOn();
    payload.ret_code = 0;
    return payload;
  }
  return { create_on: createOn(), list: [], ret_code: 0 };
}

function buildFileListModulesResponse() {
  if (fileListModulesPayload && typeof fileListModulesPayload === 'object') {
    const payload = cloneJson(fileListModulesPayload);
    payload.create_on = createOn();
    payload.ret_code = 0;
    return payload;
  }
  return { create_on: createOn(), list: [], ret_code: 0 };
}

function buildDeviceTypesLiteResponse() {
  if (deviceTypesPayloadExt && typeof deviceTypesPayloadExt === 'object') {
    const payload = cloneJson(deviceTypesPayloadExt);
    if (payload.deviceTypes) {
      return payload;
    }
    return { deviceTypes: payload };
  }
  return { deviceTypes: [] };
}

function buildModuleDeviceTypesResponse() {
  if (deviceTypesPayloadModule && typeof deviceTypesPayloadModule === 'object') {
    return cloneJson(deviceTypesPayloadModule);
  }
  return { model: 'module', deviceTypes: [] };
}

function buildMapPropertiesResponse() {
  if (mapPropertiesPayload && typeof mapPropertiesPayload === 'object') {
    const payload = cloneJson(mapPropertiesPayload);
    payload.create_on = createOn();
    payload.ret_code = 0;
    return payload;
  }
  return { create_on: createOn(), maproperties: {}, ret_code: 0 };
}

function buildConfigMapResponse() {
  if (configMapDataPayload && typeof configMapDataPayload === 'object') {
    const payload = cloneJson(configMapDataPayload);
    if (payload.header && mapInfo.name) {
      payload.header.mapName = mapInfo.name;
    }
    return payload;
  }
  return {
    header: {
      mapType: '2D-Map',
      mapName: mapInfo.name || '',
      minPos: { x: 0, y: 0 },
      maxPos: { x: 0, y: 0 },
      resolution: 0,
      version: '1.0.0'
    },
    normalPosList: [],
    advancedPointList: [],
    advancedCurveList: []
  };
}
function buildAllResponse() {
  const payload = statusAllTemplate ? cloneJson(statusAllTemplate) : {};
  const task = robot.currentTask || robot.lastTask;
  const paths = getTaskPaths(task);
  const now = createOn();
  const uptime = nowMs() - robot.bootAt;
  const diList = buildDiList();
  const doList = buildDoList();
  const currentStation = getReportedCurrentStation();

  payload.create_on = now;
  payload.ret_code = 0;
  payload.current_map = robot.currentMap || '';
  payload.current_map_md5 = robot.currentMapMd5 || '';
  payload.current_map_entries = robot.currentMapEntries || mapEntries;
  payload.vehicle_id = ROBOT_VEHICLE_ID;
  payload.robot_note = ROBOT_NOTE;
  payload.model_md5 = ROBOT_MODEL_MD5;
  payload.MAC = robot.mac || '';
  payload.WLANMAC = robot.wlanMac || '';
  payload.current_ip = robot.currentIp || '';
  payload.confidence = robot.confidence;
  payload.x = robot.pose.x;
  payload.y = robot.pose.y;
  payload.angle = robot.pose.angle;
  payload.yaw = robot.pose.angle;
  payload.vx = robot.velocity.vx;
  payload.vy = robot.velocity.vy;
  payload.w = robot.velocity.w;
  payload.r_vx = robot.velocity.r_vx;
  payload.r_vy = robot.velocity.r_vy;
  payload.r_w = robot.velocity.r_w;
  payload.steer = robot.velocity.steer;
  payload.steer_angles = [robot.velocity.steer];
  payload.r_steer = robot.velocity.r_steer;
  payload.r_steer_angles = [robot.velocity.r_steer];
  payload.spin = robot.velocity.spin;
  payload.r_spin = robot.velocity.r_spin;
  payload.blocked = robot.blocked;
  payload.block_x = robot.blockPos.x;
  payload.block_y = robot.blockPos.y;
  if (robot.blocked) {
    payload.block_id = robot.blockId || 0;
    payload.block_reason = robot.blockReason;
    payload.block_di = robot.blockDi || 0;
    payload.block_ultrasonic_id = robot.blockUltrasonicId || 0;
  }
  payload.slowed = robot.slowDown;
  if (robot.slowDown) {
    payload.slow_reason = robot.slowReason;
    payload.slow_x = robot.slowPos.x;
    payload.slow_y = robot.slowPos.y;
    payload.slow_id = robot.slowId || 0;
    payload.slow_di = robot.slowDi || 0;
    payload.slow_ultrasonic_id = robot.slowUltrasonicId || 0;
  }
  payload.brake = robot.brake;
  payload.battery_level = batteryRatio(robot.battery);
  payload.battery_temp = robot.batteryTemp;
  payload.battery_cycle = robot.batteryCycle;
  payload.voltage = robot.voltage;
  payload.current = robot.current;
  payload.max_charge_voltage = MAX_CHARGE_VOLTAGE_V;
  payload.max_charge_current = MAX_CHARGE_CURRENT_A;
  payload.controller_temp = robot.controllerTemp;
  payload.controller_humi = robot.controllerHumi;
  payload.controller_voltage = robot.controllerVoltage;
  payload.odo = robot.odo;
  payload.today_odo = robot.todayOdo;
  payload.time = uptime;
  payload.total_time = uptime;
  payload.current_station = currentStation;
  payload.last_station = getReportedLastStation(currentStation);
  payload.reloc_status = robot.relocStatus;
  payload.task_status = robot.taskStatus;
  payload.task_type = robot.taskType;
  payload.task_id = task ? task.id : '';
  payload.target_id = task ? task.targetId : '';
  payload.target_point = task ? task.targetPoint : null;
  payload.target_label = '';
  payload.target_x = task && task.targetPoint ? task.targetPoint.x : 0;
  payload.target_y = task && task.targetPoint ? task.targetPoint.y : 0;
  payload.target_dist = 0;
  payload.finished_path = paths.finished;
  payload.unfinished_path = paths.unfinished;
  payload.running_status = robot.taskStatus;
  payload.is_stop = isStopped();
  payload.DI = diList;
  payload.DO = doList;
  payload.fork_height = robot.fork.height;
  payload.fork_height_in_place = robot.fork.heightInPlace;
  payload.fork_auto_flag = robot.fork.autoFlag;
  payload.forward_val = robot.fork.forwardVal;
  payload.forward_in_place = false;
  payload.fork_pressure_actual = robot.fork.pressureActual;
  payload.goods_region = cloneGoodsRegion(robot.goodsRegion);
  payload.errors = robot.alarms.errors;
  payload.warnings = robot.alarms.warnings;
  payload.notices = robot.alarms.notices;
  payload.fatals = robot.alarms.fatals;
  payload.charging = robot.charging;
  payload.emergency = robot.emergency;
  payload.driver_emc = robot.driverEmc;
  payload.electric = robot.electric;
  payload.soft_emc = robot.softEmc;
  payload.manual_charge = false;
  payload.auto_charge = false;
  payload.manualBlock = robot.manualBlock !== undefined ? robot.manualBlock : true;
  payload.current_lock = buildCurrentLockPayload(robot.lockInfo);
  payload.move_status_info = payload.move_status_info || '{"currentBlockId":"","info":"","objectFile":"","require":null}';
  if (!payload.tasklist_status) {
    payload.tasklist_status = {
      actionGroupId: 0,
      actionIds: [],
      loop: false,
      taskId: 0,
      taskListName: '',
      taskListStatus: 0
    };
  }
  return payload;
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

function handleRequest(apiNo, payload, allowedApis, context = {}) {
  if (allowedApis && !allowedApis.has(apiNo)) {
    return buildErrorResponse('wrong_port', 60000);
  }
  if (controlArbiter) {
    controlArbiter.releaseIfExpired();
    if (controlPolicy.requiresLock(apiNo)) {
      const clientId = context.clientId || null;
      if (!controlArbiter.canControl(clientId)) {
        return buildErrorResponse('control_locked', 60001);
      }
      controlArbiter.touch(clientId);
    }
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
    case API.robot_status_current_lock_req:
      return buildCurrentLockResponse();
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
    case API.robot_status_file_list_req:
      return buildFileListResponse();
    case API.robot_status_file_list_modules_req:
      return buildFileListModulesResponse();
    case API.robot_status_device_types_ext_req:
      return buildDeviceTypesLiteResponse();
    case API.robot_status_device_types_module_req:
      return buildModuleDeviceTypesResponse();
    case API.robot_status_map_properties_req:
      return buildMapPropertiesResponse();
    case API.robot_status_file_req:
      return buildFileResponse(payload) || buildErrorResponse('missing_file', 404);
    case API.robot_config_req_4005:
      return handleConfigLock(payload || {}, context);
    case API.robot_config_req_4006:
      return handleConfigUnlock(context && context.clientId ? context.clientId : null);
    case API.robot_config_req_4009:
    case API.robot_config_req_4010:
      return buildBaseResponse({});
    case API.robot_config_req_4011:
      return buildConfigMapResponse();
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
      return handleSoftEmc(payload || {});
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
  API.robot_status_current_lock_req,
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
  API.robot_status_file_list_req,
  API.robot_status_file_list_modules_req,
  API.robot_status_device_types_ext_req,
  API.robot_status_device_types_module_req,
  API.robot_status_map_properties_req,
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
const allowedConfigApis = new Set([
  API.robot_config_push_req,
  API.robot_config_req_4005,
  API.robot_config_req_4006,
  API.robot_config_req_4009,
  API.robot_config_req_4010,
  API.robot_config_req_4011
]);

function encodeFrameRaw(seq, apiNo, bodyBuffer, options = {}) {
  const body = Buffer.isBuffer(bodyBuffer) ? bodyBuffer : Buffer.from(bodyBuffer || '');
  const buffer = Buffer.alloc(HEADER_LEN + body.length);
  const reserved = Buffer.alloc(6, 0);
  const reservedOverride = options.reserved;

  if (reservedOverride) {
    const source = Buffer.isBuffer(reservedOverride)
      ? reservedOverride
      : Buffer.from(reservedOverride);
    source.copy(reserved, 0, 0, Math.min(source.length, reserved.length));
  }

  buffer.writeUInt8(START_MARK, 0);
  buffer.writeUInt8(VERSION, 1);
  buffer.writeUInt16BE(seq & 0xffff, 2);
  buffer.writeUInt32BE(body.length, 4);
  buffer.writeUInt16BE(apiNo & 0xffff, 8);
  reserved.copy(buffer, 10);
  if (body.length > 0) {
    body.copy(buffer, HEADER_LEN);
  }
  return buffer;
}

function createServer(port, allowedApis, label) {
  const server = net.createServer((socket) => {
    const parser = new RbkParser({ maxBodyLength: MAX_BODY_LENGTH });
    const context = {
      remoteAddress: normalizeRemoteAddress(socket.remoteAddress),
      remotePort: socket.remotePort,
      localPort: socket.localPort,
      label
    };

    if (MAX_CONNECTIONS && totalConnections >= MAX_CONNECTIONS) {
      socket.destroy();
      return;
    }

    const session = clientRegistry.attach(context);
    if (MAX_CLIENT_SESSIONS && clientRegistry.sessions.size > MAX_CLIENT_SESSIONS) {
      clientRegistry.detach(context);
      socket.destroy();
      return;
    }
    if (MAX_CONNECTIONS_PER_CLIENT && session.connections.size > MAX_CONNECTIONS_PER_CLIENT) {
      clientRegistry.detach(context);
      socket.destroy();
      return;
    }

    totalConnections += 1;
    socket.setNoDelay(true);
    if (SOCKET_IDLE_TIMEOUT_MS) {
      socket.setTimeout(SOCKET_IDLE_TIMEOUT_MS);
    }

    socket.on('error', (err) => {
      if (err && err.code && (err.code === 'ECONNRESET' || err.code === 'EPIPE')) {
        return;
      }
      console.warn(`robokit-robot-sim ${label} socket error`, err);
    });

    socket.on('timeout', () => {
      socket.destroy();
    });

    socket.on('close', () => {
      totalConnections = Math.max(0, totalConnections - 1);
      clientRegistry.detach(context);
    });

    socket.on('data', (chunk) => {
      let messages = [];
      try {
        messages = parser.push(chunk);
      } catch (err) {
        socket.destroy();
        return;
      }

      for (const msg of messages) {
        clientRegistry.touch(context);
        const responsePayload = handleRequest(msg.apiNo, msg.payload, allowedApis, context);
        const frame = Buffer.isBuffer(responsePayload)
          ? encodeFrameRaw(msg.seq, responseApi(msg.apiNo), responsePayload, {
              reserved: msg.reserved
            })
          : encodeFrame(msg.seq, responseApi(msg.apiNo), responsePayload, {
              reserved: msg.reserved
            });
        socket.write(frame);
      }
    });
  });

  server.listen(port, BIND_HOST || undefined, () => {
    const hostLabel = BIND_HOST || '0.0.0.0';
    console.log(`robokit-robot-sim ${label} listening on tcp://${hostLabel}:${port}`);
  });

  return server;
}

const pushConnections = new Map();
let pushSeq = 1;
let totalConnections = 0;
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
    const minInterval = Number.isFinite(PUSH_MIN_INTERVAL_MS) ? PUSH_MIN_INTERVAL_MS : 0;
    const maxInterval = Number.isFinite(PUSH_MAX_INTERVAL_MS) ? PUSH_MAX_INTERVAL_MS : interval;
    target.intervalMs = Math.max(minInterval, Math.min(interval, maxInterval));
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
  return buildBaseResponse({});
}

function getCurrentStationForPush() {
  return getReportedCurrentStation();
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
    if (PUSH_MAX_QUEUE_BYTES && conn.socket.writableLength > PUSH_MAX_QUEUE_BYTES) {
      conn.socket.destroy();
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
    const context = {
      remoteAddress: normalizeRemoteAddress(socket.remoteAddress),
      remotePort: socket.remotePort,
      localPort: socket.localPort,
      label: 'push'
    };

    if (MAX_CONNECTIONS && totalConnections >= MAX_CONNECTIONS) {
      socket.destroy();
      return;
    }

    const session = clientRegistry.attach(context);
    if (MAX_CLIENT_SESSIONS && clientRegistry.sessions.size > MAX_CLIENT_SESSIONS) {
      clientRegistry.detach(context);
      socket.destroy();
      return;
    }
    if (MAX_CONNECTIONS_PER_CLIENT && session.connections.size > MAX_CONNECTIONS_PER_CLIENT) {
      clientRegistry.detach(context);
      socket.destroy();
      return;
    }

    totalConnections += 1;
    socket.setNoDelay(true);
    if (SOCKET_IDLE_TIMEOUT_MS) {
      socket.setTimeout(SOCKET_IDLE_TIMEOUT_MS);
    }
    const conn = {
      socket,
      intervalMs: pushDefaults.intervalMs,
      includedFields: cloneFieldList(pushDefaults.includedFields),
      excludedFields: cloneFieldList(pushDefaults.excludedFields),
      timer: null
    };
    pushConnections.set(socket, conn);

    socket.on('error', (err) => {
      if (err && err.code && (err.code === 'ECONNRESET' || err.code === 'EPIPE')) {
        return;
      }
      console.warn('robokit-robot-sim push socket error', err);
    });

    socket.on('timeout', () => {
      socket.destroy();
    });

    socket.on('data', (chunk) => {
      let messages = [];
      try {
        messages = parser.push(chunk);
      } catch (err) {
        socket.destroy();
        return;
      }

      for (const msg of messages) {
        clientRegistry.touch(context);
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
      totalConnections = Math.max(0, totalConnections - 1);
      clientRegistry.detach(context);
      if (conn.timer) {
        clearInterval(conn.timer);
      }
      pushConnections.delete(socket);
    });
  });

  server.listen(port, BIND_HOST || undefined, () => {
    const hostLabel = BIND_HOST || '0.0.0.0';
  console.log(`robokit-robot-sim push listening on tcp://${hostLabel}:${port}`);
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
  if (robot.blocked && robot.blockReason === BLOCK_REASON_OBSTACLE) {
    setRobotBlockedState(false);
  }
  return { ok: true, obstacles: [] };
}

function handleHttpListObstacles() {
  return { ok: true, obstacles: listSimObstacles() };
}

function buildRobotsStatusResponse(request = {}) {
  const status = {
    id: robot.id,
    name: ROBOT_VEHICLE_ID || robot.id,
    model: ROBOT_MODEL,
    version: ROBOT_VERSION,
    vehicle_id: ROBOT_VEHICLE_ID,
    type: 'lifts',
    ip: robot.currentIp || '',
    online: robot.online,
    battery_level: batteryRatio(robot.battery),
    charging: robot.charging,
    blocked: robot.blocked,
    x: robot.pose.x,
    y: robot.pose.y,
    angle: robot.pose.angle,
    vx: robot.velocity.vx,
    vy: robot.velocity.vy,
    w: robot.velocity.w,
    task_status: robot.taskStatus,
    task_type: robot.taskType,
    fork_height: robot.fork.height,
    current_map: robot.currentMap || ''
  };
  status.status = { ...status };

  const requested = new Set(
    Array.isArray(request.devices) ? request.devices.map((item) => String(item).toLowerCase()) : []
  );
  const includeLifts = requested.size === 0 || requested.has('lifts') || requested.has('robots');
  const devicesByType = {
    lifts: includeLifts ? [status] : [],
    doors: [],
    terminals: [],
    windshowers: []
  };

  return {
    ok: true,
    devices: devicesByType,
    device_list: includeLifts ? [status] : [],
    lifts: devicesByType.lifts,
    doors: devicesByType.doors,
    terminals: devicesByType.terminals,
    windshowers: devicesByType.windshowers
  };
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
setInterval(() => {
  clientRegistry.sweep();
}, 5000);

createServer(ENV_PORTS.ROBOD, allowedRobodApis, 'robod');
createServer(ENV_PORTS.STATE, allowedStateApis, 'state');
createServer(ENV_PORTS.CTRL, allowedCtrlApis, 'ctrl');
createServer(ENV_PORTS.TASK, allowedTaskApis, 'task');
createServer(ENV_PORTS.KERNEL, allowedKernelApis, 'kernel');
createServer(ENV_PORTS.OTHER, allowedOtherApis, 'other');
createServer(ENV_PORTS.CONFIG, allowedConfigApis, 'config');
createPushServer(ENV_PORTS.PUSH);
startHttpStub({
  onSetOrder: handleHttpSetOrder,
  onAddObstacle: handleHttpAddObstacle,
  onClearObstacles: handleHttpClearObstacles,
  onListObstacles: handleHttpListObstacles,
  onSetBlocked: handleHttpSetBlocked,
  onRobotsStatus: buildRobotsStatusResponse
});

console.log(`robokit-robot-sim using graph: ${GRAPH_PATH}`);
console.log(`robokit-robot-sim start node: ${robot.currentStation}`);
if (robotConfigInfo) {
  console.log(`robokit-robot-sim robot config: ${robotConfigInfo.path}`);
}
