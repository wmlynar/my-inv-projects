# Testing Strategy

## Unit Tests
- `core-time`, `core-reservations`, `core-scheduler`, `core-timing`.
- Legacy traffic-core unit coverage migrated into core-time/reservations/timing/scheduler tests.

## Property Tests
- `core-reservations` uses fast-check to ensure no overlaps.

## Contract Tests
- `traffic-runner` contract tests run the same suite across strategies.

## E2E Tests
- `sim-cli` runs corridor and intersection scenes.
- Replays written to `e2e/replays/*.jsonl`.
- Script-based suites live in `apps/*/scripts` and `e2e/scripts`.
  - Runner: `e2e/scripts.test.mjs` (sequential wrapper).
  - See `docs/architecture/legacy-tests.md` for coverage and overrides.

## Legacy Coverage
- `legacy/` is archival and excluded from lint/format by default.

## Commands
- `npm --prefix tools/fleet-manager run test:unit`
- `npm --prefix tools/fleet-manager run test:e2e`
