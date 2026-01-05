# Migration Guide

Use this when moving the project to a new location or machine.

## 1) Copy the project

Copy the whole directory (including `scraped/`, `docs/`, and `robokit-*`).

Optional: remove `node_modules` to shrink the size and reinstall later.

## 2) Update absolute paths

Some files store absolute paths for reference:
- `scraped/graph.json` -> `meta.source`
- `scraped/workflow.json5` -> `map.source`

These fields are informational; update them if you rely on them.

## 3) Update runtime paths

If you change the location, update env vars as needed:
- `GRAPH_PATH`
- `WORKFLOW_PATH`
- `CONFIG_PATH`

## 4) Reinstall dependencies (if needed)

```bash
npm --prefix /new/path/robokit-proxy install
npm --prefix /new/path/robokit-sim install
npm --prefix /new/path/task-manager install
npm --prefix /new/path/fleet-manager install
```

## 5) Verify

- Start `robokit-proxy` and confirm it binds to ports.
- Start `robokit-sim` and confirm TCP ports respond (e.g. `nc -vz 127.0.0.1 19204`).
- Start `task-manager` and check `GET /api/status`.
- Start `fleet-manager` and load the UI.
