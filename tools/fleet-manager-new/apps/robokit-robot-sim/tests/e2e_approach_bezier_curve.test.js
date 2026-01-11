const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { encodeFrame, responseApi, RbkParser, API } = require('../../../packages/robokit-lib/rbk');
const MotionKernel = require('../../../packages/robokit-lib/motion_kernel');
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'robokit-approach-bezier-'));
  const mapPath = path.join(dir, 'approach-bezier-map.json');
  const map = {
    meta: {
      mapName: 'approach-bezier-map',
      mapType: '2D-Map',
      version: '1.0.0'
    },
    nodes: [
      { id: 'A', className: 'LocationMark', pos: { x: 0, y: 0 } },
      { id: 'B', className: 'LocationMark', pos: { x: 10, y: 0 } }
    ],
    edges: [
      { id: 'A-B', start: 'A', end: 'B', startPos: { x: 0, y: 0 }, endPos: { x: 10, y: 0 }, props: {} }
    ],
    lines: [],
    areas: [],
    bins: []
  };
  fs.writeFileSync(mapPath, JSON.stringify(map), 'utf8');
  return mapPath;
}

function distancePointToSegmentCoords(px, py, ax, ay, bx, by) {
  return MotionKernel.distancePointToSegmentCoords(px, py, ax, ay, bx, by);
}

function distanceToPolyline(pos, polyline) {
  const points = polyline.points || [];
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const dist = distancePointToSegmentCoords(pos.x, pos.y, a.x, a.y, b.x, b.y);
    if (dist < best) {
      best = dist;
    }
  }
  return best;
}

function buildExpectedCurve(start, end, entryHeading, mergeDist, controlScale, sampleStep) {
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const baseMin = Math.max(0.2, mergeDist * 0.5);
  const baseMax = Math.max(baseMin, mergeDist * 2.5);
  const controlDist = MotionKernel.clamp(distance * controlScale, baseMin, baseMax);
  const headingToEntry = Math.atan2(end.y - start.y, end.x - start.x);
  const startDir = { x: Math.cos(headingToEntry), y: Math.sin(headingToEntry) };
  const endDir = { x: Math.cos(entryHeading), y: Math.sin(entryHeading) };
  const p1 = { x: start.x + startDir.x * controlDist, y: start.y + startDir.y * controlDist };
  const p2 = { x: end.x - endDir.x * controlDist, y: end.y - endDir.y * controlDist };
  const samples = MotionKernel.clamp(Math.ceil(distance / sampleStep), 8, 40);
  const points = MotionKernel.sampleBezierPoints(start, p1, p2, end, samples);
  return MotionKernel.buildPolyline(points);
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
      ACCEL_M_S2: '1.0',
      DECEL_M_S2: '1.0',
      MAP_PATH: mapPath,
      START_NODE_ID: 'A',
      START_POSE_X: '0',
      START_POSE_Y: '4',
      START_POSE_ANGLE: '0.4',
      APPROACH_MERGE_DIST: '2',
      APPROACH_CONTROL_SCALE: '0.5',
      APPROACH_SAMPLE_STEP: '0.2',
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

    const goRes = await request(ports.TASK, API.robot_task_gotarget_req, { id: 'B' });
    assert(goRes && goRes.ret_code === 0, 'goTarget failed');

    const start = { x: 0, y: 4 };
    const entry = { x: 2, y: 0 };
    const entryHeading = 0;
    const expectedCurve = buildExpectedCurve(start, entry, entryHeading, 2, 0.5, 0.2);

    let prevDist = null;
    let samples = 0;
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      await wait(160);
      const loc = await request(ports.STATE, API.robot_status_loc_req, {});
      const distToGraph = Math.abs(loc.y);
      if (distToGraph <= 0.6) {
        break;
      }
      const curveDist = distanceToPolyline(loc, expectedCurve);
      assert(curveDist < 0.9, `approach deviated from bezier curve (dist=${curveDist.toFixed(2)})`);
      if (prevDist !== null) {
        assert(distToGraph <= prevDist + 0.3, 'distance to graph increased unexpectedly');
      }
      prevDist = distToGraph;
      samples += 1;
      if (samples >= 10) {
        break;
      }
    }

    assert(samples >= 4, 'insufficient approach samples to verify bezier path');

    console.log('e2e_approach_bezier_curve.test ok');
  } catch (err) {
    console.error('e2e_approach_bezier_curve.test failed');
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
