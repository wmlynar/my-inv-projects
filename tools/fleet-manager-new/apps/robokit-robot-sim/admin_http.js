const http = require('http');

const IGNORED_SOCKET_ERRORS = new Set(['ECONNRESET', 'EPIPE']);

function handleSocketError(err) {
  if (err && err.code && IGNORED_SOCKET_ERRORS.has(err.code)) {
    return;
  }
  console.warn('robokit-sim admin socket error', err);
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function readJsonBody(req, cb) {
  let data = '';
  req.on('data', (chunk) => {
    data += chunk;
    if (data.length > 1024 * 1024) {
      req.destroy();
    }
  });
  req.on('end', () => {
    if (!data) {
      cb(null, {});
      return;
    }
    try {
      cb(null, JSON.parse(data));
    } catch (err) {
      cb(err);
    }
  });
}

function startAdminServer(options = {}) {
  const port = Number.parseInt(options.port, 10);
  if (!Number.isFinite(port) || port <= 0) {
    return null;
  }
  const host = options.host || '127.0.0.1';
  const getMetrics = typeof options.getMetrics === 'function' ? options.getMetrics : () => ({});
  const getHealth = typeof options.getHealth === 'function' ? options.getHealth : () => ({ ok: true });
  const getTime = typeof options.getTime === 'function' ? options.getTime : null;
  const setTime = typeof options.setTime === 'function' ? options.setTime : null;

  const server = http.createServer((req, res) => {
    if (req.url === '/_health') {
      sendJson(res, 200, getHealth());
      return;
    }
    if (req.url === '/_metrics') {
      sendJson(res, 200, getMetrics());
      return;
    }
    if (req.url === '/_time' && req.method === 'GET' && getTime) {
      sendJson(res, 200, { ok: true, now_ms: getTime() });
      return;
    }
    if (req.url === '/_time' && req.method === 'POST' && setTime) {
      readJsonBody(req, (err, body) => {
        if (err) {
          sendJson(res, 400, { ok: false, error: 'invalid_json' });
          return;
        }
        const raw =
          body && (body.now_ms || body.now || body.time || body.timestamp || body.time_ms);
        const parsed = Number.isFinite(raw) ? raw : Number.parseInt(raw, 10);
        if (!Number.isFinite(parsed)) {
          sendJson(res, 400, { ok: false, error: 'invalid_time' });
          return;
        }
        setTime(parsed);
        sendJson(res, 200, { ok: true, now_ms: getTime ? getTime() : parsed });
      });
      return;
    }
    sendJson(res, 404, { ok: false, error: 'not_found' });
  });

  server.on('connection', (socket) => {
    socket.setNoDelay(true);
    socket.on('error', handleSocketError);
  });
  server.on('clientError', (_err, socket) => {
    if (socket && !socket.destroyed) {
      socket.destroy();
    }
  });
  server.on('error', (err) => {
    console.warn('robokit-sim admin server error', err);
  });
  server.listen(port, host, () => {
    console.log(`robokit-sim admin listening on http://${host}:${port}`);
  });

  return server;
}

module.exports = {
  startAdminServer
};
