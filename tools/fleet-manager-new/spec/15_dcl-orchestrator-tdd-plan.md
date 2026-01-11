# DCL Orchestrator - Plan implementacji TDD (v0.1)

## 1. Cel i zakres
Cel: wdrozyc DCL-2D orchestrator (route-aware + lock-aware) metoda TDD, z maksymalnym reuse
obecnego kodu `apps/fleet-core/orchestrator/*`.

Zakres obejmuje:
- DCL-2D zasoby i locki bez okien czasowych,
- routeS/edgeS + projekcja postepu,
- hold-point + RTP (rolling target) z ograniczeniem bezpieczenstwa,
- integracja safety/control,
- logging + replay,
- testy unit/integration/e2e + golden scenarios.

Poza zakresem:
- lokalne obstacle avoidance,
- pelny planner MAPF,
- optymalizacja wydajnosci (poza oczywistym O(R*K)).

## 2. Zalozenia i reuse kodu
Reuse:
- `apps/fleet-core/orchestrator/graph.js` (graf + routing),
- `apps/fleet-core/orchestrator/model.js` (walidacje) - rozbudowac,
- `apps/fleet-core/orchestrator/adapter.js` (mapowanie komend) - rozbudowac,
- `apps/fleet-core/orchestrator/core.js` (tick pipeline) - przebudowac.

Nowe moduly (proponowane):
- `route_plan.js` (RoutePlan + mapowanie edgeS -> routeS),
- `progress.js` (ProgressEstimator: projekcja pose -> edgeS/routeS, off-route, pose-jump),
- `corridor_requests.js` (CorridorRequest builder z lookahead/lookback),
- `lock_manager_dcl.js` (DCL-2D grants, conflictSet, dir token, CS gating),
- `hold_point.js` (holdPointRouteS = min(hold_lock, hold_standoff, hold_node)),
- `rtp_controller.js` (RollingTargetCommand z ograniczeniem hold-point),
- `log_sink.js` + `replay_runner.js`.

## 3. Test harness i fixtures (Phase 0)
### 3.1 Harness
- deterministyczny zegar (nowMs) + helpery do snapshotow JSONL,
- helpery do stubow (telemetria, roboty, taski, locki).

### 3.2 Fixtures
- mini mapa testowa (3-6 wezlow), single-lane corridor + critical section,
- prekomputowane `cells` + `conflictSet`,
- osobny plik fixtures (np. `apps/fleet-core/tests/fixtures/dcl_map.json`).

### 3.3 Testy kontraktow
- walidacja wejscia/wyjscia (required fields, wersjonowanie),
- wyjatki dla brakujacych pol (invalid task/robot/map).

## 4. Plan TDD - kroki i testy

### Phase 1: Graph + RoutePlan (unit)
Testy:
- `buildGraph` respektuje kierunki krawedzi i corridorId,
- `planRoute` daje shortest path, brak trasy -> null,
- `RoutePlan` mapuje edgeS -> routeS i zwraca poprawne `routeId`.

Implementacja:
- rozszerzyc `graph.js` o dane wspierajace routeS,
- dodac `route_plan.js` + minimalne helpery.

### Phase 2: ProgressEstimator (unit)
Testy:
- projekcja pose -> edgeS/routeS (poprawny edgeKey i s),
- `offRoute` przy zbyt duzym odchyleniu,
- `poseJump` przy skoku pozycji,
- stale telemetry -> freeze + reasonCode.

Implementacja:
- nowy `progress.js` z parametrami `telemetryTimeout`, `offRouteThreshold`.

### Phase 3: CorridorRequest builder (unit)
Testy:
- prefiks komorek dla `lockLookahead/lookback`,
- dodanie `NODE_STOP_ZONE` przy stop w wezle,
- `CORRIDOR_DIR` przy wejsciu do single-lane,
- brak wyjscia poza trase.

Implementacja:
- `corridor_requests.js` + mapowanie `routeS` -> cells z compiledMap.

### Phase 4: LockManager DCL-2D (unit)
Testy:
- deterministyczny order + tie-break,
- konflikt CELL -> przyciecie prefiksu,
- single-lane token `CORRIDOR_DIR` blokuje przeciwny kierunek,
- `CRITICAL_SECTION` bez exitClearance -> hold,
- invariant: `occupied ⊆ granted` (fail-closed).

Implementacja:
- `lock_manager_dcl.js` (czysta funkcja tick),
- refactor `locks.js` -> wrapper lub replace.

### Phase 5: Hold-point + RTP (unit)
Testy:
- `holdPointRouteS` = min(hold_lock, hold_standoff, hold_node),
- `targetRouteS <= holdPointRouteS`,
- histereza (hold jitter) + rate limit targetu.

Implementacja:
- `hold_point.js` + `rtp_controller.js`,
- rozbudowa `adapter.js` o RollingTargetCommand.

### Phase 6: Orchestrator tick (integration)
Testy:
- 1 robot, 1 task: assigned -> running -> completed,
- 2 roboty, single-lane head-on: jeden HOLD, drugi GO,
- critical section bez wyjazdu -> HOLD,
- off-route/pose-jump -> HOLD/STOP bez nowych komend.

Implementacja:
- przebudowa `core.js` do pipeline:
  input -> route plan -> progress -> requests -> lock grants -> holdPoint -> commands.

### Phase 7: E2E + golden scenarios
Testy:
- scenario: single-lane head-on,
- scenario: critical section + exit clearance,
- scenario: off-route recovery + replan.

Wymagania:
- JSONL snapshot per tick,
- golden logs w `apps/fleet-core/tests/golden/*`.

### Phase 8: Replay (smoke)
Testy:
- replay z golden logu -> identyczne decyzje (grants/holds/commands),
- porownanie hashy snapshotow.

## 5. Definicja "done"
- Wszystkie testy unit/integration/e2e przechodza deterministycznie,
- logi JSONL + replay sa stabilne,
- invariants: `occupied ⊆ granted`, brak konfliktow conflictSet, brak dir flip thrash.

## 6. Minimalny zestaw logow (AI-friendly)
- tick snapshot: robots/tasks/requests/grants/holdPoint/reasonCodes,
- metrics: GO<->HOLD flapping, holdPoint jitter, dir flips,
- stderr tylko na bledy runtime.

