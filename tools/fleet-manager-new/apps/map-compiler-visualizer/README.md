# map-compiler-visualizer (skeleton)

Viewer for `sceneGraph.json` + `compiledMap.json` based on the map layout in `apps/fleet-ui-mock/public`.

## Run

```bash
node apps/map-compiler-visualizer/cli/cli.js --dir ./compiled --open false
```

## Endpoints

- `GET /api/scene-graph`
- `GET /api/compiled-map`
- `GET /api/meta` (optional)
- `GET /api/report` (optional)
- `GET /api/config`
