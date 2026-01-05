# Fleet Manager

MVP UI for visualizing graph, worksites, robots, and tasks.

## Light DDD layout

Domain logic is split into small, browser-friendly layers:

- `public/domain_store.js`: in-memory store with `update()` and `subscribe()`.
- `public/domain_repos.js`: repositories for robots/tasks.
- `public/domain_services.js`: small robot service for invariants (dispatchable/control/online/manual).

`public/app.js` uses these adapters but still renders UI directly.

## Robots config

You can define multiple robots and a selection strategy in:

`public/data/robots.json`

Example:

```json
{
  "strategy": "nearest",
  "models": {
    "forklift": { "head": 0.5, "tail": 2, "width": 1 }
  },
  "defaultModel": "forklift",
  "traffic": { "strategy": "pulse-mapf-avoid", "dispatchingLength": 12, "avoidanceBlockRadius": 1.4 },
  "robots": [{ "id": "RB-01", "ref": "PICK-03", "model": "forklift" }]
}
```

Robot model:
- `models` holds named footprints (meters): `head` (front of center), `tail` (rear), `width`.
- `defaultModel` applies when a robot has no `model` set.
- Per-robot `model` can be a model name or an inline `{ head, tail, width }` object.
- Model controls the UI footprint and traffic spacing; `radius` overrides the envelope when set.

Traffic strategy:
- `simple` (default), `pulse-mapf` (rolling horizon + queues + node locks),
  `pulse-mapf-avoid` (pulse-mapf + lokalne strefy blokady przy obstacle avoidance),
  `pulse-mapf-time` / `pulse-mapf-v2` (time-window reservations; spec: `docs/traffic_v2_spec.md`),
  `sipp` (segmentowe rezerwacje + locki podczas obstacle avoidance),
  `ecbs-sipp` (time-window + segmenty + weighted planner dla stabilnego rolling horizon),
  `cbs-sipp` (SIPP + konfliktowe przeszukiwanie w oknie czasowym),
  `cbs-full` (CBS tree + SIPP, pełne rozwiązywanie konfliktów),
  `mapf-global` (globalne MAPF w oknie czasowym, rozwiązuje konflikty grupowo),
  `mapf-smt` (time-expanded CSP solver, globalne planowanie bez deadlockow)
- options: `dispatchingLength`, `replanDistance`, `edgeQueues`, `nodeLocks`, `nodeLockRadius`,
  `deadlockTimeoutMs`, `yieldBackoffDistance`, `yieldCooldownMs`, `edgeQueueTimeoutMs`, `yieldBayNodes`,
  `avoidanceZones`, `avoidanceBlockRadius`, `avoidanceReleaseMargin`,
  `reservationHorizonMs`, `reservationStepMs`, `reservationSafetyMs`, `reservationNodeDwellMs`,
  `reservationEntryBuffer`, `allowReservationBackoff`,
  `segmentLength`, `segmentReservations`, `avoidanceLocks`, `plannerWeight`,
  `conflictDepth`, `conflictWaitThresholdMs`, `conflictCooldownMs`,
  `noTurnaround`, `noBackward`
- edge conflicts are auto-derived from graph polylines and treated as mutually exclusive locks
- edge groups keep a short directional hold window (corridor mode) so same-direction platoons clear
  before the opposite direction takes over
- direction-lock counts reflect active holders only; queue head is enforced mainly on direction switches,
  while same-direction followers rely on spacing locks
- yield targets prefer positions behind the current route direction and edge-lock yields require a nearby
  opponent to avoid runaway backoffs
- when no safe yield target exists, robots enter a short stuck backoff and retry

## Routing planner (local sim)

Local sim uses a time-aware A* planner with lightweight reservations:
Core implementation lives in `fleet-sim-core/` and is shared with Robokit mode.
Motion follows an inverted-tricycle kinematic model, so turning consumes time.

- A* with euklidean heuristic, so planning scales better on large graphs.
- Time reservations on edge groups + nodes, so robots do not select the same corridor in the same time window.
- Start/goal snapping to edge polylines (virtual anchors), not only nearest nodes.
- Cost penalties for sharp turns and driving backwards to keep routes smooth.
- Block obstacles remove edges from planning (avoid obstacles are handled by runtime detours).

Tuning is intentionally minimal:
- `ROUTE_PENALTY_FACTOR` in `fleet-manager/local_fleet_sim.js` controls turn/backward penalties.
- Reservation timing is derived from `ROBOT_SPEED_MPS` and the robot envelope (model/radius).
- `noTurnaround` blocks immediate U-turns in planning; `noBackward` skips segments that require reverse driving.

## Roboshop / RBK proxy

Fleet manager exposes the Roboshop HTTP endpoints on `ROBOSHOP_PORT` (default `8088`)
and can also proxy the RBK TCP ports (RDS-style robot API) to an upstream robot/simulator.

Defaults:

- HTTP proxy upstream: `RDS_HOST=127.0.0.1`, `RDS_PORT=8088`
- RBK proxy enabled: `RBK_PROXY_ENABLED=true`
- RBK listen ports: `RBK_PORTS=19200,19204,19205,19206,19207,19208,19210,19301`
- RBK target host: `RBK_TARGET_HOST` (defaults to `RDS_HOST`)
- RBK target port mapping: `RBK_PORT_OFFSET=0` (or `RBK_PORT_MAP=19200:29200,...`)
- HTTP endpoints proxied: `/getProfiles`, `/robotsStatus`, `/downloadScene`, `/uploadScene`,
  `/getCoreParam`, `/saveCoreParam`, `/setOrder`

Example (forward Roboshop + RBK to a local simulator that listens on 292xx):

```bash
RBK_PORT_OFFSET=10000 RDS_HOST=127.0.0.1 RDS_PORT=18088 npm --prefix /home/inovatica/seal/rds/fleet-manager start
```

## Fleet core (Robokit mode)

UI może działać w dwóch trybach:

- `local` (domyślny): symulacja wykonywana w backendzie fleet-managera.
- `robokit`: UI tylko renderuje stan, a sterowanie/symulacja idą przez backend (np. `task-manager`)
  i Robokit TCP API (robokit-sim lub realny robot).

Zmienne środowiskowe:

- `FLEET_SIM_MODE=robokit` (wybiera backendowego providera symulacji)
- `FLEET_SIM_MODE_MUTABLE=false` (blokuje zmianę trybu przez `POST /api/fleet/config`)
- `FLEET_CORE_URL=http://127.0.0.1:7071` (adres backendu, domyślnie task-manager)
- `FLEET_CORE_TIMEOUT_MS=4000`
- `FLEET_POLL_MS=200` (odświeżanie statusu w UI)
- `FLEET_SIM_TICK_MS=140` (krok symulacji lokalnej)
- `FLEET_SIM_FAST=1` (tryb testowy: szybka symulacja, większa prędkość i brak opóźnień akcji)
- `FLEET_SIM_SPEED_MULTIPLIER=5` (mnożnik prędkości robotów w symulacji)
- `FLEET_SIM_ACTION_WAIT_MS=0` (czas oczekiwania na akcję pick/drop)
- `FLEET_SIM_IGNORE_TRAFFIC=1` (testowo: brak ograniczeń ruchu między robotami)

W trybie `robokit` UI wylacza lokalna symulacje i steruje robotami przez backend.
Manualne polecenia w tym trybie ida przez backend (`/api/robots/:id/...`):
- toggle **Manual** -> `POST /api/robots/:id/manual`
- klik w Action Point -> `POST /api/robots/:id/go-target`
- right click na mape -> `POST /api/robots/:id/go-point`
- manual drive (WASD) -> `POST /api/robots/:id/motion` (vx/vy/w w ukladzie robota)
- **Pauzuj/Wznow/Zakoncz** -> `pause/resume/cancel`

## Sceny (mapy)

Fleet manager traktuje wrzucony `.smap` (zip z `/uploadScene`) jako nowa **scene**.
Nowa scena staje sie aktywna, ale zawsze mozna przelaczyc sie na poprzednia.

- Scene storage: `fleet-manager/scenes` (override: `FLEET_SCENES_DIR`)
- Active scene param: `FLEET_ACTIVE_SCENE_ID` (ustawia aktywna scene przy starcie)
- API:
  - `GET /api/scenes` (lista + aktywna scena)
  - `GET /api/scenes/active`
  - `POST /api/scenes/activate` body `{ "sceneId": "...", "mapId": "map-1" }`
  - `GET /api/fleet/config`
  - `POST /api/fleet/config` body `{ "simMode": "local|robokit" }`
  - `GET /api/fleet/status` (snapshot)
  - `GET /api/fleet/state` (alias na snapshot)
  - `GET /api/fleet/stream` (SSE ze stanem)
  - `POST /api/fleet/step` body `{ "count": 1, "deltaMs": 140, "pause": true, "includeState": true }` (tylko local)
- Map/flow endpoints:
  - `GET /data/graph.json` (aktywny graph)
  - `GET /data/workflow.json5` (workflow z dopasowanym `map`)
  - `GET /data/robots.json` (roboty dla aktywnej sceny, fallback do `public/data/robots.json`)

## UI test: traffic scene

Testowa scena `traffic` jest gotowa do przeklikania w UI (prosty graf + 2 roboty).

Start (bez kolizji z domyslnymi portami):

```bash
PORT=3100 ROBOSHOP_PORT=18088 FLEET_ACTIVE_SCENE_ID=traffic \
  npm --prefix /home/inovatica/seal/rds/fleet-manager start
```

Klikanie w UI:

- Zaloguj sie: `admin` / `123456`.
- **Mapa**: right click na worksite -> ustaw `Filled/Unfilled` + `Blocked/Unblocked`.
- **Roboty**: wlacz `Manual on` dla wybranego robota.
- **Mapa**: kliknij Action Point (mala kropka) -> wybierz `Go/Load/Unload`.
- **Mapa (robokit)**: right click w puste miejsce -> `Jedz tutaj (punkt)` dla manualnego robota.
- **Manual drive**: panel w dolnej czesci, sterowanie `WASD`/strzalki po wlaczeniu manual drive.
- **Zadania**: widzisz aktywne taski; robot po pick+drop wraca do park pointu.
- **Diagnostyka**: UI pokazuje tylko komunikat - szczegoly sa po stronie backendu.

Pliki sceny: `fleet-manager/scenes/traffic/graph.json`, `fleet-manager/scenes/traffic/workflow.json5`,
`fleet-manager/scenes/traffic/robots.json`.

## Architektura (cienki klient)

Frontend jest cienkim klientem: nie uruchamia lokalnej symulacji ani planowania tras.
Calosc logiki runtime (tick, dispatch, traffic, rezerwacje, avoidance) jest po stronie backendu
(`local_fleet_sim.js`) i udostepniana przez `/api/fleet/*`. UI tylko renderuje stan z API
i wysyla komendy.

UI subskrybuje `/api/fleet/stream` (SSE) z fallbackiem do pollingu `/api/fleet/state`.
Tryb symulatora jest wybierany w backendzie i mozna go przelaczyc przez
`POST /api/fleet/config` (jesli `FLEET_SIM_MODE_MUTABLE=true`).

## E2E (spec streams)

Validates dispatch planning for S1-S5 from `pusta_kanwa_sanden.md` using
`public/data/packaging.json`.

```bash
npm --prefix /home/inovatica/seal/rds/fleet-manager run e2e-spec
```

## E2E coverage (what each test does)

`scripts/e2e-spec.js`
- Co robi: odpala S1-S5 z `pusta_kanwa_sanden.md` na `public/data/packaging.json`, symuluje zgloszenia linii i sprawdza wybrane pick/drop oraz aktualizacje buforow. Po co: trzyma stabilna logike wyboru strumienia i zapobiega regresjom w dispatchu.

`scripts/e2e-two-robots.js`
- Co robi: uruchamia 2 roboty z roznymi startami, tworzy 2 zadania i czeka az oba zostana wykonane. Po co: potwierdza poprawny przydzial robotow i rownolegla obsluge zadan.

`scripts/e2e-workflow-pickdrop.js`
- Co robi: testuje kolejnosc wypelniania DROP, zasady blokowania/rezerwacji oraz pelny cykl pick->drop. Po co: broni zgodnosci z regulami sceny (np. first-free/not-blocked).

`scripts/e2e-map-invariants.js`
- Co robi: waliduje spojnosc grafu, AP/LM/worksite, grup i koordynat. Po co: wycina bledy mapy i konfiguracji zanim wystapia w runtime.

`scripts/e2e-sim-state.js`
- Co robi: sprawdza stany robota (dispatchable/manual/pause), nearest/fallback assignment i reset po reloadzie sceny. Po co: daje pewnosc, ze stan w UI i backendzie nie rozjezdza sie w krytycznych przejsciach.

`scripts/e2e-routing-planner.js`
- Co robi: A/B porownuje nowy planner z legacy baseline (snap do krawedzi, rezerwacje czasu + okna w tym kierunki przeciwne, no-starvation i rolling horizon z malejacym waitem, wait-vs-detour, rezerwacje node na skrzyzowaniach, zwalnianie rezerwacji po cancel bez nowego goPoint, replany po obstacle bez ponownego goPoint w tym gdy trasa czeka na okno oraz powrot na korytarz po usunieciu blokady, avoid vs block, detour przy zablokowanym anchorze, rezerwacje manual+dispatch, stabilnosc przy jitterze, redukcja overlapow i przewidywany makespan, kierunkowosc linii z directionPos na prosto/skos/bezier i z anchorami, batch workload vs Dijkstra, runtime throughput w multi-robot i w dispatchu, zgodnosc harmonogramu z runtime oraz kolejnosc w multi-robot, smoothness na traffic). Po co: pokazuje przewage nowego planera i broni kluczowych regresji.

`scripts/e2e-ui.js`
- Co robi: odpala serwer i sprawdza endpointy/asset-y + wymagane pliki danych (packaging, graph). Po co: szybki smoke test przed manualnym uzyciem UI.

`scripts/e2e-fleet-delivery.js`
- Co robi: odpala serwer, ustawia worksite PICK/DROP i wymusza dostawy, czeka az taski zostana zakonczone i statusy pola sie zaktualizuja. Po co: potwierdza E2E przeplyw pick->drop po stronie backendu.

`scripts/e2e-ui-delivery.js`
- Co robi: laczy test UI (asset-y i widoki) z przeplywem pick->drop przez API, uruchamia rownolegly transfer i wykrywa dlugie blokady, brak progresu oraz utkniete taski. Po co: chroni cienkiego klienta przed regresjami w API i deadlockami.

`scripts/e2e-ui-packages.js`
- Co robi: uruchamia UI i robi 100 dostaw w paczkach 1-3 szt., z roznymi odstepami czasowymi (czasem nowe zlecenia przed dostawa, czasem przerwy na parking). Wymusza tryb fast + ignorowanie traffic (testowo) aby utrzymac wysoka przepustowosc; dodatkowo wykrywa brak progresu oraz utkniete taski/roboty. Po co: sprawdza stabilnosc UI + backend przy dluzszych, nieregularnych sekwencjach.

`scripts/e2e-traffic-flicker.js`
- Co robi: odpala lokalny symulator na scenach traffic oraz entry-reservation i monitoruje diagnostyke (A-B-A) bez ruchu, aby wykryc oscylacje stanu lub powodu; dodatkowo uruchamia dluzszy monitoring z cyklicznym pojawianiem sie/opadaniem pakunkow i wieksza liczba robotow, manualne swap-goPoint (takze powtarzane), pause/resume w trakcie jazdy, churn przeszkod oraz przelaczanie strategii traffic. Opcjonalnie uruchamia scenariusz crowd (manualny shuffle + zadania) po ustawieniu `E2E_CROWD=1`. W tym tescie collision blocking jest wylaczony (`collisionBlocking: false`), zeby skupic sie na oscylacjach i blokadach logiki traffic. Po co: lapie regresje z przelaczaniem reservation_wait/reservation_entry, flappingiem holding/moving, wzajemnym czekaniem na rezerwacje, sytuacjami, gdy kilka robotow czeka jednoczesnie na ten sam edge/node oraz twardo blokuje blokady i ustepowanie (yield).

Testy traffic i kontrakt V2 zostaly przeniesione do osobnego projektu:
`/home/inovatica/seal/rds/fleet-traffic-core/tests/`. Szczegoly w
`/home/inovatica/seal/rds/fleet-traffic-core/README.md`.

## E2E (two robots)

Simulates two robots starting at different points and completing two supply tasks.

```bash
npm --prefix /home/inovatica/seal/rds/fleet-manager run e2e-two-robots
```

## E2E (map invariants)

Validates graph/workflow references (nodes, edges, worksites, groups).

```bash
npm --prefix /home/inovatica/seal/rds/fleet-manager run e2e-map
```

## E2E (sim state)

Checks dispatchability, manual override, nearest assignment, and bundle reload resets.

```bash
npm --prefix /home/inovatica/seal/rds/fleet-manager run e2e-sim-state
```

## E2E (fleet delivery)

Runs a full pick->drop delivery through the backend API using the traffic scene.

```bash
npm --prefix /home/inovatica/seal/rds/fleet-manager run e2e-fleet-delivery
```

## E2E (UI delivery)

Checks UI assets and then runs the pick->drop delivery flow through the UI-facing API.

```bash
npm --prefix /home/inovatica/seal/rds/fleet-manager run e2e-ui-delivery
```

## E2E (UI packages)

Runs a long mixed workload (100 packages, staggered batches) through UI-facing API.

```bash
npm --prefix /home/inovatica/seal/rds/fleet-manager run e2e-ui-packages
```

## E2E (routing planner)

Covers edge snapping, time reservations, obstacle handling (avoid vs block), backward penalties, and line-direction constraints (including diagonal + bezier).
Includes time-window waiting (opposite directions + no-starvation + wait-vs-detour), node reservations at intersections, cancel/release of reservations, manual+dispatch reservations, anchor detours when blocked, jitter stability, overlap reduction, runtime throughput (multi-robot + dispatch), batch planning workload, throughput prediction, schedule-vs-runtime checks, planning performance, and a traffic smoothness comparator.
Includes a legacy baseline comparator to show the old planner behavior.

```bash
npm --prefix /home/inovatica/seal/rds/fleet-manager run e2e-routing
```

## E2E (traffic)

Covers head-on deadlock resolution, queue pruning, node lock TTL, replan lock release, and stuck retry backoff.

```bash
npm --prefix /home/inovatica/seal/rds/fleet-traffic-core run e2e-traffic
```

## E2E (traffic flicker)

Runs local-sim diagnostics watchdogs for state/reason oscillations in traffic + entry-reservation scenes, including a longer multi-robot run with cyclic package updates.

```bash
npm --prefix /home/inovatica/seal/rds/fleet-manager run e2e-traffic-flicker
```

## E2E (traffic v2 contract)

Checks the V2 time-window reservation contract and strategy defaults.

```bash
npm --prefix /home/inovatica/seal/rds/fleet-traffic-core run e2e-traffic-v2
```

## E2E (UI smoke)

Starts the local server, validates core endpoints/assets, and checks the
packaging + graph data files are available.

```bash
npm --prefix /home/inovatica/seal/rds/fleet-manager run e2e-ui
```

Run both suites:

```bash
npm --prefix /home/inovatica/seal/rds/fleet-manager run e2e
```
