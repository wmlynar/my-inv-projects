# Robokit Simulator (TCP)

Minimal Robokit TCP simulator for a single robot. It accepts GoTarget commands,
plans a path on `graph.json`, and simulates movement along curve geometry with
in-place rotations between segments.

## Run

```bash
npm --prefix /home/inovatica/seal/rds/robokit-sim start
```

Profile example (local simulator behind proxy):

```bash
SIM_PROFILE=local npm --prefix /home/inovatica/seal/rds/robokit-sim start
```

Defaults:
- Robod port: `19200`
- State port: `19204`
- Control port: `19205`
- Task port: `19206`
- Config port: `19207`
- Kernel port: `19208`
- Other port: `19210`
- Push port: `19301`
- Tick: `200ms`
- Speed: `0.6 m/s`
- Accel/decel: `0.6/0.9 m/s^2`

Config via env:
- `ROBOD_PORT`
- `STATE_PORT`
- `CTRL_PORT`
- `TASK_PORT`
- `CONFIG_PORT`
- `KERNEL_PORT`
- `OTHER_PORT`
- `PUSH_PORT`
- `ROBOT_ID`
- `ROBOT_MODEL`
- `ROBOT_VERSION`
- `ROBOT_MODEL_MD5`
- `ROBOT_PRODUCT`
- `ROBOT_NOTE`
- `ROBOT_VEHICLE_ID`
- `ROBOT_ARCH`
- `ROBOT_DSP_VERSION`
- `ROBOT_GYRO_VERSION`
- `ROBOT_ECHOID`
- `ROBOT_ECHOID_TYPE`
- `ROBOT_MOTOR_NAMES`
- `ROBOSHOP_MIN_VERSION_REQUIRED`
- `RDS_PARAMS_PATH`
- `RDS_DEVICE_TYPES_PATH`
- `START_NODE_ID`
- `ROBOT_CONFIG_PATH`
- `GRAPH_PATH`
- `ROBOKIT_TRAFFIC_STRATEGY` (np. `pulse-mapf-time`, `sipp-kinodynamic`, `sipp-robust`, `ecbs-sipp`, `cbs-sipp`, `cbs-full`, `mapf-global`, `mapf-pibt`, `mapf-mstar`, `mapf-smt`)
- `TICK_MS`
- `SPEED_M_S`
- `ACCEL_M_S2`
- `DECEL_M_S2`
- `ARRIVAL_EPS`
- `RELOC_MS`
- `ROTATE_SPEED_RAD_S`
- `ROT_ACCEL_RAD_S2`
- `ROT_DECEL_RAD_S2`
- `ROTATE_EPS_RAD`
- `WHEELBASE_M`
- `ROBOT_RADIUS_M`
- `PATH_SAMPLE_STEP`
- `PATH_MIN_SAMPLES`
- `PATH_MAX_SAMPLES`
- `LINE_MATCH_MAX_DIST`
- `LINE_MATCH_ANGLE_DEG`
- `CURRENT_POINT_DIST`
- `MAX_BODY_LENGTH`
- `PUSH_MIN_INTERVAL_MS`
- `FORK_SPEED_M_S`
- `FORK_ACCEL_M_S2`
- `FORK_EPS`
- `FORK_MIN_HEIGHT`
- `FORK_MAX_HEIGHT`
- `OBSTACLE_RADIUS_M`
- `OBSTACLE_CLEARANCE_M`
- `OBSTACLE_LOOKAHEAD_M`
- `OBSTACLE_AVOID_ENABLED`
- `BLOCK_REASON_MANUAL`
- `BLOCK_REASON_OBSTACLE`
- `BIND_HOST`
- `SIM_PROFILE`
- `SIM_PROFILE_PATH`

Notes:
- The simulator uses the Robokit TCP frame header (16 bytes, JSON body).
- Responses use `apiNo + 10000`.
- Paths respect edge direction when the map provides a `direction` property.
- Feature lines can impose one-way travel; `direction < 0` marks backward driving.
- Motion uses a tricycle-style kinematic model (steered front wheel) and rotates
  in place before each segment to align with the path.

Map loading:
- `GRAPH_PATH` can point to a `graph.json` (generated) or a raw `.smap` file.

Robot config:
- Default path: `<map base>.robots.json` next to the map file (override with `ROBOT_CONFIG_PATH`).
- Example:

```json
{
  "robots": [
    {
      "id": "RB-01",
      "name": "Forklift-01",
      "start_station": "AP20",
      "start_pos": { "x": -154.1, "y": -47.2, "angle": 3.14 }
    }
  ]
}
```

RDS compatibility payloads:
- Defaults live in `robokit-sim/rds_params.json` and `robokit-sim/rds_device_types.json`.
- Override with `RDS_PARAMS_PATH` and `RDS_DEVICE_TYPES_PATH`.

Roboshop script simulator:
- `robokit-sim/syspy-js` provides a JS `SimModule` wired into the simulator state.

Simulator HTTP controls (stub ports `HTTP_PORTS`):
- `GET /sim/obstacles` -> `{ ok, obstacles }`
- `POST /sim/obstacles` -> `{ ok, obstacle, obstacles }`, body `{ x, y, radius?, mode: "block" | "avoid" }`
- `POST /sim/obstacles/clear` -> `{ ok, obstacles: [] }`
- `POST /sim/blocked` -> `{ ok, blocked, block_reason, block_id, block_x, block_y }`, body `{ blocked: true|false, reason?, x?, y?, id? }`

## Supported APIs

State port:
- `1000` `robot_status_info_req`
- `1004` `robot_status_loc_req`
- `1007` `robot_status_battery_req`
- `1005` `robot_status_speed_req`
- `1040` `robot_status_motor_req`
- `1006` `robot_status_block_req`
- `1008` `robot_status_brake_req`
- `1009` `robot_status_laser_req`
- `1012` `robot_status_emergency_req`
- `1014` `robot_status_imu_req`
- `1020` `robot_status_task_req`
- `1100` `robot_status_all1_req`
- `1500` `robot_status_device_types_req`
- `1800` `robot_status_file_req`
- `2002` `robot_control_reloc_req`

Control port:
- `2000` `robot_control_stop_req`
- `2002` `robot_control_reloc_req`
- `2010` `robot_control_motion_req`

Task port:
- `3001` `robot_task_pause_req`
- `3002` `robot_task_resume_req`
- `3003` `robot_task_cancel_req`
- `3050` `robot_task_gopoint_req`
- `3051` `robot_task_gotarget_req`
- `3053` `robot_task_target_path_req`
- `3066` `robot_task_multistation_req`
- `3067` `robot_task_clear_multistation_req`
- `3068` `robot_task_clear_task_req`
- `3101` `robot_tasklist_status_req`
- `3106` `robot_tasklist_name_req`
- `3115` `robot_tasklist_list_req`

Other port:
- `6000` `robot_other_audio_play_req`
- `6001` `robot_other_setdo_req`
- `6002` `robot_other_setdobatch_req`
- `6004` `robot_other_softemc_req`
- `6010` `robot_other_audiopause_req`
- `6011` `robot_other_audiocont_req`
- `6020` `robot_other_setdi_req`
- `6033` `robot_other_audiolist_req`
- `6040` `robot_other_forkheight_req`
- `6041` `robot_other_forkstop_req`

Config port:
- `4091` `robot_config_push_req`

Push port:
- `9300` `robot_push_config_req`
- `19301` `robot_push` (data push)

Additional stubbed status APIs for SDK compatibility:
- `1002` `robot_status_run_req`
- `1003` `robot_status_mode_req`
- `1010` `robot_status_path_req`
- `1011` `robot_status_area_req`
- `1013` `robot_status_io_req`
- `1016` `robot_status_ultrasonic_req`
- `1018` `robot_status_polygon_req`
- `1019` `robot_status_obstacle_req`
- `1021` `robot_status_reloc_req`
- `1022` `robot_status_loadmap_req`
- `1023` `robot_status_calibration_req`
- `1024` `robot_status_tracking_req`
- `1025` `robot_status_slam_req`
- `1026` `robot_status_tasklist_req`
- `1050` `robot_status_alarm_req`
- `1101` `robot_status_all2_req`
- `1102` `robot_status_all3_req`
- `1103` `robot_status_all4_req`
- `1111` `robot_status_init_req`
- `1300` `robot_status_map_req`
- `1301` `robot_status_station_req`
- `1400` `robot_status_params_req`

Request example (GoTarget):

```json
{ "id": "AP20" }
```

Location response includes:
- `x`, `y`, `angle`
- `current_station`, `last_station`
- `task_status`, `task_id`, `target_id`
- `path_nodes`, `visited_nodes`
