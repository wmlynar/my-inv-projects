# Orchestrator Behavior and Streams (v0.2)

## 1. Purpose
Define how robots should behave on a scene from the user perspective, how streams
describe transport processes, and how the orchestrator turns streams into tasks.
This spec is the contract between UI, core, and algorithm implementations.

## 2. Scope
- Stream definitions (simple pick/drop today, extensible for more types).
- Task lifecycle and state transitions (robot + worksites).
- Core loop: assign tasks, park, charge, resume.
- Where "generic" rules live (shared across orchestrators).

Non-goals (MVP):
- High-level optimization (multi-criteria scheduling).
- Dynamic map editing while active.
- Safety planner and obstacle avoidance (robot side).

## 3. Canonical contracts and compatibility
- Canonical domain contracts live in `spec/99_pozostale.md` (worksites/streams/tasks).
- This spec adds **behavioral rules** and **user-facing semantics**.
- `occupancy` values are `unknown|empty|filled|reserved` (strict, no legacy mapping).
- Streams use **explicit worksiteId lists** only (no group names in canonical streams).

## 4. Minimal data model (behavior view)
### 4.1 Worksite (runtime)
```
worksite: {
  worksiteId: "PICK_01",
  worksiteType: "pickup|dropoff|buffer|charger|park",
  groupId: "PICK-GROUP",           // optional metadata (not used by canonical streams)
  entryNodeId: "LM10",
  actionNodeId: "AP_PICK_01",
  occupancy: "empty|filled|reserved|unknown"
}
```

### 4.2 Stream (simple pick/drop)
```
stream: {
  streamId: "stream_1",
  kind: "pickDrop",
  enabled: true,
  params: {
    pickGroup: ["PICK_01", "PICK_02"],
    dropGroup: ["DROP_01", "DROP_02"], // ordered list
    pickParams: {                       // optional, shared for whole stream (MVP)
      operation: "ForkLoad",
      start_height: 0.1,
      end_height: 0.5,
      recognize: true,
      recfile: "plt/p0001.plt",
      rec_height: 0.1
    },
    dropParams: {                       // optional, shared for whole stream (MVP)
      operation: "ForkUnload",
      start_height: 0.5,
      end_height: 0.1,
      recognize: false
    },
    pickPolicy: { selection: "filled_only" },
    dropPolicy: {
      selection: "first_available_in_order",
      accessRule: "preceding_empty",
      commitDistanceM: 8
    }
  },
  meta: { label: "Inbound" }
}
```

### 4.3 Robot state (orchestrator view)
```
robot: {
  robotId: "RB-01",
  status: "online|offline|blocked",
  nodeId: "AP9",
  battery: 0.72,
  loadState: "empty|loaded",    // orchestrator-level state (derived)
  lastSeenTsMs: 0
}
```
Note: `loadState` may be derived from task progression and fork actions and can be
absent from the external contract if not used by UI.

## 5. Generic domain rules (shared by all orchestrators)
These rules are independent of stream type and MUST be applied by core:
- **Pick** (robot completes pickup at source worksite):
  - worksite occupancy -> `empty`
  - robot load state -> `loaded`
  - update is atomic (single event)
- **Drop** (robot completes drop at target worksite):
  - worksite occupancy -> `filled`
  - robot load state -> `empty`
  - update is atomic (single event)
- **Illegal transitions** are rejected:
  - cannot pick from `empty`
  - cannot drop to `filled`
  - robot cannot pick when already `loaded`

These transitions are performed by core as part of task progression and logged.

## 6. Single-robot behavior (simple stream)

### 6.1 Reference scenario (MVP dev loop)
Use this as the baseline scenario for spec, tests, and developer workflow.

Scene fixture:
- `scenes/fixtures/line_pick_drop` (single robot, single pick, single drop).

Initial state:
- `RB-01` online, `loadState=empty`.
- `PICK_01` occupancy = `filled`.
- `DROP_01` occupancy = `empty`.
- `stream_pick_drop` enabled (pickGroup `PICK_01`, dropGroup `DROP_01`).
- `stream_pick_drop` enabled (pickGroup `PICK_01`, dropGroup `DROP_01`).

Expected loop:
1) Orchestrator selects `PICK_01 -> DROP_01` and creates a task.
2) Task steps: move to pick → pick → move to drop → drop.
3) On pick completion:
   - `PICK_01` occupancy becomes `empty`.
   - robot `loadState` becomes `loaded`.
4) On drop completion:
   - `DROP_01` occupancy becomes `filled`.
   - robot `loadState` becomes `empty`.
   - task completes (end of task lifecycle).
5) If no new tasks:
   - if a `park` worksite exists, send robot to park.
   - otherwise stay idle at the current node.

Variations for testing:
- `PICK_01=empty` or `DROP_01=filled` => no task created.
- Change `PICK_01` to `filled` while robot is idle => new task created.
- If robot disconnects mid-task => task pauses/holds and resumes after reconnect.

Observability (MUST):
- Events: `taskCreated`, `taskUpdated`, `worksiteUpdated`, `robotUpdated`.
- Core exposes current task + worksite states over `/api/v1/state` (or SSE).

Note: fixtures may include `initialState` for worksites (test harness); if not
implemented in core yet, set the initial occupancy via UI or a bootstrap script.

### 6.2 Behavior loop (simple stream)
The orchestrator executes a loop:
1) If robot has active task: follow task steps.
2) Else:
   - check stream candidates (filled source + empty target).
   - if candidate exists -> assign task.
   - else -> send robot to parking.

Task steps for simple stream:
1) Move to source (entry/action node).
2) Pick (fork action).
3) Move to target.
4) Drop (fork action).
5) If no new task: park (separate idle command, not part of the task).

Selection rules (simple stream):
- **pickPolicy.selection = filled_only**: pick only from `filled` worksites.
- **dropPolicy.selection = first_available_in_order**: pick first `empty` worksite
  in `dropGroup` order.
- **dropPolicy.accessRule = preceding_empty**: drop worksite N is eligible only if
  all preceding worksites in order are `empty`.
- **commitDistanceM**: once robot is within this distance to the chosen drop,
  the target is locked and cannot change.

State machine (single robot, user view):
- `idle` -> `moving_to_pick` -> `picking` -> `moving_to_drop` -> `dropping` -> `idle`
- `idle` -> `parking` (when no tasks)
- `parking` -> `moving_to_pick` (when task appears)
- `charging` can preempt `parking` if battery low

**Decision boundary**:
- A new task may be assigned while robot is on an edge,
  but route change is applied at the next node (no mid-edge retarget).

### 6.2.1 MVP0 detailed execution (single robot, Level0)
This is the **implementable** view of MVP0 (walking skeleton). It assumes:
- `trafficMode=NONE`, single active robot only.
- Routing is done by the robot (Core sends only LM/AP target).
- Pick/Drop are **composite** `goTarget` commands with `operation=ForkLoad/ForkUnload`.

State machine (MVP0, user-facing):
```text
IDLE
  | (candidate task exists)
  v
MOVE_TO_PICK --(task_status 2->4/6)--> PICK_DONE
  |                                    |
  | (error/offline/timeout)            v
  +--> ERROR/HOLD                  MOVE_TO_DROP
                                         |
                                         | (task_status 2->4/6)
                                         v
                                      DROP_DONE
                                         |
                                         | (next task available)
                                         v
                                      MOVE_TO_PICK
                                         |
                                         | (no tasks)
                                         v
                                       PARKING
```

Selection rules (simple stream, MVP0):
- `pickPolicy.selection=filled_only`: pick only from `filled`.
- `dropPolicy.selection=first_available_in_order`: choose first `empty` from `dropGroup` (in order).
- `dropPolicy.accessRule=preceding_empty`: drop N only if all previous are `empty`.
- If no candidates → park (idle command).

Task creation:
- Happens in the same tick when robot is `idle` and a candidate exists.
- Reservation for source + target is created **when the first goTarget is issued**.

Step execution (MVP0):
- `goTarget` to pick with `operation=ForkLoad` (no separate `forkHeight` step).
- `goTarget` to drop with `operation=ForkUnload`.
- Completion of a step is detected via `task_status` transition (2→4 or 2→6).

Task completion and chaining:
- Task completes immediately after the drop step completes.
- If another task is available, start it **without** parking between tasks.
- Parking is issued only when there are no available tasks.

Fail-safe (MVP0):
- Any command error, timeout, or offline state → `ERROR/HOLD`.
- No automatic retry; manual recovery is required.

## 6.3 Simplifications (MVP simple stream)
- **Task completion** happens immediately after the drop action completes.
- **Parking is not a task step**. It is an idle action after tasks are done.
- **Back-to-back tasks**: if another task is available, the robot MUST start it
  without parking between tasks.
- **Reservation timing**: in simple stream, source + target are reserved at the
  moment the first move command is issued (same tick as task creation).
- **Ordering**: `dropGroup` is already ordered in the stream definition;
  orchestrator MUST follow that order (no group resolution in MVP).
- **Pick/Drop params** (prototype): use the same parameters for all pick steps
  and the same parameters for all drop steps (e.g., fork heights). Per‑worksite
  params are planned later.
- **Composite commands only**: in the prototype we always send `goTarget` with
  `operation = ForkLoad | ForkUnload` (no split `forkHeight` steps).
- **Error strategy (MVP)**: on any command/route error the system enters
  `error` state and stops (no retry; manual recovery required).

## 6.9 LoadState derivation (MVP + future)

### 6.9.1 MVP rule (task-derived)
- `loadState` is derived **only** from task progression:
  - after `ForkLoad` completion -> `loaded`
  - after `ForkUnload` completion -> `empty`
- If task fails/cancels mid-way, **do not change** `loadState` (keep last known).
- Initial `loadState` may be `unknown` or provided by scene seed.

### 6.9.2 Future rule (multi-source)
When telemetry provides reliable load sensors:
1) **Sensor telemetry** (highest priority):
   - examples: `goods_region`, `roller_isFull`, `hook_isFull`, `fork_pressure_actual`
   - if telemetry indicates load/unload, it overrides task-derived state.
2) **Task progression** (fallback):
   - use ForkLoad/ForkUnload completion events as in MVP.
3) **Manual override** (explicit operator action):
   - allowed only if sensor is unavailable or uncertain.

### 6.9.3 Optional metadata
To expose confidence and source:
```
loadState: "empty|loaded|unknown",
loadStateSource: "task|sensor|manual|unknown",
loadStateConfidence: "high|low"
```

## 6.4 Missing behavior (MUST add later)
- Detailed recovery strategy for `no_route`, `blocked`, `offline`, manual override.
- Retry policy + backoff (automatic recovery).
- Task cancellation/retargeting semantics when occupancy changes mid‑task.
- Timeout policy for task start/progress/completion (and how to suspend timers during deliberate pause).

## 6.5 Pick/Drop command shape (MVP)
Simple stream MAY issue a single command that combines navigation + fork action:
- `goTarget` with `operation = ForkLoad | ForkUnload`.
- The only place-specific field is `id` (LM/AP); all other params come from
  stream-level `pickParams` / `dropParams` (prototype default).

Example (ForkLoad with recognition):
```json5
{
  "id": "LM1",
  "operation": "ForkLoad",
  "recfile": "plt/p0001.plt",
  "recognize": true,
  "rec_height": 0.1,
  "start_height": 0.1,
  "end_height": 0.5
}
```

Example (ForkLoad without recognition):
```json5
{
  "id": "LM1",
  "operation": "ForkLoad",
  "recfile": "plt/p0001.plt",
  "recognize": false,
  "start_height": 0.1,
  "end_height": 0.5
}
```

Example (ForkUnload, no recognition):
```json5
{
  "operation": "ForkUnload",
  "recognize": false,
  "start_height": 0.5,
  "end_height": 0.1
}
```

Notes:
- `recfile` points to a pallet profile (size/shape); required when `recognize=true`.
- For unload, `id` MAY be omitted if robot is already at target.
- Prototype always uses composite commands; split mode is a future fallback.

## 6.6 Simple stream command model (expanded, MVP)

### 6.6.1 Command type and payload
- Every pick/drop step is issued as **one** `goTarget` command with:
  - `operation = ForkLoad` (pickup) or `operation = ForkUnload` (drop).
  - `id = <LM/AP>` resolved from worksite (see below).
- `forkHeight` is **not** used in MVP for pick/drop.
- All fields other than `id` come from stream-level `pickParams` / `dropParams`.

Payload is built as:
```
goTargetPayload = {
  id: targetNodeId,
  ...pickParams|dropParams
}
```

### 6.6.2 Target resolution (single hop)
- If `actionNodeId` exists, use it as the target.
- Else use `entryNodeId`.
- There is **no** entry→action two-step in MVP; pick/drop is a single hop.

### 6.6.3 Parameter ownership and defaults
- **MVP rule:** stream-level `pickParams` and `dropParams` apply to all worksites.
- Per-worksite overrides are **not** supported yet (planned later).
- `operation` is required and MUST be `ForkLoad` or `ForkUnload`.
- Recommended fields (stream-level):
  - `start_height`, `end_height` (meters),
  - `recognize` (bool),
  - `recfile` (pallet profile, required when `recognize=true`),
  - `rec_height` (recognition height, optional).
- Additional fields are forwarded as-is to the robot and ignored by core.

`recfile` handling (MVP):
- `recfile` is a **string** that references a pallet profile stored on the robot.
- Fleet Manager does not validate or manage `recfile` contents in MVP; it simply forwards the string.
- Future: Fleet Manager SHOULD manage pallet profiles (catalog + upload + validation).

Default values (prototype fallback):
- `pickParams`:
  - `operation: "ForkLoad"`
  - `start_height: 0.1`
  - `end_height: <pickHeightM or 1.2>`
  - `recognize: false`
- `dropParams`:
  - `operation: "ForkUnload"`
  - `start_height: <pick end height>`
  - `end_height: <dropHeightM or 0.1>`
  - `recognize: false`

### 6.6.4 Reservation timing (simple stream)
- Reservation is created **when the first goTarget is issued** (same tick as task creation).
- Both source and target are reserved at once.
- Reservation is released on task completion, cancel, or fail.

### 6.6.5 Task completion and chaining
- Task completes immediately after the drop command step completes.
- If another task is available, it starts **without** parking between tasks.
- Parking is issued **only** when no tasks are available.

### 6.6.6 Error handling (prototype)
- Any command/route error moves the system to `error` state and stops dispatch.
- Examples: invalid target, command rejected, no route, provider offline/timeout.
- Recovery is manual (reset/clear error); no retry/backoff in MVP.

## 6.7 Task lifecycle signal from robot (MVP)

### 6.7.1 Completion signal (observed in logs)
The **primary signal that a task has finished** is a change in `task_status`
reported by the robot in state telemetry. Observations from real captures:
- `task_status=2` during execution (running).
- Completion signaled by **transition**:
  - `2 -> 4` (observed in unload sessions), or
  - `2 -> 6` (observed in load sessions).

Current MVP rule:
```
task_completed = (prev_task_status == 2) && (current_task_status in [4, 6])
```

### 6.7.2 Active signal (to confirm)
We expect the robot to acknowledge task start by switching to:
```
task_active = (current_task_status == 2)
```
Open question: do we **wait** for `task_status=2` before treating the task as
active, or do we assume it is active immediately after ACK (apiNo+10000)?

### 6.7.3 Error signal (TBD)
We need to identify which `task_status` values represent errors on real robots.
When detected, the system MUST:
- enter `error` mode,
- stop dispatch,
- optionally issue a `stop` command,
- wait for manual recovery.

### 6.7.4 Validation checklist (MUST)
These conditions MUST be validated in real logs:
- Which tasks use `2 -> 4` vs `2 -> 6` completion?
- Are there terminal error statuses distinct from `4/6`?
- How long after `goTarget` ACK does `task_status` change to `2`?
- Does `task_status` ever stay at `6` while a ForkLoad/ForkUnload is executing?
- Which `task_status` values represent error/cancel/abort on real robots?
- Do some operations complete without ever entering `task_status=2`?
- How `task_status` behaves during operator pause/resume (does it freeze or change)?
- Are there telemetry fields that indicate recognition success/failure (`recognize=true`)?

### 6.7.5 Telemetry source and correlation (MVP)
Source of `task_status`:
- The value comes from gateway telemetry (see `10_adapters-robokit.md`).
- Preferred source: `robot_status_task_req` (1020), fallback to `status_all*`.

Correlation rule (MVP):
- There is no reliable `taskId` in robot telemetry.
- Core treats `task_status` as **robot‑level** state and applies the transition rule
  to the currently active task for that robot.
- If multiple commands are in flight, Core MUST gate on the current step
  (do not advance multiple steps on one status change).

## 6.8 Reservation policy under errors (MVP + future)

### 6.8.1 MVP rule (freeze-on-error)
- On any error the system enters `error` state and **stops dispatch**.
- All active reservations are **frozen** (not released automatically).
- Recovery is manual:
  - **Resume**: keep reservations and continue the task.
  - **Abort**: mark task `failed/canceled` and **release** its reservations.

### 6.8.2 Future policy (after MVP)
We will split errors into classes:
- **Transient** (offline, blocked, operator pause):
  - keep reservations,
  - suspend timeout counters,
  - resume later without re-planning.
- **Terminal** (invalid target, command rejected, no route):
  - fail task immediately,
  - release reservations,
  - emit error event with reason.

Loaded robot rule (future):
- If pickup already completed and drop failed, do **not** release drop reservation
  automatically (robot still carries goods). Only manual abort may clear it.

Timeout rule (future):
- Reservations will have TTL/lease.
- TTL must **pause** when task is deliberately paused by operator.
- If TTL expires, task enters `stale` state and awaits manual decision.

## 7. Reservation and consistency
- When a task is created, source and target worksites are reserved.
- Another task cannot reserve the same worksite.
- Reservation is released on completion/cancel/fail.

## 8. Multi-robot behavior
For multiple robots, each tick:
1) Compute availability: online, not blocked, no active task.
2) Build candidate tasks from all streams.
3) Assign tasks:
   - dispatch policy: `nearest` or `first` (tie-breaker by robotId).
   - avoid over-allocating the same worksite (reservation).
4) Robots without tasks -> park.

Fairness:
- Use aging: older tasks gain priority.
- Prevent starvation: max-wait threshold triggers priority boost.

## 9. Multi-stream arbitration
When multiple streams are enabled:
- Each stream produces candidates.
- Arbitration chooses tasks based on:
  - `stream.priority` (default 0)
  - fairness/aging across streams
  - resource constraints (reserved worksites, robot availability)

Optional policies:
- `roundRobin`: rotate streams each tick.
- `quota`: max tasks per stream per window.
- `preempt`: allow high-priority stream to take next available robot.

## 10. Parking and charging
### Parking
- If no assignable tasks exist, robot is sent to `parkNodeId`.
- While moving to parking, robot remains `available`.

### Charging (basic)
- If battery below `chargeStartThreshold`, robot may be routed to charge point.
- If battery above `chargeStopThreshold` or a task becomes available, charging may end.
- Charging rules are separate from stream logic but participate in assignment priority.

## 11. Advanced stream types (planned)
New stream types should be pluggable without breaking the core loop:
- **buffered**: source -> buffer -> target (two-stage).
- **roundRobin**: cycle through `dropGroup` in fixed order.
- **batch**: pickup N items before first drop.
- **replenish**: keep target worksites (from `dropGroup`) above a threshold.
- **shuttle**: fixed shuttle between two nodes.

Each type MUST define:
- candidate generation rules,
- reservation rules,
- task build logic.

## 12. Stream handler interface (internal)
```
streamHandler: {
  evaluate(state) -> candidates,
  buildTask(candidate) -> task,
  onTick?(task, robot, state) -> taskUpdate
}
```
Core handles generic transitions (§5) and persistence.

## 13. UI / Core / Gateway interaction
- UI defines streams/worksites in a scene and activates it via core.
- Core runs orchestrator and emits tasks/commands.
- Gateway executes robot commands against the provider (sim/robot).
- UI only reads state from core (no local logic).

## 14. Testing requirements
For each stream type:
- Unit: candidate generation from small scenes.
- Integration: full task lifecycle with simulated robot.
- E2E: UI -> core -> gateway -> sim, with deterministic fixtures.
