const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { encodeFrame, responseApi, RbkParser, API } = require('../../../packages/robokit-lib/rbk');
const { findFreeRobokitPorts } = require('./helpers/ports');

const HOST = '127.0.0.1';

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

function sendFrame({ host, port, apiNo, payload }) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
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
  const msg = await sendFrame({ host: HOST, port, apiNo, payload });
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

async function waitForAngle(port, target, tolerance, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await wait(120);
    const loc = await request(port, API.robot_status_loc_req, {});
    const diff = Math.abs(normalizeAngle(target - (loc.angle || 0)));
    if (diff <= tolerance) {
      return loc;
    }
  }
  throw new Error('rotation did not reach target angle');
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

function createTempMap() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'robokit-rotate-forward-'));
  const mapPath = path.join(dir, 'rotate-forward-map.json');
  const map = {
    meta: {
      mapName: 'rotate-forward-map',
      mapType: '2D-Map',
      version: '1.0.0'
    },
    nodes: [
      { id: 'A', className: 'LocationMark', pos: { x: 0, y: 0 } },
      { id: 'B', className: 'LocationMark', pos: { x: 6, y: 0 } }
    ],
    edges: [
      { id: 'A-B', start: 'A', end: 'B', startPos: { x: 0, y: 0 }, endPos: { x: 6, y: 0 }, props: {} }
    ],
    lines: [],
    areas: [],
    bins: []
  };
  fs.writeFileSync(mapPath, JSON.stringify(map), 'utf8');
  return mapPath;
}

async function run() {
  const { ports } = await findFreeRobokitPorts({ host: HOST });
  const mapPath = createTempMap();
  const appDir = path.resolve(__dirname, '..');
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
      SPEED_M_S: '0.8',
      MAP_PATH: mapPath,
      START_NODE_ID: 'A',
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
    await waitForPort(ports.CTRL, HOST);
    await waitForPort(ports.STATE, HOST);

    const lockRes = await request(ports.CONFIG, API.robot_config_req_4005, { nick_name: 'e2e' });
    assert(lockRes && lockRes.ret_code === 0, 'lock failed');

    const rotateRes = await request(ports.CTRL, API.robot_control_motion_req, {
      vx: 0,
      vy: 0,
      w: 0.9,
      steer: 0,
      real_steer: 0
    });
    assert(rotateRes && rotateRes.ret_code === 0, 'rotation command rejected');

    await waitForAngle(ports.STATE, Math.PI / 2, 0.2);
    await request(ports.CTRL, API.robot_control_motion_req, {
      vx: 0,
      vy: 0,
      w: 0,
      steer: 0,
      real_steer: 0
    });
    await wait(200);

    const forwardRes = await request(ports.CTRL, API.robot_control_motion_req, {
      vx: 0.45,
      vy: 0,
      w: 0,
      steer: 0,
      real_steer: 0
    });
    assert(forwardRes && forwardRes.ret_code === 0, 'forward command rejected');

    let prevLoc = await request(ports.STATE, API.robot_status_loc_req, {});
    let sawMove = false;
    const sampleCount = 10;
    for (let i = 0; i < sampleCount; i += 1) {
      await wait(180);
      const loc = await request(ports.STATE, API.robot_status_loc_req, {});
      const dx = loc.x - prevLoc.x;
      const dy = loc.y - prevLoc.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.01) {
        sawMove = true;
        const motionAngle = Math.atan2(dy, dx);
        const diff = Math.abs(normalizeAngle(motionAngle - loc.angle));
        assert(diff < 0.35, `movement not aligned with heading (diff=${diff.toFixed(2)})`);
        const headingDelta = Math.abs(normalizeAngle(loc.angle - prevLoc.angle));
        assert(headingDelta < 0.25, `heading drift during forward motion (delta=${headingDelta.toFixed(2)})`);
      }
      prevLoc = loc;
    }
    assert(sawMove, 'no translation observed after rotate-then-forward');

    const stopRes = await request(ports.CTRL, API.robot_control_stop_req, {});
    assert(stopRes && stopRes.ret_code === 0, 'control_stop rejected');

    console.log('e2e_manual_rotate_then_forward.test ok');
  } catch (err) {
    console.error('e2e_manual_rotate_then_forward.test failed');
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
