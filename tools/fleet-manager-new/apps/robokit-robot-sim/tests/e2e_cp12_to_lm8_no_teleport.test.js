const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const { encodeFrame, responseApi, RbkParser, API } = require('../../../packages/robokit-lib/rbk');
const { loadMapGraphLight } = require('../../../packages/robokit-lib/map_loader');
const { findFreeRobokitPorts } = require('./helpers/ports');

const HOST = '127.0.0.1';
const MAX_SPEED_M_S = 1.2;
let PORTS = null;
const MAP_PATH = path.resolve(__dirname, '..', '..', '..', 'maps', 'sanden_smalll.smap');

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

function sendFrame({ port, apiNo, payload }) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: HOST, port });
    const parser = new RbkParser({ strictStartMark: true, maxBodyLength: 1024 * 1024 });
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`timeout waiting for response api ${apiNo}`));
    }, 2000);

    socket.on('connect', () => {
      const frame = encodeFrame(1, apiNo, payload || {});
      socket.write(frame);
    });

    socket.on('data', (chunk) => {
      let messages = [];
      try {
        messages = parser.push(chunk);
      } catch (err) {
        clearTimeout(timeout);
        socket.destroy();
        reject(err);
        return;
      }
      for (const msg of messages) {
        if (msg.apiNo !== responseApi(apiNo)) {
          continue;
        }
        clearTimeout(timeout);
        socket.end();
        resolve(msg);
        return;
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function request(port, apiNo, payload) {
  const msg = await sendFrame({ port, apiNo, payload });
  return msg.payload || null;
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

async function run() {
  const graph = loadMapGraphLight(MAP_PATH);
  const cp12 = (graph.nodes || []).find((node) => node && node.id === 'CP12');
  const lm8 = (graph.nodes || []).find((node) => node && node.id === 'LM8');
  assert(cp12 && cp12.pos, 'missing CP12 in map');
  assert(lm8 && lm8.pos, 'missing LM8 in map');

  const appDir = path.resolve(__dirname, '..');
  const allocation = await findFreeRobokitPorts({ host: HOST });
  PORTS = allocation.ports;
  const child = spawn(process.execPath, [path.join(appDir, 'start.js')], {
    cwd: appDir,
    env: {
      ...process.env,
      BIND_HOST: HOST,
      ROBOD_PORT: String(PORTS.ROBOD),
      STATE_PORT: String(PORTS.STATE),
      CTRL_PORT: String(PORTS.CTRL),
      TASK_PORT: String(PORTS.TASK),
      CONFIG_PORT: String(PORTS.CONFIG),
      KERNEL_PORT: String(PORTS.KERNEL),
      OTHER_PORT: String(PORTS.OTHER),
      PUSH_PORT: String(PORTS.PUSH),
      HTTP_PORTS: '0',
      ADMIN_HTTP_PORT: '0',
      EVENT_LOG_STDOUT: 'false',
      EVENT_LOG_PATH: '',
      TICK_MS: '100',
      SPEED_M_S: String(MAX_SPEED_M_S),
      ACCEL_M_S2: '1.5',
      DECEL_M_S2: '1.5',
      MAP_PATH: MAP_PATH,
      START_NODE_ID: 'CP12',
      REQUIRE_LOCK_FOR_NAV: 'true'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let logs = '';
  child.stdout.on('data', (chunk) => {
    logs += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    logs += chunk.toString();
  });

  try {
    await waitForPort(PORTS.TASK, HOST);
    await waitForPort(PORTS.CONFIG, HOST);
    await waitForPort(PORTS.STATE, HOST);

    const lockRes = await request(PORTS.CONFIG, API.robot_config_req_4005, { nick_name: 'e2e' });
    assert(lockRes && lockRes.ret_code === 0, 'lock failed');

    const pre = await request(PORTS.STATE, API.robot_status_all1_req, {});
    assert(pre && Number.isFinite(pre.x), 'missing initial state');
    assert(pre.current_station === 'CP12', 'expected current_station to be CP12 before goTarget');

    const goRes = await request(PORTS.TASK, API.robot_task_gotarget_req, { id: 'LM8' });
    assert(goRes && goRes.ret_code === 0, 'goTarget failed');

    const post = await request(PORTS.STATE, API.robot_status_all1_req, {});
    const initialJump = Math.hypot(post.x - pre.x, post.y - pre.y);
    assert(initialJump <= 0.2, `pose teleport detected after goTarget: ${initialJump.toFixed(2)}m`);

    let prev = post;
    let prevTime = Date.now();
    let prevSpeed = Math.hypot(post.vx || 0, post.vy || 0);
    const deadline = Date.now() + 8000;

    while (Date.now() < deadline) {
      await wait(200);
      const state = await request(PORTS.STATE, API.robot_status_all1_req, {});
      assert(state && Number.isFinite(state.x), 'missing state');

      const now = Date.now();
      const dtSec = Math.max(0.05, (now - prevTime) / 1000);
      const stepDist = Math.hypot(state.x - prev.x, state.y - prev.y);
      const vx = Number.isFinite(state.vx) ? state.vx : 0;
      const vy = Number.isFinite(state.vy) ? state.vy : 0;
      const speedMag = Math.hypot(vx, vy);
      const maxSpeed = Math.max(speedMag, prevSpeed, MAX_SPEED_M_S * 0.2);
      const allowed = Math.max(0.2, maxSpeed * dtSec * 2 + 0.2);
      assert(stepDist <= allowed, `pose teleport detected: ${stepDist.toFixed(2)}m in ${dtSec.toFixed(2)}s`);
      prevSpeed = speedMag;
      prev = state;
      prevTime = now;

      const dist = Math.hypot(state.x - lm8.pos.x, state.y - lm8.pos.y);
      if (state.current_station === 'LM8' || dist < 0.25) {
        break;
      }
    }

    console.log('e2e_cp12_to_lm8_no_teleport.test ok');
  } catch (err) {
    console.error('e2e_cp12_to_lm8_no_teleport.test failed');
    if (logs) {
      console.error(logs.trim());
    }
    throw err;
  } finally {
    await stopChild(child);
  }
}

run().catch((err) => {
  console.error(err.stack || err.message || String(err));
  process.exit(1);
});
