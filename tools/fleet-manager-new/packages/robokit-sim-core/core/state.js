function clampBattery(value) {
  return Math.max(1, Math.min(100, value));
}

function batteryRatio(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value > 1) {
    return Math.max(0, Math.min(value / 100, 1));
  }
  return Math.max(0, Math.min(value, 1));
}

function createScriptPathState(constants = {}) {
  const {
    ARRIVAL_EPS = 0.05,
    ROTATE_EPS_RAD = 0.03,
    SPEED_M_S = 0.6,
    ROTATE_SPEED_RAD_S = 1.2
  } = constants;
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

function createMotorStates(names) {
  const list = Array.isArray(names) && names.length > 0 ? names : ['drive'];
  return list.map((name) => ({ motor_name: name, position: 0, speed: 0 }));
}

function createRobotState(options = {}) {
  const {
    startNodeId,
    poseOverride,
    nodesById,
    mapInfo,
    mapEntries,
    config,
    motorNames,
    forkHeight,
    nowMs,
    cloneGoodsRegion,
    emptyGoodsRegion,
    defaultLockType
  } = options;
  if (!config) {
    throw new Error('robot_state: missing config');
  }
  const node = nodesById && startNodeId ? nodesById.get(startNodeId) : null;
  const pos = node && node.pos ? node.pos : { x: 0, y: 0 };
  const pose =
    poseOverride && Number.isFinite(poseOverride.x) && Number.isFinite(poseOverride.y) ? poseOverride : pos;
  const angle = poseOverride && Number.isFinite(poseOverride.angle) ? poseOverride.angle : 0;
  const timeNow = typeof nowMs === 'function' ? nowMs() : Date.now();
  const constants = {
    ARRIVAL_EPS: config.ARRIVAL_EPS,
    ROTATE_EPS_RAD: config.ROTATE_EPS_RAD,
    SPEED_M_S: config.SPEED_M_S,
    ROTATE_SPEED_RAD_S: config.ROTATE_SPEED_RAD_S
  };
  return {
    id: config.ROBOT_ID,
    model: config.ROBOT_MODEL,
    version: config.ROBOT_VERSION,
    modelVersion: config.ROBOT_MODEL_VERSION,
    mapVersion: config.ROBOT_MAP_VERSION,
    modbusVersion: config.ROBOT_MODBUS_VERSION,
    netProtocolVersion: config.ROBOT_NET_PROTOCOL_VERSION,
    safeModelMd5: config.ROBOT_SAFE_MODEL_MD5,
    calibrated: config.ROBOT_CALIBRATED,
    versionList: config.ROBOT_VERSION_LIST,
    networkControllers: config.ROBOT_NETWORK_CONTROLLERS,
    hardware: config.ROBOT_HARDWARE,
    mac: config.ROBOT_MAC,
    wlanMac: config.ROBOT_WLAN_MAC,
    currentIp: config.ROBOT_IP || '127.0.0.1',
    currentMap: (mapInfo && mapInfo.name) || '',
    currentMapMd5: (mapInfo && mapInfo.md5) || '',
    currentMapEntries: mapEntries || [],
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
    voltage: config.IDLE_VOLTAGE_V,
    current: config.IDLE_CURRENT_A,
    requestVoltage: 0,
    requestCurrent: 0,
    batteryCycle: 0,
    charging: false,
    chargeTargetId: null,
    chargeEngageAt: null,
    chargeActiveAt: null,
    odo: 0,
    todayOdo: 0,
    bootAt: timeNow,
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
      height: Number.isFinite(forkHeight) ? forkHeight : 0,
      targetHeight: Number.isFinite(forkHeight) ? forkHeight : 0,
      speed: 0,
      heightInPlace: true,
      autoFlag: true,
      forwardVal: Number.isFinite(forkHeight) ? forkHeight : 0,
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
    scriptPath: createScriptPathState(constants),
    containers: [],
    goods: { hasGoods: false, shape: null },
    goodsRegion: cloneGoodsRegion ? cloneGoodsRegion(emptyGoodsRegion) : { name: '', point: [] },
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
      type: Number.isFinite(defaultLockType) ? defaultLockType : 2,
      desc: ''
    },
    lockRequest: null,
    currentStation: startNodeId || '',
    reportedStationId: startNodeId || '',
    lastStation: startNodeId || '',
    homeStation: startNodeId || null,
    relocStatus: 1,
    relocCompleteAt: null,
    taskStatus: 0,
    taskType: 0,
    paused: false,
    currentTask: null,
    lastTask: null,
    state: 'idle',
    stateChangedAt: timeNow,
    updatedAt: timeNow
  };
}

module.exports = {
  batteryRatio,
  clampBattery,
  createRobotState,
  createScriptPathState,
  createMotorStates
};
