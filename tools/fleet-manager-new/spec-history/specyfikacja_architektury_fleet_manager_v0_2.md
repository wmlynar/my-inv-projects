# Fleet Manager 2.0 — Specyfikacja architektury (v0.2 / draft)

> **Uwaga:** To jest zaktualizowana wersja specyfikacji architektury, przygotowana na bazie v0.1 oraz zebranych recenzji. Dokument jest napisany w sposób możliwie „normatywny” (MUST/SHOULD/MAY/MUST NOT) i ma być podstawą do implementacji modułów niezależnie, przez ludzi i przez AI.

---

## Część 1 — Prompt użytkownika i cel dokumentu

### Prompt (oryginalny)

```text
zallaczam projekt fleet managera, zapoznaj sie z nim i z dokumentacja. fleet manager to program do zarzadania autonomicznymi wozkami widlowymi. ten program nie dziala zbyt dobrze i chcialbym go przepisac. ale podoba mi sie ui. chodzi mi o to, zeby przygotowac konspekt dokumentu specyfikacji calego projektu. projekt powienien byc bardzo modulowy tak, zeby mozna byo pracowac nad czesciami niezaleznie, porozumiewajac sie przez api. dzieki temu bedzie mogla nad tym efektywnie pracowac sztuczna inteligencja. proponuje takie moduly: interfejs uzytkownika, czyli frontend, ktory zajmuje sie wyswietlaniem mapy razem z wozkami i interakcja z uzytkownikiem. oraz da uzytkownikowi wglada jakie sa wozki, jaki jest stan pol odkladczych / odbiorczych. jakie sa zdefiniowane strumienie. jakie zadania wykonuja wozki. we frontendzie powinien byc kod potrzebny do obslugi interakcji z uzytkownikiem. jednak system powinien dzilac w zupelnisci bez wlaczonego frontendu. co wiecej powinno byc mozliwe kilka forntendow jednoczesnie. patrzacych na ten sam projekt. no tego powinien byc silnik nawigacyjny. ten silnik powinien wczytywac konfiguracje, zarzadac wozkami autonomicznymi. w tym silniku powinna byc mozliwosc wyboru algorytmu zarzadaania tymi wozkami. algorytm bedzie opracowanay w oddziwlnej specyfikacji. dodatkowo powinna byc mozliwosc dynamiczej zmiany mapy i konfiguracji. taka mapa z konfiguracja nazywamy scena. frontend powinine byc interfejsem do tego silnika. innym interfejscem powinien byc interfejs do roboshopa. czyli aplikacji zewnetrznej, ktora moze podgrywac mape. ale byc moze, zeby archtektura byla czytelniejsza to silnik powinien byec tylko api restowe. a ten interfejs do roboshopa powininen byc oddzialna aplikacja. do tego silnik powinien komunikowac sie z wozkami autonomicznymi. do tego tez jest interfejs robocore. jednak byc moze zarzadzaniem wozkami rowniez powinien zajmowac sie oddzielny program. i silnik z samym zarzadca wozkow, czyli same komendy tez powinny byc po rest api. a moze to nie jest dobry pomysl i lepiej zeby sillnik od razu korzystal z api roboshop? tak czy siek w silniku powinna byc mozliwosc symulacji robotow. i to by byla symulacja wewnetrzna. symulator powinein uwzgledniac wiele wozkow i mozliwe kolizja pomiedzy nimi. dodatkowo powinine byc symulator, korzystajacy z tych samych algorytmow symulacji robota, w sensie korzystajacy z api robokit. tak, zeby mozna byl przetestowac rozwiazania bez prawdziwego robota. no i na koniec powinna byc moliwosc przellaczenia na prawdziwego robota. to wszystko powinno mie elegancki design. latwy, prosty czytelny. latwy do zrozumienia i do pracy z AI. interfejsy powinny byc bardzo ladnie zrokumenowane. dodatkowo, warto zaznaczyc, ze robot powinien byc sterowany takim rolling target pointem. chodzi o to, zeby robot fizyczny dostawal cel ajko punkt odlegly przynajmniej o x metrow wzdluz trasy, ktora ma planner. robot ma swoja mape i planuje sobie lokalna trase. docelowo, wozek robot bedzie mogl zajmowac sie lokalnym omijaniem przezkod, to bedzie mozliwe, gdy bedzie mogl lokalnie planowac trase. jednak to dopiero w kolejnym kroku. oczywiscie omijanie przeszkod bedzie mozliwe tylko w niektorych miejscach mapy / grafu, tam gdzie szerokosc width jest ustawiona > 0. wiec na poczatek mozemy to pominac i zrobic algorytm, ktory zaklada ze nie ma omijania przeszkod. jedyne co musimy zapewnic to to, ze wiemy, ze wozek sie zablokowal oraz ze bedzie chcial wejsc w tryb omijania przezkod. ale wracajac do architektury, mamy jeszcze dodatkowa rzecz. to bedzie proxy pomiedzy programem roboshop do zarzadzania a fizycznym roboetem, zeby mozna bylo podsluchac protokoly. no i proxy pomiedzy roboshopem a rds'em czyli innym gotowym fleet managerem, gdzie przez roboshop mozna podgrywac mapy i robic konfiguracje. no ale to proxy to troche takie niezaezne oprogramowanie, ktore tylko powinno miec ustawienia co one podsluchuje, na ktorych portach i jakie sa adresy, oraz gdzie zapisuje, tak, zeby mozna bylo wygodnie podsluchiwac kompunikacj ep poiedzy roboshopem a roznymi robotami - w celu developmentu. no i tak, w tym domumencie bardzij chodzi mi o to, zeby opracowac overview calej architektury rozwiazania. ajkaie wszystkei proprojekty, jak powinein byc konfigurowany kazdy projekt. jakie dane. jak mozn a dynamicznie konfigurowac. jak zrobic zeby symulatoer wewnetrzny mial kilka robotow. ale rowniezm zeby w trakcie symulacji mozna bylo przelaczac jednego z robotow w projekcie na symulowanego przez protokol robocore, lub na prawdziwego robota. wszelkie interfejsy, wszystko co bedzie potrzebne do przyszlej implementacji. wszystko eleganckie, proste, odporne na bledy i na przerywy w komunikacji sieciowej. bedenralnie bardzo profesjonalne i bardzo wysokiej jakosci. przygotuj pierwsza wersje takiej specyfikacji, najbardziej obszerna jak sie da. opisz rowniez potencjalne pulapki, co sie moze nie udac, jakie sa ryzyka i jak je rozwiazac. gdybys mial inne propozycje to tez napisz. a moze tez zidentyfikowales jakis komponent. zastanow sie i przeslij bardoz obszerny dokument ajko odpowiedz
```

### Dodatkowe wymagania do v0.2 (Twoje uwagi po recenzjach)

- Dokument MUST być bardziej **normatywny**: używać MUST / SHOULD / MAY / MUST NOT.
- Dokument MUST wyraźnie **oddzielać domenę od integracji** (hexagonal / ports & adapters).
- Między modułami/usługami MUST być użyte **HTTP** (w tym SSE/WS po HTTP). (Brak gRPC w tej wersji).
- Dokument SHOULD zawierać **scenariusze/flow** (np. sekwencje operacji).
- Jednostki MUST być: **metry** i **radiany**.
- Na tym etapie nie robimy negocjacji „co wspieramy” — **implementujemy wszystko**.
- Dokument MUST dokładnie opisać komunikację z robotem przez **RoboCore/Robokit**, w tym **format ramek** i przykładowe „komendy” (np. jedź do).
- Testy MUST spełniać **piramidę testów** (dużo unit), i SHOULD dać się uruchamiać **równolegle**.
- System MUST zbierać **logi na dysk** i **snapshoty stanów** (replay/debug).
- Dokument SHOULD mieć bardziej obszerne opisy komponentów.
- Kontrakty API w dokumencie SHOULD być przede wszystkim **czytelne dla ludzi**: przykłady payloadów w **JSON5 z komentarzami** (zamiast samego schema).

### Cel dokumentu

Zaprojektować architekturę nowego „Fleet Manager 2.0” (zarządzanie autonomicznymi wózkami widłowymi), tak aby:

- była modularna i łatwa do równoległej pracy (również przez AI),
- zachowała sens obecnego UI (i dała możliwość kompatybilności),
- wspierała: sceny, dynamiczne zmiany, wielo‑frontend, symulację multi‑robot, integrację z Roboshop i robotami przez RoboCore/Robokit,
- była odporna na przerwy sieci, restart usług i błędy integracji,
- dawała mocną obserwowalność (logi + snapshoty + replay),
- była „future‑proof”, ale bez mnożenia abstrakcji ponad potrzeby.

---

## Część 2 — Specyfikacja architektury

# 1. Document control

- **Nazwa:** Fleet Manager 2.0 — Specyfikacja architektury
- **Wersja:** v0.2 (draft)
- **Data:** 2026-01-06
- **Status:** Draft → do iteracji implementacyjnych
- **Zakres:** architektura systemu (nie specyfikacja algorytmu przydziału/planowania — to jest osobny dokument)
- **Język:** PL (kontrakty i nazwy pól w API mogą być EN, ale dokumentacja jest PL)

## 1.1 Changelog (v0.1 → v0.2)

Najważniejsze zmiany w tej wersji:

- Dodano język normatywny MUST/SHOULD/MAY/MUST NOT.
- Uporządkowano granice: domena vs integracje (hexagonal).
- Ujednolicono transport międzymodułowy: HTTP (w tym SSE/WS po HTTP).
- Uszczelniono semantykę realtime: cursor, reconnect, snapshot, backpressure.
- Doprecyzowano multi‑frontend: optimistic concurrency (ETag/If‑Match) + audit.
- Doprecyzowano recovery/restart i „ghost command” prevention.
- Dodano wymagania: logi + snapshoty stanu na dysk (replay).
- Rozszerzono: opisy komponentów, scenariusze, testy (piramida + równoległość).
- Dodano szczegółowy opis protokołu RoboCore/Robokit (ramki, porty, przykładowe komendy).

---

# 2. Słownik normatywny

W tym dokumencie słowa kluczowe:

- **MUST** / **MUST NOT** oznaczają wymagania bezwzględne.
- **SHOULD** / **SHOULD NOT** oznaczają wymagania silne, ale dopuszczające wyjątki (wyjątek MUST być uzasadniony i udokumentowany).
- **MAY** oznacza opcję.

---

# 3. Streszczenie wykonawcze (dla ludzi i AI)

System jest podzielony na kilka niezależnych modułów komunikujących się przez HTTP:

1. **Fleet Core** (serce, domena + API): jedyne miejsce, które mutuje „runtime state” floty. Udostępnia REST API oraz SSE stream dla UI i integracji.
2. **Robot Gateway** (integracja z robotami): izoluje protokoły (RoboCore/Robokit TCP), utrzymuje połączenia, retry/circuit breaker, watchdog; wystawia jednolite HTTP API „robot driver” dla Fleet Core.
3. **Robot Providers** (źródła robotów per robot): internal sim, robokit sim, robokit real — wybierane dynamicznie per robot.
4. **Scene subsystem**: sceny są immutable revisions (mapa + konfiguracja). Runtime state (taski, occupancy, obstacles) jest osobno i jest logowany.
5. **Roboshop Adapter** (integracja map/konfiguracji): osobna aplikacja, która importuje/eksportuje sceny do formatu Roboshop/RDS i gada z Fleet Core po HTTP.
6. **Proxy/Recorder**: osobne narzędzie do podsłuchu (TCP i HTTP), zapisu i opcjonalnego replay.

Kluczowy mechanizm sterowania robotem: **Rolling Target Point (RTP)** — Fleet Core planuje globalnie i regularnie wysyła do robota „toczący się” punkt celu wzdłuż trasy (lookahead ≥ X metrów). Robot (realny) planuje lokalnie.

---

# 4. System context (C4 — Context)

## 4.1 Aktorzy i systemy zewnętrzne

- **Operator (UI)**: człowiek używający jednego lub wielu frontendów.
- **Integrator**: Roboshop (zewnętrzna aplikacja do map/konfiguracji) lub inny system WMS/ERP (przyszłościowo).
- **Roboty**: wózki widłowe (realne) oraz roboty symulowane.
- **RDS / inny fleet manager**: opcjonalnie, gdy Roboshop gada z „innym gotowym FM”.
- **Developer tools**: proxy/recorder, replay harness, scenario runner.

## 4.2 Kontekst — schemat (ASCII)

```text
+-------------------+         HTTP/SSE          +-------------------+
|   Frontend(s)     | <-----------------------> |     Fleet Core     |
| (UI thin client)  |                           |  (Domain + API)    |
+-------------------+                           +---------+---------+
                                                          |
                                                          | HTTP
                                                          v
                                                 +--------+---------+
                                                 |    Robot Gateway  |
                                                 | (Robocore adapter)|
                                                 +--------+---------+
                                                          |
                                                          | RoboCore/Robokit TCP
                                                          v
                                                   +------+------+
                                                   |   Robot(s)  |
                                                   +-------------+

Roboshop <----HTTP----> Roboshop Adapter <----HTTP----> Fleet Core

Proxy/Recorder: MITM TCP/HTTP, zapis ramek, replay (dev tools)
```

---

# 5. Zasady architektury

## 5.1 Hexagonal: domena vs integracje

1. Kod domenowy MUST być „pure” (deterministyczny, bez I/O).
2. Warstwa domenowa MUST NOT importować adapterów integracyjnych.
3. Integracje (Robokit/RoboCore, Roboshop, FS/DB) MUST być realizowane przez porty/adapters.
4. Każda integracja MUST mieć:
   - kontrakt (API/port),
   - testy kontraktowe,
   - fake/symulator do testów.

## 5.2 Single-writer runtime state

1. Fleet Core MUST być **single-writer** dla runtime state (taski, occupancy, rezerwacje, przydziały).
2. Robot Gateway MUST być źródłem telemetrii i wykonawcą komend, ale MUST NOT podejmować decyzji domenowych (np. przydział tasków) — wyjątek: watchdog/stop (safety).

## 5.3 Transport i format danych

1. Komunikacja między modułami/usługami MUST używać **HTTP**.
2. Realtime MUST używać SSE lub WebSocket (po HTTP). W tej wersji SSE jest kanoniczne.
3. Payloady HTTP MUST być `application/json` (bez komentarzy).  
   Przykłady w dokumencie są w **JSON5** dla czytelności (komentarze), ale na wire muszą być JSON.

## 5.4 Jednostki i układ współrzędnych

1. Pozycje i dystanse MUST być w **metrach** (`m`).
2. Kąty MUST być w **radianach** (`rad`), z normalizacją do zakresu `[-π, +π)` lub `[0, 2π)`, ale wybór musi być konsekwentny (tu: `[-π, +π)`).
3. Prędkości liniowe MUST być w `m/s`, przyspieszenia w `m/s^2`, prędkości kątowe w `rad/s`.
4. Czas:
   - znaczniki czasu (`timestamp`) MUST być w ms od epoch (UTC) lub ISO-8601 (UTC),
   - interwały/duration MUST być w ms (liczba całkowita).

## 5.5 At-least-once + idempotencja

1. Event stream MUST być projektowany jako **at-least-once** (eventy mogą się powtórzyć).
2. Wszystkie komendy sterujące (UI → Core, Core → Gateway) SHOULD wspierać idempotencję (`commandId` / `Idempotency-Key`).
3. System MUST unikać iluzji „exactly-once”.

---

# 6. Widok kontenerów (C4 — Containers) i tryby deploy

## 6.1 Minimalne kontenery/procesy

- **fleet-core** (HTTP + SSE)
- **robot-gateway** (HTTP → RoboCore TCP)
- **roboshop-adapter** (opcjonalnie, ale zalecane jako osobny proces)
- **proxy-recorder** (narzędzie dev)
- **frontends** (dowolna liczba)

## 6.2 Dwa tryby uruchomienia

### Mode A — bundle/dev
- Dla dev i testów lokalnych.
- Fleet Core MAY uruchamiać internal simulator „in-process”.
- UI może być serwowane lokalnie.

### Mode B — distributed/prod
- Fleet Core i Robot Gateway MUST być osobnymi procesami.
- Roboshop Adapter SHOULD być osobnym procesem.
- Proxy/Recorder jest wyłącznie narzędziem dev.

**W obu trybach** kontrakty API MUST być identyczne (żeby nie było „działa w dev, nie działa w prod”).

---

# 7. Komponenty (C4 — Components) — opisy szczegółowe

## 7.1 Fleet Core (serwis)

### 7.1.1 Odpowiedzialności (MUST)
Fleet Core MUST:
1. Zarządzać aktywną sceną (Scene lifecycle): list, import, walidacja, aktywacja, wersjonowanie.
2. Utrzymywać runtime state: roboty, taski, worksites, rezerwacje, przeszkody runtime.
3. Wystawiać HTTP API dla UI i integracji.
4. Wystawiać SSE stream dla realtime.
5. Orkiestrować sterowanie robotami (RTP + komendy wysokopoziomowe).
6. Wspierać wybór algorytmu (kontrakt algorytmu jest minimalny tutaj; szczegóły w osobnym dokumencie).
7. Zapewnić odporność: idempotencja, optimistic concurrency, recovery po restarcie.
8. Zapisywać logi i snapshoty stanu na dysk (wymaganie obserwowalności).

Fleet Core MUST NOT:
- bezpośrednio implementować protokołów robotów (to jest w Robot Gateway),
- mieszać logiki domenowej z I/O.

### 7.1.2 Podkomponenty (proponowany podział)
- **API Layer**: REST + SSE, auth, validation, ETag, idempotency.
- **Scene Service**:
  - import/validate/activate,
  - map compiler/validator (może być osobny moduł).
- **Runtime Store**:
  - pamięć runtime + persistencja minimalna,
  - append-only event log.
- **Robot Manager**:
  - utrzymuje robot registry,
  - provider per robot,
  - hot-switch coordinator.
- **Task Manager**:
  - lifecycle tasków,
  - przypisania robotów,
  - cancel/retry.
- **Worksite Manager**:
  - occupancy/blocked,
  - atomic updates + audit.
- **Traffic/Reservations**:
  - rezerwacje odcinków i/lub węzłów,
  - deadlock detection,
  - zasady „kto ma pierwszeństwo”.
- **Planner/Dispatcher**:
  - global route,
  - generacja RTP.
- **Diagnostics & Replay**:
  - snapshot dumps,
  - replay harness.

### 7.1.3 Porty domenowe (interfaces)
Domena Fleet Core MUST korzystać z portów (interfejsów), a nie z konkretnych adapterów:

- `RobotProviderPort` (wysyłanie komend i odbiór statusu)
- `SceneRepositoryPort` (storage scen)
- `RuntimePersistencePort` (persistencja minimalna runtime)
- `EventLogPort` (append-only log + replay)
- `ClockPort` (czas realny lub wirtualny dla symulacji/testów)
- `AlgorithmProviderPort` (uruchomienie algorytmu/strategii)

---

## 7.2 Robot Gateway (serwis)

### 7.2.1 Odpowiedzialności (MUST)
Robot Gateway MUST:
1. Utrzymywać połączenia do robotów przez RoboCore/Robokit TCP.
2. Zapewniać retry, circuit breaker, timeouts i markowanie robotów online/offline.
3. Normalizować status robota do kanonicznego modelu (wspólnego dla sim i real).
4. Wystawiać HTTP API „robot driver” dla Fleet Core.
5. Implementować watchdog/deadman timer:
   - jeśli aktywne sterowanie (np. RTP) nie dostaje odświeżeń, Gateway MUST zatrzymać robota (STOP).
6. Zapisywać (konfigurowalnie) ramki/problemy do logów (dla debug).

Robot Gateway MUST NOT:
- planować zadań ani robić rezerwacji domenowych,
- ukrywać błędów protokołu — błędy muszą być jawne w statusie.

### 7.2.2 Podkomponenty (proponowany podział)
- **HTTP API**: endpointy sterowania i statusów, idempotency per robot.
- **Robokit Client Pool**: zarządzanie socketami i push channel, reconnect.
- **Command Ledger**: deduplikacja `commandId` + mapowanie na `seq` protokołu.
- **Safety Watchdog**: deadman timer + STOP.
- **Telemetry Normalizer**: mapowanie push/poll → RobotStatus.
- **Recorder hooks** (opcjonalnie): zapis ramek/metryk.

---

## 7.3 Internal Simulator (provider, niekoniecznie osobny serwis)

### 7.3.1 Odpowiedzialności (MUST)
Internal Simulator MUST:
1. Symulować wiele robotów jednocześnie (multi-robot).
2. Uwzględniać kolizje i blokowanie (co najmniej: wykryć i „zablokować” robota).
3. Używać tych samych modeli domenowych (RobotStatus, Task, WorksiteState) co reszta systemu.
4. Dostarczać deterministyczne zachowanie w trybie testowym (seed).
5. Wystawiać sterowanie przeszkodami runtime (add/remove/clear) oraz diagnostykę.
6. Umożliwiać mieszanie providerów w jednej scenie (część robotów sim, część real/robokit) — po stronie Core przez provider switching.

Internal Simulator SHOULD:
- generować diagnostyczne snapshoty (np. przy deadlock/collision), podobnie jak istniejący `diagnosticDump` w aktualnym prototypie.

---

## 7.4 Roboshop Adapter (serwis)

### 7.4.1 Odpowiedzialności (MUST)
Roboshop Adapter MUST:
1. Przyjmować sceny z Roboshop (uploadScene) w formacie ZIP lub w innej formie Roboshop.
2. Rozpakować, zwalidować i przekonwertować dane do wewnętrznego formatu Scene (immutable revision).
3. Zarejestrować scenę w Fleet Core przez HTTP (Scene API).
4. Raportować błędy walidacji z czytelnymi komunikatami.

Roboshop Adapter SHOULD:
- wspierać export sceny z Fleet Core do formatu Roboshop (jeśli potrzebne),
- mieć tryb „dry-run validate”.

---

## 7.5 Proxy/Recorder (narzędzie)

Proxy/Recorder MUST:
1. Wspierać proxy TCP dla RoboCore/Robokit (podsłuch ramek).
2. Wspierać proxy HTTP dla Roboshop ↔ robot lub Roboshop ↔ RDS (podsłuch REST).
3. Mieć prostą konfigurację:
   - na jakich portach słucha,
   - gdzie forwarduje,
   - gdzie zapisuje (katalog),
   - jakie filtry (np. tylko wybrane robotId).
4. Zapisywać metadane: timestamp, kierunek, adresy, rozmiary, korelacja.
5. Umożliwiać odtworzenie komunikacji w trybie replay (MAY jako osobny moduł).

---

## 7.6 Frontend (UI)

Frontend MUST:
1. Renderować mapę (graf), roboty, worksites, streamy i taski.
2. Obsługiwać interakcję operatora: wybór sceny, ręczne komendy robota, edycja worksites/streamów.
3. Działać jako klient: może być uruchomione 0..N instancji równolegle.
4. Być odporne na reconnect SSE oraz konflikt aktualizacji (ETag/If-Match).

Frontend MUST NOT:
- zawierać logiki domenowej planowania/ruchu,
- polegać na pojedynczym „singleton” backendzie w RAM (musi działać z wieloma klientami).

---

# 8. Model domeny (kanoniczny) — encje, stany, inwarianty

## 8.1 Encje (minimum)

- **SceneRevision**
- **MapGraph** (nodes/edges/geometry)
- **Robot**
- **RobotStatus** (telemetria + stany)
- **RobotProvider** (internal_sim / robokit_sim / robokit_real)
- **Worksite** + **WorksiteState**
- **StreamDefinition** (generator pracy)
- **Task**
- **Reservation** (czas/zasób)
- **Obstacle** (runtime)

## 8.2 Inwarianty (MUST)
1. W danym czasie może istnieć **dokładnie jedna** aktywna `SceneRevision` w Fleet Core.
2. `Task` w stanie `in_progress` MUST mieć przypisanego robota (`assignedRobotId`).
3. Robot MUST mieć co najwyżej jeden aktywny task (na start).
4. `RobotStatus.connection` = `offline` ⇒ Fleet Core MUST NOT wysyłać komend ruchu (poza STOP / recovery).
5. Aktualizacja zasobów edytowalnych (worksites/streams/runtime patches) MUST być chroniona przez optimistic concurrency (ETag/If‑Match) lub równoważny mechanizm.
6. Każdy event na SSE MUST mieć rosnący `cursor` (monotoniczny) i MUST być zapisywany w event log (co najmniej w buforze w pamięci; najlepiej także na dysk).

## 8.3 Maszyna stanów — Task (propozycja)
```text
queued -> assigned -> in_progress -> (completed | failed | canceled)
                     |
                     +-> blocked -> in_progress (po odblokowaniu) lub failed/canceled
```

## 8.4 Maszyna stanów — Robot (propozycja)
```text
offline <-> online
online: (idle | executing | paused | manual | switching_provider | blocked | error)
```

---

# 9. Dane: Scene, Runtime, History

## 9.1 SceneRevision — definicja

1. Scene MUST być przenośna i wersjonowana.
2. Scene MUST być immutable revision: `sceneId + revisionId`.
3. Runtime state MUST być osobno (nie w scenie), ale może być eksportowalny jako „overlay” dla debug.

### 9.1.1 Struktura na dysku (referencyjna)

```text
scenes/
  index.json
  <sceneId>/
    revisions/
      <revisionId>/
        manifest.json
        maps/
          original/...
          compiled/
            graph.json
            geometry.json (opcjonalnie)
            raster.png (opcjonalnie)
        workflow.json5
        robots.json5
        streams.json5
        packaging.json5 (opcjonalnie)
        extras/...
```

### 9.1.2 manifest.json (przykład, v0.2)

> Uwaga: w v0.2 używamy `sha256` zamiast `md5` (patrz „Rzeczy usunięte”).

```json5
{
  sceneId: "nowy-styl",
  revisionId: "2026-01-06T12-00-00Z__imported",
  name: "Nowy Styl - floor A",
  createdAt: "2026-01-06T12:00:00.000Z",
  formatVersion: "2.0", // wersja formatu sceny (migracje)
  maps: [
    {
      mapId: "map-1",
      kind: "roboshop.smap",
      path: "maps/original/map-1.smap",
      sha256: "…",
      sizeBytes: 1234567
    },
    {
      mapId: "map-1-graph",
      kind: "fm.graph",
      path: "maps/compiled/graph.json",
      sha256: "…",
      sizeBytes: 234567
    }
  ],
  activeMapId: "map-1-graph",
  artifacts: {
    workflow: "workflow.json5",
    robots: "robots.json5",
    streams: "streams.json5",
    packaging: "packaging.json5"
  },
  defaults: {
    algorithmProfile: "default",
    rollingTarget: {
      lookaheadM: 3.0,
      minUpdateMs: 200
    }
  },
  coord: {
    frameId: "map",           // nazwa ramy odniesienia
    units: "m",               // metry
    angleUnits: "rad",        // radiany
    origin: { x: 0, y: 0 }    // definicja, jeśli potrzebna
  },
  compat: {
    source: "roboshop-uploadScene",
    originalZipName: "upload_scene.zip",
    importedAt: "2026-01-06T12:00:01.000Z"
  }
}
```

## 9.2 Runtime state — co jest mutable

Runtime state obejmuje m.in.:
- `robotRuntime`: aktualna trasa, segment, blockedReason, provider, lastCommand.
- `worksiteState`: occupancy/blocked.
- `tasks`: aktywne + historia.
- `reservations`: locki i okna czasowe.
- `obstacles`: runtime przeszkody (symulacja/test).
- `algorithmRuntime`: stan algorytmu (jeśli potrzebny).

Runtime state MUST być:
- możliwy do snapshotowania i odtwarzania (replay),
- odporny na restart (co najmniej w zakresie: aktywna scena, lista tasków, stany worksites, przypisania robotów).

## 9.3 History/Audit (append-only)

System MUST prowadzić:
1. **Event log** (append-only) — zmiany stanu domeny + komendy + błędy integracji.
2. **Snapshoty stanu**:
   - okresowe (np. co N sekund/minut),
   - oraz „on incident” (kolizja, deadlock, stuck, błąd protokołu).
3. **Audit log** działań operatorów:
   - kto i kiedy zmienił worksite/stream/scene,
   - kto zlecił STOP/cancel itp.

### 9.3.1 Minimalny format zdarzenia w logu (JSON Lines)

```json5
// jeden wpis = jedna linia (JSONL)
{ ts: 1736160000000, cursor: 12345, type: "robot.updated", sceneId: "nowy-styl", revisionId: "…", data: { /* ... */ }, traceId: "…" }
```

---

# 10. API publiczne (UI ↔ Fleet Core) — HTTP

## 10.1 Zasady wspólne

### 10.1.1 Wersjonowanie
- Kanoniczne API MUST być pod `/api/v1/...`.
- Fleet Core MAY wystawiać ścieżki kompatybilne z obecnym UI (`/api/fleet/*`, `/api/scenes/*`) — opisane w aneksie.

### 10.1.2 Idempotencja
- Klient SHOULD wysyłać `Idempotency-Key` (UUID) dla mutacji i komend.
- Fleet Core SHOULD deduplikować klucze przez TTL (np. 24h) per `clientId`.
- Odpowiedź może zawierać `alreadyApplied: true`.

### 10.1.3 Optimistic concurrency (multi‑frontend)
- Zasoby edytowalne (worksites/streams/runtime patches) MUST zwracać `ETag`.
- Mutacje MUST wymagać `If-Match: <etag>`.
- Brak `If-Match` → `428 Precondition Required`.
- Konflikt → `412 Precondition Failed` + aktualny ETag w odpowiedzi.

### 10.1.4 Error model (wspólny)
Fleet Core MUST zwracać błędy w formacie:

```json5
{
  error: "invalid_payload",     // code
  message: "Human readable message",
  details: { /* structured */ },
  traceId: "…"                 // korelacja logów
}
```

### 10.1.5 AuthN/AuthZ (minimalnie)
- API MUST mieć mechanizm uwierzytelnienia (na start: token/bearer).
- System MUST rozróżniać role:
  - `viewer` (read-only),
  - `operator` (komendy + edycja runtime),
  - `admin` (scene activate/import, provider switch).
- Wszystkie komendy ruchu robota MUST być ograniczone co najmniej do `operator/admin`.

---

## 10.2 Realtime (SSE) — wymagania semantyczne

Kanoniczny endpoint:
- `GET /api/v1/fleet/stream`

Wymagania:
1. SSE MUST emitować eventy w kolejności rosnącego `cursor`.
2. SSE MUST wspierać reconnect:
   - klient może wysłać `Last-Event-ID: <cursor>`,
   - serwer SHOULD spróbować odtworzyć eventy z bufora/logu.
3. Jeśli `Last-Event-ID` jest zbyt stary (wypadł z bufora), serwer MUST wysłać snapshot (pełny stan) i kontynuować od nowego cursora.
4. Eventy mogą się powtarzać (at-least-once). Klient MUST deduplikować po `cursor`.
5. Serwer MUST mieć backpressure policy:
   - jeśli klient nie nadąża, serwer MAY rozłączyć (klient zrobi reconnect),
   - serwer MUST ograniczać rozmiar pojedynczego eventu i tempo.

### 10.2.1 Minimalny typ zdarzenia (kanoniczny envelope)

```json5
{
  cursor: 12345,
  ts: 1736160000000,
  type: "robot.updated",
  sceneId: "nowy-styl",
  revisionId: "…",
  actor: { kind: "user", id: "alice" }, // opcjonalnie
  data: { /* payload */ }
}
```

### 10.2.2 Snapshot vs delta
- Serwer MUST wysłać snapshot:
  - na connect (pierwszy event),
  - po scene activation,
  - po overflow backlogu.
- Delta eventy SHOULD być małe (robot updated, task updated).

### 10.2.3 Zgodność z obecnym UI
Obecny UI słucha eventu `state` i oczekuje `{ ok: true, robots:…, tasks:…, worksites:… }`.  
Fleet Core SHOULD udostępnić tryb kompatybilny (aneks).

---

## 10.3 Endpointy (kanoniczne, `/api/v1`)

> Poniżej podaję **czytelne przykłady** w JSON5. Na wire to jest JSON.

### 10.3.1 Health i status
- `GET /api/v1/health` → 200 OK
- `GET /api/v1/status` → meta (aktywna scena, uptime, wersja)

**Przykład:**
```json5
{
  ok: true,
  version: "2.0.0",
  activeScene: { sceneId: "nowy-styl", revisionId: "…" },
  uptimeMs: 1234567
}
```

### 10.3.2 Scenes
- `GET /api/v1/scenes`
- `GET /api/v1/scenes/active`
- `POST /api/v1/scenes/import/roboshop` (multipart: zip)
- `POST /api/v1/scenes/activate`

**POST /api/v1/scenes/activate** (request):
```json5
{
  sceneId: "nowy-styl",
  revisionId: "2026-01-06T12-00-00Z__imported" // opcjonalnie: domyślnie latest
}
```

**Response:**
```json5
{ ok: true, activeScene: { sceneId: "nowy-styl", revisionId: "…" } }
```

### 10.3.3 Scene artifacts
- `GET /api/v1/scenes/active/graph`
- `GET /api/v1/scenes/active/workflow`
- `GET /api/v1/scenes/active/robots-config`
- `GET /api/v1/scenes/active/streams-config`

### 10.3.4 Fleet snapshot
- `GET /api/v1/fleet/state`

**Response (przykład minimalny):**
```json5
{
  ok: true,
  cursor: 12345,
  scene: { sceneId: "nowy-styl", revisionId: "…" },
  robots: [
    {
      robotId: "RB-01",
      provider: "internal_sim",
      connection: "online",
      mode: "executing",         // idle/executing/paused/manual/blocked/...
      pose: { x: 1.2, y: -3.4, angle: 0.12 },
      speed: { v: 0.4, w: 0.0 },
      taskId: "TASK-001",
      blocked: false,
      blockedReason: null,
      battery: { level: 0.72 }
    }
  ],
  tasks: [
    { taskId: "TASK-001", state: "in_progress", robotId: "RB-01", kind: "move", from: "AP10", to: "AP20" }
  ],
  worksites: [
    { id: "A-01", groupId: "A", occupancy: "filled", blocked: false }
  ],
  obstacles: [],
  diagnostics: {
    tickMs: 140,
    eventBufferSize: 5000
  }
}
```

### 10.3.5 Worksites
- `GET /api/v1/worksites`
- `PATCH /api/v1/worksites/{id}` (wymaga If-Match)

**PATCH request (JSON5):**
```json5
{
  occupancy: "empty", // "empty" | "filled" | "unknown"
  blocked: false
}
```

### 10.3.6 Tasks
- `GET /api/v1/tasks`
- `POST /api/v1/tasks`
- `POST /api/v1/tasks/{taskId}/cancel`

**POST /api/v1/tasks (request):**
```json5
{
  kind: "transport",
  // minimalnie: pickup/drop; szczegóły zależą od algorytmu/workflow
  pickup: { worksiteId: "A-01" },
  drop: { worksiteId: "B-07" },
  priority: 10
}
```

### 10.3.7 Robots — komendy operatora
- `GET /api/v1/robots`
- `GET /api/v1/robots/{robotId}`
- `POST /api/v1/robots/{robotId}/commands/go-target`
- `POST /api/v1/robots/{robotId}/commands/go-point`
- `POST /api/v1/robots/{robotId}/commands/pause`
- `POST /api/v1/robots/{robotId}/commands/resume`
- `POST /api/v1/robots/{robotId}/commands/cancel`
- `POST /api/v1/robots/{robotId}/commands/stop`
- `POST /api/v1/robots/{robotId}/commands/reloc`
- `POST /api/v1/robots/{robotId}/commands/manual` (wejście/wyjście manual)
- `POST /api/v1/robots/{robotId}/provider/switch` (admin)

**Go-target request:**
```json5
{ targetId: "AP20" }
```

**Go-point request (metry + radiany):**
```json5
{ x: 12.34, y: -2.0, angle: 1.57 }
```

**Provider switch request:**
```json5
{
  targetProvider: "robokit_real",         // "internal_sim" | "robokit_sim" | "robokit_real"
  // opcjonalnie: parametry synchronizacji
  sync: {
    requirePaused: true,
    poseToleranceM: 0.2,
    angleToleranceRad: 0.2,
    mapHash: "sha256:…"
  }
}
```

### 10.3.8 Obstacles (runtime)
- `GET /api/v1/obstacles`
- `POST /api/v1/obstacles`
- `POST /api/v1/obstacles/clear`
- `POST /api/v1/obstacles/remove`

### 10.3.9 Algorithms catalog + settings
- `GET /api/v1/algorithms/catalog`
- `GET /api/v1/algorithms/settings`
- `POST /api/v1/algorithms/settings`

---

# 11. API wewnętrzne (Fleet Core ↔ Robot Gateway) — HTTP

## 11.1 Zasady

1. Fleet Core MUST traktować Robot Gateway jako „robot driver” i NIE zakładać, że komenda == efekt.
2. Gateway MUST rozróżniać trzy poziomy „ACK”:
   - **accepted_by_gateway**: Gateway przyjęło żądanie HTTP i zapisało do ledger.
   - **accepted_by_robot**: RoboCore/Robokit odesłał odpowiedź na komendę.
   - **effect_observed**: efekt widoczny w telemetrii (status/pose/task).
3. Fleet Core MUST opierać logikę o **effect_observed** (telemetria), a nie o same HTTP response.

## 11.2 Kanoniczne endpointy Gateway (propozycja)

- `GET /api/v1/robots`
- `GET /api/v1/robots/{robotId}/status`
- `POST /api/v1/robots/{robotId}/commands/go-target`
- `POST /api/v1/robots/{robotId}/commands/go-point`
- `POST /api/v1/robots/{robotId}/commands/pause`
- `POST /api/v1/robots/{robotId}/commands/resume`
- `POST /api/v1/robots/{robotId}/commands/cancel`
- `POST /api/v1/robots/{robotId}/commands/stop`
- `POST /api/v1/robots/{robotId}/commands/reloc`
- `POST /api/v1/robots/{robotId}/commands/motion` (manual driving)
- `POST /api/v1/robots/{robotId}/control/rtp` (opcjonalnie: deadman + rate limit w Gateway)

### 11.2.1 Odpowiedź na komendę — format

```json5
{
  ok: true,
  commandId: "…",
  gatewayAck: {
    status: "accepted_by_gateway",       // accepted_by_gateway | rejected | already_applied
    receivedAt: 1736160000000
  },
  robotAck: {
    status: "accepted_by_robot",         // accepted_by_robot | no_response | rejected_by_robot
    apiNo: 3050,
    seq: 42,
    receivedAt: 1736160000123,
    payload: { /* odpowiedź robota jeśli jest */ }
  },
  traceId: "…"
}
```

---

# 12. RoboCore/Robokit — protokół TCP (ramki + komendy)

> Ten rozdział opisuje **konkretny format ramek** i komend bazując na istniejącym adapterze `adapters-robokit` w załączonym prototypie.

## 12.1 Porty (domyślne)

```text
ROBOD:  19200
STATE:  19204   (status/telemetria — request/response)
CTRL:   19205   (control: stop, reloc, motion — request/response)
TASK:   19206   (task commands: goTarget, goPoint, pause/resume/cancel — request/response)
CONFIG: 19207
KERNEL: 19208
OTHER:  19210
PUSH:   19301   (push channel — streaming)
```

Robot Gateway MUST umożliwiać konfigurację portów per robot (w config), ale MUST mieć powyższe jako domyślne.

## 12.2 Format ramki (RoboCore/Robokit)

Ramka ma stały nagłówek 16 bajtów + payload.

### 12.2.1 Nagłówek (16 bajtów)

| Offset | Rozmiar | Pole | Opis |
|---:|---:|---|---|
| 0 | 1 | `startMark` | MUST = `0x5A` |
| 1 | 1 | `version` | MUST = `0x01` |
| 2 | 2 | `seq` | uint16 BE — numer sekwencyjny |
| 4 | 4 | `bodyLength` | uint32 BE — długość payload (bajty) |
| 8 | 2 | `apiNo` | uint16 BE — numer API/komendy |
| 10 | 6 | `reserved` | 6 bajtów; w praktyce pierwsze 4 bajty używane jako `jsonSize` |

### 12.2.2 Payload
- Payload jest zwykle JSON (UTF-8).
- Jeśli istnieje część binarna, to:
  - `jsonSize` (pierwsze 4 bajty `reserved`) zawiera długość JSON,
  - następnie idzie JSON, a po nim binaria.

Robot Gateway MUST:
- parsować oba warianty (JSON-only i JSON+binary),
- ograniczać maksymalny rozmiar `bodyLength` (konfigurowalny limit; np. 1–10 MB).

### 12.2.3 Odpowiedź (responseApi)
W prototypie odpowiedź na komendę `apiNo` ma `apiNo + 10000`.

Przykład:
- request: `robot_task_gopoint_req = 3050`
- response: `13050`

Gateway MUST mapować request/response w ten sposób (chyba że konkretna komenda ma inną regułę).

## 12.3 Minimalny zestaw komend wymaganych przez Fleet Manager

### 12.3.1 Status: pozycja (robot_status_loc_req = 1004)
- Port: STATE
- Request payload: zazwyczaj brak lub `{}`.
- Response payload zawiera m.in. `x`, `y`, `angle`, `current_station`, `last_station` itd.

**Przykład response (JSON5):**
```json5
{
  x: 1.23,
  y: -4.56,
  angle: 0.12,             // rad
  current_station: "AP10",
  last_station: "AP09"
}
```

### 12.3.2 Go to target (robot_task_gotarget_req = 3051) — „jedź do punktu”
- Port: TASK
- Request payload (minimalnie):
```json5
{ id: "AP20" } // lub target_id / target (adapter powinien normalizować)
```

- Response (przykład z robokit-sim):
```json5
{
  task_id: "T-123",
  target_id: "AP20",
  path_nodes: ["AP10", "AP11", "AP20"]
}
```

### 12.3.3 Go to point (robot_task_gopoint_req = 3050) — „jedź do współrzędnych”
- Port: TASK
- Request payload:
```json5
{
  x: 12.34,
  y: -2.0,
  angle: 1.57 // rad; opcjonalnie (może być 0)
}
```

### 12.3.4 Pause/Resume/Cancel task
- `robot_task_pause_req = 3001`
- `robot_task_resume_req = 3002`
- `robot_task_cancel_req = 3003`
- Port: TASK
- Payload: `{}` lub `{ task_id: ... }` (w zależności od robota; Gateway normalizuje).

### 12.3.5 STOP (robot_control_stop_req = 2000)
- Port: CTRL
- Payload: `{}`

### 12.3.6 Reloc (robot_control_reloc_req = 2002)
- Port: CTRL
- Payload (w robokit-sim wspierane warianty):
```json5
// wariant A: relocate do stacji
{ station_id: "AP10", is_auto: true }

// wariant B: relocate do pozycji
{ x: 1.2, y: 3.4, angle: 0.0, is_auto: true }
```

### 12.3.7 Manual motion (robot_control_motion_req = 2010)
- Port: CTRL
- Payload (przykład):
```json5
{
  vx: 0.4,     // m/s
  vy: 0.0,     // m/s (często 0 dla wózka)
  w: 0.0,      // rad/s
  steer: 0.0,  // rad (opcjonalnie)
  real_steer: 0.0
}
```

## 12.4 Push channel (PUSH: 19301)

Gateway SHOULD używać push channel, bo:
- zmniejsza polling,
- daje „żywe” statusy.

### 12.4.1 Konfiguracja push (robot_push_config_req = 9300)
- Payload:
```json5
{
  interval: 1000,                 // ms
  included_fields: ["loc", "task"] // opcjonalnie
}
```

Gateway MUST obsłużyć reconnect push channel i emitować „robot online/offline” dla Fleet Core.

---

# 13. Rolling Target Point (RTP) — spec sterowania

## 13.1 Definicja (MUST)
1. Fleet Core MUST sterować robotem realnym przez Rolling Target Point:
   - robot dostaje punkt celu leżący na globalnej trasie,
   - punkt jest oddalony od pozycji robota o co najmniej `lookaheadM`.
2. `lookaheadM` MUST być konfigurowalne per robot i per scena.
3. Aktualizacje RTP MUST mieć minimalny interwał `minUpdateMs` (rate limit).

## 13.2 Kontrakt RTP (Core → Gateway)
Jeśli używamy endpointu `control/rtp`, payload może wyglądać:

```json5
{
  commandId: "uuid",
  rtpSeq: 123,                      // rosnące w ramach robota
  target: { x: 12.3, y: 4.5, angle: 0.1 },
  lookaheadM: 3.0,
  validForMs: 800,                  // TTL; po tym robot/gateway powinien się zatrzymać
  pathRef: {
    sceneId: "…",
    revisionId: "…",
    pathId: "PATH-001",
    segmentIndex: 7
  }
}
```

## 13.3 Minimalny algorytm wyznaczania RTP (na start)
- Fleet Core wyznacza globalną trasę jako polilinię po grafie.
- W każdym ticku planowania:
  1. bierze bieżącą pozycję robota,
  2. projektuje ją na polilinię,
  3. wybiera punkt w odległości `lookaheadM` wzdłuż trasy,
  4. wysyła go do robota (goPoint/rtp).

## 13.4 Stuck / blocked detection (kontrakt)
System MUST wykrywać, że robot „stoi” / jest zablokowany. Minimalnie:
- jeśli przez `stuckTimeoutMs` robot nie zmienił pozycji > `stuckEpsM` mimo komend ruchu,
  - `RobotStatus.blocked = true`,
  - `blockedReason = "stuck" | "obstacle" | "traffic" | "unknown"`,
  - Fleet Core może wstrzymać task i zgłosić operatorowi.

System MUST też sygnalizować, że robot „chce wejść w tryb obstacle avoidance” (na przyszłość), nawet jeśli v0.x jeszcze tego nie implementuje:
- pole `wantsLocalAvoidance: true/false`,
- oraz informacja gdzie (na jakich edge width>0) to byłoby dozwolone.

---

# 14. Symulacja i mieszanie providerów

## 14.1 Tryby robotów (provider per robot)
Każdy robot w runtime ma `provider`:
- `internal_sim`
- `robokit_sim` (robot emulowany przez robokit-sim, ale przez ten sam protokół)
- `robokit_real` (prawdziwy robot)

Fleet Core MUST pozwalać na mieszanie providerów w jednej scenie.

## 14.2 Internal multi-robot sim (wymagania)
- Symulator MUST mieć tick (np. 140 ms) konfigurowalny.
- MUST wykrywać kolizje i blokować ruch (collisionBlocking).
- MUST mieć przeszkody runtime (block/unblock).
- MUST mieć diagnostykę i snapshot dumps.

## 14.3 Przełączanie providerów w trakcie działania (hot-switch)

### 14.3.1 Stany przełączania (MUST)
Robot przełączany przechodzi przez stany:
```text
idle/executing -> pausing -> paused -> syncing -> switching -> resuming -> idle/executing
                                           \-> failed (manual intervention)
```

### 14.3.2 Procedura: internal_sim → robokit_sim/robokit_real (MUST)
1. Fleet Core MUST zainicjować `pause` robota.
2. MUST poczekać, aż telemetria pokaże `paused`.
3. MUST wykonać walidację mapy:
   - porównać hash aktywnej sceny/mapy (np. sha256 graph) z tym, co ma robot (jeśli dostępne),
   - jeśli brak możliwości: MUST wymagać ręcznego potwierdzenia operatora (policy).
4. MUST zsynchronizować pozycję:
   - albo robot relokuje się do wskazanej stacji/pozycji,
   - albo symulator ustawia swój stan do reala (zależnie od kierunku switch).
5. Dopiero potem Fleet Core MUST zmienić `provider` na docelowy.
6. Fleet Core MUST przeplanować trasę (bo różnice mogą istnieć).
7. Fleet Core MAY wznowić task (resume) lub wymagać potwierdzenia (policy).

### 14.3.3 Procedura: robokit_* → internal_sim (MUST)
1. Fleet Core MUST wstrzymać robota (pause/stop zależnie od policy).
2. MUST pobrać ostatnią znaną pozycję i stan.
3. MUST ustawić internal sim robota w tej pozycji.
4. MUST przełączyć provider.
5. MUST wznowić planowanie.

### 14.3.4 Timeouty i rollback (MUST)
- Każda faza switch MUST mieć timeout.
- W przypadku timeout:
  - system MUST przejść do `failed`,
  - robot MUST pozostać w stanie bezpiecznym (preferowane: STOP/PAUSE),
  - operator musi dostać jasny komunikat + snapshot diagnostyczny.

---

# 15. Dynamiczne zmiany mapy i konfiguracji

## 15.1 Dwa typy zmian (MUST)

1. **Runtime patches** (nie zmieniają topologii grafu):
   - obstacles block/unblock,
   - occupancy worksites,
   - tymczasowe zamknięcia krawędzi,
   - zmiany priorytetów/streamów (jeśli nie wymagają zmian mapy).

2. **Scene revision activation** (zmienia topologię lub statyczną konfigurację):
   - zmiana grafu, geometrii, szerokości, kierunkowości,
   - zmiana definicji worksites/streamów/robot config w sposób breaking,
   - zmiana mapy.

Zmiany typu 2 MUST odbywać się przez:
- import nowej rewizji sceny,
- aktywację rewizji (transakcja aktywacji).

## 15.2 Transakcja aktywacji sceny (MUST)
Proces aktywacji sceny MUST:
1. walidować pliki i spójność grafu,
2. przejść do stanu `PAUSED_GLOBAL` (lub kontrolowanego),
3. oznaczyć roboty jako `requires_resync` jeśli potrzeba,
4. wyczyścić/zmigrować runtime state wg polityki (np. taski anuluj / przenieś),
5. wyemitować `scene.activated` + snapshot na SSE,
6. wznowić system.

---

# 16. Odporność na błędy, recovery, safety boundaries

## 16.1 Retry/circuit breaker (MUST/SHOULD)
- Gateway MUST mieć circuit breaker per robot.
- Core SHOULD mieć minimalny retry do Gateway (bo Core opiera się o telemetrię).
- UI MAY retry po stronie klienta, ale musi używać idempotency key.

## 16.2 Watchdog / deadman (MUST)
- Gateway MUST zatrzymać robota, jeśli:
  - utracono połączenie,
  - albo RTP nie jest odświeżany przez `validForMs` / policy.
- Jeśli robot ma własny watchdog firmware, Gateway MUST go nie wyłączać (safety boundary).

## 16.3 Restart Fleet Core (MUST)
Po restarcie Fleet Core MUST:
1. Wczytać aktywną scenę.
2. Odtworzyć runtime state (z persystencji) lub wejść w tryb „requires_resync”.
3. NIE wysyłać komend ruchu „w ciemno” — musi najpierw otrzymać świeżą telemetrię z Gateway.
4. Wyemitować event `core.restarted` + snapshot.

## 16.4 „Ghost commands” prevention (MUST)
System MUST zapobiec sytuacji, gdzie po restarcie/retry wysyłane są stare komendy:
- Command ledger w Gateway deduplikuje `commandId`.
- Core deduplikuje komendy UI.
- Komendy RTP MUST mieć `rtpSeq` i wygasanie (`validForMs`).

## 16.5 Multi-frontend konflikty (MUST)
- Edycje zasobów wymagają ETag/If-Match.
- Komendy ruchu:
  - policy MUST określać „kto ma kontrolę” (np. last-write-wins, ale z audytem),
  - UI MUST widzieć, kto ostatnio przejął manual.

---

# 17. Observability: logi, metryki, snapshoty, replay

## 17.1 Minimalny standard (MUST)
- Logi strukturalne (JSON) z `traceId`.
- Metryki:
  - robot online/offline,
  - RTT do Gateway,
  - event stream lag,
  - tick duration,
  - liczba klientów SSE,
  - liczba retry/circuit open.
- Healthchecks: `/health`.

## 17.2 Snapshoty diagnostyczne na dysk (MUST)
System MUST mieć możliwość zapisu snapshotów na dysk:
- automatycznie „on incident” (kolizja, deadlock, stuck, błąd protokołu),
- opcjonalnie okresowo.

Snapshot SHOULD zawierać (konfigurowalnie):
- active scene + hash,
- runtime state,
- reservations,
- obstacles,
- event log tail,
- last commands per robot,
- stack trace (jeśli crash).

---

# 18. Testy i weryfikacja (piramida + równoległość)

## 18.1 Piramida testów (MUST)
1. **Unit tests** (najwięcej):
   - domena: planner, reservations, task state machine, scene validation.
2. **Contract tests**:
   - Core API (OpenAPI + przykłady),
   - Gateway API,
   - Roboshop adapter import/export.
3. **Integration tests**:
   - Core + internal sim,
   - Core + gateway + robokit-sim.
4. **E2E** (najmniej, ale są):
   - UI minimal: czy renderuje i wysyła komendy.

## 18.2 Równoległość testów (SHOULD)
Testy SHOULD dać się uruchomić równolegle:
- brak globalnego stanu,
- porty losowe/ephemeral,
- hermetyczne fixture’y (sceny testowe),
- deterministyczny seed w symulacji.

## 18.3 Golden scenes + replay (MUST)
Repo MUST zawierać:
- `fixtures/scenes/*` (zestaw scen testowych),
- `fixtures/replays/*` (logi zdarzeń z reala i sim),
- harness do odtwarzania i porównania wyników.

---

# 19. Scenariusze (flow) — minimalny zestaw

## 19.1 Scena: import → aktywacja

```text
Roboshop -> Roboshop Adapter: uploadScene(zip)
Roboshop Adapter -> Fleet Core: POST /scenes/import/roboshop
Fleet Core: validate + compile graph + store revision
Operator(UI) -> Fleet Core: POST /scenes/activate
Fleet Core -> SSE: scene.activated + snapshot
```

## 19.2 UI reconnect SSE

```text
UI: connect SSE (Last-Event-ID = 123)
Fleet Core: replay events 124..N or send snapshot if too old
UI: dedupe by cursor
```

## 19.3 Dispatch task + RTP

```text
Operator/UI -> Fleet Core: POST /tasks
Fleet Core: assign robot + plan + reservations
Fleet Core -> Gateway: rtp/goPoint updates (every minUpdateMs)
Gateway -> Robot: robot_task_gopoint_req frames
Robot -> Gateway: ack + push telemetry
Fleet Core: observes progress, updates status, emits SSE robot.updated
```

## 19.4 Hot switch provider (internal_sim → real)

```text
Operator/UI -> Fleet Core: POST /robots/RB-01/provider/switch
Fleet Core: pause -> sync -> validate map -> switch -> replan -> resume
Fleet Core -> SSE: robot.providerChanged + snapshot(optional)
```

## 19.5 Lost comms do robota

```text
Gateway: circuit opens / offline
Gateway -> Robot: STOP (jeśli możliwe) / watchdog triggers
Gateway -> Fleet Core: robot offline status
Fleet Core: marks tasks blocked, emits alert + snapshot dump
```

---

# 20. Ryzyka i pułapki + mitigacje

1. **Drift sim ≠ real**  
   Mitigacja: golden replays, kontrakty statusów, testy z robokit-sim.

2. **Hot-switch to trudny stan przejściowy**  
   Mitigacja: twarda maszyna stanów switch + timeouty + rollback + snapshot.

3. **Dynamiczna zmiana mapy w trakcie ruchu**  
   Mitigacja: rozdzielenie runtime patches vs scene revision activation.

4. **Multi-frontend konflikty**  
   Mitigacja: ETag/If-Match + audit + UI pokazuje konflikt.

5. **Zbyt dużo mikroserwisów na start**  
   Mitigacja: Mode A bundle, minimalne procesy w MVP.

6. **Brak formalnych kontraktów = chaos dla AI**  
   Mitigacja: examples (JSON5) + OpenAPI generowane + contract tests.

7. **Safety**  
   Mitigacja: watchdog, STOP, role-based access, logowanie zdarzeń safety.

---

# 21. Plan etapów (żeby dowieźć)

- **Etap A:** kontrakty API + skeleton usług + SSE.
- **Etap B:** Scene lifecycle (import/validate/activate) + map compiler.
- **Etap C:** Robot Gateway (HTTP + RoboCore TCP) + robokit-sim integration.
- **Etap D:** Internal multi-robot sim + obstacles + diag dumps.
- **Etap E:** Rolling Target Point (RTP) end-to-end.
- **Etap F:** Traffic/reservations + deadlock detection.
- **Etap G:** Proxy/Recorder + replay harness.

Każdy etap MUST mieć acceptance criteria (testy automatyczne).

---

# 22. Aneksy

## 22.1 Aneks A — Zgodność z obecnym UI (compat API)

Obecny UI (traffic-lab) używa ścieżek:
- `GET /api/fleet/state`
- `GET /api/fleet/stream` (SSE event: `state`)
- `GET /api/worksites`
- `POST /api/robots/{robotId}/go-target` itd. (w praktyce: `/api/fleet/robots/{id}/{action}`)

Fleet Core MAY dostarczyć:
- aliasy tych ścieżek,
- albo osobny „BFF adapter” mapujący na `/api/v1`.

Minimalny payload `state` dla UI:
```json5
{
  ok: true,
  robots: [ /* ... */ ],
  tasks: [ /* ... */ ],
  worksites: [ /* ... */ ]
}
```


## 22.2 Aneks B — Dodatkowe komponenty, które warto dodać (z v0.1, utrzymane)

- Scenario Runner + Replay Harness
- Map Compiler / Validator (jako osobny moduł)
- Event sourcing (opcjonalnie, jeśli zajdzie potrzeba skalowania)
- Policy/Rules engine dla operacji magazynowych (opcjonalnie)

---

## 22.3 Definicja sukcesu

System jest w stanie w sposób stabilny i obserwowalny:
- wczytać scenę,
- uruchomić wielorobotową symulację,
- w locie przełączyć wybranego robota na robokit-sim lub robota realnego,
- sterować robotem przez RTP,
- przetrwać przerwy sieciowe i restart usług bez „ghost commands”,
- a UI (jedno lub wiele) pokazuje spójny obraz świata i pozwala operatorowi działać.

# 23. Rzeczy usunięte

1. **gRPC między Fleet Core ↔ Robot Gateway**  
   - v0.1 dopuszczało gRPC/HTTP.  
   - v0.2: między usługami MUST być HTTP (zgodnie z wymaganiem).

2. **MD5 w manifest.json**  
   - v0.1 przykłady używały `md5`.  
   - v0.2: używamy `sha256` (integrity + mniej pytań audytowych).

3. **Negotiation „capabilities” jako wymaganie w MVP**  
   - v0.1/recenzje sugerowały negocjacje capabilities.  
   - v0.2: na tym etapie nie negocjujemy; provider MUST wspierać pełny zestaw komend, a jeśli nie — komenda ma jawnie failować.
