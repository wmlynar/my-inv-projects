# Recenzja: „Specyfikacja algorytmu harmonogramowania i zarządzania ruchem dla Fleet Manager (v0.2)”

**Data:** 2026-01-06  
**Recenzowany dokument:** `specyfikacja_algorytmu_fleet_manager_v0_2.md` (v0.2 / Draft)  
**Zakres recenzji:** wyłącznie specyfikacja algorytmu (DCL‑2D + scheduling + RTP + failure modes + testy). Kod/prototyp traktuję jako kontekst, ale nie jako „źródło prawdy”.

---

## Część 1 — Prompt, który wygenerował tę recenzję

```text
no dobrze, a teraz majac swoja specyfikacje algorytmu fleet managera 0.2

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

prosze przeslij swoja recenzje wedlug powyzszych punktow. i przeslij link do pliku .md do pobrania tej recenzji. zalacz tez prompt, ktory spowodowal wygenerowanie do tej recenzji
```

---

## Część 2 — Recenzja specyfikacji v0.2

### Najważniejsze wnioski (żeby nie utonąć w szczegółach)

Spec v0.2 jest już „prawie implementowalna”: ma wyraźny model bezpieczeństwa 2D, przeniesienie geometrii do Map Compiler, deterministyczny LockManager, opis RTP, failure modes, replay i strategię testów. To jest bardzo dobry kierunek.

W v0.3 skupiłbym się na 3 rzeczach, które najbardziej podnoszą jakość i odporność:

1) **Uszczelnienie kontraktu „assumptions → guarantees”** (jakie warunki muszą być spełnione, żeby gwarancja braku kolizji była prawdziwa).  
2) **Doprecyzowanie kilku kluczowych algorytmów w formie pseudokodu + formuł** (hold‑point, corridor slicing, grant/deny w ticku, fairness/aging).  
3) **Wyeliminowanie niejednoznaczności/niespójności nazewnictwa i odwołań** (kilka drobnych, ale potencjalnie kosztownych błędów).

Poniżej rozpisuję to dokładnie wg Twoich punktów.

---

## 1) Co jeszcze bym w niej poprawił

### 1.1. Zrobić sekcję „Assumptions & Guarantees” (bardzo twardą)
W v0.2 są założenia rozsiane po dokumencie (marginesy, stale telemetry, off‑route), ale brakuje jednego, ostrego miejsca:

- **Assumptions (MUST / SHOULD):**
  - maksymalny błąd lokalizacji (np. `poseMarginM`) i jak jest weryfikowany,
  - maksymalny błąd śledzenia trajektorii (`trackingMarginM`) i jak jest weryfikowany,
  - minimalna częstotliwość telemetrii i maksymalna latencja (`telemetryTimeoutMs`, `commandLatencyMs`),
  - maksymalna prędkość i opóźnienie hamowania (dla `d_stop`),
  - ograniczenia mapy (np. brak „teleportów”, spójność geometrii, walidacje).

- **Guarantees (MUST):**
  - brak kolizji w 2D (na poziomie obwiedni),
  - brak możliwości „fizycznego deadlocka head‑on” na single‑lane,
  - brak oscylacji w sensie zdefiniowanej metryki,
  - deterministyczny replay.

Bez tego przy implementacji ktoś nieświadomie zmieni warunek wejściowy i „gwarancja” przestaje obowiązywać, a dokument nadal wygląda poprawnie.

### 1.2. Bardziej konsekwentnie oddzielić „wersja 1” od „możliwe ulepszenia”
W wielu miejscach masz „wersja 1” + „future”. To jest super, ale warto to ujednolicić:

- na początku każdej sekcji: **„MVP MUST”** (to robimy na pewno),
- osobno: **„SHOULD (recommended)”**,
- osobno: **„FUTURE (non‑binding)”**.

To zwiększa implementowalność i zmniejsza ryzyko, że ktoś „dopisze future” i zepsuje MVP.

### 1.3. Ujednolicić nazewnictwo jednostek w nazwach pól
Masz miks:
- `head`, `tail`, `width` (bez jednostki w nazwie),
- a w payloadach pojawia się `headM`, `tailM`, `widthM`,
- w tabeli: `safetyFront/Rear/SideM` (z ukośnikami).

To są drobiazgi, które w praktyce generują bugi i frustrację (zwłaszcza gdy AI generuje typy / API). Wybierz jeden styl:

- albo **zawsze** `*M`, `*Ms`, `*Rad`,
- albo **nigdy** i trzymaj jednostki wyłącznie w opisie.

Ja bym wybrał styl „zawsze z jednostką”, bo wtedy payload sam się dokumentuje.

### 1.4. Doprecyzować semantykę „węzeł jako sloty” vs „węzeł jako punkt”
Sekcja o slotach jest dobra, ale ryzykowna, bo to jest miejsce, gdzie łatwo o „prawie działa”.

Warto dodać twarde reguły:
- kiedy sloty są wymagane (np. `nodeCapacity>1`),
- jak wyliczasz pozycje slotów,
- jak LockManager wybiera slot deterministycznie,
- jak robot ma się „ustawić” na slocie (czy to jest osobny mini‑cel na krawędzi, czy target w węźle).

Jeśli to zostanie niejednoznaczne, implementacja zacznie „robić coś”, a potem to będzie bolało w integracji.

---

## 2) Co jeszcze bym tam dodał

### 2.1. Jawna definicja `R_turn_effective`
W v0.2 jest `R_turn` i jest `R_turn_effective`, ale `R_turn_effective` nie ma jednej, jednoznacznej formuły.

Dopisałbym coś w tym stylu:

- `R_turn_base = R_turn` (z §4.3),
- `R_turn_effective = R_turn_base + poseMarginM + trackingMarginM + turningExtraMarginM(if turning) + staleTelemetryMarginM(if stale)`

…albo, jeśli marginesy już siedzą w `frontExt/sideExt/rearExt`, to opisać to wprost, żeby nikt nie policzył dwa razy.

### 2.2. Formalny algorytm wyznaczania hold‑point (z formułą)
W §8.11 masz wymagania, ale brakuje „jak to policzyć”.

Warto dopisać (w pseudokodzie):
- wejście: obecny postęp `s`, lista granted cells, `d_stop(v)`,
- wyjście: `s_hold`,
- reguły: `s_hold` zawsze <= koniec ostatniej granted komórki minus margines, nie przeskakuje gwałtownie (histereza), jest stabilny.

To krytyczne, bo hold‑point to miejsce, gdzie algorytm spotyka fizykę.

### 2.3. Minimalny, kompletny opis Map Compiler output (jako artefakt sceny)
W spec jest „co Map Compiler robi”, ale brakuje „jak wygląda wynik” (kontrakt danych).

Dodałbym jeden JSON5 „golden example”:

- `compiledMapHash`, `sourceMapHash`, `cellLenM`, `R_turn_assumed`,
- lista `cells[]` z:
  - `cellId`, `edgeId`, `k`, `[s0, s1)`, `polylineSegment`,
  - `conflictSet[]` (albo indeks do tabeli),
  - `criticalSectionId?`,
- `nodeCells[]` (węzły / sloty),
- `edgeGroups[]` z `singleLane`, `lanes`, `dirStateKey`.

To bardzo ułatwi implementację i testy.

### 2.4. Metryka oscylacji (definicja liczbowo)
Masz wymaganie „za wszelką cenę unikamy oscylacji” i mechanizmy (histereza), ale brakuje definicji metryki.

Przykład metryki (do testów):
- `toggleCount(robot, windowMs)` = liczba przełączeń trybu GO↔HOLD w oknie czasu,
- `holdJitterM(robot, windowMs)` = maks. zmiana hold‑point w oknie,
- DoD: `toggleCount < N`, `holdJitterM < M`.

Bez metryki „oscylacja” pozostaje subiektywna.

### 2.5. Wymagania wydajnościowe (nawet minimalne)
Nawet miękkie SLO robią robotę:

- ile robotów ma obsłużyć LockManager w ticku,
- jak często tick ma działać (Hz),
- maksymalny czas ticka,
- maksymalny rozmiar conflictSet w praktyce (lub ostrzeżenie, że duży conflictSet = wolniej).

To jest ważne, bo cell‑based konflikty mogą eksplodować, jeśli nie ma prekomputacji i indeksów.

---

## 3) Jakie błędy widzę

### 3.1. Błędne odwołanie w §5.3
W §5.3 jest odwołanie:

- „…spacing i rezerwacji (patrz §8.8)”

…ale §8.8 to anti‑oscillation, a spacing jest w §8.10. To drobne, ale w recenzjach/implementacji robi zamieszanie.

### 3.2. Niespójność nazw parametrów safety w tabeli
W §14 masz `safetyFront/Rear/SideM` (z ukośnikami), a w treści używasz `safetyFrontM`, `safetyRearM`, `safetySideM`.

To jest typowy generator błędów w implementacji i w konfiguracjach.

### 3.3. `conflictSet` bez wymogu symetrii i bez „self‑conflict”
W §5.5 brakuje normatywnego wymagania, że:
- jeśli `B ∈ conflictSet[A]`, to `A ∈ conflictSet[B]` (symetria),
- `A` jest w konflikcie z samym sobą (traktowane jako zajęte, gdy przydzielone).

Bez tego łatwo o sytuację, gdzie runtime ma asymetryczną tabelę i robi „pół‑kolizje”.

### 3.4. „Prefiks komórek” może być źle zrozumiany
W §5.4 jest sformułowanie, że robot rezerwuje „dowolny prefiks komórek”.
Dla robota, który jest w środku krawędzi, to musi oznaczać prefiks **od jego aktualnego s w kierunku jazdy**, a nie od `s=0` krawędzi.

Warto dopisać jedno zdanie definicyjne, żeby uniknąć implementacji, która rezerwuje od początku edge’a.

---

## 4) Co bym ulepszył (konkretnie)

### 4.1. Jedno „źródło prawdy” dla bezpieczeństwa: cell‑locking vs 1D spacing
Masz dwa podejścia:
- 2D konflikty komórek (bezpieczne, konserwatywne),
- opcjonalne 1D spacing (bardziej przepustowe).

Na MVP warto wybrać jedno jako kanoniczne i drugie jako opcję z flagą:
- `trafficPolicy = CELL_ONLY | CELL_PLUS_1D_SPACING`

W przeciwnym razie implementacja łatwo zacznie mieszać zasady i trudniej będzie debugować.

### 4.2. Fairness/aging jako deterministyczna funkcja, nie „magia”
W §8.7 jest „aging”, ale bez formuły.
Dodałbym prostą, deterministyczną definicję:

- `effectivePriority = basePriority + floor(waitMs / fairnessStepMs)` z capem,
- tie‑break: `robotId`.

I dopisałbym, że aging **nie może** przełamywać „sticky‑grant zasobów, w których robot już jest”.

### 4.3. Gating critical sections jako „token capacity” (czytelniejsze)
W §8.9 mówisz o critical sections i „exit clearance”.
Warto to opisać jako zasób:

- `ResourceId = criticalSection:<id>`,
- `capacity = 1`,
- robot musi zdobyć token zanim dostanie komórki w tej sekcji.

To się świetnie tłumaczy (UI też), a implementacyjnie upraszcza (jedna ścieżka kodu: „sprawdź zasób”).

### 4.4. Bardziej jednoznaczny „re-sync” po pose jump / off‑route
W §10 jest dobra intuicja, ale dodałbym „protokół”:

- STOP (HOLD/EMERGENCY),
- zamroź locki jako przeszkodę,
- snap robota do najbliższej legalnej pozycji na geometrii (albo oznacz „unknown”),
- wyznacz nową trasę od snapped s,
- dopiero wtedy ponownie przydzielaj corridor.

To redukuje sytuacje, gdzie robot ma stare locki niepasujące do nowego położenia.

---

## 5) Jak zrobić, żeby była jeszcze bardziej future‑proof

1) **Wersjonowanie Map Compiler artefaktów**: dopisać twardy kontrakt kompatybilności i narzędzie migracji (nawet jeśli to będzie proste na start).

2) **Abstrakcja „Resource”**: już jest w dokumencie, ale warto dopisać, że każdy nowy typ konfliktu (multi‑lane, time reservation, strefy dynamiczne) to tylko nowy `ResourceKind` + polityka capacity.

3) **Przygotowanie pod time‑based reservations**:
   - nawet jeśli MVP jest „space‑based”, w danych zasobu można przewidzieć pole `timeWindow?`.

4) **Przygotowanie pod lokalne omijanie przeszkód**:
   - dopisać, że w przyszłości robot może chwilowo opuścić centerline w korytarzu `width>0`,
   - wtedy Map Compiler powinien generować „korytarz” jako obszar, nie linię.

5) **Capability negotiation** (na styku z robotem): nawet w algorytmie warto wskazać, że RTP/STOP/ACK mogą się różnić per provider.

---

## 6) Jak zrobić, żeby była lepszej jakości

- Dodać na końcu sekcji kluczowych (DCL‑2D, RTP, Failure Modes) małą checklistę: „co musi zostać zaimplementowane, żeby sekcja była spełniona”.
- Zrobić 6–10 „golden scenariuszy” i opisać je tak, żeby dało się je zaimplementować w jeden weekend.
- Ujednolicić język normatywny (MUST/SHOULD/MAY) i pilnować go w całym dokumencie.
- Dopisać sekcję „Glossary of IDs”:
  - jak wygląda `cellId`, `edgeId`, `edgeGroupId`, `nodeId`, `criticalSectionId`,
  - które są stabilne między wersjami mapy, a które mogą się zmieniać (np. cellId zależy od cellLenM).

---

## 7) Jak zrobić, żeby była bardziej profesjonalna

- Dodać metadane na początku: owner, status, repo link, „approval flow”.
- Dodać „Traceability”: tabela „wymaganie → test → log”.
- Dodać 2–3 diagramy (nawet ASCII):
  - pipeline ticka,
  - flow RTP/hold,
  - flow re-sync po off‑route.
- Dopisać „Non‑goals” per wersja (v0.2, v0.3), żeby zespół nie próbował robić wszystkiego naraz.

---

## 8) Jak zrobić, żeby była bardziej odporna na wszelkiego typu błędy

### 8.1. Zasada fail‑closed
Jeżeli nie masz świeżej telemetrii albo nie jesteś pewien pozycji:
- robot jest traktowany jako większa przeszkoda,
- reszta floty zachowuje się konserwatywnie.

To w dokumencie jest, ale warto to podbić jako nadrzędną zasadę (jedna linijka na początku sekcji §10).

### 8.2. Walidacje jako warunek uruchomienia sceny
Map Compiler/validator powinien blokować start sceny, jeśli:
- conflictSet nie może być policzony,
- węzły są zbyt blisko, by zapewnić `R_turn`,
- single‑lane ma geometrię, która może powodować „fizyczne zakleszczenie” bez możliwości przejazdu (przynajmniej jako WARNING).

### 8.3. Logi „zawsze” + rotacja + minimalny zestaw pól
Dobrze jest dopisać minimalny „schema loga”:
- tick, nowMs,
- robot poses,
- granted cells,
- holdPoints,
- reason codes (dlaczego deny),
- hashes (compiledMapHash, paramsHash).

Wtedy debug jest mechaniczny, a nie intuicyjny.

### 8.4. „Reason codes” jako część kontraktu
Jeśli robot stoi, system powinien umieć powiedzieć „dlaczego” w sposób maszynowy:
- `WAIT_CONFLICT_CELL`,
- `WAIT_EDGE_DIR_LOCK`,
- `WAIT_CRITICAL_SECTION_TOKEN`,
- `WAIT_TASK_UNAVAILABLE`,
- `STOP_STALE_TELEMETRY`,
- itd.

To jest ogromny upgrade jakości, także dla UI i dla AI.

---

## 9) Jak zrobić, żeby jeszcze lepiej się nadawała do pracy z AI

1) **Złote przykłady payloadów (masz) + dodać „golden expected outputs”**:  
   np. wejście scenario → oczekiwany `grantedResources` dla ticków 0..N (albo chociaż kluczowe ticki).

2) **JSON Schema / TS types jako dodatkowy artefakt** (nie zamiast JSON5):  
   JSON5 jest świetny do czytania, ale typy/schemy są świetne do generowania i walidacji (AI jest wtedy mniej skłonna „wymyślać pola”).

3) **Scenariusze property‑based**: generator małych map + losowe start/goal + sprawdzanie inwariantów z §4.6.

4) **Replay‑as‑dataset**:  
   standard pliku replay (np. `replay.jsonl`) + narzędzie, które potrafi:
   - wyciąć minimalny repro (delta debugging),
   - policzyć metryki (deadlock/oscillation/throughput),
   - porównać dwa algorytmy (A/B).

5) **„Single source of truth” dla parametrów**:  
   parametry z §14 powinny być również maszynowo czytelne (np. `params.json5`) i automatycznie załączane do logów.

6) **Reguła „AI nie zgaduje”**:  
   w spec dodać zasadę: jeśli coś nie jest zdefiniowane, to ma być *explicitly rejected by validator* zamiast „domyślnie 0” (to eliminuje masę cichych błędów).

---

## Proponowana mini-checklista do v0.3 (najbardziej opłacalne poprawki)

- [ ] Dodać sekcję **Assumptions & Guarantees** (jedno miejsce).  
- [ ] Naprawić odwołanie §5.3 → §8.10.  
- [ ] Ujednolicić nazwy parametrów safety (`safetyFrontM` itd.).  
- [ ] Dopisać formułę `R_turn_effective`.  
- [ ] Dopisać pseudokod hold‑point + grant/deny ticka.  
- [ ] Dopisać wymóg symetrii `conflictSet`.  
- [ ] Dopisać reason codes i minimalny schema logów.

---

*Koniec recenzji.*
