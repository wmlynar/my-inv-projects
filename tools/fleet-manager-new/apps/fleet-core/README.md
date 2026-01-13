# fleet-core (skeleton)

Minimal HTTP skeleton for Fleet Core based on `spec/01_fleet-core.md`.

## Run

```bash
node bin/fleet-init.js
node apps/fleet-core/cli/cli.js
```

## Endpoints (stub)

- `GET /api/v1/health`
- `GET /api/v1/state`
- `GET /api/v1/events` or `GET /api/v1/events/stream` (SSE keepalive)
- `POST /api/v1/control-lease/seize`
- `POST /api/v1/control-lease/renew`
- `POST /api/v1/control-lease/release`
- `POST /api/v1/scenes/import`
- `POST /api/v1/scenes/activate`
- `GET /api/v1/scenes`
- `POST /api/v1/tasks`
- `POST /api/v1/robots/{robotId}/commands`
- `POST /api/v1/robots/{robotId}/provider-switch`
