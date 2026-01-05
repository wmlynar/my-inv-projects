const DISPATCH_OBJECTIVES = [
  { name: "distance", label: "Min distance" },
  { name: "fifo", label: "FIFO" },
  { name: "priority", label: "Priority" },
  { name: "utilization", label: "Max utilization" },
  { name: "energy", label: "Min energy" }
];

const DISPATCH_ASSIGNMENT_MODES = [
  { name: "greedy", label: "Greedy" },
  { name: "batch", label: "Batch optimization" },
  { name: "auction", label: "Auction/market" },
  { name: "global", label: "Global optimization" }
];

const DISPATCH_FAIRNESS_MODES = [
  { name: "fifo", label: "FIFO" },
  { name: "round-robin", label: "Round robin" },
  { name: "priority", label: "Priority weighted" },
  { name: "opportunistic", label: "Opportunistic" }
];

const DISPATCH_PREEMPTION_MODES = [
  { name: "none", label: "No preemption" },
  { name: "soft", label: "Soft preemption" },
  { name: "hard", label: "Hard preemption" }
];

const DISPATCH_BATCHING_MODES = [
  { name: "single", label: "Single task" },
  { name: "windowed", label: "Windowed batch" },
  { name: "global", label: "Global batch" }
];

const DISPATCH_REPLAN_MODES = [
  { name: "static", label: "Static assignment" },
  { name: "periodic", label: "Periodic replanning" },
  { name: "event", label: "Event-driven replanning" },
  { name: "hybrid", label: "Hybrid replanning" }
];

const DISPATCH_SCOPE_MODES = [
  { name: "single-task", label: "Single task scope" },
  { name: "multi-task", label: "Multi task scope" }
];

const DISPATCH_STRATEGIES = [
  {
    name: "nearest",
    category: "distance",
    label: "Nearest robot",
    dimensions: {
      objective: "distance",
      assignment: "greedy",
      fairness: "opportunistic",
      preemption: "none",
      batching: "single",
      replan: "event",
      scope: "single-task"
    }
  },
  {
    name: "first",
    category: "fifo",
    label: "First available",
    dimensions: {
      objective: "fifo",
      assignment: "greedy",
      fairness: "fifo",
      preemption: "none",
      batching: "single",
      replan: "event",
      scope: "single-task"
    }
  }
];

const ROUTE_PLANNER_SEARCH_SPACES = [
  { name: "spatial", label: "Spatial graph" },
  { name: "time-expanded", label: "Time-expanded graph" },
  { name: "global", label: "Global MAPF" }
];

const ROUTE_PLANNER_TIME_MODELS = [
  { name: "static", label: "Static time" },
  { name: "time", label: "Time-expanded" },
  { name: "reservation-aware", label: "Reservation-aware" }
];

const ROUTE_PLANNER_OPTIMALITY_MODES = [
  { name: "heuristic", label: "Heuristic" },
  { name: "bounded", label: "Bounded suboptimal" },
  { name: "optimal", label: "Optimal" }
];

const ROUTE_PLANNER_KINEMATICS = [
  { name: "point", label: "Point robot" },
  { name: "differential", label: "Differential drive" },
  { name: "kinodynamic", label: "Kinodynamic" }
];

const ROUTE_PLANNER_REPLAN_MODES = [
  { name: "static", label: "Static plan" },
  { name: "periodic", label: "Periodic replanning" },
  { name: "event", label: "Event-driven replanning" },
  { name: "hybrid", label: "Hybrid replanning" }
];

const ROUTE_PLANNER_MODES = [
  {
    name: "spatial",
    label: "Spatial planner",
    dimensions: {
      searchSpace: "spatial",
      timeModel: "static"
    }
  },
  {
    name: "time-expanded",
    label: "Time-expanded planner",
    dimensions: {
      searchSpace: "time-expanded",
      timeModel: "time"
    }
  },
  {
    name: "global",
    label: "Global MAPF planner",
    dimensions: {
      searchSpace: "global",
      timeModel: "time"
    }
  }
];

const RESERVATION_GRANULARITY_MODES = [
  { name: "none", label: "None" },
  { name: "time", label: "Time windows" },
  { name: "segment", label: "Segment" },
  { name: "area", label: "Area" }
];

const RESERVATION_LOCKING_MODES = [
  { name: "none", label: "None" },
  { name: "optimistic", label: "Optimistic" },
  { name: "pessimistic", label: "Pessimistic" }
];

const RESERVATION_SCOPE_MODES = [
  { name: "none", label: "None" },
  { name: "local", label: "Local" },
  { name: "corridor", label: "Corridor" },
  { name: "global", label: "Global" }
];

const RESERVATION_RELEASE_MODES = [
  { name: "none", label: "None" },
  { name: "immediate", label: "Immediate" },
  { name: "trailing", label: "Trailing" },
  { name: "window", label: "Windowed" }
];

const RESERVATION_MODES = [
  {
    name: "none",
    label: "No reservations",
    dimensions: {
      granularity: "none"
    }
  },
  {
    name: "time",
    label: "Time reservations",
    dimensions: {
      granularity: "time"
    }
  },
  {
    name: "segment",
    label: "Segment reservations",
    dimensions: {
      granularity: "segment"
    }
  }
];

const AVOIDANCE_MECHANISMS = [
  { name: "none", label: "None" },
  { name: "zones", label: "Avoidance zones" },
  { name: "locks", label: "Avoidance locks" },
  { name: "detours", label: "Detours" }
];

const AVOIDANCE_RESPONSE_MODES = [
  { name: "none", label: "None" },
  { name: "stop", label: "Stop" },
  { name: "yield", label: "Yield" },
  { name: "detour", label: "Detour" }
];

const AVOIDANCE_SCOPE_MODES = [
  { name: "none", label: "None" },
  { name: "local", label: "Local" },
  { name: "corridor", label: "Corridor" },
  { name: "global", label: "Global" }
];

const AVOIDANCE_CLEARANCE_MODES = [
  { name: "none", label: "None" },
  { name: "fixed", label: "Fixed clearance" },
  { name: "dynamic", label: "Dynamic clearance" }
];

const AVOIDANCE_MODES = [
  {
    name: "none",
    label: "No avoidance",
    dimensions: {
      mechanism: "none"
    }
  },
  {
    name: "zones",
    label: "Avoidance zones",
    dimensions: {
      mechanism: "zones"
    }
  },
  {
    name: "locks",
    label: "Avoidance locks",
    dimensions: {
      mechanism: "locks"
    }
  }
];

const CONFLICT_SEARCH_MODES = [
  { name: "none", label: "None" },
  { name: "local", label: "Local conflicts" },
  { name: "full", label: "Full conflicts" },
  { name: "global", label: "Global conflicts" }
];

const CONFLICT_RESOLUTION_MODES = [
  { name: "none", label: "None" },
  { name: "priority", label: "Priority based" },
  { name: "negotiation", label: "Negotiation" },
  { name: "backtracking", label: "Backtracking" },
  { name: "replanning", label: "Replanning" }
];

const CONTROL_MODES = [
  { name: "stop-and-go", label: "Stop and go" },
  { name: "velocity", label: "Velocity control" },
  { name: "kinodynamic", label: "Kinodynamic control" }
];

const SPEED_PROFILE_MODES = [
  { name: "trapezoidal", label: "Trapezoidal" },
  { name: "s-curve", label: "S-curve" }
];

const TRACKING_MODES = [
  { name: "open-loop", label: "Open loop" },
  { name: "feedback", label: "Feedback control" }
];

const ALGORITHM_TAXONOMY = {
  dispatch: {
    objective: DISPATCH_OBJECTIVES,
    assignment: DISPATCH_ASSIGNMENT_MODES,
    fairness: DISPATCH_FAIRNESS_MODES,
    preemption: DISPATCH_PREEMPTION_MODES,
    batching: DISPATCH_BATCHING_MODES,
    replan: DISPATCH_REPLAN_MODES,
    scope: DISPATCH_SCOPE_MODES
  },
  routePlanner: {
    searchSpace: ROUTE_PLANNER_SEARCH_SPACES,
    timeModel: ROUTE_PLANNER_TIME_MODELS,
    optimality: ROUTE_PLANNER_OPTIMALITY_MODES,
    kinematics: ROUTE_PLANNER_KINEMATICS,
    replan: ROUTE_PLANNER_REPLAN_MODES
  },
  reservation: {
    granularity: RESERVATION_GRANULARITY_MODES,
    locking: RESERVATION_LOCKING_MODES,
    scope: RESERVATION_SCOPE_MODES,
    release: RESERVATION_RELEASE_MODES
  },
  avoidance: {
    mechanism: AVOIDANCE_MECHANISMS,
    response: AVOIDANCE_RESPONSE_MODES,
    scope: AVOIDANCE_SCOPE_MODES,
    clearance: AVOIDANCE_CLEARANCE_MODES
  },
  conflict: {
    search: CONFLICT_SEARCH_MODES,
    resolution: CONFLICT_RESOLUTION_MODES
  },
  execution: {
    control: CONTROL_MODES,
    speedProfile: SPEED_PROFILE_MODES,
    tracking: TRACKING_MODES
  }
};

const listDispatchStrategies = () => DISPATCH_STRATEGIES.slice();
const listAlgorithmTaxonomy = () => JSON.parse(JSON.stringify(ALGORITHM_TAXONOMY));

module.exports = {
  DISPATCH_OBJECTIVES,
  DISPATCH_ASSIGNMENT_MODES,
  DISPATCH_FAIRNESS_MODES,
  DISPATCH_PREEMPTION_MODES,
  DISPATCH_BATCHING_MODES,
  DISPATCH_REPLAN_MODES,
  DISPATCH_SCOPE_MODES,
  DISPATCH_STRATEGIES,
  ROUTE_PLANNER_SEARCH_SPACES,
  ROUTE_PLANNER_TIME_MODELS,
  ROUTE_PLANNER_OPTIMALITY_MODES,
  ROUTE_PLANNER_KINEMATICS,
  ROUTE_PLANNER_REPLAN_MODES,
  ROUTE_PLANNER_MODES,
  RESERVATION_GRANULARITY_MODES,
  RESERVATION_LOCKING_MODES,
  RESERVATION_SCOPE_MODES,
  RESERVATION_RELEASE_MODES,
  RESERVATION_MODES,
  AVOIDANCE_MECHANISMS,
  AVOIDANCE_RESPONSE_MODES,
  AVOIDANCE_SCOPE_MODES,
  AVOIDANCE_CLEARANCE_MODES,
  AVOIDANCE_MODES,
  CONFLICT_SEARCH_MODES,
  CONFLICT_RESOLUTION_MODES,
  CONTROL_MODES,
  SPEED_PROFILE_MODES,
  TRACKING_MODES,
  ALGORITHM_TAXONOMY,
  listDispatchStrategies,
  listAlgorithmTaxonomy
};
