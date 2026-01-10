# adapters-robokit — Specyfikacja komponentu (v0.9)

## 1. Rola w systemie (MUST)
`adapters-robokit` jest wspólną biblioteką (shared module) do:
- kodowania/parsowania ramek TCP RoboCore/Robokit,
- mapowania `apiNo` ↔ nazwy API,
- odpornego resync przy partial frames / błędach,
- współdzielenia implementacji pomiędzy:
  - `fleet-gateway` (produkcja),
  - `robot-controller` (dev/test),
  - (opcjonalnie) `proxy-recorder` (decode frames).

Biblioteka MUST być jedynym miejscem, gdzie „znamy framing” — reszta komponentów używa jej jako dependency.

## 2. Wymagania funkcjonalne (MUST)
- MUST implementować framing nagłówka 16B + JSON body (z wariantem `jsonSize` w reserved).
- MUST zapewniać:
  - `encodeFrame(seq, apiNo, payload, options)` (request),
  - `RbkParser.push(chunk) -> messages[]` (stream decode),
  - mapowanie `responseApi(apiNo) = apiNo + 10000`.
- MUST być odporne na:
  - partial frames (chunking),
  - desynchronizację (szukanie startMark 0x5A),
  - zbyt duże `bodyLength` (limit, ochrona OOM).



## 2.1 Public API (wejściowe) biblioteki (MUST)

To nie jest HTTP API — to jest kontrakt modułu, którego używają `fleet-gateway` i `robot-controller`.

### 2.1.1 Encoder (MUST)

```ts
encodeFrame(input: {
  seq: number,          // int32
  apiNo: number,        // int32
  payloadJson: object,  // zewnętrzny format Robokit (nie zmieniamy pól)
  binary?: Uint8Array,  // opcjonalnie (jeśli protokół niesie binarki)
}): Uint8Array
```

### 2.1.2 Streaming parser (MUST)

```ts
class RbkParser {
  constructor(opts?: {
    maxBodyLenBytes?: number,   // ochrona OOM
    resyncEnabled?: boolean,
  })

  push(chunk: Uint8Array): DecodedFrame[]  // 0..N ramek
}
```

`DecodedFrame`:
```ts
type DecodedFrame = {
  seq: number,
  apiNo: number,
  payloadJson?: any,       // null jeśli json parse fail
  payloadJsonError?: string|null,
  binary?: Uint8Array|null,
  rawHeaderHex: string,
}
```

### 2.1.3 Utilities (MUST)
- `responseApiNo(apiNo) = apiNo + 10000`
- `apiName(apiNo) -> string` (jeśli znany)
- `defaultPorts()` (robod/state/ctrl/task/config/kernel/other/push)

### 2.1.4 Error handling (MUST)
Parser MUST zwracać błędy jako struktury danych (nie tylko throw), np.:
- `FRAME_TOO_LARGE`
- `BAD_START_MARK`
- `JSON_PARSE_ERROR`
z możliwością logowania i kontynuacji (resync).


## 3. Model danych (wewnętrzny)
Rekomendowany kształt zdekodowanej ramki:
```json5
{
  seq: 123,
  apiNo: 3051,
  payload: { /* JSON */ },
  version: 1,
  reservedHex: "00 00 01 f4 00 00",
  jsonSize: 120,          // jeśli wykryte
  binarySize: 0,          // bodyLength - jsonSize
  jsonError: null,        // jeśli parse fail
}
```

## 4. Uwagi o semantyce Fleet Managera (MUST)
- Target na robota w MVP to **LocationMark** lub **ActionPoint**:
  - RoboCore `goTarget` (3051): `{"id":"<LM/AP>"}`
- Akcje wideł to **ActionPoint** z parametrami:
  - RoboCore `forkHeight` (6040): `{"height": <meters>}`
  - lub `goTarget` (3051) z `operation: "ForkHeight"` i `end_height`
  - `forkStop` (6041) bez payload.

## 5. Odzyskane z istniejącego repo: aktualny `packages/robokit-lib/rbk.js` (INFORMATIVE)
Poniższy fragment pokazuje bieżącą definicję framingu i listę API w istniejącym kodzie (dla zgodności implementacyjnej):

```js
const START_MARK = 0x5a;
const VERSION = 0x01;
const HEADER_LEN = 16;
const RESPONSE_OFFSET = 10000;

const PORTS = Object.freeze({
  ROBOD: 19200,
  STATE: 19204,
  CTRL: 19205,
  TASK: 19206,
  CONFIG: 19207,
  KERNEL: 19208,
  OTHER: 19210,
  PUSH: 19301
});

const API = Object.freeze({
  robot_status_info_req: 1000,
  robot_status_run_req: 1002,
  robot_status_mode_req: 1003,
  robot_status_loc_req: 1004,
  robot_status_speed_req: 1005,
  robot_status_block_req: 1006,
  robot_status_battery_req: 1007,
  robot_status_motor_req: 1040,
  robot_status_brake_req: 1008,
  robot_status_laser_req: 1009,
  robot_status_path_req: 1010,
  robot_status_area_req: 1011,
  robot_status_emergency_req: 1012,
  robot_status_io_res: 1013,
  robot_status_io_req: 1013,
  robot_status_imu_req: 1014,
  robot_status_ultrasonic_req: 1016,
  robot_status_polygon_req: 1018,
  robot_status_obstacle_req: 1019,
  robot_status_task_req: 1020,
  robot_status_reloc_req: 1021,
  robot_status_loadmap_req: 1022,
  robot_status_calibration_req: 1023,
  robot_status_tracking_req: 1024,
  robot_status_slam_req: 1025,
  robot_status_tasklist_req: 1026,
  robot_status_fork_req: 1028,
  robot_status_all1_req: 1100,
  robot_status_all2_req: 1101,
  robot_status_all3_req: 1102,
  robot_status_all4_req: 1103,
  robot_status_init_req: 1111,
  robot_status_map_req: 1300,
  robot_status_station_req: 1301,
  robot_status_params_req: 1400,
  robot_status_device_types_req: 1500,
  robot_status_file_req: 1800,
  robot_status_alarm_req: 1050,
  robot_status_alarm_res: 1050,
  robot_status_current_lock_req: 1060,
  robot_control_stop_req: 2000,
  robot_control_gyrocal_req: 2001,
  robot_control_reloc_req: 2002,
  robot_control_comfirmloc_req: 2003,
  robot_control_cancelreloc_req: 2004,
  robot_control_clearencoder_req: 2005,
  robot_control_motion_req: 2010,
  robot_control_loadmap_req: 2022,
  robot_task_pause_req: 3001,
  robot_task_resume_req: 3002,
  robot_task_cancel_req: 3003,
  robot_task_gopoint_req: 3050,
  robot_task_gotarget_req: 3051,
  robot_task_target_path_req: 3053,
  robot_task_translate_req: 3055,
  robot_task_turn_req: 3056,
  robot_task_gostart_req: 3057,
  robot_task_goend_req: 3058,
  robot_task_gowait_req: 3059,
  robot_task_charge_req: 3060,
  robot_task_test_req: 3061,
  robot_task_goshelf_req: 3063,
  robot_task_multistation_req: 3066,
  robot_task_clear_multistation_req: 3067,
  robot_task_clear_task_req: 3068,
  robot_task_uwb_follow_req: 3070,
  robot_task_calibwheel_req: 3080,
  robot_task_caliblaser_req: 3081,
  robot_task_calibminspeed_req: 3082,
  robot_task_calibcancel_req: 3089,
  robot_task_calibclear_req: 3090,
  robot_tasklist_req: 3100,
  robot_tasklist_status_req: 3101,
  robot_tasklist_pause_req: 3102,
  robot_tasklist_resume_req: 3103,
  robot_tasklist_cancel_req: 3104,
  robot_tasklist_next_req: 3105,
  robot_tasklist_name_req: 3106,
  robot_tasklist_result_req: 3110,
  robot_tasklist_result_list_req: 3111,
  robot_tasklist_upload_req: 3112,
  robot_tasklist_download_req: 3113,
  robot_tasklist_delete_req: 3114,
  robot_tasklist_list_req: 3115,
  robot_config_req_4005: 4005,
  robot_config_req_4006: 4006,
  robot_config_req_4009: 4009,
  robot_config_req_4010: 4010,
  robot_config_req_4011: 4011,
  robot_config_push_req: 4091,
  robot_daemon_ls_req: 5100,
  robot_daemon_scp_req: 5101,
  robot_daemon_rm_req: 5102,
  robot_other_audio_play_req: 6000,
  robot_other_setdo_req: 6001,
  robot_other_setdobatch_req: 6002,
  robot_other_softemc_req: 6004,
  robot_other_audiopause_req: 6010,
  robot_other_audiocont_req: 6011,
  robot_other_setdi_req: 6020,
  robot_other_audiolist_req: 6033,
  robot_other_forkheight_req: 6040,
  robot_other_forkstop_req: 6041,
  robot_push_config_req: 9300,
  robot_push: 19301
});

function responseApi(apiNo) {
  return apiNo + RESPONSE_OFFSET;
}

function encodeFrame(seq, apiNo, payload, options = {}) {
  const body = payload ? Buffer.from(JSON.stringify(payload), 'utf8') : Buffer.alloc(0);
  const buffer = Buffer.alloc(HEADER_LEN + body.length);
  const reserved = Buffer.alloc(6, 0);
  const reservedOverride = options.reserved;

  if (reservedOverride) {
    const source = Buffer.isBuffer(reservedOverride)
      ? reservedOverride
      : Buffer.from(reservedOverride);
    source.copy(reserved, 0, 0, Math.min(source.length, reserved.length));
  } else {
    let jsonSize = Number.isFinite(options.jsonSize) ? options.jsonSize : body.length;
    jsonSize = Math.max(0, Math.min(0xffff, jsonSize));
    if (jsonSize > 0) {
      reserved[2] = (jsonSize >> 8) & 0xff;
      reserved[3] = jsonSize & 0xff;
    }
  }
  buffer.writeUInt8(START_MARK, 0);
  buffer.writeUInt8(VERSION, 1);
  buffer.writeUInt16BE(seq & 0xffff, 2);
  buffer.writeUInt32BE(body.length, 4);
  buffer.writeUInt16BE(apiNo & 0xffff, 8);
  reserved.copy(buffer, 10);
  if (body.length > 0) {
    body.copy(buffer, HEADER_LEN);
  }
  return buffer;
}

class RbkParser {
  constructor(options = {}) {
    this.buffer = Buffer.alloc(0);
    this.maxBodyLength = options.maxBodyLength || 1024 * 1024;
  }

  push(chunk) {
    const messages = [];
    if (!chunk || chunk.length === 0) {
      return messages;
    }
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length >= HEADER_LEN) {
      if (this.buffer[0] !== START_MARK) {
        const nextSync = this.buffer.indexOf(START_MARK);
        if (nextSync === -1) {
          this.buffer = Buffer.alloc(0);
          return messages;
        }
        this.buffer = this.buffer.slice(nextSync);
        if (this.buffer.length < HEADER_LEN) {
          return messages;
        }
      }

      const version = this.buffer[1];
```

---

## Załącznik A — Protokół RoboCore/Robokit (v0.7, kanoniczny opis)
# Fleet Manager 2.0 — Protokół RoboCore/Robokit (TCP framing) (v0.7)

Źródło prawdy w tej specyfikacji:
- reverse engineered + potwierdzone w kodzie `packages/robokit-lib/rbk.js`
- robokit-robot-sim (`apps/robokit-robot-sim`) jako środowisko testowe
- docs `docs/rds/docs/ROBOKIT_API.md` (częściowo)

**Uwaga:** to jest protokół zewnętrzny. Fleet Manager **MUST NOT** go „ulepszać”.
Własne kontrakty (camelCase) obowiązują tylko na granicy Core↔Gateway.


## 0. Poziomy pewności (CONFIDENCE TAGS)

Ponieważ RoboCore/Robokit jest protokołem zewnętrznym i część rzeczy jest reverse engineered, w tym dokumencie
jawnie oznaczamy pewność informacji:

- **CONFIRMED** — potwierdzone na realnym robocie albo w oficjalnej dokumentacji (jeśli dostępna).
- **OBSERVED** — zaobserwowane w robokit-robot-sim i/lub w capture z proxy (ale może zależeć od wersji).
- **HYPOTHESIS** — hipoteza robocza (implementacja MUSI być ostrożna i logować różnice).

W praktyce: parser MUST być odporny na warianty, a każde odchylenie SHOULD generować capture/warning.


## 1. Porty (OBSERVED)
(z kodu / symulatora; realny robot może mieć to samo)

- `ROBOD`: 19200 (info/run)
- `STATE`: 19204 (status: 1000+, 1100)
- `CTRL`:  19205 (control: 2000+)
- `TASK`:  19206 (tasks: 3000+)
- `CONFIG`: 19207 (lock/config: 4000+)
- `KERNEL`: 19208 (kernel/info)
- `OTHER`: 19210 (other: 6000+)
- `PUSH`:  19301 (push stream: 9300 config, 19301 data)

## 2. Framing (MUST, CONFIRMED/OBSERVED)

### 2.1 Nagłówek (16 bajtów)
- 0: `startMark` = **0x5A** (1 byte)
- 1: `version` = **0x01** (1 byte)
- 2-3: `seq` (uint16 big-endian)
- 4-7: `bodyLength` (uint32 big-endian)
- 8-9: `apiNo` (uint16 big-endian)
- 10-15: `reserved` (6 bytes)

Payload:
- `bodyLength` bajtów UTF-8 JSON (czasem z binarnym ogonem; wtedy JSON length jest w reserved[2..3])

### 2.2 `reserved` i `jsonSize`
W praktyce część narzędzi ustawia w `reserved[2..3]` długość JSON (uint16 big-endian).
Parser Gateway MUST:
- jeśli `jsonSizeHeader > 0 && jsonSizeHeader <= bodyLength`, traktować pierwsze `jsonSizeHeader` bajtów jako JSON,
  a resztę jako binary (MAY ignorować jeśli nie używane),
- w innym wypadku próbować parsować cały body jako JSON.

### 2.3 Korelacja request/response
- Response ma `seq` taki sam jak request.
- Response `apiNo = requestApiNo + 10000`.
- Gateway MUST mapować to na `ack` dla Core.

## 3. Minimalny zestaw API (MVP) + mapowanie na Fleet Manager

### 3.1 Status (STATE port)
- `1004 robot_status_loc_req` — pozycja (x,y,angle) + current station + target + task status (w symulatorze)
- `1006 robot_status_block_req` — blokady
- `1020 robot_status_task_req` — stan nawigacji
- `1028 robot_status_fork_req` — stan wideł (jeśli dostępne)
- `1060 robot_status_current_lock_req` — seize control / current_lock
- `1100 robot_status_all1_req` — paczka zbiorcza (opcjonalnie)

Gateway SHOULD używać push (PUSH port) jeśli dostępne; polling jako fallback.

### 3.2 Control (CTRL port)
- `2000 robot_control_stop_req` — awaryjny stop (bez payload)
- `2002 robot_control_reloc_req` — relokacja (payload zależny od robota)

### 3.3 Task (TASK port)
- `3001 robot_task_pause_req` — pause
- `3002 robot_task_resume_req` — resume
- `3003 robot_task_cancel_req` — cancel
- `3050 robot_task_gopoint_req` — go to point (x,y,angle) — MAY używane w sim/debug
- `3051 robot_task_gotarget_req` — go to target station (id = LM/AP) — **główna komenda rolling target**
- `3053 robot_task_target_path_req` — pobierz planowaną ścieżkę do targetu (opcjonalne)
- `3066 robot_task_multistation_req` — lista targetów (opcjonalne, future)
- `3068 robot_task_clear_task_req` — clear task (opcjonalne)

### 3.4 Config (CONFIG port)
- `4005 robot_config_req_4005` — seize control / lock (payload z `nick_name`)
- `4006 robot_config_req_4006` — release / unlock (payload pusty)

### 3.5 Other (OTHER port)
- `6040 robot_other_forkheight_req` — ustaw wysokość wideł `{height: <number>}`
- `6041 robot_other_forkstop_req` — zatrzymaj widły (bez payload)

### 3.6 Push (PUSH port)
- `9300 robot_push_config_req` — konfiguracja push (interval + include/exclude fields)
- `19301 robot_push` — push payload (status fields)

## 4. Ramki protokołu (payload) — kluczowe przypadki

### 4.1 goTarget (rolling target) — API 3051 (TASK port)
**To jest realizacja wymagania:** target jest LM/AP, nie (x,y).

Payload (observed w robokit-robot-sim i wrapperze):
```json
{ "id": "LM2" }
```

- `id` to identyfikator stacji w mapie robota (LocationMark/ActionPoint).
- Gateway MUST zapewnić, że `id` odpowiada nodeId w `SceneGraph` i że scena/mapa jest spójna z mapą robota (operacyjnie).

Wariant (OBSERVED): jeśli `payload.operation` jest ustawione (`ForkHeight`, `ForkLoad`, `ForkUnload`),
to `3051` jest używane do operacji wideł, np.:
```json
{ "operation": "ForkHeight", "end_height": 1.20, "id": "LM2" }
```

**Mapping (Core→Gateway→Robot):**
- Core `CommandRecord.type = "goTarget"`
- Core SHOULD wypełniać `payload.targetExternalId` (z `Node.externalRefs`).
- Gateway wysyła `robot_task_gotarget_req` z `{id}` gdzie:
  - `id = payload.targetExternalId` jeśli podane,
  - w przeciwnym wypadku `id = payload.targetRef.nodeId`.

### 4.2 goPoint — API 3050 (TASK port)
Payload:
```json
{ "x": 10.0, "y": 3.0, "angle": 0.0 }
```
(angle opcjonalne)

### 4.3 forkHeight — API 6040 (OTHER port) lub 3051 (TASK port)
Payload (6040, robokit-robot-sim):
```json
{ "height": 1.20 }
```

Wariant (3051, OBSERVED):
```json
{ "operation": "ForkHeight", "end_height": 1.20, "id": "LM2" }
```

**Jak mapujemy ActionPoint z parametrami „from→to” na RoboCore:**
- Core przy kroku `forkHeight`:
  1) Odczytuje bieżącą wysokość z `robot_status_fork_req` albo z push `fork.fork_height`.
  2) Jeśli `fromHeightM` jest podane: waliduje |current-from| <= tolerance (MAY; w MVP SHOULD logować warning, ale nie blokować).
  3) Wysyła `forkHeight(height=toHeightM)` (6040) lub wariant `3051` z `operation: "ForkHeight"` i `end_height`.
  4) Czeka aż status wideł potwierdzi osiągnięcie (w tolerancji) albo timeout.

### 4.4 forkStop — API 6041 (OTHER port)
Bez payload.

### 4.5 stop — API 2000 (CTRL port)
Bez payload.

### 4.6 push config — API 9300 (PUSH port)
Payload (z robokit-robot-sim):
```json
{ "interval": 500, "include": ["x","y","angle","task_status","fork"] }
```
- `interval` w ms (min ograniczony przez robota/sim)
- `include` lub `exclude` (nie oba naraz)

## 5. Parser i odporność na błędy (MUST)
Gateway MUST:
- obsługiwać partial frames (dane przychodzą w kawałkach),
- resynchronizować się po błędnym `startMark` (szukać 0x5A),
- limitować `bodyLength` (ochrona przed OOM),
- wykrywać warianty `jsonSize` i logować błąd w capture,
- w razie parse error: zamknąć socket i wykonać reconnect z backoff.

## 6. Plan reverse engineering (SHOULD, ale bardzo zalecane)
- Proxy/Recorder zbiera raw frame hexdumps + decode (apiNo, seq, bodyLength, jsonSize).
- Golden traces: paczki z realnej komunikacji używane w testach integracyjnych Gateway.
- Minimalny zestaw testów:
  - decode/encode nagłówka,
  - goTarget + status,
  - forkHeight + status,
  - push config + push stream.

Szczegóły narzędzi: `06_proxy-recorder.md`, `99_pozostale.md (sekcja: obserwowalność i replay)`.


## 7. Reverse engineering backlog (MUST przed „robot MVP”)

### 7.1 Obstacle avoidance / blokady / „robot chce omijać” (MUST)
W tej chwili mamy:
- API `1006 robot_status_block_req` (OBSERVED) — ale bez gwarancji pól i semantyki.
- reason codes w FM (`ROBOT_BLOCKED`, `ROBOT_WANTS_AVOIDANCE`) są domenowe i muszą być mapowane z prawdziwych danych.

MUST zebrać capture (proxy-recorder) dla przypadków:
- robot zablokowany przeszkodą na wąskim przejeździe,
- robot zablokowany innym robotem,
- robot wchodzi w tryb omijania (jeśli istnieje),
- robot prosi o interwencję operatora.

Wynik:
- uzupełnić ten dokument o:
  - dokładny payload statusu blokady,
  - listę pól oznaczających „avoidance requested/active”,
  - mapowanie na ReasonCode.

### 7.2 Sensory / lasery (FUTURE, ale dane zbieramy już teraz)
Długoterminowo chcemy ćwiczyć własny algorytm omijania przeszkód, więc warto zebrać dane sensorów.

SHOULD zebrać oddzielną sesję proxy:
- z ruchem danych z laserów (jeśli idzie po RoboCore/Robokit),
- z korelacją do pozycji robota (`1004`) i eventów task/command.

Na razie nie specyfikujemy pól (to zewnętrzne), ale MUST:
- logować raw bytes (zawsze),
- utrzymać sesje w katalogu z metadanymi i checksumami.

### 7.3 ACK vs DONE (MUST)
MUST potwierdzić na realnych capture:
- czy odpowiedź `apiNo+10000` zawsze przychodzi dla 3051/6040/2000,
- czy są komendy bez odpowiedzi,
- jakie pola w statusie oznaczają „arrived” i „fork reached”.

Wynik: doprecyzować pola i czasy w `05_*` i `07_*` (bez zmiany zewnętrznego protokołu).
