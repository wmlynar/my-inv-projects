# Niezawodność + „elegancja” implementacji: konkretne rozwiązania i kod (propozycja refaktoru)

Poniżej dostajesz **konkretne, gotowe do wklejenia** fragmenty kodu oraz sposób ich użycia w obecnym repo.  
Założenia:
- nadal **CommonJS** (tak jak reszta projektu),
- minimalnie zależności zewnętrznych (najlepiej 0),
- **bez eksplozji plików**: kilka większych modułów zamiast wielu mikro‑plików,
- poprawa niezawodności: **SSE resume + backpressure**, **lease expiry + fencing token**, **idempotencja**, **spójne błędy**, **graceful shutdown**.

---

## 1) Wspólna „platforma” (config + http + ttl cache + ids) w 1 pliku

### 1.1 Nowy plik: `packages/robokit-lib/platform.js`

To zastępuje duplikaty `lib/config.js`, `sendJson`, `readJsonBody`, `sendOptions` itd.

```js
// packages/robokit-lib/platform.js
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function nowMs() {
  return Date.now();
}

function createId(prefix) {
  // Stabilne i unikalne w obrębie instancji. Jeśli chcesz ULID: podmień implementację,
  // ale ta wersja jest bezpieczna i bez zależności.
  const uuid = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  return prefix ? `${prefix}_${uuid}` : uuid;
}

/* -------------------------- JSON5-lite (comments + trailing commas) -------------------------- */

function stripJsonComments(input) {
  let output = '';
  let inString = false;
  let stringChar = '';
  let escape = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        output += ch;
      }
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      output += ch;
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === stringChar) {
        inString = false;
        stringChar = '';
      }
      continue;
    }

    if (ch === '"' || ch === '\'') {
      inString = true;
      stringChar = ch;
      output += ch;
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 1;
      continue;
    }

    output += ch;
  }
  return output;
}

function stripTrailingCommas(input) {
  let output = '';
  let inString = false;
  let stringChar = '';
  let escape = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (inString) {
      output += ch;
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === stringChar) {
        inString = false;
        stringChar = '';
      }
      continue;
    }

    if (ch === '"' || ch === '\'') {
      inString = true;
      stringChar = ch;
      output += ch;
      continue;
    }

    if (ch === ',') {
      let j = i + 1;
      while (j < input.length && /\s/.test(input[j])) j += 1;
      if (input[j] === '}' || input[j] === ']') continue;
    }

    output += ch;
  }
  return output;
}

function readJson5(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const clean = stripTrailingCommas(stripJsonComments(raw));
  return JSON.parse(clean);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeDeep(base, override) {
  if (!isPlainObject(base)) {
    return isPlainObject(override) ? { ...override } : override;
  }
  const result = { ...base };
  if (!isPlainObject(override)) return result;
  for (const [key, value] of Object.entries(override)) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = mergeDeep(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function loadConfig(defaults, filePath) {
  const fileConfig = filePath ? readJson5(filePath) : {};
  return mergeDeep(defaults, fileConfig);
}

function resolvePath(baseDir, maybeRelative) {
  if (!maybeRelative) return null;
  return path.isAbsolute(maybeRelative) ? maybeRelative : path.resolve(baseDir || process.cwd(), maybeRelative);
}

/* -------------------------------- TTL Map (idempotencja / cache) ---------------------------- */

function createTtlMap({ maxSize = 5000, defaultTtlMs = 10 * 60 * 1000 } = {}) {
  const map = new Map();

  function get(key) {
    const entry = map.get(key);
    if (!entry) return null;
    if (entry.expiresTsMs <= nowMs()) {
      map.delete(key);
      return null;
    }
    return entry.value;
  }

  function set(key, value, ttlMs = defaultTtlMs) {
    prune();
    map.set(key, { value, expiresTsMs: nowMs() + ttlMs });
  }

  function prune() {
    // 1) usuń wygasłe
    for (const [k, entry] of map.entries()) {
      if (entry.expiresTsMs <= nowMs()) map.delete(k);
    }
    // 2) jeśli nadal za duże — wywalaj najstarsze (Map ma kolejność wstawień)
    while (map.size > maxSize) {
      const oldest = map.keys().next().value;
      map.delete(oldest);
    }
  }

  return { get, set, delete: (k) => map.delete(k), prune, size: () => map.size };
}

/* ------------------------------------- HTTP helpers + Router -------------------------------- */

function baseCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Request-Id',
    'Access-Control-Max-Age': '86400'
  };
}

function sendOptions(res) {
  res.writeHead(204, baseCorsHeaders());
  res.end();
}

function sendJson(res, statusCode, payload, extraHeaders = null) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...baseCorsHeaders(),
    ...(extraHeaders || {})
  });
  res.end(body);
}

function sendText(res, statusCode, text, extraHeaders = null) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    ...baseCorsHeaders(),
    ...(extraHeaders || {})
  });
  res.end(text);
}

function readJsonBody(req, { limitBytes = 1_000_000, requireJson = false } = {}) {
  return new Promise((resolve, reject) => {
    if (requireJson) {
      const ct = String(req.headers['content-type'] || '').toLowerCase();
      if (ct && !ct.includes('application/json')) {
        const err = new Error('unsupported content-type');
        err.code = 'unsupported_content_type';
        reject(err);
        return;
      }
    }

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

function sendError(res, httpStatus, { code, message, causeCode, details, requestId, traceId } = {}) {
  const payload = {
    error: {
      code: code || 'internalError',
      message: message || 'error',
      causeCode: causeCode || 'UNKNOWN',
      details: details || undefined,
      requestId: requestId || undefined,
      traceId: traceId || undefined
    }
  };
  sendJson(res, httpStatus, payload);
}

function compilePath(pattern) {
  // pattern: "/api/v1/robots/:robotId/commands"
  const keys = [];
  if (pattern === '*' || pattern === '/*') {
    return { regex: /^.*$/, keys };
  }
  const regexSrc = '^' + pattern.replace(/:[^/]+/g, (m) => {
    keys.push(m.slice(1));
    return '([^/]+)';
  }) + '$';
  return { regex: new RegExp(regexSrc), keys };
}

function createRouter() {
  const routes = [];

  function add(method, pattern, handler) {
    const { regex, keys } = compilePath(pattern);
    routes.push({ method, pattern, regex, keys, handler });
  }

  async function handle(req, res) {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const { pathname } = url;

    if (req.method === 'OPTIONS') {
      sendOptions(res);
      return;
    }

    for (const route of routes) {
      if (route.method !== req.method) continue;
      const m = pathname.match(route.regex);
      if (!m) continue;

      const params = {};
      route.keys.forEach((k, i) => {
        params[k] = decodeURIComponent(m[i + 1] || '');
      });

      const requestId = String(req.headers['x-request-id'] || '') || createId('req');

      const ctx = {
        req,
        res,
        url,
        pathname,
        params,
        query: Object.fromEntries(url.searchParams.entries()),
        requestId,
        json: (status, payload, headers) => sendJson(res, status, payload, { 'X-Request-Id': requestId, ...(headers || {}) }),
        text: (status, text, headers) => sendText(res, status, text, { 'X-Request-Id': requestId, ...(headers || {}) }),
        error: (httpStatus, err) => sendError(res, httpStatus, { requestId, ...(err || {}) }),
        jsonBody: (opts) => readJsonBody(req, opts)
      };

      try {
        await route.handler(ctx);
      } catch (err) {
        ctx.error(500, { code: 'internalError', message: err.message || 'internal', causeCode: 'INTERNAL' });
      }
      return;
    }

    sendText(res, 404, 'not found', { 'X-Request-Id': String(req.headers['x-request-id'] || '') || '' });
  }

  return {
    get: (p, h) => add('GET', p, h),
    post: (p, h) => add('POST', p, h),
    options: (p, h) => add('OPTIONS', p, h),
    handler: () => handle
  };
}

module.exports = {
  nowMs,
  createId,
  config: { readJson5, mergeDeep, loadConfig, resolvePath },
  cache: { createTtlMap },
  http: { createRouter, sendJson, sendText, sendOptions, readJsonBody, sendError, baseCorsHeaders }
};
```

**Co zyskujesz:**
- w 1 pliku masz „platformę” – mniej kopiowania i mniej rozjazdów,
- router eliminuje 1000× ifów,
- `X-Request-Id` jest standardem i pomaga debugować,
- `createTtlMap` daje idempotencję bez bazy.

---

## 2) Event log + SSE (resume + backpressure + heartbeat)

### 2.1 Nowy plik: `apps/fleet-core/event_stream.js`

To jest rdzeń niezawodności: działa nawet gdy UI się rozłączy na chwilę, a przy wolnym kliencie nie pompuje pamięci.

```js
// apps/fleet-core/event_stream.js
'use strict';

const { nowMs } = require('../../packages/robokit-lib/platform');

function createEventLog({ capacity = 2000 } = {}) {
  let cursor = 0;
  const buf = new Array(capacity);
  let start = 0; // index najstarszego
  let size = 0;  // ile aktualnie w buforze
  const listeners = new Set();

  function append(type, payload) {
    cursor += 1;
    const ev = { cursor, tsMs: nowMs(), type, payload };

    const idx = (start + size) % capacity;
    buf[idx] = ev;

    if (size < capacity) {
      size += 1;
    } else {
      // nadpisujemy najstarszy
      start = (start + 1) % capacity;
    }

    for (const fn of listeners) {
      try { fn(ev); } catch (_e) {}
    }
    return ev;
  }

  function oldestCursor() {
    if (size === 0) return cursor + 1; // brak eventów
    const oldest = buf[start];
    return oldest ? oldest.cursor : cursor + 1;
  }

  // Zwraca listę eventów o cursor > afterCursor, albo null jeśli afterCursor jest "za stary"
  function since(afterCursor) {
    if (!Number.isFinite(afterCursor)) afterCursor = 0;

    const oldest = oldestCursor();
    const newest = cursor;

    // afterCursor < oldest-1 => klient prosi o coś, czego już nie mamy
    if (afterCursor < oldest - 1) return null;
    if (afterCursor >= newest) return [];

    const out = [];
    for (let c = Math.max(afterCursor + 1, oldest); c <= newest; c += 1) {
      // mapowanie cursor -> indeks w ring buffer:
      // buf zawiera [oldest..newest], więc offset = c - oldest
      const offset = c - oldest;
      const idx = (start + offset) % capacity;
      const ev = buf[idx];
      if (ev && ev.cursor === c) out.push(ev);
    }
    return out;
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return { append, since, subscribe, getCursor: () => cursor, capacity: () => capacity };
}

function writeSseChunk(res, { id, event, data }) {
  // SSE wymaga \n\n na końcu rekordu.
  // data MUSI być w jednej linii lub wielu "data:" — tu trzymamy JSON jako jedną linię.
  const payload = [
    id ? `id: ${id}` : null,
    event ? `event: ${event}` : null,
    `data: ${typeof data === 'string' ? data : JSON.stringify(data)}`
  ].filter(Boolean).join('\n') + '\n\n';
  return res.write(payload);
}

function startEventStream(req, res, { eventLog, buildResyncEvent, heartbeatMs = 15000 } = {}) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    // przy reverse proxy bywa ważne:
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });
  res.write(':\n\n'); // „kick” na start

  // Resume cursor: fromCursor query albo Last-Event-ID
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const fromCursorQ = Number(url.searchParams.get('fromCursor') || '');
  const lastEventIdH = Number(req.headers['last-event-id'] || '');
  let fromCursor = Number.isFinite(fromCursorQ) ? fromCursorQ : (Number.isFinite(lastEventIdH) ? lastEventIdH : 0);

  // Kolejka na wypadek wolnego klienta (backpressure)
  let writable = true;
  let queued = null; // latest-wins (dla snapshotów)
  const flush = () => {
    if (!writable || !queued) return;
    const ok = res.write(queued);
    if (ok) queued = null;
    else writable = false;
  };
  res.on('drain', () => {
    writable = true;
    flush();
  });

  const send = (ev) => {
    const chunk = [
      `id: ${ev.cursor}`,
      `event: ${ev.type}`,
      `data: ${JSON.stringify(ev)}\n\n`
    ].join('\n');

    if (writable) {
      const ok = res.write(chunk);
      if (!ok) {
        writable = false;
        queued = chunk; // latest-wins
      }
    } else {
      queued = chunk; // latest-wins
    }
  };

  // Catch-up / resync
  const missed = eventLog.since(fromCursor);
  if (missed === null) {
    // Za stary cursor → resync event (np. snapshot)
    if (typeof buildResyncEvent === 'function') {
      const resync = buildResyncEvent();
      // resync powinien mieć poprawny cursor (najlepiej aktualny)
      send(resync);
      fromCursor = resync.cursor;
    }
  } else {
    missed.forEach(send);
  }

  const unsub = eventLog.subscribe((ev) => {
    send(ev);
  });

  const hb = setInterval(() => {
    // heartbeat jest eventem (UI może go liczyć)
    const ev = { cursor: eventLog.getCursor(), tsMs: nowMs(), type: 'heartbeat', payload: {} };
    // heartbeat NIE zapisujemy do loga (nie zwiększa cursor); id używamy jako aktualny cursor
    const chunk = [
      `id: ${ev.cursor}`,
      `event: ${ev.type}`,
      `data: ${JSON.stringify(ev)}\n\n`
    ].join('\n');
    if (writable) {
      const ok = res.write(chunk);
      if (!ok) {
        writable = false;
        queued = chunk;
      }
    } else {
      queued = chunk;
    }
  }, heartbeatMs);

  req.on('close', () => {
    clearInterval(hb);
    unsub();
  });
}

module.exports = {
  createEventLog,
  startEventStream
};
```

**Najważniejsze:**  
- `eventLog.since(fromCursor)` daje prawdziwe resume,  
- jeśli klient jest wolny, `latest-wins` zapobiega „puchnięciu” buforów Node’a,  
- heartbeat daje UI „żyje połączenie” bez spamowania snapshotami.

---

## 3) Lease manager (expiry + fencing token) + idempotencja mutacji

### 3.1 Nowy plik: `apps/fleet-core/core_services.js`

Tu masz dwa „silniki niezawodności”: lease i idempotencja.

```js
// apps/fleet-core/core_services.js
'use strict';

const { nowMs, createId, cache } = require('../../packages/robokit-lib/platform');

function createLeaseManager({ defaultTtlMs = 15000 } = {}) {
  let lease = null;
  let fence = 0;

  function expireIfNeeded() {
    if (lease && lease.expiresTsMs <= nowMs()) {
      lease = null;
    }
  }

  function get() {
    expireIfNeeded();
    return lease;
  }

  function seize({ request, displayName, ttlMs, force } = {}) {
    expireIfNeeded();
    const wantForce = Boolean(force);
    if (lease && !wantForce) {
      const err = new Error('lease conflict');
      err.kind = 'conflict';
      return { ok: false, error: err };
    }
    fence += 1;
    const ttl = Number.isFinite(ttlMs) ? Math.max(1000, ttlMs) : defaultTtlMs;
    lease = {
      leaseId: createId('lease'),
      fence,
      owner: {
        clientId: request?.clientId || 'unknown',
        displayName: displayName || ''
      },
      createdTsMs: nowMs(),
      expiresTsMs: nowMs() + ttl
    };
    return { ok: true, lease };
  }

  function renew({ leaseId, fence: reqFence, ttlMs } = {}) {
    expireIfNeeded();
    if (!lease || lease.leaseId !== leaseId || lease.fence !== reqFence) {
      const err = new Error('invalid lease');
      err.kind = 'conflict';
      return { ok: false, error: err };
    }
    const ttl = Number.isFinite(ttlMs) ? Math.max(1000, ttlMs) : defaultTtlMs;
    lease = { ...lease, expiresTsMs: nowMs() + ttl };
    return { ok: true, lease };
  }

  function release({ leaseId, fence: reqFence } = {}) {
    expireIfNeeded();
    if (!lease || lease.leaseId !== leaseId || lease.fence !== reqFence) {
      const err = new Error('invalid lease');
      err.kind = 'conflict';
      return { ok: false, error: err };
    }
    lease = null;
    return { ok: true };
  }

  function requireValid(payloadLease) {
    expireIfNeeded();
    if (!lease) {
      return { ok: false, error: { code: 'conflict', causeCode: 'CONFLICT', message: 'lease required' } };
    }
    if (!payloadLease || payloadLease.leaseId !== lease.leaseId || payloadLease.fence !== lease.fence) {
      return { ok: false, error: { code: 'conflict', causeCode: 'CONFLICT', message: 'invalid lease' } };
    }
    return { ok: true, lease };
  }

  return { get, seize, renew, release, requireValid };
}

function createIdempotencyStore({ maxSize = 5000, defaultTtlMs = 10 * 60 * 1000 } = {}) {
  const map = cache.createTtlMap({ maxSize, defaultTtlMs });

  function keyOf({ endpoint, request }) {
    const clientId = request?.clientId;
    const requestId = request?.requestId;
    if (!clientId || !requestId) return null;
    return `${endpoint}::${clientId}::${requestId}`;
  }

  return {
    get: (k) => map.get(k),
    set: (k, v, ttlMs) => map.set(k, v, ttlMs),
    keyOf
  };
}

module.exports = {
  createLeaseManager,
  createIdempotencyStore
};
```

**Dlaczego fencing token (`fence`) jest ważny?**  
Gdy dwie zakładki/UI „myślą”, że mają kontrolę, `fence` powoduje, że stare lease nie wygra w mutacjach (split‑brain killer).

---

## 4) Fleet Core: elegancki serwer (router + SSE + lease + idempotencja)

### 4.1 Przykładowy refaktor `apps/fleet-core/server.js`

To jest „docelowy styl”: krótki bootstrap + spójne endpointy.

> Uwaga: ten kod pokazuje *sposób*, a nie jest „jeden do jednego” diffem z obecnym plikiem.
> Najbezpieczniej wdrażać etapami (najpierw `/api/v1/events/stream` obok starego `/stream`).

```js
// apps/fleet-core/server.js (wersja refaktorowa)
'use strict';

const http = require('http');
const fs = require('fs');

const platform = require('../../packages/robokit-lib/platform');
const { createRouter } = platform.http;

const { createRuntime } = require('./mvp0/runtime');
const { createGatewayClient } = require('./mvp0/gateway_client');

const { createEventLog, startEventStream } = require('./event_stream');
const { createLeaseManager, createIdempotencyStore } = require('./core_services');

function toUiRobot(r) {
  return {
    robotId: r.robotId,
    status: r.status,
    nodeId: r.nodeId,
    blocked: Boolean(r.blocked),
    parkNodeId: r.parkNodeId || null,
    forkHeightM: r.forkHeightM ?? null,
    pose: r.pose || null
  };
}

function toUiTask(t) {
  return {
    taskId: t.taskId,
    kind: t.kind,
    createdTsMs: t.createdTsMs,
    status: t.status,
    statusReasonCode: t.statusReasonCode || 'NONE',
    fromNodeId: t.fromNodeId || null,
    toNodeId: t.toNodeId || null,
    parkNodeId: t.parkNodeId || null,
    assignedRobotId: t.assignedRobotId || null
  };
}

function startServer(config) {
  const router = createRouter();

  const state = {
    scenes: [],
    activeSceneId: null,
    serverInstanceId: platform.createId('core')
  };

  const lease = createLeaseManager({ defaultTtlMs: 15000 });
  const idem = createIdempotencyStore({ defaultTtlMs: 10 * 60 * 1000 });

  const eventLog = createEventLog({ capacity: config.runtime?.eventLogCapacity || 2000 });

  const runtime = createRuntime({
    statusAgeMaxMs: config.runtime?.statusAgeMaxMs,
    commandCooldownMs: config.runtime?.commandCooldownMs
  });
  const gatewayClient = createGatewayClient(config.gateway || {});
  const tickMs = Number.isFinite(config.runtime?.tickMs)
    ? config.runtime.tickMs
    : Number.isFinite(config.runtime?.tickHz)
      ? Math.max(50, Math.floor(1000 / config.runtime.tickHz))
      : 200;

  function buildStateSnapshot() {
    const snap = runtime.getState();
    return {
      ok: true,
      serverInstanceId: state.serverInstanceId,
      tsMs: platform.nowMs(),
      cursor: eventLog.getCursor(),
      activeSceneId: state.activeSceneId,
      controlLease: lease.get(),
      robots: (snap.robots || []).map(toUiRobot),
      tasks: (snap.tasks || []).map(toUiTask)
    };
  }

  function appendSnapshot() {
    // cursor przypisze eventLog
    const payload = buildStateSnapshot();
    eventLog.append('state', payload);
  }

  // Tick loop
  const tickTimer = setInterval(() => {
    const decision = runtime.tick({ nowMs: platform.nowMs() });
    for (const cmd of decision.commands || []) {
      gatewayClient.sendCommand(cmd).catch((err) => {
        // lepiej: event dependencyUnavailable + metrics
        console.warn(`gateway command failed: ${err.message}`);
      });
    }
    appendSnapshot();
  }, tickMs);

  /* ----------------------------- API ----------------------------- */

  router.get('/api/v1/health', async (ctx) => {
    ctx.json(200, { status: 'ok', tsMs: platform.nowMs(), serverInstanceId: state.serverInstanceId });
  });

  router.get('/api/v1/state', async (ctx) => {
    // snapshot na żądanie (bootstrap/fallback)
    const payload = buildStateSnapshot();
    ctx.json(200, payload);
  });

  router.get('/api/v1/events/stream', async (ctx) => {
    // resync event = świeży snapshot
    startEventStream(ctx.req, ctx.res, {
      eventLog,
      buildResyncEvent: () => {
        const payload = buildStateSnapshot();
        // ręcznie dopisujemy cursor „na teraz”:
        const cursor = eventLog.getCursor();
        return { cursor, tsMs: platform.nowMs(), type: 'state', payload: { ...payload, requiresResync: true } };
      }
    });
  });

  // Legacy alias (na czas migracji UI)
  router.get('/api/v1/stream', async (ctx) => {
    // Po prostu to samo co events/stream, ale zachowuje stary URL.
    startEventStream(ctx.req, ctx.res, {
      eventLog,
      buildResyncEvent: () => {
        const payload = buildStateSnapshot();
        const cursor = eventLog.getCursor();
        return { cursor, tsMs: platform.nowMs(), type: 'state', payload: { ...payload, requiresResync: true } };
      }
    });
  });

  router.post('/api/v1/control-lease/seize', async (ctx) => {
    const body = await ctx.jsonBody({ requireJson: true }).catch((err) => {
      ctx.error(400, { code: 'validationError', message: err.message, causeCode: String(err.code || 'INVALID_JSON') });
      return null;
    });
    if (!body) return;

    const result = lease.seize({
      request: body.request,
      displayName: body.displayName,
      ttlMs: body.ttlMs,
      force: body.force
    });

    if (!result.ok) {
      ctx.error(409, { code: 'conflict', message: result.error.message, causeCode: 'CONFLICT' });
      return;
    }

    appendSnapshot(); // lease zmienia stan widoczny w UI
    ctx.json(200, { ok: true, lease: result.lease });
  });

  router.post('/api/v1/control-lease/renew', async (ctx) => {
    const body = await ctx.jsonBody({ requireJson: true }).catch((err) => {
      ctx.error(400, { code: 'validationError', message: err.message, causeCode: String(err.code || 'INVALID_JSON') });
      return null;
    });
    if (!body) return;

    const result = lease.renew({ leaseId: body.leaseId, fence: body.fence, ttlMs: body.ttlMs });
    if (!result.ok) {
      ctx.error(409, { code: 'conflict', message: result.error.message, causeCode: 'CONFLICT' });
      return;
    }
    appendSnapshot();
    ctx.json(200, { ok: true, lease: result.lease });
  });

  router.post('/api/v1/control-lease/release', async (ctx) => {
    const body = await ctx.jsonBody({ requireJson: true }).catch((err) => {
      ctx.error(400, { code: 'validationError', message: err.message, causeCode: String(err.code || 'INVALID_JSON') });
      return null;
    });
    if (!body) return;

    const result = lease.release({ leaseId: body.leaseId, fence: body.fence });
    if (!result.ok) {
      ctx.error(409, { code: 'conflict', message: result.error.message, causeCode: 'CONFLICT' });
      return;
    }
    appendSnapshot();
    ctx.json(200, { ok: true });
  });

  router.post('/api/v1/tasks', async (ctx) => {
    const body = await ctx.jsonBody({ requireJson: true }).catch((err) => {
      ctx.error(400, { code: 'validationError', message: err.message, causeCode: String(err.code || 'INVALID_JSON') });
      return null;
    });
    if (!body) return;

    // Lease required
    const leaseCheck = lease.requireValid(body.lease);
    if (!leaseCheck.ok) {
      ctx.error(409, leaseCheck.error);
      return;
    }

    // Idempotencja (clientId + requestId)
    const idemKey = idem.keyOf({ endpoint: 'POST /api/v1/tasks', request: body.request });
    if (!idemKey) {
      ctx.error(400, { code: 'validationError', causeCode: 'VALIDATION_FAILED', message: 'request.clientId + request.requestId required' });
      return;
    }
    const cached = idem.get(idemKey);
    if (cached) {
      ctx.json(cached.status, cached.body, cached.headers);
      return;
    }

    try {
      const task = runtime.createTask(body.task || {}, platform.nowMs());
      const resp = { ok: true, taskId: task.taskId };
      const headers = { Location: `/api/v1/tasks/${encodeURIComponent(task.taskId)}` };
      idem.set(idemKey, { status: 201, body: resp, headers });

      appendSnapshot(); // stan z taskiem
      ctx.json(201, resp, headers);
    } catch (err) {
      ctx.error(400, { code: 'validationError', causeCode: 'VALIDATION_FAILED', message: err.message || 'invalid_task' });
    }
  });

  router.post('/api/v1/robots/:robotId/commands', async (ctx) => {
    const body = await ctx.jsonBody({ requireJson: true }).catch((err) => {
      ctx.error(400, { code: 'validationError', message: err.message, causeCode: String(err.code || 'INVALID_JSON') });
      return null;
    });
    if (!body) return;

    // Lease required
    const leaseCheck = lease.requireValid(body.lease);
    if (!leaseCheck.ok) {
      ctx.error(409, leaseCheck.error);
      return;
    }

    // Idempotencja
    const idemKey = idem.keyOf({ endpoint: 'POST /api/v1/robots/:id/commands', request: body.request });
    if (!idemKey) {
      ctx.error(400, { code: 'validationError', causeCode: 'VALIDATION_FAILED', message: 'request.clientId + request.requestId required' });
      return;
    }
    const cached = idem.get(idemKey);
    if (cached) {
      ctx.json(cached.status, cached.body, cached.headers);
      return;
    }

    const robotId = ctx.params.robotId;
    const commandId = platform.createId('cmd');
    const command = { ...(body.command || {}), robotId, commandId };

    try {
      await gatewayClient.sendCommand(command);
      const resp = { ok: true, robotId, commandId };
      idem.set(idemKey, { status: 200, body: resp, headers: null });

      ctx.json(200, resp);
    } catch (err) {
      ctx.error(503, { code: 'dependencyUnavailable', causeCode: 'DEPENDENCY_OFFLINE', message: err.message || 'gateway_error' });
    }
  });

  // Internal telemetry (przenieś symulator na ten endpoint)
  router.post('/internal/v1/robots/:robotId/status', async (ctx) => {
    const token = String(ctx.req.headers['x-internal-token'] || '');
    if (config.internal?.token && token !== config.internal.token) {
      ctx.error(403, { code: 'forbidden', causeCode: 'FORBIDDEN', message: 'invalid internal token' });
      return;
    }

    const body = await ctx.jsonBody({ requireJson: true }).catch((err) => {
      ctx.error(400, { code: 'validationError', message: err.message, causeCode: String(err.code || 'INVALID_JSON') });
      return null;
    });
    if (!body) return;

    try {
      runtime.upsertRobotStatus(ctx.params.robotId, body.status || {}, platform.nowMs());
      appendSnapshot();
      ctx.json(200, { ok: true });
    } catch (err) {
      ctx.error(400, { code: 'validationError', causeCode: 'VALIDATION_FAILED', message: err.message || 'invalid_status' });
    }
  });

  const server = http.createServer(router.handler());

  // twarde timeouts (często pomaga przy dziwnych proxy)
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 70_000;

  // Graceful shutdown
  function shutdown() {
    clearInterval(tickTimer);
    server.close(() => process.exit(0));
    // w razie gdyby coś wisiało:
    setTimeout(() => process.exit(1), 5000).unref();
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  const host = config.server?.host || '0.0.0.0';
  const port = config.server?.port || 8080;
  server.listen(port, host, () => {
    console.log(`fleet-core listening on ${host}:${port}`);
  });

  return server;
}

module.exports = { startServer };
```

**Co to poprawia natychmiast:**
- `/api/v1/state` ma realny `cursor` (nie 0),
- SSE ma resume i backpressure,
- mutacje są idempotentne,
- mutacje wymagają lease + fencing token,
- telemetry ingestion jest internal.

---

## 5) UI: DataSource z resume (fromCursor) + requestId + idempotencja payloadów

Masz już `apps/fleet-ui/public/modules/services/core_services.js`, więc najprościej:
- rozszerzyć `streamStatus()` o obsługę `fromCursor`
- oraz dodać helper do wysyłania `request: {clientId, requestId}` i `lease`.

### 5.1 Patch do `core_services.js` (proponowany)

```js
// w apps/fleet-ui/public/modules/services/core_services.js
const makeRequestId = () => {
  // prosty requestId; jeśli masz crypto.randomUUID w przeglądarce — użyj
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const streamStatus = (path, handlers = {}) => {
  if (typeof window === "undefined" || typeof window.EventSource === "undefined") return null;

  let lastCursor = 0;
  let source = null;

  const open = () => {
    const url = new URL(path, window.location.origin);
    if (lastCursor > 0) url.searchParams.set("fromCursor", String(lastCursor));
    source = new EventSource(url.toString());

    source.addEventListener("state", (event) => {
      if (!event?.data) return;
      let payload = null;
      try { payload = JSON.parse(event.data); } catch (_e) { return; }
      // payload powinien zawierać cursor (z core)
      if (payload && Number.isFinite(payload.cursor)) lastCursor = payload.cursor;
      handlers.onMessage?.(payload);
    });

    source.addEventListener("heartbeat", () => {
      handlers.onHeartbeat?.({ cursor: lastCursor, tsMs: Date.now() });
    });

    source.addEventListener("error", (event) => {
      handlers.onError?.(event);
    });

    return source;
  };

  open();
  return {
    close: () => source?.close(),
    getLastCursor: () => lastCursor
  };
};

const postJson = async (path, payload = null) => {
  const body = payload ? JSON.stringify(payload) : null;
  const requestId = makeRequestId();
  const response = await fetch(path, {
    method: "POST",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      "X-Request-Id": requestId
    },
    body
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `post_failed_${response.status}`);
  }
  return response.json().catch(() => null);
};
```

### 5.2 Minimalna zmiana w UI dla statusu taska (bugfix)
W `apps/fleet-ui/public/modules/app/app_data.js` masz:

```js
if (status === "cancelled") return "Cancelled";
```

W runtime Core jest `canceled` (1 „l”). Zrób tak:

```js
if (status === "cancelled" || status === "canceled") return "Cancelled";
```

---

## 6) Dlaczego ta implementacja jest „bardziej elegancka”

- **Jeden router** zamiast setek warunków,
- **jeden event log** zamiast „broadcast stringa” bez resume,
- **jedna definicja błędów** (`sendError`) zamiast `{error:"..."}` w różnych kształtach,
- **jedna zasada niezawodności mutacji** (lease + idempotencja),
- minimalny, czytelny podział na 3 moduły w Core:
  - `event_stream.js` (SSE + event log),
  - `core_services.js` (lease + idempotencja),
  - `platform.js` (wspólne narzędzia).

To nie jest „wielka architektura” — to jest kilka sprawdzonych klocków, które zapobiegają najczęstszym awariom.

---

## 7) Co dalej (krótko, ale praktycznie)

1) Najpierw dodaj `/api/v1/events/stream` i przepnij UI DataSource (bez ruszania reszty).  
2) Dodaj `cursor` i `id:` w SSE oraz `fromCursor`.  
3) Dopiero potem włącz lease enforcement na mutacjach (żeby nie zablokować demo).  
4) Na końcu przenieś telemetry do `/internal/*` i dołóż token.

