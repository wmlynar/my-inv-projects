const http = require('http');
const crypto = require('crypto');
const { createGateway } = require('./lib/gateway');

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

function sendOptions(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end();
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

function startServer(config, options = {}) {
  const gateway = options.gateway || createGateway(config, options.deps || {});

  const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      sendOptions(res);
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const { pathname } = url;

    if (req.method === 'GET' && pathname === '/gateway/v1/health') {
      sendJson(res, 200, { status: 'ok', tsMs: nowMs() });
      return;
    }

    if (req.method === 'GET' && pathname === '/gateway/v1/robots') {
      const robots = await gateway.listRobots();
      sendJson(res, 200, { robots });
      return;
    }

    const statusMatch = pathname.match(/^\/gateway\/v1\/robots\/([^/]+)\/status$/);
    if (req.method === 'GET' && statusMatch) {
      const robotId = decodeURIComponent(statusMatch[1]);
      const status = await gateway.getRobotStatus(robotId);
      if (!status) {
        sendJson(res, 404, { error: 'robot_not_found', robotId });
        return;
      }
      sendJson(res, 200, status);
      return;
    }

    const commandMatch = pathname.match(/^\/gateway\/v1\/robots\/([^/]+)\/commands$/);
    if (req.method === 'POST' && commandMatch) {
      const robotId = decodeURIComponent(commandMatch[1]);
      let payload = null;
      try {
        payload = await readJsonBody(req);
      } catch (err) {
        sendJson(res, 400, { error: err.code || 'invalid_json' });
        return;
      }

      const command = payload?.command || payload || {};
      if (!command.commandId) {
        command.commandId = createId('cmd');
      }
      const result = await gateway.sendCommand(robotId, command);
      if (!result.ok && !result.ack) {
        sendJson(res, result.httpStatus || 500, { error: result.error || 'command_failed' });
        return;
      }
      sendJson(res, result.httpStatus || 200, result.ack || { ok: true });
      return;
    }

    const providerMatch = pathname.match(/^\/gateway\/v1\/robots\/([^/]+)\/provider-switch$/);
    if (req.method === 'POST' && providerMatch) {
      const robotId = decodeURIComponent(providerMatch[1]);
      let payload = null;
      try {
        payload = await readJsonBody(req);
      } catch (err) {
        sendJson(res, 400, { error: err.code || 'invalid_json' });
        return;
      }
      const targetProvider = payload?.targetProvider || payload?.provider || null;
      const result = await gateway.switchProvider(robotId, targetProvider);
      if (!result.ok) {
        sendJson(res, result.httpStatus || 500, { error: result.error || 'provider_switch_failed' });
        return;
      }
      sendJson(res, 200, { ok: true, robotId, provider: result.provider });
      return;
    }

    sendText(res, 404, 'not found');
  });

  const host = config.server?.host || '0.0.0.0';
  const port = Number.isFinite(config.server?.port) ? config.server.port : 8081;
  server.listen(port, host, () => {
    console.log(`fleet-gateway listening on ${host}:${port}`);
  });

  return server;
}

module.exports = {
  startServer
};
