function createTaskEngine(deps) {
  const {
    robot,
    nodesById,
    edgesByKey,
    nowMs,
    resetVelocity,
    setChargeTarget,
    buildErrorResponse,
    buildBaseResponse,
    startApproachToTarget,
    findPath,
    findNearestNode,
    distancePointToSegmentCoords,
    buildPolyline,
    currentPointDist,
    maxTaskNodes,
    getForkOperation,
    handleForkOperation,
    nextTaskId,
    diagLog
  } = deps;
  const logDiag = typeof diagLog === 'function' ? diagLog : null;
  const emitDiag = (event, payload) => {
    if (logDiag) {
      logDiag(event, payload);
    }
  };

  function getReportedPathNodes(task) {
    if (!task) {
      return [];
    }
    if (Array.isArray(task.reportedPathNodes) && task.reportedPathNodes.length > 0) {
      return task.reportedPathNodes;
    }
    return Array.isArray(task.pathNodes) ? task.pathNodes : [];
  }

  function getReportedPathIndex(task) {
    if (!task) {
      return 0;
    }
    const baseIndex = Number.isFinite(task.pathIndex) ? task.pathIndex : 0;
    const baseNodes = Array.isArray(task.pathNodes) ? task.pathNodes : [];
    const reportNodes = getReportedPathNodes(task);
    const offset = reportNodes.length - baseNodes.length;
    if (offset > 0) {
      return Math.max(0, baseIndex - offset);
    }
    return baseIndex;
  }

  function snapshotTask(task) {
    if (!task) {
      return null;
    }
    return {
      id: task.id,
      target_id: task.targetId,
      target_point: task.targetPoint || null,
      task_type: task.taskType || 0,
      path_nodes: getReportedPathNodes(task),
      visited_nodes: task.visitedNodes,
      started_at: task.startedAt,
      completed_at: task.completedAt || null
    };
  }

  function currentTaskSnapshot() {
    return snapshotTask(robot.currentTask) || snapshotTask(robot.lastTask);
  }

  function getTaskPaths(task) {
    if (!task) {
      return { finished: [], unfinished: [] };
    }
    if (task.approach && task.approach.active) {
      return { finished: [], unfinished: [] };
    }
    const finished = Array.isArray(task.visitedNodes) ? task.visitedNodes : [];
    const pathNodes = getReportedPathNodes(task);
    const nextIndex = getReportedPathIndex(task);
    const unfinished = pathNodes.slice(nextIndex);
    return { finished, unfinished };
  }

  function buildFallbackPolyline(startId, endId) {
    const startNode = nodesById.get(startId);
    const endNode = nodesById.get(endId);
    if (!startNode || !endNode) {
      return null;
    }
    const points = [
      { x: startNode.pos.x, y: startNode.pos.y },
      { x: endNode.pos.x, y: endNode.pos.y }
    ];
    return buildPolyline(points);
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

  function buildTaskSegments(pathNodes) {
    const segments = [];
    for (let i = 0; i < pathNodes.length - 1; i += 1) {
      const startId = pathNodes[i];
      const endId = pathNodes[i + 1];
      const edge = edgesByKey.get(`${startId}->${endId}`);
      const polyline = edge ? edge.polyline : buildFallbackPolyline(startId, endId);
      if (!polyline) {
        continue;
      }
      const width = edge && Number.isFinite(Number(edge.width)) ? Number(edge.width) : 0;
      segments.push({
        startId,
        endId,
        polyline,
        totalLength: polyline.totalLength,
        startHeading: polyline.headings[0] || 0,
        driveBackward: edge ? Boolean(edge.driveBackward) : false,
        corridorWidth: width,
        avoidPlan: null
      });
    }
    return segments;
  }

  function rebuildTaskPath(task, pathNodes) {
    if (!task || !Array.isArray(pathNodes) || pathNodes.length === 0) {
      return false;
    }
    task.pathNodes = pathNodes;
    task.pathIndex = pathNodes.length > 1 ? 1 : pathNodes.length;
    task.segments = buildTaskSegments(pathNodes);
    task.segmentIndex = 0;
    task.segmentProgress = 0;
    task.segmentMode = task.segments.length > 0 ? 'rotate' : 'idle';
    task.visitedNodes = [];
    task.targetId = pathNodes[pathNodes.length - 1];
    const targetNode = nodesById.get(task.targetId);
    task.targetPoint = targetNode ? { x: targetNode.pos.x, y: targetNode.pos.y, angle: 0 } : null;
    return true;
  }

  function createTaskWithPath(pathNodes, targetId, taskType, targetPoint) {
    const segments = buildTaskSegments(pathNodes);
    const task = {
      id: `move-${nextTaskId()}`,
      targetId,
      targetPoint: targetPoint || null,
      taskType: taskType || 0,
      pathNodes,
      pathIndex: pathNodes.length > 1 ? 1 : pathNodes.length,
      visitedNodes: [],
      segments,
      segmentIndex: 0,
      segmentProgress: 0,
      segmentMode: segments.length > 0 ? 'rotate' : 'idle',
      startedAt: nowMs(),
      completedAt: null
    };
    robot.currentTask = task;
    robot.taskType = task.taskType;
    robot.taskStatus = pathNodes.length > 1 ? 2 : 4;
    robot.manual.active = false;
    robot.paused = false;
    if (robot.scriptPath) {
      robot.scriptPath.active = false;
      robot.scriptPath.done = false;
    }
    setChargeTarget(targetId);
    if (segments.length > 0) {
      const snap = findPolylineProgress(segments[0].polyline, robot.pose.x, robot.pose.y);
      if (snap.dist <= currentPointDist * 2) {
        task.segmentProgress = Math.min(snap.progress, segments[0].totalLength);
      }
    }

    if (pathNodes.length <= 1 || segments.length === 0) {
      task.completedAt = nowMs();
      robot.taskStatus = 4;
      robot.lastTask = task;
      robot.currentTask = null;
    }
    return task;
  }

  function startMoveToNode(targetId, taskType, targetPointOverride) {
    const targetNode = nodesById.get(targetId);
    const targetPoint =
      targetPointOverride || (targetNode ? { x: targetNode.pos.x, y: targetNode.pos.y, angle: 0 } : null);
    emitDiag('nav_start', {
      targetId,
      currentStation: robot.currentStation || '',
      taskType: taskType || 0,
      pose: { x: robot.pose.x, y: robot.pose.y, angle: robot.pose.angle }
    });
    const pathNodes = findPath(robot.currentStation, targetId);
    if (!pathNodes) {
      emitDiag('nav_no_path', {
        targetId,
        currentStation: robot.currentStation || '',
        pose: { x: robot.pose.x, y: robot.pose.y, angle: robot.pose.angle }
      });
      const fallback = startApproachToTarget(targetId, taskType, targetPoint);
      if (fallback.ok) {
        emitDiag('nav_fallback_approach', {
          targetId,
          taskId: fallback.task ? fallback.task.id : ''
        });
        return fallback;
      }
      return { ok: false, error: 'path_not_found' };
    }
    if (Array.isArray(pathNodes) && pathNodes.length >= 2) {
      const segments = buildTaskSegments(pathNodes);
      if (segments.length > 0) {
        const snap = findPolylineProgress(segments[0].polyline, robot.pose.x, robot.pose.y);
        const triggerDist = Math.max(currentPointDist * 2, 0.5);
        if (Number.isFinite(snap.dist) && snap.dist > triggerDist) {
          emitDiag('nav_far_from_path', {
            targetId,
            currentStation: robot.currentStation || '',
            snapDist: snap.dist,
            triggerDist,
            entryProgress: snap.progress,
            entryStartId: segments[0].startId,
            entryEndId: segments[0].endId,
            pathNodes
          });
          const fallback = startApproachToTarget(targetId, taskType, targetPoint, {
            pathNodes,
            entryProgress: snap.progress,
            entryStartId: segments[0].startId,
            entryEndId: segments[0].endId
          });
          if (fallback.ok) {
            emitDiag('nav_fallback_approach', {
              targetId,
              taskId: fallback.task ? fallback.task.id : ''
            });
            return fallback;
          }
        }
      }
    }
    emitDiag('nav_path', {
      targetId,
      pathNodes
    });
    const task = createTaskWithPath(pathNodes, targetId, taskType, targetPoint);
    return { ok: true, task };
  }

  function startMoveToPoint(x, y, angle) {
    const node = findNearestNode(x, y);
    if (!node) {
      return { ok: false, error: 'target_not_found' };
    }
    const targetPoint = { x, y, angle: angle || 0 };
    return startMoveToNode(node.id, 1, targetPoint);
  }

  function normalizeStationId(value) {
    if (!value) {
      return null;
    }
    const text = String(value);
    if (text.toUpperCase() === 'SELF_POSITION') {
      return robot.currentStation || null;
    }
    return text;
  }

  function extractTaskTargetId(entry) {
    if (!entry) {
      return null;
    }
    if (typeof entry === 'string' || typeof entry === 'number') {
      return entry;
    }
    return (
      entry.id ||
      entry.dest_id ||
      entry.target_id ||
      entry.station_id ||
      entry.location ||
      entry.target ||
      entry.station ||
      entry.point ||
      entry.node ||
      entry.name ||
      null
    );
  }

  function extractTaskSourceId(entry) {
    if (!entry || typeof entry !== 'object') {
      return null;
    }
    return (
      entry.source_id ||
      entry.sourceId ||
      entry.start_id ||
      entry.startId ||
      entry.from_id ||
      entry.from ||
      entry.source ||
      null
    );
  }

  function normalizeTaskListPayload(payload) {
    if (!payload) {
      return null;
    }
    if (Array.isArray(payload)) {
      return payload;
    }
    if (typeof payload !== 'object') {
      return null;
    }
    const list =
      payload.move_task_list ||
      payload.tasks ||
      payload.task_list ||
      payload.taskList ||
      payload.blocks ||
      payload.block_list ||
      payload.targets ||
      payload.target_list ||
      payload.targetList ||
      payload.points ||
      payload.stations ||
      payload.list ||
      null;
    return Array.isArray(list) ? list : null;
  }

  function shouldAppendTask(payload) {
    if (!payload || typeof payload !== 'object') {
      return Boolean(robot.currentTask);
    }
    if (payload.append === true) {
      return true;
    }
    if (payload.append === false || payload.replace === true) {
      return false;
    }
    const mode = String(payload.mode || payload.append_mode || payload.task_mode || '').toLowerCase();
    if (['replace', 'reset', 'overwrite'].includes(mode)) {
      return false;
    }
    if (['append', 'queue', 'enqueue', 'add'].includes(mode)) {
      return true;
    }
    return Boolean(robot.currentTask);
  }

  function buildExplicitPath(taskList, options = {}) {
    const baseSource = options.startNode || null;
    const pathNodes = [];
    let lastNode = null;
    for (const entry of taskList) {
      if (!entry) {
        continue;
      }
      const rawTarget = extractTaskTargetId(entry);
      if (!rawTarget) {
        return { ok: false, error: 'invalid_target' };
      }
      const rawSource = extractTaskSourceId(entry);
      const normalizedSource = normalizeStationId(rawSource);
      if (pathNodes.length === 0 && baseSource && normalizedSource && normalizedSource !== baseSource) {
        return { ok: false, error: 'path_disconnected' };
      }
      const source = normalizeStationId(
        normalizedSource ||
          lastNode ||
          pathNodes[pathNodes.length - 1] ||
          baseSource ||
          robot.currentStation
      );
      const dest = normalizeStationId(rawTarget);
      if (!source || !dest) {
        return { ok: false, error: 'invalid_target' };
      }
      if (pathNodes.length === 0) {
        pathNodes.push(source);
      } else if (pathNodes[pathNodes.length - 1] !== source) {
        return { ok: false, error: 'path_disconnected' };
      }
      if (!edgesByKey.has(`${source}->${dest}`)) {
        return { ok: false, error: 'edge_not_found' };
      }
      pathNodes.push(dest);
      lastNode = dest;
    }
    if (pathNodes.length < 2) {
      return { ok: false, error: 'empty_task_list' };
    }
    if (baseSource && pathNodes[0] !== baseSource) {
      return { ok: false, error: 'path_disconnected' };
    }
    return { ok: true, pathNodes };
  }

  function collectTargets(taskList) {
    const targets = [];
    for (const entry of taskList) {
      const dest = normalizeStationId(extractTaskTargetId(entry));
      if (!dest || !nodesById.has(dest)) {
        return { ok: false, error: 'invalid_target' };
      }
      targets.push(dest);
    }
    if (!targets.length) {
      return { ok: false, error: 'empty_task_list' };
    }
    return { ok: true, targets };
  }

  function buildPathFromTargets(targets, startNode) {
    const combined = [];
    let current = startNode || robot.currentStation;
    for (const dest of targets) {
      const path = findPath(current, dest);
      if (!path) {
        return { ok: false, error: 'path_not_found' };
      }
      if (combined.length > 0) {
        combined.pop();
      }
      combined.push(...path);
      current = dest;
    }
    if (combined.length < 2) {
      return { ok: false, error: 'empty_task_list' };
    }
    return { ok: true, pathNodes: combined, targetId: current };
  }

  function appendTaskPath(task, pathNodes, targets) {
    if (!task) {
      return { ok: false, error: 'no_active_task' };
    }
    if (!Array.isArray(pathNodes) || pathNodes.length < 2) {
      return { ok: false, error: 'empty_task_list' };
    }
    const currentEnd = task.pathNodes && task.pathNodes.length ? task.pathNodes[task.pathNodes.length - 1] : null;
    if (!currentEnd) {
      return { ok: false, error: 'path_disconnected' };
    }
    let appendNodes = pathNodes;
    if (appendNodes[0] === currentEnd) {
      appendNodes = appendNodes.slice(1);
    } else {
      return { ok: false, error: 'path_disconnected' };
    }
    if (appendNodes.length === 0) {
      return { ok: true, task };
    }
    const segmentNodes = [currentEnd, ...appendNodes];
    const newSegments = buildTaskSegments(segmentNodes);
    if (newSegments.length !== segmentNodes.length - 1) {
      return { ok: false, error: 'path_not_found' };
    }
    task.pathNodes.push(...appendNodes);
    task.segments.push(...newSegments);
    const targetId = task.pathNodes[task.pathNodes.length - 1];
    task.targetId = targetId;
    const targetNode = nodesById.get(targetId);
    if (targetNode && targetNode.pos) {
      task.targetPoint = { x: targetNode.pos.x, y: targetNode.pos.y, angle: 0 };
    }
    setChargeTarget(targetId);
    if (Array.isArray(targets) && targets.length) {
      if (!Array.isArray(task.multiTargets)) {
        task.multiTargets = [];
      }
      task.multiTargets.push(...targets);
    }
    return { ok: true, task };
  }

  function startMultiStationTask(payload) {
    const list = normalizeTaskListPayload(payload);
    if (!Array.isArray(list) || list.length === 0) {
      return { ok: false, error: 'empty_task_list' };
    }
    if (maxTaskNodes && list.length > maxTaskNodes) {
      return { ok: false, error: 'task_list_too_large' };
    }

    const hasExplicitSource = list.some((entry) => Boolean(extractTaskSourceId(entry)));
    const append = shouldAppendTask(payload);
    const currentTask = append ? robot.currentTask : null;
    const startNode =
      currentTask && Array.isArray(currentTask.pathNodes) && currentTask.pathNodes.length
        ? currentTask.pathNodes[currentTask.pathNodes.length - 1]
        : null;
    const appendTask = Boolean(currentTask && startNode);

    if (hasExplicitSource) {
      const explicit = buildExplicitPath(list, { startNode });
      if (!explicit.ok) {
        return { ok: false, error: explicit.error };
      }
      const targets = collectTargets(list);
      if (!targets.ok) {
        return { ok: false, error: targets.error };
      }
      if (appendTask) {
        return appendTaskPath(currentTask, explicit.pathNodes, targets.targets);
      }
      const finalTarget = explicit.pathNodes[explicit.pathNodes.length - 1];
      const task = createTaskWithPath(explicit.pathNodes, finalTarget, 3, null);
      task.multiTargets = targets.targets;
      return { ok: true, task };
    }

    const targets = collectTargets(list);
    if (!targets.ok) {
      return { ok: false, error: targets.error };
    }
    const pathResult = buildPathFromTargets(targets.targets, (appendTask && startNode) || robot.currentStation);
    if (!pathResult.ok) {
      return { ok: false, error: pathResult.error };
    }
    if (appendTask) {
      return appendTaskPath(currentTask, pathResult.pathNodes, targets.targets);
    }
    const task = createTaskWithPath(pathResult.pathNodes, pathResult.targetId, 3, null);
    task.multiTargets = targets.targets;
    return { ok: true, task };
  }

  function clearTaskState(status) {
    const hadTask = Boolean(robot.currentTask);
    if (hadTask) {
      robot.lastTask = { ...robot.currentTask, completedAt: nowMs() };
    }
    robot.currentTask = null;
    robot.taskStatus = hadTask ? status : 0;
    robot.taskType = 0;
    robot.paused = false;
    if (robot.scriptPath) {
      robot.scriptPath.active = false;
    }
    emitDiag('task_cleared', {
      hadTask,
      status,
      taskId: hadTask && robot.lastTask ? robot.lastTask.id : ''
    });
    setChargeTarget(null);
    resetVelocity();
  }

  function handleGoTarget(payload) {
    const forkOperation = getForkOperation ? getForkOperation(payload) : null;
    if (forkOperation && handleForkOperation) {
      return handleForkOperation(payload, forkOperation);
    }
    const targetId = (payload && (payload.id || payload.target_id || payload.target)) || null;
    if (!targetId) {
      return buildErrorResponse('invalid_target');
    }
    if (!nodesById.has(targetId)) {
      return buildErrorResponse('invalid_target');
    }

    const result = startMoveToNode(targetId, 3);
    if (!result.ok) {
      return buildErrorResponse(result.error);
    }

    return buildBaseResponse({
      task_id: result.task.id,
      target_id: targetId,
      path_nodes: getReportedPathNodes(result.task)
    });
  }

  function handleGoPoint(payload) {
    const x = payload && Number.isFinite(payload.x) ? payload.x : null;
    const y = payload && Number.isFinite(payload.y) ? payload.y : null;
    const angle = payload && Number.isFinite(payload.angle) ? payload.angle : 0;
    if (x === null || y === null) {
      return buildErrorResponse('invalid_target');
    }

    const result = startMoveToPoint(x, y, angle);
    if (!result.ok) {
      return buildErrorResponse(result.error);
    }

    return buildBaseResponse({
      task_id: result.task.id,
      target_id: result.task.targetId,
      path_nodes: getReportedPathNodes(result.task)
    });
  }

  function handleMultiStation(payload) {
    const result = startMultiStationTask(payload || []);
    if (!result.ok) {
      return buildErrorResponse(result.error);
    }
    return buildBaseResponse({
      task_id: result.task.id,
      target_id: result.task.targetId,
      path_nodes: getReportedPathNodes(result.task)
    });
  }

  function handlePauseTask() {
    if (robot.currentTask) {
      robot.paused = true;
      robot.taskStatus = 3;
    }
    return buildBaseResponse({});
  }

  function handleResumeTask() {
    robot.paused = false;
    if (robot.currentTask) {
      robot.taskStatus = 2;
    }
    return buildBaseResponse({});
  }

  function handleCancelTask() {
    clearTaskState(6);
    return buildBaseResponse({});
  }

  function handleClearTask() {
    clearTaskState(0);
    return buildBaseResponse({});
  }

  function handleClearMultiStation() {
    clearTaskState(0);
    return buildBaseResponse({});
  }

  return {
    currentTaskSnapshot,
    getTaskPaths,
    getReportedPathNodes,
    buildTaskSegments,
    rebuildTaskPath,
    createTaskWithPath,
    startMoveToNode,
    startMoveToPoint,
    startMultiStationTask,
    handleGoTarget,
    handleGoPoint,
    handleMultiStation,
    handlePauseTask,
    handleResumeTask,
    handleCancelTask,
    handleClearTask,
    handleClearMultiStation,
    clearTaskState
  };
}

module.exports = {
  createTaskEngine
};
