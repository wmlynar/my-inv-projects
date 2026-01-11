const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createRuntime } = require('./mvp0/runtime');
const { createGatewayClient } = require('./mvp0/gateway_client');
const { createDclRuntime } = require('./orchestrator/runtime_dcl');
const { createJsonlSink } = require('./orchestrator/log_sink');

function nowMs() {
  return Date.now();
}

function createId(prefix) {
  const rand = crypto.randomBytes(6).toString('hex');
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(text);
}

function readJsonBody(req, limitBytes = 1_000_000) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > limitBytes) {
        const err = new Error('payload too large');
        err.code = 'payload_too_large';
        req.destroy(err);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) {
        resolve(null);
        return;
      }
      const text = Buffer.concat(chunks).toString('utf8').trim();
      if (!text) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch (err) {
        err.code = 'invalid_json';
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function startSse(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  res.write(`event: hello\ndata: ${JSON.stringify({ tsMs: nowMs() })}\n\n`);
  const interval = setInterval(() => {
    res.write(`: ping ${nowMs()}\n\n`);
  }, 15000);
  req.on('close', () => {
    clearInterval(interval);
  });
}

function startServer(config) {
  const state = {
    lease: null,
    scenes: [],
    activeSceneId: null
  };
  const streamClients = new Set();

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
    if (!streamClients.size) return;
    const data = `event: state\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const res of streamClients) {
      try {
        res.write(data);
      } catch (_err) {
        streamClients.delete(res);
      }
    }
  };

  const buildStreamPayload = (snapshot) => ({
    ok: true,
    tsMs: nowMs(),
    activeSceneId: state.activeSceneId,
    controlLease: state.lease,
    robots: snapshot.robots,
    tasks: snapshot.tasks
  });

  setInterval(() => {
    const decision = runtime.tick({ nowMs: nowMs() });
    for (const command of decision.commands) {
      gatewayClient.sendCommand(command).catch((err) => {
        console.warn(`gateway command failed: ${err.message}`);
      });
    }
    broadcastState(buildStreamPayload(decision));
  }, tickMs);

  const startStateStream = (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(':\n\n');
    const snapshot = runtime.getState();
    res.write(`event: state\ndata: ${JSON.stringify(buildStreamPayload(snapshot))}\n\n`);
    streamClients.add(res);
    req.on('close', () => {
      streamClients.delete(res);
    });
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const { pathname } = url;

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      });
      res.end();
      return;
    }

    if (req.method === 'GET' && (pathname === '/api/v1/health' || pathname === '/health')) {
      sendJson(res, 200, { status: 'ok', tsMs: nowMs() });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/v1/state') {
      const runtimeState = runtime.getState();
      sendJson(res, 200, {
        cursor: 0,
        tsMs: nowMs(),
        activeSceneId: state.activeSceneId,
        controlLease: state.lease,
        robots: runtimeState.robots,
        tasks: runtimeState.tasks
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/v1/stream') {
      startStateStream(req, res);
      return;
    }

    if (req.method === 'GET' && (pathname === '/api/v1/events' || pathname === '/api/v1/events/stream')) {
      startSse(req, res);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/v1/control-lease/seize') {
      let payload = null;
      try {
        payload = await readJsonBody(req);
      } catch (err) {
        sendJson(res, 400, { error: err.code || 'invalid_json' });
        return;
      }
      const force = Boolean(payload && payload.force);
      if (state.lease && !force) {
        sendJson(res, 409, { error: 'conflict', causeCode: 'CONFLICT' });
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
      sendJson(res, 200, { lease: state.lease });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/v1/control-lease/renew') {
      let payload = null;
      try {
        payload = await readJsonBody(req);
      } catch (err) {
        sendJson(res, 400, { error: err.code || 'invalid_json' });
        return;
      }
      if (!state.lease || state.lease.leaseId !== payload?.leaseId) {
        sendJson(res, 409, { error: 'invalid_lease' });
        return;
      }
      const ttlMs = Number.isFinite(payload?.ttlMs) ? payload.ttlMs : 15000;
      state.lease = { ...state.lease, expiresTsMs: nowMs() + ttlMs };
      sendJson(res, 200, { lease: state.lease });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/v1/control-lease/release') {
      let payload = null;
      try {
        payload = await readJsonBody(req);
      } catch (err) {
        sendJson(res, 400, { error: err.code || 'invalid_json' });
        return;
      }
      if (!state.lease || state.lease.leaseId !== payload?.leaseId) {
        sendJson(res, 409, { error: 'invalid_lease' });
        return;
      }
      state.lease = null;
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/v1/scenes/import') {
      let payload = null;
      try {
        payload = await readJsonBody(req);
      } catch (err) {
        sendJson(res, 400, { error: err.code || 'invalid_json' });
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
      let payload = null;
      try {
        payload = await readJsonBody(req);
      } catch (err) {
        sendJson(res, 400, { error: err.code || 'invalid_json' });
        return;
      }
      if (!payload?.sceneId) {
        sendJson(res, 400, { error: 'missing_scene_id' });
        return;
      }
      state.activeSceneId = payload.sceneId;
      sendJson(res, 200, { ok: true, sceneId: payload.sceneId });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/v1/tasks') {
      let payload = null;
      try {
        payload = await readJsonBody(req);
      } catch (err) {
        sendJson(res, 400, { error: err.code || 'invalid_json' });
        return;
      }
      try {
        const task = runtime.createTask(payload?.task || {}, nowMs());
        sendJson(res, 200, { taskId: task.taskId, ok: true });
      } catch (err) {
        sendJson(res, 400, { error: err.message || 'invalid_task' });
      }
      return;
    }

    const commandMatch = pathname.match(/^\/api\/v1\/robots\/([^/]+)\/commands$/);
    if (req.method === 'POST' && commandMatch) {
      let payload = null;
      try {
        payload = await readJsonBody(req);
      } catch (err) {
        sendJson(res, 400, { error: err.code || 'invalid_json' });
        return;
      }
      const robotId = commandMatch[1];
      const commandId = createId('cmd');
      const command = { ...(payload?.command || {}), robotId };
      try {
        await gatewayClient.sendCommand(command);
        sendJson(res, 200, { ok: true, robotId, commandId });
      } catch (err) {
        sendJson(res, 503, { ok: false, robotId, commandId, error: err.message || 'gateway_error' });
      }
      return;
    }

    const providerMatch = pathname.match(/^\/api\/v1\/robots\/([^/]+)\/provider-switch$/);
    if (req.method === 'POST' && providerMatch) {
      let payload = null;
      try {
        payload = await readJsonBody(req);
      } catch (err) {
        sendJson(res, 400, { error: err.code || 'invalid_json' });
        return;
      }
      const robotId = providerMatch[1];
      sendJson(res, 200, { ok: true, robotId, provider: payload?.targetProvider || null });
      return;
    }

    const statusMatch = pathname.match(/^\/api\/v1\/robots\/([^/]+)\/status$/);
    if (req.method === 'POST' && statusMatch) {
      let payload = null;
      try {
        payload = await readJsonBody(req);
      } catch (err) {
        sendJson(res, 400, { error: err.code || 'invalid_json' });
        return;
      }
      const robotId = statusMatch[1];
      try {
        const updated = runtime.upsertRobotStatus(robotId, payload?.status || {}, nowMs());
        sendJson(res, 200, { ok: true, robot: updated });
      } catch (err) {
        sendJson(res, 400, { error: err.message || 'invalid_robot_status' });
      }
      return;
    }

    if (req.method === 'GET' && pathname === '/api/v1/scenes') {
      sendJson(res, 200, { scenes: state.scenes });
      return;
    }

    sendText(res, 404, 'not found');
  });

  const host = config.server?.host || '0.0.0.0';
  const port = config.server?.port || 8080;
  server.listen(port, host, () => {
    console.log(`fleet-core listening on ${host}:${port}`);
  });

  return server;
}

module.exports = {
  startServer
};
