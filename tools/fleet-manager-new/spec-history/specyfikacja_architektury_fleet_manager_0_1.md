# Fleet Manager 2.0 — Specyfikacja architektury (v0.1) — materiał do recenzji

## Część 1 — Prompt użytkownika

```text
zallaczam projekt fleet managera, zapoznaj sie z nim i z dokumentacja. fleet manager to program do zarzadania autonomicznymi wozkami widlowymi. ten program nie dziala zbyt dobrze i chcialbym go przepisac. ale podoba mi sie ui. chodzi mi o to, zeby przygotowac konspekt dokumentu specyfikacji calego projektu. projekt powienien byc bardzo modulowy tak, zeby mozna byo pracowac nad czesciami niezaleznie, porozumiewajac sie przez api. dzieki temu bedzie mogla nad tym efektywnie pracowac sztuczna inteligencja. proponuje takie moduly: interfejs uzytkownika, czyli frontend, ktory zajmuje sie wyswietlaniem mapy razem z wozkami i interakcja z uzytkownikiem. oraz da uzytkownikowi wglada jakie sa wozki, jaki jest stan pol odkladczych / odbiorczych. jakie sa zdefiniowane strumienie. jakie zadania wykonuja wozki. we frontendzie powinien byc kod potrzebny do obslugi interakcji z uzytkownikiem. jednak system powinien dzilac w zupelnisci bez wlaczonego frontendu. co wiecej powinno byc mozliwe kilka forntendow jednoczesnie. patrzacych na ten sam projekt. no tego powinien byc silnik nawigacyjny. ten silnik powinien wczytywac konfiguracje, zarzadac wozkami autonomicznymi. w tym silniku powinna byc mozliwosc wyboru algorytmu zarzadaania tymi wozkami. algorytm bedzie opracowanay w oddziwlnej specyfikacji. dodatkowo powinna byc mozliwosc dynamiczej zmiany mapy i konfiguracji. taka mapa z konfiguracja nazywamy scena. frontend powinine byc interfejsem do tego silnika. innym interfejscem powinien byc interfejs do roboshopa. czyli aplikacji zewnetrznej, ktora moze podgrywac mape. ale byc moze, zeby archtektura byla czytelniejsza to silnik powinien byec tylko api restowe. a ten interfejs do roboshopa powininen byc oddzialna aplikacja. do tego silnik powinien komunikowac sie z wozkami autonomicznymi. do tego tez jest interfejs robocore. jednak byc moze zarzadzaniem wozkami rowniez powinien zajmowac sie oddzielny program. i silnik z samym zarzadca wozkow, czyli same komendy tez powinny byc po rest api. a moze to nie jest dobry pomysl i lepiej zeby sillnik od razu korzystal z api roboshop? tak czy siek w silniku powinna byc mozliwosc symulacji robotow. i to by byla symulacja wewnetrzna. symulator powinein uwzgledniac wiele wozkow i mozliwe kolizja pomiedzy nimi. dodatkowo powinine byc symulator, korzystajacy z tych samych algorytmow symulacji robota, w sensie korzystajacy z api robokit. tak, zeby mozna byl przetestowac rozwiazania bez prawdziwego robota. no i na koniec powinna byc moliwosc przellaczenia na prawdziwego robota. to wszystko powinno mie elegancki design. latwy, prosty czytelny. latwy do zrozumienia i do pracy z AI. interfejsy powinny byc bardzo ladnie zrokumenowane. dodatkowo, warto zaznaczyc, ze robot powinien byc sterowany takim rolling target pointem. chodzi o to, zeby robot fizyczny dostawal cel ajko punkt odlegly przynajmniej o x metrow wzdluz trasy, ktora ma planner. robot ma swoja mape i planuje sobie lokalna trase. docelowo, wozek robot bedzie mogl zajmowac sie lokalnym omijaniem przezkod, to bedzie mozliwe, gdy bedzie mogl lokalnie planowac trase. jednak to dopiero w kolejnym kroku. oczywiscie omijanie przeszkod bedzie mozliwe tylko w niektorych miejscach mapy / grafu, tam gdzie szerokosc width jest ustawiona > 0. wiec na poczatek mozemy to pominac i zrobic algorytm, ktory zaklada ze nie ma omijania przeszkod. jedyne co musimy zapewnic to to, ze wiemy, ze wozek sie zablokowal oraz ze bedzie chcial wejsc w tryb omijania przezkod. ale wracajac do architektury, mamy jeszcze dodatkowa rzecz. to bedzie proxy pomiedzy programem roboshop do zarzadzania a fizycznym roboetem, zeby mozna bylo podsluchac protokoly. no i proxy pomiedzy roboshopem a rds'em czyli innym gotowym fleet managerem, gdzie przez roboshop mozna podgrywac mapy i robic konfiguracje. no ale to proxy to troche takie niezaezne oprogramowanie, ktore tylko powinno miec ustawienia co one podsluchuje, na ktorych portach i jakie sa adresy, oraz gdzie zapisuje, tak, zeby mozna bylo wygodnie podsluchiwac kompunikacj ep poiedzy roboshopem a roznymi robotami - w celu developmentu. no i tak, w tym domumencie bardzij chodzi mi o to, zeby opracowac overview calej architektury rozwiazania. ajkaie wszystkei proprojekty, jak powinein byc konfigurowany kazdy projekt. jakie dane. jak mozn a dynamicznie konfigurowac. jak zrobic zeby symulatoer wewnetrzny mial kilka robotow. ale rowniezm zeby w trakcie symulacji mozna bylo przelaczac jednego z robotow w projekcie na symulowanego przez protokol robocore, lub na prawdziwego robota. wszelkie interfejsy, wszystko co bedzie potrzebne do przyszlej implementacji. wszystko eleganckie, proste, odporne na bledy i na przerywy w komunikacji sieciowej. bedenralnie bardzo profesjonalne i bardzo wysokiej jakosci. przygotuj pierwsza wersje takiej specyfikacji, najbardziej obszerna jak sie da. opisz rowniez potencjalne pulapki, co sie moze nie udac, jakie sa ryzyka i jak je rozwiazac. gdybys mial inne propozycje to tez napisz. a moze tez zidentyfikowales jakis komponent. zastanow sie i przeslij bardoz obszerny dokument ajko odpowiedz
```

## Cel dokumentu (zwięzły opis)

Przygotować pierwszą, możliwie obszerną wersję dokumentu specyfikacji/overview architektury nowego Fleet Managera (systemu zarządzania autonomicznymi wózkami widłowymi), zaprojektowanego modułowo tak, aby poszczególne części mogły być rozwijane niezależnie i komunikowały się przez dobrze zdefiniowane API. Dokument ma opisać moduły, modele danych (w tym „Scenę”), interfejsy, tryby symulacji i pracy z robotami (symulacja wewnętrzna, symulacja przez Robokit/Robocore, roboty prawdziwe), a także ryzyka, pułapki i strategie ich ograniczania.

---

## Część 2 — Odpowiedź (draft specyfikacji)

# Fleet Manager 2.0 — Specyfikacja architektury (v0.1 / draft)

**Data:** 2026‑01‑06  
**Cel dokumentu:** dać Ci kompletny, modularny “szkielet prawdy” (kontrakty, moduły, dane, API, ryzyka), żeby można było przepisywać system etapami, równolegle, z minimalnym tarciem między częściami — i żeby AI mogła efektywnie implementować moduły niezależnie, trzymając się stabilnych interfejsów.

---

## 0. Co już masz (z załączonego projektu) i co warto zachować

Z repozytorium, które załączyłeś, wynika kilka bardzo dobrych fundamentów:

- **UI, które Ci się podoba** jest w praktyce “thin clientem”:
  - `apps/traffic-lab/public/` (HTML/CSS/JS + SVG mapa + panele: robots/fields/bufory/streamy/sceny/zadania/diagnostyka/awarie).
  - UI gada z backendem po REST + SSE (`/api/fleet/*`, `/api/scenes/*`, `/api/algorithms/catalog`, `/api/sim/*`).
  - To jest super do zachowania: UI nie musi znać algorytmów ani symulacji, tylko renderuje i wysyła komendy.

- **Backendowa logika symulacji i “traffic”** jest już całkiem bogata:
  - `packages/sim-runtime/src/fleet_sim.js` ma: wielorobotowy runtime, taski, worksites, przeszkody (block/avoid), diagnostykę, event log, blokady, locki, queue, time reservations, etc.
  - To jest kopalnia zachowań i edge-case’ów, które warto *zachować jako wymagania* nawet jeśli kod przepisujesz.

- Masz też “narzędzia okołoprojektowe”, które świetnie pasują do Twoich wymagań:
  - `apps/robokit-proxy` — proxy do podsłuchu/rekordu protokołów.
  - `apps/robokit-sim` — prosty symulator Robokit TCP (single robot).
  - `apps/task-manager` (w dokumentacji) — koncepcja “fleet core” sterującego robotami przez Robokit.

Ten dokument proponuje architekturę, która **zachowuje UI i dotychczasowe kontrakty**, ale porządkuje system w moduły, które mogą być rozwijane niezależnie.

---

## 1. Założenia i cele projektowe

### 1.1 Cele nadrzędne
1. **Modułowość “AI‑friendly”**: każdy większy komponent ma:
   - jasno opisany zakres odpowiedzialności,
   - osobny kontrakt API (OpenAPI + JSON Schema),
   - testy kontraktowe i symulatory/moki.
2. **System działa bez frontendu**:
   - frontend jest tylko klientem,
   - można uruchomić 0, 1 lub N frontendów jednocześnie, obserwujących tę samą scenę i stan.
3. **Wspólna definicja “Sceny” (Scene)**:
   - scena = mapa + konfiguracja workflow/streamów + konfiguracja robotów + opcjonalnie packaging/bufory + parametry algorytmów.
   - sceny są wersjonowane i można je przełączać.
4. **Jeden system, wiele “źródeł robotów” per robot**:
   - robot może być: symulowany wewnętrznie, symulowany przez Robokit API, albo prawdziwy.
   - w trakcie działania można przełączyć pojedynczego robota na inne źródło (z kontrolowaną procedurą synchronizacji).
5. **Odporność na sieć**:
   - przerwy, timeouty, retry, circuit breaker, idempotencja komend, spójność stanu.

### 1.2 Non‑goals na ten etap (żeby się nie utopić)
- Nie projektujemy tu “docelowego local obstacle avoidance” w robocie (to ma być w kolejnym kroku).
- Nie robimy certyfikacji bezpieczeństwa przemysłowego — ale projektujemy tak, żeby integracja z mechanizmami safety była możliwa.

---

## 2. Słownik pojęć (terminy domenowe)

- **Scene (Scena)**: komplet danych potrzebnych do uruchomienia floty: mapa + workflow + roboty + parametry.
- **Map / Graph**: graf nawigacyjny (węzły AP/LM itp., krawędzie, geometria, kierunkowość, szerokość “width”).
- **Worksite**: punkt logiczny pick/drop (w repo: `bin_locations`, `groups`, occupancy `empty/filled`, `blocked`).
- **Stream**: strumień pracy (np. dostawa opakowań), definiuje reguły generowania zadań.
- **Task**: zadanie robota (typowo pick->drop + akcje).
- **Fleet Core / Engine**: serce systemu; planuje, przydziela, rezerwuje, wysyła komendy do robotów.
- **Robot Provider**: źródło “prawdy” o robocie i kanał komend:
  - `internal_sim`,
  - `robokit_sim` (Robokit API),
  - `robokit_real` (prawdziwy robot Robokit/Robocore).
- **Rolling Target Point (RTP)**: sterowanie przez punkt celu “toczący się” po trasie w odległości ≥ X metrów wzdłuż planu globalnego.
- **Width > 0**: odcinki/korytarze, gdzie kiedyś będzie można lokalnie omijać przeszkody. Na start: tylko sygnalizacja “robot chce wejść w avoidance”.

---

## 3. Architektura docelowa — widok z lotu ptaka

Najważniejsza decyzja architektoniczna: **hexagonal architecture + kontrakty**.

- W środku: *domena* (planowanie, zadania, sceny, rezerwacje, stan).
- Na zewnątrz: adaptery (Robokit, Roboshop, symulacja, storage, UI).

### 3.1 Proponowany podział na moduły/usługi

Minimalny zestaw usług (deployowalnych osobno), a jednocześnie możliwy do uruchomienia “w bundlu” w dev:

1. **Fleet Core API (Engine)** — *najważniejsze*
   - REST API do: scen, robotów, worksites, tasków, ustawień algorytmów
   - kanał realtime: SSE/WebSocket (zdarzenia i snapshoty)
   - orkiestracja: planner/scheduler/dispatcher + rezerwacje + kontrola RTP
2. **Robot Gateway (Robokit/Robocore Adapter)** — *izoluje protokoły i sieć*
   - utrzymuje połączenia, retry, circuit breaker
   - wystawia jednolite API “robot driver” dla Fleet Core
   - pozwala mieć różne providery per robot
3. **Internal Simulator** (może być częścią Fleet Core albo osobną usługą)
   - wielorobotowa symulacja, kolizje, przeszkody
   - zgodna semantycznie z realnymi komendami (przynajmniej na poziomie: “pozycja, stan, blokada”)
4. **Robokit Simulator** (osobna aplikacja dev/test)
   - emuluje Robokit TCP API (dziś w repo jako `apps/robokit-sim`)
   - docelowo: multi‑robot lub wiele instancji
5. **Roboshop Integration Adapter** (opcjonalnie osobna aplikacja)
   - potrafi przyjąć/udostępnić sceny w formacie Roboshop/RDS (uploadScene/downloadScene)
   - tłumaczy na wewnętrzny format Scene Service
6. **Proxy/Recorder Tools**
   - TCP proxy (Robokit) + HTTP proxy (Roboshop/RDS)
   - zapis pakietów/ramek, metadanych, opcjonalnie replay

### 3.2 Diagram zależności

```text
+-------------------+        REST/SSE        +--------------------------+
|  Frontend #1      | <--------------------> |  Fleet Core API (Engine) |
+-------------------+                        +-----------+--------------+
         ^                                                |
         | REST/SSE                                        | "Robot Driver" port
         v                                                v
+-------------------+                        +--------------------------+
|  Frontend #N      |                        |  Robot Gateway           |
+-------------------+                        +-----+----------+---------+
                                                  |          |
                                                  | Robokit   | Internal provider
                                                  v          v
                                         +--------------+   +------------------+
                                         | Real Robot   |   | Internal Sim     |
                                         | (Robokit)    |   | (multi-robot)    |
                                         +--------------+   +------------------+
                                                  ^
                                                  | Robokit API
                                         +------------------+
                                         | Robokit-Sim      |
                                         +------------------+

+-------------------+         HTTP           +--------------------------+
| Roboshop / RDS    | <--------------------> | Roboshop Adapter         |
+-------------------+                        +--------------------------+
                                                        |
                                                        v
                                              +------------------+
                                              | Scene storage    |
                                              +------------------+

+-------------------+
| Proxy/Recorder    |
+-------------------+  (podsłuch TCP/HTTP między dowolnymi stronami)
```

---

## 4. Najważniejsze wymagania funkcjonalne

### 4.1 UI (frontend)
- Render mapy (graf + geometria) i robotów w czasie rzeczywistym.
- Podgląd:
  - robotów (online/dispatchable/manual/blocked/battery/pose/task status),
  - worksites (empty/filled/blocked),
  - streamów (konfiguracja, aktywacje),
  - tasków (kolejka, w toku, zakończone),
  - scen (lista, aktywna, przełączanie).
- Interakcje:
  - ustawianie occupancy i blocked na worksites,
  - manual drive / go‑target / go‑point,
  - pauza/wznow/cancel tasku/nawigacji,
  - dodawanie przeszkód (block/avoid) w trybie symulacji,
  - przełączanie algorytmu i parametrów.
- Multi‑frontend:
  - równoległe akcje od wielu klientów → serwer rozstrzyga konflikty (idempotencja + walidacja + eventy).

### 4.2 Fleet Core
- Wczytywanie scen, aktywowanie, walidacja spójności.
- Utrzymywanie stanu runtime:
  - robots, tasks, worksites, obstacles, streams, reservations.
- Generowanie tasków ze streamów (np. packaging engine) + ręczne taski.
- Przydział robota do tasku (strategy: nearest/first/…).
- Planowanie trasy globalnej po grafie (na start: bez lokalnego omijania).
- “Traffic management”: unikanie konfliktów między robotami (rezerwacje / locki / kolejki).
- Sterowanie robotem przez **Rolling Target Point**.
- Detekcja “blocked/stuck” + sygnał “robot wants avoidance”.
- Możliwość symulacji wewnętrznej wielu robotów (kolizje).
- Możliwość przełączania providerów per robot w trakcie działania.

### 4.3 Integracje
- Robokit/Robocore:
  - stan robota, task status, komendy ruchu, pause/resume/cancel, ewentualnie relokalizacja.
- Roboshop:
  - upload/download scen/map/konfiguracji (w repo widoczne endpointy RDS/Roboshop).
- Proxy:
  - podsłuch i zapis komunikacji, łatwa konfiguracja portów, rotacja logów.

---

## 5. Wymagania niefunkcjonalne (kluczowe dla jakości)

1. **Deterministyczność** (szczególnie w symulacji i plannerze): możliwość replay.
2. **Kontrakty i wersjonowanie API**:
   - `/api/v1/...` + OpenAPI
   - kompatybilność wsteczna albo warstwa “compat”.
3. **Odporność na błędy**:
   - timeouty, retry, circuit breaker, odtwarzanie po restarcie,
   - idempotencja komend.
4. **Obserwowalność**:
   - structured logs, metrics, trace/correlationId,
   - endpointy diagnostyczne + snapshot dump.
5. **Bezpieczeństwo operacyjne**:
   - role/permissions (nawet proste),
   - audit log (kto zmienił worksite/scene/robot provider),
   - tryby “readonly” i “manual override”.

---

## 6. Granice modułów i repozytoriów

Żeby AI mogła pracować równolegle, trzeba rozdzielić “co jest prawdą” od “jak to uruchamiamy”.

### 6.1 Warstwy (zalecane)
- **Domain (pure)**: logika planowania, rezerwacji, tasków, stanu — bez sieci, bez plików.
- **Ports (interfaces)**:
  - `RobotDriverPort` (send target, read status, pause/resume, etc)
  - `SceneRepositoryPort` (load/save scenes)
  - `EventBusPort` (publish domain events)
  - `ClockPort` (czas: real lub manual)
- **Adapters**:
  - Robokit adapter, internal sim adapter, storage adapter, Roboshop adapter.
- **Apps**:
  - fleet-core-api server, robot-gateway server, roboshop-adapter server, proxy tool.

### 6.2 Zasada: API jako “twarda granica”
- Między UI ↔ Fleet Core: zawsze HTTP + SSE/WS.
- Między Fleet Core ↔ Robot Gateway: preferowane gRPC albo HTTP (zależy od stacku), ale *kontrakt musi być formalny*.
- W dev można uruchomić “bundle”, ale granice muszą pozostać.

---

## 7. Model danych: Scene i runtime

### 7.1 Scene — definicja
**Scene** ma być *wersjonowalna i przenośna*. Proponuję:

- Scene = **immutable** “revision” (np. `sceneId + revisionId`).
- Runtime state (occupancy, obstacles, tasks in progress) jest osobno.

#### 7.1.1 Struktura na dysku (propozycja)
```text
scenes/
  index.json
  <sceneId>/
    revisions/
      <revId>/
        manifest.json
        maps/
          <mapId>.smap   (opcjonalnie)
          <mapId>.graph.json (opcjonalnie, znormalizowany)
        workflow.json5
        robots.json
        packaging.json
        extras/...
```

`index.json` trzyma:
- listę scen i rewizji,
- aktywną scenę i aktywną mapę.

#### 7.1.2 manifest.json (przykład)
```json
{
  "sceneId": "nowy-styl",
  "revisionId": "2026-01-06T12-00-00Z__imported",
  "name": "Nowy Styl - floor A",
  "createdAt": "2026-01-06T12:00:00.000Z",
  "maps": [
    { "mapId": "map-1", "kind": "smap", "path": "maps/map-1.smap", "md5": "..." },
    { "mapId": "map-1-graph", "kind": "graph", "path": "maps/map-1.graph.json", "md5": "..." }
  ],
  "activeMapId": "map-1-graph",
  "artifacts": {
    "workflow": "workflow.json5",
    "robots": "robots.json",
    "packaging": "packaging.json"
  },
  "defaults": {
    "algorithmProfile": "default",
    "rollingTarget": { "lookaheadM": 3.0, "minUpdateMs": 200 }
  },
  "compat": {
    "source": "roboshop-uploadScene",
    "originalZipName": "upload_scene.zip"
  }
}
```

### 7.2 Runtime state — co NIE jest częścią sceny
- `worksiteState`: occupancy/blocked *w runtime* (chyba że “zapisz do sceny”).
- `obstacles`: przeszkody symulacyjne.
- `tasks`: aktywne i historia.
- `robotRuntime`: route, schedule, segmentIndex, blockedReason, etc.
- `reservations`: rezerwacje czasu i locki.

To pozwala:
- przełączać sceny bez przenoszenia “brudu runtime”,
- robić replay/diagnostykę.

---

## 8. API publiczne (UI ↔ Fleet Core)

### 8.1 Zasady API
- **Wersjonowanie**: `/api/v1/...`
- **Idempotencja komend**: każda komenda może mieć `commandId` (UUID) + `clientId`.
- **Wspólny format błędów**:
```json
{ "error": "invalid_payload", "message": "..." , "details": {...}, "traceId": "..." }
```
- **Optymistyczna kontrola wersji** dla zasobów edytowalnych:
  - `etag`/`version` w odpowiedzi
  - `If-Match` przy update

### 8.2 Realtime: Event stream vs snapshot
UI potrzebuje “żywego” widoku. Najczytelniej:

- **SSE**: `/api/v1/stream`  
  - wysyła *eventy* + co jakiś czas snapshot.
- Alternatywnie WebSocket, ale SSE jest prostsze (i masz to już w projekcie).

#### 8.2.1 Model zdarzeń (propozycja)
Każde zdarzenie:
```json
{
  "type": "robot.updated",
  "ts": 1736160000000,
  "seq": 12345,
  "sceneId": "nowy-styl",
  "payload": { ... }
}
```

Przykładowe typy:
- `scene.activated`
- `worksite.updated`
- `robot.updated`
- `robot.providerChanged`
- `task.created`
- `task.updated`
- `obstacle.added` / `obstacle.removed`
- `diagnostics.snapshotAvailable`

### 8.3 Endpointy — minimalny zestaw (zachowuje sens Twojego UI)

#### 8.3.1 Scenes
- `GET /api/v1/scenes`
  - list + active
- `GET /api/v1/scenes/{sceneId}`
- `GET /api/v1/scenes/active`
- `POST /api/v1/scenes/activate`
  - body: `{ "sceneId": "...", "mapId": "..." }`
- `POST /api/v1/scenes/import/roboshop`
  - przyjmuje ZIP (uploadScene) i tworzy nową rewizję
- `GET /api/v1/scenes/{sceneId}/export`
  - opcjonalnie: export do zip

#### 8.3.2 Map / graph / workflow artifacts
- `GET /api/v1/scenes/active/map` → map meta + graph
- `GET /api/v1/scenes/active/workflow`
- `GET /api/v1/scenes/active/robots-config`
- `GET /api/v1/scenes/active/packaging-config`

*(UI dziś korzysta z `/data/*` i `/api/scenes/*`; możesz zachować kompatybilność: Fleet Core może wystawić aliasy albo API Gateway może mapować stare ścieżki.)*

#### 8.3.3 Fleet state
- `GET /api/v1/fleet/state`
  - snapshot: robots, worksites, tasks, tick/time, obstacles (opcjonalnie)
- `GET /api/v1/fleet/stream` (SSE)

Proponowany kształt `fleet/state` jest bardzo bliski temu, co już generuje `getStatus()` w symulatorze:

```json
{
  "tickMs": 140,
  "lastTickAt": 1736160000000,
  "robots": [ ... ],
  "worksites": [ ... ],
  "tasks": [ ... ],
  "obstacles": [ ... ],
  "activeScene": { "sceneId": "...", "revisionId": "...", "mapId": "..." }
}
```

#### 8.3.4 Worksites
- `GET /api/v1/worksites`
- `PATCH /api/v1/worksites/{id}`
  - `{ "filled": true|false, "blocked": true|false }`

#### 8.3.5 Tasks
- `GET /api/v1/tasks?status=...&robotId=...`
- `POST /api/v1/tasks` (manual task)
  - `{ "kind": "pickdrop", "pickId": "...", "dropId": "...", "streamId": "...", "meta": {...} }`
- `POST /api/v1/tasks/{taskId}/cancel`
- `POST /api/v1/tasks/{taskId}/pause` / `resume` (opcjonalnie, zależy od modelu)

#### 8.3.6 Robots (komendy użytkownika)
- `GET /api/v1/robots`
- `GET /api/v1/robots/{id}`
- `PATCH /api/v1/robots/{id}`
  - `dispatchable`, `controlled`, `manualMode`
- `POST /api/v1/robots/{id}/go-target`
  - `{ "targetId": "AP20", "action": "load|unload|null", "commandId": "..." }`
- `POST /api/v1/robots/{id}/go-point`
  - `{ "x": 1.23, "y": 4.56, "angle": 1.57?, "commandId": "..." }`
- `POST /api/v1/robots/{id}/motion`
  - `{ "vx": 0.2, "vy": 0.0, "w": 0.1, "durationMs": 200?, "commandId": "..." }`
- `POST /api/v1/robots/{id}/pause` / `resume` / `cancel` / `stop`

#### 8.3.7 Obstacles (symulacja / test)
- `GET /api/v1/obstacles`
- `POST /api/v1/obstacles`
  - `{ "x":..., "y":..., "radius": 0.8, "mode": "block|avoid" }`
- `POST /api/v1/obstacles/clear`
- `DELETE /api/v1/obstacles/{id}`

#### 8.3.8 Algorithms catalog + settings
- `GET /api/v1/algorithms/catalog`
- `GET /api/v1/algorithms/settings`
- `PATCH /api/v1/algorithms/settings`
  - wybór strategii + parametry (dispatch/traffic/rezervation profile etc)

#### 8.3.9 Diagnostics
- `GET /api/v1/diagnostics?robotId=...&reservations=1&history=1...`
- `POST /api/v1/diagnostics/dump` (zapis snapshotu diagnostycznego do storage)

To jest istotne, bo debug flot jest piekłem — a Ty już masz w symulacji mechanizmy typu `diag dump`.

---

## 9. API wewnętrzne: Fleet Core ↔ Robot Gateway

Tu klucz to *stabilny kontrakt* niezależny od Robokit.

### 9.1 RobotDriverPort (interfejs logiczny)
Minimalny zestaw metod:

- `connect(robotId, config) -> connectionState`
- `getStatus(robotId) -> RobotStatus`
- `sendRollingTarget(robotId, RollingTargetCommand) -> Ack`
- `sendGoTarget(robotId, GoTargetCommand) -> Ack`
- `sendGoPoint(robotId, GoPointCommand) -> Ack`
- `pause/resume/cancel/stop(robotId) -> Ack`
- `setManualMode(robotId, enabled) -> Ack`
- `relocate(robotId, pose|stationId) -> Ack` *(opcjonalnie, ale bardzo przydatne do przełączania providerów)*

### 9.2 RobotStatus (kanoniczny model)
To musi być “wspólny język” dla sim i real:

```json
{
  "robotId": "RB-01",
  "ts": 1736160000000,
  "online": true,
  "pose": { "x": -149.25, "y": -47.17, "angle": 1.57 },
  "speed": 0.3,
  "battery": 82,
  "task": {
    "taskId": "T-123",
    "status": "in_progress|paused|completed|failed|cancelled|null",
    "phase": "drive|pick|drop|park|blocked|manual"
  },
  "flags": {
    "blocked": false,
    "wantsAvoidance": false,
    "emergencyStop": false
  },
  "details": {
    "blockedReason": "obstacle|collision|traffic|robot|unknown|null",
    "lastError": null
  }
}
```

**Ważne:** w repo masz mapowanie statusów Robokit (`task_status` 0/2/3/4/6) do stringów domeny. To powinno być *jednym źródłem prawdy* w Gateway.

### 9.3 Provider per robot (hot‑swap)
Robot Gateway musi umieć dla każdego robota:
- utrzymywać aktualnego providera,
- robić przełączenie w transakcyjny sposób:
  - stop/pause,
  - snapshot pose,
  - switch,
  - resync,
  - resume.

Proponowane API:
- `POST /api/v1/robots/{id}/provider`
  ```json
  {
    "mode": "internal_sim|robokit_sim|robokit_real",
    "connection": { "host": "10.0.0.12", "ports": {...} },
    "sync": { "strategy": "relocate|assume|manualConfirm", "pose": {...} },
    "commandId": "..."
  }
  ```

---

## 10. Silnik nawigacyjny i zarządzanie ruchem (Traffic)

Tu warto spiąć to, co już masz w dokumentacji (ADR + istniejący runtime), w jedną czystą specyfikację.

### 10.1 Czas i przedziały (klucz do rezerwacji)
- Czas w systemie: **TimeMs = integer (ms)**.
- Przedziały rezerwacji: **[start, end)** (start włącznie, end wyłącznie).
  - To usuwa mnóstwo błędów brzegowych.

### 10.2 Pipeline planowania (zalecany, bo modułowy)
Wariant “czysty” (bardzo AI‑friendly):

1. **Snapshot** (stan świata): roboty + ich cele + stan worksites + przeszkody + aktualny czas.
2. **Intent**: dla każdego robota planner generuje route (lista segmentów).
3. **Schedule**: scheduler nadaje czasy segmentom (z timing model).
4. **Reservation proposal**: na podstawie schedule generuje rezerwacje zasobów (edge group / node / critical section).
5. **Transaction/Commit**:
   - jeśli konflikt → repair schedule (przesuwanie/wait/backoff) albo replan,
   - jeśli OK → commit rezerwacji.
6. **Dispatch**:
   - Fleet Core generuje “rolling target points” i wysyła do robotów.

To dokładnie odpowiada kierunkowi z Twoich dokumentów o runnerze/schedulerze.

### 10.3 Zasoby do rezerwacji (co najmniej)
- **Node** (skrzyżowania, wąskie gardła).
- **Edge group / corridor** (korytarze współdzielone; zwłaszcza przeciwne kierunki).
- **Critical section** (sekcja, w której jednocześnie może być max N robotów).

### 10.4 Minimalne zachowanie na start (bez local obstacle avoidance)
- Planner zakłada brak omijania przeszkód.
- Jeśli robot nie postępuje → `blocked/stuck`.
- Jeśli robot sygnalizuje “avoidance needed” → Fleet Core:
  - oznacza segment/obszar jako tymczasowo “avoid requested”,
  - może przeplanować (detour) tylko jeśli graf pozwala,
  - lub czeka na interwencję operatora.

### 10.5 Parametryzacja (profil algorytmu)
Konfiguracja algorytmu powinna być:
- częścią sceny (defaults),
- nadpisywalna runtime (operatorskie).

Przykład:
```json
{
  "dispatch": { "strategy": "nearest" },
  "traffic": {
    "strategy": "pulse-mapf-avoid",
    "replanIntervalMs": 1200,
    "replanDistance": 0.8,
    "nodeLocks": true,
    "nodeLockRadius": 0.6,
    "reservationHorizonMs": 12000,
    "reservationStepMs": 400
  }
}
```

---

## 11. Rolling Target Point — spec sterowania ruchem robota

To jest centralny element Twoich wymagań.

### 11.1 Definicja
Robot dostaje nie “finalny cel”, tylko **punkt docelowy przesuwający się** po globalnej trasie w odległości co najmniej `lookaheadM` od aktualnej pozycji projekcji na trasę.

### 11.2 Dlaczego to ma sens
- globalny planner utrzymuje koordynację floty,
- robot lokalnie planuje mikroruch (dziś: proste dążenie; jutro: lokalne omijanie),
- zmniejszasz ryzyko “szarpania” i kosztownych cancel/restart tasków.

### 11.3 Kontrakt RollingTargetCommand
```json
{
  "commandId": "...",
  "robotId": "RB-01",
  "routeId": "R-987",
  "target": { "x": -150.1, "y": -46.9, "angle": 1.55? },
  "constraints": {
    "minLookaheadM": 3.0,
    "maxSpeedMps": 1.0?,
    "allowBackward": false?
  },
  "validUntilTs": 1736160000500,
  "meta": { "segmentIndex": 12, "progressM": 4.2 }
}
```

### 11.4 Algorytm wyznaczania RTP (proponowany)
1. Weź globalną trasę jako polilinię (z segmentów grafu + geometria).
2. Znajdź projekcję aktualnej pozycji robota na polilinię → `s` (odległość wzdłuż trasy).
3. Ustal `s_target = s + lookaheadM` (z dolnym ograniczeniem).
4. Wyznacz punkt na polilinii dla `s_target` (interpolacja).
5. Opcjonalnie: heading jako styczna do trasy.

**Ważne parametry runtime:**
- `lookaheadM` (np. 2–5m, zależnie od prędkości i gęstości grafu)
- `minUpdateMs` (np. 150–300ms)
- `maxUpdateRateHz` (ochrona przed spamem komend)
- `repathThresholdM` (kiedy route update wymaga “resetu” RTP)

### 11.5 Blokada / stuck detection (kontrakt)
Fleet Core musi umieć jednoznacznie stwierdzić:
- robot nie postępuje (postęp wzdłuż trasy < ε przez T sekund),
- robot odjechał zbyt daleko od trasy,
- robot nie potrafi osiągnąć RTP.

Wtedy:
- ustaw `RobotStatus.flags.blocked = true`
- `blockedReason = traffic|obstacle|collision|robot|unknown`
- `wantsAvoidance = true` jeśli to ma sens (np. obstacle).

To jest minimalny punkt integracji pod przyszłe “local avoidance”.

---

## 12. Symulacja: wewnętrzna vs Robokit vs real

### 12.1 Wewnętrzny symulator (multi-robot)
Wymagania:
- obsługa N robotów równolegle,
- model ruchu (może być uproszczony, ale spójny):
  - prędkość, przyspieszenie, turn rate,
- kolizje:
  - wykrywanie overlap (circle albo footprint envelope),
  - reakcja: blokada, event diagnostyczny,
- przeszkody:
  - `mode=block` (krawędzie zablokowane),
  - `mode=avoid` (robot “chce avoidance” — na start: tylko sygnał),
- deterministyczność:
  - seed + replay.

W repo masz już sporo z tego (kolizje, obstacles, diag snapshots). W nowej architekturze to powinno stać się **modułem z czystym interfejsem**.

### 12.2 Symulacja przez Robokit API
Cel: testy integracyjne bez prawdziwego robota, ale z “prawdziwym protokołem”.
- `robokit-sim` emuluje Robokit TCP.
- Robot Gateway gada z nim tak samo jak z realnym robotem.
- To pozwala testować:
  - retry,
  - timeouts,
  - status mapping,
  - semantics komend.

### 12.3 Przełączanie robota w trakcie symulacji (hot switch)
To jest trudne, więc spec musi być precyzyjna.

#### 12.3.1 Stany przełączania
- `switching.pending`
- `switching.syncing`
- `switching.ready`
- `switching.failed`

#### 12.3.2 Procedura: internal_sim → robokit_sim/real
1. Fleet Core: `pause robot` (zatrzymaj dispatch RTP i task).
2. Zrób snapshot:
   - pose (x,y,angle),
   - “gdzie na trasie” (segmentIndex, progress),
   - task context.
3. Robot Gateway: przełącz provider.
4. Sync:
   - jeśli Robokit wspiera relokalizację: wyślij `relocate(pose)` do sim/robota,
   - jeśli nie: wymuś `manualConfirm` (operator ustawia robota fizycznie).
5. Gdy status stabilny (`online`, pose OK) → `resume`.

#### 12.3.3 Procedura: robokit_* → internal_sim
1. Pause/stop na robocie.
2. Pobierz status pose.
3. Ustaw pose w internal sim.
4. Przełącz provider i resume.

**Ryzyko:** różnice map/koorydnatów między robotem a flotą.  
**Mitigacja:** sceny muszą zawierać metadane mapy i walidację zgodności (md5, bounds, resolution).

---

## 13. Roboshop / RDS integracja

Masz w dokumentacji obserwowane endpointy typu:
- `POST /getProfiles`
- `GET /robotsStatus`
- `GET /downloadScene`
- `POST /uploadScene`

I layout ZIP sceny z `rds.scene`, mapami `.smap`, modelami robota itd.

### 13.1 Decyzja architektoniczna (rekomendacja)
Nie mieszaj tego z Fleet Core.

- Fleet Core ma własny “kanoniczny” format Scene.
- **Roboshop Adapter**:
  - przyjmuje Roboshop/RDS ZIP,
  - wyciąga `.smap`, `rds.scene`,
  - mapuje do `manifest.json + robots.json + workflow/packaging`,
  - zapisuje nową rewizję sceny w Scene Storage,
  - opcjonalnie potrafi eksportować w drugą stronę.

To daje czytelność i niezależny rozwój.

### 13.2 Walidacja importu
Import nie może być “best effort bez ostrzeżeń”, bo potem debug to koszmar.

- walidacja: czy wszystkie punkty z workflow istnieją w mapie,
- czy roboty mają initialPosition w istniejących AP,
- czy bindRobotMap jest spójne,
- raport: lista ostrzeżeń + błędów krytycznych.

---

## 14. Proxy/Recorder — podsłuch protokołów (osobny komponent)

Wymagania, które opisałeś, pasują do **narzędzia developerskiego**, nie do Fleet Core.

### 14.1 Funkcje
- TCP proxy (Robokit):
  - listen na portach A, forward na host:port B,
  - log ramek (kierunek, timestamp, seq, apiNo, payload),
  - rotacja logów, katalog per sesja, filtry.
- HTTP proxy (Roboshop/RDS):
  - log request/response,
  - zapisywanie binarek (ZIP sceny).
- Konfiguracja:
  - YAML/JSON: mapowanie portów, hosty, katalog logów, tryb “mask sensitive data”.

### 14.2 Replay (opcjonalne, ale złoto)
- odtwarzanie zapisanej sesji jako “wirtualny upstream”,
- pozwala robić regresje i debug bez sprzętu.

---

## 15. Odporność na błędy i przerwy sieciowe

To jest miejsce, gdzie zwykle systemy flot “pękają w realu”.

### 15.1 Zasady dla komend
- każda komenda ma `commandId` (UUID),
- robot gateway trzyma “ostatnie commandId per robot” i odrzuca duplikaty lub robi safe retry,
- Fleet Core nie zakłada, że komenda dotarła — czeka na potwierdzenie (Ack) albo na zmianę stanu.

### 15.2 Circuit breaker i retry
W Robokit kliencie z repo masz już retryable errors i breaker — to jest dobry kierunek:
- retry na: ECONNRESET, ECONNREFUSED, timeout,
- breaker: po N failure → open na T ms,
- health check: co X ms → zamyka breaker przy sukcesie.

### 15.3 Spójność stanu przy wielu frontendach
- Serwer jest jedynym źródłem prawdy.
- Frontendy wysyłają komendy, ale nie zakładają sukcesu bez eventu.
- UI utrzymuje “pending state” komend po `commandId`.

### 15.4 Fail-safe (operacyjne)
Gdy Fleet Core padnie:
- roboty powinny wejść w bezpieczny stan:
  - albo stop (najbezpieczniej),
  - albo kontynuacja do najbliższego safe point — *ale to wymaga osobnej polityki bezpieczeństwa*.

To musi być decyzja wdrożeniowa. W specyfikacji warto uwzględnić “Safety Policy” jako konfigurowalną.

---

## 16. Observability i diagnostyka

### 16.1 Minimalny standard
- Każde żądanie ma `traceId`.
- Każda komenda ma `commandId` i jest logowana w audit log.

### 16.2 Diagnostyka runtime
- Endpoint `GET /diagnostics` zwraca:
  - route + segmentIndex + scheduleEntry,
  - locki, queue, reservations,
  - obstacles,
  - event log,
  - opcjonalnie wait graph (jeśli masz deadlocki).

Masz to już w symulacji — w nowym systemie to powinno być wspólne dla sim i real (na miarę możliwości).

### 16.3 Snapshot dump
“Zapisz mi stan, bo coś się dziwnego stało” powinno być jednym kliknięciem.
- `/diagnostics/dump` zapisuje JSON z:
  - scene revision,
  - runtime state,
  - ostatnie eventy,
  - konfigurację algorytmu.

To jest absolutnie kluczowe do współpracy z AI (“tu masz dump, napraw”).

---

## 17. Testy i weryfikacja (żeby rewrite nie umarł po 3 tygodniach)

### 17.1 Testy kontraktowe API
- OpenAPI + schematy JSON.
- Generator klientów (opcjonalnie).
- Testy “consumer-driven contracts” dla UI:
  - UI ma test, że `GET /fleet/state` ma wymagane pola.

### 17.2 Testy domenowe (property-based / scenariusze)
- Inwarianty mapy (masz już e2e map invariants):
  - każdy worksite.point istnieje w mapie,
  - grupy zawierają istniejące punkty,
  - graf spójny / brak zerowych krawędzi.
- Inwarianty rezerwacji:
  - brak overlapów w tym samym zasobie w tym samym oknie (dla profilu).
- Inwarianty “fairness”:
  - brak starvation (robot nie czeka wiecznie).

### 17.3 Testy symulacja vs robokit-sim
- te same testy “dispatch + traffic” uruchamiane:
  - na internal sim,
  - na robokit-sim.

To wykrywa drift semantyczny.

---

## 18. Ryzyka i pułapki (realnie: co się może nie udać)

Poniżej lista “min” plus konkretne mitigacje.

### 18.1 Drift semantyczny: sim ≠ real
**Problem:** symulator nigdy nie jest w 100% realem → algorytm działa w sim, a w realu się krztusi.  
**Mitigacja:**
- utrzymuj Robokit-sim i testy integracyjne na protokole,
- loguj i replay’uj sesje z reala,
- wprowadzaj “chaos mode” (jitter, opóźnienia) w sim.

### 18.2 Przełączanie providerów per robot = trudny stan przejściowy
**Problem:** pose/map mismatch, robot “teleportuje”, rezerwacje nie pasują.  
**Mitigacja:**
- przełączanie tylko przez stan `paused`,
- procedura sync (relocate/manualConfirm),
- po switch: replan + rebuild reservations dla tego robota.

### 18.3 Dynamiczna zmiana mapy w trakcie ruchu
**Problem:** robot jedzie po krawędzi, która znika / zmienia się geometria.  
**Mitigacja:**
- rozróżnij:
  - “runtime patches” (block/unblock, obstacles) — bez zmiany topologii,
  - “scene revision activation” — zmiana topologii; wymaga zatrzymania lub kontrolowanego “migration mode”.
- wymuś politykę: aktywacja sceny = stop/pause wszystkich robotów (na start).

### 18.4 Wielu operatorów (multi-frontend) i konflikty
**Problem:** dwóch operatorów ustawia occupancy/blocked na tym samym worksite.  
**Mitigacja:**
- wersjonowanie zasobów (`version` + `If-Match`) albo “last-write-wins” z audytem,
- UI pokazuje kto i kiedy zmienił (audit).

### 18.5 Złożoność mikroserwisów
**Problem:** za dużo usług = trudny deploy i debug.  
**Mitigacja:**
- utrzymaj *granice logiczne* (ports/adapters), ale pozwól uruchamiać “bundle mode” w jednym procesie w dev.
- dopiero w produkcji rozdzielaj tam, gdzie ma to sens (Robot Gateway często warto osobno).

### 18.6 Brak formalnych kontraktów = chaos dla AI
**Problem:** AI “zgaduje” pola i robi rozjazdy.  
**Mitigacja:**
- OpenAPI + JSON Schema + przykładowe payloady + testy kontraktowe jako “gatekeeper”.

### 18.7 Safety
**Problem:** błędna komenda może spowodować niebezpieczne zachowanie robota.  
**Mitigacja (architektoniczna):**
- wprowadź “Safety Policy layer”:
  - limity prędkości,
  - strefy zakazane,
  - tryb “manual override” i “emergency stop”.
- nawet jeśli safety jest poza FM (PLC), FM musi mieć mechanizmy “stop now”.

---

## 19. Dodatkowe komponenty, które warto dodać (a których często brakuje)

### 19.1 “Scenario Runner” + Replay Harness
- uruchamiasz scenę + seed + zestaw zgłoszeń streamów,
- generujesz raport: throughput, deadlock count, makespan.
To jest nieocenione przy iterowaniu algorytmu.

### 19.2 “Map Compiler / Validator”
- osobny moduł: bierze `.smap` + workflow/packaging/robots, daje:
  - znormalizowany graph,
  - indeksy (np. worksiteId → nodeId),
  - wykryte błędy i ostrzeżenia.
Dzięki temu Fleet Core dostaje już “gotowy” model.

### 19.3 Event Sourcing (opcjonalnie)
- zamiast trzymać tylko aktualny stan, zapisujesz eventy domenowe.
- potem możesz odtworzyć stan w dowolnym momencie.
To jest turbo narzędzie do debug i do pracy z AI (“tu masz event stream, znajdź błąd w logice”).

### 19.4 “Policy/Rules engine” dla operacji magazynowych
Streamy i packaging to w praktyce reguły biznesowe.
Oddzielenie ich od traffic/planning zmniejsza sprzężenie.

---

## 20. Proponowany plan etapów (żeby to realnie dowieźć)

### Etap A — “Kontrakty i szkielet”
- OpenAPI dla `/api/v1/*` (scenes, fleet/state, robots, worksites, tasks, stream).
- Event stream SSE.
- Adapter kompatybilności dla obecnego UI (żeby UI działało prawie bez zmian).

### Etap B — “Scene lifecycle”
- Scene storage + revisioning.
- Import Roboshop ZIP → scene revision.
- Aktywacja sceny + walidacja.

### Etap C — “Robot Gateway”
- Jednolity RobotStatus i RobotDriverPort.
- Provider: `robokit_*` + retry/breaker.
- Podstawowe komendy: go-target/go-point/pause/resume/cancel.

### Etap D — “Internal multi-robot sim”
- Minimalny model ruchu + collision + obstacles.
- Ten sam RobotDriverPort jako provider.

### Etap E — “Rolling Target Point”
- RTP w Fleet Core:
  - generowanie z route,
  - wysyłka do providerów,
  - blocked detection.
- W internal sim: RTP jest konsumowany.
- W robokit: RTP mapowany na komendy (np. go-point), z throttlingiem.

### Etap F — “Traffic + reservations”
- Wpięcie scheduler/reservations.
- Diagnostyka: locki, rezerwacje, deadlock signals.

---

## 21. Decyzje otwarte (z Twoich rozważań) — i rekomendacje

### 21.1 Czy silnik powinien korzystać bezpośrednio z Roboshop API?
**Rekomendacja: nie.**  
Roboshop to narzędzie konfiguracyjne/operacyjne. Łączenie go wprost z pętlą sterowania:
- zwiększa sprzężenie,
- utrudnia testy,
- pogarsza niezawodność (kolejny hop).

Lepiej:
- Roboshop Adapter do importu/eksportu scen i ewentualnie statusów,
- Robot Gateway bezpośrednio do Robokit/Robocore.

### 21.2 Czy robotami ma zarządzać osobny program?
**Rekomendacja: tak, ale w sensie “Robot Gateway”** (nie osobny “fleet manager”).
- Fleet Core ma się skupiać na planowaniu i stanie.
- Gateway ma się skupiać na sieci, protokołach, retry i “per robot provider”.

To daje najczystszy podział pracy.

### 21.3 Czy silnik ma być “tylko REST API”?
**Tak — to jest dobra baza.**  
Ale pamiętaj o realtime:
- REST do komend i snapshotów,
- SSE/WS do strumienia zdarzeń.

---

## 22. Appendix: zgodność z obecnym UI (żebyś mógł zachować wygląd)

Twoje UI (z `apps/traffic-lab/public/app.js`) zakłada m.in.:
- `/api/scenes`, `/api/scenes/active`, `/api/scenes/activate`
- `/api/fleet/config`, `/api/fleet/state`, `/api/fleet/stream`, `/api/fleet/worksites`, `/api/fleet/robots/...`
- `/api/algorithms/catalog`
- `/api/sim/obstacles`, `/api/sim/settings`, `/api/sim/blocked`

W rewrite najrozsądniej:
- wprowadzić `/api/v1/...` jako docelowe,
- utrzymać *compat layer* (aliasy) dla obecnych endpointów, żeby UI działało od razu,
- dopiero potem (opcjonalnie) UI migrować na v1.

---

## Na koniec: “najkrótsza definicja sukcesu”

Jeśli po rewrite:
- możesz uruchomić Fleet Core bez UI,
- podpiąć 2–10 frontendów i każdy widzi spójny stan,
- odpalić scenę w internal sim z 5 robotami i mieć kolizje/blocked/diagnostykę,
- przełączyć jednego robota w locie na robokit-sim (albo real) i reszta dalej działa,
- a algorytm jest wymienialny “plug‑inowo”…

…to masz architekturę, która jest jednocześnie elegancka, zrozumiała i naprawdę “AI‑ready”.

Jeśli będziesz chciał, mogę w kolejnym kroku z tej specyfikacji zrobić **konkretne OpenAPI (YAML)** dla kluczowych endpointów oraz **kanoniczne JSON Schema** dla Scene/Robot/Task/Worksite/Events — tak, żeby to było gotowe do codegen i contract testów.

