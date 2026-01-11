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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'robokit-replan-'));
  const mapPath = path.join(dir, 'replan-map.json');
  const map = {
    meta: {
      mapName: 'replan-map',
      mapType: '2D-Map',
      version: '1.0.0'
    },
    nodes: [
      { id: 'A', className: 'LocationMark', pos: { x: 0, y: 0 } },
      { id: 'B', className: 'LocationMark', pos: { x: 4, y: 0 } },
      { id: 'C', className: 'LocationMark', pos: { x: 8, y: 0 } },
      { id: 'D', className: 'LocationMark', pos: { x: 12, y: 0 } }
    ],
    edges: [
      { id: 'A-B', start: 'A', end: 'B', startPos: { x: 0, y: 0 }, endPos: { x: 4, y: 0 }, props: {} },
      { id: 'B-C', start: 'B', end: 'C', startPos: { x: 4, y: 0 }, endPos: { x: 8, y: 0 }, props: {} },
      { id: 'C-D', start: 'C', end: 'D', startPos: { x: 8, y: 0 }, endPos: { x: 12, y: 0 }, props: {} }
    ],
    lines: [],
    areas: [],
    bins: []
  };
  fs.writeFileSync(mapPath, JSON.stringify(map), 'utf8');
  return mapPath;
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
      SPEED_M_S: '1.0',
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

    const lockRes = await request(ports.CONFIG, API.robot_config_req_4005, { nick_name: 'e2e' });
    assert(lockRes && lockRes.ret_code === 0, 'lock failed');

    const firstRes = await request(ports.TASK, API.robot_task_gotarget_req, { id: 'D' });
    assert(firstRes && firstRes.ret_code === 0, 'goTarget D failed');
    assert(Array.isArray(firstRes.path_nodes), 'missing path_nodes for initial target');
    assert(firstRes.path_nodes[firstRes.path_nodes.length - 1] === 'D', 'initial path target mismatch');

    const startLoc = await request(ports.STATE, API.robot_status_loc_req, {});
    let moved = false;
    const moveDeadline = Date.now() + 5000;
    while (Date.now() < moveDeadline) {
      await wait(200);
      const loc = await request(ports.STATE, API.robot_status_loc_req, {});
      if (Math.hypot(loc.x - startLoc.x, loc.y - startLoc.y) > 0.3) {
        moved = true;
        break;
      }
    }
    assert(moved, 'robot did not start moving before replan');

    const secondRes = await request(ports.TASK, API.robot_task_gotarget_req, { id: 'C' });
    assert(secondRes && secondRes.ret_code === 0, 'goTarget C failed');
    assert(Array.isArray(secondRes.path_nodes), 'missing path_nodes for replan target');
    assert(secondRes.path_nodes[secondRes.path_nodes.length - 1] === 'C', 'replan path target mismatch');

    const targetC = { x: 8, y: 0 };
    const targetD = { x: 12, y: 0 };
    let reachedC = false;
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      await wait(250);
      const loc = await request(ports.STATE, API.robot_status_loc_req, {});
      const distC = Math.hypot(loc.x - targetC.x, loc.y - targetC.y);
      const distD = Math.hypot(loc.x - targetD.x, loc.y - targetD.y);
      if (distD < 0.4) {
        throw new Error('robot kept original target and reached D');
      }
      if (distC < 0.3) {
        reachedC = true;
        await wait(600);
        const stableLoc = await request(ports.STATE, API.robot_status_loc_req, {});
        const stableDistC = Math.hypot(stableLoc.x - targetC.x, stableLoc.y - targetC.y);
        assert(stableDistC < 0.45, 'robot did not stay near replanned target C');
        const task = await request(ports.STATE, API.robot_status_task_req, { simple: true });
        if (task && task.task_status !== undefined) {
          assert(task.task_status === 4, 'task should be completed at replanned target');
        }
        break;
      }
    }

    assert(reachedC, 'robot did not reach replanned target');

    console.log('e2e_task_replan_midway.test ok');
  } catch (err) {
    console.error('e2e_task_replan_midway.test failed');
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
