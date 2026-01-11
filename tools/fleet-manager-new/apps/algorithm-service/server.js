const http = require('http');

function nowMs() {
  return Date.now();
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

function startServer(config) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const { pathname } = url;

    if (req.method === 'GET' && pathname === '/algo/v1/health') {
      sendJson(res, 200, { status: 'ok', tsMs: nowMs() });
      return;
    }

    if (req.method === 'POST' && pathname === '/algo/v1/initScene') {
      let payload = null;
      try {
        payload = await readJsonBody(req);
      } catch (err) {
        sendJson(res, 400, { error: err.code || 'invalid_json' });
        return;
      }
      sendJson(res, 200, { ok: true, sceneId: payload?.sceneId || null });
      return;
    }

    if (req.method === 'POST' && pathname === '/algo/v1/decide') {
      let payload = null;
      try {
        payload = await readJsonBody(req);
      } catch (err) {
        sendJson(res, 400, { error: err.code || 'invalid_json' });
        return;
      }
      sendJson(res, 200, {
        decisions: [],
        tsMs: nowMs(),
        meta: {
          receivedCursor: payload?.cursor || null,
          sceneId: payload?.sceneId || null
        }
      });
      return;
    }

    sendText(res, 404, 'not found');
  });

  const host = config.server?.host || '0.0.0.0';
  const port = config.server?.port || 8082;
  server.listen(port, host, () => {
    console.log(`algorithm-service listening on ${host}:${port}`);
  });

  return server;
}

module.exports = {
  startServer
};
