# Scene fixtures

Small, deterministic scene packages for algorithm tests and local demos.

- Each fixture follows `spec/07_scene-management.md` (Scene Package layout).
- Maps are tiny to keep compiled artifacts readable in reviews.
- `compiled/compiledMap.json` is generated with `apps/map-compiler` and
  `apps/map-compiler/tests/fixtures/robot_profile.json`.

## Fixtures

- `line_pick_drop`:
  - Single pick + single drop on a straight line.
  - Stream uses group ids (`PICK` -> `DROP`).
- `line_two_drops`:
  - Single pick + two drops in order.
  - Stream uses explicit worksite ids for drop order.
- `disconnected`:
  - Two disconnected graph islands (no path between pick and drop).
  - Useful for testing "no path" handling.

## Notes

- `config/worksites.json5` includes `initialState` for tests. This is a
  fixture-only extension (core may ignore it until implemented).
- If you regenerate compiled artifacts, update checksums in `manifest.json5`.

## Rebuild (per fixture)

```
node apps/map-compiler/cli/cli.js compile \
  --smap scenes/fixtures/<fixture>/map/raw.smap \
  --out-dir /tmp/map-compile \
  --robot-profile apps/map-compiler/tests/fixtures/robot_profile.json
```

Then copy:
- `/tmp/map-compile/sceneGraph.json` -> `map/graph.json`
- `/tmp/map-compile/compiledMap.json` -> `compiled/compiledMap.json`
- `/tmp/map-compile/meta.json` -> `compiled/meta.json`
