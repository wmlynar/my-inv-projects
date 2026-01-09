# Specyfikacja algorytmu harmonogramowania i rezerwacji korytarzy dla Fleet Manager

## 1. Prompt użytkownika i cel dokumentu

### 1.1. Prompt (oryginalna treść)

zallaczam projekt feet managera, zapoznaj sie z nim i z dokumentacja. fleet manager to program do zarzadania autonomicznymi wozkami widlowymi. chodzi mi o opracowanie specyfickacji do nowego algorytmu harmonogramowania wozkow. w tym projekcie sa algorytmy. ale nei dzialaja zbyt dobrze. chodzi mo o to, zeby wypracowac algorytm i interfejsy takie, zebym w przyszlosci mogl zrobic lepsza wersje. natomiast na chwile obecna skupic sie na algorytmie ktory dziala. chodzi o to, ze mamy zadanie wyspecyfikowane w postaci strumienia pracy. strumien pracy ma zdefiniowane punkty skad pobieramy towar i dokad go zawozimy. jezeli warunki sa spelnione to algorymt powinien uzyc wozka widlowego, zebo on pojechal po towar do miejsca pobrania, pobral go, nastepnie pojechal do miejsca odkladczego i go odlozyl. jezelil sa kolejne mozliwe zadania z tego lub innego strumienia to podjal sie ich wykonywania a jezeli nie to niech pojedzie na miejsce parkingowe. no i jezeli jest w trakcie jazdy do miejsca parkingowega a pojawi sie nowe zadanie to niech sie go podejmie. mapa jest w postaci grafu, wozki moga jezdzic po grafie. wozki moga zawracac i obracac sie w miejscu w wezlach grafu. kazdy brzeg grafu ma okreslony w jakim kierunku mozna sie poruszac i czy wozek porusza sie tylem czy przodem. kazdy wozek widlowy ma okreslony punkt parkingowy na mapie. model poruszania sie wozka to odwrocony trojkolowiec. srodek ukladu wspolrzdnych wozka jest pomiedzy przednimi kolami wozka wislowego. model okreslaja 3 parametry, head, tail i width. chodzi o to, zeby dwa lub wiecej wozkow widlowych poruszalo sie po mapie i nigdy nie bylo szans, zeby sie do siebie zblizyly na odleglosc x od przodu wozka i y od tylu wozka. czyli musza byc przewidziane korytarze / obwiednie trajektorii poruszania sie wozkow. na poczatek algorytm powinien uzyc rozwiazania deterministic locking. niw powinny zdarzac sie deadlocki i zakleszczenia wozkow. w tym algorytmie wozek moze sobie blokowac trase na pewna ilosc metrow do przodu, dajmy na to horyzont rezerwacji. inne wozki nie powinny sie zblizac do horyzontu rezerwacji zgodnie z wymaganiami wyzej. alogrytm powinien zalozyc, ze w kazdym wezle kazdy wozek widlowy moze obrocic sie o 360 stopni, wiec powinien to brac pod uwage przy zblizaniu sie. oczywiscie nawet jak wozek stoi w danym miejscu czy to w wezle czy bliksko wezla czy po srodku brzegu to dalej powinny byc spelnione te podstawowe reguly ze zaden inny owzek nie moze sie zblizyc do niego zgodnie z tymi zasadami a jezeli jest w wezle to musi mu dac mozliwosc obrocenia sie, jezei sobie zarezerowwal dany wezel. pisalles tez o tym, ze w razie konfliktu rezerwacji jest wyznaczana jakas kolejka priorytetow, jeden wozek trzyma rezerwacje, a inne przycinaja swoje rezerwacje tak, zeby nie wjechac w zarezerwowane obszary i nie zarezerwowac juz zarezerwowanego obszaru. to powinni byc proste, latwe do zrozumienia i eleleganckie. tak, zeby sie dalo prosto pokazac i wytlumaczyc jak to ma dzialac. operacje pobierania towaru i odkladania towaru zajmuja czas. wozek rusza z pewnym przyspieszeniem i hamuje w normalnym trybie pracy z pewnym opoznieniem. wozek powinien moc zarezerwowac jedynie czesc brzegu. oczywiscie graf to siec polaczen, jednak polaczenie ma tez swoj ksztalt opisany jakas krzywa. jaki algorytm bys zaproponowal? opisz dokladnie jak taki algorytm mialby dzialac, spisz wszystkie wymagania. przejrzyj tez dokladnie kod, napisz jakie sa pitfalls, na co trzeba uwazac co moze niedzialac. jak powinine byc zbudowany algorytm, ktory bedzie bardzo odporny

### 1.2. Cel dokumentu

Cel dokumentu: spisać specyfikację (wymagania, algorytm i interfejsy) dla nowego algorytmu harmonogramowania oraz zarządzania ruchem autonomicznych wózków widłowych w istniejącym projekcie Fleet Manager, ze szczególnym naciskiem na deterministic locking, bezpieczeństwo odległości x/y oraz odporność na deadlocki.

---

## 2. Propozycja algorytmu i specyfikacja (odpowiedź)

Poniżej masz propozycję **algorytmu ruchu + harmonogramowania** (task scheduling + traffic scheduling) w stylu “deterministic locking”, razem z **wymaganiami**, **interfejsami na przyszłość** i konkretnymi **pitfallami z kodu**, który jest w projekcie.

W repo są w praktyce *dwie* “rodziny” rozwiązań:

- **Task Manager (apps/task-manager)** – prosta polityka `edge_lock_policy.js`: rezerwuje *całą trasę* na etapie dispatchu (krawędzie + węzły), bez horyzontu i bez kontroli odległości (poza bardzo grubą blokadą kierunku).
- **Local sim (packages/sim-runtime/src/fleet_sim.js)** – dużo lepszy mechanizm “corridor locks”: rezerwacje na **lookahead/lookback w metrach**, kolejki, blokady kierunku, spacing po progresie, edge conflict groups z geometrii, node locks itd. To jest najbliższe temu, co opisujesz (i nawet ma “deterministic right-of-way” z sortowaniem locków).

Twoje wymagania (x od przodu, y od tyłu, możliwość obrotu 360° w węzłach, brak deadlocków, rezerwacje części krawędzi, krzywe w mapie) sugerują, że najlepsza “wersja 1” to: **Deterministic Corridor Locking** (DCL) + prosta, deterministyczna logika przydziału zadań.

---

## 1) Model bezpieczeństwa i geometria wózka

### 1.1. Parametry wózka (jak opisałeś)
- Układ współrzędnych wózka: **origin między przednimi kołami** (oś skrętu / pivot).
- Model: `head`, `tail`, `width`.
  - `head` – od pivot do fizycznego przodu
  - `tail` – od pivot do fizycznego tyłu
  - `width` – szerokość

Dodatkowo wprowadzamy parametry bezpieczeństwa (konfigurowalne):
- `safetyFrontM = x`
- `safetyRearM = y`
- (opcjonalnie, ale praktycznie konieczne) `safetySideM` – bo bez marginesu bocznego możesz “liznąć” na zakrętach.

### 1.2. Co znaczy “nigdy nie zbliżą się na x/y”
Najbardziej jednoznacznie da się to zapisać jako zakaz przecinania się *stref bezpieczeństwa*:

- Wózek ma bryłę (prostokąt w osi wózka) poszerzoną o marginesy:
  - przód: `head + safetyFrontM`
  - tył: `tail + safetyRearM`
  - boki: `width/2 + safetySideM`
- W dowolnym momencie nie może dojść do przecięcia się tych brył (albo minimalna odległość ≥ 0).

W praktyce w ruchu po grafie najwygodniej to rozbić na:
- **kontrolę wzdłuż “pasa ruchu”** (ten sam edgeGroup/ta sama krawędź kierunkowa): tu możesz trzymać **1D spacing** po progresie,
- **kontrolę w obszarach skrzyżowań i bliskich krawędzi**: tu robisz **mutual exclusion** (locki konfliktów),
- **kontrolę obrotu w węzłach**: tu potrzebujesz **node lock** z promieniem, który gwarantuje 360°.

### 1.3. Promień obrotu w węźle (to jest krytyczne!)
Jeśli wózek stoi “pivotem” w węźle i może się obrócić o 360°, to musi mieć zarezerwowany obszar kołowy o promieniu co najmniej:

\[
R_{turn} = \max\Big(\sqrt{(head+safetyFrontM)^2 + (width/2+safetySideM)^2},\ \sqrt{(tail+safetyRearM)^2 + (width/2+safetySideM)^2}\Big)
\]

Ponieważ pivot jest przesunięty w stronę przodu, zazwyczaj dominuje składnik z `tail`.

To jest **ważny pitfall** w istniejącym local-sim: domyślne “envelope radius” bywa liczone bardziej jak “pół przekątnej” bryły, co przy pivocie nie w centrum może niedoszacować potrzebnego promienia obrotu.

---

## 2) Proponowany algorytm: Deterministic Corridor Locking (DCL)

To jest algorytm, który:
- działa w trybie “deterministic locking”,
- rezerwuje tylko **korytarz** w przód (lookahead/horyzont) i w tył (lookback),
- ma kolejki priorytetów i “przycinanie” rezerwacji,
- unika deadlocków przez **deterministyczny porządek lockowania + reguły wejścia**,
- jest prosty do pokazania na UI: “te edgeGroupKeys i te nodeIds są zarezerwowane przez robotId”.

W Twoim repo najbliższa implementacja tej idei już istnieje w `packages/sim-runtime/src/fleet_sim.js` (funkcja `syncEdgeCorridorLocks` + kolejki + node locks). Ja bym to potraktował jako “dowód wykonalności” i **wyciągnął do modułu bibliotecznego** (żeby nie siedziało w jednym gigantycznym pliku symulacji).

### 2.1. Zasoby, które lockujemy

Wprowadzamy pojęcie **ResourceId** (zawsze string, żeby lock ordering był banalny):

- `edgeGroup:<A<->B>` – fizyczny korytarz między węzłami (undirected), blokuje ruch “na czołówkę”.
- `edgeConflict:<K>` – dodatkowe konflikty geometryczne (krawędzie blisko siebie / krzyżujące się bez wspólnego węzła).
- `node:<N>` – węzeł jako strefa obrotu/skrzyżowania.

Minimalna wersja: `edgeGroup` + `node`.  
Lepsza wersja: + `edgeConflict` wyliczane z geometrii polylines (u Ciebie to już jest w local sim jako “edge conflicts auto-derived”).

### 2.2. Corridor – co dokładnie rezerwuje wózek
Dla każdego wózka, w każdym ticku, wyznaczasz korytarz na jego aktualnej trasie:

- **lookaheadM (H)** – ile metrów w przód rezerwujemy
- **lookbackM (B)** – ile metrów w tył trzymamy (żeby nikt nie “wepchnął się w tył” i żeby rezerwacja nie “urwana” dokładnie pod robotem)

Korytarz to lista wpisów typu:

```ts
type CorridorEntry = {
  edgeGroupKey: string
  edgeKey: string            // kierunkowy, np. "A->B"
  fromNodeId?: string
  toNodeId?: string
  offsetStart: number        // metry od aktualnej pozycji robota (może być ujemne)
  offsetEnd: number
  totalLength?: number
}
```

W praktyce budujesz to iterując po segmentach trasy (krawędziach) od aktualnego `segmentIndex/segmentProgress`, sumując długości aż do lookahead/lookback.

To dokładnie robi local-sim w `buildEdgeLockCorridor(...)`.

### 2.3. Lockowanie deterministyczne: “probe + commit” w ustalonym porządku

Klucz do “no deadlock” w lockowaniu zasobów to:

1. **Zbuduj zbiór wymaganych zasobów** na podstawie corridor:
   - wszystkie `edgeGroupKey` z corridor (zwykle te, których `offsetEnd >= 0` → “przed nami”),
   - opcjonalnie konflikty geometryczne `edgeConflictGroups[edgeGroupKey]`,
   - opcjonalnie węzły `node:<id>` w lookahead (node locks).
2. **Posortuj zasoby** po `ResourceId` leksykograficznie.
3. Zrób **probe**: sprawdź, czy wszystkie da się pozyskać.
4. Jeśli probe OK → **commit**: wpisz locki.
5. Jeśli probe FAIL → nie wchodzisz w konflikt. Zostawiasz tylko te locki, które są absolutnie potrzebne dla bezpieczeństwa (zwykle aktualny edgeGroup), a resztę puszczasz.

To jest sedno “deterministic right-of-way”. W local sim to jest gałąź `if (deterministicRightOfWay)` w `syncEdgeCorridorLocks`.

### 2.4. Kiedy lock jest “zajęty” (edge)
Lock na `edgeGroup` ma 2 warstwy:

1) **blokada kierunku (head-on)**  
Na `edgeGroupKey` nie możesz mieć jednocześnie locków na różne `edgeKey` (np. `A->B` i `B->A`), chyba że modelujesz fizycznie dwa pasy – ale w Twoim opisie to jeden korytarz.

2) **spacing (ten sam kierunek)**  
Jeśli dopuszczasz “pluton” w tym samym kierunku (to jest przydatne), to musisz wymusić minimalny odstęp wzdłuż krawędzi.

Najprostsza i bezpieczna wersja: **nie dopuszczaj** więcej niż 1 robota na `edgeGroupKey`.  
Bardziej przepustowa (i wciąż prosta): dopuszczaj wielu, ale tylko jeśli:

\[
|progress_i - progress_j| \ge spacing(i, j)
\]

Gdzie `progress` to metry od początku segmentu (w local sim: `segmentProgress`).

#### Jak policzyć spacing, żeby spełnić x/y?
Jeżeli chcesz to zrobić dokładnie (a nie “kółkiem”), to dla pary “leader ahead / follower behind” w tym samym `edgeKey`:

- leader ma “strefę do tyłu” = `rearClear = tail + safetyRearM` (przy jeździe przodem),
- follower ma “strefę do przodu” = `frontClear = head + safetyFrontM` (przy jeździe przodem).

Wtedy minimalny odstęp pivot–pivot:

\[
spacing = rearClear(leader) + frontClear(follower) + margin
\]

Jeśli segment wymusza jazdę tyłem (`driveBackward=true` dla tego `edgeKey`), role head/tail zamieniają się w sensie “kto jest przodem wzdłuż krawędzi” — i wtedy:
- “frontClear wzdłuż krawędzi” bierzesz z **tail + safetyRearM** (bo wózek jedzie w stronę swojego tyłu),
- “rearClear wzdłuż krawędzi” bierzesz z **head + safetyFrontM**.

Czyli w praktyce wprowadzisz funkcję:

```ts
function clearanceAlongEdge(model, driveBackward) {
  if (!driveBackward) {
    return { forward: model.head + x, backward: model.tail + y };
  }
  return { forward: model.tail + y, backward: model.head + x };
}
```

I spacing leader/follower:
`spacing = leader.backward + follower.forward + extraMargin`.

Jeśli chcesz mieć “wersję 1 mega-prostą”: ustaw `spacing = 2*Rturn + margin` i po temacie (konserwatywnie, ale działa i jest łatwe).

### 2.5. Node locks: węzeł jako “strefa obrotu”
Gdy robot ma zarezerwowany `node:<N>`, to:
- nikt inny nie może wejść w promień `< Rturn` od tego węzła,
- i to dotyczy także sytuacji, gdy robot stoi “tuż obok węzła” lub w połowie krawędzi – bo i tak może chcieć dojechać i obrócić się.

Minimalna wersja node locków:
- node lock jest **exclusive** (1 holder),
- holder wybierany deterministycznie (np. najbliższy, a tie-break po robotId).

Lepsza wersja (jak w local-sim):
- node locks są odnawiane z TTL, z histerezą, z trybem `hard`/`soft` oraz lookahead/lookback po trasie.

Wymóg z Twojego opisu: jeśli robot ma node lock, musi mieć możliwość obrotu 360° → promień locka powinien być ≥ `Rturn`.

### 2.6. Stop-line / bramka wejścia: żeby nie “wczołgać się” w konflikt
To jest super ważne i macie to nawet opisane w `docs/rds/docs/PROJECT_STATUS.md` jako “reservation entry deadlock”.

Mechanika:
- jeśli probe wykrywa konflikt na jakimś `CorridorEntry`, to wyznaczasz **punkt zatrzymania** przed wejściem w konflikt:
  - stopDistance = `entry.offsetStart - bufferM`
  - `bufferM` musi uwzględniać:
    - minimalny odstęp (`spacing`)
    - **forwardStopDistance** (dystans bezpieczeństwa “na wyhamowanie i latencję”)
    - oraz ewentualny margines na błąd lokalizacji

W local-sim jest to `resolveEdgeLockHoldTarget(...)` + `forwardStopDistanceM`.

To rozwiązuje sytuację “dwa wózki się do siebie doczołgały na wejściu do single-lane, mimo że rezerwacje czasowe były ‘legalne’”.

### 2.7. Deadlocki – jak zrobić, żeby *praktycznie* nie było zakleszczeń

Masz dwie klasy deadlocków:

#### (A) Deadlock “logiczny” (klasyczny circular wait)
Ten eliminujesz przez:
- “probe + commit”,
- globalny porządek locków (sortowanie zasobów),
- brak “hold and wait” dla locków przyszłości (jeśli nie da się zebrać wszystkich wymaganych → nie trzymasz części “na zapas”).

To jest mechanicznie deadlock-free w sensie locków.

#### (B) Deadlock “fizyczny” (roboty już weszły w wąski korytarz z obu stron)
Tego **nie da się zagwarantować** samym sortowaniem, jeśli:
- lookahead jest za krótki,
- a korytarz jest dłuższy niż lookahead i nie ma miejsc minięcia/yield.

Masz 3 sposoby, wszystkie sensowne:

1) **Wymaganie projektowe na mapę** (najprostsze i najczystsze):
   - Każdy odcinek “single-lane bez możliwości minięcia” ma długość ≤ `lookaheadM`.
   - Albo ma po drodze zdefiniowane “yield bays” (zatoczki/węzły, gdzie można się cofnąć).

2) **Critical sections** (prosty mechanizm, bardzo skuteczny):
   - Oznaczasz grupy krawędzi jako `criticalSectionId` (w local-sim segment ma `criticalSectionId`).
   - W danym critical section dopuszczasz np. tylko 1 robota naraz (capacity=1).
   - Rezerwujesz to jak dodatkowy zasób w lock ordering.
   - Efekt: robot nie wjedzie “w gardło” jeśli nie ma tokenu.

3) **Yield/backoff** (gdy mimo wszystko utkną):
   - jeśli robot jest w hold/stall > `deadlockTimeoutMs`, wybierasz deterministycznie “przegranego” (np. mniejsze `priority`, tie-break po robotId),
   - przegrany cofa się do najbliższego węzła za sobą (albo do “yield bay node” z listy),
   - zwalnia locki z przodu, a trzyma tylko te potrzebne do cofania,
   - po minięciu wraca do planu.

Local-sim ma konfigurację `yieldBackoffDistance`, `yieldBayNodes`, `yieldCooldownMs` itd.

---

## 3) Harmonogramowanie zadań (workflow stream) – proste, deterministyczne, gotowe na upgrade

To co opisujesz to klasyczna maszyna stanów na robota + dispatcher.

### 3.1. Stany robota
Proponuję jawnie w runtime trzymać:

- `idle` (brak zadania)
- `to_pick`
- `loading` (czas trwania: `pickDurationMs`)
- `to_drop`
- `unloading` (`dropDurationMs`)
- `to_park` (auto-park)

Każdy robot ma `parkNodeId` (stałe).

### 3.2. Zasada auto-parking + preempcja
Wymaganie: “jak jedzie na parking i pojawi się zadanie to niech się go podejmie”.

Najbezpieczniej (i łatwo do wytłumaczenia) zrobić to tak:

- **preempcja tylko w węzłach** (albo “na następnym węźle”):
  - jeśli robot jest w `to_park` i pojawia się task → ustaw mu `pendingTask` i flagę `cancelAutoParkAtNode=true`,
  - gdy robot dojedzie do następnego węzła (albo jest w węźle) → przełącz na `to_pick`, przelicz trasę, przelicz korytarz locków.

To dokładnie robi local-sim w `maybeApplyPendingTaskAtNode(...)` i to jest bardzo rozsądne w realu: nie robisz nagłej zmiany celu w środku krawędzi bez pełnej kontroli.

### 3.3. Wybór robota do zadania (wersja 1)
Deterministyczny i “działa”:

- Zbierz wszystkie dispatchowalne tasks z wszystkich streamów (spełnione warunki).
- Dla każdego taska policz koszt dla każdego robota, który:
  - jest `idle` albo `to_park` (pusty),
  - jest online i nie jest blocked.
- Koszt = szacowany czas/dystans do pick (`A*` po grafie, z długościami krawędzi).
- Wybierz minimalny koszt, tie-break: `robotId`.

**Uwaga praktyczna:** jeśli traffic locking blokuje dispatch dla “najlepszego” robota, nie przerywaj całego planowania – spróbuj kolejnego. W task-managerze jest pitfall, że czasem logika “breakuje” za wcześnie.

---

## 4) Interfejsy i podział modułów – żeby kolejna wersja była łatwa

Najważniejsze: rozdziel **planowanie trasy**, **rezerwacje ruchu**, i **przydział zadań**. Wtedy możesz później podmienić traffic manager na “time reservations / global MAPF”, nie ruszając workflow.

### 4.1. Proponowane interfejsy (minimalne, ale przyszłościowe)

#### (A) Planner
```ts
interface IRoutePlanner {
  planRoute(start: Pose, goal: Goal, options: PlanOptions): RoutePlan | null;
}
```

Ważne, żeby `RoutePlan` zawierał:
- listę segmentów z `polyline` i `totalLength`,
- `edgeKey`, `edgeGroupKey`, `driveBackward`,
- oraz możliwość “snapowania” start/goal do polylines (virtual anchors).
To jest gigantyczny pitfall w `apps/task-manager`: start node jest często “nearest node”, co jest za słabe dla realnego progressu.

#### (B) CorridorBuilder
```ts
interface ICorridorBuilder {
  build(robot: RobotState, route: RoutePlan, params: CorridorParams): Corridor;
}
```

#### (C) LockManager (deterministic corridor locking)
```ts
type LockResult =
  | { ok: true }
  | { ok: false; blockerRobotId?: string; blockerResourceId: string; holdPoint: HoldPoint };

interface ITrafficLockManager {
  sync(robot: RobotState, route: RoutePlan, corridor: Corridor, nowMs: number): LockResult;
  releaseRobot(robotId: string): void;
  tick(nowMs: number): void; // TTL, prune, metrics
}
```

Klucz: `sync(...)` jest wywoływane cyklicznie (np. 5–10 Hz dla locków, a nie 1 Hz), żeby “horyzont” się przesuwał.

#### (D) TaskDispatcher
```ts
interface ITaskDispatcher {
  assign(tasks: Task[], robots: RobotState[], nowMs: number): DispatchPlan;
}
```

### 4.2. “Contract” na debug/wyjaśnialność
Żeby to było eleganckie do pokazania:
- LockManager powinien umieć zwrócić snapshot:
  - edgeLocks: kto trzyma jakie edgeGroupKey, w jakim kierunku, z jakim progressem
  - nodeLocks: kto trzyma jaki nodeId
  - edgeQueues: kolejka na edgeGroupKey

To ułatwia wykres “dlaczego robot stoi”.

---

## 5) Pitfalls w obecnym kodzie (konkrety z repo)

### 5.1. `apps/task-manager/lib/edge_lock_policy.js` – dlaczego to “nie działa zbyt dobrze”
Najważniejsze problemy:

1) **Rezerwacja całej ścieżki na dispatch**  
`reservePath(...)` lockuje wszystkie krawędzie i węzły na trasie aż do celu.  
Efekt: przepustowość dramatycznie spada, rośnie ryzyko “kaskadowych blokad”.

2) **Brak horyzontu w metrach**  
Nie ma “sliding window” – locki nie “jadą razem z robotem”.

3) **Brak spacing (x/y)**
Jeśli `allowSameDirection=true`, to dwa roboty mogą dostać tę samą krawędź w tym samym kierunku bez kontroli dystansu → w realu to prosi się o “dogonienie”.

4) **Node locks są zbyt uproszczone**  
Węzeł jest lockowany w zależności od `edgeGroupKey`, ale:
- nie ma promienia dla obrotu 360°,
- nie ma geometrii (wózek może fizycznie wchodzić w strefę obrotu innego wózka będącego “blisko węzła”).

5) **Start node fallback = nearest node**  
Gdy brak `current_station`, kod bierze najbliższy node po x/y. To bywa złe na rozwidleniach i w pobliżu wielu krawędzi.  
Local-sim robi to lepiej: “snap do polyline” i virtual anchors.

6) **Timeout locków (15s) jako “bezpiecznik”**  
TTL to nie jest mechanizm bezpieczeństwa. Jeśli lock wygaśnie, a robot nadal jedzie – masz potencjalny konflikt.  
W edge_lock_policy locki są “touchowane” w `onTick` tylko dla robotów z aktywnymi taskami/pending actions, ale to nadal jest kruche przy opóźnieniach i niestabilnym ticku.

7) **Krytyczny pitfall integracyjny (potencjalny!)**  
Task-manager lockuje trasę policzoną lokalnie, ale potem wysyła do robota `go-target` (czyli robot/firmware może sam dobrać trasę).  
Jeśli robot wybierze inną ścieżkę niż ta zablokowana, locki tracą sens.  
Rozwiązanie: albo fleet manager wysyła “route/waypoints”, albo planner jest wspólny i deterministyczny.

### 5.2. `packages/core-mapf/src/index.js` – to nie jest prawdziwy MAPF
`planMultiAgent(...)` w praktyce planuje niezależnie dla każdego robota (single-agent planner) i nie rozwiązuje konfliktów globalnie. Wiele “strategii” w `traffic_strategies.js` to konfiguracja, ale bez pełnego użycia w tym module. To tłumaczy wrażenie, że “algorytmy są, ale nie działają dobrze”.

### 5.3. `packages/sim-runtime/src/fleet_sim.js` – działa, ale…
To jest najlepsze źródło gotowych mechanizmów (corridor locks, queues, node locks, edge conflicts), ale ma swoje ryzyka:

- monolit (trudno testować i refaktorować),
- node lock radius bazowo idzie z “envelope radius” – przy pivocie w przodzie może być za mały dla obrotu,
- spacing jest globalny (`getTrafficSpacing`) i nie implementuje wprost asymetrii x/y (da się to dopisać w strategii),
- poprawność spacing zależy od wiarygodnego `segmentProgress` (w realu trzeba stabilnego estymatora progresu po polyline).

---

## 6) Minimalny zestaw wymagań (specyfikacja) dla wersji 1, która “działa”

Poniżej spis wymagań wprost, tak żeby dało się z nich zrobić testy i interfejsy.

### 6.1. Wymagania bezpieczeństwa ruchu
1) Dla każdego robota i w każdym momencie obowiązuje strefa bezpieczeństwa:
   - przód ≥ `x`, tył ≥ `y` od bryły wózka, boki ≥ `safetySideM` (parametr).
2) Jeśli robot rezerwuje węzeł (`node lock`), system gwarantuje możliwość obrotu 360°:
   - `nodeLockRadius >= Rturn`.
3) Robot nie może fizycznie przekroczyć “stop-line” przed konfliktem rezerwacji:
   - holdPoint musi uwzględniać `forwardStopDistanceM` i minimalne hamowanie.
4) Rezerwacje muszą działać również gdy robot jest:
   - w węźle,
   - blisko węzła,
   - w środku krawędzi.

### 6.2. Wymagania liveness (żeby nie było zakleszczeń)
5) Lockowanie zasobów w korytarzu odbywa się deterministycznie:
   - zasoby sortowane po ResourceId,
   - probe+commit,
   - jednoznaczne tie-breaki (robotId).
6) System nie wprowadza deadlocków lockowych (circular wait) – przez globalny porządek.
7) System nie dopuszcza “fizycznych” deadlocków na wąskich odcinkach:
   - albo przez wymaganie mapy (lookahead ≥ długość gardła),
   - albo przez critical sections (token),
   - albo przez yield/backoff po timeout (deterministyczny wybór ofiary).

### 6.3. Wymagania harmonogramowania zadań
8) Zadania są definiowane przez stream(y) i warunki dostępności (pick/drop).
9) Robot realizuje: `to_pick → loading → to_drop → unloading`.
10) Jeśli brak zadań – jedzie na `parkNodeId`.
11) Jeśli w czasie `to_park` pojawi się zadanie – robot przejmuje je **najpóźniej w następnym węźle** (pendingTask + cancelAutoParkAtNode).
12) Operacje `loading` i `unloading` mają czas trwania i w tym czasie robot trzyma node lock (i ewentualnie edge lock w lookback).

### 6.4. Wymagania implementacyjne
13) Każdy lock ma TTL i jest odnawiany cyklicznie. TTL nie może być jedynym mechanizmem bezpieczeństwa.
14) LockManager musi zwracać “dlaczego stoi”: blockerId + blockerResourceId + holdPoint.
15) System ma testy scenariuszy: head-on, intersection, 3-robot cycle, park-preempt, offline robot.

---

## 7) Co bym realnie zrobił w tym projekcie (żeby było i prosto, i odporne)

1) **Wybrałbym DCL jako “traffic v1”**:
   - corridor edge locks + node locks,
   - deterministicRightOfWay (probe+commit),
   - edgeQueues włączone,
   - stop-lines (forwardStopDistanceM).
2) **Wprowadziłbym parametry x/y do spacing i node lock radius**:
   - implementacja jako `TrafficStrategy.getSpacing(robot, defaults)` i `getNodeLockRadius(robot)` (to już pasuje do architektury strategii).
3) **Wyrzuciłbym “nearest node start” w realnym dispatchu**:
   - start/goal snapping do polyline + virtual anchors (jak w local sim).
4) **Preempcja auto-parkingu tylko na węźle** (pendingTask).
5) **Wyciągnąłbym lock manager z sim-runtime do osobnego pakietu** (np. `packages/core-traffic-locks`), żeby:
   - task-manager i fleet-manager mogły używać tego samego mechanizmu,
   - testy nie zależały od symulacji.

---

Jeśli celem jest “łatwe do pokazania i wytłumaczenia”, to DCL jest dokładnie tym: **każdy robot trzyma korytarz rezerwacji na H metrów do przodu; w razie konfliktu stoi przed stop-line; kolejka na korytarz rozstrzyga pierwszeństwo; węzły są strefami obrotu**. A przy okazji to jest realnie implementowalne w tym repo, bo większość klocków już masz (zwłaszcza po stronie local sim) – trzeba je tylko dopasować do geometrii wózka i wymagań x/y oraz uporządkować w warstwach.

Jeżeli będziesz robił “wersję 2” (time reservations / global MAPF), te same interfejsy `Planner → Corridor → Reservation/LockManager → Dispatcher` zostają, tylko LockManager zmienia się z “spatial deterministic locks” na “spatiotemporal reservations”, a logika workflow nie musi być ruszana.

