# API używane pomiędzy UI a Core (stan „as-is”) + rekomendacje usprawnień

Poniżej jest opis faktycznie używanego kontraktu pomiędzy **UI (`apps/fleet-ui`)** a **Core (`apps/fleet-core`)** w tym repozytorium (na podstawie kodu), a następnie lista miejsc do uproszczeń/ulepszeń oraz rzeczy do doprecyzowania w specyfikacji.

---

## 1) Co realnie dzieje się pomiędzy UI a Core

W tym MVP zachodzą dwa równoległe przepływy:

1. **UI w przeglądarce** komunikuje się z Core po **HTTP JSON** + **SSE** (Server‑Sent Events).
2. Dodatkowo proces **`fleet-ui/server.js`** w trybie MVP0 działa jako *symulator* i **pcha statusy robota do Core** (to nie jest „publiczne UI‑API”, tylko kanał symulacji/telemetrii).

---

## 2) Transport i baza URL

- Transport: **HTTP + JSON** oraz **SSE**.
- Core wystawia endpointy pod: **`/api/v1/*`** (`apps/fleet-core/server.js`).
- UI pobiera konfigurację z **`GET /api/fleet/config`** (to serwuje `fleet-ui`, nie Core) i dostaje m.in. `apiBase` (np. `http://localhost:8080/api/v1`) z `apps/fleet-ui/mock-config.json`.

W praktyce przeglądarkowe UI używa URL-i wyliczanych z `apiBase`.

---

## 3) Endpointy, których UI używa dziś realnie

### A) Snapshot stanu (bootstrap / fallback polling)

**`GET /api/v1/state`**

Core zwraca snapshot w JSON (przykładowy kształt):

```json5
{
  "cursor": 0,
  "tsMs": 1736...,
  "activeSceneId": null,
  "controlLease": null,
  "robots": [ ... ],
  "tasks": [ ... ]
}
```

UI konsumuje to w `apps/fleet-ui/public/modules/app/app_data.js`:

- `refreshFleetStatus()` pobiera `state.fleetStatePath` (zwykle `${apiBase}/state`)
- `applyFleetStatus(payload)` mapuje `payload.robots` i `payload.tasks`

---

### B) Stream aktualizacji (SSE)

**`GET /api/v1/stream`**

To jest główny kanał “na żywo” dla UI w MVP.

Core wysyła eventy SSE o typie **`state`**:
- `event: state`
- `data: <JSON>`

Payload wygląda jak snapshot (często pełny, „odświeżający”):

```json5
{
  "ok": true,
  "tsMs": 1736...,
  "activeSceneId": null,
  "controlLease": null,
  "robots": [ ... ],
  "tasks": [ ... ]
}
```

UI:
- używa `new EventSource(streamUrl)`
- nasłuchuje eventu `state`
- robi fallback do polling, jeśli SSE padnie

---

### C) Tworzenie zadania

**`POST /api/v1/tasks`**

UI wysyła payload w stylu:

```json5
{
  "task": {
    "kind": "pickDrop",
    "fromNodeId": "PICK-01",
    "toNodeId": "DROP-01",
    "parkNodeId": "PARK-01",
    "pickHeightM": 1.2,
    "dropHeightM": 0.1
  }
}
```

Core tworzy zadanie i zwykle odpowiada:

```json5
{ "taskId": "task_...", "ok": true }
```

---

## 4) Endpointy w Core, które istnieją, ale UI ich dziś realnie nie używa (albo są stubami)

W `apps/fleet-core/server.js` są m.in.:

- `GET /api/v1/health` (i alias `/health`)
- Control lease (prosty, in‑memory):
  - `POST /api/v1/control-lease/seize`
  - `POST /api/v1/control-lease/renew`
  - `POST /api/v1/control-lease/release`
- Scenes (stub):
  - `POST /api/v1/scenes/import`
  - `POST /api/v1/scenes/activate`
  - `GET  /api/v1/scenes`
- Manual command (stub/forward):
  - `POST /api/v1/robots/:robotId/commands`
- Provider switch (stub):
  - `POST /api/v1/robots/:robotId/provider-switch`

---

## 5) Kanał „status robota do Core” (wykorzystywany przez symulator)

**`POST /api/v1/robots/:robotId/status`**

To jest wykorzystywane przez `fleet-ui/server.js` (funkcja `syncCoreRobots()`), który symuluje roboty i co ~200 ms pcha status w stylu:

```json5
{
  "status": {
    "status": "online",
    "nodeId": "...",
    "forkHeightM": 0.1,
    "pose": { "x": 0, "y": 0, "angle": 0 }
  }
}
```

To nie jest endpoint „dla przeglądarkowego UI”, tylko raczej „telemetria/gateway/symulacja”. Warto go traktować jako **internal**.

---

## 6) Największe rozjazdy / niejednoznaczności w obecnym kontrakcie

### 6.1. Dwa różne „streamy” i brak formalnego resume
- Spec sugeruje EventEnvelope + `cursor` + resume (`fromCursor`, `Last-Event-ID`).
- Implementacja UI↔Core w MVP używa `/api/v1/stream` jako streamu snapshotów **bez** `id:` i bez gwarantowanego rosnącego `cursor`.
- Są też endpointy `/api/v1/events` i `/api/v1/events/stream`, ale w kodzie to bardziej „ping/hello” niż eventy domenowe.

Efekt: reconnect UI nie ma formalnego „wznawiania” i nie ma gwarancji, że UI zobaczy wszystkie zmiany bez okresowego resync przez `/state`.

---

### 6.2. Niespójne envelopy odpowiedzi i błędów
- `/api/v1/state` zwraca „czyste dane”, a `/api/v1/stream` zwraca `ok: true`.
- Błędy zwracane są w różnych kształtach (`{error:"..."}`, `{ok:false,...}`, czasem tekst).

Spec ma kanoniczny `ErrorEnvelope` (`spec/99_pozostale.md`), ale implementacja nie jest konsekwentna.

---

### 6.3. Task status: `canceled` vs `cancelled`
W Core (runtime) spotyka się:
- `task.status === 'canceled'` (jedno „l”)

W UI mapping rozpoznaje:
- `"cancelled"` (dwa „l”)

To prowadzi do rozjazdów w widoku statusów.

---

### 6.4. UI wysyła „akcje robota” jako różne endpointy, których Core nie ma
UI (front) ma wzorzec:
- `POST ${apiBase}/robots/:id/:action` (np. `manual`, `pause`, `resume`, `cancel`, `go-target`, `motion`)

Core ma:
- `POST /api/v1/robots/:id/commands` (stub/forward)

Czyli w czystym połączeniu z Core część akcji UI będzie kończyć się 404.

---

### 6.5. Publiczne vs wewnętrzne endpointy pomieszane
`POST /api/v1/robots/:id/status` jest bardzo wygodne do symulacji, ale jako publiczne API:
- umożliwia „udawanie robota” przez dowolnego klienta
- powinno być jawnie **internal** lub zabezpieczone.

---

## 7) Co uprościć i ulepszyć (rekomendacje)

### 7.1. Ujednolicić model live updates (SSE) i dowieźć resume
Obecnie są: `/state`, `/stream`, `/events/stream`.

Dwie sensowne ścieżki:

**Opcja A (bardziej spec‑first i skalowalna):**
- `GET /api/v1/state?view=uiMinimal` → snapshot z **cursor**
- `GET /api/v1/events/stream?fromCursor=...` → **EventEnvelope** (deltowe eventy + `id:` w SSE)
- UI przechowuje `lastCursor` i wznawia połączenie
- `/stream` jako legacy albo do usunięcia po migracji

**Opcja B (minimalna zmiana MVP, ale z domknięciem spójności):**
- zostawić `GET /api/v1/stream`, ale:
  - dodać **`cursor` rosnący** w payload
  - ustawiać SSE `id: <cursor>`
  - dodać `fromCursor` (i/lub obsłużyć `Last-Event-ID`)
  - na start wysyłać snapshot + potem ticki

---

### 7.2. Ujednolicić kształt odpowiedzi i błędów
- Ustalić jedną konwencję dla successów: np. zawsze `{ ok:true, data:{...} }` **albo** zawsze „czyste dane”.
- Ustalić jeden `ErrorEnvelope` dla wszystkich błędów + konsekwentne statusy HTTP.

Zysk: UI ma jedno miejsce do obsługi błędów i logowania.

---

### 7.3. Ujednolicić komendy robota do jednego endpointu
Zamiast wielu endpointów „per action”:

- `POST /api/v1/robots/:id/commands`

Payload np.:

```json5
{
  "leaseId": "lease_...",
  "command": { "type": "manualMode", "payload": { "enabled": true } },
  "request": { "clientId": "ui", "requestId": "..." }
}
```

Zysk: prostsza warstwa UI, łatwiejsze forwardowanie do gateway, jeden punkt walidacji/lease/idempotencji.

---

### 7.4. Ustandaryzować nazwy i enumy
Minimum do zamknięcia:
- `canceled` vs `cancelled` (wybrać jedno)
- `taskId` vs `id` (kanoniczna nazwa + ewentualnie alias)
- `robotId` vs `id`
- `pose.angle` → dopisać jednostkę: `angleRad` lub `angleDeg`

---

### 7.5. Idempotencja mutacji (bardzo ważne dla UI)
Spec wspomina `(clientId, requestId)`, ale implementacja MVP tego nie egzekwuje.

Rekomendacja:
- przyjmować `request: { clientId, requestId }` dla mutacji (`POST /tasks`, `POST /robots/:id/commands`, itd.)
- cache wyników per `(clientId, requestId)` przez N minut
- powtórka requestu zwraca ten sam rezultat (bez duplikowania tasków/komend)

---

### 7.6. Control lease: doprecyzować i egzekwować na endpointach mutujących
Aby lease miał sens:
- każde `POST` zmieniające stan powinno wymagać `leaseId`
- lease powinien być widoczny w `/state` i w SSE
- UI powinno wykonywać renew cyklicznie (np. co 1/3 TTL)

---

### 7.7. Rozdzielić public API od internal telemetrii/symulacji
`POST /api/v1/robots/:id/status`:
- przenieść pod `/internal/v1/...` albo `/api/v1/internal/...`, albo
- zabezpieczyć (np. shared secret / mTLS / token), oraz
- dopisać w spec wprost: „to jest kanał telemetryczny (Gateway/Sim), UI nie używa”.

---

## 8) Co lepiej opisać i wyspecyfikować (żeby zniknęła dwuznaczność)

1. **Schematy JSON (OpenAPI 3.1 + JSON Schema)**
   - pola wymagane/optional
   - enumy, formaty, ograniczenia
   - przykłady request/response

2. **Jednostki i układy odniesienia**
   - `pose.x/y` w metrach? w układzie mapy?
   - `angle` w radianach czy stopniach?
   - `tsMs` = epoch ms UTC (jeśli tak, opisać explicite)

3. **Semantyka statusów i przejść**
   - task: lista statusów + legalne przejścia (state machine)
   - robot: znaczenie `blocked`, `offline`, kto i kiedy to ustawia

4. **Gwarancje SSE i reconnect**
   - kolejność
   - możliwość duplikatów (UI musi być idempotentne)
   - zachowanie przy zbyt starym `fromCursor` (retencja) → sygnał „requiresResync” + snapshot

5. **Błędy**
   - katalog `causeCode` + mapowanie na HTTP statusy
   - konsekwentny `ErrorEnvelope`

6. **Wersjonowanie kontraktu**
   - `contractsVersion` w `/state` i eventach
   - polityka breaking vs non‑breaking changes

---

## TL;DR
UI realnie używa dziś głównie **`GET /api/v1/state` + `GET /api/v1/stream` + `POST /api/v1/tasks`**, ale żeby API było proste i odporne, warto: **ujednolicić stream (cursor + resume), ustandaryzować odpowiedzi i błędy, scalić komendy robota do jednego endpointu, doprecyzować enumy/jednostki, dodać idempotencję i sensownie egzekwować control lease**.
