# Fleet Manager — niezawodność + elegancja implementacji (konkretne rozwiązania i kod)

Poniżej masz zestaw zmian, które **najmocniej podnoszą niezawodność** (crash-proof, odporność na wolnych klientów, retry na błędy sieciowe, brak „overlap ticków”, spójne błędy i requestId), a jednocześnie robią kod **bardziej eleganckim** (mniej duplikacji, mniej `if/else` na ścieżkach, jeden styl obsługi błędów).

Całość jest tak zaprojektowana, żeby:
- **nie** tworzyć „setek mikro-plików”,
- dało się wdrożyć krokami (bez przepisywania wszystkiego),
- pasowało do aktualnego stylu repo (CommonJS, `http.createServer`, brak frameworków).

---

## 0) Najpierw: dwa największe „niewidzialne” źródła awarii w obecnym kodzie

### A) `http.createServer(async (req,res)=>...)` bez globalnego `catch`
W Node handler nie jest „awaitowany” przez serwer. Jeśli wewnątrz poleci wyjątek poza lokalnym `try/catch`, dostajesz **unhandled rejection** → losowe zachowanie procesu (czasem tylko log, czasem crash).

✅ Rozwiązanie: **wrapper** `wrapAsync(handler)`.

### B) SSE bez backpressure
`res.write()` może zwrócić `false` (bufor pełny). Jeśli klient jest wolny, serwer może rosnąć w RAM i w końcu się wywalić.

✅ Rozwiązanie: `createSseHub()` z polityką „drop slow clients” albo „drain”.

---

## 1) Jeden, wspólny „kit” do niezawodnego HTTP + błędów (1 plik, zero frameworków)

To jest **konkretny kod**, który możesz dodać jako:

**`packages/fleet-kit/index.js`**

> To jeden plik. Zawiera: ULID, requestId/traceId, ErrorEnvelope, readJson z limitem, wrapAsync, prosty router, domyślne timeouts, client HTTP z retry+keepalive, SSE hub z backpressure.

```js
// packages/fleet-kit/index.js
'use strict';

const http = require('node:http');
const https = require('node:https');
const crypto = require('node:crypto');

/**
 * ULID (Crockford Base32) — implementacja bez zależności.
 * - 48-bit time (10 znaków)
 * - 80-bit randomness (16 znaków)
 * Razem: 26 znaków.
 *
 * Dodatkowo: monotoniczny wariant (jeśli wiele ULID w tej samej ms),
 * żeby zachować sortowalność.
 */
const CROCKFORD32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const MAX_TIME_48 = 0xffffffffffffn; // 48 bits
const MAX_RAND_80 = (1n << 80n) - 1n;

let _lastTimeMs = -1;
let _lastRand80 = 0n;

function random80() {
  const buf = crypto.randomBytes(10); // 80 bits
  let x = 0n;
  for (const b of buf) x = (x << 8n) | BigInt(b);
  return x;
}

function encodeBase32(valueBigInt, length) {
  let x = BigInt(valueBigInt);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    const idx = Number(x & 31n);
    out = CROCKFORD32[idx] + out;
    x >>= 5n;
  }
  return out;
}

function encodeTime48(nowMs) {
  const t = BigInt(Math.floor(Number(nowMs)));
  if (t < 0n || t > MAX_TIME_48) {
    throw new Error(`ulid: timestamp out of range: ${nowMs}`);
  }
  // 10 znaków base32 koduje do 50 bitów, ale ULID używa tylko 48 bitów czasu.
  return encodeBase32(t, 10);
}

function encodeRand80(rand80) {
  const r = BigInt(rand80);
  if (r < 0n || r > MAX_RAND_80) {
    throw new Error('ulid: random out of range');
  }
  return encodeBase32(r, 16);
}

function ulid(nowMs = Date.now()) {
  const t = Math.floor(Number(nowMs));
  let rand = null;

  if (t === _lastTimeMs) {
    rand = _lastRand80 + 1n;
    if (rand > MAX_RAND_80) {
      // ekstremalnie mało prawdopodobne; ale jak się zdarzy:
      // przesuwamy czas o 1ms i losujemy od nowa.
      _lastTimeMs = t + 1;
      rand = random80();
      _lastRand80 = rand;
      return encodeTime48(_lastTimeMs) + encodeRand80(rand);
    }
  } else {
    rand = random80();
  }

  _lastTimeMs = t;
  _lastRand80 = rand;
  return encodeTime48(t) + encodeRand80(rand);
}

function makeId(prefix) {
  return `${prefix}_${ulid()}`;
}

/**
 * ErrorEnvelope wg spec/99_pozostale.md
 */
const ERROR_HTTP_STATUS = Object.freeze({
  validationError: 400,
  notFound: 404,
  conflict: 409,
  notAllowed: 405,
  unauthorized: 401,
  forbidden: 403,
  rateLimited: 429,
  timeout: 504,
  dependencyUnavailable: 503,
  internalError: 500
});

class FleetError extends Error {
  /**
   * @param {{
   *   code: keyof typeof ERROR_HTTP_STATUS,
   *   message: string,
   *   causeCode?: string,
   *   details?: any,
   *   httpStatus?: number
   * }} opts
   */
  constructor(opts) {
    super(opts?.message || 'Error');
    this.name = 'FleetError';
    this.code = opts?.code || 'internalError';
    this.causeCode = opts?.causeCode || 'UNKNOWN';
    this.details = opts?.details ?? null;
    this.httpStatus = Number.isFinite(opts?.httpStatus) ? opts.httpStatus : null;
  }
}

function toErrorEnvelope(err, ctx) {
  const isFleet = err instanceof FleetError;
  const code = isFleet ? err.code : 'internalError';

  const message = isFleet
    ? err.message
    : (err && typeof err.message === 'string' ? err.message : 'Internal error');

  const details = isFleet ? err.details : null;
  const causeCode = isFleet ? err.causeCode : 'UNKNOWN';

  return {
    error: {
      code,
      message,
      details: details ?? undefined,
      causeCode,
      traceId: ctx?.traceId,
      requestId: ctx?.requestId
    }
  };
}

function httpStatusForError(err) {
  if (err instanceof FleetError) {
    if (Number.isFinite(err.httpStatus)) return err.httpStatus;
    return ERROR_HTTP_STATUS[err.code] || 500;
  }
  return 500;
}

function headerValue(req, headerName) {
  const key = String(headerName).toLowerCase();
  const raw = req.headers?.[key];
  if (Array.isArray(raw)) return raw[0] || null;
  return raw ? String(raw) : null;
}

function createContext(req, serviceName = 'service') {
  const incomingReqId = headerValue(req, 'x-request-id');
  const incomingTraceId = headerValue(req, 'x-trace-id');

  const requestId = incomingReqId || makeId('req');
  const traceId = incomingTraceId || makeId('trace');

  return {
    serviceName,
    requestId,
    traceId,
    tsMs: Date.now(),
    startHrNs: process.hrtime.bigint()
  };
}

function corsHeaders(cors = {}) {
  const origin = cors.origin ?? '*';
  const methods = cors.methods ?? 'GET,POST,OPTIONS';
  const headers = cors.headers ?? 'Content-Type,Authorization,X-Request-Id,X-Trace-Id';
  const maxAge = cors.maxAge ?? '86400';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': headers,
    'Access-Control-Max-Age': maxAge
  };
}

function sendJson(res, statusCode, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...headers
  });
  res.end(body);
}

function sendText(res, statusCode, text, headers = {}) {
  const body = String(text ?? '');
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...headers
  });
  res.end(body);
}

function sendOptions(res, cors = {}) {
  res.writeHead(204, {
    ...corsHeaders(cors)
  });
  res.end();
}

function sendError(res, ctx, err, cors = {}) {
  const status = httpStatusForError(err);
  const envelope = toErrorEnvelope(err, ctx);
  sendJson(res, status, envelope, {
    ...corsHeaders(cors),
    'X-Request-Id': ctx.requestId,
    'X-Trace-Id': ctx.traceId
  });
}

/**
 * Bezpieczny decodeURIComponent: zwraca null gdy string jest zepsuty.
 */
function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch (_err) {
    return null;
  }
}

/**
 * readJson: czyta JSON z ograniczeniem pamięci.
 * - jeśli body > limitBytes: nie trzymamy kolejnych chunków w RAM (ale drenujemy stream)
 * - po drenażu rzucamy FleetError(validationError, causeCode PAYLOAD_TOO_LARGE)
 *
 * To nie jest najszybsze przy bardzo dużych payloadach, ale jest bezpieczne pamięciowo
 * i nie kończy się resetem socketu.
 */
async function readJson(req, options = {}) {
  const limitBytes = Number.isFinite(options.limitBytes) ? options.limitBytes : 1_000_000;

  let total = 0;
  let overLimit = false;
  const chunks = [];

  for await (const chunk of req) {
    total += chunk.length;

    if (!overLimit) {
      if (total > limitBytes) {
        overLimit = true;
        // od tego momentu już nie zapisujemy chunków
      } else {
        chunks.push(chunk);
      }
    }
  }

  if (!chunks.length && !overLimit) return null;

  if (overLimit) {
    throw new FleetError({
      code: 'validationError',
      causeCode: 'PAYLOAD_TOO_LARGE',
      message: `Payload exceeds limit (${limitBytes} bytes)`,
      details: { limitBytes }
    });
  }

  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (err) {
    throw new FleetError({
      code: 'validationError',
      causeCode: 'INVALID_JSON',
      message: 'Invalid JSON body',
      details: { parseError: String(err && err.message ? err.message : err) }
    });
  }
}

/**
 * Wrapper na handler HTTP — łapie sync + async błędy i odpowiada ErrorEnvelope.
 * Dzięki temu nie masz unhandled rejections.
 */
function wrapAsync(handler, options = {}) {
  const serviceName = options.serviceName || 'service';
  const cors = options.cors || {};

  return (req, res) => {
    const ctx = createContext(req, serviceName);

    // CORS preflight
    if (req.method === 'OPTIONS') {
      sendOptions(res, cors);
      return;
    }

    Promise.resolve(handler(req, res, ctx))
      .catch((err) => {
        if (res.headersSent) {
          // nic nie zrobimy — minimalnie domknij połączenie
          try { res.end(); } catch (_e) {}
          return;
        }
        sendError(res, ctx, err, cors);
      });
  };
}

/**
 * Router „tabelkowy” (elegancki, bez frameworków).
 * routes: [{ method, pattern, handler }]
 * - pattern może być stringiem (dokładny match) albo RegExp (z capture groups)
 */
function createRouter(routes, options = {}) {
  const notFoundMessage = options.notFoundMessage || 'not found';

  return async (req, res, ctx) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    for (const route of routes) {
      if (route.method !== req.method) continue;

      if (typeof route.pattern === 'string') {
        if (route.pattern !== pathname) continue;
        return route.handler(req, res, ctx, { pathname, url, match: null });
      }

      if (route.pattern instanceof RegExp) {
        const match = route.pattern.exec(pathname);
        if (!match) continue;
        return route.handler(req, res, ctx, { pathname, url, match });
      }
    }

    throw new FleetError({
      code: 'notFound',
      causeCode: 'NOT_FOUND',
      message: notFoundMessage,
      details: { path: pathname }
    });
  };
}

/**
 * Domyślne timeouty serwera (slowloris hardening).
 */
function applyServerDefaults(server, options = {}) {
  const keepAliveTimeoutMs = Number.isFinite(options.keepAliveTimeoutMs) ? options.keepAliveTimeoutMs : 5_000;
  const headersTimeoutMs = Number.isFinite(options.headersTimeoutMs) ? options.headersTimeoutMs : 15_000;
  const requestTimeoutMs = Number.isFinite(options.requestTimeoutMs) ? options.requestTimeoutMs : 30_000;

  server.keepAliveTimeout = keepAliveTimeoutMs;
  server.headersTimeout = Math.max(headersTimeoutMs, keepAliveTimeoutMs + 1_000);
  server.requestTimeout = requestTimeoutMs;
}

/**
 * HTTP client z keep-alive + retry na statusy i błędy sieciowe.
 */
const DEFAULT_HTTP_AGENT = new http.Agent({ keepAlive: true, maxSockets: 64 });
const DEFAULT_HTTPS_AGENT = new https.Agent({ keepAlive: true, maxSockets: 64 });

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitteredBackoff(baseMs, factor, attempt, maxMs) {
  const raw = Math.min(baseMs * Math.pow(factor, attempt), maxMs);
  const jitter = 0.5 + Math.random(); // 0.5..1.5
  return Math.floor(raw * jitter);
}

function requestJson(urlInput, options = {}) {
  const url = urlInput instanceof URL ? urlInput : new URL(urlInput);

  const method = options.method || 'GET';
  const payload = options.payload ?? null;

  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 1200;

  const retries = Number.isFinite(options.retries) ? options.retries : 0;
  const retryDelayMs = Number.isFinite(options.retryDelayMs) ? options.retryDelayMs : 120;
  const retryBackoffFactor = Number.isFinite(options.retryBackoffFactor) ? options.retryBackoffFactor : 2;
  const retryMaxDelayMs = Number.isFinite(options.retryMaxDelayMs) ? options.retryMaxDelayMs : 5000;

  const retryStatuses = Array.isArray(options.retryStatuses) ? options.retryStatuses : [502, 503, 504];
  const retryErrorCodes = new Set(
    Array.isArray(options.retryErrorCodes)
      ? options.retryErrorCodes
      : ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE', 'ENOTFOUND', 'EAI_AGAIN', 'timeout']
  );

  const body = payload == null ? null : JSON.stringify(payload);

  const headers = {
    'Accept': 'application/json',
    ...options.headers
  };
  if (body != null) {
    headers['Content-Type'] = 'application/json; charset=utf-8';
    headers['Content-Length'] = Buffer.byteLength(body);
  }

  const agent =
    options.agent ||
    (url.protocol === 'https:' ? DEFAULT_HTTPS_AGENT : DEFAULT_HTTP_AGENT);

  async function attempt(attemptIndex) {
    const started = Date.now();

    try {
      const result = await new Promise((resolve, reject) => {
        const transport = url.protocol === 'https:' ? https : http;

        const req = transport.request(
          {
            protocol: url.protocol,
            hostname: url.hostname,
            port: url.port,
            path: `${url.pathname}${url.search || ''}`,
            method,
            headers,
            agent
          },
          (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
              const text = Buffer.concat(chunks).toString('utf8');
              let json = null;
              if (text) {
                try { json = JSON.parse(text); } catch (_e) { json = null; }
              }
              resolve({
                ok: Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 300),
                status: res.statusCode || 0,
                headers: res.headers || {},
                text,
                json,
                durationMs: Date.now() - started
              });
            });
          }
        );

        req.on('error', reject);
        req.setTimeout(timeoutMs, () => {
          req.destroy(Object.assign(new Error('timeout'), { code: 'timeout' }));
        });

        if (body != null) req.write(body);
        req.end();
      });

      if (retryStatuses.includes(result.status) && attemptIndex < retries) {
        const wait = jitteredBackoff(retryDelayMs, retryBackoffFactor, attemptIndex, retryMaxDelayMs);
        await delay(wait);
        return attempt(attemptIndex + 1);
      }

      return { ...result, attempts: attemptIndex + 1 };
    } catch (err) {
      const code = err && err.code ? String(err.code) : 'UNKNOWN';
      if (retryErrorCodes.has(code) && attemptIndex < retries) {
        const wait = jitteredBackoff(retryDelayMs, retryBackoffFactor, attemptIndex, retryMaxDelayMs);
        await delay(wait);
        return attempt(attemptIndex + 1);
      }
      return {
        ok: false,
        status: 0,
        headers: {},
        text: '',
        json: null,
        error: { code, message: String(err && err.message ? err.message : err) },
        durationMs: Date.now() - started,
        attempts: attemptIndex + 1
      };
    }
  }

  return attempt(0);
}

function getJson(urlInput, options = {}) {
  return requestJson(urlInput, { ...options, method: 'GET' });
}

function postJson(urlInput, payload, options = {}) {
  return requestJson(urlInput, { ...options, method: 'POST', payload });
}

/**
 * SSE hub z backpressure (drop slow clients).
 */
function createSseHub(options = {}) {
  const cors = options.cors || {};
  const maxClients = Number.isFinite(options.maxClients) ? options.maxClients : 50;
  const pingMs = Number.isFinite(options.pingMs) ? options.pingMs : 15_000;
  const retryMs = Number.isFinite(options.retryMs) ? options.retryMs : 2_000;
  const slowLimit = Number.isFinite(options.slowLimit) ? options.slowLimit : 2;

  const clients = new Set();

  function removeClient(client) {
    if (!clients.has(client)) return;
    clients.delete(client);
    if (client.pingTimer) clearInterval(client.pingTimer);
    try { client.res.end(); } catch (_e) {}
  }

  function safeWrite(client, data) {
    try {
      const ok = client.res.write(data);
      if (!ok) client.slowCount += 1;
      else client.slowCount = 0;

      if (client.slowCount > slowLimit) {
        removeClient(client);
        return false;
      }
      return true;
    } catch (_err) {
      removeClient(client);
      return false;
    }
  }

  function add(req, res, initialEvent) {
    if (clients.size >= maxClients) {
      throw new FleetError({
        code: 'rateLimited',
        causeCode: 'TOO_MANY_CLIENTS',
        message: 'Too many SSE clients'
      });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...corsHeaders(cors)
    });

    // reconnection hint
    res.write(`retry: ${retryMs}\n`);
    res.write(': hello\n\n');

    const client = { res, slowCount: 0, pingTimer: null };
    client.pingTimer = setInterval(() => {
      safeWrite(client, `: ping ${Date.now()}\n\n`);
    }, pingMs);

    clients.add(client);

    req.on('close', () => removeClient(client));

    if (initialEvent) {
      const frame = `event: ${initialEvent.event}\ndata: ${JSON.stringify(initialEvent.data)}\n\n`;
      safeWrite(client, frame);
    }

    return client;
  }

  function broadcast(event, data, id) {
    const parts = [];
    if (id !== undefined && id !== null) parts.push(`id: ${id}`);
    if (event) parts.push(`event: ${event}`);
    parts.push(`data: ${JSON.stringify(data)}`);
    const frame = `${parts.join('\n')}\n\n`;

    for (const client of clients) {
      safeWrite(client, frame);
    }
  }

  function closeAll() {
    for (const client of Array.from(clients)) removeClient(client);
  }

  return {
    add,
    broadcast,
    closeAll,
    size: () => clients.size
  };
}

module.exports = {
  // id
  ulid,
  makeId,

  // errors
  FleetError,
  ERROR_HTTP_STATUS,
  toErrorEnvelope,
  sendError,

  // server helpers
  corsHeaders,
  sendJson,
  sendText,
  sendOptions,
  safeDecodeURIComponent,
  readJson,
  wrapAsync,
  createRouter,
  applyServerDefaults,

  // client helpers
  requestJson,
  getJson,
  postJson,

  // sse
  createSseHub
};
```

**Co to daje natychmiast?**
- brak unhandled rejections (czyli brak „losowych” crashy),
- spójny ErrorEnvelope + requestId/traceId,
- bezpieczny `decodeURIComponent`,
- body limit bez resetu socketu,
- HTTP keep-alive i retry również na błędy sieciowe,
- SSE z backpressure.

---

## 2) Konkretny refaktor `fleet-core/server.js`: tick loop + SSE hub + spójne błędy

Tu nie pokazuję całego pliku 1:1, tylko **konkretne fragmenty**, które realnie zmieniasz.

### 2.1. Nowe importy i setup (na górze pliku)
W `apps/fleet-core/server.js` usuń lokalne `sendJson`, `sendText`, `readJsonBody`, `startSse`, `createId`. Zastąp:

```js
const http = require('http');
const fs = require('fs');
const path = require('path');

const {
  makeId,
  FleetError,
  sendJson,
  sendText,
  readJson,
  wrapAsync,
  createRouter,
  applyServerDefaults,
  createSseHub,
  corsHeaders
} = require('../../packages/fleet-kit');
```

Dodaj config CORS:

```js
const cors = { origin: '*', methods: 'GET,POST,OPTIONS', headers: 'Content-Type,Authorization,X-Request-Id,X-Trace-Id' };
```

### 2.2. Zastąp `setInterval` na „tick loop bez overlap”
To jest **kluczowe dla niezawodności** (brak wyścigów w runtime).

```js
function startTickLoop({ tickMs, onTick, logger }) {
  let stopped = false;

  async function loop() {
    const t0 = Date.now();
    try {
      await onTick();
    } catch (err) {
      logger?.warn?.({ msg: 'tick_failed', err: String(err && err.message ? err.message : err) });
    }
    const dt = Date.now() - t0;
    const delay = Math.max(0, tickMs - dt);
    if (!stopped) setTimeout(loop, delay);
  }

  loop();

  return {
    stop() { stopped = true; }
  };
}
```

### 2.3. Użyj `createSseHub` zamiast ręcznego `Set` i `res.write` bez kontroli
```js
const sse = createSseHub({ cors, maxClients: 50, pingMs: 15000, retryMs: 2000, slowLimit: 2 });
```

Broadcast w ticku:

```js
let cursor = 0;

function buildStreamPayload(snapshot, state) {
  return {
    ok: true,
    cursor,
    tsMs: Date.now(),
    activeSceneId: state.activeSceneId,
    controlLease: state.lease,
    robots: snapshot.robots,
    tasks: snapshot.tasks
  };
}

// w onTick():
cursor += 1;
const decision = runtime.tick({ nowMs: Date.now() });
sse.broadcast('state', buildStreamPayload(decision, state), cursor);
```

A endpoint `/api/v1/stream`:

```js
function handleStream(req, res, ctx) {
  const snapshot = runtime.getState();
  sse.add(req, res, { event: 'state', data: buildStreamPayload(snapshot, state) });
}
```

### 2.4. Router tabelkowy zamiast dużej kaskady `if/else`
To jest „elegancja + mniejsza liczba miejsc, gdzie można się pomylić”.

```js
const router = createRouter([
  {
    method: 'GET',
    pattern: '/api/v1/health',
    handler: async (_req, res, ctx) => {
      sendJson(res, 200, { status: 'ok', tsMs: Date.now() }, { ...corsHeaders(cors), 'X-Request-Id': ctx.requestId });
    }
  },
  {
    method: 'GET',
    pattern: '/api/v1/state',
    handler: async (_req, res, ctx) => {
      const runtimeState = runtime.getState();
      sendJson(res, 200, {
        cursor,
        tsMs: Date.now(),
        activeSceneId: state.activeSceneId,
        controlLease: state.lease,
        robots: runtimeState.robots,
        tasks: runtimeState.tasks
      }, { ...corsHeaders(cors), 'X-Request-Id': ctx.requestId });
    }
  },
  {
    method: 'GET',
    pattern: '/api/v1/stream',
    handler: async (req, res, _ctx) => handleStream(req, res)
  },
  {
    method: 'POST',
    pattern: '/api/v1/tasks',
    handler: async (req, res, ctx) => {
      const payload = await readJson(req, { limitBytes: 1_000_000 });
      const task = runtime.createTask(payload?.task || {}, Date.now());
      sendJson(res, 200, { ok: true, taskId: task.taskId }, { ...corsHeaders(cors), 'X-Request-Id': ctx.requestId });
    }
  },
  // ... kolejne trasy
], { notFoundMessage: 'not found' });
```

### 2.5. Serwer: wrapAsync + server defaults
```js
const server = http.createServer(
  wrapAsync(router, { serviceName: 'fleet-core', cors })
);
applyServerDefaults(server, { requestTimeoutMs: 30_000, headersTimeoutMs: 15_000, keepAliveTimeoutMs: 5_000 });
```

To **usuwa klasę awarii** typu „wyjątek w handlerze ubija proces” i „slowloris”.

---

## 3) Command Outbox: kontrola burstów, limit równoległości, retry/backoff (konkretny kod)

To jest najprostszy mechanizm, który zapobiega:
- floodowi komend po reconnect,
- 1000 równoległym requestom do gateway,
- log spamowi.

Dodaj jako **jeden plik**:

**`apps/fleet-core/outbox.js`**

```js
// apps/fleet-core/outbox.js
'use strict';

const { FleetError } = require('../../packages/fleet-kit');

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createOutbox(options) {
  const send = options.send; // async (command) => ack
  const maxInflight = Number.isFinite(options.maxInflight) ? options.maxInflight : 4;
  const maxQueue = Number.isFinite(options.maxQueue) ? options.maxQueue : 1000;
  const maxAttempts = Number.isFinite(options.maxAttempts) ? options.maxAttempts : 5;
  const baseDelayMs = Number.isFinite(options.baseDelayMs) ? options.baseDelayMs : 150;
  const backoffFactor = Number.isFinite(options.backoffFactor) ? options.backoffFactor : 2;
  const maxDelayMs = Number.isFinite(options.maxDelayMs) ? options.maxDelayMs : 3000;
  const logger = options.logger || null;

  let inflight = 0;
  const queue = [];
  let pumping = false;

  function schedulePump() {
    if (pumping) return;
    pumping = true;
    setImmediate(async () => {
      try {
        await pump();
      } finally {
        pumping = false;
        if (queue.length && inflight < maxInflight) schedulePump();
      }
    });
  }

  async function pump() {
    while (inflight < maxInflight && queue.length) {
      const item = queue.shift();
      if (!item) break;

      const now = Date.now();
      if (item.nextAttemptTsMs && item.nextAttemptTsMs > now) {
        // jeszcze nie czas — wróć na koniec
        queue.push(item);
        continue;
      }

      inflight += 1;

      Promise.resolve()
        .then(() => send(item.command))
        .then((ack) => item.resolve(ack))
        .catch(async (err) => {
          item.attempt += 1;

          const retryable = true; // w MVP: retry prawie wszystko, dopóki nie walidacja
          const shouldRetry = retryable && item.attempt < maxAttempts;

          if (!shouldRetry) {
            const finalErr = err instanceof FleetError
              ? err
              : new FleetError({
                  code: 'dependencyUnavailable',
                  causeCode: 'NETWORK_ERROR',
                  message: `command failed after ${item.attempt} attempts`,
                  details: { lastError: String(err && err.message ? err.message : err) }
                });
            item.reject(finalErr);
            return;
          }

          const delayMs = Math.min(baseDelayMs * Math.pow(backoffFactor, item.attempt - 1), maxDelayMs);
          item.nextAttemptTsMs = Date.now() + delayMs;
          queue.push(item);

          logger?.warn?.({
            msg: 'outbox_retry',
            attempt: item.attempt,
            delayMs,
            robotId: item.command?.robotId,
            commandId: item.command?.commandId,
            err: String(err && err.message ? err.message : err)
          });

          await delay(0);
        })
        .finally(() => {
          inflight -= 1;
          schedulePump();
        });
    }
  }

  function enqueue(command) {
    if (queue.length >= maxQueue) {
      throw new FleetError({
        code: 'rateLimited',
        causeCode: 'OUTBOX_OVERFLOW',
        message: 'Command outbox overflow',
        details: { maxQueue }
      });
    }

    return new Promise((resolve, reject) => {
      queue.push({
        command,
        attempt: 0,
        nextAttemptTsMs: 0,
        resolve,
        reject
      });
      schedulePump();
    });
  }

  return {
    enqueue,
    stats() {
      return { inflight, queued: queue.length, maxInflight, maxQueue };
    }
  };
}

module.exports = { createOutbox };
```

W `fleet-core/server.js` użycie:

```js
const { createOutbox } = require('./outbox');

const outbox = createOutbox({
  send: async (command) => {
    // tu użyj postJson / requestJson z fleet-kit
    const ack = await gatewayClient.sendCommand(command);
    return ack;
  },
  maxInflight: config.runtime?.maxCommandInflight ?? 4,
  maxQueue: config.runtime?.maxCommandQueue ?? 1000,
  logger: console
});

// w ticku:
for (const command of decision.commands) {
  outbox.enqueue(command).catch((err) => console.warn('command drop', err.message));
}
```

---

## 4) Konkretny upgrade `fleet-core/mvp0/gateway_client.js`: retry, keep-alive, parsowanie ACK

Zastąp bardzo prosty klient (`http.request` bez keep-alive i bez retry) na klient z `fleet-kit`.

**`apps/fleet-core/mvp0/gateway_client.js` (propozycja)**

```js
'use strict';

const { postJson, FleetError } = require('../../../packages/fleet-kit');

function createGatewayClient(config = {}) {
  const baseUrl = config.baseUrl || 'http://127.0.0.1:8081';
  const timeoutMs = Number.isFinite(config.timeoutMs) ? config.timeoutMs : 1200;

  async function sendCommand(command) {
    if (!command || !command.robotId) {
      throw new FleetError({
        code: 'validationError',
        causeCode: 'MISSING_ROBOT_ID',
        message: 'command.robotId required'
      });
    }

    const url = new URL(`/gateway/v1/robots/${encodeURIComponent(command.robotId)}/commands`, baseUrl);

    const result = await postJson(url, { command }, {
      timeoutMs,
      retries: Number.isFinite(config.retries) ? config.retries : 2,
      retryDelayMs: 120,
      retryBackoffFactor: 2
    });

    if (!result.ok) {
      throw new FleetError({
        code: 'dependencyUnavailable',
        causeCode: result.status ? 'DEPENDENCY_ERROR' : 'NETWORK_ERROR',
        message: 'gateway sendCommand failed',
        details: {
          status: result.status,
          body: result.text?.slice(0, 4000),
          attempts: result.attempts,
          error: result.error || null
        }
      });
    }

    // gateway zwykle zwraca ACK w JSON
    return result.json || { ok: true };
  }

  return { sendCommand };
}

module.exports = { createGatewayClient };
```

To usuwa:
- „czasem timeout, czasem ECONNRESET” bez retry,
- brak keep-alive (mniej churnu socketów),
- brak strukturalnej informacji o błędzie.

---

## 5) Konkretny refaktor `fleet-gateway/server.js`: safeDecode + wrapAsync + ErrorEnvelope

Tu chodzi o 3 rzeczy:
1) `decodeURIComponent` nie może crashować,
2) błędy mają być spójne,
3) handler async nie może generować unhandled rejection.

Minimalny szkielet:

```js
const http = require('http');
const {
  FleetError,
  sendJson,
  readJson,
  wrapAsync,
  createRouter,
  safeDecodeURIComponent,
  applyServerDefaults,
  corsHeaders
} = require('../../packages/fleet-kit');

const cors = { origin: '*', methods: 'GET,POST,OPTIONS', headers: 'Content-Type,Authorization,X-Request-Id,X-Trace-Id' };

function decodeRobotId(raw) {
  const decoded = safeDecodeURIComponent(raw);
  if (!decoded) {
    throw new FleetError({
      code: 'validationError',
      causeCode: 'INVALID_PATH_ENCODING',
      message: 'Invalid URL encoding in robotId'
    });
  }
  return decoded;
}

const router = createRouter([
  {
    method: 'GET',
    pattern: '/gateway/v1/health',
    handler: async (_req, res, ctx) => {
      sendJson(res, 200, { status: 'ok', tsMs: Date.now() }, { ...corsHeaders(cors), 'X-Request-Id': ctx.requestId });
    }
  },
  {
    method: 'GET',
    pattern: '/gateway/v1/robots',
    handler: async (_req, res, ctx) => {
      const robots = await gateway.listRobots();
      sendJson(res, 200, { robots }, { ...corsHeaders(cors), 'X-Request-Id': ctx.requestId });
    }
  },
  {
    method: 'GET',
    pattern: /^\/gateway\/v1\/robots\/([^/]+)\/status$/,
    handler: async (_req, res, ctx, { match }) => {
      const robotId = decodeRobotId(match[1]);
      const status = await gateway.getRobotStatus(robotId);
      if (!status) {
        throw new FleetError({ code: 'notFound', causeCode: 'ROBOT_NOT_FOUND', message: 'robot not found', details: { robotId } });
      }
      sendJson(res, 200, status, { ...corsHeaders(cors), 'X-Request-Id': ctx.requestId });
    }
  },
  {
    method: 'POST',
    pattern: /^\/gateway\/v1\/robots\/([^/]+)\/commands$/,
    handler: async (req, res, ctx, { match }) => {
      const robotId = decodeRobotId(match[1]);
      const payload = await readJson(req, { limitBytes: 1_000_000 });
      const command = payload?.command || payload || {};
      const result = await gateway.sendCommand(robotId, command);

      // gateway zwraca ack nawet gdy provider offline — to nie jest błąd transportu
      sendJson(res, result.httpStatus || 200, result.ack || { ok: true }, { ...corsHeaders(cors), 'X-Request-Id': ctx.requestId });
    }
  }
]);

const server = http.createServer(wrapAsync(router, { serviceName: 'fleet-gateway', cors }));
applyServerDefaults(server);
```

---

## 6) Dodatkowe „niezawodne” detale, które robią różnicę w praktyce

### 6.1. Graceful shutdown (konkretny kod)
W każdej usłudze:

```js
function installShutdown({ server, sse, ticker, outbox }) {
  const shutdown = () => {
    console.log('shutting down...');
    try { ticker?.stop?.(); } catch {}
    try { sse?.closeAll?.(); } catch {}
    try { server.close(() => process.exit(0)); } catch { process.exit(0); }
    setTimeout(() => process.exit(0), 2000).unref();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
```

### 6.2. Polityka na `unhandledRejection/uncaughtException`
W prod zwykle lepiej **fail-fast** (systemd/k8s zrobi restart):

```js
process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('uncaughtException', err);
  process.exit(1);
});
```

W dev możesz to przełączyć flagą.

### 6.3. Lease: wymuś w endpointach mutujących (konkretny fragment)
Najprostszy helper:

```js
function requireLease(state, payloadLeaseId) {
  const now = Date.now();
  if (state.lease && state.lease.expiresTsMs <= now) state.lease = null;

  if (!state.lease) {
    throw new FleetError({ code: 'conflict', causeCode: 'LEASE_REQUIRED', message: 'control lease required' });
  }
  if (payloadLeaseId && state.lease.leaseId !== payloadLeaseId) {
    throw new FleetError({ code: 'conflict', causeCode: 'INVALID_LEASE', message: 'invalid lease' });
  }
  return state.lease;
}
```

Użycie w `POST /api/v1/tasks` i manual commands:
- `requireLease(state, payload?.leaseId)`.

---

## 7) Dlaczego to jest „bardziej eleganckie”, a nie tylko „bardziej długie”?

1) **Jeden styl błędów** (FleetError → ErrorEnvelope)  
   Zamiast 15 wariantów: `{error:"x"}`, `{ok:false}`, plain text.

2) **Jeden wrapper** na handler  
   Zamiast pamiętać, gdzie dodać try/catch.

3) **Router tabelkowy**  
   Kod jest krótszy, a dodawanie endpointu to dopisanie jednego obiektu.

4) **SSE jako moduł** z backpressure  
   Problem „wolny klient” jest rozwiązany raz, nie „każdy endpoint po swojemu”.

5) **HTTP client z retry**  
   W jednym miejscu definiujesz, co jest retryable (statusy + error codes).

---

## 8) Minimalna kolejność wdrożenia (żeby nie ryzykować regresji)

1) Dodaj `packages/fleet-kit/index.js` i wprowadź tylko **wrapAsync + safeDecode + readJson** w gateway/core  
2) Wprowadź `createSseHub` w core (backpressure)  
3) Zmień tick na „tick loop” bez overlap  
4) Dodaj outbox i przerzuć wysyłkę komend na `enqueue()`  
5) Ujednolić błędy (FleetError) w new endpointach, potem migrować resztę

Każdy krok jest mały i testowalny.

---

Jeśli chcesz, mogę też dopisać gotowy „patch-list” (konkretne diffy dla `fleet-core/server.js` i `fleet-gateway/server.js`) w stylu `git diff`, ale powyższy kod jest już wystarczająco konkretny, żeby wdrożyć to bez zgadywania.
