const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const { loadMapGraphLight } = require('@fleet-manager/core-graph');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const simPath = path.resolve(repoRoot, 'apps', 'robokit-sim', 'server.js');
const managerPath = path.resolve(repoRoot, 'apps', 'task-manager', 'server.js');
const fleetManagerPath = path.resolve(repoRoot, 'apps', 'traffic-lab', 'src', 'server.js');

const DEFAULT_SCENE_ROOT = path.resolve(
  repoRoot,
  'apps',
  'robokit-proxy',
  'logs',
  'http-8088',
  '1767179306233-6',
  'upload_scene'
);
const DEFAULT_ZIP = path.resolve(
  repoRoot,
  'apps',
  'robokit-proxy',
  'logs',
  'http-8088',
  '1767179306233-6',
  'upload_scene.zip'
);
const DEFAULT_SMAP = path.resolve(
  DEFAULT_SCENE_ROOT,
  'robots',
  'INV-CBD15-LONG-1',
  'maps',
  '20251203191014177_nowy_styl_3_ulepszone_wyjazdy_scene_data_wrong.smap'
);

const SCENE_ROOT = process.env.SCENE_ROOT ? path.resolve(process.env.SCENE_ROOT) : DEFAULT_SCENE_ROOT;
const SCENE_ZIP_PATH = process.env.SCENE_ZIP_PATH ? path.resolve(process.env.SCENE_ZIP_PATH) : DEFAULT_ZIP;
const GRAPH_PATH = process.env.GRAPH_PATH ? path.resolve(process.env.GRAPH_PATH) : DEFAULT_SMAP;
const WORKFLOW_PATH = process.env.WORKFLOW_PATH
  ? path.resolve(process.env.WORKFLOW_PATH)
  : path.resolve(repoRoot, 'apps', 'task-manager', 'scraped', 'workflow.json5');

const ports = {
  simState: 19704,
  simCtrl: 19705,
  simTask: 19706,
  simOther: 19710,
  simPush: 19731,
  taskManager: 7090,
  fleetManager: 3090,
  roboshop: 8090
};

const stateDir = path.resolve(repoRoot, 'apps', 'task-manager', 'state-e2e-fleet');
const uploadDir = path.resolve(repoRoot, 'apps', 'task-manager', 'state', 'fleet-upload');

function cleanupDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpRequest({ method, port, path: reqPath, headers, body }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path: reqPath,
        headers
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body: Buffer.concat(chunks) });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function waitForHealth(port, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await httpRequest({ method: 'GET', port, path: '/health' });
      if (res.statusCode === 200) {
        return;
      }
    } catch (err) {
      // keep trying
    }
    await sleep(200);
  }
  throw new Error(`timeout waiting for /health on ${port}`);
}

function spawnProcess(label, scriptPath, env) {
  const child = spawn(process.execPath, [scriptPath], {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', (chunk) => process.stdout.write(`[${label}] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[${label}] ${chunk}`));
  return child;
}

function parseWorkflow(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const clean = raw
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(clean);
}

function pickFirstParkPoint(graph) {
  const park = (graph.nodes || []).find((node) => node.className === 'ParkPoint');
  if (park) {
    return park.id;
  }
  const charge = (graph.nodes || []).find((node) => node.className === 'ChargePoint');
  if (charge) {
    return charge.id;
  }
  return (graph.nodes || []).find((node) => node.className === 'ActionPoint')?.id || null;
}

function distance(a, b) {
  return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
}

function pickFirstWorksiteId(workflow, parkPos) {
  const bins = workflow.bin_locations || {};
  const keys = Object.keys(bins);
  const pickGroup = workflow.streams?.[0]?.pick_group;
  if (pickGroup) {
    const candidates = keys
      .filter((id) => bins[id].group === pickGroup)
      .map((id) => ({ id, pos: bins[id].pos || null }));
    if (candidates.length > 0 && parkPos) {
      candidates.sort((a, b) => distance(a.pos || parkPos, parkPos) - distance(b.pos || parkPos, parkPos));
      return candidates[0].id;
    }
    if (candidates.length > 0) {
      return candidates[0].id;
    }
  }
  return keys[0] || null;
}

async function main() {
  if (!fs.existsSync(GRAPH_PATH)) {
    throw new Error(`missing graph: ${GRAPH_PATH}`);
  }
  if (!fs.existsSync(WORKFLOW_PATH)) {
    throw new Error(`missing workflow: ${WORKFLOW_PATH}`);
  }
  if (!fs.existsSync(SCENE_ZIP_PATH)) {
    throw new Error(`missing scene zip: ${SCENE_ZIP_PATH}`);
  }

  const graph = loadMapGraphLight(GRAPH_PATH);
  const startNodeId = pickFirstParkPoint(graph);
  if (!startNodeId) {
    throw new Error('no start node found');
  }
  const startNode = graph.nodes.find((node) => node.id === startNodeId);
  const parkPos = startNode && startNode.pos ? startNode.pos : null;

  const workflow = parseWorkflow(WORKFLOW_PATH);
  const worksiteId = pickFirstWorksiteId(workflow, parkPos);
  if (!worksiteId) {
    throw new Error('no worksite found in workflow');
  }

  cleanupDir(stateDir);
  cleanupDir(uploadDir);

  let lastUpload = null;
  const mockRds = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/uploadScene') {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        lastUpload = Buffer.concat(chunks);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }
    if (req.method === 'GET' && req.url.startsWith('/robotsStatus')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, devices: [] }));
      return;
    }
    if (req.method === 'POST' && req.url === '/getProfiles') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.method === 'GET' && req.url === '/downloadScene') {
      res.writeHead(200, { 'Content-Type': 'application/zip' });
      res.end(Buffer.alloc(0));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise((resolve) => mockRds.listen(0, '127.0.0.1', resolve));
  const mockRdsPort = mockRds.address().port;

  fs.mkdirSync(uploadDir, { recursive: true });

  const sim = spawnProcess('sim', simPath, {
    GRAPH_PATH,
    STATE_PORT: String(ports.simState),
    CTRL_PORT: String(ports.simCtrl),
    TASK_PORT: String(ports.simTask),
    OTHER_PORT: String(ports.simOther),
    PUSH_PORT: String(ports.simPush),
    BIND_HOST: '127.0.0.1',
    START_NODE_ID: startNodeId,
    TICK_MS: '60',
    SPEED_M_S: '6.0'
  });

  const manager = spawnProcess('manager', managerPath, {
    GRAPH_PATH,
    WORKFLOW_PATH,
    ROBOKIT_HOST: '127.0.0.1',
    ROBOKIT_STATE_PORT: String(ports.simState),
    ROBOKIT_TASK_PORT: String(ports.simTask),
    ROBOKIT_TIMEOUT_MS: '1500',
    PORT: String(ports.taskManager),
    TICK_MS: '200',
    STATE_DIR: stateDir,
    BIND_HOST: '127.0.0.1'
  });

  const fleet = spawnProcess('fleet', fleetManagerPath, {
    PORT: String(ports.fleetManager),
    ROBOSHOP_PORT: String(ports.roboshop),
    ROBOSHOP_BIND_HOST: '127.0.0.1',
    RDS_HOST: '127.0.0.1',
    RDS_PORT: String(mockRdsPort),
    RDS_UPLOAD_DIR: uploadDir
  });

  let exitCode = 1;
  try {
    await waitForHealth(ports.taskManager);
    await waitForHealth(ports.fleetManager);

    const zipBuffer = fs.readFileSync(SCENE_ZIP_PATH);
    const uploadRes = await httpRequest({
      method: 'POST',
      port: ports.roboshop,
      path: '/uploadScene',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': zipBuffer.length
      },
      body: zipBuffer
    });

    if (uploadRes.statusCode !== 200) {
      throw new Error(`uploadScene failed: ${uploadRes.statusCode}`);
    }
    if (!lastUpload || lastUpload.length !== zipBuffer.length) {
      throw new Error('mock RDS did not receive scene upload');
    }

    const files = fs.readdirSync(uploadDir).filter((name) => name.endsWith('.zip'));
    if (files.length === 0) {
      throw new Error('fleet-manager did not store uploaded zip');
    }

    const updateRes = await httpRequest({
      method: 'POST',
      port: ports.taskManager,
      path: `/api/worksites/${encodeURIComponent(worksiteId)}`,
      headers: { 'Content-Type': 'application/json' },
      body: Buffer.from(JSON.stringify({ filled: true }))
    });

    if (updateRes.statusCode !== 200) {
      throw new Error(`worksite update failed: ${updateRes.statusCode}`);
    }

    const start = Date.now();
    let completed = false;
    let lastLog = 0;
    while (Date.now() - start < 120000) {
      const tasksRes = await httpRequest({ method: 'GET', port: ports.taskManager, path: '/api/tasks' });
      const tasksBody = JSON.parse(tasksRes.body.toString('utf8'));
      const tasks = tasksBody.tasks || [];
      if (tasks.some((task) => task.status === 'failed')) {
        throw new Error('task failed');
      }
      if (tasks.some((task) => task.status === 'completed')) {
        completed = true;
        break;
      }
      if (Date.now() - lastLog > 5000) {
        const statusRes = await httpRequest({ method: 'GET', port: ports.taskManager, path: '/api/status' });
        const statusBody = JSON.parse(statusRes.body.toString('utf8'));
        const station = statusBody.robotStatus ? statusBody.robotStatus.current_station : null;
        const taskStatus = statusBody.robotStatus ? statusBody.robotStatus.task_status : null;
        const error = statusBody.lastError || null;
        const task = tasks[0] || null;
        const target = task ? task.targetId : null;
        const phase = task ? task.phase : null;
        console.log(
          `waiting: tasks=${tasks.length}, phase=${phase || 'n/a'}, target=${target || 'n/a'}, station=${station || 'n/a'}, task_status=${taskStatus || 'n/a'}, error=${error || 'n/a'}`
        );
        lastLog = Date.now();
      }
      await sleep(300);
    }

    if (!completed) {
      throw new Error('task did not complete');
    }

    const statusRes = await httpRequest({ method: 'GET', port: ports.taskManager, path: '/api/status' });
    const statusBody = JSON.parse(statusRes.body.toString('utf8'));
    const currentStation = statusBody.robotStatus ? statusBody.robotStatus.current_station : null;
    if (currentStation && currentStation !== startNodeId) {
      throw new Error(`robot did not return to park point (expected ${startNodeId}, got ${currentStation})`);
    }

    exitCode = 0;
    console.log('e2e-fleet-manager: ok');
  } finally {
    manager.kill('SIGTERM');
    fleet.kill('SIGTERM');
    sim.kill('SIGTERM');
    mockRds.close();
    await sleep(300);
    process.exit(exitCode);
  }
}

main().catch((err) => {
  console.error(`e2e-fleet-manager failed: ${err.message}`);
  process.exit(1);
});
