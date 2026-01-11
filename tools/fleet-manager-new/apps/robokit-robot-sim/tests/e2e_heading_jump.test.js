const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const { encodeFrame, responseApi, RbkParser, API } = require('../../../packages/robokit-lib/rbk');

const HOST = '127.0.0.1';
const BASE_PORT = 54000 + Math.floor(Math.random() * 5000);
const PORTS = {
  ROBOD: BASE_PORT,
  STATE: BASE_PORT + 4,
  CTRL: BASE_PORT + 5,
  TASK: BASE_PORT + 6,
  CONFIG: BASE_PORT + 7,
  KERNEL: BASE_PORT + 8,
  OTHER: BASE_PORT + 10,
  PUSH: BASE_PORT + 11
};

const KEEPALIVE_INTERVAL_MS = 100;
const STATE_INTERVAL_MS = 100;
const RUN_AFTER_TARGET_MS = 3500;
const ROTATE_SPEED_RAD_S = 1.2;
const ANGLE_MARGIN_RAD = 0.05;

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
    }, 1500);

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

function normalizeAngle(value) {
  let angle = value;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
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
  const appDir = path.resolve(__dirname, '..');
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
      ROTATE_SPEED_RAD_S: String(ROTATE_SPEED_RAD_S),
      START_NODE_ID: 'CP12',
      REQUIRE_LOCK_FOR_CONTROL: 'true',
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

  let stop = false;
  let loopError = null;
  let lastAngle = null;
  let lastTs = null;
  let samples = 0;

  const keepaliveLoop = async () => {
    while (!stop) {
      try {
        const res = await request(PORTS.CTRL, API.robot_control_motion_req, {
          vx: 0,
          vy: 0,
          w: 0,
          steer: 0,
          real_steer: 0
        });
        if (!res || res.ret_code !== 0) {
          throw new Error(`control_motion rejected: ${res ? res.ret_code : 'no_response'}`);
        }
      } catch (err) {
        loopError = loopError || err;
        stop = true;
        break;
      }
      await wait(KEEPALIVE_INTERVAL_MS);
    }
  };

  const stateLoop = async () => {
    while (!stop) {
      try {
        const res = await request(PORTS.STATE, API.robot_status_loc_req, {});
        if (res && Number.isFinite(res.angle)) {
          const now = Date.now();
          if (lastAngle !== null && lastTs !== null) {
            const dtSec = Math.max(0.05, (now - lastTs) / 1000);
            const delta = Math.abs(normalizeAngle(res.angle - lastAngle));
            const allowed = ROTATE_SPEED_RAD_S * dtSec + ANGLE_MARGIN_RAD;
            if (delta > allowed) {
              throw new Error(
                `angle jump detected: ${delta.toFixed(3)}rad in ${dtSec.toFixed(2)}s` +
                  ` (prev=${lastAngle.toFixed(3)} next=${res.angle.toFixed(3)} allowed=${allowed.toFixed(3)})`
              );
            }
          }
          lastAngle = res.angle;
          lastTs = now;
          samples += 1;
        }
      } catch (err) {
        loopError = loopError || err;
        stop = true;
        break;
      }
      await wait(STATE_INTERVAL_MS);
    }
  };

  try {
    await waitForPort(PORTS.CONFIG, HOST);
    await waitForPort(PORTS.STATE, HOST);
    await waitForPort(PORTS.CTRL, HOST);
    await waitForPort(PORTS.TASK, HOST);

    const lockRes = await request(PORTS.CONFIG, API.robot_config_req_4005, { nick_name: 'e2e' });
    assert(lockRes && lockRes.ret_code === 0, 'lock failed');

    const keepalivePromise = keepaliveLoop();
    const statePromise = stateLoop();

    await wait(300);
    const goRes = await request(PORTS.TASK, API.robot_task_gotarget_req, { id: 'LM7' });
    assert(goRes && goRes.ret_code === 0, 'goTarget failed');

    await wait(RUN_AFTER_TARGET_MS);
    stop = true;
    await Promise.all([keepalivePromise, statePromise]);

    if (loopError) {
      throw loopError;
    }
    assert(samples > 5, 'insufficient state samples');
    console.log('e2e_heading_jump.test ok');
  } catch (err) {
    console.error('e2e_heading_jump.test failed');
    if (logs) {
      console.error(logs.trim());
    }
    throw err;
  } finally {
    stop = true;
    await stopChild(child);
  }
}

run().catch((err) => {
  console.error(err.stack || err.message || String(err));
  process.exit(1);
});
