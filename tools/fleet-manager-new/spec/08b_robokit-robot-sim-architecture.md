# robokit-robot-sim — Architektura i refactoring (v1.0)

## 1. Cel dokumentu
Ten dokument opisuje docelowa architekture `robokit-robot-sim`, z naciskiem na:
- rozdzielenie warstw (protocol -> core -> view),
- obsluge wielu klientow jednoczesnie (np. 2x Roboshop),
- semantyke `seize control` z natychmiastowym przejeciem kontroli przez nowego klienta,
- plan refactoringu bez zrywania kompatybilnosci protokolowej.

## 1.1 Slownik pojec (MUST)
- **Robokit**: protokol TCP robota (RoboCore/Robokit).
- **Roboshop**: UI kliencka laczaca sie po TCP/HTTP do robota/RDS.
- **RDS**: serwis HTTP robota (nie protokol robota).
- **Core**: czysta logika symulatora (stan + tick).
- **Adapter**: warstwa transportu/protokolu (TCP/HTTP/replay).
- **Profile-pack**: plik danych definiujacy identyfikacje robota (VERSION_LIST, params, deviceTypes).
- **Replay**: odtwarzanie logow i porownanie odpowiedzi.

## 2. Problemy w obecnej implementacji (skrot)
- Jedna, globalna instancja stanu robota, bez kontroli dostepu dla roznych klientow.
- `lock` istnieje w payloadach, ale nie jest egzekwowany (kazdy moze sterowac).
- Push config jest globalny (zmiana z jednego klienta wplywa na wszystkie polaczenia).
- Logika protokolu, stanu i widokow jest wymieszana w jednym pliku.
- Brak wyraznego modelu sesji klienta (Roboshop laczy sie wieloma socketami).

## 2.1 Non-goals (MUST)
- Multi-robot w jednym procesie (nie wspierane).
- Pelna emulacja HW (lasery, sterowniki) poza payloadami protokolu.
- Symulacja fizyki 3D (tylko ruch 2D po mapie).

## 3. Wymagania funkcjonalne (MUST)
### 3.1 Wielu klientow
- Symulator MUST akceptowac wiele jednoczesnych polaczen TCP na kazdym porcie.
- Polaczenia z tego samego klienta (np. Roboshop) musza byc traktowane jako jedna sesja logiczna.
- Statusy i push sa dostepne dla wszystkich klientow.

### 3.2 Seize control
- W danej chwili tylko jeden klient moze miec kontrole nad ruchem/manual.
- `robot_config_req_4005` (lock) zawsze przejmuje kontrole, nawet gdy inny klient ma lock.
- `robot_config_req_4006` (unlock) zwalnia kontrolne, ale tylko dla aktualnego ownera.
- Przejecie przez klienta B od klienta A natychmiast:
  - zeruje manual control poprzedniego ownera,
  - ustawia nowy `current_lock`,
  - wpisuje event do logow (opcjonalnie).

### 3.3 Zgodnosc protokolu
- API i payloady musza pozostac zgodne z realnym robotem.
- Odpowiedzi nadal: `apiNo + 10000` i zachowanie `reserved`.

### 3.4 Zakres multi-robot (MUST)
- Jedna instancja symulatora obsluguje **jednego** robota.
- Multi-robot to wiele procesow/instancji na roznych portach i/lub z roznym `ROBOT_ID`.
- Brak planow na obsluge wielu robotow w jednym procesie (na razie).

## 4. Docelowa architektura (protocol -> core -> view)

```
┌──────────────────────────────────────────────────────────────┐
│                         Transport                            │
│  TcpPortServer  ───>  ConnectionContext  ───>  ClientRegistry │
└───────────────┬──────────────────────────────────────────────┘
                │
                v
┌──────────────────────────────────────────────────────────────┐
│                          Protocol                            │
│  RbkCodec (decode/encode) + ApiRouter + ControlPolicy         │
└───────────────┬──────────────────────────────────────────────┘
                │
                v
┌──────────────────────────────────────────────────────────────┐
│                             Core                             │
│  RobotState + SimulationEngine + Task/Fork/Navigation         │
└───────────────┬──────────────────────────────────────────────┘
                │
                v
┌──────────────────────────────────────────────────────────────┐
│                              View                            │
│  StatusBuilder + PushBuilder + FileResponseBuilder            │
└──────────────────────────────────────────────────────────────┘
```

### 4.0 Zasada AI-friendly (MUST)
Symulator ma byc "AI-friendly": logika powinna byc podzielona na male, czyste moduly z jasnymi kontraktami.
Cel: minimalne efekty uboczne, przewidywalnosc i latwe testowanie.

### 4.0.1 Docelowa struktura repo (SHOULD)
```
apps/
  robokit-robot-sim/          # adapter TCP + sim configs + schema
  robokit-http-stub/          # adapter HTTP (RDS, osobny kanal)
packages/
  robokit-sim-core/           # czysty core
  robokit-protocol/           # rbk codec + router + policy
tests/
  replay/                     # harness CLI
  fixtures/                   # golden logs
schemas/
  robokit/                    # JSON schema payloadow
```

### 4.0.2 Mapa plikow runtime (kompaktowa, <=30 plikow) (MUST)
**packages/robokit-sim-core/**
- `core/state.js` — model stanu robota + defaulty + walidacja.
- `core/engine.js` — `step(state, input, dt)` i integracja ruchu.
- `core/task.js` — taski (goTarget, multistation, pause/resume).
- `core/navigation.js` — graf, pathfinding, segmenty.
- `core/fork.js` — sterowanie widlami i statusy.
- `core/obstacles.js` — block/avoid i wykrywanie przeszkod.
- `core/charge.js` — bateria/charging/odo.
- `core/clock_rng.js` — deterministyczny zegar + RNG.
- `core/events.js` — eventy/diag + explainability hooks.

**packages/robokit-protocol/**
- `protocol/codec.js` — framing decode/encode.
- `protocol/router.js` — apiNo -> handler.
- `protocol/policy.js` — gating/lock policy.
- `protocol/command_cache.js` — idempotencja.
- `protocol/api_map.js` — mapa API + dozwolone porty.
- `protocol/errors.js` — kody bledow i helpery.

**apps/robokit-robot-sim/**
- `config_loader.js` — load + merge + precedence.
- `configs/schema.json` — walidacja configu symulatora.
- `configs/default.json5` — default identity.
- `configs/*.json` — config packi symulatora.
- `app/server.js` — bootstrap + wiring modulu.
- `app/runtime_servers.js` — TCP/HTTP/push serwery + tick loop.
- `app/runtime_helpers.js` — helpery nawigacji, pose, diagnostyka.
- `app/runtime_handlers.js` — handler-y TCP/HTTP + mutacje stanu.
- `app/adapter_tcp.js` — TCP adapter (robokit).
- `app/adapter_http.js` — HTTP stub (RDS, oddzielny kanal).
- `app/views.js` — status builder (odpowiedzi robota).
- `app/views_files.js` — file/device/map odpowiedzi.
- `app/views_push.js` — push payload builder.
- `app/client_registry.js` — sesje klientow.
- `app/control_arbiter.js` — lock + preempcja.
- `app/push_manager.js` — per-connection push + limity.
- `app/map_context.js` — mapy + file roots.
- `app/robot_defaults.js` — statyczne payloady (features/version/hardware).
- `app/config.js` — env + walidacja.

### 4.0.3 Rozklad rozmiaru plikow (MUST)
Celem jest zrownowazony rozklad kodu:
- runtime file nie powinien przekraczac ~800 linii,
- runtime file nie powinien byc >2x mediany rozmiaru pliku runtime,
- wyjatki: pliki danych (config/schema) oraz generowane listy.

Refactoring NIE jest zakonczony, dopoki istnieja pliki wyraznie wieksze od innych
wg powyzszych progow.

### 4.1 Transport
**Odpowiedzialnosci:**
- utrzymanie socketow i parserow per polaczenie,
- mapowanie socketow na `ClientSession`,
- dostarczanie kontekstu do wyzszych warstw.

**Moduly:**
- `transport/TcpPortServer.ts`
  - `listen(port, label, allowedApis)`
  - tworzy `ConnectionContext` dla kazdego socketa
- `transport/ConnectionContext.ts`
  - `socket`, `remoteAddress`, `remotePort`, `localPort`, `label`
  - `clientId` (wyznaczony przez ClientRegistry)
- `transport/ClientRegistry.ts`
  - grupuje polaczenia w `ClientSession` (patrz 6.1)
  - utrzymuje licznik aktywnych socketow dla sesji

### 4.2 Protocol
**Odpowiedzialnosci:**
- dekodowanie/enkodowanie ramek,
- routing API -> handler,
- egzekwowanie polityki kontroli.

**Moduly:**
- `protocol/RbkCodec.ts`
  - `decode(chunk) -> DecodedFrame[]`
  - `encode(frame) -> Buffer`
- `protocol/ApiRouter.ts`
  - `handle(frame, context) -> ResponsePayload`
  - mapowanie `apiNo` -> handler (core + view)
- `protocol/ControlPolicy.ts`
  - klasyfikacja komend: `read`, `control`, `fork`, `nav`, `config`
  - gate: wymaga locka dla wybranych klas

### 4.2.2 Adaptery (MUST)
Transport nie powinien zawierac logiki domenowej. Zamiast tego uzywamy adapterow:
- `adapters/robokit-tcp` (robokit TCP)
- `adapters/roboshop-http` (HTTP stub, oddzielny kanal)
- `adapters/replay` (odtwarzanie logow, bez socketow)

### 4.2.1 Bledy protokolu i resync (MUST)
- Jesli parser wykryje niepoprawny `startMark` lub zbyt duzy `bodyLength`, socket jest zamykany.
- Jesli `apiNo` jest nieznane:
  - zwracamy `ret_code=1`, `err_msg="unsupported_api_<apiNo>"`,
  - ale nie zamykamy polaczenia.
- Jesli `apiNo` jest na zlym porcie: `ret_code=60000`, `err_msg="wrong_port"`.
- `parseError` w payload nie powinien crashowac serwera, tylko generowac response error.

### 4.3 Core
**Odpowiedzialnosci:**
- jedyny stan symulatora,
- logika ruchu, taskow, forkow, przeszkod,
- deterministyczny tick.

**Moduly:**
- `core/RobotState.ts`
  - struktura stanu robota (pose, task, fork, alarms, lock, manual)
- `core/SimulationEngine.ts`
  - tick loop, dt, integracja ruchu
- `core/Navigation.ts`
  - graf, pathfinding, avoidance
- `core/TaskEngine.ts`
  - goTarget, multistation, pause/resume
- `core/ForkController.ts`
  - forkHeight, forkStop, fork task status
- `core/ControlArbiter.ts`
  - stan locka i polityka przejecia kontroli

### 4.3.1 Pure core (MUST)
Core powinien byc maksymalnie czysty i deterministyczny:
- `step(state, inputs, dt) -> { state, outputs }`
- bez socketow, bez IO, bez globalnych singletonow
- wszystkie zaleznosci wstrzykiwane (zegary, RNG, mapy)

### 4.3.2 Explainability hooks (SHOULD)
Core powinien umiec zwrocic "dlaczego":
- `explain()` zwraca powody stopu / blokady / wyboru trasy
- eventy diagnostyczne jako JSONL (AI-friendly)

### 4.4 View
**Odpowiedzialnosci:**
- budowanie odpowiedzi i payloadow statusowych,
- push payload per-connection.

**Moduly:**
- `views/StatusBuilder.ts`
  - buildLoc, buildAll, buildTask, buildFork, buildCurrentLock
- `views/PushBuilder.ts`
  - buildPushPayload(state, filters)
- `views/FileResponseBuilder.ts`
  - file list, map files, device types

### 4.4.1 Config packs (MUST)
Identycznosc robota nie powinna byc kodowana w kodzie.
Wprowadzamy config packi (JSON/JSON5) jako data-driven zrodlo:
- VERSION_LIST
- robot_params (API 11400)
- deviceTypes i file lists
- map list / md5 / metadata
- domyslne feature flags

Sciezka configu:
- `SIM_CONFIG_PATH=/abs/path/to/config.json`
- lub `SIM_CONFIG=robokit-amb-01` (szukaj w `configs/`)

Precedencja:
1) explicit env vars
2) config pack
3) defaulty w kodzie

### 4.4.3 Config jako single source of truth (MUST)
Wszystkie dane "identity" robota powinny byc w configu, a nie w kodzie:
- VERSION_LIST, robot_params, deviceTypes, map list
- defaultowe feature flags

Kod moze tylko:
- walidowac configi,
- nadpisac wybrane pola przez env (np. dla testow).

### 4.4.2 Przykladowy config-pack (INFORMATIVE)
```json5
{
  "id": "robokit-amb-01",
  "version_list": { "MCLoc": "1.0.0-git:3.4.8-...", "TaskManager": "1.0.0-git:..." },
  "robot_params": { "MCLoc": { "FTScoreThd": { "value": 0.7, "defaultValue": 0.7, "type": "double" } } },
  "device_types": { "deviceTypes": [] },
  "maps": [{ "name": "sanden_smalll", "md5": "4a57..." }]
}
```

### 4.5 Kontrakty interfejsow modulow (MUST)
Minimalne interfejsy (TypeScript-like):
```ts
interface ClientRegistry {
  getClientId(ctx: ConnectionContext): string;
  attach(ctx: ConnectionContext): ClientSession;
  detach(ctx: ConnectionContext): void;
  migrateByNick(ip: string, nick: string): ClientSession;
}

interface ControlArbiter {
  getOwner(): string | null;
  acquire(clientId: string, meta: LockMeta): void;   // preempt
  release(clientId: string): boolean;                // false if not owner
  canControl(clientId: string): boolean;
}

interface ApiRouter {
  handle(frame: DecodedFrame, ctx: ConnectionContext): ResponsePayload;
}

interface SimulationEngine {
  tick(nowMs: number): void;
  getState(): RobotState;
}
```

### 4.5.1 Kontrakty modulow (MUST)
Każdy modul powinien miec:
- wejscia/wyjscia (sygnatura),
- efekty uboczne (np. zapis do event log),
- minimalny test jednostkowy.

### 4.5.2 Kontrakty payloadow (SHOULD)
Wprowadz JSON Schema dla kluczowych payloadow:
- `status_loc`, `status_all`, `current_lock`
- `robot_params` (API 11400)
- `device_types`, `file_list`
To ujednolici replay i diff.

### 4.6 Reuse w Fleet Managerze (MUST)
Fleet Manager powinien moc uzyc core bez TCP:
- `createSimulator({ simConfig, mapProvider, configProvider, clock, rng })`
- `sim.step(inputs, dt)` lub `sim.tick(nowMs)`
- `sim.getSnapshot()` jako stabilny kontrakt

To pozwala uruchamiac symulator:
- jako proces (TCP)
- jako biblioteke (in-process)
- w testach E2E bez portow

### 4.6.1 Kontrakt API core (MUST)
Minimalny kontrakt core, aby FM mogl go reuse bez protokolu:
```ts
type SimInput = {
  commands: Command[];
  nowMs: number;
  dtMs: number;
};

type SimOutput = {
  responses: Response[];
  events: Event[];
  snapshot: RobotSnapshot;
};

function step(state: RobotState, input: SimInput): { state: RobotState; output: SimOutput };
```

Zasady:
- `snapshot` musi byc stabilny i gotowy do serializacji (bez cyclic refs).
- `responses` musza zawierac `apiNo` i payload (adapter mapuje do TCP).


## 5. Model danych (kontrakt wewnetrzny)
### 5.1 RobotState
```ts
type RobotState = {
  pose: { x: number, y: number, angle: number };
  velocity: { vx: number, vy: number, w: number, steer: number };
  task: TaskState | null;
  fork: ForkState;
  lock: LockState;
  alarms: AlarmState;
  manual: ManualControl;
  blocked: BlockState;
  paused: boolean;
  updatedAt: number;
};
```

### 5.2 LockState
```ts
type LockState = {
  ownerClientId: string | null;
  nickName: string;
  ip: string;
  port: number;
  locked: boolean;
  lockedAt: number;
  type: number;
  desc: string;
};
```

### 5.3 ClientSession
```ts
type ClientSession = {
  id: string;              // np. ip lub ip+nick
  ip: string;
  nickName: string | null; // ustalane po lock
  connections: Set<ConnectionContext>;
  lastSeenAt: number;
};
```

## 5.4 current_lock — kontrakt payloadu (MUST)
`current_lock` pojawia sie w `robot_status_current_lock_req` i w `status_all`.
Minimalny kontrakt:
```json5
{
  "locked": true,
  "nick_name": "roboshop",
  "ip": "127.0.0.1",
  "port": 54012,
  "time_t": 1736350031,
  "type": 0,
  "desc": ""
}
```
Zasady:
- gdy brak locka: `locked=false`, reszta pol pusta lub zero,
- `time_t` to unix time (sekundy),
- `nick_name` pochodzi z `robot_config_req_4005` (lub pusty).

## 5.5 Kody bledow i kontrakt odpowiedzi (MUST)
Zalecane bledy w symulatorze (kompatybilne z obecnym formatem):
- `ret_code=0` -> sukces
- `ret_code=60000, err_msg="wrong_port"` -> API na zlym porcie
- `ret_code=60001, err_msg="control_locked"` -> brak uprawnien (lock)
- `ret_code=404, err_msg="missing_file"` -> brak pliku (file_req)
- `ret_code=1, err_msg="invalid_target"` -> niepoprawny target
- `ret_code=1, err_msg="path_not_found"` -> brak sciezki
- `ret_code=1, err_msg="invalid_height"` -> fork height invalid

### 5.5.1 Polityka bledow per API (MUST)
Minimalne mapowanie:
- `control_*` bez locka -> `control_locked`
- `goTarget` z nieznanym `id` -> `invalid_target`
- `goTarget` bez sciezki -> `path_not_found`
- `forkHeight` bez pola -> `invalid_height`
- `file_req` bez pliku -> `missing_file` (404)
- nieobslugiwany API -> `unsupported_api_<apiNo>`

## 5.6 Maszyna stanu robota (MUST)
Stany logiczne (niezalezne od task_status):
- `IDLE` -> brak aktywnego taska, brak manual control
- `MOVING` -> aktywny task i robot wykonuje segment
- `PAUSED` -> task istnieje, ale `paused=true`
- `BLOCKED` -> obstacle/manual block
- `MANUAL` -> manual control (control_motion)
- `RELOCATING` -> reloc in progress
- `CHARGING` -> charging aktywny
- `FORK_TASK` -> aktywny fork task (bez taska nawigacyjnego)

Przejscia (skrót):
- `IDLE` -> `MOVING` po `goTarget`
- `MOVING` -> `PAUSED` po `pause`
- `PAUSED` -> `MOVING` po `resume`
- `MOVING` -> `BLOCKED` po wykryciu przeszkody
- `BLOCKED` -> `MOVING` po zwolnieniu blokady
- `ANY` -> `MANUAL` po `control_motion` (jesli lock owner)
- `MANUAL` -> `IDLE/MOVING` po `control_stop` lub utracie locka
- `ANY` -> `FORK_TASK` po `forkHeight` przy braku taska

Mapowanie na pola:
- `task_status`: 0/1 idle, 2 running, 3 paused, 4 done
- `running_status`: zwykle = `task_status`
- `is_stop` true gdy IDLE/PAUSED/BLOCKED/MANUAL bez ruchu

## 5.7 Mapowanie statusow do realnych logow (SHOULD)
Zasady (na podstawie obserwacji):
- `task_status=2` -> aktywny ruch lub oczekiwanie w trakcie taska
- `task_status=3` -> pause
- `task_status=4` -> task zakonczony
- `task_type=FORK_TASK_TYPE` przy forkHeight bez taska nawigacyjnego
- `blocked=true` gdy obstacle/manual block

## 5.8 Kontrakt map i plikow (MUST)
- `robot_status_map_req` zwraca metadane mapy (nazwa, checksum).
- `robot_status_file_list_req` zwraca liste plikow z `ROBOT_FILE_ROOTS`.
- `robot_status_file_req`:
  - oczekuje `{path: "..."}` lub `{name: "..."}`,
  - path jest normalizowany i musi nalezec do dozwolonych rootow,
  - w przypadku braku pliku -> `missing_file` (404).

## 6. Klienci i sesje
### 6.1 Identyfikacja klienta
**Problem:** Roboshop otwiera kilka socketow na rozne porty. Musimy je zgrupowac.

**Strategia domyslna (MVP):**
- `clientId = remoteAddress`
- po otrzymaniu `robot_config_req_4005` i `nick_name`:
  - aktualizujemy `clientId` na `remoteAddress + ":" + nick_name` (opcjonalnie)

**Konsekwencje:**
- Dwa Roboshopy z tego samego IP beda traktowane jako jeden klient, chyba ze uzyja roznych `nick_name`.
- To jest akceptowalne dla develop/test; realny robot ma podobne ograniczenia.

### 6.2 Zycie sesji
- Sesja istnieje dopoki ma aktywne polaczenia.
- Po zamknieciu wszystkich socketow, sesja wygasa (z TTL np. 10s).

### 6.3 Kontrakt identyfikacji klienta (MUST)
Symulator musi miec jawna strategie identyfikacji klienta, konfigurowalna w runtime:
- `CLIENT_ID_STRATEGY=ip` (domyslne, stabilne, najprostsze)
- `CLIENT_ID_STRATEGY=ip+nick` (bardziej precyzyjne, wymaga locka z `nick_name`)
- `CLIENT_ID_STRATEGY=ip+nick+port` (tylko debug, niezalecane)

Algorytm (MVP):
- przy pierwszym polaczeniu: `clientId` wyliczany z IP (lub IP+port, jesli strategia tego wymaga),
- po `robot_config_req_4005` z `nick_name`:
  - jesli strategia to `ip+nick`, sesja dostaje nowy `clientId`,
  - wszystkie aktywne polaczenia z tego samego IP sa przepinane do nowej sesji (migracja).

### 6.4 TTL i cleanup sesji (MUST)
- `CLIENT_TTL_MS` (np. 10000) kontroluje kiedy sesja znika po zamknieciu wszystkich socketow.
- `CLIENT_IDLE_MS` (np. 60000) moze wygasic sesje nawet przy polaczeniu, jesli nie ma ruchu.
- Wygasniecie sesji ownera moze automatycznie zwolnic locka (patrz 7.6).

### 6.5 Mapowanie multi-port -> sesja (MUST)
Przepinanie sesji po `nick_name`:
- jesli `CLIENT_ID_STRATEGY=ip+nick` i klient wysyla `nick_name`,
  wszystkie aktywne sockety z tego samego IP przechodza do nowej sesji.
- jesli w tym samym czasie istnieje inna sesja z tym samym `ip+nick`,
  nalezy je zmergowac (polaczenia + timestampy).

## 7. Seize control (ControlArbiter)
### 7.1 Stany
```
UNLOCKED
  | (lock from client A)
  v
LOCKED(owner=A)
  | (lock from client B)
  v
LOCKED(owner=B)
  | (unlock from owner)
  v
UNLOCKED
```

### 7.2 Polityka komend
| Klasa komend | Przyklad | Wymaga locka |
|---|---|---|
| read | status_* | NIE |
| push | push_config | NIE (per-connection) |
| control | control_motion, control_stop | TAK |
| nav | goTarget, multistation | TAK (zalecane) |
| fork | forkHeight, forkStop | TAK |
| config | lock/unlock | NIE |

### 7.3 Preempcja
- `lock` od nowego klienta zawsze przejmuje kontrole.
- Poprzedni owner traci kontrole natychmiast:
  - `manual.active = false`, `vx/vy/w = 0`
  - `task` nie jest anulowany (chyba ze kontrola manualna go blokuje)

### 7.4 Odpowiedzi i telemetry
- `robot_status_current_lock_req` i `status_all` zwracaja aktualny `current_lock`.
- Po preempcji `current_lock` wskazuje nowego klienta.

### 7.5 Egzekwowanie kontroli (MUST)
Komendy wymagajace locka zwracaja blad, jesli klient nie jest ownerem.
Proponowany kontrakt:
- `ret_code = 60001`
- `err_msg = "control_locked"`

Gating (domyslnie):
- `control` (2000, 2002, 2010) -> wymaga locka
- `nav` (3051, 3050, 3066, 3053) -> wymaga locka
- `fork` (6040, 6041) -> wymaga locka

### 7.6 Edge cases i polityki (MUST/SHOULD)
- `unlock` od nie-owenera:
  - domyslnie `ret_code=0` (no-op) + log event,
  - opcjonalnie `STRICT_UNLOCK=true` -> zwraca `control_locked`.
- `lock` od aktualnego ownera:
  - odswieza TTL locka i metadane (nick/ip/port).
- Znikniecie ownera:
  - `LOCK_RELEASE_ON_DISCONNECT=true` -> auto unlock po `CLIENT_TTL_MS`.
  - `LOCK_TTL_MS` -> auto unlock po czasie bez ruchu.

### 7.7 Zdarzenia locka (SHOULD)
Symulator powinien logowac:
- `lock_acquired`, `lock_released`, `lock_preempted`, `lock_timeout`
wraz z `clientId`, `nick`, `ip`, `port`.

### 7.8 Konflikty i kolejkowanie komend (MUST)
- Symulator jest single-thread (event loop), ale komendy moga przyjsc z wielu socketow.
- Dla komend kontrolnych: ostatnia poprawna komenda ownera wygrywa (brak kolejki).
- Komendy bez locka dostaja `control_locked`, nie sa kolejowane.
- `goTarget`:
  - domyslnie nadpisuje aktywny task (chyba ze payload ma `append=true`).

## 8. Push i filtrowanie per-connection
### 8.1 Powod refactoringu
Aktualnie push config nadpisuje globalne ustawienia. Przy wielu klientach to niszczy izolacje.

### 8.2 Docelowe zachowanie
- Kazdy socket na porcie PUSH ma wlasne:
  - `intervalMs`
  - `includedFields`
  - `excludedFields`
- `robot_push_config_req` zmienia tylko config polaczenia, ktore wyslalo request.

### 8.3 Backpressure i limity (MUST)
- `PUSH_MAX_QUEUE_BYTES` (np. 1MB) ogranicza buforowanie.
- Gdy write fail lub bufor przekroczy limit:
  - stop push dla tego socketu lub zamknij polaczenie (konfigurowalne).
- `PUSH_MIN_INTERVAL_MS` i `PUSH_MAX_INTERVAL_MS` ograniczaja zakres interval.

### 8.4 Rozmiar payloadow (SHOULD)
- `PUSH_MAX_FIELDS` moze limitowac liczbe pol w odpowiedzi.
- Dla zbyt duzych payloadow: log warning i obciecie listy pol (np. keep allowlist).

### 8.5 Seq i reconnect (MUST)
- `seq` dla push moze byc globalny (latwiejsze) albo per-connection,
  ale musi byc monotoniczny w ramach jednego socketu.
- Po reconnect seq moze zaczac sie od 1 (akceptowalne w sim).

## 9. Konfiguracja runtime (MUST)
Minimalny zestaw flag/zmiennych:
- `CLIENT_ID_STRATEGY` = `ip` | `ip+nick` | `ip+nick+port`
- `CLIENT_TTL_MS`
- `CLIENT_IDLE_MS`
- `LOCK_RELEASE_ON_DISCONNECT` (true/false)
- `LOCK_TTL_MS`
- `STRICT_UNLOCK` (true/false)
- `REQUIRE_LOCK_FOR_CONTROL` (true/false)
- `REQUIRE_LOCK_FOR_NAV` (true/false)
- `REQUIRE_LOCK_FOR_FORK` (true/false)
- `PUSH_MIN_INTERVAL_MS`
- `PUSH_MAX_INTERVAL_MS`
- `PUSH_MAX_QUEUE_BYTES`

Domyslne wartosci (zalecane):
- `CLIENT_ID_STRATEGY=ip`
- `CLIENT_TTL_MS=10000`
- `CLIENT_IDLE_MS=60000`
- `LOCK_RELEASE_ON_DISCONNECT=true`
- `LOCK_TTL_MS=0` (0 = brak TTL)
- `STRICT_UNLOCK=false`
- `REQUIRE_LOCK_FOR_CONTROL=true`
- `REQUIRE_LOCK_FOR_NAV=true`
- `REQUIRE_LOCK_FOR_FORK=true`
- `PUSH_MIN_INTERVAL_MS=200`
- `PUSH_MAX_INTERVAL_MS=10000`
- `PUSH_MAX_QUEUE_BYTES=1048576`

### 9.1 Determinism i czas (SHOULD)
- `SIM_TIME_MODE=real|fixed|replay`
  - `real`: uzywa `Date.now()`
  - `fixed`: uzywa wewnetrznego zegara (start=0, krok=TICK_MS)
  - `replay`: zewnetrzny timestamp (np. z logow)
- `SIM_SEED` kontroluje losowosc (np. obstacle jitter, noise).
- Deterministyczny tryb jest wymagany do powtarzalnych testow.

### 9.2 Limity zasobow (MUST)
- `MAX_CONNECTIONS` (globalnie)
- `MAX_CONNECTIONS_PER_CLIENT`
- `MAX_CLIENT_SESSIONS`
- `MAX_BODY_LENGTH` (ramki)
- `MAX_TASK_NODES` (przy multistation)
- `MAX_PUSH_CONNECTIONS`

### 9.3 Konfiguracja mapy i plikow (SHOULD)
- `MAP_PATH` / `MAP_NAME` / `MAPS_DIR`
- `ROBOT_FILE_ROOTS`
- `ROBOT_PARAMS_PATH`, `ROBOT_DEVICE_TYPES_PATH`, `ROBOT_CONFIG_PATH`
- `GRAPH_PATH` (graph.json lub .smap)

## 10. Observability i eventy (SHOULD)
- Logi zdarzen:
  - `client_connected`, `client_disconnected`
  - `lock_acquired`, `lock_preempted`, `lock_released`, `lock_timeout`
  - `control_denied` (apiNo + clientId)
- Metryki (opcjonalne):
  - liczba aktywnych klientow,
  - current_lock owner,
  - liczba push connections,
  - liczba odrzuconych komend z powodu locka.

### 10.3 Kontrakty DTO i schema (SHOULD)
Zdefiniuj schematy JSON (np. JSON Schema) dla:
- request/response per API
- config packs
- snapshot stanu

To stabilizuje replay, diffy i uzycie przez AI.

### 10.4 Test harness (SHOULD)
Oddzielny modul CLI:
- `sim-replay --log-dir ...`
- `sim-compare --base-ref ...`
- mozliwosc ignorowania pol i tolerance numeryczne

W CI:
- replay testy moga byc uruchamiane osobno (job "replay")
- diffy zapisywane jako artefakt dla analizy AI

### 10.1 Format event log (SHOULD)
Preferowany zapis JSONL (jeden event na linie):
```json5
{ "ts": 1736350031000, "event": "lock_preempted", "from": "ip:a", "to": "ip:b" }
```

## 10.2 Odpornosc i production-hardening (MUST/SHOULD)
Minimalne zasady, aby aplikacja byla stabilna i "production-like":

**Sockety i IO (MUST)**
- Kazdy socket MUSI obslugiwac `error` (ignoruj `ECONNRESET`, `EPIPE`, loguj inne).
- Uzywaj `setNoDelay(true)` dla TCP.
- Na `close` sprzataj timery i referencje (Push).
- Wprowadz `SOCKET_IDLE_TIMEOUT_MS` i zamykaj bezczynne sockety.

**Parser i payload (MUST)**
- Zawsze waliduj `bodyLength` i limituj rozmiar (`MAX_BODY_LENGTH`).
- Dla bledow parse: nie crashuj procesu, tylko zwroc `ret_code`.

**Stabilnosc procesu (SHOULD)**
- Obsluz `uncaughtException` i `unhandledRejection`:
  - log, ustaw flagi "degraded", rozpocznij graceful shutdown.
- Graceful shutdown:
  - `SIGINT`/`SIGTERM`: zatrzymaj tick, zamknij serwery, zapisz stan.

**Backpressure i limity (MUST)**
- Limituj bufor dla push i zamykaj polaczenie gdy bufor rosnie bez odczytu.
- `MAX_CONNECTIONS`, `MAX_CLIENT_SESSIONS` chronia przed leakami.

**Konfiguracja (MUST)**
- Waliduj config przy starcie i loguj effective config.
- Blad config -> exit z kodem != 0.

**Health i diagnostyka (SHOULD)**
- (Opcjonalnie) endpoint HTTP `/_health` i `/_metrics` do sprawdzenia stanu.
- Te endpointy sa **dodatkowe** (administracyjne) i **nie** sa czescia protokolu Robokit
  ani komunikacji z Roboshopem. Musza byc wydzielone i jednoznacznie opisane jako osobny kanal.
- W logach zawsze wypisz porty i tryb pracy (SIM_TIME_MODE).

## 11. Flow request -> response
1) `TcpPortServer` odbiera dane z socketu.
2) `RbkCodec.decode` zwraca ramki.
3) `ApiRouter.handle(frame, context)`:
  - pobiera `ClientSession`,
  - sprawdza `ControlPolicy`,
  - wywoluje `core` (np. TaskEngine, ForkController),
  - buduje response przez `view`.
4) `RbkCodec.encode` -> zapis do socketu.

## 11.1 Flow: goTarget (INFORMATIVE)
1) `task/goTarget` -> `TaskEngine.createTask`
2) `SimulationEngine` startuje segment
3) `status_loc` i `push` raportuja postep

## 11.2 Flow: seize control (INFORMATIVE)
1) `config/lock` -> `ControlArbiter.acquire`
2) preempcja: wyzerowanie manual poprzedniego ownera
3) `status_current_lock` odzwierciedla nowego ownera

## 11.3 Flow: replay (INFORMATIVE)
1) `replay-adapter` wczytuje `listeners.json5`
2) odtwarza c2s/s2c
3) porownuje odpowiedzi z tolerancja numeryczna


## 12. Plan refactoringu (kolejnosc bez ryzyka)
1) **Docelowa mapa plikow (kompaktowa)**: ustal 3 pakiety (`sim-core`, `protocol`, `sim-configs`) + adapter `robokit-robot-sim` (<=30 plikow runtime).
2) **Extract View**: przenies `build*Response` do jednego pliku `app/views.js` (status+push razem).
3) **Extract Protocol**: `codec/router/policy/command_cache` do `packages/robokit-protocol`.
4) **Extract Core**: `state/engine/task/nav/fork/obstacles/charge` do `packages/robokit-sim-core`.
5) **Pure core step**: `step(state, inputs, dt)` + deterministyczny clock/RNG (bez IO).
6) **Config packs**: przenies VERSION_LIST / params / deviceTypes / mapy do configu (single source of truth).
7) **Adaptery**: TCP/HTTP/replay jako cienkie warstwy w `apps/robokit-robot-sim`.
8) **ClientRegistry + ControlArbiter**: jeden moduł na logike klientow/locka (bez duplikacji).
9) **Push**: per-connection config i limity w `app/push_manager.js`.
10) **Explainability**: event bus + JSONL diag + `explain()` w core.
11) **Schema/DTO**: formalne kontrakty payloadow + config schema.
12) **Tests**: multi-client + lock preemption + status regression + replay.

## 12.1 Kryteria akceptacji (MUST)
Kazdy krok powinien miec jasne kryteria "Done":
- zmiana jest pokryta testem (unit/e2e/replay),
- brak regresji w istniecych testach,
- API/protokol bez zmian w wire format (o ile nie zaznaczono inaczej).
- rozklad rozmiaru plikow spelnia wymagania z 4.0.3.

Przyklady:
- **Pure core step**: testy deterministyczne (`seed`), brak zaleznosci od czasu systemowego.
- **Config packs**: replay z wybranej sesji przechodzi po dopasowaniu configu.
- **Adaptery**: te same testy e2e uruchamiane na adapterze TCP i replay.

## 12.2 Ryzyka i mitigacje (SHOULD)
- **Replay diff** z realnymi logami -> stosuj `SIM_REPLAY_IGNORE_FIELDS` + config packs.
- **Lock/reguły kontroli** -> osobne testy e2e + strict gating.
- **Ruch/odometri** -> testy "no teleport" i "heading jump".

## 12.3 Migracja i kompatybilnosc (MUST)
- Stare sciezki powinny byc deprecjonowane etapami, nie usuwane od razu.
- Każda zmiana powinna byc wprowadzona za flaga (np. `SIM_CONFIG`).
- Backward compatibility: jesli config brak, symulator powinien uruchomic sie na defaultach.

## 12.4 Matryca API (SHOULD)
Zdefiniuj liste API w 3 klasach:
- **MUST** (uzywane przez Roboshop/Fleet Manager)
- **SHOULD** (nice-to-have)
- **IGNORE** (legacy/nieobslugiwane)

## 12.5 Workflow configow (SHOULD)
- `config-extract` z logow -> JSON5
- walidacja config schema w CI
- repo `configs/` jako kanoniczne zrodlo configow

## 13. Test matrix (SHOULD)
- Wymaganie: multi-client -> test `client_registry` + e2e z 2 klientami
- Wymaganie: lock preemption -> e2e `fork_and_lock` + dedicated test
- Wymaganie: replay -> `e2e_roboshop_replay`

## 14. Kompatybilnosc i wersjonowanie (MUST)
- Config-pack maja wersje (`config_version`).
- Zmiana configu nie zmienia protokolu.
- Zmiana payloadu wymaga aktualizacji schema + replay ignore list.

## 13. Testy i walidacja
### 13.1 Jednostkowe
- `ControlArbiter`:
  - lock przez A, potem lock przez B => owner=B
  - unlock przez nie-owner => brak zmian
- `ClientRegistry`:
  - kilka socketow z tego samego IP => jedna sesja

### 13.2 Integracyjne
- Dwa klienty:
  - A przejmuje lock -> manual control dziala
  - B przejmuje lock -> A traci kontrole natychmiast
- Push:
  - klient A i B maja rozne `interval` i `include_fields`

### 13.3 Regresja protokolu
- porownanie outputow statusow (snapshoty) z realnymi logami,
- sprawdzenie `current_lock` i `err_msg` vs. roboshop.

## 14. Uwagi kompatybilnosci
- Nie zmieniamy wire format (apiNo, seq, reserved).
- Payloady statusow musza zachowac istniejace pola, nawet jesli pochodza z nowego modelu.

## 15. Bledy protokolu i reset polaczen (MUST)
- `FRAME_TOO_LARGE` -> zamknij socket
- `BAD_START_MARK` -> resync, jesli nie uda sie w 1 frame, zamknij socket
- `JSON_PARSE_ERROR` -> response error, bez zamykania

## 16. Otwarte kwestie (do decyzji)
- Jak rozpoznac dwoch klientow z tego samego IP bez `nick_name` (brak identyfikatora w protokole)?
- Czy `goTarget` ma byc dozwolone bez locka w trybie testowym (flaga `REQUIRE_LOCK_FOR_NAV`)?
- Czy lock ma byc twardym lease z wymogiem keep-alive (np. re-lock co N sekund)?
### 10.5 Reguly replay (MUST)
Replay powinien miec jawny zestaw ignorowanych pol (noise fields), np.:
```
create_on, time, total_time, odo, today_odo, current_ip, current_lock.time_t
```
oraz konfiguracje:
- `SIM_REPLAY_NUM_TOL`
- `SIM_REPLAY_IGNORE_FIELDS`
- `SIM_REPLAY_FAIL_ON_DIFF`
