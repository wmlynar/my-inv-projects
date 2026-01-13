# robokit-obstacle-visualizer — Specyfikacja (v0.1)

## 1. Cel i rola (MUST)
`robokit-obstacle-visualizer` to narzedzie dev do analizy logow robota po fakcie.
Umozliwia:
- wczytanie folderu z logami (proxy-recorder),
- wizualizacje mapy + trajektorii przejazdu,
- pokazanie punktow `block` i `nearest_obstacles`,
- oznaczenie miejsc z bledami,
- klik w punkt bledu -> panel szczegolow bledu.

## 2. Reuse istniejacego kodu (MUST)
Maksymalny reuse:
- server + CLI + config: wzor z `apps/map-compiler-visualizer/` (kopiuj strukture i helpers).
- CSS/UI shell: reuse `apps/map-compiler-visualizer/public/index.html` + `viewer.css`.
- map runtime + layers: reuse `packages/robokit-map-ui/public/map_bundle.js` + `map_runtime.js`.
- loader JSON5: reuse `apps/map-compiler-visualizer/lib/config.js`.

## 3. Wejscie/wyjscie
### Wejscie
- `--log-dir` (folder sesji z proxy-recorder) np:
  `/home/inovatica/robokit_logs/2026-01-13_15_43_robot_roboshop-robot-jedzie-i-zatrzymuje-sie-co-chwile`
- opcjonalny wybor strumienia statusu:
  - `--state-conn c0002` (gdy w logach jest wiecej niz jeden connId dla state)
- opcjonalnie mapa:
  - `--compiled-map` + `--scene-graph` (format jak w map-compiler-visualizer),
  - albo `--map-dir` (katalog z `sceneGraph.json` + `compiledMap.json`).
- opcjonalne ograniczenia:
  - `--time-from` / `--time-to` (ms lub ISO) do zawężenia zakresu,
  - `--max-points` (limit punktow trajektorii).
- opcjonalne metadane mapy z logow:
  - `current_map` i `current_map_md5` z `apiNo=11100` sa wyswietlane w UI,
  - jesli mapa nie zostala podana, UI pokazuje ostrzezenie i pozwala wczytac mape recznie.

### Wyjscie
- HTTP server (local-only) z UI w przegladarce.
- API JSON dla UI: trajektoria, punkty blokad, nearest obstacles, bledy.

## 4. CLI i konfiguracja
Struktura jak `apps/map-compiler-visualizer/cli/cli.js`.
Minimalny zestaw flag:
- `--log-dir`
- `--state-conn`
- `--map-dir` lub `--scene-graph` + `--compiled-map`
- `--time-from` / `--time-to`
- `--max-points`
- `--host` / `--port`
- `--open`
Przykladowe flagi:
```
robokit-obstacle-visualizer \
  --log-dir /path/to/session \
  --map-dir /path/to/compiled \
  --host 127.0.0.1 \
  --port 8093 \
  --open true
```

## 4a. Uruchamianie (na teraz, dla logow z 2026-01-13)
Cel: uruchomic narzedzie bez dodatkowych zaleznosci i obejrzec logi z tej sesji.

### Minimalnie (bez mapy)
Pokaze trajektorie + block/nearest + bledy na tle siatki i bounding box.
```
robokit-obstacle-visualizer \
  --log-dir /home/inovatica/robokit_logs/2026-01-13_15_43_robot_roboshop-robot-jedzie-i-zatrzymuje-sie-co-chwile \
  --open true
```
Uwaga: jesli UI nie pokazuje danych, podaj `--state-conn c0002` (to jest glowny strumien statusu w tej sesji).

### Z mapa (opcjonalnie, gdy masz compiledMap/sceneGraph)
```
robokit-obstacle-visualizer \
  --log-dir /home/inovatica/robokit_logs/2026-01-13_15_43_robot_roboshop-robot-jedzie-i-zatrzymuje-sie-co-chwile \
  --map-dir /path/to/compiled \
  --open true
```

Konfig default (JSON5):
```
{
  server: { host: "127.0.0.1", port: 8093 },
  logs: { dir: "./session", stateConn: null, timeFrom: null, timeTo: null },
  map: { dir: "./compiled", sceneGraph: null, compiledMap: null, name: null, md5: null },
  viewer: {
    invertY: true,
    maxPoints: 20000,
    stopSpeedMps: 0.05,
    stopHoldMs: 400,
    slowSpeedMps: 0.2
  }
}
```

## 5. Serwer HTTP (MUST)
Server oparty o wzorzec `apps/map-compiler-visualizer/server.js`.

Endpointy:
- `GET /api/session` -> meta sesji (timeRange, counts, mapName, mapMd5, robotId).
- `GET /api/scene-graph`
- `GET /api/compiled-map`
- `GET /api/trajectory` -> lista punktow (x,y,tsMs,vx,vy,w,yaw,target_id,task_status).
- `GET /api/obstacles` -> `{ blocks:[], nearest:[] }` (x,y,tsMs).
- `GET /api/errors` -> `{ errors:[] }` (x,y,tsMs,errors[]).
- `GET /api/events` -> `{ events:[] }` (stop/slow/warning/error/gotarget/cancel).

## 6. Parsowanie logow (MUST)
Zrodlo: `tcp/state/conn_*_frames_*.jsonl` (z logow proxy-recorder).

### 6.1 Wybor strumienia statusu (MUST)
- Jesli podano `--state-conn`, uzyc tylko tego `connId`.
- W przeciwnym razie wybrac `connId` z najwieksza liczba ramek `s2c` z `apiNo == 11100`.
- Gdy istnieje kilka plikow `conn_*_frames_*` dla tego `connId`, scalic je i posortowac po `tsMs`.
- Wszystkie rekordy w pipeline musza byc posortowane po `tsMs`.

### 6.2 Reguly ekstrakcji (MUST)
- tylko `dir == "s2c"` i `header.apiNo == 11100` (status robota),
- wymagane `json.x` i `json.y`,
- `block_x/block_y` -> punkt blokady,
- `nearest_obstacles[]` -> punkty przeszkod,
- `errors[]` -> punkt bledu w miejscu robota (x,y).

Zachowac tez pola pomocnicze:
- `vx, vy, w, yaw`, `running_status`, `task_status`, `target_id`, `current_station`,
- `emergency`, `soft_emc`, `driver_emc`, `manualBlock`, `blocked`, `slowed`, `slow_reason`,
- `warnings[]` (code + desc) oraz `errors[]`,
- `current_map`, `current_map_md5`,
- timestamp: `tsMs` z logu + `create_on` z payloadu (do UI).
Filtr czasu:
- `timeFrom/timeTo` filtruje po `tsMs` (timestamp logu), `create_on` jest tylko do wyswietlenia.

### 6.3 Kontrakt danych dla UI (MUST)
Minimalne struktury:
```
trajectoryPoint: {
  tsMs, x, y, yaw, vx, vy, w,
  running_status, task_status, target_id, current_station,
  emergency, slowed, slow_reason
}
blockPoint: { tsMs, x, y }
nearestPoint: { tsMs, x, y }
errorEvent: { tsMs, x, y, emergency, errors: [{ code, desc, dateTime, timestamp }], warnings: [{ code, desc, dateTime, timestamp }] }
eventMarker: { tsMs, x, y, kind, detail }
```
Znaczenie:
- `block_x/block_y`: punkt blokady (pozycja przeszkody/triggera z widzenia robota).
- `nearest_obstacles`: najblizsze przeszkody (lista punktow, zwykle 1).
- `slow_reason`: kod zwolnienia, gdy `slowed=true` (mapowanie znaczen poza zakresem MVP).
Uwagi:
- `block_x/block_y` i `nearest_obstacles[0]` czesto wskazuja to samo miejsce; w MVP pokazujemy oba (oddzielne warstwy).
Jednostki:
- polozenie w metrach, kat w radianach, predkosc w m/s.
Orientacja osi:
- `viewer.invertY` stosuje to samo odwracanie osi Y co map-compiler-visualizer.

### 6.4 Wydajnosc i skala (MUST/SHOULD)
- Parser czyta JSONL strumieniowo (bez wczytywania calego pliku do pamieci).
- Limit punktow trajektorii: `viewer.maxPoints` (downsampling).
- Downsampling preferuje:
  - czasowy (np. co N ms) albo
  - dystansowy (np. co >= 0.1 m),
  w zaleznosci od gestosci danych.
- `nearest` i `block` bez downsamplingu w MVP.

### 6.5 Opcjonalne zrodla zdarzen (SHOULD)
- `tcp/task/conn_*`:
  - `gotarget` i `cancel` jako eventy do timeline (pomocne do wyjasniania postojow bez bledow).
- `warnings[]` z `apiNo=11100` jako osobne marker'y (np. "Controller emergency stop").

### 6.6 Heurystyki stop/slow (MUST)
- `stop`: `running_status == 0` **lub** (`speed < stopSpeedMps` przez >= `stopHoldMs`).
- `slow`: `slowed == true` **lub** (`speed < slowSpeedMps`) **lub** `slow_reason != 0`.
- `speed` = `sqrt(vx^2 + vy^2)`.

## 7. UI (MUST)
### Layout
Reuse layoutu z map-compiler-visualizer:
- sidebar + toolbar + map panel + details panel.

### Warstwy mapy
Warstwy SVG:
- base map: edges + nodes (jak w map-compiler-visualizer),
- `trajectory` (polyline),
- `blocks` (czerwone kropki),
- `nearest_obstacles` (pomaranczowe kropki),
- `errors` (czerwony marker z obwodka).

### Filtry
Toolbar z checkboxami:
- Trajectory
- Blocks
- Nearest obstacles
- Errors
- Edges/Nodes (mapa)
Opcjonalne filtry (SHOULD):
- zakres czasu (`time-from`, `time-to`) + slider w UI,
- tylko `slowed` / tylko `stop`,
- filtr po kodzie bledu/warningu (np. 53119).

### Interakcje
- klik w punkt bledu -> panel szczegolow:
  - timestamp,
  - lista `errors[]` (code + desc),
  - `warnings[]` jesli wystepuja,
  - `emergency` + `running_status`,
  - pozycja (x,y), target_id, task_status.
- klik w punkt block/nearest -> krotki tooltip (tsMs + coords).
- fit/reset view.

### Playback i timeline (SHOULD)
- os czasu z play/pause i predkoscia odtwarzania,
- skok do nastepnego zdarzenia (error/emergency/stop/slow),
- marker "stop" gdy `running_status` spada lub predkosc < prog,
- marker "slow" gdy `slowed=true` lub `slow_reason` != 0.
Zrodlo markerow:
- `GET /api/events` (nie wyliczac w UI, zeby miec jeden kanoniczny algorytm).

## 8. Detale mapy (MUST)
- Uzyc `map_bundle.js` + `map_runtime.js` jak w map-compiler-visualizer.
- Wspolrzedne z logow uznac za zgodne z mapa.
- `viewer.invertY` steruje odwracaniem osi Y (domyslnie true, jak w map-compiler-visualizer).
- Gdy brak mapy: pokazac trajektorie na pustym tle z siatka i bounding box.
- Aplikacja MUSI dzialac bez mapy: wystarczy sama trajektoria z logow.
- Gdy duza czesc punktow wypada poza bounds mapy:
  - pokazac ostrzezenie "map/log mismatch",
  - nadal renderowac trajektorie (fallback na bounding box).
Ograniczenie:
- W logach czesto jest tylko `nearest_obstacles[0]` (najblizszy punkt), bez pelnej chmury przeszkod.
  Jesli potrzebna pelna chmura, trzeba wlaczyc dodatkowe logowanie (np. lasery/pointcloud).

## 9. Architektura plikow (MUST)
Cel: uniknac jednego bloba, ale tez nie rozbijac na dziesiatki malych plikow.
Docelowo 4-5 plikow JS + statyczne HTML/CSS.

Proponowany podzial:
- `apps/robokit-obstacle-visualizer/cli/cli.js`:
  - parsing args, config JSON5, start serwera.
- `apps/robokit-obstacle-visualizer/server.js`:
  - HTTP server + routing + static files,
  - ladowanie mapy i datasetu,
  - proste cache w pamieci.
- `apps/robokit-obstacle-visualizer/lib/log_pipeline.js`:
  - parser JSONL + budowa datasetu (trajektoria, block, nearest, errors),
  - downsampling,
  - eksport w formacie dla UI.
- `apps/robokit-obstacle-visualizer/public/viewer.js`:
  - fetch API + store + filtry,
  - render mapy i warstw (trajectory, blocks, nearest, errors),
  - interakcje (klik, tooltip, details panel).

Zasady:
- nowe pliki tylko gdy logika > ~300 LOC albo wymaga testow jednostkowych,
- brak drobnych modulow 20-30 LOC,
- UI i warstwy mapy pozostaja w `viewer.js`.

## 10. Artefakty pomocnicze (SHOULD)
- `summary.json` w pamieci (counts, czas trwania, liczba punktow).
- Export do pliku (`/api/export`) z wybranym bledu + okno czasowe +-N s (dla spec/test).
Format "spec seed":
```
{
  meta: { runId, sourceDir, timeFrom, timeTo },
  filters: { errorCodes: [53119], slowed: true, stop: true },
  frames: [ ...raw status frames from JSONL... ],
  summary: { counts, firstTsMs, lastTsMs }
}
```

## 11. Testy (MUST)
Unit tests dla parsera:
- wczytanie jednej ramki -> trajectory + block + nearest + errors,
- ignorowanie ramek bez `x/y`,
- poprawne filtrowanie po `apiNo`.

## 12. Poza zakresem
- Live replay i sterowanie robotem.
- Integracja z fleet-core/gateway.
- Edycja mapy.
