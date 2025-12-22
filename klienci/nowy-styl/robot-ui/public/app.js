// public/app.js

let robotState = {
  name: "AGV-01",
  dispatchState: "REAL_OFFLINE",
  task: {
    id: "",
    status: "",
    externalId: "",
    keyRoute: [],
    msg: "",
    error: "",
    complete: null,
    priority: null,
    alarms: {
      fatals: [],
      errors: [],
      warnings: [],
      notices: []
    }
  },
  control: {
    controlledByRds: true,
    rawUnlock: null
  },
  status: {
    error: false,
    emergency: false,
    blocked: false,
    paused: false,
    lowBattery: false,
    unconfirmedReloc: false,
    disconnect: false,
    invalidMap: false,
    softEmc: false,
    networkDelay: null,
    batteryCycle: null,
    loaded: false,
    confidence: null,
    batteryLevel: null,
    x: null,
    y: null,
    angleRad: null,
    forkHeight: null,
    lastStation: "",
    currentStation: "",
    connectionStatus: 0,
    dispatchableStatus: null,
    charging: false,
    ip: "",
    brake: null,
    vx: null,
    vy: null,
    spin: null,
    steer: null,
    w: null
  },
  alarms: {
    fatals: [],
    errors: [],
    warnings: [],
    notices: []
  },
  systemAlarms: {
    fatals: [],
    errors: [],
    warnings: [],
    notices: []
  },
  // top-level meta
  createOn: null,
  disablePaths: [],
  disablePoints: [],
  dynamicObstacle: {},
  topMsg: "",
  topCode: null,
  topIsError: null,
  basicInfo: {
    model: "",
    version: "",
    dspVersion: "",
    controllerTemp: null,
    controllerHumi: null,
    controllerVoltage: null,
    ip: ""
  },
  orderDebug: {
    priority: null,
    blocks: []
  },
  navDebug: {
    areaResources: [],
    finishedPath: [],
    unfinishedPath: []
  },
  exploDebug: {
    voltage: null,
    current: null,
    odo: null,
    todayOdo: null,
    totalTime: null,
    time: null
  },
  lockDebug: {
    reportLock: {},
    rbkLock: {}
  }
};

let currentTab = "status";

/**
 * Auto-reset UI po bezczynności (domyślnie 60s):
 * - przełącza tab na "status"
 * - przewija panel do góry
 *
 * Konfiguracja:
 * - query param: ?idleMs=60000 (lub ?idle=60000)
 * - albo globalnie: window.UI_IDLE_RESET_MS = 60000 (np. w index.html)
 */
const IDLE_RESET_MS = (() => {
  try {
    const qs = new URLSearchParams(window.location.search || "");
    const q =
      qs.get("idleMs") ||
      qs.get("idle") ||
      qs.get("inactivityMs") ||
      qs.get("inactivity") ||
      "";
    const v = q ? Number(q) : NaN;
    if (Number.isFinite(v) && v > 0) return v;

    const w = Number(window.UI_IDLE_RESET_MS);
    if (Number.isFinite(w) && w > 0) return w;
  } catch {
    // ignore
  }
  return 60_000;
})();

let idleTimer = null;

function scrollMainToTop() {
  const main = document.getElementById("main-scroll");
  if (main) {
    main.scrollTop = 0;
  } else {
    window.scrollTo(0, 0);
  }
}

function applyTabVisibility() {
  const cards = document.querySelectorAll("section.card");
  cards.forEach((card) => {
    const tabs = (card.dataset.tab || "status").split(/\s+/).filter(Boolean);
    card.style.display = tabs.includes(currentTab) ? "" : "none";
  });
}

function setTab(targetTab, { scrollTop = false } = {}) {
  if (!targetTab) return;

  currentTab = targetTab;

  const tabButtons = document.querySelectorAll(".tab");
  tabButtons.forEach((b) => {
    b.classList.toggle("tab-active", b.dataset.tabTarget === targetTab);
  });

  applyTabVisibility();

  if (scrollTop) {
    scrollMainToTop();
  }
}

function resetIdleTimer() {
  if (!(Number.isFinite(IDLE_RESET_MS) && IDLE_RESET_MS > 0)) return;

  if (idleTimer) clearTimeout(idleTimer);

  idleTimer = setTimeout(() => {
    setTab("status", { scrollTop: true });
    resetIdleTimer(); // odpal kolejny cykl
  }, IDLE_RESET_MS);
}

function setupIdleReset() {
  resetIdleTimer();

  // Scroll w panelu (to jest główny „przewijany” obszar)
  const main = document.getElementById("main-scroll");
  if (main) {
    main.addEventListener("scroll", resetIdleTimer, { passive: true });
  }

  // Kliknięcia / dotyk / kółko / klawiatura itp.
  ["click", "pointerdown", "touchstart", "touchmove", "wheel", "keydown"].forEach((ev) => {
    document.addEventListener(ev, resetIdleTimer, { passive: true });
  });
}

async function fetchRobotStateFromServer() {
  try {
    const resp = await fetch("/api/robot/state");
    if (!resp.ok) {
      console.error("Błąd /api/robot/state:", await resp.text());
      return;
    }
    const data = await resp.json();

    robotState = data;
    renderAll();
  } catch (err) {
    console.error("fetchRobotStateFromServer error:", err);
  }
}

async function callDispatchEndpoint(path) {
  resetIdleTimer();
  try {
    const resp = await fetch(path, { method: "POST" });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      console.error("Błąd wywołania", path, resp.status, txt);
      alert("Nie udało się zmienić stanu dostępności.");
    }
  } catch (err) {
    console.error("callDispatchEndpoint error:", err);
    alert("Błąd połączenia z backendem przy zmianie dostępności.");
  }
}

async function callRobotAction(path) {
  resetIdleTimer();
  console.log("[UI] callRobotAction start:", path);
  try {
    const resp = await fetch(path, { method: "POST" });
    console.log("[UI] callRobotAction response:", path, "status =", resp.status);
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      console.error("Błąd wywołania", path, resp.status, txt);
      alert("Nie udało się wykonać akcji robota.");
    }
  } catch (err) {
    console.error("callRobotAction error:", err);
    alert("Błąd połączenia z backendem przy akcji robota.");
  }
}

function renderDispatch() {
  const badge = document.getElementById("dispatch-badge");
  const dot = document.getElementById("dispatch-dot");
  const label = document.getElementById("dispatch-label");
  if (!badge || !dot || !label) return;

  badge.classList.remove("badge-dispatch-ok", "badge-dispatch-undispatchable");
  dot.classList.remove("dot-undispatchable", "dot-offline");

  let text = "—";

  switch (robotState.dispatchState) {
    case "DISPATCHABLE":
      text = "Dostępny";
      badge.classList.add("badge-dispatch-ok");
      break;
    case "UNDISPATCHABLE_ONLINE":
      text = "Niedostępny ONLINE";
      badge.classList.add("badge-dispatch-undispatchable");
      dot.classList.add("dot-undispatchable"); // żółta
      break;
    case "UNDISPATCHABLE_OFFLINE":
      text = "Niedostępny OFFLINE";
      badge.classList.add("badge-dispatch-undispatchable");
      dot.classList.add("dot-offline"); // czerwona
      break;
    case "REAL_OFFLINE":
      text = "Offline (brak połączenia)";
      badge.classList.add("badge-dispatch-undispatchable");
      dot.classList.add("dot-offline");
      break;
    default:
      text = "Nieznany stan";
      badge.classList.add("badge-dispatch-undispatchable");
  }

  label.textContent = text;
}

function renderTask() {
  const idEl = document.getElementById("task-id");
  const externalEl = document.getElementById("task-external-id");
  const keyRouteEl = document.getElementById("task-key-route");
  const stEl = document.getElementById("task-status");
  const msgEl = document.getElementById("task-msg");
  const errEl = document.getElementById("task-error");
  const completeEl = document.getElementById("task-complete");
  const prioEl = document.getElementById("task-priority");

  if (idEl) idEl.textContent = robotState.task?.id || "—";
  if (externalEl) externalEl.textContent = robotState.task?.externalId || "—";

  if (keyRouteEl) {
    const kr = robotState.task?.keyRoute;
    let text = "—";
    if (Array.isArray(kr) && kr.length > 0) {
      text = kr.join(", ");
    } else if (typeof kr === "string" && kr.trim() !== "") {
      text = kr;
    }
    keyRouteEl.textContent = text;
  }

  if (stEl) stEl.textContent = robotState.task?.status || "—";
  if (msgEl) msgEl.textContent = robotState.task?.msg || "—";
  if (errEl) errEl.textContent = robotState.task?.error || "—";

  if (completeEl) {
    const c = robotState.task?.complete;
    if (c === null || c === undefined) {
      completeEl.textContent = "—";
    } else {
      completeEl.textContent = c ? "Tak" : "Nie";
    }
  }

  if (prioEl) {
    const p = robotState.task?.priority;
    prioEl.textContent = p === null || p === undefined ? "—" : String(p);
  }
}

function renderControl() {
  const byRds = robotState.control && robotState.control.controlledByRds;
  const statusText = byRds ? "RDS" : "Zewnętrzna";
  const statusEl = document.getElementById("control-status");
  if (statusEl) statusEl.textContent = statusText;
}

function renderStatusInfo() {
  const s = robotState.status || {};

  const errorEl = document.getElementById("status-error");
  const emergencyEl = document.getElementById("status-emergency");
  const blockedEl = document.getElementById("status-blocked");
  const pausedEl = document.getElementById("status-paused");
  const lowBatteryEl = document.getElementById("status-low-battery");
  const unconfRelocEl = document.getElementById("status-unconfirmed-reloc");
  const disconnectEl = document.getElementById("status-disconnect");
  const invalidMapEl = document.getElementById("status-invalid-map");
  const softEmcEl = document.getElementById("status-soft-emc");
  const networkDelayEl = document.getElementById("status-network-delay");
  const batteryCycleEl = document.getElementById("status-battery-cycle");
  const loadedEl = document.getElementById("status-loaded");
  const confidenceEl = document.getElementById("status-confidence");
  const batteryEl = document.getElementById("status-battery");
  const xyEl = document.getElementById("status-xy");
  const forkEl = document.getElementById("status-fork-height");
  const currentStationEl = document.getElementById("status-current-station");
  const lastStationEl = document.getElementById("status-last-station");
  const chargingEl = document.getElementById("status-charging");
  const ipEl = document.getElementById("status-ip");
  const brakeEl = document.getElementById("status-brake");
  const vxEl = document.getElementById("status-vx");
  const vyEl = document.getElementById("status-vy");
  const spinEl = document.getElementById("status-spin");
  const steerEl = document.getElementById("status-steer");
  const wEl = document.getElementById("status-w");

  if (errorEl) errorEl.textContent = s.error ? "Tak" : "Nie";
  if (emergencyEl) emergencyEl.textContent = s.emergency ? "Tak" : "Nie";
  if (blockedEl) blockedEl.textContent = s.blocked ? "Tak" : "Nie";
  if (pausedEl) pausedEl.textContent = s.paused ? "Tak" : "Nie";
  if (lowBatteryEl) lowBatteryEl.textContent = s.lowBattery ? "Tak" : "Nie";
  if (unconfRelocEl) unconfRelocEl.textContent = s.unconfirmedReloc ? "Tak" : "Nie";
  if (disconnectEl) disconnectEl.textContent = s.disconnect ? "Tak" : "Nie";
  if (invalidMapEl) invalidMapEl.textContent = s.invalidMap ? "Tak" : "Nie";
  if (softEmcEl) softEmcEl.textContent = s.softEmc ? "Tak" : "Nie";

  if (networkDelayEl) {
    networkDelayEl.textContent = typeof s.networkDelay === "number" ? String(s.networkDelay) : "—";
  }

  if (batteryCycleEl) {
    batteryCycleEl.textContent = typeof s.batteryCycle === "number" ? String(s.batteryCycle) : "—";
  }

  if (loadedEl) loadedEl.textContent = s.loaded ? "Tak" : "Nie";

  if (confidenceEl) {
    if (typeof s.confidence === "number") {
      const pct = Math.round(s.confidence * 100);
      confidenceEl.textContent = pct + " %";
    } else {
      confidenceEl.textContent = "—";
    }
  }

  if (batteryEl) {
    if (typeof s.batteryLevel === "number") {
      const pct = Math.round(s.batteryLevel * 100);
      batteryEl.textContent = pct + " %";
    } else {
      batteryEl.textContent = "—";
    }
  }

  if (chargingEl) {
    chargingEl.textContent =
      s.charging === null || s.charging === undefined ? "—" : s.charging ? "Tak" : "Nie";
  }

  if (brakeEl) {
    brakeEl.textContent = s.brake === null || s.brake === undefined ? "—" : s.brake ? "Tak" : "Nie";
  }

  if (vxEl) vxEl.textContent = typeof s.vx === "number" ? String(s.vx) : "—";
  if (vyEl) vyEl.textContent = typeof s.vy === "number" ? String(s.vy) : "—";
  if (spinEl) spinEl.textContent = typeof s.spin === "number" ? String(s.spin) : "—";
  if (steerEl) steerEl.textContent = typeof s.steer === "number" ? String(s.steer) : "—";
  if (wEl) wEl.textContent = typeof s.w === "number" ? String(s.w) : "—";

  if (xyEl) {
    if (typeof s.x === "number" && typeof s.y === "number") {
      const xStr = s.x.toFixed(2);
      const yStr = s.y.toFixed(2);
      let angleStr = "—";
      if (typeof s.angleRad === "number") {
        const deg = (s.angleRad * 180) / Math.PI;
        angleStr = deg.toFixed(1);
      }
      xyEl.innerHTML = xStr + ";&nbsp;&nbsp;&nbsp;" + yStr + ";&nbsp;&nbsp;&nbsp;" + angleStr;
    } else {
      xyEl.textContent = "—";
    }
  }

  if (forkEl) {
    forkEl.textContent = typeof s.forkHeight === "number" ? s.forkHeight.toFixed(3) : "—";
  }

  if (currentStationEl) currentStationEl.textContent = s.currentStation || "—";
  if (lastStationEl) lastStationEl.textContent = s.lastStation || "—";
  if (ipEl) ipEl.textContent = s.ip || "—";
}

function renderAlarmsList(src, containerId, emptyLabel) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  const alarmsSrc = src || {};
  const rows = [];
  ["fatals", "errors", "warnings", "notices"].forEach((key) => {
    const arr = alarmsSrc[key];
    if (!Array.isArray(arr)) return;
    arr.forEach((text) => rows.push({ type: key.slice(0, -1), text }));
  });

  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "alarm-row";
    const t = document.createElement("span");
    t.className = "alarm-text";
    t.textContent = emptyLabel || "Brak aktywnych alarmów";
    empty.appendChild(t);
    container.appendChild(empty);
    return;
  }

  rows.forEach(({ type, text }) => {
    const row = document.createElement("div");
    row.className = "alarm-row";

    const tag = document.createElement("span");
    tag.className = "alarm-tag";
    let label = "";
    if (type === "fatal") {
      label = "FATAL";
      tag.classList.add("alarm-fatal");
    } else if (type === "error") {
      label = "ERROR";
      tag.classList.add("alarm-error");
    } else if (type === "warning") {
      label = "WARN";
      tag.classList.add("alarm-warning");
    } else {
      label = "NOTICE";
      tag.classList.add("alarm-notice");
    }
    tag.textContent = label;

    const txt = document.createElement("span");
    txt.className = "alarm-text";
    txt.textContent = text;

    row.appendChild(tag);
    row.appendChild(txt);
    container.appendChild(row);
  });
}

function setupTabs() {
  const tabButtons = document.querySelectorAll(".tab");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tabTarget;
      if (!target) return;
      setTab(target);
      resetIdleTimer();
    });
  });

  applyTabVisibility();
}

function renderCandidates() {
  // Wyłączone elementy mapy
  const elDisabled = document.getElementById("cand-disabled-map");
  if (elDisabled) {
    const paths = robotState.disablePaths || [];
    const points = robotState.disablePoints || [];
    if (!paths.length && !points.length) {
      elDisabled.textContent = "Brak wyłączonych ścieżek i punktów.";
    } else {
      let out = "";
      if (paths.length) {
        out += "Wyłączone ścieżki:\n";
        out += paths.map((p) => `- ${p}`).join("\n");
      }
      if (points.length) {
        if (out) out += "\n\n";
        out += "Wyłączone punkty:\n";
        out += points.map((p) => `- ${p}`).join("\n");
      }
      elDisabled.textContent = out;
    }
  }

  // Dynamiczne przeszkody
  const elDyn = document.getElementById("cand-dyn-obstacles");
  if (elDyn) {
    const dyn = robotState.dynamicObstacle || {};
    if (!dyn || Object.keys(dyn).length === 0) {
      elDyn.textContent = "Brak dynamicznych przeszkód.";
    } else {
      elDyn.textContent = JSON.stringify(dyn, null, 2);
    }
  }

  // Model i wersja (informacje)
  const bi = robotState.basicInfo || {};
  const modelEl = document.getElementById("cand-model");
  const verEl = document.getElementById("cand-version");
  const dspEl = document.getElementById("cand-dsp-version");
  if (modelEl) modelEl.textContent = bi.model || "—";
  if (verEl) verEl.textContent = bi.version || "—";
  if (dspEl) dspEl.textContent = bi.dspVersion || "—";

  // Eksploatacja
  const ex = robotState.exploDebug || {};
  const vEl = document.getElementById("cand-voltage");
  const cEl = document.getElementById("cand-current");
  const odoEl = document.getElementById("cand-odo");
  const todoEl = document.getElementById("cand-today-odo");
  const ttimeEl = document.getElementById("cand-total-time");
  const timeEl = document.getElementById("cand-time");

  const fmtNum = (v) => (v === null || v === undefined || Number.isNaN(v) ? "—" : String(v));

  if (vEl) vEl.textContent = fmtNum(ex.voltage);
  if (cEl) cEl.textContent = fmtNum(ex.current);
  if (odoEl) odoEl.textContent = fmtNum(ex.odo);
  if (todoEl) todoEl.textContent = fmtNum(ex.todayOdo);
  if (ttimeEl) ttimeEl.textContent = fmtNum(ex.totalTime);
  if (timeEl) timeEl.textContent = fmtNum(ex.time);

  // Sterownik
  const ctrlTempEl = document.getElementById("cand-ctrl-temp");
  const ctrlHumiEl = document.getElementById("cand-ctrl-humi");
  const ctrlVoltEl = document.getElementById("cand-ctrl-voltage");
  if (ctrlTempEl) ctrlTempEl.textContent = fmtNum(bi.controllerTemp);
  if (ctrlHumiEl) ctrlHumiEl.textContent = fmtNum(bi.controllerHumi);
  if (ctrlVoltEl) ctrlVoltEl.textContent = fmtNum(bi.controllerVoltage);

  // Bloki zlecenia
  const blocksEl = document.getElementById("cand-blocks");
  if (blocksEl) {
    const od = robotState.orderDebug || {};
    const blocks = od.blocks || [];
    if (!blocks.length) {
      blocksEl.textContent = "Brak bloków zlecenia.";
    } else {
      let out = "";
      const fmtObj = (obj) => {
        if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
          return obj && typeof obj === "object" ? JSON.stringify(obj) : obj == null ? "" : String(obj);
        }
        return JSON.stringify(obj);
      };

      blocks.forEach((b, idx) => {
        out += `#${idx + 1}\n`;
        out += `  location: ${b.location || ""}\n`;
        out += `  state: ${b.state || ""}\n`;
        out += `  blockId: ${b.blockId || ""}\n`;
        out += `  script_name: ${b.script_name || ""}\n`;
        out += `  script_args: ${fmtObj(b.script_args)}\n`;
        out += `  operation: ${b.operation || ""}\n`;
        out += `  operation_args: ${fmtObj(b.operation_args)}\n`;
        out += `  binTask: ${b.binTask || ""}\n`;
        out += `  manuallyFinished: ${
          b.manuallyFinished === undefined || b.manuallyFinished === null ? "" : b.manuallyFinished ? "true" : "false"
        }\n\n`;
      });
      blocksEl.textContent = out.trimEnd();
    }
  }

  // Zajęte obszary
  const areasEl = document.getElementById("cand-areas");
  if (areasEl) {
    const nav = robotState.navDebug || {};
    const ars = nav.areaResources || [];
    if (!ars.length) {
      areasEl.textContent = "Brak zajętych obszarów.";
    } else {
      let out = "";
      ars.forEach((a, idx) => {
        out += `#${idx + 1}: area=${a.area_name || ""}\n`;

        const avo = a.avoidObs_area_occupied;
        if (avo && typeof avo.x === "number" && typeof avo.y === "number" && typeof avo.radius === "number" && avo.radius >= 0) {
          out += `  Avoid obstacle: center=(${avo.x}, ${avo.y}), r=${avo.radius}\n`;
        }

        const po = a.path_occupied || [];
        if (po.length) {
          out += "  Path occupied:\n";
          po.forEach((p) => {
            out += `   - ${p.source_id || ""} -> ${p.end_id || ""} [${p.start_percentage ?? "?"}–${p.end_percentage ?? "?"}]\n`;
          });
        }

        const bo = a.blocks_occupied || [];
        if (bo.length) {
          out += "  Blocks occupied:\n";
          bo.forEach((b) => {
            out += `   - ${JSON.stringify(b)}\n`;
          });
        }

        out += "\n";
      });
      areasEl.textContent = out.trimEnd();
    }
  }

  // Ścieżka (path)
  const pathsEl = document.getElementById("cand-paths");
  if (pathsEl) {
    const nav = robotState.navDebug || {};
    const fin = nav.finishedPath || [];
    const unfin = nav.unfinishedPath || [];
    let out = "";
    if (fin.length) {
      out += "Finished path:\n";
      out += fin.map((id) => `- ${id}`).join("\n");
    }
    if (unfin.length) {
      if (out) out += "\n\n";
      out += "Unfinished path:\n";
      out += unfin.map((id) => `- ${id}`).join("\n");
    }
    if (!out) out = "Brak danych ścieżki.";
    pathsEl.textContent = out;
  }

  // Locki
  const lock = robotState.lockDebug || {};
  const rep = lock.reportLock || {};
  const fmtBool = (v) => (v === null || v === undefined ? "—" : v ? "Tak" : "Nie");

  const rNickEl = document.getElementById("cand-lock-report-nick");
  const rIpEl = document.getElementById("cand-lock-report-ip");
  const rTypeEl = document.getElementById("cand-lock-report-type");
  const rLockedEl = document.getElementById("cand-lock-report-locked");

  if (rNickEl) rNickEl.textContent = rep.nick_name || "—";
  if (rIpEl) rIpEl.textContent = rep.ip || "—";
  if (rTypeEl) rTypeEl.textContent = rep.type === undefined ? "—" : String(rep.type);
  if (rLockedEl) rLockedEl.textContent = fmtBool(rep.locked);
}

function renderAll() {
  const nameEl = document.getElementById("robot-name");
  if (nameEl) nameEl.textContent = robotState.name || "AGV";

  renderStatusInfo();
  renderDispatch();
  renderTask();
  renderControl();

  renderAlarmsList(robotState.alarms, "alarms-list", "Brak aktywnych alarmów robota");
  renderAlarmsList(robotState.task && robotState.task.alarms, "task-alarms-list", "Brak aktywnych alarmów zadania");
  renderAlarmsList(robotState.systemAlarms, "system-alarms-list", "Brak aktywnych alarmów systemu");

  renderCandidates();

  const createEl = document.getElementById("report-create-on");
  if (createEl) {
    const v = robotState.createOn;
    if (v) {
      const d = new Date(v);
      createEl.textContent = Number.isNaN(d.getTime()) ? v : d.toLocaleString();
    } else {
      createEl.textContent = "—";
    }
  }

  const msgEl = document.getElementById("top-status-msg");
  const codeEl = document.getElementById("top-status-code");
  const errEl = document.getElementById("top-status-error");

  if (msgEl) msgEl.textContent = robotState.topMsg || "—";
  if (codeEl) {
    const c = robotState.topCode;
    codeEl.textContent = c === null || c === undefined ? "—" : String(c);
  }
  if (errEl) {
    const e = robotState.topIsError;
    errEl.textContent = e === null || e === undefined ? "—" : e ? "Tak" : "Nie";
  }
}

function setupHoldButton(button, endpoint) {
  let timer = null;

  const start = () => {
    if (timer) return;
    callRobotAction(endpoint);
    timer = setInterval(() => {
      callRobotAction(endpoint);
    }, 250);
  };

  const stop = () => {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  };

  button.addEventListener("mousedown", start);
  button.addEventListener("touchstart", (e) => {
    e.preventDefault();
    start();
  });

  ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach((ev) => {
    button.addEventListener(ev, stop);
  });
}

function setupControls() {
  const btnDispatchable = document.getElementById("btn-dispatchable");
  const btnUndOnline = document.getElementById("btn-undispatchable-online");
  const btnUndOffline = document.getElementById("btn-undispatchable-offline");
  const btnSoftOn = document.getElementById("btn-soft-emc-on");
  const btnSoftOff = document.getElementById("btn-soft-emc-off");

  if (btnDispatchable) {
    btnDispatchable.addEventListener("click", async () => {
      await callDispatchEndpoint("/api/robot/dispatchable");
      fetchRobotStateFromServer();
    });
  }
  if (btnUndOnline) {
    btnUndOnline.addEventListener("click", async () => {
      await callDispatchEndpoint("/api/robot/undispatchable-online");
      fetchRobotStateFromServer();
    });
  }
  if (btnUndOffline) {
    btnUndOffline.addEventListener("click", async () => {
      await callDispatchEndpoint("/api/robot/undispatchable-offline");
      fetchRobotStateFromServer();
    });
  }

  if (btnSoftOn) {
    btnSoftOn.addEventListener("click", async () => {
      await callRobotAction("/api/robot/soft-emergency");
      fetchRobotStateFromServer();
    });
  }
  if (btnSoftOff) {
    btnSoftOff.addEventListener("click", async () => {
      await callRobotAction("/api/robot/soft-emergency-cancel");
      fetchRobotStateFromServer();
    });
  }

  const btnPauseTask = document.getElementById("btn-pause-task");
  const btnResumeTask = document.getElementById("btn-resume-task");
  const btnStopTask = document.getElementById("btn-stop-task");
  const btnStopAndDrop = document.getElementById("btn-stop-and-drop");

  if (btnResumeTask) {
    btnResumeTask.addEventListener("click", async () => {
      await callRobotAction("/api/robot/resume");
      fetchRobotStateFromServer();
    });
  }
  if (btnPauseTask) {
    btnPauseTask.addEventListener("click", async () => {
      await callRobotAction("/api/robot/pause");
      fetchRobotStateFromServer();
    });
  }

  if (btnStopTask) {
    btnStopTask.addEventListener("click", async () => {
      console.log("[UI] Kliknięto przycisk ZAKOŃCZ + NIEDOSTĘPNY");
      await callRobotAction("/api/robot/terminate");
      fetchRobotStateFromServer();
    });
  }

  if (btnStopAndDrop) {
    btnStopAndDrop.addEventListener("click", () => {
      resetIdleTimer();
      console.log("Podnieś widły i odłóż towar (symulacja)");
    });
  }

  const btnSeize = document.getElementById("btn-seize");
  const btnRelease = document.getElementById("btn-release");

  if (btnSeize) {
    btnSeize.addEventListener("click", async () => {
      console.log("[UI] Kliknięto przycisk PRZEJMIJ KONTROLĘ");
      await callRobotAction("/api/robot/seize-control");
      fetchRobotStateFromServer();
    });
  }
  if (btnRelease) {
    btnRelease.addEventListener("click", async () => {
      console.log("[UI] Kliknięto przycisk ODDAJ KONTROLĘ");
      await callRobotAction("/api/robot/release-control");
      fetchRobotStateFromServer();
    });
  }

  const btnLift = document.getElementById("btn-lift-forks");
  const btnLower = document.getElementById("btn-lower-forks");
  if (btnLift) {
    btnLift.addEventListener("click", async () => {
      console.log("[UI] Kliknięto PODNIEŚ WIDŁY (wysoki poziom)");
      await callRobotAction("/api/robot/fork-high");
      fetchRobotStateFromServer();
    });
  }
  if (btnLower) {
    btnLower.addEventListener("click", async () => {
      console.log("[UI] Kliknięto OPUŚĆ WIDŁY (niski poziom)");
      await callRobotAction("/api/robot/fork-low");
      fetchRobotStateFromServer();
    });
  }

  const btnClearErrors = document.getElementById("btn-clear-errors");
  if (btnClearErrors) {
    btnClearErrors.addEventListener("click", async () => {
      console.log("[UI] Kliknięto przycisk KASUJ WSZYSTKIE BŁĘDY");
      await callRobotAction("/api/robot/clear-errors");
      fetchRobotStateFromServer();
    });
  }

  const btnDumpStatus = document.getElementById("btn-dump-status");
  if (btnDumpStatus) {
    btnDumpStatus.addEventListener("click", async () => {
      resetIdleTimer();
      try {
        const resp = await fetch("/api/robot/raw");
        if (!resp.ok) {
          alert("Nie udało się pobrać danych getRobotListRaw");
          return;
        }
        const raw = await resp.json();
        const blob = new Blob([JSON.stringify(raw, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        a.download = `robot_status_${ts}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Błąd przy Zgraj status:", err);
      }
    });
  }

  // Zadania ręczne
  const btnDeleteManualTasks = document.getElementById("btn-delete-manual-tasks");
  if (btnDeleteManualTasks) {
    btnDeleteManualTasks.addEventListener("click", async () => {
      await callRobotAction("/api/robot/manual-tasks/delete");
      fetchRobotStateFromServer();
    });
  }

  const btnAddManualDropTask = document.getElementById("btn-add-manual-drop-task");
  if (btnAddManualDropTask) {
    btnAddManualDropTask.addEventListener("click", async () => {
      await callRobotAction("/api/robot/manual-tasks/add-drop");
      fetchRobotStateFromServer();
    });
  }
}

function setupHoldMotionButton(button, moveEndpoint, stopEndpoint) {
  let timer = null;

  const start = (e) => {
    if (timer) return;
    if (e && typeof e.preventDefault === "function") e.preventDefault();

    callRobotAction(moveEndpoint);
    timer = setInterval(() => {
      callRobotAction(moveEndpoint);
    }, 250);
  };

  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    callRobotAction(stopEndpoint);
  };

  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", stop);
  button.addEventListener("pointercancel", stop);
  button.addEventListener("pointerleave", stop);
}

function setupDpad() {
  const stopEndpoint = "/api/robot/move-stop";

  const buttons = document.querySelectorAll(".dpad [data-endpoint]");
  buttons.forEach((btn) => {
    const ep = btn.dataset.endpoint;
    if (!ep) return;

    if (ep === stopEndpoint) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        callRobotAction(stopEndpoint);
      });
    } else {
      setupHoldMotionButton(btn, ep, stopEndpoint);
    }
  });
}

function setupKeyboardMotion() {
  const stopEndpoint = "/api/robot/move-stop";
  const pressed = { up: false, down: false, left: false, right: false };

  let currentEndpoint = null;
  let timer = null;

  const computeEndpoint = () => {
    const { up, down, left, right } = pressed;

    if (up && left) return "/api/robot/move-forward-left";
    if (up && right) return "/api/robot/move-forward-right";
    if (down && left) return "/api/robot/move-backward-left";
    if (down && right) return "/api/robot/move-backward-right";

    if (up) return "/api/robot/move-forward";
    if (down) return "/api/robot/move-backward";
    if (left) return "/api/robot/move-left";
    if (right) return "/api/robot/move-right";

    return null;
  };

  const stopMotion = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    currentEndpoint = null;
    callRobotAction(stopEndpoint);
  };

  const applyMotion = () => {
    const ep = computeEndpoint();

    if (ep === currentEndpoint) return;

    currentEndpoint = ep;

    if (!ep) {
      stopMotion();
      return;
    }

    // strzał „od razu” + potem co 250ms
    callRobotAction(ep);
    if (!timer) {
      timer = setInterval(() => {
        if (currentEndpoint) callRobotAction(currentEndpoint);
      }, 250);
    }
  };

  const isArrow = (k) => ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k);

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.repeat) return;

      if (isArrow(e.key) || e.key === " ") e.preventDefault();

      if (e.key === "ArrowUp") pressed.up = true;
      if (e.key === "ArrowDown") pressed.down = true;
      if (e.key === "ArrowLeft") pressed.left = true;
      if (e.key === "ArrowRight") pressed.right = true;

      if (e.key === " ") {
        pressed.up = pressed.down = pressed.left = pressed.right = false;
        stopMotion();
        return;
      }

      if (isArrow(e.key)) applyMotion();
    },
    { passive: false }
  );

  document.addEventListener(
    "keyup",
    (e) => {
      if (isArrow(e.key) || e.key === " ") e.preventDefault();

      if (e.key === "ArrowUp") pressed.up = false;
      if (e.key === "ArrowDown") pressed.down = false;
      if (e.key === "ArrowLeft") pressed.left = false;
      if (e.key === "ArrowRight") pressed.right = false;

      if (isArrow(e.key)) applyMotion();
    },
    { passive: false }
  );

  window.addEventListener("blur", () => {
    pressed.up = pressed.down = pressed.left = pressed.right = false;
    stopMotion();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupControls();
  setupIdleReset();

  // upewniamy się, że startowo jest status + góra (jak po uruchomieniu)
  setTab("status", { scrollTop: true });

  renderAll();
  fetchRobotStateFromServer();
  setInterval(fetchRobotStateFromServer, 1000);

setupDpad();
setupKeyboardMotion();
});
