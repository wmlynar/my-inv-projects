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

function distancePointToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const abLenSq = abx * abx + aby * aby;
  if (abLenSq <= 0) {
    return Math.hypot(px - ax, py - ay);
  }
  const t = Math.max(0, Math.min(((px - ax) * abx + (py - ay) * aby) / abLenSq, 1));
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

function distanceToGraph(pos, edges) {
  let best = Number.POSITIVE_INFINITY;
  for (const edge of edges) {
    const start = edge.startPos;
    const end = edge.endPos;
    if (!start || !end) continue;
    const dist = distancePointToSegment(pos.x, pos.y, start.x, start.y, end.x, end.y);
    if (dist < best) {
      best = dist;
    }
  }
  return best;
}

function createTempMap() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'robokit-approach-transition-'));
  const mapPath = path.join(dir, 'approach-transition-map.json');
  const map = {
    meta: {
      mapName: 'approach-transition-map',
      mapType: '2D-Map',
      version: '1.0.0'
    },
    nodes: [
      { id: 'A', className: 'LocationMark', pos: { x: 0, y: 0 } },
      { id: 'B', className: 'LocationMark', pos: { x: 5, y: 0 } },
      { id: 'C', className: 'LocationMark', pos: { x: 10, y: 0 } }
    ],
    edges: [
      { id: 'A-B', start: 'A', end: 'B', startPos: { x: 0, y: 0 }, endPos: { x: 5, y: 0 }, props: {} },
      { id: 'B-C', start: 'B', end: 'C', startPos: { x: 5, y: 0 }, endPos: { x: 10, y: 0 }, props: {} }
    ],
    lines: [],
    areas: [],
    bins: []
  };
  fs.writeFileSync(mapPath, JSON.stringify(map), 'utf8');
  return { mapPath, edges: map.edges };
}

async function run() {
  const { ports } = await findFreeRobokitPorts({ host: HOST });
  const { mapPath, edges } = createTempMap();
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
      SPEED_M_S: '0.9',
      ACCEL_M_S2: '1.3',
      DECEL_M_S2: '1.3',
      MAP_PATH: mapPath,
      START_NODE_ID: 'A',
      START_POSE_X: '-8',
      START_POSE_Y: '4',
      START_POSE_ANGLE: '0',
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

    const lockRes = await request(ports.CONFIG, API.robot_config_req_4005, { nick_name: 'e2e' });
    assert(lockRes && lockRes.ret_code === 0, 'lock failed');

    const goRes = await request(ports.TASK, API.robot_task_gotarget_req, { id: 'C' });
    assert(goRes && goRes.ret_code === 0, 'goTarget failed');

    const initialTask = await request(ports.STATE, API.robot_status_task_req, {});
    const initialUnfinished = Array.isArray(initialTask.unfinished_path) ? initialTask.unfinished_path : [];
    assert(initialUnfinished.length === 0, 'expected empty unfinished_path during approach');

    let prevDist = null;
    let reachedGraph = false;
    let sawTransition = false;
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      await wait(200);
      const loc = await request(ports.STATE, API.robot_status_loc_req, {});
      const dist = distanceToGraph(loc, edges);
      if (prevDist !== null) {
        assert(dist <= prevDist + 0.3, `distance to graph increased too much: ${prevDist.toFixed(2)} -> ${dist.toFixed(2)}`);
      }
      prevDist = dist;

      const task = await request(ports.STATE, API.robot_status_task_req, {});
      const unfinished = Array.isArray(task.unfinished_path) ? task.unfinished_path : [];

      if (dist <= 0.5) {
        reachedGraph = true;
        if (unfinished.length > 0) {
          sawTransition = true;
          break;
        }
      } else {
        assert(unfinished.length === 0, 'unfinished_path should remain empty during approach');
      }
    }

    assert(reachedGraph, 'robot did not reach graph');
    assert(sawTransition, 'approach did not transition to graph segments');

    console.log('e2e_approach_transition.test ok');
  } catch (err) {
    console.error('e2e_approach_transition.test failed');
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
