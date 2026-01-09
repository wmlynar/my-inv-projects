# Recenzja — Fleet Manager 2.0: Specyfikacja architektury (v0.2)

**Recenzowany dokument:** „Fleet Manager 2.0 — Specyfikacja architektury (v0.2 / draft)”  
**Zakres recenzji:** wyłącznie architektura (API, granice modułów, dane, protokoły, odporność, testy).  
**Data recenzji:** 2026-01-06

---

## Prompt, który spowodował wygenerowanie tej recenzji

```text
tu masz kolejna wersje specyfikacji: architektura fleet manager 0.2

chcialbym zebys przygotowal recenzje tej specyfikacji (recensje specyfikacji architektura fleet manager 0.2):
- co bys w niej jeszcze poprawil
- jakie bledy widzisz
- co bys ulepszyl
- jak bys zrobicl zeby byla future proof
- jak bys zrobil, zeby byla lepszej jakosci
- jak bys zrobil zeby byla bardziej projesjponalna
- jak bys zrobil, zeby byla bardziej odporna na wszelkiego typu bledy
- jak bysmy zrobili, zeby lepiej sie nadawala do pracy z AI

dla kontekstu zalaczylem tez recenzje specyfikacji calego allgorytmu. natomiast tutaj w tym chacie skupmy sie na specyfikacji architektury. zalaczam tez pliki ktore znalazlem apropos specyfikacji mapy. nie wiem czy to sie przyda, ale zalaczam na wszelki wypadek.

prosze przeslij swoja recenzje specyfikacji architektury 0.2 wedlug powyzszych punktow. i przeslij link do pliku .md do pobrania tej recenzji. niech w tym dokumencie bedzie tez zalaczony prompt
```

---

## Najważniejsze zmiany na plus (względem v0.1)

Wersja v0.2 jest wyraźnie dojrzalsza i „bardziej implementowalna”:
- konsekwentny język normatywny (MUST/SHOULD/MAY),
- doprecyzowane realtime (cursor/reconnect/snapshot/backpressure),
- doprecyzowane multi‑frontend (ETag/If‑Match + audit),
- doprecyzowane recovery (restart + ghost commands),
- wymagania dot. logów/snapshotów/replay i piramidy testów,
- konkret protokołu RoboCore/Robokit (porty + ramka + przykładowe komendy),
- flow/scenariusze (import/activate, SSE reconnect, dispatch+RTP, hot-switch, lost comms),
- „Rzeczy usunięte” jako jawny zapis decyzji (HTTP zamiast gRPC, sha256 zamiast md5, brak capabilities negotiation w MVP).

To jest solidna baza do startu implementacji.

---

## 1) Co bym w niej jeszcze poprawił (najbardziej praktyczne poprawki)

### 1.1 Doprecyzować granice „public API” vs „driver API” (żeby nie mieszać poziomów)
W dokumencie masz:
- publiczne endpointy Core dla operatora (np. `/api/v1/robots/<built-in function id>/commands/*`),
- oraz wewnętrzne endpointy Gateway o bardzo podobnych nazwach (`/api/v1/robots/<built-in function id>/commands/*`).

To działa, ale łatwo o pomyłki integracyjne (kto jest klientem czego).

**Propozycja poprawki (w spec):**
- nadać Gatewayowi jawny „namespace” (np. `/api/v1/driver/robots/...` albo `/internal/v1/...`),
- albo nazwać to explicite jako „Gateway API (internal only)”, z osobnym basePath.

### 1.2 Dodać normatywny „Command lifecycle” (komenda ≠ efekt)
Masz świetny zapis o trzech poziomach ACK (accepted_by_gateway / accepted_by_robot / effect_observed) — to jest *bardzo* dobre.  
Dołóż jeszcze jedną rzecz: **maszynę stanów komendy** (dla Core i dla Gateway), bo to łączy retry, deduplikację, UI feedback i replay.

Minimalnie:
- `created -> sent_to_gateway -> accepted_by_gateway -> accepted_by_robot? -> effect_observed -> done`
- ścieżki błędów: `rejected`, `timeout`, `no_response`, `stale`.

To pozwoli:
- mieć spójne reason-codes w UI,
- pisać testy kontraktowe „komenda ma się zachowywać tak”.

### 1.3 Uściślić „policy: kto ma kontrolę” dla komend manual
W v0.2 jest zapis, że musi istnieć policy kontroli manual (np. last-write-wins + audit). To za mało jak na sterowanie wózkiem.

**Propozycja:** wprowadzić **lease na manual control**:
- `POST /robots/<built-in function id>/manual/lease` → zwraca `leaseId` + `expiresAt`,
- manual motion MUST wymagać `leaseId`,
- lease ma TTL, można refresh,
- lease jest logowane (audit) i widoczne w SSE.

To rozwiązuje realny problem: dwa frontendy „ciągną joystick” i robi się chaos.

### 1.4 Doprecyzować persystencję (co dokładnie musi przetrwać restart)
Masz wymaganie, że runtime state ma przetrwać restart (aktywny scene, tasks, worksites, przypisania) — super.  
Brakuje jednak minimalnego „kontraktu storage” (nawet jeśli implementacja to proste pliki).

**W spec dopisałbym:**
- które elementy są MUST durable:
  - active scene pointer,
  - tasks + task history,
  - worksites/streams runtime changes,
  - command ledger minimum (przynajmniej Core-side idempotency + RTP seq),
  - event log tail (dla replay po incydencie),
- jak zapewnić atomowość zapisu (np. append-only + fsync policy; albo sqlite/wal — jako opcja),
- retencję i rotację (żeby nie zabić dysku).

### 1.5 Ujednolicić naming/konwencje JSON: camelCase vs snake_case
W publicznych payloadach Core używasz camelCase (`targetId`, `receivedAt`), a Robokit jest snake_case (`task_id`, `station_id`, `real_steer`).  
Masz zapis, że Gateway „normalizuje” — świetnie, ale warto to podnieść do zasady:

- **Core API MUST być camelCase**
- **Gateway adapter MAY tłumaczyć snake_case <-> camelCase**
- **Na granicy Core↔Gateway obowiązuje jeden format kanoniczny** (najlepiej camelCase).

To ułatwia contract tests, typy i pracę z AI.

### 1.6 Map/Graph contract: dopisać formalną spec „surowe vs skompilowane”
Scene ma `maps/original` i `maps/compiled`. W praktyce import z Roboshopa często niesie pola typu `forbiddenRotAngle`, `direction`, `movestyle`, `width`.  
Warto w architekturze dopisać:

- które pola są „raw Roboshop semantics”,
- które są „FM canonical semantics”,
- jakie są jednostki i enumeracje po stronie FM,
- jakie transformacje robi Map Compiler (np. normalizacja, walidacja, generacja indeksów, wyznaczanie konfliktów).

To zamknie temat „specyfikacja mapy” w jednym miejscu i ograniczy ryzyko regresji.

---

## 2) Jakie błędy widzę (rzeczy, które mogą prowadzić do błędnej implementacji)

### 2.1 RoboCore/Robokit: opis `jsonSize` w nagłówku ramki jest nieprecyzyjny / potencjalnie błędny
W sekcji 12.2 zapisujesz, że:
- `reserved` ma 6 bajtów,
- „pierwsze 4 bajty używane jako jsonSize”,
- a potem, że `jsonSize` (pierwsze 4 bajty `reserved`) zawiera długość JSON.

**Problem:** w praktyce spotyka się wariant, gdzie `jsonSize` jest *krótsze* (np. uint16) i nie zajmuje „4 bajtów”.  
Jeżeli implementator weźmie zapis z dokumentu dosłownie, może źle parsować ramki z binarnym ogonem.

**Co dopisać/naprawić w spec (MUST):**
- jednoznacznie: ile bajtów ma `jsonSize` i gdzie dokładnie leży w `reserved` (offsety),
- co robić, jeśli `jsonSize == 0` albo jeśli `jsonSize > bodyLength`.

*(To jest jedyny punkt, który nazwałbym „błędem specyfikacji” w sensie: tu naprawdę łatwo o niekompatybilną implementację.)*

### 2.2 Niespójność „kąty zawsze w radianach” vs realne dane mapowe z Roboshopa
Spec mówi, że kąty w systemie MUST być w radianach. To jest słuszne.  
Jednocześnie w danych mapowych z Roboshopa spotyka się pola typu `forbiddenRotAngle` zapisane jako wartości ±90 (co w praktyce jest interpretowane jako stopnie w części narzędzi mapowych).

**Ryzyko:** jeśli Map Compiler nie wykona jawnej konwersji, to część systemu będzie liczyć w radianach, a część w stopniach.

**Poprawka (w spec):**
- wyraźnie oznaczyć, że „original map” może mieć inne jednostki (np. degrees),
- Map Compiler MUST znormalizować do kanonicznych jednostek FM (rad),
- a w `manifest.json`/`coord` dodać również „sourceAngleUnits” (albo pole w metadanych importu).

### 2.3 Cursor w SSE: brakuje doprecyzowania, czy monotoniczność jest globalna przez sceny i restarty
Wymagasz monotonicznego `cursor` i deduplikacji po cursor — super.  
Dopisz tylko jednoznacznie:
- czy cursor jest globalny w instancji Core i nigdy nie resetuje (zalecane),
- czy resetuje po scene activation lub restarcie (wtedy UI MUST traktować snapshot jako „new epoch” i zresetować dedupe cache).

Bez tej dopiski łatwo o sytuację, gdzie reconnect działa „czasem”.

### 2.4 Idempotency TTL „per clientId” — brakuje definicji `clientId`
W spec jest TTL deduplikacji idempotency key „per clientId”.  
W praktyce musisz zdefiniować:
- czy `clientId` pochodzi z tokenu auth,
- czy z osobnego nagłówka (`X-Client-Id`),
- czy jest generowane przez UI i stabilne.

Bez tego implementacja potrafi się rozjechać (albo deduplikacja będzie nieskuteczna, albo będzie powodować „fałszywe already_applied” między różnymi klientami).

---

## 3) Co bym ulepszył (żeby wdrożenie było mniej ryzykowne)

### 3.1 Kody przyczyn (reason codes) jako część kontraktu API
To jest „mały dopisek”, który zwykle dramatycznie poprawia debug i UI.

Przykłady:
- dla robota: `holdReason = TRAFFIC_HOLD | SAFETY_STOP | ROBOT_FAULT | OFFLINE | MANUAL | SWITCHING_PROVIDER`
- dla taska: `blockReason = WAIT_FOR_RESOURCE | WAIT_FOR_WORKSITE | ROBOT_OFFLINE | OPERATOR_PAUSED | ERROR`
- dla komend: `rejectReason = INVALID_STATE | NO_LEASE | RATE_LIMIT | NOT_AUTHORIZED | ROBOT_OFFLINE`

To powinno być:
- w payloadach,
- w logach,
- w snapshotach,
- i testach kontraktowych.

### 3.2 Jawna separacja „scene revision” vs „runtime patches” + zasady kiedy wymagamy pause
Masz już dobry kierunek („runtime state osobno”).  
Dodaj normatywną listę:
- co jest dozwolone jako runtime patch bez pauzy (np. obstacle add/remove, worksite blocked),
- co wymaga procedury (pause/resync) (np. zmiana grafu, zmiana geometry/kinematics, zmiana critical sections).

### 3.3 Outbox/ledger dla komend (Core i Gateway)
Gateway ma command ledger (super).  
Core też powinien mieć minimalny outbox/ledger, przynajmniej dla:
- idempotentnych komend operatorskich,
- sekwencji RTP (`rtpSeq`),
- żeby restart Core nie generował „old-but-valid” RTP.

---

## 4) Jak bym zrobił, żeby była future‑proof

### 4.1 Capabilities negotiation — jako opcjonalny extension point, mimo że nie jest wymaganiem MVP
W v0.2 świadomie rezygnujesz z negocjacji capabilities w MVP — rozumiem.  
Ale future-proof „za grosz” kosztuje, jeśli już teraz:
- zarezerwujesz miejsce w modelu `RobotStatus.capabilities` (nawet jeśli zawsze pełne),
- i dopiszesz ADR: „kiedy włączymy negotiation”.

To nie zmienia MVP, ale przygotowuje drogę na roboty „inne niż robokit-sim”.

### 4.2 „Epoch” dla event stream + replay
Dla odporności i HA (kiedyś) przyda się pojęcie:
- `streamEpoch` (zmienia się przy restarcie Core),
- `cursor` monotoniczny w obrębie epoch,
- UI obsługuje „epoch switch” poprzez snapshot.

To usuwa niejednoznaczności reconnect.

### 4.3 Sceny i migracje: narzędzie `scene-migrate`
Masz `formatVersion` — super. Future-proof to:
- jawny katalog migracji (v1→v2),
- narzędzie CLI,
- testy migracji na fixtures.

---

## 5) Jak bym zrobił, żeby była lepszej jakości (bardziej „spec”, mniej „opis”)

- Dodać „Acceptance criteria per moduł” (Core/Gateway/Roboshop adapter/Sim/Proxy).  
  Masz wymaganie, że etapy mają mieć AC — dołóż konkretne punkty (2–5 na moduł).
- Dodać 3–5 diagramów sekwencji „w stylu spec”:  
  scenariusze z §19 są świetne, ale warto dopisać warunki brzegowe (timeout, rollback, kto emituje jaki event).
- Dodać formalne kontrakty danych (JSON Schema / TS types) jako artefakty repo, a w dokumencie trzymać JSON5 przykłady.

---

## 6) Jak bym zrobił, żeby była bardziej profesjonalna

- Dodać „Decision log / ADR index” (nawet jeśli w tej chwili to 5 plików).  
  Masz już sekcję „Rzeczy usunięte” — to jest dobry zalążek ADR.
- Ujednolicić nazwy endpointów i zasady wersjonowania:
  - publiczne `/api/v1/*`,
  - wewnętrzne `/internal/v1/*` (albo inny prefix),
  - compat API jako osobny BFF (jeśli powstanie).
- Dopisać politykę security:
  - minimalny threat model (kto może wysyłać STOP/manual),
  - rate limiting na manual i na import scen,
  - logowanie i redakcja danych wrażliwych (np. tokeny).

---

## 7) Jak bym zrobił, żeby była bardziej odporna na wszelkiego typu błędy

### 7.1 Parametry czasowe jako twarde ustawienia (z defaultami)
W spec pojawiają się:
- `minUpdateMs`, `validForMs`, TTL idempotency, timeouty socketów, itd.

Warto zebrać to w jedną tabelę „Timing & safety params”:
- nazwa, jednostka, default, zakres, wpływ.

To ogranicza „magiczne liczby” w implementacji i ułatwia tuning.

### 7.2 Recovery: procedury atomowe i rollback (zwłaszcza hot-switch i activate scene)
Masz już flow. Dopisz:
- fazy,
- warunki przejścia,
- co jest rollbackiem,
- kiedy eskalacja do operatora.

### 7.3 Degradacja: „offline robot = przeszkoda”
W dokumentacji algorytmu jest dużo o bezpieczeństwie i lockach. W architekturze warto dopisać regułę spójną z tym:
- jeśli robot jest OFFLINE lub stale telemetria, jego ostatnia pozycja jest traktowana jako dynamiczna przeszkoda/zasób blokujący, dopóki operator nie potwierdzi sytuacji.

---

## 8) Jak byśmy zrobili, żeby lepiej się nadawała do pracy z AI

Masz już świetne fundamenty (fixtures/replays, JSON5 examples, contract tests). Dodałbym:

1) **Kontrakty jako repo-artifacts**  
   - `contracts/openapi.yaml` (Core + Gateway),
   - `contracts/schemas/*.json` (Scene, RobotStatus, Task, EventEnvelope, RTP),
   - a w dokumencie linki do tych artefaktów.

2) **„Golden outputs” do golden scenes**  
   Nie tylko sceny i logi, ale też oczekiwane „wyniki”:
   - snapshot state na ticku 0,
   - expected `robot.updated` eventy (kluczowe pola),
   - expected decyzje w scenariuszach.

3) **Checklisty implementacyjne**  
   Każdy moduł ma listę „AI tasks”, np.:
   - „wygeneruj OpenAPI dla /api/v1/robots i /api/v1/tasks”,
   - „wygeneruj JSON Schema dla manifest.json”,
   - „wygeneruj contract tests z przykładów JSON5”.

4) **Zasada „unknown fields = reject”**  
   Dla AI (i ludzi) bardzo pomaga, gdy API waliduje payloady i nie przyjmuje „prawie dobrych” danych.

---

## Proponowana krótka lista zmian do v0.3 (najbardziej opłacalne)

1. Naprawić/doprecyzować `jsonSize` w RoboCore frame (offsety + długość).  
2. Dopisać „Command lifecycle” + reason codes dla robot/task/command.  
3. Dopisać „manual control lease” (multi-frontend safety).  
4. Dopisać „Map contract: raw vs compiled + jednostki + enumeracje”.  
5. Dopisać „cursor epoch” / zasady cursor po restart/scene activate.  
6. Dopisać minimalny kontrakt persystencji (durable set + rotacja).

---

### Podsumowanie

v0.2 jest już naprawdę mocną specyfikacją architektury: ma sensowne granice, spójne realtime, jasne safety boundaries (watchdog), oraz świetnie zaplanowane testy i replay. Największe ryzyko implementacyjne zostało zepchnięte do miejsc, które łatwo doprecyzować: (a) szczegóły protokołu (jsonSize), (b) control ownership dla manual, (c) dokładny kontrakt mapy (jednostki i semantyka).
