# Project Status / Handoff

This document summarizes the current state so you can continue the conversation in another window.

## Scope so far

- Goal: build a Fleet Manager that can operate with Roboshop/Robokit by proxying observed APIs,
  simulate robots, and parse RDS scene/map data for planning.
- We focused on:
  - Robokit TCP client/simulator and proxy logging.
  - RDS HTTP API (port 8088) for scene upload/download and profiles/status.
  - Extracting robot config, charge levels, initial positions, and park/charge points from `rds.scene`.
  - Optional parsing of `robot.param` (SQLite) without Python using `sql.js`.

## Project goal

Build a Fleet Manager that can:

- Control multiple robots with collision-safe task planning.
- Use Robokit as the robot API while remaining compatible with Roboshop/RDS tooling.
- Consume and understand `.smap` maps and `rds.scene` configuration.
- Run end-to-end without real hardware (simulator + proxy).

## Success criteria (MVP)

- Load a real customer map and workflow config.
- Detect pick/drop availability and dispatch tasks.
- Track robot positions and task state.
- Expose Roboshop-compatible endpoints for scene upload/download and status.
- Recover state after restart (task/worksite state persisted).

## Assumptions and constraints

- We do not drive robots by continuous velocity streaming; we send destinations/paths.
- Obstacle avoidance remains local to the robot controller.
- Directionality of paths must be respected.
- Roboshop uses the HTTP 8088 endpoints listed below; TCP protocol is via Robokit.

## Non-goals (for now)

- Full reimplementation of RDS/Core scheduling logic.
- Full coverage of all Roboshop functions and device integrations.

## Roadmap (proposed)

1. **Stabilize interfaces**
   - Confirm Roboshop endpoints and update proxy if new ones appear.
   - Keep map/scene parsing stable for large `.smap`.
2. **Simulation fidelity**
   - Use `initialPosition`, `chargePoints`, `parkPoints` from `rds.scene`.
   - Improve robot motion model and timing vs real hardware.
3. **Fleet coordination**
   - Add reservation/locking of edges/areas.
   - Basic collision avoidance between robots at the fleet layer.
4. **Operational hardening**
   - Crash recovery, task persistence, and replay.
   - Monitoring endpoints and log export.

## Risks / open questions

- Roboshop may use additional endpoints or binary transfers not yet captured.
- `robot.param` tables may be large; parsing should be paged/filtered if needed.
- Map directionality and fork behavior must align with real robot firmware.
- Edge reservation semantics are not yet observed from the protocol.

## Suggested next investigations

- Capture more Roboshop interactions (map editing, robot config changes).
- Analyze `robot_info.json` and `robot.model` fields for required settings.
- Validate `chargePoint`/`parkPoint` tag semantics with multiple robots.

## Lessons learned (reservation entry deadlock)

- Issue: local sim could deadlock at the entry of a single-lane segment when time reservations
  held the next segment but traffic spacing allowed robots to creep into each other. Without a
  stop-line / entry-gate, two robots could block each other even though the schedule was valid.
- Why tests missed it:
  - No UI E2E test stack (no Playwright/Cypress) to exercise the real map/traffic UI flow.
  - `e2e-fleet-manager` uses `robokit-sim`, not `fleet-sim-core`, so the local sim runtime was untested.
  - E2E scenarios did not include time reservations + a narrow corridor (width=0) head-on case.
  - Tests asserted "task completes" but not "no stalls / no long holds" during motion.
- Prevention:
  - Add a local-sim E2E run that uses `FLEET_SIM_MODE=local` and `pulse-mapf-time` with a
    width=0 corridor and two robots entering from opposite ends.
  - Add a diagnostics watchdog in E2E that fails on `stalled` or `reservation_entry` holds
    beyond a threshold (e.g., > 5s with `shouldMove=true`).
  - Add a sim-level test that asserts segment progress never crosses a stop-line before
    the next segment reservation window starts.
  - Ensure new traffic/reservation features always ship with a scenario test that hits
    single-lane entry and a "holding" condition.

## Key components

- `robokit-proxy/`
  - TCP proxy that logs traffic and binary payloads.
  - Throttles repeated API numbers to avoid log blow-up.
  - Logs location: `robokit-proxy/logs/`
  - Observed HTTP logs: `robokit-proxy/logs/http-8088/`
- `robokit-sim/`
  - Robot simulator with map-based motion, directionality, line following, and push updates.
  - Uses `shared/map_loader.js` (streaming `.smap`) and `shared/map_api.js`.
- `task-manager/`
  - Scheduler using Robokit TCP client to dispatch tasks.
  - Provides API endpoints for map/status/worksites/tasks.
  - Now also exposes RDS scene summaries and robot params.
  - Refactored into config/state/scheduler modules for easier changes.
  - Fleet mode uses `rds.scene` (multiple robots) plus a closest-idle strategy.
  - Unified scheduler with pluggable robot-selection strategies.
  - Action-based dispatch: scheduler plans actions, executor runs Robokit calls.
  - State files now versioned (schemaVersion = 1) with v0 migration.
  - Architecture overview in `task-manager/ARCHITECTURE.md`.
- `fleet-manager/`
  - UI server (static frontend) plus a Roboshop HTTP proxy on port 8088.
  - Proxies `getProfiles`, `robotsStatus`, `downloadScene`, `uploadScene`.
  - Packaging demo config: `fleet-manager/public/data/packaging.json` (S1-S5 streams, buffers, line requests).
- `shared/`
  - `robokit_client.js`, `robokit_fleet.js` (resilient TCP client + multi-robot wrapper).
  - `map_loader.js`, `map_api.js` for parsing `.smap` + graph access.
  - `rds_http_client.js` for port 8088.
  - `rds_scene.js` to parse `rds.scene`.
  - `rds_param.js` to parse `robot.param` via `sql.js`.

## Observed RDS HTTP API (port 8088)

Captured in proxy logs:

- `POST /getProfiles` (JSON body: `{"file":"properties.json"}`; content-type is form urlencoded)
- `GET /robotsStatus?devices=lifts,doors,terminals,windshowers`
- `GET /downloadScene` (ZIP)
- `POST /uploadScene` (ZIP)

Scene ZIP layout (observed):
- `rds.scene`
- `robots/<robotId>/maps/<map>.smap`
- `robots/<robotId>/models/robot.model` (JSON)
- `robots/<robotId>/params/robot.param` (SQLite)
- `robots/<robotId>/robot_info.json` (JSON)

See `docs/RDS_HTTP_API.md` for details.

## Where robot config lives

In `rds.scene`:
- `robotGroup[].robot[]` → list of configured robots.
- `robotGroup[].robot[].property[]` → settings:
  - `is_simulation`
  - `chargeNeed`, `chargeOnly`, `chargedOk`, `chargedFull`
  - `initialPosition`, `initialArea`
  - `current_map`, `ip`
- Parking/charging points:
  - `areas[].logicalMap.advancedPoints[]`
  - `className` = `ChargePoint` or `ParkPoint`
  - property `chargePoint` / `parkPoint`
  - `property[].tag` encodes robot id (`robotId:1`)
- Worksite/bin locations:
  - `areas[].logicalMap.binLocationsList[].binLocationList[]`

## Task Manager API (new)

Base existing endpoints:
- `GET /api/status`
- `GET /api/stream`
- `GET /api/worksites`
- `POST /api/worksites/:id`
- `GET /api/tasks`
- `GET /api/robot/map`
- `GET /api/robot/stations`
- `POST /api/robot/load-map`

RDS endpoints:
- `GET /api/rds/scene`
- `GET /api/rds/robots`
- `GET /api/rds/robot/:id`
- `GET /api/rds/robot/:id/params`
- `GET /api/rds/charge-points`
- `GET /api/rds/park-points`
- `GET /api/rds/bin-locations`
- `GET /api/rds/points`
- `GET /api/rds/profiles`
- `GET /api/rds/robots-status`
- `GET /api/rds/download-scene`
- `POST /api/rds/upload-scene`

Robokit manual endpoints:
- `POST /api/robots/:id/manual` body `{ "enabled": true }`
- `POST /api/robots/:id/go-target` body `{ "id": "AP-01" }`
- `POST /api/robots/:id/go-point` body `{ "x": 1.2, "y": -0.4, "angle": 0 }`
- `POST /api/robots/:id/pause`
- `POST /api/robots/:id/resume`
- `POST /api/robots/:id/cancel`
- `POST /api/robots/:id/stop`

`/api/status` now also returns `rdsScene` (summary) when `RDS_SCENE_PATH` is set.

## Tests

- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e`
  - Basic pick/drop flow using small fixtures.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-roboshop`
  - Simulates Roboshop upload based on proxy logs and validates `robot.param` parsing.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-fleet-manager`
  - Upload scene to fleet-manager, mark worksite filled, and verify task completion/return to park point.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-multi-robot`
  - Two simulators on 127.0.0.2/127.0.0.3, two tasks, and a closest-idle assignment check.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-traffic`
  - Edge-lock policy scenarios without the scheduler (direct Robokit + policy checks), including stale lock expiry.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-traffic-3`
  - Three-robot contention on the traffic map with corridor and intersection serialization.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock`
  - Scheduler + `ROUTE_POLICY=edge_lock`, head-on drop dispatch is serialized and tasks complete.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-3`
  - Scheduler + `ROUTE_POLICY=edge_lock` with three robots; head-on drop is serialized and all tasks complete.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-intersection`
  - Scheduler + `ROUTE_POLICY=edge_lock`, intersection node-lock serialization.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-intersection-no-same-direction`
  - Scheduler + `ROUTE_POLICY=edge_lock`, allowSameDirection=false on intersection.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-intersection-3`
  - Scheduler + `ROUTE_POLICY=edge_lock`, intersection serialization with three robots.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-cycle-scheduler`
  - Scheduler + `ROUTE_POLICY=edge_lock`, three-robot cycle completes without deadlock.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-direction-scheduler`
  - Scheduler + directed edges: forward task completes, reverse task fails cleanly.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-fallback-scheduler`
  - Scheduler + missing `current_station`: drop dispatch stays serialized (start-node fallback via x/y).
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-fallback-invalid-current-scheduler`
  - Scheduler + invalid `current_station`: drop dispatch stays serialized (start-node fallback via x/y).
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-fallback-last-station-scheduler`
  - Scheduler + missing `current_station` and pose: drop dispatch stays serialized (fallback via `last_station`).
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-no-same-direction-scheduler`
  - Scheduler + allowSameDirection=false: same-direction drops are serialized.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-refresh-scheduler`
  - Scheduler + short lock timeout: reservations stay refreshed while moving.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-smap-scheduler`
  - Scheduler + `.smap` graph: head-on drops serialize on real map data.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-smap-intersection`
  - Scheduler + `.smap` intersection: node locks serialize crossings.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-smap-intersection-3`
  - Scheduler + `.smap` intersection: node locks serialize crossings with three robots.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-clear-task`
  - Scheduler + clear task: idle status fails task and releases locks.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-fallback`
  - Edge-lock start-node fallback (last_station, nearest x/y) locks the intended path.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-direction`
  - Directed edges: path locking uses the allowed direction and skips reverse without a path.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-smap-direction`
  - `.smap` directed edges preserve one-way adjacency in edge_lock.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-cycle`
  - Cycle: same-direction dispatches succeed, opposite direction blocks.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-no-same-direction`
  - allowSameDirection=false blocks same-direction dispatches.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-cancel`
  - Cancel mid-route marks the task failed and releases locks.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-offline`
  - Offline robot fails the task and releases locks after timeout.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-pause`
  - Pause/resume keeps edge-lock reservations and tasks finish after resume.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-pause-timeout`
  - Pause/resume keeps edge-lock reservations past the lock timeout.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-blocked`
  - Blocked robot keeps locks; tasks finish after unblocking.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-blocked-timeout`
  - Blocked robot keeps locks past the lock timeout.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-stall`
  - Stall timeout fails the task and releases locks.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-restart`
  - Scheduler restart resumes in-progress tasks without duplicating them.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-restart-locks`
  - Scheduler restart rebuilds locks before dispatching new tasks.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-closest`
  - Scheduler + `closest_idle` strategy completes without deadlocks.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-stress`
  - Scheduler stress cycles (multiple batches of tasks).
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-scale-4`
  - Scheduler scale (4 robots) with fairness check.
- `npm --prefix /home/inovatica/seal/rds/task-manager run e2e-edge-lock-refresh`
  - Edge-lock lock refresh for pending actions, expiry when idle.

## Fleet Manager Roboshop proxy (HTTP 8088)

In `fleet-manager/server.js`:
- Acts as a drop-in API for Roboshop.
- Proxies the 4 observed endpoints to upstream RDS.
- Optional:
  - `RDS_UPLOAD_DIR` saves uploads to disk.
  - `RDS_SCENE_ZIP_PATH` serves a local ZIP instead of upstream.

## Config highlights

See `docs/CONFIGURATION.md`.

Key new env vars:
- Task Manager:
  - `RDS_HOST`, `RDS_PORT`, `RDS_TIMEOUT_MS`
  - `RDS_SCENE_PATH` (path to `rds.scene`)
  - `RDS_PARAM_ROOT` (root for `robots/<id>/params/robot.param`)
  - `RDS_PARAM_MAX_ROWS`
  - `ROUTE_POLICY_EDGE_LOCK_ALLOW_SAME_DIRECTION`
  - `ROUTE_POLICY_EDGE_LOCK_TIMEOUT_MS`
  - `ROBOT_OFFLINE_TIMEOUT_MS`
  - `ROBOT_STALL_TIMEOUT_MS`
- Fleet Manager:
  - `ROBOSHOP_PORT`, `ROBOSHOP_BIND_HOST`
  - `RDS_HOST`, `RDS_PORT`, `RDS_TIMEOUT_MS`
  - `RDS_UPLOAD_DIR`, `RDS_SCENE_ZIP_PATH`

## Captured logs location

- HTTP 8088 logs:
  - `robokit-proxy/logs/http-8088/`
  - Example extracted ZIP:
    - `robokit-proxy/logs/http-8088/1767179306233-6/upload_scene.zip`
    - Extracted: `robokit-proxy/logs/http-8088/1767179306233-6/upload_scene/`
    - Scene: `.../upload_scene/rds.scene`

## Next likely steps

- Add more Roboshop endpoints if new ones appear in logs.
- Parse `robot_info.json` and `robot.model` into task-manager summary.
- Refine simulator to use `initialPosition` and charge points as per scene.
- Expand tests for new RDS endpoints and param parsing.
