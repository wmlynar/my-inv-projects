const assert = require("node:assert/strict");

const { MotionKernel } = require("@fleet-manager/sim-runtime");

const ROBOT_SPEED_MPS = 0.9;
const ROBOT_ACCEL_MPS2 = 0.7;
const ROBOT_DECEL_MPS2 = 1.2;
const ROBOT_TURN_RATE_RAD_S = Math.PI;
const ROBOT_ARRIVAL_DISTANCE = 0.18;
const ROBOT_ARRIVAL_SPEED = 0.04;
const ROBOT_MIN_TURN_SPEED_FACTOR = 0.2;
const DEFAULT_ROBOT_MODEL = { head: 0.5, tail: 2, width: 1 };
const ROBOT_RADIUS =
  Math.hypot(DEFAULT_ROBOT_MODEL.head + DEFAULT_ROBOT_MODEL.tail, DEFAULT_ROBOT_MODEL.width) / 2;
const ROBOT_STOP_DISTANCE = ROBOT_RADIUS * 2 - 0.1;
const ROBOT_YIELD_DISTANCE = ROBOT_STOP_DISTANCE + 0.6;
const ROBOT_YIELD_SPEED_FACTOR = 0.35;
const TRAFFIC_LOOKAHEAD_S = 2.2;
const TRAFFIC_SAME_DIR_MAX_RAD = Math.PI / 3;
const ROUTE_PROGRESS_EPS = 0.05;
const EDGE_LOCK_FOLLOW_DISTANCE = ROBOT_STOP_DISTANCE + 0.4;
const EDGE_LOCK_TIMEOUT_MS = 5000;
const EDGE_QUEUE_TIMEOUT_MS = 2000;
const EDGE_DIRECTION_HOLD_MS = 2200;
const EDGE_DIRECTION_MAX_HOLD_MS = 8000;
const DEADLOCK_TIMEOUT_MS = 3000;
const YIELD_BACKOFF_DISTANCE = 1.2;
const NODE_LOCK_TTL_MS = 1500;
const STUCK_RETRY_BASE_MS = 800;
const STUCK_RETRY_MAX_MS = 6000;
const AVOIDANCE_BLOCK_RADIUS = ROBOT_RADIUS * 2.2;
const AVOIDANCE_RELEASE_MARGIN = 0.3;
const AVOIDANCE_DISABLED = true;
const AVOIDANCE_BLOCK_BANNER = [
  "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
  "!!! WARNING: AVOIDANCE/YIELD TEST BLOCKED (DISABLED NOW) !!!",
  "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
].join("\n");

function blockAvoidanceTest(name, reason) {
  if (!AVOIDANCE_DISABLED) return false;
  console.warn(`${AVOIDANCE_BLOCK_BANNER}\nBlocked test: ${name}\nReason: ${reason}\n`);
  return true;
}

const clamp = MotionKernel.clamp;
const normalizeAngle = MotionKernel.normalizeAngle;
const buildPolyline = MotionKernel.buildPolyline;
const polylineAtDistance = MotionKernel.polylineAtDistance;

function makeEdgeGroupKey(fromId, toId) {
  if (!fromId || !toId) return null;
  return fromId < toId ? `${fromId}<->${toId}` : `${toId}<->${fromId}`;
}

function normalizeRobotModel(model) {
  if (!model || typeof model !== "object") return { ...DEFAULT_ROBOT_MODEL };
  const head = Number(model.head);
  const tail = Number(model.tail);
  const width = Number(model.width);
  return {
    head: Number.isFinite(head) && head > 0 ? head : DEFAULT_ROBOT_MODEL.head,
    tail: Number.isFinite(tail) && tail > 0 ? tail : DEFAULT_ROBOT_MODEL.tail,
    width: Number.isFinite(width) && width > 0 ? width : DEFAULT_ROBOT_MODEL.width
  };
}

function ensureRobotModel(robot) {
  if (!robot) return null;
  const model = normalizeRobotModel(robot.model);
  robot.model = model;
  return model;
}

function getRobotEnvelopeRadius(robot) {
  const model = normalizeRobotModel(robot?.model);
  const length = Math.max(0, model.head + model.tail);
  const width = Math.max(0, model.width);
  const diag = Math.hypot(length, width);
  const envelope = diag > 0 ? diag * 0.5 : null;
  const direct = Number(robot?.radius);
  if (Number.isFinite(direct) && direct > 0) {
    return envelope ? Math.max(envelope, direct) : direct;
  }
  return envelope || ROBOT_RADIUS;
}

function scaleRobotModel(robot, factor) {
  const base = ensureRobotModel(robot);
  const scale = Number.isFinite(factor) ? Math.max(0.1, factor) : 1;
  const scaled = {
    head: base.head * scale,
    tail: base.tail * scale,
    width: base.width * scale
  };
  robot.model = scaled;
  return scaled;
}

function ensureRobotMotion(robot) {
  if (!robot) return;
  ensureRobotModel(robot);
  if (!Number.isFinite(robot.heading)) robot.heading = 0;
  if (!Number.isFinite(robot.speed)) robot.speed = 0;
}

function computeTurnPenalty(diff) {
  const ratio = Math.min(Math.abs(diff) / (Math.PI / 2), 1);
  return clamp(1 - ratio, ROBOT_MIN_TURN_SPEED_FACTOR, 1);
}

function computeStoppingSpeed(distance) {
  if (!Number.isFinite(distance) || distance <= 0) return 0;
  return Math.sqrt(2 * ROBOT_DECEL_MPS2 * distance);
}

function getRobotVelocity(robot) {
  ensureRobotMotion(robot);
  return {
    vx: Math.cos(robot.heading) * robot.speed,
    vy: Math.sin(robot.heading) * robot.speed
  };
}

function getTrafficSpacing(robot) {
  const radius = getRobotEnvelopeRadius(robot);
  const stop = Math.max(ROBOT_STOP_DISTANCE, radius * 2 - 0.1);
  const yieldDist = Math.max(ROBOT_YIELD_DISTANCE, stop + 0.6);
  return { stop, yield: yieldDist };
}

function isSameDirectionTrafficBlock(robot, opponent) {
  if (!robot?.pos || !opponent?.pos) return false;
  const robotVel = getRobotVelocity(robot);
  const robotSpeed = Math.hypot(robotVel.vx, robotVel.vy);
  const robotHeading = Number.isFinite(robot.heading) ? robot.heading : 0;
  const robotDir = robotSpeed > 1e-3
    ? { x: robotVel.vx / robotSpeed, y: robotVel.vy / robotSpeed }
    : { x: Math.cos(robotHeading), y: Math.sin(robotHeading) };

  const oppVel = getRobotVelocity(opponent);
  const oppSpeed = Math.hypot(oppVel.vx, oppVel.vy);
  const oppHeading = Number.isFinite(opponent.heading) ? opponent.heading : 0;
  const oppDir = oppSpeed > 1e-3
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
}

function getTrafficSpeedLimit(robot, robots, desiredSpeed, desiredHeading, context) {
  const desiredSpeedValue = Number.isFinite(desiredSpeed) ? desiredSpeed : 0;
  const desiredMag = Math.abs(desiredSpeedValue);
  if (!robot?.pos) return { speedLimit: desiredMag, blockingId: null };
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
  const avoidanceZones = context?.avoidanceZones;
  const avoidanceOwners = new Set();
  const spacing = getTrafficSpacing(robot);
  const stopDistance = spacing.stop;
  const yieldDistance = spacing.yield;

  if (avoidanceZones && avoidanceZones.size) {
    for (const zone of avoidanceZones.values()) {
      if (!zone?.pos) continue;
      if (zone.ownerId === robot.id) continue;
      const dist = Math.hypot(robot.pos.x - zone.pos.x, robot.pos.y - zone.pos.y);
      if (dist <= zone.radius && !zone.allowed.has(robot.id)) {
        return { speedLimit: 0, blockingId: zone.ownerId, blockReason: "avoidance_zone" };
      }
      if (dist <= zone.radius && zone.allowed.has(robot.id)) {
        avoidanceOwners.add(zone.ownerId);
      }
    }
  }

  for (const other of robots) {
    if (other.id === robot.id) continue;
    if (avoidanceOwners.has(other.id)) continue;
    if (!other.pos) continue;
    const dx = other.pos.x - robot.pos.x;
    const dy = other.pos.y - robot.pos.y;
    const dist = Math.hypot(dx, dy);
    const forward = dx * forwardDir.x + dy * forwardDir.y;
    const otherVel = getRobotVelocity(other);
    const otherSpeed = Math.hypot(otherVel.vx, otherVel.vy);
    const otherHeading = otherSpeed > 1e-3
      ? Math.atan2(otherVel.vy, otherVel.vx)
      : Number.isFinite(other.heading)
        ? other.heading
        : 0;
    const headingDiff = Math.abs(normalizeAngle(motionHeading - otherHeading));
    const sameHeading = headingDiff <= TRAFFIC_SAME_DIR_MAX_RAD;
    const telemetryAgeMs = Number(other?.telemetryAgeMs);
    const telemetryBuffer =
      Number.isFinite(telemetryAgeMs) && telemetryAgeMs > 0
        ? (telemetryAgeMs / 1000) * ROBOT_SPEED_MPS
        : 0;
    const stopDistanceForOther = stopDistance + telemetryBuffer;
    const yieldDistanceForOther = yieldDistance + telemetryBuffer;
    if ((desiredMag > 1e-3 || speedMag > 1e-3) && forward < 0) {
      if (!(sameHeading && telemetryAgeMs > 0 && dist <= yieldDistanceForOther)) {
        continue;
      }
    }
    if (dist <= stopDistanceForOther) {
      speedLimit = 0;
      blockingId = other.id;
      break;
    }
    if (sameHeading && forward > 0) {
      const lateral = Math.abs(dx * -forwardDir.y + dy * forwardDir.x);
      if (lateral <= stopDistanceForOther) {
        if (dist <= yieldDistanceForOther) {
          speedLimit = Math.min(speedLimit, otherSpeed);
        }
        const followGap = dist - stopDistanceForOther;
        if (followGap > 0) {
          speedLimit = Math.min(speedLimit, computeStoppingSpeed(followGap));
        }
      }
    }
    const relVx = plannedVel.vx - otherVel.vx;
    const relVy = plannedVel.vy - otherVel.vy;
    const relSpeedSq = relVx * relVx + relVy * relVy;
    let tClosest = 0;
    if (relSpeedSq > 1e-4) {
      tClosest = clamp(-(dx * relVx + dy * relVy) / relSpeedSq, 0, TRAFFIC_LOOKAHEAD_S);
    }
    const closestX = dx + relVx * tClosest;
    const closestY = dy + relVy * tClosest;
    const closestDist = Math.hypot(closestX, closestY);
    if (closestDist <= stopDistanceForOther) {
      speedLimit = 0;
      blockingId = other.id;
      break;
    }
    if (closestDist <= yieldDistanceForOther) {
      speedLimit = Math.min(speedLimit, ROBOT_SPEED_MPS * ROBOT_YIELD_SPEED_FACTOR);
    }
  }

  return { speedLimit, blockingId };
}

function applyKinematicMotion(robot, desiredHeading, desiredSpeed, dt) {
  if (!robot?.pos || !Number.isFinite(dt) || dt <= 0) {
    return { distance: 0 };
  }
  ensureRobotMotion(robot);
  const diff = normalizeAngle(desiredHeading - robot.heading);
  const maxTurn = ROBOT_TURN_RATE_RAD_S * dt;
  const turnStep = clamp(diff, -maxTurn, maxTurn);
  robot.heading = normalizeAngle(robot.heading + turnStep);

  const turnPenalty = computeTurnPenalty(diff);
  const speedTarget = desiredSpeed * turnPenalty;
  const sameDirection = Math.sign(speedTarget) === Math.sign(robot.speed);
  const accel =
    sameDirection && Math.abs(speedTarget) > Math.abs(robot.speed)
      ? ROBOT_ACCEL_MPS2
      : ROBOT_DECEL_MPS2;
  const delta = accel * dt;
  if (robot.speed < speedTarget) {
    robot.speed = Math.min(robot.speed + delta, speedTarget);
  } else if (robot.speed > speedTarget) {
    robot.speed = Math.max(robot.speed - delta, speedTarget);
  }

  const distance = robot.speed * dt;
  if (distance !== 0) {
    robot.pos = {
      x: robot.pos.x + Math.cos(robot.heading) * distance,
      y: robot.pos.y + Math.sin(robot.heading) * distance
    };
  }
  return { distance };
}

function moveRobotToward(robot, target, robots, deltaMs, context) {
  if (!robot?.pos || !target) return { arrived: true, traffic: null };
  const dt = deltaMs / 1000;
  if (!Number.isFinite(dt) || dt <= 0) return { arrived: false, traffic: null };
  ensureRobotMotion(robot);
  const dx = target.x - robot.pos.x;
  const dy = target.y - robot.pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= ROBOT_ARRIVAL_DISTANCE) {
    robot.pos = { ...target };
    robot.speed = 0;
    return { arrived: true, traffic: null };
  }
  const desiredHeading = Math.atan2(dy, dx);
  let desiredSpeed = Math.min(ROBOT_SPEED_MPS, computeStoppingSpeed(dist));
  const traffic = getTrafficSpeedLimit(robot, robots, desiredSpeed, desiredHeading, context);
  desiredSpeed = Math.min(desiredSpeed, traffic.speedLimit);
  applyKinematicMotion(robot, desiredHeading, desiredSpeed, dt);
  const remaining = Math.hypot(target.x - robot.pos.x, target.y - robot.pos.y);
  if (remaining <= ROBOT_ARRIVAL_DISTANCE && robot.speed <= ROBOT_ARRIVAL_SPEED) {
    robot.pos = { ...target };
    robot.speed = 0;
    return { arrived: true, traffic };
  }
  return { arrived: false, traffic };
}

function createRoute(startPos, endPos, fromId, toId) {
  const polyline = buildPolyline([startPos, endPos]);
  return {
    segments: [
      {
        polyline,
        totalLength: polyline.totalLength,
        driveBackward: false,
        edgeKey: `${fromId}->${toId}`,
        edgeGroupKey: makeEdgeGroupKey(fromId, toId),
        fromNodeId: fromId,
        toNodeId: toId
      }
    ],
    segmentIndex: 0,
    segmentProgress: 0,
    finalTarget: { pos: { ...endPos }, heading: 0 }
  };
}

function createHarness() {
  const edgeLocks = new Map();
  const edgeQueues = new Map();
  const nodeLocks = new Map();
  const conflictGroups = new Map();
  const edgeDirectionLocks = new Map();

  const pruneEdgeQueue = (edgeGroupKey, nowMs, activeIds) => {
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const queue = (edgeQueues.get(edgeGroupKey) || []).filter((entry) => {
      if (!entry || !entry.robotId) return false;
      if (!Number.isFinite(entry.updatedAt)) return false;
      if (now - entry.updatedAt > EDGE_QUEUE_TIMEOUT_MS) return false;
      return activeIds.has(entry.robotId);
    });
    if (queue.length) {
      edgeQueues.set(edgeGroupKey, queue);
    } else {
      edgeQueues.delete(edgeGroupKey);
    }
    return queue;
  };

  const touchEdgeQueue = (edgeGroupKey, robotId, edgeKey, nowMs) => {
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const queue = edgeQueues.get(edgeGroupKey) || [];
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
    const queue = (edgeQueues.get(edgeGroupKey) || []).filter((entry) => entry.robotId !== robotId);
    if (queue.length) {
      edgeQueues.set(edgeGroupKey, queue);
    } else {
      edgeQueues.delete(edgeGroupKey);
    }
  };

  const getEdgeQueueHeadId = (edgeGroupKey, nowMs, activeIds, preferredEdgeKey = null) => {
    const queue = pruneEdgeQueue(edgeGroupKey, nowMs, activeIds);
    if (!queue.length) return null;
    if (preferredEdgeKey) {
      const preferred = queue.find((entry) => entry.edgeKey === preferredEdgeKey);
      if (preferred) return preferred.robotId;
    }
    return queue[0]?.robotId || null;
  };

  const releaseRobotEdgeQueues = (robotId) => {
    for (const [key, queue] of edgeQueues.entries()) {
      const next = queue.filter((entry) => entry.robotId !== robotId);
      if (next.length) edgeQueues.set(key, next);
      else edgeQueues.delete(key);
    }
  };

  const releaseRobotEdgeLocks = (robotId) => {
    if (!robotId) return;
    for (const [key, locks] of edgeLocks.entries()) {
      const existing = locks.get(robotId);
      if (existing) {
        locks.delete(robotId);
        if (existing.edgeKey) {
          const dirLock = edgeDirectionLocks.get(key);
          if (dirLock && dirLock.edgeKey === existing.edgeKey) {
            dirLock.count = Math.max(0, dirLock.count - 1);
            if (dirLock.count === 0) {
              dirLock.holdUntil = Date.now() + EDGE_DIRECTION_HOLD_MS;
            }
          }
        }
        releaseEdgeQueueEntry(key, robotId);
      }
      if (!locks.size) edgeLocks.delete(key);
    }
  };

  const reserveEdgeLock = (edgeGroupKey, robotId, edgeKey, progress, totalLength, minDistance, activeIds) => {
    if (!edgeGroupKey || !robotId) return { ok: true, holder: null };
    const locks = edgeLocks.get(edgeGroupKey) || new Map();
    const nextProgress = Number.isFinite(progress) ? progress : null;
    const now = Date.now();
    const spacing = Number.isFinite(minDistance) ? minDistance : EDGE_LOCK_FOLLOW_DISTANCE;
    const existing = locks.get(robotId) || null;

    touchEdgeQueue(edgeGroupKey, robotId, edgeKey, now);
    const queue = pruneEdgeQueue(edgeGroupKey, now, activeIds);
    const directionKey = edgeKey || null;
    const directionLock = edgeDirectionLocks.get(edgeGroupKey) || null;
    if (existing && existing.edgeKey && existing.edgeKey !== directionKey) {
      const prevDirLock = edgeDirectionLocks.get(edgeGroupKey);
      if (prevDirLock && prevDirLock.edgeKey === existing.edgeKey) {
        prevDirLock.count = Math.max(0, prevDirLock.count - 1);
        if (prevDirLock.count === 0) {
          prevDirLock.holdUntil = now + EDGE_DIRECTION_HOLD_MS;
        }
      }
    }
    if (existing && existing.edgeKey === directionKey) {
      existing.progress = nextProgress;
      existing.totalLength = Number.isFinite(totalLength) ? totalLength : existing.totalLength;
      existing.updatedAt = now;
      if (directionKey) {
        const lock = edgeDirectionLocks.get(edgeGroupKey);
        if (lock && lock.edgeKey === directionKey) {
          lock.holdUntil = now + EDGE_DIRECTION_HOLD_MS;
        }
      }
      edgeLocks.set(edgeGroupKey, locks);
      return { ok: true, holder: robotId };
    }
    if (directionLock && directionLock.edgeKey && directionKey && directionLock.edgeKey !== directionKey) {
      const directionHolder = (() => {
        for (const lock of locks.values()) {
          if (lock.edgeKey === directionLock.edgeKey) {
            return lock.robotId || null;
          }
        }
        return null;
      })();
      const sameDirQueueCount = queue.filter((entry) => entry.edgeKey === directionLock.edgeKey).length;
      const sameDirWaiting = sameDirQueueCount > directionLock.count;
      const maxHoldExceeded = now - directionLock.lastSwitchAt >= EDGE_DIRECTION_MAX_HOLD_MS;
      if (directionLock.count > 0) {
        return { ok: false, holder: directionHolder || directionLock.edgeKey };
      }
      if (sameDirWaiting && !maxHoldExceeded) {
        return { ok: false, holder: directionHolder || directionLock.edgeKey };
      }
      edgeDirectionLocks.delete(edgeGroupKey);
    }
    const preferredDirection =
      directionLock && directionLock.edgeKey && directionLock.edgeKey === directionKey
        ? directionLock.edgeKey
        : null;
    const shouldEnforceQueueHead = !directionLock || directionLock.edgeKey !== directionKey;
    if (shouldEnforceQueueHead) {
      const headId = getEdgeQueueHeadId(edgeGroupKey, now, activeIds, preferredDirection);
      if (headId && headId !== robotId) {
        return { ok: false, holder: headId };
      }
    }

    const conflicts = conflictGroups.get(edgeGroupKey);
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
          return { ok: false, holder: lock.robotId };
        }
      }
    }

    locks.set(robotId, {
      robotId,
      edgeKey: edgeKey || null,
      progress: nextProgress,
      totalLength: Number.isFinite(totalLength) ? totalLength : null,
      updatedAt: now
    });
    edgeLocks.set(edgeGroupKey, locks);
    if (directionKey) {
      const lock = edgeDirectionLocks.get(edgeGroupKey);
      if (!lock || lock.edgeKey !== directionKey) {
        edgeDirectionLocks.set(edgeGroupKey, {
          edgeKey: directionKey,
          count: 1,
          holdUntil: now + EDGE_DIRECTION_HOLD_MS,
          lastSwitchAt: now
        });
      } else {
        lock.count = lock.count + 1;
        lock.holdUntil = now + EDGE_DIRECTION_HOLD_MS;
      }
    }
    return { ok: true, holder: robotId };
  };

  const releaseEdgeLock = (edgeGroupKey, robotId) => {
    if (!edgeGroupKey || !robotId) return;
    const locks = edgeLocks.get(edgeGroupKey);
    if (!locks) return;
    const existing = locks.get(robotId);
    locks.delete(robotId);
    if (!locks.size) edgeLocks.delete(edgeGroupKey);
    releaseEdgeQueueEntry(edgeGroupKey, robotId);
    if (existing?.edgeKey) {
      const dirLock = edgeDirectionLocks.get(edgeGroupKey);
      if (dirLock && dirLock.edgeKey === existing.edgeKey) {
        dirLock.count = Math.max(0, dirLock.count - 1);
        if (dirLock.count === 0) {
          dirLock.holdUntil = Date.now() + EDGE_DIRECTION_HOLD_MS;
        }
      }
    }
  };

  const expireEdgeLocks = (nowMs) => {
    for (const [key, locks] of edgeLocks.entries()) {
      for (const [robotId, lock] of locks.entries()) {
        if (nowMs - lock.updatedAt > EDGE_LOCK_TIMEOUT_MS) {
          locks.delete(robotId);
          if (lock?.edgeKey) {
            const dirLock = edgeDirectionLocks.get(key);
            if (dirLock && dirLock.edgeKey === lock.edgeKey) {
              dirLock.count = Math.max(0, dirLock.count - 1);
              if (dirLock.count === 0) {
                dirLock.holdUntil = nowMs + EDGE_DIRECTION_HOLD_MS;
              }
            }
          }
        }
      }
      if (!locks.size) edgeLocks.delete(key);
    }
    for (const [key, dirLock] of edgeDirectionLocks.entries()) {
      if (dirLock.count > 0) continue;
      if (nowMs >= dirLock.holdUntil) {
        edgeDirectionLocks.delete(key);
      }
    }
  };

  const reserveNodeLock = (nodeId, robotId) => {
    const now = Date.now();
    const lock = nodeLocks.get(nodeId);
    if (lock && lock.robotId !== robotId && now < lock.expiresAt) {
      return { ok: false, holder: lock.robotId };
    }
    nodeLocks.set(nodeId, { robotId, expiresAt: now + NODE_LOCK_TTL_MS });
    return { ok: true, holder: robotId };
  };

  const expireNodeLocks = (nowMs) => {
    for (const [nodeId, lock] of nodeLocks.entries()) {
      if (nowMs >= lock.expiresAt) {
        nodeLocks.delete(nodeId);
      }
    }
  };

  return {
    edgeLocks,
    edgeQueues,
    nodeLocks,
    conflictGroups,
    edgeDirectionLocks,
    pruneEdgeQueue,
    touchEdgeQueue,
    releaseEdgeQueueEntry,
    getEdgeQueueHeadId,
    releaseRobotEdgeQueues,
    releaseRobotEdgeLocks,
    reserveEdgeLock,
    releaseEdgeLock,
    expireEdgeLocks,
    reserveNodeLock,
    expireNodeLocks
  };
}

function markRuntimeStall(runtime, reason, opponentId) {
  if (!runtime) return;
  if (runtime.stallSince && runtime.stallReason === reason) {
    if (opponentId && runtime.stallOpponentId !== opponentId) {
      runtime.stallOpponentId = opponentId;
    }
    return;
  }
  runtime.stallSince = Date.now();
  runtime.stallReason = reason || "blocked";
  runtime.stallOpponentId = opponentId || null;
}

function clearRuntimeStall(runtime) {
  if (!runtime) return;
  runtime.stallSince = null;
  runtime.stallReason = null;
  runtime.stallOpponentId = null;
}

function getStuckRetryDelay(count) {
  const safeCount = Number.isFinite(count) ? Math.max(1, count) : 1;
  const delay = STUCK_RETRY_BASE_MS * Math.pow(2, safeCount - 1);
  return Math.min(delay, STUCK_RETRY_MAX_MS);
}

function clearRuntimeStuck(runtime) {
  if (!runtime) return;
  runtime.stuckSince = null;
  runtime.stuckReason = null;
  runtime.stuckRetryAt = null;
  runtime.stuckCount = 0;
}

function enterStuckState(runtime, reason, harness, robotId) {
  if (!runtime) return;
  const now = Date.now();
  if (!runtime.stallSince) {
    markRuntimeStall(runtime, reason || "stuck");
  }
  runtime.stuckSince = runtime.stuckSince || now;
  runtime.stuckReason = reason || runtime.stuckReason || "stuck";
  runtime.stuckCount = (runtime.stuckCount || 0) + 1;
  runtime.stuckRetryAt = now + getStuckRetryDelay(runtime.stuckCount);
  runtime.target = null;
  runtime.route = null;
  if (robotId) {
    harness.releaseRobotEdgeQueues(robotId);
  }
}

function shouldTriggerYield(robot, runtime, robots, harness) {
  if (!runtime || runtime.phase === "yield") return false;
  if (runtime.stuckRetryAt) return false;
  if (!runtime.stallSince) return false;
  const now = Date.now();
  if (runtime.lastYieldAt && now - runtime.lastYieldAt < 2000) return false;
  const segment = runtime.route?.segments?.[runtime.route.segmentIndex];
  const edgeGroupKey = segment?.edgeGroupKey || null;
  const lockMap = edgeGroupKey && harness?.edgeLocks ? harness.edgeLocks.get(edgeGroupKey) : null;
  const holdsLock = lockMap ? lockMap.has(robot?.id) : false;
  if (runtime.stallReason === "edge_lock" && robot?.pos && Array.isArray(robots)) {
    const spacing = getTrafficSpacing(robot);
    const hasNearby = robots.some((other) => {
      if (!other?.pos || other.id === robot.id) return false;
      return Math.hypot(other.pos.x - robot.pos.x, other.pos.y - robot.pos.y) <= spacing.yield;
    });
    if (!hasNearby) {
      return false;
    }
  }
  if (
    (runtime.stallReason === "traffic" || runtime.stallReason === "edge_lock") &&
    runtime.stallOpponentId &&
    robot?.id
  ) {
    const opponent = Array.isArray(robots)
      ? robots.find((item) => item.id === runtime.stallOpponentId)
      : null;
    const opponentHoldsLock = opponent && lockMap ? lockMap.has(opponent.id) : false;
    if (opponent && isSameDirectionTrafficBlock(robot, opponent)) {
      return false;
    }
    const order = String(robot.id).localeCompare(String(runtime.stallOpponentId));
    if (order < 0) {
      if (
        opponent &&
        !opponentHoldsLock &&
        holdsLock &&
        !isSameDirectionTrafficBlock(robot, opponent)
      ) {
        return now - runtime.stallSince >= DEADLOCK_TIMEOUT_MS;
      }
      return false;
    }
  }
  return now - runtime.stallSince >= DEADLOCK_TIMEOUT_MS;
}

function computeYieldTarget(robot, runtime, backoff) {
  if (runtime?.noYieldTarget) return null;
  if (!robot?.pos) return null;
  const segment = runtime.route?.segments?.[runtime.route.segmentIndex];
  const forwardHeading = Number.isFinite(segment?.polyline?.headings?.[0]) ? segment.polyline.headings[0] : null;
  const forwardDir = Number.isFinite(forwardHeading)
    ? { x: Math.cos(forwardHeading), y: Math.sin(forwardHeading) }
    : null;
  const isBehind = (pos) => {
    if (!forwardDir) return true;
    const dx = pos.x - robot.pos.x;
    const dy = pos.y - robot.pos.y;
    return dx * forwardDir.x + dy * forwardDir.y <= 0;
  };
  if (segment?.polyline && Number.isFinite(runtime.route.segmentProgress)) {
    const distance = Math.max(0, runtime.route.segmentProgress - backoff);
    const pose = polylineAtDistance(segment.polyline, distance);
    const dist = Math.hypot(pose.x - robot.pos.x, pose.y - robot.pos.y);
    const radius = getRobotEnvelopeRadius(robot);
    if (dist >= radius * 0.5 && isBehind(pose)) {
      return { x: pose.x, y: pose.y };
    }
  }
  if (forwardDir) {
    return {
      x: robot.pos.x - forwardDir.x * backoff,
      y: robot.pos.y - forwardDir.y * backoff
    };
  }
  const heading = Number.isFinite(robot.heading) ? robot.heading : 0;
  return {
    x: robot.pos.x - Math.cos(heading) * backoff,
    y: robot.pos.y - Math.sin(heading) * backoff
  };
}

function triggerYield(robot, runtime, harness) {
  const yieldTarget = computeYieldTarget(robot, runtime, YIELD_BACKOFF_DISTANCE);
  if (!yieldTarget) {
    enterStuckState(runtime, "yield", harness, robot.id);
    return true;
  }
  runtime.resumePhase = runtime.phase;
  runtime.resumeRoute = runtime.route;
  runtime.phase = "yield";
  runtime.target = { ...yieldTarget };
  runtime.route = null;
  runtime.lastYieldAt = Date.now();
  clearRuntimeStall(runtime);
  harness.releaseRobotEdgeLocks(robot.id);
  harness.releaseRobotEdgeQueues(robot.id);
  return true;
}

function advanceRouteProgress(robot, runtime, harness, robots, activeIds, deltaMs, context) {
  const route = runtime.route;
  const segment = route.segments[route.segmentIndex];
  const dt = deltaMs / 1000;
  const desiredHeading = segment.driveBackward
    ? normalizeAngle(segment.polyline.headings[0] + Math.PI)
    : segment.polyline.headings[0];
  const lockStatus = harness.reserveEdgeLock(
    segment.edgeGroupKey,
    robot.id,
    segment.edgeKey,
    route.segmentProgress,
    segment.totalLength,
    EDGE_LOCK_FOLLOW_DISTANCE,
    activeIds
  );
  if (!lockStatus.ok) {
    markRuntimeStall(runtime, "edge_lock", lockStatus.holder);
    return;
  }
  let desiredSpeed = Math.min(ROBOT_SPEED_MPS, computeStoppingSpeed(segment.totalLength - route.segmentProgress));
  const traffic = getTrafficSpeedLimit(robot, robots, desiredSpeed, desiredHeading, context);
  desiredSpeed = Math.min(desiredSpeed, traffic.speedLimit);
  if (desiredSpeed === 0) {
    markRuntimeStall(runtime, "traffic", traffic.blockingId);
  }
  const motion = applyKinematicMotion(robot, desiredHeading, desiredSpeed, dt);
  if (Math.abs(motion.distance) > 1e-4) {
    clearRuntimeStall(runtime);
  }
  route.segmentProgress = Math.min(segment.totalLength, route.segmentProgress + Math.abs(motion.distance));
  if (segment.totalLength - route.segmentProgress <= ROUTE_PROGRESS_EPS) {
    robot.pos = { ...route.finalTarget.pos };
    harness.releaseEdgeLock(segment.edgeGroupKey, robot.id);
    runtime.phase = "done";
  }
}

function stepRobot(robot, runtime, harness, robots, activeIds, deltaMs, context) {
  const trafficRobots = Array.isArray(robots) ? robots : [];
  if (runtime.stuckRetryAt) {
    if (Date.now() < runtime.stuckRetryAt) {
      return;
    }
    clearRuntimeStuck(runtime);
  }
  if (runtime.phase === "yield") {
    const step = moveRobotToward(robot, runtime.target, trafficRobots, deltaMs, context);
    if (step.traffic?.speedLimit === 0) {
      markRuntimeStall(runtime, "traffic", step.traffic.blockingId);
    }
    const remaining = runtime.target
      ? Math.hypot(runtime.target.x - robot.pos.x, runtime.target.y - robot.pos.y)
      : 0;
    if (step.arrived || remaining <= ROBOT_ARRIVAL_DISTANCE) {
      if (runtime.target) {
        robot.pos = { ...runtime.target };
      }
      robot.speed = 0;
      runtime.phase = runtime.resumePhase || "moving";
      runtime.route = runtime.resumeRoute;
      runtime.resumePhase = null;
      runtime.resumeRoute = null;
      runtime.target = null;
      clearRuntimeStall(runtime);
      return;
    }
    return;
  }

  if (runtime.route) {
    if (shouldTriggerYield(robot, runtime, trafficRobots, harness)) {
      if (triggerYield(robot, runtime, harness)) {
        return;
      }
    }
    advanceRouteProgress(robot, runtime, harness, trafficRobots, activeIds, deltaMs, context);
  }
}

function refreshAvoidanceZones(context, robots, runtimes) {
  if (!context) return;
  if (!context.avoidanceZones) {
    context.avoidanceZones = new Map();
  }
  const zones = context.avoidanceZones;
  const activeOwners = new Set();
  const now = Date.now();
  runtimes.forEach((runtime, robotId) => {
    if (!runtime?.avoidance) return;
    const robot = robots.find((item) => item.id === robotId);
    if (!robot?.pos) return;
    activeOwners.add(robotId);
    let zone = zones.get(robotId);
    if (!zone) {
      zone = {
        ownerId: robotId,
        pos: { ...robot.pos },
        radius: AVOIDANCE_BLOCK_RADIUS,
        createdAt: now,
        updatedAt: now,
        allowed: new Set([robotId]),
        passCompleted: false
      };
      const inside = [];
      robots.forEach((other) => {
        if (!other?.pos || other.id === robotId) return;
        if (Math.hypot(other.pos.x - zone.pos.x, other.pos.y - zone.pos.y) <= zone.radius) {
          zone.allowed.add(other.id);
          inside.push(other.id);
        }
      });
      if (inside.length) {
        zone.passCompleted = true;
      }
    } else {
      zone.pos = { ...robot.pos };
      zone.updatedAt = now;
      zone.allowed.add(robotId);
    }

    let hasAllowedNonOwner = false;
    for (const allowedId of Array.from(zone.allowed)) {
      if (allowedId === robotId) continue;
      const other = robots.find((item) => item.id === allowedId);
      if (!other?.pos) {
        zone.allowed.delete(allowedId);
        continue;
      }
      const dist = Math.hypot(other.pos.x - zone.pos.x, other.pos.y - zone.pos.y);
      if (dist > zone.radius + AVOIDANCE_RELEASE_MARGIN) {
        zone.allowed.delete(allowedId);
        continue;
      }
      hasAllowedNonOwner = true;
    }

    if (!zone.passCompleted && !hasAllowedNonOwner) {
      const entering = [];
      robots.forEach((other) => {
        if (!other?.pos || other.id === robotId) return;
        if (Math.hypot(other.pos.x - zone.pos.x, other.pos.y - zone.pos.y) <= zone.radius) {
          entering.push(other.id);
        }
      });
      if (entering.length) {
        entering.forEach((id) => zone.allowed.add(id));
        zone.passCompleted = true;
      }
    }

    zones.set(robotId, zone);
  });

  for (const ownerId of Array.from(zones.keys())) {
    if (!activeOwners.has(ownerId)) {
      zones.delete(ownerId);
    }
  }
}

function shouldHoldAvoidance(robot, context, robots) {
  const zone = context?.avoidanceZones?.get(robot?.id);
  if (!zone) return false;
  for (const allowedId of zone.allowed) {
    if (allowedId === robot.id) continue;
    const other = robots.find((item) => item.id === allowedId);
    if (!other?.pos) continue;
    const dist = Math.hypot(other.pos.x - zone.pos.x, other.pos.y - zone.pos.y);
    if (dist <= zone.radius) {
      return true;
    }
  }
  return false;
}

function testHeadOnDeadlockResolves() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const startA = { x: 0, y: 0 };
    const startB = { x: 10, y: 0 };
    const endA = { x: 10, y: 0 };
    const endB = { x: 0, y: 0 };
    const robots = [
      { id: "RB-01", pos: { ...startA }, heading: 0, speed: 0 },
      { id: "RB-02", pos: { ...startB }, heading: Math.PI, speed: 0 }
    ];
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(startA, endA, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(startB, endB, "B", "A") });

    let steps = 0;
    const maxSteps = 800;
    let maxYielding = 0;
    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );
      robots.forEach((robot) => {
        const runtime = runtimes.get(robot.id);
        if (!runtime || runtime.phase === "done") return;
        stepRobot(robot, runtime, harness, robots, activeIds, 200);
      });
      const yieldingNow = Array.from(runtimes.values()).filter((runtime) => runtime.phase === "yield")
        .length;
      maxYielding = Math.max(maxYielding, yieldingNow);
      const done = robots.every((robot) => runtimes.get(robot.id)?.phase === "done");
      if (done) break;
    }

    robots.forEach((robot) => {
      const runtime = runtimes.get(robot.id);
      assert.equal(runtime.phase, "done", "Robot should finish route");
    });
    assert.ok(maxYielding <= 1, "At most one robot should yield at a time");
    console.log("E2E traffic: head-on deadlock resolved.");
  });
}

function testQueueStaleClears() {
  withFakeClock(() => {
    const harness = createHarness();
    const edgeKey = "A<->B";
    harness.edgeQueues.set(edgeKey, [
      { robotId: "RB-OLD", updatedAt: Date.now() - EDGE_QUEUE_TIMEOUT_MS - 100 },
      { robotId: "RB-NEW", updatedAt: Date.now() }
    ]);
    const activeIds = new Set(["RB-NEW"]);
    const queue = harness.pruneEdgeQueue(edgeKey, Date.now(), activeIds);
    assert.equal(queue.length, 1, "Stale queue entry should be removed");
    assert.equal(queue[0].robotId, "RB-NEW", "Active entry should remain");
    console.log("E2E traffic: queue pruning ok.");
  });
}

function testStaleQueueHeadWithoutLockClears() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const now = Date.now();
    const activeIds = new Set(["RB-01", "RB-02"]);
    harness.touchEdgeQueue("A<->B", "RB-01", "A->B", now - (EDGE_QUEUE_TIMEOUT_MS + 5));
    harness.touchEdgeQueue("A<->B", "RB-02", "A->B", now);
    activeIds.delete("RB-01");
    const queue = harness.pruneEdgeQueue("A<->B", Date.now(), activeIds);
    assert.equal(queue.length, 1, "Queue should drop stale head without lock");
    assert.equal(queue[0].robotId, "RB-02", "Second robot should become head");
    console.log("E2E traffic: stale queue head without lock clears.");
  });
}

function testNodeLockDuringAction() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const first = harness.reserveNodeLock("N1", "RB-01");
    assert.equal(first.ok, true, "First node lock should be acquired");
    const second = harness.reserveNodeLock("N1", "RB-02");
    assert.equal(second.ok, false, "Second node lock should be rejected");
    clock.advance(NODE_LOCK_TTL_MS + 10);
    harness.expireNodeLocks(Date.now());
    const third = harness.reserveNodeLock("N1", "RB-02");
    assert.equal(third.ok, true, "Node lock should expire and allow new holder");
    console.log("E2E traffic: node lock TTL ok.");
  });
}

function testNodeLockSerializesEntry() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const first = harness.reserveNodeLock("N2", "RB-01");
    assert.ok(first.ok, "First node lock should be acquired");
    const second = harness.reserveNodeLock("N2", "RB-02");
    assert.ok(!second.ok, "Second robot should be blocked by node lock");
    clock.advance(NODE_LOCK_TTL_MS + 10);
    harness.expireNodeLocks(Date.now());
    const third = harness.reserveNodeLock("N2", "RB-02");
    assert.ok(third.ok, "Second robot should acquire after lock expiry");
    console.log("E2E traffic: node lock serializes entry.");
  });
}

function testReplanReleasesEdgeLock() {
  withFakeClock(() => {
    const harness = createHarness();
    const robot = { id: "RB-01", pos: { x: 0, y: 0 } };
    const runtime = { route: createRoute({ x: 0, y: 0 }, { x: 5, y: 0 }, "A", "B") };
    const edgeKey = runtime.route.segments[0].edgeGroupKey;
    harness.reserveEdgeLock(edgeKey, robot.id, "A->B", 0, 10, EDGE_LOCK_FOLLOW_DISTANCE, new Set([robot.id]));
    assert.ok(harness.edgeLocks.get(edgeKey)?.has(robot.id), "Lock should exist before replan");

    const nextRoute = createRoute({ x: 5, y: 0 }, { x: 10, y: 0 }, "B", "C");
    const nextKey = nextRoute.segments[0].edgeGroupKey;
    if (edgeKey && edgeKey !== nextKey) {
      harness.releaseEdgeLock(edgeKey, robot.id);
      harness.releaseRobotEdgeQueues(robot.id);
    }
    runtime.route = nextRoute;

    assert.ok(!harness.edgeLocks.get(edgeKey), "Old lock should be released on replan");
    console.log("E2E traffic: replan releases old edge lock.");
  });
}

function testQueueNoStarvation() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const endPositions = [
      { x: 12, y: 0 },
      { x: 12, y: 2.8 },
      { x: 12, y: -2.8 }
    ];
    const robots = [
      { id: "RB-01", pos: { x: 0, y: 0 }, heading: 0, speed: 0 },
      { id: "RB-02", pos: { x: -2, y: 2.8 }, heading: 0, speed: 0 },
      { id: "RB-03", pos: { x: -4, y: -2.8 }, heading: 0, speed: 0 }
    ];
    const runtimes = new Map();
    robots.forEach((robot, index) => {
      runtimes.set(robot.id, {
        phase: "moving",
        route: createRoute(robot.pos, endPositions[index], "A", "B"),
        startIndex: index
      });
    });

    let steps = 0;
    const maxSteps = 1200;
    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );
      robots.forEach((robot) => {
        const runtime = runtimes.get(robot.id);
        if (!runtime || runtime.phase === "done") return;
        stepRobot(robot, runtime, harness, robots, activeIds, 200);
      });
      const done = robots.every((robot) => runtimes.get(robot.id)?.phase === "done");
      if (done) break;
    }

    robots.forEach((robot) => {
      const runtime = runtimes.get(robot.id);
      if (runtime.phase !== "done") {
        console.log("Queue no-starvation debug", {
          robot: robot.id,
          phase: runtime.phase,
          stallReason: runtime.stallReason,
          stallOpponentId: runtime.stallOpponentId,
          stuckReason: runtime.stuckReason,
          stuckCount: runtime.stuckCount,
          segmentProgress: runtime.route?.segmentProgress,
          totalLength: runtime.route?.segments?.[0]?.totalLength
        });
      }
      assert.equal(runtime.phase, "done", "Robot should finish route");
    });
    console.log("E2E traffic: queue no-starvation ok.");
  });
}

function testAvoidanceZonePassesInsideRobot() {
  withFakeClock((clock) => {
    const context = { avoidanceZones: new Map() };
    const owner = { id: "RB-01", pos: { x: 0, y: 2.8 }, heading: 0, speed: 0 };
    const passer = { id: "RB-02", pos: { x: -0.5, y: 5.5 }, heading: 0, speed: 0 };
    const waiter = { id: "RB-03", pos: { x: 6, y: 0 }, heading: Math.PI, speed: 0 };
    const robots = [owner, passer, waiter];
    const runtimes = new Map();
    runtimes.set("RB-01", { avoidance: { obstacleId: "obs-1" } });

    const targetPasser = { x: 6, y: 5.5 };
    const targetWaiter = { x: -6, y: 0 };
    let lastPasserX = passer.pos.x;
    let lastWaiterX = waiter.pos.x;
    let ownerHeld = false;
    let ownerReleased = false;
    let waiterEnteredZone = false;

    let steps = 0;
    const maxSteps = 600;
    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      refreshAvoidanceZones(context, robots, runtimes);
      const ownerHold = shouldHoldAvoidance(owner, context, robots);
      if (ownerHold) {
        ownerHeld = true;
      } else if (ownerHeld) {
        ownerReleased = true;
      }

      if (ownerHold) {
        owner.speed = 0;
      }

      moveRobotToward(passer, targetPasser, robots, 200, context);
      moveRobotToward(waiter, targetWaiter, robots, 200, context);

      if (passer.pos.x < lastPasserX - 1e-6) {
        assert.fail("Passer should not reverse direction");
      }
      if (waiter.pos.x > lastWaiterX + 1e-6) {
        assert.fail("Waiter should not reverse direction");
      }
      lastPasserX = passer.pos.x;
      lastWaiterX = waiter.pos.x;

      const zone = context.avoidanceZones.get(owner.id);
      const ownerRuntime = runtimes.get(owner.id);
      if (ownerRuntime?.avoidance && zone && !zone.allowed.has(waiter.id)) {
        const dist = Math.hypot(waiter.pos.x - zone.pos.x, waiter.pos.y - zone.pos.y);
        if (dist <= zone.radius - 0.4) {
          waiterEnteredZone = true;
        }
      }

      const passerDist = Math.hypot(passer.pos.x - owner.pos.x, passer.pos.y - owner.pos.y);
      if (ownerRuntime?.avoidance && passerDist > AVOIDANCE_BLOCK_RADIUS + AVOIDANCE_RELEASE_MARGIN + 0.1) {
        ownerRuntime.avoidance = null;
      }

      const passerDone = Math.hypot(passer.pos.x - targetPasser.x, passer.pos.y - targetPasser.y) <= ROBOT_ARRIVAL_DISTANCE;
      const waiterDone = Math.hypot(waiter.pos.x - targetWaiter.x, waiter.pos.y - targetWaiter.y) <= ROBOT_ARRIVAL_DISTANCE;
      if (passerDone && waiterDone) {
        break;
      }
    }

    const passerDone = Math.hypot(passer.pos.x - targetPasser.x, passer.pos.y - targetPasser.y) <= ROBOT_ARRIVAL_DISTANCE;
    const waiterDone = Math.hypot(waiter.pos.x - targetWaiter.x, waiter.pos.y - targetWaiter.y) <= ROBOT_ARRIVAL_DISTANCE;
    assert.ok(ownerHeld, "Owner should hold while inside robot passes");
    assert.ok(ownerReleased, "Owner should release hold after robot passes");
    assert.ok(!waiterEnteredZone, "New entrant should be blocked during avoidance");
    assert.ok(passerDone && waiterDone, "Avoidance should not deadlock traffic");
    console.log("E2E traffic: avoidance zone allows inside robot, blocks new entry.");
  });
}

function testAvoidanceZoneAllowsFirstEntrant() {
  withFakeClock((clock) => {
    const context = { avoidanceZones: new Map() };
    const owner = { id: "RB-01", pos: { x: 0, y: 2.8 }, heading: 0, speed: 0 };
    const first = { id: "RB-02", pos: { x: 2.4, y: 5.5 }, heading: Math.PI, speed: 0 };
    const second = { id: "RB-03", pos: { x: 6, y: 0 }, heading: Math.PI, speed: 0 };
    const robots = [owner, first, second];
    const runtimes = new Map();
    runtimes.set("RB-01", { avoidance: { obstacleId: "obs-2" } });

    const targetFirst = { x: -6, y: 5.5 };
    const targetSecond = { x: -6, y: 0 };
    let lastFirstX = first.pos.x;
    let lastSecondX = second.pos.x;
    let secondEnteredZone = false;
    let steps = 0;
    const maxSteps = 700;

    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      refreshAvoidanceZones(context, robots, runtimes);
      const ownerHold = shouldHoldAvoidance(owner, context, robots);
      if (ownerHold) {
        owner.speed = 0;
      }

      moveRobotToward(first, targetFirst, robots, 200, context);
      moveRobotToward(second, targetSecond, robots, 200, context);

      if (first.pos.x > lastFirstX + 1e-6) {
        assert.fail("First entrant should not reverse direction");
      }
      if (second.pos.x > lastSecondX + 1e-6) {
        assert.fail("Second entrant should not reverse direction");
      }
      lastFirstX = first.pos.x;
      lastSecondX = second.pos.x;

      const zone = context.avoidanceZones.get(owner.id);
      const ownerRuntime = runtimes.get(owner.id);
      if (ownerRuntime?.avoidance && zone && !zone.allowed.has(second.id)) {
        const dist = Math.hypot(second.pos.x - zone.pos.x, second.pos.y - zone.pos.y);
        if (dist <= zone.radius - 0.4) {
          secondEnteredZone = true;
        }
      }

      const firstDist = Math.hypot(first.pos.x - owner.pos.x, first.pos.y - owner.pos.y);
      if (ownerRuntime?.avoidance && firstDist > AVOIDANCE_BLOCK_RADIUS + AVOIDANCE_RELEASE_MARGIN + 0.1) {
        ownerRuntime.avoidance = null;
      }

      const firstDone = Math.hypot(first.pos.x - targetFirst.x, first.pos.y - targetFirst.y) <= ROBOT_ARRIVAL_DISTANCE;
      const secondDone = Math.hypot(second.pos.x - targetSecond.x, second.pos.y - targetSecond.y) <= ROBOT_ARRIVAL_DISTANCE;
      if (firstDone && secondDone) {
        break;
      }
    }

    const firstDone = Math.hypot(first.pos.x - targetFirst.x, first.pos.y - targetFirst.y) <= ROBOT_ARRIVAL_DISTANCE;
    const secondDone = Math.hypot(second.pos.x - targetSecond.x, second.pos.y - targetSecond.y) <= ROBOT_ARRIVAL_DISTANCE;
    assert.ok(!secondEnteredZone, "Second entrant should stay out until avoidance clears");
    assert.ok(firstDone && secondDone, "Avoidance should not deadlock queued entrants");
    console.log("E2E traffic: avoidance zone allows first entrant, blocks others.");
  });
}

function testEdgeConflictBlocksSecond() {
  withFakeClock((clock) => {
    const harness = createHarness();
    harness.conflictGroups.set("A<->B", new Set(["C<->D"]));
    harness.conflictGroups.set("C<->D", new Set(["A<->B"]));

    const r1 = { id: "RB-01", pos: { x: 0, y: 0 }, heading: 0, speed: 0 };
    const r2 = { id: "RB-02", pos: { x: 0, y: 2 }, heading: 0, speed: 0 };
    const robots = [r1, r2];
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute({ x: 0, y: 0 }, { x: 2, y: 0 }, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute({ x: 0, y: 2 }, { x: 2, y: 2 }, "C", "D") });

    let lastX1 = r1.pos.x;
    let lastX2 = r2.pos.x;
    let blockedCount = 0;
    let steps = 0;
    const maxSteps = 400;

    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );
      robots.forEach((robot) => {
        const runtime = runtimes.get(robot.id);
        if (!runtime || runtime.phase === "done") return;
        stepRobot(robot, runtime, harness, robots, activeIds, 200);
      });

      const r2Runtime = runtimes.get("RB-02");
      if (r2Runtime?.stallReason === "edge_lock") {
        blockedCount += 1;
      }

      if (r1.pos.x < lastX1 - 0.5) {
        assert.fail("Robot 1 should not reverse while holding conflict lock");
      }
      if (r2.pos.x < lastX2 - 0.5) {
        assert.fail("Robot 2 should not reverse while waiting on conflict lock");
      }
      lastX1 = r1.pos.x;
      lastX2 = r2.pos.x;

      const done = robots.every((robot) => runtimes.get(robot.id)?.phase === "done");
      if (done) break;
    }

    robots.forEach((robot) => {
      const runtime = runtimes.get(robot.id);
      assert.equal(runtime.phase, "done", "Robots should finish routes after conflict clears");
    });
    assert.ok(blockedCount > 0, "Second robot should wait on conflicting edge lock");
    console.log("E2E traffic: edge conflict blocks and releases correctly.");
  });
}

function testAvoidanceZonesIndependent() {
  withFakeClock((clock) => {
    const context = { avoidanceZones: new Map() };
    const owner1 = { id: "RB-01", pos: { x: 0, y: 2.8 }, heading: 0, speed: 0 };
    const owner2 = { id: "RB-02", pos: { x: 20, y: 2.8 }, heading: 0, speed: 0 };
    const passer1 = { id: "RB-03", pos: { x: -0.5, y: 5.5 }, heading: 0, speed: 0 };
    const passer2 = { id: "RB-04", pos: { x: 19.5, y: 5.5 }, heading: 0, speed: 0 };
    const robots = [owner1, owner2, passer1, passer2];
    const runtimes = new Map();
    runtimes.set("RB-01", { avoidance: { obstacleId: "obs-1" } });
    runtimes.set("RB-02", { avoidance: { obstacleId: "obs-2" } });

    const target1 = { x: 6, y: 5.5 };
    const target2 = { x: 26, y: 5.5 };
    let lastX1 = passer1.pos.x;
    let lastX2 = passer2.pos.x;
    let steps = 0;
    const maxSteps = 700;

    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      refreshAvoidanceZones(context, robots, runtimes);

      moveRobotToward(passer1, target1, robots, 200, context);
      moveRobotToward(passer2, target2, robots, 200, context);

      if (passer1.pos.x < lastX1 - 1e-6) {
        assert.fail("Passer 1 should not reverse in independent zones");
      }
      if (passer2.pos.x < lastX2 - 1e-6) {
        assert.fail("Passer 2 should not reverse in independent zones");
      }
      lastX1 = passer1.pos.x;
      lastX2 = passer2.pos.x;

      const dist1 = Math.hypot(passer1.pos.x - owner1.pos.x, passer1.pos.y - owner1.pos.y);
      const dist2 = Math.hypot(passer2.pos.x - owner2.pos.x, passer2.pos.y - owner2.pos.y);
      if (runtimes.get("RB-01")?.avoidance && dist1 > AVOIDANCE_BLOCK_RADIUS + AVOIDANCE_RELEASE_MARGIN + 0.1) {
        runtimes.get("RB-01").avoidance = null;
      }
      if (runtimes.get("RB-02")?.avoidance && dist2 > AVOIDANCE_BLOCK_RADIUS + AVOIDANCE_RELEASE_MARGIN + 0.1) {
        runtimes.get("RB-02").avoidance = null;
      }

      const done1 = Math.hypot(passer1.pos.x - target1.x, passer1.pos.y - target1.y) <= ROBOT_ARRIVAL_DISTANCE;
      const done2 = Math.hypot(passer2.pos.x - target2.x, passer2.pos.y - target2.y) <= ROBOT_ARRIVAL_DISTANCE;
      if (done1 && done2) break;
    }

    const done1 = Math.hypot(passer1.pos.x - target1.x, passer1.pos.y - target1.y) <= ROBOT_ARRIVAL_DISTANCE;
    const done2 = Math.hypot(passer2.pos.x - target2.x, passer2.pos.y - target2.y) <= ROBOT_ARRIVAL_DISTANCE;
    assert.ok(done1 && done2, "Independent avoidance zones should not deadlock each other");
    console.log("E2E traffic: avoidance zones operate independently.");
  });
}

function testYieldCooldownRespected() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const robot = { id: "RB-01", pos: { x: 0, y: 0 }, heading: 0, speed: 0 };
    const runtime = {
      phase: "moving",
      route: createRoute({ x: 0, y: 0 }, { x: 4, y: 0 }, "A", "B")
    };
    clock.advance(1000);
    runtime.stallSince = Date.now() - DEADLOCK_TIMEOUT_MS - 20;
    runtime.stallReason = "traffic";

    assert.ok(shouldTriggerYield(robot, runtime), "Yield should trigger after deadlock timeout");
    const triggered = triggerYield(robot, runtime, harness);
    assert.ok(triggered, "Yield should be applied");

    runtime.phase = "moving";
    runtime.stallSince = Date.now() - DEADLOCK_TIMEOUT_MS - 20;
    runtime.stallReason = "traffic";
    assert.ok(!shouldTriggerYield(robot, runtime), "Yield cooldown should prevent immediate retrigger");

    clock.advance(2500);
    runtime.stallSince = Date.now() - DEADLOCK_TIMEOUT_MS - 20;
    assert.ok(shouldTriggerYield(robot, runtime), "Yield should trigger after cooldown expires");
    console.log("E2E traffic: yield cooldown respected.");
  });
}

function testManualRespectsAvoidanceZone() {
  withFakeClock((clock) => {
    const context = { avoidanceZones: new Map() };
    const owner = { id: "RB-01", pos: { x: 0, y: 2.8 }, heading: 0, speed: 0 };
    const manual = { id: "RB-02", pos: { x: -1, y: 2.4 }, heading: 0, speed: 0 };
    const robots = [owner, manual];
    const runtimes = new Map();
    runtimes.set("RB-01", { avoidance: { obstacleId: "obs-3" } });

    const target = { x: 6, y: 2.4 };
    let lastX = manual.pos.x;
    let enteredZone = false;
    let steps = 0;
    const maxSteps = 500;

    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      refreshAvoidanceZones(context, robots, runtimes);
      moveRobotToward(manual, target, robots, 200, context);

      if (manual.pos.x < lastX - 1e-6) {
        assert.fail("Manual robot should not reverse when blocked by avoidance zone");
      }
      lastX = manual.pos.x;

      const zone = context.avoidanceZones.get(owner.id);
      if (zone && !zone.allowed.has(manual.id)) {
        const dist = Math.hypot(manual.pos.x - zone.pos.x, manual.pos.y - zone.pos.y);
        if (dist <= zone.radius - 0.05) {
          enteredZone = true;
        }
      }

      if (steps === 20 && runtimes.get("RB-01")?.avoidance) {
        runtimes.get("RB-01").avoidance = null;
      }

      const done = Math.hypot(manual.pos.x - target.x, manual.pos.y - target.y) <= ROBOT_ARRIVAL_DISTANCE;
      if (done) break;
    }

    const done = Math.hypot(manual.pos.x - target.x, manual.pos.y - target.y) <= ROBOT_ARRIVAL_DISTANCE;
    assert.ok(!enteredZone, "Manual robot should not enter avoidance zone while blocked");
    assert.ok(done, "Manual robot should finish after avoidance clears");
    console.log("E2E traffic: manual respects avoidance zones.");
  });
}

function testReplanReleasesConflictLock() {
  withFakeClock(() => {
    const harness = createHarness();
    harness.conflictGroups.set("A<->B", new Set(["C<->D"]));
    harness.conflictGroups.set("C<->D", new Set(["A<->B"]));
    const activeIds = new Set(["RB-01", "RB-02"]);

    const lockA = harness.reserveEdgeLock("A<->B", "RB-01", "A->B", 0, 5, EDGE_LOCK_FOLLOW_DISTANCE, activeIds);
    assert.ok(lockA.ok, "Primary robot should acquire edge lock");
    const lockC = harness.reserveEdgeLock("C<->D", "RB-02", "C->D", 0, 5, EDGE_LOCK_FOLLOW_DISTANCE, activeIds);
    assert.ok(!lockC.ok, "Conflicting edge should be blocked while primary lock held");

    harness.releaseEdgeLock("A<->B", "RB-01");
    const retry = harness.reserveEdgeLock("C<->D", "RB-02", "C->D", 0, 5, EDGE_LOCK_FOLLOW_DISTANCE, activeIds);
    assert.ok(retry.ok, "Conflict should clear after replan releases lock");
    console.log("E2E traffic: replan releases conflict lock.");
  });
}

function testReplanReleasesQueueEntry() {
  withFakeClock(() => {
    const harness = createHarness();
    const activeIds = new Set(["RB-01", "RB-02"]);
    const lock = harness.reserveEdgeLock("A<->B", "RB-01", "A->B", 0, 10, EDGE_LOCK_FOLLOW_DISTANCE, activeIds);
    assert.ok(lock.ok, "Lead robot should acquire edge lock");
    const queued = harness.reserveEdgeLock("A<->B", "RB-02", "A->B", 0, 10, EDGE_LOCK_FOLLOW_DISTANCE, activeIds);
    assert.ok(!queued.ok, "Second robot should queue behind leader");

    harness.releaseEdgeLock("A<->B", "RB-01");
    const retry = harness.reserveEdgeLock("A<->B", "RB-02", "A->B", 0, 10, EDGE_LOCK_FOLLOW_DISTANCE, activeIds);
    assert.ok(retry.ok, "Queued robot should acquire after replan release");
    console.log("E2E traffic: replan releases queue entry.");
  });
}

function testReplanDropsQueuedRobot() {
  withFakeClock(() => {
    const harness = createHarness();
    const activeIds = new Set(["RB-01", "RB-02"]);
    harness.reserveEdgeLock("A<->B", "RB-01", "A->B", 0, 10, EDGE_LOCK_FOLLOW_DISTANCE, activeIds);
    const queued = harness.reserveEdgeLock("A<->B", "RB-02", "A->B", 0, 10, EDGE_LOCK_FOLLOW_DISTANCE, activeIds);
    assert.ok(!queued.ok, "Second robot should queue before replan");

    harness.releaseRobotEdgeQueues("RB-02");
    const queue = harness.pruneEdgeQueue("A<->B", Date.now(), activeIds);
    assert.equal(queue.length, 1, "Queue should only contain leader after replan");
    assert.equal(queue[0].robotId, "RB-01", "Leader should stay at queue head");
    console.log("E2E traffic: replan drops queued robot.");
  });
}

function testEdgeHoldAndWaitBreaks() {
  withFakeClock(() => {
    const harness = createHarness();
    const activeIds = new Set(["RB-01", "RB-02"]);

    const lockA = harness.reserveEdgeLock("A<->B", "RB-01", "A->B", 0, 8, EDGE_LOCK_FOLLOW_DISTANCE, activeIds);
    const lockC = harness.reserveEdgeLock("C<->D", "RB-02", "C->D", 0, 8, EDGE_LOCK_FOLLOW_DISTANCE, activeIds);
    assert.ok(lockA.ok && lockC.ok, "Both robots should acquire initial locks");

    harness.conflictGroups.set("A<->B", new Set(["C<->D"]));
    harness.conflictGroups.set("C<->D", new Set(["A<->B"]));

    const wantC = harness.reserveEdgeLock("C<->D", "RB-01", "C->D", 0, 8, EDGE_LOCK_FOLLOW_DISTANCE, activeIds);
    const wantA = harness.reserveEdgeLock("A<->B", "RB-02", "A->B", 0, 8, EDGE_LOCK_FOLLOW_DISTANCE, activeIds);
    assert.ok(!wantC.ok, "Robot 1 should be blocked on second resource");
    assert.ok(!wantA.ok, "Robot 2 should be blocked on second resource");

    harness.releaseEdgeLock("A<->B", "RB-01");
    const retry = harness.reserveEdgeLock("A<->B", "RB-02", "A->B", 0, 8, EDGE_LOCK_FOLLOW_DISTANCE, activeIds);
    assert.ok(retry.ok, "Releasing one lock should unblock the other robot");
    console.log("E2E traffic: hold-and-wait clears after release.");
  });
}

function testEdgeLockTimeoutBreaksHoldAndWait() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const activeIds = new Set(["RB-01", "RB-02"]);

    harness.reserveEdgeLock("A<->B", "RB-01", "A->B", 0, 8, EDGE_LOCK_FOLLOW_DISTANCE, activeIds);
    harness.reserveEdgeLock("C<->D", "RB-02", "C->D", 0, 8, EDGE_LOCK_FOLLOW_DISTANCE, activeIds);

    harness.conflictGroups.set("A<->B", new Set(["C<->D"]));
    harness.conflictGroups.set("C<->D", new Set(["A<->B"]));

    clock.advance(EDGE_LOCK_TIMEOUT_MS + 20);
    harness.expireEdgeLocks(Date.now());
    assert.ok(!harness.edgeLocks.get("A<->B"), "Edge lock A<->B should expire");
    assert.ok(!harness.edgeLocks.get("C<->D"), "Edge lock C<->D should expire");

    const retryA = harness.reserveEdgeLock("A<->B", "RB-01", "A->B", 0, 8, EDGE_LOCK_FOLLOW_DISTANCE, activeIds);
    assert.ok(retryA.ok, "Lock A should be reacquired after timeout");
    const retryC = harness.reserveEdgeLock("C<->D", "RB-02", "C->D", 0, 8, EDGE_LOCK_FOLLOW_DISTANCE, activeIds);
    assert.ok(!retryC.ok, "Conflict should still block second lock");
    harness.releaseEdgeLock("A<->B", "RB-01");
    const retryAfter = harness.reserveEdgeLock("C<->D", "RB-02", "C->D", 0, 8, EDGE_LOCK_FOLLOW_DISTANCE, activeIds);
    assert.ok(retryAfter.ok, "Second lock should acquire after conflict clears");
    console.log("E2E traffic: edge lock timeout breaks hold-and-wait.");
  });
}

function testPriorityHeadOnResolvesDeterministically() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const left = { id: "RB-01", pos: { x: 0, y: 0 }, heading: 0, speed: 0 };
    const right = { id: "RB-02", pos: { x: 8, y: 0 }, heading: Math.PI, speed: 0 };
    const robots = [left, right];
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(left.pos, { x: 8, y: 0 }, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(right.pos, { x: 0, y: 0 }, "B", "A") });

    let leftYielded = false;
    let rightYielded = false;
    let steps = 0;
    const maxSteps = 900;
    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );
      robots.forEach((robot) => {
        const runtime = runtimes.get(robot.id);
        if (!runtime || runtime.phase === "done") return;
        stepRobot(robot, runtime, harness, robots, activeIds, 200);
        if (runtime.phase === "yield") {
          if (robot.id === "RB-01") leftYielded = true;
          if (robot.id === "RB-02") rightYielded = true;
        }
      });
      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    assert.equal(leftYielded, false, "Lower-id robot should not yield in head-on");
    assert.equal(rightYielded, true, "Higher-id robot should yield in head-on");
    console.log("E2E traffic: head-on priority deterministic.");
  });
}

function testReplanMidEdgeReleasesLock() {
  withFakeClock(() => {
    const harness = createHarness();
    const activeIds = new Set(["RB-01"]);
    const robot = { id: "RB-01", pos: { x: 0, y: 0 }, heading: 0, speed: 0 };
    const runtime = {
      phase: "moving",
      route: createRoute({ x: 0, y: 0 }, { x: 10, y: 0 }, "A", "B")
    };
    runtime.route.segmentProgress = 4;
    const lock = harness.reserveEdgeLock("A<->B", robot.id, "A->B", 4, 10, EDGE_LOCK_FOLLOW_DISTANCE, activeIds);
    assert.ok(lock.ok, "Edge lock should be held before replan");
    harness.releaseEdgeLock("A<->B", robot.id);

    runtime.route = createRoute({ x: 4, y: 0 }, { x: 4, y: 6 }, "B", "C");
    const newLock = harness.reserveEdgeLock("B<->C", robot.id, "B->C", 0, 6, EDGE_LOCK_FOLLOW_DISTANCE, activeIds);
    assert.ok(newLock.ok, "New edge lock should be acquired after replan");
    assert.ok(!harness.edgeLocks.get("A<->B"), "Old edge lock should be released after replan");
    console.log("E2E traffic: replan mid-edge releases lock.");
  });
}

function testOvertakeDoesNotHappen() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const leader = { id: "RB-01", pos: { x: 0, y: 0 }, heading: 0, speed: 0 };
    const follower = { id: "RB-02", pos: { x: -3.5, y: 2.8 }, heading: 0, speed: 0 };
    const robots = [leader, follower];
    const leaderTarget = { x: 14, y: 0 };
    const followerTarget = { x: 14, y: 2.8 };
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(leader.pos, leaderTarget, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(follower.pos, followerTarget, "A", "B") });

    let steps = 0;
    const maxSteps = 900;
    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );
      robots.forEach((robot) => {
        const runtime = runtimes.get(robot.id);
        if (!runtime || runtime.phase === "done") return;
        stepRobot(robot, runtime, harness, robots, activeIds, 200);
      });
      const ahead = follower.pos.x > leader.pos.x + 0.2;
      if (ahead) {
        assert.fail("Follower should not overtake leader");
      }
      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    console.log("E2E traffic: overtake does not happen.");
  });
}

function testManualReleaseUnblocksFollower() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const leader = { id: "RB-01", pos: { x: 0, y: 0 }, heading: 0, speed: 0 };
    const follower = { id: "RB-02", pos: { x: -3, y: 2.8 }, heading: 0, speed: 0 };
    const robots = [leader, follower];
    const leaderTarget = { x: 6, y: 0 };
    const followerTarget = { x: 6, y: 2.8 };
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(leader.pos, leaderTarget, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(follower.pos, followerTarget, "A", "B") });

    clock.advance(200);
    const activeIds = new Set(["RB-01", "RB-02"]);
    stepRobot(leader, runtimes.get("RB-01"), harness, robots, activeIds, 200);
    stepRobot(follower, runtimes.get("RB-02"), harness, robots, activeIds, 200);
    const before = runtimes.get("RB-02").route.segmentProgress;
    assert.equal(runtimes.get("RB-02").stallReason, "edge_lock", "Follower should wait on leader");

    harness.releaseEdgeLock("A<->B", "RB-01");
    clock.advance(200);
    stepRobot(follower, runtimes.get("RB-02"), harness, robots, activeIds, 200);
    const after = runtimes.get("RB-02").route.segmentProgress;
    assert.ok(after > before, "Follower should move after manual release");
    console.log("E2E traffic: manual release unblocks follower.");
  });
}

function testObstacleRemovalResumesMotion() {
  withFakeClock((clock) => {
    const context = { avoidanceZones: new Map() };
    const owner = { id: "RB-01", pos: { x: 0, y: 2.8 }, heading: 0, speed: 0 };
    const passer = { id: "RB-02", pos: { x: -0.5, y: 5.5 }, heading: 0, speed: 0 };
    const robots = [owner, passer];
    const runtimes = new Map();
    runtimes.set("RB-01", { avoidance: { obstacleId: "obs-4" } });

    const ownerTarget = { x: 6, y: 2.8 };
    const passerTarget = { x: 6, y: 5.5 };
    let ownerMovedAfterClear = false;
    let lastOwnerX = owner.pos.x;
    let steps = 0;
    const maxSteps = 600;

    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      refreshAvoidanceZones(context, robots, runtimes);
      const hold = shouldHoldAvoidance(owner, context, robots);
      if (!hold) {
        moveRobotToward(owner, ownerTarget, robots, 200, context);
      }
      if (!runtimes.get("RB-01")?.avoidance) {
        moveRobotToward(passer, passerTarget, robots, 200, context);
      }

      if (!runtimes.get("RB-01")?.avoidance && owner.pos.x > lastOwnerX + 1e-4) {
        ownerMovedAfterClear = true;
      }
      if (owner.pos.x < lastOwnerX - 1e-6) {
        assert.fail("Owner should not reverse while resuming after obstacle removal");
      }
      lastOwnerX = owner.pos.x;

      if (steps === 20 && runtimes.get("RB-01")?.avoidance) {
        runtimes.get("RB-01").avoidance = null;
      }

      const done = Math.hypot(owner.pos.x - ownerTarget.x, owner.pos.y - ownerTarget.y) <= ROBOT_ARRIVAL_DISTANCE;
      if (done) break;
    }

    assert.ok(ownerMovedAfterClear, "Owner should resume after obstacle removal");
    console.log("E2E traffic: obstacle removal resumes motion.");
  });
}

function testFlappingObstacleNoReverse() {
  withFakeClock((clock) => {
    const context = { avoidanceZones: new Map() };
    const owner = { id: "RB-01", pos: { x: 0, y: 2.8 }, heading: 0, speed: 0 };
    const mover = { id: "RB-02", pos: { x: -6, y: 0 }, heading: 0, speed: 0 };
    const robots = [owner, mover];
    const runtimes = new Map();
    runtimes.set("RB-01", { avoidance: { obstacleId: "obs-flap" } });

    const target = { x: 6, y: 0 };
    let lastX = mover.pos.x;
    let steps = 0;
    const maxSteps = 600;

    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      if (steps <= 40) {
        runtimes.get("RB-01").avoidance = steps % 10 < 5 ? { obstacleId: "obs-flap" } : null;
      } else {
        runtimes.get("RB-01").avoidance = null;
      }
      refreshAvoidanceZones(context, robots, runtimes);
      moveRobotToward(mover, target, robots, 200, context);
      if (mover.pos.x < lastX - 1e-6) {
        assert.fail("Mover should not reverse during obstacle flapping");
      }
      lastX = mover.pos.x;
      if (Math.hypot(mover.pos.x - target.x, mover.pos.y - target.y) <= ROBOT_ARRIVAL_DISTANCE) {
        break;
      }
    }

    const arrived = Math.hypot(mover.pos.x - target.x, mover.pos.y - target.y) <= ROBOT_ARRIVAL_DISTANCE;
    assert.ok(arrived, "Mover should reach target after flapping obstacle clears");
    console.log("E2E traffic: flapping obstacle does not cause reverse.");
  });
}

function testLeaderReverseTriggersYield() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const leader = { id: "RB-01", pos: { x: 3, y: 0 }, heading: Math.PI, speed: 0 };
    const follower = { id: "RB-02", pos: { x: 0, y: 0 }, heading: 0, speed: 0 };
    const robots = [leader, follower];
    const leaderTarget = { x: -3, y: 0 };
    const followerTarget = { x: 6, y: 0 };
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(leader.pos, leaderTarget, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(follower.pos, followerTarget, "B", "A") });

    let yieldSeen = false;
    let leaderCleared = false;
    let steps = 0;
    const maxSteps = 900;
    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );
      if (steps > 15) {
        const leaderRuntime = runtimes.get("RB-01");
        if (leaderRuntime?.phase !== "done") {
          stepRobot(leader, leaderRuntime, harness, robots, activeIds, 200);
        }
      }
      const followerRuntime = runtimes.get("RB-02");
      if (followerRuntime?.phase !== "done") {
        stepRobot(follower, followerRuntime, harness, robots, activeIds, 200);
        if (followerRuntime.phase === "yield") {
          yieldSeen = true;
        }
      }
      if (yieldSeen && !leaderCleared) {
        const leaderRuntime = runtimes.get("RB-01");
        if (leaderRuntime?.route?.segments?.length) {
          const edgeKey = leaderRuntime.route.segments[0].edgeGroupKey;
          harness.releaseEdgeLock(edgeKey, "RB-01");
        }
        leader.pos = { x: -10, y: 0 };
        if (leaderRuntime) {
          leaderRuntime.phase = "done";
        }
        leaderCleared = true;
      }
      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    assert.ok(yieldSeen, "Follower should yield when leader is reversed");
    assert.equal(runtimes.get("RB-02")?.phase, "done", "Follower should finish after reversal clears");
    console.log("E2E traffic: leader reverse triggers yield.");
  });
}

function testFollowDistanceMaintained() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const leader = { id: "RB-01", pos: { x: 0, y: 0 }, heading: 0, speed: 0 };
    const follower = { id: "RB-02", pos: { x: -3.5, y: 2.8 }, heading: 0, speed: 0 };
    const robots = [leader, follower];
    const leaderTarget = { x: 12, y: 0 };
    const followerTarget = { x: 12, y: 2.8 };
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(leader.pos, leaderTarget, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(follower.pos, followerTarget, "A", "B") });

    let minDist = Number.POSITIVE_INFINITY;
    let steps = 0;
    const maxSteps = 1000;
    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );
      robots.forEach((robot) => {
        const runtime = runtimes.get(robot.id);
        if (!runtime || runtime.phase === "done") return;
        stepRobot(robot, runtime, harness, robots, activeIds, 200);
      });
      const dist = Math.hypot(leader.pos.x - follower.pos.x, leader.pos.y - follower.pos.y);
      minDist = Math.min(minDist, dist);
      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    const minThreshold = ROBOT_STOP_DISTANCE - 0.05;
    assert.ok(minDist >= minThreshold, "Robots should keep follow distance");
    assert.equal(runtimes.get("RB-01")?.phase, "done", "Leader should finish");
    assert.equal(runtimes.get("RB-02")?.phase, "done", "Follower should finish");
    console.log("E2E traffic: follow distance maintained.");
  });
}

function testBlockedLeaderNoYield() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const leader = { id: "RB-01", pos: { x: 0, y: 0 }, heading: 0, speed: 0 };
    const follower = { id: "RB-02", pos: { x: -6, y: 2.8 }, heading: 0, speed: 0 };
    const robots = [leader, follower];
    const leaderTarget = { x: 8, y: 0 };
    const followerTarget = { x: 8, y: 2.8 };
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(leader.pos, leaderTarget, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(follower.pos, followerTarget, "A", "B") });

    let followerYielded = false;
    let followerReversed = false;
    let lastFollowerX = follower.pos.x;
    let steps = 0;
    const maxSteps = 1600;
    const pauseSteps = 8;

    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );

      const leaderRuntime = runtimes.get("RB-01");
      if (leaderRuntime?.phase !== "done") {
        if (steps === 1 || steps > pauseSteps) {
          stepRobot(leader, leaderRuntime, harness, robots, activeIds, 200);
        }
      }

      const followerRuntime = runtimes.get("RB-02");
      if (followerRuntime?.phase !== "done") {
        stepRobot(follower, followerRuntime, harness, robots, activeIds, 200);
        if (followerRuntime.phase === "yield") {
          followerYielded = true;
        }
      }

      if (follower.pos.x < lastFollowerX - 1e-6) {
        followerReversed = true;
      }
      lastFollowerX = follower.pos.x;

      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    assert.equal(followerYielded, false, "Follower should not yield behind blocked leader");
    assert.equal(followerReversed, false, "Follower should not reverse behind blocked leader");
    assert.equal(runtimes.get("RB-01")?.phase, "done", "Leader should finish after obstacle clears");
    assert.equal(runtimes.get("RB-02")?.phase, "done", "Follower should finish after obstacle clears");
    console.log("E2E traffic: blocked leader does not cause yield.");
  });
}

function testAvoidanceZoneReleaseUnblocksWaiter() {
  withFakeClock((clock) => {
    const context = { avoidanceZones: new Map() };
    const owner = { id: "RB-01", pos: { x: 0, y: 2.8 }, heading: 0, speed: 0 };
    const passer = { id: "RB-02", pos: { x: -0.5, y: 5.5 }, heading: 0, speed: 0 };
    const waiter = { id: "RB-03", pos: { x: 6, y: 0 }, heading: Math.PI, speed: 0 };
    const robots = [owner, passer, waiter];
    const runtimes = new Map();
    runtimes.set("RB-01", { avoidance: { obstacleId: "obs-5" } });

    const ownerTarget = { x: 8, y: 2.8 };
    const passerTarget = { x: 8, y: 5.5 };
    const waiterTarget = { x: -6, y: 0 };

    let waiterEnteredEarly = false;
    let waiterArrived = false;
    let steps = 0;
    const maxSteps = 700;

    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      refreshAvoidanceZones(context, robots, runtimes);
      const zone = context.avoidanceZones.get("RB-01");

      moveRobotToward(owner, ownerTarget, robots, 200, context);
      moveRobotToward(passer, passerTarget, robots, 200, context);

      const moved = moveRobotToward(waiter, waiterTarget, robots, 200, context);
      if (zone && zone.radius && runtimes.get("RB-01")?.avoidance) {
        const dist = Math.hypot(waiter.pos.x - zone.pos.x, waiter.pos.y - zone.pos.y);
        if (dist <= zone.radius - 0.4) {
          waiterEnteredEarly = true;
        }
      }

      if (steps === 25 && runtimes.get("RB-01")?.avoidance) {
        runtimes.get("RB-01").avoidance = null;
      }

      if (moved.arrived) {
        waiterArrived = true;
      }
      if (waiterArrived && !runtimes.get("RB-01")?.avoidance) break;
    }

    assert.equal(waiterEnteredEarly, false, "Waiter should not enter avoidance zone before clear");
    assert.equal(waiterArrived, true, "Waiter should arrive after avoidance clears");
    console.log("E2E traffic: avoidance release unblocks waiter.");
  });
}

function testConflictCycleResolves() {
  withFakeClock((clock) => {
    const harness = createHarness();
    harness.conflictGroups.set("A<->B", new Set(["C<->D", "E<->F"]));
    harness.conflictGroups.set("C<->D", new Set(["A<->B", "E<->F"]));
    harness.conflictGroups.set("E<->F", new Set(["A<->B", "C<->D"]));

    const r1 = { id: "RB-01", pos: { x: -6, y: 0 }, heading: 0, speed: 0 };
    const r2 = { id: "RB-02", pos: { x: 0, y: -6 }, heading: Math.PI / 2, speed: 0 };
    const r3 = { id: "RB-03", pos: { x: 6, y: 0 }, heading: Math.PI, speed: 0 };
    const robots = [r1, r2, r3];
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(r1.pos, { x: 6, y: 0 }, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(r2.pos, { x: 0, y: 6 }, "C", "D") });
    runtimes.set("RB-03", { phase: "moving", route: createRoute(r3.pos, { x: -6, y: 0 }, "E", "F") });

    let blockedSeen = false;
    let steps = 0;
    const maxSteps = 1200;

    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );
      robots.forEach((robot) => {
        const runtime = runtimes.get(robot.id);
        if (!runtime || runtime.phase === "done") return;
        stepRobot(robot, runtime, harness, robots, activeIds, 200);
        if (runtime.stallReason === "edge_lock") {
          blockedSeen = true;
        }
      });
      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    assert.ok(blockedSeen, "Expected conflict cycle to trigger waiting");
    assert.equal(runtimes.get("RB-01")?.phase, "done", "Robot 1 should finish");
    assert.equal(runtimes.get("RB-02")?.phase, "done", "Robot 2 should finish");
    assert.equal(runtimes.get("RB-03")?.phase, "done", "Robot 3 should finish");
    console.log("E2E traffic: conflict cycle resolves without deadlock.");
  });
}

function testConflictIntersectionNoDeadlock() {
  withFakeClock((clock) => {
    const harness = createHarness();
    harness.conflictGroups.set("A<->B", new Set(["C<->D"]));
    harness.conflictGroups.set("C<->D", new Set(["A<->B"]));

    const r1 = { id: "RB-01", pos: { x: -4, y: 0 }, heading: 0, speed: 0 };
    const r2 = { id: "RB-02", pos: { x: 0, y: -4 }, heading: Math.PI / 2, speed: 0 };
    const robots = [r1, r2];
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(r1.pos, { x: 4, y: 0 }, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(r2.pos, { x: 0, y: 4 }, "C", "D") });

    let blockedSeen = false;
    let steps = 0;
    const maxSteps = 900;

    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );
      robots.forEach((robot) => {
        const runtime = runtimes.get(robot.id);
        if (!runtime || runtime.phase === "done") return;
        stepRobot(robot, runtime, harness, robots, activeIds, 200);
        if (runtime.stallReason === "edge_lock") {
          blockedSeen = true;
        }
      });
      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    assert.equal(blockedSeen, true, "Expected at least one robot to wait at conflict");
    assert.equal(runtimes.get("RB-01")?.phase, "done", "Robot 1 should finish after conflict");
    assert.equal(runtimes.get("RB-02")?.phase, "done", "Robot 2 should finish after conflict");
    console.log("E2E traffic: conflict intersection clears without deadlock.");
  });
}

function testOverlappingAvoidanceZones() {
  withFakeClock((clock) => {
    const context = { avoidanceZones: new Map() };
    const ownerA = { id: "RB-01", pos: { x: 0, y: 2.8 }, heading: 0, speed: 0 };
    const ownerB = { id: "RB-02", pos: { x: 1.5, y: 2.8 }, heading: 0, speed: 0 };
    const mover = { id: "RB-03", pos: { x: -4, y: 0 }, heading: 0, speed: 0 };
    const robots = [ownerA, ownerB, mover];
    const runtimes = new Map();
    runtimes.set("RB-01", { avoidance: { obstacleId: "obs-A" } });
    runtimes.set("RB-02", { avoidance: { obstacleId: "obs-B" } });

    const target = { x: 6, y: 0 };
    let enteredZone = false;
    let steps = 0;
    const maxSteps = 700;

    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      refreshAvoidanceZones(context, robots, runtimes);

      moveRobotToward(mover, target, robots, 200, context);
      const zones = Array.from(context.avoidanceZones.values());
      zones.forEach((zone) => {
        const dist = Math.hypot(mover.pos.x - zone.pos.x, mover.pos.y - zone.pos.y);
        if (dist <= zone.radius - 0.2 && zone.ownerId !== mover.id) {
          enteredZone = true;
        }
      });

      if (steps === 25) {
        runtimes.get("RB-01").avoidance = null;
        runtimes.get("RB-02").avoidance = null;
      }

      if (Math.hypot(mover.pos.x - target.x, mover.pos.y - target.y) <= ROBOT_ARRIVAL_DISTANCE) {
        break;
      }
    }

    assert.equal(enteredZone, false, "Mover should not enter overlapping avoidance zones");
    console.log("E2E traffic: overlapping avoidance zones block correctly.");
  });
}

function testManualOverrideInCorridor() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const leader = { id: "RB-01", pos: { x: 0, y: 0 }, heading: 0, speed: 0 };
    const follower = { id: "RB-02", pos: { x: -4, y: 2.8 }, heading: 0, speed: 0 };
    const robots = [leader, follower];
    const leaderTarget = { x: 10, y: 0 };
    const followerTarget = { x: 10, y: 2.8 };
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(leader.pos, leaderTarget, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(follower.pos, followerTarget, "A", "B") });

    let steps = 0;
    const maxSteps = 900;
    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );

      if (steps === 30) {
        harness.releaseEdgeLock("A<->B", "RB-01");
      }

      const leaderRuntime = runtimes.get("RB-01");
      if (leaderRuntime?.phase !== "done") {
        if (steps !== 30 && steps < 60) {
          stepRobot(leader, leaderRuntime, harness, robots, activeIds, 200);
        }
      }
      const followerRuntime = runtimes.get("RB-02");
      if (followerRuntime?.phase !== "done") {
        stepRobot(follower, followerRuntime, harness, robots, activeIds, 200);
      }

      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    assert.equal(runtimes.get("RB-02")?.phase, "done", "Follower should finish after manual override");
    console.log("E2E traffic: manual override in corridor recovers.");
  });
}

function testEdgeQueueChurnNoStarvation() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const endPositions = [
      { x: 10, y: 0 },
      { x: 10, y: 2.8 },
      { x: 10, y: -2.8 },
      { x: 10, y: 5.6 }
    ];
    const robots = [
      { id: "RB-01", pos: { x: 0, y: 0 }, heading: 0, speed: 0 },
      { id: "RB-02", pos: { x: -2, y: 2.8 }, heading: 0, speed: 0 },
      { id: "RB-03", pos: { x: -4, y: -2.8 }, heading: 0, speed: 0 },
      { id: "RB-04", pos: { x: -6, y: 5.6 }, heading: 0, speed: 0 }
    ];
    const runtimes = new Map();
    robots.forEach((robot, index) => {
      runtimes.set(robot.id, {
        phase: "moving",
        route: createRoute(robot.pos, endPositions[index], "A", "B")
      });
    });

    let steps = 0;
    const maxSteps = 1000;
    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );
      if (steps === 15) {
        runtimes.delete("RB-02");
        const crashed = robots.find((item) => item.id === "RB-02");
        if (crashed) {
          crashed.pos = null;
        }
      }
      const churnActive = new Set(Array.from(runtimes.keys()));
      robots.forEach((robot) => {
        const runtime = runtimes.get(robot.id);
        if (!runtime || runtime.phase === "done") return;
        stepRobot(robot, runtime, harness, robots, churnActive, 200);
      });
      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    Array.from(runtimes.values()).forEach((runtime) => {
      assert.equal(runtime.phase, "done", "Remaining robots should finish after churn");
    });
    console.log("E2E traffic: edge queue churn no starvation.");
  });
}

function testNodeLockExpiresDuringAvoidance() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const first = harness.reserveNodeLock("N1", "RB-01");
    assert.ok(first.ok, "First node lock should be acquired");
    clock.advance(NODE_LOCK_TTL_MS + 20);
    harness.expireNodeLocks(Date.now());
    const second = harness.reserveNodeLock("N1", "RB-02");
    assert.ok(second.ok, "Node lock should expire even if holder is in avoidance");
    console.log("E2E traffic: node lock expires during avoidance.");
  });
}

function testHighDensityBurstNoDeadlock() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const endPositions = [
      { x: 14, y: 0 },
      { x: 14, y: 2.8 },
      { x: 14, y: -2.8 },
      { x: 14, y: 5.6 },
      { x: 14, y: -5.6 },
      { x: 14, y: 8.4 }
    ];
    const robots = endPositions.map((pos, idx) => ({
      id: `RB-${idx + 1}`,
      pos: { x: -idx * 1.8, y: pos.y },
      heading: 0,
      speed: 0
    }));
    const runtimes = new Map();
    robots.forEach((robot, index) => {
      runtimes.set(robot.id, {
        phase: "moving",
        route: createRoute(robot.pos, endPositions[index], "A", "B")
      });
    });

    let steps = 0;
    const maxSteps = 1400;
    const lastX = new Map(robots.map((robot) => [robot.id, robot.pos.x]));
    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );
      robots.forEach((robot) => {
        const runtime = runtimes.get(robot.id);
        if (!runtime || runtime.phase === "done") return;
        stepRobot(robot, runtime, harness, robots, activeIds, 200);
        const prev = lastX.get(robot.id);
        if (robot.pos.x < prev - 1e-6) {
          assert.fail(`Robot ${robot.id} should not reverse in burst test`);
        }
        lastX.set(robot.id, robot.pos.x);
      });
      const done = robots.every((robot) => runtimes.get(robot.id)?.phase === "done");
      if (done) break;
    }

    robots.forEach((robot) => {
      const runtime = runtimes.get(robot.id);
      assert.equal(runtime.phase, "done", "All robots should finish in burst test");
    });
    console.log("E2E traffic: high-density burst completes without deadlock.");
  });
}

function testCrashRecoveryClearsLocks() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const activeIds = new Set(["RB-01"]);
    const lock = harness.reserveEdgeLock("A<->B", "RB-01", "A->B", 0, 5, EDGE_LOCK_FOLLOW_DISTANCE, activeIds);
    assert.ok(lock.ok, "Initial lock should be acquired");
    harness.touchEdgeQueue("A<->B", "RB-01", "A->B", Date.now());

    clock.advance(EDGE_LOCK_TIMEOUT_MS + 50);
    harness.expireEdgeLocks(Date.now());
    const cleared = !harness.edgeLocks.get("A<->B");
    assert.ok(cleared, "Edge locks should expire after crash");

    const queue = harness.pruneEdgeQueue("A<->B", Date.now(), new Set());
    assert.equal(queue.length, 0, "Edge queue should clear after crash");

    const retry = harness.reserveEdgeLock("A<->B", "RB-02", "A->B", 0, 5, EDGE_LOCK_FOLLOW_DISTANCE, new Set(["RB-02"]));
    assert.ok(retry.ok, "New robot should acquire lock after crash cleanup");
    console.log("E2E traffic: crash recovery clears locks/queues.");
  });
}

function testStuckRetryBackoff() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const robot = { id: "RB-01", pos: { x: 0, y: 0 }, heading: 0, speed: 0 };
    const runtime = {
      phase: "moving",
      route: createRoute({ x: 0, y: 0 }, { x: 5, y: 0 }, "A", "B"),
      noYieldTarget: true
    };
    runtime.stallSince = Date.now() - DEADLOCK_TIMEOUT_MS - 50;
    runtime.stallReason = "traffic";
    const activeIds = new Set([robot.id]);
    stepRobot(robot, runtime, harness, [robot], activeIds, 200);

    assert.ok(runtime.stuckRetryAt, "Robot should enter stuck when no yield target exists");
    clock.advance(STUCK_RETRY_BASE_MS + 50);
    runtime.noYieldTarget = false;
    stepRobot(robot, runtime, harness, [robot], activeIds, 200);
    assert.ok(!runtime.stuckRetryAt, "Stuck state should clear after retry delay");
    console.log("E2E traffic: stuck retry backoff ok.");
  });
}

function testStaleTelemetryDoesNotCollide() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const leader = { id: "RB-01", pos: { x: 0, y: 0 }, heading: 0, speed: 0 };
    const follower = { id: "RB-02", pos: { x: -5, y: 0 }, heading: 0, speed: 0 };
    const robots = [leader, follower];
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(leader.pos, { x: 12, y: 0 }, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(follower.pos, { x: 7.6, y: 0 }, "A", "B") });

    let staleLeaderPos = { ...leader.pos };
    let telemetryAgeMs = 0;
    const staleEvery = 5;
    let steps = 0;
    const maxSteps = 1600;
    let minDist = Number.POSITIVE_INFINITY;

    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      telemetryAgeMs += 200;
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );

      const leaderRuntime = runtimes.get("RB-01");
      if (leaderRuntime && leaderRuntime.phase !== "done") {
        stepRobot(leader, leaderRuntime, harness, robots, activeIds, 200);
      }

      const followerRuntime = runtimes.get("RB-02");
      if (followerRuntime?.phase !== "done") {
        const leaderActive = leaderRuntime && leaderRuntime.phase !== "done";
        const perceivedLeader = leaderActive
          ? { ...leader, pos: { ...staleLeaderPos }, speed: leader.speed || 0, telemetryAgeMs }
          : null;
        const perceivedRobots = leaderActive ? [perceivedLeader, follower] : [follower];
        stepRobot(follower, followerRuntime, harness, perceivedRobots, activeIds, 200);
      }

      const dist = Math.hypot(leader.pos.x - follower.pos.x, leader.pos.y - follower.pos.y);
      minDist = Math.min(minDist, dist);

      if (steps % staleEvery === 0) {
        staleLeaderPos = { ...leader.pos };
        telemetryAgeMs = 0;
      }

      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    const minThreshold = ROBOT_STOP_DISTANCE - 0.05;
    assert.ok(minDist >= minThreshold, "Stale telemetry should not reduce spacing");
    assert.equal(runtimes.get("RB-01")?.phase, "done", "Leader should finish");
    assert.equal(runtimes.get("RB-02")?.phase, "done", "Follower should finish");
    console.log("E2E traffic: stale telemetry keeps safe spacing.");
  });
}

function testSimultaneousReplanClearsQueues() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const first = { id: "RB-01", pos: { x: 0, y: 0 }, heading: 0, speed: 0 };
    const second = { id: "RB-02", pos: { x: -4, y: 0 }, heading: 0, speed: 0 };
    const robots = [first, second];
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(first.pos, { x: 8, y: 0 }, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(second.pos, { x: 8, y: 0 }, "A", "B") });
    const oldEdgeKey = runtimes.get("RB-01").route.segments[0].edgeGroupKey;

    for (let i = 0; i < 6; i += 1) {
      clock.advance(200);
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );
      robots.forEach((robot) => {
        const runtime = runtimes.get(robot.id);
        if (!runtime || runtime.phase === "done") return;
        stepRobot(robot, runtime, harness, robots, activeIds, 200);
      });
    }

    robots.forEach((robot) => {
      const runtime = runtimes.get(robot.id);
      if (!runtime?.route) return;
      const edgeKey = runtime.route.segments[0].edgeGroupKey;
      harness.releaseEdgeLock(edgeKey, robot.id);
      harness.releaseRobotEdgeQueues(robot.id);
      runtime.route = createRoute({ ...robot.pos }, { x: robot.pos.x + 2, y: robot.pos.y + 4 }, "C", "D");
      runtime.phase = "moving";
      clearRuntimeStall(runtime);
    });

    assert.ok(!harness.edgeLocks.has(oldEdgeKey), "Old edge locks should be cleared on replan");
    assert.ok(!harness.edgeQueues.has(oldEdgeKey), "Old edge queues should be cleared on replan");

    let steps = 0;
    const maxSteps = 1200;
    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );
      robots.forEach((robot) => {
        const runtime = runtimes.get(robot.id);
        if (!runtime || runtime.phase === "done") return;
        stepRobot(robot, runtime, harness, robots, activeIds, 200);
      });
      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    assert.equal(runtimes.get("RB-01")?.phase, "done", "First robot should finish after replan");
    assert.equal(runtimes.get("RB-02")?.phase, "done", "Second robot should finish after replan");
    console.log("E2E traffic: simultaneous replan clears queues.");
  });
}

function testConflictOverlapAllowsIndependentEdge() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const edge1 = makeEdgeGroupKey("A", "B");
    const edge2 = makeEdgeGroupKey("B", "C");
    const edge3 = makeEdgeGroupKey("C", "D");
    harness.conflictGroups.set(edge1, new Set([edge2]));
    harness.conflictGroups.set(edge2, new Set([edge1, edge3]));
    harness.conflictGroups.set(edge3, new Set([edge2]));

    const first = { id: "RB-01", pos: { x: 0, y: 0 }, heading: 0, speed: 0 };
    const second = { id: "RB-02", pos: { x: 0, y: 4 }, heading: 0, speed: 0 };
    const robots = [first, second];
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(first.pos, { x: 10, y: 0 }, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(second.pos, { x: 10, y: 4 }, "C", "D") });

    let stalled = false;
    let steps = 0;
    const maxSteps = 1000;
    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );
      robots.forEach((robot) => {
        const runtime = runtimes.get(robot.id);
        if (!runtime || runtime.phase === "done") return;
        stepRobot(robot, runtime, harness, robots, activeIds, 200);
        if (runtime.stallReason === "edge_lock") {
          stalled = true;
        }
      });
      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    assert.equal(stalled, false, "Independent edges should not conflict indirectly");
    assert.equal(runtimes.get("RB-01")?.phase, "done", "Robot on edge1 should finish");
    assert.equal(runtimes.get("RB-02")?.phase, "done", "Robot on edge3 should finish");
    console.log("E2E traffic: partial conflict overlap does not block independent edges.");
  });
}

function testManualOverrideReleasesConflict() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const edge1 = makeEdgeGroupKey("A", "B");
    const edge2 = makeEdgeGroupKey("B", "C");
    harness.conflictGroups.set(edge1, new Set([edge2]));
    harness.conflictGroups.set(edge2, new Set([edge1]));

    const owner = { id: "RB-01", pos: { x: 0, y: 0 }, heading: 0, speed: 0 };
    const waiter = { id: "RB-02", pos: { x: 0, y: 2.8 }, heading: 0, speed: 0 };
    const robots = [owner, waiter];
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(owner.pos, { x: 8, y: 0 }, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(waiter.pos, { x: 8, y: 2.8 }, "B", "C") });

    let blocked = false;
    let manualReleased = false;
    let steps = 0;
    const maxSteps = 1400;

    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );

      const ownerRuntime = runtimes.get("RB-01");
      if (ownerRuntime && ownerRuntime.phase !== "done") {
        stepRobot(owner, ownerRuntime, harness, robots, activeIds, 200);
      }

      const waiterRuntime = runtimes.get("RB-02");
      if (waiterRuntime?.phase !== "done") {
        stepRobot(waiter, waiterRuntime, harness, robots, activeIds, 200);
        if (waiterRuntime.stallReason === "edge_lock") {
          blocked = true;
        }
      }

      if (!manualReleased && steps === 6) {
        harness.releaseEdgeLock(edge1, "RB-01");
        harness.releaseRobotEdgeQueues("RB-01");
        runtimes.delete("RB-01");
        manualReleased = true;
      }

      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    assert.ok(blocked, "Robot should be blocked before manual release");
    assert.equal(runtimes.get("RB-02")?.phase, "done", "Waiter should finish after release");
    console.log("E2E traffic: manual override releases conflict lock.");
  });
}

function testRobotDropoutReleasesLockAfterTimeout() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const leader = { id: "RB-01", pos: { x: 0, y: 0 }, heading: 0, speed: 0 };
    const follower = { id: "RB-02", pos: { x: -4, y: 0 }, heading: 0, speed: 0 };
    const robots = [leader, follower];
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(leader.pos, { x: 8, y: 0 }, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(follower.pos, { x: 8, y: 0 }, "A", "B") });

    let dropped = false;
    let steps = 0;
    const maxSteps = 2000;

    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );

      const leaderRuntime = runtimes.get("RB-01");
      if (leaderRuntime && leaderRuntime.phase !== "done") {
        stepRobot(leader, leaderRuntime, harness, robots, activeIds, 200);
      }

      if (!dropped && steps === 6) {
        runtimes.delete("RB-01");
        dropped = true;
      }

      const followerRuntime = runtimes.get("RB-02");
      if (followerRuntime?.phase !== "done") {
        const perceivedRobots = dropped ? [follower] : robots;
        stepRobot(follower, followerRuntime, harness, perceivedRobots, activeIds, 200);
      }

      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    assert.equal(runtimes.get("RB-02")?.phase, "done", "Follower should finish after lock timeout");
    console.log("E2E traffic: dropout lock expires and follower proceeds.");
  });
}

function testTelemetryJitterDoesNotDeadlock() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const leader = { id: "RB-01", pos: { x: 0, y: 0 }, heading: 0, speed: 0 };
    const follower = { id: "RB-02", pos: { x: -6, y: 0 }, heading: 0, speed: 0 };
    const robots = [leader, follower];
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(leader.pos, { x: 12, y: 0 }, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(follower.pos, { x: 7.8, y: 0 }, "A", "B") });

    let staleLeaderPos = { ...leader.pos };
    const jitterSteps = [3, 5, 2, 6, 4, 7];
    let jitterIndex = 0;
    let nextUpdate = jitterSteps[0];
    let steps = 0;
    const maxSteps = 1800;
    let minDist = Number.POSITIVE_INFINITY;

    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );

      const leaderRuntime = runtimes.get("RB-01");
      if (leaderRuntime && leaderRuntime.phase !== "done") {
        stepRobot(leader, leaderRuntime, harness, robots, activeIds, 200);
      }

      const followerRuntime = runtimes.get("RB-02");
      if (followerRuntime && followerRuntime.phase !== "done") {
        const leaderActive = leaderRuntime && leaderRuntime.phase !== "done";
        const perceivedLeader = leaderActive
          ? { ...leader, pos: { ...staleLeaderPos }, speed: leader.speed || 0 }
          : null;
        const perceivedRobots = leaderActive ? [perceivedLeader, follower] : [follower];
        stepRobot(follower, followerRuntime, harness, perceivedRobots, activeIds, 200);
      }

      if (steps >= nextUpdate) {
        staleLeaderPos = { ...leader.pos };
        jitterIndex = (jitterIndex + 1) % jitterSteps.length;
        nextUpdate += jitterSteps[jitterIndex];
      }

      const dist = Math.hypot(leader.pos.x - follower.pos.x, leader.pos.y - follower.pos.y);
      minDist = Math.min(minDist, dist);

      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    assert.ok(minDist >= ROBOT_STOP_DISTANCE - 0.05, "Jittered telemetry should keep spacing");
    assert.equal(runtimes.get("RB-01")?.phase, "done", "Leader should finish");
    assert.equal(runtimes.get("RB-02")?.phase, "done", "Follower should finish");
    console.log("E2E traffic: telemetry jitter keeps safe spacing.");
  });
}

function testPayloadRadiusIncreaseMaintainsSpacing() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const leader = {
      id: "RB-01",
      pos: { x: 0, y: 0 },
      heading: 0,
      speed: 0,
      model: { ...DEFAULT_ROBOT_MODEL }
    };
    const follower = {
      id: "RB-02",
      pos: { x: -10, y: 0 },
      heading: 0,
      speed: 0,
      model: { ...DEFAULT_ROBOT_MODEL }
    };
    const robots = [leader, follower];
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(leader.pos, { x: 12, y: 0 }, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(follower.pos, { x: 7.6, y: 0 }, "A", "B") });

    let steps = 0;
    const maxSteps = 1800;
    const pickupStep = 2;
    let minDistAfterPickup = Number.POSITIVE_INFINITY;

    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );
      robots.forEach((robot) => {
        const runtime = runtimes.get(robot.id);
        if (!runtime || runtime.phase === "done") return;
        stepRobot(robot, runtime, harness, robots, activeIds, 200);
      });

      if (steps === pickupStep) {
        scaleRobotModel(follower, 1.6);
      }

      if (steps >= pickupStep) {
        const dist = Math.hypot(leader.pos.x - follower.pos.x, leader.pos.y - follower.pos.y);
        minDistAfterPickup = Math.min(minDistAfterPickup, dist);
      }

      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    const spacing = getTrafficSpacing(follower);
    assert.ok(minDistAfterPickup >= spacing.stop - 0.05, "Bigger payload should keep larger spacing");
    assert.equal(runtimes.get("RB-01")?.phase, "done", "Leader should finish");
    const followerRuntime = runtimes.get("RB-02");
    assert.equal(followerRuntime?.phase, "done", "Follower should finish");
    console.log("E2E traffic: payload radius increase maintains spacing.");
  });
}

function testBidirectionalCorridorThreeRobots() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const lead = { id: "RB-01", pos: { x: -2, y: 0 }, heading: 0, speed: 0 };
    const tail = { id: "RB-02", pos: { x: -8, y: 0 }, heading: 0, speed: 0 };
    const opposite = { id: "RB-03", pos: { x: 10, y: 0 }, heading: Math.PI, speed: 0 };
    const robots = [lead, tail, opposite];
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(lead.pos, { x: 10, y: 0 }, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(tail.pos, { x: 7.2, y: 0 }, "A", "B") });
    runtimes.set("RB-03", { phase: "moving", route: createRoute(opposite.pos, { x: -10, y: 0 }, "B", "A") });

    let steps = 0;
    const maxSteps = 2400;
    let maxYielding = 0;
    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );
      robots.forEach((robot) => {
        const runtime = runtimes.get(robot.id);
        if (!runtime || runtime.phase === "done") return;
        stepRobot(robot, runtime, harness, robots, activeIds, 200);
      });
      const yieldingNow = Array.from(runtimes.values()).filter((runtime) => runtime.phase === "yield")
        .length;
      maxYielding = Math.max(maxYielding, yieldingNow);
      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    assert.ok(maxYielding <= 2, "At most two robots should yield simultaneously");
    assert.equal(runtimes.get("RB-01")?.phase, "done", "Lead robot should finish");
    assert.equal(runtimes.get("RB-02")?.phase, "done", "Tail robot should finish");
    assert.equal(runtimes.get("RB-03")?.phase, "done", "Opposite robot should finish");
    console.log("E2E traffic: bidirectional corridor with three robots clears.");
  });
}

function testBottleneckBranchNoDeadlock() {
  withFakeClock((clock) => {
    const harness = createHarness();
    harness.conflictGroups.set("A<->B", new Set(["C<->D"]));
    harness.conflictGroups.set("C<->D", new Set(["A<->B"]));

    const lead = { id: "RB-01", pos: { x: -6, y: 0 }, heading: 0, speed: 0 };
    const tail = { id: "RB-02", pos: { x: -10, y: 0 }, heading: 0, speed: 0 };
    const branch = { id: "RB-03", pos: { x: 2, y: 6 }, heading: -Math.PI / 2, speed: 0 };
    const robots = [lead, tail, branch];
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(lead.pos, { x: 10, y: 0 }, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(tail.pos, { x: 7.2, y: 0 }, "A", "B") });
    runtimes.set("RB-03", { phase: "moving", route: null });

    let branchWaited = false;
    let steps = 0;
    const maxSteps = 2600;
    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());

      if (steps === 12) {
        const branchRuntime = runtimes.get("RB-03");
        branchRuntime.route = createRoute(branch.pos, { x: 2, y: -4 }, "C", "D");
      }

      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done" && entry[1]?.route)
          .map((entry) => entry[0])
      );
      robots.forEach((robot) => {
        const runtime = runtimes.get(robot.id);
        if (!runtime || runtime.phase === "done" || !runtime.route) return;
        stepRobot(robot, runtime, harness, robots, activeIds, 200);
      });

      if (runtimes.get("RB-03")?.stallReason === "edge_lock") {
        branchWaited = true;
      }

      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    assert.ok(branchWaited, "Branch robot should wait at bottleneck");
    assert.equal(runtimes.get("RB-01")?.phase, "done", "Lead robot should finish");
    const tailRuntime = runtimes.get("RB-02");
    assert.equal(tailRuntime?.phase, "done", "Tail robot should finish");
    assert.equal(runtimes.get("RB-03")?.phase, "done", "Branch robot should finish");
    console.log("E2E traffic: bottleneck branch clears without deadlock.");
  });
}

function testAvoidanceInCorridorNoDeadlock() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const context = { avoidanceZones: new Map() };
    const owner = { id: "RB-01", pos: { x: -1, y: 0 }, heading: 0, speed: 0 };
    const opposite = { id: "RB-02", pos: { x: 9, y: 0 }, heading: Math.PI, speed: 0 };
    const robots = [owner, opposite];
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(owner.pos, { x: 10, y: 0 }, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(opposite.pos, { x: -10, y: 0 }, "B", "A") });
    runtimes.get("RB-01").avoidance = { obstacleId: "obs-corridor" };

    let enteredZone = false;
    let steps = 0;
    const maxSteps = 2400;
    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      refreshAvoidanceZones(context, robots, runtimes);
      harness.expireEdgeLocks(Date.now());

      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );

      if (steps <= 40) {
        owner.speed = 0;
      } else {
        const runtime = runtimes.get("RB-01");
        if (runtime?.phase !== "done") {
          stepRobot(owner, runtime, harness, robots, activeIds, 200, context);
        }
      }

      const oppositeRuntime = runtimes.get("RB-02");
      if (oppositeRuntime?.phase !== "done") {
        stepRobot(opposite, oppositeRuntime, harness, robots, activeIds, 200, context);
      }

      const zone = context.avoidanceZones.get("RB-01");
      if (zone && !zone.allowed.has(opposite.id)) {
        const dist = Math.hypot(opposite.pos.x - zone.pos.x, opposite.pos.y - zone.pos.y);
        if (dist <= zone.radius - 0.1) {
          enteredZone = true;
        }
      }

      if (steps === 45) {
        runtimes.get("RB-01").avoidance = null;
      }

      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    assert.equal(enteredZone, false, "Opposite robot should not enter avoidance zone");
    assert.equal(runtimes.get("RB-01")?.phase, "done", "Owner robot should finish");
    assert.equal(runtimes.get("RB-02")?.phase, "done", "Opposite robot should finish");
    console.log("E2E traffic: avoidance in corridor clears without deadlock.");
  });
}

function testSimultaneousReplanAtConflict() {
  withFakeClock((clock) => {
    const harness = createHarness();
    harness.conflictGroups.set("A<->B", new Set(["C<->D"]));
    harness.conflictGroups.set("C<->D", new Set(["A<->B"]));

    const r1 = { id: "RB-01", pos: { x: 0, y: 0 }, heading: 0, speed: 0 };
    const r2 = { id: "RB-02", pos: { x: 0, y: 4 }, heading: 0, speed: 0 };
    const robots = [r1, r2];
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(r1.pos, { x: 6, y: 0 }, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(r2.pos, { x: 6, y: 4 }, "C", "D") });

    let conflictSeen = false;
    let steps = 0;
    const maxSteps = 1400;
    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );

      robots.forEach((robot) => {
        const runtime = runtimes.get(robot.id);
        if (!runtime || runtime.phase === "done") return;
        stepRobot(robot, runtime, harness, robots, activeIds, 200);
        if (runtime.stallReason === "edge_lock") {
          conflictSeen = true;
        }
      });

      if (steps === 16) {
        harness.releaseRobotEdgeLocks("RB-01");
        harness.releaseRobotEdgeLocks("RB-02");
        const r1Runtime = runtimes.get("RB-01");
        const r2Runtime = runtimes.get("RB-02");
        r1Runtime.route = createRoute(r1.pos, { x: 10, y: 0 }, "E", "F");
        r2Runtime.route = createRoute(r2.pos, { x: 10, y: 4 }, "G", "H");
        clearRuntimeStall(r1Runtime);
        clearRuntimeStall(r2Runtime);
      }

      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    assert.ok(conflictSeen, "Expected at least one conflict before replan");
    assert.equal(runtimes.get("RB-01")?.phase, "done", "Robot 1 should finish after replan");
    assert.equal(runtimes.get("RB-02")?.phase, "done", "Robot 2 should finish after replan");
    assert.equal(harness.edgeLocks.size, 0, "All edge locks should clear after replan");
    console.log("E2E traffic: simultaneous replan at conflict clears without deadlock.");
  });
}

function testDirectionalFairnessNoStarvation() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const r1 = { id: "RB-01", pos: { x: -12, y: 0 }, heading: 0, speed: 0 };
    const r2 = { id: "RB-02", pos: { x: -8, y: 0 }, heading: 0, speed: 0 };
    const r3 = { id: "RB-03", pos: { x: -4, y: 0 }, heading: 0, speed: 0 };
    const opposite = { id: "RB-04", pos: { x: 12, y: 0 }, heading: Math.PI, speed: 0 };
    const robots = [r1, r2, r3, opposite];
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(r1.pos, { x: 14, y: 0 }, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(r2.pos, { x: 14, y: 0 }, "A", "B") });
    runtimes.set("RB-03", { phase: "moving", route: createRoute(r3.pos, { x: 14, y: 0 }, "A", "B") });
    runtimes.set("RB-04", { phase: "moving", route: createRoute(opposite.pos, { x: -14, y: 0 }, "B", "A") });

    let oppositeStartedAt = null;
    let steps = 0;
    const maxSteps = 3200;
    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );
      robots.forEach((robot) => {
        const runtime = runtimes.get(robot.id);
        if (!runtime || runtime.phase === "done") return;
        stepRobot(robot, runtime, harness, robots, activeIds, 200);
      });

      if (oppositeStartedAt === null) {
        const progress = runtimes.get("RB-04")?.route?.segmentProgress || 0;
        if (progress > 0.2) {
          oppositeStartedAt = steps;
        }
      }

      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    assert.ok(oppositeStartedAt !== null && oppositeStartedAt < 400, "Opposite direction should not starve");
    assert.equal(runtimes.get("RB-01")?.phase, "done", "Leader 1 should finish");
    assert.equal(runtimes.get("RB-02")?.phase, "done", "Leader 2 should finish");
    assert.equal(runtimes.get("RB-03")?.phase, "done", "Leader 3 should finish");
    assert.equal(runtimes.get("RB-04")?.phase, "done", "Opposite robot should finish");
    console.log("E2E traffic: opposite direction gets a turn (no starvation).");
  });
}

function testConflictCycleFourRobots() {
  withFakeClock((clock) => {
    const harness = createHarness();
    harness.conflictGroups.set("A<->B", new Set(["C<->D", "G<->H"]));
    harness.conflictGroups.set("C<->D", new Set(["A<->B", "E<->F"]));
    harness.conflictGroups.set("E<->F", new Set(["C<->D", "G<->H"]));
    harness.conflictGroups.set("G<->H", new Set(["E<->F", "A<->B"]));

    const r1 = { id: "RB-01", pos: { x: -6, y: 0 }, heading: 0, speed: 0 };
    const r2 = { id: "RB-02", pos: { x: 0, y: -6 }, heading: Math.PI / 2, speed: 0 };
    const r3 = { id: "RB-03", pos: { x: 6, y: 0 }, heading: Math.PI, speed: 0 };
    const r4 = { id: "RB-04", pos: { x: 0, y: 6 }, heading: -Math.PI / 2, speed: 0 };
    const robots = [r1, r2, r3, r4];
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(r1.pos, { x: 6, y: 0 }, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(r2.pos, { x: 0, y: 6 }, "C", "D") });
    runtimes.set("RB-03", { phase: "moving", route: createRoute(r3.pos, { x: -6, y: 0 }, "E", "F") });
    runtimes.set("RB-04", { phase: "moving", route: createRoute(r4.pos, { x: 0, y: -6 }, "G", "H") });

    let blockedSeen = false;
    let steps = 0;
    const maxSteps = 1600;
    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );
      robots.forEach((robot) => {
        const runtime = runtimes.get(robot.id);
        if (!runtime || runtime.phase === "done") return;
        stepRobot(robot, runtime, harness, robots, activeIds, 200);
        if (runtime.stallReason === "edge_lock") {
          blockedSeen = true;
        }
      });
      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    assert.ok(blockedSeen, "Expected conflict cycle to trigger waiting");
    assert.equal(runtimes.get("RB-01")?.phase, "done", "Robot 1 should finish");
    assert.equal(runtimes.get("RB-02")?.phase, "done", "Robot 2 should finish");
    assert.equal(runtimes.get("RB-03")?.phase, "done", "Robot 3 should finish");
    assert.equal(runtimes.get("RB-04")?.phase, "done", "Robot 4 should finish");
    console.log("E2E traffic: four-way conflict cycle resolves without deadlock.");
  });
}

function testManualPauseResumeKeepsLock() {
  withFakeClock((clock) => {
    const harness = createHarness();
    const leader = { id: "RB-01", pos: { x: 0, y: 0 }, heading: 0, speed: 0 };
    const follower = { id: "RB-02", pos: { x: -4, y: 0 }, heading: 0, speed: 0 };
    const robots = [leader, follower];
    const runtimes = new Map();
    runtimes.set("RB-01", { phase: "moving", route: createRoute(leader.pos, { x: 10, y: 0 }, "A", "B") });
    runtimes.set("RB-02", { phase: "moving", route: createRoute(follower.pos, { x: 7.2, y: 0 }, "A", "B") });

    let blockedSeen = false;
    let steps = 0;
    const maxSteps = 1400;
    while (steps < maxSteps) {
      steps += 1;
      clock.advance(200);
      harness.expireEdgeLocks(Date.now());
      const activeIds = new Set(
        Array.from(runtimes.entries())
          .filter((entry) => entry[1]?.phase !== "done")
          .map((entry) => entry[0])
      );

      const leaderRuntime = runtimes.get("RB-01");
      const followerRuntime = runtimes.get("RB-02");

      const paused = steps >= 20 && steps <= 70;
      if (paused) {
        leader.speed = 0;
        const segment = leaderRuntime.route.segments[leaderRuntime.route.segmentIndex];
        harness.reserveEdgeLock(
          segment.edgeGroupKey,
          leader.id,
          segment.edgeKey,
          leaderRuntime.route.segmentProgress,
          segment.totalLength,
          EDGE_LOCK_FOLLOW_DISTANCE,
          activeIds
        );
      } else if (leaderRuntime.phase !== "done") {
        stepRobot(leader, leaderRuntime, harness, robots, activeIds, 200);
      }

      if (followerRuntime.phase !== "done") {
        stepRobot(follower, followerRuntime, harness, robots, activeIds, 200);
      }

      if (followerRuntime.stallReason === "edge_lock" || followerRuntime.stallReason === "traffic") {
        blockedSeen = true;
      }

      const done = Array.from(runtimes.values()).every((runtime) => runtime.phase === "done");
      if (done) break;
    }

    assert.ok(blockedSeen, "Follower should wait during manual pause");
    assert.equal(runtimes.get("RB-01")?.phase, "done", "Leader should finish after resume");
    assert.equal(runtimes.get("RB-02")?.phase, "done", "Follower should finish after resume");
    console.log("E2E traffic: manual pause/resume keeps lock without deadlock.");
  });
}

function run() {
  testHeadOnDeadlockResolves();
  testQueueStaleClears();
  testStaleQueueHeadWithoutLockClears();
  testNodeLockDuringAction();
  testNodeLockSerializesEntry();
  testReplanReleasesEdgeLock();
  testQueueNoStarvation();
  if (!blockAvoidanceTest("testAvoidanceZonePassesInsideRobot", "Requires avoidance zones.")) {
    testAvoidanceZonePassesInsideRobot();
  }
  if (!blockAvoidanceTest("testAvoidanceZoneAllowsFirstEntrant", "Requires avoidance zones.")) {
    testAvoidanceZoneAllowsFirstEntrant();
  }
  testEdgeConflictBlocksSecond();
  if (!blockAvoidanceTest("testAvoidanceZonesIndependent", "Requires avoidance zones.")) {
    testAvoidanceZonesIndependent();
  }
  if (!blockAvoidanceTest("testYieldCooldownRespected", "Requires yield recovery.")) {
    testYieldCooldownRespected();
  }
  if (!blockAvoidanceTest("testManualRespectsAvoidanceZone", "Requires avoidance zones.")) {
    testManualRespectsAvoidanceZone();
  }
  testReplanReleasesConflictLock();
  testReplanReleasesQueueEntry();
  testReplanDropsQueuedRobot();
  testEdgeHoldAndWaitBreaks();
  testEdgeLockTimeoutBreaksHoldAndWait();
  testPriorityHeadOnResolvesDeterministically();
  testReplanMidEdgeReleasesLock();
  testOvertakeDoesNotHappen();
  testManualReleaseUnblocksFollower();
  if (!blockAvoidanceTest("testObstacleRemovalResumesMotion", "Uses obstacle avoidance.")) {
    testObstacleRemovalResumesMotion();
  }
  if (!blockAvoidanceTest("testFlappingObstacleNoReverse", "Uses obstacle avoidance.")) {
    testFlappingObstacleNoReverse();
  }
  if (!blockAvoidanceTest("testLeaderReverseTriggersYield", "Requires yield recovery.")) {
    testLeaderReverseTriggersYield();
  }
  testFollowDistanceMaintained();
  testBlockedLeaderNoYield();
  if (!blockAvoidanceTest("testAvoidanceZoneReleaseUnblocksWaiter", "Requires avoidance zones.")) {
    testAvoidanceZoneReleaseUnblocksWaiter();
  }
  testConflictCycleResolves();
  testConflictIntersectionNoDeadlock();
  if (!blockAvoidanceTest("testOverlappingAvoidanceZones", "Requires avoidance zones.")) {
    testOverlappingAvoidanceZones();
  }
  testManualOverrideInCorridor();
  testEdgeQueueChurnNoStarvation();
  if (!blockAvoidanceTest("testNodeLockExpiresDuringAvoidance", "Requires avoidance zones.")) {
    testNodeLockExpiresDuringAvoidance();
  }
  testHighDensityBurstNoDeadlock();
  testCrashRecoveryClearsLocks();
  testStuckRetryBackoff();
  testStaleTelemetryDoesNotCollide();
  testSimultaneousReplanClearsQueues();
  testConflictOverlapAllowsIndependentEdge();
  testManualOverrideReleasesConflict();
  testRobotDropoutReleasesLockAfterTimeout();
  testTelemetryJitterDoesNotDeadlock();
  testPayloadRadiusIncreaseMaintainsSpacing();
  testBidirectionalCorridorThreeRobots();
  testBottleneckBranchNoDeadlock();
  if (!blockAvoidanceTest("testAvoidanceInCorridorNoDeadlock", "Requires avoidance zones.")) {
    testAvoidanceInCorridorNoDeadlock();
  }
  testSimultaneousReplanAtConflict();
  testDirectionalFairnessNoStarvation();
  testConflictCycleFourRobots();
  testManualPauseResumeKeepsLock();
}

run();

function withFakeClock(callback) {
  const realNow = Date.now;
  let current = 0;
  Date.now = () => current;
  try {
    return callback({
      now: () => current,
      advance: (ms) => {
        current += ms;
      }
    });
  } finally {
    Date.now = realNow;
  }
}
