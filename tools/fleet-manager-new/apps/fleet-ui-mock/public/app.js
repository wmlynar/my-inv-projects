(() => {
  const SESSION_KEY = "fleetManagerSession";
  const PACKAGING_STATE_KEY = "fleetManagerPackagingState";
  const LINE_REQUEST_KEY = "fleetManagerLineRequests";
  const PACKAGING_SIGNATURE_KEY = "fleetManagerPackagingSignature";
  const OPS_STATE_KEY = "fleetManagerOpsState";
  const SETTINGS_KEY = "fleetManagerSettings";
  const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const DEFAULT_USER = { username: "admin", password: "123456" };
  const WORKSITE_OCCUPANCY = ["empty", "filled"];
  const LABEL_SIZE_PX = 40;
  const LABEL_OFFSET_PX = 40;
  const NODE_LABEL_SIZE_PX = 40;
  const NODE_LABEL_OFFSET_PX = -40;
  const NODE_LABEL_MIN_ZOOM = 1;
  const LABEL_MIN_ZOOM = NODE_LABEL_MIN_ZOOM;
  const MAP_OUTER_MARGIN = 10;
  const WORKSITE_AP_OFFSET = 0.5;
  const WORKSITE_POS_MAX_DRIFT = 2.6;
  const ORDER_ASC = "asc";
  const ORDER_DESC = "desc";
  const SIM_TICK_MS = 140;
  const DIAG_STALE_MIN_MS = 1200;
  const DIAG_STALE_MULTIPLIER = 6;
  const ROBOT_TURN_RATE_RAD_S = Math.PI;
  const ROBOT_RADIUS = 0.6;
  const DEFAULT_ROBOT_MODEL = { head: 0.5, tail: 2, width: 1 };
  const OBSTACLE_RADIUS = 0.8;
  const MANUAL_DRIVE_SPEED_MPS = 0.6;
  const SIM_API_BASE = "/api/sim";
  const FLEET_API_BASE_DEFAULT = "/api/fleet";
  const FLEET_CONFIG_PATH = "/api/fleet/config";
  const FLEET_STREAM_PATH_DEFAULT = "/api/fleet/stream";
  const FLEET_STATE_PATH_DEFAULT = "/api/fleet/state";
  const LOCAL_SIM_MODE = "local";
  const ROBOKIT_SIM_MODE = "robokit";
  const ALGORITHM_CATALOG_PATH = "/api/algorithms/catalog";
  const SIM_MODE_OPTIONS = [
    { value: LOCAL_SIM_MODE, label: "Lokalny (fleet manager)" },
    { value: ROBOKIT_SIM_MODE, label: "Robokit (proxy)" }
  ];
  const DEFAULT_DISPATCH_LABELS = {
    nearest: "Najblizszy robot",
    first: "Pierwszy dostepny"
  };
  const DEFAULT_TRAFFIC_LABELS = {
    simple: "Simple",
    "pulse-mapf": "Pulse MAPF",
    "pulse-mapf-avoid": "Pulse MAPF (avoid)",
    "pulse-mapf-time": "Pulse MAPF (time)",
    sipp: "SIPP (segmenty)",
    "sipp-kinodynamic": "SIPP (kinodynamic)",
    "sipp-robust": "SIPP (robust)",
    "ecbs-sipp": "ECBS+SIPP",
    "cbs-sipp": "CBS+SIPP",
    "cbs-full": "CBS full + SIPP",
    "mapf-global": "MAPF global",
    "mapf-pibt": "MAPF PIBT",
    "mapf-mstar": "MAPF M*",
    "mapf-smt": "MAPF SMT"
  };
  const AXIS_LABELS = {
    objective: "Objective",
    assignment: "Assignment",
    fairness: "Fairness",
    preemption: "Preemption",
    batching: "Batching",
    replan: "Replan",
    scope: "Scope",
    searchSpace: "Search space",
    timeModel: "Time model",
    optimality: "Optimality",
    kinematics: "Kinematics",
    granularity: "Granularity",
    locking: "Locking",
    release: "Release",
    mechanism: "Mechanism",
    response: "Response",
    clearance: "Clearance",
    control: "Control",
    speedProfile: "Speed profile",
    tracking: "Tracking",
    resolution: "Resolution"
  };
  const DISPATCH_STRATEGY_OPTIONS = [
    { value: "nearest", label: "Najblizszy robot" },
    { value: "first", label: "Pierwszy dostepny" }
  ];
  const TRAFFIC_STRATEGY_OPTIONS = [
    { value: "simple", label: "Simple" },
    { value: "pulse-mapf", label: "Pulse MAPF" },
    { value: "pulse-mapf-avoid", label: "Pulse MAPF (avoid)" },
    { value: "pulse-mapf-time", label: "Pulse MAPF (time)" },
    { value: "sipp", label: "SIPP (segmenty)" },
    { value: "sipp-kinodynamic", label: "SIPP (kinodynamic)" },
    { value: "sipp-robust", label: "SIPP (robust)" },
    { value: "ecbs-sipp", label: "ECBS+SIPP" },
    { value: "cbs-sipp", label: "CBS+SIPP" },
    { value: "cbs-full", label: "CBS full + SIPP" },
    { value: "mapf-global", label: "MAPF global" },
    { value: "mapf-pibt", label: "MAPF PIBT" },
    { value: "mapf-mstar", label: "MAPF M*" },
    { value: "mapf-smt", label: "MAPF SMT" }
  ];
  const MANUAL_KEY_MAP = {
    arrowup: "up",
    w: "up",
    arrowdown: "down",
    s: "down",
    arrowleft: "left",
    a: "left",
    arrowright: "right",
    d: "right"
  };
  const PackagingEngine = window.PackagingEngine || null;
  const FleetDomain = window.FleetDomain || {};
  const domainStore = FleetDomain.InMemoryStore
    ? new FleetDomain.InMemoryStore({ robots: [], tasks: [] })
    : null;
  const robotRepo = FleetDomain.RobotRepository ? new FleetDomain.RobotRepository(domainStore) : null;
  const taskRepo = FleetDomain.TaskRepository ? new FleetDomain.TaskRepository(domainStore) : null;
  const robotService = FleetDomain.RobotService ? new FleetDomain.RobotService(robotRepo) : null;

  const viewMeta = {
    map: {
      title: "Mapa",
      subtitle: "Graf, worksite i roboty w czasie rzeczywistym."
    },
    robots: {
      title: "Roboty",
      subtitle: "Lista robotow i ich statusy operacyjne."
    },
    streams: {
      title: "Streamy",
      subtitle: "Konfiguracja strumieni pracy i grup."
    },
    scenes: {
      title: "Sceny",
      subtitle: "Zarzadzanie mapami i aktywna scena."
    },
    settings: {
      title: "Ustawienia",
      subtitle: "Tryby symulatora i algorytmy sterowania."
    },
    fields: {
      title: "Pola",
      subtitle: "Lista worksite i ich aktualny stan."
    },
    packaging: {
      title: "Bufory",
      subtitle: "Bufory produkcyjne i magazynowe oraz zgłoszenia strumieni."
    },
    tasks: {
      title: "Zadania",
      subtitle: "Aktywne zadania wykonywane przez fleet manager."
    },
    traffic: {
      title: "Diagnostyka ruchu",
      subtitle: "Blokady, kolejki i stany zastoju w czasie rzeczywistym."
    },
    faults: {
      title: "Awarie",
      subtitle: "Symulowane blokady i przeszkody."
    }
  };

  const loginView = document.getElementById("login-view");
  const appView = document.getElementById("app-view");
  const loginForm = document.getElementById("login-form");
  const loginUserInput = document.getElementById("login-user");
  const loginPassInput = document.getElementById("login-pass");
  const loginError = document.getElementById("login-error");
  const logoutBtn = document.getElementById("logout-btn");

  const navItems = Array.from(document.querySelectorAll(".nav-item"));
  const panels = Array.from(document.querySelectorAll(".panel"));
  const viewTitle = document.getElementById("view-title");
  const viewSubtitle = document.getElementById("view-subtitle");
  const sessionUser = document.getElementById("session-user");

  const mapShell = document.getElementById("map-shell");
  const mapSvg = document.getElementById("map-svg");
  const mapWrap = document.querySelector(".map-wrap");
  const worksiteMenu = document.getElementById("worksite-menu");
  const worksiteMenuButtons = Array.from(worksiteMenu.querySelectorAll("button"));
  const manualMenu = document.getElementById("manual-menu");
  const manualMenuRobot = document.getElementById("manual-menu-robot");
  const mapMenu = document.getElementById("map-menu");
  const navControls = document.getElementById("nav-controls");
  const navControlsName = document.getElementById("nav-controls-name");
  const navControlsPause = document.getElementById("nav-controls-pause");
  const navControlsStop = document.getElementById("nav-controls-stop");
  const manualDrivePanel = document.getElementById("manual-drive");
  const manualDriveRobot = document.getElementById("manual-drive-robot");
  const manualDriveToggle = document.getElementById("manual-drive-toggle");
  const resetViewBtn = document.getElementById("reset-view-btn");
  const fitViewBtn = document.getElementById("fit-view-btn");
  const miniMapSvg = document.getElementById("mini-map-svg");
  const mapWindow = window.MapWindow?.init?.({
    shell: mapShell,
    wrap: mapWrap,
    svg: mapSvg,
    miniMapSvg
  });
  const mapLayers = window.MapLayers?.init?.({ svg: mapSvg });
  const mapStore = window.MapStore?.create?.();
  const mapAdapters = window.MapAdapters?.init?.({ store: mapStore });

  const robotsList = document.getElementById("robots-list");
  const streamsList = document.getElementById("streams-list");
  const scenesList = document.getElementById("scenes-list");
  const scenesRefreshBtn = document.getElementById("scenes-refresh");
  const fieldsList = document.getElementById("fields-list");
  const tasksList = document.getElementById("tasks-list");
  const trafficLocksList = document.getElementById("traffic-locks");
  const trafficQueuesList = document.getElementById("traffic-queues");
  const trafficNodesList = document.getElementById("traffic-nodes");
  const trafficStallsList = document.getElementById("traffic-stalls");
  const faultRobotSelect = document.getElementById("fault-robot-select");
  const faultPickProblemBtn = document.getElementById("fault-pick-problem");
  const faultPickRobotBlockedBtn = document.getElementById("fault-pick-robot-blocked");
  const faultDropProblemBtn = document.getElementById("fault-drop-problem");
  const faultDriveBlockBtn = document.getElementById("fault-drive-block");
  const faultDriveAvoidBtn = document.getElementById("fault-drive-avoid");
  const faultClearObstaclesBtn = document.getElementById("fault-clear-obstacles");
  const faultClearBlockBtn = document.getElementById("fault-clear-block");
  const settingsSimModeSelect = document.getElementById("settings-sim-mode");
  const settingsDispatchSelect = document.getElementById("settings-dispatch-strategy");
  const settingsTrafficSelect = document.getElementById("settings-traffic-strategy");
  const settingsTrafficStopDistanceInput = document.getElementById("settings-traffic-stop-distance");
  const settingsSimApplyBtn = document.getElementById("settings-sim-apply");
  const settingsSimResetBtn = document.getElementById("settings-sim-reset");
  const settingsAlgoApplyBtn = document.getElementById("settings-algo-apply");
  const settingsAlgoResetBtn = document.getElementById("settings-algo-reset");
  const settingsSimNote = document.getElementById("settings-sim-note");
  const settingsAlgoNote = document.getElementById("settings-algo-note");
  const taxonomyDispatchCurrent = document.getElementById("taxonomy-dispatch-current");
  const taxonomyDispatchAxes = document.getElementById("taxonomy-dispatch-axes");
  const taxonomyTrafficCurrent = document.getElementById("taxonomy-traffic-current");
  const taxonomyTrafficAxes = document.getElementById("taxonomy-traffic-axes");
  const bufferGrid = document.getElementById("buffer-grid");
  const bufferEditor = document.getElementById("buffer-editor");
  const lineRequestsList = document.getElementById("line-requests");
  const placeOpsPanel = document.getElementById("place-ops");

  let graphData = null;
  let workflowData = null;
  let robotsConfig = null;
  let worksites = [];
  let robots = [];
  let tasks = [];
  let scenesState = { activeSceneId: null, scenes: [] };
  let scenesLoading = false;
  let scenesBusy = false;
  let scenesError = null;
  let scenesBound = false;
  let worksiteState = {};
  let dataLoaded = false;
  let packagingConfig = null;
  let bufferState = {};
  let lineRequests = [];
  let selectedBufferCell = null;
  let selectedBufferLevel = 1;
  let opsOverrides = { buffers: {}, places: {} };
  let selectedPlaceId = null;
  let selectedPlaceGoods = null;
  let worksiteElements = new Map();
  let worksiteRings = new Map();
  let robotMarkers = new Map();
  let actionPointMarkers = new Map();
  let nodeMarkers = new Map();
  let mapClickBound = false;
  let mapState = null;
  let panState = null;
  let panZoomBound = false;
  let miniMapViewport = null;
  let miniMapBound = false;
  let miniMapDrag = null;
  let keyboardBound = false;
  let worksiteLabels = new Map();
  let nodeLabels = new Map();
  let robotActionsBound = false;
  let currentView = "map";
  let manualTargetRobotId = null;
  let manualDrive = {
    enabled: false,
    robotId: null,
    driving: false,
    keys: new Set()
  };
  let manualDriveTimer = null;
  let manualDriveLastTick = null;
  let manualDriveRemoteInFlight = false;
  let manualDriveRemotePending = null;
  let obstacles = [];
  let obstacleIdSeq = 1;
  let obstacleLayer = null;
  let simObstacleSyncToken = 0;
  let simMode = LOCAL_SIM_MODE;
  let fleetApiBase = FLEET_API_BASE_DEFAULT;
  let fleetStreamPath = FLEET_STREAM_PATH_DEFAULT;
  let fleetStatePath = FLEET_STATE_PATH_DEFAULT;
  let fleetPollMs = 200;
  let fleetPollTimer = null;
  let fleetPollInFlight = false;
  let fleetCoreAvailable = false;
  let fleetSimModeMutable = true;
  let fleetStream = null;
  let lastFleetUpdateAt = null;
  let robotDiagnosticsCache = new Map();
  let settingsState = {
    simMode: null,
    dispatchStrategy: null,
    trafficStrategy: null,
    forwardStopDistanceM: null
  };
  let algorithmCatalog = null;
  let algorithmCatalogLoaded = false;

  const svgNS = "http://www.w3.org/2000/svg";
  const isRemoteSim = () => [LOCAL_SIM_MODE, ROBOKIT_SIM_MODE].includes(simMode);
  const isRobokitSim = () => simMode === ROBOKIT_SIM_MODE;
  const isLocalSim = () => simMode === LOCAL_SIM_MODE;

  const syncDomainState = () => {
    if (!domainStore) return;
    const state = domainStore.getState() || {};
    robots = Array.isArray(state.robots) ? state.robots : [];
    tasks = Array.isArray(state.tasks) ? state.tasks : [];
  };

  if (domainStore) {
    domainStore.subscribe(() => {
      syncDomainState();
    });
  }

  const safeParse = (value) => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  };

  const normalizeOption = (value, allowed) => {
    if (!value || !Array.isArray(allowed) || !allowed.length) return null;
    const key = String(value).trim().toLowerCase();
    return allowed.includes(key) ? key : null;
  };

  const normalizeForwardStopDistance = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isFinite(num) ? Math.max(0, num) : null;
  };

  const resolveTrafficForwardStopDistance = (config) => {
    const trafficConfig = config?.traffic || {};
    const raw = Number(
      trafficConfig.forwardStopDistanceM ??
      trafficConfig.forwardStopDistance ??
      trafficConfig.stopDistanceLookahead
    );
    return Number.isFinite(raw) ? Math.max(0, raw) : 0;
  };

  const loadSettingsState = () => {
    const stored = safeParse(localStorage.getItem(SETTINGS_KEY));
    if (!stored || typeof stored !== "object") return;
    settingsState = {
      simMode: normalizeOption(stored.simMode, SIM_MODE_OPTIONS.map((item) => item.value)),
      dispatchStrategy: normalizeOption(
        stored.dispatchStrategy,
        DISPATCH_STRATEGY_OPTIONS.map((item) => item.value)
      ),
      trafficStrategy: normalizeOption(
        stored.trafficStrategy,
        TRAFFIC_STRATEGY_OPTIONS.map((item) => item.value)
      ),
      forwardStopDistanceM: normalizeForwardStopDistance(stored.forwardStopDistanceM)
    };
  };

  const persistSettingsState = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsState));
  };

  const resolveBoolean = (value, fallback) => {
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
  };

  const formatAgeLabel = (value) => {
    if (!Number.isFinite(value)) return "--";
    if (value < 1000) return `${Math.round(value)}ms`;
    return `${(value / 1000).toFixed(1)}s`;
  };

  const getFleetStaleThresholdMs = () =>
    Math.max(DIAG_STALE_MIN_MS, fleetPollMs * DIAG_STALE_MULTIPLIER);

  const ensureRobotDiagnosticsEntry = (robotId) => {
    if (!robotId) return null;
    let entry = robotDiagnosticsCache.get(robotId);
    if (!entry) {
      entry = {
        lastPose: null,
        lastMoveAt: null,
        state: "idle",
        stateSince: Date.now(),
        reason: "idle",
        detail: null,
        snapshot: null
      };
      robotDiagnosticsCache.set(robotId, entry);
    }
    return entry;
  };

  const normalizeBackendDiagnostics = (diag, now, stale) => {
    if (!diag || typeof diag !== "object") return null;
    if (stale) {
      return {
        state: "stale",
        reason: "no_updates",
        detail: null,
        since: lastFleetUpdateAt,
        lastMoveAt: diag.lastMoveAt || null,
        source: "stale"
      };
    }
    return {
      state: diag.state || "unknown",
      reason: diag.reason || null,
      detail: diag.detail || null,
      since: Number.isFinite(diag.since) ? diag.since : null,
      lastMoveAt: Number.isFinite(diag.lastMoveAt) ? diag.lastMoveAt : null,
      source: "backend"
    };
  };


  const refreshRobotDiagnosticsCache = () => {
    const now = Date.now();
    const staleThreshold = getFleetStaleThresholdMs();
    const stale = Number.isFinite(lastFleetUpdateAt)
      ? now - lastFleetUpdateAt > staleThreshold
      : false;
    const activeIds = new Set();
    robots.forEach((robot) => {
      if (!robot?.id) return;
      activeIds.add(robot.id);
      const entry = ensureRobotDiagnosticsEntry(robot.id);
      if (!entry) return;
      const backend = robot.diagnostics
        ? normalizeBackendDiagnostics(robot.diagnostics, now, stale)
        : null;
      const snapshot =
        backend ||
        (stale
          ? {
              state: "stale",
              reason: "no_updates",
              detail: null,
              since: lastFleetUpdateAt,
              lastMoveAt: entry.lastMoveAt,
              source: "stale"
            }
          : null);
      if (!snapshot) {
        entry.snapshot = null;
        return;
      }
      const prevState = entry.state;
      entry.state = snapshot.state || entry.state;
      if (Number.isFinite(snapshot.since)) {
        entry.stateSince = snapshot.since;
      } else if (entry.state !== prevState) {
        entry.stateSince = now;
      } else if (!Number.isFinite(entry.stateSince)) {
        entry.stateSince = now;
      }
      entry.reason = snapshot.reason || entry.reason;
      entry.detail = snapshot.detail || null;
      if (Number.isFinite(snapshot.lastMoveAt)) {
        entry.lastMoveAt = snapshot.lastMoveAt;
      }
      entry.snapshot = {
        ...snapshot,
        since: snapshot.since || entry.stateSince
      };
    });
    robotDiagnosticsCache.forEach((_entry, id) => {
      if (!activeIds.has(id)) robotDiagnosticsCache.delete(id);
    });
  };

  const getRobotDiagnostics = (robotId) => {
    if (!robotId) return null;
    const entry = robotDiagnosticsCache.get(robotId);
    return entry?.snapshot || null;
  };

  const escapeHtml = (value) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const buildSelectOptions = (select, options) => {
    if (!select || !Array.isArray(options)) return;
    select.innerHTML = options
      .map((option) => {
        const value = escapeHtml(option.value);
        const label = escapeHtml(option.label);
        const title = option.title ? ` title="${escapeHtml(option.title)}"` : "";
        return `<option value="${value}"${title}>${label}</option>`;
      })
      .join("");
  };

  const resolveTaxonomyLabel = (taxonomy, group, axis, value) => {
    if (!value) return null;
    const items = taxonomy?.[group]?.[axis];
    if (!Array.isArray(items)) return String(value);
    const match = items.find((item) => item?.name === value);
    return match?.label || String(value);
  };

  const formatAxisLabel = (axis) => AXIS_LABELS[axis] || axis;

  const renderTaxonomyRows = (container, rows, emptyLabel = "Brak danych.") => {
    if (!container) return;
    if (!Array.isArray(rows) || rows.length === 0) {
      container.innerHTML = `<div class="taxonomy-empty">${escapeHtml(emptyLabel)}</div>`;
      return;
    }
    container.innerHTML = rows
      .map(
        ([key, value]) =>
          `<div class="taxonomy-row"><span class="taxonomy-key">${escapeHtml(
            key
          )}</span><span class="taxonomy-value">${escapeHtml(value)}</span></div>`
      )
      .join("");
  };

  const buildTaxonomyAxisRows = (taxonomy, groups, includeGroupPrefix) => {
    if (!taxonomy) return [];
    const rows = [];
    (groups || []).forEach((group) => {
      const axes = taxonomy?.[group];
      if (!axes) return;
      Object.entries(axes).forEach(([axis, items]) => {
        if (!Array.isArray(items) || !items.length) return;
        const label = includeGroupPrefix
          ? `${group}.${formatAxisLabel(axis)}`
          : formatAxisLabel(axis);
        const values = items
          .map((item) => item?.label || item?.name)
          .filter(Boolean)
          .join(", ");
        rows.push([label, values]);
      });
    });
    return rows;
  };

  const buildDispatchCurrentRows = (entry, taxonomy) => {
    if (!entry) return [];
    const rows = [["strategy", entry.label || entry.name]];
    const dims = entry?.dimensions || {};
    ["objective", "assignment", "fairness", "preemption", "batching", "replan", "scope"].forEach(
      (axis) => {
        const value = dims[axis];
        if (!value) return;
        rows.push([
          formatAxisLabel(axis),
          resolveTaxonomyLabel(taxonomy, "dispatch", axis, value)
        ]);
      }
    );
    return rows;
  };

  const buildTrafficCurrentRows = (entry, taxonomy) => {
    if (!entry) return [];
    const rows = [["strategy", entry.label || entry.name]];
    const categories = entry?.categories || {};
    if (categories.routePlanner) {
      rows.push([
        "category.route",
        resolveTaxonomyLabel(taxonomy, "routePlanner", "searchSpace", categories.routePlanner)
      ]);
    }
    if (categories.reservation) {
      rows.push([
        "category.reservation",
        resolveTaxonomyLabel(taxonomy, "reservation", "granularity", categories.reservation)
      ]);
    }
    if (categories.avoidance) {
      rows.push([
        "category.avoidance",
        resolveTaxonomyLabel(taxonomy, "avoidance", "mechanism", categories.avoidance)
      ]);
    }
    if (categories.conflictSearch) {
      rows.push([
        "category.conflict",
        resolveTaxonomyLabel(taxonomy, "conflict", "search", categories.conflictSearch)
      ]);
    }

    const dims = entry?.dimensions || {};
    const routeDims = dims.routePlanner || {};
    ["searchSpace", "timeModel", "optimality", "kinematics", "replan"].forEach((axis) => {
      const value = routeDims[axis];
      if (!value) return;
      rows.push([
        `route.${formatAxisLabel(axis)}`,
        resolveTaxonomyLabel(taxonomy, "routePlanner", axis, value)
      ]);
    });

    const reservationDims = dims.reservation || {};
    ["granularity", "locking", "scope", "release"].forEach((axis) => {
      const value = reservationDims[axis];
      if (!value) return;
      rows.push([
        `reservation.${formatAxisLabel(axis)}`,
        resolveTaxonomyLabel(taxonomy, "reservation", axis, value)
      ]);
    });

    const avoidanceDims = dims.avoidance || {};
    ["mechanism", "response", "scope", "clearance"].forEach((axis) => {
      const value = avoidanceDims[axis];
      if (!value) return;
      rows.push([
        `avoidance.${formatAxisLabel(axis)}`,
        resolveTaxonomyLabel(taxonomy, "avoidance", axis, value)
      ]);
    });

    const conflictDims = dims.conflict || {};
    ["search", "resolution"].forEach((axis) => {
      const value = conflictDims[axis];
      if (!value) return;
      rows.push([
        `conflict.${formatAxisLabel(axis)}`,
        resolveTaxonomyLabel(taxonomy, "conflict", axis, value)
      ]);
    });

    const execDims = dims.execution || {};
    ["control", "speedProfile", "tracking"].forEach((axis) => {
      const value = execDims[axis];
      if (!value) return;
      rows.push([
        `execution.${formatAxisLabel(axis)}`,
        resolveTaxonomyLabel(taxonomy, "execution", axis, value)
      ]);
    });

    return rows;
  };

  const renderAlgorithmTaxonomy = () => {
    if (
      !taxonomyDispatchCurrent &&
      !taxonomyTrafficCurrent &&
      !taxonomyDispatchAxes &&
      !taxonomyTrafficAxes
    ) {
      return;
    }
    const taxonomy = algorithmCatalog?.taxonomy || null;
    const dispatchName =
      normalizeOption(
        settingsState.dispatchStrategy,
        DISPATCH_STRATEGY_OPTIONS.map((item) => item.value)
      ) || resolveDispatchStrategy();
    const trafficName =
      normalizeOption(
        settingsState.trafficStrategy,
        TRAFFIC_STRATEGY_OPTIONS.map((item) => item.value)
      ) || resolveTrafficStrategyName(robotsConfig);
    const dispatchEntry = algorithmCatalog?.dispatchStrategies?.find(
      (entry) => entry?.name === dispatchName
    );
    const trafficEntry = algorithmCatalog?.trafficStrategies?.find(
      (entry) => entry?.name === trafficName
    );
    renderTaxonomyRows(
      taxonomyDispatchCurrent,
      buildDispatchCurrentRows(dispatchEntry, taxonomy),
      "Brak danych dispatch."
    );
    renderTaxonomyRows(
      taxonomyTrafficCurrent,
      buildTrafficCurrentRows(trafficEntry, taxonomy),
      "Brak danych traffic."
    );
    renderTaxonomyRows(
      taxonomyDispatchAxes,
      buildTaxonomyAxisRows(taxonomy, ["dispatch"], false),
      "Brak osi dispatch."
    );
    renderTaxonomyRows(
      taxonomyTrafficAxes,
      buildTaxonomyAxisRows(
        taxonomy,
        ["routePlanner", "reservation", "avoidance", "conflict", "execution"],
        true
      ),
      "Brak osi traffic."
    );
  };

  const buildDispatchOptionTitle = (entry, taxonomy) => {
    const dims = entry?.dimensions || {};
    const parts = [];
    if (dims.objective) {
      parts.push(`objective: ${resolveTaxonomyLabel(taxonomy, "dispatch", "objective", dims.objective)}`);
    }
    if (dims.assignment) {
      parts.push(`assignment: ${resolveTaxonomyLabel(taxonomy, "dispatch", "assignment", dims.assignment)}`);
    }
    if (dims.fairness) {
      parts.push(`fairness: ${resolveTaxonomyLabel(taxonomy, "dispatch", "fairness", dims.fairness)}`);
    }
    if (dims.preemption) {
      parts.push(`preemption: ${resolveTaxonomyLabel(taxonomy, "dispatch", "preemption", dims.preemption)}`);
    }
    if (dims.batching) {
      parts.push(`batching: ${resolveTaxonomyLabel(taxonomy, "dispatch", "batching", dims.batching)}`);
    }
    if (dims.replan) {
      parts.push(`replan: ${resolveTaxonomyLabel(taxonomy, "dispatch", "replan", dims.replan)}`);
    }
    if (dims.scope) {
      parts.push(`scope: ${resolveTaxonomyLabel(taxonomy, "dispatch", "scope", dims.scope)}`);
    }
    return parts.join(" | ");
  };

  const buildTrafficOptionTitle = (entry, taxonomy) => {
    const categories = entry?.categories || {};
    const dims = entry?.dimensions || {};
    const parts = [];
    if (categories.routePlanner) {
      parts.push(
        `route: ${resolveTaxonomyLabel(taxonomy, "routePlanner", "searchSpace", categories.routePlanner)}`
      );
    }
    if (categories.reservation) {
      parts.push(
        `reservation: ${resolveTaxonomyLabel(taxonomy, "reservation", "granularity", categories.reservation)}`
      );
    }
    if (categories.avoidance) {
      parts.push(
        `avoidance: ${resolveTaxonomyLabel(taxonomy, "avoidance", "mechanism", categories.avoidance)}`
      );
    }
    if (categories.conflictSearch) {
      parts.push(
        `conflict: ${resolveTaxonomyLabel(taxonomy, "conflict", "search", categories.conflictSearch)}`
      );
    }
    if (dims.routePlanner?.kinematics) {
      parts.push(
        `kinematics: ${resolveTaxonomyLabel(taxonomy, "routePlanner", "kinematics", dims.routePlanner.kinematics)}`
      );
    }
    if (dims.routePlanner?.optimality) {
      parts.push(
        `optimality: ${resolveTaxonomyLabel(taxonomy, "routePlanner", "optimality", dims.routePlanner.optimality)}`
      );
    }
    return parts.join(" | ");
  };

  const buildDispatchOptionsFromCatalog = (entries, taxonomy) => {
    if (!Array.isArray(entries)) return [];
    return entries
      .map((entry) => {
        const name = String(entry?.name || "").trim();
        if (!name) return null;
        const label = entry?.label || DEFAULT_DISPATCH_LABELS[name] || name;
        const title = buildDispatchOptionTitle(entry, taxonomy);
        return { value: name, label, title };
      })
      .filter(Boolean);
  };

  const buildTrafficOptionsFromCatalog = (entries, taxonomy) => {
    if (!Array.isArray(entries)) return [];
    return entries
      .map((entry) => {
        const name = String(entry?.name || "").trim();
        if (!name) return null;
        const label = entry?.label || DEFAULT_TRAFFIC_LABELS[name] || name;
        const title = buildTrafficOptionTitle(entry, taxonomy);
        return { value: name, label, title };
      })
      .filter(Boolean);
  };

  const applyAlgorithmCatalog = (catalog) => {
    if (!catalog || typeof catalog !== "object") return false;
    const dispatchOptions = buildDispatchOptionsFromCatalog(
      catalog.dispatchStrategies,
      catalog.taxonomy
    );
    if (dispatchOptions.length) {
      DISPATCH_STRATEGY_OPTIONS.length = 0;
      DISPATCH_STRATEGY_OPTIONS.push(...dispatchOptions);
    }
    const trafficOptions = buildTrafficOptionsFromCatalog(
      catalog.trafficStrategies,
      catalog.taxonomy
    );
    if (trafficOptions.length) {
      TRAFFIC_STRATEGY_OPTIONS.length = 0;
      TRAFFIC_STRATEGY_OPTIONS.push(...trafficOptions);
    }
    algorithmCatalog = catalog;
    algorithmCatalogLoaded = true;
    renderAlgorithmTaxonomy();
    return true;
  };

  const syncSettingsPanel = () => {
    if (settingsSimModeSelect) {
      buildSelectOptions(settingsSimModeSelect, SIM_MODE_OPTIONS);
      settingsSimModeSelect.value = simMode;
      settingsSimModeSelect.disabled = !fleetSimModeMutable;
      const robokitOption = settingsSimModeSelect.querySelector(
        `option[value="${ROBOKIT_SIM_MODE}"]`
      );
      if (robokitOption) {
        robokitOption.disabled = !fleetCoreAvailable;
      }
      if (settingsSimNote) {
        if (simMode === ROBOKIT_SIM_MODE && !fleetCoreAvailable) {
          settingsSimNote.textContent = "Robokit niedostepny w backendzie.";
        } else if (!fleetSimModeMutable) {
          settingsSimNote.textContent = "Tryb zablokowany w konfiguracji serwera.";
        } else {
          settingsSimNote.textContent = "Tryb z konfiguracji backendu.";
        }
      }
    }
    if (settingsSimApplyBtn) {
      settingsSimApplyBtn.disabled = !fleetSimModeMutable;
    }

    if (settingsDispatchSelect) {
      buildSelectOptions(settingsDispatchSelect, DISPATCH_STRATEGY_OPTIONS);
      const dispatchValue =
        normalizeOption(
          settingsState.dispatchStrategy,
          DISPATCH_STRATEGY_OPTIONS.map((item) => item.value)
        ) || resolveDispatchStrategy();
      settingsDispatchSelect.value = dispatchValue;
    }

    if (settingsTrafficSelect) {
      buildSelectOptions(settingsTrafficSelect, TRAFFIC_STRATEGY_OPTIONS);
      const trafficValue =
        normalizeOption(
          settingsState.trafficStrategy,
          TRAFFIC_STRATEGY_OPTIONS.map((item) => item.value)
        ) || resolveTrafficStrategyName(robotsConfig);
      settingsTrafficSelect.value = trafficValue;
    }

    if (settingsTrafficStopDistanceInput) {
      const baseDistance = resolveTrafficForwardStopDistance(robotsConfig);
      const distance = Number.isFinite(settingsState.forwardStopDistanceM)
        ? settingsState.forwardStopDistanceM
        : baseDistance;
      settingsTrafficStopDistanceInput.value = Number.isFinite(distance) ? distance : 0;
    }

    if (settingsAlgoNote) {
      settingsAlgoNote.textContent = isRobokitSim()
        ? "Algorytmy beda zastosowane po przelaczeniu na symulator lokalny."
        : "Algorytmy dzialaja w lokalnym symulatorze.";
    }
    renderAlgorithmTaxonomy();
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const distanceBetweenPoints = (a, b) => {
    if (!a || !b) return Number.POSITIVE_INFINITY;
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const ensureRobotMotion = (robot) => {
    if (!robot) return;
    if (!Number.isFinite(robot.heading)) robot.heading = 0;
    if (!Number.isFinite(robot.speed)) robot.speed = 0;
  };

  const getMapCenter = () => {
    if (!mapState) return { x: 0, y: 0 };
    return {
      x: mapState.x + mapState.width / 2,
      y: mapState.y + mapState.height / 2
    };
  };

  const updateWorksiteScale = () => {
    if (!mapState) return;
    const rect = mapSvg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const scale = mapState.width / rect.width;
    const zoomLevel = mapState.baseWidth / mapState.width;
    const showLabels = zoomLevel >= LABEL_MIN_ZOOM;
    const showNodeLabels = zoomLevel >= NODE_LABEL_MIN_ZOOM;
    const labelOffset = LABEL_OFFSET_PX * scale;
    const fontSize = LABEL_SIZE_PX * scale;
    const nodeLabelOffset = NODE_LABEL_OFFSET_PX * scale;
    const nodeFontSize = NODE_LABEL_SIZE_PX * scale;
    worksiteElements.forEach((marker) => {
      const sizePx = Number(marker.dataset.sizePx || "5");
      marker.setAttribute("r", (sizePx * scale).toFixed(3));
    });
    worksiteRings.forEach((ring) => {
      const sizePx = Number(ring.dataset.sizePx || "8");
      ring.setAttribute("r", (sizePx * scale).toFixed(3));
    });
    actionPointMarkers.forEach((marker) => {
      const sizePx = Number(marker.dataset.sizePx || "3");
      marker.setAttribute("r", (sizePx * scale).toFixed(3));
    });
    nodeMarkers.forEach((marker) => {
      const sizePx = Number(marker.dataset.sizePx || "3");
      marker.setAttribute("r", (sizePx * scale).toFixed(3));
    });
    worksiteLabels.forEach((label) => {
      const baseX = Number(label.dataset.baseX || "0");
      const baseY = Number(label.dataset.baseY || "0");
      label.setAttribute("x", baseX.toFixed(3));
      label.setAttribute("y", (baseY + labelOffset).toFixed(3));
      label.setAttribute("font-size", fontSize.toFixed(3));
      label.classList.toggle("hidden", !showLabels);
    });
    nodeLabels.forEach((label) => {
      const baseX = Number(label.dataset.baseX || "0");
      const baseY = Number(label.dataset.baseY || "0");
      label.setAttribute("x", baseX.toFixed(3));
      label.setAttribute("y", (baseY + nodeLabelOffset).toFixed(3));
      label.setAttribute("font-size", nodeFontSize.toFixed(3));
      label.classList.toggle("hidden", !showNodeLabels);
    });
  };

  const updateMiniMapViewport = () => {
    if (!miniMapViewport || !mapState) return;
    miniMapViewport.setAttribute("x", mapState.x);
    miniMapViewport.setAttribute("y", mapState.y);
    miniMapViewport.setAttribute("width", mapState.width);
    miniMapViewport.setAttribute("height", mapState.height);
  };

  const updateViewBox = () => {
    if (!mapState) return;
    const minX = -mapState.width;
    const maxX = mapState.baseWidth;
    const minY = -mapState.height;
    const maxY = mapState.baseHeight;
    mapState.x = clamp(mapState.x, minX, maxX);
    mapState.y = clamp(mapState.y, minY, maxY);
    mapSvg.setAttribute(
      "viewBox",
      `${mapState.x} ${mapState.y} ${mapState.width} ${mapState.height}`
    );
    updateMiniMapViewport();
    updateWorksiteScale();
    mapStore?.notify?.("viewport");
  };

  const resetViewBox = () => {
    if (!mapState) return;
    mapState.x = 0;
    mapState.y = 0;
    mapState.width = mapState.baseWidth;
    mapState.height = mapState.baseHeight;
    updateViewBox();
  };

  const fitViewBox = () => {
    if (!mapState) return;
    const points = [];
    worksites.forEach((site) => {
      if (site.pos) points.push(projectPoint(site.pos));
    });
    robots.forEach((robot) => {
      if (robot.pos) points.push(projectPoint(robot.pos));
    });
    if (!points.length) {
      resetViewBox();
      return;
    }
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const padding = 0.08;
    const boundsWidth = Math.max(maxX - minX, 1);
    const boundsHeight = Math.max(maxY - minY, 1);
    const baseRatio = mapState.baseWidth / mapState.baseHeight;
    let targetWidth = boundsWidth;
    let targetHeight = boundsHeight;
    if (targetWidth / targetHeight > baseRatio) {
      targetHeight = targetWidth / baseRatio;
    } else {
      targetWidth = targetHeight * baseRatio;
    }
    targetWidth *= 1 + padding;
    targetHeight *= 1 + padding;
    const clampedWidth = clamp(targetWidth, mapState.minWidth, mapState.maxWidth);
    const scale = clampedWidth / targetWidth;
    mapState.width = clampedWidth;
    mapState.height = targetHeight * scale;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    mapState.x = centerX - mapState.width / 2;
    mapState.y = centerY - mapState.height / 2;
    updateViewBox();
  };

  const projectPoint = (point) => {
    if (!mapState || !point) return { x: 0, y: 0 };
    return {
      x: point.x - mapState.offsetX,
      y: mapState.offsetY - point.y
    };
  };

  const unprojectPoint = (point) => {
    if (!mapState || !point) return { x: 0, y: 0 };
    return {
      x: point.x + mapState.offsetX,
      y: mapState.offsetY - point.y
    };
  };

  const getSvgPoint = (event) => {
    if (!mapState) return { x: 0, y: 0 };
    if (mapSvg.createSVGPoint && mapSvg.getScreenCTM) {
      const point = mapSvg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const matrix = mapSvg.getScreenCTM();
      if (matrix) {
        const inverse = matrix.inverse();
        const svgPoint = point.matrixTransform(inverse);
        return { x: svgPoint.x, y: svgPoint.y };
      }
    }
    const rect = mapSvg.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: mapState.x, y: mapState.y };
    const x = mapState.x + ((event.clientX - rect.left) / rect.width) * mapState.width;
    const y = mapState.y + ((event.clientY - rect.top) / rect.height) * mapState.height;
    return { x, y };
  };

  const getMapPointFromEvent = (event) => {
    const svgPoint = getSvgPoint(event);
    return unprojectPoint(svgPoint);
  };

  const applyZoom = (factor, center) => {
    if (!mapState) return;
    const nextWidth = mapState.width * factor;
    const minScale = mapState.minWidth / mapState.width;
    const maxScaleWidth = mapState.maxWidth / mapState.width;
    const maxScaleHeight = mapState.maxHeight ? mapState.maxHeight / mapState.height : maxScaleWidth;
    const maxScale = Math.min(maxScaleWidth, maxScaleHeight);
    const scale = clamp(factor, minScale, maxScale);
    if (scale === 1) return;
    const newWidth = mapState.width * scale;
    const newHeight = mapState.height * scale;
    mapState.x = center.x - (center.x - mapState.x) * scale;
    mapState.y = center.y - (center.y - mapState.y) * scale;
    mapState.width = newWidth;
    mapState.height = newHeight;
    updateViewBox();
  };

  const bindPanZoom = () => {
    if (panZoomBound) return;
    panZoomBound = true;

    mapSvg.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const zoomFactor = event.deltaY > 0 ? 1.05 : 0.95;
        const center = getSvgPoint(event);
        applyZoom(zoomFactor, center);
      },
      { passive: false }
    );

    mapSvg.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      if (!mapState) return;
      if (event.target?.closest?.(".worksite-marker")) return;
      if (event.target?.closest?.(".robot-marker")) return;
      if (event.target?.closest?.(".action-point")) return;
      if (event.target?.closest?.(".obstacle-marker")) return;
      panState = {
        startX: event.clientX,
        startY: event.clientY,
        viewX: mapState?.x || 0,
        viewY: mapState?.y || 0
      };
      mapWrap.classList.add("panning");
      mapSvg.setPointerCapture(event.pointerId);
    });

    mapSvg.addEventListener("pointermove", (event) => {
      if (!panState || !mapState) return;
      const rect = mapSvg.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dx = ((event.clientX - panState.startX) / rect.width) * mapState.width;
      const dy = ((event.clientY - panState.startY) / rect.height) * mapState.height;
      mapState.x = panState.viewX - dx;
      mapState.y = panState.viewY - dy;
      updateViewBox();
    });

    const endPan = (event) => {
      if (!panState) return;
      panState = null;
      mapWrap.classList.remove("panning");
      if (event?.pointerId !== undefined) {
        mapSvg.releasePointerCapture(event.pointerId);
      }
    };

    mapSvg.addEventListener("pointerup", endPan);
    mapSvg.addEventListener("pointercancel", endPan);

    mapSvg.addEventListener("dblclick", (event) => {
      event.preventDefault();
      resetViewBox();
    });
  };

  const bindKeyboardShortcuts = () => {
    if (keyboardBound) return;
    keyboardBound = true;
    document.addEventListener("keydown", (event) => {
      if (!mapState) return;
      const target = document.activeElement;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const center = getMapCenter();
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        applyZoom(0.9, center);
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        applyZoom(1.1, center);
      } else if (event.key === "0") {
        event.preventDefault();
        resetViewBox();
      }
    });
  };

  const loadSession = () => {
    const stored = safeParse(localStorage.getItem(SESSION_KEY));
    if (!stored || !stored.expiresAt || !stored.username) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    if (Date.now() > stored.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return stored.username;
  };

  const saveSession = (username) => {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ username, expiresAt: Date.now() + SESSION_TTL_MS })
    );
  };

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
  };

  const showLogin = () => {
    loginView.classList.remove("hidden");
    appView.classList.add("hidden");
    loginUserInput.focus();
  };

  const showApp = (username) => {
    loginView.classList.add("hidden");
    appView.classList.remove("hidden");
    sessionUser.textContent = username;
    setView("map");
    if (!dataLoaded) {
      loadData();
    }
  };

  const setView = (viewName) => {
    currentView = viewName;
    navItems.forEach((item) => {
      item.classList.toggle("active", item.dataset.view === viewName);
    });

    panels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === `view-${viewName}`);
    });

    const meta = viewMeta[viewName];
    if (meta) {
      viewTitle.textContent = meta.title;
      viewSubtitle.textContent = meta.subtitle;
    }
    if (viewName === "scenes") {
      loadScenes({ silent: true });
    }
    if (viewName === "traffic") {
      renderTrafficDiagnostics();
    }
    if (viewName === "settings") {
      syncSettingsPanel();
    }
    if (viewName !== "map") {
      clearManualDriveKeys();
    }
  };

  const initNavigation = () => {
    navItems.forEach((item) => {
      item.addEventListener("click", () => {
        setView(item.dataset.view);
      });
    });
  };

  const initWorksiteMenu = () => {
    const hideMenu = () => {
      worksiteMenu.classList.add("hidden");
      worksiteMenu.dataset.id = "";
    };

    worksiteMenu.addEventListener("click", (event) => {
      event.stopPropagation();
      const button = event.target.closest("button");
      if (!button) return;
      const id = worksiteMenu.dataset.id;
      if (!id) return;
      const group = button.dataset.group;
      const value = button.dataset.value;
      if (group === "occupancy") {
        setWorksiteOccupancy(id, value);
      } else if (group === "blocked") {
        setWorksiteBlocked(id, value === "true");
      }
      hideMenu();
    });

    document.addEventListener("click", (event) => {
      if (!worksiteMenu.contains(event.target)) {
        hideMenu();
      }
    });

    mapWrap.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      const isWorksite = event.target?.classList?.contains("worksite-marker");
      if (!isWorksite) {
        hideMenu();
      }
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hideMenu();
      }
    });
  };

  const initManualMenu = () => {
    if (!manualMenu) return;
    const hideMenu = () => {
      manualMenu.classList.add("hidden");
      manualMenu.dataset.pointId = "";
      manualMenu.dataset.robotId = "";
    };

    manualMenu.addEventListener("click", (event) => {
      event.stopPropagation();
      const button = event.target.closest("button");
      if (!button) return;
      const pointId = manualMenu.dataset.pointId;
      const robotId = manualMenu.dataset.robotId;
      if (!pointId || !robotId) return;
      const action = button.dataset.action;
      issueManualCommand(robotId, pointId, action);
      hideMenu();
    });

    document.addEventListener("click", (event) => {
      if (!manualMenu.contains(event.target)) {
        hideMenu();
      }
    });

    mapWrap.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      if (!manualMenu.contains(event.target)) {
        hideMenu();
      }
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hideMenu();
      }
    });
  };

  const initMapMenu = () => {
    if (!mapMenu) return;
    const hideMenu = () => {
      mapMenu.classList.add("hidden");
      mapMenu.dataset.x = "";
      mapMenu.dataset.y = "";
    };

    mapMenu.addEventListener("click", (event) => {
      event.stopPropagation();
      const button = event.target.closest("button");
      if (!button) return;
      const x = Number.parseFloat(mapMenu.dataset.x);
      const y = Number.parseFloat(mapMenu.dataset.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        hideMenu();
        return;
      }
      const mode = button.dataset.mode || "block";
      if (button.dataset.action === "go-point") {
        if (!isRemoteSim()) {
          hideMenu();
          return;
        }
        const robot = getManualCommandRobot();
        if (!robot || !robot.manualMode) {
          hideMenu();
          return;
        }
        if (manualDrive.enabled && manualDrive.robotId === robot.id) {
          setManualDriveEnabled(robot.id, false);
        }
        sendRobotCommand(robot.id, "go-point", { x, y })
          .then(() => refreshFleetStatus())
          .catch((error) => {
            console.warn("Go-point failed", error);
          });
      }
      if (button.dataset.action === "add-obstacle") {
        addObstacle({ x, y }, { mode });
      }
      hideMenu();
    });

    document.addEventListener("click", (event) => {
      if (!mapMenu.contains(event.target)) {
        hideMenu();
      }
    });

    mapWrap.addEventListener("contextmenu", (event) => {
      const target = event.target;
      const isWorksite = target?.closest?.(".worksite-marker");
      const isActionPoint = target?.closest?.(".action-point");
      const isRobot = target?.closest?.(".robot-marker");
      const isObstacle = target?.closest?.(".obstacle-marker");
      if (isWorksite || isActionPoint || isRobot || isObstacle) {
        hideMenu();
        return;
      }
      if (mapMenu.contains(target)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const point = getMapPointFromEvent(event);
      showMapMenu(event, point);
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hideMenu();
      }
    });
  };

  const initFaultControls = () => {
    if (!faultRobotSelect) return;
    syncFaultRobotSelect();
    if (faultPickProblemBtn) {
      faultPickProblemBtn.addEventListener("click", () => {
        const robotId = getFaultRobotId();
        if (robotId) simulatePickProblem(robotId);
      });
    }
    if (faultPickRobotBlockedBtn) {
      faultPickRobotBlockedBtn.addEventListener("click", () => {
        const robotId = getFaultRobotId();
        if (robotId) simulatePickRobotBlocked(robotId);
      });
    }
    if (faultDropProblemBtn) {
      faultDropProblemBtn.addEventListener("click", () => {
        const robotId = getFaultRobotId();
        if (robotId) simulateDropProblem(robotId);
      });
    }
    if (faultDriveBlockBtn) {
      faultDriveBlockBtn.addEventListener("click", () => {
        const robotId = getFaultRobotId();
        if (robotId) simulateDriveProblem(robotId, "block");
      });
    }
    if (faultDriveAvoidBtn) {
      faultDriveAvoidBtn.addEventListener("click", () => {
        const robotId = getFaultRobotId();
        if (robotId) simulateDriveProblem(robotId, "avoid");
      });
    }
    if (faultClearObstaclesBtn) {
      faultClearObstaclesBtn.addEventListener("click", () => {
        clearObstacles();
      });
    }
    if (faultClearBlockBtn) {
      faultClearBlockBtn.addEventListener("click", () => {
        const robotId = getFaultRobotId();
        if (robotId) clearRobotBlock(robotId);
      });
    }
  };

  const initManualDriveControls = () => {
    if (manualDriveToggle) {
      manualDriveToggle.addEventListener("click", () => {
        const robotId = manualDriveToggle.dataset.id;
        if (!robotId) return;
        const enable = !manualDrive.enabled || manualDrive.robotId !== robotId;
        if (!manualDrive.enabled && manualDrive.robotId !== robotId) {
          setManualDriveTarget(robotId);
        }
        setManualDriveEnabled(robotId, enable);
      });
    }

    document.addEventListener("keydown", (event) => {
      handleManualDriveKey(event, true);
    });
    document.addEventListener("keyup", (event) => {
      handleManualDriveKey(event, false);
    });
    window.addEventListener("blur", () => {
      clearManualDriveKeys();
    });
  };

  const applySimModeSetting = async (mode) => {
    const nextMode = normalizeOption(mode, SIM_MODE_OPTIONS.map((item) => item.value));
    if (!nextMode || !fleetSimModeMutable) return;
    try {
      const response = await fetch(FLEET_CONFIG_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simMode: nextMode })
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `sim_mode_failed_${response.status}`);
      }
      const payload = await response.json().catch(() => null);
      applyFleetConfig(payload);
      stopFleetUpdates();
      await loadData({ reset: true, silent: true });
    } catch (error) {
      if (settingsSimNote) {
        settingsSimNote.textContent = `Blad zmiany trybu: ${error.message || "update_failed"}`;
      }
    }
  };

  const applyAlgorithmSettings = async (dispatchStrategy, trafficStrategy, forwardStopDistance) => {
    settingsState.dispatchStrategy = normalizeOption(
      dispatchStrategy,
      DISPATCH_STRATEGY_OPTIONS.map((item) => item.value)
    );
    settingsState.trafficStrategy = normalizeOption(
      trafficStrategy,
      TRAFFIC_STRATEGY_OPTIONS.map((item) => item.value)
    );
    settingsState.forwardStopDistanceM = normalizeForwardStopDistance(forwardStopDistance);
    persistSettingsState();
    applyAlgorithmOverrides();
    if (isLocalSim()) {
      await syncLocalSimSettings();
    }
    syncSettingsPanel();
    if (!isRemoteSim()) {
      renderTrafficDiagnostics();
    }
  };

  const resetAlgorithmSettings = async () => {
    settingsState.dispatchStrategy = null;
    settingsState.trafficStrategy = null;
    settingsState.forwardStopDistanceM = null;
    persistSettingsState();
    applyAlgorithmOverrides();
    if (isLocalSim()) {
      await syncLocalSimSettings();
    }
    syncSettingsPanel();
    if (!isRemoteSim()) {
      renderTrafficDiagnostics();
    }
  };

  const initSettingsControls = () => {
    syncSettingsPanel();
    if (settingsSimApplyBtn && settingsSimModeSelect) {
      settingsSimApplyBtn.addEventListener("click", () => {
        applySimModeSetting(settingsSimModeSelect.value).catch(() => {});
      });
    }
    if (settingsSimResetBtn) {
      settingsSimResetBtn.addEventListener("click", () => {
        stopFleetUpdates();
        loadData({ reset: true, silent: true });
      });
    }
    if (settingsAlgoApplyBtn && settingsDispatchSelect && settingsTrafficSelect) {
      settingsAlgoApplyBtn.addEventListener("click", () => {
        const stopDistance = settingsTrafficStopDistanceInput
          ? settingsTrafficStopDistanceInput.value
          : null;
        applyAlgorithmSettings(
          settingsDispatchSelect.value,
          settingsTrafficSelect.value,
          stopDistance
        ).catch(() => {});
      });
    }
    if (settingsAlgoResetBtn) {
      settingsAlgoResetBtn.addEventListener("click", () => {
        resetAlgorithmSettings().catch(() => {});
      });
    }
  };

  const initLogin = () => {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const username = loginUserInput.value.trim();
      const password = loginPassInput.value.trim();
      if (username === DEFAULT_USER.username && password === DEFAULT_USER.password) {
        loginError.classList.add("hidden");
        saveSession(username);
        showApp(username);
      } else {
        loginError.classList.remove("hidden");
      }
    });

    logoutBtn.addEventListener("click", () => {
      clearSession();
      showLogin();
    });
  };

  const fetchJson = async (path) => {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load ${path}`);
    }
    return response.json();
  };

  const fetchJsonSafe = async (path) => {
    try {
      return await fetchJson(path);
    } catch (error) {
      return null;
    }
  };

  const loadAlgorithmCatalog = async () => {
    if (algorithmCatalogLoaded) return algorithmCatalog;
    const payload = await fetchJsonSafe(ALGORITHM_CATALOG_PATH);
    if (!payload) return null;
    applyAlgorithmCatalog(payload);
    return payload;
  };

  const applyFleetConfig = (config) => {
    if (!config || typeof config !== "object") return;
    if (typeof config.apiBase === "string" && config.apiBase) {
      fleetApiBase = config.apiBase;
      fleetStreamPath = `${fleetApiBase}/stream`;
      fleetStatePath = `${fleetApiBase}/state`;
    }
    if (typeof config.streamPath === "string" && config.streamPath) {
      fleetStreamPath = config.streamPath;
    }
    if (typeof config.statePath === "string" && config.statePath) {
      fleetStatePath = config.statePath;
    }
    if (typeof config.simMode === "string" && config.simMode) {
      const nextMode = config.simMode.toLowerCase();
      if ([LOCAL_SIM_MODE, ROBOKIT_SIM_MODE].includes(nextMode)) {
        simMode = nextMode;
      }
    }
    if (Number.isFinite(config.pollMs)) {
      fleetPollMs = config.pollMs;
    }
    if (typeof config.simModeMutable === "boolean") {
      fleetSimModeMutable = config.simModeMutable;
    }
    fleetCoreAvailable = Boolean(config.coreConfigured);
  };

  const applySettingsOverrides = () => {
    const simOverride = normalizeOption(
      settingsState.simMode,
      SIM_MODE_OPTIONS.map((item) => item.value)
    );
    if (simOverride) {
      simMode = simOverride;
    }
  };

  const resolveSimModeOverride = () => {
    const params = new URLSearchParams(window.location.search);
    const override = params.get("sim");
    if (override) {
      const nextMode = override.toLowerCase();
      if ([LOCAL_SIM_MODE, ROBOKIT_SIM_MODE].includes(nextMode)) {
        simMode = nextMode;
      }
    }
  };

  const loadFleetConfig = async () => {
    const config = await fetchJsonSafe(FLEET_CONFIG_PATH);
    applyFleetConfig(config);
    syncSettingsPanel();
  };

  const formatSceneTimestamp = (value) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const pad = (num) => String(num).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
      date.getMinutes()
    )}`;
  };

  const buildSceneMapMeta = (map) => {
    const meta = map?.meta || {};
    const parts = [];
    if (meta.mapType) parts.push(meta.mapType);
    if (meta.version) parts.push(`v${meta.version}`);
    if (meta.md5) parts.push(meta.md5.slice(0, 8));
    return parts.join(" | ");
  };

  const renderScenes = () => {
    if (!scenesList) return;
    const scenes = Array.isArray(scenesState?.scenes) ? scenesState.scenes : [];
    scenesList.innerHTML = "";

    if (scenesError) {
      const errorCard = document.createElement("div");
      errorCard.className = "card";
      errorCard.textContent = `Blad scen: ${scenesError}`;
      scenesList.appendChild(errorCard);
    }

    if (!scenes.length) {
      if (!scenesError) {
        scenesList.innerHTML = "<div class=\"card\">Brak scen.</div>";
      }
      return;
    }

    scenes.forEach((scene) => {
      const isActiveScene = scene.id === scenesState.activeSceneId;
      const createdLabel = formatSceneTimestamp(scene.createdAt);
      const maps = Array.isArray(scene.maps) ? scene.maps : [];
      const headerBadge = isActiveScene ? "<span class=\"badge\">Aktywna</span>" : "";
      const mapRows = maps
        .map((map) => {
          const mapId = map.id || "";
          const mapLabel = map.name || map.fileName || mapId || "--";
          const metaLabel = buildSceneMapMeta(map);
          const fileLabel = map.fileName ? `Plik: ${map.fileName}` : "";
          const details = [fileLabel, metaLabel].filter(Boolean).join(" | ");
          const isActiveMap = mapId && scene.activeMapId && mapId === scene.activeMapId;
          const badge = isActiveMap ? "<span class=\"badge\">Aktywna mapa</span>" : "";
          const disabled = scenesBusy ? "disabled" : "";
          const actionLabel = isActiveScene && isActiveMap ? "Aktywna" : "Aktywuj";
          const showButton = !(isActiveScene && isActiveMap);
          return `
            <div class="scene-map">
              <div>
                <div class="scene-map-title">${mapLabel}</div>
                <div class="scene-map-meta">${details || "--"}</div>
              </div>
              <div class="scene-map-actions">
                ${badge}
                ${showButton ? `<button class="ghost-btn small" data-action="activate-scene" data-scene-id="${scene.id}" data-map-id="${mapId}" ${disabled}>${actionLabel}</button>` : ""}
              </div>
            </div>
          `;
        })
        .join("");

      const card = document.createElement("div");
      card.className = "card scene-card";
      card.innerHTML = `
        <div class="scene-header">
          <div>
            <div class="card-title">${scene.name || scene.id}</div>
            <div class="card-meta">ID: ${scene.id || "--"} | ${createdLabel} | ${scene.kind || "custom"}</div>
          </div>
          ${headerBadge}
        </div>
        <div class="scene-map-list">
          ${mapRows || "<div class=\"card-meta\">Brak map.</div>"}
        </div>
      `;
      scenesList.appendChild(card);
    });

    if (!scenesBound) {
      scenesList.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;
        const action = button.dataset.action;
        if (action !== "activate-scene") return;
        const sceneId = button.dataset.sceneId;
        const mapId = button.dataset.mapId || null;
        if (!sceneId) return;
        activateScene(sceneId, mapId);
      });
      scenesBound = true;
    }
  };

  const loadScenes = async (options = {}) => {
    if (!scenesList || scenesLoading) return;
    const silent = Boolean(options.silent);
    scenesLoading = true;
    scenesError = null;
    if (!silent) {
      scenesList.innerHTML = "<div class=\"card\">Ladowanie scen...</div>";
    }
    try {
      const payload = await fetchJson("/api/scenes");
      if (payload && typeof payload === "object") {
        scenesState = payload;
      } else {
        scenesState = { activeSceneId: null, scenes: [] };
      }
    } catch (error) {
      scenesError = error.message || "load_failed";
    } finally {
      scenesLoading = false;
      renderScenes();
    }
  };

  const activateScene = async (sceneId, mapId) => {
    if (!sceneId || scenesBusy) return;
    scenesBusy = true;
    scenesError = null;
    renderScenes();
    try {
      const response = await fetch("/api/scenes/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sceneId, mapId })
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `activate_failed_${response.status}`);
      }
      const payload = await response.json();
      scenesState.activeSceneId = payload.activeSceneId || sceneId;
      const scene = scenesState.scenes.find((item) => item.id === scenesState.activeSceneId);
      if (scene) {
        scene.activeMapId = payload.activeMapId || mapId || scene.activeMapId;
      }
      await loadData({ reset: true, silent: true });
      await loadScenes({ silent: true });
    } catch (error) {
      scenesError = error.message || "activate_failed";
    } finally {
      scenesBusy = false;
      renderScenes();
    }
  };

  const resolvePointPosition = (pointId) => {
    if (!pointId) return null;
    const node = graphData?.nodes?.find((item) => item.id === pointId);
    if (node?.pos) return node.pos;
    const worksite = worksites.find((item) => item.point === pointId || item.id === pointId);
    if (worksite?.pos) return worksite.pos;
    if (worksite?.point) {
      const worksiteNode = graphData?.nodes?.find((item) => item.id === worksite.point);
      if (worksiteNode?.pos) return worksiteNode.pos;
    }
    return null;
  };

  const getWorksiteOffset = (site, actionPos, mapMidY) => {
    if (!site) return { x: 0, y: 0 };
    let vertical = WORKSITE_AP_OFFSET;
    if (actionPos && Number.isFinite(actionPos.y) && Number.isFinite(mapMidY)) {
      vertical = actionPos.y >= mapMidY ? WORKSITE_AP_OFFSET : -WORKSITE_AP_OFFSET;
    }
    let horizontal = 0;
    if (site.kind === "pick") {
      horizontal = -WORKSITE_AP_OFFSET;
    } else if (site.kind === "drop") {
      horizontal = WORKSITE_AP_OFFSET;
    }
    return { x: horizontal, y: vertical };
  };

  const getWorksiteDisplayPos = (site, actionPointIndex, mapMidY) => {
    if (!site) return null;
    const actionPos = site.point ? actionPointIndex?.get(site.point) : null;
    if (site.pos) {
      if (
        actionPos &&
        distanceBetweenPoints(site.pos, actionPos) > WORKSITE_POS_MAX_DRIFT
      ) {
        const offset = getWorksiteOffset(site, actionPos, mapMidY);
        return { x: actionPos.x + offset.x, y: actionPos.y + offset.y };
      }
      return site.pos;
    }
    if (!actionPos) return null;
    const offset = getWorksiteOffset(site, actionPos, mapMidY);
    return { x: actionPos.x + offset.x, y: actionPos.y + offset.y };
  };

  const resolveWorksiteTargetPos = (site) => {
    if (!site) return null;
    if (site.point) return resolvePointPosition(site.point);
    return site.pos || null;
  };

  const resolveLocationPos = (location) => {
    if (!location) return null;
    if (location.pos) return location.pos;
    return resolvePointPosition(location.point);
  };

  const loadOpsOverrides = () => {
    const raw = safeParse(localStorage.getItem(OPS_STATE_KEY));
    if (!raw || typeof raw !== "object") {
      return { buffers: {}, places: {} };
    }
    return {
      buffers: raw.buffers || {},
      places: raw.places || {}
    };
  };

  const persistOpsOverrides = () => {
    if (isLocalSim()) return;
    localStorage.setItem(OPS_STATE_KEY, JSON.stringify(opsOverrides));
  };

  const resolveBufferOps = (buffer, goodsType, level) => {
    const levelKey = String(level);
    const override =
      opsOverrides.buffers?.[buffer.id]?.[goodsType]?.levels?.[levelKey];
    if (override) return override;
    const byGoods = buffer.opsByGoods?.[goodsType]?.levels?.[levelKey];
    if (byGoods) return byGoods;
    const defaults = packagingConfig?.operations?.bufferDefaults?.[goodsType]?.levels?.[levelKey];
    return defaults || null;
  };

  const updateBufferOps = (bufferId, goodsType, level, updates, kind) => {
    if (!bufferId || !goodsType) return;
    if (isLocalSim()) {
      postFleetJson("/packaging/ops/buffer", { bufferId, goodsType, level, updates, kind })
        .then((payload) => {
          if (payload?.ops) {
            opsOverrides = payload.ops;
            renderBufferEditor();
          }
        })
        .catch((error) => {
          console.warn("Buffer ops update failed", error);
        });
      return;
    }
    const levelKey = String(level);
    const current =
      opsOverrides.buffers?.[bufferId]?.[goodsType]?.levels?.[levelKey] || {};
    const next = {
      ...current,
      [kind]: { ...(current[kind] || {}), ...updates }
    };
    opsOverrides = {
      ...opsOverrides,
      buffers: {
        ...opsOverrides.buffers,
        [bufferId]: {
          ...(opsOverrides.buffers?.[bufferId] || {}),
          [goodsType]: {
            ...(opsOverrides.buffers?.[bufferId]?.[goodsType] || {}),
            levels: {
              ...(opsOverrides.buffers?.[bufferId]?.[goodsType]?.levels || {}),
              [levelKey]: next
            }
          }
        }
      }
    };
    persistOpsOverrides();
    renderBufferEditor();
  };

  const getPlaceById = (placeId) => packagingConfig?.places?.[placeId] || null;

  const resolvePlacePos = (placeId) => {
    const place = getPlaceById(placeId);
    if (!place) return null;
    return resolvePointPosition(place.point) || place.pos || null;
  };

  const resolvePlaceOps = (placeId, goodsType) => {
    const override = opsOverrides.places?.[placeId]?.[goodsType];
    if (override) return override;
    const place = getPlaceById(placeId);
    const byGoods = place?.opsByGoods?.[goodsType];
    if (byGoods) return byGoods;
    return packagingConfig?.operations?.placeDefaults?.[goodsType] || null;
  };

  const updatePlaceOps = (placeId, goodsType, updates, kind) => {
    if (!placeId || !goodsType) return;
    if (isLocalSim()) {
      postFleetJson("/packaging/ops/place", { placeId, goodsType, updates, kind })
        .then((payload) => {
          if (payload?.ops) {
            opsOverrides = payload.ops;
            renderPlaceOps();
          }
        })
        .catch((error) => {
          console.warn("Place ops update failed", error);
        });
      return;
    }
    const current = opsOverrides.places?.[placeId]?.[goodsType] || {};
    const next = {
      ...current,
      [kind]: { ...(current[kind] || {}), ...updates }
    };
    opsOverrides = {
      ...opsOverrides,
      places: {
        ...opsOverrides.places,
        [placeId]: {
          ...(opsOverrides.places?.[placeId] || {}),
          [goodsType]: next
        }
      }
    };
    persistOpsOverrides();
    renderPlaceOps();
  };

  const buildBufferLayout = (buffer) => {
    if (!PackagingEngine) return [];
    return PackagingEngine.buildBufferLayout(buffer);
  };

  const buildBufferSignature = (config) => {
    if (!PackagingEngine) return "";
    return PackagingEngine.buildBufferSignature(config);
  };

  const buildBufferState = (buffer, config) => {
    if (!PackagingEngine) return [];
    return PackagingEngine.buildBufferState(buffer, config);
  };

  const loadBufferState = (config) => {
    const raw = safeParse(localStorage.getItem(PACKAGING_STATE_KEY));
    const savedSignature = localStorage.getItem(PACKAGING_SIGNATURE_KEY);
    if (!PackagingEngine) return {};
    const result = PackagingEngine.loadBufferState(config, raw, savedSignature);
    localStorage.setItem(PACKAGING_SIGNATURE_KEY, result.signature);
    return result.state;
  };

  const persistBufferState = () => {
    if (isLocalSim()) return;
    localStorage.setItem(PACKAGING_STATE_KEY, JSON.stringify(bufferState));
    if (packagingConfig) {
      localStorage.setItem(PACKAGING_SIGNATURE_KEY, buildBufferSignature(packagingConfig));
    }
  };

  const loadLineRequests = (config) => {
    const raw = safeParse(localStorage.getItem(LINE_REQUEST_KEY));
    if (!PackagingEngine) return [];
    return PackagingEngine.createLineRequests(config, raw);
  };

  const persistLineRequests = () => {
    if (isLocalSim()) return;
    localStorage.setItem(LINE_REQUEST_KEY, JSON.stringify(lineRequests));
  };

  const applyPackagingState = (payload) => {
    if (!payload || typeof payload !== "object") return;
    if (payload.bufferState && typeof payload.bufferState === "object") {
      bufferState = payload.bufferState;
    }
    if (Array.isArray(payload.lineRequests)) {
      lineRequests = payload.lineRequests;
    }
    if (payload.opsOverrides && typeof payload.opsOverrides === "object") {
      opsOverrides = payload.opsOverrides;
    }
    if (packagingConfig) {
      if (!selectedBufferCell) {
        const firstBufferId = packagingConfig.buffers?.[0]?.id || null;
        const firstCell = firstBufferId ? bufferState[firstBufferId]?.[0] : null;
        selectedBufferCell = firstCell
          ? { bufferId: firstBufferId, cellId: firstCell.id }
          : null;
      }
      if (!selectedPlaceId) {
        const firstPlaceId = packagingConfig.places ? Object.keys(packagingConfig.places)[0] : null;
        selectedPlaceId = firstPlaceId;
      }
      if (!selectedPlaceGoods) {
        selectedPlaceGoods = packagingConfig.goodsTypes?.[0] || null;
      }
    }
    renderBufferGrid();
    renderBufferEditor();
    renderLineRequests();
    renderStreams();
    renderPlaceOps();
  };

  const refreshPackagingState = async () => {
    if (!isLocalSim() || !packagingConfig) return;
    try {
      const payload = await fetchJson(`${fleetApiBase}/packaging`);
      applyPackagingState(payload);
    } catch (error) {
      console.warn("Packaging refresh failed", error);
    }
  };

  const resetSceneRuntime = () => {
    stopFleetUpdates();
    obstacles = [];
    obstacleIdSeq = 1;
    obstacleLayer = null;
    manualTargetRobotId = null;
    manualDrive.enabled = false;
    manualDrive.robotId = null;
    manualDrive.driving = false;
    manualDrive.keys.clear();
    bufferState = {};
    lineRequests = [];
    selectedBufferCell = null;
    selectedBufferLevel = 1;
    opsOverrides = { buffers: {}, places: {} };
    selectedPlaceId = null;
    selectedPlaceGoods = null;
    mapState = null;
    mapSvg.innerHTML = "";
    miniMapSvg.innerHTML = "";
  };

  const fetchMapBundle = async () =>
    Promise.all([
      fetchJson("/data/graph.json"),
      fetchJson("/data/workflow.json5"),
      fetchJsonSafe("/data/packaging.json"),
      fetchJsonSafe("/data/robots.json")
    ]).then(([graph, workflow, packaging, robotsCfg]) => ({
      graph,
      workflow,
      packaging,
      robotsCfg
    }));

  const resolveDispatchStrategy = () => {
    const override = normalizeOption(
      settingsState.dispatchStrategy,
      DISPATCH_STRATEGY_OPTIONS.map((item) => item.value)
    );
    if (override) return override;
    if (robotsConfig?.strategy) return String(robotsConfig.strategy);
    return "nearest";
  };

  const resolveTrafficStrategyName = (config) => {
    const override = normalizeOption(
      settingsState.trafficStrategy,
      TRAFFIC_STRATEGY_OPTIONS.map((item) => item.value)
    );
    if (override) return override;
    const trafficConfig = config?.traffic || {};
    return trafficConfig.strategy || config?.trafficStrategy || "simple";
  };

  const applyAlgorithmOverrides = () => {};

  const applyMapBundle = ({ graph, workflow, packaging, robotsCfg }) => {
    graphData = graph;
    workflowData = workflow;
    packagingConfig = packaging;
    robotsConfig = robotsCfg;
    applyAlgorithmOverrides();
    worksites = buildWorksites(workflowData);
    worksiteState = loadWorksiteState(worksites);
    const initialRobots = buildRobots(graphData, worksites, robotsConfig);
    const initialTasks = buildTasks();
    if (robotRepo) {
      robotRepo.setAll(initialRobots);
    } else {
      robots = initialRobots;
    }
    if (taskRepo) {
      taskRepo.setAll(initialTasks);
    } else {
      tasks = initialTasks;
    }
    syncDomainState();
    renderMap();
    refreshSimObstacles().catch(() => {});
    refreshRobotDiagnosticsCache();
    renderRobots();
    renderManualDrivePanel();
    renderStreams();
    renderFields();
    renderTasks();
    renderTrafficDiagnostics();
    renderPackaging();
    syncSettingsPanel();
    dataLoaded = true;
    if (isLocalSim()) {
      refreshPackagingState();
    }
    startFleetUpdates();
    startManualDriveLoop();
  };

  const loadData = async (options = {}) => {
    const { reset = false, silent = false } = options;
    const placeholders = [robotsList, streamsList, fieldsList, tasksList].filter(Boolean);
    if (!silent) {
      placeholders.forEach((list) => {
        list.innerHTML = "<div class=\"card\">Ladowanie danych...</div>";
      });
      if (bufferGrid) {
        bufferGrid.innerHTML = "<div class=\"card\">Ladowanie bufora...</div>";
      }
      if (lineRequestsList) {
        lineRequestsList.innerHTML = "<div class=\"card\">Ladowanie linii...</div>";
      }
    }

    loadScenes({ silent });

    try {
      await loadFleetConfig();
      await loadAlgorithmCatalog();
      const bundle = await fetchMapBundle();
      if (reset) {
        resetSceneRuntime();
      }
      applyMapBundle(bundle);
      if (isLocalSim()) {
        syncLocalSimSettings().catch(() => {});
      }
    } catch (error) {
      renderMapError("Brak danych mapy.");
      if (!silent) {
        placeholders.forEach((list) => {
          list.innerHTML = "<div class=\"card\">Brak danych.</div>";
        });
        renderPackaging();
      }
    }
  };

  const buildWorksites = (workflow) => {
    const locations = workflow?.bin_locations || {};
    return Object.entries(locations).map(([id, item]) => {
      const kind = id.startsWith("PICK") ? "pick" : id.startsWith("DROP") ? "drop" : "worksite";
      return {
        id,
        group: item.group,
        point: item.point,
        pos: item.pos,
        kind
      };
    });
  };

  const normalizeRobotModel = (model) => {
    if (!model || typeof model !== "object") return null;
    const head = Number(model.head);
    const tail = Number(model.tail);
    const width = Number(model.width);
    if (!Number.isFinite(head) || !Number.isFinite(tail) || !Number.isFinite(width)) {
      return null;
    }
    if (head <= 0 || tail <= 0 || width <= 0) {
      return null;
    }
    return { head, tail, width };
  };

  const resolveDefaultRobotModel = (config) => {
    if (!config || typeof config !== "object") return { ...DEFAULT_ROBOT_MODEL };
    const models = config.models && typeof config.models === "object" ? config.models : {};
    let candidate = null;
    if (config.defaultModel) {
      candidate =
        typeof config.defaultModel === "string" ? models[config.defaultModel] : config.defaultModel;
    }
    if (!candidate && config.model && typeof config.model === "object") {
      candidate = config.model;
    }
    const normalized = normalizeRobotModel(candidate);
    return normalized || { ...DEFAULT_ROBOT_MODEL };
  };

  const resolveRobotModel = (robot, config) => {
    const models = config?.models && typeof config.models === "object" ? config.models : {};
    let candidate = null;
    if (robot) {
      if (typeof robot.model === "string") {
        candidate = models[robot.model];
      } else if (robot.model && typeof robot.model === "object") {
        candidate = robot.model;
      }
    }
    const normalized = normalizeRobotModel(candidate);
    return normalized || resolveDefaultRobotModel(config);
  };

  const initPackagingState = () => {
    if (!packagingConfig || !bufferGrid || !lineRequestsList || !bufferEditor) {
      return;
    }
    if (isLocalSim()) {
      return;
    }
    if (Object.keys(bufferState).length && lineRequests.length) {
      return;
    }
    bufferState = loadBufferState(packagingConfig);
    lineRequests = loadLineRequests(packagingConfig);
    const firstBufferId = packagingConfig.buffers?.[0]?.id || null;
    const firstCell = firstBufferId ? bufferState[firstBufferId]?.[0] : null;
    selectedBufferCell = firstCell
      ? { bufferId: firstBufferId, cellId: firstCell.id }
      : null;
    opsOverrides = loadOpsOverrides();
    selectedBufferLevel = 1;
    const firstPlaceId = packagingConfig.places ? Object.keys(packagingConfig.places)[0] : null;
    selectedPlaceId = firstPlaceId;
    selectedPlaceGoods = packagingConfig.goodsTypes?.[0] || null;
  };

  const getBufferCell = (bufferId, cellId) =>
    (bufferState[bufferId] || []).find((cell) => cell.id === cellId);

  const updateBufferCell = (bufferId, cellId, updates) => {
    if (isLocalSim()) {
      postFleetJson("/packaging/buffer", { bufferId, cellId, updates })
        .then((payload) => {
          if (payload?.state) {
            applyPackagingState(payload.state);
          }
        })
        .catch((error) => {
          console.warn("Buffer update failed", error);
        });
      return;
    }
    bufferState = {
      ...bufferState,
      [bufferId]: (bufferState[bufferId] || []).map((cell) =>
        cell.id === cellId ? { ...cell, ...updates } : cell
      )
    };
    persistBufferState();
    renderBufferGrid();
    renderBufferEditor();
  };

  const updateLineRequest = (lineId, key, updates) => {
    if (isLocalSim()) {
      postFleetJson("/packaging/line", { lineId, kind: key, updates })
        .then((payload) => {
          if (payload?.state) {
            applyPackagingState(payload.state);
          }
        })
        .catch((error) => {
          console.warn("Line request update failed", error);
        });
      return;
    }
    lineRequests = lineRequests.map((req) => {
      if (req.id !== lineId) return req;
      if (!key) {
        return { ...req, ...updates };
      }
      return { ...req, [key]: { ...req[key], ...updates } };
    });
    persistLineRequests();
    renderLineRequests();
    renderStreams();
  };

  const renderBufferGrid = () => {
    if (!bufferGrid || !packagingConfig) return;
    const buffers = packagingConfig.buffers || [];
    if (!buffers.length) {
      bufferGrid.innerHTML = "<div class=\"card\">Brak buforow.</div>";
      return;
    }
    bufferGrid.innerHTML = "";
    buffers.forEach((buffer) => {
      const card = document.createElement("div");
      card.className = "card buffer-card";
      const title = document.createElement("div");
      title.className = "card-title";
      title.textContent = buffer.name || buffer.id;
      card.appendChild(title);

      const grid = document.createElement("div");
      grid.className = "buffer-grid-inner";
      const layout = buildBufferLayout(buffer);
      layout.forEach((lane) => {
        const row = document.createElement("div");
        row.className = "buffer-row";
        lane.slots.forEach((slot, slotIndex) => {
          const cellId = slot.id;
          const cell = getBufferCell(buffer.id, cellId);
          const cellEl = document.createElement("div");
          cellEl.className = "buffer-cell";
          if (!cell || cell.stack === 0) {
            cellEl.classList.add("empty");
          }
          if (
            selectedBufferCell &&
            selectedBufferCell.bufferId === buffer.id &&
            selectedBufferCell.cellId === cellId
          ) {
            cellEl.classList.add("active");
          }
          cellEl.dataset.cellId = cellId;
          cellEl.dataset.bufferId = buffer.id;
          const pointLabel = slot.point || cell?.point || "--";
          const slotLabel = `${lane.id || `L${lane.laneIndex + 1}`}/D${slotIndex + 1}`;
          cellEl.innerHTML = `
            <div class="cell-title">${slotLabel}</div>
            <div class="cell-meta">${cell?.goodsType || "-"}</div>
            <div class="cell-meta">AP: ${pointLabel}</div>
            <div class="cell-meta">Stack: ${cell?.stack || 0}/${buffer.maxStack || 0}</div>
          `;
          cellEl.addEventListener("click", () => {
            selectedBufferCell = { bufferId: buffer.id, cellId };
            renderBufferGrid();
            renderBufferEditor();
          });
          row.appendChild(cellEl);
        });
        grid.appendChild(row);
      });

      const legend = document.createElement("div");
      legend.className = "buffer-legend";
      legend.innerHTML = `
        <span class="buffer-pill empty">Puste</span>
        <span class="buffer-pill filled">Zajete</span>
      `;

      card.appendChild(grid);
      card.appendChild(legend);
      bufferGrid.appendChild(card);
    });
  };

  const renderBufferEditor = () => {
    if (!bufferEditor || !packagingConfig) return;
    const cell = selectedBufferCell
      ? getBufferCell(selectedBufferCell.bufferId, selectedBufferCell.cellId)
      : null;
    const buffer = selectedBufferCell
      ? packagingConfig.buffers.find((item) => item.id === selectedBufferCell.bufferId)
      : null;
    if (!cell) {
      bufferEditor.innerHTML = "<div class=\"card-meta\">Wybierz komorke w buforze.</div>";
      return;
    }
    const maxStack = buffer?.maxStack || 0;
    const goodsOptions = [
      `<option value="">--</option>`,
      ...(buffer?.allowedGoods || packagingConfig.goodsTypes || []).map(
        (item) => `<option value="${item}">${item}</option>`
      )
    ].join("");
    const levelOptions = Array.from({ length: maxStack }, (_, idx) => {
      const level = idx + 1;
      return `<option value="${level}">${level}</option>`;
    }).join("");
    const ops = resolveBufferOps(buffer, cell.goodsType, selectedBufferLevel) || {};
    const loadOps = ops.load || {};
    const unloadOps = ops.unload || {};
    bufferEditor.innerHTML = `
      <div class="buffer-field">
        <label>Komorka</label>
        <div>${cell.id} (${buffer?.name || buffer?.id || "--"})</div>
      </div>
      <div class="buffer-field">
        <label>Action point</label>
        <div>${cell.point || "--"}</div>
      </div>
      <div class="buffer-field">
        <label>Typ opakowania</label>
        <select id="buffer-goods-select">${goodsOptions}</select>
      </div>
      <div class="buffer-field">
        <label>Poziom stacku</label>
        <input id="buffer-stack-input" type="number" min="0" max="${maxStack}" value="${cell.stack}" />
      </div>
      <div class="buffer-field">
        <label>Poziom operacji</label>
        <select id="buffer-level-select">${levelOptions}</select>
      </div>
      <div class="ops-section">
        <div class="ops-title">Pobieranie (load)</div>
        <div class="buffer-field">
          <label>start_height</label>
          <input id="op-load-start" type="number" step="0.01" value="${loadOps.start_height ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>rec_height</label>
          <input id="op-load-rec" type="number" step="0.01" value="${loadOps.rec_height ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>end_height</label>
          <input id="op-load-end" type="number" step="0.01" value="${loadOps.end_height ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>recfile</label>
          <input id="op-load-recfile" type="text" value="${loadOps.recfile ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>recognize</label>
          <select id="op-load-recognize">
            <option value="">--</option>
            <option value="true" ${loadOps.recognize === true ? "selected" : ""}>true</option>
            <option value="false" ${loadOps.recognize === false ? "selected" : ""}>false</option>
          </select>
        </div>
      </div>
      <div class="ops-section">
        <div class="ops-title">Odkladanie (unload)</div>
        <div class="buffer-field">
          <label>start_height</label>
          <input id="op-unload-start" type="number" step="0.01" value="${unloadOps.start_height ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>end_height</label>
          <input id="op-unload-end" type="number" step="0.01" value="${unloadOps.end_height ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>recognize</label>
          <select id="op-unload-recognize">
            <option value="">--</option>
            <option value="true" ${unloadOps.recognize === true ? "selected" : ""}>true</option>
            <option value="false" ${unloadOps.recognize === false ? "selected" : ""}>false</option>
          </select>
        </div>
      </div>
    `;
    const select = bufferEditor.querySelector("#buffer-goods-select");
    const input = bufferEditor.querySelector("#buffer-stack-input");
    if (select) {
      select.value = cell.goodsType || "";
      select.addEventListener("change", (event) => {
        updateBufferCell(selectedBufferCell.bufferId, cell.id, { goodsType: event.target.value });
      });
    }
    if (input) {
      input.addEventListener("change", (event) => {
        const next = clamp(Number(event.target.value || 0), 0, maxStack);
        updateBufferCell(selectedBufferCell.bufferId, cell.id, { stack: next });
      });
    }
    const levelSelect = bufferEditor.querySelector("#buffer-level-select");
    if (levelSelect) {
      levelSelect.value = String(selectedBufferLevel);
      levelSelect.addEventListener("change", (event) => {
        selectedBufferLevel = Number(event.target.value || 1);
        renderBufferEditor();
      });
    }

    const bindOpsInput = (id, kind, field, cast) => {
      const el = bufferEditor.querySelector(id);
      if (!el) return;
      el.addEventListener("change", (event) => {
        const rawValue = event.target.value;
        const value = cast ? cast(rawValue) : rawValue;
        updateBufferOps(selectedBufferCell.bufferId, cell.goodsType, selectedBufferLevel, { [field]: value }, kind);
      });
    };
    bindOpsInput("#op-load-start", "load", "start_height", (v) => (v === "" ? null : Number(v)));
    bindOpsInput("#op-load-rec", "load", "rec_height", (v) => (v === "" ? null : Number(v)));
    bindOpsInput("#op-load-end", "load", "end_height", (v) => (v === "" ? null : Number(v)));
    bindOpsInput("#op-load-recfile", "load", "recfile", (v) => v || null);
    bindOpsInput("#op-load-recognize", "load", "recognize", (v) => (v === "" ? null : v === "true"));
    bindOpsInput("#op-unload-start", "unload", "start_height", (v) => (v === "" ? null : Number(v)));
    bindOpsInput("#op-unload-end", "unload", "end_height", (v) => (v === "" ? null : Number(v)));
    bindOpsInput("#op-unload-recognize", "unload", "recognize", (v) => (v === "" ? null : v === "true"));
  };

  const renderLineRequests = () => {
    if (!lineRequestsList || !packagingConfig) return;
    const lines = packagingConfig.lines || [];
    if (!lines.length) {
      lineRequestsList.innerHTML = "<div class=\"card-meta\">Brak linii.</div>";
      return;
    }
    const groups = packagingConfig.goodsGroups || {};
    lineRequestsList.innerHTML = "";
    lines.forEach((line) => {
      const request = lineRequests.find((item) => item.id === line.id);
      const packagingOptions = (groups.packaging || packagingConfig.goodsTypes || [])
        .map(
          (item) =>
            `<option value="${item}" ${request?.supply?.goodsType === item ? "selected" : ""}>${item}</option>`
        )
        .join("");
      const returnOptions = (groups.return || groups.packaging || packagingConfig.goodsTypes || [])
        .map(
          (item) =>
            `<option value="${item}" ${request?.return?.goodsType === item ? "selected" : ""}>${item}</option>`
        )
        .join("");
      const supplyPoint = getPlaceById(line.supplyPoint)?.point || line.supplyPoint || "--";
      const outputPoint = getPlaceById(line.outputPoint)?.point || line.outputPoint || "--";
      const wastePoint = getPlaceById(line.wastePoint)?.point || line.wastePoint || "--";
      const auxPoint = getPlaceById(line.auxPoint)?.point || line.auxPoint || "--";
      const card = document.createElement("div");
      card.className = "line-request";
      card.innerHTML = `
        <div class="line-request-header">
          <div class="line-request-title">${line.name || line.id}</div>
          <div class="line-request-status">Linia ${line.id}</div>
        </div>
        <div class="line-request-actions">
          <div class="buffer-field">
            <label>Opakowania (${supplyPoint})</label>
            <select data-line-id="${line.id}" data-kind="supply">${packagingOptions}</select>
            <button class="${request?.supply?.active ? "off" : ""}" data-line-id="${line.id}" data-kind="supply">
              ${request?.supply?.active ? "Anuluj" : "Zamow"}
            </button>
          </div>
          <div class="buffer-field">
            <label>Materialy dodatkowe (${auxPoint})</label>
            <button class="${request?.aux?.active ? "off" : ""}" data-line-id="${line.id}" data-kind="aux">
              ${request?.aux?.active ? "Anuluj" : "Zamow"}
            </button>
          </div>
          <div class="buffer-field">
            <label>Odbior wyrobu (${outputPoint})</label>
            <button class="${request?.output?.active ? "off" : ""}" data-line-id="${line.id}" data-kind="output">
              ${request?.output?.active ? "Anuluj" : "Odbierz"}
            </button>
          </div>
          <div class="buffer-field">
            <label>Odbior odpadu (${wastePoint})</label>
            <button class="${request?.waste?.active ? "off" : ""}" data-line-id="${line.id}" data-kind="waste">
              ${request?.waste?.active ? "Anuluj" : "Odbierz"}
            </button>
          </div>
          <div class="buffer-field">
            <label>Zwrot opakowan (${supplyPoint})</label>
            <select data-line-id="${line.id}" data-kind="return">${returnOptions}</select>
            <button class="${request?.return?.active ? "off" : ""}" data-line-id="${line.id}" data-kind="return">
              ${request?.return?.active ? "Anuluj" : "Zwroc"}
            </button>
          </div>
        </div>
      `;
      card.querySelectorAll("select").forEach((select) => {
        select.addEventListener("change", (event) => {
          const kind = event.target.dataset.kind;
          updateLineRequest(line.id, kind, { goodsType: event.target.value });
        });
      });
      card.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => {
          const kind = button.dataset.kind;
          const current = request?.[kind]?.active;
          updateLineRequest(line.id, kind, { active: !current });
        });
      });
      lineRequestsList.appendChild(card);
    });
  };

  const renderPlaceOps = () => {
    if (!placeOpsPanel || !packagingConfig) return;
    const placeIds = packagingConfig.places ? Object.keys(packagingConfig.places) : [];
    if (!placeIds.length) {
      placeOpsPanel.innerHTML = "<div class=\"card-meta\">Brak miejsc.</div>";
      return;
    }
    if (!selectedPlaceId || !placeIds.includes(selectedPlaceId)) {
      selectedPlaceId = placeIds[0];
    }
    if (!selectedPlaceGoods) {
      selectedPlaceGoods = packagingConfig.goodsTypes?.[0] || "";
    }
    const goodsOptions = (packagingConfig.goodsTypes || [])
      .map(
        (item) =>
          `<option value="${item}" ${selectedPlaceGoods === item ? "selected" : ""}>${item}</option>`
      )
      .join("");
    const placeOptions = placeIds
      .map(
        (id) => `<option value="${id}" ${selectedPlaceId === id ? "selected" : ""}>${id}</option>`
      )
      .join("");
    const ops = resolvePlaceOps(selectedPlaceId, selectedPlaceGoods) || {};
    const loadOps = ops.load || {};
    const unloadOps = ops.unload || {};
    placeOpsPanel.innerHTML = `
      <div class="buffer-field">
        <label>Miejsce</label>
        <select id="place-select">${placeOptions}</select>
      </div>
      <div class="buffer-field">
        <label>Typ opakowania</label>
        <select id="place-goods">${goodsOptions}</select>
      </div>
      <div class="ops-section">
        <div class="ops-title">Pobieranie (load)</div>
        <div class="buffer-field">
          <label>start_height</label>
          <input id="place-load-start" type="number" step="0.01" value="${loadOps.start_height ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>rec_height</label>
          <input id="place-load-rec" type="number" step="0.01" value="${loadOps.rec_height ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>end_height</label>
          <input id="place-load-end" type="number" step="0.01" value="${loadOps.end_height ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>recfile</label>
          <input id="place-load-recfile" type="text" value="${loadOps.recfile ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>recognize</label>
          <select id="place-load-recognize">
            <option value="">--</option>
            <option value="true" ${loadOps.recognize === true ? "selected" : ""}>true</option>
            <option value="false" ${loadOps.recognize === false ? "selected" : ""}>false</option>
          </select>
        </div>
      </div>
      <div class="ops-section">
        <div class="ops-title">Odkladanie (unload)</div>
        <div class="buffer-field">
          <label>start_height</label>
          <input id="place-unload-start" type="number" step="0.01" value="${unloadOps.start_height ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>end_height</label>
          <input id="place-unload-end" type="number" step="0.01" value="${unloadOps.end_height ?? ""}" />
        </div>
        <div class="buffer-field">
          <label>recognize</label>
          <select id="place-unload-recognize">
            <option value="">--</option>
            <option value="true" ${unloadOps.recognize === true ? "selected" : ""}>true</option>
            <option value="false" ${unloadOps.recognize === false ? "selected" : ""}>false</option>
          </select>
        </div>
      </div>
    `;
    const placeSelect = placeOpsPanel.querySelector("#place-select");
    const goodsSelect = placeOpsPanel.querySelector("#place-goods");
    if (placeSelect) {
      placeSelect.addEventListener("change", (event) => {
        selectedPlaceId = event.target.value;
        renderPlaceOps();
      });
    }
    if (goodsSelect) {
      goodsSelect.addEventListener("change", (event) => {
        selectedPlaceGoods = event.target.value;
        renderPlaceOps();
      });
    }
    const bindPlaceInput = (id, kind, field, cast) => {
      const el = placeOpsPanel.querySelector(id);
      if (!el) return;
      el.addEventListener("change", (event) => {
        const rawValue = event.target.value;
        const value = cast ? cast(rawValue) : rawValue;
        updatePlaceOps(selectedPlaceId, selectedPlaceGoods, { [field]: value }, kind);
      });
    };
    bindPlaceInput("#place-load-start", "load", "start_height", (v) => (v === "" ? null : Number(v)));
    bindPlaceInput("#place-load-rec", "load", "rec_height", (v) => (v === "" ? null : Number(v)));
    bindPlaceInput("#place-load-end", "load", "end_height", (v) => (v === "" ? null : Number(v)));
    bindPlaceInput("#place-load-recfile", "load", "recfile", (v) => v || null);
    bindPlaceInput("#place-load-recognize", "load", "recognize", (v) => (v === "" ? null : v === "true"));
    bindPlaceInput("#place-unload-start", "unload", "start_height", (v) => (v === "" ? null : Number(v)));
    bindPlaceInput("#place-unload-end", "unload", "end_height", (v) => (v === "" ? null : Number(v)));
    bindPlaceInput("#place-unload-recognize", "unload", "recognize", (v) => (v === "" ? null : v === "true"));
  };

  const renderPackaging = () => {
    if (!bufferGrid || !lineRequestsList || !bufferEditor || !placeOpsPanel) {
      return;
    }
    if (!packagingConfig) {
      bufferGrid.innerHTML = "<div class=\"card\">Brak konfiguracji.</div>";
      lineRequestsList.innerHTML = "<div class=\"card\">Brak konfiguracji.</div>";
      bufferEditor.innerHTML = "<div class=\"card-meta\">Brak konfiguracji.</div>";
      placeOpsPanel.innerHTML = "<div class=\"card-meta\">Brak konfiguracji.</div>";
      return;
    }
    initPackagingState();
    renderBufferGrid();
    renderBufferEditor();
    renderLineRequests();
    renderPlaceOps();
    renderStreams();
  };

  const parseWorksiteKey = (id) => {
    const match = String(id).match(/^(.*?)(\\d+)?$/);
    if (!match) return { prefix: String(id), num: null };
    const prefix = match[1] || String(id);
    const num = match[2] ? Number(match[2]) : null;
    return { prefix, num };
  };

  const sortWorksites = (list, direction) => {
    const dir = direction === ORDER_DESC ? -1 : 1;
    return [...list].sort((a, b) => {
      const aKey = parseWorksiteKey(a.id);
      const bKey = parseWorksiteKey(b.id);
      if (aKey.prefix !== bKey.prefix) {
        return aKey.prefix.localeCompare(bKey.prefix) * dir;
      }
      if (aKey.num !== null && bKey.num !== null && aKey.num !== bKey.num) {
        return (aKey.num - bKey.num) * dir;
      }
      return String(a.id).localeCompare(String(b.id)) * dir;
    });
  };

  const getGroupWorksites = (groupId) => {
    return worksites.filter((site) => site.group === groupId);
  };

  const getDropOrder = (stream) => {
    const order = stream?.drop_policy?.order;
    if (order === "asc" || order === "ascending") return ORDER_ASC;
    if (order === "desc" || order === "descending") return ORDER_DESC;
    return ORDER_DESC;
  };

  const getDropAccessRule = (stream) => {
    const rule = stream?.drop_policy?.access_rule;
    if (rule === "any_free" || rule === "first_free") return "any_free";
    return "preceding_empty";
  };

  const getNextPickCandidate = (pickGroupId, order, reserved) => {
    const groupSites = sortWorksites(getGroupWorksites(pickGroupId), order);
    for (const site of groupSites) {
      const state = getWorksiteState(site.id);
      if (reserved?.has(site.id)) continue;
      if (state.blocked) continue;
      if (state.occupancy === "filled") {
        return site;
      }
    }
    return null;
  };

  const getNextDropCandidate = (dropGroups, order, reserved, accessRule) => {
    const allowShadowed = accessRule === "any_free";
    for (const groupId of dropGroups) {
      const groupSites = sortWorksites(getGroupWorksites(groupId), order);
      let blockedAhead = false;
      for (const site of groupSites) {
        const state = getWorksiteState(site.id);
        if (state.blocked || state.occupancy === "filled" || reserved?.has(site.id)) {
          if (allowShadowed) {
            continue;
          }
          blockedAhead = true;
          break;
        }
        return { site, groupId };
      }
      if (blockedAhead) {
        continue;
      }
    }
    return null;
  };

  const loadWorksiteState = (worksiteList) => {
    const state = {};
    worksiteList.forEach((site) => {
      state[site.id] = { occupancy: "empty", blocked: false };
    });
    return state;
  };

  const normalizeRobotState = (value) => {
    if (!value || typeof value !== "object") {
      return {
        dispatchable: true,
        online: true,
        controlled: true,
        blocked: false,
        manualMode: false
      };
    }
    const online = value.online !== false;
    return {
      dispatchable: online ? value.dispatchable !== false : false,
      online,
      controlled: Boolean(value.controlled),
      blocked: Boolean(value.blocked),
      manualMode: Boolean(value.manualMode)
    };
  };

  const loadRobotState = (robotList) =>
    robotList.map((robot) => ({
      ...robot,
      ...normalizeRobotState({})
    }));

  const persistRobotState = () => {};

  const refreshRobotViews = () => {
    persistRobotState();
    refreshRobotDiagnosticsCache();
    renderRobots();
    updateRobotMarkers();
    renderNavControls();
    renderManualDrivePanel();
  };

  const updateRobotState = (id, updates) => {
    if (robotRepo) {
      if (updates && Object.keys(updates).length) {
        robotRepo.update(id, updates);
      }
      syncDomainState();
    } else {
      robots = robots.map((robot) => (robot.id === id ? { ...robot, ...updates } : robot));
    }
    refreshRobotViews();
  };

  const syncFaultRobotSelect = () => {
    if (!faultRobotSelect) return;
    const current = faultRobotSelect.value;
    faultRobotSelect.innerHTML = robots
      .map((robot) => `<option value="${robot.id}">${robot.name}</option>`)
      .join("");
    if (current && robots.some((robot) => robot.id === current)) {
      faultRobotSelect.value = current;
      return;
    }
    if (robots[0]) {
      faultRobotSelect.value = robots[0].id;
    }
  };

  const getFaultRobotId = () => {
    if (faultRobotSelect && faultRobotSelect.value) return faultRobotSelect.value;
    if (manualTargetRobotId) return manualTargetRobotId;
    return robots[0]?.id || null;
  };

  const clearRobotBlock = (robotId) => {
    if (isRobokitSim()) return false;
    const diagnostics = robotId ? getRobotDiagnostics(robotId) : null;
    if (diagnostics?.reason === "blocked_collision") {
      return clearRobotCollision(robotId);
    }
    postFleetJson("/faults/clear-block", { robotId })
      .then((payload) => {
        if (!payload?.ok) {
          console.warn("Clear block rejected", payload);
        }
        refreshFleetStatus();
      })
      .catch((error) => {
        console.warn("Clear block failed", error);
      });
    return true;
  };

  const clearRobotCollision = (robotId) => {
    if (isRobokitSim()) return false;
    postFleetJson("/faults/clear-collision", { robotId })
      .then((payload) => {
        if (!payload?.ok) {
          console.warn("Clear collision rejected", payload);
        }
        refreshFleetStatus();
      })
      .catch((error) => {
        console.warn("Clear collision failed", error);
      });
    return true;
  };

  const simulatePickProblem = (robotId) => {
    if (isRobokitSim()) return false;
    postFleetJson("/faults/pick-problem", { robotId })
      .then(() => refreshFleetStatus())
      .catch((error) => {
        console.warn("Pick problem failed", error);
      });
    return true;
  };

  const simulatePickRobotBlocked = (robotId) => {
    if (isRobokitSim()) return false;
    postFleetJson("/faults/pick-blocked", { robotId })
      .then(() => refreshFleetStatus())
      .catch((error) => {
        console.warn("Pick blocked failed", error);
      });
    return true;
  };

  const simulateDropProblem = (robotId) => {
    if (isRobokitSim()) return false;
    postFleetJson("/faults/drop-problem", { robotId })
      .then(() => refreshFleetStatus())
      .catch((error) => {
        console.warn("Drop problem failed", error);
      });
    return true;
  };

  const simulateDriveProblem = (robotId, mode) => {
    if (isRobokitSim()) return false;
    return Boolean(addObstacleForRobot(robotId, mode));
  };

  const buildRobots = (graph, worksiteList, config) => {
    const worksiteIndex = new Map(worksiteList.map((site) => [site.id, site.pos]));
    const nodeIndex = new Map((graph?.nodes || []).map((node) => [node.id, node.pos]));

    const resolvePos = (ref, fallbackPos) => {
      if (fallbackPos && typeof fallbackPos === "object") return fallbackPos;
      if (worksiteIndex.has(ref)) return worksiteIndex.get(ref);
      if (nodeIndex.has(ref)) return nodeIndex.get(ref);
      return worksiteList[0]?.pos || { x: 0, y: 0 };
    };

    const baseModel = resolveDefaultRobotModel(config);
    const baseRobots = [
      {
        id: "RB-01",
        name: "Robot 01",
        battery: 82,
        radius: ROBOT_RADIUS,
        model: { ...baseModel },
        blocked: false,
        task: null,
        activity: "Idle",
        ref: "PICK-03",
        pos: resolvePos("PICK-03", null),
        heading: 0,
        speed: 0,
        dispatchable: true,
        online: true,
        controlled: false,
        manualMode: false
      }
    ];

    const configRobots = (config?.robots || []).map((robot, index) => {
      const id = robot.id || `RB-${String(index + 1).padStart(2, "0")}`;
      const name = robot.name || `Robot ${String(index + 1).padStart(2, "0")}`;
      const ref = robot.ref || robot.point || robot.start || "PICK-03";
      const pos = resolvePos(ref, robot.pos);
      const model = resolveRobotModel(robot, config);
      return {
        id,
        name,
        battery: Number.isFinite(robot.battery) ? robot.battery : 80,
        radius: Number.isFinite(robot.radius) ? robot.radius : ROBOT_RADIUS,
        model,
        blocked: Boolean(robot.blocked),
        task: null,
        activity: "Idle",
        ref,
        pos,
        heading: Number.isFinite(robot.heading) ? robot.heading : 0,
        speed: Number.isFinite(robot.speed) ? robot.speed : 0,
        dispatchable: robot.dispatchable !== false,
        online: robot.online !== false,
        controlled: robot.controlled !== false,
        manualMode: Boolean(robot.manualMode)
      };
    });

    const robotsToUse = configRobots.length ? configRobots : baseRobots;
    return loadRobotState(robotsToUse);
  };

  const buildTasks = () => [];

  const formatCoreTaskStatus = (status) => {
    if (status === "completed") return "Completed";
    if (status === "failed") return "Failed";
    if (status === "paused") return "Paused";
    if (status === "cancelled") return "Cancelled";
    return "In progress";
  };

  const formatCoreTaskPhase = (phase) => {
    const map = {
      blocked: "Blocked",
      blocked_obstacle: "Blocked by obstacle",
      blocked_pick: "Pick blocked",
      blocked_collision: "Collision",
      reroute_drop: "Reroute drop",
      yield: "Yielding",
      recovery: "Recovery",
      stuck: "Stuck",
      picking: "Picking",
      dropping: "Dropping",
      done: "Done",
      manual_move: "Manual move",
      stopped: "Stopped",
      to_pick: "To pick",
      to_drop: "To drop",
      to_park: "Parking",
      no_route: "No route"
    };
    return map[phase] || phase || null;
  };

  const mapCoreTasks = (coreTasks) => {
    if (!Array.isArray(coreTasks)) return [];
    return coreTasks.map((task) => ({
      id: task.id,
      robotId: task.robotId || null,
      pickId: task.pickId || null,
      dropId: task.dropId || null,
      status: formatCoreTaskStatus(task.status),
      phase: formatCoreTaskPhase(task.phase),
      streamId: task.streamId || null,
      kind: task.kind || "Robokit",
      meta: task.meta || null
    }));
  };

  const mapCoreRobots = (coreRobots, baseRobots, mappedTasks) => {
    const baseById = new Map(baseRobots.map((robot) => [robot.id, robot]));
    const taskByRobot = new Map();
    const activeStatuses = new Set(["In progress", "Paused"]);
    mappedTasks.forEach((task) => {
      if (task.robotId && activeStatuses.has(task.status)) {
        taskByRobot.set(task.robotId, task);
      }
    });
    const mapped = (Array.isArray(coreRobots) ? coreRobots : []).map((core) => {
      const base = baseById.get(core.id) || {};
      const baseDispatchable = resolveBoolean(base.dispatchable, true);
      const baseControlled = resolveBoolean(base.controlled, true);
      const baseOnline = resolveBoolean(base.online, true);
      const baseManualMode = resolveBoolean(base.manualMode, false);
      const baseBlocked = resolveBoolean(base.blocked, false);
      const pose = core.pose || {};
      const pos =
        Number.isFinite(pose.x) && Number.isFinite(pose.y)
          ? { x: pose.x, y: pose.y }
          : base.pos || { x: 0, y: 0 };
      const task = taskByRobot.get(core.id);
      const activity =
        core.activity ||
        (task?.status === "Paused"
          ? "Paused"
          : task?.phase || (task ? "In progress" : "Idle"));
      return {
        ...base,
        id: core.id || base.id,
        name: base.name || core.id || "Robot",
        battery: Number.isFinite(core.battery) ? core.battery : base.battery,
        blocked: resolveBoolean(core.blocked, baseBlocked),
        task: task ? task.id : null,
        activity,
        taskStatus: Number.isFinite(core.taskStatus) ? core.taskStatus : null,
        currentStation: core.currentStation || null,
        lastStation: core.lastStation || null,
        pos,
        heading: Number.isFinite(pose.angle) ? pose.angle : base.heading || 0,
        speed: Number.isFinite(core.speed) ? core.speed : base.speed || 0,
        dispatchable: resolveBoolean(core.dispatchable, baseDispatchable),
        online: resolveBoolean(core.online, baseOnline),
        controlled: resolveBoolean(core.controlled, baseControlled),
        manualMode: resolveBoolean(core.manualMode, baseManualMode),
        state: core.state || null,
        diagnostics: core.diagnostics || null
      };
    });
    const mappedIds = new Set(mapped.map((robot) => robot.id));
    baseRobots.forEach((base) => {
      if (!mappedIds.has(base.id)) {
        mapped.push(base);
      }
    });
    return mapped;
  };

  const updateWorksiteStateFromCore = (coreWorksites) => {
    if (!Array.isArray(coreWorksites)) return;
    coreWorksites.forEach((site) => {
      if (!site || !site.id) return;
      const state = getWorksiteState(site.id);
      state.occupancy = site.filled ? "filled" : "empty";
      state.blocked = Boolean(site.blocked);
      worksiteState[site.id] = state;
      applyWorksiteState(site.id);
    });
    renderStreams();
    renderFields();
  };

  const applyFleetStatus = (payload) => {
    if (!payload || typeof payload !== "object") return;
    if (!graphData) return;
    const baseRobots = buildRobots(graphData, worksites, robotsConfig);
    const mappedTasks = mapCoreTasks(payload.tasks || []);
    const mappedRobots = mapCoreRobots(payload.robots || [], baseRobots, mappedTasks);
    if (robotRepo) {
      robotRepo.setAll(mappedRobots);
    } else {
      robots = mappedRobots;
    }
    if (taskRepo) {
      taskRepo.setAll(mappedTasks);
    } else {
      tasks = mappedTasks;
    }
    lastFleetUpdateAt = Date.now();
    syncDomainState();
    if (manualTargetRobotId) {
      const target = getRobotById(manualTargetRobotId);
      if (!target || !target.manualMode) {
        manualTargetRobotId = null;
      }
    }
    if (manualDrive.robotId) {
      const manualRobot = getRobotById(manualDrive.robotId);
      if (!manualRobot || !manualRobot.manualMode) {
        manualDrive.enabled = false;
        manualDrive.keys.clear();
        manualDrive.driving = false;
        manualDrive.robotId = null;
      }
    }
    refreshRobotViews();
    renderTasks();
    syncFaultRobotSelect();
    updateWorksiteStateFromCore(payload.worksites || []);
  };

  const refreshFleetStatus = async () => {
    if (!isRemoteSim() || fleetPollInFlight) return;
    fleetPollInFlight = true;
    try {
      const statusPath = fleetStatePath || `${fleetApiBase}/status`;
      const payload = await fetchJson(statusPath);
      applyFleetStatus(payload);
      if (isLocalSim()) {
        refreshPackagingState();
        refreshSimObstacles();
      }
    } catch (error) {
      console.warn("Fleet status refresh failed", error);
    } finally {
      fleetPollInFlight = false;
    }
  };

  const startFleetPolling = () => {
    if (!isRemoteSim() || fleetPollTimer || fleetStream) return;
    if (!fleetCoreAvailable) return;
    refreshFleetStatus();
    fleetPollTimer = window.setInterval(() => {
      refreshFleetStatus();
    }, fleetPollMs);
  };

  const stopFleetPolling = () => {
    if (fleetPollTimer) {
      window.clearInterval(fleetPollTimer);
      fleetPollTimer = null;
    }
    fleetPollInFlight = false;
  };

  const startFleetStream = () => {
    if (!isRemoteSim() || fleetStream) return;
    if (!fleetCoreAvailable) return;
    if (typeof window.EventSource === "undefined") {
      startFleetPolling();
      return;
    }
    const streamUrl = fleetStreamPath || `${fleetApiBase}/stream`;
    try {
      fleetStream = new EventSource(streamUrl);
    } catch (error) {
      fleetStream = null;
      startFleetPolling();
      return;
    }
    fleetStream.addEventListener("state", (event) => {
      if (!event?.data) return;
      let payload = null;
      try {
        payload = JSON.parse(event.data);
      } catch (_err) {
        return;
      }
      if (!payload || !payload.ok) return;
      applyFleetStatus(payload);
      if (isLocalSim()) {
        refreshPackagingState();
        refreshSimObstacles();
      }
    });
    fleetStream.addEventListener("error", () => {
      stopFleetStream();
      startFleetPolling();
    });
  };

  const stopFleetStream = () => {
    if (fleetStream) {
      fleetStream.close();
      fleetStream = null;
    }
  };

  const startFleetUpdates = () => {
    stopFleetPolling();
    stopFleetStream();
    if (!isRemoteSim() || !fleetCoreAvailable) return;
    startFleetStream();
  };

  const stopFleetUpdates = () => {
    stopFleetStream();
    stopFleetPolling();
  };

  const startManualDriveLoop = () => {
    if (!isRemoteSim() || manualDriveTimer) return;
    manualDriveLastTick = Date.now();
    manualDriveTimer = window.setInterval(() => {
      const now = Date.now();
      const deltaMs = manualDriveLastTick ? now - manualDriveLastTick : SIM_TICK_MS;
      manualDriveLastTick = now;
      applyManualDrive(deltaMs);
    }, SIM_TICK_MS);
  };

  const stopManualDriveLoop = () => {
    if (manualDriveTimer) {
      window.clearInterval(manualDriveTimer);
      manualDriveTimer = null;
    }
    manualDriveLastTick = null;
    manualDriveRemoteInFlight = false;
    manualDriveRemotePending = null;
  };

  const sendRobotCommand = async (robotId, action, payload = null) => {
    if (!robotId || !action) return null;
    const body = payload ? JSON.stringify(payload) : null;
    const response = await fetch(
      `${fleetApiBase}/robots/${encodeURIComponent(robotId)}/${action}`,
      {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : {},
        body
      }
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `robot_command_failed_${response.status}`);
    }
    return response.json();
  };

  const postFleetJson = async (path, payload = null) => {
    const body = payload ? JSON.stringify(payload) : null;
    const response = await fetch(`${fleetApiBase}${path}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : {},
      body
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `fleet_post_failed_${response.status}`);
    }
    return response.json();
  };

  const setRobotManualModeRemote = async (robotId, enabled) => {
    try {
      await sendRobotCommand(robotId, "manual", { enabled: Boolean(enabled) });
      if (enabled) {
        manualTargetRobotId = robotId;
      } else if (manualTargetRobotId === robotId) {
        manualTargetRobotId = null;
      }
      refreshFleetStatus();
    } catch (error) {
      console.warn("Manual mode update failed", error);
    }
  };

  const getRobotById = (id) => robots.find((item) => item.id === id);

  const getManualCommandRobot = () => {
    if (manualTargetRobotId) {
      const robot = getRobotById(manualTargetRobotId);
      if (robot?.manualMode) return robot;
    }
    const manualRobots = robots.filter((robot) => robot.manualMode);
    return manualRobots.length === 1 ? manualRobots[0] : null;
  };

  const isRobotSelected = (robotId) => {
    if (manualTargetRobotId === robotId) return true;
    const selection = mapStore?.getState?.().selection;
    return selection?.type === "robot" && Array.isArray(selection.ids) && selection.ids.includes(robotId);
  };

  const buildRobotMarkerClass = (robot) => {
    const classes = ["robot-marker"];
    if (isRobotSelected(robot.id)) classes.push("selected");
    const state = robot?.state || null;
    if (state === "blocked") {
      classes.push("blocked");
    } else if (state === "paused") {
      classes.push("paused");
    } else if (state === "manual") {
      classes.push("manual");
    } else if (state === "stalled" || state === "stuck" || state === "offline") {
      classes.push("stuck");
    } else {
      if (robot.manualMode) classes.push("manual");
      if (robot.taskStatus === 3) classes.push("paused");
      if (robot.blocked) classes.push("blocked");
    }
    return classes.join(" ");
  };

  const formatRobotActivity = (robot) => {
    if (robot.blocked) {
      if (robot.activity) {
        const normalized = String(robot.activity);
        const key = normalized.toLowerCase();
        const blockedLabels = {
          blocked_obstacle: "Blocked by obstacle",
          blocked_pick: "Pick blocked",
          blocked_no_route: "No route",
          blocked_collision: "Collision",
          blocked: "Blocked"
        };
        if (blockedLabels[key]) {
          return blockedLabels[key];
        }
      }
      return "Blocked";
    }
    if (isRemoteSim()) {
      if (robot.taskStatus === 3) return "Paused";
      if (robot.activity) {
        const normalized = String(robot.activity);
        const activityMap = {
          manual_move: "Manual: Enroute",
          manual_action: "Manual: Action",
          manual_idle: "Manual idle",
          manual_override: "Manual override",
          manual_drive: "Manual drive",
          to_pick: "To pick",
          picking: "Picking",
          to_drop: "To drop",
          dropping: "Dropping",
          to_park: "Parking",
          reroute_drop: "Rerouting drop",
          blocked_pick: "Pick blocked",
          blocked_obstacle: "Blocked by obstacle",
          blocked_collision: "Collision",
          blocked: "Blocked",
          idle: "Idle",
          in_progress: "In progress"
        };
        const key = normalized.toLowerCase();
        return activityMap[key] || normalized;
      }
      if (robot.taskStatus === 2) return "In progress";
    }
    if (robot.activity) return robot.activity;
    if (robot.manualMode) return "Manual idle";
    return "Idle";
  };

  const formatRobotDiagnosticsBadge = (diagnostics) => {
    if (!diagnostics) {
      return { label: "--", className: "clear" };
    }
    const reasonLabels = {
      no_motion: "Brak ruchu",
      no_updates: "Brak aktualizacji",
      blocked_obstacle: "Blokada: przeszkoda",
      blocked_no_route: "Blokada: brak trasy",
      blocked_pick: "Blokada: pobranie",
      blocked_collision: "Kolizja",
      blocked: "Blokada",
      paused: "Pauza",
      yield: "Ustepuje",
      avoidance: "Omijanie",
      avoidance_hold: "Hold omijania",
      avoidance_zone: "Strefa omijania",
      node_lock: "Blokada wezla",
      edge_lock: "Blokada krawedzi",
      reservation_wait: "Czeka na rezerwacje",
      reservation_entry: "Czeka na wjazd",
      traffic: "Zablokowany ruchem",
      traffic_overlap: "Kolizja (overlap)",
      action_wait: "Czeka na akcje",
      manual: "Manual",
      stuck: "Stuck",
      offline: "Offline",
      idle: "Idle",
      moving: "Ruch"
    };
    const baseLabel = reasonLabels[diagnostics.reason] || diagnostics.reason || "--";
    let label = baseLabel;
    if (
      (diagnostics.reason === "reservation_wait" || diagnostics.reason === "reservation_entry") &&
      diagnostics.detail?.waitMs
    ) {
      label = `${baseLabel} ${formatAgeLabel(diagnostics.detail.waitMs)}`;
      if (diagnostics.detail?.conflict?.holder) {
        label = `${label} vs ${diagnostics.detail.conflict.holder}`;
      }
    }
    if (
      (diagnostics.reason === "traffic" || diagnostics.reason === "traffic_overlap") &&
      diagnostics.detail?.blockingId
    ) {
      label = `${baseLabel} vs ${diagnostics.detail.blockingId}`;
    }
    if (diagnostics.reason === "edge_lock" && diagnostics.detail?.holder) {
      label = `${baseLabel} vs ${diagnostics.detail.holder}`;
    }
    const ageMs = Number.isFinite(diagnostics.since) ? Date.now() - diagnostics.since : null;
    if (
      diagnostics.state === "stalled" ||
      diagnostics.state === "holding" ||
      diagnostics.state === "stale" ||
      diagnostics.state === "offline"
    ) {
      if (Number.isFinite(ageMs)) {
        label = `${label} · ${formatAgeLabel(ageMs)}`;
      }
    }
    let className = "clear";
    if (diagnostics.state === "stalled") {
      className = "stalled";
    } else if (diagnostics.state === "holding") {
      className = "holding";
    } else if (diagnostics.state === "stale" || diagnostics.state === "offline") {
      className = "stale";
    }
    return { label, className };
  };

  const updateAllRobotMarkerStates = () => {
    if (!robotMarkers.size) return;
    robotMarkers.forEach((marker, id) => {
      const robot = getRobotById(id);
      if (!robot) return;
      marker.setAttribute("class", buildRobotMarkerClass(robot));
    });
  };

  if (mapLayers && mapStore) {
    const robotSelectionLayer = {
      render() {
        updateAllRobotMarkerStates();
      }
    };
    mapLayers.register(robotSelectionLayer);
    mapStore.subscribe((state) => {
      mapLayers.render(state);
    });
  }

  const getNavControlTarget = () => {
    if (manualTargetRobotId) {
      const robot = getRobotById(manualTargetRobotId);
      if (robot) {
        return { robot, paused: robot.taskStatus === 3 };
      }
    }
    const active = robots.find((robot) => robot.taskStatus === 2 || robot.taskStatus === 3);
    if (active) {
      return { robot: active, paused: active.taskStatus === 3 };
    }
    return null;
  };

  const renderNavControls = () => {
    if (!navControls || !navControlsName || !navControlsPause || !navControlsStop) return;
    const target = getNavControlTarget();
    if (!target) {
      navControls.classList.add("hidden");
      return;
    }
    navControls.classList.remove("hidden");
    const suffix = target.robot.manualMode ? " (Manual)" : "";
    navControlsName.textContent = `${target.robot.name}${suffix}`;
    navControlsPause.textContent = target.paused ? "Wznow" : "Pauzuj";
    navControlsPause.dataset.id = target.robot.id;
    navControlsStop.dataset.id = target.robot.id;
  };

  const setRobotManualMode = (robotId, enabled) => {
    setRobotManualModeRemote(robotId, enabled);
  };

  const handleRobotMarkerClick = (robotId) => {
    const robot = getRobotById(robotId);
    if (!robot) return;
    mapStore?.setSelection?.({ type: "robot", ids: [robotId], primaryId: robotId }, "marker");
    if (!robot.manualMode) {
      setRobotManualMode(robotId, true);
      return;
    }
    manualTargetRobotId = robotId;
    if (manualDrive.enabled) {
      setManualDriveTarget(robotId);
    }
    updateAllRobotMarkerStates();
    renderNavControls();
    renderManualDrivePanel();
  };

  const setManualDriveTarget = (robotId) => {
    if (manualDrive.robotId === robotId) return;
    if (manualDrive.enabled && manualDrive.robotId) {
      const previous = getRobotById(manualDrive.robotId);
      if (previous?.manualMode) {
        updateRobotState(previous.id, { activity: "Manual idle" });
      }
    }
    manualDrive.robotId = robotId;
    manualDrive.keys.clear();
    manualDrive.driving = false;
  };

  const setManualDriveDriving = (robotId, driving) => {
    if (manualDrive.driving === driving) return;
    manualDrive.driving = driving;
    const robot = getRobotById(robotId);
    if (!robot?.manualMode) return;
    updateRobotState(robotId, { activity: driving ? "Manual drive" : "Manual idle" });
  };

  const setManualDriveEnabled = (robotId, enabled) => {
    const robot = getRobotById(robotId);
    if (!robot || !robot.manualMode) return;
    if (enabled) {
      stopNavigation(robotId);
      manualDrive.enabled = true;
      setManualDriveTarget(robotId);
      updateRobotState(robotId, { activity: "Manual idle" });
    } else {
      manualDrive.enabled = false;
      manualDrive.keys.clear();
      manualDrive.driving = false;
      if (robot.manualMode) {
        updateRobotState(robotId, { activity: "Manual idle" });
      }
      if (isRemoteSim()) {
        queueRemoteMotion(robotId, { vx: 0, vy: 0, w: 0 });
      }
    }
    renderManualDrivePanel();
  };

  const renderManualDrivePanel = () => {
    if (!manualDrivePanel || !manualDriveRobot || !manualDriveToggle) return;
    const robot = getManualCommandRobot();
    if (!robot) {
      manualDrivePanel.classList.add("hidden");
      return;
    }
    manualDrivePanel.classList.remove("hidden");
    manualDrivePanel.classList.toggle("active", manualDrive.enabled);
    manualDriveRobot.textContent = robot.name;
    manualDriveToggle.textContent = manualDrive.enabled
      ? "Wylacz sterowanie"
      : "Wlacz sterowanie";
    manualDriveToggle.dataset.id = robot.id;
  };

  const getManualDriveInput = () => {
    let forward = 0;
    let turn = 0;
    if (manualDrive.keys.has("up")) forward += 1;
    if (manualDrive.keys.has("down")) forward -= 1;
    if (manualDrive.keys.has("left")) turn += 1;
    if (manualDrive.keys.has("right")) turn -= 1;
    if (!forward && !turn) return null;
    return {
      forward: clamp(forward, -1, 1),
      turn: clamp(turn, -1, 1)
    };
  };

  const handleManualDriveKey = (event, pressed) => {
    if (!manualDrive.enabled || !manualDrive.robotId) return;
    if (manualDrivePanel?.classList.contains("hidden")) return;
    const mapPanel = document.getElementById("view-map");
    if (mapPanel && !mapPanel.classList.contains("active")) return;
    const target = event.target;
    const tag = target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) {
      return;
    }
    const key = event.key.toLowerCase();
    const mapped = MANUAL_KEY_MAP[key];
    if (!mapped) return;
    event.preventDefault();
    if (pressed) {
      manualDrive.keys.add(mapped);
    } else {
      manualDrive.keys.delete(mapped);
    }
  };

  const clearManualDriveKeys = () => {
    if (!manualDrive.keys.size) return;
    manualDrive.keys.clear();
  };

  const flushRemoteMotion = () => {
    if (manualDriveRemoteInFlight || !manualDriveRemotePending) return;
    const { robotId, payload } = manualDriveRemotePending;
    manualDriveRemotePending = null;
    manualDriveRemoteInFlight = true;
    sendRobotCommand(robotId, "motion", payload)
      .then((response) => {
        const retCode = Number(response?.result?.ret_code);
        if (Number.isFinite(retCode) && retCode !== 0) {
          console.warn("Manual drive rejected", response);
          if (manualDrive.driving) {
            setManualDriveDriving(robotId, false);
          }
          manualDrive.enabled = false;
          manualDrive.keys.clear();
          renderManualDrivePanel();
        }
      })
      .catch((error) => {
        console.warn("Manual drive failed", error);
      })
      .finally(() => {
        manualDriveRemoteInFlight = false;
        if (manualDriveRemotePending) {
          flushRemoteMotion();
        }
      });
  };

  const queueRemoteMotion = (robotId, payload) => {
    if (!robotId) return;
    manualDriveRemotePending = { robotId, payload };
    flushRemoteMotion();
  };

  const applyRemoteManualDrive = (robot, dt) => {
    if (!robot || !Number.isFinite(dt) || dt <= 0) return;
    if (!robot.online || robot.blocked) {
      if (manualDrive.driving) {
        queueRemoteMotion(robot.id, { vx: 0, vy: 0, w: 0 });
        setManualDriveDriving(robot.id, false);
      }
      return;
    }
    const input = getManualDriveInput();
    if (!input) {
      if (manualDrive.driving) {
        queueRemoteMotion(robot.id, { vx: 0, vy: 0, w: 0 });
        setManualDriveDriving(robot.id, false);
      }
      return;
    }
    const vx = MANUAL_DRIVE_SPEED_MPS * input.forward;
    const w = ROBOT_TURN_RATE_RAD_S * input.turn;
    queueRemoteMotion(robot.id, { vx, vy: 0, w });
    if (!manualDrive.driving) {
      setManualDriveDriving(robot.id, true);
    }
  };

  const applyManualDrive = (deltaMs) => {
    if (!manualDrive.enabled || !manualDrive.robotId) return;
    const robot = getRobotById(manualDrive.robotId);
    if (!robot || !robot.manualMode) return;
    const dt = deltaMs / 1000;
    if (!Number.isFinite(dt) || dt <= 0) return;
    applyRemoteManualDrive(robot, dt);
  };

  const toggleNavigationPause = (robotId) => {
    const robot = getRobotById(robotId);
    const paused = robot?.taskStatus === 3;
    const action = paused ? "resume" : "pause";
    sendRobotCommand(robotId, action)
      .then(() => refreshFleetStatus())
      .catch((error) => {
        console.warn("Pause/resume failed", error);
      });
  };

  const stopNavigation = (robotId) => {
    sendRobotCommand(robotId, "cancel")
      .then(() => refreshFleetStatus())
      .catch((error) => {
        console.warn("Cancel failed", error);
      });
  };

  const issueManualCommand = (robotId, pointId, actionKey) => {
    if (manualDrive.enabled && manualDrive.robotId === robotId) {
      setManualDriveEnabled(robotId, false);
    }
    sendRobotCommand(robotId, "go-target", { id: pointId, action: actionKey })
      .then(() => refreshFleetStatus())
      .catch((error) => {
        console.warn("Manual command failed", error);
      });
  };

  const showManualMenu = (event, pointId) => {
    if (!manualMenu || !manualMenuRobot) return;
    const robot = getManualCommandRobot();
    if (!robot) return;
    const containerRect = mapWrap.getBoundingClientRect();
    const offsetX = event.clientX - containerRect.left + 8;
    const offsetY = event.clientY - containerRect.top + 8;
    worksiteMenu.classList.add("hidden");
    worksiteMenu.dataset.id = "";
    if (mapMenu) {
      mapMenu.classList.add("hidden");
      mapMenu.dataset.x = "";
      mapMenu.dataset.y = "";
    }
    manualMenu.style.left = `${offsetX}px`;
    manualMenu.style.top = `${offsetY}px`;
    manualMenu.dataset.pointId = pointId;
    manualMenu.dataset.robotId = robot.id;
    manualMenuRobot.textContent = robot.name;
    manualMenu.classList.remove("hidden");
  };

  const updateRobotMarkers = () => {
    if (!robotMarkers.size) return;
    robotMarkers.forEach((marker, id) => {
      const robot = robots.find((item) => item.id === id);
      if (!robot?.pos) return;
      ensureRobotMotion(robot);
      const point = projectPoint(robot.pos);
      const headingDeg = (-robot.heading * 180) / Math.PI;
      marker.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${headingDeg})`);
      marker.setAttribute("class", buildRobotMarkerClass(robot));
    });
  };

  const renderMapError = (message) => {
    mapSvg.innerHTML = "";
    const text = document.createElementNS(svgNS, "text");
    text.textContent = message;
    text.setAttribute("x", "16");
    text.setAttribute("y", "24");
    text.setAttribute("fill", "#6b6055");
    text.setAttribute("font-size", "14");
    mapSvg.appendChild(text);
  };

  const getBounds = (graph) => {
    const bounds = graph?.meta?.bounds;
    if (bounds?.min && bounds?.max) {
      return {
        minX: bounds.min.x,
        maxX: bounds.max.x,
        minY: bounds.min.y,
        maxY: bounds.max.y
      };
    }

    const points = [];
    (graph?.nodes || []).forEach((node) => {
      if (node.pos) points.push(node.pos);
    });
    worksites.forEach((site) => {
      const pos = site.displayPos || site.pos;
      if (pos) points.push(pos);
    });

    if (!points.length) {
      return { minX: -10, maxX: 10, minY: -10, maxY: 10 };
    }

    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys)
    };
  };

  const renderMiniMap = () => {
    if (!miniMapSvg || !graphData || !mapState) return;
    miniMapSvg.innerHTML = "";
    miniMapSvg.setAttribute("viewBox", `0 0 ${mapState.baseWidth} ${mapState.baseHeight}`);
    miniMapSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const nodesIndex = new Map((graphData.nodes || []).map((node) => [node.id, node.pos]));

    const edgesGroup = document.createElementNS(svgNS, "g");
    edgesGroup.setAttribute("class", "mini-map-edges");

    (graphData.edges || []).forEach((edge) => {
      const start = edge.startPos || nodesIndex.get(edge.start);
      const end = edge.endPos || nodesIndex.get(edge.end);
      if (!start || !end) return;
      const startPos = projectPoint(start);
      const endPos = projectPoint(end);
      const path = document.createElementNS(svgNS, "path");
      if (edge.controlPos1 && edge.controlPos2) {
        const c1 = projectPoint(edge.controlPos1);
        const c2 = projectPoint(edge.controlPos2);
        path.setAttribute(
          "d",
          `M ${startPos.x} ${startPos.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${endPos.x} ${endPos.y}`
        );
      } else {
        path.setAttribute("d", `M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`);
      }
      path.setAttribute("class", "mini-map-edge");
      edgesGroup.appendChild(path);
    });

    const worksitesGroup = document.createElementNS(svgNS, "g");
    worksitesGroup.setAttribute("class", "mini-map-worksites");

    worksites.forEach((site) => {
      const pos = site.displayPos || site.pos;
      if (!pos) return;
      const point = projectPoint(pos);
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", point.x);
      circle.setAttribute("cy", point.y);
      circle.setAttribute("r", "1.1");
      circle.setAttribute("class", "mini-map-worksite");
      worksitesGroup.appendChild(circle);
    });

    miniMapViewport = document.createElementNS(svgNS, "rect");
    miniMapViewport.setAttribute("class", "mini-map-viewport");

    const fragment = document.createDocumentFragment();
    fragment.appendChild(edgesGroup);
    fragment.appendChild(worksitesGroup);
    if (obstacles.length) {
      const obstaclesGroup = document.createElementNS(svgNS, "g");
      obstaclesGroup.setAttribute("class", "mini-map-obstacles");
      obstacles.forEach((obstacle) => {
        const point = projectPoint(obstacle);
        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", point.x);
        circle.setAttribute("cy", point.y);
        circle.setAttribute("r", Math.max(obstacle.radius * 0.5, 0.6));
        circle.setAttribute("class", "mini-map-obstacle");
        obstaclesGroup.appendChild(circle);
      });
      fragment.appendChild(obstaclesGroup);
    }
    fragment.appendChild(miniMapViewport);
    miniMapSvg.appendChild(fragment);
    updateMiniMapViewport();

    if (!miniMapBound) {
      const updateFromMiniMapEvent = (event) => {
        if (!mapState) return;
        const rect = miniMapSvg.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = ((event.clientX - rect.left) / rect.width) * mapState.baseWidth;
        const y = ((event.clientY - rect.top) / rect.height) * mapState.baseHeight;
        mapState.x = x - mapState.width / 2;
        mapState.y = y - mapState.height / 2;
        updateViewBox();
      };

      miniMapSvg.addEventListener("pointerdown", (event) => {
        if (!mapState) return;
        miniMapDrag = { pointerId: event.pointerId };
        updateFromMiniMapEvent(event);
        miniMapSvg.setPointerCapture(event.pointerId);
      });

      miniMapSvg.addEventListener("pointermove", (event) => {
        if (!miniMapDrag) return;
        updateFromMiniMapEvent(event);
      });

      const endMiniMapDrag = (event) => {
        if (!miniMapDrag) return;
        miniMapDrag = null;
        if (event?.pointerId !== undefined) {
          miniMapSvg.releasePointerCapture(event.pointerId);
        }
      };

      miniMapSvg.addEventListener("pointerup", endMiniMapDrag);
      miniMapSvg.addEventListener("pointercancel", endMiniMapDrag);
      miniMapBound = true;
    }
  };

  const renderObstacles = () => {
    if (!obstacleLayer || !mapState) return;
    obstacleLayer.innerHTML = "";
    obstacles.forEach((obstacle) => {
      const point = projectPoint(obstacle);
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", point.x);
      circle.setAttribute("cy", point.y);
      circle.setAttribute("r", obstacle.radius);
      circle.setAttribute("class", `obstacle-marker ${obstacle.mode}`);
      circle.dataset.id = obstacle.id;
      circle.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        removeObstacle(obstacle.id);
      });
      obstacleLayer.appendChild(circle);
    });
  };

  const clearObstacleBlocks = () => {
    robots.forEach((robot) => {
      if (!robot?.id) return;
      const diagnostics = getRobotDiagnostics(robot.id);
      if (diagnostics?.reason === "blocked_obstacle") {
        clearRobotBlock(robot.id);
      }
    });
  };

  const postSimJson = async (path, payload) => {
    const body = payload ? JSON.stringify(payload) : null;
    const response = await fetch(`${SIM_API_BASE}${path}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : {},
      body
    });
    return response;
  };

  const syncLocalSimSettings = async () => {
    if (!isLocalSim()) return;
    const payload = {
      dispatchStrategy: settingsState.dispatchStrategy,
      trafficStrategy: settingsState.trafficStrategy
    };
    const forwardStopDistance = Number.isFinite(settingsState.forwardStopDistanceM)
      ? settingsState.forwardStopDistanceM
      : resolveTrafficForwardStopDistance(robotsConfig);
    if (Number.isFinite(forwardStopDistance)) {
      payload.trafficOptions = {
        forwardStopDistanceM: forwardStopDistance
      };
    }
    const response = await postSimJson("/settings", payload);
    if (!response.ok) return;
    const data = await response.json().catch(() => null);
    if (!data?.ok) return;
  };

  const syncLocalSimObstacleAdd = async (obstacle) => {
    if (!isLocalSim() || !obstacle) return;
    const response = await postSimJson("/obstacles", obstacle);
    if (!response.ok) return;
    const payload = await response.json().catch(() => null);
    if (payload?.ok && Array.isArray(payload.obstacles)) {
      applySimObstacles(payload.obstacles);
    }
  };

  const syncLocalSimObstacleRemove = async (obstacleId) => {
    if (!isLocalSim() || !obstacleId) return;
    const response = await postSimJson("/obstacles/remove", { id: obstacleId });
    if (!response.ok) return;
    const payload = await response.json().catch(() => null);
    if (payload?.ok && Array.isArray(payload.obstacles)) {
      applySimObstacles(payload.obstacles);
    }
  };

  const syncLocalSimObstacleClear = async () => {
    if (!isLocalSim()) return;
    const response = await postSimJson("/obstacles/clear", {});
    if (!response.ok) return;
    const payload = await response.json().catch(() => null);
    if (payload?.ok && Array.isArray(payload.obstacles)) {
      applySimObstacles(payload.obstacles);
    }
  };

  const applySimObstacles = (items) => {
    if (!Array.isArray(items)) return;
    let maxId = 0;
    obstacles = items
      .map((obstacle) => {
        if (!obstacle) return null;
        const x = Number(obstacle.x);
        const y = Number(obstacle.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        const id = obstacle.id ? String(obstacle.id) : `obs-${obstacleIdSeq++}`;
        const match = id.match(/^obs-(\d+)$/);
        if (match) {
          maxId = Math.max(maxId, Number(match[1]));
        }
        const rawRadius = Number(obstacle.radius);
        return {
          id,
          x,
          y,
          radius: Number.isFinite(rawRadius) ? Math.max(0, rawRadius) : OBSTACLE_RADIUS,
          mode: obstacle.mode === "avoid" ? "avoid" : "block"
        };
      })
      .filter(Boolean);
    obstacleIdSeq = Math.max(obstacleIdSeq, maxId + 1 || 1);
    renderObstacles();
    renderMiniMap();
  };

  const refreshSimObstacles = async () => {
    if (!isLocalSim()) return;
    const payload = await fetchJsonSafe(`${SIM_API_BASE}/obstacles`);
    if (payload?.ok && Array.isArray(payload.obstacles)) {
      applySimObstacles(payload.obstacles);
    }
  };

  const syncSimObstacles = async () => {
    if (isLocalSim()) return;
    const token = ++simObstacleSyncToken;
    const snapshot = obstacles.map((obstacle) => ({
      x: obstacle.x,
      y: obstacle.y,
      radius: obstacle.radius,
      mode: obstacle.mode
    }));
    try {
      await postSimJson("/obstacles/clear", {});
    } catch (_err) {
      return;
    }
    for (const obstacle of snapshot) {
      if (token !== simObstacleSyncToken) return;
      try {
        await postSimJson("/obstacles", obstacle);
      } catch (_err) {
        return;
      }
    }
  };

  const addObstacle = (pos, options = {}) => {
    if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return null;
    const obstacle = {
      id: `obs-${obstacleIdSeq++}`,
      x: pos.x,
      y: pos.y,
      radius: Number.isFinite(options.radius) ? Math.max(0, options.radius) : OBSTACLE_RADIUS,
      mode: options.mode === "avoid" ? "avoid" : "block"
    };
    obstacles = [...obstacles, obstacle];
    renderObstacles();
    renderMiniMap();
    if (isLocalSim()) {
      syncLocalSimObstacleAdd(obstacle).catch(() => {});
    } else {
      syncSimObstacles().catch(() => {});
    }
    return obstacle;
  };

  const removeObstacle = (obstacleId) => {
    const next = obstacles.filter((obstacle) => obstacle.id !== obstacleId);
    if (next.length === obstacles.length) return false;
    obstacles = next;
    renderObstacles();
    renderMiniMap();
    if (isLocalSim()) {
      syncLocalSimObstacleRemove(obstacleId).catch(() => {});
    } else {
      clearObstacleBlocks();
      syncSimObstacles().catch(() => {});
    }
    return true;
  };

  const clearObstacles = () => {
    obstacles = [];
    renderObstacles();
    renderMiniMap();
    if (isLocalSim()) {
      syncLocalSimObstacleClear().catch(() => {});
    } else {
      clearObstacleBlocks();
      syncSimObstacles().catch(() => {});
    }
  };

  const addObstacleForRobot = (robotId, mode) => {
    const robot = getRobotById(robotId);
    if (!robot?.pos) return null;
    const heading = Number.isFinite(robot.heading) ? robot.heading : 0;
    const offset = OBSTACLE_RADIUS * 1.5;
    const pos = { x: robot.pos.x + Math.cos(heading) * offset, y: robot.pos.y + Math.sin(heading) * offset };
    return addObstacle(pos, { mode });
  };

  const renderMap = () => {
    if (!graphData || !workflowData) return;
    mapSvg.innerHTML = "";
    worksiteElements = new Map();
    worksiteLabels = new Map();
    worksiteRings = new Map();
    robotMarkers = new Map();
    actionPointMarkers = new Map();
    nodeMarkers = new Map();
    nodeLabels = new Map();

    const actionPoints = (graphData.nodes || []).filter(
      (node) => node.className === "ActionPoint" && node.pos
    );
    const actionPointIndex = new Map(actionPoints.map((node) => [node.id, node.pos]));
    const nodeYs = (graphData.nodes || [])
      .map((node) => node?.pos?.y)
      .filter((value) => Number.isFinite(value));
    const mapMidY = nodeYs.length ? (Math.min(...nodeYs) + Math.max(...nodeYs)) / 2 : 0;
    worksites.forEach((site) => {
      site.displayPos = getWorksiteDisplayPos(site, actionPointIndex, mapMidY) || site.pos;
    });

    const { minX, maxX, minY, maxY } = getBounds(graphData);
    const width = maxX - minX;
    const height = maxY - minY;
    mapState = {
      x: -MAP_OUTER_MARGIN,
      y: -MAP_OUTER_MARGIN,
      width: width + MAP_OUTER_MARGIN * 2,
      height: height + MAP_OUTER_MARGIN * 2,
      baseWidth: width,
      baseHeight: height,
      minWidth: Math.max(width * 0.03, 5),
      maxWidth: width + MAP_OUTER_MARGIN * 2,
      maxHeight: height + MAP_OUTER_MARGIN * 2,
      offsetX: minX,
      offsetY: maxY
    };
    mapStore?.setMapState?.(mapState, "init");
    updateViewBox();
    mapSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const edgesGroup = document.createElementNS(svgNS, "g");
    edgesGroup.setAttribute("class", "map-edges");

    const nodesIndex = new Map((graphData.nodes || []).map((node) => [node.id, node.pos]));

    (graphData.edges || []).forEach((edge) => {
      const start = edge.startPos || nodesIndex.get(edge.start);
      const end = edge.endPos || nodesIndex.get(edge.end);
      if (!start || !end) return;
      const startPos = projectPoint(start);
      const endPos = projectPoint(end);
      const path = document.createElementNS(svgNS, "path");
      if (edge.controlPos1 && edge.controlPos2) {
        const c1 = projectPoint(edge.controlPos1);
        const c2 = projectPoint(edge.controlPos2);
        path.setAttribute(
          "d",
          `M ${startPos.x} ${startPos.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${endPos.x} ${endPos.y}`
        );
      } else {
        path.setAttribute("d", `M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`);
      }
      const width = Number(edge?.props?.width || 0);
      path.setAttribute("class", `map-edge${Number.isFinite(width) && width > 0 ? " corridor" : ""}`);
      if (Number.isFinite(width) && width > 0) {
        path.dataset.corridorWidth = String(width);
      }
      edgesGroup.appendChild(path);
    });

    const worksitesGroup = document.createElementNS(svgNS, "g");
    worksitesGroup.setAttribute("class", "map-worksites");
    const ringsGroup = document.createElementNS(svgNS, "g");
    ringsGroup.setAttribute("class", "map-worksite-rings");
    const labelsGroup = document.createElementNS(svgNS, "g");
    labelsGroup.setAttribute("class", "map-labels");
    const linksGroup = document.createElementNS(svgNS, "g");
    linksGroup.setAttribute("class", "map-links");
    const obstaclesGroup = document.createElementNS(svgNS, "g");
    obstaclesGroup.setAttribute("class", "map-obstacles");
    const actionPointsGroup = document.createElementNS(svgNS, "g");
    actionPointsGroup.setAttribute("class", "map-action-points");
    obstacleLayer = obstaclesGroup;
    const nodeMarkersGroup = document.createElementNS(svgNS, "g");
    nodeMarkersGroup.setAttribute("class", "map-nodes");
    const nodeLabelsGroup = document.createElementNS(svgNS, "g");
    nodeLabelsGroup.setAttribute("class", "map-node-labels");
    const nodesWithPos = (graphData.nodes || []).filter((node) => node && node.pos);

    worksites.forEach((site) => {
      const sitePos = site.displayPos || site.pos;
      if (!sitePos) return;
      const point = projectPoint(sitePos);
      const actionPos = site.point ? actionPointIndex.get(site.point) : null;
      if (actionPos) {
        const actionPoint = projectPoint(actionPos);
        const link = document.createElementNS(svgNS, "line");
        link.setAttribute("x1", point.x);
        link.setAttribute("y1", point.y);
        link.setAttribute("x2", actionPoint.x);
        link.setAttribute("y2", actionPoint.y);
        link.setAttribute("class", "worksite-link");
        linksGroup.appendChild(link);
      }
      const state = worksiteState[site.id] || { occupancy: "empty", blocked: false };
      const occupancy = state.occupancy || "empty";
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", point.x);
      circle.setAttribute("cy", point.y);
      circle.setAttribute("r", "1");
      circle.setAttribute(
        "class",
        `worksite-marker ${site.kind} ${occupancy}${state.blocked ? " blocked" : ""}`
      );
      circle.dataset.sizePx = site.kind === "drop" ? "18" : "15";
      circle.dataset.id = site.id;
      circle.addEventListener("click", (event) => {
        event.stopPropagation();
        showWorksiteMenu(event, site.id);
      });
      circle.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        event.stopPropagation();
        showWorksiteMenu(event, site.id);
      });
      worksitesGroup.appendChild(circle);
      worksiteElements.set(site.id, circle);

      const ring = document.createElementNS(svgNS, "circle");
      ring.setAttribute("cx", point.x);
      ring.setAttribute("cy", point.y);
      ring.setAttribute("r", "1");
      ring.setAttribute("class", `worksite-ring${state.blocked ? " blocked" : ""}`);
      ring.dataset.sizePx = site.kind === "drop" ? "27" : "24";
      ringsGroup.appendChild(ring);
      worksiteRings.set(site.id, ring);

      const label = document.createElementNS(svgNS, "text");
      label.textContent = site.id;
      label.setAttribute(
        "class",
        `worksite-label ${occupancy}${state.blocked ? " blocked" : ""}`
      );
      label.dataset.baseX = point.x;
      label.dataset.baseY = point.y;
      label.setAttribute("x", point.x);
      label.setAttribute("y", point.y);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dominant-baseline", "hanging");
      labelsGroup.appendChild(label);
      worksiteLabels.set(site.id, label);
    });

    nodesWithPos.forEach((node) => {
      const pos = projectPoint(node.pos);
      const typeClass = String(node.className || "node")
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .toLowerCase();
      if (node.className !== "ActionPoint") {
        const marker = document.createElementNS(svgNS, "circle");
        marker.setAttribute("cx", pos.x);
        marker.setAttribute("cy", pos.y);
        marker.setAttribute("r", "1");
        marker.setAttribute("class", `map-node ${typeClass}`);
        marker.dataset.sizePx = node.className === "LocationMark" ? "7.2" : "2.8";
        nodeMarkersGroup.appendChild(marker);
        nodeMarkers.set(node.id, marker);
      }
      const label = document.createElementNS(svgNS, "text");
      label.textContent = node.id;
      label.setAttribute("class", `node-label ${typeClass}`);
      label.dataset.baseX = pos.x;
      label.dataset.baseY = pos.y;
      label.setAttribute("x", pos.x);
      label.setAttribute("y", pos.y);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dominant-baseline", "central");
      nodeLabelsGroup.appendChild(label);
      nodeLabels.set(node.id, label);
    });

    actionPoints.forEach((point) => {
      const pos = projectPoint(point.pos);
      const marker = document.createElementNS(svgNS, "circle");
      marker.setAttribute("cx", pos.x);
      marker.setAttribute("cy", pos.y);
      marker.setAttribute("r", "1");
      marker.setAttribute("class", "action-point");
      marker.dataset.sizePx = "3";
      marker.dataset.id = point.id;
      marker.addEventListener("click", (event) => {
        event.stopPropagation();
        showManualMenu(event, point.id);
      });
      actionPointsGroup.appendChild(marker);
      actionPointMarkers.set(point.id, marker);
    });

    const robotsGroup = document.createElementNS(svgNS, "g");
    robotsGroup.setAttribute("class", "map-robots");

    robots.forEach((robot) => {
      if (!robot.pos) return;
      ensureRobotMotion(robot);
      const point = projectPoint(robot.pos);
      const group = document.createElementNS(svgNS, "g");
      group.setAttribute("class", buildRobotMarkerClass(robot));
      group.dataset.id = robot.id;
      const model = resolveRobotModel(robot, robotsConfig);
      const length = model.head + model.tail;
      const halfWidth = model.width / 2;
      const body = document.createElementNS(svgNS, "rect");
      body.setAttribute("x", String(-model.tail));
      body.setAttribute("y", String(-halfWidth));
      body.setAttribute("width", String(length));
      body.setAttribute("height", String(model.width));
      body.setAttribute("rx", String(Math.min(0.2, model.width * 0.2)));
      body.setAttribute("class", "robot-body");
      const heading = document.createElementNS(svgNS, "path");
      heading.setAttribute("class", "robot-heading");
      const arrowLength = Math.max(model.width * 0.6, 0.4);
      const arrowHalfWidth = Math.max(model.width * 0.35, 0.25);
      const tipX = model.head + arrowLength;
      const baseX = model.head;
      heading.setAttribute(
        "d",
        `M ${tipX} 0 L ${baseX} ${arrowHalfWidth} L ${baseX} ${-arrowHalfWidth} Z`
      );
      group.appendChild(body);
      group.appendChild(heading);
      const headingDeg = (-robot.heading * 180) / Math.PI;
      group.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${headingDeg})`);
      group.addEventListener("click", (event) => {
        event.stopPropagation();
        handleRobotMarkerClick(robot.id);
      });
      robotsGroup.appendChild(group);
      robotMarkers.set(robot.id, group);
    });

    const fragment = document.createDocumentFragment();
    fragment.appendChild(edgesGroup);
    fragment.appendChild(linksGroup);
    fragment.appendChild(obstaclesGroup);
    fragment.appendChild(nodeMarkersGroup);
    fragment.appendChild(nodeLabelsGroup);
    fragment.appendChild(actionPointsGroup);
    fragment.appendChild(worksitesGroup);
    fragment.appendChild(ringsGroup);
    fragment.appendChild(labelsGroup);
    fragment.appendChild(robotsGroup);
    mapSvg.appendChild(fragment);
    renderObstacles();
    renderMiniMap();

    if (!mapClickBound) {
      mapWrap.addEventListener("click", () => {
        worksiteMenu.classList.add("hidden");
        if (manualMenu) {
          manualMenu.classList.add("hidden");
          manualMenu.dataset.pointId = "";
          manualMenu.dataset.robotId = "";
        }
        if (mapMenu) {
          mapMenu.classList.add("hidden");
          mapMenu.dataset.x = "";
          mapMenu.dataset.y = "";
        }
      });
      mapClickBound = true;
    }
    updateWorksiteScale();
  };

  const showWorksiteMenu = (event, id) => {
    if (!id) return;
    const containerRect = mapWrap.getBoundingClientRect();
    const offsetX = event.clientX - containerRect.left + 8;
    const offsetY = event.clientY - containerRect.top + 8;

    if (manualMenu) {
      manualMenu.classList.add("hidden");
      manualMenu.dataset.pointId = "";
      manualMenu.dataset.robotId = "";
    }
    if (mapMenu) {
      mapMenu.classList.add("hidden");
      mapMenu.dataset.x = "";
      mapMenu.dataset.y = "";
    }

    worksiteMenu.style.left = `${offsetX}px`;
    worksiteMenu.style.top = `${offsetY}px`;
    worksiteMenu.dataset.id = id;
    syncWorksiteMenu(id);
    worksiteMenu.classList.remove("hidden");
  };

  const showMapMenu = (event, point) => {
    if (!mapMenu || !point) return;
    const containerRect = mapWrap.getBoundingClientRect();
    const offsetX = event.clientX - containerRect.left + 8;
    const offsetY = event.clientY - containerRect.top + 8;

    worksiteMenu.classList.add("hidden");
    worksiteMenu.dataset.id = "";
    if (manualMenu) {
      manualMenu.classList.add("hidden");
      manualMenu.dataset.pointId = "";
      manualMenu.dataset.robotId = "";
    }

    mapMenu.style.left = `${offsetX}px`;
    mapMenu.style.top = `${offsetY}px`;
    mapMenu.dataset.x = String(point.x);
    mapMenu.dataset.y = String(point.y);
    const goPointButton = mapMenu.querySelector('[data-action="go-point"]');
    if (goPointButton) {
      const manualRobot = getManualCommandRobot();
      goPointButton.classList.toggle("hidden", !isRemoteSim());
      goPointButton.disabled = !isRemoteSim() || !manualRobot?.manualMode;
    }
    mapMenu.classList.remove("hidden");
  };

  const getWorksiteState = (id) => {
    return worksiteState[id] || { occupancy: "empty", blocked: false };
  };

  const persistWorksiteState = () => {};

  const applyWorksiteState = (id) => {
    const state = getWorksiteState(id);
    const marker = worksiteElements.get(id);
    if (marker) {
      marker.classList.remove("filled", "empty", "blocked");
      marker.classList.add(state.occupancy);
      if (state.blocked) marker.classList.add("blocked");
    }
    const ring = worksiteRings.get(id);
    if (ring) {
      ring.classList.toggle("blocked", state.blocked);
    }
    const label = worksiteLabels.get(id);
    if (label) {
      label.classList.remove("filled", "empty", "blocked");
      label.classList.add(state.occupancy);
      if (state.blocked) label.classList.add("blocked");
    }
    if (worksiteMenu.dataset.id === id) {
      syncWorksiteMenu(id);
    }
  };

  const syncWorksiteMenu = (id) => {
    const state = getWorksiteState(id);
    worksiteMenuButtons.forEach((button) => {
      const group = button.dataset.group;
      const value = button.dataset.value;
      let active = false;
      if (group === "occupancy") {
        active = value === state.occupancy;
      } else if (group === "blocked") {
        active = (value === "true") === state.blocked;
      }
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  };

  const updateWorksiteRemote = async (id, updates) => {
    if (!isRemoteSim()) return;
    try {
      await fetch(`${fleetApiBase}/worksites/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates || {})
      });
      refreshFleetStatus();
    } catch (error) {
      console.warn("Remote worksite update failed", error);
    }
  };

  const setWorksiteOccupancy = (id, occupancy) => {
    const state = getWorksiteState(id);
    state.occupancy = WORKSITE_OCCUPANCY.includes(occupancy) ? occupancy : state.occupancy;
    worksiteState[id] = state;
    if (isRemoteSim()) {
      updateWorksiteRemote(id, { filled: state.occupancy === "filled" });
    } else {
      persistWorksiteState();
    }
    applyWorksiteState(id);
    renderStreams();
    renderFields();
  };

  const setWorksiteBlocked = (id, blocked) => {
    const state = getWorksiteState(id);
    state.blocked = Boolean(blocked);
    worksiteState[id] = state;
    if (isRemoteSim()) {
      updateWorksiteRemote(id, { blocked: state.blocked });
    } else {
      persistWorksiteState();
    }
    applyWorksiteState(id);
    renderStreams();
    renderFields();
  };

  const toggleWorksiteOccupancy = (id) => {
    const current = getWorksiteState(id).occupancy;
    const next = current === "filled" ? "empty" : "filled";
    setWorksiteOccupancy(id, next);
  };

  const toggleRobotDispatchable = (id) => {
    if (isRobokitSim()) return;
    const robot = robots.find((item) => item.id === id);
    if (!robot) return;
    if (isLocalSim()) {
      postFleetJson(`/robots/${encodeURIComponent(id)}/dispatchable`, {
        dispatchable: !robot.dispatchable
      })
        .then(() => refreshFleetStatus())
        .catch((error) => {
          console.warn("Dispatchable update failed", error);
        });
      return;
    }
    if (robotService) {
      robotService.setDispatchable(id, !robot.dispatchable);
      syncDomainState();
      refreshRobotViews();
      return;
    }
    const next = !robot.dispatchable;
    const dispatchable = robot.online ? next : false;
    updateRobotState(id, { dispatchable });
  };

  const toggleRobotControl = (id) => {
    if (isRobokitSim()) return;
    const robot = robots.find((item) => item.id === id);
    if (!robot) return;
    if (isLocalSim()) {
      postFleetJson(`/robots/${encodeURIComponent(id)}/control`, {
        controlled: !robot.controlled
      })
        .then(() => refreshFleetStatus())
        .catch((error) => {
          console.warn("Control update failed", error);
        });
      return;
    }
    if (robotService) {
      robotService.setControlled(id, !robot.controlled);
      syncDomainState();
      refreshRobotViews();
      return;
    }
    updateRobotState(id, { controlled: !robot.controlled });
  };

  const handleRobotActionClick = (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = button.dataset.id;
    if (!id) return;
    const action = button.dataset.action;
    if (action === "toggle-dispatchable") {
      toggleRobotDispatchable(id);
    } else if (action === "toggle-control") {
      toggleRobotControl(id);
    } else if (action === "toggle-manual") {
      setRobotManualMode(id, !getRobotById(id)?.manualMode);
    } else if (action === "toggle-nav-pause") {
      toggleNavigationPause(id);
    } else if (action === "stop-nav") {
      stopNavigation(id);
    }
  };

  const bindRobotActions = () => {
    if (robotActionsBound || !robotsList) return;
    robotsList.addEventListener("click", handleRobotActionClick);
    robotActionsBound = true;
  };

  const renderRobots = () => {
    if (!robots.length) {
      robotsList.innerHTML = "<div class=\"card\">Brak robotow.</div>";
      return;
    }
    const rows = robots
      .map((robot) => {
        const robokitMode = isRobokitSim();
        const remotePaused = robot.taskStatus === 3;
        const remoteActive = robot.taskStatus === 2 || robot.taskStatus === 3;
        const isNavigating = remoteActive;
        const pauseLabel = remotePaused ? "Wznow" : "Pauzuj";
        const dispatchDisabled = !robot.online || robokitMode ? "disabled" : "";
        const controlDisabled = robokitMode ? "disabled" : "";
        const manualDisabled = robot.online ? "" : "disabled";
        const navDisabled = robot.online && isNavigating ? "" : "disabled";
        const status = robot.dispatchable && robot.online
          ? "Dispatchable"
          : robot.online
            ? "Undispatchable (online)"
            : "Undispatchable (offline)";
        const controlLabel = robot.controlled ? "Release control" : "Seize control";
        const dispatchLabel = robot.dispatchable ? "Dispatchable" : "Undispatchable";
        const manualLabel = robot.manualMode ? "Manual on" : "Manual off";
        const battery = Number.isFinite(robot.battery) ? robot.battery : 0;
        const taskLabel = robot.task || "--";
        const activityLabel = formatRobotActivity(robot);
        const diagnostics = getRobotDiagnostics(robot.id);
        const diagBadge = formatRobotDiagnosticsBadge(diagnostics);
        return `
          <tr>
            <td>
              <div class="robot-name">${robot.name}</div>
              <div class="robot-meta">${robot.id}</div>
            </td>
            <td>
              <span class="status-badge ${robot.online ? "online" : "offline"}">${status}</span>
            </td>
            <td>
              <span class="activity-text">${activityLabel}</span>
            </td>
            <td>
              <button class="toggle-btn ${robot.dispatchable ? "on" : "off"}" data-action="toggle-dispatchable" data-id="${robot.id}" ${dispatchDisabled}>
                ${dispatchLabel}
              </button>
            </td>
            <td>
              <button class="control-btn ${robot.controlled ? "active" : ""}" data-action="toggle-control" data-id="${robot.id}" ${controlDisabled}>
                ${controlLabel}
              </button>
            </td>
            <td>
              <button class="toggle-btn ${robot.manualMode ? "on" : "off"}" data-action="toggle-manual" data-id="${robot.id}" ${manualDisabled}>
                ${manualLabel}
              </button>
            </td>
            <td>
              <div class="nav-actions">
                <button class="nav-btn" data-action="toggle-nav-pause" data-id="${robot.id}" ${navDisabled}>
                  ${pauseLabel}
                </button>
                <button class="nav-btn danger" data-action="stop-nav" data-id="${robot.id}" ${navDisabled}>
                  Zakoncz
                </button>
              </div>
            </td>
            <td>
              <div class="battery">
                <div class="battery-bar">
                  <div class="battery-fill" style="width: ${battery}%"></div>
                </div>
                <span>${battery}%</span>
              </div>
            </td>
            <td>
              <span class="robot-pill ${robot.blocked ? "blocked" : "clear"}">${robot.blocked ? "Blocked" : "Clear"}</span>
            </td>
            <td>
              <span class="robot-pill ${diagBadge.className}">${diagBadge.label}</span>
            </td>
            <td class="task-cell">${taskLabel}</td>
          </tr>
        `;
      })
      .join("");

    robotsList.innerHTML = `
      <div class="table-wrap">
        <table class="robot-table">
          <thead>
            <tr>
              <th>Robot</th>
              <th>Status</th>
              <th>Activity</th>
              <th>Dispatchable</th>
              <th>Control</th>
              <th>Manual</th>
              <th>Nav</th>
              <th>Battery</th>
              <th>Blocked</th>
              <th>Diag</th>
              <th>Task</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
    syncFaultRobotSelect();
    bindRobotActions();
  };

  const renderStreams = () => {
    if (packagingConfig?.streams?.length) {
      const streams = packagingConfig.streams;
      streamsList.innerHTML = "";
      streams.forEach((stream) => {
        const routeCount = stream.routes?.length || 0;
        const activeCount = lineRequests.filter((req) => req[stream.trigger]?.active).length;
        const card = document.createElement("div");
        card.className = "stream-card";
        card.innerHTML = `
          <div class="stream-header">
            <div>
              <div class="stream-title">${stream.id} - ${stream.name}</div>
              <div class="stream-meta">Trigger: ${stream.trigger}</div>
            </div>
            <span class="stream-pill">${routeCount} routes</span>
          </div>
          <div class="stream-section">
            <div class="stream-step-title">Stan</div>
            <div class="stream-grid">
              <div>
                <div class="stream-label">Aktywne zgloszenia</div>
                <div class="stream-value">${activeCount}</div>
              </div>
              <div>
                <div class="stream-label">Goods type</div>
                <div class="stream-value">${stream.goodsType || stream.goodsTypeMode || "--"}</div>
              </div>
            </div>
          </div>
        `;
        streamsList.appendChild(card);
      });
      return;
    }

    const streams = workflowData?.streams || [];
    if (!streams.length) {
      streamsList.innerHTML = "<div class=\"card\">Brak streamow.</div>";
      return;
    }
    streamsList.innerHTML = "";
    streams.forEach((stream) => {
      const dropGroups = stream.drop_group_order || [];
      const dropOrder = getDropOrder(stream);
      const dropRule = getDropAccessRule(stream);
      const orderLabel = dropOrder === ORDER_DESC ? "alphabetical descending" : "alphabetical ascending";
      const ruleRaw = stream.drop_policy?.access_rule || "preceding_empty";
      const ruleLabel = dropRule === "any_free" ? "any_free" : "first_free_not_shadowed";
      const nextPick = getNextPickCandidate(stream.pick_group, ORDER_ASC);
      const nextDrop = getNextDropCandidate(dropGroups, dropOrder, null, dropRule);
      const dropGroupLabel = dropGroups.join(", ") || "--";

      const card = document.createElement("div");
      card.className = "stream-card";
      card.innerHTML = `
        <div class="stream-header">
          <div>
            <div class="stream-title">${stream.id}</div>
            <div class="stream-meta">Transfer between groups</div>
          </div>
          <span class="stream-pill">1 step</span>
        </div>
        <div class="stream-section">
          <div class="stream-step-title">Step 1</div>
          <div class="stream-grid">
            <div>
              <div class="stream-label">Pick group</div>
              <div class="stream-value">${stream.pick_group || "--"}</div>
            </div>
            <div>
              <div class="stream-label">Drop groups</div>
              <div class="stream-value">${dropGroupLabel}</div>
            </div>
            <div>
              <div class="stream-label">Order</div>
              <div class="stream-value">${orderLabel}</div>
            </div>
            <div>
              <div class="stream-label">Rule</div>
              <div class="stream-value">${ruleLabel}</div>
            </div>
            <div>
              <div class="stream-label">Next pick candidate</div>
              <div class="stream-value">${nextPick ? nextPick.id : "--"}</div>
            </div>
            <div>
              <div class="stream-label">Next drop candidate</div>
              <div class="stream-value">${nextDrop ? `${nextDrop.site.id} (${nextDrop.groupId})` : "--"}</div>
            </div>
          </div>
        </div>
      `;
      streamsList.appendChild(card);
    });
  };

  const renderFields = () => {
    if (!worksites.length) {
      fieldsList.innerHTML = "<div class=\"card\">Brak worksite.</div>";
      return;
    }
    const rows = sortWorksites(worksites, ORDER_ASC)
      .map((site) => {
        const state = getWorksiteState(site.id);
        const occupancyLabel = state.occupancy === "filled" ? "Filled" : "Unfilled";
        const blockedLabel = state.blocked ? "Blocked" : "Unblocked";
        return `
          <tr>
            <td>${site.id}</td>
            <td>${site.group || "--"}</td>
            <td><span class="robot-pill ${state.occupancy === "filled" ? "clear" : "blocked"}">${occupancyLabel}</span></td>
            <td><span class="robot-pill ${state.blocked ? "blocked" : "clear"}">${blockedLabel}</span></td>
          </tr>
        `;
      })
      .join("");

    fieldsList.innerHTML = `
      <div class="table-wrap">
        <table class="robot-table">
          <thead>
            <tr>
              <th>Nazwa</th>
              <th>Grupa</th>
              <th>Filled</th>
              <th>Blocked</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  };

  const renderTasks = () => {
    if (!tasks.length) {
      tasksList.innerHTML = "<div class=\"card\">Brak aktywnych zadan.</div>";
      return;
    }
    tasksList.innerHTML = "";
    tasks.forEach((task) => {
      const card = document.createElement("div");
      card.className = "card";
      const statusClass =
        task.status === "Completed" ? "task-done" : task.status === "Failed" ? "task-failed" : "task-active";
      const phaseLabel = task.phase ? ` - ${task.phase}` : "";
      const goodsLabel = task.meta?.goodsType ? `Towar: ${task.meta.goodsType}` : "";
      const lineLabel = task.meta?.lineId ? `Linia: ${task.meta.lineId}` : "";
      const kindLabel = task.kind ? `Typ: ${task.kind}` : "";
      const extraLine = [kindLabel, goodsLabel, lineLabel].filter(Boolean).join(" | ");
      card.innerHTML = `
        <div class=\"card-title\">${task.id}</div>
        <div class=\"card-meta\">Stream: ${task.streamId || "--"} - Robot: ${task.robotId || "--"}</div>
        <div class=\"card-meta\">Pick: ${task.pickId || "--"} -> Drop: ${task.dropId || "--"}</div>
        ${extraLine ? `<div class=\"card-meta\">${extraLine}</div>` : ""}
        <div class=\"badge ${statusClass}\">${task.status}${phaseLabel}</div>
      `;
      tasksList.appendChild(card);
    });
  };

  const renderTrafficDiagnostics = () => {
    if (!trafficLocksList || !trafficQueuesList || !trafficNodesList || !trafficStallsList) {
      return;
    }
    if (currentView !== "traffic") return;
    const label = fleetCoreAvailable
      ? "Diagnostyka dostepna po stronie backendu."
      : "Brak diagnostyki (backend niedostepny).";
    trafficLocksList.innerHTML = `<div class="traffic-empty">${label}</div>`;
    trafficQueuesList.innerHTML = `<div class="traffic-empty">${label}</div>`;
    trafficNodesList.innerHTML = `<div class="traffic-empty">${label}</div>`;
    trafficStallsList.innerHTML = `<div class="traffic-empty">${label}</div>`;
  };

  const init = () => {
    loadSettingsState();
    initNavigation();
    initWorksiteMenu();
    initManualMenu();
    initMapMenu();
    initFaultControls();
    initManualDriveControls();
    initSettingsControls();
    initLogin();
    bindPanZoom();
    bindKeyboardShortcuts();
    if (navControlsPause && navControlsStop) {
      navControlsPause.addEventListener("click", () => {
        const robotId = navControlsPause.dataset.id;
        if (robotId) toggleNavigationPause(robotId);
      });
      navControlsStop.addEventListener("click", () => {
        const robotId = navControlsStop.dataset.id;
        if (robotId) stopNavigation(robotId);
      });
    }
    if (resetViewBtn) {
      resetViewBtn.addEventListener("click", () => {
        resetViewBox();
      });
    }
    if (fitViewBtn) {
      fitViewBtn.addEventListener("click", () => {
        fitViewBox();
      });
    }
    if (scenesRefreshBtn) {
      scenesRefreshBtn.addEventListener("click", () => {
        loadScenes();
      });
    }

    const session = loadSession();
    if (session) {
      showApp(session);
    } else {
      showLogin();
    }
  };

  init();
})();
