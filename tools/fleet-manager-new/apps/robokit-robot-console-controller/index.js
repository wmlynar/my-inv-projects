#!/usr/bin/env node

'use strict';

const fs = require('fs');
const net = require('net');
const path = require('path');
const readline = require('readline');
const { API, PORTS, encodeFrame, responseApi, RbkParser } = require('../../packages/robokit-lib/rbk');

const DEFAULTS = {
  host: '127.0.0.1',
  statePort: PORTS.STATE,
  taskPort: PORTS.TASK,
  ctrlPort: PORTS.CTRL,
  otherPort: PORTS.OTHER,
  configPort: PORTS.CONFIG,
  nickName: 'console-controller',
  speed: 0.6,
  omegaDeg: 15,
  pollMs: 200,
  sendMs: 100,
  holdMs: 300,
  initialHoldMs: 500,
  comboHoldMs: 700,
  keyLogPath: '',
  forkStep: 0.1
};

const DEG_PER_RAD = 180 / Math.PI;
const RAD_PER_DEG = Math.PI / 180;
const AUTO_SEIZE_INTERVAL_MS = 2000;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg) {
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      args.help = true;
      continue;
    }
    const next = argv[i + 1];
    switch (arg) {
      case '--host':
        args.host = next;
        i += 1;
        break;
      case '--state-port':
        args.statePort = Number.parseInt(next, 10);
        i += 1;
        break;
      case '--task-port':
        args.taskPort = Number.parseInt(next, 10);
        i += 1;
        break;
      case '--ctrl-port':
        args.ctrlPort = Number.parseInt(next, 10);
        i += 1;
        break;
      case '--other-port':
        args.otherPort = Number.parseInt(next, 10);
        i += 1;
        break;
      case '--config-port':
        args.configPort = Number.parseInt(next, 10);
        i += 1;
        break;
      case '--nick-name':
        args.nickName = next;
        i += 1;
        break;
      case '--speed':
        args.speed = Number.parseFloat(next);
        i += 1;
        break;
      case '--omega-deg':
        args.omegaDeg = Number.parseFloat(next);
        i += 1;
        break;
      case '--poll-ms':
        args.pollMs = Number.parseInt(next, 10);
        i += 1;
        break;
      case '--send-ms':
        args.sendMs = Number.parseInt(next, 10);
        i += 1;
        break;
      case '--hold-ms':
        args.holdMs = Number.parseInt(next, 10);
        i += 1;
        break;
      case '--initial-hold-ms':
        args.initialHoldMs = Number.parseInt(next, 10);
        i += 1;
        break;
      case '--combo-hold-ms':
        args.comboHoldMs = Number.parseInt(next, 10);
        i += 1;
        break;
      case '--key-log':
        if (next && !next.startsWith('-')) {
          args.keyLogPath = next;
          i += 1;
        } else {
          args.keyLogPath = path.resolve(process.cwd(), 'key-events.jsonl');
        }
        break;
      default:
        break;
    }
  }
  return args;
}

function printHelp() {
  const text = [
    'Usage:',
    '  node index.js [--host 127.0.0.1] [--state-port 19204] [--task-port 19206] [--ctrl-port 19205] [--other-port 19210] [--config-port 19207]',
    '  --nick-name console-controller --speed 0.6 --omega-deg 15 --poll-ms 200 --send-ms 100',
    '  --hold-ms 300 --initial-hold-ms 500 --combo-hold-ms 700 --key-log ./key-events.jsonl',
    '',
    'Keys:',
    '  Enter: soft EMC on',
    '  Backspace: soft EMC off',
    '  Arrow Up/Down/Left/Right: move/rotate',
    '  S: pause task, D: resume task, F: stop task',
    '  Space: stop robot and forks',
    '  +/-: adjust target speed',
    '  Q/W: adjust target angular speed',
    '  A/Z: fork up/down',
    '  C: go target (prompt)',
    '  V: multi station (prompt twice)',
    '  P/L: seize/release control',
    '  U/I: auto-seize on/off',
    '  Ctrl+C: exit'
  ];
  // eslint-disable-next-line no-console
  console.log(text.join('\n'));
}

function clampNonNegative(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
}

function roundToStep(value, step) {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) {
    return value;
  }
  return Math.round(value / step) * step;
}

function formatNumber(value, digits, fallback = '0') {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return value.toFixed(digits);
}

function formatBool(value, onText, offText) {
  return value ? onText : offText;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }
  const pct = value > 1.01 ? value : value * 100;
  return `${pct.toFixed(0)}%`;
}

function formatCount(value) {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }
  return String(value);
}

function formatConn(client) {
  if (!client) {
    return 'n/a';
  }
  return client.connected ? 'ok' : 'down';
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printHelp();
  process.exit(0);
}

const options = {
  ...DEFAULTS,
  ...args
};

options.speed = clampNonNegative(options.speed);
options.omegaDeg = clampNonNegative(options.omegaDeg);
options.pollMs = Number.isFinite(options.pollMs) ? options.pollMs : DEFAULTS.pollMs;
options.sendMs = Number.isFinite(options.sendMs) ? options.sendMs : DEFAULTS.sendMs;
options.holdMs = Number.isFinite(options.holdMs) ? options.holdMs : DEFAULTS.holdMs;
options.initialHoldMs = Number.isFinite(options.initialHoldMs) ? options.initialHoldMs : DEFAULTS.initialHoldMs;
options.comboHoldMs = Number.isFinite(options.comboHoldMs) ? options.comboHoldMs : DEFAULTS.comboHoldMs;
options.keyLogPath = options.keyLogPath || '';
options.taskPort = Number.isFinite(options.taskPort) ? options.taskPort : DEFAULTS.taskPort;

const state = {
  statusUpdatedAt: 0,
  x: 0,
  y: 0,
  yaw: 0,
  vx: 0,
  vy: 0,
  w: 0,
  currentStation: '',
  lastStation: '',
  forkHeight: 0,
  batteryLevel: null,
  softEmc: false,
  lock: { locked: false, nickName: '' },
  pathCount: null,
  slowPathCount: null,
  stopPathCount: null,
  avoidPathCount: null
};
let lastMotionSent = { vx: 0, w: 0 };

const command = {
  linearDir: 0,
  angularDir: 0,
  linearAt: 0,
  angularAt: 0,
  linearHoldUntil: 0,
  angularHoldUntil: 0,
  linearCmd: 0,
  angularCmd: 0
};

let targetSpeed = options.speed;
let targetOmegaDeg = options.omegaDeg;
let forkTarget = null;
let closing = false;
let renderTimer = null;
let pollTimer = null;
let sendTimer = null;
let keyLog = null;
let inputMode = false;
let inputBuffer = '';
let inputMessage = '';
let inputMessageAt = 0;
let lastGoTarget = null;
let inputKind = 'go';
let inputStep = 0;
let multiTargets = [];
let autoSeize = false;
let lastAutoSeizeAt = 0;

function openKeyLog() {
  if (!options.keyLogPath) {
    return;
  }
  try {
    keyLog = fs.createWriteStream(options.keyLogPath, { flags: 'a' });
    keyLog.write(`${JSON.stringify({ tsMs: Date.now(), event: 'start', pid: process.pid })}\n`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`key-log error: ${err.message}`);
    keyLog = null;
  }
}

function logKeyEvent(str, key) {
  if (!keyLog) {
    return;
  }
  const entry = {
    tsMs: Date.now(),
    str: typeof str === 'string' ? str : '',
    key: key
      ? {
        name: key.name || '',
        sequence: key.sequence || '',
        ctrl: Boolean(key.ctrl),
        meta: Boolean(key.meta),
        shift: Boolean(key.shift)
      }
      : null
  };
  keyLog.write(`${JSON.stringify(entry)}\n`);
}

function createClient(name, port) {
  const client = {
    name,
    port,
    socket: null,
    parser: new RbkParser({ maxBodyLength: 1024 * 1024 }),
    connected: false,
    seq: 1,
    reconnectTimer: null,
    lastError: ''
  };

  function nextSeq() {
    client.seq = (client.seq + 1) & 0xffff;
    if (client.seq === 0) {
      client.seq = 1;
    }
    return client.seq;
  }

  function connect() {
    if (closing) {
      return;
    }
    client.socket = net.createConnection({ host: options.host, port: client.port }, () => {
      client.connected = true;
      client.lastError = '';
    });

    client.socket.on('data', (chunk) => {
      let messages = [];
      try {
        messages = client.parser.push(chunk);
      } catch (err) {
        client.lastError = err.message;
        client.socket.destroy();
        return;
      }
      for (const msg of messages) {
        handleFrame(client, msg);
      }
    });

    client.socket.on('error', (err) => {
      client.lastError = err.message;
    });

    client.socket.on('close', () => {
      client.connected = false;
      if (closing) {
        return;
      }
      if (client.reconnectTimer) {
        clearTimeout(client.reconnectTimer);
      }
      client.reconnectTimer = setTimeout(connect, 1000);
    });
  }

  client.send = (apiNo, payload) => {
    if (!client.connected || !client.socket) {
      return false;
    }
    const frame = encodeFrame(nextSeq(), apiNo, payload || null);
    client.socket.write(frame);
    return true;
  };

  connect();
  return client;
}

const clients = {
  state: createClient('state', options.statePort),
  task: createClient('task', options.taskPort),
  ctrl: createClient('ctrl', options.ctrlPort),
  other: createClient('other', options.otherPort),
  config: createClient('config', options.configPort)
};

function updateStatus(payload) {
  if (!payload || typeof payload !== 'object') {
    return;
  }
  const countPathPoints = (value) => {
    if (Array.isArray(value)) {
      return value.length;
    }
    if (value && typeof value === 'object' && Array.isArray(value.point)) {
      return value.point.length;
    }
    return null;
  };

  state.statusUpdatedAt = Date.now();
  if (Number.isFinite(payload.x)) state.x = payload.x;
  if (Number.isFinite(payload.y)) state.y = payload.y;
  if (Number.isFinite(payload.yaw)) state.yaw = payload.yaw;
  if (Number.isFinite(payload.vx)) state.vx = payload.vx;
  if (Number.isFinite(payload.vy)) state.vy = payload.vy;
  if (Number.isFinite(payload.w)) state.w = payload.w;
  if (typeof payload.current_station === 'string') state.currentStation = payload.current_station;
  if (typeof payload.last_station === 'string') state.lastStation = payload.last_station;
  if (Number.isFinite(payload.fork_height)) state.forkHeight = payload.fork_height;
  if (Number.isFinite(payload.battery_level)) state.batteryLevel = payload.battery_level;
  if (payload.soft_emc !== undefined) state.softEmc = Boolean(payload.soft_emc);
  if (payload.current_lock && typeof payload.current_lock === 'object') {
    state.lock.locked = Boolean(payload.current_lock.locked);
    state.lock.nickName = payload.current_lock.nick_name || '';
  }
  state.pathCount = countPathPoints(payload.path);
  state.slowPathCount = countPathPoints(payload.slow_path);
  state.stopPathCount = countPathPoints(payload.stop_path);
  state.avoidPathCount = countPathPoints(payload.avoid_path);
  if (forkTarget === null && Number.isFinite(state.forkHeight)) {
    forkTarget = state.forkHeight;
  }
  maybeAutoSeize();
}

function handleFrame(client, msg) {
  if (!msg) {
    return;
  }
  if (client.name === 'state') {
    if (msg.apiNo === responseApi(API.robot_status_all1_req)) {
      updateStatus(msg.payload || {});
    }
    return;
  }
  if (client.name === 'task') {
    if (msg.apiNo === responseApi(API.robot_task_gotarget_req)
      || msg.apiNo === responseApi(API.robot_task_multistation_req)
      || msg.apiNo === responseApi(API.robot_tasklist_req)) {
      const payload = msg.payload || {};
      lastGoTarget = {
        id: lastGoTarget && lastGoTarget.id ? lastGoTarget.id : '',
        tsMs: Date.now(),
        retCode: Number.isFinite(payload.ret_code) ? payload.ret_code : 0,
        message: payload.err_msg || payload.message || ''
      };
    }
  }
}

function sendMotion(vx, w) {
  const safeVx = Number.isFinite(vx) ? vx : 0;
  const safeW = Number.isFinite(w) ? w : 0;
  const wasZero = !lastMotionSent.vx && !lastMotionSent.w;
  const isZero = !safeVx && !safeW;
  if (isZero && wasZero) {
    return;
  }
  // Match Roboshop: omit steer fields for manual control.
  clients.ctrl.send(API.robot_control_motion_req, {
    vx: safeVx,
    vy: 0,
    w: safeW
  });
  lastMotionSent = { vx: safeVx, w: safeW };
}

function sendSoftEmc(status) {
  clients.other.send(API.robot_other_softemc_req, { status: Boolean(status) });
  if (status) {
    command.linearDir = 0;
    command.angularDir = 0;
    command.linearAt = 0;
    command.angularAt = 0;
    command.linearCmd = 0;
    command.angularCmd = 0;
    sendMotion(0, 0);
  }
}

function sendStop() {
  command.linearDir = 0;
  command.angularDir = 0;
  command.linearAt = 0;
  command.angularAt = 0;
  command.linearCmd = 0;
  command.angularCmd = 0;
  clients.ctrl.send(API.robot_control_stop_req, null);
  clients.other.send(API.robot_other_forkstop_req, null);
  sendMotion(0, 0);
}

function sendForkHeight(height) {
  // Match Roboshop: send ForkHeight via task goTarget (3051).
  clients.task.send(API.robot_task_gotarget_req, {
    operation: 'ForkHeight',
    skill_name: 'Action',
    end_height: height
  });
}

function sendForkLoad() {
  // Match Roboshop: pallet pickup via ForkLoad on goTarget (3051).
  clients.task.send(API.robot_task_gotarget_req, {
    id: state.currentStation || '',
    operation: 'ForkLoad',
    start_height: 0,
    end_height: 0.5,
    recognize: false
  });
}

function sendGoTarget(id) {
  if (!id) {
    inputMessage = 'Empty target id.';
    inputMessageAt = Date.now();
    return;
  }
  inputMessage = '';
  inputMessageAt = 0;
  const ok = clients.task.send(API.robot_task_gotarget_req, { id });
  lastGoTarget = {
    id,
    tsMs: Date.now(),
    retCode: ok ? null : 1,
    message: ok ? 'sent' : 'task port not connected'
  };
}

function buildTasklistPayload(stations) {
  const now = Date.now();
  const taskName = `task_${new Date(now).toISOString().replace(/\D/g, '').slice(0, 17)}`;
  const groups = stations.map((stationId, index) => ({
    actions: [
      {
        actionName: 'move_action',
        pluginName: 'MoveFactory',
        params: [
          { key: 'skill_name', stringValue: 'GotoSpecifiedPose' },
          { key: 'target_name', stringValue: stationId }
        ],
        ignoreReturn: false,
        overtime: 0,
        externalOverId: -1,
        needResult: false,
        sleepTime: 0,
        actionId: 0
      }
    ],
    actionGroupName: `group ${index + 1}`,
    actionGroupId: index,
    checked: true
  }));

  return {
    name: taskName,
    tasks: [
      {
        taskId: 0,
        desc: '',
        actionGroups: groups,
        checked: true
      }
    ],
    loop: false
  };
}

function sendMultiStation(targets) {
  const list = Array.isArray(targets) ? targets.filter(Boolean) : [];
  if (list.length < 2) {
    inputMessage = 'Need two stations for multi station.';
    inputMessageAt = Date.now();
    return;
  }
  const payload = buildTasklistPayload(list);
  const ok = clients.task.send(API.robot_tasklist_req, payload);
  lastGoTarget = {
    id: list.join(' -> '),
    tsMs: Date.now(),
    retCode: ok ? null : 1,
    message: ok ? 'multi station sent' : 'task port not connected'
  };
}

function seizeControl() {
  clients.config.send(API.robot_config_req_4005, { nick_name: options.nickName });
}

function releaseControl() {
  clients.config.send(API.robot_config_req_4006, null);
}

function maybeAutoSeize() {
  if (!autoSeize) {
    return;
  }
  if (state.lock.locked) {
    return;
  }
  const now = Date.now();
  if (now - lastAutoSeizeAt < AUTO_SEIZE_INTERVAL_MS) {
    return;
  }
  lastAutoSeizeAt = now;
  seizeControl();
}

function applyLinear(direction) {
  const now = Date.now();
  if (command.linearDir !== direction) {
    command.linearHoldUntil = now + options.initialHoldMs;
  }
  command.linearDir = direction;
  command.linearAt = now;
}

function applyAngular(direction) {
  const now = Date.now();
  if (command.angularDir !== direction) {
    command.angularHoldUntil = now + options.initialHoldMs;
  }
  command.angularDir = direction;
  command.angularAt = now;
}

function refreshCommandSpeeds() {
  command.linearCmd = command.linearDir * targetSpeed;
  command.angularCmd = command.angularDir * targetOmegaDeg * RAD_PER_DEG;
}

function adjustSpeed(delta) {
  const next = clampNonNegative(roundToStep(targetSpeed + delta, 0.1));
  targetSpeed = next;
  refreshCommandSpeeds();
}

function adjustOmega(delta) {
  const next = clampNonNegative(roundToStep(targetOmegaDeg + delta, 5));
  targetOmegaDeg = next;
  refreshCommandSpeeds();
}

function adjustFork(delta) {
  const base = Number.isFinite(state.forkHeight) ? state.forkHeight : forkTarget || 0;
  const next = clampNonNegative(roundToStep(base + delta, 0.1));
  forkTarget = next;
  sendForkHeight(next);
}

function enterTargetPrompt(kind = 'go') {
  inputMode = true;
  inputKind = kind;
  inputStep = kind === 'multi' ? 1 : 0;
  multiTargets = [];
  inputBuffer = '';
  inputMessage = '';
  inputMessageAt = 0;
  command.linearDir = 0;
  command.angularDir = 0;
  command.linearAt = 0;
  command.angularAt = 0;
  command.linearCmd = 0;
  command.angularCmd = 0;
  sendMotion(0, 0);
}

function exitTargetPrompt() {
  inputMode = false;
  inputKind = 'go';
  inputStep = 0;
  multiTargets = [];
  inputBuffer = '';
}

function axisActive(dir, lastAt, windowMs, now, holdUntil) {
  if (!dir) {
    return 0;
  }
  const effectiveUntil = Math.max(lastAt + windowMs, holdUntil || 0);
  if (now <= effectiveUntil) {
    return dir;
  }
  return 0;
}

function installKeyHandler() {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.on('keypress', (str, key) => {
    logKeyEvent(str, key);
    if (inputMode) {
      if (key && key.ctrl && key.name === 'c') {
        shutdown();
        return;
      }
      if (key && (key.name === 'escape' || key.name === 'esc')) {
        exitTargetPrompt();
        return;
      }
      if (key && (key.name === 'return' || key.name === 'enter')) {
        const target = inputBuffer.trim();
        if (inputKind === 'multi') {
          if (!target) {
            inputMessage = 'Empty target id.';
            inputMessageAt = Date.now();
            return;
          }
          if (inputStep === 1) {
            multiTargets = [target];
            inputBuffer = '';
            inputStep = 2;
            return;
          }
          if (inputStep === 2) {
            multiTargets = [...multiTargets, target];
            exitTargetPrompt();
            sendMultiStation(multiTargets);
            return;
          }
        }
        exitTargetPrompt();
        sendGoTarget(target);
        return;
      }
      if (key && key.name === 'backspace') {
        inputBuffer = inputBuffer.slice(0, -1);
        return;
      }
      if (typeof str === 'string' && str.length === 1) {
        const code = str.charCodeAt(0);
        if (code >= 32 && code <= 126) {
          inputBuffer += str;
        }
      }
      return;
    }
    if (key && key.ctrl && key.name === 'c') {
      shutdown();
      return;
    }
    if (key && (key.name === 'return' || key.name === 'enter')) {
      sendSoftEmc(true);
      return;
    }
    if (key && key.name === 'backspace') {
      sendSoftEmc(false);
      return;
    }
    if (key && key.name === 'space') {
      sendStop();
      return;
    }
    if (str === 's' || str === 'S') {
      clients.task.send(API.robot_task_pause_req, null);
      return;
    }
    if (str === 'd' || str === 'D') {
      clients.task.send(API.robot_task_resume_req, null);
      return;
    }
    if (str === 'f' || str === 'F') {
      clients.task.send(API.robot_task_cancel_req, null);
      return;
    }
    if (str === 'x' || str === 'X') {
      sendForkLoad();
      return;
    }
    if (str === 'v' || str === 'V') {
      enterTargetPrompt('multi');
      return;
    }
    if (str === 'c' || str === 'C') {
      enterTargetPrompt();
      return;
    }
    if (key && key.name === 'up') {
      applyLinear(1);
      return;
    }
    if (key && key.name === 'down') {
      applyLinear(-1);
      return;
    }
    if (key && key.name === 'left') {
      applyAngular(1);
      return;
    }
    if (key && key.name === 'right') {
      applyAngular(-1);
      return;
    }
    if (str === '+' || (key && key.name === 'add') || (str === '=' && key && key.shift)) {
      adjustSpeed(0.1);
      return;
    }
    if (str === '-') {
      adjustSpeed(-0.1);
      return;
    }
    if (str === 'q' || str === 'Q') {
      adjustOmega(-5);
      return;
    }
    if (str === 'w' || str === 'W') {
      adjustOmega(5);
      return;
    }
    if (str === 'a' || str === 'A') {
      adjustFork(0.1);
      return;
    }
    if (str === 'z' || str === 'Z') {
      adjustFork(-0.1);
      return;
    }
    if (str === 'p' || str === 'P') {
      seizeControl();
      return;
    }
    if (str === 'u' || str === 'U') {
      autoSeize = true;
      inputMessage = 'Auto-seize enabled.';
      inputMessageAt = Date.now();
      maybeAutoSeize();
      return;
    }
    if (str === 'i' || str === 'I') {
      autoSeize = false;
      inputMessage = 'Auto-seize disabled.';
      inputMessageAt = Date.now();
      return;
    }
    if (str === 'l' || str === 'L') {
      releaseControl();
      return;
    }
  });
}

function render() {
  const now = Date.now();
  const statusAge = state.statusUpdatedAt ? ((now - state.statusUpdatedAt) / 1000) : null;
  const linearActual = Math.hypot(state.vx, state.vy);
  const angularActualDeg = state.w * DEG_PER_RAD;
  const yawDeg = state.yaw * DEG_PER_RAD;
  const softEmcText = formatBool(state.softEmc, 'ON', 'OFF');
  const lockText = state.lock.locked
    ? `LOCKED ${state.lock.nickName ? '(' + state.lock.nickName + ')' : ''}`
    : 'UNLOCKED';
  const autoSeizeText = autoSeize ? 'AUTO' : 'MANUAL';
  const forkTargetText = Number.isFinite(forkTarget) ? formatNumber(forkTarget, 2) : formatNumber(state.forkHeight, 2);
  const statusAgeText = statusAge === null ? 'n/a' : `${statusAge.toFixed(1)}s`;
  const promptText = inputMode
    ? (inputKind === 'multi'
      ? `Multi station (${inputStep}/2) ${inputStep === 2 && multiTargets[0] ? `first ${multiTargets[0]} -> ` : ''}${inputBuffer}`
      : `Go target (LM/AP): ${inputBuffer}`)
    : lastGoTarget
      ? `Last goTarget: ${lastGoTarget.id || '-'} (${lastGoTarget.message || 'ack'})`
      : 'Last goTarget: -';
  if (inputMessage && inputMessageAt && now - inputMessageAt > 3000) {
    inputMessage = '';
    inputMessageAt = 0;
  }
  const hintText = inputMode
    ? (inputMessage || 'Enter to send, Esc to cancel')
    : inputMessage || '';

  const lines = [
    'Robokit Robot Console Controller',
    `Host: ${options.host} | Ports: state ${options.statePort} task ${options.taskPort} ctrl ${options.ctrlPort} other ${options.otherPort} config ${options.configPort}`,
    `Connections: state ${formatConn(clients.state)} | task ${formatConn(clients.task)} | ctrl ${formatConn(clients.ctrl)} | other ${formatConn(clients.other)} | config ${formatConn(clients.config)}`,
    `Soft EMC: ${softEmcText} | Control: ${lockText} | Mode: ${autoSeizeText} | Battery: ${formatPercent(state.batteryLevel)} | Status age: ${statusAgeText} | Key log: ${options.keyLogPath || 'off'}`,
    `Target speed: ${formatNumber(targetSpeed, 1)} m/s | Target angular: ${formatNumber(targetOmegaDeg, 0)} deg/s | Fork target: ${forkTargetText} m`,
    `Command: linear ${formatNumber(command.linearCmd, 2)} m/s | angular ${formatNumber(command.angularCmd * DEG_PER_RAD, 1)} deg/s`,
    `Actual: linear ${formatNumber(linearActual, 2)} m/s | angular ${formatNumber(angularActualDeg, 1)} deg/s`,
    `Pose: x ${formatNumber(state.x, 3)} y ${formatNumber(state.y, 3)} yaw ${formatNumber(yawDeg, 1)} deg`,
    `Stations: current ${state.currentStation || '-'} | last ${state.lastStation || '-'}`,
    `Paths: path ${formatCount(state.pathCount)} | slow ${formatCount(state.slowPathCount)} | stop ${formatCount(state.stopPathCount)} | avoid ${formatCount(state.avoidPathCount)}`,
    promptText,
    hintText,
    'Keys: Enter soft-EMC ON | Backspace soft-EMC OFF | Space stop | P seize | L release | U auto on | I auto off | S pause | D resume | F stop | X pickup',
    'Keys: Arrows move | +/- speed | Q/W angular | A/Z fork up/down | C go target | V multi station | Ctrl+C exit'
  ];

  process.stdout.write('\x1b[2J\x1b[H' + lines.join('\n') + '\n');
}

function tickCommand() {
  const now = Date.now();
  const comboActive = Boolean(command.linearDir)
    && Boolean(command.angularDir)
    && now - command.linearAt <= options.comboHoldMs
    && now - command.angularAt <= options.comboHoldMs;
  const linearWindow = comboActive ? options.comboHoldMs : options.holdMs;
  const angularWindow = comboActive ? options.comboHoldMs : options.holdMs;
  const linearDir = axisActive(command.linearDir, command.linearAt, linearWindow, now, command.linearHoldUntil);
  const angularDir = axisActive(command.angularDir, command.angularAt, angularWindow, now, command.angularHoldUntil);
  command.linearCmd = linearDir * targetSpeed;
  command.angularCmd = angularDir * targetOmegaDeg * RAD_PER_DEG;
  if (!comboActive && now - command.linearAt > options.holdMs) {
    command.linearDir = 0;
    command.linearHoldUntil = 0;
  }
  if (!comboActive && now - command.angularAt > options.holdMs) {
    command.angularDir = 0;
    command.angularHoldUntil = 0;
  }
  if (!linearDir && now - command.linearAt > options.comboHoldMs) {
    command.linearDir = 0;
    command.linearHoldUntil = 0;
  }
  if (!angularDir && now - command.angularAt > options.comboHoldMs) {
    command.angularDir = 0;
    command.angularHoldUntil = 0;
  }
  sendMotion(command.linearCmd, command.angularCmd);
}

function shutdown() {
  if (closing) {
    return;
  }
  closing = true;
  if (renderTimer) clearInterval(renderTimer);
  if (pollTimer) clearInterval(pollTimer);
  if (sendTimer) clearInterval(sendTimer);
  sendStop();
  for (const client of Object.values(clients)) {
    if (client.reconnectTimer) {
      clearTimeout(client.reconnectTimer);
    }
    if (client.socket && !client.socket.destroyed) {
      client.socket.destroy();
    }
  }
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  if (keyLog) {
    keyLog.write(`${JSON.stringify({ tsMs: Date.now(), event: 'stop' })}\n`);
    keyLog.end();
  }
  process.stdout.write('\x1b[?25h');
  process.exit(0);
}

function start() {
  process.stdout.write('\x1b[?25l');
  openKeyLog();
  installKeyHandler();
  pollTimer = setInterval(() => {
    clients.state.send(API.robot_status_all1_req, null);
  }, options.pollMs);
  sendTimer = setInterval(tickCommand, options.sendMs);
  renderTimer = setInterval(render, 100);
  render();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
