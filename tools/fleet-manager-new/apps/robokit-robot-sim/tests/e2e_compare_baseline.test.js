const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const { encodeFrame, responseApi, RbkParser, API } = require('../../../packages/robokit-lib/rbk');
const { findFreeRobokitPorts } = require('./helpers/ports');

const HOST = '127.0.0.1';
const BASE_REF = process.env.SIM_COMPARE_BASE_REF || '';
const BASE_PATH = process.env.SIM_COMPARE_BASE_PATH || '';
const MAP_SPEED_M_S = 1.5;

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

function arrayEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'robokit-compare-map-'));
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
      { id: 'A-B', start: 'A', end: 'B', startPos: { x: 0, y: 0 }, endPos: { x: 5, y: 0 }, props: {} },
      { id: 'B-C', start: 'B', end: 'C', startPos: { x: 5, y: 0 }, endPos: { x: 10, y: 0 }, props: {} },
      { id: 'C-D', start: 'C', end: 'D', startPos: { x: 10, y: 0 }, endPos: { x: 15, y: 0 }, props: {} }
    ],
    lines: [],
    areas: [],
    bins: []
  };
  fs.writeFileSync(mapPath, JSON.stringify(map), 'utf8');
  return mapPath;
}

function resolveAppDir(rootPath) {
  const direct = path.join(rootPath, 'start.js');
  if (fs.existsSync(direct)) {
    return rootPath;
  }
  const nested = path.join(rootPath, 'apps', 'robokit-robot-sim', 'start.js');
  if (fs.existsSync(nested)) {
    return path.dirname(nested);
  }
  throw new Error(`robokit-robot-sim not found at ${rootPath}`);
}

function createBaselineWorktree(repoRoot, ref) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'robokit-sim-base-'));
  execFileSync('git', ['worktree', 'add', '--detach', dir, ref], { cwd: repoRoot, stdio: 'ignore' });
  return dir;
}

function removeBaselineWorktree(repoRoot, worktreePath) {
  try {
    execFileSync('git', ['worktree', 'remove', '--force', worktreePath], { cwd: repoRoot, stdio: 'ignore' });
  } catch (_err) {
    // ignore
  }
  try {
    fs.rmSync(worktreePath, { recursive: true, force: true });
  } catch (_err) {
    // ignore
  }
}

async function runScenario({ label, appDir, ports, mapPath, startPose, startNodeId, targetId }) {
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
      SPEED_M_S: String(MAP_SPEED_M_S),
      ACCEL_M_S2: '2',
      DECEL_M_S2: '2',
      MAP_PATH: mapPath,
      START_NODE_ID: startNodeId,
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

  const trace = {
    label,
    pathNodes: [],
    stations: [],
    finalStation: null,
    teleportDetected: false
  };

  try {
    await waitForPort(ports.TASK, HOST);
    await waitForPort(ports.CONFIG, HOST);

    const lockRes = await request(ports.CONFIG, API.robot_config_req_4005, { nick_name: 'compare' });
    assert(lockRes && lockRes.ret_code === 0, `${label}: lock failed`);

    const goRes = await request(ports.TASK, API.robot_task_gotarget_req, { id: targetId });
    assert(goRes && goRes.ret_code === 0, `${label}: goTarget failed`);
    trace.pathNodes = Array.isArray(goRes.path_nodes) ? goRes.path_nodes : [];

    const allowedStations = new Set(trace.pathNodes);
    let enforceStations = false;
    let prevLoc = await request(ports.STATE, API.robot_status_loc_req, {});
    let prevTime = Date.now();
    let prevSpeed = 0;
    let prevStation = prevLoc && prevLoc.current_station ? prevLoc.current_station : '';

    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      await wait(250);
      const loc = await request(ports.STATE, API.robot_status_loc_req, {});
      const task = await request(ports.STATE, API.robot_status_task_req, {});
      const speed = await request(ports.STATE, API.robot_status_speed_req, {});

      const now = Date.now();
      if (prevLoc && Number.isFinite(prevLoc.x) && Number.isFinite(loc.x)) {
        const dtSec = Math.max(0.05, (now - prevTime) / 1000);
        const stepDist = Math.hypot(loc.x - prevLoc.x, loc.y - prevLoc.y);
        const vx = speed && Number.isFinite(speed.vx) ? speed.vx : 0;
        const vy = speed && Number.isFinite(speed.vy) ? speed.vy : 0;
        const speedMag = Math.hypot(vx, vy);
        const maxSpeed = Math.max(speedMag, prevSpeed, MAP_SPEED_M_S * 0.2);
        const allowed = Math.max(0.2, maxSpeed * dtSec * 2 + 0.2);
        if (stepDist > allowed) {
          trace.teleportDetected = true;
        }
        prevSpeed = speedMag;
      }
      prevLoc = loc;
      prevTime = now;

      if (loc.current_station && allowedStations.has(loc.current_station)) {
        enforceStations = true;
      }
      if (enforceStations && loc.current_station && !allowedStations.has(loc.current_station)) {
        throw new Error(`${label}: current_station off route: ${loc.current_station}`);
      }
      if (loc.current_station && loc.current_station !== prevStation) {
        trace.stations.push(loc.current_station);
        prevStation = loc.current_station;
      }

      if (task.task_status === 4 || loc.current_station === targetId) {
        trace.finalStation = loc.current_station || targetId;
        break;
      }
    }

    if (!trace.finalStation) {
      trace.finalStation = prevStation || null;
    }
    return trace;
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
  if (!BASE_REF && !BASE_PATH) {
    console.log('e2e_compare_baseline.test skipped (set SIM_COMPARE_BASE_REF or SIM_COMPARE_BASE_PATH)');
    return;
  }

  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  let worktreePath = null;
  let baseRoot = BASE_PATH;
  if (!baseRoot && BASE_REF) {
    worktreePath = createBaselineWorktree(repoRoot, BASE_REF);
    baseRoot = worktreePath;
  }

  const currentAppDir = resolveAppDir(path.resolve(__dirname, '..'));
  const baseAppDir = resolveAppDir(baseRoot);
  const mapPath = createTempMap();

  try {
    const scenario = {
      startPose: { x: 0, y: 0, angle: 0 },
      startNodeId: 'A',
      targetId: 'D'
    };
    const scenarioOff = {
      startPose: { x: -4, y: 3, angle: 0 },
      startNodeId: 'ISLAND',
      targetId: 'D'
    };

    const basePortsOn = (await findFreeRobokitPorts({ host: HOST })).ports;
    const currentPortsOn = (await findFreeRobokitPorts({ host: HOST })).ports;
    const baseTrace = await runScenario({
      label: 'baseline_on_graph',
      appDir: baseAppDir,
      ports: basePortsOn,
      mapPath,
      ...scenario
    });
    const newTrace = await runScenario({
      label: 'current_on_graph',
      appDir: currentAppDir,
      ports: currentPortsOn,
      mapPath,
      ...scenario
    });

    assert(arrayEqual(baseTrace.pathNodes, newTrace.pathNodes), 'path_nodes mismatch on-graph');
    assert(arrayEqual(baseTrace.stations, newTrace.stations), 'station sequence mismatch on-graph');
    assert(baseTrace.finalStation === newTrace.finalStation, 'final station mismatch on-graph');
    assert(baseTrace.teleportDetected === newTrace.teleportDetected, 'teleport mismatch on-graph');

    const basePortsOff = (await findFreeRobokitPorts({ host: HOST })).ports;
    const currentPortsOff = (await findFreeRobokitPorts({ host: HOST })).ports;
    const baseOff = await runScenario({
      label: 'baseline_off_graph',
      appDir: baseAppDir,
      ports: basePortsOff,
      mapPath,
      ...scenarioOff
    });
    const newOff = await runScenario({
      label: 'current_off_graph',
      appDir: currentAppDir,
      ports: currentPortsOff,
      mapPath,
      ...scenarioOff
    });

    assert(arrayEqual(baseOff.pathNodes, newOff.pathNodes), 'path_nodes mismatch off-graph');
    assert(arrayEqual(baseOff.stations, newOff.stations), 'station sequence mismatch off-graph');
    assert(baseOff.finalStation === newOff.finalStation, 'final station mismatch off-graph');
    assert(baseOff.teleportDetected === newOff.teleportDetected, 'teleport mismatch off-graph');

    console.log('e2e_compare_baseline.test ok');
  } finally {
    if (worktreePath) {
      removeBaselineWorktree(repoRoot, worktreePath);
    }
  }
}

run().catch((err) => {
  console.error(err.stack || err.message || String(err));
  process.exit(1);
});
