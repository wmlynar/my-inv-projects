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
const stateDir = path.resolve(taskManagerDir, 'state-e2e-edge-lock-pause');

const ports = {
  state: 19604,
  ctrl: 19605,
  task: 19606,
  other: 19610,
  push: 19631,
  http: 7101
};

const speed = process.env.E2E_SPEED_M_S || '0.8';
const pickPointById = {
  'PICK-A1': 'A1',
  'PICK-A4': 'A4'
};

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

async function fetchStatus(port) {
  const res = await httpGetJson(`http://127.0.0.1:${port}/api/status`);
  if (res.status !== 200) {
    throw new Error(`status request failed (${res.status})`);
  }
  return res.body || {};
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
  while (Date.now() - start < timeoutMs) {
    const status = await fetchStatus(port);
    const tasks = status.tasks || [];
    const inProgress = tasks.filter((task) => task.status === 'in_progress');
    if (inProgress.length >= minCount) {
      return inProgress;
    }
    await delay(300);
  }
  throw new Error(`timeout waiting for ${minCount} tasks`);
}

async function waitForRobotsAtPicks(port, robotTargets, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await fetchStatus(port);
    const robots = status.robots || [];
    const byId = new Map(robots.map((robot) => [robot.id, robot]));
    const ready = Object.entries(robotTargets).every(([robotId, pickPoint]) => {
      const robot = byId.get(robotId);
      return robot && robot.currentStation === pickPoint;
    });
    if (ready) {
      return;
    }
    await delay(300);
  }
  throw new Error('timeout waiting for robots to reach pick stations');
}

async function waitForDropTask(port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const tasks = await fetchTasks(port);
    const inProgress = tasks.filter((task) => task.status === 'in_progress');
    const toDrop = inProgress.filter((task) => task.phase === 'to_drop');
    if (toDrop.length > 1) {
      throw new Error('expected drop dispatch to be serialized');
    }
    if (toDrop.length === 1) {
      return toDrop[0];
    }
    await delay(300);
  }
  throw new Error('timeout waiting for drop dispatch');
}

async function assertDropSerialized(port, durationMs) {
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    const tasks = await fetchTasks(port);
    const inProgress = tasks.filter((task) => task.status === 'in_progress');
    const toDrop = inProgress.filter((task) => task.phase === 'to_drop');
    if (toDrop.length > 1) {
      throw new Error('expected drop dispatch to remain serialized');
    }
    await delay(200);
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

  const manager = spawnProcess('manager', managerPath, {
    GRAPH_PATH: graphPath,
    ROBOKIT_HOSTS: '127.0.0.2,127.0.0.3',
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

    await setWorksiteFilled(ports.http, 'DROP-B4', true);
    await setWorksiteFilled(ports.http, 'DROP-B1', true);
    await setWorksiteFilled(ports.http, 'PICK-A1', true);
    await setWorksiteFilled(ports.http, 'PICK-A4', true);

    const tasks = await waitForTasks(ports.http, 2, 12000);
    const robotTargets = {};
    tasks.forEach((task) => {
      const pickPoint = pickPointById[task.pickId];
      if (pickPoint) {
        robotTargets[task.robotId] = pickPoint;
      }
    });
    const robotIds = Object.keys(robotTargets);
    if (robotIds.length < 2) {
      throw new Error('expected tasks for two robots (A1 and A4 picks)');
    }

    await waitForRobotsAtPicks(ports.http, robotTargets, 20000);

    const dropTask = await waitForDropTask(ports.http, 20000);
    const pauseRes = await httpRequest({
      method: 'POST',
      port: ports.http,
      path: `/api/robots/${encodeURIComponent(dropTask.robotId)}/pause`
    });
    if (pauseRes.status !== 200) {
      throw new Error('failed to pause task');
    }

    await assertDropSerialized(ports.http, 2000);

    const resumeRes = await httpRequest({
      method: 'POST',
      port: ports.http,
      path: `/api/robots/${encodeURIComponent(dropTask.robotId)}/resume`
    });
    if (resumeRes.status !== 200) {
      throw new Error('failed to resume task');
    }

    await waitForCompletedTasks(ports.http, 2, 45000);

    exitCode = 0;
    console.log('E2E ok: pause/resume keeps edge_lock reservations.');
  } finally {
    manager.kill('SIGTERM');
    sim1.kill('SIGTERM');
    sim2.kill('SIGTERM');
    await delay(300);
    cleanupDir(stateDir);
    process.exit(exitCode);
  }
}

run().catch((err) => {
  console.error(`E2E failed: ${err.message}`);
  process.exit(1);
});
