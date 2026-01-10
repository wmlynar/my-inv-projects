function createForkController(deps) {
  const {
    robot,
    nowMs,
    lockTimeSeconds,
    createOn,
    buildErrorResponse,
    buildBaseResponse,
    resetVelocity,
    startMoveToNode,
    nodesById,
    cloneGoodsRegion,
    clampForkHeight,
    approachValue,
    FORK_EPS,
    FORK_SPEED_M_S,
    FORK_ACCEL_M_S2,
    FORK_TASK_DELAY_MS,
    FORK_MIN_HEIGHT,
    FORK_TASK_TYPE,
    EMPTY_GOODS_REGION,
    LOADED_GOODS_REGION
  } = deps;

  function normalizeForkHeight(payload) {
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const candidates = [payload.end_height, payload.height, payload.fork_height, payload.value];
    for (const raw of candidates) {
      if (Number.isFinite(raw)) {
        return raw;
      }
      const parsed = Number.parseFloat(raw);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return null;
  }

  function maybeReportForkHeightNotice(requestedHeight) {
    if (!Number.isFinite(requestedHeight) || requestedHeight >= FORK_MIN_HEIGHT) {
      return;
    }
    const timestamp = lockTimeSeconds();
    const desc = JSON.stringify([
      'fork target too low. min_fork_height = {1} send_height = {2}',
      FORK_MIN_HEIGHT,
      requestedHeight
    ]);
    let notice = robot.alarms.notices.find((entry) => entry && entry.code === 57016);
    if (!notice) {
      notice = {
        code: 57016,
        desc: '',
        describe: '',
        method: '',
        reason: '',
        times: 0,
        timestamp
      };
      robot.alarms.notices.push(notice);
    }
    notice.times = (notice.times || 0) + 1;
    notice.timestamp = timestamp;
    notice[57016] = timestamp;
    notice.dateTime = createOn();
    notice.desc = desc;
  }

  function getForkOperation(payload) {
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const operation = payload.operation ? String(payload.operation).trim().toLowerCase() : '';
    if (operation === 'forkheight') return 'height';
    if (operation === 'forkload') return 'load';
    if (operation === 'forkunload') return 'unload';
    return null;
  }

  function finalizeForkTask() {
    if (!robot.forkTaskMode) {
      return;
    }
    if (robot.forkTaskMode === 'load') {
      robot.goodsRegion = cloneGoodsRegion(LOADED_GOODS_REGION);
      if (robot.goods) {
        robot.goods.hasGoods = true;
      }
    } else if (robot.forkTaskMode === 'unload') {
      robot.goodsRegion = cloneGoodsRegion(EMPTY_GOODS_REGION);
      if (robot.goods) {
        robot.goods.hasGoods = false;
        robot.goods.shape = null;
      }
    }
    robot.forkTaskMode = null;
  }

  function completeHeldTask() {
    if (!robot.forkHoldTask) {
      return;
    }
    robot.forkHoldTask = false;
    const task = robot.currentTask;
    if (!task) {
      return;
    }
    task.completedAt = nowMs();
    task.waitingFork = false;
    robot.taskStatus = 4;
    robot.lastTask = task;
    robot.currentTask = null;
    resetVelocity();
  }

  function syncForkTaskStatus() {
    if (!robot.forkTaskActive) {
      return;
    }
    const inPlace = robot.fork.heightInPlace;
    if (inPlace) {
      robot.forkTaskActive = false;
      finalizeForkTask();
      if (robot.forkHoldTask) {
        completeHeldTask();
      }
    }
    if (!robot.forkTaskReport) {
      if (inPlace) {
        robot.forkTaskReport = false;
      }
      return;
    }
    if (!robot.currentTask) {
      robot.taskType = FORK_TASK_TYPE;
      robot.taskStatus = inPlace ? 4 : 2;
    }
    if (inPlace) {
      robot.forkTaskReport = false;
    }
  }

  function shouldReportForkTask() {
    return !robot.currentTask && !(robot.scriptPath && robot.scriptPath.active);
  }

  function startForkTask(target, operation, reportStatus, requestedHeight) {
    maybeReportForkHeightNotice(requestedHeight);
    robot.fork.targetHeight = target;
    robot.fork.heightInPlace = Math.abs(robot.fork.height - target) <= FORK_EPS;
    robot.fork.autoFlag = true;
    robot.fork.forwardVal = target;
    robot.fork.forwardInPlace = false;
    robot.forkTaskMode = operation === 'height' ? null : operation;
    robot.forkTaskActive = !robot.fork.heightInPlace;
    robot.forkTaskReport = reportStatus;
    if (reportStatus && !robot.currentTask) {
      robot.taskType = FORK_TASK_TYPE;
      robot.taskStatus = robot.fork.heightInPlace ? 4 : 2;
    }
    if (robot.fork.heightInPlace) {
      finalizeForkTask();
      robot.forkTaskActive = false;
      robot.forkTaskReport = false;
    }
  }

  function queueForkTask(targetId, target, operation, requestedHeight) {
    robot.forkPending = {
      targetId,
      targetHeight: target,
      requestedHeight: Number.isFinite(requestedHeight) ? requestedHeight : target,
      mode: operation,
      queuedAt: nowMs(),
      startAt: null,
      attached: false
    };
  }

  function beginAttachedForkForTask(task) {
    if (!task || !robot.forkPending || robot.forkTaskActive) {
      return false;
    }
    if (robot.forkPending.targetId && task.targetId && robot.forkPending.targetId !== task.targetId) {
      return false;
    }
    task.waitingFork = true;
    robot.forkHoldTask = true;
    robot.taskStatus = 2;
    resetVelocity();
    robot.forkPending.attached = true;
    if (!Number.isFinite(robot.forkPending.startAt)) {
      robot.forkPending.startAt = nowMs() + FORK_TASK_DELAY_MS;
    }
    return true;
  }

  function maybeStartPendingFork(now) {
    if (!robot.forkPending || robot.forkTaskActive) {
      return false;
    }
    if (Number.isFinite(robot.forkPending.startAt) && now < robot.forkPending.startAt) {
      return false;
    }
    if (robot.forkPending.targetId && robot.forkPending.targetId !== robot.currentStation) {
      return false;
    }
    startForkTask(
      robot.forkPending.targetHeight,
      robot.forkPending.mode,
      false,
      robot.forkPending.requestedHeight
    );
    robot.forkPending = null;
    if (robot.forkHoldTask && !robot.forkTaskActive) {
      completeHeldTask();
    }
    return true;
  }

  function tickFork(dt) {
    if (!robot.fork) {
      return;
    }
    if (robot.softEmc) {
      robot.fork.speed = 0;
      return;
    }
    const target = clampForkHeight(robot.fork.targetHeight);
    const diff = target - robot.fork.height;
    if (Math.abs(diff) <= FORK_EPS) {
      robot.fork.height = target;
      robot.fork.speed = 0;
      robot.fork.heightInPlace = true;
      syncForkTaskStatus();
      return;
    }
    const direction = diff > 0 ? 1 : -1;
    const maxStepSpeed = Math.min(FORK_SPEED_M_S, Math.abs(diff) / dt);
    robot.fork.speed = approachValue(
      robot.fork.speed || 0,
      maxStepSpeed,
      FORK_ACCEL_M_S2,
      FORK_ACCEL_M_S2,
      dt
    );
    const step = direction * robot.fork.speed * dt;
    robot.fork.height += step;
    if ((direction > 0 && robot.fork.height > target) || (direction < 0 && robot.fork.height < target)) {
      robot.fork.height = target;
    }
    robot.fork.heightInPlace = Math.abs(robot.fork.height - target) <= FORK_EPS;
    syncForkTaskStatus();
  }

  function handleForkOperation(payload, operation) {
    const height = normalizeForkHeight(payload);
    if (!Number.isFinite(height)) {
      return buildErrorResponse('invalid_height');
    }
    const target = clampForkHeight(height);
    const targetId = payload && (payload.id || payload.target_id || payload.target);
    if (targetId && targetId !== robot.currentStation) {
      if (!nodesById.has(targetId)) {
        return buildErrorResponse('invalid_target');
      }
      queueForkTask(targetId, target, operation, height);
      if (!robot.currentTask) {
        const result = startMoveToNode(targetId, 3);
        if (!result.ok) {
          robot.forkPending = null;
          return buildErrorResponse(result.error);
        }
      }
      return buildBaseResponse({});
    }
    startForkTask(target, operation, shouldReportForkTask(), height);
    return buildBaseResponse({});
  }

  function handleSetForkHeight(payload) {
    const height = normalizeForkHeight(payload);
    if (!Number.isFinite(height)) {
      return buildErrorResponse('invalid_height');
    }
    maybeReportForkHeightNotice(height);
    const target = clampForkHeight(height);
    robot.fork.targetHeight = target;
    robot.fork.heightInPlace = Math.abs(robot.fork.height - target) <= FORK_EPS;
    robot.fork.forwardVal = target;
    robot.fork.forwardInPlace = false;
    robot.fork.autoFlag = true;
    return buildBaseResponse({ fork_height: robot.fork.height });
  }

  function handleForkStop() {
    robot.fork.targetHeight = robot.fork.height;
    robot.fork.speed = 0;
    robot.fork.heightInPlace = true;
    robot.fork.forwardVal = clampForkHeight(robot.fork.height);
    robot.fork.forwardInPlace = false;
    if (robot.forkTaskActive || robot.taskType === FORK_TASK_TYPE) {
      robot.taskType = FORK_TASK_TYPE;
      robot.taskStatus = 4;
      robot.forkTaskActive = false;
    }
    return buildBaseResponse({});
  }

  return {
    clampForkHeight,
    getForkOperation,
    handleForkOperation,
    handleSetForkHeight,
    handleForkStop,
    beginAttachedForkForTask,
    maybeStartPendingFork,
    startForkTask,
    shouldReportForkTask,
    tickFork
  };
}

module.exports = {
  createForkController
};
