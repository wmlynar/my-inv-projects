# ADR 0005: Legacy Snapshot Scope

## Context
The original `/home/inovatica/seal/rds` repository contains multiple services,
vendor SDKs, and archived assets that are not yet refactored into the new
modular architecture.

## Decision
Copy the full top-level content of `/home/inovatica/seal/rds` into
`tools/fleet-manager/legacy/` as an archival snapshot, excluding generated
caches and logs (`.playwright-browsers/`, `__pycache__/`, `node_modules/`,
`.git/`, `logs/`, `logs-rds/`).

## Consequences
- We retain a complete reference of the previous system without blocking
  new package boundaries.
- Production code remains clean: `packages/` and `apps/` must not import
  from `legacy/` and are guarded by a CI check.
- Later migrations can selectively port legacy modules into new packages
  with explicit ownership and tests.
