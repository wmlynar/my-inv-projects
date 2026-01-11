function createObstacleManager(deps = {}) {
  const {
    robot,
    nodesById,
    edgesByKey,
    adjacency,
    findPath,
    rebuildTaskPath,
    clamp,
    normalizeAngle,
    distancePointToSegmentCoords,
    unitVector,
    polylineAtDistance,
    CURRENT_POINT_DIST,
    ROBOT_RADIUS_M,
    OBSTACLE_RADIUS_M,
    OBSTACLE_CLEARANCE_M,
    OBSTACLE_LOOKAHEAD_M,
    OBSTACLE_AVOID_ENABLED,
    BLOCK_REASON_OBSTACLE,
    BLOCK_REASON_MANUAL
  } = deps;

  const simObstacles = [];
  let obstacleSeq = 1;

  function addSimObstacle(payload) {
    const x = payload && Number.isFinite(payload.x) ? payload.x : null;
    const y = payload && Number.isFinite(payload.y) ? payload.y : null;
    if (x === null || y === null) {
      return { ok: false, error: 'invalid_obstacle' };
    }
    const radius = payload && Number.isFinite(payload.radius) ? payload.radius : OBSTACLE_RADIUS_M;
    const modeRaw = payload && payload.mode ? String(payload.mode).toLowerCase() : 'block';
    const mode = modeRaw === 'avoid' ? 'avoid' : 'block';
    const obstacle = {
      id: obstacleSeq++,
      x,
      y,
      radius,
      mode
    };
    simObstacles.push(obstacle);
    return { ok: true, obstacle };
  }

  function clearSimObstacles() {
    simObstacles.length = 0;
  }

  function listSimObstacles() {
    return simObstacles.map((obs) => ({
      id: obs.id,
      x: obs.x,
      y: obs.y,
      radius: obs.radius,
      mode: obs.mode
    }));
  }

  function setRobotBlockedState(blocked, options = {}) {
    if (!robot) {
      return;
    }
    robot.blocked = Boolean(blocked);
    if (!robot.blocked) {
      robot.blockReason = 0;
      robot.blockId = 0;
      robot.blockDi = 0;
      robot.blockUltrasonicId = 0;
      robot.blockPos = { x: 0, y: 0 };
      if (robot.currentTask && !robot.paused) {
        robot.taskStatus = 2;
      }
      return;
    }
    robot.blockReason = Number.isFinite(options.reason) ? options.reason : BLOCK_REASON_MANUAL;
    robot.blockId = Number.isFinite(options.id) ? options.id : robot.blockId || 0;
    robot.blockDi = Number.isFinite(options.di) ? options.di : robot.blockId || 0;
    robot.blockUltrasonicId = Number.isFinite(options.ultrasonicId)
      ? options.ultrasonicId
      : robot.blockId || 0;
    if (Number.isFinite(options.x) && Number.isFinite(options.y)) {
      robot.blockPos = { x: options.x, y: options.y };
    }
    if (robot.currentTask) {
      robot.taskStatus = 3;
    }
  }

  function distanceObstacleToPolyline(obstacle, polyline) {
    if (!polyline || !Array.isArray(polyline.points) || polyline.points.length < 2) {
      return Number.POSITIVE_INFINITY;
    }
    let best = Number.POSITIVE_INFINITY;
    const points = polyline.points;
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      const dist = distancePointToSegmentCoords(obstacle.x, obstacle.y, a.x, a.y, b.x, b.y);
      if (dist < best) {
        best = dist;
      }
    }
    return best;
  }

  function findBlockingObstacleOnPolyline(polyline) {
    if (!simObstacles.length || !polyline) {
      return null;
    }
    for (const obstacle of simObstacles) {
      const lookahead = OBSTACLE_LOOKAHEAD_M + obstacle.radius;
      const distToRobot = Math.hypot(obstacle.x - robot.pose.x, obstacle.y - robot.pose.y);
      if (distToRobot > lookahead) {
        continue;
      }
      const distToPath = distanceObstacleToPolyline(obstacle, polyline);
      if (distToPath <= obstacle.radius + OBSTACLE_CLEARANCE_M + ROBOT_RADIUS_M) {
        return obstacle;
      }
    }
    return null;
  }

  function smoothstep(t) {
    const clamped = clamp(t, 0, 1);
    return clamped * clamped * (3 - 2 * clamped);
  }

  function projectPointToPolyline(polyline, point) {
    if (!polyline || !point || !Array.isArray(polyline.points)) {
      return null;
    }
    const points = polyline.points;
    if (points.length < 2) {
      return null;
    }
    let best = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const abLenSq = abx * abx + aby * aby;
      if (abLenSq === 0) {
        continue;
      }
      const apx = point.x - a.x;
      const apy = point.y - a.y;
      const t = clamp((apx * abx + apy * aby) / abLenSq, 0, 1);
      const cx = a.x + abx * t;
      const cy = a.y + aby * t;
      const dist = Math.hypot(point.x - cx, point.y - cy);
      if (dist < bestDist) {
        bestDist = dist;
        const segLen = Math.sqrt(abLenSq);
        const s = polyline.lengths[i] + t * segLen;
        const heading = Math.atan2(aby, abx);
        best = {
          s,
          point: { x: cx, y: cy },
          heading,
          tangent: unitVector(abx, aby)
        };
      }
    }
    return best;
  }

  function collectSegmentObstacles(segment, progress, maxOffset, mode) {
    if (!segment || !segment.polyline || !simObstacles.length) {
      return [];
    }
    const list = [];
    const totalLength = segment.polyline.totalLength;
    const effectiveOffset = Math.max(0, maxOffset || 0);
    for (const obstacle of simObstacles) {
      if (mode && obstacle.mode !== mode) {
        continue;
      }
      const lookahead = OBSTACLE_LOOKAHEAD_M + obstacle.radius + ROBOT_RADIUS_M + effectiveOffset;
      const distToRobot = Math.hypot(obstacle.x - robot.pose.x, obstacle.y - robot.pose.y);
      if (distToRobot > lookahead) {
        continue;
      }
      const projection = projectPointToPolyline(segment.polyline, obstacle);
      if (!projection) {
        continue;
      }
      const normal = { x: -projection.tangent.y, y: projection.tangent.x };
      const signedDist =
        (obstacle.x - projection.point.x) * normal.x +
        (obstacle.y - projection.point.y) * normal.y;
      const required = obstacle.radius + ROBOT_RADIUS_M + OBSTACLE_CLEARANCE_M;
      if (Math.abs(signedDist) > required + effectiveOffset) {
        continue;
      }
      if (Number.isFinite(progress)) {
        const behindLimit = required + OBSTACLE_CLEARANCE_M;
        if (projection.s + behindLimit < progress) {
          continue;
        }
      }
      if (projection.s > totalLength + required) {
        continue;
      }
      list.push({
        obstacle,
        projection,
        signedDist,
        required,
        distToRobot
      });
    }
    list.sort((a, b) => a.distToRobot - b.distToRobot);
    return list;
  }

  function buildAllowedOffsetRanges(obstacles, maxOffset) {
    const forbidden = [];
    for (const info of obstacles) {
      let start = info.signedDist - info.required;
      let end = info.signedDist + info.required;
      if (end < -maxOffset || start > maxOffset) {
        continue;
      }
      start = clamp(start, -maxOffset, maxOffset);
      end = clamp(end, -maxOffset, maxOffset);
      if (start <= end) {
        forbidden.push([start, end]);
      }
    }
    forbidden.sort((a, b) => a[0] - b[0]);
    const allowed = [];
    let cursor = -maxOffset;
    for (const [start, end] of forbidden) {
      if (end <= cursor) {
        continue;
      }
      if (start > cursor) {
        allowed.push([cursor, Math.min(start, maxOffset)]);
      }
      cursor = Math.max(cursor, end);
      if (cursor >= maxOffset) {
        break;
      }
    }
    if (cursor < maxOffset) {
      allowed.push([cursor, maxOffset]);
    }
    return allowed;
  }

  function chooseOffsetFromRanges(ranges, preferred) {
    if (!ranges.length) {
      return null;
    }
    if (Number.isFinite(preferred)) {
      for (const [start, end] of ranges) {
        if (preferred >= start && preferred <= end) {
          return preferred;
        }
      }
    }
    let best = null;
    for (const [start, end] of ranges) {
      let candidate = null;
      if (start <= 0 && end >= 0) {
        candidate = 0;
      } else if (end < 0) {
        candidate = end;
      } else {
        candidate = start;
      }
      if (best === null || Math.abs(candidate) < Math.abs(best)) {
        best = candidate;
      }
    }
    return best;
  }

  function buildAvoidPlan(segment, obstacles, preferredOffset) {
    if (!segment || !segment.polyline || !obstacles || obstacles.length === 0) {
      return null;
    }
    const corridorWidth = Number.isFinite(segment.corridorWidth) ? segment.corridorWidth : 0;
    if (corridorWidth <= 0) {
      return null;
    }
    const maxOffset = corridorWidth / 2 - ROBOT_RADIUS_M - OBSTACLE_CLEARANCE_M;
    if (maxOffset <= 0) {
      return null;
    }
    const allowed = buildAllowedOffsetRanges(obstacles, maxOffset);
    const offset = chooseOffsetFromRanges(allowed, preferredOffset);
    if (!Number.isFinite(offset)) {
      return null;
    }
    let s0 = Number.POSITIVE_INFINITY;
    let s1 = Number.NEGATIVE_INFINITY;
    let maxRequired = 0;
    for (const info of obstacles) {
      const buffer = info.required + OBSTACLE_CLEARANCE_M;
      s0 = Math.min(s0, info.projection.s - buffer);
      s1 = Math.max(s1, info.projection.s + buffer);
      if (info.required > maxRequired) {
        maxRequired = info.required;
      }
    }
    if (!Number.isFinite(s0) || !Number.isFinite(s1) || s0 > s1) {
      return null;
    }
    const totalLength = segment.polyline.totalLength;
    s0 = clamp(s0, 0, totalLength);
    s1 = clamp(s1, 0, totalLength);
    const ramp = clamp(maxRequired * 0.6, 0.4, 1.2);
    const r0 = clamp(s0 - ramp, 0, s0);
    const r1 = clamp(s1 + ramp, s1, totalLength);
    return {
      obstacleIds: obstacles.map((info) => info.obstacle.id),
      offset,
      s0,
      s1,
      r0,
      r1
    };
  }

  function avoidOffsetAtS(plan, s) {
    if (!plan) {
      return 0;
    }
    if (s <= plan.r0 || s >= plan.r1) {
      return 0;
    }
    if (s < plan.s0) {
      const denom = plan.s0 - plan.r0;
      if (denom <= 0) {
        return plan.offset;
      }
      return plan.offset * smoothstep((s - plan.r0) / denom);
    }
    if (s <= plan.s1) {
      return plan.offset;
    }
    const denom = plan.r1 - plan.s1;
    if (denom <= 0) {
      return plan.offset;
    }
    return plan.offset * smoothstep((plan.r1 - s) / denom);
  }

  function segmentPoseAtDistance(segment, distance) {
    const base = polylineAtDistance(segment.polyline, distance);
    const plan = segment.avoidPlan;
    if (!plan) {
      return { x: base.x, y: base.y, heading: base.heading };
    }
    const offset = avoidOffsetAtS(plan, distance);
    if (offset === 0) {
      return { x: base.x, y: base.y, heading: base.heading };
    }
    const normal = { x: -Math.sin(base.heading), y: Math.cos(base.heading) };
    return {
      x: base.x + normal.x * offset,
      y: base.y + normal.y * offset,
      heading: base.heading
    };
  }

  function edgeBlockedByObstacle(edge, obstacle) {
    if (!edge || !edge.polyline) {
      return false;
    }
    const dist = distanceObstacleToPolyline(obstacle, edge.polyline);
    return dist <= obstacle.radius + OBSTACLE_CLEARANCE_M + ROBOT_RADIUS_M;
  }

  function findPathAvoidingObstacles(startId, endId) {
    if (!nodesById.has(startId) || !nodesById.has(endId)) {
      return null;
    }
    if (!simObstacles.length) {
      return findPath(startId, endId);
    }
    if (startId === endId) {
      return [startId];
    }

    const distances = new Map();
    const previous = new Map();
    const visited = new Set();
    for (const nodeId of nodesById.keys()) {
      distances.set(nodeId, Infinity);
    }
    distances.set(startId, 0);

    while (true) {
      let current = null;
      let bestDist = Infinity;
      for (const [nodeId, dist] of distances.entries()) {
        if (visited.has(nodeId)) continue;
        if (dist < bestDist) {
          bestDist = dist;
          current = nodeId;
        }
      }
      if (!current || current === endId) {
        break;
      }
      visited.add(current);
      const neighbors = adjacency.get(current) || [];
      for (const neighbor of neighbors) {
        const edge = edgesByKey.get(`${current}->${neighbor.to}`);
        if (!edge) continue;
        let blocked = false;
        for (const obstacle of simObstacles) {
          if (edgeBlockedByObstacle(edge, obstacle)) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;
        const nextDist = bestDist + neighbor.cost;
        if (nextDist < distances.get(neighbor.to)) {
          distances.set(neighbor.to, nextDist);
          previous.set(neighbor.to, current);
        }
      }
    }

    if (!previous.has(endId) && startId !== endId) {
      return null;
    }
    const path = [endId];
    let cursor = endId;
    while (cursor !== startId) {
      const prev = previous.get(cursor);
      if (!prev) break;
      path.push(prev);
      cursor = prev;
    }
    path.reverse();
    return path;
  }

  function tryAvoidObstacle(task) {
    if (!OBSTACLE_AVOID_ENABLED || !task) {
      return false;
    }
    const currentNodeId = robot.currentStation;
    const currentNode = currentNodeId ? nodesById.get(currentNodeId) : null;
    if (!currentNode || !currentNode.pos) {
      return false;
    }
    const distToNode = Math.hypot(currentNode.pos.x - robot.pose.x, currentNode.pos.y - robot.pose.y);
    if (distToNode > CURRENT_POINT_DIST) {
      return false;
    }
    const targetId = task.targetId;
    if (!targetId || !nodesById.has(targetId)) {
      return false;
    }
    const newPath = findPathAvoidingObstacles(currentNodeId, targetId);
    if (!newPath) {
      return false;
    }
    return rebuildTaskPath(task, newPath);
  }

  function shouldBlockForObstacle(polyline, task, segment) {
    if (segment) {
      const corridorWidth = Number.isFinite(segment.corridorWidth) ? segment.corridorWidth : 0;
      const maxOffset =
        corridorWidth > 0 ? corridorWidth / 2 - ROBOT_RADIUS_M - OBSTACLE_CLEARANCE_M : 0;
      const progress = task && Number.isFinite(task.segmentProgress) ? task.segmentProgress : 0;
      const blockingObstacles = collectSegmentObstacles(segment, progress, maxOffset, 'block');
      if (blockingObstacles.length) {
        if (segment.avoidPlan) {
          segment.avoidPlan = null;
        }
        const blockObstacle = blockingObstacles[0].obstacle;
        setRobotBlockedState(true, {
          reason: BLOCK_REASON_OBSTACLE,
          id: blockObstacle.id,
          x: blockObstacle.x,
          y: blockObstacle.y
        });
        return blockObstacle;
      }
      const avoidObstacles = collectSegmentObstacles(segment, progress, maxOffset, 'avoid');
      if (!avoidObstacles.length) {
        if (segment.avoidPlan) {
          segment.avoidPlan = null;
        }
        if (robot.blocked && robot.blockReason === BLOCK_REASON_OBSTACLE) {
          setRobotBlockedState(false);
        }
        return null;
      }
      if (corridorWidth > 0) {
        const preferredOffset = segment.avoidPlan ? segment.avoidPlan.offset : null;
        const plan = buildAvoidPlan(segment, avoidObstacles, preferredOffset);
        if (plan) {
          segment.avoidPlan = plan;
          if (robot.blocked && robot.blockReason === BLOCK_REASON_OBSTACLE) {
            setRobotBlockedState(false);
          }
          return null;
        }
      }
      const blockObstacle = avoidObstacles[0].obstacle;
      setRobotBlockedState(true, {
        reason: BLOCK_REASON_OBSTACLE,
        id: blockObstacle.id,
        x: blockObstacle.x,
        y: blockObstacle.y
      });
      return blockObstacle;
    }
    const obstacle = findBlockingObstacleOnPolyline(polyline);
    if (!obstacle) {
      if (robot.blocked && robot.blockReason === BLOCK_REASON_OBSTACLE) {
        setRobotBlockedState(false);
      }
      return null;
    }
    if (obstacle.mode === 'avoid' && task && tryAvoidObstacle(task)) {
      if (robot.blocked && robot.blockReason === BLOCK_REASON_OBSTACLE) {
        setRobotBlockedState(false);
      }
      return null;
    }
    setRobotBlockedState(true, {
      reason: BLOCK_REASON_OBSTACLE,
      id: obstacle.id,
      x: obstacle.x,
      y: obstacle.y
    });
    return obstacle;
  }

  return {
    addSimObstacle,
    clearSimObstacles,
    listSimObstacles,
    setRobotBlockedState,
    shouldBlockForObstacle,
    segmentPoseAtDistance
  };
}

module.exports = {
  createObstacleManager
};
