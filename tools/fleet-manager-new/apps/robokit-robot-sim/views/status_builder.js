const fs = require('fs');
const path = require('path');

function createStatusBuilder(deps) {
  const {
    robot,
    graph,
    mapInfo,
    mapEntries,
    statusAllTemplate,
    robotParamsPayload,
    deviceTypesPayloadFull,
    deviceTypesPayloadExt,
    deviceTypesPayloadModule,
    fileListAssetsPayload,
    fileListModulesPayload,
    mapPropertiesPayload,
    configMapDataPayload,
    fileRoots,
    listSimObstacles,
    createOn,
    nowMs,
    batteryRatio,
    getTaskPaths,
    getReportedCurrentStation,
    getReportedLastStation,
    isStopped,
    cloneJson,
    cloneGoodsRegion,
    config,
    ROBOT_FEATURES,
    DEFAULT_LOCK_TYPE
  } = deps;

  const {
    ROBOT_PRODUCT,
    ROBOT_ARCH,
    ROBOT_DSP_VERSION,
    ROBOT_ECHOID,
    ROBOT_ECHOID_TYPE,
    ROBOT_GYRO_VERSION,
    ROBOT_MODEL,
    ROBOT_MODEL_MD5,
    ROBOT_NOTE,
    ROBOT_VEHICLE_ID,
    ROBOT_VERSION,
    ROBOSHOP_MIN_VERSION_REQUIRED,
    MAX_CHARGE_VOLTAGE_V,
    MAX_CHARGE_CURRENT_A,
    STATUS_HIDE_POSE
  } = config;

  function buildCurrentLockPayload(lockInfo) {
    if (!lockInfo || !lockInfo.locked) {
      return { locked: false };
    }
    return {
      desc: lockInfo.desc || '',
      ip: lockInfo.ip || '',
      locked: true,
      nick_name: lockInfo.nick_name || '',
      port: Number.isFinite(lockInfo.port) ? lockInfo.port : 0,
      time_t: Number.isFinite(lockInfo.time_t) ? lockInfo.time_t : 0,
      type: Number.isFinite(lockInfo.type) ? lockInfo.type : DEFAULT_LOCK_TYPE
    };
  }

  function buildBaseResponse(extra) {
    return {
      ret_code: 0,
      create_on: createOn(),
      ...extra
    };
  }

  function buildErrorResponse(message, code = 1) {
    return {
      ret_code: code,
      err_msg: message,
      message,
      create_on: createOn()
    };
  }

  function buildCurrentLockResponse() {
    return buildBaseResponse(buildCurrentLockPayload(robot.lockInfo));
  }

  function buildInfoResponse() {
    const product = String(ROBOT_PRODUCT || '').trim();
    const currentMapEntries = robot.currentMap
      ? [
          {
            '3dFeatureTrans': [0, 0, 0],
            md5: robot.currentMapMd5 || '',
            name: robot.currentMap
          }
        ]
      : [];
    const response = {
      MAC: robot.mac || '',
      VERSION_LIST: robot.versionList || {},
      WLANMAC: robot.wlanMac || '',
      ap_addr: robot.apAddr || '',
      architecture: ROBOT_ARCH,
      calibrated: Boolean(robot.calibrated),
      create_on: createOn(),
      current_map: robot.currentMap || '',
      current_map_entries: currentMapEntries,
      current_map_md5: robot.currentMapMd5 || '',
      current_ip: robot.currentIp || '',
      dsp_version: ROBOT_DSP_VERSION,
      echoid: ROBOT_ECHOID,
      echoid_type: ROBOT_ECHOID_TYPE,
      features: ROBOT_FEATURES,
      gyro_version: ROBOT_GYRO_VERSION,
      hardware: robot.hardware || {},
      id: robot.id,
      map_version: robot.mapVersion || '',
      model_version: robot.modelVersion || '',
      model: ROBOT_MODEL,
      model_md5: ROBOT_MODEL_MD5,
      modbus_version: robot.modbusVersion || '',
      netprotocol_version: robot.netProtocolVersion || '',
      network_controllers: robot.networkControllers || [],
      ret_code: 0,
      roboshop_min_version_required: ROBOSHOP_MIN_VERSION_REQUIRED,
      robot_note: ROBOT_NOTE,
      rssi: robot.rssi || 0,
      safe_model_md5: robot.safeModelMd5 || '',
      ssid: robot.ssid || '',
      vehicle_id: ROBOT_VEHICLE_ID,
      version: ROBOT_VERSION
    };
    if (product && product.toLowerCase() !== 'null') {
      response.product = product;
    }
    return response;
  }

  function buildLocResponse() {
    const pose = STATUS_HIDE_POSE
      ? { x: null, y: null, angle: null }
      : { x: robot.pose.x, y: robot.pose.y, angle: robot.pose.angle };
    const currentStation = getReportedCurrentStation();
    const lastStation = getReportedLastStation(currentStation);
    return buildBaseResponse({
      x: pose.x,
      y: pose.y,
      angle: pose.angle,
      confidence: robot.confidence,
      current_station: currentStation,
      last_station: lastStation
    });
  }

  function buildSpeedResponse() {
    return buildBaseResponse({
      vx: robot.velocity.vx,
      vy: robot.velocity.vy,
      w: robot.velocity.w,
      steer: robot.velocity.steer,
      spin: robot.velocity.spin,
      r_vx: robot.velocity.r_vx,
      r_vy: robot.velocity.r_vy,
      r_w: robot.velocity.r_w,
      r_steer: robot.velocity.r_steer,
      r_spin: robot.velocity.r_spin,
      motor_cmd: robot.motors.map((motor) => ({
        motor_name: motor.motor_name,
        value: motor.speed
      })),
      steer_angles: [robot.velocity.steer],
      is_stop: isStopped()
    });
  }

  function buildMotorResponse(payload) {
    const requested = payload && Array.isArray(payload.motor_names) ? payload.motor_names : null;
    const motors =
      requested && requested.length > 0
        ? robot.motors.filter((motor) => requested.includes(motor.motor_name))
        : robot.motors;
    const entries = motors.map((motor) => ({
      motor_name: motor.motor_name,
      position: motor.position,
      speed: motor.speed
    }));
    return buildBaseResponse({
      motor_info: entries,
      motors: entries
    });
  }

  function buildRunResponse() {
    const time = nowMs() - robot.bootAt;
    return buildBaseResponse({
      odo: robot.odo,
      today_odo: robot.todayOdo,
      time,
      total_time: time,
      controller_temp: robot.controllerTemp,
      motor_info: robot.motors.map((motor) => ({
        motor_name: motor.motor_name,
        position: motor.position
      })),
      running_status: robot.taskStatus,
      procBusiness: robot.taskStatus === 2
    });
  }

  function buildModeResponse() {
    return buildBaseResponse({
      mode: 1,
      manual: false,
      auto: true
    });
  }

  function buildBatteryResponse() {
    return buildBaseResponse({
      battery_level: batteryRatio(robot.battery),
      battery_temp: robot.batteryTemp,
      charging: robot.charging,
      voltage: robot.voltage,
      current: robot.current,
      max_charge_voltage: MAX_CHARGE_VOLTAGE_V,
      max_charge_current: MAX_CHARGE_CURRENT_A,
      manual_charge: false,
      auto_charge: false,
      battery_cycle: robot.batteryCycle
    });
  }

  function buildPathResponse() {
    const task = robot.currentTask || robot.lastTask;
    const path = task && Array.isArray(task.pathNodes) ? task.pathNodes : [];
    return buildBaseResponse({ path });
  }

  function buildAreaResponse() {
    return buildBaseResponse({
      area_id: 0,
      area_name: ''
    });
  }

  function buildDiList() {
    const meta = robot.io.diMeta || {};
    return Object.entries(robot.io.di || {}).map(([id, value]) => {
      const info = meta[id] || {};
      return {
        id: Number(id),
        source: info.source || 'normal',
        status: Boolean(value),
        valid: info.valid !== undefined ? Boolean(info.valid) : true
      };
    });
  }

  function buildDoList() {
    const meta = robot.io.doMeta || {};
    return Object.entries(robot.io.do || {}).map(([id, value]) => {
      const info = meta[id] || {};
      return {
        id: Number(id),
        source: info.source || 'normal',
        status: Boolean(value)
      };
    });
  }

  function buildIoResponse() {
    const diEntries = Object.entries(robot.io.di || {});
    const doEntries = Object.entries(robot.io.do || {});
    const diList = buildDiList();
    const doList = buildDoList();
    return buildBaseResponse({
      di: robot.io.di,
      do: robot.io.do,
      di_list: diEntries.map(([id, value]) => ({ id: Number(id), value: Boolean(value) })),
      do_list: doEntries.map(([id, value]) => ({ id: Number(id), value: Boolean(value) })),
      DI: diList,
      DO: doList
    });
  }

  function buildBlockResponse() {
    return buildBaseResponse({
      blocked: robot.blocked,
      block_reason: robot.blockReason,
      block_x: robot.blockPos.x,
      block_y: robot.blockPos.y,
      block_id: robot.blockId || 0,
      slow_down: robot.slowDown,
      slow_reason: robot.slowReason,
      slow_x: robot.slowPos.x,
      slow_y: robot.slowPos.y,
      slow_id: robot.slowId || 0
    });
  }

  function buildBrakeResponse() {
    return buildBaseResponse({
      brake: robot.brake
    });
  }

  function buildLaserResponse() {
    return buildBaseResponse({
      lasers: []
    });
  }

  function buildUltrasonicResponse() {
    return buildBaseResponse({
      ultrasonic: []
    });
  }

  function buildPolygonResponse() {
    return buildBaseResponse({
      polygons: []
    });
  }

  function buildObstacleResponse() {
    return buildBaseResponse({
      obstacles: listSimObstacles()
    });
  }

  function buildEmergencyResponse() {
    return buildBaseResponse({
      emergency: robot.emergency,
      driver_emc: robot.driverEmc,
      electric: robot.electric,
      soft_emc: robot.softEmc
    });
  }

  function buildImuResponse() {
    return buildBaseResponse({
      yaw: 0,
      roll: 0,
      pitch: 0
    });
  }

  function buildRelocStatusResponse() {
    return buildBaseResponse({
      reloc_status: robot.relocStatus,
      current_station: getReportedCurrentStation()
    });
  }

  function buildLoadmapStatusResponse() {
    return buildBaseResponse({
      map: graph.meta && graph.meta.mapName ? graph.meta.mapName : '',
      map_status: 0
    });
  }

  function buildCalibrationStatusResponse() {
    return buildBaseResponse({
      calibration_status: 0
    });
  }

  function buildTrackingStatusResponse() {
    return buildBaseResponse({
      tracking_status: 0
    });
  }

  function buildSlamStatusResponse() {
    return buildBaseResponse({
      slam_status: 0
    });
  }

  function buildForkResponse() {
    return buildBaseResponse({
      fork_height: robot.fork.height,
      fork_height_in_place: robot.fork.heightInPlace,
      fork_auto_flag: robot.fork.autoFlag,
      forward_val: robot.fork.forwardVal,
      forward_in_place: false,
      fork_pressure_actual: robot.fork.pressureActual
    });
  }

  function buildTaskStatusResponse(payload) {
    const task = robot.currentTask || robot.lastTask;
    const paths = getTaskPaths(task);
    const simple = Boolean(payload && payload.simple === true);
    const response = {
      task_status: robot.taskStatus,
      task_type: robot.taskType,
      task_id: task ? task.id : null,
      target_id: task ? task.targetId : null,
      target_point: task ? task.targetPoint : null,
      move_status: 0
    };
    if (!simple) {
      response.finished_path = paths.finished;
      response.unfinished_path = paths.unfinished;
    }
    return buildBaseResponse(response);
  }

  function buildTasklistStatusResponse() {
    return buildBaseResponse({
      tasklist_status: robot.taskStatus,
      tasklist: []
    });
  }

  function buildAlarmResponse() {
    const alarms = robot.alarms;
    return buildBaseResponse({
      fatals: alarms.fatals,
      errors: alarms.errors,
      warnings: alarms.warnings,
      notices: alarms.notices,
      alarms
    });
  }

  function buildInitResponse() {
    return {
      create_on: createOn(),
      init_status: 1,
      ret_code: 0
    };
  }

  function buildMapResponse() {
    return {
      create_on: createOn(),
      current_map: mapInfo.name || '',
      current_map_md5: mapInfo.md5 || '',
      map_files_info: mapInfo.files,
      maps: mapInfo.names,
      ret_code: 0
    };
  }

  function buildStationResponse() {
    const stations = (graph.nodes || [])
      .filter((node) => node.className === 'LocationMark' || node.className === 'ActionPoint')
      .map((node) => node.id);
    return buildBaseResponse({
      stations
    });
  }

  function buildParamsResponse() {
    if (robotParamsPayload && typeof robotParamsPayload === 'object') {
      const payload = cloneJson(robotParamsPayload);
      payload.create_on = createOn();
      payload.ret_code = 0;
      return payload;
    }
    return {
      create_on: createOn(),
      ret_code: 0,
      params: {}
    };
  }

  function buildDeviceTypesResponse() {
    if (deviceTypesPayloadFull && typeof deviceTypesPayloadFull === 'object') {
      const payload = cloneJson(deviceTypesPayloadFull);
      if (ROBOT_MODEL) {
        payload.model = ROBOT_MODEL;
      }
      return payload;
    }
    return { model: ROBOT_MODEL, deviceTypes: [] };
  }

  function buildFileListResponse() {
    if (fileListAssetsPayload && typeof fileListAssetsPayload === 'object') {
      const payload = cloneJson(fileListAssetsPayload);
      payload.create_on = createOn();
      payload.ret_code = 0;
      return payload;
    }
    return { create_on: createOn(), list: [], ret_code: 0 };
  }

  function buildFileListModulesResponse() {
    if (fileListModulesPayload && typeof fileListModulesPayload === 'object') {
      const payload = cloneJson(fileListModulesPayload);
      payload.create_on = createOn();
      payload.ret_code = 0;
      return payload;
    }
    return { create_on: createOn(), list: [], ret_code: 0 };
  }

  function buildDeviceTypesLiteResponse() {
    if (deviceTypesPayloadExt && typeof deviceTypesPayloadExt === 'object') {
      const payload = cloneJson(deviceTypesPayloadExt);
      if (payload.deviceTypes) {
        return payload;
      }
      return { deviceTypes: payload };
    }
    return { deviceTypes: [] };
  }

  function buildModuleDeviceTypesResponse() {
    if (deviceTypesPayloadModule && typeof deviceTypesPayloadModule === 'object') {
      return cloneJson(deviceTypesPayloadModule);
    }
    return { model: 'module', deviceTypes: [] };
  }

  function buildMapPropertiesResponse() {
    if (mapPropertiesPayload && typeof mapPropertiesPayload === 'object') {
      const payload = cloneJson(mapPropertiesPayload);
      payload.create_on = createOn();
      payload.ret_code = 0;
      return payload;
    }
    return { create_on: createOn(), maproperties: {}, ret_code: 0 };
  }

  function buildConfigMapResponse() {
    if (configMapDataPayload && typeof configMapDataPayload === 'object') {
      const payload = cloneJson(configMapDataPayload);
      if (payload.header && mapInfo.name) {
        payload.header.mapName = mapInfo.name;
      }
      return payload;
    }
    return {
      header: {
        mapType: '2D-Map',
        mapName: mapInfo.name || '',
        minPos: { x: 0, y: 0 },
        maxPos: { x: 0, y: 0 },
        resolution: 0,
        version: '1.0.0'
      },
      normalPosList: [],
      advancedPointList: [],
      advancedCurveList: []
    };
  }

  function buildAllResponse() {
    const payload = statusAllTemplate ? cloneJson(statusAllTemplate) : {};
    const task = robot.currentTask || robot.lastTask;
    const paths = getTaskPaths(task);
    const now = createOn();
    const uptime = nowMs() - robot.bootAt;
    const diList = buildDiList();
    const doList = buildDoList();
    const currentStation = getReportedCurrentStation();

    payload.create_on = now;
    payload.ret_code = 0;
    payload.current_map = robot.currentMap || '';
    payload.current_map_md5 = robot.currentMapMd5 || '';
    payload.current_map_entries = robot.currentMapEntries || mapEntries;
    payload.vehicle_id = ROBOT_VEHICLE_ID;
    payload.robot_note = ROBOT_NOTE;
    payload.model_md5 = ROBOT_MODEL_MD5;
    payload.MAC = robot.mac || '';
    payload.WLANMAC = robot.wlanMac || '';
    payload.current_ip = robot.currentIp || '';
    payload.confidence = robot.confidence;
    payload.x = robot.pose.x;
    payload.y = robot.pose.y;
    payload.angle = robot.pose.angle;
    payload.yaw = robot.pose.angle;
    payload.vx = robot.velocity.vx;
    payload.vy = robot.velocity.vy;
    payload.w = robot.velocity.w;
    payload.r_vx = robot.velocity.r_vx;
    payload.r_vy = robot.velocity.r_vy;
    payload.r_w = robot.velocity.r_w;
    payload.steer = robot.velocity.steer;
    payload.steer_angles = [robot.velocity.steer];
    payload.r_steer = robot.velocity.r_steer;
    payload.r_steer_angles = [robot.velocity.r_steer];
    payload.spin = robot.velocity.spin;
    payload.r_spin = robot.velocity.r_spin;
    payload.blocked = robot.blocked;
    payload.block_x = robot.blockPos.x;
    payload.block_y = robot.blockPos.y;
    if (robot.blocked) {
      payload.block_id = robot.blockId || 0;
      payload.block_reason = robot.blockReason;
      payload.block_di = robot.blockDi || 0;
      payload.block_ultrasonic_id = robot.blockUltrasonicId || 0;
    }
    payload.slowed = robot.slowDown;
    if (robot.slowDown) {
      payload.slow_reason = robot.slowReason;
      payload.slow_x = robot.slowPos.x;
      payload.slow_y = robot.slowPos.y;
      payload.slow_id = robot.slowId || 0;
      payload.slow_di = robot.slowDi || 0;
      payload.slow_ultrasonic_id = robot.slowUltrasonicId || 0;
    }
    payload.brake = robot.brake;
    payload.battery_level = batteryRatio(robot.battery);
    payload.battery_temp = robot.batteryTemp;
    payload.battery_cycle = robot.batteryCycle;
    payload.voltage = robot.voltage;
    payload.current = robot.current;
    payload.max_charge_voltage = MAX_CHARGE_VOLTAGE_V;
    payload.max_charge_current = MAX_CHARGE_CURRENT_A;
    payload.controller_temp = robot.controllerTemp;
    payload.controller_humi = robot.controllerHumi;
    payload.controller_voltage = robot.controllerVoltage;
    payload.odo = robot.odo;
    payload.today_odo = robot.todayOdo;
    payload.time = uptime;
    payload.total_time = uptime;
    payload.current_station = currentStation;
    payload.last_station = getReportedLastStation(currentStation);
    payload.reloc_status = robot.relocStatus;
    payload.task_status = robot.taskStatus;
    payload.task_type = robot.taskType;
    payload.task_id = task ? task.id : '';
    payload.target_id = task ? task.targetId : '';
    payload.target_point = task ? task.targetPoint : null;
    payload.target_label = '';
    payload.target_x = task && task.targetPoint ? task.targetPoint.x : 0;
    payload.target_y = task && task.targetPoint ? task.targetPoint.y : 0;
    payload.target_dist = 0;
    payload.finished_path = paths.finished;
    payload.unfinished_path = paths.unfinished;
    payload.running_status = robot.taskStatus;
    payload.is_stop = isStopped();
    payload.DI = diList;
    payload.DO = doList;
    payload.fork_height = robot.fork.height;
    payload.fork_height_in_place = robot.fork.heightInPlace;
    payload.fork_auto_flag = robot.fork.autoFlag;
    payload.forward_val = robot.fork.forwardVal;
    payload.forward_in_place = false;
    payload.fork_pressure_actual = robot.fork.pressureActual;
    payload.goods_region = cloneGoodsRegion(robot.goodsRegion);
    payload.errors = robot.alarms.errors;
    payload.warnings = robot.alarms.warnings;
    payload.notices = robot.alarms.notices;
    payload.fatals = robot.alarms.fatals;
    payload.charging = robot.charging;
    payload.emergency = robot.emergency;
    payload.driver_emc = robot.driverEmc;
    payload.electric = robot.electric;
    payload.soft_emc = robot.softEmc;
    payload.manual_charge = false;
    payload.auto_charge = false;
    payload.manualBlock = robot.manualBlock !== undefined ? robot.manualBlock : true;
    payload.current_lock = buildCurrentLockPayload(robot.lockInfo);
    payload.move_status_info = payload.move_status_info || '{"currentBlockId":"","info":"","objectFile":"","require":null}';
    if (!payload.tasklist_status) {
      payload.tasklist_status = {
        actionGroupId: 0,
        actionIds: [],
        loop: false,
        taskId: 0,
        taskListName: '',
        taskListStatus: 0
      };
    }
    return payload;
  }

  function buildTaskPathResponse() {
    const task = robot.currentTask || robot.lastTask;
    const path = task && Array.isArray(task.pathNodes) ? task.pathNodes : [];
    return buildBaseResponse({ path });
  }

  function buildTaskListStatus() {
    const status = robot.taskStatus;
    return buildBaseResponse({
      tasklist_status: status,
      robot_status: {
        battery_level: batteryRatio(robot.battery)
      }
    });
  }

  function buildTaskListNames() {
    return buildBaseResponse({ tasklists: [] });
  }

  function buildAudioList() {
    return buildBaseResponse({ audios: [] });
  }

  function resolveRequestedFile(payload) {
    if (!payload || typeof payload !== 'object') return null;
    const filePath =
      payload.file_path || payload.filePath || payload.path || payload.file || payload.fileName;
    if (!filePath) return null;
    const normalized = String(filePath).trim();
    if (!normalized) return null;
    if (path.isAbsolute(normalized)) {
      try {
        return fs.statSync(normalized).isFile() ? normalized : null;
      } catch (_err) {
        return null;
      }
    }
    for (const root of fileRoots) {
      const resolvedRoot = path.resolve(root);
      const candidate = path.resolve(resolvedRoot, normalized);
      if (!candidate.startsWith(`${resolvedRoot}${path.sep}`)) {
        continue;
      }
      try {
        if (fs.statSync(candidate).isFile()) {
          return candidate;
        }
      } catch (_err) {
        continue;
      }
    }
    return null;
  }

  function buildFileResponse(payload) {
    const resolved = resolveRequestedFile(payload);
    if (!resolved) return null;
    try {
      return fs.readFileSync(resolved);
    } catch (_err) {
      return null;
    }
  }

  return {
    buildBaseResponse,
    buildErrorResponse,
    buildCurrentLockPayload,
    buildCurrentLockResponse,
    buildInfoResponse,
    buildLocResponse,
    buildSpeedResponse,
    buildMotorResponse,
    buildRunResponse,
    buildModeResponse,
    buildBatteryResponse,
    buildPathResponse,
    buildAreaResponse,
    buildDiList,
    buildDoList,
    buildIoResponse,
    buildBlockResponse,
    buildBrakeResponse,
    buildLaserResponse,
    buildUltrasonicResponse,
    buildPolygonResponse,
    buildObstacleResponse,
    buildEmergencyResponse,
    buildImuResponse,
    buildRelocStatusResponse,
    buildLoadmapStatusResponse,
    buildCalibrationStatusResponse,
    buildTrackingStatusResponse,
    buildSlamStatusResponse,
    buildForkResponse,
    buildTaskStatusResponse,
    buildTasklistStatusResponse,
    buildAlarmResponse,
    buildInitResponse,
    buildMapResponse,
    buildStationResponse,
    buildParamsResponse,
    buildDeviceTypesResponse,
    buildFileListResponse,
    buildFileListModulesResponse,
    buildDeviceTypesLiteResponse,
    buildModuleDeviceTypesResponse,
    buildMapPropertiesResponse,
    buildConfigMapResponse,
    buildAllResponse,
    buildTaskPathResponse,
    buildTaskListStatus,
    buildTaskListNames,
    buildAudioList,
    buildFileResponse
  };
}

module.exports = {
  createStatusBuilder
};
