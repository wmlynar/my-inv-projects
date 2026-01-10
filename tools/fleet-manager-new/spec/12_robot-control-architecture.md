# Docelowa architektura sterowania robotem (v0.1)

## 1. Cel
Zaprojektowac architekture sterowania robotem tak, aby:
- byla czytelna, modularna i latwa do reuse,
- wspierala wiele interfejsow (CLI, web, Android),
- izolowala protokol RoboCore/Robokit w jednej warstwie,
- byla odporna na bledy sieciowe i rozlaczenia,
- egzekwowala zasady bezpieczenstwa (soft_emc, lease/lock).

## 2. Glowne komponenty

### 2.1 controller-core (biblioteka)
**Rola:** czysta logika sterowania, bez I/O.
- State machine: Manual/Task/Prompt/SoftEmc/Disconnected.
- Reduktor stanu (pure): `reduce(state, event) -> state`.
- Planner komend: generuje docelowe `motion/fork/goTarget`.
- Safety-gate: blokuje komendy przy `soft_emc` lub braku kontroli.
- Rate limiter i koalescencja komend.

**MUST:** brak bezposrednich zaleznosci od TCP/HTTP/WS.

### 2.2 robokit-transport (adapter)
**Rola:** komunikacja z robotem po RoboCore TCP.
- Obsuga portow: STATE, TASK, CTRL, OTHER, CONFIG.
- Reconnect per-port z backoff.
- Encode/Decode ramek (wspoldzielone z `robokit-lib`).
- Timeouty i korelacja ACK.

### 2.3 robot-control-service (gateway)
**Rola:** jedyny proces rozmawiajacy z robotem po TCP.
- Udostepnia API HTTP/WS dla UI.
- Konsoliduje komendy od klientow.
- Utrzymuje lease/lock (poziom kontroli).
- Rozglasza statusy w czasie rzeczywistym.

### 2.4 klienci (UI)
- CLI (np. console controller).
- Web UI.
- Android (lub inne).

**MUST:** klienci NIE lacza sie bezposrednio z robotem po TCP.

## 3. Interfejsy i protokoly

### 3.1 RoboCore/Robokit (TCP)
Tylko `robot-control-service` komunikuje sie z robotem.

Przyklady API:
- `CTRL`: `2010` motion, `2000` stop
- `OTHER`: `6004` soft_emc, `6040` forkHeight, `6041` forkStop
- `TASK`: `3051` goTarget
- `CONFIG`: `4005` seize, `4006` release
- `STATE`: `1100` status_all1

### 3.2 HTTP (REST)
Przyklad minimalnego API (MUST w MVP):
- `GET /robots/{id}/status`
- `POST /robots/{id}/soft-emc` `{ "enabled": true|false }`
- `POST /robots/{id}/fork` `{ "height": 0.5 }`
- `POST /robots/{id}/go-target` `{ "id": "LM1" }`
- `POST /robots/{id}/lock` `{ "clientId": "ui-123" }`
- `DELETE /robots/{id}/lock`

**Dopelnienia (SHOULD):**
- `GET /robots` lista robotow z health/online.
- `GET /robots/{id}/targets` lista LM/AP.
- `GET /robots/{id}/map` informacje o mapie/scenie (md5, name).

**Kody bledow (MUST):**
- `409` gdy brak lease.
- `423` gdy robot zablokowany przez lock.
- `503` gdy robot offline.

### 3.3 WebSocket (realtime)
- `/ws/robots/{id}/control` (komendy ruchu i statusy)
- Komendy:
  ```json
  {"type":"motion","vx":0.5,"w":0.2}
  {"type":"soft_emc","enabled":true}
  {"type":"fork","height":0.5}
  {"type":"go_target","id":"LM1"}
  ```
- Statusy:
  ```json
  {"type":"status","x":1.2,"y":-0.3,"yaw":1.57,"vx":0.1,"w":0.0,
   "current_station":"LM1","last_station":"AP2","soft_emc":false,
   "lock":{"locked":true,"clientId":"ui-123"}}
  ```

## 4. Model kontroli (lease/lock)

- Ka zdy klient ma `clientId` i role (viewer/controller).
- Kontrola jest przydzielana jako lease z TTL.
- Tylko jeden klient moze byc `controller`.
- Lease jest odnawiany przez heartbeat (WS lub REST).
- Po wyga sni eciu lease komendy ruchu sa odrzucane.

**MUST:**
- brak lease => brak wysylki komend ruchu,
- statusy sa dostepne dla wielu klientow jednoczesnie.

**Arbitraz (MUST):**
- Tylko jeden `controller` aktywny naraz.
- Komendy od klientow bez lease sa odrzucane z jawnym bledem.
- W konflikcie (dwa lease) zwyciezca to ostatni, pozostale sa uniewaznione.

## 5. Bezpieczenstwo

- `soft_emc=ON` ma absolutny priorytet i blokuje wszystkie komendy ruchu/widel/goTarget.
- `soft_emc` moze byc ustawiony przez dowolnego klienta, ale zwolnienie moze wymagac lease (konfigurowalne).
- Watchdog: brak komend ruchu przez `N` ms => auto stop.

**Zasady zwalniania soft_emc (MUST/SHOULD):**
- Opcja konfigurowalna: `soft_emc_release_requires_lease`.
- Gdy `true`, zwolnienie soft_emc bez lease zwraca `409`.

## 5.1 Bezpieczenstwo transportu (SHOULD)
- Autoryzacja: token JWT lub klucz API.
- TLS dla REST/WS (w srodowiskach produkcyjnych).
- Audyt: logi kto ustawil soft_emc, kto przejal lease.

## 6. State machine (controller-core)

Przykladowe stany:
- `Disconnected`
- `Idle`
- `ManualControl`
- `TaskActive`
- `SoftEmc`
- `Prompt`

Przykladowe przejscia:
- `Idle -> ManualControl` po komendzie motion
- `ManualControl -> Idle` po `stop` lub timeout
- `* -> SoftEmc` po `soft_emc=ON`
- `SoftEmc -> Idle` po `soft_emc=OFF`

**Relacja manual vs task (MUST/SHOULD):**
- Manual movement SHOULD pauzowac aktywny task.
- Powrot do tasku po `stop` jest opcjonalny i konfigurowalny.

## 7. Planowanie komend i rate limiting

- Komendy ruchu wysylane w stalych tickach (np. 10-20 Hz).
- Koalescencja: wysylaj tylko zmiany powyzej progu.
- ACK/timeout: komendy typu `goTarget/fork` maja potwierdzenia.

## 8. Odpor nosc na bledy

- Reconnect per port, niezalezny od UI.
- UI nie powinno blokowac sie przy braku polaczenia.
- Gateway musi utrzymac stan kontrolera nawet przy chwilowym braku TCP.

**SLA/timeouty (SHOULD):**
- Timeout ACK dla `goTarget/fork` np. 2-5s.
- Offline po braku statusu przez `T` sekund (konfigurowalne).

## 8.1 Multi-robot (MUST)
- Gateway MUSI utrzymywac izolowany stan per robot.
- API MUSI wspierac routing po `robotId`.

## 9. Observability

- Logi zdarzen (komenda, ack, status, error).
- Metryki (latencja ACK, reconnect count, dropped commands).
- Opcjonalny zapis raw ramek (dla diagnostyki).

**Trace (SHOULD):**
- `commandId` w logach i odpowiedziach.
- Korelacja `commandId` <-> ACK.

## 10. Konfiguracja

- Plik konfiguracyjny i flagi CLI dla:
  - host/port robota,
  - TTL lease,
  - tick rate,
  - limity predkosci,
  - parametry reconnect/backoff.

**Konfiguracja w pliku (SHOULD):**
- YAML/JSON5 z `robots[]`, `ports`, `limits`, `leaseTTL`, `softEmcReleasePolicy`.

## 11. Reuse w innych aplikacjach

- `controller-core` moze byc uzyty w:
  - CLI,
  - web UI,
  - aplikacji mobilnej,
  - testach automatycznych.

**MUST:** aplikacje klienckie nie implementuja RoboCore/Robokit.

## 12. Testy

- Unit: reducer + safety gate + planner.
- Integration: gateway + `robokit-robot-sim`.
- Golden: replay z proxy-recorder (opcjonalnie).

## 13. Deployment (SHOULD)
- Healthcheck HTTP (`/healthz`).
- Konfiguracja przez ENV + plik.
- Mozliwosc uruchomienia wielu instancji (per robot lub per site).
