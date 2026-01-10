# robokit-robot-sim — Specyfikacja komponentu (v0.9)

## 1. Rola w systemie (MUST)
`robokit-robot-sim` udaje robota RoboCore/Robokit po TCP. Służy do testów integracyjnych bez fizycznego robota, w tym do:
- potwierdzania framingu i payloadów,
- budowania golden traces,
- uruchamiania E2E: Core → Gateway → Sim → Core → UI.

## 2. Zakres i odpowiedzialności (normatywnie)
#### Scope
Robokit-robot-sim jest zewnętrznym symulatorem udającym RoboCore/Robokit TCP. Jest używany do testów integracyjnych bez fizycznego robota.

Zasady:
- Gateway MUST móc przełączyć robota na robokit-robot-sim bez zmiany logiki Core/Algo.
- Scenariusze E2E SHOULD pokrywać: internalSim (czysto), robokit-robot-sim (protokół), real robot (docelowo).

Related: `11_*`, `18_*`.

## 3. Minimalny kontrakt zachowania (MVP)
- Sim MUST implementować podstawowe API z protokołu RoboCore/Robokit wykorzystywane w MVP:
  - `goTarget` (3051), `stop` (2000), `forkHeight` (6040), `forkStop` (6041),
  - `forkHeight` także jako `goTarget` z `operation: "ForkHeight"` (observed),
  - `robot_config_req_4005` / `robot_config_req_4006` (seize control),
  - statusy: co najmniej `robot_status_loc_req` (1004), `robot_status_block_req` (1006),
    `robot_status_fork_req` (1028) oraz `robot_status_current_lock_req` (1060).
- Sim MUST zachowywać się stabilnie przy reconnectach i powtarzanych `commandId` (idempotencja po stronie gateway nadal obowiązuje).



## 5. Wejściowe API (TCP) — wymagane w MVP (normatywnie dla integracji)

**Uwaga:** to jest opis „jak my tego używamy” (gateway/robot-controller), nie pełna specyfikacja Robokit.

### 5.1 Framing (MUST)
- Sim MUST używać tego samego framingu co real robot (nagłówek + body).
- Response MUST używać `apiNo + 10000` (tak jak obserwowane w istniejącym simie).

*(Detale framingu: `10_adapters-robokit.md`.)*

### 5.2 `goTarget` (3051) — przykład (INFORMATIVE)
Request body (zewnętrzny format, nie zmieniamy nazw):

```json5
{
  "id": "LM2" // LocationMark lub ActionPoint
}
```

Response body (ACK):
```json5
{
  "ret_code": 0,
  "msg": "ok"
}
```

### 5.3 `forkHeight` (3051 lub 6040) — przykład (INFORMATIVE)

`forkHeight` jest obserwowane w dwóch formach:

```json5
{
  "operation": "ForkHeight",
  "end_height": 1.20,
  "id": "LM2"
}
```

oraz klasycznie na porcie OTHER:

```json5
{
  "height": 1.20
}
```

### 5.4 Statusy (MVP minimalnie)

Sim MUST odpowiadać na:
- `robot_status_loc_req` (1004) → pozycja robota,
- `robot_status_block_req` (1006) → blocked/obstacle,
- `robot_status_fork_req` (1028) → wysokość wideł,
- `robot_status_current_lock_req` (1060) → stan seize control,
- (opcjonalnie) push na porcie `push` (19301).

### 5.5 Seize control (CONFIG port) — przykład (INFORMATIVE)
Lock:
```json5
{ "nick_name": "roboshop" }
```

Unlock:
```json5
{}
```

### 5.6 Minimalny model zachowania (MUST)
- Po `goTarget(id)` sim MUST przejść w stan „moving” i w telemetrii zbliżać się do celu.
- Po osiągnięciu celu sim MUST raportować „arrived” (heurystyka po dist/eps).
- Po `stop` sim MUST przejść w stan „stopped”.

---

## 6. Lokalne struktury danych (w sim) (INFORMATIVE)

W praktyce symulator ma:
- mapę (`graph.json` lub `.smap`),
- stan robota (pose, velocity, blocked, forkHeight),
- kolejkę tasków (jeśli wspiera),
- generator telemetry tick.

Te struktury nie muszą być identyczne jak w Core — liczy się kontrakt protokołu.

---

## 4. Odzyskane z istniejącego repo: aktualny `apps/robokit-robot-sim` (INFORMATIVE)
Poniżej znajduje się streszczenie istniejącej implementacji symulatora w repo (pomaga ustalić „co już umiemy” i jak testować).

# Robokit Simulator (TCP)

Minimal Robokit TCP simulator for a single robot. It accepts GoTarget commands,
plans a path on `graph.json`, and simulates movement along curve geometry with
in-place rotations between segments.

## Run

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager-new/apps/robokit-robot-sim start
```

Profile example (local simulator behind proxy):

```bash
SIM_PROFILE=local npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager-new/apps/robokit-robot-sim start
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
- `ROBOT_TIMEZONE_OFFSET`
- `ROBOT_FILE_ROOTS`
- `ROBOT_PARAMS_PATH`
- `ROBOT_DEVICE_TYPES_PATH`
- `ROBOT_DEVICE_TYPES_EXT_PATH`
- `ROBOT_DEVICE_TYPES_MODULE_PATH`
- `ROBOT_FILE_LIST_PATH`
- `ROBOT_FILE_LIST_MODULES_PATH`
- `ROBOT_MAP_PROPERTIES_PATH`
- `ROBOT_CONFIG_MAP_PATH`
- `RDS_PARAMS_PATH` (legacy fallback)
- `RDS_DEVICE_TYPES_PATH` (legacy fallback)
- `MAP_NAME`
- `MAP_PATH`
- `MAPS_DIR`
- `START_NODE_ID`
- `START_NODE`
- `START_STATION`
- `START_LOCATION`
- `START_POSE_X`
- `START_POSE_Y`
- `START_POSE_ANGLE`
- `START_FORK_HEIGHT`
- `APPROACH_MERGE_DIST`
- `APPROACH_CONTROL_SCALE`
- `APPROACH_TURN_PENALTY`
- `APPROACH_REVERSE_PENALTY`
- `APPROACH_SAMPLE_STEP`
- `IDLE_CURRENT_A`
- `IDLE_VOLTAGE_V`
- `AUTO_CHARGE_DELAY_MS`
- `CHARGE_START_CURRENT_A`
- `CHARGE_START_HOLD_MS`
- `CHARGE_CURRENT_A`
- `CHARGE_CURRENT_RAMP_A_S`
- `CHARGE_VOLTAGE_V`
- `CHARGE_VOLTAGE_RAMP_V_S`
- `MAX_CHARGE_CURRENT_A`
- `MAX_CHARGE_VOLTAGE_V`
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
- `FORK_TASK_DELAY_MS`
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
- `robot_status_file_req` serves files from `ROBOT_FILE_ROOTS` plus the map directory.
- Paths respect edge direction when the map provides a `direction` property.
- Feature lines can impose one-way travel; `direction < 0` marks backward driving.
- Motion uses a tricycle-style kinematic model (steered front wheel) and rotates
  in place before each segment to align with the path.
- If no path exists from the current station to a target, the simulator blends onto
  the nearest reachable graph edge and continues along the planned route.

Map loading:
- `GRAPH_PATH` can point to a `graph.json` (generated) or a raw `.smap` file.
- `MAP_NAME` resolves to `<MAPS_DIR>/<MAP_NAME>.smap` (unless it already ends with `.smap`).
- `MAP_PATH` overrides `MAP_NAME` when set (use an absolute path or a path relative to the working directory).

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

Start location overrides:
- `START_NODE_ID` (or `START_NODE`/`START_STATION`/`START_LOCATION`) overrides the robot config start station.
- `START_POSE_X` + `START_POSE_Y` (and optional `START_POSE_ANGLE`) override the robot config `start_pos`.
- `START_FORK_HEIGHT` sets the initial fork height (clamped to min/max).

Charging:
- When the task target is a `ChargePoint` and the robot is stopped, charging starts after `AUTO_CHARGE_DELAY_MS`.
- `CHARGE_START_HOLD_MS` keeps the start current/voltage before ramping to `CHARGE_*` targets.
- `CHARGE_*` values drive the reported charging current/voltage ramp; `IDLE_*` is the non-charging baseline.
- `MAX_CHARGE_*` is reported via `max_charge_voltage` and `max_charge_current` fields.

Robot payload fixtures:
- Defaults live in `apps/robokit-robot-sim/data/` (`robot_params.json`, `device_types_full.json`, `device_types_ext.json`, `device_types_module.json`, `file_list_assets.json`, `file_list_modules.json`, `map_properties.json`, `config_map_data.json`).
- Override with the `ROBOT_*_PATH` env vars listed above.
- `RDS_PARAMS_PATH` / `RDS_DEVICE_TYPES_PATH` remain for legacy compatibility.

Roboshop script simulator:
- `apps/robokit-robot-sim/syspy-js` provides a JS `SimModule` wired into the simulator state.

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
- `1111` `robot_status_init_req`
- `1300` `robot_status_map_req`
- `1400` `robot_status_params_req`
- `1500` `robot_status_device_types_req`
- `1505` `robot_status_file_list_req`
- `1506` `robot_status_file_list_modules_req`
- `1511` `robot_status_device_types_ext_req`
- `1550` `robot_status_device_types_module_req`
- `1700` `robot_status_map_properties_req`
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
- `4005` `robot_config_req_4005`
- `4009` `robot_config_req_4009`
- `4010` `robot_config_req_4010`
- `4011` `robot_config_req_4011`
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
