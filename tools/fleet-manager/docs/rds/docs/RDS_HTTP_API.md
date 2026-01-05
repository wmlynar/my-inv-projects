# RDS HTTP API (port 8088)

Observed from proxy logs in `robokit-proxy/logs/http-8088`.

## Endpoints

- `POST /getProfiles`
  - Request body: JSON like `{"file":"properties.json"}`.
  - Content-Type: `application/x-www-form-urlencoded`.
  - Response: JSON schema describing configurable fields (very large).
- `GET /robotsStatus?devices=lifts,doors,terminals,windshowers`
  - Response: JSON.
- `GET /downloadScene`
  - Response: ZIP payload (binary).
- `POST /uploadScene`
  - Body: ZIP payload (binary).
  - Content-Type: `application/x-www-form-urlencoded`.
  - Response: JSON.

## Scene ZIP layout

From `robokit-proxy/logs/http-8088/1767179306233-6/upload_scene.zip`:

- `rds.scene` (JSON)
- `robots/<robotId>/maps/<map>.smap`
- `robots/<robotId>/models/robot.model` (JSON)
- `robots/<robotId>/params/robot.param` (SQLite)
- `robots/<robotId>/robot_info.json` (JSON)

## Where settings live (rds.scene)

Robot configuration is under:

- `robotGroup[].robot[].property[]`
  - `chargeNeed`, `chargeOnly`, `chargedOk`, `chargedFull`
  - `initialPosition` (e.g., `AP106`)
  - `initialArea`
  - `current_map`, `ip`, `is_simulation`

Charge/park point bindings are in:

- `areas[].logicalMap.advancedPoints[]`
  - `className` is `ChargePoint` or `ParkPoint`
  - property `chargePoint` (bool) or `parkPoint` (bool)
  - the `tag` of that property encodes robot id (`robotId:1`)

Bin/worksite locations are in:

- `areas[].logicalMap.binLocationsList[].binLocationList[]`
  - `instanceName`, `groupName`, `pointName`
  - property `points` (JSON polygon)
  - property `3DProperty` (JSON with bin dimensions)
  - property `bindRobotMap` (`robotId:mapName`)
