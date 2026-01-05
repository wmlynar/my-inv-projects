# Analysis Workflow (Robokit TCP)

## 1) Prepare proxy

Edit `robokit-proxy/config.json5`:
- set `targetHost` to the real robot IP
- set `listenPort`/`targetPort` for each TCP port you want to observe

Start proxy:

```bash
npm --prefix /home/inovatica/seal/rds/robokit-proxy start
```

## 2) Point Roboshop to proxy

In Roboshop, set robot IP to the proxy machine IP and keep the same port.
Roboshop will then connect to the proxy, which forwards to the real robot.

## 3) Generate traffic

Perform actions in Roboshop (status query, task issue, map load, etc).
This creates log folders under `robokit-proxy/logs/`.

## 4) Inspect logs

Each connection has:
- `traffic.jsonl` (ordered events)
- `c2s.bin` and `s2c.bin` (raw streams)

Use `traffic.jsonl` to find message boundaries and offsets.

Example: read first 64 bytes from `c2s.bin`:

```bash
python3 - <<'PY'
import pathlib
path = pathlib.Path("robokit-proxy/logs/core/<connId>/c2s.bin")
print(path.read_bytes()[:64].hex())
PY
```

## 5) Identify framing

Because logs are TCP chunks, you must reconstruct protocol frames.
Typical patterns to look for:
- length prefix (2 or 4 bytes)
- fixed header + payload
- request id fields

Record findings in `docs/PROTOCOL_NOTES.md`.

## 6) Iterate

Capture more scenarios:
- connect + handshake
- status query
- start/stop navigation
- task dispatch
- error handling
