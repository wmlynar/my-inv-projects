const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const { encodeFrame, responseApi, RbkParser, API } = require('../../../packages/robokit-lib/rbk');
const { findFreeRobokitPorts } = require('./helpers/ports');

const HOST = '127.0.0.1';
const ROTATE_COMMAND_W = 3.0;
const ROTATE_DURATION_MS = 600;
const MOVE_VX = 1.0;
const MOVE_DURATION_MS = 300;
const ANGLE_DIFF_LIMIT = 0.35;

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
  const allocation = await findFreeRobokitPorts({ host: HOST });
  const ports = allocation.ports;
  const child = spawn(process.execPath, [path.join(appDir, 'start.js')], {
    cwd: appDir,
    env: {
      ...process.env,
      BIND_HOST: HOST,
      ROBOD_PORT: String(ports.ROBOD),
      STATE_PORT: String(ports.STATE),
      CTRL_PORT: String(ports.CTRL),
      TASK_PORT: String(ports.TASK),
      CONFIG_PORT: String(ports.CONFIG),
      KERNEL_PORT: String(ports.KERNEL),
      OTHER_PORT: String(ports.OTHER),
      PUSH_PORT: String(ports.PUSH),
      HTTP_PORTS: '0',
      ADMIN_HTTP_PORT: '0',
      EVENT_LOG_STDOUT: 'false',
      EVENT_LOG_PATH: '',
      TICK_MS: '100',
      ROTATE_SPEED_RAD_S: '1.0',
      START_NODE_ID: 'CP12',
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
    await waitForPort(ports.CONFIG, HOST);
    await waitForPort(ports.STATE, HOST);
    await waitForPort(ports.CTRL, HOST);

    const lockRes = await request(ports.CONFIG, API.robot_config_req_4005, { nick_name: 'e2e' });
    assert(lockRes && lockRes.ret_code === 0, 'lock failed');

    await request(ports.CTRL, API.robot_control_motion_req, {
      vx: 0,
      vy: 0,
      w: 0,
      steer: 0,
      real_steer: 0
    });
    await wait(150);

    const initialLoc = await request(ports.STATE, API.robot_status_loc_req, {});
    assert(initialLoc && Number.isFinite(initialLoc.angle), 'missing initial angle');

    const rotateRes = await request(ports.CTRL, API.robot_control_motion_req, {
      vx: 0,
      vy: 0,
      w: ROTATE_COMMAND_W,
      steer: 0,
      real_steer: 0
    });
    assert(rotateRes && rotateRes.ret_code === 0, 'rotation command rejected');
    await wait(ROTATE_DURATION_MS);

    const afterRotateLoc = await request(ports.STATE, API.robot_status_loc_req, {});
    assert(afterRotateLoc && Number.isFinite(afterRotateLoc.angle), 'missing angle after rotation');
    const rotateDelta = Math.abs(normalizeAngle(afterRotateLoc.angle - initialLoc.angle));
    assert(rotateDelta > 0.3, 'rotation did not advance enough');

    const moveRes = await request(ports.CTRL, API.robot_control_motion_req, {
      vx: MOVE_VX,
      vy: 0,
      w: 0,
      steer: 0,
      real_steer: 0
    });
    assert(moveRes && moveRes.ret_code === 0, 'forward command rejected');
    await wait(MOVE_DURATION_MS);

    const afterMoveLoc = await request(ports.STATE, API.robot_status_loc_req, {});
    assert(afterMoveLoc && Number.isFinite(afterMoveLoc.angle), 'missing angle after move');

    const dx = afterMoveLoc.x - afterRotateLoc.x;
    const dy = afterMoveLoc.y - afterRotateLoc.y;
    const dist = Math.hypot(dx, dy);
    assert(dist > 0.05, 'insufficient movement for heading check');

    const motionAngle = Math.atan2(dy, dx);
    const diff = Math.abs(normalizeAngle(motionAngle - afterMoveLoc.angle));
    assert(diff <= ANGLE_DIFF_LIMIT, `reported angle lagging behind motion (diff=${diff.toFixed(2)}rad)`);

    console.log('e2e_reported_angle_matches_motion.test ok');
  } catch (err) {
    console.error('e2e_reported_angle_matches_motion.test failed');
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
