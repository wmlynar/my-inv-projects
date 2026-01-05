const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const taskManagerDir = path.resolve(repoRoot, 'apps', 'task-manager');
const simPath = path.resolve(repoRoot, 'apps', 'robokit-sim', 'server.js');
const managerPath = path.resolve(taskManagerDir, 'server.js');
const testDataDir = path.resolve(taskManagerDir, 'testdata');
const graphPath = process.env.E2E_GRAPH_PATH || path.resolve(testDataDir, 'graph-traffic.json');
const workflowPath =
  process.env.E2E_WORKFLOW_PATH || path.resolve(testDataDir, 'workflow-restart-locks.json5');
const stateDir = path.resolve(taskManagerDir, 'state-e2e-edge-lock-restart-locks');

const ports = {
  state: 19884,
  ctrl: 19885,
  task: 19886,
  other: 19890,
  push: 19901,
  http: 7124
};

const speed = process.env.E2E_SPEED_M_S || '0.5';
const holdMs = Number.parseInt(process.env.E2E_LOCK_HOLD_MS || '3000', 10);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpRequest({ method, port, path: reqPath, body }) {
  return new Promise((resolve, reject) => {
    const payload = body ? Buffer.from(body) : null;
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path: reqPath,
        headers: payload
          ? {
              'Content-Type': 'application/json',
              'Content-Length': payload.length
            }
          : undefined
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') });
        });
      }
    );
    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
  });
}

async function waitForHttpReady(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await httpGetJson(url);
      if (res.status === 200 && res.body && res.body.ok) {
        return;
      }
    } catch (err) {
      // ignore until timeout
    }
    await delay(200);
  }
  throw new Error(`timeout waiting for ${url}`);
}

function spawnProcess(label, scriptPath, env) {
  const child = spawn(process.execPath, [scriptPath], {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[${label}] ${chunk}`);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[${label}] ${chunk}`);
  });

  return child;
}

function cleanupDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }
  fs.rmSync(dirPath, { recursive: true, force: true });
}

async function setWorksiteFilled(port, id, filled) {
  const res = await httpRequest({
    method: 'POST',
    port,
    path: `/api/worksites/${encodeURIComponent(id)}`,
    body: JSON.stringify({ filled })
  });
  if (res.status !== 200) {
    throw new Error(`failed to update worksite ${id}`);
  }
}

async function fetchTasks(port) {
  const res = await httpGetJson(`http://127.0.0.1:${port}/api/tasks`);
  if (res.status !== 200) {
    throw new Error(`tasks request failed (${res.status})`);
  }
  return (res.body && res.body.tasks) || [];
}

async function waitForTasks(port, minCount, timeoutMs) {
  const start = Date.now();
  let tasks = [];
  while (Date.now() - start < timeoutMs) {
    tasks = await fetchTasks(port);
    const inProgress = tasks.filter((task) => task.status === 'in_progress');
    if (inProgress.length >= minCount) {
      return inProgress;
    }
    await delay(300);
  }
  throw new Error(`timeout waiting for ${minCount} tasks (last count ${tasks.length})`);
}

async function waitForPhase(port, phase, minCount, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const tasks = await fetchTasks(port);
    const matching = tasks.filter((task) => task.status === 'in_progress' && task.phase === phase);
    if (matching.length >= minCount) {
      return matching;
    }
    await delay(300);
  }
  throw new Error(`timeout waiting for phase ${phase}`);
}

async function monitorSerializedDrops(port, timeoutMs) {
  const start = Date.now();
  let sawDrop = false;
  while (Date.now() - start < timeoutMs) {
    const tasks = await fetchTasks(port);
    const inProgress = tasks.filter((task) => task.status === 'in_progress');
    const toDrop = inProgress.filter((task) => task.phase === 'to_drop');
    if (toDrop.length > 1) {
      throw new Error('expected edge_lock to serialize drop dispatch after restart');
    }
    if (toDrop.length === 1) {
      sawDrop = true;
    }
    await delay(300);
  }
  if (!sawDrop) {
    throw new Error('expected to observe drop dispatch after restart');
  }
}

async function waitForCompletedTasks(port, minCount, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const tasks = await fetchTasks(port);
    const completed = tasks.filter((task) => task.status === 'completed');
    if (completed.length >= minCount) {
      return completed;
    }
    await delay(300);
  }
  throw new Error(`timeout waiting for ${minCount} completed tasks`);
}

async function run() {
  cleanupDir(stateDir);
  fs.mkdirSync(stateDir, { recursive: true });

  const sim1 = spawnProcess('sim-1', simPath, {
    GRAPH_PATH: graphPath,
    STATE_PORT: String(ports.state),
    CTRL_PORT: String(ports.ctrl),
    TASK_PORT: String(ports.task),
    OTHER_PORT: String(ports.other),
    PUSH_PORT: String(ports.push),
    BIND_HOST: '127.0.0.2',
    START_NODE_ID: 'PP1',
    TICK_MS: '100',
    SPEED_M_S: speed
  });

  const sim2 = spawnProcess('sim-2', simPath, {
    GRAPH_PATH: graphPath,
    STATE_PORT: String(ports.state),
    CTRL_PORT: String(ports.ctrl),
    TASK_PORT: String(ports.task),
    OTHER_PORT: String(ports.other),
    PUSH_PORT: String(ports.push),
    BIND_HOST: '127.0.0.3',
    START_NODE_ID: 'PP2',
    TICK_MS: '100',
    SPEED_M_S: speed
  });

  const sim3 = spawnProcess('sim-3', simPath, {
    GRAPH_PATH: graphPath,
    STATE_PORT: String(ports.state),
    CTRL_PORT: String(ports.ctrl),
    TASK_PORT: String(ports.task),
    OTHER_PORT: String(ports.other),
    PUSH_PORT: String(ports.push),
    BIND_HOST: '127.0.0.4',
    START_NODE_ID: 'A2',
    TICK_MS: '100',
    SPEED_M_S: speed
  });

  let manager = spawnProcess('manager', managerPath, {
    GRAPH_PATH: graphPath,
    ROBOKIT_HOSTS: '127.0.0.2,127.0.0.3,127.0.0.4',
    WORKFLOW_PATH: workflowPath,
    ROBOKIT_STATE_PORT: String(ports.state),
    ROBOKIT_TASK_PORT: String(ports.task),
    ROBOKIT_TIMEOUT_MS: '1500',
    PORT: String(ports.http),
    TICK_MS: '200',
    STATE_DIR: stateDir,
    BIND_HOST: '127.0.0.1',
    ROUTE_POLICY: 'edge_lock',
    ROBOT_SELECT_STRATEGY: 'round_robin'
  });

  let exitCode = 1;
  try {
    await waitForHttpReady(`http://127.0.0.1:${ports.http}/health`, 15000);

    await setWorksiteFilled(ports.http, 'PICK-A1', true);
    await setWorksiteFilled(ports.http, 'PICK-A4', true);

    await waitForTasks(ports.http, 2, 12000);
    await waitForPhase(ports.http, 'to_drop', 1, 20000);

    manager.kill('SIGTERM');
    await delay(600);

    manager = spawnProcess('manager-2', managerPath, {
      GRAPH_PATH: graphPath,
      WORKFLOW_PATH: workflowPath,
      ROBOKIT_STATE_PORT: String(ports.state),
      ROBOKIT_TASK_PORT: String(ports.task),
      ROBOKIT_TIMEOUT_MS: '1500',
      PORT: String(ports.http),
      TICK_MS: '200',
      STATE_DIR: stateDir,
      BIND_HOST: '127.0.0.1',
      ROUTE_POLICY: 'edge_lock',
      ROBOT_SELECT_STRATEGY: 'round_robin'
    });

    await waitForHttpReady(`http://127.0.0.1:${ports.http}/health`, 15000);

    await setWorksiteFilled(ports.http, 'PICK-A2', true);
    await waitForTasks(ports.http, 3, 12000);
    await monitorSerializedDrops(ports.http, holdMs);
    await waitForCompletedTasks(ports.http, 3, 60000);

    exitCode = 0;
    console.log('E2E ok: restart rebuilds locks before new dispatches.');
  } finally {
    manager.kill('SIGTERM');
    sim1.kill('SIGTERM');
    sim2.kill('SIGTERM');
    sim3.kill('SIGTERM');
    await delay(300);
    cleanupDir(stateDir);
    process.exit(exitCode);
  }
}

run().catch((err) => {
  console.error(`E2E failed: ${err.message}`);
  process.exit(1);
});
