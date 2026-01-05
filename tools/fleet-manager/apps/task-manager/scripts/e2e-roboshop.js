const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_ZIP = path.resolve(
  repoRoot,
  'apps',
  'robokit-proxy',
  'logs',
  'http-8088',
  '1767179306233-6',
  'upload_scene.zip'
);
const DEFAULT_SCENE_ROOT = path.resolve(
  repoRoot,
  'apps',
  'robokit-proxy',
  'logs',
  'http-8088',
  '1767179306233-6',
  'upload_scene'
);

const ZIP_PATH = process.env.SCENE_ZIP_PATH ? path.resolve(process.env.SCENE_ZIP_PATH) : DEFAULT_ZIP;
const SCENE_ROOT = process.env.SCENE_ROOT ? path.resolve(process.env.SCENE_ROOT) : DEFAULT_SCENE_ROOT;
const ROBOT_ID = process.env.ROBOT_ID || 'INV-CBD15-LONG-1';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpRequest({ method, port, path: reqPath, headers, body }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path: reqPath,
        headers
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            body: Buffer.concat(chunks)
          });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function waitForHealth(port, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await httpRequest({ method: 'GET', port, path: '/health' });
      if (res.statusCode === 200) {
        return;
      }
    } catch (err) {
      // ignore until timeout
    }
    await sleep(100);
  }
  throw new Error('task-manager did not start');
}

function startMockRds() {
  let lastUpload = null;
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/uploadScene') {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        lastUpload = Buffer.concat(chunks);
        const body = JSON.stringify({ ok: true, size: lastUpload.length });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(body);
      });
      return;
    }
    if (req.method === 'GET' && req.url.startsWith('/robotsStatus')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, devices: [] }));
      return;
    }
    if (req.method === 'POST' && req.url === '/getProfiles') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.method === 'GET' && req.url === '/downloadScene') {
      res.writeHead(200, { 'Content-Type': 'application/zip' });
      res.end(Buffer.alloc(0));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        port,
        server,
        getLastUpload: () => lastUpload
      });
    });
  });
}

async function main() {
  if (!fs.existsSync(ZIP_PATH)) {
    throw new Error(`missing zip file: ${ZIP_PATH}`);
  }
  if (!fs.existsSync(SCENE_ROOT)) {
    throw new Error(`missing scene root: ${SCENE_ROOT}`);
  }

  const mock = await startMockRds();
  const taskPort = Number.parseInt(process.env.E2E_TM_PORT || '7075', 10);
  const taskManager = spawn('node', ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(taskPort),
      RDS_HOST: '127.0.0.1',
      RDS_PORT: String(mock.port),
      RDS_PARAM_ROOT: SCENE_ROOT
    },
    stdio: 'inherit'
  });

  try {
    await waitForHealth(taskPort, 10000);

    const zipBuffer = fs.readFileSync(ZIP_PATH);
    const uploadRes = await httpRequest({
      method: 'POST',
      port: taskPort,
      path: '/api/rds/upload-scene',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': zipBuffer.length
      },
      body: zipBuffer
    });

    if (uploadRes.statusCode !== 200) {
      throw new Error(`upload failed: ${uploadRes.statusCode}`);
    }

    const lastUpload = mock.getLastUpload();
    if (!lastUpload || lastUpload.length !== zipBuffer.length) {
      throw new Error('mock RDS did not receive upload');
    }

    const paramsRes = await httpRequest({
      method: 'GET',
      port: taskPort,
      path: `/api/rds/robot/${encodeURIComponent(ROBOT_ID)}/params`
    });

    if (paramsRes.statusCode !== 200) {
      throw new Error(`params failed: ${paramsRes.statusCode}`);
    }
    const paramsBody = JSON.parse(paramsRes.body.toString('utf8'));
    if (!paramsBody || !paramsBody.params || paramsBody.params.error) {
      const detail = paramsBody && paramsBody.params ? paramsBody.params.error : JSON.stringify(paramsBody);
      throw new Error(`params error: ${detail || 'unknown'}`);
    }

    console.log('e2e-roboshop: ok');
  } finally {
    taskManager.kill();
    mock.server.close();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
