# robokit-robot-sim — Architektura i refactoring (v1.0)

## 1. Cel dokumentu
Ten dokument opisuje docelowa architekture `robokit-robot-sim`, z naciskiem na:
- rozdzielenie warstw (protocol -> core -> view),
- obsluge wielu klientow jednoczesnie (np. 2x Roboshop),
- semantyke `seize control` z natychmiastowym przejeciem kontroli przez nowego klienta,
- plan refactoringu bez zrywania kompatybilnosci protokolowej.

## 2. Problemy w obecnej implementacji (skrot)
- Jedna, globalna instancja stanu robota, bez kontroli dostepu dla roznych klientow.
- `lock` istnieje w payloadach, ale nie jest egzekwowany (kazdy moze sterowac).
- Push config jest globalny (zmiana z jednego klienta wplywa na wszystkie polaczenia).
- Logika protokolu, stanu i widokow jest wymieszana w jednym pliku.
- Brak wyraznego modelu sesji klienta (Roboshop laczy sie wieloma socketami).

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

### 10.1 Format event log (SHOULD)
Preferowany zapis JSONL (jeden event na linie):
```json5
{ "ts": 1736350031000, "event": "lock_preempted", "from": "ip:a", "to": "ip:b" }
```

## 11. Flow request -> response
1) `TcpPortServer` odbiera dane z socketu.
2) `RbkCodec.decode` zwraca ramki.
3) `ApiRouter.handle(frame, context)`:
   - pobiera `ClientSession`,
   - sprawdza `ControlPolicy`,
   - wywoluje `core` (np. TaskEngine, ForkController),
   - buduje response przez `view`.
4) `RbkCodec.encode` -> zapis do socketu.

## 12. Plan refactoringu (kolejnosc bez ryzyka)
1) **Extract View**: przenies `build*Response` do `views/`.
2) **Extract Core**: przenies `tick`, `TaskEngine`, `ForkController`, `Navigation`.
3) **Add ClientRegistry**: mapuj socket -> clientId.
4) **Add ControlArbiter**: implementuj lock/preempcje + gating.
5) **Fix Push**: per-connection config.
6) **Tests**: multi-client + lock preemption + status regression.

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
