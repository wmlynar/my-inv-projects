# algorithm-service (skeleton)

Minimal HTTP skeleton for Algorithm Service based on `spec/03_algorithm-service.md`.

## Run

```bash
node apps/algorithm-service/cli/cli.js --config apps/algorithm-service/configs/algo.local.json5
```

## Endpoints (stub)

- `GET /algo/v1/health`
- `POST /algo/v1/initScene`
- `POST /algo/v1/decide`
