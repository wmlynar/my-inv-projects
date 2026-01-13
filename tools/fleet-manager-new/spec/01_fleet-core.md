# fleet-core — Specyfikacja komponentu (v0.9)

## 1. Rola w systemie (MUST)
`fleet-core` jest **source of truth** dla stanu domenowego Fleet Managera: aktywnej sceny, robotów (znormalizowanych), worksites/streams/tasks, locków/rezerwacji, komend oraz lease kontroli.

## 2. Zakres i odpowiedzialności (normatywnie)
#### Scope
Fleet Core jest źródłem prawdy dla stanu systemu: aktywnej sceny, stanu robotów (znormalizowanego), tasks/streams/worksites, locków/rezerwacji, komend oraz lease kontroli.

#### Responsibilities
Fleet Core MUST:
- być **source of truth** dla stanu domeny (scene + runtime),
- udostępniać publiczne API `/api/v1/**` oraz SSE `/api/v1/events/stream`,
- walidować wszystkie mutacje (scena, tasks, manual commands) i zwracać spójne `ErrorEnvelope`,
- utrzymywać **event log na dysku** oraz **snapshoty na dysku** i umożliwiać replay po restarcie,
- wykonywać tick loop w stałym rytmie (`tickHz`) i domyślnie działać deterministycznie,
- integrować algorytm przez HTTP (`/algo/v1/decide`) oraz mapować decyzje algorytmu na `CommandRecord`,
- pełnić rolę dispatchera: wysyłać komendy do `fleet-gateway` oraz kontrolować idempotencję i deduplikację,
- egzekwować **Control Lease** (seize/renew/release): jedna instancja operatora ma kontrolę naraz,
- w trybie awaryjnym MUST przejść do fail-safe (hold/stop) zgodnie z polityką w `07_*`.

Fleet Core MUST NOT:
- implementować parsowania ramek RoboCore/Robokit TCP,
- łączyć się bezpośrednio z robotami po TCP,
- zawierać importu Roboshop jako „core feature” (to jest bridge/tooling).

Fleet Core SHOULD:
- aktywować scenę w stanie `paused/hold` (bezpieczniej w MVP),
- mieć jawny budżet ticka i ograniczać pracę w ticku (np. algorytm timeout + fallback).

#### Interfaces
Wystawia (public):
- `/api/v1/*` — patrz Załącznik A w tym pliku.

Konsumuje (private):
- `algorithm-service` — `POST /algo/v1/decide`.
- `fleet-gateway` — `POST /gateway/v1/...` + `GET /gateway/v1/...`.

#### State & persistence
- Event log MUST być zapisywany na dysk w formacie append-only (np. JSONL).
- Snapshot MUST być zapisywany na dysk okresowo oraz przy zdarzeniach krytycznych (import/activate, provider switch, zmiana lease).
- Snapshot MUST zawierać `schemaVersion` i `contractsVersion`.

#### Runtime model
- Tick loop MUST być single-threaded względem mutacji domeny (unikamy race conditions).
- IO do Gateway/Algo MUST mieć timeouty; wyniki IO MUSZĄ być materializowane jako eventy.
- Mapowanie `AlgorithmDecision` → `CommandRecord` jest kanoniczne:
  - `setRollingTarget(targetRef)` → `CommandRecord.type="goTarget"` z `payload.targetRef`.
  - Core MUST deduplikować identyczny rolling target oraz stosować rate-limit (`rollingTarget.updateMinIntervalMs`).
  - Core MUST tworzyć `CommandRecord` przed dispatch (event first).

#### Failure modes i odporność
- Jeśli algorytm timeout/error: Core MUST wejść w `hold` dla robotów i emitować `systemError` (`causeCode=ALGO_TIMEOUT|ALGO_ERROR`).
- Jeśli gateway offline: Core MUST oznaczyć robota jako `offline` i MUST wstrzymać dispatch do tego robota.
- Jeśli telemetria starsza niż `statusAgeMaxMs`: Core MUST oznaczyć robota jako `blocked.isBlocked=true` z reason code.

#### Observability
- Core MUST logować: eventy wejściowe, eventy domenowe, snapshoty, a w trybie debug także request/response algorytmu.
- Core MUST emitować eventy lease i activation (patrz `03_*` i `07_*`).

#### Testy
- Core MUST mieć piramidę testów (unit → integration → e2e), a testy MUST być możliwe do uruchomienia równolegle.
- Core MUST mieć „golden traces” (event log + snapshoty) do regresji replay.

Related: `03_*`, `05_*`, `07_*`, `08_*`, `16_*`, `17_*`.

## 3. Interfejsy
### 3.1 Wystawiane (public)
- HTTP Base URL: `http://<core-host>:<port>/api/v1`
- SSE: `GET /api/v1/events/stream`

Szczegóły endpointów: **Załącznik A** (pełny kontrakt API).

### 3.2 Konsumowane (wewnętrzne zależności)
- `algorithm-service` (HTTP): `POST /algo/v1/decide`
- `fleet-gateway` (HTTP): `/gateway/v1/**`

## 4. Dane i persystencja (MUST)
### 4.1 Event log + snapshoty (na dysk)
- Core MUST zapisywać wszystkie mutacje jako `EventEnvelope` (append-only).
- Core MUST zapisywać snapshoty na dysk okresowo i po zdarzeniach krytycznych (import/activate, provider switch, lease).

Szczegóły formatu i replay: patrz `99_pozostale.md` → „Obserwowalność i replay”.

### 4.2 Konfiguracja (FleetCoreConfig)
Domyslne sciezki (jesli nie podano w config/CLI):
- `dataDir = ${FLEET_DATA_DIR}/core` (FLEET_DATA_DIR default `~/fleet_data`)
- `sceneStoreDir = ${FLEET_DATA_DIR}/scenes`
- config file (discovery): `${FLEET_DATA_DIR}/config/fleet-core.local.json5`

### 6.1 FleetCoreConfig
```json5
{
  // ścieżki
  dataDir: "./data",
  sceneStoreDir: "./data/scenes",

  // event sourcing
  eventLog: {
    fileRotationMb: 256,
    retentionDays: 14,
    flushEveryEvent: true, // MUST w MVP
  },
  snapshots: {
    intervalMs: 1000,
    retentionCount: 2000,
    writeToDisk: true, // MUST (Twoje wymaganie)
  },

  // tick loop
  tickHz: 10,

  // freshness
  statusAgeMaxMs: 1500,

  // rolling target
  rollingTarget: {
    lookaheadMinDistanceM: 3.0,   // target ma być >= tyle metrów "do przodu" po trasie (SHOULD)
    updateMinIntervalMs: 300,      // nie spamować robota
  },

  // lease / seize
  controlLease: {
    defaultTtlMs: 15000,
    maxTtlMs: 60000,
    allowForceSeize: true,
  },

  // integracje
  gateway: {
    baseUrl: "http://127.0.0.1:8081",
    timeoutMs: 1200,
    retry: { maxAttempts: 3, backoffMs: 200 },
  },
  algorithm: {
    baseUrl: "http://127.0.0.1:8082",
    timeoutMs: 400, // <= 1/tickHz (SHOULD)
    retry: { maxAttempts: 1 },    // Core MUST nie robić wielokrotnych retry na tick (fail fast)
  },
}
```

## 5. Semantyka krytycznych operacji (MUST)
Poniższe reguły są krytyczne, bo eliminują dwuznaczności implementacji.

### 5.1 Control Lease (seize/renew/release)
## 2. Control Lease (seize control)
Cel: wiele UI może patrzeć, ale tylko jedno może sterować.

### 2.1 Kontrakt ControlLease
```json5
{
  leaseId: "lease_01JH...",
  owner: { clientId: "ui-01", displayName: "UI Traffic Lab" },
  acquiredTsMs: 1736160000000,
  expiresTsMs: 1736160015000,
  lastRenewTsMs: 1736160009000,
  status: "held", // held | expired | released
  statusReasonCode: "NONE",
}
```

### 2.2 Reguły (MUST)
- Jeśli UI chce sterować, MUST wykonać `seize`.
- `seize` MAY być `force=true` jeśli `allowForceSeize=true`.
- Jeśli `force=true`, poprzedni owner zostaje wywłaszczony:
  - Core MUST emitować event `controlLeaseSeized` (i/lub `controlLeaseChanged` z causeCode).
- Wszystkie endpointy modyfikujące stan (create task, manual command, activate scene, provider switch)
  MUST wymagać ważnego lease. Brak → `409 conflict` + `causeCode=CONTROL_LEASE_REQUIRED`.

### 2.3 State machine (ASCII)
```text
FREE
  | seize
  v
HELD -- renew --> HELD
  | release
  v
RELEASED
  | (implicit)
  v
FREE

HELD -- ttl expires --> EXPIRED --> FREE
HELD -- force seize --> HELD(new owner)
```

---

### 5.2 Scene Activation (import/activate)
## 3. Scene Activation (przełączanie sceny)

### 3.1 Reguły nadrzędne (MUST)
- Core MUST mieć w danym momencie co najwyżej jedną scenę aktywną.
- Aktywacja sceny MUST być atomowa z perspektywy klientów (albo jest w pełni aktywna, albo nie).
- Podczas aktywacji Core MUST przejść w tryb `activating` i:
  - MUST zablokować przyjmowanie nowych komend/tasków (409 `SCENE_NOT_ACTIVE`),
  - MUST wstrzymać dispatch do gateway (hold robots).

### 3.2 Procedura aktywacji (MUST)
1) Validate scene package (manifest + graph + config).
   - `config/streams.json5` MUST follow kanoniczny format z `spec/99_pozostale.md`.
   - `pickGroup` i `dropGroupOrder` MUSZA byc niepustymi listami `worksiteId`.
   - `pickGroup` zawiera tylko worksites typu `pickup`.
   - `dropGroupOrder` zawiera tylko worksites typu `dropoff`.
   - Brak nieznanych pol (strict validation) — inaczej `validationError`.
2) Build derived runtime state:
   - index nodes/edges,
   - reset locks/reservations,
   - init tasks/streams state.
3) Emit event `sceneActivated` + write snapshot (na dysk).
4) Unfreeze dispatch.

Jeśli fail:
- Emit `sceneActivationFailed` (z causeCode).
- Core MUST pozostać na poprzedniej scenie (jeśli była) lub w stanie `noActiveScene`.

### 3.3 Co się dzieje z runtime przy zmianie sceny (MUST)
- Wszystkie `locks` i `reservations` są resetowane.
- Wszystkie `tasks` w toku są `canceled` z `statusReasonCode=SCENE_NOT_ACTIVE` (lub przeniesione do `failed`).
- Wszystkie `commands` w toku są `canceled` (Core zapisuje to w event log) i Core wysyła `stop` do gateway (best effort).
- Provider robota **nie zmienia się automatycznie** (SHOULD), ale robot może mieć niepasującą mapę:
  - to jest ryzyko operacyjne i MUST być wyraźnie widoczne w UI (warning).
  - w przyszłości: auto load map (poza MVP).

---

### 5.3 Lifecycle komendy (ACK vs DONE)
## 4. Command lifecycle (CommandRecord) — state machine

### 4.1 Trzy poziomy „potwierdzenia” (MUST — bez niejednoznaczności)

W systemie istnieją 3 różne rzeczy, które łatwo pomylić. Spec rozdziela je jawnie:

1) **Transport ACK (Core→Gateway)**  
   - oznacza: gateway przyjął request HTTP i (co najmniej) zarejestrował próbę wysłania do providera.
   - to jest warunek stanu `dispatched`.

2) **Robot protocol ACK (Gateway↔Robot)**  
   - oznacza: robot (lub robokit-robot-sim) odesłał ramkę odpowiedzi (seq/apiNo+10000) dla requestu.
   - to jest warunek stanu `acknowledged`.
   - UWAGA: dla niektórych komend robot może nie dawać sensownego ACK; wtedy gateway musi to oznaczyć jawnie w `CommandRecord.robotAck.status = "notSupported"`.

3) **DONE / completion (w domenie Core)**  
   - oznacza: Core uznał komendę za zakończoną na podstawie znormalizowanego statusu robota
     (np. `navigation.state=arrived`, zakończenie akcji wideł) i/lub policy.
   - to jest warunek stanu `completed`.
   - Gateway MUST NOT markować „completed” — gateway tylko transport + protokół + telemetria.

### 4.2 Stany (MUST)
- `created` — zapisane w event log, jeszcze nie wysłane do gateway.
- `dispatched` — Core dostał HTTP 2xx z gateway dla dispatch (transport ACK).
- `acknowledged` — gateway potwierdził robot protocol ACK (jeśli wspierane).
- `completed` — Core wykrył zakończenie na podstawie telemetrii/polityki.
- `failed` — błąd (timeout, robot reject, gateway error).
- `canceled` — anulowana przez Core (np. zmiana sceny, seize, manual stop).

### 4.3 State machine (ASCII)
```text
created -> dispatched -> acknowledged -> completed
    |          |             |
    |          |             -> failed
    |          -> failed
    -> canceled
dispatched/acknowledged -> canceled
```

### 4.4 Timeouty i reason codes (MUST)
Wyróżniamy dwa typy timeoutów:

- `COMMAND_ACK_TIMEOUT` — brak robot ACK w czasie `command.ackTimeoutMs` (jeśli ack wspierany),
- `COMMAND_EXEC_TIMEOUT` — brak zakończenia (DONE) w czasie `command.execTimeoutMs`.

Core MUST:
- przy ACK timeout → `failed` z `statusReasonCode=COMMAND_ACK_TIMEOUT`,
- przy EXEC timeout → `failed` z `statusReasonCode=COMMAND_EXEC_TIMEOUT`,
- przy cancel → `canceled` z `statusReasonCode=COMMAND_CANCELED`.

### 4.5 Reguły idempotencji (MUST)
- Core MUST nadać `commandId` i użyć go jako idempotency key w Core→Gateway.
- Core MUST zapisać event `commandCreated` zanim spróbuje dispatch.
- Gateway MUST traktować ponowny dispatch z tym samym `commandId` jako idempotentny.

### 4.6 Retry (MUST)
- Core MUST NOT retry „w kółko” komend do robota.
  Retry Core dotyczy tylko HTTP do gateway i tylko w granicach `gateway.retry.maxAttempts`.
- Gateway jest odpowiedzialny za retry/reconnect TCP i MUST implementować circuit breaker.

---

### 5.4 Fail-safe (hold/stop)
## 7. Polityka fail-safe (MVP) — co robimy przy awariach (MUST)

### 7.1 Pojęcia
- **hold**: Core nie generuje kolejnych komend ruchu dla robota; robot pozostaje w stanie bezpiecznym wg własnej logiki.
- **stop (best effort)**: Core tworzy i dispatchuje jednorazowo `CommandRecord.type="stop"` do gateway.

### 7.2 Zdarzenia, które uruchamiają fail-safe (MUST)
Core MUST wykonać fail-safe per-robot, jeśli wystąpi którykolwiek z warunków:
- telemetria robota jest starsza niż `FleetCoreConfig.statusAgeMaxMs`,
- gateway jest niedostępny (HTTP timeout/503) lub provider robota w gateway jest `offline/error`,
- algorytm timeout/error (`ALGO_TIMEOUT|ALGO_ERROR`),
- robot raportuje emergency stop / manual mode / localization lost (mapowane na ReasonCode),
- aktywacja sceny w toku (`activating`) lub scena nieaktywna.

### 7.3 Akcje Core w fail-safe (MUST)
Dla robota objętego fail-safe Core MUST:
1) ustawić `robot.blocked.isBlocked=true` oraz `blockedReasonCode` adekwatnie do przyczyny,
2) wejść w hold (brak nowych `goTarget`),
3) wykonać `stop (best effort)` jeśli przyczyna wskazuje na brak kontroli (stale status, gateway offline, emergency),
4) wstrzymać kroki `TaskRunner` dla zadań przypisanych do tego robota (nie eskalować w pętli),
5) wyemitować eventy: `robotStateUpdated` + (jeśli dotyczy) `systemWarning/systemError`.

### 7.4 Powrót z fail-safe (MUST)
Core MUST zdjąć fail-safe (wyjść z hold) dopiero, gdy:
- telemetria jest świeża przez co najmniej `minStableMs` (konfig; MVP: 2*tickInterval),
- provider w gateway jest `online`,
- aktywna scena nie jest w activation,
- (jeśli dotyczy) operator ma ważny lease dla operacji manualnych.

---

### 5.5 SSE i cursor semantics
## 8. SSE i cursor semantics (MUST)
- SSE niesie wyłącznie `EventEnvelope`.
- `id:` w SSE MUST równać się `EventEnvelope.cursor`.
- Snapshot jest zdarzeniem `type="stateSnapshot"` i też ma `cursor`.
- Precedencja: jeśli klient poda `fromCursor`, Core MUST zignorować `Last-Event-ID`.
- Jeśli `fromCursor` jest poza retencją:
  - Core MUST wysłać `stateSnapshot` z `payload.requiresResync=true` i rozpocząć stream od tej migawki.

## 6. MVP checklist (skrót)
- Event log + snapshoty **na dysk**.
- Headless runtime (bez UI) + wiele UI jako obserwatorzy.
- ControlLease („seize control”).
- Scene import + activation.
- Tick loop (deterministyczny) + integracja z algo + dispatch do gateway.
- Manual commands: `stop`, `goTarget`.
- Minimalny Task Runner: `pickDrop` (goTarget + ForkLoad/ForkUnload).
Pełna definicja i plan MVP: `99_pozostale.md` → „MVP (v0.7/v0.8)”.

---



## 6. Lokalne struktury danych i persystencja (MUST)

Ta sekcja ma jeden cel: żeby dało się zaimplementować `fleet-core` bez zgadywania „co Core trzyma w pamięci” i „co zapisuje na dysk”.

### 6.1 Struktury in-memory (kanoniczne)

`fleet-core` MUST utrzymywać jeden obiekt stanu runtime (atomowy z perspektywy ticka i handlerów HTTP):

```json5
{
  // monotoniczny licznik eventów
  cursor: 123456,

  // aktywna scena (lub null)
  activeScene: {
    sceneId: "scene_01JH...",
    sceneHash: "sha256:...",        // hash kanoniczny paczki sceny (manifest + pliki kanoniczne)
    activatedTsMs: 1736160000000,
    mode: "active",                 // active | activating | paused | error
    manifest: { /* SceneManifest */ },

    // graf + geometria (z DegenerateBezier) oraz artefakty prekompilacji
    sceneGraph: { /* SceneGraph */ },
    compiledMapRef: {
      compiledMapHash: "sha256:...",
      compiledMapPath: "./data/scenes/<sceneId>/compiledMap.json", // lub cache
    },
  },

  // kontrola (wyłączność mutacji przez operatora/UI)
  controlLease: { /* ControlLease | null */ },

  // roboty i ich stan runtime (znormalizowany)
  robotsById: {
    "RB-01": { /* RobotRuntimeState */ },
    "RB-02": { /* RobotRuntimeState */ },
  },

  // zadania i ich przebieg
  tasksById: {
    "task_01JH...": { /* Task */ },
  },

  // definicje i runtime streamów/worksites
  streamsById: {
    "stream_inbound_01": { /* StreamDefinition + StreamRuntimeState */ },
  },
  worksitesById: {
    "PICK_01": { /* WorksiteDefinition + WorksiteRuntimeState */ },
  },

  // locki/rezerwacje (jeśli trafficMode != NONE)
  locks: [ /* Lock[] */ ],

  // komendy domenowe + statusy wysyłki/ACK
  commandsById: {
    "cmd_01JH...": { /* CommandRecord */ },
  },

  // metadane systemowe / zdrowie zależności
  dependencies: {
    gateway: { healthy: true, lastOkTsMs: 1736160000123, lastError: null },
    algorithm: { healthy: true, lastOkTsMs: 1736160000100, lastError: null },
  },
}
```

**MUST (atomowość):**
- Tick loop MUST pracować na spójnym `CoreState` i publikować wynik jako: *eventy → snapshot*.
- Handlery HTTP mutujące stan MUST dopisywać eventy do logu i dopiero wtedy aktualizować in-memory state.

### 6.2 Event log na dysk (MUST)

Core MUST używać append-only event logu (JSONL). Minimalny layout (w `dataDir`):

```text
<dataDir>/
  events/
    000000.jsonl                # segmenty rotowane po rozmiarze
    000001.jsonl
  snapshots/
    snapshot_000123456.json     # snapshoty stanów
    snapshot_000123999.json
  scenes/
    <sceneId>/
      manifest.json5
      map/
        graph.json              # MUST (kanoniczny SceneGraph)
        raw.smap                # MAY (import-only, opcjonalny artefakt)
        assets/                 # MAY
      compiled/
        compiledMap.json        # artefakt map-compiler (kanon dla algorytmu)
        meta.json               # MAY
      config/
        worksites.json5
        streams.json5
        robots.json5            # MAY
        actionPoints.json5      # MAY
        packaging.json          # MAY
      README.md                 # MAY
    # Pelny layout scen: spec/07_scene-management.md
```

Event log MUST zawierać:
- `cursor`, `tsMs`, `type`, `payload`, `traceId/requestId` (jeśli dotyczy),
- `contractsVersion`,
- `activeSceneId` (dla szybkiego filtrowania).

**MUST (flush):**
- W MVP `flushEveryEvent=true` (Twoje wymaganie „na dysk”).  
  (Po MVP można to poluzować, ale wtedy MUSI istnieć twarda strategia durability.)

### 6.3 Snapshoty na dysk (MUST)

Snapshoty MUST:
- być zapisywane okresowo i przy zdarzeniach krytycznych (activate scene, provider switch, lease change),
- zawierać `schemaVersion` i `contractsVersion`,
- zawierać `cursor` z event logu, do którego snapshot jest spójny.

### 6.4 Indeksy i cache (SHOULD)

Core SHOULD utrzymywać pochodne indeksy dla wydajności UI:
- `robots[]` posortowane po `robotId`,
- `tasksByStatus` (queued/assigned/running/done/canceled/error),
- `locksByRobotId`,
- `commandsByRobotId`.

Indeksy MUST być deterministyczne (sortowania stabilne, brak iteracji po hash map bez sortu przy serializacji).

---

## 7. Pobieżny algorytm działania `fleet-core` (tick loop)

Poniższy opis jest „szkieletem” implementacji, spójnym ze specyfikacją algorytmu v0.5.

### 7.1 Tick loop (MVP) — pseudokod (MUST)

```text
every tick (tickHz):
  now := epochMs()

  // 1) Pull telemetry
  gwStatus := GET gateway /gateway/v1/robots
  emit Event(robotStatusPulled)

  // 2) Apply telemetry -> update RobotRuntimeState
  update robotsById[*].telemetry
  emit Event(robotStateUpdated...)  // per robot albo batch

  // 3) Build AlgorithmInputSnapshot
  algoInput := {
    tick, tsMs: now,
    sceneId,
    robots: RobotRuntimeState[],
    tasks: active tasks,
    locks: current locks,
    lastDecisions: ...
  }

  // 4) Ask algorithm-service for decisions (timeout bounded)
  algoDecision := POST algo /algo/v1/decide(algoInput)
  if timeout/error: enter fail-safe hold policy

  // 5) Validate decision against contracts (fail-closed)
  // (np. targetRef.nodeId istnieje w SceneGraph; robotId znany; itd.)

  // 6) Map decisions -> CommandRecord(s) + update locks/tasks
  // IMPORTANT: event-first
  append Event(commandPlanned...)
  update in-memory
  write snapshot (policy)

  // 7) Dispatch commands to gateway (best effort; IO results as events)
  POST gateway /gateway/v1/robots/{id}/commands(commandRecord)
  append Event(commandDispatched / gatewayAck)

  // 8) Emit SSE deltas
```

### 7.2 Mapowanie „Rolling Target” w domenie (MUST)

- Core MUST traktować rolling target jako referencję do mapy: `targetRef = { nodeId }`.
- Core MUST deduplikować identyczne cele (ten sam `robotId + nodeId + hold flag`) i nie wysyłać częściej niż `rollingTarget.updateMinIntervalMs`.
- Core MUST utrzymywać `lastRollingTargetByRobotId` w stanie, aby uniknąć oscylacji.

### 7.3 Tryby ruchu (MVP) (MUST)

Core MUST wspierać co najmniej:
- `trafficMode=NONE` (Algorithm Level0): brak locków, brak gwarancji multi-robot (dozwolone tylko dla 1 robota).
- `trafficMode=DCL2D` (Level1+): locki i hold-point zgodnie z algorytmem v0.5.

Core MUST odrzucić aktywację `trafficMode=NONE`, jeśli `activeRobots > 1` (409 + `causeCode=MVP_SINGLE_ROBOT_ONLY`).

---

## 8. Wejściowe API — co jest „obowiązkowe do MVP” (checklista)

Ta checklista pomaga implementować komponentami.

### 8.1 MUST w MVP (wejściowe endpointy)
- `GET /api/v1/health`
- `POST /api/v1/control-lease/seize`
- `POST /api/v1/control-lease/renew`
- `POST /api/v1/control-lease/release`
- `GET /api/v1/state` (snapshot dla UI i test harness)
- `GET /api/v1/events` lub `GET /api/v1/events/stream` (SSE)
- `POST /api/v1/scenes/import`
- `POST /api/v1/scenes/activate`
- `GET /api/v1/scenes/:id/package?hash=sha256:...`
- `POST /api/v1/tasks` (minimum: create pickDrop)
- `POST /api/v1/robots/{robotId}/commands` (minimum: stop + goTarget)
- `POST /api/v1/robots/{robotId}/provider-switch`

Szczegóły request/response pozostają w **Załączniku A** (poniżej), ale ta sekcja jest „źródłem prawdy” dla zakresu MVP.

---

## Załącznik A — API Fleet Core (verbatim z v0.7)
# Fleet Manager 2.0 — API Fleet Core (publiczne) (v0.7)

Base URL: `http://<core-host>:<port>/api/v1`

## 1. Zasady ogólne
- Wszystkie requesty/response są JSON (UTF-8).
- Błędy w `ErrorEnvelope` (patrz `03_*`).
- Endpointy modyfikujące stan **MUST** wymagać ważnego ControlLease (`leaseId`), inaczej `409`.
- Idempotencja: każdy endpoint mutujący stan MUST przyjmować `request: { clientId, requestId }`.
  - `(clientId, requestId)` jest kluczem idempotencji w skali endpointu.
  - Ten sam requestId ponowiony MUST zwrócić ten sam efekt (albo ten sam wynik), bez dubli.

## 2. Health
### GET /health
```json5
{ status: "ok", tsMs: 1736160000000 }
```

## 3. ControlLease (seize/release/renew)

### POST /control-lease/seize
Request:
```json5
{
  displayName: "UI Traffic Lab",
  ttlMs: 15000,
  force: false,
  request: { clientId: "ui-01", requestId: "req_01JH..." }
}
```
Response 200:
```json5
{ lease: { /* ControlLease */ } }
```

Errors:
- 409 `conflict` + `causeCode=CONFLICT` jeśli lease jest zajęty i `force=false`.

### POST /control-lease/release
Request:
```json5
{ leaseId: "lease_01JH...", request: { clientId: "ui-01", requestId: "req_01JH..." } }
```
Response 200: `{ ok: true }`

### POST /control-lease/renew
Request:
```json5
{ leaseId: "lease_01JH...", ttlMs: 15000, request: { clientId: "ui-01", requestId: "req_01JH..." } }
```
Response 200: `{ lease: { /* ControlLease */ } }`

## 4. Scenes

### GET /scenes
Response:
```json5
{ scenes: [{ sceneId: "scene_01...", sceneName: "warehouse_nowy_styl", createdTsMs: 1736160000000 }] }
```

### POST /scenes/import
- Body: zip (multipart) lub JSON wskazujący na lokalny katalog (MVP: wystarczy katalog w `sceneStoreDir`).
- Response:
```json5
{ sceneId: "scene_01...", ok: true }
```

### POST /scenes/activate
Request:
```json5
{ sceneId: "scene_01...", sceneHash: "sha256:...", leaseId: "lease_01...", request: { clientId: "ui-01", requestId: "req_01..." } }
```
Response 200:
```json5
{ ok: true, activeSceneId: "scene_01..." }
```

### GET /scenes/:id
Response:
```json5
{ sceneId: "scene_01...", manifest: { /* SceneManifest */ } }
```

### GET /scenes/:id/package?hash=sha256:...
Response: zip paczki sceny (content-type `application/zip`).
Jeśli `hash` nie pasuje do `sceneHash`, zwróć `409` z `causeCode=SCENE_HASH_MISMATCH`.

## 5. State (snapshot)
### GET /state
Query params:
- `view=full|uiMinimal` (SHOULD)
- `include=robots,tasks,locks,worksites,streams` (MAY)

Response (skrót):
```json5
{
  cursor: 123456,
  tsMs: 1736160000123,
  activeSceneId: "scene_01...",
  robots: [ /* RobotRuntimeState[] */ ],
  tasks: [ /* Task[] */ ],
  locks: [ /* Lock[] */ ],
  worksites: [ /* Worksite + WorksiteState */ ],
  streams: [ /* StreamDefinition */ ],
}
```

## 6. Events (SSE)
### GET /events/stream (SSE)

Alias (MAY): serwer MAY wspierać także `/api/v1/events` jako alias dla kompatybilności.

Query:
- `fromCursor=<int64>` (opcjonalne)
- `types=robotStateUpdated,taskUpdated,...` (opcjonalny filtr, SHOULD)
- `heartbeatMs=10000` (opcjonalne, MAY)

Reguły (MUST):
- SSE `id:` = `EventEnvelope.cursor`
- SSE `event:` = `EventEnvelope.type`
- SSE `data:` = JSON `EventEnvelope`
- Precedencja: jeśli jest `fromCursor`, ignoruj `Last-Event-ID`.
- Jeśli cursor poza retencją: wyślij `stateSnapshot` z `requiresResync=true`.

Przykład:
```text
id: 123456
event: robotStateUpdated
data: {"cursor":123456,"tsMs":1736160000123,"type":"robotStateUpdated","payload":{...}}

:heartbeat
```

## 7. Robots (read-only + provider switch przez Core)
### GET /robots
Response: `{ robots: [ /* RobotRuntimeState[] */ ] }`

## 8. Tasks
### POST /tasks
Tworzy nowe zadanie (np. pickDrop). Wymaga lease.
Request:
```json5
{
  leaseId: "lease_01...",
  task: {
    kind: "pickDrop",
    streamId: "stream_inbound_01",
    fromWorksiteId: "PICK_01",
    toWorksiteId: "DROP_01",
    priority: 10,
    // steps MAY być puste (Core wygeneruje), albo jawne
  },
  request: { clientId: "ui-01", requestId: "req_01..." }
}
```
Response:
```json5
{ taskId: "task_01...", ok: true }
```

### POST /tasks/{taskId}/cancel
Request:
```json5
{ leaseId: "lease_01...", request: { clientId: "ui-01", requestId: "req_01..." } }
```

## 9. Manual commands (opcjonalne, MVP: stop + goTarget)
### POST /robots/{robotId}/commands
Request (MVP):
```json5
{
  leaseId: "lease_01...",
  command: { type: "goTarget", payload: { targetRef: { nodeId: "LM2" } } },
  request: { clientId: "ui-01", requestId: "req_01..." }
}
```

## 10. Provider switch (z perspektywy UI)
### POST /robots/{robotId}/provider-switch
Request:
```json5
{
  leaseId: "lease_01...",
  targetProvider: "robokitSim", // internalSim | robokitSim | robocore
  request: { clientId: "ui-01", requestId: "req_01..." }
}
```

Core wykona procedurę safe-switch:
- emit `commandCreated(stop)` + dispatch best effort,
- wywoła gateway,
- emit `robotProviderSwitched`.

## 11. Out-of-scope (MVP)
- AuthN/AuthZ, TLS
- RBAC
- multi-tenant
- user management
