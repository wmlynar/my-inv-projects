const http = require('http');
const fs = require('fs');
const path = require('path');
const { buildDataset } = require('./lib/log_pipeline');

const PUBLIC_DIR = path.resolve(__dirname, 'public');
const UI_PUBLIC_DIR = path.resolve(__dirname, '..', 'fleet-ui', 'public');
const SHARED_PUBLIC_DIR = path.resolve(__dirname, '..', '..', 'packages', 'robokit-map-ui', 'public');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.json5': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    'Cache-Control': 'no-store'
  });
  res.end(text);
}

function sendFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    sendText(res, 404, 'not found');
    return;
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    sendText(res, 404, 'not found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stat.size,
    'Cache-Control': 'no-store'
  });
  fs.createReadStream(filePath).pipe(res);
}

function resolveMapPaths(config) {
  const mapDir = config.map?.dir ? path.resolve(config.map.dir) : null;
  const sceneGraphPath = config.map?.sceneGraph
    ? path.resolve(config.map.sceneGraph)
    : mapDir
      ? path.join(mapDir, 'sceneGraph.json')
      : null;
  const compiledMapPath = config.map?.compiledMap
    ? path.resolve(config.map.compiledMap)
    : mapDir
      ? path.join(mapDir, 'compiledMap.json')
      : null;
  return { mapDir, sceneGraphPath, compiledMapPath };
}

function startServer(config) {
  const mapPaths = resolveMapPaths(config);
  let dataset = null;
  let datasetError = null;
  let datasetPromise = null;

  async function ensureDataset() {
    if (dataset || datasetError) return;
    if (!datasetPromise) {
      datasetPromise = buildDataset({
        logDir: config.logs?.dir,
        stateConn: config.logs?.stateConn,
        timeFrom: config.logs?.timeFrom,
        timeTo: config.logs?.timeTo,
        maxPoints: config.viewer?.maxPoints,
        stopSpeedMps: config.viewer?.stopSpeedMps,
        stopHoldMs: config.viewer?.stopHoldMs,
        slowSpeedMps: config.viewer?.slowSpeedMps
      })
        .then((data) => {
          dataset = data;
        })
        .catch((err) => {
          datasetError = err;
        });
    }
    await datasetPromise;
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (pathname === '/api/session') {
      await ensureDataset();
      if (datasetError) {
        sendText(res, 500, `failed to load dataset: ${datasetError.message}`);
        return;
      }
      const session = {
        ...(dataset.session || {}),
        viewer: { invertY: config.viewer?.invertY !== false }
      };
      sendJson(res, 200, session);
      return;
    }

    if (pathname === '/api/trajectory') {
      await ensureDataset();
      if (datasetError) {
        sendText(res, 500, `failed to load dataset: ${datasetError.message}`);
        return;
      }
      sendJson(res, 200, { trajectory: dataset.trajectory || [] });
      return;
    }

    if (pathname === '/api/obstacles') {
      await ensureDataset();
      if (datasetError) {
        sendText(res, 500, `failed to load dataset: ${datasetError.message}`);
        return;
      }
      sendJson(res, 200, { blocks: dataset.blocks || [], nearest: dataset.nearest || [] });
      return;
    }

    if (pathname === '/api/errors') {
      await ensureDataset();
      if (datasetError) {
        sendText(res, 500, `failed to load dataset: ${datasetError.message}`);
        return;
      }
      sendJson(res, 200, { errors: dataset.errors || [] });
      return;
    }

    if (pathname === '/api/events') {
      await ensureDataset();
      if (datasetError) {
        sendText(res, 500, `failed to load dataset: ${datasetError.message}`);
        return;
      }
      sendJson(res, 200, { events: dataset.events || [] });
      return;
    }

    if (pathname === '/api/scene-graph') {
      if (!mapPaths.sceneGraphPath || !fs.existsSync(mapPaths.sceneGraphPath)) {
        sendText(res, 404, 'sceneGraph.json not found');
        return;
      }
      try {
        const raw = fs.readFileSync(mapPaths.sceneGraphPath, 'utf8');
        sendJson(res, 200, JSON.parse(raw));
      } catch (err) {
        sendText(res, 500, `failed to read sceneGraph.json: ${err.message}`);
      }
      return;
    }

    if (pathname === '/api/compiled-map') {
      if (!mapPaths.compiledMapPath || !fs.existsSync(mapPaths.compiledMapPath)) {
        sendText(res, 404, 'compiledMap.json not found');
        return;
      }
      try {
        const raw = fs.readFileSync(mapPaths.compiledMapPath, 'utf8');
        sendJson(res, 200, JSON.parse(raw));
      } catch (err) {
        sendText(res, 500, `failed to read compiledMap.json: ${err.message}`);
      }
      return;
    }

    if (pathname.startsWith('/shared/')) {
      const rel = pathname.replace('/shared/', '');
      const filePath = path.resolve(SHARED_PUBLIC_DIR, rel);
      sendFile(res, filePath);
      return;
    }

    if (pathname.startsWith('/mock/')) {
      const rel = pathname.replace('/mock/', '');
      const filePath = path.resolve(UI_PUBLIC_DIR, rel);
      sendFile(res, filePath);
      return;
    }

    if (pathname === '/' || pathname === '') {
      sendFile(res, path.join(PUBLIC_DIR, 'index.html'));
      return;
    }

    const filePath = path.resolve(PUBLIC_DIR, pathname.replace(/^\//, ''));
    sendFile(res, filePath);
  });

  const host = config.server?.host || '127.0.0.1';
  const port = config.server?.port || 8093;
  server.listen(port, host, () => {
    console.log(`robokit-obstacle-visualizer listening on ${host}:${port}`);
  });

  return { server, mapPaths };
}

module.exports = {
  startServer
};
