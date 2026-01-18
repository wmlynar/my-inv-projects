# Sanden task manager - spec (Etap 0.1/1)

Specyfikacja task managera dla Sanden jest analogia do
`klienci/nowy-styl/robot-task-manager`, ale z logika i konfiguracja
dostosowana do Sanden i do specyfikacji taskow.

Powiazane specyfikacje:
- Task: `klienci/sanden/tasks/sanden_bring_empty_p1_spec.md`
- Task: `klienci/sanden/tasks/sanden_remove_empty_p1_spec.md`
- Task: `klienci/sanden/tasks/sanden_remove_full_p3_spec.md`
- Task: `klienci/sanden/tasks/sanden_put_down_spec.md`

## 1. Cel

Proces cykliczny (Node.js), ktory:
- monitoruje stan requestow i worksite,
- automatycznie uruchamia taski RDS na podstawie aktualnego stanu (level-trigger),
- udostepnia proste API serwisowe (put-down, block-from, itp. - opcjonalnie).

Zakres Etapu 0.1:
- brak autoryzacji HTTP API (tylko siec lokalna),
- brak trybu mock (task manager zawsze pracuje z RDS).

## 2. Etapy wdrozenia

Etap 0.1:
- taski A1: `sanden_bring_empty_p1`, `sanden_remove_empty_p1`, `sanden_remove_full_p3`
  (wlaczane per konfiguracja),
- auto-start wlaczony, auto-kill wylaczony,
- brak lockowania source (GetIdleSiteBp `lock=false`),
- brak kolejkowania requestow; UI/procedura blokuje ponowne zgloszenie,
- brak dodatkowych retry/timeout poza tym, co robi RDS,
- `targetActiveTasks = 1`.

Etap 1:
- auto-kill po pustym/locked source i po wycofaniu requestu,
- opcjonalne lockowanie source i jawny unlock po sukcesie,
- opcjonalne respect dispatchable,
- rozszerzona logika dla kilku taskow (kolejne worksite i grupy).

## 3. Architektura

Baza kodu:
- fork `klienci/nowy-styl/robot-task-manager`.

Najwazniejsze elementy:
- cykl `loopMs` pobiera listy: roboty, taski, worksite,
- filtruje aktywne taski po `def_label` i statusach `ACTIVE_STATUSES`,
- na tej podstawie uruchamia nowe taski (auto-start),
- dla Etapu 1 (pozniej) wykonuje auto-kill.

### 3.1 Anti-duplikacja auto-start

Po utworzeniu taska moze uplynac chwila zanim pojawi sie w `queryTaskRecord`.
Aby uniknac dublowania:
- po `createTask` ustawiamy lokalny cooldown `autoStartCooldownMs`
  (np. 1500-2000 ms) i nie tworzymy kolejnego taska w tym oknie.
Cooldown:
- cooldown jest per-task (nie globalny), zeby start jednego taska
  nie blokowal startu innych taskow.

## 4. Integracja z RDS

Wymagane endpointy (Etap 0.1):
- `POST /admin/login` (JSESSIONID),
- `GET /admin/logout`,
- `POST /api/queryTaskRecord`,
- `POST /api/work-sites/sites`,
- `POST /api/set-order` (createTask),
- `POST /api/stop-all-task` (terminateTask).

Opcjonalne (serwis):
- `GET /api/agv-report/core`,
- `POST /api/work-sites/worksiteFiled`,
- `POST /api/work-sites/worksiteUnFiled`,
- `POST /api/work-sites/lockedSites`,
- `POST /api/work-sites/unLockedSites`,
- `POST /api/work-sites/setWorksiteLabel`.

### 4.1 Konfiguracja polaczenia i runtime

Konfiguracja runtime (jak w `robot-task-manager`):
- plik `config.runtime.json5` w katalogu uruchomieniowym, albo
- zmienna `SEAL_RUNTIME_CONFIG` z pelna sciezka.

Uwaga:
- domyslne dane logowania w bazowej implementacji to `admin/123456`;
  w Sanden zalecane jest wyciagniecie loginu/hasla do configu (Etap 1).

### 4.4 Schemat konfiguracji (Sanden)

W Etapie 0.1 dopuszczalne jest dziedziczenie loginu/hasla z kodu
(jak w `robot-task-manager`), ale docelowo (Etap 1) konfiguracja powinna miec:
- `rds.username`, `rds.password`,
- `autoStartCooldownMs` (domyslnie 1500),
- `request/source/target/dropGroup/dropFilled` (task-specyficzne).

Priorytety taskow:
- kolejnosc taskow w konfiguracji wyznacza priorytet uruchomienia,
  gdy kilka requestow jest aktywnych.

### 4.3 Wielokrotne uruchomienie managera

W Etapie 0.1 nie blokujemy drugiej instancji:
- uruchomienie wielu instancji na tym samym RDS moze powodowac duplikacje taskow,
  dlatego dopuszczalne jest tylko pojedyncze uruchomienie managera.

W Etapie 1:
- rozważyć prosty lock (np. plik lock lub endpoint health + instanceId).

### 4.2 Zachowanie przy bledach RDS

- brak dodatkowego backoff w Etapie 0.1; cykl po prostu loguje bledy
  i ponawia w nastepnym ticku `loopMs`,
- `healthz` uznaje RDS za OK, jesli ostatni udany cykl byl nie starszy
  niz `max(10s, loopMs * 5)` (jak w `robot-task-manager`).

Zasada fail-safe:
- jesli `getWorkSiteListRaw` sie nie powiedzie, auto-start jest wstrzymany,
  bo nie mozemy bezpiecznie sprawdzic `disabled`.

Retry `createTask`:
- Etap 0.1: brak dodatkowego retry (błąd = log + kolejny tick),
- Etap 1: mozliwosc dodania 2-3 prób z krotszym interwalem.

## 5. Taski A1 (Etap 0.1)

### 5.1 sanden_bring_empty_p1

Task manager uruchamia task tylko gdy:
- request `A1_P1_BRING` jest `filled=1`, `disabled=0`, `locked=0`,
- istnieje przynajmniej jeden worksite w grupie `PICK_EMPTY_A1`
  z `filled=1`, `locked=0`, `disabled=0`,
- liczba aktywnych taskow `sanden_bring_empty_p1` jest ponizej `targetActiveTasks`.

Uwagi:
- `disabled` wymaga surowej listy `/api/work-sites/sites` (patrz 6.2).
- brak request queue: kolejne zgloszenie w trakcie aktywnego taska moze zostac
  skasowane przez `SetSiteEmptyBp` po sukcesie taska.

### 5.2 sanden_remove_empty_p1

Task manager uruchamia task tylko gdy:
- request `A1_P1_REMOVE` jest `filled=1`, `disabled=0`, `locked=0`,
- istnieje wolny drop w grupie `PUT_FULL_A1` (`filled=0`, `locked=0`, `disabled=0`),
- liczba aktywnych taskow `sanden_remove_empty_p1` < `targetActiveTasks`.

Uwagi:
- `dropFilled = false` (wybor wolnego dropa),
- drop grupa wspolna z P3 (ryzyko kolizji bez locka).
- dostepnosc dropa powinna byc liczona jak w skrypcie RDS
  (pierwsze niezakryte miejsce, zgodnie z kolejnoscia `siteId`).

### 5.3 sanden_remove_full_p3

Task manager uruchamia task tylko gdy:
- request `A1_P3_REMOVE` jest `filled=1`, `disabled=0`, `locked=0`,
- istnieje wolny drop w grupie `PUT_FULL_A1` (`filled=0`, `locked=0`, `disabled=0`),
- liczba aktywnych taskow `sanden_remove_full_p3` < `targetActiveTasks`.

Uwagi:
- `dropFilled = false` (wybor wolnego dropa),
- drop grupa wspolna z P1 (ryzyko kolizji bez locka).
- dostepnosc dropa powinna byc liczona jak w skrypcie RDS
  (pierwsze niezakryte miejsce, zgodnie z kolejnoscia `siteId`).

## 6. Dane i filtrowanie

### 6.1 Taski aktywne

Aktywny task to status z `APIClient.ACTIVE_STATUSES` (domyslnie `1000`, `1002`).
Filtrowanie taskow po:
- `def_label === TASK_LABEL` (np. `sanden_bring_empty_p1`).

### 6.2 Worksite

Do oceny `disabled` wymagamy surowej listy:
- `POST /api/work-sites/sites` (raw), bez mapowania z `api-client.js`.

Z tej listy potrzebne pola:
- `siteId`, `filled`, `locked`, `disabled`, `groupName`.

Mapowanie:
- `siteId` z raw odpowiada `workSiteName` w mapowanej liscie,
  do filtrowania uzywamy raw (zawiera `disabled`).

### 6.3 Walidacja startowa (fail-fast)

Przy starcie procesu (Etap 0.1):
- sprawdzamy istnienie `A1_P1_BRING` i grupy `PICK_EMPTY_A1`,
- sprawdzamy, czy wszystkie `PICK_EMPTY_A1_*` maja `groupName = PICK_EMPTY_A1`,
- sprawdzamy, czy `A1_P1_BRING` i `PICK_EMPTY_A1_*` nie sa `disabled`,
- sprawdzamy istnienie `A1_P1_REMOVE`, `A1_P3_REMOVE` i grupy `PUT_FULL_A1`,
- sprawdzamy, czy `PUT_FULL_A1_*` nie sa `disabled`.

Zachowanie:
- bledy krytyczne logujemy i zatrzymujemy proces (exit 2),
  zeby nie pracowac na niepoprawnej konfiguracji.

## 7. Auto-start (Etap 0.1)

Logika:
- level-trigger (stan aktualny, bez edge-trigger),
- jesli warunki spelnione, tworzymy task przez `createTask(TASK_LABEL, {})`.

Uwaga (multi-task):
- jesli skonfigurowano liste taskow (Etap 1), auto-start przechodzi po liscie
  i uruchamia taski, ktorych warunki sa spelnione.

Kolejnosc priorytetow (A1, Etap 0.1 - przyklad):
1) `sanden_remove_full_p3`
2) `sanden_remove_empty_p1`
3) `sanden_bring_empty_p1`

Limit per dropGroup (opcjonalnie, Etap 1):
- `dropGroupMaxActive` pozwala ograniczyc liczbe aktywnych taskow
  korzystajacych z tej samej `dropGroup` (np. 1 dla `PUT_FULL_A1`).

Stan po restarcie:
- manager nie przejmuje istniejących taskow (tylko je widzi w `queryTaskRecord`),
- auto-start jest blokowany przez `targetActiveTasks`, wiec nie powinno
  dojsc do dublowania po restarcie.

Uwaga (RDS):
- `CSelectAgvBp` i `GetIdleSiteBp` petluja bez limitu retry,
  wiec task manager nie powinien tworzyc taskow, jesli warunki sa niespelnione.

Blokada auto-start w trakcie operacji serwisowych:
- podczas `put-down`, `temp-block-from`, `perm-block-from`, `stop-and-disable`
  auto-start jest wstrzymany (jak w `robot-task-manager`), zeby nie dublowac taskow.

Parametr `targetActiveTasks`:
- jesli `targetActiveTasks <= 0`, przyjmujemy liczbe robotow (jak w `robot-task-manager`),
  ale w Etapie 0.1 zalecane jest jawne `1`.

## 8. Auto-kill (Etap 1)

Warunki kill (pozniej):
- `from` puste/locked przez `emptyTimeoutMs`,
- request `A1_P1_BRING` nie jest filled przez `emptyTimeoutMs`.

Etap 0.1: `enableAutoKillOnEmptySource = false`.

## 9. HTTP API (UI serwisowe)

Endpointy HTTP sa analogiczne do `robot-task-manager` i sa opcjonalne
(UI serwisowe, diagnostyka).

Autoryzacja (Etap 0.1):
- brak autoryzacji; dostep ograniczony do sieci lokalnej.

Autoryzacja (Etap 1):
- opcjonalnie token w naglowku `X-API-Key` lub basic auth.

### 9.1 GET /api/robots

Zwraca liste robotow z polaczeniem do aktywnego taska:
- `vehicle_id`, `dispatchable`, `connection_status`, `isLoaded`,
- `current_task_label`, `current_task_status`, `current_task_record_id`.

Przykladowa odpowiedz:
```json
{
  "robots": [
    {
      "vehicle_id": "AGV-01",
      "dispatchable": true,
      "dispatchable_status": 0,
      "dispatchable_status_description": "Dispatchable",
      "is_error": false,
      "isLoaded": false,
      "connection_status": 1,
      "current_order_id": "123",
      "current_order_state": "RUNNING",
      "current_station": "LM_PICK_A1",
      "last_station": "A1_P1_BRING",
      "current_task_record_id": "456",
      "current_task_label": "sanden_bring_empty_p1",
      "current_task_status": "1000",
      "current_task_status_description": "Running"
    }
  ],
  "tasksError": null
}
```

Uwagi:
- `tasksError` to string lub null; gdy brak dostepu do taskow, lista `robots`
  dalej sie zwraca, ale `current_task_*` moga byc puste.

### 9.2 POST /api/robots/:robotId/*

Operacje serwisowe:
- `/put-down`
- `/temp-block-from`
- `/block-from-perm`
- `/stop-and-disable`
- `/set-dispatchable`
- `/set-undispatchable-online`
- `/set-undispatchable-offline`
- `/pause`, `/resume`
- `/seize-control`, `/release-control`

Kody odpowiedzi:
- `200` - OK,
- `404` - robot poza `managedRobots`,
- `503` - API client niegotowy (brak polaczenia z RDS).

Format bledu:
```json
{ "error": "opis_bledu" }
```

### 9.3 GET /healthz

Zwraca stan polaczenia z RDS i czas od ostatniego sukcesu.
Uzywane do monitoringu (tablet/monitoring).

Przykladowa odpowiedz:
```json
{
  "ok": true,
  "rdsOk": true,
  "ageMs": 250,
  "lastRdsOkAt": "2025-01-18T10:15:30.123Z",
  "lastRdsErrorAt": null,
  "lastRdsError": null,
  "consecutiveRdsErrors": 0,
  "loopIntervalMs": 500,
  "lastCycleDurationMs": 120
}
```

Kody odpowiedzi:
- `200` gdy `rdsOk = true`,
- `503` gdy `rdsOk = false`.

### 9.4 Uwagi do put-down

- put-down uruchamia task `sanden_put_down` (spec: `klienci/sanden/tasks/sanden_put_down_spec.md`).
- `POST /api/robots/:robotId/put-down` powinien przyjmowac JSON:
  `{ "dropSelectorArgs": "<JSON string>" }`.
  Przyklady `dropSelectorArgs` (puste/pelne) sa w specyfikacji taska.
- jesli `dropSelectorArgs` nie podano, manager uzywa
  `tasks.putDownDefaultDropSelectorArgs` (lub zwraca `400`, jesli brak w configu).
- standardowy put-down ustawia `to` w TaskState jako filled.
  Dla Sanden `to = A1_P1_BRING` (request), co moze przywrocic request po anulowaniu.
  Operator powinien to skontrolowac.

## 10. Konfiguracja (Etap 0.1 - przyklad)

```json5
{
  rds: { host: "http://127.0.0.1:8080" },
  tasks: {
    mainLabel: "sanden_bring_empty_p1",
    putDownLabel: "sanden_put_down",
    putDownDefaultDropSelectorArgs:
      "{\"groupNames\":[\"PUT_REJECT_FULL_A1\"],\"ordering\":\"ASC\",\"resultField\":\"dropSite\"}"
  },
  flags: {
    enableAutoStart: true,
    enableAutoKillOnEmptySource: false,
    enableDispatchableSnapshotFix: true,
    respectDispatchableInAutostart: false,
    debugLog: false
  },
  intervals: { loopMs: 500, emptyTimeoutMs: 1000, dispatchableFixDelayMs: 1000 },
  autoStartCooldownMs: 1500,
  dispatch: { targetActiveTasks: 1 },
  managedRobots: [],
  http: { port: 3100 },
  request: { worksiteId: "A1_P1_BRING" },
  source: { groupName: "PICK_EMPTY_A1" },
  target: { siteLabel: "A1_P1_BRING" }
}
```

Uwagi:
- `request/source/target` sa specyficzne dla taskow Sanden.
- `tasks.putDownDefaultDropSelectorArgs` jest uzywane, gdy `/put-down` nie przekaze `dropSelectorArgs`.
- `managedRobots` puste = wszystkie roboty.
- `targetActiveTasks = 1` zapobiega dublowaniu taskow.
- `http.port` musi byc unikalny, jesli uruchamiamy wiecej niz jeden manager.
- `autoStartCooldownMs` zapobiega dublowaniu taskow w oknie propagacji do RDS.
Uwaga (multi-task):
- jesli zdefiniowana jest lista `tasks`, pola `tasks.mainLabel` sa ignorowane.

## 11. Rozszerzenia na kolejne taski (Etap 1)

Docelowo manager obsluguje wiecej niz jeden task. Proponowana rozbudowa:
- konfiguracja `tasks` jako lista definicji,
- kazda definicja mapuje request/group/target na label taska.

Przyklad (koncept, Etap 1):
```json5
{
  tasks: [
    {
      label: "sanden_bring_empty_p1",
      requestWorksite: "A1_P1_BRING",
      sourceGroup: "PICK_EMPTY_A1",
      targetSiteLabel: "A1_P1_BRING",
      targetActiveTasks: 1,
      enableAutoStart: true,
      enableAutoKillOnEmptySource: false
    },
    {
      label: "sanden_remove_empty_p1",
      requestWorksite: "A1_P1_REMOVE",
      dropGroup: "PUT_FULL_A1",
      dropFilled: false,
      dropGroupMaxActive: 1,
      targetActiveTasks: 1,
      enableAutoStart: true,
      enableAutoKillOnEmptySource: false
    },
    {
      label: "sanden_remove_full_p3",
      requestWorksite: "A1_P3_REMOVE",
      dropGroup: "PUT_FULL_A1",
      dropFilled: false,
      dropGroupMaxActive: 1,
      targetActiveTasks: 1,
      enableAutoStart: true,
      enableAutoKillOnEmptySource: false
    }
  ]
}
```

Uwaga:
- Etap 0.1 uzywa pojedynczej konfiguracji `tasks.mainLabel` (jak w spec powyzej).

Kolejnosc ewaluacji i limity:
- w Etapie 1 limity aktywnych taskow sa per-task (nie globalne),
- jezeli kilka taskow spelnia warunki, uruchamiane sa w kolejnosci konfiguracji.

Uwaga o wspoldzielonych dropach:
- jesli kilka taskow korzysta z tej samej `dropGroup` i `dropFilled=false`,
  a `GET_IDLE_LOCK=false`, istnieje ryzyko wyboru tego samego dropa.
  W Etapie 0.1 zalecane jest unikanie rownoleglych requestow,
  a w Etapie 1 wlaczenie lockowania dropa.

## 12. Polityka logowania

Etap 0.1:
- log tekstowy (stdout) w stylu `robot-task-manager`,
- bez logowania danych uwierzytelniajacych.

Etap 1:
- opcjonalny format JSON (logi maszynowe),
- poziomy logowania: INFO/ERROR/DEBUG.

## 13. Cleanup starych taskow

Etap 0.1:
- `enableOldTaskCleanup = false` (nie kasujemy historii).

Etap 1:
- mozna wlaczyc cleanup (np. `keepTotal=1000`, `everyNCycles=600`).

## 14. Logowanie i telemetria

Minimalne logi:
- start cyklu, wybrane worksite, start taska, bledy API.

Rozszerzenie (Etap 1):
- metryki sukces/blad, czas wykonania, powody terminate.

## 15. Runbook (Etap 0.1)

1) Przygotuj konfiguracje:
   - skopiuj `seal-config/configs/local.json5` do `config.runtime.json5`.
2) Uruchom:
   - `SEAL_RUNTIME_CONFIG=./config.runtime.json5 node robot-task-manager.js`
3) Sprawdz:
   - `GET /healthz` powinien zwrocic `200`.

## 16. Checklist uruchomieniowy (Etap 0.1)

- potwierdzone istnienie `A1_P1_BRING` w RDS i na mapie,
- potwierdzone istnienie `PICK_EMPTY_A1_*` (worksite + map point),
- wszystkie `PICK_EMPTY_A1_*` maja `groupName = PICK_EMPTY_A1`,
- `A1_P1_BRING` i `PICK_EMPTY_A1_*` sa `disabled = 0`,
- task `sanden_bring_empty_p1` jest zarejestrowany w RDS,
- tylko jedna instancja task managera jest uruchomiona.

## 17. Runbook operatora (Etap 0.1)

- Blad ForkLoad (brak pobrania):
  - sprawdz fizycznie miejsce P1/P3,
  - zrestartuj request tylko jesli nosnik faktycznie stoi.
- Blad ForkUnload (brak zrzutu):
  - uzyj put-down na robocie,
  - recznie skoryguj filled na dropie (UI bufora).
- Task nie startuje:
  - sprawdz, czy request jest filled,
  - sprawdz, czy drop/source nie sa disabled/locked,
  - sprawdz `GET /healthz`.

## 18. Szkic struktury repo

Docelowa struktura analogiczna do `robot-task-manager`:
- `robot-task-manager.js` (glowny loop),
- `api-client.js` (RDS),
- `public/` (prosty UI serwisowy),
- `seal-config/configs/*.json5` (konfiguracje),
- `config.runtime.json5` (runtime),
- `package.json`, `seal.json5`.

## 19. Pliki i lokalizacja

- Spec: `klienci/sanden/sanden-task-manager/sanden_task_manager_spec.md`
- Implementacja (docelowo): `klienci/sanden/sanden-task-manager/`
