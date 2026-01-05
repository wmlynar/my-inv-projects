const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const proxyDir = path.resolve(repoRoot, 'apps', 'robokit-proxy');
const simPath = path.resolve(repoRoot, 'apps', 'robokit-sim', 'server.js');
const managerPath = path.resolve(repoRoot, 'apps', 'task-manager', 'server.js');
const testDataDir = path.resolve(repoRoot, 'apps', 'task-manager', 'testdata');
const graphPath = path.resolve(testDataDir, 'graph.json');
const workflowPath = path.resolve(testDataDir, 'workflow.json5');
const configPath = path.resolve(proxyDir, 'testdata', 'config-e2e.json5');
const logsDir = path.resolve(proxyDir, 'testdata', 'logs-e2e');
const stateDir = path.resolve(repoRoot, 'apps', 'task-manager', 'state-e2e-proxy');

const ports = {
  simState: 19504,
  simTask: 19506,
  proxyState: 19604,
  proxyTask: 19606,
  http: 7082
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

function findTrafficLogs(baseDir, mappingName) {
  const mappingDir = path.join(baseDir, mappingName);
  if (!fs.existsSync(mappingDir)) {
    return [];
  }
  const entries = fs.readdirSync(mappingDir, { withFileTypes: true });
  const logs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const trafficPath = path.join(mappingDir, entry.name, 'traffic.jsonl');
    if (fs.existsSync(trafficPath)) {
      logs.push(trafficPath);
    }
  }
  return logs;
}

async function run() {
  cleanupDir(stateDir);
  cleanupDir(logsDir);
  fs.mkdirSync(stateDir, { recursive: true });

  const sim = spawnProcess('sim', simPath, {
    GRAPH_PATH: graphPath,
    STATE_PORT: String(ports.simState),
    TASK_PORT: String(ports.simTask),
    CTRL_PORT: '19505',
    OTHER_PORT: '19510',
    PUSH_PORT: '19531',
    BIND_HOST: '127.0.0.1',
    START_NODE_ID: 'AP1',
    TICK_MS: '100',
    SPEED_M_S: '1.2'
  });

  const proxy = spawnProcess('proxy', path.resolve(proxyDir, 'server.js'), {
    CONFIG_PATH: configPath
  });

  const manager = spawnProcess('manager', managerPath, {
    GRAPH_PATH: graphPath,
    WORKFLOW_PATH: workflowPath,
    ROBOKIT_HOST: '127.0.0.1',
    ROBOKIT_STATE_PORT: String(ports.proxyState),
    ROBOKIT_TASK_PORT: String(ports.proxyTask),
    ROBOKIT_TIMEOUT_MS: '1500',
    PORT: String(ports.http),
    TICK_MS: '200',
    STATE_DIR: stateDir,
    BIND_HOST: '127.0.0.1'
  });

  let exitCode = 1;
  try {
    await waitForHttpReady(`http://127.0.0.1:${ports.http}/health`, 15000);

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

    const stateLogs = findTrafficLogs(logsDir, 'state');
    const taskLogs = findTrafficLogs(logsDir, 'task');
    if (stateLogs.length === 0 || taskLogs.length === 0) {
      throw new Error('proxy did not capture expected traffic logs');
    }

    const stateLog = fs.readFileSync(stateLogs[0], 'utf8');
    const taskLog = fs.readFileSync(taskLogs[0], 'utf8');
    if (stateLog.trim().length === 0 || taskLog.trim().length === 0) {
      throw new Error('proxy logs are empty');
    }

    exitCode = 0;
    console.log('E2E ok: proxy captured Robokit traffic between manager and simulator.');
  } finally {
    manager.kill('SIGTERM');
    proxy.kill('SIGTERM');
    sim.kill('SIGTERM');
    await delay(300);
    cleanupDir(stateDir);
    cleanupDir(logsDir);
    process.exit(exitCode);
  }
}

run().catch((err) => {
  console.error(`E2E failed: ${err.message}`);
  process.exit(1);
});
