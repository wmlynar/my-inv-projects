# Sanden Etap 1 - Task odbioru pustego nosnika z A1 P1

## Etapy wdrozenia

- Etap 0.1: uruchomienie taska bez auto-kill.
- Etap 1: docelowa logika z auto-kill po pustym/locked source oraz po wycofaniu requestu.

## Zakres etapow (uszczegolowienia)

- Auto-kill: Etap 0.1 wylaczony, Etap 1 wlaczony.
- Czyszczenie requestu `A1_P1_REMOVE`: Etap 0.1 i Etap 1 czyscimy po ForkLoad.
- `SetSiteFilledBp` (drop): Etap 0.1 i Etap 1 wlaczone po ForkUnload.
- `SetSiteEmptyBp` (request): Etap 0.1 i Etap 1 wlaczone po ForkLoad.
- Pre-pick / pre-drop: Etap 0.1 wylaczone, Etap 1 opcjonalne.
- Dispatchable i priorytety: Etap 0.1 bez respektowania dispatchable, Etap 1 opcja `respectDispatchableInAutostart`.
- Limit aktywnych taskow: Etap 0.1 stale `targetActiveTasks = 1`, Etap 1 wartosc konfigurowalna.
- Wyzwalanie: zawsze zalezne od aktualnego stanu (level-trigger), bez edge-triggerow.
- Bufor `PUT_FULL_A1` jest wspolny dla taskow odbioru z P1 i P3 w Etapie 0.1
  (w Etapie 1 bufor moze byc wspoldzielony z kolejnymi strumieniami).

## 1. Cel

Zadanie `sanden_remove_empty_p1` odbiera pusty lub niewykorzystany nosnik
z pola P1 linii A1 i dowozi go do bufora zwrotow w magazynie.

Mapowanie na dokument Etap 1 (`sanden_etap_1.md`):
- P1 (A1) odpowiada polu `A1_IN` / `PROD_A1_SUP`,
- strumien S5: `PROD_A1_SUP -> MAG_OUT_COLLECT_TMP`.
W Etapie 0.1 mapujemy bufor `MAG_OUT_COLLECT_TMP` na worksite grupy `PUT_FULL_A1`.

Uwaga (decyzja Etap 0.1):
- nosniki zwracane z P1 sa odkladane do tego samego bufora, co wyroby gotowe z P3
  (wspolny bufor `PUT_FULL_A1`).

Specyfikacja jest przygotowana na podstawie:
- `rds/nowy-styl-rds/doc/wind-task-format.md`
- `rds/nowy-styl-rds/wind-tasks/Task Records.task`
- `klienci/nowy-styl/robot-task-manager` (logika task managera)
- `klienci/sanden/tasks/sanden_bring_empty_p1_spec.md` (konwencje)

Wspolne zachowania RDS:
- `GetIdleSiteBp` i `CSelectAgvBp` petluja bez limitu retry,
- `SetSiteEmptyBp` wymaga istniejacego worksite,
- `CAgvOperationBp` akceptuje map labels bez worksite (o ile nie sa disabled).

## 2. Worksite i grupy (RDS)

### 2.1 Pole zgloszenia (request / source)

- Worksite request: `A1_P1_REMOVE`
- Znaczenie: `filled = 1` oznacza aktywne zgloszenie zabrania pustego nosnika z P1.
- `A1_P1_REMOVE` sluzy rowniez jako punkt pobrania (source) na mapie.

Uwaga:
- nie ma osobnego worksite zajetosci P1; request jest jedynym sygnalem.
- `A1_P1_REMOVE` musi istniec jako worksite (dla `SetSiteEmptyBp`),
  i jako label na mapie (dla `ForkLoad`).

### 2.2 Bufor odbiorow w magazynie (drop)

Docelowy bufor zwrotow to grupa `PUT_FULL_A1`
(wspolny bufor odbiorow, ten sam co dla P3):
- worksite w grupie (przyklad): `PUT_FULL_A1_1..N`,
- `filled = 0` oznacza wolne miejsce,
- `filled = 1` oznacza zajete miejsce.

Uwaga:
- nazwy i liczba miejsc sa konfigurowalne,
- grupa moze byc wspoldzielona przez inne taski (Etap 1).

Sprawnosc z UI bufora:
- nazwy worksite w `PUT_FULL_A1` musza byc zgodne z konfiguracja UI
  bufora pelnych opakowan (tab "Pelne opakowania").
Minimalna lista (Etap 0.1):
- `PUT_FULL_A1_1..6` (domyslnie 6 miejsc, zgodne z UI bufora).

### 2.3 Punkt podjazdu (pre-pick / pre-drop)

Opcjonalnie:
- Pre-pick: punkt przy P1 (np. `LM_P1`),
- Pre-drop: punkt buforowy przed magazynem (np. `LM_OUT_COLLECT`).

Nazwy do potwierdzenia w konfiguracji RDS.

### 2.4 Parametry konfiguracyjne taska (domyslne)

Etap 0.1 (domyslne):
- `PICK_KEY_ROUTE = "LM_P1"`
- `PRIORITY = "0"` (opcjonalnie)
- `PRE_PICK_SITE = ""`
- `PRE_DROP_SITE = ""`
- `DROP_GROUP = "PUT_FULL_A1"` (wspolne z P3)
- `DROP_ORDERING = "ASC"` (kolejnosc miejsc w buforze)
- `GET_IDLE_LOCK = false`
- `GET_IDLE_RETRY_PERIOD = 1000` (ms)
- `GET_IDLE_ORDER_DESC = false`

Etap 1 (domyslne):
- `PICK_KEY_ROUTE = "LM_P1"`
- `PRIORITY = "0"`
- `PRE_PICK_SITE = "LM_P1"`
- `PRE_DROP_SITE = "LM_OUT_COLLECT"`
- `DROP_GROUP = "PUT_FULL_A1"` (wspolne z P3)
- `DROP_ORDERING = "ASC"`
- `GET_IDLE_LOCK = true` (opcjonalnie)
- `GET_IDLE_RETRY_PERIOD = 1000` (ms)
- `GET_IDLE_ORDER_DESC = false`

Mapowanie parametrow do `GetIdleSiteBp`:
- `DROP_GROUP` -> `groupName`
- `GET_IDLE_LOCK` -> `lock`
- `GET_IDLE_RETRY_PERIOD` -> `retryPeriod`
- `GET_IDLE_ORDER_DESC` -> `orderDesc`
- `filled = false` (szukamy wolnego miejsca)
Mapowanie parametrow do `CSelectAgvBp`:
- `PICK_KEY_ROUTE` -> `keyRoute`
- `PRIORITY` -> `priority`
Uwaga:
- przy wyborze drop przez skrypt `GET_IDLE_*` nie sa uzywane.

## 3. Warunek uruchomienia taska

Task manager uruchamia `sanden_remove_empty_p1` tylko gdy:
- `A1_P1_REMOVE` jest `filled = 1`, `disabled = 0`, `locked = 0`,
- istnieje przynajmniej jeden wolny worksite w grupie `PUT_FULL_A1`
  z `filled = 0`, `locked = 0`, `disabled = 0`,
- nie ma aktywnego taska `sanden_remove_empty_p1` (targetActiveTasks = 1).

Konfiguracja task managera:
- `requestWorksite = A1_P1_REMOVE`,
- `dropGroup = PUT_FULL_A1`,
- `autoStartCooldownMs` zgodnie z `sanden-task-manager` (domyslnie 1500),
- sprawdzanie `disabled` na raw `/api/work-sites/sites`.
Uwaga:
- `dropFilled = false` (wybor wolnego dropa), zgodnie z `sanden-task-manager` (Etap 1).

Model wyzwalania:
- level-trigger, bez edge-triggerow,
- jesli request pozostaje filled po bledzie, task moze zostac uruchomiony ponownie.

Etap 0.1:
- brak auto-kill po starcie (task nie jest ubijany na podstawie source/request).
Uwaga (Etap 0.1):
- cofniecie `A1_P1_REMOVE` po starcie taska jest ignorowane (task kontynuuje),
  bo request jest czyszczony po ForkLoad.
- jesli `getWorkSiteListRaw` sie nie powiedzie, auto-start jest blokowany
  (fail-safe z `sanden-task-manager`).

## 4. Wybor miejsca drop (bufor zwrotow)

Wybor drop jest oparty o skrypt RDS (jak w `nowy-styl-rds`):
- `ScriptVariablesBp` z `functionName = setTaskVariables_getNextDropsiteMultipleGroups_Blocking`
- `functionArgs`: `{"groupNames":["PUT_FULL_A1"], "ordering":"ASC", "resultField":"dropSite"}`

Algorytm:
- skrypt zwraca "pierwsze niezakryte" miejsce (ostatnie wolne przed pierwszym zajetym),
- jesli pierwszy element jest zajety/locked/disabled, zwraca `null` i blokuje,
- kolejnosc zalezy od `ordering` i sortowania po `siteId`.

Wymagania:
- kolejnosc `siteId` musi odpowiadac fizycznemu ulozeniu od "wejscia" bufora,
  w przeciwnym razie ustaw `DROP_ORDERING` lub zmien nazwy miejsc.

Uwaga o waiting z ladunkiem:
- skrypt blokuje do czasu pojawienia sie wolnego miejsca;
  robot moze zatrzymac sie z ladunkiem do czasu zwolnienia bufora.

Race condition (drop znika po starcie taska):
- akceptujemy czekanie z ladunkiem (Etap 0.1),
- Etap 1: mozna dodac timeout i terminate + ponowienie taska.

Uwaga o lock/unlock:
- jesli `GET_IDLE_LOCK = true`, konieczny jest jawny unlock po sukcesie,
  bo `releaseSites` zwalnia lock tylko przy stop/end_error/manual_end.

Uwaga o wspoldzieleniu bufora:
- w Etapie 0.1 `GET_IDLE_LOCK=false`, wiec dwa rownolegle taski moga wybrac
  to samo miejsce drop; procedura operacyjna powinna unikac rownoleglych requestow,
  a w Etapie 1 zalecane jest lockowanie dropa.

## 5. Struktura taska (blokowo)

Minimalny przebieg taska:

1) TaskState (pusty status)
   - `TaskStateBp` -> `{ "from": "", "to": "" }`

2) TaskState (wypelnij from)
   - `TaskStateBp` -> `{ "from": "A1_P1_REMOVE", "to": "" }`

3) Wybierz AGV + podjazd do P1
   - `CSelectAgvBp` (keyRoute = `PICK_KEY_ROUTE`, priority = `PRIORITY`)
   - `CAgvOperationBp` na `PRE_PICK_SITE` (opcjonalnie)
   - `CAgvOperationBp` (ForkLoad) na `A1_P1_REMOVE`

4) Wyczysc request po ForkLoad
   - `SetSiteEmptyBp` -> `A1_P1_REMOVE`

5) TaskState (wyczysc from po SetSiteEmpty)
   - `TaskStateBp` -> `{ "from": "", "to": "" }`

6) Wyznacz drop skryptem (wspolne z P3)
   - `ScriptVariablesBp` -> `task.variables.dropSite`

7) TaskState (wypelnij to)
   - `TaskStateBp` -> `{ "from": "", "to": "<task.variables.dropSite>" }`

8) (Opcjonalny) punkt przejazdowy przed drop
   - `CAgvOperationBp` -> `PRE_DROP_SITE` (np. LM_OUT_COLLECT)

9) Rozladunek na drop
   - `CAgvOperationBp` (ForkUnload) na `<task.variables.dropSite>`

10) Oznacz drop jako zajety
   - `SetSiteFilledBp` -> `<task.variables.dropSite>`

Parametry ForkLoad/ForkUnload:
- skopiowane z `nowy_styl_task` (jak w `sanden_bring_empty_p1_spec.md`).

Uwaga o TaskState.to:
- w taskach remove `to` wskazuje realny worksite drop (`PUT_FULL_A1_*`),
  aby put-down mogl ustawic drop jako filled.
To rozni sie od taska bring, gdzie `to` wskazuje worksite requestu.

## 6. Kryterium sukcesu i obsluga bledow

Kryterium sukcesu:
- ForkLoad + `SetSiteEmptyBp` requestu + ForkUnload + `SetSiteFilledBp` drop.

Kryterium bledu:
- blad dowolnego bloku powoduje task w stanie error/terminate.

Uwaga (Etap 0.1):
- po udanym ForkLoad request jest czyszczony; jesli potem dojdzie do bledu,
  request nie zostanie automatycznie przywrocony.
- operator powinien zweryfikowac stan fizyczny i ewentualnie zglosic ponownie.
- jesli ForkLoad sie nie powiedzie, request pozostaje filled i task manager
  moze uruchomic task ponownie (level-trigger).

Blad `SetSiteFilledBp` na drop:
- Etap 0.1: blad konczy task i wymaga recznej korekty stanu bufora
  (oznaczenie miejsca jako zajete / wolne).

Put-down:
- jesli task zostanie przerwany przed ustawieniem `to`, put-down nie ma
  docelowego worksite; operator powinien recznie zdecydowac o miejscu zrzutu.

## 7. TaskState (format JSON)

Status taska zgodny z robot-task-manager:
```json
{ "from": "A1_P1_REMOVE", "to": "PUT_FULL_A1_1" }
```

Aktualizacja TaskState:
- ustaw `from` przed ForkLoad,
- po `SetSiteEmptyBp` wyczysc `from`,
- po wyborze drop ustaw `to`,
- po rozladunku opcjonalnie wyczysc `to`.

## 8. Task manager (spec)

Wersja bazowa: fork z `klienci/nowy-styl/robot-task-manager`.

Warunek auto-start:
- `A1_P1_REMOVE` filled i enabled,
- istnieje wolny drop w `PUT_FULL_A1`,
- `targetActiveTasks = 1`.

Wspoldzielenie bufora z P3 (Etap 1):
- limity aktywnych taskow sa per-task,
- w razie konfliktu o drop decyduje `GetIdleSiteBp` (lock opcjonalny).

Etap 0.1:
- `enableAutoKillOnEmptySource = false`.

## 9. Wymagania RDS i walidacja

Walidacja wstepna (checklist):
- istnieje worksite `A1_P1_REMOVE` i jest enabled,
- `A1_P1_REMOVE` istnieje na mapie (label dla ForkLoad),
- grupa `PUT_FULL_A1` istnieje,
- wszystkie `PUT_FULL_A1_*` sa worksite i map points,
- brak disabled w `PUT_FULL_A1_*`,
- skrypt `setTaskVariables_getNextDropsiteMultipleGroups_Blocking` jest dostepny w RDS (woj.js).
Opcjonalnie:
- ustawienie `content`/tagow na dropie (np. "RETURN_P1") - tylko jesli wymagane przez magazyn.

Walidacja pre-pick/pre-drop:
- jesli `PRE_PICK_SITE`/`PRE_DROP_SITE` sa ustawione, musza istniec jako punkty na mapie.

Zwalnianie bufora:
- miejsca w `PUT_FULL_A1` sa zwalniane przez magazyniera
  (UI bufora lub procedura reczna), nie przez task manager.

## 10. Pliki i lokalizacja

- Task (.task): `klienci/sanden/tasks/sanden_remove_empty_p1.task`
- Spec: `klienci/sanden/tasks/sanden_remove_empty_p1_spec.md`
- Skrypty (jesli beda potrzebne): `klienci/sanden/scripts/*.js`

## 11. Testy akceptacyjne (Etap 0.1)

- Przy aktywnym `A1_P1_REMOVE` i wolnym `PUT_FULL_A1_*` task startuje.
- Po ForkLoad `A1_P1_REMOVE` jest czyszczony.
- Po ForkUnload docelowy `PUT_FULL_A1_*` jest ustawiony na filled.
- Przy braku wolnych `PUT_FULL_A1_*` task nie startuje.
- Bledny `PUT_FULL_A1_*` (disabled) blokuje start.

## 12. Otwarte decyzje

- Potwierdz, czy bufor zwrotow z P1 ma byc na stale wspolny z P3
  (`PUT_FULL_A1`) czy docelowo wydzielony.
- Potwierdz nazwy pre-pick / pre-drop.
- Potwierdz mapowanie P1 <-> `A1_IN` / `PROD_A1_SUP` w RDS.
- Etap 1: czy drop ma byc lockowany (`GET_IDLE_LOCK=true`) i czy wymagamy
  jawnego unlock po sukcesie.
- Czy potrzebujemy wariantu A2 (A2_P1_REMOVE -> PUT_FULL_A1) w Etapie 1.
