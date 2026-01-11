const http = require('http');
const fs = require('fs');
const path = require('path');
const { validateArtifacts } = require('./lib/validation');

const PUBLIC_DIR = path.resolve(__dirname, 'public');
const MOCK_PUBLIC_DIR = path.resolve(__dirname, '..', 'fleet-ui-mock', 'public');
const SHARED_PUBLIC_DIR = path.resolve(__dirname, '..', '..', 'packages', 'robokit-map-ui', 'public');
const LIB_DIR = path.resolve(__dirname, '..', '..', 'packages', 'robokit-lib');

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

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

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

function resolveArtifacts(config) {
  const baseDir = path.resolve(config.artifacts?.dir || process.cwd());
  const sceneGraphPath = path.resolve(
    config.artifacts?.sceneGraph || path.join(baseDir, 'sceneGraph.json')
  );
  const compiledMapPath = path.resolve(
    config.artifacts?.compiledMap || path.join(baseDir, 'compiledMap.json')
  );
  const metaPath = path.resolve(config.artifacts?.meta || path.join(baseDir, 'meta.json'));
  const reportPath = path.resolve(baseDir, 'report.json');
  return {
    baseDir,
    sceneGraphPath,
    compiledMapPath,
    metaPath,
    reportPath
  };
}

function resolveCompareArtifacts(config) {
  const compareDir = config.artifacts?.compareDir;
  if (!compareDir) return null;
  const baseDir = path.resolve(compareDir);
  const sceneGraphPath = path.resolve(path.join(baseDir, 'sceneGraph.json'));
  const compiledMapPath = path.resolve(path.join(baseDir, 'compiledMap.json'));
  const metaPath = path.resolve(path.join(baseDir, 'meta.json'));
  return {
    baseDir,
    sceneGraphPath,
    compiledMapPath,
    metaPath
  };
}

function ensureArtifacts(paths) {
  if (!fs.existsSync(paths.sceneGraphPath)) {
    throw new Error(`missing sceneGraph.json: ${paths.sceneGraphPath}`);
  }
  if (!fs.existsSync(paths.compiledMapPath)) {
    throw new Error(`missing compiledMap.json: ${paths.compiledMapPath}`);
  }
}

function runValidation(paths) {
  const sceneGraph = readJson(paths.sceneGraphPath);
  const compiledMap = readJson(paths.compiledMapPath);
  const report = validateArtifacts(sceneGraph, compiledMap);
  fs.writeFileSync(paths.reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report;
}

function startServer(config) {
  const paths = resolveArtifacts(config);
  const comparePaths = resolveCompareArtifacts(config);
  ensureArtifacts(paths);

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (pathname === '/api/scene-graph') {
      try {
        const data = readJson(paths.sceneGraphPath);
        sendJson(res, 200, data);
      } catch (err) {
        sendText(res, 500, `failed to read sceneGraph.json: ${err.message}`);
      }
      return;
    }

    if (pathname === '/api/compiled-map') {
      try {
        const data = readJson(paths.compiledMapPath);
        sendJson(res, 200, data);
      } catch (err) {
        sendText(res, 500, `failed to read compiledMap.json: ${err.message}`);
      }
      return;
    }

    if (pathname === '/api/meta') {
      if (!fs.existsSync(paths.metaPath)) {
        sendText(res, 404, 'meta.json not found');
        return;
      }
      try {
        const data = readJson(paths.metaPath);
        sendJson(res, 200, data);
      } catch (err) {
        sendText(res, 500, `failed to read meta.json: ${err.message}`);
      }
      return;
    }

    if (pathname === '/api/compare/scene-graph') {
      if (!comparePaths || !fs.existsSync(comparePaths.sceneGraphPath)) {
        sendText(res, 404, 'compare sceneGraph.json not found');
        return;
      }
      try {
        const data = readJson(comparePaths.sceneGraphPath);
        sendJson(res, 200, data);
      } catch (err) {
        sendText(res, 500, `failed to read compare sceneGraph.json: ${err.message}`);
      }
      return;
    }

    if (pathname === '/api/compare/compiled-map') {
      if (!comparePaths || !fs.existsSync(comparePaths.compiledMapPath)) {
        sendText(res, 404, 'compare compiledMap.json not found');
        return;
      }
      try {
        const data = readJson(comparePaths.compiledMapPath);
        sendJson(res, 200, data);
      } catch (err) {
        sendText(res, 500, `failed to read compare compiledMap.json: ${err.message}`);
      }
      return;
    }

    if (pathname === '/api/compare/meta') {
      if (!comparePaths || !fs.existsSync(comparePaths.metaPath)) {
        sendText(res, 404, 'compare meta.json not found');
        return;
      }
      try {
        const data = readJson(comparePaths.metaPath);
        sendJson(res, 200, data);
      } catch (err) {
        sendText(res, 500, `failed to read compare meta.json: ${err.message}`);
      }
      return;
    }

    if (pathname === '/api/report') {
      if (!fs.existsSync(paths.reportPath)) {
        sendText(res, 404, 'report.json not found');
        return;
      }
      try {
        const data = readJson(paths.reportPath);
        sendJson(res, 200, data);
      } catch (err) {
        sendText(res, 500, `failed to read report.json: ${err.message}`);
      }
      return;
    }

    if (pathname === '/api/config') {
      sendJson(res, 200, {
        cellsMinZoom: config.viewer?.cellsMinZoom ?? 1.4,
        labelMinZoom: config.viewer?.labelMinZoom ?? 1.0,
        compareDir: config.artifacts?.compareDir || null
      });
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
      const filePath = path.resolve(MOCK_PUBLIC_DIR, rel);
      sendFile(res, filePath);
      return;
    }

    if (pathname.startsWith('/lib/')) {
      const rel = pathname.replace('/lib/', '');
      const filePath = path.resolve(LIB_DIR, rel);
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
  const port = config.server?.port || 8092;
  server.listen(port, host, () => {
    console.log(`map-compiler-visualizer listening on ${host}:${port}`);
  });

  return { server, paths };
}

module.exports = {
  resolveArtifacts,
  ensureArtifacts,
  runValidation,
  startServer
};
