const http = require('http');

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function startAdminServer(options = {}) {
  const port = Number.parseInt(options.port, 10);
  if (!Number.isFinite(port) || port <= 0) {
    return null;
  }
  const host = options.host || '127.0.0.1';
  const getMetrics = typeof options.getMetrics === 'function' ? options.getMetrics : () => ({});
  const getHealth = typeof options.getHealth === 'function' ? options.getHealth : () => ({ ok: true });

  const server = http.createServer((req, res) => {
    if (req.url === '/_health') {
      sendJson(res, 200, getHealth());
      return;
    }
    if (req.url === '/_metrics') {
      sendJson(res, 200, getMetrics());
      return;
    }
    sendJson(res, 404, { ok: false, error: 'not_found' });
  });

  server.listen(port, host, () => {
    console.log(`robokit-sim admin listening on http://${host}:${port}`);
  });

  return server;
}

module.exports = {
  startAdminServer
};
