const MotionKernel = require('../../../packages/robokit-lib/motion_kernel');

const DEFAULT_LOCK_TYPE = 2;

const METHOD_NAMES = [
  "__init__",
  "setDO",
  "setMotorSpeed",
  "setMotorPosition",
  "setLocalShelfArea",
  "resetMotor",
  "isAllMotorsReached",
  "isMotorReached",
  "isMotorPositionReached",
  "isMotorStop",
  "publishSpeed",
  "resetLocalShelfArea",
  "getMsg",
  "getCount",
  "odo",
  "loc",
  "navSpeed",
  "battery",
  "rfid",
  "magnetic",
  "Di",
  "Do",
  "pgv",
  "sound",
  "controller",
  "fork",
  "jack",
  "moveTask",
  "getArmInfo",
  "getDistanceSensor",
  "sensorPointCloud",
  "logInfo",
  "logWarn",
  "logError",
  "logDebug",
  "setError",
  "setUserError",
  "setPickRobotError",
  "setWarning",
  "setUserWarning",
  "setPickRobotWarning",
  "setNotice",
  "clearNotice",
  "noticeExits",
  "clearError",
  "clearWarning",
  "errorExits",
  "warningExits",
  "setPathOnRobot",
  "setPathOnWorld",
  "isPathReached",
  "goPath",
  "resetPath",
  "stopRobot",
  "setInfo",
  "getNextSpeed",
  "setNextSpeed",
  "speedDecomposition",
  "setPathReachDist",
  "setPathReachAngle",
  "setPathUseOdo",
  "setPathBackMode",
  "setPathMaxSpeed",
  "setPathMaxRot",
  "setPathHoldDir",
  "setSound",
  "setSoundCount",
  "stopSound",
  "switchMap",
  "getTriggleScriptName",
  "getTriggleScriptArgs",
  "hasTriggleScript",
  "resetTriggleScript",
  "addMoveTask",
  "addMoveTaskList",
  "resetRec",
  "getRecResult",
  "getRecResults",
  "getRecResultSize",
  "doRec",
  "doRecWithAngle",
  "getRecStatus",
  "setGoodsShape",
  "hasGoods",
  "clearGoodsShape",
  "getForkPressure",
  "getForkPressureADC",
  "setBlockError",
  "clearBlockError",
  "setBlockReason",
  "getRecFileFromTask",
  "setContainer",
  "getContainers",
  "clearContainer",
  "clearContainerByGoodsId",
  "robokitVersion",
  "openSpeed",
  "resetRecAndGoPathDi",
  "recAndGoPathDi",
  "resetRecAdjustYTheta",
  "recAdjustYTheta",
  "resetGoMapPath",
  "goMapPath",
  "laserCollision",
  "forkGoods",
  "armBinTask",
  "armStop",
  "armPause",
  "armResume",
  "scannerCode",
  "armControl",
  "stopMotor",
  "getMinDynamicObs",
  "getRobotFile",
  "getRecFile",
  "getLM",
  "RecognizeBarCode",
  "stopCurrentBlock",
  "getCanFrame",
  "sendCanFrame",
  "resetGoForkPath",
  "goForkPath",
  "setGoForkForkPos",
  "setMotorCalib",
  "setVirtualDI",
  "isAnyErrorExists",
  "getCurrentTaskStatus",
  "getNearestLaserPoint",
  "setGData",
  "getGData",
  "clearGData",
  "release",
  "requireByNickName",
  "require",
  "setModbusData",
  "getModbusData",
  "binDetection",
  "getBinDetectionResult",
  "doRecWithRegion",
  "goForkUseStraightLine",
  "setLaserWidth",
  "clearLaserWidth",
  "setObsStopDist",
  "enableMotor",
  "disableMotor",
  "setSteerAngle",
  "updateModelParamsByJsonStr",
  "recTargetObs",
  "triggerCameraOn",
  "triggerCameraOff",
  "loadStatus",
  "getForkTipObsDist",
  "getMoveStatus",
  "getLastMoveStatus",
  "getCurrentPathProperty",
  "getCurrentAdvancedArea",
  "getAllBins",
  "setDIValid",
  "addDisableDepthId",
  "addDisableLaserId",
  "clearDisableLaserId",
  "clearDisableDepthId",
  "tcpUploadString",
  "setRobotSpinAngle",
  "setGlobalSpinAngle",
  "setIncreaseSpinAngle",
  "spinRun",
  "goPGVRun",
  "resetGoPGV",
  "allCameraCloud",
  "callService"
];

const DEFAULT_RETURNS = {
  Di: {},
  Do: {},
  addMoveTask: 0,
  addMoveTaskList: 0,
  battery: {},
  callService: 0,
  clearContainer: true,
  clearContainerByGoodsId: true,
  clearGoodsShape: false,
  controller: {},
  doRecWithRegion: {},
  errorExits: false,
  fork: {},
  forkGoods: 4,
  getAllBins: {},
  getBinDetectionResult: {},
  getCount: 0,
  getCurrentAdvancedArea: {},
  getCurrentPathProperty: {},
  getForkPressure: 0,
  getForkPressureADC: 0,
  getForkTipObsDist: 0,
  getGData: {},
  getLastMoveStatus: {},
  getModbusData: [],
  getMoveStatus: {},
  getMsg: {},
  getNextSpeed: {},
  getRecFile: {},
  getRecFileFromTask: "",
  getRecResult: {},
  getRecResultSize: 0,
  getRecResults: {},
  getRecStatus: 0,
  getRobotFile: {},
  getTriggleScriptArgs: "{}",
  getTriggleScriptName: "scriptName",
  goMapPath: 4,
  goPath: true,
  hasGoods: false,
  hasTriggleScript: true,
  isAllMotorsReached: true,
  isMotorPositionReached: true,
  isMotorReached: true,
  isMotorStop: true,
  isPathReached: true,
  jack: {},
  laserCollision: false,
  loc: {},
  magnetic: {},
  navSpeed: {},
  noticeExits: false,
  odo: {},
  pgv: {},
  publishSpeed: true,
  recAdjustYTheta: 4,
  recAndGoPathDi: 4,
  recTargetObs: false,
  release: 0,
  require: 0,
  requireByNickName: 0,
  resetLocalShelfArea: true,
  resetMotor: true,
  rfid: {},
  robokitVersion: "3.3.5.11",
  sensorPointCloud: {},
  setContainer: true,
  setDO: true,
  setGoodsShape: 0,
  setLocalShelfArea: true,
  setModbusData: true,
  setMotorPosition: true,
  setMotorSpeed: true,
  setNextSpeed: true,
  setSteerAngle: true,
  sound: {},
  switchMap: 0,
  updateModelParamsByJsonStr: true,
  warningExits: true
};

function cloneDefault(value) {
  if (Array.isArray(value)) {
    return value.slice();
  }
  if (value && typeof value === 'object') {
    return { ...value };
  }
  return value;
}

function parseJsonValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (err) {
      return null;
    }
  }
  if (typeof value === 'object') {
    return value;
  }
  return null;
}

function normalizeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

class SimModule {
  constructor(options = {}) {
    this.robot = options.robot || null;
    this.graph = options.graph || null;
    this.nodesById = options.nodesById || null;
    this.startMoveToNode = options.startMoveToNode || null;
    this.startMoveToPoint = options.startMoveToPoint || null;
    this.startMultiStationTask = options.startMultiStationTask || null;
    this.updateVelocity = options.updateVelocity || null;
    this.resetVelocity = options.resetVelocity || null;
    this.helpers = options.helpers || MotionKernel;
    this.log = typeof options.log === 'function' ? options.log : () => {};
    this.debug = Boolean(options.debug);
    this.defaults = {
      reachDist: Number.isFinite(options.reachDist) ? options.reachDist : 0.05,
      reachAngle: Number.isFinite(options.reachAngle) ? options.reachAngle : 0.03,
      maxSpeed: Number.isFinite(options.maxSpeed) ? options.maxSpeed : 0.6,
      maxRot: Number.isFinite(options.maxRot) ? options.maxRot : 1.2,
      holdDir: Number.isFinite(options.holdDir) ? options.holdDir : 999
    };
    this._count = 0;
    this._nextSpeed = null;
  }

  _log(name, args) {
    if (!this.debug) {
      return;
    }
    this.log(`sim.${name}`, ...args);
  }

  _ensureRobot() {
    return this.robot;
  }

  _ensureScriptPath() {
    const robot = this.robot;
    if (!robot) {
      return null;
    }
    if (!robot.scriptPath) {
      robot.scriptPath = {
        active: false,
        done: false,
        plan: null,
        progress: 0,
        mode: 'idle',
        reachDist: this.defaults.reachDist,
        reachAngle: this.defaults.reachAngle,
        maxSpeed: this.defaults.maxSpeed,
        maxRot: this.defaults.maxRot,
        backMode: false,
        useOdo: false,
        holdDir: this.defaults.holdDir,
        targetAngle: null,
        startHeading: 0
      };
    }
    return robot.scriptPath;
  }

  _ensureSound() {
    const robot = this.robot;
    if (!robot) {
      return null;
    }
    if (!robot.sound) {
      robot.sound = {
        name: '',
        loop: false,
        count: 0,
        playing: false
      };
    }
    return robot.sound;
  }

  _ensureContainers() {
    const robot = this.robot;
    if (!robot) {
      return null;
    }
    if (!Array.isArray(robot.containers)) {
      robot.containers = [];
    }
    return robot.containers;
  }

  _ensureModbus() {
    const robot = this.robot;
    if (!robot) {
      return null;
    }
    if (!robot.modbus) {
      robot.modbus = {
        '0x': {},
        '1x': {},
        '3x': {},
        '4x': {}
      };
    }
    return robot.modbus;
  }

  _ensureDisabledSensors() {
    const robot = this.robot;
    if (!robot) {
      return null;
    }
    if (!robot.disabledSensors) {
      robot.disabledSensors = { depth: [], laser: [] };
    }
    return robot.disabledSensors;
  }

  _ensureIoMeta(type, id, source) {
    const robot = this.robot;
    if (!robot || !robot.io) {
      return null;
    }
    const metaKey = type === 'di' ? 'diMeta' : 'doMeta';
    if (!robot.io[metaKey]) {
      robot.io[metaKey] = {};
    }
    const meta = robot.io[metaKey];
    if (!meta[id]) {
      meta[id] = {};
    }
    if (source) {
      meta[id].source = source;
    }
    if (type === 'di' && meta[id].valid === undefined) {
      meta[id].valid = true;
    }
    return meta[id];
  }

  _setIo(type, id, status, source = 'normal') {
    const robot = this.robot;
    if (!robot || !robot.io || id === undefined || id === null) {
      return false;
    }
    const key = type === 'di' ? 'di' : 'do';
    if (!robot.io[key]) {
      robot.io[key] = {};
    }
    robot.io[key][id] = Boolean(status);
    this._ensureIoMeta(type, id, source);
    return true;
  }

  _getIoList(type) {
    const robot = this.robot;
    if (!robot || !robot.io) {
      return [];
    }
    const key = type === 'di' ? 'di' : 'do';
    const metaKey = type === 'di' ? 'diMeta' : 'doMeta';
    const entries = Object.entries(robot.io[key] || {});
    const meta = robot.io[metaKey] || {};
    return entries.map(([id, value]) => {
      const info = meta[id] || {};
      const item = {
        id: Number(id),
        source: info.source || 'normal',
        status: Boolean(value)
      };
      if (type === 'di') {
        item.valid = info.valid !== undefined ? Boolean(info.valid) : true;
      }
      return item;
    });
  }

  _getMotor(name, create = true) {
    const robot = this.robot;
    if (!robot) {
      return null;
    }
    if (!Array.isArray(robot.motors)) {
      robot.motors = [];
    }
    let motor = robot.motors.find((entry) => entry.motor_name === name);
    if (!motor && create) {
      motor = {
        motor_name: name,
        position: 0,
        speed: 0,
        target: null,
        inPlace: true,
        enabled: true,
        steerAngle: 0
      };
      robot.motors.push(motor);
    }
    return motor || null;
  }

  _setAlarm(kind, code, desc) {
    const robot = this.robot;
    if (!robot) {
      return;
    }
    if (!robot.alarms) {
      robot.alarms = { fatals: [], errors: [], warnings: [], notices: [] };
    }
    const list = robot.alarms[kind];
    if (!Array.isArray(list)) {
      robot.alarms[kind] = [];
    }
    const target = robot.alarms[kind];
    const existing = target.find((entry) => entry && entry.code === code);
    if (existing) {
      existing.desc = desc;
      existing.time = new Date().toISOString();
      return;
    }
    target.push({ code, desc, time: new Date().toISOString() });
  }

  _clearAlarm(kind, code) {
    const robot = this.robot;
    if (!robot || !robot.alarms || !Array.isArray(robot.alarms[kind])) {
      return;
    }
    robot.alarms[kind] = robot.alarms[kind].filter((entry) => entry && entry.code !== code);
  }

  _alarmExists(kind, code) {
    const robot = this.robot;
    if (!robot || !robot.alarms || !Array.isArray(robot.alarms[kind])) {
      return false;
    }
    return robot.alarms[kind].some((entry) => entry && entry.code === code);
  }

  _setScriptPlan(points, targetAngle) {
    const scriptPath = this._ensureScriptPath();
    if (!scriptPath) {
      return false;
    }
    if (!Array.isArray(points) || points.length < 2) {
      return false;
    }
    const polyline = this.helpers.buildPolyline(points);
    scriptPath.plan = { polyline, targetAngle };
    scriptPath.active = false;
    scriptPath.done = false;
    scriptPath.progress = 0;
    scriptPath.mode = 'idle';
    return true;
  }

  setDO(id, status) {
    this._log('setDO', [id, status]);
    return this._setIo('do', id, status, 'normal');
  }

  setMotorSpeed(name, vel, stopDI) {
    this._log('setMotorSpeed', [name, vel, stopDI]);
    const motor = this._getMotor(name, true);
    if (!motor) {
      return false;
    }
    motor.speed = normalizeNumber(vel, 0);
    motor.target = null;
    motor.inPlace = false;
    return true;
  }

  setMotorPosition(motor_name, pos, maxVel, stopDI) {
    this._log('setMotorPosition', [motor_name, pos, maxVel, stopDI]);
    const motor = this._getMotor(motor_name, true);
    if (!motor) {
      return false;
    }
    motor.position = normalizeNumber(pos, motor.position || 0);
    motor.speed = 0;
    motor.target = motor.position;
    motor.inPlace = true;
    return true;
  }

  setLocalShelfArea(object_model_path) {
    this._log('setLocalShelfArea', [object_model_path]);
    const robot = this._ensureRobot();
    if (!robot) {
      return false;
    }
    robot.shelfModel = object_model_path || null;
    return true;
  }

  resetMotor(motor_name) {
    this._log('resetMotor', [motor_name]);
    const motor = this._getMotor(motor_name, false);
    if (!motor) {
      return true;
    }
    motor.speed = 0;
    motor.target = null;
    motor.inPlace = true;
    return true;
  }

  isAllMotorsReached() {
    this._log('isAllMotorsReached', []);
    const robot = this.robot;
    if (!robot || !Array.isArray(robot.motors) || robot.motors.length === 0) {
      return true;
    }
    return robot.motors.every((motor) => motor.inPlace !== false);
  }

  isMotorReached(motor_name) {
    this._log('isMotorReached', [motor_name]);
    const motor = this._getMotor(motor_name, false);
    if (!motor) {
      return false;
    }
    return motor.inPlace !== false;
  }

  isMotorPositionReached(motor_name, pos, stopDI) {
    this._log('isMotorPositionReached', [motor_name, pos, stopDI]);
    const motor = this._getMotor(motor_name, false);
    if (!motor) {
      return false;
    }
    const target = normalizeNumber(pos, motor.position);
    return Math.abs(motor.position - target) < 1e-3;
  }

  isMotorStop(motor_name) {
    this._log('isMotorStop', [motor_name]);
    const motor = this._getMotor(motor_name, false);
    if (!motor) {
      return false;
    }
    return Math.abs(motor.speed) < 1e-3;
  }

  publishSpeed() {
    this._log('publishSpeed', []);
    return true;
  }

  resetLocalShelfArea() {
    this._log('resetLocalShelfArea', []);
    const robot = this._ensureRobot();
    if (!robot) {
      return false;
    }
    robot.shelfModel = null;
    return true;
  }

  getMsg(type_name) {
    this._log('getMsg', [type_name]);
    const type = String(type_name || '').toLowerCase();
    switch (type) {
      case 'loc':
        return this.loc();
      case 'odo':
        return this.odo();
      case 'navspeed':
        return this.navSpeed();
      case 'battery':
        return this.battery();
      case 'di':
        return this.Di();
      case 'do':
        return this.Do();
      default:
        return {};
    }
  }

  getCount() {
    this._count += 1;
    return this._count;
  }

  odo() {
    const robot = this.robot;
    if (!robot) {
      return {};
    }
    return {
      odo: robot.odo || 0,
      today_odo: robot.todayOdo || 0,
      motor_info: Array.isArray(robot.motors)
        ? robot.motors.map((motor) => ({
            motor_name: motor.motor_name,
            position: motor.position
          }))
        : []
    };
  }

  loc() {
    const robot = this.robot;
    if (!robot) {
      return {};
    }
    return {
      x: robot.pose ? robot.pose.x : 0,
      y: robot.pose ? robot.pose.y : 0,
      angle: robot.pose ? robot.pose.angle : 0,
      confidence: robot.confidence || 0,
      current_station: robot.currentStation || '',
      last_station: robot.lastStation || ''
    };
  }

  navSpeed() {
    const robot = this.robot;
    if (!robot) {
      return {};
    }
    return {
      vx: robot.velocity ? robot.velocity.vx : 0,
      vy: robot.velocity ? robot.velocity.vy : 0,
      w: robot.velocity ? robot.velocity.w : 0,
      steer: robot.velocity ? robot.velocity.steer : 0,
      spin: robot.velocity ? robot.velocity.spin : 0,
      r_vx: robot.velocity ? robot.velocity.r_vx : 0,
      r_vy: robot.velocity ? robot.velocity.r_vy : 0,
      r_w: robot.velocity ? robot.velocity.r_w : 0,
      r_steer: robot.velocity ? robot.velocity.r_steer : 0,
      r_spin: robot.velocity ? robot.velocity.r_spin : 0
    };
  }

  battery() {
    const robot = this.robot;
    if (!robot) {
      return {};
    }
    return {
      battery_level: robot.battery || 0,
      battery_temp: robot.batteryTemp || 0,
      charging: Boolean(robot.charging),
      voltage: robot.voltage || 0,
      current: robot.current || 0,
      battery_cycle: robot.batteryCycle || 0
    };
  }

  rfid() {
    return {};
  }

  magnetic() {
    return {};
  }

  Di() {
    return { node: this._getIoList('di') };
  }

  Do() {
    return { node: this._getIoList('do') };
  }

  pgv() {
    return {};
  }

  sound() {
    const sound = this._ensureSound();
    return sound ? { ...sound } : {};
  }

  controller() {
    const robot = this.robot;
    if (!robot) {
      return {};
    }
    return {
      controller_temp: robot.controllerTemp || 0
    };
  }

  fork() {
    const robot = this.robot;
    if (!robot) {
      return {};
    }
    return {
      fork_height: robot.fork ? robot.fork.height : 0,
      fork_height_in_place: robot.fork ? robot.fork.heightInPlace : true,
      fork_auto_flag: robot.fork ? robot.fork.autoFlag : false,
      forward_val: robot.fork ? robot.fork.forwardVal : 0,
      forward_in_place: false,
      fork_pressure_actual: robot.fork ? robot.fork.pressureActual : 0
    };
  }

  jack() {
    return {};
  }

  moveTask() {
    const robot = this.robot;
    const task = robot ? robot.currentTask || robot.lastTask : null;
    return {
      task_id: task ? task.id : null,
      target_id: task ? task.targetId : null,
      params: []
    };
  }

  getArmInfo() {
    return { taskId: 1, task_status: 2 };
  }

  getDistanceSensor() {
    return [
      {
        node: {
          RSSI: 1000,
          aperture: 30,
          can_router: 3,
          dist: 0.2527,
          forbidden: false,
          header: { data_nsec: '0', frame_id: '', pub_nsec: '0', seq: '0' },
          id: 1,
          name: 'distanceSensor',
          pos_angle: 180,
          pos_x: -0.75,
          pos_y: 0.35,
          rs485: 0,
          valid: true
        }
      }
    ];
  }

  logInfo(ss) {
    this._log('logInfo', [ss]);
    this.log(String(ss));
  }

  logWarn(ss) {
    this._log('logWarn', [ss]);
    this.log(String(ss));
  }

  logError(ss) {
    this._log('logError', [ss]);
    this.log(String(ss));
  }

  logDebug(ss) {
    this._log('logDebug', [ss]);
    this.log(String(ss));
  }

  setError(ss) {
    this._setAlarm('errors', 53000, String(ss));
  }

  setUserError(code, ss) {
    this._setAlarm('errors', Number(code), String(ss));
  }

  setPickRobotError(code, ss) {
    this._setAlarm('errors', Number(code), String(ss));
  }

  setWarning(ss) {
    this._setAlarm('warnings', 55300, String(ss));
  }

  setUserWarning(code, ss) {
    this._setAlarm('warnings', Number(code), String(ss));
  }

  setPickRobotWarning(code, ss) {
    this._setAlarm('warnings', Number(code), String(ss));
  }

  setNotice(ss) {
    this._setAlarm('notices', 57300, String(ss));
  }

  clearNotice(code) {
    this._clearAlarm('notices', Number(code));
  }

  noticeExits(code) {
    return this._alarmExists('notices', Number(code));
  }

  clearError(code) {
    this._clearAlarm('errors', Number(code));
  }

  clearWarning(code) {
    this._clearAlarm('warnings', Number(code));
  }

  errorExits(code) {
    return this._alarmExists('errors', Number(code));
  }

  warningExits(code) {
    return this._alarmExists('warnings', Number(code));
  }

  setPathOnRobot(x, y, angle) {
    this._log('setPathOnRobot', [x, y, angle]);
    const robot = this.robot;
    if (!robot || !robot.pose) {
      return false;
    }
    if (!Array.isArray(x) || !Array.isArray(y)) {
      return false;
    }
    const len = Math.min(x.length, y.length);
    const points = [];
    const cos = Math.cos(robot.pose.angle || 0);
    const sin = Math.sin(robot.pose.angle || 0);
    for (let i = 0; i < len; i += 1) {
      const px = normalizeNumber(x[i], NaN);
      const py = normalizeNumber(y[i], NaN);
      if (!Number.isFinite(px) || !Number.isFinite(py)) {
        continue;
      }
      const wx = robot.pose.x + px * cos - py * sin;
      const wy = robot.pose.y + px * sin + py * cos;
      points.push({ x: wx, y: wy });
    }
    return this._setScriptPlan(points, Number.isFinite(angle) ? angle : null);
  }

  setPathOnWorld(x, y, angle) {
    this._log('setPathOnWorld', [x, y, angle]);
    if (!Array.isArray(x) || !Array.isArray(y)) {
      return false;
    }
    const len = Math.min(x.length, y.length);
    const points = [];
    for (let i = 0; i < len; i += 1) {
      const px = normalizeNumber(x[i], NaN);
      const py = normalizeNumber(y[i], NaN);
      if (!Number.isFinite(px) || !Number.isFinite(py)) {
        continue;
      }
      points.push({ x: px, y: py });
    }
    return this._setScriptPlan(points, Number.isFinite(angle) ? angle : null);
  }

  isPathReached() {
    const sp = this._ensureScriptPath();
    return sp ? sp.done : true;
  }

  goPath(param) {
    const sp = this._ensureScriptPath();
    if (!sp || !sp.plan || !sp.plan.polyline) {
      return false;
    }
    const overrides = param && typeof param === 'object' ? param : {};
    if (Number.isFinite(overrides.maxSpeed)) {
      sp.maxSpeed = overrides.maxSpeed;
    }
    if (Number.isFinite(overrides.maxRot)) {
      sp.maxRot = overrides.maxRot;
    }
    if (Number.isFinite(overrides.hold_dir)) {
      sp.holdDir = overrides.hold_dir;
    }
    sp.active = true;
    sp.done = false;
    sp.progress = 0;
    sp.mode = 'rotate';
    sp.startHeading = sp.plan.polyline.headings[0] || 0;
    sp.targetAngle = Number.isFinite(sp.plan.targetAngle) ? sp.plan.targetAngle : null;
    if (this.robot) {
      this.robot.paused = false;
      if (this.robot.manual) {
        this.robot.manual.active = false;
      }
    }
    return true;
  }

  resetPath() {
    const sp = this._ensureScriptPath();
    if (!sp) {
      return;
    }
    sp.active = false;
    sp.done = false;
    sp.plan = null;
    sp.progress = 0;
    sp.mode = 'idle';
  }

  stopRobot(flag) {
    const robot = this.robot;
    if (!robot) {
      return;
    }
    robot.emergency = Boolean(flag);
    robot.softEmc = Boolean(flag);
    robot.paused = true;
    if (robot.manual) {
      robot.manual.active = false;
    }
    if (robot.scriptPath) {
      robot.scriptPath.active = false;
    }
    if (this.resetVelocity) {
      this.resetVelocity();
    } else if (robot.velocity) {
      robot.velocity = {
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
      };
    }
  }

  setInfo(ss) {
    this._log('setInfo', [ss]);
  }

  getNextSpeed() {
    if (this._nextSpeed) {
      return this._nextSpeed;
    }
    if (this.robot && this.robot.nextSpeed) {
      return this.robot.nextSpeed;
    }
    return this.navSpeed();
  }

  setNextSpeed(nav) {
    const parsed = parseJsonValue(nav);
    this._nextSpeed = parsed || nav;
    if (this.robot) {
      this.robot.nextSpeed = this._nextSpeed;
    }
    return true;
  }

  speedDecomposition(nav) {
    return nav;
  }

  setPathReachDist(a) {
    const sp = this._ensureScriptPath();
    if (sp) {
      sp.reachDist = normalizeNumber(a, sp.reachDist);
    }
  }

  setPathReachAngle(a) {
    const sp = this._ensureScriptPath();
    if (sp) {
      sp.reachAngle = normalizeNumber(a, sp.reachAngle);
    }
  }

  setPathUseOdo(a) {
    const sp = this._ensureScriptPath();
    if (sp) {
      sp.useOdo = Boolean(a);
    }
  }

  setPathBackMode(a) {
    const sp = this._ensureScriptPath();
    if (sp) {
      sp.backMode = Boolean(a);
    }
  }

  setPathMaxSpeed(a) {
    const sp = this._ensureScriptPath();
    if (sp) {
      sp.maxSpeed = normalizeNumber(a, sp.maxSpeed);
    }
  }

  setPathMaxRot(a) {
    const sp = this._ensureScriptPath();
    if (sp) {
      sp.maxRot = normalizeNumber(a, sp.maxRot);
    }
  }

  setPathHoldDir(a) {
    const sp = this._ensureScriptPath();
    if (sp) {
      sp.holdDir = normalizeNumber(a, sp.holdDir);
    }
  }

  setSound(name, flag) {
    const sound = this._ensureSound();
    if (!sound) {
      return;
    }
    sound.name = name || '';
    sound.loop = Boolean(flag);
    sound.count = 0;
    sound.playing = true;
  }

  setSoundCount(name, count) {
    const sound = this._ensureSound();
    if (!sound) {
      return;
    }
    sound.name = name || '';
    sound.loop = false;
    sound.count = normalizeNumber(count, 0);
    sound.playing = true;
  }

  stopSound(flag) {
    const sound = this._ensureSound();
    if (!sound) {
      return;
    }
    if (flag) {
      sound.playing = false;
    }
  }

  switchMap(map, switchPoint, center_x, center_y, initial_angle) {
    const robot = this.robot;
    if (!robot) {
      return -2;
    }
    if (!map) {
      return -1;
    }
    if (robot.currentMap === map) {
      return 2;
    }
    robot.currentMap = map;
    robot.currentMapMd5 = '';
    return 0;
  }

  getTriggleScriptName() {
    const robot = this.robot;
    if (robot && robot.triggerScript && robot.triggerScript.name) {
      return robot.triggerScript.name;
    }
    return 'scriptName';
  }

  getTriggleScriptArgs() {
    const robot = this.robot;
    if (robot && robot.triggerScript && robot.triggerScript.args) {
      return JSON.stringify(robot.triggerScript.args);
    }
    return '{}';
  }

  hasTriggleScript() {
    const robot = this.robot;
    if (!robot || !robot.triggerScript) {
      return true;
    }
    return Boolean(robot.triggerScript.active);
  }

  resetTriggleScript() {
    const robot = this.robot;
    if (robot) {
      robot.triggerScript = { active: false, name: '', args: {} };
    }
  }

  addMoveTask(msg) {
    const payload = parseJsonValue(msg) || {};
    const target = payload.id || payload.target_id || payload.station_id || payload.dest_id;
    if (target && typeof this.startMoveToNode === 'function') {
      const result = this.startMoveToNode(target, payload.task_type || 1);
      return result && result.ok ? 0 : -1;
    }
    if (Number.isFinite(payload.x) && Number.isFinite(payload.y) && typeof this.startMoveToPoint === 'function') {
      const result = this.startMoveToPoint(payload.x, payload.y, payload.angle || 0);
      return result && result.ok ? 0 : -1;
    }
    return -1;
  }

  addMoveTaskList(msg) {
    const payload = parseJsonValue(msg);
    if (Array.isArray(payload) && typeof this.startMultiStationTask === 'function') {
      const result = this.startMultiStationTask(payload);
      return result && result.ok ? 0 : -1;
    }
    const list = payload && (payload.targets || payload.list || payload.task_list);
    if (Array.isArray(list) && typeof this.startMultiStationTask === 'function') {
      const result = this.startMultiStationTask(list);
      return result && result.ok ? 0 : -1;
    }
    return -1;
  }

  setGoodsShape(head, tail, width) {
    const robot = this.robot;
    if (!robot) {
      return 0;
    }
    if (!robot.goods) {
      robot.goods = { hasGoods: false, shape: null };
    }
    const h = normalizeNumber(head, 0);
    const t = normalizeNumber(tail, 0);
    const w = normalizeNumber(width, 0);
    if (h <= 0 && t <= 0 && w <= 0) {
      robot.goods = { hasGoods: false, shape: null };
    } else {
      robot.goods = { hasGoods: true, shape: { head: h, tail: t, width: w } };
    }
    return 0;
  }

  hasGoods() {
    const robot = this.robot;
    return Boolean(robot && robot.goods && robot.goods.hasGoods);
  }

  clearGoodsShape() {
    const robot = this.robot;
    if (robot) {
      robot.goods = { hasGoods: false, shape: null };
    }
    return false;
  }

  getForkPressure() {
    const robot = this.robot;
    return robot && Number.isFinite(robot.forkPressure) ? robot.forkPressure : 0;
  }

  getForkPressureADC() {
    const robot = this.robot;
    return robot && Number.isFinite(robot.forkPressureAdc) ? robot.forkPressureAdc : 0;
  }

  setBlockError() {
    const robot = this.robot;
    if (robot) {
      robot.blocked = true;
      robot.blockReason = 52200;
    }
    this._setAlarm('errors', 52200, 'block');
  }

  clearBlockError() {
    const robot = this.robot;
    if (robot) {
      robot.blocked = false;
      robot.blockReason = 0;
    }
    this._clearAlarm('errors', 52200);
  }

  setBlockReason(collision_type, x, y, id) {
    const robot = this.robot;
    if (!robot) {
      return;
    }
    robot.blocked = true;
    robot.blockReason = Number(collision_type) || 0;
    robot.blockPos = {
      x: normalizeNumber(x, 0),
      y: normalizeNumber(y, 0)
    };
    robot.blockId = Number(id) || 0;
  }

  getRecFileFromTask() {
    return '';
  }

  setContainer(container_name, goods_id, desc) {
    const containers = this._ensureContainers();
    if (!containers) {
      return false;
    }
    const name = String(container_name);
    let entry = containers.find((item) => item.container_name === name);
    if (!entry) {
      entry = { container_name: name, desc: '', goods_id: '', has_goods: false };
      containers.push(entry);
    }
    entry.goods_id = goods_id ? String(goods_id) : '';
    entry.desc = desc ? String(desc) : '';
    entry.has_goods = Boolean(entry.goods_id);
    return true;
  }

  getContainers() {
    const containers = this._ensureContainers();
    if (!containers) {
      return [];
    }
    return containers.map((item) => ({ ...item }));
  }

  clearContainer(container_name) {
    const containers = this._ensureContainers();
    if (!containers) {
      return false;
    }
    if (String(container_name) === 'All') {
      containers.length = 0;
      return true;
    }
    const name = String(container_name);
    const index = containers.findIndex((item) => item.container_name === name);
    if (index >= 0) {
      containers.splice(index, 1);
    }
    return true;
  }

  clearContainerByGoodsId(goods_id) {
    const containers = this._ensureContainers();
    if (!containers) {
      return false;
    }
    if (String(goods_id) === 'All') {
      containers.length = 0;
      return true;
    }
    const id = String(goods_id);
    for (let i = containers.length - 1; i >= 0; i -= 1) {
      if (containers[i].goods_id === id) {
        containers.splice(i, 1);
      }
    }
    return true;
  }

  robokitVersion() {
    const robot = this.robot;
    return robot && robot.version ? robot.version : DEFAULT_RETURNS.robokitVersion;
  }

  openSpeed(vx, vy, vw) {
    const robot = this.robot;
    if (!robot || !robot.manual) {
      return;
    }
    robot.manual.active = true;
    robot.manual.vx = normalizeNumber(vx, 0);
    robot.manual.vy = normalizeNumber(vy, 0);
    robot.manual.w = normalizeNumber(vw, 0);
    robot.manual.steer = 0;
    robot.manual.realSteer = 0;
    robot.paused = false;
    if (robot.scriptPath) {
      robot.scriptPath.active = false;
    }
    if (this.updateVelocity) {
      this.updateVelocity(robot.manual.vx, robot.manual.vy, robot.manual.w, 0, robot.manual.w);
    }
  }

  forkGoods(load, recfile) {
    const robot = this.robot;
    if (!robot) {
      return 4;
    }
    robot.forkGoods = { load: Boolean(load), recfile: recfile || '' };
    return 4;
  }

  stopMotor() {
    const robot = this.robot;
    if (!robot || !Array.isArray(robot.motors)) {
      return;
    }
    for (const motor of robot.motors) {
      motor.speed = 0;
    }
  }

  getMinDynamicObs() {
    return [0.0, 0.0];
  }

  getRobotFile() {
    const robot = this.robot;
    return robot && robot.modelParams ? robot.modelParams : {};
  }

  getLM(name, flag) {
    if (!this.nodesById || !this.robot || !this.robot.pose) {
      return [0, 0, 0, -1];
    }
    const node = this.nodesById.get(name);
    if (!node || !node.pos) {
      return [0, 0, 0, -1];
    }
    const x = node.pos.x;
    const y = node.pos.y;
    const theta = 0;
    if (flag) {
      return [x, y, theta, 0];
    }
    const dx = x - this.robot.pose.x;
    const dy = y - this.robot.pose.y;
    const angle = this.robot.pose.angle || 0;
    const localX = dx * Math.cos(angle) + dy * Math.sin(angle);
    const localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
    return [localX, localY, theta, 0];
  }

  RecognizeBarCode(name, id) {
    return { barCode: '1234', id: String(id || '123'), status: 0 };
  }

  getCanFrame() {
    return {
      Canerror: [],
      Channel: 0,
      DLC: 0,
      Data: '',
      Direction: false,
      Extended: false,
      ID: 0,
      Remote: false,
      Timestamp: 0
    };
  }

  sendCanFrame(channel, can_id, dlc, extend, can_string) {
    this._log('sendCanFrame', [channel, can_id, dlc, extend, can_string]);
  }

  resetGoForkPath(x, y, yaw, back_dist, min_ahead_dist, ahead_dist) {
    const robot = this.robot;
    if (robot) {
      robot.forkPath = {
        x: normalizeNumber(x, 0),
        y: normalizeNumber(y, 0),
        yaw: normalizeNumber(yaw, 0),
        back_dist: normalizeNumber(back_dist, 0),
        min_ahead_dist: normalizeNumber(min_ahead_dist, 0),
        ahead_dist: normalizeNumber(ahead_dist, 0)
      };
    }
  }

  goForkPath() {
    return;
  }

  setGoForkForkPos(x, y, theta, hold_dir) {
    const robot = this.robot;
    if (robot) {
      robot.forkPos = {
        x: normalizeNumber(x, 0),
        y: normalizeNumber(y, 0),
        theta: normalizeNumber(theta, 0),
        hold_dir: normalizeNumber(hold_dir, 0)
      };
    }
  }

  setMotorCalib(motor_name) {
    const motor = this._getMotor(motor_name, false);
    if (motor) {
      motor.inPlace = true;
    }
  }

  setVirtualDI(index, status) {
    return this._setIo('di', index, status, 'virtual');
  }

  isAnyErrorExists() {
    const robot = this.robot;
    if (!robot || !robot.alarms) {
      return false;
    }
    return (robot.alarms.errors || []).length > 0 || (robot.alarms.fatals || []).length > 0;
  }

  getCurrentTaskStatus() {
    const robot = this.robot;
    return robot ? robot.taskStatus || 0 : 0;
  }

  getNearestLaserPoint(laser_id) {
    this._log('getNearestLaserPoint', [laser_id]);
  }

  setGData(value) {
    const robot = this.robot;
    if (robot) {
      robot.gData = value && typeof value === 'object' ? { ...value } : {};
    }
  }

  getGData() {
    const robot = this.robot;
    return robot && robot.gData ? { ...robot.gData } : {};
  }

  clearGData() {
    const robot = this.robot;
    if (robot) {
      robot.gData = {};
    }
  }

  release() {
    const robot = this.robot;
    if (robot) {
      robot.lockInfo = {
        ...(robot.lockInfo || {}),
        locked: false,
        nick_name: '',
        ip: '',
        port: 0,
        time_t: 0,
        type: robot.lockInfo && Number.isFinite(robot.lockInfo.type) ? robot.lockInfo.type : DEFAULT_LOCK_TYPE,
        desc: ''
      };
    }
    return 0;
  }

  requireByNickName(nick_name) {
    const robot = this.robot;
    if (robot) {
      robot.lockInfo = {
        ...(robot.lockInfo || {}),
        locked: true,
        nick_name: String(nick_name || ''),
        time_t: Math.floor(Date.now() / 1000),
        type: robot.lockInfo && Number.isFinite(robot.lockInfo.type) ? robot.lockInfo.type : DEFAULT_LOCK_TYPE
      };
    }
    return 0;
  }

  require() {
    const robot = this.robot;
    if (robot) {
      robot.lockInfo = {
        ...(robot.lockInfo || {}),
        locked: true,
        nick_name: robot.id || '',
        time_t: Math.floor(Date.now() / 1000),
        type: robot.lockInfo && Number.isFinite(robot.lockInfo.type) ? robot.lockInfo.type : DEFAULT_LOCK_TYPE
      };
    }
    return 0;
  }

  setModbusData(type, addr, data) {
    const modbus = this._ensureModbus();
    if (!modbus) {
      return false;
    }
    const key = String(type || '4x');
    if (!modbus[key]) {
      modbus[key] = {};
    }
    if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i += 1) {
        modbus[key][Number(addr) + i] = data[i];
      }
    }
    return true;
  }

  getModbusData(type, addr, size) {
    const modbus = this._ensureModbus();
    if (!modbus) {
      return [];
    }
    const key = String(type || '4x');
    const table = modbus[key] || {};
    const count = normalizeNumber(size, 0);
    const out = [];
    for (let i = 0; i < count; i += 1) {
      out.push(table[Number(addr) + i]);
    }
    return out;
  }

  setLaserWidth(id, width) {
    const robot = this.robot;
    if (!robot) {
      return;
    }
    if (!robot.laserWidths) {
      robot.laserWidths = {};
    }
    robot.laserWidths[id] = normalizeNumber(width, 0);
  }

  clearLaserWidth(ids) {
    const robot = this.robot;
    if (!robot || !robot.laserWidths) {
      return;
    }
    if (!Array.isArray(ids)) {
      robot.laserWidths = {};
      return;
    }
    for (const id of ids) {
      delete robot.laserWidths[id];
    }
  }

  setObsStopDist(dist) {
    const robot = this.robot;
    if (robot) {
      robot.obstacleStopDist = normalizeNumber(dist, robot.obstacleStopDist || 0);
    }
  }

  enableMotor(name) {
    const motor = this._getMotor(name, true);
    if (motor) {
      motor.enabled = true;
    }
  }

  disableMotor(name) {
    const motor = this._getMotor(name, false);
    if (motor) {
      motor.enabled = false;
      motor.speed = 0;
    }
  }

  setSteerAngle(name, angle) {
    const motor = this._getMotor(name, true);
    if (!motor) {
      return false;
    }
    motor.steerAngle = normalizeNumber(angle, 0);
    return true;
  }

  updateModelParamsByJsonStr(model_json_str) {
    const parsed = parseJsonValue(model_json_str);
    if (this.robot) {
      this.robot.modelParams = parsed || model_json_str;
    }
    return true;
  }

  setDIValid(id, valid) {
    const meta = this._ensureIoMeta('di', id, null);
    if (meta) {
      meta.valid = Boolean(valid);
    }
  }

  addDisableDepthId(id) {
    const sensors = this._ensureDisabledSensors();
    if (!sensors) {
      return;
    }
    const list = Array.isArray(id) ? id : [id];
    for (const value of list) {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        continue;
      }
      if (!sensors.depth.includes(num)) {
        sensors.depth.push(num);
      }
    }
  }

  addDisableLaserId(id) {
    const sensors = this._ensureDisabledSensors();
    if (!sensors) {
      return;
    }
    const list = Array.isArray(id) ? id : [id];
    for (const value of list) {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        continue;
      }
      if (!sensors.laser.includes(num)) {
        sensors.laser.push(num);
      }
    }
  }

  clearDisableLaserId() {
    const sensors = this._ensureDisabledSensors();
    if (sensors) {
      sensors.laser = [];
    }
  }

  clearDisableDepthId() {
    const sensors = this._ensureDisabledSensors();
    if (sensors) {
      sensors.depth = [];
    }
  }

  tcpUploadString(s) {
    const robot = this.robot;
    if (!robot) {
      return;
    }
    if (!Array.isArray(robot.tcpUploads)) {
      robot.tcpUploads = [];
    }
    robot.tcpUploads.push(String(s));
  }
}

for (const name of METHOD_NAMES) {
  if (name === '__init__' || name === 'constructor') {
    continue;
  }
  if (!Object.prototype.hasOwnProperty.call(SimModule.prototype, name)) {
    SimModule.prototype[name] = function (...args) {
      this._log(name, args);
      if (Object.prototype.hasOwnProperty.call(DEFAULT_RETURNS, name)) {
        return cloneDefault(DEFAULT_RETURNS[name]);
      }
      return undefined;
    };
  }
}

module.exports = {
  SimModule,
  METHOD_NAMES,
  DEFAULT_RETURNS
};
