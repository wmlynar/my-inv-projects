
const express = require("express");
const path = require("path");
const md5 = require("md5");


const PROD_CONFIG = {
  rds: {
    host: "http://127.0.0.1:8080"
  },
  tasks: {
    mainLabel: "nowy_styl_task",
    putDownLabel: "nowy_styl_put_down"
  },
  flags: {
    enableAutoStart: true,
    enableAutoKillOnEmptySource: true,
    enableDispatchableSnapshotFix: true,
    respectDispatchableInAutostart: false,
    debugLog: true,
    enableOldTaskCleanup: false
  },
  intervals: {
    loopMs: 500,
    emptyTimeoutMs: 1000,
    dispatchableFixDelayMs: 1000
  },
  tempBlock: {
    timeoutMs: 5 * 60 * 1000,
    checkEveryNCycles: 60,
    tagPrefix: "TEMP_BLOCKED_AT="
  },
  dispatch: {
    targetActiveTasks: 0
  },
  managedRobots: [],
  http: {
    port: 3100
  },
  cleanup: {
    keepTotal: 1000,
    everyNCycles: 600
  }
};

const ACTIVE_TASK_STATUSES = ["1000", "1002"];

const TASK_STATUS_DESCRIPTIONS = {
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

const RELOC_STATUS_DESCRIPTIONS = {
  en: {
    0: "FAILED",
    1: "SUCCESS",
    2: "RELOCING",
    3: "COMPLETED"
  },
  pl: {
    0: "NIEUDANE",
    1: "SUKCES",
    2: "RELOKOWANIE",
    3: "UKOŃCZONE"
  }
};

const ROBOT_TASK_STATUS_DESCRIPTIONS = {
  en: {
    0: "NONE",
    1: "WAITING",
    2: "RUNNING",
    3: "SUSPENDED",
    4: "COMPLETED",
    5: "FAILED",
    6: "CANCELED"
  },
  pl: {
    0: "BRAK",
    1: "OCZEKIWANIE",
    2: "URUCHOMIONY",
    3: "ZAWIESZONY",
    4: "UKOŃCZONY",
    5: "BŁĄD",
    6: "ANULOWANY"
  }
};

const DISPATCHABLE_STATUS_DESCRIPTIONS = {
  en: {
    0: "Dispatchable",
    1: "Undispatchable and Online",
    2: "Undispatchable and Offline"
  },
  pl: {
    0: "Dyspozycyjny",
    1: "Niedyspozycyjny Online",
    2: "Niedyspozycyjny Offline"
  }
};

function extractSessionId(setCookieHeader) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/JSESSIONID=([^;]+)/);
  return match ? match[1] : null;
}

class RdsClient {
  constructor(apiHost, username, password, language = "en") {
    this.apiHost = apiHost;
    this.username = username;
    this.password = password;
    this.sessionId = null;
    this.language = language;
  }

  encryptPassword(password) {
    return md5(password);
  }

  async login() {
    const url = `${this.apiHost}/admin/login`;
    const requestData = {
      username: this.username,
      password: this.encryptPassword(this.password)
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
    this.sessionId = extractSessionId(setCookieHeader);
    if (!this.sessionId) {
      throw new Error("Nie udało się pobrać JSESSIONID z ciasteczka.");
    }
    await response.json();
  }

  async apiCall(path, options = {}, allowRetry = true) {
    if (!this.sessionId) {
      await this.login();
    }

    const doRequest = async () => {
      const headers = {
        "Content-Type": "application/json",
        Language: this.language || "en",
        ...(options.headers || {}),
        Cookie: `JSESSIONID=${this.sessionId}`
      };

      const url = `${this.apiHost}${path}`;
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
      this.sessionId = null;
      await this.login();
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

  async getRobotList() {
    const path = "/api/agv-report/core";
    const responseJson = await this.apiCall(path, { method: "GET" });

    const report = Array.isArray(responseJson?.data?.report) ? responseJson.data.report : [];
    const lang = this.language || "en";
    const toNumOrNull = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

    return report.map((robot) => {
      const co = robot?.current_order || {};
      const rr = robot?.rbk_report || {};
      const alarms = rr?.alarms || {};
      const ur = robot?.undispatchable_reason || {};

      const relocStatus = toNumOrNull(rr?.reloc_status);
      const taskStatus = toNumOrNull(rr?.task_status);
      const dispStatus = toNumOrNull(ur?.dispatchable_status);

      return {
        vehicle: {
          dispatchable: !!robot?.dispatchable,
          is_error: !!robot?.is_error,
          isLoaded: !!robot?.isLoaded,
          vehicle_id: robot?.vehicle_id ?? "",
          connection_status: robot?.connection_status ?? null
        },
        current_order: {
          id: co?.id ?? "",
          state: co?.state ?? "",
          externalId: co?.externalId ?? "",
          msg: co?.msg ?? "",
          error: co?.error ?? "",
          complete: co?.complete ?? null
        },
        rbk_report: {
          emergency: rr?.emergency ?? null,
          blocked: rr?.blocked ?? null,
          reloc_status: relocStatus,
          reloc_status_description:
            relocStatus !== null ? RELOC_STATUS_DESCRIPTIONS?.[lang]?.[relocStatus] ?? "Unknown" : "Unknown",
          battery_level: rr?.battery_level ?? null,
          confidence: rr?.confidence ?? null,
          task_status: taskStatus,
          task_status_description:
            taskStatus !== null ? ROBOT_TASK_STATUS_DESCRIPTIONS?.[lang]?.[taskStatus] ?? "Unknown" : "Unknown",
          charging: rr?.charging ?? null,
          soft_emc: rr?.soft_emc ?? null,
          current_station: rr?.current_station ?? "",
          last_station: rr?.last_station ?? ""
        },
        rbk_report_alarms: {
          notices: alarms?.notices ?? [],
          warnings: alarms?.warnings ?? [],
          errors: alarms?.errors ?? [],
          fatals: alarms?.fatals ?? []
        },
        undispatchable_reason: {
          disconnect: ur?.disconnect ?? null,
          unconfirmed_reloc: ur?.unconfirmed_reloc ?? null,
          control_released: ur?.unlock === 1 || ur?.unlock === true,
          low_battery: ur?.low_battery ?? null,
          current_map_invalid: ur?.current_map_invalid ?? null,
          dispatchable_status: dispStatus,
          dispatchable_status_description:
            dispStatus !== null ? DISPATCHABLE_STATUS_DESCRIPTIONS?.[lang]?.[dispStatus] ?? "Unknown" : "Unknown",
          suspended: ur?.suspended ?? null
        }
      };
    });
  }

  async getWorkSiteList() {
    const path = "/api/work-sites/sites";
    const requestData = {};
    const responseJson = await this.apiCall(path, {
      method: "POST",
      body: JSON.stringify(requestData)
    });
    return responseJson.data.map((site) => ({
      workSiteId: site.id,
      workSiteName: site.siteId,
      filled: site.filled === 1,
      locked: site.locked === 1,
      lockedBy: site.lockedBy || "",
      content: site.content || "",
      groupName: site.groupName || "",
      tags: site.tags || "",
      displayName: site.siteName || ""
    }));
  }

  async getActiveTasks() {
    const activeStatuses = ACTIVE_TASK_STATUSES.map(String);
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
      const responseJson = await this.apiCall(path, { method: "POST", body: JSON.stringify(requestData) });
      return responseJson?.data?.pageList || [];
    };

    const tasksArrays = await Promise.all(activeStatuses.map(fetchTasksForStatus));
    const tasks = tasksArrays.flat();

    const mapDict = TASK_STATUS_DESCRIPTIONS?.[this.language] || TASK_STATUS_DESCRIPTIONS?.en || {};

    return tasks.map((task) => ({
      id: task.id,
      def_id: task.def_id,
      agv_id: task.agv_id,
      priority: task.priority,
      status: task.status,
      status_description: mapDict[task.status] || "Unknown",
      def_label: task.def_label,
      input_params_summary: Object.fromEntries(
        (() => {
          try {
            const arr = JSON.parse(task.input_params);
            return (arr || []).map((param) => [param.name, param.defaultValue]);
          } catch {
            return [];
          }
        })()
      ),
      executor_time: task.executor_time,
      created_on: task.created_on,
      first_executor_time: task.first_executor_time,
      ended_on: task.ended_on
    }));
  }

  async createTask(taskLabel, inputParams = {}) {
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

    const res = await this.apiCall(path, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (res?.code !== 200) {
      throw new Error(`createTask: błąd API (code=${res?.code}, msg=${res?.msg || "?"})`);
    }
    return res;
  }

  async terminateTask(defId, id) {
    const path = "/api/stop-all-task";
    const requestData = { releaseSite: 1, stopTaskList: [{ taskId: defId, taskRecordId: id }] };
    return this.apiCall(path, { method: "POST", body: JSON.stringify(requestData) });
  }

  async getTaskByRecordId(taskRecordId) {
    if (!taskRecordId) throw new Error("getTaskByRecordId: taskRecordId is required.");
    const path = "/api/queryTaskRecord";
    const requestData = {
      currentPage: 1,
      pageSize: 1,
      queryParam: {
        taskRecordId,
        outOrderNo: null,
        agvId: null,
        status: null,
        taskLabel: null,
        startDate: null,
        endDate: null,
        ifParentOrChildOrAll: null,
        ifPeriodTask: 0,
        agvIdList: [],
        stateDescription: null
      }
    };
    const res = await this.apiCall(path, { method: "POST", body: JSON.stringify(requestData) });
    const t = res?.data?.pageList?.[0];
    if (!t) return null;

    const mapping = TASK_STATUS_DESCRIPTIONS?.[this.language] || TASK_STATUS_DESCRIPTIONS?.en || {};

    let paramsObj = {};
    try {
      const arr =
        typeof t.input_params === "string"
          ? JSON.parse(t.input_params)
          : Array.isArray(t.input_params)
            ? t.input_params
            : [];
      paramsObj = Object.fromEntries((arr || []).map((p) => [p.name ?? p.label, p.defaultValue ?? p.value ?? ""]));
    } catch {}

    return {
      id: t.id,
      def_id: t.def_id,
      agv_id: t.agv_id,
      priority: t.priority,
      status: t.status,
      status_description: mapping[t.status] || "Unknown",
      def_label: t.def_label,
      input_params_summary: paramsObj,
      executor_time: t.executor_time,
      created_on: t.created_on,
      first_executor_time: t.first_executor_time,
      ended_on: t.ended_on
    };
  }

  async setWorkSiteFilled(worksiteName) {
    const path = "/api/work-sites/worksiteFiled";
    const requestData = { workSiteIds: [worksiteName] };
    return this.apiCall(path, { method: "POST", body: JSON.stringify(requestData) });
  }

  async setWorkSiteLocked(worksiteName, lockedBy) {
    const path = "/api/work-sites/lockedSites";
    const requestData = { siteIdList: [worksiteName], lockedBy: lockedBy };
    return this.apiCall(path, { method: "POST", body: JSON.stringify(requestData) });
  }

  async setWorkSiteUnlocked(worksiteName) {
    const path = "/api/work-sites/unLockedSites";
    const requestData = [worksiteName];
    return this.apiCall(path, { method: "POST", body: JSON.stringify(requestData) });
  }

  async setWorksiteTags(worksiteName, tags) {
    const path = "/api/work-sites/setWorksiteLabel";
    const requestData = { workSiteIds: [worksiteName], label: tags };
    return this.apiCall(path, { method: "POST", body: JSON.stringify(requestData) });
  }

  async deleteTask(id) {
    const path = "/api/delete-task";
    return this.apiCall(path, { method: "POST", body: JSON.stringify([id]) });
  }

  async robotSetDispatchable(vehicleId) {
    const path = `/api/controlled-agv/${vehicleId}/dispatchable/dispatchable`;
    return this.apiCall(path, { method: "POST" });
  }

  async robotSetUndispatchableOnline(vehicleId) {
    const path = `/api/controlled-agv/${vehicleId}/dispatchable/undispatchable_unignore`;
    return this.apiCall(path, { method: "POST" });
  }

  async robotSetUndispatchableOffline(vehicleId) {
    const path = `/api/controlled-agv/${vehicleId}/dispatchable/undispatchable_ignore`;
    return this.apiCall(path, { method: "POST" });
  }

  async robotPause(vehicleId) {
    const path = `/api/controlled-agv/${vehicleId}/goto-site/pause`;
    return this.apiCall(path, { method: "POST" });
  }

  async robotResume(vehicleId) {
    const path = `/api/controlled-agv/${vehicleId}/goto-site/resume`;
    return this.apiCall(path, { method: "POST" });
  }

  async robotSeizeControl(vehicleId) {
    const path = `/api/controlled-agv/${vehicleId}/lock`;
    return this.apiCall(path, { method: "POST" });
  }

  async robotReleaseControl(vehicleId) {
    const path = `/api/controlled-agv/${vehicleId}/unlock`;
    return this.apiCall(path, { method: "POST" });
  }
}

const CFG = PROD_CONFIG;

const RDS_API_HOST = CFG.rds.host;
const RDS_LOGIN = "admin";
const RDS_PASSWORD = "123456";
const RDS_LANG = "pl";

const TASK_LABEL = CFG.tasks.mainLabel;
const PUT_DOWN_TASK_LABEL = CFG.tasks.putDownLabel;

const ENABLE_AUTO_START = CFG.flags.enableAutoStart;
const ENABLE_AUTO_KILL_ON_EMPTY_SOURCE = CFG.flags.enableAutoKillOnEmptySource;

const ENABLE_DISPATCHABLE_SNAPSHOT_FIX = CFG.flags.enableDispatchableSnapshotFix;

const LOOP_INTERVAL_MS = CFG.intervals.loopMs;
const EMPTY_TIMEOUT_MS = CFG.intervals.emptyTimeoutMs;
const DISPATCHABLE_FIX_DELAY_MS = CFG.intervals.dispatchableFixDelayMs;

const TEMP_BLOCK_TIMEOUT_MS = CFG.tempBlock.timeoutMs;
const TEMP_BLOCK_CHECK_EVERY_N_CYCLES = CFG.tempBlock.checkEveryNCycles;
const TEMP_BLOCK_TAG_PREFIX = CFG.tempBlock.tagPrefix;

const DEBUG_LOG = CFG.flags.debugLog;

const TARGET_ACTIVE_TASKS = CFG.dispatch.targetActiveTasks;

const RESPECT_DISPATCHABLE_IN_AUTOSTART = CFG.flags.respectDispatchableInAutostart;


const MANAGED_ROBOTS = CFG.managedRobots;

const HTTP_PORT = CFG.http.port;

const ENABLE_OLD_TASK_CLEANUP = CFG.flags.enableOldTaskCleanup;
const CLEANUP_KEEP_TOTAL = CFG.cleanup.keepTotal;
const CLEANUP_EVERY_N_CYCLES = CFG.cleanup.everyNCycles;


const MANAGED_ROBOT_SET = new Set(MANAGED_ROBOTS.map((s) => String(s)));

function isManagedRobotId(robotId) {
  if (!robotId) return false;
  if (MANAGED_ROBOTS.length === 0) return true;
  return MANAGED_ROBOT_SET.has(String(robotId));
}

function filterManagedRobots(robots = []) {
  if (!Array.isArray(robots)) return [];
  if (MANAGED_ROBOTS.length === 0) return robots;
  return robots.filter((r) => isManagedRobotId(r?.vehicle?.vehicle_id));
}

function isDispatchableForAutostart(robot) {
  const conn = Number(robot?.vehicle?.connection_status);
  if (conn === 0) return false;

  const ds = robot?.undispatchable_reason?.dispatchable_status;
  const dsNum = ds === null || ds === undefined ? null : Number(ds);
  if (dsNum !== 0) return false;

  if (robot?.vehicle?.dispatchable === false) return false;
  return true;
}

const HEALTH_RDS_STALE_AFTER_MS = Math.max(10_000, LOOP_INTERVAL_MS * 5);

const healthState = {
  startedAt: Date.now(),
  lastCycleStartedAt: null,
  lastCycleEndedAt: null,
  lastCycleDurationMs: null,
  lastRdsOkAt: null,
  lastRdsErrorAt: null,
  lastRdsError: null,
  consecutiveRdsErrors: 0
};


function logDebug(...args) {
  if (!DEBUG_LOG) return;
  console.log("[DEBUG]", ...args);
}

function logInfo(...args) {
  console.log("[INFO]", ...args);
}

function logError(...args) {
  console.error("[ERROR]", ...args);
}


process.on("unhandledRejection", (err) => {
  logError("UNHANDLED REJECTION:", err && err.stack ? err.stack : err);
});

process.on("uncaughtException", (err) => {
  logError("UNCAUGHT EXCEPTION:", err && err.stack ? err.stack : err);
});


function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const taskEmptyState = new Map();

let globalApiClient = null;
let autoStartBlocked = false;
let exclusiveOpInProgress = false;
let cleanupCounter = 0;


async function runExclusiveTaskOp(name, fn) {
  while (exclusiveOpInProgress) {
    logDebug(`[LOCK] Inna operacja w toku, "${name}" czeka...`);
    await sleep(50);
  }
  exclusiveOpInProgress = true;
  autoStartBlocked = true;
  logInfo(`[LOCK] Start operacji "${name}" (auto-start zablokowany).`);
  try {
    return await fn();
  } finally {
    autoStartBlocked = false;
    exclusiveOpInProgress = false;
    logInfo(`[LOCK] Koniec operacji "${name}", auto-start odblokowany.`);
  }
}


function extractStatusObject(rawTask) {
  const candidates = [];

  if (rawTask.state_description != null) candidates.push(rawTask.state_description);
  if (rawTask.stateDescription != null) candidates.push(rawTask.stateDescription);
  if (rawTask.statusDesc != null) candidates.push(rawTask.statusDesc);
  if (rawTask.status_description != null) candidates.push(rawTask.status_description);

  for (const raw of candidates) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        return { statusObj: obj, rawStatusStr: trimmed };
      }
    } catch {}
  }

  const rawStatusStr = candidates.length > 0 ? String(candidates[0]) : "";
  return { statusObj: null, rawStatusStr };
}


function extractTempBlockTime(tagsStr) {
  if (!tagsStr) return null;
  const parts = tagsStr.split(";").map((s) => s.trim()).filter(Boolean);
  for (const p of parts) {
    if (p.startsWith(TEMP_BLOCK_TAG_PREFIX)) {
      return p.slice(TEMP_BLOCK_TAG_PREFIX.length);
    }
  }
  return null;
}

function setTempBlockTag(tagsStr, isoTime) {
  const parts = (tagsStr || "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((p) => !p.startsWith(TEMP_BLOCK_TAG_PREFIX));
  parts.push(`${TEMP_BLOCK_TAG_PREFIX}${isoTime}`);
  return parts.join("; ");
}

function clearTempBlockTag(tagsStr) {
  const parts = (tagsStr || "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((p) => !p.startsWith(TEMP_BLOCK_TAG_PREFIX));
  return parts.join("; ");
}


async function doOneCycle(api) {
  const cycleStart = Date.now();
  healthState.lastCycleStartedAt = cycleStart;

  logDebug("=== [CYCLE] START ===", new Date(cycleStart).toISOString());

  const endCycle = () => {
    const end = Date.now();
    healthState.lastCycleEndedAt = end;
    healthState.lastCycleDurationMs = end - cycleStart;
  };

  const markRdsError = (msg) => {
    healthState.consecutiveRdsErrors += 1;
    healthState.lastRdsErrorAt = Date.now();
    healthState.lastRdsError = msg;
  };

  const markRdsOk = () => {
    healthState.lastRdsOkAt = Date.now();
    healthState.consecutiveRdsErrors = 0;
    healthState.lastRdsError = null;
  };

  if (!api.sessionId) {
    try {
      await api.login();
      logDebug("[RDS] Login OK");
    } catch (err) {
      const msg = `[RDS] Login failed: ${err && err.message ? err.message : String(err)}`;
      logError(msg);
      markRdsError(msg);
      endCycle();
      return;
    }
  }

  let robots;
  let tasksResp;
  let workSites;

  try {
    [robots, tasksResp, workSites] = await Promise.all([
      api.getRobotList(),
      api.apiCall("/api/queryTaskRecord", {
        method: "POST",
        body: JSON.stringify({
          currentPage: 1,
          pageSize: 1000,
          queryParam: {
            taskRecordId: null,
            outOrderNo: null,
            agvId: null,
            status: null,
            taskLabel: TASK_LABEL,
            startDate: null,
            endDate: null,
            ifParentOrChildOrAll: null,
            ifPeriodTask: 0,
            agvIdList: [],
            stateDescription: null
          }
        })
      }),
      api.getWorkSiteList()
    ]);

    markRdsOk();
  } catch (err) {
    const msg = `[CYCLE] Error fetching robots/tasks/worksites: ${err && err.message ? err.message : String(err)}`;
    logError(msg);
    markRdsError(msg);
    endCycle();
    return;
  }

  const rawTasks = tasksResp && tasksResp.data && Array.isArray(tasksResp.data.pageList) ? tasksResp.data.pageList : [];

  const statusMap = TASK_STATUS_DESCRIPTIONS[RDS_LANG] || TASK_STATUS_DESCRIPTIONS.en || {};

  const activeStatusSet = new Set(ACTIVE_TASK_STATUSES.map(String));

  logDebug(`[CYCLE] robots=${robots.length}, rawTasks(label=${TASK_LABEL})=${rawTasks.length}, worksites=${workSites.length}`);

  const managedTasks = [];

  for (const t of rawTasks) {
    if (t.def_label !== TASK_LABEL) continue;

    const statusCode = String(t.status);
    if (!activeStatusSet.has(statusCode)) continue;

    const agvId = t.agv_id || t.agvId || null;
    const statusDescription = statusMap[statusCode] || "Unknown";

    const { statusObj, rawStatusStr } = extractStatusObject(t);
    const fromSite = statusObj && typeof statusObj.from === "string" ? statusObj.from.trim() : "";
    const toSite = statusObj && typeof statusObj.to === "string" ? statusObj.to.trim() : "";

    managedTasks.push({
      id: String(t.id),
      def_id: String(t.def_id),
      agv_id: agvId,
      priority: t.priority,
      status: statusCode,
      statusDescription,
      def_label: t.def_label,
      fromSite,
      toSite,
      rawStatusStr
    });
  }

  const workSiteByName = new Map();
  for (const ws of workSites) {
    workSiteByName.set(ws.workSiteName, ws);
  }

  if (ENABLE_AUTO_START) {
    await handleAutoStart(api, robots, managedTasks);
  }

  if (ENABLE_AUTO_KILL_ON_EMPTY_SOURCE) {
    if (exclusiveOpInProgress) {
      logDebug("[TASK-KILL] Pomijam (exclusiveOpInProgress=true)");
    } else {
      await handleNewTaskKill(api, robots, managedTasks, workSiteByName);
    }
  }

  endCycle();

  const elapsed = Date.now() - cycleStart;
  logDebug(`=== [CYCLE] END, duration=${elapsed}ms ===`);

  cleanupCounter++;
  if (ENABLE_OLD_TASK_CLEANUP && cleanupCounter % CLEANUP_EVERY_N_CYCLES === 0) {
    await cleanupOldTasks(api);
  }
  if (cleanupCounter % TEMP_BLOCK_CHECK_EVERY_N_CYCLES === 0) {
    await processTempBlockedWorksites(api);
  }
}


async function handleAutoStart(api, robots, managedTasks) {
  if (autoStartBlocked) {
    logDebug("[AUTO-START] Pomijam (autoStartBlocked=true)");
    return;
  }

  const robotsManaged = filterManagedRobots(robots);

  if (TARGET_ACTIVE_TASKS <= 0 && MANAGED_ROBOTS.length > 0 && robotsManaged.length === 0) {
    logDebug("[AUTO-START] MANAGED_ROBOTS ustawione, ale brak tych robotów w snapshotcie – pomijam auto-start.");
    return;
  }

  const robotsForTarget = RESPECT_DISPATCHABLE_IN_AUTOSTART ? robotsManaged.filter(isDispatchableForAutostart) : robotsManaged;

  if (TARGET_ACTIVE_TASKS <= 0 && RESPECT_DISPATCHABLE_IN_AUTOSTART && robotsForTarget.length === 0) {
    logDebug("[AUTO-START] Brak robotów dispatchable (respect flag) – nie tworzę tasków.");
    return;
  }

  const effectiveTarget =
    TARGET_ACTIVE_TASKS > 0 ? TARGET_ACTIVE_TASKS : robotsForTarget.length > 0 ? robotsForTarget.length : 1;

  const activeCount = managedTasks.length;
  const missing = effectiveTarget - activeCount;

  logDebug(
    `[AUTO-START] activeTasks(label=${TASK_LABEL})=${activeCount}, target=${effectiveTarget}, missing=${missing > 0 ? missing : 0}`
  );

  if (missing <= 0) return;

  for (let i = 0; i < missing; i++) {
    try {
      logInfo(
        `[AUTO-START] Tworzę task "${TASK_LABEL}" (${i + 1}/${missing}) – bez parametrów input (active=${activeCount}, target=${effectiveTarget}).`
      );
      await api.createTask(TASK_LABEL, {});
    } catch (err) {
      logError(`[AUTO-START] Błąd createTask("${TASK_LABEL}") (globalnie):`, err && err.message ? err.message : err);
    }
  }
}


async function handleNewTaskKill(api, robotsSnapshot, managedTasks, workSiteByName) {
  const now = Date.now();

  const activeTaskIds = new Set(managedTasks.map((t) => t.id));

  for (const [taskId] of taskEmptyState.entries()) {
    if (!activeTaskIds.has(taskId)) {
      taskEmptyState.delete(taskId);
    }
  }

  for (const task of managedTasks) {
    const taskId = task.id;

    const agvId = String(task.agv_id || "").trim();
    if (agvId && !isManagedRobotId(agvId)) {
      continue;
    }

    const fromSite = task.fromSite;

    if (!fromSite) {
      taskEmptyState.delete(taskId);
      continue;
    }

    const ws = workSiteByName.get(fromSite);
    if (!ws) {
      taskEmptyState.delete(taskId);
      continue;
    }

    const locked = !!ws.locked;
    const filled = locked ? false : !!ws.filled;

    let st = taskEmptyState.get(taskId);
    if (!st) {
      st = { fromSite, emptySinceMs: null };
      taskEmptyState.set(taskId, st);
    } else if (st.fromSite !== fromSite) {
      st.fromSite = fromSite;
      st.emptySinceMs = null;
    }

    if (filled) {
      st.emptySinceMs = null;
      continue;
    }

    if (st.emptySinceMs === null) {
      st.emptySinceMs = now;
      continue;
    }

    const emptyDuration = now - st.emptySinceMs;
    if (emptyDuration < EMPTY_TIMEOUT_MS) {
      continue;
    }

    logInfo(
      `[TASK-KILL] Task ${taskId}, from="${fromSite}": EMPTY/locked przez ${emptyDuration}ms >= threshold (${EMPTY_TIMEOUT_MS}ms). terminateTask(def_id=${task.def_id}).`
    );

    try {
      await terminateTaskWithDispatchSnapshotFix(api, robotsSnapshot, task);
    } catch (err) {
      logError(`[TASK-KILL] Błąd terminateTask + snapshot-fix dla taska ${taskId}:`, err && err.message ? err.message : err);
    } finally {
      taskEmptyState.delete(taskId);
    }
  }
}


async function terminateTaskWithDispatchSnapshotFix(api, robotsSnapshot, task) {
  const robotsMap = new Map();
  for (const r of robotsSnapshot) {
    const id = String(r.vehicle.vehicle_id || "").trim();
    if (!id) continue;
    robotsMap.set(id, {
      dispatchableStatus: r.undispatchable_reason?.dispatchable_status,
      description: r.undispatchable_reason?.dispatchable_status_description
    });
  }

  try {
    const res = await api.terminateTask(task.def_id, task.id);
    logDebug(`[TASK-KILL] terminateTask(def_id=${task.def_id}, id=${task.id}) ->`, JSON.stringify(res));
  } catch (err) {
    throw err;
  }

  if (!ENABLE_DISPATCHABLE_SNAPSHOT_FIX) return;

  await sleep(DISPATCHABLE_FIX_DELAY_MS);

  let refreshed = null;
  try {
    refreshed = await api.getTaskByRecordId(task.id);
  } catch {
    return;
  }
  if (!refreshed) return;

  const agvAfter = String(refreshed.agv_id || "").trim();
  if (!agvAfter) return;

  const snapshot = robotsMap.get(agvAfter);
  if (!snapshot) return;

  const stNum =
    snapshot.dispatchableStatus === null || snapshot.dispatchableStatus === undefined ? null : Number(snapshot.dispatchableStatus);

  logInfo(
    `[TASK-KILL] Task ${task.id}: agv_id="${agvAfter}" był w stanie dispatchable_status=${stNum} ("${snapshot.description || "?"}") przed terminate. Przywracam ten stan.`
  );

  try {
    switch (stNum) {
      case 0:
        await api.robotSetDispatchable(agvAfter);
        break;
      case 1:
        await api.robotSetUndispatchableOnline(agvAfter);
        break;
      case 2:
        await api.robotSetUndispatchableOffline(agvAfter);
        break;
      default:
        break;
    }
  } catch (err) {
    logError(`[TASK-KILL] Błąd przy przywracaniu dispatchable dla agv="${agvAfter}", status=${stNum}:`, err?.message || err);
  }
}


async function terminateAllActiveTasksForRobot(api, robotId, activeTasksOpt = null) {
  const activeTasks = Array.isArray(activeTasksOpt) ? activeTasksOpt : await api.getActiveTasks();
  const activeSet = new Set(ACTIVE_TASK_STATUSES.map(String));

  const tasksToKill = activeTasks.filter(
    (t) => activeSet.has(String(t.status)) && String(t.agv_id || "").trim() === robotId
  );

  const results = [];
  let succeeded = 0;

  for (const t of tasksToKill) {
    try {
      const r = await api.terminateTask(t.def_id, t.id);
      const ok = r?.code === 200;
      if (ok) succeeded++;
      results.push({ id: String(t.id), def_id: String(t.def_id), ok });
    } catch (err) {
      results.push({ id: String(t.id), def_id: String(t.def_id), ok: false, error: String(err?.message || err) });
    }
  }

  return {
    requested: tasksToKill.length,
    succeeded,
    failed: tasksToKill.length - succeeded,
    results
  };
}


async function findFromToForRobotTask(api, robotId) {
  const activeTasks = await api.getActiveTasks();
  const activeSet = new Set(ACTIVE_TASK_STATUSES.map(String));

  const transportTasksForRobot = activeTasks.filter(
    (t) => t.def_label === TASK_LABEL && String(t.agv_id || "").trim() === robotId && activeSet.has(String(t.status))
  );

  if (transportTasksForRobot.length === 0) {
    return { fromSite: null, toSite: null, activeTasks };
  }

  const t0 = transportTasksForRobot[0];

  const raw = await api.apiCall("/api/queryTaskRecord", {
    method: "POST",
    body: JSON.stringify({
      currentPage: 1,
      pageSize: 1,
      queryParam: {
        taskRecordId: t0.id,
        outOrderNo: null,
        agvId: null,
        status: null,
        taskLabel: null,
        startDate: null,
        endDate: null,
        ifPeriodTask: 0,
        ifParentOrChildOrAll: null,
        agvIdList: [],
        stateDescription: null
      }
    })
  });

  const rt = raw?.data?.pageList?.[0];
  if (!rt) return { fromSite: null, toSite: null, activeTasks };

  const { statusObj } = extractStatusObject(rt);

  const fromSite =
    statusObj && typeof statusObj.from === "string" ? statusObj.from.trim() : "";
  const toSite =
    statusObj && typeof statusObj.to === "string" ? statusObj.to.trim() : "";

  return { fromSite: fromSite || null, toSite: toSite || null, activeTasks };
}


async function handlePutDownForRobot(api, robotId) {
  if (!robotId || typeof robotId !== "string") {
    throw new Error("handlePutDownForRobot: 'robotId' musi być niepustym stringiem.");
  }

  logInfo(`[PUT-DOWN] Start dla robota ${robotId}`);

  const robots = await api.getRobotList();
  const robot = robots.find((r) => String(r.vehicle.vehicle_id) === robotId);
  if (!robot) throw new Error(`[PUT-DOWN] Robot ${robotId} nie znaleziony w getRobotList()`);

  const prevDispStatus = robot.undispatchable_reason?.dispatchable_status;
  const prevDispStatusNum = prevDispStatus === null || prevDispStatus === undefined ? null : Number(prevDispStatus);

  const { toSite, activeTasks } = await findFromToForRobotTask(api, robotId);

  if (toSite) {
    logInfo(`[PUT-DOWN] Robot ${robotId}: oznaczam worksite "${toSite}" jako FILLED (wg 'to').`);
    try {
      await api.setWorkSiteFilled(toSite);
    } catch (err) {
      logError(`[PUT-DOWN] Błąd setWorkSiteFilled("${toSite}") dla robota ${robotId}:`, err?.message || err);
    }
  }

  const kill = await terminateAllActiveTasksForRobot(api, robotId, activeTasks);

  logInfo(`[PUT-DOWN] Tworzę nowy "${PUT_DOWN_TASK_LABEL}" dla robota ${robotId} (param agv).`);
  try {
    await api.createTask(PUT_DOWN_TASK_LABEL, { agv: robotId });
  } catch (err) {
    logError(`[PUT-DOWN] Błąd createTask("${PUT_DOWN_TASK_LABEL}") dla robota ${robotId}:`, err?.message || err);
  }

  let dispatchRestored = false;
  if (prevDispStatusNum !== null) {
    try {
      switch (prevDispStatusNum) {
        case 0:
          await api.robotSetDispatchable(robotId);
          dispatchRestored = true;
          break;
        case 1:
          await api.robotSetUndispatchableOnline(robotId);
          dispatchRestored = true;
          break;
        case 2:
          await api.robotSetUndispatchableOffline(robotId);
          dispatchRestored = true;
          break;
        default:
          break;
      }
    } catch (err) {
      logError(`[PUT-DOWN] Błąd przy przywracaniu dispatchable (status=${prevDispStatusNum}):`, err?.message || err);
    }
  }

  return { ok: true, robotId, dispatchRestored, prevDispatchableStatus: prevDispStatusNum, kill };
}


async function handleTempBlockFromForRobot(api, robotId) {
  if (!robotId || typeof robotId !== "string") {
    throw new Error("handleTempBlockFromForRobot: 'robotId' musi być niepustym stringiem.");
  }

  logInfo(`[TEMP-BLOCK] Start dla robota ${robotId}`);

  const robots = await api.getRobotList();
  const robot = robots.find((r) => String(r.vehicle.vehicle_id) === robotId);
  if (!robot) throw new Error(`[TEMP-BLOCK] Robot ${robotId} nie znaleziony w getRobotList()`);

  const prevDispStatus = robot.undispatchable_reason?.dispatchable_status;
  const prevDispStatusNum = prevDispStatus === null || prevDispStatus === undefined ? null : Number(prevDispStatus);

  const { fromSite, activeTasks } = await findFromToForRobotTask(api, robotId);

  if (fromSite) {
    logInfo(`[TEMP-BLOCK] Robot ${robotId}: blokuję tymczasowo worksite "${fromSite}".`);
    try {
      await api.setWorkSiteLocked(fromSite, "TEMP_BLOCK");
    } catch (err) {
      logError(`[TEMP-BLOCK] Błąd setWorkSiteLocked("${fromSite}") dla robota ${robotId}:`, err?.message || err);
    }

    try {
      const workSites = await api.getWorkSiteList();
      const ws = workSites.find((w) => w.workSiteName === fromSite);
      const oldTags = ws ? ws.tags || "" : "";
      const nowIso = new Date().toISOString();
      const newTags = setTempBlockTag(oldTags, nowIso);
      await api.setWorksiteTags(fromSite, newTags);
    } catch (err) {
      logError(`[TEMP-BLOCK] Błąd ustawiania taga TEMP_BLOCKED_AT dla "${fromSite}":`, err?.message || err);
    }
  }

  const kill = await terminateAllActiveTasksForRobot(api, robotId, activeTasks);

  let dispatchRestored = false;
  if (prevDispStatusNum !== null) {
    try {
      switch (prevDispStatusNum) {
        case 0:
          await api.robotSetDispatchable(robotId);
          dispatchRestored = true;
          break;
        case 1:
          await api.robotSetUndispatchableOnline(robotId);
          dispatchRestored = true;
          break;
        case 2:
          await api.robotSetUndispatchableOffline(robotId);
          dispatchRestored = true;
          break;
        default:
          break;
      }
    } catch (err) {
      logError(`[TEMP-BLOCK] Błąd przy przywracaniu dispatchable (status=${prevDispStatusNum}):`, err?.message || err);
    }
  }

  return { ok: true, robotId, fromSite, dispatchRestored, prevDispatchableStatus: prevDispStatusNum, kill };
}


async function handlePermBlockFromForRobot(api, robotId) {
  if (!robotId || typeof robotId !== "string") {
    throw new Error("handlePermBlockFromForRobot: 'robotId' musi być niepustym stringiem.");
  }

  logInfo(`[PERM-BLOCK] Start dla robota ${robotId}`);

  const robots = await api.getRobotList();
  const robot = robots.find((r) => String(r.vehicle.vehicle_id) === robotId);
  if (!robot) throw new Error(`[PERM-BLOCK] Robot ${robotId} nie znaleziony w getRobotList()`);

  const prevDispStatus = robot.undispatchable_reason?.dispatchable_status;
  const prevDispStatusNum = prevDispStatus === null || prevDispStatus === undefined ? null : Number(prevDispStatus);

  const { fromSite, activeTasks } = await findFromToForRobotTask(api, robotId);

  if (fromSite) {
    logInfo(`[PERM-BLOCK] Robot ${robotId}: blokuję NA STAŁE worksite "${fromSite}".`);
    try {
      await api.setWorkSiteLocked(fromSite, "PERM_BLOCK");
    } catch (err) {
      logError(`[PERM-BLOCK] Błąd setWorkSiteLocked("${fromSite}") dla robota ${robotId}:`, err?.message || err);
    }

    try {
      const workSites = await api.getWorkSiteList();
      const ws = workSites.find((w) => w.workSiteName === fromSite);
      const oldTags = ws ? ws.tags || "" : "";
      const newTags = clearTempBlockTag(oldTags);
      if (newTags !== oldTags) {
        await api.setWorksiteTags(fromSite, newTags);
      }
    } catch (err) {
      logError(`[PERM-BLOCK] Błąd czyszczenia taga TEMP_BLOCKED_AT dla "${fromSite}":`, err?.message || err);
    }
  }

  const kill = await terminateAllActiveTasksForRobot(api, robotId, activeTasks);

  let dispatchRestored = false;
  if (prevDispStatusNum !== null) {
    try {
      switch (prevDispStatusNum) {
        case 0:
          await api.robotSetDispatchable(robotId);
          dispatchRestored = true;
          break;
        case 1:
          await api.robotSetUndispatchableOnline(robotId);
          dispatchRestored = true;
          break;
        case 2:
          await api.robotSetUndispatchableOffline(robotId);
          dispatchRestored = true;
          break;
        default:
          break;
      }
    } catch (err) {
      logError(`[PERM-BLOCK] Błąd przy przywracaniu dispatchable (status=${prevDispStatusNum}):`, err?.message || err);
    }
  }

  return { ok: true, robotId, fromSite, dispatchRestored, prevDispatchableStatus: prevDispStatusNum, kill };
}


async function handleStopAndDisableForRobot(api, robotId) {
  if (!robotId || typeof robotId !== "string") {
    throw new Error("handleStopAndDisableForRobot: 'robotId' musi być niepustym stringiem.");
  }

  logInfo(`[STOP+DISABLE] Start dla robota ${robotId}`);

  const kill = await terminateAllActiveTasksForRobot(api, robotId);

  let disableOk = false;
  try {
    await api.robotSetUndispatchableOnline(robotId);
    disableOk = true;
  } catch (err) {
    logError(`[STOP+DISABLE] Błąd robotSetUndispatchableOnline(${robotId}):`, err?.message || err);
  }

  return { ok: true, robotId, kill, disabled: disableOk };
}


async function cleanupOldTasks(api) {
  if (!ENABLE_OLD_TASK_CLEANUP) return;

  const pageSize = CLEANUP_KEEP_TOTAL;

  let firstPage;
  try {
    firstPage = await api.apiCall("/api/queryTaskRecord", {
      method: "POST",
      body: JSON.stringify({
        currentPage: 1,
        pageSize,
        queryParam: {
          taskRecordId: null,
          outOrderNo: null,
          agvId: null,
          status: null,
          taskLabel: null,
          startDate: null,
          endDate: null,
          ifParentOrChildOrAll: null,
          ifPeriodTask: 0,
          agvIdList: [],
          stateDescription: null
        }
      })
    });
  } catch (err) {
    logError("[CLEANUP] Błąd pobierania strony 1 z /api/queryTaskRecord:", err?.message || err);
    return;
  }

  const totalCount = firstPage?.data?.totalCount ?? 0;
  if (totalCount <= CLEANUP_KEEP_TOTAL) {
    return;
  }

  logInfo(
    `[CLEANUP] totalCount=${totalCount}, zostawiam pierwszych ${CLEANUP_KEEP_TOTAL}, kasuję stare taski ze stron 2..N (iteracyjnie przez stronę 2).`
  );

  while (true) {
    let page2;
    try {
      page2 = await api.apiCall("/api/queryTaskRecord", {
        method: "POST",
        body: JSON.stringify({
          currentPage: 2,
          pageSize,
          queryParam: {
            taskRecordId: null,
            outOrderNo: null,
            agvId: null,
            status: null,
            taskLabel: null,
            startDate: null,
            endDate: null,
            ifParentOrChildOrAll: null,
            ifPeriodTask: 0,
            agvIdList: [],
            stateDescription: null
          }
        })
      });
    } catch (err) {
      logError("[CLEANUP] Błąd pobierania strony 2 z /api/queryTaskRecord:", err?.message || err);
      break;
    }

    const pageList = page2?.data?.pageList || [];
    if (!pageList.length) break;

    for (const t of pageList) {
      try {
        await api.deleteTask(t.id);
      } catch (err) {
        logError(`[CLEANUP] Błąd deleteTask(${t.id}):`, err?.message || err);
      }
    }

    await sleep(50);
  }
}


async function processTempBlockedWorksites(api) {
  const now = Date.now();
  let workSites;

  try {
    workSites = await api.getWorkSiteList();
  } catch (err) {
    logError("[TEMP-BLOCK] Błąd getWorkSiteList w processTempBlockedWorksites:", err?.message || err);
    return;
  }

  for (const ws of workSites) {
    const tagsStr = ws.tags || "";
    const tsStr = extractTempBlockTime(tagsStr);
    if (!tsStr) continue;

    const ts = Date.parse(tsStr);
    if (Number.isNaN(ts)) continue;

    const age = now - ts;
    if (age < TEMP_BLOCK_TIMEOUT_MS) continue;

    logInfo(
      `[TEMP-BLOCK] Worksite "${ws.workSiteName}" ma TEMP_BLOCKED_AT=${tsStr}, age=${age}ms >= timeout=${TEMP_BLOCK_TIMEOUT_MS}ms – odblokowuję.`
    );

    try {
      await api.setWorkSiteUnlocked(ws.workSiteName);
    } catch (err) {
      logError(`[TEMP-BLOCK] Błąd setWorkSiteUnlocked("${ws.workSiteName}"):`, err?.message || err);
      continue;
    }

    try {
      const newTags = clearTempBlockTag(tagsStr);
      await api.setWorksiteTags(ws.workSiteName, newTags);
    } catch (err) {
      logError(`[TEMP-BLOCK] Błąd czyszczenia taga TEMP_BLOCKED_AT dla "${ws.workSiteName}":`, err?.message || err);
    }
  }
}


function startHttpServer() {
  const app = express();
  app.use(express.json());

  app.use(express.static(path.join(__dirname, "public")));

  app.get("/api/robots", async (_req, res) => {
    try {
      if (!globalApiClient) {
        return res.status(503).json({ error: "API client not ready" });
      }

      const robotsAll = await globalApiClient.getRobotList();
      const robots = filterManagedRobots(robotsAll);

      let activeTasks = [];
      let tasksError = null;

      try {
        activeTasks = await globalApiClient.getActiveTasks();
      } catch (err) {
        tasksError = String(err?.message || err);
        logError("[HTTP] getActiveTasks error (continuing without task labels):", tasksError);
        activeTasks = [];
      }

      const betterTask = (a, b) => {
        if (!a) return b;
        if (!b) return a;

        const aRunning = String(a.status) === "1000";
        const bRunning = String(b.status) === "1000";
        if (aRunning && !bRunning) return a;
        if (bRunning && !aRunning) return b;

        const ap = Number(a.priority ?? 0);
        const bp = Number(b.priority ?? 0);
        if (bp > ap) return b;

        return a;
      };

      const taskByRobot = new Map();
      for (const t of activeTasks) {
        const rid = String(t.agv_id || "").trim();
        if (!rid) continue;
        if (!isManagedRobotId(rid)) continue;

        const prev = taskByRobot.get(rid);
        taskByRobot.set(rid, betterTask(prev, t));
      }

      const payload = robots.map((r) => {
        const rid = r.vehicle.vehicle_id;
        const t = taskByRobot.get(rid);

        return {
          vehicle_id: rid,
          dispatchable: r.vehicle.dispatchable,
          dispatchable_status: r.undispatchable_reason?.dispatchable_status,
          dispatchable_status_description: r.undispatchable_reason?.dispatchable_status_description,
          is_error: r.vehicle.is_error,
          isLoaded: r.vehicle.isLoaded,
          connection_status: r.vehicle.connection_status,
          current_order_id: r.current_order?.id || "",
          current_order_state: r.current_order?.state || "",
          current_station: r.rbk_report?.current_station || "",
          last_station: r.rbk_report?.last_station || "",

          current_task_record_id: t ? String(t.id) : "",
          current_task_label: t ? String(t.def_label) : "",
          current_task_status: t ? String(t.status) : "",
          current_task_status_description: t ? (t.status_description || "") : ""
        };
      });

      res.json({ robots: payload, tasksError });
    } catch (err) {
      logError("[HTTP] /api/robots error:", err?.message || err);
      res.status(500).json({ error: String(err?.message || err) });
    }
  });

  app.post("/api/robots/:robotId/put-down", async (req, res) => {
    const robotId = req.params.robotId;
    try {
      if (!globalApiClient) return res.status(503).json({ error: "API client not ready" });
      if (!isManagedRobotId(robotId)) return res.status(404).json({ error: "Robot not managed" });

      const result = await runExclusiveTaskOp(`put-down:${robotId}`, () => handlePutDownForRobot(globalApiClient, robotId));
      res.json(result);
    } catch (err) {
      logError("[HTTP] POST /api/robots/:robotId/put-down error:", err?.message || err);
      res.status(500).json({ error: String(err?.message || err) });
    }
  });

  app.post("/api/robots/:robotId/temp-block-from", async (req, res) => {
    const robotId = req.params.robotId;
    try {
      if (!globalApiClient) return res.status(503).json({ error: "API client not ready" });
      if (!isManagedRobotId(robotId)) return res.status(404).json({ error: "Robot not managed" });

      const result = await runExclusiveTaskOp(`temp-block-from:${robotId}`, () =>
        handleTempBlockFromForRobot(globalApiClient, robotId)
      );
      res.json(result);
    } catch (err) {
      logError("[HTTP] POST /api/robots/:robotId/temp-block-from error:", err?.message || err);
      res.status(500).json({ error: String(err?.message || err) });
    }
  });

  app.post("/api/robots/:robotId/block-from-perm", async (req, res) => {
    const robotId = req.params.robotId;
    try {
      if (!globalApiClient) return res.status(503).json({ error: "API client not ready" });
      if (!isManagedRobotId(robotId)) return res.status(404).json({ error: "Robot not managed" });

      const result = await runExclusiveTaskOp(`perm-block-from:${robotId}`, () =>
        handlePermBlockFromForRobot(globalApiClient, robotId)
      );
      res.json(result);
    } catch (err) {
      logError("[HTTP] POST /api/robots/:robotId/block-from-perm error:", err?.message || err);
      res.status(500).json({ error: String(err?.message || err) });
    }
  });

  app.post("/api/robots/:robotId/stop-and-disable", async (req, res) => {
    const robotId = req.params.robotId;
    try {
      if (!globalApiClient) return res.status(503).json({ error: "API client not ready" });
      if (!isManagedRobotId(robotId)) return res.status(404).json({ error: "Robot not managed" });

      const result = await runExclusiveTaskOp(`stop-and-disable:${robotId}`, () =>
        handleStopAndDisableForRobot(globalApiClient, robotId)
      );
      res.json(result);
    } catch (err) {
      logError("[HTTP] POST /api/robots/:robotId/stop-and-disable error:", err?.message || err);
      res.status(500).json({ error: String(err?.message || err) });
    }
  });

  const simpleRobotPost = (route, fn) => {
    app.post(route, async (req, res) => {
      const robotId = req.params.robotId;
      try {
        if (!globalApiClient) return res.status(503).json({ error: "API client not ready" });
        if (!isManagedRobotId(robotId)) return res.status(404).json({ error: "Robot not managed" });
        const out = await fn(robotId);
        res.json(out ?? { ok: true });
      } catch (err) {
        res.status(500).json({ error: String(err?.message || err) });
      }
    });
  };

  simpleRobotPost("/api/robots/:robotId/set-dispatchable", (id) => globalApiClient.robotSetDispatchable(id));
  simpleRobotPost("/api/robots/:robotId/set-undispatchable-online", (id) => globalApiClient.robotSetUndispatchableOnline(id));
  simpleRobotPost("/api/robots/:robotId/set-undispatchable-offline", (id) => globalApiClient.robotSetUndispatchableOffline(id));

  simpleRobotPost("/api/robots/:robotId/pause", (id) => globalApiClient.robotPause(id));
  simpleRobotPost("/api/robots/:robotId/resume", (id) => globalApiClient.robotResume(id));

  simpleRobotPost("/api/robots/:robotId/seize-control", (id) => globalApiClient.robotSeizeControl(id));
  simpleRobotPost("/api/robots/:robotId/release-control", (id) => globalApiClient.robotReleaseControl(id));

  app.get("/healthz", (_req, res) => {
    const now = Date.now();
    const ageMs = healthState.lastRdsOkAt ? now - healthState.lastRdsOkAt : null;
    const rdsOk = ageMs !== null && ageMs <= HEALTH_RDS_STALE_AFTER_MS;

    res.status(rdsOk ? 200 : 503).json({
      ok: rdsOk,
      rdsOk,
      ageMs,
      lastRdsOkAt: healthState.lastRdsOkAt ? new Date(healthState.lastRdsOkAt).toISOString() : null,
      lastRdsErrorAt: healthState.lastRdsErrorAt ? new Date(healthState.lastRdsErrorAt).toISOString() : null,
      lastRdsError: healthState.lastRdsError,
      consecutiveRdsErrors: healthState.consecutiveRdsErrors,
      loopIntervalMs: LOOP_INTERVAL_MS,
      lastCycleDurationMs: healthState.lastCycleDurationMs
    });
  });

  app.listen(HTTP_PORT, () => {
    logInfo(`HTTP API listening on http://localhost:${HTTP_PORT}`);
  });
}


["SIGINT", "SIGTERM"].forEach((sig) => {
  process.on(sig, () => {
    logInfo(`${sig} received – shutting down robot-task-manager...`);
    process.exit(0);
  });
});


async function main() {
  logInfo("Starting robot-task-manager with config:", {
    RDS_API_HOST,
    TASK_LABEL,
    PUT_DOWN_TASK_LABEL,
    ENABLE_AUTO_START,
    ENABLE_AUTO_KILL_ON_EMPTY_SOURCE,
    ENABLE_DISPATCHABLE_SNAPSHOT_FIX,
    ENABLE_OLD_TASK_CLEANUP,
    TEMP_BLOCK_TIMEOUT_MS,
    LOOP_INTERVAL_MS,
    EMPTY_TIMEOUT_MS,
    DISPATCHABLE_FIX_DELAY_MS,
    DEBUG_LOG,
    TARGET_ACTIVE_TASKS,
    RESPECT_DISPATCHABLE_IN_AUTOSTART,
    MANAGED_ROBOTS
  });

  const api = new RdsClient(RDS_API_HOST, RDS_LOGIN, RDS_PASSWORD, RDS_LANG);
  globalApiClient = api;

  startHttpServer();

  while (true) {
    const iterStart = Date.now();
    try {
      await doOneCycle(api);
    } catch (err) {
      logError("Top-level error in main loop:", err && err.stack ? err.stack : err);
    }
    const elapsed = Date.now() - iterStart;
    const sleepMs = Math.max(LOOP_INTERVAL_MS - elapsed, 0);
    if (sleepMs > 0) {
      await sleep(sleepMs);
    }
  }
}

main().catch((err) => {
  logError("Fatal error in main():", err && err.stack ? err.stack : err);
  process.exit(1);
});
