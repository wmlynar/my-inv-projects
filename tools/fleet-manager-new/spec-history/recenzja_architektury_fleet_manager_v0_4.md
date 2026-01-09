# Recenzja specyfikacji architektury Fleet Manager 2.0 (pakiet v0.4)

**Data:** 2026-01-06  
**Zakres recenzji:** pakiet dokumentów `00_index.md` … `20_ryzyka_i_pulapki.md` + `99_*` (wersja v0.4, spakowana w archiwum)  
**Uwaga:** w pytaniu pojawia się „0.2”, ale recenzja dotyczy najnowszego pakietu v0.4 (rozbity na wiele plików).

---

## 1. Prompt, który spowodował wygenerowanie tej recenzji

Poniższy prompt (z czatu) był bezpośrednią instrukcją do stworzenia tej recenzji:

> dzięki za przesłanie nowej wersji specyfikacji w archiwum.  
> zrób recenzję i przedstaw w postaci dokumentu recenzji tej architektury:
> - co jeszcze byś w nich poprawił
> - co jeszcze byś tam dodał
> - jakie błędy widzisz
> - co byś ulepszył
> - jak byś zrobił żeby była jeszcze bardziej future proof
> - jak byś zrobił, żeby była lepszej jakości
> - jak byś zrobił żeby była bardziej profesjonalna
> - jak byś zrobił, żeby była bardziej odporna na wszelkiego typu błędy
> - jak byśmy zrobili, żeby jeszcze lepiej się nadawała do pracy z AI
>
> dodatkowo: w dokumentach widzę komponenty:
> - fleet-core (/api/v1)
> - fleet-gateway (/gateway/v1)
> - algorithm-service (/algo/v1)
> - ui-frontend
> - roboshop-bridge
> - proxy-recorder
> - robokit-sim
>
> ale brakuje mi osobnych dokumentów/specyfikacji każdego z tych komponentów: co robią, jak działają, jak się komunikują, jaka jest wizja całości.  
> przejrzyj poprzednie dokumenty czy nic nie brakuje i dodaj komentarze co zrobić, żeby to przywrócić.

---

## 2. Szybkie podsumowanie (co jest dobre + co jest największym brakiem)

### Co jest wyraźnie na plus (v0.4)
- Rozbicie na pliki jest sensowne: **konwencje → contracts → semantyka runtime → API → narzędzia → testy → scenariusze → MVP → ryzyka**.
- Jest bardzo silny fundament „AI-friendly”: **twarde kontrakty + JSON5 przykłady + state machines + replay/log/snapshot**.
- Dobra decyzja architektoniczna: **oddzielenie domeny (Core) od integracji (Gateway, Roboshop, protokoły TCP)**.
- Duży plus za: **event sourcing (event log + snapshoty na dysk)** i deterministyczność replay — to jest paliwo rakietowe do debugowania i do pracy z AI.

### Największy brak, który faktycznie „zniknął”
W v0.4 brakuje **wyraźnych, dedykowanych dokumentów „Komponent: …”** dla czterech kluczowych elementów:

- `fleet-core`
- `fleet-gateway`
- `algorithm-service` (jako komponent, nie tylko API/port)
- `ui-frontend`

W praktyce masz:
- opis wysokopoziomowy (02),
- API (08/09/06),
- semantykę runtime (07),
- ale brakuje „mostu” między tymi warstwami: **normatywnego opisu odpowiedzialności, wewnętrznych modułów, przepływów, konfiguracji, failure modes i zasad implementacji** dla każdego komponentu.

To dokładnie było w v0.3 jako rozdział „Specyfikacja komponentów (szczegółowo)” (sekcja 3.4.*) — teraz zostało tylko częściowo rozproszone (Map Compiler / Proxy / Bridge mają swoje pliki, ale Core/Gateway/UI/Algo już nie).  
Wniosek: **to nie jest kwestia „dodać trochę tekstu”, tylko przywrócić brakującą warstwę dokumentacji**.

---

## 3. Co jeszcze bym poprawił

### 3.1 Przywrócić specyfikacje komponentów (najpilniejsze)
Dodaj 4 dokumenty (normatywne, MUST/SHOULD/MAY), np.:

1) `21_component_fleet_core.md`  
2) `22_component_fleet_gateway.md`  
3) `23_component_algorithm_service.md`  
4) `24_component_ui_frontend.md`  

Każdy z nich powinien mieć stały szablon (żeby było „profesjonalnie i AI-friendly”):

- **Scope**: co jest w środku, co poza.
- **Responsibilities (MUST/MUST NOT)**.
- **Internal modules** (proponowany podział paczek/katalogów).
- **Runtime model**: wątki/loop/tick, kolejki, jak unikamy race conditions.
- **Data ownership**: co jest „source of truth”, gdzie trzymamy stan i dlaczego.
- **Interfaces**: jakie endpointy konsumuje/wystawia + główne payloady.
- **Failure modes**: timeouty, offline, retry, circuit breaker, degradacja.
- **Observability hooks**: jakie logi, jakie eventy, jakie metryki.
- **Test strategy**: jakie golden traces, jakie integracje, co mockujemy.
- **MVP vs post-MVP**: co jest obowiązkowe teraz, co później.

W samym `00_index.md` dopisz w „Struktura plików” te dokumenty jako „kanon komponentów”.

### 3.2 Uporządkować taksonomię komend: Algo → Core → Gateway → Robot
W dokumentach pojawia się mieszanie pojęć:
- Algorytm mówi o `setRollingTarget` (06),
- domena Core ma `CommandRecord.type = "goTarget"` (05),
- Gateway API też przyjmuje `type: "goTarget"` (09),
- RoboCore ma API 3051 `goTarget` (10).

To może działać, ale spec musi powiedzieć jednoznacznie:
- czy `setRollingTarget` jest **komendą algorytmu** (wewnętrzną),
- a `goTarget` jest **komendą domenową/transportową**,
- i gdzie jest tłumaczenie.

Proponowana poprawka (najczytelniejsza):
- Wprowadź osobny typ w contracts: `AlgorithmRobotCommand` (np. `setRollingTarget`, `hold`, `requestLocks`).
- Wprowadź tabelę mapowania:
  - `AlgorithmRobotCommand.setRollingTarget(targetRef)` → Core tworzy/aktualizuje `CommandRecord.goTarget(targetRef)` **tylko jeśli** target się zmienił i minął `rollingTarget.updateMinIntervalMs`.
  - `AlgorithmRobotCommand.hold(reason)` → Core nie tworzy komend ruchu i oznacza robota jako `hold`.
- Gateway **nie** powinien widzieć `setRollingTarget`, tylko zawsze `CommandRecord` (np. `goTarget`, `stop`, `forkHeight`).

To powinno być w jednym miejscu (np. w nowym `21_component_fleet_core.md` + krótkie streszczenie w 06 i 09).

### 3.3 Doprecyzować mapowanie `NodeId` ↔ robot-station-id (ukryte ryzyko produkcyjne)
Obecnie spec praktycznie zakłada, że:
- `SceneGraph.nodes[].id` (np. `"LM2"`) = to samo, co robot rozumie w `goTarget({id:"LM2"})`.

To bywa prawdziwe w kontrolowanym setupie, ale w realnych integracjach często jest inaczej.

Future-proof poprawka, która nie komplikuje MVP:
- Dodać do Node kontrakt pole opcjonalne, np.:
  ```json5
  {
    id: "LM2",
    externalRefs: {
      robocoreStationId: "LM2" // default = id, ale może być inne
    }
  }
  ```
- Gateway przy `goTarget` używa `externalRefs.robocoreStationId` (lub `id` jeśli brak).

Dzięki temu:
- Core pozostaje „kanoniczny” (nie zależy od jednego providera),
- można podmieniać mapy/roboty bez refactoru ID całej sceny.

### 3.4 Domknąć katalog eventów o lease (spójność Contracts ↔ Runtime)
W `07_semantyka_runtime...` jest mowa o evencie `controlLeaseSeized` (albo `systemWarning`), ale w katalogu `EventEnvelope.type` (03) nie ma jawnych eventów lease.

Dla czytelności i testowalności:
- Dodaj eventy:
  - `controlLeaseChanged` (payload = ControlLease)
  - `controlLeaseSeized` (payload = {oldOwner, newOwner, leaseId, ...})
  - `controlLeaseExpired`
- Alternatywnie: tylko `controlLeaseChanged`, a „seized/expired” jako `causeCode`.

Ważne: to nie jest kosmetyka. Bez tego UI i testy E2E będą robić „zgadywanie”.

### 3.5 Ujednolicić „request identity” i idempotencję w API
W API jest trochę „albo requestId, albo Idempotency-Key”, czasem `clientId` jest top-level, czasem w `request`.

Profesjonalny, prosty standard:
- Dla **każdego** mutującego endpointu:
  - `request: { clientId, requestId }` (MUST)
  - `leaseId` jeśli dotyczy (MUST)
- `requestId` jest idempotency key w skali `(clientId, endpoint, requestId)`.
- Nagłówek `Idempotency-Key` MAY być wspierany, ale wtedy mapujemy go na `request.requestId`.

To jest ważne dla AI (i ludzi), bo upraszcza generowanie klientów i testów.

---

## 4. Co jeszcze bym dodał

### 4.1 Dokument „Vision + przepływy” jako jeden kanoniczny obraz systemu
Masz już 02 (architektura wysokopoziomowa) i 18 (scenariusze), ale brakuje jednej, zwartej wizji:

- „jakie są typowe przepływy” w formie prostych sekwencji:
  - start headless,
  - start z UI,
  - import+activate,
  - tick: core→algo→core→gateway→robot,
  - manual command,
  - provider switch,
  - robot offline i recovery,
  - replay/debug.

To można dać jako:
- `02_architektura_wysokopoziomowa.md` (rozszerzyć) **albo**
- nowy plik `02b_przeplywy_sekwencyjne.md`.

W praktyce bardzo pomaga „nowym osobom” (i AI), bo łączy kontrakty z runtime.

### 4.2 Kontrakty „Deployment/Ports/Dirs” jako runbook-lite
W wielu miejscach są ścieżki i porty, ale brakuje jednego „runbookowego” spisu:

- porty usług (core/gateway/algo),
- porty Robocore (observed),
- layout katalogów danych,
- minimalny `docker-compose` (nawet jako pseudokonfig),
- procedura „zbierz paczkę incydentu” (scene + events + snapshots + capture).

To można dodać jako `25_deployment_i_operacje.md` (poza security, ale operacje to nie security).

### 4.3 Jawne SLA/czasy i budżety
Masz timeouty w configu, ale brakuje „budżetu” ticka:

- tick budżet = `1000ms / tickHz`,
- budżet algo < X% ticka,
- budżet IO gateway < Y% ticka,
- zasada „co robimy jak nie mieścimy się w budżecie”.

To jest przyszłościowo ważne, bo multi-robot szybko zabije latencję.

### 4.4 Model „robot blocked” i interakcja z obstacle avoidance
Wspominasz o tym (w promptach i reason codes), ale warto dodać w runtime:
- jak dokładnie wykrywamy „blocked” (telemetria vs heurystyka),
- jakie reason codes zwracamy (np. `ROBOT_BLOCKED`, `ROBOT_LOCALIZATION_LOST`),
- co robi Core: hold? cancel task? retry? manual intervention?

To może być krótkie, ale musi być jednoznaczne.

---

## 5. Jakie błędy widzę (konkretne niespójności / ryzyka błędu implementacji)

### 5.1 Niespójność/niejednoznaczność: `setRollingTarget` vs `goTarget`
Jak wyżej: bez jednoznacznego mapowania implementacja może pójść w dwie strony
(i powstaną dwa „prawdziwe” protokoły wewnętrzne).

### 5.2 Eventy lease nie są domknięte w katalogu EventEnvelope
Runtime wymaga sygnalizacji wywłaszczeń/zmian lease, ale contracts tego nie gwarantują.

### 5.3 Ukryte założenie: NodeId == robot station id
Jeśli to nie będzie prawdą dla realnego robota/mapy, system zacznie „działać na symulatorze, a nie w realu”.
To jest typowy, kosztowny błąd integracyjny.

### 5.4 Granica odpowiedzialności „kto wie, że robot dojechał”
W API Gateway response od komendy ma `status: acknowledged|dispatched|failed`.
W Core CommandRecord ma też `completed`.
Spec powinien wyraźnie powiedzieć:
- Gateway potwierdza tylko „przyjęcie” (ACK) i dostarcza statusy,
- Core jest tym, kto decyduje o `completed` na podstawie telemetrii (arrived / fork reached).

To niby jest w 07, ale warto dopisać to wprost do 09 (żeby nie robić „completion” po stronie gateway).

---

## 6. Co bym ulepszył (struktura i czytelność)

### 6.1 Spójny „spis treści” i cross-linki
Masz spis w 00, ale warto:
- na końcu każdego pliku dodać sekcję „Related / See also” (2–5 linków),
- na początku każdego pliku dodać „Normative scope” (czy to contracts, runtime, API, tool).

To jest banalne, a bardzo podnosi jakość i ułatwia pracę modelom.

### 6.2 „Jedno miejsce prawdy” dla definicji typów
W docach są JSON5 przykłady — super.  
Ale żeby nie robić driftu:
- w `packages/contracts/` trzymaj te same przykłady jako pliki `*.example.json5` (albo `fixtures/`),
- w testach waliduj, że przykłady przechodzą walidację.

To jest „profesjonalny bezpiecznik”.

---

## 7. Jak zrobić, żeby była jeszcze bardziej future proof

### 7.1 Wersjonowanie i migracje stanu (bardziej operacyjne)
Masz `schemaVersion`, ale warto dopisać:
- zasady migracji snapshotów (narzędzie `migrate-snapshots`),
- zasady kompatybilności eventów (eventy są append-only; payload może rosnąć).

### 7.2 Przygotować miejsce na multi-robot i różne modele robotów
Nawet jeśli MVP jest prosty, future-proof jest:
- rozszerzalny `RobotConfig.footprint` o:
  - `headM`, `tailM`, `wheelBaseM` (MAY),
  - `turnRadiusM` (MAY),
- `capabilities` (MAY): np. wspiera forkHeight, wspiera push, wspiera goPoint.

To nie jest negocjacja w runtime, tylko „pola na przyszłość”.

### 7.3 HA Core (poza MVP) — ale decyzje muszą być odnotowane
Dodaj ADR (nawet 2–3 dokumenty):
- dlaczego Core single-writer w MVP,
- co będzie storage (sqlite? rocksdb? pliki jsonl?) i jakie są konsekwencje,
- plan na leader election (poza MVP).

---

## 8. Jak zrobić, żeby była lepszej jakości i bardziej profesjonalna

### 8.1 „Definition of Done” per komponent
W `19_mvp_definicja.md` jest globalne, ale profesjonalnie jest mieć per komponent:
- checklisty MUST,
- minimalne coverage,
- minimalny set testów (unit/integration),
- minimalne logi.

To najlepiej żyje w dokumentach komponentów (których teraz brakuje).

### 8.2 Uporządkować nazewnictwo statusów i reason codes
Reason codes są dobre, ale:
- warto mieć osobne katalogi dla:
  - `RobotBlockedReasonCode`,
  - `CommandFailureReasonCode`,
  - `SceneActivationFailureReasonCode`,
  - `LeaseFailureReasonCode`,
z mapowaniem na ogólny `causeCode`.

To ogranicza „inflację kodów” i jest czytelniejsze.

---

## 9. Jak zrobić, żeby była bardziej odporna na błędy (sieć, partial failure, dane)

### 9.1 Jawny „fail-safe policy” dla Core
Dopisz w runtime (07) sekcję:
- kiedy robimy `hold` vs kiedy robimy `stop`,
- co robimy gdy:
  - status stale (telemetria za stara),
  - gateway offline,
  - algo timeout,
  - robot w emergency,
  - map mismatch.

To ma być polityka, nie tylko lista reason codes.

### 9.2 Ochrony przed floodem
Masz `rollingTarget.updateMinIntervalMs`, ale dopisz:
- limit na liczbę komend per robot per minutę (hard guard),
- zasada „nie wysyłaj tego samego targetu ponownie” (dedup),
- limity SSE (max clients, max buffered events) + backpressure (disconnect z requiresResync).

### 9.3 Walidacje „na granicy” (w Gateway)
W 10 jest framing, ale odporność rośnie, gdy doprecyzujesz:
- maksymalny `bodyLength` (MUST),
- maksymalny czas oczekiwania na pełną ramkę (MUST),
- strategia resync (szukanie 0x5A) i kiedy resetować połączenie.

Jest to częściowo, ale warto parametryzować w config.

---

## 10. Jak zrobić, żeby jeszcze lepiej nadawała się do pracy z AI

### 10.1 Mniejsze, „atomowe” zadania w dokumentach
Sama spec jest już rozbita — super.  
Ale brakuje „atomowych” opisów komponentów. To jest główna blokada AI: AI widzi API, ale nie wie co jest w środku.

Dodaj w dokumentach komponentów sekcje:
- „Public interfaces” (to AI lubi),
- „Internal invariants” (to AI MUSI znać),
- „Test fixtures” (to AI potrafi generować).

### 10.2 „Golden traces” jako obowiązkowy artefakt rozwoju
Masz to jako SHOULD, ja bym to podniósł do:
- MUST dla gateway (golden TCP),
- MUST dla core (replay events),
bo to jest najlepszy sposób, żeby AI nie „zmyślała” zachowania.

### 10.3 Wygenerowane SDK (nawet proste) z contracts
Nie chodzi o negocjację, tylko o ergonomię:
- generowany klient TS/JS dla Core i Gateway (MAY w MVP),
- w testach używany ten sam klient.

AI wtedy produkuje mniej błędów integracyjnych.

---

## 11. Jak podzielić specyfikację na jeszcze mniejsze pliki (propozycja)

W v0.4 podział jest już dobry. Największą luką są dokumenty komponentów.  
Minimalna zmiana (bez rozrywania contracts na mikrodokumenty):

- **Dodać**: `21_component_fleet_core.md`
- **Dodać**: `22_component_fleet_gateway.md`
- **Dodać**: `23_component_algorithm_service.md`
- **Dodać**: `24_component_ui_frontend.md`

Opcjonalnie (po dopisaniu komponentów) można rozbić „contracts” jeszcze bardziej, jeśli zrobi się zbyt duże:
- `03a_contracts_errors_and_events.md`
- `03b_contracts_config.md`
- `05a_contracts_robot.md`
- `05b_contracts_tasks_commands.md`

Ale to nie jest tak pilne jak komponenty.

---

## 12. Co zrobić, żeby „przywrócić to, co zniknęło”
Z porównania ze starszą specyfikacją (v0.3) wynika, że brakujące rzeczy to głównie:
- normatywny opis komponentów (Core/Gateway/UI/Algo),
- ich MUST/MUST NOT,
- i lista failure modes per komponent.

Najprostsza ścieżka przywrócenia:
1) Skopiować rozdział v0.3 „Specyfikacja komponentów (3.4.*)” i rozbić go na 4 nowe pliki komponentów.  
2) Uzupełnić go o to, co doszło w v0.4:
   - event sourcing + replay detale,
   - rolling target jako LM/AP,
   - protokół wideł (6040/6041),
   - hot-switch providerów,
   - SSE semantics.
3) Zaktualizować `00_index.md`, żeby czytelnik od razu trafił na „Komponenty”.

---

## 13. Zamykające uwagi
Pakiet v0.4 jest już blisko „MVP-ready” na poziomie kontraktów i runtime.  
Żeby wejść na poziom „produkcyjny” dokumentacji (czytelnej również dla AI), brakuje głównie:
- **wprost opisanych komponentów** (jak działają w środku),
- oraz kilku domknięć niespójności (komendy algo vs domenowe, eventy lease, mapping NodeId→robotStationId).

To są poprawki o bardzo wysokim ROI: mało pracy, a dramatycznie mniej „interpretacji” w implementacji.
