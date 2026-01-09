# Specyfikacja algorytmu harmonogramowania i zarządzania ruchem dla Fleet Manager (v0.5)

**Data:** 2026-01-07  
**Status:** Draft implementowalny (MVP v1) + roadmap (future)  
**Zakres:** *task scheduling* + *traffic scheduling (Deterministic Corridor Locking 2D / DCL‑2D)* + *Rolling Target Point (RTP)* + kontrakty danych + testy/logi/replay.  
**Cel nadrzędny:** mieć algorytm, który **działa deterministycznie i bezpiecznie** już teraz, a jednocześnie mieć porządną specyfikację i interfejsy, które umożliwią kolejne wersje bez przepisywania całości.

---

> **Zestaw v0.5 (podział na 3 pliki):**
> - `specyfikacja-algorytm-kontrakty-i-akceptacja-v0_5.md`
> - `specyfikacja-algorytm-runtime-harmonogramowanie-ruch-v0_5.md`
> - `specyfikacja-algorytm-map-compiler-v0_5.md`

## 5. Przegląd algorytmu (pipeline) + pseudokod ticka

### 5.1 Pipeline (ASCII)

```text
┌───────────────┐   ┌──────────────┐   ┌───────────────┐   ┌──────────────┐
│ Telemetry In  │→→│ TaskScheduler │→→│ RoutePlanner    │→→│ ProgressEst.  │
└──────┬────────┘   └──────┬───────┘   └──────┬────────┘   └──────┬───────┘
       │                   │                  │                    │
       │                   v                  v                    v
       │            ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
       │            │ CorridorBuild │→→│ LockManager    │→→│ HoldPoint+RTP  │
       │            └──────────────┘   └──────────────┘   └──────────────┘
       │                                                           │
       v                                                           v
┌───────────────┐                                           ┌──────────────┐
│ Logger/Replay  │←←←←←←←←←←←← snapshots/decisions ←←←←←←←←  │ RobotCommand  │
└───────────────┘                                           └──────────────┘
```

### 5.2 Pseudokod ticka (deterministyczny, atomowy)

**[MVP] MUST:** LockManager działa na jednym, atomowym „wejściu ticka” (snapshot), a wynik jest commitowany atomowo.

```text
tick(now):
  input := collectSnapshot(now)  // robot states, stream states, obstacles, previous locks
  validate(input)                // basic sanity; if invalid -> fail-closed

  tasksDelta := taskScheduler.step(input)
  routes := routePlanner.planForAll(input, tasksDelta)

  progress := progressEstimator.estimateAll(input, routes)

  requests := corridorBuilder.buildRequests(input, routes, progress)

  // --- ATOMIC REGION ---
  // The lock decision depends ONLY on: requests + prevLockSnapshot + deterministic rules.
  lockResult := lockManager.tick(now, prevLockSnapshot, requests)
  // --- END ATOMIC REGION ---

  commands := rtpController.computeCommands(now, input, routes, progress, lockResult)

  robotGateway.send(commands)    // I/O outside atomic region (async); deterministic intents are logged
  logger.append(now, input, tasksDelta, routes, progress, requests, lockResult, commands)
```

**Konsekwencja:** nawet jeśli `robotGateway.send` ma opóźnienia, deterministyczność decyzji LockManager nie jest naruszona (logujemy „intencję”).

---

## 6. Model bezpieczeństwa i geometria (2D)

### 6.1 Parametry geometryczne robota

Robot ma parametry:

- `head` [m] — odległość od pivota do najbardziej wysuniętego punktu „fizycznego przodu” robota.  
- `tail` [m] — odległość od pivota do najbardziej wysuniętego punktu „fizycznego tyłu” robota.  
- `width` [m] — szerokość robota.

Dodatkowe parametry bezpieczeństwa (konfiguracja robota):

- `safetyFront`, `safetyRear`, `safetySide` [m] — twarde marginesy antykolizyjne. **[MVP] MUST**  
- `stopStandoff` [m] — polityka: „nigdy nie zatrzymuj się bliżej niż X przed innym robotem / przed granicą rezerwacji”. **[MVP] MUST**  
- `poseMargin` [m] — maksymalny błąd lokalizacji. **[MVP] MUST**  
- `trackingMargin` [m] — maksymalny błąd śledzenia trajektorii. **[MVP] MUST**  
- `turningExtraMargin` [m] — dodatkowa inflacja na zakrętach. **[MVP] SHOULD**

**Uwaga dot. pytania o sens rozróżnienia:** `stopStandoff` i `safetyFront` da się „zlać” (np. powiększając safetyFront), ale trzymanie ich osobno jest zwykle praktyczne:
- `safety*` = geometria zakazu (kolizja + niepewność),
- `stopStandoff` = polityka ruchu (hamowanie/komfort/reakcja/systemowe buforowanie).

### 6.2 Efektywna bryła bezpieczeństwa (inflated footprint) + rozróżnienie safety vs standoff

Definiujemy „inflated footprint” robota jako **prostokąt** w układzie robota (robot frame), którego inflacja pokrywa:

- geometrię robota (`head`, `tail`, `width`),
- twarde strefy bezpieczeństwa (`safetyFront/Rear/Side`),
- błędy lokalizacji i śledzenia trajektorii (`poseMargin`, `trackingMargin`).

Parametry (metry):

- `frontExt = head + safetyFront + poseMargin + trackingMargin`  
- `rearExt  = tail + safetyRear  + poseMargin + trackingMargin`  
- `sideExt  = width/2 + safetySide + poseMargin + trackingMargin`

Dla ruchu w konkretnym `movestyle` na danym fragmencie trasy wyprowadzamy:

- `leadExt  = (movestyle == forward) ? frontExt : rearExt`  
- `trailExt = (movestyle == forward) ? rearExt  : frontExt`

**[MVP] MUST (ważne):** przy jeździe tyłem „przód ruchu” to fizyczny tył robota.  
Wszystkie obliczenia *kierunku ruchu* MUSZĄ używać `movestyle`, a nie „fizycznego przodu” robota.

#### 6.2.1 `stopStandoff` to polityka operacyjna, nie geometria kolizyjna

`stopStandoff` [m] to **minimalny odstęp operacyjny** (np. 3.0 m): robot nie może dojechać bliżej niż `stopStandoff` do innego robota „na tym samym torze ruchu”, nawet jeśli 2D obwiednie jeszcze się nie przecinają.

- `stopStandoff` jest **niezależne** od `safetyFront/Rear/Side`.  
- `stopStandoff` jest egzekwowane przez algorytm `holdPointRouteS` jako składnik `hold_standoff` (rozdz. 11.8.2) i MUSI uwzględniać drogę hamowania `d_stop(v)`.

**[MVP] MUST NOT:** `stopStandoff` nie jest „dopompowywane” do `CELL.sweptShape` ani do `conflictSet`, ponieważ miesza politykę headway z geometrią 2D i może niepotrzebnie blokować mijanki / ruch poprzeczny.

Jeżeli kiedyś będziemy chcieli zintegrować `stopStandoff` jako „virtual keep‑out”, to musi to być jawnie wersjonowana zmiana kontraktu Map Compiler (wraz z golden scenariuszami).


### 6.3 Węzeł: przejazd płynny vs stop+obrót (kluczowe!)

Ten punkt był źródłem nieporozumień, więc robimy to maksymalnie jasno.

Węzeł może być *geometrcznie* przejechany na dwa sposoby:

1) **Geometria TANGENT (pass‑through możliwy)**  
   - krawędzie wejścia i wyjścia są styczne (ciągłość kierunku w punkcie węzła w granicach `tangentEps`),  
   - `movestyle` jest kompatybilny (nie zmienia się „przód/tył” bez zatrzymania).

2) **Geometria NON‑TANGENT (pass‑through niemożliwy)**  
   - brak styczności, albo zmiana `movestyle`, albo inny warunek wymuszający postój.

**Map Compiler MUST** wyznaczać dla każdej pary `(incomingEdgeKey, nodeId, outgoingEdgeKey)` pole `transitionGeomKind = TANGENT|NON_TANGENT` (patrz dokument Map Compiler).

**Runtime MUST** osobno wyznaczać `willStopAtNode` (np. pick/drop, fork action, konflikt, zmiana `movestyle`, wymuszone zatrzymanie przez hold‑point).

Z tego wynikają 2 reguły:

- jeśli `transitionGeomKind = NON_TANGENT` → **MUST stop** (węzeł wymaga postoju/manewru),  
- jeśli `willStopAtNode = true` → **MUST reserve** `NODE_STOP_ZONE(nodeId)` (niezależnie od `transitionGeomKind`).

Czyli: nawet jeśli geometria jest TANGENT, ale robot ma zatrzymać się w węźle (np. bo czeka na lock), to musi mieć zarezerwowaną strefę postoju/obrotu.

#### 6.3.1 Promień strefy postoju/obrotu (`NODE_STOP_ZONE`)

Definiujemy promień obrotu:

\[
R_{turn} = \max(\sqrt{frontExt^2 + sideExt^2},\ \sqrt{rearExt^2 + sideExt^2})
\]

Interpretacja: pivot w punkcie (x,y) podczas dowolnego obrotu może zająć dowolny punkt w kole o promieniu `R_turn`.

**[MVP] MUST:** jeśli robot jest zatrzymany w węźle (speed≈0 i pivot w `nodeStopZoneRadius`), `NODE_STOP_ZONE(nodeId)` jest traktowane jako zasób aktywnie zajmowany (`occupied`) i musi znajdować się w `granted`.

### 6.4 Swept corridor na krzywych (zakręty, zarzucanie tyłu, bliskie krawędzie)

Twoja kluczowa uwaga: **nie ma gwarancji**, że różne krawędzie są od siebie „daleko”, a na zakrętach wózek **zarzuca tyłem**.  
Z tego powodu nie wystarczy 1D spacing po łuku ani „krawędź jako wąski tunel”.

**[MVP] MUST:** bezpieczeństwo 2D opiera się o geometrię prekomputowaną w Map Compiler:

- każda `CELL(cellId)` ma `sweptShape` (MVP: `multiRect` — lista prostokątów OBB), opisujące obwiednię robota podczas przejazdu pivota przez zakres `corridorS` danej komórki,
- `conflictSet(cellId)` jest policzony offline jako wszystkie komórki, których `sweptShape` przecina się w 2D,
- runtime używa wyłącznie `conflictSet` (O(1) lookup) — **nie liczy** Minkowskiego, offsetów ani geometrii w ticku.

**Dlaczego `multiRect` (a nie Minkowski/dysk):**
- na prostych zachowuje „wąskość” (prostokąt), dzięki czemu **nie zabija mijanek** w realnie wąskich korytarzach,
- na zakrętach (przez sampling orientacji) uwzględnia tail‑swing i daje poprawny 2D spacing nawet gdy krawędzie są blisko siebie.

Szczegóły: plik „map‑compiler” (sekcje dot. `sweptShape`, `intersects`, `conflictSet`).


### 6.5 Inwarianty bezpieczeństwa (MUST)

System MUSI spełniać w każdej chwili:

- **I‑Occ⊆Grant:** dla każdego robota `occupied(R) ⊆ granted(R)` (z rozdz. 11.4).  
- **I‑No2DConflict:** dla dowolnych dwóch robotów `R != Q`: `granted(R)` nie konfliktuje z `granted(Q)` wg relacji konfliktów z `CompiledMap`.  
- **I‑StopLine:** `holdPointRouteS` jest liczony tak, aby robot przy maksymalnej dopuszczalnej prędkości i najgorszych opóźnieniach był w stanie wyhamować przed końcem przydziału (oraz przed `stopStandoff`).  
- **I‑NodeZone:** jeśli `transitionGeomKind=NON_TANGENT` **albo** `willStopAtNode=true` **albo** robot faktycznie stoi w `NODE_STOP_ZONE`, to `NODE_STOP_ZONE(nodeId)` jest w `granted` i nie konfliktuje z innymi.  
- **I‑FailClosed:** stale/offline/pose jump/off‑route → system przechodzi w tryb konserwatywny (`SAFETY_STOP`) i nie wydaje poleceń ryzykownych.

---

## 9. Harmonogramowanie zadań (workflow streams) [MVP]

### 9.1 Model zadania

Zadanie ma postać:

- `PICK(nodeId)` — operacja pobrania, trwa `pickDuration`.  
- `DROP(nodeId)` — operacja odłożenia, trwa `dropDuration`.  
- `MOVE(route)` — przejazd po grafie.

**[MVP] MUST:** pick i drop są zawsze węzłami.

### 9.2 Stany robota (FSM) — state machine (jednoznaczne)

Robot jest sterowany przez Fleet Managera wg FSM. Minimalny zestaw stanów:

- `IDLE` — brak tasku; robot może jechać do parkingu.  
- `GOING_TO_PICK` — jedzie do pick node.  
- `PICKING` — stoi w pick node i wykonuje operację czasową.  
- `GOING_TO_DROP` — jedzie do drop node.  
- `DROPPING` — stoi w drop node i wykonuje operację czasową.  
- `GOING_TO_PARK` — jedzie do parkingu (preemptable).  
- `TRAFFIC_HOLD` — zatrzymany przez LockManager (hold‑point).  
- `SAFETY_STOP` — zatrzymany przez fail‑closed (stale/offline/pose jump/off-route).  
- `FAULT` — błąd robota (provider zgłosił).  

**[MVP] MUST:** przejścia są deterministyczne. Poniżej minimalny diagram.

```text
IDLE
  | (task assigned)
  v
GOING_TO_PICK ---> TRAFFIC_HOLD <--- GOING_TO_DROP <--- GOING_TO_PARK
  | (arrive)             |               | (arrive)           | (new task)
  v                      |               v                    |
PICKING -----------------+             DROPPING --------------+
  | (done)                               | (done)
  v                                      v
GOING_TO_DROP                          IDLE

Any state -> SAFETY_STOP on (stale/offline/pose_jump/off_route)
Any state -> FAULT on (robot fault)
SAFETY_STOP -> IDLE/GOING_* only after recovery protocol
```

### 9.3 Auto‑parking + preempcja

- Jeśli robot jest `IDLE` i nie ma tasków, TaskScheduler powinien zlecić `GOING_TO_PARK`.  
- Jeśli robot jest `GOING_TO_PARK` i pojawi się zadanie, TaskScheduler MUSI móc go preemptować:
  - anulować cel parkingu,  
  - wyznaczyć trasę do pick,  
  - zachować spójność locków (LockManager w kolejnym ticku przytnie/zmieni corridor).

### 9.4 Wybór robota do zadania (deterministyczny)

[MVP] Minimalna deterministyczna polityka:

1) robot w stanie `IDLE` albo `GOING_TO_PARK` ma pierwszeństwo,  
2) wybierz robota o najmniejszym ETA do pick (z RoutePlanner + d_stop),  
3) tie‑break: `robotId` (deterministycznie).

**[MVP] MUST:** przydział jest deterministyczny i logowany.

---

## 10. Planowanie trasy (RoutePlanner) i estymacja postępu (ProgressEstimator) [MVP]

### 10.1 RoutePlanner (single‑agent)

- znajdowanie trasy po grafie dla pojedynczego robota (np. Dijkstra/A* po długości),  
- koszt krawędzi może uwzględniać `movestyle` (jazda tyłem może być droższa).

**[MVP] MUST:** planner zwraca listę `edgeKey` z geometrią i długością.

### 10.2 Snap start/goal do geometrii

- start: aktualny `pose` jest rzutowany na najbliższy legalny punkt na geometrii trasy (edgeKey + s).  
- goal: pick/drop node to węzeł — końcowy s = L ostatniej krawędzi do węzła (lub dedykowana krawędź do „dock point”).

**[MVP] MUST:** unikamy „nearest node teleport” jako metody snapowania.

### 10.3 ProgressEstimator (wymagania jakościowe)

ProgressEstimator jest „mostem” między telemetrią 2D/odometrią a światem grafu.

**[MVP] MUST:** zwracać **jednoznacznie** oba pojęcia postępu:

- `edgeProgress = { edgeKey, edgeS }` — pozycja robota *na konkretnej krawędzi* w metrach od jej początku,  
- `routeProgress = { routeId, routeS }` — pozycja robota *wzdłuż aktualnie przypisanej trasy* (suma długości krawędzi + `edgeS` w aktywnej krawędzi).

Oraz metryki jakości projekcji:

- `lateralError` [m], `headingError` [rad], `confidence` [0..1],  
- flagi: `offRoute`, `poseJump`.

**Dlaczego dwa „S”?**  
- `edgeS` jest potrzebne do odwołania do geometrii mapy i komórek na tej krawędzi,  
- `routeS` jest potrzebne do logiki „prefix locków”, hold‑point i RTP (bo pracujemy na ciągu krawędzi).

**Detekcje (kontrakt):**

- `offRoute = true` jeśli:
  - `lateralError > maxLateralError` **albo**
  - nie da się stabilnie dopasować pozycji do żadnej krawędzi z „okolicy” ostatniego dopasowania.
- `poseJump = true` jeśli:
  - |Δpose| > `poseJumpThreshold` w krótkim oknie czasu **albo**
  - skok w `edgeKey/edgeS` jest niefizyczny (nie da się go wytłumaczyć `vMax` i czasem).

**[MVP] MUST (fail‑closed):**
- jeśli `confidence` spada poniżej progu albo `offRoute=true` albo `poseJump=true`, system przechodzi do `SAFETY_STOP` (zob. rozdz. 13),
- do logów trafia zawsze para `(edgeProgress, routeProgress)` + wszystkie błędy/progi użyte do decyzji.

---

## 11. Zarządzanie ruchem: Deterministic Corridor Locking 2D (DCL‑2D) [MVP]

### 11.1 Intuicja

Każdy robot rezerwuje prefiks trasy (komórki) do przodu (horyzont rezerwacji). Konflikty 2D są rozstrzygane deterministycznie:

- jeden robot dostaje prefiks,  
- inne przycinają prefiksy tak, aby nie wchodzić w zarezerwowane obszary,  
- jeśli brak pracy → parking, ale parking jest preemptable.

### 11.2 Semantyka „corridor” i częściowej rezerwacji

`CorridorRequest` zawiera listę komórek od bieżącej pozycji `routeS` do `lockLookahead`, plus opcjonalny lookback.

**[MVP] MUST:** robot może rezerwować tylko część krawędzi (część komórek).

### 11.3 Horyzont rezerwacji i hamowanie

**[MVP] MUST:** `lockLookahead` musi być tak dobrany, aby robot miał gdzie się zatrzymać:

- `lockLookahead ≥ rtpLookahead + d_stop(vMax)` (z tabeli one‑pager).

Funkcja `d_stop(v)` w MVP:

\[
d\_stop(v) = \frac{v^2}{2 \cdot brake} + v \cdot (commandLatency/1000) + stopExtra
\]

gdzie:
- `brake` w [m/s²],  
- `commandLatency` w [ms],  
- `stopExtra` [m] — stały bufor (np. 0.2–0.5) + może zawierać wpływ telemetry jitter.

### 11.4 Zasoby i konflikty

W DCL‑2D operujemy na **zasobach** (lockowanych atomowo) zamiast na „gołych” punktach trasy.

#### 11.4.1 Typy zasobów

- `CELL(cellId)` — podstawowy zasób przestrzenny (2D) wynikający z dyskretyzacji korytarzy.  
- `NODE_STOP_ZONE(nodeId)` — strefa postoju/obrotu w węźle (360°).  
- `CORRIDOR_DIR(corridorId, dir)` — token kierunku dla korytarzy *single‑lane* (dir = `A_TO_B` lub `B_TO_A`).  
- `CRITICAL_SECTION(csId)` — token pojemności `capacity=1` (MVP) dla skrzyżowań/zwężeń.

**Uwaga o nazewnictwie:** w v0.3 używaliśmy `NODE_TURN(nodeId)`. W v0.4 uściślamy znaczenie: to jest strefa *postoju* (i potencjalnego obrotu), więc nazwa `NODE_STOP_ZONE` jest bliższa prawdzie.

#### 11.4.2 Konflikty: 2D + re‑entrant semantics

Każda `CELL(cellId)` ma prekomputowany `conflictSet` (lista `cellId`), tj. wszystkie komórki, których **swept‑polygon 2D** przecina się z polygonem tej komórki po uwzględnieniu:
- geometrii robota (head/tail/width),
- marginesów: `poseMargin`, `trackingMargin`, `turningExtraMargin`,
- zakrętów (tail‑swing jest „z automatu” uwzględniony przez swept‑polygon).

**[MVP] MUST:** `conflictSet` jest symetryczny i zawiera **samą komórkę** (self‑membership).

Konflikt `CELL`↔`CELL` jest wykrywany tylko między **różnymi robotami**.  
To jest kluczowe:

- self‑membership w `conflictSet` upraszcza prekomputację i testy,  
- runtime stosuje regułę „re‑entrant”: robot może posiadać zasoby, które „konfliktują” z innymi jego zasobami.

Formalnie:

- Dla robota `R` z przydziałem `G(R)` konflikt sprawdzamy dla każdego innego robota `Q ≠ R`:
  - `G(R)` nie może przecinać `conflict(G(Q))`.

#### 11.4.3 Lifecycle zasobów: occupied vs granted vs released

W każdej chwili rozróżniamy:

- `occupied(R)` — zasoby, które robot **fizycznie** może zajmować *teraz* (z marginesami niepewności),  
- `granted(R)` — zasoby, które robot ma **przydzielone** przez LockManager (prefix na trasie),  
- `released(R)` — zasoby, które robot oddał (już nie ma prawa do nich).

Wymagane zależności:

- **[MVP] MUST:** `occupied(R) ⊆ granted(R)` dla każdego robota `R` (fail‑closed jeśli nie).  
- **[MVP] MUST:** dla dowolnych dwóch robotów `R != Q`: `granted(R)` nie konfliktuje z `granted(Q)` (wg relacji konfliktów).

ASCII intuicja:

```text
routeS →
[R] occupied███ granted████████████
            ^current          ^grantEnd
```


##### 11.4.3.1 Jak liczymy `occupied(R)` (MVP — konkretnie, implementowalnie)

`occupied(R)` to zestaw zasobów, które robot **mógł** zajmować w bieżącym ticku (konserwatywnie), biorąc pod uwagę:
- projekcję pozy na trasę (`routeS`),
- niepewność projekcji i „wiek” telemetrii,
- fakt, że geometria 2D jest już zaszyta w `CELL.sweptShape`.

W MVP `occupied(R)` liczymy jako **zestaw komórek**, których zakres `routeS` może pokrywać pivot robota w tym ticku, + ewentualnie `NODE_STOP_ZONE`.

**Wejścia:**
- `progress.routeProgress.routeS` (z ProgressEstimator),
- `telemetryAgeMs = now - telemetry.timestamp`,
- progi: `telemetryTimeout`, `minConfidence`, `poseJumpThreshold`, `offRouteThreshold`,
- margines wzdłuż trasy: `sUncertaintyMargin` [m] (konfig; min 0.0).

**Krok 0 — stany fail‑closed (priorytet):**
- jeśli `telemetryAgeMs > telemetryTimeout` → `occupied(R) = freeze(lastOccupied)` i `state=STALE_TELEMETRY`,
- jeśli `poseJump=true` albo `offRoute=true` albo `confidence < minConfidence` → `occupied(R) = freeze(lastOccupied)` i `state=POSE_JUMP/OFF_ROUTE`.

*(to jest spójne z rozdz. 13: nie zwalniamy locków „bo nie wiemy”)*

**Krok 1 — zakres możliwego `routeS` pivota:**

Dla zdrowej telemetrii wyznaczamy zakres pivota:

- `s0 = routeS - sUncertainty`  
- `s1 = routeS + sUncertainty`

gdzie konserwatywnie:

\[
sUncertainty = sUncertaintyMargin + v\_{abs,max} \cdot (telemetryAgeMs/1000)
\]

- `v_abs,max` w MVP można przyjąć jako `max(v_current, v_commandedMax)`.

**Krok 2 — mapowanie `routeS` → komórki:**

`RoutePlan` zawiera listę komórek wzdłuż trasy w kolejności rosnącego `routeS`, każda z `(cellId, routeS0, routeS1)`.

`occupiedCells = { cell | [routeS0(cell), routeS1(cell)] ∩ [s0, s1] ≠ ∅ }`.

**Krok 3 — `NODE_STOP_ZONE`:**

Jeżeli robot ma `willStopAtNode=true` na najbliższym węźle albo `speed < stoppedSpeedEps` i pivot znajduje się w `nodeStopZone` (wg projekcji) → dodaj `NODE_STOP_ZONE(nodeId)`.

**Wyjście:**
- `occupied(R) = sort(occupiedCells) ∪ optional(nodeStopZone)`.

**[MVP] MUST:** `occupied(R)` jest logowane per tick (w snapshot), razem z `s0/s1`, `telemetryAgeMs` i powodem ewentualnego freeze.

#### 11.4.4 Polityka zwalniania (release) + lookback

Komórki zwalniamy **dopiero wtedy**, gdy robot na pewno ich już nie potrzebuje mimo jitteru.

Definiujemy:

- `releaseBackMargin = trailExtent + poseMargin + trackingMargin`  (konserwatywnie),  
- `lookbackDistance` (konfig) — ile metrów „za sobą” robot nadal trzyma w grancie, aby nie było flappingu.

Reguła:

- Komórkę `cell` można zwolnić, jeśli `robot.routeS - releaseBackMargin` jest **większe** niż `cell.routeS1`.  
- Grant zawsze zawiera:
  - komórki pokrywające `occupied(R)` oraz
  - jeszcze `lookbackDistance` za robotem.

**[MVP] MUST:** zwalnianie jest deterministyczne i odporne na drobne zmiany projekcji (`edgeS` jitter).

### 11.5 Deterministyczny LockManager — reguły i atomowość

**[MVP] MUST:** LockManager.tick jest czystą funkcją:

`(now, prevLockSnapshot, requests) -> (newLockSnapshot, grants[])`

- bez I/O,  
- bez zależności od kolejności struktur,  
- z jawnym sortowaniem.

#### 11.5.1 Kolejność priorytetu robotów

Priorytet bazowy (od najwyższego):

1) `SAFETY_STOP`, `FAULT`, `OFFLINE` — robot traktowany jako przeszkoda; w praktyce „zamraża” zasoby.  
2) `PICKING`, `DROPPING` — musi dokończyć operację w węźle.  
3) `GOING_TO_PICK`, `GOING_TO_DROP`  
4) `GOING_TO_PARK`  
5) `IDLE`

Tie‑break zawsze deterministyczny (np. robotId).

#### 11.5.2 Fairness / aging (deterministyczne, bez magii)

Dla robota, który czeka na zasób, wyliczamy:

- `waitMs = now - firstBlockedAtMs`  
- `bonus = clamp( floor(waitMs / fairnessStep), 0, floor(fairnessCap / fairnessStep) )`  
- `effectivePriority = basePriority + bonus`

**[MVP] MUST:** aging nie może odbierać zasobów robotowi, który już jest „w środku” wąskiego korytarza lub CS (tzn. nie robimy preemption zasobów, które robot już posiada).

#### 11.5.3 Pseudokod grant/deny w ticku (konkretnie)

```text
lockManager.tick(now, prev, requests):
  // 1) zbuduj stan zajętości: co jest już fizycznie zajęte (occupancy) + co było przyznane i jeszcze nie zwolnione
  occ := buildOccupancy(prev, requests.telemetry)  // includes stale/offline inflation

  // 2) ustal porządek robotów
  order := sortBy( effectivePriority, requestTs, robotId )

  new := emptySnapshot()
  for robot in order:
    req := requests[robot]
    if req.disabled: 
      grant(robot) = empty; continue

    // 2a) zasoby specjalne (direction token, CS token, node turn) są rozważane razem z cells (all-or-prefix)
    desired := req.desiredResources  // ordered list with markers for CS/corridor dir/nodeTurn
    grantedPrefix := []

    for res in desired (in order):
      if conflicts(res, new, occ): 
         break
      if wouldViolateDirectionRules(res, new, occ):
         break
      if wouldViolateCriticalSectionRule(res, desired, new, occ):
         break

      grantedPrefix.append(res)
      reserve(res, new)

    grant(robot) = grantedPrefix
    updateWaitState(robot, grant, req)  // for fairness metrics and logs

  return { snapshot: new, grants }
```

**Interpretacja:** „greedy prefix + conflict check”. To jest łatwe do wizualizacji i debugowania.

### 11.6 Single‑lane: direction arbitration (bez cofania)

**Założenie MVP:** pewne korytarze są *single‑lane* (nie ma fizycznej możliwości minięcia) i muszą działać bez „backoffu”/cofania jako mechanizmu rozwiązywania konfliktu.

#### 11.6.1 Definicje: A/B i oś `corridorS`

Każdy `corridorId` w `CompiledMap` ma:

- `aNodeId` oraz `bNodeId` (końce korytarza),  
- oś `corridorS` rosnącą od `A` do `B` (`corridorS=0` w `A`).

Kierunki logiczne:

- `A_TO_B` ⇔ ruch zgodny ze wzrostem `corridorS`,  
- `B_TO_A` ⇔ ruch przeciwny.

**[MVP] MUST:** te definicje są jednoznaczne w mapie (nie „wynikają z edgeKey stringów”).

#### 11.6.2 Token `CORRIDOR_DIR`

Dla `corridor.singleLane=true` istnieje token:

- `CORRIDOR_DIR(corridorId)` o stanie:
  - `dir = NONE | A_TO_B | B_TO_A`,  
  - `holders = set(robotId)` — roboty, które mają jakiekolwiek `CELL` w tym `corridorId`,  
  - `emptySince` — czas, od kiedy `holders` jest puste.

Reguły:

1) Jeśli `holders` nie jest puste, `dir` jest ustalony i **nie zmienia się**.  
2) Jeśli `holders` jest puste:
   - `dir` może zostać ustawiony przez pierwszego robota, któremu przyznamy jakąkolwiek komórkę w tym korytarzu,  
   - ale zmiana `dir` jest stabilizowana przez `edgeDirHold` (histereza flipów).

3) Jeśli czekają roboty „z obu stron”, wybór strony jest deterministyczny i fair:
   - wybierz stronę z najstarszym `firstBlockedAt` (aging),  
   - tie‑break: `robotId` (stabilnie).

4) Robot, który ma przyznane komórki w single‑lane, **MUST** respektować `dir` aż do opuszczenia korytarza.

**[MVP] MUST:** nie ma scenariusza, w którym dwa roboty w tym samym ticku dostają komórki w przeciwnych kierunkach w tym samym `corridorId`.

**[MVP] MUST:** arbitration nie wymaga cofania robota jako mechanizmu „odkleszczania”. Cofanie może wystąpić tylko wtedy, gdy jest elementem zaplanowanej trasy (krawędź z `movestyle=reverse`) i jest dozwolone przez politykę bezpieczeństwa robota.

### 11.7 Critical Sections: „nie wjeżdżaj jeśli nie możesz wyjechać” (anti‑gridlock)

Map Compiler oznacza zestawy komórek jako `criticalSections`.  
Reguła w MVP:

- robot może dostać **jakąkolwiek** komórkę należącą do CS tylko jeśli jednocześnie dostanie:
  - wszystkie komórki CS, które leżą w jego prefiksie przejazdu przez CS, oraz  
  - dodatkowe komórki „za CS” o łącznej długości ≥ `exitClearance`.

To można implementować jako zasób `CRITICAL_SECTION(csId)`:
- `capacity=1` (MVP),  
- plus walidacja „exit clearance” przy grantowaniu.

### 11.8 Hold‑point (stop‑line) — definicja i algorytm

**Definicja:** `holdPointRouteS` to **maksymalna dozwolona pozycja pivota na trasie** (`routeS`), której robot nie może przekroczyć, jeśli ma być spełnione bezpieczeństwo 2D oraz polityka `stopStandoff`.

Intuicja: to jest „stop‑linia” wzdłuż trasy — nawet jeśli robot *chce* jechać dalej (bo ma target), nie wolno mu przekroczyć tej linii.

`holdPointRouteS` jest wynikiem **minimum** z kilku ograniczeń:

1) **Ograniczenie od locków 2D (`DCL‑2D`)** — wynik przydzielonych zasobów (komórek)  
2) **Ograniczenie `stopStandoff` (follow distance)** — wynik obecności robota „przed nami” w tym samym korytarzu i kierunku  
3) **Ograniczenie węzłowe (`NODE_STOP_ZONE`)** — jeśli plan zakłada stop w węźle, a węzeł nie jest zarezerwowany, hold‑point MUSI wypaść wcześniej

#### 11.8.1 Składnik „lock‑limited” (z przydzielonych komórek)

1. Weź ostatnią przyznaną komórkę na trasie (dla robota) i jej koniec w układzie trasy → `grantEndRouteS`.  
2. Odejmij minimalną drogę do bezpiecznego zatrzymania:

\[
hold\_{lock} = grantEndRouteS - d\_{stop}(v\_{ref}) - holdSafetyBuffer
\]

gdzie:
- `v_ref` to konserwatywnie: `max(v_current, v_commandedMax)` (żeby nie przecenić hamowania),  
- `holdSafetyBuffer` [m] ≥ `stopExtra` + `holdHysteresis`,  
- na zakrętach można dodać `turningExtraMargin` (jeśli nie jest już uwzględnione w inflacji komórek).

**Funkcja hamowania** (minimum dla MVP):

\[
d\_{stop}(v) = v \cdot t\_{reaction} + \frac{v^2}{2\cdot brake} + stopExtra
\]

- `brake` w [m/s²],  
- `t_reaction` w [s] to suma opóźnień:  
  - `tickPeriod` (bo decyzja jest dyskretna),  
  - `commandLatency` (FM→robot/gateway),  
  - `telemetryTimeout` (najgorsza dopuszczalna „wiekowość” telemetrii użytej do decyzji — jeśli jest starsza, i tak fail‑closed).  
  **[MVP] MUST:** wiek telemetrii jest mierzony i logowany; do obliczeń stop distance używamy konserwatywnie `telemetryTimeout`.

#### 11.8.2 Składnik „standoff‑limited” (follow distance) — rozwiązanie `stopStandoff`

`stopStandoff` jest **polityką ruchu**: nawet jeśli 2D obwiednie by się nie zderzyły, robot nie powinien dojechać „na zderzak”.

W MVP egzekwujemy `stopStandoff` jako dodatkowe ograniczenie stop‑linii wzdłuż tej samej osi ruchu:

- **tylko** dla par robotów w tym samym `corridorId` i tym samym kierunku `dir`,
- z użyciem `leadExt/trailExt` zależnych od `movestyle` (patrz rozdz. 6.2),
- z uwzględnieniem drogi hamowania `d_stop(v)` (żeby stop‑linia była fizycznie wykonalna).

##### 11.8.2.1 Wybór lidera (deterministycznie)

Dla robota `R` wybieramy lidera `L`:

- `L != R`
- `corridorId(L) == corridorId(R)` i `corridorDir(L) == corridorDir(R)`
- `routeS(L) > routeS(R)` (lider jest „przed nami” wzdłuż tej samej osi)
- `state(L)` jest zdrowy: telemetria świeża, `offRoute=false`, `poseJump=false`, `confidence ≥ minConfidence`

Wybór: najmniejszy `routeS(L)` spośród spełniających warunki (najbliższy lider).  
Tie‑break deterministyczny: `robotId`.

Jeśli lidera nie ma → `hold_standoff = +∞`.

##### 11.8.2.2 Granica standoff (geometria wzdłuż trasy)

Najpierw liczymy „twardą” granicę postępu pivota `R`, przy której obwiednia `R` (w kierunku ruchu) byłaby dokładnie `stopStandoff` za obwiednią lidera (w kierunku trail):

\[
standoffBoundary = leaderRouteS - trailExt(leader) - leadExt(follower) - stopStandoff
\]

- `trailExt(leader)` i `leadExt(follower)` są liczone wg rozdz. 6.2 (zawierają safety + `poseMargin` + `trackingMargin`, oraz zależą od `movestyle` — forward/reverse).
- `stopStandoff` jest liczone **wzdłuż trasy** (1D po `routeS`/`corridorS`), ale jest niezależne od 2D kolizji (kolizje rozwiązuje `conflictSet`).

##### 11.8.2.3 Stop‑linia wykonalna dynamicznie (hamowanie)

Tak jak w 11.8.1, stop‑linia musi uwzględniać drogę hamowania:

\[
hold\_{standoff} = standoffBoundary - d\_{stop}(v\_{ref}) - holdSafetyBuffer
\]

gdzie:
- `v_ref` to konserwatywnie `max(v_current, v_commandedMax)`.

##### 11.8.2.4 Fail‑closed

**[MVP] MUST:** jeśli potencjalny lider ma stan `UNKNOWN/STALE/OFF_ROUTE/POSE_JUMP`, traktujemy go jak przeszkodę:
- używamy jego ostatniego „zamrożonego” `routeS` (jeśli dostępne) i liczymy `hold_standoff` konserwatywnie, **albo**
- jeśli nie umiemy sensownie policzyć relacji (brak spójnej projekcji) → wymuszamy `TRAFFIC_HOLD`/`SAFETY_STOP` (fail‑closed).

**[MVP] MUST:** `hold_standoff` podlega tym samym mechanizmom anty‑oscylacyjnym co `hold_lock` (histereza z 11.8.4).


#### 11.8.3 Składnik „node‑limited” (stop w węźle)

Jeśli na trasie przed `grantEndRouteS` istnieje punkt, w którym robot **musi** się zatrzymać w węźle (task, zmiana `movestyle`, konflikt) i ta strefa węzła nie jest zarezerwowana, to:

- `hold_node` musi wypaść **przed wejściem** w `NODE_STOP_ZONE` tego węzła (tak, aby robot zdążył wyhamować).

#### 11.8.4 Agregacja + anti‑oscillation

\[
holdPointRouteS = \min(hold\_{lock},\ hold\_{standoff},\ hold\_{node})
\]

Stabilizacja:

- **Histereza:** jeśli zmiana `holdPointRouteS` jest mniejsza niż `holdHysteresis` i nie wynika z pogorszenia bezpieczeństwa → nie aktualizujemy,  
- **Brak „pompowania”:** nie wolno zwiększać `holdPointRouteS` szybciej niż robot realnie może wykorzystać (patrz rozdz. 11.10 i limity jitter).

**[MVP] MUST:** `holdPointRouteS` oraz wszystkie składniki (`hold_lock`, `hold_standoff`, `hold_node`) są logowane w tick snapshot.

### 11.9 Reason codes (MVP)

LockManager i RTP Controller muszą raportować powód ograniczenia ruchu:

Przykładowe kody:

- `WAIT_CONFLICT_CELL`
- `WAIT_CORRIDOR_DIR`
- `WAIT_CRITICAL_SECTION`
- `WAIT_NODE_STOP_ZONE`
- `STOP_STALE_TELEMETRY`
- `STOP_POSE_JUMP`
- `STOP_OFF_ROUTE`
- `STOP_ROBOT_FAULT`
- `IDLE_NO_TASK`
- `GOING_TO_PARK`

**[MVP] MUST:** każdy robot ma aktualny `reasonCode` i `reasonDetails` (debug).

### 11.10 Anti‑oscillation (wymaganie krytyczne)

Oscylacja = „migotanie” decyzji i komend, które w realnym świecie zamienia się w szarpanie, mikrozatrzymania i chaos w debugowaniu.

W tym systemie wyróżniamy 4 klasy oscylacji:

1) `GO↔HOLD` (planowy stop) „na przemian”  
2) jitter `holdPointRouteS` (stop‑linia skacze przód/tył)  
3) flip `CORRIDOR_DIR` (korytarz zmienia kierunek zbyt często)  
4) jitter RTP target (robot dostaje target raz bliżej, raz dalej)

#### Metryki (MVP)

**[MVP] MUST:** logujemy (per robot + global):

- `toggleCountGOHOLD(window)` — liczba przełączeń GO↔HOLD w oknie,  
- `holdJitter(window)` — `max |ΔholdPointRouteS|` w oknie,  
- `dirFlipCount(corridorId, window)` — liczba zmian kierunku tokenu,  
- `rtpAdvanceJitter(window)` — `max(ΔtargetRouteS positive)` w oknie,  
- `rtpRetreatJitter(window)` — `max(|ΔtargetRouteS negative|)` w oknie.

#### DoD (przykład; do strojenia)

- `toggleCountGOHOLD(10s) ≤ 2` w golden scenariuszach,  
- `holdJitter(10s) ≤ 0.5m`,  
- `dirFlipCount(60s) ≤ 1` dla typowych sytuacji,  
- `rtpRetreatJitter(10s) ≤ 0.5m` (target nie „cofa się” agresywnie bez powodu).

#### Mechanizmy

**[MVP] MUST:** stosujemy naraz:

1) `holdHysteresis` — nie aktualizujemy stop‑linii przy drobnych zmianach.  
2) `edgeDirHold` — minimalny czas utrzymania kierunku po opróżnieniu korytarza.  
3) „Sticky winner” w konflikcie (kolejka priorytetów) — przegrani przycinają horyzont i **nie próbują co tick** zabrać zasobu temu samemu zwycięzcy.  
4) RTP hysteresis:
   - `maxTargetAdvancePerTick` (np. ≤ `rtpLookahead/2`)  
   - `maxTargetRetreatPerTick` (małe; cofanie targetu tylko gdy bezpieczeństwo spada)  
   - `minHoldChangeToUpdateTarget` (aktualizujemy target dopiero gdy holdPoint zmieni się „istotnie”).

5) Brak „wyrywania” robota z zasobu: jeśli robot posiada prefix komórek, staramy się nie robić replanów, które wymuszają natychmiastowe zmiany kierunku w tym samym korytarzu (chyba że fail‑closed).

### 11.11 Deadlocki — definicje i wymagania liveness

Rozróżniamy:

- deadlock lock‑level (circular wait),  
- deadlock physical‑level (head‑on w single lane, gridlock w CS).

**[MVP] MUST:** L1/L3 eliminują podstawowe przypadki. Dla reszty:
- jeśli robot stoi bez postępu > `stuckTimeout`, przechodzi w STUCK i eskaluje (operator / avoidance / manual).

---

## 12. Sterowanie ruchem: Rolling Target Point (RTP) [MVP]

### 12.1 Definicja

W MVP robot jest sterowany przez „rolling target” **po trasie**, ale kontrakt targetu jest dyskretny:

- target to **referencja do elementu mapy**: `LocationMark` lub `ActionPoint` (ID węzła z grafu),  
- dodatkowo utrzymujemy `targetRouteS` jako pozycję targetu wzdłuż trasy (do logów i metryk).

Algorytm w każdej iteracji (co tick albo z częstotliwością `rtpRate`) wyznacza:

1) `desiredRouteS = min(routeS + rtpLookahead, holdPointRouteS)`  
2) `targetRef` = **najdalszy** `LocationMark`/`ActionPoint` na aktualnej trasie, którego `routeS(target) ≤ desiredRouteS`  
3) `stopLineRouteS = holdPointRouteS` (kontrakt: nie wolno przekroczyć)

**[MVP] MUST:** `targetRouteS ≤ holdPointRouteS`.

**Uwaga praktyczna (gęstość marków):**  
Jeśli na odcinku trasy brakuje `LocationMark`/`ActionPoint` dostatecznie blisko `holdPointRouteS`, Fleet Manager i tak **MUST** umieć bezpiecznie zatrzymać robota.  
W MVP robimy to przez przełączanie `mode` (GO→HOLD/STOP) z wyprzedzeniem wynikającym z `d_stop(v)`.

RobotGateway w MVP jest warstwą **fail‑safe**:
- wykonuje komendy `GO/HOLD/STOP` (gotarget / pause / stop),
- wymusza `SAFETY_STOP` jeśli nie dostaje świeżych komend (`rtpTimeout`) lub jeśli telemetria jest `STALE/UNKNOWN`,
- **MAY** implementować dodatkową kontrolę „nie przekraczaj `stopLineRouteS`”, ale to jest *dodatkowa ochrona*, nie jedyny mechanizm bezpieczeństwa.

### 12.2 Protokół (minimalny)

Minimalny kontrakt FM → RobotGateway (a dalej RoboCore/Robokit) to `RollingTargetCommand`:

- `routeId` (referencja),  
- `targetRef` (ID `LocationMark` lub `ActionPoint`),  
- `targetRouteS` (debug/metryki),  
- `stopLineRouteS = holdPointRouteS` (twardy limit postępu),  
- `seq` (monotoniczny numer komendy do idempotency i acka).

Robot/Gateway odsyła status z:

- aktualnym `pose`, `speed`,  
- `edgeProgress` i `routeProgress`,  
- `lastAckSeq` (transportowe potwierdzenie ostatniej komendy).

**[MVP] MUST:** watchdog (fail‑closed)

- jeśli robot/gateway nie dostaje nowych komend przez `rtpTimeout`, robot przechodzi w STOP (po stronie robota lub gateway).  
  `rtpTimeout` powinien być ≥ `2*tickPeriod + commandLatency` (konfig).

**[MVP] MUST:** rozdzielamy:
- `TRAFFIC_HOLD` — planowy stop wynikający z hold‑point (system „zdrowy”),  
- `SAFETY_STOP` — fail‑closed (stale/off‑route/poseJump/comm gap).

Szczegóły mapowania na ramki RoboCore/Robokit (go‑target/pause/resume/stop + fork) są opisane w pliku „kontrakty i akceptacja”.

### 12.3 Tryby stop

- `TRAFFIC_HOLD` — planowy stop wynikający z hold‑point (robot stoi, ale system jest „zdrowy”).  
- `SAFETY_STOP` — fail‑closed (stale/off‑route/pose jump).  

**[MVP] MUST:** system rozróżnia te tryby w UI i w logach.

---

## 13. Obsługa błędów i degradacja (bez TTL!) [MVP]

W MVP nie używamy „TTL, po którym locki same spadają”, bo to jest proszenie się o kolizję.  
Zamiast tego mamy fail‑closed: jeśli nie wiemy — traktujemy jak przeszkodę.

### 13.1 Klasy błędów (minimum)

- `STALE_TELEMETRY` — brak świeżej telemetrii > `telemetryTimeout`.  
- `OFFLINE` — robot provider rozłączony (brak kanału komend/telemetrii).  
- `POSE_JUMP` — skok pozycji > `poseJumpThreshold`.  
- `OFF_ROUTE` — `lateralError > maxLateralError` albo `confidence < minConfidence`.  
- `STUCK` — brak postępu > `stuckTimeout` mimo trybu GO.  

### 13.2 STALE / OFFLINE: robot jako przeszkoda (fail‑closed)

Jeśli robot jest `STALE_TELEMETRY` albo `OFFLINE`:

1) **MUST:** system traktuje robota jako przeszkodę:
   - `occupied(R)` zostaje ustawione na ostatni znany konserwatywny zestaw zasobów (komórki + ewentualnie `NODE_STOP_ZONE`),  
   - `granted(R)` zostaje „zamrożone” (nie zwalniamy),  
   - inni roboty nie mogą dostać nic, co konfliktuje z `occupied(R)`.

2) **MUST:** dla innych robotów hold‑pointy zostają przycięte tak, aby nie mogły zbliżyć się do zamrożonej przeszkody.

3) **MUST:** brak automatycznego „odmrażania” po czasie.  
   Powrót do normalności wymaga:
   - odzyskania telemetrii i stabilnej projekcji (`confidence` OK) **albo**
   - manualnej interwencji operatora (poza zakresem algorytmu).

*(Opcjonalnie FUTURE)*: „unknown inflation” — jeśli chcemy być jeszcze bardziej konserwatywni, możemy dodać do `occupied(R)` dodatkowe komórki „przed i za” o dystans `unknownExtraDistance`.

### 13.3 POSE_JUMP / OFF_ROUTE: protokół re‑sync

**Cel:** nie dopuścić, żeby inni wjechali w obszar, który robot mógł zająć po skoku lokalizacji.

Procedura MVP:

1) natychmiast `SAFETY_STOP` dla robota (gateway/robot),  
2) `occupied(R)` zostaje ustawione na **zamrożony** zestaw zasobów z ostatniego ticku,  
3) wyłączamy rozszerzanie grantu (`lookahead=0`) i nie wykonujemy replanów „na siłę”,
4) czekamy aż ProgressEstimator raportuje stabilny stan przez `relocalizeStableWindow`:
   - `offRoute=false`, `poseJump=false`, `confidence ≥ minConfidence`,
5) wyznaczamy nowy `startAnchor` (node lub edge+edgeS) i planujemy nową trasę,
6) dopiero po przyznaniu nowego, spójnego `granted(R)`:
   - aktualizujemy `occupied(R)` do nowego stanu,
   - przechodzimy z `SAFETY_STOP` do `TRAFFIC_HOLD`, a potem GO.

**[MVP] MUST:** w logach zapisujemy: moment skoku, stare i nowe `(edgeProgress, routeProgress)`, oraz wszystkie progi.

### 13.4 Robot STUCK

Jeśli robot jest w GO, ale `routeS` nie rośnie:

- oznacz `STUCK`,  
- przejdź w `TRAFFIC_HOLD` (albo `SAFETY_STOP`, jeśli telemetria niepewna),  
- wstrzymaj dalsze rezerwacje (żeby nie blokować mapy „na zapas”),  
- zgłoś `reasonCode=STOP_STUCK`,  
- eskaluj do operatora (manual lub avoidance).

---

## 14. Determinizm, logi i replay [MVP]

### 14.1 Deterministyczny tick

- jawne sortowania,  
- brak iteracji po nieuporządkowanych strukturach bez sortowania,  
- logowanie wszystkich danych wejściowych.

### 14.2 Snapshoty na dysk (wymaganie krytyczne)

**[MVP] MUST:** system zapisuje na dysk:

- `snapshot.jsonl` (każdy tick): wejścia + decyzje + wyjścia,  
- `state.bin/json` (co N ticków): pełny stan,  
- rotacja logów.

Minimalny zestaw pól w tick record:
- `tick`, `now`,  
- `compiledMapHash`, `paramsHash`,  
- `robotStates[]`,  
- `requests[]`, `grants[]`, `holdPoints[]`,  
- `reasonCodes[]`,  
- `commands[]`.

### 14.3 Replay i time‑warp (bez czekania)

**[MVP] MUST:** odtwarzanie logów:
- w czasie rzeczywistym i przyspieszonym,  
- z możliwością „seek” do ticku,  
- z porównaniem dwóch algorytmów (A/B) na tym samym logu (DEV).

---


---

## 15. Checklisty implementacyjne — Runtime (MVP)

### 15.1 LockManager / bezpieczeństwo

- [ ] `conflictSet` lookup O(1) i deterministyczny (sortowanie wejść/wyjść)
- [ ] `occupied ⊆ granted` utrzymane w każdym ticku (assert + test property-based)
- [ ] `NODE_STOP_ZONE` przy STOP_TURN i tylko wtedy
- [ ] single‑lane `CORRIDOR_DIR` token + `edgeDirHold` (brak flipów co tick)
- [ ] critical sections: „nie wjeżdżaj jeśli nie możesz wyjechać” (`exitClearance`)
- [ ] `holdPointRouteS = min(hold_lock, hold_standoff, hold_node)` + histereza
- [ ] `hold_standoff` liczy hamowanie: `- d_stop(v_ref) - holdSafetyBuffer`

### 15.2 RTP / sterowanie

- [ ] targetRef ∈ {LocationMark, ActionPoint}
- [ ] `mode` GO/HOLD/STOP działa (GO→gotarget, HOLD→pause, STOP→stop)
- [ ] watchdog `rtpTimeout` (fail‑closed) po stronie Gateway/robota
- [ ] anty‑oscylacje: metryki + limity jitter (`holdJitter`, `rtpRetreatJitter`, itd.)

### 15.3 Telemetria / degradacje

- [ ] `STALE_TELEMETRY` → freeze occupied+granted (fail‑closed)
- [ ] `POSE_JUMP/OFF_ROUTE` → SAFETY_STOP + re‑sync protokół (rozdz. 13.3)
- [ ] detekcja `STUCK` i eskalacja

### 15.4 Logi / replay

- [ ] snapshot.jsonl per tick (wejścia/wyjścia/hold składowe)
- [ ] replay bez sleep (time virtualization) + tryb accelerated
- [ ] A/B replay (porównanie dwóch wersji algorytmu)

---

## 16. Rzeczy usunięte / zdeprecjonowane (zachowane dla historii)

### 16.1 Model dyskowy Minkowskiego (v0.4) — usunięty jako MVP

W v0.4 sekcja 6.4.1 opisywała „robot ≈ dysk” i Minkowski sum (ścieżka ⊕ dysk).  
To podejście zostało zdeprecjonowane, bo jest zbyt konserwatywne i może uniemożliwiać mijanki w realnie wąskich korytarzach.

MVP v0.5 używa `sweptShape: multiRect` (Map Compiler), a runtime nie liczy geometrii.

### 16.2 `leadClear = leadExt + stopStandoff` (v0.4) — wycofane

W v0.4 `stopStandoff` było dodawane do geometrii „lead”.  
W v0.5 `stopStandoff` jest egzekwowane jako osobny składnik stop‑linii (`hold_standoff`), a nie jako inflacja 2D obwiedni.
