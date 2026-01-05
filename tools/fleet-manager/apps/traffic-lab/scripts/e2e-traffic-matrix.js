const { TrafficStrategies } = require("@fleet-manager/core-mapf");
const { Algorithms: AlgorithmsModule } = require("@fleet-manager/sim-runtime");

const DEFAULT_TRAFFIC_STRATEGIES = [
  "simple",
  "pulse-mapf",
  "pulse-mapf-avoid",
  "pulse-mapf-time",
  "sipp",
  "sipp-kinodynamic",
  "sipp-robust",
  "ecbs-sipp",
  "cbs-sipp",
  "cbs-full",
  "mapf-global",
  "mapf-pibt",
  "mapf-mstar",
  "mapf-smt"
];

const DEFAULT_YIELD_MODES = ["no-yield"];
const DEFAULT_SEGMENT_LENGTHS = [null];
const DEFAULT_IGNORE_TRAFFIC = [false];
const DEFAULT_DISPATCH_STRATEGIES = [null];
const YIELD_DISABLED = true;
const YIELD_BLOCK_BANNER = [
  "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
  "!!! WARNING: YIELD DISABLED FOR E2E TESTS NOW !!!",
  "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
].join("\n");

function warnYieldDisabled(detail) {
  if (!YIELD_DISABLED) return;
  console.warn(`${YIELD_BLOCK_BANNER}\n${detail}\n`);
}

const loadTrafficCatalog = () => {
  try {
    if (TrafficStrategies && typeof TrafficStrategies.list === "function") {
      const list = TrafficStrategies.list();
      if (Array.isArray(list) && list.length) return list;
    }
  } catch (_err) {
    // ignore and fallback
  }
  return [];
};

const loadAlgorithmCatalog = () => {
  return AlgorithmsModule || null;
};

const TRAFFIC_CATALOG = loadTrafficCatalog();
const TRAFFIC_CATALOG_BY_NAME = new Map(
  (TRAFFIC_CATALOG || []).map((entry) => [entry.name, entry])
);
const ALL_TRAFFIC_STRATEGIES = TRAFFIC_CATALOG.length
  ? TRAFFIC_CATALOG.map((entry) => entry.name)
  : DEFAULT_TRAFFIC_STRATEGIES.slice();

const Algorithms = loadAlgorithmCatalog();
const DISPATCH_STRATEGIES = Algorithms?.listDispatchStrategies
  ? Algorithms.listDispatchStrategies().map((entry) => entry.name)
  : Array.isArray(Algorithms?.DISPATCH_STRATEGIES)
    ? Algorithms.DISPATCH_STRATEGIES.map((entry) => entry.name)
    : ["nearest", "first"];
const ROUTE_PLANNER_MODES = Array.isArray(Algorithms?.ROUTE_PLANNER_MODES)
  ? Algorithms.ROUTE_PLANNER_MODES.map((entry) => entry.name)
  : ["spatial", "time-expanded", "global"];
const RESERVATION_MODES = Array.isArray(Algorithms?.RESERVATION_MODES)
  ? Algorithms.RESERVATION_MODES.map((entry) => entry.name)
  : ["none", "time", "segment"];
const AVOIDANCE_MODES = Array.isArray(Algorithms?.AVOIDANCE_MODES)
  ? Algorithms.AVOIDANCE_MODES.map((entry) => entry.name)
  : ["none", "zones", "locks"];
const CONFLICT_SEARCH_MODES = ["none", "local", "full", "global"];
const TAXONOMY = Algorithms?.ALGORITHM_TAXONOMY || null;

const resolveTaxonomyList = (group, axis, fallback) => {
  const list = TAXONOMY?.[group]?.[axis];
  if (Array.isArray(list) && list.length) {
    return list.map((item) => item.name);
  }
  return fallback || [];
};

const ROUTE_SEARCH_SPACES = resolveTaxonomyList("routePlanner", "searchSpace", ROUTE_PLANNER_MODES);
const ROUTE_TIME_MODELS = resolveTaxonomyList("routePlanner", "timeModel", [
  "static",
  "time",
  "reservation-aware"
]);
const ROUTE_OPTIMALITY_MODES = resolveTaxonomyList("routePlanner", "optimality", [
  "heuristic",
  "bounded",
  "optimal"
]);
const ROUTE_KINEMATICS = resolveTaxonomyList("routePlanner", "kinematics", [
  "point",
  "differential",
  "kinodynamic"
]);
const ROUTE_REPLAN_MODES = resolveTaxonomyList("routePlanner", "replan", [
  "static",
  "periodic",
  "event",
  "hybrid"
]);

const RESERVATION_GRANULARITY = resolveTaxonomyList("reservation", "granularity", [
  "none",
  "time",
  "segment",
  "area"
]);
const RESERVATION_LOCKING = resolveTaxonomyList("reservation", "locking", [
  "none",
  "optimistic",
  "pessimistic"
]);
const RESERVATION_SCOPE = resolveTaxonomyList("reservation", "scope", [
  "none",
  "local",
  "corridor",
  "global"
]);
const RESERVATION_RELEASE = resolveTaxonomyList("reservation", "release", [
  "none",
  "immediate",
  "trailing",
  "window"
]);

const AVOIDANCE_MECHANISMS = resolveTaxonomyList("avoidance", "mechanism", [
  "none",
  "zones",
  "locks",
  "detours"
]);
const AVOIDANCE_RESPONSES = resolveTaxonomyList("avoidance", "response", [
  "none",
  "stop",
  "yield",
  "detour"
]);
const AVOIDANCE_SCOPES = resolveTaxonomyList("avoidance", "scope", [
  "none",
  "local",
  "corridor",
  "global"
]);
const AVOIDANCE_CLEARANCES = resolveTaxonomyList("avoidance", "clearance", [
  "none",
  "fixed",
  "dynamic"
]);

const CONFLICT_RESOLUTION_MODES = resolveTaxonomyList("conflict", "resolution", [
  "none",
  "priority",
  "negotiation",
  "backtracking",
  "replanning"
]);

const EXEC_CONTROL_MODES = resolveTaxonomyList("execution", "control", [
  "stop-and-go",
  "velocity",
  "kinodynamic"
]);
const EXEC_SPEED_PROFILE_MODES = resolveTaxonomyList("execution", "speedProfile", [
  "trapezoidal",
  "s-curve"
]);
const EXEC_TRACKING_MODES = resolveTaxonomyList("execution", "tracking", [
  "open-loop",
  "feedback"
]);

const PREFERRED_STRATEGY_ORDER = [
  "simple",
  "pulse-mapf",
  "pulse-mapf-avoid",
  "pulse-mapf-time",
  "sipp",
  "sipp-kinodynamic",
  "sipp-robust",
  "ecbs-sipp",
  "cbs-sipp",
  "cbs-full",
  "mapf-global",
  "mapf-pibt",
  "mapf-mstar",
  "mapf-smt"
];

const TIER_PRESETS = {
  smoke: {
    strategyMode: "balanced-min",
    yieldModes: ["no-yield"],
    segmentLengths: [null],
    ignoreTrafficModes: [false],
    dispatchStrategies: ["nearest"]
  },
  standard: {
    strategyMode: "balanced",
    yieldModes: ["no-yield", "yield"],
    segmentLengths: [null, 3],
    ignoreTrafficModes: [false],
    dispatchStrategies: ["nearest", "first"]
  },
  full: {
    strategyMode: "all",
    yieldModes: ["no-yield", "yield"],
    segmentLengths: [null, 3],
    ignoreTrafficModes: [false],
    dispatchStrategies: DISPATCH_STRATEGIES
  },
  stress: {
    strategyMode: "stress",
    yieldModes: ["yield"],
    segmentLengths: [3, 6],
    ignoreTrafficModes: [false],
    dispatchStrategies: ["nearest"]
  }
};

const parseCsv = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const resolveList = (raw, allowed, fallback) => {
  const parsed = parseCsv(raw);
  if (!parsed.length) return fallback;
  if (parsed.length === 1 && (parsed[0] === "*" || parsed[0].toLowerCase() === "all")) {
    return allowed.slice();
  }
  const filtered = parsed.filter((item) => allowed.includes(item));
  return filtered.length ? filtered : fallback;
};

const parseCapabilityFilters = (raw) =>
  parseCsv(raw).map((token) => {
    const trimmed = String(token).trim();
    const negated = trimmed.startsWith("!");
    const name = (negated ? trimmed.slice(1) : trimmed).trim();
    return name ? { name, negated } : null;
  }).filter(Boolean);

const resolveCategoryFilter = (raw, allowed) => {
  const parsed = parseCsv(raw);
  if (!parsed.length) return [];
  if (parsed.length === 1 && (parsed[0] === "*" || parsed[0].toLowerCase() === "all")) {
    return allowed.slice();
  }
  return parsed.filter((item) => allowed.includes(item));
};

const resolveDimensionFilter = (raw, allowed) => {
  const parsed = parseCsv(raw);
  if (!parsed.length) return [];
  if (parsed.length === 1 && (parsed[0] === "*" || parsed[0].toLowerCase() === "all")) {
    return Array.isArray(allowed) && allowed.length ? allowed.slice() : parsed;
  }
  if (!Array.isArray(allowed) || !allowed.length) return parsed;
  return parsed.filter((item) => allowed.includes(item));
};

const filterCatalogByCapabilities = (catalog, filters) => {
  if (!filters.length) return catalog;
  return catalog.filter((entry) =>
    filters.every((filter) => {
      const value = Boolean(entry.capabilities?.[filter.name]);
      return filter.negated ? !value : value;
    })
  );
};

const filterCatalogByCategory = (catalog, key, values) => {
  if (!values.length) return catalog;
  return catalog.filter((entry) => values.includes(entry.categories?.[key]));
};

const filterCatalogByDimension = (catalog, path, values) => {
  if (!values.length) return catalog;
  return catalog.filter((entry) => {
    const dimensions = entry?.dimensions || null;
    const value = (path || []).reduce((acc, key) => (acc ? acc[key] : null), dimensions);
    return values.includes(value);
  });
};

const buildTrafficCatalog = (options = {}) => {
  let catalog = TRAFFIC_CATALOG.length
    ? TRAFFIC_CATALOG.slice()
    : DEFAULT_TRAFFIC_STRATEGIES.map((name) => ({ name, capabilities: null, categories: null }));
  const capabilityFilters =
    Array.isArray(options.capabilities) && options.capabilities.length
      ? options.capabilities
      : parseCapabilityFilters(
          options.capabilitiesRaw ||
            process.env.E2E_TRAFFIC_CAPS ||
            process.env.E2E_TRAFFIC_CAPABILITIES ||
            process.env.TRAFFIC_CAPS
        );
  const routePlanners = Array.isArray(options.routePlanners)
    ? options.routePlanners
    : resolveCategoryFilter(
        options.routePlannersRaw ||
          process.env.E2E_TRAFFIC_ROUTE_PLANNERS ||
          process.env.E2E_ROUTE_PLANNERS,
        ROUTE_PLANNER_MODES
      );
  const reservationModes = Array.isArray(options.reservationModes)
    ? options.reservationModes
    : resolveCategoryFilter(
        options.reservationModesRaw ||
          process.env.E2E_TRAFFIC_RESERVATION_MODES ||
          process.env.E2E_RESERVATION_MODES,
        RESERVATION_MODES
      );
  const avoidanceModes = Array.isArray(options.avoidanceModes)
    ? options.avoidanceModes
    : resolveCategoryFilter(
        options.avoidanceModesRaw ||
          process.env.E2E_TRAFFIC_AVOIDANCE_MODES ||
          process.env.E2E_AVOIDANCE_MODES,
        AVOIDANCE_MODES
      );
  const routeSearchSpaces = Array.isArray(options.routeSearchSpaces)
    ? options.routeSearchSpaces
    : resolveDimensionFilter(
        options.routeSearchSpacesRaw ||
          process.env.E2E_TRAFFIC_DIM_ROUTE_SEARCH ||
          process.env.E2E_TRAFFIC_ROUTE_SEARCH_SPACES,
        ROUTE_SEARCH_SPACES
      );
  const routeTimeModels = Array.isArray(options.routeTimeModels)
    ? options.routeTimeModels
    : resolveDimensionFilter(
        options.routeTimeModelsRaw ||
          process.env.E2E_TRAFFIC_DIM_ROUTE_TIME_MODEL ||
          process.env.E2E_TRAFFIC_ROUTE_TIME_MODELS,
        ROUTE_TIME_MODELS
      );
  const routeOptimality = Array.isArray(options.routeOptimality)
    ? options.routeOptimality
    : resolveDimensionFilter(
        options.routeOptimalityRaw ||
          process.env.E2E_TRAFFIC_DIM_ROUTE_OPTIMALITY ||
          process.env.E2E_TRAFFIC_ROUTE_OPTIMALITY,
        ROUTE_OPTIMALITY_MODES
      );
  const routeKinematics = Array.isArray(options.routeKinematics)
    ? options.routeKinematics
    : resolveDimensionFilter(
        options.routeKinematicsRaw ||
          process.env.E2E_TRAFFIC_DIM_ROUTE_KINEMATICS ||
          process.env.E2E_TRAFFIC_ROUTE_KINEMATICS,
        ROUTE_KINEMATICS
      );
  const routeReplanModes = Array.isArray(options.routeReplanModes)
    ? options.routeReplanModes
    : resolveDimensionFilter(
        options.routeReplanModesRaw ||
          process.env.E2E_TRAFFIC_DIM_ROUTE_REPLAN ||
          process.env.E2E_TRAFFIC_ROUTE_REPLAN,
        ROUTE_REPLAN_MODES
      );
  const reservationGranularity = Array.isArray(options.reservationGranularity)
    ? options.reservationGranularity
    : resolveDimensionFilter(
        options.reservationGranularityRaw ||
          process.env.E2E_TRAFFIC_DIM_RESERVATION_GRANULARITY ||
          process.env.E2E_TRAFFIC_RESERVATION_GRANULARITY,
        RESERVATION_GRANULARITY
      );
  const reservationLocking = Array.isArray(options.reservationLocking)
    ? options.reservationLocking
    : resolveDimensionFilter(
        options.reservationLockingRaw ||
          process.env.E2E_TRAFFIC_DIM_RESERVATION_LOCKING ||
          process.env.E2E_TRAFFIC_RESERVATION_LOCKING,
        RESERVATION_LOCKING
      );
  const reservationScope = Array.isArray(options.reservationScope)
    ? options.reservationScope
    : resolveDimensionFilter(
        options.reservationScopeRaw ||
          process.env.E2E_TRAFFIC_DIM_RESERVATION_SCOPE ||
          process.env.E2E_TRAFFIC_RESERVATION_SCOPE,
        RESERVATION_SCOPE
      );
  const reservationRelease = Array.isArray(options.reservationRelease)
    ? options.reservationRelease
    : resolveDimensionFilter(
        options.reservationReleaseRaw ||
          process.env.E2E_TRAFFIC_DIM_RESERVATION_RELEASE ||
          process.env.E2E_TRAFFIC_RESERVATION_RELEASE,
        RESERVATION_RELEASE
      );
  const avoidanceMechanisms = Array.isArray(options.avoidanceMechanisms)
    ? options.avoidanceMechanisms
    : resolveDimensionFilter(
        options.avoidanceMechanismsRaw ||
          process.env.E2E_TRAFFIC_DIM_AVOIDANCE_MECHANISM ||
          process.env.E2E_TRAFFIC_AVOIDANCE_MECHANISM,
        AVOIDANCE_MECHANISMS
      );
  const avoidanceResponses = Array.isArray(options.avoidanceResponses)
    ? options.avoidanceResponses
    : resolveDimensionFilter(
        options.avoidanceResponsesRaw ||
          process.env.E2E_TRAFFIC_DIM_AVOIDANCE_RESPONSE ||
          process.env.E2E_TRAFFIC_AVOIDANCE_RESPONSE,
        AVOIDANCE_RESPONSES
      );
  const avoidanceScopes = Array.isArray(options.avoidanceScopes)
    ? options.avoidanceScopes
    : resolveDimensionFilter(
        options.avoidanceScopesRaw ||
          process.env.E2E_TRAFFIC_DIM_AVOIDANCE_SCOPE ||
          process.env.E2E_TRAFFIC_AVOIDANCE_SCOPE,
        AVOIDANCE_SCOPES
      );
  const avoidanceClearances = Array.isArray(options.avoidanceClearances)
    ? options.avoidanceClearances
    : resolveDimensionFilter(
        options.avoidanceClearancesRaw ||
          process.env.E2E_TRAFFIC_DIM_AVOIDANCE_CLEARANCE ||
          process.env.E2E_TRAFFIC_AVOIDANCE_CLEARANCE,
        AVOIDANCE_CLEARANCES
      );
  const conflictSearchModes = Array.isArray(options.conflictSearchModes)
    ? options.conflictSearchModes
    : resolveDimensionFilter(
        options.conflictSearchModesRaw ||
          process.env.E2E_TRAFFIC_DIM_CONFLICT_SEARCH ||
          process.env.E2E_TRAFFIC_CONFLICT_SEARCH,
        CONFLICT_SEARCH_MODES
      );
  const conflictResolutionModes = Array.isArray(options.conflictResolutionModes)
    ? options.conflictResolutionModes
    : resolveDimensionFilter(
        options.conflictResolutionModesRaw ||
          process.env.E2E_TRAFFIC_DIM_CONFLICT_RESOLUTION ||
          process.env.E2E_TRAFFIC_CONFLICT_RESOLUTION,
        CONFLICT_RESOLUTION_MODES
      );
  const execControlModes = Array.isArray(options.execControlModes)
    ? options.execControlModes
    : resolveDimensionFilter(
        options.execControlModesRaw ||
          process.env.E2E_TRAFFIC_DIM_EXEC_CONTROL ||
          process.env.E2E_TRAFFIC_EXEC_CONTROL,
        EXEC_CONTROL_MODES
      );
  const execSpeedProfileModes = Array.isArray(options.execSpeedProfileModes)
    ? options.execSpeedProfileModes
    : resolveDimensionFilter(
        options.execSpeedProfileModesRaw ||
          process.env.E2E_TRAFFIC_DIM_EXEC_SPEED_PROFILE ||
          process.env.E2E_TRAFFIC_EXEC_SPEED_PROFILE,
        EXEC_SPEED_PROFILE_MODES
      );
  const execTrackingModes = Array.isArray(options.execTrackingModes)
    ? options.execTrackingModes
    : resolveDimensionFilter(
        options.execTrackingModesRaw ||
          process.env.E2E_TRAFFIC_DIM_EXEC_TRACKING ||
          process.env.E2E_TRAFFIC_EXEC_TRACKING,
        EXEC_TRACKING_MODES
      );
  if (capabilityFilters.length) {
    catalog = filterCatalogByCapabilities(catalog, capabilityFilters);
  }
  if (routePlanners.length) {
    catalog = filterCatalogByCategory(catalog, "routePlanner", routePlanners);
  }
  if (reservationModes.length) {
    catalog = filterCatalogByCategory(catalog, "reservation", reservationModes);
  }
  if (avoidanceModes.length) {
    catalog = filterCatalogByCategory(catalog, "avoidance", avoidanceModes);
  }
  if (routeSearchSpaces.length) {
    catalog = filterCatalogByDimension(catalog, ["routePlanner", "searchSpace"], routeSearchSpaces);
  }
  if (routeTimeModels.length) {
    catalog = filterCatalogByDimension(catalog, ["routePlanner", "timeModel"], routeTimeModels);
  }
  if (routeOptimality.length) {
    catalog = filterCatalogByDimension(catalog, ["routePlanner", "optimality"], routeOptimality);
  }
  if (routeKinematics.length) {
    catalog = filterCatalogByDimension(catalog, ["routePlanner", "kinematics"], routeKinematics);
  }
  if (routeReplanModes.length) {
    catalog = filterCatalogByDimension(catalog, ["routePlanner", "replan"], routeReplanModes);
  }
  if (reservationGranularity.length) {
    catalog = filterCatalogByDimension(
      catalog,
      ["reservation", "granularity"],
      reservationGranularity
    );
  }
  if (reservationLocking.length) {
    catalog = filterCatalogByDimension(catalog, ["reservation", "locking"], reservationLocking);
  }
  if (reservationScope.length) {
    catalog = filterCatalogByDimension(catalog, ["reservation", "scope"], reservationScope);
  }
  if (reservationRelease.length) {
    catalog = filterCatalogByDimension(catalog, ["reservation", "release"], reservationRelease);
  }
  if (avoidanceMechanisms.length) {
    catalog = filterCatalogByDimension(catalog, ["avoidance", "mechanism"], avoidanceMechanisms);
  }
  if (avoidanceResponses.length) {
    catalog = filterCatalogByDimension(catalog, ["avoidance", "response"], avoidanceResponses);
  }
  if (avoidanceScopes.length) {
    catalog = filterCatalogByDimension(catalog, ["avoidance", "scope"], avoidanceScopes);
  }
  if (avoidanceClearances.length) {
    catalog = filterCatalogByDimension(catalog, ["avoidance", "clearance"], avoidanceClearances);
  }
  if (conflictSearchModes.length) {
    catalog = filterCatalogByDimension(catalog, ["conflict", "search"], conflictSearchModes);
  }
  if (conflictResolutionModes.length) {
    catalog = filterCatalogByDimension(
      catalog,
      ["conflict", "resolution"],
      conflictResolutionModes
    );
  }
  if (execControlModes.length) {
    catalog = filterCatalogByDimension(catalog, ["execution", "control"], execControlModes);
  }
  if (execSpeedProfileModes.length) {
    catalog = filterCatalogByDimension(
      catalog,
      ["execution", "speedProfile"],
      execSpeedProfileModes
    );
  }
  if (execTrackingModes.length) {
    catalog = filterCatalogByDimension(catalog, ["execution", "tracking"], execTrackingModes);
  }
  return catalog;
};

const resolveTierName = (raw) => {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(TIER_PRESETS, key) ? key : null;
};

const resolveOrderedCatalog = (catalog) => {
  if (!catalog.length) return catalog;
  const byName = new Map(catalog.map((entry) => [entry.name, entry]));
  const ordered = PREFERRED_STRATEGY_ORDER.map((name) => byName.get(name)).filter(Boolean);
  const remaining = catalog.filter((entry) => !byName.has(entry.name) || !ordered.includes(entry));
  return [...ordered, ...remaining];
};

const pickBalancedStrategies = (catalog, categories) => {
  if (!catalog.length || !catalog.some((entry) => entry.categories)) {
    return DEFAULT_TRAFFIC_STRATEGIES.slice();
  }
  const ordered = resolveOrderedCatalog(catalog);
  const picks = new Map();
  const add = (entry) => {
    if (!entry || !entry.name) return;
    if (!picks.has(entry.name)) {
      picks.set(entry.name, entry);
    }
  };
  const categoryMap = {
    routePlanner: ROUTE_PLANNER_MODES,
    reservation: RESERVATION_MODES,
    avoidance: AVOIDANCE_MODES,
    conflictSearch: CONFLICT_SEARCH_MODES
  };
  (categories || Object.keys(categoryMap)).forEach((category) => {
    const values = categoryMap[category] || [];
    values.forEach((value) => {
      const match = ordered.find((entry) => entry.categories?.[category] === value);
      add(match);
    });
  });
  if (!picks.size) {
    ordered.slice(0, 3).forEach((entry) => add(entry));
  }
  return Array.from(picks.keys());
};

const pickStressStrategies = (catalog) => {
  if (!catalog.length || !catalog.some((entry) => entry.capabilities)) {
    return DEFAULT_TRAFFIC_STRATEGIES.slice();
  }
  const filtered = catalog.filter((entry) => {
    const caps = entry.capabilities || {};
    return (
      caps.globalConflictSearch ||
      caps.fullConflictSearch ||
      caps.conflictSearch ||
      caps.segmentReservations
    );
  });
  if (!filtered.length) return DEFAULT_TRAFFIC_STRATEGIES.slice();
  return filtered.map((entry) => entry.name);
};

const resolveTierConfig = (tierName) => {
  const key = resolveTierName(tierName) || "standard";
  const preset = TIER_PRESETS[key];
  const catalog = buildTrafficCatalog();
  let strategies = ALL_TRAFFIC_STRATEGIES.slice();
  if (preset.strategyMode === "balanced-min") {
    strategies = pickBalancedStrategies(catalog, ["routePlanner", "reservation"]);
  } else if (preset.strategyMode === "balanced") {
    strategies = pickBalancedStrategies(catalog, [
      "routePlanner",
      "reservation",
      "avoidance",
      "conflictSearch"
    ]);
  } else if (preset.strategyMode === "stress") {
    strategies = pickStressStrategies(catalog);
  }
  return {
    tier: key,
    strategies,
    yieldModes: preset.yieldModes,
    segmentLengths: preset.segmentLengths,
    ignoreTrafficModes: preset.ignoreTrafficModes,
    dispatchStrategies: preset.dispatchStrategies
  };
};

const resolveTrafficStrategies = (raw, fallback = ALL_TRAFFIC_STRATEGIES, options = {}) => {
  const catalog = buildTrafficCatalog(options);
  const allowed = catalog.map((entry) => entry.name);
  const fallbackList = Array.isArray(fallback) ? fallback : allowed;
  const filteredFallback = fallbackList.filter((name) => allowed.includes(name));
  const finalFallback = filteredFallback.length ? filteredFallback : allowed;
  return resolveList(raw, allowed, finalFallback);
};

const resolveYieldModes = (raw, fallback = DEFAULT_YIELD_MODES) => {
  const modes = resolveList(raw, ["yield", "no-yield"], fallback);
  if (!YIELD_DISABLED) return modes;
  if (modes.includes("yield")) {
    warnYieldDisabled("Ignoring yield mode; yield disabled for tests.");
  }
  const filtered = modes.filter((mode) => mode === "no-yield");
  return filtered.length ? filtered : ["no-yield"];
};

const resolveSegmentLengths = (raw, fallback = DEFAULT_SEGMENT_LENGTHS) => {
  const parsed = parseCsv(raw);
  if (!parsed.length) return fallback;
  const values = parsed
    .map((item) => Number(item))
    .filter((value) => Number.isFinite(value) && value > 0);
  return values.length ? values : fallback;
};

const resolveIgnoreTrafficModes = (raw, fallback = DEFAULT_IGNORE_TRAFFIC) => {
  const parsed = parseCsv(raw);
  if (!parsed.length) return fallback;
  const values = parsed.map((item) => {
    const normalized = String(item).toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
    return null;
  }).filter((value) => value !== null);
  return values.length ? values : fallback;
};

const resolveDispatchStrategies = (raw, fallback = DEFAULT_DISPATCH_STRATEGIES) =>
  resolveList(raw, DISPATCH_STRATEGIES, fallback);

const buildTrafficScenarios = ({
  strategies,
  yieldModes,
  segmentLengths,
  ignoreTrafficModes,
  dispatchStrategies
} = {}) => {
  const pickedStrategies = Array.isArray(strategies) && strategies.length
    ? strategies
    : ALL_TRAFFIC_STRATEGIES;
  const pickedYieldModes = Array.isArray(yieldModes) && yieldModes.length
    ? yieldModes
    : DEFAULT_YIELD_MODES;
  const pickedSegmentLengths = Array.isArray(segmentLengths) && segmentLengths.length
    ? segmentLengths
    : DEFAULT_SEGMENT_LENGTHS;
  const pickedIgnoreTraffic = Array.isArray(ignoreTrafficModes) && ignoreTrafficModes.length
    ? ignoreTrafficModes
    : DEFAULT_IGNORE_TRAFFIC;
  const pickedDispatch = Array.isArray(dispatchStrategies) && dispatchStrategies.length
    ? dispatchStrategies
    : DEFAULT_DISPATCH_STRATEGIES;
  const scenarios = [];
  pickedStrategies.forEach((strategy) => {
    pickedYieldModes.forEach((yieldMode) => {
      pickedSegmentLengths.forEach((segmentLength) => {
        pickedIgnoreTraffic.forEach((ignoreTraffic) => {
          pickedDispatch.forEach((dispatchStrategy) => {
            const meta = TRAFFIC_CATALOG_BY_NAME.get(strategy) || null;
            const labelParts = [strategy, yieldMode];
            if (Number.isFinite(segmentLength)) {
              labelParts.push(`seg${segmentLength}`);
            }
            if (ignoreTraffic) {
              labelParts.push("ignore-traffic");
            }
            if (dispatchStrategy) {
              labelParts.push(`dispatch:${dispatchStrategy}`);
            }
            scenarios.push({
              label: labelParts.join("/"),
              strategy,
              yieldRecovery: yieldMode === "yield",
              segmentLength: Number.isFinite(segmentLength) ? segmentLength : null,
              ignoreTraffic: Boolean(ignoreTraffic),
              dispatchStrategy: dispatchStrategy || null,
              capabilities: meta?.capabilities || null,
              categories: meta?.categories || null
            });
          });
        });
      });
    });
  });
  return scenarios;
};

module.exports = {
  ALL_TRAFFIC_STRATEGIES,
  DISPATCH_STRATEGIES,
  ROUTE_PLANNER_MODES,
  RESERVATION_MODES,
  AVOIDANCE_MODES,
  CONFLICT_SEARCH_MODES,
  ROUTE_SEARCH_SPACES,
  ROUTE_TIME_MODELS,
  ROUTE_OPTIMALITY_MODES,
  ROUTE_KINEMATICS,
  ROUTE_REPLAN_MODES,
  RESERVATION_GRANULARITY,
  RESERVATION_LOCKING,
  RESERVATION_SCOPE,
  RESERVATION_RELEASE,
  AVOIDANCE_MECHANISMS,
  AVOIDANCE_RESPONSES,
  AVOIDANCE_SCOPES,
  AVOIDANCE_CLEARANCES,
  CONFLICT_RESOLUTION_MODES,
  EXEC_CONTROL_MODES,
  EXEC_SPEED_PROFILE_MODES,
  EXEC_TRACKING_MODES,
  TIER_PRESETS,
  TRAFFIC_CATALOG,
  resolveTrafficStrategies,
  resolveYieldModes,
  resolveSegmentLengths,
  resolveIgnoreTrafficModes,
  resolveDispatchStrategies,
  buildTrafficCatalog,
  buildTrafficScenarios,
  resolveTierConfig
};
