# Specyfikacja algorytmu harmonogramowania i zarządzania ruchem dla Fleet Manager (v0.3)

**Data:** 2026-01-06  
**Status:** Draft implementowalny (MVP v1) + roadmap (future)  
**Zakres:** *task scheduling* + *traffic scheduling (Deterministic Corridor Locking 2D, DCL‑2D)* + *Rolling Target Point (RTP)* + kontrakty danych + testy/logi/replay.  
**Cel nadrzędny:** mieć algorytm, który **działa deterministycznie i bezpiecznie**, a jednocześnie ma interfejsy i punkty rozszerzeń tak, żeby kolejne wersje były łatwe do zrobienia.

---
> **Zestaw v0.3 (podział monolitu na 3 pliki):**
> - `specyfikacja-algorytm-kontrakty-i-akceptacja-v0_3.md`
> - `specyfikacja-algorytm-runtime-harmonogramowanie-ruch-v0_3.md`
> - `specyfikacja-algorytm-map-compiler-v0_3.md`
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

### 6.2 Efektywna bryła bezpieczeństwa (inflated footprint)

Definiujemy „inflated footprint” robota jako prostokąt w układzie robota (robot frame) z inflacją:

- `frontExt = head + safetyFront + poseMargin + trackingMargin`  
- `rearExt  = tail + safetyRear  + poseMargin + trackingMargin`  
- `sideExt  = width/2 + safetySide + poseMargin + trackingMargin`

Dla ruchu w konkretnym `movestyle` wyprowadzamy:

- `leadExt  = (movestyle == forward) ? frontExt : rearExt`  
- `trailExt = (movestyle == forward) ? rearExt  : frontExt`

Dla bezpieczeństwa w ruchu dodajemy również `stopStandoff` do kierunku lead (bo dotyczy zbliżania się „do przodu ruchu”):

- `leadClear = leadExt + stopStandoff`  
- `trailClear = trailExt`

To jest minimalny, prosty model operacyjny. Jeśli w praktyce `stopStandoff` ma być rozumiany inaczej (np. pivot‑pivot, a nie „przód do przeszkody”), to MUSI być zmienione w tej sekcji i w Map Compiler.

### 6.3 Kiedy węzeł wymaga rezerwacji obrotu 360° (kluczowe!)

Węzeł może być przejechany na dwa sposoby:

1) **PASS_THROUGH (płynny przejazd)**: robot przejeżdża przez węzeł bez zatrzymania, a geometrie wejścia i wyjścia są styczne (ciągłość kierunku).  
2) **STOP_TURN (stop + obrót)**: robot zatrzyma się w węźle i wykona obrót (lub manewr) zanim wjedzie na kolejną krawędź.

**[MVP] MUST:** Map Compiler musi klasyfikować każdą „tranzycję” w węźle (incomingEdgeKey → outgoingEdgeKey) jako PASS_THROUGH albo STOP_TURN (patrz §7.6).

- Jeśli tranzycja jest PASS_THROUGH, to bezpieczeństwo zapewnia swept corridor komórek na krzywej (bez rezerwacji „pełnego obrotu”).  
- Jeśli tranzycja jest STOP_TURN, to robot MUSI zarezerwować w węźle przestrzeń na obrót 360°.

#### 6.3.1 Promień obrotu (node turn footprint)

Dla STOP_TURN definiujemy promień obrotu:

\[
R_{turn} = \max(\sqrt{frontExt^2 + sideExt^2},\ \sqrt{rearExt^2 + sideExt^2})
\]

Interpretacja: pivot w punkcie (x,y) podczas dowolnego obrotu może zająć dowolny punkt w kole o promieniu `R_turn`.

**[MVP] MUST:** gdy robot ma stan „stopped in node” i tranzycja STOP_TURN, LockManager traktuje `NODE_TURN(nodeId)` jako zasób o zasięgu `R_turn` (konflikt 2D).

### 6.4 Swept corridor na krzywych (zakręty, zarzucanie tyłu, bliskie krawędzie)

Twoja kluczowa uwaga: **nie ma gwarancji**, że różne krawędzie są daleko od siebie; wózek na zakręcie „zarzuca” tyłem, więc 1D spacing po łuku nie wystarczy.

#### 6.4.1 MVP: bezpieczny model dyskowy (prosty i odporny)

MVP v1 używa modelu:

- robot ≈ dysk o promieniu `R_move`, gdzie:

  - `R_move = R_turn + turningExtraMargin` (na zakrętach),  
  - `R_move = R_turn` (na prostych).

- obwiednia zajętości na fragmencie trasy = Minkowski sum: (ścieżka pivota) ⊕ (dysk `R_move`).

To jest konserwatywne, ale gwarantuje bezpieczeństwo 2D nawet gdy krawędzie biegną blisko siebie i/lub krzyżują się.

#### 6.4.2 FUTURE: dokładniejszy model prostokątny (większa przepustowość)

[FUTURE] Map Compiler może zamiast dysku wyznaczać swept volume oriented rectangle:
- próbkowanie po `s` (np. co `cellLen/2`),
- w każdym próbkowaniu: rectangle w orientacji yaw trajektorii,
- union / polygon offset.

Kontrakty w runtime pozostają takie same (cells + conflict sets), zmienia się tylko geometria konfliktów.

### 6.5 Inwarianty bezpieczeństwa (MUST)

System MUSI spełniać w każdej chwili:

- **I‑Safe‑Cells:** żaden robot nie może fizycznie wejść w obszar, który nie jest częścią jego przyznanego korytarza (cells) lub jego `NODE_TURN` (jeśli STOP_TURN).  
- **I‑Safe‑2D:** dla dowolnych dwóch robotów obwiednie (inflated) na ich przyznanych zasobach nie mogą się przecinać (według konfliktów z CompiledMap).  
- **I‑Stop:** hold‑point jest zawsze policzony tak, aby hamowanie z aktualnej prędkości nie przekroczyło granicy korytarza (patrz §9).  
- **I‑Turn:** jeśli robot ma STOP_TURN w węźle, to `NODE_TURN(nodeId)` jest przyznany i nie konfliktuje z innymi.  
- **I‑FailClosed:** stale/offline/pose jump/off‑route → system przechodzi w tryb konserwatywny (STOP + blokada zasobów).

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

ProgressEstimator dostarcza:

- `edgeKey`, `s`, `lateralError`, `headingError`, `confidence`.  
- wykrywa: `poseJump`, `offRoute`.

**[MVP] MUST:** jeśli `confidence` spada poniżej progu albo `offRoute=true`, system przechodzi do `SAFETY_STOP`.

---

## 11. Zarządzanie ruchem: Deterministic Corridor Locking 2D (DCL‑2D) [MVP]

### 11.1 Intuicja

Każdy robot rezerwuje prefiks trasy (komórki) do przodu (horyzont rezerwacji). Konflikty 2D są rozstrzygane deterministycznie:

- jeden robot dostaje prefiks,  
- inne przycinają prefiksy tak, aby nie wchodzić w zarezerwowane obszary,  
- jeśli brak pracy → parking, ale parking jest preemptable.

### 11.2 Semantyka „corridor” i częściowej rezerwacji

`CorridorRequest` zawiera listę komórek od bieżącej pozycji `s` do `lockLookahead`, plus opcjonalny lookback.

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

Typy zasobów:

- `CELL(cellId)` — podstawowy zasób przestrzenny (2D).  
- `NODE_TURN(nodeId)` — wymagany tylko dla STOP_TURN.  
- `CORRIDOR_DIR(corridorId)` — token kierunku dla single‑lane.  
- `CRITICAL_SECTION(csId)` — token capacity=1 (MVP) dla skrzyżowań/zwężeń.

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

Dla każdego `corridor.singleLane=true`:

- istnieje token `CORRIDOR_DIR(corridorId)` o stanie:
  - `dir = NONE | A_TO_B | B_TO_A` (konkretny kierunek wynikający z edgeKeys),  
  - `holders = set(robotId)` (roboty, które mają jakiekolwiek cells w tym corridor),  
  - `emptySinceMs` (czas, od kiedy corridor jest pusty).

Reguły:

1) Jeśli corridor ma holderów, `dir` jest ustalony i nie zmienia się.  
2) Jeśli corridor jest pusty:
   - `dir` może zostać ustawiony przez pierwszego robota, który dostanie komórkę w corridor, ale  
   - zmiana `dir` jest stabilizowana przez `edgeDirHold` (histereza): po opróżnieniu czekamy co najmniej `edgeDirHold` zanim pozwolimy na zmianę.

3) Jeśli czekają roboty z obu stron, wybór strony jest deterministyczny i fair:
   - wybierz stronę z najstarszym `firstBlockedAtMs`,  
   - tie‑break: robotId.

**[MVP] MUST:** brak scenariusza, w którym dwa roboty jednocześnie dostają komórki w przeciwnych kierunkach w tym samym corridor.

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

**Definicja:** `holdPointS` to **maksymalna dozwolona pozycja pivota** na trasie (w metrach postępu), taka że robot może zahamować i jego obwiednia nie naruszy zasobów nieprzyznanych.

Wyznaczanie:

1) Weź ostatnią przyznaną komórkę na trasie (dla robota) → `s_grant_end`.  
2) Odejmij bufor bezpieczeństwa:

\[
s\_{hold} = s\_{grant\_end} - d\_stop(v\_{current}) - holdSafetyBuffer
\]

gdzie:
- `holdSafetyBuffer` [m] minimalnie = `stopExtra` + `holdHysteresis` (stabilizacja),  
- na zakrętach można dodać `turningExtraMargin` wprost.

3) Histereza anti‑oscillation:
- `s_hold` nie może „skakać” do przodu o mniej niż `holdHysteresis`,  
- `s_hold` nie może cofać się, chyba że wykryto zwiększenie niepewności (stale/offline/poseJump).

**[MVP] MUST:** hold‑point jest stabilny (patrz §11.10 metryki oscylacji).

### 11.9 Reason codes (MVP)

LockManager i RTP Controller muszą raportować powód ograniczenia ruchu:

Przykładowe kody:

- `WAIT_CONFLICT_CELL`
- `WAIT_CORRIDOR_DIR`
- `WAIT_CRITICAL_SECTION`
- `WAIT_NODE_TURN`
- `STOP_STALE_TELEMETRY`
- `STOP_POSE_JUMP`
- `STOP_OFF_ROUTE`
- `STOP_ROBOT_FAULT`
- `IDLE_NO_TASK`
- `GOING_TO_PARK`

**[MVP] MUST:** każdy robot ma aktualny `reasonCode` i `reasonDetails` (debug).

### 11.10 Anti‑oscillation (wymaganie krytyczne)

Oscylacja = „migotanie” hold/go albo szybkie zmiany direction token.

**[MVP] MUST:** system ma mechanizmy i metryki:

Metryki (do testów i logów):
- `toggleCountGOHOLD(windowMs)` — liczba przełączeń GO↔HOLD w oknie,  
- `holdJitter(windowMs)` — max |ΔholdPointS| w oknie,  
- `dirFlipCount(corridorId, windowMs)` — liczba zmian kierunku.

DoD (przykład):
- `toggleCountGOHOLD(10s) ≤ 2` w golden scenariuszach,  
- `holdJitter(10s) ≤ 0.5m`,  
- `dirFlipCount(60s) ≤ 1` dla typowych sytuacji.

Mechanizmy:
- `holdHysteresis`,  
- `edgeDirHold`,  
- nieprzerywanie robotów „w środku” zasobu,  
- deterministyczny priority+aging.

### 11.11 Deadlocki — definicje i wymagania liveness

Rozróżniamy:

- deadlock lock‑level (circular wait),  
- deadlock physical‑level (head‑on w single lane, gridlock w CS).

**[MVP] MUST:** L1/L3 eliminują podstawowe przypadki. Dla reszty:
- jeśli robot stoi bez postępu > `stuckTimeout`, przechodzi w STUCK i eskaluje (operator / avoidance / manual).

---

## 12. Sterowanie ruchem: Rolling Target Point (RTP) [MVP]

### 12.1 Definicja

Robot dostaje co tick (lub z częstotliwością `rtpHz`) punkt docelowy:

- punkt jest wzdłuż zaplanowanej trasy globalnej, w odległości `rtpLookahead` od aktualnego `s`,  
- punkt nie może wykraczać poza `holdPointS`.

**[MVP] MUST:** RTP jest ograniczony przez locki: `rtpS ≤ holdPointS`.

### 12.2 Protokół (minimalny)

- FM wysyła `RollingTargetCommand` z:
  - `routeId` (referencja),  
  - `targetS`,  
  - opcjonalnie `targetPose` (wyliczony z geometrii).  
- Robot odsyła status z:
  - aktualnym `pose`, `speed`, `routeProgressS`,  
  - `ackSeq` (transportowe potwierdzenie ostatniej komendy).

**[MVP] MUST:** watchdog:
- jeśli robot nie dostaje nowych komend przez `rtpTimeout` (np. 2×tickMs lub konfig), robot przechodzi w STOP (po stronie robota lub gateway).

### 12.3 Tryby stop

- `TRAFFIC_HOLD` — planowy stop wynikający z hold‑point (robot stoi, ale system jest „zdrowy”).  
- `SAFETY_STOP` — fail‑closed (stale/off‑route/pose jump).  

**[MVP] MUST:** system rozróżnia te tryby w UI i w logach.

---

## 13. Obsługa błędów i degradacja (bez TTL!) [MVP]

### 13.1 Klasy błędów (minimum)

- `STALE_TELEMETRY` — brak świeżej telemetrii > telemetryTimeout.  
- `OFFLINE` — robot provider rozłączony.  
- `POSE_JUMP` — skok pozycji > poseJumpThreshold.  
- `OFF_ROUTE` — lateralError > maxLateralError.  
- `STUCK` — brak postępu > stuckTimeout mimo GO.  

### 13.2 Protokół re‑sync po POSE_JUMP / OFF_ROUTE

**[MVP] MUST:** deterministyczna procedura:

1) natychmiast `SAFETY_STOP` (hold/stop),  
2) zamrożenie bieżących locków robota jako „occupied” (żeby inni nie wjechali),  
3) `snap` pozycji do najbliższego legalnego punktu na grafie (albo oznaczenie `unknown`),  
4) replan trasy od snapped start,  
5) dopiero wtedy ponowna budowa corridor request.

### 13.3 Stale telemetry / przerwa w komunikacji

- robot w stale traktowany jako „większa przeszkoda”:
  - inflacja `staleTelemetryMargin` (może być = d_stop(vMax)),  
  - brak rozszerzania corridoru,  
  - inne roboty nie dostają konfliktujących zasobów.

### 13.4 Robot stuck

Jeśli robot jest w GO, ale progress nie rośnie:

- oznacz `STUCK`,  
- wstrzymaj dalsze rezerwacje,  
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
