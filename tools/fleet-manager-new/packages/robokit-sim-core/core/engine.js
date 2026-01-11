function createSimulationEngine(deps) {
  const {
    robot,
    simClock,
    nowMs,
    tickMs,
    controlArbiter,
    clearManualControl,
    tickFork,
    updateCharging,
    resetVelocity,
    shouldBlockForObstacle,
    segmentPoseAtDistance,
    updateVelocity,
    applyOdo,
    normalizeAngle,
    toRad,
    polylineAtDistance,
    approachValue,
    findNearestNode,
    beginAttachedForkForTask,
    maybeStartPendingFork,
    constants,
    diagLog,
    diagLogTickMs,
    diagTeleportThreshold,
    updateState
  } = deps;

  const {
    BLOCK_REASON_MANUAL,
    ROTATE_EPS_RAD,
    ROTATE_SPEED_RAD_S,
    ROT_ACCEL_RAD_S2,
    ROT_DECEL_RAD_S2,
    SPEED_M_S,
    ACCEL_M_S2,
    DECEL_M_S2,
    FORK_TASK_TYPE,
    ARRIVAL_EPS,
    WHEELBASE_M,
    CURRENT_POINT_DIST
  } = constants;

  let lastTickAt = nowMs();
  const logDiag = typeof diagLog === 'function' ? diagLog : null;
  const diagState = {
    lastPose: null,
    lastTickLogAt: 0,
    approachStalled: false,
    lastScriptBlock: ''
  };
  const teleportThreshold =
    Number.isFinite(diagTeleportThreshold) && diagTeleportThreshold > 0 ? diagTeleportThreshold : 0.5;
  const tickLogMs = Number.isFinite(diagLogTickMs) ? diagLogTickMs : 0;

  const emitDiag = (event, payload) => {
    if (logDiag) {
      logDiag(event, payload);
    }
  };

  const setPose = (pose, reason, extra) => {
    if (!logDiag) {
      robot.pose = pose;
      return;
    }
    const before = snapshotPose();
    robot.pose = pose;
    const after = snapshotPose();
    emitDiag('pose_set', {
      reason: reason || '',
      before,
      after,
      ...(extra || {})
    });
  };

  const snapshotFlags = () => {
    const task = robot.currentTask;
    const approachActive = Boolean(task && task.approach && task.approach.active);
    const scriptActive = Boolean(robot.scriptPath && robot.scriptPath.active);
    return {
      taskId: task ? task.id : '',
      taskStatus: robot.taskStatus,
      approachActive,
      scriptActive,
      segmentMode: task ? task.segmentMode : '',
      segmentProgress: task ? task.segmentProgress : 0,
      pathIndex: task ? task.pathIndex : 0,
      currentStation: robot.currentStation || '',
      blocked: robot.blocked,
      blockedReason: robot.blockReason,
      paused: robot.paused,
      manual: robot.manual && robot.manual.active
    };
  };

  const snapshotPose = () => ({
    x: robot.pose.x,
    y: robot.pose.y,
    angle: robot.pose.angle
  });

  const snapshotScript = () => {
    const sp = robot.scriptPath;
    if (!sp) {
      return null;
    }
    return {
      active: sp.active,
      mode: sp.mode,
      progress: sp.progress,
      total: sp.plan && sp.plan.polyline ? sp.plan.polyline.totalLength : 0,
      kind: sp.kind || null
    };
  };

  function finishTick(prevPose, prevFlags, now, dt, reason) {
    const nextPose = snapshotPose();
    const nextFlags = snapshotFlags();
    const scriptInfo = snapshotScript();

    if (logDiag && diagState.lastPose) {
      const betweenDist = Math.hypot(prevPose.x - diagState.lastPose.x, prevPose.y - diagState.lastPose.y);
      if (betweenDist > teleportThreshold) {
        emitDiag('pose_jump_between_ticks', {
          reason: reason || '',
          distance: betweenDist,
          prev: diagState.lastPose,
          next: prevPose,
          dtMs: dt * 1000,
          flags: prevFlags,
          script: scriptInfo
        });
      }
    }

    const stepDist = Math.hypot(nextPose.x - prevPose.x, nextPose.y - prevPose.y);
    if (logDiag && stepDist > teleportThreshold) {
      emitDiag('pose_jump', {
        reason: reason || '',
        distance: stepDist,
        prev: prevPose,
        next: nextPose,
        dtMs: dt * 1000,
        flags: nextFlags,
        script: scriptInfo
      });
    }

    if (logDiag) {
      if (prevFlags.approachActive !== nextFlags.approachActive) {
        emitDiag('approach_toggle', {
          from: prevFlags.approachActive,
          to: nextFlags.approachActive,
          taskId: nextFlags.taskId
        });
      }
      if (prevFlags.scriptActive !== nextFlags.scriptActive) {
        emitDiag('script_toggle', {
          from: prevFlags.scriptActive,
          to: nextFlags.scriptActive,
          script: scriptInfo
        });
      }
      const approachStalled = nextFlags.approachActive && !nextFlags.scriptActive;
      if (approachStalled && !diagState.approachStalled) {
        emitDiag('approach_stalled', {
          taskId: nextFlags.taskId,
          flags: nextFlags,
          script: scriptInfo
        });
      }
      diagState.approachStalled = approachStalled;
      if (tickLogMs > 0 && now - diagState.lastTickLogAt >= tickLogMs) {
        emitDiag('tick_snapshot', {
          pose: nextPose,
          flags: nextFlags,
          script: scriptInfo,
          dtMs: dt * 1000
        });
        diagState.lastTickLogAt = now;
      }
    }

    if (typeof updateState === 'function') {
      updateState(robot);
    }

    diagState.lastPose = nextPose;
  }

  function finishScriptPath() {
    const sp = robot.scriptPath;
    if (!sp) {
      return;
    }
    sp.active = false;
    sp.done = true;
    sp.mode = 'idle';
    if (robot.currentTask && robot.currentTask.approach && robot.currentTask.approach.active && sp.kind === 'approach') {
      robot.currentTask.approach.active = false;
      sp.kind = null;
    }
    emitDiag('script_finish', {
      kind: sp.kind || null,
      pose: { x: robot.pose.x, y: robot.pose.y, angle: robot.pose.angle }
    });
    robot.taskStatus = 4;
    resetVelocity();
    const nearest = findNearestNode(robot.pose.x, robot.pose.y);
    if (nearest) {
      const dist = Math.hypot(nearest.pos.x - robot.pose.x, nearest.pos.y - robot.pose.y);
      if (dist <= CURRENT_POINT_DIST) {
        robot.lastStation = robot.currentStation;
        robot.currentStation = nearest.id;
      }
    }
  }

  function tickScriptPath(now, dt) {
    const sp = robot.scriptPath;
    if (!sp || !sp.active || !sp.plan || !sp.plan.polyline) {
      if (diagState.lastScriptBlock) {
        diagState.lastScriptBlock = '';
      }
      return false;
    }
    if (robot.blocked && robot.blockReason === BLOCK_REASON_MANUAL) {
      if (diagState.lastScriptBlock !== 'manual') {
        emitDiag('script_blocked', { reason: 'manual' });
        diagState.lastScriptBlock = 'manual';
      }
      resetVelocity();
      return true;
    }
    if (shouldBlockForObstacle(sp.plan.polyline)) {
      if (diagState.lastScriptBlock !== 'obstacle') {
        emitDiag('script_blocked', { reason: 'obstacle' });
        diagState.lastScriptBlock = 'obstacle';
      }
      resetVelocity();
      return true;
    }
    if (robot.paused) {
      if (diagState.lastScriptBlock !== 'paused') {
        emitDiag('script_blocked', { reason: 'paused' });
        diagState.lastScriptBlock = 'paused';
      }
      resetVelocity();
      return true;
    }
    if (diagState.lastScriptBlock) {
      diagState.lastScriptBlock = '';
    }
    const maxRot = Number.isFinite(sp.maxRot) ? sp.maxRot : ROTATE_SPEED_RAD_S;
    const maxSpeed = Number.isFinite(sp.maxSpeed) ? sp.maxSpeed : SPEED_M_S;

    if (sp.mode === 'rotate') {
      const holdDir = Number.isFinite(sp.holdDir) && sp.holdDir !== 999 ? sp.holdDir : null;
      const targetHeading = holdDir !== null
        ? normalizeAngle(toRad(holdDir))
        : sp.backMode
          ? normalizeAngle((sp.startHeading || 0) + Math.PI)
          : sp.startHeading || 0;
      const diff = normalizeAngle(targetHeading - robot.pose.angle);
      if (Math.abs(diff) <= sp.reachAngle) {
        setPose({ x: robot.pose.x, y: robot.pose.y, angle: targetHeading }, 'script_rotate_done');
        sp.mode = 'move';
        resetVelocity();
        return true;
      }
      const direction = diff >= 0 ? 1 : -1;
      const desiredW = direction * Math.min(maxRot, Math.abs(diff) / dt);
      const nextW = approachValue(robot.motion.angularSpeed, desiredW, ROT_ACCEL_RAD_S2, ROT_DECEL_RAD_S2, dt);
      let delta = nextW * dt;
      if (Math.abs(delta) > Math.abs(diff)) {
        delta = diff;
      }
      const actualW = dt > 0 ? delta / dt : 0;
      setPose(
        { x: robot.pose.x, y: robot.pose.y, angle: normalizeAngle(robot.pose.angle + delta) },
        'script_rotate_step'
      );
      updateVelocity(0, 0, actualW, 0, actualW);
      robot.taskStatus = 2;
      return true;
    }

    if (sp.mode === 'final-rotate' && Number.isFinite(sp.targetAngle)) {
      const targetHeading = normalizeAngle(sp.targetAngle);
      const diff = normalizeAngle(targetHeading - robot.pose.angle);
      if (Math.abs(diff) <= sp.reachAngle) {
        setPose({ x: robot.pose.x, y: robot.pose.y, angle: targetHeading }, 'script_final_rotate_done');
        finishScriptPath();
        return true;
      }
      const direction = diff >= 0 ? 1 : -1;
      const desiredW = direction * Math.min(maxRot, Math.abs(diff) / dt);
      const nextW = approachValue(robot.motion.angularSpeed, desiredW, ROT_ACCEL_RAD_S2, ROT_DECEL_RAD_S2, dt);
      let delta = nextW * dt;
      if (Math.abs(delta) > Math.abs(diff)) {
        delta = diff;
      }
      const actualW = dt > 0 ? delta / dt : 0;
      setPose(
        { x: robot.pose.x, y: robot.pose.y, angle: normalizeAngle(robot.pose.angle + delta) },
        'script_final_rotate_step'
      );
      updateVelocity(0, 0, actualW, 0, actualW);
      robot.taskStatus = 2;
      return true;
    }

    const prevProgress = sp.progress;
    const remaining = sp.plan.polyline.totalLength - prevProgress;
    const stopSpeed = Math.sqrt(Math.max(0, 2 * DECEL_M_S2 * remaining));
    const desiredSpeed = Math.min(maxSpeed, stopSpeed);
    const nextSpeed = approachValue(robot.motion.linearSpeed, desiredSpeed, ACCEL_M_S2, DECEL_M_S2, dt);
    const travel = Math.min(remaining, nextSpeed * dt);
    const nextProgress = prevProgress + travel;
    sp.progress = nextProgress;

    const prevAngle = robot.pose.angle;
    const pose = polylineAtDistance(sp.plan.polyline, nextProgress);
    const distanceMoved = nextProgress - prevProgress;
    const speed = dt > 0 ? distanceMoved / dt : 0;
    const holdDir = Number.isFinite(sp.holdDir) && sp.holdDir !== 999 ? sp.holdDir : null;
    const pathHeading = pose.heading;
    let heading = sp.backMode ? normalizeAngle(pathHeading + Math.PI) : pathHeading;
    if (holdDir !== null) {
      heading = normalizeAngle(toRad(holdDir));
    }
    const desiredHeading = heading;
    let deltaHeading = normalizeAngle(desiredHeading - prevAngle);
    const maxDelta = maxRot * dt;
    if (Number.isFinite(maxDelta) && maxDelta > 0 && Math.abs(deltaHeading) > maxDelta) {
      const clamped = normalizeAngle(prevAngle + Math.sign(deltaHeading) * maxDelta);
      if (logDiag) {
        emitDiag('heading_clamped', {
          reason: 'script_move',
          prevAngle,
          desiredHeading,
          clampedHeading: clamped,
          maxDelta
        });
      }
      const angular = dt > 0 ? normalizeAngle(clamped - prevAngle) / dt : 0;
      sp.progress = prevProgress;
      setPose({ x: robot.pose.x, y: robot.pose.y, angle: clamped }, 'script_rotate');
      updateVelocity(0, 0, angular, 0, angular);
      robot.taskStatus = 2;
      return true;
    }
    const w = dt > 0 ? deltaHeading / dt : 0;
    const speedSigned = sp.backMode ? -speed : speed;
    const vx = speedSigned;
    const vy = 0;
    const steer = speedSigned !== 0 ? Math.atan(WHEELBASE_M * (w / speedSigned)) : 0;
    setPose({ x: pose.x, y: pose.y, angle: heading }, 'script_move');
    updateVelocity(vx, vy, w, steer, 0);
    applyOdo(distanceMoved);
    robot.taskStatus = 2;

    if (sp.plan.polyline.totalLength - nextProgress <= sp.reachDist) {
      const endPos = polylineAtDistance(sp.plan.polyline, sp.plan.polyline.totalLength);
      setPose({ x: endPos.x, y: endPos.y, angle: heading }, 'script_move_end');
      if (Number.isFinite(sp.targetAngle)) {
        sp.mode = 'final-rotate';
        return true;
      }
      finishScriptPath();
    }
    return true;
  }

  function tick() {
    simClock.tick(tickMs);
    const now = nowMs();
    let dt = Math.max(0, (now - lastTickAt) / 1000);
    const maxDt = Number.isFinite(tickMs) && tickMs > 0 ? tickMs / 1000 : null;
    if (maxDt && dt > maxDt) {
      dt = maxDt;
    }
    lastTickAt = now;
    const prevPose = snapshotPose();
    const prevFlags = snapshotFlags();
    if (controlArbiter && controlArbiter.releaseIfExpired()) {
      clearManualControl();
    }
    robot.updatedAt = now;
    tickFork(dt);
    updateCharging(now, dt);

    if (tickScriptPath(now, dt)) {
      return finishTick(prevPose, prevFlags, now, dt, 'script_path');
    }

    if (robot.relocStatus === 2 && robot.relocCompleteAt && now >= robot.relocCompleteAt) {
      robot.relocStatus = 1;
      robot.relocCompleteAt = null;
    }

    if (robot.paused || robot.softEmc) {
      resetVelocity();
      return finishTick(prevPose, prevFlags, now, dt, 'paused_or_soft_emc');
    }
    if (robot.blocked) {
      resetVelocity();
      return finishTick(prevPose, prevFlags, now, dt, 'blocked_manual');
    }

    const task = robot.currentTask;
    if (task) {
      if (task.waitingFork) {
        maybeStartPendingFork(now);
        resetVelocity();
        robot.taskStatus = 2;
        return finishTick(prevPose, prevFlags, now, dt, 'waiting_fork');
      }
      const segment = task.segments[task.segmentIndex];
      if (!segment) {
        task.completedAt = now;
        robot.taskStatus = 4;
        robot.lastTask = task;
        robot.currentTask = null;
        resetVelocity();
        return finishTick(prevPose, prevFlags, now, dt, 'task_complete');
      }

      if (task.segmentMode === 'rotate') {
        const targetHeading = segment.driveBackward
          ? normalizeAngle((segment.startHeading || 0) + Math.PI)
          : segment.startHeading || 0;
        const diff = normalizeAngle(targetHeading - robot.pose.angle);
        if (Math.abs(diff) <= ROTATE_EPS_RAD) {
          setPose({ x: robot.pose.x, y: robot.pose.y, angle: targetHeading }, 'segment_rotate_done');
          task.segmentMode = 'move';
          resetVelocity();
          return finishTick(prevPose, prevFlags, now, dt, 'segment_rotate_done');
        }
        const direction = diff >= 0 ? 1 : -1;
        const desiredW = direction * Math.min(ROTATE_SPEED_RAD_S, Math.abs(diff) / dt);
        const nextW = approachValue(robot.motion.angularSpeed, desiredW, ROT_ACCEL_RAD_S2, ROT_DECEL_RAD_S2, dt);
        let delta = nextW * dt;
        if (Math.abs(delta) > Math.abs(diff)) {
          delta = diff;
        }
        const actualW = dt > 0 ? delta / dt : 0;
        setPose(
          { x: robot.pose.x, y: robot.pose.y, angle: normalizeAngle(robot.pose.angle + delta) },
          'segment_rotate_step'
        );
        updateVelocity(0, 0, actualW, 0, actualW);
        robot.taskStatus = 2;
        return finishTick(prevPose, prevFlags, now, dt, 'segment_rotate');
      }

      if (shouldBlockForObstacle(segment.polyline, task, segment)) {
        resetVelocity();
        return finishTick(prevPose, prevFlags, now, dt, 'blocked_obstacle');
      }

      const prevProgress = task.segmentProgress;
      const remaining = segment.totalLength - prevProgress;
      const stopSpeed = Math.sqrt(Math.max(0, 2 * DECEL_M_S2 * remaining));
      const desiredSpeed = Math.min(SPEED_M_S, stopSpeed);
      const nextSpeed = approachValue(robot.motion.linearSpeed, desiredSpeed, ACCEL_M_S2, DECEL_M_S2, dt);
      const travel = Math.min(remaining, nextSpeed * dt);
      let nextProgress = prevProgress + travel;
      task.segmentProgress = nextProgress;

      const prevAngle = robot.pose.angle;
      const segmentPrevPose = segmentPoseAtDistance(segment, prevProgress);
      let pose = segmentPoseAtDistance(segment, nextProgress);
      let dx = pose.x - segmentPrevPose.x;
      let dy = pose.y - segmentPrevPose.y;
      let distanceMoved = Math.hypot(dx, dy);
      let pathHeading = pose.heading;
      if (distanceMoved > 1e-6) {
        pathHeading = Math.atan2(dy, dx);
      }
      let heading = segment.driveBackward ? normalizeAngle(pathHeading + Math.PI) : pathHeading;
      let deltaHeading = normalizeAngle(heading - prevAngle);
      const maxDelta = ROTATE_SPEED_RAD_S * dt;
      if (Number.isFinite(maxDelta) && maxDelta > 0 && Math.abs(deltaHeading) > maxDelta) {
        const ratio = maxDelta / Math.abs(deltaHeading);
        if (logDiag) {
          emitDiag('heading_clamped', {
            reason: 'segment_move_speed',
            prevAngle,
            desiredHeading: heading,
            maxDelta,
            ratio
          });
        }
        nextProgress = prevProgress + travel * ratio;
        task.segmentProgress = nextProgress;
        pose = segmentPoseAtDistance(segment, nextProgress);
        dx = pose.x - segmentPrevPose.x;
        dy = pose.y - segmentPrevPose.y;
        distanceMoved = Math.hypot(dx, dy);
        pathHeading = pose.heading;
        if (distanceMoved > 1e-6) {
          pathHeading = Math.atan2(dy, dx);
        }
        heading = segment.driveBackward ? normalizeAngle(pathHeading + Math.PI) : pathHeading;
        deltaHeading = normalizeAngle(heading - prevAngle);
        if (Math.abs(deltaHeading) > maxDelta) {
          const clamped = normalizeAngle(prevAngle + Math.sign(deltaHeading) * maxDelta);
          if (logDiag) {
            emitDiag('heading_clamped', {
              reason: 'segment_move',
              prevAngle,
              desiredHeading: heading,
              clampedHeading: clamped,
              maxDelta
            });
          }
          heading = clamped;
          deltaHeading = normalizeAngle(heading - prevAngle);
        }
      }
      const speed = dt > 0 ? distanceMoved / dt : 0;
      const w = dt > 0 ? deltaHeading / dt : 0;
      const speedSigned = segment.driveBackward ? -speed : speed;
      const vx = speedSigned;
      const vy = 0;
      const steer = speedSigned !== 0 ? Math.atan(WHEELBASE_M * (w / speedSigned)) : 0;
      setPose({ x: pose.x, y: pose.y, angle: heading }, 'segment_move');
      updateVelocity(vx, vy, w, steer, 0);
      applyOdo(distanceMoved);
      robot.taskStatus = 2;

      if (segment.totalLength - nextProgress <= ARRIVAL_EPS) {
        const endPose = segmentPoseAtDistance(segment, segment.totalLength);
        setPose({ x: endPose.x, y: endPose.y, angle: heading }, 'segment_move_end');
        if (robot.currentStation !== segment.endId) {
          robot.lastStation = robot.currentStation;
          robot.currentStation = segment.endId;
        }
        if (!task.visitedNodes.includes(segment.endId)) {
          task.visitedNodes.push(segment.endId);
        }
        task.pathIndex = Math.min(task.pathNodes.length, task.pathIndex + 1);
        task.segmentIndex += 1;
        task.segmentProgress = 0;
        task.segmentMode = 'rotate';
        segment.avoidPlan = null;

        if (task.segmentIndex >= task.segments.length) {
          if (beginAttachedForkForTask(task)) {
            return finishTick(prevPose, prevFlags, now, dt, 'fork_attach');
          }
          task.completedAt = now;
          robot.taskStatus = 4;
          robot.lastTask = task;
          robot.currentTask = null;
          resetVelocity();
        }
      }
      return finishTick(prevPose, prevFlags, now, dt, 'segment_move');
    }

    if (robot.manual.active) {
      const cosHeading = Math.cos(robot.pose.angle);
      const sinHeading = Math.sin(robot.pose.angle);
      const worldVx = robot.manual.vx * cosHeading - robot.manual.vy * sinHeading;
      const worldVy = robot.manual.vx * sinHeading + robot.manual.vy * cosHeading;
      setPose(
        {
          x: robot.pose.x + worldVx * dt,
          y: robot.pose.y + worldVy * dt,
          angle: normalizeAngle(robot.pose.angle + robot.manual.w * dt)
        },
        'manual_move'
      );
      updateVelocity(robot.manual.vx, robot.manual.vy, robot.manual.w, robot.manual.steer, 0);
      const distanceMoved = Math.hypot(worldVx, worldVy) * dt;
      applyOdo(distanceMoved);
      const nearest = findNearestNode(robot.pose.x, robot.pose.y);
      if (nearest && Math.hypot(nearest.pos.x - robot.pose.x, nearest.pos.y - robot.pose.y) <= ARRIVAL_EPS) {
        robot.lastStation = robot.currentStation;
        robot.currentStation = nearest.id;
      }
      if (!robot.forkTaskActive && robot.taskType !== FORK_TASK_TYPE) {
        if (robot.taskStatus === 2 || robot.taskStatus === 3) {
          robot.taskStatus = 4;
        }
      }
      return finishTick(prevPose, prevFlags, now, dt, 'manual');
    }

    if (maybeStartPendingFork(now)) {
      return finishTick(prevPose, prevFlags, now, dt, 'pending_fork');
    }

    resetVelocity();
    if (!robot.forkTaskActive && robot.taskType !== FORK_TASK_TYPE) {
      if (robot.taskStatus === 2 || robot.taskStatus === 3) {
        robot.taskStatus = 4;
      }
    }
    finishTick(prevPose, prevFlags, now, dt, 'idle');
  }

  return {
    tick
  };
}

module.exports = {
  createSimulationEngine
};
