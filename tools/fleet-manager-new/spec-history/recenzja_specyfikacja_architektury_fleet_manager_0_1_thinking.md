# Recenzja specyfikacji architektury „Fleet Manager 2.0” (v0.1 → v0.2)

**Data:** 2026‑01‑06  
**Zakres:** recenzja *specyfikacji architektury* (nie algorytmu). Dokument algorytmu potraktowałem wyłącznie jako kontekst i nie wchodzę tutaj w jego treść.

---

## Prompt, który spowodował wygenerowanie tej recenzji

```text
no dobrze, a teraz majac swoja specyfikacje architektury fleet manager, zgodnie z promptem w tym dokumencie. chcialbym zebys przygotowal recenzje tej specyfikacji (ktora zreszta sam napisales):
- co bys w niej poprawil
- jakie bledy widzisz
- co bys ulepszyl
- jak bys zrobicl zeby byla future proof
- jak bys zrobil, zeby byla lepszej jakosci
- jak bys zrobil zeby byla bardziej projesjponalna
- jak bys zrobil, zeby byla bardziej odporna na wszelkiego typu bledy
- jak bysmy zrobili, zeby lepiej sie nadawala do pracy z AI

dla kontekstu zllaczylem tez pierwsza wersje specyfikacji algorytmu. natomiast tutaj w tym chacie skupmy sie na specyfikacji architektury. to co zalaczylem pierwsza wersje scpecyfikacji algorytmu tylko dla kontekstu. wiec uwazaj, zeby co to nie zmylilo

prosze przeslij swoja recenzje wedlug powyzszych punktow. i przeslij link do pliku .md do pobrania tej recenzji. zalacz tez prompt, ktory spowodowal wygenerowanie do tej recenzji
```

---

## 1. Co bym poprawił w specyfikacji v0.1

### 1.1 Rozdzielenie „wymagań” od „propozycji rozwiązania”
W v0.1 miejscami miesza się:
- **wymagania (co system *musi* robić)**,
- **proponowana architektura (jak to *zrobimy*)**,
- **szczegóły implementacyjne (jakie endpointy / nazwy / foldery)**.

To utrudnia równoległą pracę i ocenę zgodności.

**Poprawka:** w v0.2 wprowadziłbym układ:
1) Wymagania funkcjonalne (MUST/SHOULD/MAY)  
2) Wymagania niefunkcjonalne (SLO/SLA, niezawodność, obserwowalność)  
3) Model domeny (kanoniczne encje + stany)  
4) Kontrakty (OpenAPI/AsyncAPI/JSON Schema)  
5) Architektura (C4: Context → Containers → Components)  
6) Operacje i deployment (runbook, bezpieczeństwo, konfiguracja)  
7) Plan etapów + kryteria akceptacji

### 1.2 Doprecyzowanie „co jest usługą, a co pakietem/biblioteką”
W v0.1 pojawia się lista „usług” (Fleet Core, Robot Gateway, Roboshop Adapter, Simulator), ale nie ma jasnej decyzji, czy to:
- mikroserwisy (oddzielne procesy, oddzielny deploy), czy
- modularny monolit z wyraźnymi portami/adapters.

To jest kluczowe, bo wpływa na:
- observability (distributed tracing),
- konfigurację i release,
- koszty utrzymania,
- miejsce, gdzie trzymasz stan i transakcje.

**Poprawka:** wprowadziłbym dwa tryby jako *pierwszo‑klasowe*:
- **Mode A (dev/bundle):** wszystko w jednym procesie, wspólna pamięć, łatwy debug.  
- **Mode B (prod/distributed):** Fleet Core + Robot Gateway osobno (minimum), reszta opcjonalnie.

I opisałbym, co musi być prawdą w obu trybach (te same kontrakty, te same modele danych).

### 1.3 Ujednolicenie ścieżek API i „jednego kanonicznego streama”
W v0.1 są drobne niespójności: raz sugeruję SSE jako `/api/v1/stream`, a innym razem jako `/api/v1/fleet/stream`. To wygląda jak detal, ale w realu szybko rodzi chaos.

**Poprawka:** ustalić jeden kanoniczny wariant:
- `GET /api/v1/fleet/stream` (SSE) jako jedyna publiczna ścieżka realtime,
- ewentualnie osobne streamy per domena dopiero później (`/robots/stream`, `/tasks/stream`) — ale tylko jeśli faktycznie potrzebne.

### 1.4 Precyzyjny kontrakt „Scene” i „Runtime”
W v0.1 opis sceny jest dobry, ale brakuje:
- formalnego **schema** (JSON Schema),
- zasad kompatybilności wstecznej (migracje),
- jawnych reguł: *co jest w scene, co jest w runtime, a co jest w historii/audicie*.

**Poprawka:** dopisać sekcję:
- `SceneSchemaVersion` + polityka migracji (np. migracje jednostronne: stare → nowe),
- jawny rozdział: `scene/` (immutable) vs `runtime/` (mutable) vs `history/` (append-only),
- zasady „activation transaction”: kiedy scena może być aktywowana i jakie są stany pośrednie.

### 1.5 Zwiększenie „operacyjności” dokumentu
W v0.1 jest sporo o architekturze, ale mało o tym, jak system będzie utrzymywany:
- jak wygląda upgrade bez przestoju,
- jak restart wpływa na roboty,
- jaki jest tryb degradacji,
- jak wygląda diagnozowanie incydentów.

**Poprawka:** dodać rozdział „Operacje / Runbook”:
- procedury: robot offline, gateway offline, scene mismatch,
- minimalne metryki i alarmy,
- co logujemy i gdzie.

---

## 2. Jakie błędy widzę (merytoryczne i „specyfikacyjne”)

### 2.1 Ryzyko nadmiernego mikroserwisowania na starcie
W v0.1 sugeruję dość szeroki podział na usługi. To jest kuszące („AI‑friendly”), ale w praktyce:
- rozprasza odpowiedzialność,
- komplikuje debug,
- zwiększa wymagania na obserwowalność i testy integracyjne.

**Błąd specyfikacyjny:** brak jasnego kryterium „kiedy rozdzielamy procesy”.  
**Naprawa:** dodać tabelę decyzji (próg robotów, wymogi izolacji, wymagania bezpieczeństwa, wymogi sieciowe).

### 2.2 Niepełna specyfikacja semantyki eventów (SSE)
W v0.1 jest model eventów z `seq`, ale brakuje:
- jak klient wznawia stream (Last-Event-ID / cursor),
- czy eventy są *at-least-once* czy *best effort*,
- jak wygląda backpressure (gdy UI nie nadąża),
- czy są snapshoty okresowe i jak klient ma je łączyć z eventami (problem „reorder”).

To są częste źródła „duchów” w UI.

**Naprawa:** dopisać:
- `cursor` (monotoniczny),
- zasady: eventy mogą się powtarzać → klient musi być idempotentny,
- snapshot co N sekund albo „on connect” + replay eventów od cursora.

### 2.3 Zbyt miękka specyfikacja synchronizacji przy hot‑switch providerów
W v0.1 opisałem procedurę, ale brakuje twardych reguł:
- co dokładnie znaczy „pose OK”,
- co jeśli robot ma inną mapę / inną skalę,
- co jeśli relocate nie istnieje (wymuszony manual).

**Naprawa:** zdefiniować „Switch Contract”:
- warunki wstępne (robot paused, brak aktywnego RTP),
- walidacja mapy (hash + bounding box + frame id),
- stany, timeouty i rollback,
- wymagane metryki i logi w trakcie switch.

### 2.4 Niedookreślona polityka bezpieczeństwa (safety)
W v0.1 zaznaczam, że safety to osobna decyzja, ale nie definiuję minimalnych “guardrails” na poziomie Fleet Core/Gateway:
- limity prędkości,
- „deadman timer” (brak heartbeat → stop),
- strefy no-go.

**Naprawa:** nawet jeśli safety jest poza FM, spec powinien zawierać *minimalne* wymagania integracyjne:
- FM musi umieć zlecić STOP w < X ms,
- Gateway musi umieć wykryć utratę sterowania i zareagować,
- system musi logować wszystkie zdarzenia safety.

### 2.5 „Dynamiczna zmiana mapy” jest wspomniana, ale bez modelu transakcyjnego
W v0.1 jest idea „dynamicznej zmiany sceny”, ale brakuje:
- czy zmiana to patch, czy pełna rewizja,
- czy roboty mogą kontynuować,
- jak rozwiązać zadania i rezerwacje po zmianie.

**Naprawa:** wprowadzić dwa mechanizmy:
- **Runtime patches** (obstacles/block/unblock, occupancy) — nie zmieniają topologii.
- **Scene revision activation** — *zmienia topologię* i wymaga procedury: pause → migrate → resume.

---

## 3. Co bym ulepszył (konkretne „upgrade’y”)

### 3.1 Dodałbym „kanoniczny model domeny” jako osobny rozdział
W v0.1 masz encje i przykłady JSON, ale brakuje jednego, spójnego “modelu świata”:
- Robot, Task, Worksite, Stream, Scene, Reservation, Obstacle, Provider.

**Ulepszenie:** dodać:
- diagram encji (nawet ASCII),
- state machine dla Task i Robot,
- listę invariantów (np. „Task in_progress ma przypisanego robota”, „Robot offline nie dostaje komend”).

### 3.2 Dodałbym „Acceptance Criteria” na poziomie całego systemu
W v0.1 jest „definicja sukcesu” opisowa. To warto zamienić na testowalne kryteria:

Przykładowo:
- „System obsługuje 50 robotów i 10 UI bez utraty eventów >0.1%”,
- „Switch provider trwa < 5 s w 95 percentylu, lub kończy się kontrolowanym FAIL”.

### 3.3 Wyraźnie opisałbym politykę kompatybilności API i schematów
W v0.1 jest wersjonowanie `/api/v1`, ale brakuje polityki:
- co jest breaking change,
- jak długo wspierasz `/api/compat/*`,
- jak migrują sceny i runtime.

**Ulepszenie:** “Compatibility Policy” (krótka, ale twarda).

### 3.4 Dodałbym „C4 diagrams” i krótkie ADR’y do kluczowych decyzji
Żeby dokument był bardziej profesjonalny i łatwy do review:
- C4 Context: kto rozmawia z kim (Roboshop, RDS, roboty, UI, proxy),
- C4 Container: procesy/usługi,
- C4 Component: wnętrze Fleet Core (planner, scheduler, reservations, dispatcher, state store),
- ADR: SSE vs WS, monolit vs microservices, storage (FS vs DB).

---

## 4. Jak zrobić, żeby specyfikacja była bardziej future‑proof

### 4.1 „Plugin contract” dla algorytmów (zero duplikacji między dokumentami)
W architekturze powinien istnieć *minimalny* kontrakt algorytmu:
- wejście: snapshot,
- wyjście: plan/dispatch/proposals,
- wersjonowanie.

Ale szczegóły algorytmu powinny być w oddzielnym dokumencie (tak jak Twoja specyfikacja algorytmu). fileciteturn0file0

**Future-proof:** wprowadzić:
- `AlgorithmApiVersion`,
- `AlgorithmCapabilities` (np. supportsReservations, supportsLocalAvoidanceHints),
- możliwość uruchomienia algorytmu jako „sidecar” (osobny proces) bez zmiany Fleet Core.

### 4.2 Wielo-robotowość i wielo-typowość (różne modele wózków)
Docelowo flota może mieć różne modele:
- inne footprinty, limity, czasy akcji.

**Future-proof:** spec powinien zakładać:
- `robotModelId` + `kinematicsProfile`,
- per-robot parametry RTP (lookahead vs prędkość),
- per-map constraints.

### 4.3 Strategia przechowywania danych: pliki → baza danych → event store
V0.1 sugeruje strukturę katalogów dla scen — super na start. Future-proof jest dodanie warstwy repozytorium:
- `SceneRepositoryPort` może mieć backend: FS, S3, Postgres.
- `RuntimeStateStore`: in-memory + persistence (np. sqlite/postgres) dla restartów.

### 4.4 Async integration i kolejki (tam gdzie to ma sens)
Nie wszystko musi być REST:
- komendy do robotów i eventy są czasem lepsze jako message bus (NATS/Kafka) — *ale tylko jeśli potrzebujesz skali*.

Future-proof to opisanie „opcjonalnego transportu” na poziomie adaptera, bez zmiany domeny.

---

## 5. Jak zrobić, żeby była lepszej jakości (czytelność + jednoznaczność)

### 5.1 Użyć języka normatywnego (RFC 2119)
Wymagania powinny używać MUST/SHOULD/MAY:
- eliminuje dyskusje „czy to było wymagane”.

### 5.2 Dodać „Examples” jako część kontraktów, a nie tylko w tekście
W v0.1 są przykłady JSON — to super, ale:
- przenieść je do katalogu `schemas/examples/*.json`,
- każdy endpoint ma przykład request/response.

### 5.3 Dodać sekcję “Edge Cases”
W dokumencie architektury warto mieć jawny rozdział:
- robot offline w połowie tasku,
- dwa UI robią sprzeczne zmiany,
- scena aktywowana w trakcie streamu,
- utrata połączenia do Roboshop.

---

## 6. Jak zrobić, żeby była bardziej profesjonalna

### 6.1 „Single source of truth” i odnośniki do repo
Dokument powinien:
- wskazywać, gdzie w repo są schematy, ADR, testy kontraktowe,
- mieć changelog (v0.1 → v0.2).

### 6.2 Dodać rozdział „Security & Access”
Profesjonalnie: nawet jeśli na start to “basic auth”, to musi być opisane:
- role: viewer/operator/admin,
- zasady audytu,
- polityka tajnych danych (secrets).

### 6.3 Dodać rozdział „Deployment & Environments”
- dev / staging / production,
- konfiguracja (env vars, config files),
- wersjonowanie scen.

---

## 7. Jak zrobić, żeby była bardziej odporna na błędy (system‑level)

### 7.1 Jawne SLO + mechanizmy degradacji
Odporność to nie tylko retry:
- zdefiniuj SLO dla komend do robotów (np. 99p RTT),
- zdefiniuj tryby degradacji:
  - Gateway offline → Fleet Core przechodzi w „planning‑only”, UI pokazuje „no control”,
  - Fleet Core offline → roboty przechodzą w STOP (lub policy-driven).

### 7.2 Idempotencja i “exactly‑once illusions”
Zasada praktyczna:
- system rozproszony nigdy nie daje exactly-once bez dużego kosztu,
- więc projektujesz **at-least-once + idempotent handlers**.

W specyfikacji doprecyzować:
- `commandId` MUST być unikalny,
- `Ack` zawiera status: accepted/rejected/already_applied,
- UI i Core muszą być odporne na duplikaty.

### 7.3 Konsystencja stanu: single-writer i event log
Najbezpieczniejszy model:
- Fleet Core jest **single-writer** dla runtime state.
- Robot Gateway jest źródłem „telemetrii”, ale nie zmienia domeny.

Warto to zapisać jako invariant — to redukuje klasy błędów.

### 7.4 Backpressure i limity
Spec powinien zawierać limity:
- max event rate,
- max payload size,
- max liczba klientów SSE,
- jak system się zachowuje, gdy limit przekroczony.

---

## 8. Jak to zrobić, żeby lepiej nadawało się do pracy z AI

### 8.1 „Spec as code”
Największy boost dla AI:
- OpenAPI + JSON Schema w repo,
- generowane typy (TS/Python),
- contract tests jako gate w CI.

AI wtedy nie “zgaduje” pól — tylko generuje kod zgodny ze schematem.

### 8.2 „Work packages” i moduły o małej średnicy
Dla AI najlepiej działa:
- mały moduł,
- mały kontrakt,
- deterministyczne testy.

Ulepszenie specyfikacji:
- do każdego modułu dopisać:
  - „inputs/outputs”,
  - „done definition”,
  - minimalne testy.

### 8.3 Zestaw „golden scenes” + replay
Żeby AI mogła poprawiać algorytmy i runtime:
- zestaw scen testowych,
- log/replay z reala i sim.

W specyfikacji warto nazwać artefakty:
- `fixtures/scenes/*`
- `fixtures/replays/*`

### 8.4 Zasady stylu i arch‑lint
- arch-lint: zakaz importów z `legacy/` (macie już mechanizm),
- zakaz “god files”,
- wymóg komentarzy kontraktowych przy portach/adapters.

To jest *mega* pomocne dla AI w utrzymaniu porządku.

---

## 9. Minimalna lista zmian do v0.2 (propozycja)

1) Ujednolicić i sformalizować endpointy (szczególnie stream).  
2) Dodać formalne schematy JSON + przykłady + OpenAPI.  
3) Dopisać semantykę SSE (resume, cursor, snapshot, idempotencja).  
4) Dopisać “Switch Contract” dla providerów (stany, rollback, walidacja map).  
5) Dodać rozdział operacyjny (runbook + SLO + degradacje).  
6) Dodać Security/Access (nawet minimalne).  
7) Dodać C4 + ADR dla decyzji „monolit vs microservices”, „SSE vs WS”, „FS vs DB”.  
8) Dodać tabelę invariantów domenowych i state machine (Robot/Task).  

---

## 10. Podsumowanie w jednym zdaniu

V0.1 jest dobrym, szerokim „overview” i dobrze oddziela domenę od adapterów, ale żeby stał się dokumentem *produkcyjnej jakości* i „AI‑ready”, potrzebuje: **formalnych kontraktów**, **jednoznacznej semantyki realtime i przełączeń providerów**, oraz **operacyjnych detali (SLO, degradacje, bezpieczeństwo, runbook)**.
