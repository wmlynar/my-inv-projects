const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');

const DEFAULT_PORTS = '18080,18088,18089,18090';
const DEFAULT_SCENE_ZIP = path.resolve(
  __dirname,
  '..',
  'robokit-proxy',
  'logs',
  'http-8088',
  '1767179306233-6',
  'upload_scene.zip'
);
const DEFAULT_CORE_PARAMS_PATH = path.resolve(__dirname, 'rds_params.json');

const sessions = new Map();
let lastUpload = null;
const RDS_JSON_TYPE = 'application/json;charset=UTF-8';

function loadCoreParams(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (_err) {
    return null;
  }
}

function parseJsonPayload(buffer) {
  if (!buffer || buffer.length === 0) {
    return null;
  }
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch (_err) {
    return null;
  }
}

function applyCoreParamUpdates(target, updates) {
  if (!target || typeof target !== 'object' || !updates || typeof updates !== 'object') {
    return;
  }
  for (const [key, value] of Object.entries(updates)) {
    const entry = target[key];
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(entry, 'value')) {
      entry.value = value;
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      applyCoreParamUpdates(entry, value);
    }
  }
}

function parsePortList(value) {
  return String(value || '')
    .split(',')
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((port) => Number.isFinite(port) && port > 0);
}

function parseCookies(header) {
  const cookies = {};
  if (!header) {
    return cookies;
  }
  const parts = String(header).split(';');
  for (const part of parts) {
    const [key, ...rest] = part.trim().split('=');
    if (!key) {
      continue;
    }
    cookies[key] = rest.join('=');
  }
  return cookies;
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > limit) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function createSessionId() {
  return crypto.randomBytes(16).toString('hex').toUpperCase();
}

function createToken() {
  return crypto.randomBytes(16).toString('hex');
}

function cookieExpires(value) {
  return (value || new Date()).toUTCString();
}

function buildLoginCookies(sessionId, username = 'admin') {
  return [
    `JSESSIONID=${sessionId}; Path=/; HttpOnly`,
    `rememberMe=deleteMe; Path=/; Max-Age=0; Expires=${cookieExpires()}; SameSite=lax`,
    `login=${username}; Secure; HttpOnly`
  ];
}

function buildInvalidSessionCookies() {
  const sessionId = createSessionId();
  return [`JSESSIONID=${sessionId}; Path=/; HttpOnly`];
}

function sendRdsJson(res, statusCode, payload, options = {}) {
  const body = JSON.stringify(payload);
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST ,PUT',
    'Access-Control-Allow-Origin': '*',
    'Content-Type': RDS_JSON_TYPE
  };

  if (options.noCache) {
    headers.Expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
    headers['Cache-Control'] = ['no-store, no-cache, must-revalidate', 'post-check=0, pre-check=0'];
    headers.Pragma = 'no-cache';
  }

  if (options.keepAlive) {
    headers.Connection = 'keep-alive';
    headers['Keep-Alive'] = `timeout=${options.keepAlive}`;
  } else if (options.close) {
    headers.Connection = 'close';
  }

  if (options.setCookies) {
    headers['Set-Cookie'] = options.setCookies;
  }

  if (options.chunked === false) {
    headers['Content-Length'] = Buffer.byteLength(body);
  } else {
    headers['Transfer-Encoding'] = 'chunked';
  }

  res.writeHead(statusCode, headers);
  res.end(body);
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders
  });
  res.end(body);
}

function sendBinary(res, statusCode, buffer, contentType) {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Content-Length': buffer.length
  });
  res.end(buffer);
}

function sendText(res, statusCode, text, contentType = 'application/json') {
  const body = text == null ? '' : String(text);
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function buildApiData(pathname) {
  if (pathname === '/api/work-sites/worksiteUnFiled' || pathname === '/api/work-sites/worksiteUnFilled') {
    return null;
  }
  if (pathname === '/api/work-sites/sites') {
    return [];
  }
  if (pathname === '/api/queryTaskRecord' || pathname === '/api/queryLogsByTaskRecordIdPageAble') {
    return { pageList: [] };
  }
  if (pathname === '/api/agv-report/core') {
    return { report: [] };
  }
  return {};
}

function buildOk(payload = {}) {
  return { code: 200, msg: 'OK', data: payload };
}

function buildSuccess(payload = null) {
  return { code: 200, msg: 'Success', data: payload };
}

function buildInvalidSession() {
  return { code: 9005, msg: 'Status logowania jest nieprawidlowy, musisz sie ponownie zalogowac.' };
}

async function handleRequest(req, res, options) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST ,PUT');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Language, Cookie');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname === '/health' || pathname === '/healthz') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === '/sim/obstacles' && req.method === 'GET') {
    const result = options.onListObstacles ? options.onListObstacles() : { ok: false, error: 'unsupported' };
    sendJson(res, result && result.ok ? 200 : 400, result || { ok: false, error: 'unsupported' });
    return;
  }

  if (pathname === '/sim/obstacles' && req.method === 'POST') {
    try {
      const buffer = await readBody(req, options.maxBodyLength);
      const payload = parseJsonPayload(buffer) || {};
      const result = options.onAddObstacle ? options.onAddObstacle(payload) : { ok: false, error: 'unsupported' };
      sendJson(res, result && result.ok ? 200 : 400, result || { ok: false, error: 'unsupported' });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
    }
    return;
  }

  if (pathname === '/sim/obstacles/clear' && req.method === 'POST') {
    const result = options.onClearObstacles ? options.onClearObstacles() : { ok: false, error: 'unsupported' };
    sendJson(res, result && result.ok ? 200 : 400, result || { ok: false, error: 'unsupported' });
    return;
  }

  if (pathname === '/sim/blocked' && req.method === 'POST') {
    try {
      const buffer = await readBody(req, options.maxBodyLength);
      const payload = parseJsonPayload(buffer) || {};
      const result = options.onSetBlocked ? options.onSetBlocked(payload) : { ok: false, error: 'unsupported' };
      sendJson(res, result && result.ok ? 200 : 400, result || { ok: false, error: 'unsupported' });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
    }
    return;
  }

  if (pathname === '/admin/login' && req.method === 'POST') {
    const sessionId = createSessionId();
    sessions.set(sessionId, { createdAt: Date.now() });
    const token = createToken();
    sendRdsJson(res, 200, buildSuccess({ token }), {
      setCookies: buildLoginCookies(sessionId),
      keepAlive: 60
    });
    return;
  }

  if (pathname === '/admin/logout' && req.method === 'GET') {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.JSESSIONID) {
      sessions.delete(cookies.JSESSIONID);
    }
    sendRdsJson(res, 200, buildSuccess(null), { keepAlive: 60 });
    return;
  }

  if (pathname === '/getProfiles' && req.method === 'POST') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === '/robotsStatus' && req.method === 'GET') {
    sendJson(res, 200, { ok: true, devices: [] });
    return;
  }

  if (pathname === '/dispatchable' && req.method === 'POST') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === '/getCoreParam' && req.method === 'POST') {
    sendJson(res, 200, options.coreParams || {});
    return;
  }

  if (pathname === '/saveCoreParam' && req.method === 'POST') {
    try {
      const buffer = await readBody(req, options.maxBodyLength);
      const payload = parseJsonPayload(buffer);
      if (payload && options.coreParams) {
        applyCoreParamUpdates(options.coreParams, payload);
      }
      sendText(res, 200, 'set param ok', 'application/json');
    } catch (err) {
      sendJson(res, 400, { code: 40000, msg: err.message });
    }
    return;
  }

  if (pathname === '/setOrder' && req.method === 'POST') {
    try {
      const buffer = await readBody(req, options.maxBodyLength);
      const payload = parseJsonPayload(buffer) || {};
      const result = options.onSetOrder ? options.onSetOrder(payload) : null;
      if (result && result.ret_code === 0) {
        sendJson(res, 200, buildOk({ id: payload.id || null }));
      } else {
        const errorMsg = (result && (result.err_msg || result.message)) || 'invalid_order';
        sendJson(res, 400, { code: 40000, create_on: new Date().toISOString(), msg: errorMsg });
      }
    } catch (err) {
      sendJson(res, 400, { code: 40000, create_on: new Date().toISOString(), msg: err.message });
    }
    return;
  }

  if (pathname === '/downloadScene' && req.method === 'GET') {
    const zipPath = options.sceneZipPath;
    if (zipPath && fs.existsSync(zipPath)) {
      const buffer = fs.readFileSync(zipPath);
      sendBinary(res, 200, buffer, 'application/zip');
      return;
    }
    sendBinary(res, 200, Buffer.alloc(0), 'application/zip');
    return;
  }

  if (pathname === '/uploadScene' && req.method === 'POST') {
    try {
      const buffer = await readBody(req, options.maxBodyLength);
      lastUpload = buffer;
      sendJson(res, 200, { ok: true, size: buffer.length });
    } catch (err) {
      sendJson(res, 413, { ok: false, error: err.message });
    }
    return;
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies.JSESSIONID;
    if (!sessionId || !sessions.has(sessionId)) {
      sendRdsJson(res, 400, buildInvalidSession(), {
        noCache: true,
        close: true,
        setCookies: buildInvalidSessionCookies()
      });
      return;
    }
  }

  if (pathname.startsWith('/api')) {
    sendRdsJson(res, 200, buildSuccess(buildApiData(pathname)), {
      noCache: true,
      keepAlive: 60
    });
    return;
  }

  if (pathname.startsWith('/admin')) {
    sendRdsJson(res, 200, buildSuccess(null), { keepAlive: 60 });
    return;
  }

  sendJson(res, 404, { code: 404, msg: 'not_found' });
}

function startHttpStub(options = {}) {
  const ports = parsePortList(process.env.HTTP_PORTS || DEFAULT_PORTS);
  const host = process.env.HTTP_HOST || '127.0.0.1';
  const maxBodyLength = Number.parseInt(process.env.HTTP_MAX_BODY || '10485760', 10);
  const sceneZipPath = process.env.HTTP_SCENE_ZIP_PATH || DEFAULT_SCENE_ZIP;
  const coreParamsPath = process.env.HTTP_CORE_PARAMS_PATH || options.coreParamsPath || DEFAULT_CORE_PARAMS_PATH;
  const coreParams = options.coreParams || loadCoreParams(coreParamsPath);
  const serverOptions = {
    maxBodyLength,
    sceneZipPath,
    coreParams,
    onSetOrder: options.onSetOrder,
    onAddObstacle: options.onAddObstacle,
    onClearObstacles: options.onClearObstacles,
    onListObstacles: options.onListObstacles,
    onSetBlocked: options.onSetBlocked
  };

  const servers = [];
  for (const port of ports) {
    const server = http.createServer((req, res) => handleRequest(req, res, serverOptions));
    server.listen(port, host, () => {
      console.log(`robokit-http stub listening on http://${host}:${port}`);
      if (sceneZipPath && fs.existsSync(sceneZipPath)) {
        console.log(`robokit-http scene zip: ${sceneZipPath}`);
      }
    });
    servers.push(server);
  }
  return {
    servers,
    getLastUpload: () => lastUpload
  };
}

module.exports = {
  startHttpStub
};
