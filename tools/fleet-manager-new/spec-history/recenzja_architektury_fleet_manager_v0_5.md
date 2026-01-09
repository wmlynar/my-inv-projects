# Recenzja specyfikacji architektury Fleet Manager 2.0 (v0.5)

**Data:** 2026-01-07  
**Zakres recenzji:** pakiet dokumentów `spec_fleet_manager_architektura_v0_5.zip` (architektura, kontrakty, API, runtime, narzędzia).  
**Uwaga:** nie recenzuję tutaj specyfikacji algorytmu (jest osobnym dokumentem) — odnoszę się do niej tylko wtedy, gdy architektura wymaga doprecyzowania portów/kontraktów.

---

## 1) Prompt, który spowodował wygenerowanie tej recenzji

Poniższy prompt jest streszczony _w tej samej treści_, w jakiej został przekazany w tym wątku (łącznie z dopiskami o proxy i planie MVP):

> dzięki za przesłanie nowej wersji specyfikacji w archiwum . to teraz ponownie zrob recenzje i przedstaw w postaci dokumentu recenzji tej architektury  
> 
> - co jeszcze bys w nich poprawil  
> - co jeszcze bys tam dodal  
> - jakie bledy widzisz  
> - co bys ulepszyl  
> - jak bys zrobicl zeby byla jeszcze bardziej future proof  
> - jak bys zrobil, zeby byla lepszej jakosci  
> - jak bys zrobil zeby byla bardziej projesjponalna  
> - jak bys zrobil, zeby byla bardziej odporna na wszelkiego typu bledy  
> - jak bysmy zrobili, zeby jeszcze lepiej sie nadawala do pracy z AI  
> 
> to chcialbym dodac do recenzji:  
> 
> powoli trzeba zmierzac do finalizacji dokumentacji i dalesz pracy juz codexie razem z kodem i rownolegla modyfikacje specyfikacji  
> 
> implementacje bedziemy pewnie prowadzic komponentami, dlatego towazne, zebo byly opisane  
> 
> jako pierwsze wazne chyba jest, zeby dorze dzialalo proxy  
> 
> specyfikacja proxy  
> * zrobione tak i wyspecyfikowane, zebym mogl mowic prosic codex o jego uruchomienie w taki sposob:  
> ** postaw proxy na localhost, adres robota jest taki i taki  
> ** w tej sesji chce zrobic to i to i zeby to trafialo do opisu sesji  
> * logi moga zajmowac duzo wiec niech bedzie katalog poza repo np. ~/robokit_logs/(data)_(robot/rds/ladowarka/...)_(nazwa_sesji)  
> * zeby bylo pewne, ze loguje wszystkie porty robokit, ale tez na wszystkich portach http  
> * na poczatek niech moze loguje bez throttlingu  
> * niech loguje tez binarki lecace w dwie strony  
> * niech ma ostrzezenie, jezeli plik jest zbyt duzy, wtedy mozna rozwazyc throttling  
> * na koncu moze robic archiwum dzie przenosi wszystkie pliki, zeby nie zajmowalo tyle na dysku  
> 
> napisz tez plan implementacji mvp, zakladajac, ze mamy juz wszystki logi  
> 
> jako koejna rzecz to pewnie bedzie symulator robota, ktory bedzie mog dzialac po roboshopem  
> zeby z roboshopa mozna nim bylo sterowac i wydawac rone polecenia  
> zeby nasladowal prawdziwego robota  
> 
> dodaj do dokumentacji ladny plan, co pokolei bedziemy implenentowac. napisz jeszcze czego brakuje do implementacji  
> 
> trzeba tez chyba dodac, ze po tym jak uzyjemy proxy, zeby podsluchac protokol to trzeba dokladnie udokumentowac jak robot sie komunikuje  
> rozczytac wszystkei sesje  
> aha - i tez rozczytac omijanie przeszkod  
> kiedy i czy zglasza ze chce omijac  
> dodatkowo warto w oddzielnej sesni podluchac dane z laserow, zebysmy mogli cwiczyc w przyszlosci wlasny algorytm omijania przeszkod - ale to w dalekiej przyszlosci  
> natomiast zebysmy mieli dane

---

## 2) Najkrótsze podsumowanie stanu v0.5 (co jest już bardzo dobre)

To jest wersja, która _naprawdę_ zaczyna wyglądać jak “specyfikacja do wdrożenia”, a nie tylko opis idei.

Największe plusy v0.5:

- **Pełny obraz systemu wrócił**: masz diagramy + “kanon” (Contracts → Runtime semantics → API) + normatywne opisy komponentów w `02_architektura_wysokopoziomowa.md`.
- **Separacja domena vs integracje** jest jasno postawiona (Core vs Gateway, adaptery na zewnątrz).
- **Event log + snapshoty na dysk** są potraktowane jako _wymóg nadrzędny_ (to w robotyce jest złoto).
- **Control Lease / seize control** jest spójnie opisywany jako mechanizm “jeden steruje, wielu patrzy”.
- **Rolling target jako LM/AP (goTarget)** jest dopięty i przełożony na ramki RoboCore/Robokit w `10_protokol_robocore_robokit.md`.

Czyli: fundament jest. Teraz wchodzimy w etap “zawężania niejednoznaczności” i “operacjonalizacji” (jak to uruchomić, jak to testować, jak to będzie wyglądało w CI/CD i w codziennym devie).

---

## 3) Co jeszcze bym poprawił

### 3.1 Proxy/Recorder: spec musi być *operacyjna*, nie tylko “wymaganiowa”
Obecna spec proxy (`15_proxy_recorder.md` + opis w `02_*`) mówi **co** narzędzie ma robić, ale nie mówi **jak** mamy je uruchamiać i jak wygląda “kontrakt uruchomieniowy” (CLI/config). A Ty chcesz móc powiedzieć Codexowi: „postaw proxy na localhost” i dostać działające polecenia.

To jest poprawka nr 1 do zrobienia, bo proxy jest “źródłem prawdy” do reverse engineeringu.

**Konkret:**
- Dodałbym w spec proxy sekcję **CLI Contract (MUST)** z gotowymi przykładami:
  - `proxy-recorder start ...`
  - `proxy-recorder stop ...`
  - `proxy-recorder archive ...`
  - `proxy-recorder list-sessions ...`
- Dodałbym sekcję **Config file (MUST)** z przykładem w JSON5 (czytelny dla ludzi i dla AI).
- Dodałbym sekcję **Log layout (MUST)**, która realizuje Twoją konwencję katalogów poza repo.

### 3.2 “Runbooki” per komponent (minimum uruchomieniowe)
Masz opisy komponentów (super), ale brakuje “jak to uruchomić w devie”:
- porty,
- env vars,
- minimalne komendy,
- przykładowy `docker compose` albo zestaw `make run-*`.

To jest bardzo ważne, gdy przechodzisz na tryb: **Codex + kod + równoległa modyfikacja specyfikacji**.

**Minimalny standard:**
- Każdy komponent w swoim opisie powinien mieć “How to run (MVP)” (SHOULD), nawet jeśli to tylko 10 linijek.

### 3.3 Traceability: wymaganie → sekcja spec → test
Masz scenariusze E2E (`18_*`) i strategię testów (`17_*`), ale brakuje “matrycy śladowości”:
- które MUST-y mają testy,
- gdzie jest “definition of done” dla danego MUST-a.

To jest rzecz, która dramatycznie zwiększa profesjonalizm i AI-friendly development: AI dostaje mapę, co jest krytyczne i jak to zweryfikować.

### 3.4 Precyzja semantyki statusów komend (ACK vs DONE)
W API i runtime pojawiają się statusy typu `acknowledged/dispatched/failed`, ale w praktyce integracji z robotem potrzebujesz konsekwentnie rozdzielić:
- **ACK transportu** (gateway przyjął do kolejki i wysłał / spróbował wysłać),
- **ACK robota** (robot przyjął ramkę / potwierdził seq),
- **DONE zadania** (robot osiągnął target / widły osiągnęły wysokość / step zakończony).

W MVP to może być uproszczone, ale definicje muszą być ostre, bo inaczej logika “retry bez dubli” i “replay” zaczyna żyć własnym życiem.

---

## 4) Co jeszcze bym dodał

### 4.1 Proxy: metadane sesji + “opis sesji”
Wprost masz wymaganie, że w sesji chcesz dopisać: “robię teraz to i to”.

**Propozycja (MUST):** `session.meta.json5` obok logów:
```json5
{
  sessionName: "2026-01-07_robot_RB-01_gotarget_smoke",
  description: "Test goTarget + forkHeight po podłączeniu do Roboshop",
  startedTsMs: 1736210000000,
  operator: "jan.kowalski",
  targets: [
    { kind: "robot", robotId: "RB-01", addr: "192.168.0.10" },
    { kind: "roboshop", addr: "192.168.0.20" }
  ],
  listen: [
    { protocol: "robocore", listen: "0.0.0.0:19205", upstream: "192.168.0.10:19205" }
  ]
}
```
To jest idealne dla AI: można po tym indeksować, filtrować, budować golden testy.

### 4.2 Proxy: defaulty portów RoboCore/Robokit + “capture all http ports”
W `10_*` porty są “observed”. Dla proxy warto mieć to wprost jako default profile:

- profile `--preset robokit` (STATE/CTRL/TASK/OTHER/PUSH…),
- profile `--preset http` (jeden lub wiele portów; albo wildcard, jeśli implementacja to wspiera),
- możliwość dodania własnych portów.

### 4.3 Reverse engineering backlog jako *część specyfikacji*
Nie lubię “wiedzy w głowie” w projektach integracyjnych.

Dodałbym sekcję “RE TODO (MUST before robot MVP)”:
- jakie ramki protokołu musimy potwierdzić capture,
- jakie statusy musimy zrozumieć (block/avoid),
- jakie pola z push muszą być logowane.

To nie jest “algorytm”, to jest wymaganie integracyjne.

### 4.4 Scenariusze E2E dla narzędzi (proxy + robot-controller)
W `18_*` dodałbym 2 scenariusze, bo one będą pierwszymi “weryfikowalnymi rzeczami” w repo:

- **E2E-Proxy-01:** uruchom proxy, połącz się do robota/robokit-sim, przechwyć sesję, wygeneruj archiwum, sprawdź integralność plików.
- **E2E-Controller-01:** robot-controller wykonuje `goTarget` + `forkHeight` + `stop` na robocie/robokit-sim i generuje log.

---

## 5) Jakie błędy widzę (albo miejsca, które są ryzykownie niejednoznaczne)

Uwaga: “błąd” w specyfikacji często znaczy “miejsce, w którym implementacja może pójść w dwie strony i obie będą zgodne z tekstem” — czyli _błąd specyfikacyjny_.

### 5.1 Proxy: brak kanonicznego formatu plików capture
Jest mowa o “JSONL + hexdump + timestamp”, ale nie ma:
- nazewnictwa plików,
- rozdziału per połączenie,
- identyfikatora connectionId,
- sposobu zapisu “raw bytes w obie strony” (czy to chunk? czy to frame?).

To jest krytyczne, bo bez tego “golden traces” i “replay” będą ad hoc.

### 5.2 RoboCore/Robokit: “observed” musi mieć znacznik pewności
W `10_*` część rzeczy jest reverse engineered i to jest OK — ale warto jawnie oznaczyć:
- `CONFIRMED` (wielokrotnie widziane, stabilne),
- `OBSERVED` (widziane w symulatorze lub 1 sesji),
- `HYPOTHESIS` (przypuszczenie).

To minimalizuje ryzyko, że implementacja oprze się na czymś, co potem okaże się inną wersją firmware.

### 5.3 Status “block/avoid/obstacle” jest jeszcze zbyt cienki
Masz `robot_status_block_req`, ale brakuje:
- tabeli reason codes (chociażby “UNKNOWN / SENSOR / OBSTACLE / MANUAL_ESTOP / PATH_BLOCKED / …”),
- mapowania na eventy Core (np. `robotBlocked(reason=...)`, `robotWantsAvoidance=true`),
- opisu jak to wpływa na algorytm (w MVP: “wykryj i zatrzymaj task/oznacz blocked”).

To jest dokładnie to, co sam zauważyłeś: trzeba podsłuchać i doprecyzować.

### 5.4 “Komenda do robota” vs “step Task Runnera” — granica bywa śliska
W kontraktach masz Task Runner i ActionPointy (forkHeight). To jest dobre, ale ryzyko jest takie:
- ktoś zacznie dorzucać “logikę zadania” do gateway,
- albo zacznie wysyłać “manual commands” omijając task runner.

W spec warto podkreślić (MUST): wszystkie sekwencje pick/drop w Core, gateway jest transportem.

---

## 6) Co bym ulepszył (konkrety techniczne)

### 6.1 Proxy: mechanizmy “duże logi”
W Twoich wymaganiach logi będą ogromne. To powinno być ustandaryzowane:

- katalog poza repo: `~/robokit_logs/<YYYYMMDD>_<targetKind>_<name>/`
- rotacja plików (SHOULD), ale:
  - w MVP: **bez throttlingu** (MUST), zgodnie z Twoim życzeniem,
  - MUST: warning gdy rośnie ponad limit (np. 5GB),
  - MAY: potem throttling/decimation.

- archiwizacja po stop (SHOULD):
  - `tar.zst` / `zip` (cokolwiek prostego),
  - manifest z checksumami (MUST, jeśli to “golden trace”).

### 6.2 “Offline robot” policy — zasady muszą być testowalne
W runtime jest sporo o reconnect/retry, ale ja bym dopisał:
- twarde domyślne timeouty (np. connectTimeoutMs, commandAckTimeoutMs),
- backoff i jitter (żeby nie robić “bursty”),
- limit “inflight commands per robot” (żeby nie zakopać robota).

I to powinno mieć testy odporności (`17_*`), najlepiej z robokit-sim, który symuluje partial frames i dropy.

### 6.3 Determinizm: co jest deterministyczne, a co nie
Event sourcing zakłada deterministyczne odtwarzanie, ale integracje z robotem są niedeterministyczne.
Warto doprecyzować:

- Domain state replay jest deterministyczny.
- Integracyjne zdarzenia (np. status z robota) są “wejściem zewnętrznym” i muszą być eventami w logu, jeśli wpływają na stan.

To powinno być zapisane wprost jako MUST, inaczej replay “nie będzie tym samym”.

---

## 7) Jak zrobić, żeby była jeszcze bardziej future-proof

### 7.1 Polityka ewolucji kontraktów (semver + migracje)
Masz `schemaVersion`, ale dodałbym proces:

- `contracts` mają SemVer,
- breaking changes → major,
- Core MUST potrafić migrować `EventEnvelope` i `Snapshot` co najmniej o 1 major w tył (albo mieć narzędzie migracyjne).

To jest ważne, bo jak ruszycie z implementacją, format event logu stanie się “produktem”.

### 7.2 “Plugin points” — tylko tam, gdzie trzeba
Nie przesadzałbym z plugin systemem, ale 2 miejsca są naturalne:

- `AlgorithmProvider` (już jest),
- `RobotProvider` (już jest w gateway).

Dla future-proof:
- zachować te porty stabilne,
- testować je golden input/output.

### 7.3 Przygotowanie pod HA (poza MVP) bez robienia HA
Wystarczy, że spec konsekwentnie:
- ma `traceId`,
- ma idempotencję requestów i komend,
- rozdziela read vs write.

To już w dużej mierze masz — dopilnowałbym tylko, żeby wszystkie mutacje były eventami.

---

## 8) Jak zrobić, żeby była lepszej jakości (warsztat specyfikacyjny)

### 8.1 “Jednoznaczność przez przykłady”
W kontraktach jest sporo JSON5 (super). Dodałbym konsekwencję:
- przy każdym endpointcie: minimum 1 przykład request i 1 response (success + error),
- przy każdej maszynie stanów: przykład timeline (zdarzenie po zdarzeniu).

To “zamyka” przestrzeń interpretacji.

### 8.2 Wspólny słownik “reason codes”
Masz `ErrorEnvelope` + kody błędów. Dodałbym wspólny rozdział:
- `ReasonCode` (dlaczego coś się stało, np. `ROBOT_OFFLINE`, `LEASE_REQUIRED`, `SCENE_INVALID`, `BLOCKED_SENSOR`).

To ułatwia UI, logi, testy i AI (bo AI może mapować zachowania do kodów).

### 8.3 Wyraźne “Out of scope”
Jest sekcja poza MVP — dobra. Ja bym jeszcze dopisał:
- co świadomie pomijamy w pierwszym wdrożeniu na robota (np. avoidance),
- jakie “fallbacki” wtedy obowiązują (np. wykryj blocked → stop + alarm).

---

## 9) Jak zrobić, żeby była bardziej profesjonalna

### 9.1 Dodaj “Architecture Decision Records” (ADR) — lekkie, ale obowiązkowe
W `02_*` masz ADR-ish fragmenty. Wystarczy zrobić:
- `docs/adr/0001-http-only.md`
- `docs/adr/0002-single-writer-core.md`
- `docs/adr/0003-event-sourcing.md`
- `docs/adr/0004-control-lease.md`

To stabilizuje decyzje i ułatwia onboarding AI + ludzi.

### 9.2 Minimalny “deployment story”
Nawet bez security:
- jak to działa na jednym laptopie,
- jak to działa na serwerze,
- jakie porty muszą być otwarte,
- gdzie lądują dane (eventy, snapshoty, capture).

To powinno być w spec lub w README repo.

---

## 10) Jak zrobić, żeby była bardziej odporna na wszelkiego typu błędy

### 10.1 “Fail-safe defaults” na każdej granicy
- Gateway: gdy niepewność → nie wysyłaj kolejnych komend; przejdź w HOLD; loguj.
- Core: gdy algo nie odpowiada → fallback plan (np. utrzymaj bieżące komendy albo stop).
- UI: gdy lease stracony → UI przechodzi w read-only automatycznie.

I te zachowania muszą być w scenariuszach (`18_*`) oraz w testach odporności (`17_*`).

### 10.2 Ochrona przed “command storm”
To się zdarza w praktyce: reconnect → duplikaty → robot dostaje 100 ramek.
Spec już wspomina idempotencję, ale ja bym dodał:
- limity (max commands/s),
- cooldown po reconnect,
- jedna kolejka per robot.

### 10.3 Timeouts jako kontrakt, nie “implementation detail”
Wiele awarii to “złe timeouty”. W spec warto mieć tabelę:
- tickHz,
- algoTimeoutMs,
- gatewayAckTimeoutMs,
- robotStatusStaleMs,
- leaseTtlMs.

---

## 11) Jak zrobić, żeby jeszcze lepiej nadawała się do pracy z AI

### 11.1 “AI task slices” per komponent
Dla każdego komponentu dodaj w spec (albo w backlogu):
- listę “self-contained tasks” (np. `proxy-recorder: implement CLI + log layout + archive`),
- wejście/wyjście (kontrakt),
- test “green”.

To pozwala AI robić równolegle i bez rozjeżdżania się integracji.

### 11.2 Golden assets jako główna forma weryfikacji
AI świetnie dowozi, gdy ma:
- golden input,
- expected output,
- test harness.

W tym projekcie golden assets to:
- `graph.json` (map compiler),
- capture TCP (gateway),
- eventlog+snapshot (core),
- decide input/output (algo).

Już to masz w strategii testów — trzeba tylko doprowadzić do konsekwentnego “repo of golden”.

### 11.3 “Promptability” narzędzi (proxy) i komponentów
Jeżeli chcesz mówić Codexowi “uruchom proxy tak i tak”, to narzędzie musi mieć:
- deterministyczne CLI,
- czytelne logi,
- przewidywalne ścieżki plików,
- jednoznaczne kody wyjścia.

To nie jest detal — to jest funkcjonalność projektowa pod AI.

---

## 12) Plan implementacji MVP (komponentami), zakładając że mamy już logi

To jest proponowana kolejność, która minimalizuje ryzyko i maksymalizuje “feedback loop”.

### Faza 0 — Uporządkowanie wejść (1–2 dni pracy, ale równolegle można już kodować)
1) Skataloguj istniejące logi/sesje (z proxy) i zrób z nich “golden set”:
   - nazwy sesji,
   - do czego służą,
   - checksumy.
2) Zaktualizuj `10_protokol_robocore_robokit.md` o:
   - block/avoid reason codes (na podstawie logów),
   - ewentualne dodatkowe porty,
   - przykłady request/response.

### Faza 1 — Proxy/Recorder (najpierw!)
Cel: narzędzie, które **zawsze** działa i daje powtarzalne dane.

Deliverables MVP:
- CLI + config file (MUST),
- log directory poza repo wg Twojego schematu (MUST),
- capture raw bytes w obie strony (MUST),
- warning o rozmiarze + archiwizacja (SHOULD),
- “golden pack” generator (MAY, ale bardzo przydatne).

Testy:
- unit: parsery, writer,
- integration: “proxy uruchomione → połączenie → zapis → archiwum → checksum”.

### Faza 2 — Robot-controller (smoke test protokołu)
Cel: udowodnić, że rozumiemy protokół i umiemy sterować jak Roboshop.

Deliverables:
- connect + goTarget(LM/AP) + stop + forkHeight,
- logowanie na dysk (komendy + statusy),
- replay (odtwarzanie sekwencji z capture).

Testy:
- na robokit-sim,
- opcjonalnie na real robocie (tylko w bezpiecznych warunkach).

### Faza 3 — Robokit-sim (albo dopięcie istniejącego)
Cel: środowisko testowe, które zachowuje się “jak robot” dla Roboshopa i Gateway.

Deliverables:
- implementacja minimalnych API: status + goTarget + forkHeight + stop + push (zgodnie z `10_*`),
- tryb “scripted” (odtwarzanie statusów z logów),
- tryb “simple physics” (opcjonalnie).

### Faza 4 — Fleet-gateway (HTTP + TCP)
Cel: stabilny most Core→RobotProvider.

Deliverables:
- HTTP `/gateway/v1/commands/dispatch` z idempotencją,
- provider switching,
- reconnect/retry/circuit breaker,
- capture debug na dysk.

Testy:
- golden TCP traces,
- chaos tests (dropy, partial frames).

### Faza 5 — Fleet-core (event sourcing + API)
Cel: “mózg” domeny i source of truth.

Deliverables:
- event log + snapshoty na dysk,
- import + activate sceny,
- `/state` + SSE,
- ControlLease,
- manual commands,
- minimal Task Runner (pickDrop) + integration z algo stub.

Testy:
- replay deterministyczny,
- scenariusze `18_*`.

### Faza 6 — Algorithm-service (stub → real)
Cel: wpiąć algorytm, ale nie blokować MVP.

Deliverables:
- endpoint `/algo/v1/decide`,
- kontrakty input/output,
- testy deterministyczne.

### Faza 7 — UI-frontend (na końcu)
Cel: wizualizacja i operator.

Deliverables:
- read-only widok stanu + mapa,
- przejęcie lease,
- manual goTarget/stop,
- podgląd tasków/robotów.

---

## 13) Czego brakuje do implementacji (lista “blokujących niejednoznaczności”)

1) **Proxy**: brak CLI/config/log format → blokuje wygodne RE i golden traces.
2) **Protokół**: brak rozczytanych reason codes dla block/avoid + brak decyzji jak to mapujemy do domeny (w MVP: “blocked → stop/hold + event”).
3) **Laser/sensory**: brak sesji capture i decyzji jak je archiwizujemy (nawet jeśli nie używamy w MVP).
4) **Statusy komend**: doprecyzować “ACK vs DONE” i to przetestować.

---

## 14) Co bym zrobił “już teraz”, żeby domknąć dokumentację przed wejściem w kod

Jeżeli celem jest “finalizacja spec → implementacja MVP”, to ja bym zrobił 3 małe poprawki w samej dokumentacji (w ramach v0.6):

1) Rozbudować `15_proxy_recorder.md` do specyfikacji operacyjnej (CLI + config + log layout + archiwizacja).  
2) Dodać do `18_scenariusze_e2e.md` dwa scenariusze: Proxy i Robot-controller.  
3) Dopisać w `10_protokol_robocore_robokit.md` sekcję “Block/Avoid/Sensors (TBD po capture)” z checklistą, co musi być potwierdzone.

To są zmiany małe objętościowo, ale robią z dokumentacji “narzędzie do budowy” — czyli dokładnie to, czego potrzebujesz przed pracą z Codexem na serio.

---
