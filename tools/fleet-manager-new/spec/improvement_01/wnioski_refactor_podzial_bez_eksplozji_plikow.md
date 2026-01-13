# Uproszczenie i „twardszy” podział projektu bez eksplozji plików (wnioski + plan refaktoru)

Poniżej są propozycje refaktoru **struktury projektu** (nie tylko API), ze szczególnym naciskiem na:
- lepszy podział na części (czytelne granice),
- uproszczenie uruchamiania i utrzymania,
- mniejszą liczbę duplikatów,
- **bez tworzenia setek małych plików** (raczej kilka „modułów‑klocków” po ~150–400 linii).

Oparłem to o realny stan repo – m.in.:
- identyczne kopie `lib/config.js` w kilku aplikacjach (`apps/fleet-core`, `apps/fleet-gateway`, `apps/algorithm-service`, `apps/map-compiler`),
- powtarzający się kod CLI (`parseArgs`, `expandHome`, `resolveFleetDataDir`, `resolveConfigPath`) w wielu `cli/cli.js` + `bin/fleet-init.js`,
- powtarzające się helpery HTTP (`sendJson`, `readJsonBody`, CORS/OPTIONS) w wielu `server.js`,
- test `apps/fleet-core/tests/mvp0_stream_e2e.test.js` importuje `readJson5` z `apps/map-compiler/lib/config.js` (to jest niepotrzebne spięcie między aplikacjami).

---

## 1) Największy „quick win”: wspólna warstwa platformowa (ale w 2–3 plikach, nie 30)

### 1.1 Co dziś boli
Masz te same fragmenty kodu skopiowane w wielu miejscach:
- **JSON5/config** (`stripJsonComments`, `stripTrailingCommas`, `mergeDeep`, `loadConfig`)
- **CLI** (parsowanie argsów, `FLEET_DATA_DIR`, domyślne ścieżki configów)
- **HTTP** (CORS, OPTIONS, JSON body, `sendJson`, `sendText`)

To zwiększa liczbę miejsc do naprawy błędu i robi „rozjazdy” między usługami.

### 1.2 Proponowany ruch: jeden wspólny moduł platformy
Zamiast powielać kod w każdej aplikacji, dodaj **jeden** wspólny moduł, np.:

**Opcja A (najmniej plików):** `packages/robokit-lib/platform.js`  
W środku 3 sekcje:
- `config` (readJson5 + mergeDeep + loadConfig)
- `cli` (parseArgs + resolveFleetDataDir + resolveConfigPath + printHelp helpers)
- `http` (sendJson/sendText/readJsonBody/sendOptions + mały router)

**Opcja B (bardziej czysto, nadal mało plików):** `packages/robokit-platform/{config.js,http.js,cli.js}`  
To są **3 pliki** – i koniec.

Efekt:  
W każdej aplikacji kasujesz własne `lib/config.js` i skracasz `server.js`/`cli.js`.

> Najlepsza część: to **zmniejsza liczbę plików w repo**, bo kasujesz duplikaty.

### 1.3 Bonus: rozwiązuje „dziwny import” w testach
`fleet-core/tests/...` nie powinny importować parsera configów z `map-compiler`.  
Po refaktorze testy używają `platform.config.readJson5`.

---

## 2) Ujednolicona „rama” aplikacji (standardowy szkielet), ale tylko 3–4 pliki na usługę

### 2.1 Cel
Każda usługa ma podobny układ, żeby:
- szybciej się w niej odnaleźć,
- mieć powtarzalny sposób dodawania endpointów,
- nie puchł `server.js`.

### 2.2 Minimalny szkielet (bez rozrostu plików)
Zamiast długiego `server.js` z setką `if (...) return;`, zrób:

```
apps/<service>/
  server.js        # tylko start + wiring
  api.js           # routing + handlers (public)
  app.js           # composition root (tworzy runtime/clients/store)
  cli/cli.js       # bardzo cienkie (z platform.cli)
```

To są **3 pliki + CLI**.  
W wielu przypadkach `app.js` możesz nawet pominąć i mieć `server.js + api.js`.

### 2.3 Router bez frameworka (żeby nie dokładać zależności)
W `platform.http` dodaj mini-router:
- tablica routów: `{ method, path, match?, handler }`
- wspólna obsługa: OPTIONS/CORS, JSON parsing, błędy

To usunie 90% powtarzalnego kodu w `apps/*/server.js`.

---

## 3) Lepszy podział Fleet Core: „runtime” za interfejsem + „feature sections” w jednym pliku API

### 3.1 Problem w `apps/fleet-core/server.js`
W jednym pliku mieszasz:
- wybór trybu runtime (`mvp0` vs `dcl`),
- routing HTTP,
- SSE,
- lease/scenes/tasks/robots,
- wysyłkę komend do gateway,
- log sink.

To jest OK na MVP, ale trudne do rozwijania bez regresji.

### 3.2 Proponowany podział bez mnożenia plików
**A) Warstwa runtime jako interfejs**  
Zrób `apps/fleet-core/runtime.js`, który ukrywa różnice między:
- `./mvp0/runtime`
- `./orchestrator/runtime_dcl`

i wystawia jedno API:
- `tick({nowMs})`
- `getState()`
- `createTask(task, nowMs)`
- `upsertRobotStatus(robotId, status, nowMs)`

To usuwa logikę „if runtimeMode==...” z wielu miejsc.

**B) API jako jeden plik z sekcjami**  
Zamiast wielu małych handlerów, trzymaj w `apps/fleet-core/api.js` sekcje:
- `// health`
- `// state + sse`
- `// lease`
- `// scenes`
- `// tasks`
- `// robots`

To jest nadal **jeden plik**, ale logicznie podzielony.

---

## 4) Fleet UI: oddziel „UI statyczne” od „mock/symulatora” (najlepiej bez dodawania plików w UI)

### 4.1 Dziś
`apps/fleet-ui/server.js` robi naraz:
- serwowanie statycznych plików,
- hostowanie `/api/fleet/*` i `/api/scenes*` (mock),
- symulację ruchu,
- opcjonalny sync do Core.

To jest wygodne na demo, ale miesza warstwy.

### 4.2 Docelowo: UI bez backendu
Najprostsze uproszczenie projektu:
- UI = czyste statyczne pliki (można serwować z Core albo z dowolnego static hosta)
- mock/sim = osobny proces (nawet nadal Node, ale osobna aplikacja)

Żeby nie robić wielu plików:
- zostaw `fleet-ui/server.js` tylko jako **dev tool**,
- a w trybie „normalnym” UI nie potrzebuje go wcale.

To zmniejsza liczbę zależności „co musi działać, żeby UI się otworzyło”.

---

## 5) Monorepo bez bólu: root `package.json` z workspaces (1 plik, ogromna ulga)

### 5.1 Co dziś jest mało ergonomiczne
Wiele importów leci po ścieżkach typu:
`../../../packages/robokit-lib/...`

Da się z tym żyć, ale:
- każdy refaktor ścieżek boli,
- trudniej robić porządne zależności i wersjonowanie.

### 5.2 Minimalna zmiana
Dodaj **jeden** plik na root:

`package.json`:
- `"workspaces": ["apps/*", "packages/*"]`

Wtedy:
- aplikacje deklarują zależności na `robokit-lib`, `robokit-protocol`, `robokit-sim-core`,
- importy robią się krótsze i stabilniejsze (subpath imports).

To nie dodaje „wielu plików”, a czyści half repo z `../../../`.

---

## 6) „Duże moduły, mało plików”: konkretne zasady, które działają w praktyce

### 6.1 Heurystyka rozmiaru pliku
- < 40 linii: zwykle scal z sąsiadem (chyba że to typy/kontrakt)
- 100–400 linii: często „sweet spot”
- > 600–800 linii: rozbij (ale w 2–3 sensowne klocki, nie 15 mikro-plików)

### 6.2 Granice podziału: trzy proste pytania
Każdy moduł powinien odpowiadać na jedno z pytań:
1. „Jak przychodzi/wychodzi IO?” (HTTP/SSE/TCP, pliki) – infrastruktura
2. „Co system robi?” (taski, lease, routing) – domena
3. „Jak to skleić?” (wiring zależności) – composition root

Jeśli w jednym pliku są wszystkie 3 naraz, rośnie ryzyko regresji.

### 6.3 „Feature folders” bez folderów
Możesz mieć **jeden plik `api.js`**, ale w środku sekcje „feature” zamiast osobnych plików.
To daje:
- czytelne granice,
- brak eksplozji plików.

---

## 7) Refaktor krok po kroku (żeby nie utopić się w zmianach)

### Krok 1 — Platform utilities (największy zwrot)
- dodaj `platform.(config/http/cli)`
- podmień w 2 usługach (np. fleet-core + fleet-gateway)
- usuń duplikaty `lib/config.js`, `sendJson`, `readJsonBody`, `parseArgs`

### Krok 2 — Service skeleton
- w każdej usłudze wprowadź `api.js` (routing + handlers)
- `server.js` zostaje tylko bootstrapem

### Krok 3 — Fleet-core runtime facade
- `runtime.js` jako wspólny interfejs mvp0/dcl
- mniej ifów w serwerze, mniej coupling

### Krok 4 — Workspace
- root `package.json` + zależności
- uproszczone importy

Każdy krok daje wartość sam w sobie, więc nie musisz robić wszystkiego na raz.

---

## 8) Najważniejsze wnioski

1. **Najbardziej opłaca się wyciąć duplikaty** (config/cli/http) do jednego modułu platformy – to jednocześnie upraszcza i uodparnia system.  
2. **W każdej usłudze trzymaj max 3–4 pliki “rdzenia”** (bootstrap + api + app/runtime). To daje porządek bez drobnicy.  
3. **Fleet-core** zyskuje najbardziej na oddzieleniu „runtime selection” od „HTTP routing” (interfejs runtime).  
4. **UI** powinno dążyć do bycia statycznym klientem; mock/symulacja niech będzie osobno.  
5. Root workspaces to **1 plik**, a usuwa mnóstwo „../../../” i problemów z zależnościami.

