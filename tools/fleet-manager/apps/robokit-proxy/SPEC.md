# Robokit Proxy Logging Spec

## Goals

- Preserve full bidirectional TCP streams for later decoding.
- Keep a single ordered event log per connection.
- Allow optional split logs for quick filtering.

## Directory Layout

For each accepted connection:

```
logs/<mapping>/<connId>/
  meta.json
  traffic.jsonl
  c2s.bin
  s2c.bin
  c2s.jsonl    (optional)
  s2c.jsonl    (optional)
```

`connId` is a timestamp + counter to keep order stable.

## meta.json

```json
{
  "id": "1699999999999-1",
  "mapping": {
    "name": "core",
    "listenPort": 19208,
    "targetHost": "192.168.1.50",
    "targetPort": 19208
  },
  "options": {
    "logBinary": true,
    "logBase64": true,
    "logAscii": true,
    "logSha256": false,
    "splitLogs": false,
    "asciiPreviewLimit": 160
  },
  "startedAt": "2025-01-01T12:00:00.000Z",
  "client": { "address": "1.2.3.4", "port": 54321 },
  "server": { "address": "192.168.1.50", "port": 19208 }
}
```

## traffic.jsonl

One JSON object per line, ordered by capture time.

Common fields:

```json
{
  "seq": 1,
  "ts": "2025-01-01T12:00:00.100Z",
  "t_rel_ms": 100,
  "dir": "c2s",
  "len": 123,
  "offset": 0,
  "base64": "...",
  "ascii": "...",
  "sha256": "..."
}
```

Field notes:
- `seq`: monotonically increasing per connection.
- `t_rel_ms`: milliseconds since connection start.
- `dir`: `c2s`, `s2c`, or `info`.
- `len`: byte length of this chunk.
- `offset`: byte offset inside `c2s.bin` or `s2c.bin` (only when `logBinary=true`).
- `base64`: full payload (only when `logBase64=true`).
- `ascii`: preview (only when `logAscii=true`).
- `sha256`: hash of the payload (only when `logSha256=true`).

`info` entries use the same fields minus `len/offset` and include:

```json
{ "dir": "info", "message": "connection_open" }
```

## Binary Streams

- `c2s.bin` stores all bytes from client to server.
- `s2c.bin` stores all bytes from server to client.
- `offset` + `len` from `traffic.jsonl` map back to these files.

## Optional Split Logs

If `splitLogs=true`, `c2s.jsonl` and `s2c.jsonl` contain only entries
for that direction (same format as `traffic.jsonl`).

## Capture Semantics

- Logs are recorded on TCP chunk boundaries, not on protocol frame boundaries.
- Protocol-level message boundaries must be reconstructed in analysis.
