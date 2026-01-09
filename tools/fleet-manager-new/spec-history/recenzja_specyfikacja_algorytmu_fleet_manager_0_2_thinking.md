# Recenzja specyfikacji algorytmu Fleet Manager (DCL + scheduling + RTP) — v0.2

**Data recenzji:** 2026-01-06  
**Recenzowany dokument:** „Fleet Manager — Specyfikacja algorytmu harmonogramowania i rezerwacji ruchu (Deterministic Corridor Locking, DCL) — v0.2 (Draft)”  
**Zakres recenzji:** wyłącznie specyfikacja algorytmu (scheduling + traffic/DCL + RTP). Dokumenty architektury i mapy traktuję jako kontekst.

---

## 0. Prompt, który spowodował wygenerowanie tej recenzji

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

dla kontekstu zllaczylem tez recenzje specyfikacji calej architektury. natomiast tutaj w tym chacie skupmy sie na specyfikacji algorytmu. zalaczam tez pliki ktore znalazlem apropos specyfikacji mapy. nie wiem czy to sie przyda, ale zalaczam na wszelki wypadek.

prosze przeslij swoja recenzje specyfikacji algorytmu 0.2 wedlug powyzszych punktow. i przeslij link do pliku .md do pobrania tej recenzji. niech w tym dokumencie bedzie tez zalaczony prompt
```

---

## 1. Co bym jeszcze poprawił (najbardziej „praktyczne” poprawki)

### 1.1 Doprecyzować ruch „przodem/tyłem” (movestyle) w całym modelu bezpieczeństwa
W specyfikacji pojawia się informacja, że krawędź może wymuszać jazdę przodem/tyłem, ale:
- formuły na spacing (sekcja 10.5) i część definicji „front/rear” są zapisane tak, jakby robot zawsze jechał przodem.

**Ryzyko:** przy jeździe tyłem „przód ruchu” to fizyczny tył robota, więc:
- `frontClear` powinno zależeć od kierunku ruchu (head vs tail),
- `safetyFrontM/safetyRearM` powinny być mapowane na „lead/trail” względem kierunku ruchu,
- w skrajnych przypadkach spacing może być zaniżony (fałszywe poczucie bezpieczeństwa).

**Proponowana poprawka do spec (MUSI):**
- wprowadzić pojęcia: `leadExtentM`, `trailExtentM`, `leadSafetyM`, `trailSafetyM`,
- zdefiniować je jako funkcję `movestyle` / `travelDirection`:
  - gdy ruch „forward”: `lead=head`, `trail=tail`,
  - gdy ruch „reverse”: `lead=tail`, `trail=head`,
  - analogicznie dla safety.

To jedna z niewielu poprawek, które realnie mogą zmienić *poprawność* (nie tylko jakość dokumentu).

### 1.2 Uściślić, czym dokładnie jest `edgeGroupKey`
W sekcji 6.4 `edgeGroupKey` jest opisany jako „fizyczny korytarz dla krawędzi A<->B”. To działa dla prostych map, ale ma dwa typowe problemy:

- **Długi, wąski korytarz z wieloma węzłami po drodze**: jeżeli każdy odcinek A-B jest osobnym `edgeGroupKey`, to dwa roboty mogą wjechać z przeciwnych stron „na różne edgeGroupy” i dopiero spotkać się w środku (physical deadlock).
- **Rzeczywiste korytarze** często nie pokrywają się z jedną krawędzią (są złożone z kilku krzywych i węzłów).

**Proponowana poprawka do spec:**
- rozdzielić pojęcia:
  - `edgeKey` — krawędź skierowana,
  - `corridorId` (albo `edgeGroupKey`) — *ciąg* krawędzi tworzących jeden wąski korytarz/tor, z jedną polityką kierunku,
- dopisać regułę w Map Compiler: kiedy łączyć odcinki w corridor (np. „brak rozwidleń + stała szerokość + brak mijanek”).

Jeśli na ten moment chcesz zostać przy prostym `A<->B`, to spec powinna to nazwać jako ograniczenie v1 i wprost powiedzieć, że „anti-physical-deadlock MUST być wtedy zapewniony przez critical sections/yield nodes”.

### 1.3 Doprecyzować algorytm „atomowego ticka” LockManagera (żeby implementacja nie miała ukrytych losowości)
Spec wymaga atomowości (I1) i „probe+commit” (10.4), ale nadal zostawia furtkę: implementator może zrobić to „w pętli po robotach” i przypadkiem wprowadzić bias kolejnością iteracji.

**Proponowana poprawka do spec:**
- dodać pseudokod jednego ticka (deterministyczny, globalny), np.:
  1) zbuduj `DesiredReservations[robotId]`,
  2) ustal stały porządek robotów (priorytet + requestTs + robotId),
  3) idź w tej kolejności i przyznawaj zasoby, jeśli da się przyznać *cały zestaw* zasobów robota (all-or-nothing),
  4) wynik = `LockSnapshot` + `LockResult[]`.
- albo: dodać alternatywny, ale równie jednoznaczny algorytm alokacji (deterministyczny greedy).

To jest ważne nie tylko dla jakości, ale też dla „replay = debug”.

### 1.4 Uściślić semantykę `capacity` w zasobach EDGE_GROUP
W dokumencie:
- z jednej strony dopuszczasz >1 robota na EDGE_GROUP (spacing),
- z drugiej strony w modelu zasobów jest `capacity (domyślnie 1)`.

To da się pogodzić, ale trzeba to nazwać:
- EDGE_GROUP nie jest klasycznym semaforem `capacity`,
- to jest „zasób z intervalami 1D + regułą kierunku”.

**Proponowana poprawka do spec:**
- dla `EDGE_GROUP` zamiast `capacity` opisać: `intervalReservation` (lista zajętych przedziałów w osi s) + `directionToken`,
- `capacity` zostawić dla CS i NODE.

### 1.5 Doprecyzować `holdPoint` (jak go liczymy i co dokładnie oznacza)
W sekcji 10.6 `holdPoint` jest opisany koncepcyjnie, ale brakuje:
- definicji, czy `holdPointS` dotyczy pivota robota czy „punktu skrajnego” w kierunku jazdy,
- konkretnych reguł wyznaczania holdPoint dla: konfliktów geometrycznych, node lock, spacing, critical section,
- definicji `safetyBuffer` (użyte w 12.2).

**Proponowana poprawka do spec (MUSI):**
- `holdPointS` to *maksymalna dozwolona pozycja pivota* na trasie, taka że safety envelope nie naruszy zasobu,
- `safetyBufferM` ma definicję: co najmniej `leadExtentM + leadSafetyM + inflationM` (+ opcjonalny margines),
- dodać 2–3 przykłady liczbowe (prosty edgeGroup + leader/follower + conflict).

---

## 2. Jakie błędy widzę (rzeczy, które mogą dać złą implementację)

### 2.1 Spacing nie uwzględnia kierunku ruchu (forward/reverse)
To jest jedyny punkt, który traktowałbym jako „błąd merytoryczny”, bo może zaniżyć marginesy w ruchu tyłem (patrz 1.1). Jeśli w praktyce wszystkie krawędzie są „forward”, to i tak warto to dopisać, bo spec sama mówi, że `movestyle` istnieje.

### 2.2 Niejednoznaczność: „probe” per robot vs atomowy tick
Sekcja 10.4 brzmi jak algorytm wykonywany osobno per robot, ale I1 wymaga atomowości. Bez doprecyzowania łatwo o implementację, która jest deterministyczna *tylko przypadkiem*.

### 2.3 Brak normatywnej definicji „direction arbitration” dla single-lane
Jest zakaz jednoczesnych rezerwacji w przeciwnych kierunkach (10.5), ale brakuje:
- jak ustalamy, kiedy korytarz „zmienia kierunek”,
- jak unikamy starvation kierunku przeciwnego (np. ciągły strumień w jedną stronę).

To nie musi być pełne MAPF, ale minimalna polityka powinna być w spec (nawet jeśli prosta i konserwatywna).

### 2.4 Assumption A2 (obrót 360° w każdym węźle) vs realne ograniczenia mapy
To nie jest błąd względem Twojego promptu (jest zgodne z wymaganiem), ale w praktyce:
- mapy często mają ograniczenia rotacji / geometrii (wąskie przejazdy, zakazy obrotu, właściwości typu `forbiddenRotAngle`).
Jeżeli przyjmujemy obrót 360° wszędzie, system będzie bezpieczny, ale może być bardzo konserwatywny.

Warto dopisać to jako świadomy trade-off: „v1 przyjmuje 360° jako worst-case”, a v1.1 może to luzować, jeśli map compiler to policzy.

---

## 3. Co bym ulepszył (żeby wdrożenie było „mniej ryzykowne”)

### 3.1 Dodać jednoznaczny „state machine” robota na poziomie Fleet Manager
Masz już rozróżnienia `SAFETY_STOP` / `TRAFFIC_HOLD` / `OFFLINE`, ale warto dopisać minimalną maszynę stanów i przejścia:
- `IDLE`, `MOVING`, `TRAFFIC_HOLD`, `SAFETY_STOP`, `OFFLINE`, `ROBOT_FAULT`,
- kto jest odpowiedzialny za zmianę stanu (planner? lock manager? adapter?),
- jakie akcje są dozwolone w każdym stanie (np. RTP może być wysyłane tylko w MOVING/TRAFFIC_HOLD i tylko do holdPoint).

To zwiększa odporność na „dziury logiczne” w implementacji.

### 3.2 Dopisać procedurę „direction switch” dla single-lane
Minimalnie:
- kierunek korytarza jest „ustalony” gdy pierwszy robot wejdzie,
- zmiana kierunku dopiero gdy korytarz jest pusty,
- fairness: np. jeśli w kolejce czekają roboty z obu stron, to wybierz stronę z najstarszym requestTs (z aging).

To jest proste i zwykle wystarczy, a eliminuje przypadkowe starvation.

### 3.3 Wzmocnić Map Compiler: stabilne identyfikatory konfliktów + regresje
W spec jest poprawny kierunek („edge conflicts” z geometrii), ale brakuje:
- definicji algorytmu (sampling, tolerancje, minimalny dystans),
- definicji stabilnego `conflictId` (żeby nie zmieniało się między buildami bez powodu),
- testów regresji mapy (ten sam input → te same konflikty).

To jest kluczowe, bo inaczej konflikty będą „pływać” i rozwalą deterministyczny replay.

### 3.4 Dopisać „contract” telemetrii: częstotliwość, maks. latency, jakość progress
Ponieważ stop-line i spacing zależą od `progress/currentS`, spec powinna mieć minimalne wymagania wejściowe:
- `statusHz` (np. ≥ 5 Hz),
- `maxStatusAgeMs`,
- definicję projekcji `pose -> s` (snap) oraz filtracji (anty-szum).

To ogranicza klasę błędów „na papierze działa, w realu trzęsie”.

---

## 4. Jak zrobić, żeby była future-proof

To już jest w dużej mierze załatwione przez sekcję 16 (ewolucja) i przez rozdzielenie `Planner → Corridor → LockManager → Dispatcher(RTP)`. Żeby dopiąć temat:

1) **Dodaj “capabilities” robota** jako część wejścia algorytmu (co robot potrafi: RTP/waypoints/stop/pause, max speed, reverse allowed).  
2) **Zamień “konflikt całokrawędziowy” na windowed** jako plan v1.1 (już jest), ale dopisz jak zmieni się kontrakt danych (np. konflikt jako lista przedziałów `s`).  
3) **Zdefiniuj format “CompiledMap” i jego wersjonowanie** jako osobny kontrakt (JSON Schema), bo to będzie fundament przyszłych wersji.

---

## 5. Jak zrobić, żeby była lepszej jakości (czytelność + jednoznaczność)

- Dodać krótkie pseudokody dla:
  - `buildCorridor(robotState, routePlan)`,
  - `lockTick(snapshotIn) -> snapshotOut`,
  - `computeHoldPoint(conflict)`.
- Dodać 2–3 diagramy sekwencji (nawet ASCII):
  - „dwa roboty head-on w single-lane”,
  - „leader/follower + spacing”,
  - „offline robot w korytarzu”.
- Ujednolicić nazwy zmiennych (np. `Rturn` vs `R_turn`) i dopisać definicje tam, gdzie pojawiają się pierwszy raz (`safetyBuffer`).

---

## 6. Jak zrobić, żeby była bardziej profesjonalna

- Na początku dodać „Document control”:
  - owner, status, wersja, changelog (v0.1 → v0.2 → v0.3),
  - link do repo/kontraktów.
- Utrzymywać listę wymagań z identyfikatorami (już masz S1..S6, L1..L2, I1, C1) — dopisałbym jeszcze wymagania „D*” dla deterministyczności (np. D1: replay).
- Dodać „Risk register” (5–10 ryzyk z mitigacjami), np.:
  - błędna telemetria progress,
  - offline w korytarzu,
  - błędne konflikty z map compiler.

---

## 7. Jak zrobić, żeby była bardziej odporna na wszelkiego typu błędy

### 7.1 Recovery i „bezpieczne domyślne zachowanie”
Sekcja 13 jest bardzo dobra; dołożyłbym jeszcze dwa twarde elementy:

- **MUSI istnieć watchdog na RTP/komendy**: jeśli robot nie dostaje aktualizacji przez `rtpTimeoutMs`, przechodzi do stop/pause (w zależności od capabilities).  
- **Force-release**: jeśli operator ma procedurę „force release”, spec powinna opisać warunki bezpieczeństwa (np. robot musi być w OFFLINE i fizycznie zabezpieczony / potwierdzenie).

### 7.2 Deterministyczny replay jako narzędzie „na incydenty”
Masz snapshoty i replay (14) — super. Doprecyzuj jeszcze:
- format loga (JSONL), minimalne pola (seed, tick, inputs, outputs),
- retencja i rotacja,
- możliwość odtworzenia w przyspieszonym czasie „1:∞”.

### 7.3 Testy chaosowe w symulacji
Oprócz scenariuszy minimalnych (15.3) dodaj:
- losowe dropy telemetrii,
- losowe opóźnienia (latency injection),
- losowe pose jumps,
- losowe „blocked” (symulacja przeszkody),
- i sprawdzenie inwariantów bezpieczeństwa.

---

## 8. Jak zrobić, żeby lepiej nadawała się do pracy z AI

Masz już „Przykładowe payloady (JSON5)” i bardzo dobrą sekcję testów. Żeby to jeszcze podkręcić:

1) **Kontrakty jako kod**: JSON Schema / TS types dla wszystkich kluczowych struktur (`RobotState`, `RoutePlan`, `LockSnapshot`, `LockResult`, `CompiledMap`, `RTPCommand`).  
2) **Golden scenarios (fixtures)**: katalog z małymi mapami i oczekiwanymi wynikami.  
3) **Wymagania jako inwarianty** (property-based tests) — już jest, ale warto dopisać też „metryki stabilności” (np. limit oscylacji stop/go).  
4) **Podział dokumentu na mniejsze pliki** (AI lepiej „nie gubi się” w 30+ stronach): osobno DCL, osobno Map Compiler, osobno RTP, osobno failure modes.

---

## 9. Rolling Target Point (RTP) — ocena i co dopisać

Wersja 0.2 robi duży krok naprzód: RTP jest wprost opisany i spięty z `holdPoint` przez wymaganie C1. To jest właściwy kierunek.

Żeby RTP było naprawdę „production-grade”, dopisz jeszcze:
- co wysyłasz dokładnie: `targetPose` czy `targetS` + referencja do trasy,
- jak robot potwierdza wykonanie (ack transportowy vs osiągnięcie),
- minimalne częstotliwości i timeouty (`rtpHz`, `rtpTimeoutMs`),
- regułę: `lockLookaheadM` SHOULD ≥ `rtpLookaheadM + forwardStopDistanceM + margin`.

---

## 10. Proponowana checklista zmian do v0.3 (najkrótsza droga do „jeszcze lepszej” spec)

1) Dopisać definicje `travelDirection` / `movestyle` i poprawić spacing pod reverse.  
2) Dopisać pseudokod deterministycznego ticka LockManager (bez zależności od kolejności iteracji).  
3) Dopisać formalną definicję `holdPoint` + `safetyBuffer` + reguły wyznaczania dla spacing/node/conflict/cs.  
4) Doprecyzować `edgeGroupKey` (czy to A<->B, czy corridorId) i opisać minimalną politykę „direction switch + fairness”.  
5) Dopisać kontrakt `CompiledMap` (schema + wersjonowanie) oraz stabilne generowanie `conflictId`.  
6) Dopisać minimalne wymagania telemetrii (Hz/latency) i filtracji progress.  
7) Dopisać 2–3 diagramy sekwencji i 2–3 przykłady liczbowe.

---

### Podsumowanie

Spec v0.2 jest już bardzo mocna: ma normatywne wymagania, Map Compiler, RTP, failure modes, logi/replay i porządną sekcję testów. Największa rzecz „do dopięcia” to jednoznaczność mechaniki locków w ticku oraz poprawne uwzględnienie jazdy tyłem w spacing/holdPoint. Po tych dopiskach będzie to dokument, który można implementować modułowo i testować bez domysłów.
