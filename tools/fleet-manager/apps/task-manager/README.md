# Task Manager

Simple scheduler that reads `graph.json` + `workflow.json5`, watches worksite state,
and sends Robokit TCP commands to the simulator.

## Run

Start the simulator first:

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/robokit-sim start
```

Then run the task manager:

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager start
```

Defaults:
- Port: `7071`
- Tick: `1000ms`
- Robokit host: `127.0.0.1`
- Robokit state port: `19204`
- Robokit task port: `19206`
- Workflow: `/home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager/scraped/workflow.json5`
- Graph: `/home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager/scraped/graph.json` (or `.smap`)

Config via env:
- `PORT`
- `TICK_MS`
- `ROBOKIT_HOST`
- `ROBOKIT_HOSTS` (comma-separated for multi-robot)
- `ROBOKIT_STATE_PORT`
- `ROBOKIT_TASK_PORT`
- `ROBOKIT_TIMEOUT_MS`
- `ROBOT_ID`
- `GRAPH_PATH`
- `WORKFLOW_PATH`
- `MAX_BODY_LENGTH`
- `STATE_DIR`
- `BIND_HOST`
- `ROBOT_SELECT_STRATEGY` (`closest_idle` | `round_robin`)
- `ROUTE_POLICY` (`none` | `edge_lock`)
- `ROUTE_POLICY_EDGE_LOCK_ALLOW_SAME_DIRECTION` (default `true`)
- `ROUTE_POLICY_EDGE_LOCK_TIMEOUT_MS` (default `15000`)
- `ROBOT_OFFLINE_TIMEOUT_MS`
- `ROBOT_STALL_TIMEOUT_MS`

State files:
- `/home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager/state/worksites.json`
- `/home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager/state/tasks.json`

## Robot commands (scheduler)

The scheduler uses a narrow command set and keeps all manual controls out of band.

- Status polling: `robot_status_loc_req` (`getStatusLoc`) and `current_station` (fallback to `last_station`/pose) to detect arrival.
- Task dispatch: `robot_task_gotarget_req` (`goTarget`) for pick -> drop -> park (if a park point exists).
- Not used by the scheduler: `go-point`, `pause/resume/cancel/stop`, `motion`, `translate`, `turn` (these are manual endpoints).

## E2E

Runs a minimal end-to-end flow with a tiny graph + workflow (pick -> drop).

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e
```

Override the fixtures (e.g. real map/workflow):

```bash
E2E_GRAPH_PATH=/home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager/scraped/graph.json \
E2E_WORKFLOW_PATH=/home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager/scraped/workflow.json5 \
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e
```

Traffic-only (edge lock) scenarios for two robots:

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-traffic
```

Scenarios cover head-on, follow, merge, split, intersection, lock refresh, and stale lock expiry.

Traffic-only (edge lock) scenario for three robots:

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-traffic-3
```

Scenarios cover corridor contention and intersection node locks.

Override the test map or lock timeout:

```bash
E2E_GRAPH_PATH=/home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager/scraped/graph.json \
E2E_LOCK_TIMEOUT_MS=2000 \
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-traffic
```

Edge-lock start-node fallback (last_station, nearest x/y):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-fallback
```

Edge-lock directed edges (path locking honors one-way edges):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-direction
```

Edge-lock directed edges from `.smap` (one-way adjacency preserved):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-smap-direction
```

Edge-lock cycle (same-direction allowed, opposite direction blocked):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-cycle
```

Edge-lock no sharing (allowSameDirection=false blocks same-direction):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-no-same-direction
```

Edge-lock refresh while a dispatch is still pending:

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-refresh
```

Edge-lock cancel recovery (task canceled mid-route releases locks):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-cancel
```

Edge-lock offline recovery (robot offline releases locks):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-offline
```

## E2E (edge_lock scheduler)

Runs task-manager with `ROUTE_POLICY=edge_lock` and two robots on the traffic map.
Validates that head-on drop dispatch is serialized and tasks complete.

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock
```

Override inputs or speed:

```bash
E2E_GRAPH_PATH=/home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager/scraped/graph.json \
E2E_WORKFLOW_PATH=/home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager/scraped/workflow.json5 \
E2E_SPEED_M_S=0.6 \
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock
```

Scheduler with three robots (head-on drop serialized + third task completion):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-3
```

Scheduler intersection scenario (node lock serialization at X):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-intersection
```

Scheduler intersection with allowSameDirection=false:

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-intersection-no-same-direction
```

Scheduler intersection with three robots (node lock serialized under load):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-intersection-3
```

Scheduler cycle (three robots on a ring):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-cycle-scheduler
```

Scheduler directed edges (reverse task fails, forward completes):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-direction-scheduler
```

Scheduler start-node fallback (missing current_station, uses x/y):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-fallback-scheduler
```

Scheduler start-node fallback (invalid current_station, uses x/y):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-fallback-invalid-current-scheduler
```

Scheduler start-node fallback (missing current_station + pose, uses last_station):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-fallback-last-station-scheduler
```

Scheduler same-direction blocking (allowSameDirection=false):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-no-same-direction-scheduler
```

Scheduler lock refresh during long travel (short timeout):

```bash
E2E_LOCK_TIMEOUT_MS=500 \
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-refresh-scheduler
```

Scheduler on `.smap` graph (head-on serialization on real map):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-smap-scheduler
```

Scheduler on `.smap` graph (intersection node lock):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-smap-intersection
```

Scheduler on `.smap` graph (intersection node lock, three robots):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-smap-intersection-3
```

Scheduler pause/resume (locks stay while paused):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-pause
```

Scheduler pause/resume (locks stay past timeout):

```bash
E2E_LOCK_TIMEOUT_MS=500 \
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-pause-timeout
```

Scheduler clear task (robot clears task mid-route releases locks):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-clear-task
```

Scheduler blocked robot (task_status=3 keeps locks until unblocked):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-blocked
```

Scheduler blocked robot (locks stay past timeout):

```bash
E2E_LOCK_TIMEOUT_MS=500 \
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-blocked-timeout
```

Scheduler stall timeout (robot stopped mid-route releases locks):

```bash
E2E_STALL_TIMEOUT_MS=1500 \
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-stall
```

Scheduler restart recovery (tasks survive manager restart without duplication):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-restart
```

Scheduler restart recovery (locks rebuilt before new dispatches):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-restart-locks
```

Scheduler closest-idle strategy (3 robots):

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-closest
```

Scheduler stress (multiple cycles):

```bash
E2E_STRESS_CYCLES=3 \
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-stress
```

Scheduler scale (4 robots, fairness check):

```bash
E2E_SCALE_CYCLES=2 \
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-edge-lock-scale-4
```

## E2E (all)

Runs the full local E2E suite (task-manager + robokit-proxy + Roboshop upload).

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-all
```

Override default timeout (ms):

```bash
E2E_ALL_TIMEOUT_MS=120000 \
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-all
```

## E2E (Fleet Manager local sim: entry reservation)

Runs fleet-manager in local sim mode with a narrow corridor (width=0) and time
reservations, then sends two robots head-on and asserts they do not stall.

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-fleet-local
```

Override settings:

```bash
E2E_FLEET_PORT=3195 \
E2E_SCENE_ID=entry-reservation \
E2E_TIMEOUT_MS=60000 \
E2E_STALL_TIMEOUT_MS=5000 \
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-fleet-local
```

## E2E (Multi-robot)

Runs two simulators on 127.0.0.2 + 127.0.0.3 with a two-pick/two-drop workflow and
verifies both robots complete tasks.

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run e2e-multi-robot
```

## Behavior

- Picks are chosen from the pick group when `filled=true` and not `blocked`.
- Drops are chosen from the drop groups in stream order. A group is eligible only
  if the first slot is free and not blocked ("preceding empty" rule).
- In fleet mode (multiple robots configured via `ROBOKIT_HOSTS`), multiple tasks can be dispatched.
- The robot is sent to pick -> drop -> park (if a park point exists).
- On completion: pick becomes empty, drop becomes filled.
- If a robot goes idle/canceled away from the target, the task fails and its locks are released.
- If a robot stays offline beyond `ROBOT_OFFLINE_TIMEOUT_MS`, the task fails and locks are released.
- If a robot stays online but does not move beyond `ROBOT_STALL_TIMEOUT_MS`, the task fails and locks are released.

## API

- `GET /health`
- `GET /api/status`
- `GET /api/stream`
- `GET /api/worksites`
- `POST /api/worksites/:id` `{ "filled": true, "blocked": false }`
- `GET /api/tasks`
- `GET /api/robot/map`
- `GET /api/robot/stations`
- `POST /api/robot/load-map` (payload passed to Robokit `controlLoadMap`)

## Notes

- `robot.param` parsing uses `sql.js` (pure JS/WASM, no Python required).

## Future improvements

- Swap `sql.js` for a native driver (e.g. `better-sqlite3`) for faster/streamed reads on large param DBs.

## Architecture

See `apps/task-manager/ARCHITECTURE.md` for the current layering and data model.

## Env example

Generate `.env.example` from config schema:

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager/apps/task-manager run gen-env
```
