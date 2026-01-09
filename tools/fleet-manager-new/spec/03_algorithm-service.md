# algorithm-service — Specyfikacja komponentu (v0.9)

## 1. Rola w systemie (MUST)
`algorithm-service` jest niezależnym komponentem decyzyjnym. Otrzymuje snapshoty stanu i zwraca decyzje w kontrakcie `AlgorithmDecision`.
Nie ma prawa modyfikować domeny bezpośrednio i nie komunikuje się z robotami.

## 2. Zakres i odpowiedzialności (normatywnie)
#### Scope
Algorithm Service jest niezależnym komponentem decyzyjnym: otrzymuje snapshoty i zwraca decyzje, bez własnej persystencji domenowej.

#### Responsibilities
Algorithm Service MUST:
- być deterministyczny dla danego wejścia,
- być side-effect free (brak IO do świata zewnętrznego jako część decyzji),
- zwracać odpowiedź w czasie < `algorithm.timeoutMs`,
- zwracać komendy w postaci `AlgorithmRobotCommand` (np. `setRollingTarget`, `hold`) oraz ewentualnie `locksRequested`.
- MUST wspierać co najmniej dwa profile działania (konfiguracyjnie):
  - `level0` (walking skeleton): pojedynczy robot, `locksRequested=[]`, target jako finalny `NodeRef` (routing w robocie),
  - `level1+` (docelowy): multi-robot + locki/rolling target wg specyfikacji algorytmu.

Algorithm Service MUST NOT:
- modyfikować stanu Core bezpośrednio,
- wykonywać komunikacji z robotem/gateway.

#### Interfaces
- `POST /algo/v1/decide` (snapshot → decision): opisane w tym pliku (API poniżej).

#### Failure modes
- W razie przeciążenia, service SHOULD zwrócić 503 (Core wejdzie w hold).

#### Testy
- MUST mieć testy deterministyczności (ten sam input → ten sam output) + golden snapshots.

Related: `06_*`, `17_*`, `18_*`.

## 3. Kontrakty i API
Pełny kontrakt Core↔Algo: **Załącznik A**.

## 4. MVP: tryby algorytmu (Level0 → Level1+)
Poniżej znajduje się wymagana „ścieżka startowa” (walking skeleton), która pozwala uruchomić system end-to-end zanim wdrożymy docelowy traffic management.

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
  - `forkHeight` → `forkHeight(heightM)` zgodnie z parametrami ActionPoint / worksite.
- po wykonaniu taska (pick→drop) wysłać robota na park (`ParkPoint`/`LocationMark`) jeśli brak kolejnych zadań.

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
- obsługiwać `goTarget` (API 3051) oraz `forkHeight` (6040) jako minimalny zestaw do wykonania „pick→drop” na ActionPoint.

### 0.5 Kryterium ukończenia Level0 (exit criteria)

Level0 uznajemy za gotowe, jeśli dla `robokit-robot-sim` (a docelowo real robota):
- UI tworzy Task (PICK→DROP) lub importuje go ze streamu,
- algorytm przypisuje task do jedynego aktywnego robota,
- robot dojeżdża do pick i drop (routing w robocie),
- wykonywana jest akcja wideł (`forkHeight`) na ActionPoint,
- całość jest odtwarzalna z logów (replay) i ma deterministyczne snapshoty stanu.

Następny krok po Level0: włączenie docelowego algorytmu rezerwacji korytarzy (Level1/Level2) i przejście na multi-robot.

---

---



## 5. Lokalne struktury danych i model przetwarzania (MUST)

Algorithm Service jest „czystą funkcją” z perspektywy domeny, ale może mieć cache dla wydajności.

### 5.1 Kanoniczne wejście/wyjście (MUST)

- Wejście: `AlgorithmInputSnapshot` (+ opcjonalnie `AlgorithmSceneContext`).
- Wyjście: `AlgorithmDecision`.

**MUST (determinism):**
- Dla identycznego `AlgorithmInputSnapshot` (bitowo identycznego po kanonicznej serializacji) output MUST być identyczny.
- Jakiekolwiek cache MUST wpływać wyłącznie na wydajność, nie na wynik.

### 5.2 Cache sceny i mapy (SHOULD)

Algorithm Service SHOULD cache’ować:
- `SceneGraph` (w tym geometria `DegenerateBezier`),
- `CompiledMap` (artefakt z `map-compiler`, w szczególności: `corridors`, `cells`, `conflictSet`),
- indeksy: `nodeId -> Node`, `worksiteId -> nodes`, `actionPointId -> action params`.

Minimalna struktura cache:

```json5
{
  sceneCache: {
    "scene_01JH...": {
      sceneHash: "sha256:...",
      compiledMapHash: "sha256:...",
      sceneGraph: { /* ... */ },
      compiledMap: { /* ... */ },
      indexes: {
        nodeById: { "LM2": { /* ... */ } },
        actionPointById: { "AP22": { /* ... */ } },
        worksiteById: { "PICK_01": { /* ... */ } },
      }
    }
  }
}
```

### 5.3 Dane robocze w trakcie `decide()` (in-memory, per request)

W trakcie obliczeń algorithm-service utrzymuje struktury tymczasowe:

- `TaskQueue` / `TaskAssignment` — przydział tasków do robotów,
- `RoutePlanByRobotId` — plan trasy po grafie,
- `LockRequestsByRobotId` — żądania locków (dla DCL‑2D),
- `LockSnapshot` — kopia locków z wejścia,
- `HoldPointByRobotId` + `RollingTargetByRobotId`,
- `Diagnostics` — powody holdów, konflikty, priorytety.

Wszystkie te struktury MUST dać się zserializować do logów debug (dla golden scenarios).

---

## 6. Pobieżny algorytm działania (spójny z v0.5)

### 6.1 Level0 (walking skeleton) — MVP start
- Działa tylko dla jednego robota.
- Nie robi locków (`locksRequested=[]`).
- Generuje proste komendy: `goTarget` na `LocationMark/ActionPoint` oraz `forkHeight` na ActionPoint.
- Zakłada, że robot (Robokit/RoboCore) robi routing lokalnie.

### 6.2 Level1+ (DCL‑2D) — docelowy runtime
W skrócie (pełny opis w specyfikacji algorytmu v0.5):

```text
collectSnapshot -> scheduleTasks -> planRoutes ->
buildCorridorRequests -> lockManager.tick (atomic, deterministic) ->
computeHoldPoint + RollingTarget -> emit robotCommands
```

**MUST:**
- LockManager.tick jest deterministyczny i zależy wyłącznie od: `requests + prevLockSnapshot + reguły`.
- Rolling Target jest referencją do mapy (`LocationMark|ActionPoint`), nie `(x,y)`.
- W DCL‑2D używamy `CompiledMap.conflictSet` (prekomputowane w map-compiler).

### 6.3 Failure handling (MUST)
Jeśli dane wejściowe są niespójne (np. robot offline, pose jump, off-route):
- algorytm MUST fail-closed: zwrócić `hold=true` i reason code (np. `ROBOT_OFFLINE`, `POSE_JUMP`, `OFF_ROUTE`),
- algorytm MUST być „monotoniczny” w bezpieczeństwie (nie luzuje locków, jeśli brak pewności).

---

## 7. Wejściowe API `algorithm-service` (HTTP) — rozszerzenie dla wygody implementacji (MAY)

W MVP wystarczy `POST /algo/v1/decide`, ale dla wydajności i prostoty integracji warto mieć opcję inicjalizacji sceny.

### 7.1 POST /algo/v1/initScene (MAY)
Służy do wgrania statycznego kontekstu sceny do cache algorytmu.

Request:
```json5
{
  sceneId: "scene_01JH...",
  sceneHash: "sha256:...",
  sceneContext: { /* AlgorithmSceneContext */ },
  request: { clientId: "core", requestId: "req_01JH..." },
}
```

Response:
```json5
{
  ok: true,
  sceneId: "scene_01JH...",
  cached: true,
  compiledMapHash: "sha256:...",
}
```

Błędy:
- `400 validationError` (brak pól, zły hash),
- `409 conflict` jeśli `sceneId` istnieje, ale `sceneHash` różny (`causeCode=SCENE_HASH_MISMATCH`).

### 7.2 POST /algo/v1/decide (MUST)
- Jeśli algorithm-service ma cache sceny: request MAY zawierać tylko `sceneId+sceneHash`.
- Jeśli nie ma cache: request SHOULD zawierać `sceneContext` inline (stateless mode).

W obu przypadkach output MUST być identyczny dla identycznego wejścia.

---

## Załącznik A — Port algorytmu i API Algorithm Service (verbatim z v0.7)
# Fleet Manager 2.0 — Port algorytmu i API Algorithm Service (v0.7)

Ten plik jest kontraktem pomiędzy Fleet Core a implementacją algorytmu.
Zakładamy, że algorytm jest osobnym modułem/usługą (AI-friendly, niezależny development),
a komunikacja odbywa się po HTTP.

## 0. Tryby algorytmu (MVP i iteracje)

Algorytm jest rozwijany etapowo. W specyfikacji architektury zakładamy, że implementacja algorytmu potrafi działać w kilku „profilach” wybieranych **konfiguracyjnie** (bez negocjacji w runtime).

- `level0` (walking skeleton) — **pojedynczy robot** + **routing po stronie robota**:
  - `locksRequested` MUST być puste,
  - algorytm MAY używać tylko `setRollingTarget` z celem „finalnym” (LM/AP),
  - Core działa w `trafficMode=NONE`.

- `level1+` (docelowy) — multi-robot + rezerwacje + rolling target (wg specyfikacji algorytmu).

Ten podział jest ważny, bo pozwala uruchomić system end-to-end zanim wdrożymy złożone elementy traffic management.

---

## 1. Wymagania dla algorytmu (MUST)
- Algorytm MUST być deterministyczny dla danego wejścia (`AlgorithmInputSnapshot`).
- Algorytm MUST być side-effect free (brak IO do świata zewnętrznego jako część decyzji).
- Algorytm MUST zwracać decyzję w czasie < `algorithm.timeoutMs`.
- Jeśli algorytm nie zdąży: Core MUST przejść w tryb fail-safe (hold) dla robotów.

## 2. Kontrakty danych

### 2.1 AlgorithmSceneContext (statyczny kontekst sceny)
Core może cache’ować kontekst i przesyłać go albo raz (init), albo w każdym ticku (MVP dopuszcza oba).

```json5
{
  scene: {
    manifest: { /* SceneManifest */ },
    graph: { /* SceneGraph (z geometrią DegenerateBezier!) */ },
  },

  worksites: [ /* Worksite[] */ ],
  streams: [ /* StreamDefinition[] */ ],

  // definicje ActionPoint akcji (np. widły)
  actionPoints: [ /* ActionPointDefinition[] */ ],

  // statyczne roboty
  robots: [ /* RobotConfig[] */ ],
}
```

### 2.2 AlgorithmInputSnapshot (tick)
```json5
{
  tick: 12345,
  tsMs: 1736160000123,

  sceneId: "scene_01JH...",

  // runtime state
  robots: [ /* RobotRuntimeState[] (znormalizowane) */ ],
  tasks: [ /* Task[] (lub tylko aktywne) */ ],
  locks: [ /* Lock[] */ ],

  // dodatkowe dane
  lastDecisions: [
    { robotId: "RB-01", lastTargetNodeId: "LM2", tsMs: 1736160000000 },
  ],

  // allowlist debug/trace (MAY)
  debug: { traceId: "trace_01JH..." },
}
```

### 2.3 AlgorithmDecision (wyjście)
**Kluczowa zmiana v0.4:** Rolling target jest wskazywany jako **NodeRef** (`LocationMark` lub `ActionPoint`).

```json5
{
  tick: 12345,

  robotCommands: [
    {
      robotId: "RB-01",
      command: {
        type: "setRollingTarget",
        targetRef: { nodeId: "LM2" },   // MUST: nodeId istnieje w SceneGraph i jest LM/AP
        hold: false,
        holdReasonCode: "NONE",

        // debug
        routeId: "route_01JH...",
        explain: "Next LM ahead by 3.2m",
      },
    },
  ],

  // opcjonalne zmiany domenowe (MAY, zależnie od architektury algorytmu)
  taskUpdates: [
    {
      taskId: "task_01JH...",
      patch: { status: "assigned", assignedRobotId: "RB-01" },
    },
  ],

  locksRequested: [
    { robotId: "RB-01", resourceType: "edgeGroup", resourceId: "LM2<->LM3", ttlMs: 5000 },
  ],

  meta: { algoId: "algo_mvp_v0_1" },
}
```

**Walidacje (MUST):**
- `targetRef.nodeId` MUST istnieć w `scene.graph.nodes`.
- Node MUST mieć `className` ∈ {`LocationMark`, `ActionPoint`}.
- Jeśli `hold=true`, Core MUST NOT dispatchować komend ruchu.

## 2.4 Kanoniczne mapowanie decyzji algorytmu na komendy domenowe (MUST)

W systemie istnieją dwa poziomy „komend”:
- **AlgorithmRobotCommand** (wewnętrzny język algorytmu): np. `setRollingTarget`, `hold`.
- **CommandRecord** (kanoniczna komenda domenowa Core → Gateway): np. `goTarget`, `stop`, `forkHeight`.

To mapowanie jest wykonywane WYŁĄCZNIE w Fleet Core (single source of truth), zgodnie z regułami:

1) `setRollingTarget(targetRef)` → `CommandRecord.type = "goTarget"`, `payload.targetRef = targetRef`.
   - Core MUST deduplikować: jeśli ostatni efektywnie wysłany `targetRef` dla robota jest identyczny, Core MUST NOT tworzyć nowego `CommandRecord`.
   - Core MUST stosować rate-limit: nie częściej niż `FleetCoreConfig.rollingTarget.updateMinIntervalMs`.
   - `targetRef.nodeId` MUST wskazywać węzeł `LocationMark` lub `ActionPoint`.

2) `hold=true` → Core MUST wstrzymać ruch (brak nowych komend ruchu) i utrzymać robota w stanie `navigation.state = paused|blocked` zgodnie z polityką.

3) (MVP) Algorytm nie wysyła bezpośrednio komend wideł. Widełki są realizowane jako kroki TaskRunner (`TaskStep.type=forkHeight`) oraz mapowane w Core na `CommandRecord.type=forkHeight` (patrz `05_*` i `10_*`).

Uwaga praktyczna: jeśli w przyszłości algorytm będzie generował jawne akcje wideł, to Core MUST mapować je do `CommandRecord` w analogiczny sposób jak powyżej (z pełnym audytem w event log).

## 3. API HTTP Algorithm Service (MUST)

### 3.1 GET /algo/v1/health
- Odpowiedź: `200 { status: "ok" }` lub `503`.

### 3.2 POST /algo/v1/decide
- Request body: `AlgorithmInputSnapshot`
- Response body: `AlgorithmDecision`
- Timeout: wg `FleetCoreConfig.algorithm.timeoutMs`.

#### Przykład request (JSON5 w spec, realnie JSON)
```json5
{
  tick: 12345,
  tsMs: 1736160000123,
  sceneId: "scene_01JH...",
  robots: [
    { robotId: "RB-01", pose: { xM: 10.0, yM: 3.0, angleRad: 0.0 }, navigation: { state: "idle" } },
  ],
  tasks: [],
  locks: [],
}
```

#### Przykład response
```json5
{
  tick: 12345,
  robotCommands: [
    { robotId: "RB-01", command: { type: "setRollingTarget", targetRef: { nodeId: "LM2" }, hold: false } },
  ]
}
```

### 3.3 POST /algo/v1/initScene (SHOULD; opcjonalne)
Jeśli chcemy przesyłać `AlgorithmSceneContext` raz (cache po stronie algorytmu):

Request:
```json5
{
  sceneId: "scene_01JH...",
  sceneHash: "sha256:...",
  sceneContext: { /* AlgorithmSceneContext */ },
  request: { clientId: "core", requestId: "req_01JH..." },
}
```

Response:
```json5
{ ok: true, cached: true, sceneId: "scene_01JH...", sceneHash: "sha256:..." }
```

Błędy:
- `409 conflict` jeśli `sceneId` istnieje, ale `sceneHash` jest inny (`causeCode=SCENE_HASH_MISMATCH`).

MVP MAY pominąć i wysyłać kontekst w każdym ticku (kosztem większych payloadów).

## 4. Failure modes (MUST)
- Jeśli Algorithm Service zwraca błąd (`5xx` lub `4xx`): Core MUST ustawić hold dla robotów i emitować `systemError` z `causeCode=ALGO_ERROR`.
- Jeśli timeout: Core MUST hold + `causeCode=ALGO_TIMEOUT`.
- Core MUST logować request/response algorytmu do event log (lub do osobnego `algo.log.jsonl`) w trybie debug.

## 5. Future-proof
- Kontrakty algorytmu mają osobną wersję (`algoId`, `contractsVersion`) i mogą ewoluować niezależnie.
- Core MAY wspierać wiele algorytmów i routing ruchu na podstawie `scene.manifest` lub config.
