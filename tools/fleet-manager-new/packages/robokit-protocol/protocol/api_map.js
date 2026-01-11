const { API } = require('../../robokit-lib/rbk');

const allowedStateApis = new Set([
  API.robot_status_info_req,
  API.robot_status_run_req,
  API.robot_status_mode_req,
  API.robot_status_loc_req,
  API.robot_status_speed_req,
  API.robot_status_motor_req,
  API.robot_status_path_req,
  API.robot_status_area_req,
  API.robot_status_block_req,
  API.robot_status_current_lock_req,
  API.robot_status_battery_req,
  API.robot_status_brake_req,
  API.robot_status_laser_req,
  API.robot_status_ultrasonic_req,
  API.robot_status_polygon_req,
  API.robot_status_obstacle_req,
  API.robot_status_emergency_req,
  API.robot_status_io_res,
  API.robot_status_io_req,
  API.robot_status_imu_req,
  API.robot_status_reloc_req,
  API.robot_status_loadmap_req,
  API.robot_status_calibration_req,
  API.robot_status_tracking_req,
  API.robot_status_slam_req,
  API.robot_status_tasklist_req,
  API.robot_status_task_req,
  API.robot_status_fork_req,
  API.robot_status_alarm_req,
  API.robot_status_alarm_res,
  API.robot_status_all1_req,
  API.robot_status_all2_req,
  API.robot_status_all3_req,
  API.robot_status_all4_req,
  API.robot_status_init_req,
  API.robot_status_map_req,
  API.robot_status_station_req,
  API.robot_status_params_req,
  API.robot_status_device_types_req,
  API.robot_status_file_list_req,
  API.robot_status_file_list_modules_req,
  API.robot_status_device_types_ext_req,
  API.robot_status_device_types_module_req,
  API.robot_status_map_properties_req,
  API.robot_status_file_req,
  API.robot_control_reloc_req
]);

const allowedCtrlApis = new Set([
  API.robot_control_stop_req,
  API.robot_control_gyrocal_req,
  API.robot_control_reloc_req,
  API.robot_control_comfirmloc_req,
  API.robot_control_cancelreloc_req,
  API.robot_control_clearencoder_req,
  API.robot_control_motion_req,
  API.robot_control_loadmap_req,
  API.robot_status_speed_req
]);

const allowedTaskApis = new Set([
  API.robot_task_pause_req,
  API.robot_task_resume_req,
  API.robot_task_cancel_req,
  API.robot_task_gopoint_req,
  API.robot_task_gotarget_req,
  API.robot_task_target_path_req,
  API.robot_task_translate_req,
  API.robot_task_turn_req,
  API.robot_task_gostart_req,
  API.robot_task_goend_req,
  API.robot_task_gowait_req,
  API.robot_task_charge_req,
  API.robot_task_test_req,
  API.robot_task_goshelf_req,
  API.robot_task_multistation_req,
  API.robot_task_clear_multistation_req,
  API.robot_task_clear_task_req,
  API.robot_task_uwb_follow_req,
  API.robot_task_calibwheel_req,
  API.robot_task_caliblaser_req,
  API.robot_task_calibminspeed_req,
  API.robot_task_calibcancel_req,
  API.robot_task_calibclear_req,
  API.robot_tasklist_req,
  API.robot_tasklist_status_req,
  API.robot_tasklist_pause_req,
  API.robot_tasklist_resume_req,
  API.robot_tasklist_cancel_req,
  API.robot_tasklist_next_req,
  API.robot_tasklist_result_req,
  API.robot_tasklist_result_list_req,
  API.robot_tasklist_upload_req,
  API.robot_tasklist_download_req,
  API.robot_tasklist_delete_req,
  API.robot_tasklist_list_req,
  API.robot_tasklist_name_req
]);

const allowedOtherApis = new Set([
  API.robot_other_audio_play_req,
  API.robot_other_setdo_req,
  API.robot_other_setdobatch_req,
  API.robot_other_softemc_req,
  API.robot_other_audiopause_req,
  API.robot_other_audiocont_req,
  API.robot_other_setdi_req,
  API.robot_other_audiolist_req,
  API.robot_other_forkheight_req,
  API.robot_other_forkstop_req
]);

const allowedConfigApis = new Set([
  API.robot_config_req_4005,
  API.robot_config_req_4006,
  API.robot_config_req_4009,
  API.robot_config_req_4010,
  API.robot_config_req_4011
]);

const allowedRobodApis = new Set([
  ...allowedStateApis,
  ...allowedCtrlApis,
  ...allowedTaskApis,
  ...allowedOtherApis,
  ...allowedConfigApis
]);

const allowedKernelApis = allowedRobodApis;

const allowedApisByPort = {
  robod: allowedRobodApis,
  state: allowedStateApis,
  ctrl: allowedCtrlApis,
  task: allowedTaskApis,
  kernel: allowedKernelApis,
  other: allowedOtherApis,
  config: allowedConfigApis
};

const idempotentApis = new Set([
  API.robot_control_stop_req,
  API.robot_control_motion_req,
  API.robot_control_reloc_req,
  API.robot_control_comfirmloc_req,
  API.robot_control_cancelreloc_req,
  API.robot_task_gotarget_req,
  API.robot_task_gopoint_req,
  API.robot_task_multistation_req,
  API.robot_task_pause_req,
  API.robot_task_resume_req,
  API.robot_task_cancel_req,
  API.robot_task_clear_multistation_req,
  API.robot_task_clear_task_req,
  API.robot_other_forkheight_req,
  API.robot_other_forkstop_req,
  API.robot_config_req_4005,
  API.robot_config_req_4006
]);

module.exports = {
  allowedStateApis,
  allowedCtrlApis,
  allowedTaskApis,
  allowedOtherApis,
  allowedConfigApis,
  allowedRobodApis,
  allowedKernelApis,
  allowedApisByPort,
  idempotentApis
};
