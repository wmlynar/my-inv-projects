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
  const MAP_LAYER_CONFIG = [
    { id: "edges", label: "Krawedzie", defaultVisible: true },
    { id: "links", label: "Polaczenia", defaultVisible: true },
    { id: "nodes", label: "Wezly", defaultVisible: true },
    { id: "actionPoints", label: "Action points", defaultVisible: true },
    { id: "worksites", label: "Worksite", defaultVisible: true },
    { id: "obstacles", label: "Przeszkody", defaultVisible: true },
    { id: "robots", label: "Roboty", defaultVisible: true }
  ];
  const mapLayerVisibility = MAP_LAYER_CONFIG.reduce((acc, layer) => {
    acc[layer.id] = layer.defaultVisible !== false;
    return acc;
  }, {});
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
  const logger = window.FleetUI?.Logger || null;
  const geometry = window.FleetUI?.Geometry || null;
  const Events = window.FleetUI?.Events || {};
  const Selectors = window.FleetUI?.Selectors || {};
  let dataSource = null;
  let scenesManager = null;
  let mapView = null;
  let scenesView = null;
  let robotsView = null;
  let streamsView = null;
  let settingsView = null;
  let robotDiagnosticsService = null;
  let manualDriveService = null;
  let packagingService = null;

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

  const select = (selector) => (selector ? document.querySelector(selector) : null);
  const selectAll = (selector) => (selector ? Array.from(document.querySelectorAll(selector)) : []);

  const loginView = select(Selectors.LOGIN_VIEW);
  const appView = select(Selectors.APP_VIEW);
  const loginForm = select(Selectors.LOGIN_FORM);
  const loginUserInput = select(Selectors.LOGIN_USER);
  const loginPassInput = select(Selectors.LOGIN_PASS);
  const loginError = select(Selectors.LOGIN_ERROR);
  const logoutBtn = select(Selectors.LOGOUT_BTN);

  const navItems = selectAll(Selectors.NAV_ITEM);
  const panels = selectAll(Selectors.PANEL);
  const viewTitle = select(Selectors.VIEW_TITLE);
  const viewSubtitle = select(Selectors.VIEW_SUBTITLE);
  const sessionUser = select(Selectors.SESSION_USER);

  const mapShell = select(Selectors.MAP_SHELL);
  const mapSvg = select(Selectors.MAP_SVG);
  const mapWrap = select(Selectors.MAP_WRAP);
  const mapLayerPanel = select(Selectors.MAP_LAYER_PANEL);
  const worksiteMenu = select(Selectors.WORKSITE_MENU);
  const manualMenu = select(Selectors.MANUAL_MENU);
  const manualMenuRobot = select(Selectors.MANUAL_MENU_ROBOT);
  const mapMenu = select(Selectors.MAP_MENU);
  const navControls = select(Selectors.NAV_CONTROLS);
  const navControlsName = select(Selectors.NAV_CONTROLS_NAME);
  const navControlsPause = select(Selectors.NAV_CONTROLS_PAUSE);
  const navControlsStop = select(Selectors.NAV_CONTROLS_STOP);
  const manualDrivePanel = select(Selectors.MANUAL_DRIVE_PANEL);
  const manualDriveRobot = select(Selectors.MANUAL_DRIVE_ROBOT);
  const manualDriveToggle = select(Selectors.MANUAL_DRIVE_TOGGLE);
  const resetViewBtn = select(Selectors.RESET_VIEW_BTN);
  const fitViewBtn = select(Selectors.FIT_VIEW_BTN);
  const miniMapSvg = select(Selectors.MINI_MAP_SVG);
  const mapStore = window.MapStore?.create?.();
  if (mapStore?.setLayers) {
    mapStore.setLayers({ ...mapLayerVisibility }, "init");
  }

  const robotsList = select(Selectors.ROBOTS_LIST);
  const streamsList = select(Selectors.STREAMS_LIST);
  const scenesList = select(Selectors.SCENES_LIST);
  const scenesRefreshBtn = select(Selectors.SCENES_REFRESH);
  const fieldsList = select(Selectors.FIELDS_LIST);
  const tasksList = select(Selectors.TASKS_LIST);
  const trafficLocksList = select(Selectors.TRAFFIC_LOCKS);
  const trafficQueuesList = select(Selectors.TRAFFIC_QUEUES);
  const trafficNodesList = select(Selectors.TRAFFIC_NODES);
  const trafficStallsList = select(Selectors.TRAFFIC_STALLS);
  const faultRobotSelect = select(Selectors.FAULT_ROBOT_SELECT);
  const faultPickProblemBtn = select(Selectors.FAULT_PICK_PROBLEM);
  const faultPickRobotBlockedBtn = select(Selectors.FAULT_PICK_BLOCKED);
  const faultDropProblemBtn = select(Selectors.FAULT_DROP_PROBLEM);
  const faultDriveBlockBtn = select(Selectors.FAULT_DRIVE_BLOCK);
  const faultDriveAvoidBtn = select(Selectors.FAULT_DRIVE_AVOID);
  const faultClearObstaclesBtn = select(Selectors.FAULT_CLEAR_OBSTACLES);
  const faultClearBlockBtn = select(Selectors.FAULT_CLEAR_BLOCK);
  const settingsSimModeSelect = select(Selectors.SETTINGS_SIM_MODE);
  const settingsDispatchSelect = select(Selectors.SETTINGS_DISPATCH_STRATEGY);
  const settingsTrafficSelect = select(Selectors.SETTINGS_TRAFFIC_STRATEGY);
  const settingsTrafficStopDistanceInput = select(Selectors.SETTINGS_TRAFFIC_STOP_DISTANCE);
  const settingsSimApplyBtn = select(Selectors.SETTINGS_SIM_APPLY);
  const settingsSimResetBtn = select(Selectors.SETTINGS_SIM_RESET);
  const settingsAlgoApplyBtn = select(Selectors.SETTINGS_ALGO_APPLY);
  const settingsAlgoResetBtn = select(Selectors.SETTINGS_ALGO_RESET);
  const settingsSimNote = select(Selectors.SETTINGS_SIM_NOTE);
  const settingsAlgoNote = select(Selectors.SETTINGS_ALGO_NOTE);
  const taxonomyDispatchCurrent = select(Selectors.TAXONOMY_DISPATCH_CURRENT);
  const taxonomyDispatchAxes = select(Selectors.TAXONOMY_DISPATCH_AXES);
  const taxonomyTrafficCurrent = select(Selectors.TAXONOMY_TRAFFIC_CURRENT);
  const taxonomyTrafficAxes = select(Selectors.TAXONOMY_TRAFFIC_AXES);
  const bufferGrid = select(Selectors.BUFFER_GRID);
  const bufferEditor = select(Selectors.BUFFER_EDITOR);
  const lineRequestsList = select(Selectors.LINE_REQUESTS);
  const placeOpsPanel = select(Selectors.PLACE_OPS);

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
  let selectedBufferCell = null;
  let selectedBufferLevel = 1;
  let selectedPlaceId = null;
  let selectedPlaceGoods = null;
  let currentView = "map";
  let manualTargetRobotId = null;
  let obstacles = [];
  let obstacleIdSeq = 1;
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
  let settingsState = {
    simMode: null,
    dispatchStrategy: null,
    trafficStrategy: null,
    forwardStopDistanceM: null
  };
  let algorithmCatalog = null;
  let algorithmCatalogLoaded = false;

  const applyAlgorithmCatalog = (catalog) => {
    if (!catalog || typeof catalog !== "object") return false;
    settingsView?.applyCatalog?.(catalog);
    algorithmCatalog = catalog;
    algorithmCatalogLoaded = true;
    return true;
  };

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

  const refreshRobotDiagnostics = () => {
    robotDiagnosticsService?.refresh?.(robots);
  };

  const getRobotDiagnostics = (robotId) => robotDiagnosticsService?.get?.(robotId) || null;
  const syncSettingsPanel = () => {
    settingsView?.render?.();
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const ensureRobotMotion = (robot) => {
    if (!robot) return;
    if (!Number.isFinite(robot.heading)) robot.heading = 0;
    if (!Number.isFinite(robot.speed)) robot.speed = 0;
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

  const initFaultControls = () => {
    if (!faultRobotSelect) return;
    robotsView?.syncFaultRobotSelect?.();
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
        if (!robotId || !manualDriveService) return;
        const state = manualDriveService.getState();
        const enable = !state.enabled || state.robotId !== robotId;
        if (!state.enabled && state.robotId !== robotId) {
          manualDriveService.setTarget(robotId);
        }
        manualDriveService.setEnabled(robotId, enable);
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
    if (dataSource?.fetchJson) {
      return dataSource.fetchJson(path);
    }
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load ${path}`);
    }
    return response.json();
  };

  const fetchJsonSafe = async (path) => {
    if (dataSource?.fetchJsonSafe) {
      return dataSource.fetchJsonSafe(path);
    }
    try {
      return await fetchJson(path);
    } catch (_error) {
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
    const config = dataSource?.fetchConfig
      ? await dataSource.fetchConfig(FLEET_CONFIG_PATH)
      : await fetchJsonSafe(FLEET_CONFIG_PATH);
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
    if (scenesView?.render) {
      scenesView.render();
      return;
    }
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
    if (scenesView?.loadScenes) {
      return scenesView.loadScenes(options);
    }
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
    if (scenesManager?.activate) {
      await scenesManager.activate(sceneId, mapId);
      await loadData({ reset: true, silent: true });
      await loadScenes({ silent: true });
      return;
    }
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

  const getPlaceById = (placeId) => packagingService?.getPlaceById?.(placeId) || null;

  const resolvePlacePos = (placeId) => {
    const place = getPlaceById(placeId);
    if (!place) return null;
    return resolvePointPosition(place.point) || place.pos || null;
  };

  const updateBufferOps = (bufferId, goodsType, level, updates, kind) => {
    if (!packagingService) return;
    packagingService.updateBufferOps(bufferId, goodsType, level, updates, kind).then((changed) => {
      if (changed) {
        renderBufferEditor();
      }
    });
  };

  const updatePlaceOps = (placeId, goodsType, updates, kind) => {
    if (!packagingService) return;
    packagingService.updatePlaceOps(placeId, goodsType, updates, kind).then((changed) => {
      if (changed) {
        renderPlaceOps();
      }
    });
  };

  const applyPackagingState = (payload) => {
    if (!payload || typeof payload !== "object") return;
    packagingService?.applyState?.(payload);
    const state = packagingService?.getState?.() || {
      bufferState: {},
      lineRequests: []
    };
    const bufferState = state.bufferState || {};
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
    manualTargetRobotId = null;
    manualDriveService?.reset?.();
    robotDiagnosticsService?.reset?.();
    packagingService?.reset?.();
    selectedBufferCell = null;
    selectedBufferLevel = 1;
    selectedPlaceId = null;
    selectedPlaceGoods = null;
    if (mapSvg) {
      mapSvg.innerHTML = "";
    }
    if (miniMapSvg) {
      miniMapSvg.innerHTML = "";
    }
  };

  const fetchMapBundle = async () => {
    if (dataSource?.fetchMapBundle) {
      return dataSource.fetchMapBundle();
    }
    return Promise.all([
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
  };

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
    packagingService?.setConfig?.(packagingConfig);
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
    refreshRobotDiagnostics();
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
    if (!packagingService) return;
    packagingService.setConfig(packagingConfig);
    if (!packagingService.ensureState()) {
      return;
    }
    const { bufferState } = packagingService.getState();
    const firstBufferId = packagingConfig.buffers?.[0]?.id || null;
    const firstCell = firstBufferId ? bufferState[firstBufferId]?.[0] : null;
    selectedBufferCell = firstCell
      ? { bufferId: firstBufferId, cellId: firstCell.id }
      : null;
    selectedBufferLevel = 1;
    const firstPlaceId = packagingConfig.places ? Object.keys(packagingConfig.places)[0] : null;
    selectedPlaceId = firstPlaceId;
    selectedPlaceGoods = packagingConfig.goodsTypes?.[0] || null;
  };

  const getBufferCell = (bufferId, cellId) =>
    packagingService?.getBufferCell?.(bufferId, cellId) || null;

  const updateBufferCell = (bufferId, cellId, updates) => {
    if (!packagingService) return;
    packagingService.updateBufferCell(bufferId, cellId, updates).then((state) => {
      if (state) {
        applyPackagingState(state);
        return;
      }
      renderBufferGrid();
      renderBufferEditor();
    });
  };

  const updateLineRequest = (lineId, key, updates) => {
    if (!packagingService) return;
    packagingService.updateLineRequest(lineId, key, updates).then((state) => {
      if (state) {
        applyPackagingState(state);
        return;
      }
      renderLineRequests();
      renderStreams();
    });
  };

  const renderBufferGrid = () => {
    if (!bufferGrid || !packagingConfig) return;
    const bufferState = packagingService?.getBufferState?.() || {};
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
      const layout = packagingService?.buildBufferLayout?.(buffer) || [];
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
    const ops = packagingService?.resolveBufferOps?.(buffer, cell.goodsType, selectedBufferLevel) || {};
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
    const lineRequests = packagingService?.getLineRequests?.() || [];
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
    const ops = packagingService?.resolvePlaceOps?.(selectedPlaceId, selectedPlaceGoods) || {};
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
    refreshRobotDiagnostics();
    renderRobots();
    mapView?.updateRobots?.(robots);
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
    let touched = false;
    coreWorksites.forEach((site) => {
      if (!site || !site.id) return;
      const state = getWorksiteState(site.id);
      state.occupancy = site.filled ? "filled" : "empty";
      state.blocked = Boolean(site.blocked);
      worksiteState[site.id] = state;
      touched = true;
    });
    if (touched) {
      mapView?.updateWorksiteState?.(worksiteState);
    }
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
    manualDriveService?.syncRobotAvailability?.();
    refreshRobotViews();
    renderTasks();
    robotsView?.syncFaultRobotSelect?.();
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
    const streamUrl = fleetStreamPath || `${fleetApiBase}/stream`;
    if (dataSource?.streamStatus) {
      fleetStream = dataSource.streamStatus(streamUrl, {
        onMessage: (payload) => {
          if (!payload || !payload.ok) return;
          applyFleetStatus(payload);
          if (isLocalSim()) {
            refreshPackagingState();
            refreshSimObstacles();
          }
        },
        onError: () => {
          stopFleetStream();
          startFleetPolling();
        }
      });
      if (fleetStream) return;
    }
    if (typeof window.EventSource === "undefined") {
      startFleetPolling();
      return;
    }
    try {
      fleetStream = new EventSource(streamUrl);
    } catch (_error) {
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
    manualDriveService?.start?.();
  };

  const stopManualDriveLoop = () => {
    manualDriveService?.stop?.();
  };

  const sendRobotCommand = async (robotId, action, payload = null) => {
    if (!robotId || !action) return null;
    const path = `${fleetApiBase}/robots/${encodeURIComponent(robotId)}/${action}`;
    if (dataSource?.postJson) {
      return dataSource.postJson(path, payload);
    }
    const body = payload ? JSON.stringify(payload) : null;
    const response = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : {},
      body
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `robot_command_failed_${response.status}`);
    }
    return response.json();
  };

  const postFleetJson = async (path, payload = null) => {
    const target = `${fleetApiBase}${path}`;
    if (dataSource?.postJson) {
      return dataSource.postJson(target, payload);
    }
    const body = payload ? JSON.stringify(payload) : null;
    const response = await fetch(target, {
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
    if (manualDriveService?.getState?.()?.enabled) {
      manualDriveService.setTarget(robotId);
    }
    renderNavControls();
    renderManualDrivePanel();
    if (mapView?.updateRobots) {
      mapView.updateRobots(robots);
    }
  };

  const setManualDriveTarget = (robotId) => {
    manualDriveService?.setTarget?.(robotId);
  };

  const setManualDriveEnabled = (robotId, enabled) => {
    manualDriveService?.setEnabled?.(robotId, enabled);
  };

  const manualDriveEnabled = (robotId) => manualDriveService?.enabledFor?.(robotId) || false;

  const renderManualDrivePanel = () => {
    if (!manualDrivePanel || !manualDriveRobot || !manualDriveToggle) return;
    const robot = getManualCommandRobot();
    if (!robot) {
      manualDrivePanel.classList.add("hidden");
      return;
    }
    const state = manualDriveService?.getState?.();
    manualDrivePanel.classList.remove("hidden");
    manualDrivePanel.classList.toggle("active", Boolean(state?.enabled));
    manualDriveRobot.textContent = robot.name;
    manualDriveToggle.textContent = state?.enabled
      ? "Wylacz sterowanie"
      : "Wlacz sterowanie";
    manualDriveToggle.dataset.id = robot.id;
  };

  const handleManualDriveKey = (event, pressed) => {
    if (!manualDriveService) return;
    const state = manualDriveService.getState();
    if (!state.enabled || !state.robotId) return;
    if (manualDrivePanel?.classList.contains("hidden")) return;
    const mapPanel = select(Selectors.VIEW_MAP);
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
    manualDriveService.setKey(mapped, pressed);
  };

  const clearManualDriveKeys = () => {
    manualDriveService?.clearKeys?.();
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
    if (manualDriveService?.enabledFor?.(robotId)) {
      manualDriveService.setEnabled(robotId, false);
    }
    sendRobotCommand(robotId, "go-target", { id: pointId, action: actionKey })
      .then(() => refreshFleetStatus())
      .catch((error) => {
        console.warn("Manual command failed", error);
      });
  };

  const renderMapError = (message) => {
    if (!mapSvg) return;
    mapSvg.innerHTML = "";
    const text = document.createElementNS(svgNS, "text");
    text.textContent = message;
    text.setAttribute("x", "16");
    text.setAttribute("y", "24");
    text.setAttribute("fill", "#6b6055");
    text.setAttribute("font-size", "14");
    mapSvg.appendChild(text);
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
    mapView?.updateObstacles?.(obstacles);
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
    mapView?.updateObstacles?.(obstacles);
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
    mapView?.updateObstacles?.(obstacles);
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
    mapView?.updateObstacles?.(obstacles);
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
    mapView?.setData?.({
      graph: graphData,
      workflow: workflowData,
      worksites,
      worksiteState,
      robots,
      robotsConfig,
      obstacles
    });
  };

  const getWorksiteState = (id) => {
    return worksiteState[id] || { occupancy: "empty", blocked: false };
  };

  const persistWorksiteState = () => {};

  const updateWorksiteRemote = async (id, updates) => {
    if (!isRemoteSim()) return;
    try {
      await postFleetJson(`/worksites/${encodeURIComponent(id)}`, updates || {});
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
    mapView?.updateWorksiteState?.(worksiteState);
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
    mapView?.updateWorksiteState?.(worksiteState);
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

  const handleRobotAction = (action, id) => {
    if (!action || !id) return;
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

  const renderRobots = () => {
    robotsView?.render?.();
  };

  const renderStreams = () => {
    streamsView?.render?.();
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
    dataSource = window.FleetUI?.DataSource?.create?.() || window.FleetUI?.DataSource || null;
    scenesManager = window.FleetUI?.ScenesManager?.create?.({
      fetchJson,
      postJson: dataSource?.postJson || window.FleetUI?.DataSource?.postJson,
      logger,
      events: Events
    });
    mapView = window.FleetUI?.MapView?.init({
      elements: {
        mapShell,
        mapWrap,
        mapSvg,
        miniMapSvg,
        layerPanel: mapLayerPanel,
        fitViewBtn,
        resetViewBtn,
        navControlsPause,
        navControlsStop,
        worksiteMenu,
        manualMenu,
        manualMenuRobot,
        mapMenu
      },
      store: mapStore,
      geometry,
      logger,
      events: Events,
      constants: {
        LABEL_SIZE_PX,
        LABEL_OFFSET_PX,
        NODE_LABEL_SIZE_PX,
        NODE_LABEL_OFFSET_PX,
        NODE_LABEL_MIN_ZOOM,
        LABEL_MIN_ZOOM,
        MAP_OUTER_MARGIN,
        WORKSITE_AP_OFFSET,
        WORKSITE_POS_MAX_DRIFT
      },
      layerConfig: MAP_LAYER_CONFIG,
      handlers: {
        onRobotClick: handleRobotMarkerClick,
        removeObstacle,
        buildRobotMarkerClass,
        resolveRobotModel,
        ensureRobotMotion,
        setWorksiteOccupancy,
        setWorksiteBlocked,
        issueManualCommand,
        getManualCommandRobot,
        sendRobotCommand,
        refreshFleetStatus,
        addObstacle,
        isRemoteSim,
        getWorksiteState,
        manualDriveEnabled,
        setManualDriveEnabled,
        toggleNavigationPause,
        stopNavigation
      }
    });
    if (mapStore) {
      mapStore.subscribe((_state, reason) => {
        if (reason === "map_state" || reason === "viewport") return;
        if (mapView?.updateRobots) {
          mapView.updateRobots(robots);
        }
      });
    }
    scenesView = scenesManager
      ? window.FleetUI?.ScenesView?.init({
          elements: { scenesList, scenesRefreshBtn },
          services: { scenesManager },
          handlers: {
            onSceneActivated: async () => {
              await loadData({ reset: true, silent: true });
            }
          },
          logger
        })
      : null;
    robotsView = window.FleetUI?.RobotsView?.init({
      elements: { robotsList, faultRobotSelect },
      state: {
        getRobots: () => robots,
        getDiagnostics: getRobotDiagnostics,
        isRobokitSim,
        isRemoteSim
      },
      handlers: {
        onAction: handleRobotAction
      }
    });
    streamsView = window.FleetUI?.StreamsView?.init({
      elements: { streamsList },
      state: {
        getPackagingConfig: () => packagingConfig,
        getWorkflowData: () => workflowData,
        getLineRequests: () => packagingService?.getLineRequests?.() || [],
        getWorksites: () => worksites,
        getWorksiteState
      },
      helpers: {
        sortWorksites,
        orderAsc: ORDER_ASC,
        orderDesc: ORDER_DESC
      }
    });
    settingsView = window.FleetUI?.SettingsView?.init({
      elements: {
        settingsSimModeSelect,
        settingsDispatchSelect,
        settingsTrafficSelect,
        settingsTrafficStopDistanceInput,
        settingsSimApplyBtn,
        settingsSimNote,
        settingsAlgoNote,
        taxonomyDispatchCurrent,
        taxonomyTrafficCurrent,
        taxonomyDispatchAxes,
        taxonomyTrafficAxes
      },
      state: {
        getSimMode: () => simMode,
        getFleetSimModeMutable: () => fleetSimModeMutable,
        getFleetCoreAvailable: () => fleetCoreAvailable,
        getSettingsState: () => settingsState,
        getRobotsConfig: () => robotsConfig,
        getAlgorithmCatalog: () => algorithmCatalog
      },
      helpers: {
        normalizeOption,
        resolveDispatchStrategy,
        resolveTrafficStrategyName,
        resolveTrafficForwardStopDistance,
        isRobokitSim
      },
      options: {
        simModeOptions: SIM_MODE_OPTIONS,
        robokitSimMode: ROBOKIT_SIM_MODE,
        dispatchOptions: DISPATCH_STRATEGY_OPTIONS,
        trafficOptions: TRAFFIC_STRATEGY_OPTIONS,
        defaultDispatchLabels: DEFAULT_DISPATCH_LABELS,
        defaultTrafficLabels: DEFAULT_TRAFFIC_LABELS
      }
    });
    robotDiagnosticsService = FleetDomain.RobotDiagnosticsService
      ? new FleetDomain.RobotDiagnosticsService({
          staleMinMs: DIAG_STALE_MIN_MS,
          staleMultiplier: DIAG_STALE_MULTIPLIER,
          getFleetPollMs: () => fleetPollMs,
          getLastFleetUpdateAt: () => lastFleetUpdateAt
        })
      : null;
    manualDriveService = FleetDomain.ManualDriveService
      ? new FleetDomain.ManualDriveService({
          speedMps: MANUAL_DRIVE_SPEED_MPS,
          turnRateRadS: ROBOT_TURN_RATE_RAD_S,
          tickMs: SIM_TICK_MS,
          getRobotById,
          updateRobotState,
          sendRobotCommand,
          stopNavigation,
          isRemoteSim,
          logger,
          onStateChange: () => {
            renderManualDrivePanel();
          }
        })
      : null;
    packagingService = FleetDomain.PackagingService
      ? new FleetDomain.PackagingService({
          engine: PackagingEngine,
          storage: window.localStorage,
          isLocalSim,
          postFleetJson,
          logger,
          storageKeys: {
            state: PACKAGING_STATE_KEY,
            signature: PACKAGING_SIGNATURE_KEY,
            lineRequests: LINE_REQUEST_KEY,
            ops: OPS_STATE_KEY
          }
        })
      : null;
    window.FleetUI?.Compat?.bind?.({ mapView, scenesView, logger });
    loadSettingsState();
    initNavigation();
    initFaultControls();
    initManualDriveControls();
    initSettingsControls();
    initLogin();

    const session = loadSession();
    if (session) {
      showApp(session);
    } else {
      showLogin();
    }
  };

  init();
})();
