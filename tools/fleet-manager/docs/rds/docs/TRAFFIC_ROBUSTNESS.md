# Traffic Robustness Layer

This document describes the shared robustness pipeline used by all traffic strategies
and how to configure it in `robotsConfig.traffic`.

## Pipeline (shared for all strategies)

The robustness layer is a single middleware-style pipeline:

1. Planner -> produces a topological path or MAPF plan.
2. TimingModel -> assigns expected travel time + uncertainty using observed stats.
3. Scheduler -> converts path to time windows with slack buffers.
4. ReservationManager -> reserves edges/nodes and critical sections atomically.
5. ExecutorMonitor -> tracks slip vs schedule, detects risk before conflicts.
6. RepairEngine -> retimes the schedule without changing the path.
7. ReplannerTrigger -> escalates to replan if repair fails or holds are too long.

Code entry points:
- Planner/Scheduler/Repair: `fleet-sim-core/src/sim.js`
- Reservation table: `fleet-traffic-core/src/traffic_reservations.js`
- Strategy options: `fleet-traffic-core/src/traffic_strategies.js`

Core modules (single source of truth):
- Time + interval semantics: `fleet-traffic-core/src/core/time.js`
- Reservation invariants + transactions: `fleet-traffic-core/src/core/reservations.js`
- Robustness profile mapping: `fleet-traffic-core/src/core/robustness_profile.js`
- Observed travel timing model: `fleet-traffic-core/src/core/timing_model.js`
- Critical-section tokens: `fleet-traffic-core/src/core/critical_sections.js`
- Schedule build + repair logic: `fleet-traffic-core/src/core/scheduler.js`

## Strategy integration contract

Strategies only own the **Planner** (path/topology/MAPF plan) and optional
priority heuristics. Everything else (timing, slack, reservations, repair,
replan triggers) comes from the shared robustness layer:
- A strategy must not implement its own slack, safety buffers, or repair logic.
- Strategy knobs map to `traffic.robustness` profiles/overrides.
- The same pipeline executes regardless of `strategy` choice.

## Observed travel times + dynamic slack

Observed travel stats are stored per edge, per robot, and per robot-edge:
- EWMA for expected travel time.
- p95 window for uncertainty and slip.

Dynamic slack:
```
slack = clamp(baseSlackMs + k * slipP95, minSlackMs, maxSlackMs)
```
Critical sections get an extra multiplier (`criticalSections.slackMultiplier`).

## Runtime behavior (how it works)

### Happy path
1. Planner produces a path or MAPF plan.
2. TimingModel computes `expectedMs` and `uncertaintyMs` per segment.
3. Scheduler builds a time schedule with slack and turn delays.
4. ReservationManager reserves:
   - edge windows (with safety),
   - node dwell windows,
   - critical section token for the whole section span.
5. ExecutorMonitor enforces:
   - wait until `startTime` when at segment start,
   - wait for critical section window before entry,
   - entry-hold before single-lane segments when the next slot starts in the future.
6. On segment completion, actual travel time and slip are recorded and feed the TimingModel.

### When timing deviates
- If the robot is late beyond `repair.failFastThresholdMs`,
  the system flags a reservation violation and attempts repair.
- Repair retimes the remaining schedule without changing the path:
  earliest feasible slot >= cursor for each segment.
- If no slot exists within horizon or beyond `repair.maxRetimingMs` -> replan.
- If a robot holds longer than `repair.maxHoldMs` on blocking reasons
  (`reservation_wait`, `reservation_entry`, `critical_section_wait`, `node_lock`, `edge_lock`)
  -> replan trigger.

### Reservation lifecycle (safety first)
- All reservations use **[start, end)** time semantics in milliseconds.
- The reservation manager applies **safety buffers** when reserving
  (scheduler uses raw travel/dwell; the table expands windows).
- Resources are keyed uniformly (e.g. `edge:<edgeKey>`, `node:<nodeId>`).
- Reservations are committed atomically via transactions (all-or-nothing).
- Edge reservations span `[startTime, arrivalTime)` with safety buffers.
- Node reservations include approach + dwell + clear time.
- Critical section tokens reserve the full section span before entry.
- When a route schedule is replaced (repair/replan), old reservations are released
  and the new schedule is reserved as a whole; on any conflict, reservations are cleared
  and the schedule is rejected.

### Critical sections (admission control)
- Sections are computed from map props or config and attached to schedule entries.
- `ORDERING` rejects routes that would require entering sections out of global order.
- `BANKER` only reserves the next section per route, preventing cycles.
- Executor holds with reason `critical_section_wait` until the section window is valid.

## Forward stop lookahead

`traffic.forwardStopDistanceM` extends the **forward safety corridor** used by
runtime collision checks. It does not change the robot model size; it shifts the
lookahead corridor ahead of the robot by N meters (e.g. 0.5/1/2/3) so the robot
stops earlier when another robot is in that corridor. Default is `0` (no change).

## Schedule repair semantics (retiming only)

Schedule repair is **not** a path replan. It only retimes start windows:
- For each segment: find the earliest non-conflicting slot >= cursor.
- If a conflict is found, search for the next available slot (no abort-on-first).
- If no slot exists within horizon -> escalate (replan trigger).
- Repair respects constraints, turn times, node dwell, and safety margins.

If a robot becomes late, it is held before entering a conflicting window.

## Critical sections (deadlock prevention)

Critical sections can be defined via config or map props:
- Config `traffic.criticalSections.sections` (edge/node lists)
- `graph.nodes[].props.criticalSectionId`
- `graph.edges[].props.criticalSectionId`

Admission control:
- `maxRobotsPerSection` limits concurrency.
- Mode `ORDERING` enforces global section order on a route.
- Mode `BANKER` allows only the next section reservation per route to avoid cycles.

Robots must hold a token before entering a critical section; the executor holds if missing.

## Replan triggers (fail-fast)

Replan is triggered when:
- schedule repair fails (no slot within horizon or beyond max retiming),
- a robot holds longer than `repair.maxHoldMs` in blocking states,
- wait-for cycle resolution picks a victim (yield/replan) after timeout.

## Robustness profiles

Config schema (defaults are profile-based):
```json
{
  "traffic": {
    "strategy": "sipp",
    "robustnessProfile": "balanced",
    "robustness": {
      "baseSlackMs": 120,
      "dynamicSlack": { "enabled": true, "k": 0.8, "min": 120, "max": 360 },
      "timingModel": { "enabled": true, "ewmaAlpha": 0.2, "p95Window": 40 },
      "repair": { "enabled": true, "maxRetimingMs": 10000, "maxHoldMs": 10000, "failFastThresholdMs": 200 },
      "criticalSections": { "enabled": true, "mode": "ORDERING", "maxRobotsPerSection": 1 }
    }
  }
}
```

Backward compatibility:
- Legacy keys (`reservationHorizonMs`, `scheduleSlackMs`, `scheduleSlackMinMs`, etc.)
  are mapped into the new robustness schema.

## Chaos runner (random delays)

Chaos injection is optional:
```json
{
  "traffic": {
    "chaos": {
      "enabled": true,
      "seed": 12345,
      "segmentDelayMs": [0, 300],
      "stopChance": 0.08,
      "stopDurationMs": [200, 600]
    }
  }
}
```

E2E test:
```
npm --prefix /home/inovatica/seal/rds/fleet-manager run e2e-traffic-robustness
```
Env overrides:
- `E2E_ROBUST_SEED`
- `E2E_ROBUST_DURATION_MS`
- `E2E_ROBUST_INTERVAL_MS`
- `E2E_ROBUST_DEADLOCK_MS`

## Metrics and diagnostics

Diagnostics (`getDiagnostics`) now exposes:
- `traffic.metrics.counts` (holds, repairsSucceeded, repairsFailed, replans,
  deadlockWarnings, reservationViolations)
- `traffic.metrics.slip` (p50/p95)
- `traffic.metrics.criticalWait` (p50/p95)
- `traffic.criticalSections` config snapshot
- `traffic.chaos` (seed + ranges when enabled)
- `traffic.waitGraph` (only when debug enabled)

Use metrics to compare profiles and tune `robustness` parameters.
