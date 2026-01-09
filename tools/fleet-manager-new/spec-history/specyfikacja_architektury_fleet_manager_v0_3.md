# Fleet Manager 2.0 — Specyfikacja architektury (v0.3)

**Data:** 2026-01-06  
**Status:** Draft (docelowo: „baseline” do implementacji MVP)  
**Zakres:** architektura całego systemu Fleet Manager (frontend + backend + integracje + symulacje + narzędzia dev).  
**Uwaga:** szczegóły algorytmu ruchu/scheduling są w osobnym dokumencie; tutaj opisujemy **kontrakt integracyjny** algorytmu z resztą systemu (wejścia/wyjścia), żeby implementacja była możliwa.

---

## Część 1 — Prompt

### Prompt pierwotny (kontekst)

```text
zallaczam projekt fleet managera, zapoznaj sie z nim i z dokumentacja. fleet manager to program do zarzadania autonomicznymi wozkami widlowymi. ten program nie dziala zbyt dobrze i chcialbym go przepisac. ale podoba mi sie ui. chodzi mi o to, zeby przygotowac konspekt dokumentu specyfikacji calego projektu. projekt powienien byc bardzo modulowy tak, zeby mozna byo pracowac nad czesciami niezaleznie, porozumiewajac sie przez api. dzieki temu bedzie mogla nad tym efektywnie pracowac sztuczna inteligencja. proponuje takie moduly: interfejs uzytkownika, czyli frontend, ktory zajmuje sie wyswietlaniem mapy razem z wozkami i interakcja z uzytkownikiem. oraz da uzytkownikowi wglada jakie sa wozki, jaki jest stan pol odkladczych / odbiorczych. jakie sa zdefiniowane strumienie. jakie zadania wykonuja wozki. we frontendzie powinien byc kod potrzebny do obslugi interakcji z uzytkownikiem. jednak system powinien dzilac w zupelnisci bez wlaczonego frontendu. co wiecej powinno byc mozliwe kilka forntendow jednoczesnie. patrzacych na ten sam projekt. no tego powinien byc silnik nawigacyjny. ten silnik powinien wczytywac konfiguracje, zarzadac wozkami autonomicznymi. w tym silniku powinna byc mozliwosc wyboru algorytmu zarzadaania tymi wozkami. algorytm bedzie opracowanay w oddziwlnej specyfikacji. dodatkowo powinna byc mozliwosc dynamiczej zmiany mapy i konfiguracji. taka mapa z konfiguracja nazywamy scena. frontend powinine byc interfejsem do tego silnika. innym interfejscem powinien byc interfejs do roboshopa. czyli aplikacji zewnetrznej, ktora moze podgrywac mape. ale byc moze, zeby archtektura byla czytelniejsza to silnik powinien byec tylko api restowe. a ten interfejs do roboshopa powininen byc oddzialna aplikacja. do tego silnik powinien komunikowac sie z wozkami autonomicznymi. do tego tez jest interfejs robocore. jednak byc moze zarzadzaniem wozkami rowniez powinien zajmowac sie oddzielny program. i silnik z samym zarzadca wozkow, czyli same komendy tez powinny byc po rest api. a moze to nie jest dobry pomysl i lepiej zeby sillnik od razu korzystal z api roboshop? tak czy siek w silniku powinna byc mozliwosc symulacji robotow. i to by byla symulacja wewnetrzna. symulator powinein uwzgledniac wiele wozkow i mozliwe kolizja pomiedzy nimi. dodatkowo powinine byc symulator, korzystajacy z tych samych algorytmow symulacji robota, w sensie korzystajacy z api robokit. tak, zeby mozna byl przetestowac rozwiazania bez prawdziwego robota. no i na koniec powinna byc moliwosc przellaczenia na prawdziwego robota. to wszystko powinno mie elegancki design. latwy, prosty czytelny. latwy do zrozumienia i do pracy z AI. interfejsy powinny byc bardzo ladnie zrokumenowane. dodatkowo, warto zaznaczyc, ze robot powinien byc sterowany takim rolling target pointem. chodzi o to, zeby robot fizyczny dostawal cel ajko punkt odlegly przynajmniej o x metrow wzdluz trasy, ktora ma planner. robot ma swoja mape i planuje sobie lokalna trase. docelowo, wozek robot bedzie mogl zajmowac sie lokalnym omijaniem przezkod, to bedzie mozliwe, gdy bedzie mogl lokalnie planowac trase. jednak to dopiero w kolejnym kroku. oczywiscie omijanie przeszkod bedzie mozliwe tylko w niektorych miejscach mapy / grafu, tam gdzie szerokosc width jest ustawiona > 0. wiec na poczatek mozemy to pominac i zrobic algorytm, ktory zaklada ze nie ma omijania przeszkod. jedyne co musimy zapewnic to to, ze wiemy, ze wozek sie zablokowal oraz ze bedzie chcial wejsc w tryb omijania przezkod. ale wracajac do architektury, mamy jeszcze dodatkowa rzecz. to bedzie proxy pomiedzy programem roboshop do zarzadzania a fizycznym roboetem, zeby mozna bylo podsluchac protokoly. no i proxy pomiedzy roboshopem a rds'em czyli innym gotowym fleet managerem, gdzie przez roboshop mozna podgrywac mapy i robic konfiguracje. no ale to proxy to troche takie niezaezne oprogramowanie, ktore tylko powinno miec ustawienia co one podsluchuje, na ktorych portach i jakie sa adresy, oraz gdzie zapisuje, tak, zeby mozna bylo wygodnie podsluchiwac kompunikacj ep poiedzy roboshopem a roznymi robotami - w celu developmentu. no i tak, w tym domumencie bardzij chodzi mi o to, zeby opracowac overview calej architektury rozwiazania. ajkaie wszystkei proprojekty, jak powinein byc konfigurowany kazdy projekt. jakie dane. jak mozn a dynamicznie konfigurowac. jak zrobic zeby symulatoer wewnetrzny mial kilka robotow. ale rowniezm zeby w trakcie symulacji mozna bylo przelaczac jednego z robotow w projekcie na symulowanego przez protokol robocore, lub na prawdziwego robota. wszelkie interfejsy, wszystko co bedzie potrzebne do przyszlej implementacji. wszystko eleganckie, proste, odporne na bledy i na przerywy w komunikacji sieciowej. bedenralnie bardzo profesjonalne i bardzo wysokiej jakosci. przygotuj pierwsza wersje takiej specyfikacji, najbardziej obszerna jak sie da. opisz rowniez potencjalne pulapki, co sie moze nie udac, jakie sa ryzyka i jak je rozwiazac. gdybys mial inne propozycje to tez napisz. a moze tez zidentyfikowales jakis komponent. zastanow sie i przeslij bardoz obszerny dokument ajko odpowiedz
```

### Prompt do wersji v0.3 (ten, na podstawie którego powstał dokument)

```text
przygotuj nowa wersje dokumentu specyfikacja architektury.
uwzglednij wszystkie uwagi z recenzji dokumentu architektury.

wez pod uwazge moje uwagi
- tak, zrob wszedzi pola en
- gdzie sie da warto dac angle zamiast theta
- protokolow robokit nie ruszaj, bo to zewnetrzne
- tak, koniecznie daj data contracts, struktury danych
- tak, dookresl, ze dana instancja ui przejmuje kontrole i wywlaszcza reszte (robi seize control)
- slusznie - uprzadkuj api core vs gateway
- graph.json przeciez zalaczylem w poprzednich postach
- bledy robocore / robokit - to specyfikacja zewnetrzna, jeszcze doprecyzujemy po reverse engineeringu
- apropos "co najmniej w buforze w pamięci; najlepiej także na dysk" - zgadzam sie wszedzie doprecyzujmy. w tym wypadku na dysk
- scene activation - zgadza sie, trzeba wyraznie i jasno powiedziec co sie dzieje gdy przelaczamy scene
- dodajmy wszedzie kontrakty api i przyklady
- security - na razie poza MVP
- dokladnie wyspecyfikuj MVP
- tak, doprecyzujmy, ze korzystamy wszedzie camel case, oczywiscie zewnetrznych protokolow nie ruszamy
- czyli tak, na przyklad oryginal mapy moze miec inne jednostki, my dokonujemy konwersji
- tak, dodajmy kody przyczyn
- doprecyzujmy wszystko co tylko mozlilwe
- opisz wszytski co jest niezbedne do mvp, zeby zaimplementowac razem z pierwsza wersja algorytmu
- tak, zrob zeby bylo bardziej spec nie opis

z najwazniejszych rzeczy to
- doprecyzowac kontrakty danych, zeby byly kompletne
- doprecyzowac protokoly, zeby byly kompletne
```

---

## Część 2 — Specyfikacja architektury

## 0. Zmiany w v0.3 względem v0.2

Ta wersja:
- **Urealnia i normatywizuje** wymagania (MUST/SHOULD/MAY/MUST NOT).
- Rozdziela **Fleet Core API (publiczne)** vs **Fleet Gateway API (wewnętrzne)**: osobne basePath, osobne porty/serwisy.
- Wprowadza **Control Lease (seize control)**: jedna instancja UI może wykonywać operacje mutujące; pozostałe są w trybie „viewer”.
- Doprecyzowuje **Scene Activation** (transakcja, rollback, wpływ na taski/roboty/locki/streamy).
- Doprecyzowuje **kontrakty danych** (Data Contracts) i API, preferując **czytelne przykłady JSON5 z komentarzami**.
- Wprowadza jawne **kody przyczyn (reason codes)** w statusach i błędach.
- Doprecyzowuje logowanie: **event log + snapshoty MUSZĄ być zapisywane na dysk** (z polityką degradacji gdy dysk padnie).
- Koryguje i doprecyzowuje **RoboCore framing** (na bazie reverse engineeringu kodu) oraz opisuje minimalny zestaw ramek „jedź do / stop / status”.
- Dokładnie definiuje **MVP** (zakres + kryteria akceptacji).

---

## 1. Słownik normatywny i konwencje

### 1.1 Normatywne słowa kluczowe
Wymagania w tym dokumencie używają słów:
- **MUST / MUST NOT** — wymaganie twarde.
- **SHOULD / SHOULD NOT** — mocna rekomendacja (odstępstwo wymaga uzasadnienia).
- **MAY** — opcjonalne.

### 1.2 Konwencje techniczne

#### 1.2.1 Jednostki
- Wszystkie odległości i współrzędne w kanonicznych kontraktach **MUST** być w **metrach**.
- Wszystkie kąty w kanonicznych kontraktach **MUST** być w **radianach**.
- Wszystkie prędkości liniowe **MUST** być w m/s.
- Wszystkie prędkości kątowe **MUST** być w rad/s.
- Jeżeli źródłowy format mapy/robota używa innych jednostek, system **MUST** wykonać konwersję w module integracyjnym (Map Compiler / Adapter), a w danych sceny **MUST** zachować metadane o źródłowych jednostkach.
- Układ współrzędnych kanoniczny (2D) **MUST** być:
  - o osi `x` rosnącej w prawo,
  - o osi `y` rosnącej do góry (kartezjański, „math coords”),
  - z `angle=0` wzdłuż osi +x,
  - z dodatnim kątem jako obrót przeciwnie do ruchu wskazówek zegara (CCW).

#### 1.2.2 Nazewnictwo, język, format
- Wszystkie nazwy pól w API Fleet Core i Fleet Gateway **MUST** być w **języku angielskim** i w **camelCase**.
- Wszystkie wartości typu enum (statusy, typy, reason codes) w kanonicznych kontraktach **MUST** być w **języku angielskim**.
- Zewnętrzne protokoły/formaty (np. RoboCore/Robokit, Roboshop) **MUST NOT** być „poprawiane” — adaptery tłumaczą je na kanon.
- W dokumentacji kontraktów **MUST** podawać przykłady payloadów w JSON5 (z komentarzami), a nie tylko suche schematy.

#### 1.2.3 Czas i identyfikatory
- `tsMs` oznacza Unix epoch w milisekundach (`int64`).
- `ts` oznacza ISO-8601 w UTC i **MAY** być dodawane równolegle (czytelność w logach).
- `id` / `...Id` **MUST** być stabilnymi stringami (bez semantyki w środku, poza prefiksem typu dla czytelności).
- `cursor` (dla streamów eventów) **MUST** być monotonicznym `int64`, globalnym dla instancji Fleet Core, oraz **MUST** być utrwalany na dysk (nie resetuje się przy restarcie, jeśli zachowałeś katalog danych).

#### 1.2.4 Zasady walidacji (anti-footgun)
- Serwer **MUST** odrzucać (HTTP 400) requesty z **nieznanymi polami** w body (żeby błędy nie przechodziły po cichu).
- Klient **MUST** ignorować nieznane pola w odpowiedziach (żeby system był future-proof).
- Każdy endpoint mutujący **MUST** wspierać idempotencję poprzez `X-Client-Id` + `X-Request-Id`.

---

## 2. Cel systemu i najważniejsze wymagania

### 2.1 Cel
Fleet Manager to system do zarządzania flotą autonomicznych wózków widłowych:
- w trybie headless (bez UI),
- z możliwością wielu UI równolegle (obserwacja),
- z możliwością sterowania robotami symulowanymi i realnymi,
- ze spójną definicją „Sceny” (mapa + konfiguracja),
- z możliwością dynamicznej zmiany sceny,
- z odpornością na awarie sieci i komponentów,
- z kompletną obserwowalnością (logi + snapshoty) umożliwiającą odtworzenie incydentów.

### 2.2 Wymagania nadrzędne
1. System **MUST** działać bez UI (UI jest klientem).
2. System **MUST** pozwalać na wiele UI jednocześnie, patrzących na ten sam runtime, ale tylko jedno UI może mieć prawa „operatora” naraz (Control Lease).
3. System **MUST** obsługiwać roboty jako:
   - symulacja wewnętrzna (multi-robot, kolizje),
   - roboty przez protokół RoboCore (Robokit-sim),
   - roboty fizyczne (RoboCore).
4. System **MUST** umożliwiać przełączenie providera dla pojedynczego robota w trakcie działania (z procedurą synchronizacji i fail-safe).
5. Interfejsy **MUST** być dobrze udokumentowane, deterministyczne i odporne na przerwy w komunikacji.
6. System **MUST** zapisywać na dysk: event log + periodyczne snapshoty stanu + metadane wymagane do replay/debug.
7. Wszystkie interfejsy między usługami **MUST** używać HTTP (REST + SSE jako „HTTP streaming”).
8. Security (auth, role, TLS end-to-end) jest **poza MVP**; jednak podstawy bezpiecznego działania (failsafe STOP, watchdogi) **MUST** istnieć w MVP.

---

## 3. Architektura wysokopoziomowa

### 3.1 Zasada: domena oddzielona od integracji
- Logika domenowa (sceny, taski, rezerwacje, dispatcher, event log) żyje w **Fleet Core**.
- Integracje z zewnętrznym światem (RoboCore/Robokit, Roboshop, proxy, import map) żyją w adapterach: **Fleet Gateway**, **Roboshop Bridge**, **Map Compiler**, **Proxy/Recorder**.

**Fleet Core MUST NOT** zawierać kodu parsowania ramek RoboCore ani „drobnej” logiki sieciowej — to są adaptery.

### 3.2 Kontenery (procesy/usługi)

Minimalny zestaw usług (deployowalne osobno; w dev mogą działać w jednym „bundle”):

1. **Fleet Core** (HTTP, SSE)
   - publiczne API dla UI/CLI
   - event log + snapshoty
   - uruchamianie algorytmu (plugin)
   - zarządzanie sceną, taskami, worksites, streamami
   - sterowanie robotami przez Fleet Gateway (HTTP)

2. **Fleet Gateway** (HTTP)
   - wewnętrzne API dla Fleet Core (nie dla UI)
   - adaptery providerów: internalSim/robokitSim/robokitReal
   - komunikacja z RoboCore (TCP) po stronie gateway (a nie core)

3. **Roboshop Bridge** (HTTP)
   - import/eksport scen (mapa+konfig)
   - reverse engineering / kompatybilność z istniejącymi pipeline’ami

4. **Map Compiler** (CLI/HTTP)
   - konwersja wejściowych map (np. `graph.json`) do kanonicznej sceny/mapy (z metadanymi, wersją, konfliktami jeśli potrzebne)
   - testy regresji mapy

5. **Robokit-Sim** (dev/test)
   - symulator RoboCore (może być wiele instancji)

6. **Proxy/Recorder** (dev)
   - proxy TCP (RoboCore) i HTTP (Roboshop/RDS) do podsłuchu i zapisu ruchu.

7. **UI Frontend** (web)
   - renderuje mapę, roboty, worksites, streamy, taski
   - obsługuje interakcję człowieka
   - łączy się wyłącznie z Fleet Core.

### 3.3 Kto z kim rozmawia (kontrakt)
- UI → Fleet Core: HTTP + SSE (public).
- Fleet Core → Fleet Gateway: HTTP (private).
- Fleet Gateway → RoboCore/Robokit: TCP (external).
- Roboshop Bridge ↔ Roboshop/RDS: HTTP (external).
- Proxy/Recorder ↔ (Roboshop / RDS / RoboCore): HTTP/TCP (external).

### 3.4 Specyfikacja komponentów (szczegółowo)

Poniżej jest normatywny opis komponentów, żeby granice odpowiedzialności były jednoznaczne.

#### 3.4.1 Fleet Core (domena + publiczne API)
Fleet Core **MUST**:
- Być **źródłem prawdy** dla stanu systemu (scene + runtime).
- Udostępniać publiczne API `/api/v1/**` dla UI/CLI oraz SSE `/api/v1/events/stream`.
- Wykonywać walidację danych wejściowych (sceny, mutacje) i zwracać spójne `ErrorEnvelope`.
- Utrzymywać **event log na dysku** i **snapshoty na dysku** oraz umożliwiać replay po restarcie.
- Uruchamiać algorytm jako plugin (w tym samym procesie w MVP) i wykonywać ticki w stałym rytmie.
- Pełnić rolę **dispatchera**: tłumaczyć decyzje algorytmu na kanoniczne komendy do robotów i wysyłać je do Fleet Gateway.
- Egzekwować **Control Lease** (seize control): jedna instancja operatora naraz.

Fleet Core **MUST NOT**:
- Łączyć się bezpośrednio z robotami po TCP.
- Zawierać parsera ramek RoboCore/Robokit.
- Zawierać logiki importu Roboshop (to Bridge/Compiler).

Fleet Core **SHOULD**:
- Mieć tryb `paused` jako domyślny po aktywacji sceny (MVP bezpieczniej).
- Mieć mechanizm „safe pause” i „failsafe stop” przy utracie telemetrii.

Wymagania awaryjne:
- Jeśli Gateway jest niedostępny lub robot znika: Fleet Core **MUST** oznaczyć robota jako `offline` oraz wstrzymać komendy (i/lub anulować taski zgodnie z polityką).
- Jeśli telemetria jest starsza niż `statusAgeMaxMs` (konfig), Fleet Core **MUST** przejść dla danego robota w `blocked/isBlocked=true` z reason `BLOCKED_PROVIDER_ERROR` lub `BLOCKED_UNKNOWN` i wyemitować event.

#### 3.4.2 Fleet Gateway (integracja robotów)
Fleet Gateway **MUST**:
- Udostępniać API `/gateway/v1/**` dla Fleet Core.
- Implementować providery robotów (`internalSim`, `robokitSim`, `robokitReal`).
- Deduplikować komendy po `commandId` oraz zwracać jednoznaczny `gatewayStatus`.
- Stosować timeouts i retry przy komunikacji z robotami.
- Udostępniać stan połączenia (`connected/connecting/disconnected/error`) i `lastSeenTsMs`.

Fleet Gateway **MUST NOT**:
- Przyjmować mutacji od UI (UI nie zna gateway).
- Zawierać logiki algorytmu flotowego.

Fleet Gateway **SHOULD**:
- Zapewnić możliwość pollingu statusów oraz (MAY) wsparcie push/stream, jeśli robot dostarcza push.
- Rejestrować (MAY, w dev) surowe ramki RoboCore do plików capture, ale nie zastępuje to Proxy/Recorder.

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

#### 3.4.6 Internal Simulator (provider)
InternalSim **MUST**:
- Symulować wiele robotów równolegle.
- Uwzględniać możliwość kolizji (co najmniej prosty model: okręgi/footprint).
- Implementować minimalne komendy: `goPoint`, `stop`, `reloc`, `pause`, `resume`.
- Publikować statusy w tej samej postaci kanonicznej co realne roboty (Pose2D, Velocity2D, blocked/mode).
- Być sterowany przez Fleet Core poprzez ten sam kontrakt providerów (nie „specjalny przypadek” w algorytmie).

InternalSim **SHOULD**:
- Umożliwiać ustawienie `simSpeed` (np. 0.5x/1x/5x) i „step mode” (debug).

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

## 5. Kontrakty danych (Data Contracts)

Ta sekcja jest „kanonem” danych.  
Każda usługa **MUST** używać tych struktur (lub ich podzbioru), a adaptery zewnętrzne **MUST** mapować zewnętrzne formaty do tych struktur.

> Uwaga o stylu: przykłady są w JSON5 (komentarze `//`) i stanowią „czytelną specyfikację”.

### 5.1 Primitives

#### 5.1.1 `Pose2D`
```json5
{
  // Pozycja w układzie współrzędnych mapy/sceny (metry)
  x: 12.345,
  y: -6.789,

  // Orientacja (radiany), zakres zalecany: [-pi, +pi]
  angle: 1.57079632679
}
```

Wymagania:
- `x`, `y` **MUST** być liczbami skończonymi.
- `angle` **MUST** być liczbą skończoną w radianach.

#### 5.1.2 `Velocity2D`
```json5
{
  // m/s
  vx: 0.5,
  vy: 0.0,

  // rad/s
  w: 0.1
}
```

#### 5.1.3 `TimeWindow`
```json5
{
  // cursor/event time lub wall-clock; system używa tsMs jako kanoniczne
  startTsMs: 1736160000000,
  endTsMs: 1736160005000
}
```

### 5.2 Error Envelope (wspólny dla API)

```json5
{
  error: {
    // Stabilny kod (en, UPPER_SNAKE)
    code: "SCENE_NOT_FOUND",

    // Krótki opis dla człowieka (en)
    message: "Scene 'scene_wh_01' not found",

    // Czy klient może spróbować ponownie (np. transient network)
    retryable: false,

    // Opcjonalne dane diagnostyczne (nie dla UI-prod, ale w MVP OK)
    details: {
      sceneId: "scene_wh_01"
    },

    // Korelacja logów
    requestId: "req_01JH1B3E7YQ4GZK7M6Z7ZV7R3N"
  }
}
```

Wymagania:
- Każda odpowiedź błędu **MUST** mieć `error.code` + `error.message` + `error.retryable` + `error.requestId`.
- `error.code` **MUST** być stabilny i nie zależeć od tekstu.
- Lista kodów błędów jest w sekcji 12 (Reason codes).

### 5.3 Event Envelope (dla SSE i event log)

```json5
{
  // Monotoniczny identyfikator zdarzenia (int64)
  cursor: 102345,

  // Czas zapisu zdarzenia
  tsMs: 1736160000123,

  // Typ zdarzenia (en, camelCase)
  type: "robotPoseUpdated",

  // Wersja schematu payloadu eventu (nie mylić z API v1)
  schemaVersion: "event-2026-01-06.1",

  // Payload specyficzny dla typu
  payload: {
    robotId: "RB-01",
    pose: { x: 1.2, y: 3.4, angle: 0.1 }
  }
}
```

Wymagania:
- Event stream **MUST** być at-least-once: eventy mogą się powtórzyć po reconnect.
- Klient **MUST** być idempotentny względem `cursor`.
- Fleet Core **MUST** zapisywać identyczny envelope do event log na dysku.

### 5.4 Control Lease (seize control)

#### 5.4.1 `ControlLease`
```json5
{
  leaseId: "lease_01JH1B4A5B7XQ0T9Y9J0C0Z0AA",
  ownerClientId: "ui-traffic-lab-01",
  ownerLabel: "TrafficLab UI @ workstation-3",

  // czas w ms
  acquiredTsMs: 1736160000000,
  expiresTsMs: 1736160060000,

  // Czy lease jest „force seized” (dla audytu)
  force: false,

  // Opcjonalny powód, jeśli force=true
  reason: null
}
```

Wymagania:
- W danej chwili **MUST** istnieć co najwyżej jeden aktywny Control Lease.
- Lease **MUST** mieć TTL i wymagać odnawiania (renew).
- Wszystkie operacje mutujące (oprócz wybranych admin) **MUST** wymagać nagłówka `X-Control-Lease-Id` z aktualnym leaseId.
- UI bez lease **MUST** działać jako „viewer”: może czytać snapshoty i eventy, ale nie może mutować.

### 5.5 Scene (Scena)

Scena to „konfiguracja uruchomieniowa”: mapa + worksites + streamy + roboty + parametry algorytmu + integracje.

#### 5.5.1 `SceneManifest`
```json5
{
  sceneId: "scene_wh_01",
  name: "Warehouse 01",
  schemaVersion: "scene-2026-01-06.1",

  createdTsMs: 1736160000000,
  updatedTsMs: 1736160000000,

  // Dane o pochodzeniu (dla audytu i konwersji jednostek)
  source: {
    system: "roboshop",               // np. roboshop | rds | manual
    originalMapId: "map_abc123",
    originalUnits: {
      length: "m",                    // np. m | cm
      angle: "deg"                    // np. deg | rad
    }
  },

  // Kanoniczne jednostki wewnątrz Fleet Manager
  canonicalUnits: {
    length: "m",
    angle: "rad"
  },

  // Wskazanie plików sceny (w SceneStore)
  files: {
    graph: "graph.json",
    worksites: "worksites.json",
    streams: "streams.json",
    robots: "robots.json",
    algorithm: "algorithm.json"
  },

  // Hashy do walidacji spójności
  hashes: {
    graphSha256: "sha256:...",
    worksitesSha256: "sha256:...",
    streamsSha256: "sha256:...",
    robotsSha256: "sha256:...",
    algorithmSha256: "sha256:..."
  }
}
```

Wymagania:
- Scena **MUST** być wersjonowana (co najmniej poprzez `updatedTsMs` i hash).
- Fleet Core **MUST** walidować spójność sceny przed aktywacją.
- Zmiany sceny **MUST** przechodzić przez `Scene Activation` (sekcja 8).

#### 5.5.2 `SceneGraph` (kanoniczny graf mapy)

> **Ważne:** Poniższy kontrakt jest spójny z formatem `graph.json` (załączony plik) i z loaderami map w istniejącym projekcie. Zewnętrzne pola pozostają, ale Fleet Manager może dołożyć własne pola w sekcji `meta.compiled`.

```json5
{
  meta: {
    resolution: 0.02, // m/pixel (jeśli dotyczy); jeśli brak, MUST być null
    bounds: { minX: -200.0, minY: -100.0, maxX: 200.0, maxY: 100.0 },

    // Pole "compiled" jest tylko nasze (kanoniczne)
    compiled: {
      schemaVersion: "map-2026-01-06.1",
      compiledTsMs: 1736160000000,

      // Hash wejścia (dla regresji)
      sourceGraphSha256: "sha256:...",

      // Informacje pomocnicze do runtime
      // np. mapFrameId do walidacji, czy robot ma tę samą mapę
      mapFrameId: "mapframe_wh_01_v3"
    }
  },

  nodes: [
    {
      id: "AP7",
      className: "ActionPoint", // ActionPoint | LocationMark | ChargePoint | ParkPoint | ...
      pos: { x: -90.235, y: 49.971 },
      ignoreDir: false,
      props: {
        spin: true,
        prepoint: "", // opcjonalne
        recfile: ""   // opcjonalne
      }
    }
  ],

  edges: [
    {
      id: "edge_0",
      className: "DegenerateBezier",
      start: "AP7",
      end: "AP8",

      // Punkty krzywej (metry)
      startPos: { x: -90.235, y: 49.971 },
      endPos: { x: -85.000, y: 50.000 },
      controlPos1: { x: -88.0, y: 50.5 },
      controlPos2: { x: -86.0, y: 49.5 },

      props: {
        // Roboshop/RDS semantics: direction numeric (external)
        // 0 = both ways, 1 = start->end only, 2/-1 = end->start only
        direction: 0,

        // movestyle (external, jeśli występuje)
        movestyle: 0,

        // width w meterach (external; w praktyce bywa int)
        width: 4,

        // forbiddenRotAngle: w źródle często jest w stopniach; Map Compiler MUST konwertować do rad w polu compiled*
        forbiddenRotAngle: 90,

        // limity prędkości (external)
        maxspeed: 1,
        loadMaxSpeed: 1
      }
    }
  ],

  // Pola poniżej mogą istnieć jeśli mapę ładowano z .smap albo rozbudowanego graph.json
  lines: [],
  areas: [],
  bins: []
}
```

Wymagania:
- `pos`, `startPos`, `endPos`, `controlPos*` w kanonicznym grafie **MUST** być w metrach.
- Jeżeli `forbiddenRotAngle` w źródle jest w stopniach, Map Compiler **MUST** dodać znormalizowane pole:
  - `edge.propsCompiled.forbiddenRotAngleRad` (radiany),
  - oraz pozostawić oryginał w `edge.props.forbiddenRotAngle` (external).
- Map Compiler **MUST** zachować deterministyczność: ten sam input → ten sam output (hashy i identyfikatorów).

### 5.6 Roboty, providery, capabilities

#### 5.6.1 `RobotConfig`
```json5
{
  robotId: "RB-01",
  displayName: "Forklift 01",

  modelId: "robokit_fork_v1",

  // Domyślny provider po aktywacji sceny
  provider: {
    type: "internalSim", // internalSim | robokitSim | robokitReal
    // per-provider config:
    config: {
      // internalSim
      radiusM: 0.9,
      maxSpeedMps: 1.2
    }
  },

  // Właściwości fizyczne/kinematyczne dla algorytmu (MVP: minimalne)
  kinematics: {
    footprint: {
      // MVP: circle; future: polygon
      type: "circle",
      radiusM: 0.9
    },
    // odległość pivota od przodu/tyłu (metry) — przydaje się do safety envelope
    headOffsetM: 1.0,
    tailOffsetM: 0.8
  },

  // Co robot potrafi (ważne do future-proof)
  capabilities: {
    supportsGoPoint: true,
    supportsGoTarget: true,
    supportsStop: true,
    supportsReloc: true,
    supportsPush: true
  },

  // Parametry Rolling Target Point (RTP)
  rtp: {
    lookaheadM: 2.0,          // punkt docelowy co najmniej 2 m „do przodu” wzdłuż trasy
    updateHz: 5,              // jak często odświeżamy cel (jeśli jedzie)
    minDeltaM: 0.25,          // minimalna zmiana RTP, żeby wysłać nowy cel
    timeoutMs: 1500           // watchdog: brak aktualizacji → STOP/PAUSE
  }
}
```

Wymagania:
- `provider.type` **MUST** być jednym z `internalSim|robokitSim|robokitReal`.
- `capabilities` **MUST** być jawne (nie zgadujemy w runtime).
- RTP parametry **MUST** być konfigurowalne per robot.

#### 5.6.2 `RobotRuntimeState`
```json5
{
  robotId: "RB-01",

  // Kto „aktualnie dostarcza prawdę” o robocie
  provider: {
    type: "internalSim",
    status: "connected", // connected | connecting | disconnected | error
    lastSeenTsMs: 1736160000123,
    errorCode: null
  },

  pose: { x: 1.2, y: 3.4, angle: 0.1 },
  velocity: { vx: 0.0, vy: 0.0, w: 0.0 },

  // Stan logiczny z perspektywy Fleet Manager
  mode: "auto", // auto | paused | manual | emergencyStop | fault | offline
  blocked: {
    isBlocked: false,
    reasonCode: "NONE",  // BLOCKED_OBSTACLE | BLOCKED_TRAFFIC | BLOCKED_STUCK | ...
    details: null
  },

  // Progress po zaplanowanej trasie (dla algorytmu)
  routeProgress: {
    routeId: "route_01JH1B...",
    // s w metrach, wzdłuż polilinii
    sM: 12.34,
    // do jakiego segmentu przypięto robota (debug)
    segmentIndex: 7,
    // wiek danych telemetrii
    statusAgeMs: 120
  },

  // Aktywny task (jeśli jest)
  activeTaskId: "task_01JH1B...",
  activeCommandId: "cmd_01JH1B...", // ostatnia komenda ruchu / RTP
}
```

### 5.7 Worksites, strumienie, taski

#### 5.7.1 `Worksite`
```json5
{
  worksiteId: "DROP_01",
  type: "drop", // pick | drop | charge | park | custom
  displayName: "Drop 01",

  // powiązanie z mapą: zwykle nodeId, ale MAY być point
  location: {
    kind: "node", // node | point
    nodeId: "LM42",
    point: null
  },

  // stan runtime (nie scena)
  state: {
    occupancy: "empty", // empty | filled | unknown
    isBlocked: false,
    blockReasonCode: "NONE", // WORKSITE_BLOCKED_MANUAL | ...
    lastChangedTsMs: 1736160000000
  }
}
```

#### 5.7.2 `StreamDefinition`
```json5
{
  streamId: "stream_inbound_01",
  displayName: "Inbound pallets",

  enabled: true,

  // skąd -> dokąd
  fromWorksites: ["PICK_01", "PICK_02"],
  toWorksites: ["DROP_01", "DROP_02"],

  // generowanie zadań
  policy: {
    maxInFlightTasks: 10,
    // future: priorytety, SLA, batch
    priority: 100
  }
}
```

#### 5.7.3 `Task`
```json5
{
  taskId: "task_01JH1B...",
  createdTsMs: 1736160000000,

  streamId: "stream_inbound_01",

  // workflow (MVP: pick -> drop)
  kind: "pickDrop",

  // węzły / miejsca
  fromWorksiteId: "PICK_01",
  toWorksiteId: "DROP_01",

  // przydział
  assignedRobotId: "RB-01",

  status: "running", // queued | assigned | running | paused | completed | failed | canceled

  // reason codes dla statusu (gdy nie running)
  statusReasonCode: "NONE", // TASK_FAILED_ROBOT_OFFLINE | TASK_CANCELED_OPERATOR | ...

  // diagnostyka
  lastUpdatedTsMs: 1736160000123
}
```

### 5.8 Kontrakt integracyjny algorytmu (minimalny)

Ta część jest po to, żeby Fleet Core mógł uruchomić „Algorithm Plugin” bez wymyślania API na nowo.

#### 5.8.0 Lifecycle pluginu algorytmu (MUST)

Algorytm jest pluginem uruchamianym przez Fleet Core. Lifecycle jest dwuetapowy:

1. **On scene activation**: Fleet Core **MUST** przekazać algorytmowi statyczny kontekst sceny (`AlgorithmSceneContext`).
2. **On each tick**: Fleet Core **MUST** przekazać algorytmowi dynamiczny snapshot (`AlgorithmInputSnapshot`) oraz odebrać decyzję (`AlgorithmDecision`).

Motywacja:
- mapa i definicje worksites/streamów są statyczne w ramach sceny → nie ma sensu przesyłać ich co tick,
- snapshot tickowy jest mniejszy i deterministyczny.

`AlgorithmSceneContext` (przykład, JSON5):
```json5
{
  scene: {
    manifest: { /* SceneManifest */ },
    graph: { /* SceneGraph */ }
  },

  // Statyczne definicje (z plików sceny)
  worksites: [ /* Worksite[] (bez runtime state lub ze stanem początkowym) */ ],
  streams: [ /* StreamDefinition[] */ ],
  robots: [ /* RobotConfig[] */ ],

  // Konfiguracja algorytmu (z algorithm.json)
  algorithmConfig: {
    // zależne od wersji algorytmu; MUST być jawnie wersjonowane
    algorithmId: "dcl_v1",
    parameters: { }
  }
}
```

Wymagania:
- Fleet Core **MUST** traktować `AlgorithmSceneContext` jako immutable w ramach sceny.
- Algorytm **MUST NOT** modyfikować przekazanych obiektów (copy-on-write).
- Algorytm **SHOULD** być deterministyczny przy zadanym `seed` i wejściu (ważne dla replay).

#### 5.8.1 `AlgorithmInputSnapshot`
```json5
{
  tick: 12345,
  tsMs: 1736160000123,

  scene: {
    sceneId: "scene_wh_01",
    mapFrameId: "mapframe_wh_01_v3"
  },

  robots: [
    {
      robotId: "RB-01",
      pose: { x: 1.2, y: 3.4, angle: 0.1 },
      velocity: { vx: 0.2, vy: 0.0, w: 0.0 },
      mode: "auto",
      blocked: { isBlocked: false, reasonCode: "NONE", details: null },
      providerType: "internalSim",
      routeProgress: { routeId: "route_...", sM: 12.34, statusAgeMs: 120 }
    }
  ],

  worksites: [
    { worksiteId: "DROP_01", occupancy: "empty", isBlocked: false }
  ],

  // aktywne taski/streamy
  tasks: [
    { taskId: "task_...", status: "running", assignedRobotId: "RB-01" }
  ],
  streams: [
    { streamId: "stream_inbound_01", enabled: true }
  ]
}
```

Wymagania:
- Snapshot przekazywany do algorytmu **MUST** być deterministyczny (stała kolejność list: sort po id).
- `tick` **MUST** być monotoniczny i deterministyczny w replay.

#### 5.8.2 `AlgorithmDecision`
```json5
{
  tick: 12345,

  // propozycje ruchu / RTP dla robotów
  robotCommands: [
    {
      robotId: "RB-01",
      command: {
        type: "setRollingTarget",
        target: { x: 10.0, y: 3.0, angle: 0.0 },
        // dodatkowe dane debug
        routeId: "route_...",
        hold: false,
        holdReasonCode: "NONE"
      }
    }
  ],

  // zmiany tasków/streamów (MVP: opcjonalne)
  taskUpdates: [],
  worksiteUpdates: []
}
```

Wymagania:
- Fleet Core **MUST** traktować decyzję algorytmu jako „propozycję”, a następnie:
  - zapisać do event log,
  - wykonać walidacje safety,
  - wysłać do providera robota.

---

### 5.9 Komendy i dispatch (kontrakty + lifecycle)

W systemie rozróżniamy:
- **komendy algorytmu** (wewnętrzne, np. `setRollingTarget`) — wychodzą z `AlgorithmDecision`,
- **komendy gateway** (kanoniczne komendy do providera, np. `goPoint`, `stop`) — wychodzą z Fleet Core do Fleet Gateway.

Fleet Core jest odpowiedzialny za tłumaczenie i egzekwowanie safety (watchdog, limitowanie częstotliwości).

#### 5.9.1 `CommandRecord` (kanoniczny zapis komendy)
```json5
{
  commandId: "cmd_01JH1B...",
  tsMs: 1736160000123,

  robotId: "RB-01",

  // Komenda na poziomie gateway/providera
  type: "goPoint", // goPoint | goTarget | stop | pauseTask | resumeTask | cancelTask | reloc | pushConfig

  // Payload zależny od typu
  payload: {
    x: 10.0,
    y: 3.0,
    angle: 0.0
  },

  // Lifecycle
  status: "created", // created | dispatched | acknowledged | completed | failed | canceled
  statusReasonCode: "NONE",

  // Korelacja (dla debug i idempotencji end-to-end)
  request: {
    clientId: "ui-traffic-lab-01",
    requestId: "req_01JH1B..."
  }
}
```

Wymagania:
- Fleet Core **MUST** zapisywać `CommandRecord` do event log (jako eventy `commandCreated`/`commandUpdated`) **zanim** spróbuje wysłać komendę do gateway.
- Fleet Core **MUST** używać `commandId` jako idempotency key w relacji Core→Gateway.
- Fleet Gateway **MUST** deduplikować komendy po `commandId`.

#### 5.9.2 Lifecycle komendy (MVP vs future-proof)
- MVP **MUST** implementować co najmniej stany: `created` → `dispatched` oraz `failed`.
- MVP **SHOULD** implementować `acknowledged` (jeśli robot zwraca `task_id`/`result`).
- Po MVP: `completed`/`canceled` mogą zależeć od „task status” z robota.

#### 5.9.3 Reguły dispatchu RTP (Rolling Target Point)
1. Jeśli algorytm zwraca `setRollingTarget` dla robota:
   - Fleet Core **MUST** przeliczyć to na `goPoint` (gateway) z `target` jako `{x,y,angle}`.
2. Fleet Core **MUST** limitować spam:
   - nie wysyłać nowego `goPoint`, jeśli dystans do poprzedniego celu < `rtp.minDeltaM`, chyba że minął czas `1/updateHz`.
3. Watchdog:
   - Jeżeli robot jest w `auto` i ma aktywny route/task, a Fleet Core nie wyśle nowego RTP w czasie `rtp.timeoutMs`, Fleet Core **MUST** wysłać `stop` oraz ustawić `blocked.isBlocked=true` z reason `BLOCKED_PROVIDER_ERROR` (lub dedykowany `BLOCKED_RTP_TIMEOUT` jeśli dodamy).
4. Hold:
   - Jeżeli algorytm zwraca `hold=true`, Fleet Core **MUST**:
     - nie wysyłać `goPoint` (albo wysłać `stop`),
     - emitować reason code w runtime (np. `BLOCKED_TRAFFIC`).

#### 5.9.4 Idempotencja mutacji (Core API)
- Każdy endpoint mutujący w Core **MUST** traktować `(X-Client-Id, X-Request-Id)` jako idempotency key.
- Fleet Core **MUST** przechowywać ledger idempotencji co najmniej do czasu retencji event log (MVP: TTL np. 24h).

### 5.10 Katalog eventów (dla SSE + event log)

Eventy mają `type` w języku angielskim (camelCase). Minimalny katalog (MVP):

- `snapshotEmitted`
- `controlLeaseChanged`
- `sceneValidationCompleted`
- `sceneActivationStarted`
- `sceneActivationCompleted`
- `sceneActivationFailed`
- `robotStateUpdated` (zbiorczy: pose/velocity/mode/blocked/provider/routeProgress)
- `robotProviderSwitchStarted`
- `robotProviderSwitchCompleted`
- `robotProviderSwitchFailed`
- `taskCreated`
- `taskUpdated`
- `taskCanceled`
- `worksiteUpdated`
- `streamUpdated`
- `commandCreated`
- `commandUpdated`
- `storageDegraded` / `storageRecovered`

Wymagania:
- Core **MUST** emitować eventy w tej samej kolejności, w jakiej zapisuje je do event log.
- Każdy event **MUST** mieć stabilny `type` i `schemaVersion`.


## 6. Fleet Core API (publiczne)

### 6.1 Zasady ogólne
- Base URL: `http(s)://<fleet-core-host>/api/v1`
- Wszystkie endpointy publiczne **MUST** zwracać JSON.
- Mutacje **MUST** wymagać nagłówków:
  - `X-Client-Id` (stały identyfikator klienta, np. UI instancji)
  - `X-Request-Id` (unikalny per request; idempotencja)
  - `X-Control-Lease-Id` (tylko jeśli endpoint jest „mutujący”)

### 6.2 Health / Version

#### `GET /api/v1/health`
Odpowiedź:
```json5
{
  ok: true,
  tsMs: 1736160000123,
  build: {
    version: "0.3.0",
    gitSha: "abc123",
    contractsVersion: "2026-01-06.1"
  },
  activeSceneId: "scene_wh_01",
  mode: "running" // running | paused | activatingScene | degraded
}
```

### 6.3 Control Lease

#### `GET /api/v1/control/lease`
```json5
{
  lease: {
    leaseId: "lease_...",
    ownerClientId: "ui-traffic-lab-01",
    ownerLabel: "TrafficLab UI @ workstation-3",
    acquiredTsMs: 1736160000000,
    expiresTsMs: 1736160060000,
    force: false,
    reason: null
  }
}
```

#### `POST /api/v1/control/lease/seize`  (mutating, ale bez lease)
Request:
```json5
{
  ownerLabel: "TrafficLab UI @ workstation-3",
  ttlMs: 60000,
  force: false,
  reason: null
}
```

Response 200:
```json5
{
  lease: { /* ControlLease */ }
}
```

Response 409 (ktoś już ma):
```json5
{
  error: {
    code: "CONTROL_LEASE_HELD",
    message: "Control lease is currently held by another client",
    retryable: true,
    details: { currentLease: { /* ControlLease */ } },
    requestId: "req_..."
  }
}
```
Jeżeli `force: true` (seize control):
- Fleet Core **MUST** unieważnić aktualny lease (jeśli istnieje) i natychmiast nadać nowy lease wywołującemu klientowi.
- Fleet Core **MUST** wyemitować event `controlLeaseChanged` zawierający zarówno `previousLease`, jak i `newLease`.
- Wszystkie kolejne mutacje od poprzedniego właściciela **MUST** kończyć się błędem `CONTROL_LEASE_INVALID` (bo lease zostało wywłaszczone).

Jeżeli konfiguracja serwera nie pozwala na force seize (`controlLease.allowForceSeize=false`), serwer **MUST** zwrócić błąd (np. 403) z kodem `CONTROL_LEASE_FORCE_DISABLED`.


#### `POST /api/v1/control/lease/renew` (mutating)
Headers: `X-Control-Lease-Id` MUST
Request:
```json5
{
  ttlMs: 60000
}
```

#### `POST /api/v1/control/lease/release` (mutating)
Headers: `X-Control-Lease-Id` MUST
Request:
```json5
{
  reason: "Operator finished session"
}
```

Wymagania:
- Jeżeli lease wygaśnie, Fleet Core **MUST**:
  - przełączyć się na tryb „no-operator” (mutacje odrzucone),
  - jeżeli były aktywne manualne komendy → **MUST** wysłać STOP (failsafe).

### 6.4 Scenes

#### `GET /api/v1/scenes`
```json5
{
  scenes: [
    { sceneId: "scene_wh_01", name: "Warehouse 01", updatedTsMs: 1736160000000 },
    { sceneId: "scene_lab_01", name: "Lab 01", updatedTsMs: 1736000000000 }
  ]
}
```

#### `GET /api/v1/scenes/{sceneId}`
```json5
{
  manifest: { /* SceneManifest */ }
}
```

#### `POST /api/v1/scenes/{sceneId}/validate` (mutating)
Headers: `X-Control-Lease-Id` MUST
Response:
```json5
{
  ok: true,
  issues: [
    // lista ostrzeżeń/błędów walidacji
    // { level: "error"|"warning", code: "MAP_NODE_MISSING", message: "...", details: {...} }
  ]
}
```

#### `POST /api/v1/scenes/{sceneId}/activate` (mutating)
Headers: `X-Control-Lease-Id` MUST
Request:
```json5
{
  // zachowanie po aktywacji
  startMode: "paused", // paused | running
  // polityka: co z robotami które nie istnieją w scenie
  unknownRobotsPolicy: "pauseAndIgnore" // pauseAndIgnore | stopAndIgnore
}
```

Response:
```json5
{
  ok: true,
  activationId: "act_01JH...",
  activeSceneId: "scene_wh_01"
}
```

Wymagania:
- Semantyka aktywacji jest w sekcji 8.

### 6.5 State + Events (SSE)

#### `GET /api/v1/state`
Zwraca pełny snapshot kanoniczny (do UI i debug).
```json5
{
  tsMs: 1736160000123,
  cursor: 102345,
  activeSceneId: "scene_wh_01",

  controlLease: { /* ControlLease lub null */ },

  robots: [ /* RobotRuntimeState[] */ ],
  worksites: [ /* Worksite[] */ ],
  streams: [ /* StreamDefinition + runtime */ ],
  tasks: [ /* Task[] */ ]
}
```

#### `GET /api/v1/events/stream` (SSE)
Parametry:
- `fromCursor` (opcjonalnie): od którego cursora próbować replay.

Zdarzenia:
- `event: snapshot` → payload = jak `GET /state`
- `event: delta` → payload = `EventEnvelope`
- `event: heartbeat` → payload = `{ tsMs, cursor }`

Wymagania:
- Na connect, serwer **MUST** wysłać `snapshot` jako pierwsze zdarzenie.
- Serwer **MUST** wspierać `Last-Event-ID` i/lub `fromCursor` do wznowienia.
- Jeżeli requested cursor jest za stary (retencja), serwer **MUST** zwrócić `snapshot` + `requiresResync=true` w meta.

### 6.6 Robot operations (public)

#### `POST /api/v1/robots/{robotId}/provider` (mutating)
Headers: `X-Control-Lease-Id` MUST  
Request:
```json5
{
  provider: {
    type: "robokitSim",
    config: { host: "127.0.0.1", ports: { state: 19204, task: 19206, ctrl: 19205, push: 19301 } }
  },

  // czy wykonać relocate (jeśli wspierane)
  relocate: {
    enabled: true,
    pose: { x: 1.2, y: 3.4, angle: 0.1 }
  }
}
```

Response:
```json5
{
  ok: true,
  robotId: "RB-01",
  providerType: "robokitSim",
  switchState: "completed" // pending | completed | failed
}
```

Wymagania:
- Semantyka przełączania providerów: sekcja 9.

#### `POST /api/v1/robots/{robotId}/pause` (mutating)
#### `POST /api/v1/robots/{robotId}/resume` (mutating)
#### `POST /api/v1/robots/{robotId}/stop` (mutating)
Każde MUST wymaga lease.

### 6.7 Task operations (public, MVP: minimalne)

#### `POST /api/v1/tasks` (mutating)
Request:
```json5
{
  kind: "pickDrop",
  fromWorksiteId: "PICK_01",
  toWorksiteId: "DROP_01",
  // opcjonalnie: assignedRobotId (gdy ręcznie)
  assignedRobotId: null
}
```

Response:
```json5
{
  task: { /* Task */ }
}
```

#### `POST /api/v1/tasks/{taskId}/cancel` (mutating)
Request:
```json5
{
  reasonCode: "TASK_CANCELED_OPERATOR"
}
```

---

### 6.8 Worksites (public)

#### `GET /api/v1/worksites`
```json5
{
  worksites: [
    {
      worksiteId: "DROP_01",
      type: "drop",
      displayName: "Drop 01",
      location: { kind: "node", nodeId: "LM42", point: null },
      state: { occupancy: "empty", isBlocked: false, blockReasonCode: "NONE", lastChangedTsMs: 1736160000000 }
    }
  ]
}
```

#### `PATCH /api/v1/worksites/{worksiteId}` (mutating)
Headers: `X-Control-Lease-Id` MUST  
Request (przykład: zmiana occupancy):
```json5
{
  // częściowa aktualizacja stanu runtime
  state: {
    occupancy: "filled",          // empty | filled | unknown
    // opcjonalnie:
    isBlocked: false,
    blockReasonCode: "NONE"
  },

  // korelacja (opcjonalnie, ale zalecane w body dla audytu)
  note: "Operator marked DROP_01 as filled"
}
```

Response:
```json5
{
  ok: true,
  worksite: { /* Worksite */ }
}
```

Wymagania:
- Worksite updates **MUST** emitować `worksiteUpdated`.
- Pola nieobecne w PATCH **MUST NOT** być nadpisywane.

### 6.9 Streams (public)

#### `GET /api/v1/streams`
```json5
{
  streams: [
    {
      streamId: "stream_inbound_01",
      displayName: "Inbound pallets",
      enabled: true,
      policy: { maxInFlightTasks: 10, priority: 100 }
    }
  ]
}
```

#### `PATCH /api/v1/streams/{streamId}` (mutating)
Headers: `X-Control-Lease-Id` MUST  
Request (przykład: enable/disable):
```json5
{
  enabled: false,
  note: "Operator paused stream during maintenance"
}
```

Response:
```json5
{
  ok: true,
  stream: { /* StreamDefinition */ }
}
```

Wymagania:
- Zmiana streamu **MUST** emitować `streamUpdated`.
- Jeżeli stream jest disabled, Core **MUST** nie generować nowych tasków z tego streamu.

### 6.10 Simulation control (public, MVP: internalSim)

> Te endpointy są sensowne tylko jeśli scena używa `internalSim`.  
> W trybie robokitReal/robokitSim mogą zwracać 409 `SIMULATION_NOT_AVAILABLE`.

#### `GET /api/v1/simulation`
```json5
{
  enabled: true,
  tickHz: 20,
  simSpeed: 1.0,
  stepMode: false
}
```

#### `POST /api/v1/simulation/speed` (mutating)
Request:
```json5
{
  simSpeed: 5.0 // 0.1 .. 10.0
}
```

#### `POST /api/v1/simulation/step` (mutating)
Request:
```json5
{
  steps: 1
}
```

### 6.11 Import/Export scen (public, MVP: import package)

#### `POST /api/v1/scenes/import` (mutating)
Headers: `X-Control-Lease-Id` MUST  
Opis:
- Endpoint przyjmuje paczkę sceny (zip lub multipart) zawierającą:
  - `manifest.json`
  - `graph.json`
  - `worksites.json`
  - `streams.json`
  - `robots.json`
  - `algorithm.json`

Response:
```json5
{
  ok: true,
  sceneId: "scene_wh_01",
  imported: true
}
```

Wymagania:
- Core **MUST** walidować integralność i hashe z manifestu.
- Import **MUST** nie aktywować sceny automatycznie (oddzielny krok `/activate`).


## 7. Fleet Gateway API (wewnętrzne)

### 7.1 Zasady ogólne
- Base URL: `http(s)://<fleet-gateway-host>/gateway/v1`
- To API jest **dla Fleet Core**, nie dla UI.
- Security jest poza MVP, ale gateway **SHOULD** być dostępny tylko w sieci wewnętrznej.

### 7.2 Health

#### `GET /gateway/v1/health`
```json5
{
  ok: true,
  tsMs: 1736160000123,
  build: { version: "0.3.0", gitSha: "abc123" }
}
```

### 7.3 Robots

#### `GET /gateway/v1/robots`
```json5
{
  robots: [
    {
      robotId: "RB-01",
      providerType: "robokitSim",
      connection: { status: "connected", lastSeenTsMs: 1736160000123, errorCode: null }
    }
  ]
}
```

#### `GET /gateway/v1/robots/{robotId}/state`
Zwraca „raw-ish” dane providera plus kanoniczny mapping, jeśli gateway to robi.
```json5
{
  robotId: "RB-01",
  providerType: "robokitSim",
  connection: { status: "connected", lastSeenTsMs: 1736160000123 },

  // Kanoniczne minimum dla core
  pose: { x: 1.2, y: 3.4, angle: 0.1 },
  velocity: { vx: 0.0, vy: 0.0, w: 0.0 },

  // Dane dodatkowe wprost z robota (snake_case, external) — tylko debug
  raw: {
    loc: { x: 1.2, y: 3.4, angle: 0.1, current_station: "AP7" },
    task: { task_status: 2, task_id: 123 }
  }
}
```

#### `POST /gateway/v1/robots/{robotId}/connect` (mutating)
Request:
```json5
{
  provider: {
    type: "robokitSim",
    config: { host: "127.0.0.1" }
  }
}
```

#### `POST /gateway/v1/robots/{robotId}/disconnect` (mutating)

### 7.4 Commands (wewnętrzne, od Core do Gateway)

#### `POST /gateway/v1/robots/{robotId}/commands` (mutating)
Request:
```json5
{
  commandId: "cmd_01JH1B...",
  tsMs: 1736160000123,

  // typ komendy kanonicznej
  type: "goPoint", // goPoint | goTarget | stop | pauseTask | resumeTask | cancelTask | reloc | pushConfig

  payload: {
    // dla goPoint:
    x: 10.0,
    y: 3.0,
    angle: 0.0
  },

  // opcjonalnie: deadline/timeout
  timeoutMs: 1500
}
```

Response:
```json5
{
  ok: true,
  commandId: "cmd_01JH1B...",
  gatewayStatus: "dispatched", // accepted | dispatched | failed
  // jeżeli failed:
  reasonCode: "ROBOT_OFFLINE"
}
```

Wymagania:
- Gateway **MUST** deduplikować komendy po `commandId` (idempotencja).
- Gateway **MUST** raportować jednoznacznie, czy komenda została tylko przyjęta, czy faktycznie wysłana do robota.
- W MVP: gateway może nie mieć pełnego „command completion tracking”, ale MUST przynajmniej mieć „dispatch ack”.

---

## 8. Scene Activation (procedura i semantyka)

### 8.1 Cel
Scene Activation zmienia topologię (mapę) i konfigurację runtime. To musi być transakcyjne i bezpieczne.

### 8.2 Wymagania (MUST)
1. Aktywacja sceny **MUST** być wykonywana jako „jedna operacja” z punktu widzenia UI: albo się uda, albo kończy się kontrolowanym błędem.
2. Podczas aktywacji Fleet Core **MUST** przejść w stan `activatingScene` i:
   - zatrzymać tick algorytmu,
   - zatrzymać/suspendować dispatch komend,
   - wysłać failsafe STOP do robotów (jeśli możliwe).
3. Aktywacja **MUST** czyścić runtime:
   - aktywne taski → `canceled` z reason `SCENE_SWITCH`,
   - rezerwacje/locki → wyczyszczone,
   - streamy → `paused` (chyba że `startMode=running`).
4. Aktywacja **MUST** wymusić spójność mapy:
   - po aktywacji każdy robot ma przypisany `mapFrameId`,
   - jeśli provider potrafi raportować mapId/frame, MUST to zwalidować (jeśli brak, zaznaczyć `unknown`).
5. Aktywacja **MUST** zapisać na dysk:
   - wpis `sceneActivationStarted`,
   - finalny snapshot stanu po aktywacji,
   - wpis `sceneActivationCompleted` albo `sceneActivationFailed`.
6. Jeżeli zapis na dysk nie jest możliwy, Fleet Core **MUST** przejść w `degraded` i odrzucać mutacje (503).

### 8.3 Algorytm aktywacji (krok po kroku)

#### Faza A: preflight (bez efektów ubocznych)
1. Load `SceneManifest` + pliki sceny.
2. Waliduj:
   - integralność hashy,
   - spójność referencji (worksites → nodeId istnieje w graph),
   - unikalność id,
   - zgodność wersji schema.
3. (Opcjonalnie) uruchom Map Compiler jeśli scena jest w formacie źródłowym i wymaga kompilacji.

Jeżeli preflight nie przejdzie: **MUST** zwrócić błąd, nie dotykając aktywnej sceny.

#### Faza B: swap (efekty uboczne, ale z rollback)
1. Ustaw `mode=activatingScene` (event + log).
2. Stop tick algorytmu i dispatcher.
3. Wyślij STOP do robotów (best effort; timeout).
4. Zamknij/wyczyść runtime (taski/locki/streamy) — ale zachowaj w pamięci poprzedni snapshot do rollback.
5. Zainicjalizuj nowy runtime:
   - wczytaj mapę,
   - stwórz worksites/streamy/task store,
   - stwórz roboty i przypisz providery zgodnie z `robots.json`.
6. Zrób `snapshot` i zapisz na dysk.
7. Ustaw `activeSceneId`.
8. Ustaw `mode` zgodnie z `startMode`.
9. Emituj `snapshot` i `sceneActivationCompleted`.

#### Rollback
Jeżeli w fazie B wystąpi błąd po kroku 2:
- Fleet Core **MUST** spróbować wrócić do poprzedniego runtime snapshotu (w pamięci),
- **MUST** pozostać w trybie `paused` i wymagać interwencji operatora, jeśli rollback się nie powiedzie.

---

## 9. Przełączanie providera robota (hot switch)

### 9.1 Cel
W trakcie symulacji można przełączyć pojedynczego robota między:
- internalSim ↔ robokitSim ↔ robokitReal

### 9.2 Wymagania (MUST)
1. Switch **MUST** być wykonywany tylko w `paused` dla danego robota (Fleet Core musi wymusić pause/stop).
2. Switch **MUST** zatrzymać RTP/komendy ruchu dla robota (watchdog).
3. Switch **MUST** wykonać synchronizację pozycji:
   - jeśli nowy provider wspiera relocate: wykonać relocate na `pose`,
   - jeśli nie: ustawić robota w `fault` i wymagać manual confirmation.
4. Switch **MUST** mieć timeouty i reason codes, np.:
   - `SWITCH_FAILED_ROBOT_OFFLINE`,
   - `SWITCH_FAILED_RELOC_UNSUPPORTED`,
   - `SWITCH_FAILED_MAP_MISMATCH`.
5. Switch **MUST** być zapisany do event log.

### 9.3 Procedura
1. `pause` robota.
2. `stop` (failsafe) do starego providera.
3. Rozłącz starego providera (jeśli wymaga).
4. Podłącz nowego providera.
5. Pobierz status (pose).
6. Jeżeli wymagane, wykonaj relocate.
7. Ustaw `providerType` w runtime.
8. `resume` (opcjonalnie).

---

## 10. RoboCore / Robokit — opis protokołu (reverse engineered, v0.3)

> **Uwaga:** RoboCore/Robokit to protokół zewnętrzny. Ten opis jest stanem na dziś; po dalszym reverse engineeringu może zostać doprecyzowany. W MVP implementujemy to, co jest potrzebne do ruchu i statusu.

### 10.1 Transport
- TCP, wiele portów (STATE/CTRL/TASK/PUSH).
- Ramkowanie jest identyczne na każdym porcie.

### 10.2 Frame format (HEADER = 16 bytes)

Offsety i typy (big-endian tam, gdzie > 1 bajt):

- `0`  : `startMark` (uint8) = `0x5A`
- `1`  : `version` (uint8) = `0x01`
- `2..3` : `seq` (uint16 BE)
- `4..7` : `bodyLength` (uint32 BE)
- `8..9` : `apiNo` (uint16 BE)
- `10..15`: `reserved` (6 bytes)

Body:
- `bodyLength` bajtów.
- Jeśli `reserved[2..3]` (uint16 BE) > 0 i ≤ bodyLength, to:
  - pierwsze `jsonSize` bajtów body to JSON (UTF-8),
  - reszta to binarne dane (jeśli występują).
- W przeciwnym razie: całe body jest JSON.

Wymagania implementacyjne (Gateway MUST):
- Parser **MUST** resynchronizować strumień po `startMark` jeśli bajty się rozsypią.
- Parser **MUST** mieć limit `maxBodyLength` (np. 1 MiB) i odrzucać większe ramki.
- Parser **MUST** tolerować `jsonSize=0` (całość JSON).
- Parser **MUST** logować błędy JSON (jsonError) oraz zrzucać surowe ramki do capture (dev).

### 10.3 Response mapping
- Odpowiedź ma `apiNo = requestApiNo + 10000`.
- `seq` w odpowiedzi odpowiada request `seq`.

### 10.4 Porty (najczęściej spotykane)
- `STATE` = 19204 (status)
- `CTRL`  = 19205 (control)
- `TASK`  = 19206 (task commands)
- `PUSH`  = 19301 (push stream)

### 10.5 Minimalny zestaw API do MVP (numery)
Status:
- `robot_status_loc_req` = 1004
- `robot_status_task_req` = 1020
- `robot_status_block_req` = 1006

Control:
- `robot_control_stop_req` = 2000
- `robot_control_reloc_req` = 2002 (jeśli dostępne)

Task:
- `robot_task_gopoint_req` = 3050
- `robot_task_gotarget_req` = 3051 (opcjonalnie)
- `robot_task_pause_req` = 3001
- `robot_task_resume_req` = 3002
- `robot_task_cancel_req` = 3003

Push:
- `robot_push_config_req` = 9300

### 10.6 Przykładowe „ramki protokołu” (payload JSON)

#### 10.6.1 „Jedź do punktu” (`robot_task_gopoint_req` = 3050)
Request JSON (w body):
```json5
{
  x: 10.0,
  y: 3.0,
  // opcjonalnie
  angle: 0.0
}
```

Response JSON:
```json5
{
  // Base response shape jest zależna od robota; minimalnie:
  result: 0,
  task_id: 123,
  target_id: "LM42",
  path_nodes: ["AP7","AP8","LM42"]
}
```

#### 10.6.2 „STOP” (`robot_control_stop_req` = 2000)
Request:
```json5
{}
```

Response:
```json5
{ result: 0 }
```

#### 10.6.3 Status lokalizacji (`robot_status_loc_req` = 1004)
Request:
```json5
{}
```

Response:
```json5
{
  x: 1.2,
  y: 3.4,
  angle: 0.1,
  confidence: 100,
  current_station: "AP7",
  last_station: "AP6"
}
```

#### 10.6.4 Push config (`robot_push_config_req` = 9300)
Request:
```json5
{
  interval: 500,
  included_fields: ["x", "y", "task_status"]
}
```

---

## 11. Logowanie, snapshoty, replay (MUST: na dysk)

### 11.1 Event log (append-only)
Fleet Core **MUST** prowadzić event log na dysku w formacie JSONL:
- plik: `data/eventlog/eventlog-YYYYMMDD.jsonl`
- każdy wiersz: `EventEnvelope`

### 11.2 Snapshoty
Fleet Core **MUST** zapisywać snapshot pełnego stanu:
- na starcie (po load),
- po Scene Activation,
- periodycznie (np. co 5–30 s) lub po N eventach,
- przy kontrolowanym shutdown.

Format: `data/snapshots/snapshot-<cursor>.json`.

### 11.3 Replay
Fleet Core **MUST** móc odtworzyć stan:
- load ostatniego snapshotu,
- replay eventów od `cursor+1`.

Wymagania:
- eventy i snapshoty **MUST** zawierać wystarczające dane do debug (w tym reason codes).
- algorytm **SHOULD** być deterministyczny w replay (tick/seed).

### 11.4 Polityka awarii dysku
Jeżeli zapis na dysk się nie uda (IO error, disk full):
- Fleet Core **MUST** wejść w stan `degraded`.
- Fleet Core **MUST**:
  - wysłać STOP do robotów (best effort),
  - zatrzymać algorytm,
  - odrzucać wszystkie mutacje (HTTP 503 `STORAGE_UNAVAILABLE`),
  - nadal pozwalać na odczyt `/state` i `/events/stream` (jeśli to możliwe),
  - logować błąd do stderr/system log.

---

## 12. Reason Codes (kody przyczyn)

Ta lista jest kanoniczna. Wartości są w języku angielskim (en).

### 12.1 Błędy API (ErrorEnvelope.code)
- `BAD_REQUEST`
- `VALIDATION_FAILED`
- `CONTROL_LEASE_HELD`
- `CONTROL_LEASE_REQUIRED`
- `CONTROL_LEASE_INVALID`
- `CONTROL_LEASE_FORCE_DISABLED`
- `SCENE_NOT_FOUND`
- `SCENE_INVALID`
- `SCENE_ACTIVATION_IN_PROGRESS`
- `SCENE_ACTIVATION_FAILED`
- `ROBOT_NOT_FOUND`
- `ROBOT_OFFLINE`
- `ROBOT_COMMAND_REJECTED`
- `PROVIDER_SWITCH_FAILED`
- `STORAGE_UNAVAILABLE`
- `INTERNAL_ERROR`
- `SIMULATION_NOT_AVAILABLE`

### 12.2 Robot blocked / hold / fault
- `NONE`
- `BLOCKED_OBSTACLE`
- `BLOCKED_TRAFFIC`
- `BLOCKED_STUCK`
- `BLOCKED_EMERGENCY_STOP`
- `BLOCKED_PROVIDER_ERROR`
- `BLOCKED_UNKNOWN`

### 12.3 Task status reasons
- `NONE`
- `TASK_CANCELED_OPERATOR`
- `TASK_CANCELED_SCENE_SWITCH`
- `TASK_FAILED_ROBOT_OFFLINE`
- `TASK_FAILED_ROBOT_FAULT`
- `TASK_FAILED_TIMEOUT`
- `TASK_FAILED_UNKNOWN`

### 12.4 Provider switch reasons
- `SWITCH_FAILED_ROBOT_OFFLINE`
- `SWITCH_FAILED_RELOC_UNSUPPORTED`
- `SWITCH_FAILED_MAP_MISMATCH`
- `SWITCH_FAILED_TIMEOUT`
- `SWITCH_FAILED_UNKNOWN`

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

