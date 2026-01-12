# proxy-recorder — Specyfikacja komponentu (v0.9)

## 1. Rola w systemie (MUST)
`proxy-recorder` jest krytycznym narzędziem developerskim do podsłuchu i rejestracji komunikacji TCP (RoboCore/Robokit) oraz HTTP (Roboshop/RDS).
To jest fundament reverse engineeringu protokołu oraz budowy „golden traces” do testów integracyjnych.

## 2. Zakres i odpowiedzialności (normatywnie)
#### Scope
Proxy/Recorder jest niezależnym narzędziem developerskim do podsłuchu ruchu TCP (RoboCore) i HTTP (Roboshop/RDS), z zapisem na dysk.

Proxy/Recorder MUST:
- być transparentnym proxy (nie modyfikuje payloadów),
- mieć konfigurowalne porty i upstreamy,
- zapisywać capture na dysk w formacie nadającym się do replay/regresji (np. JSONL + hex dump + timestamp),
- oznaczać capture metadanymi (robotId/addr/port/time).

Related: `10_adapters-robokit.md` (protokoły) + ten plik (proxy).

## 3. Wymagania praktyczne do pracy z AI/Codex (MUST)
Proxy MUST być „promptable”:
- da się go uruchomić jedną komendą z jasnym opisem sesji,
- zapisuje sesje poza repo (`~/robokit_logs/...`),
- domyślnie jest AI-friendly: zapisuje zdekodowane ramki + HTTP (body), a kopie raw TCP są opcjonalne (`limits.captureRawBytes`),
- ostrzega o rozmiarze, wspiera rotację i archiwizację.

Pełna specyfikacja: **Załącznik A**.

## 4. Odzyskane z istniejącego repo: robokit-proxy (legacy) (INFORMATIVE)
W aktualnym repo istnieje prototyp `apps/robokit-proxy` z prostą, czytelną specyfikacją layoutu logów.
W v0.8 traktujemy ją jako materiał referencyjny; nowy `proxy-recorder` MUST dostarczyć co najmniej równoważną informację
(plus: sesje, manifest, archiwizacja, decode frames).

**Legacy spec (verbatim):**
```text
# Robokit Proxy Logging Spec

## Goals

- Preserve full bidirectional TCP streams for later decoding.
- Keep a single ordered event log per connection.
- Allow optional split logs for quick filtering.

## Directory Layout

For each accepted connection:

```
logs/<mapping>/<connId>/
  meta.json
  traffic.jsonl
  c2s.bin
  s2c.bin
  c2s.jsonl    (optional)
  s2c.jsonl    (optional)
```

`connId` is a timestamp + counter to keep order stable.

## meta.json

```json
{
  "id": "1699999999999-1",
  "mapping": {
    "name": "core",
    "listenPort": 19208,
    "targetHost": "192.168.1.50",
    "targetPort": 19208
  },
  "options": {
    "logBinary": true,
    "logBase64": true,
    "logAscii": true,
    "logSha256": false,
    "splitLogs": false,
    "asciiPreviewLimit": 160
  },
  "startedAt": "2025-01-01T12:00:00.000Z",
  "client": { "address": "1.2.3.4", "port": 54321 },
  "server": { "address": "192.168.1.50", "port": 19208 }
}
```

## traffic.jsonl

One JSON object per line, ordered by capture time.

Common fields:

```json
{
  "seq": 1,
  "ts": "2025-01-01T12:00:00.100Z",
  "t_rel_ms": 100,
  "dir": "c2s",
  "len": 123,
  "offset": 0,
  "base64": "...",
  "ascii": "...",
  "sha256": "..."
}
```

Field notes:
- `seq`: monotonically increasing per connection.
- `t_rel_ms`: milliseconds since connection start.
- `dir`: `c2s`, `s2c`, or `info`.
- `len`: byte length of this chunk.
- `offset`: byte offset inside `c2s.bin` or `s2c.bin` (only when `logBinary=true`).
- `base64`: full payload (only when `logBase64=true`).
- `ascii`: preview (only when `logAscii=true`).
- `sha256`: hash of the payload (only when `logSha256=true`).

`info` entries use the same fields minus `len/offset` and include:

```json
{ "dir": "info", "message": "connection_open" }
```

## Binary Streams

- `c2s.bin` stores all bytes from client to server.
- `s2c.bin` stores all bytes from server to client.
- `offset` + `len` from `traffic.jsonl` map back to these files.

## Optional Split Logs

If `splitLogs=true`, `c2s.jsonl` and `s2c.jsonl` contain only entries
for that direction (same format as `traffic.jsonl`).

## Capture Semantics

- Logs are recorded on TCP chunk boundaries, not on protocol frame boundaries.
- Protocol-level message boundaries must be reconstructed in analysis.
```

---

## Załącznik A — Proxy/Recorder (verbatim z v0.7)
# Fleet Manager 2.0 — Proxy/Recorder (dev tool) (v0.7)

Proxy/Recorder to **narzędzie developerskie** do podsłuchu i zapisu komunikacji:
- Roboshop ↔ robot,
- Roboshop ↔ RDS (gotowy fleet manager),
- Fleet Gateway ↔ robot (debug),
- robot-controller ↔ robot / robokit-robot-sim (testy protokołu).

To jest element krytyczny dla reverse engineeringu RoboCore/Robokit oraz dla budowania **golden traces** do testów integracyjnych.

---

## 1. Cele i zasady (MUST)

### 1.1 Cele
Proxy/Recorder MUST umożliwiać:
- powtarzalne przechwytywanie pełnej komunikacji (TCP i HTTP) bez utraty bajtów,
- łatwe uruchomienie „na komendę” (promptable/AI-friendly),
- zapis sesji w formacie nadającym się do:
  - analizy człowieka (czytelne JSONL + metadane),
  - automatycznych testów (replay / golden),
  - archiwizacji incydentów (pakowanie z checksumami).

### 1.2 Zasady nadrzędne
- Proxy/Recorder MUST być **transparentnym** proxy: nie modyfikuje payloadów i nie zmienia kolejności bajtów.
- Proxy/Recorder MUST zapisywać **raw bytes w dwie strony** (client→server i server→client).
- Proxy/Recorder MUST działać niezależnie od Fleet Core/Gateway (osobny proces).
- Proxy/Recorder MUST działać na localhost i umożliwiać łatwe ustawienie upstreamów (robot/roboshop/rds).
- Proxy/Recorder MUST obsłużyć wiele listenerów i wiele połączeń równolegle.

### 1.3 Non-goals (MUST NOT)
- Proxy/Recorder MUST NOT próbować „naprawiać” ramek lub payloadów.
- Proxy/Recorder MUST NOT wprowadzać throttlingu w MVP (patrz §8).

---

## 2. Model uruchomieniowy: sesje (MUST)

### 2.1 Pojęcie sesji
„Sesja” to jedna, logicznie spójna rejestracja ruchu, np.:
- `gotarget_smoke_rb01`,
- `forkheight_pickdrop_test`,
- `roboshop_upload_map_warehouseA`,
- `avoidance_observed_2026-01-07`.

Proxy/Recorder MUST zapisywać każdą sesję w osobnym katalogu na dysku.

### 2.2 Domyślna lokalizacja logów (MUST)
Logi NIE mogą iść do repo (ryzyko rozmiaru). Domyślny katalog sesji MUST być poza repo:

- `~/robokit_logs/<YYYY-MM-DD_HH_MM>_<targetKind>_<sessionName>/`

Przykład:
- `~/robokit_logs/2026-01-07_14_22_robot_RB-01_gotarget_smoke/`

Jeśli `--session` nie jest podane, nazwa sesji jest generowana z `--description`
lub `session.name` z configu. Prefiks daty/czasu jest dodawany automatycznie,
jeśli nazwa go nie zawiera.

`targetKind` to jeden z:
- `robot`,
- `rds`,
- `charger`,
- `roboshop`,
- `mixed`.

Konfiguracja może to nadpisać, ale domyślnie MUST być poza repo.

---

## 3. Kontrakt CLI (MUST)

Proxy/Recorder MUST udostępniać CLI, które da się uruchomić bez czytania kodu źródłowego.

### 3.1 Komendy (MUST)
Proxy/Recorder MUST obsługiwać co najmniej:

- `proxy-recorder start ...` — start sesji i listenerów,
- `proxy-recorder stop --session <name|id>` — zatrzymanie sesji (graceful),
- `proxy-recorder list-sessions [--dir <rootDir>]` — lista sesji,
- `proxy-recorder status --session <name|id>` — status (aktywny/stopnięty, liczba conn, rozmiar),
- `proxy-recorder archive --session <name|id> [--delete-raw]` — spakuj sesję (patrz §9).
- `proxy-recorder replay --session <name|id> ...` — replay raw TCP (opcjonalne, wymaga `limits.captureRawBytes=true`).

### 3.2 Minimalne parametry uruchomienia (MUST)
`start` MUST przyjmować:
- `--session <sessionName>` (MAY; jeśli brak, nazwa jest generowana z `--description` lub configu),
- `--description <text>` (SHOULD; trafia do metadanych sesji i może tworzyć nazwę),
- `--root-dir <path>` (MAY; domyślnie `~/robokit_logs`),
- `--config <path.json5>` (MAY; jeżeli używany config, to CLI może nadpisywać),
- `--preset <name>` (MAY; patrz §7),
- `--suppress-lasers` (MAY; usuwa `lasers` z logowanego JSON),
- `--suppress-point-cloud` (MAY; usuwa `pointCloud` z logowanego JSON),
- `--raw-frame-apis <list>` (MAY; zapisuje `rawFrameBase64` tylko dla wybranych API),
- `--capture-comment <text>` (MAY; dopisuje notatkę do `session.meta.json5`),
- `--print-effective-config` (SHOULD; bardzo pomocne dla AI i debug).

### 3.3 Przykłady uruchomienia (MUST: w specyfikacji)
#### A) „Postaw proxy na localhost, robot jest pod tym adresem”
```bash
proxy-recorder start \
  --description "Smoke: goTarget + stop + forkHeight (roboshop-like)" \
  --preset robokit-all \
  --robot-id RB-01 \
  --upstream-host 10.0.0.11
```
Session name zostanie wygenerowana automatycznie jako `YYYY-MM-DD_HH_MM_robot_smoke-gotarget-stop-forkheight-roboshop-like`.

#### B) „Podsłuchuj Roboshop↔Robot + Roboshop↔RDS na HTTP”
```bash
proxy-recorder start \
  --session 2026-01-07_mixed_roboshop_upload_map \
  --description "Upload mapy + konfiguracja sceny w Roboshop" \
  --config ./configs/proxy.roboshop_upload.json5
```

#### C) „Zakończ i zarchiwizuj”
```bash
proxy-recorder stop --session 2026-01-07_robot_RB-01_gotarget_smoke
proxy-recorder archive --session 2026-01-07_robot_RB-01_gotarget_smoke --delete-raw
```

### 3.4 Kody wyjścia i logi (MUST)
- `0` = sukces
- `1` = błąd walidacji config/CLI
- `2` = błąd bindowania portu (port zajęty)
- `3` = błąd upstream (nieosiągalny) — jeśli `--fail-fast=true`
- `>=10` = nieoczekiwany crash

CLI MUST logować:
- ścieżkę katalogu sesji,
- listę listenerów z mapowaniem listen→upstream,
- rozmiary plików (okresowo),
- ostrzeżenia o przekroczeniu limitów (patrz §8).

---

## 4. Kontrakt konfiguracji (JSON5) (MUST)

### 4.1 Minimalny plik config (MUST)
```json5
{
  session: {
    name: "2026-01-07_robot_RB-01_gotarget_smoke",
    description: "Smoke: goTarget + forkHeight + stop",
    operator: "jan.kowalski", // MAY
    targetKind: "robot",      // robot | roboshop | rds | charger | mixed
    rootDir: "~/robokit_logs",
  },

  // globalne limity (bez throttlingu w MVP)
  limits: {
    warnSessionSizeGb: 5,      // MUST emit warning
    rotateFileMb: 512,         // SHOULD (żeby pliki były przenośne)
    noThrottling: true,        // MUST w MVP
    captureRawBytes: false,    // domyślnie OFF (kopie raw TCP)
    captureFrames: true,       // domyślnie ON (decode robocore)
    includeRawFrameBase64: false,   // globalnie zapisuj rawFrameBase64
    includeBinaryTailBase64: false, // zapisuj binary tail przy JSON + bin
    httpCaptureBodies: true,        // zachowaj HTTP body (mapy, sceny)
    hexPreviewBytes: 0,
    maxBodyLength: 1048576,
  },
  capture: {
    omitLasers: false,         // usuwa lasers z logowanego JSON
    omitPointCloud: false,     // usuwa pointCloud z logowanego JSON
    rawFrameBase64Apis: [],    // lista API z rawFrameBase64 (whitelist)
    comment: "optional note"
  },

  // listeners: każdy to jedno proxy listen→upstream
  listeners: [
    {
      name: "rb01_state",
      protocol: "tcp", // tcp | http
      listen: { host: "0.0.0.0", port: 19204 },
      upstream: { host: "10.0.0.11", port: 19204 },
      decode: { kind: "robocore" }, // robocore | none
    },
    {
      name: "rb01_ctrl",
      protocol: "tcp",
      listen: { host: "0.0.0.0", port: 19205 },
      upstream: { host: "10.0.0.11", port: 19205 },
      decode: { kind: "robocore" },
    },
    // ... task/other/push
  ],
}
```

### 4.2 Zasady (MUST)
- `listeners[].name` MUST być unikalne w sesji.
- `listen.port` MUST nie kolidować między listenerami.
- Dla `decode.kind="robocore"` proxy MUST próbować dekodować framing zgodnie z `10_adapters-robokit.md`,
  ale nawet przy decode error MUST zachować raw bytes, jeśli `limits.captureRawBytes=true`
  (a gdy raw bytes są wyłączone, zachować co najmniej `binaryTailBase64` dla ramek bez JSON).

### 4.3 Opcje capture (MUST)
- `capture.omitLasers` i `capture.omitPointCloud` działają wyłącznie na logowanym JSON (decoded frames),
  nie zmieniają bajtów przesyłanych do upstreamu.
- `capture.rawFrameBase64Apis` wymusza zapis `rawFrameBase64` tylko dla wybranych API (gdy globalny zapis jest wyłączony).
- `capture.comment` trafia do `session.meta.json5` jako notatka.

---

## 5. Layout katalogu na dysku (MUST)

### 5.1 Struktura sesji
```text
<sessionDir>/
  session.meta.json5                # MUST: metadane sesji (opis, kto, co, gdzie)
  listeners.json5                   # MUST: effective config listenerów (po merge CLI+config)
  config.effective.json5            # MUST: pełny effective config (session+limits+listeners)
  session.pid                       # PID procesu (usuwany po stop)
  manifest.json                     # MUST: lista plików + checksums (po archiwizacji; patrz §9)
  tcp/
    <listenerName>/
      connections.jsonl             # lista połączeń (conn open/close)
      conn_<connId>_raw_000001.jsonl # tylko gdy limits.captureRawBytes=true
      conn_<connId>_raw_000002.jsonl
      conn_<connId>_frames_000001.jsonl   # opcjonalnie, jeśli decode=robocore
      conn_<connId>.pcap                 # MAY (jeśli włączone)
  http/
    <listenerName>/
      requests_000001.jsonl         # request/response log (header + body) + raw bytes
      raw_000001.bin                # opcjonalne (pełne bajty w jednym pliku)
  archive/
    <sessionName>.zip               # wynik `archive` (SHOULD)
```

### 5.2 Metadane sesji (MUST)
`session.meta.json5` MUST zawierać co najmniej:
```json5
{
  sessionName: "2026-01-07_robot_RB-01_gotarget_smoke",
  description: "Smoke: goTarget + forkHeight + stop",
  startedTsMs: 1736210000000,
  endedTsMs: null, // wypełniane po stop
  operator: "jan.kowalski", // MAY
  targets: [
    { kind: "robot", robotId: "RB-01", addr: "10.0.0.11" },
  ],
  listeners: [
    { name: "rb01_task", protocol: "tcp", listen: "0.0.0.0:19206", upstream: "10.0.0.11:19206", decode: "robocore" },
  ],
  notes: [
    "W tej sesji wykonano: goTarget(LM2), forkHeight(1.20), stop",
  ],
  captureOptions: {
    omitLasers: false,
    omitPointCloud: false,
    captureComment: null,
    rawFrameBase64Apis: []
  }
}
```

To jest element celowo „AI-friendly”: można indeksować sesje po opisie, budować z nich golden tests.

---

## 6. Format capture (MUST)

### 6.1 Zdarzenia połączeń (MUST)
`tcp/<listener>/connections.jsonl` — jeden wpis na open/close, np.:
```json5
{ tsMs: 1736210000001, event: "connOpened", connId: "c01", local: "0.0.0.0:19206", peer: "10.0.0.50:53421", upstream: "10.0.0.11:19206" }
{ tsMs: 1736210012345, event: "connClosed", connId: "c01", reason: "eof" }
```

### 6.2 Raw stream (MUST)
`conn_<connId>_raw_*.jsonl` MUST zawierać **wszystkie bajty** w obie strony (jeśli `limits.captureRawBytes=true`).
Każdy wpis reprezentuje chunk (niekoniecznie pełną ramkę):

```json5
{
  tsMs: 1736210000123,
  connId: "c01",
  dir: "c2s",            // c2s | s2c
  nBytes: 128,
  bytesBase64: "AAECAwQF...", // MUST: raw bytes (base64)
  // pomocniczo:
  bytesHexPreview: "5a0100ff....", // SHOULD: max np. 64B
}
```

Zasady:
- Proxy MUST zachować kolejność wpisów per (connId, dir).
- Proxy MUST NOT scalać lub przerabiać bajtów.
- Proxy SHOULD rotować pliki po `limits.rotateFileMb`.

### 6.3 Decode RoboCore frames (SHOULD, ale bardzo przydatne)
Jeśli `decode.kind="robocore"`, proxy SHOULD generować równoległy plik:
`conn_<connId>_frames_*.jsonl`, gdzie każdy wpis to zdekodowana ramka (o ile możliwe):

```json5
{
  tsMs: 1736210000456,
  connId: "c01",
  dir: "c2s",
  decode: {
    kind: "robocore",
    confidence: "OBSERVED", // CONFIRMED | OBSERVED | HYPOTHESIS
  },
  header: {
    startMarkHex: "5a",
    version: 1,
    seq: 42,
    apiNo: 3051,
    bodyLength: 12,
    jsonSizeHeader: 12,
  },
  json: { id: "LM2" },      // jeśli parsowalne
  binaryTailBase64: null,   // jeśli występuje (patrz niżej)
  rawFrameBase64: "WgE...", // SHOULD: pełna ramka (łatwe do replay)
  parseError: null,
}
```

Jeżeli dekoder nie potrafi:
- wpis MUST zawierać `parseError`, a `json` = null,
- `rawFrameBase64` pojawia się tylko gdy jest włączone globalnie lub przez whitelistę API.

Zasady:
- `rawFrameBase64` pojawia się globalnie przy `limits.includeRawFrameBase64=true`
  lub selektywnie dla API z `capture.rawFrameBase64Apis`.
- `binaryTailBase64` jest zapisywany zawsze, gdy ramka nie ma poprawnego JSON,
  oraz opcjonalnie dla ramek z JSON+bin (`limits.includeBinaryTailBase64=true`).

### 6.4 HTTP capture (MUST)
Dla `protocol="http"` proxy MUST logować:
- request line + headers,
- response status + headers,
- body (raw bytes) w obie strony.

Przykład wpisu:
```json5
{
  tsMs: 1736211000123,
  connId: "h07",
  method: "POST",
  url: "http://roboshop.local/api/maps/upload",
  requestHeaders: { "content-type": "application/json" },
  requestBodyBase64: "eyJ..." ,
  responseStatus: 200,
  responseHeaders: { "content-type": "application/json" },
  responseBodyBase64: "eyJvayI6dHJ1ZX0=",
}
```
`requestBodyBase64` i `responseBodyBase64` są ustawiane tylko gdy `limits.httpCaptureBodies=true`.

---

## 7. Presety i „capture wszystkiego” (SHOULD)

Proxy/Recorder SHOULD dostarczyć presety, bo w praktyce chcesz jednym poleceniem przechwycić wszystkie porty RoboCore.

### 7.1 Preset `robokit-all` (SHOULD)
MUST uruchomić listenery RoboKit dla portów (domyślne, observed):
- 19200 ROBOD
- 19204 STATE
- 19205 CTRL
- 19206 TASK
- 19207 CONFIG
- 19208 KERNEL
- 19210 OTHER
- 19301 PUSH
- 5045 API legacy
- HTTP: 8088, 9301

Z możliwością nadpisania portów w config (nie każdy robot ma identyczne).

### 7.2 Preset `robokit-all-no-lasers` (SHOULD)
- Jak `robokit-all`, ale z `capture.omitLasers=true` i `capture.omitPointCloud=true`.
- Włącza `limits.includeBinaryTailBase64=true` dla zachowania binarek przy JSON.

### 7.3 Preset `simulator-proxy` (SHOULD)
- Mapuje standardowe porty RoboKit na porty symulatora (np. 19200 -> 29200),
  żeby łatwo nagrywać i porównywać ruch robota z symulatorem.

---

## 8. Duże logi: rotacja, ostrzeżenia, brak throttlingu (MUST)

- Proxy/Recorder MUST logować **bez throttlingu** w MVP.
- Proxy/Recorder MUST emitować ostrzeżenie, gdy rozmiar sesji przekroczy `limits.warnSessionSizeGb`.
- Proxy/Recorder SHOULD rotować pliki (np. co 512MB), żeby uniknąć:
  - problemów z kopiowaniem,
  - problemów z edytorami,
  - pojedynczych ogromnych plików.

Przykładowy warning:
- `WARNING: session size exceeded 5GB (current: 5.4GB). Consider archiving or enabling throttling (post-MVP).`

Throttling MAY pojawić się post-MVP, ale MUST być jawny i domyślnie wyłączony.

---

## 9. Archiwizacja i manifest (SHOULD, ale manifest MUST jeśli archiwizujemy)

### 9.1 Archiwizacja
`proxy-recorder archive --session ...` SHOULD:
- spakować katalog sesji do `archive/<sessionName>.zip` (lub tar.zst),
- wygenerować `manifest.json` z listą plików i checksumami,
- (opcjonalnie) przenieść surowe pliki do archiwum i usunąć je (`--delete-raw`).

### 9.2 Manifest (MUST, jeśli tworzymy archiwum)
```json
{
  "sessionName": "2026-01-07_robot_RB-01_gotarget_smoke",
  "createdTsMs": 1736210500000,
  "files": [
    { "path": "session.meta.json5", "sha256": "..." },
    { "path": "tcp/rb01_task/conn_c01_raw_000001.jsonl", "sha256": "..." }
  ]
}
```

---

## 10. Integracja z testami i replay (SHOULD)

- `fleet-gateway` SHOULD mieć testy integracyjne, które biorą jako wejście:
  - `conn_*_frames_*.jsonl` (jeśli dostępne) albo `raw` + dekoder w testach,
  - i sprawdzają, że parser/encoder jest zgodny z capture.
- `robot-controller` SHOULD umieć:
  - odtwarzać „goTarget / forkHeight / stop” na podstawie capture,
  - generować nową sesję proxy dla regresji.

Szczegóły: `16_obserwowalnosc_i_replay.md`, `17_strategia_testow.md`.

---

## 11. Failure modes (MUST)

- Jeśli upstream nieosiągalny:
  - w trybie `--fail-fast=true` proxy MUST zakończyć proces z kodem 3,
  - w przeciwnym razie proxy MAY działać i logować błędy połączeń.
- Jeśli decode RoboCore się nie uda:
  - proxy MUST nadal logować raw bytes,
  - MUST logować `parseError` w frames jsonl.
- Jeśli port zajęty:
  - proxy MUST zakończyć się kodem 2 i wypisać konflikt portu.
