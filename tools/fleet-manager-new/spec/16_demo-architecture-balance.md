# Demo architecture balance (v0.1)

## Cel
Uproscic demo i poprawic balans miedzy liczba procesow, spojnosc kontraktow i obserwowalnosc.

## Proponowane zmiany (shortlist)
- DCL orchestrator uruchamiany in-process w `fleet-core` (domyslny tryb demo).
- Jedno zrodlo mapy: `compiledMap.json` ladowany przez `fleet-core`, UI pobiera mape tylko z core.
- Jeden profil demo z portami i sciezkami (bez rozjazdow w configach).
- Supervisor/launcher (skrypt lub compose) z health-checkami.
- Jeden strumien logow JSONL z core (tickId + commandId + replay).
- Gateway jako jedyna warstwa transportowa do robota (brak bezposrednich polaczen).

## Diagram (po zmianach)
```
             (offline step)
  +------------------------+
  | map-compiler           |
  | -> compiledMap.json    |
  +-----------+------------+
              |
              v
  +------------------------+        HTTP/SSE        +------------------------+
  | fleet-ui-mock (UI)     | <--------------------> | fleet-core             |
  | - mapa, roboty, tasks  |                       | - runtime: DCL (default)|
  +------------------------+                       | - orchestrator + logs   |
                                                   +-----------+------------+
                                                               |
                                                               | HTTP commands
                                                               v
                                                   +-----------+------------+
                                                   | fleet-gateway          |
                                                   | - adapter HTTP->TCP    |
                                                   +-----------+------------+
                                                               |
                                                               | RoboCore/Robokit TCP
                                                               v
                                                   +-----------+------------+
                                                   | robokit-robot-sim      |
                                                   | - symulator robota     |
                                                   +-----------+------------+
```

## Minimalny zestaw procesow (demo)
- fleet-core (runtime.mode=dcl)
- fleet-gateway
- robokit-robot-sim
- fleet-ui-mock

## Notatki wdrozeniowe
- UI nie czyta mapy lokalnie; zawsze pobiera z `fleet-core`.
- `fleet-core` zapisuje JSONL tick log; replay sluzy do regresji.
- Health-checki w supervisorze pilnuja kolejnosci startu.
