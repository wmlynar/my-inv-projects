const http = require('http');
const fs = require('fs');
const path = require('path');
const {
  createId,
  resolveRequestId,
  sendJson,
  sendText,
  sendOptions,
  sendError,
  readJsonBody,
  safeDecode,
  wrapAsync,
  createSseHub
} = require('../../packages/fleet-kit');
const { createRuntime } = require('./mvp0/runtime');
const { createGatewayClient } = require('./mvp0/gateway_client');
const { createDclRuntime } = require('./orchestrator/runtime_dcl');
const { createJsonlSink } = require('./orchestrator/log_sink');

function nowMs() {
  return Date.now();
}

function buildErrorResponse(err, requestId) {
  if (err && err.code === 'payload_too_large') {
    return {
      code: 'validationError',
      causeCode: 'PAYLOAD_TOO_LARGE',
      message: 'Payload too large',
      status: 413,
      requestId
    };
  }
  if (err && err.code === 'invalid_json') {
    return {
      code: 'validationError',
      causeCode: 'INVALID_JSON',
      message: 'Invalid JSON payload',
      status: 400,
      requestId
    };
  }
  return {
    code: 'internalError',
    causeCode: 'UNKNOWN',
    message: err?.message || 'Internal error',
    status: 500,
    requestId
  };
}

function startServer(config) {
  const state = {
    lease: null,
    scenes: [],
    activeSceneId: null
  };
  const serverInstanceId = createId('core');
  let cursor = 0;
  const streamHub = createSseHub({
    eventName: 'state',
    heartbeatMs: 15000,
    retryMs: 2000,
    headers: {
      'X-Accel-Buffering': 'no'
    }
  });
  const eventsHub = createSseHub({
    eventName: 'hello',
    heartbeatMs: 15000,
    retryMs: 2000,
    headers: {
      'X-Accel-Buffering': 'no'
    }
  });

  const runtimeMode = config.runtime?.mode || 'mvp0';
  const resolveConfigPath = (filePath) => {
    if (!filePath) return null;
    if (path.isAbsolute(filePath)) return filePath;
    const baseDir = config._configDir || process.cwd();
    return path.resolve(baseDir, filePath);
  };
  const logPath = resolveConfigPath(config.runtime?.logPath);
  const logSink = logPath ? createJsonlSink(logPath) : null;

  let runtime;
  if (runtimeMode === 'dcl') {
    const compiledMapPath = resolveConfigPath(config.runtime?.compiledMapPath);
    if (!compiledMapPath || !fs.existsSync(compiledMapPath)) {
      throw new Error(`compiledMapPath missing: ${compiledMapPath || 'unset'}`);
    }
    const compiledMap = JSON.parse(fs.readFileSync(compiledMapPath, 'utf8'));
    runtime = createDclRuntime({
      compiledMap,
      statusAgeMaxMs: config.runtime?.statusAgeMaxMs,
      commandCooldownMs: config.runtime?.commandCooldownMs,
      orchestratorOptions: config.runtime?.orchestratorOptions,
      logSink
    });
  } else {
    runtime = createRuntime({
      statusAgeMaxMs: config.runtime?.statusAgeMaxMs,
      commandCooldownMs: config.runtime?.commandCooldownMs
    });
  }
  const gatewayClient = createGatewayClient(config.gateway || {});
  const tickMs = Number.isFinite(config.runtime?.tickMs)
    ? config.runtime.tickMs
    : Number.isFinite(config.runtime?.tickHz)
      ? Math.max(50, Math.floor(1000 / config.runtime.tickHz))
      : 200;

  const broadcastState = (payload) => {
    streamHub.send(payload);
  };

  const buildStreamPayload = (snapshot, cursorValue) => ({
    ok: true,
    cursor: cursorValue,
    tsMs: nowMs(),
    serverInstanceId,
    activeSceneId: state.activeSceneId,
    controlLease: state.lease,
    robots: snapshot.robots,
    tasks: snapshot.tasks
  });

  const expireLeaseIfNeeded = () => {
    if (!state.lease) return;
    if (state.lease.expiresTsMs <= nowMs()) {
      state.lease = null;
    }
  };

  const requireLease = (payload, requestId) => {
    expireLeaseIfNeeded();
    if (!state.lease) {
      return {
        ok: false,
        error: {
          code: 'conflict',
          causeCode: 'CONTROL_LEASE_REQUIRED',
          message: 'control lease required',
          requestId
        }
      };
    }
    if (!payload?.leaseId) {
      return {
        ok: false,
        error: {
          code: 'conflict',
          causeCode: 'CONTROL_LEASE_REQUIRED',
          message: 'leaseId is required for mutating requests',
          requestId
        }
      };
    }
    if (payload.leaseId !== state.lease.leaseId) {
      return {
        ok: false,
        error: {
          code: 'conflict',
          causeCode: 'INVALID_LEASE',
          message: 'invalid control lease',
          requestId
        }
      };
    }
    return { ok: true, lease: state.lease };
  };

  const readPayload = async (req, res, requestId) => {
    try {
      return await readJsonBody(req);
    } catch (err) {
      sendError(res, buildErrorResponse(err, requestId));
      return undefined;
    }
  };

  let tickRunning = false;
  let tickTimer = null;
  const runTick = async () => {
    if (tickRunning) return;
    tickRunning = true;
    const started = nowMs();
    try {
      const decision = runtime.tick({ nowMs: started });
      expireLeaseIfNeeded();
      cursor += 1;
      const payload = buildStreamPayload(decision, cursor);
      for (const command of decision.commands) {
        gatewayClient.sendCommand(command).catch((err) => {
          console.warn(`gateway command failed: ${err.message}`);
        });
      }
      broadcastState(payload);
    } catch (err) {
      console.warn(`tick failed: ${err.message}`);
    } finally {
      tickRunning = false;
      const elapsed = nowMs() - started;
      const delay = Math.max(0, tickMs - elapsed);
      tickTimer = setTimeout(runTick, delay);
    }
  };
  tickTimer = setTimeout(runTick, tickMs);

  const startStateStream = (req, res) => {
    const snapshot = runtime.getState();
    streamHub.addClient(req, res, buildStreamPayload(snapshot, cursor), cursor);
  };

  const startEventsStream = (req, res) => {
    eventsHub.addClient(req, res, { tsMs: nowMs() });
  };

  const server = http.createServer(wrapAsync(async (req, res) => {
    const requestId = resolveRequestId(req, res);
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const { pathname } = url;

    expireLeaseIfNeeded();

    if (req.method === 'OPTIONS') {
      sendOptions(res);
      return;
    }

    if (req.method === 'GET' && (pathname === '/api/v1/health' || pathname === '/health')) {
      sendJson(res, 200, { status: 'ok', tsMs: nowMs(), serverInstanceId });
      return;
    }

    if (req.method === 'GET' && (pathname === '/api/v1/ready' || pathname === '/ready')) {
      sendJson(res, 200, {
        status: 'ok',
        tsMs: nowMs(),
        serverInstanceId,
        runtimeMode
      });
      return;
    }

    if (req.method === 'GET' && (pathname === '/api/v1/state' || pathname === '/api/fleet/state' || pathname === '/api/fleet/status')) {
      const runtimeState = runtime.getState();
      sendJson(res, 200, {
        cursor,
        tsMs: nowMs(),
        serverInstanceId,
        activeSceneId: state.activeSceneId,
        controlLease: state.lease,
        robots: runtimeState.robots,
        tasks: runtimeState.tasks
      });
      return;
    }

    if (req.method === 'GET' && (pathname === '/api/v1/stream' || pathname === '/api/fleet/stream')) {
      startStateStream(req, res);
      return;
    }

    if (req.method === 'GET' && (pathname === '/api/v1/events' || pathname === '/api/v1/events/stream')) {
      startEventsStream(req, res);
      return;
    }

    if (req.method === 'GET' && (pathname === '/api/fleet/config' || pathname === '/api/v1/ui-config')) {
      const apiBase = '/api/v1';
      sendJson(res, 200, {
        apiBase,
        statePath: `${apiBase}/state`,
        streamPath: `${apiBase}/stream`,
        pollMs: tickMs,
        simMode: 'robokit',
        simModeMutable: false,
        coreConfigured: true
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/scenes') {
      sendJson(res, 200, { activeSceneId: state.activeSceneId, scenes: state.scenes });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/scenes/activate') {
      const payload = await readPayload(req, res, requestId);
      if (payload === undefined) return;
      const lease = requireLease(payload, requestId);
      if (!lease.ok) {
        sendError(res, lease.error);
        return;
      }
      if (!payload?.sceneId) {
        sendError(res, {
          code: 'validationError',
          causeCode: 'VALIDATION_FAILED',
          message: 'sceneId is required',
          requestId
        });
        return;
      }
      state.activeSceneId = payload.sceneId;
      sendJson(res, 200, { activeSceneId: payload.sceneId, activeMapId: payload.mapId || null });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/v1/control-lease/seize') {
      const payload = await readPayload(req, res, requestId);
      if (payload === undefined) return;
      const force = Boolean(payload && payload.force);
      if (state.lease && !force) {
        sendError(res, {
          code: 'conflict',
          causeCode: 'CONTROL_LEASE_SEIZED',
          message: 'lease already held',
          requestId
        });
        return;
      }
      const ttlMs = Number.isFinite(payload?.ttlMs) ? payload.ttlMs : 15000;
      state.lease = {
        leaseId: createId('lease'),
        owner: {
          clientId: payload?.request?.clientId || 'unknown',
          displayName: payload?.displayName || ''
        },
        expiresTsMs: nowMs() + ttlMs
      };
      sendJson(res, 200, { lease: state.lease, ok: true });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/v1/control-lease/renew') {
      const payload = await readPayload(req, res, requestId);
      if (payload === undefined) return;
      expireLeaseIfNeeded();
      if (!state.lease || state.lease.leaseId !== payload?.leaseId) {
        sendError(res, {
          code: 'conflict',
          causeCode: 'INVALID_LEASE',
          message: 'invalid lease',
          requestId
        });
        return;
      }
      const ttlMs = Number.isFinite(payload?.ttlMs) ? payload.ttlMs : 15000;
      state.lease = { ...state.lease, expiresTsMs: nowMs() + ttlMs };
      sendJson(res, 200, { lease: state.lease, ok: true });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/v1/control-lease/release') {
      const payload = await readPayload(req, res, requestId);
      if (payload === undefined) return;
      expireLeaseIfNeeded();
      if (!state.lease || state.lease.leaseId !== payload?.leaseId) {
        sendError(res, {
          code: 'conflict',
          causeCode: 'INVALID_LEASE',
          message: 'invalid lease',
          requestId
        });
        return;
      }
      state.lease = null;
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/v1/scenes/import') {
      const payload = await readPayload(req, res, requestId);
      if (payload === undefined) return;
      const lease = requireLease(payload, requestId);
      if (!lease.ok) {
        sendError(res, lease.error);
        return;
      }
      const sceneId = createId('scene');
      const scene = {
        sceneId,
        sceneName: payload?.sceneName || payload?.name || sceneId,
        createdTsMs: nowMs()
      };
      state.scenes.push(scene);
      sendJson(res, 200, { sceneId, ok: true });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/v1/scenes/activate') {
      const payload = await readPayload(req, res, requestId);
      if (payload === undefined) return;
      const lease = requireLease(payload, requestId);
      if (!lease.ok) {
        sendError(res, lease.error);
        return;
      }
      if (!payload?.sceneId) {
        sendError(res, {
          code: 'validationError',
          causeCode: 'VALIDATION_FAILED',
          message: 'sceneId is required',
          requestId
        });
        return;
      }
      state.activeSceneId = payload.sceneId;
      sendJson(res, 200, { ok: true, sceneId: payload.sceneId });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/v1/tasks') {
      const payload = await readPayload(req, res, requestId);
      if (payload === undefined) return;
      const lease = requireLease(payload, requestId);
      if (!lease.ok) {
        sendError(res, lease.error);
        return;
      }
      try {
        const task = runtime.createTask(payload?.task || {}, nowMs());
        sendJson(res, 201, { taskId: task.taskId, ok: true });
      } catch (err) {
        sendError(res, {
          code: 'validationError',
          causeCode: 'VALIDATION_FAILED',
          message: err.message || 'invalid task',
          requestId
        });
      }
      return;
    }

    const commandMatch = pathname.match(/^\/api\/v1\/robots\/([^/]+)\/commands$/);
    if (req.method === 'POST' && commandMatch) {
      const payload = await readPayload(req, res, requestId);
      if (payload === undefined) return;
      const lease = requireLease(payload, requestId);
      if (!lease.ok) {
        sendError(res, lease.error);
        return;
      }
      const robotId = safeDecode(commandMatch[1]);
      if (!robotId) {
        sendError(res, {
          code: 'validationError',
          causeCode: 'INVALID_PATH',
          message: 'invalid robotId',
          requestId
        });
        return;
      }
      const commandId = createId('cmd');
      const command = { ...(payload?.command || {}), robotId };
      try {
        await gatewayClient.sendCommand(command, { requestId });
        sendJson(res, 200, { ok: true, robotId, commandId });
      } catch (err) {
        sendError(res, {
          code: 'dependencyUnavailable',
          causeCode: 'DEPENDENCY_OFFLINE',
          message: err.message || 'gateway error',
          status: 503,
          requestId,
          details: { robotId, commandId }
        });
      }
      return;
    }

    const providerMatch = pathname.match(/^\/api\/v1\/robots\/([^/]+)\/provider-switch$/);
    if (req.method === 'POST' && providerMatch) {
      const payload = await readPayload(req, res, requestId);
      if (payload === undefined) return;
      const lease = requireLease(payload, requestId);
      if (!lease.ok) {
        sendError(res, lease.error);
        return;
      }
      const robotId = safeDecode(providerMatch[1]);
      if (!robotId) {
        sendError(res, {
          code: 'validationError',
          causeCode: 'INVALID_PATH',
          message: 'invalid robotId',
          requestId
        });
        return;
      }
      sendJson(res, 200, { ok: true, robotId, provider: payload?.targetProvider || null });
      return;
    }

    const statusMatch = pathname.match(/^\/api\/v1\/robots\/([^/]+)\/status$/);
    if (req.method === 'POST' && statusMatch) {
      const payload = await readPayload(req, res, requestId);
      if (!payload && payload !== null) return;
      const robotId = safeDecode(statusMatch[1]);
      if (!robotId) {
        sendError(res, {
          code: 'validationError',
          causeCode: 'INVALID_PATH',
          message: 'invalid robotId',
          requestId
        });
        return;
      }
      try {
        const updated = runtime.upsertRobotStatus(robotId, payload?.status || {}, nowMs());
        sendJson(res, 200, { ok: true, robot: updated });
      } catch (err) {
        sendError(res, {
          code: 'validationError',
          causeCode: 'VALIDATION_FAILED',
          message: err.message || 'invalid robot status',
          requestId
        });
      }
      return;
    }

    if (req.method === 'GET' && pathname === '/api/v1/scenes') {
      sendJson(res, 200, { scenes: state.scenes });
      return;
    }

    sendError(res, {
      code: 'notFound',
      causeCode: 'NOT_FOUND',
      message: 'not found',
      requestId
    });
  }, (err, req, res) => {
    const requestId = resolveRequestId(req, res);
    sendError(res, buildErrorResponse(err, requestId));
  }));

  const host = config.server?.host || '0.0.0.0';
  const port = config.server?.port || 8080;
  server.listen(port, host, () => {
    console.log(`fleet-core listening on ${host}:${port}`);
  });

  server.on('close', () => {
    if (tickTimer) clearTimeout(tickTimer);
    streamHub.close();
    eventsHub.close();
  });

  return server;
}

module.exports = {
  startServer
};
