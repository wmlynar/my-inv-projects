# Fleet Manager — modularizacja i refactoring „bez wysypu plików” (wnioski v4)

Cel: lepiej podzielić projekt na części, **zwiększyć spójność i odporność**, ale **nie wpaść w pułapkę 200 mikro-plików po 20 linii**. To jest plan w stylu „mniej plików, bardziej wyraźne granice, łatwiejszy debug”.

> Uwaga: w repo widać m.in. bardzo duży plik `apps/fleet-ui/server.js` (~1180 linii) oraz kilka bardzo małych plików w `apps/fleet-core/orchestrator/` (np. ~20–30 linii). To są dobre punkty zaczepienia do refaktoru.

---

## 0) Zasada przewodnia: „duże moduły, mało interfejsów”

Żeby nie mnożyć plików, trzymaj się heurystyki:

- **Moduł = 1 odpowiedzialność + 1 publiczny interfejs**.
- **1 moduł = 150–400 linii** (zwykle optimum czytelności).
- Jeśli plik ma >700 linii, to prawie zawsze jest „mini-aplikacją w środku” → trzeba go pociąć.
- Jeśli plik ma <40 linii i nie jest „typem/kontraktem” → często warto go scalić z sąsiadem.

I najważniejsze: *granice mają być ważniejsze niż styl* (czy to klasy, czy funkcje).

---

## 1) Największy „win”: pociąć `fleet-ui/server.js` na 4–6 modułów

`apps/fleet-ui/server.js` miesza kilka światów naraz (serwowanie statyczne, endpointy API, SSE, synchronizacja z core, symulacja/kinematyka). To działa, ale utrudnia:
- testowanie,
- poprawki bezpieczeństwa,
- wydajność (GC i serializacja),
- debugowanie (wszystko jest wszędzie).

### Proponowany podział (5 plików + 1 index)

Zamiast 30 mikro-plików, zrób 5 solidnych modułów:

1) `apps/fleet-ui/server.js`  
   - **tylko bootstrap**: config, stworzenie serwera, podpięcie routera, start/stop.

2) `apps/fleet-ui/http.js`  
   - `sendJson`, `readJsonBody`, limity payloadów, `safeDecode`, nagłówki security.
   - to jest wspólne „narzędzie serwera”.

3) `apps/fleet-ui/static.js`  
   - serwowanie plików i bezpieczne path resolution (path traversal hardening).

4) `apps/fleet-ui/api.js`  
   - `handleApi(req,res,pathname)` + cała logika `/api/*` (scenes/config itp.).

5) `apps/fleet-ui/sse.js`  
   - obsługa streamów (`/stream`), heartbeat, **backpressure** (slow client policy).

6) `apps/fleet-ui/core_sync.js` **albo** `sim.js` (zależnie od tego, co jest większe)  
   - synchronizacja z core (poll/stream), snapshoty zmian,
   - albo część symulacyjna (stepper, kinematyka).

> To daje ok. 6 plików zamiast 1 ogromnego, bez drobnicy.

### Bonus: „funkcyjny rdzeń + powłoka I/O”
- Logika symulacji i przeliczania (pure functions) → w `sim.js`.
- Kod HTTP (I/O) → w `server.js/api.js/static.js/sse.js`.

To minimalizuje liczbę miejsc, gdzie mogą powstać błędy związane z siecią/timeoutami.

---

## 2) Ujednolicić usługi HTTP bez mnożenia plików: jeden `service-kit`

W kilku aplikacjach powtarzają się te same motywy (routing, CORS, `readJsonBody`, błędy, requestId). Zamiast kopiować to w 5 miejscach:

### Proponowana paczka
`packages/fleet-service-kit/` jako **mały** pakiet (1–3 pliki max):

- `index.js` (publiczne API)
- `http.js` (read/send, limity, safeDecode, timeouts)
- `router.js` (prosty router tabelkowy)

To nie zwiększa liczby plików w aplikacjach — wręcz je zmniejsza.

### Router bez frameworka (ale czytelny)
Zamiast długich `if/else`, użyj tablicy tras:

```js
const routes = [
  ['GET',  /^\/api\/v1\/state$/,  stateHandler],
  ['POST', /^\/api\/v1\/tasks$/,  createTaskHandler],
  ['POST', /^\/api\/v1\/robots\/(.+)\/commands$/, commandHandler],
];

export function route(req, res) {
  const { method } = req;
  const path = new URL(req.url, 'http://x').pathname;
  for (const [m, rx, fn] of routes) {
    const match = (m === method) && rx.exec(path);
    if (match) return fn(req, res, match);
  }
  return sendJson(res, 404, { ... });
}
```

Plus wrapper `wrapAsync(fn)` → brak unhandled rejections.

---

## 3) Lepsze granice w `fleet-core`: trzy warstwy, ale mało plików

`apps/fleet-core/server.js` ma ~400 linii — jeszcze nie dramat, ale da się uporządkować.

### Podział (3–4 pliki)
- `server.js` — bootstrap + rejestracja tras
- `handlers.js` — same handlery HTTP (bez logiki runtime)
- `runtime_facade.js` — „interfejs” do runtime/orchestratora (tick, getState, createTask…)
- `sse.js` — jeśli SSE rośnie i zaczyna mieszać się z resztą

Ważne: nie twórz osobnego pliku na każdy handler — **jeden plik `handlers.js`** jest OK, dopóki ma <400–500 linii.

### Wzorzec: „dependency injection” bez ciężaru
Handlery nie powinny importować globali. Podaj zależności:

```js
export function makeHandlers({ runtime, gatewayClient, leaseStore, logger }) {
  return { getState, createTask, ... };
}
```

To ułatwia testy (mock runtime/gateway) bez tworzenia 20 plików.

---

## 4) `fleet-gateway`: prosty podział na „provider layer” i „api layer”

Gateway z natury jest „adapterem”. Żeby był czytelny:

- `server.js` (routing HTTP)
- `gateway.js` (logika: dedup, wybór providera, sendCommand)
- `providers/` zostaje, ale:
  - nie rób 15 plików providerów jeśli to 3 implementacje,
  - możesz trzymać „providers” jako 1 plik z kilkoma implementacjami, dopóki nie puchnie.

**Zasada**: providerzy mają wspólny interfejs, gateway ma jedną ścieżkę dla:
- listRobots,
- getStatus,
- sendCommand.

---

## 5) Orchestrator: mniej mikro-plików przez scalanie „prawie pustych” modułów

W `apps/fleet-core/orchestrator/` masz kilka plików ~20–30 linii (np. `hold_point.js`, `adapter.js`, `replay_runner.js`, `log_sink.js`, `progress.js`). Takie mikro-moduły zwiększają koszt poznawczy (skakanie po plikach), a nie zawsze coś zyskujesz.

### Sensowny refaktor bez „god file”
Scal je tematycznie do 3 większych plików:

1) `orchestrator/io.js`  
   - log sink + replay runner (I/O, pliki, strumienie)

2) `orchestrator/holds.js`  
   - hold points + progress + małe struktury „mechaniki”

3) `orchestrator/adapter.js` może zostać, jeśli jest „kontraktem” do świata zewnętrznego

Resztę większych plików (`core.js`, `graph.js`, `model.js`, `runtime_dcl.js`) zostaw — one już są „pełnymi modułami”.

### Dodatkowo: „barrel” export (bez nowych plików w aplikacji)
Dodaj `orchestrator/index.js`, który eksportuje publiczne API orchestratora. Wtedy inne części nie importują 12 ścieżek — importują jedną.

---

## 6) Refactoring taktyczny: jak to zrobić, żeby nie zepsuć projektu

Najbezpieczniejszy refaktor to taki, który w 80% jest mechaniczny.

### 6.1. Najpierw testy „bramki”
Nie musisz mieć dużej baterii testów. Wystarczą 3 „kanarki”:
- start serwera + `GET /health` = 200
- `GET /api/v1/state` zwraca JSON z oczekiwanymi polami
- SSE endpoint utrzymuje połączenie i wysyła heartbeat

To daje pewność, że „cięcia” nie utną kluczowych ścieżek.

### 6.2. Strangler pattern (duszenie starego kodu)
- Zostaw stary kod.
- Wyciągaj po kawałku funkcje do nowych modułów.
- Stary plik robi coraz mniej, aż zostaje tylko bootstrap.

### 6.3. Wspólny „service-kit” wprowadzać stopniowo
Nie próbuj przerobić wszystkiego naraz.
Kolejność o najlepszym ROI:
1) `wrapAsync` + `safeDecode` + `readJsonBody` + 413
2) router tabelkowy
3) ErrorEnvelope + requestId
4) SSE backpressure

Każdy krok jest samodzielny i da się go testować.

---

## 7) Jak poprawić podział na części na poziomie repo (bez lawiny plików)

Masz już `packages/*` (np. protokół i biblioteki robokit). Warto dopisać **dwie paczki „infrastrukturalne”**:

1) `packages/fleet-service-kit` (HTTP, routing, SSE, requestId, ErrorEnvelope)  
2) `packages/fleet-config` (config loader + walidacja + print-effective-config)

To zwykle **zmniejsza** liczbę plików w appkach:
- usuwasz duplikaty `lib/config.js` w wielu appkach,
- usuwasz duplikaty helperów HTTP.

**Ważne ograniczenie**: utrzymaj te paczki małe (1–3 pliki). To jest „biblioteka”, nie nowy framework.

---

## 8) Dodatkowy refaktor jakościowy: „komendy” jako osobny moduł domeny

Jeśli chcesz uniknąć chaosu w DTO:

- Zrób jeden moduł (jeden plik!) np. `packages/fleet-domain/commands.js`, który:
  - normalizuje komendy (`normalizeCommand(payload)`),
  - waliduje pola,
  - nadaje `commandId`,
  - mapuje na format providera (jeśli trzeba).

To centralizuje najważniejszy kontrakt systemu (sterowanie robotem), a nie mnoży plików.

---

## 9) Wnioski: najprostszy „ładny” docelowy układ

### Docelowa liczba plików na usługę (bez przesady)
- `fleet-core`: 3–5 plików + runtime/orchestrator
- `fleet-gateway`: 2–4 pliki + providerzy
- `fleet-ui`: 5–7 plików (bo teraz jest monolitem)
- `packages`: 2 nowe małe pakiety po 1–3 pliki

### Największe źródło zysków
1) pocięcie `fleet-ui/server.js`
2) wspólny `service-kit` (eliminuje duplikaty i crash class bugs)
3) scalenie mikro-plików orchestratora w kilka większych modułów
4) router tabelkowy + wrapAsync (czytelność i odporność)

---

## Krótka checklista refaktoru „bez bólu”

- [ ] dodać 3 testy-kanarki (health/state/SSE)
- [ ] wyciągnąć `safeDecode` + wrapper async handlerów
- [ ] wyciągnąć `readJsonBody` i 413 zamiast resetu
- [ ] pociąć `fleet-ui/server.js` na: http/static/api/sse/(sim lub core_sync)
- [ ] dodać `packages/fleet-service-kit` (małe)
- [ ] scalić 4–5 mikro-plików orchestratora w 2–3 moduły tematyczne
- [ ] dodać `index.js` eksportujący publiczne API orchestratora

---

Jeśli to wdrożysz, projekt staje się wyraźnie prostszy w głowie: mniej skakania po plikach, mniej duplikatów, a jednocześnie mocniejsze granice między „logiką” a „I/O”.
