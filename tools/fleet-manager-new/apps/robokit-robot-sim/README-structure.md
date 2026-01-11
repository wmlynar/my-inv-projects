# Robot Simulator (dev tool)

Structure mirrors the proxy to keep tooling consistent:

- `apps/robokit-robot-sim/app/` – runtime adapter (TCP/HTTP/push) and bootstrapping.
- `packages/robokit-sim-core/core/` – simulation engine + state/task/obstacle logic.
- `packages/robokit-protocol/protocol/` – Robokit framing and API mapping.
- `packages/robokit-sim-profiles/profiles/` – JSON5 profiles and defaults loaded via `SIM_PROFILE`.
- `apps/robokit-robot-sim/data/` – static payload fixtures and file lists.
- `apps/robokit-robot-sim/docs/` – runbooks, architecture notes, API mappings, and integration checklists.
- `apps/robokit-robot-sim/tests/` – fixtures, unit tests, and scenario runners to keep simulator behavior deterministic.

Keep new files grouped by layer so the adapter stays thin and reusable.
