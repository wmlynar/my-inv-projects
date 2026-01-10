# Proxy/Recorder Runbook

Presets:
- `robokit-all` – RoboKit TCP ports plus HTTP (no Modbus by default).
- `robokit-all-no-lasers` – same listener list as `robokit-all`, plus binary-tail logging and laser/point-cloud suppression for AI-friendly captures.
- `simulator-proxy` – proxy standard RoboKit ports to a local simulator running on alt ports.

## Starting a session
1. `proxy-recorder start --session 2026-01-07_robot_RB-01_gotarget_smoke --description "goTarget + forkHeight smoke" --preset robokit-all --robot-id RB-01 --upstream-host 10.0.0.11`
2. CLI creates the session under `~/robokit_logs/<YYYY-MM-DD_HH_MM>_<targetKind>_<sessionName>/`.
3. If you omit `--session`, the CLI sanitizes the description and prefixes it with the timestamp so you don't have to invent a name.

Example command:
```
cd /home/inovatica/seal/monorepo/tools/fleet-manager-new
node apps/proxy-recorder/cli/cli.js start \
  --description "omijanie przeszkod - po czym poznac avoid_path" \
  --preset robokit-all-no-lasers \
  --robot-id counterbalast \
  --upstream-host 192.168.192.5 \
  --bind-host 127.0.0.1
```

Simulator + proxy wiring (no port collisions):
```
# start simulator on alternate ports
SIM_PROFILE=simulator-proxy npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager-new/apps/robokit-robot-sim start

# start proxy on standard RoboKit ports and forward to simulator
cd /home/inovatica/seal/monorepo/tools/fleet-manager-new
node apps/proxy-recorder/cli/cli.js start \
  --description "simulator comparison run" \
  --preset simulator-proxy \
  --robot-id counterbalast
```
Notes:
- The `simulator-proxy` profile runs the simulator on 29xxx/18xxx ports so it does not collide with RoboKit defaults.
- In Roboshop, point the robot IP/host to `127.0.0.1` and keep the standard RoboKit ports (`19200/19204/19205/19206/19207/19208/19210/19301`).
- If Roboshop runs on a different machine, set the proxy listeners to `0.0.0.0` and use the proxy host IP in Roboshop.

## Output layout
```
<sessionDir>/
  session.meta.json5
  listeners.json5
  manifest.json            # after archive
  tcp/
    <listenerName>/
      connections.jsonl
      conn_<connId>_raw_000001.jsonl
      conn_<connId>_frames_000001.jsonl
  http/
    <listenerName>/
      requests_000001.jsonl
  archive/
    <sessionName>.zip
```

Default logging is AI-friendly (frames + HTTP entries). TCP raw bytes are disabled by default to avoid redundant copies, but HTTP bodies (scene uploads, downloads, etc.) are captured so binary maps are preserved. If a Robocore frame has no JSON body, the binary body is stored in `binaryTailBase64` even when raw bytes are disabled. Enable replay when needed by setting `limits.captureRawBytes=true` in the config.

## Capture tuning
The `capture` section of the preset or the new CLI flags let you tune which payload fields make it into the logs and which RoboCore APIs include the raw frame. These choices are recorded inside `session.meta.json5`/`config.effective.json5`, and the `notes` array is augmented with a short explanation of anything suppressed.

- `--suppress-lasers` or `capture.omitLasers`: drop the `lasers` field from decoded JSON to avoid capturing the large laser sweep arrays.
- `--suppress-point-cloud` or `capture.omitPointCloud`: drop the point-cloud payloads for the same disk-savings reason.
- `--capture-comment`: write a free-text remark into the capture metadata to document trade-offs for later reviewers.
- `--raw-frame-apis` (comma-separated list of API numbers): even when `includeRawFrameBase64=false`, write the raw RoboCore frame for the listed APIs so you can replay the sequence that matters.

The data is merged from the CLI flags and preset, so you can toggle capture behavior without touching the codebase.

## Archiving
`proxy-recorder archive --session <name> --root-dir ~/robokit_logs [--delete-raw true]`
- Creates `archive/<sessionName>.zip`.
- Writes `manifest.json` with SHA256 checksums.
- Optional `--delete-raw true` removes `tcp/` and `http/` after archiving.

## Status / list
- `proxy-recorder status --session <name> --root-dir ~/robokit_logs`
- `proxy-recorder list-sessions --dir ~/robokit_logs`

## Replay
`proxy-recorder replay --session <name> --listener <listener> --conn <connId> --target-host <host> --target-port <port> --dir c2s --decode`
- Replays `conn_<connId>_raw_*.jsonl` with original timing (`tsMs` deltas).

## Troubleshooting
- If a port is already in use, the process exits with code 2.
- If `--fail-fast=true` and upstream is unreachable, the process exits with code 3.
