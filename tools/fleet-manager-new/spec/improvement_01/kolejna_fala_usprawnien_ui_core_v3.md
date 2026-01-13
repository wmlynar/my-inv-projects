# Jeszcze jedna fala usprawnień UI ↔ Core: „twarde” uproszczenia i hardening (v3)

Poniżej są kolejne propozycje ponad wcześniejsze dokumenty. Skupiam się na rzeczach, które często wychodzą dopiero po kilku dniach pracy systemu „na żywo”: wolne klienty SSE, restart Core, długie listy tasków, niejednoznaczne ACK dla komend, oraz ergonomia integracji.

Wskazuję też **konkretne miejsca w obecnym kodzie**, gdzie te problemy już „wiszą w powietrzu”.

---

## 0) Co już widać w kodzie i warto naprawić „od ręki”

### 0.1 Lease ma `expiresTsMs`, ale nigdzie się nie przedawnia
W `apps/fleet-core/server.js` lease ma pole `expiresTsMs`, ale:
- `GET /api/v1/state` zwraca lease nawet po czasie,
- `/control-lease/seize` robi konflikt nawet jeśli lease już wygasł,
- `/renew` nie sprawdza wygaśnięcia.

**Szybka poprawka:** przy każdym odczycie/operacji:
- jeśli `state.lease && state.lease.expiresTsMs <= nowMs()` → `state.lease = null` + emit event `leaseExpired`.

To usuwa sporą klasę „dziwnych” zachowań UI.

### 0.2 SSE fan-out nie ma backpressure i może pompować pamięć
W `broadcastState()` Core robi `res.write(data)` do wszystkich.
Jeśli klient (przeglądarka, proxy, VPN) nie nadąża:
- `res.write()` może zwrócić `false`,
- Node zaczyna buforować, a Ty wysyłasz dalej tick w tick.

**Szybka poprawka:** obsłuż `res.write()`:
- jeśli `false` → oznacz klienta jako „slow” i wysyłaj mu tylko najnowszy snapshot (drop backlog), albo rozłącz po N sekundach.

---

## 1) Zrób z Core także „BFF” dla UI: konfiguracja i sceny pod jednym originem

Dziś UI potrzebuje:
- `/api/fleet/config` (serwuje `fleet-ui/server.js`)
- `/api/scenes` (też serwuje `fleet-ui/server.js`)
- i dopiero potem idzie do Core (`/api/v1/*`) jeśli `coreApiBase` ustawione.

To komplikuje deployment (UI bez swojego serwera traci config i sceny).

### 1.1 Docelowo: Core serwuje UI-config
Dodaj w Core np.:
- `GET /api/v1/ui-config`

i zwracaj identyczny payload jak dziś `/api/fleet/config` (z `apiBase`, `statePath`, `streamPath`, `pollMs`, `simModeMutable`, `mvp0`).

**Efekt:** UI może być serwowane statycznie z CDN, a jedynym backendem jest Core.

### 1.2 Alias kompatybilności
Na czas migracji możesz w Core wystawić aliasy:
- `GET /api/fleet/config` → przekieruj do `/api/v1/ui-config`
- `GET /api/scenes` → przekieruj do `/api/v1/scenes?view=ui`

To jest „tanie”, a usuwa 2 klasy rozjazdów.

---

## 2) Uczyń streaming odpornym na „wolnych klientów” (backpressure + drop policy)

Jeśli SSE ma być niezawodne, musi mieć zasady:
- co robimy, gdy klient nie nadąża,
- jak często wysyłamy,
- co robimy przy braku zmian.

### 2.1 Zasada: „latest-wins” dla snapshotów
Dla eventu typu `stateSnapshot` (na etapie snapshotów) to jest idealne:
- jeśli klient jest slow, nie ma sensu mu wysyłać 10 starych snapshotów
- sens ma wysłanie **jednego: najnowszego**

Prosty model per klient:
- `pendingPayload` (ostatni snapshot do wysłania)
- `isWriting` / `drain` handler
- jeśli `write()` zwróci false → czekaj na `drain`, a w międzyczasie tylko podmieniaj `pendingPayload`.

### 2.2 Throttle i „send-on-change”
Teraz Core nadaje co `tickMs` nawet jeśli nic się nie zmieniło.

Ulepszenie:
- oblicz hash/wersję stanu (np. cursor albo checksum uproszczona),
- jeśli brak zmiany → nie wysyłaj `stateSnapshot`.

To obniża ruch, parsing w UI i zużycie CPU.

### 2.3 Heartbeat jako event (nie tylko komentarz)
Komentarz `: ping` jest OK, ale UI nie widzi go jako event.
Dodaj co np. 15s event:
- `event: heartbeat`
- `data: { tsMs, cursor }`

UI może wtedy wykrywać „połączenie żyje, ale stan się nie aktualizuje”.

---

## 3) Uporządkuj API w stylu „resource-oriented”, żeby `/state` nie puchł

Snapshoty są wygodne, ale:
- lista tasków będzie rosła,
- `robots` też może rosnąć,
- UI czasem potrzebuje tylko jednego fragmentu.

### 3.1 Wprowadź zasoby:
- `GET /api/v1/robots`
- `GET /api/v1/robots/:id`
- `GET /api/v1/tasks?status=active&limit=50&cursor=...`
- `GET /api/v1/tasks/:id`

I dopiero:
- `/api/v1/state?view=uiMinimal` jako bootstrap (robots + active tasks + lease + activeSceneId),
- resztę UI dociąga paginacją lub na żądanie.

### 3.2 Paginacja + „sinceCursor”
Dla tasków warto mieć:
- `GET /tasks?afterCreatedTsMs=...`
- albo `GET /tasks?fromCursor=...`

Wtedy UI nie musi przetwarzać całej historii w kółko.

---

## 4) Mutacje: dołóż formalne ACK i lifecycle dla komend oraz tasków

Dziś:
- `POST /api/v1/robots/:id/commands` zwraca `{ok, robotId, commandId}`
- ale nie ma oficjalnego sygnału, co się dalej stało (czy gateway wykonał, odrzucił, timeout).

### 4.1 Command lifecycle jako osobny strumień zdarzeń
Dodaj eventy:
- `commandAccepted` (Core przyjął i wysłał do gateway)
- `commandRejected` (walidacja, lease, unsupported)
- `commandDelivered` (gateway potwierdził przyjęcie) — jeśli gateway potrafi
- `commandTimedOut`

UI dzięki temu przestaje zgadywać.

### 4.2 Task lifecycle podobnie
Dziś UI mapuje statusy tasków do „In progress/Paused/Cancelled…”, ale Core task ma inne enumy (`created/assigned/.../canceled`).

Ustal formalny model:
- `taskCreated`
- `taskAssigned`
- `taskUpdated`
- `taskCompleted`
- `taskFailed`
- `taskCanceled` (jeden zapis!)

I dodaj `statusReasonCode` (już jest w runtime, ale UI go nie pokazuje).

---

## 5) „Optimistic concurrency” dla mutacji (małe, ale usuwa dziwne race)

Jeśli UI ma stan z cursorem `C`, a wysyła mutację, to dobrze jest wymagać:
- `ifStateCursor: C` (w body lub headerze `If-Match: "<cursor>"`)

Core wtedy:
- jeśli aktualny cursor != C → zwraca `409 state_changed` i UI robi resync.

To jest bardzo skuteczne przy wielu operatorach/zakładkach.

---

## 6) Zmień model „symulator w UI server” na osobną aplikację (upraszcza i utwardza)

W repo i tak masz symulatory (`apps/robokit-robot-sim`, `apps/robokit-rds-sim`).
`apps/fleet-ui/server.js` pełni naraz role:
- host UI,
- mock fleet,
- generator scen,
- i czasem „telemetria do Core”.

To jest wygodne na demo, ale miesza warstwy.

### 6.1 Docelowo:
- UI = statyczne pliki + config
- Symulacja = osobny proces „adapter/telemetry publisher”
- Core = jedyny API dla UI

Wtedy endpoint `POST /robots/:id/status` (internal) jest używany tylko przez sim/gateway, nie przez UI.

---

## 7) Zrób z `/health` coś naprawdę użytecznego: liveness vs readiness

Obecnie `/api/v1/health` zwraca `{status:'ok'}`.
To nie rozróżnia:
- „proces żyje” vs
- „proces gotowy obsługiwać ruch” (np. gateway działa, mapy wczytane).

Dodaj:
- `GET /health/live` → 200 jeśli proces działa
- `GET /health/ready` → 200 tylko jeśli runtime gotowy + gateway w sensownym stanie

To jest krytyczne przy orkiestracji (systemd/k8s).

---

## 8) Stabilność po restarcie: `serverInstanceId` + semantyka resync

Dodaj do `/state` i eventów:
- `serverInstanceId` (UUID generowany przy starcie Core)

UI:
- jeśli widzi zmianę `serverInstanceId` → robi hard resync (czyści cache i pobiera `/state`).

To rozwiązuje problemy typu: „SSE wznowiło się, ale core zgubił ring-buffer w pamięci”.

---

## 9) „Polityka kompatybilności” i migracje kontraktu (żeby refaktor nie był jednorazowy)

### 9.1 Wersja kontraktu i deprecjacje
Ustal:
- `contractsVersion` (semver)
- endpointy/stare pola oznaczone jako „deprecated” + data usunięcia

### 9.2 Testy kontraktowe w CI
Minimum:
- Core: test, że `/state` i eventy SSE walidują się schemą
- UI: test, że parser eventów i mapper task/robot nie wywala się na „unknown fields”

To jest najtańszy sposób na długoterminową niezawodność.

---

## 10) Drobne, ale ważne: Content-Type, 201 Created, Location

Dziś Core zwraca 200 dla `POST /tasks`.
Lepsza ergonomia:
- `201 Created`
- `Location: /api/v1/tasks/<id>`
- body: `{ ok:true, taskId, ... }`

Dodatkowo:
- dla POST wymagaj `Content-Type: application/json` (inaczej 415)
- waliduj `payload` (masz już `readJsonBody` z limitem — super; dorzuć schemę)

---

## TL;DR (co najbardziej „domyka” niezawodność w praktyce)

1) **Auto-expire lease** + (docelowo) fencing token.  
2) **SSE backpressure + latest-wins** dla snapshotów.  
3) **Core jako jedyny backend dla UI** (`ui-config`, sceny, aliasy).  
4) **Resource endpoints + paginacja**, żeby `/state` nie rósł bez końca.  
5) **Command/Task lifecycle eventy** (ACK, timeouty) – koniec zgadywania.  
6) **serverInstanceId** – proste, a usuwa chaos po restartach.

