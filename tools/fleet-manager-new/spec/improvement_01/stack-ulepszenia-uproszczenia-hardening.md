# Stack: dalsze ulepszenia, uproszczenia i „hardening” (odporność na błędy)

Poniżej jest lista konkretnych usprawnień do rozwiązania „jedna komenda uruchamia wszystko” – tak, żeby było bardziej profesjonalnie, spójnie, łatwiej w użyciu i trudniej do wysadzenia przypadkiem.

Dokument jest napisany pod Twoją obecną architekturę (kilka usług node + configi w `FLEET_DATA_DIR`).

---

## 1) Uprość konfigurację stacku: jedna definicja usług, a nie „hardcode” w `bin/fleet.js`

Wersja z `bin/fleet.js` jest świetna na start, ale docelowo warto przenieść definicję usług do pliku danych.

### Propozycja: `fleet-stack.json` (albo `.yaml`)

**`fleet-stack.json`** (w root repo):

```json
{
  "profiles": {
    "full": [
      {
        "name": "ui",
        "cwd": "apps/fleet-ui",
        "cmd": "node",
        "args": ["server.js"],
        "env": {"PORT": "8091", "HOST": "0.0.0.0"},
        "readyUrl": "http://127.0.0.1:8091/"
      },
      {
        "name": "gateway",
        "cwd": "apps/fleet-gateway",
        "cmd": "node",
        "args": ["cli/cli.js", "--config", "{configDir}/fleet-gateway.local.json5"],
        "env": {"FLEET_DATA_DIR": "{dataDir}"},
        "readyUrl": "http://127.0.0.1:8081/gateway/v1/health"
      },
      {
        "name": "core",
        "cwd": "apps/fleet-core",
        "cmd": "node",
        "args": ["cli/cli.js", "--config", "{configDir}/fleet-core.local.json5"],
        "env": {"FLEET_DATA_DIR": "{dataDir}"},
        "readyUrl": "http://127.0.0.1:8080/api/v1/health"
      }
    ]
  }
}
```

A w `bin/fleet.js` robisz tylko:
- odczyt pliku
- podstawienie `{dataDir}` i `{configDir}`
- odpalenie usług

**Efekt:** zmiana portu albo dodanie nowej usługi nie wymaga dotykania kodu launchera.

---

## 2) Preflight: wykryj problemy zanim odpalisz cokolwiek

Dla UX i odporności robi różnicę, jeśli launcher zanim uruchomi procesy, sprawdzi:

### 2.1. Konflikt portów
- sprawdź, czy `8080/8081/8091` są wolne
- jeśli zajęte: pokaż *kto* trzyma port (na Linux/macOS da się użyć `lsof -i` jako opcjonalne ulepszenie)

Minimalna implementacja w Node:
- spróbuj `net.createServer().listen(port)` → jeśli `EADDRINUSE`, port zajęty

### 2.2. Wersja Node i zależności
- `node -v` i wymagane minimum (np. Node 20)
- czy istnieją `node_modules` w appkach, albo czy jest workspace + instalacja zrobiona

### 2.3. Spójność configów
- jeśli core ma `gateway.baseUrl` ustawione na `8091`, a uruchamiasz profil `full`, launcher może ostrzec: „core będzie gadał do UI mock zamiast gateway”

---

## 3) Stabilne zatrzymywanie procesów: zabijaj całe drzewo, nie tylko PID

Na praktyce problemem są procesy-dzieci (np. jeśli coś odpala kolejne node’y, watchery, bundlery). `child.kill()` czasem nie wystarcza.

### 3.1. Uruchamianie w osobnej grupie procesów (Unix)
W `spawn()` ustaw:
- `detached: true`

I przy kill:
- `process.kill(-child.pid, 'SIGTERM')` (minus PID = grupa)

### 3.2. Windows
Windows nie wspiera tego samego modelu grup sygnałów. Najprościej:
- użyć małej biblioteki typu `tree-kill` (bardzo popularne),
- albo odpalać przez `taskkill /T /F` (brutalne, ale skuteczne).

**Dokumentacyjnie:** opisz, że Ctrl+C wyłącza cały stack i że launcher sprząta procesy.

---

## 4) Restart policy: który moduł restartować, a który ma „położyć stack”

Obecnie sensownie jest: jeśli padnie jeden serwis → zatrzymaj całość (łatwy debug).

W trybie bardziej „dev-friendly” warto zrobić konfigurację:

- UI: **restartuj automatycznie** (np. 3 próby, backoff 1s/2s/4s)
- Gateway: restartuj (często lepiej niż ubijać core)
- Core: zazwyczaj **nie restartuj w kółko**, bo to maskuje bugi

W praktyce:
- w definicji usługi dodaj `restart: { enabled: true, maxAttempts: 3, backoffMs: 1000 }`
- jeśli proces wyjdzie z kodem != 0 i restart włączony → uruchom ponownie
- jeśli max prób przekroczony → połóż stack

---

## 5) Logi: od „sklejonych linii” do profesjonalnego observability

Masz już dobry start (prefiks + pliki). Poniżej jest „ścieżka rozwoju”, która daje realną odporność i debugowalność.

### 5.1. Ustandaryzuj format logów we wszystkich usługach
Największy skok jakości daje przejście na logi ustrukturyzowane (JSON lines) w usługach.

**Minimalny standard pól:**
- `ts` (ISO)
- `level` (`debug|info|warn|error`)
- `service`
- `msg`
- opcjonalnie: `reqId`, `robotId`, `taskId`, `commandId`

Potem launcher może:
- jeśli linia jest JSON → parsuj i wypisz „ładnie”
- jeśli nie JSON → wypisz surowo

### 5.2. Korelacja end-to-end (`reqId`)
W gateway i core dodaj middleware:
- jeśli request ma `X-Request-Id`, użyj
- jeśli nie ma, wygeneruj i dodaj do response header
- przekazuj dalej w outbound requestach

**Efekt:** w logach widzisz jedną operację przez wszystkie moduły.

### 5.3. Log levels sterowane env
Wszystkie usługi powinny respektować:
- `LOG_LEVEL=debug|info|warn|error`

A launcher może mieć:
- `--log-level=...` i przekazywać do env każdej usługi

### 5.4. Rotacja logów
Jeśli zapisujesz do `stack.log`, to bez rotacji rośnie wiecznie.

Opcje:
- prosta rotacja po rozmiarze (np. 50MB → `stack.log.1`)
- albo po czasie (dziennie)

W dev MVP nawet prosta rotacja rozmiarowa robi robotę.

---

## 6) Health-checki: lepsze niż „port odpowiada”

`waitForHttpOk()` to dobry start, ale warto dodać bardziej semantyczne testy:

- `/health` powinno sprawdzać też zależności:
  - core: czy ma kontakt z gateway (jeśli w trybie full)
  - gateway: czy provider jest skonfigurowany, czy UI mock reachable

Wersja „pro”: `/ready` (gotowość) i `/live` (żywotność).
- `live` = proces żyje
- `ready` = proces gotowy do obsługi ruchu

---

## 7) Uczyń init mniej „magiczny”: jawne ścieżki i tryb „generate minimal config”

W testach i CI mocno przeszkadza zależność od `~/fleet_data`.

Ulepszenia:
- **wymuś** w dokumentacji i w launcherze: `FLEET_DATA_DIR` zawsze jawne (domyślnie `./.fleet_data`)
- `fleet-init` powinien mieć tryb:
  - `--minimal` (tylko core+gateway)
  - `--with-ui` / `--with-algo`

---

## 8) Ujednolicone komendy: `fleet up/down/status/logs/doctor`

Nawet jeśli to wszystko jest w `bin/fleet.js`, zrób UX jak w narzędziach typu docker/kubectl:

- `fleet up` – start
- `fleet down` – stop
- `fleet status` – pokaż PIDs/porty/health
- `fleet logs [service]` – tail (np. z `stack.log`)
- `fleet doctor` – preflight + diagnoza

**„Doctor”** jest nieoceniony przy onboarding’u: nowa osoba odpala i dostaje konkret: „masz zajęty port 8081” / „brakuje configu” / „core nie widzi gateway”.

---

## 9) Monorepo / workspaces: jedna komenda na build/test/format

Żeby „jedna komenda odpala wszystko” była wiarygodna, repo powinno też mieć:

- root `package.json` + workspaces
- `npm run dev` (albo `pnpm dev`) odpala `node bin/fleet.js up`
- `npm test` odpala testy w appkach
- `npm run lint` / `npm run format`

**Bonus:** wtedy CI jest trywialne.

---

## 10) Alternatywa: Docker Compose jako „deployment dev”

Compose daje od razu:
- jedna komenda: `docker compose up`
- wspólne logi z prefixami
- izolację zależności

Usprawnienia do compose:
- `healthcheck:` per service i `depends_on: condition: service_healthy`
- volume na `.fleet_data`
- profile compose (np. `--profile full` / `--profile mock`)

---

## 11) Najważniejszy „hardening” niezależnie od launchera

Launcher ułatwia życie, ale system i tak będzie kruchy, jeśli runtime nie jest odporny.

Warto dopiąć (kolejność sensowna):

1) **Lease enforcement** (żeby tylko jeden operator mutował stan)
2) **Try/catch w tick loop** + fail-safe
3) **Spójny format błędów** (`ErrorEnvelope`) w całym API
4) **Event log + snapshot** (odporność na restart)
5) **Idempotencja komend** (commandId generowany w core, dedup w gateway)

To są te elementy, które robią różnicę między „demo” a „system, który wytrzyma tydzień pracy”.

---

## Szybka checklista do dopisania w dokumentacji (DevEx)

- Wymagania: Node, porty, gdzie lądują dane (`FLEET_DATA_DIR`).
- Jedna komenda startu: `node bin/fleet.js up` + profile.
- „Co gdzie słucha”: lista portów.
- Gdzie są logi: `./.fleet_data/logs` + co jest w `stack.log`.
- Jak zatrzymać stack: Ctrl+C.
- Typowe problemy:
  - port zajęty
  - brak configów
  - core nie widzi gateway
  - JSON5 parser

