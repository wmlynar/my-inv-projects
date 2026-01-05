# Operations Guide

## Typical run order

1) Start `robokit-proxy` (if you want to capture traffic).
2) Start `robokit-sim` (TCP simulator).
3) Start `task-manager`.
4) Start `fleet-manager` UI.

## Ports

Default ports:
- `robokit-proxy`: whatever you define in `config.json5`
- `robokit-sim` state: `19204`
- `robokit-sim` control: `19205`
- `robokit-sim` task: `19206`
- `robokit-sim` other: `19210`
- `robokit-sim` push: `19301`
- `task-manager`: `7071`
- `fleet-manager`: `3000`

## Health endpoints

- `robokit-sim`: check TCP port (e.g. `nc -vz 127.0.0.1 19204`)
- `task-manager`: `GET http://127.0.0.1:7071/health`
- `fleet-manager`: `GET http://127.0.0.1:3000/health`

## Common resets

- Clear proxy logs: delete `robokit-proxy/logs/`.
- Clear task-manager state: delete `task-manager/state/*.json`.
- Clear UI state: clear browser localStorage for the UI origin.

## Troubleshooting checklist

- Proxy: check that Roboshop connects to proxy IP/port, not directly to robot.
- Logs missing: confirm `logDir` exists and permissions allow writes.
- Task-manager idle: verify `worksites.json` has `filled=true` on some pick.
- UI empty: verify `fleet-manager/public/data/graph.json` and `workflow.json5`.
