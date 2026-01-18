# Sanden Etap 1 - Task put-down do alejek odrzuconych (A1)

## Etapy wdrozenia

- Etap 0.1: task uruchamiany manualnie (API/GUI), brak auto-kill.
- Etap 1: jw., opcjonalny timeout na brak dropa i/lub lock dropa.

## Zakres etapow (uszczegolowienia)

- Auto-start: wylaczony w obu etapach (manualne uruchomienie).
- Request/source: brak (task nie korzysta z requestu ani source).
- `SetSiteFilledBp` (drop): wlaczone po ForkUnload.
- `SetSiteEmptyBp`: nieuzywane.
- Pre-drop: opcjonalny (konfigurowalny).
- Wybor dropa: zawsze zalezny od aktualnego stanu (level-trigger).
- Bufory odrzutow: osobne grupy, nieuzywane przez inne taski w Etapie 0.1.

## 1. Cel

Zadanie `sanden_put_down` odklada ladunek znajdujacy sie na widlach AGV
do pierwszego wolnego miejsca w alejkach odrzuconych opakowan
(puste lub pelne). Task jest uruchamiany manualnie (serwisowo)
w sytuacjach awaryjnych lub gdy potrzebny jest kontrolowany zrzut ladunku.

Specyfikacja jest przygotowana na podstawie:
- `rds/nowy-styl-rds/doc/wind-task-format.md`
- `rds/nowy-styl-rds/script/woj.js` (skrypt wyboru dropa)
- `klienci/nowy-styl/robot-task-manager` (put-down)
- `klienci/sanden/tasks/sanden_remove_empty_p1_spec.md` (logika drop)

## 2. Worksite i grupy (RDS)

### 2.1 Alejka odrzuconych pustych opakowan (drop)

Grupa worksite: `PUT_REJECT_EMPTY_A1`
- `PUT_REJECT_EMPTY_A1_1`
- `PUT_REJECT_EMPTY_A1_2`
- `PUT_REJECT_EMPTY_A1_3`
- `PUT_REJECT_EMPTY_A1_4`
- `PUT_REJECT_EMPTY_A1_5`
- `PUT_REJECT_EMPTY_A1_6`

Znaczenie:
- `filled = 0` oznacza wolne miejsce,
- `filled = 1` oznacza zajete miejsce.

### 2.2 Alejka odrzuconych pelnych opakowan (drop)

Grupa worksite: `PUT_REJECT_FULL_A1`
- `PUT_REJECT_FULL_A1_1`
- `PUT_REJECT_FULL_A1_2`
- `PUT_REJECT_FULL_A1_3`
- `PUT_REJECT_FULL_A1_4`
- `PUT_REJECT_FULL_A1_5`
- `PUT_REJECT_FULL_A1_6`

Znaczenie:
- `filled = 0` oznacza wolne miejsce,
- `filled = 1` oznacza zajete miejsce.

Uwaga:
- liczba miejsc jest konfigurowalna, powyzsze to domyslny zakres (1..6).
- w Etapie 0.1 dotyczy linii A1; A2 bedzie dodana pozniej.

### 2.3 Punkt podjazdu (pre-drop)

Opcjonalnie:
- Pre-drop: punkt buforowy przed alejkami odrzutow (np. `LM_REJECT_A1`).

Nazwy do potwierdzenia w konfiguracji RDS.

### 2.4 Parametry konfiguracyjne taska (domyslne)

Etap 0.1 (domyslne):
- `PRIORITY = "0"` (opcjonalnie)
- `PRE_DROP_SITE = ""` (pomijamy blok pre-drop)
- `DROP_ORDERING = "ASC"` (kolejnosc miejsc w alejkach)

Etap 1 (domyslne):
- `PRIORITY = "0"`
- `PRE_DROP_SITE = "LM_REJECT_A1"`
- `DROP_ORDERING = "ASC"`

Parametry ForkUnload (jak w innych taskach Sanden):
- `var_start_height = ""`
- `var_end_height = 0.085`
- `nextLocation = null`

Reguly:
- jesli `PRE_DROP_SITE` jest puste, blok pre-drop jest pomijany,
- jesli `PRIORITY` jest puste, pole nie jest ustawiane w `CSelectAgvBp`.

### 2.5 Inputy taska (RDS)

Wymagane:
- `agv` (string) - identyfikator AGV (wymusza wybor konkretnego robota),
- `dropSelectorArgs` (string, JSON) - argumenty dla skryptu wyboru dropa.

Przykladowe `dropSelectorArgs`:
- dla odrzutu pustych:
  `{"groupNames":["PUT_REJECT_EMPTY_A1"],"ordering":"ASC","resultField":"dropSite"}`
- dla odrzutu pelnych:
  `{"groupNames":["PUT_REJECT_FULL_A1"],"ordering":"ASC","resultField":"dropSite"}`

## 3. Warunek uruchomienia taska

Task jest uruchamiany manualnie (brak auto-startu).
Rekomendowane warunki przed startem:
- robot ma ladunek (`isLoaded = true`),
- istnieje przynajmniej jeden wolny worksite w docelowej grupie drop.

Uwaga:
- jesli nie ma wolnego miejsca, skrypt dropSelector blokuje task do czasu
  zwolnienia miejsca (robot moze czekac z ladunkiem).

## 4. Wybor miejsca drop (odrzuty)

Wybor drop jest oparty o skrypt RDS (jak w `nowy-styl-rds`):
- `ScriptVariablesBp` z `functionName = setTaskVariables_getNextDropsiteMultipleGroups_Blocking`
- `functionArgs`: `taskInputs.dropSelectorArgs`

Algorytm:
- skrypt zwraca "pierwsze niezakryte" miejsce (ostatnie wolne przed pierwszym zajetym),
- jesli pierwszy element jest zajety/locked/disabled, zwraca `null` i blokuje,
- kolejnosc zalezy od `ordering` i sortowania po `siteId`.

Wymagania:
- kolejnosc `siteId` musi odpowiadac fizycznemu ulozeniu od "wejscia" alejki,
  w przeciwnym razie ustaw `DROP_ORDERING` lub zmien nazwy miejsc.

## 5. Struktura taska (blokowo)

Minimalny przebieg taska:

1) TaskState (pusty status)
   - `TaskStateBp` -> `{ "from": "", "to": "" }`

2) Wybierz AGV (konkretny robot)
   - `CSelectAgvBp` z `vehicle = taskInputs.agv` i `priority = PRIORITY`

3) Wyznacz drop skryptem
   - `ScriptVariablesBp` -> `task.variables.dropSite`

4) TaskState (wypelnij to)
   - `TaskStateBp` -> `{ "from": "", "to": "<task.variables.dropSite>" }`

5) (Opcjonalny) punkt przejazdowy przed drop
   - `CAgvOperationBp` -> `PRE_DROP_SITE` (np. `LM_REJECT_A1`)

6) Rozladunek na drop
   - `CAgvOperationBp` (ForkUnload) na `<task.variables.dropSite>`

7) Oznacz drop jako zajety
   - `SetSiteFilledBp` -> `<task.variables.dropSite>`

## 6. Kryterium sukcesu i obsluga bledow

Kryterium sukcesu:
- ForkUnload + `SetSiteFilledBp` dla drop zakonczone sukcesem.

Kryterium bledu:
- blad dowolnego bloku powoduje task w stanie error/terminate.

Uwaga:
- jesli ForkUnload sie uda, a `SetSiteFilledBp` sie nie uda, wymagane jest
  reczne skorygowanie stanu zajetosci dropa.

## 7. TaskState (format JSON)

Status taska zgodny z robot-task-manager:
```json
{ "from": "", "to": "PUT_REJECT_EMPTY_A1_1" }
```

Aktualizacja TaskState:
- `from` pozostaje puste (brak source),
- po wyborze drop ustaw `to`,
- po rozladunku opcjonalnie wyczysc `to`.

## 8. Task manager (spec)

Wersja bazowa: fork z `klienci/nowy-styl/robot-task-manager`.

Task nie jest uruchamiany automatycznie:
- start przez `/api/robots/:robotId/put-down` lub manualnie w RDS,
- `dropSelectorArgs` przekazujemy w input params taska.

## 9. Wymagania RDS i walidacja

Walidacja wstepna (checklist):
- grupy `PUT_REJECT_EMPTY_A1` i `PUT_REJECT_FULL_A1` istnieja,
- wszystkie `PUT_REJECT_*_A1_*` sa worksite i maja odpowiadajace punkty na mapie,
- brak `disabled` w `PUT_REJECT_*_A1_*`,
- skrypt `setTaskVariables_getNextDropsiteMultipleGroups_Blocking` jest dostepny w RDS (woj.js).

## 10. Pliki i lokalizacja

- Task (.task): `klienci/sanden/tasks/sanden_put_down.task`
- Spec: `klienci/sanden/tasks/sanden_put_down_spec.md`
- Skrypty: `klienci/sanden/scripts/woj.js`

## 11. Testy akceptacyjne (Etap 0.1)

- Po uruchomieniu taska z `dropSelectorArgs` na `PUT_REJECT_EMPTY_A1`
  robot zrzuca ladunek na pierwsze wolne miejsce tej grupy.
- Po uruchomieniu taska z `dropSelectorArgs` na `PUT_REJECT_FULL_A1`
  robot zrzuca ladunek na pierwsze wolne miejsce tej grupy.
- Po ForkUnload docelowy `PUT_REJECT_*_A1_*` jest ustawiony na filled.
- Przy braku wolnych miejsc task czeka (blokuje) na zwolnienie dropa.

## 12. Otwarte decyzje

- Potwierdz nazwy grup `PUT_REJECT_EMPTY_A1` i `PUT_REJECT_FULL_A1`
  oraz ich mapowanie na fizyczne alejki.
- Potwierdz nazwe punktu pre-drop (np. `LM_REJECT_A1`).
- A2: nazwy grup i liczba miejsc dla linii A2.
