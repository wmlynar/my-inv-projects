# Fleet Manager — dodatkowe usprawnienia: uproszczenie i „utwardzenie” systemu

To jest druga porcja pomysłów: bardziej „operacyjna” i „produkcyjna”. Pierwszy dokument dotykał głównie spójności ze spec (ErrorEnvelope, cursor/SSE, lease, uruchamianie stacku). Tutaj dokładam rzeczy, które zwykle *bolą dopiero po wdrożeniu*: bezpieczeństwo, observability, odporność na sieć i restart, jakość protokołów, ergonomia narzędzi, stabilność czasu, testy systemowe.

Wiele punktów da się zrobić **bez ciężkich zależności** (w duchu Twojego repo), a tam gdzie zależność realnie pomaga, zaznaczam opcję „A (bez deps) / B (z deps)”.

---

## 1) Bezpieczeństwo i kontrola dostępu (teraz API jest „otwarte”)

### 1.1. Authn/Authz — minimum, które ratuje przed katastrofą
W aktualnym stanie `fleet-core` i `fleet-gateway` zwracają CORS `*` i nie wymagają żadnej autoryzacji. W dev to OK, w realu to proszenie się o przypadkowe sterowanie.

**Co dodać**
- **Tryb „dev” vs „prod”** w configu (`security.mode = dev|prod`).
- W `prod`:
  - wymagaj `Authorization: Bearer <token>` albo `X-Api-Key`.
  - odmowa = ErrorEnvelope + 401/403.
- Role (nawet proste):
  - `viewer`: read-only,
  - `operator`: task create + lease,
  - `admin`: provider switch + „stop all”.

**Uproszczenie**: token statyczny w configu na start.  
**Docelowo**: integracja z OIDC (Keycloak/Google) albo mTLS (jeśli to sieć OT).

### 1.2. Audit log dla akcji ręcznych
W systemach fleet najważniejsze pytanie po incydencie brzmi: *kto kliknął i co wysłał?*

**Co logować**
- seize/renew/release lease,
- create task,
- manual robot command,
- provider switch,
- activate scene/map.

**Wystarczy JSONL** z:
- `ts`, `actor`, `action`, `target`, `requestId`, `commandId/taskId`.

### 1.3. Hardening HTTP: timeouts, limity, slowloris
W Node `http.createServer` bez ustawień jest podatny na „wolne” połączenia.

**Co ustawić w każdej usłudze**
- `server.requestTimeout`, `server.headersTimeout`, `server.keepAliveTimeout`
- limit jednoczesnych połączeń (chociażby proste liczenie socketów)
- sensowny `BODY_LIMIT` per endpoint

**Plus**: `readJsonBody()` nie powinno kończyć się resetem TCP. Lepiej:
- przestać czytać body,
- zwrócić `413 Payload Too Large` w spójnym envelope.

### 1.4. Bezpieczne serwowanie UI
W `fleet-ui/server.js` jest już `X-Content-Type-Options: nosniff` (dobrze). Warto jeszcze:
- dodać `Content-Security-Policy` (CSP) — nawet proste `default-src 'self'`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- ostrożnie z `decodeURIComponent` (może rzucić wyjątek przy złym % encoding) → try/catch i 400

---

## 2) Observability: logi, metryki, traceId (żeby debug nie był wróżeniem z fusów)

### 2.1. Jednolite `requestId/traceId` i propagacja między usługami
Masz w spec `traceId`, ale implementacje go nie trzymają. Zrób to konsekwentnie:

**Minimalny wzorzec**
- jeśli request ma `X-Request-Id`, przejmij,
- inaczej generuj (np. krótkie base32/hex),
- dodawaj do:
  - odpowiedzi (`X-Request-Id`),
  - logów,
  - ErrorEnvelope,
  - wywołań downstream (core → gateway → provider).

### 2.2. Logi strukturalne zamiast „console.log string”
Zewnętrzne narzędzia (ELK, Loki, CloudWatch) kochają JSON.

**Proponowany format**
```json
{"ts":"...","level":"INFO","svc":"fleet-core","reqId":"...","msg":"command_sent","robotId":"RB-01","commandId":"cmd_...","type":"goTarget"}
```

**Uproszczenie**: jeden helper `log.info(msg, fields)` w `packages/log-kit`.

### 2.3. Metryki (nawet minimalne)
Wystarczy endpoint `GET /metrics` (format Prometheus albo własny JSON). Kluczowe liczniki:
- `http_requests_total{route,code}`
- `commands_sent_total{type}`
- `commands_failed_total{reason}`
- `gateway_provider_status{robotId,provider,status}` (gauge)
- `core_tick_duration_ms` (histogram albo avg + max)
- `sse_clients` (gauge)

### 2.4. /health vs /ready
Dziel:
- `/health` = proces żyje,
- `/ready` = ma config, mapy, zależności, gateway reachable (opcjonalnie).

To ułatwia deploy pod orchestrator (systemd/k8s).

---

## 3) Odporność na sieć i „bursty”: kolejki, limity, retry, idempotencja

### 3.1. Wysyłka komend z core: kolejka + limit równoległości + breaker
W `fleet-core/server.js` tick wysyła komendy „w tle” i bez limitu. To może zrobić lawinę po reconnect.

**Ulepszenie**
- kolejka `commandOutbox`:
  - max inflight (np. 4),
  - max queue size (np. 1000),
  - odrzucanie z reason `OUTBOX_OVERFLOW` (z logiem)
- circuit-breaker per robot i/lub per gateway (wzorzec z `RobokitClient`)

### 3.2. Retry polityka powinna retry’ować też na błędy sieciowe
W `apps/fleet-gateway/lib/http.js` retry działa na statusy 502/503/504, ale gdy request rzuci wyjątek (timeout/ECONNRESET) — nie ma retry.

**Co poprawić**
- catch w `attemptRequest`, jeśli błąd jest retryable → retry
- whitelist retryable error codes (ECONNRESET, ETIMEDOUT, ECONNREFUSED)

### 3.3. Idempotencja end-to-end
Dedup w gateway działa, ale „prawdziwa idempotencja” wymaga:
- deterministycznych `commandId` (core),
- konsekwentnego zwracania ack (gateway),
- i najlepiej mapowania `commandId -> taskId/stepId`.

**W praktyce**
- `commandId = hash(taskId + stepId + attempt)` albo `taskId:stepId:attempt`
- loguj to w audit log i event log

### 3.4. Rate limiting na endpointy „niebezpieczne”
Przynajmniej:
- `POST /robots/*/commands`
- `POST /control-lease/*`
- `POST /provider-switch`

Rate limit nie musi być fancy:
- token bucket per IP / per API key.

---

## 4) Stabilność czasu: Date.now potrafi zdradzić

`Date.now()` może się cofnąć (NTP, ręczna zmiana czasu). Wtedy:
- lease może żyć dłużej,
- TTL-e i cooldowny się rozjadą,
- logi i cursor/time mogą „wariować”.

**Prosty pattern**
- do *timestampów* nadal używaj epoch ms (`Date.now()`),
- ale do *mierzenia odstępów* (TTL/cooldown) używaj monotonicznego zegara:
  - `performance.now()` w Node (z `perf_hooks`)
  - albo `process.hrtime.bigint()`

**Przykład**
- przechowuj `lease.expiresTsMs` (epoch) + `lease.expiresInMs` (monotonic delta)
- weryfikuj expiry przez monotonic delta, a epoch traktuj jako „informacyjne”.

---

## 5) Persistencja i recovery: restart nie może czyścić świata

Teraz state w core jest „w RAM”. To jest OK dla MVP, ale w prawdziwym świecie restart ≠ reset.

### 5.1. Event log + snapshot (na plikach, bez bazy)
Masz już katalogi w `fleet-init` (`core/events`, `core/snapshots`) — świetny fundament.

**Co dopisać**
- append-only `events.jsonl`:
  - `TASK_CREATED`, `TASK_ASSIGNED`, `COMMAND_SENT`, `LEASE_SEIZED`, …
- co N ticków snapshot `snapshot.json` (atomic: write tmp → rename)
- przy starcie:
  - wczytaj ostatni snapshot,
  - „dograj” eventy po snapshot cursor

To daje:
- możliwość odtworzenia,
- debug timeline,
- minimalny „state store” bez DB.

### 5.2. Atomiczne zapisy i file locking
Żeby nie zepsuć plików przy crashu:
- zapisuj do `*.tmp`, `fs.fsync` (opcjonalnie), potem `rename`
- rozważ lock file `core.lock` (żeby nie odpalić 2 instancji core na tym samym dataDir)

### 5.3. Migracje formatów danych
Dodaj w snapshot/meta:
- `schemaVersion`
- `appVersion`
- i prosty migrator (nawet if/else) przy wczytywaniu.

---

## 6) Kontrakt i kompatybilność: wersjonowanie API i schematów

### 6.1. Endpoint `GET /meta`
Każda usługa powinna zwracać:
- `name`, `version`, `build`, `gitCommit` (jeśli dostępne),
- `configHash`,
- `schemaVersions` (np. mapy/sceny).

To świetne w support/debug.

### 6.2. Nagłówki wersji
Dodaj:
- `X-Fleet-Api-Version: 1`
- `X-Fleet-Schema-Version: <...>`
- i strategię zgodności:
  - „minor compatible”, „major breaking”.

### 6.3. JSON Schema dla payloadów (nawet jeśli ręcznie)
**A (bez deps)**: walidacja ręczna + testy.  
**B (z deps)**: `ajv` + JSON schema.

Duży bonus: schemy można użyć do generowania dokumentacji i testów kontraktowych.

---

## 7) Uproszczenia architektoniczne: mniej kopii tego samego kodu

### 7.1. Jeden „core kit” dla usług HTTP
Widzisz to już po repo: `readJsonBody`, `sendJson`, CORS, parseArgs — kopiowane wiele razy.

**Zrób `packages/fleet-service-kit`**:
- `createServer({ routes, cors, limits, logger })`
- `readJsonBody(req, {limitBytes})`
- `sendErrorEnvelope(res, err, reqId)`
- `wrapAsync(handler)` (łapie wyjątki i zawsze odpowiada)

To od razu rozwiąże też problem z `async` handlerami w `http.createServer`: bez try/catch mogą generować unhandled rejections.

### 7.2. Jedno źródło prawdy dla configu (precedencja)
W całym repo przyda się stała reguła:
`defaults < config file < env < CLI flags`

I zawsze:
- `--config`
- `--print-effective-config`
- `--validate-config`
- `--explain-config`

---

## 8) Testy: z „unitów” do realnej pewności

### 8.1. Testy kontraktowe core↔gateway
Zrób zestaw „golden” request/response:
- core wysyła komendę,
- gateway zwraca ack w standardzie,
- błędy = ErrorEnvelope.

To wykryje regresje szybciej niż manual.

### 8.2. Testy chaos/integracyjne na symulatorach
Masz `robokit-robot-sim` i `robokit-rds-sim`. Idealne do:
- „robot offline w połowie zadania”
- „gateway timeout”
- „burst komend po reconnect”
- „dużo SSE klientów”

Nawet proste skrypty + asercje na logach/metrach zrobią różnicę.

### 8.3. Testy parserów i configu jako „fuzz”
Szczególnie `stripJsonComments/stripTrailingCommas` (i analogi) — to miejsca, gdzie łatwo o edge-case.
- generuj losowe stringi z komentarzami i escape
- sprawdzaj: brak crash, sensowne błędy

---

## 9) UX dla operatora: mniej klików, mniej pomyłek

### 9.1. „Fleet Doctor” (CLI)
Jedna komenda:
- sprawdza porty,
- odpytuje `/health` i `/ready`,
- sprawdza czy mapy/sceny istnieją w dataDir,
- robi „mini ping” do providerów,
- drukuje rekomendacje („gateway nie widzi robota RB-01 — sprawdź config”).

### 9.2. „Tryb szkoleniowy” w UI
Dla środowiska testowego:
- wyraźny banner „SIMULATION MODE”
- blokada provider-switch w UI (chyba że admin)
- ograniczenie manual commands do jednego robota naraz

### 9.3. Lepsze komunikaty dla człowieka
W UI i API:
- zamiast `invalid_command` → „Brakuje targetRef.nodeId dla goTarget”
- link do docs reason codes / troubleshooting

---

## 10) Mapy i sceny: pipeline, walidacja, wersjonowanie

### 10.1. Spójny „import” sceny
Teraz import sceny w core jest symboliczny. W realu przyda się:
- paczka (zip/tar) albo katalog sceny w dataDir
- manifest z `schemaVersion`, `sceneId`, `maps[]`, `workflows[]`
- walidacja i checksumy

### 10.2. Map-compiler jako etap w pipeline
Uproszczenie pracy:
- `fleet scene import` może:
  - wykryć mapy `.smap`,
  - uruchomić kompilator,
  - zarejestrować compiledMap w repo sceny,
  - dopiero potem `activate`.

### 10.3. Walidacja „czy mapa pasuje do robota”
Masz robot profile i compile params — dodaj check:
- rozmiary, promień skrętu, inflacje,
- zgodność jednostek (m vs mm),
- brak self-intersections.

---

## 11) Deployment i operacje: jak to uruchamiać „na serio”

### 11.1. Profile uruchomienia
Zrób profile:
- `local-sim`
- `robokit-sim`
- `robocore`
- `prod-minimal`

I jedna komenda:
- `node bin/fleet-up.js --profile robokit-sim`

### 11.2. systemd runbooks (minimal)
Jeśli to ma żyć na maszynie:
- unit files,
- log rotation,
- katalog dataDir z uprawnieniami,
- backup/restore snapshotów.

### 11.3. Backup i retencja
Zwłaszcza jeśli robisz event log:
- retencja (np. 7 dni),
- archiwizacja (zip),
- szybki restore.

---

## 12) Konkretne „małe” bug-prewencje z obecnego kodu

1. **`async` handler w `http.createServer`**  
   Gdy `await gateway.listRobots()` rzuci wyjątek, może polecieć unhandled rejection. Owiń cały routing w `try/catch` i zawsze odpowiedz 500 (ErrorEnvelope).

2. **`decodeURIComponent` w UI**  
   Potrafi rzucić wyjątek przy niepoprawnym `%xx`. To potrafi ubić request handler. Dodaj try/catch i 400.

3. **`readJsonBody` z `req.destroy(err)`**  
   Klient dostaje reset połączenia zamiast sensownego 413. Lepszy jest kontrolowany błąd + envelope.

4. **Brak agent keep-alive w klientach HTTP**  
   Przy tickach i częstych requestach połączenia będą się mielić. Rozważ `new http.Agent({ keepAlive: true })`.

5. **Wiele kopii „JSON5” parsera i niespójności**  
   W jednym miejscu jest bug z `'\\'` jako „escape” (w proxy-recorder). Warto mieć jedno, wspólne, dobrze przetestowane rozwiązanie.

---

## Proponowany „pakiet utwardzenia” w 7 krokach (kolejność daje szybkie efekty)

1) `service-kit`: wrapAsync + requestId + timeouts + 413  
2) Auth (API key) + audit log  
3) command outbox + concurrency limit + retry on network errors  
4) event log + snapshot + recovery  
5) /metrics + /ready + meta/version  
6) JSON schema (walidacja) + kontrakt tests  
7) profile uruchomienia + fleet doctor + runbooks deploy

---

Jeśli chcesz, ten dokument da się od razu przerobić na checklistę (GitHub issues) albo na ADR-y (Architecture Decision Records), żeby decyzje (np. „zero deps vs ajv”) nie ginęły w historii commitów.
