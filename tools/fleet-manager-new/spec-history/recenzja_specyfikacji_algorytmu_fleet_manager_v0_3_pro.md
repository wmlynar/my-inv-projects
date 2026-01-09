# Recenzja specyfikacji algorytmu Fleet Manager — v0.3

- Data: 2026-01-06  
- Recenzowany dokument: `specyfikacja_algorytmu_fleet_manager_v0_3.md`  
- SHA256 dokumentu: `d8c7f40af49133b63c15a76213fac8823420fe739b7d540d1a1aaf1a4451ad5c`  

---

## Prompt użyty do wygenerowania tej recenzji

```text
no dobrze, a teraz majac swoja specyfikacje algorytmu fleet managera 0.3

chcialbym zebys przygotowal kolejna recenzje tej specyfikacji:
- co jeszcze bys w niej poprawil
- co jeszcze bys tam dodal
- jakie bledy widzisz
- co bys ulepszyl
- jak bys zrobicl zeby byla jeszcze bardziej future proof
- jak bys zrobil, zeby byla lepszej jakosci
- jak bys zrobil zeby byla bardziej projesjponalna
- jak bys zrobil, zeby byla bardziej odporna na wszelkiego typu bledy
- jak bysmy zrobili, zeby jeszcze lepiej sie nadawala do pracy z AI

przedstaw propozycje na jakie plliki podzielic ta duza specyfikacje, zeby pracowac dalej z mniejszymi dokumentami

prosze przeslij swoja recenzje wedlug powyzszych punktow. i przeslij link do pliku .md do pobrania tej recenzji. zalacz tez prompt, ktory spowodowal wygenerowanie do tej recenzji
```

---

## 1) Co jeszcze bym poprawił

### 1.1 Poprawki „mechaniczne”, które podnoszą jakość bez ruszania treści merytorycznej

- **Naprawić odwołania do sekcji (cross‑references).** W v0.3 są miejsca, gdzie referencja prowadzi do złej sekcji (szczegóły w pkt 3 „Błędy”). To brzmi drobnie, ale w specyfikacji produkcyjnej jest to realny „source of truth” problem: czytelnik nie może ufać nawigacji.
- **Ujednolicić nazewnictwo parametrów bez jednostek w nazwie.** W wielu miejscach masz nazwy typu `tickMs`, `telemetryTimeout`, `tangentEpsRad`. To jest czytelne, ale kłóci się z Twoim własnym celem „jedne jednostki w całym systemie + jednostki w polach `units`/komentarzach”. Proponuję:
  - nazwy bez jednostek: `tickPeriod`, `telemetryTimeout`, `tangentEps`  
  - jednostka zawsze w tabeli one‑pager + w JSON5 komentarzu + w polu `units`.  
  Minimalizuje to „rozjazdy” przy refaktorach (np. przejście z ms na µs).
- **Doprecyzować, które elementy są normatywne, a które są przykładami.** Masz dużo świetnych przykładów JSON5; warto wprost oznaczyć: „to jest przykładowy payload; *normą* jest lista pól X/Y/Z + zasady walidacji”.

### 1.2 Poprawki merytoryczne (żeby implementator nie musiał zgadywać)

- **Jawnie opisać semantykę konfliktów i własności locków względem „tego samego robota”.**  
  W CompiledMap `conflictSet` zawiera self i może zawierać sąsiednie komórki (co jest normalne przy Minkowski sum / AABB). To wymaga dopisania twardej zasady:
  - *Konflikt blokuje tylko wtedy, gdy zasób jest zajęty przez innego robota.*  
  - Rezerwacje są „re‑entrant” per owner: robot może posiadać wiele komórek, nawet jeśli te komórki są wzajemnie w swoich `conflictSet`.  
  Bez tego łatwo zaimplementować LockManager, który nie jest w stanie przyznać robotowi prefiksu > 1 cell (bo kolejne cell’e konfliktują z poprzednimi).
- **Doprecyzować zwalnianie (release) zasobów CELL w trakcie jazdy.**  
  Aktualnie spec sugeruje „prefiks do przodu + opcjonalny lookback”, ale nie mówi jednoznacznie:
  - kiedy cell jest uznana za „zwolnioną” (np. gdy `progress.s` przekroczy `cell.s1` o bufor?),  
  - jak uwzględniasz `poseMargin`/`trackingMargin` przy zwalnianiu (żeby nie zwolnić za wcześnie),  
  - co robi `lookback` i dlaczego jest potrzebny.  
  To jest krytyczne dla stabilności (oscylacje) i przepustowości.
- **Uściślić, jak dokładnie realizujesz `stopStandoff` w MVP.**  
  W v0.3 jest zdefiniowany `stopStandoff` oraz `leadClear`, ale w dalszej części dokumentu **nie ma jednoznacznego miejsca**, gdzie `stopStandoff` wchodzi do:
  - geometrii konfliktów (Map Compiler), albo  
  - logiki hold‑point / policy (LockManager).  
  Na poziomie gwarancji (S2 + golden scenariusz „leader/follower”) to jest „must have”, więc trzeba dopisać *konkretny mechanizm*.
- **Rozdzielić „geometrię tranzycji w węźle” od „czy runtime zrobi stop w węźle”.**  
  W §7.6 pojawia się mieszanie „Map Compiler klasyfikuje PASS_THROUGH jeśli… i planner deklaruje brak stopu”. Map Compiler nie ma wglądu w taski (pick/drop), a runtime może wymusić stop z innych przyczyn (hold, fault, alignment).  
  Lepszy kontrakt:
  - `transitionGeom = TANGENT | NON_TANGENT` (czysta geometria)  
  - runtime wylicza `willStopAtNode = true/false` (task/gear/hold/itd.)  
  - jeśli `willStopAtNode` → wymagaj zasobu `NODE_TURN` (albo lepiej nazwany `NODE_STOP_ZONE`) niezależnie od tangencji.  
  To uszczelnia wymaganie „360° w węźle, jeśli robot w nim stoi”.

---

## 2) Co jeszcze bym dodał

### 2.1 Dodatki, które zwiększają implementowalność

- **Jednoznaczna definicja „ownership map” dla zasobów w LockSnapshot.**  
  Dodałbym wprost: `occupiedBy: { resourceId: robotId }` + zasady dla `buildOccupancy()` i `release()`.
- **Pseudokod Map Compiler (krok po kroku) + wymaganie deterministyczności.**  
  Masz opis „heurystyki” corridorów i konfliktów, ale implementator nadal musi wymyślić szczegóły. Dodałbym minimalne, deterministyczne pseudokody:
  - detekcja corridorów od „decision node” do „decision node”,  
  - dyskretyzacja edgeKey po arc‑length,  
  - oznaczanie `isTurnSegment`,  
  - budowa conflictSet przez spatial index (grid / R‑tree) i test geometrii,  
  - wyliczanie `transitionGeom` (tangencja) w węźle.
- **Rozdział „Stop w węźle” (normatywny).**  
  Jeden krótki rozdział z regułą MUST:
  - jeśli robot ma `speed≈0` i jego pivot jest w obszarze węzła (zdefiniowanym przez Map Compiler), to musi posiadać zasób `NODE_TURN`/`NODE_STOP_ZONE`.  
  Dzięki temu pick/drop, WAIT w węźle, re‑sync, itd. są spójne z „węzeł → 360°”.

### 2.2 Dodatki, które zwiększają bezpieczeństwo i odporność

- **Wyraźne progi dla „unknown pose”.**  
  Masz `poseJumpThreshold`, `maxLateralError`, `telemetryTimeout`. Dodałbym definicję „unknown” jako osobny stan z konkretnym kontraktem:  
  - kiedy ustawiasz `confidence=0`,  
  - co dokładnie wtedy robisz z lockami (zamrożenie + inflacja),  
  - jak długo (i co jest warunkiem „powrotu do normal”).
- **Sekcję „runtime assertions” (MUST w debug/DEV).**  
  Np. przy każdym ticku:
  - granty nie łamią conflictSet,  
  - holdPointS nie przekracza s_grant_end,  
  - corridor dir token nie jest w dwóch kierunkach jednocześnie.  
  To łapie bugi najszybciej.

### 2.3 Dodatki dla throughput i przyszłej ewolucji

- **Wariant „wąski korytarz z mijanką” jako first‑class koncept** (FUTURE).  
  Już masz `passingPlace=true` w heurystyce, ale warto opisać (Future): corridor single-lane z miejscem mijania to tak naprawdę 2‑stanowy automat i może wymagać dodatkowych zasobów/slotów.
- **Kompatybilność z wieloma typami robotów** (FUTURE).  
  Dodaj założenie MVP: *jedna klasa robota*, a w FUTURE: `robotProfileId` i CompiledMap per profil albo conflict sets parametryzowane.

---

## 3) Jakie błędy widzę (konkretne)

### 3.1 Błędy nawigacyjne w specyfikacji

W v0.3 są błędne odwołania „patrz §…”. Przykłady:

- `G‑NoDeadlock` odsyła do `§10`, a §10 dotyczy RoutePlanner/ProgressEstimator, nie deadlocków. Logicznie powinno odsyłać do części o lockach i liveness (`§11.11` + reguły single‑lane/CS).
- `G‑NoOscillation` odsyła do `§9.4`, a §9.4 to wybór robota do zadania; metryki oscylacji są w `§11.10`.
- `I‑Stop` odsyła do `§9`, a formuła hamowania i relacja z hold‑pointem jest w `§11.3` i `§11.8`.

To są proste do naprawy, ale zostawione psują wiarygodność dokumentu.

### 3.2 Niespójność: `stopStandoff` jest zdefiniowane, ale „nie domyka się” w algorytmie

- `stopStandoff` jest w one‑pager, w kontrakcie S2 i w golden scenariuszu, ale nie ma jednoznacznej specyfikacji:
  - czy Map Compiler uwzględnia je w `sweptPolygon`/`conflictSet`,  
  - czy LockManager wymusza je dodatkowym ograniczeniem hold‑point względem „leader occupancy”.
- Efekt: implementator może pominąć (przypadkiem) `stopStandoff` i nadal „spełnić” większość dokumentu — a to łamie Twoje pierwotne wymagania operacyjne.

### 3.3 Mieszanie odpowiedzialności: §7.6 (PASS_THROUGH) używa warunku zależnego od runtime

Fragment „planner deklaruje brak stopu” nie jest własnością mapy. W praktyce:
- Map Compiler powinien opisać *geometrię* (czy da się przejechać płynnie),  
- runtime powinien zdecydować, czy robot zatrzyma się (task/hold/gear/alignment).  
To do uporządkowania, bo inaczej powstaje „szczelina” interpretacyjna.

---

## 4) Co bym ulepszył (żeby implementacja była prostsza i mniej bugogenna)

- **Nazwy zasobów: `NODE_TURN` → `NODE_STOP_ZONE` (albo `NODE_OCCUPANCY`).**  
  W praktyce to jest „rezerwacja przestrzeni w węźle, żeby robot mógł stać i (ewentualnie) obracać się”, a nie tylko „obrót”. Zmiana nazwy usuwa nieporozumienie typu: „skoro nie obracam, to nie potrzebuję locka”.
- **Jedna, jawna funkcja „czy muszę rezerwować węzeł?”**  
  W spec:  
  - `mustReserveNode = willStopAtNode || transitionGeom==NON_TANGENT || isPickDropNode`  
  i dopiero to wpływa na `desiredResources`.
- **Konkretny rozdział o „release policy” komórek.**  
  Proponuję zdefiniować:
  - `releaseWhenS > cell.s1 + releaseMargin`, gdzie `releaseMargin >= poseMargin + trackingMargin`  
  - `occupiedWindow` na wypadek jitteru telemetrii.  
  To stabilizuje i ogranicza „migotanie” rezerwacji.
- **Stabilizacja TRAFFIC_HOLD jako „overlay”, nie stan główny (opcjonalnie).**  
  Obecny FSM jest czytelny, ale `TRAFFIC_HOLD` jako osobny stan może gubić „intencję” (`GOING_TO_PICK` vs `GOING_TO_DROP`).  
  Alternatywa: trzymać `intentState` + flagę `trafficHold=true`. Jeśli zostawiasz jak jest — dopisz wprost, że trzeba pamiętać `resumeState`.

---

## 5) Jak zrobić, żeby była jeszcze bardziej future‑proof

- **Wymusić warstwowość i plug‑in interfaces**:  
  - `TrafficManager` (DCL‑2D w MVP) ma interfejs, który pozwoli podmienić na:
    - time‑expanded reservations (rezerwacje w czasie),  
    - CBS / prioritized planning (MAPF),  
    - hybrydę z lokalnym avoidance.  
  W spec już są zalążki, ale warto dodać prostą tabelę „co jest stable API, co jest implementacją”.
- **Profile robotów / heterogeniczna flota (FUTURE).**  
  Dodaj:
  - `robotProfileId`,  
  - możliwość wielu CompiledMap w jednym runtime (np. mapy konfliktów per profil),  
  - albo kompilację „pod najgorszy przypadek” jako fallback.
- **Wersjonowanie protokołów i kompatybilność wsteczna.**  
  CompiledMap ma semver — super. Dodałbym macierz kompatybilności:
  - runtime vX wspiera compiledMapVersion: ≥a <b.  
- **Strategia „map updates”.**  
  Choćby Future: co jeśli mapę trzeba podmienić w trakcie pracy (rolling update)? Jak przebiega migracja locków?

---

## 6) Jak zrobić, żeby była lepszej jakości

- **Zamknąć pętle: każda rzecz, która jest w One‑pager (parametr / limit), musi mieć:
  1) miejsce użycia w algorytmie,  
  2) miejsce w testach (golden / unit),  
  3) miejsce w logach.**  
  W v0.3 większość ma, ale `stopStandoff` to przykład parametru, który nie ma „jednego, oczywistego” usage point.
- **Zredukować „mieszanie warstw”:**  
  Część rzeczy jest jednocześnie requirementem, implementacją i przykładem. Można to rozdzielić:
  - „Normatywne wymagania” (MUST/SHOULD),  
  - „Reference algorithm” (pseudokod),  
  - „Przykłady payloadów”.
- **Dodać formalne definicje w jednym miejscu** (np. w słowniku):  
  - co znaczy „brak kolizji w 2D” (w sensie obwiedni),  
  - co znaczy „hold‑point”,  
  - co znaczy „occupied”.

---

## 7) Jak zrobić, żeby była bardziej profesjonalna

- **Dodać sekcję „Status dokumentu”**: Draft / Implementable / Frozen for MVP; i co jest „closed decisions” vs „open issues”.  
- **Wprowadzić numerowane Requirement IDs konsekwentnie** (już masz S1.., L1.., D1..). Dodałbym jeszcze:
  - `P*` (performance soft),  
  - `O*` (observability).  
- **Dodać definicję „Definition of Done” per moduł** (MapCompiler, LockManager, RTP, Replay), nie tylko globalnie.

---

## 8) Jak zrobić, żeby była bardziej odporna na błędy

- **Fail‑closed musi być „mechaniczny” i testowalny.**  
  W spec jest idea, ale dopisz:
  - *jakie dokładnie komendy idą do robota w SAFETY_STOP* (np. `mode="STOP"` + `targetS=currentS` + speedLimit=0),  
  - *jak długo trzymamy zamrożone zasoby* i kiedy je zwalniamy po recovery.  
- **Zasady przy skokach czasu / jitterze** (telemetria i tick):  
  - co jeśli `now` się cofnie (błąd zegara),  
  - co jeśli tick przeskoczy o 5s (GC pause) — czy aging i timeouts nadal działają deterministycznie?
- **„Budget” i degradacja wydajności**:  
  Masz soft budget `tickBudgetSoft`. Dopisz reakcję:
  - jeśli przekroczono budżet: obniż lookahead, przejdź na prostsze konflikty, wyłącz debug polygony, itd.  
  To jest ważne w produkcji.
- **Wbudowane „safety invariants” jako runtime checks** (DEV i opcjonalnie PROD).  
  To jest jedna z najlepszych dźwigni przeciwko „dziwnym edge case’om”.

---

## 9) Jak zrobić, żeby jeszcze lepiej się nadawała do pracy z AI

- **Wyciągnąć „kontrakty” do osobnych, małych plików + konsekwentny JSON5.**  
  AI działa świetnie, gdy ma mały, domknięty kontekst i jednoznaczne struktury danych.
- **„Golden scenarios” jako realne fixture’y, nie tylko opis.**  
  W repo:
  - `scenario.yaml/json5` (mapa, roboty, taski, parametry),  
  - `expected.jsonl` (wybrane ticki i asercje),  
  - `replay.md` (opis).  
  Dzięki temu AI może generować testy, implementacje i poprawki w oparciu o fakty.
- **Wymusić styl „one requirement → one test”.**  
  To ułatwia zarówno ludziom, jak i modelom, mapowanie zmian.
- **Dodać sekcję „Reason Codes Dictionary”**:  
  enum + opis + jakie pola w `reasonDetails` są wymagane. To jest świetny materiał dla AI do diagnozy zachowań.

---

## 10) Propozycja podziału specyfikacji na mniejsze pliki

Poniżej podział tak, żeby:
- każdy plik był „zamkniętym tematem”,  
- łatwo było robić iteracje, review i pracę z AI,  
- a jednocześnie nic nie ginęło (zachowujesz jeden index).

### 10.1 Proponowana struktura repo

```text
spec/algorithm/
  00_index.md
  01_prompt_and_goals.md
  02_requirements_onepager.md
  03_assumptions_guarantees.md
  04_glossary_units_notation.md
  05_robot_model_geometry.md
  06_map_compiler.md
  07_compiled_map_contract.md
  08_tasks_and_fsm.md
  09_route_planner_progress_estimator.md
  10_traffic_manager_dcl2d.md
  11_rtp_control.md
  12_failures_recovery_failclosed.md
  13_determinism_logging_replay.md
  14_testing_golden_scenarios.md
  15_future_evolution.md
  99_removed_pitfalls.md

spec/algorithm/examples/
  robot_model.json5
  robot_state.json5
  compiled_map.json5
  corridor_request_grant.json5
  rolling_target_command.json5

spec/algorithm/scenarios/
  S01_head_on_single_lane/
    map.json5
    robots.json5
    tasks.json5
    expected_assertions.json5
  S02_leader_follower/
  ...
```

### 10.2 Co powinno być w każdym pliku

- `00_index.md` — spis treści, jak czytać, „co jest normą”.
- `01_prompt_and_goals.md` — tylko prompt + cel + non-goals.
- `02_requirements_onepager.md` — tabela „1 miejsce prawdy” + lista S/L/D/C + DoD.
- `03_assumptions_guarantees.md` — A‑* i G‑* (twardy kontrakt).
- `04_glossary_units_notation.md` — definicje, lead/trail, konwencje.
- `05_robot_model_geometry.md` — footprint, marginesy, stopStandoff (wraz z jednoznaczną implementacją!), node stop/turn.
- `06_map_compiler.md` — corridorId, cells, conflict sets, transitions, node slots, pseudokod.
- `07_compiled_map_contract.md` — schema JSON5 + zasady walidacji + versioning.
- `08_tasks_and_fsm.md` — task model, FSM (z doprecyzowaniem overlay TRAFFIC_HOLD), preemption parking.
- `09_route_planner_progress_estimator.md` — planner, snapping, progress.
- `10_traffic_manager_dcl2d.md` — LockManager, direction token, CS, hold‑point, fairness, anti‑oscillation.
- `11_rtp_control.md` — RTP protokół, watchdog, komendy GO/HOLD/STOP.
- `12_failures_recovery_failclosed.md` — stale/offline/jump/off-route/stuck, procedury recovery.
- `13_determinism_logging_replay.md` — snapshoty, replay/time‑warp, A/B.
- `14_testing_golden_scenarios.md` — piramida testów, fixtures, property‑based.
- `15_future_evolution.md` — roadmap techniczny i punkty rozszerzeń.
- `99_removed_pitfalls.md` — rzeczy usunięte + analiza prototypu (kontekst).

### 10.3 Dlaczego to działa (praktycznie)

- Każdy plik ma „małą powierzchnię” do review i dyskusji.
- AI może dostać pojedynczy plik + kilka fixture’ów i generować poprawki bez „zjadania” całej specyfikacji.
- Łatwo pilnować „single source of truth” (np. wymagania i parametry są w jednym miejscu).

---

## 11) Najważniejsze „quick wins” (top 8)

1) Naprawić odwołania do sekcji (§).  
2) Dopisać semantykę ownership/re‑entrancy konfliktów (ten sam robot).  
3) Dopisać release policy cell’i + sens `lookback`.  
4) Dopisać *konkretnie* jak enforced jest `stopStandoff`.  
5) Rozdzielić `transitionGeom` od `willStopAtNode` i dopiąć node lock dla „stopped in node”.  
6) Ujednolicić nazwy parametrów bez jednostek w nazwie.  
7) Dodać pseudokod Map Compiler.  
8) Wyciągnąć examples/scenarios do osobnych plików (AI + testy).
