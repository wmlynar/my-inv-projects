# Release 0.1 Definition of Done

## Checklist
- CLI runs scenes with seed and outputs replay.
- Unit tests green for core-time, core-reservations, core-scheduler.
- Property tests green for reservations.
- Contract tests green for traffic-runner.
- E2E tests green for corridor and intersection scenes.
- No imports from `legacy/` in packages/apps.
- Docs and ADRs updated.
- CI workflow present.

## Release Artifacts
- `apps/sim-cli` binary
- `e2e/replays/*.jsonl`
- `docs/architecture/*`
