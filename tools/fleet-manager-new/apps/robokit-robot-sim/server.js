const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  API,
  encodeFrame,
  responseApi,
  START_MARK,
  VERSION,
  HEADER_LEN
} = require('../../packages/robokit-lib/rbk');
const { loadMapGraphLight } = require('../../packages/robokit-lib/map_loader');
const { startHttpStub } = require('./http_stub');
const { startAdminServer } = require('./admin_http');
const { SimModule } = require('./syspy-js');
const MotionKernel = require('../../packages/robokit-lib/motion_kernel');
const config = require('./lib/config');
const { ControlArbiter } = require('./core/control_arbiter');
const { createForkController } = require('./core/fork_controller');
const { createTaskEngine } = require('./core/task_engine');
const { createSimulationEngine } = require('./core/simulation_engine');
const { createNavigation } = require('./core/navigation');
const { createApiRouter } = require('./protocol/api_router');
const { CommandCache } = require('./protocol/command_cache');
const { createControlPolicy } = require('./protocol/control_policy');
const { createStatusBuilder } = require('./views/status_builder');
const { createPushBuilder } = require('./views/push_builder');
const { ClientRegistry } = require('./transport/client_registry');
const { createTcpServer, createPushServer } = require('./transport/tcp_servers');
const { createSimClock } = require('./lib/sim_clock');
const { createRng } = require('./lib/rng');
const { EventLogger } = require('./lib/event_logger');

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
  SIM_TIME_MODE,
  SIM_TIME_START_MS,
  SIM_TIME_STEP_MS,
  SIM_SEED,
  EVENT_LOG_PATH,
  EVENT_LOG_STDOUT,
  DIAG_LOG,
  DIAG_LOG_TICK_MS,
  DIAG_TELEPORT_THRESHOLD_M,
  MANUAL_CONTROL_DEADBAND,
  ADMIN_HTTP_PORT,
  ADMIN_HTTP_HOST,
  PRINT_EFFECTIVE_CONFIG,
  CLIENT_ID_STRATEGY,
  CLIENT_TTL_MS,
  CLIENT_IDLE_MS,
  COMMAND_CACHE_TTL_MS,
  COMMAND_CACHE_MAX_ENTRIES,
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
  PUSH_MAX_QUEUE_BYTES,
  PUSH_MAX_FIELDS,
  MAX_PUSH_CONNECTIONS,
  MAX_TASK_NODES
} = config;

const configErrors = config.validateConfig();
if (configErrors.length) {
  console.error('robokit-robot-sim invalid config:');
  configErrors.forEach((entry) => console.error(`- ${entry}`));
  process.exit(1);
}

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
const simClock = createSimClock({
  mode: SIM_TIME_MODE,
  startMs: Number.isFinite(SIM_TIME_START_MS) ? SIM_TIME_START_MS : undefined,
  stepMs: Number.isFinite(SIM_TIME_STEP_MS) ? SIM_TIME_STEP_MS : undefined
});
const rng = createRng(SIM_SEED);
const eventLogger =
  EVENT_LOG_PATH || EVENT_LOG_STDOUT
    ? new EventLogger({ path: EVENT_LOG_PATH, stdout: EVENT_LOG_STDOUT, now: () => simClock.now() })
    : null;

function nowMs() {
  return simClock.now();
}

function lockTimeSeconds() {
  return Math.floor(simClock.now() / 1000);
}

const diagEnabled = DIAG_LOG;
function diagLog(event, payload = {}) {
  if (!diagEnabled) {
    return;
  }
  const name = `diag_${event}`;
  if (eventLogger) {
    eventLogger.log(name, payload);
    return;
  }
  const entry = { ts: nowMs(), event: name, ...payload };
  process.stdout.write(`${JSON.stringify(entry)}\n`);
}

function normalizeRemoteAddress(value) {
  if (!value) return '';
  const text = String(value);
  if (text === '::1') return '127.0.0.1';
  if (text.startsWith('::ffff:')) return text.slice(7);
  return text;
}

function createOn() {
  return formatOffsetTimestamp(new Date(simClock.now()), createOnSpec);
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


const navigation = createNavigation({
  graph,
  motion: MotionKernel,
  pathSampleStep: PATH_SAMPLE_STEP,
  pathMinSamples: PATH_MIN_SAMPLES,
  pathMaxSamples: PATH_MAX_SAMPLES,
  lineMatchMaxDist: LINE_MATCH_MAX_DIST,
  lineMatchAngleDeg: LINE_MATCH_ANGLE_DEG
});
const {
  nodesById,
  adjacency,
  edgesByKey,
  incomingAdjacency,
  findNearestNode,
  findNearestNodeFromIds,
  findPath,
  computeDistancesToTarget
} = navigation;

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
    const t = abLenSq > 0 ? Math.max(0, Math.min(((x - a.x) * abx + (y - a.y) * aby) / abLenSq, 1)) : 0;
    const cx = a.x + abx * t;
    const cy = a.y + aby * t;
    const dist = Math.hypot(x - cx, y - cy);
    if (dist < bestDist) {
      const base = lengths[i] || 0;
      const segLen = lengths[i + 1] !== undefined ? lengths[i + 1] - base : Math.hypot(abx, aby);
      bestDist = dist;
      bestProgress = base + segLen * t;
    }
  }
  return { progress: bestProgress, dist: bestDist };
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
  if (robot.currentTask && robot.currentTask.approach && robot.currentTask.approach.active) {
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
    diagLog('script_start_failed', {
      reason: 'invalid_points',
      pointsCount: Array.isArray(points) ? points.length : 0
    });
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
  diagLog('script_start', {
    pointsCount: points.length,
    totalLength: polyline.totalLength,
    targetAngle: sp.targetAngle,
    maxSpeed: sp.maxSpeed,
    pose: { x: robot.pose.x, y: robot.pose.y, angle: robot.pose.angle }
  });
  return true;
}

function startApproachToTarget(targetId, taskType, targetPoint, options = null) {
  diagLog('approach_request', {
    targetId,
    taskType: taskType || 0,
    pose: { x: robot.pose.x, y: robot.pose.y, angle: robot.pose.angle },
    hasPathNodes: Boolean(options && Array.isArray(options.pathNodes) && options.pathNodes.length >= 2)
  });
  const hasPathNodes = options && Array.isArray(options.pathNodes) && options.pathNodes.length >= 2;
  let approach = null;
  let pathNodes = null;
  let entryProgress = Number.isFinite(options && options.entryProgress) ? options.entryProgress : null;
  let entryStartId = options && options.entryStartId ? options.entryStartId : null;
  let entryEndId = options && options.entryEndId ? options.entryEndId : null;

  if (hasPathNodes) {
    pathNodes = options.pathNodes;
  } else {
    approach = findBestApproach(targetId);
    if (!approach) {
      diagLog('approach_failed', { reason: 'no_approach', targetId });
      return { ok: false, error: 'path_not_found' };
    }
    if (approach.edgeStartId && approach.edgeEndId && approach.edgeStartId !== approach.edgeEndId) {
      const fromEntry = findPath(approach.edgeEndId, targetId);
      if (fromEntry && fromEntry.length > 0) {
        pathNodes = [approach.edgeStartId, ...fromEntry];
      }
    }
    if (!pathNodes) {
      pathNodes = findPath(approach.edgeStartId, targetId);
    }
    if (!pathNodes) {
      diagLog('approach_failed', { reason: 'path_not_found', targetId, entryStartId: approach.edgeStartId });
      return { ok: false, error: 'path_not_found' };
    }
    if (!Number.isFinite(entryProgress)) {
      entryProgress = approach.entryProgress;
    }
    if (!entryStartId) {
      entryStartId = approach.edgeStartId;
    }
    if (!entryEndId) {
      entryEndId = approach.edgeEndId;
    }
  }

  const task = createTaskWithPath(pathNodes, targetId, taskType, targetPoint);
  if (task && robot.currentStation && nodesById.has(robot.currentStation)) {
    if (task.pathNodes && task.pathNodes[0] !== robot.currentStation) {
      task.reportedPathNodes = [robot.currentStation, ...task.pathNodes];
    }
  }

  let entryPose = approach ? approach.entryPose : null;
  let entryHeading = approach ? approach.entryHeading : null;
  if (task && Array.isArray(task.segments) && task.segments.length > 0) {
    const segment = task.segments[0];
    if (!Number.isFinite(entryProgress)) {
      const snap = findPolylineProgress(segment.polyline, robot.pose.x, robot.pose.y);
      entryProgress = snap.progress;
    }
    entryProgress = clamp(entryProgress, 0, segment.totalLength);
    const entryState = segmentPoseAtDistance(segment, entryProgress);
    entryPose = entryState;
    entryHeading = entryState.heading;
    task.segmentProgress = entryProgress;
    task.segmentMode = 'move';
    if (!entryStartId) {
      entryStartId = segment.startId;
    }
    if (!entryEndId) {
      entryEndId = segment.endId;
    }
  }

  if (!entryPose || !Number.isFinite(entryHeading)) {
    diagLog('approach_failed', { reason: 'invalid_entry_pose', targetId });
    return { ok: false, error: 'path_not_found' };
  }
  const curvePoints = buildApproachCurvePoints(entryPose, entryHeading);
  if (!curvePoints || curvePoints.length < 2) {
    diagLog('approach_failed', { reason: 'invalid_curve', targetId, curvePoints: curvePoints ? curvePoints.length : 0 });
    return { ok: false, error: 'path_not_found' };
  }
  startScriptPath(curvePoints, entryHeading, SPEED_M_S * 0.8);
  if (robot.scriptPath) {
    robot.scriptPath.kind = 'approach';
  }
  if (task) {
    task.approach = {
      active: true,
      entryProgress,
      entryStartId: entryStartId || null,
      entryEndId: entryEndId || null
    };
  }
  diagLog('approach_start', {
    targetId,
    taskId: task ? task.id : '',
    entryStartId: entryStartId || null,
    entryEndId: entryEndId || null,
    entryProgress,
    entryPose: entryPose ? { x: entryPose.x, y: entryPose.y, heading: entryPose.heading } : null,
    pathNodes,
    curvePoints: curvePoints.length
  });
  return { ok: true, task };
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
    startHeading: 0,
    kind: null
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
let taskEngine = null;
let forkController = null;
const startMoveToNodeProxy = (...args) =>
  taskEngine ? taskEngine.startMoveToNode(...args) : { ok: false, error: 'task_engine_unready' };
const startMoveToPointProxy = (...args) =>
  taskEngine ? taskEngine.startMoveToPoint(...args) : { ok: false, error: 'task_engine_unready' };
const startMultiStationTaskProxy = (...args) =>
  taskEngine
    ? taskEngine.startMultiStationTask(...args)
    : { ok: false, error: 'task_engine_unready' };
const getTaskPathsProxy = (task) =>
  taskEngine ? taskEngine.getTaskPaths(task) : { finished: [], unfinished: [] };
const simModule = new SimModule({
  robot,
  graph,
  nodesById,
  startMoveToNode: startMoveToNodeProxy,
  startMoveToPoint: startMoveToPointProxy,
  startMultiStationTask: startMultiStationTaskProxy,
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
robot.rng = rng;
simModule.rng = rng;
let taskCounter = 1;

let controlArbiter = null;
const clientRegistry = new ClientRegistry({
  strategy: CLIENT_ID_STRATEGY,
  ttlMs: CLIENT_TTL_MS,
  idleMs: CLIENT_IDLE_MS,
  now: () => simClock.now(),
  onSessionExpired: (session) => {
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

const commandCache = new CommandCache({
  ttlMs: COMMAND_CACHE_TTL_MS,
  maxEntries: COMMAND_CACHE_MAX_ENTRIES,
  now: () => simClock.now()
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
  now: () => simClock.now(),
  onPreempt: () => {
    clearManualControl();
  },
  onEvent: eventLogger
    ? (entry) => {
        const { event, ...payload } = entry || {};
        if (event) {
          eventLogger.log(event, payload);
        }
      }
    : null
});

const statusBuilder = createStatusBuilder({
  robot,
  graph,
  mapInfo,
  mapEntries,
  statusAllTemplate,
  robotParamsPayload,
  deviceTypesPayloadFull,
  deviceTypesPayloadExt,
  deviceTypesPayloadModule,
  fileListAssetsPayload,
  fileListModulesPayload,
  mapPropertiesPayload,
  configMapDataPayload,
  fileRoots,
  listSimObstacles,
  createOn,
  nowMs,
  batteryRatio,
  getTaskPaths: getTaskPathsProxy,
  getReportedCurrentStation,
  getReportedLastStation,
  isStopped,
  cloneJson,
  cloneGoodsRegion,
  config,
  ROBOT_FEATURES,
  DEFAULT_LOCK_TYPE
});

const {
  buildBaseResponse,
  buildErrorResponse,
  buildCurrentLockResponse,
  buildInfoResponse,
  buildLocResponse,
  buildSpeedResponse,
  buildMotorResponse,
  buildRunResponse,
  buildModeResponse,
  buildBatteryResponse,
  buildPathResponse,
  buildAreaResponse,
  buildDiList,
  buildDoList,
  buildIoResponse,
  buildBlockResponse,
  buildBrakeResponse,
  buildLaserResponse,
  buildUltrasonicResponse,
  buildPolygonResponse,
  buildObstacleResponse,
  buildEmergencyResponse,
  buildImuResponse,
  buildRelocStatusResponse,
  buildLoadmapStatusResponse,
  buildCalibrationStatusResponse,
  buildTrackingStatusResponse,
  buildSlamStatusResponse,
  buildForkResponse,
  buildTaskStatusResponse,
  buildTasklistStatusResponse,
  buildAlarmResponse,
  buildInitResponse,
  buildMapResponse,
  buildStationResponse,
  buildParamsResponse,
  buildDeviceTypesResponse,
  buildFileListResponse,
  buildFileListModulesResponse,
  buildDeviceTypesLiteResponse,
  buildModuleDeviceTypesResponse,
  buildMapPropertiesResponse,
  buildConfigMapResponse,
  buildAllResponse,
  buildTaskPathResponse,
  buildTaskListStatus,
  buildTaskListNames,
  buildAudioList,
  buildFileResponse
} = statusBuilder;

const getForkOperationProxy = (payload) =>
  forkController ? forkController.getForkOperation(payload) : null;
const handleForkOperationProxy = (payload, operation) =>
  forkController ? forkController.handleForkOperation(payload, operation) : buildErrorResponse('invalid_height');

taskEngine = createTaskEngine({
  robot,
  nodesById,
  edgesByKey,
  nowMs,
  resetVelocity,
  setChargeTarget,
  buildErrorResponse,
  buildBaseResponse,
  startApproachToTarget,
  findPath,
  findNearestNode,
  distancePointToSegmentCoords,
  buildPolyline,
  currentPointDist: CURRENT_POINT_DIST,
  maxTaskNodes: MAX_TASK_NODES,
  getForkOperation: getForkOperationProxy,
  handleForkOperation: handleForkOperationProxy,
  nextTaskId: () => taskCounter++,
  diagLog
});

const {
  handleGoTarget,
  handleGoPoint,
  handleMultiStation,
  handlePauseTask,
  handleResumeTask,
  handleCancelTask,
  handleClearTask,
  handleClearMultiStation,
  createTaskWithPath,
  startMoveToNode,
  startMoveToPoint,
  startMultiStationTask,
  rebuildTaskPath,
  getTaskPaths
} = taskEngine;

forkController = createForkController({
  robot,
  nowMs,
  lockTimeSeconds,
  createOn,
  buildErrorResponse,
  buildBaseResponse,
  resetVelocity,
  startMoveToNode,
  nodesById,
  cloneGoodsRegion,
  clampForkHeight,
  approachValue,
  FORK_EPS,
  FORK_SPEED_M_S,
  FORK_ACCEL_M_S2,
  FORK_TASK_DELAY_MS,
  FORK_MIN_HEIGHT,
  FORK_TASK_TYPE,
  EMPTY_GOODS_REGION,
  LOADED_GOODS_REGION
});

const {
  handleSetForkHeight,
  handleForkStop,
  handleForkOperation,
  getForkOperation,
  beginAttachedForkForTask,
  maybeStartPendingFork,
  tickFork
} = forkController;

const pushBuilder = createPushBuilder({
  robot,
  graph,
  buildBaseResponse,
  batteryRatio,
  getTaskPaths,
  buildDiList,
  buildDoList,
  getReportedCurrentStation,
  isStopped,
  pushMaxFields: PUSH_MAX_FIELDS
});

const { buildPushPayload } = pushBuilder;

const simulationEngine = createSimulationEngine({
  robot,
  simClock,
  nowMs,
  tickMs: TICK_MS,
  controlArbiter,
  clearManualControl,
  tickFork,
  updateCharging,
  resetVelocity,
  shouldBlockForObstacle,
  segmentPoseAtDistance,
  updateVelocity,
  applyOdo,
  normalizeAngle,
  toRad,
  polylineAtDistance,
  approachValue,
  findNearestNode,
  beginAttachedForkForTask,
  maybeStartPendingFork,
  constants: {
    BLOCK_REASON_MANUAL,
    ROTATE_EPS_RAD,
    ROTATE_SPEED_RAD_S,
    ROT_ACCEL_RAD_S2,
    ROT_DECEL_RAD_S2,
    SPEED_M_S,
    ACCEL_M_S2,
    DECEL_M_S2,
    FORK_TASK_TYPE,
    ARRIVAL_EPS,
    WHEELBASE_M,
    CURRENT_POINT_DIST
  },
  diagLog,
  diagLogTickMs: DIAG_LOG_TICK_MS,
  diagTeleportThreshold: DIAG_TELEPORT_THRESHOLD_M
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
    diagLog('reloc_failed', {
      targetId: targetId || null,
      x,
      y,
      autoRequested,
      reason: 'invalid_reloc'
    });
    return buildErrorResponse('invalid_reloc');
  }

  if (node) {
    robot.lastStation = robot.currentStation;
    robot.currentStation = node.id;
  }
  const poseX = x !== null ? x : node ? node.pos.x : robot.pose.x;
  const poseY = y !== null ? y : node ? node.pos.y : robot.pose.y;
  setRobotPose(
    { x: poseX, y: poseY, angle },
    'reloc',
    {
      targetId: targetId || null,
      nodeId: node ? node.id : null
    }
  );
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

function setRobotPose(pose, reason, extra) {
  if (!diagEnabled) {
    robot.pose = pose;
    return;
  }
  const before = { x: robot.pose.x, y: robot.pose.y, angle: robot.pose.angle };
  robot.pose = pose;
  const after = { x: robot.pose.x, y: robot.pose.y, angle: robot.pose.angle };
  diagLog('pose_set', {
    reason: reason || '',
    before,
    after,
    ...(extra || {})
  });
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
    diagLog('script_cancel', { reason: 'stop_control' });
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
  const deadband = Number.isFinite(MANUAL_CONTROL_DEADBAND) ? MANUAL_CONTROL_DEADBAND : 0;
  const magnitude = Math.max(
    Math.abs(vx),
    Math.abs(vy),
    Math.abs(w),
    Math.abs(steer),
    Math.abs(realSteer)
  );
  if (!robot.manual.active && robot.currentTask && magnitude <= deadband) {
    diagLog('manual_control_ignored', {
      reason: 'deadband_with_task',
      deadband,
      vx,
      vy,
      w,
      steer,
      real_steer: realSteer
    });
    return buildBaseResponse({});
  }
  if (robot.currentTask && magnitude > deadband && !robot.manual.active) {
    const taskId = robot.currentTask ? robot.currentTask.id : '';
    handleCancelTask();
    diagLog('manual_override_task', {
      taskId,
      deadband,
      vx,
      vy,
      w,
      steer,
      real_steer: realSteer
    });
  }

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
    diagLog('script_cancel', { reason: 'manual_control' });
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
  if (!result.ok && eventLogger) {
    eventLogger.log('unlock_rejected', {
      by: clientId || null,
      owner: controlArbiter ? controlArbiter.getOwner() : null
    });
  }
  if (result.ok && result.released) {
    clearManualControl();
  }
  if (!result.ok && STRICT_UNLOCK) {
    return buildErrorResponse('control_locked', 60001);
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
const allowedConfigApis = new Set([
  API.robot_config_req_4005,
  API.robot_config_req_4006,
  API.robot_config_req_4009,
  API.robot_config_req_4010,
  API.robot_config_req_4011
]);
const allowedRobodApis = new Set([
  ...allowedStateApis,
  ...allowedCtrlApis,
  ...allowedTaskApis,
  ...allowedOtherApis,
  ...allowedConfigApis
]);
const allowedKernelApis = allowedRobodApis;
const idempotentApis = new Set([
  API.robot_control_stop_req,
  API.robot_control_motion_req,
  API.robot_control_reloc_req,
  API.robot_control_comfirmloc_req,
  API.robot_control_cancelreloc_req,
  API.robot_task_gotarget_req,
  API.robot_task_gopoint_req,
  API.robot_task_multistation_req,
  API.robot_task_pause_req,
  API.robot_task_resume_req,
  API.robot_task_cancel_req,
  API.robot_task_clear_multistation_req,
  API.robot_task_clear_task_req,
  API.robot_other_forkheight_req,
  API.robot_other_forkstop_req,
  API.robot_config_req_4005,
  API.robot_config_req_4006
]);

const apiRouter = createApiRouter({
  controlArbiter,
  controlPolicy,
  eventLogger,
  commandCache,
  idempotentApis,
  handlers: {
    buildErrorResponse,
    buildBaseResponse,
    buildInfoResponse,
    buildRunResponse,
    buildModeResponse,
    buildLocResponse,
    buildSpeedResponse,
    buildMotorResponse,
    buildPathResponse,
    buildAreaResponse,
    buildBlockResponse,
    buildCurrentLockResponse,
    buildBatteryResponse,
    buildBrakeResponse,
    buildLaserResponse,
    buildUltrasonicResponse,
    buildPolygonResponse,
    buildObstacleResponse,
    buildEmergencyResponse,
    buildIoResponse,
    buildImuResponse,
    buildRelocStatusResponse,
    buildLoadmapStatusResponse,
    buildCalibrationStatusResponse,
    buildTrackingStatusResponse,
    buildSlamStatusResponse,
    buildTasklistStatusResponse,
    buildTaskStatusResponse,
    buildForkResponse,
    buildAlarmResponse,
    buildAllResponse,
    buildInitResponse,
    buildMapResponse,
    buildStationResponse,
    buildParamsResponse,
    buildDeviceTypesResponse,
    buildFileListResponse,
    buildFileListModulesResponse,
    buildDeviceTypesLiteResponse,
    buildModuleDeviceTypesResponse,
    buildMapPropertiesResponse,
    buildFileResponse,
    buildConfigMapResponse,
    handleConfigLock,
    handleConfigUnlock,
    handleReloc,
    handleStopControl,
    handleConfirmLoc,
    handleCancelReloc,
    handleMotionControl,
    handleGoTarget,
    handleGoPoint,
    handleMultiStation,
    handlePauseTask,
    handleResumeTask,
    handleCancelTask,
    buildTaskPathResponse,
    handleSetDo,
    handleSetDoBatch,
    handleSoftEmc,
    handleSetDi,
    buildAudioList,
    handleSetForkHeight,
    handleForkStop,
    handleClearMultiStation,
    handleClearTask,
    buildTaskListStatus,
    buildTaskListNames
  }
});

function handleApiMessage(msg, context, allowedApis) {
  return apiRouter.handle(msg.apiNo, msg.payload, allowedApis, context);
}

function handleParseError() {
  return buildErrorResponse('json_parse_error');
}

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

const pushConnections = new Map();
let pushSeq = 1;
let totalConnections = 0;
function getTotalConnections() {
  return totalConnections;
}
function onConnectionChange(delta) {
  totalConnections = Math.max(0, totalConnections + delta);
}
const pushDefaults = {
  intervalMs: 500,
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

function startPushTimer(conn) {
  if (conn.timer) {
    clearInterval(conn.timer);
  }
  const minInterval = Number.isFinite(PUSH_MIN_INTERVAL_MS) ? PUSH_MIN_INTERVAL_MS : 0;
  const interval = Math.max(minInterval, Number.parseInt(conn.intervalMs || 1000, 10));
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
    conn.trimmed = false;
    const payload = buildPushPayload(conn);
    if (conn.trimmed && !conn.trimNoticeLogged) {
      console.warn('robokit-robot-sim push payload trimmed to PUSH_MAX_FIELDS');
      conn.trimNoticeLogged = true;
    }
    const frame = encodeFrame(pushSeq++, API.robot_push, payload);
    conn.socket.write(frame);
  }, interval);
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
    path_nodes: taskEngine ? taskEngine.getReportedPathNodes(result.task) : result.task.pathNodes
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

const intervals = [];
const servers = [];
let adminServer = null;
let httpStub = null;
let shuttingDown = false;

function logEffectiveConfig() {
  if (!PRINT_EFFECTIVE_CONFIG) {
    return;
  }
  console.log(
    JSON.stringify(
      {
        ports: ENV_PORTS,
        bindHost: BIND_HOST,
        timeMode: SIM_TIME_MODE,
        lock: {
          requireControl: REQUIRE_LOCK_FOR_CONTROL,
          requireNav: REQUIRE_LOCK_FOR_NAV,
          requireFork: REQUIRE_LOCK_FOR_FORK,
          lockTtlMs: LOCK_TTL_MS,
          strictUnlock: STRICT_UNLOCK
        },
        clients: {
          strategy: CLIENT_ID_STRATEGY,
          ttlMs: CLIENT_TTL_MS,
          idleMs: CLIENT_IDLE_MS,
          commandCacheTtlMs: COMMAND_CACHE_TTL_MS,
          commandCacheMaxEntries: COMMAND_CACHE_MAX_ENTRIES,
          maxConnections: MAX_CONNECTIONS,
          maxConnectionsPerClient: MAX_CONNECTIONS_PER_CLIENT,
          maxClientSessions: MAX_CLIENT_SESSIONS
        },
        push: {
          minIntervalMs: PUSH_MIN_INTERVAL_MS,
          maxIntervalMs: PUSH_MAX_INTERVAL_MS,
          maxQueueBytes: PUSH_MAX_QUEUE_BYTES,
          maxFields: PUSH_MAX_FIELDS,
          maxConnections: MAX_PUSH_CONNECTIONS
        }
      },
      null,
      2
    )
  );
}

function shutdown(reason) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  if (reason) {
    console.log(`robokit-robot-sim shutting down (${reason})`);
  }
  for (const timer of intervals) {
    clearInterval(timer);
  }
  for (const server of servers) {
    server.close();
  }
  if (httpStub && Array.isArray(httpStub.servers)) {
    httpStub.servers.forEach((server) => server.close());
  }
  if (adminServer) {
    adminServer.close();
  }
  if (eventLogger) {
    eventLogger.close();
  }
  setTimeout(() => process.exit(reason ? 1 : 0), 200).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  console.error('robokit-robot-sim uncaughtException', err);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (err) => {
  console.error('robokit-robot-sim unhandledRejection', err);
  shutdown('unhandledRejection');
});

logEffectiveConfig();
console.log(`robokit-robot-sim time mode: ${SIM_TIME_MODE}`);

intervals.push(setInterval(() => simulationEngine.tick(), TICK_MS));
intervals.push(
  setInterval(() => {
    clientRegistry.sweep(nowMs());
  }, 5000)
);

servers.push(
  createTcpServer({
    port: ENV_PORTS.ROBOD,
    bindHost: BIND_HOST,
    label: 'robod',
    allowedApis: allowedRobodApis,
    maxBodyLength: MAX_BODY_LENGTH,
    strictStartMark: true,
    maxConnections: MAX_CONNECTIONS,
    maxConnectionsPerClient: MAX_CONNECTIONS_PER_CLIENT,
    maxClientSessions: MAX_CLIENT_SESSIONS,
    socketIdleTimeoutMs: SOCKET_IDLE_TIMEOUT_MS,
    clientRegistry,
    eventLogger,
    onMessage: handleApiMessage,
    onParseError: handleParseError,
    onConnectionChange,
    getTotalConnections,
    encodeFrame,
    encodeFrameRaw,
    normalizeRemoteAddress
  })
);
servers.push(
  createTcpServer({
    port: ENV_PORTS.STATE,
    bindHost: BIND_HOST,
    label: 'state',
    allowedApis: allowedStateApis,
    maxBodyLength: MAX_BODY_LENGTH,
    strictStartMark: true,
    maxConnections: MAX_CONNECTIONS,
    maxConnectionsPerClient: MAX_CONNECTIONS_PER_CLIENT,
    maxClientSessions: MAX_CLIENT_SESSIONS,
    socketIdleTimeoutMs: SOCKET_IDLE_TIMEOUT_MS,
    clientRegistry,
    eventLogger,
    onMessage: handleApiMessage,
    onParseError: handleParseError,
    onConnectionChange,
    getTotalConnections,
    encodeFrame,
    encodeFrameRaw,
    normalizeRemoteAddress
  })
);
servers.push(
  createTcpServer({
    port: ENV_PORTS.CTRL,
    bindHost: BIND_HOST,
    label: 'ctrl',
    allowedApis: allowedCtrlApis,
    maxBodyLength: MAX_BODY_LENGTH,
    strictStartMark: true,
    maxConnections: MAX_CONNECTIONS,
    maxConnectionsPerClient: MAX_CONNECTIONS_PER_CLIENT,
    maxClientSessions: MAX_CLIENT_SESSIONS,
    socketIdleTimeoutMs: SOCKET_IDLE_TIMEOUT_MS,
    clientRegistry,
    eventLogger,
    onMessage: handleApiMessage,
    onParseError: handleParseError,
    onConnectionChange,
    getTotalConnections,
    encodeFrame,
    encodeFrameRaw,
    normalizeRemoteAddress
  })
);
servers.push(
  createTcpServer({
    port: ENV_PORTS.TASK,
    bindHost: BIND_HOST,
    label: 'task',
    allowedApis: allowedTaskApis,
    maxBodyLength: MAX_BODY_LENGTH,
    strictStartMark: true,
    maxConnections: MAX_CONNECTIONS,
    maxConnectionsPerClient: MAX_CONNECTIONS_PER_CLIENT,
    maxClientSessions: MAX_CLIENT_SESSIONS,
    socketIdleTimeoutMs: SOCKET_IDLE_TIMEOUT_MS,
    clientRegistry,
    eventLogger,
    onMessage: handleApiMessage,
    onParseError: handleParseError,
    onConnectionChange,
    getTotalConnections,
    encodeFrame,
    encodeFrameRaw,
    normalizeRemoteAddress
  })
);
servers.push(
  createTcpServer({
    port: ENV_PORTS.KERNEL,
    bindHost: BIND_HOST,
    label: 'kernel',
    allowedApis: allowedKernelApis,
    maxBodyLength: MAX_BODY_LENGTH,
    strictStartMark: true,
    maxConnections: MAX_CONNECTIONS,
    maxConnectionsPerClient: MAX_CONNECTIONS_PER_CLIENT,
    maxClientSessions: MAX_CLIENT_SESSIONS,
    socketIdleTimeoutMs: SOCKET_IDLE_TIMEOUT_MS,
    clientRegistry,
    eventLogger,
    onMessage: handleApiMessage,
    onParseError: handleParseError,
    onConnectionChange,
    getTotalConnections,
    encodeFrame,
    encodeFrameRaw,
    normalizeRemoteAddress
  })
);
servers.push(
  createTcpServer({
    port: ENV_PORTS.OTHER,
    bindHost: BIND_HOST,
    label: 'other',
    allowedApis: allowedOtherApis,
    maxBodyLength: MAX_BODY_LENGTH,
    strictStartMark: true,
    maxConnections: MAX_CONNECTIONS,
    maxConnectionsPerClient: MAX_CONNECTIONS_PER_CLIENT,
    maxClientSessions: MAX_CLIENT_SESSIONS,
    socketIdleTimeoutMs: SOCKET_IDLE_TIMEOUT_MS,
    clientRegistry,
    eventLogger,
    onMessage: handleApiMessage,
    onParseError: handleParseError,
    onConnectionChange,
    getTotalConnections,
    encodeFrame,
    encodeFrameRaw,
    normalizeRemoteAddress
  })
);
servers.push(
  createTcpServer({
    port: ENV_PORTS.CONFIG,
    bindHost: BIND_HOST,
    label: 'config',
    allowedApis: allowedConfigApis,
    maxBodyLength: MAX_BODY_LENGTH,
    strictStartMark: true,
    maxConnections: MAX_CONNECTIONS,
    maxConnectionsPerClient: MAX_CONNECTIONS_PER_CLIENT,
    maxClientSessions: MAX_CLIENT_SESSIONS,
    socketIdleTimeoutMs: SOCKET_IDLE_TIMEOUT_MS,
    clientRegistry,
    eventLogger,
    onMessage: handleApiMessage,
    onParseError: handleParseError,
    onConnectionChange,
    getTotalConnections,
    encodeFrame,
    encodeFrameRaw,
    normalizeRemoteAddress
  })
);
servers.push(
  createPushServer({
    port: ENV_PORTS.PUSH,
    bindHost: BIND_HOST,
    maxBodyLength: MAX_BODY_LENGTH,
    strictStartMark: true,
    maxConnections: MAX_CONNECTIONS,
    maxPushConnections: MAX_PUSH_CONNECTIONS,
    maxConnectionsPerClient: MAX_CONNECTIONS_PER_CLIENT,
    maxClientSessions: MAX_CLIENT_SESSIONS,
    socketIdleTimeoutMs: SOCKET_IDLE_TIMEOUT_MS,
    clientRegistry,
    eventLogger,
    pushConnections,
    onConnectionChange,
    normalizeRemoteAddress,
    getTotalConnections,
    encodeFrame,
    apiNo: API.robot_push_config_req,
    buildErrorResponse,
    buildBaseResponse,
    applyPushConfig,
    startPushTimer,
    createConnection: () => ({
      socket: null,
      intervalMs: pushDefaults.intervalMs,
      includedFields: cloneFieldList(pushDefaults.includedFields),
      excludedFields: cloneFieldList(pushDefaults.excludedFields),
      timer: null,
      trimmed: false,
      trimNoticeLogged: false
    })
  })
);
httpStub = startHttpStub({
  onSetOrder: handleHttpSetOrder,
  onAddObstacle: handleHttpAddObstacle,
  onClearObstacles: handleHttpClearObstacles,
  onListObstacles: handleHttpListObstacles,
  onSetBlocked: handleHttpSetBlocked,
  onRobotsStatus: buildRobotsStatusResponse
});
adminServer = startAdminServer({
  host: ADMIN_HTTP_HOST,
  port: ADMIN_HTTP_PORT,
  getHealth: () => ({ ok: true, time: nowMs() }),
  getMetrics: () => ({
    clients: clientRegistry.sessions.size,
    connections: totalConnections,
    pushConnections: pushConnections.size,
    lockOwner: controlArbiter ? controlArbiter.getOwner() : null
  }),
  getTime: () => simClock.now(),
  setTime: (value) => simClock.setNow(value)
});

console.log(`robokit-robot-sim using graph: ${GRAPH_PATH}`);
console.log(`robokit-robot-sim start node: ${robot.currentStation}`);
if (robotConfigInfo) {
  console.log(`robokit-robot-sim robot config: ${robotConfigInfo.path}`);
}
