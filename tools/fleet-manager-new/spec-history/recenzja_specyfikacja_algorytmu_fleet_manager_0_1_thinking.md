# Recenzja: „Specyfikacja algorytmu harmonogramowania i rezerwacji korytarzy dla Fleet Manager”

**Recenzowany dokument:** `specyfikacja_algorytmu_fleet_manager.md`  
**Zakres recenzji:** algorytm „Deterministic Corridor Locking (DCL)” + harmonogramowanie zadań + proponowane interfejsy. Kod w repo traktuję jako *spike/prototyp* (źródło obserwacji i edge‑case’ów), a nie jako docelową implementację.

---

## 0. Najważniejsze wnioski (TL;DR)

Specyfikacja jest już „na dobrym torze”: wybór DCL jako wersji 1 jest sensowny, a opis obejmuje kluczowe elementy (lookahead/lookback, deterministic right‑of‑way, stop‑line, rozróżnienie deadlocków logicznych i fizycznych, oraz rozdział planner/lock manager/dispatcher).

Największe rzeczy, które warto dopisać / poprawić, żeby dokument był **bardziej profesjonalny, odporny i future‑proof**:

1) **Uszczelnij język i kontrakty**: rozdziel „wymagania (MUST/SHOULD)” od „uzasadnień” i „mapowania na istniejący kod”; dopisz formalne modele danych (JSON Schema/TS types) i jednoznaczne definicje terminów (edgeKey vs edgeGroupKey vs ResourceId, progress, segmentProgress, itp.).  
2) **Doprecyzuj model czasu i sterowania**: częstotliwości ticków, semantyka TTL, zasady co robimy przy opóźnieniach/statusie nieświeżym/robot offline.  
3) **Dopisz politykę fairness / kolejek**: deterministic ordering daje „brak deadlocków lockowych”, ale nie gwarantuje braku **zagłodzenia** (starvation). Edge queues/priorytety muszą być opisane normatywnie.  
4) **Zrób most do sterowania robotem (Rolling Target Point)**: DCL/holdPoint musi spinać się z tym, co realnie wysyłasz do robota (RTP / waypointy / ograniczenia prędkości), inaczej łatwo o „legalne rezerwacje, fizyczne najechanie” przez latencję i hamowanie.  
5) **Przenieś geometrię konfliktów do „map compiler”**: `edgeConflict` to świetna idea, ale bez opisu *jak to wyliczasz* (i jak wersjonujesz) będzie to źródło regresji.

---

## 1. Co bym poprawił w dokumencie (struktura i czytelność)

### 1.1. Uporządkowanie struktury
Dzisiaj dokument jest hybrydą: „specyfikacja + projekt + komentarz do kodu”. To jest OK na draft, ale do wersji „do implementacji” warto przejść na układ:

1) **Zakres i założenia** (co jest w scope, co nie)  
2) **Słownik pojęć** (terminologia + notacja)  
3) **Wymagania (normatywne)**: Safety, Liveness, Performance, Observability, Integracja  
4) **Algorytm (normatywnie + pseudokod)**: wejścia/wyjścia, kroki, tie‑breaki  
5) **Modele danych i kontrakty** (TS/JSON Schema)  
6) **Parametry i wartości domyślne** (tabela z jednostkami, zakresem, rekomendacją)  
7) **Scenariusze testowe i kryteria akceptacji**  
8) **Rationale / mapping do istniejącego repo** (appendix)

To sprawia, że:
- łatwiej pisać testy,
- łatwiej iterować z AI („tu jest kontrakt, tu jest algorytm, nie zgaduj”),
- łatwiej utrzymać spójność przy kolejnych wersjach.

### 1.2. Konsystencja numeracji i terminów
Warto:
- nie resetować numeracji sekcji w połowie (w tej chwili po „2.” zaczyna się „1)”),
- ujednolicić nazewnictwo:
  - `edgeGroupKey` (np. `A<->B`) vs `ResourceId` (np. `edgeGroup:A<->B`) – to są dwie różne warstwy (klucz domenowy vs identyfikator zasobu). Dokument powinien to rozdzielić jednoznacznie,
  - „corridor entry” / „lock corridor” / „reservation corridor” – najlepiej trzymać jedno słowo.

### 1.3. Normatywny język specyfikacji
Wersja „profesjonalna” powinna używać konsekwentnie:
- **MUST / MUST NOT** – wymagania twarde,
- **SHOULD / SHOULD NOT** – silne rekomendacje,
- **MAY** – opcje.

To redukuje „interpretację” przy implementacji (zwłaszcza przez AI).

---

## 2. Jakie błędy / nieścisłości widzę (i gdzie jest ryzyko)

Nie widzę tu „błędów logicznych” typu: *to się nie może udać*. Widzę natomiast kilka miejsc, gdzie brak doprecyzowania może skończyć się rozjazdem implementacji albo niebezpiecznym edge‑case’em.

### 2.1. Definicja bezpieczeństwa: „bryły bezpieczeństwa” vs uproszczony 1D spacing
Dokument słusznie zaczyna od definicji stref bezpieczeństwa jako bryły 2D, ale potem przechodzi do 1D spacing po progresie na krawędzi.

To jest OK **tylko jeśli** w specyfikacji dopiszesz warunki, kiedy 1D jest wystarczające, np.:
- na edgeGroup (pojedynczy korytarz) wszystkie roboty mają tę samą „oś ruchu” i brak możliwości minięcia,
- geometria krawędzi (polyline) jest używana do wyznaczenia konfliktów na skrzyżowaniach (`edgeConflict`) i do node locks,
- błąd lokalizacji i błąd projekcji na trasę jest uwzględniony w marginesach.

W przeciwnym razie jest ryzyko, że ktoś wdroży 1D spacing „wszędzie”, a w zakręcie / przy równoległych krawędziach o małym odstępie roboty „miną się bokami” w sposób niedoszacowany przez 1D.

**Propozycja dopisku (MUST):** *Jeżeli dwa segmenty polylinii mogą zbliżyć się na odległość < (safety envelope), muszą należeć do tej samej grupy konfliktu albo być objęte wspólnym zasobem (edgeConflict / node).*

### 2.2. Promień obrotu w węźle – dobra formuła, ale brakuje „co to znaczy w runtime”
Wzór na `R_turn` jest sensowny (maksymalna odległość od pivota do narożnika obudowy + marginesy), ale brakuje odpowiedzi:
- *kiedy* robot musi trzymać node lock? (zawsze gdy zbliża się do węzła? tylko gdy planuje skręt? gdy stoi i wykonuje load/unload?)
- co z robotem, który stoi na krawędzi blisko węzła (z czego wynika „ma możliwość obrotu”)?

**Propozycja dopisku:**  
- Node lock MUST być wymagany dla węzłów należących do „stref skrętu/obrotu” w lookahead (konfigurowalnie), oraz MUST być utrzymany podczas operacji `loading/unloading` jeśli odbywają się w obrębie strefy węzła.

### 2.3. TTL locków – dokument mówi „TTL nie jest mechanizmem bezpieczeństwa”, ale trzeba dopisać „co jest”
To jest kluczowe: jeżeli robot **zatrzyma się/zgubi łączność**, TTL wygaśnie, a inny robot może wjechać.

W specyfikacji brakuje normatywnego zachowania na awarie:
- robot offline → czy zamieniamy jego ostatnią pozycję na przeszkodę? na jak długo?
- brak świeżego statusu → czy zamrażamy jego rezerwacje? czy wymuszamy stop innym robotom w pobliżu?

**Propozycja dopisku (MUST):**
- Jeśli `RobotStatusAgeMs > staleThresholdMs`, Fleet Manager MUST traktować obszar w pobliżu ostatniej znanej pozycji robota jako zajęty (lock/obstacle) do czasu odzyskania telemetrii albo ręcznego potwierdzenia przez operatora.

### 2.4. Deterministic probe+commit + „zostaw aktualny edgeGroup” – możliwe zagłodzenie
Model „przy probe FAIL zostawiamy tylko aktualny edgeGroup” jest bezpieczny, ale:
- może tworzyć długie „przytrzymanie” korytarza przez robota, który stoi (bo nadal trzyma aktualny lock),
- i bez jawnej polityki kolejek/fairness może powodować, że ktoś „zawsze przegrywa”.

Warto dopisać:
- czy i kiedy robot ma obowiązek cofnąć się / zwolnić? (np. gdy stoi dłużej niż X i blokuje ruch)
- jak działa kolejka (FIFO? priorytety? aging?)

### 2.5. Konflikty geometryczne (`edgeConflict`) – świetne, ale brak definicji generowania
Dokument wspomina `edgeConflict` jako „auto-derived z geometrii polylines”. To jest miną, jeśli nie dopiszesz:
- jak to liczysz (algorytm, tolerancje),
- gdzie to jest przechowywane (w scenie? w skompilowanej mapie?),
- jak to wersjonujesz i testujesz (żeby nie było „magicznych zmian” między buildami).

---

## 3. Co bym ulepszył (funkcjonalnie) w samym algorytmie

### 3.1. Wyraźna separacja: „safety stop” vs „traffic hold”
W runtime zwykle masz dwa powody zatrzymania:
- **safety stop** (nie wolno jechać dalej, bo naruszyłbyś safety envelope),
- **traffic hold** (czekasz na zasób / kolejkę, ale sytuacja jest stabilna).

Te stany powinny być rozróżnione w API/diagnostyce, bo inaczej debug jest męką.  
Przykład: `holdReason = safety|traffic|robot_fault|operator`.

### 3.2. Formalny model „stop-line” (z hamowaniem, latencją i błędem lokalizacji)
Masz w dokumencie ideę `forwardStopDistanceM`, ale warto dopisać konkretny wzór i parametry:

- `d_brake = v^2 / (2*a_brake)`  
- `d_latency = v * (t_comm + t_control)`  
- `d_localization = localizationErrorP95`  
- `bufferM = spacing + d_brake + d_latency + d_localization + margin`

Wtedy `holdPoint` jest czymś, co realnie „zamyka pętlę” między rezerwacją a sterowaniem.

### 3.3. Kolejki i fairness: opisz minimalną politykę
Proponuję minimalnie (wersja 1):
- `edgeGroup` ma kolejkę FIFO per kierunek (albo wspólną, jeśli korytarz jest single‑lane bez mijanek),
- jeżeli robot jest pierwszy w kolejce i spełnia spacing → może rozszerzać corridor,
- jeśli robot długo czeka, włącz `aging` (wzrost efektywnego priorytetu), żeby ograniczyć starvation,
- tie‑break: `robotId`.

To musi być opisane normatywnie, bo inaczej „deterministic” zacznie zależeć od kolejności ticków.

### 3.4. „Critical sections” jako element mapy (nie tylko strategii)
To jest bardzo dobre rozwiązanie na deadlock fizyczny. Warto dopisać:
- `criticalSectionId` MUST być częścią danych mapy/sceny (kompilowanych), nie tylko runtime strategii,
- sekcja ma parametry: `capacity`, `allowedDirections`, `yieldNodes`,
- wejście do sekcji wymaga posiadania tokenu, a token jest zasobem lockowanym jak inne.

### 3.5. Definicja „postępu na trasie” (segmentProgress) – wymaganie na estimator
W dokumencie słusznie zauważasz, że spacing zależy od wiarygodnego `segmentProgress`. To warto podnieść do rangi wymagania:
- jak projektujesz projekcję pozycji na polyline (snap),
- jak filtrujesz szum (histereza),
- co robisz, gdy robot „teleportuje” (relokacja) lub jest off-route.

---

## 4. Jak zrobić to future‑proof

### 4.1. Stabilne porty: planner / corridor / reservations / dispatch
Masz już dobry szkic interfejsów. Żeby było future‑proof:
- `LockManager` powinien operować na **abstrakcyjnych zasobach** (`ResourceId` + okno przestrzenne/czasowe),
- a nie na konkretnych strukturach z local-sim.

Wtedy wersja 2 (rezerwacje czasoprzestrzenne / MAPF) wymieni tylko „silnik rezerwacji”.

### 4.2. „Map compiler” jako osobny etap
Zrób jasne rozdzielenie:
- **mapa surowa** (graph + polylines),
- **mapa skompilowana** (edgeGroups, edgeConflicts, criticalSections, indeksy).

To daje:
- deterministyczność,
- łatwiejsze testy regresji,
- szybszy runtime (mniej geometrii „na tick”).

### 4.3. Założenia o deployment: single‑instance vs multi‑instance
Jeśli Fleet Manager ma kiedyś działać w HA (kilka instancji), musisz dopisać:
- czy jest jeden „leader” (single writer), czy rozproszony lock store,
- jak wygląda spójność i atomowość commitów.

Jeśli na razie zakładasz *jedną instancję* (najrozsądniej), wpisz to jawnie jako założenie, żeby nikt nie próbował „rozproszyć” locków przez przypadek.

---

## 5. Jak podnieść jakość i profesjonalizm dokumentu

### 5.1. Tabela parametrów (z jednostkami i rekomendacją)
Bardzo polecam jedną tabelę w stylu:

- `lookaheadM` (m) – domyślnie 6–12 m (zależnie od mapy i prędkości)  
- `lookbackM` (m) – domyślnie 1–3 m  
- `lockSyncHz` – 5–10 Hz  
- `dispatchHz` – 1–2 Hz  
- `staleThresholdMs` – np. 500–1500 ms (zależnie od telemetrii)  
- `deadlockTimeoutMs` – np. 10–30 s  
- `localizationErrorP95` – z pomiarów (konfigurowalne per robot)

Bez tego implementacja będzie „na czuja”, a potem ciężko porównywać zachowania.

### 5.2. Kryteria akceptacji (Definition of Done)
Przykłady:
- „W scenariuszu head‑on w single‑lane dwa roboty nigdy nie naruszają safety envelope, a jeden przechodzi bez cofania w czasie ≤ X s.”  
- „W scenariuszu 3‑robot cycle algorytm rozwiązuje konflikt w czasie ≤ Y s (critical section lub yield).”  
- „Po utracie telemetrii robot jest traktowany jako przeszkoda do czasu potwierdzenia.”

### 5.3. Oddziel „Appendix: co jest w repo”
Wersja produkcyjna specyfikacji nie powinna zależeć od tego, że „w local‑sim jest funkcja X”. To jest świetne jako przypis, ale rdzeń spec powinien być niezależny.

---

## 6. Jak zwiększyć odporność na wszelkiego typu błędy (praktyka wdrożeniowa)

### 6.1. Stany awaryjne i degradacja
Dopisz jawnie:
- robot offline → „zamrożenie” obszaru + alarm,
- robot blocked (brak postępu) → retry/replan/eskalacja,
- rozjazd mapy / off-route → safe stop + relokacja,
- operator manual override → lock manager zwalnia zasoby wg reguł bezpieczeństwa.

### 6.2. Atomowość aktualizacji locków
W implementacji (nawet w Node) warto przyjąć model:
- jeden „tick” lock managera aktualizuje globalny stan locków atomowo,
- decyzje nie mogą zależeć od kolejności iteracji po robotach (chyba że to jest jawnie zdefiniowane i deterministyczne).

To minimalizuje „heisenbugi” i czyni system powtarzalnym (a to jest złoto do debug i AI).

### 6.3. Telemetria jako kontrakt (nie „best effort”)
Jeżeli `segmentProgress` i projekcja na trasę są kluczowe, to musisz opisać:
- minimalną jakość danych wejściowych (częstotliwość, maksymalna latencja),
- co robisz gdy tych gwarancji nie ma.

---

## 7. Jak to ułatwić do pracy z AI (bardzo konkretnie)

1) **JSON Schema/TS types** dla:
   - `RobotState`, `RobotKinematics`, `RoutePlan`, `RouteSegment`, `CorridorEntry`,
   - `LockStateSnapshot`, `LockResult`, `HoldPoint`,
   - `Task`, `Stream`, `DispatchPlan`.
2) **Przykładowe payloady** (2–3 „golden examples”) – AI jest dużo skuteczniejsze, gdy ma wzorce.  
3) **Scenariusze testowe jako dane** (fixtures):
   - mała mapa (10–30 węzłów) + pozycje startowe + cele + oczekiwane locki/holdy.  
4) **Wymagania jako inwarianty** (do property‑based tests):
   - „nigdy nie ma dwóch robotów z lockiem na przeciwnych kierunkach tego samego edgeGroup”,
   - „robot nie przekracza holdPoint o więcej niż ε”, itd.  
5) **Deterministyczny replay**:
   - zapisuj eventy: tick, statusy robotów, decyzje lock managera, przydziały tasków,
   - jeden plik = jedna regresja = idealne do „AI‑debug”.

---

## 8. Rolling Target Point (RTP) – gdzie to dopisać i jak to spiąć z DCL

Warto dodać osobną sekcję w specyfikacji algorytmu (tu, nie tylko w dokumencie architektury), bo RTP jest *częścią pętli sterowania*, a nie tylko „detalem komunikacji”.

### 8.1. Minimalna specyfikacja RTP (proponowana)
- Fleet Manager utrzymuje globalną trasę (polyline) i cyklicznie wysyła robotowi **punkt docelowy** wzdłuż trasy w odległości `rtpLookaheadM`.
- `rtpLookaheadM` MUST być tak dobrane, aby robot mógł płynnie jechać, ale jednocześnie nie „przestrzelił” za stop‑line.

### 8.2. Krytyczne sprzężenie: RTP a holdPoint
Jeżeli LockManager zwróci `holdPoint`, to Fleet Manager MUST:
- **nie wysyłać RTP za holdPoint**, oraz
- uwzględnić hamowanie/latencję.

Praktyczna reguła:
- `s_target = min(s + rtpLookaheadM, s_hold - safetyStopBufferM)`
- jeśli `s_hold` jest bardzo blisko → przejdź w tryb „stop/creep” albo wyślij `pause/stop` (zależnie od możliwości robota).

### 8.3. Zależność horyzontów
Żeby to było spójne:
- `lockLookaheadM` (rezerwacje) SHOULD być większe niż `rtpLookaheadM` + bufor hamowania i latencji.  
W przeciwnym razie robot będzie „chciał” jechać dalej niż masz zarezerwowane, co generuje nerwowe zatrzymania.

---

## 9. Lista konkretnych dopisków (checklista „do zrobienia”)

1) **Słownik pojęć + notacja** (edgeKey/edgeGroupKey/ResourceId, progress, lookahead/lookback).  
2) **Sekcja RTP** (wejścia/wyjścia, integracja z holdPoint, parametry).  
3) **Sekcja „Failure modes”** (offline/stale/off-route/blocked/manual).  
4) **Polityka kolejek i fairness** (normatywnie, z tie‑breakami).  
5) **„Map compiler”**: generowanie `edgeConflict` + `criticalSection` jako artefakt sceny.  
6) **Tabela parametrów** (jednostki, zakres, wartości domyślne).  
7) **Kryteria akceptacji + test matrix**.

---

## 10. Co jest już bardzo dobre (warto utrzymać)

- Rozróżnienie deadlocków logicznych vs fizycznych i podanie trzech rozwiązań (map constraint / critical sections / yield) – to jest praktyczne i dojrzałe.  
- Pomysł „probe + commit” z deterministycznym orderingiem – dobry baseline dla wersji 1.  
- Rozdział interfejsów (Planner / CorridorBuilder / LockManager / Dispatcher) – to jest dokładnie to, co pozwoli Ci zrobić wersję 2 bez przepisywania wszystkiego.

---

**Podsumowanie:** dokument nadaje się jako solidny „draft do implementacji”, ale żeby był *production‑grade spec*, brakuje mu kilku twardych elementów: kontraktów danych, parametrów z jednostkami, polityki fairness oraz spięcia z realnym sterowaniem robotem (RTP + hamowanie + latencja + błąd lokalizacji). Dopisanie tych sekcji nie zmienia koncepcji DCL – tylko zamienia ją w coś, co da się wdrożyć bez niespodzianek.
