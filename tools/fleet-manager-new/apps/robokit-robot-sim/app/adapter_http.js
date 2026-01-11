const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');

const DEFAULT_PORTS = '8088';
const DEFAULT_SCENE_ZIP = path.resolve(
  __dirname,
  '..',
  'robokit-proxy',
  'logs',
  'http-8088',
  '1767179306233-6',
  'upload_scene.zip'
);
const DEFAULT_CORE_PARAMS_PATH = path.resolve(__dirname, '..', 'data', 'robot_params.json');

const sessions = new Map();
let lastUpload = null;
const RDS_JSON_TYPE = 'application/json;charset=UTF-8';
const IGNORED_SOCKET_ERRORS = new Set(['ECONNRESET', 'EPIPE']);

function handleSocketError(label, err) {
  if (err && err.code && IGNORED_SOCKET_ERRORS.has(err.code)) {
    return;
  }
  console.warn(`robokit-http ${label} socket error`, err);
}

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

function handleAdminSocketError(err) {
  if (err && err.code && IGNORED_SOCKET_ERRORS.has(err.code)) {
    return;
  }
  console.warn('robokit-sim admin socket error', err);
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
    const devicesParam = url.searchParams.get('devices');
    const devices = devicesParam
      ? devicesParam
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
    const result = options.onRobotsStatus ? options.onRobotsStatus({ devices, url }) : null;
    sendJson(res, 200, result || { ok: true, devices: [] });
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
    onSetBlocked: options.onSetBlocked,
    onRobotsStatus: options.onRobotsStatus
  };

  const servers = [];
  for (const port of ports) {
    const server = http.createServer((req, res) => handleRequest(req, res, serverOptions));
    server.on('connection', (socket) => {
      socket.setNoDelay(true);
      socket.on('error', (err) => handleSocketError('stub', err));
    });
    server.on('clientError', (_err, socket) => {
      if (socket && !socket.destroyed) {
        socket.destroy();
      }
    });
    server.on('error', (err) => {
      console.warn('robokit-http stub server error', err);
    });
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
  const getTickState = typeof options.getTickState === 'function' ? options.getTickState : null;
  const pauseTick = typeof options.pauseTick === 'function' ? options.pauseTick : null;
  const resumeTick = typeof options.resumeTick === 'function' ? options.resumeTick : null;
  const stepTick = typeof options.stepTick === 'function' ? options.stepTick : null;

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
    if (req.url === '/_tick' && req.method === 'GET' && getTickState) {
      sendJson(res, 200, { ok: true, ...getTickState() });
      return;
    }
    if (req.url === '/_tick' && req.method === 'POST' && (pauseTick || resumeTick || stepTick)) {
      readJsonBody(req, (err, body) => {
        if (err) {
          sendJson(res, 400, { ok: false, error: 'invalid_json' });
          return;
        }
        const action = body && body.action ? String(body.action).toLowerCase() : '';
        const count = Number.isFinite(body && body.count) ? body.count : Number.parseInt(body && body.count, 10);
        if (action === 'pause' && pauseTick) {
          pauseTick();
          sendJson(res, 200, { ok: true, state: getTickState ? getTickState() : {} });
          return;
        }
        if (action === 'resume' && resumeTick) {
          resumeTick();
          sendJson(res, 200, { ok: true, state: getTickState ? getTickState() : {} });
          return;
        }
        if (action === 'step' && stepTick) {
          stepTick(Number.isFinite(count) ? count : 1);
          sendJson(res, 200, { ok: true, state: getTickState ? getTickState() : {} });
          return;
        }
        sendJson(res, 400, { ok: false, error: 'invalid_action' });
      });
      return;
    }
    sendJson(res, 404, { ok: false, error: 'not_found' });
  });

  server.on('connection', (socket) => {
    socket.setNoDelay(true);
    socket.on('error', handleAdminSocketError);
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
  startHttpStub,
  startAdminServer
};
