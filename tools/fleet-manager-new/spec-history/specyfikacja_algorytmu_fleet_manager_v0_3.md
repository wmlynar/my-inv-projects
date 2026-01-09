# Specyfikacja algorytmu harmonogramowania i zarządzania ruchem dla Fleet Manager (v0.3)

**Data:** 2026-01-06  
**Status:** Draft implementowalny (MVP v1) + roadmap (future)  
**Zakres:** *task scheduling* + *traffic scheduling (Deterministic Corridor Locking 2D, DCL‑2D)* + *Rolling Target Point (RTP)* + kontrakty danych + testy/logi/replay.  
**Cel nadrzędny:** mieć algorytm, który **działa deterministycznie i bezpiecznie**, a jednocześnie ma interfejsy i punkty rozszerzeń tak, żeby kolejne wersje były łatwe do zrobienia.

---

## Changelog

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

## Doprecyzowania do v0.3 (brief do tej wersji)

Poniższe punkty są traktowane jako wymagania wejściowe do v0.3 (z rozmowy i recenzji):

- Potrzebna jedna tabelka: podsumowanie wymagań geometrycznych (np. błąd lokalizacji), czasowych/częstotliwościowych (telemetria, tick), prędkościowych itd.
- Podsumować wszystkie twarde wymagania.
- Rozdzielić wymagania dla MVP i dla przyszłych wersji w osobnych sekcjach.
- Ujednolicić nazewnictwo: brak jednostek w nazwach pól; jednostki są globalnie zdefiniowane i opisane w komentarzach.
- W payloadach (JSON5) dodać komentarze: znaczenie, cel, jednostki.
- Doprecyzować wszystkie miejsca niejednoznaczne; jeśli czegoś brakuje — przyjąć założenia i zdefiniować.
- Dodać miękkie wymagania wydajnościowe.
- Uporządkować duplikacje i niespójności; ujednolicić pojęcia.
- Bardzo wyraźnie: chodzi o **2D spacing** (geometria, zakręty, bliskie krawędzie), a nie tylko 1D po krawędzi.
- Dodać precyzyjne protokoły tam, gdzie to potrzebne.
- Dodać checklisty „co musi być zaimplementowane”.
- Dodać diagramy ASCII.
- Dodać przykłady payloadów dla wszystkich kluczowych struktur.
- Doprecyzować ruch przodem/tyłem: w zależności od kierunku ruchu „lead extent” to `head` lub `tail`; niezależnie od tego robot MUSI zatrzymać się w minimalnej odległości przed innym robotem.
- Długie, wąskie korytarze z wieloma węzłami: rezerwacje kierunku i head‑on safety nie mogą działać tylko na pojedynczej krawędzi — potrzebny *corridorId* od skrzyżowania do skrzyżowania.
- Dodać pseudokod: co się dzieje w każdym ticku.
- Doprecyzować atomowość i deterministyczność.
- Doprecyzować direction arbitration.
- Dodać jednoznaczny state machine.
- Dopisać sekcję „capabilities robota”.
- Zdefiniować precyzyjnie skompilowaną mapę i algorytmy kompilacji.
- Dodać golden scenarios (fixtures) z oczekiwanym wynikiem.
- Spec ma być production‑ready i implementowalna (bez „TBD” jako wymówki).
- **Ważne:** jeśli robot przejeżdża przez węzeł płynnie (ścieżki są styczne) i nie zatrzymuje się, nie musi rezerwować miejsca na pełny obrót 360°; jeśli ścieżki nie są styczne, robot zatrzyma się, wykona obrót i wtedy węzeł musi być zarezerwowany na obrót.
- Rozpisać, jak wyznaczamy korytarze/obwiednie poruszania się wózka po krzywych tak, żeby nie było kolizji nawet gdy różne krawędzie biegną blisko siebie (nawet jeśli się nie łączą).

## Cel dokumentu

Zdefiniować **nowy algorytm** Fleet Managera w sposób:

- jednoznaczny i implementowalny,
- deterministyczny (replay),
- bezpieczny geometrycznie w 2D,
- odporny na błędy telemetrii i sieci,
- modularny i „AI‑friendly” (kontrakty + golden scenarios + checklists),
- z jasnym MVP, który działa, oraz z planem ewolucji.

---

# Część 2 — Specyfikacja (v0.3)

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
| Telemetria | `telemetryHzMin` | Hz | [MVP] | ≥ 5 | Minimalna częstotliwość statusu robota. |
| Telemetria | `telemetryTimeout` | ms | [MVP] | 500–2000 | Po tym czasie telemetria uznana za „stale” → fail‑closed. |
| Komendy | `commandLatency` | ms | [MVP] | ≤ 200 | Max opóźnienie „komenda → robot zaczyna wykonywać” (użyte w stop distance). |
| Tick engine | `tickMs` | ms | [MVP] | 50–200 | Okres ticka (deterministyczny). |
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
| Wydajność ticka | `tickBudgetSoft` | ms | [MVP] | < tickMs * 0.5 | Miękki budżet CPU na tick (bez I/O). |
| Skalowanie | `robotsSoftMax` | szt. | [MVP] | 20–50 | Miękki cel: tyle robotów ma działać bez degradacji jakości w typowej mapie. |

**[MVP] MUST:** wszystkie parametry z tabeli muszą być logowane razem z `compiledMapHash` i `paramsHash`.

---

## 2. Assumptions & Guarantees (twardy kontrakt)

Ta sekcja to „umowa”: jeśli spełniasz assumptions, dostajesz guarantees. Jeśli assumptions są złamane, system przechodzi w tryb fail‑closed (bezpieczeństwo kosztem throughput).

### 2.1 Assumptions (wejściowe warunki prawdziwości gwarancji)

**A‑Geo** [MVP] Roboty poruszają się zgodnie z globalną trasą po grafie; lokalne odchylenia są ograniczone przez `trackingMargin` oraz `maxLateralError`.  
**A‑Pose** [MVP] Błąd lokalizacji jest ograniczony przez `poseMargin` (albo robot jest oznaczany jako „unknown” i traktowany jako przeszkoda).  
**A‑Telem** [MVP] Telemetria spełnia `telemetryHzMin` i `telemetryTimeout`; w przeciwnym razie robot jest fail‑closed (STOP + inflacja).  
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
- **S2** [MVP] Stop‑standoff: robot nie zbliża się do innego robota poniżej `stopStandoff` w kierunku ruchu (realizowane przez inflację lead).  
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
- **Resource**: abstrakcja locka (CELL, NODE_TURN, CORRIDOR_DIR, CRITICAL_SECTION).  
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

## 7. Model mapy i etap prekompilacji (Map Compiler)

W MVP v1 runtime ma być prosty. Cała ciężka geometria dzieje się w Map Compiler.

### 7.1 Wejście mapy (Graph)

Wejście do Map Compiler:

- `nodes[]`: id, (x,y), atrybuty (np. pick/drop/parking).  
- `edges[]`: id, from, to, geometria 2D (krzywa), długość, dozwolone kierunki, `movestyle` per kierunek, opcjonalnie `width` (korytarz fizyczny).

**[MVP] MUST:** pick i drop to węzły (`nodeId`), nie „punkt na krawędzi”.

### 7.2 Parametryzacja po długości (arc-length)

Map Compiler MUSI zapewnić, że każda krawędź ma parametr `s` w metrach (arc‑length), a nie „t”.

- `s=0` na początku krawędzi kierunkowej, `s=L` na końcu.  
- Komórki rezerwacji mają zakresy `[s0, s1)`.

### 7.3 CorridorId: klasyfikacja wąskich korytarzy (single-lane)

Problem „długiego korytarza z wieloma węzłami po drodze” oznacza, że single-lane nie może być tylko „jedna krawędź”.

**[MVP] MUST:** Map Compiler generuje `corridors[]` (corridorId), które są ciągami krawędzi:

- corridor zaczyna się i kończy w **węzłach decyzyjnych** (skrzyżowania / rozwidlenia / strefy mijania),  
- w środku corridoru mogą być węzły „techniczne” (segmentacja geometrii), ale one nie zmieniają tego, że to jeden fizyczny przejazd.

Prosta heurystyka MVP (deterministyczna):

- corridor rośnie wzdłuż grafu tak długo, jak:
  - każdy węzeł pośredni ma stopień 2 (dla korytarza),  
  - brak alternatywnych wyjść (brak rozwidlenia),  
  - `width` i atrybuty ruchu nie zmieniają klasy (np. single-lane),  
  - brak oznaczenia „passingPlace=true”.

Jeśli nie da się jednoznacznie zbudować corridorów, Map Compiler MUSI wygenerować ostrzeżenie i może zdegradować do „edge-level” z dodatkowym oznaczeniem CS (bardziej konserwatywne).

### 7.4 Dyskretyzacja na komórki rezerwacji (cells)

Każdy `edgeKey` jest dzielony na komórki o długości `cellLen`:

- `cellId` jest deterministyczne (patrz §7.9).  
- Komórka ma geometrię (polyline/curve segment + swept corridor polygon).  
- Komórka zna: `edgeKey`, `corridorId`, `[s0,s1)`, `isTurnSegment` (dla turningExtraMargin).

**[MVP] MUST:** robot może rezerwować tylko prefiks komórek **od swojego aktualnego `s` w kierunku ruchu**, a nie „od początku krawędzi”.

### 7.5 Konflikty 2D (conflict sets)

Map Compiler wyznacza konflikty 2D pomiędzy komórkami (oraz pomiędzy komórkami i zasobami typu NODE_TURN).

**MVP model konfliktu:**
- każda komórka ma polygon swept corridor (dyskowy Minkowski sum).  
- konflikt zachodzi, jeśli polygony się przecinają lub odległość < 0 (po uwzględnieniu inflacji).

**[MVP] MUST:** `conflictSet` jest:
- **symetryczny**: jeśli `B` konfliktuje z `A`, to `A` konfliktuje z `B`,  
- **zawiera self**: komórka konfliktuje sama ze sobą (ułatwia implementację „zajęte, jeśli przyznane”).

### 7.6 Tranzycje w węzłach: PASS_THROUGH vs STOP_TURN

Map Compiler generuje tablicę tranzycji:

- dla każdego węzła i każdej pary (incomingEdgeKey, outgoingEdgeKey) definiuje `transitionKind`:

  - `PASS_THROUGH` jeśli:
    - krzywe są styczne w węźle w tolerancji `tangentEps` (np. 5°), **i**
    - planner deklaruje, że nie ma obowiązkowego stopu (np. brak pick/drop, brak zmiany `movestyle`, brak wymuszonego „alignment”).  
  - w przeciwnym razie `STOP_TURN`.

W praktyce, w MVP v1 decyzja „czy będzie stop” może być w części po stronie planner/scheduler (np. pick/drop zawsze stop). Dlatego `transitionKind` w CompiledMap jest **górnym ograniczeniem**:
- `PASS_THROUGH` oznacza „można przejechać bez obrotu, jeśli runtime nie wymusi stopu”,  
- `STOP_TURN` oznacza „obrót jest wymagany (brak styczności)”.

Runtime MUSI traktować STOP_TURN jako wymagający `NODE_TURN`.

### 7.7 Węzły jako obszary i sloty (opcjonalne, ale MVP‑ready)

Ponieważ dopuszczasz „więcej niż jeden robot w obrębie węzła” w pewnych przypadkach, model węzła jako punktu jest niewystarczający.

**[MVP] SHOULD:** Map Compiler może generować `nodeSlots[]`:
- sloty są punktami w obszarze węzła (np. 2–4 punkty),  
- każdy slot ma konflikt z innymi slotami jeśli dyski `R_turn` się przecinają.

MVP może zacząć od `nodeCapacity=1` (najbezpieczniej), a sloty włączyć później — bez zmiany runtime (to tylko więcej zasobów).

### 7.8 Wersjonowanie artefaktów mapy

CompiledMap ma:

- `compiledMapVersion` (semver),  
- `sourceMapHash` (hash wejściowej mapy),  
- `compiledMapHash` (hash wyniku),  
- `paramsHash` (hash parametrów kompilacji: cellLen, marginesy domyślne, tangentEps, itd.).

**[MVP] MUST:** te hashe są logowane w każdym snapshotcie.

### 7.9 Stabilne identyfikatory (ważne dla determinism + replay)

- `cellId` MUST być deterministyczne względem:
  - `edgeKey`, `cellIndex`, `compiledMapVersion`, `cellLen`, `sourceMapHash`  
- `conflictId` (jeśli używane) MUST być deterministyczne względem par cellId (np. `min(cellA,cellB) + ":" + max(...)`).

---

## 8. Kontrakt danych: CompiledMap (JSON5, z komentarzami)

Ta sekcja jest „twardym interfejsem” między Map Compiler a runtime.

### 8.1 Minimalny schema (MVP)

Poniżej przykładowy payload (JSON5). Komentarze są częścią dokumentacji.

```json5
{
  compiledMapVersion: "0.3.0",          // semver: wersja formatu CompiledMap
  sourceMapHash: "sha256:...",           // hash surowej mapy wejściowej
  compiledMapHash: "sha256:...",         // hash tej struktury (po kompilacji)
  paramsHash: "sha256:...",              // hash parametrów kompilacji

  units: { distance: "m", time: "ms", angle: "rad" },

  meta: {
    cellLen: 0.75,                       // [m] długość komórki
    tangentEpsRad: 0.087266,             // [rad] ~5° tolerancja styczności
  },

  nodes: [
    { nodeId: "N1", x: 0.0, y: 0.0 },     // [m]
    // ...
  ],

  // Krawędzie kierunkowe (edgeKey) — każda ma geometrię i parametryzację po s.
  edges: [
    {
      edgeKey: "E12@N1->N2",              // stable id: edgeId + direction
      fromNodeId: "N1",
      toNodeId: "N2",
      length: 12.34,                      // [m]
      movestyle: "forward",               // "forward" | "reverse" — jak robot jedzie na tej krawędzi
      corridorId: "C_Aisle_7",            // fizyczny korytarz (single-lane)
      geometry: {
        kind: "polyline",                 // MVP: polyline; FUTURE: bezier, spline
        points: [                         // [m]
          { x: 0.0, y: 0.0 },
          { x: 3.0, y: 0.0 },
          { x: 6.0, y: 1.0 },
        ],
      },
    },
  ],

  corridors: [
    {
      corridorId: "C_Aisle_7",
      singleLane: true,                   // wąski korytarz: jeden kierunek naraz
      edgeKeys: ["E12@N1->N2", "E23@N2->N3"], // ciąg krawędzi w korytarzu (od skrzyż. do skrzyż.)
    },
  ],

  // Komórki rezerwacji. Każda ma zakres s i conflictSet.
  cells: [
    {
      cellId: "cell:E12@N1->N2:0",
      edgeKey: "E12@N1->N2",
      corridorId: "C_Aisle_7",
      s0: 0.0,                             // [m] początek zakresu na krawędzi
      s1: 0.75,                            // [m] koniec zakresu
      isTurnSegment: false,                // wpływa na turningExtraMargin
      // Obszar 2D swept corridor dla tej komórki (MVP: dysk Minkowski sum).
      sweptPolygon: {
        kind: "aabb",                      // MVP: uproszczony; FUTURE: polygon
        minX: -0.5, minY: -0.5,            // [m]
        maxX:  1.2, maxY:  0.5,
      },
      conflictSet: [
        "cell:E12@N1->N2:0",               // self
        "cell:E12@N1->N2:1",
        "cell:E34@N3->N4:7",
      ],
      criticalSectionId: null,             // lub np. "CS:Intersection_1"
    },
  ],

  criticalSections: [
    {
      criticalSectionId: "CS:Intersection_1",
      cellIds: ["cell:E12@N1->N2:5", "cell:E99@N9->N1:0"],
      // capacity=1 (MVP). FUTURE: capacity>1.
      capacity: 1,
    },
  ],

  // Tranzycje w węzłach: PASS_THROUGH vs STOP_TURN.
  transitions: [
    {
      nodeId: "N2",
      incomingEdgeKey: "E12@N1->N2",
      outgoingEdgeKey: "E23@N2->N3",
      transitionKind: "PASS_THROUGH",      // "PASS_THROUGH" | "STOP_TURN"
    },
  ],
}
```

**[MVP] MUST:** runtime nie może uruchomić sceny bez poprawnego CompiledMap (walidator).

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

  progress: {
    edgeKey: "E12@N1->N2",
    s: 4.25,                 // [m]
    lateralError: 0.05,      // [m]
    headingError: 0.02,      // [rad]
    confidence: 0.9          // [0..1]
  },

  currentTaskId: "T123",
  reasonCode: "WAIT_CONFLICT_CELL", // see §11.9
  reasonDetails: { conflictCellId: "cell:E99@N9->N1:0" }
}
```

### 15.3 Zadanie (Task)

```json5
{
  taskId: "T123",
  streamId: "S_PACKAGING_A",

  pick:  { nodeId: "Pick_07", duration: 12000 }, // [ms]
  drop:  { nodeId: "Drop_03", duration: 8000 },  // [ms]

  priority: 10,                    // higher = more important
  createdAt: 123450000,            // [ms]
  status: "ASSIGNED",              // enum
  assignedRobotId: "F01"
}
```

### 15.4 Trasa (RoutePlan)

```json5
{
  routeId: "R_F01_T123",
  robotId: "F01",
  edges: [
    { edgeKey: "E12@N1->N2", length: 12.34, movestyle: "forward" },
    { edgeKey: "E23@N2->N3", length: 5.00,  movestyle: "reverse" }
  ],
  goalNodeId: "Pick_07"
}
```

### 15.5 Żądanie i grant korytarza (CorridorRequest / CorridorGrant)

```json5
{
  requestId: "REQ_F01_4242",
  robotId: "F01",
  now: 123456789,                  // [ms]
  routeId: "R_F01_T123",

  start: { edgeKey: "E12@N1->N2", s: 4.25 }, // [m]
  lookahead: 10.0,                 // [m]
  lookback: 1.0,                   // [m] opcjonalnie

  desiredCells: [
    "cell:E12@N1->N2:6",
    "cell:E12@N1->N2:7",
    "cell:E12@N1->N2:8"
  ],

  // Wymagane zasoby dodatkowe (dla STOP_TURN / single-lane / CS)
  desiredResources: [
    { kind: "CORRIDOR_DIR", corridorId: "C_Aisle_7", dir: "A_TO_B" },
    { kind: "CRITICAL_SECTION", criticalSectionId: "CS:Intersection_1" },
    { kind: "NODE_TURN", nodeId: "N2" }
  ]
}
```

```json5
{
  grantId: "GRANT_F01_4242",
  robotId: "F01",
  now: 123456789,                  // [ms]
  granted: [
    { kind: "CORRIDOR_DIR", corridorId: "C_Aisle_7", dir: "A_TO_B" },
    { kind: "CELL", cellId: "cell:E12@N1->N2:6" },
    { kind: "CELL", cellId: "cell:E12@N1->N2:7" }
  ],

  holdPointS: 5.60,                // [m] max dozwolona pozycja pivota na trasie
  reasonCode: "WAIT_CONFLICT_CELL" // powód przycięcia (jeśli przycięto)
}
```

### 15.6 Komenda RTP do robota (RollingTargetCommand)

```json5
{
  commandId: "CMD_F01_4242",
  robotId: "F01",
  now: 123456789,                  // [ms]
  routeId: "R_F01_T123",

  targetS: 6.90,                   // [m] ≤ holdPointS
  // opcjonalnie: targetPose (wyliczony z geometrii)
  targetPose: { x: -18.0, y: 1.30, yaw: 3.12 },

  speedLimit: 0.8,                 // [m/s] opcjonalne ograniczenie
  mode: "GO"                       // "GO" | "HOLD" | "STOP"
}
```

---

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
4) **PASS_THROUGH node**: płynny przejazd przez węzeł styczny → brak NODE_TURN, brak kolizji.  
5) **STOP_TURN node**: przejazd niestyczny → NODE_TURN wymagany; drugi robot czeka.  
6) **Pose jump**: skok pozycji → SAFETY_STOP + re-sync, locki zamrożone.  
7) **Stale telemetry**: brak telemetrii → STOP, inni omijają (konserwatywnie).  
8) **Preemption parking**: robot jedzie do parkingu, pojawia się task → przełączenie na GOING_TO_PICK.

---

## 17. Miękkie wymagania wydajnościowe (SLO) [MVP]

To nie są twarde gwarancje, ale cele jakości:

- tick pipeline (bez I/O) powinien mieścić się w `tickBudgetSoft`.  
- Map Compiler może działać offline, ale powinien mieścić się w minutach dla typowej mapy (DEV).  
- conflictSet lookup MUST być O(1) (hash/set).  
- lockManager.tick powinien być ~O(R * K) gdzie R=roboty, K=komórki w lookahead (po indeksach).  
- logowanie na dysk nie może blokować ticka (bufor + flush async), ale intencje muszą być deterministyczne.

---

## 18. Ewolucja algorytmu (future-proof)

[FUTURE] Plan rozszerzeń bez przepisywania:

- dokładniejsza geometria (rectangle sweep zamiast dysku),  
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
- [ ] cells (cellLen) + swept polygons  
- [ ] conflictSet symetryczny + self  
- [ ] criticalSections (intersection)  
- [ ] transitions PASS_THROUGH/STOP_TURN  
- [ ] compiledMapHash/paramsHash  
- [ ] walidator sceny (fail start jeśli brak)

### 19.2 Runtime (tick)

- [ ] deterministyczny tick (jawne sortowanie)  
- [ ] build CorridorRequest od aktualnego s (nie od początku edge)  
- [ ] LockManager tick (atomic) + grant prefix  
- [ ] direction token dla single-lane corridor  
- [ ] anti-gridlock (exitClearance)  
- [ ] hold-point (d_stop + hysteresis)  
- [ ] RTP (targetS <= holdPointS) + watchdog  
- [ ] reason codes  
- [ ] fail-closed na stale/offline/pose jump/off-route/stuck  
- [ ] log snapshot.jsonl + replay

---


---

## 20. Podział modułów i interfejsy (stabilne, future-proof)

Ta sekcja jest mostem między spec a implementacją. Celem jest łatwa wymienialność komponentów w przyszłości (również pod AI).

### 20.1 Planner (RoutePlanner)

```ts
export interface IRoutePlanner {
  planRoute(input: {
    startAnchor: RouteAnchor;   // edgeKey+s albo nodeId (snap w ProgressEstimator)
    goal: RouteGoal;            // nodeId (pick/drop/park)
    compiledMap: CompiledMap;
    robotModel: RobotModel;
    robotCaps: RobotCapabilities;
  }): RoutePlan | null;
}
```

**[MVP] MUST:**
- planowanie od anchor (nie „nearest node”),
- respektowanie kierunkowości i `movestyle` na krawędzi.

### 20.2 ProgressEstimator

```ts
export interface IProgressEstimator {
  projectPose(input: {
    pose: Pose;
    route: RoutePlan;
    compiledMap: CompiledMap;
  }): Progress; // edgeKey+s + błędy + confidence
}
```

**[MVP] MUST:**
- stabilna projekcja na geometrię (bez skakania między krawędziami),
- detekcja pose jump i off-route.

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
- generować uporządkowaną listę zasobów „wzdłuż trasy” od bieżącego `s`,
- uwzględniać minimalny `d_stop(v)` oraz STOP_TURN (NODE_TURN) vs PASS_THROUGH.

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
- fairness + anti‑oscillation,
- direction arbitration w single‑lane,
- reason codes.

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
    now: number;                // [ms]
    robot: RobotState;
    route: RoutePlan;
    grant: CorridorGrant;
    compiledMap: CompiledMap;
  }): RollingTargetCommand;
}
```

**[MVP] MUST:** `targetS <= holdPointS` oraz watchdog.

### 20.7 Robot Gateway (adapter do hardware/sim)

```ts
export interface IRobotGateway {
  send(commands: RollingTargetCommand[]): void;
  // Telemetry is ingested separately; gateway MUST provide timestamps.
}
```

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
- conflictSet dla modelu dyskowego (R_move),
- corridorId (single‑lane) + transitions PASS_THROUGH/STOP_TURN,
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
   MVP: `tickMs` w zakresie 50–200ms (konfig), deterministyczny. Symulacja testowa jest time‑virtualized i nie śpi.

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

