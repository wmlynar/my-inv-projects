# Proxy/Recorder (dev tool)

Structure created to satisfy the spec and future implementation:

- `configs/` – JSON5 config presets and CLI defaults.
- `cli/` – CLI tooling, helpers, parsers, manifest builders.
- `docs/` – operational runbooks, format definitions, archive procedures.
- `tests/` – unit/integration fixtures for parser/archival logic.

Session output layout (under `~/robokit_logs/...`):
- `tcp/` – raw bytes + decoded frames per listener/connection.
- `http/` – request/response logs per listener.
- `archive/` – packaged sessions + manifest.

Defaults are AI-friendly: decoded frames + HTTP logs; raw bytes (TCP copies) are disabled unless `limits.captureRawBytes=true`, while HTTP bodies stay enabled so scene uploads/downloads (map ZIPs) still get saved. If a Robocore frame has no JSON body, the binary body is stored in `binaryTailBase64` so binary-only payloads (e.g., maps) are not lost.

If you omit `--session`, the CLI sanitizes the description and prefixes it with `YYYY-MM-DD_HH_MM`, so you can rely on the timestamped folder name without typing a name explicitly.

You can tune capture noise via the `capture` config (e.g., `omitLasers`, `omitPointCloud`, `rawFrameBase64Apis`) or the new CLI switches (`--suppress-lasers`, `--suppress-point-cloud`, `--raw-frame-apis`), and every choice is echoed in `session.meta.json5` for traceability. The `robokit-all-no-lasers` preset bundles those defaults (all RoboKit listeners + laser/point-cloud suppression + binary tail logging) for AI-friendly captures without extra flags.

Each folder can grow with code, templates, and reference data as we implement the tool.
This layout keeps logs outside the repo itself while still granting easy access for automation.
