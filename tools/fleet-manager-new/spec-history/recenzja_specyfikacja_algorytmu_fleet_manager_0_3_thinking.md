# Recenzja specyfikacji algorytmu Fleet Manager — v0.3

**Recenzowany dokument:** „Specyfikacja algorytmu harmonogramowania i zarządzania ruchem dla Fleet Manager (v0.3)”  
**Data recenzji:** 2026-01-06  
**Zakres recenzji:** algorytm (task scheduling + DCL‑2D + RTP + kontrakty danych + testy/logi/replay)

---

## 1) Prompt (załączony)

```text
tu masz kolejna wersje specyfikacji algorytmu fleet manager

chcialbym zebys przygotowal recenzje tej specyfikacji:
- co bys w niej jeszcze poprawil
- jakie bledy widzisz
- co bys ulepszyl
- jak bys zrobicl zeby byla future proof
- jak bys zrobil, zeby byla lepszej jakosci
- jak bys zrobil zeby byla bardziej projesjponalna
- jak bys zrobil, zeby byla bardziej odporna na wszelkiego typu bledy
- jak bysmy zrobili, zeby lepiej sie nadawala do pracy z AI
dodatkowo moze warto napisac w tej specyfikacji, ze roboty beda sterowane takim rolling target point.

przedstaw propozycje na jakie plliki podzielic ta duza specyfikacje, zeby pracowac dalej z mniejszymi dokumentami

prosze przeslij swoja recenzje specyfikacji algorytmu 0.3 wedlug powyzszych punktow. i przeslij link do pliku .md do pobrania tej recenzji. niech w tym dokumencie bedzie tez zalaczony prompt
```

---

## 2) TL;DR — najważniejsze rzeczy do dopracowania (priorytety)

Poniżej masz rzeczy, które według mnie najbardziej zwiększą jakość specyfikacji **bez zmiany jej ducha**:

1) **Ujednolicić układ współrzędnych „S”**: rozdzielić `edgeS` (s na krawędzi) od `routeS` (s po całej trasie). Teraz `holdPointS`, `targetS` i część opisów mieszają te poziomy.  
2) **Doprecyzować „lifetime locków” (zwalnianie zasobów)**: kiedy komórka jest uznana za zwolnioną? co jest „occupied” vs „granted”? jak wygląda lookback i uwzględnienie `trailExtent`?  
3) **Wyjaśnić, jak *dokładnie* egzekwujesz `stopStandoff` przy modelu dyskowym**: konflikt 2D (dysk) sam z siebie nie gwarantuje 3m odstępu „wzdłuż kierunku jazdy”, więc potrzebujesz jawnej reguły/konfliktów wzdłuż trasy (albo innego modelu).  
4) **Zdefiniować semantykę corridor direction token**: co to znaczy A_TO_B/B_TO_A w korytarzu, jak to Map Compiler wyprowadza i jak runtime wiąże to z `edgeKey`.  
5) **Dopisać formalny kontrakt `RobotCapabilities` i „klas robota”**: bo CompiledMap (conflictSet) musi wiedzieć, dla jakiej obwiedni jest policzony (jeden typ robota? worst-case? per-klasa?).

Reszta jest już na dobrym poziomie, ale te pięć punktów to typowe źródła subtelnych bugów i „niereprodukowanych kolizji”.

---

## 3) Co bym jeszcze poprawił w specyfikacji

### 3.1 Jednoznaczność współrzędnych postępu („S”)

W dokumencie pojawiają się wartości typu:
- `progress.s` — jawnie „S na krawędzi” (edge-local),
- `holdPointS` — opisane jako „pozycja pivota na trasie” (route), ale technicznie liczone z `s_grant_end` komórki, które są edge-local,
- `targetS` w RTP — bez jednoznacznego rozróżnienia, czy to edgeS czy routeS.

**Propozycja doprecyzowania (MVP, proste i odporne):**
- Wprowadź dwa typy:
  - `edgeS` (metry na danym `edgeKey`)
  - `routeS` (metry skumulowane po trasie: 0 na starcie route, rośnie monotonicznie)
- W kontraktach używaj tylko jednego w danym miejscu:
  - telemetry/progress: `{ edgeKey, edgeS }`
  - holdpoint/rtp: `{ routeId, routeS }` + opcjonalnie `{ edgeKey, edgeS }` jako debug
- Dodaj funkcje konwersji jako część kontraktu: `routeS ↔ edgeKey+edgeS`.

To mocno zmniejsza liczbę błędów „robot niby nie przekracza holdpointu, ale na innym edge”.

### 3.2 Konsekwencja w definicjach „safe / standoff / stop distance”

Masz trzy pojęcia:
- `safety*` + marginesy (twarde „nie wolno”),
- `stopStandoff` (polityka odstępu),
- `d_stop(v)` (fizyka hamowania + opóźnienia).

Warto jasno powiedzieć, że:
- `safety*` i marginesy -> *geometria konfliktów* (Map Compiler / conflictSet),
- `d_stop` -> *nie przekrocz holdpointu* (runtime),
- `stopStandoff` -> *minimalny odstęp operacyjny* (to NIE jest automatycznie zapewnione przez sam dyskowy conflictSet).

W tej chwili `stopStandoff` jest opisane, ale nie ma „twardego miejsca” w algorytmie, które gwarantuje, że będzie egzekwowane w przypadkach follower/leader na tej samej trajektorii.

### 3.3 Wyraźny „proof sketch” bezpieczeństwa

Dokument ma już inwarianty (S1..), ale brakuje krótkiego szkicu dowodu:

- Jeśli Map Compiler generuje conflict sets na podstawie Minkowski sum (inflated footprint)  
- i jeśli LockManager nigdy nie przydziela dwóch zasobów konfliktujących  
- i jeśli robot nie przekracza holdpointu z uwzględnieniem `d_stop(v)` i worst‑case latencji  
- to kolizja (w modelu) jest niemożliwa.

Ten szkic jest bardzo pomocny:
- dla ludzi (szybkie sanity check),
- dla AI (łatwiej „dowieść” brak luk),
- dla testów (wiadomo, co jest krytycznym założeniem).

### 3.4 Zasady replanu w ruchu

Wspominasz o preempcji i replanie, ale warto dopisać „twarde reguły”:

- Czy robot może dostać nową `routeId` w środku korytarza?  
- Jak długo trzymamy locki starej trasy?  
- Czy holdpoint może się cofnąć za aktualny progress (a jeśli tak, co wtedy)?  
- Jak atomowo przechodzimy z `routeA` na `routeB` bez dziury w bezpieczeństwie?

W MVP rozwiązanie może być proste:
- replan dozwolony, ale „occupied” zawsze wynika z telemetrii/progress (nie z tego, co było grantowane),
- locki „granted” poza aktualnym progress są czysto logiczne (można je przyciąć bezpiecznie),
- jeśli nowa trasa wymaga zasobów konfliktujących z tym, co robot fizycznie zajmuje → `SAFETY_STOP`.

---

## 4) Jakie błędy / ryzyka widzę (bardziej „twarde”)

To są punkty, które przy implementacji często skutkują realnymi awariami lub „dziwnymi” deadlockami.

### 4.1 `stopStandoff` nie ma jednoznacznego mechanizmu egzekwowania w MVP

- Konflikty 2D oparte o dysk/capsule zapewniają „brak kolizji”, ale nie gwarantują dodatkowego dystansu 3m w osi ruchu.
- W follower/leader na tej samej krawędzi możesz (w zależności od dyskretyzacji) dopuścić za mały odstęp.

**Sugestia naprawy (MVP):**
- Dodać „virtual conflicts” wzdłuż trasy:
  - komórka konfliktuje z kolejnymi komórkami „przed nią” do dystansu `stopStandoff + leadExtent`,
  - asymetrycznie (kierunek ruchu) — albo przynajmniej symetrycznie, ale z dystansem opartym o worst-case.
- Alternatywnie: osobna reguła runtime: „nie przyznawaj komórki, jeśli w tej samej osi/corridorze jest robot w odległości < stopStandoff” (wymaga szybkiego indeksu po corridorId + routeS).

Ważne: trzeba tu wybrać jedno podejście i opisać je wprost.

### 4.2 Brak formalnej definicji zwalniania komórek i różnicy „occupied vs granted”

Masz `buildOccupancy(prev, telemetry)` w pseudokodzie, ale nie ma specyfikacji:
- kiedy komórka jest „occupied” (fizycznie) — od pivota? od obwiedni? od „inflated footprint”?
- kiedy można ją uznać za zwolnioną (`trailExtent`, `poseMargin`, `trackingMargin`)?
- czy i jak działa `lookback` w requestach?

To jest krytyczne, bo bez tego:
- albo trzymasz komórki za długo (przepustowość spada, łatwiej o gridlock),
- albo zwalniasz za szybko (ryzyko kolizji w zakrętach, albo przy pose jitter).

### 4.3 `A_TO_B / B_TO_A` w corridor token jest semantycznie niezamknięte

W spec jest opis „dir”, ale brakuje:
- jak Map Compiler wybiera A/B (endpointy? kolejność edgeKeys? minimalny nodeId?),
- jak robot określa `dir` w request (na podstawie start edgeKey?),
- co jeśli corridor ma różne directed edges (np. osobne edgeKeys dla obu kierunków).

W praktyce to powinno być:
- `corridor` ma jawne `endpoints: { aNodeId, bNodeId }`,
- `dir` = `a->b` jeśli robot wchodzi od `aNodeId` w stronę `bNodeId` (lub na podstawie pierwszego edgeKey).

### 4.4 Konflikty w CompiledMap zależą od modelu robota — a mapa jest jedna

`R_turn` i „inflated footprint” zależą od: head/tail/width + safety + pose/tracking.  
Jeśli masz choćby dwa typy wózków, to conflictSet policzone „raz” może być błędne.

**Musisz rozstrzygnąć wprost (nawet jeśli na dziś jest jeden typ):**
- [MVP] „wszyscy roboty mają ten sam envelope” (wtedy OK),
- albo „CompiledMap jest per robotClass”,
- albo „CompiledMap używa worst-case envelope” (bezpieczne, ale konserwatywne),
- albo „konflikty są liczone dynamicznie runtime” (cięższe).

Teraz to jest implicit.

### 4.5 Hashowanie artefaktów z JSON5 + komentarzami

Masz `compiledMapHash` i `paramsHash`, ale JSON5 z komentarzami nie ma jednej oczywistej kanonikalizacji.

Żeby hashe były stabilne, spec powinna powiedzieć:
- czy hashujesz wynik po „canonical JSON” (bez komentarzy, z posortowanymi kluczami),
- jak traktujesz liczby (np. 0.75 vs 0.750),
- jak traktujesz kolejność tablic.

Inaczej hash może się zmieniać od formatowania.

---

## 5) Co bym ulepszył (konkrety, do wprowadzenia w spec)

### 5.1 Dodać sekcję „Resource lifecycle” (MVP)

Proponowana zawartość:
- definicja `occupiedCells(robot)` na podstawie `(edgeKey, edgeS)` + `trailExtent` + `pose/trackingMargin`,
- definicja `releaseCondition(cell)` (np. gdy `robotProgressRouteS > cellEndRouteS + releaseBuffer`),
- definicja `lookback` w requestach (ile komórek za robotem musi być utrzymane jako granted/occupied).

### 5.2 Doprecyzować „route switching” (MVP)

Dodać reguły:
- `routeId` zmienia się tylko, jeśli robot jest w stanie, gdzie to bezpieczne (np. nie w CS / nie w single-lane bez wyjazdu),
- albo: `routeId` może się zmieniać zawsze, ale `occupied` ma pierwszeństwo (fail-closed jeśli nowa trasa konfliktuje).

### 5.3 Ustalić minimalny kontrakt `RobotCapabilities` (MVP)

W samej spec (nie tylko interfejs TS) dodaj:
- `canReverse`, `maxReverseDistance`, `maxTurnInPlace` (jeśli obrót w miejscu nie zawsze możliwy),
- `rtpHzMax`, `supportsSpeedLimit`, `supportsStopLine`,
- `supportsRouteId` (czy robot rozumie routeId, czy tylko targetPose).

Takie pola od razu pomagają utrzymać spec kompatybilną z różnymi dostawcami robotów.

### 5.4 Doprecyzować „PASS_THROUGH vs STOP_TURN” w runtime (kto decyduje?)

Mapa daje klasyfikację jako „górne ograniczenie”, ale runtime też może wymusić stop (pick/drop, alignment).

Warto dopisać:
- `needsStop(robot, nodeId, transition)` → bool  
- jeśli `needsStop=true` i `transition=PASS_THROUGH`, runtime i tak może wykonać STOP_TURN, ale wtedy MUSI żądać `NODE_TURN`.

To zamyka lukę: mapa mówi „da się przejechać płynnie”, a runtime mówi „stop, bo pick”.

---

## 6) Jak zrobić, żeby spec była bardziej future‑proof

Dużo już jest (MVP vs FUTURE, kontrakty, replay). Dodałbym:

1) **Kontrakty w dwóch warstwach:**
   - „human friendly” (markdown + JSON5),
   - „machine exact” (JSON Schema / TS types + canonical JSON examples).  
   Dzięki temu AI i CI mogą walidować bez interpretacji komentarzy.

2) **Stabilne identyfikatory jako osobny rozdział normatywny**  
   Masz §7.9, ale rozszerzyłbym o:
   - canonicalization,
   - gwarancje wstecznej kompatybilności: np. „cellId nie zmienia się jeśli nie zmieni się geometria i cellLen”.

3) **Wyraźne „extension points” per moduł**  
   Np. w LockManager: *policy objects* dla fairness, CS gating, corridor arbitration — żeby nowa heurystyka nie wymagała zmiany reszty.

4) **Warianty geometrii jako plug-in Map Compiler**  
   Dysk → kapsuła → OBB/polygon. Runtime nie powinien wiedzieć, co było użyte, tylko ufać conflictSet.

---

## 7) Jak zrobić, żeby była lepszej jakości (czytelność + implementowalność)

1) **Dodać na początku 1‑stronicowy „State of the world”**: co jest inputem (telemetry/events/map), co jest outputem (commands/logs), jak płyną dane. Masz pipeline, ale warto go mieć jeszcze bardziej „executive summary”.  
2) **Zamknąć wszystkie definicje w jednym miejscu** (glossary + typy). Teraz jest dobrze, ale kluczowe sporne rzeczy (S/routeS, lifecycle) wciąż są „rozproszone”.  
3) **Oddzielić normative spec od „analizy prototypu”**. §24 jest wartościowe, ale w głównej spec potrafi rozmywać uwagę. Lepiej przenieść to do osobnego pliku jako „Appendix: Spike pitfalls”.

---

## 8) Jak zrobić, żeby była bardziej profesjonalna (forma)

To są drobiazgi, ale robią różnicę, gdy dokument ma krążyć po firmie/kliencie:

- Unikać sformułowań typu „bez magii” w sekcjach normatywnych; zostawić je w notkach.  
- Każdy parametr z one-pagera: dodać „hard default” dla MVP (nawet jeśli konfigurowalny), bo implementacja potrzebuje liczby startowej.  
- Wprowadzić konwencję IDs dla wymagań (S1, L1, D1…) — już jest — i powiązać je z testami (np. `SCN-03` spełnia S1,S2,L1).  
- Dodać listę „Definition of Done dla MVP” — masz checklisty, ale warto dodać „MVP release criteria” w jednym miejscu.

---

## 9) Jak zrobić, żeby była bardziej odporna na błędy (operacyjnie)

### 9.1 Błędy czasu i kolejności (tick vs telemetria)

Dodać regułę:
- snapshot ticka używa telemetrii „najświeższej do now”, ale jeśli telemetry timestamp jest starszy niż `telemetryTimeout`, robot → fail-closed,
- `d_stop` powinno uwzględniać *najgorszy* czas: `tickMs + commandLatency + telemetryAge` (albo jawny `controlLatencyBudget`).

### 9.2 Błędy I/O i dysku (logowanie)

Jeśli logowanie jest „MUST”, to trzeba opisać degradację:
- co jeśli dysk pełny?
- co jeśli flush nie działa?
- czy system przechodzi w `SAFETY_STOP`, czy tylko sygnalizuje degraded?

Najbezpieczniej: jeśli nie możesz logować/replay (utrata determinism) → tryb „degraded” i ograniczenie prędkości / stop.

### 9.3 „Robot overshoot” i gwarancje po stronie robota

RTP jest świetne, ale spec powinna jasno powiedzieć, co jest wymagane od robota:
- robot nie może „przestrzelić” targetS o więcej niż `overshootMargin`,
- albo FM musi wysyłać targetS wystarczająco „wstecz” uwzględniając kontrolę.

W MVP możesz to załatwić minimalnie:
- `targetS = min(rtpLookahead, holdPointS - overshootBuffer)`.

### 9.4 „Unknown pose” jako przeszkoda

Masz fail-closed, ale dopisz:
- jak duży jest „unknown obstacle” (np. ostatnia znana pozycja + `d_stop(vMax)` + margines),
- jak długo utrzymujesz ten stan (do reconnect).

---

## 10) Jak zrobić, żeby lepiej nadawała się do pracy z AI

1) **Rozbić spec na moduły + mieć jeden „Requirements Index”**  
   AI lubi, gdy wymagania są atomowe, mają ID, test i owner.  
2) **Zamienić przykłady payloadów w „fixtures”**  
   To co masz w §15 jest świetne — przenieś to do `fixtures/contracts/*.json` (canonical JSON) i waliduj w CI.  
3) **Dodać „reference implementation pseudocode” w osobnych plikach**  
   Krótkie, kompletne pseudokody w stylu „executable spec” pomagają AI generować kod bez dopowiadania.  
4) **Zasada: każda niejednoznaczność = decyzja + reason**  
   AI najczęściej psuje się na „może/zalecane”. Traktuj to jak backlog: jeśli coś jest „SHOULD”, dopisz: „w MVP robimy X, a Y to future”.

---

## 11) Rolling Target Point (RTP) — co dopisać, żeby było „twardo”

RTP już jest w spec. Dodałbym dwa elementy:

### 11.1 Kontrakt po stronie robota (MUST)

- Robot musi respektować `routeId` i nie jechać poza przekazaną trasą (albo musi raportować, że jedzie lokalnie inaczej → OFF_ROUTE).  
- Robot musi respektować `mode`:
  - `GO`: jedź do target,
  - `HOLD`: utrzymaj pozycję (nie przekraczaj),
  - `STOP`: awaryjny stop (własna kontrola).

### 11.2 Ograniczenie skoku targetu (anti-jerk + determinism)

Wprowadź parametry:
- `maxTargetAdvancePerTick` [m] (np. `vMax * tickMs + epsilon`),
- `maxTargetRetreatPerTick` [m] (żeby target nie cofał się chaotycznie),
- `rtpTimeoutMs` (już wspominasz).

To redukuje oscylacje i ułatwia debug.

---

## 12) Propozycja podziału dużej specyfikacji na mniejsze pliki

Celem jest: krótszy kontekst na raz + lepsza praca z AI (osobne „pakiety” tematów) + łatwiejsze PR-y.

### 12.1 Proponowany podział (MVP)

1) `00_intro_scope_glossary.md`  
   Cel, zakres/non-goals, słownik, definicje jednostek, pojęcia.

2) `01_one_pager_params.md`  
   Tabela „1 miejsce prawdy” + definicje parametrów + defaulty.

3) `02_assumptions_guarantees.md`  
   Assumptions/Guarantees + proof sketch + inwarianty.

4) `03_map_compiler.md`  
   Wejściowa mapa → CompiledMap: corridorId, cells, conflictSet, transitions, CS.  
   + zasady canonical hash.

5) `04_data_contracts.md`  
   Wszystkie payloady + enumeracje reason codes + schematy.  
   (Doc + linki do `schemas/*.json` i `fixtures/*.json`)

6) `05_task_scheduler_fsm.md`  
   Model tasków, FSM, dispatch policy, preempcja parkingu.

7) `06_route_planner_progress.md`  
   Planowanie trasy, anchor start/goal, progress estimator, detekcja OFF_ROUTE/POSE_JUMP.

8) `07_lock_manager_dcl2d.md`  
   DCL‑2D: zasoby, konflikty, fairness, direction arbitration, CS gating, anti-oscillation, lifecycle/release.

9) `08_holdpoint_rtp.md`  
   Hold‑point/stop‑line + RTP: definicje, wzory, watchdog, ograniczenia targetu, robot contract.

10) `09_failures_recovery.md`  
   Failure modes: stale/offline/pose jump/off-route/stuck + protokoły recovery.

11) `10_logging_replay_determinism.md`  
   Snapshot, JSONL, replay, A/B, deterministyczność (zasady sortowania).

12) `11_tests_golden_scenarios.md`  
   Piramida testów + golden scenarios + property-based.  
   Każdy scenariusz z ID i mapą wejściową.

13) `12_roadmap_future.md`  
   FUTURE bez rozpraszania MVP.

14) `appendix_spike_pitfalls.md`  
   Obecne problemy prototypu i dlaczego (Twoje §24) — trzymać jako wiedzę, ale poza rdzeniem.

### 12.2 Jak to spiąć technicznie (repo)

- W katalogu `spec/` trzymaj markdowni powyżej.  
- W `spec/schemas/` trzymaj JSON Schema (albo TS types generowane).  
- W `spec/fixtures/` trzymaj:
  - `contracts/*.json` (canonical),
  - `scenarios/*.json` (golden),
  - `maps/*.json` (wejściowe),
  - `compiledMaps/*.json` (wynik Map Compiler).  
- CI:
  - walidacja fixtures vs schemas,
  - uruchomienie replay scenariuszy na silniku symulacji,
  - sprawdzenie inwariantów S1..D3.

To jest format, w którym AI może bez bólu:
- poprawiać jeden moduł naraz,
- dodawać testy i scenariusze,
- generować implementację z minimalnym „zgadywaniem”.

---

## 13) Szybkie „diffy” do wprowadzenia od razu (minimal effort, duży zysk)

1) Ujednolicić `edgeS`/`routeS` w kontraktach i w tekście.  
2) Dopisać 1 rozdział: **Resource lifecycle (occupied vs granted vs release)**.  
3) Dopisać 1 rozdział: **StopStandoff enforcement w MVP** (virtual conflicts lub reguła runtime).  
4) Dopisać definicję `RobotCapabilities` + decyzję o „robot class / worst-case” dla CompiledMap.  
5) Dopisać canonicalization dla hashy.

Po tych zmianach spec jest dużo bardziej „nie do zepsucia” przy implementacji.

---
