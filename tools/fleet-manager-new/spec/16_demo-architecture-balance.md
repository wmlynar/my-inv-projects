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

## Tryb e2e obserwowalny (UI + logi)
Cel: uruchomic testy e2e calego fleet managera tak, aby:
- UI bylo widoczne i aktualizowalo stan podczas testu,
- logi lecialy w tle w sposob latwy do skopiowania i analizy,
- na podstawie logow mozna bylo opisac rozjazd miedzy "jest" i "powinno byc",
- te opisy dalo sie potem zamienic w specyfikacje i nowe testy e2e.

### Wymagania uruchomienia
- Jedno polecenie uruchamia: `fleet-core`, `fleet-gateway`, `robokit-robot-sim`, `fleet-ui-mock` oraz runner e2e.
- UI dziala w normalnym trybie (nie headless), aby mozna bylo obserwowac przebieg scenariusza.
- Runner e2e startuje dopiero po health-checkach wszystkich procesow.

### Logowanie i zrzuty diagnostyczne
- Kazde uruchomienie e2e tworzy katalog `logs/run-<timestamp>/`.
- Wszystkie procesy zapisują JSONL do osobnych plikow:
  - `core.jsonl`, `gateway.jsonl`, `sim.jsonl`, `ui.jsonl`, `e2e.jsonl`.
- Logi zawieraja `runId` i korelacje zdarzen (np. `taskId`, `commandId`, `tickId`).
- Runner e2e dopisuje do `e2e.jsonl`:
  - nazwe scenariusza,
  - czas start/koniec,
  - status (ok/fail),
  - kroki i wyniki asercji.
- Opcjonalny tryb "verbose" zapisuje dodatkowo raw frames (do osobnego pliku).

### Wynik dla uzytkownika
- Po zakonczeniu testu powstaje krotki plik podsumowania `run-summary.md` z:
  - identyfikatorem runu i czasem,
  - lista scenariuszy i statusem,
  - sciezka do katalogu logow.
- Uzytkownik moze skopiowac logi i opisac:
  - co jest zle (na podstawie obserwacji UI i logow),
  - co powinno byc,
  - i na tej podstawie powstaje nowa specyfikacja + test e2e.

## Notatki wdrozeniowe
- UI nie czyta mapy lokalnie; zawsze pobiera z `fleet-core`.
- `fleet-core` zapisuje JSONL tick log; replay sluzy do regresji.
- Health-checki w supervisorze pilnuja kolejnosci startu.
