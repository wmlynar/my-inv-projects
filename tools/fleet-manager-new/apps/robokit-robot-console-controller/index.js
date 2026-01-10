#!/usr/bin/env node

'use strict';

const net = require('net');
const readline = require('readline');
const { API, PORTS, encodeFrame, responseApi, RbkParser } = require('../../packages/robokit-lib/rbk');

const DEFAULTS = {
  host: '127.0.0.1',
  statePort: PORTS.STATE,
  ctrlPort: PORTS.CTRL,
  otherPort: PORTS.OTHER,
  configPort: PORTS.CONFIG,
  nickName: 'console-controller',
  speed: 0.6,
  omegaDeg: 15,
  pollMs: 200,
  sendMs: 100,
  holdMs: 300,
  forkStep: 0.1
};

const DEG_PER_RAD = 180 / Math.PI;
const RAD_PER_DEG = Math.PI / 180;

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
      default:
        break;
    }
  }
  return args;
}

function printHelp() {
  const text = [
    'Usage:',
    '  node index.js [--host 127.0.0.1] [--state-port 19204] [--ctrl-port 19205] [--other-port 19210] [--config-port 19207]',
    '  --nick-name console-controller --speed 0.6 --omega-deg 15 --poll-ms 200 --send-ms 100',
    '',
    'Keys:',
    '  Enter: soft EMC on',
    '  Backspace: soft EMC off',
    '  Arrow Up/Down/Left/Right: move/rotate',
    '  Space: stop robot and forks',
    '  +/-: adjust target speed',
    '  Q/W: adjust target angular speed',
    '  A/Z: fork up/down',
    '  P/L: seize/release control',
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
  softEmc: false,
  lock: { locked: false, nickName: '' }
};

const command = {
  linear: 0,
  angular: 0,
  linearUntil: 0,
  angularUntil: 0
};

let targetSpeed = options.speed;
let targetOmegaDeg = options.omegaDeg;
let forkTarget = null;
let closing = false;
let renderTimer = null;
let pollTimer = null;
let sendTimer = null;

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
  ctrl: createClient('ctrl', options.ctrlPort),
  other: createClient('other', options.otherPort),
  config: createClient('config', options.configPort)
};

function updateStatus(payload) {
  if (!payload || typeof payload !== 'object') {
    return;
  }
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
  if (payload.soft_emc !== undefined) state.softEmc = Boolean(payload.soft_emc);
  if (payload.current_lock && typeof payload.current_lock === 'object') {
    state.lock.locked = Boolean(payload.current_lock.locked);
    state.lock.nickName = payload.current_lock.nick_name || '';
  }
  if (forkTarget === null && Number.isFinite(state.forkHeight)) {
    forkTarget = state.forkHeight;
  }
}

function handleFrame(client, msg) {
  if (!msg) {
    return;
  }
  if (client.name === 'state') {
    if (msg.apiNo === responseApi(API.robot_status_all1_req)) {
      updateStatus(msg.payload || {});
    }
  }
}

function sendMotion(vx, w) {
  clients.ctrl.send(API.robot_control_motion_req, {
    vx,
    vy: 0,
    w,
    steer: 0,
    real_steer: 0
  });
}

function sendSoftEmc(status) {
  clients.other.send(API.robot_other_softemc_req, { status: Boolean(status) });
  if (status) {
    command.linear = 0;
    command.angular = 0;
    command.linearUntil = 0;
    command.angularUntil = 0;
    sendMotion(0, 0);
  }
}

function sendStop() {
  command.linear = 0;
  command.angular = 0;
  command.linearUntil = 0;
  command.angularUntil = 0;
  clients.ctrl.send(API.robot_control_stop_req, null);
  clients.other.send(API.robot_other_forkstop_req, null);
  sendMotion(0, 0);
}

function sendForkHeight(height) {
  clients.other.send(API.robot_other_forkheight_req, { height });
}

function seizeControl() {
  clients.config.send(API.robot_config_req_4005, { nick_name: options.nickName });
}

function releaseControl() {
  clients.config.send(API.robot_config_req_4006, null);
}

function applyLinear(direction) {
  const now = Date.now();
  command.linear = direction * targetSpeed;
  command.linearUntil = now + options.holdMs;
}

function applyAngular(direction) {
  const now = Date.now();
  const omegaRad = targetOmegaDeg * RAD_PER_DEG;
  command.angular = direction * omegaRad;
  command.angularUntil = now + options.holdMs;
}

function refreshCommandSpeeds() {
  if (command.linear !== 0) {
    command.linear = Math.sign(command.linear) * targetSpeed;
  }
  if (command.angular !== 0) {
    const omegaRad = targetOmegaDeg * RAD_PER_DEG;
    command.angular = Math.sign(command.angular) * omegaRad;
  }
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

function installKeyHandler() {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.on('keypress', (str, key) => {
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
  const forkTargetText = Number.isFinite(forkTarget) ? formatNumber(forkTarget, 2) : formatNumber(state.forkHeight, 2);
  const statusAgeText = statusAge === null ? 'n/a' : `${statusAge.toFixed(1)}s`;

  const lines = [
    'Robokit Robot Console Controller',
    `Host: ${options.host} | Ports: state ${options.statePort} ctrl ${options.ctrlPort} other ${options.otherPort} config ${options.configPort}`,
    `Connections: state ${formatConn(clients.state)} | ctrl ${formatConn(clients.ctrl)} | other ${formatConn(clients.other)} | config ${formatConn(clients.config)}`,
    `Soft EMC: ${softEmcText} | Control: ${lockText} | Status age: ${statusAgeText}`,
    `Target speed: ${formatNumber(targetSpeed, 1)} m/s | Target angular: ${formatNumber(targetOmegaDeg, 0)} deg/s | Fork target: ${forkTargetText} m`,
    `Command: linear ${formatNumber(command.linear, 2)} m/s | angular ${formatNumber(command.angular * DEG_PER_RAD, 1)} deg/s`,
    `Actual: linear ${formatNumber(linearActual, 2)} m/s | angular ${formatNumber(angularActualDeg, 1)} deg/s`,
    `Pose: x ${formatNumber(state.x, 3)} y ${formatNumber(state.y, 3)} yaw ${formatNumber(yawDeg, 1)} deg`,
    `Stations: current ${state.currentStation || '-'} | last ${state.lastStation || '-'}`,
    'Keys: Enter soft-EMC ON | Backspace soft-EMC OFF | Space stop | P seize | L release',
    'Keys: Arrows move | +/- speed | Q/W angular | A/Z fork up/down | Ctrl+C exit'
  ];

  process.stdout.write('\x1b[2J\x1b[H' + lines.join('\n') + '\n');
}

function tickCommand() {
  const now = Date.now();
  if (command.linearUntil && now > command.linearUntil) {
    command.linear = 0;
    command.linearUntil = 0;
  }
  if (command.angularUntil && now > command.angularUntil) {
    command.angular = 0;
    command.angularUntil = 0;
  }
  sendMotion(command.linear, command.angular);
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
  process.stdout.write('\x1b[?25h');
  process.exit(0);
}

function start() {
  process.stdout.write('\x1b[?25l');
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
