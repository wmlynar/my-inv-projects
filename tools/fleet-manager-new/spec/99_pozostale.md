# Pozostałe (kontrakty przekrojowe, semantyka runtime, testy, E2E, MVP, ryzyka) (v0.9)

Ten dokument zbiera wszystko, co jest przekrojowe (nie jest specyfiką pojedynczego komponentu), oraz zawiera pełne teksty kanonicznych kontraktów z v0.7,
żeby utrzymać ciągłość i upewnić się, że nic nie zginęło.

## 1. Mapa migracji (v0.7 → v0.8)
Ta sekcja jest „gwarancją, że nic nie zginęło”: pokazuje, gdzie trafiła treść z pakietu v0.7.

- `00_index.md` → `00_overview.md` (prompt, jak czytać) + `99_pozostale.md` (changelog/pozostałe)
- `02_architektura_wysokopoziomowa.md` →
  - `00_overview.md` (cel, zasady, diagramy, sekwencje, runbook)
  - pliki komponentów (specyfikacje komponentów 4.1–4.9)
- `03_kontrakty_wspolne.md` → `99_pozostale.md` (kanon kontraktów) + wybrane fragmenty w komponentach (config, ErrorEnvelope)
- `04_kontrakty_scena_i_mapa.md` → `99_pozostale.md` + `09_map-compiler.md` + `03_algorithm-service.md`
- `05_kontrakty_domena.md` → `99_pozostale.md` + (streszczenia w `01_fleet-core.md`)
- `06_port_algorytmu_i_api_algorytmu.md` → `03_algorithm-service.md` (Załącznik A)
- `07_semantyka_runtime_i_maszyny_stanow.md` → `99_pozostale.md` + (wybrane sekcje w `01_fleet-core.md`)
- `08_api_fleet_core.md` → `01_fleet-core.md` (Załącznik A)
- `09_api_fleet_gateway.md` → `02_fleet-gateway.md` (Załącznik A)
- `10_protokol_robocore_robokit.md` → `10_adapters-robokit.md` (Załącznik A) + referencje w `02_fleet-gateway.md`
- `11_symulacja_i_hot_switch_providerow.md` → `02_fleet-gateway.md` (Załącznik B) + `99_pozostale.md`
- `12_repozytorium_i_podzial_na_projekty.md` → `99_pozostale.md`
- `13_integracja_roboshop_bridge.md` → `05_roboshop-bridge.md` (Załącznik A)
- `14_map_compiler.md` → `09_map-compiler.md` (Załącznik A)
- `06_proxy-recorder.md` → `06_proxy-recorder.md` (Załącznik A)
- `99_pozostale.md (obserwowalność i replay)` → `99_pozostale.md`
- `99_pozostale.md (strategia testów)` → `99_pozostale.md`
- `99_pozostale.md (scenariusze E2E)` → `99_pozostale.md`
- `99_pozostale.md (MVP)` → `99_pozostale.md` + streszczenia w komponentach
- `99_pozostale.md (ryzyka)` → `99_pozostale.md`
- `99_rzeczy_usuniete_lub_odroczone.md` → `99_pozostale.md`


---

## 2. Konwencje i glosariusz (verbatim z v0.7)
# Fleet Manager 2.0 — Konwencje i glosariusz (v0.7)

## 1. Słownik normatywny
W tym dokumencie słowa kluczowe są normatywne:

- **MUST** — wymaganie bezwzględne.
- **MUST NOT** — absolutny zakaz.
- **SHOULD** — zalecenie silne (odstępstwo wymaga uzasadnienia).
- **MAY** — opcjonalne.

## 2. Konwencje techniczne

### 2.1 Jednostki (MUST)
- Długości: **metry** (`m`).
- Prędkości liniowe: `m/s`.
- Kąty: **radiany** (`rad`).
- Prędkości kątowe: `rad/s`.
- Czas: **milisekundy** (`ms`) jako `int64` (timestamp epoch ms), chyba że wskazano inaczej.

### 2.2 Układy odniesienia (MUST)
- `mapFrame`: układ mapy/sceny (metry, 2D, prawoskrętny).
- `robotFrame`: układ robota (dla Robokit/RoboCore tam, gdzie API tego wymaga).
- W kontraktach domenowych Fleet Managera pozycje są w `mapFrame`, o ile nie zaznaczono inaczej.

### 2.3 Nazewnictwo i format danych (MUST)
- Wszystkie pola kontraktów i API Fleet Managera **MUST** używać **camelCase**.
- Nazwy pól **MUST** być po angielsku (np. `robotId`, `createdTsMs`, `forkHeightM`).
- Zewnętrzne protokoły (RoboCore/Robokit) **MUST NOT** być „poprawiane” — zachowujemy ich oryginalne nazwy pól (często `snake_case`).

### 2.4 Wersjonowanie (MUST)
- API: wersjonowanie w ścieżce: `/api/v1`, `/gateway/v1`, `/algo/v1`.
- Kontrakty: `contractsVersion` (string) w `SceneManifest` oraz `snapshot.schemaVersion`.
- Zmiany łamiące **MUST** zwiększać wersję główną API i/lub `contractsVersion`.

### 2.5 Identyfikatory i czas (MUST)
- `*Id` w domenie: **ULID** (string), np. `cmd_01JH1B...`.
- `cursor`: rosnąca liczba całkowita (`int64`) — monotoniczna w ramach instancji Core (MVP).
- `tsMs`: epoch ms.
- Wszystkie logi i snapshoty **MUST** zawierać `cursor` i `tsMs`.

### 2.6 Zasady walidacji requestów (anti-footgun)

#### 2.6.1 HTTP API (MUST)
- Serwer **MUST** odrzucać requesty z nieznanymi polami (`400 unknownField`),
  **z wyjątkiem** pól umieszczonych w obiektach `meta` lub `debug` (jeśli występują),
  gdzie nieznane pola **MUST** być ignorowane (bufor ewolucji kontraktów).

#### 2.6.2 Import sceny / zewnętrzne formaty (MUST)
- Parser zewnętrznych plików sceny (np. mapy) **MAY** tolerować nieznane pola, ale:
  - **MUST** zachować je w `raw.*` lub `meta.*` (dla debug/replay),
  - **MUST NOT** używać ich do logiki domenowej bez jawnego dodania do kontraktu.

### 2.7 JSON5 w dokumentacji (SHOULD)
- W przykładach używamy JSON5 (komentarze, trailing commas), bo jest czytelniejszy.
- Rzeczywiste API przesyła JSON (RFC 8259).

## 3. Glosariusz (pojęcia)

- **Scene** — aktywny zestaw: mapa + konfiguracja (worksites/streams/robots/…).
- **Scene Package** — paczka (katalog/zip) z plikami sceny, importowana do Core.
- **SceneGraph** — kanoniczny graf mapy (nodes/edges + geometria), wynik Map Compiler.
- **LocationMark (LM)** — punkt lokalizacji/pośredni, wykorzystywany jako target nawigacji.
- **ActionPoint (AP)** — punkt akcji (np. podniesienie wideł), też może być targetem nawigacji.
- **Rolling Target** — sterowanie wysokopoziomowe: Core/algorytm wysyła kolejne cele „do przodu” na trasie.
  W tej wersji specyfikacji Rolling Target jest wskazywany jako **NodeRef** (`LocationMark` lub `ActionPoint`),
  a nie współrzędne (x,y).
- **Worksite** — logiczne „miejsce pracy” (np. pole odkładcze/odbiorcze), mapowane na LM/AP.
- **Stream** — definicja procesu (np. inbound/outbound), generuje zadania.
- **Task** — zadanie domenowe (np. pickDrop).
- **CommandRecord** — zarejestrowana komenda do robota (idempotentna, audytowalna).
- **Provider** — implementacja sterowania robotem (np. `internalSim`, `robocore`, `robokitSim`).
- **Gateway** — usługa integracyjna, która rozmawia z robotami (TCP, itp.) i wystawia HTTP dla Core.
- **Lease / Seize control** — mechanizm wyłączności kontroli (jedna instancja UI może sterować, reszta read-only).

---

## 3. Kontrakty wspólne (verbatim z v0.7)
# Fleet Manager 2.0 — Kontrakty wspólne (v0.7)

Ten plik jest „kanonem kontraktów”, wspólnym dla Core/Gateway/Algorithm/UI.

## 1. Typy bazowe

```json5
{
  // ULID jako string (np. "01JH1B...")
  Ulid: "string",

  RobotId: "string",       // np. "RB-01" (zewnętrzny identyfikator robota)
  SceneId: "string",       // ULID
  TaskId: "string",        // ULID
  CommandId: "string",     // ULID
  StreamId: "string",      // np. "stream_inbound_01"
  WorksiteId: "string",    // np. "PICK_01"

  TimestampMs: 1736160000000, // int64 epoch ms
  Cursor: 123456,             // int64, rosnący monotonicznie w obrębie instancji Core
}
```

## 2. Geometria i kinematyka (w domenie FM)

### 2.1 Pose2D
```json5
{
  xM: 12.34,
  yM: 5.67,
  angleRad: 1.57079632679,
}
```

### 2.2 Velocity2D
```json5
{
  vxMps: 0.5,
  vyMps: 0.0,
  angularSpeedRadS: 0.0,
}
```

## 3. ErrorEnvelope (kanoniczny format błędu)
Wszystkie API HTTP (Core/Gateway/Algorithm) **MUST** zwracać błędy w tym formacie.

```json5
{
  error: {
    code: "validationError",         // enum, patrz niżej
    message: "Unknown field: fooBar",
    details: {
      field: "fooBar",
      expected: ["robotId", "sceneId"],
    },

    // CauseCode: „dlaczego” (patrz Reason Codes)
    causeCode: "UNKNOWN_FIELD",

    // Korelacja i debug (SHOULD)
    traceId: "trace_01JH...",
    requestId: "req_01JH...",
  }
}
```

### 3.1 ErrorEnvelope.code (MUST — zamknięty katalog)
Minimalny katalog (może rosnąć, ale nie zmienia znaczeń istniejących):

- `validationError`
- `notFound`
- `conflict`
- `notAllowed`
- `unauthorized` (poza MVP, ale kod zarezerwowany)
- `forbidden` (poza MVP, ale kod zarezerwowany)
- `rateLimited` (poza MVP, ale kod zarezerwowany)
- `timeout`
- `dependencyUnavailable`
- `internalError`

### 3.2 Mapowanie ErrorEnvelope.code → HTTP status (MUST)
- `validationError` → **400**
- `notFound` → **404**
- `conflict` → **409**
- `notAllowed` → **405**
- `unauthorized` → **401**
- `forbidden` → **403**
- `rateLimited` → **429**
- `timeout` → **504** (jeśli timeout do dependency) lub **408** (jeśli timeout klienta)
- `dependencyUnavailable` → **503**
- `internalError` → **500**

## 4. Reason Codes (kody przyczyn)
Zasada: każdy ważny status w domenie ma `*ReasonCode` (string).
Kody są używane zarówno w UI, jak i do automatycznej diagnostyki.

### 4.1 ReasonCode — wartości bazowe
- `NONE`
- `UNKNOWN`
- `VALIDATION_FAILED`
- `UNKNOWN_FIELD`
- `CONFLICT`
- `STALE_STATE`
- `DEPENDENCY_OFFLINE`
- `NETWORK_ERROR`
- `TIMEOUT`
- `EMERGENCY_STOP`
- `ROBOT_BLOCKED`
- `ROBOT_WANTS_AVOIDANCE`
- `ROBOT_MANUAL_MODE`
- `ROBOT_LOCALIZATION_LOST`
- `SCENE_NOT_ACTIVE`
- `CONTROL_LEASE_REQUIRED`
- `CONTROL_LEASE_SEIZED`
- `PROVIDER_SWITCHING`
- `COMMAND_REJECTED`
- `COMMAND_ACK_TIMEOUT`
- `COMMAND_EXEC_TIMEOUT`
- `COMMAND_CANCELED`
- `MAP_INVALID`
- `MAP_IMPORT_FAILED`
- `ALGO_TIMEOUT`
- `ALGO_ERROR`

**Uwaga:** katalog może rosnąć, ale istniejące kody MUST zachować znaczenie.

## 5. EventEnvelope (event sourcing + SSE)
Wszystkie zdarzenia domenowe **MUST** być logowane jako `EventEnvelope`.
SSE **MUST** przesyłać dokładnie ten sam format.

```json5
{
  cursor: 123456,
  tsMs: 1736160000123,

  // Kanoniczna nazwa eventu (MUST)
  type: "robotStateUpdated", // patrz katalog poniżej

  // Dla debug / korelacji (SHOULD)
  traceId: "trace_01JH...",
  request: {
    clientId: "ui-traffic-lab-01",
    requestId: "req_01JH...",
  },

  // Payload zależy od type
  payload: { /* ... */ },
}
```

### 5.1 Katalog `EventEnvelope.type` (MVP + fundament)
- `stateSnapshot` (snapshot całego stanu; patrz SSE i snapshoty)
- `sceneImported`
- `sceneActivated`
- `sceneActivationFailed`

**Control Lease (seize control):**
- `controlLeaseChanged`
- `controlLeaseSeized`
- `controlLeaseExpired`
- `robotStateUpdated`
- `robotProviderSwitched`
- `worksiteUpdated`
- `streamUpdated`
- `taskCreated`
- `taskUpdated`
- `taskCanceled`
- `commandCreated`
- `commandUpdated`
- `lockUpdated`
- `reservationUpdated`
- `systemWarning`
- `systemError`

### 5.2 Zasady spójności
- `cursor` MUST rosnąć o 1 dla każdego eventu zapisanego w logu.
- Event log MUST być jedynym źródłem prawdy dla odtwarzania.
- Snapshot MUST zawierać `cursor` odpowiadający ostatniemu eventowi, który obejmuje.

## 6. Kontrakty konfiguracji usług (JSON5)

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

### 6.2 FleetGatewayConfig
```json5
{
  dataDir: "./data",
  captureDir: "./data/capture",

  http: { listenHost: "0.0.0.0", listenPort: 8081 },

  providers: {
    internalSim: { enabled: true },

    // real robot via Robokit TCP framing (RoboCore/Robokit)
    robocore: {
      enabled: true,
      robots: {
        "RB-01": { host: "10.0.0.11", ports: { state: 19204, ctrl: 19205, task: 19206, other: 19210, push: 19301 } },
      },
      tcp: {
        connectTimeoutMs: 800,
        requestTimeoutMs: 1000,
        maxConcurrentPerRobot: 4,
        circuitBreaker: { failureThreshold: 5, openMs: 5000 },
        reconnect: { enabled: true, baseDelayMs: 500, maxDelayMs: 10000, backoffFactor: 2.0 },
      },
    },

    // robokit-robot-sim (zewnętrzny symulator) przez ten sam protokół TCP
    robokitSim: {
      enabled: true,
      robots: {
        "RB-01": { host: "127.0.0.1", ports: { state: 19204, ctrl: 19205, task: 19206, other: 19210, push: 19301 } },
      },
    },
  },
}
```

### 6.3 AlgorithmServiceConfig
```json5
{
  http: { listenHost: "0.0.0.0", listenPort: 8082 },
  algo: {
    id: "algo_mvp_v0_1",
    tickHzMax: 20,
    // opcjonalne flagi debug
    debug: { emitExplain: true },
  },
}
```

## 7. Limits & defaults (tabela)
Poniżej twarde limity i domyślne wartości. W MVP można trzymać w configu, ale spec mówi,
co jest „bezpiecznym” defaultem.

| Parametr | Domyślnie | Limit | Uwagi |
|---|---:|---:|---|
| `tickHz` | 10 | 1..50 | algorithm timeout SHOULD < 1/tick |
| `statusAgeMaxMs` | 1500 | 200..5000 | stale status => hold |
| `rollingTarget.lookaheadMinDistanceM` | 3.0 | 0.5..20 | zależne od mapy |
| `rollingTarget.updateMinIntervalMs` | 300 | 50..5000 | anty-spam |
| `snapshots.intervalMs` | 1000 | 100..10000 | MUST na dysk |
| `eventLog.retentionDays` | 14 | 1..365 | rotacja + archiwizacja |
| `gateway.timeoutMs` | 1200 | 50..10000 | HTTP |
| `robocore.tcp.requestTimeoutMs` | 1000 | 50..5000 | TCP do robota |

---

## 4. Kontrakty: scena i mapa (verbatim z v0.7)
# Fleet Manager 2.0 — Kontrakty: scena i mapa (v0.7)

## 1. Scene Package (format paczki sceny)
**Note:** Kanoniczny layout i lifecycle scen jest zdefiniowany w `spec/07_scene-management.md`
i ten dokument ma pierwszenstwo. Na tym etapie **NIE ma kompatybilnosci wstecznej** —
legacy paczki i migracje **nie sa wspierane**.

### 1.1 Struktura katalogu (MUST)
Scene Package **MUST** być katalogiem (w storage Core) lub zipem (na wejściu importu)
o strukturze z **rootem paczki jako katalog sceny** (bez dodatkowego poziomu `scene/`):

```text
<scene-root>/
  manifest.json5              # MUST
  map/
    raw.smap                  # SHOULD (oryginał)
    graph.json                # MUST (kanoniczny SceneGraph; wynik Map Compiler)
    assets/                   # MAY (np. obrazki tła dla UI)
  compiled/
    compiledMap.json          # MUST (kanon dla algorytmu/runtime)
    meta.json                 # SHOULD (statystyki, hashe)
  config/
    robots.json5              # MAY (konfiguracja robotów)
    worksites.json5           # MUST (dla MVP)
    streams.json5             # MUST (dla MVP)
    actionPoints.json5        # MAY (akcje AP, np. widły)
  README.md                   # MAY (opis sceny)
```

### 1.2 Ochrona przed zip-bomb i gigantycznymi plikami (MUST)
Import zip **MUST**:
- limitować liczbę plików,
- limitować sumaryczny rozmiar po rozpakowaniu,
- odrzucać ścieżki typu `../` (zip-slip).

### 1.3 SceneManifest (MUST)
```json5
{
  sceneId: "scene_01JH1B...",
  sceneName: "warehouse_nowy_styl",
  createdTsMs: 1736160000000,

  // wersje
  contractsVersion: "fm-contracts-v0.4",
  mapFormat: "smap+graphjson-v1",

  // checksums (SHOULD)
  checksums: {
    "map/graph.json": "sha256:...",
    "compiled/compiledMap.json": "sha256:...",
    "map/raw.smap": "sha256:...", // jeśli istnieje
  },

  // opis opcjonalny
  meta: {
    author: "inovatica",
    notes: "MVP scene",
  },
}
```

## 2. SceneGraph (kanoniczny graf mapy)

**Kluczowa zmiana v0.4:** geometria krawędzi jest częścią kontraktu i jest dostępna dla algorytmu.
Geometria pochodzi z `.smap`, a w `graph.json` jest reprezentowana m.in. jako `DegenerateBezier`.

### 2.1 Struktura `graph.json` (MUST)
```json5
{
  meta: {
    mapName: "mapa_nowy_styl",
    resolutionM: 0.02, // jeśli źródło ma inne jednostki, Map Compiler MUST przeliczyć do metrów
    source: "map/raw.smap",
  },

  nodes: [ /* Node[] */ ],
  edges: [ /* Edge[] */ ],

  // elementy wizualne dla UI (MAY)
  lines: [ /* FeatureLine[] */ ],
  areas: [ /* FeatureArea[] */ ],
}
```

## 3. Węzły (Nodes)

### 3.1 Wspólne pola Node (MUST)
```json5
{
  nodeId: "LM1",                 // unikalny w obrębie graph
  nodeType: "locationMark",      // locationMark | actionPoint | parkPoint | chargePoint | ...
  className: "LocationMark",     // zachowane z mapy (case-sensitive)
  pos: { xM: 31.733, yM: 4.833 },
  angleRad: 0.0,                 // jeśli znany
  props: { /* external/raw */ },

  // mapowanie identyfikatorów do systemów zewnętrznych (MAY, ale RECOMMENDED)
  // Uwaga: nodeId w FM nie musi być tym samym co „station id” robota.
  externalRefs: {
    // identyfikator używany w protokole RoboCore/Robokit dla goTarget(id)
    stationId: "LM1",
  }
}
```

### 3.2 LocationMark
- `className = "LocationMark"`
- Semantyka: punkt nawigacyjny, może służyć jako rolling target.

### 3.3 ActionPoint
- `className = "ActionPoint"`
- Semantyka: punkt akcji, może służyć jako rolling target.
- Dodatkowo: akcje AP mogą być opisane w `config/actionPoints.json5` (patrz niżej).

## 4. Krawędzie (Edges) i geometria

### 4.1 Edge (MUST)
```json5
{
  edgeId: "LM1-LM2",
  className: "DegenerateBezier",   // klasa geometrii (z mapy)
  startNodeId: "LM1",
  endNodeId: "LM2",

  // geometria w metrach (MUST)
  p0: { xM: 31.733, yM: 4.833 },
  p1: { xM: 31.700, yM: 4.850 },
  p2: { xM: 31.680, yM: 4.820 },
  p3: { xM: 31.650, yM: 4.833 },

  // props zachowane z mapy źródłowej (Roboshop)
  props: {
    direction: 1,      // kierunek z mapy źródłowej (np. 1/-1/0)
    movestyle: 0,      // typ ruchu z mapy źródłowej (np. 0/1)
    width: 2.0         // szerokość korytarza z mapy źródłowej
  },

  // długość krzywej wyliczona przez Map Compiler
  lengthM: 12.34,

  // opcjonalne próbki geometrii (ułatwiają render i symulację)
  samples: {
    arcLengthM: 12.34,
    stepM: 0.2,
    points: [
      { xM: 31.733, yM: 4.833 },
      { xM: 31.700, yM: 4.845 }
    ]
  }
}
```

### 4.2 Wymagania dot. geometrii (MUST)
- Map Compiler MUST zachować geometrię źródłową (control points) w `graph.json`.
- Map Compiler MUST wyliczyć `lengthM` deterministycznie.
- Algorytm MUST mieć dostęp do geometrii (wprost) i/lub do próbkowanej polilinii (jeśli dostarczona).

**Rekomendacja (SHOULD):** Map Compiler dodaje pole `samples`:
```json5
{
  samples: {
    arcLengthM: 12.34,
    stepM: 0.2,
    points: [
      { xM: 31.733, yM: 4.833 },
      { xM: 31.700, yM: 4.845 }
    ]
  }
}
```
To upraszcza symulację, wizualizację i algorytmy (bez implementacji Béziera w każdym miejscu).

## 5. ActionPoint actions (np. widły)

### 5.1 `config/actionPoints.json5` (MAY, ale dla wideł w MVP: SHOULD)
```json5
[
  {
    actionPointId: "AP_PICK_01",
    actionType: "forkHeight",

    // parametry w metrach (Twoje wymaganie: "z jakiej wysokości na jaką")
    params: {
      fromHeightM: 0.10,        // MAY (walidacja startu)
      toHeightM: 1.20,          // MUST
      toleranceM: 0.02,         // SHOULD
      timeoutMs: 20000,         // SHOULD
    },

    meta: { label: "Pick: forks up" },
  },
  {
    actionPointId: "AP_DROP_01",
    actionType: "forkHeight",
    params: { toHeightM: 0.10 },
    meta: { label: "Drop: forks down" },
  },
]
```

### 5.2 Walidacja (MUST)
- `actionPointId` MUST istnieć w `SceneGraph.nodes` jako `className = "ActionPoint"`.
- `toHeightM` MUST być >= 0.
- `fromHeightM`, jeśli podane, MUST być >= 0.

## 6. FeatureLine / FeatureArea (UI)
To elementy wizualne i/lub semantyczne (strefy). UI może je renderować,
a Core/Algorytm mogą używać jako soft constraints w przyszłości.

Kontrakt jest kompatybilny wstecz: `lines[]` i `areas[]` są opcjonalne.

## 7. Dynamiczna zmiana mapy i konfiguracji (SHOULD)
- Core MAY przyjmować patch sceny (np. update worksites/streams) bez zmiany mapy.
- Zmiana `graph.json` (mapy) w trakcie pracy jest bardziej ryzykowna; jeśli wprowadzana:
  - Core MUST wykonać pełną procedurę Scene Activation (patrz `07_*` i `08_*`),
  - Core MUST anulować/holdować aktywne komendy i zaktualizować locki.

Szczegóły: `01_fleet-core.md`, `07_scene-management.md`, `09_map-compiler.md`.

---

## 5. Kontrakty: domena (worksites/streams/tasks/robots) (verbatim z v0.7)
# Fleet Manager 2.0 — Kontrakty: domena (v0.7)

## 1. Roboty

### 1.1 RobotConfig (statyczne)
```json5
{
  robotId: "RB-01",
  displayName: "Forklift #1",

  footprint: {
    lengthM: 2.0,
    widthM: 0.9,
    safetyMarginM: 0.2,
  },

  limits: {
    maxVxMps: 1.2,
    maxAngularSpeedRadS: 1.0,
  },

  // preferowany provider
  defaultProvider: "robocore", // internalSim | robokitSim | robocore

  meta: { model: "X", notes: "..." },
}
```

### 1.2 RobotRuntimeState
```json5
{
  robotId: "RB-01",
  provider: {
    kind: "robocore",                 // internalSim | robokitSim | robocore
    status: "online",                 // offline | connecting | online | error
    statusReasonCode: "NONE",
    lastSeenTsMs: 1736160000123,
  },

  pose: { xM: 10.0, yM: 3.0, angleRad: 0.0 },
  velocity: { vxMps: 0.0, vyMps: 0.0, angularSpeedRadS: 0.0 },

  // uogólniony stan nawigacji (normalizowany z robota)
  navigation: {
    state: "idle", // idle | moving | paused | blocked | arrived | canceled | error
    stateReasonCode: "NONE",
    currentNodeId: "LM1",       // MAY (jeśli znane)
    targetNodeId: "AP_PICK_01", // MAY
    pathNodeIds: ["LM1", "LM2", "AP_PICK_01"], // MAY
  },

  // blokady i bezpieczeństwo
  blocked: {
    isBlocked: false,
    blockedReasonCode: "NONE",
    sinceTsMs: null,
  },

  // widełki (jeśli robot wspiera)
  fork: {
    heightM: 0.10,
    targetHeightM: 0.10,
    inPlace: true,
  },

  // bieżące wykonanie w Core
  currentCommandId: "cmd_01JH...",
  currentTaskId: "task_01JH...",
}
```

## 2. Worksites (pola odkładcze/odbiorcze)

### 2.1 Worksite (definicja)
```json5
{
  worksiteId: "PICK_01",
  worksiteType: "pickup", // pickup | dropoff | buffer | charger | park

  // Mapowanie na graf (LM/AP). Dla rolling target i planowania.
  entryNodeId: "LM10",        // MUST: LocationMark
  actionNodeId: "AP_PICK_01", // SHOULD: ActionPoint (dla akcji), może być null dla prostych miejsc

  // reguły
  constraints: {
    allowedRobotIds: ["RB-01", "RB-02"], // MAY
  },

  meta: { label: "Pick #01" },
}
```

### 2.2 WorksiteState (runtime)
```json5
{
  worksiteId: "PICK_01",
  occupancy: "filled",    // unknown | empty | filled | reserved (legacy "occupied" => "filled")
  occupancyReasonCode: "NONE",
  updatedTsMs: 1736160000123,
}
```

## 3. Streams

### 3.1 StreamDefinition (kanoniczny, MVP)
Stream jest **kanonicznym** opisem procesu transportu. W MVP obslugujemy tylko
`kind = "pickDrop"`. Format jest scisly: **nie** akceptujemy nieznanych pol.

```json5
{
  streamId: "stream_inbound_01",     // MUST, unikalny w scenie
  enabled: true,                     // MUST
  kind: "pickDrop",                  // MUST (MVP)

  params: {
    pickGroup: ["PICK_01", "PICK_02"],          // MUST (lista worksites typu pickup)
    dropGroup: ["DROP_01", "DROP_02"],          // MUST (lista worksites typu dropoff, z kolejnoscia)
    commitDistanceM: 8.0,                       // MAY (patrz 3.1.4)

    pickPolicy: {                               // MAY (patrz 3.1.2)
      selection: "filled_only"
    },
    dropPolicy: {                               // MAY (patrz 3.1.3)
      selection: "first_available_in_order",
      accessRule: "preceding_empty"
    },

    pickParams: {                               // MAY (patrz 3.1.5)
      operation: "ForkLoad",
      start_height: 0.1,
      end_height: 1.2,
      recognize: false
    },
    dropParams: {                               // MAY (patrz 3.1.5)
      operation: "ForkUnload",
      start_height: 1.2,
      end_height: 0.1,
      recognize: false
    }
  },

  meta: { label: "Inbound" },        // MAY
}
```

### 3.1.1 Wymagania ogolne (MUST)
- `streamId` jest unikalne w scenie.
- `kind` w MVP MUSI byc `pickDrop`.
- `params.pickGroup` i `params.dropGroup` MUSZA byc:
  - listą **worksiteId**, albo
  - nazwą grupy (string), która jest rozwiazywana do listy podczas importu/aktywacji.
- Lista `pickGroup` musi zawierac tylko worksites typu `pickup`.
- Lista `dropGroup` musi zawierac tylko worksites typu `dropoff`.
- Nie dopuszczamy nieznanych pol (strict validation).

### 3.1.2 Pick policy (MVP)
`params.pickPolicy.selection` (MAY, domyslnie `filled_only`):
- `filled_only` — wybieraj tylko worksites z `occupancy=filled`.
- `any` — wybieraj dowolny worksite z `pickGroup` (MVP: tylko do testow).

### 3.1.3 Drop policy (MVP)
`params.dropPolicy.selection` (MAY, domyslnie `first_available_in_order`):
- `first_available_in_order` — pierwszy `empty` z `dropGroup` (w tej kolejnosci).

`params.dropPolicy.accessRule` (MAY, domyslnie `preceding_empty`):
- `preceding_empty` — drop N jest mozliwy tylko, gdy wszystkie poprzednie
  dropy w `dropGroup` sa `empty`.
- `none` — brak dodatkowej reguly (MVP: tylko do testow).

### 3.1.4 Commit distance (MVP)
`params.commitDistanceM` (MAY):
- gdy robot jest blizej niz `commitDistanceM` od wybranego drop,
  wybor drop staje sie **ostateczny** i nie moze byc zmieniony.
- jesli brak, domyslnie `8.0`.

### 3.1.5 Pick/Drop params (MVP, komendy do robota)
`pickParams` i `dropParams` sa przekazywane jako payload do `goTarget`.
W MVP obowiazuja pola:
- `operation` (MUST): `ForkLoad` dla pick, `ForkUnload` dla drop.
- `start_height` (MUST): wysokosc startowa (m).
- `end_height` (MUST): wysokosc docelowa (m).
- `recognize` (MUST): `true|false`.
- `recfile` (MUST gdy `recognize=true`): profil palety na robocie.
- `rec_height` (MAY): wysokosc rozpoznania (m).

Domyslne wartosci (MVP fallback):
- `pickParams`: `start_height=0.1`, `end_height=1.2`, `recognize=false`
- `dropParams`: `start_height=1.2`, `end_height=0.1`, `recognize=false`

### 3.1.6 Walidacja strumieni (MUST)
Core **MUST** odrzucic stream, gdy:
- `pickGroup` lub `dropGroup` jest puste.
- w listach sa nieistniejace `worksiteId`.
- `pickGroup`/`dropGroup` jest nazwa grupy, ktora nie istnieje.
- `pickGroup` zawiera worksite nie typu `pickup`.
- `dropGroup` zawiera worksite nie typu `dropoff`.
- `pickGroup` i `dropGroup` maja wspolne elementy (ten sam worksite).
- brakuje wymaganych pol `pickParams`/`dropParams` przy wysylaniu komend.

### 3.1.7 Normalizacja (MUST)
- `config/streams.json5` w paczce sceny jest **kanoniczny** i moze zawierac
  listy `worksiteId` **lub** nazwy grup (string).
- Jesli uzywane sa nazwy grup, Core MUST rozwiązać je deterministycznie
  podczas importu/aktywacji (z zachowaniem kolejnosci).

## 4. Tasks

### 4.1 Task (domena)
W MVP Task może być „wysokopoziomowy”, a plan (kroki) może być generowany przez Core.
Ale kontrakt przewiduje kroki, bo są potrzebne do akcji typu widły.

```json5
{
  taskId: "task_01JH...",
  createdTsMs: 1736160000000,

  streamId: "stream_inbound_01",
  kind: "pickDrop",

  fromWorksiteId: "PICK_01",
  toWorksiteId: "DROP_01",

  priority: 10,

  // runtime
  status: "created", // created | assigned | running | completed | failed | canceled
  statusReasonCode: "NONE",

  assignedRobotId: "RB-01", // null jeśli nieprzydzielone

  // opcjonalny plan kroków (Task Runner), czytelny dla człowieka i AI
  steps: [
    {
      stepId: "step_01",
      type: "goTarget",
      targetRef: { nodeId: "AP_PICK_01" },
      params: { operation: "ForkLoad", start_height: 0.1, end_height: 1.2 }
    },
    {
      stepId: "step_02",
      type: "goTarget",
      targetRef: { nodeId: "AP_DROP_01" },
      params: { operation: "ForkUnload", start_height: 1.2, end_height: 0.1 }
    }
  ],

  meta: { label: "PICK_01 -> DROP_01" },
}
```

**MVP note (spojne z orchestrator):**
- `steps` sa **opcjonalne**. Core moze tworzyc taski bez krokow.
- Dla `pickDrop` w MVP komenda do robota to **jedno** `goTarget` z
  `operation = ForkLoad | ForkUnload` (bez osobnych `forkHeight` krokow).
- `steps` moga byc generowane tylko do celow UI/debug (syntetyczne), ale nie sa
  wymagane do wykonania tasku.

### 4.2 TaskStep
```json5
{
  stepId: "step_03",
  type: "goTarget", // goTarget | moveTo | wait | forkHeight | io | custom
  targetRef: { nodeId: "AP_PICK_01" }, // dla goTarget/moveTo; dla forkHeight MAY być null

  params: {
    // goTarget with fork operation (MVP)
    operation: "ForkLoad", // ForkLoad | ForkUnload | ForkHeight
    start_height: 0.10,    // MAY
    end_height: 1.20,      // SHOULD
    recognize: false,      // MAY
    recfile: "plt/p0001.plt", // MAY
    rec_height: 0.10,      // MAY

    // forkHeight (legacy/manual)
    fromHeightM: 0.10,     // MAY
    toHeightM: 1.20,       // MUST
    toleranceM: 0.02,      // SHOULD
    timeoutMs: 20000,      // SHOULD
  },

  status: "pending", // pending | running | completed | failed | canceled
  statusReasonCode: "NONE",
}
```

**Zasada:** jeżeli `type = goTarget`, Core wysyła pojedynczą komendę `goTarget` z `operation`
(ForkLoad/ForkUnload) i traktuje to jako krok złożony.  
Jeżeli `type = forkHeight`, a `targetRef` jest null, Core wykonuje akcję „tu i teraz”.
Jeżeli `targetRef` wskazuje ActionPoint, Core SHOULD najpierw doprowadzić robota do AP, a potem wykonać akcję.

## 5. CommandRecord (komendy do robota)
CommandRecord jest audytowalny i idempotentny end-to-end (Core→Gateway→Robot).

**Ważne (MUST):** statusy CommandRecord rozdzielają 3 różne rzeczy:
- Transport ACK (Core→Gateway) = `dispatched`,
- Robot protocol ACK (Gateway↔Robot) = `acknowledged` (jeśli wspierane),
- DONE = `completed` (decyduje Core na podstawie telemetrii/polityki).

Szczegóły semantyki: `01_fleet-core.md` + `16_orchestrator-behavior.md`.

```json5
{
  commandId: "cmd_01JH...",
  createdTsMs: 1736160000123,

  robotId: "RB-01",

  // typ komendy (MUST)
  type: "goTarget", // goTarget | goPoint | stop | pause | resume | cancel | forkHeight | forkStop | ...

  // payload domenowy (camelCase; gateway przetłumaczy na robot-protocol jeśli trzeba)
  payload: {
    // goTarget (rolling target): LM/AP
    targetRef: { nodeId: "LM2" },

    // opcjonalnie: rozwiązany identyfikator stacji/markera w protokole robota
    // (Core SHOULD wypełniać na podstawie SceneGraph.nodes[].externalRefs)
    targetExternalId: "LM2",

    // goTarget with fork operation
    operation: "ForkLoad",
    start_height: 0.10,
    end_height: 1.20,
    recognize: false,
    recfile: "plt/p0001.plt",
    rec_height: 0.10,

    // forkHeight (legacy/manual)
    toHeightM: 1.20,
  },

  // polityki per-komenda (SHOULD: jawnie, żeby nie było "magii")
  policy: {
    // ACK timeout: jeśli robot wspiera robot-ACK dla tej komendy
    ackTimeoutMs: 1200,   // SHOULD
    // EXEC timeout: ile maks. czekamy na DONE (np. arrival / fork reached)
    execTimeoutMs: 60000, // SHOULD
  },

  // lifecycle (patrz `07_*`)
  status: "created", // created | dispatched | acknowledged | completed | failed | canceled
  statusReasonCode: "NONE",

  // Transport ACK (Core→Gateway)
  transport: {
    status: "pending",   // pending | accepted | failed
    acceptedTsMs: null,  // wypełniane gdy Core dostanie HTTP 2xx z gateway
    httpStatus: null,    // np. 200/503 (debug)
    attempts: 0,         // ile razy Core próbował dispatch (bounded retry)
    lastErrorCauseCode: "NONE", // np. DEPENDENCY_OFFLINE | TIMEOUT
  },

  // Robot protocol ACK (Gateway↔Robot) — jeśli protokół wspiera
  robotAck: {
    status: "pending",   // pending | received | notSupported | failed
    receivedTsMs: null,
    apiNo: null,         // np. 3051
    seq: null,           // seq z nagłówka
    responseApiNo: null, // zazwyczaj apiNo+10000
    lastErrorCauseCode: "NONE",
  },

  // DONE (w domenie Core) — Core wyznacza completion na podstawie telemetrii/polityki
  completion: {
    status: "pending", // pending | completed | failed | canceled
    completedTsMs: null,
    detectedBy: "NONE", // NONE | navigationArrived | forkOperationCompleted | forkHeightReached | stopPolicy | manual
    details: { /* opcjonalnie: tolerancje, dystans, itp. */ },
  },

  request: { clientId: "ui-01", requestId: "req_01JH..." },
}
```

## 6. Locki i rezerwacje (podstawa dla multi-robot)
(MVP: można zacząć od prostego lockowania krawędzi/grup, ale kontrakt jest gotowy na rozszerzenia)

```json5
{
  lockId: "lock_01JH...",
  resourceType: "edgeGroup",   // edge | edgeGroup | node | area
  resourceId: "LM1<->LM2",     // klucz zasobu (kanoniczny)
  holderRobotId: "RB-01",
  status: "held",              // requested | held | released | expired
  statusReasonCode: "NONE",
  expiresTsMs: 1736160005123,
}
```

---

## 6. Semantyka runtime i maszyny stanów (verbatim z v0.7)
# Fleet Manager 2.0 — Semantyka runtime i maszyny stanów (v0.7)

Ten plik jest „kanonem zachowania” systemu. Tu są reguły, które minimalizują niejednoznaczność implementacji.

---

## 1. Single-writer Core (ADR, MVP)
- W MVP Core jest pojedynczą instancją (single-writer).
- `cursor` jest monotoniczny w obrębie instancji.
- HA jest poza MVP, ale kontrakty MUST mieć `schemaVersion`, a logi/snapshoty muszą dać się migrować.

---

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

## 3. Scene Activation (przełączanie sceny)

### 3.1 Reguły nadrzędne (MUST)
- Core MUST mieć w danym momencie co najwyżej jedną scenę aktywną.
- Aktywacja sceny MUST być atomowa z perspektywy klientów (albo jest w pełni aktywna, albo nie).
- Podczas aktywacji Core MUST przejść w tryb `activating` i:
  - MUST zablokować przyjmowanie nowych komend/tasków (409 `SCENE_NOT_ACTIVE`),
  - MUST wstrzymać dispatch do gateway (hold robots).

### 3.2 Procedura aktywacji (MUST)
1) Validate scene package (manifest + graph + config).
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

## 5. Task lifecycle (Task) — state machine (MVP)

```text
created -> assigned -> running -> completed
  |          |          |
  |          |          -> failed
  |          -> canceled
  -> canceled
running -> canceled
```

- Task Runner w Core MUST wykonywać kroki sekwencyjnie.
- Dla kroków `moveTo` Core dispatchuje `goTarget` (rolling target) aż do `arrived`.
- Dla pick/drop w MVP Core używa `goTarget` z `operation=ForkLoad/ForkUnload` (bez osobnych `forkHeight`).
- `forkHeight` pozostaje jako tryb legacy/manual (poza MVP0).

---

## 6. Provider switching (hot switch) — reguły (MUST)
- Zmiana providera jest operacją „bezpieczną”: Core MUST najpierw wymusić `stop` (best effort),
  a dopiero potem przełączyć providera w gateway.
- Core MUST emit `robotProviderSwitched` i zapisać snapshot.
- Gateway MUST umieć przełączyć providera per-robot bez restartu procesu.

Szczegóły w `02_fleet-gateway.md` + ta sekcja.

---

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

## 8. SSE i cursor semantics (MUST)
- SSE niesie wyłącznie `EventEnvelope`.
- `id:` w SSE MUST równać się `EventEnvelope.cursor`.
- Snapshot jest zdarzeniem `type="stateSnapshot"` i też ma `cursor`.
- Precedencja: jeśli klient poda `fromCursor`, Core MUST zignorować `Last-Event-ID`.
- Jeśli `fromCursor` jest poza retencją:
  - Core MUST wysłać `stateSnapshot` z `payload.requiresResync=true` i rozpocząć stream od tej migawki.

---

## 7. Symulacja i hot-switch providerów (verbatim z v0.7)
# Fleet Manager 2.0 — Symulacja i hot-switch providerów (v0.7)

## 1. Provider model (MUST)
Gateway obsługuje provider per-robot:
- `internalSim` — deterministyczna symulacja 2D (wiele robotów, kolizje)
- `robokitSim` — zewnętrzny symulator po protokole RoboCore/Robokit TCP
- `robocore` — prawdziwy robot po protokole RoboCore/Robokit TCP

Core widzi tylko `provider.kind` i `RobotRuntimeState` (znormalizowany).

## 2. InternalSim — wymagania (MUST)
- Symulator MUST obsługiwać wiele robotów w jednej scenie.
- Symulator MUST uwzględniać kolizje robot-robot na poziomie „footprint + safetyMargin”.
- Symulator SHOULD korzystać z geometrii mapy (DegenerateBezier → polilinia) dla ruchu po trasie.
- Symulator MUST mieć tryb deterministyczny (seed) i generować te same eventy przy tym samym wejściu.

Minimalny model ruchu (MVP):
- robot porusza się po kolejnych węzłach (LM/AP) z prędkością `maxVxMps`,
- skręty są dyskretne (ustawienie angle na końcu krawędzi),
- kolizja wykrywana jako przecięcie footprintów; reakcja: zatrzymanie + `blocked`.

## 3. Hot switch (Core→Gateway) — procedura (MUST)
Przełączanie pojedynczego robota w trakcie symulacji jest dozwolone.

### 3.1 Bezpieczna sekwencja
1) Core emituje `commandCreated(stop)` i dispatchuje do Gateway (best effort).
2) Core wywołuje `POST /gateway/v1/robots/{robotId}/provider-switch`.
3) Core emituje `robotProviderSwitched` i zapisuje snapshot.
4) Core wznawia Task Runner / rolling target dla tego robota dopiero, gdy `provider.status=online`.

### 3.2 Co jeśli stop się nie uda?
- To jest best-effort.
- Core MUST oznaczyć `statusReasonCode=PROVIDER_SWITCHING` i wyświetlić warning w UI.
- W przyszłości: hard interlock (poza MVP).

## 4. Przełączenie robota na „robokitSim” (test bez prawdziwego robota)
Cel: uruchomić ten sam algorytm i te same kontrakty, a zamiast internal sim sterować robokit-robot-sim.

Wymagania:
- Gateway MUST używać tego samego kodu protokołu TCP dla `robokitSim` i `robocore`.
- Core nie powinien wiedzieć, czy robot jest prawdziwy czy symulowany.

## 5. Przełączenie na prawdziwego robota (robocore)
- W MVP dopuszczamy ręczne zapewnienie, że mapa robota odpowiada aktywnej scenie.
- Core/Gateway MUST udostępniać status: `currentMap`/`mapName` jeśli dostępne (push/all status).

## 6. Failure modes (MUST)
- Jeśli provider offline: Core MUST hold (nie wysyłać goTarget ani innych komend ruchu).
- Jeśli provider zmienia się: Core MUST hold do czasu online.

---

## 8. Repozytorium i podział na projekty (verbatim z v0.7)
# Fleet Manager 2.0 — Repozytorium i podział na projekty (v0.7)

Cel: modularność + możliwość niezależnej pracy (w tym pracy AI) nad komponentami.

## 1. Proponowany monorepo layout (SHOULD)
```text
repo/
  apps/
    fleet-core/              # HTTP /api/v1
    fleet-gateway/           # HTTP /gateway/v1
    algorithm-service/       # HTTP /algo/v1
    ui-frontend/             # WWW
    roboshop-bridge/         # opcjonalnie
    proxy-recorder/          # dev tool
    robot-controller/        # dev/test: sterowanie RoboCore/Robokit (reverse engineering)
    robokit-robot-sim/             # zewnętrzny symulator (jeśli w repo)
  packages/
    contracts/               # TS/JSON definicje kontraktów + przykłady
    map-compiler/            # parser+kompilacja .smap -> graph.json
    provider-internal-sim/   # silnik symulacji (może być użyty w gateway)
    adapters-robokit/        # TCP framing + client
    common/                  # utilsy (ULID, JSON, logger, ...)
  scenes/
    warehouse_nowy_styl/     # scene package katalog
  docs/
    architecture/            # ta specyfikacja (markdown)
    algorithm/               # spec algorytmu (osobno)
```

## 2. Granice (MUST)
- `contracts/` MUST być niezależnym pakietem, wersjonowanym, używanym przez wszystkie usługi.
- `fleet-core` MUST nie importować kodu TCP/protocol (to jest w gateway).
- `fleet-gateway` MUST nie implementować logiki domenowej (task assignment, locks) — to jest w core.
- `algorithm-service` MUST nie pisać do storage Core i MUST nie gadać z gateway (tylko Core→Algo).

## 3. Testowalność i mocki (MUST)
- Każdy projekt MUST mieć testy jednostkowe (piramida testów).
- `fleet-core` MUST mieć testy z mock gateway + mock algo.
- `fleet-gateway` MUST mieć testy integracyjne z robokit-robot-sim.
- `algorithm-service` MUST mieć testy deterministyczne na golden input/output.

Szczegóły: `99_pozostale.md (strategia testów)`.

---

## 9. Obserwowalność i replay (verbatim z v0.7)
# Fleet Manager 2.0 — Obserwowalność i replay (v0.7)

Wymaganie nadrzędne: system MUST dać się odtworzyć po fakcie („co się stało?”) **z maksymalnie małą ilością domysłów**.

W praktyce oznacza to trzy klasy artefaktów:
1) **Core event log + snapshoty** (deterministyczny stan domeny),
2) **Capture integracyjne** (Gateway ↔ Robot, Proxy ↔ Roboshop/Robot),
3) **Golden traces** (artefakty testowe) + narzędzia replay.

---

## 1. Determinizm: co musi być eventem (MUST)

Event sourcing działa tylko, jeśli wszystkie „wejścia ze świata” które wpływają na stan domeny są zapisane jako eventy.

Fleet Core MUST:
- materializować jako eventy wszystkie informacje z integracji, które zmieniają stan domeny, np.:
  - `robotStateUpdated` (znormalizowany status robota),
  - `dependencyOffline/Online` (gateway/algo),
  - `commandDispatchResult` (ACK transportu),
  - `robotProtocolAck` (ACK robota, jeśli używane),
  - `sceneImported/Activated`,
  - `controlLeaseChanged`.

Zasada:
- **Replay domeny** jest deterministyczny.
- Integracje (roboty) są niedeterministyczne, więc ich wpływ na domenę MUSI przejść przez event log.

---

## 2. Event log (MUST: na dysk)

- Core MUST zapisywać wszystkie `EventEnvelope` do plików JSONL na dysk.
- Core MUST flushować po każdym evencie w MVP (`flushEveryEvent=true`).

Proponowana struktura:
```text
<dataDir>/
  events/
    events_000001.jsonl
    events_000002.jsonl
  snapshots/
    snapshot_000123456.json
    snapshot_000123999.json
```

Każdy wiersz `events_*.jsonl` to jeden `EventEnvelope`.

---

## 3. Snapshoty (MUST: na dysk)

Snapshot MUST zawierać:
- `schemaVersion`
- `contractsVersion`
- `cursor`
- `tsMs`
- pełny stan `/state` (albo stan kanoniczny)

Snapshoty MUST:
- być rotowane (`retentionCount`),
- być zapisywane co `intervalMs`,
- być tworzone przy zdarzeniach krytycznych (import/activate, provider switch, lease change),
- umożliwiać szybki restart Core.

Przykład:
```json5
{
  schemaVersion: "state-v0.6",
  contractsVersion: "contracts-v0.6",
  cursor: 123456,
  tsMs: 1736160000123,
  state: { /* jak GET /state */ }
}
```

---

## 4. Replay Core (MUST)

Core MUST mieć tryb uruchomienia:
- `--replay <dir>` lub `--dataDir <dir> --mode replay`

Tryb replay:
1) ładuje najnowszy snapshot,
2) odtwarza event log od `cursor+1`,
3) weryfikuje spójność (opcjonalnie):
   - monotoniczny cursor,
   - zgodność `contractsVersion`,
4) pozwala krokować ticki (MAY), ale tylko jeśli tick jest czysto deterministyczny.

Replay MUST być deterministyczny: ta sama sekwencja eventów + ta sama wersja kontraktów → ten sam stan.

---

## 5. Capture integracyjne (MUST/SHOULD)

### 5.1 Gateway capture (SHOULD w test/dev, MUST w debug)
- Gateway SHOULD zapisywać capture TCP:
  - raw bytes,
  - dekodowany header,
  - payload JSON (jeśli parsowalny),
  - korelację z `commandId` (jeśli dotyczy).
- Gateway MUST umożliwić włączenie/wyłączenie capture w configu.

### 5.2 Proxy/Recorder capture (MUST dla reverse engineeringu)
- Proxy/Recorder MUST zapisywać pełne raw bytes w dwie strony oraz metadane sesji.
- Format i layout sesji jest kanoniczny w `06_proxy-recorder.md`.

**Ważne:** Proxy capture jest źródłem prawdy do:
- golden traces parsowania RoboCore/Robokit,
- dokumentacji protokołu (`10_*`),
- budowy robokit-robot-sim i robot-controller.

---

## 6. Golden traces (SHOULD)

„Golden trace” to artefakt testowy i debugowy, który pozwala odpalić testy regresji bez robota.

Minimalny golden trace:
```text
trace/
  README.md
  scene/...
  core/
    events.jsonl
    snapshots/...
  gateway/
    tcp_capture/...
  proxy/                       # jeśli dotyczy (np. RE protokołu)
    session.meta.json5
    tcp/.../conn_*_frames_*.jsonl
  expected.json5               # asercje
```

`expected.json5` zawiera asercje, np.:
```json5
{
  asserts: [
    { atCursor: 123900, expect: { robotId: "RB-01", navigationState: "blocked" } },
    { atCursor: 124010, expect: { lastCommandStatus: "completed" } },
  ]
}
```

---

## 7. Incident pack (SHOULD)

Każdy incydent integracyjny SHOULD kończyć się paczką:
- scena (scene package),
- event log + snapshoty,
- gateway capture (jeśli włączone),
- proxy session (jeśli dotyczy integracji z robotem/roboshop),
- minimalny opis „co robiliśmy” (w metadanych sesji proxy i/lub w README).

To jest podstawowy workflow debugowania i rozwoju z AI:
- AI dostaje paczkę,
- odtwarza replay,
- porównuje z expected,
- znajduje regresję.

---

## 10. Strategia testów (verbatim z v0.7)
# Fleet Manager 2.0 — Strategia testów (v0.7)

Wymaganie: piramida testów + możliwość uruchamiania równolegle + golden assets.

---

## 1. Piramida testów (MUST)

1) **Unit tests** (najwięcej, najszybsze)
   - `contracts`: walidacje, serializacja/deserializacja, unknown field rejection,
   - `map-compiler`: parser `.smap`, konwersje jednostek, geometria (`DegenerateBezier`),
   - `fleet-core`: reducer/event-sourcing, Task Runner, Lease/Locks, snapshot writer,
   - `fleet-gateway`: framing RoboCore, resync, encode/decode, idempotencja, provider switch,
   - `proxy-recorder`: writer, rotacja plików, manifest/checksum, dekoder headerów (jeśli jest).

2) **Integration tests**
   - Core ↔ Gateway (HTTP) z mock providerem,
   - Gateway ↔ robokit-robot-sim (TCP) dla goTarget (w tym ForkLoad/ForkUnload) / stop / push,
   - Core ↔ Algorithm Service (HTTP) (stub albo real),
   - robot-controller ↔ robokit-robot-sim (TCP) (smoke protokołu),
   - proxy-recorder ↔ robokit-robot-sim / robot-controller (MITM, capture → archive).

3) **E2E tests**
   - uruchom pełny stack: core + gateway + algo + robokit-robot-sim (+ opcjonalnie ui headless),
   - odpal scenariusze z `99_pozostale.md (scenariusze E2E)` (w tym Proxy/Controller).

---

## 2. Równoległość testów (MUST)

Testy MUST dać się uruchamiać równolegle (np. w CI). Zasady:

- każdy test używa osobnego `dataDir` (temp dir),
- porty są losowane lub przydzielane per suite,
- brak globalnych singletonów w procesie testów (albo izolacja przez worker),
- golden assets są tylko read-only.

---

## 3. Golden tests (SHOULD)

- Map Compiler: `graph.json` jako golden output.
- Gateway: golden TCP traces (z proxy-recorder).
- Core: replay golden eventlog+snapshot i porównanie `/state` z expected.
- Proxy/Recorder: golden sesja „mini” (krótka) + porównanie manifest checksum.

---

## 4. Testy odporności (SHOULD)

- symulacja przerw w sieci (drop TCP, timeouts),
- symulacja opóźnień i partial frames,
- testy idempotencji (powtarzanie dispatch komend),
- chaos tests w gateway: reconnect, resync po losowych bajtach.

---

## 5. Coverage i definicja „done” (MUST)

MVP jest „done”, jeśli:
- każdy endpoint ma testy pozytywne i negatywne,
- każdy kluczowy `ReasonCode` jest generowany w kontrolowanym teście,
- każdy scenariusz E2E przechodzi deterministycznie na robokit-robot-sim,
- replay Core odtwarza stan bez różnic (bitowo w granicach kontraktu JSON).

---

## 6. Traceability matrix (SHOULD teraz, MUST przed produkcją)

Cel: połączyć wymagania normatywne z testami, tak żeby:
- człowiek widział „co jest pokryte”,
- AI mogła systematycznie domykać braki.

### 6.1 Minimalna macierz (MVP)
Tabela mapuje kluczowe MUST na testy/regresje (referencje do plików spec):

| Wymaganie | Gdzie w spec | Testy unit | Testy integration | E2E |
|---|---|---|---|---|
| Event log + snapshoty na dysk | `16_*`, `03_*`, `07_*`, `19_*` | core: writer/reducer | core: restart+replay | Scen. 1 |
| ControlLease + seize control | `07_*`, `08_*`, `03_*` | core: lease SM | core+api | Scen. 2 |
| Scene activation atomowo | `07_*`, `08_*` | core: activation SM | core+gateway stop best-effort | Scen. 6 |
| goTarget = LM/AP | `10_*`, `05_*`, `09_*` | gateway: encoder | gateway+sim | Scen. 3 |
| ForkLoad/ForkUnload (goTarget) | `10_*`, `05_*`, `09_*` | core: step runner | gateway+sim | Scen. 4 |
| Provider switch | `11_*`, `07_*`, `08_*`, `09_*` | core: policy | gateway: switch | Scen. 7 |
| Proxy capture + archive | `15_*`, `16_*`, `19_*` | proxy: manifest | proxy+controller | Scen. 0 |

### 6.2 Docelowo (post-MVP)
Docelowo SHOULD wprowadzić identyfikatory wymagań (np. `FM-CORE-ES-001`) i utrzymywać macierz w pliku
czytelnym dla ludzi i AI (np. JSON5), ale w MVP tabela powyżej wystarcza jako minimum.

---

## 11. Scenariusze E2E (verbatim z v0.7)
# Fleet Manager 2.0 — Scenariusze end-to-end (v0.7)

Scenariusze mają dwie funkcje:
- są „żywą specyfikacją” (jednoznaczna interpretacja),
- są testami E2E/regresji (możliwe do automatyzacji w CI).

---

## Scenariusz 0: Proxy/Recorder — uruchomienie, capture, archiwizacja (MVP-dev)

Cel: potwierdzić, że narzędzie reverse engineeringu działa „zawsze”, jest promptable i daje powtarzalny format logów.

Preconditions:
- `robokit-robot-sim` działa lokalnie na `127.0.0.1` z portami RoboCore (np. 19204/19205/19206/19210/19301).
- `robot-controller` jest dostępny (dev/test).

Kroki:
1) Uruchom `robokit-robot-sim`.
2) Uruchom proxy-recorder jako sesję i ustaw porty listen tak, by nie kolidowały z upstream.
   Przykład (listen w zakresie 292xx):
   - listen 29204 → upstream 19204
   - listen 29205 → upstream 19205
   - listen 29206 → upstream 19206
   - listen 29210 → upstream 19210
   - listen 29301 → upstream 19301
3) Uruchom `robot-controller` tak, aby łączył się do portów proxy (292xx), a nie bezpośrednio do sima.
4) Wykonaj sekwencję: `goTarget(LM2)` → poczekaj na status → `goTarget(operation=ForkLoad)` → `stop`.
5) Zatrzymaj proxy-recorder.
6) Wykonaj `archive` i wygeneruj `manifest.json` z checksumami.

Oczekiwane (MUST):
- W katalogu sesji istnieje `session.meta.json5` z opisem sesji i listą listenerów.
- Dla każdego listenera są zapisane:
  - `connections.jsonl`,
  - `conn_*_raw_*.jsonl` (raw bytes w obie strony),
  - (jeśli decode) `conn_*_frames_*.jsonl`.
- Po archiwizacji istnieje `archive/<sessionName>.zip` oraz `manifest.json`.

---

## Scenariusz 0b: Robot-controller — smoke test protokołu (MVP-dev)

Cel: udowodnić, że potrafimy sterować robotem/symulatorem „jak Roboshop” i rozumiemy framing.

Preconditions:
- robokit-robot-sim lub real robot jest dostępny,
- opcjonalnie proxy-recorder działa jako man-in-the-middle (zalecane w dev).

Kroki:
1) `robot-controller connect` do `TASK/CTRL/OTHER` (przez proxy lub direct).
2) Wyślij `goTarget(id="LM2")` (API 3051).
3) Odbierz status `robot_status_loc_req` (1004) lub push.
4) Wyślij `goTarget(operation=ForkLoad, end_height=1.20)` (API 3051).
5) Potwierdź zmianę wysokości wideł w statusie.
6) Wyślij `stop` (2000).

Oczekiwane (MUST):
- robot-controller zapisuje log na dysk (komendy + ramki + timestamp),
- jeśli proxy działa: sesja zawiera raw bytes i dekodowane ramki zgodne z tym, co wysłał controller.

---

## Scenariusz 1: Start systemu bez UI (headless)
1) Uruchom Core, Gateway, Algo.
2) Import sceny (CLI lub API).
3) Activate scenę.
4) Core emituje `stateSnapshot`, `sceneActivated`.
5) Brak UI — system działa i publikuje SSE.

Oczekiwane:
- `/health` ok
- `/state` zawiera activeSceneId
- event log + snapshot na dysku

---

## Scenariusz 2: Dwa UI, jedno przejmuje kontrolę (seize control)
1) UI-A i UI-B łączą się do SSE.
2) UI-A robi `seize` (lease).
3) UI-B próbuje utworzyć task → 409 `CONTROL_LEASE_REQUIRED`.
4) UI-A robi `force seize` z UI-B (jeśli ustawione) → UI-B widzi wywłaszczenie.

---

## Scenariusz 3: goTarget (rolling target) na robokit-robot-sim
1) Gateway przełącza RB-01 na `robokitSim`.
2) Core wysyła manual `goTarget(LM2)`.
3) Gateway wysyła TCP 3051 `{id:"LM2"}`.
4) Robot push/status pokazuje target i ruch.
5) Core widzi `arrived` → `commandCompleted`.

---

## Scenariusz 4: ForkLoad/ForkUnload jako ActionPoint
1) Scena ma `AP_PICK_01` oraz parametry pick/drop (np. w stream `pickParams/dropParams`).
2) Task runner doprowadza robota do `AP_PICK_01` (goTarget).
3) Po arrival Core wysyła akcję wideł jako `goTarget` z `operation=ForkLoad/ForkUnload`.
4) Core czeka aż fork status osiągnie wysokość (lub status taska zakończy się).
5) Eventy: `commandUpdated` + `taskUpdated`.

---

## Scenariusz 4b: Algorithm Level0 — PICK→DROP (walking skeleton, pojedynczy robot)

Cel: potwierdzić pionowy przekrój systemu w wariancie „najprościej jak się da”:
- algorytm wybiera task,
- Core wykonuje kroki,
- robot robi routing sam (Robokit),
- brak rezerwacji korytarzy i brak gwarancji braku kolizji (bo 1 robot).

Preconditions:
- `algorithm-service` działa w trybie `level0`.
- `fleet-core` działa w trybie `trafficMode=NONE`.
- W scenie aktywny jest dokładnie jeden robot `RB-01`.
- Scena ma zdefiniowane worksites `PICK_01` i `DROP_01` z `entryNodeId` oraz (preferowane) `actionNodeId`.

Kroki:
1) UI tworzy Task `PICK_01 → DROP_01` (albo importuje ze streamu).
2) Algorithm-service w `/algo/v1/decide` zwraca `taskUpdates`:
   - `status="assigned"` / `assignedRobotId="RB-01"`.
3) Core (TaskRunner) generuje lub weryfikuje plan kroków:
   - `moveTo(entryNodeId PICK_01)` → `goTarget`,
   - `goTarget(actionNodeId PICK_01, operation=ForkLoad)` (jeśli actionNodeId istnieje),
   - `goTarget(actionNodeId DROP_01, operation=ForkUnload)`,
   - (opcjonalnie) `goTarget(park)` jako **idle command** jeśli brak kolejnych tasków (nie jako krok taska).
4) Core wysyła do Gateway komendy domenowe (`CommandRecord`), a Gateway tłumaczy na:
   - `goTarget` (API 3051) z `LocationMark/ActionPoint`,
   - `goTarget` z `operation=ForkLoad/ForkUnload` dla pick/drop.
5) Core monitoruje arrival + status wideł i kończy task **po dropie**.
6) Jeśli brak kolejnych tasków, Core wysyła `goTarget(park)` jako osobną komendę idle.

Oczekiwane (MUST):
- `locksRequested=[]` i brak blokad ruchu.
- Pełny audyt na dysk: event log + snapshoty stanu w tickach.
- W przypadku przerwy sieci: Core nie generuje command storm (patrz scenariusz 5).

---

## Scenariusz 5: Przerwa sieci do robota
1) Robot w trakcie jazdy.
2) Zrywamy TCP.
3) Gateway przechodzi w offline i raportuje.
4) Core holduje dispatch + emituje `systemWarning(DEPENDENCY_OFFLINE)`.
5) Po reconnect: kontynuacja.

---

## Scenariusz 6: Scene activation w trakcie ruchu
1) Robot jedzie.
2) UI robi activate nowej sceny.
3) Core wysyła best-effort stop, anuluje komendy i taski, resetuje locki.
4) Po aktywacji: stan czysty, UI widzi nową scenę.

---

## Scenariusz 7: Hot switch internalSim ↔ robocore (pojedynczy robot)
1) System startuje na internalSim.
2) W trakcie symulacji przełączamy RB-01 na robocore.
3) Core wykonuje safe-switch.
4) Robot kontynuuje wg nowych komend.

---

## 12. MVP (dokładna definicja + plan implementacji) (verbatim z v0.7)
# Fleet Manager 2.0 — MVP (dokładna definicja + plan implementacji) (v0.7)

MVP ma być podstawą do:
- implementacji pierwszej wersji algorytmu,
- uruchomienia na `internalSim`,
- uruchomienia na `robokit-robot-sim`,
- oraz bezpiecznego wejścia na realnego robota (etapowo, po potwierdzeniu protokołu).

**Kluczowa zmiana praktyczna:** zanim wejdziemy w Core/Gateway „na serio”, MUST mieć działające narzędzia
do podsłuchu i replay protokołu (`proxy-recorder`, `robot-controller`), bo to minimalizuje ryzyko integracyjne.

---

## 0. Addendum — uproszczenie MVP: Algorithm Level0 (walking skeleton)

### 0.1 Prompt użytkownika (wymaganie „meta” do planu MVP)

> bardzo wazney jest plan implementacji mvp  
> mam jeszcze taki pomysl na uproszczenie mvp:  
> pierwszy algorytm level0 to moze byc taki, ze po prostu wysyla robota bezposrednio komenda na pick i potem bezposrednio na drop  
> a robot sam znajduje trase.  
> to sie nadeje wylacznie gdy jest jeden robot, ale bedzie dobrym startem  
> potem algorytm trzeba podmienic na ten omawiany tutaj  
> ale mozna to robic dokladajac czesci stopniowo  
>  
> i w pierwszej wersji "wallking skeleton" zeby byl bardzo prosty algorytm (pollegajacy na routingu w robocie). bez zapewniania by braku kolizji

### 0.2 Intencja

To jest świadome „obniżenie poprzeczki” w pierwszym pionowym przekroju (walking skeleton), żeby:
- jak najszybciej uruchomić **E2E przepływ**: UI → Core → Gateway → robot/symulator (Robokit) → Core → UI,
- zminimalizować ryzyko, że utkwimy na zbyt wczesnym etapie na tematach multi-robot / rezerwacje korytarzy / deadlocki,
- mieć solidną bazę pod iteracyjne dokładanie kolejnych warstw algorytmu.

### 0.3 Definicja Algorithm Level0

Algorithm Level0 to tryb, w którym system **nie narzuca globalnej trasy** i **nie gwarantuje braku kolizji** (bo zakładamy pojedynczego robota).
Robot porusza się do celu używając **własnego routingu** (po stronie Robokit/Robocore).

Algorithm Level0 MUST spełniać:
- MUST działać tylko, gdy w scenie aktywny jest **jeden** robot (`maxActiveRobots=1`); jeśli wykryje >1, MUST zwrócić `hold=true` dla pozostałych.
- MUST *nie* używać rezerwacji korytarzy: `locksRequested` MUST być puste.
- MUST opierać nawigację wyłącznie o `NodeRef` (`LocationMark` albo `ActionPoint`) – bez `(x,y)`.

Algorithm Level0 SHOULD:
- generować minimalnie zrozumiały plan kroków (TaskStep) typu:
  - `moveTo` → `goTarget` na `LocationMark/ActionPoint`,
  - `pick/drop` → `goTarget` z `operation=ForkLoad/ForkUnload` i parametrami ze streamu.
- po wykonaniu taska (pick→drop) wysłać robota na park (`ParkPoint`/`LocationMark`) jeśli brak kolejnych zadań (idle command).

Algorithm Level0 MUST NOT:
- implementować unikania kolizji między robotami (to jest świadomie poza Level0),
- próbować „rolling target” w sensie *wymuszania* globalnej ścieżki; w Level0 target jest po prostu celem (final target) kroku.

### 0.4 Wymagania po stronie Core/Gateway dla Level0

Core MUST umożliwić uruchomienie MVP bez warstwy traffic management:
- MUST mieć tryb runtime `trafficMode=NONE` (albo równoważny), który:
  - nie wymaga locków od algorytmu,
  - nie blokuje dispatchu komend ruchem po grafie.
- MUST zachować pełny audyt (log na dysk + snapshoty) jak dla docelowego algorytmu.

Gateway MUST:
- obsługiwać `goTarget` (API 3051) z `operation=ForkLoad/ForkUnload` jako minimalny zestaw do wykonania „pick→drop”.

### 0.5 Kryterium ukończenia Level0 (exit criteria)

Level0 uznajemy za gotowe, jeśli dla `robokit-robot-sim` (a docelowo real robota):
- UI tworzy Task (PICK→DROP) lub importuje go ze streamu,
- algorytm przypisuje task do jedynego aktywnego robota,
- robot dojeżdża do pick i drop (routing w robocie),
- wykonywana jest akcja wideł jako `goTarget(operation=ForkLoad/ForkUnload)`,
- całość jest odtwarzalna z logów (replay) i ma deterministyczne snapshoty stanu.

Następny krok po Level0: włączenie docelowego algorytmu rezerwacji korytarzy (Level1/Level2) i przejście na multi-robot.

---

## MVP0 (pojedynczy wózek, bez rolling target i bez koordynacji)

Cel: uruchomić minimalny przepływ zadania `pick→drop` dla **jednego** robota, bez locków i bez globalnej koordynacji.

Plan implementacji (kolejność):
1) **Źródło mapy i punktów**: wczytanie `map/graph.json` (LocationMark/ActionPoint) i walidacja ID używanych w taskach.
2) **Model stanu robota**: minimalny zestaw pól (`robotId`, `nodeId`, `status`, `forkHeightM`, `lastSeenTsMs`).
3) **Gateway/Adapter**: komendy `goTarget` (w tym ForkLoad/ForkUnload) i `stop` z retry/timeout.
4) **Task API**: `POST /api/v1/tasks` dla `pickDrop` (from/to + `pickParams/dropParams`).
5) **TaskRunner (Level0)**: kroki `goTarget(ForkLoad)` → `goTarget(ForkUnload)`, wykonywane sekwencyjnie.
6) **Tick loop w Core**: cykliczne sprawdzanie statusu robota i przełączanie kroków/komend; fail-safe przy offline/timeout.
7) **Telemetria**: ingest statusu (arrival + task_status) i aktualizacja stanu.
8) **Testy**:
   - unit: TaskRunner (kolejność kroków, warunki ukończenia),
   - integration: Core + mock gateway (goTarget z operation),
   - e2e: scenariusz „pick→drop” na symulatorze.

Kryterium ukończenia MVP0:
- Jeden robot wykonuje `pick→drop` end‑to‑end na mapie z ActionPointami.
- Core poprawnie aktualizuje statusy task/steps i potrafi zatrzymać robota w fail‑safe.

### MVP0 orchestrator: go-target (zasada dzialania)
Ta implementacja nazywa sie **go-target orchestrator** (wysyla tylko punkt docelowy i nie bierze pod uwage innych robotow).
Implementacja MVP0 (go-target orchestrator) jest tickowa i wysyla tylko komendy `goTarget`
(w tym `operation=ForkLoad/ForkUnload`).

W kazdym ticku:
- pobiera statusy robotow i oznacza je jako `offline`, gdy status jest zbyt stary; dla `offline/blocked` wysyla `stop`,
- przypisuje taski `created` do pierwszego wolnego robota (sort po `robotId`), bez kosztow/tras/lockow,
- buduje kroki taska: `goTarget(from, ForkLoad)` → `goTarget(to, ForkUnload)`; parking jest poza taskiem.
- uznaje `moveTo` za zakonczony tylko, gdy `robot.nodeId === target.nodeId` (brak planowania trasy),
- uznaje krok fork za zakonczony po zmianie `task_status` (2 -> 4/6),
- wysyla `goTarget` dla aktywnego kroku i deduplikuje identyczne komendy (cooldown).

Ograniczenia:
- brak rezerwacji korytarzy i koordynacji multi‑robot,
- brak retry/backoff i brak utrwalania stanu po restarcie,
- brak reakcji na dynamiczne przeszkody (brak replanu).

Referencja kodu: `apps/fleet-core/mvp0/runtime.js`, `apps/fleet-core/mvp0/task_runner.js`.

#### Kontrakt wejsc/wyjsc (MVP0)
Wejscia (na tick):
- lista robotow z minimum: `robotId`, `nodeId`, `status`, `task_status`, `lastSeenTsMs`, `blocked`,
- lista taskow z minimum: `taskId`, `status`, `fromNodeId`, `toNodeId`, `parkNodeId`, `pickParams`, `dropParams`,
- konfiguracja runtime: `statusAgeMaxMs`, `commandCooldownMs`.

Wyjscia:
- komendy `goTarget` (w tym `operation=ForkLoad/ForkUnload`) dla aktywnego kroku,
- `stop` dla robotow offline/blocked,
- zaktualizowane taski (status + kroki) i roboty (status).

#### Polityka przydzialu robota
- taski `created` sa przypisywane do pierwszego wolnego robota (sort rosnaco po `robotId`),
- brak kosztow, priorytetow i ograniczen zasobow.

#### Przejscia stanow (task/step)
- `moveTo` jest uznany za zakonczony, gdy `robot.nodeId === target.nodeId`,
- krok fork jest uznany za zakonczony po zmianie `task_status` (2 -> 4/6),
- task przechodzi `created -> assigned -> running -> completed` (brak obslugi `failed` w MVP0).

#### Fail-safe
- robot `offline` lub `blocked` dostaje `stop`,
- brak retry/backoff dla komend.

#### Dedup i rate-limit
- identyczne komendy do danego robota sa throttlowane (`commandCooldownMs`).

#### Logowanie (weryfikowalnosc przez AI)
Core SHOULD logowac:
- na kazdym ticku: `tickId`, `nowMs`, liczba robotow, liczba taskow,
- dla kazdego taska: status, aktywny krok, wybrany `robotId`,
- dla kazdej komendy: `robotId`, `type`, `payload`, `reason`, wynik dispatchu (ok/err),
- zmiany statusu robota: `online/offline/blocked` + powod (timeout/blocked),
- decyzje dedup: odrzucone komendy (ten sam key, cooldown).

Format logu powinien byc deterministyczny i latwy do parsowania (JSONL).

### Orchestrator DCL (graph-lock) — zasada dzialania
Drugi orchestrator (z `apps/fleet-core/orchestrator`) jest swiadomy grafu i rezerwacji korytarzy.
Jego rola to przypisac task do robota, zaplanowac trase po grafie i zablokowac korytarze czasowo.

Wejscia (na tick):
- `compiledMap` (w konstruktorze): `nodes`, `edges`, `corridors` z kierunkowoscia,
- `robots`: `robotId`, `nodeId`, `status`, `blocked`, `speedMps`, `pendingTasks`,
- `tasks`: `taskId`, `status`, `priority`, `fromNodeId`, `toNodeId`, `assignedRobotId`, `steps`,
- `reservations`: aktualne rezerwacje (z poprzednich tickow).

Wyjscia:
- `assignments` (taskId -> robotId + koszt),
- zaktualizowane `tasks` (statusy i kroki),
- `reservations` (granted/denied/active),
- `commands` (goTarget z opcjonalnym `operation`) oraz `holds`/`diagnostics` z powodami.

Flow ticka:
- buduje graf z compiledMap (kierunkowosc korytarzy z `edge.props.direction`),
- normalizuje roboty/taski i wybiera `availableRobots` (online, nie blocked),
- wybiera `openTasks` (created, bez assignedRobotId), sortuje po `priority` desc, potem `taskId`,
- dla kazdego taska dobiera najlepszego robota przez najkrotsza trase:
  - koszt = `route.lengthM + pendingTasks * 10`,
  - trasa = robot -> fromNode -> toNode (jesli oba sa ustawione),
- jezeli task nie ma `steps`, buduje kroki `moveTo(fromNode)` i `moveTo(toNode)`,
- wykrywa aktywny krok (pierwszy nie `completed`):
  - `moveTo` -> jesli robot jest juz na `nodeId`, krok jest `completed`,
  - brak trasy -> `hold` + `diagnostic` (`reason: no_route`),
  - inny krok -> mapowany na komende `goTarget` z `operation` (ForkLoad/ForkUnload),
- buduje rezerwacje czasowe dla kazdego korytarza na trasie (time window z `speedMps`),
- lock manager przyznaje/odrzuca rezerwacje (single-lane konflikt),
- jesli lock odrzucony -> `hold` + `diagnostic` (`reason: lock_denied`),
- w przeciwnym razie emituje komende dla aktywnego kroku.

Ograniczenia:
- komendy sa nadal tylko `goTarget` do docelowego nodeId (z opcjonalnym `operation`),
- rezerwacje zakladaja, ze robot pojedzie zaplanowana trasa (brak weryfikacji zgodnosci),
- brak jawnego `stop`, retry/backoff i limitu wysylki komend,
- brak persystencji stanu i brak replanu przy zmianie mapy.

Referencja kodu: `apps/fleet-core/orchestrator/core.js`, `apps/fleet-core/orchestrator/graph.js`,
`apps/fleet-core/orchestrator/locks.js`, `apps/fleet-core/orchestrator/adapter.js`.

#### Nazwa i zakres
- Nazwa docelowa: **dcl-orchestrator** (DCL-2D, bez okien czasowych).
- Obecna implementacja: **graph-lock orchestrator** (time-window reservations).
- Zakres: planowanie tras po grafie + rezerwacje korytarzy + mapowanie krokow na komendy.

#### Bezpieczenstwo i kontrola (wymagane do doprecyzowania)
- Przy `control-lease`/`soft_emc` orchestrator MUST wejsc w `hold` (bez nowych komend).
- W trybie manualnym orchestrator MUST nie nadpisywac komend operatora.

#### Lifecycle rezerwacji
- Rezerwacje maja okna czasowe z `startTsMs`/`endTsMs` i powinny byc odnawiane w kolejnych tickach.
- Po `lock_denied` robot przechodzi w `hold` do czasu otrzymania okna bez konfliktu.

#### Dedup/ACK/timeout
- Komendy powinny byc deduplikowane per robot (jak w go-target).
- Dla `goTarget` (w tym ForkLoad/ForkUnload) wymagany timeout ACK i retry (polityka do uzgodnienia).

#### Bledy wejsc i reason codes
- Brak nodeId / bledny task / brak mapy -> task `failed` z reason code (np. `invalid_task`).
- `no_route` -> `hold` + diagnostyka; po timeout `failed`.

#### Replan i odchylenia
- Jezeli robot zjedzie z trasy albo mapa sie zmieni -> replan i odswiezenie rezerwacji.
- Dynamiczne przeszkody powinny uniewazniac rezerwacje i wymuszac replan.

#### Semantyka krokow
- Kroki `moveTo` i fork (goTarget z `operation`) maja jawne statusy i reason codes,
- Jesli task ma zdefiniowane kroki, orchestrator respektuje ich kolejnosc.

#### Mapowanie LM/AP
- `targetRef` (LM/AP) powinien byc rozwiazany do `nodeId` przed planowaniem trasy.

#### Logowanie (weryfikowalnosc przez AI)
Core SHOULD logowac:
- na kazdym ticku: `tickId`, `nowMs`, liczby: robots/tasks/reservations,
- assignmenty: `taskId`, `robotId`, `cost`, `route.lengthM`,
- rezerwacje: granted/denied + reason + okna czasowe,
- komendy: `robotId`, `type`, `payload`, `reason`,
- hold/diagnostyka: `robotId`, `taskId`, `reason`.

#### Testy
- unit: routing + lock manager (konflikty, kierunkowosc korytarzy),
- integration: task -> assignment -> rezerwacje -> komenda,
- e2e: dwa roboty, konflikt na single-lane, oczekiwanie i wznowienie.

#### Docelowy mechanizm lockow (DCL-2D, bez okien czasowych)
W docelowym algorytmie lockowanie nie uzywa okien czasowych. Zamiast tego:
- robot buduje `CorridorRequest` jako prefiks **komorek** (CELL) na trasie (routeS),
  z `lockLookahead` i `lockLookback` (sliding window, locki "jadaja" z robotem),
- zasoby lockowane atomowo: `CELL`, `NODE_STOP_ZONE`, `CORRIDOR_DIR`, `CRITICAL_SECTION`,
- `conflictSet` komorek pochodzi z map-compiler (swept-shape 2D) i jest jedyna baza konfliktow,
- LockManager.tick jest czysta i deterministyczna funkcja: (prev snapshot + requests) -> grants,
  bez TTL i bez zaleznosci od czasu przejazdu,
- invariants: `occupied(R) ⊆ granted(R)`; gdy telemetria niepewna -> freeze (fail-closed),
- rezerwacje zwalniaja sie po przekroczeniu `routeS` z marginesem (lookback + safety),
- wynik lockow wyznacza `holdPointRouteS` (stop-line); RTP target nie moze przekroczyc hold-point,
- single-lane: token `CORRIDOR_DIR` blokuje przeciwne kierunki; wybor deterministyczny + fairness/aging,
- critical sections: nie wjezdzaj jesli nie masz wyjazdu (exitClearance),
- brak "backoff/reverse" jako mechanizmu odblokowania (zabronione; tylko direction token + CS gating).

#### Wymagane logi dla DCL-2D (AI-friendly)
- requests/grants per robot (lista zasobow, przyciety prefix, reasonCode),
- `occupied` vs `granted` per tick + powody freeze (stale telemetry/off-route/pose jump),
- `holdPointRouteS` i skladniki: hold_lock / hold_standoff / hold_node,
- zmiany `CORRIDOR_DIR` (dir flips) i blokady CS,
- metryki anti-oscillation (GO<->HOLD, jitter hold-point, RTP jitter).

#### Mapping: obecna implementacja -> DCL-2D (co trzeba zmienic)
- **Rezerwacje**: z okien czasowych (`startTsMs/endTsMs`) na zasoby (CELL/NODE_STOP_ZONE/CORRIDOR_DIR/CS).
- **Wejscia**: dodac `routeProgress` (routeS/edgeS) i `RoutePlan` zamiast samego `nodeId`.
- **LockManager**: zastapic `locks.js` logika DCL-2D (prefiks + conflictSet + deterministic grants).
- **Hold-point/RTP**: wyznaczac `holdPointRouteS` i ograniczac target (`targetRouteS <= holdPointRouteS`).
- **Single-lane + CS**: dodac tokeny `CORRIDOR_DIR` i gating `CRITICAL_SECTION` (exitClearance).
- **Occupied/Granted**: wprowadzic `occupied ⊆ granted`, freeze przy stale telemetry/off-route.
- **Release**: zwalniac zasoby po przekroczeniu `routeS` z lookback, bez TTL.
- **Telemetry**: wymagane `pose/edgeProgress/routeProgress` do projekcji i konfliktow 2D.
- **Logowanie**: zapisywac requests/grants + holdPoint + reason codes per tick (JSONL).

#### Braki specyfikacji do domkniecia (checklist)
- **Kontrakt I/O** orchestratora: typy wejsc/wyjsc, wersjonowanie, walidacja payloadow.
- **Konfiguracja**: parametry lock/rtp (lookahead/lookback/stopStandoff/brake/telemetryTimeout/fairness).
- **Maszyny stanow**: task/step/robot + reason codes i warunki przejsc.
- **Replan policy**: trigger + throttling + zachowanie lockow przy off-route/pose-jump.
- **Integracja z kontrola**: lease/soft_emc/manual -> HOLD/STOP + priorytety.
- **Zrodlo prawdy trasy**: kto planuje i jak wykrywamy rozjazd z trajektoria robota.
- **Deterministyczne sortowanie**: tie-breaki dla assignment/lock/CS.
- **Inwarianty bezpieczenstwa**: occupied ⊆ granted, brak konfliktow conflictSet, single-lane token.
- **Persystencja/replay**: co logujemy, jak odtwarzamy, jak walidujemy deterministycznosc.
- **Testy i golden scenarios**: single-lane, CS, off-route, deadlock avoidance.
- **Metryki**: flapping GO/HOLD, jitter hold-point, lock denial rate.

#### Plan implementacji (backlog DCL-orchestrator)
1) **Kontrakty i walidacja**: zdefiniowac `OrchestratorInput/Decision` + wersje kontraktow,
   rozszerzyc `apps/fleet-core/orchestrator/model.js` o walidacje DCL (resources, grants, progress).
2) **RoutePlan + routeS**: dodac modul `route_plan.js` (routeS/edgeS), mapowanie LM/AP -> nodeId,
   rozszerzyc `graph.js` o dane potrzebne do routeS (dlugosci, kierunki, corridorId).
3) **ProgressEstimator**: nowy modul `progress.js` (projekcja pose -> edgeS/routeS, off-route/pose-jump).
4) **CorridorRequest builder**: z `routeS` budowac prefiks CELL + lookahead/lookback,
   konsumowac `CompiledMap.conflictSet` i `cells` (integracja z map-compiler).
5) **LockManager DCL-2D**: zastapic `locks.js` deterministycznym przydzialem zasobow,
   tokeny `CORRIDOR_DIR`, `NODE_STOP_ZONE`, `CRITICAL_SECTION`, fairness + histereza.
6) **Hold-point + RTP**: modul `hold_point.js` i `rtp_controller.js`,
   ograniczac target (`targetRouteS <= holdPointRouteS`), generowac `RollingTargetCommand`.
7) **Integracja safety/control**: lease/soft_emc/manual -> HOLD/STOP, brak nowych komend ruchu.
8) **Logging + replay**: JSONL tick snapshot (requests/grants/holdPoint/reason codes),
   minimalny runner do replay (deterministyczny).
9) **Testy**: unit (conflictSet, lock grants, routeS), integration (2 roboty, single-lane),
   e2e (CS + off-route + recovery).

#### Braki implementacyjne (do dopisania w kodzie)
- DCL-2D zasoby i locki bez okien czasowych: `CELL/conflictSet`, `NODE_STOP_ZONE`, `CORRIDOR_DIR`, `CRITICAL_SECTION`.
- `RoutePlan` + projekcja `routeS/edgeS` i `ProgressEstimator` (off-route/pose-jump).
- `holdPointRouteS` + RTP controller (target <= hold-point), dedup/rate-limit komend.
- Integracja safety/control: lease/soft_emc/manual -> HOLD/STOP.
- Logging/replay per tick (requests/grants/hold-point/reason codes) + testy golden.


## 1. MUST w MVP (produktowe minimum)

### 1.1 Fleet Core (source of truth)
Core MUST dostarczyć:
- Import sceny (katalog lub zip) + walidacja.
- Activate sceny (procedura atomowa) + jawna semantyka „co się dzieje przy przełączeniu”.
- `GET /state` snapshot + `GET /events` SSE (EventEnvelope).
- ControlLease (seize/renew/release + seize control wywłaszcza poprzedniego).
- Event log + snapshoty **na dysk** (wymóg bezdyskusyjny).
- Manual commands (MVP): `stop`, `goTarget`.
- Minimalny Task Runner: `pickDrop` + kroki `goTarget` z `operation=ForkLoad/ForkUnload`.
- Integracja z Algorithm Service (HTTP): `POST /algo/v1/decide` (w MVP algo może być stubem, ale port i kontrakt muszą istnieć).

### 1.2 Fleet Gateway (adapter do robotów)
Gateway MUST dostarczyć:
- Provider: `internalSim` + `robokitSim` + `robocore` (ten sam protokół TCP).
- Obsługa framingu RoboCore/Robokit (robust parser + resync + partial frames).
- Minimalne komendy TCP:
  - 3051 `goTarget` (rolling target: LM/AP),
  - 2000 `stop`,
  - (legacy/manual) 6040 `forkHeight`,
  - (legacy/manual) 6041 `forkStop`.
- Minimalny status:
  - 1004 `robot_status_loc_req` (pozycja),
  - (opcjonalnie) push 9300/19301.
- Idempotencja dla `commandId` + limity inflight + cooldown po reconnect (anti command-storm).
- Hot-switch providera per robot.

### 1.3 Algorithm Service (port decyzyjny)
Algorithm Service MUST dostarczyć:
- `/health`
- `/algo/v1/decide`
- deterministyczny stub (np. zawsze hold) albo minimalną logikę,
- testy deterministyczności na golden input/output.

### 1.4 UI (operator)
UI MUST dostarczyć:
- read-only dashboard: mapa + roboty + tasks + worksites + streams,
- kontrola: seize/release + manual stop + manual goTarget,
- natychmiastowy read-only po utracie lease,
- odporność na reconnect SSE (odtwarzanie od cursor).

### 1.5 Map Compiler
Map Compiler MUST dostarczyć:
- `.smap` → `graph.json` (nodes, edges, `DegenerateBezier`, `lengthM`, `samples`),
- deterministyczność + walidacje,
- golden testy (wejście `.smap` → oczekiwane `graph.json`).

---

## 2. MUST w MVP-dev (narzędzia, które odblokowują integrację)

Te elementy nie są „featurem dla operatora”, ale są krytyczne, żeby w ogóle bezpiecznie wejść w robota.

### 2.1 Proxy/Recorder (proxy-recorder)
Proxy/Recorder MUST:
- uruchamiać się z CLI + config (promptable),
- logować raw bytes w dwie strony,
- mieć layout logów poza repo,
- ostrzegać o dużych logach,
- umożliwiać archiwizację + manifest z checksumami.

Spec: `06_proxy-recorder.md`.

### 2.2 Robot controller (robot-controller)
robot-controller MUST:
- potrafić wykonać smoke test protokołu (goTarget/stop + goTarget z operation),
- potrafić działać przeciwko robokit-robot-sim i przeciwko real robot (w bezpiecznych warunkach),
- logować na dysk sekwencje komend i statusów,
- umieć replay z capture (co najmniej w trybie offline test harness).

---

## 3. SHOULD w MVP (silnie zalecane)
- SSE filter `types=`.
- `/state?view=uiMinimal`.
- Gateway capture w debug.
- Golden trace pipeline (z proxy/gateway/core).

---

## 4. Poza MVP (explicit)
- Security (authN/authZ/TLS/RBAC)
- Multi-instance Core / HA
- Automatyczne ładowanie mapy do robota (Roboshop sync)
- Zaawansowane obstacle avoidance (lokalne planowanie + „width>0”)
- Rozbudowane UI (edycja sceny w UI)

---

## 5. Plan implementacji MVP (komponentami, w kolejności minimalizującej ryzyko)

Ta kolejność jest celowa: najszybciej budujemy pętlę feedbacku i redukujemy ryzyko integracyjne.

### Faza 0 — Golden assets i katalogowanie sesji (MUST)
- Skatalogować istniejące logi/sesje (z proxy) jako „golden set”:
  - nazwy sesji,
  - do czego służą,
  - checksumy,
  - minimalny README per sesja.

### Faza 1 — Proxy/Recorder (pierwsze!)
Deliverables:
- CLI + config + presety robokit-all,
- layout logów w `~/robokit_logs/...`,
- raw bytes w obie strony,
- warning o rozmiarze,
- archiwizacja + manifest.

Testy:
- unit (writer/rotacja/manifest),
- integration (proxy up → połączenie → zapis → archive → checksum).

### Faza 2 — Robot-controller (smoke test protokołu)
Deliverables:
- connect + goTarget(LM/AP) + stop + goTarget(operation=ForkLoad/ForkUnload),
- logowanie na dysk (komendy + statusy),
- replay sekwencji z capture.

Testy:
- przeciwko robokit-robot-sim,
- opcjonalnie przeciwko real robot (kontrolowane warunki).

### Faza 3 — Robokit-sim (albo dopięcie istniejącego)
Deliverables:
- minimalne API: status + goTarget (w tym operation) + stop + push (zgodnie z `10_*`),
- tryb „scripted replay” (odtwarzanie statusów z logów) — bardzo pomocne,
- (opcjonalnie) prosta fizyka.

### Faza 4 — Fleet-gateway (HTTP + TCP)
Deliverables:
- `/gateway/v1` komendy z idempotencją,
- provider switching,
- reconnect/retry/circuit breaker,
- capture debug na dysk.

Testy:
- golden TCP traces,
- chaos tests (dropy, partial frames).

### Faza 5 — Fleet-core (event sourcing + API)
Deliverables:
- event log + snapshoty na dysk,
- import + activate sceny,
- `/state` + SSE,
- ControlLease,
- manual commands,
- minimal Task Runner + integracja z algo stub.

Testy:
- deterministyczny replay,
- scenariusze E2E.

### Faza 5A — Fleet Orchestrator / Dispatcher (TDD, MVP)
Cel: brakujący moduł MVP, który spina `compiledMap` + stan robotów + tasks i generuje egzekwowalny plan (przydział, rezerwacje, dispatch).
Zakładamy, że jest to **wewnętrzny moduł Fleet-core** (nie osobny serwis), ale z czystymi kontraktami i testami jak osobny komponent.

Plan TDD (kolejność implementacji):
1) **Modele domenowe + walidacja kontraktów**  
   Testy: serializacja i walidacja `Robot`, `Task`, `Assignment`, `Reservation`, `CorridorSegment`.
2) **Graph builder z `compiledMap.json`**  
   Testy: poprawne wagi/kierunki, obsługa `singleLane`, zgodność `corridors/segments`.
3) **Planner tras (Dijkstra/A*)**  
   Testy: najkrótsza ścieżka, brak trasy, kierunkowość, stabilność kosztu.
4) **Rezerwacje korytarzy (timeline-lock)**  
   Testy: konflikt czasowy, brak konfliktu, zwalnianie po zakończeniu, retry.
5) **Przydział zadań (cost-based)**  
   Testy: wybór robota o najniższym koszcie, fallback do `pending` przy braku dostępnych.
6) **Task lifecycle (state machine)**  
   Testy: `queued -> assigned -> executing -> done/failed`, zwalnianie rezerwacji.
7) **Kontrakty adaptera robota**  
   Testy: `sendMovePlan`, timeout/retry, idempotencja.
8) **API + integracja z Core tick loop**  
   Testy: create/cancel task, list tasks/robots, SSE events, deterministyczny replay.
9) **E2E scenariusze MVP**  
   Testy: „single task”, „multi-robot contention”, „failure/retry” na symulatorze.

Struktura plików (zbalansowana, bez „mikro‑modułów”):
- `apps/fleet-core/orchestrator/core.js` — pipeline ticka + state machine + publiczne API modułu.
- `apps/fleet-core/orchestrator/graph.js` — budowa grafu + routing + koszty.
- `apps/fleet-core/orchestrator/locks.js` — rezerwacje, konflikt, zwalnianie.
- `apps/fleet-core/orchestrator/model.js` — modele + walidacje kontraktów.
- (opcjonalnie) `apps/fleet-core/orchestrator/adapter.js` — mapowanie planu → komendy gateway.

Zasady balansu:
- celuj w 300–800 LOC na plik; poniżej ~120 LOC scalaj, powyżej ~900 LOC dziel,
- jeden temat = jeden plik (graph/locks/model/pipeline),
- testy też „grube”: `orchestrator.unit.test.js`, `orchestrator.integration.test.js`, `orchestrator.e2e.test.js`.

Wpięcie w Fleet Manager (runtime flow):
1) **Scene activation**  
   - `fleet-core` po aktywacji sceny buduje kontekst Orchestratora: `compiledMap`, indeksy węzłów/korytarzy, graf.  
   - Kontekst jest trzymany w runtime Core (cache), wersjonowany `sceneHash`.
2) **Tick loop**  
   - Każdy tick Core tworzy `OrchestratorInput` (snapshot: robots, tasks, locks, time).  
   - `orchestrator.step(input)` zwraca `OrchestratorDecision`: przydziały, rezerwacje, komendy, diagnostyka.  
3) **Event sourcing**  
   - Core materializuje decyzje jako eventy (`taskAssigned`, `lockGranted`, `commandIssued`) i zapisuje do logu.  
   - Dopiero po zapisie eventów Core dispatchuje komendy do `fleet-gateway` (idempotentnie).
4) **Dispatch i feedback**  
   - Statusy z gateway aktualizują stan robotów i tasków, a kolejny tick bierze je jako input.  
   - W razie błędu/timeoutu Orchestratora: Core przechodzi w `hold` (fail-safe).

Integracja z algorithm-service (jeśli aktywny):
- Orchestrator może być użyty **wewnątrz** algorithm-service jako implementacja planowania.  
- W takim wariancie Core nie woła lokalnego Orchestratora, tylko `POST /algo/v1/decide`, a decyzje mapuje jak wyżej.  
- MVP dopuszcza tryb „in-process” (Orchestrator w Core) oraz „external” (Orchestrator w algo-service); wybór jest konfiguracyjny.

### Faza 6 — Algorithm-service (Level0 → docelowy)
Deliverables:
- `/algo/v1/decide` z kontraktami (patrz: `03_algorithm-service.md`),
- deterministyczne testy (golden I/O; równoległe w CI),
- przełączalny tryb algorytmu (konfiguracyjnie, bez negocjacji w runtime):
  - `level0` — **walking skeleton**: pojedynczy robot, brak locków, routing po stronie robota,
  - `level1+` — docelowy algorytm rezerwacji korytarzy (osobna spec algorytmu).

### Faza 6A — Algorithm Level0 (pierwszy pionowy przekrój)
W tej podfazie celem jest „działa end-to-end”, nie „jest optymalnie”.
Deliverables:
- algorytm przypisuje taski tylko do jedynego aktywnego robota,
- brak `locksRequested`,
- task wykonuje się jako sekwencja kroków `goTarget` z `operation=ForkLoad/ForkUnload` (albo równoważna),
- retry/timeouty kroków są jawne i logowane.

### Faza 6B — Upgrade do docelowego algorytmu
Deliverables:
- włączenie locków i rolling target,
- wsparcie wielu robotów,
- regresja na golden sesjach (replay).

## Faza 7 — UI-frontend
Deliverables:
- read-only + lease + manual,
- debug widoki (reason codes, current command, rolling target).

---

## 6. Kryteria akceptacji MVP (MUST)
- Wszystkie scenariusze z `99_pozostale.md (scenariusze E2E)` przechodzą na robokit-robot-sim.
- Event log + snapshot pozwalają odtworzyć stan po awarii.
- Przerwy w komunikacji nie powodują „pętli komend” (command storm) i nie gubią audytu.
- Proxy/Recorder potrafi w powtarzalny sposób zebrać sesję i ją zarchiwizować.

---

## 7. Blokujące niejednoznaczności (MUST rozstrzygnąć przez capture / RE)

1) **RoboCore/Robokit: reason codes blokad i obstacle avoidance** (kiedy i jak robot zgłasza, że chce omijać).  
2) **ACK vs DONE**: doprecyzować, które ramki są ack (seq/apiNo) oraz które statusy oznaczają zakończenie.  
3) **Sensory (laser) — capture**: zebrać i skatalogować sesję z danymi sensorów (post-MVP algorytm), ale dane zbieramy już teraz.  
4) **Porty i warianty protokołu**: potwierdzić na real robocie (proxy + robot-controller).

Szczegóły RE i checklista: `10_adapters-robokit.md`.

---

## 13. Ryzyka i pułapki (verbatim z v0.7)
# Fleet Manager 2.0 — Ryzyka i pułapki (v0.7)

## 1. Największe ryzyko: integracja RoboCore/Robokit (warianty protokołu)
Objawy:
- różne implementacje `reserved/jsonSize`,
- payloady różnią się wersją robota,
- push może działać inaczej.

Mitigacje (MUST/SHOULD):
- Gateway MUST mieć parser odporny na warianty i partial frames.
- Proxy/Recorder SHOULD zbierać capture z realnego systemu.
- Golden traces MUST być częścią CI (integracja).

## 2. Ryzyko: brak spójności mapy między sceną a robotem
Objawy:
- `goTarget(id)` nie działa albo jedzie inaczej.

Mitigacje:
- UI MUST pokazywać `robot.current_map` (jeśli dostępne).
- Procedury operacyjne: aktywna scena = mapa robota.
- Future: auto load map (poza MVP).

## 3. Ryzyko: event storm / duże payloady
Mitigacje:
- SSE filters, thin state view, gzip (SHOULD).
- Snapshot co N ms, a delty tylko zmian.

## 4. Ryzyko: niejednoznaczność lifecycle komend i tasków
Mitigacje:
- Jawne state machines (już są w `07_*`).
- Testy na edge-case’y (retry, cancel, timeout).

## 5. Ryzyko: przełączanie providerów w trakcie ruchu
Mitigacje:
- Safe-switch: stop best-effort, hold, potem switch.
- UI warnings + logs.

## 6. Ryzyko: „AI implementuje inaczej niż intencja”
Mitigacje:
- kontrakty + przykłady JSON5 (czytelne),
- jasne MUST/SHOULD,
- golden tests,
- małe moduły z wąskimi interfejsami.

## 7. Ryzyko: ukryte zależności między modułami
Mitigacje:
- kontrakty w osobnym pakiecie,
- zakaz importów cross-boundary,
- mockowanie integracji w testach.


## 8. Ryzyko: duże logi proxy i brak miejsca na dysku
Objawy:
- capture sesji ma dziesiątki GB (szczególnie przy sensorach),
- CI/komputer dev się zapycha.

Mitigacje:
- Proxy/Recorder MUST logować poza repo (`~/robokit_logs/...`).
- Proxy/Recorder MUST ostrzegać po przekroczeniu progu (np. 5GB).
- Proxy/Recorder SHOULD rotować pliki i umożliwiać archiwizację + `manifest.json` z checksumami.
- Procedura operacyjna: po sesji zawsze `archive` i przeniesienie na storage.

---

## 14. Rzeczy usunięte lub odroczone (verbatim z v0.7)
# Fleet Manager 2.0 — Rzeczy usunięte / odroczone (v0.7)

Ta sekcja istnieje, żeby nic „nie zniknęło”. Rzeczy nie pasujące do MVP albo wymagające RE są tu, zamiast ginąć.

## 1. Usunięte / zmienione względem wcześniejszych wersji
- gRPC: w v0.4 przyjęto zasadę „HTTP wszędzie” dla komunikacji wewnętrznej (Core/Gateway/Algo/UI).
- Rolling target jako (x,y): zastąpione rolling target jako NodeRef (LM/AP) i mapowanie na RoboCore `goTarget` (3051).
- Capability negotiation: odroczone (Twoje wymaganie: „implementujemy wszystko na tym etapie”).

## 2. Poza MVP (odroczone)
- Security (authN/authZ, TLS, RBAC).
- Multi-tenant.
- Multi-instance Core / HA (wymaga ADR i wspólnego storage).
- Automatyczne ładowanie mapy do robota (map upload/switch).
- Zaawansowane avoidance w miejscach `corridorWidthM > 0` (lokalne planowanie + constraints).
- Designated path navigation (3066) jako główny tryb — na razie opcjonalnie.
- Zaawansowane planowanie i deadlock recovery (MAPF, priorytety) — opis w spec algorytmu.

## 3. Elementy wymagające doprecyzowania po reverse engineering
- Pełna tabela payloadów RoboCore/Robokit (nie wszystkie są w tej spec).
- Dokładne error codes robota i mapowanie na ReasonCodes FM.
- Semantyka `robot_control_reloc_req` (2002) w konkretnych robotach.

---

## 15. Sekcja „wypadłe elementy” (v0.9)
Ta sekcja jest celowo pusta, jeśli nic nie wypadło. W tej iteracji dodaliśmy dodatkowe informacje (nie usuwaliśmy):
- Legacy spec `robokit-proxy` → włączona do `06_proxy-recorder.md` (dla ciągłości).
- Aktualny README `robokit-robot-sim` z repo → włączony do `08_robokit-robot-sim.md`.

Jeżeli w kolejnych iteracjach coś zostanie świadomie usunięte z komponentów, MUST trafić tutaj (z uzasadnieniem).
