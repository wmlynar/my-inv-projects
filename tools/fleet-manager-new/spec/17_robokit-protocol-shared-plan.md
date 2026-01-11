# Robokit protocol sharing plan (v0.1)

## 1. Cel
Ujednolicic warstwe protokolu Robokit tak, aby:
- symulator, gateway i robokit-robot-console-controller korzystaly z tego samego kodu,
- protokol byl testowany raz (golden vectors),
- uniknac duplikacji parserow, builderow i mapowan statusow.

## 2. Docelowy podzial w `packages/robokit-lib` (AI-friendly)

Preferowana struktura to **moduly jednego celu**, bo:
- ulatwia AI pracowac na malych fragmentach,
- ulatwia testowanie (unit zamiast duzych mockow),
- latwiej re-uzyc tylko potrzebne elementy.

```
packages/robokit-lib/
  protocol/
    frame.js        // START_MARK, encode/decode, parser, responseApi
    apis.js         // PORTS, API numbers, enums
    commands.js     // builders: goTarget, forkHeight, stop, softEmc + walidacja
    status.js       // mappers: payload -> normalized state
  transport/
    node_client.js  // TCP client (request/response)
    node_server.js  // TCP server helpers (for simulator)
  session/
    seq.js          // seq generator
    retry.js        // retry + backoff
    dedup.js        // command dedup key
  router/
    handlers.js     // apiNo -> handler map
    dispatcher.js   // call handler + encode response
```

## 3. Mapping obecnych plikow
- `packages/robokit-lib/rbk.js` -> split na `protocol/frame.js` + `protocol/apis.js`.
- `packages/robokit-lib/robokit_client.js` -> przeniesc do `transport/node_client.js` + `session/`.
- `packages/robokit-lib/robokit_fleet.js` -> zostaje jako wrapper nad transportem.
- robokit-robot-console-controller: zamiast wlasnych payloadow, uzywa `commands.js`.
- Simulator: parser + router z `protocol/frame.js` + `router/dispatcher.js`.

## 4. Zmiany w aplikacjach

### 4.1 robokit-robot-sim
- usunac lokalne parsery ramek (jesli sa),
- zainstalowac `router/dispatcher.js` z handlerami API,
- odpowiedzi generowac przez `encodeFrame` (z `protocol/frame.js`).

### 4.2 fleet-gateway
- komendy budowac przez `commands.js`,
- walidowac payloady w jednym miejscu,
- korzystac z `node_client.js` + `session/retry.js`.

### 4.3 robokit-robot-console-controller
- uzywac `commands.js` + `node_client.js`,
- deduplikacja i retry wspolne z gateway.
- push (telemetria) obslugiwany przez `transport/node_client.js`.

## 5. Testy (golden vectors)
- `packages/robokit-lib/tests/frame.test.js`:
  - encodeFrame/decodeFrame roundtrip,
  - responseApi (request -> response),
  - parser robustness (partial frames).
- `packages/robokit-lib/tests/commands.test.js`:
  - poprawne payloady dla goTarget/forkHeight/softEmc/stop,
  - walidacja wymaganych pol.
- `packages/robokit-lib/tests/status.test.js`:
  - mapowanie telemetry payload -> normalized state.
- `packages/robokit-lib/tests/session.test.js`:
  - seq generator (wrap/overflow),
  - retry/backoff + jitter,
  - dedup key stability.

## 6. Migration steps (kolejnosc)
1) Wyciagnij `protocol/frame.js` i `protocol/apis.js` z `rbk.js`.
2) Zbuduj `commands.js` (buildery + walidacja).
3) Zrefaktoruj `robokit_client.js` -> `transport/node_client.js` (w tym push).
4) Zmien robokit-robot-console-controller -> uzywa `commands.js` + `node_client.js`.
5) Zmien fleet-gateway -> uzywa `commands.js` + `node_client.js`.
6) Zmien robokit-robot-sim -> `router/dispatcher.js` + `frame`.
7) Dodaj golden tests do `packages/robokit-lib/tests` (frame/commands/status/session).

## 7. Definition of Done
- Wszystkie aplikacje korzystaja z `packages/robokit-lib` dla protokolu.
- Brak duplikacji builderow/parserow w repo.
- Golden tests przechodza (encode/decode + commands).

## 8. Redukcja boilerplate (bez utraty modularnosci)
Nawet przy strukturze modularnej mozna ograniczyc boilerplate:
- jeden `makeCommand(type, payload, opts)` w `protocol/commands.js`,
- wspolna walidacja payloadow w `protocol/commands.js`,
- wspolny `Result` (`{ ok, data, error }`) w `protocol/status.js` i `transport/*`,
- parser/encode eksportowany jako `encodeFrame/decodeFrame` (bez aliasow).

## 9. TDD i pelne testy (plan)
1) **Golden tests - frame**  
   - encode/decode roundtrip,  
   - partial frames,  
   - `responseApi`.
2) **Commands tests**  
   - `goTarget`, `forkHeight`, `stop`, `softEmc` (valid + invalid).
3) **Status mapping tests**  
   - payloady z logow -> normalized state.
4) **Session tests**  
   - seq/retry/dedup.
5) **Integration tests**  
   - loopback TCP (client ↔ server) z prawdziwa ramka.
6) **E2E tests**  
   - robokit-robot-console-controller -> symulator (ack/response).

## 10. Dokumentacja od razu
- `packages/robokit-lib/README.md` — quick start + przyklady uzycia,
- `packages/robokit-lib/protocol.md` — format ramki, API, payloady,
- `packages/robokit-lib/MIGRATION.md` — przejscie ze starych importow,
- `packages/robokit-lib/CHANGELOG.md` — stabilnosc kontraktu.
