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
  { id: 'RB-02', host: '127.0.0.1', start: 'PP2' }
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
    speed: '2.0'
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

async function waitForIdle(robotId, client, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await getStatus(client);
    if (
      status.ret_code === 0 &&
      status.task_status !== 2 &&
      status.task_status !== 3
    ) {
      return status;
    }
    await delay(200);
  }
  throw new Error(`timeout waiting for ${robotId} idle`);
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

async function reserveOnly(robotId, targetId, clients) {
  const statusMap = await getStatusMap(clients);
  return policy.allowDispatch({ robotId, targetId, graph, statusMap });
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

async function trackMinDistance(clients, robotA, robotB, targetA, targetB, timeoutMs) {
  const start = Date.now();
  let min = Infinity;
  let sawBoth = false;
  while (Date.now() - start < timeoutMs) {
    const statusMap = await getStatusMap(clients);
    const s1 = statusMap[robotA];
    const s2 = statusMap[robotB];
    if (!s1 || !s2) {
      await delay(200);
      continue;
    }
    const arrivedA = s1.current_station === targetA && s1.task_status !== 2 && s1.task_status !== 3;
    const arrivedB = s2.current_station === targetB && s2.task_status !== 2 && s2.task_status !== 3;
    if (arrivedA || arrivedB) {
      break;
    }
    const movingBoth = activeTasks.has(robotA) && activeTasks.has(robotB);
    if (movingBoth) {
      sawBoth = true;
      const dist = Math.hypot((s1.x || 0) - (s2.x || 0), (s1.y || 0) - (s2.y || 0));
      if (dist < min) {
        min = dist;
      }
    }
    await delay(200);
  }
  return { min, sawBoth };
}

async function run() {
  const sims = [
    spawnSim('sim-1', robots[0].host, robots[0].start, portsByRobot['RB-01']),
    spawnSim('sim-2', robots[1].host, robots[1].start, portsByRobot['RB-02'])
  ];
  const clients = {
    [robots[0].id]: buildClient(robots[0]),
    [robots[1].id]: buildClient(robots[1])
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
    await waitForReady('RB-01', clients['RB-01'], 5000);
    await waitForReady('RB-02', clients['RB-02'], 5000);

    console.log('Scenario 1: head-on block.');
    await moveRobot('RB-01', clients['RB-01'], 'A1');
    await moveRobot('RB-02', clients['RB-02'], 'A4');
    let attempt = await dispatchIfAllowed('RB-01', clients['RB-01'], 'A4', clients);
    if (!attempt.ok) {
      throw new Error('expected RB-01 dispatch to succeed');
    }
    await delay(200);
    attempt = await dispatchIfAllowed('RB-02', clients['RB-02'], 'A1', clients);
    if (attempt.ok) {
      throw new Error('expected RB-02 to be blocked head-on');
    }
    await waitForStation('RB-01', clients['RB-01'], 'A4', 25000);
    const okAfter = await waitForDispatch('RB-02', clients['RB-02'], 'A1', clients, 8000);
    if (!okAfter) {
      throw new Error('expected RB-02 to dispatch after head-on release');
    }
    await waitForStation('RB-02', clients['RB-02'], 'A1', 25000);

    console.log('Scenario 2: same direction follow.');
    await moveRobot('RB-01', clients['RB-01'], 'A1');
    await moveRobot('RB-02', clients['RB-02'], 'A2');
    attempt = await dispatchIfAllowed('RB-01', clients['RB-01'], 'A4', clients);
    if (!attempt.ok) {
      throw new Error('expected RB-01 dispatch to succeed');
    }
    await delay(300);
    attempt = await dispatchIfAllowed('RB-02', clients['RB-02'], 'A4', clients);
    if (!attempt.ok) {
      throw new Error('expected RB-02 follow dispatch to succeed');
    }
    const followStats = await trackMinDistance(clients, 'RB-01', 'RB-02', 'A4', 'A4', 20000);
    if (!followStats.sawBoth) {
      throw new Error('expected both robots moving in follow scenario');
    }
    if (followStats.min < 0.4) {
      throw new Error(`follow distance too small (${followStats.min.toFixed(2)})`);
    }
    await waitForStation('RB-01', clients['RB-01'], 'A4', 25000);
    await waitForStation('RB-02', clients['RB-02'], 'A4', 25000);

    console.log('Scenario 3: merge into bridge.');
    await moveRobot('RB-01', clients['RB-01'], 'B1');
    await moveRobot('RB-02', clients['RB-02'], 'A1');
    attempt = await dispatchIfAllowed('RB-01', clients['RB-01'], 'A4', clients);
    if (!attempt.ok) {
      throw new Error('expected RB-01 merge dispatch to succeed');
    }
    await delay(400);
    attempt = await dispatchIfAllowed('RB-02', clients['RB-02'], 'A4', clients);
    if (attempt.ok) {
      throw new Error('expected RB-02 merge dispatch to be blocked');
    }
    await waitForStation('RB-01', clients['RB-01'], 'A4', 25000);
    const mergeOk = await waitForDispatch('RB-02', clients['RB-02'], 'A4', clients, 8000);
    if (!mergeOk) {
      throw new Error('expected RB-02 merge dispatch after release');
    }
    await waitForStation('RB-02', clients['RB-02'], 'A4', 25000);

    console.log('Scenario 4: split after shared segment.');
    await moveRobot('RB-01', clients['RB-01'], 'A1');
    await moveRobot('RB-02', clients['RB-02'], 'A1');
    attempt = await dispatchIfAllowed('RB-01', clients['RB-01'], 'A4', clients);
    if (!attempt.ok) {
      throw new Error('expected RB-01 split dispatch to succeed');
    }
    await delay(1500);
    attempt = await dispatchIfAllowed('RB-02', clients['RB-02'], 'B4', clients);
    if (!attempt.ok) {
      throw new Error('expected RB-02 split dispatch to succeed');
    }
    await waitForStation('RB-01', clients['RB-01'], 'A4', 25000);
    await waitForStation('RB-02', clients['RB-02'], 'B4', 25000);

    console.log('Scenario 5: crossing at intersection.');
    await moveRobot('RB-01', clients['RB-01'], 'A2');
    await moveRobot('RB-02', clients['RB-02'], 'B3');
    attempt = await dispatchIfAllowed('RB-01', clients['RB-01'], 'B2', clients);
    if (!attempt.ok) {
      throw new Error('expected RB-01 crossing dispatch to succeed');
    }
    attempt = await dispatchIfAllowed('RB-02', clients['RB-02'], 'A3', clients);
    if (attempt.ok) {
      throw new Error('expected RB-02 crossing dispatch to be blocked');
    }
    await waitForStation('RB-01', clients['RB-01'], 'B2', 20000);
    const crossOk = await waitForDispatch('RB-02', clients['RB-02'], 'A3', clients, 8000);
    if (!crossOk) {
      throw new Error('expected RB-02 crossing dispatch after release');
    }
    await waitForStation('RB-02', clients['RB-02'], 'A3', 20000);

    console.log('Scenario 6: lock refresh during pause.');
    await moveRobot('RB-01', clients['RB-01'], 'A1');
    await moveRobot('RB-02', clients['RB-02'], 'A4');
    attempt = await dispatchIfAllowed('RB-01', clients['RB-01'], 'A4', clients);
    if (!attempt.ok) {
      throw new Error('expected RB-01 pause dispatch to succeed');
    }
    await delay(300);
    await clients['RB-01'].pauseTask();
    await delay(400);
    attempt = await dispatchIfAllowed('RB-02', clients['RB-02'], 'A1', clients);
    if (attempt.ok) {
      throw new Error('expected RB-02 blocked while RB-01 paused');
    }
    await delay(lockTimeoutMs + 1200);
    attempt = await dispatchIfAllowed('RB-02', clients['RB-02'], 'A1', clients);
    if (attempt.ok) {
      throw new Error('expected RB-02 still blocked after lock refresh window');
    }
    await clients['RB-01'].resumeTask();
    await waitForStation('RB-01', clients['RB-01'], 'A4', 25000);
    const okAfterPause = await waitForDispatch('RB-02', clients['RB-02'], 'A1', clients, 8000);
    if (!okAfterPause) {
      throw new Error('expected RB-02 dispatch after pause release');
    }
    await waitForStation('RB-02', clients['RB-02'], 'A1', 25000);

    console.log('Scenario 7: stale lock expiry.');
    await moveRobot('RB-01', clients['RB-01'], 'A1');
    await moveRobot('RB-02', clients['RB-02'], 'A4');
    const reserve = await reserveOnly('RB-01', 'A4', clients);
    if (!reserve.ok) {
      throw new Error('expected RB-01 reserve to succeed');
    }
    attempt = await dispatchIfAllowed('RB-02', clients['RB-02'], 'A1', clients);
    if (attempt.ok) {
      throw new Error('expected RB-02 blocked by stale lock');
    }
    await delay(lockTimeoutMs + 800);
    const okAfterExpiry = await waitForDispatch('RB-02', clients['RB-02'], 'A1', clients, 8000);
    if (!okAfterExpiry) {
      throw new Error('expected RB-02 dispatch after lock expiry');
    }
    await waitForStation('RB-02', clients['RB-02'], 'A1', 25000);

    exitCode = 0;
    console.log('E2E ok: traffic scenarios covered.');
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
