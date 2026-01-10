# Robokit Robot Console Controller

Simple keyboard controller for RoboKit robots and the simulator. It speaks the RoboCore TCP protocol over CTRL/OTHER/CONFIG/STATE ports and renders a live status view in the terminal.

## Run

```bash
npm --prefix /home/inovatica/seal/monorepo/tools/fleet-manager-new/apps/robokit-robot-console-controller start
```

Custom host/ports:

```bash
node /home/inovatica/seal/monorepo/tools/fleet-manager-new/apps/robokit-robot-console-controller/index.js \
  --host 127.0.0.1 \
  --state-port 19204 \
  --ctrl-port 19205 \
  --other-port 19210 \
  --config-port 19207
```

## Keys

- Enter: enable soft EMC
- Backspace: release soft EMC
- Arrow Up: forward
- Arrow Down: backward
- Arrow Left: rotate left
- Arrow Right: rotate right
- Space: stop robot and stop forks
- Plus/Minus: increase/decrease target speed by 0.1 m/s
- Q/W: decrease/increase target angular speed by 5 deg/s
- A/Z: fork up/down by 0.1 m
- P: seize control (lock)
- L: release control (unlock)
- Ctrl+C: quit

Notes:
- Hold arrow keys to keep motion active; holding two arrows blends linear + angular motion.
- Target speeds are clamped to be non-negative.

## Options

- `--host` (default: 127.0.0.1)
- `--state-port` (default: 19204)
- `--ctrl-port` (default: 19205)
- `--other-port` (default: 19210)
- `--config-port` (default: 19207)
- `--nick-name` (default: console-controller)
- `--speed` initial target speed in m/s (default: 0.6)
- `--omega-deg` initial target angular speed in deg/s (default: 15)
- `--poll-ms` status polling interval (default: 200)
- `--send-ms` motion send interval (default: 100)
