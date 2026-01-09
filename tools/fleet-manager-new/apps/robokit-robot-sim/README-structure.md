# Robot Simulator (dev tool)

Structure mirrors the proxy to keep tooling consistent:

- `configs/` – JSON5 presets/environment defaults for simulated robots (ports, paths, strategy).
- `cli/` – command-line helpers for launching the simulator, generating scenarios, and inspecting state.
- `docs/` – runbooks, architecture notes, API mappings, and integration checklists.
- `lib/` – shared helpers, parsers, and adapters for RoboKit framing or RDS APIs.
- `tests/` – fixtures, unit tests, and scenario runners to keep simulator behavior deterministic.

Add more folders/files as we reverse-engineer replayed sessions or extend the simulator with richer behaviors.
