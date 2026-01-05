const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const MotionKernel = require("./motion_kernel");
const { TrafficStrategies } = require("@fleet-manager/core-mapf");
const { TrafficReservations } = require("@fleet-manager/core-reservations");
const { TimingModel } = require("@fleet-manager/core-timing");
const Scheduler = require("@fleet-manager/core-scheduler");
const { CriticalSectionTable } = require("@fleet-manager/core-scheduler");
const { ROBOKIT_TASK_STATUS, coreTaskToRobokitStatus } = require("@fleet-manager/core-types");

const ReservationTable = TrafficReservations?.ReservationTable || null;

const SIM_TICK_MS = 140;
const ROBOT_SPEED_MPS = 0.9;
const ROBOT_ACCEL_MPS2 = 0.7;
const ROBOT_DECEL_MPS2 = 1.2;
const ROBOT_TURN_RATE_RAD_S = Math.PI;
const ROBOT_ARRIVAL_DISTANCE = 0.18;
const ROBOT_ARRIVAL_SPEED = 0.04;
const ROBOT_MIN_TURN_SPEED_FACTOR = 0.45;
const ROBOT_RADIUS = 0.6;
const ROBOT_WHEELBASE_M = 1.1;
const ROBOT_STEER_MAX_RAD = Math.PI * 0.35;
const ROBOT_STEER_RATE_RAD_S = Math.PI * 1.2;
const ROBOT_STEER_GAIN = 1.1;
const DEFAULT_ROBOT_MODEL = { head: 0.5, tail: 2, width: 1 };
const ROBOT_STOP_DISTANCE = ROBOT_RADIUS * 2 - 0.1;
const ROBOT_YIELD_DISTANCE = ROBOT_STOP_DISTANCE + 0.6;
const ROBOT_YIELD_SPEED_FACTOR = 0.35;
const ROBOT_OVERLAP_EPS = 1e-3;
const ROBOT_COLLISION_MARGIN = 0.05;
const COLLISION_BLOCK_DELAY_MS = 1500;
const COLLISION_BLOCK_HOLD_MS = 900;
const COLLISION_CLEAR_STABLE_MS = 450;
const COLLISION_CLEAR_MARGIN = 0.2;
const TRAFFIC_LOOKAHEAD_S = 2.2;
const TRAFFIC_SAME_DIR_MAX_RAD = Math.PI / 3;
const MANUAL_MOTION_MAX_DT = 1;
const ROUTE_LOOKAHEAD = 0.7;
const ROUTE_SNAP_DISTANCE = 0.35;
const ROUTE_PROGRESS_EPS = 0.05;
const ROUTE_HEADING_EPS = 0.08;
const ROUTE_TURN_IN_PLACE_DEG = 90;
const ROUTE_TURN_IN_PLACE_RAD = (ROUTE_TURN_IN_PLACE_DEG * Math.PI) / 180;
const LINE_MATCH_ANGLE_DEG = 30;
const LINE_MATCH_MAX_DIST = 0.6;
const ACTION_WAIT_MS = 900;
const OBSTACLE_RADIUS = 0.8;
const OBSTACLE_CLEARANCE = 0.25;
const OBSTACLE_AVOID_MARGIN = 0.6;
const OBSTACLE_REPLAN_MS = 1200;
const ROUTE_PENALTY_FACTOR = 0.35;
const RESERVATION_DEFAULT_HORIZON_MS = 8000;
const RESERVATION_DEFAULT_STEP_MS = 200;
const RESERVATION_DEFAULT_SAFETY_MS = 120;
const RESERVATION_DEFAULT_NODE_DWELL_MS = 300;
const RESERVATION_MARGIN_MS = Math.round(
  Math.max(200, (ROBOT_RADIUS / ROBOT_SPEED_MPS) * 1000)
);
const NODE_RESERVATION_MS = RESERVATION_MARGIN_MS;
const RESERVATION_HOLD_MS = Math.round(Math.max(1200, RESERVATION_MARGIN_MS * 4));
const DEADLOCK_TIMEOUT_MS = 4000;
const YIELD_BACKOFF_DISTANCE = 1.2;
const YIELD_TIMEOUT_MS = 6000;
const STALL_MOVE_EPS = 0.03;
const STALL_SPEED_EPS = 0.03;
const STALL_TIMEOUT_MS = 2500;
const STALL_CLEAR_HYSTERESIS_MS = 600;
const HOLD_STATE_GRACE_MS = 500;
const DIAGNOSTIC_HISTORY_LIMIT = 1000;
const DIAGNOSTIC_HISTORY_MIN = 10;
const DIAGNOSTIC_HISTORY_MAX = 2000;
const DIAGNOSTIC_SWITCH_WINDOW_MS = 30000;
const DIAGNOSTIC_SWITCH_MIN_CHANGES = 4;
const DIAGNOSTIC_SWITCH_MIN_OSCILLATIONS = 2;
const DIAG_DUMP_LIMIT_DEFAULT = 200;
const DIAG_DUMP_HISTORY_LIMIT_DEFAULT = 1000;
const DIAG_DUMP_COOLDOWN_MS = 2000;
const RESERVATION_ENTRY_START_EPS = 0.2;
const RESERVATION_REFRESH_COOLDOWN_MS = 250;
const NODE_LOCK_SWITCH_MARGIN_MS = 250;
const DEADLOCK_RESOLVE_COOLDOWN_MS = 2500;
const NODE_LOCK_APPROACH_MARGIN = 0.2;
const NODE_LOCK_DISTANCE_HYSTERESIS = 0.5;
const EDGE_LOCK_TIMEOUT_MS = 5000;
const EDGE_QUEUE_TIMEOUT_MS = 2000;
const EDGE_LOCK_FOLLOW_DISTANCE = ROBOT_STOP_DISTANCE + 0.4;
const EDGE_DIRECTION_HOLD_MS = 2200;
const EDGE_DIRECTION_MAX_HOLD_MS = 8000;
const EDGE_CONFLICT_DISTANCE = ROBOT_RADIUS * 1.1;
const AVOIDANCE_BLOCK_RADIUS = ROBOT_RADIUS * 2.2;
const AVOIDANCE_RELEASE_MARGIN = 0.3;
const STUCK_RETRY_BASE_MS = 800;
const STUCK_RETRY_MAX_MS = 6000;
const PARKING_OCCUPANCY_DISTANCE = Math.max(ROBOT_ARRIVAL_DISTANCE * 2, ROBOT_RADIUS * 0.75);
const PARKING_APPROACH_DISTANCE = Math.max(ROBOT_STOP_DISTANCE, PARKING_OCCUPANCY_DISTANCE * 2);

const MANUAL_ACTIONS = { goto: null, load: 'load', unload: 'unload' };
const MAX_TASKS = 50;
const MAX_TASKS_HARD = 200;
const DISPATCH_STRATEGIES = new Set(['nearest', 'first']);
const TRAFFIC_STRATEGIES = new Set([
  'simple',
  'pulse-mapf',
  'pulse-mapf-avoid',
  'pulse-mapf-time',
  'sipp',
  'sipp-kinodynamic',
  'sipp-robust',
  'sipp-deterministic',
  'deterministic',
  'ecbs-sipp',
  'cbs-sipp',
  'cbs-full',
  'mapf-global',
  'mapf-smt',
  'mapf-pibt',
  'mapf-mstar'
]);
const REPLAN_HOLD_REASONS = new Set([
  'reservation_wait',
  'reservation_entry',
  'critical_section_wait',
  'node_lock',
  'edge_lock'
]);

const clamp =
  MotionKernel.clamp || ((value, min, max) => Math.min(Math.max(value, min), max));
const createSeededRng = (seed) => {
  let state = Number.isFinite(seed) ? seed : Date.now();
  state = state >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const resolveRangeMs = (value, fallbackMin = 0, fallbackMax = 0) => {
  if (Array.isArray(value) && value.length >= 2) {
    const min = Number(value[0]);
    const max = Number(value[1]);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return { min: Math.min(min, max), max: Math.max(min, max) };
    }
  }
  if (value && typeof value === 'object') {
    const min = Number(value.min);
    const max = Number(value.max);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return { min: Math.min(min, max), max: Math.max(min, max) };
    }
  }
  const direct = Number(value);
  if (Number.isFinite(direct)) {
    return { min: Math.max(0, direct), max: Math.max(0, direct) };
  }
  return { min: fallbackMin, max: fallbackMax };
};
const sampleRangeMs = (range, rng) => {
  if (!range) return 0;
  const min = Number.isFinite(range.min) ? range.min : 0;
  const max = Number.isFinite(range.max) ? range.max : min;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 0;
  if (!rng) return Math.max(0, min);
  return Math.max(0, min + (max - min) * rng());
};
const normalizeAngle =
  MotionKernel.normalizeAngle ||
  ((angle) => {
    let value = angle;
    while (value > Math.PI) value -= Math.PI * 2;
    while (value < -Math.PI) value += Math.PI * 2;
    return value;
  });
const distancePointToSegmentCoords =
  MotionKernel.distancePointToSegmentCoords ||
  ((px, py, ax, ay, bx, by) => {
    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;
    const abLenSq = abx * abx + aby * aby;
    if (abLenSq === 0) {
      return Math.hypot(px - ax, py - ay);
    }
    const t = clamp((apx * abx + apy * aby) / abLenSq, 0, 1);
    const cx = ax + abx * t;
    const cy = ay + aby * t;
    return Math.hypot(px - cx, py - cy);
  });
const distancePointToSegment =
  MotionKernel.distancePointToSegment ||
  ((point, a, b) => {
    if (!point || !a || !b) return Number.POSITIVE_INFINITY;
    return distancePointToSegmentCoords(point.x, point.y, a.x, a.y, b.x, b.y);
  });
const distancePointToPolyline = (point, polyline) => {
  if (!point || !polyline || !Array.isArray(polyline.points)) {
    return Number.POSITIVE_INFINITY;
  }
  const pts = polyline.points;
  if (pts.length < 2) return Number.POSITIVE_INFINITY;
  let minDist = Number.POSITIVE_INFINITY;
  for (let i = 1; i < pts.length; i += 1) {
    const dist = distancePointToSegment(point, pts[i - 1], pts[i]);
    if (dist < minDist) {
      minDist = dist;
    }
  }
  return minDist;
};
const onSegment = (p, q, r, eps) => {
  const epsilon = Number.isFinite(eps) ? eps : 1e-6;
  return (
    q.x <= Math.max(p.x, r.x) + epsilon &&
    q.x + epsilon >= Math.min(p.x, r.x) &&
    q.y <= Math.max(p.y, r.y) + epsilon &&
    q.y + epsilon >= Math.min(p.y, r.y)
  );
};
const orientation = (p, q, r, eps) => {
  const epsilon = Number.isFinite(eps) ? eps : 1e-9;
  const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  if (Math.abs(val) <= epsilon) return 0;
  return val > 0 ? 1 : 2;
};
const segmentsIntersect = (p1, q1, p2, q2) => {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;
  return false;
};
const segmentDistance = (a, b, c, d) => {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(
    distancePointToSegment(a, c, d),
    distancePointToSegment(b, c, d),
    distancePointToSegment(c, a, b),
    distancePointToSegment(d, a, b)
  );
};

const resolveSegmentConflictThreshold = (a, b, c, d, thresholds) => {
  if (Number.isFinite(thresholds)) return thresholds;
  const parallel = Number.isFinite(thresholds?.parallel)
    ? thresholds.parallel
    : EDGE_CONFLICT_DISTANCE;
  const perpendicular = Number.isFinite(thresholds?.perpendicular)
    ? thresholds.perpendicular
    : parallel;
  if (!a || !b || !c || !d) return parallel;
  const dirA = unitVector(b.x - a.x, b.y - a.y);
  const dirB = unitVector(d.x - c.x, d.y - c.y);
  const dot = clamp(dirA.x * dirB.x + dirA.y * dirB.y, -1, 1);
  const alignment = Math.abs(dot);
  const sin = Math.sqrt(Math.max(0, 1 - alignment * alignment));
  return parallel + (perpendicular - parallel) * sin;
};

const polylinesConflict = (polyA, polyB, threshold) => {
  if (!polyA?.points || !polyB?.points) return false;
  const pointsA = polyA.points;
  const pointsB = polyB.points;
  for (let i = 0; i < pointsA.length - 1; i += 1) {
    const a = pointsA[i];
    const b = pointsA[i + 1];
    if (!a || !b) continue;
    for (let j = 0; j < pointsB.length - 1; j += 1) {
      const c = pointsB[j];
      const d = pointsB[j + 1];
      if (!c || !d) continue;
      const limit = resolveSegmentConflictThreshold(a, b, c, d, threshold);
      const dist = segmentDistance(a, b, c, d);
      if (dist <= limit) return true;
    }
  }
  return false;
};
const unitVector =
  MotionKernel.unitVector ||
  ((dx, dy) => {
    const len = Math.hypot(dx, dy);
    if (len === 0) return { x: 0, y: 0 };
    return { x: dx / len, y: dy / len };
  });
const toRad = MotionKernel.toRad || ((deg) => (deg * Math.PI) / 180);
const sampleBezierPoints =
  MotionKernel.sampleBezierPoints ||
  ((p0, p1, p2, p3, samples) => {
    const points = [];
    for (let i = 0; i <= samples; i += 1) {
      const t = i / samples;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const t2 = t * t;
      const x =
        mt2 * mt * p0.x +
        3 * mt2 * t * p1.x +
        3 * mt * t2 * p2.x +
        t2 * t * p3.x;
      const y =
        mt2 * mt * p0.y +
        3 * mt2 * t * p1.y +
        3 * mt * t2 * p2.y +
        t2 * t * p3.y;
      points.push({ x, y });
    }
    return points;
  });
const buildPolyline =
  MotionKernel.buildPolyline ||
  ((points) => {
    const lengths = [0];
    let total = 0;
    for (let i = 1; i < points.length; i += 1) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      total += Math.hypot(dx, dy);
      lengths.push(total);
    }
    const headings = points.map((pt, idx) => {
      const next = points[idx + 1] || points[idx];
      const prev = points[idx - 1] || points[idx];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      if (dx === 0 && dy === 0) {
        return 0;
      }
      return Math.atan2(dy, dx);
    });
    return { points, lengths, totalLength: total, headings };
  });
const reversePolyline =
  MotionKernel.reversePolyline ||
  ((polyline) => {
    const points = [...polyline.points].reverse();
    const headings = [...polyline.headings]
      .reverse()
      .map((heading) => normalizeAngle(heading + Math.PI));
    const total = polyline.totalLength;
    const lengths = polyline.lengths.map((dist) => total - dist).reverse();
    return { points, headings, lengths, totalLength: total };
  });
const polylineAtDistance =
  MotionKernel.polylineAtDistance ||
  ((polyline, distance) => {
    if (!polyline.points.length) {
      return { x: 0, y: 0, heading: 0 };
    }
    if (distance <= 0) {
      return {
        x: polyline.points[0].x,
        y: polyline.points[0].y,
        heading: polyline.headings[0]
      };
    }
    if (distance >= polyline.totalLength) {
      const lastIdx = polyline.points.length - 1;
      return {
        x: polyline.points[lastIdx].x,
        y: polyline.points[lastIdx].y,
        heading: polyline.headings[lastIdx]
      };
    }
    const lengths = polyline.lengths;
    let idx = 0;
    while (idx < lengths.length - 1 && lengths[idx + 1] < distance) {
      idx += 1;
    }
    const segStart = lengths[idx];
    const segEnd = lengths[idx + 1];
    const ratio = segEnd === segStart ? 0 : (distance - segStart) / (segEnd - segStart);
    const a = polyline.points[idx];
    const b = polyline.points[idx + 1];
    const x = a.x + (b.x - a.x) * ratio;
    const y = a.y + (b.y - a.y) * ratio;
    const heading = polyline.headings[idx];
    return { x, y, heading };
  });

const projectPointToSegment = (px, py, ax, ay, bx, by) => {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLenSq = abx * abx + aby * aby;
  if (abLenSq === 0) {
    return { x: ax, y: ay, t: 0, dist: Math.hypot(px - ax, py - ay) };
  }
  const t = clamp((apx * abx + apy * aby) / abLenSq, 0, 1);
  const x = ax + abx * t;
  const y = ay + aby * t;
  return { x, y, t, dist: Math.hypot(px - x, py - y) };
};

const projectPointToPolyline = (point, polyline) => {
  if (!point || !polyline?.points?.length) {
    return { point: null, dist: Number.POSITIVE_INFINITY, offset: 0 };
  }
  let best = { point: null, dist: Number.POSITIVE_INFINITY, offset: 0 };
  for (let i = 0; i < polyline.points.length - 1; i += 1) {
    const a = polyline.points[i];
    const b = polyline.points[i + 1];
    const segmentLen = polyline.lengths[i + 1] - polyline.lengths[i];
    const projection = projectPointToSegment(point.x, point.y, a.x, a.y, b.x, b.y);
    if (projection.dist < best.dist) {
      const offset = polyline.lengths[i] + segmentLen * projection.t;
      best = { point: { x: projection.x, y: projection.y }, dist: projection.dist, offset };
    }
  }
  return best;
};

const slicePolyline = (polyline, startDist, endDist) => {
  if (!polyline?.points?.length) return buildPolyline([]);
  const clampedStart = clamp(startDist, 0, polyline.totalLength);
  const clampedEnd = clamp(endDist, clampedStart, polyline.totalLength);
  const points = [];
  const startPose = polylineAtDistance(polyline, clampedStart);
  const endPose = polylineAtDistance(polyline, clampedEnd);
  points.push({ x: startPose.x, y: startPose.y });
  for (let i = 1; i < polyline.points.length - 1; i += 1) {
    const dist = polyline.lengths[i];
    if (dist > clampedStart && dist < clampedEnd) {
      points.push({ x: polyline.points[i].x, y: polyline.points[i].y });
    }
  }
  points.push({ x: endPose.x, y: endPose.y });
  return buildPolyline(points);
};

const makeEdgeGroupKey = (fromId, toId) => {
  if (!fromId || !toId) return null;
  return fromId < toId ? `${fromId}<->${toId}` : `${toId}<->${fromId}`;
};

const distanceBetweenPoints = (a, b) => {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.hypot(a.x - b.x, a.y - b.y);
};

const approachValue = (value, target, maxDelta) => {
  if (value < target) return Math.min(value + maxDelta, target);
  if (value > target) return Math.max(value - maxDelta, target);
  return target;
};

const toFiniteNumber = (value, fallback = 0) => {
  if (Number.isFinite(value)) return Number(value);
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const computeTurnPenalty = (diff) => {
  const ratio = Math.min(Math.abs(diff) / (Math.PI / 2), 1);
  return clamp(1 - ratio, ROBOT_MIN_TURN_SPEED_FACTOR, 1);
};

const computeStoppingSpeed = (distance) => {
  if (!Number.isFinite(distance) || distance <= 0) return 0;
  return Math.sqrt(2 * ROBOT_DECEL_MPS2 * distance);
};

class MinHeap {
  constructor(compare) {
    this.items = [];
    this.compare = compare;
  }

  get size() {
    return this.items.length;
  }

  push(item) {
    this.items.push(item);
    this._bubbleUp(this.items.length - 1);
  }

  pop() {
    if (!this.items.length) return null;
    const first = this.items[0];
    const last = this.items.pop();
    if (this.items.length && last) {
      this.items[0] = last;
      this._bubbleDown(0);
    }
    return first;
  }

  _bubbleUp(index) {
    let idx = index;
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.compare(this.items[idx], this.items[parent]) >= 0) break;
      [this.items[idx], this.items[parent]] = [this.items[parent], this.items[idx]];
      idx = parent;
    }
  }

  _bubbleDown(index) {
    let idx = index;
    const length = this.items.length;
    while (true) {
      let smallest = idx;
      const left = idx * 2 + 1;
      const right = idx * 2 + 2;
      if (left < length && this.compare(this.items[left], this.items[smallest]) < 0) {
        smallest = left;
      }
      if (right < length && this.compare(this.items[right], this.items[smallest]) < 0) {
        smallest = right;
      }
      if (smallest === idx) break;
      [this.items[idx], this.items[smallest]] = [this.items[smallest], this.items[idx]];
      idx = smallest;
    }
  }
}

function createFleetSim(options = {}) {
  const tickMs = Number.parseInt(options.tickMs || SIM_TICK_MS, 10);
  const fastMode = Boolean(options.fastMode || options.maxSpeed);
  const ignoreTraffic = Boolean(options.ignoreTraffic);
  const collisionBlockingEnabled = options.collisionBlocking !== false;
  const diagnosticDumpEnabled = Boolean(options.diagnosticDump || options.diagnosticDumpDir);
  const diagnosticDumpDir =
    typeof options.diagnosticDumpDir === "string" && options.diagnosticDumpDir.trim()
      ? path.resolve(options.diagnosticDumpDir.trim())
      : diagnosticDumpEnabled
        ? path.join(os.tmpdir(), "fleet-sim-diag")
        : null;
  const diagnosticDumpLimit = Number.isFinite(options.diagnosticDumpLimit)
    ? Math.max(0, Math.floor(options.diagnosticDumpLimit))
    : DIAG_DUMP_LIMIT_DEFAULT;
  const diagnosticDumpCooldownMs = Number.isFinite(options.diagnosticDumpCooldownMs)
    ? Math.max(0, Math.floor(options.diagnosticDumpCooldownMs))
    : DIAG_DUMP_COOLDOWN_MS;
  const diagnosticDumpHistoryLimit = Number.isFinite(options.diagnosticDumpHistoryLimit)
    ? Math.max(0, Math.floor(options.diagnosticDumpHistoryLimit))
    : DIAG_DUMP_HISTORY_LIMIT_DEFAULT;
  const diagnosticDumpIncludeReservations = options.diagnosticDumpIncludeReservations !== false;
  const diagnosticDumpIncludeHistory = options.diagnosticDumpIncludeHistory === true;
  const diagnosticDumpIncludeObstacles = options.diagnosticDumpIncludeObstacles !== false;
  const diagnosticDumpIncludeWaitGraph = options.diagnosticDumpIncludeWaitGraph === true;
  const diagnosticDumpIncludeCollisions = options.diagnosticDumpIncludeCollisions === true;
  let diagnosticDumpCount = 0;
  const diagnosticDumpLastAt = new Map();
  const speedMultiplier = Number.isFinite(options.speedMultiplier)
    ? Math.max(0.1, Number(options.speedMultiplier))
    : fastMode
      ? 5
      : 1;
  const actionWaitMs = Number.isFinite(options.actionWaitMs)
    ? Math.max(0, Number(options.actionWaitMs))
    : fastMode
      ? 0
      : ACTION_WAIT_MS;
  const yieldEnabled = false;
  const robotSpeedMps = ROBOT_SPEED_MPS * speedMultiplier;
  const robotAccelMps2 = ROBOT_ACCEL_MPS2 * speedMultiplier;
  const robotDecelMps2 = ROBOT_DECEL_MPS2 * speedMultiplier;
  const robotTurnRateRadS = ROBOT_TURN_RATE_RAD_S * speedMultiplier;
  const reservationMarginMs = Math.round(
    Math.max(200, (ROBOT_RADIUS / robotSpeedMps) * 1000)
  );
  const enableTestHooks = Boolean(options.enableTestHooks);
  const nodeReservationMs = reservationMarginMs;
  const reservationHoldMs = Math.round(Math.max(1200, reservationMarginMs * 4));
  const PackagingEngine = options.packagingEngine || null;
  let timer = null;
  let lastTickAt = null;
  let lastTickMs = null;
  let lastError = null;
  let tickCounter = 0;
  let entryHoldWaiterCache = null;
  let entryHoldWaiterCacheDirty = true;

  let graphData = null;
  let workflowData = null;
  let robotsConfig = null;
  let packagingConfig = null;

  let worksites = [];
  let worksiteState = {};
  let robots = [];
  let tasks = [];
  let taskCounter = 1;
  let lastTaskStatusByRobot = new Map();
  let robotRuntime = new Map();
  let scheduleDelayStats = new Map();
  let pausedAutoRuntime = new Map();
  let robotDiagnostics = new Map();
  let diagnosticsHistory = new Map();
  let navGraph = null;
  let trafficStrategy = null;
  let robustnessProfile = null;
  let timingModel = null;
  let dispatchStrategy = 'nearest';
  let dispatchStrategyOverride = null;
  let trafficStrategyOverride = null;
  let reservationTable = null;
  let reservationConfig = null;
  let criticalSectionIndex = null;
  let criticalSectionTable = null;
  let criticalSectionConfig = null;
  const ensureDiagnosticDumpDir = () => {
    if (!diagnosticDumpEnabled || !diagnosticDumpDir) return false;
    try {
      fs.mkdirSync(diagnosticDumpDir, { recursive: true });
      return true;
    } catch (err) {
      console.warn(`[fleet-sim] failed to create diag dump dir: ${err.message}`);
      return false;
    }
  };
  const shouldDumpDiagnostics = (event, now, robotId) => {
    if (!diagnosticDumpEnabled || !diagnosticDumpDir) return false;
    if (diagnosticDumpLimit > 0 && diagnosticDumpCount >= diagnosticDumpLimit) return false;
    const key = `${event}:${robotId || "global"}`;
    const last = diagnosticDumpLastAt.get(key) || 0;
    if (diagnosticDumpCooldownMs > 0 && now - last < diagnosticDumpCooldownMs) return false;
    diagnosticDumpLastAt.set(key, now);
    return true;
  };
  const dumpDiagnosticsSnapshot = (event, detail) => {
    if (!diagnosticDumpEnabled || !diagnosticDumpDir) return;
    if (event === 'blocked_collision' && !diagnosticDumpIncludeCollisions) return;
    const now = Date.now();
    if (!shouldDumpDiagnostics(event, now, detail?.robotId)) return;
    if (!ensureDiagnosticDumpDir()) return;
    try {
      const snapshot = {
        event,
        at: now,
        detail: detail || null,
        simSettings: {
          dispatchStrategy,
          trafficStrategy: trafficStrategy?.getName
            ? trafficStrategy.getName()
            : resolveTrafficStrategyName(robotsConfig),
          overrides: {
            dispatchStrategy: dispatchStrategyOverride,
            trafficStrategy: trafficStrategyOverride
          },
          trafficOptions: robotsConfig?.traffic || null
        },
        diagnostics: getDiagnostics({
          includeReservations: diagnosticDumpIncludeReservations,
          includeRoute: true,
          includeObstacles: diagnosticDumpIncludeObstacles,
          includeHistory: diagnosticDumpIncludeHistory,
          includeDebug: true,
          includeWaitGraph: diagnosticDumpIncludeWaitGraph,
          captureHistory: false,
          historyLimit: diagnosticDumpHistoryLimit
        })
      };
      const safeRobot = detail?.robotId ? String(detail.robotId).replace(/[^a-zA-Z0-9_-]/g, "_") : "all";
      const filename = `${now}-${event}-${safeRobot}-${diagnosticDumpCount}.json`;
      fs.writeFileSync(path.join(diagnosticDumpDir, filename), JSON.stringify(snapshot, null, 2));
      diagnosticDumpCount += 1;
    } catch (err) {
      console.warn(`[fleet-sim] failed to write diag dump: ${err.message}`);
    }
  };
  let trafficSnapshot = null;
  let waitGraphSnapshot = null;
  let lastReservationRebuildAt = 0;
  let edgeLocks = new Map();
  let edgeQueues = new Map();
  let edgeDirectionLocks = new Map();
  let edgeConflictGroups = new Map();
  let edgeConflictThresholds = {
    parallel: EDGE_CONFLICT_DISTANCE,
    perpendicular: EDGE_CONFLICT_DISTANCE
  };
  let maxRobotHead = DEFAULT_ROBOT_MODEL.head;
  let avoidanceZones = new Map();
  let yieldBays = [];
  let avoidanceLocks = new Map();
  let nodeLocks = new Map();
  let parkingPoints = [];
  let parkingPointIndex = new Map();

  let obstacles = [];
  let obstacleIdSeq = 1;
  let collisionOverlap = new Map();
  let collisionBlockedUntil = new Map();
  let collisionClearSince = new Map();
  let trafficMetrics = null;
  let chaosConfig = null;
  let eventLog = [];
  let eventLogEnabled = false;
  let eventLogLimit = 2000;
  let eventLogFilePath = null;

  let bufferState = {};
  let lineRequests = [];
  let opsOverrides = { buffers: {}, places: {} };
  let robotParking = new Map();

  const computeQuantile = (values, quantile) => {
    if (!Array.isArray(values) || !values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(
      sorted.length - 1,
      Math.max(0, Math.floor(quantile * (sorted.length - 1)))
    );
    return sorted[index];
  };

  class MetricWindow {
    constructor(limit = 200) {
      this.limit = limit;
      this.samples = [];
    }

    push(value) {
      if (!Number.isFinite(value)) return;
      this.samples.push(value);
      if (this.samples.length > this.limit) {
        this.samples.shift();
      }
    }

    snapshot() {
      const samples = this.samples.slice();
      return {
        samples: samples.length,
        p50: computeQuantile(samples, 0.5),
        p95: computeQuantile(samples, 0.95)
      };
    }
  }

  const buildTrafficMetrics = (profile) => {
    const timingWindow = Number.isFinite(profile?.timingModel?.p95Window)
      ? profile.timingModel.p95Window
      : 40;
    const limit = Math.max(30, Math.min(500, Math.floor(timingWindow * 3)));
    return {
      counts: {
        holds: 0,
        repairsSucceeded: 0,
        repairsFailed: 0,
        replans: 0,
        deadlockWarnings: 0,
        reservationViolations: 0
      },
      slip: new MetricWindow(limit),
      criticalWait: new MetricWindow(limit),
      lastResetAt: Date.now()
    };
  };

  const buildChaosConfig = (trafficConfig = {}) => {
    const chaos = trafficConfig?.chaos || {};
    if (chaos.enabled !== true) return null;
    const seed = Number.isFinite(chaos.seed) ? chaos.seed : Date.now();
    const rng = createSeededRng(seed);
    const segmentDelayMs = resolveRangeMs(
      chaos.segmentDelayMs ?? chaos.delayMs,
      0,
      0
    );
    const stopChance = Number.isFinite(chaos.stopChance)
      ? clamp(chaos.stopChance, 0, 1)
      : 0;
    const stopDurationMs = resolveRangeMs(
      chaos.stopDurationMs ?? chaos.stopMs,
      0,
      0
    );
    return {
      enabled: true,
      seed,
      rng,
      segmentDelayMs,
      stopChance,
      stopDurationMs
    };
  };

  const recordMetricCount = (key, delta = 1) => {
    if (!trafficMetrics || !trafficMetrics.counts) return;
    if (!Object.prototype.hasOwnProperty.call(trafficMetrics.counts, key)) return;
    trafficMetrics.counts[key] += Number.isFinite(delta) ? delta : 1;
  };

  const recordEvent = (type, payload = {}) => {
    if (!eventLogEnabled || !type) return;
    const entry = {
      at: Date.now(),
      tick: tickCounter,
      type,
      ...payload
    };
    eventLog.push(entry);
    if (eventLog.length > eventLogLimit) {
      eventLog.splice(0, eventLog.length - eventLogLimit);
    }
    if (eventLogFilePath) {
      try {
        fs.appendFileSync(eventLogFilePath, `${JSON.stringify(entry)}\n`);
      } catch (err) {
        console.warn(`[fleet-sim] failed to write event log: ${err.message}`);
      }
    }
  };

  const resolveEventLogConfig = (trafficConfig = {}) => {
    const envEnabledRaw = process.env.FLEET_EVENT_LOG || process.env.EVENT_LOG;
    const envLimitRaw = process.env.FLEET_EVENT_LOG_LIMIT || process.env.EVENT_LOG_LIMIT;
    const envLimit = Number.isFinite(Number(envLimitRaw))
      ? Math.max(50, Math.floor(Number(envLimitRaw)))
      : null;
    const envPath =
      typeof envEnabledRaw === 'string' && envEnabledRaw.trim() && envEnabledRaw.trim() !== '1'
        ? envEnabledRaw.trim()
        : null;
    if (envEnabledRaw) {
      return {
        enabled: true,
        limit: envLimit || eventLogLimit,
        file: envPath || null
      };
    }
    const diagnostics =
      trafficConfig.diagnostics && typeof trafficConfig.diagnostics === 'object'
        ? trafficConfig.diagnostics
        : {};
    const raw =
      diagnostics.eventLog ??
      trafficConfig.eventLog ??
      trafficConfig.eventLogEnabled ??
      diagnostics.eventLogEnabled ??
      null;
    if (typeof raw === 'boolean') {
      return { enabled: raw, limit: eventLogLimit };
    }
    if (raw && typeof raw === 'object') {
      const enabled = raw.enabled === true;
      const limit = Number.isFinite(raw.limit)
        ? Math.max(50, Math.floor(raw.limit))
        : Number.isFinite(raw.max)
          ? Math.max(50, Math.floor(raw.max))
          : eventLogLimit;
      const file =
        typeof raw.file === 'string'
          ? raw.file
          : typeof raw.path === 'string'
            ? raw.path
            : null;
      const dir =
        typeof raw.dir === 'string'
          ? raw.dir
          : typeof raw.directory === 'string'
            ? raw.directory
            : null;
      const name =
        typeof raw.name === 'string'
          ? raw.name
          : typeof raw.filename === 'string'
            ? raw.filename
            : null;
      return { enabled, limit, file, dir, name };
    }
    return { enabled: false, limit: eventLogLimit };
  };

  const configureEventLog = (trafficConfig) => {
    const config = resolveEventLogConfig(trafficConfig || {});
    const nextEnabled = Boolean(config.enabled);
    const nextLimit = Number.isFinite(config.limit) ? config.limit : eventLogLimit;
    if (nextEnabled !== eventLogEnabled) {
      eventLog = [];
    }
    eventLogEnabled = nextEnabled;
    eventLogLimit = nextLimit;
    if (eventLogEnabled) {
      if (config.file) {
        eventLogFilePath = path.resolve(config.file);
      } else {
        const baseDir = config.dir ? path.resolve(config.dir) : process.cwd();
        const fileName = config.name || 'fleet-sim-events.log';
        eventLogFilePath = path.join(baseDir, fileName);
      }
      try {
        fs.mkdirSync(path.dirname(eventLogFilePath), { recursive: true });
      } catch (err) {
        console.warn(`[fleet-sim] failed to create event log dir: ${err.message}`);
      }
    } else {
      eventLogFilePath = null;
    }
  };

  const buildReservationViolationDetail = (robot, segment, scheduleEntry) => ({
    robotId: robot?.id || null,
    edgeKey: scheduleEntry?.edgeKey || segment?.edgeKey || null,
    edgeGroupKey: scheduleEntry?.edgeGroupKey || segment?.edgeGroupKey || null,
    fromNodeId: scheduleEntry?.fromNodeId || segment?.fromNodeId || null,
    toNodeId: scheduleEntry?.toNodeId || segment?.toNodeId || null,
    scheduleEntry: scheduleEntry
      ? {
          edgeKey: scheduleEntry.edgeKey || null,
          edgeGroupKey: scheduleEntry.edgeGroupKey || null,
          edgeBaseGroupKey: scheduleEntry.edgeBaseGroupKey || null,
          fromNodeId: scheduleEntry.fromNodeId || null,
          toNodeId: scheduleEntry.toNodeId || null,
          startTime: scheduleEntry.startTime,
          arrivalTime: scheduleEntry.arrivalTime,
          waitMs: scheduleEntry.waitMs,
          travelMs: scheduleEntry.travelMs,
          conflict: scheduleEntry.conflict
            ? {
                source: scheduleEntry.conflict.source || null,
                type: scheduleEntry.conflict.type || null,
                key: scheduleEntry.conflict.key || null,
                holder: scheduleEntry.conflict.holder || null
              }
            : null
        }
      : null
  });

  const recordReservationViolation = (runtime, nowMs, detail) => {
    if (!runtime) return;
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const last = runtime.lastReservationViolationAt || 0;
    if (now - last < RESERVATION_REFRESH_COOLDOWN_MS) return;
    runtime.lastReservationViolationAt = now;
    recordMetricCount('reservationViolations');
    dumpDiagnosticsSnapshot('reservation_violation', {
      robotId: detail?.robotId || null,
      edgeKey: detail?.edgeKey || null,
      edgeGroupKey: detail?.edgeGroupKey || null,
      fromNodeId: detail?.fromNodeId || null,
      toNodeId: detail?.toNodeId || null,
      phase: runtime.phase || null,
      scheduleEntry: detail?.scheduleEntry || null,
      now
    });
  };

  const recordMetricSample = (key, value) => {
    if (!trafficMetrics) return;
    if (key === 'slip') {
      trafficMetrics.slip.push(value);
      return;
    }
    if (key === 'criticalWait') {
      trafficMetrics.criticalWait.push(value);
    }
  };

  const computeStoppingSpeed = (distance, robot) => {
    if (!Number.isFinite(distance) || distance <= 0) return 0;
    const profile = getRobotMotionProfile(robot);
    const decel = profile?.decelMps2 || robotDecelMps2;
    return Math.sqrt(2 * decel * distance);
  };

  const updateTrafficBlockState = (runtime, traffic, robot) => {
    if (!runtime) return;
    const now = Date.now();
    const speed = Number.isFinite(robot?.speed) ? Math.abs(robot.speed) : 0;
    const moving = speed > STALL_SPEED_EPS;
    if (traffic?.blockReason && Number(traffic.speedLimit) <= 1e-3) {
      const blockingId = traffic.blockingId || null;
      const prev = runtime.lastTrafficBlock;
      const same =
        prev &&
        prev.reason === traffic.blockReason &&
        prev.blockingId === blockingId;
      runtime.lastTrafficBlock = {
        reason: traffic.blockReason,
        blockingId,
        at: same && Number.isFinite(prev.at) ? prev.at : now,
        holdUntil: Math.max(prev?.holdUntil || 0, now + HOLD_STATE_GRACE_MS)
      };
      return;
    }
    if (runtime.lastTrafficBlock) {
      const holdUntil = Number.isFinite(runtime.lastTrafficBlock.holdUntil)
        ? runtime.lastTrafficBlock.holdUntil
        : Number.isFinite(runtime.lastTrafficBlock.at)
          ? runtime.lastTrafficBlock.at + HOLD_STATE_GRACE_MS
          : now;
      if (now < holdUntil) {
        return;
      }
      runtime.lastTrafficBlock = null;
    }
  };

  const buildTrafficSnapshot = () =>
    robots
      .filter(Boolean)
      .map((robot) => ({
        id: robot.id,
        pos: robot.pos ? { x: robot.pos.x, y: robot.pos.y } : null,
        heading: Number.isFinite(robot.heading) ? robot.heading : 0,
        speed: Number.isFinite(robot.speed) ? robot.speed : 0,
        online: robot.online !== false,
        blocked: Boolean(robot.blocked),
        manualMode: Boolean(robot.manualMode),
        model: robot.model || null,
        radius: robot.radius || null
      }));

  const resolveWheelbase = (robot) => {
    const direct = Number.isFinite(robot?.wheelbase) ? robot.wheelbase : null;
    if (direct && direct > 0) return direct;
    const model = robot?.model;
    if (model && Number.isFinite(model.head) && Number.isFinite(model.tail)) {
      const length = model.head + model.tail;
      if (length > 0) {
        return clamp(length * 0.6, 0.6, 2.5);
      }
    }
    return ROBOT_WHEELBASE_M;
  };

  const ensureRobotMotion = (robot) => {
    if (!robot) return;
    if (!Number.isFinite(robot.heading)) robot.heading = 0;
    if (!Number.isFinite(robot.speed)) robot.speed = 0;
    if (!Number.isFinite(robot.steerAngle)) robot.steerAngle = 0;
  };

  const normalizeDispatchStrategy = (value) => {
    if (!value) return null;
    const key = String(value).trim().toLowerCase();
    return DISPATCH_STRATEGIES.has(key) ? key : null;
  };

  const normalizeTrafficStrategy = (value) => {
    if (!value) return null;
    const key = String(value).trim().toLowerCase();
    if (key === 'pulsemapf') return 'pulse-mapf';
    if (key === 'pulse-mapf-dsr' || key === 'pulsemapf-dsr') return 'pulse-mapf-avoid';
    if (key === 'pulse-mapf-v2' || key === 'pulsemapf-v2') return 'pulse-mapf-time';
    if (
      key === 'sipp-reserve' ||
      key === 'pulse-mapf-sipp' ||
      key === 'pulsemapf-sipp'
    ) {
      return 'sipp';
    }
    if (key === 'ecbs-sipp' || key === 'ecbs') {
      return 'ecbs-sipp';
    }
    if (key === 'cbs-sipp' || key === 'cbs') {
      return 'cbs-sipp';
    }
    if (key === 'cbs-full' || key === 'cbs-sipp-full' || key === 'cbs-tree') {
      return 'cbs-full';
    }
    if (key === 'mapf-global' || key === 'mapf') {
      return 'mapf-global';
    }
    if (key === 'mapf-smt' || key === 'mapf-ct' || key === 'mapf-sat') {
      return 'mapf-smt';
    }
    if (key === 'mapf-pibt' || key === 'pibt') {
      return 'mapf-pibt';
    }
    if (key === 'mapf-mstar' || key === 'mstar' || key === 'm-star' || key === 'm*') {
      return 'mapf-mstar';
    }
    if (key === 'sipp-kinodynamic' || key === 'sipp-kin' || key === 'kinodynamic-sipp') {
      return 'sipp-kinodynamic';
    }
    if (key === 'sipp-robust' || key === 'sipp-stn' || key === 'sipp-stable') {
      return 'sipp-robust';
    }
    if (key === 'sipp-deterministic' || key === 'sipp-det' || key === 'sipp-deterministic-time') {
      return 'sipp-deterministic';
    }
    return TRAFFIC_STRATEGIES.has(key) ? key : null;
  };

  const resolveDispatchStrategy = (config) =>
    dispatchStrategyOverride ||
    normalizeDispatchStrategy(config?.strategy) ||
    normalizeDispatchStrategy(config?.dispatchStrategy) ||
    'nearest';

  const resolveTrafficStrategyName = (config) => {
    const override = normalizeTrafficStrategy(trafficStrategyOverride);
    if (override) return override;
    const trafficConfig = config?.traffic || {};
    if (typeof trafficConfig.strategy === 'string' && trafficConfig.strategy.trim()) {
      return trafficConfig.strategy;
    }
    if (typeof config?.trafficStrategy === 'string' && config.trafficStrategy.trim()) {
      return config.trafficStrategy;
    }
    return 'simple';
  };

  const getRobotVelocity = (robot) => {
    ensureRobotMotion(robot);
    return {
      vx: Math.cos(robot.heading) * robot.speed,
      vy: Math.sin(robot.heading) * robot.speed
    };
  };

  const getRobotWidth = (robot) => {
    const width = Number(robot?.model?.width);
    if (Number.isFinite(width) && width > 0) return width;
    return DEFAULT_ROBOT_MODEL.width;
  };

  const getRobotEnvelopeModel = (robot) => {
    const model = robot?.model;
    const head = Number(model?.head);
    const tail = Number(model?.tail);
    const width = Number(model?.width);
    return {
      head: Number.isFinite(head) && head > 0 ? head : DEFAULT_ROBOT_MODEL.head,
      tail: Number.isFinite(tail) && tail > 0 ? tail : DEFAULT_ROBOT_MODEL.tail,
      width: Number.isFinite(width) && width > 0 ? width : DEFAULT_ROBOT_MODEL.width
    };
  };

  const getRobotEnvelopeDims = (robot) => {
    const model = getRobotEnvelopeModel(robot);
    const radius = Number(robot?.radius);
    const minSpan = Number.isFinite(radius) && radius > 0 ? radius * 2 : 0;
    const length = Math.max(model.head + model.tail, minSpan || 0);
    const width = Math.max(model.width, minSpan || 0);
    return { ...model, length, width };
  };

  const getRobotEnvelopeRadius = (robot) => {
    const dims = getRobotEnvelopeDims(robot);
    const diag = Math.hypot(dims.length, dims.width);
    const radius = diag > 0 ? diag * 0.5 : ROBOT_RADIUS;
    const direct = Number(robot?.radius);
    if (Number.isFinite(direct) && direct > 0) {
      return Math.max(radius, direct);
    }
    return radius || ROBOT_RADIUS;
  };

  const getRobotCollisionBox = (robot, extraMargin = 0) => {
    if (!robot?.pos) return null;
    const margin = Number.isFinite(extraMargin) ? Math.max(0, extraMargin) : 0;
    const model = getRobotEnvelopeModel(robot);
    const radius = Number(robot?.radius);
    const minSpan = Number.isFinite(radius) && radius > 0 ? radius * 2 : 0;
    let head = model.head;
    let tail = model.tail;
    let width = model.width;
    const totalLength = head + tail;
    if (minSpan > totalLength) {
      const extra = (minSpan - totalLength) / 2;
      head += extra;
      tail += extra;
    }
    if (minSpan > width) {
      width = minSpan;
    }
    head = Math.max(0, head + ROBOT_COLLISION_MARGIN + margin);
    tail = Math.max(0, tail + ROBOT_COLLISION_MARGIN + margin);
    const halfWidth = Math.max(0, width / 2 + ROBOT_COLLISION_MARGIN + margin);
    const heading = Number.isFinite(robot.heading) ? robot.heading : 0;
    const forward = { x: Math.cos(heading), y: Math.sin(heading) };
    const right = { x: -forward.y, y: forward.x };
    const front = { x: forward.x * head, y: forward.y * head };
    const back = { x: -forward.x * tail, y: -forward.y * tail };
    const side = { x: right.x * halfWidth, y: right.y * halfWidth };
    const pos = robot.pos;
    const corners = [
      { x: pos.x + front.x + side.x, y: pos.y + front.y + side.y },
      { x: pos.x + front.x - side.x, y: pos.y + front.y - side.y },
      { x: pos.x + back.x + side.x, y: pos.y + back.y + side.y },
      { x: pos.x + back.x - side.x, y: pos.y + back.y - side.y }
    ];
    return { corners, axes: [forward, right] };
  };

  const projectCorners = (corners, axis) => {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const corner of corners) {
      const value = corner.x * axis.x + corner.y * axis.y;
      if (value < min) min = value;
      if (value > max) max = value;
    }
    return { min, max };
  };

  const boxesOverlap = (boxA, boxB) => {
    if (!boxA || !boxB) return false;
    const axes = [...(boxA.axes || []), ...(boxB.axes || [])];
    for (const axis of axes) {
      const projA = projectCorners(boxA.corners, axis);
      const projB = projectCorners(boxB.corners, axis);
      if (projA.max < projB.min + ROBOT_OVERLAP_EPS) return false;
      if (projB.max < projA.min + ROBOT_OVERLAP_EPS) return false;
    }
    return true;
  };

  const getRobotPriority = (robot) => {
    const direct = Number(
      robot?.priority ?? robot?.trafficPriority ?? robot?.meta?.priority ?? 0
    );
    return Number.isFinite(direct) ? direct : 0;
  };

  const getRobotPriorityById = (robotId) => {
    if (!robotId) return 0;
    const robot = robots.find((item) => item.id === robotId);
    return getRobotPriority(robot);
  };

  const getRobotMotionProfile = (robot) => {
    const maxSpeed = Number(robot?.maxSpeed);
    const speedMultiplier = Number(robot?.speedMultiplier ?? robot?.speedScale);
    const baseSpeed = robotSpeedMps;
    let speedMps = baseSpeed;
    if (Number.isFinite(maxSpeed) && maxSpeed > 0) {
      speedMps = maxSpeed;
    } else if (Number.isFinite(speedMultiplier) && speedMultiplier > 0) {
      speedMps = baseSpeed * speedMultiplier;
    }
    speedMps = Math.max(0.05, speedMps);
    const scale = baseSpeed > 0 ? speedMps / baseSpeed : 1;
    return {
      speedMps,
      accelMps2: robotAccelMps2 * scale,
      decelMps2: robotDecelMps2 * scale,
      turnRateRadS: robotTurnRateRadS * scale
    };
  };

  const getNodeReservationBufferMs = (robot, segment) => {
    if (!robot) return { approachMs: 0, clearMs: 0 };
    const model = getRobotEnvelopeModel(robot);
    const radius = Number(robot?.radius);
    const minSpan = Number.isFinite(radius) && radius > 0 ? radius : 0;
    const envelopeRadius = getRobotEnvelopeRadius(robot);
    const approachDist = Math.max(
      segment?.driveBackward ? model.tail : model.head,
      minSpan,
      envelopeRadius
    );
    const clearDist = Math.max(
      segment?.driveBackward ? model.head : model.tail,
      minSpan,
      envelopeRadius
    );
    const profile = getRobotMotionProfile(robot);
    const speed = Math.max(0.05, profile?.speedMps || robotSpeedMps);
    return {
      approachMs: (Math.max(0, approachDist) / speed) * 1000,
      clearMs: (Math.max(0, clearDist) / speed) * 1000
    };
  };

  const resolveEdgeConflictThresholds = (robotsList) => {
    let maxWidth = DEFAULT_ROBOT_MODEL.width;
    let maxLength = DEFAULT_ROBOT_MODEL.head + DEFAULT_ROBOT_MODEL.tail;
    if (Array.isArray(robotsList)) {
      robotsList.forEach((robot) => {
        if (!robot) return;
        const dims = getRobotEnvelopeDims(robot);
        if (Number.isFinite(dims.width)) {
          maxWidth = Math.max(maxWidth, dims.width);
        }
        if (Number.isFinite(dims.length)) {
          maxLength = Math.max(maxLength, dims.length);
        }
      });
    }
    const diagonal = Math.hypot(maxLength, maxWidth);
    const buffer = Math.max(0.05, OBSTACLE_CLEARANCE);
    return {
      parallel: maxWidth + buffer,
      perpendicular: diagonal + buffer
    };
  };

  const resolveMaxRobotHead = (robotsList) => {
    let maxHead = DEFAULT_ROBOT_MODEL.head;
    if (Array.isArray(robotsList)) {
      robotsList.forEach((robot) => {
        if (!robot) return;
        const model = getRobotEnvelopeModel(robot);
        if (Number.isFinite(model.head)) {
          maxHead = Math.max(maxHead, model.head);
        }
      });
    }
    return maxHead;
  };

  const resolveForwardStopDistance = (robot) => {
    const direct = Number(
      robot?.forwardStopDistanceM ??
      robot?.forwardStopDistance ??
      robot?.stopDistanceLookahead
    );
    if (Number.isFinite(direct)) return Math.max(0, direct);
    const trafficConfig = robotsConfig?.traffic || {};
    const config = Number(
      trafficConfig.forwardStopDistanceM ??
      trafficConfig.forwardStopDistance ??
      trafficConfig.stopDistanceLookahead
    );
    if (Number.isFinite(config)) return Math.max(0, config);
    const strategyValue = Number(trafficStrategy?.getForwardStopDistance?.(robot));
    if (Number.isFinite(strategyValue)) return Math.max(0, strategyValue);
    return 0;
  };

  const getTrafficSpacing = (robot) => {
    const envelopeRadius = getRobotEnvelopeRadius(robot);
    const baseStop = Math.max(ROBOT_STOP_DISTANCE, envelopeRadius * 2 - 0.1);
    const baseYield = Math.max(ROBOT_YIELD_DISTANCE, baseStop + 0.6);
    const defaults = {
      stop: baseStop,
      yield: baseYield,
      baseRadius: envelopeRadius
    };
    if (!trafficStrategy || !trafficStrategy.getSpacing) {
      if (!yieldEnabled) {
        return { ...defaults, yield: defaults.stop };
      }
      return defaults;
    }
    const spacing = trafficStrategy.getSpacing(robot, defaults);
    if (!spacing || !Number.isFinite(spacing.stop) || !Number.isFinite(spacing.yield)) {
      if (!yieldEnabled) {
        return { ...defaults, yield: defaults.stop };
      }
      return defaults;
    }
    if (!yieldEnabled) {
      return { ...spacing, yield: spacing.stop };
    }
    return spacing;
  };

  const getReservationSegmentLength = () => {
    if (!trafficStrategy?.useSegmentReservations?.()) return null;
    const raw = trafficStrategy.getReservationSegmentLength?.();
    const value = Number(raw);
    if (Number.isFinite(value) && value > 0) return value;
    const defaultLength = Math.max(
      ROBOT_RADIUS * 4,
      robotSpeedMps * 2,
      DEFAULT_ROBOT_MODEL.head + DEFAULT_ROBOT_MODEL.tail
    );
    return defaultLength;
  };

  const getReservationProfile = (robot) => {
    if (!trafficStrategy?.useTimeReservations?.()) return null;
    const horizonMs = trafficStrategy.getReservationHorizonMs(robot);
    const stepMs = trafficStrategy.getReservationStepMs(robot);
    const safetyMs = trafficStrategy.getReservationSafetyMs(robot);
    const nodeDwellMs = trafficStrategy.getReservationNodeDwellMs(robot);
    const profile = getRobotMotionProfile(robot);
    const speed = Math.max(0.05, profile?.speedMps || robotSpeedMps);
    const minSafetyMs = ((maxRobotHead + ROBOT_COLLISION_MARGIN) / speed) * 1000;
    const timeScale =
      Number.isFinite(speedMultiplier) && speedMultiplier > 0 ? 1 / speedMultiplier : 1;
    const scaleMs = (value, min) => Math.max(min, Math.round(value * timeScale));
    const baseHorizonMs = Number.isFinite(horizonMs) ? horizonMs : RESERVATION_DEFAULT_HORIZON_MS;
    const baseStepMs = Number.isFinite(stepMs) ? stepMs : RESERVATION_DEFAULT_STEP_MS;
    const baseSafetyMs = Number.isFinite(safetyMs) ? safetyMs : RESERVATION_DEFAULT_SAFETY_MS;
    const baseNodeDwellMs = Number.isFinite(nodeDwellMs)
      ? nodeDwellMs
      : RESERVATION_DEFAULT_NODE_DWELL_MS;
    return {
      horizonMs: scaleMs(baseHorizonMs, 2000),
      stepMs: scaleMs(baseStepMs, 20),
      safetyMs: Math.max(scaleMs(baseSafetyMs, 40), minSafetyMs),
      nodeDwellMs: scaleMs(baseNodeDwellMs, 30)
    };
  };

  const getRobustnessProfile = () => {
    if (robustnessProfile) return robustnessProfile;
    if (trafficStrategy?.getRobustnessProfile) {
      robustnessProfile = trafficStrategy.getRobustnessProfile();
      return robustnessProfile;
    }
    if (TrafficStrategies?.resolveRobustnessProfile) {
      const trafficConfig = robotsConfig?.traffic || {};
      robustnessProfile = TrafficStrategies.resolveRobustnessProfile(trafficConfig);
      return robustnessProfile;
    }
    return null;
  };

  const resolveScheduleSlackStatsConfig = (robot) => {
    const profile = getRobustnessProfile();
    const timingConfig = profile?.timingModel || {};
    const alphaOverride = trafficStrategy?.getScheduleSlackEwmaAlpha?.(robot);
    const percentileOverride = trafficStrategy?.getScheduleSlackPercentile?.(robot);
    const sampleSizeOverride = trafficStrategy?.getScheduleSlackSampleSize?.(robot);
    const alpha = Number.isFinite(alphaOverride)
      ? alphaOverride
      : Number.isFinite(timingConfig.ewmaAlpha)
        ? timingConfig.ewmaAlpha
        : 0.3;
    const percentile = Number.isFinite(percentileOverride)
      ? percentileOverride
      : Number.isFinite(timingConfig.percentile)
        ? timingConfig.percentile
        : 0.95;
    const sampleSize = Number.isFinite(sampleSizeOverride)
      ? sampleSizeOverride
      : Number.isFinite(timingConfig.p95Window)
        ? timingConfig.p95Window
        : 20;
    return {
      alpha: clamp(Number.isFinite(alpha) ? alpha : 0.3, 0.05, 0.95),
      percentile: clamp(Number.isFinite(percentile) ? percentile : 0.9, 0.5, 0.99),
      sampleSize: clamp(
        Number.isFinite(sampleSize) ? Math.round(sampleSize) : 20,
        5,
        120
      )
    };
  };

  const computeDelayPercentile = (samples, percentile) => {
    if (!Array.isArray(samples) || samples.length === 0) return null;
    const sorted = [...samples].sort((a, b) => a - b);
    const index = Math.min(
      sorted.length - 1,
      Math.max(0, Math.floor(percentile * (sorted.length - 1)))
    );
    return sorted[index];
  };

  const ensureScheduleDelayStats = (robotId) => {
    if (!robotId) return null;
    let stats = scheduleDelayStats.get(robotId);
    if (!stats) {
      stats = { ewmaMs: null, samples: [], lastUpdatedAt: null };
      scheduleDelayStats.set(robotId, stats);
    }
    return stats;
  };

  const recordScheduleDelay = (robotId, delayMs, config, nowMs) => {
    if (!robotId) return;
    if (!Number.isFinite(delayMs)) return;
    const stats = ensureScheduleDelayStats(robotId);
    if (!stats) return;
    const alpha = config.alpha;
    const nextDelay = Math.max(0, delayMs);
    if (Number.isFinite(stats.ewmaMs)) {
      stats.ewmaMs += alpha * (nextDelay - stats.ewmaMs);
    } else {
      stats.ewmaMs = nextDelay;
    }
    if (config.sampleSize > 0) {
      stats.samples.push(nextDelay);
      if (stats.samples.length > config.sampleSize) {
        stats.samples.shift();
      }
    }
    stats.lastUpdatedAt = Number.isFinite(nowMs) ? nowMs : Date.now();
  };

  const resolveScheduleSlackMs = (robot, segment, timingInfo = {}) => {
    const profile = getRobustnessProfile();
    const strategySlack = trafficStrategy?.getScheduleSlackMs?.(robot);
    const baseSlackMs = Number.isFinite(strategySlack)
      ? Math.max(0, strategySlack)
      : Number.isFinite(profile?.baseSlackMs)
        ? Math.max(0, profile.baseSlackMs)
        : 0;
    const dynamic = profile?.dynamicSlack || {};
    const adaptiveEnabled =
      dynamic.enabled === true || trafficStrategy?.useAdaptiveScheduleSlack?.() === true;
    if (!adaptiveEnabled) {
      return baseSlackMs;
    }
    const edgeKey =
      resolveTimeReservationEdgeKey(segment, robot) ||
      segment?.edgeGroupKey ||
      segment?.edgeKey ||
      null;
    const slipP95 = timingModel ? timingModel.getSlipP95(edgeKey, robot?.id) : null;
    let basis =
      Number.isFinite(slipP95) && slipP95 > 0
        ? slipP95
        : null;
    if (basis == null && Number.isFinite(timingInfo.uncertaintyMs)) {
      basis = Math.max(0, timingInfo.uncertaintyMs);
    }
    if (basis == null && robot?.id) {
      const stats = scheduleDelayStats.get(robot.id);
      if (stats) {
        const config = resolveScheduleSlackStatsConfig(robot);
        const percentileDelay = computeDelayPercentile(stats.samples, config.percentile);
        const ewmaDelay = Number.isFinite(stats.ewmaMs) ? stats.ewmaMs : 0;
        basis = Math.max(
          Number.isFinite(percentileDelay) ? percentileDelay : 0,
          ewmaDelay
        );
      }
    }
    const factor = Number.isFinite(dynamic.k) ? dynamic.k : 0;
    const minOverride = trafficStrategy?.getScheduleSlackMinMs?.(robot);
    const maxOverride = trafficStrategy?.getScheduleSlackMaxMs?.(robot);
    const minSlackMs = Number.isFinite(minOverride)
      ? Math.max(0, minOverride)
      : Number.isFinite(dynamic.min)
        ? Math.max(0, dynamic.min)
        : baseSlackMs;
    const maxSlackMs = Number.isFinite(maxOverride)
      ? Math.max(minSlackMs, maxOverride)
      : Number.isFinite(dynamic.max)
        ? Math.max(minSlackMs, dynamic.max)
        : Math.max(minSlackMs, baseSlackMs);
    let target = baseSlackMs + factor * (basis || 0);
    target = clamp(target, minSlackMs, maxSlackMs);
    if (segment?.criticalSectionId) {
      const multiplier = Number.isFinite(profile?.criticalSections?.slackMultiplier)
        ? profile.criticalSections.slackMultiplier
        : 1;
      if (Number.isFinite(multiplier) && multiplier > 1) {
        target = Math.min(maxSlackMs, target * multiplier);
      }
    }
    return target;
  };

  const useTurnTimeReservations = () =>
    Boolean(trafficStrategy?.useTurnTimeReservations?.());

  const resolveTimeReservationEdgeKey = (segment, robot) => {
    if (!segment) return null;
    const baseKey =
      segment.edgeBaseGroupKey || segment.edgeGroupKey || segment.edgeKey || null;
    const groupKey = segment.edgeGroupKey || segment.edgeKey || null;
    if (isSingleLaneSegment(segment, robot)) {
      return baseKey || groupKey;
    }
    return groupKey || baseKey;
  };

  const resolveEdgeLockKey = (segment, robot) => {
    if (!segment) return null;
    const baseKey = segment.edgeBaseGroupKey || segment.edgeGroupKey || null;
    const groupKey = segment.edgeGroupKey || baseKey || null;
    if (isSingleLaneSegment(segment, robot)) {
      return baseKey || groupKey;
    }
    return groupKey || baseKey;
  };

  const collectEdgeConflictKeys = (primaryKey, conflictKey, options = {}) => {
    const keys = new Set();
    if (primaryKey) keys.add(primaryKey);
    const includeBaseKey = Boolean(
      options.includeBaseKey ?? (primaryKey && primaryKey === conflictKey)
    );
    if (includeBaseKey && conflictKey) {
      keys.add(conflictKey);
    }
    const conflicts = conflictKey ? edgeConflictGroups.get(conflictKey) : null;
    if (conflicts && conflicts.size) {
      conflicts.forEach((key) => keys.add(key));
    }
    return Array.from(keys.values());
  };

  const resolveReservationPriority = (robot, other) => {
    if (!trafficStrategy?.useTimeReservations?.()) return null;
    const runtime = robotRuntime.get(robot?.id);
    const otherRuntime = robotRuntime.get(other?.id);
    if (!runtime?.route || !otherRuntime?.route) return null;
    const entry = getRouteScheduleEntry(runtime.route, runtime.route.segmentIndex);
    const otherEntry = getRouteScheduleEntry(otherRuntime.route, otherRuntime.route.segmentIndex);
    if (!entry || !otherEntry) return null;
    const nodeId =
      entry.toNodeId && !String(entry.toNodeId).startsWith('__') ? entry.toNodeId : null;
    const otherNodeId =
      otherEntry.toNodeId && !String(otherEntry.toNodeId).startsWith('__')
        ? otherEntry.toNodeId
        : null;
    if (
      nodeId &&
      nodeId === otherNodeId &&
      Number.isFinite(entry.arrivalTime) &&
      Number.isFinite(otherEntry.arrivalTime) &&
      Math.abs(entry.arrivalTime - otherEntry.arrivalTime) > 1
    ) {
      return entry.arrivalTime < otherEntry.arrivalTime;
    }
    const edgeKey =
      entry.edgeBaseGroupKey || entry.edgeGroupKey || entry.edgeKey || null;
    const otherEdgeKey =
      otherEntry.edgeBaseGroupKey || otherEntry.edgeGroupKey || otherEntry.edgeKey || null;
    if (
      edgeKey &&
      edgeKey === otherEdgeKey &&
      Number.isFinite(entry.startTime) &&
      Number.isFinite(otherEntry.startTime) &&
      Math.abs(entry.startTime - otherEntry.startTime) > 1
    ) {
      return entry.startTime < otherEntry.startTime;
    }
    const hold = runtime.entryHold;
    const otherHold = otherRuntime.entryHold;
    if (
      hold?.edgeKey &&
      hold.edgeKey === otherHold?.edgeKey &&
      Number.isFinite(hold.startTime) &&
      Number.isFinite(otherHold.startTime) &&
      Math.abs(hold.startTime - otherHold.startTime) > 1
    ) {
      return hold.startTime < otherHold.startTime;
    }
    return null;
  };

  const getRuntimeEdgeLockKey = (runtime, robot) => {
    if (!runtime?.route) return null;
    const segment = runtime.route.segments?.[runtime.route.segmentIndex] || null;
    return resolveEdgeLockKey(segment, robot);
  };

  const resolveEdgeLockPriority = (robot, other) => {
    if (!robot?.id || !other?.id) return null;
    const runtime = robotRuntime.get(robot.id);
    const otherRuntime = robotRuntime.get(other.id);
    const selfKey = getRuntimeEdgeLockKey(runtime, robot);
    const otherKey = getRuntimeEdgeLockKey(otherRuntime, other);
    if (!selfKey || !otherKey || selfKey !== otherKey) return null;
    const lockMap = edgeLocks.get(selfKey);
    if (!lockMap) return null;
    const selfHas = lockMap.has(robot.id);
    const otherHas = lockMap.has(other.id);
    if (selfHas !== otherHas) return selfHas;
    return null;
  };

  const resolveDirectionalPriority = (robot, other) => {
    if (!robot?.pos || !other?.pos) return null;
    const heading = Number.isFinite(robot.heading) ? robot.heading : 0;
    const otherHeading = Number.isFinite(other.heading) ? other.heading : 0;
    const headingDiff = Math.abs(normalizeAngle(heading - otherHeading));
    if (headingDiff > Math.PI / 6) return null;
    const forward = { x: Math.cos(heading), y: Math.sin(heading) };
    const dx = other.pos.x - robot.pos.x;
    const dy = other.pos.y - robot.pos.y;
    const projection = dx * forward.x + dy * forward.y;
    if (Math.abs(projection) <= ROBOT_OVERLAP_EPS) return null;
    return projection < 0;
  };

  const TRAFFIC_HOLD_REASONS = new Set(['traffic', 'traffic_overlap']);

  const resolveTrafficHoldPriority = (robot, other, nowMs) => {
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const selfRuntime = robotRuntime.get(robot?.id);
    const otherRuntime = robotRuntime.get(other?.id);
    const selfHold = selfRuntime?.lastTrafficBlock || null;
    const otherHold = otherRuntime?.lastTrafficBlock || null;
    const selfYield =
      selfHold &&
      TRAFFIC_HOLD_REASONS.has(selfHold.reason) &&
      selfHold.blockingId === other?.id &&
      (Number.isFinite(selfHold.holdUntil)
        ? now < selfHold.holdUntil
        : Number.isFinite(selfHold.at)
          ? now - selfHold.at <= HOLD_STATE_GRACE_MS
          : false);
    if (selfYield) return false;
    const otherYield =
      otherHold &&
      TRAFFIC_HOLD_REASONS.has(otherHold.reason) &&
      otherHold.blockingId === robot?.id &&
      (Number.isFinite(otherHold.holdUntil)
        ? now < otherHold.holdUntil
        : Number.isFinite(otherHold.at)
          ? now - otherHold.at <= HOLD_STATE_GRACE_MS
          : false);
    if (otherYield) return true;
    return null;
  };

  const isRobotNearNode = (robot, nodeId) => {
    if (!robot?.pos || !nodeId) return false;
    const node = navGraph?.nodesById?.get(nodeId);
    if (!node?.pos) return false;
    const lockRadius = resolveNodeLockRadius(robot);
    const occupancyRange = Math.max(
      lockRadius,
      getRobotEnvelopeRadius(robot) + ROBOT_COLLISION_MARGIN
    );
    const dist = distanceBetweenPoints(robot.pos, node.pos);
    return Number.isFinite(dist) && dist <= occupancyRange + NODE_LOCK_DISTANCE_HYSTERESIS;
  };

  const resolveNodeLockPriority = (robot, other) => {
    const runtime = robotRuntime.get(robot?.id);
    const otherRuntime = robotRuntime.get(other?.id);
    const nodeId = runtime?.route?.segments?.[runtime.route.segmentIndex]?.toNodeId || null;
    const otherNodeId =
      otherRuntime?.route?.segments?.[otherRuntime.route.segmentIndex]?.toNodeId || null;
    if (!nodeId || nodeId !== otherNodeId) return null;
    const lock = nodeLocks.get(nodeId);
    if (!lock?.holderId) return null;
    if (lock.holderId === robot?.id) {
      return isRobotNearNode(robot, nodeId) ? true : null;
    }
    if (lock.holderId === other?.id) {
      return isRobotNearNode(other, nodeId) ? false : null;
    }
    return null;
  };

  const resolveTrafficPriority = (robot, other) => {
    const runtime = robotRuntime.get(robot?.id);
    const otherRuntime = robotRuntime.get(other?.id);
    const selfCollision =
      runtime?.blockedReason === 'collision' || robot?.manualBlockedReason === 'collision';
    const otherCollision =
      otherRuntime?.blockedReason === 'collision' || other?.manualBlockedReason === 'collision';
    if (selfCollision !== otherCollision) return otherCollision;
    const selfActive = Boolean(runtime?.route);
    const otherActive = Boolean(otherRuntime?.route);
    if (selfActive !== otherActive) return selfActive;
    const useNodePriority =
      shouldUseNodeLocksForRuntime(runtime) || shouldUseNodeLocksForRuntime(otherRuntime);
    if (useNodePriority) {
      const nodeLockPriority = resolveNodeLockPriority(robot, other);
      if (nodeLockPriority !== null) return nodeLockPriority;
    }
    const trafficHoldPriority = resolveTrafficHoldPriority(robot, other);
    if (trafficHoldPriority !== null) return trafficHoldPriority;
    const directional = resolveDirectionalPriority(robot, other);
    if (directional !== null) return directional;
    const reservationPriority = resolveReservationPriority(robot, other);
    if (reservationPriority !== null) return reservationPriority;
    const selfPriority = getRobotPriority(robot);
    const otherPriority = getRobotPriority(other);
    if (selfPriority !== otherPriority) {
      return selfPriority > otherPriority;
    }
    const deterministicRightOfWay = Boolean(trafficStrategy?.useDeterministicRightOfWay?.());
    if (!deterministicRightOfWay) {
      const selfSince = resolveRuntimeWaitSince(runtime);
      const otherSince = resolveRuntimeWaitSince(otherRuntime);
      if (Number.isFinite(selfSince) && Number.isFinite(otherSince) && selfSince !== otherSince) {
        return selfSince < otherSince;
      }
      if (Number.isFinite(selfSince) && !Number.isFinite(otherSince)) return true;
      if (!Number.isFinite(selfSince) && Number.isFinite(otherSince)) return false;
    }
    const order = String(robot?.id || '').localeCompare(String(other?.id || ''));
    if (order !== 0) return order < 0;
    return null;
  };

  const compareTrafficPriority = (robot, other) => {
    const runtime = robotRuntime.get(robot?.id);
    const otherRuntime = robotRuntime.get(other?.id);
    const selfCollision =
      runtime?.blockedReason === 'collision' || robot?.manualBlockedReason === 'collision';
    const otherCollision =
      otherRuntime?.blockedReason === 'collision' || other?.manualBlockedReason === 'collision';
    if (selfCollision !== otherCollision) return selfCollision ? 1 : -1;
    const selfActive = Boolean(runtime?.route);
    const otherActive = Boolean(otherRuntime?.route);
    if (selfActive !== otherActive) return selfActive ? -1 : 1;
    const useNodePriority =
      shouldUseNodeLocksForRuntime(runtime) || shouldUseNodeLocksForRuntime(otherRuntime);
    if (useNodePriority) {
      const nodeLockPriority = resolveNodeLockPriority(robot, other);
      if (nodeLockPriority !== null) return nodeLockPriority ? -1 : 1;
    }
    const trafficHoldPriority = resolveTrafficHoldPriority(robot, other);
    if (trafficHoldPriority !== null) return trafficHoldPriority ? -1 : 1;
    const directional = resolveDirectionalPriority(robot, other);
    if (directional !== null) return directional ? -1 : 1;
    const reservationPriority = resolveReservationPriority(robot, other);
    if (reservationPriority !== null) return reservationPriority ? -1 : 1;
    const selfPriority = getRobotPriority(robot);
    const otherPriority = getRobotPriority(other);
    if (selfPriority !== otherPriority) {
      return selfPriority > otherPriority ? -1 : 1;
    }
    const deterministicRightOfWay = Boolean(trafficStrategy?.useDeterministicRightOfWay?.());
    if (!deterministicRightOfWay) {
      const selfSince = resolveRuntimeWaitSince(runtime);
      const otherSince = resolveRuntimeWaitSince(otherRuntime);
      if (Number.isFinite(selfSince) && Number.isFinite(otherSince) && selfSince !== otherSince) {
        return selfSince < otherSince ? -1 : 1;
      }
      if (Number.isFinite(selfSince) && !Number.isFinite(otherSince)) return -1;
      if (!Number.isFinite(selfSince) && Number.isFinite(otherSince)) return 1;
    }
    const order = String(robot?.id || '').localeCompare(String(other?.id || ''));
    if (order !== 0) return order;
    return 0;
  };

  const forceEdgeLockYield = (blocker, blockerRuntime, edgeGroupKey, requesterId) => {
    if (!yieldEnabled) return false;
    if (!blocker || !blockerRuntime) return false;
    if (blockerRuntime.mode === 'manual' || blockerRuntime.phase === 'yield') return false;
    if (blockerRuntime.paused || blocker.blocked) return false;
    const now = Date.now();
    if (isRuntimeWaitingOnReservation(blockerRuntime, now)) return false;
    const cooldown = resolveStrategyValue(
      trafficStrategy?.getYieldCooldownMs?.(blocker),
      2500
    );
    if (blockerRuntime.lastYieldAt && now - blockerRuntime.lastYieldAt < cooldown) {
      return false;
    }
    if (
      blockerRuntime.edgeLockYieldAt &&
      now - blockerRuntime.edgeLockYieldAt < Math.min(1200, cooldown)
    ) {
      return false;
    }
    blockerRuntime.edgeLockYieldAt = now;
    const backoff = resolveStrategyValue(
      trafficStrategy?.getYieldBackoffDistance?.(blocker),
      YIELD_BACKOFF_DISTANCE
    );
    const yieldTarget = computeYieldTarget(blocker, blockerRuntime, backoff);
    if (!yieldTarget) return false;
    blockerRuntime.edgeLockYield = {
      edgeGroupKey: edgeGroupKey || null,
      requesterId: requesterId || null,
      at: now
    };
    blockerRuntime.resumePhase = blockerRuntime.phase;
    blockerRuntime.resumeRouteGoal = blockerRuntime.routeGoal ? { ...blockerRuntime.routeGoal } : null;
    blockerRuntime.phase = 'yield';
    blockerRuntime.target = { ...yieldTarget };
    blockerRuntime.targetHeading = null;
    blockerRuntime.route = null;
    blockerRuntime.avoidance = null;
    blockerRuntime.lastYieldAt = now;
    blockerRuntime.yieldStartedAt = now;
    blockerRuntime.yieldAttempts = 1;
    clearRuntimeStall(blockerRuntime);
    clearRuntimeStuck(blockerRuntime);
    releaseRobotEdgeLocks(blocker.id);
    refreshRouteSchedulesAfterRelease(blocker.id);
    blockerRuntime.entryHold = null;
    blockerRuntime.entryHoldBypass = null;
    invalidateEntryHoldWaiterCache();
    blockerRuntime.scheduleSlip = null;
    blockerRuntime.scheduleResyncAfterSegment = false;
    blockerRuntime.scheduleResyncAt = null;
    blockerRuntime.edgeLockHold = null;
    blockerRuntime.nodeLockHold = null;
    updateRobotState(blocker.id, { activity: 'yielding' });
    if (blockerRuntime.taskId) {
      updateTask(blockerRuntime.taskId, { phase: 'yield' });
    }
    return true;
  };

const getEntryHoldStopAt = (segment, entryHold) => {
  if (!segment || !entryHold) return null;
  const buffer = Number(entryHold.buffer);
  if (!Number.isFinite(segment.totalLength) || !Number.isFinite(buffer)) return null;
  return Math.max(0, segment.totalLength - buffer);
};

const isRuntimeAtEntryHoldStop = (runtime) => {
  if (!runtime?.entryHold || !runtime?.route) return false;
  const segment = runtime.route.segments?.[runtime.route.segmentIndex];
  const stopAt = getEntryHoldStopAt(segment, runtime.entryHold);
  if (!Number.isFinite(stopAt)) return false;
  const progress = Number.isFinite(runtime.route.segmentProgress) ? runtime.route.segmentProgress : 0;
  return progress >= stopAt - ROUTE_PROGRESS_EPS;
};

const isRuntimeWaitingOnEntryHoldNode = (runtime, nodeId) => {
  if (!runtime?.entryHold || !nodeId) return false;
  const conflict = runtime.entryHold.conflict || null;
  if (!conflict || conflict.type !== 'node') return false;
  if (conflict.key !== nodeId) return false;
  if (runtime.paused) return false;
  return isRuntimeAtEntryHoldStop(runtime);
};

const invalidateEntryHoldWaiterCache = () => {
  entryHoldWaiterCacheDirty = true;
};

const getEntryHoldWaiterState = (runtime) => {
  if (!runtime?.entryHold || runtime.paused) return null;
  if (!isRuntimeAtEntryHoldStop(runtime)) return null;
  const edgeKey = runtime.entryHold.edgeKey || null;
  const conflict = runtime.entryHold.conflict || null;
  const nodeKey = conflict && conflict.type === 'node' ? conflict.key || null : null;
  if (!edgeKey && !nodeKey) return null;
  return { edgeKey, nodeKey };
};

const buildEntryHoldWaiterCache = () => {
  const edgeCounts = new Map();
  const nodeCounts = new Map();
  const robotStates = new Map();
  robotRuntime.forEach((runtime, robotId) => {
    const state = getEntryHoldWaiterState(runtime);
    robotStates.set(robotId, state);
    if (state?.edgeKey) {
      edgeCounts.set(state.edgeKey, (edgeCounts.get(state.edgeKey) || 0) + 1);
    }
    if (state?.nodeKey) {
      nodeCounts.set(state.nodeKey, (nodeCounts.get(state.nodeKey) || 0) + 1);
    }
  });
  entryHoldWaiterCache = {
    tick: tickCounter,
    edgeCounts,
    nodeCounts,
    robotStates
  };
  entryHoldWaiterCacheDirty = false;
  return entryHoldWaiterCache;
};

const ensureEntryHoldWaiterCache = () => {
  if (
    entryHoldWaiterCache &&
    entryHoldWaiterCache.tick === tickCounter &&
    !entryHoldWaiterCacheDirty
  ) {
    return entryHoldWaiterCache;
  }
  return buildEntryHoldWaiterCache();
};

const syncEntryHoldWaiterCache = (robotId, runtime) => {
  if (!robotId) return;
  const cache = ensureEntryHoldWaiterCache();
  const prev = cache.robotStates.get(robotId) || null;
  if (prev?.edgeKey) {
    const next = (cache.edgeCounts.get(prev.edgeKey) || 0) - 1;
    if (next > 0) {
      cache.edgeCounts.set(prev.edgeKey, next);
    } else {
      cache.edgeCounts.delete(prev.edgeKey);
    }
  }
  if (prev?.nodeKey) {
    const next = (cache.nodeCounts.get(prev.nodeKey) || 0) - 1;
    if (next > 0) {
      cache.nodeCounts.set(prev.nodeKey, next);
    } else {
      cache.nodeCounts.delete(prev.nodeKey);
    }
  }
  const state = getEntryHoldWaiterState(runtime);
  cache.robotStates.set(robotId, state);
  if (state?.edgeKey) {
    cache.edgeCounts.set(state.edgeKey, (cache.edgeCounts.get(state.edgeKey) || 0) + 1);
  }
  if (state?.nodeKey) {
    cache.nodeCounts.set(state.nodeKey, (cache.nodeCounts.get(state.nodeKey) || 0) + 1);
  }
};

const dropEntryHoldWaiterCache = (robotId) => {
  if (!robotId) return;
  if (
    !entryHoldWaiterCache ||
    entryHoldWaiterCache.tick !== tickCounter ||
    entryHoldWaiterCacheDirty
  ) {
    entryHoldWaiterCacheDirty = true;
    return;
  }
  const cache = entryHoldWaiterCache;
  const prev = cache.robotStates.get(robotId) || null;
  if (prev?.edgeKey) {
    const next = (cache.edgeCounts.get(prev.edgeKey) || 0) - 1;
    if (next > 0) {
      cache.edgeCounts.set(prev.edgeKey, next);
    } else {
      cache.edgeCounts.delete(prev.edgeKey);
    }
  }
  if (prev?.nodeKey) {
    const next = (cache.nodeCounts.get(prev.nodeKey) || 0) - 1;
    if (next > 0) {
      cache.nodeCounts.set(prev.nodeKey, next);
    } else {
      cache.nodeCounts.delete(prev.nodeKey);
    }
  }
  cache.robotStates.delete(robotId);
};

const countEntryHoldNodeWaiters = (nodeId) => {
  if (!nodeId) return 0;
  const cache = ensureEntryHoldWaiterCache();
  return cache.nodeCounts.get(nodeId) || 0;
};

const countEntryHoldEdgeWaiters = (edgeKey) => {
  if (!edgeKey) return 0;
  const cache = ensureEntryHoldWaiterCache();
  return cache.edgeCounts.get(edgeKey) || 0;
};

const pickEntryHoldLeader = (edgeKey, options = {}) => {
  if (!edgeKey) return null;
  const ignoreNodeLocks = Boolean(options.ignoreNodeLocks);
  let leader = null;
  robotRuntime.forEach((runtime, robotId) => {
    if (!runtime?.entryHold || runtime.entryHold.edgeKey !== edgeKey) return;
    if (runtime.paused) return;
    if (!isRuntimeAtEntryHoldStop(runtime)) return;
    const robot = getRobotById(robotId);
    if (!robot) return;
    if (!ignoreNodeLocks) {
      const segment = runtime.route?.segments?.[runtime.route.segmentIndex] || null;
      const nodeHold = getNodeLockHold(robot, runtime, segment);
      if (nodeHold && nodeHold.holderId && nodeHold.holderId !== robot.id) {
        return;
      }
    }
    if (!leader) {
      leader = robot;
      return;
    }
    const priority = resolveTrafficPriority(robot, leader);
    if (priority === true) {
      leader = robot;
    } else if (priority === null) {
      const order = String(robot.id || '').localeCompare(String(leader.id || ''));
      if (order < 0) leader = robot;
    }
  });
  return leader;
};

const pickEntryHoldNodeLeader = (nodeId) => {
  if (!nodeId) return null;
  let leader = null;
  robotRuntime.forEach((runtime, robotId) => {
    if (!isRuntimeWaitingOnEntryHoldNode(runtime, nodeId)) return;
    const robot = getRobotById(robotId);
    if (!robot) return;
    if (!leader) {
      leader = robot;
      return;
    }
    const priority = resolveTrafficPriority(robot, leader);
    if (priority === true) {
      leader = robot;
    } else if (priority === null) {
      const order = String(robot.id || '').localeCompare(String(leader.id || ''));
      if (order < 0) leader = robot;
    }
  });
  return leader;
};

const getReservationEntryBuffer = (robot, segment) => {
    const direct = Number(
      robot?.reservationEntryBuffer ??
      robot?.entryBuffer ??
      robot?.segmentEntryBuffer ??
      robot?.stopLineBuffer
    );
    let baseBuffer = Number.isFinite(direct) ? Math.max(0, direct) : null;
    if (baseBuffer == null) {
      const trafficConfig = robotsConfig?.traffic || {};
      const config = Number(
        trafficConfig.reservationEntryBuffer ??
        trafficConfig.entryBuffer ??
        trafficConfig.segmentEntryBuffer ??
        trafficConfig.stopLineBuffer
      );
      baseBuffer = Number.isFinite(config) ? Math.max(0, config) : null;
    }
    if (baseBuffer == null) {
      const strategyValue = Number(
        trafficStrategy?.getReservationEntryBuffer?.(robot, segment)
      );
      baseBuffer = Number.isFinite(strategyValue) ? Math.max(0, strategyValue) : null;
    }
    if (baseBuffer == null) {
      baseBuffer = ROBOT_STOP_DISTANCE + 0.2;
    }
    const model = getRobotEnvelopeModel(robot);
    const forward = segment?.driveBackward ? model.tail : model.head;
    const minBuffer = Math.max(0, forward + maxRobotHead + ROBOT_COLLISION_MARGIN * 2);
    let buffer = Math.max(baseBuffer, minBuffer);
    const length = Number(segment?.totalLength);
    if (Number.isFinite(length) && length > 0) {
      buffer = Math.min(buffer, Math.max(0, length - ROUTE_PROGRESS_EPS));
    }
    return buffer;
  };

  const allowReservationBackoff = (robot) => {
    const direct = robot?.allowReservationBackoff ?? robot?.allowReverseBackoff;
    if (typeof direct === 'boolean') return direct;
    const trafficConfig = robotsConfig?.traffic || {};
    const config =
      trafficConfig.allowReservationBackoff ??
      trafficConfig.allowReverseBackoff ??
      trafficConfig.reservationBackoff;
    if (typeof config === 'boolean') return config;
    return false;
  };

  const resolveNodeLockMode = () => {
    return 'hard';
  };

  const shouldEnforceReservationWaits = () => {
    const trafficConfig = robotsConfig?.traffic || {};
    if (typeof trafficConfig.reservationWaits === 'boolean') return trafficConfig.reservationWaits;
    if (typeof trafficConfig.reservationWait === 'boolean') return trafficConfig.reservationWait;
    if (typeof trafficConfig.reservationBlocking === 'boolean') return trafficConfig.reservationBlocking;
    const mode = typeof trafficConfig.reservationWaitMode === 'string'
      ? trafficConfig.reservationWaitMode.trim().toLowerCase()
      : null;
    if (!mode) return true;
    if (mode === 'off' || mode === 'none' || mode === 'soft' || mode === 'ignore') return false;
    if (mode === 'strict' || mode === 'on' || mode === 'block') return true;
    return true;
  };

  const isSingleLaneSegment = (segment, robot) => {
    if (!segment) return false;
    const width = Number(segment.width);
    if (!Number.isFinite(width)) return true;
    if (width <= 0) return true;
    const dims = getRobotEnvelopeDims(robot);
    const baseWidth = Number.isFinite(dims?.width) ? dims.width : getRobotWidth(robot);
    const minWidth = baseWidth + OBSTACLE_CLEARANCE * 2;
    return width <= minWidth;
  };

  const ensureReservationTable = (profile) => {
    if (!ReservationTable || !profile) return null;
    const { horizonMs, safetyMs } = profile;
    if (
      !reservationTable ||
      !reservationConfig ||
      reservationConfig.horizonMs !== horizonMs ||
      reservationConfig.safetyMs !== safetyMs
    ) {
      reservationTable = new ReservationTable({ horizonMs, safetyMs });
      reservationConfig = { horizonMs, safetyMs };
    }
    return reservationTable;
  };

  const releaseTimeReservations = (robotId) => {
    if (!reservationTable || !robotId) return;
    reservationTable.releaseRobot(robotId);
    criticalSectionTable?.releaseRobot(robotId);
    recordEvent('reservation_release', { robotId });
  };

  const pruneTimeReservations = (nowMs) => {
    if (!reservationTable) return;
    reservationTable.prune(nowMs);
    if (criticalSectionTable && reservationTable?.getHorizonMs) {
      criticalSectionTable.prune(nowMs, reservationTable.getHorizonMs());
    } else if (criticalSectionTable) {
      criticalSectionTable.prune(nowMs, RESERVATION_DEFAULT_HORIZON_MS);
    }
  };

  const refreshAvoidanceLocks = () => {
    if (!trafficStrategy?.useAvoidanceLocks?.()) {
      if (avoidanceLocks.size) avoidanceLocks = new Map();
      return;
    }
    const next = new Map();
    robotRuntime.forEach((runtime, robotId) => {
      if (!runtime?.avoidance) return;
      const segment = runtime.route?.segments?.[runtime.route.segmentIndex || 0] || null;
      let key = segment?.edgeBaseGroupKey || segment?.edgeGroupKey || null;
      if (!key) {
        const robot = getRobotById(robotId);
        if (robot?.pos) {
          const edgeHit = findNearestEdge(robot.pos);
          key = edgeHit?.edge?.edgeBaseGroupKey || edgeHit?.edge?.edgeGroupKey || null;
        }
      }
      if (!key) return;
      const holders = next.get(key) || new Set();
      holders.add(robotId);
      next.set(key, holders);
    });
    avoidanceLocks = next;
  };

  const getAvoidanceBlockRadius = (robot) => {
    if (trafficStrategy?.getAvoidanceBlockRadius) {
      const value = trafficStrategy.getAvoidanceBlockRadius(robot);
      if (Number.isFinite(value)) return value;
    }
    return AVOIDANCE_BLOCK_RADIUS;
  };

  const getAvoidanceReleaseMargin = (robot) => {
    if (trafficStrategy?.getAvoidanceReleaseMargin) {
      const value = trafficStrategy.getAvoidanceReleaseMargin(robot);
      if (Number.isFinite(value)) return value;
    }
    return AVOIDANCE_RELEASE_MARGIN;
  };

  const getRuntimeSegment = (robotId) => {
    const runtime = robotRuntime.get(robotId);
    if (!runtime?.route) return null;
    const index = Number.isFinite(runtime.route.segmentIndex) ? runtime.route.segmentIndex : 0;
    const segment = runtime.route.segments && runtime.route.segments[index];
    if (!segment?.polyline || !Array.isArray(segment.polyline.points)) return null;
    return segment;
  };

  const shouldBlockAvoidanceZone = (zone, robot) => {
    if (!zone || !robot?.pos) return true;
    const segment = getRuntimeSegment(zone.ownerId);
    if (!segment) return true;
    const owner = getRobotById(zone.ownerId);
    const ownerRadius = getRobotEnvelopeRadius(owner);
    const robotRadius = getRobotEnvelopeRadius(robot);
    const corridor =
      Math.max(
        Number.isFinite(ownerRadius) ? ownerRadius : ROBOT_RADIUS,
        Number.isFinite(robotRadius) ? robotRadius : ROBOT_RADIUS
      ) * 1.6;
    const corridorWidth = Math.min(corridor, Math.max(0, zone.radius - 0.05));
    if (!Number.isFinite(corridorWidth) || corridorWidth <= 0) {
      return true;
    }
    const dist = distancePointToPolyline(robot.pos, segment.polyline);
    return dist <= corridorWidth;
  };

  const refreshAvoidanceZones = () => {
    if (!trafficStrategy?.useAvoidanceZones?.()) {
      if (avoidanceZones.size) avoidanceZones = new Map();
      return;
    }
    const now = Date.now();
    const activeOwners = new Set();

    robotRuntime.forEach((runtime, robotId) => {
      if (!runtime?.avoidance) return;
      const robot = getRobotById(robotId);
      if (!robot?.pos) return;
      activeOwners.add(robotId);
      const radius = getAvoidanceBlockRadius(robot);
      let zone = avoidanceZones.get(robotId);
      if (!zone) {
        zone = {
          ownerId: robotId,
          pos: { ...robot.pos },
          radius,
          createdAt: now,
          updatedAt: now,
          allowed: new Set([robotId]),
          passCompleted: false
        };
        const initialInside = [];
        robots.forEach((other) => {
          if (!other?.pos || other.id === robotId) return;
          if (distanceBetweenPoints(other.pos, zone.pos) <= radius) {
            zone.allowed.add(other.id);
            initialInside.push(other.id);
          }
        });
        if (initialInside.length) {
          zone.passCompleted = true;
        }
      } else {
        zone.pos = { ...robot.pos };
        zone.radius = radius;
        zone.updatedAt = now;
        zone.allowed.add(robotId);
      }

      const releaseMargin = getAvoidanceReleaseMargin(robot);
      let hasAllowedNonOwner = false;
      for (const allowedId of Array.from(zone.allowed)) {
        if (allowedId === robotId) continue;
        const other = getRobotById(allowedId);
        if (!other?.pos) {
          zone.allowed.delete(allowedId);
          continue;
        }
        const dist = distanceBetweenPoints(other.pos, zone.pos);
        if (dist > radius + releaseMargin) {
          zone.allowed.delete(allowedId);
          continue;
        }
        hasAllowedNonOwner = true;
      }

      if (!zone.passCompleted && !hasAllowedNonOwner) {
        const entering = [];
        robots.forEach((other) => {
          if (!other?.pos || other.id === robotId) return;
          if (distanceBetweenPoints(other.pos, zone.pos) <= radius) {
            entering.push(other.id);
          }
        });
        if (entering.length) {
          entering.forEach((id) => zone.allowed.add(id));
          zone.passCompleted = true;
        }
      }

      avoidanceZones.set(robotId, zone);
    });

    for (const ownerId of Array.from(avoidanceZones.keys())) {
      if (!activeOwners.has(ownerId)) {
        avoidanceZones.delete(ownerId);
      }
    }
  };

  const getAvoidanceBlock = (robot) => {
    if (!robot?.pos || !avoidanceZones.size) return null;
    for (const zone of avoidanceZones.values()) {
      if (!zone?.pos) continue;
      if (zone.ownerId === robot.id) continue;
      const dist = distanceBetweenPoints(robot.pos, zone.pos);
      if (dist <= zone.radius && !zone.allowed.has(robot.id)) {
        if (!shouldBlockAvoidanceZone(zone, robot)) {
          continue;
        }
        return zone;
      }
    }
    return null;
  };

  const isAvoidanceLocked = (edge, robotId) => {
    if (!trafficStrategy?.useAvoidanceLocks?.()) return false;
    if (!edge) return false;
    const key = edge.edgeBaseGroupKey || edge.edgeGroupKey;
    if (!key) return false;
    const holders = avoidanceLocks.get(key);
    if (!holders) return false;
    if (robotId && holders.has(robotId)) return false;
    return true;
  };

  const isVirtualNodeId = (nodeId) =>
    !nodeId || (typeof nodeId === 'string' && nodeId.startsWith('__'));

  const resolveNodeLockRadius = (robot) => {
    const envelopeRadius = getRobotEnvelopeRadius(robot);
    const configured = trafficStrategy?.getNodeLockRadius?.(robot);
    const base = Number.isFinite(configured) ? configured : ROBOT_RADIUS;
    return Math.max(base, envelopeRadius, ROBOT_RADIUS);
  };

  const resolveNodeLockClearance = (robot, holderRobot, segment) => {
    if (!robot) return null;
    const followerModel = getRobotEnvelopeModel(robot);
    const holderModel = holderRobot ? getRobotEnvelopeModel(holderRobot) : null;
    const followerLead = segment?.driveBackward
      ? followerModel.tail
      : followerModel.head;
    const followerExtent = Number.isFinite(followerLead) && followerLead > 0
      ? followerLead
      : getRobotEnvelopeRadius(robot);
    const holderExtentRaw = holderModel
      ? Math.max(holderModel.head || 0, holderModel.tail || 0)
      : null;
    const holderExtent = Number.isFinite(holderExtentRaw) && holderExtentRaw > 0
      ? holderExtentRaw
      : holderRobot
        ? getRobotEnvelopeRadius(holderRobot)
        : null;
    if (!Number.isFinite(followerExtent) || !Number.isFinite(holderExtent)) return null;
    return followerExtent + holderExtent + ROBOT_COLLISION_MARGIN;
  };

  const shouldUseNodeLocksForRuntime = (runtime) => {
    if (!trafficStrategy?.useNodeLocks?.()) return false;
    if (trafficStrategy?.useTimeReservations?.()) {
      const allow = trafficStrategy?.allowNodeLocksWithReservations?.();
      if (!allow) return false;
    }
    return true;
  };

  const refreshNodeLocks = (nowMs) => {
    if (!trafficStrategy?.useNodeLocks?.()) {
      if (nodeLocks.size) nodeLocks = new Map();
      return;
    }
    const nodeLockMode = resolveNodeLockMode();
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const ttlMs = Math.max(200, trafficStrategy.getNodeLockTtlMs?.() || 1500);
    const candidates = new Map();
    const runtimeLookup = new Map();
    robotRuntime.forEach((runtime, robotId) => {
      runtimeLookup.set(robotId, runtime);
    });
    pausedAutoRuntime.forEach((runtime, robotId) => {
      if (!runtimeLookup.has(robotId)) {
        runtimeLookup.set(robotId, runtime);
      }
    });
    robots.forEach((robot) => {
      if (!robot?.id || !robot.pos) return;
      if (robot.online === false) return;
      const runtime = runtimeLookup.get(robot.id) || null;
      if (!shouldUseNodeLocksForRuntime(runtime)) return;
      const segment = runtime?.route?.segments?.[runtime.route.segmentIndex] || null;
      const useTimeReservations =
        Boolean(trafficStrategy?.useTimeReservations?.()) && Boolean(runtime?.route?.schedule?.length);
      const lockRadius = resolveNodeLockRadius(robot);
      const corridorRange = resolveStrategyValue(
        trafficStrategy?.getNodeLockLookaheadM?.(robot),
        0
      );
      const lockRange = Math.max(
        lockRadius,
        ROBOT_STOP_DISTANCE + NODE_LOCK_APPROACH_MARGIN,
        corridorRange
      );
      const occupancyRange = Math.max(
        lockRadius,
        getRobotEnvelopeRadius(robot) + ROBOT_COLLISION_MARGIN
      );
      const seenNodes = new Set();
      const addNodeCandidate = (nodeId, expectedAt, dist, remaining, force = false) => {
        if (!nodeId || isVirtualNodeId(nodeId)) return;
        const normalizedId = String(nodeId);
        if (seenNodes.has(normalizedId)) return;
        const node = navGraph?.nodesById?.get(nodeId);
        if (!node?.pos) return;
        if (!force) {
          if (
            Number.isFinite(dist) &&
            Number.isFinite(remaining) &&
            dist > lockRange &&
            remaining > lockRange
          ) {
            return;
          }
        }
        seenNodes.add(normalizedId);
        const list = candidates.get(nodeId) || [];
        const occupied = Number.isFinite(dist) ? dist <= occupancyRange : false;
        list.push({
          robotId: robot.id,
          expectedAt,
          dist: Number.isFinite(dist) ? dist : null,
          occupied
        });
        candidates.set(nodeId, list);
      };
      const endNodeId = segment?.toNodeId || null;
      if (
        endNodeId &&
        !(
          trafficStrategy?.useTimeReservations?.() &&
          runtime?.entryHold?.startTime &&
          now + 50 < runtime.entryHold.startTime &&
          isRuntimeAtEntryHoldStop(runtime)
        )
      ) {
        const node = navGraph?.nodesById?.get(endNodeId);
        if (node?.pos) {
          const dist = distanceBetweenPoints(robot.pos, node.pos);
          const remaining = Number.isFinite(segment?.totalLength) &&
            Number.isFinite(runtime?.route?.segmentProgress)
            ? Math.max(0, segment.totalLength - runtime.route.segmentProgress)
            : dist;
          const profile = getRobotMotionProfile(robot);
          const fallbackSpeed = profile?.speedMps || robotSpeedMps;
          const speed = Math.max(0.1, Math.abs(robot.speed) || fallbackSpeed);
          const etaMs = (remaining / speed) * 1000;
          let expectedAt = now + etaMs;
          if (useTimeReservations && runtime?.route) {
            const entry = getRouteScheduleEntry(runtime.route, runtime.route.segmentIndex);
            if (entry && Number.isFinite(entry.arrivalTime)) {
              expectedAt = Math.max(now, entry.arrivalTime);
            }
          }
          addNodeCandidate(endNodeId, expectedAt, dist, remaining);
        }
      }
      const startNodeId = segment?.fromNodeId || null;
      if (startNodeId) {
        const startNode = navGraph?.nodesById?.get(startNodeId);
        if (startNode?.pos) {
          const dist = distanceBetweenPoints(robot.pos, startNode.pos);
          const progressed = Number.isFinite(runtime?.route?.segmentProgress)
            ? Math.max(0, runtime.route.segmentProgress)
            : dist;
          addNodeCandidate(startNodeId, now, dist, progressed);
        }
      }
      const lookaheadM = resolveStrategyValue(
        trafficStrategy?.getNodeLockLookaheadM?.(robot),
        0
      );
      const lookbackM = resolveStrategyValue(
        trafficStrategy?.getNodeLockLookbackM?.(robot),
        0
      );
      if ((lookaheadM > 0 || lookbackM > 0) && runtime?.route?.segments?.length) {
        const progress = Number.isFinite(runtime.route.segmentProgress)
          ? Math.max(0, runtime.route.segmentProgress)
          : 0;
        const segments = runtime.route.segments;
        const profile = getRobotMotionProfile(robot);
        const fallbackSpeed = profile?.speedMps || robotSpeedMps;
        const speed = Math.max(0.1, Math.abs(robot.speed) || fallbackSpeed);

        if (lookbackM > 0) {
          let remainingBack = lookbackM;
          if (startNodeId && Number.isFinite(progress) && progress <= remainingBack + ROUTE_PROGRESS_EPS) {
            const startNode = navGraph?.nodesById?.get(startNodeId);
            if (startNode?.pos) {
              const dist = distanceBetweenPoints(robot.pos, startNode.pos);
              addNodeCandidate(startNodeId, now, dist, progress, true);
            }
            remainingBack -= progress;
          }
          for (let idx = runtime.route.segmentIndex - 1; idx >= 0 && remainingBack > 0; idx -= 1) {
            const seg = segments[idx];
            const length = Number(seg?.totalLength);
            if (!Number.isFinite(length) || length <= 0) continue;
            const nodeId = seg?.fromNodeId || null;
            if (nodeId) {
              const node = navGraph?.nodesById?.get(nodeId);
              if (node?.pos) {
                const dist = distanceBetweenPoints(robot.pos, node.pos);
                addNodeCandidate(nodeId, now, dist, remainingBack, true);
              }
            }
            remainingBack -= length;
          }
        }

        if (lookaheadM > 0) {
          let remaining = lookaheadM;
          let travelled = 0;
          for (let idx = runtime.route.segmentIndex; idx < segments.length && remaining > 0; idx += 1) {
            const seg = segments[idx];
            const length = Number(seg?.totalLength);
            if (!Number.isFinite(length) || length <= 0) continue;
            const segRemaining =
              idx === runtime.route.segmentIndex ? Math.max(0, length - progress) : length;
            if (segRemaining <= 0) continue;
            travelled += segRemaining;
            remaining -= segRemaining;
            if (travelled > lookaheadM + ROUTE_PROGRESS_EPS) break;
            const nodeId = seg?.toNodeId || null;
            if (!nodeId) continue;
            const node = navGraph?.nodesById?.get(nodeId);
            if (!node?.pos) continue;
            const dist = distanceBetweenPoints(robot.pos, node.pos);
            const etaMs = (travelled / speed) * 1000;
            const expectedAt = now + etaMs;
            addNodeCandidate(nodeId, expectedAt, dist, travelled, true);
          }
        }
      }
      const goalNodeId = runtime?.routeGoal?.nodeId || null;
      if (goalNodeId) {
        const goalNode = navGraph?.nodesById?.get(goalNodeId);
        if (goalNode?.pos) {
          const goalDist = distanceBetweenPoints(robot.pos, goalNode.pos);
          if (Number.isFinite(goalDist) && goalDist <= lockRange) {
            addNodeCandidate(goalNodeId, now, goalDist, goalDist);
          }
        }
      }
      if (!segment) {
        const nodesById = navGraph?.nodesById;
        if (nodesById?.size) {
          let currentNodeId = null;
          let currentDist = Number.POSITIVE_INFINITY;
          for (const [nodeId, node] of nodesById.entries()) {
            if (!node?.pos) continue;
            const dist = distanceBetweenPoints(robot.pos, node.pos);
            if (!Number.isFinite(dist) || dist > occupancyRange) continue;
            if (dist < currentDist) {
              currentDist = dist;
              currentNodeId = nodeId;
            }
          }
          if (currentNodeId) {
            addNodeCandidate(currentNodeId, now, currentDist, currentDist, true);
          }
          for (const [nodeId, node] of nodesById.entries()) {
            if (!node?.pos) continue;
            const dist = distanceBetweenPoints(robot.pos, node.pos);
            if (!Number.isFinite(dist) || dist > lockRange) continue;
            addNodeCandidate(nodeId, now, dist, dist);
          }
        }
      }
    });
    const next = new Map();
    candidates.forEach((list, nodeId) => {
      if (!list.length) return;
      const existing = nodeLocks.get(nodeId);
      const existingCandidate = existing
        ? list.find((item) => item.robotId === existing.holderId)
        : null;
      const switchMarginMs = resolveStrategyValue(
        trafficStrategy?.getNodeLockSwitchMarginMs?.(),
        NODE_LOCK_SWITCH_MARGIN_MS
      );
      const occupied = list.filter((item) => item.occupied);
      const selection = occupied.length ? occupied : list;
      const deterministicRightOfWay = Boolean(trafficStrategy?.useDeterministicRightOfWay?.());
      selection.sort((a, b) => {
        if (a.occupied !== b.occupied) return a.occupied ? -1 : 1;
        const aDist = Number.isFinite(a.dist) ? a.dist : null;
        const bDist = Number.isFinite(b.dist) ? b.dist : null;
        if (aDist !== null && bDist !== null && aDist !== bDist) return aDist - bDist;
        if (!deterministicRightOfWay && a.expectedAt !== b.expectedAt) {
          return a.expectedAt - b.expectedAt;
        }
        return String(a.robotId).localeCompare(String(b.robotId));
      });
      const best = selection[0];
      if (existingCandidate?.occupied && existing.until > now) {
        next.set(nodeId, { holderId: existing.holderId, until: now + ttlMs });
        return;
      }
      const existingDist =
        existingCandidate && Number.isFinite(existingCandidate.dist) ? existingCandidate.dist : null;
      const challengerDist = best && Number.isFinite(best.dist) ? best.dist : null;
      const withinHysteresis =
        existingDist !== null &&
        challengerDist !== null &&
        challengerDist >= existingDist - NODE_LOCK_DISTANCE_HYSTERESIS;
      const existingEligible =
        existingCandidate && existing.until > now && (!occupied.length || existingCandidate.occupied);
      if (existingEligible) {
        if (nodeLockMode === 'hard') {
          next.set(nodeId, { holderId: existing.holderId, until: now + ttlMs });
          return;
        }
        if (
          existingCandidate.robotId === best.robotId ||
          (!deterministicRightOfWay &&
            Number.isFinite(existingCandidate.expectedAt) &&
            Number.isFinite(best.expectedAt) &&
            existingCandidate.expectedAt <= best.expectedAt + switchMarginMs) ||
          withinHysteresis
        ) {
          next.set(nodeId, { holderId: existing.holderId, until: now + ttlMs });
          return;
        }
      }
      next.set(nodeId, { holderId: best.robotId, until: now + ttlMs });
    });
    if (nodeLockMode === 'hard' && nodeLocks.size) {
      nodeLocks.forEach((lock, nodeId) => {
        if (next.has(nodeId)) return;
        if (!lock?.holderId) return;
        if (!Number.isFinite(lock.until) || lock.until <= now) return;
        const holderRobot = getRobotById(lock.holderId);
        if (!holderRobot?.pos) return;
        const holderRuntime = runtimeLookup.get(lock.holderId) || getRobotRuntime(lock.holderId);
        if (!shouldUseNodeLocksForRuntime(holderRuntime)) return;
        next.set(nodeId, { holderId: lock.holderId, until: lock.until });
      });
    }
    nodeLocks = next;
  };

  const getNodeLockHold = (robot, runtime, segment) => {
    if (!trafficStrategy?.useNodeLocks?.()) return null;
    if (!robot || !runtime || !segment) return null;
    if (!shouldUseNodeLocksForRuntime(runtime)) return null;
    const nodeLockMode = resolveNodeLockMode();
    const nodeId = segment.toNodeId || null;
    if (isVirtualNodeId(nodeId)) return null;
    const lock = nodeLocks.get(nodeId);
    if (!lock || !lock.holderId || lock.holderId === robot.id) return null;
    const node = navGraph?.nodesById?.get(nodeId);
    if (!node?.pos) return null;
    const holderRobot = getRobotById(lock.holderId);
    if (nodeLockMode !== 'hard') {
      const holderRuntime = getRobotRuntime(lock.holderId);
      if (holderRuntime) {
        const stalledByRobot =
          holderRuntime.stallOpponentId === robot.id &&
          ['traffic', 'edge_lock', 'node_lock'].includes(holderRuntime.stallReason);
        const edgeLockedByRobot = holderRuntime.edgeLockHold?.holderId === robot.id;
        if (stalledByRobot || edgeLockedByRobot) {
          const holderLockRadius = holderRobot ? resolveNodeLockRadius(holderRobot) : ROBOT_RADIUS;
          const holderClearance = Math.max(
            holderLockRadius,
            holderRobot ? getRobotEnvelopeRadius(holderRobot) + ROBOT_COLLISION_MARGIN : 0
          );
          const holderDist = holderRobot?.pos
            ? distanceBetweenPoints(holderRobot.pos, node.pos)
            : null;
          const holderNearNode =
            Number.isFinite(holderDist) && holderDist <= holderClearance + NODE_LOCK_DISTANCE_HYSTERESIS;
          if (!holderNearNode) {
            return null;
          }
        }
      }
    }
    const lockRadius = resolveNodeLockRadius(robot);
    const corridorRange = resolveStrategyValue(
      trafficStrategy?.getNodeLockLookaheadM?.(robot),
      0
    );
    const lockRange = Math.max(
      lockRadius,
      ROBOT_STOP_DISTANCE + NODE_LOCK_APPROACH_MARGIN,
      corridorRange
    );
    const extraClearance = resolveNodeLockClearance(robot, holderRobot, segment);
    const holdRange = Number.isFinite(extraClearance)
      ? Math.max(lockRange, extraClearance)
      : lockRange;
    const dist = distanceBetweenPoints(robot.pos, node.pos);
    const remaining = Number.isFinite(segment.totalLength) &&
      Number.isFinite(runtime.route?.segmentProgress)
      ? Math.max(0, segment.totalLength - runtime.route.segmentProgress)
      : dist;
    if (dist > holdRange && remaining > holdRange) return null;
    return { nodeId, holderId: lock.holderId };
  };

  const applyImmediateHoldAfterReplan = (robot, runtime, nowMs) => {
    if (!robot || !runtime?.route) return false;
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const segment = runtime.route.segments?.[runtime.route.segmentIndex] || null;
    if (!segment) return false;
    const ignoreTrafficBlocks = shouldIgnoreTrafficBlocks();
    const nodeLockHold = ignoreTrafficBlocks ? null : getNodeLockHold(robot, runtime, segment);
    runtime.nodeLockHold = nodeLockHold;
    if (nodeLockHold) {
      markRuntimeStall(runtime, 'node_lock', nodeLockHold.holderId);
      ensureRobotMotion(robot);
      robot.speed = 0;
      return true;
    }
    const allowEdgeLocksWithReservations =
      Boolean(trafficStrategy?.allowEdgeLocksWithReservations?.());
    const useEdgeLocks =
      !runtime?.avoidance &&
      !ignoreTrafficBlocks &&
      (!trafficStrategy?.useTimeReservations?.() ||
        !runtime.route.schedule?.length ||
        allowEdgeLocksWithReservations);
    if (useEdgeLocks) {
      const lockStatus = syncEdgeCorridorLocks(robot, runtime, now);
      if (!lockStatus.ok) {
        const hold = lockStatus.hold || null;
        runtime.edgeLockHold = {
          edgeGroupKey: lockStatus.edgeGroupKey || null,
          holderId: lockStatus.holder || null,
          stopSegmentIndex: hold?.segmentIndex ?? null,
          stopSegmentProgress: hold?.segmentProgress ?? null,
          stopDistance: hold?.distance ?? null
        };
        const stopNow = !hold ||
          (Number.isFinite(hold.segmentIndex) &&
            hold.segmentIndex === runtime.route.segmentIndex &&
            Number.isFinite(hold.segmentProgress) &&
            Number.isFinite(runtime.route.segmentProgress) &&
            runtime.route.segmentProgress >= hold.segmentProgress - ROUTE_PROGRESS_EPS);
        if (stopNow) {
          markRuntimeStall(runtime, 'edge_lock', lockStatus.holder || null);
          ensureRobotMotion(robot);
          robot.speed = 0;
          return true;
        }
        return false;
      }
      runtime.edgeLockHold = null;
    }
    return false;
  };

  const getEdgeQueue = (edgeGroupKey) => edgeQueues.get(edgeGroupKey) || [];

  const shouldUseDeterministicEdgeLocks = () => {
    if (!trafficStrategy) return false;
    const direct = trafficStrategy?.useDeterministicEdgeLocks?.();
    if (typeof direct === 'boolean') return direct;
    const trafficConfig = robotsConfig?.traffic || {};
    const configValue = trafficConfig.deterministicEdgeLocks ??
      trafficConfig.deterministicLocks ??
      trafficConfig.edgeLockDeterministic;
    if (typeof configValue === 'boolean') return configValue;
    return !trafficStrategy?.useTimeReservations?.();
  };

  const resolveEdgeLockLookaheadM = (robot) => {
    const explicit = trafficStrategy?.getEdgeLockLookaheadM?.(robot);
    const fallback = trafficStrategy?.getNodeLockLookaheadM?.(robot);
    if (Number.isFinite(explicit)) return explicit;
    if (Number.isFinite(fallback)) return fallback;
    return null;
  };

  const resolveEdgeLockLookbackM = (robot) => {
    const explicit = trafficStrategy?.getEdgeLockLookbackM?.(robot);
    const fallback = trafficStrategy?.getNodeLockLookbackM?.(robot);
    if (Number.isFinite(explicit)) return explicit;
    if (Number.isFinite(fallback)) return fallback;
    return null;
  };

  const buildEdgeLockCorridor = (robot, runtime, lookaheadM, lookbackM) => {
    const route = runtime?.route;
    if (!route?.segments?.length) return [];
    const segments = route.segments;
    const currentIndex = Number.isFinite(route.segmentIndex) ? route.segmentIndex : 0;
    const progress = Number.isFinite(route.segmentProgress)
      ? Math.max(0, route.segmentProgress)
      : 0;
    const corridor = [];
    const addSegment = (segment, index, offsetStart, offsetEnd) => {
      if (!segment) return;
      const edgeGroupKey = resolveEdgeLockKey(segment, robot);
      if (!edgeGroupKey) return;
      const edgeKey = segment.edgeKey || segment.edgeGroupKey || null;
      const totalLength = Number.isFinite(segment.totalLength) ? segment.totalLength : null;
      corridor.push({
        edgeGroupKey,
        edgeKey,
        totalLength,
        index,
        offsetStart,
        offsetEnd
      });
    };
    const current = segments[currentIndex];
    if (current) {
      const length = Number.isFinite(current.totalLength) ? current.totalLength : 0;
      const start = -progress;
      const end = start + length;
      if (end >= -lookbackM && start <= lookaheadM) {
        addSegment(current, currentIndex, start, end);
      }
      let forwardOffset = end;
      for (
        let idx = currentIndex + 1;
        idx < segments.length && forwardOffset <= lookaheadM;
        idx += 1
      ) {
        const segment = segments[idx];
        if (!segment) continue;
        const length = Number.isFinite(segment.totalLength) ? segment.totalLength : 0;
        const start = forwardOffset;
        const end = start + length;
        if (end >= -lookbackM && start <= lookaheadM) {
          addSegment(segment, idx, start, end);
        }
        forwardOffset = end;
      }
      let backOffset = start;
      for (let idx = currentIndex - 1; idx >= 0 && backOffset >= -lookbackM; idx -= 1) {
        const segment = segments[idx];
        if (!segment) continue;
        const length = Number.isFinite(segment.totalLength) ? segment.totalLength : 0;
        const end = backOffset;
        const start = end - length;
        if (end >= -lookbackM && start <= lookaheadM) {
          addSegment(segment, idx, start, end);
        }
        backOffset = start;
      }
    }
    return corridor;
  };

  const locateRouteStop = (route, distanceAhead) => {
    if (!route?.segments?.length) return null;
    if (!Number.isFinite(distanceAhead)) return null;
    let remaining = Math.max(0, distanceAhead);
    const startIndex = Number.isFinite(route.segmentIndex) ? route.segmentIndex : 0;
    const startProgress = Number.isFinite(route.segmentProgress)
      ? Math.max(0, route.segmentProgress)
      : 0;
    for (let idx = startIndex; idx < route.segments.length; idx += 1) {
      const segment = route.segments[idx];
      if (!segment) continue;
      const length = Number.isFinite(segment.totalLength) ? segment.totalLength : 0;
      const offset = idx === startIndex ? startProgress : 0;
      const available = Math.max(0, length - offset);
      if (remaining <= available + ROUTE_PROGRESS_EPS) {
        return {
          segmentIndex: idx,
          segmentProgress: Math.min(length, offset + remaining)
        };
      }
      remaining -= available;
    }
    const lastIndex = route.segments.length - 1;
    const lastSegment = route.segments[lastIndex];
    return {
      segmentIndex: lastIndex,
      segmentProgress: Number.isFinite(lastSegment?.totalLength) ? lastSegment.totalLength : 0
    };
  };

  const resolveEdgeLockHoldTarget = (route, entry, bufferM) => {
    if (!route || !entry) return null;
    if (!Number.isFinite(entry.offsetStart)) return null;
    const buffer = Number.isFinite(bufferM) ? Math.max(0, bufferM) : 0;
    const stopDistance = entry.offsetStart - buffer;
    const target = locateRouteStop(route, stopDistance);
    if (!target) return null;
    return {
      ...target,
      distance: Math.max(0, stopDistance),
      buffer
    };
  };

  const syncEdgeCorridorLocks = (robot, runtime, nowMs) => {
    if (!robot?.id || !runtime?.route) return { ok: true, holder: null, edgeGroupKey: null };
    const deterministicEdgeLocks = shouldUseDeterministicEdgeLocks();
    const deterministicRightOfWay = Boolean(trafficStrategy?.useDeterministicRightOfWay?.());
    const useQueues = deterministicEdgeLocks || trafficStrategy?.useEdgeQueues?.();
    const lockOptions = {
      nowMs,
      deterministic: deterministicEdgeLocks,
      useQueues
    };
    const lookaheadRaw = resolveEdgeLockLookaheadM(robot);
    const lookbackRaw = resolveEdgeLockLookbackM(robot);
    const hasCorridor = Number.isFinite(lookaheadRaw) || Number.isFinite(lookbackRaw);
    const spacingBase = (() => {
      const spacing = getTrafficSpacing(robot);
      return Math.max(
        EDGE_LOCK_FOLLOW_DISTANCE,
        spacing.stop + resolveForwardStopDistance(robot)
      );
    })();
    if (!hasCorridor) {
      const route = runtime.route;
      const segment = route.segments?.[route.segmentIndex] || null;
      const edgeGroupKey = resolveEdgeLockKey(segment, robot);
      if (!edgeGroupKey) return { ok: true, holder: null, edgeGroupKey: null };
      const minDistance = spacingBase;
      const lockStatus = reserveEdgeLock(
        edgeGroupKey,
        robot.id,
        segment?.edgeKey || segment?.edgeGroupKey || null,
        route.segmentProgress,
        segment?.totalLength,
        minDistance,
        lockOptions
      );
      return lockStatus.ok
        ? { ok: true, holder: null, edgeGroupKey: null }
        : {
          ok: false,
          holder: lockStatus.holder || null,
          edgeGroupKey,
          hold: resolveEdgeLockHoldTarget(runtime.route, {
            offsetStart: 0
          }, spacingBase)
        };
    }
    const lookaheadM = Math.max(0, Number.isFinite(lookaheadRaw) ? lookaheadRaw : 0);
    const lookbackM = Math.max(0, Number.isFinite(lookbackRaw) ? lookbackRaw : 0);
    const corridor = buildEdgeLockCorridor(robot, runtime, lookaheadM, lookbackM);
    if (!corridor.length) return { ok: true, holder: null, edgeGroupKey: null };
    const desired = new Map();
    corridor.forEach((entry) => {
      const edgeGroupKey = entry.edgeGroupKey;
      const distance =
        entry.offsetStart <= 0 && entry.offsetEnd >= 0
          ? 0
          : Math.min(Math.abs(entry.offsetStart), Math.abs(entry.offsetEnd));
      const required = entry.offsetEnd >= 0;
      if (!required && deterministicRightOfWay) return;
      const existing = desired.get(edgeGroupKey);
      if (!existing || distance < existing.distance) {
        desired.set(edgeGroupKey, {
          ...entry,
          distance,
          required
        });
      } else if (required && existing) {
        existing.required = true;
      }
    });
    for (const [edgeGroupKey, locks] of edgeLocks.entries()) {
      const existing = locks.get(robot.id);
      if (!existing) continue;
      if (!desired.has(edgeGroupKey)) {
        if (!deterministicEdgeLocks) {
          releaseEdgeDirectionLock(edgeGroupKey, existing.edgeKey, nowMs);
        }
        locks.delete(robot.id);
        recordEvent('edge_lock_release', {
          robotId: robot.id,
          edgeGroupKey,
          edgeKey: existing.edgeKey || null
        });
        if (!locks.size) {
          edgeLocks.delete(edgeGroupKey);
        }
        if (useQueues) {
          releaseEdgeQueueEntry(edgeGroupKey, robot.id);
        }
      }
    }
    const desiredList = Array.from(desired.values());
    const resolveProgress = (entry) => {
      if (entry.offsetEnd <= 0) {
        return Number.isFinite(entry.totalLength) ? entry.totalLength : null;
      }
      if (entry.offsetStart >= 0) {
        return 0;
      }
      return Number.isFinite(runtime.route.segmentProgress)
        ? runtime.route.segmentProgress
        : 0;
    };
    const resolveSpacing = (entry) => {
      const totalLength = entry.totalLength;
      return Number.isFinite(totalLength)
        ? Math.max(spacingBase, totalLength + ROBOT_COLLISION_MARGIN)
        : spacingBase * 2;
    };
    const currentEntry = desiredList.find(
      (entry) => entry.offsetStart <= 0 && entry.offsetEnd >= 0
    );
    const keepKeys = new Set();
    if (deterministicRightOfWay) {
      const lockOrder = desiredList
        .filter((entry) => entry.required)
        .sort((a, b) => String(a.edgeGroupKey).localeCompare(String(b.edgeGroupKey)));
      if (!lockOrder.length) return { ok: true, holder: null, edgeGroupKey: null };
      if (currentEntry?.edgeGroupKey) {
        keepKeys.add(currentEntry.edgeGroupKey);
      }
      for (const entry of lockOrder) {
        const status = reserveEdgeLock(
          entry.edgeGroupKey,
          robot.id,
          entry.edgeKey,
          resolveProgress(entry),
          entry.totalLength,
          resolveSpacing(entry),
          { ...lockOptions, probe: true }
        );
        if (!status.ok) {
          releaseRobotEdgeLocksExcept(robot.id, keepKeys);
          return {
            ok: false,
            holder: status.holder || null,
            edgeGroupKey: entry.edgeGroupKey || null,
            hold: resolveEdgeLockHoldTarget(runtime.route, entry, spacingBase)
          };
        }
      }
      const requiredKeys = new Set(lockOrder.map((entry) => entry.edgeGroupKey));
      for (const entry of lockOrder) {
        const status = reserveEdgeLock(
          entry.edgeGroupKey,
          robot.id,
          entry.edgeKey,
          resolveProgress(entry),
          entry.totalLength,
          resolveSpacing(entry),
          lockOptions
        );
        if (!status.ok && entry.required) {
          releaseRobotEdgeLocksExcept(robot.id, keepKeys);
          return {
            ok: false,
            holder: status.holder || null,
            edgeGroupKey: entry.edgeGroupKey || null,
            hold: resolveEdgeLockHoldTarget(runtime.route, entry, spacingBase)
          };
        }
      }
      releaseRobotEdgeLocksExcept(robot.id, requiredKeys);
      return { ok: true, holder: null, edgeGroupKey: null };
    }
    if (currentEntry?.edgeGroupKey) {
      keepKeys.add(currentEntry.edgeGroupKey);
      const status = reserveEdgeLock(
        currentEntry.edgeGroupKey,
        robot.id,
        currentEntry.edgeKey,
        resolveProgress(currentEntry),
        currentEntry.totalLength,
        resolveSpacing(currentEntry),
        lockOptions
      );
      if (!status.ok) {
        return {
          ok: false,
          holder: status.holder || null,
          edgeGroupKey: currentEntry.edgeGroupKey || null,
          hold: resolveEdgeLockHoldTarget(runtime.route, currentEntry, spacingBase)
        };
      }
    }
    const probeOrder = desiredList
      .filter((entry) => entry.required && entry.edgeGroupKey !== currentEntry?.edgeGroupKey)
      .sort((a, b) => {
        if (a.offsetStart !== b.offsetStart) return a.offsetStart - b.offsetStart;
        return String(a.edgeGroupKey).localeCompare(String(b.edgeGroupKey));
      });
    let blocked = null;
    for (const entry of probeOrder) {
      const status = reserveEdgeLock(
        entry.edgeGroupKey,
        robot.id,
        entry.edgeKey,
        resolveProgress(entry),
        entry.totalLength,
        resolveSpacing(entry),
        { ...lockOptions, probe: true }
      );
      if (!status.ok) {
        blocked = { entry, holder: status.holder || null };
        break;
      }
    }
    if (blocked) {
      if (blocked.entry?.edgeGroupKey) {
        keepKeys.add(blocked.entry.edgeGroupKey);
      }
      releaseRobotEdgeLocksExcept(robot.id, keepKeys);
      return {
        ok: false,
        holder: blocked.holder || null,
        edgeGroupKey: blocked.entry.edgeGroupKey || null,
        hold: resolveEdgeLockHoldTarget(runtime.route, blocked.entry, spacingBase)
      };
    }
    const lockOrder = desiredList
      .filter((entry) => entry.edgeGroupKey !== currentEntry?.edgeGroupKey)
      .sort((a, b) => String(a.edgeGroupKey).localeCompare(String(b.edgeGroupKey)));
    for (const entry of lockOrder) {
      const status = reserveEdgeLock(
        entry.edgeGroupKey,
        robot.id,
        entry.edgeKey,
        resolveProgress(entry),
        entry.totalLength,
        resolveSpacing(entry),
        lockOptions
      );
      if (!status.ok && entry.required) {
        if (entry.edgeGroupKey) {
          keepKeys.add(entry.edgeGroupKey);
        }
        releaseRobotEdgeLocksExcept(robot.id, keepKeys);
        return {
          ok: false,
          holder: status.holder || null,
          edgeGroupKey: entry.edgeGroupKey || null,
          hold: resolveEdgeLockHoldTarget(runtime.route, entry, spacingBase)
        };
      }
    }
    return { ok: true, holder: null, edgeGroupKey: null };
  };

  const queueTaskAfterAutoPark = (robot, runtime, task, pickPos, dropPos, pickSite, dropSite) => {
    if (!robot || !runtime || !task || !pickPos || !dropPos) return false;
    runtime.pendingTask = {
      taskId: task.id,
      streamId: task.streamId || null,
      pickId: task.pickId,
      dropId: task.dropId,
      dropGroup: task.dropGroup || null,
      pickNodeId: pickSite?.point || null,
      dropNodeId: dropSite?.point || null,
      pickPos: { ...pickPos },
      dropPos: { ...dropPos }
    };
    runtime.cancelAutoParkAtNode = true;
    runtime.taskId = task.id;
    runtime.streamId = task.streamId || null;
    runtime.pickId = task.pickId;
    runtime.dropId = task.dropId;
    runtime.dropGroup = task.dropGroup || null;
    runtime.pickNodeId = pickSite?.point || null;
    runtime.dropNodeId = dropSite?.point || null;
    runtime.dropPos = { ...dropPos };
    updateRobotState(robot.id, { task: task.id });
    return true;
  };

  const maybeApplyPendingTaskAtNode = (robot, runtime) => {
    if (!robot || !runtime) return false;
    if (!runtime.pendingTask || !runtime.cancelAutoParkAtNode) return false;
    if (!runtime.autoPark || runtime.phase !== 'to_park') return false;
    const pending = runtime.pendingTask;
    runtime.pendingTask = null;
    runtime.cancelAutoParkAtNode = false;
    runtime.autoPark = false;
    runtime.phase = 'to_pick';
    runtime.taskId = pending.taskId;
    runtime.streamId = pending.streamId || null;
    runtime.pickId = pending.pickId;
    runtime.dropId = pending.dropId;
    runtime.dropGroup = pending.dropGroup || null;
    runtime.pickNodeId = pending.pickNodeId || null;
    runtime.dropNodeId = pending.dropNodeId || null;
    runtime.dropPos = pending.dropPos ? { ...pending.dropPos } : null;
    runtime.waitUntil = null;
    setRuntimeRoute(runtime, robot, pending.pickPos, pending.pickNodeId);
    updateRobotState(robot.id, { task: pending.taskId, activity: 'to_pick' });
    if (pending.taskId) {
      updateTask(pending.taskId, { phase: 'to_pick', status: 'in_progress' });
    }
    return true;
  };

  const pruneEdgeQueue = (edgeGroupKey, nowMs) => {
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const timeout = Number.isFinite(trafficStrategy?.getEdgeQueueTimeoutMs?.())
      ? trafficStrategy.getEdgeQueueTimeoutMs()
      : EDGE_QUEUE_TIMEOUT_MS;
    const queue = getEdgeQueue(edgeGroupKey).filter((entry) => {
      if (!entry || !entry.robotId) return false;
      if (!Number.isFinite(entry.updatedAt)) return false;
      if (now - entry.updatedAt > timeout) return false;
      if (robotRuntime.has(entry.robotId) || pausedAutoRuntime.has(entry.robotId)) {
        return true;
      }
      return false;
    });
    if (queue.length) {
      edgeQueues.set(edgeGroupKey, queue);
    } else {
      edgeQueues.delete(edgeGroupKey);
    }
    return queue;
  };

  const pruneEdgeQueues = (nowMs) => {
    if (!edgeQueues.size) return;
    Array.from(edgeQueues.keys()).forEach((key) => {
      pruneEdgeQueue(key, nowMs);
    });
  };

  const touchEdgeQueue = (edgeGroupKey, robotId, edgeKey, nowMs, options = {}) => {
    if (!edgeGroupKey || !robotId) return;
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const allowMultiple = options.allowMultiple === true;
    if (!allowMultiple) {
      for (const [key, queue] of edgeQueues.entries()) {
        if (key === edgeGroupKey) continue;
        const next = queue.filter((entry) => entry.robotId !== robotId);
        if (next.length) {
          edgeQueues.set(key, next);
        } else {
          edgeQueues.delete(key);
        }
      }
    }
    const queue = getEdgeQueue(edgeGroupKey);
    let entry = queue.find((item) => item.robotId === robotId);
    if (!entry) {
      entry = { robotId, updatedAt: now, edgeKey: edgeKey || null };
      queue.push(entry);
    } else {
      entry.updatedAt = now;
      if (edgeKey) entry.edgeKey = edgeKey;
    }
    edgeQueues.set(edgeGroupKey, queue);
  };

  const releaseEdgeQueueEntry = (edgeGroupKey, robotId) => {
    if (!edgeGroupKey || !robotId) return;
    const queue = getEdgeQueue(edgeGroupKey).filter((entry) => entry.robotId !== robotId);
    if (queue.length) {
      edgeQueues.set(edgeGroupKey, queue);
    } else {
      edgeQueues.delete(edgeGroupKey);
    }
  };

  const releaseRobotEdgeQueues = (robotId) => {
    if (!robotId || !edgeQueues.size) return;
    for (const [key, queue] of edgeQueues.entries()) {
      const next = queue.filter((entry) => entry.robotId !== robotId);
      if (next.length) {
        edgeQueues.set(key, next);
      } else {
        edgeQueues.delete(key);
      }
    }
  };

  const getEdgeQueueHeadId = (edgeGroupKey, nowMs, preferredEdgeKey = null) => {
    const queue = pruneEdgeQueue(edgeGroupKey, nowMs);
    if (!queue.length) return null;
    if (preferredEdgeKey) {
      const preferred = queue.find((entry) => entry.edgeKey === preferredEdgeKey);
      if (preferred) return preferred.robotId;
    }
    return queue[0]?.robotId || null;
  };

  const resolveDeterministicQueueBlocker = (queue, locks, robotId, edgeKey) => {
    if (!Array.isArray(queue) || !queue.length) return null;
    const index = queue.findIndex((entry) => entry.robotId === robotId);
    if (index <= 0) return null;
    for (let i = 0; i < index; i += 1) {
      const entry = queue[i];
      if (!entry?.robotId) continue;
      if (!edgeKey || !entry.edgeKey || entry.edgeKey !== edgeKey) {
        return entry.robotId;
      }
      if (locks && !locks.has(entry.robotId)) {
        return entry.robotId;
      }
    }
    return null;
  };

  const isEdgeQueueHead = (edgeGroupKey, robotId, nowMs) => {
    const headId = getEdgeQueueHeadId(edgeGroupKey, nowMs);
    return !headId || headId === robotId;
  };

  const findEdgeQueueHolder = (queue, edgeKey) => {
    if (!edgeKey || !Array.isArray(queue) || !queue.length) return null;
    const candidate = queue.find((entry) => entry.edgeKey === edgeKey);
    return candidate?.robotId || null;
  };

  const ensureEdgeDirectionLock = (edgeGroupKey, edgeKey, nowMs) => {
    if (!edgeGroupKey || !edgeKey) return;
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const lock = edgeDirectionLocks.get(edgeGroupKey);
    if (!lock || lock.edgeKey !== edgeKey) {
      edgeDirectionLocks.set(edgeGroupKey, {
        edgeKey,
        count: 1,
        holdUntil: now + EDGE_DIRECTION_HOLD_MS,
        lastSwitchAt: now
      });
      return;
    }
    lock.count += 1;
    lock.holdUntil = now + EDGE_DIRECTION_HOLD_MS;
  };

  const releaseEdgeDirectionLock = (edgeGroupKey, edgeKey, nowMs) => {
    if (!edgeGroupKey || !edgeKey) return;
    const lock = edgeDirectionLocks.get(edgeGroupKey);
    if (!lock || lock.edgeKey !== edgeKey) return;
    lock.count = Math.max(0, lock.count - 1);
    if (lock.count === 0) {
      const now = Number.isFinite(nowMs) ? nowMs : Date.now();
      lock.holdUntil = now + EDGE_DIRECTION_HOLD_MS;
    }
  };

  const pruneEdgeDirectionLocks = (nowMs) => {
    if (!edgeDirectionLocks.size) return;
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    for (const [key, lock] of edgeDirectionLocks.entries()) {
      if (lock.count > 0) continue;
      if (now >= lock.holdUntil) {
        edgeDirectionLocks.delete(key);
      }
    }
  };

  const reserveEdgeLock = (
    edgeGroupKey,
    robotId,
    edgeKey,
    progress,
    totalLength,
    minDistance,
    options = {}
  ) => {
    if (!edgeGroupKey || !robotId) return { ok: true, holder: null };
    const locks = edgeLocks.get(edgeGroupKey) || new Map();
    const nextProgress = Number.isFinite(progress) ? progress : null;
    const now = Number.isFinite(options.nowMs) ? options.nowMs : Date.now();
    const spacing = Number.isFinite(minDistance) ? minDistance : EDGE_LOCK_FOLLOW_DISTANCE;
    const existing = locks.get(robotId) || null;
    const deterministic = typeof options.deterministic === 'boolean'
      ? options.deterministic
      : shouldUseDeterministicEdgeLocks();
    const probeOnly = options.probe === true;
    const useQueues = typeof options.useQueues === 'boolean'
      ? options.useQueues
      : (trafficStrategy?.useEdgeQueues?.() || deterministic);
    let queue = null;

    if (useQueues) {
      touchEdgeQueue(edgeGroupKey, robotId, edgeKey, now, { allowMultiple: deterministic });
      queue = pruneEdgeQueue(edgeGroupKey, now);
    }
    if (existing && existing.edgeKey && existing.edgeKey !== edgeKey) {
      if (!deterministic) {
        releaseEdgeDirectionLock(edgeGroupKey, existing.edgeKey, now);
      }
    }
    if (existing && existing.edgeKey === edgeKey) {
      if (!probeOnly) {
        existing.progress = nextProgress;
        existing.totalLength = Number.isFinite(totalLength) ? totalLength : existing.totalLength;
        existing.updatedAt = now;
        if (edgeKey && !deterministic) {
          const lock = edgeDirectionLocks.get(edgeGroupKey);
          if (!lock || lock.edgeKey !== edgeKey) {
            edgeDirectionLocks.set(edgeGroupKey, {
              edgeKey,
              count: 1,
              holdUntil: now + EDGE_DIRECTION_HOLD_MS,
              lastSwitchAt: now
            });
          } else {
            lock.holdUntil = now + EDGE_DIRECTION_HOLD_MS;
          }
        }
        edgeLocks.set(edgeGroupKey, locks);
        recordEvent('edge_lock', {
          robotId,
          edgeGroupKey,
          edgeKey: edgeKey || null,
          ok: true,
          holder: robotId,
          progress: nextProgress
        });
      }
      return { ok: true, holder: robotId };
    }
    if (useQueues) {
      if (deterministic) {
        const blocker = resolveDeterministicQueueBlocker(queue, locks, robotId, edgeKey);
        if (blocker) {
          return { ok: false, holder: blocker };
        }
      } else {
        const directionKey = edgeKey || null;
        const directionLock = edgeDirectionLocks.get(edgeGroupKey) || null;
        if (directionLock && directionLock.edgeKey && directionKey && directionLock.edgeKey !== directionKey) {
          const directionHolder = (() => {
            for (const lock of locks.values()) {
              if (lock.edgeKey === directionLock.edgeKey) {
                return lock.robotId || null;
              }
            }
            return null;
          })();
          const queueHolder = findEdgeQueueHolder(queue, directionLock.edgeKey);
          const holderId = directionHolder || queueHolder || null;
          const sameDirQueueCount = queue.filter((entry) => entry.edgeKey === directionLock.edgeKey).length;
          const sameDirWaiting = sameDirQueueCount > directionLock.count;
          const maxHoldExceeded = now - directionLock.lastSwitchAt >= EDGE_DIRECTION_MAX_HOLD_MS;
          const inCooldown = Number.isFinite(directionLock.holdUntil)
            ? now < directionLock.holdUntil
            : false;
          if (directionLock.count > 0) {
            return { ok: false, holder: holderId || directionLock.edgeKey };
          }
          if ((sameDirWaiting || inCooldown) && !maxHoldExceeded) {
            return { ok: false, holder: holderId || directionLock.edgeKey };
          }
          edgeDirectionLocks.delete(edgeGroupKey);
        }
        const preferredDirection =
          directionLock && directionLock.edgeKey && directionLock.edgeKey === directionKey
            ? directionLock.edgeKey
            : null;
        const shouldEnforceQueueHead = !directionLock || directionLock.edgeKey !== directionKey;
        if (shouldEnforceQueueHead) {
          const headId = getEdgeQueueHeadId(edgeGroupKey, now, preferredDirection);
          if (headId && headId !== robotId) {
            return { ok: false, holder: headId };
          }
        }
      }
    }

    const conflicts = edgeConflictGroups.get(edgeGroupKey);
    if (conflicts && conflicts.size) {
      for (const conflictKey of conflicts) {
        const conflictLocks = edgeLocks.get(conflictKey);
        if (!conflictLocks) continue;
        for (const lock of conflictLocks.values()) {
          if (lock.robotId !== robotId) {
            return { ok: false, holder: lock.robotId };
          }
        }
      }
    }

    for (const [id, lock] of locks.entries()) {
      if (id === robotId) continue;
      if (lock.edgeKey && edgeKey && lock.edgeKey !== edgeKey) {
        return { ok: false, holder: lock.robotId };
      }
      if (
        lock.edgeKey &&
        edgeKey &&
        lock.edgeKey === edgeKey &&
        Number.isFinite(lock.progress) &&
        Number.isFinite(nextProgress)
      ) {
        const gap = Math.abs(nextProgress - lock.progress);
        if (gap < spacing) {
          recordEvent('edge_lock', {
            robotId,
            edgeGroupKey,
            edgeKey: edgeKey || null,
            ok: false,
            holder: lock.robotId || null,
            progress: nextProgress
          });
          return { ok: false, holder: lock.robotId };
        }
      }
    }

    if (probeOnly) {
      return { ok: true, holder: robotId };
    }

    locks.set(robotId, {
      robotId,
      edgeKey: edgeKey || null,
      progress: nextProgress,
      totalLength: Number.isFinite(totalLength) ? totalLength : null,
      updatedAt: now
    });
    edgeLocks.set(edgeGroupKey, locks);
    if (!deterministic) {
      ensureEdgeDirectionLock(edgeGroupKey, edgeKey || null, now);
    }
    recordEvent('edge_lock', {
      robotId,
      edgeGroupKey,
      edgeKey: edgeKey || null,
      ok: true,
      holder: robotId,
      progress: nextProgress
    });
    return { ok: true, holder: robotId };
  };

  const releaseEdgeLock = (edgeGroupKey, robotId) => {
    if (!edgeGroupKey || !robotId) return;
    const locks = edgeLocks.get(edgeGroupKey);
    if (!locks) return;
    const existing = locks.get(robotId);
    locks.delete(robotId);
    if (existing) {
      recordEvent('edge_lock_release', {
        robotId,
        edgeGroupKey,
        edgeKey: existing.edgeKey || null
      });
    }
    if (!locks.size) {
      edgeLocks.delete(edgeGroupKey);
    }
    if (existing?.edgeKey) {
      releaseEdgeDirectionLock(edgeGroupKey, existing.edgeKey, Date.now());
    }
    if (shouldUseDeterministicEdgeLocks() || trafficStrategy?.useEdgeQueues?.()) {
      releaseEdgeQueueEntry(edgeGroupKey, robotId);
    }
  };

  const releaseRobotEdgeLocksOnly = (robotId) => {
    if (!robotId) return;
    if (!edgeLocks.size) {
      if (shouldUseDeterministicEdgeLocks() || trafficStrategy?.useEdgeQueues?.()) {
        releaseRobotEdgeQueues(robotId);
      }
      return;
    }
    for (const [key, locks] of edgeLocks.entries()) {
      const existing = locks.get(robotId);
      if (existing) {
        releaseEdgeDirectionLock(key, existing.edgeKey, Date.now());
        locks.delete(robotId);
      }
      if (!locks.size) {
        edgeLocks.delete(key);
      }
    }
    if (shouldUseDeterministicEdgeLocks() || trafficStrategy?.useEdgeQueues?.()) {
      releaseRobotEdgeQueues(robotId);
    }
  };

  const releaseRobotEdgeQueuesExcept = (robotId, keepKeys) => {
    if (!robotId || !edgeQueues.size) return;
    for (const [key, queue] of edgeQueues.entries()) {
      if (keepKeys && keepKeys.has(key)) continue;
      const next = queue.filter((entry) => entry.robotId !== robotId);
      if (next.length) {
        edgeQueues.set(key, next);
      } else {
        edgeQueues.delete(key);
      }
    }
  };

  const releaseRobotEdgeLocksExcept = (robotId, keepKeys) => {
    if (!robotId) return;
    if (!edgeLocks.size) {
      if (shouldUseDeterministicEdgeLocks() || trafficStrategy?.useEdgeQueues?.()) {
        releaseRobotEdgeQueuesExcept(robotId, keepKeys);
      }
      return;
    }
    for (const [key, locks] of edgeLocks.entries()) {
      if (keepKeys && keepKeys.has(key)) continue;
      const existing = locks.get(robotId);
      if (existing) {
        releaseEdgeDirectionLock(key, existing.edgeKey, Date.now());
        locks.delete(robotId);
        recordEvent('edge_lock_release', {
          robotId,
          edgeGroupKey: key,
          edgeKey: existing.edgeKey || null
        });
      }
      if (!locks.size) {
        edgeLocks.delete(key);
      }
    }
    if (shouldUseDeterministicEdgeLocks() || trafficStrategy?.useEdgeQueues?.()) {
      releaseRobotEdgeQueuesExcept(robotId, keepKeys);
    }
  };

  const releaseRobotEdgeLocks = (robotId) => {
    if (!robotId) return;
    if (!edgeLocks.size) {
      if (shouldUseDeterministicEdgeLocks() || trafficStrategy?.useEdgeQueues?.()) {
        releaseRobotEdgeQueues(robotId);
      }
      releaseTimeReservations(robotId);
      recordEvent('edge_lock_release_all', { robotId });
      return;
    }
    for (const [key, locks] of edgeLocks.entries()) {
      const existing = locks.get(robotId);
      if (existing) {
        releaseEdgeDirectionLock(key, existing.edgeKey, Date.now());
        locks.delete(robotId);
        recordEvent('edge_lock_release', {
          robotId,
          edgeGroupKey: key,
          edgeKey: existing.edgeKey || null
        });
      }
      if (!locks.size) {
        edgeLocks.delete(key);
      }
    }
    if (shouldUseDeterministicEdgeLocks() || trafficStrategy?.useEdgeQueues?.()) {
      releaseRobotEdgeQueues(robotId);
    }
    releaseTimeReservations(robotId);
    recordEvent('edge_lock_release_all', { robotId });
  };

  const expireEdgeLocks = (nowMs) => {
    const expiredRobotIds = new Set();
    if (edgeLocks.size) {
      for (const [key, locks] of edgeLocks.entries()) {
        for (const [robotId, lock] of locks.entries()) {
          if (nowMs - lock.updatedAt > EDGE_LOCK_TIMEOUT_MS) {
            const runtime = robotRuntime.get(robotId);
            const robot = getRobotById(robotId);
            if (runtime && robot && (runtime.paused || robot.blocked)) {
              const spacing = getTrafficSpacing(robot);
              const minDistance = Math.max(
                EDGE_LOCK_FOLLOW_DISTANCE,
                spacing.stop + resolveForwardStopDistance(robot)
              );
              reserveEdgeLock(
                key,
                robotId,
                lock.edgeKey || null,
                lock.progress,
                lock.totalLength,
                minDistance,
                {
                  nowMs,
                  deterministic: shouldUseDeterministicEdgeLocks(),
                  useQueues: shouldUseDeterministicEdgeLocks() || trafficStrategy?.useEdgeQueues?.()
                }
              );
              continue;
            }
            locks.delete(robotId);
            expiredRobotIds.add(robotId);
            if (lock?.edgeKey) {
              releaseEdgeDirectionLock(key, lock.edgeKey, nowMs);
            }
            if (shouldUseDeterministicEdgeLocks() || trafficStrategy?.useEdgeQueues?.()) {
              releaseEdgeQueueEntry(key, robotId);
            }
          }
        }
        if (!locks.size) {
          edgeLocks.delete(key);
        }
      }
    }
    if (shouldUseDeterministicEdgeLocks() || trafficStrategy?.useEdgeQueues?.()) {
      pruneEdgeQueues(nowMs);
    }
    pruneEdgeDirectionLocks(nowMs);
    if (expiredRobotIds.size) {
      expiredRobotIds.forEach((robotId) => {
        refreshRouteSchedulesAfterRelease(robotId);
      });
    }
  };

  const buildSchedulerContext = () => ({
    reservationTable,
    criticalSectionTable,
    defaults: {
      stepMs: RESERVATION_DEFAULT_STEP_MS,
      horizonMs: RESERVATION_DEFAULT_HORIZON_MS
    },
    routeProgressEps: ROUTE_PROGRESS_EPS,
    reservationMarginMs,
    nodeReservationMs,
    getRobotPriorityById,
    resolveSegmentTiming,
    resolveTimeReservationEdgeKey,
    collectEdgeConflictKeys,
    getNodeReservationBufferMs,
    useTurnTimeReservations,
    computeTurnDelayMsForSegments,
    buildCriticalSectionRanges,
    resolveCriticalSectionCapacity,
    computeCriticalSectionWindowMs,
    criticalSections: criticalSectionIndex
      ? { enabled: criticalSectionIndex.enabled, mode: criticalSectionIndex.mode }
      : null,
    recordCriticalWait: (ms) => recordMetricSample('criticalWait', ms),
    forceReserveEdge,
    forceReserveNode,
    beginReservationTransaction: (table) =>
      typeof table?.beginTransaction === 'function' ? table.beginTransaction() : null,
    releaseReservations: (robotId) => releaseTimeReservations(robotId),
    releaseCriticalSections: (robotId) => criticalSectionTable?.releaseRobot(robotId)
  });

  const forceReserveEdge = (table, edgeKey, robotId, startMs, endMs) => {
    if (!table || !edgeKey || !robotId) return;
    if (typeof table.forceReserveEdge === 'function') {
      table.forceReserveEdge(edgeKey, robotId, startMs, endMs);
      return;
    }
    const start = Number.isFinite(startMs) ? startMs : 0;
    const end = Number.isFinite(endMs) ? endMs : start;
    const rawStart = Math.min(start, end);
    const rawEnd = Math.max(start, end);
    const safety = typeof table.getSafetyMs === 'function' ? table.getSafetyMs() : 0;
    const entry = {
      robotId,
      start: rawStart - safety,
      end: rawEnd + safety,
      rawStart,
      rawEnd
    };
    const list = table.edge?.get(edgeKey) || [];
    list.push(entry);
    list.sort((a, b) => a.start - b.start);
    table.edge?.set(edgeKey, list);
  };

  const forceReserveNode = (table, nodeId, robotId, atMs, dwellMs = 0) => {
    if (!table || !nodeId || !robotId) return;
    if (typeof table.forceReserveNode === 'function') {
      table.forceReserveNode(nodeId, robotId, atMs, dwellMs);
      return;
    }
    const start = Number.isFinite(atMs) ? atMs : 0;
    const dwell = Number.isFinite(dwellMs) ? dwellMs : 0;
    const rawStart = start;
    const rawEnd = start + dwell;
    const safety = typeof table.getSafetyMs === 'function' ? table.getSafetyMs() : 0;
    const entry = {
      robotId,
      start: rawStart - safety,
      end: rawEnd + safety,
      rawStart,
      rawEnd
    };
    const list = table.node?.get(nodeId) || [];
    list.push(entry);
    list.sort((a, b) => a.start - b.start);
    table.node?.set(nodeId, list);
  };

  const buildTimeReservationSchedule = (robot, route, nowMs, constraints) => {
    if (!route?.segments?.length) return null;
    const profile = getReservationProfile(robot);
    const table = ensureReservationTable(profile);
    if (!profile || !table) return null;
    if (!Scheduler?.buildTimeReservationSchedule) return null;
    const planningPriority = robot ? getRobotPriority(robot) : null;
    return Scheduler.buildTimeReservationSchedule(buildSchedulerContext(), {
      robot,
      route,
      nowMs,
      constraints,
      profile,
      planningPriority
    });
  };

  const getRouteScheduleEntry = (route, segmentIndex) => {
    if (!route?.schedule?.length) return null;
    return route.schedule.find((entry) => entry.segmentIndex === segmentIndex) || null;
  };

  const getRouteScheduleEndTime = (route) => {
    if (!route?.schedule?.length) return null;
    const last = route.schedule[route.schedule.length - 1];
    return Number.isFinite(last?.arrivalTime) ? last.arrivalTime : null;
  };

  const pickRouteConflictCandidate = (route, minWaitMs) => {
    if (!route?.schedule?.length) return null;
    const threshold = Number.isFinite(minWaitMs) ? minWaitMs : 0;
    let best = null;
    route.schedule.forEach((entry) => {
      if (!entry?.conflict || entry.conflict.source === 'constraint') return;
      if (!Number.isFinite(entry.waitMs) || entry.waitMs < threshold) return;
      if (!entry.conflict.holder) return;
      if (!best || entry.waitMs > best.waitMs) {
        best = { ...entry.conflict, waitMs: entry.waitMs };
      }
    });
    return best;
  };

  const collectRouteConflictHolders = (route, minWaitMs) => {
    if (!route?.schedule?.length) return [];
    const threshold = Number.isFinite(minWaitMs) ? minWaitMs : 0;
    const holders = new Map();
    route.schedule.forEach((entry) => {
      if (!entry?.conflict || entry.conflict.source === 'constraint') return;
      if (!entry.conflict.holder) return;
      if (!Number.isFinite(entry.waitMs) || entry.waitMs < threshold) return;
      const current = holders.get(entry.conflict.holder);
      if (!current || entry.waitMs > current.waitMs) {
        holders.set(entry.conflict.holder, {
          robotId: entry.conflict.holder,
          waitMs: entry.waitMs
        });
      }
    });
    return Array.from(holders.values()).sort((a, b) => b.waitMs - a.waitMs);
  };

  const buildCbsWindows = (route, robot, nodeDwellMs) => {
    const edges = [];
    const nodes = [];
    if (!route?.schedule?.length) return { edges, nodes };
    const dwell = Number.isFinite(nodeDwellMs) ? nodeDwellMs : nodeReservationMs;
    route.schedule.forEach((entry) => {
      const segment =
        Number.isFinite(entry.segmentIndex)
          ? route.segments?.[entry.segmentIndex] || null
          : null;
      const primaryEdgeKey =
        resolveTimeReservationEdgeKey(segment, robot) ||
        entry.edgeGroupKey ||
        entry.edgeKey ||
        null;
      const conflictKey =
        segment?.edgeBaseGroupKey ||
        segment?.edgeGroupKey ||
        entry.edgeBaseGroupKey ||
        entry.edgeGroupKey ||
        primaryEdgeKey;
      const includeBaseKey =
        Boolean(primaryEdgeKey && conflictKey && primaryEdgeKey === conflictKey);
      const edgeKeys = collectEdgeConflictKeys(primaryEdgeKey, conflictKey, { includeBaseKey });
      if (
        edgeKeys.length &&
        Number.isFinite(entry.startTime) &&
        Number.isFinite(entry.arrivalTime) &&
        entry.arrivalTime > entry.startTime
      ) {
        const uniqueEdges = new Set(edgeKeys.filter(Boolean));
        uniqueEdges.forEach((edgeKey) => {
          edges.push({
            key: edgeKey,
            startTime: entry.startTime,
            endTime: entry.arrivalTime,
            robotId: robot?.id || null
          });
        });
      }
      const nodeId = entry.toNodeId;
      if (
        nodeId &&
        !String(nodeId).startsWith('__') &&
        Number.isFinite(entry.arrivalTime)
      ) {
        const nodeBuffer = getNodeReservationBufferMs(robot, segment);
        const nodeStart = entry.arrivalTime - (nodeBuffer?.approachMs || 0);
        const nodeEnd = entry.arrivalTime + dwell + (nodeBuffer?.clearMs || 0);
        nodes.push({
          key: nodeId,
          startTime: nodeStart,
          endTime: nodeEnd,
          robotId: robot?.id || null
        });
      }
    });
    return { edges, nodes };
  };

  const indexWindowsByKey = (windows) => {
    const map = new Map();
    (windows || []).forEach((entry) => {
      if (!entry?.key) return;
      const list = map.get(entry.key) || [];
      list.push(entry);
      map.set(entry.key, list);
    });
    map.forEach((list) => {
      list.sort((a, b) => a.startTime - b.startTime);
    });
    return map;
  };

  const findWindowConflict = (mapA, mapB) => {
    let best = null;
    if (!mapA || !mapB) return best;
    mapA.forEach((listA, key) => {
      const listB = mapB.get(key);
      if (!listB?.length) return;
      let i = 0;
      let j = 0;
      while (i < listA.length && j < listB.length) {
        const a = listA[i];
        const b = listB[j];
        const startTime = Math.max(a.startTime, b.startTime);
        const endTime = Math.min(a.endTime, b.endTime);
        if (startTime + 1e-3 < endTime) {
          const conflict = {
            key,
            startTime,
            endTime,
            robotA: a.robotId,
            robotB: b.robotId
          };
          if (!best || startTime < best.startTime) {
            best = conflict;
          }
          break;
        }
        if (a.endTime < b.endTime) {
          i += 1;
        } else {
          j += 1;
        }
      }
    });
    return best;
  };

  const detectCbsConflict = (routesByRobot) => {
    const robotIds = Array.from(routesByRobot.keys());
    if (robotIds.length < 2) return null;
    const windowCache = new Map();
    robotIds.forEach((robotId) => {
      const robot = getRobotById(robotId);
      const route = routesByRobot.get(robotId);
      if (!route) return;
      const profile = route.scheduleProfile || getReservationProfile(robot);
      const windows = buildCbsWindows(route, robot, profile?.nodeDwellMs);
      windowCache.set(robotId, {
        edges: indexWindowsByKey(windows.edges),
        nodes: indexWindowsByKey(windows.nodes)
      });
    });
    let best = null;
    for (let i = 0; i < robotIds.length; i += 1) {
      for (let j = i + 1; j < robotIds.length; j += 1) {
        const first = windowCache.get(robotIds[i]);
        const second = windowCache.get(robotIds[j]);
        if (!first || !second) continue;
        const edgeConflict = findWindowConflict(first.edges, second.edges);
        const nodeConflict = findWindowConflict(first.nodes, second.nodes);
        let conflict = null;
        if (edgeConflict && nodeConflict) {
          conflict =
            edgeConflict.startTime <= nodeConflict.startTime
              ? { ...edgeConflict, type: 'edge' }
              : { ...nodeConflict, type: 'node' };
        } else if (edgeConflict) {
          conflict = { ...edgeConflict, type: 'edge' };
        } else if (nodeConflict) {
          conflict = { ...nodeConflict, type: 'node' };
        }
        if (conflict && (!best || conflict.startTime < best.startTime)) {
          best = conflict;
        }
      }
    }
    return best;
  };

  const computeCbsCost = (routesByRobot, nowMs) => {
    let makespan = Number.isFinite(nowMs) ? nowMs : Date.now();
    routesByRobot.forEach((route) => {
      const endTime = getRouteScheduleEndTime(route);
      if (Number.isFinite(endTime)) {
        makespan = Math.max(makespan, endTime);
      }
    });
    return makespan;
  };

  const isRobotReplannable = (robotId) => {
    const robot = getRobotById(robotId);
    const runtime = getRobotRuntime(robotId);
    if (!robot || !runtime?.routeGoal?.pos) return false;
    if (runtime.mode === 'manual') return false;
    if (runtime.paused) return false;
    if (robot.online === false) return false;
    return true;
  };

  const buildCbsGroup = (robot, route, settings) => {
    const group = [];
    if (robot?.id) {
      group.push(robot.id);
    }
    const conflicts = collectRouteConflictHolders(route, settings.waitThresholdMs);
    conflicts.forEach((entry) => {
      if (group.length >= settings.maxRobots) return;
      if (!entry?.robotId || entry.robotId === robot?.id) return;
      if (!isRobotReplannable(entry.robotId)) return;
      group.push(entry.robotId);
    });
    return group;
  };

  const getCbsSettings = (robot) => {
    if (!trafficStrategy?.useConflictSearch?.()) {
      return {
        enabled: false,
        full: false,
        global: false,
        solver: null,
        depth: 0,
        waitThresholdMs: 0,
        cooldownMs: 0,
        maxNodes: 0,
        maxRobots: 0
      };
    }
    const depth = trafficStrategy.getConflictSearchDepth?.(robot);
    const waitThresholdMs = trafficStrategy.getConflictWaitThresholdMs?.(robot);
    const cooldownMs = trafficStrategy.getConflictCooldownMs?.(robot);
    const full = Boolean(trafficStrategy?.useFullConflictSearch?.());
    const global = Boolean(trafficStrategy?.useGlobalConflictSearch?.());
    const solverType =
      typeof trafficStrategy?.getGlobalSolverType === 'function'
        ? trafficStrategy.getGlobalSolverType()
        : null;
    const resolvedDepth = Number.isFinite(depth) ? Math.max(0, Math.floor(depth)) : 1;
    const useGroupSearch = full || global;
    const maxRobots = useGroupSearch ? Math.max(2, Math.min(4, resolvedDepth + 1)) : 2;
    const nodeMultiplier =
      solverType === 'csp' ? 18 : solverType === 'mstar' ? 14 : solverType === 'pibt' ? 10 : 12;
    const maxNodes = useGroupSearch ? Math.max(24, resolvedDepth * nodeMultiplier) : 0;
    return {
      enabled: true,
      full,
      global,
      solver: solverType,
      depth: resolvedDepth,
      waitThresholdMs: Number.isFinite(waitThresholdMs) ? waitThresholdMs : 2000,
      cooldownMs: Number.isFinite(cooldownMs) ? cooldownMs : 1200,
      maxNodes,
      maxRobots
    };
  };

  const getRouteFirstEdgeGroupKey = (route, robot) => {
    if (!route?.segments?.length) return null;
    const startIndex = Math.max(0, route.segmentIndex || 0);
    for (let i = startIndex; i < route.segments.length; i += 1) {
      const segment = route.segments[i];
      const key = resolveEdgeLockKey(segment, robot);
      if (key) return key;
    }
    return null;
  };

  const getRuntimeEdgeGroupKey = (runtime, robot) =>
    getRouteFirstEdgeGroupKey(runtime?.route || null, robot);

  const trimRouteToLength = (route, maxLength) => {
    if (!route?.segments?.length || !Number.isFinite(maxLength)) return route;
    let remaining = maxLength;
    const segments = [];
    for (const segment of route.segments) {
      if (!segment || remaining <= 0) break;
      const length = Number.isFinite(segment.totalLength) ? segment.totalLength : null;
      if (segments.length === 0) {
        segments.push({ ...segment });
        remaining -= length || 0;
        continue;
      }
      if (length == null || length <= remaining) {
        segments.push({ ...segment });
        remaining -= length || 0;
        continue;
      }
      break;
    }
    if (!segments.length) return route;
    const last = segments[segments.length - 1];
    const finalPose = polylineAtDistance(last.polyline, last.totalLength);
    const finalHeading = getSegmentEndHeading(last);
    return {
      ...route,
      segments,
      segmentIndex: 0,
      segmentProgress: 0,
      finalTarget: { pos: { x: finalPose.x, y: finalPose.y }, heading: finalHeading }
    };
  };

  const applyRuntimeRoute = (robot, runtime, route, previousEdgeGroupKey, options = {}) => {
    const dispatchingLength =
      runtime?.mode === 'manual' ? null : trafficStrategy?.getDispatchingLength(robot) || null;
    const trimmed = dispatchingLength ? trimRouteToLength(route, dispatchingLength) : route;
    const nextEdgeGroupKey = getRouteFirstEdgeGroupKey(trimmed, robot);
    if (previousEdgeGroupKey && previousEdgeGroupKey !== nextEdgeGroupKey) {
      releaseEdgeLock(previousEdgeGroupKey, robot.id);
      if (shouldUseDeterministicEdgeLocks() || trafficStrategy?.useEdgeQueues?.()) {
        releaseRobotEdgeQueues(robot.id);
      }
    }
    clearRuntimeStall(runtime);
    clearRuntimeStuck(runtime);
    runtime.holdState = null;
    runtime.entryHold = null;
    runtime.entryHoldBypass = null;
    invalidateEntryHoldWaiterCache();
    runtime.entryHoldArb = null;
    runtime.scheduleSlip = null;
    runtime.scheduleResyncAfterSegment = false;
    runtime.scheduleResyncAt = null;
    runtime.deadlockInfo = null;
    runtime.deadlockResolvedAt = null;
    runtime.edgeLockYield = null;
    runtime.edgeLockYieldAt = null;
    runtime.edgeLockHold = null;
    runtime.nodeLockHold = null;
    runtime.lastTrafficBlock = null;
    runtime.route = trimmed;
    runtime.routeLimit = dispatchingLength;
    runtime.targetHeading = trimmed.finalTarget.heading;
    runtime.lastPlanAt = Date.now();
    if (trafficStrategy?.useTimeReservations?.()) {
      const lockSchedule = Boolean(options.scheduleLocked || trimmed?.scheduleLocked);
      if (lockSchedule && trimmed?.schedule?.length) {
        releaseTimeReservations(robot.id);
        const reserved = reserveRouteSchedule(robot, trimmed);
        if (!reserved) {
          trimmed.scheduleLocked = false;
          refreshRouteSchedule(robot, runtime, runtime.lastPlanAt, { force: true });
        }
      } else {
        refreshRouteSchedule(robot, runtime, runtime.lastPlanAt);
      }
    }
    return trimmed;
  };

  const applyConflictConstraint = (table, conflict, bufferMs) => {
    if (!table || !conflict) return table;
    if (!conflict.key || !conflict.type) return table;
    const start = Number.isFinite(conflict.startTime)
      ? conflict.startTime - bufferMs
      : null;
    const end = Number.isFinite(conflict.endTime) ? conflict.endTime + bufferMs : null;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return table;
    const constraint = {
      holder: conflict.holder || null,
      source: 'constraint',
      startTime: Math.min(start, end),
      endTime: Math.max(start, end)
    };
    addConstraint(table, conflict.type, conflict.key, constraint);
    return table;
  };

  const reserveRouteSchedule = (robot, route) => {
    if (!robot || !route?.schedule?.length) return null;
    const profile = route.scheduleProfile || getReservationProfile(robot);
    if (profile) {
      seedStaticTimeReservations(Date.now(), profile);
    }
    const table = ensureReservationTable(profile);
    if (!profile || !table) return null;
    let reservedOk = true;
    const sectionSpans = new Map();
    route.schedule.forEach((entry) => {
      const segment =
        Number.isFinite(entry.segmentIndex)
          ? route.segments?.[entry.segmentIndex] || null
          : null;
      const primaryEdgeKey =
        resolveTimeReservationEdgeKey(segment, robot) ||
        entry.edgeGroupKey ||
        entry.edgeKey ||
        null;
      const conflictKey =
        segment?.edgeBaseGroupKey ||
        segment?.edgeGroupKey ||
        entry.edgeBaseGroupKey ||
        entry.edgeGroupKey ||
        primaryEdgeKey;
      const includeBaseKey =
        Boolean(primaryEdgeKey && conflictKey && primaryEdgeKey === conflictKey);
      const edgeKeys = collectEdgeConflictKeys(primaryEdgeKey, conflictKey, { includeBaseKey });
      if (edgeKeys.length && Number.isFinite(entry.startTime) && Number.isFinite(entry.arrivalTime)) {
        edgeKeys.forEach((edgeKey) => {
          if (!edgeKey) return;
          const result = table.reserveEdge(edgeKey, robot.id, entry.startTime, entry.arrivalTime);
          recordEvent('reservation_edge', {
            robotId: robot.id,
            edgeKey,
            startTime: entry.startTime,
            arrivalTime: entry.arrivalTime,
            ok: result.ok,
            conflict: result.conflict || null
          });
          if (!result.ok) reservedOk = false;
        });
      }
      const nodeId =
        entry.toNodeId && !String(entry.toNodeId).startsWith('__') ? entry.toNodeId : null;
      if (nodeId && Number.isFinite(entry.arrivalTime)) {
        const nodeBuffer = getNodeReservationBufferMs(robot, segment);
        const nodeStart = entry.arrivalTime - (nodeBuffer?.approachMs || 0);
        const nodeDwellMs =
          (profile.nodeDwellMs || 0) +
          (nodeBuffer?.approachMs || 0) +
          (nodeBuffer?.clearMs || 0);
        const result = table.reserveNode(nodeId, robot.id, nodeStart, nodeDwellMs);
        recordEvent('reservation_node', {
          robotId: robot.id,
          nodeId,
          startTime: nodeStart,
          dwellMs: nodeDwellMs,
          ok: result.ok,
          conflict: result.conflict || null
        });
        if (!result.ok) reservedOk = false;
      }
      if (
        entry.criticalSectionSpanId &&
        Number.isFinite(entry.criticalSectionStart) &&
        Number.isFinite(entry.criticalSectionEnd)
      ) {
        if (!sectionSpans.has(entry.criticalSectionSpanId)) {
          sectionSpans.set(entry.criticalSectionSpanId, {
            id: entry.criticalSectionId,
            start: entry.criticalSectionStart,
            end: entry.criticalSectionEnd
          });
        }
      }
    });
    if (criticalSectionTable && criticalSectionIndex?.enabled) {
      if (!sectionSpans.size) {
        const sectionMeta = buildCriticalSectionRanges(route.segments || []);
        const sectionMode = criticalSectionIndex?.mode || 'ORDERING';
        if (!(sectionMode === 'ORDERING' && !sectionMeta.ordered)) {
          const startIndex = Math.max(0, route.segmentIndex || 0);
          const scheduleByIndex = new Map(
            route.schedule
              .filter((entry) => Number.isFinite(entry.segmentIndex))
              .map((entry) => [entry.segmentIndex, entry])
          );
          let reservedSection = false;
          (sectionMeta.ranges || []).forEach((range) => {
            if (!range) return;
            if (range.endIndex < startIndex) return;
            if (sectionMode === 'BANKER' && reservedSection) return;
            const effectiveStart = Math.max(range.startIndex, startIndex);
            const startEntry = scheduleByIndex.get(effectiveStart);
            const endEntry = scheduleByIndex.get(range.endIndex);
            if (!startEntry || !endEntry) return;
            if (!Number.isFinite(startEntry.startTime) || !Number.isFinite(endEntry.arrivalTime)) {
              return;
            }
            const spanId = `${range.id}:${effectiveStart}`;
            sectionSpans.set(spanId, {
              id: range.id,
              start: startEntry.startTime,
              end: endEntry.arrivalTime
            });
            reservedSection = true;
          });
        }
      }
      sectionSpans.forEach((span) => {
        if (!span?.id || !Number.isFinite(span.start) || !Number.isFinite(span.end)) return;
        const capacity = resolveCriticalSectionCapacity(span.id);
        const result = criticalSectionTable.reserve(
          span.id,
          robot.id,
          span.start,
          span.end,
          capacity
        );
        recordEvent('reservation_section', {
          robotId: robot.id,
          sectionId: span.id,
          startTime: span.start,
          endTime: span.end,
          ok: result.ok,
          conflict: result.conflict || null
        });
        if (!result.ok) reservedOk = false;
      });
    }
    if (!reservedOk) {
      releaseTimeReservations(robot.id);
      return null;
    }
    route.scheduleProfile = profile;
    route.scheduleUpdatedAt = Date.now();
    return table;
  };

  const resolveCbsLiteConflict = (
    robot,
    runtime,
    targetPos,
    targetNodeId,
    route,
    baseConstraints,
    settings,
    options = {}
  ) => {
    if (!settings.enabled || settings.depth <= 0) {
      return { route, constraints: baseConstraints };
    }
    if (options.skipCbs) {
      return { route, constraints: baseConstraints };
    }
    const now = Date.now();
    if (runtime?.cbsCooldownUntil && now < runtime.cbsCooldownUntil) {
      return { route, constraints: baseConstraints };
    }
    const conflict = pickRouteConflictCandidate(route, settings.waitThresholdMs);
    if (!conflict || !conflict.holder) {
      return { route, constraints: baseConstraints };
    }
    const otherRobotId = conflict.holder;
    if (otherRobotId === robot?.id) {
      return { route, constraints: baseConstraints };
    }
    const otherRobot = getRobotById(otherRobotId);
    const otherRuntime = getRobotRuntime(otherRobotId);
    if (!otherRobot || !otherRuntime?.routeGoal?.pos) {
      return { route, constraints: baseConstraints };
    }

    const profile = getReservationProfile(robot);
    const bufferMs = Number.isFinite(profile?.safetyMs)
      ? profile.safetyMs
      : RESERVATION_DEFAULT_SAFETY_MS;
    const baseTable = pruneConstraints(createConstraintTable(baseConstraints), now);
    const constraintA = applyConflictConstraint(createConstraintTable(baseTable), conflict, bufferMs);
    const routeA = buildRoute(robot.pos, targetPos, targetNodeId, {
      robotId: robot.id,
      constraints: constraintA
    });

    let routeB = null;
    let constraintB = null;
    const selfPriority = getRobotPriority(robot);
    const otherPriority = getRobotPriority(otherRobot);
    const allowReplanOther =
      otherPriority <= selfPriority &&
      otherRuntime.mode !== 'manual' &&
      !otherRuntime.paused &&
      otherRobot.online !== false;
    if (allowReplanOther) {
      constraintB = applyConflictConstraint(
        pruneConstraints(createConstraintTable(otherRuntime.cbsConstraints), now),
        conflict,
        bufferMs
      );
      routeB = buildRoute(otherRobot.pos, otherRuntime.routeGoal.pos, otherRuntime.routeGoal.nodeId, {
        robotId: otherRobot.id,
        constraints: constraintB
      });
    }

    if (!routeA && !routeB) {
      return { route, constraints: baseTable };
    }

    const baseEnd = getRouteScheduleEndTime(route);
    const otherEnd = getRouteScheduleEndTime(otherRuntime.route);
    const endA = getRouteScheduleEndTime(routeA);
    const endB = getRouteScheduleEndTime(routeB);
    const costA = routeA ? Math.max(endA || Infinity, otherEnd || Infinity) : Infinity;
    const costB = routeB ? Math.max(baseEnd || Infinity, endB || Infinity) : Infinity;

    if (routeA && (!routeB || costA <= costB)) {
      let depthLeft = settings.depth - 1;
      let nextRoute = routeA;
      let nextConstraints = constraintA;
      while (depthLeft > 0) {
        const nextConflict = pickRouteConflictCandidate(nextRoute, settings.waitThresholdMs);
        if (!nextConflict) break;
        const chained = applyConflictConstraint(
          pruneConstraints(createConstraintTable(nextConstraints), now),
          nextConflict,
          bufferMs
        );
        const chainedRoute = buildRoute(robot.pos, targetPos, targetNodeId, {
          robotId: robot.id,
          constraints: chained
        });
        if (!chainedRoute) break;
        nextRoute = chainedRoute;
        nextConstraints = chained;
        depthLeft -= 1;
      }
      runtime.cbsCooldownUntil = now + settings.cooldownMs;
      return { route: nextRoute, constraints: nextConstraints };
    }

    if (routeB) {
      otherRuntime.cbsCooldownUntil = now + settings.cooldownMs;
      otherRuntime.cbsConstraints = constraintB;
      const otherPrevKey = getRuntimeEdgeGroupKey(otherRuntime, otherRobot);
      applyRuntimeRoute(otherRobot, otherRuntime, routeB, otherPrevKey);
      runtime.cbsCooldownUntil = now + settings.cooldownMs;
    }

    return { route, constraints: baseTable };
  };

  const resolveCbsFullConflict = (
    robot,
    runtime,
    targetPos,
    targetNodeId,
    route,
    baseConstraints,
    settings,
    options = {}
  ) => {
    if (!settings.enabled || settings.depth <= 0) {
      return { route, constraints: baseConstraints };
    }
    if (options.skipCbs) {
      return { route, constraints: baseConstraints };
    }
    const now = Date.now();
    if (runtime?.cbsCooldownUntil && now < runtime.cbsCooldownUntil) {
      return { route, constraints: baseConstraints };
    }
    const group = buildCbsGroup(robot, route, settings);
    if (group.length < 2) {
      return { route, constraints: baseConstraints };
    }

    const goalsByRobot = new Map();
    group.forEach((robotId) => {
      if (robotId === robot?.id) {
        goalsByRobot.set(robotId, { pos: { ...targetPos }, nodeId: targetNodeId || null });
        return;
      }
      const otherRuntime = getRobotRuntime(robotId);
      if (otherRuntime?.routeGoal?.pos) {
        goalsByRobot.set(robotId, {
          pos: { ...otherRuntime.routeGoal.pos },
          nodeId: otherRuntime.routeGoal.nodeId || null
        });
      }
    });

    const baseConstraintsByRobot = new Map();
    group.forEach((robotId) => {
      if (robotId === robot?.id) {
        baseConstraintsByRobot.set(robotId, baseConstraints);
        return;
      }
      const otherRuntime = getRobotRuntime(robotId);
      baseConstraintsByRobot.set(robotId, otherRuntime?.cbsConstraints || null);
    });

    const open = new MinHeap((a, b) => {
      if (a.cost !== b.cost) return a.cost - b.cost;
      return a.depth - b.depth;
    });
    const rootConstraints = new Map();
    group.forEach((robotId) => {
      const base = baseConstraintsByRobot.get(robotId);
      rootConstraints.set(robotId, pruneConstraints(createConstraintTable(base), now));
    });
    const rootRoutes = new Map();
    for (const robotId of group) {
      const robotEntity = getRobotById(robotId);
      const goal = goalsByRobot.get(robotId);
      if (!robotEntity?.pos || !goal?.pos) {
        return { route, constraints: baseConstraints };
      }
      const constraints = rootConstraints.get(robotId);
      const nextRoute = buildRoute(robotEntity.pos, goal.pos, goal.nodeId, {
        robotId,
        constraints,
        excludeRobotIds: group,
        nowMs: now
      });
      if (!nextRoute) {
        return { route, constraints: baseConstraints };
      }
      rootRoutes.set(robotId, nextRoute);
    }
    open.push({
      constraintsByRobot: rootConstraints,
      routes: rootRoutes,
      depth: 0,
      cost: computeCbsCost(rootRoutes, now)
    });

    let iterations = 0;
    while (open.size && iterations < settings.maxNodes) {
      const node = open.pop();
      if (!node) break;
      const conflict = detectCbsConflict(node.routes);
      if (!conflict) {
        group.forEach((robotId) => {
          const runtimeEntry = getRobotRuntime(robotId);
          if (!runtimeEntry) return;
          runtimeEntry.cbsConstraints = node.constraintsByRobot.get(robotId) || null;
          runtimeEntry.cbsCooldownUntil = now + settings.cooldownMs;
        });
        group.forEach((robotId) => {
          if (robotId === robot?.id) return;
          const robotEntity = getRobotById(robotId);
          const runtimeEntry = getRobotRuntime(robotId);
          const nextRoute = node.routes.get(robotId);
          if (!robotEntity || !runtimeEntry || !nextRoute) return;
          const prevKey = getRuntimeEdgeGroupKey(runtimeEntry, robotEntity);
          applyRuntimeRoute(robotEntity, runtimeEntry, nextRoute, prevKey);
        });
        return {
          route: node.routes.get(robot.id) || route,
          constraints: node.constraintsByRobot.get(robot.id) || baseConstraints
        };
      }
      if (node.depth >= settings.depth) {
        iterations += 1;
        continue;
      }

      const robotA = conflict.robotA;
      const robotB = conflict.robotB;
      const priorityA = getRobotPriorityById(robotA);
      const priorityB = getRobotPriorityById(robotB);
      let splitTargets = [robotA, robotB];
      if (priorityA > priorityB) {
        splitTargets = [robotB];
      } else if (priorityB > priorityA) {
        splitTargets = [robotA];
      }

      splitTargets.forEach((targetId) => {
        const otherId = targetId === robotA ? robotB : robotA;
        if (!group.includes(targetId)) return;
        const base = node.constraintsByRobot.get(targetId);
        const targetRobot = getRobotById(targetId);
        const otherRobot = getRobotById(otherId);
        if (!targetRobot?.pos) return;
        const baseProfile = getReservationProfile(targetRobot);
        const otherProfile = getReservationProfile(otherRobot);
        const bufferMs = Math.max(
          Number.isFinite(baseProfile?.safetyMs) ? baseProfile.safetyMs : RESERVATION_DEFAULT_SAFETY_MS,
          Number.isFinite(otherProfile?.safetyMs) ? otherProfile.safetyMs : RESERVATION_DEFAULT_SAFETY_MS
        );
        const constraint = applyConflictConstraint(
          createConstraintTable(base),
          {
            type: conflict.type,
            key: conflict.key,
            startTime: conflict.startTime,
            endTime: conflict.endTime,
            holder: otherId
          },
          bufferMs
        );
        const nextConstraints = new Map(node.constraintsByRobot);
        nextConstraints.set(targetId, constraint);
        const nextRoutes = new Map(node.routes);
        const goal = goalsByRobot.get(targetId);
        if (!goal?.pos) return;
        const nextRoute = buildRoute(
          targetRobot.pos,
          goal.pos,
          goal.nodeId,
          {
            robotId: targetId,
            constraints: constraint,
            excludeRobotIds: group,
            nowMs: now
          }
        );
        if (!nextRoute) return;
        nextRoutes.set(targetId, nextRoute);
        open.push({
          constraintsByRobot: nextConstraints,
          routes: nextRoutes,
          depth: node.depth + 1,
          cost: computeCbsCost(nextRoutes, now)
        });
      });

      iterations += 1;
    }

    return { route, constraints: baseConstraints };
  };

  const buildRouteFromNodePath = (
    startPos,
    targetPos,
    pathNodes,
    options = {}
  ) => {
    if (!navGraph || !startPos || !targetPos) return null;
    if (!Array.isArray(pathNodes) || !pathNodes.length) return null;
    const segments = [];
    const startNodeId = pathNodes[0];
    const goalNodeId = pathNodes[pathNodes.length - 1];
    const startNode = navGraph.nodesById.get(startNodeId);
    const goalNode = navGraph.nodesById.get(goalNodeId);
    if (!startNode || !goalNode) return null;
    const startDist = distanceBetweenPoints(startPos, startNode.pos);
    if (Number.isFinite(startDist) && startDist > ROUTE_SNAP_DISTANCE) {
      segments.push({
        ...buildSimpleSegment(startPos, startNode.pos),
        edgeGroupKey: null,
        edgeBaseGroupKey: null,
        width: 0,
        fromNodeId: null,
        toNodeId: startNodeId,
        criticalSectionId: null
      });
    }
    for (let i = 0; i < pathNodes.length - 1; i += 1) {
      const fromId = pathNodes[i];
      const toId = pathNodes[i + 1];
      const edgeKey = `${fromId}->${toId}`;
      const edge = navGraph.edgesByKey.get(edgeKey);
      if (!edge) continue;
      segments.push({
        polyline: edge.polyline,
        totalLength: edge.totalLength,
        driveBackward: edge.driveBackward,
        edgeKey: edge.edgeKey || edgeKey,
        edgeGroupKey: edge.edgeGroupKey || makeEdgeGroupKey(edge.startId, edge.endId),
        edgeBaseGroupKey:
          edge.edgeBaseGroupKey ||
          edge.edgeGroupKey ||
          makeEdgeGroupKey(edge.startId, edge.endId),
        width: Number.isFinite(edge.width) ? edge.width : 0,
        fromNodeId: edge.startId,
        toNodeId: edge.endId,
        criticalSectionId: edge.criticalSectionId || null
      });
    }
    const endDist = distanceBetweenPoints(goalNode.pos, targetPos);
    if (Number.isFinite(endDist) && endDist > ROBOT_ARRIVAL_DISTANCE) {
      segments.push({
        ...buildSimpleSegment(goalNode.pos, targetPos),
        edgeGroupKey: null,
        edgeBaseGroupKey: null,
        width: 0,
        fromNodeId: goalNodeId,
        toNodeId: null,
        criticalSectionId: null
      });
    }
    const finalHeading = segments.length ? getSegmentEndHeading(segments[segments.length - 1]) : 0;
    const targetHeading = Number.isFinite(targetPos.angle) ? targetPos.angle : finalHeading;
    return {
      segments,
      segmentIndex: 0,
      segmentProgress: 0,
      pathNodes,
      plannedAt: Number.isFinite(options.nowMs) ? options.nowMs : Date.now(),
      plannerStats: options.plannerStats || null,
      finalTarget: { pos: { ...targetPos }, heading: targetHeading }
    };
  };

  const buildScheduleFromPlan = (route, moves, nowMs, stepMs) => {
    if (!Scheduler?.buildScheduleFromPlan) return [];
    return Scheduler.buildScheduleFromPlan(buildSchedulerContext(), {
      route,
      moves,
      nowMs,
      stepMs
    });
  };

  const resolveGlobalMapfConflict = (
    robot,
    runtime,
    targetPos,
    targetNodeId,
    route,
    baseConstraints,
    settings,
    options = {}
  ) => {
    const fallback = () =>
      resolveCbsFullConflict(
        robot,
        runtime,
        targetPos,
        targetNodeId,
        route,
        baseConstraints,
        settings,
        options
      );
    if (!settings.enabled || !settings.global || settings.depth <= 0) {
      return fallback();
    }
    if (options.skipCbs) {
      return fallback();
    }
    const now = Date.now();
    if (runtime?.cbsCooldownUntil && now < runtime.cbsCooldownUntil) {
      return fallback();
    }

    const overrideGroup = Array.isArray(options.groupOverride)
      ? options.groupOverride.filter(Boolean)
      : null;
    const group =
      overrideGroup && overrideGroup.length >= 2
        ? Array.from(new Set(overrideGroup))
        : buildCbsGroup(robot, route, settings);
    if (robot?.id && !group.includes(robot.id)) {
      group.push(robot.id);
    }
    if (group.length < 2) {
      return fallback();
    }

    const robotsMeta = [];
    let stepMs = null;
    let horizonMs = null;
    const constraintsByRobot = new Map();
    const goalsByRobot = new Map();
    for (const robotId of group) {
      const robotEntity = getRobotById(robotId);
      const runtimeEntry = getRobotRuntime(robotId);
      if (!robotEntity?.pos) {
        return fallback();
      }
      const profile = getReservationProfile(robotEntity) || {};
      const profileStepMs = Number.isFinite(profile.stepMs)
        ? profile.stepMs
        : RESERVATION_DEFAULT_STEP_MS;
      const profileHorizonMs = Number.isFinite(profile.horizonMs)
        ? profile.horizonMs
        : RESERVATION_DEFAULT_HORIZON_MS;
      stepMs = stepMs == null ? profileStepMs : Math.min(stepMs, profileStepMs);
      horizonMs = horizonMs == null ? profileHorizonMs : Math.max(horizonMs, profileHorizonMs);
      const startNode = findNearestNavNode(robotEntity.pos);
      const startDist = startNode?.pos
        ? distanceBetweenPoints(robotEntity.pos, startNode.pos)
        : Infinity;
      if (!startNode || startDist > ROUTE_SNAP_DISTANCE * 1.6) {
        return fallback();
      }
      let goalNodeId = null;
      let goalPos = null;
      if (robotId === robot?.id) {
        goalPos = targetPos;
        goalNodeId = targetNodeId || null;
      } else if (runtimeEntry?.routeGoal?.pos) {
        goalPos = runtimeEntry.routeGoal.pos;
        goalNodeId = runtimeEntry.routeGoal.nodeId || null;
      }
      if (!goalNodeId) {
        const goalNode = goalPos ? findNearestNavNode(goalPos) : null;
        const goalDist = goalNode?.pos ? distanceBetweenPoints(goalPos, goalNode.pos) : Infinity;
        if (!goalNode || goalDist > ROUTE_SNAP_DISTANCE * 1.6) {
          return fallback();
        }
        goalNodeId = goalNode.id;
      }
      goalsByRobot.set(robotId, goalNodeId);
      const base = robotId === robot?.id ? baseConstraints : runtimeEntry?.cbsConstraints || null;
      constraintsByRobot.set(robotId, pruneConstraints(createConstraintTable(base), now));
      robotsMeta.push({
        id: robotId,
        robot: robotEntity,
        runtime: runtimeEntry,
        startNodeId: startNode.id,
        goalNodeId,
        profile
      });
    }

    const maxSteps = Math.max(1, Math.ceil((horizonMs || RESERVATION_DEFAULT_HORIZON_MS) / stepMs));
    const reservations = buildReservationTable(now, null, { excludeRobotIds: group });

    const nodePositions = navGraph?.nodesById || new Map();
    const edgeLookup = navGraph?.edgesByKey || new Map();

    const metaById = new Map();
    robotsMeta.forEach((meta) => {
      const speedMps = meta.profile?.speedMps || getRobotMotionProfile(meta.robot)?.speedMps || robotSpeedMps;
      const stepMeters = (speedMps * stepMs) / 1000;
      const dwellMs = Number.isFinite(meta.profile?.nodeDwellMs)
        ? meta.profile.nodeDwellMs
        : RESERVATION_DEFAULT_NODE_DWELL_MS;
      metaById.set(meta.id, {
        ...meta,
        speedMps,
        stepMeters: Math.max(1e-3, stepMeters),
        dwellSteps: Math.max(1, Math.ceil(dwellMs / stepMs)),
        dwellMs
      });
    });

    const hasOverlap = (list, start, end) => findReservationOverlap(list, start, end);
    const isEdgeAvailable = (robotId, edgeKey, startMs, endMs) => {
      if (!edgeKey) return true;
      const constraints = constraintsByRobot.get(robotId);
      const edgeConstraints = constraints?.edges?.get(edgeKey) || null;
      if (edgeConstraints && hasOverlap(edgeConstraints, startMs, endMs)) {
        return false;
      }
      const edgeReservations = reservations.edges.get(edgeKey) || null;
      if (edgeReservations && hasOverlap(edgeReservations, startMs, endMs)) {
        return false;
      }
      return true;
    };
    const isNodeAvailable = (robotId, nodeId, startMs, endMs) => {
      if (!nodeId) return true;
      const constraints = constraintsByRobot.get(robotId);
      const nodeConstraints = constraints?.nodes?.get(nodeId) || null;
      if (nodeConstraints && hasOverlap(nodeConstraints, startMs, endMs)) {
        return false;
      }
      const nodeReservations = reservations.nodes.get(nodeId) || null;
      if (nodeReservations && hasOverlap(nodeReservations, startMs, endMs)) {
        return false;
      }
      return true;
    };

    const encodeState = (timeStep, states) =>
      `${timeStep}|${states
        .map((state) => {
          if (state.mode === 'edge') {
            return `e:${state.edgeGroupKey}:${state.toNodeId}:${state.remainingSteps}:${state.fromNodeId}`;
          }
          return `n:${state.nodeId}:${state.prevNodeId || ''}:${state.holdSteps || 0}`;
        })
        .join('|')}`;

    const computeHeuristic = (states) => {
      let best = 0;
      states.forEach((state, index) => {
        const meta = robotsMeta[index];
        const info = metaById.get(meta.id);
        if (!info) return;
        if (state.mode === 'edge') {
          const toNode = nodePositions.get(state.toNodeId);
          const goalNode = nodePositions.get(info.goalNodeId);
          if (toNode && goalNode) {
            const dist = distanceBetweenPoints(toNode.pos, goalNode.pos);
            const steps = Math.ceil(dist / info.stepMeters);
            best = Math.max(best, state.remainingSteps + steps);
          } else {
            best = Math.max(best, state.remainingSteps);
          }
        } else {
          const node = nodePositions.get(state.nodeId);
          const goalNode = nodePositions.get(info.goalNodeId);
          if (node && goalNode) {
            const dist = distanceBetweenPoints(node.pos, goalNode.pos);
            const steps = Math.ceil(dist / info.stepMeters);
            best = Math.max(best, steps);
          }
        }
      });
      return best;
    };

    const isGoalState = (states) =>
      states.every((state, index) => {
        const meta = robotsMeta[index];
        return state.mode === 'node' && state.nodeId === meta.goalNodeId && state.holdSteps === 0;
      });

    const buildActionsForRobot = (state, meta, timeMs) => {
      const info = metaById.get(meta.id);
      if (!info) return [];
      if (state.mode === 'edge') {
        const nextRemaining = state.remainingSteps - 1;
        const edgeKey = state.edgeGroupKey;
        const edgeOk = isEdgeAvailable(meta.id, edgeKey, timeMs, timeMs + stepMs);
        if (!edgeOk) return [];
        if (nextRemaining <= 0) {
          const holdSteps = Math.max(0, info.dwellSteps - 1);
          const nodeOk = isNodeAvailable(
            meta.id,
            state.toNodeId,
            timeMs + stepMs,
            timeMs + stepMs + info.dwellMs
          );
          if (!nodeOk) return [];
          return [
            {
              nextState: {
                mode: 'node',
                nodeId: state.toNodeId,
                prevNodeId: state.fromNodeId,
                holdSteps
              },
              edgeGroupKey: edgeKey,
              nodeIdNext: state.toNodeId
            }
          ];
        }
        return [
          {
            nextState: { ...state, remainingSteps: nextRemaining },
            edgeGroupKey: edgeKey,
            nodeIdNext: null
          }
        ];
      }

      const actions = [];
      const nodeId = state.nodeId;
      const holdSteps = state.holdSteps || 0;
      const nodeOk = isNodeAvailable(
        meta.id,
        nodeId,
        timeMs + stepMs,
        timeMs + stepMs + info.dwellMs
      );
      if (nodeOk) {
        actions.push({
          nextState: {
            mode: 'node',
            nodeId,
            prevNodeId: state.prevNodeId || null,
            holdSteps: Math.max(0, holdSteps - 1)
          },
          edgeGroupKey: null,
          nodeIdNext: nodeId
        });
      }
      if (holdSteps > 0 || nodeId === meta.goalNodeId) {
        return actions;
      }
      const neighbors = navGraph.adjacency.get(nodeId) || [];
      for (const step of neighbors) {
        if (state.prevNodeId && step.to === state.prevNodeId) {
          const noTurnaround = trafficStrategy?.allowTurnaround?.() === false;
          if (noTurnaround) continue;
        }
        const edge = edgeLookup.get(step.edgeKey);
        if (!edge) continue;
        if (isEdgeBlocked(edge, { robotId: meta.id, robotWidth: getRobotWidth(meta.robot) })) {
          continue;
        }
        const travelMs = estimateTravelMs(edge.totalLength, meta.robot);
        const travelSteps = Math.max(1, Math.ceil(travelMs / stepMs));
        const edgeGroupKey = edge.edgeGroupKey || edge.edgeBaseGroupKey || makeEdgeGroupKey(edge.startId, edge.endId);
        if (!isEdgeAvailable(meta.id, edgeGroupKey, timeMs, timeMs + stepMs)) {
          continue;
        }
        if (travelSteps <= 1) {
          const arriveNodeOk = isNodeAvailable(
            meta.id,
            edge.endId,
            timeMs + stepMs,
            timeMs + stepMs + info.dwellMs
          );
          if (!arriveNodeOk) continue;
          actions.push({
            nextState: {
              mode: 'node',
              nodeId: edge.endId,
              prevNodeId: edge.startId,
              holdSteps: Math.max(0, info.dwellSteps - 1)
            },
            edgeGroupKey,
            nodeIdNext: edge.endId
          });
        } else {
          actions.push({
            nextState: {
              mode: 'edge',
              edgeGroupKey,
              edgeKey: edge.edgeKey || step.edgeKey,
              fromNodeId: edge.startId,
              toNodeId: edge.endId,
              remainingSteps: travelSteps - 1
            },
            edgeGroupKey,
            nodeIdNext: null
          });
        }
      }
      return actions;
    };

    const initialStates = robotsMeta.map((meta) => ({
      mode: 'node',
      nodeId: meta.startNodeId,
      prevNodeId: null,
      holdSteps: 0
    }));
    const startKey = encodeState(0, initialStates);
    const open = new MinHeap((a, b) => {
      if (a.f !== b.f) return a.f - b.f;
      return a.h - b.h;
    });
    open.push({
      timeStep: 0,
      states: initialStates,
      g: 0,
      h: computeHeuristic(initialStates),
      f: computeHeuristic(initialStates),
      prev: null
    });
    const visited = new Set([startKey]);
    let expansions = 0;
    let solution = null;

    while (open.size && expansions < settings.maxNodes && !solution) {
      const current = open.pop();
      if (!current) break;
      if (isGoalState(current.states)) {
        solution = current;
        break;
      }
      if (current.timeStep >= maxSteps) {
        expansions += 1;
        continue;
      }
      const timeMs = now + current.timeStep * stepMs;
      const actionsByRobot = current.states.map((state, index) =>
        buildActionsForRobot(state, robotsMeta[index], timeMs)
      );
      const nextStates = new Array(robotsMeta.length);
      const edgeSet = new Set();
      const nodeSet = new Set();
      const backtrack = (idx) => {
        if (idx >= robotsMeta.length) {
          const nextTime = current.timeStep + 1;
          const key = encodeState(nextTime, nextStates);
          if (visited.has(key)) return;
          visited.add(key);
          const h = computeHeuristic(nextStates);
          open.push({
            timeStep: nextTime,
            states: nextStates.map((state) => ({ ...state })),
            g: nextTime,
            h,
            f: nextTime + h,
            prev: current
          });
          return;
        }
        const actions = actionsByRobot[idx];
        if (!actions?.length) return;
        for (const action of actions) {
          if (action.edgeGroupKey && edgeSet.has(action.edgeGroupKey)) continue;
          if (action.nodeIdNext && nodeSet.has(action.nodeIdNext)) continue;
          if (action.edgeGroupKey) edgeSet.add(action.edgeGroupKey);
          if (action.nodeIdNext) nodeSet.add(action.nodeIdNext);
          nextStates[idx] = action.nextState;
          backtrack(idx + 1);
          if (action.edgeGroupKey) edgeSet.delete(action.edgeGroupKey);
          if (action.nodeIdNext) nodeSet.delete(action.nodeIdNext);
        }
      };
      backtrack(0);
      expansions += 1;
    }

    if (!solution) {
      return fallback();
    }

    const timeline = [];
    let cursor = solution;
    while (cursor) {
      timeline.unshift(cursor.states);
      cursor = cursor.prev;
    }

    const routesByRobot = new Map();
    let buildFailed = false;
    robotsMeta.forEach((meta, index) => {
      const nodes = [meta.startNodeId];
      const moves = [];
      let activeMove = null;
      for (let t = 0; t < timeline.length - 1; t += 1) {
        const state = timeline[t][index];
        const nextState = timeline[t + 1][index];
        if (state.mode === 'node') {
          if (nextState.mode === 'node') {
            if (state.nodeId !== nextState.nodeId) {
              const edgeKey = `${state.nodeId}->${nextState.nodeId}`;
              const edge = edgeLookup.get(edgeKey);
              moves.push({
                fromNodeId: state.nodeId,
                toNodeId: nextState.nodeId,
                edgeKey: edge?.edgeKey || edgeKey,
                edgeGroupKey: edge?.edgeGroupKey || makeEdgeGroupKey(state.nodeId, nextState.nodeId),
                edgeBaseGroupKey:
                  edge?.edgeBaseGroupKey ||
                  edge?.edgeGroupKey ||
                  makeEdgeGroupKey(state.nodeId, nextState.nodeId),
                startStep: t,
                arrivalStep: t + 1
              });
              nodes.push(nextState.nodeId);
            }
          } else if (nextState.mode === 'edge') {
            activeMove = {
              fromNodeId: state.nodeId,
              toNodeId: nextState.toNodeId,
              edgeKey: nextState.edgeKey || `${state.nodeId}->${nextState.toNodeId}`,
              edgeGroupKey: nextState.edgeGroupKey,
              edgeBaseGroupKey: nextState.edgeGroupKey,
              startStep: t
            };
          }
        } else if (state.mode === 'edge') {
          if (nextState.mode === 'node' && activeMove) {
            moves.push({
              ...activeMove,
              arrivalStep: t + 1
            });
            nodes.push(nextState.nodeId);
            activeMove = null;
          }
        }
      }
      const goalPos =
        meta.id === robot?.id ? targetPos : meta.runtime?.routeGoal?.pos || meta.robot.pos;
      const nextRoute = buildRouteFromNodePath(meta.robot.pos, goalPos, nodes, {
        nowMs: now,
        plannerStats: { planMs: 0, expansions }
      });
      if (!nextRoute) {
        buildFailed = true;
        return;
      }
      const schedule = buildScheduleFromPlan(nextRoute, moves, now, stepMs);
      nextRoute.schedule = schedule;
      nextRoute.scheduleProfile = {
        horizonMs: horizonMs || RESERVATION_DEFAULT_HORIZON_MS,
        stepMs,
        safetyMs:
          Number.isFinite(meta.profile?.safetyMs) ? meta.profile.safetyMs : RESERVATION_DEFAULT_SAFETY_MS,
        nodeDwellMs: meta.profile?.nodeDwellMs || RESERVATION_DEFAULT_NODE_DWELL_MS
      };
      nextRoute.scheduleUpdatedAt = now;
      nextRoute.scheduleLocked = true;
      routesByRobot.set(meta.id, nextRoute);
    });
    if (buildFailed) {
      return fallback();
    }

    group.forEach((robotId) => {
      const runtimeEntry = getRobotRuntime(robotId);
      if (!runtimeEntry) return;
      runtimeEntry.cbsConstraints = constraintsByRobot.get(robotId) || null;
      runtimeEntry.cbsCooldownUntil = now + settings.cooldownMs;
    });

    if (trafficStrategy?.useTimeReservations?.()) {
      group.forEach((robotId) => {
        releaseTimeReservations(robotId);
      });
    }

    group.forEach((robotId) => {
      if (robotId === robot?.id) return;
      const robotEntity = getRobotById(robotId);
      const runtimeEntry = getRobotRuntime(robotId);
      const nextRoute = routesByRobot.get(robotId);
      if (!robotEntity || !runtimeEntry || !nextRoute) return;
      const prevKey = getRuntimeEdgeGroupKey(runtimeEntry, robotEntity);
      applyRuntimeRoute(robotEntity, runtimeEntry, nextRoute, prevKey, { scheduleLocked: true });
    });

    const mainRoute = routesByRobot.get(robot.id);
    if (mainRoute) {
      return { route: mainRoute, constraints: baseConstraints };
    }
    return { route, constraints: baseConstraints };
  };

  const resolveGlobalMapfCspConflict = (
    robot,
    runtime,
    targetPos,
    targetNodeId,
    route,
    baseConstraints,
    settings,
    options = {}
  ) => {
    const fallback = () =>
      resolveGlobalMapfConflict(
        robot,
        runtime,
        targetPos,
        targetNodeId,
        route,
        baseConstraints,
        settings,
        options
      );
    if (!settings.enabled || !settings.global || settings.depth <= 0) {
      return fallback();
    }
    if (options.skipCbs) {
      return fallback();
    }
    const now = Date.now();
    if (runtime?.cbsCooldownUntil && now < runtime.cbsCooldownUntil) {
      return fallback();
    }

    const overrideGroup = Array.isArray(options.groupOverride)
      ? options.groupOverride.filter(Boolean)
      : null;
    const group =
      overrideGroup && overrideGroup.length >= 2
        ? Array.from(new Set(overrideGroup))
        : buildCbsGroup(robot, route, settings);
    if (robot?.id && !group.includes(robot.id)) {
      group.push(robot.id);
    }
    if (group.length < 2) {
      return fallback();
    }

    const robotsMeta = [];
    let stepMs = null;
    let horizonMs = null;
    let minSpeed = null;
    const constraintsByRobot = new Map();
    const goalsByRobot = new Map();
    for (const robotId of group) {
      const robotEntity = getRobotById(robotId);
      const runtimeEntry = getRobotRuntime(robotId);
      if (!robotEntity?.pos) {
        return fallback();
      }
      const profile = getReservationProfile(robotEntity) || {};
      const profileStepMs = Number.isFinite(profile.stepMs)
        ? profile.stepMs
        : RESERVATION_DEFAULT_STEP_MS;
      const profileHorizonMs = Number.isFinite(profile.horizonMs)
        ? profile.horizonMs
        : RESERVATION_DEFAULT_HORIZON_MS;
      stepMs = stepMs == null ? profileStepMs : Math.min(stepMs, profileStepMs);
      horizonMs = horizonMs == null ? profileHorizonMs : Math.max(horizonMs, profileHorizonMs);
      const speedMps =
        profile.speedMps || getRobotMotionProfile(robotEntity)?.speedMps || robotSpeedMps;
      minSpeed = minSpeed == null ? speedMps : Math.min(minSpeed, speedMps);
      const startNode = findNearestNavNode(robotEntity.pos);
      const startDist = startNode?.pos
        ? distanceBetweenPoints(robotEntity.pos, startNode.pos)
        : Infinity;
      if (!startNode || startDist > ROUTE_SNAP_DISTANCE * 1.6) {
        return fallback();
      }
      let goalNodeId = null;
      let goalPos = null;
      if (robotId === robot?.id) {
        goalPos = targetPos;
        goalNodeId = targetNodeId || null;
      } else if (runtimeEntry?.routeGoal?.pos) {
        goalPos = runtimeEntry.routeGoal.pos;
        goalNodeId = runtimeEntry.routeGoal.nodeId || null;
      }
      if (!goalNodeId) {
        const goalNode = goalPos ? findNearestNavNode(goalPos) : null;
        const goalDist = goalNode?.pos ? distanceBetweenPoints(goalPos, goalNode.pos) : Infinity;
        if (!goalNode || goalDist > ROUTE_SNAP_DISTANCE * 1.6) {
          return fallback();
        }
        goalNodeId = goalNode.id;
      }
      goalsByRobot.set(robotId, goalNodeId);
      const base = robotId === robot?.id ? baseConstraints : runtimeEntry?.cbsConstraints || null;
      constraintsByRobot.set(robotId, pruneConstraints(createConstraintTable(base), now));
      robotsMeta.push({
        id: robotId,
        robot: robotEntity,
        runtime: runtimeEntry,
        startNodeId: startNode.id,
        goalNodeId,
        profile,
        speedMps
      });
    }

    const maxSteps = Math.max(1, Math.ceil((horizonMs || RESERVATION_DEFAULT_HORIZON_MS) / stepMs));
    const reservations = buildReservationTable(now, null, { excludeRobotIds: group });
    const stepMeters = Math.max(0.05, (minSpeed || robotSpeedMps) * (stepMs / 1000));

    const buildExpandedMapfGraph = (stepMetersValue) => {
      const nodesById = new Map();
      const adjacency = new Map();
      const reverseAdj = new Map();
      const addNode = (node) => {
        nodesById.set(node.id, node);
        if (!adjacency.has(node.id)) adjacency.set(node.id, []);
        if (!reverseAdj.has(node.id)) reverseAdj.set(node.id, []);
      };
      const addEdge = (fromId, toId, meta) => {
        const list = adjacency.get(fromId) || [];
        list.push({ ...meta, to: toId });
        adjacency.set(fromId, list);
        const reverse = reverseAdj.get(toId) || [];
        reverse.push(fromId);
        reverseAdj.set(toId, reverse);
      };
      navGraph.nodesById.forEach((node, nodeId) => {
        addNode({ id: nodeId, nodeId, original: true, pos: node.pos });
      });
      navGraph.edgesByKey.forEach((edge, edgeKey) => {
        if (!edge?.startId || !edge?.endId) return;
        const totalLength = edge.totalLength || edge.polyline?.totalLength || 0;
        const steps = Math.max(1, Math.ceil(totalLength / stepMetersValue));
        const edgeGroupKey =
          edge.edgeGroupKey ||
          edge.edgeBaseGroupKey ||
          makeEdgeGroupKey(edge.startId, edge.endId);
        const edgeBaseGroupKey =
          edge.edgeBaseGroupKey ||
          edge.edgeGroupKey ||
          makeEdgeGroupKey(edge.startId, edge.endId);
        if (steps <= 1) {
          addEdge(edge.startId, edge.endId, {
            edgeKey: edge.edgeKey || edgeKey,
            edgeGroupKey,
            edgeBaseGroupKey,
            edgeRef: edge,
            fromNodeId: edge.startId,
            toNodeId: edge.endId
          });
          return;
        }
        let prevId = edge.startId;
        for (let i = 1; i < steps; i += 1) {
          const virtualId = `__exp_${edge.edgeKey || edgeKey}_${i}`;
          if (!nodesById.has(virtualId)) {
            const dist = (totalLength * i) / steps;
            const pose = edge.polyline ? polylineAtDistance(edge.polyline, dist) : null;
            addNode({
              id: virtualId,
              nodeId: null,
              original: false,
              pos: pose ? { x: pose.x, y: pose.y } : null,
              edgeKey: edge.edgeKey || edgeKey,
              edgeGroupKey,
              edgeBaseGroupKey,
              fromNodeId: edge.startId,
              toNodeId: edge.endId
            });
          }
          addEdge(prevId, virtualId, {
            edgeKey: edge.edgeKey || edgeKey,
            edgeGroupKey,
            edgeBaseGroupKey,
            edgeRef: edge,
            fromNodeId: edge.startId,
            toNodeId: edge.endId
          });
          prevId = virtualId;
        }
        addEdge(prevId, edge.endId, {
          edgeKey: edge.edgeKey || edgeKey,
          edgeGroupKey,
          edgeBaseGroupKey,
          edgeRef: edge,
          fromNodeId: edge.startId,
          toNodeId: edge.endId
        });
      });
      return { nodesById, adjacency, reverseAdj };
    };

    const expanded = buildExpandedMapfGraph(stepMeters);
    const expandedNodes = expanded.nodesById;
    const expandedAdj = expanded.adjacency;
    const expandedRev = expanded.reverseAdj;

    const computeDistances = (goalNodeId) => {
      const dist = new Map();
      const queue = [];
      dist.set(goalNodeId, 0);
      queue.push(goalNodeId);
      while (queue.length) {
        const nodeId = queue.shift();
        const base = dist.get(nodeId) || 0;
        const incoming = expandedRev.get(nodeId) || [];
        for (const prev of incoming) {
          if (dist.has(prev)) continue;
          dist.set(prev, base + 1);
          queue.push(prev);
        }
      }
      return dist;
    };

    const buildLevels = (startNodeId, goalNodeId) => {
      const distToGoal = computeDistances(goalNodeId);
      const levels = Array.from({ length: maxSteps + 1 }, () => new Set());
      levels[0].add(startNodeId);
      for (let t = 0; t < maxSteps; t += 1) {
        const next = new Set();
        levels[t].forEach((nodeId) => {
          const node = expandedNodes.get(nodeId);
          if (node?.original) {
            next.add(nodeId);
          }
          const neighbors = expandedAdj.get(nodeId) || [];
          neighbors.forEach((edge) => {
            next.add(edge.to);
          });
        });
        const filtered = new Set();
        next.forEach((nodeId) => {
          const dist = distToGoal.get(nodeId);
          if (!Number.isFinite(dist)) return;
          if (dist > maxSteps - (t + 1)) return;
          filtered.add(nodeId);
        });
        levels[t + 1] = filtered;
      }
      return levels;
    };

    const levelsByRobot = robotsMeta.map((meta) =>
      buildLevels(meta.startNodeId, meta.goalNodeId)
    );

    const hasOverlap = (list, start, end) => findReservationOverlap(list, start, end);
    const isEdgeAvailable = (robotId, edgeKey, startMs, endMs) => {
      if (!edgeKey) return true;
      const constraints = constraintsByRobot.get(robotId);
      const edgeConstraints = constraints?.edges?.get(edgeKey) || null;
      if (edgeConstraints && hasOverlap(edgeConstraints, startMs, endMs)) {
        return false;
      }
      const edgeReservations = reservations.edges.get(edgeKey) || null;
      if (edgeReservations && hasOverlap(edgeReservations, startMs, endMs)) {
        return false;
      }
      return true;
    };
    const isNodeAvailable = (robotId, nodeId, startMs, endMs) => {
      if (!nodeId) return true;
      const constraints = constraintsByRobot.get(robotId);
      const nodeConstraints = constraints?.nodes?.get(nodeId) || null;
      if (nodeConstraints && hasOverlap(nodeConstraints, startMs, endMs)) {
        return false;
      }
      const nodeReservations = reservations.nodes.get(nodeId) || null;
      if (nodeReservations && hasOverlap(nodeReservations, startMs, endMs)) {
        return false;
      }
      return true;
    };

    const metaById = new Map();
    robotsMeta.forEach((meta) => {
      const dwellMs = Number.isFinite(meta.profile?.nodeDwellMs)
        ? meta.profile.nodeDwellMs
        : RESERVATION_DEFAULT_NODE_DWELL_MS;
      metaById.set(meta.id, {
        ...meta,
        dwellSteps: Math.max(1, Math.ceil(dwellMs / stepMs)),
        dwellMs
      });
    });

    const isGoalState = (states) =>
      states.every((state, index) => {
        const meta = robotsMeta[index];
        return state.nodeId === meta.goalNodeId && state.holdSteps === 0;
      });

    const findEdgeStep = (fromId, toId) => {
      const list = expandedAdj.get(fromId) || [];
      return list.find((edge) => edge.to === toId) || null;
    };

    const buildActionsForRobot = (state, meta, timeMs, allowedNext) => {
      const info = metaById.get(meta.id);
      if (!info) return [];
      const currentNode = expandedNodes.get(state.nodeId);
      if (!currentNode) return [];
      const allowStay = currentNode.original;
      const actions = [];
      const noTurnaround = trafficStrategy?.allowTurnaround?.() === false;

      const pushStay = () => {
        if (!allowStay) return;
        if (allowedNext && !allowedNext.has(state.nodeId)) return;
        const nodeOk = isNodeAvailable(
          meta.id,
          currentNode.nodeId || state.nodeId,
          timeMs,
          timeMs + stepMs
        );
        if (!nodeOk) return;
        actions.push({
          nextState: {
            nodeId: state.nodeId,
            holdSteps: Math.max(0, (state.holdSteps || 0) - 1),
            prevNodeId: state.prevNodeId || null
          },
          edgeGroupKey: null,
          nodeIdNext: state.nodeId
        });
      };

      if (state.holdSteps > 0) {
        pushStay();
        return actions;
      }

      pushStay();

      const neighbors = expandedAdj.get(state.nodeId) || [];
      for (const edge of neighbors) {
        if (allowedNext && !allowedNext.has(edge.to)) continue;
        const edgeRef = edge.edgeRef;
        if (edgeRef && isEdgeBlocked(edgeRef, { robotId: meta.id, robotWidth: getRobotWidth(meta.robot) })) {
          continue;
        }
        const edgeGroupKey = edge.edgeGroupKey || null;
        if (!isEdgeAvailable(meta.id, edgeGroupKey, timeMs, timeMs + stepMs)) {
          continue;
        }
        const nextNode = expandedNodes.get(edge.to);
        if (!nextNode) continue;
        if (noTurnaround && currentNode.original && state.prevNodeId && nextNode.original) {
          if (nextNode.nodeId === state.prevNodeId) continue;
        }
        if (nextNode.original) {
          const nodeOk = isNodeAvailable(
            meta.id,
            nextNode.nodeId,
            timeMs + stepMs,
            timeMs + stepMs + info.dwellMs
          );
          if (!nodeOk) continue;
        }
        const holdSteps = nextNode.original ? Math.max(0, info.dwellSteps - 1) : 0;
        actions.push({
          nextState: {
            nodeId: edge.to,
            holdSteps,
            prevNodeId: currentNode.original ? currentNode.nodeId : state.prevNodeId || null
          },
          edgeGroupKey,
          nodeIdNext: edge.to
        });
      }
      return actions;
    };

    const initialStates = robotsMeta.map((meta) => ({
      nodeId: meta.startNodeId,
      holdSteps: 0,
      prevNodeId: null
    }));
    const timeline = [initialStates.map((state) => ({ ...state }))];
    let expansions = 0;
    let solution = null;

    const searchStep = (timeStep, states) => {
      if (isGoalState(states)) {
        solution = timeline.map((snapshot) => snapshot.map((state) => ({ ...state })));
        return true;
      }
      if (timeStep >= maxSteps) return false;
      if (expansions >= settings.maxNodes) return false;
      expansions += 1;

      const timeMs = now + timeStep * stepMs;
      const actionEntries = states.map((state, index) => ({
        index,
        actions: buildActionsForRobot(state, robotsMeta[index], timeMs, levelsByRobot[index][timeStep + 1])
      }));
      for (const entry of actionEntries) {
        if (!entry.actions.length) return false;
      }
      actionEntries.sort((a, b) => a.actions.length - b.actions.length);

      const nextStates = new Array(states.length);
      const nodeSet = new Set();
      const edgeSet = new Set();

      const assign = (offset) => {
        if (offset >= actionEntries.length) {
          const snapshot = nextStates.map((state) => ({ ...state }));
          timeline.push(snapshot);
          if (searchStep(timeStep + 1, snapshot)) return true;
          timeline.pop();
          return false;
        }
        const entry = actionEntries[offset];
        const idx = entry.index;
        for (const action of entry.actions) {
          if (action.edgeGroupKey && edgeSet.has(action.edgeGroupKey)) continue;
          if (nodeSet.has(action.nodeIdNext)) continue;
          if (action.edgeGroupKey) edgeSet.add(action.edgeGroupKey);
          nodeSet.add(action.nodeIdNext);
          nextStates[idx] = action.nextState;
          if (assign(offset + 1)) return true;
          if (action.edgeGroupKey) edgeSet.delete(action.edgeGroupKey);
          nodeSet.delete(action.nodeIdNext);
        }
        return false;
      };

      return assign(0);
    };

    if (!searchStep(0, initialStates)) {
      return fallback();
    }

    const routesByRobot = new Map();
    let buildFailed = false;
    robotsMeta.forEach((meta, index) => {
      const nodes = [];
      const moves = [];
      let activeMove = null;
      const history = solution || [];
      for (let t = 0; t < history.length; t += 1) {
        const state = history[t][index];
        const nodeMeta = expandedNodes.get(state.nodeId);
        if (nodeMeta?.original) {
          if (!nodes.length || nodes[nodes.length - 1] !== nodeMeta.nodeId) {
            nodes.push(nodeMeta.nodeId);
          }
        }
        if (t >= history.length - 1) continue;
        const nextState = history[t + 1][index];
        const edgeStep = findEdgeStep(state.nodeId, nextState.nodeId);
        if (!edgeStep) continue;
        const nextMeta = expandedNodes.get(nextState.nodeId);
        if (nodeMeta?.original && nextMeta?.original) {
          moves.push({
            fromNodeId: nodeMeta.nodeId,
            toNodeId: nextMeta.nodeId,
            edgeKey: edgeStep.edgeKey,
            edgeGroupKey: edgeStep.edgeGroupKey,
            edgeBaseGroupKey: edgeStep.edgeBaseGroupKey,
            startStep: t,
            arrivalStep: t + 1
          });
          continue;
        }
        if (nodeMeta?.original && !nextMeta?.original) {
          activeMove = {
            fromNodeId: nodeMeta.nodeId,
            toNodeId: edgeStep.toNodeId,
            edgeKey: edgeStep.edgeKey,
            edgeGroupKey: edgeStep.edgeGroupKey,
            edgeBaseGroupKey: edgeStep.edgeBaseGroupKey,
            startStep: t
          };
          continue;
        }
        if (nodeMeta && !nodeMeta.original && nextMeta?.original && activeMove) {
          moves.push({
            ...activeMove,
            arrivalStep: t + 1
          });
          activeMove = null;
        }
      }
      if (!nodes.length) {
        buildFailed = true;
        return;
      }
      const goalPos =
        meta.id === robot?.id ? targetPos : meta.runtime?.routeGoal?.pos || meta.robot.pos;
      const nextRoute = buildRouteFromNodePath(meta.robot.pos, goalPos, nodes, {
        nowMs: now,
        plannerStats: { planMs: 0, expansions }
      });
      if (!nextRoute) {
        buildFailed = true;
        return;
      }
      const schedule = buildScheduleFromPlan(nextRoute, moves, now, stepMs);
      nextRoute.schedule = schedule;
      nextRoute.scheduleProfile = {
        horizonMs: horizonMs || RESERVATION_DEFAULT_HORIZON_MS,
        stepMs,
        safetyMs:
          Number.isFinite(meta.profile?.safetyMs) ? meta.profile.safetyMs : RESERVATION_DEFAULT_SAFETY_MS,
        nodeDwellMs: meta.profile?.nodeDwellMs || RESERVATION_DEFAULT_NODE_DWELL_MS
      };
      nextRoute.scheduleUpdatedAt = now;
      nextRoute.scheduleLocked = true;
      routesByRobot.set(meta.id, nextRoute);
    });
    if (buildFailed) {
      return fallback();
    }

    group.forEach((robotId) => {
      const runtimeEntry = getRobotRuntime(robotId);
      if (!runtimeEntry) return;
      runtimeEntry.cbsConstraints = constraintsByRobot.get(robotId) || null;
      runtimeEntry.cbsCooldownUntil = now + settings.cooldownMs;
    });

    if (trafficStrategy?.useTimeReservations?.()) {
      group.forEach((robotId) => {
        releaseTimeReservations(robotId);
      });
    }

    group.forEach((robotId) => {
      if (robotId === robot?.id) return;
      const robotEntity = getRobotById(robotId);
      const runtimeEntry = getRobotRuntime(robotId);
      const nextRoute = routesByRobot.get(robotId);
      if (!robotEntity || !runtimeEntry || !nextRoute) return;
      const prevKey = getRuntimeEdgeGroupKey(runtimeEntry, robotEntity);
      applyRuntimeRoute(robotEntity, runtimeEntry, nextRoute, prevKey, { scheduleLocked: true });
    });

    const mainRoute = routesByRobot.get(robot.id);
    if (mainRoute) {
      return { route: mainRoute, constraints: baseConstraints };
    }
    return fallback();
  };

  const resolveGlobalMapfPibtConflict = (
    robot,
    runtime,
    targetPos,
    targetNodeId,
    route,
    baseConstraints,
    settings,
    options = {}
  ) => {
    const fallback = () =>
      resolveGlobalMapfConflict(
        robot,
        runtime,
        targetPos,
        targetNodeId,
        route,
        baseConstraints,
        settings,
        options
      );
    if (!settings.enabled || !settings.global || settings.depth <= 0) {
      return fallback();
    }
    if (options.skipCbs) {
      return fallback();
    }
    const now = Date.now();
    if (runtime?.cbsCooldownUntil && now < runtime.cbsCooldownUntil) {
      return fallback();
    }

    const overrideGroup = Array.isArray(options.groupOverride)
      ? options.groupOverride.filter(Boolean)
      : null;
    const group =
      overrideGroup && overrideGroup.length >= 2
        ? Array.from(new Set(overrideGroup))
        : buildCbsGroup(robot, route, settings);
    if (robot?.id && !group.includes(robot.id)) {
      group.push(robot.id);
    }
    if (group.length < 2) {
      return fallback();
    }

    const robotsMeta = [];
    let stepMs = null;
    let horizonMs = null;
    let minSpeed = null;
    const constraintsByRobot = new Map();
    const goalsByRobot = new Map();
    for (const robotId of group) {
      const robotEntity = getRobotById(robotId);
      const runtimeEntry = getRobotRuntime(robotId);
      if (!robotEntity?.pos) {
        return fallback();
      }
      const profile = getReservationProfile(robotEntity) || {};
      const profileStepMs = Number.isFinite(profile.stepMs)
        ? profile.stepMs
        : RESERVATION_DEFAULT_STEP_MS;
      const profileHorizonMs = Number.isFinite(profile.horizonMs)
        ? profile.horizonMs
        : RESERVATION_DEFAULT_HORIZON_MS;
      stepMs = stepMs == null ? profileStepMs : Math.min(stepMs, profileStepMs);
      horizonMs = horizonMs == null ? profileHorizonMs : Math.max(horizonMs, profileHorizonMs);
      const speedMps =
        profile.speedMps || getRobotMotionProfile(robotEntity)?.speedMps || robotSpeedMps;
      minSpeed = minSpeed == null ? speedMps : Math.min(minSpeed, speedMps);
      const startNode = findNearestNavNode(robotEntity.pos);
      const startDist = startNode?.pos
        ? distanceBetweenPoints(robotEntity.pos, startNode.pos)
        : Infinity;
      if (!startNode || startDist > ROUTE_SNAP_DISTANCE * 1.6) {
        return fallback();
      }
      let goalNodeId = null;
      let goalPos = null;
      if (robotId === robot?.id) {
        goalPos = targetPos;
        goalNodeId = targetNodeId || null;
      } else if (runtimeEntry?.routeGoal?.pos) {
        goalPos = runtimeEntry.routeGoal.pos;
        goalNodeId = runtimeEntry.routeGoal.nodeId || null;
      }
      if (!goalNodeId) {
        const goalNode = goalPos ? findNearestNavNode(goalPos) : null;
        const goalDist = goalNode?.pos ? distanceBetweenPoints(goalPos, goalNode.pos) : Infinity;
        if (!goalNode || goalDist > ROUTE_SNAP_DISTANCE * 1.6) {
          return fallback();
        }
        goalNodeId = goalNode.id;
      }
      goalsByRobot.set(robotId, goalNodeId);
      const base = robotId === robot?.id ? baseConstraints : runtimeEntry?.cbsConstraints || null;
      constraintsByRobot.set(robotId, pruneConstraints(createConstraintTable(base), now));
      robotsMeta.push({
        id: robotId,
        robot: robotEntity,
        runtime: runtimeEntry,
        startNodeId: startNode.id,
        goalNodeId,
        profile,
        speedMps
      });
    }

    const maxSteps = Math.max(1, Math.ceil((horizonMs || RESERVATION_DEFAULT_HORIZON_MS) / stepMs));
    const reservations = buildReservationTable(now, null, { excludeRobotIds: group });
    const stepMeters = Math.max(0.05, (minSpeed || robotSpeedMps) * (stepMs / 1000));

    const buildExpandedMapfGraph = (stepMetersValue) => {
      const nodesById = new Map();
      const adjacency = new Map();
      const reverseAdj = new Map();
      const addNode = (node) => {
        nodesById.set(node.id, node);
        if (!adjacency.has(node.id)) adjacency.set(node.id, []);
        if (!reverseAdj.has(node.id)) reverseAdj.set(node.id, []);
      };
      const addEdge = (fromId, toId, meta) => {
        const list = adjacency.get(fromId) || [];
        list.push({ ...meta, to: toId });
        adjacency.set(fromId, list);
        const reverse = reverseAdj.get(toId) || [];
        reverse.push(fromId);
        reverseAdj.set(toId, reverse);
      };
      navGraph.nodesById.forEach((node, nodeId) => {
        addNode({ id: nodeId, nodeId, original: true, pos: node.pos });
      });
      navGraph.edgesByKey.forEach((edge, edgeKey) => {
        if (!edge?.startId || !edge?.endId) return;
        const totalLength = edge.totalLength || edge.polyline?.totalLength || 0;
        const steps = Math.max(1, Math.ceil(totalLength / stepMetersValue));
        const edgeGroupKey =
          edge.edgeGroupKey ||
          edge.edgeBaseGroupKey ||
          makeEdgeGroupKey(edge.startId, edge.endId);
        const edgeBaseGroupKey =
          edge.edgeBaseGroupKey ||
          edge.edgeGroupKey ||
          makeEdgeGroupKey(edge.startId, edge.endId);
        if (steps <= 1) {
          addEdge(edge.startId, edge.endId, {
            edgeKey: edge.edgeKey || edgeKey,
            edgeGroupKey,
            edgeBaseGroupKey,
            edgeRef: edge,
            fromNodeId: edge.startId,
            toNodeId: edge.endId
          });
          return;
        }
        let prevId = edge.startId;
        for (let i = 1; i < steps; i += 1) {
          const virtualId = `__exp_${edge.edgeKey || edgeKey}_${i}`;
          if (!nodesById.has(virtualId)) {
            const dist = (totalLength * i) / steps;
            const pose = edge.polyline ? polylineAtDistance(edge.polyline, dist) : null;
            addNode({
              id: virtualId,
              nodeId: null,
              original: false,
              pos: pose ? { x: pose.x, y: pose.y } : null,
              edgeKey: edge.edgeKey || edgeKey,
              edgeGroupKey,
              edgeBaseGroupKey,
              fromNodeId: edge.startId,
              toNodeId: edge.endId
            });
          }
          addEdge(prevId, virtualId, {
            edgeKey: edge.edgeKey || edgeKey,
            edgeGroupKey,
            edgeBaseGroupKey,
            edgeRef: edge,
            fromNodeId: edge.startId,
            toNodeId: edge.endId
          });
          prevId = virtualId;
        }
        addEdge(prevId, edge.endId, {
          edgeKey: edge.edgeKey || edgeKey,
          edgeGroupKey,
          edgeBaseGroupKey,
          edgeRef: edge,
          fromNodeId: edge.startId,
          toNodeId: edge.endId
        });
      });
      return { nodesById, adjacency, reverseAdj };
    };

    const expanded = buildExpandedMapfGraph(stepMeters);
    const expandedNodes = expanded.nodesById;
    const expandedAdj = expanded.adjacency;
    const expandedRev = expanded.reverseAdj;

    const computeDistances = (goalNodeId) => {
      const dist = new Map();
      const queue = [];
      dist.set(goalNodeId, 0);
      queue.push(goalNodeId);
      while (queue.length) {
        const nodeId = queue.shift();
        const base = dist.get(nodeId) || 0;
        const incoming = expandedRev.get(nodeId) || [];
        for (const prev of incoming) {
          if (dist.has(prev)) continue;
          dist.set(prev, base + 1);
          queue.push(prev);
        }
      }
      return dist;
    };

    const distByRobot = robotsMeta.map((meta) => computeDistances(meta.goalNodeId));

    const hasOverlap = (list, start, end) => findReservationOverlap(list, start, end);
    const isEdgeAvailable = (robotId, edgeKey, startMs, endMs) => {
      if (!edgeKey) return true;
      const constraints = constraintsByRobot.get(robotId);
      const edgeConstraints = constraints?.edges?.get(edgeKey) || null;
      if (edgeConstraints && hasOverlap(edgeConstraints, startMs, endMs)) {
        return false;
      }
      const edgeReservations = reservations.edges.get(edgeKey) || null;
      if (edgeReservations && hasOverlap(edgeReservations, startMs, endMs)) {
        return false;
      }
      return true;
    };
    const isNodeAvailable = (robotId, nodeId, startMs, endMs) => {
      if (!nodeId) return true;
      const constraints = constraintsByRobot.get(robotId);
      const nodeConstraints = constraints?.nodes?.get(nodeId) || null;
      if (nodeConstraints && hasOverlap(nodeConstraints, startMs, endMs)) {
        return false;
      }
      const nodeReservations = reservations.nodes.get(nodeId) || null;
      if (nodeReservations && hasOverlap(nodeReservations, startMs, endMs)) {
        return false;
      }
      return true;
    };

    const metaById = new Map();
    robotsMeta.forEach((meta) => {
      const dwellMs = Number.isFinite(meta.profile?.nodeDwellMs)
        ? meta.profile.nodeDwellMs
        : RESERVATION_DEFAULT_NODE_DWELL_MS;
      metaById.set(meta.id, {
        ...meta,
        dwellSteps: Math.max(1, Math.ceil(dwellMs / stepMs)),
        dwellMs
      });
    });

    const isGoalState = (states) =>
      states.every((state, index) => {
        const meta = robotsMeta[index];
        return state.nodeId === meta.goalNodeId && state.holdSteps === 0;
      });

    const findEdgeStep = (fromId, toId) => {
      const list = expandedAdj.get(fromId) || [];
      return list.find((edge) => edge.to === toId) || null;
    };

    const buildActionsForRobot = (state, meta, timeMs, remainingSteps, distMap) => {
      const info = metaById.get(meta.id);
      if (!info) return [];
      const currentNode = expandedNodes.get(state.nodeId);
      if (!currentNode) return [];
      const allowStay = currentNode.original;
      const actions = [];
      const noTurnaround = trafficStrategy?.allowTurnaround?.() === false;
      const canReach = (nodeId) => {
        if (!distMap) return true;
        const dist = distMap.get(nodeId);
        if (!Number.isFinite(dist)) return false;
        return dist <= remainingSteps;
      };

      const pushStay = () => {
        if (!allowStay) return;
        if (!canReach(state.nodeId)) return;
        const nodeOk = isNodeAvailable(
          meta.id,
          currentNode.nodeId || state.nodeId,
          timeMs,
          timeMs + stepMs
        );
        if (!nodeOk) return;
        actions.push({
          nextState: {
            nodeId: state.nodeId,
            holdSteps: Math.max(0, (state.holdSteps || 0) - 1),
            prevNodeId: state.prevNodeId || null
          },
          edgeGroupKey: null,
          nodeIdNext: state.nodeId
        });
      };

      if (state.holdSteps > 0) {
        pushStay();
        return actions;
      }

      pushStay();

      const neighbors = expandedAdj.get(state.nodeId) || [];
      for (const edge of neighbors) {
        if (!canReach(edge.to)) continue;
        const edgeRef = edge.edgeRef;
        if (edgeRef && isEdgeBlocked(edgeRef, { robotId: meta.id, robotWidth: getRobotWidth(meta.robot) })) {
          continue;
        }
        const edgeGroupKey = edge.edgeGroupKey || null;
        if (!isEdgeAvailable(meta.id, edgeGroupKey, timeMs, timeMs + stepMs)) {
          continue;
        }
        const nextNode = expandedNodes.get(edge.to);
        if (!nextNode) continue;
        if (noTurnaround && currentNode.original && state.prevNodeId && nextNode.original) {
          if (nextNode.nodeId === state.prevNodeId) continue;
        }
        if (nextNode.original) {
          const nodeOk = isNodeAvailable(
            meta.id,
            nextNode.nodeId,
            timeMs + stepMs,
            timeMs + stepMs + info.dwellMs
          );
          if (!nodeOk) continue;
        }
        const holdSteps = nextNode.original ? Math.max(0, info.dwellSteps - 1) : 0;
        actions.push({
          nextState: {
            nodeId: edge.to,
            holdSteps,
            prevNodeId: currentNode.original ? currentNode.nodeId : state.prevNodeId || null
          },
          edgeGroupKey,
          nodeIdNext: edge.to
        });
      }
      return actions;
    };

    const initialStates = robotsMeta.map((meta) => ({
      nodeId: meta.startNodeId,
      holdSteps: 0,
      prevNodeId: null
    }));
    let currentStates = initialStates.map((state) => ({ ...state }));
    const timeline = [currentStates.map((state) => ({ ...state }))];
    let expansions = 0;
    let solved = false;

    for (let t = 0; t < maxSteps; t += 1) {
      if (isGoalState(currentStates)) {
        solved = true;
        break;
      }
      const timeMs = now + t * stepMs;
      const remainingSteps = maxSteps - (t + 1);
      const actionsByRobot = currentStates.map((state, index) =>
        buildActionsForRobot(state, robotsMeta[index], timeMs, remainingSteps, distByRobot[index])
      );
      if (actionsByRobot.some((actions) => !actions.length)) {
        return fallback();
      }

      const occupied = new Map();
      currentStates.forEach((state, idx) => {
        occupied.set(state.nodeId, idx);
      });

      const order = robotsMeta
        .map((meta, idx) => {
          const distMap = distByRobot[idx];
          const dist = distMap ? distMap.get(currentStates[idx].nodeId) : Infinity;
          return {
            idx,
            priority: getRobotPriority(meta.robot),
            dist: Number.isFinite(dist) ? dist : Infinity,
            id: meta.id
          };
        })
        .sort((a, b) => {
          if (a.priority !== b.priority) return b.priority - a.priority;
          if (a.dist !== b.dist) return a.dist - b.dist;
          return String(a.id).localeCompare(String(b.id));
        })
        .map((entry) => entry.idx);

      const assigned = new Array(robotsMeta.length).fill(null);
      const reservedNodes = new Set();
      const reservedEdges = new Set();
      const visiting = new Set();

      const scoreAction = (idx, action) => {
        const distMap = distByRobot[idx];
        const dist = distMap ? distMap.get(action.nextState.nodeId) : Infinity;
        const base = Number.isFinite(dist) ? dist : Number.POSITIVE_INFINITY;
        const stayPenalty = action.edgeGroupKey ? 0 : 0.4;
        return base + stayPenalty;
      };

      const assign = (idx) => {
        if (assigned[idx]) return true;
        if (visiting.has(idx)) return false;
        visiting.add(idx);
        const candidates = actionsByRobot[idx]
          .slice()
          .sort((a, b) => scoreAction(idx, a) - scoreAction(idx, b));
        for (const action of candidates) {
          if (action.edgeGroupKey && reservedEdges.has(action.edgeGroupKey)) continue;
          if (reservedNodes.has(action.nodeIdNext)) continue;
          const occupant = occupied.get(action.nodeIdNext);
          if (occupant !== undefined && occupant !== idx) {
            if (!assign(occupant)) continue;
            if (reservedNodes.has(action.nodeIdNext)) continue;
          }
          if (action.edgeGroupKey) reservedEdges.add(action.edgeGroupKey);
          reservedNodes.add(action.nodeIdNext);
          assigned[idx] = action;
          visiting.delete(idx);
          return true;
        }
        visiting.delete(idx);
        return false;
      };

      let ok = true;
      for (const idx of order) {
        if (!assign(idx)) {
          ok = false;
          break;
        }
      }
      if (!ok) {
        return fallback();
      }
      const nextStates = assigned.map((action, idx) => action?.nextState || currentStates[idx]);
      timeline.push(nextStates.map((state) => ({ ...state })));
      currentStates = nextStates;
      expansions += 1;
      if (isGoalState(currentStates)) {
        solved = true;
        break;
      }
    }

    if (!solved) {
      return fallback();
    }

    const routesByRobot = new Map();
    let buildFailed = false;
    robotsMeta.forEach((meta, index) => {
      const nodes = [];
      const moves = [];
      let activeMove = null;
      const history = timeline;
      for (let t = 0; t < history.length; t += 1) {
        const state = history[t][index];
        const nodeMeta = expandedNodes.get(state.nodeId);
        if (nodeMeta?.original) {
          if (!nodes.length || nodes[nodes.length - 1] !== nodeMeta.nodeId) {
            nodes.push(nodeMeta.nodeId);
          }
        }
        if (t >= history.length - 1) continue;
        const nextState = history[t + 1][index];
        const edgeStep = findEdgeStep(state.nodeId, nextState.nodeId);
        if (!edgeStep) continue;
        const nextMeta = expandedNodes.get(nextState.nodeId);
        if (nodeMeta?.original && nextMeta?.original) {
          moves.push({
            fromNodeId: nodeMeta.nodeId,
            toNodeId: nextMeta.nodeId,
            edgeKey: edgeStep.edgeKey,
            edgeGroupKey: edgeStep.edgeGroupKey,
            edgeBaseGroupKey: edgeStep.edgeBaseGroupKey,
            startStep: t,
            arrivalStep: t + 1
          });
          continue;
        }
        if (nodeMeta?.original && !nextMeta?.original) {
          activeMove = {
            fromNodeId: nodeMeta.nodeId,
            toNodeId: edgeStep.toNodeId,
            edgeKey: edgeStep.edgeKey,
            edgeGroupKey: edgeStep.edgeGroupKey,
            edgeBaseGroupKey: edgeStep.edgeBaseGroupKey,
            startStep: t
          };
          continue;
        }
        if (nodeMeta && !nodeMeta.original && nextMeta?.original && activeMove) {
          moves.push({
            ...activeMove,
            arrivalStep: t + 1
          });
          activeMove = null;
        }
      }
      if (!nodes.length) {
        buildFailed = true;
        return;
      }
      const goalPos =
        meta.id === robot?.id ? targetPos : meta.runtime?.routeGoal?.pos || meta.robot.pos;
      const nextRoute = buildRouteFromNodePath(meta.robot.pos, goalPos, nodes, {
        nowMs: now,
        plannerStats: { planMs: 0, expansions }
      });
      if (!nextRoute) {
        buildFailed = true;
        return;
      }
      const schedule = buildScheduleFromPlan(nextRoute, moves, now, stepMs);
      nextRoute.schedule = schedule;
      nextRoute.scheduleProfile = {
        horizonMs: horizonMs || RESERVATION_DEFAULT_HORIZON_MS,
        stepMs,
        safetyMs:
          Number.isFinite(meta.profile?.safetyMs) ? meta.profile.safetyMs : RESERVATION_DEFAULT_SAFETY_MS,
        nodeDwellMs: meta.profile?.nodeDwellMs || RESERVATION_DEFAULT_NODE_DWELL_MS
      };
      nextRoute.scheduleUpdatedAt = now;
      nextRoute.scheduleLocked = true;
      routesByRobot.set(meta.id, nextRoute);
    });
    if (buildFailed) {
      return fallback();
    }

    group.forEach((robotId) => {
      const runtimeEntry = getRobotRuntime(robotId);
      if (!runtimeEntry) return;
      runtimeEntry.cbsConstraints = constraintsByRobot.get(robotId) || null;
      runtimeEntry.cbsCooldownUntil = now + settings.cooldownMs;
    });

    if (trafficStrategy?.useTimeReservations?.()) {
      group.forEach((robotId) => {
        releaseTimeReservations(robotId);
      });
    }

    group.forEach((robotId) => {
      if (robotId === robot?.id) return;
      const robotEntity = getRobotById(robotId);
      const runtimeEntry = getRobotRuntime(robotId);
      const nextRoute = routesByRobot.get(robotId);
      if (!robotEntity || !runtimeEntry || !nextRoute) return;
      const prevKey = getRuntimeEdgeGroupKey(runtimeEntry);
      applyRuntimeRoute(robotEntity, runtimeEntry, nextRoute, prevKey, { scheduleLocked: true });
    });

    const mainRoute = routesByRobot.get(robot.id);
    if (mainRoute) {
      return { route: mainRoute, constraints: baseConstraints };
    }
    return fallback();
  };

  const resolveMStarConflict = (
    robot,
    runtime,
    targetPos,
    targetNodeId,
    route,
    baseConstraints,
    settings,
    options = {}
  ) => {
    const fallback = () =>
      resolveGlobalMapfConflict(
        robot,
        runtime,
        targetPos,
        targetNodeId,
        route,
        baseConstraints,
        settings,
        options
      );
    if (!settings.enabled || !settings.global || settings.depth <= 0) {
      return fallback();
    }
    if (options.skipCbs) {
      return fallback();
    }
    const now = Date.now();
    if (runtime?.cbsCooldownUntil && now < runtime.cbsCooldownUntil) {
      return fallback();
    }

    const overrideGroup = Array.isArray(options.groupOverride)
      ? options.groupOverride.filter(Boolean)
      : null;
    const group =
      overrideGroup && overrideGroup.length >= 2
        ? Array.from(new Set(overrideGroup))
        : buildCbsGroup(robot, route, settings);
    if (robot?.id && !group.includes(robot.id)) {
      group.push(robot.id);
    }
    if (group.length < 2) {
      return fallback();
    }

    const routesByRobot = new Map();
    for (const robotId of group) {
      const robotEntity = getRobotById(robotId);
      const runtimeEntry = getRobotRuntime(robotId);
      if (!robotEntity?.pos) {
        return fallback();
      }
      if (robotId === robot?.id) {
        routesByRobot.set(robotId, route);
        continue;
      }
      if (runtimeEntry?.route) {
        routesByRobot.set(robotId, runtimeEntry.route);
        continue;
      }
      const goalPos = runtimeEntry?.routeGoal?.pos || null;
      const goalNodeId = runtimeEntry?.routeGoal?.nodeId || null;
      if (!goalPos) {
        return fallback();
      }
      const nextRoute = buildRoute(robotEntity.pos, goalPos, goalNodeId, {
        robotId,
        constraints: runtimeEntry?.cbsConstraints || null,
        excludeRobotIds: group,
        nowMs: now
      });
      if (!nextRoute) {
        return fallback();
      }
      routesByRobot.set(robotId, nextRoute);
    }

    let conflict = detectCbsConflict(routesByRobot);
    if (!conflict) {
      group.forEach((robotId) => {
        if (robotId === robot?.id) return;
        const robotEntity = getRobotById(robotId);
        const runtimeEntry = getRobotRuntime(robotId);
        const nextRoute = routesByRobot.get(robotId);
        if (!robotEntity || !runtimeEntry || !nextRoute) return;
        const prevKey = getRuntimeEdgeGroupKey(runtimeEntry);
        applyRuntimeRoute(robotEntity, runtimeEntry, nextRoute, prevKey);
      });
      return { route: routesByRobot.get(robot.id) || route, constraints: baseConstraints };
    }

    let collisionSet = new Set([conflict.robotA, conflict.robotB]);
    let iterations = 0;
    while (iterations < settings.depth && collisionSet.size <= settings.maxRobots) {
      const collisionGroup = Array.from(collisionSet);
      const jointResult = resolveGlobalMapfConflict(
        robot,
        runtime,
        targetPos,
        targetNodeId,
        route,
        baseConstraints,
        settings,
        { ...options, groupOverride: collisionGroup }
      );
      const combinedRoutes = new Map();
      group.forEach((robotId) => {
        if (collisionSet.has(robotId)) {
          if (robotId === robot?.id) {
            combinedRoutes.set(robotId, jointResult?.route || routesByRobot.get(robotId));
          } else {
            const runtimeEntry = getRobotRuntime(robotId);
            combinedRoutes.set(robotId, runtimeEntry?.route || routesByRobot.get(robotId));
          }
        } else {
          combinedRoutes.set(robotId, routesByRobot.get(robotId));
        }
      });
      conflict = detectCbsConflict(combinedRoutes);
      if (!conflict) {
        group.forEach((robotId) => {
          if (robotId === robot?.id) return;
          if (collisionSet.has(robotId)) return;
          const robotEntity = getRobotById(robotId);
          const runtimeEntry = getRobotRuntime(robotId);
          const nextRoute = routesByRobot.get(robotId);
          if (!robotEntity || !runtimeEntry || !nextRoute) return;
          const prevKey = getRuntimeEdgeGroupKey(runtimeEntry);
          applyRuntimeRoute(robotEntity, runtimeEntry, nextRoute, prevKey);
        });
        return { route: combinedRoutes.get(robot.id) || route, constraints: baseConstraints };
      }
      collisionSet.add(conflict.robotA);
      collisionSet.add(conflict.robotB);
      iterations += 1;
    }

    return fallback();
  };

  const resolveCbsConflict = (
    robot,
    runtime,
    targetPos,
    targetNodeId,
    route,
    baseConstraints,
    options = {}
  ) => {
    const settings = getCbsSettings(robot);
    if (!settings.enabled) {
      return { route, constraints: baseConstraints };
    }
    if (settings.global) {
      if (settings.solver === 'csp') {
        return resolveGlobalMapfCspConflict(
          robot,
          runtime,
          targetPos,
          targetNodeId,
          route,
          baseConstraints,
          settings,
          options
        );
      }
      if (settings.solver === 'pibt') {
        return resolveGlobalMapfPibtConflict(
          robot,
          runtime,
          targetPos,
          targetNodeId,
          route,
          baseConstraints,
          settings,
          options
        );
      }
      if (settings.solver === 'mstar') {
        return resolveMStarConflict(
          robot,
          runtime,
          targetPos,
          targetNodeId,
          route,
          baseConstraints,
          settings,
          options
        );
      }
      return resolveGlobalMapfConflict(
        robot,
        runtime,
        targetPos,
        targetNodeId,
        route,
        baseConstraints,
        settings,
        options
      );
    }
    if (settings.full) {
      return resolveCbsFullConflict(
        robot,
        runtime,
        targetPos,
        targetNodeId,
        route,
        baseConstraints,
        settings,
        options
      );
    }
    return resolveCbsLiteConflict(
      robot,
      runtime,
      targetPos,
      targetNodeId,
      route,
      baseConstraints,
      settings,
      options
    );
  };

  const snapshotRouteSchedule = (route) => {
    if (!route) return null;
    return {
      schedule: route.schedule || null,
      scheduleProfile: route.scheduleProfile || null,
      scheduleUpdatedAt: route.scheduleUpdatedAt || null,
      scheduleLocked: Boolean(route.scheduleLocked)
    };
  };

  const scrubLegacySchedule = (route) => {
    if (!route?.schedule?.length) return false;
    const filtered = route.schedule.filter((entry) => Number.isFinite(entry.segmentIndex));
    if (!filtered.length) {
      route.schedule = null;
      route.scheduleProfile = null;
      route.scheduleUpdatedAt = null;
      route.scheduleLocked = false;
      return true;
    }
    if (filtered.length !== route.schedule.length) {
      route.schedule = filtered;
      return true;
    }
    return false;
  };

  const restoreRouteSchedule = (robot, runtime, snapshot) => {
    if (!robot || !runtime?.route || !snapshot) return null;
    runtime.route.schedule = snapshot.schedule;
    runtime.route.scheduleProfile = snapshot.scheduleProfile;
    runtime.route.scheduleUpdatedAt = snapshot.scheduleUpdatedAt;
    runtime.route.scheduleLocked = snapshot.scheduleLocked;
    if (!snapshot.schedule || !snapshot.schedule.length) {
      return null;
    }
    releaseTimeReservations(robot.id);
    const reserved = reserveRouteSchedule(robot, runtime.route);
    if (!reserved) {
      runtime.route.schedule = null;
      runtime.route.scheduleProfile = null;
      runtime.route.scheduleUpdatedAt = null;
    }
    return reserved;
  };

  // RepairEngine: retime the schedule without changing the path.
  const repairRouteSchedule = (robot, runtime, nowMs, constraints) => {
    if (!robot || !runtime?.route?.segments?.length) return null;
    if (!runtime.route.schedule?.length) return null;
    const previous = snapshotRouteSchedule(runtime.route);
    const profile = runtime.route.scheduleProfile || getReservationProfile(robot);
    const table = ensureReservationTable(profile);
    if (!profile || !table) return null;
    if (!Scheduler?.repairTimeReservationSchedule) return null;
    const planningPriority = robot ? getRobotPriority(robot) : null;
    const route = runtime.route;
    const startIndex = Math.max(0, route.segmentIndex || 0);
    const startProgress = Math.max(0, route.segmentProgress || 0);
    const result = Scheduler.repairTimeReservationSchedule(buildSchedulerContext(), {
      robot,
      route,
      nowMs,
      constraints,
      profile,
      planningPriority,
      startIndex,
      startProgress,
      priorSchedule: previous.schedule || null
    });
    if (!result || result.failed) {
      restoreRouteSchedule(robot, runtime, previous);
      recordMetricCount('repairsFailed');
      return null;
    }
    if (!result.adjusted) {
      restoreRouteSchedule(robot, runtime, previous);
      return null;
    }
    runtime.route.schedule = result.schedule;
    runtime.route.scheduleProfile = profile;
    runtime.route.scheduleUpdatedAt = Number.isFinite(nowMs) ? nowMs : Date.now();
    recordMetricCount('repairsSucceeded');
    return { schedule: result.schedule, profile };
  };

  const refreshRouteSchedule = (robot, runtime, nowMs, options = {}) => {
    if (!robot || !runtime?.route) return null;
    if (!trafficStrategy?.useTimeReservations?.()) return null;
    scrubLegacySchedule(runtime.route);
    const previous = snapshotRouteSchedule(runtime.route);
    const seedProfile = runtime.route?.scheduleProfile || getReservationProfile(robot);
    seedStaticTimeReservations(nowMs, seedProfile);
    if (
      !options.force &&
      runtime.route?.schedule?.length &&
      Number.isFinite(runtime.route.scheduleUpdatedAt) &&
      Number.isFinite(nowMs) &&
      nowMs - runtime.route.scheduleUpdatedAt < RESERVATION_REFRESH_COOLDOWN_MS
    ) {
      releaseTimeReservations(robot.id);
      const reserved = reserveRouteSchedule(robot, runtime.route);
      if (reserved) {
        return reserved;
      }
    }
    if (runtime.route?.scheduleLocked && !options.force) {
      releaseTimeReservations(robot.id);
      const reserved = reserveRouteSchedule(robot, runtime.route);
      if (!reserved) {
        runtime.route.scheduleLocked = false;
        const rebuilt = refreshRouteSchedule(robot, runtime, nowMs, { force: true });
        if (!rebuilt) {
          restoreRouteSchedule(robot, runtime, previous);
        }
        return rebuilt;
      }
      return reserved;
    }
    if (trafficStrategy?.useScheduleRepair?.()) {
      const repaired = repairRouteSchedule(robot, runtime, nowMs, runtime?.cbsConstraints || null);
      if (repaired) {
        return repaired;
      }
    }
    releaseTimeReservations(robot.id);
    const scheduleData = buildTimeReservationSchedule(
      robot,
      runtime.route,
      nowMs,
      runtime?.cbsConstraints || null
    );
    if (!scheduleData) {
      restoreRouteSchedule(robot, runtime, previous);
      if (options.allowReplan !== false) {
        triggerReplan(robot, runtime, 'schedule_build_failed', { nowMs });
      }
      return null;
    }
    runtime.route.schedule = scheduleData.schedule;
    runtime.route.scheduleProfile = scheduleData.profile;
    runtime.route.scheduleUpdatedAt = Number.isFinite(nowMs) ? nowMs : Date.now();
    return scheduleData;
  };

  const canTriggerReplan = (robot, runtime, nowMs) => {
    if (!robot || !runtime) return false;
    const intervalMs = trafficStrategy?.getReplanIntervalMs?.(robot);
    if (Number.isFinite(intervalMs) && intervalMs > 0) {
      const lastPlanAt = Number.isFinite(runtime.lastPlanAt) ? runtime.lastPlanAt : 0;
      if (nowMs - lastPlanAt < intervalMs) {
        return false;
      }
    }
    const cooldownUntil = runtime.replanCooldownUntil;
    if (Number.isFinite(cooldownUntil) && nowMs < cooldownUntil) {
      return false;
    }
    return true;
  };

  const triggerReplan = (robot, runtime, reason, options = {}) => {
    if (!robot || !runtime?.routeGoal?.pos) return false;
    if (runtime.mode === 'manual' || runtime.paused) return false;
    const now = Number.isFinite(options.nowMs) ? options.nowMs : Date.now();
    if (!canTriggerReplan(robot, runtime, now)) return false;
    const intervalMs = trafficStrategy?.getReplanIntervalMs?.(robot);
    runtime.replanCooldownUntil =
      Number.isFinite(intervalMs) && intervalMs > 0 ? now + intervalMs : now;
    const previousRoute = runtime.route;
    setRuntimeRoute(runtime, robot, runtime.routeGoal.pos, runtime.routeGoal.nodeId, {
      constraints: runtime.cbsConstraints,
      replanReason: reason || null,
      countReplan: true
    });
    const replanned = runtime.route && runtime.route !== previousRoute;
    return replanned;
  };

  const shouldContinueRollingPlan = (robot, runtime) => {
    if (!robot?.pos || !runtime?.routeGoal?.pos) return false;
    if (!Number.isFinite(runtime.routeLimit)) return false;
    const goalDist = distanceBetweenPoints(robot.pos, runtime.routeGoal.pos);
    if (!Number.isFinite(goalDist)) return false;
    return goalDist > ROBOT_ARRIVAL_DISTANCE;
  };

  const triggerRollingReplan = (robot, runtime, options = {}) => {
    if (!robot || !runtime?.routeGoal?.pos) return false;
    const previousRoute = runtime.route;
    setRuntimeRoute(runtime, robot, runtime.routeGoal.pos, runtime.routeGoal.nodeId, {
      constraints: runtime.cbsConstraints,
      replanReason: options.reason || 'rolling',
      countReplan: true
    });
    return runtime.route && runtime.route !== previousRoute;
  };

  const maybeTriggerReplanForHold = (robot, runtime, nowMs) => {
    if (!runtime?.stallSince) return false;
    const profile = getRobustnessProfile();
    const maxHoldMs = Number.isFinite(profile?.repair?.maxHoldMs)
      ? profile.repair.maxHoldMs
      : null;
    if (maxHoldMs == null || maxHoldMs <= 0) return false;
    if (nowMs - runtime.stallSince < maxHoldMs) return false;
    const reason = runtime.stallReason || null;
    if (!reason || !REPLAN_HOLD_REASONS.has(reason)) return false;
    return triggerReplan(robot, runtime, `hold:${reason}`, { nowMs });
  };

  const shouldIgnoreTrafficBlocks = () => ignoreTraffic;

  const getTrafficSpeedLimit = (robot, desiredSpeed, desiredHeading) => {
    const desiredSpeedValue = Number.isFinite(desiredSpeed) ? desiredSpeed : 0;
    const desiredMag = Math.abs(desiredSpeedValue);
    const profile = getRobotMotionProfile(robot);
    if (shouldIgnoreTrafficBlocks() || !robot?.pos) {
      return { speedLimit: desiredMag, blockingId: null, blockReason: null };
    }
    const trafficRobots = trafficSnapshot || robots;
    const headingBase = Number.isFinite(desiredHeading)
      ? desiredHeading
      : Number.isFinite(robot.heading)
        ? robot.heading
        : 0;
    const motionHeading =
      desiredSpeedValue < -1e-3 ? normalizeAngle(headingBase + Math.PI) : headingBase;
    const selfVel = getRobotVelocity(robot);
    const speedMag = Math.hypot(selfVel.vx, selfVel.vy);
    const currentHeading = speedMag > 1e-3 ? Math.atan2(selfVel.vy, selfVel.vx) : headingBase;
    const headingDiff = Math.abs(normalizeAngle(currentHeading - motionHeading));
    const preferCurrent = speedMag > desiredMag + 1e-3 && headingDiff < Math.PI / 2;
    const motionDir = preferCurrent && speedMag > 1e-3
      ? { x: selfVel.vx / speedMag, y: selfVel.vy / speedMag }
      : desiredMag > 1e-3
        ? { x: Math.cos(motionHeading), y: Math.sin(motionHeading) }
        : speedMag > 1e-3
          ? { x: selfVel.vx / speedMag, y: selfVel.vy / speedMag }
          : { x: Math.cos(headingBase), y: Math.sin(headingBase) };
    const plannedSpeed = Math.max(desiredMag, speedMag);
    const forwardDir = motionDir;
    const plannedVel = plannedSpeed > 1e-3
      ? { vx: motionDir.x * plannedSpeed, vy: motionDir.y * plannedSpeed }
      : selfVel;
    let speedLimit = desiredMag;
    let blockingId = null;
    let blockReason = null;
    const spacing = getTrafficSpacing(robot);
    const stopDistance = spacing.stop;
    const yieldDistance = spacing.yield;
    const forwardStopDistance = resolveForwardStopDistance(robot);
    const useStopLookahead =
      Number.isFinite(forwardStopDistance) &&
      forwardStopDistance > 1e-3 &&
      (desiredMag > 1e-3 || speedMag > 1e-3);
    const corridorStart = robot.pos;
    const corridorEnd = useStopLookahead
      ? {
          x: robot.pos.x + forwardDir.x * forwardStopDistance,
          y: robot.pos.y + forwardDir.y * forwardStopDistance
        }
      : corridorStart;
    const selfRuntime = robotRuntime.get(robot?.id);
    const selfSegment = selfRuntime?.route?.segments?.[selfRuntime.route.segmentIndex] || null;
    const selfEdgeGroupKey = resolveEdgeLockKey(selfSegment, robot);
    const maybeForceEdgeLockYield = (other, otherRuntime) => {
      if (!selfEdgeGroupKey || !otherRuntime) return false;
      if (resolveEdgeLockPriority(robot, other) !== true) return false;
      return forceEdgeLockYield(other, otherRuntime, selfEdgeGroupKey, robot.id);
    };

    if (trafficStrategy?.useAvoidanceZones?.()) {
      const avoidanceBlock = getAvoidanceBlock(robot);
      if (avoidanceBlock) {
        return {
          speedLimit: 0,
          blockingId: avoidanceBlock.ownerId,
          blockReason: 'avoidance_zone'
        };
      }
    }

    for (const other of trafficRobots) {
      if (other.id === robot.id) continue;
      if (other.online === false) continue;
      if (!other.pos) continue;
      const dx = other.pos.x - robot.pos.x;
      const dy = other.pos.y - robot.pos.y;
      const forward = dx * forwardDir.x + dy * forwardDir.y;
      if ((desiredMag > 1e-3 || speedMag > 1e-3) && forward < 0) continue;
      const dist = Math.hypot(dx, dy);
      const corridorDist = useStopLookahead
        ? distancePointToSegment(other.pos, corridorStart, corridorEnd)
        : dist;
      const otherRuntime = robotRuntime.get(other.id);
      if (dist <= ROBOT_OVERLAP_EPS) {
        const otherVel = getRobotVelocity(other);
        const otherSpeed = Math.hypot(otherVel.vx, otherVel.vy);
        if (!otherRuntime && otherSpeed <= 1e-3) {
          continue;
        }
        if (String(robot.id) < String(other.id)) {
          continue;
        }
        maybeForceEdgeLockYield(other, otherRuntime);
        speedLimit = 0;
        blockingId = other.id;
        blockReason = 'traffic_overlap';
        break;
      }
      if (corridorDist <= stopDistance) {
        maybeForceEdgeLockYield(other, otherRuntime);
        const priority = resolveTrafficPriority(robot, other);
        if (priority === true) {
          continue;
        }
        speedLimit = 0;
        blockingId = other.id;
        blockReason = 'traffic';
        break;
      }
      const otherVel = getRobotVelocity(other);
      const relVx = plannedVel.vx - otherVel.vx;
      const relVy = plannedVel.vy - otherVel.vy;
      const relSpeedSq = relVx * relVx + relVy * relVy;
      const dxAhead = useStopLookahead ? other.pos.x - corridorEnd.x : dx;
      const dyAhead = useStopLookahead ? other.pos.y - corridorEnd.y : dy;
      let tClosest = 0;
      if (relSpeedSq > 1e-4) {
        tClosest = clamp(-(dxAhead * relVx + dyAhead * relVy) / relSpeedSq, 0, TRAFFIC_LOOKAHEAD_S);
      }
      const closestX = dxAhead + relVx * tClosest;
      const closestY = dyAhead + relVy * tClosest;
      const closestDist = Math.hypot(closestX, closestY);
      if (closestDist <= stopDistance) {
        maybeForceEdgeLockYield(other, otherRuntime);
        const priority = resolveTrafficPriority(robot, other);
        if (priority === true) {
          continue;
        }
        speedLimit = 0;
        blockingId = other.id;
        blockReason = 'traffic';
        break;
      }
      if (yieldEnabled && closestDist <= yieldDistance) {
        speedLimit = Math.min(
          speedLimit,
          (profile?.speedMps || robotSpeedMps) * ROBOT_YIELD_SPEED_FACTOR
        );
      }
    }

    return { speedLimit, blockingId, blockReason };
  };

  const applyCollisionBlock = (robot, runtime, otherId) => {
    if (!robot) return;
    if (runtime) {
      if (runtime.blockedReason !== 'collision') {
        if (runtime.blockedReason == null) {
          runtime.pausedBeforeBlocked = runtime.paused;
        }
        runtime.paused = true;
        runtime.blockedReason = 'collision';
        runtime.blockedObstacleId = null;
        if (runtime.taskId) {
          updateTask(runtime.taskId, { status: 'paused', phase: 'blocked_collision' });
        }
        if (trafficStrategy?.useTimeReservations?.()) {
          releaseTimeReservations(robot.id);
          if (runtime.route) {
            runtime.route.schedule = null;
            runtime.route.scheduleProfile = null;
          }
          refreshRouteSchedulesAfterRelease(robot.id);
        }
        const segment = runtime.route?.segments?.[runtime.route.segmentIndex] || null;
        dumpDiagnosticsSnapshot('blocked_collision', {
          robotId: robot.id,
          otherId: otherId || null,
          edgeKey: segment?.edgeKey || null,
          edgeGroupKey: segment?.edgeGroupKey || null,
          fromNodeId: segment?.fromNodeId || null,
          toNodeId: segment?.toNodeId || null
        });
        const now = Date.now();
        collisionBlockedUntil.set(robot.id, now + COLLISION_BLOCK_HOLD_MS);
        collisionClearSince.delete(robot.id);
      }
    } else if (!robot.manualBlocked || robot.manualBlockedReason !== 'collision') {
      updateRobotState(robot.id, {
        manualBlocked: true,
        manualBlockedReason: 'collision',
        manualBlockedObstacleId: null
      });
      dumpDiagnosticsSnapshot('blocked_collision', {
        robotId: robot.id,
        otherId: otherId || null,
        edgeKey: null,
        edgeGroupKey: null,
        fromNodeId: null,
        toNodeId: null
      });
      const now = Date.now();
      collisionBlockedUntil.set(robot.id, now + COLLISION_BLOCK_HOLD_MS);
      collisionClearSince.delete(robot.id);
    }
    ensureRobotMotion(robot);
    robot.speed = 0;
    updateRobotState(robot.id, {
      blocked: true,
      speed: 0,
      activity: 'blocked_collision'
    });
    recordEvent('collision_block', {
      robotId: robot.id,
      otherId: otherId || null
    });
  };

  const detectRobotCollisions = (nowMs) => {
    if (!collisionBlockingEnabled) return;
    const count = robots.length;
    if (count < 2) return;
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const overlapKeys = new Set();
    const closeRobots = new Set();
    const collisionGraph = new Map();
    const boxCache = new Map();
    const clearBoxCache = new Map();
    for (let i = 0; i < count; i += 1) {
      const a = robots[i];
      if (!a?.pos) continue;
      const boxA = boxCache.get(a.id) || getRobotCollisionBox(a);
      if (!boxA) continue;
      boxCache.set(a.id, boxA);
      let clearBoxA = clearBoxCache.get(a.id) || null;
      if (!clearBoxA) {
        clearBoxA =
          COLLISION_CLEAR_MARGIN > 0 ? getRobotCollisionBox(a, COLLISION_CLEAR_MARGIN) : boxA;
        clearBoxCache.set(a.id, clearBoxA);
      }
      for (let j = i + 1; j < count; j += 1) {
        const b = robots[j];
        if (!b?.pos) continue;
        const boxB = boxCache.get(b.id) || getRobotCollisionBox(b);
        if (!boxB) continue;
        boxCache.set(b.id, boxB);
        let clearBoxB = clearBoxCache.get(b.id) || null;
        if (!clearBoxB) {
          clearBoxB =
            COLLISION_CLEAR_MARGIN > 0 ? getRobotCollisionBox(b, COLLISION_CLEAR_MARGIN) : boxB;
          clearBoxCache.set(b.id, clearBoxB);
        }
        if (clearBoxA && clearBoxB && boxesOverlap(clearBoxA, clearBoxB)) {
          closeRobots.add(a.id);
          closeRobots.add(b.id);
        }
        if (!boxesOverlap(boxA, boxB)) continue;
        const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
        overlapKeys.add(key);
        const since = collisionOverlap.get(key);
        if (!since) {
          collisionOverlap.set(key, now);
          continue;
        }
        if (now - since < COLLISION_BLOCK_DELAY_MS) {
          continue;
        }
        if (!collisionGraph.has(a.id)) collisionGraph.set(a.id, new Set());
        if (!collisionGraph.has(b.id)) collisionGraph.set(b.id, new Set());
        collisionGraph.get(a.id).add(b.id);
        collisionGraph.get(b.id).add(a.id);
      }
    }
    collisionOverlap.forEach((_value, key) => {
      if (!overlapKeys.has(key)) {
        collisionOverlap.delete(key);
      }
    });
    const blocked = new Set();
    const visited = new Set();
    for (const id of collisionGraph.keys()) {
      if (visited.has(id)) continue;
      const queue = [id];
      const component = [];
      visited.add(id);
      while (queue.length) {
        const current = queue.pop();
        component.push(current);
        const neighbors = collisionGraph.get(current);
        if (!neighbors) continue;
        for (const neighbor of neighbors) {
          if (visited.has(neighbor)) continue;
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
      let leader = component[0];
      for (let i = 1; i < component.length; i += 1) {
        const candidate = component[i];
        const candidateRobot = getRobotById(candidate);
        const leaderRobot = getRobotById(leader);
        if (!candidateRobot || !leaderRobot) continue;
        if (compareTrafficPriority(candidateRobot, leaderRobot) < 0) {
          leader = candidate;
        }
      }
      component.forEach((robotId) => {
        if (robotId === leader) return;
        const robot = getRobotById(robotId);
        if (!robot) return;
        applyCollisionBlock(robot, getRobotRuntime(robotId), leader);
        blocked.add(robotId);
      });
    }
    robots.forEach((robot) => {
      if (!robot) return;
      const runtime = getRobotRuntime(robot.id);
      const blockedCollision =
        runtime?.blockedReason === 'collision' ||
        robot.manualBlockedReason === 'collision';
      if (blockedCollision) {
        if (blocked.has(robot.id)) {
          collisionClearSince.delete(robot.id);
          return;
        }
        const holdUntil = collisionBlockedUntil.get(robot.id);
        if (Number.isFinite(holdUntil) && now < holdUntil) {
          return;
        }
        if (closeRobots.has(robot.id)) {
          collisionClearSince.delete(robot.id);
          return;
        }
        const clearSince = collisionClearSince.get(robot.id);
        if (!Number.isFinite(clearSince)) {
          collisionClearSince.set(robot.id, now);
          return;
        }
        if (now - clearSince < COLLISION_CLEAR_STABLE_MS) {
          return;
        }
        clearRobotBlock(robot.id, { force: true });
        collisionBlockedUntil.delete(robot.id);
        collisionClearSince.delete(robot.id);
        return;
      }
      collisionBlockedUntil.delete(robot.id);
      collisionClearSince.delete(robot.id);
    });
  };

  const applyKinematicMotion = (robot, desiredHeading, desiredSpeed, dt) => {
    if (!robot?.pos || !Number.isFinite(dt) || dt <= 0) {
      return { distance: 0, headingDiff: 0 };
    }
    ensureRobotMotion(robot);
    const profile = getRobotMotionProfile(robot);
    const accelMps2 = profile?.accelMps2 || robotAccelMps2;
    const decelMps2 = profile?.decelMps2 || robotDecelMps2;
    const turnRateRadS = profile?.turnRateRadS || robotTurnRateRadS;
    const diff = normalizeAngle(desiredHeading - robot.heading);
    const steerTarget = clamp(-diff * ROBOT_STEER_GAIN, -ROBOT_STEER_MAX_RAD, ROBOT_STEER_MAX_RAD);
    robot.steerAngle = approachValue(
      robot.steerAngle,
      steerTarget,
      ROBOT_STEER_RATE_RAD_S * dt
    );

    const turnPenalty = computeTurnPenalty(diff);
    const speedTarget = desiredSpeed * turnPenalty;
    const sameDirection = Math.sign(speedTarget) === Math.sign(robot.speed);
    const accel =
      sameDirection && Math.abs(speedTarget) > Math.abs(robot.speed)
        ? accelMps2
        : decelMps2;
    robot.speed = approachValue(robot.speed, speedTarget, accel * dt);

    let yawRate = 0;
    const wheelbase = resolveWheelbase(robot);
    if (Math.abs(robot.speed) > 1e-4 && wheelbase > 0) {
      yawRate = -(robot.speed / wheelbase) * Math.tan(robot.steerAngle);
    } else if (Math.abs(diff) > ROUTE_HEADING_EPS) {
      yawRate = clamp(diff / dt, -turnRateRadS, turnRateRadS);
    }
    const limitedYaw = clamp(yawRate, -turnRateRadS, turnRateRadS);
    const turnStep = limitedYaw * dt;
    robot.heading = normalizeAngle(robot.heading + turnStep);
    robot.turning = Math.abs(limitedYaw);
    robot.turningDiff = Math.abs(diff);

    const distance = robot.speed * dt;
    if (distance !== 0) {
      robot.pos = {
        x: robot.pos.x + Math.cos(robot.heading) * distance,
        y: robot.pos.y + Math.sin(robot.heading) * distance
      };
    }
    return { distance, headingDiff: diff };
  };

  const alignRobotHeading = (robot, targetHeading, deltaMs) => {
    if (!robot) return true;
    if (!Number.isFinite(targetHeading)) return true;
    ensureRobotMotion(robot);
    const diff = normalizeAngle(targetHeading - robot.heading);
    if (Math.abs(diff) <= ROUTE_HEADING_EPS) {
      robot.heading = targetHeading;
      robot.speed = 0;
      return true;
    }
    applyKinematicMotion(robot, targetHeading, 0, deltaMs / 1000);
    return false;
  };

  const buildNavigationGraph = (graph) => {
    if (!graph) return null;
    const allowBackwardDrive = trafficStrategy?.allowBackwardDrive?.() !== false;
    const nodesById = new Map();
    for (const node of graph.nodes || []) {
      if (node && node.id && node.pos && Number.isFinite(node.pos.x) && Number.isFinite(node.pos.y)) {
        nodesById.set(node.id, node);
      }
    }
    const adjacency = new Map();
    for (const nodeId of nodesById.keys()) {
      adjacency.set(nodeId, []);
    }
    const edgesByKey = new Map();
    const edges = [];
    const lineConstraints = [];
    const angleThreshold = Math.cos(toRad(LINE_MATCH_ANGLE_DEG));
    const segmentLength = getReservationSegmentLength();
    const shouldSegment =
      Number.isFinite(segmentLength) && segmentLength > Math.max(ROUTE_PROGRESS_EPS, 0.05);

    const ensureNavNode = (nodeId, pos) => {
      if (!nodeId || !pos) return;
      if (!nodesById.has(nodeId)) {
        nodesById.set(nodeId, { id: nodeId, pos, virtual: true });
      } else {
        const existing = nodesById.get(nodeId);
        if (existing && !existing.pos && pos) {
          existing.pos = pos;
        }
      }
      if (!adjacency.has(nodeId)) {
        adjacency.set(nodeId, []);
      }
    };

    const addEdgeRecord = ({
      startId,
      endId,
      polyline,
      totalLength,
      driveBackward,
      edgeKey,
      edgeGroupKey,
      edgeBaseGroupKey,
      width,
      criticalSectionId
    }) => {
      const payload = {
        startId,
        endId,
        polyline,
        totalLength,
        driveBackward,
        edgeKey,
        edgeGroupKey,
        edgeBaseGroupKey,
        width,
        criticalSectionId: criticalSectionId || null
      };
      edgesByKey.set(edgeKey, payload);
      edges.push(payload);
      if (!adjacency.has(startId)) adjacency.set(startId, []);
      adjacency.get(startId).push({ to: endId, cost: totalLength, edgeKey });
    };

    const addSegmentedEdges = ({
      startNode,
      endNode,
      polyline,
      driveBackward,
      edgeGroupKey,
      width,
      reverseIndex,
      criticalSectionId
    }) => {
      const totalLength = polyline.totalLength;
      if (!shouldSegment || totalLength <= segmentLength * 1.2) {
        const edgeKey = `${startNode.id}->${endNode.id}`;
        addEdgeRecord({
          startId: startNode.id,
          endId: endNode.id,
          polyline,
          totalLength,
          driveBackward,
          edgeKey,
          edgeGroupKey,
          edgeBaseGroupKey: edgeGroupKey,
          width,
          criticalSectionId
        });
        return;
      }
      const segmentCount = Math.max(1, Math.ceil(totalLength / segmentLength));
      const prefix = `__seg_${startNode.id}->${endNode.id}`;
      for (let i = 0; i < segmentCount; i += 1) {
        const startDist = i * segmentLength;
        const endDist = Math.min(totalLength, (i + 1) * segmentLength);
        const segmentPolyline = slicePolyline(polyline, startDist, endDist);
        if (!segmentPolyline?.points?.length || segmentPolyline.totalLength <= ROUTE_PROGRESS_EPS) {
          continue;
        }
        const startId = i === 0 ? startNode.id : `${prefix}_${i}`;
        const endId = i === segmentCount - 1 ? endNode.id : `${prefix}_${i + 1}`;
        if (i > 0) {
          const startPose = polylineAtDistance(polyline, startDist);
          ensureNavNode(startId, { x: startPose.x, y: startPose.y });
        }
        if (i < segmentCount - 1) {
          const endPose = polylineAtDistance(polyline, endDist);
          ensureNavNode(endId, { x: endPose.x, y: endPose.y });
        }
        const groupIndex = reverseIndex ? segmentCount - 1 - i : i;
        const segmentGroupKey = `${edgeGroupKey}::${groupIndex}`;
        addEdgeRecord({
          startId,
          endId,
          polyline: segmentPolyline,
          totalLength: segmentPolyline.totalLength,
          driveBackward,
          edgeKey: `${startId}->${endId}`,
          edgeGroupKey: segmentGroupKey,
          edgeBaseGroupKey: edgeGroupKey,
          width,
          criticalSectionId
        });
      }
    };

    for (const line of graph.lines || []) {
      if (!line || !line.startPos || !line.endPos) continue;
      const props = line.props || {};
      const directionPosX = props.directionPosX;
      const directionPosY = props.directionPosY;
      let dirStart = line.startPos;
      let dirEnd = line.endPos;
      if (Number.isFinite(directionPosX) && Number.isFinite(directionPosY)) {
        const distStart = Math.hypot(directionPosX - line.startPos.x, directionPosY - line.startPos.y);
        const distEnd = Math.hypot(directionPosX - line.endPos.x, directionPosY - line.endPos.y);
        if (distStart < distEnd) {
          dirStart = line.endPos;
          dirEnd = line.startPos;
        }
      }
      const dirVec = unitVector(dirEnd.x - dirStart.x, dirEnd.y - dirStart.y);
      if (dirVec.x === 0 && dirVec.y === 0) continue;
      lineConstraints.push({
        startPos: line.startPos,
        endPos: line.endPos,
        dirVec,
        driveBackward: Number(props.direction) < 0,
        angleThreshold
      });
    }

    const applyLineConstraints = (edgeStartPos, edgeEndPos, polyline) => {
      if (!lineConstraints.length) {
        return { allowed: true, driveBackward: false };
      }
      const edgeMid = polylineAtDistance(polyline, polyline.totalLength * 0.5);
      const edgeDir = unitVector(edgeEndPos.x - edgeStartPos.x, edgeEndPos.y - edgeStartPos.y);
      let best = null;
      let bestDot = -1;
      for (const line of lineConstraints) {
        const dist = distancePointToSegmentCoords(
          edgeMid.x,
          edgeMid.y,
          line.startPos.x,
          line.startPos.y,
          line.endPos.x,
          line.endPos.y
        );
        if (dist > LINE_MATCH_MAX_DIST) continue;
        const dot = edgeDir.x * line.dirVec.x + edgeDir.y * line.dirVec.y;
        if (Math.abs(dot) < line.angleThreshold) continue;
        if (Math.abs(dot) > bestDot) {
          bestDot = Math.abs(dot);
          best = { dot, line };
        }
      }
      if (!best) {
        return { allowed: true, driveBackward: false };
      }
      if (best.dot < 0) {
        return { allowed: false, driveBackward: false };
      }
      return { allowed: true, driveBackward: best.line.driveBackward };
    };

    for (const edge of graph.edges || []) {
      if (!edge || !edge.start || !edge.end) continue;
      const startNode = nodesById.get(edge.start);
      const endNode = nodesById.get(edge.end);
      if (!startNode || !endNode) continue;
      const startPos = edge.startPos ? edge.startPos : startNode.pos;
      const endPos = edge.endPos ? edge.endPos : endNode.pos;
      const controlPos1 = edge.controlPos1 || null;
      const controlPos2 = edge.controlPos2 || null;
      const roughDist = Math.hypot(endPos.x - startPos.x, endPos.y - startPos.y);
      const samples = clamp(Math.ceil(roughDist / 0.25), 6, 80);
      const points =
        controlPos1 && controlPos2
          ? sampleBezierPoints(startPos, controlPos1, controlPos2, endPos, samples)
          : [startPos, endPos];
      const polyline = buildPolyline(points);

      const directionRaw = edge.props ? edge.props.direction : null;
      const direction = Number.isFinite(Number(directionRaw)) ? Number(directionRaw) : null;
      const allowForward = direction === 1 ? true : direction === 2 || direction === -1 ? false : true;
      const allowReverse = direction === 2 || direction === -1 ? true : direction === 1 ? false : true;

      const forwardConstraint = applyLineConstraints(startPos, endPos, polyline);
      const reversed = reversePolyline(polyline);
      const reverseConstraint = applyLineConstraints(endPos, startPos, reversed);
      const edgeGroupKey = makeEdgeGroupKey(startNode.id, endNode.id);
      const rawWidth = Number(edge?.props?.width);
      const corridorWidth = Number.isFinite(rawWidth) ? rawWidth : 0;
      const criticalSectionId = resolveSegmentCriticalSectionId({
        edgeGroupKey,
        edgeBaseGroupKey: edgeGroupKey,
        edgeKey: edgeGroupKey,
        fromNodeId: startNode.id,
        toNodeId: endNode.id
      });

      if (
        allowForward &&
        forwardConstraint.allowed &&
        (allowBackwardDrive || !forwardConstraint.driveBackward)
      ) {
        addSegmentedEdges({
          startNode,
          endNode,
          polyline,
          driveBackward: forwardConstraint.driveBackward,
          edgeGroupKey,
          width: corridorWidth,
          reverseIndex: false,
          criticalSectionId
        });
      }
      if (
        allowReverse &&
        reverseConstraint.allowed &&
        (allowBackwardDrive || !reverseConstraint.driveBackward)
      ) {
        addSegmentedEdges({
          startNode: endNode,
          endNode: startNode,
          polyline: reversed,
          driveBackward: reverseConstraint.driveBackward,
          edgeGroupKey,
          width: corridorWidth,
          reverseIndex: true,
          criticalSectionId
        });
      }
    }
    return { nodesById, adjacency, edgesByKey, edges };
  };

  const buildYieldBays = (graph) => {
    if (!graph?.nodes?.length) return [];
    const nodes = graph.nodes.filter((node) => node && node.pos);
    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const preferred = trafficStrategy?.getYieldBayNodes?.();
    let candidates = [];
    if (Array.isArray(preferred) && preferred.length) {
      candidates = preferred
        .map((id) => nodesById.get(id))
        .filter((node) => node && node.pos);
    }
    if (!candidates.length) {
      candidates = nodes.filter((node) => {
        if (node.props?.yieldBay) return true;
        return node.className === 'ParkPoint' || node.className === 'ChargePoint';
      });
    }
    if (!candidates.length && navGraph?.adjacency) {
      candidates = nodes.filter((node) => {
        const neighbors = navGraph.adjacency.get(node.id);
        return Array.isArray(neighbors) && neighbors.length <= 1;
      });
    }
    return candidates.map((node) => ({
      id: node.id,
      pos: { ...node.pos },
      className: node.className || null
    }));
  };

  const resolveStrategyValue = (value, fallback) =>
    Number.isFinite(value) ? value : fallback;

  const recordRuntimeHoldState = (runtime, reason, detail, nowMs) => {
    if (!runtime || !reason) return;
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const existing = runtime.holdState;
    runtime.holdState = {
      reason,
      since: existing && existing.reason === reason ? existing.since : now,
      lastSeenAt: now,
      detail: detail || null
    };
  };

  const resolveStickyHoldState = (runtime, nowMs) => {
    if (!runtime?.holdState) return null;
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const lastSeen = runtime.holdState.lastSeenAt;
    if (Number.isFinite(lastSeen) && now - lastSeen <= HOLD_STATE_GRACE_MS) {
      return {
        reason: runtime.holdState.reason || null,
        hold: true,
        detail: runtime.holdState.detail || null
      };
    }
    runtime.holdState = null;
    return null;
  };

  const getActiveHoldState = (runtime, nowMs) => {
    if (!runtime?.holdState) return null;
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const lastSeen = runtime.holdState.lastSeenAt;
    if (Number.isFinite(lastSeen) && now - lastSeen <= HOLD_STATE_GRACE_MS) {
      return runtime.holdState;
    }
    return null;
  };

  const resolveRuntimeWaitSince = (runtime) => {
    if (!runtime) return null;
    if (Number.isFinite(runtime.stallSince)) return runtime.stallSince;
    const holdState = getActiveHoldState(runtime);
    if (Number.isFinite(holdState?.since)) return holdState.since;
    return null;
  };

  const isRuntimeWaitingOnReservation = (runtime, nowMs) => {
    if (!runtime?.route) return false;
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const entry = getRouteScheduleEntry(runtime.route, runtime.route.segmentIndex);
    if (entry && Number.isFinite(entry.startTime)) {
      const waitMs = entry.startTime - now;
      const progress = Number.isFinite(runtime.route.segmentProgress)
        ? runtime.route.segmentProgress
        : null;
      const nearStart = progress == null || progress <= RESERVATION_ENTRY_START_EPS;
      if (waitMs > 50 && nearStart) return true;
    }
    if (runtime.entryHold?.startTime && Number.isFinite(runtime.entryHold.startTime)) {
      const waitMs = runtime.entryHold.startTime - now;
      if (waitMs > 50 && isRuntimeAtEntryHoldStop(runtime)) {
        return true;
      }
    }
    return false;
  };

  const clearRuntimeStall = (runtime, options = {}) => {
    if (!runtime) return;
    if (runtime.stallReason && !options.silent) {
      recordEvent('stall_clear', {
        robotId: runtime.robotId || null,
        reason: runtime.stallReason,
        opponentId: runtime.stallOpponentId || null
      });
    }
    runtime.stallSince = null;
    runtime.stallReason = null;
    runtime.stallOpponentId = null;
  };

  const markRuntimeStall = (runtime, reason, opponentId) => {
    if (!runtime) return;
    if (runtime.stallSince && runtime.stallReason === reason) {
      if (opponentId && runtime.stallOpponentId !== opponentId) {
        runtime.stallOpponentId = opponentId;
      }
      recordRuntimeHoldState(runtime, reason || 'blocked', {
        opponentId: opponentId || null
      });
      return;
    }
    runtime.stallSince = Date.now();
    runtime.stallReason = reason || 'blocked';
    runtime.stallOpponentId = opponentId || null;
    recordEvent('stall', {
      robotId: runtime.robotId || null,
      reason: runtime.stallReason,
      opponentId: runtime.stallOpponentId || null
    });
    recordMetricCount('holds');
    recordRuntimeHoldState(runtime, runtime.stallReason, {
      opponentId: runtime.stallOpponentId || null
    });
  };

  const getStuckRetryDelay = (count) => {
    const safeCount = Number.isFinite(count) ? Math.max(1, count) : 1;
    const delay = STUCK_RETRY_BASE_MS * Math.pow(2, safeCount - 1);
    return Math.min(delay, STUCK_RETRY_MAX_MS);
  };

  const clearRuntimeStuck = (runtime) => {
    if (!runtime) return;
    runtime.stuckSince = null;
    runtime.stuckReason = null;
    runtime.stuckRetryAt = null;
    runtime.stuckCount = 0;
  };

  const enterStuckState = (robot, runtime, reason) => {
    if (!robot || !runtime) return;
    const now = Date.now();
    if (!runtime.stallSince) {
      markRuntimeStall(runtime, reason || 'stuck');
    }
    if (!runtime.stuckSince) {
      runtime.stuckSince = now;
    }
    runtime.stuckReason = reason || runtime.stuckReason || 'stuck';
    runtime.stuckCount = (runtime.stuckCount || 0) + 1;
    runtime.stuckRetryAt = now + getStuckRetryDelay(runtime.stuckCount);
    runtime.target = null;
    runtime.route = null;
    runtime.avoidance = null;
    runtime.targetHeading = null;
    runtime.entryHold = null;
    runtime.entryHoldBypass = null;
    invalidateEntryHoldWaiterCache();
    runtime.scheduleSlip = null;
    runtime.scheduleResyncAfterSegment = false;
    runtime.scheduleResyncAt = null;
    runtime.edgeLockYield = null;
    runtime.edgeLockYieldAt = null;
    runtime.edgeLockHold = null;
    runtime.nodeLockHold = null;
    runtime.yieldStartedAt = null;
    runtime.yieldAttempts = 0;
    runtime.resumePhase = null;
    runtime.resumeRouteGoal = null;
    releaseRobotEdgeLocks(robot.id);
    refreshRouteSchedulesAfterRelease(robot.id);
    updateRobotState(robot.id, { activity: 'stuck' });
    if (runtime.taskId) {
      updateTask(runtime.taskId, { phase: 'stuck' });
    }
  };

  const computeYieldTargetOnRoute = (runtime, backoff) => {
    if (!runtime?.route) return null;
    const route = runtime.route;
    let remaining = Number.isFinite(backoff) ? backoff : YIELD_BACKOFF_DISTANCE;
    let idx = route.segmentIndex;
    if (!route.segments?.length || idx >= route.segments.length) return null;
    const currentProgress = Number.isFinite(route.segmentProgress) ? route.segmentProgress : 0;
    let progress = currentProgress;
    while (idx >= 0) {
      const segment = route.segments[idx];
      if (!segment?.polyline || !Number.isFinite(segment.totalLength)) {
        idx -= 1;
        progress = segment?.totalLength || 0;
        continue;
      }
      const travelled = idx === route.segmentIndex ? progress : segment.totalLength;
      if (travelled >= remaining) {
        const distance = Math.max(0, travelled - remaining);
        const pose = polylineAtDistance(segment.polyline, distance);
        if (!Number.isFinite(pose.x) || !Number.isFinite(pose.y)) return null;
        return { pos: { x: pose.x, y: pose.y }, nodeId: segment.fromNodeId || null };
      }
      remaining -= travelled;
      idx -= 1;
      progress = route.segments[idx]?.totalLength || 0;
    }
    return null;
  };

  const isYieldTargetClear = (robot, target) => {
    if (!robot?.pos || !target) return false;
    const minSpacing = ROBOT_STOP_DISTANCE * 0.8;
    for (const other of robots) {
      if (!other?.pos || other.id === robot.id) continue;
      if (distanceBetweenPoints(other.pos, target) <= minSpacing) {
        return false;
      }
    }
    for (const obstacle of obstacles) {
      if (!obstacle) continue;
      const clearance = obstacle.radius + OBSTACLE_CLEARANCE;
      if (distanceBetweenPoints(obstacle, target) <= clearance) {
        return false;
      }
    }
    return true;
  };

  const getYieldBayTarget = (robot) => {
    if (!robot?.pos || !yieldBays.length) return null;
    let best = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const bay of yieldBays) {
      if (!bay?.pos) continue;
      const lock = nodeLocks.get(bay.id);
      if (lock && lock.holderId && lock.holderId !== robot.id && Date.now() < lock.until) {
        continue;
      }
      const occupiedBy = getParkingBlocker(bay, robot.id);
      if (occupiedBy) continue;
      const dist = distanceBetweenPoints(robot.pos, bay.pos);
      if (dist < bestDist) {
        bestDist = dist;
        best = bay;
      }
    }
    return best ? { pos: { ...best.pos }, nodeId: best.id } : null;
  };

  const computeYieldTarget = (robot, runtime, distance) => {
    if (runtime?.noYieldTarget) return null;
    if (!robot?.pos) return null;
    const backoff = Number.isFinite(distance) ? distance : YIELD_BACKOFF_DISTANCE;
    const candidates = [];
    const allowTurnaround = trafficStrategy?.allowTurnaround?.() !== false;
    const segment = runtime?.route?.segments?.[runtime.route.segmentIndex];
    const forwardHeading = Number.isFinite(segment?.polyline?.headings?.[0])
      ? segment.polyline.headings[0]
      : null;
    const forwardDir = Number.isFinite(forwardHeading)
      ? { x: Math.cos(forwardHeading), y: Math.sin(forwardHeading) }
      : null;
    const hasForwardDir = Boolean(forwardDir);
    const isBehindCandidate = (pos) => {
      if (!forwardDir) return true;
      const dx = pos.x - robot.pos.x;
      const dy = pos.y - robot.pos.y;
      return dx * forwardDir.x + dy * forwardDir.y <= 0;
    };
    const routeCandidate = computeYieldTargetOnRoute(runtime, backoff);
    if (routeCandidate?.pos) {
      candidates.push({
        pos: routeCandidate.pos,
        nodeId: routeCandidate.nodeId,
        requireBehind: true
      });
    }
    if (runtime?.route?.segments?.length) {
      if (segment?.fromNodeId && navGraph?.nodesById?.has(segment.fromNodeId)) {
        const node = navGraph.nodesById.get(segment.fromNodeId);
        if (node?.pos) {
          candidates.push({
            pos: { ...node.pos },
            nodeId: segment.fromNodeId,
            requireBehind: true
          });
        }
      }
    }
    const yieldBay = getYieldBayTarget(robot);
    if (yieldBay) {
      candidates.push({ pos: yieldBay.pos, nodeId: yieldBay.nodeId, requireBehind: false });
    }
    for (const candidate of candidates) {
      if (candidate.requireBehind && !isBehindCandidate(candidate.pos)) {
        continue;
      }
      if (!allowTurnaround && hasForwardDir && isBehindCandidate(candidate.pos)) {
        continue;
      }
      const dist = distanceBetweenPoints(robot.pos, candidate.pos);
      if (dist < ROBOT_RADIUS * 0.5) continue;
      if (!isYieldTargetClear(robot, candidate.pos)) continue;
      return candidate.pos;
    }
    if (allowTurnaround && forwardDir) {
      const fallback = {
        x: robot.pos.x - forwardDir.x * backoff,
        y: robot.pos.y - forwardDir.y * backoff
      };
      if (isYieldTargetClear(robot, fallback)) {
        return fallback;
      }
    }
    if (!allowTurnaround) return null;
    const heading = Number.isFinite(robot.heading) ? robot.heading : 0;
    const fallback = {
      x: robot.pos.x - Math.cos(heading) * backoff,
      y: robot.pos.y - Math.sin(heading) * backoff
    };
    return isYieldTargetClear(robot, fallback) ? fallback : null;
  };

  const isSameDirectionTrafficBlock = (robot, opponent) => {
    if (!robot?.pos || !opponent?.pos) return false;
    const robotVel = getRobotVelocity(robot);
    const robotSpeed = Math.hypot(robotVel.vx, robotVel.vy);
    const robotHeading = Number.isFinite(robot.heading) ? robot.heading : 0;
    const robotDir =
      robotSpeed > 1e-3
        ? { x: robotVel.vx / robotSpeed, y: robotVel.vy / robotSpeed }
        : { x: Math.cos(robotHeading), y: Math.sin(robotHeading) };

    const oppVel = getRobotVelocity(opponent);
    const oppSpeed = Math.hypot(oppVel.vx, oppVel.vy);
    const oppHeading = Number.isFinite(opponent.heading) ? opponent.heading : 0;
    const oppDir =
      oppSpeed > 1e-3
        ? { x: oppVel.vx / oppSpeed, y: oppVel.vy / oppSpeed }
        : { x: Math.cos(oppHeading), y: Math.sin(oppHeading) };

    const dx = opponent.pos.x - robot.pos.x;
    const dy = opponent.pos.y - robot.pos.y;
    const forward = dx * robotDir.x + dy * robotDir.y;
    if (forward <= 0) return false;
    const robotAngle = Math.atan2(robotDir.y, robotDir.x);
    const oppAngle = Math.atan2(oppDir.y, oppDir.x);
    const diff = Math.abs(normalizeAngle(robotAngle - oppAngle));
    return diff <= TRAFFIC_SAME_DIR_MAX_RAD;
  };

  const shouldTriggerYield = (robot, runtime) => {
    if (!yieldEnabled) return false;
    if (!runtime || runtime.phase === 'yield' || runtime.mode === 'manual') return false;
    if (runtime.paused) return false;
    if (robot?.blocked || runtime.blockedReason) return false;
    if (runtime.avoidance || runtime.avoidanceHold) return false;
    if (runtime.stuckRetryAt) return false;
    if (!runtime.stallSince || !runtime.stallReason) return false;
    if (
      runtime.stallReason === 'avoidance_zone' ||
      runtime.stallReason === 'avoidance_hold' ||
      runtime.stallReason === 'parking_occupied' ||
      runtime.stallReason === 'charge_occupied' ||
      runtime.stallReason === 'reservation_wait' ||
      runtime.stallReason === 'reservation_entry' ||
      runtime.stallReason === 'critical_section_wait'
    ) {
      return false;
    }
    const timeout = resolveStrategyValue(
      trafficStrategy?.getDeadlockTimeoutMs?.(robot),
      DEADLOCK_TIMEOUT_MS
    );
    if (timeout <= 0) return false;
    const now = Date.now();
    const cooldown = resolveStrategyValue(
      trafficStrategy?.getYieldCooldownMs?.(robot),
      2500
    );
    if (runtime.lastYieldAt && now - runtime.lastYieldAt < cooldown) return false;
    const segment = runtime.route?.segments?.[runtime.route.segmentIndex];
    const edgeGroupKey = resolveEdgeLockKey(segment, robot);
    const lockMap = edgeGroupKey ? edgeLocks.get(edgeGroupKey) : null;
    const holdsLock = lockMap ? lockMap.has(robot?.id) : false;
    if (runtime.stallReason === 'edge_lock' && robot?.pos) {
      const spacing = getTrafficSpacing(robot);
      const hasNearby = robots.some((other) => {
        if (!other?.pos || other.id === robot.id) return false;
        return distanceBetweenPoints(other.pos, robot.pos) <= spacing.yield;
      });
      if (!hasNearby) {
        return false;
      }
    }
    if (
      (runtime.stallReason === 'traffic' || runtime.stallReason === 'edge_lock') &&
      runtime.stallOpponentId &&
      robot?.id
    ) {
      const opponent = getRobotById(runtime.stallOpponentId);
      const opponentRuntime = opponent ? getRobotRuntime(opponent.id) : null;
      const opponentHoldsLock = opponent && lockMap ? lockMap.has(opponent.id) : false;
      const opponentBlocksWithLock = opponentRuntime?.edgeLockHold?.holderId === robot.id;
      const sameDir = opponent ? isSameDirectionTrafficBlock(robot, opponent) : false;
      const effectiveSameDir = sameDir && !opponentBlocksWithLock;
      if (effectiveSameDir) {
        return false;
      }
      const order = String(robot.id).localeCompare(String(runtime.stallOpponentId));
      if (order < 0) {
        if (opponent && holdsLock && !opponentHoldsLock && !effectiveSameDir) {
          return now - runtime.stallSince >= timeout;
        }
        return false;
      }
    }
    return now - runtime.stallSince >= timeout;
  };

  const attemptPushRotateRecovery = (robot, runtime) => {
    if (!yieldEnabled) return false;
    if (!trafficStrategy?.useRecoveryMoves?.()) return false;
    if (!robot || !runtime) return false;
    const blockerId =
      runtime.stallOpponentId ||
      runtime.lastTrafficBlock?.blockingId ||
      runtime.edgeLockHold?.holderId ||
      null;
    if (!blockerId || blockerId === robot.id) return false;
    const blocker = getRobotById(blockerId);
    const blockerRuntime = getRobotRuntime(blockerId);
    if (!blocker || !blockerRuntime) return false;
    if (blockerRuntime.mode === 'manual' || blockerRuntime.phase === 'yield') return false;
    const yieldTarget = getYieldBayTarget(blocker);
      const fallbackTarget = resolveRobotParkingPoint(blocker, { allowOccupied: false });
    const target = yieldTarget?.pos || fallbackTarget?.pos || null;
    if (!target) return false;
    blockerRuntime.resumePhase = blockerRuntime.phase;
    blockerRuntime.resumeRouteGoal = blockerRuntime.routeGoal ? { ...blockerRuntime.routeGoal } : null;
    blockerRuntime.phase = 'yield';
    blockerRuntime.target = { ...target };
    blockerRuntime.targetHeading = null;
    blockerRuntime.route = null;
    blockerRuntime.avoidance = null;
    blockerRuntime.lastYieldAt = Date.now();
    blockerRuntime.yieldStartedAt = blockerRuntime.lastYieldAt;
    blockerRuntime.yieldAttempts = 1;
    clearRuntimeStall(blockerRuntime);
    clearRuntimeStuck(blockerRuntime);
    releaseRobotEdgeLocks(blocker.id);
    refreshRouteSchedulesAfterRelease(blocker.id);
    blockerRuntime.entryHold = null;
    blockerRuntime.entryHoldBypass = null;
    invalidateEntryHoldWaiterCache();
    blockerRuntime.scheduleSlip = null;
    blockerRuntime.scheduleResyncAfterSegment = false;
    blockerRuntime.scheduleResyncAt = null;
    blockerRuntime.edgeLockHold = null;
    blockerRuntime.nodeLockHold = null;
    updateRobotState(blocker.id, { activity: 'recovery' });
    if (blockerRuntime.taskId) {
      updateTask(blockerRuntime.taskId, { phase: 'recovery' });
    }
    return true;
  };

  const triggerYield = (robot, runtime) => {
    if (!yieldEnabled) return false;
    if (!robot || !runtime) return false;
    if (attemptPushRotateRecovery(robot, runtime)) {
      return true;
    }
    const backoff = resolveStrategyValue(
      trafficStrategy?.getYieldBackoffDistance?.(robot),
      YIELD_BACKOFF_DISTANCE
    );
    const yieldTarget = computeYieldTarget(robot, runtime, backoff);
    if (!yieldTarget) {
      enterStuckState(robot, runtime, 'yield');
      return true;
    }
    runtime.resumePhase = runtime.phase;
    runtime.resumeRouteGoal = runtime.routeGoal ? { ...runtime.routeGoal } : null;
    runtime.phase = 'yield';
    runtime.target = { ...yieldTarget };
    runtime.targetHeading = null;
    runtime.route = null;
    runtime.avoidance = null;
    runtime.lastYieldAt = Date.now();
    runtime.yieldStartedAt = runtime.lastYieldAt;
    runtime.yieldAttempts = 1;
    clearRuntimeStall(runtime);
    clearRuntimeStuck(runtime);
    releaseRobotEdgeLocks(robot.id);
    refreshRouteSchedulesAfterRelease(robot.id);
    runtime.entryHold = null;
    runtime.entryHoldBypass = null;
    invalidateEntryHoldWaiterCache();
    runtime.scheduleSlip = null;
    runtime.scheduleResyncAfterSegment = false;
    runtime.scheduleResyncAt = null;
    runtime.edgeLockHold = null;
    runtime.nodeLockHold = null;
    updateRobotState(robot.id, { activity: 'yielding' });
    if (runtime.taskId) {
      updateTask(runtime.taskId, { phase: 'yield' });
    }
    return true;
  };

  const maybeTriggerYield = (robot, runtime) => {
    if (!yieldEnabled) return false;
    if (trafficStrategy?.useYieldRecovery?.() === false) return false;
    if (!shouldTriggerYield(robot, runtime)) return false;
    return triggerYield(robot, runtime);
  };

  const resolveRuntimeBlocker = (runtime, nowMs) => {
    if (!runtime) return null;
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const holdState = getActiveHoldState(runtime, now);
    const reason = runtime.stallReason || holdState?.reason || null;
    if (reason === 'node_lock' && runtime.nodeLockHold?.holderId) {
      return { blockerId: runtime.nodeLockHold.holderId, reason, nodeId: runtime.nodeLockHold.nodeId || null };
    }
    if (reason === 'edge_lock' && runtime.edgeLockHold?.holderId) {
      return { blockerId: runtime.edgeLockHold.holderId, reason, edgeKey: runtime.edgeLockHold.edgeGroupKey || null };
    }
    if ((reason === 'traffic' || reason === 'traffic_overlap') && runtime.lastTrafficBlock?.blockingId) {
      return { blockerId: runtime.lastTrafficBlock.blockingId, reason };
    }
    if (reason === 'reservation_entry') {
      const holder = runtime.entryHold?.conflict?.holder || runtime.stallOpponentId || null;
      if (holder) {
        return { blockerId: holder, reason, edgeKey: runtime.entryHold?.edgeKey || null };
      }
    }
    if (reason === 'reservation_wait' && runtime.route) {
      const entry = getRouteScheduleEntry(runtime.route, runtime.route.segmentIndex);
      const holder = entry?.conflict?.holder || runtime.stallOpponentId || null;
      if (holder) {
        return { blockerId: holder, reason, edgeKey: entry?.edgeGroupKey || entry?.edgeKey || null };
      }
    }
    if (reason === 'critical_section_wait' && runtime.route) {
      const entry = getRouteScheduleEntry(runtime.route, runtime.route.segmentIndex);
      const holder = runtime.stallOpponentId || null;
      if (holder) {
        return {
          blockerId: holder,
          reason,
          sectionId: entry?.criticalSectionId || null
        };
      }
    }
    if (runtime.lastTrafficBlock?.blockingId) {
      return { blockerId: runtime.lastTrafficBlock.blockingId, reason: runtime.lastTrafficBlock.reason || 'traffic' };
    }
    if (runtime.stallOpponentId) {
      return { blockerId: runtime.stallOpponentId, reason: reason || 'blocked' };
    }
    if (isRuntimeWaitingOnReservation(runtime, now)) {
      const entry = runtime.route ? getRouteScheduleEntry(runtime.route, runtime.route.segmentIndex) : null;
      const holder = runtime.entryHold?.conflict?.holder || entry?.conflict?.holder || null;
      if (holder) {
        return { blockerId: holder, reason: 'reservation_wait', edgeKey: entry?.edgeGroupKey || entry?.edgeKey || null };
      }
    }
    return null;
  };

  const pickDeadlockVictim = (cycle, nowMs) => {
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    let victim = null;
    cycle.forEach((robotId) => {
      const robot = getRobotById(robotId);
      const runtime = getRobotRuntime(robotId);
      if (!robot || !runtime) return;
      const priority = getRobotPriority(robot);
      const waitSince = resolveRuntimeWaitSince(runtime) || runtime.lastTrafficBlock?.at || null;
      const waitAge = Number.isFinite(waitSince) ? now - waitSince : 0;
      if (!victim) {
        victim = { robotId, robot, runtime, priority, waitAge };
        return;
      }
      if (priority !== victim.priority) {
        if (priority < victim.priority) {
          victim = { robotId, robot, runtime, priority, waitAge };
        }
        return;
      }
      if (waitAge !== victim.waitAge) {
        if (waitAge > victim.waitAge) {
          victim = { robotId, robot, runtime, priority, waitAge };
        }
        return;
      }
      if (String(robotId).localeCompare(String(victim.robotId)) > 0) {
        victim = { robotId, robot, runtime, priority, waitAge };
      }
    });
    return victim;
  };

  const resolveWaitGraphDeadlocks = (nowMs) => {
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const waitEdges = new Map();
    const debugWaitGraph = Boolean(robotsConfig?.traffic?.debugWaitGraph);
    if (!debugWaitGraph) {
      waitGraphSnapshot = null;
    }
    robotRuntime.forEach((runtime, robotId) => {
      const robot = getRobotById(robotId);
      if (!robot || !runtime) return;
      if (runtime.paused || runtime.mode === 'manual' || runtime.phase === 'yield') return;
      if (runtime.stuckRetryAt || runtime.stuckSince) return;
      if (robot.blocked || robot.online === false) return;
      const blocker = resolveRuntimeBlocker(runtime, now);
      if (!blocker?.blockerId) return;
      if (!robotRuntime.has(blocker.blockerId)) return;
      waitEdges.set(robotId, blocker);
    });
    if (!waitEdges.size) {
      if (debugWaitGraph) {
        waitGraphSnapshot = { at: now, edges: [], cycles: [] };
      }
      return;
    }
    const edgesSnapshot = Array.from(waitEdges.entries()).map(([robotId, blocker]) => ({
      robotId,
      blockerId: blocker.blockerId || null,
      reason: blocker.reason || null,
      edgeKey: blocker.edgeKey || null,
      nodeId: blocker.nodeId || null,
      sectionId: blocker.sectionId || null
    }));
    const visited = new Set();
    const cycles = [];
    for (const start of waitEdges.keys()) {
      if (visited.has(start)) continue;
      const path = [];
      const indexById = new Map();
      let current = start;
      while (current && waitEdges.has(current)) {
        if (indexById.has(current)) {
          const startIdx = indexById.get(current);
          const cycle = path.slice(startIdx);
          if (cycle.length > 1) {
            cycles.push(cycle);
          }
          break;
        }
        if (visited.has(current)) break;
        indexById.set(current, path.length);
        path.push(current);
        current = waitEdges.get(current)?.blockerId || null;
      }
      path.forEach((id) => visited.add(id));
    }
    if (cycles.length) {
      recordMetricCount('deadlockWarnings', cycles.length);
    }
    if (debugWaitGraph || cycles.length) {
      waitGraphSnapshot = {
        at: now,
        edges: edgesSnapshot,
        cycles: cycles.map((cycle) => cycle.slice(0, 12))
      };
    }
    cycles.forEach((cycle) => {
      const minWaitAge = cycle.reduce((min, robotId) => {
        const runtime = getRobotRuntime(robotId);
        const since = resolveRuntimeWaitSince(runtime) || runtime?.lastTrafficBlock?.at || null;
        const age = Number.isFinite(since) ? now - since : 0;
        return min == null ? age : Math.min(min, age);
      }, null);
      if (minWaitAge != null && minWaitAge < DEADLOCK_TIMEOUT_MS) {
        return;
      }
      const victim = pickDeadlockVictim(cycle, now);
      if (!victim?.runtime || !victim.robot) return;
      if (
        victim.runtime.deadlockResolvedAt &&
        now - victim.runtime.deadlockResolvedAt < DEADLOCK_RESOLVE_COOLDOWN_MS
      ) {
        return;
      }
      victim.runtime.deadlockResolvedAt = now;
      victim.runtime.deadlockInfo = {
        at: now,
        cycle: cycle.slice(0, 12),
        resolvedBy: null
      };
      let resolved = false;
      if (!victim.runtime.paused && victim.runtime.mode !== 'manual' && victim.robot.online !== false) {
        resolved = triggerYield(victim.robot, victim.runtime);
        if (resolved) {
          victim.runtime.deadlockInfo.resolvedBy = 'yield';
        } else if (victim.runtime.routeGoal?.pos) {
          setRuntimeRoute(
            victim.runtime,
            victim.robot,
            victim.runtime.routeGoal.pos,
            victim.runtime.routeGoal.nodeId,
            { replanReason: 'deadlock', countReplan: true }
          );
          resolved = Boolean(victim.runtime.route);
          victim.runtime.deadlockInfo.resolvedBy = resolved ? 'replan' : null;
        }
      }
      if (!resolved) {
        enterStuckState(victim.robot, victim.runtime, 'deadlock');
        victim.runtime.deadlockInfo.resolvedBy = 'stuck';
      }
    });
  };

  const buildEdgeConflictGroups = () => {
    if (!navGraph?.edgesByKey?.size) return new Map();
    const byGroup = new Map();
    navGraph.edgesByKey.forEach((edge) => {
      if (!edge?.startId || !edge?.endId || !edge?.polyline) return;
      const groupKey = edge.edgeBaseGroupKey || edge.edgeGroupKey || makeEdgeGroupKey(edge.startId, edge.endId);
      if (!groupKey) return;
      if (!byGroup.has(groupKey)) {
        byGroup.set(groupKey, {
          key: groupKey,
          nodes: new Set([edge.startId, edge.endId]),
          polylines: [edge.polyline]
        });
        return;
      }
      const group = byGroup.get(groupKey);
      group.nodes.add(edge.startId);
      group.nodes.add(edge.endId);
      group.polylines.push(edge.polyline);
    });
    const entries = Array.from(byGroup.values());
    const groups = new Map();
    for (let i = 0; i < entries.length; i += 1) {
      const left = entries[i];
      for (let j = i + 1; j < entries.length; j += 1) {
        const right = entries[j];
        let sharedNode = false;
        for (const nodeId of left.nodes) {
          if (right.nodes.has(nodeId)) {
            sharedNode = true;
            break;
          }
        }
        if (sharedNode) continue;
        let conflict = false;
        for (const polyA of left.polylines) {
          if (conflict) break;
          for (const polyB of right.polylines) {
            if (polylinesConflict(polyA, polyB, edgeConflictThresholds)) {
              conflict = true;
              break;
            }
          }
        }
        if (!conflict) continue;
        if (!groups.has(left.key)) groups.set(left.key, new Set());
        if (!groups.has(right.key)) groups.set(right.key, new Set());
        groups.get(left.key).add(right.key);
        groups.get(right.key).add(left.key);
      }
    }
    return groups;
  };

  const buildCriticalSectionIndex = (graph, profile) => {
    const config = profile?.criticalSections || {};
    const enabled = config.enabled === true;
    const mode = String(config.mode || 'ORDERING').toUpperCase();
    const maxRobotsPerSection = Number.isFinite(config.maxRobotsPerSection)
      ? Math.max(1, Math.floor(config.maxRobotsPerSection))
      : 1;
    const slackMultiplier = Number.isFinite(config.slackMultiplier)
      ? config.slackMultiplier
      : 1;
    const index = {
      enabled,
      mode,
      maxRobotsPerSection,
      slackMultiplier,
      sections: new Map(),
      edgeToSections: new Map(),
      nodeToSections: new Map(),
      orderById: new Map()
    };
    if (!enabled || !graph) return index;

    const ensureSection = (id, overrides = {}, orderIndex = 0) => {
      if (!id) return null;
      let entry = index.sections.get(id);
      if (!entry) {
        entry = {
          id,
          order: Number.isFinite(overrides.order) ? overrides.order : orderIndex,
          maxRobots: Number.isFinite(overrides.maxRobots)
            ? Math.max(1, Math.floor(overrides.maxRobots))
            : maxRobotsPerSection,
          edges: new Set(),
          nodes: new Set()
        };
        index.sections.set(id, entry);
      } else {
        if (Number.isFinite(overrides.order)) {
          entry.order = overrides.order;
        }
        if (Number.isFinite(overrides.maxRobots)) {
          entry.maxRobots = Math.max(1, Math.floor(overrides.maxRobots));
        }
      }
      return entry;
    };

    const addEdgeMapping = (id, key) => {
      if (!id || !key) return;
      const entry = ensureSection(id);
      if (entry) entry.edges.add(key);
      const set = index.edgeToSections.get(key) || new Set();
      set.add(id);
      index.edgeToSections.set(key, set);
    };

    const addNodeMapping = (id, nodeId) => {
      if (!id || !nodeId) return;
      const entry = ensureSection(id);
      if (entry) entry.nodes.add(nodeId);
      const set = index.nodeToSections.get(nodeId) || new Set();
      set.add(id);
      index.nodeToSections.set(nodeId, set);
    };

    const sections = Array.isArray(config.sections) ? config.sections : [];
    sections.forEach((section, idx) => {
      if (!section) return;
      const id = section.id || section.key || section.sectionId || null;
      if (!id) return;
      const order = Number.isFinite(section.order) ? section.order : idx;
      const maxRobots = Number.isFinite(section.maxRobots)
        ? section.maxRobots
        : Number.isFinite(section.maxRobotsPerSection)
          ? section.maxRobotsPerSection
          : null;
      ensureSection(id, { order, maxRobots }, idx);
      const edgeKeys = []
        .concat(section.edgeKeys || [])
        .concat(section.edgeGroupKeys || [])
        .concat(section.edgeBaseGroupKeys || []);
      edgeKeys.forEach((key) => addEdgeMapping(id, key));
      const nodeIds = []
        .concat(section.nodeIds || [])
        .concat(section.nodes || []);
      nodeIds.forEach((nodeId) => addNodeMapping(id, nodeId));
    });

    (graph.edges || []).forEach((edge) => {
      const id =
        edge?.props?.criticalSectionId ||
        edge?.props?.criticalSection ||
        edge?.props?.sectionId ||
        edge?.props?.section ||
        null;
      if (!id || !edge.start || !edge.end) return;
      const groupKey = makeEdgeGroupKey(edge.start, edge.end);
      addEdgeMapping(id, groupKey);
    });

    (graph.nodes || []).forEach((node) => {
      const id =
        node?.props?.criticalSectionId ||
        node?.props?.criticalSection ||
        node?.props?.sectionId ||
        node?.props?.section ||
        null;
      if (!id || !node.id) return;
      addNodeMapping(id, node.id);
    });

    let orderIndex = 0;
    index.sections.forEach((entry) => {
      const order = Number.isFinite(entry.order) ? entry.order : orderIndex;
      index.orderById.set(entry.id, order);
      orderIndex += 1;
    });

    return index;
  };

  const resolveSegmentCriticalSectionId = (segment) => {
    if (!criticalSectionIndex?.enabled || !segment) return null;
    const ids = new Set();
    const addFromMap = (map, key) => {
      if (!key || !map) return;
      const set = map.get(key);
      if (!set) return;
      set.forEach((id) => ids.add(id));
    };
    addFromMap(criticalSectionIndex.edgeToSections, segment.edgeGroupKey);
    addFromMap(criticalSectionIndex.edgeToSections, segment.edgeBaseGroupKey);
    addFromMap(criticalSectionIndex.edgeToSections, segment.edgeKey);
    addFromMap(criticalSectionIndex.nodeToSections, segment.fromNodeId);
    addFromMap(criticalSectionIndex.nodeToSections, segment.toNodeId);
    if (!ids.size) return null;
    if (ids.size === 1) return ids.values().next().value || null;
    const orderById = criticalSectionIndex.orderById || new Map();
    return Array.from(ids.values()).sort((a, b) => (orderById.get(a) || 0) - (orderById.get(b) || 0))[0];
  };

  const buildCriticalSectionRanges = (segments = []) => {
    const ranges = [];
    let current = null;
    const mode = criticalSectionIndex?.mode || 'ORDERING';
    const orderById = criticalSectionIndex?.orderById || new Map();
    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      const sectionId = segment?.criticalSectionId || resolveSegmentCriticalSectionId(segment);
      if (!sectionId) {
        if (current) {
          ranges.push(current);
          current = null;
        }
        continue;
      }
      if (!current || current.id !== sectionId) {
        if (current) ranges.push(current);
        current = { id: sectionId, startIndex: i, endIndex: i };
      } else {
        current.endIndex = i;
      }
    }
    if (current) ranges.push(current);

    let ordered = true;
    if (mode === 'ORDERING' && ranges.length > 1) {
      let lastOrder = Number.NEGATIVE_INFINITY;
      for (const range of ranges) {
        const order = orderById.has(range.id) ? orderById.get(range.id) : lastOrder;
        if (order < lastOrder) {
          ordered = false;
          break;
        }
        lastOrder = order;
      }
    }

    return { ranges, ordered };
  };

  const resolveCriticalSectionCapacity = (sectionId) => {
    if (!criticalSectionIndex?.enabled || !sectionId) {
      return 1;
    }
    const entry = criticalSectionIndex.sections.get(sectionId);
    if (Number.isFinite(entry?.maxRobots)) {
      return Math.max(1, Math.floor(entry.maxRobots));
    }
    return Math.max(1, criticalSectionIndex.maxRobotsPerSection || 1);
  };

  const findCriticalSectionHolder = (sectionId, nowMs, robotId) => {
    if (!criticalSectionTable || !sectionId) return null;
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const entries = criticalSectionTable.sections.get(sectionId) || [];
    for (const entry of entries) {
      if (!entry) continue;
      if (robotId && entry.robotId === robotId) continue;
      if (now >= entry.start && now <= entry.end) {
        return entry.robotId || null;
      }
    }
    return null;
  };

  const computeCriticalSectionWindowMs = (route, range, robot, startIndex, startProgress) => {
    if (!route?.segments?.length || !range) return 0;
    let total = 0;
    for (let i = range.startIndex; i <= range.endIndex; i += 1) {
      const segment = route.segments[i];
      if (!segment?.totalLength) continue;
      const progress = i === startIndex ? startProgress : 0;
      const remaining = Math.max(0, segment.totalLength - progress);
      if (remaining <= ROUTE_PROGRESS_EPS) continue;
      const turnDelayMs =
        i > range.startIndex
          ? computeTurnDelayMsForSegments(route.segments[i - 1], segment, robot)
          : 0;
      const timing = resolveSegmentTiming(segment, robot, {
        length: remaining,
        turnMs: turnDelayMs
      });
      const slackMs = i === startIndex ? 0 : timing.slackMs;
      total += Math.max(0, timing.expectedMs + slackMs + timing.turnMs);
    }
    return total;
  };

  const findNearestNavNode = (pos) => {
    if (!navGraph || !pos) return null;
    let best = null;
    let bestDist = Infinity;
    for (const node of navGraph.nodesById.values()) {
      const dx = node.pos.x - pos.x;
      const dy = node.pos.y - pos.y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = node;
      }
    }
    return best;
  };

  const findNearestEdge = (pos) => {
    if (!navGraph || !pos || !Array.isArray(navGraph.edges)) return null;
    let best = null;
    for (const edge of navGraph.edges) {
      if (!edge?.polyline) continue;
      const projection = projectPointToPolyline(pos, edge.polyline);
      if (!projection.point) continue;
      if (!best || projection.dist < best.dist) {
        best = { edge, projection, dist: projection.dist };
      }
    }
    return best;
  };

  const addReservation = (map, key, reservation) => {
    if (!key || !reservation) return;
    const list = map.get(key) || [];
    list.push(reservation);
    list.sort((a, b) => a.startTime - b.startTime);
    map.set(key, list);
  };

  const findReservationOverlap = (list, startTime, endTime) => {
    if (!Array.isArray(list)) return null;
    for (const entry of list) {
      if (!entry) continue;
      if (endTime <= entry.startTime || startTime >= entry.endTime) continue;
      return entry;
    }
    return null;
  };

  const createConstraintTable = (base) => {
    if (!base || (!base.edges && !base.nodes)) {
      return { edges: new Map(), nodes: new Map() };
    }
    const edges = new Map();
    const nodes = new Map();
    if (base.edges) {
      base.edges.forEach((list, key) => {
        edges.set(
          key,
          Array.isArray(list) ? list.map((entry) => ({ ...entry })) : []
        );
      });
    }
    if (base.nodes) {
      base.nodes.forEach((list, key) => {
        nodes.set(
          key,
          Array.isArray(list) ? list.map((entry) => ({ ...entry })) : []
        );
      });
    }
    return { edges, nodes };
  };

  const addConstraint = (table, kind, key, constraint) => {
    if (!table || !kind || !key || !constraint) return;
    if (kind === 'edge') {
      addReservation(table.edges, key, constraint);
      return;
    }
    if (kind === 'node') {
      addReservation(table.nodes, key, constraint);
    }
  };

  const pruneConstraints = (table, nowMs) => {
    if (!table) return table;
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    ['edges', 'nodes'].forEach((group) => {
      const map = table[group];
      if (!map) return;
      map.forEach((list, key) => {
        const next = (list || []).filter((entry) => entry && entry.endTime > now);
        if (next.length) {
          map.set(key, next);
        } else {
          map.delete(key);
        }
      });
    });
    return table;
  };

  const estimateTravelMs = (length, robot) => {
    if (!Number.isFinite(length) || length <= 0) return 0;
    const profile = getRobotMotionProfile(robot);
    const speedMps = profile?.speedMps || robotSpeedMps;
    return (length / speedMps) * 1000;
  };

  // TimingModel: expected travel time + uncertainty -> dynamic slack.
  const resolveSegmentTiming = (segment, robot, options = {}) => {
    const length = Number.isFinite(options.length) ? options.length : segment?.totalLength || 0;
    const baseMs = estimateTravelMs(length, robot);
    const edgeKey =
      resolveTimeReservationEdgeKey(segment, robot) ||
      segment?.edgeGroupKey ||
      segment?.edgeKey ||
      null;
    const expectedMs = timingModel
      ? timingModel.getExpectedMs(edgeKey, robot?.id, baseMs)
      : baseMs;
    const uncertaintyMs = timingModel
      ? timingModel.getUncertaintyMs(edgeKey, robot?.id, expectedMs)
      : 0;
    const turnMs = Number.isFinite(options.turnMs) ? options.turnMs : 0;
    const slackMs = resolveScheduleSlackMs(robot, segment, {
      expectedMs,
      uncertaintyMs
    });
    const travelMs = Math.max(0, expectedMs + slackMs + turnMs);
    return { baseMs, expectedMs, uncertaintyMs, slackMs, turnMs, travelMs };
  };

  const computePenaltyMs = (prevId, nodeId, nextId, edge, nodePositions, baseMs, options = {}) => {
    let penalty = 0;
    if (edge?.driveBackward) {
      penalty += baseMs * ROUTE_PENALTY_FACTOR * 0.6;
    }
    if (!prevId) {
      return penalty;
    }
    if (options.skipAnglePenalty) {
      return penalty;
    }
    const prevPos = nodePositions.get(prevId);
    const currPos = nodePositions.get(nodeId);
    const nextPos = nodePositions.get(nextId);
    if (!prevPos || !currPos || !nextPos) {
      return penalty;
    }
    const v1x = currPos.x - prevPos.x;
    const v1y = currPos.y - prevPos.y;
    const v2x = nextPos.x - currPos.x;
    const v2y = nextPos.y - currPos.y;
    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);
    if (len1 === 0 || len2 === 0) {
      return penalty;
    }
    const dot = clamp((v1x * v2x + v1y * v2y) / (len1 * len2), -1, 1);
    const angle = Math.acos(dot);
    penalty += baseMs * ROUTE_PENALTY_FACTOR * (angle / Math.PI);
    return penalty;
  };

  const computeTurnDelayMsForNodes = (prevId, nodeId, nextId, nodePositions, robot) => {
    if (!prevId || !nodeId || !nextId) return 0;
    const prevPos = nodePositions.get(prevId);
    const currPos = nodePositions.get(nodeId);
    const nextPos = nodePositions.get(nextId);
    if (!prevPos || !currPos || !nextPos) return 0;
    const v1x = currPos.x - prevPos.x;
    const v1y = currPos.y - prevPos.y;
    const v2x = nextPos.x - currPos.x;
    const v2y = nextPos.y - currPos.y;
    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);
    if (len1 === 0 || len2 === 0) return 0;
    const dot = clamp((v1x * v2x + v1y * v2y) / (len1 * len2), -1, 1);
    const angle = Math.acos(dot);
    if (angle < ROUTE_HEADING_EPS) return 0;
    const profile = getRobotMotionProfile(robot);
    const turnRate = profile?.turnRateRadS || robotTurnRateRadS;
    if (!Number.isFinite(turnRate) || turnRate <= 1e-6) return 0;
    return (angle / turnRate) * 1000;
  };

  const computeTurnDelayMsForSegments = (prevSegment, nextSegment, robot) => {
    if (!prevSegment || !nextSegment) return 0;
    const prevHeading = getSegmentEndHeading(prevSegment);
    const nextHeading = getSegmentStartHeading(nextSegment);
    const diff = Math.abs(normalizeAngle(nextHeading - prevHeading));
    if (diff < ROUTE_HEADING_EPS) return 0;
    const profile = getRobotMotionProfile(robot);
    const turnRate = profile?.turnRateRadS || robotTurnRateRadS;
    if (!Number.isFinite(turnRate) || turnRate <= 1e-6) return 0;
    return (diff / turnRate) * 1000;
  };

  const buildReservationTable = (nowMs, excludeRobotId = null, options = {}) => {
    refreshAvoidanceLocks();
    const edges = new Map();
    const nodes = new Map();
    const excludeIds = new Set(
      Array.isArray(options.excludeRobotIds) ? options.excludeRobotIds : []
    );
    if (excludeRobotId) {
      excludeIds.add(excludeRobotId);
    }
    const planningPriority = Number.isFinite(options.planningPriority)
      ? options.planningPriority
      : null;
    const profile = getReservationProfile(null);
    const nodeDwellMs = profile?.nodeDwellMs || nodeReservationMs;
    const holdUntil = nowMs + reservationHoldMs;

    robots.forEach((robot) => {
      if (!robot?.pos) return;
      if (robot.online === false) return;
      if (excludeIds.has(robot.id)) return;
      const runtime = robotRuntime.get(robot.id);
      const robotPriority = getRobotPriority(robot);
      const ignoreRouteReservations =
        Number.isFinite(planningPriority) && robotPriority < planningPriority;
      if (ignoreRouteReservations) {
        return;
      }
      if (!runtime?.route || runtime.paused || robot.blocked) {
        const nearest = findNearestNavNode(robot.pos);
        const nodeDist = nearest?.pos ? distanceBetweenPoints(robot.pos, nearest.pos) : Infinity;
        const envelopeRadius = getRobotEnvelopeRadius(robot);
        if (nearest?.id) {
          addReservation(nodes, nearest.id, {
            robotId: robot.id,
            startTime: nowMs,
            endTime: holdUntil
          });
        }
        const edgeHit = findNearestEdge(robot.pos);
        if (edgeHit?.edge && Number.isFinite(edgeHit.dist)) {
          const edge = edgeHit.edge;
          const edgeLength = edge.totalLength || edge.polyline?.totalLength || 0;
          const offset = edgeHit.projection?.offset;
          const nearEndpoint =
            Number.isFinite(offset) &&
            edgeLength > 0 &&
            (offset <= ROUTE_SNAP_DISTANCE || edgeLength - offset <= ROUTE_SNAP_DISTANCE);
          const closeToEdge = edgeHit.dist <= Math.max(envelopeRadius, ROUTE_SNAP_DISTANCE);
          if (!nearEndpoint && closeToEdge && edgeHit.dist < nodeDist) {
            const primaryEdgeKey =
              resolveTimeReservationEdgeKey(edge, robot) ||
              edge.edgeGroupKey ||
              edge.edgeKey ||
              null;
            const conflictKey =
              edge.edgeBaseGroupKey || edge.edgeGroupKey || primaryEdgeKey;
            const includeBaseKey =
              Boolean(primaryEdgeKey && conflictKey && primaryEdgeKey === conflictKey);
            const conflictKeys = collectEdgeConflictKeys(primaryEdgeKey, conflictKey, {
              includeBaseKey
            });
            conflictKeys.forEach((key) => {
              addReservation(edges, key, {
                robotId: robot.id,
                startTime: nowMs,
                endTime: holdUntil
              });
            });
          }
        }
        return;
      }

      let timeCursor = nowMs;
      const route = runtime.route;
      const startIndex = Math.max(0, route.segmentIndex || 0);
      const startProgress = Math.max(0, route.segmentProgress || 0);
      for (let i = startIndex; i < route.segments.length; i += 1) {
        const segment = route.segments[i];
        if (!segment?.totalLength) continue;
        const progress = i === startIndex ? startProgress : 0;
        const remaining = Math.max(0, segment.totalLength - progress);
        if (remaining <= ROUTE_PROGRESS_EPS) continue;
        const baseMs = estimateTravelMs(remaining, robot);
        if (baseMs <= 0) continue;
        const travelMs = baseMs + reservationMarginMs;
        const startTime = timeCursor;
        const endTime = startTime + travelMs;
        const primaryEdgeKey =
          resolveTimeReservationEdgeKey(segment, robot) ||
          segment.edgeGroupKey ||
          segment.edgeKey ||
          null;
        const conflictKey =
          segment.edgeBaseGroupKey || segment.edgeGroupKey || primaryEdgeKey;
        const includeBaseKey =
          Boolean(primaryEdgeKey && conflictKey && primaryEdgeKey === conflictKey);
        const conflictKeys = collectEdgeConflictKeys(primaryEdgeKey, conflictKey, {
          includeBaseKey
        });
        conflictKeys.forEach((key) => {
          addReservation(edges, key, {
            robotId: robot.id,
            startTime,
            endTime
          });
        });
        if (segment.toNodeId && !String(segment.toNodeId).startsWith("__")) {
          const nodeBuffer = getNodeReservationBufferMs(robot, segment);
          const nodeStart = endTime - (nodeBuffer?.approachMs || 0);
          const nodeEnd = endTime + nodeDwellMs + (nodeBuffer?.clearMs || 0);
          addReservation(nodes, segment.toNodeId, {
            robotId: robot.id,
            startTime: nodeStart,
            endTime: nodeEnd
          });
        }
        timeCursor = endTime;
      }
    });

    return { edges, nodes, nodeDwellMs };
  };

  const seedStaticTimeReservations = (nowMs, profileOverride) => {
    if (!trafficStrategy?.useTimeReservations?.()) return;
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const profile = profileOverride || getReservationProfile(null);
    const table = ensureReservationTable(profile);
    if (!profile || !table) return;
    const holdMs = reservationHoldMs;
    const holdUntil = now + holdMs;

    robots.forEach((robot) => {
      if (!robot?.pos) return;
      if (robot.online === false) return;
      const runtime = robotRuntime.get(robot.id);
      const hasRoute = Boolean(runtime?.route);
      const isPaused = Boolean(runtime?.paused);
      const isBlocked = Boolean(robot.blocked || runtime?.blockedReason);
      if (hasRoute && !isPaused && !isBlocked) return;

      table.releaseRobot(robot.id);

      const nearest = findNearestNavNode(robot.pos);
      const nodeDist = nearest?.pos ? distanceBetweenPoints(robot.pos, nearest.pos) : Infinity;
      const envelopeRadius = getRobotEnvelopeRadius(robot);
      if (nearest?.id) {
        const result = table.reserveNode(nearest.id, robot.id, now, holdMs);
        if (!result.ok) {
          forceReserveNode(table, nearest.id, robot.id, now, holdMs);
        }
      }
      const edgeHit = findNearestEdge(robot.pos);
      if (edgeHit?.edge && Number.isFinite(edgeHit.dist)) {
        const edge = edgeHit.edge;
        const edgeLength = edge.totalLength || edge.polyline?.totalLength || 0;
        const offset = edgeHit.projection?.offset;
        const nearEndpoint =
          Number.isFinite(offset) &&
          edgeLength > 0 &&
          (offset <= ROUTE_SNAP_DISTANCE || edgeLength - offset <= ROUTE_SNAP_DISTANCE);
        const closeToEdge = edgeHit.dist <= Math.max(envelopeRadius, ROUTE_SNAP_DISTANCE);
        if (!nearEndpoint && closeToEdge && edgeHit.dist < nodeDist) {
          const primaryEdgeKey =
            resolveTimeReservationEdgeKey(edge, robot) ||
            edge.edgeGroupKey ||
            edge.edgeKey ||
            null;
          const conflictKey = edge.edgeBaseGroupKey || edge.edgeGroupKey || primaryEdgeKey;
          const includeBaseKey =
            Boolean(primaryEdgeKey && conflictKey && primaryEdgeKey === conflictKey);
          const conflictKeys = collectEdgeConflictKeys(primaryEdgeKey, conflictKey, {
            includeBaseKey
          });
          conflictKeys.forEach((key) => {
            if (!key) return;
            const result = table.reserveEdge(key, robot.id, now, holdUntil);
            if (!result.ok) {
              forceReserveEdge(table, key, robot.id, now, holdUntil);
            }
          });
        }
      }
    });
  };

  const isEdgeBlocked = (edge, options = {}) => {
    if (!edge?.polyline?.points?.length) return false;
    if (isAvoidanceLocked(edge, options.robotId)) return true;
    if (!obstacles.length) return false;
    const corridorWidth = Number(edge?.width);
    const robotWidth = Number(options?.robotWidth);
    const minWidth = Number.isFinite(robotWidth) ? robotWidth + OBSTACLE_CLEARANCE * 2 : 0;
    const allowAvoid = Number.isFinite(corridorWidth) && corridorWidth > minWidth;
    const points = edge.polyline.points;
    for (const obstacle of obstacles) {
      if (!obstacle) continue;
      if (obstacle.mode !== 'block' && allowAvoid) continue;
      const radius = obstacle.radius + OBSTACLE_CLEARANCE;
      for (let i = 0; i < points.length - 1; i += 1) {
        const a = points[i];
        const b = points[i + 1];
        const dist = distancePointToSegmentCoords(obstacle.x, obstacle.y, a.x, a.y, b.x, b.y);
        if (dist <= radius) {
          return true;
        }
      }
    }
    return false;
  };

  const findEarliestSlot = (
    edgeKeys,
    nodeId,
    startTime,
    travelMs,
    reservations,
    constraints,
    nodeBuffer
  ) => {
    if (!Scheduler?.findEarliestSlot) {
      return { startTime, arrivalTime: startTime + travelMs, conflict: null };
    }
    return Scheduler.findEarliestSlot(buildSchedulerContext(), {
      edgeKeys,
      nodeId,
      startTime,
      travelMs,
      reservations,
      constraints,
      nodeBuffer
    });
  };

  const buildAnchorGraph = (startPos, targetPos, targetNodeId) => {
    if (!navGraph) return null;
    const adjacency = new Map();
    navGraph.adjacency.forEach((edges, nodeId) => {
      adjacency.set(nodeId, edges.map((edge) => ({ ...edge })));
    });
    const edgeOverrides = new Map();
    const nodePositions = new Map();
    navGraph.nodesById.forEach((node, nodeId) => {
      nodePositions.set(nodeId, node.pos);
    });

    const createEdgeAnchor = (pos, role, edgeHit) => {
      if (!edgeHit?.edge || !edgeHit?.projection?.point) return null;
      const edge = edgeHit.edge;
      const projection = edgeHit.projection;
      const anchorId = role === 'goal' ? '__goal' : '__start';
      const edgeBaseGroupKey =
        edge.edgeBaseGroupKey ||
        edge.edgeGroupKey ||
        makeEdgeGroupKey(edge.startId, edge.endId);
      const edgeGroupKey = edge.edgeGroupKey || edgeBaseGroupKey;
      const edgeWidth = Number.isFinite(edge.width) ? edge.width : 0;
      const anchor = {
        type: 'virtual',
        id: anchorId,
        pos: projection.point,
        connections: []
      };
      if (role === 'start') {
        const forwardSlice = slicePolyline(edge.polyline, projection.offset, edge.totalLength);
        if (forwardSlice.totalLength > ROUTE_PROGRESS_EPS) {
          anchor.connections.push({
            edgeKey: `${anchorId}->${edge.endId}`,
            startId: anchorId,
            endId: edge.endId,
            edgeGroupKey,
            edgeBaseGroupKey,
            polyline: forwardSlice,
            totalLength: forwardSlice.totalLength,
            driveBackward: edge.driveBackward,
            width: edgeWidth
          });
        }
        const reverseEdge = navGraph.edgesByKey.get(`${edge.endId}->${edge.startId}`);
        if (reverseEdge) {
          const offsetReverse = clamp(
            reverseEdge.totalLength - projection.offset,
            0,
            reverseEdge.totalLength
          );
          const reverseSlice = slicePolyline(
            reverseEdge.polyline,
            offsetReverse,
            reverseEdge.totalLength
          );
          if (reverseSlice.totalLength > ROUTE_PROGRESS_EPS) {
            const reverseGroupKey = reverseEdge.edgeGroupKey || edgeGroupKey;
            const reverseBaseGroupKey = reverseEdge.edgeBaseGroupKey || edgeBaseGroupKey;
            const reverseWidth = Number.isFinite(reverseEdge.width) ? reverseEdge.width : edgeWidth;
            anchor.connections.push({
              edgeKey: `${anchorId}->${reverseEdge.endId}`,
              startId: anchorId,
              endId: reverseEdge.endId,
              edgeGroupKey: reverseGroupKey,
              edgeBaseGroupKey: reverseBaseGroupKey,
              polyline: reverseSlice,
              totalLength: reverseSlice.totalLength,
              driveBackward: reverseEdge.driveBackward,
              width: reverseWidth
            });
          }
        }
      } else {
        const forwardSlice = slicePolyline(edge.polyline, 0, projection.offset);
        if (forwardSlice.totalLength > ROUTE_PROGRESS_EPS) {
          anchor.connections.push({
            edgeKey: `${edge.startId}->${anchorId}`,
            startId: edge.startId,
            endId: anchorId,
            edgeGroupKey,
            edgeBaseGroupKey,
            polyline: forwardSlice,
            totalLength: forwardSlice.totalLength,
            driveBackward: edge.driveBackward,
            width: edgeWidth
          });
        }
        const reverseEdge = navGraph.edgesByKey.get(`${edge.endId}->${edge.startId}`);
        if (reverseEdge) {
          const offsetReverse = clamp(
            reverseEdge.totalLength - projection.offset,
            0,
            reverseEdge.totalLength
          );
          const reverseSlice = slicePolyline(reverseEdge.polyline, 0, offsetReverse);
          if (reverseSlice.totalLength > ROUTE_PROGRESS_EPS) {
            const reverseGroupKey = reverseEdge.edgeGroupKey || edgeGroupKey;
            const reverseBaseGroupKey = reverseEdge.edgeBaseGroupKey || edgeBaseGroupKey;
            const reverseWidth = Number.isFinite(reverseEdge.width) ? reverseEdge.width : edgeWidth;
            anchor.connections.push({
              edgeKey: `${reverseEdge.startId}->${anchorId}`,
              startId: reverseEdge.startId,
              endId: anchorId,
              edgeGroupKey: reverseGroupKey,
              edgeBaseGroupKey: reverseBaseGroupKey,
              polyline: reverseSlice,
              totalLength: reverseSlice.totalLength,
              driveBackward: reverseEdge.driveBackward,
              width: reverseWidth
            });
          }
        }
      }
      if (!anchor.connections.length) return null;
      return anchor;
    };

    const pickAnchor = (pos, role, forcedNode) => {
      if (forcedNode && navGraph.nodesById.has(forcedNode)) {
        const node = navGraph.nodesById.get(forcedNode);
        return { type: 'node', id: node.id, pos: node.pos };
      }
      const nodeHit = findNearestNavNode(pos);
      const nodeDist = nodeHit ? distanceBetweenPoints(pos, nodeHit.pos) : Number.POSITIVE_INFINITY;
      const edgeHit = findNearestEdge(pos);
      const edgeDist = edgeHit ? edgeHit.dist : Number.POSITIVE_INFINITY;
      if (edgeHit && edgeDist < nodeDist) {
        const edgeAnchor = createEdgeAnchor(pos, role, edgeHit);
        if (edgeAnchor) {
          return edgeAnchor;
        }
      }
      if (nodeHit) {
        return { type: 'node', id: nodeHit.id, pos: nodeHit.pos };
      }
      if (edgeHit) {
        return createEdgeAnchor(pos, role, edgeHit);
      }
      return null;
    };

    const startAnchor = pickAnchor(startPos, 'start', null);
    const goalAnchor = pickAnchor(targetPos, 'goal', targetNodeId);
    if (!startAnchor || !goalAnchor) return null;

    if (startAnchor.type === 'virtual') {
      adjacency.set(startAnchor.id, []);
      nodePositions.set(startAnchor.id, startAnchor.pos);
      startAnchor.connections.forEach((conn) => {
        adjacency.get(startAnchor.id).push({
          to: conn.endId,
          cost: conn.totalLength,
          edgeKey: conn.edgeKey
        });
        edgeOverrides.set(conn.edgeKey, {
          startId: conn.startId,
          endId: conn.endId,
          polyline: conn.polyline,
          totalLength: conn.totalLength,
          driveBackward: conn.driveBackward,
          edgeKey: conn.edgeKey,
          edgeGroupKey: conn.edgeGroupKey,
          edgeBaseGroupKey: conn.edgeBaseGroupKey || conn.edgeGroupKey,
          width: Number.isFinite(conn.width) ? conn.width : 0
        });
      });
    }

    if (goalAnchor.type === 'virtual') {
      nodePositions.set(goalAnchor.id, goalAnchor.pos);
      goalAnchor.connections.forEach((conn) => {
        const list = adjacency.get(conn.startId) || [];
        list.push({
          to: conn.endId,
          cost: conn.totalLength,
          edgeKey: conn.edgeKey
        });
        adjacency.set(conn.startId, list);
        edgeOverrides.set(conn.edgeKey, {
          startId: conn.startId,
          endId: conn.endId,
          polyline: conn.polyline,
          totalLength: conn.totalLength,
          driveBackward: conn.driveBackward,
          edgeKey: conn.edgeKey,
          edgeGroupKey: conn.edgeGroupKey,
          edgeBaseGroupKey: conn.edgeBaseGroupKey || conn.edgeGroupKey,
          width: Number.isFinite(conn.width) ? conn.width : 0
        });
      });
    }

    return {
      adjacency,
      edgeOverrides,
      nodePositions,
      startId: startAnchor.type === 'node' ? startAnchor.id : startAnchor.id,
      goalId: goalAnchor.type === 'node' ? goalAnchor.id : goalAnchor.id,
      startAnchor,
      goalAnchor
    };
  };

  const findTimeAwarePath = (startId, goalId, options) => {
    const {
      adjacency,
      edgeOverrides,
      nodePositions,
      reservations,
      nowMs,
      robotId,
      robotWidth,
      robot,
      constraints
    } = options;
    if (!startId || !goalId) return null;
    if (startId === goalId) {
      return { pathNodes: [startId], edgeKeys: [] };
    }
    const planningRobot = robot || (robotId ? getRobotById(robotId) : null);
    const noTurnaround = Boolean(options?.noTurnaround);
    const heuristicWeight = Number.isFinite(options?.heuristicWeight)
      ? Math.max(1, Number(options.heuristicWeight))
      : 1;
    const includeTurnDelay = Boolean(options?.includeTurnDelay);
    const goalPos = nodePositions.get(goalId);
    const heuristic = (nodeId) => {
      const pos = nodePositions.get(nodeId);
      if (!pos || !goalPos) return 0;
      const dist = Math.hypot(goalPos.x - pos.x, goalPos.y - pos.y);
      return estimateTravelMs(dist, planningRobot);
    };
    const stateKey = (nodeId, prevId) => `${nodeId}::${prevId || ''}`;
    const parseStateKey = (key) => {
      const [nodeId, prevId] = String(key).split('::');
      return { nodeId, prevId: prevId || null };
    };
    const open = new MinHeap((a, b) => a.f - b.f);
    const startKey = stateKey(startId, null);
    const bestCost = new Map();
    const cameFrom = new Map();
    open.push({
      nodeId: startId,
      prevId: null,
      arrivalTime: nowMs,
      cost: nowMs,
      f: nowMs + heuristicWeight * heuristic(startId)
    });
    bestCost.set(startKey, nowMs);

    let expansions = 0;
    const maxExpansions = Math.min(200000, Math.max(8000, (adjacency.size || 1) * 40));

    while (open.size) {
      const current = open.pop();
      if (!current) break;
      const currentKey = stateKey(current.nodeId, current.prevId);
      const knownCost = bestCost.get(currentKey);
      if (knownCost !== undefined && current.cost > knownCost) {
        continue;
      }
      if (current.nodeId === goalId) {
        const pathNodes = [];
        const edgeKeys = [];
        let cursorKey = currentKey;
        while (cursorKey) {
          const parsed = parseStateKey(cursorKey);
          pathNodes.unshift(parsed.nodeId);
          const link = cameFrom.get(cursorKey);
          if (link?.edgeKey) {
            edgeKeys.unshift(link.edgeKey);
          }
          cursorKey = link?.prevKey || null;
        }
        return { pathNodes, edgeKeys, expansions };
      }
      expansions += 1;
      if (expansions > maxExpansions) break;
      const neighbors = adjacency.get(current.nodeId) || [];
      for (const step of neighbors) {
        if (noTurnaround && current.prevId && step.to === current.prevId) {
          continue;
        }
        const edge =
          edgeOverrides.get(step.edgeKey) || (navGraph ? navGraph.edgesByKey.get(step.edgeKey) : null);
        if (!edge) continue;
        if (isEdgeBlocked(edge, { robotId, robotWidth })) continue;
        const turnDelayMs = includeTurnDelay
          ? computeTurnDelayMsForNodes(
              current.prevId,
              current.nodeId,
              step.to,
              nodePositions,
              planningRobot
            )
          : 0;
        const timing = resolveSegmentTiming(edge, planningRobot, {
          length: edge.totalLength,
          turnMs: turnDelayMs
        });
        const travelMs = timing.travelMs;
        if (travelMs <= 0) continue;
        const primaryEdgeKey =
          resolveTimeReservationEdgeKey(edge, planningRobot) ||
          edge.edgeGroupKey ||
          edge.edgeKey;
        const conflictKey = edge.edgeBaseGroupKey || primaryEdgeKey;
        const includeBaseKey =
          Boolean(primaryEdgeKey && conflictKey && primaryEdgeKey === conflictKey) ||
          Boolean(constraints?.edges?.has(conflictKey));
        const edgeKeys = collectEdgeConflictKeys(primaryEdgeKey, conflictKey, { includeBaseKey });
        const nodeBuffer = getNodeReservationBufferMs(planningRobot, edge);
        const slot = findEarliestSlot(
          edgeKeys,
          step.to,
          current.arrivalTime,
          travelMs,
          reservations,
          constraints,
          nodeBuffer
        );
        const arrivalTime = slot.arrivalTime;
        const penaltyMs = computePenaltyMs(
          current.prevId,
          current.nodeId,
          step.to,
          edge,
          nodePositions,
          timing.baseMs,
          { skipAnglePenalty: includeTurnDelay }
        );
        const cost = arrivalTime + penaltyMs;
        const nextKey = stateKey(step.to, current.nodeId);
        const best = bestCost.get(nextKey);
        if (best === undefined || cost < best) {
          bestCost.set(nextKey, cost);
          cameFrom.set(nextKey, { prevKey: currentKey, edgeKey: step.edgeKey });
          open.push({
            nodeId: step.to,
            prevId: current.nodeId,
            arrivalTime,
            cost,
            f: cost + heuristicWeight * heuristic(step.to)
          });
        }
      }
    }
    return null;
  };

  const buildSimpleSegment = (startPos, endPos) => {
    const polyline = buildPolyline([startPos, endPos]);
    return {
      polyline,
      totalLength: polyline.totalLength,
      driveBackward: false
    };
  };

  const buildRouteSchedule = (segments, reservations, startTime, robot, constraints) => {
    if (!Scheduler?.buildRouteSchedule) return [];
    return Scheduler.buildRouteSchedule(buildSchedulerContext(), {
      segments,
      reservations,
      startTime,
      robot,
      constraints
    });
  };

  const getSegmentEndHeading = (segment) => {
    if (!segment?.polyline?.headings?.length) return 0;
    const heading = segment.polyline.headings[segment.polyline.headings.length - 1] || 0;
    return segment.driveBackward ? normalizeAngle(heading + Math.PI) : heading;
  };

  const getSegmentStartHeading = (segment) => {
    if (!segment?.polyline?.headings?.length) return 0;
    const heading = segment.polyline.headings[0] || 0;
    return segment.driveBackward ? normalizeAngle(heading + Math.PI) : heading;
  };

  const getTurnInPlaceHeading = (segment, nextSegment) => {
    if (!segment || !nextSegment) return null;
    const currentHeading = getSegmentEndHeading(segment);
    const nextHeading = getSegmentStartHeading(nextSegment);
    const diff = Math.abs(normalizeAngle(nextHeading - currentHeading));
    if (diff < ROUTE_TURN_IN_PLACE_RAD) return null;
    return nextHeading;
  };

  const buildRoute = (startPos, targetPos, targetNodeId, options = {}) => {
    if (!navGraph || !startPos || !targetPos) return null;
    const planStart = Date.now();
    const nowMs = Number.isFinite(options.nowMs) ? options.nowMs : Date.now();
    const robot = options.robotId ? getRobotById(options.robotId) : null;
    const constraints = options.constraints || null;
    const planningPriority = robot ? getRobotPriority(robot) : null;
    const reservations = buildReservationTable(nowMs, options.robotId || null, {
      planningPriority,
      excludeRobotIds: options.excludeRobotIds
    });
    const robotWidth = robot ? getRobotWidth(robot) : null;
    const anchorGraph = buildAnchorGraph(startPos, targetPos, targetNodeId);
    if (!anchorGraph) return null;
    const noTurnaround = trafficStrategy?.allowTurnaround?.() === false;
    const plannerWeight = trafficStrategy?.getPlannerWeight?.(robot);
    const heuristicWeight = Number.isFinite(plannerWeight) ? Math.max(1, Number(plannerWeight)) : 1;
    const includeTurnDelay = useTurnTimeReservations();
    const pathResult = findTimeAwarePath(anchorGraph.startId, anchorGraph.goalId, {
      adjacency: anchorGraph.adjacency,
      edgeOverrides: anchorGraph.edgeOverrides,
      nodePositions: anchorGraph.nodePositions,
      reservations,
      nowMs,
      noTurnaround,
      robotId: options.robotId || null,
      robot,
      robotWidth,
      heuristicWeight,
      constraints,
      includeTurnDelay
    });
    const planMs = Date.now() - planStart;
    if (!pathResult) return null;

    const segments = [];
    const startAnchorPos = anchorGraph.startAnchor.pos;
    const goalAnchorPos = anchorGraph.goalAnchor.pos;
    const startDist = distanceBetweenPoints(startPos, startAnchorPos);
    if (Number.isFinite(startDist) && startDist > ROUTE_SNAP_DISTANCE) {
      segments.push({
        ...buildSimpleSegment(startPos, startAnchorPos),
        edgeGroupKey: null,
        edgeBaseGroupKey: null,
        width: 0,
        fromNodeId: null,
        toNodeId: anchorGraph.startId,
        criticalSectionId: null
      });
    }

    pathResult.edgeKeys.forEach((edgeKey) => {
      const edge =
        anchorGraph.edgeOverrides.get(edgeKey) || (navGraph ? navGraph.edgesByKey.get(edgeKey) : null);
      if (!edge) return;
      segments.push({
        polyline: edge.polyline,
        totalLength: edge.totalLength,
        driveBackward: edge.driveBackward,
        edgeKey: edge.edgeKey || edgeKey,
        edgeGroupKey: edge.edgeGroupKey || makeEdgeGroupKey(edge.startId, edge.endId),
        edgeBaseGroupKey:
          edge.edgeBaseGroupKey ||
          edge.edgeGroupKey ||
          makeEdgeGroupKey(edge.startId, edge.endId),
        width: Number.isFinite(edge.width) ? edge.width : 0,
        fromNodeId: edge.startId,
        toNodeId: edge.endId,
        criticalSectionId: edge.criticalSectionId || null
      });
    });

    const endDist = distanceBetweenPoints(goalAnchorPos, targetPos);
    if (Number.isFinite(endDist) && endDist > ROBOT_ARRIVAL_DISTANCE) {
      segments.push({
        ...buildSimpleSegment(goalAnchorPos, targetPos),
        edgeGroupKey: null,
        edgeBaseGroupKey: null,
        width: 0,
        fromNodeId: anchorGraph.goalId,
        toNodeId: null,
        criticalSectionId: null
      });
    }

    const schedule = buildRouteSchedule(segments, reservations, nowMs, robot, constraints);
    const finalHeading = segments.length ? getSegmentEndHeading(segments[segments.length - 1]) : 0;
    const targetHeading = Number.isFinite(targetPos.angle) ? targetPos.angle : finalHeading;

    return {
      segments,
      segmentIndex: 0,
      segmentProgress: 0,
      pathNodes: pathResult.pathNodes,
      schedule,
      plannedAt: nowMs,
      plannerStats: {
        planMs,
        expansions: pathResult.expansions
      },
      finalTarget: { pos: { ...targetPos }, heading: targetHeading }
    };
  };

  const computeRouteRemainingLength = (route) => {
    if (!route?.segments?.length) return 0;
    const startIndex = Math.max(0, route.segmentIndex || 0);
    const startProgress = Math.max(0, route.segmentProgress || 0);
    let total = 0;
    for (let i = startIndex; i < route.segments.length; i += 1) {
      const segment = route.segments[i];
      if (!segment?.totalLength) continue;
      if (i === startIndex) {
        total += Math.max(0, segment.totalLength - startProgress);
      } else {
        total += segment.totalLength;
      }
    }
    return total;
  };

  const refreshRouteSchedulesAfterRelease = (releasedRobotId, options = {}) => {
    const nowMs = Date.now();
    const skipReleased = releasedRobotId != null && options.includeReleased !== true;
    const skipPaused = options.includePaused !== true;
    if (trafficStrategy?.useTimeReservations?.()) {
      const forceRebuild = Boolean(options.forceFullRebuild);
      const shouldRebuild =
        forceRebuild ||
        nowMs - lastReservationRebuildAt >= RESERVATION_REFRESH_COOLDOWN_MS;
      if (shouldRebuild) {
        reservationTable = null;
        reservationConfig = null;
        lastReservationRebuildAt = nowMs;
      }
      robotRuntime.forEach((runtime, robotId) => {
        if (skipReleased && robotId === releasedRobotId) return;
        if (skipPaused && runtime?.paused) return;
        if (!runtime?.route) return;
        const robot = getRobotById(robotId);
        if (!robot) return;
        refreshRouteSchedule(robot, runtime, nowMs, { force: options.force });
      });
      return;
    }
    robotRuntime.forEach((runtime, robotId) => {
      if (skipReleased && robotId === releasedRobotId) return;
      if (skipPaused && runtime?.paused) return;
      if (!runtime?.route) return;
      const robot = getRobotById(robotId);
      const planningPriority = robot ? getRobotPriority(robot) : null;
      const reservations = buildReservationTable(nowMs, robotId, { planningPriority });
      runtime.route.schedule = buildRouteSchedule(
        runtime.route.segments,
        reservations,
        nowMs,
        robot
      );
      runtime.route.plannedAt = nowMs;
    });
  };

  const recoverRoutesAfterObstacleClear = () => {
    robotRuntime.forEach((runtime, robotId) => {
      if (!runtime?.route || !runtime.routeGoal?.pos) return;
      if (!runtime.replannedForObstacle) return;
      const robot = robots.find((item) => item.id === robotId);
      if (!robot?.pos) return;
      const currentRemaining = computeRouteRemainingLength(runtime.route);
      const baseConstraints = pruneConstraints(
        createConstraintTable(runtime.cbsConstraints),
        Date.now()
      );
      const nextRoute = buildRoute(robot.pos, runtime.routeGoal.pos, runtime.routeGoal.nodeId, {
        robotId,
        constraints: baseConstraints
      });
      if (!nextRoute) return;
      const nextRemaining = computeRouteRemainingLength(nextRoute);
      if (nextRemaining + ROUTE_PROGRESS_EPS < currentRemaining) {
        const previousEdgeGroupKey = getRuntimeEdgeGroupKey(runtime, robot);
        runtime.cbsConstraints = baseConstraints;
        if (runtime.routeGoal?.pos) {
          runtime.target = { ...runtime.routeGoal.pos };
        }
        runtime.avoidance = null;
        runtime.avoidanceHold = false;
        applyRuntimeRoute(robot, runtime, nextRoute, previousEdgeGroupKey);
        runtime.blockedObstacleId = null;
        runtime.replannedForObstacle = false;
      }
    });
  };

  const getRouteNavTarget = (route) => {
    if (!route || !route.segments || route.segmentIndex >= route.segments.length) return null;
    const segment = route.segments[route.segmentIndex];
    if (!segment) return null;
    const lookahead = Math.min(segment.totalLength, route.segmentProgress + ROUTE_LOOKAHEAD);
    const pose = polylineAtDistance(segment.polyline, lookahead);
    return {
      pos: { x: pose.x, y: pose.y },
      heading: pose.heading,
      driveBackward: segment.driveBackward,
      remaining: segment.totalLength - route.segmentProgress,
      segment
    };
  };

  const ensureSegmentTiming = (robot, runtime, segment, scheduleEntry, nowMs) => {
    if (!runtime || !segment) return null;
    const index = runtime.route?.segmentIndex ?? 0;
    if (!runtime.segmentTiming || runtime.segmentTiming.segmentIndex !== index) {
      runtime.segmentTiming = {
        segmentIndex: index,
        startedAt: Number.isFinite(nowMs) ? nowMs : Date.now(),
        plannedStart: Number.isFinite(scheduleEntry?.startTime) ? scheduleEntry.startTime : null,
        plannedArrival: Number.isFinite(scheduleEntry?.arrivalTime)
          ? scheduleEntry.arrivalTime
          : null,
        edgeKey:
          resolveTimeReservationEdgeKey(segment, robot) ||
          segment.edgeGroupKey ||
          segment.edgeKey ||
          null
      };
      if (chaosConfig?.enabled) {
        const chaosStart = runtime.segmentTiming.startedAt;
        const delayMs = sampleRangeMs(chaosConfig.segmentDelayMs, chaosConfig.rng);
        if (delayMs > 0) {
          runtime.segmentTiming.chaosHoldUntil = chaosStart + delayMs;
          runtime.segmentTiming.chaosHoldMs = delayMs;
        }
        const stopChance = Number.isFinite(chaosConfig.stopChance) ? chaosConfig.stopChance : 0;
        if (stopChance > 0 && chaosConfig.rng && chaosConfig.rng() < stopChance) {
          const stopMs = sampleRangeMs(chaosConfig.stopDurationMs, chaosConfig.rng);
          if (stopMs > 0) {
            const anchor = runtime.segmentTiming.chaosHoldUntil || chaosStart;
            runtime.segmentTiming.chaosStopUntil = anchor + stopMs;
            runtime.segmentTiming.chaosStopMs = stopMs;
          }
        }
      }
    }
    return runtime.segmentTiming;
  };

  const recordSegmentTiming = (robot, runtime, segment, scheduleEntry, nowMs) => {
    if (!robot || !runtime || !segment) return;
    const timing = runtime.segmentTiming;
    const startedAt = timing?.startedAt;
    const edgeKey =
      timing?.edgeKey ||
      resolveTimeReservationEdgeKey(segment, robot) ||
      segment.edgeGroupKey ||
      segment.edgeKey ||
      null;
    const actualTravelMs =
      Number.isFinite(startedAt) && Number.isFinite(nowMs) ? nowMs - startedAt : null;
    if (Number.isFinite(actualTravelMs) && actualTravelMs >= 0) {
      timingModel?.observeTravel(edgeKey, robot.id, actualTravelMs, nowMs);
    }
    if (scheduleEntry && Number.isFinite(scheduleEntry.arrivalTime)) {
      const slipMs = Number.isFinite(nowMs) ? nowMs - scheduleEntry.arrivalTime : 0;
      timingModel?.observeSlip(edgeKey, robot.id, slipMs, nowMs);
      const slackConfig = resolveScheduleSlackStatsConfig(robot);
      recordScheduleDelay(robot.id, slipMs, slackConfig, nowMs);
      recordMetricSample('slip', Math.max(0, slipMs));
    }
  };

  const advanceRouteProgress = (robot, runtime, deltaMs, navTarget) => {
    const route = runtime?.route;
    if (!navTarget || !route) return false;
    const segment = navTarget.segment;
    const dt = deltaMs / 1000;
    const nowMs = Date.now();
    let scheduleEntry = route?.schedule?.length
      ? getRouteScheduleEntry(route, route.segmentIndex)
      : null;
    ensureSegmentTiming(robot, runtime, segment, scheduleEntry, nowMs);
    if (chaosConfig?.enabled && runtime?.segmentTiming) {
      const chaosDelayUntil = runtime.segmentTiming.chaosHoldUntil;
      const chaosStopUntil = runtime.segmentTiming.chaosStopUntil;
      if (Number.isFinite(chaosDelayUntil) && nowMs < chaosDelayUntil) {
        markRuntimeStall(runtime, 'chaos_delay');
        ensureRobotMotion(robot);
        robot.speed = 0;
        return false;
      }
      if (Number.isFinite(chaosStopUntil) && nowMs < chaosStopUntil) {
        markRuntimeStall(runtime, 'chaos_stop');
        ensureRobotMotion(robot);
        robot.speed = 0;
        return false;
      }
    }
    const lockToRoute = !runtime?.avoidance;
    const ignoreTrafficBlocks = shouldIgnoreTrafficBlocks();
    const currentSegmentIndex = route.segmentIndex;
    if (runtime?.entryHoldBypass && runtime.entryHoldBypass.segmentIndex !== currentSegmentIndex) {
      runtime.entryHoldBypass = null;
    }
    const deterministicEdgeLocks = shouldUseDeterministicEdgeLocks();
    const allowEdgeLocksWithReservations =
      Boolean(trafficStrategy?.allowEdgeLocksWithReservations?.());
    const useEdgeLocks =
      lockToRoute &&
      !ignoreTrafficBlocks &&
      (!trafficStrategy?.useTimeReservations?.() ||
        !route.schedule?.length ||
        allowEdgeLocksWithReservations);
    const useEdgeQueues = useEdgeLocks && (deterministicEdgeLocks || trafficStrategy?.useEdgeQueues?.());
    const edgeGroupKey = useEdgeLocks ? resolveEdgeLockKey(segment, robot) : null;
    const segmentEdgeKey = segment?.edgeKey || segment?.edgeGroupKey || null;
    let queueTouched = false;
    const touchQueue = (groupKey, edgeKey) => {
      if (queueTouched) return;
      if (!useEdgeQueues) return;
      if (!groupKey || !robot?.id) return;
      touchEdgeQueue(groupKey, robot.id, edgeKey, nowMs, { allowMultiple: deterministicEdgeLocks });
      queueTouched = true;
    };
    if (
      lockToRoute &&
      segment?.polyline &&
      segment.totalLength - route.segmentProgress <= ROUTE_PROGRESS_EPS
    ) {
      const nextSegment = route.segments?.[route.segmentIndex + 1] || null;
      const turnHeading = getTurnInPlaceHeading(segment, nextSegment);
      if (Number.isFinite(turnHeading)) {
        const endPose = polylineAtDistance(segment.polyline, segment.totalLength);
        robot.pos = { x: endPose.x, y: endPose.y };
        ensureRobotMotion(robot);
        robot.speed = 0;
        const aligned = alignRobotHeading(robot, turnHeading, deltaMs);
        if (aligned) {
          route.segmentIndex += 1;
          route.segmentProgress = 0;
          return true;
        }
        return false;
      }
    }
    const desiredHeading = navTarget.driveBackward
      ? normalizeAngle(navTarget.heading + Math.PI)
      : navTarget.heading;
    if (trafficStrategy?.useAvoidanceLocks?.() && isAvoidanceLocked(navTarget.segment, robot?.id)) {
      runtime.avoidanceHold = true;
      markRuntimeStall(runtime, 'avoidance_hold');
      ensureRobotMotion(robot);
      robot.speed = 0;
      touchQueue(edgeGroupKey, segmentEdgeKey);
      return false;
    }
    if (runtime.avoidanceHold) {
      runtime.avoidanceHold = false;
    }
    const nodeLockHold = ignoreTrafficBlocks ? null : getNodeLockHold(robot, runtime, segment);
    if (runtime) {
      runtime.nodeLockHold = nodeLockHold;
    }
    if (nodeLockHold) {
      markRuntimeStall(runtime, 'node_lock', nodeLockHold.holderId);
      ensureRobotMotion(robot);
      robot.speed = 0;
      touchQueue(edgeGroupKey, segmentEdgeKey);
      return false;
    }
    let entryHold = null;
    let entryHoldRescheduled = false;
    let entryHoldLeaderId = null;
    let entryHoldEdgeKey = null;
    let entryHoldGroupKey = null;
    let reservationStepMs = null;
    if (trafficStrategy?.useTimeReservations?.()) {
      if (!route.schedule?.length) {
        refreshRouteSchedule(robot, runtime, nowMs);
      }
      scheduleEntry = scheduleEntry || getRouteScheduleEntry(route, route.segmentIndex);
      const now = nowMs;
      const profile = route.scheduleProfile || getReservationProfile(robot);
      const stepMs = profile?.stepMs || RESERVATION_DEFAULT_STEP_MS;
      reservationStepMs = stepMs;
      const earlyMs = Math.max(30, Math.floor(stepMs / 2));
      const lateMs = Math.max(stepMs, profile?.nodeDwellMs || RESERVATION_DEFAULT_NODE_DWELL_MS);
      const nearSegmentStart = Number.isFinite(route.segmentProgress)
        ? route.segmentProgress <= RESERVATION_ENTRY_START_EPS
        : true;
      const reservationWaitsEnabled = shouldEnforceReservationWaits();
      const isCurrentSingleLane = isSingleLaneSegment(segment, robot);
      const allowReservationSlip = !reservationWaitsEnabled || !isCurrentSingleLane;
      if (
        !reservationWaitsEnabled &&
        runtime?.stallReason &&
        (runtime.stallReason === 'reservation_wait' || runtime.stallReason === 'reservation_entry')
      ) {
        clearRuntimeStall(runtime);
      }
      const maybeRefreshSchedule = () => {
        const lastResyncAt = runtime?.scheduleResyncAt || 0;
        if (Number.isFinite(lastResyncAt) && now - lastResyncAt < RESERVATION_REFRESH_COOLDOWN_MS) {
          return null;
        }
        const refreshed = refreshRouteSchedule(robot, runtime, now, { force: true });
        if (refreshed) {
          runtime.scheduleResyncAt = now;
        }
        return refreshed;
      };
      const sectionId = segment?.criticalSectionId || scheduleEntry?.criticalSectionId || null;
      if (sectionId && criticalSectionIndex?.enabled) {
        let sectionStart = scheduleEntry?.criticalSectionStart;
        let sectionEnd = scheduleEntry?.criticalSectionEnd;
        if (!Number.isFinite(sectionStart) || !Number.isFinite(sectionEnd)) {
          if (nearSegmentStart) {
            maybeRefreshSchedule();
            scheduleEntry = getRouteScheduleEntry(route, route.segmentIndex);
            sectionStart = scheduleEntry?.criticalSectionStart;
            sectionEnd = scheduleEntry?.criticalSectionEnd;
          }
          if (!Number.isFinite(sectionStart) || !Number.isFinite(sectionEnd)) {
            const holderId = findCriticalSectionHolder(sectionId, now, robot?.id);
            markRuntimeStall(runtime, 'critical_section_wait', holderId);
            ensureRobotMotion(robot);
            robot.speed = 0;
            touchQueue(edgeGroupKey, segmentEdgeKey);
            return false;
          }
        }
        if (Number.isFinite(sectionStart) && nearSegmentStart && now + earlyMs < sectionStart) {
          const holderId = findCriticalSectionHolder(sectionId, now, robot?.id);
          markRuntimeStall(runtime, 'critical_section_wait', holderId);
          ensureRobotMotion(robot);
          robot.speed = 0;
          touchQueue(edgeGroupKey, segmentEdgeKey);
          return false;
        }
        if (Number.isFinite(sectionEnd) && now > sectionEnd + lateMs) {
          recordReservationViolation(
            runtime,
            now,
            buildReservationViolationDetail(robot, segment, scheduleEntry)
          );
          maybeRefreshSchedule();
          scheduleEntry = getRouteScheduleEntry(route, route.segmentIndex);
          sectionEnd = scheduleEntry?.criticalSectionEnd;
          if (!Number.isFinite(sectionEnd) || now > sectionEnd + lateMs) {
            const holderId = findCriticalSectionHolder(sectionId, now, robot?.id);
            markRuntimeStall(runtime, 'critical_section_wait', holderId);
            ensureRobotMotion(robot);
            robot.speed = 0;
            touchQueue(edgeGroupKey, segmentEdgeKey);
            return false;
          }
        }
      }
      if (
        runtime?.scheduleSlip &&
        (!scheduleEntry || now + earlyMs >= scheduleEntry.startTime)
      ) {
        runtime.scheduleSlip = null;
      }
      if (scheduleEntry && now + earlyMs < scheduleEntry.startTime) {
        if (nearSegmentStart) {
          let bypassReservationWait = allowReservationSlip;
          if (!bypassReservationWait) {
            const conflictHolder = scheduleEntry?.conflict?.holder || null;
            const entryEdgeKey = scheduleEntry?.edgeGroupKey || scheduleEntry?.edgeKey || null;
            const holderRuntime = conflictHolder ? getRobotRuntime(conflictHolder) : null;
            const holderEntryEdge = holderRuntime?.entryHold?.edgeKey || null;
            if (entryEdgeKey && holderEntryEdge && holderEntryEdge === entryEdgeKey) {
              bypassReservationWait = true;
            }
          }
          if (!bypassReservationWait) {
            if (runtime) runtime.entryHold = null;
            markRuntimeStall(
              runtime,
              'reservation_wait',
              scheduleEntry?.conflict?.holder || null
            );
            ensureRobotMotion(robot);
            robot.speed = 0;
            touchQueue(edgeGroupKey, segmentEdgeKey);
            return false;
          }
        }
        if (runtime) {
          runtime.scheduleSlip = {
            at: now,
            startTime: scheduleEntry.startTime,
            edgeKey: scheduleEntry.edgeGroupKey || scheduleEntry.edgeKey || null
          };
          runtime.scheduleResyncAfterSegment = true;
        }
      }
      const nextIndex = route.segmentIndex + 1;
      const nextSegment = route.segments?.[nextIndex] || null;
      const isNextSingleLane = nextSegment && isSingleLaneSegment(nextSegment, robot);
      const canHoldEntry = reservationWaitsEnabled && isNextSingleLane;
      const nextEdgeKey = nextSegment ? resolveEdgeLockKey(nextSegment, robot) : null;
      const hasEntryHoldWaiter =
        canHoldEntry && nextEdgeKey && countEntryHoldEdgeWaiters(nextEdgeKey) > 0;
      if (canHoldEntry) {
        let nextEntry = getRouteScheduleEntry(route, nextIndex);
        if (!nextEntry) {
          refreshRouteSchedule(robot, runtime, now);
          nextEntry = getRouteScheduleEntry(route, nextIndex);
        }
        if (nextEntry && Number.isFinite(nextEntry.startTime) && now + earlyMs < nextEntry.startTime) {
          const entryBuffer = getReservationEntryBuffer(robot, nextSegment);
          if (entryBuffer > ROUTE_PROGRESS_EPS) {
            entryHold = {
              startTime: nextEntry.startTime,
              edgeKey: nextEntry.edgeGroupKey || nextEntry.edgeKey || null,
              conflict: nextEntry.conflict || null,
              buffer: entryBuffer
            };
            entryHoldEdgeKey = entryHold.edgeKey || null;
            entryHoldGroupKey = resolveEdgeLockKey(nextSegment, robot);
          }
        }
      }
      if (entryHold && segment?.polyline) {
        const stopAt = Math.max(0, segment.totalLength - entryHold.buffer);
        if (stopAt <= ROUTE_PROGRESS_EPS) {
          entryHold = null;
          entryHoldEdgeKey = null;
          entryHoldGroupKey = null;
        }
      }
      if (
        reservationWaitsEnabled &&
        !entryHold &&
        runtime?.entryHold?.startTime &&
        now < runtime.entryHold.startTime
      ) {
        entryHold = runtime.entryHold;
        entryHoldEdgeKey = runtime.entryHold.edgeKey || null;
        entryHoldGroupKey = entryHoldEdgeKey
          ? resolveEdgeLockKey(route.segments?.[route.segmentIndex + 1] || null, robot)
          : null;
      }
      const failFastMs = Number.isFinite(profile?.repair?.failFastThresholdMs)
        ? profile.repair.failFastThresholdMs
        : lateMs;
      if (
        scheduleEntry &&
        now > scheduleEntry.arrivalTime + failFastMs &&
        !entryHold &&
        !hasEntryHoldWaiter &&
        !isNextSingleLane
      ) {
        recordReservationViolation(
          runtime,
          now,
          buildReservationViolationDetail(robot, segment, scheduleEntry)
        );
        const refreshed = maybeRefreshSchedule();
        const nextEntry = getRouteScheduleEntry(route, route.segmentIndex);
        if (!allowReservationSlip && nextEntry && now + earlyMs < nextEntry.startTime) {
          if (runtime) runtime.entryHold = null;
          markRuntimeStall(
            runtime,
            'reservation_wait',
            nextEntry?.conflict?.holder || null
          );
          ensureRobotMotion(robot);
          robot.speed = 0;
          touchQueue(edgeGroupKey, segmentEdgeKey);
          return false;
        }
        if (!allowReservationSlip && nextEntry && now > nextEntry.arrivalTime + lateMs) {
          recordReservationViolation(
            runtime,
            now,
            buildReservationViolationDetail(robot, segment, nextEntry)
          );
          markRuntimeStall(
            runtime,
            'reservation_wait',
            nextEntry?.conflict?.holder || null
          );
          ensureRobotMotion(robot);
          robot.speed = 0;
          touchQueue(edgeGroupKey, segmentEdgeKey);
          return false;
        }
        if (!refreshed && runtime) {
          runtime.scheduleResyncAfterSegment = true;
        }
      }
    }
    if (entryHold && runtime?.entryHoldBypass) {
      const bypass = runtime.entryHoldBypass;
      const bypassEdgeKey = bypass.edgeKey || null;
      const bypassNodeKey = bypass.nodeKey || null;
      const entryNodeKey =
        entryHold.conflict && entryHold.conflict.type === 'node' ? entryHold.conflict.key : null;
      const bypassMatch =
        (bypassEdgeKey && bypassEdgeKey === entryHold.edgeKey) ||
        (bypassNodeKey && bypassNodeKey === entryNodeKey);
      if (bypassMatch && bypass.segmentIndex === currentSegmentIndex) {
        entryHold = null;
        entryHoldEdgeKey = null;
        entryHoldGroupKey = null;
      }
    }
    if (runtime) {
      runtime.entryHold = entryHold;
    }
    if (runtime && robot?.id) {
      syncEntryHoldWaiterCache(robot.id, runtime);
    }
    if (runtime?.entryHoldArb) {
      const arbNodeKey = runtime.entryHoldArb.nodeKey || null;
      const entryNodeKey =
        entryHold?.conflict && entryHold.conflict.type === 'node' ? entryHold.conflict.key : null;
      if (!entryHold || runtime.entryHoldArb.edgeKey !== entryHold.edgeKey) {
        runtime.entryHoldArb = null;
      } else if (arbNodeKey && arbNodeKey !== entryNodeKey) {
        runtime.entryHoldArb = null;
      }
    }
    if (entryHold?.edgeKey && runtime?.route && segment?.polyline) {
      const stopAt = getEntryHoldStopAt(segment, entryHold);
      const atOrPastStop = Number.isFinite(stopAt)
        ? route.segmentProgress >= stopAt - ROUTE_PROGRESS_EPS
        : false;
      if (atOrPastStop) {
        let handledEntryHold = false;
        const conflictNodeKey =
          entryHold.conflict && entryHold.conflict.type === 'node' ? entryHold.conflict.key : null;
        if (conflictNodeKey && countEntryHoldNodeWaiters(conflictNodeKey) > 1) {
          const leader = pickEntryHoldNodeLeader(conflictNodeKey);
          if (leader?.id && leader.id !== robot.id) {
            entryHoldLeaderId = leader.id;
            const arbCooldownMs = Math.max(
              reservationStepMs || RESERVATION_DEFAULT_STEP_MS,
              SIM_TICK_MS * 3
            );
            const lastArb = runtime?.entryHoldArb;
            if (
              !lastArb ||
              lastArb.nodeKey !== conflictNodeKey ||
              lastArb.leaderId !== entryHoldLeaderId ||
              nowMs - lastArb.at >= arbCooldownMs
            ) {
              if (runtime) {
                runtime.entryHoldArb = {
                  edgeKey: entryHold.edgeKey,
                  nodeKey: conflictNodeKey,
                  leaderId: entryHoldLeaderId,
                  at: nowMs
                };
              }
              refreshRouteSchedule(robot, runtime, nowMs, { force: true });
              entryHold = null;
              entryHoldRescheduled = true;
            }
            handledEntryHold = true;
          } else if (leader?.id === robot.id) {
            if (runtime) {
              runtime.entryHoldBypass = {
                edgeKey: entryHold.edgeKey || null,
                nodeKey: conflictNodeKey,
                segmentIndex: currentSegmentIndex,
                at: nowMs
              };
              runtime.scheduleSlip = {
                at: nowMs,
                startTime: entryHold.startTime,
                edgeKey: entryHold.edgeKey || null
              };
              runtime.scheduleResyncAfterSegment = true;
            }
            entryHold = null;
            entryHoldEdgeKey = null;
            entryHoldGroupKey = null;
            handledEntryHold = true;
          }
        }
        if (!handledEntryHold) {
          const edgeWaiters = countEntryHoldEdgeWaiters(entryHold.edgeKey);
          const leader = pickEntryHoldLeader(entryHold.edgeKey, {
            ignoreNodeLocks: edgeWaiters > 1
          });
          if (leader?.id && leader.id !== robot.id) {
            entryHoldLeaderId = leader.id;
            const arbCooldownMs = Math.max(
              reservationStepMs || RESERVATION_DEFAULT_STEP_MS,
              SIM_TICK_MS * 3
            );
            const lastArb = runtime?.entryHoldArb;
            if (
              !lastArb ||
              lastArb.edgeKey !== entryHold.edgeKey ||
              lastArb.leaderId !== entryHoldLeaderId ||
              nowMs - lastArb.at >= arbCooldownMs
            ) {
              if (runtime) {
                runtime.entryHoldArb = {
                  edgeKey: entryHold.edgeKey,
                  leaderId: entryHoldLeaderId,
                  at: nowMs
                };
              }
              refreshRouteSchedule(robot, runtime, nowMs, { force: true });
              entryHold = null;
              entryHoldRescheduled = true;
            }
          } else if (leader?.id === robot.id && edgeWaiters > 1) {
            if (runtime) {
              runtime.entryHoldBypass = {
                edgeKey: entryHold.edgeKey || null,
                segmentIndex: currentSegmentIndex,
                at: nowMs
              };
              runtime.scheduleSlip = {
                at: nowMs,
                startTime: entryHold.startTime,
                edgeKey: entryHold.edgeKey || null
              };
              runtime.scheduleResyncAfterSegment = true;
            }
            entryHold = null;
            entryHoldEdgeKey = null;
            entryHoldGroupKey = null;
          } else if (runtime?.entryHoldArb || leader?.id) {
            runtime.entryHoldArb = leader?.id
              ? { edgeKey: entryHold.edgeKey, leaderId: leader.id, at: nowMs }
              : null;
          }
        }
      }
    }
    if (runtime) {
      runtime.entryHold = entryHold;
    }
    if (runtime && robot?.id) {
      syncEntryHoldWaiterCache(robot.id, runtime);
    }
    if (entryHoldRescheduled) {
      ensureRobotMotion(robot);
      robot.speed = 0;
      markRuntimeStall(
        runtime,
        'reservation_entry',
        entryHoldLeaderId
      );
      touchQueue(entryHoldGroupKey || edgeGroupKey, entryHoldEdgeKey || segmentEdgeKey);
      return false;
    }
    let edgeHold = null;
    let edgeHoldBlocker = null;
    if (lockToRoute && useEdgeLocks && robot?.id) {
      const lockStatus = syncEdgeCorridorLocks(robot, runtime, nowMs);
      if (!lockStatus.ok) {
        edgeHold = lockStatus.hold || null;
        edgeHoldBlocker = lockStatus.holder || null;
        if (runtime) {
          runtime.edgeLockHold = {
            edgeGroupKey: lockStatus.edgeGroupKey || edgeGroupKey || null,
            holderId: lockStatus.holder || null,
            stopSegmentIndex: edgeHold?.segmentIndex ?? null,
            stopSegmentProgress: edgeHold?.segmentProgress ?? null,
            stopDistance: edgeHold?.distance ?? null
          };
        }
        const stopNow = !edgeHold ||
          (Number.isFinite(edgeHold.segmentIndex) &&
            edgeHold.segmentIndex === route.segmentIndex &&
            Number.isFinite(edgeHold.segmentProgress) &&
            Number.isFinite(route.segmentProgress) &&
            route.segmentProgress >= edgeHold.segmentProgress - ROUTE_PROGRESS_EPS);
        if (stopNow) {
          markRuntimeStall(runtime, 'edge_lock', lockStatus.holder || null);
          ensureRobotMotion(robot);
          robot.speed = 0;
          return false;
        }
      } else if (runtime?.edgeLockHold) {
        runtime.edgeLockHold = null;
      }
    }
    if ((!lockToRoute || !useEdgeLocks) && runtime?.edgeLockHold) {
      runtime.edgeLockHold = null;
    }
    const profile = getRobotMotionProfile(robot);
    const entryHoldAllowBackoff = entryHold ? allowReservationBackoff(robot) : false;
    if (entryHold && segment?.polyline) {
      const stopAt = Math.max(0, segment.totalLength - entryHold.buffer);
      const atOrPastStop = route.segmentProgress >= stopAt - ROUTE_PROGRESS_EPS;
      const pastStop = route.segmentProgress > stopAt + ROUTE_PROGRESS_EPS;
      if (atOrPastStop) {
        if (entryHoldAllowBackoff && pastStop) {
          const baseSpeed = profile?.speedMps || robotSpeedMps;
          const backSpeed = -Math.min(baseSpeed, baseSpeed * 0.5);
          const backMotion = applyKinematicMotion(robot, desiredHeading, backSpeed, dt);
          const backDistance = Math.abs(backMotion.distance);
          if (backDistance > 1e-4) {
            clearRuntimeStall(runtime);
          }
          const backProgress = Math.max(stopAt, route.segmentProgress - backDistance);
          if (lockToRoute) {
            const pose = polylineAtDistance(segment.polyline, backProgress);
            robot.pos = { x: pose.x, y: pose.y };
            robot.heading = navTarget.driveBackward
              ? normalizeAngle(pose.heading + Math.PI)
              : pose.heading;
          }
          route.segmentProgress = backProgress;
          return false;
        }
        if (lockToRoute && (!pastStop || entryHoldAllowBackoff)) {
          const pose = polylineAtDistance(segment.polyline, stopAt);
          robot.pos = { x: pose.x, y: pose.y };
          robot.heading = navTarget.driveBackward
            ? normalizeAngle(pose.heading + Math.PI)
            : pose.heading;
        }
        ensureRobotMotion(robot);
        robot.speed = 0;
        markRuntimeStall(
          runtime,
          'reservation_entry',
          entryHold?.conflict?.holder || null
        );
        if (!pastStop || entryHoldAllowBackoff) {
          route.segmentProgress = stopAt;
        }
        touchQueue(entryHoldGroupKey || edgeGroupKey, entryHoldEdgeKey || segmentEdgeKey);
        return false;
      }
    }
    let desiredSpeed = Math.min(
      profile?.speedMps || robotSpeedMps,
      computeStoppingSpeed(navTarget.remaining, robot)
    );
    if (navTarget.driveBackward) desiredSpeed = -desiredSpeed;
    const traffic = getTrafficSpeedLimit(robot, desiredSpeed, desiredHeading);
    updateTrafficBlockState(runtime, traffic, robot);
    const limitedSpeed =
      desiredSpeed === 0
        ? 0
        : Math.sign(desiredSpeed) * Math.min(Math.abs(desiredSpeed), traffic.speedLimit);
    const trafficBlocked = traffic.speedLimit <= 1e-3 && traffic.blockReason;
    if (trafficBlocked) {
      markRuntimeStall(runtime, traffic.blockReason, traffic.blockingId);
    }
    const motion = applyKinematicMotion(robot, desiredHeading, limitedSpeed, dt);
    if (Math.abs(motion.distance) > 1e-4) {
      if (!trafficBlocked) {
        clearRuntimeStall(runtime);
      }
    }
    let maxProgress = segment.totalLength;
    const edgeHoldStop = edgeHold &&
      Number.isFinite(edgeHold.segmentIndex) &&
      edgeHold.segmentIndex === route.segmentIndex &&
      Number.isFinite(edgeHold.segmentProgress)
      ? edgeHold.segmentProgress
      : null;
    if (entryHold && segment?.polyline) {
      const stopAt = Math.max(0, segment.totalLength - entryHold.buffer);
      if (stopAt < maxProgress) {
        if (!(route.segmentProgress > stopAt + ROUTE_PROGRESS_EPS && !entryHoldAllowBackoff)) {
          maxProgress = stopAt;
        }
      }
    }
    if (Number.isFinite(edgeHoldStop) && edgeHoldStop < maxProgress) {
      maxProgress = edgeHoldStop;
    }
    const nextProgress = Math.min(
      maxProgress,
      segment.totalLength,
      route.segmentProgress + Math.abs(motion.distance)
    );
    if (lockToRoute && segment?.polyline) {
      const pose = polylineAtDistance(segment.polyline, nextProgress);
      robot.pos = { x: pose.x, y: pose.y };
      robot.heading = navTarget.driveBackward
        ? normalizeAngle(pose.heading + Math.PI)
        : pose.heading;
    }
    route.segmentProgress = nextProgress;
    if (Number.isFinite(edgeHoldStop) && nextProgress >= edgeHoldStop - ROUTE_PROGRESS_EPS) {
      ensureRobotMotion(robot);
      robot.speed = 0;
      markRuntimeStall(runtime, 'edge_lock', edgeHoldBlocker || null);
      return false;
    }
    if (entryHold && maxProgress < segment.totalLength && nextProgress >= maxProgress - ROUTE_PROGRESS_EPS) {
      ensureRobotMotion(robot);
      robot.speed = 0;
      return false;
    }
    if (segment.totalLength - route.segmentProgress <= ROUTE_PROGRESS_EPS) {
      const endPose = polylineAtDistance(segment.polyline, segment.totalLength);
      robot.pos = { x: endPose.x, y: endPose.y };
      if (lockToRoute) {
        robot.heading = navTarget.driveBackward
          ? normalizeAngle(endPose.heading + Math.PI)
          : endPose.heading;
        const nextSegment = route.segments?.[route.segmentIndex + 1] || null;
        const turnHeading = getTurnInPlaceHeading(segment, nextSegment);
        if (Number.isFinite(turnHeading)) {
          ensureRobotMotion(robot);
          robot.speed = 0;
          const aligned = alignRobotHeading(robot, turnHeading, deltaMs);
          if (!aligned) {
            return false;
          }
        }
      }
      if (edgeGroupKey && robot?.id) {
        releaseEdgeLock(edgeGroupKey, robot.id);
      }
      if (trafficStrategy?.useTimeReservations?.() && route.schedule?.length && robot?.id) {
        recordSegmentTiming(robot, runtime, segment, scheduleEntry, nowMs);
      }
      if (runtime?.entryHoldBypass && runtime.entryHoldBypass.segmentIndex === currentSegmentIndex) {
        runtime.entryHoldBypass = null;
      }
      if (maybeApplyPendingTaskAtNode(robot, runtime)) {
        return true;
      }
      route.segmentIndex += 1;
      route.segmentProgress = 0;
      if (runtime?.segmentTiming && runtime.segmentTiming.segmentIndex !== route.segmentIndex) {
        runtime.segmentTiming = null;
      }
      if (runtime?.scheduleResyncAfterSegment) {
        const lastResyncAt = runtime.scheduleResyncAt || 0;
        if (nowMs - lastResyncAt >= RESERVATION_REFRESH_COOLDOWN_MS) {
          refreshRouteSchedule(robot, runtime, nowMs, { force: true });
          runtime.scheduleResyncAt = nowMs;
        }
        runtime.scheduleResyncAfterSegment = false;
        runtime.scheduleSlip = null;
      }
      return true;
    }
    return false;
  };

  const setRuntimeRoute = (runtime, robot, targetPos, targetNodeId, options = {}) => {
    if (!runtime) return;
    if (robot?.id) {
      runtime.robotId = robot.id;
    }
    const hadRoute = Boolean(runtime.route);
    const previousEdgeGroupKey = getRuntimeEdgeGroupKey(runtime, robot);
    runtime.target = targetPos ? { ...targetPos } : null;
    runtime.targetHeading = targetPos && Number.isFinite(targetPos.angle) ? targetPos.angle : null;
    runtime.route = null;
    runtime.routeGoal = targetPos
      ? { pos: { ...targetPos }, nodeId: targetNodeId || null }
      : null;
    runtime.avoidance = null;
    runtime.avoidanceHold = false;
    const holdReplan =
      typeof options.replanReason === 'string' && options.replanReason.startsWith('hold:');
    if (!holdReplan) {
      runtime.holdState = null;
    }
    runtime.edgeLockHold = null;
    runtime.nodeLockHold = null;
    runtime.entryHold = null;
    runtime.entryHoldBypass = null;
    invalidateEntryHoldWaiterCache();
    runtime.entryHoldArb = null;
    runtime.scheduleSlip = null;
    runtime.scheduleResyncAfterSegment = false;
    runtime.scheduleResyncAt = null;
    runtime.deadlockInfo = null;
    runtime.deadlockResolvedAt = null;
    runtime.edgeLockYield = null;
    runtime.edgeLockYieldAt = null;
    clearRuntimeStall(runtime, holdReplan ? { silent: true } : {});
    clearRuntimeStuck(runtime);
    runtime.yieldStartedAt = null;
    runtime.yieldAttempts = 0;
    runtime.blockedObstacleId = null;
    runtime.replannedForObstacle = false;
    if (robot?.id && trafficStrategy?.useTimeReservations?.()) {
      releaseTimeReservations(robot.id);
    }
    if (!robot || !targetPos) return;
    const baseConstraints = pruneConstraints(
      createConstraintTable(options.constraints || runtime.cbsConstraints),
      Date.now()
    );
    runtime.cbsConstraints = baseConstraints;
    let route = buildRoute(robot.pos, targetPos, targetNodeId, {
      robotId: robot.id,
      constraints: baseConstraints
    });
    if (route) {
      if (!route.segments.length && !Number.isFinite(targetPos.angle)) {
        route.finalTarget.heading = robot.heading;
      }
      const cbsResult = resolveCbsConflict(
        robot,
        runtime,
        targetPos,
        targetNodeId,
        route,
        baseConstraints,
        options
      );
      route = cbsResult?.route || route;
      runtime.cbsConstraints = cbsResult?.constraints || baseConstraints;
      applyRuntimeRoute(robot, runtime, route, previousEdgeGroupKey);
      recordEvent('route_plan', {
        robotId: robot.id,
        targetNodeId: targetNodeId || null,
        replanReason: options.replanReason || null,
        hasRoute: Boolean(route)
      });
      if (hadRoute && (options.countReplan || options.replanReason)) {
        const now = Date.now();
        runtime.lastReplanAt = now;
        runtime.lastReplanReason = options.replanReason || null;
        recordMetricCount('replans');
        applyImmediateHoldAfterReplan(robot, runtime, now);
      }
    } else if (runtime.mode !== 'manual') {
      runtime.target = null;
      runtime.targetHeading = null;
      if (runtime.blockedReason == null) {
        runtime.pausedBeforeBlocked = runtime.paused;
      }
      runtime.paused = true;
      runtime.blockedReason = 'no_route';
      runtime.blockedObstacleId = null;
      if (runtime.taskId) {
        updateTask(runtime.taskId, { status: 'paused', phase: 'no_route' });
      }
      ensureRobotMotion(robot);
      robot.speed = 0;
      robot.blocked = true;
      updateRobotState(robot.id, { blocked: true, speed: 0, activity: 'blocked_no_route' });
      if (trafficStrategy?.useTimeReservations?.()) {
        refreshRouteSchedulesAfterRelease(robot.id);
      }
    }
  };

  const moveRobotToward = (robot, target, deltaMs, maxSpeed, runtime) => {
    if (!robot?.pos || !target) return { arrived: true, traffic: null };
    const dt = deltaMs / 1000;
    if (!Number.isFinite(dt) || dt <= 0) return { arrived: false, traffic: null };
    ensureRobotMotion(robot);
    const profile = getRobotMotionProfile(robot);
    const dx = target.x - robot.pos.x;
    const dy = target.y - robot.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= ROBOT_ARRIVAL_DISTANCE) {
      robot.pos = { ...target };
      robot.speed = 0;
      return { arrived: true, traffic: null };
    }
    const desiredHeading = Math.atan2(dy, dx);
    const speedCap = Number.isFinite(maxSpeed)
      ? maxSpeed
      : profile?.speedMps || robotSpeedMps;
    let desiredSpeed = Math.min(speedCap, computeStoppingSpeed(dist, robot));
    const traffic = getTrafficSpeedLimit(robot, desiredSpeed, desiredHeading);
    updateTrafficBlockState(runtime, traffic, robot);
    const trafficBlocked = traffic.speedLimit <= 1e-3 && traffic.blockReason;
    if (trafficBlocked) {
      markRuntimeStall(runtime, traffic.blockReason, traffic.blockingId);
    }
    desiredSpeed = Math.min(desiredSpeed, traffic.speedLimit);
    const motion = applyKinematicMotion(robot, desiredHeading, desiredSpeed, dt);
    if (Math.abs(motion.distance) > 1e-4) {
      if (!trafficBlocked) {
        clearRuntimeStall(runtime);
      }
    }
    const remaining = Math.hypot(target.x - robot.pos.x, target.y - robot.pos.y);
    if (remaining <= ROBOT_ARRIVAL_DISTANCE && robot.speed <= ROBOT_ARRIVAL_SPEED) {
      robot.pos = { ...target };
      robot.speed = 0;
      return { arrived: true, traffic };
    }
    return { arrived: false, traffic };
  };

  const findObstacleOnPath = (from, to, ignoreId) => {
    if (!obstacles.length || !from || !to) return null;
    let best = null;
    let bestT = Number.POSITIVE_INFINITY;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const obstacle of obstacles) {
      if (!obstacle) continue;
      if (ignoreId && obstacle.id === ignoreId) continue;
      const projection = projectPointToSegment(
        obstacle.x,
        obstacle.y,
        from.x,
        from.y,
        to.x,
        to.y
      );
      if (!projection || projection.dist > obstacle.radius + OBSTACLE_CLEARANCE) continue;
      const isEarlier =
        projection.t < bestT - 1e-6 ||
        (Math.abs(projection.t - bestT) <= 1e-6 && projection.dist < bestDist);
      if (isEarlier) {
        best = obstacle;
        bestT = projection.t;
        bestDist = projection.dist;
      }
    }
    return best;
  };

  const findObstacleOnRoute = (route, ignoreId) => {
    if (!route?.segments?.length || !obstacles.length) return null;
    const segment = route.segments[route.segmentIndex];
    if (!segment?.polyline) return null;
    const minOffset = Math.max(0, route.segmentProgress - ROUTE_PROGRESS_EPS);
    const maxOffset = Math.min(
      segment.totalLength,
      route.segmentProgress + ROUTE_LOOKAHEAD + OBSTACLE_CLEARANCE
    );
    for (const obstacle of obstacles) {
      if (!obstacle) continue;
      if (ignoreId && obstacle.id === ignoreId) continue;
      const projection = projectPointToPolyline({ x: obstacle.x, y: obstacle.y }, segment.polyline);
      if (!projection.point) continue;
      if (projection.dist > obstacle.radius + OBSTACLE_CLEARANCE) continue;
      if (projection.offset + 1e-6 < minOffset || projection.offset - 1e-6 > maxOffset) continue;
      return obstacle;
    }
    return null;
  };

  const computeAvoidWaypoint = (from, to, obstacle, options = {}) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dir = unitVector(dx, dy);
    if (dir.x === 0 && dir.y === 0) {
      return null;
    }
    const toCenter = { x: obstacle.x - from.x, y: obstacle.y - from.y };
    const proj = toCenter.x * dir.x + toCenter.y * dir.y;
    const perp = { x: -dir.y, y: dir.x };
    const cross = dir.x * toCenter.y - dir.y * toCenter.x;
    const side = cross >= 0 ? 1 : -1;
    const baseOffset = obstacle.radius + OBSTACLE_AVOID_MARGIN;
    const maxOffset = Number.isFinite(options.maxOffset) ? options.maxOffset : null;
    const offset = maxOffset !== null ? Math.min(baseOffset, maxOffset) : baseOffset;
    if (!Number.isFinite(offset) || offset <= 0) {
      return null;
    }
    const forward = Math.max(proj + offset, offset);
    return {
      x: from.x + dir.x * forward + perp.x * offset * side,
      y: from.y + dir.y * forward + perp.y * offset * side
    };
  };

  const isRouteBlockedByObstacle = (route, robot, options = {}) => {
    if (!route?.segments?.length || !robot) return false;
    const ignoreId = options && options.ignoreId ? options.ignoreId : null;
    const obstacle = findObstacleOnRoute(route, ignoreId);
    if (!obstacle) return false;
    if (obstacle.mode === 'block') return true;
    const segment = route.segments[route.segmentIndex];
    const corridorWidth = Number(segment?.width);
    const maxOffset =
      Number.isFinite(corridorWidth) && corridorWidth > 0
        ? corridorWidth / 2 - (getRobotWidth(robot) / 2 + OBSTACLE_CLEARANCE)
        : null;
    const canAvoid =
      obstacle.mode === 'avoid' &&
      Number.isFinite(maxOffset) &&
      maxOffset > ROUTE_PROGRESS_EPS;
    if (!canAvoid) return true;
    const navTarget = getRouteNavTarget(route);
    const targetPos = navTarget?.pos || route.finalTarget?.pos;
    if (!targetPos || !robot.pos) return true;
    const waypoint = computeAvoidWaypoint(robot.pos, targetPos, obstacle, { maxOffset });
    return !waypoint;
  };

  const finalizeRuntimeRoute = (robot, runtime) => {
    if (!robot || !runtime?.route) return;
    if (trafficStrategy?.useTimeReservations?.()) {
      releaseTimeReservations(robot.id);
      runtime.route.schedule = null;
      runtime.route.scheduleProfile = null;
    }
    refreshRouteSchedulesAfterRelease(robot.id);
  };

  const advanceRobotToward = (robot, runtime, deltaMs) => {
    const dt = deltaMs / 1000;
    ensureRobotMotion(robot);
    if (robot.blocked) {
      applyKinematicMotion(robot, robot.heading, 0, dt);
      return { arrived: false, blocked: true, diverted: false };
    }
    if (runtime?.paused) {
      applyKinematicMotion(robot, robot.heading, 0, dt);
      return { arrived: false, blocked: false, diverted: false };
    }

    const profile = getRobotMotionProfile(robot);
    const speedCap = profile?.speedMps || robotSpeedMps;

    if (runtime.avoidance) {
      const result = moveRobotToward(
        robot,
        runtime.avoidance.waypoint,
        deltaMs,
        speedCap,
        runtime
      );
      if (result.arrived) {
        runtime.avoidance = null;
        runtime.avoidanceHold = false;
      }
      return { arrived: false, blocked: false, diverted: true };
    }

    const routeTarget = runtime.route ? getRouteNavTarget(runtime.route) : null;
    const targetPos = routeTarget
      ? routeTarget.pos
      : runtime.route
        ? runtime.route.finalTarget?.pos
        : runtime.target;

    if (!targetPos) {
      if (runtime.route) {
        const aligned = alignRobotHeading(robot, runtime.route.finalTarget?.heading, deltaMs);
        if (aligned) {
          if (shouldContinueRollingPlan(robot, runtime)) {
            triggerRollingReplan(robot, runtime);
            return { arrived: false, blocked: false, diverted: true };
          }
          finalizeRuntimeRoute(robot, runtime);
          runtime.route = null;
          runtime.targetHeading = null;
          return { arrived: true, blocked: false, diverted: false };
        }
        return { arrived: false, blocked: false, diverted: false };
      }
      applyKinematicMotion(robot, robot.heading, 0, dt);
      return { arrived: true, blocked: false, diverted: false };
    }

    runtime.target = { ...targetPos };
    const obstacle = runtime.route
      ? findObstacleOnRoute(runtime.route)
      : findObstacleOnPath(robot.pos, targetPos);
    if (obstacle) {
      const segment = runtime.route?.segments?.[runtime.route.segmentIndex] || null;
      const corridorWidth = Number(segment?.width);
      const maxOffset =
        Number.isFinite(corridorWidth) && corridorWidth > 0
          ? corridorWidth / 2 - (getRobotWidth(robot) / 2 + OBSTACLE_CLEARANCE)
          : null;
      const canAvoid =
        obstacle.mode === 'avoid' &&
        Number.isFinite(maxOffset) &&
        maxOffset > ROUTE_PROGRESS_EPS;
      if (canAvoid && !runtime.avoidance) {
        const waypoint = computeAvoidWaypoint(robot.pos, targetPos, obstacle, {
          maxOffset
        });
        if (waypoint) {
          runtime.avoidance = {
            obstacleId: obstacle.id,
            waypoint
          };
          runtime.avoidanceHold = false;
          releaseRobotEdgeLocksOnly(robot.id);
          releaseTimeReservations(robot.id);
          if (runtime.route) {
            runtime.route.schedule = null;
            runtime.route.scheduleProfile = null;
          }
          refreshRouteSchedulesAfterRelease(robot.id);
          return { arrived: false, blocked: false, diverted: true };
        }
      }
      if (!robot.blocked) {
        if (runtime.blockedReason == null) {
          runtime.pausedBeforeBlocked = runtime.paused;
        }
        runtime.paused = true;
        runtime.blockedReason = 'obstacle';
        runtime.blockedObstacleId = obstacle.id;
        if (runtime.taskId) {
          updateTask(runtime.taskId, { status: 'paused', phase: 'blocked_obstacle' });
        }
        if (trafficStrategy?.useTimeReservations?.()) {
          releaseTimeReservations(robot.id);
          if (runtime.route) {
            runtime.route.schedule = null;
            runtime.route.scheduleProfile = null;
          }
          refreshRouteSchedulesAfterRelease(robot.id);
        }
        applyKinematicMotion(robot, robot.heading, 0, dt);
        updateRobotState(robot.id, { blocked: true, speed: 0 });
        return { arrived: false, blocked: true, diverted: false };
      }
    }

    if (runtime.route) {
        const navTarget = getRouteNavTarget(runtime.route);
        if (navTarget) {
          const advanced = advanceRouteProgress(robot, runtime, deltaMs, navTarget);
          maybeTriggerReplanForHold(robot, runtime, Date.now());
          if (runtime.route.segmentIndex < runtime.route.segments.length) {
            return { arrived: false, blocked: false, diverted: advanced };
          }
        }

      const finalPos = runtime.route.finalTarget?.pos;
      if (finalPos) {
        const result = moveRobotToward(robot, finalPos, deltaMs, speedCap, runtime);
        if (!result.arrived) {
          return { arrived: false, blocked: false, diverted: false };
        }
      }
      const aligned = alignRobotHeading(robot, runtime.route.finalTarget?.heading, deltaMs);
      if (aligned) {
        if (shouldContinueRollingPlan(robot, runtime)) {
          triggerRollingReplan(robot, runtime);
          return { arrived: false, blocked: false, diverted: true };
        }
        finalizeRuntimeRoute(robot, runtime);
        runtime.route = null;
        runtime.targetHeading = null;
        return { arrived: true, blocked: false, diverted: false };
      }
      return { arrived: false, blocked: false, diverted: false };
    }

    const result = moveRobotToward(robot, runtime.target, deltaMs, speedCap, runtime);
    if (result.arrived) {
      const aligned = alignRobotHeading(robot, runtime.targetHeading, deltaMs);
      return { arrived: aligned, blocked: false, diverted: false };
    }
    return { arrived: false, blocked: false, diverted: false };
  };

  const getWorksiteState = (id) => {
    return worksiteState[id] || { occupancy: 'empty', blocked: false };
  };

  const setWorksiteOccupancy = (id, occupancy) => {
    const state = getWorksiteState(id);
    state.occupancy = occupancy === 'filled' ? 'filled' : 'empty';
    worksiteState[id] = state;
  };

  const setWorksiteBlocked = (id, blocked) => {
    const state = getWorksiteState(id);
    state.blocked = Boolean(blocked);
    worksiteState[id] = state;
  };

  const inferYieldResumePhase = (robot, runtime, resumeGoal) => {
    if (!runtime) return null;
    const goalNodeId = resumeGoal?.nodeId || runtime.routeGoal?.nodeId || null;
    if (goalNodeId && runtime.pickNodeId && goalNodeId === runtime.pickNodeId) {
      return 'to_pick';
    }
    if (goalNodeId && runtime.dropNodeId && goalNodeId === runtime.dropNodeId) {
      return 'to_drop';
    }
    const goalPos = resumeGoal?.pos || null;
    const threshold = Math.max(ROBOT_ARRIVAL_DISTANCE * 2, 0.6);
    if (goalPos && runtime.dropPos) {
      if (distanceBetweenPoints(goalPos, runtime.dropPos) <= threshold) {
        return 'to_drop';
      }
    }
    if (runtime.pickId) {
      const pickState = getWorksiteState(runtime.pickId).occupancy;
      if (pickState === 'filled') return 'to_pick';
      if (runtime.dropId) return 'to_drop';
    }
    if (goalPos && robot?.id) {
      const parkTarget = robotParking.get(robot.id) || null;
      const parkPos = parkTarget?.pos || null;
      if (parkPos && distanceBetweenPoints(goalPos, parkPos) <= threshold) {
        return 'to_park';
      }
    }
    return null;
  };

  const forceYieldForTest = (robotId, options = {}) => {
    if (!yieldEnabled) return { ok: false, error: 'yield_disabled' };
    const robot = getRobotById(robotId);
    const runtime = getRobotRuntime(robotId);
    if (!robot) return { ok: false, error: 'missing_robot' };
    if (!runtime) return { ok: false, error: 'missing_runtime' };
    if (options.clearRouteGoal) {
      runtime.routeGoal = null;
    }
    if (Object.prototype.hasOwnProperty.call(options, 'resumePhase')) {
      runtime.resumePhase = options.resumePhase;
    } else {
      runtime.resumePhase = runtime.phase;
    }
    if (Object.prototype.hasOwnProperty.call(options, 'resumeRouteGoal')) {
      runtime.resumeRouteGoal = options.resumeRouteGoal;
    } else {
      runtime.resumeRouteGoal = runtime.routeGoal;
    }
    if (options.clearMission) {
      runtime.pickId = null;
      runtime.dropId = null;
      runtime.pickNodeId = null;
      runtime.dropNodeId = null;
      runtime.pickPos = null;
      runtime.dropPos = null;
      runtime.streamId = null;
      runtime.taskId = null;
    }
    const now = Date.now();
    runtime.phase = 'yield';
    runtime.mode = 'auto';
    runtime.yieldStartedAt = now;
    runtime.yieldAttempts = 1;
    runtime.lastYieldAt = now;
    runtime.target = options.target
      ? { ...options.target }
      : robot.pos
        ? { x: robot.pos.x, y: robot.pos.y }
        : runtime.routeGoal?.pos
          ? { ...runtime.routeGoal.pos }
          : null;
    runtime.targetHeading = null;
    runtime.route = null;
    runtime.avoidance = null;
    runtime.entryHold = null;
    runtime.entryHoldBypass = null;
    invalidateEntryHoldWaiterCache();
    runtime.edgeLockHold = null;
    runtime.nodeLockHold = null;
    releaseRobotEdgeLocks(robotId);
    refreshRouteSchedulesAfterRelease(robotId);
    updateRobotState(robotId, { activity: 'yielding' });
    if (runtime.taskId) {
      updateTask(runtime.taskId, { phase: 'yield' });
    }
    return { ok: true };
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

  const resolveWorksiteTargetPos = (site) => {
    if (!site) return null;
    if (site.point) return resolvePointPosition(site.point);
    return site.pos || null;
  };

  const resolveExplicitParkingId = (robot) =>
    robot?.parkingPoint ||
    robot?.parkPoint ||
    robot?.parking ||
    robot?.park ||
    robot?.chargePoint ||
    null;

  const collectParkingPoints = () => {
    if (!graphData?.nodes?.length) return [];
    return graphData.nodes
      .filter((node) => node?.pos && (node.className === 'ParkPoint' || node.className === 'ChargePoint'))
      .map((node) => ({
        id: node.id,
        pos: node.pos,
        kind: node.className === 'ChargePoint' ? 'charge' : 'park'
      }));
  };

  const rebuildParkingIndex = () => {
    parkingPointIndex = new Map(parkingPoints.map((point) => [point.id, point]));
  };

  const findNearestParkingPoint = (basePos, points, allowedIds) => {
    if (!Array.isArray(points) || !points.length) return null;
    if (!basePos) {
      if (!allowedIds) return points[0];
      for (const point of points) {
        if (allowedIds.has(point.id)) return point;
      }
      return null;
    }
    let best = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const point of points) {
      if (!point?.pos) continue;
      if (allowedIds && !allowedIds.has(point.id)) continue;
      const dist = distanceBetweenPoints(basePos, point.pos);
      if (dist < bestDist) {
        best = point;
        bestDist = dist;
      }
    }
    return best;
  };

  const getParkingBlocker = (point, robotId) => {
    if (!point?.id || !point?.pos) return null;
    if (!parkingPointIndex.has(point.id)) return null;
    let blockerId = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const other of robots) {
      if (!other?.pos || other.id === robotId) continue;
      const dist = distanceBetweenPoints(other.pos, point.pos);
      if (dist <= PARKING_OCCUPANCY_DISTANCE && dist < bestDist) {
        blockerId = other.id;
        bestDist = dist;
      }
    }
    return blockerId;
  };

  const getParkingHold = (robot, runtime) => {
    if (!robot?.pos || !runtime?.routeGoal?.nodeId) return null;
    const point = parkingPointIndex.get(runtime.routeGoal.nodeId);
    if (!point?.pos) return null;
    const blockerId = getParkingBlocker(point, robot.id);
    if (!blockerId) return null;
    const dist = distanceBetweenPoints(robot.pos, point.pos);
    if (dist > PARKING_APPROACH_DISTANCE) return null;
    const reason = point.kind === 'charge' ? 'charge_occupied' : 'parking_occupied';
    return { blockerId, reason, pointId: point.id };
  };

  const buildRobotParkingTargets = (robotsList) => {
    const map = new Map();
    if (!parkingPoints.length || !Array.isArray(robotsList)) return map;
    const available = new Set(parkingPoints.map((point) => point.id));
    const explicitAssignments = [];
    const autoAssignments = [];
    robotsList.forEach((robot) => {
      if (!robot?.id) return;
      const explicitId = resolveExplicitParkingId(robot);
      const basePos = robot.pos || resolvePointPosition(robot.ref) || null;
      if (explicitId && parkingPointIndex.has(explicitId)) {
        explicitAssignments.push({ robot, explicitId, basePos });
      } else {
        autoAssignments.push({ robot, basePos });
      }
    });

    const assignPoint = (robot, basePos, preferredId) => {
      if (!robot?.id) return;
      let point = null;
      if (preferredId && parkingPointIndex.has(preferredId) && available.has(preferredId)) {
        point = parkingPointIndex.get(preferredId);
      }
      if (!point) {
        point = findNearestParkingPoint(basePos, parkingPoints, available);
      }
      if (!point) {
        point = findNearestParkingPoint(basePos, parkingPoints, null);
      }
      if (point) {
        map.set(robot.id, point);
        available.delete(point.id);
      }
    };

    explicitAssignments.forEach(({ robot, explicitId, basePos }) => {
      assignPoint(robot, basePos, explicitId);
      if (!map.has(robot.id) && parkingPointIndex.has(explicitId)) {
        map.set(robot.id, parkingPointIndex.get(explicitId));
      }
    });

    autoAssignments.forEach(({ robot, basePos }) => {
      assignPoint(robot, basePos, null);
    });

    return map;
  };

  const resolveRobotParkingPoint = (robot, options = {}) => {
    if (!robot) return null;
    const allowOccupied = options.allowOccupied !== false;
    const preferAssigned = options.preferAssigned === true;
    const assignedOnly = options.assignedOnly === true;
    const preferred = robotParking.get(robot.id) || null;
    let explicitId = resolveExplicitParkingId(robot);
    if (!explicitId && robot?.ref && parkingPointIndex.has(robot.ref)) {
      explicitId = robot.ref;
    }
    const explicitPoint = explicitId ? parkingPointIndex.get(explicitId) : null;
    let explicitTarget = explicitPoint || null;
    if (!explicitTarget && explicitId) {
      const explicitPos = resolvePointPosition(explicitId);
      if (explicitPos) {
        explicitTarget = { id: explicitId, pos: explicitPos, kind: 'custom' };
      }
    }
    if (assignedOnly) {
      return explicitTarget || null;
    }
    if (preferAssigned) {
      if (explicitTarget) return explicitTarget;
      if (preferred) return preferred;
    }
    const basePos = robot.pos || resolvePointPosition(robot.ref) || null;
    const candidates = [];
    if (preferred) {
      candidates.push(preferred);
    }
    if (explicitTarget && (!preferred || explicitTarget.id !== preferred.id)) {
      candidates.push(explicitTarget);
    }
    const nearest = findNearestParkingPoint(basePos, parkingPoints, null);
    if (nearest && !candidates.some((candidate) => candidate.id === nearest.id)) {
      candidates.push(nearest);
    }
    if (!candidates.length && parkingPoints.length) {
      candidates.push(parkingPoints[0]);
    }
    if (!candidates.length) {
      const fallbackNode = graphData?.nodes?.[0];
      if (fallbackNode?.pos) {
        return { id: fallbackNode.id || null, pos: fallbackNode.pos, kind: 'fallback' };
      }
    }
    let fallback = candidates[0] || null;
    for (const candidate of candidates) {
      if (!parkingPointIndex.has(candidate.id)) {
        return candidate;
      }
      const blockerId = getParkingBlocker(candidate, robot.id);
      if (!blockerId) {
        return candidate;
      }
    }
    return allowOccupied ? fallback : null;
  };

  const buildWorksites = (workflow) => {
    const locations = workflow?.bin_locations || {};
    return Object.entries(locations).map(([id, item]) => {
      const kind = id.startsWith('PICK') ? 'pick' : id.startsWith('DROP') ? 'drop' : 'worksite';
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
    if (!model || typeof model !== 'object') return null;
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
    if (!config || typeof config !== 'object') return { ...DEFAULT_ROBOT_MODEL };
    const models = config.models && typeof config.models === 'object' ? config.models : {};
    let candidate = null;
    if (config.defaultModel) {
      candidate =
        typeof config.defaultModel === 'string' ? models[config.defaultModel] : config.defaultModel;
    }
    if (!candidate && config.model && typeof config.model === 'object') {
      candidate = config.model;
    }
    const normalized = normalizeRobotModel(candidate);
    return normalized || { ...DEFAULT_ROBOT_MODEL };
  };

  const resolveRobotModel = (robot, config) => {
    const models = config?.models && typeof config.models === 'object' ? config.models : {};
    let candidate = null;
    if (robot) {
      if (typeof robot.model === 'string') {
        candidate = models[robot.model];
      } else if (robot.model && typeof robot.model === 'object') {
        candidate = robot.model;
      }
    }
    const normalized = normalizeRobotModel(candidate);
    return normalized || resolveDefaultRobotModel(config);
  };

  const buildRobots = (graph, worksiteList, config) => {
    const worksiteIndex = new Map(worksiteList.map((site) => [site.id, site.pos]));
    const nodeIndex = new Map((graph?.nodes || []).map((node) => [node.id, node.pos]));

    const resolvePos = (ref, fallbackPos) => {
      if (fallbackPos && typeof fallbackPos === 'object') return fallbackPos;
      if (worksiteIndex.has(ref)) return worksiteIndex.get(ref);
      if (nodeIndex.has(ref)) return nodeIndex.get(ref);
      return worksiteList[0]?.pos || { x: 0, y: 0 };
    };

    const baseModel = resolveDefaultRobotModel(config);
    const baseRobots = [
      {
        id: 'RB-01',
        name: 'Robot 01',
        battery: 82,
        radius: ROBOT_RADIUS,
        model: { ...baseModel },
        blocked: false,
        task: null,
        activity: 'Idle',
        ref: 'PICK-03',
        pos: resolvePos('PICK-03', null),
        heading: 0,
        speed: 0,
        dispatchable: true,
        online: true,
        controlled: true,
        manualMode: false
      }
    ];

    const configRobots = (config?.robots || []).map((robot, index) => {
      const id = robot.id || `RB-${String(index + 1).padStart(2, '0')}`;
      const name = robot.name || `Robot ${String(index + 1).padStart(2, '0')}`;
      const ref = robot.ref || robot.point || robot.start || 'PICK-03';
      const pos = resolvePos(ref, robot.pos);
      const model = resolveRobotModel(robot, config);
      const wheelbase = Number.isFinite(robot.wheelbase) ? robot.wheelbase : null;
      const maxSpeed = Number.isFinite(robot.maxSpeed) ? robot.maxSpeed : null;
      const speedMultiplier = Number.isFinite(robot.speedMultiplier)
        ? robot.speedMultiplier
        : Number.isFinite(robot.speedScale)
          ? robot.speedScale
          : null;
      const priority = Number.isFinite(robot.priority)
        ? robot.priority
        : Number.isFinite(robot.trafficPriority)
          ? robot.trafficPriority
          : null;
      const trafficPriority = Number.isFinite(robot.trafficPriority)
        ? robot.trafficPriority
        : null;
      return {
        id,
        name,
        battery: Number.isFinite(robot.battery) ? robot.battery : 80,
        radius: Number.isFinite(robot.radius) ? robot.radius : ROBOT_RADIUS,
        model,
        wheelbase,
        maxSpeed,
        speedMultiplier,
        priority,
        trafficPriority,
        blocked: Boolean(robot.blocked),
        task: null,
        activity: 'Idle',
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
    return robotsToUse;
  };

  const buildTasks = () => [];

  const updateRobotState = (id, updates) => {
    const prev = robots.find((robot) => robot.id === id) || null;
    const nextRobot = prev ? { ...prev, ...updates } : null;
    robots = robots.map((robot) => (robot.id === id ? nextRobot : robot));
    if (prev && nextRobot) {
      const fields = [
        'activity',
        'blocked',
        'task',
        'manualMode',
        'dispatchable',
        'controlled',
        'online'
      ];
      const changes = {};
      fields.forEach((field) => {
        if (prev[field] !== nextRobot[field]) {
          changes[field] = { from: prev[field] ?? null, to: nextRobot[field] ?? null };
        }
      });
      if (Object.keys(changes).length) {
        recordEvent('robot_state', { robotId: id, changes });
      }
    }
  };

  const isTaskInactive = (task) =>
    ['completed', 'cancelled', 'failed'].includes(task?.status);

  const recordRobotTaskStatus = (task) => {
    if (!task || !task.robotId) return;
    lastTaskStatusByRobot.set(task.robotId, {
      status: task.status,
      taskId: task.id,
      updatedAt: Date.now()
    });
  };

  const trimTasks = (list) => {
    if (!Array.isArray(list)) return [];
    if (list.length <= MAX_TASKS) return list;
    const trimmed = [...list];
    let idx = trimmed.length - 1;
    while (trimmed.length > MAX_TASKS && idx >= 0) {
      if (isTaskInactive(trimmed[idx])) {
        trimmed.splice(idx, 1);
      }
      idx -= 1;
    }
    if (trimmed.length > MAX_TASKS_HARD) {
      trimmed.splice(MAX_TASKS_HARD);
    }
    return trimmed;
  };

  const updateTask = (taskId, updates) => {
    let updatedTask = null;
    tasks = trimTasks(
      tasks.map((task) => {
        if (task.id !== taskId) return task;
        updatedTask = { ...task, ...updates };
        return updatedTask;
      })
    );
    if (updatedTask && updates && Object.prototype.hasOwnProperty.call(updates, 'status')) {
      if (isTaskInactive(updatedTask)) {
        recordRobotTaskStatus(updatedTask);
      }
    }
  };

  const createTask = ({ streamId, robotId, pickId, dropId, dropGroup, kind, meta }) => {
    const id = `TASK-${String(taskCounter).padStart(3, '0')}`;
    taskCounter += 1;
    const task = {
      id,
      streamId,
      robotId,
      pickId,
      dropId,
      dropGroup,
      kind: kind || 'transfer',
      meta: meta || null,
      status: 'in_progress',
      phase: 'to_pick',
      createdAt: Date.now()
    };
    tasks = trimTasks([task, ...tasks]);
    return task;
  };

  const canDispatchRobot = (robot) => {
    return (
      robot.online &&
      robot.dispatchable &&
      robot.controlled &&
      !robot.blocked &&
      !robot.task &&
      !robot.manualMode
    );
  };

  const getDispatchableRobots = () => robots.filter((robot) => canDispatchRobot(robot));

  const selectRobotForDispatch = (availableRobots, context) => {
    if (!availableRobots.length) return null;
    if ((dispatchStrategy || 'nearest') === 'first') {
      return availableRobots[0];
    }
    const targetPos = context?.targetPos || context?.pickPos || context?.dropPos || null;
    if (!targetPos) return availableRobots[0];
    let best = null;
    let bestDist = Number.POSITIVE_INFINITY;
    availableRobots.forEach((robot) => {
      if (!robot?.pos) return;
      const dist = distanceBetweenPoints(robot.pos, targetPos);
      if (dist < bestDist) {
        bestDist = dist;
        best = robot;
      }
    });
    return best || availableRobots[0];
  };

  const getActiveTaskRefs = () => {
    const activeTasks = tasks.filter(
      (task) => !['completed', 'cancelled', 'failed'].includes(task.status)
    );
    return {
      pickIds: new Set(activeTasks.map((task) => task.pickId).filter(Boolean)),
      dropIds: new Set(activeTasks.map((task) => task.dropId).filter(Boolean))
    };
  };

  const parseWorksiteKey = (id) => {
    const match = String(id).match(/^(.*?)(\d+)?$/);
    if (!match) return { prefix: String(id), num: null };
    const prefix = match[1] || String(id);
    const num = match[2] ? Number(match[2]) : null;
    return { prefix, num };
  };

  const sortWorksites = (list, direction) => {
    const dir = direction === 'desc' ? -1 : 1;
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
    if (order === 'asc' || order === 'ascending') return 'asc';
    if (order === 'desc' || order === 'descending') return 'desc';
    return 'desc';
  };

  const getDropAccessRule = (stream) => {
    const rule = stream?.drop_policy?.access_rule;
    if (rule === 'any_free' || rule === 'first_free') return 'any_free';
    return 'preceding_empty';
  };

  const getNextPickCandidate = (pickGroupId, order, reserved) => {
    const groupSites = sortWorksites(getGroupWorksites(pickGroupId), order);
    for (const site of groupSites) {
      const state = getWorksiteState(site.id);
      if (reserved?.has(site.id)) continue;
      if (state.blocked) continue;
      if (state.occupancy === 'filled') {
        return site;
      }
    }
    return null;
  };

  const getNextDropCandidate = (dropGroups, order, reserved, accessRule) => {
    const allowShadowed = accessRule === 'any_free';
    for (const groupId of dropGroups) {
      const groupSites = sortWorksites(getGroupWorksites(groupId), order);
      let blockedAhead = false;
      for (const site of groupSites) {
        const state = getWorksiteState(site.id);
        if (state.blocked || state.occupancy === 'filled' || reserved?.has(site.id)) {
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

  const dispatchStreamTasks = () => {
    if (!packagingConfig?.streams?.length || !PackagingEngine) return;
    let available = getDispatchableRobots().filter((robot) => robot.pos);
    if (!available.length) return;
    let loopGuard = available.length;

    while (available.length && loopGuard > 0) {
      loopGuard -= 1;
      const result = PackagingEngine.planStreamDispatch({
        config: packagingConfig,
        bufferState,
        lineRequests
      });
      if (!result || !result.action) break;
      const { action, nextBufferState, nextLineRequests } = result;
      const pickPos = resolvePointPosition(action.pickPoint);
      const dropPos = resolvePointPosition(action.dropPoint);
      if (!pickPos || !dropPos) break;
      const robot = selectRobotForDispatch(available, { pickPos, dropPos });
      if (!robot) break;

      bufferState = nextBufferState;
      lineRequests = nextLineRequests;

      const task = createTask({
        streamId: action.streamId,
        robotId: robot.id,
        pickId: action.pickId,
        dropId: action.dropId,
        kind: action.streamId,
        meta: {
          goodsType: action.goodsType,
          lineId: action.lineId,
          bufferCell: action.bufferCell,
          targetBufferCell: action.targetBufferCell
        }
      });
      assignTaskToRobot(robot, task, pickPos, dropPos);
      available = available.filter((item) => item.id !== robot.id);
    }
  };

  const assignTaskToRobot = (robot, task, pickPos, dropPos) => {
    const existing = getRobotRuntime(robot.id);
    const pickSite = worksites.find((site) => site.id === task.pickId) || null;
    const dropSite = worksites.find((site) => site.id === task.dropId) || null;
    if (existing?.autoPark && existing.phase === 'to_park') {
      if (existing.route?.segments?.length) {
        const queued = queueTaskAfterAutoPark(
          robot,
          existing,
          task,
          pickPos,
          dropPos,
          pickSite,
          dropSite
        );
        if (queued) return;
      }
      robotRuntime.delete(robot.id);
      dropEntryHoldWaiterCache(robot.id);
      releaseRobotEdgeLocks(robot.id);
      refreshRouteSchedulesAfterRelease(robot.id);
    }
    const runtime = {
      mode: 'auto',
      phase: 'to_pick',
      taskId: task.id,
      streamId: task.streamId || null,
      pickId: task.pickId,
      dropId: task.dropId,
      dropGroup: task.dropGroup || null,
      pickNodeId: pickSite?.point || null,
      dropNodeId: dropSite?.point || null,
      target: { ...pickPos },
      targetHeading: null,
      route: null,
      routeGoal: null,
      dropPos: { ...dropPos },
      waitUntil: null,
      paused: false,
      avoidance: null,
      avoidanceHold: false,
      blockedReason: null,
      blockedObstacleId: null
    };
    setRuntimeRoute(runtime, robot, pickPos, runtime.pickNodeId);
    robotRuntime.set(robot.id, runtime);
    updateRobotState(robot.id, { task: task.id, activity: 'to_pick' });
  };

  const dispatchWorkflowTasks = () => {
    if (packagingConfig?.streams?.length) return;
    if (!workflowData?.streams?.length) return;
    let available = getDispatchableRobots().filter((robot) => robot.pos);
    if (!available.length) return;
    const reserved = getActiveTaskRefs();
    const reservedPicks = new Set(reserved.pickIds);
    const reservedDrops = new Set(reserved.dropIds);
    let loopGuard = available.length * workflowData.streams.length;

    while (available.length && loopGuard > 0) {
      loopGuard -= 1;
      let dispatched = false;
      for (const stream of workflowData.streams) {
        if (!available.length) break;
        const dropOrder = getDropOrder(stream);
        const dropRule = getDropAccessRule(stream);
        const dropGroups = stream.drop_group_order || [];
        const pickCandidate = getNextPickCandidate(stream.pick_group, 'asc', reservedPicks);
        const dropCandidate = getNextDropCandidate(dropGroups, dropOrder, reservedDrops, dropRule);
        if (!pickCandidate || !dropCandidate) continue;
        const pickPos = resolveWorksiteTargetPos(pickCandidate);
        const dropPos = resolveWorksiteTargetPos(dropCandidate.site);
        if (!pickPos || !dropPos) continue;
        const robot = selectRobotForDispatch(available, { pickPos, dropPos });
        if (!robot) break;
        reservedPicks.add(pickCandidate.id);
        reservedDrops.add(dropCandidate.site.id);

        const task = createTask({
          streamId: stream.id,
          robotId: robot.id,
          pickId: pickCandidate.id,
          dropId: dropCandidate.site.id,
          dropGroup: dropCandidate.groupId
        });
        assignTaskToRobot(robot, task, pickPos, dropPos);
        available = available.filter((item) => item.id !== robot.id);
        dispatched = true;
      }
      if (!dispatched) break;
    }
  };

  const dispatchAvailableRobots = () => {
    if (packagingConfig?.streams?.length) {
      dispatchStreamTasks();
      dispatchIdleRobotsToParking();
      return;
    }
    dispatchWorkflowTasks();
    dispatchIdleRobotsToParking();
  };

  const dispatchIdleRobotsToParking = () => {
    if (!robots.length) return;
    robots.forEach((robot) => {
      if (!robot?.id || !robot.pos) return;
      if (!canDispatchRobot(robot)) return;
      if (getRobotRuntime(robot.id)) return;
      const parkTarget = resolveRobotParkingPoint(robot, {
        preferAssigned: true,
        assignedOnly: true
      });
      const parkPos = parkTarget?.pos || null;
      if (!parkPos) return;
      const dist = distanceBetweenPoints(robot.pos, parkPos);
      if (dist <= PARKING_OCCUPANCY_DISTANCE) return;
      const parkNodeId =
        parkTarget?.id && navGraph?.nodesById?.has(parkTarget.id) ? parkTarget.id : null;
      const runtime = {
        mode: 'auto',
        phase: 'to_park',
        taskId: null,
        streamId: null,
        pickId: null,
        dropId: null,
        dropGroup: null,
        pickNodeId: null,
        dropNodeId: null,
        target: { ...parkPos },
        targetHeading: null,
        route: null,
        routeGoal: null,
        dropPos: null,
        waitUntil: null,
        paused: false,
        avoidance: null,
        avoidanceHold: false,
        blockedReason: null,
        blockedObstacleId: null,
        autoPark: true
      };
      setRuntimeRoute(runtime, robot, parkPos, parkNodeId);
      robotRuntime.set(robot.id, runtime);
      updateRobotState(robot.id, { activity: 'to_park' });
    });
  };

  const getRobotById = (id) => robots.find((item) => item.id === id);

  const getRobotRuntime = (robotId) => robotRuntime.get(robotId) || null;

  const failRuntimeTask = (robotId, phaseLabel) => {
    const runtime = getRobotRuntime(robotId);
    if (!runtime) return false;
    if (runtime.taskId) {
      updateTask(runtime.taskId, { status: 'failed', phase: phaseLabel });
    }
    robotRuntime.delete(robotId);
    dropEntryHoldWaiterCache(robotId);
    releaseRobotEdgeLocks(robotId);
    refreshRouteSchedulesAfterRelease(robotId);
    const robot = getRobotById(robotId);
    if (robot) {
      ensureRobotMotion(robot);
      robot.speed = 0;
    }
    updateRobotState(robotId, { task: null, activity: phaseLabel });
    return true;
  };

  const findAlternativeDrop = (runtime) => {
    let dropGroups = [];
    let order = 'desc';
    let rule = 'preceding_empty';
    if (runtime.dropGroup) {
      dropGroups = [runtime.dropGroup];
    }
    const stream =
      workflowData?.streams?.find((entry) => entry.id === runtime.streamId) || workflowData?.streams?.[0];
    if (stream?.drop_group_order?.length) {
      dropGroups = stream.drop_group_order;
      order = getDropOrder(stream);
      rule = getDropAccessRule(stream);
    }
    if (!dropGroups.length) return null;
    return getNextDropCandidate(dropGroups, order, null, rule);
  };

  const simulatePickProblem = (robotId) => {
    const runtime = getRobotRuntime(robotId);
    if (!runtime || runtime.mode !== 'auto') return false;
    if (!['to_pick', 'picking'].includes(runtime.phase)) return false;
    setWorksiteBlocked(runtime.pickId, true);
    return failRuntimeTask(robotId, 'pick_blocked');
  };

  const simulatePickRobotBlocked = (robotId) => {
    const runtime = getRobotRuntime(robotId);
    if (runtime) {
      if (runtime.blockedReason == null) {
        runtime.pausedBeforeBlocked = runtime.paused;
      }
      runtime.paused = true;
      runtime.blockedReason = 'pick';
      runtime.blockedObstacleId = null;
      if (runtime.taskId) {
        updateTask(runtime.taskId, { status: 'paused', phase: 'blocked_pick' });
      }
      if (trafficStrategy?.useTimeReservations?.()) {
        releaseTimeReservations(robotId);
        if (runtime.route) {
          runtime.route.schedule = null;
          runtime.route.scheduleProfile = null;
        }
        refreshRouteSchedulesAfterRelease(robotId);
      }
    }
    updateRobotState(robotId, { blocked: true, activity: 'blocked_pick' });
    return true;
  };

  const simulateDropProblem = (robotId) => {
    const runtime = getRobotRuntime(robotId);
    if (!runtime || runtime.mode !== 'auto') return false;
    if (!['to_drop', 'dropping'].includes(runtime.phase)) return false;
    setWorksiteBlocked(runtime.dropId, true);
    const nextDrop = findAlternativeDrop(runtime);
    if (nextDrop && nextDrop.site && nextDrop.site.id !== runtime.dropId) {
      const nextPos = resolveWorksiteTargetPos(nextDrop.site);
      if (nextPos) {
        runtime.dropId = nextDrop.site.id;
        runtime.dropNodeId = nextDrop.site.point || null;
        runtime.dropPos = { ...nextPos };
        runtime.phase = 'to_drop';
        const robot = getRobotById(robotId);
        if (robot) {
          setRuntimeRoute(runtime, robot, runtime.dropPos, runtime.dropNodeId);
        } else {
          runtime.target = { ...nextPos };
        }
        updateTask(runtime.taskId, { dropId: runtime.dropId, phase: 'reroute_drop' });
        updateRobotState(robotId, { activity: 'reroute_drop' });
        return true;
      }
    }
    return failRuntimeTask(robotId, 'drop_blocked');
  };

  const addObstacle = (pos, options = {}) => {
    if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return null;
    let id = options.id ? String(options.id) : null;
    if (id && obstacles.some((obstacle) => obstacle.id === id)) {
      id = null;
    }
    if (!id) {
      id = `obs-${obstacleIdSeq++}`;
    } else {
      const match = id.match(/^obs-(\d+)$/);
      if (match) {
        obstacleIdSeq = Math.max(obstacleIdSeq, Number(match[1]) + 1);
      }
    }
    const obstacle = {
      id,
      x: pos.x,
      y: pos.y,
      radius: Number.isFinite(options.radius) ? Math.max(0, options.radius) : OBSTACLE_RADIUS,
      mode: options.mode === 'avoid' ? 'avoid' : 'block'
    };
    obstacles = [...obstacles, obstacle];
    return obstacle;
  };

  const addObstacleForRobot = (robotId, mode) => {
    const robot = getRobotById(robotId);
    if (!robot || !robot.pos) return null;
    const runtime = getRobotRuntime(robotId);
    const target = runtime?.target || null;
    let pos = null;
    if (target) {
      const dx = target.x - robot.pos.x;
      const dy = target.y - robot.pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.01) {
        const step = Math.max(OBSTACLE_RADIUS * 1.8, Math.min(dist * 0.6, dist - OBSTACLE_RADIUS));
        const ratio = step / dist;
        pos = { x: robot.pos.x + dx * ratio, y: robot.pos.y + dy * ratio };
      }
    }
    if (!pos) {
      pos = { x: robot.pos.x + OBSTACLE_RADIUS * 1.5, y: robot.pos.y };
    }
    return addObstacle(pos, { mode });
  };

  const simulateDriveProblem = (robotId, mode) => {
    return Boolean(addObstacleForRobot(robotId, mode));
  };

  const clearRobotBlock = (robotId, options = {}) => {
    const robot = getRobotById(robotId);
    if (!robot) return false;
    const runtime = getRobotRuntime(robotId);
    let taskRuntime = runtime;
    const force = options && options.force === true;
    const allowCollision = options && options.allowCollision === true;
    const collisionBlocked =
      runtime?.blockedReason === 'collision' ||
      pausedAutoRuntime.get(robotId)?.blockedReason === 'collision' ||
      robot.manualBlockedReason === 'collision';
    if (collisionBlocked && !allowCollision && !force) {
      return false;
    }
    if (
      runtime &&
      runtime.blockedReason === 'no_route' &&
      !force &&
      runtime.routeGoal?.pos
    ) {
      setRuntimeRoute(runtime, robot, runtime.routeGoal.pos, runtime.routeGoal.nodeId);
      if (!runtime.route && runtime.blockedReason === 'no_route') {
        return false;
      }
    }
    if (runtime && runtime.blockedReason) {
      const restorePaused = runtime.pausedBeforeBlocked;
      runtime.paused = Boolean(restorePaused);
      runtime.blockedReason = null;
      runtime.blockedObstacleId = null;
      delete runtime.pausedBeforeBlocked;
      clearRuntimeStall(runtime);
      clearRuntimeStuck(runtime);
    }
    if (!runtime) {
      const pausedRuntime = pausedAutoRuntime.get(robotId);
      if (pausedRuntime && pausedRuntime.blockedReason) {
        const restorePaused =
          typeof pausedRuntime.pausedBeforeBlocked !== 'undefined'
            ? pausedRuntime.pausedBeforeBlocked
            : pausedRuntime.wasPaused;
        pausedRuntime.paused = Boolean(restorePaused);
        pausedRuntime.wasPaused = Boolean(restorePaused);
        pausedRuntime.blockedReason = null;
        pausedRuntime.blockedObstacleId = null;
        delete pausedRuntime.pausedBeforeBlocked;
        clearRuntimeStall(pausedRuntime);
        clearRuntimeStuck(pausedRuntime);
        taskRuntime = pausedRuntime;
      }
    }
    if (taskRuntime?.taskId) {
      const updates = { status: taskRuntime.paused ? 'paused' : 'in_progress' };
      if (taskRuntime.phase) {
        updates.phase = taskRuntime.phase;
      }
      updateTask(taskRuntime.taskId, updates);
    }
    let activity = robot.manualMode ? 'manual_idle' : 'idle';
    if (runtime) {
      if (runtime.mode === 'manual') {
        activity = runtime.phase === 'manual_action' ? 'manual_action' : 'manual_move';
      } else {
        activity = runtime.phase || 'in_progress';
      }
    } else if (
      robot.activity &&
      !(typeof robot.activity === 'string' && robot.activity.startsWith('blocked'))
    ) {
      activity = robot.activity;
    }
    updateRobotState(robotId, {
      blocked: false,
      activity,
      manualBlocked: false,
      manualBlockedReason: null,
      manualBlockedObstacleId: null
    });
    if (runtime && runtime.route && !runtime.paused && trafficStrategy?.useTimeReservations?.()) {
      refreshRouteSchedulesAfterRelease(null);
    }
    return true;
  };

  const clearRobotCollision = (robotId) => {
    const robot = getRobotById(robotId);
    if (!robot) return false;
    const runtime = getRobotRuntime(robotId);
    const pausedRuntime = pausedAutoRuntime.get(robotId);
    const collisionBlocked =
      runtime?.blockedReason === 'collision' ||
      pausedRuntime?.blockedReason === 'collision' ||
      robot.manualBlockedReason === 'collision';
    if (!collisionBlocked) return false;
    const cleared = clearRobotBlock(robotId, { allowCollision: true, force: true });
    if (cleared) {
      collisionBlockedUntil.delete(robotId);
      collisionClearSince.delete(robotId);
    }
    return cleared;
  };

  const tryObstacleReplan = (robot, runtime) => {
    if (!robot || !runtime) return false;
    if (!runtime.routeGoal?.pos) return false;
    const now = Date.now();
    const nextAt = Number.isFinite(runtime.obstacleReplanAt)
      ? runtime.obstacleReplanAt
      : now;
    if (now < nextAt) return false;
    runtime.obstacleReplanAt = now + OBSTACLE_REPLAN_MS;
    let needsReplan = runtime.blockedReason === 'obstacle' || runtime.blockedReason === 'no_route';
    let triggeredByObstacle = runtime.blockedReason === 'obstacle';
    if (!needsReplan && runtime.route?.segments?.length) {
      const startIndex = Math.max(0, runtime.route.segmentIndex || 0);
      for (let i = startIndex; i < runtime.route.segments.length; i += 1) {
        const segment = runtime.route.segments[i];
        if (!segment?.polyline) continue;
        if (
          isEdgeBlocked(segment, {
            robotId: robot.id,
            robotWidth: getRobotWidth(robot)
          })
        ) {
          needsReplan = true;
          triggeredByObstacle = true;
          break;
        }
      }
    }
    if (!needsReplan) return false;
    const blockedReason = runtime.blockedReason;
    setRuntimeRoute(runtime, robot, runtime.routeGoal.pos, runtime.routeGoal.nodeId, {
      constraints: runtime.cbsConstraints,
      replanReason: triggeredByObstacle ? 'obstacle' : blockedReason || 'replan',
      countReplan: true
    });
    if (!runtime.route) return false;
    if (triggeredByObstacle) {
      runtime.replannedForObstacle = true;
    }
    if (blockedReason === 'obstacle') {
      if (!isRouteBlockedByObstacle(runtime.route, robot)) {
        clearRobotBlock(robot.id);
      }
    } else if (blockedReason === 'no_route') {
      clearRobotBlock(robot.id, { force: true });
    }
    return true;
  };

  const tickSimulation = (deltaMs) => {
    const now = Date.now();
    tickCounter += 1;
    entryHoldWaiterCache = null;
    entryHoldWaiterCacheDirty = true;
    if (trafficStrategy?.useTimeReservations?.()) {
      pruneTimeReservations(now);
    }
    refreshAvoidanceLocks();
    refreshAvoidanceZones();
    refreshNodeLocks(now);
    expireEdgeLocks(now);
    dispatchAvailableRobots();
    const dt = deltaMs / 1000;
    trafficSnapshot = buildTrafficSnapshot();
    try {
      const runtimeEntries = Array.from(robotRuntime.entries()).sort((a, b) =>
        String(a[0]).localeCompare(String(b[0]))
      );
      runtimeEntries.forEach(([robotId, runtime]) => {
        const robot = robots.find((item) => item.id === robotId);
        if (!robot || !runtime) return;
        tryObstacleReplan(robot, runtime);
        if (runtime.paused) {
          applyKinematicMotion(robot, robot.heading || 0, 0, dt);
          return;
        }

        if (runtime.mode === 'manual') {
          if (runtime.phase === 'manual_move') {
            const hold = getParkingHold(robot, runtime);
            if (hold) {
              markRuntimeStall(runtime, hold.reason, hold.blockerId);
              ensureRobotMotion(robot);
              robot.speed = 0;
              return;
            }
            const result = advanceRobotToward(robot, runtime, deltaMs);
            if (!result.arrived) {
              return;
            }
            if (runtime.manualAction) {
              runtime.phase = 'manual_action';
              runtime.waitUntil = Date.now() + actionWaitMs;
              updateRobotState(robotId, { activity: 'manual_action' });
            } else {
              robotRuntime.delete(robotId);
              dropEntryHoldWaiterCache(robotId);
              releaseRobotEdgeLocks(robotId);
              refreshRouteSchedulesAfterRelease(robotId);
              updateRobotState(robotId, {
                activity: robot.manualMode ? 'manual_idle' : 'idle'
              });
            }
          } else if (runtime.phase === 'manual_action') {
            if (Date.now() >= runtime.waitUntil) {
              robotRuntime.delete(robotId);
              dropEntryHoldWaiterCache(robotId);
              releaseRobotEdgeLocks(robotId);
              refreshRouteSchedulesAfterRelease(robotId);
              updateRobotState(robotId, {
                activity: robot.manualMode ? 'manual_idle' : 'idle'
              });
            }
          }
          return;
        }

        if (runtime.stuckRetryAt) {
          if (now < runtime.stuckRetryAt) {
            applyKinematicMotion(robot, robot.heading || 0, 0, dt);
            return;
          }
          clearRuntimeStuck(runtime);
          if (runtime.routeGoal?.pos) {
            setRuntimeRoute(runtime, robot, runtime.routeGoal.pos, runtime.routeGoal.nodeId);
          }
        }

        if (runtime.phase === 'yield') {
          if (!runtime.yieldStartedAt) {
            runtime.yieldStartedAt = now;
            runtime.yieldAttempts = runtime.yieldAttempts || 1;
          } else if (now - runtime.yieldStartedAt > YIELD_TIMEOUT_MS) {
            const attempts = Number.isFinite(runtime.yieldAttempts) ? runtime.yieldAttempts : 1;
            if (attempts >= 2) {
              enterStuckState(robot, runtime, 'yield_timeout');
              return;
            }
            const baseBackoff = resolveStrategyValue(
              trafficStrategy?.getYieldBackoffDistance?.(robot),
              YIELD_BACKOFF_DISTANCE
            );
            const backoff = baseBackoff * (1 + attempts * 0.5);
            const nextTarget = computeYieldTarget(robot, runtime, backoff);
            if (!nextTarget) {
              enterStuckState(robot, runtime, 'yield_timeout');
              return;
            }
            runtime.target = { ...nextTarget };
            runtime.targetHeading = null;
            runtime.route = null;
            runtime.avoidance = null;
            runtime.lastYieldAt = now;
            runtime.yieldStartedAt = now;
            runtime.yieldAttempts = attempts + 1;
            clearRuntimeStall(runtime);
            clearRuntimeStuck(runtime);
            releaseRobotEdgeLocks(robot.id);
            refreshRouteSchedulesAfterRelease(robot.id);
            runtime.entryHold = null;
            runtime.entryHoldBypass = null;
            invalidateEntryHoldWaiterCache();
            runtime.edgeLockHold = null;
            runtime.nodeLockHold = null;
            updateRobotState(robotId, { activity: 'yielding' });
            if (runtime.taskId) {
              updateTask(runtime.taskId, { phase: 'yield' });
            }
          }
          const result = advanceRobotToward(robot, runtime, deltaMs);
          if (result.blocked || !result.arrived) {
            return;
          }
          let resumePhase =
            runtime.resumePhase && runtime.resumePhase !== 'yield' ? runtime.resumePhase : null;
          const resumeGoal = runtime.resumeRouteGoal || runtime.routeGoal;
          if (!resumePhase) {
            resumePhase = inferYieldResumePhase(robot, runtime, resumeGoal);
          }
          runtime.resumePhase = null;
          runtime.resumeRouteGoal = null;
          runtime.target = null;
          runtime.targetHeading = null;
          if (resumePhase) {
            runtime.phase = resumePhase;
          } else {
            runtime.phase = null;
          }
          if (resumeGoal?.pos && resumePhase) {
            setRuntimeRoute(runtime, robot, resumeGoal.pos, resumeGoal.nodeId);
          } else if (!resumePhase) {
            runtime.routeGoal = null;
            runtime.route = null;
          }
          runtime.yieldStartedAt = null;
          runtime.yieldAttempts = 0;
          if (runtime.phase && runtime.phase !== 'yield') {
            updateRobotState(robotId, { activity: runtime.phase });
            if (runtime.taskId) {
              updateTask(runtime.taskId, { phase: runtime.phase });
            }
          } else {
            updateRobotState(robotId, { activity: 'idle' });
          }
          return;
        }

        if (runtime.phase === 'to_pick') {
          const result = advanceRobotToward(robot, runtime, deltaMs);
          if (!result.arrived) {
            if (maybeTriggerYield(robot, runtime)) return;
            return;
          }
          runtime.phase = 'picking';
          runtime.waitUntil = Date.now() + actionWaitMs;
          updateRobotState(robotId, { activity: 'picking' });
          updateTask(runtime.taskId, { phase: 'picking' });
        } else if (runtime.phase === 'picking') {
          if (Date.now() >= runtime.waitUntil) {
            setWorksiteOccupancy(runtime.pickId, 'empty');
            runtime.phase = 'to_drop';
            setRuntimeRoute(runtime, robot, runtime.dropPos, runtime.dropNodeId);
            updateRobotState(robotId, { activity: 'to_drop' });
            updateTask(runtime.taskId, { phase: 'to_drop' });
          }
        } else if (runtime.phase === 'to_drop') {
          const result = advanceRobotToward(robot, runtime, deltaMs);
          if (!result.arrived) {
            if (maybeTriggerYield(robot, runtime)) return;
            return;
          }
          runtime.phase = 'dropping';
          runtime.waitUntil = Date.now() + actionWaitMs;
          updateRobotState(robotId, { activity: 'dropping' });
          updateTask(runtime.taskId, { phase: 'dropping' });
        } else if (runtime.phase === 'dropping') {
          if (Date.now() >= runtime.waitUntil) {
            setWorksiteOccupancy(runtime.dropId, 'filled');
            const parkTarget = resolveRobotParkingPoint(robot, {
              preferAssigned: true,
              assignedOnly: true
            });
            const park = parkTarget?.pos || null;
            if (!park) {
              robotRuntime.delete(robotId);
              dropEntryHoldWaiterCache(robotId);
              releaseRobotEdgeLocks(robotId);
              refreshRouteSchedulesAfterRelease(robotId);
              updateRobotState(robotId, { activity: 'idle', task: null });
              updateTask(runtime.taskId, { status: 'completed', phase: 'done' });
              return;
            }
            const parkNodeId =
              parkTarget?.id && navGraph?.nodesById?.has(parkTarget.id) ? parkTarget.id : null;
            runtime.phase = 'to_park';
            setRuntimeRoute(runtime, robot, park, parkNodeId);
            updateRobotState(robotId, { activity: 'to_park' });
            updateTask(runtime.taskId, { phase: 'to_park' });
          }
        } else if (runtime.phase === 'to_park') {
          const hold = getParkingHold(robot, runtime);
          if (hold) {
            markRuntimeStall(runtime, hold.reason, hold.blockerId);
            ensureRobotMotion(robot);
            robot.speed = 0;
            return;
          }
          const result = advanceRobotToward(robot, runtime, deltaMs);
          if (!result.arrived) {
            if (maybeTriggerYield(robot, runtime)) return;
            return;
          }
          robotRuntime.delete(robotId);
          dropEntryHoldWaiterCache(robotId);
          releaseRobotEdgeLocks(robotId);
          refreshRouteSchedulesAfterRelease(robotId);
          updateRobotState(robotId, { activity: 'idle', task: null });
          updateTask(runtime.taskId, { status: 'completed', phase: 'done' });
        }
      });
    } finally {
      trafficSnapshot = null;
    }
    detectRobotCollisions(now);
    resolveWaitGraphDeadlocks(now);
    logRobotStateTick();
  };

  const start = () => {
    if (timer) return;
    lastTickMs = Date.now();
    timer = setInterval(() => {
      const now = Date.now();
      const deltaMs = lastTickMs ? now - lastTickMs : tickMs;
      lastTickMs = now;
      lastTickAt = new Date().toISOString();
      try {
        tickSimulation(deltaMs);
      } catch (err) {
        lastError = err.message || 'sim_tick_failed';
      }
    }, tickMs);
  };

  const stopSim = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    lastTickMs = null;
  };

  const step = (options = {}) => {
    const requested = Number.parseInt(options.count || 1, 10);
    const steps = Number.isFinite(requested) && requested > 0 ? requested : 1;
    const rawDelta = options.deltaMs;
    const parsedDelta = Number.isFinite(rawDelta) ? Number(rawDelta) : Number.parseFloat(rawDelta);
    const deltaMs = Number.isFinite(parsedDelta) ? Math.max(0, parsedDelta) : tickMs;
    let error = null;
    for (let i = 0; i < steps; i += 1) {
      const now = Date.now();
      lastTickMs = now;
      lastTickAt = new Date(now).toISOString();
      try {
        tickSimulation(deltaMs);
      } catch (err) {
        lastError = err.message || 'sim_tick_failed';
        error = lastError;
        break;
      }
    }
    return {
      ok: !error,
      steps,
      deltaMs,
      tickMs,
      lastTickAt,
      lastError
    };
  };

  const loadBundle = (bundle = {}) => {
    graphData = bundle.graph || null;
    workflowData = bundle.workflow || null;
    packagingConfig = bundle.packaging || null;
    robotsConfig = bundle.robotsConfig || null;
    dispatchStrategy = resolveDispatchStrategy(robotsConfig);
    trafficStrategy = buildTrafficStrategy(robotsConfig);
    rebuildRobustnessState(robotsConfig, graphData);
    reservationTable = null;
    reservationConfig = null;
    navGraph = buildNavigationGraph(graphData);
    parkingPoints = collectParkingPoints();
    rebuildParkingIndex();
    worksites = buildWorksites(workflowData || {});
    worksiteState = {};
    worksites.forEach((site) => {
      worksiteState[site.id] = { occupancy: 'empty', blocked: false };
    });
    robots = buildRobots(graphData || {}, worksites, robotsConfig || {});
    robotParking = buildRobotParkingTargets(robots);
    edgeConflictThresholds = resolveEdgeConflictThresholds(robots);
    maxRobotHead = resolveMaxRobotHead(robots);
    edgeConflictGroups = buildEdgeConflictGroups();
    yieldBays = buildYieldBays(graphData);
    tasks = buildTasks();
    taskCounter = 1;
    lastTaskStatusByRobot = new Map();
    robotRuntime = new Map();
    scheduleDelayStats = new Map();
    pausedAutoRuntime = new Map();
    robotDiagnostics = new Map();
    obstacles = [];
    obstacleIdSeq = 1;
    collisionOverlap = new Map();
    collisionBlockedUntil = new Map();
    collisionClearSince = new Map();
    edgeLocks = new Map();
    edgeQueues = new Map();
    edgeDirectionLocks = new Map();
    avoidanceZones = new Map();
    avoidanceLocks = new Map();
    nodeLocks = new Map();
    initPackagingState();
    start();
  };

  const initPackagingState = () => {
    if (!packagingConfig || !PackagingEngine) {
      bufferState = {};
      lineRequests = [];
      opsOverrides = { buffers: {}, places: {} };
      return;
    }
    bufferState = {};
    (packagingConfig.buffers || []).forEach((buffer) => {
      bufferState[buffer.id] = PackagingEngine.buildBufferState(buffer, packagingConfig);
    });
    lineRequests = PackagingEngine.createLineRequests(packagingConfig, null);
    opsOverrides = { buffers: {}, places: {} };
  };

  const rebuildRobustnessState = (config, graph) => {
    const trafficConfig = config?.traffic || {};
    if (TrafficStrategies?.resolveRobustnessProfile) {
      robustnessProfile = TrafficStrategies.resolveRobustnessProfile(trafficConfig);
    } else {
      robustnessProfile = null;
    }
    timingModel =
      robustnessProfile && TimingModel ? new TimingModel(robustnessProfile.timingModel || {}) : null;
    trafficMetrics = buildTrafficMetrics(robustnessProfile);
    chaosConfig = buildChaosConfig(trafficConfig);
    configureEventLog(trafficConfig);
    criticalSectionIndex = buildCriticalSectionIndex(graph, robustnessProfile);
    criticalSectionTable =
      criticalSectionIndex?.enabled && CriticalSectionTable ? new CriticalSectionTable() : null;
    criticalSectionConfig = criticalSectionIndex?.enabled ? criticalSectionIndex : null;
    scheduleDelayStats = new Map();
  };

  const buildTrafficStrategy = (config) => {
    if (!TrafficStrategies) return null;
    const trafficConfig = config?.traffic || {};
    const name = resolveTrafficStrategyName(config);
    const strategy = TrafficStrategies.create(name, {
      ...trafficConfig,
      baseStopDistance: ROBOT_STOP_DISTANCE,
      baseYieldDistance: ROBOT_YIELD_DISTANCE,
      baseRadius: ROBOT_RADIUS
    });
    if (!strategy) {
      throw new Error(`invalid_traffic_strategy:${name || "unknown"}`);
    }
    return strategy;
  };

  const resetTrafficState = () => {
    reservationTable = null;
    reservationConfig = null;
    edgeLocks = new Map();
    edgeQueues = new Map();
    edgeDirectionLocks = new Map();
    avoidanceZones = new Map();
    avoidanceLocks = new Map();
    nodeLocks = new Map();
    criticalSectionTable =
      criticalSectionIndex?.enabled && CriticalSectionTable ? new CriticalSectionTable() : null;
  };

  const pauseRuntimeForManual = (robotId) => {
    const runtime = getRobotRuntime(robotId);
    if (!runtime || runtime.mode === 'manual') return null;
    runtime.mode = runtime.mode || 'auto';
    runtime.wasPaused = Boolean(runtime.paused);
    runtime.paused = true;
    clearRuntimeStall(runtime);
    clearRuntimeStuck(runtime);
    runtime.entryHold = null;
    runtime.entryHoldBypass = null;
    invalidateEntryHoldWaiterCache();
    runtime.edgeLockHold = null;
    runtime.nodeLockHold = null;
    runtime.lastTrafficBlock = null;
    runtime.avoidance = null;
    runtime.avoidanceHold = false;
    runtime.resumePhase = null;
    runtime.resumeRouteGoal = null;
    runtime.yieldStartedAt = null;
    runtime.yieldAttempts = 0;
    robotRuntime.delete(robotId);
    dropEntryHoldWaiterCache(robotId);
    releaseRobotEdgeLocks(robotId);
    refreshRouteSchedulesAfterRelease(robotId);
    if (runtime.route) {
      runtime.route.schedule = null;
      runtime.route.scheduleProfile = null;
    }
    pausedAutoRuntime.set(robotId, runtime);
    const robot = getRobotById(robotId);
    if (robot) {
      ensureRobotMotion(robot);
      robot.speed = 0;
    }
    if (runtime.taskId) {
      updateTask(runtime.taskId, { status: 'paused' });
    }
    return runtime;
  };

  const restorePausedRuntime = (robotId) => {
    const runtime = pausedAutoRuntime.get(robotId);
    if (!runtime) return null;
    pausedAutoRuntime.delete(robotId);
    const wasPaused = Boolean(runtime.wasPaused);
    delete runtime.wasPaused;
    runtime.mode = runtime.mode || 'auto';
    runtime.paused = wasPaused;
    clearRuntimeStall(runtime);
    clearRuntimeStuck(runtime);
    runtime.entryHold = null;
    runtime.entryHoldBypass = null;
    invalidateEntryHoldWaiterCache();
    runtime.edgeLockHold = null;
    runtime.nodeLockHold = null;
    runtime.lastTrafficBlock = null;
    runtime.avoidanceHold = false;
    runtime.resumePhase = null;
    runtime.resumeRouteGoal = null;
    runtime.yieldStartedAt = null;
    runtime.yieldAttempts = 0;
    const robot = getRobotById(robotId);
    if (
      robot &&
      runtime.routeGoal &&
      ['to_pick', 'to_drop', 'to_park'].includes(runtime.phase)
    ) {
      setRuntimeRoute(runtime, robot, runtime.routeGoal.pos, runtime.routeGoal.nodeId);
    }
    robotRuntime.set(robotId, runtime);
    if (robot && runtime.route && trafficStrategy?.useTimeReservations?.() && !runtime.paused) {
      refreshRouteSchedulesAfterRelease(null);
    }
    if (runtime.taskId) {
      updateTask(runtime.taskId, { status: runtime.paused ? 'paused' : 'in_progress' });
    }
    return runtime;
  };

  const stopManualRuntime = (robotId) => {
    const runtime = getRobotRuntime(robotId);
    if (!runtime || runtime.mode !== 'manual') return;
    robotRuntime.delete(robotId);
    dropEntryHoldWaiterCache(robotId);
    releaseRobotEdgeLocks(robotId);
    refreshRouteSchedulesAfterRelease(robotId);
    const robot = getRobotById(robotId);
    if (robot) {
      ensureRobotMotion(robot);
      robot.speed = 0;
    }
  };

  const setRobotManualMode = (robotId, enabled) => {
    const robot = getRobotById(robotId);
    if (!robot) return null;
    if (robot.manualMode === enabled) {
      return robot;
    }
    if (enabled) {
      pauseRuntimeForManual(robotId);
      const paused = pausedAutoRuntime.get(robotId);
      if (robot.blocked && paused?.blockedReason) {
        clearRobotBlock(robotId, { force: true });
      } else if (robot.manualBlocked) {
        clearRobotBlock(robotId, { force: true });
      }
      robot.lastMotionAt = null;
      const priorDispatchable = robot.dispatchable !== false;
      updateRobotState(robotId, {
        manualMode: true,
        activity: robot.task ? 'manual_override' : 'manual_idle',
        dispatchable: false,
        dispatchableBeforeManual: priorDispatchable
      });
      return getRobotById(robotId);
    }
    stopManualRuntime(robotId);
    const restored = restorePausedRuntime(robotId);
    const nextActivity = restored
      ? restored.mode === 'manual'
        ? restored.phase === 'manual_action'
          ? 'manual_action'
          : 'manual_move'
        : restored.phase || 'in_progress'
      : 'idle';
    const hadManualBlock = Boolean(robot.manualBlocked);
    const nextBlocked = hadManualBlock ? false : Boolean(robot.blocked);
    const hasManualBackup = typeof robot.dispatchableBeforeManual === 'boolean';
    const restoreDispatchable =
      hasManualBackup && robot.dispatchable === false
        ? robot.dispatchableBeforeManual
        : robot.dispatchable !== false;
    robot.lastMotionAt = null;
    updateRobotState(robotId, {
      manualMode: false,
      activity: nextActivity,
      blocked: nextBlocked,
      manualBlocked: false,
      manualBlockedReason: null,
      manualBlockedObstacleId: null,
      dispatchable: restoreDispatchable,
      dispatchableBeforeManual: null
    });
    return getRobotById(robotId);
  };

  const setRobotDispatchable = (robotId, dispatchable) => {
    const robot = getRobotById(robotId);
    if (!robot) return null;
    const next = Boolean(dispatchable);
    updateRobotState(robotId, { dispatchable: next });
    if (!next) {
      const runtime = getRobotRuntime(robotId);
      if (runtime && !runtime.paused) {
        toggleNavigationPause(robotId, true);
      }
    }
    return getRobotById(robotId);
  };

  const setRobotControlled = (robotId, controlled) => {
    const robot = getRobotById(robotId);
    if (!robot) return null;
    const next = Boolean(controlled);
    updateRobotState(robotId, { controlled: next });
    if (!next) {
      const runtime = getRobotRuntime(robotId);
      if (runtime && !runtime.paused) {
        toggleNavigationPause(robotId, true);
      }
    }
    return getRobotById(robotId);
  };

  const setRobotPose = (robotId, pose) => {
    const robot = getRobotById(robotId);
    if (!robot || !pose) return false;
    stopNavigation(robotId);
    const nextPos = {
      x: Number.isFinite(pose.x) ? pose.x : robot.pos?.x,
      y: Number.isFinite(pose.y) ? pose.y : robot.pos?.y
    };
    if (!Number.isFinite(nextPos.x) || !Number.isFinite(nextPos.y)) return false;
    robot.pos = { x: nextPos.x, y: nextPos.y };
    if (Number.isFinite(pose.angle)) {
      robot.heading = normalizeAngle(pose.angle);
    }
    robot.speed = 0;
    robot.lastMotionAt = null;
    return true;
  };

  const startManualNavigation = (robotId, pointId, manualAction) => {
    const robot = getRobotById(robotId);
    if (!robot || !robot.manualMode) return false;
    if (!robot.online) return false;
    if (robot.blocked && !robot.manualBlocked) {
      const runtime = getRobotRuntime(robotId);
      if (runtime?.blockedReason === 'collision') {
        clearRobotBlock(robotId, { force: true });
      } else {
      const paused = pausedAutoRuntime.get(robotId);
      if (paused?.blockedReason) {
        clearRobotBlock(robotId, { force: true });
      } else {
        return false;
      }
      }
    } else if (robot.manualBlocked) {
      clearRobotBlock(robotId, { force: true });
    }
    const targetPos = resolvePointPosition(pointId);
    if (!targetPos) return false;
    const runtime = {
      mode: 'manual',
      phase: 'manual_move',
      target: { ...targetPos },
      targetHeading: null,
      route: null,
      routeGoal: null,
      targetPointId: pointId,
      manualAction,
      waitUntil: null,
      paused: false,
      blockedReason: null,
      blockedObstacleId: null
    };
    setRuntimeRoute(runtime, robot, targetPos, pointId);
    robotRuntime.set(robotId, runtime);
    updateRobotState(robotId, { activity: 'manual_move' });
    return true;
  };

  const startManualNavigationToPos = (robotId, targetPos, manualAction) => {
    const robot = getRobotById(robotId);
    if (!robot || !robot.manualMode) return false;
    if (!robot.online) return false;
    if (robot.blocked && !robot.manualBlocked) {
      const runtime = getRobotRuntime(robotId);
      if (runtime?.blockedReason === 'collision') {
        clearRobotBlock(robotId, { force: true });
      } else {
      const paused = pausedAutoRuntime.get(robotId);
      if (paused?.blockedReason) {
        clearRobotBlock(robotId, { force: true });
      } else {
        return false;
      }
      }
    } else if (robot.manualBlocked) {
      clearRobotBlock(robotId, { force: true });
    }
    if (!targetPos || !Number.isFinite(targetPos.x) || !Number.isFinite(targetPos.y)) return false;
    const runtime = {
      mode: 'manual',
      phase: 'manual_move',
      target: { ...targetPos },
      targetHeading: Number.isFinite(targetPos.angle) ? targetPos.angle : null,
      route: null,
      routeGoal: null,
      targetPointId: null,
      manualAction,
      waitUntil: null,
      paused: false,
      blockedReason: null,
      blockedObstacleId: null
    };
    setRuntimeRoute(runtime, robot, targetPos, null);
    robotRuntime.set(robotId, runtime);
    updateRobotState(robotId, { activity: 'manual_move' });
    return true;
  };

  const toggleNavigationPause = (robotId, paused) => {
    const runtime = getRobotRuntime(robotId);
    if (!runtime) return false;
    runtime.paused = paused;
    const robot = getRobotById(robotId);
    if (paused) {
      if (robot && runtime.route) {
        const segment = runtime.route.segments?.[runtime.route.segmentIndex] || null;
        const edgeGroupKey = resolveEdgeLockKey(segment, robot);
        if (edgeGroupKey && segment) {
          const spacing = getTrafficSpacing(robot);
          const minDistance = Math.max(
            EDGE_LOCK_FOLLOW_DISTANCE,
            spacing.stop + resolveForwardStopDistance(robot)
          );
          reserveEdgeLock(
            edgeGroupKey,
            robot.id,
            segment.edgeKey || segment.edgeGroupKey || null,
            runtime.route.segmentProgress,
            segment.totalLength,
            minDistance,
            {
              deterministic: shouldUseDeterministicEdgeLocks(),
              useQueues: shouldUseDeterministicEdgeLocks() || trafficStrategy?.useEdgeQueues?.()
            }
          );
        }
      }
      if (robot && trafficStrategy?.useTimeReservations?.()) {
        releaseTimeReservations(robot.id);
        if (runtime.route) {
          runtime.route.schedule = null;
          runtime.route.scheduleProfile = null;
        }
        refreshRouteSchedulesAfterRelease(robot.id);
      }
      clearRuntimeStall(runtime);
      clearRuntimeStuck(runtime);
    } else if (robot && runtime.route && trafficStrategy?.useTimeReservations?.()) {
      refreshRouteSchedulesAfterRelease(null);
    }
    if (runtime.mode !== 'manual' && runtime.taskId) {
      updateTask(runtime.taskId, { status: paused ? 'paused' : 'in_progress' });
    }
    return true;
  };

  const stopNavigation = (robotId) => {
    let runtime = getRobotRuntime(robotId);
    if (!runtime) {
      const paused = pausedAutoRuntime.get(robotId);
      if (!paused) return false;
      runtime = paused;
      pausedAutoRuntime.delete(robotId);
    } else {
      robotRuntime.delete(robotId);
      dropEntryHoldWaiterCache(robotId);
    }
    if (runtime) {
      runtime.blockedReason = null;
      runtime.blockedObstacleId = null;
      delete runtime.pausedBeforeBlocked;
      clearRuntimeStall(runtime);
      clearRuntimeStuck(runtime);
      runtime.entryHold = null;
      runtime.entryHoldBypass = null;
      invalidateEntryHoldWaiterCache();
      runtime.edgeLockHold = null;
      runtime.nodeLockHold = null;
      runtime.lastTrafficBlock = null;
      runtime.avoidance = null;
      runtime.avoidanceHold = false;
      runtime.resumePhase = null;
      runtime.resumeRouteGoal = null;
      runtime.yieldStartedAt = null;
      runtime.yieldAttempts = 0;
    }
    releaseRobotEdgeLocks(robotId);
    const robot = getRobotById(robotId);
    const baseUpdates = {
      blocked: false,
      manualBlocked: false,
      manualBlockedReason: null,
      manualBlockedObstacleId: null
    };
    if (robot) {
      ensureRobotMotion(robot);
      robot.speed = 0;
    }
    if (runtime.mode !== 'manual' && runtime.taskId) {
      updateTask(runtime.taskId, { status: 'cancelled', phase: 'stopped' });
      updateRobotState(robotId, {
        task: null,
        activity: robot?.manualMode ? 'manual_idle' : 'idle',
        ...baseUpdates
      });
    } else if (runtime.mode === 'manual') {
      updateRobotState(robotId, {
        activity: robot?.manualMode ? 'manual_idle' : 'idle',
        ...baseUpdates
      });
    } else {
      updateRobotState(robotId, {
        activity: robot?.manualMode ? 'manual_idle' : 'idle',
        ...baseUpdates
      });
    }
    refreshRouteSchedulesAfterRelease(robotId);
    return true;
  };

  const translateRobot = (robotId, dist, vx, vy) => {
    const robot = getRobotById(robotId);
    if (!robot || !robot.pos) return false;
    ensureRobotMotion(robot);
    const heading = robot.heading || 0;
    const distance = Number.isFinite(dist) ? dist : 0;
    if (!Number.isFinite(distance)) return false;
    const dirX = Number.isFinite(vx) ? Number(vx) : 1;
    const dirY = Number.isFinite(vy) ? Number(vy) : 0;
    const magnitude = Math.hypot(dirX, dirY);
    if (magnitude === 0) return true;
    const offset = Math.atan2(dirY / magnitude, dirX / magnitude);
    const signedDistance = distance;
    const travelHeading = normalizeAngle(heading + offset);
    robot.pos = {
      x: robot.pos.x + Math.cos(travelHeading) * signedDistance,
      y: robot.pos.y + Math.sin(travelHeading) * signedDistance
    };
    return true;
  };

  const turnRobot = (robotId, angle) => {
    const robot = getRobotById(robotId);
    if (!robot) return false;
    if (!Number.isFinite(angle)) return false;
    ensureRobotMotion(robot);
    robot.heading = normalizeAngle(robot.heading + angle);
    return true;
  };

  const applyMotion = (robotId, payload) => {
    const robot = getRobotById(robotId);
    if (!robot || !robot.pos) return false;
    if (!payload || typeof payload !== 'object') return false;
    if (!robot.online || !robot.manualMode || (robot.blocked && !robot.manualBlocked)) return false;
    const runtime = getRobotRuntime(robotId);
    if (runtime) return false;
    const rawVx = toFiniteNumber(payload.vx, 0);
    const rawVy = toFiniteNumber(payload.vy, 0);
    const rawW = toFiniteNumber(payload.w, 0);
    const profile = getRobotMotionProfile(robot);
    const speedCap = profile?.speedMps || robotSpeedMps;
    const turnRateCap = profile?.turnRateRadS || robotTurnRateRadS;
    const linearSpeed = Math.hypot(rawVx, rawVy);
    const linearScale =
      linearSpeed > speedCap && linearSpeed > 0 ? speedCap / linearSpeed : 1;
    const vx = rawVx * linearScale;
    const vy = rawVy * linearScale;
    const w = clamp(rawW, -turnRateCap, turnRateCap);
    const now = Date.now();
    const lastAt = Number.isFinite(robot.lastMotionAt) ? robot.lastMotionAt : null;
    const rawDt = lastAt ? (now - lastAt) / 1000 : tickMs / 1000;
    robot.lastMotionAt = now;
    let remaining = clamp(rawDt, 0, MANUAL_MOTION_MAX_DT);
    if (!Number.isFinite(remaining) || remaining <= 0) return true;
    ensureRobotMotion(robot);
    const step = tickMs / 1000;
    const hasLinear = vx !== 0 || vy !== 0;
    let blockedBy = null;
    let blockedObstacleId = null;
    while (remaining > 1e-6) {
      const dt = Math.min(step, remaining);
      remaining -= dt;
      if (w !== 0) {
        robot.heading = normalizeAngle(robot.heading + w * dt);
      }
      if (!hasLinear) {
        robot.speed = 0;
        blockedBy = null;
        blockedObstacleId = null;
        continue;
      }
      const speed = Math.hypot(vx, vy);
      if (speed <= 1e-6) {
        robot.speed = 0;
        blockedBy = null;
        blockedObstacleId = null;
        continue;
      }
      let speedLimit = speed;
      const cos = Math.cos(robot.heading);
      const sin = Math.sin(robot.heading);
      let worldVx = cos * vx - sin * vy;
      let worldVy = sin * vx + cos * vy;
      const motionHeading = Math.atan2(worldVy, worldVx);
      const forwardProjection = worldVx * cos + worldVy * sin;
      const sign = forwardProjection < 0 ? -1 : 1;
      const nextPos = {
        x: robot.pos.x + worldVx * dt,
        y: robot.pos.y + worldVy * dt
      };
      const obstacle = findObstacleOnPath(robot.pos, nextPos);
      if (obstacle) {
        let canAvoid = false;
        if (obstacle.mode === 'avoid') {
          const edgeHit = findNearestEdge(robot.pos);
          const corridorWidth = Number(edgeHit?.edge?.width);
          const maxOffset =
            Number.isFinite(corridorWidth) && corridorWidth > 0
              ? corridorWidth / 2 - (getRobotWidth(robot) / 2 + OBSTACLE_CLEARANCE)
              : null;
          canAvoid = Number.isFinite(maxOffset) && maxOffset > ROUTE_PROGRESS_EPS;
        }
        if (canAvoid) {
          speedLimit = Math.min(speedLimit, speedCap * 0.5);
        } else {
          speedLimit = 0;
        }
      }
      const traffic = speedLimit > 0
        ? getTrafficSpeedLimit(robot, speedLimit, motionHeading)
        : { speedLimit, blockReason: null };
      const limitedMag = Math.min(speedLimit, traffic.speedLimit);
      if (limitedMag <= 0) {
        if (obstacle?.mode === 'block') {
          blockedBy = 'obstacle';
          blockedObstacleId = obstacle.id;
        } else {
          blockedBy = traffic.blockReason || 'traffic';
          blockedObstacleId = null;
        }
        robot.speed = 0;
        continue;
      }
      const scale = limitedMag / speed;
      worldVx *= scale;
      worldVy *= scale;
      robot.pos = {
        x: robot.pos.x + worldVx * dt,
        y: robot.pos.y + worldVy * dt
      };
      robot.speed = sign * limitedMag;
      blockedBy = null;
      blockedObstacleId = null;
    }
    if (!runtime) {
      if (blockedBy) {
        robot.activity = blockedBy === 'obstacle' ? 'blocked_obstacle' : 'blocked';
      } else {
        robot.activity = hasLinear || w !== 0 ? 'manual_drive' : 'manual_idle';
      }
    }
    if (blockedBy) {
      robot.manualBlocked = true;
      robot.manualBlockedReason = blockedBy;
      robot.manualBlockedObstacleId = blockedBy === 'obstacle' ? blockedObstacleId : null;
      robot.blocked = true;
    } else if (robot.manualBlocked) {
      robot.manualBlocked = false;
      robot.manualBlockedReason = null;
      robot.manualBlockedObstacleId = null;
      robot.blocked = false;
    }
    return true;
  };

  const resolveRobotTaskStatus = (robot, runtime) => {
    if (runtime) {
      if (runtime.paused || robot?.blocked) {
        return ROBOKIT_TASK_STATUS.paused;
      }
      return ROBOKIT_TASK_STATUS.running;
    }
    const last = lastTaskStatusByRobot.get(robot?.id);
    if (last?.status) {
      return coreTaskToRobokitStatus(last.status);
    }
    return ROBOKIT_TASK_STATUS.idle;
  };

  const resolveRobotUiState = (robot, runtime, taskStatus) => {
    if (!robot) return 'unknown';
    if (robot.online === false) return 'offline';
    if (robot.blocked) return 'blocked';
    if (robot.manualMode) return 'manual';
    if (taskStatus === ROBOKIT_TASK_STATUS.paused) return 'paused';
    if (runtime?.stallSince || runtime?.stuckSince || runtime?.stuckRetryAt) return 'stalled';
    if (runtime?.route || robot.task) return 'moving';
    return 'idle';
  };

  const logRobotStateTick = () => {
    if (!eventLogEnabled) return;
    robots.forEach((robot) => {
      if (!robot?.id) return;
      const runtime = getRobotRuntime(robot.id) || pausedAutoRuntime.get(robot.id);
      const taskStatus = resolveRobotTaskStatus(robot, runtime);
      const uiState = resolveRobotUiState(robot, runtime, taskStatus);
      recordEvent('robot_state_tick', { robotId: robot.id, state: uiState });
    });
  };

  const ensureRobotDiagnostics = (robotId, robot) => {
    if (!robotId) return null;
    let entry = robotDiagnostics.get(robotId);
    if (!entry) {
      entry = {
        lastPose: robot?.pos ? { x: robot.pos.x, y: robot.pos.y } : null,
        lastMoveAt: null,
        movingSince: null,
        state: 'idle',
        stateSince: Date.now(),
        reason: 'idle',
        detail: null,
        uiState: null,
        uiStateSince: null
      };
      robotDiagnostics.set(robotId, entry);
    }
    return entry;
  };

  const normalizeDiagnosticsHistoryLimit = (value) => {
    if (!Number.isFinite(value)) return DIAGNOSTIC_HISTORY_LIMIT;
    const limit = Math.floor(value);
    if (limit <= 0) return 0;
    return Math.min(DIAGNOSTIC_HISTORY_MAX, Math.max(DIAGNOSTIC_HISTORY_MIN, limit));
  };

  const ensureDiagnosticsHistory = (robotId) => {
    if (!robotId) return null;
    let history = diagnosticsHistory.get(robotId);
    if (!history) {
      history = [];
      diagnosticsHistory.set(robotId, history);
    }
    return history;
  };

  const clearDiagnosticsHistory = (robotId) => {
    if (robotId) {
      diagnosticsHistory.delete(robotId);
    } else {
      diagnosticsHistory = new Map();
    }
  };

  const appendDiagnosticsHistory = (robotId, payload, options = {}) => {
    if (!robotId || !payload) return;
    const limit = normalizeDiagnosticsHistoryLimit(options.historyLimit);
    if (limit <= 0) return;
    const history = ensureDiagnosticsHistory(robotId);
    if (!history) return;
    history.push(payload);
    if (history.length > limit) {
      history.splice(0, history.length - limit);
    }
  };

  const getDiagnosticsHistory = (robotId) => {
    const history = diagnosticsHistory.get(robotId);
    return history ? history.slice() : [];
  };

  const summarizeDiagnosticsSwitching = (history, now) => {
    const windowMs = DIAGNOSTIC_SWITCH_WINDOW_MS;
    const totalSamples = Array.isArray(history) ? history.length : 0;
    if (totalSamples < 2) {
      return {
        windowMs,
        samples: totalSamples,
        stateChanges: 0,
        reasonChanges: 0,
        stateOscillations: 0,
        reasonOscillations: 0,
        detected: false
      };
    }
    const startAt = now - windowMs;
    let startIndex = 0;
    while (startIndex < totalSamples) {
      const at = Number.isFinite(history[startIndex]?.at) ? history[startIndex].at : now;
      if (at >= startAt) break;
      startIndex += 1;
    }
    const samples = totalSamples - startIndex;
    if (samples < 2) {
      return {
        windowMs,
        samples,
        stateChanges: 0,
        reasonChanges: 0,
        stateOscillations: 0,
        reasonOscillations: 0,
        detected: false
      };
    }
    let stateChanges = 0;
    let reasonChanges = 0;
    let stateOscillations = 0;
    let reasonOscillations = 0;
    for (let i = startIndex + 1; i < totalSamples; i += 1) {
      const prev = history[i - 1];
      const curr = history[i];
      if (!prev || !curr) continue;
      if (curr.state !== prev.state) stateChanges += 1;
      if (curr.reason !== prev.reason) reasonChanges += 1;
      if (i >= startIndex + 2) {
        const prev2 = history[i - 2];
        if (prev2) {
          if (
            curr.state &&
            prev.state &&
            prev2.state &&
            curr.state === prev2.state &&
            curr.state !== prev.state
          ) {
            stateOscillations += 1;
          }
          if (
            curr.reason &&
            prev.reason &&
            prev2.reason &&
            curr.reason === prev2.reason &&
            curr.reason !== prev.reason
          ) {
            reasonOscillations += 1;
          }
        }
      }
    }
    const detected =
      stateOscillations >= DIAGNOSTIC_SWITCH_MIN_OSCILLATIONS ||
      reasonOscillations >= DIAGNOSTIC_SWITCH_MIN_OSCILLATIONS ||
      stateChanges >= DIAGNOSTIC_SWITCH_MIN_CHANGES ||
      reasonChanges >= DIAGNOSTIC_SWITCH_MIN_CHANGES;
    return {
      windowMs,
      samples,
      stateChanges,
      reasonChanges,
      stateOscillations,
      reasonOscillations,
      detected
    };
  };

  const shouldRobotMove = (robot, runtime, nowMs, reasonInfo) => {
    if (!runtime || !robot) return false;
    if (runtime.paused) return false;
    if (robot.blocked) return false;
    const phase = runtime.phase || null;
    if (phase === 'picking' || phase === 'dropping' || phase === 'manual_action') {
      return false;
    }
    if (reasonInfo?.hold) return false;
    const holdState = getActiveHoldState(runtime, nowMs);
    if (holdState) return false;
    return true;
  };

  const resolveRobotDiagnosticReason = (robot, runtime, now) => {
    const holdResult = (reason, detail) => {
      recordRuntimeHoldState(runtime, reason, detail, now);
      return { reason, hold: true, detail };
    };
    if (!robot) return holdResult('unknown', null);
    const speed = Number.isFinite(robot?.speed) ? Math.abs(robot.speed) : 0;
    const movingNow = speed > STALL_SPEED_EPS;
    if (robot.online === false) {
      return holdResult('offline', null);
    }
    if (robot.blocked) {
      const blockedReason = runtime?.blockedReason || robot.manualBlockedReason || 'blocked';
      const normalized = blockedReason === 'obstacle'
        ? 'blocked_obstacle'
        : blockedReason === 'no_route'
          ? 'blocked_no_route'
          : blockedReason === 'pick'
            ? 'blocked_pick'
            : blockedReason === 'collision'
              ? 'blocked_collision'
              : blockedReason === 'blocked'
                ? 'blocked'
                : 'blocked';
      const detail = runtime?.blockedObstacleId
        ? { obstacleId: runtime.blockedObstacleId }
        : null;
      return holdResult(normalized, detail);
    }
    if (runtime?.stuckRetryAt || runtime?.stuckSince) {
      return holdResult('stuck', {
        retryAt: runtime?.stuckRetryAt || null
      });
    }
    if (runtime?.paused) {
      return holdResult('paused', null);
    }
    if (runtime?.phase === 'yield') {
      return holdResult('yield', null);
    }
    if (runtime?.avoidanceHold) {
      return holdResult('avoidance_hold', null);
    }
    if (runtime?.avoidance) {
      return holdResult('avoidance', null);
    }
    if (runtime?.nodeLockHold) {
      return holdResult('node_lock', {
        nodeId: runtime.nodeLockHold.nodeId || null,
        holder: runtime.nodeLockHold.holderId || null
      });
    }
    if (runtime?.edgeLockHold) {
      return holdResult('edge_lock', {
        edgeGroupKey: runtime.edgeLockHold.edgeGroupKey || null,
        holder: runtime.edgeLockHold.holderId || null
      });
    }
    if (runtime?.phase === 'picking' || runtime?.phase === 'dropping' || runtime?.phase === 'manual_action') {
      return holdResult('action_wait', { phase: runtime.phase });
    }
    if (runtime?.mode === 'manual' && runtime?.phase !== 'manual_move') {
      return holdResult('manual', { phase: runtime?.phase || null });
    }
    const reservationWaitsEnabled = shouldEnforceReservationWaits();
    const route = runtime?.route || null;
    const routeProgress = Number.isFinite(route?.segmentProgress) ? route.segmentProgress : null;
    const nearSegmentStart =
      routeProgress == null || routeProgress <= RESERVATION_ENTRY_START_EPS;
    const scheduleEntry = route ? getRouteScheduleEntry(route, route.segmentIndex) : null;
    const nextEntry = route ? getRouteScheduleEntry(route, route.segmentIndex + 1) : null;
    if (reservationWaitsEnabled && scheduleEntry && Number.isFinite(scheduleEntry.startTime)) {
      const waitMs = scheduleEntry.startTime - now;
      if (waitMs > 50 && nearSegmentStart) {
        return holdResult('reservation_wait', {
          waitMs,
          edgeKey: scheduleEntry.edgeGroupKey || scheduleEntry.edgeKey || null,
          conflict: scheduleEntry.conflict
            ? {
                source: scheduleEntry.conflict.source || null,
                type: scheduleEntry.conflict.type || null,
                key: scheduleEntry.conflict.key || null,
                holder: scheduleEntry.conflict.holder || null
              }
            : null
        });
      }
    }
    if (
      reservationWaitsEnabled &&
      runtime?.entryHold?.startTime &&
      Number.isFinite(runtime.entryHold.startTime)
    ) {
      const waitMs = runtime.entryHold.startTime - now;
      if (waitMs > 50) {
        let atStop = true;
        const segment = runtime?.route?.segments?.[runtime.route.segmentIndex];
        const progress = runtime?.route?.segmentProgress;
        const buffer = runtime?.entryHold?.buffer;
        if (
          segment &&
          Number.isFinite(segment.totalLength) &&
          Number.isFinite(progress) &&
          Number.isFinite(buffer)
        ) {
          const stopAt = Math.max(0, segment.totalLength - buffer);
          atStop = progress >= stopAt - ROUTE_PROGRESS_EPS;
        }
        if (atStop) {
          return holdResult('reservation_entry', {
            waitMs,
            edgeKey: runtime.entryHold.edgeKey || null,
            conflict: runtime.entryHold.conflict
              ? {
                  source: runtime.entryHold.conflict.source || null,
                  type: runtime.entryHold.conflict.type || null,
                  key: runtime.entryHold.conflict.key || null,
                  holder: runtime.entryHold.conflict.holder || null
                }
              : null
          });
        }
      }
    }
    if (
      runtime?.stallSince &&
      (runtime.stallReason === 'reservation_wait' || runtime.stallReason === 'reservation_entry')
    ) {
      if (reservationWaitsEnabled) {
        if (nearSegmentStart) {
          const waitMs =
            scheduleEntry && Number.isFinite(scheduleEntry.startTime)
              ? scheduleEntry.startTime - now
              : null;
          return holdResult('reservation_wait', {
            waitMs,
            edgeKey: scheduleEntry?.edgeGroupKey || scheduleEntry?.edgeKey || null,
            conflict: scheduleEntry?.conflict
              ? {
                  source: scheduleEntry.conflict.source || null,
                  type: scheduleEntry.conflict.type || null,
                  key: scheduleEntry.conflict.key || null,
                  holder: scheduleEntry.conflict.holder || null
                }
              : null
          });
        }
        const entryWaitMs = runtime.entryHold?.startTime && Number.isFinite(runtime.entryHold.startTime)
          ? runtime.entryHold.startTime - now
          : nextEntry?.startTime && Number.isFinite(nextEntry.startTime)
            ? nextEntry.startTime - now
            : null;
        return holdResult('reservation_entry', {
          waitMs: entryWaitMs,
          edgeKey:
            runtime.entryHold?.edgeKey ||
            runtime.entryHoldArb?.edgeKey ||
            nextEntry?.edgeGroupKey ||
            nextEntry?.edgeKey ||
            null,
          conflict: runtime.entryHold?.conflict
            ? {
                source: runtime.entryHold.conflict.source || null,
                type: runtime.entryHold.conflict.type || null,
                key: runtime.entryHold.conflict.key || null,
                holder: runtime.entryHold.conflict.holder || null
              }
            : nextEntry?.conflict
              ? {
                  source: nextEntry.conflict.source || null,
                  type: nextEntry.conflict.type || null,
                  key: nextEntry.conflict.key || null,
                  holder: nextEntry.conflict.holder || null
                }
              : null
        });
      }
    }
    if (runtime?.stallSince && runtime.stallReason === 'critical_section_wait') {
      return holdResult('critical_section_wait', {
        sectionId: scheduleEntry?.criticalSectionId || null,
        holder: runtime.stallOpponentId || null
      });
    }
    if (runtime?.lastTrafficBlock) {
      const holdUntil = Number.isFinite(runtime.lastTrafficBlock.holdUntil)
        ? runtime.lastTrafficBlock.holdUntil
        : null;
      if (!movingNow || (holdUntil != null && now < holdUntil)) {
        return holdResult(runtime.lastTrafficBlock.reason || 'traffic', {
          blockingId: runtime.lastTrafficBlock.blockingId || null
        });
      }
    }
    if (movingNow && runtime?.holdState) {
      runtime.holdState = null;
    }
    const sticky = resolveStickyHoldState(runtime, now);
    if (sticky) return sticky;
    return { reason: null, hold: false, detail: null };
  };


  const buildRobotDiagnostics = (robot, runtime, now, options = {}) => {
    if (!robot) return null;
    const entry = ensureRobotDiagnostics(robot.id, robot);
    if (!entry) return null;
    const prevState = entry.state;
    const prevReason = entry.reason;
    const prevStateSince = entry.stateSince;
    const hasPose = Number.isFinite(robot.pos?.x) && Number.isFinite(robot.pos?.y);
    const speed = Number.isFinite(robot.speed) ? Math.abs(robot.speed) : 0;
    let distanceFromLastPose = null;
    let movedByPose = false;
    let moved = false;
    if (hasPose && entry.lastPose) {
      distanceFromLastPose = distanceBetweenPoints(entry.lastPose, robot.pos);
      if (distanceFromLastPose >= STALL_MOVE_EPS) {
        movedByPose = true;
        moved = true;
      }
    }
    if (speed >= STALL_SPEED_EPS) moved = true;
    if (hasPose && !entry.lastPose) {
      entry.lastPose = { x: robot.pos.x, y: robot.pos.y };
      entry.lastMoveAt = Number.isFinite(entry.lastMoveAt) ? entry.lastMoveAt : now;
    }
    if (moved) {
      entry.lastPose = { x: robot.pos.x, y: robot.pos.y };
      entry.lastMoveAt = now;
      if (!Number.isFinite(entry.movingSince)) {
        entry.movingSince = now;
      }
    } else {
      entry.movingSince = null;
    }
    if (!Number.isFinite(entry.lastMoveAt)) {
      entry.lastMoveAt = now;
    }
    const reasonInfo = resolveRobotDiagnosticReason(robot, runtime, now);
    const shouldMove = shouldRobotMove(robot, runtime, now, reasonInfo);
    const movingRecently = now - entry.lastMoveAt <= STALL_TIMEOUT_MS;
    let state = 'idle';
    if (robot.online === false) {
      state = 'offline';
    } else if (!runtime) {
      state = robot.manualMode ? 'manual_idle' : 'idle';
    } else if (reasonInfo.hold) {
      state = 'holding';
    } else if (shouldMove && !movingRecently) {
      state = 'stalled';
    } else {
      state = 'moving';
    }
    if (prevState === 'stalled' && state === 'moving') {
      const movingSince = entry.movingSince;
      const movingConfirmed =
        Number.isFinite(movingSince) && now - movingSince >= STALL_CLEAR_HYSTERESIS_MS;
      if (!movingConfirmed) {
        state = 'stalled';
      }
    }
    const stateChanged = entry.state !== state;
    if (stateChanged) {
      entry.state = state;
      entry.stateSince = now;
    }
    let reason = reasonInfo.reason;
    if (!reason) {
      if (state === 'stalled') {
        reason = 'no_motion';
      } else if (state === 'idle') {
        reason = 'idle';
      } else {
        reason = 'moving';
      }
    }
    const reasonChanged = prevReason !== reason;
    entry.reason = reason;
    entry.detail = reasonInfo.detail;
    const includeDebug = options.includeDebug || options.includeHistory;
    let debug = null;
    if (includeDebug) {
      const route = runtime?.route || null;
      const segment = route?.segments?.[route.segmentIndex] || null;
      const remaining =
        segment?.totalLength && Number.isFinite(route?.segmentProgress)
          ? Math.max(0, segment.totalLength - route.segmentProgress)
          : null;
      const scheduleEntry = route ? getRouteScheduleEntry(route, route.segmentIndex) : null;
      const scheduleWaitMs =
        scheduleEntry && Number.isFinite(scheduleEntry.startTime)
          ? scheduleEntry.startTime - now
          : null;
      const scheduleHold =
        Number.isFinite(scheduleWaitMs) &&
        scheduleWaitMs > 50 &&
        (!Number.isFinite(route?.segmentProgress) ||
          route.segmentProgress <= RESERVATION_ENTRY_START_EPS);
      const entryHoldWaitMs =
        runtime?.entryHold && Number.isFinite(runtime.entryHold.startTime)
          ? runtime.entryHold.startTime - now
          : null;
      const holdFlags = runtime
        ? {
            blocked: Boolean(robot.blocked),
            stuck: Boolean(runtime.stuckRetryAt || runtime.stuckSince),
            paused: Boolean(runtime.paused),
            yield: runtime.phase === 'yield',
            avoidanceHold: Boolean(runtime.avoidanceHold),
            avoidance: Boolean(runtime.avoidance),
            nodeLock: Boolean(runtime.nodeLockHold),
            edgeLock: Boolean(runtime.edgeLockHold),
            actionWait:
              runtime.phase === 'picking' ||
              runtime.phase === 'dropping' ||
              runtime.phase === 'manual_action',
            manualHold: runtime.mode === 'manual' && runtime.phase !== 'manual_move',
            reservationWait: scheduleHold,
            reservationEntry: Number.isFinite(entryHoldWaitMs) && entryHoldWaitMs > 50,
            criticalSectionWait: runtime.stallReason === 'critical_section_wait',
            traffic: Boolean(runtime.lastTrafficBlock)
          }
        : null;
      debug = {
        at: now,
        state,
        reason,
        reasonHold: reasonInfo.hold,
        reasonDetail: reasonInfo.detail || null,
        transitions: {
          stateChanged,
          reasonChanged,
          previousState: prevState || null,
          previousReason: prevReason || null,
          previousSince: prevStateSince || null
        },
        movement: {
          speed,
          movedByPose,
          distanceFromLastPose,
          lastMoveAt: entry.lastMoveAt || null,
          lastMoveAgeMs: Number.isFinite(entry.lastMoveAt) ? now - entry.lastMoveAt : null,
          movingRecently,
          shouldMove,
          stallTimeoutMs: STALL_TIMEOUT_MS,
          moveEps: STALL_MOVE_EPS,
          speedEps: STALL_SPEED_EPS
        },
        robot: {
          activity: robot.activity || null,
          manualMode: Boolean(robot.manualMode),
          blocked: Boolean(robot.blocked),
          online: robot.online !== false,
          dispatchable: robot.dispatchable !== false,
          controlled: robot.controlled !== false
        },
        pose: hasPose
          ? {
              x: robot.pos.x,
              y: robot.pos.y,
              angle: Number.isFinite(robot.heading) ? robot.heading : null
            }
          : null,
        runtime: runtime
          ? {
              mode: runtime.mode || null,
              phase: runtime.phase || null,
              paused: Boolean(runtime.paused),
              blockedReason: runtime.blockedReason || null,
              blockedObstacleId: runtime.blockedObstacleId || null,
              stall: runtime.stallSince
                ? {
                    since: runtime.stallSince,
                    reason: runtime.stallReason || null,
                    opponentId: runtime.stallOpponentId || null
                  }
                : null,
              stuck: runtime.stuckRetryAt || runtime.stuckSince
                ? {
                    since: runtime.stuckSince || null,
                    reason: runtime.stuckReason || null,
                    retryAt: runtime.stuckRetryAt || null
                  }
                : null,
              holdFlags,
              holdState: runtime.holdState
                ? {
                    reason: runtime.holdState.reason || null,
                    since: runtime.holdState.since || null,
                    lastSeenAt: runtime.holdState.lastSeenAt || null
                  }
                : null,
              scheduleSlip: runtime.scheduleSlip
                ? {
                    at: runtime.scheduleSlip.at || null,
                    startTime: runtime.scheduleSlip.startTime || null,
                    edgeKey: runtime.scheduleSlip.edgeKey || null
                  }
                : null,
              deadlock: runtime.deadlockInfo
                ? {
                    at: runtime.deadlockInfo.at || null,
                    cycle: Array.isArray(runtime.deadlockInfo.cycle)
                      ? runtime.deadlockInfo.cycle.slice()
                      : null,
                    resolvedBy: runtime.deadlockInfo.resolvedBy || null
                  }
                : null,
              avoidance: runtime.avoidance
                ? {
                    obstacleId: runtime.avoidance.obstacleId || null,
                    waypoint: runtime.avoidance.waypoint
                      ? { x: runtime.avoidance.waypoint.x, y: runtime.avoidance.waypoint.y }
                      : null
                  }
                : null,
              avoidanceHold: Boolean(runtime.avoidanceHold),
              entryHold: runtime.entryHold
                ? {
                    startTime: runtime.entryHold.startTime || null,
                    waitMs: entryHoldWaitMs,
                    edgeKey: runtime.entryHold.edgeKey || null,
                    buffer: Number.isFinite(runtime.entryHold.buffer) ? runtime.entryHold.buffer : null,
                    conflict: runtime.entryHold.conflict
                      ? {
                          source: runtime.entryHold.conflict.source || null,
                          type: runtime.entryHold.conflict.type || null,
                          key: runtime.entryHold.conflict.key || null,
                          holder: runtime.entryHold.conflict.holder || null
                        }
                      : null
                  }
                : null,
              entryHoldArb: runtime.entryHoldArb
                ? {
                    edgeKey: runtime.entryHoldArb.edgeKey || null,
                    leaderId: runtime.entryHoldArb.leaderId || null,
                    at: runtime.entryHoldArb.at || null
                  }
                : null,
              edgeLockYield: runtime.edgeLockYield
                ? {
                    edgeGroupKey: runtime.edgeLockYield.edgeGroupKey || null,
                    requesterId: runtime.edgeLockYield.requesterId || null,
                    at: runtime.edgeLockYield.at || null
                  }
                : null,
              nodeLockHold: runtime.nodeLockHold
                ? {
                    nodeId: runtime.nodeLockHold.nodeId || null,
                    holderId: runtime.nodeLockHold.holderId || null
                  }
                : null,
              edgeLockHold: runtime.edgeLockHold
                ? {
                    edgeGroupKey: runtime.edgeLockHold.edgeGroupKey || null,
                    holderId: runtime.edgeLockHold.holderId || null
                  }
                : null,
              lastTrafficBlock: runtime.lastTrafficBlock
                ? {
                    reason: runtime.lastTrafficBlock.reason || null,
                    blockingId: runtime.lastTrafficBlock.blockingId || null,
                    at: runtime.lastTrafficBlock.at || null
                  }
                : null,
              route: route
                ? {
                    segmentIndex: route.segmentIndex || 0,
                    segmentProgress: Number.isFinite(route.segmentProgress) ? route.segmentProgress : null,
                    remaining,
                    plannedAt: Number.isFinite(route.plannedAt) ? route.plannedAt : null,
                    segment: segment
                      ? {
                          edgeKey: segment.edgeKey || null,
                          edgeGroupKey: segment.edgeGroupKey || null,
                          edgeBaseGroupKey: segment.edgeBaseGroupKey || null,
                          fromNodeId: segment.fromNodeId || null,
                          toNodeId: segment.toNodeId || null,
                          totalLength: segment.totalLength,
                          width: Number.isFinite(segment.width) ? segment.width : null
                        }
                      : null,
                    scheduleEntry: scheduleEntry
                      ? {
                          edgeKey: scheduleEntry.edgeKey || null,
                          edgeGroupKey: scheduleEntry.edgeGroupKey || null,
                          edgeBaseGroupKey: scheduleEntry.edgeBaseGroupKey || null,
                          fromNodeId: scheduleEntry.fromNodeId || null,
                          toNodeId: scheduleEntry.toNodeId || null,
                          startTime: scheduleEntry.startTime,
                          arrivalTime: scheduleEntry.arrivalTime,
                          waitMs: scheduleEntry.waitMs,
                          waitRemainingMs: scheduleWaitMs,
                          travelMs: scheduleEntry.travelMs,
                          conflict: scheduleEntry.conflict
                            ? {
                                source: scheduleEntry.conflict.source || null,
                                type: scheduleEntry.conflict.type || null,
                                key: scheduleEntry.conflict.key || null,
                                holder: scheduleEntry.conflict.holder || null
                              }
                            : null
                        }
                      : null
                  }
                : null,
              routeGoal: runtime.routeGoal
                ? {
                    pos: runtime.routeGoal.pos ? { ...runtime.routeGoal.pos } : null,
                    nodeId: runtime.routeGoal.nodeId || null
                  }
                : null,
              target: runtime.target ? { ...runtime.target } : null,
              targetHeading: Number.isFinite(runtime.targetHeading) ? runtime.targetHeading : null,
              routeLimit: Number.isFinite(runtime.routeLimit) ? runtime.routeLimit : null,
              lastPlanAt: Number.isFinite(runtime.lastPlanAt) ? runtime.lastPlanAt : null
            }
          : null,
        trafficStrategy: trafficStrategy?.getName
          ? trafficStrategy.getName()
          : resolveTrafficStrategyName(robotsConfig)
      };
    }
    const captureHistory = options.captureHistory !== false;
    if (captureHistory) {
      const historyEntry = {
        at: now,
        state,
        reason,
        detail: reasonInfo.detail || null,
        since: entry.stateSince,
        moving: movingRecently,
        shouldMove,
        transitions: {
          stateChanged,
          reasonChanged,
          previousState: prevState || null,
          previousReason: prevReason || null,
          previousSince: prevStateSince || null
        },
        debug: debug || null
      };
      appendDiagnosticsHistory(robot.id, historyEntry, options);
    }
    const includeSwitching = Boolean(options.includeHistory || options.includeSwitching);
    const switching = includeSwitching
      ? summarizeDiagnosticsSwitching(diagnosticsHistory.get(robot.id), now)
      : null;
    const payload = {
      state,
      reason,
      detail: reasonInfo.detail,
      since: entry.stateSince,
      lastMoveAt: entry.lastMoveAt,
      moving: movingRecently,
      shouldMove
    };
    if (switching) {
      payload.switching = switching;
    }
    if (debug) {
      payload.debug = debug;
    }
    return payload;
  };

  const buildRobotSnapshot = (robot, options = {}) => {
    if (!robot) return null;
    const runtime = getRobotRuntime(robot.id);
    const pausedRuntime = pausedAutoRuntime.get(robot.id);
    const activeRuntime = runtime || pausedRuntime;
    const taskStatus = resolveRobotTaskStatus(robot, activeRuntime);
    const now = Date.now();
    const diagnostics = buildRobotDiagnostics(robot, activeRuntime, now, options);
    const uiState = resolveRobotUiState(robot, activeRuntime, taskStatus);
    const diagEntry = ensureRobotDiagnostics(robot.id, robot);
    if (diagEntry && diagEntry.uiState !== uiState) {
      const previous = diagEntry.uiState ?? null;
      diagEntry.uiState = uiState;
      diagEntry.uiStateSince = now;
      recordEvent('robot_state', {
        robotId: robot.id,
        changes: {
          state: { from: previous, to: uiState }
        }
      });
    }
    const snapshot = {
      id: robot.id,
      online: robot.online !== false,
      dispatchable: robot.dispatchable !== false,
      controlled: robot.controlled !== false,
      manualMode: Boolean(robot.manualMode),
      blocked: Boolean(robot.blocked),
      state: uiState,
      activity: robot.activity || null,
      battery: Number.isFinite(robot.battery) ? Math.round(robot.battery) : null,
      speed: Number.isFinite(robot.speed) ? robot.speed : null,
      pose: {
        x: Number.isFinite(robot.pos?.x) ? robot.pos.x : null,
        y: Number.isFinite(robot.pos?.y) ? robot.pos.y : null,
        angle: Number.isFinite(robot.heading) ? robot.heading : null
      },
      currentStation: null,
      lastStation: null,
      taskStatus,
      diagnostics
    };
    if (options.includeHistory) {
      const history = getDiagnosticsHistory(robot.id);
      snapshot.diagnosticsHistory = history;
      snapshot.diagnosticsHistoryCount = history.length;
      snapshot.diagnosticsHistoryLimit = normalizeDiagnosticsHistoryLimit(options.historyLimit);
    }
    return snapshot;
  };

  const buildScheduleEntrySnapshot = (entry) => {
    if (!entry) return null;
    return {
      edgeKey: entry.edgeKey || null,
      edgeGroupKey: entry.edgeGroupKey || null,
      edgeBaseGroupKey: entry.edgeBaseGroupKey || null,
      fromNodeId: entry.fromNodeId || null,
      toNodeId: entry.toNodeId || null,
      startTime: entry.startTime,
      arrivalTime: entry.arrivalTime,
      waitMs: entry.waitMs,
      travelMs: entry.travelMs,
      criticalSectionId: entry.criticalSectionId || null,
      criticalSectionSpanId: entry.criticalSectionSpanId || null,
      criticalSectionStart: Number.isFinite(entry.criticalSectionStart)
        ? entry.criticalSectionStart
        : null,
      criticalSectionEnd: Number.isFinite(entry.criticalSectionEnd) ? entry.criticalSectionEnd : null,
      conflict: entry.conflict
        ? {
            source: entry.conflict.source || null,
            type: entry.conflict.type || null,
            key: entry.conflict.key || null,
            holder: entry.conflict.holder || null
          }
        : null
    };
  };

  const buildRuntimeSnapshot = (robotId, options = {}) => {
    if (!robotId) return null;
    const runtime = getRobotRuntime(robotId);
    const pausedRuntime = pausedAutoRuntime.get(robotId);
    const active = runtime || pausedRuntime;
    if (!active) return null;
    const includeRoute = options.includeRoute !== false;
    const route = active.route || null;
    const segment = route?.segments?.[route.segmentIndex] || null;
    const scheduleEntry = route
      ? buildScheduleEntrySnapshot(getRouteScheduleEntry(route, route.segmentIndex))
      : null;
    const remaining = segment?.totalLength && Number.isFinite(route?.segmentProgress)
      ? Math.max(0, segment.totalLength - route.segmentProgress)
      : null;
    return {
      source: runtime ? 'active' : 'paused',
      mode: active.mode || null,
      phase: active.phase || null,
      paused: Boolean(active.paused),
      taskId: active.taskId || null,
      blockedReason: active.blockedReason || null,
      blockedObstacleId: active.blockedObstacleId || null,
      stall: active.stallSince
        ? {
            since: active.stallSince,
            reason: active.stallReason || null,
            opponentId: active.stallOpponentId || null
          }
        : null,
      stuck: active.stuckRetryAt || active.stuckSince
        ? {
            since: active.stuckSince || null,
            reason: active.stuckReason || null,
            retryAt: active.stuckRetryAt || null
          }
        : null,
      yield: active.lastYieldAt || active.phase === 'yield'
        ? {
            lastYieldAt: active.lastYieldAt || null,
            resumePhase: active.resumePhase || null
          }
        : null,
      avoidance: active.avoidance
        ? {
            obstacleId: active.avoidance.obstacleId || null,
            waypoint: active.avoidance.waypoint
              ? { x: active.avoidance.waypoint.x, y: active.avoidance.waypoint.y }
              : null
          }
        : null,
      avoidanceHold: Boolean(active.avoidanceHold),
      nodeLockHold: active.nodeLockHold
        ? {
            nodeId: active.nodeLockHold.nodeId || null,
            holderId: active.nodeLockHold.holderId || null
          }
        : null,
      edgeLockHold: active.edgeLockHold
        ? {
            edgeGroupKey: active.edgeLockHold.edgeGroupKey || null,
            holderId: active.edgeLockHold.holderId || null
          }
        : null,
      entryHold: active.entryHold
        ? {
            startTime: active.entryHold.startTime || null,
            edgeKey: active.entryHold.edgeKey || null,
            buffer: Number.isFinite(active.entryHold.buffer) ? active.entryHold.buffer : null,
            conflict: active.entryHold.conflict
              ? {
                  source: active.entryHold.conflict.source || null,
                  type: active.entryHold.conflict.type || null,
                  key: active.entryHold.conflict.key || null,
                  holder: active.entryHold.conflict.holder || null
                }
              : null
          }
        : null,
      entryHoldBypass: active.entryHoldBypass
        ? {
            edgeKey: active.entryHoldBypass.edgeKey || null,
            nodeKey: active.entryHoldBypass.nodeKey || null,
            segmentIndex: Number.isFinite(active.entryHoldBypass.segmentIndex)
              ? active.entryHoldBypass.segmentIndex
              : null,
            at: active.entryHoldBypass.at || null
          }
        : null,
      lastTrafficBlock: active.lastTrafficBlock
        ? {
            reason: active.lastTrafficBlock.reason || null,
            blockingId: active.lastTrafficBlock.blockingId || null,
            at: active.lastTrafficBlock.at || null
          }
        : null,
      routeGoal: active.routeGoal
        ? {
            pos: active.routeGoal.pos ? { ...active.routeGoal.pos } : null,
            nodeId: active.routeGoal.nodeId || null
          }
        : null,
      target: active.target ? { ...active.target } : null,
      routeLimit: Number.isFinite(active.routeLimit) ? active.routeLimit : null,
      lastPlanAt: Number.isFinite(active.lastPlanAt) ? active.lastPlanAt : null,
      segment: segment
        ? {
            edgeKey: segment.edgeKey || null,
            edgeGroupKey: segment.edgeGroupKey || null,
            edgeBaseGroupKey: segment.edgeBaseGroupKey || null,
            fromNodeId: segment.fromNodeId || null,
            toNodeId: segment.toNodeId || null,
            criticalSectionId: segment.criticalSectionId || null,
            totalLength: segment.totalLength,
            width: Number.isFinite(segment.width) ? segment.width : null,
            progress: Number.isFinite(route?.segmentProgress) ? route.segmentProgress : null,
            remaining: Number.isFinite(remaining) ? remaining : null
          }
        : null,
      scheduleEntry,
      route: includeRoute ? buildRouteSnapshot(route) : null
    };
  };

  const buildReservationSnapshot = (edgeKeys = [], nodeIds = [], sectionIds = []) => {
    if (!reservationTable && !criticalSectionTable) return null;
    const edge = [];
    const node = [];
    const criticalSections = [];
    if (reservationTable) {
      edgeKeys.forEach((key) => {
        if (!key) return;
        edge.push({ edgeKey: key, reservations: reservationTable.getEdgeReservations(key) });
      });
      nodeIds.forEach((id) => {
        if (!id) return;
        node.push({ nodeId: id, reservations: reservationTable.getNodeReservations(id) });
      });
    }
    if (criticalSectionTable && Array.isArray(sectionIds)) {
      sectionIds.forEach((id) => {
        if (!id) return;
        criticalSections.push({
          sectionId: id,
          reservations: criticalSectionTable.getReservations(id)
        });
      });
    }
    return { edge, node, criticalSections };
  };

  const getDiagnostics = (options = {}) => {
    const now = Date.now();
    const robotId = options.robotId || null;
    const includeReservations = Boolean(options.includeReservations);
    const includeRoute = options.includeRoute !== false;
    const includeObstacles = options.includeObstacles !== false;
    const includeHistory = options.includeHistory !== false;
    const includeDebug = includeHistory || Boolean(options.includeDebug);
    const includeEvents = includeDebug || Boolean(options.includeEvents || options.includeEventLog);
    const includeWaitGraph = includeDebug || Boolean(options.includeWaitGraph);
    const captureHistory = options.captureHistory !== false;
    const historyLimit = normalizeDiagnosticsHistoryLimit(options.historyLimit);
    if (options.clearHistory) {
      clearDiagnosticsHistory(robotId);
    }
    if (options.clearEventLog || options.clearEvents) {
      eventLog = [];
    }
    const robotsToReport = robotId
      ? [getRobotById(robotId)].filter(Boolean)
      : robots.slice();
    const edgeKeys = [];
    const nodeIds = [];
    const sectionIds = [];
    const robotPayload = robotsToReport.map((robot) => {
      const runtimeSnapshot = buildRuntimeSnapshot(robot.id, { includeRoute });
      if (runtimeSnapshot?.segment?.edgeGroupKey) {
        edgeKeys.push(runtimeSnapshot.segment.edgeGroupKey);
      }
      if (runtimeSnapshot?.segment?.edgeBaseGroupKey) {
        edgeKeys.push(runtimeSnapshot.segment.edgeBaseGroupKey);
      }
      if (runtimeSnapshot?.scheduleEntry?.edgeGroupKey) {
        edgeKeys.push(runtimeSnapshot.scheduleEntry.edgeGroupKey);
      }
      if (runtimeSnapshot?.scheduleEntry?.edgeBaseGroupKey) {
        edgeKeys.push(runtimeSnapshot.scheduleEntry.edgeBaseGroupKey);
      }
      if (runtimeSnapshot?.segment?.toNodeId) {
        nodeIds.push(runtimeSnapshot.segment.toNodeId);
      }
      if (runtimeSnapshot?.scheduleEntry?.criticalSectionId) {
        sectionIds.push(runtimeSnapshot.scheduleEntry.criticalSectionId);
      } else if (runtimeSnapshot?.segment?.criticalSectionId) {
        sectionIds.push(runtimeSnapshot.segment.criticalSectionId);
      }
      return {
        robot: buildRobotSnapshot(robot, {
          includeHistory,
          includeDebug,
          historyLimit,
          captureHistory
        }),
        runtime: runtimeSnapshot
      };
    });
    const uniqueEdgeKeys = Array.from(new Set(edgeKeys.filter(Boolean)));
    const uniqueNodeIds = Array.from(new Set(nodeIds.filter(Boolean)));
    const uniqueSectionIds = Array.from(new Set(sectionIds.filter(Boolean)));
    const reservations = includeReservations
      ? buildReservationSnapshot(uniqueEdgeKeys, uniqueNodeIds, uniqueSectionIds)
      : null;
    return {
      now,
      robots: robotPayload,
      traffic: {
        edgeLocks: Array.from(edgeLocks.entries()).map(([edgeGroupKey, locks]) => ({
          edgeGroupKey,
          locks: Array.from(locks.values()).map((lock) => ({
            robotId: lock.robotId,
            edgeKey: lock.edgeKey || null,
            progress: Number.isFinite(lock.progress) ? lock.progress : null,
            totalLength: Number.isFinite(lock.totalLength) ? lock.totalLength : null,
            updatedAt: lock.updatedAt || null
          }))
        })),
        edgeQueues: Array.from(edgeQueues.entries()).map(([edgeGroupKey, queue]) => ({
          edgeGroupKey,
          queue: queue.map((entry) => ({
            robotId: entry.robotId,
            edgeKey: entry.edgeKey || null,
            updatedAt: entry.updatedAt || null
          }))
        })),
        edgeDirectionLocks: Array.from(edgeDirectionLocks.entries()).map(([edgeGroupKey, lock]) => ({
          edgeGroupKey,
          edgeKey: lock.edgeKey || null,
          count: lock.count || 0,
          holdUntil: lock.holdUntil || null,
          lastSwitchAt: lock.lastSwitchAt || null
        })),
        nodeLocks: Array.from(nodeLocks.entries()).map(([nodeId, lock]) => ({
          nodeId,
          holderId: lock.holderId || null,
          until: lock.until || null
        })),
        criticalSections: criticalSectionIndex?.enabled
          ? {
              mode: criticalSectionIndex.mode || 'ORDERING',
              maxRobotsPerSection: criticalSectionIndex.maxRobotsPerSection || 1,
              sections: Array.from(criticalSectionIndex.sections.values()).map((entry) => ({
                id: entry.id,
                order: Number.isFinite(entry.order) ? entry.order : null,
                maxRobots: Number.isFinite(entry.maxRobots) ? entry.maxRobots : null
              }))
            }
          : null,
        metrics: trafficMetrics
          ? {
              counts: { ...trafficMetrics.counts },
              slip: trafficMetrics.slip.snapshot(),
              criticalWait: trafficMetrics.criticalWait.snapshot(),
              lastResetAt: trafficMetrics.lastResetAt || null
            }
          : null,
        chaos: chaosConfig?.enabled
          ? {
              seed: chaosConfig.seed,
              segmentDelayMs: chaosConfig.segmentDelayMs,
              stopChance: chaosConfig.stopChance,
              stopDurationMs: chaosConfig.stopDurationMs
            }
          : null,
        waitGraph: includeWaitGraph ? waitGraphSnapshot : null,
        avoidanceZones: Array.from(avoidanceZones.values()).map((zone) => ({
          ownerId: zone.ownerId,
          pos: zone.pos ? { x: zone.pos.x, y: zone.pos.y } : null,
          radius: Number.isFinite(zone.radius) ? zone.radius : null,
          allowed: Array.isArray(zone.allowed)
            ? zone.allowed
            : zone.allowed
              ? Array.from(zone.allowed)
              : []
        }))
      },
      obstacles: includeObstacles
        ? obstacles.map((obs) => ({
            id: obs.id,
            x: obs.x,
            y: obs.y,
            radius: obs.radius,
            mode: obs.mode
          }))
        : null,
      reservations,
      eventLog: includeEvents ? [...eventLog] : null
    };
  };

  const buildRouteSnapshot = (route) => {
    if (!route) return null;
    return {
      segmentIndex: route.segmentIndex || 0,
      segmentProgress: route.segmentProgress || 0,
      pathNodes: Array.isArray(route.pathNodes) ? [...route.pathNodes] : [],
      plannedAt: Number.isFinite(route.plannedAt) ? route.plannedAt : null,
      schedule: (route.schedule || []).map((entry) => ({
        edgeKey: entry.edgeKey || null,
        edgeGroupKey: entry.edgeGroupKey || null,
        edgeBaseGroupKey: entry.edgeBaseGroupKey || null,
        fromNodeId: entry.fromNodeId || null,
        toNodeId: entry.toNodeId || null,
        startTime: entry.startTime,
        arrivalTime: entry.arrivalTime,
        waitMs: entry.waitMs,
        travelMs: entry.travelMs
      })),
      plannerStats: route.plannerStats
        ? {
            planMs: route.plannerStats.planMs,
            expansions: route.plannerStats.expansions
          }
        : null,
      finalTarget: route.finalTarget
        ? {
            pos: route.finalTarget.pos ? { ...route.finalTarget.pos } : null,
            heading: route.finalTarget.heading
          }
        : null,
      segments: (route.segments || []).map((segment) => ({
        edgeKey: segment.edgeKey || null,
        edgeGroupKey: segment.edgeGroupKey || null,
        edgeBaseGroupKey: segment.edgeBaseGroupKey || null,
        fromNodeId: segment.fromNodeId || null,
        toNodeId: segment.toNodeId || null,
        totalLength: segment.totalLength,
        width: Number.isFinite(segment.width) ? segment.width : null
      }))
    };
  };

  const getDebugState = () => ({
    robots: robots.map((robot) => {
      const runtime = getRobotRuntime(robot.id);
      return {
        id: robot.id,
        route: buildRouteSnapshot(runtime?.route || null),
        routeGoal: runtime?.routeGoal
          ? {
              pos: runtime.routeGoal.pos ? { ...runtime.routeGoal.pos } : null,
              nodeId: runtime.routeGoal.nodeId || null
            }
          : null
      };
    })
  });

  const getStatus = (includeWorksites = true) => {
    const payload = {
      tickMs,
      lastTickAt,
      lastError,
      robots: robots.map((robot) => buildRobotSnapshot(robot)).filter(Boolean),
      tasks: tasks.map((task) => ({
        id: task.id,
        robotId: task.robotId || null,
        pickId: task.pickId || null,
        dropId: task.dropId || null,
        status: task.status,
        phase: task.phase,
        streamId: task.streamId || null,
        kind: task.kind || null,
        meta: task.meta || null
      })),
      robotStatus: null
    };
    if (includeWorksites) {
      payload.worksites = worksites.map((site) => ({
        id: site.id,
        group: site.group,
        point: site.point,
        pos: site.pos,
        filled: getWorksiteState(site.id).occupancy === 'filled',
        blocked: Boolean(getWorksiteState(site.id).blocked)
      }));
    }
    return payload;
  };

  const getWorksites = () =>
    worksites.map((site) => ({
      id: site.id,
      group: site.group,
      point: site.point,
      pos: site.pos,
      filled: getWorksiteState(site.id).occupancy === 'filled',
      blocked: Boolean(getWorksiteState(site.id).blocked)
    }));

  const updateWorksite = (id, updates) => {
    if (!id) return null;
    const known = worksites.find((site) => site.id === id);
    if (!known) return null;
    if (updates && Object.prototype.hasOwnProperty.call(updates, 'filled')) {
      setWorksiteOccupancy(id, updates.filled ? 'filled' : 'empty');
    }
    if (updates && Object.prototype.hasOwnProperty.call(updates, 'blocked')) {
      setWorksiteBlocked(id, Boolean(updates.blocked));
    }
    return getWorksiteState(id);
  };

  const updateBufferCell = (bufferId, cellId, updates) => {
    if (!bufferId || !cellId) return null;
    bufferState = {
      ...bufferState,
      [bufferId]: (bufferState[bufferId] || []).map((cell) =>
        cell.id === cellId ? { ...cell, ...updates } : cell
      )
    };
    return (bufferState[bufferId] || []).find((cell) => cell.id === cellId) || null;
  };

  const updateLineRequest = (lineId, key, updates) => {
    if (!lineId) return null;
    lineRequests = lineRequests.map((req) => {
      if (req.id !== lineId) return req;
      if (!key) {
        return { ...req, ...updates };
      }
      return { ...req, [key]: { ...req[key], ...updates } };
    });
    return lineRequests.find((req) => req.id === lineId) || null;
  };

  const updateBufferOps = (bufferId, goodsType, level, updates, kind) => {
    if (!bufferId || !goodsType) return null;
    const levelKey = String(level);
    const current = opsOverrides.buffers?.[bufferId]?.[goodsType]?.levels?.[levelKey] || {};
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
    return opsOverrides;
  };

  const updatePlaceOps = (placeId, goodsType, updates, kind) => {
    if (!placeId || !goodsType) return null;
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
    return opsOverrides;
  };

  const getPackagingState = () => ({
    bufferState,
    lineRequests,
    opsOverrides
  });

  const addSimObstacle = (payload) => {
    const pos = {
      x: toFiniteNumber(payload?.x, NaN),
      y: toFiniteNumber(payload?.y, NaN)
    };
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
      return { ok: false, error: 'invalid_obstacle' };
    }
    const radius = Math.max(0, toFiniteNumber(payload?.radius, OBSTACLE_RADIUS));
    const mode = payload?.mode === 'avoid' ? 'avoid' : 'block';
    const obstacle = addObstacle(pos, { radius, mode, id: payload?.id });
    return { ok: Boolean(obstacle), obstacle, obstacles };
  };

  const clearObstacles = () => {
    const hadBlock = obstacles.some((obstacle) => obstacle?.mode === 'block');
    obstacles = [];
    robotRuntime.forEach((runtime, robotId) => {
      if (runtime?.avoidance) {
        runtime.avoidance = null;
        runtime.avoidanceHold = false;
      }
      if (runtime?.blockedReason === 'obstacle') {
        clearRobotBlock(robotId);
      }
    });
    pausedAutoRuntime.forEach((runtime, robotId) => {
      if (runtime?.blockedReason === 'obstacle') {
        clearRobotBlock(robotId);
      }
    });
    robots.forEach((robot) => {
      if (robot.manualBlocked && robot.manualBlockedReason === 'obstacle') {
        clearRobotBlock(robot.id);
      }
    });
    if (hadBlock) {
      recoverRoutesAfterObstacleClear();
    }
    return { ok: true, obstacles };
  };

  const listObstacles = () => ({ ok: true, obstacles });

  const removeObstacleById = (obstacleId) => {
    if (!obstacleId) return { ok: false, error: 'missing_obstacle' };
    const removedObstacle = obstacles.find((obstacle) => obstacle.id === obstacleId) || null;
    const before = obstacles.length;
    obstacles = obstacles.filter((obstacle) => obstacle.id !== obstacleId);
    const removed = obstacles.length !== before;
    if (removed) {
      robotRuntime.forEach((runtime, robotId) => {
        if (runtime?.avoidance?.obstacleId === obstacleId) {
          runtime.avoidance = null;
          runtime.avoidanceHold = false;
        }
        if (runtime?.blockedReason === 'obstacle' && runtime.blockedObstacleId === obstacleId) {
          clearRobotBlock(robotId);
        }
      });
      pausedAutoRuntime.forEach((runtime, robotId) => {
        if (runtime?.blockedReason === 'obstacle' && runtime.blockedObstacleId === obstacleId) {
          clearRobotBlock(robotId);
        }
      });
      robots.forEach((robot) => {
        if (
          robot.manualBlocked &&
          robot.manualBlockedReason === 'obstacle' &&
          robot.manualBlockedObstacleId === obstacleId
        ) {
          clearRobotBlock(robot.id);
        }
      });
      if (removedObstacle?.mode === 'block') {
        recoverRoutesAfterObstacleClear();
      }
    }
    return { ok: removed, obstacles };
  };

  const getSimSettings = () => ({
    ok: true,
    settings: {
      dispatchStrategy,
      trafficStrategy: trafficStrategy?.getName ? trafficStrategy.getName() : resolveTrafficStrategyName(robotsConfig),
      overrides: {
        dispatchStrategy: dispatchStrategyOverride,
        trafficStrategy: trafficStrategyOverride
      }
    }
  });

  const updateSimSettings = (payload = {}) => {
    if (!payload || typeof payload !== 'object') {
      return { ok: false, error: 'invalid_settings' };
    }
    let rebuildNavGraph = false;
    if (
      Object.prototype.hasOwnProperty.call(payload, 'dispatchStrategy') ||
      Object.prototype.hasOwnProperty.call(payload, 'dispatch')
    ) {
      const raw = Object.prototype.hasOwnProperty.call(payload, 'dispatchStrategy')
        ? payload.dispatchStrategy
        : payload.dispatch;
      if (raw === null || raw === '') {
        dispatchStrategyOverride = null;
      } else {
        const next = normalizeDispatchStrategy(raw);
        if (!next) return { ok: false, error: 'invalid_dispatch_strategy' };
        dispatchStrategyOverride = next;
      }
    }
    if (
      Object.prototype.hasOwnProperty.call(payload, 'trafficStrategy') ||
      Object.prototype.hasOwnProperty.call(payload, 'traffic')
    ) {
      const raw = Object.prototype.hasOwnProperty.call(payload, 'trafficStrategy')
        ? payload.trafficStrategy
        : payload.traffic;
      if (raw === null || raw === '') {
        trafficStrategyOverride = null;
        rebuildNavGraph = true;
      } else {
        const next = normalizeTrafficStrategy(raw);
        if (!next) return { ok: false, error: 'invalid_traffic_strategy' };
        trafficStrategyOverride = next;
        rebuildNavGraph = true;
      }
    }
    if (payload.trafficOptions && typeof payload.trafficOptions === 'object') {
      const current = robotsConfig && typeof robotsConfig === 'object' ? robotsConfig : {};
      const traffic = current.traffic && typeof current.traffic === 'object' ? current.traffic : {};
      robotsConfig = {
        ...current,
        traffic: {
          ...traffic,
          ...payload.trafficOptions
        }
      };
      rebuildNavGraph = true;
    }
    dispatchStrategy = resolveDispatchStrategy(robotsConfig);
    try {
      trafficStrategy = buildTrafficStrategy(robotsConfig);
    } catch (err) {
      return {
        ok: false,
        error: 'invalid_traffic_strategy',
        message: err.message || 'invalid_traffic_strategy'
      };
    }
    rebuildRobustnessState(robotsConfig, graphData);
    resetTrafficState();
    if (rebuildNavGraph && graphData) {
      navGraph = buildNavigationGraph(graphData);
      edgeConflictThresholds = resolveEdgeConflictThresholds(robots);
      maxRobotHead = resolveMaxRobotHead(robots);
      edgeConflictGroups = buildEdgeConflictGroups();
      yieldBays = buildYieldBays(graphData);
    }
    const resetRuntimeTraffic = (runtime, robot) => {
      if (!runtime) return;
      clearRuntimeStall(runtime);
      clearRuntimeStuck(runtime);
      runtime.entryHold = null;
      runtime.entryHoldBypass = null;
      invalidateEntryHoldWaiterCache();
      runtime.edgeLockHold = null;
      runtime.nodeLockHold = null;
      runtime.lastTrafficBlock = null;
      runtime.avoidanceHold = false;
      runtime.resumePhase = null;
      runtime.resumeRouteGoal = null;
      runtime.yieldStartedAt = null;
      runtime.yieldAttempts = 0;
      if (runtime.route) {
        runtime.route.schedule = null;
        runtime.route.scheduleProfile = null;
      }
      if (robot && runtime.route && trafficStrategy?.useTimeReservations?.() && !runtime.paused) {
        refreshRouteSchedule(robot, runtime, Date.now(), { force: true });
      }
    };
    robotRuntime.forEach((runtime, robotId) => {
      resetRuntimeTraffic(runtime, getRobotById(robotId));
    });
    pausedAutoRuntime.forEach((runtime, robotId) => {
      resetRuntimeTraffic(runtime, getRobotById(robotId));
    });
    return getSimSettings();
  };

  const handleBlocked = (payload) => {
    if (!payload || typeof payload !== 'object') {
      return { ok: false, error: 'missing_blocked' };
    }
    let blocked = payload.blocked;
    if (blocked === undefined) blocked = payload.status;
    if (blocked === undefined) blocked = payload.enabled;
    if (blocked === undefined) blocked = payload.enable;
    if (blocked === undefined) blocked = payload.value;
    if (blocked === undefined) return { ok: false, error: 'missing_blocked' };
    const normalized = typeof blocked === 'string'
      ? blocked.trim().toLowerCase() !== 'false' && blocked.trim() !== '0'
      : Boolean(blocked);
    const robotId = payload.robotId || payload.id;
    if (!robotId) return { ok: false, error: 'missing_robot' };
    if (normalized) {
      const runtime = getRobotRuntime(robotId);
      if (runtime) {
        if (runtime.blockedReason == null) {
          runtime.pausedBeforeBlocked = runtime.paused;
        }
        runtime.paused = true;
        runtime.blockedReason = 'blocked';
        runtime.blockedObstacleId = null;
        if (runtime.taskId) {
          updateTask(runtime.taskId, { status: 'paused', phase: 'blocked' });
        }
        if (trafficStrategy?.useTimeReservations?.()) {
          releaseTimeReservations(robotId);
          if (runtime.route) {
            runtime.route.schedule = null;
            runtime.route.scheduleProfile = null;
          }
          refreshRouteSchedulesAfterRelease(robotId);
        }
      }
      updateRobotState(robotId, { blocked: true, activity: 'blocked' });
    } else {
      const ok = clearRobotBlock(robotId);
      if (!ok) {
        return { ok: false, blocked: true, error: 'clear_failed' };
      }
    }
    return { ok: true, blocked: normalized };
  };

  return {
    loadBundle,
    start,
    stopSim,
    step,
    getDebugState,
    getStatus,
    getWorksites,
    updateWorksite,
    getDiagnostics,
    setRobotManualMode,
    goTarget: (robotId, targetId, actionKey) => {
      const manualAction = MANUAL_ACTIONS[actionKey] ?? null;
      return startManualNavigation(robotId, targetId, manualAction);
    },
    goPoint: (robotId, x, y, angle) => {
      const target = { x: Number(x), y: Number(y) };
      if (Number.isFinite(angle)) target.angle = angle;
      return startManualNavigationToPos(robotId, target, null);
    },
    translate: translateRobot,
    turn: turnRobot,
    motion: applyMotion,
    pause: (robotId) => toggleNavigationPause(robotId, true),
    resume: (robotId) => toggleNavigationPause(robotId, false),
    cancel: stopNavigation,
    stop: stopNavigation,
    simulatePickProblem,
    simulatePickRobotBlocked,
    simulateDropProblem,
    simulateDriveProblem,
    clearRobotBlock,
    clearRobotCollision,
    getPackagingState,
    getEventLog: () => [...eventLog],
    clearEventLog: () => {
      eventLog = [];
      return { ok: true };
    },
    updateBufferCell,
    updateLineRequest,
    updateBufferOps,
    updatePlaceOps,
    addSimObstacle,
    clearObstacles,
    listObstacles,
    removeObstacleById,
    getSimSettings,
    updateSimSettings,
    handleBlocked,
    setWorksiteBlocked,
    setWorksiteOccupancy,
    setRobotDispatchable,
    setRobotControlled,
    setRobotPose,
    ...(enableTestHooks
      ? {
          __test: {
            forceYield: forceYieldForTest,
            getRuntime: (robotId) => getRobotRuntime(robotId),
            getScheduleSlackMs: (robotId) => {
              const robot = getRobotById(robotId);
              if (!robot) return null;
              const runtime = getRobotRuntime(robotId);
              const segment = runtime?.route?.segments?.[runtime.route.segmentIndex || 0] || null;
              return resolveScheduleSlackMs(robot, segment);
            },
            recordScheduleDelay: (robotId, delayMs) => {
              const robot = getRobotById(robotId);
              if (!robot) return false;
              const config = resolveScheduleSlackStatsConfig(robot);
              recordScheduleDelay(robotId, delayMs, config, Date.now());
              return true;
            },
            repairSchedule: (robotId, nowMs) => {
              const robot = getRobotById(robotId);
              const runtime = getRobotRuntime(robotId);
              return repairRouteSchedule(
                robot,
                runtime,
                Number.isFinite(nowMs) ? nowMs : Date.now(),
                runtime?.cbsConstraints || null
              );
            }
          }
        }
      : {})
  };
}

module.exports = { createFleetSim };
