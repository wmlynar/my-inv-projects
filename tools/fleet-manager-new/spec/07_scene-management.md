# Scene Management (v0.2)

## 1. Goals
- Jedno zrodlo prawdy dla scen: **fleet-core**.
- Wygodne tworzenie scen: UI, CLI, import SMAP, import z robota, generatory testowe.
- Spójne uruchamianie i synchronizacja: UI -> core -> gateway -> symulator/robot.
- Sceny trwale pomiedzy restartami, z wersjonowaniem i audytem.
- Proste testy: sceny male, deterministyczne, latwe do generowania i replay.

## 2. Compatibility (no legacy at this stage)
Na tym etapie rozwoju (przed pierwszym releasem) **NIE utrzymujemy kompatybilnosci wstecznej**.
Nie wspieramy legacy layoutow ani automatycznych migracji. Format moze sie zmieniac
bez ostrzezenia, a jedynym zrodlem prawdy jest ta specyfikacja.

## 3. Definitions
- **Scene**: logiczna scena operacyjna (mapa + roboty + workflow + parametry).
- **Scene Package**: katalog/zip z plikami sceny (layout ponizej).
- **Scene Hash**: niezmienny hash paczki (np. sha256 manifestu + plikow).
- **Active Scene**: aktualnie uruchomiona scena w core.
- **Scene Source**: skad scena pochodzi (upload SMAP, download z robota, generator).

## 4. Responsibility split
### fleet-core (source of truth)
- import, walidacja, kompilacja map, wersjonowanie, persystencja.
- aktywacja sceny + broadcast do SSE.
- synchronizacja sceny do gateway i algorithm-service.
- logowanie (event log + snapshoty).

### fleet-gateway (execution)
- przyjmuje aktywacje sceny i przekazuje do providerow (symulator/robot).
- utrzymuje status synchronizacji (ACK/ERROR).
- nie jest zrodlem prawdy dla scen.

### UI
- tylko klient: tworzy/importuje scene i aktywuje ja przez core.
- nie przechowuje stanu scen.

### Symulator / robot provider
- przyjmuje scene z gateway (lub pobiera z core po scenieId+hash).
- raportuje status zaladowania.

## 5. Scene Package layout (MUST, kanoniczny)
Kanoniczny layout ma **root paczki** jako katalog sceny (zip nie moze zawierac
dodatkowego poziomu `scene/`). `manifest.json5` jest zawsze w root.

```
<scene-root>/
  manifest.json5             # MUST (SceneManifest)
  map/
    graph.json               # MUST (SceneGraph dla UI)
    raw.smap                 # MAY (import-only, opcjonalny artefakt)
    assets/                  # MAY (np. obrazki tla)
  compiled/
    compiledMap.json         # MUST (kanon dla algorytmu/runtime)
    meta.json                # SHOULD (statystyki kompilacji, hashes)
  config/
    worksites.json5          # MUST (dla MVP)
    streams.json5            # MUST (dla MVP)
    robots.json5             # MAY (konfiguracja robotow)
    actionPoints.json5       # MAY (akcje AP, np. widly)
    packaging.json           # MAY
  README.md                  # MAY
```

`manifest.json5` minimal:
```
{
  sceneId: "scene-warehouse",
  sceneName: "Warehouse",
  createdTsMs: 1760000000000,
  contractsVersion: "fm-contracts-v0.x",
  source: { type: "smap-upload", notes: "" },
  checksums: { "compiled/compiledMap.json": "sha256:..." }
}
```

### 5.1 Scene bez SMAP (tylko JSON)
Scena **moze** istniec bez `map/raw.smap`. Wymagane sa wtedy tylko JSON-y:
`map/graph.json`, `compiled/compiledMap.json`, `config/worksites.json5`,
`config/streams.json5` + `manifest.json5`.

### 5.2 Programistyczne tworzenie sceny
Scena moze byc wygenerowana w pelni programistycznie (bez SMAP).
Minimalny krok po kroku:
1) Utworz katalog sceny (root paczki).
2) Zapisz `map/graph.json` (SceneGraph).
3) Zapisz `compiled/compiledMap.json` (kanon runtime).
4) Zapisz `config/worksites.json5` i `config/streams.json5`.
5) Zapisz `manifest.json5` z `sceneId`, `sceneName`, `createdTsMs`,
   `contractsVersion` i `checksums` dla plikow kanonicznych.
6) (Opcjonalnie) `compiled/meta.json`, `config/robots.json5`,
   `config/actionPoints.json5`, `config/packaging.json`, `map/assets/`.

Wersja minimalna musi przejsc walidacje core i miec spojne referencje ID
pomiedzy `graph.json`, `worksites.json5` i `streams.json5`.

### 5.3 SMAP import policy (strict)
- SMAP jest **tylko** zrodlem importu. Po imporcie kanonem sa JSON-y.
- Core **nie uzywa** `raw.smap` w runtime. Domyslnie moze go **nie zapisywac**.
- Import z SMAP jest **all-or-nothing**: brak czesciowego importu.
- Jesli SMAP zawiera elementy nieobslugiwane, core **MUST** zwrocic blad walidacji
  z lista nieobslugiwanych sekcji/pol. Komunikat dla uzytkownika ma jasno mowic,
  ze trzeba rozszerzyc format/specyfikacje (np. z pomoca AI) i powtorzyc import.

## 6. Scene lifecycle
1) **Import**
   - UI/CLI -> core: SMAP (zrodlo importu) lub Scene Package.
   - core: walidacja, kompilacja map, zapis paczki, wyliczenie hashy.
   - core: import z SMAP jest scisly (bez legacy i bez cichych pominiec).
2) **Activate**
   - UI -> core: `sceneId` (i opcjonalnie `sceneHash`).
   - core: oznacza active scene, publikuje SSE.
   - core -> gateway: activate scene + hash + `activationId`.
3) **Sync**
   - gateway -> provider: load scene.
   - gateway -> core: status sync (ready/error).
4) **Deactivate / Delete**
   - core: usuwa lub archiwizuje scene.

### 6.1 Scene sync (MVP, prosty i jednoznaczny)
Cel: jedna komenda aktywacji + asynchroniczny status z gateway, bez legacy.

Statusy:
- `activeScene.mode`: `activating` -> `active` | `error`
- `activeScene.sync.state`: `pending` | `syncing` | `ready` | `error`

Flow:
1) UI -> Core: `POST /api/v1/scenes/activate`
2) Core:
   - waliduje `sceneId`/`sceneHash`
   - zapisuje event `sceneActivationRequested`
   - ustawia `activeScene.mode=activating`
   - generuje `activationId`
   - wysyla do gateway `POST /gateway/v1/scenes/activate`
3) Gateway:
   - zwraca szybkie ACK (202)
   - laduje scene do providerow
   - raportuje status do Core: `POST /api/v1/scenes/sync`
4) Core:
   - `ready` -> `activeScene.mode=active`, event `sceneActivated`
   - `error` -> `activeScene.mode=error`, event `sceneActivationFailed`

Payloady (kanoniczne):
```
POST /gateway/v1/scenes/activate
{
  activationId: "act_01JH...",
  sceneId: "scene_warehouse",
  sceneHash: "sha256:...",
  sceneUrl: "http://core/api/v1/scenes/scene_warehouse/package?hash=sha256:..."
}
```

```
POST /api/v1/scenes/sync
{
  activationId: "act_01JH...",
  state: "ready", // pending | syncing | ready | error
  providerId: "robokit-sim-01",
  message: "loaded",
  tsMs: 1760000000000
}
```

Idempotencja:
- Gateway MUSI traktowac powtorzenia `activationId` jako idempotentne.
- Core moze powtorzyc aktywacje, gdy nie dostal sync w czasie `syncTimeoutMs`.

## 7. APIs (core)
- `POST /api/v1/scenes/import` (zip lub JSON wskazujacy na katalog)
- `POST /api/v1/scenes/activate` `{ sceneId, sceneHash? }`
- `POST /api/v1/scenes/{sceneId}/activate` (MAY: alias dla UI)
- `POST /api/v1/scenes/sync` (status z gateway)
- `GET /api/v1/scenes` (lista + aktywna + status sync)
- `GET /api/v1/scenes/:id` (manifest + meta)
- `POST /api/v1/scenes/:id/clone` (opcjonalnie)
- `POST /api/v1/scenes/:id/delete`

## 8. APIs (gateway)
- MVP: `POST /gateway/v1/scenes/activate` (wywolanie load sceny na providerach).
- Status jest zwracany do Core przez `POST /api/v1/scenes/sync` (z gateway).

## 9. Persistence and versioning
- core przechowuje sceny w `sceneStoreDir`.
- kazda zmiana sceny tworzy nowa wersje (hash).
- `activeSceneId` + `activeSceneHash` w state.
- core loguje: import, activate, delete, sync status.

## 10. Scene sources
### A) New scene from SMAP
- UI upload SMAP + config (worksites/streams, opcjonalnie robots/actionPoints)
- core kompiluje SMAP -> graph.json + compiledMap.json
- gdy SMAP zawiera nieobslugiwane elementy: import musi wyraznie zwrocic blad

### B) New scene from robot
- UI wybiera robotId + "download map"
- core -> gateway -> robot: downloadScene
- core zapisuje paczke sceny

### C) Generated scenes for tests
- sceny male i deterministyczne (seed)
- fixtures trzymane w repo tylko gdy male
- repo fixtures: `scenes/fixtures` (pakiety zgodne z tym layoutem)
- duze sceny poza repo (np. `~/fleet_scenes`)

## 11. Testing and fixtures (MUST)
- Unit tests: sceny minimalne (2-5 wezlow).
- Integration/E2E: sceny srednie, wersjonowane, deterministyczne.
- Każda scena testowa ma `sceneId`, `sceneHash`, `compiledMapHash`.

## 12. UX flows (UI)
- New scene wizard: name -> robot(s) -> map source -> workflow -> save -> activate.
- Quick start: "new scene" + "add sim robot" + "upload smap".
- Status: UI pokazuje `sceneSync` (core/gateway/sim).
- After startup: UI lists available scenes from core and lets user activate any scene.
- Empty state: if no scenes exist, UI shows "Add scene" CTA.

### 12.1 Scene catalog (MVP SHOULD)
- Core loads a scene catalog from `sceneStoreDir` on startup.
- `GET /api/v1/scenes` returns the full catalog + active scene.
- UI uses this to render a scene selector and activation buttons.

### 12.2 Add scene after startup (MVP SHOULD)
- User can import a new scene at any time (no restart).
- Import -> catalog updated -> UI shows new scene -> user can activate it.

## 13. Non-goals (MVP)
- Multi-tenant scenes.
- Live edit map geometry while active.
- Automatic merge of scene versions.

## 14. Notes
- UI powinno byc statyczne: wszystkie operacje scen idą do core.
- Gateway nie przechowuje sceny jako zrodlo prawdy, jedynie jako runtime cache.

## 15. Dev bootstrap (single scene folder)
Goal: developer can run the whole stack by pointing to a single scene folder.

Requirements:
- Core SHOULD support `--scene-dir <path>` (or `SCENE_DIR`) to import on startup.
- Core SHOULD support `--auto-activate` to activate the imported scene.
- UI reads only from core (`/api/v1`), no local scene logic.
- Gateway is pointed at core and receives only runtime commands.

Example flow (future CLI):
```
fleet-core --config ./configs/fleet-core.local.json5 \
  --scene-dir ./scenes/warehouse_01 \
  --auto-activate
```
UI then starts as a static frontend pointing to core.
