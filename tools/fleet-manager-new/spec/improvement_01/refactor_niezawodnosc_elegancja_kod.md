# Niezawodność + elegancja: konkretne rozwiązania i kod (core ↔ gateway)

Poniżej masz **konkretne zmiany w kodzie**, które:
- usuwają “silent failures”,
- spinają idempotencję end‑to‑end (to samo `commandId` w core, gateway i logach),
- stabilizują gateway (cache + background telemetry + brak I/O w GET),
- dodają retry z jitterem i keep‑alive (mniej flakiness),
- upraszczają implementację (mniej przypadków brzegowych, spójne błędy).

Wszystkie przykłady są w CommonJS (tak jak repo).

---

## 0) Zasady (krótkie, ale ostre)

1) **Każda komenda ma `commandId` z core** i to ID idzie dalej wszędzie.  
2) **HTTP 4xx/5xx nie może wyglądać jak sukces** (klient musi to widzieć).  
3) **GET nie robi kosztownego I/O** (telemetria w tle + cache).  
4) **Retry tylko na retryowalne błędy** + **jitter**, żeby uniknąć “stormów”.  
5) **Jeden styl błędów** (ErrorEnvelope), żeby klienci nie zgadywali.

---

## 1) Core: lepszy klient do gateway (keep-alive + parsing + sensowny wynik)

Plik: `apps/fleet-core/mvp0/gateway_client.js`  
**Zastąp** obecną implementację poniższą (pełny plik).

```js
const http = require('http');
const https = require('https');

const HTTP_AGENT = new http.Agent({ keepAlive: true, maxSockets: 64 });
const HTTPS_AGENT = new https.Agent({ keepAlive: true, maxSockets: 64 });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function shouldRetryNetworkError(err) {
  const code = err && (err.code || err.errno);
  return code === 'timeout'
    || code === 'ECONNRESET'
    || code === 'ECONNREFUSED'
    || code === 'EPIPE';
}

async function requestJson(urlInput, options = {}) {
  const url = urlInput instanceof URL ? urlInput : new URL(urlInput);
  const {
    method = 'POST',
    payload = null,
    timeoutMs = 1200,
    headers = {},
    retries = 0,
    retryDelayMs = 120,
    retryBackoffFactor = 2,
    retryJitterMs = 80,
    retryStatuses = [502, 503, 504]
  } = options;

  const body = payload == null ? null : JSON.stringify(payload);
  const reqHeaders = {
    Accept: 'application/json',
    ...(body != null
      ? { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) }
      : {}),
    ...headers
  };

  async function attempt(attemptIndex) {
    let result;
    try {
      result = await new Promise((resolve, reject) => {
        const transport = url.protocol === 'https:' ? https : http;
        const agent = url.protocol === 'https:' ? HTTPS_AGENT : HTTP_AGENT;

        const req = transport.request(
          {
            protocol: url.protocol,
            hostname: url.hostname,
            port: url.port,
            path: `${url.pathname}${url.search || ''}`,
            method,
            headers: reqHeaders,
            agent
          },
          (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
              const text = Buffer.concat(chunks).toString('utf8');
              let json = null;
              if (text) {
                try { json = JSON.parse(text); } catch (_e) { json = null; }
              }
              const status = res.statusCode || 0;
              resolve({
                ok: status >= 200 && status < 300,
                status,
                headers: res.headers || {},
                text,
                json
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
    } catch (err) {
      if (attemptIndex < retries && shouldRetryNetworkError(err)) {
        const backoff = Math.min(retryDelayMs * Math.pow(retryBackoffFactor, attemptIndex), 3000);
        const jitter = Math.floor(Math.random() * retryJitterMs);
        await sleep(backoff + jitter);
        return attempt(attemptIndex + 1);
      }
      throw err;
    }

    if (attemptIndex < retries && retryStatuses.includes(result.status)) {
      const backoff = Math.min(retryDelayMs * Math.pow(retryBackoffFactor, attemptIndex), 3000);
      const jitter = Math.floor(Math.random() * retryJitterMs);
      await sleep(backoff + jitter);
      return attempt(attemptIndex + 1);
    }

    return result;
  }

  return attempt(0);
}

function createGatewayClient(config = {}) {
  const baseUrl = config.baseUrl || 'http://127.0.0.1:8081';
  const timeoutMs = Number.isFinite(config.timeoutMs) ? config.timeoutMs : 1200;

  async function sendCommand(command, ctx = {}) {
    if (!command || !command.robotId) {
      throw new Error('command.robotId required');
    }
    const url = new URL(`/gateway/v1/robots/${encodeURIComponent(command.robotId)}/commands`, baseUrl);

    const headers = {};
    if (ctx.requestId) headers['X-Request-Id'] = String(ctx.requestId);

    // Ustalamy jeden kanoniczny envelope
    const payload = { command };

    const res = await requestJson(url, {
      method: 'POST',
      payload,
      timeoutMs,
      retries: Number.isFinite(config.retries) ? config.retries : 1,
      headers
    });

    // Ważne: gateway czasem zwraca ACK nawet przy 503 (provider offline). Nie gubimy body.
    return {
      ok: res.ok,
      status: res.status,
      ack: res.json,
      text: res.text
    };
  }

  return { sendCommand };
}

module.exports = { createGatewayClient };
```

**Co to daje:**
- keep‑alive (stabilniejsza latencja i mniej resetów TCP),
- retry z jitterem (unika “pulsowania”),
- zawsze zwracasz parsed JSON i status (koniec “udawanych sukcesów”).

---

## 2) Core: naprawa `commandId` + zwracanie realnego ACK do UI

Plik: `apps/fleet-core/server.js`  
W miejscu obsługi `POST /api/v1/robots/:robotId/commands` popraw to tak, aby:
- `commandId` był **w komendzie wysyłanej do gateway**,
- odpowiedź do UI zawierała **ACK z gateway**.

Minimalna zmiana (patch logiczny):

```diff
@@
     const robotId = commandMatch[1];
     const commandId = createId('cmd');
-    const command = { ...(payload?.command || {}), robotId };
+    const command = { ...(payload?.command || {}), robotId, commandId };
     try {
-      await gatewayClient.sendCommand(command);
-      sendJson(res, 200, { ok: true, robotId, commandId });
+      const gw = await gatewayClient.sendCommand(command, { requestId: req.headers['x-request-id'] || commandId });
+      const httpStatus = gw.ok ? 200 : (gw.status || 503);
+      sendJson(res, httpStatus, {
+        ok: gw.ok,
+        robotId,
+        commandId,
+        ack: gw.ack || null,
+        error: gw.ok ? null : (gw.ack?.statusReasonCode || gw.text || 'gateway_error')
+      });
     } catch (err) {
       sendJson(res, 503, { ok: false, robotId, commandId, error: err.message || 'gateway_error' });
     }
     return;
```

---

## 3) Core: elegancki dispatch komend (Outbox + retry + idempotencja)

Dzisiaj tick loop robi `sendCommand(...).catch(...)` “na pałę”. To jest proste, ale:
- nie ma backoff,
- nie ma spójnego miejsca na retry,
- nie ma stanu “in flight”.

Dodaj jeden większy moduł (jeden plik) – **bez dzielenia na 10 małych**.

Nowy plik: `apps/fleet-core/mvp0/command_dispatcher.js`

```js
const crypto = require('crypto');

function createId(prefix) {
  const rand = crypto.randomBytes(6).toString('hex');
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

function stableKeyForCommand(cmd) {
  const nodeId = cmd?.payload?.targetRef?.nodeId || cmd?.payload?.targetExternalId || '';
  const height = Number.isFinite(cmd?.payload?.toHeightM) ? cmd.payload.toHeightM : '';
  return `${cmd?.type || 'unknown'}|${nodeId}|${height}`;
}

function jitter(ms) {
  const j = Math.floor(Math.random() * Math.min(150, ms));
  return ms + j;
}

function createCommandDispatcher({ gatewayClient, baseDelayMs = 250, maxDelayMs = 5000 } = {}) {
  if (!gatewayClient) throw new Error('gatewayClient required');

  // per-robot state
  const byRobot = new Map();

  function getRobotState(robotId) {
    let st = byRobot.get(robotId);
    if (!st) {
      st = {
        inflight: null,        // { key, commandId, cmd, attempt, nextAttemptTsMs }
        lastAck: null,         // ostatni ack z gateway
        lastError: null        // ostatni błąd sieciowy / wyjątek
      };
      byRobot.set(robotId, st);
    }
    return st;
  }

  function plan(command, nowMs) {
    if (!command?.robotId) return;

    const robotId = command.robotId;
    const st = getRobotState(robotId);
    const key = stableKeyForCommand(command);

    // “latest wins”: jeśli nowa komenda ma inny key, zastępuje starą
    if (st.inflight && st.inflight.key !== key) {
      st.inflight = null;
    }

    if (!st.inflight) {
      st.inflight = {
        key,
        commandId: command.commandId || createId('cmd'),
        cmd: { ...command },
        attempt: 0,
        nextAttemptTsMs: nowMs
      };
    } else {
      // ta sama komenda logiczna: nie resetujemy commandId (idempotencja retry)
      st.inflight.cmd = { ...command, commandId: st.inflight.commandId };
    }
  }

  function isRetryable(status, ack) {
    // retryowalne: offline provider, timeouts, network – wszystko co “chwilowe”
    const reason = ack?.statusReasonCode;
    return status === 502 || status === 503 || status === 504
      || reason === 'PROVIDER_OFFLINE'
      || reason === 'PROVIDER_SWITCHING'
      || reason === 'TIMEOUT'
      || reason === 'NETWORK_ERROR';
  }

  async function flush(nowMs) {
    const tasks = [];
    for (const [robotId, st] of byRobot.entries()) {
      if (!st.inflight) continue;
      if (nowMs < st.inflight.nextAttemptTsMs) continue;

      tasks.push((async () => {
        const entry = st.inflight;
        const cmd = { ...entry.cmd, robotId, commandId: entry.commandId };

        try {
          const gw = await gatewayClient.sendCommand(cmd, { requestId: entry.commandId });
          st.lastAck = gw.ack || null;
          st.lastError = null;

          if (gw.ok) {
            st.inflight = null;
            return;
          }

          // jeśli nie ok, decydujemy: retry czy porzucamy
          if (!isRetryable(gw.status, gw.ack)) {
            st.inflight = null; // błąd nieretryowalny (np. 400)
            return;
          }

          entry.attempt += 1;
          const delay = Math.min(baseDelayMs * Math.pow(2, entry.attempt), maxDelayMs);
          entry.nextAttemptTsMs = nowMs + jitter(delay);
          st.inflight = entry;
        } catch (err) {
          st.lastError = { message: err.message, code: err.code };
          entry.attempt += 1;
          const delay = Math.min(baseDelayMs * Math.pow(2, entry.attempt), maxDelayMs);
          entry.nextAttemptTsMs = nowMs + jitter(delay);
          st.inflight = entry;
        }
      })());
    }

    await Promise.all(tasks);
  }

  function getDebugState() {
    const out = [];
    for (const [robotId, st] of byRobot.entries()) {
      out.push({
        robotId,
        inflight: st.inflight ? { ...st.inflight, cmd: undefined } : null,
        lastAck: st.lastAck,
        lastError: st.lastError
      });
    }
    return out;
  }

  return { plan, flush, getDebugState };
}

module.exports = { createCommandDispatcher };
```

### Jak wpiąć dispatcher w `server.js` (core)
W `startServer` po utworzeniu `gatewayClient` dodaj:
```js
const { createCommandDispatcher } = require('./mvp0/command_dispatcher');
const dispatcher = createCommandDispatcher({ gatewayClient });
```

A w tick loop zamień bezpośrednie `sendCommand` na:
```diff
 setInterval(() => {
   const decision = runtime.tick({ nowMs: nowMs() });
-  for (const command of decision.commands) {
-    gatewayClient.sendCommand(command).catch((err) => {
-      console.warn(`gateway command failed: ${err.message}`);
-    });
-  }
+  const now = nowMs();
+  for (const command of decision.commands) dispatcher.plan(command, now);
+  dispatcher.flush(now).catch((err) => console.warn(`dispatcher.flush failed: ${err.message}`));
   broadcastState(buildStreamPayload(decision));
 }, tickMs);
```

To przenosi retry/backoff do jednego miejsca i robi implementację dużo “czystszą”.

---

## 4) Gateway: HTTP klient z keep-alive + retry na błędy sieciowe + jitter

Plik: `apps/fleet-gateway/lib/http.js`  
**Zastąp** retry “tylko po statusach” retry’em także po błędach sieciowych i dodaj keep‑alive.

Minimalna wersja (fragmenty do wklejenia):

```diff
 const http = require('http');
 const https = require('https');

+const HTTP_AGENT = new http.Agent({ keepAlive: true, maxSockets: 64 });
+const HTTPS_AGENT = new https.Agent({ keepAlive: true, maxSockets: 64 });

@@
 function requestJson(urlInput, options = {}) {
@@
-    const result = await new Promise((resolve, reject) => {
+    let result;
+    try {
+      result = await new Promise((resolve, reject) => {
         const transport = url.protocol === 'https:' ? https : http;
-        const req = transport.request(buildRequestOptions(url, method, headers), (res) => {
+        const agent = url.protocol === 'https:' ? HTTPS_AGENT : HTTP_AGENT;
+        const req = transport.request({ ...buildRequestOptions(url, method, headers), agent }, (res) => {
           const chunks = [];
@@
-      req.on('error', reject);
+      req.on('error', reject);
       req.setTimeout(timeoutMs, () => {
         req.destroy(Object.assign(new Error('timeout'), { code: 'timeout' }));
       });
@@
-    });
+      });
+    } catch (err) {
+      const code = err?.code;
+      const retryable = code === 'timeout' || code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'EPIPE';
+      if (retryable && attempt < retries) {
+        const backoff = Math.min(retryDelayMs * Math.pow(retryBackoffFactor, attempt), 5000);
+        const jitter = Math.floor(Math.random() * Math.min(100, backoff));
+        await delay(backoff + jitter);
+        return attemptRequest(attempt + 1);
+      }
+      throw err;
+    }

     if (retryStatuses.includes(result.status) && attempt < retries) {
       const backoff = Math.min(retryDelayMs * Math.pow(retryBackoffFactor, attempt), 5000);
-      await delay(backoff);
+      const jitter = Math.floor(Math.random() * Math.min(100, backoff));
+      await delay(backoff + jitter);
       return attemptRequest(attempt + 1);
     }
```

---

## 5) Gateway: “GET nie robi I/O” (telemetria w tle + cache)

Dzisiaj `listRobots()` robi `refresh=true` dla wszystkich robotów. To skaluje się słabo i robi lawiny.

### Minimalny, elegancki refactor w `apps/fleet-gateway/lib/gateway.js`

**Cel:**
- `start()` uruchamia background telemetry loop,
- `listRobots()` i `getRobotStatus()` zwracają snapshot bez I/O,
- refresh robi się w tle i jest odporny na partial failure (`Promise.allSettled`).

Poniżej jest propozycja “w jednym pliku”, bez nowych modułów.

#### 5.1 Dodaj konfigurację pollingu i start/stop
W `createGateway(...)` dodaj:

```js
const telemetryPollMs = Number.isFinite(config.telemetryPollMs) ? config.telemetryPollMs : 250;
const telemetryConcurrency = Number.isFinite(config.telemetryConcurrency) ? config.telemetryConcurrency : 8;
let telemetryTimer = null;

function createLimiter(max) {
  let active = 0;
  const queue = [];
  return async (fn) => {
    if (active >= max) await new Promise((r) => queue.push(r));
    active += 1;
    try { return await fn(); }
    finally {
      active -= 1;
      const next = queue.shift();
      if (next) next();
    }
  };
}
const limit = createLimiter(telemetryConcurrency);
```

#### 5.2 Zmień refreshAll na allSettled (partial success)
```js
async function refreshAll(now) {
  const entries = Array.from(robots.values());
  const results = await Promise.allSettled(entries.map((e) => limit(() => refreshRobot(e, now))));
  for (const r of results) {
    if (r.status === 'rejected') {
      // nie wywracamy całego gateway przez jednego robota
      // opcjonalnie: log once / throttle
    }
  }
}
```

#### 5.3 Dodaj start/stop (lifecycle)
```js
async function start() {
  if (telemetryTimer) return;
  // connect providerów (best-effort)
  for (const entry of robots.values()) {
    try { if (entry.provider.connect) await entry.provider.connect(); }
    catch (e) { entry.provider.markError?.(e); }
  }
  const now = nowMs();
  refreshAll(now).catch(() => {});
  telemetryTimer = setInterval(() => {
    refreshAll(nowMs()).catch(() => {});
  }, telemetryPollMs);
}

async function stop() {
  if (telemetryTimer) clearInterval(telemetryTimer);
  telemetryTimer = null;
  for (const entry of robots.values()) {
    try { if (entry.provider.disconnect) await entry.provider.disconnect(); }
    catch (_e) {}
  }
}
```

#### 5.4 Uprość listRobots i getRobotStatus (bez refresh)
```diff
 async function listRobots() {
   const now = nowMs();
-  await Promise.all(Array.from(robots.values()).map((entry) => refreshRobot(entry, now)));
   return Array.from(robots.values()).map((entry) => buildRobotResponse(entry, now));
 }

 async function getRobotStatus(robotId) {
   const entry = robots.get(robotId);
   if (!entry) return null;
-  await refreshRobot(entry, nowMs());
   return { robotId, normalized: entry.normalized || null };
 }
```

#### 5.5 Zwróć start/stop w API
Na końcu `createGateway`:
```diff
 return {
   listRobots,
   getRobotStatus,
   sendCommand,
-  switchProvider
+  switchProvider,
+  start,
+  stop
 };
```

### 5.6 W `apps/fleet-gateway/server.js` uruchom lifecycle
W `startServer` po stworzeniu gateway:
```diff
 function startServer(config, options = {}) {
   const gateway = options.gateway || createGateway(config, options.deps || {});
+  gateway.start?.().catch((err) => console.warn(`gateway.start failed: ${err.message}`));
```

To wystarcza, żeby system przestał zależeć od “ktoś zrobił GET, więc provider się odświeżył”.

---

## 6) Elegancja serwerów HTTP: jeden “safe handler” (koniec przypadkowych unhandled errors)

W `apps/fleet-core/server.js` i `apps/fleet-gateway/server.js` macie `http.createServer(async (req,res)=>{ ... })` bez top-level try/catch.

Dodaj prosty wrapper (w tym samym pliku, bez nowych modułów):

```js
function safeHttp(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error('unhandled error', err);
      // fallback – zawsze JSON, żeby klient nie dostawał text/plain
      const body = JSON.stringify({ error: 'internal_error', message: err.message || String(err) });
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Access-Control-Allow-Origin': '*' });
      res.end(body);
    }
  };
}
```

I użyj:
```js
const server = http.createServer(safeHttp(async (req, res) => {
  // ...wasza logika routingu...
}));
```

To jest małe, ale ogromnie poprawia niezawodność.

---

## 7) UI (internalSim): mała poprawka dla debugowalności (zwracaj commandId)

UI jest dziś “backendem symulacji” (provider internalSim gateway-a w niego strzela).  
W `apps/fleet-ui/server.js` w `handleGatewayCommand` możecie zwracać `commandId`, żeby łatwiej korelować logi:

```diff
 async function handleGatewayCommand(req, res, robotId) {
@@
   const payload = await readJsonBody(req);
-  const command = payload?.command || null;
+  const command = payload?.command || null;
@@
-  sendJson(res, 200, { ok: true });
+  sendJson(res, 200, { ok: true, commandId: command?.commandId || null });
 }
```

Nie jest to wymagane do działania, ale bardzo pomaga w analizie problemów.

---

## 8) Dwie małe zmiany w konfiguracji, które od razu zwiększają niezawodność

### 8.1 Core local config: niech gada do gateway, nie do UI
`apps/fleet-core/configs/fleet-core.local.json5`:
```diff
 "gateway": {
-  "baseUrl": "http://127.0.0.1:8091"
+  "baseUrl": "http://127.0.0.1:8081"
 }
```

### 8.2 Gateway: telemetry polling i concurrency (żeby nie dławić providera)
`apps/fleet-gateway/configs/fleet-gateway.local.json5` dodaj:
```json5
{
  "telemetryPollMs": 250,
  "telemetryConcurrency": 8
}
```

---

## 9) (Opcjonalnie, ale “ładnie”): ErrorEnvelope jako jeden format błędu

Macie to opisane w `spec/99_pozostale.md`, ale kod zwraca różne “error: string”.

Najprostszy helper (wklej do core i gateway – może być w tym samym pliku co server):

```js
function errorEnvelope({ code, message, causeCode, details, requestId }) {
  return {
    error: {
      code: code || 'unknownError',
      message: message || 'Unknown error',
      causeCode: causeCode || 'UNKNOWN',
      details: details || undefined
    },
    request: { requestId: requestId || undefined }
  };
}
```

I zamiast `sendJson(res, 400, { error: 'invalid_json' })` rób:
```js
sendJson(res, 400, errorEnvelope({ code: 'validationError', message: 'Invalid JSON', causeCode: 'INVALID_JSON', requestId }));
```

To drastycznie upraszcza UI i debug.

---

## 10) Szybkie testy regresji (żeby refactor nie wprowadził cichych zmian)

Dodaj 2 proste testy (u Was są już testy e2e/unit w core i gateway):

1) **Core manual command propaguje `commandId` do gateway**  
   - mock gateway server odbiera request, sprawdza `command.commandId === commandId` zwrócone UI.

2) **Gateway listRobots nie robi refresh (po włączeniu telemetry loop)**  
   - provider mock liczy wywołania `getStatus(refresh=true)`,
   - `GET /robots` nie powinien zwiększać licznika poza background loop.

To są testy, które łapią największe “wpadki niezawodności”.

---

## TL;DR – najważniejsze “konkretne” zmiany w praktyce

1) **Core**: gateway_client zwraca `{ok,status,ack}` i używa keep‑alive + retry.  
2) **Core**: manual command dokleja `commandId` do payload i oddaje ACK do UI.  
3) **Core**: dispatcher/outbox = jedno miejsce na retry/backoff/idempotencję.  
4) **Gateway**: telemetry loop w tle + `listRobots` bez I/O.  
5) **Gateway**: http client keep‑alive + retry na network errors + jitter.  
6) **Wszędzie**: safe handler na top-level HTTP, żeby wyjątki nie robiły “dziwnych” efektów.

To zestaw, który zazwyczaj robi największą różnicę w niezawodności, a kod staje się jednocześnie prostszy i bardziej elegancki.
