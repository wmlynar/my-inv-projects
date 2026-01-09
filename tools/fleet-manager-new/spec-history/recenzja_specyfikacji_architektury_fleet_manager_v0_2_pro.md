# Recenzja — Fleet Manager 2.0: Specyfikacja architektury (v0.2)

**Recenzowany dokument:** `specyfikacja_architektury_fleet_manager_v0_2.md`  
**Data recenzji:** 2026-01-06  
**Zakres recenzji:** architektura systemu (nie algorytm — tylko to, co wpływa na kontrakty/komponenty).

---

## Prompt, który spowodował wygenerowanie tej recenzji

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

prosze przeslij swoja recenzje wedlug powyzszych punktow. i przeslij link do pliku .md do pobrania tej recenzji. zalacz tez prompt, ktory spowodowal wygenerowanie do tej recenzji
```

---

## 0. TL;DR — co jest bardzo dobre w v0.2 i co jest „najbliżej” do poprawienia

### Co jest bardzo dobre (warto utrzymać)
- **Konsekwentny język normatywny** (MUST/SHOULD/MAY) i sensowny podział odpowiedzialności (Core vs Gateway vs Adaptery).
- **Single-writer runtime state + ETag/If‑Match + SSE z replay/snapshot** — to jest trzon, który realnie ratuje system przy wielu UI i restartach.
- **Wymóg logów + snapshotów + replay** — świetny kierunek, bo bez tego system flotowy jest nie-debugowalny.
- **Opis RTP + hot‑switch providerów** jako „pierwszorzędny” przypadek użycia (a nie dodatek).

### Najbardziej „nagrzane” poprawki (kolejność wg ryzyka)
1) **Popraw drobne błędy faktograficzne w protokole RoboCore/Robokit** (sekcja 12) — są małe, ale to integracja i tu najmniejszy błąd kosztuje najwięcej.  
2) **Doprecyzuj kanoniczne modele danych** (RobotStatus, Task, MapGraph, StreamDefinition…) — dziś są tylko nazwy + przykłady; do implementacji równoległej potrzeba definicji „pola i semantyka”.  
3) **Ustal twardą semantykę `cursor` i „replay across restart”** (SSE/event log) — inaczej wyjdą heisenbugi (duplikaty, luki, reset cursora).  
4) **Ustal domyślne polityki** tam gdzie w dokumencie jest „policy MUST określać” — AI/implementerzy bez tego zaczną robić różne rzeczy.

---

## 1. Co jeszcze bym w niej poprawił

### 1.1 Ujednoznacznić „kanoniczne nazwy i typy”
W kilku miejscach widać mieszanie:
- pola w EN vs PL,
- `angle` vs potencjalne `theta`,
- `blockedReason` jako „string” bez enumu.

**Propozycja poprawki:** dodać rozdział „Data Contracts (canonical)” z tabelami pól (nazwa, typ, jednostka, zakres, znaczenie), przynajmniej dla:
- `RobotStatus`,
- `RobotRuntime`,
- `Task`,
- `WorksiteState`,
- `SceneRevision` i `MapGraph`.

To jest mało „fancy”, ale dramatycznie podnosi jednoznaczność.

### 1.2 Doprecyzować układ współrzędnych
Jest „metry i radiany” (super), ale brakuje:
- orientacji osi (X/Y),
- znaku obrotu (czy dodatni kąt to CCW?),
- definicji „0 rad” (wschód? północ?).

To są klasyczne miny integracyjne (szczególnie z robotem).

**Propozycja poprawki:** dopisać 5.4.5:
- układ prawoskrętny,
- `angle=0` równoległy do osi +X,
- dodatni obrót CCW.

### 1.3 Dociąć i zamknąć „policy placeholders”
W v0.2 jest kilka miejsc typu:
- „policy MUST określać kto ma kontrolę” (multi-frontend),
- „wymagać ręcznego potwierdzenia operatora (policy)” przy braku mapHash na robocie,
- „wyczyścić/zmigrować runtime state wg polityki”.

To jest OK jako „design space”, ale jeśli to ma być dokument do implementacji, to w v0.3 warto mieć **domyślną politykę** (MUST), a opcje jako MAY.

Przykłady domyślnych polityk (do wpisania w spec):
- **Manual control lease:** operator dostaje „lease” na robota na N sekund, odnawiane heartbeat; bez lease komendy manual są 409/403.
- **Scene activation policy v0.x:** domyślnie cancel all tasks + require resync; później dopiero migracje.
- **Provider switch without map hash:** domyślnie wymaga `admin` + wymaga STOP + audit + snapshot.

### 1.4 Uporządkować API: Core vs Gateway
Oba mają „/api/v1/robots/...”. To jest czytelne per serwis, ale w dokumencie łatwo się pomylić, kiedy mówimy o Core a kiedy o Gateway.

**Propozycja poprawki:** w spec dodać jasne konwencje:
- Core: `/api/v1/...` (public)
- Gateway: `/api/v1/...` (internal), ale w dokumentacji zawsze opisywane jako `GW /api/v1/...` + baseURL `http://robot-gateway:<port>`.
- Alternatywnie: Gateway prefix `/api/v1/gateway/...` (mniej „ładne”, ale zero pomyłek).

---

## 2. Co jeszcze bym tam dodał

### 2.1 „Map/Graph contract” i walidacje jako MUST
W v0.2 mówisz, że jest `graph.json`, ale nie opisujesz:
- formatu węzłów/krawędzi,
- semantyki `width`,
- kierunkowości i jazdy tyłem/przodem,
- geometrii (polyline),
- walidacji spójności.

To jest fundament dla wszystkiego: planner, RTP, symulacja, rezerwacje.

**Propozycja dopisku:** rozdział 9.1.x:
- minimalny przykład `graph.json` (JSON5),
- lista walidacji MUST (spójność grafu, unikalność ID, brak krawędzi do nieistniejących węzłów, dodatnie długości, itp.),
- jasne jednostki i interpretacja.

### 2.2 „Scene artifacts” — format `robots.json5`, `streams.json5`, `workflow.json5`
Masz ścieżki plików, ale nie ma kontraktu tych plików.
Bez tego każdy implementer/AI „dopisze po swojemu”.

**Propozycja dopisku:** dodać minimalne przykłady + wymagania:
- `robots.json5` (robotId, home/park, model kinematyczny, provider default, rtp params),
- `streams.json5` (id, enable, warunki, pick/drop, priorytety),
- `workflow.json5` (jeśli nadal osobno).

### 2.3 Polityka retencji logów/snapshotów
Wymóg logów i snapshotów jest, ale brakuje:
- retencji (dni/GB),
- rotacji,
- kompresji,
- „incident bundle” (jeden katalog/zip do wysłania).

To ważne, bo logi z floty potrafią zjeść dysk szybciej niż robot dojedzie na parking.

### 2.4 Wymagania wydajnościowe/SLO
Dokument mówi o backpressure, tick duration, RTT, ale bez progów.
Warto dodać „minimalne SLO” (choćby orientacyjne) jako MUST/SHOULD:
- maks. lag SSE (np. p95 < 1s),
- p95 RTT Core→Gateway,
- maks. jitter RTP,
- maks. czas aktywacji sceny dla typowego rozmiaru.

---

## 3. Jakie błędy widzę (konkretne)

### 3.1 RoboCore/Robokit: `jsonSize` w nagłówku (sekcja 12.2)
W spec jest napisane, że:
- „pierwsze 4 bajty `reserved` używane jako `jsonSize`”.

W kodzie adaptera (`packages/adapters-robokit/src/rbk.js`) `jsonSize` jest kodowane w **2 bajtach** (`reserved[2]` i `reserved[3]`), a parser odczytuje je jako 16-bit.  
To jest błąd faktograficzny w specyfikacji i warto go poprawić, żeby ktoś nie napisał „kompatybilnego” parsera, który nie zadziała.

**Sugestia poprawki w spec:**
- opisać dokładnie: `jsonSizeHeader = reserved[2]<<8 | reserved[3]` (uint16),
- dodać uwagę o limicie (max 65535) i co robimy, gdy JSON jest większy.

### 3.2 RoboCore/Robokit: odpowiedzi robota mają wrapper (`ret_code`, `err_msg`, ...)
W robokit-sim odpowiedzi nie są „czystym payloadem”, tylko zawierają pola:
- `ret_code`, `err_msg`, `message`, `create_on`, + dane.

Spec w 12.3 pokazuje przykład bez wrappera (co może być OK, jeśli Gateway normalizuje), ale to nie jest wprost powiedziane.

**Sugestia poprawki w spec:**
- dodać „Gateway MUST mapować/normalizować odpowiedzi Robokit do modelu”:
  - `robotAck.payloadRaw` = oryginał,
  - `robotAck.payload` = znormalizowane (bez `ret_code`), albo jawnie zostawić raw.

### 3.3 Niejednoznaczność: „event log MUST być zapisywany” vs „co najmniej w buforze”
W 8.2.6 jest „co najmniej w buforze w pamięci; najlepiej także na dysk”, a w 9.3 masz „System MUST prowadzić event log (append-only)” + dodatkowo wymagania o snapshotach na dysk.

To się da spiąć, ale dziś wygląda jak sprzeczność wymagań.

**Sugestia poprawki w spec:**
- ustalić minimalny standard: event log **MUST** być na dysku (JSONL), a bufor w pamięci to optymalizacja do szybkiego replay.

---

## 4. Co bym ulepszył (tak, żeby implementacja była prostsza i mniej ryzykowna)

### 4.1 „Command lifecycle” jako jawna maszyna stanów
Masz trzy ACKi (accepted_by_gateway, accepted_by_robot, effect_observed) — to jest świetne.  
Brakuje tylko normatywnej „maszyny stanów komendy” i timeoutów.

**Propozycja dopisku:**
- stan komendy: `created -> sent -> gw_acked -> robot_acked -> observed | failed | timed_out`,
- per typ komendy default timeouty,
- reguły retry (które komendy wolno retry’ować automatycznie, a które nie).

### 4.2 „RTP safety math” (spięcie validForMs, minUpdateMs i latencji)
W spec jest `validForMs` i `minUpdateMs`, ale bez relacji.

**Propozycja dopisku (jako MUST):**
- `validForMs` MUST być > `minUpdateMs + worstCaseNetworkJitterMs + robotReactionMs`,
- Fleet Core MUST nie wysyłać RTP „za hold point” (to wiąże się z algorytmem, ale architektura może to wymagać jako invariant).

### 4.3 „Scene activation” — default zachowanie z taskami i robotami
Dodałbym jasno:
- co się dzieje z taskami `in_progress`,
- czy wysyłamy STOP czy PAUSE,
- jak długo czekamy na potwierdzenie.

Bez tego każdy zespół zrobi inaczej, a to będzie bolało przy integracji.

---

## 5. Jak zrobić, żeby była jeszcze bardziej future‑proof

### 5.1 Wersjonowanie eventów i payloadów
Masz `/api/v1` i `formatVersion` scen — super.

Dodałbym:
- `eventVersion` per `type` (np. `type: "robot.updated", v: 1`),
- albo `schemaVersion` w envelope.

To pozwala zmieniać payload bez łamania starych UI.

### 5.2 Przygotować miejsce na „capabilities” bez negocjacji (zgodnie z Twoim wymaganiem)
Rozumiem wymaganie „nie negocjujemy, implementujemy wszystko”.  
Future-proof można zrobić tak:

- provider MUST implementować pełen zestaw,
- ale RobotStatus MAY zawierać `capabilitiesObserved` / `capabilitiesMissing`,
- a Gateway MUST jawnie failować komendy nieobsługiwane (z kodem błędu + telemetry event).

To nie jest negocjacja — to „telemetria kompatybilności”.

### 5.3 Migracje scen jako narzędzie (nie tylko pole formatVersion)
Masz `formatVersion`. Future-proof jest dopiero, gdy masz też:
- `scene-migrate` CLI,
- testy migracji na fixtures.

---

## 6. Jak zrobić, żeby była lepszej jakości

### 6.1 Dodać checklisty „Definition of Done” dla modułów
Masz „plan etapów”, ale jakość rośnie, gdy każdy etap ma checklistę:
- kontrakt API + przykłady,
- testy kontraktowe,
- replay/fixtures,
- metryki i logi.

### 6.2 Wyciągnąć „normatywne parametry” do jednej tabeli
Masz parametry rozsiane (tick, minUpdateMs, stuckTimeoutMs…).  
Dodałbym tabelę:
- nazwa parametru, jednostka, zakres, default, gdzie konfigurowane (scene/robot/env), wpływ na safety.

To jest turbo‑pomocne dla wdrożenia i dla AI.

---

## 7. Jak zrobić, żeby była bardziej profesjonalna

### 7.1 Security rozdział (nawet jeśli minimalny)
Jest AuthN/AuthZ minimalnie. Profesjonalnie dopisałbym:
- TLS (nawet jeśli „terminujemy na reverse proxy”),
- polityka secrets (env vars / vault),
- audit log jako wymaganie (już jest, ale doprecyzować format i retencję),
- rate limits dla komend safety.

### 7.2 Deployment & Environments
Warto dodać:
- dev/staging/prod,
- konfiguracja portów, adresów, healthchecks,
- „runbook” dla operatora (co robić w typowych awariach).

### 7.3 ADR (Architecture Decision Records)
W v0.2 już podjąłeś kilka decyzji (HTTP, SSE, single-writer).  
Profesjonalnie: dodać katalog `docs/adr/` i każdą decyzję opisać krótką notatką:
- kontekst,
- decyzja,
- konsekwencje.

To bardzo pomaga utrzymać spójność przy wielu osobach (i AI).

---

## 8. Jak zrobić, żeby była bardziej odporna na wszelkiego typu błędy

### 8.1 Jawne „failure modes” + zachowanie systemu
Dodałbym tabelę:
- awaria / symptom,
- wykrycie (metryka/event),
- reakcja automatyczna,
- wymagane działanie operatora,
- snapshot/replay.

Przykłady:
- Gateway offline,
- robot offline,
- robot off-route,
- stale telemetry,
- event log disk full,
- scene activation failure halfway.

### 8.2 Disk‑full i degradacja
Jeśli logi/snapshoty są MUST, to trzeba opisać:
- co robimy gdy dysk się kończy,
- czy zatrzymujemy system (safety) czy przechodzimy w tryb degradacji (np. wyłączamy periodic snapshots, ale zachowujemy incident snapshots).

### 8.3 Determinizm ticków i atomowość update’ów
W systemie wielorobotowym nie chcesz, żeby kolejność iteracji po robotach wpływała na decyzje (heisenbug).

**Propozycja dopisku:**
- Core MUST przetwarzać tick w deterministycznej kolejności (np. sort robotId),
- update stanu MUST być atomowy „na tick” (najpierw policz decyzje, potem commit).

---

## 9. Jak zrobić, żeby jeszcze lepiej nadawała się do pracy z AI

### 9.1 „Spec → Contracts → Codegen → Tests” jako standard projektu
Żeby AI mogła pracować równolegle i bez rozjechania:
- OpenAPI jako single source of truth dla endpointów,
- generowane typy TS (albo inny język),
- testy kontraktowe w CI,
- fixtures JSON5 w repo.

Dokument już to sugeruje, ale warto zrobić z tego **wymóg procesu**.

### 9.2 Golden fixtures i scenariusze jako dane wejściowe
Masz „fixtures/scenes” i „fixtures/replays” — super.
AI działa dużo lepiej, gdy ma:
- minimalną scenę 5–10 węzłów,
- 2 roboty,
- kilka gotowych „incident replays” (lost comms, deadlock, collision),
- oczekiwane eventy i snapshoty.

### 9.3 Minimalny „contract test kit”
Dodałbym osobny pakiet `packages/contract-test-kit`:
- klient Core API,
- klient Gateway API,
- asercje na SSE (cursor monotonic, snapshot/delta),
- walidacja przykładów z dokumentu (przykłady nie mogą się „zestarzeć”).

To robi z dokumentu żywy kontrakt, a nie opis.

---

## 10. Podsumowanie
v0.2 jest już naprawdę mocnym dokumentem architektury: jest modularny, czytelny, ma dobre granice, i uwzględnia trudne real‑world rzeczy (SSE, restart, hot‑switch, watchdog, replay).  

Największy „lift” do v0.3 to:
- doprecyzować kontrakty danych (nie tylko endpointy),
- uszczelnić semantykę eventów/cursora i retencji,
- zamknąć policy‑placeholdery domyślnymi politykami,
- poprawić drobne błędy w opisie RoboCore (jsonSize + wrapper odpowiedzi).

To da dokument „do implementacji bez zgadywania” — idealny zarówno dla ludzi, jak i dla AI.
