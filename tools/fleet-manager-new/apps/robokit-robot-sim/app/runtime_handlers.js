function createRuntimeHandlers(options) {
  const {
    robot,
    nodesById,
    findNearestNode,
    diagLog,
    buildBaseResponse,
    buildErrorResponse,
    setChargeTarget,
    nowMs,
    lockTimeSeconds,
    normalizeRemoteAddress,
    clientRegistryRef,
    controlArbiterRef,
    eventLogger,
    config,
    runtimeRefs
  } = options;

  if (!robot) {
    throw new Error('runtime_handlers: missing robot');
  }

  const {
    RELOC_MS,
    MANUAL_CONTROL_DEADBAND,
    STRICT_UNLOCK
  } = config;

  const getClientRegistry = () => (clientRegistryRef ? clientRegistryRef.current : null);
  const getControlArbiter = () => (controlArbiterRef ? controlArbiterRef.current : null);

  function updateVelocity(vx, vy, w, steer, spin) {
    robot.velocity = {
      vx,
      vy,
      w,
      steer,
      spin,
      r_vx: vx,
      r_vy: vy,
      r_w: w,
      r_steer: steer,
      r_spin: spin
    };
    const speed = Math.hypot(vx, vy);
    if (robot.motion) {
      robot.motion.linearSpeed = speed;
      robot.motion.angularSpeed = Number.isFinite(w) ? w : 0;
    }
    for (const motor of robot.motors) {
      motor.speed = speed;
    }
  }

  function resetVelocity() {
    updateVelocity(0, 0, 0, 0, 0);
  }

  function isStopped() {
    return Math.abs(robot.velocity.vx) + Math.abs(robot.velocity.vy) + Math.abs(robot.velocity.w) < 1e-3;
  }

  function clearManualControl() {
    robot.manual.active = false;
    robot.manual.vx = 0;
    robot.manual.vy = 0;
    robot.manual.w = 0;
    robot.manual.steer = 0;
    robot.manual.realSteer = 0;
    resetVelocity();
  }

  function setRobotPose(pose, reason, extra) {
    if (!config.DIAG_LOG) {
      robot.pose = pose;
      return;
    }
    const before = { x: robot.pose.x, y: robot.pose.y, angle: robot.pose.angle };
    robot.pose = pose;
    const after = { x: robot.pose.x, y: robot.pose.y, angle: robot.pose.angle };
    diagLog('pose_set', {
      reason: reason || '',
      before,
      after,
      ...(extra || {})
    });
  }

  function handleReloc(payload) {
    const targetId =
      payload && (payload.id || payload.station_id || payload.target_id || payload.point_id);
    const homeRequested = Boolean(payload && payload.home === true);
    const autoRequested = Boolean(payload && (payload.isAuto === true || payload.is_auto === true));
    const x = payload && Number.isFinite(payload.x) ? payload.x : null;
    const y = payload && Number.isFinite(payload.y) ? payload.y : null;
    const angle = payload && Number.isFinite(payload.angle) ? payload.angle : 0;
    let node = null;

    if (targetId && nodesById.has(targetId)) {
      node = nodesById.get(targetId);
    } else if (homeRequested) {
      const homeId = robot.homeStation || robot.currentStation;
      if (homeId && nodesById.has(homeId)) {
        node = nodesById.get(homeId);
      }
    } else if (x !== null && y !== null) {
      node = findNearestNode(x, y);
    }

    if (!node && (x === null || y === null) && !autoRequested) {
      diagLog('reloc_failed', {
        targetId: targetId || null,
        x,
        y,
        autoRequested,
        reason: 'invalid_reloc'
      });
      return buildErrorResponse('invalid_reloc');
    }

    if (node) {
      robot.lastStation = robot.currentStation;
      robot.currentStation = node.id;
    }
    const poseX = x !== null ? x : node ? node.pos.x : robot.pose.x;
    const poseY = y !== null ? y : node ? node.pos.y : robot.pose.y;
    setRobotPose(
      { x: poseX, y: poseY, angle },
      'reloc',
      {
        targetId: targetId || null,
        nodeId: node ? node.id : null
      }
    );
    robot.currentTask = null;
    robot.taskStatus = 0;
    robot.manual.active = false;
    robot.paused = false;
    setChargeTarget(null);
    robot.relocStatus = 2;
    robot.relocCompleteAt = nowMs() + RELOC_MS;

    return buildBaseResponse({ current_station: robot.currentStation });
  }

  function handleConfirmLoc() {
    robot.relocStatus = 1;
    robot.relocCompleteAt = null;
    return buildBaseResponse({});
  }

  function handleCancelReloc() {
    robot.relocStatus = 0;
    robot.relocCompleteAt = null;
    return buildBaseResponse({});
  }

  function handleStopControl() {
    robot.manual.active = false;
    robot.manual.vx = 0;
    robot.manual.vy = 0;
    robot.manual.w = 0;
    robot.manual.steer = 0;
    robot.manual.realSteer = 0;
    robot.paused = true;
    if (robot.scriptPath) {
      robot.scriptPath.active = false;
      diagLog('script_cancel', { reason: 'stop_control' });
    }
    resetVelocity();
    return buildBaseResponse({});
  }

  function handleMotionControl(payload) {
    if (robot.softEmc) {
      clearManualControl();
      return buildBaseResponse({});
    }
    const vxRaw = payload && Number.isFinite(payload.vx) ? payload.vx : 0;
    const vyRaw = payload && Number.isFinite(payload.vy) ? payload.vy : 0;
    const wRaw = payload && Number.isFinite(payload.w) ? payload.w : 0;
    const steerRaw = payload && Number.isFinite(payload.steer) ? payload.steer : 0;
    const realSteer = payload && Number.isFinite(payload.real_steer) ? payload.real_steer : 0;
    const deadband = Number.isFinite(MANUAL_CONTROL_DEADBAND) ? MANUAL_CONTROL_DEADBAND : 0;
    const wheelbase = Number.isFinite(config.WHEELBASE_M) && config.WHEELBASE_M > 0 ? config.WHEELBASE_M : 0;
    const vx = vxRaw;
    const vy = 0;
    let w = wRaw;
    let steer = steerRaw;
    if (wheelbase > 0 && Math.abs(vx) > deadband) {
      if (Number.isFinite(steerRaw) && Math.abs(steerRaw) > deadband) {
        w = (vx / wheelbase) * Math.tan(steerRaw);
        steer = steerRaw;
      } else {
        steer = Math.atan(wheelbase * (w / vx));
      }
    } else {
      steer = Number.isFinite(steerRaw) ? steerRaw : 0;
    }
    const magnitude = Math.max(
      Math.abs(vx),
      Math.abs(w),
      Math.abs(steer),
      Math.abs(realSteer)
    );
    if (!robot.manual.active && robot.currentTask && magnitude <= deadband) {
      diagLog('manual_control_ignored', {
        reason: 'deadband_with_task',
        deadband,
        vx: vxRaw,
        vy: vyRaw,
        w: wRaw,
        steer: steerRaw,
        real_steer: realSteer
      });
      return buildBaseResponse({});
    }
    if (robot.currentTask && magnitude > deadband && !robot.manual.active) {
      const taskId = robot.currentTask ? robot.currentTask.id : '';
      if (runtimeRefs.handleCancelTask) {
        runtimeRefs.handleCancelTask();
      }
      diagLog('manual_override_task', {
        taskId,
        deadband,
        vx: vxRaw,
        vy: vyRaw,
        w: wRaw,
        steer: steerRaw,
        real_steer: realSteer
      });
    }

    robot.manual.active = true;
    robot.manual.vx = vx;
    robot.manual.vy = vy;
    robot.manual.w = w;
    robot.manual.steer = steer;
    robot.manual.realSteer = realSteer;
    robot.paused = false;
    if (robot.scriptPath) {
      robot.scriptPath.active = false;
      robot.scriptPath.done = false;
      diagLog('script_cancel', { reason: 'manual_control' });
    }
    updateVelocity(vx, vy, w, steer, 0);
    return buildBaseResponse({});
  }

  function handleSoftEmc(payload) {
    const enabled = Boolean(payload && payload.status);
    if (enabled) {
      if (!robot.softEmc) {
        robot.softEmcPaused = !robot.paused;
      }
      robot.softEmc = true;
      clearManualControl();
      if (!robot.paused) {
        robot.paused = true;
        if (robot.currentTask && robot.taskStatus !== 4) {
          robot.taskStatus = 3;
        }
      }
      resetVelocity();
      return buildBaseResponse({});
    }
    robot.softEmc = false;
    if (robot.softEmcPaused) {
      robot.paused = false;
      if (robot.currentTask && robot.taskStatus === 3) {
        robot.taskStatus = 2;
      }
    }
    robot.softEmcPaused = false;
    return buildBaseResponse({});
  }

  function handleConfigLock(payload, context) {
    const arbiter = getControlArbiter();
    const registry = getClientRegistry();
    if (!arbiter || !registry) {
      return buildErrorResponse('lock_unavailable');
    }
    const rawNick = payload && typeof payload.nick_name === 'string' ? payload.nick_name : '';
    const nickName = rawNick || (robot.lockInfo ? robot.lockInfo.nick_name : '');
    const ip = normalizeRemoteAddress(context && context.remoteAddress);
    const port = context && Number.isFinite(context.remotePort) ? context.remotePort : 0;
    if (rawNick) {
      const migrated = registry.migrateByNick(ip, rawNick);
      if (migrated && context) {
        context.clientId = migrated.id;
        context.clientSession = migrated;
      }
      if (context && context.clientSession) {
        context.clientSession.nickName = rawNick;
      }
    }
    const clientId = context && context.clientId ? context.clientId : ip;
    const requestMeta = { nick_name: rawNick, ip, port };
    const result = arbiter.acquire(clientId, {
      nick_name: nickName,
      ip,
      port,
      time_t: lockTimeSeconds(),
      request: requestMeta
    });
    if (!result.ok) {
      return buildErrorResponse(result.error || 'lock_failed');
    }
    robot.manualBlock = true;
    return buildBaseResponse({});
  }

  function handleConfigUnlock(clientId) {
    const arbiter = getControlArbiter();
    if (!arbiter) {
      return buildErrorResponse('control_locked', 60001);
    }
    if (arbiter.shouldRejectUnlock(clientId)) {
      return buildErrorResponse('control_locked', 60001);
    }
    const result = arbiter.release(clientId || '', 'unlock');
    if (!result.ok && eventLogger) {
      eventLogger.log('unlock_rejected', {
        by: clientId || null,
        owner: arbiter ? arbiter.getOwner() : null
      });
    }
    if (result.ok && result.released) {
      clearManualControl();
    }
    if (!result.ok && STRICT_UNLOCK) {
      return buildErrorResponse('control_locked', 60001);
    }
    return buildBaseResponse({});
  }

  function setIoValue(type, id, status, source = 'normal') {
    if (!robot.io) {
      robot.io = { di: {}, do: {}, diMeta: {}, doMeta: {} };
    }
    const key = type === 'di' ? 'di' : 'do';
    const metaKey = type === 'di' ? 'diMeta' : 'doMeta';
    if (!robot.io[key]) {
      robot.io[key] = {};
    }
    robot.io[key][id] = Boolean(status);
    if (!robot.io[metaKey]) {
      robot.io[metaKey] = {};
    }
    if (!robot.io[metaKey][id]) {
      robot.io[metaKey][id] = {};
    }
    if (source) {
      robot.io[metaKey][id].source = source;
    }
    if (type === 'di' && robot.io[metaKey][id].valid === undefined) {
      robot.io[metaKey][id].valid = true;
    }
  }

  function handleSetDo(payload) {
    const id = payload && payload.id;
    const status = payload && typeof payload.status === 'boolean' ? payload.status : Boolean(payload && payload.value);
    if (id !== undefined) {
      setIoValue('do', id, status, 'normal');
    }
    return buildBaseResponse({});
  }

  function handleSetDoBatch(payload) {
    if (Array.isArray(payload)) {
      for (const entry of payload) {
        const id = entry && entry.id;
        const status = entry && typeof entry.status === 'boolean' ? entry.status : Boolean(entry && entry.value);
        if (id !== undefined) {
          setIoValue('do', id, status, 'normal');
        }
      }
    }
    return buildBaseResponse({});
  }

  function handleSetDi(payload) {
    const id = payload && payload.id;
    const status = payload && typeof payload.status === 'boolean' ? payload.status : Boolean(payload && payload.value);
    if (id !== undefined) {
      setIoValue('di', id, status, 'normal');
    }
    return buildBaseResponse({});
  }

  return {
    updateVelocity,
    resetVelocity,
    isStopped,
    clearManualControl,
    setRobotPose,
    handleReloc,
    handleConfirmLoc,
    handleCancelReloc,
    handleStopControl,
    handleMotionControl,
    handleSoftEmc,
    handleConfigLock,
    handleConfigUnlock,
    handleSetDo,
    handleSetDoBatch,
    handleSetDi
  };
}

function createHttpHandlers(options) {
  const {
    robot,
    buildBaseResponse,
    buildErrorResponse,
    startMultiStationTask,
    taskEngine,
    addSimObstacle,
    clearSimObstacles,
    listSimObstacles,
    setRobotBlockedState,
    batteryRatio,
    getReportedPose,
    config,
    constants
  } = options;

  const {
    ROBOT_VEHICLE_ID,
    ROBOT_MODEL,
    ROBOT_VERSION
  } = config;

  const { BLOCK_REASON_OBSTACLE } = constants;

  function handleHttpSetOrder(order) {
    const blocks = order && Array.isArray(order.blocks) ? order.blocks : null;
    if (!blocks || blocks.length === 0) {
      return buildErrorResponse('missing_blocks');
    }
    const result = startMultiStationTask(order);
    if (!result.ok) {
      return buildErrorResponse(result.error);
    }
    return buildBaseResponse({
      task_id: result.task.id,
      target_id: result.task.targetId,
      path_nodes: taskEngine ? taskEngine.getReportedPathNodes(result.task) : result.task.pathNodes
    });
  }

  function handleHttpAddObstacle(payload) {
    const result = addSimObstacle(payload || {});
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return { ok: true, obstacle: result.obstacle, obstacles: listSimObstacles() };
  }

  function handleHttpClearObstacles() {
    clearSimObstacles();
    if (robot.blocked && robot.blockReason === BLOCK_REASON_OBSTACLE) {
      setRobotBlockedState(false);
    }
    return { ok: true, obstacles: [] };
  }

  function handleHttpListObstacles() {
    return { ok: true, obstacles: listSimObstacles() };
  }

  function buildRobotsStatusResponse(request = {}) {
    const pose = getReportedPose();
    const status = {
      id: robot.id,
      name: ROBOT_VEHICLE_ID || robot.id,
      model: ROBOT_MODEL,
      version: ROBOT_VERSION,
      vehicle_id: ROBOT_VEHICLE_ID,
      type: 'lifts',
      ip: robot.currentIp || '',
      online: robot.online,
      battery_level: batteryRatio(robot.battery),
      charging: robot.charging,
      blocked: robot.blocked,
      x: pose.x,
      y: pose.y,
      angle: pose.angle,
      vx: robot.velocity.vx,
      vy: robot.velocity.vy,
      w: robot.velocity.w,
      task_status: robot.taskStatus,
      task_type: robot.taskType,
      fork_height: robot.fork.height,
      current_map: robot.currentMap || ''
    };
    status.status = { ...status };

    const requested = new Set(
      Array.isArray(request.devices) ? request.devices.map((item) => String(item).toLowerCase()) : []
    );
    const includeLifts = requested.size === 0 || requested.has('lifts') || requested.has('robots');
    const devicesByType = {
      lifts: includeLifts ? [status] : [],
      doors: [],
      terminals: [],
      windshowers: []
    };

    return {
      ok: true,
      devices: devicesByType,
      device_list: includeLifts ? [status] : [],
      lifts: devicesByType.lifts,
      doors: devicesByType.doors,
      terminals: devicesByType.terminals,
      windshowers: devicesByType.windshowers
    };
  }

  function normalizeBlockedValue(payload) {
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    let blocked = payload.blocked;
    if (blocked === undefined) blocked = payload.status;
    if (blocked === undefined) blocked = payload.enabled;
    if (blocked === undefined) blocked = payload.enable;
    if (blocked === undefined) blocked = payload.value;
    if (blocked === undefined) return null;
    if (typeof blocked === 'string') {
      const lowered = blocked.trim().toLowerCase();
      return lowered !== 'false' && lowered !== '0' && lowered !== '';
    }
    return Boolean(blocked);
  }

  function handleHttpSetBlocked(payload) {
    const blocked = normalizeBlockedValue(payload);
    if (blocked === null) {
      return { ok: false, error: 'missing_blocked' };
    }
    if (blocked) {
      const x = Number.isFinite(payload.x) ? payload.x : robot.pose.x;
      const y = Number.isFinite(payload.y) ? payload.y : robot.pose.y;
      setRobotBlockedState(true, {
        reason: payload.reason,
        id: payload.id,
        x,
        y
      });
    } else {
      setRobotBlockedState(false);
    }
    return {
      ok: true,
      blocked: robot.blocked,
      block_reason: robot.blockReason,
      block_id: robot.blockId || 0,
      block_x: robot.blockPos.x,
      block_y: robot.blockPos.y
    };
  }

  return {
    handleHttpSetOrder,
    handleHttpAddObstacle,
    handleHttpClearObstacles,
    handleHttpListObstacles,
    buildRobotsStatusResponse,
    handleHttpSetBlocked
  };
}

module.exports = {
  createRuntimeHandlers,
  createHttpHandlers
};
