// robot-task-manager.js
//
// Robot Task Manager:
//  - automatyczne uruchamianie taska (TASK_LABEL)
//  - automatyczne ubijanie taska, gdy źródłowy worksite jest pusty/locked przez dłużej niż próg
//  - obsługa "oznacz jako zajęte i odwieź na następne wolne pole" (PUT_DOWN_TASK_LABEL)
//  - obsługa "tymczasowo zablokuj pole pobierania" (TEMP-BLOCK-FROM)
//  - obsługa "zablokuj pole pobierania na stałe" (PERM-BLOCK-FROM)
//  - obsługa "zatrzymaj zadania i wyłącz z ruchu" (STOP+DISABLE)
//
// HTTP UI/API:
//  - GET  /api/robots
//  - POST /api/robots/:id/put-down
//  - POST /api/robots/:id/temp-block-from
//  - POST /api/robots/:id/block-from-perm
//  - POST /api/robots/:id/stop-and-disable
//  - POST /api/robots/:id/set-dispatchable
//  - POST /api/robots/:id/set-undispatchable-online
//  - POST /api/robots/:id/set-undispatchable-offline
//  - POST /api/robots/:id/pause
//  - POST /api/robots/:id/resume
//  - POST /api/robots/:id/seize-control
//  - POST /api/robots/:id/release-control
//  - GET  /healthz
//
// Wymaga pliku ./api-client.js

const { APIClient } = require("./api-client");
const express = require("express");
const path = require("path");
const fs = require("fs");
const JSON5 = require("json5");

// --------------------------- KONFIGURACJA ------------------------------------

const DEFAULT_CONFIG = {
  rds: {
    host: "http://localhost:8080"
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
  const tasks = isObject(cfg.tasks) ? cfg.tasks : {};
  const flags = isObject(cfg.flags) ? cfg.flags : {};
  const intervals = isObject(cfg.intervals) ? cfg.intervals : {};
  const tempBlock = isObject(cfg.tempBlock) ? cfg.tempBlock : {};
  const dispatch = isObject(cfg.dispatch) ? cfg.dispatch : {};
  const http = isObject(cfg.http) ? cfg.http : {};
  const cleanup = isObject(cfg.cleanup) ? cfg.cleanup : {};
  const managedRobots = Array.isArray(cfg.managedRobots)
    ? cfg.managedRobots.map((s) => String(s))
    : DEFAULT_CONFIG.managedRobots.slice();

  return {
    rds: {
      host: str(rds.host, DEFAULT_CONFIG.rds.host)
    },
    tasks: {
      mainLabel: str(tasks.mainLabel, DEFAULT_CONFIG.tasks.mainLabel),
      putDownLabel: str(tasks.putDownLabel, DEFAULT_CONFIG.tasks.putDownLabel)
    },
    flags: {
      enableAutoStart: bool(flags.enableAutoStart, DEFAULT_CONFIG.flags.enableAutoStart),
      enableAutoKillOnEmptySource: bool(flags.enableAutoKillOnEmptySource, DEFAULT_CONFIG.flags.enableAutoKillOnEmptySource),
      enableDispatchableSnapshotFix: bool(flags.enableDispatchableSnapshotFix, DEFAULT_CONFIG.flags.enableDispatchableSnapshotFix),
      respectDispatchableInAutostart: bool(flags.respectDispatchableInAutostart, DEFAULT_CONFIG.flags.respectDispatchableInAutostart),
      debugLog: bool(flags.debugLog, DEFAULT_CONFIG.flags.debugLog),
      enableOldTaskCleanup: bool(flags.enableOldTaskCleanup, DEFAULT_CONFIG.flags.enableOldTaskCleanup)
    },
    intervals: {
      loopMs: num(intervals.loopMs, DEFAULT_CONFIG.intervals.loopMs),
      emptyTimeoutMs: num(intervals.emptyTimeoutMs, DEFAULT_CONFIG.intervals.emptyTimeoutMs),
      dispatchableFixDelayMs: num(intervals.dispatchableFixDelayMs, DEFAULT_CONFIG.intervals.dispatchableFixDelayMs)
    },
    tempBlock: {
      timeoutMs: num(tempBlock.timeoutMs, DEFAULT_CONFIG.tempBlock.timeoutMs),
      checkEveryNCycles: num(tempBlock.checkEveryNCycles, DEFAULT_CONFIG.tempBlock.checkEveryNCycles),
      tagPrefix: str(tempBlock.tagPrefix, DEFAULT_CONFIG.tempBlock.tagPrefix)
    },
    dispatch: {
      targetActiveTasks: num(dispatch.targetActiveTasks, DEFAULT_CONFIG.dispatch.targetActiveTasks)
    },
    managedRobots,
    http: {
      port: num(http.port, DEFAULT_CONFIG.http.port)
    },
    cleanup: {
      keepTotal: num(cleanup.keepTotal, DEFAULT_CONFIG.cleanup.keepTotal),
      everyNCycles: num(cleanup.everyNCycles, DEFAULT_CONFIG.cleanup.everyNCycles)
    }
  };
}

function loadConfig() {
  const cfgPath = path.join(process.cwd(), "config.runtime.json5");
  if (!fs.existsSync(cfgPath)) {
    console.error(`[FATAL] Missing config.runtime.json5 in ${process.cwd()}.`);
    console.error("[FATAL] Copy seal-config/configs/<env>.json5 to config.runtime.json5 or deploy with SEAL.");
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

// Parametry RDS
const RDS_API_HOST = CFG.rds.host;
const RDS_LOGIN = "admin";
const RDS_PASSWORD = "123456";
const RDS_LANG = "pl";

// Nazwa taska "głównego" i taska PUT-DOWN
const TASK_LABEL = CFG.tasks.mainLabel;
const PUT_DOWN_TASK_LABEL = CFG.tasks.putDownLabel;

// Włączanie / wyłączanie funkcjonalności głównych
const ENABLE_AUTO_START = CFG.flags.enableAutoStart; // auto uruchamianie TASK_LABEL
const ENABLE_AUTO_KILL_ON_EMPTY_SOURCE = CFG.flags.enableAutoKillOnEmptySource; // kill na pustym from / locked

// Czy przy terminateTask ma działać snapshot i przywracanie dispatchable
const ENABLE_DISPATCHABLE_SNAPSHOT_FIX = CFG.flags.enableDispatchableSnapshotFix;

// Interwały czasowe (ms)
const LOOP_INTERVAL_MS = CFG.intervals.loopMs; // główny cykl (i jednocześnie czas próbkowania)
const EMPTY_TIMEOUT_MS = CFG.intervals.emptyTimeoutMs; // jak długo worksite ma być pusty/locked, żeby ubić taska
const DISPATCHABLE_FIX_DELAY_MS = CFG.intervals.dispatchableFixDelayMs; // ile czekamy po terminateTask zanim odtworzymy dispatchable

// Tymczasowe blokowanie pól
const TEMP_BLOCK_TIMEOUT_MS = CFG.tempBlock.timeoutMs; // 5 minut
const TEMP_BLOCK_CHECK_EVERY_N_CYCLES = CFG.tempBlock.checkEveryNCycles; // 60 * 500ms ≈ 30s
const TEMP_BLOCK_TAG_PREFIX = CFG.tempBlock.tagPrefix;

// Logowanie
const DEBUG_LOG = CFG.flags.debugLog; // true = loguj wszystko, false = tylko INFO/ERROR

// Ile jednocześnie aktywnych tasków (status w ACTIVE_TASK_STATUSES) ma być w systemie
//  - jeśli <= 0, przyjmujemy: tyle, ile jest robotów
const TARGET_ACTIVE_TASKS = CFG.dispatch.targetActiveTasks;

// Czy auto-start ma respektować dispatchable.
const RESPECT_DISPATCHABLE_IN_AUTOSTART = CFG.flags.respectDispatchableInAutostart;

// Jedno źródło prawdy: "żywe" statusy tasków bierzemy z APIClient
const ACTIVE_TASK_STATUSES = APIClient.ACTIVE_STATUSES.map(String);

// (opcjonalnie) ograniczenie do wybranych robotów; pusta lista = wszystkie
const MANAGED_ROBOTS = CFG.managedRobots; // np. ["INV-CBD15-LONG-1"]

// HTTP API (prosty UI/admin)
const HTTP_PORT = CFG.http.port;

// Cleanup starych tasków
const ENABLE_OLD_TASK_CLEANUP = CFG.flags.enableOldTaskCleanup; // na razie domyślnie wyłączone
const CLEANUP_KEEP_TOTAL = CFG.cleanup.keepTotal; // ile tasków łącznie trzymamy
const CLEANUP_EVERY_N_CYCLES = CFG.cleanup.everyNCycles; // przy LOOP_INTERVAL_MS=500 => ~5 minut

// --------------------------- HELPERS: MANAGED_ROBOTS / DISPATCHABLE / HEALTH --

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
  if (conn === 0) return false; // offline

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

// --------------------------- LOGOWANIE ---------------------------------------

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

// --------------------- GLOBALNE HANDLERY BŁĘDÓW ------------------------------

process.on("unhandledRejection", (err) => {
  logError("UNHANDLED REJECTION:", err && err.stack ? err.stack : err);
});

process.on("uncaughtException", (err) => {
  logError("UNCAUGHT EXCEPTION:", err && err.stack ? err.stack : err);
});

// ---------------------------- POMOCNICZE -------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Debounce per task (dla logiki killowania)
const taskEmptyState = new Map();

let globalApiClient = null;
let autoStartBlocked = false;
let exclusiveOpInProgress = false;
let cleanupCounter = 0;

// ---------------------- EKSKLUZYWNA OPERACJA (PUT-DOWN / TEMP/PERM-BLOCK / STOP) ----

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

// ---------------------- EKSTRAKCJA STATUS JSON -------------------------------

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

// ---------------------- TAGI TEMP BLOCK --------------------------------------

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

// ---------------------- JEDEN CYKL GŁÓWNY ------------------------------------

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
      logDebug("[RDS] Login OK (sessionId =", api.sessionId, ")");
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

  const statusMap =
    (APIClient.taskStatusDescriptions && APIClient.taskStatusDescriptions[RDS_LANG]) ||
    (APIClient.taskStatusDescriptions && APIClient.taskStatusDescriptions.en) ||
    {};

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

  // Worksite per siteId
  const workSiteByName = new Map();
  for (const ws of workSites) {
    workSiteByName.set(ws.workSiteName, ws);
  }

  // AUTO-START
  if (ENABLE_AUTO_START) {
    await handleAutoStart(api, robots, managedTasks);
  }

  // AUTO-KILL (nie w trakcie operacji ekskluzywnych)
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

// ---------------------- AUTO-START TASKA (GLOBALNIE) ------------------------

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

// ---------------------- NOWA LOGIKA KILL (PER TASK) -------------------------

async function handleNewTaskKill(api, robotsSnapshot, managedTasks, workSiteByName) {
  const now = Date.now();

  const activeTaskIds = new Set(managedTasks.map((t) => t.id));

  // Czyścimy stan debounce dla tasków, które zniknęły
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

    // locked => traktujemy jako puste
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

// ---------------- TERMINATE + SNAPSHOT DISPATCHABLE -------------------------

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

// ---------------------- WSPÓLNA FUNKCJA: ubij taski robota -------------------

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

// ---------------------- POMOCNICZE: znajdź from/to taska TASK_LABEL dla robota --------

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

// ---------------------- PUT-DOWN (PER ROBOT) --------------------------------

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

  // Przywrócenie dispatchable robota
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

// ---------------------- TEMP-BLOCK FROM (PER ROBOT) -------------------------

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

  // Przywrócenie dispatchable robota
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

// ---------------------- PERM-BLOCK FROM (PER ROBOT) --------------------------

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

    // Usuń TEMP_BLOCKED_AT, żeby timeout nie odblokował pola
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

  // Przywrócenie dispatchable robota (żeby wrócił do pracy – pole jest już permanentnie locked)
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

// ---------------------- STOP + DISABLE (PER ROBOT) ---------------------------

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

// ---------------------- CLEANUP STARYCH TASKÓW ------------------------------

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

// ---------------------- ODPOWIADANIE ZA TEMP-BLOCK TIMEOUT ------------------

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

// ---------------------- HTTP API / WEB "UI" ---------------------------------

function startHttpServer() {
  const app = express();
  app.use(express.json());

  // statyczne pliki z katalogu public (UI)
  app.use(express.static(path.join(__dirname, "public")));

  // robots list + task label z RDS (getActiveTasks -> def_label)
  app.get("/api/robots", async (_req, res) => {
    try {
      if (!globalApiClient) {
        return res.status(503).json({ error: "API client not ready" });
      }

      const robotsAll = await globalApiClient.getRobotList();
      const robots = filterManagedRobots(robotsAll);

      // dociągnij aktywne taski i mapuj po agv_id
      let activeTasks = [];
      let tasksError = null;

      try {
        activeTasks = await globalApiClient.getActiveTasks(); // statusy 1000/1002
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

          // task z RDS
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

  // --- Akcje scenariuszowe ---
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

  // --- Sterowanie techniczne ---
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

  // dispatchable
  simpleRobotPost("/api/robots/:robotId/set-dispatchable", (id) => globalApiClient.robotSetDispatchable(id));
  simpleRobotPost("/api/robots/:robotId/set-undispatchable-online", (id) => globalApiClient.robotSetUndispatchableOnline(id));
  simpleRobotPost("/api/robots/:robotId/set-undispatchable-offline", (id) => globalApiClient.robotSetUndispatchableOffline(id));

  // pause/resume
  simpleRobotPost("/api/robots/:robotId/pause", (id) => globalApiClient.robotPause(id));
  simpleRobotPost("/api/robots/:robotId/resume", (id) => globalApiClient.robotResume(id));

  // control gain/release
  simpleRobotPost("/api/robots/:robotId/seize-control", (id) => globalApiClient.robotSeizeControl(id));
  simpleRobotPost("/api/robots/:robotId/release-control", (id) => globalApiClient.robotReleaseControl(id));

  // health
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
    logInfo(`HTTP API listening on http://localhost:${HTTP_PORT}/`);
  });
}

// ---------------------- OBSŁUGA SYGNAŁÓW ------------------------------------

["SIGINT", "SIGTERM"].forEach((sig) => {
  process.on(sig, () => {
    logInfo(`${sig} received – shutting down robot-task-manager...`);
    process.exit(0);
  });
});

// --------------------------- MAIN LOOP ---------------------------------------

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

  const api = new APIClient(RDS_API_HOST, RDS_LOGIN, RDS_PASSWORD, RDS_LANG);
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
