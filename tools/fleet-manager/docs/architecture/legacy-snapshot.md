# Legacy Snapshot

## Purpose
Preserve the original `/home/inovatica/seal/rds` repository content for reference
while the new modular architecture evolves.

## Location
Legacy content lives under `tools/fleet-manager/legacy/` and mirrors the old
top-level layout (examples: `fleet-traffic-core`, `fleet-sim-core`, `shared`,
`task-manager`, `robokit-*`, `seer`, `sanden-spec`, `docs`, `docs-project`).

## Exclusions
The snapshot excludes generated or transient artifacts:
- `.playwright-browsers/`
- `__pycache__/`
- `node_modules/`
- `.git/`
- `logs/`, `logs-rds/`

## Policy
- No imports from `legacy/` are allowed in `packages/` or `apps/`.
- Enforcement: `tools/scripts/check-no-legacy-imports.mjs`.

## Rationale
Keeping the legacy snapshot intact reduces risk during refactors and enables
incremental porting without blocking new architecture work.
