# Recenzja — Fleet Manager 2.0: Specyfikacja architektury (v0.3)

**Recenzowany dokument:** „Fleet Manager 2.0 — Specyfikacja architektury (v0.3 / draft)”  
**Zakres recenzji:** architektura, kontrakty danych, API Core/Gateway, protokoły integracyjne, odporność, testy, MVP.  
**Data recenzji:** 2026-01-06

---

## Prompt, który spowodował wygenerowanie tej recenzji

```text
tu masz kolejna wersje specyfikacji: architektura fleet manager 0.3

chcialbym zebys przygotowal recenzje tej specyfikacji (recensje specyfikacji architektura fleet manager 0.3):
- co bys w niej jeszcze poprawil
- jakie bledy widzisz
- co bys ulepszyl
- jak bys zrobicl zeby byla future proof
- jak bys zrobil, zeby byla lepszej jakosci
- jak bys zrobil zeby byla bardziej projesjponalna
- jak bys zrobil, żeby była bardziej odporna na wszelkiego typu bledy
- jak bysmy zrobili, zeby lepiej sie nadawala do pracy z AI

warto sie zastanowic na jakie plliki podzielic ta duza specyfikacje, zeby pracowac dalej z mniejszymi dokumentami

prosze przeslij swoja recenzje specyfikacji architektury 0.3 wedlug powyzszych punktow. i przeslij link do pliku .md do pobrania tej recenzji. niech w tym dokumencie bedzie tez zalaczony prompt
```

---

## Największe plusy v0.3 (co już jest „na poziomie”)

1. **Wyraźne rozdzielenie Core vs Gateway** (osobne basePath `/api/v1` vs `/gateway/v1`) i granice odpowiedzialności.
2. **Control Lease („seize control”)** jako prosty i skuteczny mechanizm multi‑UI w MVP (mniej konfliktów niż ETag/If‑Match w pierwszym kroku).
3. **Data Contracts** w duchu „spec, nie opis” (Pose2D, ErrorEnvelope, EventEnvelope, SceneManifest, itd.) + JSON5 przykłady.
4. **Scene Activation** opisane proceduralnie (preflight → swap → rollback) + twarde wymagania dot. logów i snapshotów na dysk.
5. **Event log + snapshoty + replay** jako element obowiązkowy (świetne dla debug i pracy z AI).
6. **Reason codes** jako kanon (bardzo pomaga w UI, logach i testach).
7. **Minimalny kontrakt integracyjny algorytmu** (scene context + tick snapshot + decision) — to jest dokładnie to, czego brakowało w wielu poprzednich podejściach.

To już jest dokument, z którego da się implementować bez „dopowiadania w głowie”.

---

## 1) Co bym w niej jeszcze poprawił

### 1.1 Ujednolicić semantykę „eventów” (SSE) vs „eventów” (EventEnvelope)
W SSE masz trzy eventy transportowe: `snapshot`, `delta`, `heartbeat`. Jednocześnie masz „katalog eventów” jako `EventEnvelope.type` (np. `robotStateUpdated`, `commandCreated`, itd.).

To jest poprawne, ale **łatwo o pomyłki implementacyjne** i dublowanie logiki.

**Propozycja:** wprowadzić jedną, kanoniczną regułę:
- albo SSE zawsze niesie *tylko* `EventEnvelope` (wtedy `snapshot` jest eventem typu `stateSnapshot`),
- albo zostawić rozdział, ale dopisać jasne zasady:
  - `snapshot` w SSE **nie jest** EventEnvelope i **nie jest** zapisywany do event log (zamiast tego zapisujesz plik snapshot + EventEnvelope `snapshotEmitted`),
  - `delta` **zawsze** jest `EventEnvelope`,
  - `heartbeat` to transport/keepalive, nie domena.

### 1.2 Doprecyzować „atomiczność” snapshot + cursor
Wymagasz, aby `cursor` był globalny, monotoniczny i persistowany, oraz aby na connect SSE serwer wysyłał `snapshot` jako pierwsze zdarzenie.

Dołóż jeszcze jedną normatywną zasadę (to ważne dla poprawności klienta):
- `snapshot.cursor` **MUST** odpowiadać dokładnie „punktowi w logu”, po którym kolejne `delta` zaczynają się od `cursor+1`, bez okna wyścigu.

To praktycznie wymusza mechanikę: generujesz snapshot w tej samej „transakcji” co zapis eventów (albo blokujesz event loop na czas „capture state”).

### 1.3 Uściślić definicję „mutating endpoint”
W dokumencie jest: „mutacje wymagają `X-Control-Lease-Id`”. To jest dobra zasada, ale warto dodać listę:
- które endpointy są *read-only*,
- które są *mutating*,
- które są „mutating but lease-exempt” (np. `seize`).

To pomaga uniknąć przypadkowego „dziurawego” endpointu w implementacji.

### 1.4 Dopisać „HTTP status code mapping” dla `ErrorEnvelope.code`
Masz świetną listę `ErrorEnvelope.code`, ale brakuje mapowania na kody HTTP. To poprawia profesjonalność i ułatwia integracje.

Minimalne mapowanie (przykład):
- 400: `BAD_REQUEST`, `VALIDATION_FAILED`
- 403: `CONTROL_LEASE_REQUIRED`, `CONTROL_LEASE_INVALID`, `CONTROL_LEASE_FORCE_DISABLED`
- 404: `SCENE_NOT_FOUND`, `ROBOT_NOT_FOUND`
- 409: `CONTROL_LEASE_HELD`, `SCENE_ACTIVATION_IN_PROGRESS`
- 422 (opcjonalnie) dla walidacji domenowej
- 503: `STORAGE_UNAVAILABLE`
- 500: `INTERNAL_ERROR`

### 1.5 Dopisać „limits & defaults” jako tabelę konfiguracyjną
W wielu miejscach masz parametry (timeouts, `statusAgeMaxMs`, `rtp.timeoutMs`, limity parsera, itp.). Warto zebrać to w jedną sekcję:
- nazwa parametru,
- jednostka,
- domyślna wartość,
- zakres,
- wpływ na safety.

To redukuje „magiczne liczby” w implementacji i ułatwia tuning.

### 1.6 Zasada „strict request validation” vs pliki sceny/formaty zewnętrzne
Masz bardzo dobrą zasadę: „server MUST odrzucać requesty z nieznanymi polami”.  
Jednocześnie `graph.json` i inne pliki mogą zawierać pola zewnętrzne, których nie kontrolujesz.

**Warto dopisać wyjątek/rozróżnienie:**
- **Public API request bodies**: `additionalProperties=false` (strict)
- **Importowane pliki sceny (graph/worksites/streams/robots)**: parser **MAY** tolerować nieznane pola, o ile są „external” i zachowane do round-trip / ignorowane bezpiecznie.

W przeciwnym razie łatwo zablokować import mapy z Roboshopa, bo „meta.source” albo inne pola nie pasują do schemy.

---

## 2) Jakie błędy widzę (albo miejsca, które łatwo staną się błędem)

Tu traktuję „błąd” jako: **spec prowadzi do niejednoznacznej implementacji lub do realnego potknięcia.**

### 2.1 `Last-Event-ID` vs `fromCursor` — brak reguły precedencji
W SSE deklarujesz wsparcie dla `Last-Event-ID` i/lub `fromCursor`. Brakuje:
- które ma pierwszeństwo, jeśli oba są podane,
- czy `Last-Event-ID` ma być równy `cursor` z `EventEnvelope`,
- czy `snapshot` ma wysyłać `id:` w SSE (a jeśli tak — jakie).

To może skończyć się tym, że UI „czasem” wznawia poprawnie, a czasem robi pełny resync.

**Minimalna poprawka:** dopisać 3 reguły:
1) jeśli jest `fromCursor`, ignoruj `Last-Event-ID` (lub odwrotnie),  
2) `id:` w SSE dla `delta` **MUST** = `EventEnvelope.cursor`,  
3) `snapshot` **MUST** ustawić `id:` = `snapshot.cursor` (albo MUST NOT ustawiać id w snapshot — ale wtedy `fromCursor` jest jedyną drogą).

### 2.2 Idempotencja: brak jasnej semantyki „replay response”
Wymagasz idempotencji `(X-Client-Id, X-Request-Id)` dla mutacji, ale spec nie mówi:
- czy serwer zwraca *dokładnie tę samą odpowiedź* przy replay,
- jak długo przechowuje wpisy,
- co zwraca, gdy wpis z TTL wygasł.

To jest krytyczne dla implementacji UI i retry.

**Propozycja:** dopisać:
- „idempotency ledger stores: status code + response body + response headers, TTL configurable”
- serwer MAY dodać nagłówek `X-Idempotent-Replay: true`.

### 2.3 PATCH semantics: ryzyko przypadkowego „nadpisania” stanu
W `PATCH /worksites/<built-in function id>` mówisz: „pola nieobecne nie mogą być nadpisywane”. Super.  
Ale to wymaga konkretnego podejścia w walidacji i implementacji patcha.

**Doprecyzuj w spec:**
- patch jest „merge patch” (RFC 7386), czy własny,
- jak traktujesz `null` (czy `null` usuwa pole, czy jest wartością),
- czy dozwolone są partial nested updates.

Bez tego ktoś zrobi `state = body.state` i przypadkiem wyzeruje `isBlocked` itd.

### 2.4 RoboCore framing — nadal ryzyko „wariantów”
Masz już doprecyzowany framing (super), ale sam dokument zaznacza, że to reverse engineered i może się zmienić. To jest OK, ale w MVP warto explicit dodać:
- Gateway **SHOULD** umieć wykryć/odrzucić ramek wariantowych (np. inny `jsonSize`), z czytelnym error code i capture.

To nie jest błąd, ale *szczelina*, która w polu potrafi boleśnie kosztować czas.

---

## 3) Co bym ulepszył (żeby implementacja była mniej ryzykowna)

### 3.1 „Command lifecycle” jako osobna sekcja z maszyną stanów
Masz `CommandRecord` i minimalne statusy, ale warto dopisać docelową maszynę stanów wprost (nawet jeśli MVP implementuje podzbiór).  
To robi porządek w:
- retry,
- dedupe,
- UI feedback,
- rozróżnianiu „accepted vs dispatched vs executed”.

### 3.2 „Safety gate” (walidacje przed wysłaniem komendy)
Wspominasz o walidacjach safety, ale warto dopisać minimalne MUST:
- nie wysyłamy komendy ruchu gdy robot `offline/fault/emergencyStop`,
- nie wysyłamy RTP częściej niż `rtp.updateHz`,
- STOP ma priorytet i przerywa inne kolejki.

### 3.3 „Single-writer / serialized mutations” jako reguła architektoniczna
Żeby uniknąć wyścigów między:
- API requestami,
- telemetrią z Gateway,
- tickami algorytmu,
- scene activation,

dopisz normatywnie:
- Fleet Core **MUST** serializować wszystkie mutacje stanu (np. jedna kolejka zdarzeń / event loop) i logować je w jednej osi czasu (`cursor`).
- Algorytm tick **MUST** dostać spójny snapshot w danym `tick`.

To jest małe zdanie, ale ono „ustawia” całą implementację.

### 3.4 „Compatibility envelope” dla danych zewnętrznych
W Gateway w `raw` zwracasz snake_case external — świetnie do debug, ale w spec dopisz:
- `raw` jest **debug-only** i MAY być wyłączone w prod,
- `raw` nie podlega kontraktowi stabilności (przeciwnie do kanonicznych pól).

To chroni Cię przed niechcianym „uzależnieniem” UI od raw.

---

## 4) Jak bym zrobił, żeby była future‑proof

### 4.1 Wprowadzić pojęcie `epoch` dla event stream (bez zmiany MVP)
Masz globalny `cursor` persistowany — super. Future-proof dla HA i restartów:
- dodaj w `EventEnvelope` i `/state` pole `epochId` (np. UUID zmieniany przy starcie instancji),
- klient na zmianę epoch robi resync snapshot.

To upraszcza semantykę „co jeśli cursor jednak się zresetuje”.

### 4.2 Scene revision jako „niepodrabialny identyfikator”
Masz hashe plików w `SceneManifest`, ale warto dodać:
- `sceneRevisionId` = hash manifestu (lub całego pakietu),
- `/activate` może przyjmować opcjonalnie `sceneRevisionId` i odrzucać, jeśli w międzyczasie scena się zmieniła.

To zapobiega aktywacji „podmienionej” sceny w trakcie deploy.

### 4.3 Plugin boundaries: przygotuj port na „external algorithm process”
W MVP algorytm jest pluginem w tym samym procesie. To OK. Future-proof:
- dopisz w ADR, że docelowo algorytm MAY działać jako oddzielny proces i gadać przez ten sam `AlgorithmInputSnapshot/Decision` (np. przez HTTP/stdio/msgpack).
- zostaw w kodzie „port” (interfejs) na to już teraz.

### 4.4 Capabilities negotiation: zostawić tylko minimalny „slot”
Masz `capabilities` w `RobotConfig` — świetnie. Future-proof to:
- dopisać, że gateway MAY aktualizować `capabilitiesObserved` (z telemetrii),
- a Core używa `effectiveCapabilities = config ∩ observed`.

To da Ci miękką drogę na roboty, które „twierdzą, że potrafią”, ale w praktyce nie.

---

## 5) Jak bym zrobił, żeby była lepszej jakości (bardziej jednoznaczna i testowalna)

- Dodać sekcję „**Invariants**” (rzeczy, które zawsze muszą być prawdą), np.:
  - jeden aktywny scene,
  - jeden aktywny lease,
  - cursor zawsze rośnie,
  - commandId globalnie unikalne,
  - każdy event zapisany do logu ma odpowiadający mu cursor.
- Dodać **tabele enumeracji** w jednym miejscu (statusy robotów, tasków, provider switch states) i konsekwentnie używać.
- Dodać **contract fixtures** jako artefakty repo:
  - `contracts/examples/*.json5`,
  - `contracts/schemas/*.json`,
  - test, który sprawdza: „każdy przykład przechodzi walidację schemy”.
- Dodać sekcję „**Backpressure**” dla SSE i dla telemetrii z Gateway:
  - co jeśli klient nie nadąża,
  - co jeśli eventlog rośnie szybciej niż zapis na dysk,
  - limity buforów i degradacja.

---

## 6) Jak bym zrobił, żeby była bardziej profesjonalna

- Dopisać „Document control” (właściciel, changelog, status) i od razu przenieść decyzje do `docs/adr/`.
- Wydzielić „Runbook MVP”:
  - jak uruchomić,
  - gdzie są logi/snapshoty,
  - co zrobić po `STORAGE_UNAVAILABLE`,
  - jak zebrać paczkę diagnostyczną (snapshot + eventlog tail + config).
- Dodać „Observability minimal”:
  - `/metrics` (nawet proste liczniki: cursor, queue depth, statusAgeMax),
  - structured logs (JSON) z `requestId`, `cursor`, `robotId`.
- Dodać „API style guide”:
  - naming, status codes, error envelope, idempotency headers, pagination.

---

## 7) Jak bym zrobił, żeby była bardziej odporna na wszelkiego typu błędy

### 7.1 Storage: opisz „atomic append” i recovery po crashu
Eventlog JSONL jest dobry, ale potrzebujesz normatywnie:
- zapis linii jako append + fsync policy (np. co N eventów lub co X ms),
- przy starcie: jeśli ostatnia linia jest ucięta, truncate i kontynuuj,
- snapshot writing: write‑temp + atomic rename.

To są typowe „miny” systemów logujących.

### 7.2 Gateway↔Robot: circuit breaker + retry budget
Masz timeouty i statusy, ale dołóż prostą regułę:
- po N kolejnych błędach gateway przechodzi w `error` i nie spamuje robota retry,
- status zawiera `errorCode` i `errorSinceTsMs`.

### 7.3 Scene activation: wyraźnie zdefiniować „best effort STOP”
W spec jest STOP w trakcie activation — super. Dopisz:
- czy STOP idzie do wszystkich robotów znanych runtime, czy tylko „connected”,
- co jeśli robot nie odpowiada (timeout) — czy activation może kontynuować.

### 7.4 Seize control: ograniczenia i rate limit
`force seize` jest mocne. Odporność na błędy operatora:
- dodać `cooldownMs` na force seize,
- maksymalny TTL lease i minimalny TTL,
- audit event z `reason`.

---

## 8) Jak byśmy zrobili, żeby lepiej się nadawała do pracy z AI

Masz już świetne filary (contracts + replay + golden). Żeby AI była „produkcyjnie skuteczna”, dopisałbym:

1. **Kontrakty jako źródło prawdy (machine-readable)**  
   - OpenAPI dla Core i Gateway (nawet jeśli początkowo niepełne),
   - JSON Schema dla: SceneManifest, SceneGraph, RobotConfig, RobotRuntimeState, Task, Worksite, Stream, EventEnvelope, ErrorEnvelope.
   Dokument md ma linki do tych artefaktów.

2. **„Spec-driven tests” jako wymaganie**  
   - każdy endpoint ma co najmniej 1 contract test „happy” i 1 „error”.
   - każdy reason code ma test, że jest emitowany w odpowiednim scenariuszu.

3. **Checklisty implementacyjne per moduł**  
   Dla AI działa świetnie, gdy każda część ma:
   - definicję wejść/wyjść,
   - listę eventów które emituje,
   - listę błędów które może zwrócić,
   - listę testów.

4. **Zasada „no hidden state”**  
   Wszystko co wpływa na decyzje (timery, seed, konfiguracja) musi być:
   - w configu,
   - logowane (event / snapshot),
   - odtwarzalne w replay.

---

## Proponowany podział tej dużej specyfikacji na mniejsze pliki

Żeby dalej iterować szybciej (i wygodniej z AI), proponuję rozbić v0.3 na pliki „po granicach odpowiedzialności”:

### A) „Front page” (1 plik)
- `docs/architecture/00-overview.md`  
  Cel, zakres, wymagania nadrzędne, high-level diagram, MVP definition, non-goals, glossary.

### B) Kontrakty i dane (2–3 pliki)
- `docs/architecture/10-data-contracts-core.md`  
  ErrorEnvelope, EventEnvelope, ControlLease, RobotRuntimeState, Task/Worksite/Stream, `/state` shape.
- `docs/architecture/11-scene-format.md`  
  SceneManifest + folder layout scene package, versioning, hashes.
- `docs/architecture/12-map-graph-format.md`  
  SceneGraph, Map Compiler rules, units, `propsCompiled`, mapFrameId.

*(Równolegle: `packages/contracts/` jako źródło maszynowe: OpenAPI + JSON Schema + examples.)*

### C) API (2 pliki)
- `docs/architecture/20-core-api.md`  
  endpointy `/api/v1`, status codes, idempotency, lease rules, SSE semantics.
- `docs/architecture/21-gateway-api.md`  
  endpointy `/gateway/v1`, command dedupe, provider connect/state, error mapping.

### D) Procedury krytyczne (2 pliki)
- `docs/architecture/30-scene-activation.md`  
  preflight/swap/rollback + invariants + event sequence.
- `docs/architecture/31-provider-switch.md`  
  pause/stop/connect/reloc + reason codes.

### E) Protokoły i dev tools (2–3 pliki)
- `docs/protocols/robocore.md`  
  framing, api numbers, examples, test vectors, „warianty”.
- `docs/tools/proxy-recorder.md`  
  config, output formats, usage.
- `docs/bridge/roboshop-bridge.md`  
  scope, input/output package, mapping.

### F) Jakość i operacje (2 pliki)
- `docs/quality/testing-strategy.md`  
  piramida testów + contract tests + replay tests.
- `docs/runbook/mvp-ops.md`  
  deployment, data dirs, degraded mode, troubleshooting.

### G) ADR (wiele małych plików)
- `docs/adr/0001-transport-core-gateway-http.md`
- `docs/adr/0002-control-lease.md`
- `docs/adr/0003-eventlog-jsonl-snapshots.md`
- … itd.

To rozbicie da Ci pliki o rozsądnym rozmiarze (AI i człowiek lubią < ~200–300 linii), a jednocześnie zachowa spójność.

---

## Najkrótsza lista rzeczy do dopisania w v0.4 (priorytet)

1. Reguły `Last-Event-ID` vs `fromCursor` + `id:` w SSE.  
2. Reguła atomiczności snapshot+cursor (brak okna wyścigu).  
3. Status code mapping dla `ErrorEnvelope.code`.  
4. Idempotency ledger semantics (replay response, TTL, nagłówek).  
5. Patch semantics (merge patch + zasady `null`).  
6. Atomic append + crash recovery dla eventlog/snapshot.

---

### Podsumowanie

v0.3 to już „prawie baseline”: masz dobrze wycięte moduły, sensowne kontrakty, deterministykę (replay) i prosty mechanizm wielo‑UI (lease). To, co bym dopracował, to głównie **precyzja protokołów transportowych (SSE/idempotency/PATCH)** i kilka „operacyjnych” detali (atomic writes, status codes, limity). Te rzeczy są nudne, ale właśnie one odróżniają prototyp od systemu, który nie sypie się w piątek o 2:00 w nocy.
