const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { encodeFrame, responseApi, RbkParser, API } = require('../../../packages/robokit-lib/rbk');

const HOST = '127.0.0.1';
const ROTATE_SPEED_RAD_S = 1.0;

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'robokit-rotate-map-'));
  const mapPath = path.join(dir, 'rotate-map.json');
  const map = {
    meta: {
      mapName: 'rotate-map',
      mapType: '2D-Map',
      version: '1.0.0'
    },
    nodes: [
      { id: 'A', className: 'LocationMark', pos: { x: 0, y: 0 } },
      { id: 'B', className: 'LocationMark', pos: { x: 5, y: 0 } },
      { id: 'C', className: 'LocationMark', pos: { x: 5, y: 5 } }
    ],
    edges: [
      { id: 'A-B', start: 'A', end: 'B', startPos: { x: 0, y: 0 }, endPos: { x: 5, y: 0 }, props: {} },
      { id: 'B-C', start: 'B', end: 'C', startPos: { x: 5, y: 0 }, endPos: { x: 5, y: 5 }, props: {} }
    ],
    lines: [],
    areas: [],
    bins: []
  };
  fs.writeFileSync(mapPath, JSON.stringify(map), 'utf8');
  return mapPath;
}

function makePorts(base) {
  return {
    ROBOD: base,
    STATE: base + 4,
    CTRL: base + 5,
    TASK: base + 6,
    CONFIG: base + 7,
    KERNEL: base + 8,
    OTHER: base + 10,
    PUSH: base + 11
  };
}

async function run() {
  const basePort = 36000 + Math.floor(Math.random() * 20000);
  const ports = makePorts(basePort);
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
      SPEED_M_S: '1.0',
      ACCEL_M_S2: '1.5',
      DECEL_M_S2: '1.5',
      ROTATE_SPEED_RAD_S: String(ROTATE_SPEED_RAD_S),
      ROT_ACCEL_RAD_S2: '2.4',
      ROT_DECEL_RAD_S2: '3.2',
      MAP_PATH: mapPath,
      START_NODE_ID: 'A',
      START_POSE_X: '0',
      START_POSE_Y: '0',
      START_POSE_ANGLE: String(Math.PI),
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

    const lockRes = await request(ports.CONFIG, API.robot_config_req_4005, { nick_name: 'e2e' });
    assert(lockRes && lockRes.ret_code === 0, 'lock failed');

    const goRes = await request(ports.TASK, API.robot_task_gotarget_req, { id: 'C' });
    assert(goRes && goRes.ret_code === 0, 'goTarget failed');
    assert(Array.isArray(goRes.path_nodes) && goRes.path_nodes.length >= 2, 'missing path_nodes');

    let prevLoc = await request(ports.STATE, API.robot_status_loc_req, {});
    let prevTime = Date.now();
    let sawRotation = false;

    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      await wait(200);
      const loc = await request(ports.STATE, API.robot_status_loc_req, {});
      const speed = await request(ports.STATE, API.robot_status_speed_req, {});

      const now = Date.now();
      const dtSec = Math.max(0.05, (now - prevTime) / 1000);
      if (prevLoc && Number.isFinite(prevLoc.angle) && Number.isFinite(loc.angle)) {
        const delta = normalizeAngle(loc.angle - prevLoc.angle);
        const vx = speed && Number.isFinite(speed.vx) ? speed.vx : 0;
        const vy = speed && Number.isFinite(speed.vy) ? speed.vy : 0;
        const linearSpeed = Math.hypot(vx, vy);
        if (linearSpeed < 0.05) {
          const maxDelta = ROTATE_SPEED_RAD_S * dtSec * 1.6 + 0.05;
          assert(
            Math.abs(delta) <= maxDelta,
            `rotation teleport: ${Math.abs(delta).toFixed(2)}rad in ${dtSec.toFixed(2)}s`
          );
          if (Math.abs(delta) > 0.02) {
            sawRotation = true;
          }
        }
      }

      if (loc.current_station === 'C') {
        break;
      }
      prevLoc = loc;
      prevTime = now;
    }

    assert(sawRotation, 'did not observe in-place rotation');
    console.log('e2e_rotate_no_teleport.test ok');
  } catch (err) {
    console.error('e2e_rotate_no_teleport.test failed');
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
