# Dodatkowe usprawnienia API/UI↔Core: jeszcze prościej, twardziej, bardziej niezawodnie

Ten dokument dopisuje **kolejne** pomysły ponad poprzedni plan refaktoru (`cursor + SSE resume + idempotencja + lease + ErrorEnvelope + commands + sceny + internal telemetry`).

Tu skupiam się na rzeczach, które zwykle *realnie* podnoszą niezawodność i odporność systemu w codziennym życiu (reconnecty, restart Core, wielokrotne UI, błędy sieci, debug, bezpieczeństwo, performance).

---

## 1) Wzmocnij Control Lease: „fencing token” + jednoznaczna semantyka (split‑brain killer)

### 1.1 Fencing token
Samo `leaseId` bywa za słabe, jeśli zdarzy się split‑brain (np. dwa UI „myślą”, że mają kontrolę, bo ktoś odnowił lease, ale inny klient nie dostał update’u).

Rozwiązanie: do lease dodaj **monotoniczny „fencing token”** (np. `leaseEpoch` albo `fence`), inkrementowany przy każdym `seize`.  
Każda mutacja niesie `(leaseId, fence)` i Core odrzuca wszystko z fence mniejszym niż aktualny.

Przykład:
```json5
{
  "leaseId": "lease_abc",
  "fence": 17
}
```

Korzyść: nawet jeśli stary klient przez chwilę ma „ważny” leaseId, to i tak **nie wygra** z nowszym.

### 1.2 Jasne zasady przy `seize`
Doprecyzuj semantykę:
- `seize` może zwrócić:
  - sukces (nowy lease),
  - konflikt (ktoś ma lease),
  - „steal” tylko jeśli użytkownik świadomie żąda przejęcia (flaga `force: true`) i zostanie to zarejestrowane.

### 1.3 „Lease required” – domknij do 100%
Wszystkie mutacje (tasks/commands/scenes) MUSZĄ wymagać lease.  
Wyjątek: endpointy stricte diagnostyczne / read-only.

---

## 2) Zrób API „self‑describing”: wersja kontraktu + feature flags + kompatybilność wstecz

### 2.1 `contractsVersion` + `serverBuild`
Dodaj do `/state` i do eventów:
- `contractsVersion: "1.2.0"`
- `serverBuild: { gitSha, builtAt, env }`

To radykalnie ułatwia debug („UI działało wczoraj, dziś nie — dlaczego?”).

### 2.2 `capabilities` (feature discovery)
W `/state` albo w `GET /api/v1/capabilities` zwracaj listę wspieranych opcji:
- `supportsEventResume: true`
- `supportsCommandTypes: ["goTarget","stop",...]`
- `supportsScenes: true`
- `supportsLeaseFence: true`

UI nie musi zgadywać — może się adaptować.

---

## 3) Streaming: od snapshotów do delt (gdy już działa resume)

Na początku snapshoty w eventach są OK, ale potem wąskim gardłem robi się:
- rozmiar payloadu,
- częstotliwość ticków,
- parsing w UI.

### 3.1 Deltowe eventy domenowe (prosty wariant)
Po stabilizacji `cursor + resume` wprowadź eventy typu:
- `robotUpserted` (jeden robot)
- `robotRemoved`
- `taskUpserted`
- `taskRemoved`
- `leaseChanged`
- `sceneActivated`
- `systemWarning`

UI trzyma mapy `robotsById`, `tasksById` i aplikuje delty.

**Ważne:** nadal okresowo emituj snapshot (np. co 30–60 s) jako „checkpoint”, żeby UI mogło się samo naprawić, gdy gdzieś coś pójdzie bokiem.

### 3.2 „view=uiMinimal” + filtrowanie
Zamiast zawsze pchać wszystko:
- `/state?view=uiMinimal`
- `/events/stream?view=uiMinimal`
- i opcjonalnie filtry:
  - `robots=RB-01,RB-02`
  - `includeTasks=false`

To upraszcza UI (mniej danych) i odciąża Core.

---

## 4) Timeouts, retry, backoff – czyli „sieć jest złośliwa”

### 4.1 W Core: timeouty i limity
Dla każdego requestu:
- limit rozmiaru body (np. 1–2 MB)
- globalny timeout obsługi (np. 5–10 s dla mutacji)
- rate limiting na endpointach mutujących (UI czasem potrafi „zasypać” klikami)

### 4.2 W UI: retry z rozsądnym backoffem
- SSE: EventSource ma własny retry, ale warto ustawić `retry:` w SSE (np. 1000–3000 ms) i logikę „po X błędach pokaż banner”.
- fetch POST: retry tylko dla błędów sieci / 5xx, ale:
  - z **idempotencją** (requestId),
  - z backoffem (np. 250ms, 500ms, 1s).

---

## 5) Obserwowalność: logi, metryki, korelacja (żeby nie debugować „na czuja”)

### 5.1 Correlation IDs
Każdy request z UI ma:
- `X-Request-Id: <uuid>`
Core loguje go i zwraca w odpowiedzi.

Do eventów SSE dołóż:
- `trace: { lastMutationRequestId? }` (opcjonalnie)

### 5.2 Strukturalne logi
Zamiast `console.log` w przypadkowych miejscach:
- log JSON: `{ level, msg, requestId, robotId, taskId, leaseId, cursor }`

### 5.3 Metryki (minimalnie)
Nawet bez Prometheusa na start:
- liczba klientów SSE
- opóźnienie emitowania eventów
- rozmiar eventu
- liczba mutacji / błędów per endpoint

To jest „radar” do wykrywania degradacji.

---

## 6) Stabilność danych: co się dzieje po restarcie Core?

Obecnie dużo rzeczy wygląda na in-memory. To jest OK dla MVP, ale:

### 6.1 „Restart semantics”
Zdecyduj i opisz:
- Czy restart Core kasuje tasks? lease? activeSceneId?
- Czy UI ma to zobaczyć jako `serverRestarted` event?

Prosty wzorzec:
- Core ma `serverInstanceId` (losowy UUID przy starcie),
- UI jeśli zobaczy zmianę `serverInstanceId` → robi „hard resync” (pobiera `/state`, czyści cache).

### 6.2 Minimalna persystencja (jeśli potrzebna)
Jeżeli tasks/scene mają przetrwać:
- zapis do pliku JSON / SQLite (na MVP)
- albo DB (jeśli docelowo i tak będzie)

Klucz: mieć jasno określone oczekiwania.

---

## 7) Bezpieczeństwo: autoryzacja, role, CORS, CSRF

### 7.1 AuthN/AuthZ (nawet proste)
Jeśli UI ma być dostępne w sieci:
- token (np. JWT) lub sesja,
- role:
  - `viewer` (read-only),
  - `operator` (mutacje + lease),
  - `admin` (internal/telemetry, import scen).

### 7.2 CORS i nagłówki bezpieczeństwa
- whitelist originów
- `Content-Security-Policy` (szczególnie jeśli UI jest hostowane razem z API)
- `X-Content-Type-Options: nosniff`

To są „tanie” poprawki, które blokują głupie klasy ataków.

### 7.3 Internal telemetry odseparowane sieciowo
Oprócz tokena:
- najlepiej wystawić `/internal/*` na innym porcie/interfejsie,
- albo za reverse proxy z osobną polityką.

---

## 8) Uporządkuj „źródła prawdy”: co jest stanem, co jest eventem, co jest komendą

To brzmi filozoficznie, ale daje mega prostotę:

- **StateSnapshot**: „jak jest teraz”
- **Event**: „co się zmieniło” (z cursorem)
- **Command**: „czego operator chce” (może być odrzucone)
- **Telemetry ingestion**: „co urządzenie/adapter twierdzi”

W kodzie Core warto rozdzielić te warstwy, żeby:
- telemetria nie mieszała się bezpośrednio z logiką UI,
- eventy były emitowane z jednego miejsca,
- i dało się testować deterministycznie.

---

## 9) API ergonomia: drobne zmiany, które zmniejszają liczbę bugów

### 9.1 Pola „zawsze te same”
Ustal kilka żelaznych reguł:
- `id` vs `taskId` — jedno kanoniczne pole
- enumy (np. taskStatus) w jednym miejscu, z testem, że UI i Core są zgodne
- jednostki w nazwie pola (`angleRad`, `heightM`, `tsMs`)

### 9.2 RFC 7807 Problem Details (opcjonalnie)
Jeśli nie chcesz własnego `ErrorEnvelope`, możesz użyć standardu `application/problem+json`.  
Ale jeśli już masz `ErrorEnvelope` w spec — lepiej konsekwentnie dowieźć to jedno.

### 9.3 ETag dla `/state` (opcjonalnie)
Jeśli zostaje polling jako fallback:
- `/state` może zwracać `ETag: "<cursor>"`
- UI może robić `If-None-Match` i dostawać `304 Not Modified`

To obniża obciążenie, gdy SSE padnie i UI polluje.

---

## 10) Testy kontraktowe + golden files (żeby nie wróciły rozjazdy)

### 10.1 Kontrakt test: Core ↔ UI typy
- Generujesz typy z JSON Schema/OpenAPI.
- W CI uruchamiasz:
  - test, że Core zwraca payloady zgodne ze schemą,
  - test, że UI kompiluje się przeciwko tym typom.

### 10.2 Golden payloads
Trzymasz w repo przykładowe payloady:
- `examples/stateSnapshot.json`
- `examples/event_robotUpserted.json`
- `examples/error_conflictLease.json`

Wszystkie zmiany API przechodzą przez update goldenów.

---

## 11) Drobne, ale ważne „niefunkcjonalne” poprawki

- Ustaw `Cache-Control: no-store` dla odpowiedzi dynamicznych (`/state`, SSE).
- Kompresja (gzip/br) dla `/state` i dużych odpowiedzi.
- Graceful shutdown Core:
  - zamknij SSE połączenia z eventem `serverShuttingDown` (UI pokaże banner i od razu reconnect).
- „Strict mode” dla JSON:
  - odrzucaj nieznane pola w mutacjach (albo loguj i ignoruj — ale jasno).

---

## 12) Proponowana kolejność (po poprzednim planie)

Po wdrożeniu podstaw (cursor+resume, idempotencja, lease, commands):
1. Fencing token w lease
2. `capabilities` + `contractsVersion`
3. Retencja eventów + checkpoint snapshot
4. Deltowe eventy (robot/task) + okresowe snapshoty
5. Observability (requestId, metryki)
6. Security (auth, role, internal port)

---

## TL;DR
Największy dodatkowy „skok jakości” po bazowym refaktorze da:
- **fencing token w lease** (eliminuje split‑brain),
- **capabilities + contractsVersion** (koniec zgadywania i debug „na ślepo”),
- **deltowe eventy + checkpoint snapshot** (mniej danych, stabilniejszy UI),
- **observability i requestId** (zamiast wróżenia z logów),
- **rozsądne limity/timeouts/backoff** (sieć przestaje być twoim wrogiem).

