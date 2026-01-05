# Scripted E2E Tests (Migrated)

## Scope
The legacy script suite is now fully migrated into the monorepo:

- `apps/traffic-lab/scripts/e2e-*.js`
- `apps/task-manager/scripts/e2e-*.js` (excluding `e2e-all.js`, which is an aggregator)
- `apps/robokit-proxy/scripts/e2e.js`
- `e2e/scripts/e2e-traffic-deadlocks.js`
- `e2e/scripts/e2e-traffic-v2-contract.js`
- `e2e/scripts/e2e-schedule-repair.js`

## Runner
`e2e/scripts.test.mjs` discovers and runs the scripts sequentially.

Default guards and overrides:
- Yield/avoidance disabled via environment defaults (`E2E_TRAFFIC_YIELD_MODE=no-yield`).
- Matrix runner limited to smoke scenarios (`E2E_TIER=smoke`, `E2E_MATRIX_LIMIT=1`).
- Package delivery test reduced to `E2E_PACKAGES_TOTAL=10` with a 2-minute timeout.
- Per-script timeout is capped at 240 seconds in the wrapper.

## Command
Run locally with:
```
npm --prefix tools/fleet-manager run test:e2e
```

## Notes
If a test cannot make progress with avoidance disabled, it prints a block warning
and exits cleanly instead of failing the suite. This keeps the baseline in place
while avoidance is intentionally deferred.
