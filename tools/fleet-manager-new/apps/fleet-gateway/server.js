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

function normalizeRobots(list) {
  if (!Array.isArray(list)) return [];
  return list.map((robot, index) => ({
    robotId: robot.robotId || robot.id || `RB-${String(index + 1).padStart(2, '0')}`,
    provider: robot.provider || 'unknown',
    status: robot.status || 'offline',
    lastSeenTsMs: robot.lastSeenTsMs || null
  }));
}

function startServer(config) {
  const robots = normalizeRobots(config.robots);

  function upsertRobot(robotId, update) {
    let robot = robots.find((entry) => entry.robotId === robotId);
    if (!robot) {
      robot = { robotId, provider: 'unknown', status: 'offline', lastSeenTsMs: null };
      robots.push(robot);
    }
    Object.assign(robot, update);
    return robot;
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const { pathname } = url;

    if (req.method === 'GET' && pathname === '/gateway/v1/health') {
      sendJson(res, 200, { status: 'ok', tsMs: nowMs() });
      return;
    }

    if (req.method === 'GET' && pathname === '/gateway/v1/robots') {
      sendJson(res, 200, { robots });
      return;
    }

    const statusMatch = pathname.match(/^\/gateway\/v1\/robots\/([^/]+)\/status$/);
    if (req.method === 'GET' && statusMatch) {
      const robotId = statusMatch[1];
      const robot = robots.find((entry) => entry.robotId === robotId);
      if (!robot) {
        sendJson(res, 404, { error: 'robot_not_found', robotId });
        return;
      }
      sendJson(res, 200, { robotId, status: robot.status, provider: robot.provider, lastSeenTsMs: robot.lastSeenTsMs });
      return;
    }

    const commandMatch = pathname.match(/^\/gateway\/v1\/robots\/([^/]+)\/commands$/);
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
      const robot = upsertRobot(robotId, { lastSeenTsMs: nowMs(), status: 'command_sent' });
      sendJson(res, 200, { ok: true, robotId, commandId, provider: robot.provider, command: payload?.command || null });
      return;
    }

    const providerMatch = pathname.match(/^\/gateway\/v1\/robots\/([^/]+)\/provider-switch$/);
    if (req.method === 'POST' && providerMatch) {
      let payload = null;
      try {
        payload = await readJsonBody(req);
      } catch (err) {
        sendJson(res, 400, { error: err.code || 'invalid_json' });
        return;
      }
      const robotId = providerMatch[1];
      const robot = upsertRobot(robotId, { provider: payload?.targetProvider || 'unknown' });
      sendJson(res, 200, { ok: true, robotId, provider: robot.provider });
      return;
    }

    sendText(res, 404, 'not found');
  });

  const host = config.server?.host || '0.0.0.0';
  const port = config.server?.port || 8081;
  server.listen(port, host, () => {
    console.log(`fleet-gateway listening on ${host}:${port}`);
  });

  return server;
}

module.exports = {
  startServer
};
