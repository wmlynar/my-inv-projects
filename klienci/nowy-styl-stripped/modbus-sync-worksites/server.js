"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const net = require("net");
const crypto = require("crypto");
const Modbus = require("jsmodbus");
const md5 = require("md5");

const PROD_CONFIG = {
  appName: "modbus-sync-worksites",
  http: {
    host: "127.0.0.1",
    port: 3010
  },
  log: {
    level: "error"
  },
  rds: {
    host: "http://127.0.0.1:8080",
    requestTimeoutMs: 5000,
    errorLogThrottleMs: 5000,
    fatalOnErrors: true,
    maxConsecutiveErrors: 200
  },
  modbus: {
    socketTimeoutMs: 1000,
    requestTimeoutMs: 1000,
    pollIntervalMs: 500,
    reconnectBackoffMs: 5000,
    fillDebounceMs: 2000,
    fatalOnErrors: true,
    maxConsecutiveErrors: 100
  },
  sites: [
    { siteId: "PICK-01", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 0, default: "EMPTY" },
    { siteId: "PICK-02", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 1, default: "EMPTY" },
    { siteId: "PICK-03", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 2, default: "EMPTY" },
    { siteId: "PICK-04", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 3, default: "EMPTY" },
    { siteId: "PICK-05", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 4, default: "EMPTY" },
    { siteId: "PICK-06", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 5, default: "EMPTY" },
    { siteId: "PICK-07", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 6, default: "EMPTY" },
    { siteId: "PICK-08", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 7, default: "EMPTY" },
    { siteId: "PICK-09", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 8, default: "EMPTY" },
    { siteId: "PICK-10", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 9, default: "EMPTY" },
    { siteId: "PICK-11", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 10, default: "EMPTY" },
    { siteId: "PICK-12", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 11, default: "EMPTY" },
    { siteId: "PICK-13", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 12, default: "EMPTY" },
    { siteId: "PICK-14", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 13, default: "EMPTY" },
    { siteId: "PICK-15", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 14, default: "EMPTY" },
    { siteId: "PICK-16", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 15, default: "EMPTY" },
    { siteId: "PICK-51", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 0, default: "EMPTY" },
    { siteId: "PICK-52", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 1, default: "EMPTY" },
    { siteId: "PICK-53", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 2, default: "EMPTY" },
    { siteId: "PICK-54", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 3, default: "EMPTY" },
    { siteId: "PICK-55", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 4, default: "EMPTY" },
    { siteId: "PICK-56", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 5, default: "EMPTY" },
    { siteId: "PICK-57", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 6, default: "EMPTY" },
    { siteId: "PICK-58", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 7, default: "EMPTY" },
    { siteId: "PICK-59", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 8, default: "EMPTY" },
    { siteId: "PICK-60", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 9, default: "EMPTY" },
    { siteId: "PICK-61", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 10, default: "EMPTY" },
    { siteId: "PICK-62", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 11, default: "EMPTY" },
    { siteId: "PICK-63", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 12, default: "EMPTY" },
    { siteId: "PICK-64", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 13, default: "EMPTY" },
    { siteId: "PICK-65", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 14, default: "EMPTY" },
    { siteId: "PICK-66", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 15, default: "EMPTY" }
  ]
};

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  const keys = Object.keys(value).sort();
  const parts = keys.map((k) => {
    return JSON.stringify(k) + ":" + stableStringify(value[k]);
  });
  return "{" + parts.join(",") + "}";
}

function hashConfig(cfg) {
  const stable = stableStringify(cfg);
  const hash = crypto.createHash("sha256").update(stable).digest("hex");
  return `sha256:${hash}`;
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function validateConfig(cfg) {
  const errors = [];

  if (!isObject(cfg)) errors.push("config must be an object");

  if (!isObject(cfg.http)) errors.push("http must be an object");
  if (!cfg.http || typeof cfg.http.host !== "string") errors.push("http.host must be a string");
  if (!cfg.http || !Number.isFinite(cfg.http.port)) errors.push("http.port must be a number");

  if (!isObject(cfg.log)) errors.push("log must be an object");
  if (!cfg.log || typeof cfg.log.level !== "string") errors.push("log.level must be a string");

  if (!isObject(cfg.rds)) errors.push("rds must be an object");
  if (!cfg.rds || typeof cfg.rds.host !== "string") errors.push("rds.host must be a string");
  if (!cfg.rds || !Number.isFinite(cfg.rds.requestTimeoutMs)) errors.push("rds.requestTimeoutMs must be a number");
  if (!cfg.rds || !Number.isFinite(cfg.rds.errorLogThrottleMs)) errors.push("rds.errorLogThrottleMs must be a number");
  if (!cfg.rds || typeof cfg.rds.fatalOnErrors !== "boolean") errors.push("rds.fatalOnErrors must be a boolean");
  if (!cfg.rds || !Number.isInteger(cfg.rds.maxConsecutiveErrors)) errors.push("rds.maxConsecutiveErrors must be an integer");

  if (!isObject(cfg.modbus)) errors.push("modbus must be an object");
  if (!cfg.modbus || !Number.isFinite(cfg.modbus.socketTimeoutMs)) errors.push("modbus.socketTimeoutMs must be a number");
  if (!cfg.modbus || !Number.isFinite(cfg.modbus.requestTimeoutMs)) errors.push("modbus.requestTimeoutMs must be a number");
  if (!cfg.modbus || !Number.isFinite(cfg.modbus.pollIntervalMs)) errors.push("modbus.pollIntervalMs must be a number");
  if (!cfg.modbus || !Number.isFinite(cfg.modbus.reconnectBackoffMs)) errors.push("modbus.reconnectBackoffMs must be a number");
  if (!cfg.modbus || !Number.isFinite(cfg.modbus.fillDebounceMs)) errors.push("modbus.fillDebounceMs must be a number");
  if (!cfg.modbus || typeof cfg.modbus.fatalOnErrors !== "boolean") errors.push("modbus.fatalOnErrors must be a boolean");
  if (!cfg.modbus || !Number.isInteger(cfg.modbus.maxConsecutiveErrors)) errors.push("modbus.maxConsecutiveErrors must be an integer");

  if (!Array.isArray(cfg.sites)) errors.push("sites must be an array");

  if (Array.isArray(cfg.sites)) {
    const ids = new Set();
    for (const s of cfg.sites) {
      if (!isObject(s)) {
        errors.push("site must be an object");
        continue;
      }
      if (!s.siteId || typeof s.siteId !== "string") errors.push("site.siteId must be a string");
      if (s.siteId && ids.has(s.siteId)) errors.push(`duplicate siteId: ${s.siteId}`);
      if (s.siteId) ids.add(s.siteId);
      if (!s.ip || typeof s.ip !== "string") errors.push(`site.ip must be a string (${s.siteId || "unknown"})`);
      if (!Number.isFinite(s.port)) errors.push(`site.port must be a number (${s.siteId || "unknown"})`);
      if (!Number.isFinite(s.slaveId)) errors.push(`site.slaveId must be a number (${s.siteId || "unknown"})`);
      if (!Number.isInteger(s.offset) || s.offset < 0) errors.push(`site.offset must be a non-negative integer (${s.siteId || "unknown"})`);
      if (s.default !== "EMPTY" && s.default !== "FILLED") errors.push(`site.default must be EMPTY or FILLED (${s.siteId || "unknown"})`);
    }
  }

  return errors;
}

function loadRuntimeConfig() {
  const cfg = PROD_CONFIG;
  const errors = validateConfig(cfg);
  if (errors.length) {
    const err = new Error(`Invalid config: ${errors.join("; ")}`);
    err.code = "CONFIG_INVALID";
    err.details = errors;
    throw err;
  }

  const configHash = hashConfig(cfg);
  return { cfg, configPath: "inline:prod", configHash };
}

function nowIso() {
  return new Date().toISOString();
}

function nowMs() {
  return Date.now();
}

function normalizeError(err) {
  if (!err) return null;
  if (err instanceof Error) {
    const out = {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
    if (err.code) out.code = err.code;
    if (err.cause) out.cause = String(err.cause);
    return out;
  }
  return { name: "Error", message: String(err), stack: null };
}

function logError(evt, msg, ctx, err) {
  const entry = {
    ts: nowIso(),
    lvl: "error",
    evt,
  };
  if (msg) entry.msg = msg;
  if (ctx && typeof ctx === "object") entry.ctx = ctx;
  if (err) entry.err = normalizeError(err);
  console.error(JSON.stringify(entry));
}

function createLogger() {
  return { error: logError };
}

let rdsSessionId = null;
let RDS_REQUEST_TIMEOUT_MS = 5000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RDS_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err && err.name === "AbortError") {
      const e = new Error(`Request timeout after ${RDS_REQUEST_TIMEOUT_MS}ms`);
      e.code = "ETIMEDOUT";
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function encryptPassword(password) {
  return md5(password);
}

async function loginToRds() {
  const url = `${cfg.rds.host}/admin/login`;
  const requestData = {
    username: RDS_USER,
    password: encryptPassword(RDS_PASS),
  };
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestData),
  });

  if (!response.ok) {
    throw new Error(`Logowanie nie powiodło się: ${response.status}`);
  }

  const setCookieHeader = response.headers.get("set-cookie");
  const match = setCookieHeader && setCookieHeader.match(/JSESSIONID=([^;]+)/);
  rdsSessionId = match ? match[1] : null;
  if (!rdsSessionId) {
    throw new Error("Nie udało się pobrać JSESSIONID z ciasteczka.");
  }

  await response.json();
}

async function readJsonOrText(response) {
  const text = await response.text();
  try {
    const json = JSON.parse(text);
    return { json, text };
  } catch {
    return { json: null, text };
  }
}

async function apiCall(path, options = {}, allowRetry = true) {
  if (!rdsSessionId) {
    await loginToRds();
  }

  const doRequest = async () => {
    const headers = {
      "Content-Type": "application/json",
      Language: RDS_LANG,
      ...(options.headers || {}),
      Cookie: `JSESSIONID=${rdsSessionId}`,
    };
    const url = `${cfg.rds.host}${path}`;
    return fetchWithTimeout(url, { ...options, headers });
  };

  let response = await doRequest();
  let { json, text } = await readJsonOrText(response);

  const isInvalidSession = json && json.code === 9005;
  if (isInvalidSession && allowRetry) {
    rdsSessionId = null;
    await loginToRds();
    response = await doRequest();
    ({ json, text } = await readJsonOrText(response));
  }

  if (!response.ok) {
    throw new Error(`Błąd wywołania API: ${response.status}, body: ${text || "<empty>"}`);
  }

  if (json !== null) {
    return json;
  }

  if (text) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  return null;
}

async function getWorkSiteList() {
  const requestData = {};
  const responseJson = await apiCall("/api/work-sites/sites", {
    method: "POST",
    body: JSON.stringify(requestData),
  });
  const sites = Array.isArray(responseJson?.data) ? responseJson.data : [];
  return sites.map((site) => ({
    workSiteId: site.id,
    workSiteName: site.siteId,
    filled: site.filled === 1,
    locked: site.locked === 1,
    lockedBy: site.lockedBy || "",
    content: site.content || "",
    groupName: site.groupName || "",
    tags: site.tags || "",
    displayName: site.siteName || "",
  }));
}

async function setWorkSiteFilled(worksiteName) {
  return apiCall("/api/work-sites/worksiteFiled", {
    method: "POST",
    body: JSON.stringify({ workSiteIds: [worksiteName] }),
  });
}

async function setWorkSiteEmpty(worksiteName) {
  return apiCall("/api/work-sites/worksiteUnFiled", {
    method: "POST",
    body: JSON.stringify({ workSiteIds: [worksiteName] }),
  });
}

const BUILD_ID = readVersion() || "dev";

function readVersion() {
  const versionPath = path.join(process.cwd(), "version.json");
  if (fs.existsSync(versionPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(versionPath, "utf-8"));
      if (raw && raw.version) return raw.version;
    } catch {
    }
  }
  const pkgPath = path.join(process.cwd(), "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      if (pkg && pkg.version) return pkg.version;
    } catch {
    }
  }
  return null;
}

const fallbackLogger = createLogger();
let cfg;
let configPath;
let configHash;
try {
  const loaded = loadRuntimeConfig();
  cfg = loaded.cfg;
  configPath = loaded.configPath;
  configHash = loaded.configHash;
} catch (err) {
  const cfgPath = err && err.configPath ? err.configPath : "inline:prod";
  const ctx = { configPath: cfgPath };
  const msg = err && err.message ? err.message : "Invalid runtime config";
  fallbackLogger.error("CFG_INVALID", msg, ctx, err);
  process.exit(2);
}

const APP_NAME = cfg.appName || "modbus-sync-worksites";
const VERSION = readVersion();

const logger = createLogger();

const RDS_USER = "admin";
const RDS_PASS = "123456";
const RDS_LANG = "pl";

const EMPTY = "EMPTY";
const FILLED = "FILLED";

const RDS_ERROR_LOG_THROTTLE_MS = cfg.rds.errorLogThrottleMs;
const ENABLE_RDS_FATAL_ON_ERRORS = cfg.rds.fatalOnErrors;
const RDS_MAX_CONSECUTIVE_ERRORS = cfg.rds.maxConsecutiveErrors;
RDS_REQUEST_TIMEOUT_MS = cfg.rds.requestTimeoutMs;

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

    server.listen(cfg.http.port, cfg.http.host, () => resolve(server));
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
    return { state, status: "backoff" };
  }

  state.lastAttemptMs = now;

  const socket = new net.Socket();
  socket.setTimeout(MODBUS_SOCKET_TIMEOUT_MS);

  socket.on("close", (hadError) => {
  });

  const client = new Modbus.client.TCP(socket, group.slaveId);

  state.socket = socket;
  state.client = client;

  try {
    await new Promise((resolve, reject) => {
      const onConnect = () => {
        cleanup();
        resolve();
      };
      const onError = (err) => {
        cleanup();
        const msg = err && err.message ? err.message : err;
        reject(new Error(msg));
      };
      const onTimeout = () => {
        cleanup();
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


    const resp = await withTimeout(
      state.client.readDiscreteInputs(startAddr, readLength),
      MODBUS_REQUEST_TIMEOUT_MS,
      "readDiscreteInputs"
    );

    const inputs = extractInputsFromResponse(resp);

    if (!inputs) {
      return { status: "error", message: "invalid readDiscreteInputs response format" };
    }

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

  if (!rdsSessionId) {
    try {
      await loginToRds();
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


      await writeWorksiteState(api, s, effectiveBool, "based on debounced Modbus signal");
    }
  }

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

  if (httpServer) {
    await new Promise((resolve) => httpServer.close(() => resolve()));
  }

  await closeAllModbusConnections();
  process.exit(code);
}

function fatalExit(evt, msg, ctx, err) {
  logger.error(evt, msg, ctx, err);
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
  const api = { setWorkSiteFilled, setWorkSiteEmpty };

  httpServer = await startStatusServer();

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

mainLoop().catch((err) => {
  fatalExit("APP_FATAL", "Fatal error in mainLoop", null, err);
});
