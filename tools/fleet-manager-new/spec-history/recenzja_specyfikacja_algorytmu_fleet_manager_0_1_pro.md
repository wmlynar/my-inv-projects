# Recenzja specyfikacji algorytmu Fleet Manager (DCL + scheduling) — v0.1

**Data:** 2026-01-06  
**Zakres recenzji:** dokument „Specyfikacja algorytmu harmonogramowania i rezerwacji korytarzy dla Fleet Manager” (wersja wygenerowana w tym wątku).  
**Cel recenzji:** wskazać poprawki, błędy i ulepszenia, tak aby spec była bardziej jednoznaczna, profesjonalna, odporna na błędy oraz „AI‑friendly” (łatwa do implementacji i weryfikacji przez modele).

---

## 0. Co jest dobre i warto zachować (bo to jest rdzeń „działa”)

1) **Wybór klasy algorytmu**: Deterministic Corridor Locking (DCL) jako „wersja 1” jest sensowny — daje prostą mentalną mapę: *korytarz rezerwacji + stop-line + kolejka + deterministyczne pierwszeństwo*.

2) **Rozdzielenie problemów**: wyraźne oddzielenie:
- *workflow/task scheduling* (co robi robot),
- *traffic scheduling / collision avoidance* (jak bezpiecznie jedzie).

3) **Włączenie geometrii**: wprowadzenie `head/tail/width`, marginesów `x/y` i idei, że węzeł musi gwarantować obrót 360°.

4) **Zauważenie dwóch klas deadlocków**: lock‑level vs physical‑level; to ważne, bo wiele systemów rozwiązuje tylko pierwszy i „dziwi się”, że roboty stoją naprzeciwko siebie.

5) **Wskazanie ryzyk w istniejącym prototypie** (rezerwacje całej trasy, TTL jako proteza bezpieczeństwa, mismatch „go-target vs route”).

To jest solidna baza. Teraz — co poprawić, żeby dokument był „specyfikacją” a nie tylko dobrym opisem.

---

## 1. Co bym poprawił w treści i strukturze dokumentu

### 1.1. Uporządkowanie w stylu RFC / PRD (żeby było profesjonalnie)
Dokumentowi brakuje „ramy” typowej dla specyfikacji:

- **Metadane**: wersja, status (Draft), owner, changelog.
- **Zakres / non-goals**: co jest w tej specyfikacji, a co jest odroczone.
- **Definicje i jednostki**: słownik pojęć + jednostki (metry, sekundy, ms) + układy odniesienia.
- **Wymagania normatywne**: sekcje z MUST/SHALL/SHOULD (albo „MUSI/POWINIEN/MOŻE”).
- **Scenariusze testowe / acceptance criteria**: co musi przejść, żeby uznać algorytm za poprawny.

To nie jest „kosmetyka” — to robi różnicę między dokumentem, który da się implementować zespołowo (lub przez AI), a dokumentem, który jest inspiracją.

### 1.2. Rozdzielenie „spec” od „analizy obecnego kodu”
Sekcja „Pitfalls w obecnym kodzie” jest cenna, ale w specyfikacji nowego algorytmu powinna być:
- jako **Appendix A: Lessons learned / risks from prototype**  
albo osobny dokument.

W części normatywnej lepiej trzymać się:
- *co ma być prawdą w nowym systemie*,  
a nie *co jest dziś popsute w starym*.

### 1.3. Spójne numerowanie i nazewnictwo
W pliku są dwa niezależne systemy numeracji (np. `## 1.` i później `## 1)`), co utrudnia cytowanie fragmentów w review/PR.

Propozycja:
- stała numeracja: `1.`, `1.1`, `1.2` itd.
- stałe nazwy: `edgeGroupKey` vs `edgeBaseGroupKey` (jeśli rozróżniasz), `lookaheadM`, `lookbackM`, `stopLineS`, `progressS` (przy s‑parametryzacji).

---

## 2. Jakie błędy / nieścisłości widzę (merytoryczne)

Poniższe punkty to nie „czepianie się” — to miejsca, gdzie implementacja może pójść w złą stronę albo dać fałszywe poczucie bezpieczeństwa.

### 2.1. „Spacing 1D na krawędzi” nie gwarantuje bezpieczeństwa w 2D na krzywych
W spec jest logika:
- edgeGroup + spacing po `segmentProgress`.

To **może być poprawne**, ale tylko jeśli spełnisz dodatkowe założenia, których nie zapisano:

- krawędź jest „wąskim korytarzem” i robot zawsze jedzie środkiem (albo po zdefiniowanej linii),
- promień krzywizny i szerokość korytarza nie powodują, że dwa roboty „na zakręcie” będą bliżej w 2D niż wynika z dystansu po łuku,
- nie ma sytuacji, że różne krawędzie biegną blisko siebie (wtedy spacing po jednej krawędzi nic nie mówi o drugiej).

**Co poprawić w spec:**  
Dopisać jawnie: *kiedy 1D spacing wystarcza*, oraz że dla geometrii „blisko siebie” obowiązują dodatkowe zasoby `edgeConflict:*` (albo precomputed collision groups).

### 2.2. „Brak deadlocków” jest obecnie bardziej obietnicą niż wymaganiem
Spec rozróżnia deadlocki i opisuje opcje, ale:
- nie ma *twardego requirementu* jak dokładnie zapewniasz brak physical deadlocków,
- nie ma warunku mapy (lub tokenów) jako MUST.

**Co dopisać:** jedna z opcji musi zostać wybrana jako wymaganie bazowe, np.:
- *MUSI istnieć walidator mapy*, który gwarantuje: każdy single-lane corridor ma `length <= lookaheadM` **albo** ma yield bays,  
**albo**
- *MUSI istnieć mechanizm criticalSectionId capacity=1*, który blokuje wejście.

Bez tego implementator łatwo zrobi „ładne locki”, a potem w realu roboty staną naprzeciwko siebie.

### 2.3. Yield/backoff jest opisane, ale nie uwzględnia ograniczeń kierunków (directed edges)
W promptcie: krawędzie mają kierunek i informację czy jedziesz przodem/tyłem.  
Backoff do najbliższego węzła za sobą wymaga, żeby:
- ruch wstecz był dozwolony po tej samej geometrii, albo
- graf miał odcinek umożliwiający cofkę zgodnie z regułami.

**Co dopisać:**  
Wyraźna polityka:
- (A) backoff tylko po krawędziach, które są legalne w tym kierunku (czyli często wymaga, żeby single-lane było dwukierunkowe), albo
- (B) backoff jest „trybem awaryjnym” sterowanym inaczej niż normalne `edgeKey` constraints (i to jest ryzykowne), albo
- (C) backoff nie istnieje, a zamiast tego *mapa MUSI mieć yield bays*.

### 2.4. „safetySideM opcjonalne” to proszenie się o kłopoty
W realu boczny margines jest potrzebny prawie zawsze:
- błąd lokalizacji,
- błąd śledzenia trajektorii,
- niedokładna geometria mapy,
- ruch na łuku.

**Co poprawić:** safetySideM powinno być wymagane (z rozsądnym defaultem) albo zastąpione pojedynczym parametrem „safetyInflationM” używanym w Minkowski sum.

### 2.5. Brakuje jawnego modelu błędów i opóźnień
Spec wspomina „forwardStopDistance”, ale nie definiuje jej jako funkcji:
- prędkości,
- maksymalnego opóźnienia aktualizacji locków/komend,
- maksymalnego opóźnienia w hamowaniu.

Bez tego implementacja może mieć „papierowe bezpieczeństwo”.

**Co dopisać (wymaganie):**
- `forwardStopDistanceM = v^2/(2*a_brake) + v*(controlLatencyS) + localizationErrorM + marginM`
- `lookaheadM >= forwardStopDistanceM + spacingMarginM`

---

## 3. Co bym ulepszył (konkretnie w algorytmie DCL)

### 3.1. Formalny „model zasobów” (jedno miejsce prawdy)
Dziś spec wymienia `edgeGroup`, `edgeConflict`, `node`.  
Ulepszenie: opisać zasoby jako *jeden typ* z parametrami:

- `ResourceId`
- `kind: EDGE_GROUP | NODE | CONFLICT | CRITICAL_SECTION`
- `capacity` (domyślnie 1)
- `directionPolicy` (np. single-direction-at-a-time)
- `spacingPolicy` (none / 1D / custom)

To pozwoli później dodać:
- multi-lane,
- capacity>1,
- time reservations (bez przepisywania wszystkiego).

### 3.2. Jednoznaczna semantyka „corridor” i „partial edge reservation”
W spec jest `offsetStart/offsetEnd`, ale brakuje:
- definicji parametryzacji po łuku (arc-length `s`),
- definicji jak mapujesz `s` na geometrię (point + tangent + normal),
- definicji co znaczy „zarezerwować część krawędzi” dla innych.

Proponuję dopisać:
- każda krawędź ma funkcję `p(s)` i `heading(s)` oraz `length`,
- rezerwacja na krawędzi to przedział `s ∈ [s0, s1]` (w metrach),
- node lock jest oddzielnym obiektem (disk/polygon).

### 3.3. Deterministyczna kolejka + fairness (żeby nie było starvation)
W spec jest „kolejka priorytetów”, ale nie ma reguł fairness.

Minimalna, prosta i deterministyczna propozycja:
- kolejka na zasobie sortowana po:
  1) `priority` (większe wyżej),
  2) `requestTs` (starsze wyżej),
  3) `robotId` (tie-break)
- opcjonalnie „aging”: priorytet rośnie z czasem oczekiwania.

Wtedy masz:
- brak losowości,
- mniejsze ryzyko, że jeden robot „zawsze przegrywa”.

### 3.4. Histereza locków (żeby nie było „migotania”)
W praktyce roboty potrafią co tick:
- raz wygrać probe, raz przegrać,
- i stać w oscylacji.

Dodaj:
- minimalny czas trzymania locka (`minHoldMs`) zanim oddasz,
- minimalny czas blokady dla przegranego (`cooldownMs`), zanim ponownie spróbuje wymusić pierwszeństwo,
- lub „token passing” w critical section.

### 3.5. Deadlock detection jako bezpiecznik (nawet jeśli „nie powinno się zdarzać”)
Zaproponowałbym dopisać:
- budowę **wait-for graph** (robot A czeka na zasób trzymany przez robota B),
- jeśli cykl > `deadlockTimeoutMs` → deterministyczna rezolucja (np. najmniejszy priorytet robi backoff/abort).

To jest proste do zrobienia i ratuje system w realu.

---

## 4. Jak zrobić, żeby specyfikacja była bardziej future-proof

### 4.1. Wyraźne „extension points”
Dopisałbym sekcję: **Ewolucja algorytmu** z listą przewidywanych kroków:

- v1: DCL spatial locks (to co opisujesz)
- v1.1: precomputed conflict groups + lepsza geometria
- v1.2: capacity + multi-lane + overtaking (jeśli kiedyś)
- v2: spatiotemporal reservations (okna czasu)
- v3: MAPF (CBS / prioritized planning z naprawą konfliktów) jako opcja

Ważne: utrzymujesz te same porty/interfejsy (`Planner`, `TrafficManager`, `Dispatcher`), zmienia się implementacja.

### 4.2. Jawne założenia o mapie i „map compiler”
Zrób z tego requirement:
- istnieje etap **Map Preprocessing/Compiler**, który generuje:
  - arc-length parametryzację krawędzi,
  - conflict groups,
  - listę critical sections / yield bays,
  - walidację „anti-deadlock”.

To przenosi ciężką geometrię z runtime do build-time i czyni algorytm stabilniejszym.

### 4.3. Wersjonowanie kontraktów i parametrów
Dopisać:
- `AlgorithmProfile` z wersją (np. `dcl.v1`),
- `TrafficParams` z wersją,
- migracje parametrów (żeby sceny sprzed roku nadal działały).

---

## 5. Jak podnieść jakość i „profesjonalność” dokumentu

### 5.1. Styl normatywny
W części wymagań używać konsekwentnie:
- **MUSI** (hard requirement),
- **POWINIEN** (zalecenie),
- **MOŻE** (opcjonalne),
- **NIE WOLNO** (zakaz).

I dopisać definicję tych słów na początku (jak w RFC).

### 5.2. Sekcja „Założenia i ograniczenia”
Przykładowe MUST‑assumptions, które warto mieć jawnie:
- roboty poruszają się wyłącznie po grafie,
- obrót w miejscu jest możliwy wyłącznie w węzłach,
- pick/drop punkty są w węzłach (albo: jeśli na krawędzi, tworzymy „wirtualny węzeł”),
- robot raportuje pose z częstotliwością ≥ X Hz.

### 5.3. Pseudokod + sekwencje
Dodałbym 2–3 kluczowe pseudokody:

- `syncLocks(robot)`  
- `computeHoldPoint(robot, corridor, conflicts)`  
- `assignTasks(tasks, robots)`

I 2 diagramy sekwencji:
- „robot jedzie, locki się przesuwają”
- „konflikt → stop-line → kolejka → przejęcie zasobu”

### 5.4. „Acceptance criteria” i metryki
Spec powinna powiedzieć, jak oceniasz „działa”:
- **Safety**: 0 kolizji w symulacji w scenariuszach testowych,
- **Liveness**: brak deadlocków dłuższych niż T,
- **Throughput**: np. min. X zadań/godz w scenie referencyjnej,
- **Stability**: brak oscylacji stop/go > N razy/min w stabilnym ruchu.

---

## 6. Jak zrobić, żeby algorytm był bardziej odporny na błędy

### 6.1. Klasa błędów: sensor/pose jump
W realu robot potrafi „skoczyć” lokalizacją (AMCL relocalization).  
Wymaganie: jeśli `|Δpose| > jumpThreshold`:
- natychmiastowy replan,
- rebuild corridor,
- konserwatywnie rozszerz node lock,
- opcjonalnie „safe stop” jeśli nie da się potwierdzić bezpieczeństwa.

### 6.2. Klasa błędów: utrata komunikacji / offline
Dopisać politykę:
- jeśli robot offline > `offlineTimeoutMs`:
  - jego locki *nie mogą* po prostu wygasnąć bez reakcji,
  - reszta floty przyjmuje, że robot jest przeszkodą statyczną (node/edge occupancy) do czasu potwierdzenia.

W przeciwnym razie TTL zrobi „magiczne zniknięcie” przeszkody.

### 6.3. Klasa błędów: drift między planem a rzeczywistością
Jeśli robot nie jedzie po planowanej krawędzi (map-matching mówi, że jest na innym edge):
- to powinno być *incydentem* i wymagać:
  - natychmiastowego zatrzymania lub trybu ostrożnego,
  - przebudowy rezerwacji,
  - diagnostyki (dlaczego drift).

### 6.4. Error budgeting: marginesy bezpieczeństwa
Spec powinna zawierać parametry:
- `localizationErrorM` (np. 0.15–0.30m),
- `controlLatencyMs` (np. 200–500ms),
- `brakeDecelMps2` (konserwatywnie),
i jasno powiedzieć, że safety envelope = geometria + te marginesy.

---

## 7. Jak zrobić, żeby spec lepiej nadawała się do pracy z AI

### 7.1. Machine-readable kontrakty
AI świetnie działa, gdy ma twarde kontrakty. Dodaj:
- JSON Schema dla:
  - `RobotState`, `RoutePlan`, `Corridor`, `LockSnapshot`, `HoldPoint`, `Task`, `DispatchPlan`.
- Przykładowe payloady (3–5 szt.) jako „golden files”.

### 7.2. Scenariusze testowe jako dane
Dodaj katalog `spec_scenarios/`:
- małe grafy (5–20 węzłów),
- definicje robotów i ich celów,
- oczekiwane rezultaty: „robot B musi stać przed node N”, „kolejka taka i taka”.

To pozwala AI pisać testy i implementację iteracyjnie.

### 7.3. Deterministyczny replay
Jeśli chcesz, żeby AI diagnozowała błędy:
- log w formacie JSONL z:
  - seed,
  - tick,
  - snapshot locków,
  - decyzje „dlaczego stop”.

I narzędzie `replay` z identycznym wynikiem.

### 7.4. Checklisty i „Definition of Done”
AI działa lepiej, gdy ma checklistę:
- „Czy implementacja spełnia MUST 1..N?”
- „Czy testy T1..Tn przechodzą?”
- „Czy format logów jest zgodny?”

Dodaj w spec sekcję: **DoD**.

---

## 8. Rolling Target Point — co dopisać do specyfikacji algorytmu (zgodnie z Twoją sugestią)

Tak — warto to dopisać, bo to spina algorytm „na papierze” z realnym sterowaniem robotem.

### 8.1. Minimalna propozycja sekcji „Sterowanie ruchem”
Dodałbym rozdział (np. „8. Sterowanie i integracja z robotem”), w którym:

1) **Globalny planner** wyznacza trasę po grafie (polilinie).
2) **Traffic manager** wyznacza:
   - corridor locks,
   - `holdPoint` (stop-line) jeśli konflikt.
3) **Controller** generuje **Rolling Target Point**:
   - RTP jest punktem na trasie w odległości `lookaheadM`,
   - ale **nie może przekraczać holdPoint** (czyli `s_target = min(s+lookahead, s_hold)`).
4) Robot dostaje RTP cyklicznie (np. 5–10 Hz albo co 200 ms), z TTL `validUntil`.

To jest dokładnie to, czego brakuje w aktualnym prototypie „go-target”.

### 8.2. Wymagania bezpieczeństwa związane z RTP
- jeśli robot nie potwierdza odbioru RTP → Fleet Core przechodzi w „safe stop mode”,
- jeśli robot przekroczy holdPoint (błąd sterowania) → incydent i natychmiastowy stop,
- RTP update rate musi być spójny z `forwardStopDistanceM` (latencja).

---

## 9. Konkretna lista zmian (checklista „patch” do spec)

Poniżej „lista edycyjna” — co dopisać/zmienić, żeby dokument stał się bardziej specyfikacyjny:

1) Dodać sekcję: **Zakres / non-goals / assumptions**.  
2) Ujednolicić numerację i styl nagłówków.  
3) Dodać słownik pojęć i jednostki.  
4) Zmienić `safetySideM` z „opcjonalne” na **wymagane** (z defaultem).  
5) Dopisać formalnie: **arc-length s** i „partial edge reservation = s‑interval”.  
6) Dopisać **model opóźnień** i wzór na `forwardStopDistanceM`.  
7) Wybrać i zapisać jako MUST: **anty‑physical-deadlock** (map validator *albo* critical sections).  
8) Dopisać zasady fairness kolejki (priority + requestTs + robotId + aging).  
9) Dopisać „histerezę” i „cooldown”, żeby uniknąć oscylacji.  
10) Dopisać **deadlock detection** (wait-for graph) jako bezpiecznik.  
11) Dopisać rozdział **Rolling Target Point** i ograniczenie RTP do holdPoint.  
12) Dodać „Acceptance criteria” i zestaw scenariuszy testowych.  
13) Przenieść „pitfalls kodu” do Appendix.

---

## 10. Otwarte pytania (warto jawnie zapisać w spec)

1) Czy pick/drop punkty zawsze są węzłami? Jeśli nie — jak tworzymy „wirtualne węzły” i node lock?  
2) Czy robot może wykonywać cofkę po krawędzi jednokierunkowej (tryb awaryjny), czy mapa musi to umożliwiać legalnie?  
3) Czy dopuszczamy >1 robota na edgeGroup w tym samym kierunku (pluton), czy v1 ma być „1 robot na korytarz”?  
4) Jakie są realne parametry hamowania/latencji (żeby policzyć forwardStopDistance)?  
5) Jak dokładnie wyznaczamy i walidujemy `edgeConflictGroups` z geometrii (tube buffer + intersection)?  
6) Jakie są docelowe rozmiary floty (N robotów) i wymagana częstotliwość ticków (Hz)?

---

### Podsumowanie
Spec jest dobrą „bazą koncepcyjną” i prowadzi w kierunku algorytmu, który naprawdę da się wdrożyć. Największy upgrade jakości nastąpi, jeśli:
- przejdziesz z narracji do wymagań normatywnych,
- sformalizujesz geometrię (s‑interval, conflict groups),
- wybierzesz jedną twardą strategię anti‑deadlock,
- dodasz RTP jako część pętli sterowania,
- dorzucisz scenariusze testowe i schematy danych.

To wtedy staje się dokumentem, który można implementować równolegle (i z AI) bez ciągłych „a co autor miał na myśli”.
