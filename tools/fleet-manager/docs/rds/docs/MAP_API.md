# Map API

This module provides a stable API for reading `.smap` or `graph.json` files so
you do not have to re-parse the raw map each time. It uses a streaming `.smap`
reader by default to avoid loading the full file into memory.

References from the scraped wiki:
- `.smap` is a JSON export of Protobuf data.
- Coordinates are meters, precision >= 0.001m.
- Map coordinates are in the world coordinate system.
Sources: `scraped/wiki_all/pages/304_HzsJwoKR2iXN41kFfRccfk1hnld_smap-map-format-file-parsing.html`,
`scraped/wiki_all/pages/400_WTclwDKhYiANgJk9QDncKTngnqd_smap.html`.

## Load

```js
const { MapApi } = require('../shared/map_api');
const { RobokitClient } = require('../shared/robokit_client');

const map = MapApi.load('/path/to/map.smap'); // or graph.json
console.log(map.getMeta());

const robot = new RobokitClient({ host: '127.0.0.1' });
robot.getStatusLoc().then(console.log);
```

More: `docs/ROBOKIT_CLIENT.md`.

## What It Parses

- `header` -> `meta` (map name, bounds, resolution)
- `advancedPointList` -> `nodes` (ActionPoint, LocationMark, ChargePoint, ParkPoint)
- `advancedCurveList` -> `edges` (Bezier curves, includes `props.direction`)
- `advancedLineList` -> `lines` (FeatureLine with direction arrow + drive backward)
- `advancedAreaList` -> `areas`
- `binLocationsList` -> `bins` (grouped locations + `pointName`)

All fields are preserved when loading `graph.json`. For `.smap`, the loader
normalizes into the same `nodes/edges/lines/areas/bins` layout.

## Key APIs

```js
const map = MapApi.load('/path/to/map.smap');

// nodes
map.getNode('AP20');
map.listActionPoints();
map.listLocationMarks();
map.findNearestNode(-154.1, -47.2);

// edges
map.listEdgesFrom('LM1', { respectDirection: true });

// lines (direction + backward driving)
map.listLines();
map.getLineDirection('0'); // -> { dirVec, driveBackward }

// bins
map.getBin('DROP-01');
map.listBins();
```

## Line Direction Handling

FeatureLine entries include:
- `direction` (sign indicates forward vs backward driving)
- `directionPosX/Y` (arrow point for direction)

`MapApi.matchLineForSegment()` can be used to find the best matching line and
direction for a segment. It checks distance and angle thresholds.

## Streaming `.smap` parse

The loader extracts only selected top-level fields (header, points, curves,
lines, areas, bins) to keep memory usage low. You can disable streaming by
setting `SMAP_STREAM_PARSE=0`. Chunk size can be tuned with
`SMAP_STREAM_CHUNK`.
