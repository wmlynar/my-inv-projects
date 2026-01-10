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

## 14. Uwagi kompatybilnosci
- Nie zmieniamy wire format (apiNo, seq, reserved).
- Payloady statusow musza zachowac istniejace pola, nawet jesli pochodza z nowego modelu.

## 15. Otwarte kwestie (do decyzji)
- Jak rozpoznac dwoch klientow z tego samego IP bez `nick_name` (brak identyfikatora w protokole)?
- Czy `goTarget` ma byc dozwolone bez locka w trybie testowym (flaga `REQUIRE_LOCK_FOR_NAV`)?
- Czy lock ma byc twardym lease z wymogiem keep-alive (np. re-lock co N sekund)?
