# Fleet Manager 2.0 — Specyfikacja architektury (v0.3) — Integracje i narzędzia

> **Podział komponentowy (v0.3):** Ten plik zawiera komponenty: UI Frontend, Roboshop Bridge, Map Compiler, Proxy/Recorder, a także testy, scenariusze, MVP i dodatki.

> Kontrakty danych, reason codes, SSE i publiczne API są w pliku: `spec_fleet_manager_architektura_v0_3_core.md`.

---

## 3. Architektura wysokopoziomowa — wycinek: komponenty integracyjne i dev-tools

### 3.4 Specyfikacja komponentów (szczegółowo)

Poniżej jest normatywny opis komponentów, żeby granice odpowiedzialności były jednoznaczne.


#### 3.4.3 UI Frontend
UI **MUST**:
- Łączyć się tylko z Fleet Core (nigdy bezpośrednio z Gateway).
- Subskrybować `/api/v1/events/stream` i utrzymywać lokalny stan jako funkcję snapshotu + delt.
- Obsługiwać Control Lease:
  - pokazywać kto ma kontrolę,
  - umożliwiać przejęcie (seize), renew, release.
- Działać poprawnie w trybie viewer (bez lease): tylko podgląd.

UI **SHOULD**:
- Mieć tryb „read-only banner” gdy lease jest u kogoś innego.
- Być odporne na reconnect SSE (wznawianie od cursora).


#### 3.4.4 Roboshop Bridge
Roboshop Bridge **MUST**:
- Tłumaczyć formaty Roboshop/RDS na kanoniczne pliki sceny (SceneManifest + graph/worksites/streams/robots/algorithm).
- Dokumentować mapowanie ID (np. stacje Roboshop ↔ nodeId w graph).
- Umożliwiać import scen do Fleet Core:
  - albo jako „export package” (folder/zip) importowany przez Core,
  - albo przez bezpośredni endpoint bridge→core (HTTP).

Roboshop Bridge **MAY** (po MVP):
- Obsługiwać webhooks/pollowanie Roboshop.
- Obsługiwać eksport zmian z Fleet Core z powrotem do Roboshop (dwukierunkowo).


#### 3.4.5 Map Compiler
Map Compiler **MUST**:
- Przyjmować `graph.json` (i/lub `.smap`) jako input.
- Produkować kanoniczny `SceneGraph` z:
  - metadanymi jednostek (`source.originalUnits`, `canonicalUnits`),
  - polami `propsCompiled` na krawędziach (np. direction enum, forbiddenRotAngleRad, corridorWidthM).
- Być deterministyczny (ten sam input → identyczny output).
- Udostępniać tryb CLI (MVP) oraz MAY udostępniać HTTP (po MVP).

Map Compiler **SHOULD**:
- Dostarczać testy regresji (golden files) dla map.


#### 3.4.7 Proxy/Recorder
Proxy/Recorder **MUST**:
- Być niezależną aplikacją (dev tool).
- Umożliwiać ustawienie:
  - listenHost/listenPort,
  - upstreamHost/upstreamPort,
  - format zapisu (np. PCAP-like lub JSONL z hex dump),
  - katalogu docelowego.
- Nie modyfikować payloadów (transparent proxy), chyba że tryb „inspect only”.

Proxy/Recorder **SHOULD**:
- Oznaczać pliki capture metadanymi: timestamp, adresy, porty, nazwa robota.


---



## 4. Repozytorium i podział na projekty

### 4.1 Proponowany monorepo layout
Repozytorium **SHOULD** być monorepo (łatwiej refactorować domenę i kontrakty), ale moduły MUSZĄ mieć czyste granice.

Proponowana struktura:

- `apps/`
  - `fleet-core/`
  - `fleet-gateway/`
  - `roboshop-bridge/`
  - `map-compiler/`
  - `proxy-recorder/`
  - `ui/` (frontend)
  - `robokit-sim/` (dev)
- `packages/`
  - `domain/` (czysty model domeny + state machine)
  - `contracts/` (kanoniczne kontrakty danych + przykłady JSON5)
  - `sdk-core/` (klient TS/JS do Fleet Core API — opcjonalnie, ale pomaga AI i ludziom)
  - `sdk-gateway/` (klient do Fleet Gateway API)
  - `testing/` (fixtures, harnessy, golden tests)
- `docs/`
  - `architecture/` (ten dokument)
  - `adr/` (Architecture Decision Records)
  - `runbook/`
- `data/` (tylko lokalnie / w runtime, nie w repo)
  - `eventlog/`
  - `snapshots/`
  - `scenes/`
  - `captures/` (proxy/recorder)

### 4.2 Wersjonowanie kontraktów
- `contracts/` **MUST** mieć `contractsVersion` (np. `2026-01-06.1`).
- Każdy payload publiczny **MUST** zawierać `schemaVersion` (dla klienta).
- Breaking change w kontrakcie **MUST** skutkować nowym `/api/v{n+1}` (nie „cichą” zmianą).

---



## 13. Testy (piramida + równoległość)

### 13.1 Piramida testów (MUST)
Projekt **MUST** mieć piramidę testów:

1. **Unit tests (najwięcej)** — domena:
   - state machine tasków/robotów,
   - walidacja scen,
   - event log append/replay,
   - deterministyczne ticki.

2. **Integration tests** — adaptery:
   - Fleet Core ↔ Fleet Gateway (HTTP),
   - Gateway ↔ Robokit-Sim (RoboCore TCP),
   - Map Compiler (graph.json → compiled graph).

3. **Contract tests**:
   - testy zgodności przykładów JSON5 z parserami/validatorami,
   - testy „golden payloads” dla SSE.

4. **E2E tests (najmniej)**:
   - uruchomienie całego systemu w docker compose,
   - scenariusze (sekcja 14).

### 13.2 Równoległość testów
Testy **SHOULD** być zaprojektowane tak, aby mogły działać równolegle:
- brak globalnego stanu,
- izolowane katalogi `data/` per test,
- losowe porty,
- brak zależności od czasu rzeczywistego (time mocking w domenie).

---



## 14. Scenariusze (end-to-end)

### 14.1 Headless start + podgląd z wielu UI
1. Uruchom Fleet Core + Fleet Gateway bez UI.
2. Wgraj scenę (`/scenes/.../activate`).
3. UI-A łączy się do `/events/stream` i renderuje.
4. UI-B łączy się do `/events/stream` i renderuje.
5. UI-A wykonuje `seize control` → dostaje lease.
6. UI-B próbuje wykonać mutację → dostaje `CONTROL_LEASE_REQUIRED`.

### 14.2 Symulacja multi-robot + kolizje
1. Scena ma 3 roboty `internalSim`.
2. Start mode = running.
3. System generuje taski, roboty jadą.
4. Wymuś konflikt (wąski korytarz) → jeden robot dostaje hold, drugi jedzie.
5. Wymuś kolizję w symulatorze → oba roboty w `emergencyStop` / `fault` i event.

### 14.3 Switch jednego robota na robokit-sim
1. Robot RB-01 jest internalSim, jest paused.
2. Operator `POST /robots/RB-01/provider` na `robokitSim`.
3. System łączy się do robokit-sim, robi relocate.
4. Robot kontynuuje task.

### 14.4 Scene switch podczas działania
1. System running.
2. Operator aktywuje nową scenę.
3. System: STOP roboty, cancel taski, clear locks, swap scene, snapshot, resume/paused.

---



## 15. MVP (dokładna definicja)

### 15.1 MVP MUST zawierać
1. Fleet Core:
   - `/health`, `/state`, `/events/stream`
   - Control Lease (seize/renew/release) i egzekwowanie na mutacjach
   - Sceny: list/get/validate/activate
   - Event log + snapshoty na dysk + replay na starcie
   - Minimalny runtime: roboty + worksites + taski + streamy (nawet jeśli streamy są proste)
   - Integracja algorytmu przez `AlgorithmInputSnapshot` → `AlgorithmDecision` (plugin w tym samym procesie)
2. Fleet Gateway:
   - `connect/disconnect`
   - `state` (polling) i `commands` (goPoint/stop/cancel/reloc)
   - Provider `robokitSim` i `robokitReal` przez RoboCore framing
3. InternalSim:
   - multi-robot, prosta fizyka, detekcja kolizji
4. Robokit-Sim:
   - możliwość uruchomienia co najmniej jednej instancji do testów gateway
5. UI:
   - podgląd mapy + robotów + worksites + tasków
   - acquire/release control lease
   - aktywacja sceny
   - pauza/stop robota
6. Narzędzia:
   - minimalne logi i pliki capture (opcjonalnie proxy, ale core MUST logować na dysk)

### 15.2 MVP MUST NOT zawierać (świadomie)
- Security (auth/roles) poza minimalnym control lease.
- Zaawansowane obstacle avoidance.
- Message bus / gRPC.

### 15.3 Kryteria akceptacji MVP (testowalne)
- System uruchamia się headless i działa bez UI.
- Dwie instancje UI mogą jednocześnie obserwować ten sam runtime.
- Tylko jedna instancja UI ma prawo do mutacji (lease).
- Scene activation jest atomowa (preflight + swap) i generuje eventy + snapshot na dysk.
- Można uruchomić 3 roboty w internalSim i wykonać ruch po mapie.
- Można przełączyć RB-01 z internalSim na robokit-sim podczas pauzy i kontynuować.
- Po ubiciu procesu Fleet Core i ponownym uruchomieniu:
  - stan jest odtworzony z snapshot+eventlog,
  - `/events/stream` działa z poprawnym `cursor`.

---



## 16. Ryzyka i pułapki (wybrane)

1. **Niejasności w zewnętrznych protokołach (RoboCore/Robokit)**  
   Mitigacja: reverse engineering + proxy/recorder + tolerant parser + kontrakty minimalne.

2. **Błędy jednostek (deg vs rad)**  
   Mitigacja: kanon = rad; Map Compiler konwertuje; walidacje (np. odrzucaj |angle|>10 rad jako podejrzane).

3. **Konflikty w multi-UI**  
   Mitigacja: Control Lease + idempotencja + event log.

4. **Disk full / IO errors**  
   Mitigacja: tryb degraded + fail-safe STOP + odrzucanie mutacji.

5. **Niedeterministyczne ticki algorytmu**  
   Mitigacja: deterministyczny snapshot, stała kolejność list, seed, replay.

---



## Dodatek A — Roboshop Bridge (interfejsy i formaty)

> Ten dodatek opisuje **naszą** warstwę integracyjną. Konkretny protokół Roboshop/RDS jest zewnętrzny i będzie doprecyzowany po reverse engineeringu.

### A.1 Cel
Roboshop Bridge służy do:
- pobrania (lub przyjęcia) danych z Roboshop/RDS,
- normalizacji i konwersji jednostek,
- wygenerowania **kanonicznego pakietu sceny** importowanego do Fleet Core.

### A.2 Model danych wejściowych (zewnętrzny)
Wersja MVP zakłada, że wejście do bridge to zestaw plików (export z Roboshop), np.:
- `graph.json` (mapa),
- `worksites.json` (lub lista miejsc załadunku/rozładunku),
- `streams.json` (opcjonalnie),
- `robots.json` (opcjonalnie),
- `meta.json` (informacje o jednostkach, mapId, itp.).

Bridge **MUST** zachować „raw” pliki wejściowe w polu `SceneManifest.source` oraz opcjonalnie w katalogu audytu.

### A.3 Wyjście: kanoniczny pakiet sceny (dla Core)
Pakiet sceny (folder lub zip) **MUST** mieć strukturę:

- `manifest.json`  (SceneManifest)
- `graph.json`     (SceneGraph, kanoniczny; z `propsCompiled`)
- `worksites.json`
- `streams.json`
- `robots.json`
- `algorithm.json`

Uwagi:
- `manifest.json.files` **MUST** wskazywać dokładnie te nazwy.
- `manifest.json.hashes` **MUST** zawierać sha256 każdego pliku.

### A.4 Bridge API (opcjonalne, HTTP; poza ścisłym MVP)
Jeśli bridge działa jako serwis, to minimalne endpointy mogą wyglądać tak:

#### `POST /bridge/v1/scenes/compile`
Request (multipart):
- `graph` = plik `graph.json`
- `meta` = JSON (np. units)

Response:
- zip z paczką sceny (do importu w Core)

> To jest celowo proste: Bridge nie „aktywizuje” sceny — to robi Core.

---



## Dodatek B — Map Compiler (deterministyczna kompilacja mapy)

### B.1 Cel
Map Compiler normalizuje mapę do kanonu oraz generuje pola pochodne potrzebne runtime/algorytmowi.

### B.2 Wejście
- `graph.json` (zewnętrzny, np. z Roboshop) — jak w przykładzie w sekcji 5.5.2.
- metadane jednostek, jeśli wejście nie jest w metrach/radianach.

### B.3 Wyjście
- `graph.json` (kanoniczny) z:
  - `meta.compiled` (schemaVersion, compiledTsMs, sourceGraphSha256, mapFrameId),
  - `edge.propsCompiled` (direction enum, forbiddenRotAngleRad, corridorWidthM).

### B.4 Reguły konwersji (MUST)
- `direction` (external, numeric) → `propsCompiled.direction`:
  - 0 → `bidirectional`
  - 1 → `forwardOnly`   (start → end)
  - 2 lub -1 → `reverseOnly` (end → start)
- `forbiddenRotAngle` (external) → `forbiddenRotAngleRad`:
  - jeśli `SceneManifest.source.originalUnits.angle == "deg"`: konwersja deg→rad
  - jeśli `"rad"`: kopia
- `width` (external) → `corridorWidthM`:
  - w MVP przyjmujemy, że `width` jest w metrach; jeśli to zostanie obalone w RE, dodajemy konwersję.

### B.5 Determinizm
Map Compiler **MUST**:
- sortować listy deterministycznie (po `id`),
- generować `mapFrameId` w sposób deterministyczny (np. hash wejścia + wersja kompilatora),
- mieć testy golden files.

### B.6 CLI (MVP)
Przykład:
```bash
map-compiler compile   --input ./input/graph.json   --output ./scene_wh_01/graph.json   --source-angle-units deg   --source-length-units m
```

---



## Dodatek C — Proxy/Recorder (dev tool)

### C.1 Cel
Proxy/Recorder służy do reverse engineeringu i debugowania:
- podsłuchu RoboCore TCP,
- podsłuchu HTTP (Roboshop/RDS).

### C.2 TCP proxy (RoboCore)
Wymagania:
- transparentny forwarding bajtów (MUST NOT modyfikować),
- zapis kierunku (client→server / server→client),
- timestamp per chunk.

Format zapisu (MVP, propozycja JSONL):
```json5
{
  tsMs: 1736160000123,
  protocol: "tcp",
  name: "robocore",
  direction: "c2s",
  local: "0.0.0.0:30000",
  remote: "10.0.0.20:19206",
  bytesHex: "5a01000100000014...."
}
```

Proxy **SHOULD** (dev):
- umieć dekodować ramki RoboCore do czytelnego „view” obok hex (bez zmiany danych).

### C.3 HTTP proxy
Analogicznie:
- zapis request/response,
- body (z limitem rozmiaru),
- nagłówki.

---




## 17. Rzeczy usunięte / zmienione
- (Jeśli coś z v0.2 ma zniknąć, trafia tutaj. W v0.3 głównie doprecyzowano i uporządkowano; nic krytycznego nie wyrzucono.)
