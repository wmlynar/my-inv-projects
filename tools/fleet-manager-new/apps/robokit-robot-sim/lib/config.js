const path = require('path');

function parseEnvNumber(key, fallback, fn = Number.parseFloat) {
  const raw = process.env[key];
  const parsed = fn(String(raw || '').trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseEnvBool(key, fallback = false) {
  const raw = process.env[key];
  if (raw === undefined) {
    return fallback;
  }
  const text = String(raw).trim().toLowerCase();
  if (text === 'false' || text === '0' || text === '') return false;
  if (text === 'true' || text === '1') return true;
  return fallback;
}

function parseEnvString(key, fallback = '') {
  const raw = process.env[key];
  if (raw === undefined || raw === null) {
    return fallback;
  }
  return String(raw);
}

function makeList(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const DEFAULT_MAPS_DIR = path.resolve(__dirname, '..', '..', '..', 'maps');
const MAPS_DIR = parseEnvString('MAPS_DIR', DEFAULT_MAPS_DIR);
const MAP_NAME = parseEnvString('MAP_NAME', '');

function resolveStartNodeId() {
  const raw =
    process.env.START_NODE_ID ||
    process.env.START_NODE ||
    process.env.START_STATION ||
    process.env.START_LOCATION ||
    '';
  return raw ? String(raw).trim() : '';
}

function normalizePath(value) {
  if (!value) return '';
  return path.isAbsolute(value) ? value : path.resolve(value);
}

function resolveGraphPath() {
  if (process.env.GRAPH_PATH) {
    return parseEnvString('GRAPH_PATH', path.resolve(MAPS_DIR, 'sanden_smalll.smap'));
  }
  if (process.env.MAP_PATH) {
    return normalizePath(parseEnvString('MAP_PATH', ''));
  }
  if (MAP_NAME) {
    const fileName = MAP_NAME.toLowerCase().endsWith('.smap') ? MAP_NAME : `${MAP_NAME}.smap`;
    return path.isAbsolute(fileName) ? fileName : path.resolve(MAPS_DIR, fileName);
  }
  return path.resolve(MAPS_DIR, 'sanden_smalll.smap');
}

const PORTS = {
  ROBOD: parseEnvNumber('ROBOD_PORT', 19200, Number.parseInt),
  STATE: parseEnvNumber('STATE_PORT', 19204, Number.parseInt),
  CTRL: parseEnvNumber('CTRL_PORT', 19205, Number.parseInt),
  TASK: parseEnvNumber('TASK_PORT', 19206, Number.parseInt),
  CONFIG: parseEnvNumber('CONFIG_PORT', 19207, Number.parseInt),
  KERNEL: parseEnvNumber('KERNEL_PORT', 19208, Number.parseInt),
  OTHER: parseEnvNumber('OTHER_PORT', 19210, Number.parseInt),
  PUSH: parseEnvNumber('PUSH_PORT', 19301, Number.parseInt)
};

const START_NODE_ID = resolveStartNodeId();

const config = {
  MAPS_DIR,
  MAP_NAME,
  GRAPH_PATH: resolveGraphPath(),
  ROBOKIT_TRAFFIC_STRATEGY: parseEnvString('ROBOKIT_TRAFFIC_STRATEGY', 'pulse-mapf-time'),
  PORTS,
  BIND_HOST: parseEnvString('BIND_HOST', ''),
  ROBOT_ID: parseEnvString('ROBOT_ID', '15148594'),
  ROBOT_MODEL: parseEnvString('ROBOT_MODEL', 'EFORK-CPD20-Y'),
  ROBOT_VERSION: parseEnvString('ROBOT_VERSION', 'v3.4.7.2000'),
  ROBOT_MODEL_MD5: parseEnvString('ROBOT_MODEL_MD5', '775743e852ce32d39c997b79e673c5de'),
  ROBOT_PRODUCT: parseEnvString('ROBOT_PRODUCT', ''),
  ROBOT_NOTE: parseEnvString('ROBOT_NOTE', ''),
  ROBOT_VEHICLE_ID: parseEnvString('ROBOT_VEHICLE_ID', 'AMB-01'),
  ROBOT_ARCH: parseEnvString('ROBOT_ARCH', 'arm64'),
  ROBOT_DSP_VERSION: parseEnvString('ROBOT_DSP_VERSION', 'v2.0.4.0v6'),
  ROBOT_GYRO_VERSION: parseEnvString('ROBOT_GYRO_VERSION', 'v2.1.3-RC1-e507de4-2025-03-05 10:56:13'),
  ROBOT_ECHOID: parseEnvString('ROBOT_ECHOID', '751d45ae-f5057dc6-b4ae47fd-40e0acf8'),
  ROBOT_ECHOID_TYPE: parseEnvString('ROBOT_ECHOID_TYPE', ''),
  ROBOT_IP: parseEnvString('ROBOT_IP', '192.168.3.133'),
  ROBOT_MAC: parseEnvString('ROBOT_MAC', '00142DE72632'),
  ROBOT_WLAN_MAC: parseEnvString('ROBOT_WLAN_MAC', ''),
  ROBOT_MODEL_VERSION: parseEnvString('ROBOT_MODEL_VERSION', 'v3.0.2'),
  ROBOT_MAP_VERSION: parseEnvString('ROBOT_MAP_VERSION', 'v1.0.7'),
  ROBOT_MODBUS_VERSION: parseEnvString('ROBOT_MODBUS_VERSION', 'v2.1.0'),
  ROBOT_NET_PROTOCOL_VERSION: parseEnvString('ROBOT_NET_PROTOCOL_VERSION', 'v3.0.0'),
  ROBOT_SAFE_MODEL_MD5: parseEnvString('ROBOT_SAFE_MODEL_MD5', '19f38a9ee91fd9908d60fec217342293'),
  ROBOT_CALIBRATED: parseEnvBool('ROBOT_CALIBRATED', false),
  ROBOT_MOTOR_NAMES: makeList(
    parseEnvString('ROBOT_MOTOR_NAMES', parseEnvString('ROBOKIT_MOTOR_NAMES', 'walk,steer,linear'))
  ),
  ROBOSHOP_MIN_VERSION_REQUIRED: parseEnvString('ROBOSHOP_MIN_VERSION_REQUIRED', 'v2.4.2.0'),
  ROBOT_TIMEZONE_OFFSET: parseEnvString('ROBOT_TIMEZONE_OFFSET', ''),
  ROBOT_FILE_ROOTS: makeList(
    parseEnvString('ROBOT_FILE_ROOTS', path.resolve(__dirname, '..', 'data'))
  ),
  ROBOT_PARAMS_PATH: parseEnvString(
    'ROBOT_PARAMS_PATH',
    parseEnvString(
      'RDS_PARAMS_PATH',
      path.resolve(__dirname, '..', 'data', 'robot_params.json')
    )
  ),
  ROBOT_DEVICE_TYPES_PATH: parseEnvString(
    'ROBOT_DEVICE_TYPES_PATH',
    parseEnvString(
      'RDS_DEVICE_TYPES_PATH',
      path.resolve(__dirname, '..', 'data', 'device_types_full.json')
    )
  ),
  ROBOT_DEVICE_TYPES_EXT_PATH: parseEnvString(
    'ROBOT_DEVICE_TYPES_EXT_PATH',
    path.resolve(__dirname, '..', 'data', 'device_types_ext.json')
  ),
  ROBOT_DEVICE_TYPES_MODULE_PATH: parseEnvString(
    'ROBOT_DEVICE_TYPES_MODULE_PATH',
    path.resolve(__dirname, '..', 'data', 'device_types_module.json')
  ),
  ROBOT_FILE_LIST_PATH: parseEnvString(
    'ROBOT_FILE_LIST_PATH',
    path.resolve(__dirname, '..', 'data', 'file_list_assets.json')
  ),
  ROBOT_FILE_LIST_MODULES_PATH: parseEnvString(
    'ROBOT_FILE_LIST_MODULES_PATH',
    path.resolve(__dirname, '..', 'data', 'file_list_modules.json')
  ),
  ROBOT_MAP_PROPERTIES_PATH: parseEnvString(
    'ROBOT_MAP_PROPERTIES_PATH',
    path.resolve(__dirname, '..', 'data', 'map_properties.json')
  ),
  ROBOT_CONFIG_MAP_PATH: parseEnvString(
    'ROBOT_CONFIG_MAP_PATH',
    path.resolve(__dirname, '..', 'data', 'config_map_data.json')
  ),
  RDS_PARAMS_PATH: parseEnvString(
    'RDS_PARAMS_PATH',
    path.resolve(__dirname, '..', 'data', 'robot_params.json')
  ),
  RDS_DEVICE_TYPES_PATH: parseEnvString(
    'RDS_DEVICE_TYPES_PATH',
    path.resolve(__dirname, '..', 'data', 'device_types_full.json')
  ),
  START_NODE_ID,
  START_POSE_X: parseEnvNumber('START_POSE_X', Number.NaN),
  START_POSE_Y: parseEnvNumber('START_POSE_Y', Number.NaN),
  START_POSE_ANGLE: parseEnvNumber('START_POSE_ANGLE', Number.NaN),
  START_FORK_HEIGHT: parseEnvNumber('START_FORK_HEIGHT', Number.NaN),
  APPROACH_MERGE_DIST: parseEnvNumber('APPROACH_MERGE_DIST', 1),
  APPROACH_CONTROL_SCALE: parseEnvNumber('APPROACH_CONTROL_SCALE', 0.5),
  APPROACH_TURN_PENALTY: parseEnvNumber('APPROACH_TURN_PENALTY', 0.6),
  APPROACH_REVERSE_PENALTY: parseEnvNumber('APPROACH_REVERSE_PENALTY', 3),
  APPROACH_SAMPLE_STEP: parseEnvNumber('APPROACH_SAMPLE_STEP', 0.2),
  IDLE_CURRENT_A: parseEnvNumber('IDLE_CURRENT_A', -2.2),
  IDLE_VOLTAGE_V: parseEnvNumber('IDLE_VOLTAGE_V', 48.4),
  AUTO_CHARGE_DELAY_MS: parseEnvNumber('AUTO_CHARGE_DELAY_MS', 9000, Number.parseInt),
  CHARGE_START_CURRENT_A: parseEnvNumber('CHARGE_START_CURRENT_A', Number.NaN),
  CHARGE_START_HOLD_MS: parseEnvNumber('CHARGE_START_HOLD_MS', 0, Number.parseInt),
  CHARGE_CURRENT_A: parseEnvNumber('CHARGE_CURRENT_A', 56),
  CHARGE_CURRENT_RAMP_A_S: parseEnvNumber('CHARGE_CURRENT_RAMP_A_S', 7.5),
  CHARGE_VOLTAGE_V: parseEnvNumber('CHARGE_VOLTAGE_V', 48.7),
  CHARGE_VOLTAGE_RAMP_V_S: parseEnvNumber('CHARGE_VOLTAGE_RAMP_V_S', 0.03),
  MAX_CHARGE_CURRENT_A: parseEnvNumber('MAX_CHARGE_CURRENT_A', 157.5),
  MAX_CHARGE_VOLTAGE_V: parseEnvNumber('MAX_CHARGE_VOLTAGE_V', 58.4),
  TICK_MS: parseEnvNumber('TICK_MS', 200, Number.parseInt),
  RELOC_MS: parseEnvNumber('RELOC_MS', 500, Number.parseInt),
  SPEED_M_S: parseEnvNumber('SPEED_M_S', 0.6),
  ACCEL_M_S2: parseEnvNumber('ACCEL_M_S2', 0.6),
  DECEL_M_S2: parseEnvNumber('DECEL_M_S2', 0.9),
  ARRIVAL_EPS: parseEnvNumber('ARRIVAL_EPS', 0.05),
  CURRENT_POINT_DIST: parseEnvNumber('CURRENT_POINT_DIST', 0.3),
  ROTATE_SPEED_RAD_S: parseEnvNumber('ROTATE_SPEED_RAD_S', 1.2),
  ROT_ACCEL_RAD_S2: parseEnvNumber('ROT_ACCEL_RAD_S2', 2.4),
  ROT_DECEL_RAD_S2: parseEnvNumber('ROT_DECEL_RAD_S2', 3.2),
  ROTATE_EPS_RAD: parseEnvNumber('ROTATE_EPS_RAD', 0.03),
  WHEELBASE_M: parseEnvNumber('WHEELBASE_M', 1.1),
  ROBOT_RADIUS_M: parseEnvNumber('ROBOT_RADIUS_M', 0.6),
  ROBOT_MODEL_HEAD_M: parseEnvNumber('ROBOT_MODEL_HEAD_M', 0),
  ROBOT_MODEL_TAIL_M: parseEnvNumber('ROBOT_MODEL_TAIL_M', 0),
  ROBOT_MODEL_WIDTH_M: parseEnvNumber('ROBOT_MODEL_WIDTH_M', 0),
  PATH_SAMPLE_STEP: parseEnvNumber('PATH_SAMPLE_STEP', 0.2),
  PATH_MIN_SAMPLES: parseEnvNumber('PATH_MIN_SAMPLES', 12, Number.parseInt),
  PATH_MAX_SAMPLES: parseEnvNumber('PATH_MAX_SAMPLES', 120, Number.parseInt),
  LINE_MATCH_MAX_DIST: parseEnvNumber('LINE_MATCH_MAX_DIST', 0.6),
  LINE_MATCH_ANGLE_DEG: parseEnvNumber('LINE_MATCH_ANGLE_DEG', 30),
  MAX_BODY_LENGTH: parseEnvNumber('MAX_BODY_LENGTH', 1048576, Number.parseInt),
  PUSH_MIN_INTERVAL_MS: parseEnvNumber('PUSH_MIN_INTERVAL_MS', 200, Number.parseInt),
  FORK_SPEED_M_S: parseEnvNumber('FORK_SPEED_M_S', 0.05),
  FORK_ACCEL_M_S2: parseEnvNumber('FORK_ACCEL_M_S2', 0.15),
  FORK_EPS: parseEnvNumber('FORK_EPS', 0.003),
  FORK_TASK_DELAY_MS: parseEnvNumber('FORK_TASK_DELAY_MS', 600, Number.parseInt),
  FORK_MIN_HEIGHT: parseEnvNumber('FORK_MIN_HEIGHT', 0.058),
  FORK_MAX_HEIGHT: parseEnvNumber('FORK_MAX_HEIGHT', 1.2),
  OBSTACLE_RADIUS_M: parseEnvNumber('OBSTACLE_RADIUS_M', 0.8),
  OBSTACLE_CLEARANCE_M: parseEnvNumber('OBSTACLE_CLEARANCE_M', 0.25),
  OBSTACLE_LOOKAHEAD_M: parseEnvNumber('OBSTACLE_LOOKAHEAD_M', 2.2),
  OBSTACLE_AVOID_ENABLED: parseEnvBool('OBSTACLE_AVOID_ENABLED', true),
  BLOCK_REASON_OBSTACLE: parseEnvNumber('BLOCK_REASON_OBSTACLE', 1001, Number.parseInt),
  BLOCK_REASON_MANUAL: parseEnvNumber('BLOCK_REASON_MANUAL', 1000, Number.parseInt),
  STATUS_HIDE_CURRENT_STATION: parseEnvBool('STATUS_HIDE_CURRENT_STATION', false),
  STATUS_FORCE_CURRENT_STATION: parseEnvString('STATUS_FORCE_CURRENT_STATION', ''),
  STATUS_HIDE_LAST_STATION: parseEnvBool('STATUS_HIDE_LAST_STATION', false),
  STATUS_HIDE_POSE: parseEnvBool('STATUS_HIDE_POSE', false),
  STATUS_LAST_STATION_IS_CURRENT: parseEnvBool('STATUS_LAST_STATION_IS_CURRENT', false),
  SIM_TIME_MODE: parseEnvString('SIM_TIME_MODE', 'real'),
  SIM_TIME_START_MS: parseEnvNumber('SIM_TIME_START_MS', Number.NaN, Number.parseInt),
  SIM_TIME_STEP_MS: parseEnvNumber('SIM_TIME_STEP_MS', Number.NaN, Number.parseInt),
  EVENT_LOG_PATH: parseEnvString('EVENT_LOG_PATH', ''),
  EVENT_LOG_STDOUT: parseEnvBool('EVENT_LOG_STDOUT', false),
  ADMIN_HTTP_PORT: parseEnvNumber('ADMIN_HTTP_PORT', 0, Number.parseInt),
  ADMIN_HTTP_HOST: parseEnvString('ADMIN_HTTP_HOST', '127.0.0.1'),
  PRINT_EFFECTIVE_CONFIG: parseEnvBool('PRINT_EFFECTIVE_CONFIG', false),
  CLIENT_ID_STRATEGY: parseEnvString('CLIENT_ID_STRATEGY', 'ip'),
  CLIENT_TTL_MS: parseEnvNumber('CLIENT_TTL_MS', 10000, Number.parseInt),
  CLIENT_IDLE_MS: parseEnvNumber('CLIENT_IDLE_MS', 60000, Number.parseInt),
  LOCK_RELEASE_ON_DISCONNECT: parseEnvBool('LOCK_RELEASE_ON_DISCONNECT', true),
  LOCK_TTL_MS: parseEnvNumber('LOCK_TTL_MS', 0, Number.parseInt),
  STRICT_UNLOCK: parseEnvBool('STRICT_UNLOCK', false),
  REQUIRE_LOCK_FOR_CONTROL: parseEnvBool('REQUIRE_LOCK_FOR_CONTROL', true),
  REQUIRE_LOCK_FOR_NAV: parseEnvBool('REQUIRE_LOCK_FOR_NAV', true),
  REQUIRE_LOCK_FOR_FORK: parseEnvBool('REQUIRE_LOCK_FOR_FORK', true),
  SOCKET_IDLE_TIMEOUT_MS: parseEnvNumber('SOCKET_IDLE_TIMEOUT_MS', 0, Number.parseInt),
  MAX_CONNECTIONS: parseEnvNumber('MAX_CONNECTIONS', 0, Number.parseInt),
  MAX_CONNECTIONS_PER_CLIENT: parseEnvNumber('MAX_CONNECTIONS_PER_CLIENT', 0, Number.parseInt),
  MAX_CLIENT_SESSIONS: parseEnvNumber('MAX_CLIENT_SESSIONS', 0, Number.parseInt),
  PUSH_MAX_INTERVAL_MS: parseEnvNumber('PUSH_MAX_INTERVAL_MS', 10000, Number.parseInt),
  PUSH_MAX_QUEUE_BYTES: parseEnvNumber('PUSH_MAX_QUEUE_BYTES', 1048576, Number.parseInt),
  MAX_PUSH_CONNECTIONS: parseEnvNumber('MAX_PUSH_CONNECTIONS', 0, Number.parseInt),
  MAX_TASK_NODES: parseEnvNumber('MAX_TASK_NODES', 0, Number.parseInt),
  USE_CORE_SIM: false
};

module.exports = config;
