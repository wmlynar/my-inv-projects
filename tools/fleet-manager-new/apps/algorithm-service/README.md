# algorithm-service (skeleton)

Minimal HTTP skeleton for Algorithm Service based on `spec/03_algorithm-service.md`.

## Run

```bash
node bin/fleet-init.js
node apps/algorithm-service/cli/cli.js
```

## Endpoints (stub)

- `GET /algo/v1/health`
- `POST /algo/v1/initScene`
- `POST /algo/v1/decide`
