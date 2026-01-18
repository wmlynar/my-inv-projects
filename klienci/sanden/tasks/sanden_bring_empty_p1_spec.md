# Sanden Etap 1 - Task dowozu pustego nosnika na A1 P1

## Etapy wdrozenia

- Etap 0.1: uruchomienie taska bez auto-kill (brak ubijania taskow).
- Etap 1: docelowa logika z auto-kill po pustym/locked source oraz po wycofaniu requestu.

## Zakres etapow (uszczegolowienia)

- Auto-kill: Etap 0.1 wylaczony, Etap 1 wlaczony.
- Czyszczenie requestu `A1_P1_BRING`: Etap 0.1 i Etap 1 czyscimy po zrzucie.
- `SetSiteEmptyBp` (request): Etap 0.1 i Etap 1 wlaczone po sukcesie.
- `SetSiteEmptyBp` (source): Etap 0.1 i Etap 1 wlaczone po ForkLoad
  (ForkLoad nie zmienia `filled` w RDS).
- `SetSiteFilledBp` (drop): pomijamy w obu etapach (brak worksite zajetosci dla drop).
- Pre-pick / pre-drop: Etap 0.1 domyslnie wylaczone (chyba ze wymagane przez RDS/trasowanie),
  Etap 1 aktywne w konfiguracji.
- Dispatchable i priorytety: Etap 0.1 bez respektowania dispatchable, Etap 1 opcja `respectDispatchableInAutostart`.
- Limit aktywnych taskow: Etap 0.1 stale `targetActiveTasks = 1`, Etap 1 wartosc konfigurowalna.
- Retry/timeout: Etap 0.1 brak dodatkowej logiki retry/timeout, Etap 1 doprecyzowanie w managerze jesli potrzebne.
- Wyzwalanie: zawsze zalezne od aktualnego stanu (level-trigger), bez edge-triggerow.
- Brak innych taskow wykorzystujacych `PICK_EMPTY_A1` w Etapie 0.1 i 1.

## 1. Cel

Zadanie `sanden_bring_empty_p1` dowozi pusty nosnik z alejki pustych opakowan dla linii A1
na pole P1 linii A1, gdy operator zglosi zapotrzebowanie.

Specyfikacja jest przygotowana na podstawie:
- `rds/nowy-styl-rds/doc/wind-task-format.md`
- `rds/nowy-styl-rds/wind-tasks/Task Records.task`
- `rds/nowy-styl-rds/script/woj.js` (referencja do stylu)
- `klienci/nowy-styl/robot-task-manager` (logika task managera)

## 2. Worksite i grupy (RDS)

### 2.1 Pole zgloszenia (request)

- Worksite request: `A1_P1_BRING`
- Znaczenie: `filled = 1` oznacza aktywne zgloszenie dowozu pustego nosnika na P1.

### 2.2 Alejka pustych opakowan (source)

Worksites w grupie `PICK_EMPTY_A1`:
- `PICK_EMPTY_A1_1`
- `PICK_EMPTY_A1_2`
- `PICK_EMPTY_A1_3`
- `PICK_EMPTY_A1_4`
- `PICK_EMPTY_A1_5`
- `PICK_EMPTY_A1_6`

Wymagania:
- wszystkie powyzsze sites maja `groupName = PICK_EMPTY_A1`,
- nazwy zapewniaja kolejnosc od "pierwszego z brzegu" (1 -> 6),
- `filled = 1` oznacza dostepny nosnik do pobrania.

### 2.3 Pole docelowe (drop)

Docelowy punkt zrzutu to site na mapie:
- `A1_P1_BRING` (label na mapie, pokrywa sie z requestem)

Uwaga:
- nie ma worksite reprezentujacego zajetosc miejsca P1,
- jedyny worksite logiczny dla P1 to request `A1_P1_BRING`,
- worksite `A1_P1_BRING` ma przypisany punkt na mapie (AP) dla zrzutu.
- `A1_P1_BRING` pelni podwojna role: worksite requestu + punkt zrzutu na mapie.
- system nie sledzi zajetosci P1; jedyna zmiana stanu po dostawie to wyczyszczenie requestu.

### 2.4 Punkt podjazdu (pre-pick / pre-drop)

- Pre-pick: punkt blisko alejki pustych opakowan (np. `LM_PICK_A1`).
- Pre-drop: punkt buforowy przed zrzutem na P1 (np. `LM_P1`).

Powyzsze nazwy sa do potwierdzenia w konfiguracji RDS.

### 2.5 Parametry konfiguracyjne taska (domyslne)

Parametry sa wpisywane bezposrednio w definicje `.task`.

Etap 0.1 (domyslne):
- `PICK_KEY_ROUTE = "LM_PICK_A1"`
- `PRIORITY = "0"` (opcjonalnie)
- `PRE_PICK_SITE = ""` (pomijamy blok pre-pick)
- `PRE_DROP_SITE = ""` (pomijamy blok pre-drop)
- `GET_IDLE_LOCK = false`
- `GET_IDLE_RETRY_PERIOD = 1000` (ms)
- `GET_IDLE_ORDER_DESC = false` (kolejnosc po siteId, do potwierdzenia)

Etap 1 (domyslne):
- `PICK_KEY_ROUTE = "LM_PICK_A1"`
- `PRIORITY = "0"`
- `PRE_PICK_SITE = "LM_PICK_A1"`
- `PRE_DROP_SITE = "LM_P1"`
- `GET_IDLE_LOCK = true` (opcjonalnie)
- `GET_IDLE_RETRY_PERIOD = 1000` (ms)
- `GET_IDLE_ORDER_DESC = false` (kolejnosc po siteId, do potwierdzenia)

Reguly:
- jesli `PRE_*` jest puste, odpowiedni blok `CAgvOperationBp` jest pomijany,
- jesli `PRIORITY` jest puste, pole nie jest ustawiane w `CSelectAgvBp`.
- Mapowanie parametrow do `GetIdleSiteBp` w `.task`:
  - `GET_IDLE_LOCK` -> input param `lock`
  - `GET_IDLE_RETRY_PERIOD` -> input param `retryPeriod`
  - `GET_IDLE_ORDER_DESC` -> input param `orderDesc`
- Mapowanie parametrow do `CSelectAgvBp` w `.task`:
  - `PICK_KEY_ROUTE` -> input param `keyRoute`
  - `PRIORITY` -> input param `priority`

## 3. Warunek uruchomienia taska

Task manager uruchamia `sanden_bring_empty_p1` tylko gdy:
- `A1_P1_BRING` jest `filled = 1` oraz `disabled = 0` i `locked = 0`, oraz
- istnieje przynajmniej jeden filled worksite w grupie `PICK_EMPTY_A1`
  z `locked = 0` i `disabled = 0`, oraz
- nie ma aktywnego taska `sanden_bring_empty_p1` (lub target aktywnych taskow = 1).

Model wyzwalania (level-trigger):
- decyzja o starcie zalezy od aktualnego stanu `A1_P1_BRING` i `PICK_EMPTY_A1`,
- jesli request pozostaje filled po bledzie, task moze zostac uruchomiony ponownie.

Etap 1:
- gdy po uruchomieniu taska source stanie sie niedostepny, task powinien zostac
  przerwany (terminate) i ponowiony przez task manager, gdy zrodlo znowu bedzie dostepne.

Etap 0.1:
- brak auto-kill po starcie (task nie jest ubijany na podstawie source/request).

## 4. Wybor miejsca pobrania

Bez skryptow - wybor jest oparty o standardowy blok RDS:
- `GetIdleSiteBp` z parametrami:
  - `filled = true`
  - `locked = false`
  - `groupName = "PICK_EMPTY_A1"`

Zakladamy, ze RDS zwroci pierwsze miejsce "od brzegu"
w kolejnosci siteId (tj. `_1`, potem `_2`, itd).
Puste miejsca w srodku nie zmieniaja logiki wyboru.

Uwaga o kolejnosci:
- Jesli RDS nie gwarantuje sortowania po siteId, nalezy wprowadzic jawne
  sortowanie po suffixie `_1.._6` (np. w ScriptVariablesBp) - Etap 1.

Uwaga o disabled:
- `GetIdleSiteBp` nie filtruje `disabled`, wiec moze zwrocic site disabled
  jesli jest `filled` i `locked = 0`.
- Etap 0.1: wymagamy, by wszystkie `PICK_EMPTY_A1_*` byly enabled
  (albo by disabled sites byly `filled = 0` i docelowo wyjete z grupy).

Lock source:
- `GetIdleSiteBp` blokuje worksite tylko gdy input param `lock = true`.
- W tej wersji RDS zwalnianie locka po tasku jest niejawne; `releaseSites = true`
  dziala tylko przy stop/end_error/manual_end, nie przy normalnym zakonczeniu.
- Etap 0.1: domyslnie `lock = false` (brak blokowania, `targetActiveTasks = 1`).
- Etap 1: jesli wlaczamy `lock = true`, potrzebny jest jawny unlock po sukcesie
  (np. przez task manager / API).

Zwalnianie locka (RDS):
- `releaseSites = true` zwalnia lock tylko przy stop/end_error/manual_end.
- Przy normalnym zakonczeniu lock pozostaje, wiec przy `lock = true` wymagany jest
  jawny unlock po sukcesie (Etap 1).

Brak zrodla lub brak AGV (zachowanie RDS):
- `GetIdleSiteBp` w tej wersji RDS petluje i czeka na wolny site
  (nie zwraca `null`, uzywa `retryPeriod`).
- `CSelectAgvBp` petluje i czeka na przydzial AGV (brak timeout).

Wniosek:
- w Etapie 0.1 task manager nie powinien uruchamiac taska, jesli warunki
  wstepne nie sa spelnione, bo task moze "wisiec" w RDS.
- brak dostepnego AGV jest akceptowalny jako stan "czekania" (CSelectAgvBp petluje).
- `targetActiveTasks = 1` ogranicza liczbe aktywnych taskow, wiec oczekiwanie
  na AGV nie powoduje dublowania taskow.

Retry/timeout:
- Etap 0.1: brak retry poza naturalnym ponownym uruchomieniem taska.
- Etap 1: opcjonalnie retry `CSelectAgvBp` (np. 2-3 proby) z krotkim odstepem,
  a po przekroczeniu limitu terminate.

Uwagi z kodu RDS:
- `GetIdleSiteBp` i `CSelectAgvBp` w tej wersji RDS petluja i czekaja
  (brak limitu retry), z domyslnym sleep ~1000ms.
- `retryNum`/`retry` nie sa honorowane przez `GetIdleSiteBp` w tej wersji.
- `retryPeriod` w `GetIdleSiteBp` steruje opoznieniem petli (ms).
- `orderDesc` w `GetIdleSiteBp` wplywa na kolejnosc po `siteId`
  (ASC/DOMYSLNIE vs DESC), ale wymaga potwierdzenia w RDS.

## 5. Struktura taska (blokowo)

Minimalny przebieg taska, zgodny ze stylem `nowy_styl_task`:

1) TaskState (pusty status)
   - `TaskStateBp` -> `{ "from": "", "to": "" }`

2) Wybierz source
   - `GetIdleSiteBp` -> `blocks.b1.siteId`

3) TaskState (wypelnij from)
   - `TaskStateBp` -> `{ "from": "<siteId>", "to": "" }`

4) Wybierz AGV + podjazd do source
   - `CSelectAgvBp` (keyRoute = `PICK_KEY_ROUTE`, priority = `PRIORITY`)
   - `CAgvOperationBp` na `PRE_PICK_SITE` (opcjonalnie)
   - `CAgvOperationBp` (ForkLoad) na `blocks.b1.siteId`

5) Wyczysc source po ForkLoad
   - `SetSiteEmptyBp` -> `blocks.b1.siteId`

6) TaskState (wyczysc from po potwierdzonym SetSiteEmpty)
   - `TaskStateBp` -> `{ "from": "", "to": "" }`

7) (Opcjonalny) punkt przejazdowy przed drop
   - `CAgvOperationBp` -> `PRE_DROP_SITE` (np. LM_P1)

8) TaskState (wypelnij to)
   - `TaskStateBp` -> `{ "from": "", "to": "<A1_P1_BRING>" }`

9) Rozladunek na P1
   - `CAgvOperationBp` (ForkUnload) na `A1_P1_BRING`

10) Wyczysc zgloszenie po sukcesie ForkUnload (Etap 0.1/1)
   - `SetSiteEmptyBp` -> `A1_P1_BRING`

Definicja "prawdy" o drop:
- nie sledzimy zajetosci drop w RDS (brak worksite),
- jedyny sygnal to request `A1_P1_BRING` (czyszczony po sukcesie).
- `TaskState.to` wskazuje request (`A1_P1_BRING`), a nie drop.

Parametry ForkLoad/ForkUnload powinny byc skopiowane z `nowy_styl_task`
(`plt/ns_paleta_1200_auto_pallet.plt`, wysokosci start/rec/end).

### 5.1 Parametry ForkLoad/ForkUnload (domyslne)

ForkLoad (z `nowy_styl_task`):
- `var_recfile`: `plt/ns_paleta_1200_auto_pallet.plt`
- `var_start_height`: `0.0`
- `var_rec_height`: `0.0`
- `var_end_height`: `0.2`
- `var_recognize`: `true`

ForkUnload (z `nowy_styl_task`):
- `var_start_height`: `""`
- `var_end_height`: `0.085`
- `nextLocation`: `null`

Wartosci wymagaja potwierdzenia z RDS/AGV.

### 5.2 Wymuszenie czyszczenia requestu po ForkUnload

Minimalna implementacja w `.task`:
- `SetSiteEmptyBp` jest umieszczony bezposrednio po `ForkUnload`.
- Jesli `ForkUnload` sie nie powiedzie, `SetSiteEmptyBp` sie nie wykona,
  a request pozostanie filled (mozliwosc ponowienia).

Opcjonalnie (Etap 1):
- uzyc `TryCatchBp` wokol `SetSiteEmptyBp`, zeby rozroznic blad
  `ForkUnload` vs blad czyszczenia requestu.

Uwaga (Etap 0.1):
- jesli `SetSiteEmptyBp` dla `A1_P1_BRING` sie nie powiedzie, request pozostaje filled,
  a auto-start moze utworzyc kolejny task. Wymagane jest reczne sprawdzenie
  sytuacji i wyczyszczenie requestu przed wznowieniem.

### 5.3 Wymuszenie czyszczenia source po ForkLoad

Minimalna implementacja w `.task`:
- `SetSiteEmptyBp` po `ForkLoad` dla `blocks.b1.siteId`.
- Jesli `SetSiteEmptyBp` sie nie powiedzie, task przechodzi w blad;
  operator moze uzyc `sanden_put_down` (ladunek na widlach).

## 6. Kryterium sukcesu i obsluga bledow

Kryterium sukcesu:
- sukces = ForkLoad + `SetSiteEmptyBp` dla source oraz ForkUnload na `A1_P1_BRING`
  zakonczone bez bledu i poprawnie wykonany `SetSiteEmptyBp` dla `A1_P1_BRING`.
- jesli ktorys `SetSiteEmptyBp` sie nie powiedzie, task traktujemy jako blad
  i request/source pozostaja w stanie sprzed bledu.

Kryterium bledu:
- blad dowolnego bloku w tasku powoduje zakonczony task z bledem/terminate.

Przerwanie po ForkLoad (ladunek na widlach):
- Etap 0.1: brak automatycznej obslugi; operator uruchamia `sanden_put_down`
  z task managera (jak w `robot-task-manager`) lub procedura manualna.
- Etap 1: mozna dodac automatyczny put-down, jesli mechanizm jest gotowy.
Uwaga (Etap 0.1):
- po bledzie po ForkLoad nalezy wstrzymac auto-start (lub zatrzymac manager)
  do czasu put-down i weryfikacji requestu, zeby nie tworzyc nowego taska
  przy robocie z ladunkiem.

Uwaga do put-down:
- `to` w TaskState to request worksite (`A1_P1_BRING`), zeby standardowy
  put-down nie wywalal sie na `setWorkSiteFilled(to)`.
- `to` nie oznacza drop i nie ma znaczenia dla zajetosci P1.
- put-down ustawia `A1_P1_BRING` jako filled; jesli request byl anulowany,
  operator powinien go potem wyczyscic.

## 7. TaskState (format JSON)

Status taska powinien byc zgodny z robot-task-manager:
```json
{ "from": "PICK_EMPTY_A1_1", "to": "A1_P1_BRING" }
```

TaskState jest kluczowy dla:
- auto-kill (gdy from jest puste / locked),
- narzedzi serwisowych (put-down, block-from).

Aktualizacja TaskState:
- po wyborze source ustaw `from`,
- po `SetSiteEmptyBp` dla source wyczysc `from`
  (Etap 1: natychmiast po `SetSiteEmptyBp`, zeby auto-kill nie ubil taska),
- po rozpoczeciu etapu drop ustaw `to` na `A1_P1_BRING`,
- po rozladunku mozesz wyczyscic `from` i `to` (opcjonalnie).

Format TaskState:
- JSON z polami `from` i `to` (stringi lub puste stringi).
- Inne pola nie sa uzywane w Etapie 0.1/1.

## 8. Reguly konkurencji

- Aktywny task to task o statusie nalezacym do `APIClient.ACTIVE_STATUSES`.
- Domyslna polityka: max `targetActiveTasks` jednoczesnych taskow (Etap 0.1 = 1).
- Nowy task nie startuje, jesli limit aktywnych taskow jest osiagniety.

Zasady wyboru AGV:
- Etap 0.1: dowolny dostepny AGV (brak filtrowania po nazwie).
- Etap 1: opcjonalnie ograniczenie do `managedRobots`.

## 9. Task manager (spec)

Wersja bazowa: fork z `klienci/nowy-styl/robot-task-manager`.

Wymagane zmiany logiki:

### 9.1 Warunek auto-start

Auto-start uruchamia `sanden_bring_empty_p1` tylko gdy:
- `A1_P1_BRING` is filled oraz `disabled = 0` i `locked = 0`,
- istnieje filled worksite w grupie `PICK_EMPTY_A1`
  z `locked = 0` i `disabled = 0`.

Jezeli warunek nie jest spelniony, nie tworzymy taska.
Uwaga: pole `disabled` wymaga surowej listy z `/api/work-sites/sites`
(patrz sekcja 10).

### 9.1.1 Put-down dla taska sanden

- brak dodatkowych zmian po stronie managera (standardowy put-down dziala).

### 9.2 Auto-kill (Etap 1)

Zatrzymaj task, gdy:
- `from` (z TaskState) jest puste/locked przez `emptyTimeoutMs`, lub
- `A1_P1_BRING` przestalo byc filled przez `emptyTimeoutMs`.

Uwaga:
- auto-kill ma sens tylko gdy `from` nie jest puste, dlatego `from` powinno byc
  czyszczone zaraz po pobraniu (ForkLoad).

Clear request po sukcesie:
- Etap 0.1: task czysci `A1_P1_BRING` tylko po udanym ForkUnload (sukces),
  nie czysci przy bledzie/terminate.
- Etap 1: jak wyzej.

### 9.3 Konfiguracja managera (Etap 0.1 - przyklad)

```json5
{
  rds: { host: "http://127.0.0.1:8080" },
  tasks: { mainLabel: "sanden_bring_empty_p1", putDownLabel: "sanden_put_down" },
  flags: {
    enableAutoStart: true,
    enableAutoKillOnEmptySource: false,
    respectDispatchableInAutostart: false
  },
  intervals: { loopMs: 500, emptyTimeoutMs: 1000 },
  dispatch: { targetActiveTasks: 1 },
  request: { worksiteId: "A1_P1_BRING" },
  source: { groupName: "PICK_EMPTY_A1" },
  target: { siteLabel: "A1_P1_BRING" }
}
```

### 9.4 Konfiguracja managera (Etap 1 - przyklad)

```json5
{
  rds: { host: "http://127.0.0.1:8080" },
  tasks: { mainLabel: "sanden_bring_empty_p1", putDownLabel: "sanden_put_down" },
  flags: {
    enableAutoStart: true,
    enableAutoKillOnEmptySource: true,
    respectDispatchableInAutostart: true
  },
  intervals: { loopMs: 500, emptyTimeoutMs: 1000 },
  dispatch: { targetActiveTasks: 1 },
  request: { worksiteId: "A1_P1_BRING" },
  source: { groupName: "PICK_EMPTY_A1" },
  target: { siteLabel: "A1_P1_BRING" }
}
```

## 10. Wymagania RDS i walidacja

Wymagania RDS:
- RDS musi wspierac bloki: `GetIdleSiteBp`, `TaskStateBp`, `CSelectAgvBp`,
  `CAgvOperationBp`, `SetSiteEmptyBp`.
- API zgodne z `klienci/nowy-styl/robot-task-manager/api-client.js`.

Walidacja wstepna (checklist):
- istnieja wszystkie worksite z `PICK_EMPTY_A1_*` oraz `A1_P1_BRING`,
- site mapy `A1_P1_BRING` istnieje jako punkt zrzutu,
- kazdy `PICK_EMPTY_A1_*` istnieje jako punkt na mapie (target dla ForkLoad),
- `PICK_EMPTY_A1_*` maja poprawny `groupName`,
- nazwy site sa jednoznaczne, bez duplikatow,
- worksite `A1_P1_BRING` nie moze byc disabled,
- worksite `PICK_EMPTY_A1_*` nie moga byc disabled (GetIdleSiteBp nie filtruje disabled),
- keyRoute/priority/pre-pick/pre-drop sa zdefiniowane lub jawnie pominiete.

Uwagi implementacyjne:
- do sprawdzenia `disabled` nalezy uzyc surowej odpowiedzi z
  `/api/work-sites/sites` (np. `getWorkSiteListRaw`), bo mapowanie
  w `api-client.js` nie zwraca pola `disabled`.

Zmiany requestu w trakcie taska:
- Etap 0.1: ignorujemy zmiany `A1_P1_BRING` po starcie taska.
- Etap 1: zmiana `A1_P1_BRING` na empty powoduje auto-kill (patrz sekcja 9.2).
Uwaga (Etap 0.1):
- brak kolejkowania requestow: ponowne zgloszenie w trakcie aktywnego taska
  moze zostac wyczyszczone przez `SetSiteEmptyBp` po sukcesie. Procedura/UI
  powinny blokowac ponowne zgloszenie do czasu zakonczenia taska.

Dynamiczny sklad grupy `PICK_EMPTY_A1`:
- Etap 0.1: zakladamy statyczne 6 miejsc.
- Etap 1: dopuszczamy zmiany grupy, ale wymagamy zachowania kolejnosci `_1.._N`.

### 10.1 Endpointy RDS uzyte przez task manager

Wymagane (Etap 0.1/1):
- `POST /admin/login` (logowanie, JSESSIONID)
- `GET /admin/logout` (wylogowanie)
- `POST /api/work-sites/sites` (lista worksite)
- `POST /api/queryTaskRecord` (lista taskow)
- `POST /api/set-order` (createTask)
- `POST /api/stop-all-task` (terminateTask)

Opcjonalne (akcje serwisowe/task manager UI):
- `GET /api/agv-report/core` (lista robotow)
- `POST /api/work-sites/worksiteFiled` (setWorkSiteFilled)
- `POST /api/work-sites/worksiteUnFiled` (setWorkSiteEmpty)
- `POST /api/work-sites/lockedSites` (setWorkSiteLocked)
- `POST /api/work-sites/unLockedSites` (setWorkSiteUnlocked)
- `POST /api/work-sites/setWorksiteLabel` (setWorksiteTags)
- `POST /api/delete-task` (cleanup starych taskow)

### 10.2 Krytyczne pola w odpowiedziach

`/api/work-sites/sites`:
- `siteId`, `filled`, `locked`, `disabled`, `groupName`,
  `tags` (opcjonalnie), `siteName` (opcjonalnie).

`/api/queryTaskRecord`:
- `id`, `def_id`, `def_label`, `status`, `input_params`, `agv_id`.

`/api/agv-report/core` (opcjonalne):
- `report[].vehicle_id`, `report[].dispatchable`, `report[].current_order.id`,
  `report[].rbk_report.task_status`.

### 10.3 Minimalne uprawnienia konta RDS

Wymagane:
- logowanie i odczyt danych taskow,
- odczyt listy worksite,
- tworzenie taska (`/api/set-order`),
- terminate taska (`/api/stop-all-task`).

Opcjonalne (UI serwisowe):
- odczyt listy AGV,
- ustawianie filled/empty, lock/unlock, tagow,
- usuwanie taskow.

### 10.4 Zachowanie blokow RDS (na podstawie kodu)

`GetIdleSiteBp`:
- blokuje tylko gdy `lock = true`,
- `locked` to filtr stanu (nie blokada),
- petluje bez limitu retry, czeka `retryPeriod` ms (domyslnie ~1000ms).

`CSelectAgvBp`:
- petluje bez timeoutu do momentu przydzielenia AGV,
- brak AGV = task moze wisiec.

`CAgvOperationBp`:
- `targetSiteLabel` musi byc niepuste,
- jesli istnieje worksite o tym `siteId` i jest disabled -> blad,
- brak worksite o tym `siteId` nie powoduje bledu (dozwolone dla map labels).

`SetSiteEmptyBp`:
- wymaga istniejacego worksite o `siteId`, inaczej blad,
- ustawia `filled = 0` i czysci `content`.

## 11. Telemetria i logi

Minimalne logi (Etap 0.1):
- start/stop taska, wybrane source, przydzielony AGV, rezultat (OK/ERROR).

Rozszerzone logi/metryki (Etap 1):
- liczba startow/sukcesow/porazek,
- czas wykonania taska,
- powody terminacji (brak source, brak AGV, blad ForkLoad/ForkUnload).

## 12. Pliki i lokalizacja

- Task (.task): `klienci/sanden/tasks/sanden_bring_empty_p1.task`
- Spec: `klienci/sanden/tasks/sanden_bring_empty_p1_spec.md`
- Skrypty (jesli beda potrzebne w przyszlosci):
  `klienci/sanden/scripts/*.js`

## 13. Testy akceptacyjne (Etap 0.1)

- Przy aktywnym `A1_P1_BRING` i dostepnym `PICK_EMPTY_A1_*` task startuje.
- Po ForkLoad `PICK_EMPTY_A1_*` jest czyszczony (SetSiteEmpty).
- Po ForkUnload `A1_P1_BRING` jest czyszczony.
- Przy braku `PICK_EMPTY_A1_*` task nie startuje.
- Bledny `PICK_EMPTY_A1_*` (disabled) blokuje start.

## 14. Otwarte decyzje

- Potwierdz nazwe docelowego site label dla P1 (domyslnie `A1_P1_BRING`).
- Potwierdz nazwy pre-pick / pre-drop (np. `LM_PICK_A1`, `LM_P1`).
- Potwierdz wartosci `PICK_KEY_ROUTE` i `PRIORITY` w konfiguracji RDS.
