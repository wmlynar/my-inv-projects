const http = require('http');
const crypto = require('crypto');

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
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    'Access-Control-Allow-Origin': '*'
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
    activeSceneId: null,
    robots: [],
    tasks: []
  };

  function upsertRobot(robotId, update) {
    let robot = state.robots.find((entry) => entry.robotId === robotId);
    if (!robot) {
      robot = { robotId, provider: null };
      state.robots.push(robot);
    }
    Object.assign(robot, update);
    return robot;
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const { pathname } = url;

    if (req.method === 'GET' && (pathname === '/api/v1/health' || pathname === '/health')) {
      sendJson(res, 200, { status: 'ok', tsMs: nowMs() });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/v1/state') {
      sendJson(res, 200, {
        cursor: 0,
        tsMs: nowMs(),
        activeSceneId: state.activeSceneId,
        controlLease: state.lease,
        robots: state.robots,
        tasks: state.tasks
      });
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
      const taskId = createId('task');
      const task = {
        taskId,
        createdTsMs: nowMs(),
        ...payload?.task
      };
      state.tasks.push(task);
      sendJson(res, 200, { taskId, ok: true });
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
      upsertRobot(robotId, { lastCommandId: commandId, lastCommand: payload?.command || null });
      sendJson(res, 200, { ok: true, robotId, commandId });
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
      const robot = upsertRobot(robotId, { provider: payload?.targetProvider || null });
      sendJson(res, 200, { ok: true, robotId, provider: robot.provider });
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
