const path = require('path');
const http = require('http');
const { URL } = require('url');

const { loadMapGraphLight } = require('@fleet-manager/core-graph');

const { config, configWarnings } = require('./config');
const { readJson5 } = require('./lib/json5');
const { ensureDir, WorksiteStore, TaskStore } = require('./lib/state_store');
const { Scheduler } = require('./lib/scheduler');
const { buildDefaultWorksiteState } = require('./lib/workflow_helpers');
const { createRobotContext } = require('./adapters/robot_factory');
const { EventLog } = require('./adapters/event_log');
const { State } = require('./domain/state');
const { getStatus } = require('./usecases/get_status');
const { updateWorksite } = require('./usecases/update_worksite');
const { dispatchTick } = require('./usecases/dispatch_tick');

ensureDir(config.stateDir);

const WORKSITE_STATE_PATH = path.join(config.stateDir, 'worksites.json');
const TASK_STATE_PATH = path.join(config.stateDir, 'tasks.json');
const EVENT_LOG_PATH = path.join(config.stateDir, 'events.jsonl');
const eventLog = new EventLog(EVENT_LOG_PATH);

const graph = loadMapGraphLight(config.graphPath);
const workflow = readJson5(config.workflowPath);

const worksiteStore = new WorksiteStore(WORKSITE_STATE_PATH, () => buildDefaultWorksiteState(workflow));
const taskStore = new TaskStore(TASK_STATE_PATH);

const robotContext = createRobotContext({ config });
const primaryRobokit = robotContext.robokitClients[robotContext.robots[0].id];

const state = new State({
  graph,
  workflow,
  worksiteStore,
  taskStore,
  robots: robotContext.robots,
  assignments: robotContext.parkAssignments
});

const scheduler = new Scheduler({
  robokitClients: robotContext.robokitClients,
  state,
  strategy: config.robotSelectStrategy,
  routePolicy: config.routePolicy,
  routePolicyOptions: {
    allowSameDirection: config.routePolicyEdgeLockAllowSameDirection,
    lockTimeoutMs: config.routePolicyEdgeLockTimeoutMs
  },
  offlineTimeoutMs: config.robotOfflineTimeoutMs,
  stallTimeoutMs: config.robotStallTimeoutMs
});

let loopRunning = false;
async function executeActions(actions) {
  for (const action of actions || []) {
    if (action.type !== 'go_target') {
      continue;
    }
    const client = robotContext.robokitClients[action.robotId];
    if (!client) {
      scheduler.applyActionResult(action, { ret_code: 1, err_msg: 'robot_not_found' });
      continue;
    }
    try {
      const response = await client.goTarget(action.targetId);
      scheduler.applyActionResult(action, response);
      action._response = response;
    } catch (err) {
      scheduler.applyActionResult(action, { ret_code: 1, err_msg: err.message });
      action._response = { ret_code: 1, err_msg: err.message };
    }
  }
}

setInterval(() => {
  if (loopRunning) {
    return;
  }
  loopRunning = true;
  dispatchTick({
    scheduler,
    eventLog,
    executor: async (action) => {
      await executeActions([action]);
      return action._response;
    }
  }).finally(() => {
    loopRunning = false;
  });
}, config.tickMs);

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > config.maxBodyLength) {
        reject(new Error('body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function worksiteSnapshot(site) {
  const state = worksiteStore.get(site.id);
  return {
    id: site.id,
    group: site.group,
    point: site.point,
    pos: site.pos,
    filled: Boolean(state.filled),
    blocked: Boolean(state.blocked)
  };
}

function getRobotClient(robotId) {
  return robotContext.robokitClients[robotId] || null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathName = url.pathname;
  const segments = pathName.split('/').filter(Boolean);

  try {
    if (req.method === 'GET' && pathName === '/health') {
      return sendJson(res, 200, { ok: true });
    }

    if (segments[0] === 'api' && segments[1] === 'status' && req.method === 'GET') {
      return sendJson(
        res,
        200,
        getStatus({
          scheduler,
          config
        })
      );
    }

    if (segments[0] === 'api' && segments[1] === 'worksites') {
      if (segments.length === 2 && req.method === 'GET') {
        const list = scheduler.worksites.map(worksiteSnapshot);
        return sendJson(res, 200, { worksites: list });
      }
      if (segments.length === 3 && req.method === 'POST') {
        const siteId = segments[2];
        const site = scheduler.worksites.find((item) => item.id === siteId);
        if (!site) {
          return sendJson(res, 404, { error: 'worksite_not_found' });
        }
        const rawBody = await readBody(req);
        const body = rawBody ? JSON.parse(rawBody) : {};
        const updated = updateWorksite({
          state,
          worksiteId: siteId,
          updates: { filled: body.filled, blocked: body.blocked },
          eventLog
        });
        return sendJson(res, 200, {
          worksite: { ...worksiteSnapshot(site), ...updated }
        });
      }
    }

    if (segments[0] === 'api' && segments[1] === 'tasks' && req.method === 'GET') {
      return sendJson(res, 200, { tasks: scheduler.tasks });
    }

    if (segments[0] === 'api' && segments[1] === 'robots' && segments[2]) {
      const robotId = segments[2];
      const client = getRobotClient(robotId);
      if (!client) {
        return sendJson(res, 404, { error: 'robot_not_found' });
      }
      if (segments[3] === 'manual' && req.method === 'POST') {
        const rawBody = await readBody(req);
        const body = rawBody ? JSON.parse(rawBody) : {};
        const enabled = Boolean(body.enabled);
        const override = scheduler.setRobotManualMode(robotId, enabled);
        return sendJson(res, 200, { ok: true, manualMode: Boolean(override?.manualMode) });
      }
      if (segments[3] === 'go-target' && req.method === 'POST') {
        const rawBody = await readBody(req);
        const body = rawBody ? JSON.parse(rawBody) : {};
        const targetId = body.id || body.targetId || body.pointId;
        if (!targetId) {
          return sendJson(res, 400, { error: 'missing_target' });
        }
        const result = await client.goTarget(targetId);
        return sendJson(res, 200, { result });
      }
      if (segments[3] === 'go-point' && req.method === 'POST') {
        const rawBody = await readBody(req);
        const body = rawBody ? JSON.parse(rawBody) : {};
        const x = Number.parseFloat(body.x);
        const y = Number.parseFloat(body.y);
        const angle = Number.isFinite(body.angle) ? Number(body.angle) : undefined;
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return sendJson(res, 400, { error: 'missing_point' });
        }
        const result = await client.goPoint(x, y, angle);
        return sendJson(res, 200, { result });
      }
      if (segments[3] === 'motion' && req.method === 'POST') {
        const rawBody = await readBody(req);
        const body = rawBody ? JSON.parse(rawBody) : {};
        const vx = Number.parseFloat(body.vx);
        const vy = Number.parseFloat(body.vy);
        const w = Number.parseFloat(body.w);
        if (!Number.isFinite(vx) && !Number.isFinite(vy) && !Number.isFinite(w)) {
          return sendJson(res, 400, { error: 'missing_motion' });
        }
        const payload = {};
        if (Number.isFinite(vx)) payload.vx = vx;
        if (Number.isFinite(vy)) payload.vy = vy;
        if (Number.isFinite(w)) payload.w = w;
        const result = await client.controlMotion(payload);
        return sendJson(res, 200, { result });
      }
      if (segments[3] === 'translate' && req.method === 'POST') {
        const rawBody = await readBody(req);
        const body = rawBody ? JSON.parse(rawBody) : {};
        const dist = Number.parseFloat(body.dist);
        const vx = Number.parseFloat(body.vx);
        const vy = Number.parseFloat(body.vy);
        const mode = Number.isFinite(body.mode) ? Number(body.mode) : undefined;
        if (!Number.isFinite(dist)) {
          return sendJson(res, 400, { error: 'missing_dist' });
        }
        const result = await client.translate(
          dist,
          Number.isFinite(vx) ? vx : undefined,
          Number.isFinite(vy) ? vy : undefined,
          mode
        );
        return sendJson(res, 200, { result });
      }
      if (segments[3] === 'turn' && req.method === 'POST') {
        const rawBody = await readBody(req);
        const body = rawBody ? JSON.parse(rawBody) : {};
        const angle = Number.parseFloat(body.angle);
        const vw = Number.parseFloat(body.vw);
        const mode = Number.isFinite(body.mode) ? Number(body.mode) : undefined;
        if (!Number.isFinite(angle) || !Number.isFinite(vw)) {
          return sendJson(res, 400, { error: 'missing_turn' });
        }
        const result = await client.turn(angle, vw, mode);
        return sendJson(res, 200, { result });
      }
      if (segments[3] === 'pause' && req.method === 'POST') {
        const result = await client.pauseTask();
        return sendJson(res, 200, { result });
      }
      if (segments[3] === 'resume' && req.method === 'POST') {
        const result = await client.resumeTask();
        return sendJson(res, 200, { result });
      }
      if (segments[3] === 'cancel' && req.method === 'POST') {
        const result = await client.cancelTask();
        return sendJson(res, 200, { result });
      }
      if (segments[3] === 'stop' && req.method === 'POST') {
        const result = await client.controlStop();
        return sendJson(res, 200, { result });
      }
    }

    if (segments[0] === 'api' && segments[1] === 'stream' && req.method === 'GET') {
      return sendJson(res, 200, { stream: scheduler.stream });
    }

    if (segments[0] === 'api' && segments[1] === 'robot') {
      if (segments[2] === 'map' && req.method === 'GET') {
        const result = await primaryRobokit.getStatusMap();
        return sendJson(res, 200, { map: result });
      }
      if (segments[2] === 'stations' && req.method === 'GET') {
        const result = await primaryRobokit.getStatusStations();
        return sendJson(res, 200, { stations: result });
      }
      if (segments[2] === 'load-map' && req.method === 'POST') {
        const rawBody = await readBody(req);
        const body = rawBody ? JSON.parse(rawBody) : {};
        const result = await primaryRobokit.controlLoadMap(body);
        return sendJson(res, 200, { result });
      }
    }

    return sendJson(res, 404, { error: 'not_found' });
  } catch (err) {
    return sendJson(res, 500, { error: 'server_error', message: err.message });
  }
});

server.listen(config.port, config.bindHost || undefined, () => {
  const hostLabel = config.bindHost || '0.0.0.0';
  console.log(`task-manager listening on http://${hostLabel}:${config.port}`);
  if (configWarnings.length) {
    console.log(`config warnings: ${configWarnings.join(' ')}`);
  }
  console.log(`robokit host: ${config.robokitHost}`);
  console.log(`robokit state port: ${config.robokitStatePort}`);
  console.log(`robokit task port: ${config.robokitTaskPort}`);
  console.log(`workflow: ${config.workflowPath}`);
  console.log(`graph: ${config.graphPath}`);
});
