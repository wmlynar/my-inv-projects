const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { encodeFrame, responseApi, RbkParser, API } = require('../../../packages/robokit-lib/rbk');
const { findFreeRobokitPorts } = require('./helpers/ports');

const HOST = '127.0.0.1';
const MAX_SPEED_M_S = 1.8;

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

function normalizeAngle(value) {
  let angle = value;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const abLenSq = abx * abx + aby * aby;
  if (abLenSq <= 0) {
    return { x: ax, y: ay, dist: Math.hypot(px - ax, py - ay) };
  }
  const t = Math.max(0, Math.min(((px - ax) * abx + (py - ay) * aby) / abLenSq, 1));
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return { x: cx, y: cy, dist: Math.hypot(px - cx, py - cy) };
}

function distanceToGraph(pos, edges) {
  let best = Number.POSITIVE_INFINITY;
  for (const edge of edges) {
    const start = edge.startPos || edge.start_pos;
    const end = edge.endPos || edge.end_pos;
    if (!start || !end) continue;
    const dist = distancePointToSegment(pos.x, pos.y, start.x, start.y, end.x, end.y);
    if (dist < best) {
      best = dist;
    }
  }
  return best;
}

function headingToGraph(pos, edges) {
  let best = null;
  for (const edge of edges) {
    const start = edge.startPos || edge.start_pos;
    const end = edge.endPos || edge.end_pos;
    if (!start || !end) continue;
    const projection = closestPointOnSegment(pos.x, pos.y, start.x, start.y, end.x, end.y);
    if (!best || projection.dist < best.dist) {
      best = projection;
    }
  }
  if (!best) {
    return pos.angle || 0;
  }
  return Math.atan2(best.y - pos.y, best.x - pos.x);
}

function createTempMap() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'robokit-approach-map-'));
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
      { id: 'D', className: 'LocationMark', pos: { x: 15, y: 0 } }
    ],
    edges: [
      { id: 'A-B', start: 'A', end: 'B', startPos: { x: 0, y: 0 }, endPos: { x: 5, y: 0 }, props: {} },
      { id: 'B-C', start: 'B', end: 'C', startPos: { x: 5, y: 0 }, endPos: { x: 10, y: 0 }, props: {} },
      { id: 'C-D', start: 'C', end: 'D', startPos: { x: 10, y: 0 }, endPos: { x: 15, y: 0 }, props: {} }
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
      SPEED_M_S: String(MAX_SPEED_M_S),
      ACCEL_M_S2: '1.5',
      DECEL_M_S2: '1.5',
      MAP_PATH: mapPath,
      START_NODE_ID: 'ISLAND',
      START_POSE_X: '-12',
      START_POSE_Y: '8',
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

    const lockRes = await request(ports.CONFIG, API.robot_config_req_4005, { nick_name: 'e2e' });
    assert(lockRes && lockRes.ret_code === 0, 'lock failed');

    const goRes = await request(ports.TASK, API.robot_task_gotarget_req, { id: 'D' });
    assert(goRes && goRes.ret_code === 0, 'goTarget failed');
    assert(Array.isArray(goRes.path_nodes) && goRes.path_nodes.length >= 2, 'missing path_nodes');
    const islandIndex = goRes.path_nodes.indexOf('ISLAND');
    assert(islandIndex <= 0, 'path should not include island except as start');

    const initialLoc = await request(ports.STATE, API.robot_status_loc_req, {});
    const initialDist = distanceToGraph(initialLoc, edges);
    assert(initialDist > 5, `expected to start far from graph (dist=${initialDist.toFixed(2)})`);
    const initialHeadingToGraph = headingToGraph(initialLoc, edges);
    const needsRotation = Math.abs(normalizeAngle(initialHeadingToGraph - initialLoc.angle)) > 0.2;

    let prevLoc = initialLoc;
    let prevTime = Date.now();
    let prevSpeed = 0;
    let prevDist = initialDist;
    let sawRotateInPlace = !needsRotation;
    let movementStarted = false;
    let sawApproach = false;
    let reachedGraph = false;
    let samplesAfterGraph = 0;
    const deadline = Date.now() + 20000;

    while (Date.now() < deadline) {
      await wait(150);
      const loc = await request(ports.STATE, API.robot_status_loc_req, {});
      const speed = await request(ports.STATE, API.robot_status_speed_req, {});

      const now = Date.now();
      const dtSec = Math.max(0.05, (now - prevTime) / 1000);
      const dx = loc.x - prevLoc.x;
      const dy = loc.y - prevLoc.y;
      const stepDist = Math.hypot(dx, dy);
      const angleDelta = Math.abs(normalizeAngle(loc.angle - prevLoc.angle));
      if (stepDist < 0.01 && angleDelta > 0.03) {
        sawRotateInPlace = true;
      }
      if (stepDist > 0.02) {
        const motionAngle = Math.atan2(dy, dx);
        const motionDiff = Math.abs(normalizeAngle(motionAngle - loc.angle));
        assert(motionDiff <= 0.35, `sideways motion detected (diff=${motionDiff.toFixed(2)}rad)`);
        if (!movementStarted) {
          movementStarted = true;
          if (needsRotation && !sawRotateInPlace) {
            const headingNow = headingToGraph(loc, edges);
            const alignDiff = Math.abs(normalizeAngle(headingNow - loc.angle));
            if (alignDiff > 0.25) {
              throw new Error('started moving before rotate in place');
            }
          }
        }
      }
      const vx = speed && Number.isFinite(speed.vx) ? speed.vx : 0;
      const vy = speed && Number.isFinite(speed.vy) ? speed.vy : 0;
      const speedMag = Math.hypot(vx, vy);
      const maxSpeed = Math.max(speedMag, prevSpeed, MAX_SPEED_M_S * 0.2);
      const allowedStep = Math.max(0.2, maxSpeed * dtSec * 2 + 0.2);
      assert(stepDist <= allowedStep, `teleport detected: ${stepDist.toFixed(2)}m in ${dtSec.toFixed(2)}s`);
      prevSpeed = speedMag;

      const dist = distanceToGraph(loc, edges);
      if (prevDist - dist > Math.max(0.4, maxSpeed * dtSec * 2 + 0.2)) {
        throw new Error(`graph distance jumped too fast: ${prevDist.toFixed(2)} -> ${dist.toFixed(2)}`);
      }
      if (dist < prevDist) {
        sawApproach = true;
      }
      if (dist <= 0.5) {
        reachedGraph = true;
        if (!samplesAfterGraph) {
          samplesAfterGraph = 6;
        }
      }
      if (samplesAfterGraph) {
        samplesAfterGraph -= 1;
        if (samplesAfterGraph <= 0) {
          break;
        }
      }

      prevLoc = loc;
      prevTime = now;
      prevDist = dist;
    }

    assert(sawApproach, 'distance to graph did not decrease');
    assert(reachedGraph, 'robot did not reach graph');

    console.log('e2e_approach_no_teleport.test ok');
  } catch (err) {
    console.error('e2e_approach_no_teleport.test failed');
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
