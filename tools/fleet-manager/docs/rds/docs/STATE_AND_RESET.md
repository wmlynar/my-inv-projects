# State and Reset

## task-manager state

Files:
- `task-manager/state/worksites.json`
- `task-manager/state/tasks.json`

Reset:
- Stop task-manager.
- Delete the files above or replace with empty defaults.

## fleet-manager UI state

The UI stores worksite state in browser localStorage.
To reset:
- open the app in a browser
- clear site data for the UI origin

## robokit-proxy logs

Logs live under `robokit-proxy/logs/`.
To reset:
- stop proxy
- delete the `logs/` directory or specific connection folders
