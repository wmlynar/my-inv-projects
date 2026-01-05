# Status Contract (Robokit <-> Fleet Manager)

This repo uses two representations for task state:

- Robokit `task_status` numeric codes in status APIs.
- Fleet-manager/core task `status` strings in `/api/status` tasks.

The contract below keeps the two consistent.

## Mapping

| Robokit `task_status` | Meaning | Core task status |
| --- | --- | --- |
| `0` | Idle / no active task | _(none)_ |
| `2` | Running | `in_progress` |
| `3` | Paused / blocked | `paused` |
| `4` | Completed | `completed` |
| `6` | Failed / cancelled | `failed`, `cancelled` |

## Notes

- `task_status` is robot-level; it reflects the current task when active and the last terminal task result when idle.
- `task.status` is task-level and always string-based.
- `cancelled` maps to `6` so schedulers can treat it as a terminal failure state.
