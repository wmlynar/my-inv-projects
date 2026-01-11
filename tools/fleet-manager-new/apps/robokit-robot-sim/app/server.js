const fs = require('fs');
const path = require('path');
const MotionKernel = require('../../../packages/robokit-lib/motion_kernel');
const config = require('./config');
const {
  DEFAULT_LOCK_TYPE,
  FORK_TASK_TYPE,
  EMPTY_GOODS_REGION,
  LOADED_GOODS_REGION,
  ROBOT_FEATURES,
  ROBOT_VERSION_LIST,
  ROBOT_NETWORK_CONTROLLERS,
  ROBOT_HARDWARE
} = require('./robot_defaults');
const { createMapContext } = require('./map_context');
const { ControlArbiter } = require('./control_arbiter');
const { ClientRegistry } = require('./client_registry');
const { EventLogger, createStateMachine } = require('../../../packages/robokit-sim-core/core/events');
const { createForkController } = require('../../../packages/robokit-sim-core/core/fork');
const { createObstacleManager } = require('../../../packages/robokit-sim-core/core/obstacles');
const { createChargeController } = require('../../../packages/robokit-sim-core/core/charge');
const {
  createRobotState,
  createScriptPathState,
  batteryRatio,
  clampBattery
} = require('../../../packages/robokit-sim-core/core/state');
const { createTaskEngine } = require('../../../packages/robokit-sim-core/core/task');
const { startRuntimeServers } = require('./runtime_servers');
const { createNavigation } = require('../../../packages/robokit-sim-core/core/navigation');
const { createSimClock, createRng } = require('../../../packages/robokit-sim-core/core/clock_rng');
const { CommandCache } = require('../../../packages/robokit-protocol/protocol/command_cache');
const { createControlPolicy } = require('../../../packages/robokit-protocol/protocol/policy');
const { idempotentApis } = require('../../../packages/robokit-protocol/protocol/api_map');
const { createRuntimeHelpers } = require('./runtime_helpers');
const { createRuntimeHandlers, createHttpHandlers } = require('./runtime_handlers');
const { createStatusBuilder, createPushBuilder } = require('./views');

const {
  clamp,
  normalizeAngle,
  toRad,
  distancePointToSegmentCoords,
  unitVector,
  sampleBezierPoints,
  buildPolyline,
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
const diagEnabled = DIAG_LOG;
const robotRef = { current: null };
const runtimeRefs = {
  isStopped: () => false,
  segmentPoseAtDistance: null,
  createTaskWithPath: null,
  handleCancelTask: null
};
const clientRegistryRef = { current: null };
const controlArbiterRef = { current: null };

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_err) {
    return null;
  }
}

const mapContext = createMapContext({
  graphPath: GRAPH_PATH,
  robotConfigPath: ROBOT_CONFIG_PATH,
  robotFileRoots: ROBOT_FILE_ROOTS,
  robotId: ROBOT_ID
});
const { graph, mapInfo, mapEntries, fileRoots, chargeStationIds, robotConfigInfo, robotConfigEntry } = mapContext;
const statusAllTemplate = readJsonSafe(path.resolve(__dirname, 'data', 'status_all_template.json'));
const motorNames = ROBOT_MOTOR_NAMES;
const robotParamsPayload = readJsonSafe(ROBOT_PARAMS_PATH);
const deviceTypesPayloadFull = readJsonSafe(ROBOT_DEVICE_TYPES_PATH);
const deviceTypesPayloadExt = readJsonSafe(ROBOT_DEVICE_TYPES_EXT_PATH);
const deviceTypesPayloadModule = readJsonSafe(ROBOT_DEVICE_TYPES_MODULE_PATH);
const fileListAssetsPayload = readJsonSafe(ROBOT_FILE_LIST_PATH);
const fileListModulesPayload = readJsonSafe(ROBOT_FILE_LIST_MODULES_PATH);
const mapPropertiesPayload = readJsonSafe(ROBOT_MAP_PROPERTIES_PATH);
const configMapDataPayload = readJsonSafe(ROBOT_CONFIG_MAP_PATH);

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
const runtimeHelpers = createRuntimeHelpers({
  simClock,
  eventLogger,
  diagEnabled,
  robotRef,
  graph,
  nodesById,
  edgesByKey,
  findNearestNode,
  findNearestNodeFromIds,
  findPath,
  computeDistancesToTarget,
  createScriptPathState,
  motion: {
    clamp,
    normalizeAngle,
    distancePointToSegmentCoords,
    sampleBezierPoints,
    buildPolyline,
    polylineAtDistance
  },
  constants: {
    ROBOT_TIMEZONE_OFFSET,
    APPROACH_MERGE_DIST,
    APPROACH_CONTROL_SCALE,
    APPROACH_TURN_PENALTY,
    APPROACH_REVERSE_PENALTY,
    APPROACH_SAMPLE_STEP,
    SPEED_M_S,
    ARRIVAL_EPS,
    ROTATE_EPS_RAD,
    ROTATE_SPEED_RAD_S,
    CURRENT_POINT_DIST,
    ROBOT_RADIUS_M,
    STATUS_FORCE_CURRENT_STATION,
    STATUS_HIDE_CURRENT_STATION,
    STATUS_HIDE_LAST_STATION,
    STATUS_LAST_STATION_IS_CURRENT,
    START_POSE_X,
    START_POSE_Y,
    START_POSE_ANGLE,
    FORK_MIN_HEIGHT,
    FORK_MAX_HEIGHT,
    TICK_MS
  },
  payloads: {
    statusAllTemplate,
    robotParamsPayload,
    fileListAssetsPayload,
    fileListModulesPayload,
    mapPropertiesPayload
  },
  runtimeRefs
});

const {
  nowMs,
  lockTimeSeconds,
  diagLog,
  normalizeRemoteAddress,
  createOn,
  cloneJson,
  cloneGoodsRegion,
  approachValue,
  clampForkHeight,
  resolveStartPoseOverride,
  resolveStartPose,
  resolveStartNode,
  getReportedCurrentStation,
  getReportedLastStation,
  startApproachToTarget,
  getReportedPose
} = runtimeHelpers;

const startPoseOverride = resolveStartPoseOverride();
const startPoseFromConfig = resolveStartPose(robotConfigEntry);
const startPose = startPoseOverride || startPoseFromConfig;
const startNodeId = resolveStartNode(
  START_NODE_ID,
  robotConfigEntry,
  startPoseOverride,
  startPoseFromConfig
);
const forkHeight = Number.isFinite(START_FORK_HEIGHT) ? clampForkHeight(START_FORK_HEIGHT) : 0;
const robotConfigRuntime = {
  ...config,
  ROBOT_VERSION_LIST,
  ROBOT_NETWORK_CONTROLLERS,
  ROBOT_HARDWARE
};
const robot = createRobotState({
  startNodeId,
  poseOverride: startPose,
  nodesById,
  mapInfo,
  mapEntries,
  config: robotConfigRuntime,
  motorNames,
  forkHeight,
  nowMs,
  cloneGoodsRegion,
  emptyGoodsRegion: EMPTY_GOODS_REGION,
  defaultLockType: DEFAULT_LOCK_TYPE
});
robotRef.current = robot;
const chargeController = createChargeController({
  robot,
  chargeStationIds,
  approachValue,
  clampBattery,
  isStopped: () => runtimeRefs.isStopped(),
  constants: {
    AUTO_CHARGE_DELAY_MS,
    CHARGE_START_CURRENT_A,
    CHARGE_START_HOLD_MS,
    CHARGE_CURRENT_A,
    CHARGE_CURRENT_RAMP_A_S,
    CHARGE_VOLTAGE_V,
    CHARGE_VOLTAGE_RAMP_V_S,
    IDLE_CURRENT_A,
    IDLE_VOLTAGE_V
  }
});
const { setChargeTarget, updateCharging, applyOdo, isChargeStationId } = chargeController;
let taskEngine = null;
let forkController = null;
let addSimObstacle = () => ({ ok: false, error: 'obstacle_manager_unavailable' });
let clearSimObstacles = () => {};
let listSimObstacles = () => [];
let setRobotBlockedState = () => {};
let shouldBlockForObstacle = () => null;
let segmentPoseAtDistance = (segment, distance) => {
  if (!segment || !segment.polyline) {
    return { x: robot.pose.x, y: robot.pose.y, heading: robot.pose.angle };
  }
  const base = polylineAtDistance(segment.polyline, distance);
  return { x: base.x, y: base.y, heading: base.heading };
};
const getTaskPathsProxy = (task) =>
  taskEngine ? taskEngine.getTaskPaths(task) : { finished: [], unfinished: [] };
robot.rng = rng;
const stateMachine = createStateMachine({
  now: () => simClock.now(),
  onTransition: (entry) => diagLog('state_change', entry)
});
let taskCounter = 1;

let controlArbiter = null;
let clientRegistry = null;

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
  listSimObstacles: () => listSimObstacles(),
  getReportedPose,
  createOn,
  nowMs,
  batteryRatio,
  getTaskPaths: getTaskPathsProxy,
  getReportedCurrentStation,
  getReportedLastStation,
  isStopped: () => runtimeRefs.isStopped(),
  cloneJson,
  cloneGoodsRegion,
  config,
  ROBOT_FEATURES,
  DEFAULT_LOCK_TYPE
});

const {
  buildBaseResponse,
  buildErrorResponse,
  buildDiList,
  buildDoList
} = statusBuilder;

const runtimeHandlers = createRuntimeHandlers({
  robot,
  nodesById,
  findNearestNode,
  diagLog,
  buildBaseResponse,
  buildErrorResponse,
  setChargeTarget,
  nowMs,
  lockTimeSeconds,
  normalizeRemoteAddress,
  clientRegistryRef,
  controlArbiterRef,
  eventLogger,
  config,
  runtimeRefs
});
const {
  updateVelocity,
  resetVelocity,
  isStopped,
  clearManualControl,
  handleReloc,
  handleConfirmLoc,
  handleCancelReloc,
  handleStopControl,
  handleMotionControl,
  handleSoftEmc,
  handleConfigLock,
  handleConfigUnlock,
  handleSetDo,
  handleSetDoBatch,
  handleSetDi
} = runtimeHandlers;
runtimeRefs.isStopped = isStopped;

clientRegistry = new ClientRegistry({
  strategy: CLIENT_ID_STRATEGY,
  ttlMs: CLIENT_TTL_MS,
  idleMs: CLIENT_IDLE_MS,
  now: () => simClock.now(),
  onSessionExpired: (session) => {
    if (!LOCK_RELEASE_ON_DISCONNECT || !controlArbiterRef.current) {
      return;
    }
    if (controlArbiterRef.current.getOwner() === session.id) {
      clearManualControl();
      controlArbiterRef.current.release(session.id, 'disconnect');
    }
  }
});
clientRegistryRef.current = clientRegistry;

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
controlArbiterRef.current = controlArbiter;

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
runtimeRefs.createTaskWithPath = createTaskWithPath;
runtimeRefs.handleCancelTask = handleCancelTask;

const obstacleManager = createObstacleManager({
  robot,
  nodesById,
  edgesByKey,
  adjacency,
  findPath,
  rebuildTaskPath,
  clamp,
  normalizeAngle,
  distancePointToSegmentCoords,
  unitVector,
  polylineAtDistance,
  CURRENT_POINT_DIST,
  ROBOT_RADIUS_M,
  OBSTACLE_RADIUS_M,
  OBSTACLE_CLEARANCE_M,
  OBSTACLE_LOOKAHEAD_M,
  OBSTACLE_AVOID_ENABLED,
  BLOCK_REASON_OBSTACLE,
  BLOCK_REASON_MANUAL
});
addSimObstacle = obstacleManager.addSimObstacle;
clearSimObstacles = obstacleManager.clearSimObstacles;
listSimObstacles = obstacleManager.listSimObstacles;
setRobotBlockedState = obstacleManager.setRobotBlockedState;
shouldBlockForObstacle = obstacleManager.shouldBlockForObstacle;
segmentPoseAtDistance = obstacleManager.segmentPoseAtDistance;
runtimeRefs.segmentPoseAtDistance = segmentPoseAtDistance;

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
  getReportedPose,
  isStopped,
  pushMaxFields: PUSH_MAX_FIELDS
});

const { buildPushPayload } = pushBuilder;

const httpHandlers = createHttpHandlers({
  robot,
  buildBaseResponse,
  buildErrorResponse,
  startMultiStationTask,
  taskEngine,
  addSimObstacle,
  clearSimObstacles,
  listSimObstacles,
  setRobotBlockedState,
  batteryRatio,
  getReportedPose,
  config,
  constants: {
    BLOCK_REASON_OBSTACLE
  }
});
const {
  handleHttpSetOrder,
  handleHttpAddObstacle,
  handleHttpClearObstacles,
  handleHttpListObstacles,
  buildRobotsStatusResponse,
  handleHttpSetBlocked
} = httpHandlers;

startRuntimeServers({
  robot,
  robotConfigInfo,
  graphPath: GRAPH_PATH,
  simClock,
  nowMs,
  diagLog,
  diagLogTickMs: DIAG_LOG_TICK_MS,
  diagTeleportThreshold: DIAG_TELEPORT_THRESHOLD_M,
  statusBuilder,
  runtimeHandlers,
  taskEngine,
  forkController,
  pushBuilder,
  httpHandlers,
  controlArbiter,
  controlPolicy,
  eventLogger,
  commandCache,
  idempotentApis,
  clientRegistry,
  normalizeRemoteAddress,
  config,
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
  simulationDeps: {
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
    maybeStartPendingFork
  },
  updateState: stateMachine.update
});
