const fs = require('fs');
const http = require('http');
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

function postJson(port, pathName, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload || {});
    const req = http.request(
      {
        host: HOST,
        port,
        path: pathName,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk.toString('utf8');
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (_err) {
            resolve({});
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'robokit-blocked-'));
  const mapPath = path.join(dir, 'blocked-map.json');
  const map = {
    meta: {
      mapName: 'blocked-map',
      mapType: '2D-Map',
      version: '1.0.0'
    },
    nodes: [
      { id: 'A', className: 'LocationMark', pos: { x: 0, y: 0 } },
      { id: 'B', className: 'LocationMark', pos: { x: 6, y: 0 } }
    ],
    edges: [
      { id: 'A-B', start: 'A', end: 'B', startPos: { x: 0, y: 0 }, endPos: { x: 6, y: 0 }, props: {} }
    ],
    lines: [],
    areas: [],
    bins: []
  };
  fs.writeFileSync(mapPath, JSON.stringify(map), 'utf8');
  return mapPath;
}

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, HOST, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

async function run() {
  const { ports } = await findFreeRobokitPorts({ host: HOST });
  const mapPath = createTempMap();
  const httpPort = await reservePort();
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
      HTTP_PORTS: String(httpPort),
      HTTP_HOST: HOST,
      ADMIN_HTTP_PORT: '0',
      EVENT_LOG_STDOUT: 'false',
      EVENT_LOG_PATH: '',
      TICK_MS: '100',
      SPEED_M_S: '0.8',
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
    await waitForPort(httpPort, HOST);

    const lockRes = await request(ports.CONFIG, API.robot_config_req_4005, { nick_name: 'e2e' });
    assert(lockRes && lockRes.ret_code === 0, 'lock failed');

    const goRes = await request(ports.TASK, API.robot_task_gotarget_req, { id: 'B' });
    assert(goRes && goRes.ret_code === 0, 'goTarget failed');

    const startLoc = await request(ports.STATE, API.robot_status_loc_req, {});
    let moved = false;
    const moveDeadline = Date.now() + 4000;
    while (Date.now() < moveDeadline) {
      await wait(200);
      const loc = await request(ports.STATE, API.robot_status_loc_req, {});
      const dist = Math.hypot(loc.x - startLoc.x, loc.y - startLoc.y);
      if (dist > 0.1) {
        moved = true;
        break;
      }
    }
    assert(moved, 'robot did not start moving');

    const blockRes = await postJson(httpPort, '/sim/blocked', { blocked: true, reason: 1001 });
    assert(blockRes && blockRes.ok === true, 'failed to set blocked');
    const blocked = await request(ports.STATE, API.robot_status_block_req, {});
    assert(blocked && blocked.blocked === true, 'robot_status_block should be blocked');

    const blockedLoc = await request(ports.STATE, API.robot_status_loc_req, {});
    await wait(500);
    const blockedLocAfter = await request(ports.STATE, API.robot_status_loc_req, {});
    const blockedDist = Math.hypot(blockedLocAfter.x - blockedLoc.x, blockedLocAfter.y - blockedLoc.y);
    assert(blockedDist < 0.03, 'robot moved while blocked');

    const unblockRes = await postJson(httpPort, '/sim/blocked', { blocked: false });
    assert(unblockRes && unblockRes.ok === true, 'failed to clear blocked');
    const unblocked = await request(ports.STATE, API.robot_status_block_req, {});
    assert(unblocked && unblocked.blocked === false, 'robot_status_block should be unblocked');

    const resumeDeadline = Date.now() + 4000;
    let resumed = false;
    while (Date.now() < resumeDeadline) {
      await wait(200);
      const loc = await request(ports.STATE, API.robot_status_loc_req, {});
      const dist = Math.hypot(loc.x - blockedLocAfter.x, loc.y - blockedLocAfter.y);
      if (dist > 0.05) {
        resumed = true;
        break;
      }
    }
    assert(resumed, 'robot did not resume after unblock');

    console.log('e2e_blocked_resume.test ok');
  } catch (err) {
    console.error('e2e_blocked_resume.test failed');
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
