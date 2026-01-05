# Format wind task (.task) w RDS

Ten dokument opisuje format eksportu wind taskow na podstawie pliku `nowy-styl-rds/wind-tasks/Task Records.task` oraz sposob przekazywania logiki do skryptow z `nowy-styl-rds/script/*.js`. Mimo potocznej nazwy "wind task XML", eksport jest w JSON (plik z rozszerzeniem `.task`).

## 1. Plik .task (warstwa zewnetrzna)

Plik `.task` to JSON array obiektow typu WindTaskDef/WindTaskDefResp:

```
[
  {
    "id": "uuid",
    "label": "task_label",
    "detail": "{...}",             // JSON jako string (z escapowaniem)
    "version": 1,
    "status": 0,
    "ifEnable": 0,
    "periodicTask": 0,
    "period": 1000,
    "delay": 3000,
    "remark": "",
    "templateName": "userTemplate",
    "templateDescription": "User-owned template",
    "windcategoryId": 0,
    "releaseSites": false,         // opcjonalne w eksporcie
    "projectId": "project-id",      // opcjonalne w eksporcie
    "createDate": "YYYY-MM-DD ..."  // opcjonalne w eksporcie
  }
]
```

Najwazniejsze pole to `detail`, ktore zawiera kompletna definicje logiki wind taska jako JSON string.

## 2. Pole detail (definicja logiki)

`detail` to JSON w formacie:

```
{
  "inputParams": [
    {
      "name": "paramName",
      "type": "String|Boolean|JSONObject|JSONArray|Double|Long",
      "label": "UI label",
      "required": false,
      "defaultValue": "DEFAULT"
    }
  ],
  "outputParams": [],
  "rootBlock": { ...blok... }
}
```

Znaczenie:
- `inputParams` -> globalne parametry zadania. Sa mapowane do `taskInputs` i dostepne w wyrazeniach.
- `outputParams` -> zwykle puste, pozostaje jako miejsce na deklaracje wyjsc.
- `rootBlock` -> korzen grafu blokow.

## 3. Struktura bloku (rootBlock i dzieci)

Kazdy blok ma postac:

```
{
  "id": 1,
  "name": "b1",
  "blockType": "CSelectAgvBp",
  "children": { "default": [ ... ] },
  "inputParams": { ... },
  "refTaskDefId": "",
  "selected": false,
  "expanded": true,

  // opcjonalne (nieobowiazkowe) pola:
  "remark": "",
  "maxTimeOut": 0,
  "errorMsg": ""
}
```

Kluczowe zasady:
- `blockType` to nazwa executora (np. `CSelectAgvBp`, `ScriptVariablesBp`).
- `name` jest uzywany w wyrazeniach do odwolania sie do wynikow bloku: `blocks.<name>.<pole>`.
- `children` to mapa `nazwa_galezi -> lista blokow`. Dla zwyklego przeplywu uzywa sie `children.default` i kolejnosc w tablicy jest kolejnoscia wykonania.
- Dla blokow typu `TryCatchBp`, `IfElseBp`, `IfElseIfBp` dzieci sa przekazywane jako cala mapa galezi (nie tylko `default`).
- `refTaskDefId` jest wykorzystywany przez bloki typu `SubTask*` do wskazania innego wind taska.

## 4. inputParams w blokach

`inputParams` to mapa nazwa_parametru -> obiekt:

```
"inputParams": {
  "targetSiteLabel": { "type": "Expression", "value": "blocks.b1.siteId", "required": true },
  "scriptName":      { "type": "Simple",     "value": "ForkLoad" }
}
```

Typy:
- `Simple` -> wartosc literalna (string/number/bool/null). Wewnetrznie zapisywana jako string.
- `Expression` -> wyrazenie MVEL wykonywane w trakcie taska.
- `Key-Value` -> JSON array obiektow; kazdy obiekt jest czytany w kolejnosci pol jako: `[key, value, type]`. Jesli `type == "object"`, to `value` jest parsowane jako JSON. Gdy klucz lub wartosc zaczyna sie od `=`, to reszta jest liczona jako wyrazenie MVEL.

Puste lub biale `value` -> `null`.

## 5. Bloki sterowania przeplywem (flow)

Ponizej sa bloki, ktore steruja przebiegiem i maja specjalna strukture `children` lub dodatkowe pola.

### 5.1 SerialFlowBp (sekwencyjnie)

Wykonuje `children.default` po kolei. Nie ma wejsc.

```
{
  "blockType": "SerialFlowBp",
  "children": { "default": [ ... ] },
  "inputParams": {}
}
```

### 5.2 ParallelFlowBp (rownolegle)

Uruchamia wszystkie bloki z `children.default` rownolegle.

```
{
  "blockType": "ParallelFlowBp",
  "children": { "default": [ ... ] },
  "inputParams": {}
}
```

### 5.3 IfBp

Wykonuje `children.default` tylko gdy `condition == true`.

```
{
  "blockType": "IfBp",
  "inputParams": {
    "condition": { "type": "Expression", "value": "blocks.b1.siteId != null" }
  },
  "children": { "default": [ ... ] }
}
```

### 5.4 IfElseBp

Wykonuje jedna z galezi `if` albo `else`.

```
{
  "blockType": "IfElseBp",
  "inputParams": {
    "conditionIf": { "type": "Expression", "value": "task.variables.dropSite != null" }
  },
  "children": {
    "if":   [ ... ],
    "else": [ ... ]
  }
}
```

### 5.5 IfElseIfBp

Wykonuje `if`, potem `else_if`, a jesli oba falsz, to `else`.

```
{
  "blockType": "IfElseIfBp",
  "inputParams": {
    "conditionIf":     { "type": "Expression", "value": "blocks.b1.siteId == 'A1'" },
    "conditionElseIf": { "type": "Expression", "value": "blocks.b1.siteId == 'A2'" }
  },
  "children": {
    "if":      [ ... ],
    "else_if": [ ... ],
    "else":    [ ... ]
  }
}
```

### 5.6 TryCatchBp

`children` ma dwie galezie: `try` i `catch`.

```
{
  "blockType": "TryCatchBp",
  "inputParams": {
    "swallowError": { "type": "Simple", "value": true },
    "ignoreAbort":  { "type": "Simple", "value": false }
  },
  "children": {
    "try":   [ ... ],
    "catch": [ ... ]
  }
}
```

Znaczenie:
- `swallowError=true` -> po catch nie propaguje bledu.
- `swallowError=false` -> po catch ponownie rzuca blad.
- `ignoreAbort=true` -> nie uruchamia galezi `catch`.

### 5.7 RepeatNumBp

Petla N razy, sekwencyjnie. Ustawia `blocks.<name>.index` (1..N).

```
{
  "blockType": "RepeatNumBp",
  "inputParams": {
    "num": { "type": "Simple", "value": "3" }
  },
  "children": { "default": [ ... ] }
}
```

Ograniczenie: `num` max 1000.

### 5.8 ParallelRepeatNBp

Uruchamia `children.default` N razy rownolegle. Nie ustawia indeksu petli.

```
{
  "blockType": "ParallelRepeatNBp",
  "inputParams": {
    "num": { "type": "Simple", "value": "5" }
  },
  "children": { "default": [ ... ] }
}
```

Ograniczenie: `num` max 100.

### 5.9 IterateListBp

Iteruje po liscie (JSONArray). Ustawia:
- `blocks.<name>.index` (0..size-1)
- `blocks.<name>.size`
- `blocks.<name>.item`

```
{
  "blockType": "IterateListBp",
  "inputParams": {
    "list": { "type": "Expression", "value": "taskInputs.items" }
  },
  "children": { "default": [ ... ] }
}
```

### 5.10 WhileBp

Wykonuje petle dopoki `loopCondition == true`. Warunek jest sprawdzany przed kazda iteracja. `retryPeriod` to opoznienie (ms) miedzy iteracjami.

```
{
  "blockType": "WhileBp",
  "inputParams": {
    "loopCondition":   { "type": "Expression", "value": "task.variables.keepRunning == true" },
    "retryPeriod":     { "type": "Simple", "value": "1000" },
    "runOnce":         { "type": "Simple", "value": false },
    "printContinuously": { "type": "Simple", "value": false }
  },
  "children": { "default": [ ... ] }
}
```

`runOnce=true` wykonuje `children.default` raz przed pierwszym sprawdzeniem warunku.

## 6. Reguly generowania taskow (AI checklist)

- `id` bloku: liczba calkowita, unikatowa w ramach taska; `name` tez unikatowy (zalecane `b1`, `b2`, ...).
- `children.default` to sekwencja wykonania; dla blokow z galeziami uzywaj mapy `children` zgodnie z typem bloku (`try/catch`, `if/else`, `if/else_if/else`).
- `inputParams.<param>` zawsze ma `type` i `value`; `required` jest informacja dla UI, nie waliduje runtime.
- Wartosci liczbowe przekazuj jako string (np. `"1000"`) dla spojnosci.
- `blocks.<name>` jest dostepne dopiero po wykonaniu bloku; odwolania musza byc w pozniejszych blokach.
- `task.variables` ustawiaj przez `ScriptVariablesBp` albo `SetTaskVariableBp`.
- `SubTaskBp`: `blockType` ma format `SubTask::<taskDefId>`. `inputParams` moze zawierac `taskRecordId` i `ifAsync`; pozostale klucze sa przekazywane do podtaska jako `taskInputs`.
- `WhileBp` musi miec warunek zakonczenia (np. modyfikacja `task.variables`), inaczej petla trwa w nieskonczonosc.
- `maxTimeOut` i `errorMsg` sa polami ogolnymi bloku; nie wszystkie bloki je respektuja, ale warto je wypelniac dla diagnostyki.

## 7. Kontekst wyrazen (MVEL)

W `Expression` dostepne sa zmienne:
- `taskInputs` -> mapa globalnych inputParams z `detail.inputParams` (np. `taskInputs.orderId`).
- `blocks` -> wyniki blokow po nazwie (np. `blocks.b1.siteId`).
- `task` -> dane o tasku, m.in.:
  - `task.id`
  - `task.defLabel`
  - `task.createdOn`
  - `task.status`
  - `task.taskRecordId`
  - `task.priority`
  - `task.variables` (dynamiczne zmienne)
- `StringUtils` -> helper dostepny w MVEL.

Przyklad:
```
"value": "\"{\\\"from\\\":\\\"\" + blocks.b1.siteId + \"\\\",\\\"to\\\":\\\"\\\"}\""
```

## 8. Skrypty i przekazywanie logiki

Wind taski moga wywolywac skrypty przez bloki:
- `ScriptBp`
- `ScriptVariablesBp`

Wejscia:
- `functionName` -> nazwa funkcji JS.
- `functionArgs` -> dane przekazywane do skryptu.

Wywolanie:
- RDS wywoluje funkcje JS z jednym argumentem (string JSON):
  ```
  {"eventData": <functionArgs>, "taskId": "...", "taskRecord": {...}, "blockVo": {...}}
  ```
- W JS typowy wzorzec:
  ```
  function myFunc(param) {
    var event = JSON.parse(param).eventData;
    ...
  }
  ```

Kontrakt zwracania:
- Funkcja JS musi zwrocic obiekt z polem `result` (string).
- RDS bierze `result` jako string zwrotny.
- `ScriptBp` i `ScriptVariablesBp` oczekuja, ze `result` to JSON string (np. `{"dropSite":"LM6"}`), ktory jest parsowany i laczony z `task.variables`.

Skrypty z eksportu sa w `nowy-styl-rds/script/*.js`. Przyklady:
- `log(param)` -> logowanie.
- `setTaskVariables_getNextDropsiteMultipleGroups_Blocking(param)` -> zwraca `{ result: "{\"dropSite\":\"...\"}" }` i ustawia `task.variables.dropSite`.

## 9. Katalog blokow (parametry i wyniki)

Ponizej lista blokow dostepnych w tej wersji RDS (na podstawie kodu runtime). Kolumny:
- `inputParams keys` -> klucze, ktore blok czyta z `inputParams`.
- `outputs in blocks.<name>` -> klucze zapisywane do `blocks.<name>`, dostepne w `Expression`.
- `Opis` -> krotki opis dzialania bloku.

Uwagi:
- `ScriptBp` i `ScriptVariablesBp` nie ustawiaja `blocks.<name>`; zwracany JSON z `result` jest scalany do `task.variables`.
- `SetTaskVariableBp` ustawia `task.variables`.
- `SubTaskBp` przyjmuje dodatkowe klucze (poza `taskRecordId` i `ifAsync`) i przekazuje je do podtaska jako `taskInputs`.
- `SkipToComponent` ustawia skok do bloku o `id` podanym w `skipComponentId`.
- `RootBp` uzywaj tylko jako `rootBlock` (nie jako child).

| BlockType | inputParams keys | outputs in blocks.<name> | Opis |
| --- | --- | --- | --- |
| BatchSettingSiteBp | siteIds, groupNames, filled, content, type | - | Ustawia pola worksite dla wielu siteIds. |
| BreakBp | - | - | Przerywa petle (While/Repeat/Iterate). |
| CAgcChangeDestinationBp | isEndAction, targetSiteLabel, postAction, goodsId, scriptName, max_speed, max_wspeed, max_acc, max_wacc, spin | noticeFailed, containerName | Zmienia docelowy punkt dla aktywnego zlecenia AGV. |
| CAgvAreasToAreasBp | fromBinAreas, toBinAreas, group, label, vehicle | - | Zleca transport miedzy obszarami (fromBinAreas -> toBinAreas). |
| CAgvMonitorOperationBp | blockId | containerName, noticeFailed | Monitoruje operacje AGV po blockId i zwraca wynik. |
| CAgvOperationBp | isEndAction, targetSiteLabel, postAction, goodsId, scriptName, max_speed, max_wspeed, max_acc, max_wacc, spin, adjustInfo | containerName, noticeFailed | Wysyla zlecenie AGV do targetSiteLabel i monitoruje wykonanie. |
| CAgvSendOperationBp | isEndAction, targetSiteLabel, postAction, goodsId, scriptName, max_speed, max_wspeed, max_acc, max_wacc, spin, adjustInfo | blockId | Wysyla zlecenie AGV i zwraca blockId bez pelnego monitoringu. |
| CSelectAgvBp | priority, vehicle, tag, group, keyRoute, keyTask, prePointRedo, mapfPriority, keyGoodsId, loadBlockCount | selectedAgvId | Wybiera AGV wg kryteriow i uruchamia children w jego kontekscie. |
| CacheDataBp | key, value | - | Zapisuje wartosc do globalnego cache. |
| CallLiftBp | oprType, pickFloorArea, putFloorArea, liftName, liftGroupNameForPut, liftGroupNameForPick, liftGroupNameForPre, liftRow, liftLine | liftSite, preSite | Wolanie windy i wyznaczenie stanowisk (liftSite, preSite). |
| CheckTaskRecordIdIsExistBp | taskRecordId | taskRecordIdIsExist | Sprawdza, czy taskRecordId istnieje. |
| ClearCacheDataBp | key | codeInfo | Usuwa wpis z cache. |
| CombinedOrderBp | fromLoc, toLoc, vehicle, group, goodsId, loadPostAction, unloadPostAction, tag, flag | noticeFailed, agvId, containerName, noticeFinish | Wysyla zlecenie zaladuj/rozladuj (combined) i monitoruje. |
| CreateUuidBp | - | createUuid | Generuje UUID i zapisuje w outputs. |
| CurrentTimeStampBp | - | currentTimeStamp | Zwraca timestamp (ms) teraz. |
| DelayBp | timeMillis | - | Wstrzymuje wykonanie na czas. |
| DistributeBp | fromLoc, toLocList, returnLoc, group, label, vehicle, loadPostAction, unloadPostActionList, returnPostAction, ordered, scriptName | noticeFinish, noticeFailed, agvId | Wysyla zlecenie rozdzialu na wiele celow i monitoruje. |
| FinsReadBp | ip, port, area, finsIoAddr, bitOffset, dataType, expectValue, retry, retryInterval | finsValue | Odczytuje dane z PLC Omron FINS. |
| FinsWriteBp | ip, port, area, finsIoAddr, bitOffset, dataType, value | - | Zapisuje dane do PLC Omron FINS. |
| GetBatteryLevelBp | vehicle | batteryLevel | Pobiera poziom baterii AGV. |
| GetBinTaskInfoBp | agvId, retry, retryTimes, retryInterval, targetKey | response | Pobiera informacje o zadaniu bin/pojemniku. |
| GetBp | url, header, retry, retryTimes, retryInterval | response | HTTP GET i zapis response. |
| GetCacheDataBp | key | value | Odczytuje wartosc z cache. |
| GetIdleCrowdedSiteBp | filled, groupName, retryPeriod, lock, retry, content, retryNum | siteId | Wyszukuje wolny site wg warunkow z retry. |
| GetIdleSiteBp | siteId, content, filled, type, groupName, lock, retryPeriod, locked, ifFair, orderDesc | siteId | Wyszukuje wolny site wg warunkow. |
| GetLockedSitesByTaskRecordIdBp | taskRecordId | lockedSiteIdList | Pobiera liste siteId zablokowanych przez taskRecordId. |
| GetPGVCodeBp | vehicle | codeInfo | Odczytuje kod z czujnika PGV/QR AGV. |
| GetSiteAttrBp | siteId, attrName | attrValue | Odczytuje atrybut worksite. |
| GetTaskInputParamsByTaskRecordAndKeyBp | inputParamsKey, taskRecordId | inputParamValue | Pobiera inputParam z taskRecord po kluczu. |
| GetTaskRecordBp | taskRecordId | taskRecord | Pobiera taskRecord po id. |
| GetTaskRecordByOutOrderIdBp | outOrderId | taskRecordIdList | Pobiera taskRecordId po outOrderId. |
| IfBp | condition | - | Warunek IF; uruchamia children gdy condition true. |
| IfElseBp | conditionIf | - | IF/ELSE dla conditionIf. |
| IfElseIfBp | conditionIf, conditionElseIf | - | IF/ELSE IF/ELSE dla wielu warunkow. |
| IterateListBp | list | size, index, item | Iteruje po liscie; ustawia size/index/item. |
| JdbcExecuteBp | sql | - | Wykonuje SQL (bez zwrotu resultSet). |
| JdbcQueryBp | sql | resultSet | Wykonuje SQL i zwraca resultSet. |
| MailBp | toAddresses, subject, content | - | Wysyla e-mail. |
| MarkTaskEndBp | - | - | Oznacza zakonczenie taska w logu/rekordzie. |
| MarkTaskStartBp | - | - | Oznacza start taska w logu/rekordzie. |
| Md5EncryptionForStringBp | string | hexValue | Wylicza MD5 z podanego stringa. |
| MelsecReadBp | ip, port, type, address, length, expectValue, retry, retryInterval | melsecValue | Odczytuje dane z PLC Mitsubishi MELSEC. |
| MelsecWriteBp | ip, port, type, address, newValue | - | Zapisuje dane do PLC Mitsubishi MELSEC. |
| MockTimeCostBp | timeMillis | - | Symuluje czas wykonania (sleep + log). |
| ModbusBatchReadHoldingRegisterBp | ipModbusHost, ipModbusPort, ipRegisterOffset, ipSlaveId, ipLength | modbusValue | Odczytuje wiele rejestrow holding (Modbus). |
| ModbusBatchReadInputRegisterBp | ipModbusHost, ipModbusPort, ipRegisterOffset, ipSlaveId, ipLength | modbusValue | Odczytuje wiele rejestrow input (Modbus). |
| ModbusBatchReadSingleCoilBp | ipModbusHost, ipModbusPort, ipRegisterOffset, ipSlaveId, ipLength | modbusValue | Odczytuje wiele coil (Modbus). |
| ModbusBatchReadSingleInputBp | ipModbusHost, ipModbusPort, ipRegisterOffset, ipSlaveId, ipLength | modbusValue | Odczytuje wiele discrete input (Modbus). |
| ModbusBatchSetCoilBp | ipModbusHost, ipModbusPort, ipCoilAddress, ipSlaveId, ipCoilStatus | - | Ustawia wiele coil (Modbus). |
| ModbusBatchSetHoldingRegisterBp | ipModbusHost, ipModbusPort, ipRegisterAddress, ipSlaveId, ipRegisterData | - | Ustawia wiele rejestrow holding (Modbus). |
| ModbusCommonReadBp | addrType, ipModbusHost, ipModbusPort, ipAddress, ipSlaveId, alias | modbusValue | Odczytuje wartosc Modbus wg typu adresu. |
| ModbusCommonReadNameBp | instanceName, address, remark | modbusValue | Odczytuje wartosc Modbus po nazwie instancji. |
| ModbusCommonWaitBp | addrType, ipModbusHost, ipModbusPort, ipAddress, ipSlaveId, ipRegisterData, alias | - | Czeka na wartosc Modbus wg typu adresu. |
| ModbusCommonWaitNameBp | instanceName, address, targetValue, remark | - | Czeka na wartosc Modbus po nazwie instancji. |
| ModbusCommonWriteBp | addrType, ipModbusHost, ipModbusPort, ipAddress, ipSlaveId, newValue, alias | - | Zapisuje wartosc Modbus wg typu adresu. |
| ModbusCommonWriteNameBp | instanceName, address, newValue, remark | - | Zapisuje wartosc Modbus po nazwie instancji. |
| ModbusReadHoldingRegisterBp | ipModbusHost, ipModbusPort, ipRegisterAddress, ipSlaveId | modbusValue | Odczytuje pojedynczy holding register (Modbus). |
| ModbusReadInputRegisterBp | ipModbusHost, ipModbusPort, ipRegisterAddress, ipSlaveId | modbusValue | Odczytuje pojedynczy input register (Modbus). |
| ModbusReadSingleCoilBp | ipModbusHost, ipModbusPort, ipCoilAddress, ipSlaveId | modbusValue | Odczytuje pojedynczy coil (Modbus). |
| ModbusReadSingleInputBp | ipModbusHost, ipModbusPort, ipCoilAddress, ipSlaveId | modbusValue | Odczytuje pojedynczy discrete input (Modbus). |
| ModbusSetSingleCoilBp | ipModbusHost, ipModbusPort, ipCoilAddress, ipSlaveId, ipCoilStatus | - | Ustawia pojedynczy coil (Modbus). |
| ModbusSetSingleRegisterBp | ipModbusHost, ipModbusPort, ipRegisterAddress, ipSlaveId, ipRegisterData | - | Ustawia pojedynczy holding register (Modbus). |
| ModbusWaitSingleCoilBp | ipModbusHost, ipModbusPort, ipCoilAddress, ipSlaveId, ipReadonlyCoil, ipTargetCoilStatus | - | Czeka na coil o zadanej wartosci (Modbus). |
| ModbusWaitSingleRegisterBp | ipModbusHost, ipModbusPort, ipRegisterAddress, ipSlaveId, ipReadonlyRegister, ipRegisterData | - | Czeka na register o zadanej wartosci (Modbus). |
| ModifyOperatorBackgroundBp | menuId, background | - | Zmienia tlo w UI operatora. |
| ModifyOperatorDisableBp | menuId, disable | - | Wlacza/wylacza pozycje w UI operatora. |
| ModifyOperatorLabelBp | menuId, label | - | Zmienia etykiete w UI operatora. |
| NoticeOperatorBp | workTypes, workStations, needConfirm, keepTime, content, retryTimes | - | Wysyla komunikat do operatora wg workTypes/workStations. |
| NoticeOperatorByUserBp | userNames, needConfirm, keepTime, content, retryTimes | - | Wysyla komunikat do wskazanych uzytkownikow. |
| OpcReadBp | namespaceIndex, address, expectValue, retry, retryInterval, expectValueType | opcValue | Odczytuje wartosc z OPC UA. |
| OpcWriteBp | namespaceIndex, address, value, type | - | Zapisuje wartosc do OPC UA. |
| ParallelFlowBp | - | - | Uruchamia children rownolegle. |
| ParallelRepeatNBp | num | - | Uruchamia children rownolegle N razy. |
| PhotoElectricSiteVoBp | siteId, filled, num | result | Sprawdza czujnik fotoelektryczny dla site. |
| PostBp | url, param, header, retry, retryTimes, retryInterval, mediaType | response | HTTP POST i zapis response. |
| PrintBp | message | - | Loguje komunikat w task logu. |
| QueryIdleSiteBp | siteId, content, filled, type, groupName, locked, orderDesc | site | Zapytanie o wolny site i zwraca obiekt site. |
| RandomSiteBp | prefix, start, length, width | randomName | Generuje losowy siteId wg prefix/start/length/width. |
| ReadDIBp | agvId, id | status | Odczytuje wejscie DI z AGV. |
| ReadDIWaitBp | agvId, id, status, retry, retryInterval | status | Czeka na DI o zadanej wartosci. |
| RepeatNumBp | num | index | Petla od 0..num-1; ustawia index. |
| ReturnBp | - | - | Konczy task (ustawia status end). |
| RootBp | - | - | Korzen definicji taska; uzywaj tylko jako rootBlock. |
| S7ReadBp | type, ip, blockAndOffset, dataType, expectValue, retry, retryInterval, rack, slot | S7Value | Odczytuje dane z PLC Siemens S7. |
| S7WriteBp | type, ip, blockAndOffset, dataType, value, slot, rack | - | Zapisuje dane do PLC Siemens S7. |
| ScriptBp | functionName, functionArgs | - | Wywoluje funkcje JS (result scala do task.variables). |
| ScriptVariablesBp | functionName, functionArgs | - | Wywoluje funkcje JS i scala result do task.variables. |
| SerialFlowBp | - | - | Uruchamia children sekwencyjnie. |
| SetDOBp | agvId, id, status | - | Ustawia wyjscie DO w AGV. |
| SetOutOrderNoBp | orderNo | - | Ustawia outOrderNo w taskRecord. |
| SetPickLiftSiteEmptyBp | siteId | - | Ustawia stan pick-lift site jako empty. |
| SetPutLiftSiteFilledBp | siteId | - | Ustawia stan put-lift site jako filled. |
| SetResponseBp | body, code | - | Ustawia odpowiedz (body, code) dla interface taska. |
| SetSiteAttrBp | siteId, attrName, attrValue | - | Ustawia atrybut worksite. |
| SetSiteContentBp | siteId, content | - | Ustawia content worksite. |
| SetSiteEmptyBp | siteId | - | Ustawia site jako empty. |
| SetSiteFilledBp | siteId | - | Ustawia site jako filled. |
| SetSiteLockedBp | siteId, ifFair, lockedId, retryTimes | success | Blokuje site (lock) i zwraca sukces. |
| SetSiteTagsBp | siteId, tags | - | Ustawia tagi worksite. |
| SetSiteUnlockedBp | siteId, unLockedId | - | Odblokowuje site. |
| SetTaskVariableBp | varName, varValue | - | Ustawia task.variables varName=varValue. |
| SkipToComponent | skipComponentId | - | Skacze do bloku o id skipComponentId. |
| StartTaskBp | taskRecordId | startSuccess | Uruchamia taskRecordId i zwraca status. |
| StopOtherBranch | workArea | - | Zatrzymuje inne galezie w ParallelFlow/ParallelRepeatN. |
| StopTaskBp | taskRecordId | stopSuccess | Zatrzymuje taskRecordId i zwraca status. |
| StringToJsonArrayBp | convertString | convertArray | Konwertuje string JSON do array. |
| StringToJsonObjectBp | convertString | convertObject | Konwertuje string JSON do obiektu. |
| SubTaskBp | taskRecordId, ifAsync | - | Uruchamia subtask (taskId po bloku) i przekazuje inputParams. |
| SuspendTaskBp | taskRecordId | suspendSuccess | Wstrzymuje taskRecordId i zwraca status. |
| SweeperBp | vehicle, workArea, priority | - | Uruchamia zlecenie sprzatania i monitoruje. |
| TaskStateBp | stateMsg | - | Ustawia opis stanu taska (stateMsg). |
| ThrowExceptionBp | message | - | Wyrzuca wyjatek z komunikatem. |
| TimestampBp | - | timestamp | Zwraca timestamp (Date/now). |
| TriggerTaskEventBp | eventName, eventData | - | Publikuje zdarzenie taska. |
| TryCatchBp | swallowError, ignoreAbort | - | Obsluga bledow: try/catch z child branchami. |
| VehicleStationBp | vehicle | station, lastStation | Pobiera current_station i last_station dla AGV. |
| WaitPassBp | agvId, waitPassTime | - | Czeka na sygnal waitPass lub timeout dla AGV. |
| WhileBp | runOnce, loopCondition, retryPeriod, printContinuously | - | Petla while z warunkiem loopCondition. |
| WorkTypesBp | workTypes, workStations | - | Ustawia workTypes/workStations dla taskRecord. |

## 10. Szablony taskow do kopiowania

Ponizsze szablony to kompletne obiekty `detail` (bez escapowania). Przed zapisem do `.task` trzeba je zserializowac do stringa i escapowac cudzyslowy.

### 8.1 Prosty przejazd do wskazanego miejsca

```
{
  "inputParams": [
    { "name": "targetSite", "type": "String", "label": "Target site", "required": true, "defaultValue": "LM1" },
    { "name": "keyRoute", "type": "String", "label": "Key route", "required": false, "defaultValue": "" }
  ],
  "outputParams": [],
  "rootBlock": {
    "id": -1,
    "name": "-1",
    "blockType": "RootBp",
    "inputParams": {},
    "children": {
      "default": [
        {
          "id": 1,
          "name": "b1",
          "blockType": "CSelectAgvBp",
          "children": {
            "default": [
              {
                "id": 2,
                "name": "b2",
                "blockType": "CAgvOperationBp",
                "children": {},
                "inputParams": {
                  "targetSiteLabel": { "type": "Expression", "value": "taskInputs.targetSite", "required": true }
                },
                "refTaskDefId": "",
                "selected": false,
                "expanded": true
              }
            ]
          },
          "inputParams": {
            "keyRoute": { "type": "Expression", "value": "taskInputs.keyRoute" }
          },
          "refTaskDefId": "",
          "selected": false,
          "expanded": true
        }
      ]
    },
    "selected": false,
    "refTaskDefId": "",
    "expanded": true
  }
}
```

### 8.2 Pobranie z grupy i odkladanie z wyborem przez skrypt

```
{
  "inputParams": [
    { "name": "pickGroup", "type": "String", "label": "Pick group", "required": true, "defaultValue": "PICK-GROUP" },
    { "name": "keyRoute", "type": "String", "label": "Key route", "required": false, "defaultValue": "" },
    { "name": "loadScript", "type": "String", "label": "Load script", "required": false, "defaultValue": "ForkLoad" },
    { "name": "unloadScript", "type": "String", "label": "Unload script", "required": false, "defaultValue": "ForkUnload" },
    { "name": "dropSelectorArgs", "type": "String", "label": "Drop selector args (JSON string)", "required": true,
      "defaultValue": "{\"groupNames\":[\"DROP-GROUP-01\"],\"ordering\":\"ASC\",\"resultField\":\"dropSite\"}" }
  ],
  "outputParams": [],
  "rootBlock": {
    "id": -1,
    "name": "-1",
    "blockType": "RootBp",
    "inputParams": {},
    "children": {
      "default": [
        {
          "id": 1,
          "name": "b1",
          "blockType": "GetIdleSiteBp",
          "children": {},
          "inputParams": {
            "filled": { "type": "Simple", "value": true },
            "locked": { "type": "Simple", "value": false, "required": true },
            "groupName": { "type": "Expression", "value": "taskInputs.pickGroup" }
          },
          "refTaskDefId": "",
          "selected": false,
          "expanded": true
        },
        {
          "id": 2,
          "name": "b2",
          "blockType": "CSelectAgvBp",
          "children": {
            "default": [
              {
                "id": 3,
                "name": "b3",
                "blockType": "CAgvOperationBp",
                "children": {},
                "inputParams": {
                  "targetSiteLabel": { "type": "Expression", "value": "blocks.b1.siteId", "required": true },
                  "scriptName": { "type": "Expression", "value": "taskInputs.loadScript" }
                },
                "refTaskDefId": "",
                "selected": false,
                "expanded": true
              },
              {
                "id": 4,
                "name": "b4",
                "blockType": "ScriptVariablesBp",
                "children": {},
                "inputParams": {
                  "functionName": { "type": "Simple", "value": "setTaskVariables_getNextDropsiteMultipleGroups_Blocking", "required": true },
                  "functionArgs": { "type": "Expression", "value": "taskInputs.dropSelectorArgs" }
                },
                "refTaskDefId": "",
                "selected": false,
                "expanded": true
              },
              {
                "id": 5,
                "name": "b5",
                "blockType": "CAgvOperationBp",
                "children": {},
                "inputParams": {
                  "targetSiteLabel": { "type": "Expression", "value": "task.variables.dropSite", "required": true },
                  "scriptName": { "type": "Expression", "value": "taskInputs.unloadScript" }
                },
                "refTaskDefId": "",
                "selected": false,
                "expanded": true
              },
              {
                "id": 6,
                "name": "b6",
                "blockType": "SetSiteFilledBp",
                "children": {},
                "inputParams": {
                  "siteId": { "type": "Expression", "value": "task.variables.dropSite", "required": true }
                },
                "refTaskDefId": "",
                "selected": false,
                "expanded": true
              }
            ]
          },
          "inputParams": {
            "keyRoute": { "type": "Expression", "value": "taskInputs.keyRoute" }
          },
          "refTaskDefId": "",
          "selected": false,
          "expanded": true
        }
      ]
    },
    "selected": false,
    "refTaskDefId": "",
    "expanded": true
  }
}
```

### 8.3 Iteracja po liscie punktow

```
{
  "inputParams": [
    { "name": "targets", "type": "JSONArray", "label": "Targets", "required": true, "defaultValue": "[\"S1\",\"S2\",\"S3\"]" },
    { "name": "keyRoute", "type": "String", "label": "Key route", "required": false, "defaultValue": "" }
  ],
  "outputParams": [],
  "rootBlock": {
    "id": -1,
    "name": "-1",
    "blockType": "RootBp",
    "inputParams": {},
    "children": {
      "default": [
        {
          "id": 1,
          "name": "b1",
          "blockType": "CSelectAgvBp",
          "children": {
            "default": [
              {
                "id": 2,
                "name": "b2",
                "blockType": "IterateListBp",
                "children": {
                  "default": [
                    {
                      "id": 3,
                      "name": "b3",
                      "blockType": "CAgvOperationBp",
                      "children": {},
                      "inputParams": {
                        "targetSiteLabel": { "type": "Expression", "value": "blocks.b2.item", "required": true }
                      },
                      "refTaskDefId": "",
                      "selected": false,
                      "expanded": true
                    }
                  ]
                },
                "inputParams": {
                  "list": { "type": "Expression", "value": "taskInputs.targets", "required": true }
                },
                "refTaskDefId": "",
                "selected": false,
                "expanded": true
              }
            ]
          },
          "inputParams": {
            "keyRoute": { "type": "Expression", "value": "taskInputs.keyRoute" }
          },
          "refTaskDefId": "",
          "selected": false,
          "expanded": true
        }
      ]
    },
    "selected": false,
    "refTaskDefId": "",
    "expanded": true
  }
}
```

### 8.4 If/Else z fallback (brak miejsca -> bufor)

```
{
  "inputParams": [
    { "name": "pickGroup", "type": "String", "label": "Pick group", "required": true, "defaultValue": "PICK-GROUP" },
    { "name": "fallbackSite", "type": "String", "label": "Fallback site", "required": true, "defaultValue": "BUFFER-01" },
    { "name": "keyRoute", "type": "String", "label": "Key route", "required": false, "defaultValue": "" }
  ],
  "outputParams": [],
  "rootBlock": {
    "id": -1,
    "name": "-1",
    "blockType": "RootBp",
    "inputParams": {},
    "children": {
      "default": [
        {
          "id": 1,
          "name": "b1",
          "blockType": "GetIdleSiteBp",
          "children": {},
          "inputParams": {
            "filled": { "type": "Simple", "value": true },
            "locked": { "type": "Simple", "value": false, "required": true },
            "groupName": { "type": "Expression", "value": "taskInputs.pickGroup" }
          },
          "refTaskDefId": "",
          "selected": false,
          "expanded": true
        },
        {
          "id": 2,
          "name": "b2",
          "blockType": "IfElseBp",
          "inputParams": {
            "conditionIf": { "type": "Expression", "value": "blocks.b1.siteId != null" }
          },
          "children": {
            "if": [
              {
                "id": 3,
                "name": "b3",
                "blockType": "CSelectAgvBp",
                "children": {
                  "default": [
                    {
                      "id": 4,
                      "name": "b4",
                      "blockType": "CAgvOperationBp",
                      "children": {},
                      "inputParams": {
                        "targetSiteLabel": { "type": "Expression", "value": "blocks.b1.siteId", "required": true }
                      },
                      "refTaskDefId": "",
                      "selected": false,
                      "expanded": true
                    }
                  ]
                },
                "inputParams": {
                  "keyRoute": { "type": "Expression", "value": "taskInputs.keyRoute" }
                },
                "refTaskDefId": "",
                "selected": false,
                "expanded": true
              }
            ],
            "else": [
              {
                "id": 5,
                "name": "b5",
                "blockType": "CSelectAgvBp",
                "children": {
                  "default": [
                    {
                      "id": 6,
                      "name": "b6",
                      "blockType": "CAgvOperationBp",
                      "children": {},
                      "inputParams": {
                        "targetSiteLabel": { "type": "Expression", "value": "taskInputs.fallbackSite", "required": true }
                      },
                      "refTaskDefId": "",
                      "selected": false,
                      "expanded": true
                    }
                  ]
                },
                "inputParams": {
                  "keyRoute": { "type": "Expression", "value": "taskInputs.keyRoute" }
                },
                "refTaskDefId": "",
                "selected": false,
                "expanded": true
              }
            ]
          },
          "refTaskDefId": "",
          "selected": false,
          "expanded": true
        }
      ]
    },
    "selected": false,
    "refTaskDefId": "",
    "expanded": true
  }
}
```

### 8.5 TryCatch z logiem, TaskState i retry

```
{
  "inputParams": [
    { "name": "targetSite", "type": "String", "label": "Target site", "required": true, "defaultValue": "LM1" },
    { "name": "keyRoute", "type": "String", "label": "Key route", "required": false, "defaultValue": "" },
    { "name": "retryCount", "type": "Long", "label": "Retry count", "required": false, "defaultValue": "0" },
    { "name": "retryDelayMs", "type": "Long", "label": "Retry delay (ms)", "required": false, "defaultValue": "1000" }
  ],
  "outputParams": [],
  "rootBlock": {
    "id": -1,
    "name": "-1",
    "blockType": "RootBp",
    "inputParams": {},
    "children": {
      "default": [
        {
          "id": 1,
          "name": "b1",
          "blockType": "TryCatchBp",
          "inputParams": {
            "swallowError": { "type": "Simple", "value": true },
            "ignoreAbort": { "type": "Simple", "value": false }
          },
          "children": {
            "try": [
              {
                "id": 2,
                "name": "b2",
                "blockType": "CSelectAgvBp",
                "children": {
                  "default": [
                    {
                      "id": 3,
                      "name": "b3",
                      "blockType": "CAgvOperationBp",
                      "children": {},
                      "inputParams": {
                        "targetSiteLabel": { "type": "Expression", "value": "taskInputs.targetSite", "required": true }
                      },
                      "refTaskDefId": "",
                      "selected": false,
                      "expanded": true
                    }
                  ]
                },
                "inputParams": {
                  "keyRoute": { "type": "Expression", "value": "taskInputs.keyRoute" }
                },
                "refTaskDefId": "",
                "selected": false,
                "expanded": true
              }
            ],
            "catch": [
              {
                "id": 4,
                "name": "b4",
                "blockType": "ScriptBp",
                "children": {},
                "inputParams": {
                  "functionName": { "type": "Simple", "value": "log", "required": true },
                  "functionArgs": { "type": "Simple", "value": "tryCatch: error, retry" }
                },
                "refTaskDefId": "",
                "selected": false,
                "expanded": true
              },
              {
                "id": 5,
                "name": "b5",
                "blockType": "TaskStateBp",
                "children": {},
                "inputParams": {
                  "stateMsg": { "type": "Simple", "value": "{\"state\":\"retry\"}", "required": true }
                },
                "refTaskDefId": "",
                "selected": false,
                "expanded": true
              },
              {
                "id": 6,
                "name": "b6",
                "blockType": "RepeatNumBp",
                "children": {
                  "default": [
                    {
                      "id": 7,
                      "name": "b7",
                      "blockType": "DelayBp",
                      "children": {},
                      "inputParams": {
                        "timeMillis": { "type": "Expression", "value": "taskInputs.retryDelayMs" }
                      },
                      "refTaskDefId": "",
                      "selected": false,
                      "expanded": true
                    },
                    {
                      "id": 8,
                      "name": "b8",
                      "blockType": "CSelectAgvBp",
                      "children": {
                        "default": [
                          {
                            "id": 9,
                            "name": "b9",
                            "blockType": "CAgvOperationBp",
                            "children": {},
                            "inputParams": {
                              "targetSiteLabel": { "type": "Expression", "value": "taskInputs.targetSite", "required": true }
                            },
                            "refTaskDefId": "",
                            "selected": false,
                            "expanded": true
                          }
                        ]
                      },
                      "inputParams": {
                        "keyRoute": { "type": "Expression", "value": "taskInputs.keyRoute" }
                      },
                      "refTaskDefId": "",
                      "selected": false,
                      "expanded": true
                    }
                  ]
                },
                "inputParams": {
                  "num": { "type": "Expression", "value": "taskInputs.retryCount" }
                },
                "refTaskDefId": "",
                "selected": false,
                "expanded": true
              }
            ]
          },
          "refTaskDefId": "",
          "selected": false,
          "expanded": true
        }
      ]
    },
    "selected": false,
    "refTaskDefId": "",
    "expanded": true
  }
}
```

### 8.6 While: czekanie na flage lub wynik skryptu

```
{
  "inputParams": [
    { "name": "pollScript", "type": "String", "label": "Poll script", "required": true, "defaultValue": "refreshReadyFlag" },
    { "name": "pollArgs", "type": "String", "label": "Poll args", "required": false, "defaultValue": "" },
    { "name": "retryPeriodMs", "type": "Long", "label": "Poll interval (ms)", "required": false, "defaultValue": "1000" }
  ],
  "outputParams": [],
  "rootBlock": {
    "id": -1,
    "name": "-1",
    "blockType": "RootBp",
    "inputParams": {},
    "children": {
      "default": [
        {
          "id": 1,
          "name": "b1",
          "blockType": "WhileBp",
          "inputParams": {
            "loopCondition": { "type": "Expression", "value": "task.variables.ready != true" },
            "retryPeriod": { "type": "Expression", "value": "taskInputs.retryPeriodMs" },
            "runOnce": { "type": "Simple", "value": false },
            "printContinuously": { "type": "Simple", "value": false }
          },
          "children": {
            "default": [
              {
                "id": 2,
                "name": "b2",
                "blockType": "TaskStateBp",
                "children": {},
                "inputParams": {
                  "stateMsg": { "type": "Simple", "value": "{\"state\":\"waiting\"}", "required": true }
                },
                "refTaskDefId": "",
                "selected": false,
                "expanded": true
              },
              {
                "id": 3,
                "name": "b3",
                "blockType": "ScriptVariablesBp",
                "children": {},
                "inputParams": {
                  "functionName": { "type": "Expression", "value": "taskInputs.pollScript", "required": true },
                  "functionArgs": { "type": "Expression", "value": "taskInputs.pollArgs" }
                },
                "refTaskDefId": "",
                "selected": false,
                "expanded": true
              }
            ]
          },
          "refTaskDefId": "",
          "selected": false,
          "expanded": true
        }
      ]
    },
    "selected": false,
    "refTaskDefId": "",
    "expanded": true
  }
}
```

### 8.7 RepeatNum: retry operacji N razy

```
{
  "inputParams": [
    { "name": "targetSite", "type": "String", "label": "Target site", "required": true, "defaultValue": "LM1" },
    { "name": "keyRoute", "type": "String", "label": "Key route", "required": false, "defaultValue": "" },
    { "name": "attempts", "type": "Long", "label": "Attempts", "required": true, "defaultValue": "3" }
  ],
  "outputParams": [],
  "rootBlock": {
    "id": -1,
    "name": "-1",
    "blockType": "RootBp",
    "inputParams": {},
    "children": {
      "default": [
        {
          "id": 1,
          "name": "b1",
          "blockType": "RepeatNumBp",
          "children": {
            "default": [
              {
                "id": 2,
                "name": "b2",
                "blockType": "CSelectAgvBp",
                "children": {
                  "default": [
                    {
                      "id": 3,
                      "name": "b3",
                      "blockType": "CAgvOperationBp",
                      "children": {},
                      "inputParams": {
                        "targetSiteLabel": { "type": "Expression", "value": "taskInputs.targetSite", "required": true }
                      },
                      "refTaskDefId": "",
                      "selected": false,
                      "expanded": true
                    }
                  ]
                },
                "inputParams": {
                  "keyRoute": { "type": "Expression", "value": "taskInputs.keyRoute" }
                },
                "refTaskDefId": "",
                "selected": false,
                "expanded": true
              }
            ]
          },
          "inputParams": {
            "num": { "type": "Expression", "value": "taskInputs.attempts" }
          },
          "refTaskDefId": "",
          "selected": false,
          "expanded": true
        }
      ]
    },
    "selected": false,
    "refTaskDefId": "",
    "expanded": true
  }
}
```

### 8.8 ParallelFlow: ruch + monitoring rownolegle

```
{
  "inputParams": [
    { "name": "targetSite", "type": "String", "label": "Target site", "required": true, "defaultValue": "LM1" },
    { "name": "keyRoute", "type": "String", "label": "Key route", "required": false, "defaultValue": "" },
    { "name": "monitorScript", "type": "String", "label": "Monitor script", "required": true, "defaultValue": "monitorOnce" },
    { "name": "monitorArgs", "type": "String", "label": "Monitor args", "required": false, "defaultValue": "" },
    { "name": "monitorIntervalMs", "type": "Long", "label": "Monitor interval (ms)", "required": false, "defaultValue": "500" }
  ],
  "outputParams": [],
  "rootBlock": {
    "id": -1,
    "name": "-1",
    "blockType": "RootBp",
    "inputParams": {},
    "children": {
      "default": [
        {
          "id": 1,
          "name": "b1",
          "blockType": "SetTaskVariableBp",
          "children": {},
          "inputParams": {
            "varName": { "type": "Simple", "value": "monitorStop", "required": true },
            "varValue": { "type": "Simple", "value": false, "required": true }
          },
          "refTaskDefId": "",
          "selected": false,
          "expanded": true
        },
        {
          "id": 2,
          "name": "b2",
          "blockType": "ParallelFlowBp",
          "children": {
            "default": [
              {
                "id": 3,
                "name": "b3",
                "blockType": "CSelectAgvBp",
                "children": {
                  "default": [
                    {
                      "id": 4,
                      "name": "b4",
                      "blockType": "CAgvOperationBp",
                      "children": {},
                      "inputParams": {
                        "targetSiteLabel": { "type": "Expression", "value": "taskInputs.targetSite", "required": true }
                      },
                      "refTaskDefId": "",
                      "selected": false,
                      "expanded": true
                    },
                    {
                      "id": 5,
                      "name": "b5",
                      "blockType": "SetTaskVariableBp",
                      "children": {},
                      "inputParams": {
                        "varName": { "type": "Simple", "value": "monitorStop", "required": true },
                        "varValue": { "type": "Simple", "value": true, "required": true }
                      },
                      "refTaskDefId": "",
                      "selected": false,
                      "expanded": true
                    }
                  ]
                },
                "inputParams": {
                  "keyRoute": { "type": "Expression", "value": "taskInputs.keyRoute" }
                },
                "refTaskDefId": "",
                "selected": false,
                "expanded": true
              },
              {
                "id": 6,
                "name": "b6",
                "blockType": "WhileBp",
                "inputParams": {
                  "loopCondition": { "type": "Expression", "value": "task.variables.monitorStop != true" },
                  "retryPeriod": { "type": "Expression", "value": "taskInputs.monitorIntervalMs" },
                  "runOnce": { "type": "Simple", "value": false },
                  "printContinuously": { "type": "Simple", "value": false }
                },
                "children": {
                  "default": [
                    {
                      "id": 7,
                      "name": "b7",
                      "blockType": "ScriptBp",
                      "children": {},
                      "inputParams": {
                        "functionName": { "type": "Expression", "value": "taskInputs.monitorScript", "required": true },
                        "functionArgs": { "type": "Expression", "value": "taskInputs.monitorArgs" }
                      },
                      "refTaskDefId": "",
                      "selected": false,
                      "expanded": true
                    }
                  ]
                },
                "refTaskDefId": "",
                "selected": false,
                "expanded": true
              }
            ]
          },
          "inputParams": {},
          "refTaskDefId": "",
          "selected": false,
          "expanded": true
        }
      ]
    },
    "selected": false,
    "refTaskDefId": "",
    "expanded": true
  }
}
```

### 8.9 IterateList z TaskState w kazdym kroku

```
{
  "inputParams": [
    { "name": "targets", "type": "JSONArray", "label": "Targets", "required": true, "defaultValue": "[\"S1\",\"S2\",\"S3\"]" },
    { "name": "keyRoute", "type": "String", "label": "Key route", "required": false, "defaultValue": "" }
  ],
  "outputParams": [],
  "rootBlock": {
    "id": -1,
    "name": "-1",
    "blockType": "RootBp",
    "inputParams": {},
    "children": {
      "default": [
        {
          "id": 1,
          "name": "b1",
          "blockType": "CSelectAgvBp",
          "children": {
            "default": [
              {
                "id": 2,
                "name": "b2",
                "blockType": "IterateListBp",
                "children": {
                  "default": [
                    {
                      "id": 3,
                      "name": "b3",
                      "blockType": "TaskStateBp",
                      "children": {},
                      "inputParams": {
                        "stateMsg": { "type": "Expression", "value": "\"{\\\"target\\\":\\\"\" + blocks.b2.item + \"\\\"}\"", "required": true }
                      },
                      "refTaskDefId": "",
                      "selected": false,
                      "expanded": true
                    },
                    {
                      "id": 4,
                      "name": "b4",
                      "blockType": "CAgvOperationBp",
                      "children": {},
                      "inputParams": {
                        "targetSiteLabel": { "type": "Expression", "value": "blocks.b2.item", "required": true }
                      },
                      "refTaskDefId": "",
                      "selected": false,
                      "expanded": true
                    }
                  ]
                },
                "inputParams": {
                  "list": { "type": "Expression", "value": "taskInputs.targets", "required": true }
                },
                "refTaskDefId": "",
                "selected": false,
                "expanded": true
              }
            ]
          },
          "inputParams": {
            "keyRoute": { "type": "Expression", "value": "taskInputs.keyRoute" }
          },
          "refTaskDefId": "",
          "selected": false,
          "expanded": true
        }
      ]
    },
    "selected": false,
    "refTaskDefId": "",
    "expanded": true
  }
}
```

## 11. Przeglad taska wozenia palet (nowy_styl_task)

Task `nowy_styl_task` z `Task Records.task` wykonuje:
1) `TaskStateBp` -> ustawia stan poczatkowy.
2) `GetIdleSiteBp` -> wybiera miejsce pobrania z grupy `PICK-GROUP` (output: `siteId`).
3) `TaskStateBp` -> stan z `blocks.b1.siteId`.
4) `CSelectAgvBp` -> wybiera AGV (param `keyRoute=PP51`) i uruchamia sekwencje:
   - `CAgvOperationBp` -> dojazd do `blocks.b1.siteId` + `scriptName=ForkLoad`.
   - `TaskStateBp`.
   - `CAgvOperationBp` -> przejazd do `LM6`.
   - `ScriptVariablesBp` -> wywoluje `setTaskVariables_getNextDropsiteMultipleGroups_Blocking`, ustawia `task.variables.dropSite`.
   - `TaskStateBp` -> uzywa `task.variables.dropSite`.
   - `CAgvOperationBp` -> dojazd i `scriptName=ForkUnload`.
   - `SetSiteFilledBp` -> oznacza `task.variables.dropSite` jako zajete.

Ta sekwencja pokazuje, jak logika wyboru miejsca (dropSite) jest delegowana do skryptu, a reszta pozostaje w grafie blokow.

## 12. Escapowanie i serializacja

- `detail` jest zapisany jako JSON string w pliku `.task`.
- Wszelkie cudzyslowy i backslashe w `detail` musza byc escapowane.
- Dla wyrazen tworzacych JSON string (np. `TaskStateBp.stateMsg`) escapowanie jest podwojne.

## 13. API import/export taskow i skryptow (RDS runtime)

Ponizej endpointy z kodu runtime. Odpowiedzi JSON maja standardowy wrapper:
```
{ "code": 200, "msg": "...", "data": ... }
```

### 13.1 Taski (WindTaskDef)

Upload / update taska:
- `POST /api/create-taskdef/createOrUpdateTaskDef`
  - Body: obiekt `WindTaskDef` (JSON).
  - Minimalnie: `label` i `detail` (string z escapowanym JSON; patrz sekcja 12).
  - Serwer dopelnia domyslne pola: `version` (max+1), `templateName=userTemplate`, `status=0`, `ifEnable=0`, `periodicTask=0`, `delay=1000`, `period=3000`, `windcategoryId=0`.
  - Przy konflikcie etykiety (unikalny `label`) zwraca blad `WIND_LABEL_ERROR`.
- `POST /api/create-task` (create-only, odrzuca duplikaty `label`).

Pobranie / eksport taskow:
- `POST /api/queryTaskDefById` z body `{ "id": "..." }`
  - `data` to JSON string z obiektem `WindTaskDef` (trzeba sparsowac).
- `POST /api/windTaskdef/batchExportTask` z body `[ "id1", "id2", ... ]`
  - Odpowiedz: plik `taskDef.task` (JSON array obiektow `WindTaskDefExport`).
- `GET /api/downloadZip/{windTask}/{script}/{configurationFiles}/{appFiles}/{interfaceFile}`
  - Gdy `windTask=true`, zip zawiera `.task` z lista taskow (userTemplate).
  - Nazwa pliku odpowiedzi: `script.zip`.

Import taskow z zip:
- `POST /api/zipDecompression` (multipart/form-data, pole `file`)
  - Wymaga `.zip` i Content-Type `application/x-zip-compressed`.
  - Wspierane pliki w zip:
    - `*.task` -> JSON array `WindTaskDef`.
    - `*.js` -> skrypty.
    - `application.yml`, `application-biz.yml`.
    - `*.api` -> lista interfejsow.
  - Ograniczenie sciezki w zip: tylko pliki w root lub jeden poziom katalogu.
  - Duplikaty `label` lub `interface.url` sa odrzucane.

Przyklady (curl):

Lista taskow (paginacja + filtr):
```
curl -sS -X POST http://RDS_HOST/api/findAll-taskdef/findTaskDefsByCondition \
  -H "Content-Type: application/json" \
  -d '{"currentPage":1,"pageSize":20,"queryParam":{"label":"nowy_styl_task","ifShowHistory":false}}'
```

Pobranie taska po id:
```
curl -sS -X POST http://RDS_HOST/api/queryTaskDefById \
  -H "Content-Type: application/json" \
  -d '{"id":"TASK_DEF_ID"}'
```

Upload / update taska:
```
curl -sS -X POST http://RDS_HOST/api/create-taskdef/createOrUpdateTaskDef \
  -H "Content-Type: application/json" \
  -d '{
    "label":"demo_task",
    "detail":"{\"inputParams\":[],\"outputParams\":[],\"rootBlock\":{\"id\":-1,\"name\":\"-1\",\"blockType\":\"RootBp\",\"inputParams\":{},\"children\":{\"default\":[{\"id\":1,\"name\":\"b1\",\"blockType\":\"CSelectAgvBp\",\"inputParams\":{\"keyRoute\":{\"type\":\"Expression\",\"value\":\"\\\"R1\\\"\"}},\"children\":{\"default\":[{\"id\":2,\"name\":\"b2\",\"blockType\":\"CAgvOperationBp\",\"inputParams\":{\"targetSiteLabel\":{\"type\":\"Expression\",\"value\":\"\\\"LM1\\\"\"}},\"children\":{}}]}}]}}}"
  }'
```

Export wybranych taskow do `.task`:
```
curl -sS -X POST http://RDS_HOST/api/windTaskdef/batchExportTask \
  -H "Content-Type: application/json" \
  -d '["TASK_DEF_ID_1","TASK_DEF_ID_2"]' \
  -o taskDef.task
```

Import taskow z zip:
```
curl -sS -X POST http://RDS_HOST/api/zipDecompression \
  -F "file=@/path/to/export.zip;type=application/x-zip-compressed"
```

Przykladowe odpowiedzi:

`POST /api/findAll-taskdef/findTaskDefsByCondition`:
```
{
  "code": 200,
  "msg": "Success",
  "data": {
    "totalCount": 1,
    "currentPage": 1,
    "pageSize": 20,
    "totalPage": 1,
    "pageList": [
      {
        "id": "TASK_DEF_ID",
        "label": "nowy_styl_task",
        "version": 3,
        "detail": "{...}",
        "status": 0,
        "templateName": "userTemplate",
        "periodicTask": 0,
        "ifEnable": 0
      }
    ]
  }
}
```

`POST /api/queryTaskDefById`:
```
{
  "code": 200,
  "msg": "Success",
  "data": "{\"id\":\"TASK_DEF_ID\",\"label\":\"demo_task\",\"version\":1,\"detail\":\"{\\\"inputParams\\\":[],\\\"outputParams\\\":[],\\\"rootBlock\\\":{...}}\""
}
```

`POST /api/create-taskdef/createOrUpdateTaskDef`:
```
{
  "code": 200,
  "msg": "Success",
  "data": null
}
```

`POST /api/windTaskdef/batchExportTask`:
```
HTTP/1.1 200 OK
Content-Type: application/octet-stream; charset=UTF-8
Content-Disposition: attachment; filename=taskDef.task
```
Body: JSON array obiektow `WindTaskDefExport`.

### 13.2 Skrypty (JS)

Upload / update skryptu:
- `POST /script/update-script`
  - Body (JSON): `{ "folderName": "boot", "fileName": "x.js", "script": "..." }`
  - `folderName=boot` zapisuje plik w glownym katalogu skryptow.
  - Przy zmianie tresci zapisuje wersje historyczna w `history/script/...`.
- `POST /script/new-script?folderName=...&fileName=...`
  - Tworzy katalog i/lub pusty plik `.js` (uzyj gdy folder/plik nie istnieje).

Pobranie skryptu:
- `GET /script/showScriptJS?folderName=...&fileName=...`
  - `data` to zawartosc pliku jako string.
- `GET /script/zip?folderName=...`
  - Zwraca `script.zip`; bez `folderName` eksportuje wszystkie foldery.

Bulk import/export skryptow:
- Import: `POST /api/zipDecompression` (patrz wyzej).
- Export: `GET /api/downloadZip/...` z `script=true`.

Przyklady (curl):

Lista skryptow (drzewo folderow + pliki):
```
curl -sS http://RDS_HOST/script/showScriptTree
```

Pobranie pojedynczego skryptu:
```
curl -sS "http://RDS_HOST/script/showScriptJS?folderName=boot&fileName=boot.js"
```

Upload / update skryptu:
```
curl -sS -X POST http://RDS_HOST/script/update-script \
  -H "Content-Type: application/json" \
  -d '{"folderName":"boot","fileName":"boot.js","script":"// js content\\nfunction x(){}\\n"}'
```

Pobranie zipa ze skryptami:
```
curl -sS -o script.zip "http://RDS_HOST/script/zip"
```
Lub przez export ogolny:
```
curl -sS -o script.zip "http://RDS_HOST/api/downloadZip/false/true/false/false/false"
```

Upload zipa (taski/skrypty/konfig):
```
curl -sS -X POST http://RDS_HOST/api/zipDecompression \
  -F "file=@/path/to/export.zip;type=application/x-zip-compressed"
```

Przykladowe odpowiedzi:

`GET /script/showScriptTree`:
```
{
  "code": 200,
  "msg": "Success",
  "data": [
    {
      "id": 1,
      "folderName": "boot",
      "createTime": "2024-01-01T12:34:56.000+00:00",
      "enable": 0,
      "debugEnable": 0,
      "children": [
        { "id": "boot#boot.js", "label": "boot.js" },
        { "id": "boot#utils.js", "label": "utils.js" }
      ]
    },
    {
      "id": 2,
      "folderName": "warehouse",
      "createTime": "2024-01-02T08:00:00.000+00:00",
      "enable": 0,
      "debugEnable": 0,
      "children": [
        { "id": "warehouse#routes.js", "label": "routes.js" }
      ]
    }
  ]
}
```

`GET /script/showScriptJS?folderName=boot&fileName=boot.js`:
```
{
  "code": 200,
  "msg": "Success",
  "data": "// js file content\\nfunction log(p){ return { result: \\\"{}\\\" }; }\\n"
}
```

`POST /script/update-script`:
```
{
  "code": 200,
  "msg": "Success",
  "data": null
}
```

`GET /script/zip`:
```
HTTP/1.1 200 OK
Content-Type: application/zip;charset=UTF-8
Content-Disposition: attachment; filename=script.zip
```
Body: binary zip data.

`POST /api/zipDecompression`:
```
{
  "code": 200,
  "msg": "Success",
  "data": null
}
```

## 14. Execution model (runtime)

Skrocony model wykonania z kodu runtime:

- Silnik wykonania taska dziala lokalnie w JVM RDS. Glowny flow jest w `rds/decompiled/com/seer/rds/service/wind/AbstratRootBp.java`.
- `detail` jest parsowany do drzewa blokow, a nastepnie RDS wykonuje bloki w kolejnosci (lub rownolegle) przez `executeChild(...)`.
- Kazdy `blockType` jest mapowany na Spring bean implementujacy `BlockExecutor` i uruchamiany lokalnie (lookup po nazwie beana). Zobacz `rds/decompiled/com/seer/rds/service/wind/BlockExecutor.java`.
- Rownolegly przebieg (ParallelFlow/ParallelRepeatN) jest wykonywany przez wewnetrzny thread pool, np. `rds/decompiled/com/seer/rds/service/threadPool/LinkedBqThreadPool.java`.
- Subtask (`SubTaskBp`) tworzy nowe wykonanie w tym samym RDS (nie jest delegowany na zewnatrz): `rds/decompiled/com/seer/rds/service/wind/commonBp/SubTaskBp.java`.
- Skrypty sa wykonywane lokalnie przez `ScriptService` w RDS: `rds/decompiled/com/seer/rds/service/wind/commonBp/ScriptBp.java` i `rds/decompiled/com/seer/rds/script/ScriptService.java`.

Co jest wykonywane poza RDS (tylko jako akcje blokow, nie jako caly task):

- Bloki AGV wysylaja HTTP do core/AGV backend (setOrder/orderDetails itp.) i monitoruja wynik. Przyklady: `rds/decompiled/com/seer/rds/service/wind/taskBp/CSelectAgvBp.java`, `rds/decompiled/com/seer/rds/service/wind/taskBp/CAgvOperationBp.java`, `rds/decompiled/com/seer/rds/service/wind/taskBp/DistributeBp.java`.
- Bloki PLC/IO (Modbus/Opc/S7/Fins/Melsec) komunikuja sie bezposrednio z urzadzeniami z poziomu RDS.
- Bloki HTTP (GetBp/PostBp) wykonuja zewnetrzne wywolania, ale sterowanie i stan pozostaja po stronie RDS.
