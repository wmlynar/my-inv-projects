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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'robokit-manual-map-'));
  const mapPath = path.join(dir, 'manual-map.json');
  const map = {
    meta: {
      mapName: 'manual-map',
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

async function waitForMovement(port, reference, minDist, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await wait(150);
    const loc = await request(port, API.robot_status_loc_req, {});
    const dist = Math.hypot(loc.x - reference.x, loc.y - reference.y);
    if (dist >= minDist) {
      return loc;
    }
  }
  throw new Error('movement did not start');
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
      ACCEL_M_S2: '1.2',
      DECEL_M_S2: '1.2',
      MAP_PATH: mapPath,
      START_NODE_ID: 'A',
      REQUIRE_LOCK_FOR_CONTROL: 'true',
      REQUIRE_LOCK_FOR_NAV: 'true',
      MANUAL_CONTROL_DEADBAND: '0.05'
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
    await waitForPort(ports.TASK, HOST);
    await waitForPort(ports.CONFIG, HOST);
    await waitForPort(ports.CTRL, HOST);
    await waitForPort(ports.STATE, HOST);

    const lockRes = await request(ports.CONFIG, API.robot_config_req_4005, { nick_name: 'e2e' });
    assert(lockRes && lockRes.ret_code === 0, 'lock failed');

    const goRes = await request(ports.TASK, API.robot_task_gotarget_req, { id: 'B' });
    assert(goRes && goRes.ret_code === 0, 'goTarget failed');

    const startLoc = await request(ports.STATE, API.robot_status_loc_req, {});
    await waitForMovement(ports.STATE, startLoc, 0.2, 5000);

    const deadbandRes = await request(ports.CTRL, API.robot_control_motion_req, {
      vx: 0.01,
      vy: 0,
      w: 0,
      steer: 0,
      real_steer: 0
    });
    assert(deadbandRes && deadbandRes.ret_code === 0, 'deadband control rejected');
    await wait(250);
    const taskAfterDeadband = await request(ports.STATE, API.robot_status_task_req, { simple: true });
    assert(taskAfterDeadband && taskAfterDeadband.task_status === 2, 'task should remain active after deadband');

    const locAfterDeadband = await request(ports.STATE, API.robot_status_loc_req, {});
    await wait(350);
    const locAfterDeadband2 = await request(ports.STATE, API.robot_status_loc_req, {});
    const distAfterDeadband = Math.hypot(
      locAfterDeadband2.x - locAfterDeadband.x,
      locAfterDeadband2.y - locAfterDeadband.y
    );
    assert(distAfterDeadband > 0.05, 'robot should continue task after deadband');

    const manualRes = await request(ports.CTRL, API.robot_control_motion_req, {
      vx: 0.4,
      vy: 0,
      w: 0,
      steer: 0.4,
      real_steer: 0
    });
    assert(manualRes && manualRes.ret_code === 0, 'manual override rejected');
    await wait(250);
    const taskAfterManual = await request(ports.STATE, API.robot_status_task_req, { simple: true });
    assert(taskAfterManual && taskAfterManual.task_status !== 2, 'task should be cancelled by manual override');

    const arcStart = await request(ports.STATE, API.robot_status_loc_req, {});
    await wait(700);
    const arcMid = await request(ports.STATE, API.robot_status_loc_req, {});
    const arcDelta = normalizeAngle((arcMid.angle || 0) - (arcStart.angle || 0));
    const arcDist = Math.hypot(arcMid.x - arcStart.x, arcMid.y - arcStart.y);
    assert(arcDist > 0.05, 'manual arc did not move');
    assert(arcDelta > 0.08, 'expected positive heading change for forward steer');

    const reverseRes = await request(ports.CTRL, API.robot_control_motion_req, {
      vx: -0.4,
      vy: 0,
      w: 0,
      steer: 0.4,
      real_steer: 0
    });
    assert(reverseRes && reverseRes.ret_code === 0, 'reverse steer rejected');
    await wait(700);
    const arcEnd = await request(ports.STATE, API.robot_status_loc_req, {});
    const revDelta = normalizeAngle((arcEnd.angle || 0) - (arcMid.angle || 0));
    const revDist = Math.hypot(arcEnd.x - arcMid.x, arcEnd.y - arcMid.y);
    assert(revDist > 0.05, 'reverse steer did not move');
    assert(revDelta < -0.05, 'expected negative heading change for reverse steer');

    console.log('e2e_manual_deadband_and_steer.test ok');
  } catch (err) {
    console.error('e2e_manual_deadband_and_steer.test failed');
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
