const { API } = require('../../robokit-lib/rbk');
const { buildErrorResponse: defaultErrorResponse, controlLockedError, wrongPortError } = require('./errors');

function createApiRouter(options = {}) {
  const {
    controlArbiter,
    controlPolicy,
    eventLogger,
    commandCache,
    idempotentApis,
    handlers = {}
  } = options;
  const {
    buildErrorResponse,
    buildBaseResponse,
    buildInfoResponse,
    buildRunResponse,
    buildModeResponse,
    buildLocResponse,
    buildSpeedResponse,
    buildMotorResponse,
    buildPathResponse,
    buildAreaResponse,
    buildBlockResponse,
    buildCurrentLockResponse,
    buildBatteryResponse,
    buildBrakeResponse,
    buildLaserResponse,
    buildUltrasonicResponse,
    buildPolygonResponse,
    buildObstacleResponse,
    buildEmergencyResponse,
    buildIoResponse,
    buildImuResponse,
    buildRelocStatusResponse,
    buildLoadmapStatusResponse,
    buildCalibrationStatusResponse,
    buildTrackingStatusResponse,
    buildSlamStatusResponse,
    buildTasklistStatusResponse,
    buildTaskStatusResponse,
    buildForkResponse,
    buildAlarmResponse,
    buildAllResponse,
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
    buildFileResponse,
    buildConfigMapResponse,
    handleConfigLock,
    handleConfigUnlock,
    handleReloc,
    handleStopControl,
    handleConfirmLoc,
    handleCancelReloc,
    handleMotionControl,
    handleGoTarget,
    handleGoPoint,
    handleMultiStation,
    handlePauseTask,
    handleResumeTask,
    handleCancelTask,
    buildTaskPathResponse,
    handleSetDo,
    handleSetDoBatch,
    handleSoftEmc,
    handleSetDi,
    buildAudioList,
    handleSetForkHeight,
    handleForkStop,
    handleClearMultiStation,
    handleClearTask,
    buildTaskListStatus,
    buildTaskListNames
  } = handlers;

  const idempotentSet = idempotentApis instanceof Set ? idempotentApis : new Set();
  const errorResponse = typeof buildErrorResponse === 'function' ? buildErrorResponse : defaultErrorResponse;

  function extractCommandId(payload) {
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const candidate =
      payload.command_id ||
      payload.commandId ||
      payload.cmd_id ||
      payload.cmdId ||
      payload.request_id ||
      payload.requestId;
    if (candidate === undefined || candidate === null) {
      return null;
    }
    const normalized = String(candidate).trim();
    return normalized ? normalized : null;
  }

  function shouldCache(response) {
    if (Buffer.isBuffer(response)) {
      return false;
    }
    if (!response || typeof response !== 'object') {
      return false;
    }
    if (response.ret_code !== 0) {
      return false;
    }
    return true;
  }

  function handle(apiNo, payload, allowedApis, context = {}) {
    if (allowedApis && !allowedApis.has(apiNo)) {
      return wrongPortError();
    }
    const clientId = context.clientId || context.remoteAddress || null;
    const commandId = extractCommandId(payload);
    if (commandCache && commandId && idempotentSet.has(apiNo)) {
      const cached = commandCache.get(clientId, apiNo, commandId);
      if (cached) {
        return cached;
      }
    }
    if (controlArbiter) {
      controlArbiter.releaseIfExpired();
      if (clientId && controlArbiter.canControl(clientId)) {
        controlArbiter.touch(clientId);
      }
      if (controlPolicy && controlPolicy.requiresLock(apiNo)) {
        if (!controlArbiter.canControl(clientId)) {
          if (eventLogger) {
            eventLogger.log('control_denied', {
              apiNo,
              clientId: clientId || null,
              ip: context.remoteAddress || null,
              port: context.remotePort || null
            });
          }
          return controlLockedError();
        }
        controlArbiter.touch(clientId);
      }
    }

    let responsePayload;
    switch (apiNo) {
      case API.robot_status_info_req:
        responsePayload = buildInfoResponse();
        break;
      case API.robot_status_run_req:
        responsePayload = buildRunResponse();
        break;
      case API.robot_status_mode_req:
        responsePayload = buildModeResponse();
        break;
      case API.robot_status_loc_req:
        responsePayload = buildLocResponse();
        break;
      case API.robot_status_speed_req:
        responsePayload = buildSpeedResponse();
        break;
      case API.robot_status_motor_req:
        responsePayload = buildMotorResponse(payload || {});
        break;
      case API.robot_status_path_req:
        responsePayload = buildPathResponse();
        break;
      case API.robot_status_area_req:
        responsePayload = buildAreaResponse();
        break;
      case API.robot_status_block_req:
        responsePayload = buildBlockResponse();
        break;
      case API.robot_status_current_lock_req:
        responsePayload = buildCurrentLockResponse();
        break;
      case API.robot_status_battery_req:
        responsePayload = buildBatteryResponse();
        break;
      case API.robot_status_brake_req:
        responsePayload = buildBrakeResponse();
        break;
      case API.robot_status_laser_req:
        responsePayload = buildLaserResponse();
        break;
      case API.robot_status_ultrasonic_req:
        responsePayload = buildUltrasonicResponse();
        break;
      case API.robot_status_polygon_req:
        responsePayload = buildPolygonResponse();
        break;
      case API.robot_status_obstacle_req:
        responsePayload = buildObstacleResponse();
        break;
      case API.robot_status_emergency_req:
        responsePayload = buildEmergencyResponse();
        break;
      case API.robot_status_io_res:
      case API.robot_status_io_req:
        responsePayload = buildIoResponse();
        break;
      case API.robot_status_imu_req:
        responsePayload = buildImuResponse();
        break;
      case API.robot_status_reloc_req:
        responsePayload = buildRelocStatusResponse();
        break;
      case API.robot_status_loadmap_req:
        responsePayload = buildLoadmapStatusResponse();
        break;
      case API.robot_status_calibration_req:
        responsePayload = buildCalibrationStatusResponse();
        break;
      case API.robot_status_tracking_req:
        responsePayload = buildTrackingStatusResponse();
        break;
      case API.robot_status_slam_req:
        responsePayload = buildSlamStatusResponse();
        break;
      case API.robot_status_tasklist_req:
        responsePayload = buildTasklistStatusResponse();
        break;
      case API.robot_status_task_req:
        responsePayload = buildTaskStatusResponse(payload || {});
        break;
      case API.robot_status_fork_req:
        responsePayload = buildForkResponse();
        break;
      case API.robot_status_alarm_req:
      case API.robot_status_alarm_res:
        responsePayload = buildAlarmResponse();
        break;
      case API.robot_status_all1_req:
      case API.robot_status_all2_req:
      case API.robot_status_all3_req:
      case API.robot_status_all4_req:
        responsePayload = buildAllResponse();
        break;
      case API.robot_status_init_req:
        responsePayload = buildInitResponse();
        break;
      case API.robot_status_map_req:
        responsePayload = buildMapResponse();
        break;
      case API.robot_status_station_req:
        responsePayload = buildStationResponse();
        break;
      case API.robot_status_params_req:
        responsePayload = buildParamsResponse();
        break;
      case API.robot_status_device_types_req:
        responsePayload = buildDeviceTypesResponse();
        break;
      case API.robot_status_file_list_req:
        responsePayload = buildFileListResponse();
        break;
      case API.robot_status_file_list_modules_req:
        responsePayload = buildFileListModulesResponse();
        break;
      case API.robot_status_device_types_ext_req:
        responsePayload = buildDeviceTypesLiteResponse();
        break;
      case API.robot_status_device_types_module_req:
        responsePayload = buildModuleDeviceTypesResponse();
        break;
      case API.robot_status_map_properties_req:
        responsePayload = buildMapPropertiesResponse();
        break;
      case API.robot_status_file_req:
        responsePayload = buildFileResponse(payload) || errorResponse('missing_file', 404);
        break;
      case API.robot_config_req_4005:
        responsePayload = handleConfigLock(payload || {}, context);
        break;
      case API.robot_config_req_4006:
        responsePayload = handleConfigUnlock(context && context.clientId ? context.clientId : null);
        break;
      case API.robot_config_req_4009:
      case API.robot_config_req_4010:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_config_req_4011:
        responsePayload = buildConfigMapResponse();
        break;
      case API.robot_control_reloc_req:
        responsePayload = handleReloc(payload || {});
        break;
      case API.robot_control_stop_req:
        responsePayload = handleStopControl();
        break;
      case API.robot_control_gyrocal_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_control_comfirmloc_req:
        responsePayload = handleConfirmLoc();
        break;
      case API.robot_control_cancelreloc_req:
        responsePayload = handleCancelReloc();
        break;
      case API.robot_control_clearencoder_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_control_motion_req:
        responsePayload = handleMotionControl(payload || {});
        break;
      case API.robot_control_loadmap_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_task_gotarget_req:
        responsePayload = handleGoTarget(payload || {});
        break;
      case API.robot_task_gopoint_req:
        responsePayload = handleGoPoint(payload || {});
        break;
      case API.robot_task_multistation_req:
        responsePayload = handleMultiStation(payload || {});
        break;
      case API.robot_task_pause_req:
        responsePayload = handlePauseTask();
        break;
      case API.robot_task_resume_req:
        responsePayload = handleResumeTask();
        break;
      case API.robot_task_cancel_req:
        responsePayload = handleCancelTask();
        break;
      case API.robot_task_target_path_req:
        responsePayload = buildTaskPathResponse();
        break;
      case API.robot_task_translate_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_task_turn_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_task_gostart_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_task_goend_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_task_gowait_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_task_charge_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_task_test_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_task_goshelf_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_task_uwb_follow_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_task_calibwheel_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_task_caliblaser_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_task_calibminspeed_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_task_calibcancel_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_task_calibclear_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_tasklist_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_task_clear_multistation_req:
        responsePayload = handleClearMultiStation();
        break;
      case API.robot_task_clear_task_req:
        responsePayload = handleClearTask();
        break;
      case API.robot_tasklist_status_req:
        responsePayload = buildTaskListStatus();
        break;
      case API.robot_tasklist_pause_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_tasklist_resume_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_tasklist_cancel_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_tasklist_next_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_tasklist_result_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_tasklist_result_list_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_tasklist_upload_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_tasklist_download_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_tasklist_delete_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_tasklist_list_req:
        responsePayload = buildTaskListNames();
        break;
      case API.robot_tasklist_name_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_other_audio_play_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_other_setdo_req:
        responsePayload = handleSetDo(payload || {});
        break;
      case API.robot_other_setdobatch_req:
        responsePayload = handleSetDoBatch(payload || []);
        break;
      case API.robot_other_softemc_req:
        responsePayload = handleSoftEmc(payload || {});
        break;
      case API.robot_other_audiopause_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_other_audiocont_req:
        responsePayload = buildBaseResponse({});
        break;
      case API.robot_other_setdi_req:
        responsePayload = handleSetDi(payload || {});
        break;
      case API.robot_other_audiolist_req:
        responsePayload = buildAudioList();
        break;
      case API.robot_other_forkheight_req:
        responsePayload = handleSetForkHeight(payload || {});
        break;
      case API.robot_other_forkstop_req:
        responsePayload = handleForkStop();
        break;
      case API.robot_config_push_req:
        responsePayload = wrongPortError();
        break;
      case API.robot_push_config_req:
        responsePayload = wrongPortError();
        break;
      default:
        responsePayload = errorResponse(`unsupported_api_${apiNo}`);
    }

    if (commandCache && commandId && idempotentSet.has(apiNo) && shouldCache(responsePayload)) {
      commandCache.set(clientId, apiNo, commandId, responsePayload);
    }

    return responsePayload;
  }

  return {
    handle
  };
}

module.exports = {
  createApiRouter
};
