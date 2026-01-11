const net = require('net');
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

function sendFrame({ port, apiNo, payload }) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: HOST, port });
    const parser = new RbkParser({ strictStartMark: true, maxBodyLength: 1024 * 1024 });
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`timeout waiting for response api ${apiNo}`));
    }, 1500);

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

function sendFrameOnSocket({ socket, parser, apiNo, payload }) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`timeout waiting for response api ${apiNo}`));
    }, 1500);

    const onData = (chunk) => {
      let messages = [];
      try {
        messages = parser.push(chunk);
      } catch (err) {
        clearTimeout(timeout);
        socket.off('data', onData);
        reject(err);
        return;
      }
      for (const msg of messages) {
        if (msg.apiNo !== responseApi(apiNo)) {
          continue;
        }
        clearTimeout(timeout);
        socket.off('data', onData);
        resolve(msg);
        return;
      }
    };

    socket.on('data', onData);
    const frame = encodeFrame(1, apiNo, payload || {});
    socket.write(frame);
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
  const appDir = path.resolve(__dirname, '..');
  const allocation = await findFreeRobokitPorts({ host: HOST });
  const ports = allocation.ports;
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
      REQUIRE_LOCK_FOR_CONTROL: 'true',
      CLIENT_TTL_MS: '0',
      LOCK_RELEASE_ON_DISCONNECT: 'true'
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
    await waitForPort(ports.CONFIG, HOST);
    await waitForPort(ports.CTRL, HOST);

    const configSocket = net.createConnection({ host: HOST, port: ports.CONFIG });
    const configParser = new RbkParser({ strictStartMark: true, maxBodyLength: 1024 * 1024 });
    configSocket.setNoDelay(true);
    await new Promise((resolve, reject) => {
      configSocket.once('connect', resolve);
      configSocket.once('error', reject);
    });

    const lockResMsg = await sendFrameOnSocket({
      socket: configSocket,
      parser: configParser,
      apiNo: API.robot_config_req_4005,
      payload: { nick_name: 'e2e' }
    });
    const lockRes = lockResMsg ? lockResMsg.payload : null;
    assert(lockRes && lockRes.ret_code === 0, 'lock failed');

    const moveRes = await request(ports.CTRL, API.robot_control_motion_req, {
      vx: 0.1,
      vy: 0,
      w: 0,
      steer: 0,
      real_steer: 0
    });
    assert(moveRes && moveRes.ret_code === 0, 'control motion rejected after lock');

    configSocket.destroy();
    await wait(200);

    const denied = await request(ports.CTRL, API.robot_control_motion_req, {
      vx: 0.1,
      vy: 0,
      w: 0,
      steer: 0,
      real_steer: 0
    });
    assert(denied && denied.ret_code === 60001, 'lock should be released after disconnect');

    const lockAgain = await request(ports.CONFIG, API.robot_config_req_4005, { nick_name: 'e2e' });
    assert(lockAgain && lockAgain.ret_code === 0, 'lock re-acquire failed');
    const moveAgain = await request(ports.CTRL, API.robot_control_motion_req, {
      vx: 0.1,
      vy: 0,
      w: 0,
      steer: 0,
      real_steer: 0
    });
    assert(moveAgain && moveAgain.ret_code === 0, 'control motion rejected after re-lock');

    console.log('e2e_reconnect_lock_release.test ok');
  } catch (err) {
    console.error('e2e_reconnect_lock_release.test failed');
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
