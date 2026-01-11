const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const { encodeFrame, responseApi, RbkParser, API } = require('../../../packages/robokit-lib/rbk');
const { loadMapGraphLight } = require('../../../packages/robokit-lib/map_loader');

const HOST = '127.0.0.1';
const BASE_PORT = 41000 + Math.floor(Math.random() * 15000);
const MAX_SPEED_M_S = 1.2;
const PORTS = {
  ROBOD: BASE_PORT,
  STATE: BASE_PORT + 4,
  CTRL: BASE_PORT + 5,
  TASK: BASE_PORT + 6,
  CONFIG: BASE_PORT + 7,
  KERNEL: BASE_PORT + 8,
  OTHER: BASE_PORT + 10,
  PUSH: BASE_PORT + 11
};
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

async function run() {
  const graph = loadMapGraphLight(MAP_PATH);
  const nodePosById = new Map(
    (graph.nodes || [])
      .filter((node) => node && node.id && node.pos)
      .map((node) => [node.id, node.pos])
  );
  const targetNode = (graph.nodes || []).find((node) => node && node.id === 'LM6');
  assert(targetNode && targetNode.pos, 'missing LM6 in map');
  const targetPos = targetNode.pos;

  const appDir = path.resolve(__dirname, '..');
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
      SPEED_M_S: String(MAX_SPEED_M_S),
      ACCEL_M_S2: '1.5',
      DECEL_M_S2: '1.5',
      MAP_PATH: MAP_PATH,
      START_NODE_ID: 'AP9',
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
    await waitForPort(PORTS.CONFIG, HOST);
    await waitForPort(PORTS.STATE, HOST);

    const lockRes = await request(PORTS.CONFIG, API.robot_config_req_4005, { nick_name: 'e2e' });
    assert(lockRes && lockRes.ret_code === 0, 'lock failed');

    const preLoc = await request(PORTS.STATE, API.robot_status_loc_req, {});
    assert(preLoc && preLoc.current_station === 'AP9', 'expected current_station to be AP9 before goTarget');
    const preTask = await request(PORTS.STATE, API.robot_status_task_req, {});

    const goRes = await request(PORTS.TASK, API.robot_task_gotarget_req, { id: 'LM6' });
    assert(goRes && goRes.ret_code === 0, 'goTarget failed');
    assert(Array.isArray(goRes.path_nodes) && goRes.path_nodes.length >= 2, 'missing path_nodes');
    assert(goRes.path_nodes[0] === 'AP9', 'path does not start at AP9 (roboshop will appear to teleport)');
    assert(goRes.path_nodes[goRes.path_nodes.length - 1] === 'LM6', 'path does not end at LM6');

    const taskStatus = await request(PORTS.STATE, API.robot_status_task_req, {});
    assert(taskStatus && Array.isArray(taskStatus.unfinished_path), 'missing unfinished_path');
    if (taskStatus.unfinished_path.length > 0) {
      assert(
        taskStatus.unfinished_path[0] === 'AP9',
        'unfinished_path does not start at AP9 (roboshop will appear to teleport)'
      );
    }

    const postLoc = await request(PORTS.STATE, API.robot_status_loc_req, {});
    const jumpDist = Math.hypot(postLoc.x - preLoc.x, postLoc.y - preLoc.y);
    assert(jumpDist <= 0.2, `teleport detected immediately after goTarget: ${jumpDist.toFixed(2)}m`);
    const postTask = await request(PORTS.STATE, API.robot_status_task_req, {});

    const initialLoc = postLoc;
    let minDist = Math.hypot(initialLoc.x - targetPos.x, initialLoc.y - targetPos.y);
    let sawDecrease = false;
    let reached = false;
    let prevLoc = initialLoc;
    let prevTime = Date.now();
    let prevSpeed = 0;
    let prevUi = null;
    let prevUiTime = prevTime;

    const resolveUiPos = (loc, task) => {
      if (!loc) {
        return null;
      }
      const currentId = loc.current_station;
      if (currentId && nodePosById.has(currentId)) {
        const pos = nodePosById.get(currentId);
        return { x: pos.x, y: pos.y, source: 'current_station', id: currentId };
      }
      const unfinished = task && Array.isArray(task.unfinished_path) ? task.unfinished_path : [];
      if (unfinished.length > 0 && nodePosById.has(unfinished[0])) {
        const pos = nodePosById.get(unfinished[0]);
        return { x: pos.x, y: pos.y, source: 'unfinished_path', id: unfinished[0] };
      }
      if (Number.isFinite(loc.x) && Number.isFinite(loc.y)) {
        return { x: loc.x, y: loc.y, source: 'pose', id: '' };
      }
      return null;
    };

    const preUi = resolveUiPos(preLoc, preTask);
    const postUi = resolveUiPos(postLoc, postTask);
    if (preUi && postUi) {
      const uiJump = Math.hypot(postUi.x - preUi.x, postUi.y - preUi.y);
      assert(uiJump <= 0.2, `UI teleport detected right after goTarget (${preUi.source} -> ${postUi.source})`);
    }
    prevUi = postUi;
    prevUiTime = Date.now();

    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      await wait(250);
      const loc = await request(PORTS.STATE, API.robot_status_loc_req, {});
      const task = await request(PORTS.STATE, API.robot_status_task_req, {});
      const speed = await request(PORTS.STATE, API.robot_status_speed_req, {});

      const now = Date.now();
      const dtSec = Math.max(0.05, (now - prevTime) / 1000);
      const stepDist = Math.hypot(loc.x - prevLoc.x, loc.y - prevLoc.y);
      const vx = speed && Number.isFinite(speed.vx) ? speed.vx : 0;
      const vy = speed && Number.isFinite(speed.vy) ? speed.vy : 0;
      const speedMag = Math.hypot(vx, vy);
      const maxSpeed = Math.max(speedMag, prevSpeed, MAX_SPEED_M_S * 0.2);
      const allowed = Math.max(0.2, maxSpeed * dtSec * 2 + 0.2);
      assert(stepDist <= allowed, `teleport detected: ${stepDist.toFixed(2)}m in ${dtSec.toFixed(2)}s`);
      prevSpeed = speedMag;

      const uiPos = resolveUiPos(loc, task);
      if (prevUi && uiPos) {
        const uiDt = Math.max(0.05, (now - prevUiTime) / 1000);
        const uiStep = Math.hypot(uiPos.x - prevUi.x, uiPos.y - prevUi.y);
        const uiAllowed = Math.max(0.2, maxSpeed * uiDt * 2 + 0.2);
        assert(
          uiStep <= uiAllowed,
          `UI teleport detected: ${uiStep.toFixed(2)}m in ${uiDt.toFixed(2)}s (${prevUi.source} -> ${uiPos.source})`
        );
      }
      if (uiPos) {
        prevUi = uiPos;
        prevUiTime = now;
      }

      const dist = Math.hypot(loc.x - targetPos.x, loc.y - targetPos.y);
      if (dist < minDist - 0.05) {
        sawDecrease = true;
        minDist = dist;
      }

      if (loc.current_station === 'LM6' || dist < 0.25) {
        reached = true;
        break;
      }

      prevLoc = loc;
      prevTime = now;
    }

    assert(sawDecrease, 'distance to target did not decrease');
    assert(reached, 'robot did not reach LM6');

    console.log('e2e_ap9_to_lm6_no_teleport.test ok');
  } catch (err) {
    console.error('e2e_ap9_to_lm6_no_teleport.test failed');
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
