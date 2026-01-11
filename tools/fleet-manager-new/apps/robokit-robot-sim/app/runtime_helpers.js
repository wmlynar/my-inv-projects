const fs = require('fs');

function createRuntimeHelpers(options) {
  const {
    simClock,
    eventLogger,
    diagEnabled,
    robot,
    robotRef,
    graph,
    nodesById,
    edgesByKey,
    findNearestNode,
    findNearestNodeFromIds,
    findPath,
    computeDistancesToTarget,
    createScriptPathState,
    motion,
    constants,
    payloads,
    runtimeRefs
  } = options;

  if (!simClock) {
    throw new Error('runtime_helpers: missing simClock');
  }

  const baseRobot = robot || null;
  const ref = robotRef || null;
  const getRobot = () => (ref ? ref.current : baseRobot);
  const requireRobot = () => {
    const current = getRobot();
    if (!current) {
      throw new Error('runtime_helpers: missing robot');
    }
    return current;
  };

  const refs = runtimeRefs || {};

  const {
    clamp,
    normalizeAngle,
    distancePointToSegmentCoords,
    sampleBezierPoints,
    buildPolyline,
    polylineAtDistance
  } = motion;

  const {
    ROBOT_TIMEZONE_OFFSET,
    APPROACH_MERGE_DIST,
    APPROACH_CONTROL_SCALE,
    APPROACH_TURN_PENALTY,
    APPROACH_REVERSE_PENALTY,
    APPROACH_SAMPLE_STEP,
    SPEED_M_S,
    ARRIVAL_EPS,
    ROTATE_EPS_RAD,
    ROTATE_SPEED_RAD_S,
    CURRENT_POINT_DIST,
    ROBOT_RADIUS_M,
    STATUS_FORCE_CURRENT_STATION,
    STATUS_HIDE_CURRENT_STATION,
    STATUS_HIDE_LAST_STATION,
    STATUS_LAST_STATION_IS_CURRENT,
    START_POSE_X,
    START_POSE_Y,
    START_POSE_ANGLE,
    TICK_MS,
    FORK_MIN_HEIGHT,
    FORK_MAX_HEIGHT
  } = constants;

  const {
    statusAllTemplate,
    robotParamsPayload,
    fileListAssetsPayload,
    fileListModulesPayload,
    mapPropertiesPayload
  } = payloads || {};

  function nowMs() {
    return simClock.now();
  }

  function lockTimeSeconds() {
    return Math.floor(simClock.now() / 1000);
  }

  const diagLog = (event, payload = {}) => {
    if (!diagEnabled) {
      return;
    }
    const name = `diag_${event}`;
    if (eventLogger) {
      eventLogger.log(name, payload);
      return;
    }
    const entry = { ts: nowMs(), event: name, ...payload };
    process.stdout.write(`${JSON.stringify(entry)}\n`);
  };

  function normalizeRemoteAddress(value) {
    if (!value) return '';
    const text = String(value);
    if (text === '::1') return '127.0.0.1';
    if (text.startsWith('::ffff:')) return text.slice(7);
    return text;
  }

  function parseOffsetSpec(value) {
    if (!value) return null;
    const text = String(value).trim();
    if (!text) return null;
    if (text.toUpperCase() === 'Z') {
      return { minutes: 0, style: 'z' };
    }
    const match = text.match(/^([+-])(\d{2}):?(\d{2})$/);
    if (!match) return null;
    const sign = match[1] === '-' ? -1 : 1;
    const hours = Number.parseInt(match[2], 10);
    const mins = Number.parseInt(match[3], 10);
    if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
    const total = sign * (hours * 60 + mins);
    return { minutes: total, style: match[0].includes(':') ? 'colon' : 'compact' };
  }

  function parseOffsetFromTimestamp(value) {
    if (!value) return null;
    const match = String(value).trim().match(/(Z|[+-]\d{2}:?\d{2})$/i);
    if (!match) return null;
    return parseOffsetSpec(match[1]);
  }

  function resolveCreateOnSpec() {
    const envSpec = parseOffsetSpec(ROBOT_TIMEZONE_OFFSET);
    if (envSpec) {
      return envSpec;
    }
    const samples = [
      statusAllTemplate && statusAllTemplate.create_on,
      robotParamsPayload && robotParamsPayload.create_on,
      fileListAssetsPayload && fileListAssetsPayload.create_on,
      fileListModulesPayload && fileListModulesPayload.create_on,
      mapPropertiesPayload && mapPropertiesPayload.create_on
    ];
    for (const sample of samples) {
      const spec = parseOffsetFromTimestamp(sample);
      if (spec) return spec;
    }
    return null;
  }

  const createOnSpec = resolveCreateOnSpec();

  function formatOffsetTimestamp(date, offsetSpec) {
    if (!offsetSpec) {
      return date.toISOString();
    }
    if (offsetSpec.style === 'z') {
      return date.toISOString();
    }
    const offsetMinutes = Number.isFinite(offsetSpec.minutes) ? offsetSpec.minutes : 0;
    const adjusted = new Date(date.getTime() + offsetMinutes * 60 * 1000);
    const pad = (num, size = 2) => String(num).padStart(size, '0');
    const sign = offsetMinutes < 0 ? '-' : '+';
    const absMinutes = Math.abs(offsetMinutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    const suffix =
      offsetSpec.style === 'colon'
        ? `${sign}${pad(hours)}:${pad(mins)}`
        : `${sign}${pad(hours)}${pad(mins)}`;
    return `${adjusted.getUTCFullYear()}-${pad(adjusted.getUTCMonth() + 1)}-${pad(
      adjusted.getUTCDate()
    )}T${pad(adjusted.getUTCHours())}:${pad(adjusted.getUTCMinutes())}:${pad(
      adjusted.getUTCSeconds()
    )}.${pad(adjusted.getUTCMilliseconds(), 3)}${suffix}`;
  }

  function createOn() {
    return formatOffsetTimestamp(new Date(simClock.now()), createOnSpec);
  }

  function readJsonSafe(filePath) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (_err) {
      return null;
    }
  }

  function cloneJson(value) {
    if (!value || typeof value !== 'object') {
      return {};
    }
    return JSON.parse(JSON.stringify(value));
  }

  function cloneGoodsRegion(region) {
    if (!region || typeof region !== 'object') {
      return { name: '', point: [] };
    }
    const points = Array.isArray(region.point)
      ? region.point.map((point) => ({
          x: Number.isFinite(point.x) ? point.x : 0,
          y: Number.isFinite(point.y) ? point.y : 0
        }))
      : [];
    return { name: region.name || '', point: points };
  }

  function approachValue(current, target, accel, decel, dt) {
    if (!Number.isFinite(current)) current = 0;
    if (!Number.isFinite(target)) target = 0;
    if (!Number.isFinite(dt) || dt <= 0) return target;
    if (current === target) return target;
    const delta = target - current;
    const rate = delta > 0 ? accel : decel;
    const step = Math.abs(rate) * dt;
    if (Math.abs(delta) <= step) {
      return target;
    }
    return current + Math.sign(delta) * step;
  }

  function clampForkHeight(height) {
    if (!Number.isFinite(height)) return 0;
    return clamp(height, FORK_MIN_HEIGHT, FORK_MAX_HEIGHT);
  }

  function resolveStartPoseOverride() {
    if (Number.isFinite(START_POSE_X) && Number.isFinite(START_POSE_Y)) {
      return {
        x: START_POSE_X,
        y: START_POSE_Y,
        angle: Number.isFinite(START_POSE_ANGLE) ? START_POSE_ANGLE : 0
      };
    }
    return null;
  }

  function resolveStartPose(entry) {
    if (!entry || !entry.start_pos) {
      return null;
    }
    const pos = entry.start_pos;
    if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
      return null;
    }
    return {
      x: pos.x,
      y: pos.y,
      angle: Number.isFinite(pos.angle) ? pos.angle : 0
    };
  }

  function resolveStartNode(preferredId, entry, poseOverride, poseHint) {
    const fromConfig =
      entry &&
      (entry.start_station ||
        entry.start_point ||
        entry.start_node ||
        entry.start_action_point ||
        entry.start_location);
    if (preferredId && nodesById.has(preferredId)) {
      return preferredId;
    }
    if (poseOverride) {
      const nearest = findNearestNode(poseOverride.x, poseOverride.y);
      if (nearest) {
        return nearest.id;
      }
    }
    if (fromConfig && nodesById.has(fromConfig)) {
      return fromConfig;
    }
    if (poseHint) {
      const nearest = findNearestNode(poseHint.x, poseHint.y);
      if (nearest) {
        return nearest.id;
      }
    }
    const chargePoint = (graph.nodes || []).find(
      (node) => node.className === 'ChargePoint' && nodesById.has(node.id)
    );
    if (chargePoint) {
      return chargePoint.id;
    }
    const parkPoint = (graph.nodes || []).find(
      (node) => node.className === 'ParkPoint' && nodesById.has(node.id)
    );
    if (parkPoint) {
      return parkPoint.id;
    }
    const actionPoint = (graph.nodes || []).find(
      (node) => node.className === 'ActionPoint' && nodesById.has(node.id)
    );
    if (actionPoint) {
      return actionPoint.id;
    }
    const firstId = nodesById.keys().next().value;
    if (!firstId) {
      throw new Error('graph has no nodes');
    }
    return firstId;
  }

  function distancePointToPolylinePoints(x, y, points) {
    if (!points || points.length < 2) {
      return Number.POSITIVE_INFINITY;
    }
    let best = Number.POSITIVE_INFINITY;
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      const dist = distancePointToSegmentCoords(x, y, a.x, a.y, b.x, b.y);
      if (dist < best) {
        best = dist;
      }
    }
    return best;
  }

  function findPolylineProgress(polyline, x, y) {
    if (!polyline || !Array.isArray(polyline.points) || polyline.points.length < 2) {
      return { progress: 0, dist: Number.POSITIVE_INFINITY };
    }
    const points = polyline.points;
    const lengths = polyline.lengths || [];
    let bestDist = Number.POSITIVE_INFINITY;
    let bestProgress = 0;
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const abLenSq = abx * abx + aby * aby;
      const t = abLenSq > 0 ? Math.max(0, Math.min(((x - a.x) * abx + (y - a.y) * aby) / abLenSq, 1)) : 0;
      const cx = a.x + abx * t;
      const cy = a.y + aby * t;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist < bestDist) {
        const base = lengths[i] || 0;
        const segLen = lengths[i + 1] !== undefined ? lengths[i + 1] - base : Math.hypot(abx, aby);
        bestDist = dist;
        bestProgress = base + segLen * t;
      }
    }
    return { progress: bestProgress, dist: bestDist };
  }

  function distanceToTaskPath(task, x, y) {
    if (!task || !Array.isArray(task.segments) || task.segments.length === 0) {
      return Number.POSITIVE_INFINITY;
    }
    let best = Number.POSITIVE_INFINITY;
    for (const segment of task.segments) {
      if (!segment || !segment.polyline || !Array.isArray(segment.polyline.points)) {
        continue;
      }
      const dist = distancePointToPolylinePoints(x, y, segment.polyline.points);
      if (dist < best) {
        best = dist;
      }
    }
    return best;
  }

  function getRouteNodeIds(task) {
    if (!task || !Array.isArray(task.pathNodes) || task.pathNodes.length === 0) {
      return null;
    }
    return new Set(task.pathNodes);
  }

  function getReportedCurrentStation() {
    const robot = requireRobot();
    if (STATUS_FORCE_CURRENT_STATION) {
      return STATUS_FORCE_CURRENT_STATION;
    }
    if (STATUS_HIDE_CURRENT_STATION) {
      robot.reportedStationId = '';
      return '';
    }
    if (robot.currentTask && robot.currentTask.approach && robot.currentTask.approach.active) {
      robot.reportedStationId = '';
      return '';
    }
    const manualMode = robot.manual.active;
    if (manualMode && refs.isStopped && !refs.isStopped()) {
      robot.reportedStationId = '';
      return '';
    }

    const enterDist = CURRENT_POINT_DIST;
    const exitDist = Math.max(CURRENT_POINT_DIST * 1.5, enterDist);
    const offRouteDist = Math.max(CURRENT_POINT_DIST * 3, ROBOT_RADIUS_M);

    const task = robot.currentTask;
    const routeNodeIds = !manualMode ? getRouteNodeIds(task) : null;
    const hasRoute = routeNodeIds && routeNodeIds.size > 0;
    const hasSegments = Boolean(task && Array.isArray(task.segments) && task.segments.length > 0);
    const offRoute = hasRoute && hasSegments
      ? distanceToTaskPath(task, robot.pose.x, robot.pose.y) > offRouteDist
      : false;
    const candidateSet = hasRoute && !offRoute ? routeNodeIds : null;

    const candidate = findNearestNodeFromIds(robot.pose.x, robot.pose.y, candidateSet);
    const candidateId = candidate.node ? candidate.node.id : '';
    const candidateDist = candidate.dist;

    let reported = '';
    const lastId = robot.reportedStationId;
    if (lastId) {
      const lastNode = nodesById.get(lastId);
      const lastAllowed = !candidateSet || candidateSet.has(lastId);
      if (lastNode && lastAllowed) {
        const distToLast = Math.hypot(lastNode.pos.x - robot.pose.x, lastNode.pos.y - robot.pose.y);
        if (distToLast <= exitDist) {
          reported = lastId;
        }
      }
    }
    if (!reported && candidateId && candidateDist <= enterDist) {
      reported = candidateId;
    }

    robot.reportedStationId = reported || '';
    return reported;
  }

  function getReportedLastStation(currentStation) {
    const robot = requireRobot();
    if (STATUS_HIDE_LAST_STATION) {
      return '';
    }
    if (STATUS_LAST_STATION_IS_CURRENT && currentStation) {
      return currentStation;
    }
    return robot.lastStation || '';
  }

  function buildApproachCurvePoints(entryPose, entryHeading) {
    const robot = requireRobot();
    const start = { x: robot.pose.x, y: robot.pose.y };
    const end = { x: entryPose.x, y: entryPose.y };
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    if (!Number.isFinite(distance)) {
      return null;
    }
    if (distance <= 1e-4) {
      return [start, end];
    }
    const controlScale = Number.isFinite(APPROACH_CONTROL_SCALE) ? APPROACH_CONTROL_SCALE : 0.5;
    const baseMin = Math.max(0.2, Math.max(0, APPROACH_MERGE_DIST) * 0.5);
    const baseMax = Math.max(baseMin, Math.max(0, APPROACH_MERGE_DIST) * 2.5);
    const controlDist = clamp(distance * controlScale, baseMin, baseMax);
    const headingToEntry = Math.atan2(end.y - start.y, end.x - start.x);
    const startDir = { x: Math.cos(headingToEntry), y: Math.sin(headingToEntry) };
    const endDir = { x: Math.cos(entryHeading), y: Math.sin(entryHeading) };
    const p1 = { x: start.x + startDir.x * controlDist, y: start.y + startDir.y * controlDist };
    const p2 = { x: end.x - endDir.x * controlDist, y: end.y - endDir.y * controlDist };
    const step = Math.max(0.05, Number.isFinite(APPROACH_SAMPLE_STEP) ? APPROACH_SAMPLE_STEP : 0.2);
    const samples = clamp(Math.ceil(distance / step), 8, 40);
    return sampleBezierPoints(start, p1, p2, end, samples);
  }

  function scoreApproach(entryPose, entryDist, remaining, distToTarget, headingToEntry) {
    const robot = requireRobot();
    const approachAngle = Math.abs(normalizeAngle(headingToEntry - robot.pose.angle));
    const edgeAngle = Math.abs(normalizeAngle(entryPose.heading - robot.pose.angle));
    let penalty = approachAngle * (Number.isFinite(APPROACH_TURN_PENALTY) ? APPROACH_TURN_PENALTY : 0);
    penalty += edgeAngle * (Number.isFinite(APPROACH_TURN_PENALTY) ? APPROACH_TURN_PENALTY * 0.35 : 0);
    if (approachAngle > Math.PI / 2) {
      penalty += Number.isFinite(APPROACH_REVERSE_PENALTY) ? APPROACH_REVERSE_PENALTY : 0;
    }
    return entryDist + remaining + distToTarget + penalty;
  }

  function findBestApproach(targetId) {
    const robot = requireRobot();
    const distToTarget = computeDistancesToTarget(targetId);
    const mergeDist = Math.max(0, Number.isFinite(APPROACH_MERGE_DIST) ? APPROACH_MERGE_DIST : 0);
    let best = null;

    for (const edge of edgesByKey.values()) {
      const distFromEnd = distToTarget.get(edge.endId);
      if (!Number.isFinite(distFromEnd)) {
        continue;
      }
      const snap = findPolylineProgress(edge.polyline, robot.pose.x, robot.pose.y);
      const entryProgress = clamp(snap.progress + mergeDist, 0, edge.polyline.totalLength);
      const entryPose = polylineAtDistance(edge.polyline, entryProgress);
      const entryDist = Math.hypot(entryPose.x - robot.pose.x, entryPose.y - robot.pose.y);
      const remaining = edge.polyline.totalLength - entryProgress;
      const headingToEntry = Math.atan2(entryPose.y - robot.pose.y, entryPose.x - robot.pose.x);
      const cost = scoreApproach(entryPose, entryDist, remaining, distFromEnd, headingToEntry);
      if (!best || cost < best.cost) {
        best = {
          cost,
          entryPose,
          entryHeading: entryPose.heading,
          entryProgress,
          entryDist,
          edgeStartId: edge.startId,
          edgeEndId: edge.endId
        };
      }
    }

    if (best) {
      return best;
    }

    for (const [nodeId, distFromNode] of distToTarget.entries()) {
      if (!Number.isFinite(distFromNode)) {
        continue;
      }
      const node = nodesById.get(nodeId);
      if (!node || !node.pos) {
        continue;
      }
      const entryPose = { x: node.pos.x, y: node.pos.y, heading: 0 };
      const entryDist = Math.hypot(entryPose.x - robot.pose.x, entryPose.y - robot.pose.y);
      const headingToEntry = Math.atan2(entryPose.y - robot.pose.y, entryPose.x - robot.pose.x);
      entryPose.heading = headingToEntry;
      const cost = scoreApproach(entryPose, entryDist, 0, distFromNode, headingToEntry);
      if (!best || cost < best.cost) {
        best = {
          cost,
          entryPose,
          entryHeading: entryPose.heading,
          entryProgress: 0,
          entryDist,
          edgeStartId: nodeId,
          edgeEndId: nodeId
        };
      }
    }

    return best;
  }

  function startScriptPath(points, targetAngle, maxSpeed) {
    const robot = requireRobot();
    if (!Array.isArray(points) || points.length < 2) {
      diagLog('script_start_failed', {
        reason: 'invalid_points',
        pointsCount: Array.isArray(points) ? points.length : 0
      });
      return false;
    }
    const polyline = buildPolyline(points);
    let sp = robot.scriptPath;
    if (!sp) {
      sp = createScriptPathState();
      robot.scriptPath = sp;
    }
    sp.plan = { polyline, targetAngle };
    sp.active = true;
    sp.done = false;
    sp.progress = 0;
    sp.mode = 'move';
    sp.reachDist = ARRIVAL_EPS;
    sp.reachAngle = ROTATE_EPS_RAD;
    sp.maxSpeed = Number.isFinite(maxSpeed) ? maxSpeed : SPEED_M_S;
    sp.maxRot = ROTATE_SPEED_RAD_S;
    sp.backMode = false;
    sp.useOdo = false;
    sp.holdDir = 999;
    sp.targetAngle = Number.isFinite(targetAngle) ? targetAngle : null;
    sp.startHeading = Number.isFinite(targetAngle) ? targetAngle : robot.pose.angle;
    diagLog('script_start', {
      pointsCount: points.length,
      totalLength: polyline.totalLength,
      targetAngle: sp.targetAngle,
      maxSpeed: sp.maxSpeed,
      pose: { x: robot.pose.x, y: robot.pose.y, angle: robot.pose.angle }
    });
    return true;
  }

  function startApproachToTarget(targetId, taskType, targetPoint, options = null) {
    const robot = requireRobot();
    diagLog('approach_request', {
      targetId,
      taskType: taskType || 0,
      pose: { x: robot.pose.x, y: robot.pose.y, angle: robot.pose.angle },
      hasPathNodes: Boolean(options && Array.isArray(options.pathNodes) && options.pathNodes.length >= 2)
    });
    const hasPathNodes = options && Array.isArray(options.pathNodes) && options.pathNodes.length >= 2;
    let approach = null;
    let pathNodes = null;
    let entryProgress = Number.isFinite(options && options.entryProgress) ? options.entryProgress : null;
    let entryStartId = options && options.entryStartId ? options.entryStartId : null;
    let entryEndId = options && options.entryEndId ? options.entryEndId : null;

    if (hasPathNodes) {
      pathNodes = options.pathNodes;
    } else {
      approach = findBestApproach(targetId);
      if (!approach) {
        diagLog('approach_failed', { reason: 'no_approach', targetId });
        return { ok: false, error: 'path_not_found' };
      }
      if (approach.edgeStartId && approach.edgeEndId && approach.edgeStartId !== approach.edgeEndId) {
        const fromEntry = findPath(approach.edgeEndId, targetId);
        if (fromEntry && fromEntry.length > 0) {
          pathNodes = [approach.edgeStartId, ...fromEntry];
        }
      }
      if (!pathNodes) {
        pathNodes = findPath(approach.edgeStartId, targetId);
      }
      if (!pathNodes) {
        diagLog('approach_failed', { reason: 'path_not_found', targetId, entryStartId: approach.edgeStartId });
        return { ok: false, error: 'path_not_found' };
      }
      if (!Number.isFinite(entryProgress)) {
        entryProgress = approach.entryProgress;
      }
      if (!entryStartId) {
        entryStartId = approach.edgeStartId;
      }
      if (!entryEndId) {
        entryEndId = approach.edgeEndId;
      }
    }

    const taskBuilder = refs.createTaskWithPath;
    if (typeof taskBuilder !== 'function') {
      return { ok: false, error: 'task_builder_missing' };
    }
    const task = taskBuilder(pathNodes, targetId, taskType, targetPoint);
    if (task && robot.currentStation && nodesById.has(robot.currentStation)) {
      if (task.pathNodes && task.pathNodes[0] !== robot.currentStation) {
        task.reportedPathNodes = [robot.currentStation, ...task.pathNodes];
      }
    }

    let entryPose = approach ? approach.entryPose : null;
    let entryHeading = approach ? approach.entryHeading : null;
    if (task && Array.isArray(task.segments) && task.segments.length > 0) {
      const segment = task.segments[0];
      if (!Number.isFinite(entryProgress)) {
        const snap = findPolylineProgress(segment.polyline, robot.pose.x, robot.pose.y);
        entryProgress = snap.progress;
      }
      entryProgress = clamp(entryProgress, 0, segment.totalLength);
      const segmentPose = refs.segmentPoseAtDistance;
      const entryState = segmentPose
        ? segmentPose(segment, entryProgress)
        : { x: robot.pose.x, y: robot.pose.y, heading: robot.pose.angle };
      entryPose = entryState;
      entryHeading = entryState.heading;
      task.segmentProgress = entryProgress;
      task.segmentMode = 'move';
      if (!entryStartId) {
        entryStartId = segment.startId;
      }
      if (!entryEndId) {
        entryEndId = segment.endId;
      }
    }

    if (!entryPose || !Number.isFinite(entryHeading)) {
      diagLog('approach_failed', { reason: 'invalid_entry_pose', targetId });
      return { ok: false, error: 'path_not_found' };
    }
    const curvePoints = buildApproachCurvePoints(entryPose, entryHeading);
    if (!curvePoints || curvePoints.length < 2) {
      diagLog('approach_failed', {
        reason: 'invalid_curve',
        targetId,
        curvePoints: curvePoints ? curvePoints.length : 0
      });
      return { ok: false, error: 'path_not_found' };
    }
    startScriptPath(curvePoints, entryHeading, SPEED_M_S * 0.8);
    if (robot.scriptPath) {
      robot.scriptPath.kind = 'approach';
    }
    if (task) {
      task.approach = {
        active: true,
        entryProgress,
        entryStartId: entryStartId || null,
        entryEndId: entryEndId || null
      };
    }
    diagLog('approach_start', {
      targetId,
      taskId: task ? task.id : '',
      entryStartId: entryStartId || null,
      entryEndId: entryEndId || null,
      entryProgress,
      entryPose: entryPose ? { x: entryPose.x, y: entryPose.y, heading: entryPose.heading } : null,
      pathNodes,
      curvePoints: curvePoints.length
    });
    return { ok: true, task };
  }

  function getReportedPose() {
    const robot = requireRobot();
    const basePose = robot.pose || { x: 0, y: 0, angle: 0 };
    return { x: basePose.x, y: basePose.y, angle: basePose.angle };
  }

  return {
    nowMs,
    lockTimeSeconds,
    diagLog,
    normalizeRemoteAddress,
    createOn,
    readJsonSafe,
    cloneJson,
    cloneGoodsRegion,
    approachValue,
    clampForkHeight,
    resolveStartPoseOverride,
    resolveStartPose,
    resolveStartNode,
    getReportedCurrentStation,
    getReportedLastStation,
    startApproachToTarget,
    getReportedPose,
    formatOffsetTimestamp
  };
}

module.exports = {
  createRuntimeHelpers
};
