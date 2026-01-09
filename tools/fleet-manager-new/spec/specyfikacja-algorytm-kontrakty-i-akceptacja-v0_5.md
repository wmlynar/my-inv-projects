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

## Changelog

- **v0.5:** poprawki po recenzji v0.4 (spójność + implementowalność):  
  - ujednolicenie geometrii 2D: `sweptShape: multiRect` jako MVP (bez Minkowskiego/dysku),  
  - doprecyzowanie i *naprawa* `stopStandoff` (hamowanie + hold‑line),  
  - doprecyzowanie odpowiedzialności FM vs Gateway (stop‑line: FM steruje `mode`, Gateway fail‑safe),  
  - dopisanie szkicu dowodu bezpieczeństwa + dodatkowych golden scenariuszy,  
  - katalog kodów błędów walidatora (stabilne `code` dla testów/UI).  

- **v0.4:** doprecyzowania po recenzjach v0.3 + zmiany integracyjne:  
  - wejście mapy jako **`.smap`** (pośrednio: `graph.json`) z geometrią krawędzi `DegenerateBezier`,  
  - **RTP target = `LocationMark` lub `ActionPoint`** (nie punkt XY),  
  - akcje na `ActionPoint` (np. **podnoszenie widel**) jako część semantyki zadania + mapowanie na ramki RoboCore/Robokit,  
  - doprecyzowanie **`edgeS` vs `routeS`**, lifecycle locków (occupied/granted/released) i reguł zwalniania,  
  - doprecyzowanie **stopStandoff** jako osobnego ograniczenia (nie tylko „safety front”),  
  - doprecyzowanie **corridor A/B** i direction token,  
  - doprecyzowanie wymagań anti‑oscillation (również jitter RTP),  
  - wzmocnienie determinism: canonical hashing artefaktów + stabilne sortowania.

- **v0.3:** production-ready doprecyzowania:  
  
  - twarda sekcja **Assumptions & Guarantees** (warunki → gwarancje),  
  - pełne rozróżnienie **MVP vs Future** (w osobnych sekcjach),  
  - ujednolicone nazewnictwo (bez jednostek w nazwach; jednostki tylko w spec i komentarzach),  
  - jeden „one-pager” z wymaganiami: geometryczne / czasowe / prędkościowe / jakości telemetrii,  
  - doprecyzowane: atomowość ticka, direction arbitration, state machine, robot capabilities, reason codes,  
  - doprecyzowane: **kiedy węzeł musi rezerwować obrót 360°** (tylko gdy plan zakłada stop+turn; przejazd styczny = bez rezerwacji obrotu),  
  - doprecyzowane: **swept corridors** po krzywych + konflikty 2D także dla krawędzi blisko siebie nawet bez połączenia,  
  - dodane: format artefaktu **CompiledMap** (JSON5 + komentarze), golden scenarios + expected outcomes, miękkie wymagania wydajnościowe, checklisty.

- **v0.2:** doprecyzowanie geometrii 2D (zakręty, bliskie krawędzie), rozdzielenie safety envelope vs stop standoff, zakaz TTL jako mechanizmu bezpieczeństwa, zakaz backoff/reverse, duża sekcja anti-oscillation, wymagania dot. replay/logów, prekompilacja mapy, obsługa pose jump/offline/off-route, formalizacja MUST/SHOULD, test pyramid + symulacja bez czekania.

- **v0.1:** pierwsza wersja DCL + scheduling + analiza prototypu.

---

# Część 1 — Prompt i cel dokumentu

## Prompt (oryginalny)

```text
zallaczam projekt feet managera, zapoznaj sie z nim i z dokumentacja. fleet manager to program do zarzadania autonomicznymi wozkami widlowymi. chodzi mi o opracowanie specyfickacji do nowego algorytmu harmonogramowania wozkow. w tym projekcie sa algorytmy. ale nei dzialaja zbyt dobrze. chodzi mo o to, zeby wypracowac algorytm i interfejsy takie, zebym w przyszlosci mogl zrobic lepsza wersje. natomiast na chwile obecna skupic sie na algorytmie ktory dziala. chodzi o to, ze mamy zadanie wyspecyfikowane w postaci strumienia pracy. strumien pracy ma zdefiniowane punkty skad pobieramy towar i dokad go zawozimy. jezeli warunki sa spelnione to algorymt powinien uzyc wozka widlowego, zebo on pojechal po towar do miejsca pobrania, pobral go, nastepnie pojechal do miejsca odkladczego i go odlozyl. jezelil sa kolejne mozliwe zadania z tego lub innego strumienia to podjal sie ich wykonywania a jezeli nie to niech pojedzie na miejsce parkingowe. no i jezeli jest w trakcie jazdy do miejsca parkingowega a pojawi sie nowe zadanie to niech sie go podejmie. mapa jest w postaci grafu, wozki moga jezdzic po grafie. wozki moga zawracac i obracac sie w miejscu w wezlach grafu. kazdy brzeg grafu ma okreslony w jakim kierunku mozna sie poruszac i czy wozek porusza sie tylem czy przodem. kazdy wozek widlowy ma okreslony punkt parkingowy na mapie. model poruszania sie wozka to odwrocony trojkolowiec. srodek ukladu wspolrzdnych wozka jest pomiedzy przednimi kolami wozka wislowego. model okreslaja 3 parametry, head, tail i width. chodzi o to, zeby dwa lub wiecej wozkow widlowych poruszalo sie po mapie i nigdy nie bylo szans, zeby sie do siebie zblizyly na odleglosc x od przodu wozka i y od tylu wozka. czyli musza byc przewidziane korytarze / obwiednie trajektorii poruszania sie wozkow. na poczatek algorytm powinien uzyc rozwiazania deterministic locking. niw powinny zdarzac sie deadlocki i zakleszczenia wozkow. w tym algorytmie wozek moze sobie blokowac trase na pewna ilosc metrow do przodu, dajmy na to horyzont rezerwacji. inne wozki nie powinny sie zblizac do horyzontu rezerwacji zgodnie z wymaganiami wyzej. alogrytm powinien zalozyc, ze w kazdym wezle kazdy wozek widlowy moze obrocic sie o 360 stopni, wiec powinien to brac pod uwage przy zblizaniu sie. oczywiscie nawet jak wozek stoi w danym miejscu czy to w wezle czy bliksko wezla czy po srodku brzegu to dalej powinny byc spelnione te podstawowe reguly ze zaden inny owzek nie moze sie zblizyc do niego zgodnie z tymi zasadami a jezeli jest w wezle to musi mu dac mozliwosc obrocenia sie, jezei sobie zarezerowwal dany wezel. pisalles tez o tym, ze w razie konfliktu rezerwacji jest wyznaczana jakas kolejka priorytetow, jeden wozek trzyma rezerwacje, a inne przycinaja swoje rezerwacje tak, zeby nie wjechac w zarezerwowane obszary i nie zarezerwowac juz zarezerwowanego obszaru. to powinni byc proste, latwe do zrozumienia i eleleganckie. tak, zeby sie dalo prosto pokazac i wytlumaczyc jak to ma dzialac. operacje pobierania towaru i odkladania towaru zajmuja czas. wozek rusza z pewnym przyspieszeniem i hamuje w normalnym trybie pracy z pewnym opoznieniem. wozek powinien moc zarezerwowac jedynie czesc brzegu. oczywiscie graf to siec polaczen, jednak polaczenie ma tez swoj ksztalt opisany jakas krzywa. jaki algorytm bys zaproponowal? opisz dokladnie jak taki algorytm mialby dzialac, spisz wszystkie wymagania. przejrzyj tez dokladnie kod, napisz jakie sa pitfalls, na co trzeba uwazac co moze niedzialac. jak powinine byc zbudowany algorytm, ktory bedzie bardzo odporny
```

## Doprecyzowania do v0.4 (brief do tej wersji)

Poniższe punkty są traktowane jako wymagania wejściowe do **tej** iteracji dokumentu (v0.4).  
Cel: domknąć niedoprecyzowane miejsca z recenzji v0.3 i dopasować spec do realnych interfejsów (mapa `.smap`, RoboCore/Robokit).

**[MVP] MUST w v0.4 (w praktyce: bez tego nie uznajemy implementacji za zgodną):**

1) **Mapa jako `.smap` + `DegenerateBezier`**  
   - Map Compiler **MUST** wczytywać geometrię krawędzi z pliku `.smap` (w praktyce: przez eksport/pośredni format `graph.json`),  
   - krawędź jest opisana jako `DegenerateBezier` (`p0..p3`) + właściwości (`direction`, `movestyle`, `width`, …).

2) **RTP target = `LocationMark` lub `ActionPoint` (nie XY)**  
   - Sterowanie „rolling target” nie używa już punktów `{x,y}` jako kontraktu FM→Robot,  
   - target jest **referencją do elementu mapy**: `LocationMark` albo `ActionPoint` (ID z mapy).  
   - (Opcjonalnie) `targetPose` może pozostać jako debug/telemetria, ale nie jest kontraktem sterującym.

3) **ActionPoint i operacje (np. widły) jako kontrakt zadania**  
   - Podnoszenie/opuszczanie wideł jest modelowane jako **ActionPoint + parametry akcji** (np. `forkHeight: {from, to}`),  
   - spec wskazuje, jakie ramki RoboCore/Robokit są używane do realizacji tych akcji.

4) **`edgeS` vs `routeS`**  
   - wszędzie, gdzie jest „s”, musi być jednoznaczne, czy chodzi o metry na *krawędzi* (`edgeS`) czy wzdłuż *całej trasy* (`routeS`).  
   - kontrakty i pseudokod są poprawione tak, aby nie mieszać tych pojęć.

5) **Lifecycle locków + zwalnianie zasobów**  
   - doprecyzowane: `occupied` vs `granted` vs `released`,  
   - doprecyzowane: reguły zwalniania komórek i „lookback” (odporność na jitter/projekcję).

6) **`stopStandoff` jako osobne ograniczenie**  
   - `safetyFront/Rear/Side` to **twarda strefa kolizyjna 2D**,  
   - `stopStandoff` to **dystans operacyjny zatrzymania przed innym robotem** (np. 3m) i jest egzekwowany przez hold‑point / stop‑line.

7) **Tranzycje w węzłach: geometria ≠ decyzja runtime**  
   - mapa opisuje **geometrię przejazdu** (tangent / non‑tangent),  
   - runtime decyduje, czy robot **musi** się zatrzymać (task, konflikt, zmiana `movestyle`) i wtedy rezerwuje `NODE_STOP_ZONE`.

8) **Direction arbitration: jawne A/B i token**  
   - corridor ma określone końce `A` i `B` oraz kierunek „A→B” w osi `corridorS`,  
   - token nie „zgaduje” stron, tylko działa na tych definicjach.

9) **Determinism: canonical hashing + stabilne sortowania**  
   - doprecyzowane: jak liczymy `compiledMapHash` i `paramsHash` w sposób kanoniczny i stabilny.

Reszta dokumentu jest ułożona tak, aby dało się ją implementować 1:1 i testować przez golden scenariusze oraz replay (bez czekania).

## Cel dokumentu

Zdefiniować **nowy algorytm** Fleet Managera w sposób:

- jednoznaczny i implementowalny,
- deterministyczny (replay),
- bezpieczny geometrycznie w 2D,
- odporny na błędy telemetrii i sieci,
- modularny i „AI‑friendly” (kontrakty + golden scenarios + checklists),
- z jasnym MVP, który działa, oraz z planem ewolucji.

---

# Część 2 — Specyfikacja (v0.5)

## 0. Zasady dokumentu i poziomy zgodności

### 0.1 Zakres

Spec obejmuje:

1) generowanie i przydział zadań (workflow streams → tasks → robot),  
2) planowanie trasy po grafie (single‑agent),  
3) zarządzanie ruchem wielu robotów metodą DCL‑2D (deterministic corridor locking),  
4) sterowanie robotem przez Rolling Target Point (RTP) spięte z rezerwacjami (hold‑point),  
5) failure modes (offline/stale, pose jump, off‑route, stuck),  
6) kontrakty danych (czytelne JSON5), logowanie i replay, testy.

### 0.2 Non‑goals (MVP v1)

W MVP v1:

- Nie projektujemy pełnego local obstacle avoidance (robot może jedynie zgłosić „blocked” / „wants avoidance”).  
- Nie robimy time‑window reservations / spatio‑temporal MAPF (jest w roadmap).  
- Nie robimy certyfikacji safety przemysłowej (to osobna warstwa), ale **logiczna** gwarancja braku kolizji w ramach założeń jest obowiązkowa.

### 0.3 Słowa normatywne

- **MUST / MUSI** — wymaganie obowiązkowe.  
- **SHOULD / POWINIEN** — zalecane.  
- **MAY / MOŻE** — opcjonalne.

### 0.4 Jednostki i konwencje

- Dystanse: **metry [m]**  
- Czas: **milisekundy [ms]** (liczby całkowite)  
- Prędkość: **[m/s]**, przyspieszenie/hamowanie: **[m/s²]**  
- Kąty: **radiany [rad]**  
- Układ współrzędnych mapy: 2D (x, y, yaw).  
- „2D spacing” oznacza brak przecięcia się obwiedni w **płaszczyźnie 2D**, a nie tylko dystans po łuku.

**Nazewnictwo pól:** w nazwach pól **nie używamy jednostek**. Jednostki są określone w tej sekcji oraz w komentarzach przy payloadach.

### 0.5 Poziomy zgodności: MVP vs Future

Każde wymaganie ma etykietę:

- **[MVP]** — MUSI być w MVP v1.  
- **[FUTURE]** — planowane po MVP; nie blokuje MVP.  
- **[DEV]** — narzędzie deweloperskie (np. debug).

Dokument jest pisany tak, aby implementacja MVP mogła zostać wykonana bez implementowania [FUTURE].

---

## 1. One‑pager: wymagania i ograniczenia (1 miejsce prawdy)

Ta tabela jest punktem odniesienia dla walidatora sceny, testów i bezpieczeństwa. Wartości „Recommended” to startowe założenia; wszystkie są konfigurowalne per robot/scena, ale MUSZĄ być logowane.

| Kategoria | Parametr / limit | Jednostka | Poziom | Recommended | Znaczenie / kontrakt |
|---|---|---:|---:|---:|---|
| Geometria robota | `head`, `tail`, `width` | m | [MVP] | wg hardware | Wymiary robota względem pivota (pivot między przednimi kołami). |
| Marginesy safety | `safetyFront`, `safetyRear`, `safetySide` | m | [MVP] | wg hardware | Twarda strefa „nie wolno zbliżyć się”. |
| Odstęp operacyjny | `stopStandoff` | m | [MVP] | 3.0 | Robot nie dojeżdża bliżej niż ten dystans (polityka ruchu, hamowanie). |
| Niepewność pozycji | `poseMargin` | m | [MVP] | 0.2 | Maks. błąd lokalizacji, który MUSI być pokryty inflacją obwiedni. |
| Błąd śledzenia | `trackingMargin` | m | [MVP] | 0.2 | Maks. błąd sterowania, który MUSI być pokryty inflacją. |
| Dodatkowy margines na zakrętach | `turningExtraMargin` | m | [MVP] | 0.1 | Inflacja na zakrętach (wyrzucanie na zewnątrz, slippage). |
| Telemetria | `telemetryRateMin` | Hz | [MVP] | ≥ 5 | Minimalna częstotliwość statusu robota. |
| Telemetria | `telemetryTimeout` | ms | [MVP] | 500–2000 | Po tym czasie telemetria uznana za „stale” → fail‑closed. |
| Komendy | `commandLatency` | ms | [MVP] | ≤ 200 | Max opóźnienie „komenda → robot zaczyna wykonywać” (użyte w stop distance). |
| Tick engine | `tickPeriod` | ms | [MVP] | 50–200 | Okres ticka (deterministyczny). |
| Prędkość max | `vMax` | m/s | [MVP] | wg robot | Max prędkość planowana przez FM (niekoniecznie max HW). |
| Przyspieszenie | `accel` | m/s² | [MVP] | wg robot | Użyte do estymacji motion i d_stop. |
| Hamowanie | `brake` | m/s² | [MVP] | wg robot | Użyte do estymacji d_stop. |
| Stop distance | `d_stop(v)` | m | [MVP] | wynik | Funkcja minimalnej drogi hamowania + marginesy. |
| Dyskretyzacja | `cellLen` | m | [MVP] | 0.5–1.0 | Długość komórki rezerwacji na krawędzi. |
| Horyzont locków | `lockLookahead` | m | [MVP] | ≥ rtpLookahead + d_stop(vMax) | Prefiks trasy, który próbujemy rezerwować. |
| Horyzont RTP | `rtpLookahead` | m | [MVP] | 2–5 | Punkt RTP wzdłuż trasy. |
| Anti-gridlock | `exitClearance` | m | [MVP] | 1–3 | Minimalny „zapas za skrzyżowaniem” przy wejściu w CS. |
| Single-lane | `edgeDirHold` | ms | [MVP] | 500–2000 | Histereza zmiany kierunku w wąskim korytarzu. |
| Fairness | `fairnessStep`, `fairnessCap` | ms | [MVP] | 1000, 30000 | Aging: wzrost priorytetu co fairnessStep, z limitem fairnessCap. |
| Anti-oscillation | `holdHysteresis` | m | [MVP] | 0.2–0.5 | Minimalna zmiana hold‑point aby aktualizować (stabilizacja). |
| Off-route | `maxLateralError` | m | [MVP] | 0.2–0.5 | Powyżej → OFF_ROUTE. |
| Pose jump | `poseJumpThreshold` | m | [MVP] | 0.5–2.0 | Powyżej → POSE_JUMP i re-sync. |
| Stuck | `stuckTimeout` | ms | [MVP] | 2000–10000 | Brak postępu mimo GO → STUCK. |
| Wydajność ticka | `tickBudgetSoft` | ms | [MVP] | < tickPeriod * 0.5 | Miękki budżet CPU na tick (bez I/O). |
| Skalowanie | `robotsSoftMax` | szt. | [MVP] | 20–50 | Miękki cel: tyle robotów ma działać bez degradacji jakości w typowej mapie. |

**[MVP] MUST:** wszystkie parametry z tabeli muszą być logowane razem z `compiledMapHash` i `paramsHash`.

---

## Kody błędów walidatora sceny/mapy (MVP)

Walidator MUST zwracać stabilne kody błędów (do testów i UI). Minimalny katalog:

- `MAP_PARSE_ERROR` — nie da się sparsować `.smap`/`graph.json`
- `MAP_INVALID_GEOMETRY` — DegenerateBezier/krzywa ma NaN/inf/zerową długość
- `GRAPH_DISCONNECTED` — graf niespójny (brak dojścia do wymaganych punktów)
- `DANGLING_EDGE` — krawędź wskazuje na nieistniejący węzeł
- `INVALID_DIRECTION` — brak spójnego kierunku ruchu na krawędzi
- `MISSING_PARKING_NODE` — robot nie ma poprawnie zdefiniowanego parkingu
- `MISSING_PICK_DROP_NODE` — pick/drop nie jest węzłem lub brak węzła
- `INVALID_ACTION_POINT` — ActionPoint nie ma wymaganych parametrów / ma złe jednostki
- `CELL_BUILD_FAILED` — nie da się zbudować komórek (cellLen za małe/za duże, brak corridorów)
- `CONFLICTSET_BUILD_FAILED` — błąd w prekomputacji konfliktów
- `CS_OVERLAP_UNEXPECTED` — critical sections nakładają się w sposób nieobsługiwany (MVP)

**[MVP] MUST:** każdy błąd walidacji musi zawierać:
- `code`,
- `message` (dla człowieka),
- `details` (JSON5, opcjonalnie: edgeId/nodeId/cellId),
- `severity` (ERROR/WARN).



## 2. Assumptions & Guarantees (twardy kontrakt)

Ta sekcja to „umowa”: jeśli spełniasz assumptions, dostajesz guarantees. Jeśli assumptions są złamane, system przechodzi w tryb fail‑closed (bezpieczeństwo kosztem throughput).

### 2.1 Assumptions (wejściowe warunki prawdziwości gwarancji)

**A‑Geo** [MVP] Roboty poruszają się zgodnie z globalną trasą po grafie; lokalne odchylenia są ograniczone przez `trackingMargin` oraz `maxLateralError`.  
**A‑Pose** [MVP] Błąd lokalizacji jest ograniczony przez `poseMargin` (albo robot jest oznaczany jako „unknown” i traktowany jako przeszkoda).  
**A‑Telem** [MVP] Telemetria spełnia `telemetryRateMin` i `telemetryTimeout`; w przeciwnym razie robot jest fail‑closed (STOP + inflacja).  
**A‑Map** [MVP] Mapa jest skompilowana i zwalidowana przez Map Compiler; konflikt sets są kompletne i symetryczne.  
**A‑NoReverse** [MVP] Algorytm ruchu nie korzysta z backoff/cofania jako mechanizmu rozwiązywania konfliktów (reverse może być wymuszony przez krawędź, ale nie jako „ustąp”).  
**A‑PickDropNodes** [MVP] Operacje PICK/DROP zachodzą wyłącznie w węzłach.

### 2.2 Guarantees (co system MUSI zapewnić)

**G‑Safety‑2D** [MVP] Brak kolizji w 2D: w żadnym ticku nie ma możliwości, aby obwiednie zajętości dwóch robotów (z inflacją) weszły w konflikt w ramach przydzielonych korytarzy.  
**G‑StopLine** [MVP] Robot nigdy nie przekracza hold‑pointu w sposób, który łamałby G‑Safety‑2D (uwzględniając `d_stop(v)` i marginesy).  
**G‑NodeTurn** [MVP] Jeśli robot ma zaplanowany **stop + obrót** w węźle, to ma zarezerwowaną przestrzeń na obrót 360° (patrz §6).  
**G‑NoHeadOn** [MVP] W wąskich korytarzach (single‑lane corridor) nie dojdzie do sytuacji „dwa roboty weszły z obu stron i stoją naprzeciwko siebie” (direction token).  
**G‑NoDeadlock** [MVP] Brak deadlocków logicznych na zasobach (lock‑level), a fizyczne zakleszczenia są obsłużone przez zasady critical sections + direction token + recovery (patrz §10).  
**G‑NoOscillation** [MVP] Brak oscylacji w sensie zdefiniowanych metryk (patrz §9.4).  
**G‑Determinism** [MVP] Dla tych samych wejść (telemetria+events+mapa+parametry) algorytm daje te same wyniki (replay).

---

## 3. Podsumowanie twardych wymagań (checklist‑friendly)

Każde wymaganie ma ID. To jest „lista kontrolna” do implementacji i testów.

### 3.1 Safety & geometry

- **S1** [MVP] 2D safety: brak konfliktów obwiedni (swept corridors).  
- **S2** [MVP] Stop‑standoff: robot nie zbliża się do innego robota poniżej `stopStandoff` w kierunku ruchu (realizowane przez **hold‑point / stop‑line** + reguły „follow distance”; niezależne od `safetyFront/Rear/Side`).  
- **S3** [MVP] Node turn reservation: jeśli plan zakłada stop+turn → rezerwacja obrotu 360°.  
- **S4** [MVP] Pass‑through node: jeśli przejazd jest styczny i bez stopu → brak wymagania rezerwacji obrotu; bezpieczeństwo zapewnia swept corridor.  
- **S5** [MVP] Fail‑closed: stale/offline/unknown pose → STOP + konserwatywna inflacja.  

### 3.2 Traffic liveness

- **L1** [MVP] No head‑on w single‑lane: direction token + switch tylko gdy pusty.  
- **L2** [MVP] Fairness: brak starvation (aging deterministyczny).  
- **L3** [MVP] Anti‑gridlock: nie wjeżdżaj w CS jeśli nie masz wyjazdu.

### 3.3 Determinizm i debug

- **D1** [MVP] Deterministyczny tick (jawne sortowania, brak zależności od kolejności struktur).  
- **D2** [MVP] Snapshoty + logi na dysk z parametrami i hashami.  
- **D3** [MVP] Replay (time‑warp, bez czekania).

### 3.4 Kontrakty

- **C1** [MVP] Jednoznaczne kontrakty danych (JSON5 + komentarze + jednostki) + walidator.  
- **C2** [MVP] Reason codes: każda decyzja „dlaczego STOP/HOLD” ma kod.

---

---

## 3.6 Szkic dowodu bezpieczeństwa (MVP, krótko)

Zakładamy:

- Map Compiler wygenerował `conflictSet` tak, że jeśli dwie komórki są jednocześnie zajęte przez dwa roboty, to **musi** istnieć konflikt (fail‑closed).
- LockManager utrzymuje niezmiennik: dla dwóch różnych robotów `A != B` zachodzi  
  `granted(A) ∩ conflicts(granted(B)) = ∅` (brak konfliktów w przydziale).
- Runtime utrzymuje niezmiennik: `occupied(R) ⊆ granted(R)` dla każdego robota `R` (robot nie wychodzi poza swój przydział; w razie niepewności freeze/STOP).

Wtedy:

1) Jeśli `occupied(A) ⊆ granted(A)` i `occupied(B) ⊆ granted(B)`, a przydziały nie mają konfliktów, to również `occupied(A)` nie ma konfliktów z `occupied(B)`.
2) Ponieważ konflikt jest zdefiniowany na podstawie przecięcia `sweptShape` w 2D, brak konfliktu oznacza, że obwiednie zajętości robotów nie przecinają się w 2D.
3) Zatem roboty nie mogą wejść w stan, w którym ich obwiednie bezpieczeństwa (inflated footprint + marginesy) zachodzą na siebie.

Dodatkowo `stopStandoff` jest wymuszane przez `hold_standoff` (runtime) i testy golden scenariuszy, ale nie jest częścią dowodu kolizji 2D (to polityka operacyjna).



## 4. Słownik i notacja

### 4.1 Pojęcia

- **Robot / wózek**: autonomiczny wózek widłowy.  
- **Węzeł (Node)**: punkt grafu, potencjalny punkt stopu/obrotu, pick/drop, skrzyżowanie.  
- **Krawędź (Edge)**: połączenie między węzłami z geometrią 2D (krzywa) i atrybutami ruchu.  
- **Krawędź kierunkowa (DirectedEdge / edgeKey)**: przejazd w konkretnym kierunku oraz z konkretnym `movestyle` (forward / reverse).  
- **Corridor (korytarz fizyczny, corridorId)**: zbiór kolejnych krawędzi tworzących jeden wąski przejazd „od skrzyżowania do skrzyżowania” z polityką kierunku (single‑lane).  
- **RoutePlan**: sekwencja `edgeKey` + parametryzacja po długości `s` (arc‑length).  
- **Progress**: rzut pozycji robota na trasę: (edgeKey, s, lateralError, segmentIndex).  
- **Cell**: elementarna „komórka rezerwacji” (fragment geometrii z zakresu `s`).  
- **ConflictSet**: lista cellId (lub resourceId), których nie wolno rezerwować jednocześnie (2D).  
- **Resource**: abstrakcja locka (CELL, NODE_STOP_ZONE, CORRIDOR_DIR, CRITICAL_SECTION).  
- **CorridorRequest / Grant**: żądanie i przydział prefiksu zasobów (cells + zasoby specjalne).  
- **Hold‑point**: granica dozwolonego postępu na trasie (maksymalna pozycja pivota).  
- **RTP**: Rolling Target Point — punkt celu przesuwany wzdłuż trasy.

### 4.2 Lead/trail vs „przód/tył” robota (ważne!)

Robot ma fizyczny „przód” i „tył” (head/tail), ale w zależności od `movestyle`:

- **kierunek ruchu (lead)** to przód robota, jeśli `movestyle=forward`,  
- **kierunek ruchu (lead)** to tył robota, jeśli `movestyle=reverse`.

Definiujemy:

- `leadExtent = (movestyle == forward) ? head : tail`  
- `trailExtent = (movestyle == forward) ? tail : head`

Analogicznie dla safety:

- `leadSafety = (movestyle == forward) ? safetyFront : safetyRear`  
- `trailSafety = (movestyle == forward) ? safetyRear : safetyFront`

To MUSI być użyte spójnie w spacing, hold‑point i inflacji obwiedni.

---

## 15. Kontrakty API — przykładowe payloady (JSON5 + komentarze)

Ta sekcja jest „czytelna dla ludzi”, ale wystarczająco precyzyjna do implementacji.

### 15.1 Konfiguracja robota (RobotModel)

```json5
{
  robotId: "F01",

  model: {
    head: 1.20,              // [m]
    tail: 1.00,              // [m]
    width: 0.95,             // [m]

    safetyFront: 0.50,       // [m] twardy margines przodu
    safetyRear: 0.50,        // [m] twardy margines tyłu
    safetySide: 0.30,        // [m] twardy margines boków

    stopStandoff: 3.00,      // [m] nie zatrzymuj się bliżej niż X przed innym robotem / granicą

    poseMargin: 0.20,        // [m] maks. błąd lokalizacji
    trackingMargin: 0.20,    // [m] maks. błąd śledzenia
    turningExtraMargin: 0.10 // [m] dodatkowa inflacja na zakrętach (zalecane)
  },

  dynamics: {
    vMax: 1.2,               // [m/s]
    accel: 0.6,              // [m/s^2]
    brake: 0.8,              // [m/s^2]
    commandLatency: 150      // [ms]
  },

  parkingNodeId: "Park_F01"  // nodeId
}
```

### 15.2 Snapshot stanu robota (RobotState)

`RobotState` jest pojedynczym wpisem stanu używanym w logach, replay i diagnostyce.

**Uwaga v0.4:** nie używamy już niejednoznacznego `progress.s`. Zamiast tego:

- `edgeProgress.edgeS` — metry na krawędzi,  
- `routeProgress.routeS` — metry na trasie (jeśli trasa jest przypisana).

```json5
{
  now: 123456789,            // [ms]
  tick: 4242,                // monotonic tick id

  robotId: "F01",
  fsmState: "GOING_TO_PICK", // enum

  pose: { x: -20.90, y: 1.25, yaw: 3.14 }, // [m,m,rad]
  speed: 0.7,                // [m/s]

  telemetryAge: 40,          // [ms] now - lastTelemetryTs
  telemetryOk: true,         // derived

  edgeProgress: {
    edgeKey: "E12@N1->N2",
    edgeS: 4.25,             // [m]
    lateralError: 0.05,      // [m]
    headingError: 0.02,      // [rad]
    confidence: 0.9          // [0..1]
  },

  // opcjonalnie, jeśli robot ma aktywną trasę:
  routeProgress: {
    routeId: "R_F01_T123",
    routeS: 17.90            // [m]
  },

  currentTaskId: "T123",

  reasonCode: "WAIT_CONFLICT_CELL", // see runtime: reason codes
  reasonDetails: { conflictCellId: "cell:E99@N9->N1:0" }
}
```

### 15.3 Zadanie (Task)

W MVP zadanie jest „pick & drop” między dwoma `ActionPoint` z mapy.

**Ważne:** w v0.4 `pick/drop.nodeId` zastępujemy jednoznacznym `actionPointId` (ID węzła typu `ActionPoint` z `CompiledMap`).

Akcje typu „widły” są parametrami **na ActionPoint**:

- `forkHeight.from` / `forkHeight.to` w [m] (opisujemy zmianę, nawet jeśli protokół robota przyjmuje tylko „to”).

```json5
{
  taskId: "T123",
  streamId: "S_PACKAGING_A",

  pick:  {
    actionPointId: "AP_PICK_07",
    duration: 12000,          // [ms]
    forkHeight: { from: 0.10, to: 0.60 } // [m]
  },

  drop:  {
    actionPointId: "AP_DROP_03",
    duration: 8000,           // [ms]
    forkHeight: { from: 0.60, to: 0.10 } // [m]
  },

  priority: 10,               // higher = more important
  createdAt: 123450000,       // [ms]
  status: "ASSIGNED",         // enum
  assignedRobotId: "F01"
}
```

### 15.4 Trasa (RoutePlan)

`RoutePlan` jest wynikiem RoutePlanner. Jest to **sekwencja krawędzi** (skierowanych) oraz metadane, które pozwalają mapować `edgeS → routeS`.

```json5
{
  routeId: "R_F01_T123",
  robotId: "F01",

  // sekwencja krawędzi skierowanych (zgodna z mapą)
  edges: [
    { edgeKey: "E12@N1->N2", length: 12.34, movestyle: "forward" },
    { edgeKey: "E23@N2->N3", length: 5.00,  movestyle: "reverse" }
  ],

  // prekomputacje do mapowania edgeS→routeS (opcjonalnie, ale zalecane)
  edgeRouteS0: [
    { edgeKey: "E12@N1->N2", routeS0: 0.0 },
    { edgeKey: "E23@N2->N3", routeS0: 12.34 }
  ],

  goalRef: { kind: "ActionPoint", id: "AP_PICK_07" }
}
```

### 15.5 Żądanie i grant korytarza (CorridorRequest / CorridorGrant)

**Uwaga o współrzędnych:**  
- `start.edgeS` jest na konkretnej krawędzi,  
- `holdPointRouteS` jest wzdłuż całej trasy (`routeS`).

```json5
{
  requestId: "REQ_F01_4242",
  robotId: "F01",
  now: 123456789,                    // [ms]
  routeId: "R_F01_T123",

  start: { edgeKey: "E12@N1->N2", edgeS: 4.25 },  // [m] postęp na krawędzi
  lookahead: 10.0,                   // [m] horyzont prefixu po trasie
  lookback: 1.0,                     // [m] ile trzymamy „za sobą” (anti‑flap)

  desiredCells: [
    "cell:E12@N1->N2:6",
    "cell:E12@N1->N2:7"
  ],

  // opcjonalnie: jeśli plan zakłada stop w węźle
  desiredNodeStopZones: ["N2"],

  // opcjonalnie: single‑lane tokeny, jeśli wchodzimy do korytarza
  desiredCorridorDirs: [
    { corridorId: "C_Aisle_7", dir: "A_TO_B" }
  ]
}
```

Odpowiedź LockManager (`CorridorGrant`) zwraca prefix przyznany + stop‑linę:

```json5
{
  grantId: "GRANT_F01_4242",
  robotId: "F01",
  now: 123456789,                  // [ms]

  granted: [
    { kind: "CORRIDOR_DIR", corridorId: "C_Aisle_7", dir: "A_TO_B" },
    { kind: "CELL", cellId: "cell:E12@N1->N2:6" },
    { kind: "CELL", cellId: "cell:E12@N1->N2:7" },
    { kind: "NODE_STOP_ZONE", nodeId: "N2" }
  ],

  holdPointRouteS: 5.60,           // [m] max dozwolona pozycja pivota na trasie
  reasonCode: "WAIT_CONFLICT_CELL" // powód przycięcia (jeśli przycięto)
}
```

### 15.6 RollingTargetCommand (FM → RobotGateway)

W v0.4 zmieniamy kluczową rzecz: **target nie jest punktem XY**.

Target to referencja do mapy:

- `LocationMark` — „zwykły” mark na trasie,
- `ActionPoint` — punkt operacyjny (pick/drop/fork/itp.).

Komenda niesie też twardy limit postępu (`stopLineRouteS`), czyli hold‑point policzony przez algorytm.

```json5
{
  commandId: "CMD_F01_9001",
  robotId: "F01",
  now: 123456789,                 // [ms]
  seq: 9001,

  routeId: "R_F01_T123",

  // target jako referencja do mapy:
  targetRef: { kind: "LocationMark", id: "LM35" },

  // pozycja targetu wzdłuż trasy (debug/metryki)
  targetRouteS: 12.30,            // [m]

  // stop‑linia (twardy limit bezpieczeństwa)
  stopLineRouteS: 10.80,          // [m]

  speedLimit: 0.8,                // [m/s] opcjonalnie
  mode: "GO"                      // GO | HOLD | STOP (patrz rozdz. 12 runtime)
}
```

#### 15.6.1 Mapowanie na RoboCore/Robokit (ramki)

Poniższe numery ramek pochodzą z adaptera Robokit używanego w repo (`packages/adapters-robokit/src/rbk.js`).

**Ruch do targetu (mark / action point):**

- `robot_task_gotarget_req = 3051`  
  payload (MVP, minimalny): `{ id: "<nodeId>" }`  
  gdzie `nodeId` jest ID `LocationMark` lub `ActionPoint`.

**Wstrzymanie / wznowienie (TRAFFIC_HOLD):**

- `robot_task_pause_req = 3001`  
- `robot_task_resume_req = 3002`

**Stop awaryjny (SAFETY_STOP / watchdog):**

- `robot_control_stop_req = 2000`

**Akcje wideł (na ActionPoint, w praktyce osobna faza FSM):**

- `robot_other_forkheight_req = 6040`  
  payload: `{ height: <metry> }`
- `robot_status_fork_req = 1028` (telemetria wideł / potwierdzenia)

**Telemetria ruchu / tasku (przykładowe):**

- `robot_status_loc_req = 1004` (pozycja / stacja / prędkość)  
- `robot_status_task_req = 1020` (status tasku go‑target / multistation)

**Kontrakt odpowiedzialności:**

- Fleet Manager wyznacza `targetRef` i `stopLineRouteS`.  
- RobotGateway **MUST** dopilnować, aby robot nie przekroczył `stopLineRouteS` (np. przez `pause`/`stop` z wyprzedzeniem, zależnie od prędkości i `d_stop`).

## 16. Strategia testów (MVP musi to mieć)

### 16.1 Piramida testów (wymaganie)

- Unit tests: Map Compiler (cells/conflicts), LockManager (grant/deny), HoldPoint, RTP limits.  
- Integration tests: tick pipeline na małej mapie (bez UI).  
- Scenario tests: golden scenariusze end‑to‑end (symulacja).  
- Property-based: generatory małych map + losowe start/goal → sprawdzaj inwarianty (S1..).

### 16.2 Symulacja bez czekania (time virtualization)

**[MVP] MUST:** testy nie mogą „sleepować”. Zegar jest wirtualny; tick wykonuje się tak szybko, jak CPU pozwala.

### 16.3 Testy równoległe

**[MVP] SHOULD:** testy scenariuszowe mogą iść równolegle (oddzielne procesy / seeds), deterministycznie.

### 16.4 Golden scenarios (fixtures) — minimalny zestaw

Każdy scenariusz ma:
- małą mapę + konfigurację robotów + taski,  
- oczekiwane kluczowe ticki: np. kto dostaje corridor, gdzie jest hold-point, brak kolizji, brak oscylacji.

Przykłady [MVP]:

1) **Head‑on single‑lane**: dwa roboty wchodzą do tego samego corridorId z obu stron → jeden dostaje dir token, drugi HOLD; po opróżnieniu corridor przełączenie kierunku.  
2) **Leader/follower**: dwa roboty w tym samym kierunku → drugi nigdy nie narusza stopStandoff.  
3) **Bliskie krawędzie bez połączenia**: dwa roboty jadą po różnych krawędziach, które biegną blisko siebie → conflictSet blokuje.  
4) **PASS_THROUGH node**: płynny przejazd przez węzeł styczny → brak NODE_STOP_ZONE, brak kolizji.  
5) **STOP_TURN node**: przejazd niestyczny → NODE_STOP_ZONE wymagany; drugi robot czeka.  
6) **Pose jump**: skok pozycji → SAFETY_STOP + re-sync, locki zamrożone.  
7) **Stale telemetry**: brak telemetrii → STOP, inni omijają (konserwatywnie).  
8) **Preemption parking**: robot jedzie do parkingu, pojawia się task → przełączenie na GOING_TO_PICK.

---

#### GS9 — Mijanka w wąskim korytarzu (dwa roboty, przeciwne kierunki, brak kolizji 2D)

**Mapa:** korytarz dwukierunkowy z geometrią pozwalającą na mijankę (np. „zatoczka” / lokalne poszerzenie).  
**Warunek:** `sweptShape: multiRect` jest na tyle wąskie na prostych, aby realnie dopuścić przejazd, ale na zakrętach uwzględnia tail‑swing.

**Oczekiwane:**
- jeśli geometria faktycznie pozwala na mijankę → LockManager dopuszcza jednoczesny ruch (brak konfliktów `CELL`),
- jeśli nie pozwala → LockManager wymusza oczekiwanie jednego robota (fail‑closed).

#### GS10 — Dwie różne krawędzie biegną blisko siebie (bez połączenia) + zakręt

**Mapa:** dwie krzywe krawędzie obok siebie (równoległe), w pewnym miejscu bardzo blisko; jedna ma zakręt.  
**Oczekiwane:** konflikt jest wykryty w 2D (`conflictSet`), mimo że korytarze są różne i 1D spacing nic by nie powiedział.

#### GS11 — Follow distance (`stopStandoff`) przy dwóch robotach na tym samym korytarzu

**Mapa:** długi prosty korytarz; dwa roboty jadą w tym samym kierunku, ten z przodu zwalnia/stopuje.  
**Oczekiwane:** robot z tyłu:
- nie zbliża się bliżej niż `stopStandoff` (wzdłuż `routeS`) do lidera,
- `hold_standoff` uwzględnia `d_stop(v)` (brak „dobijania” po stronie dynamiki).

#### GS12 — Node PASS vs STOP‑TURN (tangent vs non‑tangent)

**Mapa:** węzeł, przez który da się przejechać stycznie (bez zatrzymania) oraz wariant z ostrym skrętem (non‑tangent).  
**Oczekiwane:**
- tangent: brak rezerwacji pełnego obrotu 360° w `NODE_STOP_ZONE`,
- non‑tangent: rezerwacja `NODE_STOP_ZONE` jest wymagana zanim robot wjedzie w sekwencję stop+turn.



## 17. Miękkie wymagania wydajnościowe (SLO) [MVP]

To nie są twarde gwarancje, ale cele jakości:

- tick pipeline (bez I/O) powinien mieścić się w `tickBudgetSoft`.  
- Map Compiler może działać offline, ale powinien mieścić się w minutach dla typowej mapy (DEV).  
- conflictSet lookup MUST być O(1) (hash/set).  
- lockManager.tick powinien być ~O(R * K) gdzie R=roboty, K=komórki w lookahead (po indeksach).  
- logowanie na dysk nie może blokować ticka (bufor + flush async), ale intencje muszą być deterministyczne.
- jeśli flush na dysk się nie udaje (pełny dysk / I/O error), system przechodzi w `LOGGING_DEGRADED`: tick nadal działa, snapshoty trzymamy w RAM (ring‑buffer ostatnich N sekund), emitujemy alert diagnostyczny.

---

## 18. Ewolucja algorytmu (future-proof)

[FUTURE] Plan rozszerzeń bez przepisywania:

- jeszcze dokładniejsza geometria (np. więcej rectów / poly dla debug / model czasowy),  
- time‑reservations (okna czasowe na komórki),  
- multi‑lane corridors i mijanki,  
- globalne MAPF (solver) jako opcjonalny moduł,  
- lokalne omijanie przeszkód (width>0) w robotach,  
- lepsze recovery i automatyczne re-route przy dynamicznych przeszkodach.

---

## 19. Checklisty implementacyjne (MVP)

### 19.1 Map Compiler

- [ ] arc-length i długości krawędzi w metrach  
- [ ] corridorId merging (od skrzyżowania do skrzyżowania)  
- [ ] cells (cellLen) + swept shapes (`multiRect`)  
- [ ] conflictSet symetryczny + self  
- [ ] criticalSections (intersection)  
- [ ] transitions TANGENT/NON_TANGENT  
- [ ] compiledMapHash/paramsHash  
- [ ] walidator sceny (fail start jeśli brak)

### 19.2 Runtime (tick)

- [ ] deterministyczny tick (jawne sortowanie)  
- [ ] build CorridorRequest od aktualnego s (nie od początku edge)  
- [ ] LockManager tick (atomic) + grant prefix  
- [ ] direction token dla single-lane corridor  
- [ ] anti-gridlock (exitClearance)  
- [ ] hold-point (d_stop + hysteresis)  
- [ ] RTP (targetRef=LocationMark/ActionPoint; targetRouteS <= holdPointRouteS) + watchdog  
- [ ] reason codes  
- [ ] fail-closed na stale/offline/pose jump/off-route/stuck  
- [ ] log snapshot.jsonl + replay

---


---

## 20. Podział modułów i interfejsy (stabilne, future-proof)

Ta sekcja jest mostem między spec a implementacją. Celem jest łatwa wymienialność komponentów w przyszłości (również pod AI).

### 20.1 Planner (RoutePlanner)

```ts
export type RouteAnchor =
  | { kind: "EDGE"; edgeKey: string; edgeS: number }   // [m]
  | { kind: "NODE"; nodeId: string };                  // snap w ProgressEstimator

export type RouteGoal =
  | { kind: "LocationMark"; id: string }
  | { kind: "ActionPoint";  id: string };

export interface IRoutePlanner {
  planRoute(input: {
    startAnchor: RouteAnchor;
    goal: RouteGoal;
    compiledMap: CompiledMap;
    robotModel: RobotModel;
    robotCaps: RobotCapabilities;
  }): RoutePlan | null;
}
```

**[MVP] MUST:**
- planowanie od anchor (nie „nearest node” bez pamięci),
- respektowanie kierunkowości i `movestyle` na krawędzi,
- deterministyczne tie‑breaki przy wielu równych ścieżkach.

### 20.2 ProgressEstimator

```ts
export interface IProgressEstimator {
  projectPose(input: {
    now: number;             // [ms]
    pose: Pose;
    route: RoutePlan | null;
    compiledMap: CompiledMap;
  }): {
    edgeProgress: { edgeKey: string; edgeS: number; lateralError: number; headingError: number; confidence: number };
    routeProgress?: { routeId: string; routeS: number };
    offRoute: boolean;
    poseJump: boolean;
  };
}
```

**[MVP] MUST:** patrz runtime rozdz. 10.3.

### 20.3 CorridorBuilder

```ts
export interface ICorridorBuilder {
  build(input: {
    now: number;                // [ms]
    robot: RobotState;
    route: RoutePlan;
    compiledMap: CompiledMap;
    params: CorridorParams;
  }): CorridorRequest;
}
```

**[MVP] MUST:**
- generować uporządkowaną listę zasobów „wzdłuż trasy” od bieżącego `routeS` (oraz anchor `edgeS` do mapowania),
- uwzględniać `d_stop(v)` i `stopStandoff` przy doborze horyzontu,
- uwzględniać `transitionGeomKind` (TANGENT/NON_TANGENT) i `willStopAtNode` → `NODE_STOP_ZONE`.

### 20.4 LockManager

```ts
export interface ILockManager {
  tick(input: {
    now: number;                // [ms]
    robots: RobotState[];
    corridorRequests: CorridorRequest[];
    prevSnapshot: LockSnapshot;
    compiledMap: CompiledMap;
  }): {
    grants: CorridorGrant[];
    snapshot: LockSnapshot;
  };
}
```

**[MVP] MUST:**
- atomowość i deterministyczność,
- respektować konflikty 2D (cell conflictSet) + tokeny (`NODE_STOP_ZONE`, `CORRIDOR_DIR`, `CRITICAL_SECTION`),
- utrzymywać `occupied ⊆ granted` oraz deterministyczną politykę zwalniania (release + lookback),
- fairness + anti‑oscillation (w tym dir hold).

### 20.5 TaskDispatcher / Scheduler

```ts
export interface ITaskDispatcher {
  dispatch(input: {
    now: number;                // [ms]
    tasks: Task[];
    robots: RobotState[];
    compiledMap: CompiledMap;
  }): DispatchPlan;
}
```

### 20.6 RTP Controller

```ts
export interface IRtpController {
  computeCommand(input: {
    now: number;                 // [ms]
    robot: RobotState;
    route: RoutePlan;
    grant: CorridorGrant;
    compiledMap: CompiledMap;
  }): RollingTargetCommand;
}
```

**[MVP] MUST:**  
- `targetRouteS <= stopLineRouteS` (gdzie `stopLineRouteS = holdPointRouteS`),  
- `targetRef.kind ∈ {LocationMark, ActionPoint}`,  
- watchdog `rtpTimeout` (fail‑closed).

### 20.7 Robot Gateway (adapter do hardware/sim)

RobotGateway jest warstwą, która tłumaczy kontrakt Fleet Managera na konkretne ramki RoboCore/Robokit oraz pilnuje fail‑safe (watchdog, stop‑line).

```ts
export type RobotCommand =
  | RollingTargetCommand
  | { kind: "FORK_HEIGHT"; robotId: string; now: number; targetHeight: number }; // [m]

export interface IRobotGateway {
  send(commands: RobotCommand[]): void;

  // Telemetry is ingested separately; gateway MUST provide timestamps and lastAckSeq.
}
```

**[MVP] MUST:**  
- egzekwować `stopLineRouteS` (nie przekraczać),  
- rozróżniać `TRAFFIC_HOLD` vs `SAFETY_STOP` (patrz runtime),  
- realizować akcje wideł przez `robot_other_forkheight_req = 6040` (height w metrach).

Szczegóły ramek: zob. rozdz. 15.6.1.

### 20.8 Logger / Replay

```ts
export interface ILogSink {
  writeTick(record: TickRecord): void; // JSONL
}

export interface IReplayRunner {
  run(logPath: string, options?: { speed?: number; seekTick?: number }): void;
}
```

---

## 21. Plan wdrożenia MVP v1 (praktyczny)

To jest plan „żeby działało” — bez przepisywania w 3 tygodnie.

1) **Map Compiler (must-have)**
- arc-length + sampling geometrii,
- discretization na `cellLen`,
- conflictSet dla modelu `sweptShape: multiRect` (R_move),
- corridorId (single‑lane) + transitions TANGENT/NON_TANGENT,
- oznaczanie critical sections.

2) **ProgressEstimator + anchor start/goal**
- snap do geometrii (polyline/curve) zamiast nearest node,
- detekcja pose jump / off-route / confidence drop.

3) **LockManager DCL‑2D**
- centralny tick, atomowo,
- direction token dla single‑lane corridorId,
- greedy prefix allocation + pruning,
- fairness (aging) + anti‑oscillation (histereza, sticky grants),
- bramkowanie CS (exitClearance).

4) **CorridorBuilder**
- budowa request z lookahead/lookback,
- minimalny `d_stop(v)`.

5) **TaskScheduler/Dispatcher**
- deterministyczny wybór robota (ETA),
- auto‑parking + preempcja,
- pick/drop jako stany z czasem (dwell) + STOP_TURN w node.

6) **RTP Controller**
- target wewnątrz corridoru,
- respektowanie hold‑point,
- rate limiting / maxJump (opcjonalnie).

7) **Logging + replay**
- snapshoty JSONL na dysk (tick record),
- narzędzie replay (time warp),
- CLI do inspekcji.

8) **Testy**
- unit + integration + golden scenarios,
- bez czekania, równolegle,
- regresja: replay.

---

## 22. Specyfikacja i implementacja przyjazna AI (AI‑friendly)

### 22.1 Dane jako „test cases”

System SHOULD utrzymywać scenariusze jako dane wejściowe (fixtures), np. `scenarios/*.json5`:
- mapa (lub referencja do compiledMap),
- początkowe stany robotów,
- zdarzenia streamów (task available),
- parametry algorytmu,
- oczekiwane własności (inwarianty) i/lub ticki referencyjne.

AI (i ludzie) mogą wtedy:
- generować nowe scenariusze brzegowe,
- sprawdzać, czy inwarianty S1..D3 są spełnione,
- porównywać snapshoty ticków.

### 22.2 Kontrakty są ważniejsze niż implementacja

- Interfejsy z §20 i payloady z §15 to „porty”.
- Każdy payload MUST mieć wersję kontraktu (np. `compiledMapVersion`, `contractVersion`) i być kompatybilny wstecz w obrębie minorów.
- Walidator payloadów MUST działać w CI.

### 22.3 Deterministyczny replay jako „źródło prawdy”

- Każdy bug w ruchu floty MUST dać się odtworzyć z logu.
- Replay jest najlepszym datasetem do analizy przez AI (pełny kontekst, deterministyczny).

### 22.4 Checklisty i „Definition of Done”

Checklisty z §19 + golden scenarios z §16.4 są DoD dla MVP.

---

## 23. Decyzje konfiguracyjne (zamknięte dla MVP)

Ta sekcja zamyka „otwarte pytania” przez przyjęcie konserwatywnych decyzji dla MVP.

1) **Czy dopuszczamy >1 robota w tym samym corridor?**  
   **Tak.** Dopuszczamy, jeśli konflikt sets + stopStandoff na lead zapewniają brak naruszeń. W praktyce często i tak wyjdzie „1 robot”, jeśli corridor jest bardzo wąski.

2) **Jak liczymy `d_stop(v)`?**  
   MVP: wzór z §11.3. Parametry `brake` i `commandLatency` MUSZĄ pochodzić z konfiguracji robota i być logowane.

3) **Jaki tick?**  
   MVP: `tickPeriod` w zakresie 50–200ms (konfig), deterministyczny. Symulacja testowa jest time‑virtualized i nie śpi.

4) **Single‑lane vs mijanki**  
   MVP: `singleLane=true` dla wąskich corridorów bez mijanek; `singleLane=false` tylko tam, gdzie Map Compiler ma jawnie oznaczone „passingPlace”. Brak oznaczenia = traktuj jako single‑lane (bezpieczniej).

5) **Critical sections**  
   MVP: CS generowane na bazie klastrów konfliktów 2D (np. intersection polylines) + ręczne tagi w mapie. Capacity=1.

6) **Więcej niż jeden robot w węźle**  
   MVP: `nodeCapacity=1` dla STOP_TURN i pick/drop. Sloty węzłowe są [MVP] SHOULD, ale można je odłożyć jeśli mapy są „czyste”.

---


---

## 24. Rzeczy usunięte / przeniesione (dla kompletności)

Ta sekcja zawiera treści, które nie są częścią „jak ma być” (spec nowego systemu), ale są zachowane, żeby nic nie zginęło w historii.

### 24.1 Zmiany nazewnictwa (v0.2 → v0.3)

W v0.3 usunięto jednostki z nazw pól. Mapowanie (dla czytelności):

- `cellLenM` → `cellLen`  
- `lockLookaheadM` → `lockLookahead`  
- `lockLookbackM` → `lockLookback`  
- `rtpLookaheadM` → `rtpLookahead`  
- `exitClearanceM` → `exitClearance`  
- `edgeDirHoldMs` → `edgeDirHold`  
- `fairnessMaxWaitMs` → `fairnessCap` (logika aging: §11.5.2)  
- `holdHysteresisM` → `holdHysteresis`  
- `telemetryTimeoutMs` → `telemetryTimeout`  
- `poseJumpThresholdM` → `poseJumpThreshold`  
- `maxLateralErrorM` → `maxLateralError`  
- `stuckTimeoutMs` → `stuckTimeout`  
- `stopStandOffM` → `stopStandoff`  
- `safetyFrontM` → `safetyFront`, `safetyRearM` → `safetyRear`, `safetySideM` → `safetySide`  
- `poseMarginM` → `poseMargin`, `trackingMarginM` → `trackingMargin`  
- `commandLatencyMs` → `commandLatency`


### 24.1.1 Zmiany nazewnictwa (v0.3 → v0.4)

Dodatkowe ujednolicenia po recenzjach:

- `tickMs` → `tickPeriod`  
- `rtpHz` → `rtpRate`  
- `telemetryHzMin` → `telemetryRateMin`  
- `tangentEpsRad` → `tangentEps`  
- `NODE_TURN(nodeId)` → `NODE_STOP_ZONE(nodeId)`  
- `transitionKind = TANGENT|NON_TANGENT` → `transitionGeomKind = TANGENT|NON_TANGENT`

### 24.2 Analiza prototypu / pitfalls w obecnym kodzie (kontekst)

Poniższe punkty są zachowane jako analiza prototypu (spike). Nowy system nie ma dziedziczyć tych decyzji „wprost”.

#### 24.2.1 `apps/task-manager/lib/edge_lock_policy.js` – dlaczego to “nie działa zbyt dobrze”

Najważniejsze problemy:

1) **Rezerwacja całej ścieżki na dispatch**  
   `reservePath(...)` lockuje wszystkie krawędzie i węzły na trasie aż do celu.  
   Efekt: przepustowość dramatycznie spada, rośnie ryzyko „kaskadowych blokad”.

2) **Brak horyzontu w metrach**  
   Nie ma „sliding window” — locki nie „jadą razem z robotem”.

3) **Brak spacing 2D**  
   Jeśli `allowSameDirection=true`, to dwa roboty mogą dostać tę samą krawędź w tym samym kierunku bez kontroli dystansu → ryzyko dogonienia.

4) **Node locks zbyt uproszczone**  
   Węzeł jest lockowany bez promienia obrotu 360° i bez geometrii „blisko węzła”.

5) **Start fallback = nearest node**  
   Gdy brak `current_station`, kod bierze najbliższy node po x/y — bywa złe na rozwidleniach.

6) **TTL locków jako „bezpiecznik”**  
   TTL to nie jest mechanizm bezpieczeństwa. Jeśli lock wygaśnie, a robot nadal jedzie — masz potencjalny konflikt.

7) **Pitfall integracyjny**  
   Task-manager lockuje trasę policzoną lokalnie, ale wysyła do robota tylko `go-target` (robot może dobrać inną trasę).  
   Jeśli robot pojedzie inaczej niż zaplanowano, locki tracą sens. Rozwiązanie: wspólny planner / wysyłanie trasy/RTP.

#### 24.2.2 `packages/core-mapf/src/index.js` – to nie jest prawdziwy MAPF

`planMultiAgent(...)` planuje w praktyce niezależnie (single‑agent) i nie rozwiązuje konfliktów globalnie.

#### 24.2.3 `packages/sim-runtime/src/fleet_sim.js` – działa, ale…

To dobre źródło mechanizmów (queues, locks), ale ma ryzyka:
- monolit (trudno testować),
- node lock radius może być za mały dla obrotu,
- spacing zależy od wiarygodnego `segmentProgress`.

### 24.3 Elementy usunięte / zastąpione

- TTL jako „mechanizm bezpieczeństwa” — zastąpione przez politykę stale/offline + deterministyczny tick (§13).  
- Założenie „1D spacing na krawędzi wystarczy” — zastąpione przez konflikty 2D w CompiledMap (§7.5).  
- Backoff/reverse jako sposób rozwiązywania konfliktów — zakazane; zastąpione przez direction lock + bramkowanie CS (§11.6, §11.7).

- (v0.4) Zapisy sugerujące, że **RobotGateway** jest jedynym egzekutorem `stopLineRouteS` przy rzadkich markach — w v0.5 odpowiedzialność jest po stronie **Fleet Managera** (`mode` + konserwatywne `d_stop(v)`), a Gateway jest warstwą fail‑safe (watchdog + `SAFETY_STOP`).
