# fleet-gateway — Specyfikacja komponentu (v0.9)

## 1. Rola w systemie (MUST)
`fleet-gateway` jest warstwą integracji robotów. Ukrywa TCP RoboCore/Robokit, reconnecty i normalizuje telemetrię do kanonicznego `RobotRuntimeState`.
UI **MUST NOT** komunikować się z gateway bezpośrednio.

## 2. Zakres i odpowiedzialności (normatywnie)
#### Scope
Fleet Gateway jest adapterem do robotów: tłumaczy `CommandRecord` i kontrakty statusów na protokoły zewnętrzne (RoboCore/Robokit). Gateway ukrywa TCP, reconnecty i normalizuje telemetrię.

#### Responsibilities
Fleet Gateway MUST:
- udostępniać API `/gateway/v1/**` dla Fleet Core (UI nie komunikuje się z Gateway),
- implementować providery: `internalSim`, `robokitSim`, `robocore` (real),
- wspierać hot-switch providera per robot (procedura w `11_*`),
- deduplikować komendy po `commandId` i zapewniać idempotentne ACK,
- normalizować statusy robota do `RobotRuntimeState.navigation/blocked/fork` (kanoniczny model),
- implementować timeouts/retry/backoff + circuit breaker na TCP,
- parsować ramki TCP odporne na partial frames i resync (patrz `10_*`),
- umożliwić debug capture (MAY) oraz integrację z proxy-recorder (dev).

Fleet Gateway MUST NOT:
- przyjmować mutacji od UI,
- implementować logiki przydziału zadań/lockowania (to domena/algorytm).

#### Interfaces
Wystawia (private): opisane w **Załączniku A** (w tym pliku).

Konsumuje (external): RoboCore/Robokit TCP — `10_protokol_robocore_robokit.md`.

#### Ważna zasada: mapowanie NodeId → external station id
- Fleet Core SHOULD rozwiązywać `targetRef.nodeId` do identyfikatora zewnętrznego (`targetExternalId`) na podstawie `SceneGraph.nodes[].externalRefs`.
- Gateway MUST preferować `payload.targetExternalId` jeśli jest podane.
- Jeśli `targetExternalId` brak, Gateway MAY użyć `targetRef.nodeId` jako fallback (przy założeniu, że NodeId = stationId).

#### Failure modes i odporność
- Gateway MUST raportować `connected/connecting/disconnected/error` per robot oraz `lastSeenTsMs`.
- Jeśli robot w emergency: Gateway MUST odmówić wysłania komend ruchu (failsafe) i zwrócić błąd z reason code.

#### Testy
- MUST mieć golden captures dla parsowania ramek i generowania ramek (z proxy-recorder).

Related: `01_fleet-core.md`, `10_adapters-robokit.md`, `06_proxy-recorder.md`, `99_pozostale.md` (testy/E2E).

## 3. Interfejsy
### 3.1 Wystawiane (private, tylko dla Core)
- HTTP Base URL: `http://<gateway-host>:<port>/gateway/v1`
- Szczegóły endpointów: **Załącznik A**.

### 3.2 Konsumowane (external)
- RoboCore/Robokit TCP (wiele portów: state/ctrl/task/other/push)
- Kanoniczny opis framingu i payloadów: `10_adapters-robokit.md` (w tej paczce).

## 4. Konfiguracja (FleetGatewayConfig)
### 6.2 FleetGatewayConfig
```json5
{
  dataDir: "./data",
  captureDir: "./data/capture",

  http: { listenHost: "0.0.0.0", listenPort: 8081 },

  providers: {
    internalSim: { enabled: true },

    // real robot via Robokit TCP framing (RoboCore/Robokit)
    robocore: {
      enabled: true,
      robots: {
        "RB-01": { host: "10.0.0.11", ports: { state: 19204, ctrl: 19205, task: 19206, other: 19210, push: 19301 } },
      },
      tcp: {
        connectTimeoutMs: 800,
        requestTimeoutMs: 1000,
        maxConcurrentPerRobot: 4,
        circuitBreaker: { failureThreshold: 5, openMs: 5000 },
        reconnect: { enabled: true, baseDelayMs: 500, maxDelayMs: 10000, backoffFactor: 2.0 },
      },
    },

    // robokit-robot-sim (zewnętrzny symulator) przez ten sam protokół TCP
    robokitSim: {
      enabled: true,
      robots: {
        "RB-01": { host: "127.0.0.1", ports: { state: 19204, ctrl: 19205, task: 19206, other: 19210, push: 19301 } },
      },
    },
  },
}
```

## 5. Zasady odporności (MUST)
Gateway MUST:
- implementować timeouts/retry/backoff + circuit breaker na TCP,
- być odporny na partial frames i resync,
- deduplikować komendy po `commandId` i zapewniać idempotentne ACK po HTTP,
- raportować świeżość telemetrii (`lastSeenTsMs`) i stan połączenia per robot.

## 6. Provider switching i symulacja (MUST)
W MVP gateway obsługuje providery `internalSim`, `robokitSim`, `robocore` i umożliwia hot-switch per robot.
Szczegółowa specyfikacja: **Załącznik B**.

---



## 4. Lokalne struktury danych `fleet-gateway` (MUST)

Gateway jest integracją, więc „lokalne dane” to głównie:
- stan połączeń TCP,
- ostatnia telemetria,
- tabela idempotencji komend,
- konfiguracja providerów i przełączeń.

### 4.1 In-memory: RobotGatewayState (kanoniczne)

```json5
{
  robotsById: {
    "RB-01": {
      provider: {
        kind: "robocore",              // internalSim | robokitSim | robocore
        connectionStatus: "online",    // offline | connecting | online | error
        lastSeenTsMs: 1736160000123,
        lastError: null,
      },

      // ostatni znany raw status (opcjonalnie; może być duży)
      rawStatus: { /* external/protocol-specific */ },

      // kanoniczny status dla Core
      normalized: { /* RobotRuntimeState subset */ },

      // idempotencja komend
      commandDedup: {
        "cmd_01JH...": {
          firstSeenTsMs: 1736160000456,
          lastResult: { /* CommandTransportAck */ },
        }
      },

      // stan parsera ramek TCP (per port)
      tcp: {
        state: { /* FrameAssemblerState */ },
        ctrl:  { /* FrameAssemblerState */ },
        task:  { /* FrameAssemblerState */ },
        other: { /* FrameAssemblerState */ },
        push:  { /* FrameAssemblerState */ },
      },
    }
  }
}
```

### 4.2 FrameAssemblerState (MUST)

Gateway MUST być odporny na partial frames, desynchronizację i reconnect.
Minimalny stan asamblera:

```json5
{
  buffer: "<bytes>",          // niekompletne dane
  expectedLen: 0,             // jeśli nagłówek już znany
  lastGoodFrameTsMs: 0,
  resyncCount: 0,
}
```

### 4.3 Persystencja (MAY/DEV)

Gateway MAY zapisywać na dysk:
- capture ramek (dla debug),
- per-robot „ostatni status” jako plik pomocniczy,
ale **source of truth** zawsze pozostaje Core.

---

## 5. Pobieżny algorytm działania `fleet-gateway`

### 5.1 Pętla połączeń i telemetrii (MUST)

Gateway MUST utrzymywać pętlę per robot/provider:

```text
for each robot:
  ensureConnected(provider)
  read status frames (push lub polling)
  parse frames -> raw status
  normalize raw -> RobotRuntimeState subset
  expose via HTTP GET /robots...
```

**MUST (freshness):**
- Gateway MUST oznaczać `lastSeenTsMs` i `connectionStatus`.
- Jeśli brak statusu dłużej niż `telemetryTimeoutMs`, `connectionStatus` MUST przejść na `offline|error`.

### 5.2 Wysyłanie komend (Core → Gateway → TCP) (MUST)

```text
POST /robots/{id}/commands(commandRecord):
  validate payload
  if commandId already seen: return same ACK (idempotent)
  encode to RoboCore/Robokit frame(s)
  send on correct TCP port (ctrl/task/other)
  wait for protocol ACK (jeśli dostępny, bounded timeout)
  return CommandTransportAck (HTTP) + RobotProtocolAck (best effort)
```

**MUST:**
- Gateway MUST rozróżniać:
  - transport ACK (HTTP 200 accepted),
  - protocol ACK (robot przyjął ramkę),
  - DONE/complete — to nie jest domena Gateway; Core decyduje o completion.

### 5.3 Provider switch (MUST)

Provider switch jest operacją „integracyjną”:
- zamykamy połączenia TCP starego providera,
- otwieramy nowe,
- wykonujemy handshake/resync,
- zachowujemy ostatni status, ale oznaczamy go jako stale.

Gateway MUST implementować jako operację per-robot z blokadą (żeby nie mieszać komend).

---

## 6. Wejściowe API — minimalna checklista MVP

To jest lista endpointów, które muszą działać, żeby ruszył walking skeleton (Algorithm Level0) oraz pierwsze integracje.

Gateway MUST wystawić:
- `GET /gateway/v1/health`
- `GET /gateway/v1/robots`
- `GET /gateway/v1/robots/{robotId}/status`
- `POST /gateway/v1/robots/{robotId}/commands` *(goTarget + forkHeight + stop)*
- `POST /gateway/v1/robots/{robotId}/provider-switch`

Pozostałe endpointy debug (capture/reconnect) są MAY, ale bardzo pomagają w reverse engineeringu.

---

## Załącznik A — API Fleet Gateway (verbatim z v0.7)
# Fleet Manager 2.0 — API Fleet Gateway (wewnętrzne) (v0.7)

Base URL: `http://<gateway-host>:<port>/gateway/v1`

## 1. Zasady ogólne
- Gateway obsługuje providerów per-robot.
- Gateway nie jest źródłem prawdy domenowej (source of truth = Core).
- Gateway MUST być idempotentny dla komend z `commandId`.
- Gateway MUST NOT markować komendy jako `completed` — DONE jest w domenie Core (patrz `07_*`).
- Gateway MUST implementować retry/reconnect/circuit breaker na TCP do robota.
- Gateway MUST logować integracyjne błędy do `captureDir` (gdy debug enabled).

## 2. Health
### GET /health
```json5
{ status: "ok", tsMs: 1736160000000 }
```

## 3. Robots
### GET /robots
Response:
```json5
{
  robots: [
    {
      robotId: "RB-01",
      provider: { kind: "robocore", status: "online", lastSeenTsMs: 1736160000123 },
      raw: { /* opcjonalny raw status z robota (zewn.) */ },
      normalized: { /* RobotRuntimeState subset */ }
    }
  ]
}
```

### GET /robots/{robotId}/status
Response:
```json5
{ robotId: "RB-01", normalized: { /* RobotRuntimeState subset */ } }
```

## 4. Commands (Core→Gateway)
### POST /robots/{robotId}/commands
Request:
```json5
{
  commandId: "cmd_01JH...",
  robotId: "RB-01",
  type: "goTarget", // MUST
  payload: {
    targetRef: { nodeId: "LM2" }, // goTarget

    // opcjonalnie: rozwiązany identyfikator stacji w protokole robota
    // Jeśli podane, Gateway MUST użyć tego pola zamiast nodeId.
    targetExternalId: "LM2",

    // forkHeight
    toHeightM: 1.20,
  },

  // korelacja
  request: { clientId: "ui-01", requestId: "req_01..." },
}
```

Response 200 (MUST: bez "DONE"):
```json5
{
  commandId: "cmd_01JH...",

  // transport ACK (HTTP)
  transport: {
    status: "accepted",        // accepted | failed
    acceptedTsMs: 1736160000456,
    providerKind: "robocore",  // internalSim | robokitSim | robocore
  },

  // robot protocol ACK (jeśli dostępne w danym providerze/protokole)
  robotAck: {
    status: "received",        // received | notSupported | failed
    receivedTsMs: 1736160000789,
    apiNo: 3051,
    seq: 42,
    responseApiNo: 13051,
    lastErrorCauseCode: "NONE" // NONE | TIMEOUT | NETWORK_ERROR | COMMAND_REJECTED
  },

  statusReasonCode: "NONE",

  // debug: mapping do robota (opcjonalnie)
  providerCommand: { /* ... */ }
}
```

Errors:
- 404 jeśli `robotId` nieznany
- 503 jeśli provider offline
- 400 jeśli payload niepoprawny

**Idempotencja:**
- Powtórzony request z tym samym `commandId` MUST zwrócić ten sam rezultat (lub semantycznie równoważny).

## 5. Provider switch
### POST /robots/{robotId}/provider-switch
Request:
```json5
{
  robotId: "RB-01",
  targetProvider: "internalSim", // internalSim | robokitSim | robocore
  reason: "test",
  request: { clientId: "core", requestId: "req_01JH..." },
}
```
Response:
```json5
{ ok: true, robotId: "RB-01", provider: { kind: "internalSim", status: "online" } }
```

Gateway MUST:
- zamknąć połączenia TCP starego providera,
- podnieść nowy provider,
- nie gubić informacji o ostatnim statusie (może być stale), ale MUST to oznaczyć.

## 6. Debug endpoints (MAY)
- `GET /robots/{robotId}/capture/latest`
- `GET /robots/{robotId}/raw-status`
- `POST /robots/{robotId}/tcp/reconnect`

## 7. Kontrakt “provider layer” (wewnętrzny)
Każdy provider w gateway MUST implementować:
- `connect()` / `disconnect()`
- `getNormalizedStatus()`
- `sendCommand(command)`
- `configurePush()` (jeśli wspiera)

Szczegóły protokołu TCP w `10_protokol_robocore_robokit.md`.

---

## Załącznik B — Symulacja i hot-switch providerów (verbatim z v0.7)
# Fleet Manager 2.0 — Symulacja i hot-switch providerów (v0.7)

## 1. Provider model (MUST)
Gateway obsługuje provider per-robot:
- `internalSim` — deterministyczna symulacja 2D (wiele robotów, kolizje)
- `robokitSim` — zewnętrzny symulator po protokole RoboCore/Robokit TCP
- `robocore` — prawdziwy robot po protokole RoboCore/Robokit TCP

Core widzi tylko `provider.kind` i `RobotRuntimeState` (znormalizowany).

## 2. InternalSim — wymagania (MUST)
- Symulator MUST obsługiwać wiele robotów w jednej scenie.
- Symulator MUST uwzględniać kolizje robot-robot na poziomie „footprint + safetyMargin”.
- Symulator SHOULD korzystać z geometrii mapy (DegenerateBezier → polilinia) dla ruchu po trasie.
- Symulator MUST mieć tryb deterministyczny (seed) i generować te same eventy przy tym samym wejściu.

Minimalny model ruchu (MVP):
- robot porusza się po kolejnych węzłach (LM/AP) z prędkością `maxVxMps`,
- skręty są dyskretne (ustawienie angle na końcu krawędzi),
- kolizja wykrywana jako przecięcie footprintów; reakcja: zatrzymanie + `blocked`.

## 3. Hot switch (Core→Gateway) — procedura (MUST)
Przełączanie pojedynczego robota w trakcie symulacji jest dozwolone.

### 3.1 Bezpieczna sekwencja
1) Core emituje `commandCreated(stop)` i dispatchuje do Gateway (best effort).
2) Core wywołuje `POST /gateway/v1/robots/{robotId}/provider-switch`.
3) Core emituje `robotProviderSwitched` i zapisuje snapshot.
4) Core wznawia Task Runner / rolling target dla tego robota dopiero, gdy `provider.status=online`.

### 3.2 Co jeśli stop się nie uda?
- To jest best-effort.
- Core MUST oznaczyć `statusReasonCode=PROVIDER_SWITCHING` i wyświetlić warning w UI.
- W przyszłości: hard interlock (poza MVP).

## 4. Przełączenie robota na „robokitSim” (test bez prawdziwego robota)
Cel: uruchomić ten sam algorytm i te same kontrakty, a zamiast internal sim sterować robokit-robot-sim.

Wymagania:
- Gateway MUST używać tego samego kodu protokołu TCP dla `robokitSim` i `robocore`.
- Core nie powinien wiedzieć, czy robot jest prawdziwy czy symulowany.

## 5. Przełączenie na prawdziwego robota (robocore)
- W MVP dopuszczamy ręczne zapewnienie, że mapa robota odpowiada aktywnej scenie.
- Core/Gateway MUST udostępniać status: `currentMap`/`mapName` jeśli dostępne (push/all status).

## 6. Failure modes (MUST)
- Jeśli provider offline: Core MUST hold (nie wysyłać goTarget/forkHeight).
- Jeśli provider zmienia się: Core MUST hold do czasu online.
