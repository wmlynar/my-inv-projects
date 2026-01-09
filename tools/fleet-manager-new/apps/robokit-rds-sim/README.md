# Robokit RDS Simulator (HTTP)

Minimal HTTP stub plus a lightweight RoboCore TCP responder that emulates RDSCore
behaviour for local testing.

## Run

```bash
npm --prefix /home/inovatica/seal/fleet-manager-new/apps/robokit-rds-sim start
```

Profile example:

```bash
SIM_PROFILE=local npm --prefix /home/inovatica/seal/fleet-manager-new/apps/robokit-rds-sim start
```

Defaults:
- HTTP ports: `8088`
- HTTP host: `127.0.0.1`
- TCP ports: `19204` (state), `19207` (config), `19208` (kernel)
- TCP host: `0.0.0.0`

Config via env:
- `HTTP_PORTS`
- `HTTP_HOST`
- `HTTP_MAX_BODY`
- `HTTP_SCENE_ZIP_PATH` (zip with scene export for `/downloadScene`)
- `HTTP_CORE_PARAMS_PATH` (defaults to `rds_params.json`)
- `HTTP_PROFILES_B64` (base64 payload for `/getProfiles`)
- `HTTP_ROBOTS_STATUS_B64` (base64 payload for `/robotsStatus`)
- `STATE_PORT`
- `CONFIG_PORT`
- `KERNEL_PORT`
- `BIND_HOST`
- `MAX_BODY_LENGTH`

TCP responses are backed by:
- `data/rds_info.json` (info response for `1000`)
- `data/rds_init.json` (init response for `1111`)
- `data/rds_status_all.json` (status response for `1100`)
- `rds_params.json` (params response for `1400`)
- `rds_device_types.json` (device types response for `1500`)

HTTP canned responses (optional):
- `data/http_getProfiles.b64`
- `data/http_robotsStatus.b64`
