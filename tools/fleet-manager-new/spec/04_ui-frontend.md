# ui-frontend — Specyfikacja komponentu (v0.9)

## 1. Rola w systemie (MUST)
`ui-frontend` jest klientem (WWW) do obserwacji i sterowania. System MUST działać headless; UI jest tylko jednym z klientów.
Wiele instancji UI może obserwować równolegle, ale mutacje wymagają `ControlLease` (seize control).

## 2. Zakres i odpowiedzialności (normatywnie)
#### Scope
UI jest klientem: renderuje mapę, roboty, worksites/streams/tasks, umożliwia przejęcie kontroli (lease) i wykonywanie mutacji przez Core.

#### Responsibilities
UI MUST:
- łączyć się tylko z Fleet Core (nigdy bezpośrednio z Gateway),
- subskrybować SSE i budować lokalny stan jako funkcję `stateSnapshot + delty`,
- obsługiwać Control Lease:
  - pokazywać kto ma kontrolę,
  - umożliwiać `seize`, `renew`, `release`,
  - w trybie viewer nie wykonywać mutacji,
- być odporne na reconnect SSE (wznawianie od `cursor`).

UI MUST implementować mechanizm „seize control”:
- instancja UI, która wykonuje `seize`, wywłaszcza poprzedniego operatora;
- UI MUST traktować utratę lease jako natychmiastowe przejście w read-only.

UI SHOULD:
- mieć czytelne debug widoki: locki, trasy, rolling target, bieżące komendy, reason codes.

Related: `03_*`, `07_*`, `08_*`.

## 3. Interfejsy
- UI komunikuje się WYŁĄCZNIE z `fleet-core` po HTTP+SSE.
- UI MUST implementować reconnect SSE i odbudowę stanu z `stateSnapshot` + delty.
- UI MUST być „read-only” bez ważnego lease.

## 4. Wymagania UX/Debug (SHOULD)
- Widok mapy + roboty + worksites/streams/tasks.
- Widoki debug: current provider, current command, rolling target, reason codes, locki/rezerwacje (gdy włączone).

## 5. Konfiguracja uruchomieniowa (MVP)
UI MUST dać się skonfigurować co najmniej przez:
- `CORE_BASE_URL` (np. `http://localhost:8080/api/v1`)
- `SSE_URL` (np. `http://localhost:8080/api/v1/events/stream`)

## 6. Testy (MUST)
- Jednostkowe: redukcja stanu (snapshot + eventy), formatowanie mapy, walidacje payloadów.
- Integracyjne: SSE reconnect + resync.
- E2E: scenariusze z `99_pozostale.md` → „Scenariusze E2E”.




## 7. Komunikacja z Core — szczegółowe API „z perspektywy UI” (MUST)

UI jest klientem, więc „wejściowe API” UI to w praktyce **API Core**, które UI wywołuje.  
Ta sekcja opisuje minimalny zestaw wywołań, jakie UI MUST implementować.

### 7.1 Bootstrap stanu (MUST)

1) Pobierz snapshot:
- `GET /api/v1/state?view=uiMinimal`

Response (przykład skrócony):
```json5
{
  cursor: 123456,
  tsMs: 1736160000123,
  activeSceneId: "scene_01JH...",
  controlLease: { /* ControlLease | null */ },

  robots: [
    { robotId: "RB-01", pose: { xM: 1.0, yM: 2.0, angleRad: 0.0 }, navigation: { /* ... */ } },
  ],

  tasks: [
    { taskId: "task_01JH...", kind: "pickDrop", status: "queued" },
  ],
}
```

2) Podłącz SSE:
- `GET /api/v1/events/stream?fromCursor=123456`

UI MUST:
- trzymać `lastCursor`,
- aplikować eventy jako redukcję stanu (snapshot + delty),
- przy reconnect użyć `fromCursor=lastCursor`.

### 7.2 Control Lease (MUST)

#### Seize
`POST /api/v1/control-lease/seize`
```json5
{
  displayName: "UI Traffic Lab",
  ttlMs: 15000,
  force: true,
  request: { clientId: "ui-01", requestId: "req_01JH..." },
}
```

Response:
```json5
{ lease: { leaseId: "lease_01JH...", owner: { clientId: "ui-01" }, expiresTsMs: 1736160015000 } }
```

UI MUST traktować `leaseId` jako token do wszystkich mutacji.

#### Renew
`POST /api/v1/control-lease/renew`
```json5
{ leaseId: "lease_01JH...", ttlMs: 15000, request: { clientId: "ui-01", requestId: "req_01JH..." } }
```

#### Release
`POST /api/v1/control-lease/release`
```json5
{ leaseId: "lease_01JH...", request: { clientId: "ui-01", requestId: "req_01JH..." } }
```

**MUST:** jeśli UI utraci lease (event `controlLeaseSeized` lub TTL wygaśnie), UI MUST natychmiast przejść w tryb read-only.

### 7.3 Mutacje domenowe (MUST minimalnie)

#### Create task (pickDrop)
`POST /api/v1/tasks`
```json5
{
  leaseId: "lease_01JH...",
  task: {
    kind: "pickDrop",
    streamId: "stream_inbound_01",
    fromWorksiteId: "PICK_01",
    toWorksiteId: "DROP_01",
    priority: 10,
  },
  request: { clientId: "ui-01", requestId: "req_01JH..." },
}
```

#### Manual command (debug / MVP)
`POST /api/v1/robots/RB-01/commands`
```json5
{
  leaseId: "lease_01JH...",
  command: {
    type: "goTarget",
    payload: { targetRef: { nodeId: "LM2" } },
  },
  request: { clientId: "ui-01", requestId: "req_01JH..." },
}
```

#### Provider switch
`POST /api/v1/robots/RB-01/provider-switch`
```json5
{
  leaseId: "lease_01JH...",
  targetProvider: "robokitSim",
  request: { clientId: "ui-01", requestId: "req_01JH..." },
}
```

#### Scene import + activate
UI MAY obsłużyć import sceny, ale w MVP może to robić CLI/bridge.

- `POST /api/v1/scenes/import`
- `POST /api/v1/scenes/activate`

---

## 8. Lokalne struktury danych UI (MUST)

UI SHOULD mieć jeden „store” (Redux/Zustand/Vuex — obojętne), który jest wprost redukowalny.

Minimalny model:

```json5
{
  connection: { sse: "connected", lastCursor: 123456 },

  control: {
    lease: { /* ControlLease | null */ },
    mode: "viewer", // viewer | controller
  },

  scene: {
    activeSceneId: "scene_01JH...",
    graph: { /* SceneGraph minimal do renderu */ },
  },

  robots: {
    byId: {
      "RB-01": { pose: { xM: 1.0, yM: 2.0, angleRad: 0.0 }, provider: { kind: "robocore" }, ui: { selected: true } },
    },
    order: ["RB-01"],
  },

  tasks: { byId: { /* ... */ }, order: [] },

  debug: {
    showLocks: true,
    showRoutes: true,
    showRollingTarget: true,
    lastErrors: [ /* ErrorEnvelope */ ],
  },
}
```

**MUST:** wszystkie eventy SSE muszą być mapowane do reduktora (`applyEvent(state, event)`), a snapshot do `hydrate(state, snapshot)`.

---

## 9. Pobieżny algorytm UI (jak działa w runtime)

1) `hydrate()` ze snapshotu.
2) `connectSse(fromCursor)` i aplikuj delty.
3) Jeśli user chce sterować:
   - `seize()`,
   - start `renew()` timer (np. co 1/3 TTL),
   - przy błędzie renew: przejdź do viewer.
4) Każda akcja UI = request z `(clientId, requestId)` (idempotencja).

---

## 10. Co UI musi pokazać (MVP) (MUST)

- aktywną scenę i jej status (activating/active/paused),
- listę robotów i ich:
  - pose (x,y,angle),
  - provider kind + connection status,
  - navigation state (idle/moving/blocked),
  - fork state,
  - current task / current command,
- listę zadań (queued/running/done) i reason codes,
- kto ma Control Lease + przycisk „Seize control”.

