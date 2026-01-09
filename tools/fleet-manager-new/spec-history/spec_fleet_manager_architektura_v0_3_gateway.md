# Fleet Manager 2.0 — Specyfikacja architektury (v0.3) — Fleet Gateway

> **Podział komponentowy (v0.3):** Ten plik zawiera część dotyczącą **Fleet Gateway** (integracja robotów) oraz **RoboCore/Robokit**.

> Kontrakty danych, reason codes, SSE i publiczne API są w pliku: `spec_fleet_manager_architektura_v0_3_core.md`.

---

## 3. Architektura wysokopoziomowa — wycinek: komponent Fleet Gateway

### 3.4 Specyfikacja komponentów (szczegółowo)

Poniżej jest normatywny opis komponentów, żeby granice odpowiedzialności były jednoznaczne.


#### 3.4.2 Fleet Gateway (integracja robotów)
Fleet Gateway **MUST**:
- Udostępniać API `/gateway/v1/**` dla Fleet Core.
- Implementować providery robotów (`internalSim`, `robokitSim`, `robokitReal`).
- Deduplikować komendy po `commandId` oraz zwracać jednoznaczny `gatewayStatus`.
- Stosować timeouts i retry przy komunikacji z robotami.
- Udostępniać stan połączenia (`connected/connecting/disconnected/error`) i `lastSeenTsMs`.

Fleet Gateway **MUST NOT**:
- Przyjmować mutacji od UI (UI nie zna gateway).
- Zawierać logiki algorytmu flotowego.

Fleet Gateway **SHOULD**:
- Zapewnić możliwość pollingu statusów oraz (MAY) wsparcie push/stream, jeśli robot dostarcza push.
- Rejestrować (MAY, w dev) surowe ramki RoboCore do plików capture, ale nie zastępuje to Proxy/Recorder.


#### 3.4.6 Internal Simulator (provider)
InternalSim **MUST**:
- Symulować wiele robotów równolegle.
- Uwzględniać możliwość kolizji (co najmniej prosty model: okręgi/footprint).
- Implementować minimalne komendy: `goPoint`, `stop`, `reloc`, `pause`, `resume`.
- Publikować statusy w tej samej postaci kanonicznej co realne roboty (Pose2D, Velocity2D, blocked/mode).
- Być sterowany przez Fleet Core poprzez ten sam kontrakt providerów (nie „specjalny przypadek” w algorytmie).

InternalSim **SHOULD**:
- Umożliwiać ustawienie `simSpeed` (np. 0.5x/1x/5x) i „step mode” (debug).



## 7. Fleet Gateway API (wewnętrzne)

### 7.1 Zasady ogólne
- Base URL: `http(s)://<fleet-gateway-host>/gateway/v1`
- To API jest **dla Fleet Core**, nie dla UI.
- Security jest poza MVP, ale gateway **SHOULD** być dostępny tylko w sieci wewnętrznej.

### 7.2 Health

#### `GET /gateway/v1/health`
```json5
{
  ok: true,
  tsMs: 1736160000123,
  build: { version: "0.3.0", gitSha: "abc123" }
}
```

### 7.3 Robots

#### `GET /gateway/v1/robots`
```json5
{
  robots: [
    {
      robotId: "RB-01",
      providerType: "robokitSim",
      connection: { status: "connected", lastSeenTsMs: 1736160000123, errorCode: null }
    }
  ]
}
```

#### `GET /gateway/v1/robots/{robotId}/state`
Zwraca „raw-ish” dane providera plus kanoniczny mapping, jeśli gateway to robi.
```json5
{
  robotId: "RB-01",
  providerType: "robokitSim",
  connection: { status: "connected", lastSeenTsMs: 1736160000123 },

  // Kanoniczne minimum dla core
  pose: { x: 1.2, y: 3.4, angle: 0.1 },
  velocity: { vx: 0.0, vy: 0.0, w: 0.0 },

  // Dane dodatkowe wprost z robota (snake_case, external) — tylko debug
  raw: {
    loc: { x: 1.2, y: 3.4, angle: 0.1, current_station: "AP7" },
    task: { task_status: 2, task_id: 123 }
  }
}
```

#### `POST /gateway/v1/robots/{robotId}/connect` (mutating)
Request:
```json5
{
  provider: {
    type: "robokitSim",
    config: { host: "127.0.0.1" }
  }
}
```

#### `POST /gateway/v1/robots/{robotId}/disconnect` (mutating)

### 7.4 Commands (wewnętrzne, od Core do Gateway)

#### `POST /gateway/v1/robots/{robotId}/commands` (mutating)
Request:
```json5
{
  commandId: "cmd_01JH1B...",
  tsMs: 1736160000123,

  // typ komendy kanonicznej
  type: "goPoint", // goPoint | goTarget | stop | pauseTask | resumeTask | cancelTask | reloc | pushConfig

  payload: {
    // dla goPoint:
    x: 10.0,
    y: 3.0,
    angle: 0.0
  },

  // opcjonalnie: deadline/timeout
  timeoutMs: 1500
}
```

Response:
```json5
{
  ok: true,
  commandId: "cmd_01JH1B...",
  gatewayStatus: "dispatched", // accepted | dispatched | failed
  // jeżeli failed:
  reasonCode: "ROBOT_OFFLINE"
}
```

Wymagania:
- Gateway **MUST** deduplikować komendy po `commandId` (idempotencja).
- Gateway **MUST** raportować jednoznacznie, czy komenda została tylko przyjęta, czy faktycznie wysłana do robota.
- W MVP: gateway może nie mieć pełnego „command completion tracking”, ale MUST przynajmniej mieć „dispatch ack”.

---



## 9. Przełączanie providera robota (hot switch)

### 9.1 Cel
W trakcie symulacji można przełączyć pojedynczego robota między:
- internalSim ↔ robokitSim ↔ robokitReal

### 9.2 Wymagania (MUST)
1. Switch **MUST** być wykonywany tylko w `paused` dla danego robota (Fleet Core musi wymusić pause/stop).
2. Switch **MUST** zatrzymać RTP/komendy ruchu dla robota (watchdog).
3. Switch **MUST** wykonać synchronizację pozycji:
   - jeśli nowy provider wspiera relocate: wykonać relocate na `pose`,
   - jeśli nie: ustawić robota w `fault` i wymagać manual confirmation.
4. Switch **MUST** mieć timeouty i reason codes, np.:
   - `SWITCH_FAILED_ROBOT_OFFLINE`,
   - `SWITCH_FAILED_RELOC_UNSUPPORTED`,
   - `SWITCH_FAILED_MAP_MISMATCH`.
5. Switch **MUST** być zapisany do event log.

### 9.3 Procedura
1. `pause` robota.
2. `stop` (failsafe) do starego providera.
3. Rozłącz starego providera (jeśli wymaga).
4. Podłącz nowego providera.
5. Pobierz status (pose).
6. Jeżeli wymagane, wykonaj relocate.
7. Ustaw `providerType` w runtime.
8. `resume` (opcjonalnie).

---



## 10. RoboCore / Robokit — opis protokołu (reverse engineered, v0.3)

> **Uwaga:** RoboCore/Robokit to protokół zewnętrzny. Ten opis jest stanem na dziś; po dalszym reverse engineeringu może zostać doprecyzowany. W MVP implementujemy to, co jest potrzebne do ruchu i statusu.

### 10.1 Transport
- TCP, wiele portów (STATE/CTRL/TASK/PUSH).
- Ramkowanie jest identyczne na każdym porcie.

### 10.2 Frame format (HEADER = 16 bytes)

Offsety i typy (big-endian tam, gdzie > 1 bajt):

- `0`  : `startMark` (uint8) = `0x5A`
- `1`  : `version` (uint8) = `0x01`
- `2..3` : `seq` (uint16 BE)
- `4..7` : `bodyLength` (uint32 BE)
- `8..9` : `apiNo` (uint16 BE)
- `10..15`: `reserved` (6 bytes)

Body:
- `bodyLength` bajtów.
- Jeśli `reserved[2..3]` (uint16 BE) > 0 i ≤ bodyLength, to:
  - pierwsze `jsonSize` bajtów body to JSON (UTF-8),
  - reszta to binarne dane (jeśli występują).
- W przeciwnym razie: całe body jest JSON.

Wymagania implementacyjne (Gateway MUST):
- Parser **MUST** resynchronizować strumień po `startMark` jeśli bajty się rozsypią.
- Parser **MUST** mieć limit `maxBodyLength` (np. 1 MiB) i odrzucać większe ramki.
- Parser **MUST** tolerować `jsonSize=0` (całość JSON).
- Parser **MUST** logować błędy JSON (jsonError) oraz zrzucać surowe ramki do capture (dev).

### 10.3 Response mapping
- Odpowiedź ma `apiNo = requestApiNo + 10000`.
- `seq` w odpowiedzi odpowiada request `seq`.

### 10.4 Porty (najczęściej spotykane)
- `STATE` = 19204 (status)
- `CTRL`  = 19205 (control)
- `TASK`  = 19206 (task commands)
- `PUSH`  = 19301 (push stream)

### 10.5 Minimalny zestaw API do MVP (numery)
Status:
- `robot_status_loc_req` = 1004
- `robot_status_task_req` = 1020
- `robot_status_block_req` = 1006

Control:
- `robot_control_stop_req` = 2000
- `robot_control_reloc_req` = 2002 (jeśli dostępne)

Task:
- `robot_task_gopoint_req` = 3050
- `robot_task_gotarget_req` = 3051 (opcjonalnie)
- `robot_task_pause_req` = 3001
- `robot_task_resume_req` = 3002
- `robot_task_cancel_req` = 3003

Push:
- `robot_push_config_req` = 9300

### 10.6 Przykładowe „ramki protokołu” (payload JSON)

#### 10.6.1 „Jedź do punktu” (`robot_task_gopoint_req` = 3050)
Request JSON (w body):
```json5
{
  x: 10.0,
  y: 3.0,
  // opcjonalnie
  angle: 0.0
}
```

Response JSON:
```json5
{
  // Base response shape jest zależna od robota; minimalnie:
  result: 0,
  task_id: 123,
  target_id: "LM42",
  path_nodes: ["AP7","AP8","LM42"]
}
```

#### 10.6.2 „STOP” (`robot_control_stop_req` = 2000)
Request:
```json5
{}
```

Response:
```json5
{ result: 0 }
```

#### 10.6.3 Status lokalizacji (`robot_status_loc_req` = 1004)
Request:
```json5
{}
```

Response:
```json5
{
  x: 1.2,
  y: 3.4,
  angle: 0.1,
  confidence: 100,
  current_station: "AP7",
  last_station: "AP6"
}
```

#### 10.6.4 Push config (`robot_push_config_req` = 9300)
Request:
```json5
{
  interval: 500,
  included_fields: ["x", "y", "task_status"]
}
```

---
