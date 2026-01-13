# Fleet Manager — jeszcze więcej usprawnień (wersja 3): prostota, odporność, DX, wydajność

Ten dokument celuje w „trzecią warstwę” jakości: rzeczy, które nie zawsze są na liście wymagań, ale później decydują o tym, czy system jest **nudny w utrzymaniu** (czyli dobry), czy **dramatyczny** (czyli drogi).

Wiele punktów odnosi się do konkretnych miejsc w kodzie, które widać w repo (np. `setInterval` w `apps/fleet-core/server.js`, `decodeURIComponent` bez try/catch w `fleet-ui` i `fleet-gateway`, brak globalnego try/catch w async handlerach HTTP itd.).

---

## 1) Pętla tick: brak reentrancy + kontrola driftu + mierzenie czasu ticka

### 1.1. `setInterval` w core może w przyszłości zrobić „overlap ticków”
W `apps/fleet-core/server.js` tick jest robiony przez:

- `setInterval(() => { ... runtime.tick(); gatewayClient.sendCommand(...).catch(...); broadcastState(...) }, tickMs)`

Na dziś tick jest szybki (bo wysyłka komend jest nieawaitowana), ale jak tylko:
- dodasz polling statusów,
- dorzucisz persistencję,
- albo runtime stanie się cięższy,

to `setInterval` może odpalić **drugi tick zanim skończy się pierwszy**, a to jest klasyczna droga do „duchów” (duplikatów komend, skoków stanu, wyścigów).

**Uproszczone utwardzenie**
- Zamiast `setInterval` użyj pętli `setTimeout` „po zakończeniu”:

```js
let stopped = false;
async function tickLoop() {
  const t0 = Date.now();
  try {
    await doTickOnce();
  } catch (err) {
    logError(err);
  }
  const dt = Date.now() - t0;
  const delay = Math.max(0, tickMs - dt);
  if (!stopped) setTimeout(tickLoop, delay);
}
tickLoop();
```

**Bonus**: masz od razu metrykę `tick_duration_ms` (avg/max), bardzo użyteczne w diagnostyce.

---

## 2) SSE i backpressure: „wolny klient” nie może zabić serwera

W `fleet-core` broadcast robi:

- `res.write(data)` w pętli po klientach (`streamClients`), bez sprawdzania wyniku.

W Node `res.write()` zwraca `false`, gdy bufor jest pełny. Jeśli klient jest wolny (albo ma słabą sieć), Node zaczyna buforować, a Ty możesz:
- rosnąć w RAM,
- dostać GC churn,
- w skrajnym przypadku wywrócić proces.

**Co zrobić**
- Jeśli `res.write()` zwróci `false`, masz dwie dobre polityki:
  1) **drop client** (najprostsze i często najlepsze dla UI),
  2) **pauzuj i czekaj na `drain`** (bardziej skomplikowane, ale zachowuje klienta).

**Najprostsza, bardzo skuteczna wersja**
- oznacz klienta jako „slow” i rozłącz po 2–3 kolejnych tickach, gdy nadal jest slow.

**Dodatkowe dobre praktyki SSE**
- Wysyłaj `retry: 2000` (ms) na start, żeby klienci mieli sensowny reconnect.
- Wysyłaj `id: <cursor>` dla eventów (gdy wdrożysz cursor), żeby dało się wznowić.
- Ogranicz liczbę klientów (np. max 50) → 503 `too_many_clients`.

---

## 3) Async handler w `http.createServer`: brak globalnego try/catch = unhandled rejections

W kilku usługach handler HTTP jest `async`:

- `apps/fleet-gateway/server.js`: `http.createServer(async (req, res) => { ... await gateway.listRobots(); ... })`
- `apps/algorithm-service/server.js` podobnie
- `apps/fleet-core/server.js` również

Problem: Node nie „awaituje” obietnicy zwracanej przez handler. Jeśli wewnątrz poleci wyjątek poza lokalnym try/catch, dostajesz **unhandled rejection** (czasem ciche, czasem wywraca proces zależnie od ustawień).

**Utwardzenie**
- Zrób wrapper:

```js
function wrap(handler) {
  return (req, res) => {
    Promise.resolve(handler(req, res)).catch((err) => {
      safeSend500(res, err);
    });
  };
}
http.createServer(wrap(async (req, res) => { ... }))
```

To jest „tani” fix, który bardzo zwiększa odporność.

---

## 4) `decodeURIComponent` bez ochrony: łatwy crash na złośliwym/zepsutym URL-u

W repo są miejsca, gdzie `decodeURIComponent(...)` jest użyte bez try/catch:

- `apps/fleet-gateway/server.js` (robotId z path)
- `apps/fleet-ui/server.js` w `resolvePath()` i kilku endpointach API

`decodeURIComponent` rzuca wyjątek przy złym kodowaniu (np. `%E0%A4` urwane). To jest prosty wektor na „404? nie, crash”.

**Pro fix**
```js
function safeDecode(value) {
  try { return decodeURIComponent(value); }
  catch { return null; }
}
```
Jeśli `null` → 400 (ErrorEnvelope) i koniec.

---

## 5) Serwowanie plików w UI: wzmocnij ochronę przed path traversal „na 100%”

W `apps/fleet-ui/server.js` masz:
- `path.normalize(decoded).replace(/^(\.\.(\/|\|$))+/, '')`

To pomaga, ale najtwardszy wzorzec to:

1) `const resolved = path.resolve(ROOT_DIR, '.' + decodedPath)`  
2) sprawdź `resolved.startsWith(ROOT_DIR + path.sep)`  
3) jeśli nie, zwróć 403

To zamyka klasę problemów typu „dziwne kombinacje separatorów / symlinków / unicode”.

---

## 6) Keep-alive w HTTP klientach: mniej latency, mniej portów w TIME_WAIT, mniej losowych timeoutów

W `apps/fleet-core/mvp0/gateway_client.js` jest goły `http.request` bez agent keep-alive.  
W `apps/fleet-gateway/lib/http.js` też.

Przy tickach i częstych requestach brak keep-alive może powodować:
- setki nowych połączeń,
- ephemeral port exhaustion,
- skoki latencji,
- większą podatność na krótkie network blipy.

**Prosty upgrade**
- stwórz `const agent = new http.Agent({ keepAlive: true, maxSockets: 50 });`
- przekazuj `agent` w request options.

To jest jeden z tych „nudnych” trików, które robią ogromną różnicę w praktyce.

---

## 7) Runtime MVP0: optymalizacje i drobne uproszczenia, które poprawiają skalowanie

### 7.1. O(n²) w `tick` przy parkowaniu
W `apps/fleet-core/mvp0/runtime.js` w sekcji parkowania masz:

- dla każdego robota `tasks.some(...)`

To robi zbędną pracę. Wcześniej i tak budujesz `activeTaskByRobot`. Najprościej:
- utrzymuj mapę „robot ma aktywne zadanie” i użyj jej do parkowania.

To przy większej liczbie robotów i tasków robi różnicę.

### 7.2. Deep copy stanu na każdym ticku (koszt CPU/GC)
`getState()` i `tick()` kopiują obiekty (taski, kroki). Przy dużym stanie to robi:
- koszt JSON.stringify + koszt kopii,
- garbage collector overhead.

**Opcje**
- A) utrzymuj stan jako obiekty „read-only” i zwracaj referencje (ryzyko mutacji przez caller → zabezpiecz, np. freeze),
- B) rozdziel: internal state vs „view model” i buduj view model tylko gdy ktoś subskrybuje (SSE) lub na żądanie.

Minimalne rozwiązanie: nie kopiuj `steps`, jeśli UI i tak ich nie używa na każdej ramce.

---

## 8) `payload_too_large`: teraz kończy się resetem połączenia zamiast kontrolowanego 413

W kilku usługach `readJsonBody` robi `req.destroy(err)` gdy body > limit.

To bywa ok w narzędziach wewnętrznych, ale z perspektywy klienta i debugowania lepiej:
- odpowiedzieć `413 Payload Too Large` + ErrorEnvelope,
- ewentualnie dodać `Connection: close`.

**Uproszczenie**
- przestać zbierać body po przekroczeniu limitu (odpiąć `data`),
- wysłać odpowiedź i zakończyć.

---

## 9) Ujednolicenie nazw i DTO: `id` vs `robotId` i inne „pomyłkogeneratory”

W repo różne komponenty używają różnych nazw:
- UI często ma `id`
- core/gateway używa `robotId`

To jest normalne w prototypach, ale przy rozwoju rodzi klasę błędów „podałem zły klucz”.

**Profesjonalny, prosty wzorzec**
- zrób `packages/fleet-types` z:
  - definicjami (choćby JSDoc) typu `RobotId`, `TaskId`, `CommandId`
  - funkcjami konwersji `uiRobotToCoreRobotId(...)`
- dodaj `// @ts-check` + JSDoc w kluczowych plikach → dostajesz dużo korzyści TypeScript bez przepisywania projektu na TS.

---

## 10) Monorepo ergonomia: jeden install, jeden test, jeden lint

Na root nie ma `package.json`, więc:
- każdy app instaluje się osobno,
- nie ma jednego polecenia „odpal wszystko”, „testuj wszystko”, „sprawdź format”.

**Minimalny upgrade**
- root `package.json` z `workspaces: ["apps/*", "packages/*"]`
- root scripts:
  - `dev` (uruchamia stack)
  - `test` (leci po workspace’ach)
  - `lint` (nawet jeśli na start tylko „node -c” i proste checki)

**Efekt**: wejście nowego dev-a staje się 3× łatwiejsze.

---

## 11) Wyjście poza „logi”: wprowadź eventy domenowe (nawet tylko w pamięci)

Dzisiaj core wysyła „state snapshot” przez SSE. To jest proste, ale drogie (duże payloady, częste stringify).

**Lepszy model**
- emituj eventy domenowe:
  - `TASK_CREATED`
  - `TASK_ASSIGNED`
  - `TASK_COMPLETED`
  - `LEASE_SEIZED`
  - `COMMAND_SENT`
- UI subskrybuje event stream i aktualizuje lokalny stan.

Możesz nadal robić snapshot raz na X sekund jako „catch-up”.

To jest też idealny fundament do persistencji przez JSONL (event log), bez natychmiastowego wprowadzania bazy.

---

## 12) Komendy i ack: dzisiaj core ignoruje odpowiedź gateway

W `fleet-core/server.js` core wysyła komendę przez `gatewayClient.sendCommand(...)` i w zasadzie nie analizuje `status/body`.

To oznacza:
- core nie wie, czy komenda została zaakceptowana,
- runtime nie ma feedbacku do sterowania retry/porażką,
- debugging „dlaczego robot nie ruszył” jest trudniejszy.

**Pro upgrade**
- `gateway_client.sendCommand` powinien:
  - parsować JSON,
  - zwracać strukturalny `ack`,
  - mapować błędy na kody.
- core powinien:
  - logować `commandId`, `robotId`, `transport.status`, `statusReasonCode`,
  - opcjonalnie zapisywać `COMMAND_ACKED/FAILED` jako event.

---

## 13) Deduplikacja i pamięć w gateway: Map TTL działa, ale można zrobić to czyściej

W `apps/fleet-gateway/lib/gateway.js` dedup jest w `entry.commandDedup` z TTL, ale:
- pruning odbywa się przez skan całej mapy w `pruneDedup` na każdym `sendCommand`.

Przy większym natężeniu komend to może być kosztowne.

**Uproszczenia**
- A) ogranicz rozmiar mapy (max N wpisów) — najprostsze.
- B) trzymaj kolejkę czasów dodania i usuwaj „z przodu” aż TTL się zgadza (O(1) amortyzowane).

---

## 14) „Fail fast” vs „fail safe”: świadoma polityka na poziomie procesu

Dodaj świadome zachowanie przy błędach globalnych:

- `process.on('unhandledRejection', ...)`
- `process.on('uncaughtException', ...)`

Dwie sensowne strategie:
- **fail fast** (log + exit, restart przez systemd/k8s) — zwykle lepsze w prod
- **fail safe** (log + próbuj dalej) — lepsze w dev narzędziach

Najważniejsze: ustalić to jawnie w docs i configu.

---

## 15) Dokumentacja „dla człowieka od wdrożeń”: konkretne checklisty

W spec masz dużo treści „co system powinien robić”. Dołóż dokumenty „jak go utrzymać”:

- `docs/ops/checklist-prod.md`
  - ustawienia timeouts,
  - auth włączony,
  - CORS ograniczony,
  - log retention,
  - backup snapshotów,
  - limity SSE,
  - monitoring `/metrics`.
- `docs/ops/incident-playbook.md`
  - „robot stoi” → kroki diagnozy,
  - „gateway offline” → kroki diagnozy,
  - „SSE lag” → kroki diagnozy.

To jest ta dokumentacja, która realnie oszczędza godziny.

---

## 16) Mała rzecz, duży efekt: „compat test” configów z `fleet-init`

`bin/fleet-init.js` kopiuje template configi do `~/fleet_data/config`. Świetnie.

Dodaj test w CI:
- uruchom `fleet-init` w temp dir,
- potem odpal `--validate-config` (gdy dodasz walidację) dla każdej usługi,
- upewnij się, że stack startuje w „happy path”.

To zabezpiecza przed sytuacją „zmieniliśmy pole w configu i zepsuliśmy onboarding”.

---

## Proponowany „pakiet usprawnień v3” (najlepszy stosunek efekt/koszt)

1) wrap async handler + safeDecode + 413 zamiast resetu  
2) SSE backpressure (drop slow clients) + retry header  
3) tickLoop bez overlap + metryka tick duration  
4) keep-alive agent w klientach HTTP  
5) root workspaces + jeden script „test all”  
6) parse i log ack z gateway + eventy domenowe (minimum)

---

Ten zestaw robi system bardziej „pro”: mniej przypadkowych crashy, mniej tajemniczych timeoutów, mniej problemów przy większym obciążeniu, łatwiejszy debug. Najważniejsze: większość zmian jest **lokalna** i nie wymaga przebudowy architektury.
