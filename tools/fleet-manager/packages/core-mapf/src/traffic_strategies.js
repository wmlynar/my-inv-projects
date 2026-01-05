(function factory(root) {
  const domainRoot = (root.FleetDomain = root.FleetDomain || {});
  const DEFAULT_ROBOT_MODEL = { head: 0.5, tail: 2, width: 1 };
  let RobustnessProfile = null;
  try {
    RobustnessProfile = require("@fleet-manager/core-scheduler");
  } catch (_err) {
    RobustnessProfile = domainRoot.Core?.RobustnessProfile || null;
  }

  const resolveRobustnessProfile =
    RobustnessProfile?.resolveRobustnessProfile || ((options = {}) => options.robustness || {});
  const applyReservationProfile =
    RobustnessProfile?.applyReservationProfile || ((options = {}) => options);
  const ROBUSTNESS_PROFILES = RobustnessProfile?.ROBUSTNESS_PROFILES || {};

  const normalizeRobotModel = (robot) => {
    const model = robot && typeof robot.model === "object" ? robot.model : null;
    if (!model) return null;
    const head = Number(model.head);
    const tail = Number(model.tail);
    const width = Number(model.width);
    if (!Number.isFinite(head) && !Number.isFinite(tail) && !Number.isFinite(width)) {
      return null;
    }
    return {
      head: Number.isFinite(head) && head > 0 ? head : DEFAULT_ROBOT_MODEL.head,
      tail: Number.isFinite(tail) && tail > 0 ? tail : DEFAULT_ROBOT_MODEL.tail,
      width: Number.isFinite(width) && width > 0 ? width : DEFAULT_ROBOT_MODEL.width
    };
  };

  const getRobotEnvelopeRadius = (robot) => {
    const model = normalizeRobotModel(robot);
    const direct = Number(robot?.radius);
    let envelope = null;
    if (model) {
      const length = Math.max(0, model.head + model.tail);
      const width = Math.max(0, model.width);
      const diag = Math.hypot(length, width);
      if (diag > 0) {
        envelope = diag * 0.5;
      }
    }
    if (Number.isFinite(direct) && direct > 0) {
      return envelope ? Math.max(envelope, direct) : direct;
    }
    return envelope;
  };

  class TrafficStrategy {
    constructor(options = {}) {
      this.options = { ...options };
      this.name = options.name || "simple";
    }

    getName() {
      return this.name;
    }

    getRobustnessProfile() {
      return resolveRobustnessProfile(this.options);
    }

    getDispatchingLength(_robot) {
      return null;
    }

    getReplanDistance(_robot) {
      return this.options.replanDistance || 0.8;
    }

    getReplanIntervalMs(_robot) {
      return this.options.replanIntervalMs || 1200;
    }

    useEdgeQueues() {
      return false;
    }

    useDeterministicEdgeLocks() {
      if (typeof this.options.deterministicEdgeLocks === "boolean") {
        return this.options.deterministicEdgeLocks;
      }
      if (typeof this.options.deterministicLocks === "boolean") {
        return this.options.deterministicLocks;
      }
      return null;
    }

    useNodeLocks() {
      return this.options.nodeLocks !== false;
    }

    useAvoidanceZones() {
      return false;
    }

    getAvoidanceBlockRadius(_robot) {
      return Number.isFinite(this.options.avoidanceBlockRadius)
        ? this.options.avoidanceBlockRadius
        : null;
    }

    getAvoidanceReleaseMargin() {
      return Number.isFinite(this.options.avoidanceReleaseMargin)
        ? this.options.avoidanceReleaseMargin
        : null;
    }

    getNodeLockRadius(_robot) {
      return this.options.nodeLockRadius || 0.6;
    }

    getNodeLockTtlMs() {
      return this.options.nodeLockTtlMs || 1500;
    }

    getNodeLockLookaheadM(robot) {
      const value =
        this.options.nodeLockLookaheadM ??
        this.options.nodeLockLookahead ??
        this.options.nodeLockLookaheadDistance ??
        null;
      const numeric = Number(value);
      if (Number.isFinite(numeric)) return numeric;
      const envelopeRadius = getRobotEnvelopeRadius(robot);
      if (Number.isFinite(envelopeRadius)) return envelopeRadius + 0.5;
      return 0.5;
    }

    getNodeLockLookbackM(robot) {
      const value =
        this.options.nodeLockLookbackM ??
        this.options.nodeLockLookback ??
        this.options.nodeLockLookbackDistance ??
        null;
      const numeric = Number(value);
      if (Number.isFinite(numeric)) return numeric;
      const envelopeRadius = getRobotEnvelopeRadius(robot);
      if (Number.isFinite(envelopeRadius)) return envelopeRadius + 0.5;
      return 0.5;
    }

    getSpacing(_robot, defaults) {
      return defaults;
    }

    getForwardStopDistance(_robot) {
      const value = Number(
        this.options.forwardStopDistanceM ??
        this.options.forwardStopDistance ??
        this.options.stopDistanceLookahead
      );
      return Number.isFinite(value) ? value : null;
    }

    getDeadlockTimeoutMs(_robot) {
      return Number.isFinite(this.options.deadlockTimeoutMs)
        ? this.options.deadlockTimeoutMs
        : null;
    }

    getYieldBackoffDistance(_robot) {
      return Number.isFinite(this.options.yieldBackoffDistance)
        ? this.options.yieldBackoffDistance
        : null;
    }

    getYieldCooldownMs(_robot) {
      return Number.isFinite(this.options.yieldCooldownMs)
        ? this.options.yieldCooldownMs
        : 2500;
    }

    getEdgeQueueTimeoutMs() {
      return Number.isFinite(this.options.edgeQueueTimeoutMs)
        ? this.options.edgeQueueTimeoutMs
        : null;
    }

    useTimeReservations() {
      return false;
    }

    getReservationHorizonMs(_robot) {
      return Number.isFinite(this.options.reservationHorizonMs)
        ? this.options.reservationHorizonMs
        : null;
    }

    getReservationStepMs(_robot) {
      return Number.isFinite(this.options.reservationStepMs)
        ? this.options.reservationStepMs
        : null;
    }

    getReservationSafetyMs(_robot) {
      return Number.isFinite(this.options.reservationSafetyMs)
        ? this.options.reservationSafetyMs
        : null;
    }

    getReservationNodeDwellMs(_robot) {
      return Number.isFinite(this.options.reservationNodeDwellMs)
        ? this.options.reservationNodeDwellMs
        : null;
    }

    useTurnTimeReservations() {
      return this.options.turnTimeReservations === true;
    }

    getScheduleSlackMs(_robot) {
      return Number.isFinite(this.options.scheduleSlackMs)
        ? this.options.scheduleSlackMs
        : null;
    }

    getScheduleSlackMinMs(_robot) {
      return Number.isFinite(this.options.scheduleSlackMinMs)
        ? this.options.scheduleSlackMinMs
        : null;
    }

    getScheduleSlackMaxMs(_robot) {
      return Number.isFinite(this.options.scheduleSlackMaxMs)
        ? this.options.scheduleSlackMaxMs
        : null;
    }

    getScheduleSlackEwmaAlpha(_robot) {
      return Number.isFinite(this.options.scheduleSlackEwmaAlpha)
        ? this.options.scheduleSlackEwmaAlpha
        : null;
    }

    getScheduleSlackPercentile(_robot) {
      return Number.isFinite(this.options.scheduleSlackPercentile)
        ? this.options.scheduleSlackPercentile
        : null;
    }

    getScheduleSlackSampleSize(_robot) {
      return Number.isFinite(this.options.scheduleSlackSampleSize)
        ? this.options.scheduleSlackSampleSize
        : null;
    }

    useAdaptiveScheduleSlack() {
      return this.options.adaptiveScheduleSlack === true;
    }

    useScheduleRepair() {
      return this.options.scheduleRepair === true;
    }

    useSegmentReservations() {
      return false;
    }

    getReservationSegmentLength(_robot) {
      return Number.isFinite(this.options.segmentLength) ? this.options.segmentLength : null;
    }

    useAvoidanceLocks() {
      return false;
    }

    getYieldBayNodes() {
      return Array.isArray(this.options.yieldBayNodes) ? this.options.yieldBayNodes : null;
    }

    useYieldRecovery() {
      return false;
    }

    useRecoveryMoves() {
      return false;
    }

    allowTurnaround() {
      return this.options.noTurnaround !== true;
    }

    allowBackwardDrive() {
      return this.options.noBackward !== true;
    }

    getExpandFactor(_robot) {
      return this.options.expandFactor || 1.2;
    }

    getPlannerWeight(_robot) {
      return Number.isFinite(this.options.plannerWeight) ? this.options.plannerWeight : 1;
    }

    useConflictSearch() {
      return false;
    }

    getConflictSearchDepth(_robot) {
      return Number.isFinite(this.options.conflictDepth)
        ? Math.max(0, Math.floor(this.options.conflictDepth))
        : 1;
    }

    getConflictWaitThresholdMs(_robot) {
      return Number.isFinite(this.options.conflictWaitThresholdMs)
        ? this.options.conflictWaitThresholdMs
        : 2500;
    }

    getConflictCooldownMs(_robot) {
      return Number.isFinite(this.options.conflictCooldownMs)
        ? this.options.conflictCooldownMs
        : 1200;
    }

    useFullConflictSearch() {
      return false;
    }

    useGlobalConflictSearch() {
      return false;
    }

    getGlobalSolverType() {
      return null;
    }
  }

  class PulseMapfStrategy extends TrafficStrategy {
    constructor(options = {}) {
      super({ ...options, name: options.name || "pulse-mapf" });
    }

    getDispatchingLength(_robot) {
      return this.options.dispatchingLength || 12;
    }

    getReplanDistance(_robot) {
      return this.options.replanDistance || 1.2;
    }

    getReplanIntervalMs(_robot) {
      return this.options.replanIntervalMs || 1200;
    }

    useEdgeQueues() {
      return this.options.edgeQueues !== false;
    }

    useNodeLocks() {
      return this.options.nodeLocks !== false;
    }

    getNodeLockRadius(robot) {
      const envelopeRadius = getRobotEnvelopeRadius(robot);
      if (Number.isFinite(envelopeRadius)) {
        return Math.max(envelopeRadius * 1.2, this.options.nodeLockRadius || 0.8);
      }
      return this.options.nodeLockRadius || 0.8;
    }

    getNodeLockTtlMs() {
      return this.options.nodeLockTtlMs || 2000;
    }

    getSpacing(robot, defaults) {
      const envelopeRadius = getRobotEnvelopeRadius(robot);
      const baseRadius = Number.isFinite(envelopeRadius)
        ? envelopeRadius
        : defaults.baseRadius || 0.6;
      let stop = Math.max(defaults.stop, baseRadius * 2 - 0.1);
      let yieldDist = Math.max(defaults.yield, stop + 0.6);
      if (robot?.turning && robot.turning > 0.6) {
        const factor = this.getExpandFactor(robot);
        stop *= factor;
        yieldDist *= factor;
      }
      return { stop, yield: yieldDist };
    }

    getDeadlockTimeoutMs(_robot) {
      return Number.isFinite(this.options.deadlockTimeoutMs)
        ? this.options.deadlockTimeoutMs
        : 3500;
    }

    getYieldBackoffDistance(_robot) {
      return Number.isFinite(this.options.yieldBackoffDistance)
        ? this.options.yieldBackoffDistance
        : 1.2;
    }

    getYieldCooldownMs(_robot) {
      return Number.isFinite(this.options.yieldCooldownMs)
        ? this.options.yieldCooldownMs
        : 2500;
    }

    getEdgeQueueTimeoutMs() {
      return Number.isFinite(this.options.edgeQueueTimeoutMs)
        ? this.options.edgeQueueTimeoutMs
        : 2000;
    }

    getYieldBayNodes() {
      return Array.isArray(this.options.yieldBayNodes) ? this.options.yieldBayNodes : null;
    }
  }

  class PulseMapfAvoidStrategy extends PulseMapfStrategy {
    constructor(options = {}) {
      super({ ...options, name: "pulse-mapf-avoid" });
    }

    useAvoidanceZones() {
      return this.options.avoidanceZones !== false;
    }

    getAvoidanceBlockRadius(robot) {
      if (Number.isFinite(this.options.avoidanceBlockRadius)) {
        return this.options.avoidanceBlockRadius;
      }
      const envelopeRadius = getRobotEnvelopeRadius(robot);
      if (Number.isFinite(envelopeRadius)) {
        return envelopeRadius * 2.2;
      }
      return null;
    }

    getAvoidanceReleaseMargin() {
      return Number.isFinite(this.options.avoidanceReleaseMargin)
        ? this.options.avoidanceReleaseMargin
        : 0.3;
    }
  }

  class PulseMapfTimeStrategy extends PulseMapfStrategy {
    constructor(options = {}) {
      super({ ...options, name: options.name || "pulse-mapf-time" });
    }

    useTimeReservations() {
      return this.options.timeReservations !== false;
    }

    getReservationHorizonMs(_robot) {
      return Number.isFinite(this.options.reservationHorizonMs)
        ? this.options.reservationHorizonMs
        : 8000;
    }

    getReservationStepMs(_robot) {
      return Number.isFinite(this.options.reservationStepMs)
        ? this.options.reservationStepMs
        : 200;
    }

    getReservationSafetyMs(_robot) {
      return Number.isFinite(this.options.reservationSafetyMs)
        ? this.options.reservationSafetyMs
        : 120;
    }

    getReservationNodeDwellMs(_robot) {
      return Number.isFinite(this.options.reservationNodeDwellMs)
        ? this.options.reservationNodeDwellMs
        : 300;
    }
  }

  class SippStrategy extends PulseMapfTimeStrategy {
    constructor(options = {}) {
      super({ ...options, name: options.name || "sipp" });
    }

    useSegmentReservations() {
      return this.options.segmentReservations !== false;
    }

    getReservationSegmentLength(_robot) {
      return Number.isFinite(this.options.segmentLength) ? this.options.segmentLength : null;
    }

    useAvoidanceLocks() {
      return this.options.avoidanceLocks !== false;
    }
  }

  class SippKinodynamicStrategy extends SippStrategy {
    constructor(options = {}) {
      super({ ...options, name: options.name || "sipp-kinodynamic" });
    }

    useTurnTimeReservations() {
      return this.options.turnTimeReservations !== false;
    }
  }

  class SippRobustStrategy extends SippStrategy {
    constructor(options = {}) {
      super({ ...options, name: options.name || "sipp-robust" });
    }

    getForwardStopDistance(robot) {
      const explicit = super.getForwardStopDistance(robot);
      if (Number.isFinite(explicit)) return explicit;
      return 1.0;
    }

    getScheduleSlackMs(_robot) {
      if (Number.isFinite(this.options.scheduleSlackMs)) {
        return this.options.scheduleSlackMs;
      }
      return 120;
    }

    useScheduleRepair() {
      return this.options.scheduleRepair !== false;
    }

    useYieldRecovery() {
      return false;
    }

    useRecoveryMoves() {
      return false;
    }
  }

  class EcbsSippStrategy extends SippStrategy {
    constructor(options = {}) {
      super({ ...options, name: options.name || "ecbs-sipp" });
    }

    getPlannerWeight(_robot) {
      if (Number.isFinite(this.options.plannerWeight)) {
        return this.options.plannerWeight;
      }
      return 1.2;
    }

    getReplanDistance(_robot) {
      return Number.isFinite(this.options.replanDistance) ? this.options.replanDistance : 2.0;
    }

    getReplanIntervalMs(_robot) {
      return Number.isFinite(this.options.replanIntervalMs) ? this.options.replanIntervalMs : 900;
    }

    getReservationHorizonMs(_robot) {
      return Number.isFinite(this.options.reservationHorizonMs)
        ? this.options.reservationHorizonMs
        : 12000;
    }

    getReservationStepMs(_robot) {
      return Number.isFinite(this.options.reservationStepMs)
        ? this.options.reservationStepMs
        : 250;
    }

    getReservationSafetyMs(_robot) {
      return Number.isFinite(this.options.reservationSafetyMs)
        ? this.options.reservationSafetyMs
        : 150;
    }

    getReservationNodeDwellMs(_robot) {
      return Number.isFinite(this.options.reservationNodeDwellMs)
        ? this.options.reservationNodeDwellMs
        : 400;
    }
  }

  class CbsSippStrategy extends SippStrategy {
    constructor(options = {}) {
      super({ ...options, name: options.name || "cbs-sipp" });
    }

    useConflictSearch() {
      return this.options.conflictSearch !== false;
    }

    getPlannerWeight(_robot) {
      if (Number.isFinite(this.options.plannerWeight)) {
        return this.options.plannerWeight;
      }
      return 1.0;
    }

    getConflictSearchDepth(_robot) {
      return Number.isFinite(this.options.conflictDepth)
        ? Math.max(1, Math.floor(this.options.conflictDepth))
        : 1;
    }

    getConflictWaitThresholdMs(_robot) {
      return Number.isFinite(this.options.conflictWaitThresholdMs)
        ? this.options.conflictWaitThresholdMs
        : 2200;
    }

    getReservationHorizonMs(_robot) {
      return Number.isFinite(this.options.reservationHorizonMs)
        ? this.options.reservationHorizonMs
        : 12000;
    }

    getReservationStepMs(_robot) {
      return Number.isFinite(this.options.reservationStepMs)
        ? this.options.reservationStepMs
        : 250;
    }

    getReservationSafetyMs(_robot) {
      return Number.isFinite(this.options.reservationSafetyMs)
        ? this.options.reservationSafetyMs
        : 150;
    }

    getReservationNodeDwellMs(_robot) {
      return Number.isFinite(this.options.reservationNodeDwellMs)
        ? this.options.reservationNodeDwellMs
        : 400;
    }
  }

  class CbsFullSippStrategy extends SippStrategy {
    constructor(options = {}) {
      super({ ...options, name: options.name || "cbs-full" });
    }

    useConflictSearch() {
      return this.options.conflictSearch !== false;
    }

    useFullConflictSearch() {
      return true;
    }

    getPlannerWeight(_robot) {
      if (Number.isFinite(this.options.plannerWeight)) {
        return this.options.plannerWeight;
      }
      return 1.0;
    }

    getConflictSearchDepth(_robot) {
      return Number.isFinite(this.options.conflictDepth)
        ? Math.max(1, Math.floor(this.options.conflictDepth))
        : 4;
    }

    getConflictWaitThresholdMs(_robot) {
      return Number.isFinite(this.options.conflictWaitThresholdMs)
        ? this.options.conflictWaitThresholdMs
        : 1800;
    }

    getConflictCooldownMs(_robot) {
      return Number.isFinite(this.options.conflictCooldownMs)
        ? this.options.conflictCooldownMs
        : 1500;
    }

    getReservationHorizonMs(_robot) {
      return Number.isFinite(this.options.reservationHorizonMs)
        ? this.options.reservationHorizonMs
        : 12000;
    }

    getReservationStepMs(_robot) {
      return Number.isFinite(this.options.reservationStepMs)
        ? this.options.reservationStepMs
        : 250;
    }

    getReservationSafetyMs(_robot) {
      return Number.isFinite(this.options.reservationSafetyMs)
        ? this.options.reservationSafetyMs
        : 150;
    }

    getReservationNodeDwellMs(_robot) {
      return Number.isFinite(this.options.reservationNodeDwellMs)
        ? this.options.reservationNodeDwellMs
        : 400;
    }
  }

  class MapfGlobalStrategy extends SippStrategy {
    constructor(options = {}) {
      super({ ...options, name: options.name || "mapf-global" });
    }

    useConflictSearch() {
      return this.options.conflictSearch !== false;
    }

    useGlobalConflictSearch() {
      return true;
    }

    getGlobalSolverType() {
      return "astar";
    }

    getPlannerWeight(_robot) {
      if (Number.isFinite(this.options.plannerWeight)) {
        return this.options.plannerWeight;
      }
      return 1.0;
    }

    getConflictSearchDepth(_robot) {
      return Number.isFinite(this.options.conflictDepth)
        ? Math.max(2, Math.floor(this.options.conflictDepth))
        : 4;
    }

    getConflictWaitThresholdMs(_robot) {
      return Number.isFinite(this.options.conflictWaitThresholdMs)
        ? this.options.conflictWaitThresholdMs
        : 1600;
    }

    getConflictCooldownMs(_robot) {
      return Number.isFinite(this.options.conflictCooldownMs)
        ? this.options.conflictCooldownMs
        : 1800;
    }

    getReservationHorizonMs(_robot) {
      return Number.isFinite(this.options.reservationHorizonMs)
        ? this.options.reservationHorizonMs
        : 12000;
    }

    getReservationStepMs(_robot) {
      return Number.isFinite(this.options.reservationStepMs)
        ? this.options.reservationStepMs
        : 200;
    }

    getReservationSafetyMs(_robot) {
      return Number.isFinite(this.options.reservationSafetyMs)
        ? this.options.reservationSafetyMs
        : 150;
    }

    getReservationNodeDwellMs(_robot) {
      return Number.isFinite(this.options.reservationNodeDwellMs)
        ? this.options.reservationNodeDwellMs
        : 400;
    }
  }

  class MapfPibtStrategy extends SippStrategy {
    constructor(options = {}) {
      super({ ...options, name: options.name || "mapf-pibt" });
    }

    useConflictSearch() {
      return this.options.conflictSearch !== false;
    }

    useGlobalConflictSearch() {
      return true;
    }

    getGlobalSolverType() {
      return "pibt";
    }

    getPlannerWeight(_robot) {
      if (Number.isFinite(this.options.plannerWeight)) {
        return this.options.plannerWeight;
      }
      return 1.0;
    }

    getConflictSearchDepth(_robot) {
      return Number.isFinite(this.options.conflictDepth)
        ? Math.max(2, Math.floor(this.options.conflictDepth))
        : 4;
    }

    getConflictWaitThresholdMs(_robot) {
      return Number.isFinite(this.options.conflictWaitThresholdMs)
        ? this.options.conflictWaitThresholdMs
        : 1600;
    }

    getConflictCooldownMs(_robot) {
      return Number.isFinite(this.options.conflictCooldownMs)
        ? this.options.conflictCooldownMs
        : 1800;
    }

    getReservationHorizonMs(_robot) {
      return Number.isFinite(this.options.reservationHorizonMs)
        ? this.options.reservationHorizonMs
        : 12000;
    }

    getReservationStepMs(_robot) {
      return Number.isFinite(this.options.reservationStepMs)
        ? this.options.reservationStepMs
        : 200;
    }

    getReservationSafetyMs(_robot) {
      return Number.isFinite(this.options.reservationSafetyMs)
        ? this.options.reservationSafetyMs
        : 150;
    }

    getReservationNodeDwellMs(_robot) {
      return Number.isFinite(this.options.reservationNodeDwellMs)
        ? this.options.reservationNodeDwellMs
        : 400;
    }
  }

  class MapfMStarStrategy extends SippStrategy {
    constructor(options = {}) {
      super({ ...options, name: options.name || "mapf-mstar" });
    }

    useConflictSearch() {
      return this.options.conflictSearch !== false;
    }

    useGlobalConflictSearch() {
      return true;
    }

    getGlobalSolverType() {
      return "mstar";
    }

    getPlannerWeight(_robot) {
      if (Number.isFinite(this.options.plannerWeight)) {
        return this.options.plannerWeight;
      }
      return 1.0;
    }

    getConflictSearchDepth(_robot) {
      return Number.isFinite(this.options.conflictDepth)
        ? Math.max(2, Math.floor(this.options.conflictDepth))
        : 5;
    }

    getConflictWaitThresholdMs(_robot) {
      return Number.isFinite(this.options.conflictWaitThresholdMs)
        ? this.options.conflictWaitThresholdMs
        : 1500;
    }

    getConflictCooldownMs(_robot) {
      return Number.isFinite(this.options.conflictCooldownMs)
        ? this.options.conflictCooldownMs
        : 1800;
    }

    getReservationHorizonMs(_robot) {
      return Number.isFinite(this.options.reservationHorizonMs)
        ? this.options.reservationHorizonMs
        : 12000;
    }

    getReservationStepMs(_robot) {
      return Number.isFinite(this.options.reservationStepMs)
        ? this.options.reservationStepMs
        : 200;
    }

    getReservationSafetyMs(_robot) {
      return Number.isFinite(this.options.reservationSafetyMs)
        ? this.options.reservationSafetyMs
        : 150;
    }

    getReservationNodeDwellMs(_robot) {
      return Number.isFinite(this.options.reservationNodeDwellMs)
        ? this.options.reservationNodeDwellMs
        : 400;
    }
  }

  class MapfSmtStrategy extends SippStrategy {
    constructor(options = {}) {
      super({ ...options, name: options.name || "mapf-smt" });
    }

    useConflictSearch() {
      return this.options.conflictSearch !== false;
    }

    useGlobalConflictSearch() {
      return true;
    }

    getGlobalSolverType() {
      return "csp";
    }

    getPlannerWeight(_robot) {
      if (Number.isFinite(this.options.plannerWeight)) {
        return this.options.plannerWeight;
      }
      return 1.0;
    }

    getConflictSearchDepth(_robot) {
      return Number.isFinite(this.options.conflictDepth)
        ? Math.max(2, Math.floor(this.options.conflictDepth))
        : 5;
    }

    getConflictWaitThresholdMs(_robot) {
      return Number.isFinite(this.options.conflictWaitThresholdMs)
        ? this.options.conflictWaitThresholdMs
        : 1400;
    }

    getConflictCooldownMs(_robot) {
      return Number.isFinite(this.options.conflictCooldownMs)
        ? this.options.conflictCooldownMs
        : 2000;
    }

    getReservationHorizonMs(_robot) {
      return Number.isFinite(this.options.reservationHorizonMs)
        ? this.options.reservationHorizonMs
        : 12000;
    }

    getReservationStepMs(_robot) {
      return Number.isFinite(this.options.reservationStepMs)
        ? this.options.reservationStepMs
        : 200;
    }

    getReservationSafetyMs(_robot) {
      return Number.isFinite(this.options.reservationSafetyMs)
        ? this.options.reservationSafetyMs
        : 150;
    }

    getReservationNodeDwellMs(_robot) {
      return Number.isFinite(this.options.reservationNodeDwellMs)
        ? this.options.reservationNodeDwellMs
        : 400;
    }
  }

  const create = (name, options = {}) => {
    const normalizedOptions = applyReservationProfile(options);
    const key = String(name || "simple").toLowerCase();
    if (key === "pulse-mapf" || key === "pulsemapf") {
      return new PulseMapfStrategy(normalizedOptions);
    }
    if (key === "simple") {
      return new TrafficStrategy(normalizedOptions);
    }
    if (
      key === "pulse-mapf-avoid" ||
      key === "pulsemapf-avoid" ||
      key === "pulse-mapf-dsr" ||
      key === "pulsemapf-dsr"
    ) {
      return new PulseMapfAvoidStrategy(normalizedOptions);
    }
    if (
      key === "pulse-mapf-time" ||
      key === "pulsemapf-time" ||
      key === "pulse-mapf-v2" ||
      key === "pulsemapf-v2"
    ) {
      return new PulseMapfTimeStrategy(normalizedOptions);
    }
    if (
      key === "sipp" ||
      key === "sipp-reserve" ||
      key === "pulse-mapf-sipp" ||
      key === "pulsemapf-sipp"
    ) {
      return new SippStrategy(normalizedOptions);
    }
    if (key === "sipp-kinodynamic" || key === "sipp-kin" || key === "kinodynamic-sipp") {
      return new SippKinodynamicStrategy(normalizedOptions);
    }
    if (key === "sipp-robust" || key === "sipp-stn" || key === "sipp-stable") {
      return new SippRobustStrategy(normalizedOptions);
    }
    if (key === "ecbs-sipp" || key === "ecbs") {
      return new EcbsSippStrategy(normalizedOptions);
    }
    if (key === "cbs-sipp" || key === "cbs") {
      return new CbsSippStrategy(normalizedOptions);
    }
    if (key === "cbs-full" || key === "cbs-sipp-full" || key === "cbs-tree") {
      return new CbsFullSippStrategy(normalizedOptions);
    }
    if (key === "mapf-global" || key === "mapf") {
      return new MapfGlobalStrategy(normalizedOptions);
    }
    if (key === "mapf-pibt" || key === "pibt") {
      return new MapfPibtStrategy(normalizedOptions);
    }
    if (key === "mapf-mstar" || key === "mstar" || key === "m-star" || key === "m*") {
      return new MapfMStarStrategy(normalizedOptions);
    }
    if (key === "mapf-smt" || key === "mapf-ct" || key === "mapf-sat") {
      return new MapfSmtStrategy(normalizedOptions);
    }
    return null;
  };

  const STRATEGY_NAMES = [
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

  const STRATEGY_LABELS = {
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

  const normalizeStrategyKey = (name) => String(name || "").trim().toLowerCase();

  const resolveBool = (value) => Boolean(value);

  const buildCapabilities = (strategy) => ({
    timeReservations: resolveBool(strategy?.useTimeReservations?.()),
    segmentReservations: resolveBool(strategy?.useSegmentReservations?.()),
    turnTimeReservations: resolveBool(strategy?.useTurnTimeReservations?.()),
    conflictSearch: resolveBool(strategy?.useConflictSearch?.()),
    fullConflictSearch: resolveBool(strategy?.useFullConflictSearch?.()),
    globalConflictSearch: resolveBool(strategy?.useGlobalConflictSearch?.()),
    avoidanceZones: resolveBool(strategy?.useAvoidanceZones?.()),
    avoidanceLocks: resolveBool(strategy?.useAvoidanceLocks?.()),
    edgeQueues: resolveBool(strategy?.useEdgeQueues?.()),
    nodeLocks: resolveBool(strategy?.useNodeLocks?.()),
    yieldRecovery: resolveBool(strategy?.useYieldRecovery?.()),
    recoveryMoves: resolveBool(strategy?.useRecoveryMoves?.())
  });

  const buildCategories = (capabilities) => {
    const reservation = capabilities.segmentReservations
      ? "segment"
      : capabilities.timeReservations
        ? "time"
        : "none";
    const avoidance = capabilities.avoidanceZones
      ? "zones"
      : capabilities.avoidanceLocks
        ? "locks"
        : "none";
    const conflictSearch = capabilities.globalConflictSearch
      ? "global"
      : capabilities.fullConflictSearch
        ? "full"
        : capabilities.conflictSearch
          ? "local"
          : "none";
    const routePlanner = capabilities.globalConflictSearch
      ? "global"
      : capabilities.timeReservations
        ? "time-expanded"
        : "spatial";
    return {
      routePlanner,
      reservation,
      avoidance,
      conflictSearch
    };
  };

  const resolveStrategyOptimality = (key) => {
    if (key === "mapf-smt" || key === "cbs-full") return "optimal";
    if (key.startsWith("ecbs")) return "bounded";
    if (key.startsWith("cbs")) return "optimal";
    return "heuristic";
  };

  const resolveConflictResolution = (key, capabilities) => {
    const hasConflict =
      capabilities.conflictSearch || capabilities.fullConflictSearch || capabilities.globalConflictSearch;
    if ((key.startsWith("cbs") || key.startsWith("ecbs")) && hasConflict) {
      return "backtracking";
    }
    if (capabilities.globalConflictSearch || key.startsWith("mapf")) return "replanning";
    if (capabilities.conflictSearch) return "priority";
    return "none";
  };

  const buildDimensions = (name, capabilities) => {
    const key = normalizeStrategyKey(name);
    const isKinodynamic = key.includes("kinodynamic") || key.includes("kin-");
    const searchSpace = capabilities.globalConflictSearch
      ? "global"
      : capabilities.timeReservations
        ? "time-expanded"
        : "spatial";
    const timeModel = capabilities.timeReservations ? "reservation-aware" : "static";
    const optimality = resolveStrategyOptimality(key);
    const kinematics = isKinodynamic ? "kinodynamic" : "point";
    const replan = "event";

    const granularity = capabilities.segmentReservations
      ? "segment"
      : capabilities.timeReservations
        ? "time"
        : "none";
    const locking = granularity === "segment"
      ? "pessimistic"
      : granularity === "time"
        ? "optimistic"
        : "none";
    const scope = granularity === "none"
      ? "none"
      : capabilities.globalConflictSearch
        ? "global"
        : granularity === "segment"
          ? "corridor"
          : "local";
    const release = granularity === "time"
      ? "window"
      : granularity === "segment"
        ? "trailing"
        : "none";

    const mechanism = capabilities.avoidanceZones
      ? "zones"
      : capabilities.avoidanceLocks
        ? "locks"
        : "none";
    const response = mechanism === "zones"
      ? "detour"
      : mechanism === "locks"
        ? "yield"
        : "none";
    const avoidanceScope = mechanism === "none" ? "none" : "local";
    const clearance = mechanism === "zones"
      ? "fixed"
      : mechanism === "locks"
        ? "dynamic"
        : "none";

    const conflictSearch = capabilities.globalConflictSearch
      ? "global"
      : capabilities.fullConflictSearch
        ? "full"
        : capabilities.conflictSearch
          ? "local"
          : "none";
    const conflictResolution = resolveConflictResolution(key, capabilities);

    return {
      routePlanner: {
        searchSpace,
        timeModel,
        optimality,
        kinematics,
        replan
      },
      reservation: {
        granularity,
        locking,
        scope,
        release
      },
      avoidance: {
        mechanism,
        response,
        scope: avoidanceScope,
        clearance
      },
      conflict: {
        search: conflictSearch,
        resolution: conflictResolution
      },
      execution: {
        control: "velocity",
        speedProfile: "trapezoidal",
        tracking: "open-loop"
      }
    };
  };

  const buildLabel = (name) => {
    const key = normalizeStrategyKey(name);
    return STRATEGY_LABELS[key] || name;
  };

  const describe = (name, options = {}) => {
    const instance = create(name, options);
    if (!instance) return null;
    const capabilities = buildCapabilities(instance);
    const categories = buildCategories(capabilities);
    const label = buildLabel(instance.getName ? instance.getName() : name);
    const dimensions = buildDimensions(instance.getName ? instance.getName() : name, capabilities);
    return {
      name: instance.getName ? instance.getName() : name,
      label,
      capabilities,
      categories,
      dimensions
    };
  };

  const list = (options = {}) => {
    const names = Array.isArray(options.names) && options.names.length
      ? options.names
      : STRATEGY_NAMES;
    const strategyOptions = options.strategyOptions && typeof options.strategyOptions === "object"
      ? options.strategyOptions
      : {};
    return names.map((name) => describe(name, strategyOptions)).filter(Boolean);
  };

  const api = {
    create,
    list,
    describe,
    STRATEGY_NAMES,
    resolveRobustnessProfile,
    ROBUSTNESS_PROFILES
  };

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    domainRoot.TrafficStrategies = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
