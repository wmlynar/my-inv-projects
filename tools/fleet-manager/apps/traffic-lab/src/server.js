const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const express = require("express");
const net = require("net");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const { PORTS: RBK_PORTS } = require("@fleet-manager/adapters-robokit");
const { loadMapGraphLight } = require("@fleet-manager/core-graph");
const { TrafficStrategies } = require("@fleet-manager/core-mapf");
const { Algorithms } = require("@fleet-manager/sim-runtime");
const { createLocalFleetSim } = require("./local_fleet_sim");

const app = express();
const port = Number.parseInt(process.env.PORT || "3000", 10);
const appBindHost = process.env.BIND_HOST || process.env.HOST || "0.0.0.0";
const roboshopPort = Number.parseInt(process.env.ROBOSHOP_PORT || "8088", 10);
const roboshopBindHost = process.env.ROBOSHOP_BIND_HOST || "0.0.0.0";
const maxBodyLength = Number.parseInt(process.env.MAX_BODY_LENGTH || "10485760", 10);
const sceneUploadDir = process.env.SCENE_UPLOAD_DIR
  ? path.resolve(process.env.SCENE_UPLOAD_DIR)
  : null;
const sceneZipPath = process.env.SCENE_ZIP_PATH
  ? path.resolve(process.env.SCENE_ZIP_PATH)
  : null;
const scenesDir = process.env.FLEET_SCENES_DIR
  ? path.resolve(process.env.FLEET_SCENES_DIR)
  : path.join(__dirname, "..", "scenes");
const roboshopDataDir = process.env.ROBOSHOP_DATA_DIR
  ? path.resolve(process.env.ROBOSHOP_DATA_DIR)
  : path.join(scenesDir, "_roboshop");
const roboshopProfilesPath = process.env.ROBOSHOP_PROFILES_PATH
  ? path.resolve(process.env.ROBOSHOP_PROFILES_PATH)
  : path.join(roboshopDataDir, "profiles.json");
const roboshopCoreParamsPath = process.env.ROBOSHOP_CORE_PARAMS_PATH
  ? path.resolve(process.env.ROBOSHOP_CORE_PARAMS_PATH)
  : path.join(roboshopDataDir, "core_params.json");
const roboshopOrdersPath = process.env.ROBOSHOP_ORDERS_PATH
  ? path.resolve(process.env.ROBOSHOP_ORDERS_PATH)
  : path.join(roboshopDataDir, "orders.json");
const roboshopRobotsStatusPath = process.env.ROBOSHOP_ROBOTS_STATUS_PATH
  ? path.resolve(process.env.ROBOSHOP_ROBOTS_STATUS_PATH)
  : path.join(roboshopDataDir, "robots_status.json");
const simHttpHost = process.env.SIM_HTTP_HOST || "127.0.0.1";
const simHttpPort = Number.parseInt(process.env.SIM_HTTP_PORT || "18080", 10);
const simTimeoutMs = Number.parseInt(process.env.SIM_HTTP_TIMEOUT_MS || "4000", 10);
let fleetSimMode = String(process.env.FLEET_SIM_MODE || "local").toLowerCase();
const fleetSimModeMutable = parseBoolean(process.env.FLEET_SIM_MODE_MUTABLE, true);
const fleetSimModes = new Set(["local", "robokit"]);
const fleetSimTickMs = Number.parseInt(process.env.FLEET_SIM_TICK_MS || "140", 10);
const fleetSimFast = parseBoolean(
  process.env.FLEET_SIM_FAST || process.env.FLEET_SIM_MAX_SPEED,
  false
);
const fleetSimIgnoreTraffic = parseBoolean(
  process.env.FLEET_SIM_IGNORE_TRAFFIC,
  false
);
const fleetSimCollisionBlocking = parseBoolean(
  process.env.FLEET_SIM_COLLISION_BLOCKING,
  true
);
const fleetSimDiagDump = parseBoolean(process.env.FLEET_SIM_DIAG_DUMP, false);
const fleetSimDiagDumpDir = process.env.FLEET_SIM_DIAG_DUMP_DIR
  ? path.resolve(process.env.FLEET_SIM_DIAG_DUMP_DIR)
  : null;
const fleetSimDiagDumpLimit = Number.parseInt(
  process.env.FLEET_SIM_DIAG_DUMP_LIMIT || "",
  10
);
const fleetSimDiagDumpCooldownMs = Number.parseInt(
  process.env.FLEET_SIM_DIAG_DUMP_COOLDOWN_MS || "",
  10
);
const fleetSimDiagDumpHistoryLimit = Number.parseInt(
  process.env.FLEET_SIM_DIAG_DUMP_HISTORY_LIMIT || "",
  10
);
const fleetSimDiagDumpIncludeHistory = parseBoolean(
  process.env.FLEET_SIM_DIAG_DUMP_HISTORY,
  false
);
const fleetSimDiagDumpIncludeReservations = parseBoolean(
  process.env.FLEET_SIM_DIAG_DUMP_RESERVATIONS,
  true
);
const fleetSimDiagDumpIncludeObstacles = parseBoolean(
  process.env.FLEET_SIM_DIAG_DUMP_OBSTACLES,
  true
);
const fleetSimDiagDumpIncludeWaitGraph = parseBoolean(
  process.env.FLEET_SIM_DIAG_DUMP_WAIT_GRAPH,
  false
);
const fleetSimSpeedMultiplier = Number.parseFloat(
  process.env.FLEET_SIM_SPEED_MULTIPLIER || ""
);
const fleetSimActionWaitMs = Number.parseInt(
  process.env.FLEET_SIM_ACTION_WAIT_MS || "",
  10
);
const fleetCoreUrl = process.env.FLEET_CORE_URL || "http://127.0.0.1:7071";
const fleetCoreTimeoutMs = Number.parseInt(process.env.FLEET_CORE_TIMEOUT_MS || "4000", 10);
const fleetPollMs = Number.parseInt(process.env.FLEET_POLL_MS || "200", 10);
const fleetApiBase = "/api/fleet";
const scenesIndexPath = path.join(scenesDir, "scenes.json");
const activeSceneParam = process.env.FLEET_ACTIVE_SCENE_ID || null;

const sim = createHttpClient({
  host: simHttpHost,
  port: simHttpPort,
  timeoutMs: simTimeoutMs,
  maxBodyLength
});

let fleetCoreBase = null;
try {
  fleetCoreBase = new URL(fleetCoreUrl);
} catch (err) {
  console.warn(`Invalid FLEET_CORE_URL ${fleetCoreUrl}: ${err.message}`);
}

const localSim = createLocalFleetSim({
  tickMs: fleetSimTickMs,
  fastMode: fleetSimFast,
  ignoreTraffic: fleetSimIgnoreTraffic,
  collisionBlocking: fleetSimCollisionBlocking,
  diagnosticDump: fleetSimDiagDump,
  diagnosticDumpDir: fleetSimDiagDumpDir,
  diagnosticDumpLimit: Number.isFinite(fleetSimDiagDumpLimit)
    ? fleetSimDiagDumpLimit
    : undefined,
  diagnosticDumpCooldownMs: Number.isFinite(fleetSimDiagDumpCooldownMs)
    ? fleetSimDiagDumpCooldownMs
    : undefined,
  diagnosticDumpHistoryLimit: Number.isFinite(fleetSimDiagDumpHistoryLimit)
    ? fleetSimDiagDumpHistoryLimit
    : undefined,
  diagnosticDumpIncludeHistory: fleetSimDiagDumpIncludeHistory,
  diagnosticDumpIncludeReservations: fleetSimDiagDumpIncludeReservations,
  diagnosticDumpIncludeObstacles: fleetSimDiagDumpIncludeObstacles,
  diagnosticDumpIncludeWaitGraph: fleetSimDiagDumpIncludeWaitGraph,
  speedMultiplier: Number.isFinite(fleetSimSpeedMultiplier)
    ? fleetSimSpeedMultiplier
    : undefined,
  actionWaitMs: Number.isFinite(fleetSimActionWaitMs)
    ? fleetSimActionWaitMs
    : undefined
});
let localSimSceneKey = null;
const simStreamClients = new Set();
let simStreamTimer = null;
let simStreamInFlight = false;

function buildFleetCorePath(pathname) {
  if (!fleetCoreBase) return pathname;
  const basePath = fleetCoreBase.pathname.replace(/\/$/, "");
  if (!basePath || basePath === "/") {
    return pathname;
  }
  return `${basePath}${pathname}`;
}

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (Number.isFinite(value)) return value !== 0;
    return fallback;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  }
  return fallback;
}

function parseBooleanStrict(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (Number.isFinite(value)) return value !== 0;
    return null;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  }
  return null;
}

function normalizeFleetSimMode(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return null;
  if (fleetSimModes.has(normalized)) return normalized;
  return null;
}

function isLocalSimMode() {
  return fleetSimMode === "local";
}

function isRobokitSimMode() {
  return fleetSimMode === "robokit";
}

function buildAlgorithmCatalog() {
  const dispatchList = Algorithms?.listDispatchStrategies
    ? Algorithms.listDispatchStrategies()
    : Array.isArray(Algorithms?.DISPATCH_STRATEGIES)
      ? Algorithms.DISPATCH_STRATEGIES.slice()
      : [];
  const dispatchStrategies = dispatchList
    .map((entry) => ({
      name: entry?.name || entry?.value || null,
      label:
        DISPATCH_STRATEGY_LABELS[entry?.name] ||
        entry?.label ||
        entry?.name ||
        entry?.value ||
        null,
      category: entry?.category || null,
      dimensions: entry?.dimensions || null
    }))
    .filter((entry) => entry.name);

  const trafficList = TrafficStrategies?.list ? TrafficStrategies.list() : [];
  const trafficStrategies = trafficList
    .map((entry) => ({
      name: entry?.name || null,
      label: entry?.label || TRAFFIC_STRATEGY_LABELS[entry?.name] || entry?.name || null,
      capabilities: entry?.capabilities || null,
      categories: entry?.categories || null,
      dimensions: entry?.dimensions || null
    }))
    .filter((entry) => entry.name);

  return {
    dispatchStrategies,
    trafficStrategies,
    taxonomy: Algorithms?.ALGORITHM_TAXONOMY || null
  };
}

fleetSimMode = normalizeFleetSimMode(fleetSimMode) || "local";

function fleetCoreRequest(method, pathname, payload = null) {
  return new Promise((resolve, reject) => {
    if (!fleetCoreBase) {
      reject(new Error("fleet_core_unconfigured"));
      return;
    }
    const body = payload ? Buffer.from(JSON.stringify(payload), "utf8") : null;
    const headers = body
      ? {
          "Content-Type": "application/json",
          "Content-Length": body.length
        }
      : {};
    const transport = fleetCoreBase.protocol === "https:" ? https : http;
    const options = {
      protocol: fleetCoreBase.protocol,
      hostname: fleetCoreBase.hostname,
      port:
        fleetCoreBase.port ||
        (fleetCoreBase.protocol === "https:" ? 443 : 80),
      path: buildFleetCorePath(pathname),
      method,
      headers
    };
    const req = transport.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const contentType = res.headers["content-type"] || "";
        let parsed = buffer;
        if (contentType.includes("application/json")) {
          try {
            parsed = JSON.parse(buffer.toString("utf8"));
          } catch (_err) {
            parsed = null;
          }
        }
        resolve({
          statusCode: res.statusCode || 200,
          headers: res.headers,
          body: parsed
        });
      });
    });
    req.setTimeout(fleetCoreTimeoutMs, () => {
      req.destroy(new Error("fleet_core_timeout"));
    });
    req.on("error", reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

function createHttpClient({ host, port, timeoutMs = 4000, maxBodyLength = 10 * 1024 * 1024 }) {
  return {
    request({ method, path, headers = {}, body = null, responseType = "json" }) {
      return new Promise((resolve, reject) => {
        const req = http.request(
          {
            host,
            port,
            method,
            path,
            headers,
            timeout: timeoutMs
          },
          (res) => {
            const chunks = [];
            let total = 0;
            res.on("data", (chunk) => {
              total += chunk.length;
              if (total > maxBodyLength) {
                res.destroy();
                reject(new Error("response too large"));
                return;
              }
              chunks.push(chunk);
            });
            res.on("end", () => {
              const buffer = Buffer.concat(chunks);
              if (responseType === "buffer") {
                resolve({ statusCode: res.statusCode, headers: res.headers, body: buffer });
                return;
              }
              const text = buffer.toString("utf8");
              if (responseType === "text") {
                resolve({ statusCode: res.statusCode, headers: res.headers, body: text });
                return;
              }
              if (!text) {
                resolve({ statusCode: res.statusCode, headers: res.headers, body: null });
                return;
              }
              try {
                resolve({ statusCode: res.statusCode, headers: res.headers, body: JSON.parse(text) });
              } catch (err) {
                reject(err);
              }
            });
          }
        );
        req.on("error", reject);
        req.on("timeout", () => {
          req.destroy(new Error("request timeout"));
        });
        if (body) {
          req.write(body);
        }
        req.end();
      });
    }
  };
}

const publicDir = path.join(__dirname, "..", "public");
const defaultGraphPath = path.join(publicDir, "data", "graph.json");
const defaultWorkflowPath = path.join(publicDir, "data", "workflow.json5");
const defaultRobotsPath = path.join(publicDir, "data", "robots.json");
const defaultPackagingPath = path.join(publicDir, "data", "packaging.json");
const DISPATCH_STRATEGY_LABELS = {
  nearest: "Najblizszy robot",
  first: "Pierwszy dostepny"
};

const TRAFFIC_STRATEGY_LABELS = {
  simple: "Simple",
  "pulse-mapf": "Pulse MAPF",
  "pulse-mapf-avoid": "Pulse MAPF (avoid)",
  "pulse-mapf-time": "Pulse MAPF (time)",
  sipp: "SIPP (segmenty)",
  "sipp-kinodynamic": "SIPP (kinodynamic)",
  "sipp-robust": "SIPP (robust)",
  "sipp-deterministic": "SIPP (deterministic)",
  deterministic: "Deterministic (no time)",
  "ecbs-sipp": "ECBS+SIPP",
  "cbs-sipp": "CBS+SIPP",
  "cbs-full": "CBS full + SIPP",
  "mapf-global": "MAPF global",
  "mapf-pibt": "MAPF PIBT",
  "mapf-mstar": "MAPF M*",
  "mapf-smt": "MAPF SMT"
};

app.use(express.json({ limit: maxBodyLength }));

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonSafe(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_err) {
    return fallback;
  }
}

function writeJson(filePath, payload) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function storedPath(filePath) {
  const rel = path.relative(scenesDir, filePath);
  if (!rel.startsWith("..") && !path.isAbsolute(rel)) {
    return rel;
  }
  return filePath;
}

function resolveStoredPath(filePath) {
  if (!filePath) return null;
  return path.isAbsolute(filePath) ? filePath : path.join(scenesDir, filePath);
}

function md5File(filePath) {
  const hash = crypto.createHash("md5");
  const fd = fs.openSync(filePath, "r");
  const buffer = Buffer.alloc(1024 * 1024);
  try {
    let bytesRead = 0;
    do {
      bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead > 0) {
        hash.update(buffer.subarray(0, bytesRead));
      }
    } while (bytesRead > 0);
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest("hex");
}

function findSmapFiles(rootDir) {
  const results = [];
  const stack = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (_err) {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".smap")) {
        results.push(fullPath);
      }
    }
  }
  return results.sort();
}

function loadScenesState() {
  ensureDir(scenesDir);
  const state = readJsonSafe(scenesIndexPath, { activeSceneId: null, scenes: [] });
  if (!state || typeof state !== "object") {
    return { activeSceneId: null, scenes: [] };
  }
  if (!Array.isArray(state.scenes)) {
    state.scenes = [];
  }
  return state;
}

function saveScenesState(state) {
  writeJson(scenesIndexPath, state);
}

function ensureDefaultScene(state) {
  if (state.scenes.some((scene) => scene.id === "default")) {
    return state;
  }
  if (!fs.existsSync(defaultGraphPath)) {
    return state;
  }
  const graph = readJsonSafe(defaultGraphPath, {});
  const mapName = graph?.meta?.mapName || "default";
  const mapType = graph?.meta?.mapType || "";
  const mapVersion = graph?.meta?.version || "";
  const smapPath = graph?.meta?.source || null;
  const mapId = "map-1";
  const mapInfo = {
    id: mapId,
    name: mapName,
    fileName: smapPath ? path.basename(smapPath) : "graph.json",
    smapPath: smapPath || null,
    graphPath: storedPath(defaultGraphPath),
    meta: {
      mapName,
      mapType,
      version: mapVersion,
      md5: smapPath && fs.existsSync(smapPath) ? md5File(smapPath) : null
    }
  };
  const scene = {
    id: "default",
    name: mapName,
    createdAt: new Date(0).toISOString(),
    kind: "builtin",
    maps: [mapInfo],
    activeMapId: mapId,
    workflowPath: fs.existsSync(defaultWorkflowPath) ? storedPath(defaultWorkflowPath) : null,
    packagingPath: fs.existsSync(defaultPackagingPath) ? storedPath(defaultPackagingPath) : null
  };
  state.scenes.push(scene);
  if (!state.activeSceneId) {
    state.activeSceneId = scene.id;
  }
  saveScenesState(state);
  return state;
}

let scenesState = ensureDefaultScene(loadScenesState());
if (activeSceneParam) {
  const desired = scenesState.scenes.find((scene) => scene.id === activeSceneParam);
  if (desired) {
    scenesState.activeSceneId = activeSceneParam;
    saveScenesState(scenesState);
  } else {
    console.warn(`Active scene ${activeSceneParam} not found; using stored value.`);
  }
}

function getSceneById(sceneId) {
  return scenesState.scenes.find((scene) => scene.id === sceneId) || null;
}

function getActiveScene() {
  if (!scenesState.activeSceneId) {
    return null;
  }
  return getSceneById(scenesState.activeSceneId);
}

function getSceneMap(scene, mapId) {
  if (!scene || !Array.isArray(scene.maps)) {
    return null;
  }
  const resolvedId = mapId || scene.activeMapId;
  return scene.maps.find((map) => map.id === resolvedId) || scene.maps[0] || null;
}

function sceneSummary(scene) {
  return {
    id: scene.id,
    name: scene.name,
    createdAt: scene.createdAt,
    kind: scene.kind || "custom",
    activeMapId: scene.activeMapId || null,
    maps: (scene.maps || []).map((map) => ({
      id: map.id,
      name: map.name,
      fileName: map.fileName,
      meta: map.meta || {}
    }))
  };
}

function buildSceneGraph(scene, map) {
  if (!scene || !map) {
    return null;
  }
  const graphPath = resolveStoredPath(map.graphPath);
  if (!graphPath || !fs.existsSync(graphPath)) {
    return null;
  }
  return graphPath;
}

const workflowTemplate = readJsonSafe(defaultWorkflowPath, null);

function buildWorkflow(scene, map) {
  const sceneWorkflowPath = scene?.workflowPath ? resolveStoredPath(scene.workflowPath) : null;
  const sceneWorkflow = sceneWorkflowPath ? readJsonSafe(sceneWorkflowPath, null) : null;
  const template = sceneWorkflow || workflowTemplate;
  if (!template) {
    return null;
  }
  const workflow = JSON.parse(JSON.stringify(template));
  if (scene && map && workflow && workflow.map) {
    workflow.map.name = map.meta?.mapName || map.name || workflow.map.name;
    workflow.map.version = map.meta?.version || workflow.map.version;
    const smapPath = resolveStoredPath(map.smapPath);
    if (smapPath) {
      workflow.map.source = smapPath;
    }
  }
  return workflow;
}

function loadSceneBundle(sceneId = null, mapId = null) {
  const scene = sceneId ? getSceneById(sceneId) : getActiveScene();
  const map = getSceneMap(scene, mapId);
  const graphPath = buildSceneGraph(scene, map);
  const graph = graphPath && fs.existsSync(graphPath) ? readJsonSafe(graphPath, null) : readJsonSafe(defaultGraphPath, null);
  const workflow = buildWorkflow(scene, map) || readJsonSafe(defaultWorkflowPath, null);
  const robotsPath = scene?.robotsPath ? resolveStoredPath(scene.robotsPath) : null;
  const robotsConfig = robotsPath && fs.existsSync(robotsPath) ? readJsonSafe(robotsPath, null) : readJsonSafe(defaultRobotsPath, null);
  const packagingPath = scene?.packagingPath ? resolveStoredPath(scene.packagingPath) : null;
  const packaging = packagingPath && fs.existsSync(packagingPath) ? readJsonSafe(packagingPath, null) : readJsonSafe(defaultPackagingPath, null);
  return {
    graph,
    workflow,
    robotsConfig,
    packaging,
    sceneId: scene?.id || null,
    mapId: map?.id || null
  };
}

function ensureLocalSimBundle() {
  if (!localSim) return;
  const bundle = loadSceneBundle();
  const key = `${bundle.sceneId || "default"}:${bundle.mapId || "default"}`;
  if (key !== localSimSceneKey) {
    localSimSceneKey = key;
    localSim.loadBundle(bundle);
  }
}

function buildFleetConfig() {
  const simMode = normalizeFleetSimMode(fleetSimMode) || "local";
  return {
    simMode,
    apiBase: fleetApiBase,
    pollMs: fleetPollMs,
    simModeMutable: fleetSimModeMutable,
    simModes: Array.from(fleetSimModes),
    streamPath: `${fleetApiBase}/stream`,
    statePath: `${fleetApiBase}/state`,
    coreConfigured: simMode === "local" ? true : Boolean(fleetCoreBase)
  };
}

function setFleetSimMode(nextMode) {
  const normalized = normalizeFleetSimMode(nextMode);
  if (!normalized) {
    return { ok: false, statusCode: 400, error: "invalid_sim_mode" };
  }
  if (normalized === "robokit" && !fleetCoreBase) {
    return { ok: false, statusCode: 503, error: "fleet_core_unconfigured" };
  }
  fleetSimMode = normalized;
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    if (localSim && typeof localSim.start === "function") {
      localSim.start();
    }
  } else if (localSim && typeof localSim.stopSim === "function") {
    localSim.stopSim();
  }
  return { ok: true, simMode: fleetSimMode };
}

async function resolveFleetStatus(includeWorksites = true) {
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    return { statusCode: 200, payload: { ok: true, ...localSim.getStatus(includeWorksites) } };
  }
  if (!fleetCoreBase) {
    return { statusCode: 503, payload: { error: "fleet_core_unconfigured" } };
  }
  try {
    const statusPromise = fleetCoreRequest("GET", "/api/status");
    const worksitesPromise = includeWorksites
      ? fleetCoreRequest("GET", "/api/worksites")
      : Promise.resolve({ body: null });
    const [statusRes, worksitesRes] = await Promise.all([statusPromise, worksitesPromise]);
    const payload = statusRes && statusRes.body && typeof statusRes.body === "object" ? statusRes.body : {};
    const worksites =
      worksitesRes && worksitesRes.body && typeof worksitesRes.body === "object"
        ? worksitesRes.body.worksites || []
        : [];
    return {
      statusCode: 200,
      payload: {
        ok: true,
        tickMs: payload.tickMs,
        lastTickAt: payload.lastTickAt,
        lastError: payload.lastError,
        robots: payload.robots || [],
        tasks: payload.tasks || [],
        robotStatus: payload.robotStatus || null,
        worksites
      }
    };
  } catch (err) {
    return {
      statusCode: 502,
      payload: { error: "fleet_core_unavailable", message: err.message }
    };
  }
}

function writeSse(res, event, payload) {
  const data = payload === undefined ? "" : JSON.stringify(payload);
  if (event) {
    res.write(`event: ${event}\n`);
  }
  res.write(`data: ${data}\n\n`);
}

async function broadcastSimState() {
  if (!simStreamClients.size || simStreamInFlight) return;
  simStreamInFlight = true;
  try {
    const result = await resolveFleetStatus(true);
    if (!result || result.statusCode !== 200 || !result.payload || !result.payload.ok) {
      const errorPayload = result?.payload?.error
        ? { error: result.payload.error, message: result.payload.message || null }
        : { error: "fleet_state_unavailable" };
      simStreamClients.forEach((client) => {
        writeSse(client.res, "error", errorPayload);
      });
      return;
    }
    simStreamClients.forEach((client) => {
      writeSse(client.res, "state", result.payload);
    });
  } finally {
    simStreamInFlight = false;
  }
}

function startSimStreamTimer() {
  if (simStreamTimer) return;
  simStreamTimer = setInterval(() => {
    broadcastSimState().catch(() => {});
  }, Math.max(100, fleetPollMs));
}

function stopSimStreamTimer() {
  if (simStreamTimer) {
    clearInterval(simStreamTimer);
    simStreamTimer = null;
  }
}

function createSceneFromZip(buffer, nameHint = null) {
  if (!buffer || buffer.length === 0) {
    throw new Error("empty_scene_zip");
  }
  const sceneId = `scene-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const sceneDir = path.join(scenesDir, sceneId);
  const zipPath = path.join(sceneDir, "scene.zip");
  const extractDir = path.join(sceneDir, "extract");
  ensureDir(extractDir);
  fs.writeFileSync(zipPath, buffer);

  try {
    execFileSync("unzip", ["-o", zipPath, "-d", extractDir], { stdio: "ignore" });
  } catch (err) {
    throw new Error(`unzip_failed: ${err.message}`);
  }

  const smapFiles = findSmapFiles(extractDir);
  if (!smapFiles.length) {
    throw new Error("no_smap_found");
  }

  const maps = [];
  for (let index = 0; index < smapFiles.length; index += 1) {
    const smapPath = smapFiles[index];
    const mapId = `map-${index + 1}`;
    const graph = loadMapGraphLight(smapPath);
    const graphPath = path.join(sceneDir, "maps", mapId, "graph.json");
    ensureDir(path.dirname(graphPath));
    fs.writeFileSync(graphPath, `${JSON.stringify(graph, null, 2)}\n`);
    const mapName = graph?.meta?.mapName || path.basename(smapPath, ".smap");
    const mapType = graph?.meta?.mapType || "";
    const mapVersion = graph?.meta?.version || "";
    const mapInfo = {
      id: mapId,
      name: mapName,
      fileName: path.basename(smapPath),
      smapPath: storedPath(smapPath),
      graphPath: storedPath(graphPath),
      meta: {
        mapName,
        mapType,
        version: mapVersion,
        md5: md5File(smapPath)
      }
    };
    maps.push(mapInfo);
  }

  const scene = {
    id: sceneId,
    name: nameHint || maps[0].name || sceneId,
    createdAt: new Date().toISOString(),
    kind: "upload",
    zipPath: storedPath(zipPath),
    extractDir: storedPath(extractDir),
    maps,
    activeMapId: maps[0].id
  };

  scenesState.scenes.push(scene);
  scenesState.activeSceneId = sceneId;
  saveScenesState(scenesState);
  return scene;
}

app.get("/api/scenes", (_req, res) => {
  res.json({
    activeSceneId: scenesState.activeSceneId,
    scenes: scenesState.scenes.map(sceneSummary)
  });
});

app.get("/api/scenes/active", (_req, res) => {
  const scene = getActiveScene();
  if (!scene) {
    res.status(404).json({ error: "scene_not_found" });
    return;
  }
  res.json(sceneSummary(scene));
});

app.post("/api/scenes/activate", (req, res) => {
  const sceneId = req.body && req.body.sceneId;
  const mapId = req.body && req.body.mapId;
  if (!sceneId) {
    res.status(400).json({ error: "missing_scene_id" });
    return;
  }
  const scene = getSceneById(sceneId);
  if (!scene) {
    res.status(404).json({ error: "scene_not_found" });
    return;
  }
  if (mapId && !getSceneMap(scene, mapId)) {
    res.status(404).json({ error: "map_not_found" });
    return;
  }
  scene.activeMapId = mapId || scene.activeMapId;
  scenesState.activeSceneId = sceneId;
  saveScenesState(scenesState);
  res.json({ ok: true, activeSceneId: scenesState.activeSceneId, activeMapId: scene.activeMapId });
});

app.get(`${fleetApiBase}/config`, (_req, res) => {
  res.json(buildFleetConfig());
});

app.post(`${fleetApiBase}/config`, (req, res) => {
  if (!fleetSimModeMutable) {
    return sendJson(res, 403, { error: "sim_mode_locked" });
  }
  const payload = req.body && typeof req.body === "object" ? req.body : {};
  if (!Object.prototype.hasOwnProperty.call(payload, "simMode")) {
    return sendJson(res, 400, { error: "missing_sim_mode" });
  }
  const result = setFleetSimMode(payload.simMode);
  if (!result.ok) {
    return sendJson(res, result.statusCode || 400, { error: result.error || "invalid_sim_mode" });
  }
  return sendJson(res, 200, { ok: true, ...buildFleetConfig() });
});

app.get(`${fleetApiBase}/status`, async (req, res) => {
  const includeWorksites = String(req.query.worksites || "") !== "0";
  const result = await resolveFleetStatus(includeWorksites);
  return sendJson(res, result.statusCode || 200, result.payload || {});
});

app.get(`${fleetApiBase}/state`, async (req, res) => {
  const includeWorksites = String(req.query.worksites || "") !== "0";
  const result = await resolveFleetStatus(includeWorksites);
  return sendJson(res, result.statusCode || 200, result.payload || {});
});

app.get(`${fleetApiBase}/stream`, (req, res) => {
  if (!isLocalSimMode() && !fleetCoreBase) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });
  res.write("retry: 1000\n\n");
  const client = { res };
  simStreamClients.add(client);
  startSimStreamTimer();
  broadcastSimState().catch(() => {});
  req.on("close", () => {
    simStreamClients.delete(client);
    if (!simStreamClients.size) {
      stopSimStreamTimer();
    }
  });
});

app.post(`${fleetApiBase}/step`, (req, res) => {
  if (!isLocalSimMode()) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  ensureLocalSimBundle();
  const payload = req.body && typeof req.body === "object" ? req.body : {};
  const rawCount = Number.parseInt(payload.count ?? "1", 10);
  const count = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 1;
  const rawDelta = payload.deltaMs;
  const parsedDelta = Number.isFinite(rawDelta) ? Number(rawDelta) : Number.parseFloat(rawDelta);
  const deltaMs = Number.isFinite(parsedDelta) ? parsedDelta : undefined;
  if (payload.pause === true && typeof localSim.stopSim === "function") {
    localSim.stopSim();
  }
  const result = typeof localSim.step === "function"
    ? localSim.step({ count, deltaMs })
    : { ok: false, error: "step_unsupported" };
  if (!result.ok) {
    return sendJson(res, 400, { error: result.error || "step_failed" });
  }
  const includeState = payload.includeState !== false;
  const state = includeState ? localSim.getStatus(true) : null;
  return sendJson(res, 200, { ok: true, ...result, state });
});

app.get(`${fleetApiBase}/worksites`, async (_req, res) => {
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    return sendJson(res, 200, { worksites: localSim.getWorksites() });
  }
  if (!fleetCoreBase) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  try {
    const response = await fleetCoreRequest("GET", "/api/worksites");
    return sendJson(res, response.statusCode || 200, response.body || {});
  } catch (err) {
    return sendJson(res, 502, { error: "fleet_core_unavailable", message: err.message });
  }
});

app.post(`${fleetApiBase}/worksites/:id`, async (req, res) => {
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    const siteId = req.params.id;
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const updated = localSim.updateWorksite(siteId, payload);
    if (!updated) {
      return sendJson(res, 404, { error: "worksite_not_found" });
    }
    return sendJson(res, 200, {
      worksite: {
        id: siteId,
        filled: updated.occupancy === "filled",
        blocked: Boolean(updated.blocked)
      }
    });
  }
  if (!fleetCoreBase) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  try {
    const siteId = req.params.id;
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const response = await fleetCoreRequest(
      "POST",
      `/api/worksites/${encodeURIComponent(siteId)}`,
      payload
    );
    return sendJson(res, response.statusCode || 200, response.body || {});
  } catch (err) {
    return sendJson(res, 502, { error: "fleet_core_unavailable", message: err.message });
  }
});

app.get(`${fleetApiBase}/packaging`, (_req, res) => {
  if (!isLocalSimMode()) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  ensureLocalSimBundle();
  return sendJson(res, 200, localSim.getPackagingState());
});

app.post(`${fleetApiBase}/packaging/buffer`, (req, res) => {
  if (!isLocalSimMode()) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  ensureLocalSimBundle();
  const payload = req.body && typeof req.body === "object" ? req.body : {};
  const updated = localSim.updateBufferCell(payload.bufferId, payload.cellId, payload.updates || {});
  if (!updated) {
    return sendJson(res, 404, { error: "buffer_cell_not_found" });
  }
  return sendJson(res, 200, { cell: updated, state: localSim.getPackagingState() });
});

app.post(`${fleetApiBase}/packaging/line`, (req, res) => {
  if (!isLocalSimMode()) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  ensureLocalSimBundle();
  const payload = req.body && typeof req.body === "object" ? req.body : {};
  const updated = localSim.updateLineRequest(payload.lineId, payload.kind, payload.updates || {});
  if (!updated) {
    return sendJson(res, 404, { error: "line_not_found" });
  }
  return sendJson(res, 200, { line: updated, state: localSim.getPackagingState() });
});

app.post(`${fleetApiBase}/packaging/ops/buffer`, (req, res) => {
  if (!isLocalSimMode()) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  ensureLocalSimBundle();
  const payload = req.body && typeof req.body === "object" ? req.body : {};
  const updated = localSim.updateBufferOps(
    payload.bufferId,
    payload.goodsType,
    payload.level,
    payload.updates || {},
    payload.kind
  );
  if (!updated) {
    return sendJson(res, 400, { error: "invalid_ops_update" });
  }
  return sendJson(res, 200, { ops: updated });
});

app.post(`${fleetApiBase}/packaging/ops/place`, (req, res) => {
  if (!isLocalSimMode()) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  ensureLocalSimBundle();
  const payload = req.body && typeof req.body === "object" ? req.body : {};
  const updated = localSim.updatePlaceOps(
    payload.placeId,
    payload.goodsType,
    payload.updates || {},
    payload.kind
  );
  if (!updated) {
    return sendJson(res, 400, { error: "invalid_ops_update" });
  }
  return sendJson(res, 200, { ops: updated });
});

app.post(`${fleetApiBase}/faults/pick-problem`, (req, res) => {
  if (!isLocalSimMode()) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  ensureLocalSimBundle();
  const payload = req.body && typeof req.body === "object" ? req.body : {};
  const ok = localSim.simulatePickProblem(payload.robotId);
  return sendJson(res, 200, { ok });
});

app.post(`${fleetApiBase}/faults/pick-blocked`, (req, res) => {
  if (!isLocalSimMode()) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  ensureLocalSimBundle();
  const payload = req.body && typeof req.body === "object" ? req.body : {};
  const ok = localSim.simulatePickRobotBlocked(payload.robotId);
  return sendJson(res, 200, { ok });
});

app.post(`${fleetApiBase}/faults/drop-problem`, (req, res) => {
  if (!isLocalSimMode()) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  ensureLocalSimBundle();
  const payload = req.body && typeof req.body === "object" ? req.body : {};
  const ok = localSim.simulateDropProblem(payload.robotId);
  return sendJson(res, 200, { ok });
});

app.post(`${fleetApiBase}/faults/drive-problem`, (req, res) => {
  if (!isLocalSimMode()) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  ensureLocalSimBundle();
  const payload = req.body && typeof req.body === "object" ? req.body : {};
  const mode = payload.mode === "avoid" ? "avoid" : "block";
  const ok = localSim.simulateDriveProblem(payload.robotId, mode);
  return sendJson(res, 200, { ok });
});

app.post(`${fleetApiBase}/faults/clear-block`, (req, res) => {
  if (!isLocalSimMode()) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  ensureLocalSimBundle();
  const payload = req.body && typeof req.body === "object" ? req.body : {};
  const ok = localSim.clearRobotBlock(payload.robotId);
  return sendJson(res, 200, { ok });
});

app.post(`${fleetApiBase}/faults/clear-collision`, (req, res) => {
  if (!isLocalSimMode()) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  ensureLocalSimBundle();
  const payload = req.body && typeof req.body === "object" ? req.body : {};
  const ok = localSim.clearRobotCollision(payload.robotId);
  return sendJson(res, 200, { ok });
});

app.post(`${fleetApiBase}/robots/:id/dispatchable`, (req, res) => {
  if (!isLocalSimMode()) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  ensureLocalSimBundle();
  const robotId = req.params.id;
  const payload = req.body && typeof req.body === "object" ? req.body : {};
  if (!Object.prototype.hasOwnProperty.call(payload, "dispatchable")) {
    return sendJson(res, 400, { error: "missing_dispatchable" });
  }
  const parsed = parseBooleanStrict(payload.dispatchable);
  if (parsed === null) {
    return sendJson(res, 400, { error: "invalid_dispatchable" });
  }
  const updated = localSim.setRobotDispatchable(robotId, parsed);
  if (!updated) {
    return sendJson(res, 404, { error: "robot_not_found" });
  }
  return sendJson(res, 200, { ok: true, dispatchable: Boolean(updated.dispatchable) });
});

app.post(`${fleetApiBase}/robots/:id/control`, (req, res) => {
  if (!isLocalSimMode()) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  ensureLocalSimBundle();
  const robotId = req.params.id;
  const payload = req.body && typeof req.body === "object" ? req.body : {};
  if (!Object.prototype.hasOwnProperty.call(payload, "controlled")) {
    return sendJson(res, 400, { error: "missing_controlled" });
  }
  const parsed = parseBooleanStrict(payload.controlled);
  if (parsed === null) {
    return sendJson(res, 400, { error: "invalid_controlled" });
  }
  const updated = localSim.setRobotControlled(robotId, parsed);
  if (!updated) {
    return sendJson(res, 404, { error: "robot_not_found" });
  }
  return sendJson(res, 200, { ok: true, controlled: Boolean(updated.controlled) });
});

app.post(`${fleetApiBase}/robots/:id/manual`, async (req, res) => {
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    const robotId = req.params.id;
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    if (!Object.prototype.hasOwnProperty.call(payload, "enabled")) {
      return sendJson(res, 400, { error: "missing_enabled" });
    }
    const enabled = parseBooleanStrict(payload.enabled);
    if (enabled === null) {
      return sendJson(res, 400, { error: "invalid_enabled" });
    }
    const updated = localSim.setRobotManualMode(robotId, enabled);
    if (!updated) {
      return sendJson(res, 404, { error: "robot_not_found" });
    }
    return sendJson(res, 200, { ok: true, manualMode: Boolean(updated.manualMode) });
  }
  if (!fleetCoreBase) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  try {
    const robotId = req.params.id;
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const response = await fleetCoreRequest(
      "POST",
      `/api/robots/${encodeURIComponent(robotId)}/manual`,
      payload
    );
    return sendJson(res, response.statusCode || 200, response.body || {});
  } catch (err) {
    return sendJson(res, 502, { error: "fleet_core_unavailable", message: err.message });
  }
});

app.post(`${fleetApiBase}/robots/:id/go-target`, async (req, res) => {
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    const robotId = req.params.id;
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const targetId = payload.id || payload.targetId || payload.pointId;
    if (!targetId) {
      return sendJson(res, 400, { error: "missing_target" });
    }
    const ok = localSim.goTarget(robotId, targetId, payload.action);
    return sendJson(res, 200, { result: { ret_code: ok ? 0 : 1 } });
  }
  if (!fleetCoreBase) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  try {
    const robotId = req.params.id;
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const response = await fleetCoreRequest(
      "POST",
      `/api/robots/${encodeURIComponent(robotId)}/go-target`,
      payload
    );
    return sendJson(res, response.statusCode || 200, response.body || {});
  } catch (err) {
    return sendJson(res, 502, { error: "fleet_core_unavailable", message: err.message });
  }
});

app.post(`${fleetApiBase}/robots/:id/go-point`, async (req, res) => {
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    const robotId = req.params.id;
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const x = Number.parseFloat(payload.x);
    const y = Number.parseFloat(payload.y);
    const rawAngle = payload.angle;
    const parsedAngle = Number.isFinite(rawAngle) ? Number(rawAngle) : Number.parseFloat(rawAngle);
    const angle = Number.isFinite(parsedAngle) ? parsedAngle : undefined;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return sendJson(res, 400, { error: "missing_point" });
    }
    const ok = localSim.goPoint(robotId, x, y, angle);
    return sendJson(res, 200, { result: { ret_code: ok ? 0 : 1 } });
  }
  if (!fleetCoreBase) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  try {
    const robotId = req.params.id;
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const response = await fleetCoreRequest(
      "POST",
      `/api/robots/${encodeURIComponent(robotId)}/go-point`,
      payload
    );
    return sendJson(res, response.statusCode || 200, response.body || {});
  } catch (err) {
    return sendJson(res, 502, { error: "fleet_core_unavailable", message: err.message });
  }
});

app.post(`${fleetApiBase}/robots/:id/motion`, async (req, res) => {
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    const robotId = req.params.id;
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const ok = localSim.motion(robotId, payload);
    return sendJson(res, 200, { result: { ret_code: ok ? 0 : 1 } });
  }
  if (!fleetCoreBase) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  try {
    const robotId = req.params.id;
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const response = await fleetCoreRequest(
      "POST",
      `/api/robots/${encodeURIComponent(robotId)}/motion`,
      payload
    );
    return sendJson(res, response.statusCode || 200, response.body || {});
  } catch (err) {
    return sendJson(res, 502, { error: "fleet_core_unavailable", message: err.message });
  }
});

app.post(`${fleetApiBase}/robots/:id/translate`, async (req, res) => {
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    const robotId = req.params.id;
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const dist = Number.parseFloat(payload.dist);
    const vx = Number.parseFloat(payload.vx);
    const vy = Number.parseFloat(payload.vy);
    if (!Number.isFinite(dist)) {
      return sendJson(res, 400, { error: "missing_dist" });
    }
    const ok = localSim.translate(robotId, dist, vx, vy);
    return sendJson(res, 200, { result: { ret_code: ok ? 0 : 1 } });
  }
  if (!fleetCoreBase) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  try {
    const robotId = req.params.id;
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const response = await fleetCoreRequest(
      "POST",
      `/api/robots/${encodeURIComponent(robotId)}/translate`,
      payload
    );
    return sendJson(res, response.statusCode || 200, response.body || {});
  } catch (err) {
    return sendJson(res, 502, { error: "fleet_core_unavailable", message: err.message });
  }
});

app.post(`${fleetApiBase}/robots/:id/turn`, async (req, res) => {
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    const robotId = req.params.id;
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const angle = Number.parseFloat(payload.angle);
    if (!Number.isFinite(angle)) {
      return sendJson(res, 400, { error: "missing_turn" });
    }
    const ok = localSim.turn(robotId, angle);
    return sendJson(res, 200, { result: { ret_code: ok ? 0 : 1 } });
  }
  if (!fleetCoreBase) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  try {
    const robotId = req.params.id;
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const response = await fleetCoreRequest(
      "POST",
      `/api/robots/${encodeURIComponent(robotId)}/turn`,
      payload
    );
    return sendJson(res, response.statusCode || 200, response.body || {});
  } catch (err) {
    return sendJson(res, 502, { error: "fleet_core_unavailable", message: err.message });
  }
});

app.post(`${fleetApiBase}/robots/:id/pause`, async (req, res) => {
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    const robotId = req.params.id;
    const ok = localSim.pause(robotId);
    return sendJson(res, 200, { result: { ret_code: ok ? 0 : 1 } });
  }
  if (!fleetCoreBase) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  try {
    const robotId = req.params.id;
    const response = await fleetCoreRequest("POST", `/api/robots/${encodeURIComponent(robotId)}/pause`, {});
    return sendJson(res, response.statusCode || 200, response.body || {});
  } catch (err) {
    return sendJson(res, 502, { error: "fleet_core_unavailable", message: err.message });
  }
});

app.post(`${fleetApiBase}/robots/:id/resume`, async (req, res) => {
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    const robotId = req.params.id;
    const ok = localSim.resume(robotId);
    return sendJson(res, 200, { result: { ret_code: ok ? 0 : 1 } });
  }
  if (!fleetCoreBase) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  try {
    const robotId = req.params.id;
    const response = await fleetCoreRequest("POST", `/api/robots/${encodeURIComponent(robotId)}/resume`, {});
    return sendJson(res, response.statusCode || 200, response.body || {});
  } catch (err) {
    return sendJson(res, 502, { error: "fleet_core_unavailable", message: err.message });
  }
});

app.post(`${fleetApiBase}/robots/:id/cancel`, async (req, res) => {
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    const robotId = req.params.id;
    const ok = localSim.cancel(robotId);
    return sendJson(res, 200, { result: { ret_code: ok ? 0 : 1 } });
  }
  if (!fleetCoreBase) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  try {
    const robotId = req.params.id;
    const response = await fleetCoreRequest("POST", `/api/robots/${encodeURIComponent(robotId)}/cancel`, {});
    return sendJson(res, response.statusCode || 200, response.body || {});
  } catch (err) {
    return sendJson(res, 502, { error: "fleet_core_unavailable", message: err.message });
  }
});

app.post(`${fleetApiBase}/robots/:id/stop`, async (req, res) => {
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    const robotId = req.params.id;
    const ok = localSim.stop(robotId);
    return sendJson(res, 200, { result: { ret_code: ok ? 0 : 1 } });
  }
  if (!fleetCoreBase) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  try {
    const robotId = req.params.id;
    const response = await fleetCoreRequest("POST", `/api/robots/${encodeURIComponent(robotId)}/stop`, {});
    return sendJson(res, response.statusCode || 200, response.body || {});
  } catch (err) {
    return sendJson(res, 502, { error: "fleet_core_unavailable", message: err.message });
  }
});

const parseDiagnosticsOptions = (query = {}) => {
  const robotId = query.robotId || query.id || null;
  const includeReservations =
    String(query.reservations || "").toLowerCase() === "true" || query.reservations === "1";
  const includeRoute = String(query.route || "").toLowerCase() !== "0";
  const includeObstacles = String(query.obstacles || "").toLowerCase() !== "0";
  const includeHistory = parseBoolean(query.history || query.diagHistory, true);
  const includeSwitching = parseBoolean(query.switching || query.includeSwitching, false);
  const clearHistory = parseBoolean(query.historyClear || query.historyReset, false);
  const historyLimit = Number.parseInt(query.historyLimit || query.historyMax || "", 10);
  return {
    robotId,
    includeReservations,
    includeRoute,
    includeObstacles,
    includeHistory,
    includeSwitching,
    clearHistory,
    historyLimit
  };
};

app.get(`${fleetApiBase}/diagnostics`, (req, res) => {
  if (!isLocalSimMode()) {
    return sendJson(res, 503, { error: "fleet_core_unconfigured" });
  }
  ensureLocalSimBundle();
  const options = parseDiagnosticsOptions(req.query || {});
  const payload = localSim.getDiagnostics ? localSim.getDiagnostics(options) : null;
  if (!payload) {
    return sendJson(res, 404, { error: "diagnostics_unavailable" });
  }
  return sendJson(res, 200, { ok: true, ...payload });
});

app.get("/api/sim/diagnostics", (req, res) => {
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    const options = parseDiagnosticsOptions(req.query || {});
    const payload = localSim.getDiagnostics ? localSim.getDiagnostics(options) : null;
    if (!payload) {
      return sendJson(res, 404, { error: "diagnostics_unavailable" });
    }
    return sendJson(res, 200, { ok: true, ...payload });
  }
  return sendJson(res, 404, { error: "sim_diagnostics_unavailable" });
});

app.get("/api/sim/obstacles", async (_req, res) => {
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    const payload = localSim.listObstacles();
    return sendJson(res, 200, payload);
  }
  try {
    const response = await simRequest("GET", "/sim/obstacles");
    return sendJson(res, response.statusCode || 200, response.body || {});
  } catch (err) {
    return sendJson(res, 502, { error: "sim_unavailable", message: err.message });
  }
});

app.post("/api/sim/obstacles", async (req, res) => {
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const response = localSim.addSimObstacle(payload);
    return sendJson(res, response.ok ? 200 : 400, response);
  }
  try {
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const response = await simRequest("POST", "/sim/obstacles", payload);
    return sendJson(res, response.statusCode || 200, response.body || {});
  } catch (err) {
    return sendJson(res, 502, { error: "sim_unavailable", message: err.message });
  }
});

app.post("/api/sim/obstacles/clear", async (_req, res) => {
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    const response = localSim.clearObstacles();
    return sendJson(res, 200, response);
  }
  try {
    const response = await simRequest("POST", "/sim/obstacles/clear", {});
    return sendJson(res, response.statusCode || 200, response.body || {});
  } catch (err) {
    return sendJson(res, 502, { error: "sim_unavailable", message: err.message });
  }
});

app.post("/api/sim/obstacles/remove", async (req, res) => {
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const response = localSim.removeObstacleById(payload.id || payload.obstacleId);
    return sendJson(res, response.ok ? 200 : 400, response);
  }
  return sendJson(res, 404, { error: "sim_remove_unavailable" });
});

app.get("/api/algorithms/catalog", (_req, res) => {
  const catalog = buildAlgorithmCatalog();
  if (!catalog) {
    return sendJson(res, 500, { error: "algorithm_catalog_unavailable" });
  }
  return sendJson(res, 200, catalog);
});

app.get("/api/sim/settings", (_req, res) => {
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    const payload = localSim.getSimSettings();
    return sendJson(res, 200, payload);
  }
  return sendJson(res, 404, { error: "sim_settings_unavailable" });
});

app.post("/api/sim/settings", async (req, res) => {
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const response = localSim.updateSimSettings(payload);
    return sendJson(res, response.ok ? 200 : 400, response);
  }
  return sendJson(res, 404, { error: "sim_settings_unavailable" });
});

app.post("/api/sim/blocked", async (req, res) => {
  if (isLocalSimMode()) {
    ensureLocalSimBundle();
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const response = localSim.handleBlocked(payload);
    return sendJson(res, response.ok ? 200 : 400, response);
  }
  try {
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const response = await simRequest("POST", "/sim/blocked", payload);
    return sendJson(res, response.statusCode || 200, response.body || {});
  } catch (err) {
    return sendJson(res, 502, { error: "sim_unavailable", message: err.message });
  }
});

app.get("/data/graph.json", (req, res) => {
  const sceneId = req.query.scene;
  const mapId = req.query.map;
  const scene = sceneId ? getSceneById(sceneId) : getActiveScene();
  const map = getSceneMap(scene, mapId);
  const graphPath = buildSceneGraph(scene, map);
  if (graphPath && fs.existsSync(graphPath)) {
    res.sendFile(graphPath);
    return;
  }
  if (fs.existsSync(defaultGraphPath)) {
    res.sendFile(defaultGraphPath);
    return;
  }
  res.status(404).json({ error: "graph_not_found" });
});

app.get("/data/workflow.json5", (_req, res) => {
  const scene = getActiveScene();
  const map = getSceneMap(scene);
  const workflow = buildWorkflow(scene, map);
  if (workflow) {
    res.json(workflow);
    return;
  }
  if (fs.existsSync(defaultWorkflowPath)) {
    res.sendFile(defaultWorkflowPath);
    return;
  }
  res.status(404).json({ error: "workflow_not_found" });
});

app.get("/data/robots.json", (req, res) => {
  const sceneId = req.query.scene;
  const scene = sceneId ? getSceneById(sceneId) : getActiveScene();
  const robotsPath = scene?.robotsPath ? resolveStoredPath(scene.robotsPath) : null;
  if (robotsPath && fs.existsSync(robotsPath)) {
    res.sendFile(robotsPath);
    return;
  }
  if (fs.existsSync(defaultRobotsPath)) {
    res.sendFile(defaultRobotsPath);
    return;
  }
  res.status(404).json({ error: "robots_not_found" });
});

app.get("/data/packaging.json", (req, res) => {
  const sceneId = req.query.scene;
  const scene = sceneId ? getSceneById(sceneId) : getActiveScene();
  const packagingPath = scene?.packagingPath ? resolveStoredPath(scene.packagingPath) : null;
  if (packagingPath && fs.existsSync(packagingPath)) {
    res.sendFile(packagingPath);
    return;
  }
  if (fs.existsSync(defaultPackagingPath)) {
    res.sendFile(defaultPackagingPath);
    return;
  }
  res.status(404).json({ error: "packaging_not_found" });
});

app.use(express.static(publicDir));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(port, appBindHost, () => {
  console.log(`Fleet manager running at http://${appBindHost}:${port}`);
});

const roboshop = express();
roboshop.use(
  express.raw({
    type: "*/*",
    limit: maxBodyLength
  })
);

function sendJson(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

function sendText(res, statusCode, text, contentType = "application/json") {
  res.status(statusCode);
  res.set("Content-Type", contentType);
  res.send(text || "");
}

function parseJsonBody(req) {
  if (!req.body || !req.body.length) {
    return { ok: true, body: null };
  }
  const text = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body);
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch (err) {
    return { ok: false, error: "invalid_json", message: err.message };
  }
}

async function simRequest(method, path, payload = null) {
  const body = payload ? Buffer.from(JSON.stringify(payload), "utf8") : null;
  const headers = body
    ? {
        "Content-Type": "application/json",
        "Content-Length": body.length
      }
    : {};
  return sim.request({ method, path, headers, body, responseType: "json" });
}

function maybeSaveUpload(buffer) {
  if (!sceneUploadDir) {
    return null;
  }
  fs.mkdirSync(sceneUploadDir, { recursive: true });
  const fileName = `upload-scene-${Date.now()}.zip`;
  const filePath = path.join(sceneUploadDir, fileName);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

function readRoboshopStore(filePath, fallback) {
  return readJsonSafe(filePath, fallback);
}

function writeRoboshopStore(filePath, payload) {
  writeJson(filePath, payload);
}

roboshop.post("/getProfiles", async (req, res) => {
  const parsed = parseJsonBody(req);
  if (!parsed.ok) {
    return sendJson(res, 400, { error: parsed.error, message: parsed.message });
  }
  const body = parsed.body || {};
  const file = body.file || "properties.json";
  const store = readRoboshopStore(roboshopProfilesPath, {});
  const files = store && typeof store === "object" && store.files ? store.files : store;
  const payload = files && typeof files === "object" ? files[file] : null;
  if (!payload || typeof payload !== "object") {
    return sendJson(res, 200, {});
  }
  return sendJson(res, 200, payload);
});

roboshop.get("/robotsStatus", async (req, res) => {
  const devicesParam = req.query.devices || "";
  const devices = String(devicesParam)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const payload = readRoboshopStore(roboshopRobotsStatusPath, { ok: true, devices: [] });
  if (!payload || typeof payload !== "object") {
    return sendJson(res, 200, { ok: true, devices });
  }
  return sendJson(res, 200, payload);
});

roboshop.get("/downloadScene", async (_req, res) => {
  try {
    const activeScene = getActiveScene();
    const activeZipPath = activeScene ? resolveStoredPath(activeScene.zipPath) : null;
    if (activeZipPath && fs.existsSync(activeZipPath)) {
      const buffer = fs.readFileSync(activeZipPath);
      res.status(200).type("application/zip").send(buffer);
      return;
    }
    if (sceneZipPath && fs.existsSync(sceneZipPath)) {
      const buffer = fs.readFileSync(sceneZipPath);
      res.status(200).type("application/zip").send(buffer);
      return;
    }
    res.status(404).json({ error: "scene_not_found" });
  } catch (err) {
    res.status(500).json({ error: "proxy_failed", message: err.message });
  }
});

roboshop.post("/uploadScene", async (req, res) => {
  try {
    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const savedPath = maybeSaveUpload(buffer);
    let scene = null;
    let sceneError = null;
    try {
      const nameHint = req.query && req.query.name ? String(req.query.name) : null;
      scene = createSceneFromZip(buffer, nameHint);
    } catch (err) {
      sceneError = err;
    }

    const payload = {
      code: scene ? 0 : 40000,
      create_on: new Date().toISOString(),
      msg: scene ? "ok" : "upload_failed"
    };
    if (savedPath) {
      payload.saved_path = savedPath;
    }
    if (scene) {
      payload.scene_id = scene.id;
      payload.scene_name = scene.name;
      payload.active_scene_id = scenesState.activeSceneId;
    }
    if (sceneError) {
      payload.scene_error = sceneError.message;
    }
    const statusCode = scene ? 200 : 400;
    return sendJson(res, statusCode, payload);
  } catch (err) {
    return sendJson(res, 500, { error: "proxy_failed", message: err.message });
  }
});

roboshop.post("/getCoreParam", async (req, res) => {
  const parsed = parseJsonBody(req);
  if (!parsed.ok) {
    return sendJson(res, 400, { error: parsed.error, message: parsed.message });
  }
  const body = parsed.body || {};
  const paramKey = body.param || "";
  const store = readRoboshopStore(roboshopCoreParamsPath, { params: {} });
  const params = store && typeof store === "object" ? store.params || {} : {};
  const payload = paramKey && Object.prototype.hasOwnProperty.call(params, paramKey) ? params[paramKey] : {};
  return sendJson(res, 200, payload);
});

roboshop.post("/saveCoreParam", async (req, res) => {
  const parsed = parseJsonBody(req);
  if (!parsed.ok) {
    return sendJson(res, 400, { error: parsed.error, message: parsed.message });
  }
  const body = parsed.body || {};
  const paramKey = body.param || "default";
  const store = readRoboshopStore(roboshopCoreParamsPath, { params: {} });
  const params = store && typeof store === "object" ? store.params || {} : {};
  params[paramKey] = body;
  writeRoboshopStore(roboshopCoreParamsPath, {
    params,
    updatedAt: new Date().toISOString()
  });
  return sendText(res, 200, "ok", "text/plain");
});

roboshop.post("/setOrder", async (req, res) => {
  const parsed = parseJsonBody(req);
  if (!parsed.ok) {
    return sendJson(res, 400, { error: parsed.error, message: parsed.message });
  }
  const body = parsed.body || {};
  const store = readRoboshopStore(roboshopOrdersPath, { orders: [] });
  const orders = store && typeof store === "object" && Array.isArray(store.orders) ? store.orders : [];
  const order = {
    id: `order-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    createdAt: new Date().toISOString(),
    payload: body
  };
  orders.push(order);
  writeRoboshopStore(roboshopOrdersPath, { orders });
  return sendJson(res, 200, { ok: true, orderId: order.id });
});

roboshop.listen(roboshopPort, roboshopBindHost, () => {
  console.log(`Roboshop API listening on http://${roboshopBindHost}:${roboshopPort}`);
  console.log(`Scene upload dir: ${sceneUploadDir || "disabled"}`);
  console.log(`Scene zip: ${sceneZipPath || "none"}`);
  console.log(`Roboshop data dir: ${roboshopDataDir}`);
  console.log("Roboshop uses local file storage");
});

function parsePortList(value, fallback) {
  if (!value) {
    return Array.isArray(fallback) ? fallback : [];
  }
  return String(value)
    .split(",")
    .map((entry) => Number.parseInt(entry.trim(), 10))
    .filter(Number.isFinite);
}

function parsePortMap(value) {
  const map = new Map();
  if (!value) {
    return map;
  }
  const pairs = String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  for (const pair of pairs) {
    const [listenRaw, targetRaw] = pair.split(":");
    const listenPort = Number.parseInt(String(listenRaw || "").trim(), 10);
    const targetPort = Number.parseInt(String(targetRaw || "").trim(), 10);
    if (Number.isFinite(listenPort) && Number.isFinite(targetPort)) {
      map.set(listenPort, targetPort);
    }
  }
  return map;
}

function createTcpProxy({ listenPort, targetHost, targetPort, bindHost }) {
  const server = net.createServer((client) => {
    const upstream = net.connect({ host: targetHost, port: targetPort });
    client.setNoDelay(true);
    upstream.setNoDelay(true);

    client.pipe(upstream);
    upstream.pipe(client);

    const closeBoth = () => {
      if (!client.destroyed) client.destroy();
      if (!upstream.destroyed) upstream.destroy();
    };

    client.on("error", closeBoth);
    upstream.on("error", closeBoth);
    client.on("close", closeBoth);
    upstream.on("close", closeBoth);
  });

  server.on("error", (err) => {
    console.error(`[rbk-proxy:${listenPort}] listen error: ${err.message}`);
  });

  server.listen(listenPort, bindHost, () => {
    console.log(`[rbk-proxy:${listenPort}] ${bindHost}:${listenPort} -> ${targetHost}:${targetPort}`);
  });

  return server;
}

const rbkProxyEnabled = process.env.RBK_PROXY_ENABLED !== "false";
if (rbkProxyEnabled) {
  const rbkBindHost = process.env.RBK_BIND_HOST || roboshopBindHost || "0.0.0.0";
  const rbkTargetHost = process.env.RBK_TARGET_HOST || "127.0.0.1";
  const rbkPortOffset = Number.parseInt(process.env.RBK_PORT_OFFSET || "0", 10);
  const portMap = parsePortMap(process.env.RBK_PORT_MAP);
  const defaultPorts = Object.values(RBK_PORTS);
  const listenPorts = parsePortList(process.env.RBK_PORTS, defaultPorts);

  listenPorts.forEach((listenPort) => {
    const targetPort = portMap.get(listenPort) ?? listenPort + rbkPortOffset;
    createTcpProxy({
      listenPort,
      targetHost: rbkTargetHost,
      targetPort,
      bindHost: rbkBindHost
    });
  });
}
