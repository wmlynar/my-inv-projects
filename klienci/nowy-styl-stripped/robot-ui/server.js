const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");
const http = require("http");
const https = require("https");
const md5 = require("md5");

const PROD_CONFIG = {
  rds: {
    host: "http://127.0.0.1:8080",
    useMock: false,
    logApiCalls: true
  },
  robot: {
    id: "INV-CBD15-LONG-1"
  },
  fork: {
    lowHeight: 0.085,
    highHeight: 0.201
  },
  tasks: {
    manualDropLabel: "test_car"
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

const CFG = PROD_CONFIG;

const RDS_API_HOST = CFG.rds.host;
const RDS_LOGIN = "admin";
const RDS_PASSWORD = "123456";
const RDS_LANG = "pl";

const API_TASK_STATUS_DESCRIPTIONS = {
  en: {
    1000: "Running",
    1001: "Terminated",
    1002: "Paused",
    1003: "Finished",
    1004: "Exceptional End",
    1005: "Restart exception",
    1006: "Abnormal Interruption",
    1007: "End Manually"
  },
  pl: {
    1000: "Uruchomiony",
    1001: "Zakończony",
    1002: "Pauza",
    1003: "Zakończony",
    1004: "Wyjątkowe zakończenie",
    1005: "Błąd restartu",
    1006: "Nieprawidłowe przerwanie",
    1007: "Zakończony ręcznie"
  }
};

const API_LANGUAGE = RDS_LANG;

let apiSessionId = null;

function encryptPassword(password) {
  return md5(password);
}

async function login() {
  const url = `${RDS_API_HOST}/admin/login`;
  const requestData = {
    username: RDS_LOGIN,
    password: encryptPassword(RDS_PASSWORD)
  };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestData)
  });
  if (!response.ok) {
    throw new Error(`Logowanie nie powiodło się: ${response.status}`);
  }
  const setCookieHeader = response.headers.get("set-cookie");
  const match = setCookieHeader && setCookieHeader.match(/JSESSIONID=([^;]+)/);
  apiSessionId = match ? match[1] : null;
  if (!apiSessionId) {
    throw new Error("Nie udało się pobrać JSESSIONID z ciasteczka.");
  }
  await response.json();
}

async function apiCall(path, options = {}, allowRetry = true) {
  if (!apiSessionId) {
    await login();
  }

  const doRequest = async () => {
    const headers = {
      "Content-Type": "application/json",
      Language: API_LANGUAGE || "en",
      ...(options.headers || {}),
      Cookie: `JSESSIONID=${apiSessionId}`
    };
    const url = `${RDS_API_HOST}${path}`;
    return fetch(url, { ...options, headers });
  };

  const readJsonOrText = async (response) => {
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return { json, text };
    } catch {
      return { json: null, text };
    }
  };

  let response = await doRequest();
  let { json, text } = await readJsonOrText(response);

  const isInvalidSession =
    (!response.ok && json && json.code === 9005) ||
    (response.ok && json && json.code === 9005);

  if (isInvalidSession && allowRetry) {
    apiSessionId = null;
    await login();
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

async function getRobotListRaw() {
  return apiCall("/api/agv-report/core", { method: "GET" });
}

async function robotSetDispatchable(vehicle_id) {
  const path = `/api/controlled-agv/${vehicle_id}/dispatchable/dispatchable`;
  return apiCall(path, { method: "POST" });
}

async function robotSetUndispatchableOnline(vehicle_id) {
  const path = `/api/controlled-agv/${vehicle_id}/dispatchable/undispatchable_unignore`;
  return apiCall(path, { method: "POST" });
}

async function robotSetUndispatchableOffline(vehicle_id) {
  const path = `/api/controlled-agv/${vehicle_id}/dispatchable/undispatchable_ignore`;
  return apiCall(path, { method: "POST" });
}

async function robotPause(vehicle_id) {
  const path = `/api/controlled-agv/${vehicle_id}/goto-site/pause`;
  return apiCall(path, { method: "POST" });
}

async function robotResume(vehicle_id) {
  const path = `/api/controlled-agv/${vehicle_id}/goto-site/resume`;
  return apiCall(path, { method: "POST" });
}

async function robotSeizeControl(vehicle_id) {
  const path = `/api/controlled-agv/${vehicle_id}/lock`;
  return apiCall(path, { method: "POST" });
}

async function robotReleaseControl(vehicle_id) {
  const path = `/api/controlled-agv/${vehicle_id}/unlock`;
  return apiCall(path, { method: "POST" });
}

async function robotClearAllErrors(vehicle_id) {
  const path = `/api/controlled-agv/${vehicle_id}/clear-robot-all-errors`;
  return apiCall(path, { method: "POST" });
}

async function setSoftEmc(vehicle_id, value) {
  const path = `/api/agv/setSoftIOEMC`;
  const requestData = {
    vehicle: vehicle_id,
    status: !!value
  };
  return apiCall(path, {
    method: "POST",
    body: JSON.stringify(requestData)
  });
}

async function terminateTask(def_id, id) {
  const path = "/api/stop-all-task";
  const requestData = { releaseSite: 1, stopTaskList: [{ taskId: def_id, taskRecordId: id }] };
  return apiCall(path, { method: "POST", body: JSON.stringify(requestData) });
}

function matchesRequiredParams(task, requiredParams) {
  if (!requiredParams || typeof requiredParams !== "object") return true;

  const normalize = (src) => {
    if (!src) return {};
    if (typeof src === "object" && !Array.isArray(src)) {
      return src;
    }

    const arrayToObj = (arr) => {
      const obj = {};
      for (const item of arr) {
        if (item && typeof item === "object") {
          const key = item.name ?? item.label;
          if (key !== undefined) {
            const val = item.defaultValue ?? item.value ?? item.val ?? "";
            obj[key] = val;
          }
        }
      }
      return obj;
    };

    if (typeof src === "string") {
      try {
        const parsed = JSON.parse(src);
        if (Array.isArray(parsed)) return arrayToObj(parsed);
        if (parsed && typeof parsed === "object") return parsed;
        return {};
      } catch {
        return {};
      }
    }

    if (Array.isArray(src)) {
      return arrayToObj(src);
    }

    return {};
  };

  const sources = [normalize(task.input_params), normalize(task.input_params_summary)];

  const containsAll = (src) =>
    Object.entries(requiredParams).every(([k, v]) => {
      if (!(k in src)) return false;
      return String(src[k]) === String(v);
    });

  return sources.some(containsAll);
}

async function findTasksByStatusAndParams(statuses = [], requiredParams = {}) {
  const normalizedStatuses =
    Array.isArray(statuses) && statuses.length > 0
      ? statuses.map((s) => (s == null ? null : String(s)))
      : [null];

  const path = "/api/queryTaskRecord";
  const fetchTasksForStatus = async (status) => {
    const requestData = {
      currentPage: 1,
      pageSize: 1000000,
      queryParam: {
        taskRecordId: null,
        outOrderNo: null,
        agvId: null,
        status: status,
        taskLabel: null,
        startDate: null,
        endDate: null,
        ifParentOrChildOrAll: null,
        ifPeriodTask: 0,
        agvIdList: [],
        stateDescription: null
      }
    };
    const responseJson = await apiCall(path, { method: "POST", body: JSON.stringify(requestData) });
    return responseJson?.data?.pageList || [];
  };

  const tasksArrays = await Promise.all(normalizedStatuses.map(fetchTasksForStatus));
  const tasks = tasksArrays.flat();

  const filtered = tasks.filter((task) => matchesRequiredParams(task, requiredParams));

  const statusMap = API_TASK_STATUS_DESCRIPTIONS[API_LANGUAGE] || API_TASK_STATUS_DESCRIPTIONS.en || {};

  return filtered.map((task) => ({
    id: task.id,
    def_id: task.def_id,
    agv_id: task.agv_id,
    priority: task.priority,
    status: task.status,
    status_description: statusMap[task.status] || "Unknown",
    def_label: task.def_label,
    input_params_summary: Object.fromEntries(JSON.parse(task.input_params).map((param) => [param.name, param.defaultValue])),
    executor_time: task.executor_time,
    created_on: task.created_on,
    first_executor_time: task.first_executor_time,
    ended_on: task.ended_on
  }));
}

async function terminateTasksByStatusAndParams(statuses = [], requiredParams = {}) {
  const tasks = await findTasksByStatusAndParams(statuses, requiredParams);
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return { requested: 0, succeeded: 0, failed: 0, results: [] };
  }

  const results = [];
  let succeeded = 0;

  for (const t of tasks) {
    try {
      const res = await terminateTask(t.def_id, t.id);
      const ok = res?.code === 200;
      if (ok) succeeded++;
      results.push({ id: t.id, def_id: t.def_id, ok, response: res });
    } catch (err) {
      results.push({
        id: t.id,
        def_id: t.def_id,
        ok: false,
        error: String(err?.message || err)
      });
    }
  }

  return {
    requested: tasks.length,
    succeeded,
    failed: tasks.length - succeeded,
    results
  };
}

async function createTask(taskLabel, inputParams = {}) {
  if (!taskLabel || typeof taskLabel !== "string" || !taskLabel.trim()) {
    throw new Error("createTask: 'taskLabel' musi być niepustym stringiem.");
  }

  let inputParamsStr;
  if (typeof inputParams === "string") {
    try {
      JSON.parse(inputParams);
    } catch {
      throw new Error("createTask: 'inputParams' jako string musi być poprawnym JSON-em.");
    }
    inputParamsStr = inputParams;
  } else if (inputParams && typeof inputParams === "object") {
    inputParamsStr = JSON.stringify(inputParams);
  } else {
    throw new Error("createTask: 'inputParams' musi być obiektem lub stringiem JSON.");
  }

  const path = "/api/set-order";
  const payload = { taskLabel, inputParams: inputParamsStr };

  const res = await apiCall(path, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  if (res?.code !== 200) {
    throw new Error(`createTask: błąd API (code=${res?.code}, msg=${res?.msg || "?"})`);
  }
  return res;
}

async function terminateTransportOrder(transportOrderId, setUndispatchable = true) {
  if (!transportOrderId || typeof transportOrderId !== "string") {
    throw new Error("terminateTransportOrder: 'transportOrderId' musi być niepustym stringiem.");
  }

  const path = "/api/terminateAndUnlockSites";
  const body = {
    agvArray: transportOrderId,
    disable: setUndispatchable,
    taskRecordArray: "",
    isUnlockSite: true
  };

  return apiCall(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

async function setForkHeight(vehicle_id, height) {
  const path = "/api/setForkHeight";
  const requestData = {
    vehicle: vehicle_id,
    height: height
  };
  return apiCall(path, { method: "POST", body: JSON.stringify(requestData) });
}

const rdsApi = {
  getRobotListRaw,
  robotSetDispatchable,
  robotSetUndispatchableOnline,
  robotSetUndispatchableOffline,
  robotPause,
  robotResume,
  robotSeizeControl,
  robotReleaseControl,
  robotClearAllErrors,
  setSoftEmc,
  terminateTasksByStatusAndParams,
  createTask,
  terminateTransportOrder,
  setForkHeight
};


function readBuildId() {
  const candidates = [
    path.join(process.cwd(), "version.json"),
    path.join(__dirname, "version.json"),
    path.join(process.cwd(), "package.json")
  ];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    try {
      const raw = fs.readFileSync(candidate, "utf-8");
      const data = JSON.parse(raw);
      if (data && typeof data === "object") {
        return data.buildId || data.build_id || data.build || data.version || null;
      }
    } catch {
    }
  }

  return null;
}

const BUILD_ID = readBuildId();

const USE_MOCK_RDS = CFG.rds.useMock;
const ROBOT_ID = CFG.robot.id;
const PORT = CFG.http.port;

const FORK_LOW_HEIGHT = CFG.fork.lowHeight;
const FORK_HIGH_HEIGHT = CFG.fork.highHeight;

const MANUAL_DROP_TASK_LABEL = CFG.tasks.manualDropLabel;
const TASK_MANAGER_HOST = CFG.taskManager.host;
const TASK_MANAGER_TIMEOUT_MS = CFG.taskManager.timeoutMs;
const TASK_PAUSED_MODE = "order_state";
const TASK_PAUSED_RBK_STATUS = 3;
const TASK_PAUSED_ORDER_STATES = new Set(["paused", "pause", "suspended", "suspend"]);

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
    return res.json({ ok: true, mock: true });
  }
  const url = taskManagerUrl(route);
  if (!url) {
    return res.status(503).json({ error: "Task manager host not configured" });
  }


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

let rdsClient = null;
if (!USE_MOCK_RDS) {
  rdsClient = rdsApi;
}

const app = express();
app.use(bodyParser.json());
const publicDir = fs.existsSync(path.join(process.cwd(), "public"))
  ? path.join(process.cwd(), "public")
  : path.join(__dirname, "public");
app.use(express.static(publicDir));

app.get("/api/status", (req, res) => {
  res.json({ ok: true, buildId: BUILD_ID, ts: Date.now() });
});

let mockRobotListRaw = null;
let lastRobotState = null;
if (USE_MOCK_RDS) {
  try {
    mockRobotListRaw = require("./mock-robot-list.json");
  } catch (err) {
    console.error("Robot UI: brak mock-robot-list.json lub błąd:", err);
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
    typeof uds.dispatchable_status === "number" ? uds.dispatchable_status : null;
  const connectionStatus = report.connection_status;

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
      raw = mockRobotListRaw;
      rdsOk = USE_MOCK_RDS ? true : false;
      rdsSource = USE_MOCK_RDS ? "mock" : "no-rds-client";
    } else {
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
      return res.json(mockRobotListRaw);
    }

    const raw = await rdsClient.getRobotListRaw();
    return res.json(raw);
  } catch (err) {
    console.error("Błąd /api/robot/raw:", err);
    return res.status(500).json({ error: "Internal error" });
  }
});


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


app.post("/api/robot/dispatchable", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      updateDispatchMock("DISPATCHABLE");
      return res.json({ ok: true, mock: true });
    }
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
      updateDispatchMock("UNDISPATCHABLE_ONLINE");
      return res.json({ ok: true, mock: true });
    }
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
      updateDispatchMock("UNDISPATCHABLE_OFFLINE");
      return res.json({ ok: true, mock: true });
    }
    await rdsClient.robotSetUndispatchableOffline(ROBOT_ID);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Błąd /api/robot/undispatchable-offline:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});


app.post("/api/robot/pause", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      return res.json({ ok: true, mock: true });
    }
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
      return res.json({ ok: true, mock: true });
    }
    await rdsClient.robotResume(ROBOT_ID);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Błąd /api/robot/resume:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});



app.post("/api/robot/seize-control", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      return res.json({ ok: true, mock: true });
    }
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
      return res.json({ ok: true, mock: true });
    }
    await rdsClient.robotReleaseControl(ROBOT_ID);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Błąd /api/robot/release-control:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});


app.post("/api/robot/clear-errors", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      clearErrorsMock();
      return res.json({ ok: true, mock: true });
    }
    await rdsClient.robotClearAllErrors(ROBOT_ID);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Błąd /api/robot/clear-errors:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});


app.post("/api/robot/soft-emergency", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      setSoftEmcMock(true);
      return res.json({ ok: true, mock: true });
    }
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
      setSoftEmcMock(false);
      return res.json({ ok: true, mock: true });
    }
    const result = await rdsClient.setSoftEmc(ROBOT_ID, false);
    return res.json({ ok: true, result });
  } catch (err) {
    console.error("Błąd /api/robot/soft-emergency-cancel:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});


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


app.post("/api/robot/manual-tasks/delete", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      return res.json({ ok: true, mock: true });
    }


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
      return res.json({ ok: true, mock: true });
    }


    const result = await rdsClient.createTask(MANUAL_DROP_TASK_LABEL, { agv: ROBOT_ID });

    return res.json({ ok: true, result });
  } catch (err) {
    console.error("Błąd /api/robot/manual-tasks/add-drop:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});


app.post("/api/robot/terminate", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      return res.json({ ok: true, mock: true });
    }

    const raw = await rdsClient.getRobotListRaw();
    const report = findRobotReport(raw, ROBOT_ID);

    const transportOrderId = report?.current_order?.id || null;
    if (!transportOrderId) {
      return res.status(400).json({
        error: "Brak aktywnego transport ordera (current_order.id jest puste)",
        robotId: ROBOT_ID
      });
    }


    const result = await rdsClient.terminateTransportOrder(transportOrderId);
    return res.json({ ok: true, result });
  } catch (err) {
    console.error("Błąd /api/robot/terminate:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});


app.post("/api/robot/fork-high", async (req, res) => {
  try {
    if (USE_MOCK_RDS || !rdsClient) {
      setForkHeightMock(FORK_HIGH_HEIGHT);
      return res.json({ ok: true, mock: true });
    }
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
      setForkHeightMock(FORK_LOW_HEIGHT);
      return res.json({ ok: true, mock: true });
    }
    await rdsClient.setForkHeight(ROBOT_ID, FORK_LOW_HEIGHT);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Błąd /api/robot/fork-low:", err);
    return res.status(500).json({ error: "RDS error" });
  }
});

app.listen(PORT, () => {
});
