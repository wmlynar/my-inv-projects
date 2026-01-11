const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const { encodeFrame, responseApi, RbkParser } = require('../../../packages/robokit-lib/rbk');

const LOG_DIR = process.env.SIM_REPLAY_LOG_DIR;
const TIME_SCALE = Number.isFinite(Number(process.env.SIM_REPLAY_TIME_SCALE))
  ? Number(process.env.SIM_REPLAY_TIME_SCALE)
  : 1;
const TELEPORT_THRESHOLD_M = Number.isFinite(Number(process.env.SIM_REPLAY_TELEPORT_THRESHOLD_M))
  ? Number(process.env.SIM_REPLAY_TELEPORT_THRESHOLD_M)
  : 1.0;
const MAX_FRAME_SKIP = Number.isFinite(Number(process.env.SIM_REPLAY_MAX_SKIPPED))
  ? Number(process.env.SIM_REPLAY_MAX_SKIPPED)
  : 0;
const COMPARE_S2C = process.env.SIM_REPLAY_COMPARE !== 'false';
const FAIL_ON_DIFF = process.env.SIM_REPLAY_FAIL_ON_DIFF !== 'false';
const DIFF_MAX = Number.isFinite(Number(process.env.SIM_REPLAY_DIFF_MAX))
  ? Number(process.env.SIM_REPLAY_DIFF_MAX)
  : 20;
const NUM_TOL = Number.isFinite(Number(process.env.SIM_REPLAY_NUM_TOL))
  ? Number(process.env.SIM_REPLAY_NUM_TOL)
  : 1e-6;
const EXTRA_IGNORE_FIELDS = String(process.env.SIM_REPLAY_IGNORE_FIELDS || '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

const DEFAULT_IGNORE_FIELDS = [
  'create_on',
  'time',
  'total_time',
  'today_time',
  'odo',
  'today_odo',
  'battery_temp',
  'battery_cycle',
  'controller_temp',
  'controller_humi',
  'controller_voltage',
  'current',
  'voltage',
  'rssi',
  'acc_x',
  'acc_y',
  'acc_z',
  'roll',
  'pitch',
  'yaw',
  'qw',
  'qx',
  'qy',
  'qz',
  'imu_header',
  'current_ip',
  'current_lock.time_t'
];

const IGNORE_FIELDS = [...DEFAULT_IGNORE_FIELDS, ...EXTRA_IGNORE_FIELDS];

if (!LOG_DIR) {
  console.log('e2e_roboshop_replay.test skipped (set SIM_REPLAY_LOG_DIR)');
  process.exit(0);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForPort(port, host, timeoutMs = 4000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ host, port });
      socket.on('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`timeout waiting for port ${host}:${port}`));
          return;
        }
        setTimeout(attempt, 100);
      });
    };
    attempt();
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function stopChild(child) {
  return new Promise((resolve) => {
    if (!child || child.killed) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, 1000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    child.kill('SIGINT');
  });
}

function loadListeners(logDir) {
  const filePath = path.join(logDir, 'listeners.json5');
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function buildPortMap(listeners) {
  const map = new Map();
  for (const entry of listeners || []) {
    if (!entry || entry.protocol !== 'tcp') {
      continue;
    }
    const name = entry.name;
    if (!name) {
      continue;
    }
    const upstream = entry.upstream && entry.upstream.port;
    const listen = entry.listen && entry.listen.port;
    const port = Number.isFinite(upstream) ? upstream : listen;
    if (!Number.isFinite(port)) {
      continue;
    }
    map.set(name, port);
  }
  return map;
}

function readJsonLines(filePath, onLine) {
  const data = fs.readFileSync(filePath, 'utf8');
  const lines = data.split('\n').filter(Boolean);
  for (const line of lines) {
    let row = null;
    try {
      row = JSON.parse(line);
    } catch (_err) {
      continue;
    }
    onLine(row);
  }
}

function stripFields(value) {
  if (!value || typeof value !== 'object') {
    return value;
  }
  const clone = JSON.parse(JSON.stringify(value));
  for (const field of IGNORE_FIELDS) {
    const parts = field.split('.');
    let cursor = clone;
    for (let i = 0; i < parts.length - 1; i += 1) {
      if (!cursor || typeof cursor !== 'object') {
        cursor = null;
        break;
      }
      cursor = cursor[parts[i]];
    }
    if (cursor && typeof cursor === 'object') {
      delete cursor[parts[parts.length - 1]];
    }
  }
  return clone;
}

function diffValues(expected, actual, path, diffs) {
  if (diffs.length >= DIFF_MAX) {
    return;
  }
  if (expected === actual) {
    return;
  }
  const expType = typeof expected;
  const actType = typeof actual;
  if (expType === 'number' && actType === 'number') {
    if (Math.abs(expected - actual) <= NUM_TOL) {
      return;
    }
  }
  if (expected && actual && expType === 'object' && actType === 'object') {
    if (Array.isArray(expected) && Array.isArray(actual)) {
      if (expected.length !== actual.length) {
        diffs.push(`${path}: length ${expected.length} != ${actual.length}`);
        return;
      }
      const maxLen = Math.min(expected.length, actual.length);
      for (let i = 0; i < maxLen; i += 1) {
        diffValues(expected[i], actual[i], `${path}[${i}]`, diffs);
        if (diffs.length >= DIFF_MAX) return;
      }
      return;
    }
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
    for (const key of keys) {
      if (!(key in expected)) {
        diffs.push(`${path}.${key}: missing expected`);
        if (diffs.length >= DIFF_MAX) return;
        continue;
      }
      if (!(key in actual)) {
        diffs.push(`${path}.${key}: missing actual`);
        if (diffs.length >= DIFF_MAX) return;
        continue;
      }
      diffValues(expected[key], actual[key], `${path}.${key}`, diffs);
      if (diffs.length >= DIFF_MAX) return;
    }
    return;
  }
  diffs.push(`${path}: ${JSON.stringify(expected)} != ${JSON.stringify(actual)}`);
}

async function run() {
  const logDir = path.resolve(LOG_DIR);
  assert(fs.existsSync(logDir), `log dir not found: ${logDir}`);

  const listeners = loadListeners(logDir);
  const portMap = buildPortMap(listeners);
  const tcpDir = path.join(logDir, 'tcp');
  assert(fs.existsSync(tcpDir), `missing tcp dir: ${tcpDir}`);

  const events = [];
  const s2cRows = [];
  let firstStateStation = '';
  let skippedFrames = 0;
  const skipResponseKeys = new Set();

  for (const [listenerName, port] of portMap.entries()) {
    const dir = path.join(tcpDir, listenerName);
    if (!fs.existsSync(dir)) {
      continue;
    }
    const files = fs.readdirSync(dir).filter((name) => name.includes('frames_') && name.endsWith('.jsonl'));
    for (const file of files) {
      const filePath = path.join(dir, file);
      readJsonLines(filePath, (row) => {
        if (!row || !row.header || !row.header.apiNo) {
          return;
        }
        if (row.dir === 's2c') {
          s2cRows.push({ ...row, listenerName });
          if (!firstStateStation && row.json && row.json.current_station) {
            firstStateStation = row.json.current_station;
          }
          return;
        }
        if (row.dir === 'c2s' && !firstStateStation && row.json && row.json.current_station) {
          firstStateStation = row.json.current_station;
        }
        if (row.dir !== 'c2s') {
          return;
        }
        if (row.binaryTailBase64 && !row.rawFrameBase64) {
          skippedFrames += 1;
          if (row.header && Number.isFinite(row.header.apiNo) && Number.isFinite(row.header.seq)) {
            const responseKey = `${listenerName}:${row.connId}:${responseApi(row.header.apiNo)}:${row.header.seq}`;
            skipResponseKeys.add(responseKey);
          }
          return;
        }
        events.push({
          ts: row.tsMs,
          connKey: `${listenerName}:${row.connId}`,
          listenerName,
          port,
          apiNo: row.header.apiNo,
          seq: row.header.seq,
          json: row.json,
          jsonSizeHeader: row.header.jsonSizeHeader,
          rawFrameBase64: row.rawFrameBase64
        });
      });
    }
  }

  assert(events.length > 0, 'no replayable events found');
  if (MAX_FRAME_SKIP && skippedFrames > MAX_FRAME_SKIP) {
    throw new Error(`too many skipped frames: ${skippedFrames}`);
  }

  events.sort((a, b) => (a.ts - b.ts) || (a.connKey > b.connKey ? 1 : -1));

  const expectedResponses = new Map();
  let skippedExpected = 0;
  for (const row of s2cRows) {
    if (!row || !row.header || !Number.isFinite(row.header.apiNo) || !Number.isFinite(row.header.seq)) {
      continue;
    }
    const key = `${row.listenerName}:${row.connId}:${row.header.apiNo}:${row.header.seq}`;
    if (skipResponseKeys.has(key)) {
      skippedExpected += 1;
      continue;
    }
    const entry = {
      json: row.json,
      rawFrameBase64: row.rawFrameBase64
    };
    if (!expectedResponses.has(key)) {
      expectedResponses.set(key, []);
    }
    expectedResponses.get(key).push(entry);
  }

  const appDir = path.resolve(__dirname, '..');
  const env = {
    ...process.env,
    BIND_HOST: '127.0.0.1',
    HTTP_PORTS: '0',
    ADMIN_HTTP_PORT: '0',
    EVENT_LOG_STDOUT: 'false',
    EVENT_LOG_PATH: '',
    TICK_MS: '100'
  };

  if (firstStateStation) {
    env.START_NODE_ID = firstStateStation;
  }

  const defaultPorts = {
    robod: 19200,
    state: 19204,
    ctrl: 19205,
    task: 19206,
    config: 19207,
    kernel: 19208,
    other: 19210,
    push: 19301
  };
  const robodPort = portMap.get('robod') || defaultPorts.robod;
  const statePort = portMap.get('state') || defaultPorts.state;
  const ctrlPort = portMap.get('ctrl') || defaultPorts.ctrl;
  const taskPort = portMap.get('task') || defaultPorts.task;
  const configPort = portMap.get('config') || defaultPorts.config;
  const kernelPort = portMap.get('kernel') || defaultPorts.kernel;
  const otherPort = portMap.get('other') || defaultPorts.other;
  const pushPort = portMap.get('push') || defaultPorts.push;

  env.ROBOD_PORT = String(robodPort);
  env.STATE_PORT = String(statePort);
  env.CTRL_PORT = String(ctrlPort);
  env.TASK_PORT = String(taskPort);
  env.CONFIG_PORT = String(configPort);
  env.KERNEL_PORT = String(kernelPort);
  env.OTHER_PORT = String(otherPort);
  env.PUSH_PORT = String(pushPort);

  const portOverrides = new Map([
    ['robod', robodPort],
    ['state', statePort],
    ['ctrl', ctrlPort],
    ['task', taskPort],
    ['config', configPort],
    ['kernel', kernelPort],
    ['other', otherPort],
    ['push', pushPort]
  ]);

  for (const event of events) {
    const override = portOverrides.get(event.listenerName);
    if (Number.isFinite(override)) {
      event.port = override;
    }
  }

  assert(
    events.every((event) => Number.isFinite(event.port)),
    'missing port mapping for one or more events'
  );

  const child = spawn(process.execPath, [path.join(appDir, 'start.js')], {
    cwd: appDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let logs = '';
  child.stdout.on('data', (chunk) => {
    logs += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    logs += chunk.toString();
  });

  const connections = new Map();
  let loopError = null;
  let lastState = null;
  const mismatches = [];
  let comparedResponses = 0;
  let skippedComparisons = 0;

  const getConnection = async (connKey, port) => {
    if (connections.has(connKey)) {
      return connections.get(connKey);
    }
    const socket = net.createConnection({ host: '127.0.0.1', port });
    const parser = new RbkParser({ strictStartMark: true, maxBodyLength: 1024 * 1024 });
    socket.on('data', (chunk) => {
      let messages = [];
      try {
        messages = parser.push(chunk);
      } catch (err) {
        loopError = loopError || err;
        socket.destroy();
        return;
      }
      for (const msg of messages) {
        if (!msg || !msg.payload) {
          continue;
        }
        const payload = msg.payload;
        if (COMPARE_S2C) {
          const matchKey = `${connKey}:${msg.apiNo}:${msg.seq}`;
          const expectedQueue = expectedResponses.get(matchKey);
          if (expectedQueue && expectedQueue.length > 0) {
            const expected = expectedQueue.shift();
            if (expected && expected.json) {
              const expNorm = stripFields(expected.json);
              const actNorm = stripFields(payload);
              const diffs = [];
              diffValues(expNorm, actNorm, 'payload', diffs);
              comparedResponses += 1;
              if (diffs.length > 0) {
                mismatches.push({
                  key: matchKey,
                  diffs
                });
              }
            } else {
              skippedComparisons += 1;
            }
          }
        }
        if (Number.isFinite(payload.x) && Number.isFinite(payload.y)) {
          if (lastState) {
            const dist = Math.hypot(payload.x - lastState.x, payload.y - lastState.y);
            if (dist > TELEPORT_THRESHOLD_M) {
              loopError = loopError || new Error(`teleport detected: ${dist.toFixed(2)}m`);
            }
          }
          lastState = { x: payload.x, y: payload.y };
        }
      }
    });
    socket.on('error', (err) => {
      loopError = loopError || err;
    });
    connections.set(connKey, socket);
    await new Promise((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('error', reject);
    });
    return socket;
  };

  try {
    await waitForPort(robodPort, '127.0.0.1');
    await waitForPort(statePort, '127.0.0.1');
    await waitForPort(ctrlPort, '127.0.0.1');
    await waitForPort(taskPort, '127.0.0.1');
    await waitForPort(configPort, '127.0.0.1');

    const startTs = events[0].ts;
    const startAt = Date.now();
    for (const event of events) {
      if (loopError) {
        throw loopError;
      }
      const delta = (event.ts - startTs) / Math.max(0.1, TIME_SCALE);
      const targetAt = startAt + delta;
      const waitMs = targetAt - Date.now();
      if (waitMs > 1) {
        await wait(waitMs);
      }
      const socket = await getConnection(event.connKey, event.port);
      if (event.rawFrameBase64) {
        socket.write(Buffer.from(event.rawFrameBase64, 'base64'));
      } else {
        const payload = event.json === null || event.json === undefined ? null : event.json;
        const frame = encodeFrame(event.seq || 1, event.apiNo, payload, {
          jsonSize: event.jsonSizeHeader || 0
        });
        socket.write(frame);
      }
    }

    await wait(300);
    if (loopError) {
      throw loopError;
    }
    if (COMPARE_S2C) {
      let missingExpected = 0;
      for (const queue of expectedResponses.values()) {
        missingExpected += queue.length;
      }
      if (missingExpected > 0) {
        mismatches.push({
          key: 'missing_expected',
          diffs: [`missing ${missingExpected} expected responses`]
        });
      }
      if (mismatches.length > 0) {
        const preview = mismatches
          .slice(0, DIFF_MAX)
          .map((entry) => `${entry.key}: ${entry.diffs.join('; ')}`)
          .join('\n');
        console.error(`replay diff mismatches (${mismatches.length})`);
        if (preview) {
          console.error(preview);
        }
        if (FAIL_ON_DIFF) {
          throw new Error(`replay diff mismatches (${mismatches.length})`);
        }
      }
      if (skippedExpected || skippedComparisons) {
        console.log(
          `replay diff skipped expected=${skippedExpected} comparisons=${skippedComparisons} compared=${comparedResponses}`
        );
      }
    }
    console.log('e2e_roboshop_replay.test ok');
  } catch (err) {
    console.error('e2e_roboshop_replay.test failed');
    if (logs) {
      console.error(logs.trim());
    }
    throw err;
  } finally {
    for (const socket of connections.values()) {
      socket.destroy();
    }
    await stopChild(child);
  }
}

run().catch((err) => {
  console.error(err.stack || err.message || String(err));
  process.exit(1);
});
