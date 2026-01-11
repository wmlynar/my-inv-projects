const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const { encodeFrame, responseApi, RbkParser, API } = require('../../../packages/robokit-lib/rbk');
const MotionKernel = require('../../../packages/robokit-lib/motion_kernel');
const { loadMapGraphLight } = require('../../../packages/robokit-lib/map_loader');
const { createNavigation } = require('../../../packages/robokit-sim-core/core/navigation');
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

function pickPathPair(nodes, findPath) {
  let best = null;
  let bestDist = -1;
  let bestHasMulti = false;
  for (let i = 0; i < nodes.length; i += 1) {
    const a = nodes[i];
    for (let j = 0; j < nodes.length; j += 1) {
      if (i === j) continue;
      const b = nodes[j];
      const dx = a.pos.x - b.pos.x;
      const dy = a.pos.y - b.pos.y;
      const dist = Math.hypot(dx, dy);
      if (!Number.isFinite(dist) || dist < 0.5) {
        continue;
      }
      const path = findPath(a.id, b.id);
      if (!path || path.length < 2) {
        continue;
      }
      const hasMulti = path.length >= 3;
      if (hasMulti && (!bestHasMulti || dist > bestDist)) {
        best = { start: a, target: b, path };
        bestDist = dist;
        bestHasMulti = true;
        continue;
      }
      if (!bestHasMulti && dist > bestDist) {
        best = { start: a, target: b, path };
        bestDist = dist;
      }
    }
  }
  return best;
}

function validatePathEdges(pathNodes, edgesByKey) {
  for (let i = 0; i < pathNodes.length - 1; i += 1) {
    const from = pathNodes[i];
    const to = pathNodes[i + 1];
    if (!edgesByKey.has(`${from}->${to}`)) {
      throw new Error(`path edge missing: ${from} -> ${to}`);
    }
  }
}

async function run() {
  const graph = loadMapGraphLight(MAP_PATH);
  const allowedTypes = new Set(['LocationMark', 'ActionPoint', 'ChargePoint']);
  let candidates = graph.nodes.filter((node) => node && node.id && node.pos && allowedTypes.has(node.className));
  if (candidates.length === 0) {
    candidates = graph.nodes.filter((node) => node && node.id && node.pos);
  }
  assert(candidates.length >= 2, 'not enough map nodes for path test');

  const navigation = createNavigation({
    graph,
    motion: MotionKernel,
    pathSampleStep: 0.2,
    pathMinSamples: 12,
    pathMaxSamples: 120,
    lineMatchMaxDist: 0.6,
    lineMatchAngleDeg: 30
  });
  const pair = pickPathPair(candidates, navigation.findPath);
  assert(pair, 'no reachable path between nodes');

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
      SPEED_M_S: '1.2',
      ACCEL_M_S2: '1.5',
      DECEL_M_S2: '1.5',
      MAP_PATH: MAP_PATH,
      START_NODE_ID: pair.start.id,
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

    const denied = await request(PORTS.TASK, API.robot_task_gotarget_req, { id: pair.target.id });
    assert(denied && denied.ret_code === 60001, 'goTarget should be locked without seize control');

    const lockRes = await request(PORTS.CONFIG, API.robot_config_req_4005, { nick_name: 'e2e' });
    assert(lockRes && lockRes.ret_code === 0, 'lock failed');

    const goRes = await request(PORTS.TASK, API.robot_task_gotarget_req, { id: pair.target.id });
    assert(goRes && goRes.ret_code === 0, 'goTarget failed');
    assert(Array.isArray(goRes.path_nodes) && goRes.path_nodes.length >= 2, 'missing path_nodes');
    assert(goRes.path_nodes[0] === pair.start.id, 'path does not start at current node');
    assert(goRes.path_nodes[goRes.path_nodes.length - 1] === pair.target.id, 'path does not end at target');
    validatePathEdges(goRes.path_nodes, navigation.edgesByKey);

    const targetNode = navigation.nodesById.get(pair.target.id);
    assert(targetNode && targetNode.pos, 'missing target position');
    const targetPos = targetNode.pos;

  const initialLoc = await request(PORTS.STATE, API.robot_status_loc_req, {});
  let minDist = Math.hypot(initialLoc.x - targetPos.x, initialLoc.y - targetPos.y);
  let sawProgress = false;
  let sawDecrease = false;
  let reached = false;
  let prevUnfinished = goRes.path_nodes.length;
  let prevLoc = initialLoc;
  let prevTime = Date.now();
  let prevSpeed = 0;

  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    await wait(250);
    const loc = await request(PORTS.STATE, API.robot_status_loc_req, {});
    const task = await request(PORTS.STATE, API.robot_status_task_req, {});
    const speed = await request(PORTS.STATE, API.robot_status_speed_req, {});

    const now = Date.now();
    if (prevLoc && Number.isFinite(prevLoc.x) && Number.isFinite(loc.x)) {
      const dtSec = Math.max(0.05, (now - prevTime) / 1000);
      const stepDist = Math.hypot(loc.x - prevLoc.x, loc.y - prevLoc.y);
      const vx = speed && Number.isFinite(speed.vx) ? speed.vx : 0;
      const vy = speed && Number.isFinite(speed.vy) ? speed.vy : 0;
      const speedMag = Math.hypot(vx, vy);
      const maxSpeed = Math.max(speedMag, prevSpeed, MAX_SPEED_M_S * 0.2);
      const allowed = Math.max(0.2, maxSpeed * dtSec * 2 + 0.2);
      assert(stepDist <= allowed, `teleport detected: ${stepDist.toFixed(2)}m in ${dtSec.toFixed(2)}s`);
      prevSpeed = speedMag;
    }
    prevLoc = loc;
    prevTime = now;

    const unfinished = Array.isArray(task.unfinished_path) ? task.unfinished_path : [];
    if (unfinished.length < prevUnfinished) {
      sawProgress = true;
      prevUnfinished = unfinished.length;
    }

      const dist = Math.hypot(loc.x - targetPos.x, loc.y - targetPos.y);
      if (dist < minDist - 0.05) {
        sawDecrease = true;
        minDist = dist;
      }

      if (loc.current_station === pair.target.id || task.task_status === 4 || dist < 0.25) {
        reached = true;
        break;
      }
    }

    assert(sawProgress, 'path did not progress');
    assert(sawDecrease, 'distance to target did not decrease');
    assert(reached, 'robot did not reach target');

    console.log('e2e_path_navigation.test ok');
  } catch (err) {
    console.error('e2e_path_navigation.test failed');
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
