# Configuration

## robokit-proxy

Config file: `robokit-proxy/config.json5` (override with `CONFIG_PATH`).

Fields:
- `bindHost`: IP to bind listeners (default `0.0.0.0`).
- `logDir`: log directory (relative to config file).
- `asciiPreviewLimit`: preview length for ASCII.
- `logBinary`: write `c2s.bin` and `s2c.bin`.
- `logBase64`: include payload as base64 in JSONL.
- `logAscii`: include ASCII preview in JSONL.
- `logSha256`: include sha256 hash in JSONL.
- `splitLogs`: write `c2s.jsonl` and `s2c.jsonl`.
- `mappings[]`: array of port mappings:
  - `name`
  - `listenPort`
  - `targetHost`
  - `targetPort`

## robokit-sim

Env vars:
- `STATE_PORT` (default `19204`)
- `CTRL_PORT` (default `19205`)
- `TASK_PORT` (default `19206`)
- `CONFIG_PORT` (default `19207`)
- `OTHER_PORT` (default `19210`)
- `PUSH_PORT` (default `19301`)
- `ROBOT_ID` (default `RB-01`)
- `START_NODE_ID` (default first ActionPoint)
- `GRAPH_PATH` (default `scraped/graph.json`)
- `ROBOKIT_TRAFFIC_STRATEGY` (default `pulse-mapf-time`)
  - options: `simple`, `pulse-mapf`, `pulse-mapf-avoid`, `pulse-mapf-time`, `sipp`, `sipp-kinodynamic`, `sipp-robust`, `ecbs-sipp`, `cbs-sipp`, `cbs-full`, `mapf-global`, `mapf-pibt`, `mapf-mstar`, `mapf-smt`
- `TICK_MS` (default `200`)
- `SPEED_M_S` (default `0.6`)
- `ARRIVAL_EPS` (default `0.05`)
- `RELOC_MS` (default `500`)
- `CURRENT_POINT_DIST` (default `0.3`)
- `MAX_BODY_LENGTH` (default `1048576`)
- `PUSH_MIN_INTERVAL_MS` (default `200`)
- `STATUS_HIDE_CURRENT_STATION` (default unset)
- `STATUS_FORCE_CURRENT_STATION` (default unset)
- `STATUS_HIDE_LAST_STATION` (default unset)
- `STATUS_HIDE_POSE` (default unset)
- `STATUS_LAST_STATION_IS_CURRENT` (default unset)

## task-manager

Env vars:
- `PORT` (default `7071`)
- `TICK_MS` (default `1000`)
- `ROBOKIT_HOST` (default `127.0.0.1`)
- `ROBOKIT_STATE_PORT` (default `19204`)
- `ROBOKIT_TASK_PORT` (default `19206`)
- `ROBOKIT_TIMEOUT_MS` (default `2000`)
- `ROBOT_ID` (default `RB-01`)
- `GRAPH_PATH` (default `scraped/graph.json`)
- `WORKFLOW_PATH` (default `scraped/workflow.json5`)
- `MAX_BODY_LENGTH` (default `10485760`)
- `RDS_HOST` (default `ROBOKIT_HOST`)
- `RDS_PORT` (default `8088`)
- `RDS_TIMEOUT_MS` (default `5000`)
- `RDS_SCENE_PATH` (optional path to `rds.scene`)
- `RDS_PARAM_ROOT` (optional root folder with `robots/<id>/params/robot.param`)
- `RDS_PARAM_MAX_ROWS` (default `2000`)
- `ROBOT_SELECT_STRATEGY` (default `closest_idle`, options: `closest_idle`, `round_robin`)
- `ROUTE_POLICY` (default `none`)
- `ROUTE_POLICY_EDGE_LOCK_ALLOW_SAME_DIRECTION` (default `true`)
- `ROUTE_POLICY_EDGE_LOCK_TIMEOUT_MS` (default `15000`)
- `ROBOT_OFFLINE_TIMEOUT_MS` (default `0`, disabled when 0)
- `ROBOT_STALL_TIMEOUT_MS` (default `0`, disabled when 0)

## fleet-manager

Env vars:
- `PORT` (default `3000`)
- `ROBOSHOP_PORT` (default `8088`)
- `ROBOSHOP_BIND_HOST` (default `0.0.0.0`)
- `RDS_HOST` (default `127.0.0.1`)
- `RDS_PORT` (default `8088`)
- `RDS_TIMEOUT_MS` (default `5000`)
- `RDS_MAX_BODY_LENGTH` (default `10485760`)
- `RDS_UPLOAD_DIR` (optional path to store uploaded scene zips)
- `RDS_SCENE_ZIP_PATH` (optional path to serve a local scene zip)
- `FLEET_SIM_MODE` (default `local`, options: `local`, `robokit`)
- `FLEET_CORE_URL` (default `http://127.0.0.1:7071`)
- `FLEET_CORE_TIMEOUT_MS` (default `4000`)
- `FLEET_POLL_MS` (default `800`)

Static data for UI:
- `fleet-manager/public/data/graph.json`
- `fleet-manager/public/data/workflow.json5`

Robots config (served by fleet-manager):
- `fleet-manager/public/data/robots.json`
  - `traffic.forwardStopDistanceM`: dodatkowy dystans predykcji do przodu (metry) uzywany do
    wczesniejszego zatrzymania przed innymi robotami; domyslnie `0`.
