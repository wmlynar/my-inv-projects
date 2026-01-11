const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const { encodeFrame, responseApi, RbkParser, API } = require('../../../packages/robokit-lib/rbk');
const { findFreeRobokitPorts } = require('./helpers/ports');

const HOST = '127.0.0.1';
const MIN_INTERVAL_MS = 300;
const MAX_INTERVAL_MS = 800;

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
  const { ports } = await findFreeRobokitPorts({ host: HOST });
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
      PUSH_MIN_INTERVAL_MS: String(MIN_INTERVAL_MS),
      PUSH_MAX_INTERVAL_MS: String(MAX_INTERVAL_MS)
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

  const pushTimes = [];
  let configAck = null;
  let configAckReject = null;

  try {
    await waitForPort(ports.PUSH, HOST);

    const socket = net.createConnection({ host: HOST, port: ports.PUSH });
    const parser = new RbkParser({ strictStartMark: true, maxBodyLength: 1024 * 1024 });
    socket.setNoDelay(true);

    const configAckPromise = new Promise((resolve, reject) => {
      configAck = resolve;
      configAckReject = reject;
    });
    const configTimeout = setTimeout(() => {
      if (configAckReject) {
        configAckReject(new Error('timeout waiting for push config ack'));
      }
    }, 2000);

    socket.on('data', (chunk) => {
      let messages = [];
      try {
        messages = parser.push(chunk);
      } catch (err) {
        return;
      }
      for (const msg of messages) {
        if (msg.apiNo === responseApi(API.robot_push_config_req)) {
          clearTimeout(configTimeout);
          if (configAck) {
            configAck(msg.payload || null);
          }
          continue;
        }
        if (msg.apiNo === API.robot_push) {
          pushTimes.push(Date.now());
        }
      }
    });

    socket.on('error', () => {});

    const frame = encodeFrame(1, API.robot_push_config_req, { interval: 50 });
    socket.write(frame);

    const ack = await configAckPromise;
    assert(ack && ack.ret_code === 0, 'push config rejected');

    const deadline = Date.now() + 4000;
    while (pushTimes.length < 4 && Date.now() < deadline) {
      await wait(50);
    }
    assert(pushTimes.length >= 4, 'did not receive enough push frames');

    const intervals = [];
    for (let i = 1; i < pushTimes.length; i += 1) {
      intervals.push(pushTimes[i] - pushTimes[i - 1]);
    }
    const minObserved = Math.min(...intervals);
    assert(
      minObserved >= MIN_INTERVAL_MS - 60,
      `push interval below min: ${minObserved}ms (min=${MIN_INTERVAL_MS}ms)`
    );

    socket.destroy();
    console.log('e2e_push_interval.test ok');
  } catch (err) {
    console.error('e2e_push_interval.test failed');
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
