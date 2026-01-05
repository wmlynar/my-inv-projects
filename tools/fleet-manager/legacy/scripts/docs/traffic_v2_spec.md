# Traffic V2 (time-window reservations) - spec

Cel: ograniczyc deadlocki i stop-and-go poprzez rezerwacje czasowe na krawedziach
i wezlach. Wersja V2 ma byc kompatybilna z obecnym ruchem (pulse-mapf), ale dodaje
harmonogramowanie slotow czasowych.

## W skrocie

- Robot planuje trase z ETA dla kazdego segmentu.
- Harmonogram rezerwuje okna czasowe na edge group + node.
- Locki krawedziowe/nodowe dalej dzialaja jako safety net.
- Kierunek w korytarzu dostaje okno czasowe (fairness).

## Definicje

- **Edge group**: para wezlow A<->B (ten sam korytarz w obie strony).
- **Reservation window**: przedzial czasu [start, end] dla edge group lub node.
- **Horyzont H**: ile ms do przodu rezerwujemy (rolling).

## Bezpieczenstwo obwiedni (envelope)

- Rezerwacje edge uwzgledniaja grupy konfliktow geometrycznych (polylines blisko siebie),
  prog bazuje na maksymalnej szerokosci/dlugosci robota.
- Rezerwacje node sa rozszerzone o buffer podejscia i zwolnienia (head/tail),
  zeby obwiednie nie nachodzily na skrzyzowaniach.
- Odstepy ruchu (stop/yield) liczone sa z promienia obwiedni, a nie stalego ROBOT_RADIUS.

## Dane i struktury

- `ReservationTable` (`fleet-traffic-core/src/traffic_reservations.js`):
  - `reserveEdge(edgeKey, robotId, startMs, endMs) -> { ok, holder }`
  - `reserveNode(nodeId, robotId, atMs, dwellMs) -> { ok, holder }`
  - `releaseRobot(robotId)` + `prune(nowMs)`
  - `getEdgeReservations(edgeKey)` / `getNodeReservations(nodeId)`

## Kontrakt strategii (TrafficStrategy)

Nowe metody:

- `useTimeReservations() -> boolean`
- `getReservationHorizonMs(robot)`
- `getReservationStepMs(robot)`
- `getReservationSafetyMs(robot)`
- `getReservationNodeDwellMs(robot)`
- `useTurnTimeReservations() -> boolean`
- `getScheduleSlackMs(robot)`
- `getScheduleSlackMinMs(robot)`
- `getScheduleSlackMaxMs(robot)`
- `getScheduleSlackEwmaAlpha(robot)`
- `getScheduleSlackPercentile(robot)`
- `getScheduleSlackSampleSize(robot)`
- `useAdaptiveScheduleSlack() -> boolean`
- `useScheduleRepair() -> boolean`
- `getPlannerWeight(robot)` (weighted A*, >1 = bounded-suboptimal)
- `useConflictSearch() -> boolean`
- `getConflictSearchDepth(robot)`
- `getConflictWaitThresholdMs(robot)`
- `getConflictCooldownMs(robot)`
- `useFullConflictSearch() -> boolean`
- `useGlobalConflictSearch() -> boolean`
- `getGlobalSolverType() -> string | null`
- `useYieldRecovery() -> boolean`
- `useRecoveryMoves() -> boolean`

Nowa strategia:

- `pulse-mapf-time` (alias `pulse-mapf-v2`)
  - wylacza sie przez `timeReservations: false`
  - domyslne parametry:
    - `reservationHorizonMs`: 8000
    - `reservationStepMs`: 200
    - `reservationSafetyMs`: 120
    - `reservationNodeDwellMs`: 300
- `sipp-kinodynamic`
  - uwzglednia czas obrotu robota w rezerwacjach (turn-time)
  - domyslne parametry: jak `sipp` + `turnTimeReservations: true`
- `sipp-robust`
  - rezerwacje z luzem czasowym + naprawa harmonogramu + recovery
  - domyslne parametry:
    - `scheduleSlackMs`: 120
    - `scheduleRepair`: true
    - `yieldRecovery`: false
    - `recoveryMoves`: false
  - `yieldRecovery` / `recoveryMoves` zostaja opt-in, bo w praktyce potrafia
    wprowadzic oscylacje; wlaczaj tylko gdy masz problemy z twardymi blokadami.
- `ecbs-sipp`
  - domyslne parametry:
    - `plannerWeight`: 1.2
    - `replanDistance`: 2.0
    - `replanIntervalMs`: 900
    - `reservationHorizonMs`: 12000
    - `reservationStepMs`: 250
    - `reservationSafetyMs`: 150
    - `reservationNodeDwellMs`: 400
- `cbs-sipp`
  - konfliktowe przeszukiwanie w oknie czasowym (CBS-lite) na bazie harmonogramu
  - domyslne parametry:
    - `plannerWeight`: 1.0
    - `conflictDepth`: 1
    - `conflictWaitThresholdMs`: 2200
    - `conflictCooldownMs`: 1200
    - `reservationHorizonMs`: 12000
    - `reservationStepMs`: 250
    - `reservationSafetyMs`: 150
    - `reservationNodeDwellMs`: 400
- `cbs-full`
  - pełne przeszukiwanie CBS (drzewo konfliktów) + SIPP
  - domyslne parametry:
    - `plannerWeight`: 1.0
    - `conflictDepth`: 4
    - `conflictWaitThresholdMs`: 1800
    - `conflictCooldownMs`: 1500
    - `reservationHorizonMs`: 12000
    - `reservationStepMs`: 250
    - `reservationSafetyMs`: 150
    - `reservationNodeDwellMs`: 400
- `mapf-global`
  - globalne MAPF w oknie czasowym (dyskretny czas), konfliktowe planowanie grupowe
  - domyslne parametry:
    - `plannerWeight`: 1.0
    - `conflictDepth`: 4
    - `conflictWaitThresholdMs`: 1600
    - `conflictCooldownMs`: 1800
    - `reservationHorizonMs`: 12000
    - `reservationStepMs`: 200
    - `reservationSafetyMs`: 150
    - `reservationNodeDwellMs`: 400
- `mapf-smt`
  - globalne MAPF z solverem CSP (time-expanded), silne unikanie deadlockow
  - domyslne parametry:
    - `plannerWeight`: 1.0
    - `conflictDepth`: 5
    - `conflictWaitThresholdMs`: 1400
    - `conflictCooldownMs`: 2000
    - `reservationHorizonMs`: 12000
    - `reservationStepMs`: 200
    - `reservationSafetyMs`: 150
    - `reservationNodeDwellMs`: 400
- `mapf-pibt`
  - globalne MAPF z solverem PIBT (priority inheritance)
  - domyslne parametry:
    - `plannerWeight`: 1.0
    - `conflictDepth`: 4
    - `conflictWaitThresholdMs`: 1600
    - `conflictCooldownMs`: 1800
    - `reservationHorizonMs`: 12000
    - `reservationStepMs`: 200
    - `reservationSafetyMs`: 150
    - `reservationNodeDwellMs`: 400
- `mapf-mstar`
  - globalne MAPF z solverem M* (dynamiczne laczenie konfliktow)
  - domyslne parametry:
    - `plannerWeight`: 1.0
    - `conflictDepth`: 5
    - `conflictWaitThresholdMs`: 1500
    - `conflictCooldownMs`: 1800
    - `reservationHorizonMs`: 12000
    - `reservationStepMs`: 200
    - `reservationSafetyMs`: 150
    - `reservationNodeDwellMs`: 400

## Profile rezerwacji (reservationProfile)

Profile to zestawy domyslnych parametrow dla strategii z time reservations.
Mozna je wlaczyc przez `reservationProfile` (albo `robustProfile`).
Jawne wartosci w configu zawsze nadpisuja profil.

- `conservative`:
  - `reservationHorizonMs`: 14000
  - `reservationStepMs`: 250
  - `reservationSafetyMs`: 180
  - `reservationNodeDwellMs`: 450
  - `scheduleSlackMs`: 220
  - `scheduleSlackMinMs`: 220
  - `scheduleSlackMaxMs`: 600
  - `scheduleRepair`: true
  - `turnTimeReservations`: true
- `balanced`:
  - `reservationHorizonMs`: 10000
  - `reservationStepMs`: 200
  - `reservationSafetyMs`: 120
  - `reservationNodeDwellMs`: 300
  - `scheduleSlackMs`: 120
  - `scheduleSlackMinMs`: 120
  - `scheduleSlackMaxMs`: 360
  - `scheduleRepair`: true
  - `turnTimeReservations`: true
- `aggressive`:
  - `reservationHorizonMs`: 6000
  - `reservationStepMs`: 150
  - `reservationSafetyMs`: 90
  - `reservationNodeDwellMs`: 220
  - `scheduleSlackMs`: 60
  - `scheduleSlackMinMs`: 60
  - `scheduleSlackMaxMs`: 220
  - `scheduleRepair`: true
  - `turnTimeReservations`: false

## Adaptive slack

Dynamiczny slack bazuje na opoznieniach runtime (EWMA + percentyl) i jest
clampowany przez `scheduleSlackMinMs`/`scheduleSlackMaxMs`. Wlaczenie:

- `adaptiveScheduleSlack: true` lub
- ustawienie `scheduleSlackMinMs`/`scheduleSlackMaxMs` w profilu/configu.

Parametry (opcjonalne):

- `scheduleSlackEwmaAlpha` (domyslnie 0.3)
- `scheduleSlackPercentile` (domyslnie 0.9)
- `scheduleSlackSampleSize` (domyslnie 20)

## Algorytm (high-level)

1. **Planowanie**: wyznacz trase + ETA dla segmentow (nawiazanie do
   aktualnego planera).
2. **Rezerwacje**:
   - na kazdy segment wyznacz okno czasowe [t0, t1]
   - sprawdz/rezervuj w `ReservationTable`
3. **Konflikt**:
   - jesli okno zajete, przesuń ETA i sprobuj ponownie (rolling)
4. **Wykonanie**:
   - runtime idzie wg ETA, edge-locki sa tylko zabezpieczeniem

## Fairness (korytarze)

- Dla edge group utrzymujemy okna w jednym kierunku do czasu
  `EDGE_DIRECTION_MAX_HOLD_MS`, ale tylko w ramach rezerwacji.
- Opposite kierunek dostaje slot najpozniej po max hold.

## Integracja z obstacle avoidance

- Avoidance moze opoznic wejscie w okno.
- Wtedy robot replanuje czasowo (nie zmieniajac trasy) albo zwalnia okno.
- Safety net: edge-lock + yield nadal chronia.

## E2E plan (kontrakt V2)

- `testReservationTableConflicts`: overlap na edge daje blokade.
- `testReservationTableRelease`: release robot usuwa wszystkie okna.
- `testTimeStrategyDefaults`: domyslne wartosci dla `pulse-mapf-time`.
- `testTimeStrategyOverrides`: nadpisanie opcji.
- `testEcbsSippDefaults`: domyslne wartosci dla `ecbs-sipp`.
- `testSippKinodynamicDefaults`: domyslne wartosci dla `sipp-kinodynamic`.
- `testSippRobustDefaults`: domyslne wartosci dla `sipp-robust`.
- `testCbsSippDefaults`: domyslne wartosci dla `cbs-sipp`.
- `testCbsFullDefaults`: domyslne wartosci dla `cbs-full`.
- `testMapfGlobalDefaults`: domyslne wartosci dla `mapf-global`.
- `testMapfPibtDefaults`: domyslne wartosci dla `mapf-pibt`.
- `testMapfMStarDefaults`: domyslne wartosci dla `mapf-mstar`.
- `testMapfSmtDefaults`: domyslne wartosci dla `mapf-smt`.
- `testReservationProfiles`: profile `conservative/balanced/aggressive`.
- `testRobustOverrides`: nadpisywanie profilu jawna konfiguracja.

Wszystkie testy sa w `/home/inovatica/seal/rds/fleet-traffic-core/tests/e2e-traffic-v2-contract.js`.
