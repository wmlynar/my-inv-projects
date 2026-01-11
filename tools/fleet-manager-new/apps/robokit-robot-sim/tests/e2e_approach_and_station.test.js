const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { encodeFrame, responseApi, RbkParser, API } = require('../../../packages/robokit-lib/rbk');

const HOST = '127.0.0.1';
const MAX_SPEED_M_S = 2;

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'robokit-sim-map-'));
  const mapPath = path.join(dir, 'test-map.json');
  const map = {
    meta: {
      mapName: 'test-map',
      mapType: '2D-Map',
      version: '1.0.0'
    },
    nodes: [
      { id: 'ISLAND', className: 'LocationMark', pos: { x: -20, y: 10 } },
      { id: 'A', className: 'LocationMark', pos: { x: 0, y: 0 } },
      { id: 'B', className: 'LocationMark', pos: { x: 5, y: 0 } },
      { id: 'C', className: 'LocationMark', pos: { x: 10, y: 0 } },
      { id: 'D', className: 'LocationMark', pos: { x: 15, y: 0 } },
      { id: 'X', className: 'ActionPoint', pos: { x: 7, y: 0.3 } }
    ],
    edges: [
      {
        id: 'A-B',
        start: 'A',
        end: 'B',
        startPos: { x: 0, y: 0 },
        endPos: { x: 5, y: 0 },
        props: { direction: 0, width: 1 }
      },
      {
        id: 'B-C',
        start: 'B',
        end: 'C',
        startPos: { x: 5, y: 0 },
        endPos: { x: 10, y: 0 },
        props: { direction: 0, width: 1 }
      },
      {
        id: 'C-D',
        start: 'C',
        end: 'D',
        startPos: { x: 10, y: 0 },
        endPos: { x: 15, y: 0 },
        props: { direction: 0, width: 1 }
      }
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

async function runScenario({ label, mapPath, startPose, targetId, assertNoReverse, assertNoTeleport }) {
  const basePort = 36000 + Math.floor(Math.random() * 20000);
  const ports = makePorts(basePort);
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
      SPEED_M_S: '2',
      ACCEL_M_S2: '2',
      DECEL_M_S2: '2',
      MAP_PATH: mapPath,
      START_NODE_ID: 'ISLAND',
      START_POSE_X: String(startPose.x),
      START_POSE_Y: String(startPose.y),
      START_POSE_ANGLE: String(startPose.angle || 0),
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
    assert(lockRes && lockRes.ret_code === 0, `${label}: lock failed`);

    const goRes = await request(ports.TASK, API.robot_task_gotarget_req, { id: targetId });
    assert(goRes && goRes.ret_code === 0, `${label}: goTarget failed`);
    assert(Array.isArray(goRes.path_nodes) && goRes.path_nodes.length >= 2, `${label}: missing path_nodes`);
    assert(goRes.path_nodes[goRes.path_nodes.length - 1] === targetId, `${label}: path end mismatch`);
    const islandIndex = goRes.path_nodes.indexOf('ISLAND');
    assert(islandIndex <= 0, `${label}: path should not include island except as start`);

    const allowedStations = new Set(goRes.path_nodes);
    let enforceRouteStations = false;
    const initialLoc = await request(ports.STATE, API.robot_status_loc_req, {});
    assert(initialLoc && Number.isFinite(initialLoc.x), `${label}: missing loc`);
    let prevLoc = initialLoc;
    let prevTime = Date.now();
    let prevSpeed = 0;

    if (assertNoTeleport) {
      await wait(200);
      const loc = await request(ports.STATE, API.robot_status_loc_req, {});
      const moved = Math.hypot(loc.x - initialLoc.x, loc.y - initialLoc.y);
      assert(moved < 1, `${label}: teleport detected (moved ${moved.toFixed(2)}m)`);
    }

    let minX = initialLoc.x;
    let sawProgress = false;
    let reached = false;
    let prevUnfinished = goRes.path_nodes.length;
    let minDist = Number.POSITIVE_INFINITY;
    const deadline = Date.now() + 15000;

    while (Date.now() < deadline) {
      await wait(250);
      const loc = await request(ports.STATE, API.robot_status_loc_req, {});
      const task = await request(ports.STATE, API.robot_status_task_req, {});
      const speed = await request(ports.STATE, API.robot_status_speed_req, {});
      const now = Date.now();
      if (assertNoTeleport && prevLoc && Number.isFinite(prevLoc.x) && Number.isFinite(loc.x)) {
        const dtSec = Math.max(0.05, (now - prevTime) / 1000);
        const stepDist = Math.hypot(loc.x - prevLoc.x, loc.y - prevLoc.y);
        const vx = speed && Number.isFinite(speed.vx) ? speed.vx : 0;
        const vy = speed && Number.isFinite(speed.vy) ? speed.vy : 0;
        const speedMag = Math.hypot(vx, vy);
        const maxSpeed = Math.max(speedMag, prevSpeed, MAX_SPEED_M_S * 0.2);
        const allowed = Math.max(0.2, maxSpeed * dtSec * 2 + 0.2);
        assert(stepDist <= allowed, `${label}: teleport detected ${stepDist.toFixed(2)}m in ${dtSec.toFixed(2)}s`);
        prevSpeed = speedMag;
      }
      prevLoc = loc;
      prevTime = now;

      if (Number.isFinite(loc.x) && loc.x < minX) {
        minX = loc.x;
      }
      if (loc.current_station && allowedStations.has(loc.current_station)) {
        enforceRouteStations = true;
      }
      if (sawProgress) {
        enforceRouteStations = true;
      }
      if (enforceRouteStations && loc.current_station && !allowedStations.has(loc.current_station)) {
        throw new Error(`${label}: current_station off route: ${loc.current_station}`);
      }
      const unfinished = Array.isArray(task.unfinished_path) ? task.unfinished_path : [];
      if (unfinished.length < prevUnfinished) {
        sawProgress = true;
        prevUnfinished = unfinished.length;
      }
      const dist = Math.hypot(loc.x - 15, loc.y - 0);
      if (dist < minDist) {
        minDist = dist;
      }
      if (task.task_status === 4 || loc.current_station === targetId || dist < 0.3) {
        reached = true;
        break;
      }
    }

    assert(sawProgress, `${label}: path did not progress`);
    assert(reached, `${label}: robot did not reach target`);
    if (assertNoReverse) {
      assert(minX >= initialLoc.x - 0.1, `${label}: robot reversed along edge`);
    }

    console.log(`${label} ok`);
  } catch (err) {
    console.error(`${label} failed`);
    if (logs) {
      console.error(logs.trim());
    }
    throw err;
  } finally {
    await stopChild(child);
  }
}

async function run() {
  const mapPath = createTempMap();
  await runScenario({
    label: 'e2e_approach_from_far',
    mapPath,
    startPose: { x: -4, y: 3, angle: 0 },
    targetId: 'D',
    assertNoReverse: false,
    assertNoTeleport: true
  });
  await runScenario({
    label: 'e2e_edge_no_reverse_and_station',
    mapPath,
    startPose: { x: 5.6, y: 0, angle: 0 },
    targetId: 'D',
    assertNoReverse: true,
    assertNoTeleport: true
  });
}

run().catch((err) => {
  console.error(err.stack || err.message || String(err));
  process.exit(1);
});
