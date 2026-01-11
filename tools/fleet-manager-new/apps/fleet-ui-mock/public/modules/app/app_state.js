(() => {
  window.FleetUI = window.FleetUI || {};
  const App = window.FleetUI.App || (window.FleetUI.App = {});
  const Events = window.FleetUI?.Events || {};
  const Selectors = window.FleetUI?.Selectors || {};
  const logger = window.FleetUI?.Logger || null;
  const geometry = window.FleetUI?.Geometry || null;
  const PackagingEngine = window.PackagingEngine || null;
  const FleetDomain = window.FleetDomain || {};

  const constants = {
    SESSION_KEY: "fleetManagerSession",
    PACKAGING_STATE_KEY: "fleetManagerPackagingState",
    LINE_REQUEST_KEY: "fleetManagerLineRequests",
    PACKAGING_SIGNATURE_KEY: "fleetManagerPackagingSignature",
    OPS_STATE_KEY: "fleetManagerOpsState",
    SETTINGS_KEY: "fleetManagerSettings",
    SESSION_TTL_MS: 30 * 24 * 60 * 60 * 1000,
    DEFAULT_USER: { username: "admin", password: "123456" },
    WORKSITE_OCCUPANCY: ["empty", "filled"],
    LABEL_SIZE_PX: 40,
    LABEL_OFFSET_PX: 40,
    NODE_LABEL_SIZE_PX: 40,
    NODE_LABEL_OFFSET_PX: -40,
    NODE_LABEL_MIN_ZOOM: 1,
    LABEL_MIN_ZOOM: 1,
    MAP_OUTER_MARGIN: 10,
    WORKSITE_AP_OFFSET: 0.5,
    WORKSITE_POS_MAX_DRIFT: 2.6,
    ORDER_ASC: "asc",
    ORDER_DESC: "desc",
    SIM_TICK_MS: 140,
    DIAG_STALE_MIN_MS: 1200,
    DIAG_STALE_MULTIPLIER: 6,
    ROBOT_TURN_RATE_RAD_S: Math.PI,
    ROBOT_RADIUS: 0.6,
    DEFAULT_ROBOT_MODEL: { head: 0.5, tail: 2, width: 1 },
    OBSTACLE_RADIUS: 0.8,
    MANUAL_DRIVE_SPEED_MPS: 0.6,
    SIM_API_BASE: "/api/sim",
    FLEET_API_BASE_DEFAULT: "/api/fleet",
    FLEET_CONFIG_PATH: "/api/fleet/config",
    FLEET_STREAM_PATH_DEFAULT: "/api/fleet/stream",
    FLEET_STATE_PATH_DEFAULT: "/api/fleet/state",
    LOCAL_SIM_MODE: "local",
    ROBOKIT_SIM_MODE: "robokit",
    ALGORITHM_CATALOG_PATH: "/api/algorithms/catalog",
    MAP_LAYER_CONFIG: [
      { id: "edges", label: "Krawedzie", defaultVisible: true },
      { id: "links", label: "Polaczenia", defaultVisible: true },
      { id: "nodes", label: "Wezly", defaultVisible: true },
      { id: "actionPoints", label: "Action points", defaultVisible: true },
      { id: "worksites", label: "Worksite", defaultVisible: true },
      { id: "obstacles", label: "Przeszkody", defaultVisible: true },
      { id: "robots", label: "Roboty", defaultVisible: true }
    ],
    SIM_MODE_OPTIONS: [
      { value: "local", label: "Lokalny (fleet manager)" },
      { value: "robokit", label: "Robokit (proxy)" }
    ],
    DEFAULT_DISPATCH_LABELS: {
      nearest: "Najblizszy robot",
      first: "Pierwszy dostepny"
    },
    DEFAULT_TRAFFIC_LABELS: {
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
    },
    DISPATCH_STRATEGY_OPTIONS: [
      { value: "nearest", label: "Najblizszy robot" },
      { value: "first", label: "Pierwszy dostepny" }
    ],
    TRAFFIC_STRATEGY_OPTIONS: [
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
    ],
    MANUAL_KEY_MAP: {
      arrowup: "up",
      w: "up",
      arrowdown: "down",
      s: "down",
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right"
    },
    SVG_NS: "http://www.w3.org/2000/svg"
  };

  const mapLayerVisibility = constants.MAP_LAYER_CONFIG.reduce((acc, layer) => {
    acc[layer.id] = layer.defaultVisible !== false;
    return acc;
  }, {});

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

  const helpers = {
    select(selector) {
      return selector ? document.querySelector(selector) : null;
    },
    selectAll(selector) {
      return selector ? Array.from(document.querySelectorAll(selector)) : [];
    },
    clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    },
    safeParse(value) {
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch (_error) {
        return null;
      }
    },
    normalizeOption(value, allowed) {
      if (!value || !Array.isArray(allowed) || !allowed.length) return null;
      const key = String(value).trim().toLowerCase();
      return allowed.includes(key) ? key : null;
    },
    normalizeForwardStopDistance(value) {
      if (value === "" || value === null || value === undefined) return null;
      const num = Number(value);
      return Number.isFinite(num) ? Math.max(0, num) : null;
    },
    resolveBoolean(value, fallback) {
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
  };

  const elements = {
    loginView: helpers.select(Selectors.LOGIN_VIEW),
    appView: helpers.select(Selectors.APP_VIEW),
    loginForm: helpers.select(Selectors.LOGIN_FORM),
    loginUserInput: helpers.select(Selectors.LOGIN_USER),
    loginPassInput: helpers.select(Selectors.LOGIN_PASS),
    loginError: helpers.select(Selectors.LOGIN_ERROR),
    logoutBtn: helpers.select(Selectors.LOGOUT_BTN),
    navItems: helpers.selectAll(Selectors.NAV_ITEM),
    panels: helpers.selectAll(Selectors.PANEL),
    viewTitle: helpers.select(Selectors.VIEW_TITLE),
    viewSubtitle: helpers.select(Selectors.VIEW_SUBTITLE),
    sessionUser: helpers.select(Selectors.SESSION_USER),
    mapShell: helpers.select(Selectors.MAP_SHELL),
    mapSvg: helpers.select(Selectors.MAP_SVG),
    mapWrap: helpers.select(Selectors.MAP_WRAP),
    mapLayerPanel: helpers.select(Selectors.MAP_LAYER_PANEL),
    worksiteMenu: helpers.select(Selectors.WORKSITE_MENU),
    manualMenu: helpers.select(Selectors.MANUAL_MENU),
    manualMenuRobot: helpers.select(Selectors.MANUAL_MENU_ROBOT),
    mapMenu: helpers.select(Selectors.MAP_MENU),
    navControls: helpers.select(Selectors.NAV_CONTROLS),
    navControlsName: helpers.select(Selectors.NAV_CONTROLS_NAME),
    navControlsPause: helpers.select(Selectors.NAV_CONTROLS_PAUSE),
    navControlsStop: helpers.select(Selectors.NAV_CONTROLS_STOP),
    manualDrivePanel: helpers.select(Selectors.MANUAL_DRIVE_PANEL),
    manualDriveRobot: helpers.select(Selectors.MANUAL_DRIVE_ROBOT),
    manualDriveToggle: helpers.select(Selectors.MANUAL_DRIVE_TOGGLE),
    resetViewBtn: helpers.select(Selectors.RESET_VIEW_BTN),
    fitViewBtn: helpers.select(Selectors.FIT_VIEW_BTN),
    miniMapSvg: helpers.select(Selectors.MINI_MAP_SVG),
    robotsList: helpers.select(Selectors.ROBOTS_LIST),
    streamsList: helpers.select(Selectors.STREAMS_LIST),
    scenesList: helpers.select(Selectors.SCENES_LIST),
    scenesRefreshBtn: helpers.select(Selectors.SCENES_REFRESH),
    fieldsList: helpers.select(Selectors.FIELDS_LIST),
    tasksList: helpers.select(Selectors.TASKS_LIST),
    trafficLocksList: helpers.select(Selectors.TRAFFIC_LOCKS),
    trafficQueuesList: helpers.select(Selectors.TRAFFIC_QUEUES),
    trafficNodesList: helpers.select(Selectors.TRAFFIC_NODES),
    trafficStallsList: helpers.select(Selectors.TRAFFIC_STALLS),
    faultRobotSelect: helpers.select(Selectors.FAULT_ROBOT_SELECT),
    faultPickProblemBtn: helpers.select(Selectors.FAULT_PICK_PROBLEM),
    faultPickRobotBlockedBtn: helpers.select(Selectors.FAULT_PICK_BLOCKED),
    faultDropProblemBtn: helpers.select(Selectors.FAULT_DROP_PROBLEM),
    faultDriveBlockBtn: helpers.select(Selectors.FAULT_DRIVE_BLOCK),
    faultDriveAvoidBtn: helpers.select(Selectors.FAULT_DRIVE_AVOID),
    faultClearObstaclesBtn: helpers.select(Selectors.FAULT_CLEAR_OBSTACLES),
    faultClearBlockBtn: helpers.select(Selectors.FAULT_CLEAR_BLOCK),
    settingsSimModeSelect: helpers.select(Selectors.SETTINGS_SIM_MODE),
    settingsDispatchSelect: helpers.select(Selectors.SETTINGS_DISPATCH_STRATEGY),
    settingsTrafficSelect: helpers.select(Selectors.SETTINGS_TRAFFIC_STRATEGY),
    settingsTrafficStopDistanceInput: helpers.select(Selectors.SETTINGS_TRAFFIC_STOP_DISTANCE),
    settingsSimApplyBtn: helpers.select(Selectors.SETTINGS_SIM_APPLY),
    settingsSimResetBtn: helpers.select(Selectors.SETTINGS_SIM_RESET),
    settingsAlgoApplyBtn: helpers.select(Selectors.SETTINGS_ALGO_APPLY),
    settingsAlgoResetBtn: helpers.select(Selectors.SETTINGS_ALGO_RESET),
    settingsSimNote: helpers.select(Selectors.SETTINGS_SIM_NOTE),
    settingsAlgoNote: helpers.select(Selectors.SETTINGS_ALGO_NOTE),
    taxonomyDispatchCurrent: helpers.select(Selectors.TAXONOMY_DISPATCH_CURRENT),
    taxonomyDispatchAxes: helpers.select(Selectors.TAXONOMY_DISPATCH_AXES),
    taxonomyTrafficCurrent: helpers.select(Selectors.TAXONOMY_TRAFFIC_CURRENT),
    taxonomyTrafficAxes: helpers.select(Selectors.TAXONOMY_TRAFFIC_AXES),
    bufferGrid: helpers.select(Selectors.BUFFER_GRID),
    bufferEditor: helpers.select(Selectors.BUFFER_EDITOR),
    lineRequestsList: helpers.select(Selectors.LINE_REQUESTS),
    placeOpsPanel: helpers.select(Selectors.PLACE_OPS)
  };

  const mapStore = window.MapStore?.create?.();
  if (mapStore?.setLayers) {
    mapStore.setLayers({ ...mapLayerVisibility }, "init");
  }

  const state = {
    graphData: null,
    workflowData: null,
    robotsConfig: null,
    worksites: [],
    robots: [],
    tasks: [],
    scenesState: { activeSceneId: null, scenes: [] },
    scenesLoading: false,
    scenesBusy: false,
    scenesError: null,
    scenesBound: false,
    worksiteState: {},
    dataLoaded: false,
    packagingConfig: null,
    selectedBufferCell: null,
    selectedBufferLevel: 1,
    selectedPlaceId: null,
    selectedPlaceGoods: null,
    currentView: "map",
    manualTargetRobotId: null,
    obstacles: [],
    obstacleIdSeq: 1,
    simObstacleSyncToken: 0,
    simMode: constants.LOCAL_SIM_MODE,
    fleetApiBase: constants.FLEET_API_BASE_DEFAULT,
    fleetStreamPath: constants.FLEET_STREAM_PATH_DEFAULT,
    fleetStatePath: constants.FLEET_STATE_PATH_DEFAULT,
    fleetPollMs: 200,
    fleetPollTimer: null,
    fleetPollInFlight: false,
    fleetCoreAvailable: false,
    fleetSimModeMutable: true,
    fleetStream: null,
    lastFleetUpdateAt: null,
    settingsState: {
      simMode: null,
      dispatchStrategy: null,
      trafficStrategy: null,
      forwardStopDistanceM: null
    },
    algorithmCatalog: null,
    algorithmCatalogLoaded: false,
    mapLayerVisibility
  };

  const domainStore = FleetDomain.InMemoryStore
    ? new FleetDomain.InMemoryStore({ robots: [], tasks: [] })
    : null;
  const robotRepo = FleetDomain.RobotRepository ? new FleetDomain.RobotRepository(domainStore) : null;
  const taskRepo = FleetDomain.TaskRepository ? new FleetDomain.TaskRepository(domainStore) : null;
  const robotService = FleetDomain.RobotService ? new FleetDomain.RobotService(robotRepo) : null;

  const services = {
    dataSource: null,
    scenesManager: null,
    mapView: null,
    scenesView: null,
    robotsView: null,
    streamsView: null,
    settingsView: null,
    robotDiagnosticsService: null,
    manualDriveService: null,
    packagingService: null,
    domainStore,
    robotRepo,
    taskRepo,
    robotService,
    packagingEngine: PackagingEngine,
    events: Events,
    logger,
    geometry,
    mapStore,
    selectors: Selectors
  };

  App.constants = constants;
  App.state = state;
  App.elements = elements;
  App.helpers = helpers;
  App.viewMeta = viewMeta;
  App.services = services;
})();
