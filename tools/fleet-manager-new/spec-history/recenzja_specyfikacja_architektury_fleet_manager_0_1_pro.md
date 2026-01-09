# Recenzja — Fleet Manager 2.0: Specyfikacja architektury (v0.1)

**Recenzowany dokument:** „Fleet Manager 2.0 — Specyfikacja architektury (v0.1 / draft)”  
**Zakres recenzji:** wyłącznie architektura (nie recenzuję tu algorytmu poza tym, co wpływa na kontrakty i podziały modułów).  
**Data recenzji:** 2026-01-06

---

## Prompt, który spowodował wygenerowanie tej recenzji

```text
tu masz specyfikacje algorytmu fleet manager, zgodnie z promptem w tym dokumencie. dla porzadku i kontekstu zalaczylem tez kod. ale nie kod jest najwazniejszy, kod to tylklo spike / prototyp.

tworzymy teraz specyfikacje nowego systemu jak ma dzialac. w tej czesci zajmujemy sie architektura calosci. dla kontekstu zllaczylem tez pierwsza wersje specyfikacji allgorytmu. natomiast tutaj w tym chacie skupmy sie na specyfikacji ARCHITEKTURY

chcialbym zebys przygotowal recenzje tej specyfikacji:
- co bys w niej poprawil
- jakie bledy widzisz
- co bys ulepszyl
- jak bys zrobicl zeby byla future proof
- jak bys zrobil, zeby byla lepszej jakosci
- jak bys zrobil zeby byla bardziej projesjponalna
- jak bys zrobil, zeby byla bardziej odporna na wszelkiego typu bledy
- jak bysmy zrobili, zeby lepiej sie nadawala do pracy z AI

prosze przeslij swoja recensje wedlug powyzszych punktow. i przeslij link do pliku .md do pobrania tej recenzji. zalacz w niej tez tez prompt, ktory spowodowal wygenerowanie do tej recenzji
```

---

## TL;DR (najważniejsze „quick wins”)

1. **Uczyń dokument bardziej normatywnym**: rozdziel „MUST/SHOULD” (wymagania) od „propozycji / opcji / rozważań”.  
2. **Doprecyzuj semantykę stanów i recovery**: co dzieje się po restarcie, jak wznawiasz taski, jak chronisz przed „ghost commands”.  
3. **Uszczelnij kontrakty real‑time**: SSE/WS — kolejność zdarzeń, replay, `Last-Event-ID`, snapshoty, backpressure.  
4. **Ustal jedną politykę dla konfliktów wielo‑operatorowych**: optimistic concurrency (`etag`/`If‑Match`) + audit, zamiast „idempotencja rozwiąże wszystko”.  
5. **Zamknij „otwarte decyzje” w ADR**: transport Core↔Gateway (HTTP/gRPC), storage (FS/DB), model rezerwacji, polityka safety, itp.  
6. **Dodaj sekcję „Security & Safety boundaries”**: kto może wysłać jakie komendy, jak autoryzujesz, jak zapobiegasz przypadkowemu/ złośliwemu sterowaniu.  
7. **Zrób porządek w modelu danych Sceny**: formalne JSON Schema + wersjonowanie + migracje + kompatybilność importu.  
8. **Wyjmij szczegóły implementacyjne (ścieżki repo) do aneksu**: główna spec powinna żyć niezależnie od aktualnego kodu.

---

## 1) Co bym w niej poprawił

### Struktura i „waga” sekcji
- **Rozdziel dokument na 2 warstwy**:
  - **Warstwa normatywna (contract/spec)**: wymagania, granice, modele danych, API, semantyka zdarzeń, zasady odporności.
  - **Warstwa informacyjna (rationale/notes)**: dlaczego tak, porównanie z obecną bazą kodu, inspiracje, opcje na przyszłość.  
  Obecnie te warstwy są zmieszane (np. dużo odniesień do repo i istniejących endpointów), co utrudnia egzekwowanie wymagań przy implementacji.
- **Dodaj sekcję „System Context + Deployment view”**: w spec jest diagram zależności usług, ale brakuje odpowiedzi na pytania typu:
  - czy to jest jeden proces w MVP, czy wiele serwisów od początku,
  - gdzie są granice procesowe, porty, healthchecks, konfiguracja,
  - jakie są SLO (np. opóźnienie eventów, stabilność ticka, maks. liczba robotów).

### Język i precyzja wymagań
- Zastosuj konsekwentnie styl RFC 2119: **MUST / SHOULD / MAY / MUST NOT**.
  - Przykład: „SSE jest prostsze” to uzasadnienie; wymaganie powinno brzmieć np. „System MUST zapewniać strumień zdarzeń z możliwością reconnect + wznowienia od `Last-Event-ID`”.
- Ujednolić nazewnictwo:
  - „Fleet Core API (Engine)”, „Fleet Core”, „Engine” — zdecyduj na jedno jako nazwa kanoniczna.
  - „Robokit/Robocore”, „Robot Gateway”, „Robot Provider” — doprecyzuj co jest protokołem, co usługą, co adapterem.

### Granice domeny vs integracje
- **Jeszcze mocniej oddziel**:
  - *domenę* (task/traffic/scena/rezerwacje),
  - od *integracji* (Robokit/Roboshop/proxy).  
  Masz to wprost w dokumencie, ale przydałby się „zakaz mieszania” w formie reguł: „Domain package MUST NOT importować adapterów”.

---

## 2) Jakie błędy widzę (merytoryczne / projektowe / nieścisłości)

Poniżej „błędy” rozumiem szeroko: miejsca, w których spec może prowadzić do złej implementacji albo do sporów interpretacyjnych.

1. **„Idempotencja rozwiąże konflikty wielu operatorów”** — nie do końca.  
   Idempotencja pomaga na retry/duplikaty, ale nie rozstrzyga konfliktu „dwóch operatorów zmienia ten sam worksite inaczej”. Tu musisz wybrać i opisać politykę: optimistic concurrency (`etag`/`If‑Match`) lub „last write wins + audit + UI ostrzega”. Teraz jest to tylko zasugerowane, ale nie jako reguła.

2. **Brak jednoznacznej semantyki „ACK” vs „wykonanie” w komendach do robota**.  
   W architekturze z Gateway (słusznej) musisz rozdzielić:
   - ack transportowy („przyjęte przez gateway”),
   - ack protokołu („przyjęte przez robota”),
   - efekt w świecie („robot faktycznie jedzie/stan się zmienił”).  
   Bez tego łatwo o błędne założenia w UI i w logice retry.

3. **„Scene jest immutable revision” vs „dynamiczna zmiana mapy i konfiguracji”** — brakuje jasno opisanej osi czasu.  
   Masz dobry kierunek: runtime patches vs activation revision, ale brakuje:
   - listy, co jest dozwolone jako patch (np. block/unblock, obstacles, occupancy),
   - listy, co wymaga nowej rewizji + procedury migracji (stop/pause).
   Bez tego ktoś dopisze endpoint „PATCH map graph” i runtime zacznie żyć w stanie niespójnym.

4. **SSE/stream bez twardej specyfikacji reorder/reconnect**.  
   Jest `seq` i sugestia snapshotów — super — ale brak minimalnych reguł:
   - czy `seq` jest globalny per scena czy per strumień,
   - jak klient wznawia (Last-Event-ID? cursor?),
   - jak często snapshot i w jakiej formie (pełny stan vs delty),
   - co z backlogiem (np. limit bufora i fallback do „fetch snapshot”).

5. **Transport Core↔Gateway pozostaje „albo gRPC, albo HTTP”**.  
   To jest otwarta decyzja — OK — ale do MVP spec powinna narzucać jedną opcję (albo przynajmniej kryteria wyboru). Inaczej implementacje powstaną „na pół”.

6. **Użycie MD5 w `manifest.json` jako domyślny hash**.  
   Jeśli to ma służyć do wykrywania niezgodności plików (integrity, nie security), MD5 bywa „wystarczające”, ale jest historycznie problematyczne i powoduje pytania w audytach. Lepiej w spec od razu: `sha256` + wyraźne stwierdzenie „integrity only”.

7. **Brak jasnej polityki „co robi system, gdy Core padnie”**.  
   Jest sekcja o fail-safe, ale nadal nie ma konkretu w stylu:  
   - robot MUST zatrzymać się po braku heartbeat/RTP przez X ms (watchdog w Gateway lub w robocie),
   - Core po restarcie MUST oznaczyć roboty jako „requires re-sync” i NIE wznawiać tasków automatycznie bez potwierdzenia (albo odwrotnie — ale to musi być decyzja).

---

## 3) Co bym ulepszył (konkrety do dopisania / przerobienia)

### Dodaj „twarde kontrakty” do najważniejszych bytów
- Scene, RobotConfig, RobotStatus, Task, Worksite, EventEnvelope — jako **JSON Schema** (w repo lub w osobnym folderze `contracts/`).
- OpenAPI dla endpointów — nawet jeśli początkowo skrócone, ale z kanonicznymi modelami.

### Dopisz przepływy (sequence diagrams) dla kluczowych scenariuszy
Minimum 6:
1. Aktywacja sceny (stop → validate → activate → snapshot → events).
2. Import sceny z Roboshop ZIP (parse → validate → store → report).
3. Dispatch taska + RTP (assign → plan → reserve → send → observe).
4. Reconnect UI do SSE i odtwarzanie stanu (Last-Event-ID → replay/snapshot).
5. Provider switch dla jednego robota (pause → sync pose → switch → replan → resume).
6. Lost comms do robota (breaker open → degraded state → operator policy).

### Uzupełnij „model odpowiedzialności” dla runtime state
- Co jest przechowywane **tylko w RAM** vs co jest **persistowane** (tasks, audit log, eventy, historia diagnostyki).
- Minimalnie: tasks + audit log + aktywna scena/revision powinny przetrwać restart (choćby w prostym storage).

### Dopracuj „Map/Graph contract”
- Jednostki i układ współrzędnych (metry? oś X/Y? radiany vs stopnie).
- Walidacje grafu (spójność, kierunkowość, width, bounds).
- Zasada kompatybilności importu `.smap` → graph.json (co jest źródłem prawdy).

---

## 4) Jak bym zrobił, żeby była future‑proof

- **Capability negotiation** między Core a Providerem robota:  
  zamiast zakładać, że każdy provider wspiera wszystko (relocate, RTP, local planning), wprowadź:
  - `GET /robots/<built-in function id>/capabilities` albo pole w statusie,
  - Core dobiera tryb sterowania (RTP vs go-point) zależnie od capabilities.
- **Wersjonowanie kontraktów**:  
  - `/api/v1` + schemy `schemaVersion`,
  - migracje scen: `sceneRevision` ma `formatVersion` i narzędzie `scene-migrate`.
- **Plugin API dla algorytmów** (bez zależności od runtime i adapterów):
  - jasny interfejs „AlgorithmProvider” + test harness.
- **Przygotuj miejsce na message-bus** (nawet jeśli go nie wdrażasz od razu):  
  `EventBusPort` jest w dokumencie — dopisz minimalne wymagania: kolejność, dostarczenie, durable log (opcjonalnie).

---

## 5) Jak bym zrobił, żeby była lepszej jakości (bardziej „spec”, mniej „esej”)

- **Acceptance criteria per moduł**: po 5–10 punktów na moduł (Core, Gateway, Sim, Roboshop Adapter, Proxy).
- **Inwarianty** (te, które muszą być prawdziwe zawsze), np.:
  - aktywna scena jest jedna,
  - każdy event ma rosnący `seq`,
  - `commandId` jest unikalny per klient,
  - robot nie może mieć dwóch aktywnych tasków,
  - provider switch musi przejść przez stan `paused`.
- **Wymagania wydajnościowe** (minimalne):  
  np. ile robotów i jaka częstotliwość update’ów statusu ma działać w MVP (nawet jeśli to „soft”).
- **Wyraźne „Out of scope”**: masz non-goals, ale dopisz też rzeczy typu:
  - brak gwarancji bezpieczeństwa SIL/PL,
  - brak automatycznego obstacle avoidance w v0.x,
  - brak multi-site / multi-tenant w MVP (jeśli tak).

---

## 6) Jak bym zrobił, żeby była bardziej profesjonalna

- Dodaj na początku **„Document control”**:
  - właściciel dokumentu,
  - wersja, status (draft), data,
  - lista zmian (changelog),
  - linki do ADR.
- Zrób sekcję **„Decision Log (ADR index)”**:
  - transport Core↔Gateway,
  - storage scen (FS vs DB),
  - SSE vs WS,
  - polityka recovery,
  - polityka safety.
- Wprowadź **jednolitą strukturę endpointów**:
  - zasoby jako rzeczowniki (`/robots/<built-in function id>/commands/go-target` albo `/robots/<built-in function id>:goTarget`) — wybierz styl i trzymaj się go.
- Dopisz **role operacyjne**:
  - operator (UI),
  - integrator (Roboshop),
  - serwis (diagnostyka),
  - automat (stream generator).  
  I przypisz im uprawnienia (nawet proste RBAC).

---

## 7) Jak bym zrobił, żeby była bardziej odporna na wszelkiego typu błędy

### Odporność sieciowa i retry
- Wyraźnie rozdziel:
  - retry po stronie klienta UI (krótkie),
  - retry w Gateway do robota (bardziej rozbudowane),
  - retry w Core (raczej minimalne, bo Core powinien opierać się na zdarzeniach/statusie).
- Wprowadź **watchdog/heartbeat**:
  - Core → Gateway: heartbeat + „desired state”,
  - Gateway → Core: status tick,
  - robot: stop gdy brak aktualizacji (jeśli firmware na to pozwala; jeśli nie — Gateway wymusza stop).

### Spójność i „transakcje”
- Operacje typu „activate scene” i „switch provider” opisz jako **atomowe procedury** z fazami i rollbackiem (nawet jeśli rollback jest „przerwij i wymagaj interwencji operatora”).

### Degradacja i tryby awaryjne
- Zdefiniuj tryby:
  - `RUNNING`,
  - `DEGRADED` (np. robot offline),
  - `PAUSED_GLOBAL`,
  - `EMERGENCY_STOPPED` (jeśli integrowane).
- Zdefiniuj, które komendy są dozwolone w każdym trybie.

---

## 8) Jak byśmy zrobili, żeby lepiej się nadawała do pracy z AI

- **Kontrakty jako jedyne źródło prawdy**:
  - folder `contracts/` z OpenAPI + JSON Schema,
  - folder `examples/` z kanonicznymi payloadami (happy path + error path),
  - folder `adr/` z decyzjami.
- **Rozbij dokument na mniejsze pliki** (AI lubi małe, niezależne porcje):
  - `00-overview.md`
  - `10-domain-model.md`
  - `20-api-public.md`
  - `30-api-internal.md`
  - `40-scene-format.md`
  - `50-realtime-events.md`
  - `60-resilience-recovery.md`
  - `70-observability.md`
  - `80-testing.md`
- **Dodaj „AI tasks” jako checklistę**:
  - „AI: wygeneruj OpenAPI dla /robots i /tasks”
  - „AI: wygeneruj JSON Schema dla Scene manifest”
  - „AI: wygeneruj contract tests”
  - „AI: wygeneruj przykładowe eventy”.
- **Zadbaj o jednoznaczność**: AI świetnie implementuje, gdy spec ma:
  - enumeracje statusów,
  - pola wymagane/opcjonalne,
  - pre/post conditions,
  - kody błędów i ich znaczenie,
  - przykłady.

---

## Dodatkowa uwaga (meta): co w tej specyfikacji jest już bardzo dobre

- Podział na Core / Gateway / Sim / Adaptery jest zdrowy i „hexagonal-friendly”.
- Koncepcja **Scene jako immutable revision + runtime state osobno** jest trafiona i zwiększa przewidywalność.
- Kładzenie nacisku na **diagnostykę i snapshot dump** to praktyczna mądrość (w systemach flot to jest złoto).

---

## Proponowana lista zmian do wprowadzenia w dokumencie (w kolejności priorytetu)

1. Dopisać sekcję „Event stream semantics” (SSE/WS) + reconnect/replay.
2. Dopisać sekcję „Recovery & safety policy” (watchdog, restart, resync).
3. Zdecydować (ADR) transport Core↔Gateway i storage.
4. Ujednolicić i sformalizować modele danych (JSON Schema).
5. Ustalić politykę konfliktów multi-frontend (etag/If‑Match).
6. Dodać sequence diagrams dla 6 głównych flow.
7. Zrobić „Document control + ADR index + changelog”.

