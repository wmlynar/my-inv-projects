# fleet-ui

Minimalny serwer statyczny dla UI.

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
- `scenes.scenes[].maps[].fileName` (plik grafu)
- `scenes.scenes[].maps[].data.{graph,workflow,robots,packaging}` (nadpisanie danych per mapa)

Mozesz tez wskazac inny plik przez `FLEET_UI_MOCK_CONFIG=/path/to/config.json`.

## Kontrakty danych (skrot)

- `public/data/graph.json`: `meta`, `nodes`, `edges`, `lines`, `areas`
- `public/data/workflow.json5`: `groups`, `bin_locations`, `occupancy`, `streams`
- `public/data/robots.json`: `models`, `robots`
- `public/data/packaging.json`: struktura jak w starym UI

## Konfiguracja API

UI uzywa `GET /api/fleet/config` do nadpisania `apiBase`, `pollMs` i `simMode`.

## Podmiana backendu

- Utrzymaj `/api/fleet/*` za reverse proxy do realnego core,
- albo zwroc `apiBase` z `GET /api/fleet/config`, wskazujacy na realny backend.

## Walidacja

Checklisty walidacji znajdziesz w `VALIDATION.md`.

## Testy E2E

```bash
node tests/map.e2e.test.js
```
