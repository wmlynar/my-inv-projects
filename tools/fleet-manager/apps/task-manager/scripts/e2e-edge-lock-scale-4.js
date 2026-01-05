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
  process.env.E2E_WORKFLOW_PATH || path.resolve(testDataDir, 'workflow-traffic.json5');
const stateDir = path.resolve(taskManagerDir, 'state-e2e-edge-lock-scale-4');

const ports = {
  state: 19804,
  ctrl: 19805,
  task: 19806,
  other: 19810,
  push: 19811,
  http: 7116
};

const speed = process.env.E2E_SPEED_M_S || '0.8';
const cycles = Number.parseInt(process.env.E2E_SCALE_CYCLES || '2', 10);
const pickIds = ['PICK-A1', 'PICK-A4', 'PICK-B1', 'PICK-B4'];
const dropIds = ['DROP-A4', 'DROP-B4', 'DROP-A1', 'DROP-B1'];
const robotIds = ['RB-01', 'RB-02', 'RB-03', 'RB-04'];

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

async function waitForCompletedCount(port, expected, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const tasks = await fetchTasks(port);
    const completed = tasks.filter((task) => task.status === 'completed');
    if (completed.length >= expected) {
      return completed;
    }
    await delay(300);
  }
  throw new Error(`timeout waiting for ${expected} completed tasks`);
}

async function waitForNoInProgress(port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const tasks = await fetchTasks(port);
    const inProgress = tasks.filter((task) => task.status === 'in_progress');
    if (inProgress.length === 0) {
      return;
    }
    await delay(300);
  }
  throw new Error('timeout waiting for in_progress tasks to clear');
}

function assertRobotFairness(tasks) {
  const counts = {};
  tasks
    .filter((task) => task.status === 'completed')
    .forEach((task) => {
      counts[task.robotId] = (counts[task.robotId] || 0) + 1;
    });
  const missing = robotIds.filter((id) => !counts[id]);
  if (missing.length > 0) {
    throw new Error(`expected all robots to complete at least one task, missing: ${missing.join(', ')}`);
  }
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

  const sim4 = spawnProcess('sim-4', simPath, {
    GRAPH_PATH: graphPath,
    STATE_PORT: String(ports.state),
    CTRL_PORT: String(ports.ctrl),
    TASK_PORT: String(ports.task),
    OTHER_PORT: String(ports.other),
    PUSH_PORT: String(ports.push),
    BIND_HOST: '127.0.0.5',
    START_NODE_ID: 'B2',
    TICK_MS: '100',
    SPEED_M_S: speed
  });

  const manager = spawnProcess('manager', managerPath, {
    GRAPH_PATH: graphPath,
    ROBOKIT_HOSTS: '127.0.0.2,127.0.0.3,127.0.0.4,127.0.0.5',
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

    for (const dropId of dropIds) {
      await setWorksiteFilled(ports.http, dropId, false);
    }

    let completedTarget = 0;
    for (let i = 0; i < cycles; i += 1) {
      for (const pickId of pickIds) {
        await setWorksiteFilled(ports.http, pickId, true);
      }
      completedTarget += pickIds.length;
      await waitForCompletedCount(ports.http, completedTarget, 70000);
      await waitForNoInProgress(ports.http, 20000);
      for (const dropId of dropIds) {
        await setWorksiteFilled(ports.http, dropId, false);
      }
    }

    const tasks = await fetchTasks(ports.http);
    assertRobotFairness(tasks);

    exitCode = 0;
    console.log(`E2E ok: scale test completed (${cycles} cycles, 4 robots).`);
  } finally {
    manager.kill('SIGTERM');
    sim1.kill('SIGTERM');
    sim2.kill('SIGTERM');
    sim3.kill('SIGTERM');
    sim4.kill('SIGTERM');
    await delay(300);
    cleanupDir(stateDir);
    process.exit(exitCode);
  }
}

run().catch((err) => {
  console.error(`E2E failed: ${err.message}`);
  process.exit(1);
});
