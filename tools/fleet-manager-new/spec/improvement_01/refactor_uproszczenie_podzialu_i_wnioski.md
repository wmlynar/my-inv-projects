# Jak uprościć i ulepszyć podział projektu (bez mnożenia małych plików) + pomysły na dalszy refactor

Poniżej masz propozycje “architektonicznego porządku” dla całego repo: **lepszy podział na części, mniej sprzężeń, mniej duplikacji**, ale też wyraźnie: **bez rozbijania wszystkiego na dziesiątki mikro‑plików**.

Bazuję na aktualnym układzie folderów (`apps/*`, `packages/*`) i na tym, jak dziś wyglądają kluczowe moduły:
- `apps/fleet-core/server.js`, `apps/fleet-core/mvp0/*`, `apps/fleet-core/orchestrator/*`
- `apps/fleet-gateway/server.js`, `apps/fleet-gateway/lib/*`
- `apps/fleet-ui/server.js`, `apps/fleet-ui/public/*`
- powielane helpery: `readJsonBody`, `sendJson`, `lib/config.js` itd.

---

## 1) Najprostsze zasady podziału (żeby było czytelnie i stabilnie)

### Zasada A — “1 serwis = 1 odpowiedzialność”
- **fleet-core**: stan domenowy floty + orkiestracja + API dla UI.
- **fleet-gateway**: integracja z providerami + normalizacja telemetrii + dedup/dispatch komend.
- **symulator / mock backend**: osobny serwis (nie UI).
- **UI**: tylko frontend + (ewentualnie) statyczny serwer.

To usuwa sytuacje, gdzie UI robi jednocześnie za “mock gateway”, “symulator” i “źródło telemetrii”.

### Zasada B — “Domain vs I/O”
W każdym serwisie rozdziel:
- **domain**: czysta logika (stan, reguły, decyzje), bez HTTP, bez plików, bez network.
- **adapters**: gateway client / algorithm client / storage / provider.
- **app** (composition root): skleja domain + adapters i wystawia HTTP.

To daje odporność i testowalność. I co ważne: da się to zrobić w **kilku większych plikach**, nie w 50 małych.

### Zasada C — “Pliki dzielimy po pojęciach, nie po funkcjach”
Nie “jeden plik na 20 linii”, tylko:
- **1 plik na spójny koncept** (np. `lease`, `scenes`, `commands`, `telemetry`).
- Dopiero gdy plik robi się naprawdę ciężki (np. >600–800 linii), dzielisz go na 2–3 większe.

---

## 2) Największy zysk: wyciągnąć wspólne helpery do jednego większego pakietu (mniej plików łącznie)

Dziś w wielu serwisach powielają się:
- `sendJson`, `readJsonBody` (różne warianty),
- parsing JSON5 (`lib/config.js`) – identyczny kod w core i gateway (i prawdopodobnie innych),
- “createId” – jest w `fleet-core/server.js`, `mvp0/runtime.js`, `orchestrator/runtime_dcl.js`,
- CORS i nagłówki,
- drobne utilsy (timestampy, deep merge, itp.).

### Propozycja: jeden pakiet `packages/fleet-kit/`
Zamiast 10 małych paczek — **jedna paczka** z kilkoma plikami (albo nawet jednym większym), np.:

```
packages/fleet-kit/
  index.js          # export wszystkiego
  http.js           # sendJson, readJsonBody, route helpers, CORS, error handling
  config.js         # loadConfig/readJson5/mergeDeep (obecny kod z lib/config.js)
  ids.js            # createId + ewentualnie stableId/hash
  errors.js         # ErrorEnvelope + sendError
  time.js           # nowMs, sleep, deadlines
```

Efekt netto:
- dodajesz 4–6 plików w jednym miejscu,
- usuwasz duplikację z 6–8 serwisów → repo ma **mniej** plików do utrzymania, a nie więcej,
- zachowanie API jest spójne (ten sam parser body, te same błędy, te same statusy).

---

## 3) Lepszy podział fleet-core (bez eksplozji plików)

### Problem dziś
- `apps/fleet-core/server.js` robi dużo: HTTP, walidacje, lease, scenes, task API, stream, tick loop, logika integracji (gateway).
- Macie też równolegle `mvp0/*` i `orchestrator/*` – dwa “światy” runtime, co utrudnia rozumienie “co jest produkcyjne”.

### Propozycja: 6–8 większych modułów w core
Zamiast rozbijać na 30 plików, zrób wyraźne “klocki”:

```
apps/fleet-core/
  server.js                # bootstrap + wiring, minimalny
  core_app.js              # kompozycja domain + adapters, uruchomienie pętli
  core_http.js             # routing + endpointy (w jednym miejscu)
  core_domain.js           # stan + reducery/eventy (jeden plik)
  core_runtime.js          # tick + polityki (stale telemetry, hold, cooldown)
  command_dispatcher.js    # outbox + retry + dedup po commandId (port na gateway)
  adapters/
    gateway_client.js      # HTTP client do gateway (jedna implementacja)
    algorithm_client.js    # jeśli potrzebne
  storage.js               # JSONL + snapshoty (jeśli to robicie “na serio”)
  orchestrator/            # patrz sekcja 4 (po refactorze będzie mniej plików)
```

To jest nadal mało plików (kilka), a zyskujesz:
- jasną separację domeny od I/O,
- łatwość testowania runtime bez serwera HTTP,
- możliwość łatwego przełączenia “orchestrator engine” (MVP vs DCL) bez mieszania kodu.

### Jedno ważne uproszczenie: wyrzucić “mvp0” jako osobny świat
Długoterminowo są dwa sensowne warianty:
1) **MVP0 zostaje jako implementacja runtime**, ale przenosicie go pod wspólny interfejs, np. `core_runtime_mvp.js`.
2) **DCL orchestrator jest docelowy**, a MVP0 po prostu znika (usuwa pliki i nie miesza w mental modelu).

Oba warianty upraszczają repo — ważne, żeby docelowo nie utrzymywać dwóch równoległych runtime’ów bez wyraźnej granicy.

---

## 4) Orchestrator: jak go uprościć i zmniejszyć liczbę plików (konkretny merge plan)

W `apps/fleet-core/orchestrator/` jest sporo plików bardzo małych (20–30 linii). To jest czytelne w TDD, ale na dłuższą metę bywa męczące.

### Propozycja: z 14–15 plików zrobić 6–8 (większych, spójnych)
**Aktualne pliki** (wybrane, z grubsza):
- `core.js` (duży)
- `graph.js`, `model.js`, `map_index.js`
- `corridor_requests.js`, `route_plan.js`, `hold_point.js`
- `locks.js`, `lock_manager_dcl.js`
- `runtime_dcl.js`, `rtp_controller.js`, `progress.js`
- `log_sink.js`, `replay_runner.js`, `adapter.js`

**Po refactorze (przykład układu):**
- `orchestrator/index.js` — publiczne API (create/run/replay)
- `orchestrator/engine.js` — główna logika (to, co dziś jest w `core.js` + “klej”)
- `orchestrator/model.js` — model domenowy + typy struktur
- `orchestrator/graph.js` — graf i algorytmy grafowe
- `orchestrator/locks.js` — scalenie: `locks.js` + `lock_manager_dcl.js`
- `orchestrator/routing.js` — scalenie: `route_plan.js` + `corridor_requests.js` + `hold_point.js`
- `orchestrator/runtime.js` — scalenie: `runtime_dcl.js` + `rtp_controller.js` + `progress.js`
- `orchestrator/replay.js` — scalenie: `log_sink.js` + `replay_runner.js` (+ ewentualnie `adapter.js`)

To zmniejsza liczbę plików o ~2×, a nadal trzyma logikę “w paczkach pojęć”.

---

## 5) fleet-gateway: podział jest już niezły, ale można go uprościć jeszcze bardziej

Gateway ma niewiele plików (`lib/codec.js`, `lib/gateway.js`, `lib/providers.js`, `lib/robokit.js`, `lib/http.js`).

### Drobne usprawnienie struktury (bez mnożenia plików)
Zamiast mieszać providery w jednym module, zrób katalog `providers/` i trzy większe pliki (po 1 na provider), ale **nie** rozdrabniaj na “każda funkcja osobno”.

```
apps/fleet-gateway/
  server.js
  gateway_app.js        # lifecycle (start/stop), telemetry loop, cache, dedup
  gateway_http.js       # endpointy (commands, robots, provider-switch)
  codec.js              # walidacja + normalizacja
  providers/
    internal_sim.js
    robokit.js
    robocore.js
  http_client.js        # retry/backoff/jitter (wspólne)
```

To jest 8–10 plików w całym serwisie – nadal mało, a czytelność rośnie.

---

## 6) UI: największe uproszczenie to “UI nie jest backendem symulacji”

Dziś `apps/fleet-ui/server.js` jest duży i robi sporo rzeczy backendowych (w tym “mock gateway”). To miesza warstwy.

### Propozycja bez mnożenia plików
- UI server zostaje prosty: statyczne pliki + 1–2 endpointy pomocnicze (jeśli w ogóle).
- Symulacja przechodzi do osobnego appa (może to być cienka nakładka na istniejące `apps/robokit-robot-sim` albo nowy `apps/internal-sim`).

W repo macie już kierunek w `spec/13_ui-mock-extraction-plan.md` — warto to “dowieźć”, bo to jest największa mentalna redukcja złożoności.

---

## 7) “Nie róbmy 100 paczek”: jak dzielić na packages sensownie

Zamiast tworzyć po paczce na każdy drobiazg, traktuj `packages/` jak miejsce na **kilka “grubszych” bibliotek**:

1) `fleet-kit` — wspólne utilsy (http/config/errors/ids/logging)  
2) `fleet-protocol` — OpenAPI/JSON Schema + generowane typy (źródło prawdy kontraktu)  
3) (opcjonalnie) `fleet-orchestrator` — jeśli orchestrator ma być współdzielony lub testowany niezależnie od core  
4) (opcjonalnie) `map-compiler-core` — jeśli map-compiler ma być używany jako biblioteka

To dalej jest mała liczba paczek, a redukuje duplikację.

---

## 8) Refactor “bez big-bang”: jak to zrobić krokami i nie zwariować

### Krok 1 — wspólne helpery (niski risk, duży zysk)
- dodaj `packages/fleet-kit`
- zacznij używać go w 1 serwisie (np. fleet-core), potem w kolejnych
- usuń duplikaty `readJsonBody/sendJson/config` z appów

### Krok 2 — uporządkować core w 2 większe pliki: `core_http.js` i `core_app.js`
- `server.js` ma być tylko bootstrapem (czytelny start)
- route’y przenieś do jednego modułu (żeby nie rozrywać po plikach)

### Krok 3 — CommandDispatcher i “outbox” (żeby tick był czysty)
- domena planuje, dispatcher wykonuje
- to stabilizuje system i pozwala łatwo przenosić kod

### Krok 4 — merge orchestratora (mniej plików, te same testy)
- najpierw “barrel” (`orchestrator/index.js`) bez przenosin logiki
- potem merge małych plików w większe (routing/locks/replay/runtime)
- testy powinny przejść bez zmiany zachowania

### Krok 5 — wynieść symulację z UI
- core zawsze gada z gateway
- gateway gada z sim-service
- UI nie pośredniczy w telemetrii

---

## 9) Wnioski (czyli: co najbardziej upraszcza projekt bez rozdrabniania)

1) **Jedna paczka “fleet-kit”** na powielane helpery → mniej plików i mniej niespójności.  
2) **Core podzielony na 6–8 większych modułów**: domain/runtime/dispatcher/http/adapters/storage.  
3) **Orchestrator scalić do 6–8 plików** według pojęć (routing/locks/runtime/replay/engine/model/graph).  
4) **UI przestaje być backendem symulacji** → najprostsze mentalnie i najbardziej niezawodne operacyjnie.  
5) **Kilka dużych packages zamiast wielu małych**: fleet-kit + fleet-protocol (+ ewentualnie fleet-orchestrator).  
6) Refactor robić krokami: najpierw wspólne utilsy i kompozycja, dopiero potem większe przestawienia.

To jest zestaw zmian, który zwykle *zmniejsza* złożoność repo i jednocześnie zwiększa odporność, bez wpadania w pułapkę “100 małych plików i nikt nie wie, gdzie co jest”.
