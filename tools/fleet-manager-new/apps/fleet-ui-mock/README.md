# fleet-ui-mock

Minimalny serwer statyczny dla mock UI.

## Start

```bash
npm start
```

## Ustawienia

- `PORT` (domyslnie 8091)
- `HOST` (domyslnie 0.0.0.0)

## Mock API

Serwer wystawia:

- `GET /api/fleet/config`
- `GET /api/fleet/state`
- `GET /api/fleet/status`
- `GET /api/fleet/stream` (SSE)

Zwracany jest prosty status robotow z ruchem po grafie.

## Konfiguracja

Plik `mock-config.json` pozwala wskazac inne pliki danych i parametry symulacji.

- `data.graph`, `data.workflow`, `data.packaging`, `data.robots`
- `sim.speed`, `sim.pollMs`, `sim.simMode`
- `scenes.activeSceneId`, `scenes.scenes[]`

Mozesz tez wskazac inny plik przez `FLEET_UI_MOCK_CONFIG=/path/to/config.json`.
