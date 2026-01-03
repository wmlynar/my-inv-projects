"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const net = require("net");
const Modbus = require("jsmodbus");

const { APIClient } = require("./api-client");
const { loadRuntimeConfig } = require("./config");
const { createLogger } = require("./logger");

const BUILD_ID = (typeof __SEAL_BUILD_ID__ !== "undefined") ? __SEAL_BUILD_ID__ : "DEV";

function nowIso() {
  return new Date().toISOString();
}

function nowMs() {
  return Date.now();
}

function readVersion() {
  const versionPath = path.join(process.cwd(), "version.json");
  if (fs.existsSync(versionPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(versionPath, "utf-8"));
      if (raw && raw.version) return raw.version;
    } catch {
      // ignore
    }
  }
  const pkgPath = path.join(process.cwd(), "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      if (pkg && pkg.version) return pkg.version;
    } catch {
      // ignore
    }
  }
  return null;
}

const fallbackLogger = createLogger({ level: "info" });
let cfg;
let configPath;
let configHash;
try {
  const loaded = loadRuntimeConfig();
  cfg = loaded.cfg;
  configPath = loaded.configPath;
  configHash = loaded.configHash;
} catch (err) {
  const candidates = [];
  if (process.env.SEAL_RUNTIME_CONFIG) candidates.push(process.env.SEAL_RUNTIME_CONFIG);
  candidates.push(path.join(process.cwd(), "seal-out", "runtime", "config.runtime.json5"));
  candidates.push(path.join(process.cwd(), "config.runtime.json5"));
  const cfgPath = err && err.configPath
    ? err.configPath
    : (candidates.find((p) => fs.existsSync(p)) || candidates[0]);
  const ctx = { configPath: cfgPath };
  if (err && err.hint) ctx.hint = err.hint;
  const msg = err && err.message ? err.message : "Invalid runtime config";
  fallbackLogger.error("CFG_INVALID", msg, ctx, err);
  process.exit(2);
}

const APP_NAME = (typeof __SEAL_APP_NAME__ !== "undefined") ? __SEAL_APP_NAME__ : (cfg.appName || "modbus-sync-worksites");
const VERSION = readVersion();

const logger = createLogger({ level: cfg.log.level });

// RDS credentials and language are intentionally kept out of runtime config.
const RDS_USER = "admin";
const RDS_PASS = "123456";
const RDS_LANG = "pl";

const EMPTY = "EMPTY";
const FILLED = "FILLED";

const RDS_ERROR_LOG_THROTTLE_MS = cfg.rds.errorLogThrottleMs;
const ENABLE_RDS_FATAL_ON_ERRORS = cfg.rds.fatalOnErrors;
const RDS_MAX_CONSECUTIVE_ERRORS = cfg.rds.maxConsecutiveErrors;

const MODBUS_SOCKET_TIMEOUT_MS = cfg.modbus.socketTimeoutMs;
const MODBUS_REQUEST_TIMEOUT_MS = cfg.modbus.requestTimeoutMs;
const POLL_INTERVAL_MS = cfg.modbus.pollIntervalMs;
const RECONNECT_BACKOFF_MS = cfg.modbus.reconnectBackoffMs;
const ENABLE_MODBUS_FATAL_ON_ERRORS = cfg.modbus.fatalOnErrors;
const MODBUS_MAX_CONSECUTIVE_ERRORS = cfg.modbus.maxConsecutiveErrors;

const FILL_DEBOUNCE_MS = cfg.modbus.fillDebounceMs;
const SITES = cfg.sites;

const startedAt = Date.now();
let shuttingDown = false;
let httpServer = null;

const deps = {
  rds: { state: "degraded", lastOkAt: null, lastFailAt: null, msg: "not_checked" },
  modbus: { state: "degraded", lastOkAt: null, lastFailAt: null, msg: "not_checked" },
  modbusGroups: {},
};

function dlog(evt, msg, ctx) {
  logger.debug(evt, msg, ctx);
}

function markRdsOk() {
  deps.rds.state = "ok";
  deps.rds.lastOkAt = nowIso();
  deps.rds.msg = null;
}

function markRdsFail(msg) {
  deps.rds.state = "down";
  deps.rds.lastFailAt = nowIso();
  deps.rds.msg = msg;
}

function markModbusGroupOk(groupKey) {
  deps.modbusGroups[groupKey] = {
    state: "ok",
    lastOkAt: nowIso(),
    lastFailAt: deps.modbusGroups[groupKey]?.lastFailAt || null,
    msg: null,
  };
}

function markModbusGroupFail(groupKey, msg) {
  deps.modbusGroups[groupKey] = {
    state: "down",
    lastOkAt: deps.modbusGroups[groupKey]?.lastOkAt || null,
    lastFailAt: nowIso(),
    msg,
  };
}

function aggregateModbusStatus() {
  const groups = Object.values(deps.modbusGroups);
  if (!groups.length) {
    return { state: "degraded", lastOkAt: null, lastFailAt: null, msg: "no_groups" };
  }

  const downCount = groups.filter((g) => g.state !== "ok").length;
  const lastOkAt = groups.map((g) => g.lastOkAt).filter(Boolean).sort().slice(-1)[0] || null;
  const lastFailAt = groups.map((g) => g.lastFailAt).filter(Boolean).sort().slice(-1)[0] || null;

  if (downCount === 0) return { state: "ok", lastOkAt, lastFailAt, msg: null };
  if (downCount === groups.length) return { state: "down", lastOkAt, lastFailAt, msg: "all_groups_down" };
  return { state: "degraded", lastOkAt, lastFailAt, msg: "some_groups_down" };
}

function buildStatusPayload() {
  const modbusAgg = aggregateModbusStatus();
  deps.modbus = modbusAgg;

  return {
    standard: "SEAL_STANDARD",
    standardVersion: 1,
    appName: APP_NAME,
    version: VERSION,
    buildId: BUILD_ID,
    now: nowIso(),
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    node: process.version,
    pid: process.pid,
    configHash,
    deps: {
      rds: deps.rds,
      modbus: deps.modbus,
      modbusGroups: deps.modbusGroups,
    },
  };
}

function startStatusServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (req.method !== "GET") {
        res.statusCode = 405;
        res.end();
        return;
      }

      if (req.url === "/healthz") {
        res.statusCode = 200;
        res.setHeader("content-type", "text/plain");
        res.end("ok");
        return;
      }

      if (req.url === "/status") {
        const payload = buildStatusPayload();
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(payload));
        return;
      }

      res.statusCode = 404;
      res.end();
    });

    server.on("error", (err) => reject(err));

    server.listen(cfg.http.port, cfg.http.host, () => {
      logger.info("HTTP_LISTEN", "Status server listening", { host: cfg.http.host, port: cfg.http.port });
      resolve(server);
    });
  });
}

function defaultToBool(def) {
  return def === FILLED;
}

function updateDebouncedState(site, rawVal, now) {
  const siteId = site.siteId;
  const defaultVal = defaultToBool(site.default);
  const opposite = !defaultVal;

  let st = debounceStates.get(siteId);
  if (!st) {
    st = { lastOppositeStartTs: null, effectiveVal: defaultVal };
    debounceStates.set(siteId, st);
  }

  if (rawVal === defaultVal) {
    st.lastOppositeStartTs = null;
    st.effectiveVal = defaultVal;
  } else {
    if (st.lastOppositeStartTs === null) {
      st.lastOppositeStartTs = now;
      st.effectiveVal = defaultVal;
    } else if (now - st.lastOppositeStartTs >= FILL_DEBOUNCE_MS) {
      st.effectiveVal = opposite;
    }
  }

  return st.effectiveVal;
}

function resetDebounceForSites(sites) {
  for (const s of sites) {
    debounceStates.delete(s.siteId);
  }
}

function extractInputsFromResponse(resp) {
  if (!resp || !resp.response) return null;
  const body = resp.response.body || resp.response._body;
  if (!body) return null;
  if (Array.isArray(body.valuesAsArray)) return body.valuesAsArray;
  if (Array.isArray(body._valuesAsArray)) return body._valuesAsArray;
  return null;
}

function withTimeout(promise, timeoutMs, label) {
  let timer = null;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function groupSitesByConnection(sites) {
  const map = new Map();

  for (const s of sites) {
    const key = `${s.ip}:${s.port}:${s.slaveId}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        ip: s.ip,
        port: s.port,
        slaveId: s.slaveId,
        sites: [],
        minOffset: s.offset,
        maxOffset: s.offset,
      };
      map.set(key, g);
    }
    g.sites.push(s);
    if (s.offset < g.minOffset) g.minOffset = s.offset;
    if (s.offset > g.maxOffset) g.maxOffset = s.offset;
  }

  return Array.from(map.values()).map((g) => ({
    key: g.key,
    ip: g.ip,
    port: g.port,
    slaveId: g.slaveId,
    sites: g.sites,
    minOffset: g.minOffset,
    length: g.maxOffset - g.minOffset + 1,
  }));
}

const GROUPS = groupSitesByConnection(SITES);

const modbusConnections = new Map();
const modbusConsecutiveErrors = new Map();
const debounceStates = new Map();

function registerModbusError(groupKey) {
  const prev = modbusConsecutiveErrors.get(groupKey) || 0;
  const next = prev + 1;
  modbusConsecutiveErrors.set(groupKey, next);
  return next;
}

function resetModbusError(groupKey) {
  modbusConsecutiveErrors.set(groupKey, 0);
}

async function safeCloseConnection(groupKey) {
  const state = modbusConnections.get(groupKey);
  if (!state || !state.socket) return;

  const socket = state.socket;

  await new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      state.socket = null;
      state.client = null;
      state.lastAttemptMs = nowMs();
      dlog("MODBUS_CONN_CLOSE", "Connection closed", { groupKey });
      resolve();
    };

    try {
      socket.end(() => {
        finish();
      });
      setTimeout(finish, 200);
    } catch (_) {
      finish();
    }
  });
}

async function ensureConnectionForGroup(group) {
  let state = modbusConnections.get(group.key);
  const now = nowMs();

  if (!state) {
    state = { socket: null, client: null, lastAttemptMs: 0 };
    modbusConnections.set(group.key, state);
  }

  if (state.client && state.socket) {
    return { state, status: "ok" };
  }

  const sinceLast = now - state.lastAttemptMs;
  if (state.lastAttemptMs !== 0 && sinceLast < RECONNECT_BACKOFF_MS) {
    dlog("MODBUS_BACKOFF", "Reconnect backoff", { groupKey: group.key, sinceLastMs: sinceLast, backoffMs: RECONNECT_BACKOFF_MS });
    return { state, status: "backoff" };
  }

  state.lastAttemptMs = now;

  const socket = new net.Socket();
  socket.setTimeout(MODBUS_SOCKET_TIMEOUT_MS);

  socket.on("close", (hadError) => {
    dlog("MODBUS_SOCKET_CLOSE", "Socket closed", { groupKey: group.key, hadError });
  });

  const client = new Modbus.client.TCP(socket, group.slaveId);

  state.socket = socket;
  state.client = client;

  try {
    await new Promise((resolve, reject) => {
      const onConnect = () => {
        cleanup();
        dlog("MODBUS_CONNECT_OK", "Connected", { groupKey: group.key });
        resolve();
      };
      const onError = (err) => {
        cleanup();
        const msg = err && err.message ? err.message : err;
        reject(new Error(msg));
      };
      const onTimeout = () => {
        cleanup();
        dlog("MODBUS_CONNECT_TIMEOUT", "Socket timeout during connect", { groupKey: group.key });
        reject(new Error("Socket timeout during connect"));
        socket.destroy();
      };
      const cleanup = () => {
        socket.removeListener("connect", onConnect);
        socket.removeListener("error", onError);
        socket.removeListener("timeout", onTimeout);
      };

      socket.on("connect", onConnect);
      socket.on("error", onError);
      socket.on("timeout", onTimeout);

      socket.connect(group.port, group.ip);
    });

    return { state, status: "ok" };
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    await safeCloseConnection(group.key);
    return { state, status: "error", message: `connect failed: ${msg}` };
  }
}

async function readInputsForGroup(group) {
  const { state, status, message } = await ensureConnectionForGroup(group);

  if (status === "backoff") {
    return { status: "backoff" };
  }

  if (status === "error") {
    return { status: "error", message };
  }

  if (!state.client || !state.socket) {
    return { status: "error", message: "no active Modbus client/socket after ensureConnection" };
  }

  try {
    const startAddr = group.minOffset;
    const readLength = group.sites.length === 1 ? 1 : group.length;

    dlog("MODBUS_REQ", "readDiscreteInputs", { groupKey: group.key, startAddr, length: readLength });

    const resp = await withTimeout(
      state.client.readDiscreteInputs(startAddr, readLength),
      MODBUS_REQUEST_TIMEOUT_MS,
      "readDiscreteInputs"
    );

    const inputs = extractInputsFromResponse(resp);

    if (!inputs) {
      return { status: "error", message: "invalid readDiscreteInputs response format" };
    }

    dlog("MODBUS_RESP", "readDiscreteInputs ok", { groupKey: group.key, length: inputs.length });
    return { status: "ok", inputs };
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    await safeCloseConnection(group.key);
    return { status: "error", message: `readDiscreteInputs failed: ${msg}` };
  }
}

let rdsLastErrorTime = 0;
let rdsConsecutiveErrors = 0;

function logRdsError(message, err, ctx) {
  const now = nowMs();
  rdsConsecutiveErrors++;
  markRdsFail(message);

  if (rdsLastErrorTime === 0 || now - rdsLastErrorTime >= RDS_ERROR_LOG_THROTTLE_MS) {
    logger.error("RDS_CALL_FAIL", message, { ...ctx, consecutiveErrors: rdsConsecutiveErrors }, err);
    rdsLastErrorTime = now;
  } else {
    dlog("RDS_CALL_FAIL_SUPPRESSED", "Suppressed repeated RDS error", { message });
  }

  if (ENABLE_RDS_FATAL_ON_ERRORS && rdsConsecutiveErrors >= RDS_MAX_CONSECUTIVE_ERRORS) {
    fatalExit(
      "APP_FATAL",
      "Too many consecutive RDS errors",
      { consecutiveErrors: rdsConsecutiveErrors },
      new Error("Too many consecutive RDS errors")
    );
  }
}

async function writeWorksiteState(api, site, filledBool, context) {
  try {
    if (filledBool) await api.setWorkSiteFilled(site.siteId);
    else await api.setWorkSiteEmpty(site.siteId);

    rdsConsecutiveErrors = 0;
    markRdsOk();

    dlog("RDS_UPDATE_OK", "Worksite state updated", {
      siteId: site.siteId,
      state: filledBool ? "FILLED" : "EMPTY",
      context,
    });
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    logRdsError(`Failed to update worksite ${site.siteId} (${context}): ${msg}`, err, { siteId: site.siteId });
  }
}

async function setSitesDefault(api, sites, context) {
  for (const s of sites) {
    const assumeFilled = defaultToBool(s.default);
    const why = `set to default (${s.default}) because ${context}`;
    await writeWorksiteState(api, s, assumeFilled, why);
  }
}

async function syncOnce(api) {
  dlog("SYNC_START", "syncOnce start", { groups: GROUPS.length });

  if (!api.sessionId) {
    try {
      await api.login();
      markRdsOk();
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      logRdsError(`Initial login failed: ${msg}`, err, { stage: "login" });
    }
  }

  for (const group of GROUPS) {
    const { sites, minOffset } = group;

    const result = await readInputsForGroup(group);

    if (result.status === "backoff") {
      dlog("MODBUS_BACKOFF", "Skipping group due to backoff", { groupKey: group.key });
      continue;
    }

    if (result.status === "error") {
      const count = registerModbusError(group.key);
      const msg = `Modbus error for group ${group.key}: ${result.message}`;

      logger.error("MODBUS_READ_FAIL", msg, { groupKey: group.key, consecutiveErrors: count }, new Error(result.message));
      markModbusGroupFail(group.key, result.message);

      resetDebounceForSites(sites);
      await setSitesDefault(api, sites, `Modbus error for group ${group.key}: ${result.message}`);

      if (ENABLE_MODBUS_FATAL_ON_ERRORS && count >= MODBUS_MAX_CONSECUTIVE_ERRORS) {
        await closeAllModbusConnections();
        fatalExit(
          "APP_FATAL",
          "Too many consecutive Modbus errors",
          { groupKey: group.key, consecutiveErrors: count },
          new Error("Too many consecutive Modbus errors")
        );
      }

      continue;
    }

    resetModbusError(group.key);
    markModbusGroupOk(group.key);

    const inputs = result.inputs;
    if (!Array.isArray(inputs)) {
      const msg = `Inputs is not an array for group ${group.key}`;
      logger.error("MODBUS_INPUT_INVALID", msg, { groupKey: group.key }, new Error(msg));
      resetDebounceForSites(sites);
      await setSitesDefault(api, sites, "invalid inputs array from Modbus");
      continue;
    }

    for (const s of sites) {
      const idx = s.offset - minOffset;
      const rawVal = inputs[idx];

      if (typeof rawVal === "undefined") {
        const ctxMsg = `Missing Modbus input value (idx=${idx}) for site ${s.siteId}, offset=${s.offset}`;
        logger.error("MODBUS_INPUT_MISSING", ctxMsg, { siteId: s.siteId, groupKey: group.key, offset: s.offset, idx }, new Error(ctxMsg));
        resetDebounceForSites([s]);
        await setSitesDefault(api, [s], ctxMsg);
        continue;
      }

      const ts = nowMs();
      const effectiveBool = updateDebouncedState(s, !!rawVal, ts);

      dlog("DEBOUNCE", "Debounce state", {
        siteId: s.siteId,
        raw: !!rawVal,
        default: s.default,
        debounced: effectiveBool ? "FILLED" : "EMPTY",
      });

      await writeWorksiteState(api, s, effectiveBool, "based on debounced Modbus signal");
    }
  }

  dlog("SYNC_END", "syncOnce end");
}

async function closeAllModbusConnections() {
  const closes = [];
  for (const [key] of modbusConnections.entries()) {
    closes.push(safeCloseConnection(key));
  }
  await Promise.all(closes);
}

async function shutdown(code, reason, opts = {}) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (!opts.skipStopLog) {
    logger.info("APP_STOP", "Service stopping", { reason, code });
  }

  if (httpServer) {
    await new Promise((resolve) => httpServer.close(() => resolve()));
  }

  await closeAllModbusConnections();
  process.exit(code);
}

function fatalExit(evt, msg, ctx, err) {
  logger.fatal(evt, msg, ctx, err);
  shutdown(1, msg, { skipStopLog: true });
}

process.on("unhandledRejection", (err) => {
  fatalExit("APP_FATAL", "Unhandled rejection", { type: typeof err }, err);
});

process.on("uncaughtException", (err) => {
  fatalExit("APP_FATAL", "Uncaught exception", null, err);
});

process.on("SIGINT", () => {
  shutdown(0, "SIGINT");
});

process.on("SIGTERM", () => {
  shutdown(0, "SIGTERM");
});

async function mainLoop() {
  const api = new APIClient(cfg.rds.host, RDS_USER, RDS_PASS, RDS_LANG, {
    logger,
    requestTimeoutMs: cfg.rds.requestTimeoutMs,
  });

  httpServer = await startStatusServer();

  logger.info("APP_READY", "Service ready", {
    appName: APP_NAME,
    buildId: BUILD_ID,
    version: VERSION,
    pollIntervalMs: POLL_INTERVAL_MS,
    groups: GROUPS.length,
  });

  while (!shuttingDown) {
    const start = nowMs();

    try {
      await syncOnce(api);
    } catch (err) {
      logger.error("SYNC_FATAL", "Global error in syncOnce", null, err);
    }

    const elapsed = nowMs() - start;
    const wait = Math.max(POLL_INTERVAL_MS - elapsed, 0);
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
}

logger.info("APP_START", "Service starting", {
  appName: APP_NAME,
  buildId: BUILD_ID,
  version: VERSION,
  node: process.version,
  configPath,
});

mainLoop().catch((err) => {
  fatalExit("APP_FATAL", "Fatal error in mainLoop", null, err);
});
