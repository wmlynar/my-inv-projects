# Task Manager Architecture

This module is intentionally small and layered so new changes stay local.

## Layers

1. **Domain**
   - Models + State (`domain/`).
2. **Use-cases**
   - Small functions for each operation (`usecases/`).
2. **Scheduler**
   - Decision logic: observe → decide → plan actions.
3. **Adapters**
   - Robokit TCP, RDS HTTP, persistence.
4. **API**
   - HTTP server mapping requests to the scheduler/state.

## Data model (core)

State is the single source of truth:

```
State = {
  robots: Map<id, Robot>,
  worksites: Map<id, Worksite>,
  tasks: Map<id, Task>,
  map: MapGraph,
  assignments: Map<robotId, Assignment>
}
```

## Scheduler flow

1. Observe robot status → update state.
2. Choose candidate pick/drop.
3. Select robot (strategy).
4. Emit actions (e.g. `go_target`).
5. Executor performs actions and reports results.

## Events

- Events are logged to `state/events.jsonl`.
- Current reducer handles `WorksiteUpdated`.

## Pluggable strategies

- Robot selection: `closest_idle`, `round_robin`.
- Route policy: `none` (default) or `edge_lock`.

## Collision avoidance (edge_lock)

This is the only built-in collision-avoidance mechanism. It is dispatch-time path reservation,
not continuous motion control. Obstacle avoidance is handled inside the robot controller,
so the scheduler focuses on path reservations to prevent head-on conflicts.

1. For each dispatch, resolve the robot start node:
   `current_station` -> `last_station` -> nearest node by `x/y`.
2. Build a directed graph from `graph.json` (respect edge direction).
3. Find the shortest path (Dijkstra-like) from start to target.
4. Convert the path into:
   - edge locks (edgeGroupKey = undirected pair like `A<->B`, edgeKey = directed `A->B`)
   - node locks (nodeId + edgeGroupKey)
5. Try to reserve all locks:
   - if an edgeGroupKey is already locked by another robot in the *opposite* direction,
     the dispatch is rejected.
   - same-direction sharing is allowed by default (`allowSameDirection = true`), configurable via `ROUTE_POLICY_EDGE_LOCK_ALLOW_SAME_DIRECTION`.
   - node locks use the same edgeGroupKey rule to avoid conflicting intersections.
6. On success, the robot's previous locks are released and replaced with the new path locks.
7. While a task is in progress (or a dispatch is pending), locks are refreshed every tick.
8. On restart, tasks in progress re-seed their locks using current robot status before new dispatches.
9. On arrival, all locks for that robot are released.
10. Locks expire automatically after 15s (configurable via `ROUTE_POLICY_EDGE_LOCK_TIMEOUT_MS`) to recover from stale reservations.

If `ROUTE_POLICY=none`, no collision avoidance is applied by the scheduler.

## State persistence

- Task/worksite state is stored in JSON files with `schemaVersion`.
- v0 data is auto-upgraded to v1 on write.
