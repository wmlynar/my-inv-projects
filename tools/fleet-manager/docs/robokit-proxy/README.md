# Robokit Proxy Logger

TCP proxy that sits between Roboshop and the robot (or simulator) and logs traffic in both directions.

## Run

```bash
npm --prefix /home/inovatica/seal/rds/robokit-proxy start
```

Profile example:

```bash
PROXY_PROFILE=local npm --prefix /home/inovatica/seal/rds/robokit-proxy start
```

## Throttling

Limit how many times each API number is logged (default: 100 per API, c2s only).

```json
{
  "throttle": {
    "enabled": true,
    "maxPerApi": 100,
    "directions": ["c2s"],
    "logSuppressed": true,
    "excludeApis": [],
    "maxBodyLength": 1048576
  }
}
```

## E2E

Validates that the proxy captures Robokit traffic between the task manager and simulator.

```bash
npm --prefix /home/inovatica/seal/rds/robokit-proxy run e2e
```

By default it reads:
- `/home/inovatica/seal/rds/robokit-proxy/config.json5`

Override with:

```bash
CONFIG_PATH=/path/to/config.json5 npm --prefix /home/inovatica/seal/rds/robokit-proxy start
```

You can also set `PROXY_PROFILE` (uses `config-<profile>.json5` in this folder).

## Config

Example mapping (`config.json5`):

```json5
{
  "bindHost": "0.0.0.0",
  "logDir": "./logs",
  "asciiPreviewLimit": 160,
  "logBinary": true,
  "logBase64": true,
  "logAscii": true,
  "logSha256": false,
  "splitLogs": false,
  "mappings": [
    {
      "name": "robod",
      "listenPort": 19200,
      "targetHost": "192.168.1.50",
      "targetPort": 19200
    },
    {
      "name": "state",
      "listenPort": 19204,
      "targetHost": "192.168.1.50",
      "targetPort": 19204
    },
    {
      "name": "ctrl",
      "listenPort": 19205,
      "targetHost": "192.168.1.50",
      "targetPort": 19205
    },
    {
      "name": "task",
      "listenPort": 19206,
      "targetHost": "192.168.1.50",
      "targetPort": 19206
    },
    {
      "name": "config",
      "listenPort": 19207,
      "targetHost": "192.168.1.50",
      "targetPort": 19207
    },
    {
      "name": "kernel",
      "listenPort": 19208,
      "targetHost": "192.168.1.50",
      "targetPort": 19208
    },
    {
      "name": "other",
      "listenPort": 19210,
      "targetHost": "192.168.1.50",
      "targetPort": 19210
    },
    {
      "name": "push",
      "listenPort": 19301,
      "targetHost": "192.168.1.50",
      "targetPort": 19301
    },
    {
      "name": "api-legacy",
      "listenPort": 5045,
      "targetHost": "192.168.1.50",
      "targetPort": 5045
    }
  ]
}
```

Roboshop must connect to the proxy IP/ports, not directly to the robot.

## Logs

For each connection the proxy writes:

- `logs/<mapping>/<connId>/meta.json`
- `logs/<mapping>/<connId>/traffic.jsonl`
- `logs/<mapping>/<connId>/c2s.bin`
- `logs/<mapping>/<connId>/s2c.bin`
- `logs/<mapping>/<connId>/c2s.jsonl` (optional)
- `logs/<mapping>/<connId>/s2c.jsonl` (optional)

Each JSONL entry has:

```json
{
  "seq": 1,
  "ts": "2025-01-01T12:00:00.000Z",
  "t_rel_ms": 12,
  "dir": "c2s",
  "len": 123,
  "offset": 0,
  "base64": "...",
  "ascii": "...",
  "sha256": "..."
}
```

Directions:
- `c2s` = Roboshop -> robot
- `s2c` = robot -> Roboshop
- `info` = connection events

See `SPEC.md` for full logging format and options.

## Notes

- This is a TCP proxy. If Roboshop uses other protocols (UDP, multicast), those are not captured.
- To capture *all* traffic without reconfiguring Roboshop, you would need OS-level redirection (iptables) or packet capture (tcpdump), which requires root. The proxy is the simplest first step for reverse-engineering behavior.
