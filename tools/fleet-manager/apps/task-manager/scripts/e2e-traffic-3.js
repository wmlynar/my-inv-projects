const path = require('path');
const { spawn } = require('child_process');

const { RobokitClient } = require('@fleet-manager/adapters-robokit');
const { loadMapGraphLight } = require('@fleet-manager/core-graph');
const { EdgeLockPolicy } = require('../lib/edge_lock_policy');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const simPath = path.resolve(repoRoot, 'apps', 'robokit-sim', 'server.js');
const testDataDir = path.resolve(repoRoot, 'apps', 'task-manager', 'testdata');
const graphPath = process.env.E2E_GRAPH_PATH || path.resolve(testDataDir, 'graph-traffic.json');

const robots = [
  { id: 'RB-01', host: '127.0.0.1', start: 'PP1' },
  { id: 'RB-02', host: '127.0.0.1', start: 'PP2' },
  { id: 'RB-03', host: '127.0.0.1', start: 'A2' }
];

const portsByRobot = {
  'RB-01': {
    robod: 19700,
    state: 19704,
    ctrl: 19705,
    task: 19706,
    config: 19707,
    kernel: 19708,
    other: 19710,
    push: 19731,
    httpPorts: '18180,18188,18189,18190',
    speed: '1.8'
  },
  'RB-02': {
    robod: 19800,
    state: 19804,
    ctrl: 19805,
    task: 19806,
    config: 19807,
    kernel: 19808,
    other: 19810,
    push: 19831,
    httpPorts: '18280,18288,18289,18290',
    speed: '1.6'
  },
  'RB-03': {
    robod: 19900,
    state: 19904,
    ctrl: 19905,
    task: 19906,
    config: 19907,
    kernel: 19908,
    other: 19910,
    push: 19931,
    httpPorts: '18380,18388,18389,18390',
    speed: '1.4'
  }
};

const lockTimeoutMs = Number.parseInt(process.env.E2E_LOCK_TIMEOUT_MS || '1500', 10);
const policy = new EdgeLockPolicy({ lockTimeoutMs, allowSameDirection: true });
const graph = loadMapGraphLight(graphPath);
const activeTasks = new Map();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function spawnSim(label, host, startNode, ports) {
  const child = spawn(process.execPath, [simPath], {
    env: {
      ...process.env,
      GRAPH_PATH: graphPath,
      ROBOD_PORT: String(ports.robod),
      STATE_PORT: String(ports.state),
      CTRL_PORT: String(ports.ctrl),
      TASK_PORT: String(ports.task),
      CONFIG_PORT: String(ports.config),
      KERNEL_PORT: String(ports.kernel),
      OTHER_PORT: String(ports.other),
      PUSH_PORT: String(ports.push),
      HTTP_PORTS: ports.httpPorts,
      BIND_HOST: host,
      START_NODE_ID: startNode,
      TICK_MS: '100',
      SPEED_M_S: ports.speed
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (chunk) => process.stdout.write(`[${label}] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[${label}] ${chunk}`));
  return child;
}

function buildClient(robot) {
  const ports = portsByRobot[robot.id];
  return new RobokitClient({
    id: robot.id,
    host: robot.host,
    statePort: ports.state,
    taskPort: ports.task,
    ctrlPort: ports.ctrl,
    otherPort: ports.other,
    timeoutMs: 1500,
    retries: 1
  });
}

async function getStatus(client) {
  const status = await client.getStatusLoc();
  return status;
}

async function getStatusMap(clients) {
  const entries = await Promise.all(
    Object.entries(clients).map(async ([id, client]) => [id, await getStatus(client)])
  );
  const map = {};
  entries.forEach(([id, status]) => {
    map[id] = status;
  });
  return map;
}

async function waitForReady(robotId, client, timeoutMs) {
  const start = Date.now();
  let lastStatus = null;
  while (Date.now() - start < timeoutMs) {
    const status = await getStatus(client);
    lastStatus = status;
    if (status.ret_code === 0 && status.current_station) {
      return status;
    }
    await delay(200);
  }
  const lastStation = lastStatus && lastStatus.current_station ? lastStatus.current_station : 'unknown';
  const lastCode =
    lastStatus && Number.isFinite(lastStatus.ret_code) ? lastStatus.ret_code : 'unknown';
  throw new Error(`timeout waiting for ${robotId} ready (last station ${lastStation}, ret_code ${lastCode})`);
}

async function waitForStation(robotId, client, targetId, timeoutMs) {
  const start = Date.now();
  let lastStatus = null;
  while (Date.now() - start < timeoutMs) {
    const status = await getStatus(client);
    lastStatus = status;
    if (
      status.ret_code === 0 &&
      status.current_station === targetId &&
      status.task_status !== 2 &&
      status.task_status !== 3
    ) {
      activeTasks.delete(robotId);
      policy.onArrive({ robotId, targetId, graph });
      return status;
    }
    await delay(200);
  }
  const lastStation = lastStatus && lastStatus.current_station ? lastStatus.current_station : 'unknown';
  const lastCode =
    lastStatus && Number.isFinite(lastStatus.ret_code) ? lastStatus.ret_code : 'unknown';
  throw new Error(
    `timeout waiting for ${robotId} to reach ${targetId} (last station ${lastStation}, ret_code ${lastCode})`
  );
}

async function moveRobot(robotId, client, targetId) {
  policy.releaseRobot(robotId);
  activeTasks.delete(robotId);
  const res = await client.goTarget(targetId);
  if (res.ret_code !== 0) {
    throw new Error(`goTarget failed for ${robotId} -> ${targetId} (${res.err_msg || res.message || 'ret_code'}:${res.ret_code})`);
  }
  await waitForStation(robotId, client, targetId, 25000);
}

async function dispatchIfAllowed(robotId, client, targetId, clients) {
  const statusMap = await getStatusMap(clients);
  const allow = policy.allowDispatch({ robotId, targetId, graph, statusMap });
  if (!allow.ok) {
    return { ok: false, holder: allow.holder || null };
  }
  const res = await client.goTarget(targetId);
  if (res.ret_code !== 0) {
    throw new Error(`dispatch failed for ${robotId} -> ${targetId}`);
  }
  activeTasks.set(robotId, { robotId, targetId, status: 'in_progress' });
  return { ok: true };
}

async function waitForDispatch(robotId, client, targetId, clients, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const attempt = await dispatchIfAllowed(robotId, client, targetId, clients);
    if (attempt.ok) {
      return true;
    }
    await delay(200);
  }
  return false;
}

async function run() {
  const sims = robots.map((robot) =>
    spawnSim(`sim-${robot.id}`, robot.host, robot.start, portsByRobot[robot.id])
  );
  const clients = {
    [robots[0].id]: buildClient(robots[0]),
    [robots[1].id]: buildClient(robots[1]),
    [robots[2].id]: buildClient(robots[2])
  };

  let exitCode = 1;
  let failure = null;
  const policyTimer = setInterval(() => {
    policy.onTick({
      now: Date.now(),
      tasks: [...activeTasks.values()],
      pendingActions: new Map()
    });
  }, 200);

  try {
    await delay(600);
    await Promise.all([
      waitForReady('RB-01', clients['RB-01'], 5000),
      waitForReady('RB-02', clients['RB-02'], 5000),
      waitForReady('RB-03', clients['RB-03'], 5000)
    ]);

    console.log('Scenario: three-robot corridor contention.');
    await moveRobot('RB-01', clients['RB-01'], 'A1');
    await moveRobot('RB-02', clients['RB-02'], 'A4');
    await moveRobot('RB-03', clients['RB-03'], 'A2');

    let attempt = await dispatchIfAllowed('RB-01', clients['RB-01'], 'A4', clients);
    if (!attempt.ok) {
      throw new Error('expected RB-01 dispatch to succeed');
    }
    await delay(200);
    attempt = await dispatchIfAllowed('RB-03', clients['RB-03'], 'A4', clients);
    if (!attempt.ok) {
      throw new Error('expected RB-03 follow dispatch to succeed');
    }
    await delay(200);
    attempt = await dispatchIfAllowed('RB-02', clients['RB-02'], 'A1', clients);
    if (attempt.ok) {
      throw new Error('expected RB-02 to be blocked by opposite direction');
    }

    await waitForStation('RB-01', clients['RB-01'], 'A4', 25000);
    await waitForStation('RB-03', clients['RB-03'], 'A4', 25000);
    const okAfter = await waitForDispatch('RB-02', clients['RB-02'], 'A1', clients, 10000);
    if (!okAfter) {
      throw new Error('expected RB-02 dispatch after corridor release');
    }
    await waitForStation('RB-02', clients['RB-02'], 'A1', 25000);

    console.log('Scenario: intersection contention with three robots.');
    await moveRobot('RB-01', clients['RB-01'], 'A2');
    await moveRobot('RB-02', clients['RB-02'], 'A3');
    await moveRobot('RB-03', clients['RB-03'], 'B2');

    attempt = await dispatchIfAllowed('RB-01', clients['RB-01'], 'B2', clients);
    if (!attempt.ok) {
      throw new Error('expected RB-01 intersection dispatch to succeed');
    }
    await delay(200);
    attempt = await dispatchIfAllowed('RB-02', clients['RB-02'], 'B3', clients);
    if (attempt.ok) {
      throw new Error('expected RB-02 intersection dispatch to be blocked');
    }
    attempt = await dispatchIfAllowed('RB-03', clients['RB-03'], 'A2', clients);
    if (attempt.ok) {
      throw new Error('expected RB-03 intersection dispatch to be blocked');
    }

    await waitForStation('RB-01', clients['RB-01'], 'B2', 25000);
    const okAfterFirst = await waitForDispatch('RB-02', clients['RB-02'], 'B3', clients, 10000);
    if (!okAfterFirst) {
      throw new Error('expected RB-02 dispatch after intersection release');
    }
    await waitForStation('RB-02', clients['RB-02'], 'B3', 25000);
    const okAfterSecond = await waitForDispatch('RB-03', clients['RB-03'], 'A2', clients, 10000);
    if (!okAfterSecond) {
      throw new Error('expected RB-03 dispatch after intersection release');
    }
    await waitForStation('RB-03', clients['RB-03'], 'A2', 25000);

    exitCode = 0;
    console.log('E2E ok: three-robot contention serialized.');
  } catch (err) {
    failure = err;
  } finally {
    clearInterval(policyTimer);
    sims.forEach((proc) => proc.kill('SIGTERM'));
    await delay(400);
  }
  if (failure) {
    throw failure;
  }
  return exitCode;
}

run()
  .then((exitCode) => process.exit(exitCode))
  .catch((err) => {
    console.error(`E2E failed: ${err.message}`);
    process.exit(1);
  });
