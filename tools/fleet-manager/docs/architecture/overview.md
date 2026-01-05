# Architecture Overview

## Goal
Layered, modular architecture with clear boundaries and deterministic planning.

## Package Layers

```
apps/*
  -> traffic-runner
  -> sim-runtime
  -> adapters-*

traffic-runner
  -> core-mapf
  -> core-planning-single
  -> core-scheduler
  -> core-reservations
  -> core-timing

sim-runtime
  -> core-scheduler
  -> core-timing
  -> core-time
  -> core-graph

core-*
  -> core-types
  -> core-time
```

## Data Flow

```
snapshot -> plan intent -> schedule -> reservation tx -> commit -> dispatch
```

- Snapshot: current world state
- Plan intent: route per robot
- Schedule: time-annotated segments
- Reservation tx: conflict-safe allocation
- Commit: apply reservations atomically
- Dispatch: apply to runtime executor

## Legacy Snapshot
The original `/home/inovatica/seal/rds` contents are preserved under `legacy/` for reference.
Production code in `packages/` and `apps/` must not import from `legacy/` (enforced by
`tools/scripts/check-no-legacy-imports.mjs`).
