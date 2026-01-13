# fleet-gateway

HTTP gateway for robot providers (internalSim, simDirect, robokitSim, robocore) based on `spec/02_fleet-gateway.md`.

## Run

```bash
node bin/fleet-init.js
node apps/fleet-gateway/cli/cli.js
```

## Endpoints

- `GET /gateway/v1/health`
- `GET /gateway/v1/robots`
- `GET /gateway/v1/robots/{robotId}/status`
- `POST /gateway/v1/robots/{robotId}/commands`
- `POST /gateway/v1/robots/{robotId}/provider-switch`
