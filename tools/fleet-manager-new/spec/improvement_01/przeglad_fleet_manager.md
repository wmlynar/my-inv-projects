# Przegląd projektu Fleet Manager — braki, usprawnienia, odporność, dokumentacja, UX

Poniżej masz możliwie „bezlitosny, ale konstruktywny” przegląd tego repo — patrzę na to jak na produkt, który ma wejść w tryb **serwis + operacje + użytkownicy**, a nie tylko „działa mi lokalnie”. Odnoszę się do tego, co widać w kodzie (`apps/fleet-core`, `apps/fleet-gateway`, `apps/fleet-ui`, `apps/map-compiler`, `apps/proxy-recorder`, `spec/*`) i gdzie widać luki/spięcia.

---

## Co już jest mocne (i warto to utrzymać)

1. **Masz bardzo solidne `spec/*`** – to nie jest „README na pół strony”, tylko realna specyfikacja systemu (glosariusz, kontrakty, reason codes itd.). To ogromna przewaga.
2. **Map-compiler ma testy i realną logikę** (nie tylko skeleton). To dobry wzorzec: ma CLI, config, artefakty, testy.
3. **proxy-recorder wygląda jak narzędzie „produkcyjne w dev”**: rotacja JSONL, manifesty, runbook, sensowne flagi. To jest poziom, do którego reszta komponentów powinna dążyć.
4. **`robokit-lib/RobokitClient` ma retry/backoff/circuit-breaker/limit concurrency** – to jest dokładnie ta klasa „odporności”, którą warto skopiować jako wzorzec na resztę połączeń (HTTP też).

---

## Największy problem: spec jest „kanoniczna”, a implementacja API jeszcze nie jest spójna ze spec

### 1) ErrorEnvelope vs aktualne błędy w API

W `spec/99_pozostale.md` masz kanoniczny **ErrorEnvelope** (z `error.code`, `causeCode`, `traceId` itd.).  
W implementacji `fleet-core/server.js` i `fleet-gateway/server.js` błędy lecą jako proste:
- `{ error: "invalid_json" }`,
- `{ error: "robot_not_found" }`,
- czasem plain text.

**Co poprawić**
- Zrób **jedno, wspólne helper API**: `sendOk()`, `sendError()` i wszędzie zwracaj ErrorEnvelope.
- Ustal jeden katalog `error.code` (ze spec) i mapowanie na HTTP status (też jest w spec).
- Dodaj `causeCode` i `details` tam, gdzie ma to sens (np. walidacja pól).
- To od razu:
  - stabilizuje kontrakt dla UI i integracji,
  - ułatwia debug,
  - umożliwia testy kontraktowe.

### 2) Identyfikatory: spec mówi ULID, a kod generuje własne ID

W kodzie jest `createId(prefix)` z timestampem i losowym hexem. To nie jest ULID.

**Co poprawić**
- Albo (A) przejdź na ULID (wspólny generator w `packages/*`),  
- albo (B) jeśli zostajesz przy „no dependencies”, to:
  - nazwij to uczciwie w spec (“ID format v0”) i dodaj plan migracji,
  - zadbaj o sortowalność i unikalność (jest w miarę OK, ale to nie ULID).

### 3) `cursor` w Core

`fleet-core` w `GET /api/v1/state` zwraca `cursor: 0` na stałe. Stream SSE też nie niesie kursora jako ID zdarzenia.

**Co poprawić**
- `cursor` powinien być monotoniczny (spec to zakłada).  
- SSE powinno wysyłać `id: <cursor>` + eventy, żeby klient mógł się wznowić przez `Last-Event-ID`.
- To poprawia odporność (reconnect UI bez utraty kontekstu).

### 4) Lease (seize/renew/release) ma `expiresTsMs`, ale brak egzekwowania

W `fleet-core/server.js` lease ma expiry, ale brakuje logiki:
- kasowania lease po czasie,
- blokowania sterowania/komend po wygaśnięciu,
- różnicowania uprawnień (kto ma lease może wysyłać, reszta read-only).

**Co poprawić**
- W ticku (albo przed obsługą requestów) sprawdzaj expiry i czyść lease.
- Każdy endpoint „mutujący” (task create / command / import scene / activate) powinien:
  - wymagać ważnego lease **albo** jawnego trybu „dev-no-lease”.
- W odpowiedzi błędu użyj `conflict`/`notAllowed` z `causeCode`.

---

## Spójność repo: brakuje „warstwy repozytorium”, czyli tego co robi wrażenie profesjonalnego projektu

### 1) Brak top-level README

Masz README w podaplikacjach, ale **brakuje jednego głównego README**, które odpowiada na:
- co to jest,
- jakie są komponenty,
- jak odpalić minimalny stack,
- jak odpalić pełny stack,
- gdzie są konfiguracje,
- jakie są porty,
- jak odpalić testy,
- gdzie jest troubleshooting.

### 2) Brak jednolitego uruchamiania całego stacku

Masz `bin/fleet-init.js` (super), ale nie ma odpowiednika:
- `bin/fleet-up` / `make up` / `docker compose up`,
- ani „jednym poleceniem odpal wszystko i pokaż status”.

**Co zrobić (bez ciężkiej infrastruktury)**
- Dodaj `bin/fleet-up.js`, który:
  - odpala `fleet-ui`, `fleet-gateway`, `algorithm-service`, `fleet-core`,
  - czeka aż healthchecki przejdą,
  - wypisuje czytelnie URL-e,
  - robi graceful shutdown na SIGINT.
- Dodaj `bin/fleet-status.js` który odpytuje `/health` i drukuje tabelkę.

**Co zrobić (bardziej „produkcyjnie”)**
- Dodaj `docker-compose.yml` (nawet minimalny).
- Dodaj `Makefile` z celami: `make init`, `make up`, `make test`.

### 3) Brak CI (choć masz testy)

Masz testy w `map-compiler` i `fleet-core`, ale brakuje warstwy „gates”:
- `npm test` na repo,
- pipeline (lint/test),
- raport coverage,
- formatowanie (prettier/eslint) – albo przynajmniej spójna konwencja.

**Minimalny, tani zestaw**
- Jeden skrypt `./scripts/test-all.sh` który leci po aplikacjach i odpala ich testy.
- GitHub Actions: node matrix, `test-all.sh`.
- Dodaj `.editorconfig`.

---

## Duży „profesjonalizator”: wspólne biblioteki dla config/CLI/http/error/logging

W kodzie powtarzają się rzeczy 1:1:
- `parseArgs()`, `toBool()`, `expandHome()`, `resolveFleetDataDir()`,
- `loadConfig()` + pseudo-JSON5 parser.

To rozwala spójność i prowadzi do „prawie tak samo, ale jednak inaczej” między usługami.

### 1) Wspólne `packages/cli-kit`

Zrób paczkę np. `packages/fleet-cli-kit` i przenieś tam:
- parser args (z normalnym `--help`, komendami i walidacją),
- logowanie do stdout w formacie (np. `INFO/WARN/ERROR`),
- wspólne rozwiązywanie `FLEET_DATA_DIR`, `FLEET_CONFIG`, `--config`.

Efekt: każda usługa ma identyczny UX CLI.

### 2) Wspólne `packages/config`

Obecnie pliki nazywają się `.json5`, ale parser wspiera głównie *„JSON + komentarze + trailing commas”* (nie pełny JSON5: unquoted keys, single-quoted strings itd. i tak nie przejdą przez `JSON.parse`).

**Masz tu dwie sensowne drogi:**
- (A) używać prawdziwego JSON5 parsera i wtedy `.json5` jest prawdą,
- (B) zostać przy „JSONC” i:
  - zmienić rozszerzenia na `.jsonc` **albo**
  - w dokumentacji napisać wprost „to jest JSON + komentarze + trailing commas; bez pełnego JSON5”.

**Dodatkowo ważne:** w `apps/proxy-recorder/lib/helpers.js` jest subtelny błąd: sprawdzanie escape jest tam zrobione przez porównanie do `'\\'` (ciąg dwóch backslashy), a `ch` jest pojedynczym znakiem — więc escape w stringach praktycznie nie działa. To może rozwalić usuwanie komentarzy, jeśli ktoś ma np. `\"` w stringu. W innych config loaderach bywa to zrobione poprawnie (`'\'`). Warto to ujednolicić i poprawić.

### 3) Wspólne `packages/http-client`

Masz:
- `fleet-gateway/lib/http.js` (retry, timeout),
- `fleet-core/mvp0/gateway_client.js` (prosty POST bez retry/backoff),
- plus logika w `robokit-lib`.

To powinno być spójne:
- jedna implementacja retry/backoff,
- limit concurrency,
- konsekwentne timeouts,
- standardowy format błędu (ErrorEnvelope).

---

## Odporność na błędy: konkretne „dziury” i jak je załatać

### 1) Backpressure i „flood” komend

W `fleet-core` tick leci co `tickMs` i może wysyłać komendy. Jeśli gateway/robot jest niedostępny, grozi:
- spam retry na poziomie TCP,
- kolejki w systemie,
- log spam.

**Rozwiązanie**
- Wprowadź kolejkę wysyłki komend z limitem równoległości (wzorzec jak `RobokitClient.maxConcurrent`).
- Dodaj circuit-breaker na gateway (jeśli 5 błędów → pauza na 5s).
- Dodaj rozróżnienie błędów: retryable vs permanent.

### 2) Idempotencja komend i deduplikacja

Gateway ma `commandDedupTtlMs`. Żeby to działało dobrze:
- Core musi generować stabilne `commandId` (np. zależne od `taskId + stepId + attempt`),
- a nie losowe per request.

W DCL runtime i MVP0 runtime jest dedup przez `commandCooldownMs` i klucz (type/node/height). To jest „soft”, ale nie jest twardą idempotencją.

**Co poprawić**
- Każdy krok taska powinien mieć deterministyczne `commandId`.
- Gateway dedup wtedy staje się realnym zabezpieczeniem na retry.

### 3) Walidacja requestów „anti-footgun” (spec mówi MUST)

Spec mówi o odrzucaniu nieznanych pól itd. W serwerach HTTP praktycznie tego nie ma.

**Co poprawić**
- Dodaj walidację wejścia:
  - minimalnie ręcznie (sprawdź znane pola),
  - docelowo schema validation (JSON Schema / ajv albo zod + generowanie JSON schema).
- Ujednolić to w helperach: `validate(body, schema)`.

### 4) SSE: reconnect, event id, heartbeat

SSE w core:
- `/api/v1/stream` wysyła state, ale bez `id`.
- `/api/v1/events` to właściwie heartbeat demo.

**Co poprawić**
- Rozdziel:
  - `events` = log zdarzeń domenowych (task created, task assigned, lock wait, command sent),
  - `state` = snapshot okresowy.
- Dodaj:
  - `id: cursor`,
  - obsługę `Last-Event-ID`,
  - heartbeat,
  - limit klientów / cleanup na błędach.

### 5) Graceful shutdown

Serwery odpalają `setInterval` i `server.listen`, ale brakuje:
- obsługi SIGINT/SIGTERM,
- zamykania serwera,
- czyszczenia timerów,
- flush log sink.

**Co poprawić**
- Każda usługa: `process.on('SIGINT')`, `server.close()`, stop timers, zamknij zasoby.
- W log sink lepiej mieć `createWriteStream` + kolejkę + rotację (proxy-recorder jest dobrym wzorem).

---

## Architektura produktu: czego brakuje „funkcyjnie” vs spec

### 1) algorithm-service jest stub

`/algo/v1/decide` zwraca `decisions: []`. To OK jako placeholder, ale w dokumentacji powinno być jasno:
- „to jest stub, core używa lokalnego orchestratora” **albo**
- „core ma przełącznik, żeby użyć zewnętrznego algo-service”.

**Profesjonalny ruch**
- Dodaj w core `runtime.mode = dcl|mvp0|remoteAlgo` i dla `remoteAlgo`:
  - core wysyła snapshot do algo-service,
  - algo zwraca decyzje,
  - core egzekwuje.

### 2) roboshop-bridge jest „not_implemented”

CLI drukuje `status: not_implemented`. Brakuje:
- tabeli “Implementation status” w dokumentacji,
- planu etapów.

**Dodaj do docs**
- `docs/implementation-status.md`:
  - komponent → status (done/partial/stub),
  - czego brakuje,
  - linki do issue/roadmap.

### 3) Scene import/activate w core jest “pamięć procesu”

Endpointy istnieją, ale:
- brak trwałego scene store,
- brak prawdziwego importu paczki scene,
- brak walidacji manifestu.

Masz w spec dobre wymagania dot. scen — brakuje „bridge” między spec a kodem.

---

## UX / łatwość użycia: jak zrobić, żeby człowiek to pokochał, a nie tylko tolerował

### 1) „One-liner” start

Największy UX killer w systemach wielousługowych: „odpal 5 rzeczy w 5 terminalach”.

**Cel**
- `node bin/fleet-init.js`
- `node bin/fleet-up.js`
- otwierasz UI i działa.

Dla power-userów: `--profile local-sim|robokit-sim|robocore`.

### 2) Samoopisująca konfiguracja

Konfiguracja powinna być:
- walidowana (schema),
- dokumentowana automatycznie,
- z sensownymi defaultami.

**Praktycznie**
- Dodaj `--print-effective-config` wszędzie (już masz),
- dodaj `--validate-config`,
- dodaj `--explain-config` (drukuje komentarz do pól).

### 3) Lepsze komunikaty błędów w CLI

Zamiast „config not found”:
- pokaż *jakie ścieżki były sprawdzane*,
- pokaż „run fleet-init”,
- dodaj sugestię „FLEET_DATA_DIR=…”.

### 4) UI: trzy rzeczy, które robią różnicę

- **Globalny status zdrowia** (Core/Gateway/Robots/Algo) w jednym miejscu:
  - zielony/żółty/czerwony,
  - klik → szczegóły (ostatni błąd, timestamp, retry).
- **Wyjaśnialność**: pokaż *dlaczego robot stoi*:
  - `WAIT_CORRIDOR_DIR`, `WAIT_NODE_STOP_ZONE`, `offline`, `blocked`, `no_route`,
  - i link do doc “Reason codes”.
- **Tryb „safe manual”**:
  - UI przejmuje lease,
  - manual commands tylko dla jednego robota,
  - duży przycisk “STOP ALL” (z rate-limit i potwierdzeniem).

---

## Dokumentacja: co dopisać, żeby było „profesjonalnie”

Masz specyfikację architektury — super. Teraz potrzebujesz dokumentacji „operacyjno-użytkowej” i „developerskiej”.

### 1) Top-level `README.md` (must-have)

Sekcje:
- **What is this**
- **Quickstart**
- **Ports**
- **Repo layout**
- **Run profiles**
- **Troubleshooting**
- **Where to read the spec**

### 2) `docs/runbooks/` dla każdej usługi

Każda usługa powinna mieć krótki runbook:
- jak odpalić,
- jak sprawdzić health,
- gdzie są logi,
- jakie są znane failure modes,
- jak zebrać diagnostykę.

### 3) `docs/api/` z przykładami request/response

- curl examples,
- przykładowe payloady,
- lista error codes (z opisem “co to znaczy i co robić”).

Bonus: OpenAPI (choćby ręcznie na start).

### 4) `docs/architecture/` — krótkie streszczenie

- 1 strona “System in 10 minutes”,
- diagramy,
- przepływy: “create task → dispatch → command → status”.

### 5) “Implementation status” + roadmap

Jasno:
- co działa,
- co jest stub,
- co jest planowane.

### 6) “Data formats” jako żywe przykłady

- folder `examples/` z minimalnymi, poprawnymi plikami,
- test “examples are valid” (CI),
- krótki opis różnic.

---

## Małe, ale konkretne poprawki jakości kodu (które robią robotę)

1. **Ujednolić CORS i nagłówki**  
   Spójne metody i nagłówki w całym API.
2. **Limity payloadów i poprawne statusy**  
   Zamiast resetu połączenia: `413 Payload Too Large` w ErrorEnvelope.
3. **Zamiana `appendFileSync` na streaming tam, gdzie to gorące**  
   Tick nie powinien blokować na I/O.
4. **Wyciągnąć „magic numbers” do config**  
   SSE ping interval, body limit, retry/backoff itd.
5. **Konsekwentne nazewnictwo portów i usług**  
   Jedna tabela portów i trzymanie się jej w przykładach.

---

## Proponowana kolejność prac (żeby nie ugrzęznąć)

1) **Repo-level: README + one-liner start + status**  
2) **ErrorEnvelope + requestId/traceId**  
3) **Cursor + SSE id + reconnect**  
4) **Lease expiry + enforcement na mutacjach**  
5) **Wspólne `cli-kit` + `config` + poprawka parsera JSONC w proxy-recorder**  
6) **Backpressure/circuit breaker na wysyłce komend z core**  
7) Dopiero potem: większe refaktory (framework HTTP, OpenAPI generacja, remote algo)

---

## Najkrótsza wersja: “czego brakuje”

- brak top-level README i uruchamiania stacku jednym poleceniem,
- brak spójnego ErrorEnvelope i reason codes w realnych odpowiedziach API,
- brak prawdziwego `cursor` i wznowienia SSE,
- lease nie wygasa/nie jest egzekwowany,
- brak walidacji requestów wg zasad ze spec,
- duplikacja config/CLI helpers (i drobny bug w proxy-recorder parserze),
- brak CI gate na testy (mimo że testy istnieją),
- część komponentów nadal stub (`algorithm-service`, `roboshop-bridge`).

---

Największa magia dzieje się w: **spójne błędy + traceId + event log + cursor + łatwe uruchamianie**. Reszta (frameworki, refaktory, ładniejszy UI) to etap drugi, gdy fundament jest już twardy.
