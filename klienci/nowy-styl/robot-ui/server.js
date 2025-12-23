// server.js
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");
const JSON5 = require("json5");
const http = require("http");
const https = require("https");

const DEFAULT_CONFIG = {
  rds: {
    host: "http://127.0.0.1:8080",
    useMock: false,
    logApiCalls: false
  },
  robot: {
    id: "INV-CDD14-01"
  },
  fork: {
    lowHeight: 0.0,
    highHeight: 0.15
  },
  tasks: {
    manualDropLabel: "WT_DROP_MANUAL"
  },
  taskManager: {
    host: "http://127.0.0.1:3100",
    timeoutMs: 4000
  },
  motion: {
    speed: 0.3,
    durationMs: 500
  },
  http: {
    port: 3001
  }
};

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function str(value, fallback) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function bool(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeConfig(raw) {
  const cfg = isObject(raw) ? raw : {};
  const rds = isObject(cfg.rds) ? cfg.rds : {};
  const robot = isObject(cfg.robot) ? cfg.robot : {};
  const fork = isObject(cfg.fork) ? cfg.fork : {};
  const tasks = isObject(cfg.tasks) ? cfg.tasks : {};
  const taskManager = isObject(cfg.taskManager) ? cfg.taskManager : {};
  const motion = isObject(cfg.motion) ? cfg.motion : {};
  const http = isObject(cfg.http) ? cfg.http : {};

  return {
    rds: {
      host: str(rds.host, DEFAULT_CONFIG.rds.host),
      useMock: bool(rds.useMock, DEFAULT_CONFIG.rds.useMock),
      logApiCalls: bool(rds.logApiCalls, DEFAULT_CONFIG.rds.logApiCalls)
    },
    robot: {
      id: str(robot.id, DEFAULT_CONFIG.robot.id)
    },
    fork: {
      lowHeight: num(fork.lowHeight, DEFAULT_CONFIG.fork.lowHeight),
      highHeight: num(fork.highHeight, DEFAULT_CONFIG.fork.highHeight)
    },
    tasks: {
      manualDropLabel: str(tasks.manualDropLabel, DEFAULT_CONFIG.tasks.manualDropLabel)
    },
    taskManager: {
      host: str(taskManager.host, DEFAULT_CONFIG.taskManager.host),
      timeoutMs: num(taskManager.timeoutMs, DEFAULT_CONFIG.taskManager.timeoutMs)
    },
    motion: {
      speed: num(motion.speed, DEFAULT_CONFIG.motion.speed),
      durationMs: num(motion.durationMs, DEFAULT_CONFIG.motion.durationMs)
    },
    http: {
      port: num(http.port, DEFAULT_CONFIG.http.port)
    }
  };
}

function loadConfig() {
  const cfgPath = path.join(process.cwd(), "config.runtime.json5");
  if (!fs.existsSync(cfgPath)) {
    console.error(`[FATAL] Missing config.runtime.json5 in ${process.cwd()}.`);
    console.error("[FATAL] Copy config/<env>.json5 to config.runtime.json5 or deploy with SEAL.");
    process.exit(2);
  }
  let raw;
  try {
    raw = JSON5.parse(fs.readFileSync(cfgPath, "utf-8"));
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    console.error(`[FATAL] Invalid config.runtime.json5: ${msg}`);
    process.exit(2);
  }
  return normalizeConfig(raw);
}

const CFG = loadConfig();

function readBuildId() {
  if (typeof __SEAL_BUILD_ID__ !== "undefined") {
    return __SEAL_BUILD_ID__;
  }
  try {
    const raw = fs.readFileSync(path.join(__dirname, "version.json"), "utf-8");
    const data = JSON.parse(raw);
    return data.buildId || data.build_id || data.build || null;
  } catch {
    return null;
  }
}

const BUILD_ID = readBuildId();

const USE_MOCK_RDS = CFG.rds.useMock;
const LOG_API_CALLS = CFG.rds.logApiCalls;
const RDS_API_HOST = CFG.rds.host;
const RDS_LOGIN = "admin";
const RDS_PASSWORD = "123456";
const RDS_LANG = "pl";
// ROBOT_ID – vehicle_id / uuid z getRobotListRaw (np. "INV-CDD14-01")
const ROBOT_ID = CFG.robot.id;
const PORT = CFG.http.port;

// Wysokości wideł z konfiguracji
const FORK_LOW_HEIGHT = CFG.fork.lowHeight;
const FORK_HIGH_HEIGHT = CFG.fork.highHeight;

// Nazwa zadania ręcznego (odłożenie towaru)
const MANUAL_DROP_TASK_LABEL = CFG.tasks.manualDropLabel;
const TASK_MANAGER_HOST = CFG.taskManager.host;
const TASK_MANAGER_TIMEOUT_MS = CFG.taskManager.timeoutMs;
// TODO(CHECK_WITH_RDS): Ustal prawidłowe źródło pauzy zadania (order.state vs rbk.task_status)
// i potwierdź wartości w RDS; na razie używamy trybu "order_state".
const TASK_PAUSED_MODE = "order_state"; // order_state | rbk_task_status | auto
const TASK_PAUSED_RBK_STATUS = 3;
const TASK_PAUSED_ORDER_STATES = new Set(["paused", "pause", "suspended", "suspend"]);

// --- Konfiguracja sterowania ruchem (controlMotion) ---
// Użytkownik potwierdził: duration jest w ms.
// Zalecenie: duration=500ms, wysyłka co 250ms (to robimy w UI).
const MOTION_SPEED = Math.abs(CFG.motion.speed); // wartość dodatnia
const VX_FORWARD = -MOTION_SPEED; // u Ciebie "przód" to vx < 0
const VX_BACKWARD = MOTION_SPEED;
const MOTION_DURATION_MS = CFG.motion.durationMs; // ms

// real_steer w radianach: 0° = prosto, 45° = skos, 90° = bok
const STEER_STRAIGHT = 0.0;
const STEER_DIAG = Math.PI / 4; // 45°
const STEER_SIDE = Math.PI / 2; // 90°
let lastRealSteer = STEER_STRAIGHT; // keep last steering angle on stop

const SPEED_SCALE_DEFAULT = 1;
const SPEED_SCALE_MIN = 0.1;
const SPEED_SCALE_MAX = 1;

function readSpeedScale(req) {
  const raw = req && req.query ? req.query.speed : undefined;
  if (raw === undefined) return SPEED_SCALE_DEFAULT;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return SPEED_SCALE_DEFAULT;
  return Math.min(SPEED_SCALE_MAX, Math.max(SPEED_SCALE_MIN, value));
}

function logApiCall(label, payload = {}) {
  if (!LOG_API_CALLS) return;
  console.log(`[API] ${label}`, payload);
}

function taskManagerUrl(route) {
  const base = String(TASK_MANAGER_HOST || "").replace(/\/+$/, "");
  if (!base) return "";
  return `${base}${route}`;
}

function postWithTimeout(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (err) {
      reject(err);
      return;
    }

    const lib = parsed.protocol === "https:" ? https : http;
    const req = lib.request(
      {
        method: "POST",
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
        path: `${parsed.pathname}${parsed.search || ""}`,
        headers: {
          "Content-Length": 0
        }
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode || 0, body });
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("timeout"));
    });
    req.end();
  });
}

async function postTaskManagerAction(route, label, res) {
  if (USE_MOCK_RDS) {
    logApiCall(`MOCK taskManager ${label}`, { robotId: ROBOT_ID });
    return res.json({ ok: true, mock: true });
  }
  const url = taskManagerUrl(route);
  if (!url) {
    return res.status(503).json({ error: "Task manager host not configured" });
  }

  logApiCall(`TASK-MANAGER ${label}`, { robotId: ROBOT_ID, url });

  let respStatus = 0;
  let text = "";
  try {
    if (typeof fetch === "function" && typeof AbortController === "function") {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TASK_MANAGER_TIMEOUT_MS);
      const resp = await fetch(url, { method: "POST", signal: controller.signal });
      clearTimeout(timer);
      respStatus = resp.status;
      text = await resp.text();
    } else {
      const out = await postWithTimeout(url, TASK_MANAGER_TIMEOUT_MS);
      respStatus = out.status;
      text = out.body || "";
    }
  } catch (err) {
    console.error(`Błąd task manager (${label})`, err);
    return res.status(502).json({ error: "Task manager unreachable" });
  }

  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (respStatus < 200 || respStatus >= 300) {
    const msg = data && data.error ? data.error : (text || "Task manager error");
    return res.status(respStatus || 502).json({ error: msg });
  }

  return res.status(respStatus || 200).json(data);
}

console.log("Robot UI – konfiguracja:");
console.log("  USE_MOCK_RDS          =", USE_MOCK_RDS ? "1 (MOCK)" : "0 (RDS)");
console.log("  LOG_API_CALLS         =", LOG_API_CALLS ? "1" : "0");
console.log("  RDS_API_HOST          =", RDS_API_HOST);
console.log("  ROBOT_ID              =", ROBOT_ID);
console.log("  FORK_LOW_HEIGHT       =", FORK_LOW_HEIGHT);
console.log("  FORK_HIGH_HEIGHT      =", FORK_HIGH_HEIGHT);
console.log("  MANUAL_DROP_TASK_LABEL=", MANUAL_DROP_TASK_LABEL);
console.log("  TASK_MANAGER_HOST     =", TASK_MANAGER_HOST);
console.log("  TASK_MGR_TIMEOUT_MS   =", TASK_MANAGER_TIMEOUT_MS);
console.log("  MOTION_SPEED          =", MOTION_SPEED);
console.log("  MOTION_DURATION_MS    =", MOTION_DURATION_MS);

let rdsClient = null;
if (!USE_MOCK_RDS) {
  try {
    const { APIClient } = require("./api-client");
    rdsClient = new APIClient(RDS_API_HOST, RDS_LOGIN, RDS_PASSWORD, RDS_LANG);
    console.log("Robot UI: TRYB RDS (APIClient OK)");
  } catch (err) {
    console.error("Robot UI: błąd tworzenia APIClient, fallback na MOCK:", err);
  }
} else {
  console.log("Robot UI: TRYB MOCK (USE_MOCK_RDS=1)");
}

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/status", (req, res) => {
  res.json({ ok: true, buildId: BUILD_ID, ts: Date.now() });
});

let mockRobotListRaw = null;
let lastRobotState = null;
if (USE_MOCK_RDS) {
  try {
    mockRobotListRaw = require("./mock-robot-list.json");
    console.log("Robot UI: mock-robot-list.json załadowany");
  } catch (err) {
    console.warn("Robot UI: brak mock-robot-list.json lub błąd:", err);
  }
}

function findRobotReport(raw, robotId) {
  if (!raw || !raw.data || !Array.isArray(raw.data.report)) return null;
  return raw.data.report.find((r) => r.uuid === robotId || r.vehicle_id === robotId) || null;
}

function mapAlarms(alarmsObj) {
  const res = { fatals: [], errors: [], warnings: [], notices: [] };
  if (!alarmsObj) return res;
  for (const key of ["fatals", "errors", "warnings", "notices"]) {
    const arr = alarmsObj[key];
    if (!Array.isArray(arr)) continue;
    res[key] = arr.map((item) => {
      if (typeof item === "string") return item;
      if (item && item.desc) return item.desc;
      return JSON.stringify(item);
    });
  }
  return res;
}

function mapRobotReportToState(report, systemAlarmsRaw) {
  const rbk = report.rbk_report || {};
  const uds = report.undispatchable_reason || {};
  const basic = report.basic_info || {};
  const order = report.current_order || {};

  const dispatchableStatus =
    typeof uds.dispatchable_status === "number" ? uds.dispatchable_status : null; // 0/1/2 wg API
  const connectionStatus = report.connection_status; // 0/1

  const unlock = typeof uds.unlock === "number" ? uds.unlock : null;
  const controlledByRds = unlock === 0;

  const status = {
    error: !!report.is_error,
    emergency: !!rbk.emergency,
    blocked: !!rbk.blocked,
    paused: !!uds.suspended,
    lowBattery: !!uds.low_battery,
    unconfirmedReloc: !!uds.unconfirmed_reloc,
    disconnect: !!uds.disconnect,
    invalidMap: !!uds.current_map_invalid,
    softEmc: !!rbk.soft_emc,
    networkDelay: typeof rbk.network_delay === "number" ? rbk.network_delay : null,
    batteryCycle: typeof rbk.battery_cycle === "number" ? rbk.battery_cycle : null,
    loaded: !!report.isLoaded,
    confidence: typeof rbk.confidence === "number" ? rbk.confidence : null,
    batteryLevel: typeof rbk.battery_level === "number" ? rbk.battery_level : null,
    x: typeof rbk.x === "number" ? rbk.x : null,
    y: typeof rbk.y === "number" ? rbk.y : null,
    angleRad: typeof rbk.angle === "number" ? rbk.angle : null,
    forkHeight: rbk.fork && typeof rbk.fork.fork_height === "number" ? rbk.fork.fork_height : null,
    lastStation: rbk.last_station || "",
    currentStation: rbk.current_station || "",
    connectionStatus,
    dispatchableStatus,
    charging: !!rbk.charging,
    ip: basic.ip || "",
    brake: rbk.brake === undefined || rbk.brake === null ? null : !!rbk.brake,
    vx: typeof rbk.vx === "number" ? rbk.vx : null,
    vy: typeof rbk.vy === "number" ? rbk.vy : null,
    spin: typeof rbk.spin === "number" ? rbk.spin : null,
    steer: typeof rbk.steer === "number" ? rbk.steer : null,
    w: typeof rbk.w === "number" ? rbk.w : null
  };

  // 4 stany dispatch:
  //  - REAL_OFFLINE: connection_status = 0
  //  - DISPATCHABLE: connection_status = 1, dispatchable_status = 0
  //  - UNDISPATCHABLE_ONLINE:  connection_status = 1, dispatchable_status = 1
  //  - UNDISPATCHABLE_OFFLINE: connection_status = 1, dispatchable_status = 2
  let dispatchState = "UNKNOWN";
  if (connectionStatus === 0) {
    dispatchState = "REAL_OFFLINE";
  } else if (connectionStatus === 1) {
    if (dispatchableStatus === 0) dispatchState = "DISPATCHABLE";
    else if (dispatchableStatus === 1) dispatchState = "UNDISPATCHABLE_ONLINE";
    else if (dispatchableStatus === 2) dispatchState = "UNDISPATCHABLE_OFFLINE";
    else dispatchState = "UNKNOWN";
  }

  const keyRouteRaw = order.keyRoute;
  const keyRoute = Array.isArray(keyRouteRaw)
    ? keyRouteRaw
    : typeof keyRouteRaw === "string" && keyRouteRaw.trim()
      ? keyRouteRaw.split(/[,\s]+/).filter(Boolean)
      : [];

  const taskAlarms = mapAlarms(order);
  const alarms = mapAlarms(rbk.alarms || {});
  const systemAlarms = mapAlarms(systemAlarmsRaw || {});

  const isTaskPaused = () => {
    if (TASK_PAUSED_MODE === "rbk_task_status") {
      return rbk.task_status === TASK_PAUSED_RBK_STATUS;
    }
    if (TASK_PAUSED_MODE === "order_state") {
      const st = String(order.state || "").toLowerCase();
      return TASK_PAUSED_ORDER_STATES.has(st);
    }
    if (TASK_PAUSED_MODE === "auto") {
      if (typeof rbk.task_status === "number") {
        return rbk.task_status === TASK_PAUSED_RBK_STATUS;
      }
      const st = String(order.state || "").toLowerCase();
      return TASK_PAUSED_ORDER_STATES.has(st);
    }
    return false;
  };

  const task = {
    id: order.id || "",
    status: order.state || "",
    paused: isTaskPaused(),
    externalId: order.externalId || "",
    keyRoute,
    msg: order.msg || "",
    error: order.error || "",
    complete: typeof order.complete === "boolean" ? order.complete : order.complete == null ? null : !!order.complete,
    alarms: taskAlarms,
    priority: order.priority ?? null
  };

  const areaResources = report.area_resources_occupied || [];
  const finishedPath = report.finished_path || [];
  const unfinishedPath = report.unfinished_path || [];
  const rbkLock = rbk.lock_info || {};
  const reportLock = report.lock_info || {};

  return {
    name: report.uuid || report.vehicle_id || "UNKNOWN",
    dispatchState,
    task,
    control: {
      controlledByRds,
      rawUnlock: unlock
    },
    status,
    alarms,
    systemAlarms,

    basicInfo: {
      model: basic.model || "",
      version: basic.version || "",
      dspVersion: basic.dsp_version || "",
      controllerTemp: basic.controller_temp ?? null,
      controllerHumi: basic.controller_humi ?? null,
      controllerVoltage: basic.controller_voltage ?? null,
      ip: basic.ip || ""
    },
    orderDebug: {
      priority: order.priority ?? null,
      blocks: order.blocks || []
    },
    navDebug: {
      areaResources,
      finishedPath,
      unfinishedPath
    },
    exploDebug: {
      voltage: rbk.voltage ?? null,
      current: rbk.current ?? null,
      odo: rbk.odo ?? null,
      todayOdo: rbk.today_odo ?? null,
      totalTime: rbk.total_time ?? null,
      time: rbk.time ?? null
    },
    lockDebug: {
      reportLock,
      rbkLock
    }
  };
}

// ------------------ API: stan robota ------------------

app.get("/api/robot/state", async (req, res) => {
  try {
    let raw;
    let rdsOk = true;
    let rdsSource = "rds";

    if (USE_MOCK_RDS || !rdsClient) {
      if (!mockRobotListRaw) {
        return res.status(503).json({
          rdsOk: false,
          rdsSource: USE_MOCK_RDS ? "mock-missing" : "no-rds-client",
          error: "Brak mock-robot-list.json"
        });
      }
      logApiCall("MOCK /api/robot/state", { robotId: ROBOT_ID });
      raw = mockRobotListRaw;
      rdsOk = USE_MOCK_RDS ? true : false;
      rdsSource = USE_MOCK_RDS ? "mock" : "no-rds-client";
    } else {
      logApiCall("RDS getRobotListRaw (state)", { robotId: ROBOT_ID });
      raw = await rdsClient.getRobotListRaw();
    }

    const data = raw && raw.data ? raw.data : {};
    const report = findRobotReport(raw, ROBOT_ID);
    if (!report) {
      return res.status(404).json({
        error: "Nie znaleziono robota",
        robotId: ROBOT_ID,
        rdsOk,
        rdsSource
      });
    }

    const state = mapRobotReportToState(report, data.alarms);
    state.rdsOk = rdsOk;
    state.rdsSource = rdsSource;

    state.createOn = data.create_on || null;
    state.disablePaths = data.disable_paths || [];
    state.disablePoints = data.disable_points || [];
    state.dynamicObstacle = data.dynamic_obstacle || {};
    state.topMsg = data.msg || "";
    state.topCode = data.code ?? null;
    state.topIsError = data.is_error ?? null;

    lastRobotState = state;
    return res.json(state);
  } catch (err) {
    console.error("Błąd /api/robot/state:", err);
    if (lastRobotState) {
      return res.json({
        ...lastRobotState,
        rdsOk: false,
        rdsSource: "rds-error",
        stale: true
      });
    }
    return res.status(503).json({ rdsOk: false, rdsSource: "rds-error", error: "RDS error" });
  }
});

app.get("/api/robot/raw", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      if (!mockRobotListRaw) return res.status(500).json({ error: "Brak mock-robot-list.json" });
      logApiCall("MOCK /api/robot/raw", { robotId: ROBOT_ID });
      return res.json(mockRobotListRaw);
    }

    logApiCall("RDS getRobotListRaw (raw)", { robotId: ROBOT_ID });
    const raw = await rdsClient.getRobotListRaw();
    return res.json(raw);
  } catch (err) {
    console.error("Błąd /api/robot/raw:", err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// ------------------ MOCK helpers ------------------

function updateDispatchMock(mode) {
  if (!mockRobotListRaw || !mockRobotListRaw.data || !Array.isArray(mockRobotListRaw.data.report)) return;
  const r = findRobotReport(mockRobotListRaw, ROBOT_ID);
  if (!r) return;
  if (!r.undispatchable_reason) r.undispatchable_reason = {};

  if (mode === "DISPATCHABLE") {
    r.connection_status = 1;
    r.undispatchable_reason.dispatchable_status = 0;
    r.dispatchable = true;
  } else if (mode === "UNDISPATCHABLE_ONLINE") {
    r.connection_status = 1;
    r.undispatchable_reason.dispatchable_status = 1;
    r.dispatchable = false;
  } else if (mode === "UNDISPATCHABLE_OFFLINE") {
    r.connection_status = 1;
    r.undispatchable_reason.dispatchable_status = 2;
    r.dispatchable = false;
  }
}

function clearErrorsMock() {
  if (!mockRobotListRaw || !mockRobotListRaw.data || !Array.isArray(mockRobotListRaw.data.report)) return;
  const r = findRobotReport(mockRobotListRaw, ROBOT_ID);
  if (!r || !r.rbk_report) return;
  if (!r.rbk_report.alarms) {
    r.rbk_report.alarms = { fatals: [], errors: [], warnings: [], notices: [] };
  } else {
    r.rbk_report.alarms.fatals = [];
    r.rbk_report.alarms.errors = [];
    r.rbk_report.alarms.warnings = [];
    r.rbk_report.alarms.notices = [];
  }
}

function setForkHeightMock(height) {
  if (!mockRobotListRaw || !mockRobotListRaw.data || !Array.isArray(mockRobotListRaw.data.report)) return;
  const r = findRobotReport(mockRobotListRaw, ROBOT_ID);
  if (!r) return;
  if (!r.rbk_report) r.rbk_report = {};
  if (!r.rbk_report.fork) r.rbk_report.fork = {};
  r.rbk_report.fork.fork_height = height;
}

function setSoftEmcMock(value) {
  if (!mockRobotListRaw || !mockRobotListRaw.data || !Array.isArray(mockRobotListRaw.data.report)) return;
  const r = findRobotReport(mockRobotListRaw, ROBOT_ID);
  if (!r) return;
  if (!r.rbk_report) r.rbk_report = {};
  r.rbk_report.soft_emc = !!value;
}

// ------------------ API: dispatchable ------------------

app.post("/api/robot/dispatchable", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      logApiCall("MOCK robotSetDispatchable", { robotId: ROBOT_ID });
      updateDispatchMock("DISPATCHABLE");
      return res.json({ ok: true, mock: true });
    }
    logApiCall("RDS robotSetDispatchable", { robotId: ROBOT_ID });
    await rdsClient.robotSetDispatchable(ROBOT_ID);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Błąd /api/robot/dispatchable:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

app.post("/api/robot/undispatchable-online", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      logApiCall("MOCK robotSetUndispatchableOnline", { robotId: ROBOT_ID });
      updateDispatchMock("UNDISPATCHABLE_ONLINE");
      return res.json({ ok: true, mock: true });
    }
    logApiCall("RDS robotSetUndispatchableOnline", { robotId: ROBOT_ID });
    await rdsClient.robotSetUndispatchableOnline(ROBOT_ID);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Błąd /api/robot/undispatchable-online:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

app.post("/api/robot/undispatchable-offline", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      logApiCall("MOCK robotSetUndispatchableOffline", { robotId: ROBOT_ID });
      updateDispatchMock("UNDISPATCHABLE_OFFLINE");
      return res.json({ ok: true, mock: true });
    }
    logApiCall("RDS robotSetUndispatchableOffline", { robotId: ROBOT_ID });
    await rdsClient.robotSetUndispatchableOffline(ROBOT_ID);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Błąd /api/robot/undispatchable-offline:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

// ------------------ API: PAUSE / RESUME ------------------

app.post("/api/robot/pause", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      logApiCall("MOCK robotPause", { robotId: ROBOT_ID });
      return res.json({ ok: true, mock: true });
    }
    logApiCall("RDS robotPause", { robotId: ROBOT_ID });
    await rdsClient.robotPause(ROBOT_ID);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Błąd /api/robot/pause:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

app.post("/api/robot/resume", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      logApiCall("MOCK robotResume", { robotId: ROBOT_ID });
      return res.json({ ok: true, mock: true });
    }
    logApiCall("RDS robotResume", { robotId: ROBOT_ID });
    await rdsClient.robotResume(ROBOT_ID);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Błąd /api/robot/resume:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

// ------------------ API: CONTROL MOTION (real_steer, duration w ms) ------------------

async function sendControlMotion({ vx, real_steer, duration }) {
  if (typeof real_steer === "number") {
    lastRealSteer = real_steer;
  }
  const payload = {
    vehicle: ROBOT_ID,
    vx: vx ?? 0.0,
    vy: 0.0,
    w: 0.0, // NIE używamy w w tym robocie
    real_steer: real_steer ?? 0.0,
    steer: 0.0,
    duration: duration ?? MOTION_DURATION_MS
  };

  if (USE_MOCK_RDS || !rdsClient) {
    logApiCall("MOCK controlMotion", payload);
    return { ok: true, mock: true };
  }

  logApiCall("RDS controlMotion", payload);

  const result = await rdsClient.controlMotion(ROBOT_ID, payload);
  return { ok: true, result };
}

// STOP (0ms) – wywoływany przy puszczeniu przycisku
app.post("/api/robot/move-stop", async (req, res) => {
  try {
    const out = await sendControlMotion({
      vx: 0.0,
      real_steer: lastRealSteer,
      duration: 0.0
    });
    return res.json(out);
  } catch (err) {
    console.error("Błąd /api/robot/move-stop:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

// Przód / Tył
app.post("/api/robot/move-forward", async (req, res) => {
  try {
    const speedScale = readSpeedScale(req);
    const out = await sendControlMotion({
      vx: VX_FORWARD * speedScale,
      real_steer: STEER_STRAIGHT,
      duration: MOTION_DURATION_MS
    });
    return res.json(out);
  } catch (err) {
    console.error("Błąd /api/robot/move-forward:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

app.post("/api/robot/move-backward", async (req, res) => {
  try {
    const speedScale = readSpeedScale(req);
    const out = await sendControlMotion({
      vx: VX_BACKWARD * speedScale,
      real_steer: STEER_STRAIGHT,
      duration: MOTION_DURATION_MS
    });
    return res.json(out);
  } catch (err) {
    console.error("Błąd /api/robot/move-backward:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

// Lewo / Prawo (90°)
app.post("/api/robot/move-left", async (req, res) => {
  try {
    const speedScale = readSpeedScale(req);
    const out = await sendControlMotion({
      vx: VX_FORWARD * speedScale,
      real_steer: +STEER_SIDE,
      duration: MOTION_DURATION_MS
    });
    return res.json(out);
  } catch (err) {
    console.error("Błąd /api/robot/move-left:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

app.post("/api/robot/move-right", async (req, res) => {
  try {
    const speedScale = readSpeedScale(req);
    const out = await sendControlMotion({
      vx: VX_BACKWARD * speedScale,
      real_steer: +STEER_SIDE,
      duration: MOTION_DURATION_MS
    });
    return res.json(out);
  } catch (err) {
    console.error("Błąd /api/robot/move-right:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

// Przód-lewo / przód-prawo (45°)
app.post("/api/robot/move-forward-left", async (req, res) => {
  try {
    const speedScale = readSpeedScale(req);
    const out = await sendControlMotion({
      vx: VX_FORWARD * speedScale,
      real_steer: +STEER_DIAG,
      duration: MOTION_DURATION_MS
    });
    return res.json(out);
  } catch (err) {
    console.error("Błąd /api/robot/move-forward-left:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

app.post("/api/robot/move-forward-right", async (req, res) => {
  try {
    const speedScale = readSpeedScale(req);
    const out = await sendControlMotion({
      vx: VX_FORWARD * speedScale,
      real_steer: -STEER_DIAG,
      duration: MOTION_DURATION_MS
    });
    return res.json(out);
  } catch (err) {
    console.error("Błąd /api/robot/move-forward-right:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

// Tył-lewo / tył-prawo (45° przy cofaniu)
app.post("/api/robot/move-backward-left", async (req, res) => {
  try {
    const speedScale = readSpeedScale(req);
    const out = await sendControlMotion({
      vx: VX_BACKWARD * speedScale,
      real_steer: +STEER_DIAG,
      duration: MOTION_DURATION_MS
    });
    return res.json(out);
  } catch (err) {
    console.error("Błąd /api/robot/move-backward-left:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

app.post("/api/robot/move-backward-right", async (req, res) => {
  try {
    const speedScale = readSpeedScale(req);
    const out = await sendControlMotion({
      vx: VX_BACKWARD * speedScale,
      real_steer: -STEER_DIAG,
      duration: MOTION_DURATION_MS
    });
    return res.json(out);
  } catch (err) {
    console.error("Błąd /api/robot/move-backward-right:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

// ------------------ API: SEIZE / RELEASE CONTROL ------------------

app.post("/api/robot/seize-control", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      logApiCall("MOCK robotSeizeControl", { robotId: ROBOT_ID });
      return res.json({ ok: true, mock: true });
    }
    logApiCall("RDS robotSeizeControl", { robotId: ROBOT_ID });
    await rdsClient.robotSeizeControl(ROBOT_ID);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Błąd /api/robot/seize-control:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

app.post("/api/robot/release-control", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      logApiCall("MOCK robotReleaseControl", { robotId: ROBOT_ID });
      return res.json({ ok: true, mock: true });
    }
    logApiCall("RDS robotReleaseControl", { robotId: ROBOT_ID });
    await rdsClient.robotReleaseControl(ROBOT_ID);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Błąd /api/robot/release-control:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

// ------------------ API: CLEAR ALL ERRORS ------------------

app.post("/api/robot/clear-errors", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      logApiCall("MOCK robotClearAllErrors", { robotId: ROBOT_ID });
      clearErrorsMock();
      return res.json({ ok: true, mock: true });
    }
    logApiCall("RDS robotClearAllErrors", { robotId: ROBOT_ID });
    await rdsClient.robotClearAllErrors(ROBOT_ID);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Błąd /api/robot/clear-errors:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

// ------------------ API: SOFTWARE EMERGENCY ------------------

app.post("/api/robot/soft-emergency", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      logApiCall("MOCK setSoftEmc ON", { robotId: ROBOT_ID });
      setSoftEmcMock(true);
      return res.json({ ok: true, mock: true });
    }
    logApiCall("RDS setSoftEmc ON", { robotId: ROBOT_ID });
    const result = await rdsClient.setSoftEmc(ROBOT_ID, true);
    return res.json({ ok: true, result });
  } catch (err) {
    console.error("Błąd /api/robot/soft-emergency:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

app.post("/api/robot/soft-emergency-cancel", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      logApiCall("MOCK setSoftEmc OFF", { robotId: ROBOT_ID });
      setSoftEmcMock(false);
      return res.json({ ok: true, mock: true });
    }
    logApiCall("RDS setSoftEmc OFF", { robotId: ROBOT_ID });
    const result = await rdsClient.setSoftEmc(ROBOT_ID, false);
    return res.json({ ok: true, result });
  } catch (err) {
    console.error("Błąd /api/robot/soft-emergency-cancel:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

// ------------------ API: PROBLEMY (task manager) ------------------

app.post("/api/robot/pick-temp-block", async (req, res) => {
  try {
    const route = `/api/robots/${encodeURIComponent(ROBOT_ID)}/temp-block-from`;
    return await postTaskManagerAction(route, "TEMP-BLOCK", res);
  } catch (err) {
    console.error("Błąd /api/robot/pick-temp-block:", err);
    return res.status(500).json({ error: "Task manager error" });
  }
});

app.post("/api/robot/pick-perm-block", async (req, res) => {
  try {
    const route = `/api/robots/${encodeURIComponent(ROBOT_ID)}/block-from-perm`;
    return await postTaskManagerAction(route, "PERM-BLOCK", res);
  } catch (err) {
    console.error("Błąd /api/robot/pick-perm-block:", err);
    return res.status(500).json({ error: "Task manager error" });
  }
});

app.post("/api/robot/put-down-next", async (req, res) => {
  try {
    const route = `/api/robots/${encodeURIComponent(ROBOT_ID)}/put-down`;
    return await postTaskManagerAction(route, "PUT-DOWN", res);
  } catch (err) {
    console.error("Błąd /api/robot/put-down-next:", err);
    return res.status(500).json({ error: "Task manager error" });
  }
});

// ------------------ API: ZADANIA RĘCZNE ------------------

app.post("/api/robot/manual-tasks/delete", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      logApiCall("MOCK manualTasksDelete", { robotId: ROBOT_ID });
      return res.json({ ok: true, mock: true });
    }

    logApiCall("RDS manualTasksDelete", { robotId: ROBOT_ID });

    // kończymy wszystkie zadania, które mają parametr agv == ROBOT_ID
    const result = await rdsClient.terminateTasksByStatusAndParams([], { agv: ROBOT_ID });

    return res.json({ ok: true, result });
  } catch (err) {
    console.error("Błąd /api/robot/manual-tasks/delete:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

app.post("/api/robot/manual-tasks/add-drop", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      logApiCall("MOCK manualTasksAddDrop", { robotId: ROBOT_ID });
      return res.json({ ok: true, mock: true });
    }

    logApiCall("RDS manualTasksAddDrop", { robotId: ROBOT_ID, label: MANUAL_DROP_TASK_LABEL });

    const result = await rdsClient.createTask(MANUAL_DROP_TASK_LABEL, { agv: ROBOT_ID });

    return res.json({ ok: true, result });
  } catch (err) {
    console.error("Błąd /api/robot/manual-tasks/add-drop:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

// ------------------ API: TERMINATE (transport order) ------------------

app.post("/api/robot/terminate", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      logApiCall("MOCK terminateTransportOrder", { robotId: ROBOT_ID });
      return res.json({ ok: true, mock: true });
    }

    logApiCall("RDS terminateTransportOrder (resolve transportOrderId)", { robotId: ROBOT_ID });
    const raw = await rdsClient.getRobotListRaw();
    const report = findRobotReport(raw, ROBOT_ID);

    const transportOrderId = report?.current_order?.id || null;
    if (!transportOrderId) {
      return res.status(400).json({
        error: "Brak aktywnego transport ordera (current_order.id jest puste)",
        robotId: ROBOT_ID
      });
    }

    logApiCall("RDS terminateTransportOrder", { robotId: ROBOT_ID, transportOrderId });

    const result = await rdsClient.terminateTransportOrder(transportOrderId);
    return res.json({ ok: true, result });
  } catch (err) {
    console.error("Błąd /api/robot/terminate:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

// ------------------ API: FORKS (HIGH / LOW) ------------------

app.post("/api/robot/fork-high", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      logApiCall("MOCK setForkHeight HIGH", { robotId: ROBOT_ID, height: FORK_HIGH_HEIGHT });
      setForkHeightMock(FORK_HIGH_HEIGHT);
      return res.json({ ok: true, mock: true });
    }
    logApiCall("RDS setForkHeight HIGH", { robotId: ROBOT_ID, height: FORK_HIGH_HEIGHT });
    await rdsClient.setForkHeight(ROBOT_ID, FORK_HIGH_HEIGHT);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Błąd /api/robot/fork-high:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

app.post("/api/robot/fork-low", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      logApiCall("MOCK setForkHeight LOW", { robotId: ROBOT_ID, height: FORK_LOW_HEIGHT });
      setForkHeightMock(FORK_LOW_HEIGHT);
      return res.json({ ok: true, mock: true });
    }
    logApiCall("RDS setForkHeight LOW", { robotId: ROBOT_ID, height: FORK_LOW_HEIGHT });
    await rdsClient.setForkHeight(ROBOT_ID, FORK_LOW_HEIGHT);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Błąd /api/robot/fork-low:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

app.listen(PORT, () => {
  console.log(`Robot UI listening on port ${PORT}`);
  console.log(`Otwórz: http://localhost:${PORT}/`);
});
