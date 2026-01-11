const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const { encodeFrame, responseApi, RbkParser, API } = require('../../../packages/robokit-lib/rbk');

const HOST = '127.0.0.1';
const BASE_PORT = 30000 + Math.floor(Math.random() * 20000);
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

function dot(ax, ay, bx, by) {
  return ax * bx + ay * by;
}

async function assertManualMove({ vx, vy, w, label }) {
  const before = await request(PORTS.STATE, API.robot_status_loc_req, {});
  assert(before && Number.isFinite(before.x), `${label}: missing pose before`);

  const motionRes = await request(PORTS.CTRL, API.robot_control_motion_req, {
    vx,
    vy,
    w,
    steer: 0,
    real_steer: 0
  });
  assert(motionRes && motionRes.ret_code === 0, `${label}: control_motion rejected`);

  await wait(350);
  const after = await request(PORTS.STATE, API.robot_status_loc_req, {});
  assert(after && Number.isFinite(after.x), `${label}: missing pose after`);

  const dx = after.x - before.x;
  const dy = after.y - before.y;
  const moved = Math.hypot(dx, dy);
  assert(moved > 0.002, `${label}: no translation observed`);

  const cos = Math.cos(before.angle || 0);
  const sin = Math.sin(before.angle || 0);
  const worldVx = vx * cos - vy * sin;
  const worldVy = vx * sin + vy * cos;
  assert(dot(dx, dy, worldVx, worldVy) > 0, `${label}: moved opposite to expected direction`);
}

async function assertManualRotate({ w, label }) {
  const before = await request(PORTS.STATE, API.robot_status_loc_req, {});
  const motionRes = await request(PORTS.CTRL, API.robot_control_motion_req, {
    vx: 0,
    vy: 0,
    w,
    steer: 0,
    real_steer: 0
  });
  assert(motionRes && motionRes.ret_code === 0, `${label}: control_motion rejected`);

  await wait(300);
  const after = await request(PORTS.STATE, API.robot_status_loc_req, {});
  const diff = normalizeAngle((after.angle || 0) - (before.angle || 0));
  assert(Math.abs(diff) > 0.01, `${label}: no rotation observed`);
  assert(Math.sign(diff) === Math.sign(w), `${label}: rotation direction mismatch`);
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
      REQUIRE_LOCK_FOR_CONTROL: 'true'
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
    await waitForPort(PORTS.CTRL, HOST);
    const denied = await request(PORTS.CTRL, API.robot_control_motion_req, {
      vx: 0.2,
      vy: 0,
      w: 0,
      steer: 0,
      real_steer: 0
    });
    assert(denied && denied.ret_code === 60001, 'control_motion should be locked without seize control');

    const lockRes = await request(PORTS.CONFIG, API.robot_config_req_4005, { nick_name: 'e2e' });
    assert(lockRes && lockRes.ret_code === 0, 'lock failed');

    await assertManualMove({ vx: 0.4, vy: 0, w: 0, label: 'forward' });
    await assertManualMove({ vx: -0.3, vy: 0, w: 0, label: 'backward' });
    await assertManualMove({ vx: 0, vy: 0.3, w: 0, label: 'strafe_left' });
    await assertManualMove({ vx: 0, vy: -0.3, w: 0, label: 'strafe_right' });
    await assertManualMove({ vx: 0.25, vy: 0.25, w: 0, label: 'diagonal' });

    await assertManualRotate({ w: 0.6, label: 'rotate_left' });
    await assertManualRotate({ w: -0.6, label: 'rotate_right' });

    const stopRes = await request(PORTS.CTRL, API.robot_control_stop_req, {});
    assert(stopRes && stopRes.ret_code === 0, 'control_stop rejected');
    const stopBefore = await request(PORTS.STATE, API.robot_status_loc_req, {});
    await wait(250);
    const stopAfter = await request(PORTS.STATE, API.robot_status_loc_req, {});
    const stopDx = Math.abs(stopAfter.x - stopBefore.x);
    const stopDy = Math.abs(stopAfter.y - stopBefore.y);
    assert(stopDx + stopDy < 0.002, 'robot should remain stopped after control_stop');

    console.log('e2e_manual_control.test ok');
  } catch (err) {
    console.error('e2e_manual_control.test failed');
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
