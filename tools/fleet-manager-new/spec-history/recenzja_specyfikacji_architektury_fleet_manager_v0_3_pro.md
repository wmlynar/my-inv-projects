# Fleet Manager 2.0 — Recenzja specyfikacji architektury (na bazie v0.3; w pytaniu: „0.2”)

**Data:** 2026-01-06  
**Zakres recenzji:** dokument `specyfikacja_architektury_fleet_manager_v0_3.md` (następca v0.2).  
**Cel recenzji:** wskazać dalsze poprawki, uzupełnienia i ryzyka — oraz jak podnieść jakość/odporność/future-proof i „AI-friendliness”.

---

## 1. Prompt, który spowodował wygenerowanie tej recenzji

```text
no dobrze, a teraz majac swoja specyfikacje architektury fleet managera 0.2

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

warto sie zastanowic na jakie plliki podzielic ta duza specyfikacje, zeby pracowac dalej z mniejszymi dokumentami

prosze przeslij swoja recenzje wedlug powyzszych punktow. i przeslij link do pliku .md do pobrania tej recenzji. zalacz tez prompt, ktory spowodowal wygenerowanie do tej recenzji
```

---

## 2. Co jeszcze bym poprawił

### 2.1 Uporządkowanie „co jest kanonem”
W v0.3 jest już dużo lepiej, ale dalej warto mocniej rozdzielić trzy „warstwy prawdy”:

1) **Kanon kontraktów** (contracts): definicje struktur + wartości enum + reason codes + przykłady JSON5  
2) **Kanon zachowania systemu** (runtime semantics): state machine + inwarianty + procedury (scene activation, provider switch, lease)  
3) **Kanon API**: endpointy + statusy HTTP + idempotencja + przykłady

W dokumencie te rzeczy miejscami się mieszają (np. kontrakty danych są w jednym miejscu, ale semantyka stanów bywa rozproszona między API i opisem komponentów). To nie jest błąd, tylko koszt czytania.

**Propozycja poprawy:** wprowadzić na początku sekcję „Kanon i źródła prawdy”, która mówi:  
- „to jest definicja” (contracts),  
- „to jest mechanika” (state machines),  
- „to jest transport” (API).

### 2.2 Jednoznaczne nazwy dla „trybów”
Masz co najmniej dwa różne „mode”:
- `GET /health` → `mode: running|paused|activatingScene|degraded` (tryb Core)
- `RobotRuntimeState.mode` → `auto|paused|manual|emergencyStop|fault|offline` (tryb robota)

To jest ok, ale w praktyce ludzie i UI się na tym potykają.

**Propozycja:**  
- w Core: użyć `coreMode` albo `runtimeMode`  
- w robocie: zostawić `robotMode` / `mode` (ale wtedy konsekwentnie w całym API)

### 2.3 Doprecyzowanie „walidacji safety” w Core
W wielu miejscach jest „Core waliduje safety” — ale nie ma minimalnej checklisty, co to znaczy w MVP.

**Propozycja:** dopisać minimalny MUST-checklist:
- target w granicach mapy (`meta.bounds`) lub w zasięgu tolerancji,
- target osiągalny po grafie (lub „na krawędzi” wzdłuż trasy),
- target nie wymusza przeskoku sceny/mapFrameId,
- throttling RTP działa (minDelta + updateHz),
- STOP w przypadku `statusAgeMs > statusAgeMaxMs` (już jest) oraz `rtp.timeoutMs`.

### 2.4 Konsekwencja w typach reasonCode
Masz super sekcję „Reason Codes”, ale w kilku miejscach pojawiają się pola `reasonCode`, których enum nie jest jednoznacznie wskazany (np. `CommandRecord.statusReasonCode`, `Worksite.state.blockReasonCode`).

**Propozycja:** w kontraktach dodać rozróżnienie:
- `error.code` → `ApiErrorCode`
- `blocked.reasonCode` → `RobotBlockedReasonCode`
- `task.statusReasonCode` → `TaskStatusReasonCode`
- `worksite.state.blockReasonCode` → **dodać** `WorksiteBlockReasonCode`
- `command.statusReasonCode` → **dodać** `CommandStatusReasonCode`
- `gateway.reasonCode` → `GatewayReasonCode` (albo re-use ApiErrorCode, ale to trzeba zadeklarować)

### 2.5 Doprecyzowanie „unknown fields”
Masz świetny anti-footgun: serwer odrzuca nieznane pola w request.  
To ma skutki uboczne: czasem UI/SDK z różnymi wersjami zacznie wysyłać pole, którego serwer nie zna.

**Propozycja:** zostawić zasadę, ale dopisać wyjątki:
- serwer **MUST** ignorować nieznane pola w `meta`/`debug` (jeśli takie wprowadzisz), bo to jest świetny bufor ewolucji,
- albo dodać nagłówek `X-Strict-Validation: true` (domyślnie true w UI, ale CI może testować oba).

Jeśli nie chcesz wyjątków: dodaj „wersjonowanie request body” (np. `schemaVersion` również w requestach mutujących), bo to upraszcza ewolucję.

---

## 3. Co jeszcze bym dodał

### 3.1 Jawne state machines (w MVP!)
To jest największy „boost” jakości i odporności, a jednocześnie pomaga AI.

**Dodałbym 3 małe state-machine sekcje (tabele + diagramy ASCII):**
1) **Control Lease**: `none → held → expired → none`, plus `forceSeize`
2) **Scene Activation**: `idle → preflight → activating → completed|failed → idle` (z wymuszeniem `paused`)
3) **Robot provider state**: `disconnected → connecting → connected → error`, plus „switch” jako osobny flow.

W każdym:
- dozwolone przejścia,
- eventy emitowane,
- co jest „MUST do logów”,
- co jest „MUST do failsafe”.

### 3.2 Specyfikacja konfiguracji runtime (config contract)
Brakuje „kanonu konfiguracji” dla usług (nawet jeśli security poza MVP).

**Dodałbym jeden kontrakt `FleetCoreConfig` i `FleetGatewayConfig` (JSON5):**
- `dataDir`, `eventLogRetentionDays`, `snapshotIntervalMs`, `maxEventlogFileSizeMb`
- `tickHz`, `statusAgeMaxMs`, `rtpDefault*`
- `gatewayBaseUrl`, `gatewayTimeoutMs`, `gatewayRetryPolicy`
- `sceneStoreDir`
- `controlLease.allowForceSeize`, `controlLease.defaultTtlMs`, `controlLease.maxTtlMs`

To jest mega przydatne do implementacji + testów + uruchomień.

### 3.3 Kontrakt „Scene Package”
Masz opis importu sceny, ale dodałbym formalny kontrakt „scene package format”:
- struktura katalogów,
- dozwolone dodatkowe pliki (np. `assets/*`),
- maksymalne rozmiary (ochrona przed zip bomb),
- reguły wersji (`manifest.schemaVersion` vs `contractsVersion`),
- czy `manifest.files.*` MUSI wskazywać istniejące pliki.

### 3.4 Zasady skalowania payloadów (duże mapy, duże floty)
W MVP spoko, ale docelowo:
- `/state` może być ogromne,
- SSE może być bardzo „gadatliwe”.

Dodałbym:
- opcjonalne filtry SSE (`?types=robotStateUpdated,taskUpdated`),
- opcjonalny „thin state” (`/state?view=uiMinimal`),
- kompresję (gzip) jako SHOULD.

### 3.5 „Golden traces” dla debug i RE
Masz eventlog+snapshoty — super. Zrobiłbym z tego formalny artefakt testowy:

- **Golden trace** = paczka `{scene + eventlog + snapshots + expectedAssertions}`  
- CI uruchamia replay i sprawdza, że:
  - deterministyczne ticki,
  - brak rozjechania cursora,
  - te same eventy (albo te same inwarianty).

To jest genialne do pracy z AI (AI może generować i weryfikować golden trace).

---

## 4. Jakie błędy widzę (konkretne, „do poprawki”)

### 4.1 Brak jawnego `propsCompiled` w przykładzie `SceneGraph.edges`
W kilku miejscach mówisz „Map Compiler MUST dodać `edge.propsCompiled.*`”, ale w przykładzie struktury `edges[]` tego pola nie pokazujesz.

**To jest realny błąd specyfikacyjny** (czytelnik nie wie, czy to część kanonu, czy tylko sugestia).

**Fix:** dopisać w kontrakcie `Edge`:
```json5
{
  props: { /* external */ },
  propsCompiled: {
    direction: "bidirectional",
    forbiddenRotAngleRad: 1.57079632679,
    corridorWidthM: 4.0
  }
}
```

### 4.2 Niekompletne enumeracje dla części pól
- `unknownRobotsPolicy` ma wartości w komentarzu, ale brak definicji enum.  
- `Worksite.blockReasonCode` sugeruje istnienie kodów, ale nie ma listy.
- `CommandRecord.statusReasonCode` — brak listy.

To są „dziury”, które wyjdą przy implementacji.

### 4.3 SSE: brak jednoznacznej reguły „fromCursor vs Last-Event-ID”
Masz „Last-Event-ID i/lub fromCursor”, ale spec nie mówi:
- który ma pierwszeństwo,
- co jeśli oba są podane i różne,
- co jeśli cursor nie istnieje w retencji.

To w UI będzie generować edge-case’y.

**Fix:** dopisać regułę, np.:
- jeśli jest `fromCursor`, ignoruj `Last-Event-ID`,
- inaczej użyj `Last-Event-ID`,
- jeśli cursor poza retencją → `snapshot` + `requiresResync=true`.

### 4.4 Różne nazwy eventów w przykładach vs katalog
W `EventEnvelope` przykład ma `type: "robotPoseUpdated"`, a katalog w MVP mówi `robotStateUpdated`.

To drobiazg, ale w kontraktach/event-sourcing takie drobiazgi robią bałagan.

**Fix:** ujednolicić, najlepiej zostawić tylko `robotStateUpdated` i w payload dodać pola „pose/velocity/provider/blocked”.

### 4.5 RoboCore framing — nadal „ryzyko niezgodności”
To nie jest „błąd”, bo uczciwie oznaczyłeś jako reverse engineered, ale to jest największe ryzyko integracyjne.

**Fix jakościowy:** dołożyć plan RE:
- jakie capture’y zbieramy,
- jak weryfikujemy `apiNo`, endianness, `jsonSize`,
- jakie są typowe błędy i recovery (reconnect, partial frames),
- testy integracyjne z capture replay.

---

## 5. Co bym ulepszył (architektonicznie, bez łamania Twoich założeń)

### 5.1 Jedno „źródło typów” (contracts jako kod + JSON5 jako doc)
Chcesz JSON5 zamiast schematów — słusznie dla czytelności.  
Ale implementacyjnie i testowo warto mieć **jeden kanoniczny model typów**.

**Propozycja kompromisu:**
- `packages/contracts/src/*.ts` (lub inny język) jako „single source of truth”
- z tego generujesz:
  - walidatory runtime (np. zod/ajv — jak wolisz),
  - OpenAPI (dla narzędzi i automatyzacji),
  - oraz „human docs” (w tym JSON5 przykłady).

Dokument nadal pozostaje „ludzki”, ale masz maszynową spójność.

### 5.2 Bardziej precyzyjne „granice odpowiedzialności”
Masz rozdział Core vs Gateway — super.  
Dodałbym dwa twarde MUSTy:
- **Core MUST NOT** robić retry do robota „w kółko” (to gateway robi retry do TCP). Core retry dotyczy tylko HTTP do gateway.
- **Gateway MUST NOT** buforować decyzji algorytmu (to core jest źródłem prawdy). Gateway buforuje tylko stan połączenia/telemetrię.

### 5.3 Transakcyjność zapisu: event → pamięć → emit
Masz „Core zapisuje event do eventlog zanim wyśle komendę” — bardzo dobrze.

Doprecyzowałbym „atomowość”:
- zapis do eventlog + update stanu w pamięci + emit SSE powinny być w jednym „serializowanym” pipeline, żeby nie było reorderów.

To można opisać jako single-writer principle:
- jedna kolejka komend/mutacji,
- tick algorytmu też jest „komendą” w tej kolejce.

### 5.4 Minimalne „budżety czasowe” (timeouts)
Masz timeouty, ale bez liczb i bez tego, kto je ustala.

Dodałbym: `SHOULD` defaulty + config:
- Gateway→RoboCore: connect timeout, request timeout, reconnect backoff
- Core→Gateway: request timeout, retry max
- SSE: heartbeat interval, client reconnect recommended backoff

---

## 6. Jak zrobić, żeby była jeszcze bardziej future-proof

### 6.1 Wersjonowanie eventów per typ
Masz `schemaVersion` w `EventEnvelope` — świetnie.  
Dodałbym regułę:
- `schemaVersion` może być globalne, ale **typ eventu też ma własną wersję** w `payloadVersion` albo w samym `schemaVersion` (np. `robotStateUpdated@1`).

Bez tego w przyszłości bardzo trudno robić kompatybilne UI/replay.

### 6.2 Retencja i migracje
Future-proof = przewidzieć, że:
- eventlog rośnie,
- snapshot format się zmienia.

Dodałbym:
- `snapshot.schemaVersion`,
- prostą migrację snapshotów (MAY: migrator tool),
- politykę retencji: ilość snapshotów, rotacja logów, archiwizacja.

### 6.3 Multi-instance Core (nie w MVP, ale bez blokady)
Nie mówię „rób klaster teraz”, ale warto dopisać constraints, żeby nie zablokować przyszłości:
- `cursor` jest monotoniczny w ramach instancji,
- „HA mode” wymaga wspólnego storage/lock managera → ADR.

Dodaj ADR: „Single-writer Core (MVP)”.

### 6.4 Odporność na „clock drift”
Masz `tsMs` jako wall-clock.  
W logach i replay najlepiej, żeby deterministyczne decyzje opierały się o `tick`, a nie o wall-clock.

Warto dopisać: algorytm MUST używać `tick` jako źródło czasu, a `tsMs` jest tylko diagnostyczne.

---

## 7. Jak zrobić, żeby była lepszej jakości

### 7.1 Spójność i „traceability”
Dodałbym:
- listę wymagań numerowanych (REQ-001…),
- mapowanie: które sekcje API / które testy pokrywają które REQ.

To jest nudne, ale działa jak pancerz.

### 7.2 C4 + diagramy sekwencji
Minimum:
- 1 diagram C4 (System Context)
- 1 diagram Container (Core/Gateway/UI/Bridge)
- 2 diagramy sekwencji:
  - Scene Activation
  - Provider Switch
  - (opcjonalnie) Control Lease seize/renew

To znacząco podnosi „professional vibe” i redukuje nieporozumienia.

### 7.3 „Open questions” jako jawna lista
Na końcu dokumentu dodałbym sekcję:
- co jeszcze niepewne (np. RoboCore),
- jakie decyzje są odroczone (security, roles, TLS),
- co jest w RE planie.

To pomaga zarówno ludziom, jak i AI.

---

## 8. Jak zrobić, żeby była bardziej profesjonalna

- Ujednolicić styl: definicje → wymagania → przykłady → scenariusze.
- Dodać „Non-goals” (masz częściowo w MVP MUST NOT, ale warto w jednym miejscu).
- Dopisać „Terminology / Glossary” (np. worksite vs station vs node).
- Dopisać „Compatibility” (jak długo wspieramy `/api/v1` — nawet jeśli „do odwołania”).

---

## 9. Jak zrobić, żeby była bardziej odporna na wszelkiego typu błędy

### 9.1 Błędy sieciowe: retry + idempotencja + dedup wszędzie
Masz idempotencję w Core API i dedup w Gateway — świetnie.  
Dodałbym jeszcze:
- `X-Request-Id` w Core→Gateway (już jest `commandId`, ale w praktyce warto mieć oba),
- jawny „retry policy contract” (ile retry, jaki backoff),
- circuit breaker w Core (gdy Gateway stale pada, Core nie powinien go bombardować).

### 9.2 Safety-first: „safe default”
Masz dobre zasady (paused po aktywacji, STOP przy degraded).  
Doprecyzowałbym jeszcze:
- co robimy, gdy UI traci lease (lease wygasa) w trakcie manualnych operacji:
  - MUST: STOP + robot paused,
  - MUST: event z reason.

### 9.3 Walidacja „liveness” providerów
Jest `statusAgeMs` i `lastSeenTsMs` — super.  
Dodaj:
- `providerHeartbeatIntervalMs` i `providerStaleAfterMs` (konfig),
- w Gateway: jeśli brak danych, to nadal raportuj `connected` vs `stale` jako osobny stan (łatwiejsze dla UI niż `error`).

### 9.4 Ochrona przed „poisoned scene”
- walidacja rozmiaru mapy,
- walidacja unikalności i długości id,
- limit liczby robotów/worksites/edges w scenie (konfig).

---

## 10. Jak zrobić, żeby jeszcze lepiej nadawała się do pracy z AI

### 10.1 Rozbicie na małe, niezależne artefakty
AI lubi:
- małe pliki,
- jednoznaczne kontrakty,
- deterministyczne testy,
- „fixtures”.

**Praktyka:** utrzymywać `contracts/` jako folder z:
- `*.md` (opis + JSON5),
- `*.json5` (same przykłady/fixtures),
- `*.ts` (typy, walidatory),
- testy „contract conformance”.

### 10.2 „Task packs” dla AI
Dla każdego modułu dopisać checklistę:
- endpoints do implementacji,
- pliki i typy,
- testy do napisania,
- definicje DONE.

To pozwala AI „robić kawałki” bez zgadywania.

### 10.3 Golden tests + replay jako główny mechanizm jakości
AI potrafi generować kod, ale trudniej jej nie zepsuć zachowania.  
Golden trace + replay + inwarianty to najlepsze „barierki”.

### 10.4 Minimalna „spec-driven” generacja kodu
Nawet jeśli nie chcesz pełnego OpenAPI jako głównej specyfikacji, warto:
- generować klienta SDK z kontraktów,
- generować stub serwera,
- generować mock gateway.

To jest turbo dla AI (i ludzi).

---

## 11. Na jakie pliki podzielić specyfikację (propozycja)

W praktyce najlepszy układ to: jeden „Overview” + reszta jako mniejsze RFC.

### 11.1 Proponowany podział `docs/architecture/`
1. `00-overview.md`  
   Cel, scope, zasady (HTTP everywhere, domain vs integration), diagram C4.

2. `01-norms-and-conventions.md`  
   MUST/SHOULD/MAY, jednostki, naming, idempotencja, walidacja.

3. `02-data-contracts.md`  
   Wszystkie kontrakty danych + reason codes + przykłady JSON5.

4. `03-fleet-core-api.md`  
   Endpointy Core + SSE + błędy + idempotencja + przykłady.

5. `04-fleet-gateway-api.md`  
   Endpointy Gateway + semantics + timeouts + dedup.

6. `05-scene-store-and-activation.md`  
   Scene package format, walidacja, activation flow, rollback.

7. `06-robot-provider-switching.md`  
   Hot switch flow, relocate, mapFrameId checks, failure modes.

8. `07-robocore-protocol.md`  
   Framing, API numbers (MVP), RE plan, testy capture replay.

9. `08-simulation.md`  
   InternalSim i Robokit-Sim: modele kolizji, tick, determinism.

10. `09-observability-replay.md`  
   Eventlog, snapshoty, retencja, degraded mode, log format.

11. `10-testing-strategy.md`  
   Piramida testów, równoległość, golden tests, CI.

12. `11-mvp-definition.md`  
   MVP MUST/MUST NOT + kryteria akceptacji.

13. `90-open-questions.md`  
   Lista niepewności i decyzji odroczonych.

14. `99-removed.md`  
   Rzeczy usunięte/zmienione (historia).

### 11.2 Zasada: „contracts żyją obok kodu”
Warto, żeby `packages/contracts/` miało:
- `README.md` z zasadami,
- `examples/*.json5`,
- typy/walidatory,
- testy kontraktów.

To pozwala implementować moduły niezależnie i „sklejać” je przez twarde kontrakty.

---

## 12. Podsumowanie: 10 zmian o największym ROI

1. Dodać state machines (lease/scene/provider) + dozwolone przejścia + eventy.  
2. Uzupełnić brakujące enumy reason codes (worksite/command/gateway).  
3. Dopisać `propsCompiled` jawnie do `SceneGraph`.  
4. Doprecyzować SSE resume (fromCursor vs Last-Event-ID).  
5. Dodać kontrakty konfiguracji (`FleetCoreConfig`, `FleetGatewayConfig`).  
6. Dopisać formalny format paczki sceny + limity rozmiarów.  
7. Ujednolicić nazewnictwo „mode” (core vs robot).  
8. Dodać minimalną checklistę safety walidacji w Core.  
9. Dodać golden traces + replay jako artefakt testowy.  
10. Rozbić spec na mniejsze pliki wg propozycji w sekcji 11.

