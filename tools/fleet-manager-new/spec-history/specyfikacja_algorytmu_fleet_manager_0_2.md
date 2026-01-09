# Fleet Manager — Specyfikacja algorytmu harmonogramowania i rezerwacji ruchu (Deterministic Corridor Locking, DCL) — v0.2 (Draft)

**Data:** 2026-01-06  
**Status:** Draft / do implementacji i iteracji  
**Zakres:** algorytm przydziału zadań (task scheduling) + algorytm rezerwacji i sterowania ruchem wielu wózków (traffic scheduling)  
**Uwaga:** Ten dokument opisuje *docelowy system* (nową implementację). Analiza istniejącego prototypu/kodu jest przeniesiona do załącznika.

---

## Część 1 — Prompt użytkownika i cel dokumentu

### 1.1 Prompt (oryginalna treść)

Poniżej wklejony prompt użytkownika (źródłowe wymagania):

```text
zallaczam projekt feet managera, zapoznaj sie z nim i z dokumentacja. fleet manager to program do zarzadania autonomicznymi wozkami widlowymi. chodzi mi o opracowanie specyfickacji do nowego algorytmu harmonogramowania wozkow. w tym projekcie sa algorytmy. ale nei dzialaja zbyt dobrze. chodzi mo o to, zeby wypracowac algorytm i interfejsy takie, zebym w przyszlosci mogl zrobic lepsza wersje. natomiast na chwile obecna skupic sie na algorytmie ktory dziala. chodzi o to, ze mamy zadanie wyspecyfikowane w postaci strumienia pracy. strumien pracy ma zdefiniowane punkty skad pobieramy towar i dokad go zawozimy. jezeli warunki sa spelnione to algorymt powinien uzyc wozka widlowego, zebo on pojechal po towar do miejsca pobrania, pobral go, nastepnie pojechal do miejsca odkladczego i go odlozyl. jezelil sa kolejne mozliwe zadania z tego lub innego strumienia to podjal sie ich wykonywania a jezeli nie to niech pojedzie na miejsce parkingowe. no i jezeli jest w trakcie jazdy do miejsca parkingowega a pojawi sie nowe zadanie to niech sie go podejmie. mapa jest w postaci grafu, wozki moga jezdzic po grafie. wozki moga zawracac i obracac sie w miejscu w wezlach grafu. kazdy brzeg grafu ma okreslony w jakim kierunku mozna sie poruszac i czy wozek porusza sie tylem czy przodem. kazdy wozek widlowy ma okreslony punkt parkingowy na mapie. model poruszania sie wozka to odwrocony trojkolowiec. srodek ukladu wspolrzdnych wozka jest pomiedzy przednimi kolami wozka wislowego. model okreslaja 3 parametry, head, tail i width. chodzi o to, zeby dwa lub wiecej wozkow widlowych poruszalo sie po mapie i nigdy nie bylo szans, zeby sie do siebie zblizyly na odleglosc x od przodu wozka i y od tylu wozka. czyli musza byc przewidziane korytarze / obwiednie trajektorii poruszania sie wozkow. na poczatek algorytm powinien uzyc rozwiazania deterministic locking. niw powinny zdarzac sie deadlocki i zakleszczenia wozkow. w tym algorytmie wozek moze sobie blokowac trase na pewna ilosc metrow do przodu, dajmy na to horyzont rezerwacji. inne wozki nie powinny sie zblizac do horyzontu rezerwacji zgodnie z wymaganiami wyzej. alogrytm powinien zalozyc, ze w kazdym wezle kazdy wozek widlowy moze obrocic sie o 360 stopni, wiec powinien to brac pod uwage przy zblizaniu sie. oczywiscie nawet jak wozek stoi w danym miejscu czy to w wezle czy bliksko wezla czy po srodku brzegu to dalej powinny byc spelnione te podstawowe reguly ze zaden inny owzek nie moze sie zblizyc do niego zgodnie z tymi zasadami a jezeli jest w wezle to musi mu dac mozliwosc obrocenia sie, jezei sobie zarezerowwal dany wezel. pisalles tez o tym, ze w razie konfliktu rezerwacji jest wyznaczana jakas kolejka priorytetow, jeden wozek trzyma rezerwacje, a inne przycinaja swoje rezerwacje tak, zeby nie wjechac w zarezerwowane obszary i nie zarezerwowac juz zarezerwowanego obszaru. to powinni byc proste, latwe do zrozumienia i eleleganckie. tak, zeby sie dalo prosto pokazac i wytlumaczyc jak to ma dzialac. operacje pobierania towaru i odkladania towaru zajmuja czas. wozek rusza z pewnym przyspieszeniem i hamuje w normalnym trybie pracy z pewnym opoznieniem. wozek powinien moc zarezerwowac jedynie czesc brzegu. oczywiscie graf to siec polaczen, jednak polaczenie ma tez swoj ksztalt opisany jakas krzywa. jaki algorytm bys zaproponowal? opisz dokladnie jak taki algorytm mialby dzialac, spisz wszystkie wymagania. przejrzyj tez dokladnie kod, napisz jakie sa pitfalls, na co trzeba uwazac co moze niedzialac. jak powinine byc zbudowany algorytm, ktory bedzie bardzo odporny
```

### 1.2 Dodatkowe uwagi użytkownika (zebrane do v0.2)

Te uwagi należy traktować jako *nadrzędne doprecyzowanie* specyfikacji:

- Czy warto rozróżnić strefę bezpieczeństwa w przód/tył/bok od parametru „nigdy nie dojeżdżaj bliżej niż N metrów” do innego wózka?  
  (Patrz: sekcja 4.4 — w tej wersji rozróżniamy te pojęcia, ale zachowujemy prosty model).
- TTL jako mechanizm bezpieczeństwa to proteza: system ma polegać na solidniejszych mechanizmach.
- Rozdzielamy **spec nowego systemu** od **analizy obecnego kodu** (analiza jako załącznik).
- Nie ma gwarancji, że:
  - krawędź jest „wąskim korytarzem”,
  - promień krzywizny i szerokość korytarza chronią przed zbliżeniem 2D na zakrętach,
  - różne krawędzie nie biegną blisko siebie.  
  **Wniosek:** trzeba uwzględniać geometrię 2D i „zarzucanie tyłu” (swept envelope).
- Wymagamy formalniejszego stylu (MUSI/POWINIEN/NIE WOLNO).
- Backoff/cofanie jako mechanizm rozwiązywania konfliktów: **NIE WOLNO** w trybie automatycznym (brak safety przy jeździe tyłem).
- Marginesy bezpieczeństwa są potrzebne również ze względu na błąd lokalizacji i błąd śledzenia trajektorii.
- Duża sekcja o unikaniu oscylacji (system ma unikać „migotania” decyzji).
- Testy symulacyjne mają działać bez czekania (virtual time), jak najszybciej; preferowane testy równoległe.
- Piramida testów jednostkowych: implementacja ma być „udowadnialna” testami jednostkowymi i scenariuszami.
- Sekcja „potencjalna ewolucja algorytmu”.
- Warto mieć etap prekompilacji/prekomputacji mapy.
- Jawnie opisać co robić przy:
  - skoku lokalizacji („pose jump”),
  - przerwie w komunikacji,
  - zjechaniu z trasy / wyrzuceniu na zakręcie.
- Kontrakty API mają być czytelne dla ludzi: na start preferowane przykłady payloadów (np. JSON5 z komentarzami).
- Bardzo ważne: logi na dysk + kolejne snapshoty stanu (do odtworzenia incydentu), plus replay w przyspieszonym czasie.
- Pick i drop zawsze są węzłami.
- Dopuszczamy >1 robota na tej samej krawędzi, ale z zachowaniem ograniczeń (minimalne odległości).
- Spec ma jasno pokazać, skąd biorą się gwarancje „roboty się nie zderzą”.
- Roboty będą sterowane przez **Rolling Target Point** (RTP).

### 1.3 Cel dokumentu

Celem dokumentu jest opisanie, w formie możliwej do implementacji i testowania:

1) **Algorytmu harmonogramowania zadań** dla floty wózków widłowych (streamy → taski → przypisanie do robota).  
2) **Algorytmu rezerwacji ruchu i unikania kolizji** na grafie (w tym geometria 2D, korytarze/obwiednie, węzły z obrotem 360°).  
3) **Interfejsów** pomiędzy plannerem, lock managerem i dispatcherem w sposób „future-proof” i „AI-friendly”.  
4) **Wymagań bezpieczeństwa, liveness i odporności** (brak kolizji, brak deadlocków lockowych, minimalizacja deadlocków fizycznych, brak oscylacji, odporność na błędy).

---

## Część 2 — Specyfikacja algorytmu (v0.2)

### 2.1 Konwencje i słowa normatywne

Wymagania w tym dokumencie używają słów:

- **MUSI / NIE WOLNO** — wymaganie twarde (testowalne).
- **POWINIEN** — wymaganie zalecane (z uzasadnieniem), ale może być odstępstwo.
- **MOŻE** — opcjonalne.

Jeżeli nie da się spełnić wymagania MUSI w runtime, system MUSI przejść do trybu bezpiecznego (zatrzymanie + diagnostyka).

---

## 3. Zakres, założenia i non-goals

### 3.1 Zakres

W zakresie algorytmu są:

1) Przydział zadań (task scheduling) dla wielu robotów.  
2) Wyznaczanie tras po grafie (single-agent planner) — minimalnie: A*/Dijkstra po grafie.  
3) Rezerwacja przestrzeni na mapie w sposób deterministyczny (DCL v1):  
   - rezerwacja korytarza w przód i w tył,
   - blokady kierunku w korytarzach single-lane,
   - spacing (minimalny dystans) dla wielu robotów w tym samym kierunku,
   - node locks (strefy obrotu) dla węzłów,
   - konflikty geometryczne między krawędziami biegnącymi blisko siebie (edge conflicts),
   - critical sections (tokeny) dla „gardeł” i miejsc wysokiego ryzyka zakleszczeń.
4) Sprzężenie rezerwacji z wysyłaniem komend do robota (Rolling Target Point) oraz z hamowaniem i latencją.

### 3.2 Non-goals (na etap v1)

Poza zakresem (na ten etap) są:

- Globalne MAPF (Multi-Agent Path Finding) z rezerwacjami czasowymi.  
- Lokalne omijanie przeszkód przez robota (może być w przyszłości).  
- Certyfikacja bezpieczeństwa przemysłowego (ale projekt ma umożliwiać integrację z safety PLC).  
- Wykrywanie i obsługa ludzi/przeszkód w 2D w FM — zakładamy, że robot ma własne safety, a FM działa konserwatywnie.

### 3.3 Założenia (explicit)

A1. Roboty poruszają się po grafie po zadanych krawędziach o geometrii 2D (krzywe).  
A2. Robot może obracać się w miejscu w węźle (360°), jeśli znajduje się „pivotem” w węźle.  
A3. Pick i drop są zawsze węzłami grafu.  
A4. Backoff/cofanie jako mechanizm rozwiązywania konfliktów w trybie automatycznym: **NIE WOLNO** (chyba że w przyszłości zostanie dopisany oddzielny, certyfikowany tryb awaryjny).  
A5. FM nie może zakładać, że różne krawędzie są daleko od siebie w 2D — konflikty geometryczne muszą wynikać z geometrii.

---

## 4. Model świata, jednostki i definicje

### 4.1 Jednostki i czas

- Pozycje: metry (m) w układzie mapy (X, Y).  
- Orientacja: radiany (rad) albo stopnie — MUSI być jednoznacznie określone w kontraktach (tu: **radiany**).  
- Prędkości: m/s, przyspieszenia: m/s².  
- Czas: ms (integer) i s (float) — w kontraktach preferowane ms.

**W testach** czas MUSI być wirtualny (symulacja „bez czekania”).

### 4.2 Model grafu i geometrii mapy

Graf składa się z:

- **Node**: węzeł nawigacyjny (np. LM/AP).  
- **Edge**: skierowana krawędź `from -> to` o geometrii krzywej 2D (np. Bézier), posiadająca:
  - dozwolony kierunek przejazdu,
  - (opcjonalnie) styl jazdy (przodem/tyłem) — `movestyle`,
  - szerokość korytarza (parametr `width`), jeśli dostępna.

**Wniosek praktyczny:** planner planuje po grafie, ale mechanizm bezpieczeństwa/rezerwacji MUSI używać geometrii 2D (nie tylko dystansu po łuku).

### 4.3 Model wózka (geometria bryły)

Wózek jest modelowany jako „odwrócony trójkołowiec”:

- Układ współrzędnych wózka: **origin/pivot** między przednimi kołami.
- Parametry geometryczne:
  - `head` — od pivot do fizycznego przodu,
  - `tail` — od pivot do fizycznego tyłu,
  - `width` — szerokość.

### 4.4 Dwa różne pojęcia dystansu: safety envelope vs minimalny odstęp zatrzymania

W praktyce są dwa „bufory” i warto je rozdzielić:

1) **Safety envelope** (geometria + minimalne odległości x/y/bok)  
   To jest twarde ograniczenie „nie może się przeciąć / naruszyć”.

2) **Minimalny odstęp zatrzymania / following gap**  
   To jest dodatkowy bufor operacyjny: „robot nie dojeżdża bliżej niż N metrów do innego robota (w kierunku jazdy)”, nawet jeśli teoretycznie safety envelope jeszcze by się nie przecięły.

Specyfikacja v1:
- Safety envelope MUSI istnieć i MUSI być egzekwowane zawsze.
- Following gap POWINIEN istnieć jako oddzielny parametr (dla ergonomii i stabilności), ale może być ustawiony na 0 i „wchłonięty” przez safetyFrontM, jeśli ktoś chce uprościć konfigurację.

---

## 5. Model bezpieczeństwa i geometria (wymagania)

### 5.1 Parametry bezpieczeństwa (konfiguracja)

Dla każdego typu robota (albo per robot) muszą być skonfigurowane:

- `safetyFrontM` — minimalny margines przed fizycznym przodem,
- `safetyRearM` — minimalny margines za fizycznym tyłem,
- `safetySideM` — minimalny margines boczny (**MUSI być jawny**; nie traktujemy go jako opcjonalnego),
- `localizationErrorM` — błąd lokalizacji (np. P95) w metrach,
- `trackingErrorM` — błąd śledzenia trajektorii (np. P95) w metrach,
- `extraMarginM` — dodatkowy bufor (deployment / tuning),
- `minFollowingGapM` — dodatkowy minimalny odstęp „nie podjeżdżaj bliżej niż…”.

Wartości błędów (localization/tracking) MUSZĄ mieć źródło (pomiar, założenie, profil).

### 5.2 Safety envelope (definicja)

Bryła bezpieczeństwa jest bryłą robota powiększoną o marginesy:

- w osi robota:
  - przód: `head + safetyFrontM`,
  - tył: `tail + safetyRearM`,
  - boki: `width/2 + safetySideM`,
- oraz dodatkowo „inflated” o niepewności:
  - `inflationM = localizationErrorM + trackingErrorM + extraMarginM`.

Interpretacja: w obliczeniach kolizji/rezerwacji można traktować, że każdy wymiar jest powiększony o `inflationM` (albo że końcowa obwiednia jest minkowski-sum z kołem `inflationM`).

**Wymaganie bezpieczeństwa S1 (MUSI):**  
Dla dowolnych dwóch robotów A i B ich safety envelopes w 2D NIE WOLNO, aby się przecinały w żadnym momencie.

### 5.3 Promień obrotu w węźle (node lock radius)

Jeżeli robot stoi pivotem w węźle i ma możliwość obrotu 360°, musi mieć „czystą” strefę obrotu.

Minimalny promień strefy obrotu:

\[
R_{turn} =
\max\Big(
\sqrt{(head+safetyFrontM+inflationM)^2 + (width/2+safetySideM+inflationM)^2},
\sqrt{(tail+safetyRearM+inflationM)^2 + (width/2+safetySideM+inflationM)^2}
\Big)
\]

**Wymaganie S2 (MUSI):**  
Jeśli robot posiada `node lock` na węźle N, to obszar o promieniu co najmniej `Rturn` wokół pivotu węzła N MUSI być zarezerwowany wyłącznie dla tego robota.

### 5.4 Korytarze na zakrętach i „zarzucanie tyłu” (swept envelope)

Ponieważ pivot jest z przodu, a krawędzie są krzywe, podczas skrętu robot „zarzuca tyłem”.  
Nie wolno zakładać, że:
- spacing 1D po dystansie wzdłuż krawędzi wystarczy,
- różne krawędzie nie są blisko siebie.

**Wymaganie S3 (MUSI):**  
Konflikty ruchu między krawędziami MUSZĄ uwzględniać obwiednię 2D ruchu robota (swept envelope) po geometrii krawędzi.

W v1 realizujemy to poprzez **Map Compiler** (sekcja 6), który generuje konserwatywne „edge conflict groups” na podstawie geometrii.

### 5.5 Safety stop vs traffic hold (diagnostyka)

System MUSI rozróżniać powody zatrzymania:
- `holdReason = SAFETY_STOP` — dalszy ruch naruszyłby bezpieczeństwo,
- `holdReason = TRAFFIC_HOLD` — robot czeka na zasób/kolejkę,
- `holdReason = ROBOT_FAULT` — robot zgłosił błąd,
- `holdReason = OFFLINE/NO_COMMS` — brak komunikacji.

To musi być widoczne w diagnostyce i logach.

---

## 6. Map Compiler / prekompilacja mapy (wymagania)

### 6.1 Po co Map Compiler

Map Compiler to etap offline (precompute), który:
- waliduje mapę,
- buduje indeksy i struktury potrzebne do szybkiego, deterministycznego działania runtime,
- generuje konflikty geometryczne.

W runtime NIE POWINNIŚMY wielokrotnie liczyć ciężkich rzeczy (np. przecięć geometrii).

### 6.2 Wejście i wyjście

**Wejście:** `graph.json` + konfiguracja robotów (geometria, safety) + parametry kompilacji.  
**Wyjście:** `CompiledMap` (wersjonowany artefakt) zawierający co najmniej:

- znormalizowane węzły i krawędzie (id, długość, polylinie),
- `edgeKey` (skierowany) i `edgeGroupKey` (korytarz fizyczny / zwykle undirected),
- `criticalSectionId` (opcjonalnie) dla wybranych grup krawędzi,
- listy konfliktów geometrycznych:
  - `edgeConflictGroups[edgeGroupKey] -> set<ResourceId>`,
  - (opcjonalnie przyszłościowo) konflikty odcinkowe „windowed”.

### 6.3 Parametryzacja krawędzi po długości łuku (arc-length)

Każda krawędź MUSI mieć parametryzację:
- `lengthM`,
- funkcję przybliżoną `p(s)` (punkt w 2D) i `heading(s)` dla `s ∈ [0, lengthM]`.

W praktyce: aproksymacja krzywej polilinią o kroku `polylineStepM` (np. 0.05–0.20 m).

### 6.4 Wyznaczanie edgeGroupKey

`edgeGroupKey` to identyfikator „fizycznego korytarza” dla krawędzi w obu kierunkach (A<->B).  
W v1 zakładamy single-lane: na edgeGroupKey dopuszczamy w danej chwili ruch tylko w jednym kierunku.

### 6.5 Konflikty geometryczne (edge conflicts)

Map Compiler MUSI wyznaczyć konflikty geometryczne pomiędzy korytarzami/krawędziami, tak aby spełnić S3.

Minimalna, bezpieczna wersja v1:

- dla każdej `edgeGroupKey` zbuduj konserwatywną obwiednię 2D przejazdu (swept envelope) po całej długości,
- jeżeli obwiednie dwóch edgeGroupów nachodzą na siebie (lub są bliżej niż próg), to te edgeGroupy są w konflikcie,
- konflikt jest reprezentowany jako zasób `edgeConflict:<id>` albo po prostu relacja „jeśli rezerwujesz A, musisz też rezerwować conflictId”.

Uwaga: ta wersja bywa konserwatywna (blokuje współbieżność nawet jeśli konflikt dotyczy tylko fragmentu), ale jest prosta i bezpieczna.

### 6.6 Critical sections (tokeny) — element mapy

Mapa POWINNA pozwalać oznaczyć „gardła” i obszary ryzyka zakleszczeń jako `criticalSectionId`.

**Wymaganie L1 (MUSI):**  
Wejście do critical section wymaga posiadania tokenu (zasób `cs:<id>`), lockowanego jak inne zasoby w DCL.

To jest podstawowy mechanizm redukcji deadlocków fizycznych bez backoffu.

### 6.7 Walidacje mapy

Map Compiler MUSI wykrywać i raportować (co najmniej jako warnings/errors):

- krawędzie o zerowej długości,
- niespójność referencji start/end,
- brak krawędzi powrotnych tam, gdzie oczekuje się edgeGroup,
- zbyt ostre zakręty (jeśli naruszają kinematykę wózka),
- edge conflicts: „krawędzie biegną blisko siebie” — to nie jest błąd, ale musi być odzwierciedlone w konfliktach.

### 6.8 Wersjonowanie

CompiledMap MUSI mieć:
- `mapHash` (hash wejściowego graph + parametrów),
- `compilerVersion`,
- `robotProfileHash` (bo konflikty zależą od geometrii i safety).

---

## 7. Planner (planowanie trasy) — wymagania

### 7.1 Snap start/goal do geometrii (nie „nearest node”)

**Wymaganie P1 (MUSI):**  
Planner MUSI wspierać „snap” pozycji startowej do najbliższego punktu na krawędzi/polilinii (virtual anchor), a nie tylko wybór „najbliższego węzła”.

To jest krytyczne dla poprawnego `segmentProgress` i dla spacing.

### 7.2 RoutePlan (kontrakt)

RoutePlan MUSI zawierać:

- listę segmentów w kolejności:
  - `edgeKey`, `edgeGroupKey`,
  - `lengthM`,
  - polilinię / referencję do geometrii,
  - informację o stylu jazdy (forward/backward) wynikającą z mapy,
- `routeId` i `revision`,
- metody pomocnicze do projekcji pozycji na trasę (`projectPoseToRoute`).

### 7.3 Replanning policy (anty-oscylacja)

Replan NIE POWINIEN następować co tick.

Minimalna polityka v1:
- replan wyzwalany zdarzeniami (zmiana taska, zmiana mapy, wykryty stuck/off-route),
- jeżeli robot jest w TRAFFIC_HOLD, replan dopiero po przekroczeniu `replanCooldownMs` lub przy zmianie blokera.

---

## 8. Corridor (korytarz rezerwacji) — definicje i wymagania

### 8.1 Definicja lookahead/lookback

Dla robota definiujemy:

- `lookaheadM` — docelowy horyzont rezerwacji w przód,
- `lookbackM` — rezerwacja w tył (utrzymanie bezpieczeństwa i stabilności).

Corridor jest „sliding window” na trasie robota.

### 8.2 Minimalna zależność od hamowania i latencji (stop-line)

Wprowadzamy:

- `a_brake` — bezpieczne (najgorsze) opóźnienie hamowania,
- `controlLatencyS` — suma opóźnień sterowania/komunikacji,
- `v` — prędkość robota (lub bezpieczny upper bound).

Definiujemy minimalny dystans potrzebny, żeby zatrzymać się przed konfliktem:

\[
forwardStopDistanceM =
\frac{v^2}{2a_{brake}} + v \cdot controlLatencyS + localizationErrorM + trackingErrorM + extraMarginM
\]

**Wymaganie S4 (MUSI):**  
Jeżeli robot ma holdPoint/stop-line wynikający z konfliktu, to odległość od bieżącej pozycji do holdPoint MUSI być ≥ `forwardStopDistanceM`.

**Wymaganie S5 (MUSI):**  
`lookaheadM` MUSI być tak dobrane, aby w typowych prędkościach dało się spełnić S4 (z zapasem).

### 8.3 Partial edge reservation (rezerwacja części krawędzi)

Robot MUSI móc rezerwować tylko część krawędzi/korytarza:

- rezerwacja na krawędzi jest przedziałem `s ∈ [s0, s1]` w metrach po długości łuku,
- rezerwacja może być „przycięta” przez konflikt.

### 8.4 Node locks w corridor

Jeżeli w corridorze znajduje się węzeł, który robot ma przekroczyć lub na którym ma wykonać akcję, lock manager MUSI rozważyć node lock:

- co najmniej: „następny węzeł na trasie”,
- pick/drop węzeł (bo robot będzie stał i obracał się).

---

## 9. Model zasobów (Resource Model) — jedno miejsce prawdy

### 9.1 ResourceId i ResourceKind

Wszystkie zasoby mają identyfikator `ResourceId` typu string (dla prostego ordering).

Minimalne rodzaje zasobów:

- `EDGE_GROUP:<edgeGroupKey>`
- `NODE:<nodeId>`
- `CONFLICT:<conflictId>` (lub relacja konfliktu edgeGroup-edgeGroup)
- `CS:<criticalSectionId>`

### 9.2 Polityki zasobów

Każdy zasób ma polityki:

- `capacity` (domyślnie 1),
- `directionPolicy`:
  - dla EDGE_GROUP: single-direction-at-a-time,
- `spacingPolicy`:
  - dla EDGE_GROUP: 1D spacing (w tym samym kierunku),
- `queuePolicy`:
  - FIFO z tie-break,
  - aging (opcjonalnie).

### 9.3 Kolejki i fairness (brak starvation)

**Wymaganie L2 (MUSI):**  
Rozstrzyganie konfliktów rezerwacji MUSI być deterministyczne i odporne na starvation.

Minimalna deterministyczna reguła:

1) Wyższy `priorityClass` (np. TASK > PARK) wygrywa.  
2) Starsze `requestTs` wygrywa.  
3) Tie-break: `robotId` (leksykograficznie).

Opcjonalnie: `aging` — rosnący efektywny priorytet wraz z czasem oczekiwania.

### 9.4 Atomowość aktualizacji (deterministyczny tick)

**Wymaganie I1 (MUSI):**  
LockManager aktualizuje globalny stan locków atomowo w ticku — wyniki nie mogą zależeć od niejawnej kolejności iteracji.

---

## 10. Algorytm ruchu: Deterministic Corridor Locking (DCL) v1

### 10.1 Intuicja

Każdy robot utrzymuje rezerwację „korytarza” wzdłuż swojej trasy:

- w przód na `lookaheadM`,
- w tył na `lookbackM`.

Jeżeli pojawia się konflikt:
- robot, który „trzyma” zasób, zachowuje go,
- roboty w konflikcie **przycinają** swoją rezerwację do stop-line (holdPoint) przed wejściem w konflikt,
- kolejki deterministycznie rozstrzygają, kto następny dostanie możliwość rozszerzenia rezerwacji.

### 10.2 Wejścia/wyjścia ticku

**Wejście ticku:**
- `RobotState[]` (pozycja, prędkość, status, task),
- `RoutePlan` per robot (jeśli robot jedzie),
- `CompiledMap`,
- czas `nowMs`.

**Wyjście ticku:**
- `LockSnapshot` (kto ma jakie zasoby),
- `LockResult` per robot (ok / blocked + holdPoint + blocker),
- `HoldReason`,
- `RollingTargetCommand` per robot (sekcja 12).

### 10.3 Minimalne locki bezpieczeństwa

Robot MUSI zawsze trzymać minimalne locki „tu gdzie jest”, żeby inne roboty nie wjechały w jego obwiednię:

- jeżeli jest na `EDGE_GROUP` → minimalnie `EDGE_GROUP` (w kierunku, który jedzie) + spacing,
- jeżeli jest w `NODE` → `NODE` (strefa obrotu).

### 10.4 Probe + commit (deterministic right-of-way)

Klucz do „no deadlock lockowego”:

1) Budujesz zbiór wymaganych zasobów na podstawie corridor (z przodu) + konfliktów + node locks + critical sections.  
2) Sortujesz zasoby leksykograficznie po `ResourceId`.  
3) Robisz **probe**: czy możesz je wszystkie pozyskać (z uwzględnieniem kolejki/fairness).  
4) Jeśli probe OK → **commit**: wpisujesz locki.  
5) Jeśli probe FAIL → nie wchodzisz w konflikt: przycinasz rezerwację i wyznaczasz holdPoint.

### 10.5 Spacing na EDGE_GROUP (wiele robotów w tym samym kierunku)

Na `EDGE_GROUP` mamy dwie warstwy:

1) **blokada kierunku (head-on):**  
   Nie wolno mieć jednocześnie aktywnych rezerwacji w dwóch przeciwnych kierunkach tego samego edgeGroup (single-lane).

2) **spacing (ten sam kierunek):**  
   Dopuszczamy >1 robota na tym samym edgeGroup w tym samym kierunku tylko jeśli zachowany jest minimalny odstęp.

#### Jak liczyć minimalny odstęp (żeby spełnić x/y i dodatkowy following gap)?

Dla pary „leader ahead / follower behind” w tym samym kierunku:

- leader „wymaga przestrzeni do tyłu”:
  - `rearClear = tail + safetyRearM + inflationM`
- follower „wymaga przestrzeni do przodu”:
  - `frontClear = head + safetyFrontM + inflationM`

Minimalny odstęp pivot–pivot:

\[
spacingPivot = rearClear(leader) + frontClear(follower) + minFollowingGapM
\]

To jest celowo proste do wytłumaczenia, a jednocześnie pozwala sterować „nie podjeżdżaj bliżej niż 3m” niezależnie od samej bryły.

### 10.6 Stop-line / holdPoint (żeby nie „wczołgać się” w konflikt)

Jeśli probe wykrywa konflikt na wejściu do zasobu (node/edgeGroup/conflict/cs), to wyznaczamy holdPoint:

- holdPoint jest punktem na trasie (param `s` na krawędzi albo node entry),
- dystans do holdPoint musi uwzględniać:
  - `forwardStopDistanceM`,
  - spacing,
  - marginesy na błędy.

**Wymaganie S6 (MUSI):**  
Robot nie może zostać poinstruowany (RTP) do przejazdu za holdPoint.

### 10.7 Deadlocki: lock-level vs physical-level (liveness)

Są dwie klasy deadlocków:

(A) Deadlock lockowy (circular wait w lockach) — eliminowany przez probe+commit + globalny porządek zasobów.

(B) Deadlock fizyczny (roboty już „utknęły” topologicznie) — bez backoffu rozwiązujemy przez:

- **critical sections** (tokeny) — preferowane,
- **wymagania na mapę**: wąskie odcinki bez mijanek nie mogą tworzyć topologii, która wymusza cofanie (albo muszą mieć yield nodes),
- **reroute bez cofania** (jeśli istnieje alternatywa),
- w ostateczności: tryb awaryjny i interwencja operatora (ale roboty mają stać bezpiecznie, bez oscylacji).

### 10.8 Mechanizmy anty-oscylacyjne (bardzo ważne)

System MUSI unikać oscylacji typu:
- „raz jedzie, raz stoi” co tick,
- „lock migocze” między robotami,
- „ciągły replan i zmiana decyzji bez postępu”.

Minimalny zestaw mechanizmów v1:

O1) **Kolejka jako źródło prawdy**: jeśli robot jest w kolejce do zasobu, jego pozycja w kolejce nie zmienia się chaotycznie (deterministyczne sortowanie).  
O2) **Histereza rezerwacji**:
- `minHoldMs`: robot, który zdobył zasób, trzyma go co najmniej do czasu przejazdu poza jego obszar bezpieczeństwa,
- `cooldownMs`: robot, który przegrał, nie spamuje żądaniami co tick — pozostaje „zablokowany” do kolejnej istotnej zmiany (np. zwolnienie zasobu).
O3) **Zamrożenie trasy podczas hold**: w TRAFFIC_HOLD robot nie replanuje co tick (sekcja 7.3).  
O4) **Monotoniczny postęp**: corridor/horyzont powinien przesuwać się do przodu wraz z realnym postępem, bez „cofania” wynikającego z szumu lokalizacji (wymaga filtracji progressu).  
O5) **Czytelna eskalacja**: jeśli robot stoi „za długo” na tym samym blockerze, przechodzimy do jasno zdefiniowanego trybu (reroute lub alert), a nie „próbowanie w kółko”.

### 10.9 Parking i preempcja

Jeśli robot nie ma tasków, POWINIEN jechać do `parkNodeId`.

Jeśli w trakcie `to_park` pojawi się task:
- robot przejmuje go **najpóźniej w następnym węźle** (preempcja na węźle),
- nie przerywamy jazdy w środku krawędzi (stabilność i mniej oscylacji).

---

## 11. Harmonogramowanie zadań (task scheduling) — wymagania

### 11.1 Model

Zadania pochodzą ze strumieni (streamów) i mają postać:

`to_pick → loading → to_drop → unloading`

- `loading/unloading` trwa określony czas,
- pick/drop to węzły grafu.

### 11.2 Minimalna polityka przydziału (v1)

Polityka v1 ma być deterministyczna i prosta:

- wybierz task „gotowy” (warunki spełnione),
- wybierz robota, który:
  - jest idle lub w drodze do parkingu,
  - ma minimalny koszt dojazdu (ETA) lub minimalny dystans,
- tie-break: `robotId`.

### 11.3 Locki podczas operacji pick/drop

Podczas `loading` / `unloading`:

- robot MUSI trzymać `node lock` na węźle pick/drop (S2),
- oraz minimalny lock bezpieczeństwa na krawędzi (lookback), jeśli nadal częściowo „wisi” na krawędzi.

---

## 12. Sterowanie robotem: Rolling Target Point (RTP)

### 12.1 Idea RTP

FM utrzymuje globalną trasę (route) i cyklicznie wysyła robotowi punkt docelowy wzdłuż trasy w odległości `rtpLookaheadM` (rolling target).  
Robot lokalnie planuje ruch do tego punktu.

### 12.2 Sprzężenie z DCL (holdPoint)

**Wymaganie C1 (MUSI):**  
Jeżeli LockManager zwróci holdPoint, FM NIE WOLNO wysłać RTP dalej niż holdPoint.

W praktyce:
- `rtpTargetS = min(currentS + rtpLookaheadM, holdPointS - safetyBuffer)`.

### 12.3 Częstotliwości i throttling

- Lock tick: np. 5–10 Hz (zależne od dynamiki).  
- RTP tick: może być taki sam lub wyższy, ale MUSI respektować holdPoint.

### 12.4 Stop i pause

Jeżeli robot ma SAFETY_STOP albo jest OFFLINE, FM MUSI:
- nie wysyłać nowych targetów „do przodu”,
- wysłać komendę stop/pause zgodnie z capabilities.

---

## 13. Odporność na błędy (failure modes)

### 13.1 Pose jump (skok lokalizacji)

Jeżeli `pose` robota zmieni się skokowo powyżej progu:
- system MUSI uznać, że wcześniejsze corridor/progress są niewiarygodne,
- robot przechodzi do SAFETY_STOP,
- planner wykonuje ponowny snap do trasy albo planuje od nowa,
- locki robota są aktualizowane konserwatywnie (nie zwalniaj zasobów „na ślepo”).

### 13.2 Utrata komunikacji / offline

Jeżeli status robota jest nieświeży (`nowMs - lastStatusMs > robotOfflineMs`):
- robot jest oznaczony `OFFLINE`,
- jego aktualne locki NIE SĄ zwalniane automatycznie,
- inne roboty traktują jego obszar jako zajęty,
- system generuje alert i umożliwia operatorowi procedurę „clear / relocate / force release” (poza zakresem v1, ale interfejs powinien istnieć).

### 13.3 Drift: robot „zjechał” z trasy

Jeżeli odległość robota od polilinii trasy > `offRouteThresholdM`:
- robot przechodzi do SAFETY_STOP,
- system może zastosować dodatkowy margines na zakrętach (konfiguracja),
- planner replanuje trasę od aktualnej pozycji (snap).

### 13.4 Stuck detection

Jeśli robot ma komendę ruchu, ale `progress` nie rośnie przez `stuckTimeoutMs`:
- oznacz `ROBOT_FAULT` albo `TRAFFIC_HOLD` (w zależności od danych),
- wygeneruj diagnostykę: blocker, zasób, ostatni holdPoint.

---

## 14. Obserwowalność: logi, snapshoty, replay

### 14.1 Snapshoty stanu (wymaganie)

System MUSI zapisywać na dysk (lub trwały storage) sekwencję snapshotów:

- tick time,
- RobotState (pose, v, task, progress),
- RoutePlan id/revision,
- LockSnapshot (kto ma jakie zasoby),
- HoldReason + blocker,
- wysłane komendy RTP (lub ich streszczenie).

### 14.2 Replay

System POWINIEN umożliwiać:
- odtworzenie symulacji/incydentu z logów,
- odtwarzanie w przyspieszonym czasie,
- deterministyczny replay (ten sam input → ten sam output).

To jest kluczowe do debug i do pracy z AI.

---

## 15. Testy i walidacja (Definition of Done)

### 15.1 Piramida testów

1) **Unit tests** (najwięcej):  
   - projekcja na trasę, progress, spacing,
   - generowanie konfliktów (Map Compiler),
   - deterministyczne kolejki i tie-break,
   - holdPoint i forwardStopDistance,
   - brak naruszenia inwariantów locków.

2) **Integration tests**:  
   - planner + lock manager + RTP w małej scenie.

3) **Scenario tests / e2e**:  
   - typowe i „złe” scenariusze z wieloma robotami.

### 15.2 Testy muszą być szybkie i równoległe

- Testy symulacji MUSZĄ działać bez real-time sleep.  
- Testy POWINNY móc działać równolegle (brak globalnych singletonów).

### 15.3 Scenariusze minimalne (MUSI przejść)

- head-on w single-lane,
- intersection z node lock,
- 3-robot cycle (test zakleszczeń/critical sections),
- park-preempt (task pojawia się w drodze do parkingu),
- robot offline w korytarzu (inni omijają / czekają bez kolizji),
- pose jump i recovery.

### 15.4 Inwarianty do property-based tests (przykłady)

- Nigdy nie ma dwóch przeciwnych kierunków na tym samym EDGE_GROUP jednocześnie.  
- Dla każdej pary robotów ich safety envelopes nie przecinają się (w symulacji).  
- Robot nie otrzymuje RTP za holdPoint.  
- Lock tick jest deterministyczny (te same wejścia → ten sam LockSnapshot).

---

## 16. Ewolucja algorytmu (future-proof)

Ta specyfikacja ma być bazą pod kolejne wersje, bez przebudowy interfejsów:

- v1: DCL (spatial locks) + konflikt geometryczny „całokrawędziowy” (konserwatywny).  
- v1.1: konflikty „windowed” (fragmenty krawędzi), lepsza współbieżność.  
- v2: rezerwacje czasowe (spatiotemporal), priorytety czasowe, MAPF w krytycznych obszarach.  
- v3: integracja z local obstacle avoidance (tam gdzie `width > 0`) i polityka „avoidance corridors”.

Interfejsy `Planner → Corridor → LockManager → Dispatcher(RTP)` pozostają.

---

## Załącznik A — Lessons learned / pitfalls z prototypu (nie-normatywne)

Ten załącznik istnieje wyłącznie jako „pamięć o minach” z obecnego repo (spike). Nie jest częścią wymagań nowego systemu, ale pomaga uniknąć regresji.

### A1. Rezerwacja całej ścieżki na dispatch

W prototypie występuje rezerwowanie całej trasy aż do celu. Efekt:
- niska przepustowość,
- kaskadowe blokady.

W nowym systemie: rezerwujemy korytarz (lookahead/lookback).

### A2. Start node = nearest node

W prototypie bywa wybierany najbliższy węzeł jako start. To jest błędne w pobliżu rozwidleń.  
W nowym systemie: snap do polilinii (P1).

### A3. TTL locków jako „bezpiecznik”

TTL bywa używane jako auto-zwolnienie. To nie jest bezpieczeństwo: jeśli TTL wygaśnie, a robot jedzie, mamy potencjalną kolizję.  
W nowym systemie: locki nie są zwalniane automatycznie na podstawie TTL; TTL/heartbeat służy do diagnostyki OFFLINE.

### A4. Mismatch: „go-target” vs „route”

Jeśli FM lockuje trasę, a robot jedzie inną (lokalny planner wybierze inny wariant), locki tracą sens.  
W nowym systemie: RTP musi być zgodne z route i ograniczone holdPoint (C1).

### A5. „To nie jest prawdziwy MAPF”

W prototypie bywa planner, który nie rozwiązuje konfliktów globalnie.  
W nowym systemie: DCL jest świadomie „traffic v1” (spatial, deterministyczny), a MAPF jest etapem przyszłym.

---

## Załącznik B — Przykładowe payloady (JSON5) — do kontraktów i pracy z AI

Uwaga: JSON5 pozwala na komentarze; w runtime można to przechowywać jako JSON.

### B1. RobotState (przykład)

```json5
{
  robotId: "R1",
  nowMs: 123456789,
  pose: { x: -20.90, y: 1.25, yaw: 0.0 }, // rad
  v: 0.40, // m/s
  status: "OK", // OK | OFFLINE | FAULT
  task: {
    taskId: "T-42",
    phase: "TO_PICK" // TO_PICK | LOADING | TO_DROP | UNLOADING | IDLE | TO_PARK
  },
  progress: {
    routeId: "route-R1-17",
    segmentIndex: 3,
    sOnSegmentM: 4.2,  // arc-length on current edge
    sOnRouteM: 31.7    // optional: cumulative along route
  }
}
```

### B2. LockResult (blocked + holdPoint)

```json5
{
  robotId: "R2",
  ok: false,
  holdReason: "TRAFFIC_HOLD",
  blocker: {
    blockerRobotId: "R1",
    blockerResourceId: "EDGE_GROUP:LM1<->LM2"
  },
  holdPoint: {
    kind: "ON_EDGE", // ON_EDGE | AT_NODE_ENTRY
    edgeKey: "LM3->LM2",
    sM: 12.5,         // stop at this s
    world: { x: -41.2, y: 1.39, yaw: 3.14 }
  }
}
```

### B3. LockSnapshot (do UI)

```json5
{
  nowMs: 123456789,
  edgeGroups: [
    {
      edgeGroupKey: "LM1<->LM2",
      direction: "LM1->LM2",
      occupants: [
        { robotId: "R1", sM: 7.2, reservedAheadM: 10.0 }
      ],
      queue: [
        { robotId: "R2", requestTs: 123456700, priorityClass: "TASK" }
      ]
    }
  ],
  nodeLocks: [
    { nodeId: "LM2", robotId: "R3", radiusM: 2.1 }
  ],
  conflictLocks: [
    { conflictId: "C-17", robotId: "R1" }
  ]
}
```

---

## Rzeczy usunięte lub zdegradowane do „out-of-scope” (z v0.1 → v0.2)

Ta sekcja istnieje, żeby nic „nie zniknęło bez śladu”.

1) **Automatyczne zwalnianie locków przez TTL**  
   - W v0.1 było wymaganie „lock ma TTL”.  
   - W v0.2: TTL nie jest mechanizmem bezpieczeństwa i NIE WOLNO automatycznie zwalniać locków tylko dlatego, że minął czas.  
   - Zastąpione przez jawny model OFFLINE + konserwatywne utrzymanie zajętości.

2) **Yield/backoff jako rozwiązywanie deadlocków fizycznych**  
   - W v0.1 dopuszczono „yield/backoff po timeout”.  
   - W v0.2: backoff w trybie automatycznym NIE WOLNO (brak safety przy jeździe tyłem).  
   - Zastąpione przez: critical sections + wymagania mapy + reroute bez cofania + eskalacja do operatora.

3) **„safetySideM opcjonalne”**  
   - W v0.1 było sugerowane jako opcjonalne.  
   - W v0.2: safetySideM jest wymagane (albo równoważna inflacja Minkowski).

4) **Mieszanie specyfikacji z analizą kodu**  
   - W v0.1 sekcja pitfalls była w głównej części.  
   - W v0.2 przeniesiono ją do Załącznika A.
