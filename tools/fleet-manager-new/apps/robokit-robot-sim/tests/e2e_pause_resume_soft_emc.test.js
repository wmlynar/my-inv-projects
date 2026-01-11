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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'robokit-pause-map-'));
  const mapPath = path.join(dir, 'pause-map.json');
  const map = {
    meta: {
      mapName: 'pause-map',
      mapType: '2D-Map',
      version: '1.0.0'
    },
    nodes: [
      { id: 'A', className: 'LocationMark', pos: { x: 0, y: 0 } },
      { id: 'B', className: 'LocationMark', pos: { x: 4, y: 0 } },
      { id: 'C', className: 'LocationMark', pos: { x: 4, y: 4 } }
    ],
    edges: [
      { id: 'A-B', start: 'A', end: 'B', startPos: { x: 0, y: 0 }, endPos: { x: 4, y: 0 }, props: {} },
      { id: 'B-C', start: 'B', end: 'C', startPos: { x: 4, y: 0 }, endPos: { x: 4, y: 4 }, props: {} }
    ],
    lines: [],
    areas: [],
    bins: []
  };
  fs.writeFileSync(mapPath, JSON.stringify(map), 'utf8');
  return mapPath;
}

async function waitForMovement(port, start, minDist, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await wait(150);
    const loc = await request(port, API.robot_status_loc_req, {});
    const dist = Math.hypot(loc.x - start.x, loc.y - start.y);
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
    await waitForPort(ports.TASK, HOST);
    await waitForPort(ports.CONFIG, HOST);
    await waitForPort(ports.STATE, HOST);
    await waitForPort(ports.OTHER, HOST);

    const lockRes = await request(ports.CONFIG, API.robot_config_req_4005, { nick_name: 'e2e' });
    assert(lockRes && lockRes.ret_code === 0, 'lock failed');

    const goRes = await request(ports.TASK, API.robot_task_gotarget_req, { id: 'C' });
    assert(goRes && goRes.ret_code === 0, 'goTarget failed');

    const startLoc = await request(ports.STATE, API.robot_status_loc_req, {});
    await waitForMovement(ports.STATE, startLoc, 0.2, 5000);

    const pauseRes = await request(ports.TASK, API.robot_task_pause_req, {});
    assert(pauseRes && pauseRes.ret_code === 0, 'pause rejected');
    const pausedLoc = await request(ports.STATE, API.robot_status_loc_req, {});
    await wait(500);
    const pausedLocAfter = await request(ports.STATE, API.robot_status_loc_req, {});
    const pausedMove = Math.hypot(pausedLocAfter.x - pausedLoc.x, pausedLocAfter.y - pausedLoc.y);
    assert(pausedMove < 0.02, 'robot moved during pause');

    const resumeRes = await request(ports.TASK, API.robot_task_resume_req, {});
    assert(resumeRes && resumeRes.ret_code === 0, 'resume rejected');
    await waitForMovement(ports.STATE, pausedLocAfter, 0.05, 4000);

    const softOn = await request(ports.OTHER, API.robot_other_softemc_req, { status: true });
    assert(softOn && softOn.ret_code === 0, 'soft emc enable rejected');
    const softLoc = await request(ports.STATE, API.robot_status_loc_req, {});
    await wait(400);
    const softLocAfter = await request(ports.STATE, API.robot_status_loc_req, {});
    const softMove = Math.hypot(softLocAfter.x - softLoc.x, softLocAfter.y - softLoc.y);
    assert(softMove < 0.02, 'robot moved during soft emc');

    const softOff = await request(ports.OTHER, API.robot_other_softemc_req, { status: false });
    assert(softOff && softOff.ret_code === 0, 'soft emc disable rejected');
    await waitForMovement(ports.STATE, softLocAfter, 0.05, 4000);

    console.log('e2e_pause_resume_soft_emc.test ok');
  } catch (err) {
    console.error('e2e_pause_resume_soft_emc.test failed');
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
