const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const { encodeFrame, responseApi, RbkParser, API } = require('../../../packages/robokit-lib/rbk');

const HOST = '127.0.0.1';
const BASE_PORT = 34000 + Math.floor(Math.random() * 20000);
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

async function getForkHeight() {
  const resp = await request(PORTS.STATE, API.robot_status_fork_req, {});
  assert(resp && resp.ret_code === 0, 'fork status failed');
  return resp.fork_height;
}

async function waitForForkHeight(target, tolerance = 0.02, timeoutMs = 7000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const height = await getForkHeight();
    if (Math.abs(height - target) <= tolerance) {
      return height;
    }
    await wait(200);
  }
  throw new Error(`fork height did not reach ${target}`);
}

async function run() {
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
      FORK_SPEED_M_S: '0.2',
      FORK_ACCEL_M_S2: '0.3',
      REQUIRE_LOCK_FOR_FORK: 'true'
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
    await waitForPort(PORTS.OTHER, HOST);
    await waitForPort(PORTS.CONFIG, HOST);

    const denied = await request(PORTS.OTHER, API.robot_other_forkheight_req, { height: 0.5 });
    assert(denied && denied.ret_code === 60001, 'forkheight should be locked without seize control');

    const lockRes = await request(PORTS.CONFIG, API.robot_config_req_4005, { nick_name: 'e2e' });
    assert(lockRes && lockRes.ret_code === 0, 'lock failed');

    const lockStatus = await request(PORTS.STATE, API.robot_status_current_lock_req, {});
    assert(lockStatus && lockStatus.locked === true, 'lock status should be locked');

    const startHeight = await getForkHeight();
    const upTarget = Math.max(startHeight + 0.35, 0.5);
    const forkUp = await request(PORTS.OTHER, API.robot_other_forkheight_req, { height: upTarget });
    assert(forkUp && forkUp.ret_code === 0, 'forkheight up rejected');
    await waitForForkHeight(upTarget);

    const downTarget = Math.max(0.08, startHeight);
    const forkDown = await request(PORTS.OTHER, API.robot_other_forkheight_req, { height: downTarget });
    assert(forkDown && forkDown.ret_code === 0, 'forkheight down rejected');
    await waitForForkHeight(downTarget);

    const softOn = await request(PORTS.OTHER, API.robot_other_softemc_req, { status: true });
    assert(softOn && softOn.ret_code === 0, 'soft emc enable rejected');

    const frozenBefore = await getForkHeight();
    const forkWhileSoft = await request(PORTS.OTHER, API.robot_other_forkheight_req, { height: upTarget });
    assert(forkWhileSoft && forkWhileSoft.ret_code === 0, 'forkheight during soft emc rejected');
    await wait(400);
    const frozenAfter = await getForkHeight();
    assert(Math.abs(frozenAfter - frozenBefore) <= 0.005, 'fork should not move during soft emc');

    const softOff = await request(PORTS.OTHER, API.robot_other_softemc_req, { status: false });
    assert(softOff && softOff.ret_code === 0, 'soft emc disable rejected');
    await waitForForkHeight(upTarget);

    const unlockRes = await request(PORTS.CONFIG, API.robot_config_req_4006, {});
    assert(unlockRes && unlockRes.ret_code === 0, 'unlock failed');
    const lockAfter = await request(PORTS.STATE, API.robot_status_current_lock_req, {});
    assert(lockAfter && lockAfter.locked === false, 'lock status should be unlocked');

    const deniedAfterUnlock = await request(PORTS.OTHER, API.robot_other_forkheight_req, { height: downTarget });
    assert(deniedAfterUnlock && deniedAfterUnlock.ret_code === 60001, 'forkheight should be locked after unlock');

    console.log('e2e_fork_and_lock.test ok');
  } catch (err) {
    console.error('e2e_fork_and_lock.test failed');
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
