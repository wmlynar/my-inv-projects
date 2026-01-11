function createPushBuilder(deps) {
  const {
    robot,
    graph,
    buildBaseResponse,
    batteryRatio,
    getTaskPaths,
    buildDiList,
    buildDoList,
    getReportedCurrentStation,
    getReportedPose,
    isStopped,
    pushMaxFields
  } = deps;

  const maxFields = Number.isFinite(pushMaxFields) ? pushMaxFields : 0;

  function getCurrentStationForPush() {
    return getReportedCurrentStation();
  }

  function buildPushFields() {
    const task = robot.currentTask || robot.lastTask;
    const paths = getTaskPaths(task);
    const mapName = graph.meta && graph.meta.mapName ? graph.meta.mapName : '';
    const diList = buildDiList();
    const doList = buildDoList();
    const pose =
      typeof getReportedPose === 'function'
        ? getReportedPose()
        : robot.pose || { x: 0, y: 0, angle: 0 };
    return {
      controller_temp: robot.controllerTemp,
      x: pose.x,
      y: pose.y,
      angle: pose.angle,
      current_station: getCurrentStationForPush(),
      vx: robot.velocity.vx,
      vy: robot.velocity.vy,
      w: robot.velocity.w,
      steer: robot.velocity.steer,
      blocked: robot.blocked,
      battery_level: batteryRatio(robot.battery),
      charging: robot.charging,
      emergency: robot.emergency,
      DI: diList,
      DO: doList,
      fatals: robot.alarms.fatals,
      errors: robot.alarms.errors,
      warnings: robot.alarms.warnings,
      notices: robot.alarms.notices,
      current_map: mapName,
      vehicle_id: robot.id,
      requestVoltage: robot.requestVoltage,
      requestCurrent: robot.requestCurrent,
      brake: robot.brake,
      confidence: robot.confidence,
      is_stop: isStopped(),
      fork: { fork_height: robot.fork.height },
      target_point: task ? task.targetPoint : null,
      target_label: '',
      target_id: task ? task.targetId : '',
      target_dist: 0,
      task_status: robot.taskStatus,
      task_staus: robot.taskStatus,
      running_status: robot.taskStatus,
      task_type: robot.taskType,
      map: mapName,
      battery_temp: robot.batteryTemp,
      voltage: robot.voltage,
      current: robot.current,
      finished_path: paths.finished,
      unfinished_path: paths.unfinished
    };
  }

  function buildPushPayload(conn) {
    const values = buildPushFields();
    const payload = buildBaseResponse({});
    const included = conn && Array.isArray(conn.includedFields) ? conn.includedFields : null;
    const excluded = conn && Array.isArray(conn.excludedFields) ? conn.excludedFields : null;
    if (included) {
      for (const field of included) {
        if (Object.prototype.hasOwnProperty.call(values, field)) {
          payload[field] = values[field];
        }
      }
      return trimPayload(payload, conn);
    }
    const excludedSet = new Set(excluded || []);
    for (const [key, value] of Object.entries(values)) {
      if (!excludedSet.has(key)) {
        payload[key] = value;
      }
    }
    return trimPayload(payload, conn);
  }

  function trimPayload(payload, conn) {
    if (!maxFields || maxFields <= 0) {
      return payload;
    }
    const metaKeys = ['ret_code', 'create_on', 'err_msg', 'message'];
    const metaSet = new Set(metaKeys);
    const dataKeys = Object.keys(payload).filter((key) => !metaSet.has(key));
    if (dataKeys.length <= maxFields) {
      return payload;
    }
    const trimmed = {};
    for (const key of metaKeys) {
      if (payload[key] !== undefined) {
        trimmed[key] = payload[key];
      }
    }
    const limit = Math.max(0, maxFields);
    for (let i = 0; i < limit; i += 1) {
      const key = dataKeys[i];
      if (key !== undefined) {
        trimmed[key] = payload[key];
      }
    }
    if (conn) {
      conn.trimmed = true;
    }
    return trimmed;
  }

  return {
    buildPushFields,
    buildPushPayload
  };
}

module.exports = {
  createPushBuilder
};
