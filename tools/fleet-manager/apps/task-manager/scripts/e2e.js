const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const taskManagerDir = path.resolve(repoRoot, 'apps', 'task-manager');
const simPath = path.resolve(repoRoot, 'apps', 'robokit-sim', 'server.js');
const managerPath = path.resolve(taskManagerDir, 'server.js');
const testDataDir = path.resolve(taskManagerDir, 'testdata');
const graphPath = process.env.E2E_GRAPH_PATH || path.resolve(testDataDir, 'graph.json');
const workflowPath = process.env.E2E_WORKFLOW_PATH || path.resolve(testDataDir, 'workflow.json5');
const stateDir = path.resolve(taskManagerDir, 'state-e2e');

const ports = {
  state: 19504,
  ctrl: 19505,
  task: 19506,
  other: 19510,
  push: 19531,
  http: 7081
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
  });
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

async function run() {
  cleanupDir(stateDir);
  fs.mkdirSync(stateDir, { recursive: true });

  const sim = spawnProcess('sim', simPath, {
    GRAPH_PATH: graphPath,
    STATE_PORT: String(ports.state),
    CTRL_PORT: String(ports.ctrl),
    TASK_PORT: String(ports.task),
    OTHER_PORT: String(ports.other),
    PUSH_PORT: String(ports.push),
    BIND_HOST: '127.0.0.1',
    START_NODE_ID: 'AP1',
    TICK_MS: '100',
    SPEED_M_S: '1.2'
  });

  const manager = spawnProcess('manager', managerPath, {
    GRAPH_PATH: graphPath,
    WORKFLOW_PATH: workflowPath,
    ROBOKIT_HOST: '127.0.0.1',
    ROBOKIT_STATE_PORT: String(ports.state),
    ROBOKIT_TASK_PORT: String(ports.task),
    ROBOKIT_TIMEOUT_MS: '1500',
    PORT: String(ports.http),
    TICK_MS: '200',
    STATE_DIR: stateDir,
    BIND_HOST: '127.0.0.1'
  });

  let exitCode = 1;
  try {
    await waitForHttpReady(`http://127.0.0.1:${ports.http}/health`, 15000);
    await setWorksiteFilled(ports.http, 'PICK-01', true);

    const start = Date.now();
    let completed = false;
    while (Date.now() - start < 20000) {
      const tasksRes = await httpGetJson(`http://127.0.0.1:${ports.http}/api/tasks`);
      const tasks = (tasksRes.body && tasksRes.body.tasks) || [];
      const done = tasks.find((task) => task.status === 'completed');
      if (done) {
        completed = true;
        break;
      }
      await delay(250);
    }

    if (!completed) {
      throw new Error('task did not complete within timeout');
    }

    const worksitesRes = await httpGetJson(`http://127.0.0.1:${ports.http}/api/worksites`);
    const worksites = (worksitesRes.body && worksitesRes.body.worksites) || [];
    const pick = worksites.find((site) => site.id === 'PICK-01');
    const drop = worksites.find((site) => site.id === 'DROP-01');

    if (!pick || !drop) {
      throw new Error('worksites not found');
    }
    if (pick.filled !== false) {
      throw new Error('pick site was not emptied');
    }
    if (drop.filled !== true) {
      throw new Error('drop site was not filled');
    }

    exitCode = 0;
    console.log('E2E ok: task completed and worksite state updated.');
  } finally {
    manager.kill('SIGTERM');
    sim.kill('SIGTERM');
    await delay(300);
    cleanupDir(stateDir);
    process.exit(exitCode);
  }
}

run().catch((err) => {
  console.error(`E2E failed: ${err.message}`);
  process.exit(1);
});
