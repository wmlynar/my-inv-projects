# fleet-ui validation checklist

## Zakres
Checklisty dla migracji UI (bez uruchamiania starego prototypu).

## 1) Walidacja statyczna (bez uruchamiania)
- Struktura `public/` zgodna z oryginalnym UI:
  - `index.html`, `styles.css`, `app.js`,
  - `domain_*.js`, `packaging_engine.js`,
  - `public/data/*` (graph, workflow, robots, packaging).
- Kolejnosc skryptow w `public/index.html` bez zmian (zaleznosci domenowe przed `app.js`).
- Struktura DOM mapy zachowana:
  - `.map-wrap`, `#map-svg`, `#mini-map-svg`,
  - `#worksite-menu`, `#manual-menu`, `#map-menu`,
  - panel warstw `#map-layer-panel` (jesli uzywany).
- Klasy CSS mapy i menu niezmienione:
  - `map-edge`, `map-node`, `map-links`, `robot-marker`, `worksite-marker`,
  - `obstacle-marker`, `map-robots`, `map-obstacles`, `map-layer-hidden`.
- Kontrakty danych w `public/data/*`:
  - `graph.json`: `meta`, `nodes`, `edges`, `lines`, `areas`,
  - `workflow.json5`: `groups`, `bin_locations`, `occupancy`, `streams`,
  - `robots.json`: `models`, `robots`,
  - `packaging.json`: struktura bez zmian.
- Mock API utrzymuje ksztalt odpowiedzi:
  - `GET /api/fleet/config` zwraca `apiBase`, `pollMs`, `simMode`,
  - `GET /api/fleet/state|status` zwraca `robots[]` z `pose`, `speed`, `battery`,
  - `GET /api/fleet/stream` utrzymuje SSE.
- Interakcje mapy w `public/app.js`:
  - istnieja `initWorksiteMenu`, `initManualMenu`, `initMapMenu`,
  - istnieja `bindMapInteractions` i `bindKeyboardShortcuts`.

## 2) Walidacja uruchomieniowa (opcjonalnie)
- Uruchom `npm start` i sprawdz brak bledow konsoli.
- Na mapie widoczny graf, worksites, roboty oraz minimapa.
- Menu kontekstowe pojawia sie po prawym kliknieciu w wolnym polu mapy.
- Ruch robotow widoczny (znaczniki zmieniaja pozycje w czasie).

## 3) E2E (opcjonalnie)
- `node tests/map.e2e.test.js`
