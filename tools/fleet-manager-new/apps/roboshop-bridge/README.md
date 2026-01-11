# roboshop-bridge (skeleton)

CLI skeleton for the Roboshop bridge based on `spec/05_roboshop-bridge.md`.

## Run

```bash
node apps/roboshop-bridge/cli/cli.js import-scene \
  --scene-name warehouseA \
  --smap ./exports/warehouseA.smap \
  --worksites ./exports/worksites.json5 \
  --streams ./exports/streams.json5 \
  --robots ./exports/robots.json5 \
  --core-url http://localhost:8080/api/v1 \
  --activate true
```
