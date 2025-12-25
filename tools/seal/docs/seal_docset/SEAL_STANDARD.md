# SEAL_STANDARD – Standard jakości aplikacji sealowanych (v1.3)

> **Zakres:** ten standard definiuje minimalne wymagania jakościowe dla aplikacji wdrażanych przez **Seal** (seal-deploy), w szczególności w trybie **sealed** (bundle + obfuskacja + single executable) oraz uruchamianych jako **systemd service** na środowiskach offline.
>
> **Cel praktyczny:** po sealingu debug jest trudniejszy, więc standard ma sprawić, że:
> - awarie są diagnozowalne „z logów i statusu”,
> - operator widzi sensowną informację w UI (gdy UI istnieje),
> - serwis ma stałe narzędzia (`appctl`),
> - integracje są monitorowane i raportowane.

---

## 0. Jak czytać ten dokument

### 0.1. Modalności
- **MUST / NIE WOLNO** – wymaganie twarde.
- **SHOULD / NIEZALECANE** – silna rekomendacja.
- **MAY** – opcja.

### 0.2. Moduły standardu
SEAL_STANDARD jest **modułowy**.

- **Core (MUST dla każdej aplikacji):**
  - `logging`
  - `config`
  - `status`
  - `service`
  - `ops` (systemd/appctl zgodność operacyjna)

- **Warunkowe:**
  - `ui_resilience` (MUST, jeśli aplikacja ma UI)
  - `integrations` (SHOULD, jeśli aplikacja ma zależności zewnętrzne / integracje)
  - `diagnostics` (SHOULD)
  - `testing` (SHOULD, jeśli projekt ma E2E/CI)

### 0.3. Deklaracja zgodności (lock)
Projekt deklaruje wersję i moduły w:

- `seal-config/standard.lock.json`

Przykład:
```json
{
  "standard": "SEAL_STANDARD",
  "version": 1,
  "modules": ["logging", "config", "status", "service", "ops", "ui_resilience", "integrations", "diagnostics"]
}
```

---

## 1. Założenia i granice standardu

### 1.1. Co standard gwarantuje
- Jednolity format logów i stabilne „event codes” odporne na obfuskację.
- Powtarzalne endpointy `/healthz` i `/status`.
- Przewidywalne zachowanie procesu (shutdown, fatal errors).
- Minimalny kontrakt UI (jeśli istnieje) w sytuacjach awaryjnych.
- Wspólny model raportowania integracji.

### 1.2. Co standardu NIE dotyczy
- Standard nie jest narzędziem ochrony sekretów.
- Standard nie zmienia sposobu developmentu: aplikacja ma dać się uruchomić „normalnie” w dev (np. `node`, `npm run dev`). Sealing i deploy to osobny etap.
- Standard nie narzuca technologii UI (React/vanilla/etc.).
- Standard nie gwarantuje „nie do złamania” bezpieczeństwa na wrogim hoście.

### 1.3. Zasada decyzji niejednoznacznych
- STD-010 (SHOULD): jeżeli zachowanie jest sporne/niejednoznaczne (trade‑off bezpieczeństwo vs wygoda), zrób z tego **jawny parametr/opcję** i opisz domyślną wartość.
- STD-011 (SHOULD): domyślne ustawienie powinno być „bezpieczne”, a zmiana wymaga świadomej decyzji użytkownika.
- STD-012 (SHOULD): wszelkie metadane trafiające na **target** powinny być w formie binarnej/obfuskowanej (nieczytelne dla człowieka). Jeśli potrzebujesz jawnych danych do debugowania, trzymaj je lokalnie po stronie builda.
- STD-013 (SHOULD): nazwy plików na target nie powinny zdradzać roli/znaczenia; preferuj krótkie/nijakie nazwy (np. `c` zamiast `codec.bin`), o ile nie utrudnia to operacji serwisowych.
- STD-014 (SHOULD): jeśli konfiguracja udostępnia opcję (np. `sshPort`, `StrictHostKeyChecking`), to **każda** ścieżka wykonania powinna ją respektować (ssh/scp/rsync); normalizację trzymaj w jednym miejscu, aby uniknąć rozjazdów.

### 1.4. Narzędzia i automatyzacje (Seal/CLI)
#### Build / toolchain (priorytet: zgodnosc)
- STD-015 (SHOULD): wykrywanie narzędzi (np. `postject`) musi mieć **jedno źródło prawdy**; `check` i `build` używają tego samego resolvera binarki.
- STD-026 (SHOULD): preflight i build uzywaja tych samych opcji i resolvera narzedzi, zeby uniknac rozjazdow.
- STD-032 (SHOULD): preflight sprawdza OS/arch i wersje toolchaina; mismatch = fail-fast.
- STD-035 (SHOULD): build zapisuje wersje narzedzi/zaleznosci; build nie pobiera rzeczy z internetu.
- STD-040 (SHOULD): preflight uzywa tych samych argumentow i srodowiska co runtime.
- STD-041 (SHOULD): release nie moze polegac na toolchainie builda na serwerze.

#### Operacje / niezawodnosc
- STD-024 (SHOULD): fallbacki obnizajace zabezpieczenia musza byc jawne (flag/config) i zawsze logowac ostrzezenie.
- STD-036 (SHOULD): ryzykowne opcje sa OFF domyslnie i wymagaja jawnego wlaczenia.
- STD-034 (SHOULD): wejscia z CLI/config sa walidowane typami/zakresami; bledne = fail-fast.
- STD-025 (SHOULD): wszystkie generowane katalogi (cache/release/tmp) maja retention/pruning i loguja przyczyny czyszczenia.
- STD-028 (SHOULD): zapisy plikow krytycznych sa atomowe (tmp + rename), aby uniknac polowicznych stanow po crashu.
- STD-029 (SHOULD): operacje bootstrap/deploy/clean sa idempotentne (powtorka nie psuje stanu).
- STD-030 (SHOULD): build/deploy/clean uzywaja lockfile; kolizje maja czytelny komunikat i nie niszcza stanu.
- STD-031 (SHOULD): brak sudo domyslnie; eskalacja tylko jawnie. Waliduj owner/perms/umask w punktach krytycznych.
- STD-033 (SHOULD): operacje zewnetrzne (ssh/scp/rsync/http) maja timeout i komunikat "co dalej".
- STD-038 (SHOULD): operacje destrukcyjne oferuja `--dry-run`.
- STD-039 (SHOULD): SIGINT/SIGTERM sprzataja procesy i pliki tymczasowe.
- STD-043 (SHOULD): waliduj wymagania **warunkowo** od poziomu/trybu (np. level 0/1/2), nie wymuszaj danych dla wyzszych poziomow.
- STD-044 (SHOULD): identyfikatory uzywane w sciezkach plikow musza byc sanitizowane do bezpiecznego alfabetu (brak path traversal).
- STD-045 (SHOULD): przy wlaczonych zabezpieczeniach/stealth komunikaty bledow musza byc zunifikowane (opaque failure), bez ujawniania sciezek/rolek.
- STD-046 (SHOULD): idempotentne porownania/zapisy do plikow chronionych musza uzywac tych samych uprawnien co install (sudo lub dedykowana grupa); brak uprawnien = blad z instrukcja.
- STD-047 (SHOULD): osadzone skrypty shellowe w template stringach musza escapowac `${` (np. `\\${VAR}`) lub korzystac z bezpiecznego here‑doc helpera, aby uniknac niezamierzonej interpolacji JS.
- STD-048 (SHOULD): tymczasowe pliki z danymi wrazliwymi tworz przez `mkdtemp` + pliki `0600`, z unikalna nazwa i sprzataniem w `finally` (unikaj przewidywalnych nazw w `/tmp`).

#### Testy / CI
- STD-018 (SHOULD): testy automatyczne nie polegają na kruchym parsowaniu stdout/stderr child procesów; preferuj JSON output, kody wyjścia lub wywołania in‑process; gdy parsujesz, zawsze usuwaj ANSI.
- STD-027 (SHOULD): testy/subprocessy zawsze maja timeout per‑krok i drenaż stdout/stderr; brak postepu = kill + blad.

#### CLI / UX
- STD-016 (SHOULD): rekurencyjne uruchamianie CLI (workspace/monorepo) **zawsze** używa ścieżek absolutnych, aby nie zależeć od CWD.
- STD-017 (SHOULD): komenda uruchomiona poza projektem ma fail‑fast i nie generuje efektów ubocznych (brak tworzenia plików/ostrzeżeń „z innego katalogu”).
- STD-019 (SHOULD): shell completion nie moze maskowac opcji (gdy token zaczyna sie od `-`, podpowiada opcje). Aktualizuj completion po kazdej zmianie CLI.
- STD-020 (SHOULD): wizard CLI powinien podawac krotkie opisy komend i rekomendowana akcje na teraz; w trybie TTY dziala krok-po-kroku (petla).
- STD-021 (SHOULD): output CLI ma byc jednoznaczny i akcjonowalny (bledy/warningi z konkretnym "co dalej" i bez duplikatow).
- STD-022 (SHOULD): `seal check` podaje dokladne kroki naprawcze (np. nazwy pakietow apt-get) i wskazuje brakujace narzedzia wprost.
- STD-023 (SHOULD): po zmianach w CLI aktualizuj dokumentacje, completion i wizard jednoczesnie, zeby uniknac rozjazdow UX.
- STD-037 (SHOULD): nazwy komend i semantyka sa spójne w CLI i dokumentacji.

#### Logowanie (skrót)
- STD-042 (SHOULD): logi sa minimalne i bez payloadow; tylko dane potrzebne do diagnozy.

---

## 2. Moduł `logging` (CORE, MUST)

### 2.1. Zasady ogólne
- LOG-001 (MUST): w produkcji logi są emitowane na **stdout/stderr** (journal/journald przejmuje zapis).
- LOG-002 (MUST): format logów w produkcji to **JSON Lines (JSONL)**, jeden JSON na linię.
- LOG-003 (MUST): logi muszą być diagnostyczne **bez polegania na nazwach funkcji/plików** (obfuskacja je niszczy).

### 2.2. Minimalny schemat rekordu logu
Każda linia logu to obiekt JSON zawierający co najmniej:

- `ts` (string) – ISO 8601 w UTC (`2025-12-20T16:20:01.123Z`)
- `lvl` (string) – `debug|info|warn|error|fatal`
- `evt` (string) – stabilny kod zdarzenia (patrz 2.3)

Zalecane pola:
- `msg` (string) – krótkie, ludzkie wyjaśnienie
- `ctx` (object) – kontekst (np. `robotId`, `siteId`, `reqId`)
- `errorId` (string) – identyfikator błędu (patrz 2.5)
- `err` (object) – opis błędu (patrz 2.4)
- `buildId`, `version` – (SHOULD) w logach startowych

### 2.3. Event codes (evt)
- LOG-010 (MUST): `evt` jest **stabilnym kodem**, nie zmienia się pod wpływem obfuskacji.
- LOG-011 (MUST): format `evt` to `A_Z0_9_` (np. `APP_START`, `CFG_INVALID`, `RDS_CONN_FAIL`).
- LOG-012 (SHOULD): kody `evt` są pogrupowane prefiksami:
  - `APP_*` – lifecycle aplikacji
  - `CFG_*` – konfiguracja
  - `HTTP_*` – warstwa HTTP
  - `INT_*` – integracje
  - `OPS_*` – operacje/system
  - `SEC_*` – zdarzenia bezpieczeństwa (jeśli występują)

### 2.4. Pole `err`
Jeśli log dotyczy błędu:
- LOG-020 (MUST): rekord zawiera `err` jako obiekt z polami:
  - `name` (string) – np. `Error`, `TypeError`
  - `message` (string)
  - `stack` (string) – stack trace (może być obfuskowany, ale nadal wartościowy)
- LOG-021 (SHOULD): `err` może zawierać `code` (np. `ECONNREFUSED`) i `cause` (zagnieżdżony błąd).

### 2.5. `errorId` (korelacja)
- LOG-030 (MUST): dla błędów klasy `error|fatal` generuj `errorId` (krótki, unikalny w czasie, np. 8–12 znaków).
- LOG-031 (SHOULD): `errorId` jest powtarzane w kolejnych logach dotyczących tego samego incydentu.

### 2.6. Logi lifecycle (wymagane eventy)
- LOG-100 (MUST): na starcie emituj `APP_START` z polami:
  - `version`, `buildId` (lub `build`), `buildTime` (jeśli znane)
  - `node` (np. `process.version`)
  - `configPath` = `config.runtime.json5` (pełna ścieżka, jeśli możliwe)
- LOG-101 (MUST): po pełnej gotowości emituj `APP_READY`.
- LOG-102 (MUST): przy zakończeniu emituj `APP_STOP` (dla graceful shutdown) lub `APP_FATAL` (dla awarii).

### 2.7. Logi HTTP (minimalny standard)
- LOG-200 (SHOULD): loguj żądania HTTP jako `HTTP_REQ` (lvl `info`) z `method`, `path`, `status`, `durMs`.
- LOG-201 (SHOULD): korelacja requestów przez `reqId` (nagłówek `X-Request-Id` lub generowany lokalnie).

### 2.8. Przykłady (JSONL)
```json
{"ts":"2025-12-20T16:20:01.123Z","lvl":"info","evt":"APP_START","version":"1.0.0","buildId":"2025-12-20_1615","node":"v22.11.0","configPath":"/home/admin/apps/my-app/releases/<buildId>/config.runtime.json5"}
{"ts":"2025-12-20T16:20:03.017Z","lvl":"error","evt":"INT_RDS_CONN_FAIL","errorId":"E7K3-2Q9M","err":{"name":"Error","message":"ECONNREFUSED","stack":"..."},"ctx":{"url":"http://127.0.0.1:8080"}}
{"ts":"2025-12-20T16:20:04.000Z","lvl":"info","evt":"APP_READY"}
```

---

## 3. Moduł `config` (CORE, MUST)

### 3.1. Źródło konfiguracji
- CFG-001 (MUST): aplikacja czyta konfigurację runtime ze stałej ścieżki:
  - `path.join(process.cwd(), "config.runtime.json5")`
- CFG-002 (MUST): aplikacja nie wymaga innych plików konfiguracyjnych do działania (poza tym, co świadomie trzymasz w `shared/`).
- CFG-003 (MUST): format configu wspiera **obiekty i tablice** (JSON5 lub JSON).
- CFG-004 (SHOULD): parametry zależne od środowiska (hosty, timeouty, interwały, feature flags) są w `config.runtime.json5`; jeśli coś jest celowo zakodowane na stałe, musi być jasno udokumentowane w repo.

> Uwaga: w środowisku Seala plik `config.runtime.json5` jest utrzymywany jako **kopiowana** wersja trwałego configu z `shared/config.json5` (np. przez `appctl` przed startem).

### 3.2. Walidacja konfiguracji
- CFG-010 (MUST): konfiguracja jest walidowana na starcie (typy + wymagane pola).
- CFG-011 (MUST): błąd walidacji kończy start aplikacji (exit != 0), po uprzednim zalogowaniu:
  - `evt=CFG_INVALID`
  - `errorId`
  - opisem problemu zawierającym **ścieżkę** do pola (np. `rds.url`).
- CFG-012 (SHOULD): w logu walidacji nie wypisuj całego configu (ryzyko sekretów), ale możesz wypisać „shape” i kluczowe metadane.

### 3.3. Hash i wersjonowanie configu
- CFG-020 (SHOULD): oblicz `configHash` (np. sha256 z canonical JSON) i raportuj go w `/status`.
- CFG-021 (MAY): jeśli masz migracje configu, użyj `configVersion` i loguj `CFG_MIGRATION_*`.

---

## 4. Moduł `status` (CORE, MUST)

### 4.1. Endpoint `/healthz`
- STA-001 (MUST): `GET /healthz` zwraca `200` jeśli proces żyje.
- STA-002 (MUST): `/healthz` nie zależy od integracji zewnętrznych (ma być szybki i niezawodny).
- STA-003 (MAY): odpowiedź może być `text/plain` (`ok`) lub minimalny JSON.

### 4.2. Endpoint `/status`
- STA-010 (MUST): `GET /status` zwraca JSON.
- STA-011 (MUST): odpowiedź zawiera co najmniej:
  - `standard`: `"SEAL_STANDARD"`
  - `standardVersion`: `1`
  - `version`
  - `buildId` (lub `build`)
  - `uptimeSec`
  - `now` (czas serwera w ISO)
  - `deps` (obiekt zależności)

Zalecane pola (spójne z logiem `APP_START` i z `manifest.json`):
- `buildTime`, `commit`
- `node` (wersja), `pid`
- `configHash`
- `eventSchemaVersion` (jeśli wersjonujesz słownik `evt`)

### 4.3. Model zależności (`deps`)
Każda zależność to obiekt o polach:
- `state` (MUST): `ok|degraded|down`
- `lastOkAt` (SHOULD): ISO
- `lastFailAt` (MAY): ISO
- `msg` (SHOULD): krótki opis ostatniego problemu
- `details` (MAY): obiekt z danymi diagnostycznymi (bez sekretów)

- STA-020 (MUST): jeśli aplikacja ma integracje (RDS, DB, API), musi raportować je w `deps`.
- STA-021 (SHOULD): `state` powinien mieć semantykę:
  - `ok` – działa
  - `degraded` – działa częściowo / z retry / w trybie ograniczonym
  - `down` – nie działa

### 4.4. Przykład `/status`
```json
{
  "standard": "SEAL_STANDARD",
  "standardVersion": 1,
  "version": "1.0.0",
  "buildId": "2025-12-20_1615",
  "buildTime": "2025-12-20T16:15:00Z",
  "commit": "a1b2c3d",
  "now": "2025-12-20T16:20:04.000Z",
  "uptimeSec": 1234,
  "node": "v22.11.0",
  "pid": 912,
  "configHash": "sha256:...",
  "deps": {
    "backend": {"state": "ok"},
    "rds": {"state": "down", "lastOkAt": "2025-12-20T15:10:00Z", "lastFailAt": "2025-12-20T16:19:59Z", "msg": "ECONNREFUSED"}
  }
}
```

---

## 5. Moduł `service` (CORE, MUST)

### 5.1. Shutdown i sygnały
- SVC-001 (MUST): aplikacja obsługuje `SIGTERM` (systemd stop/restart) i wykonuje graceful shutdown.
- SVC-002 (SHOULD): graceful shutdown ma limit czasu (np. 10s), po którym proces kończy się wymuszenie.
- SVC-003 (MUST): na shutdown emituj `APP_STOP` (log).

### 5.2. Błędy nieobsłużone
- SVC-010 (MUST): `uncaughtException` i `unhandledRejection` → log `APP_FATAL` + exit != 0.
- SVC-011 (SHOULD): przed exit spróbuj flushować logi (w granicach rozsądku).

### 5.3. Readiness
- SVC-020 (MUST): aplikacja emituje `APP_READY` dopiero po:
  - wczytaniu i walidacji configu,
  - uruchomieniu serwera HTTP,
  - inicjalizacji krytycznych komponentów.

---

## 6. Moduł `ops` (CORE, MUST)

### 6.1. Zgodność z systemd
- OPS-001 (MUST): aplikacja uruchamia się „w jednym procesie” (bez daemonize).
- OPS-002 (MUST): logi idą na stdout/stderr.
- OPS-003 (MUST): aplikacja działa poprawnie, gdy jest uruchamiana z katalogu release (CWD zawiera `config.runtime.json5` oraz ewentualnie `public/`).

### 6.2. `appctl` i serwis
- OPS-010 (MUST): projekt jest serwisowalny przez `appctl`:
  - `status`, `logs`, `restart`, `doctor`.
- OPS-011 (MUST): `doctor` musi móc:
  - sprawdzić systemd,
  - wykonać requesty do `/healthz` i `/status`.

### 6.3. Retencja i limity zasobów
- OPS-020 (MUST): każdy mechanizm zapisujący dane na dysku (cache, artefakty, logi, tmp, release retention) ma **limit** (liczba/rozmiar/TTL) i automatyczne czyszczenie.
- OPS-021 (MUST): nie wolno wprowadzać niczego, co może rosnąć bez końca (dysk/pamięć). Jeśli zachowanie jest niejednoznaczne, dodaj opcję i ustaw bezpieczny limit domyślny.
- OPS-022 (SHOULD): loguj pruning (ile elementów usunięto i dlaczego), aby dało się diagnozować czyszczenie.
- OPS-023 (SHOULD): build/test używa katalogów tymczasowych i **zawsze** je sprząta (brak stale rosnących katalogów).
- OPS-024 (MUST): wszystkie zewnętrzne komendy w preflight/build (toolchain, pkg-config, kompilacja testowa) mają **timeout** i widoczny postęp.
- OPS-025 (SHOULD): dodaj tryb `--verbose` (lub env) pokazujący dokładne komendy i stdout/stderr narzędzi, żeby diagnozować „zawieszenia”.
- OPS-026 (SHOULD): jeśli preflight używa toolchaina systemowego (np. `cc`), zapewnij opcję override (np. `--cc gcc`) dla środowisk z wrapperami.
- OPS-027 (SHOULD): preflight musi używać **tego samego targetu i packagera** co właściwy build/deploy (brak „fałszywych OK”).

---

## 7. Moduł `ui_resilience` (WARUNKOWY, MUST jeśli UI istnieje)

### 7.1. Minimalne zachowanie UI
- UI-001 (MUST): UI cyklicznie odświeża `/status` (np. co 1–5s, zależnie od potrzeb).
- UI-002 (MUST): jeśli UI nie może pobrać `/status` (brak backendu / timeout), pokazuje wyraźny stan „Brak połączenia z backendem”.
- UI-003 (MUST): UI pokazuje „czas ostatniej udanej aktualizacji” (np. `lastOkUiUpdateAt`).

- UI-004 (SHOULD): UI uznaje „brak połączenia” dopiero po N kolejnych nieudanych próbach (np. N=2–3), aby pojedynczy timeout nie powodował migotania.
- UI-005 (SHOULD): UI może pokazywać „ostatni znany stan” jako read-only, gdy backend jest niedostępny.
- UI-006 (MUST): zapytania HTTP w UI mają timeout (AbortController), brak wieszenia się requestów.
- UI-007 (SHOULD): jeśli UI używa cache/service‑worker, musi wersjonować zasoby i wymuszać reload po zmianie `buildId` (albo całkowicie wyłączyć SW).

### 7.2. Degradacja zależności
- UI-010 (MUST): jeśli backend żyje, ale `deps.*.state != ok`, UI pokazuje:
  - że „system działa, ale integracja X jest w stanie degraded/down”,
  - `lastOkAt` (jeśli dostępne) dla tej integracji.

### 7.3. Stopka diagnostyczna
- UI-020 (MUST): UI zawiera małą stopkę/sekcję diagnostyczną z:
  - `version/buildId` (z `/status`),
  - stan backendu (czy ostatni fetch statusu się udał),
  - timestamp last update.

---

## 8. Moduł `integrations` (WARUNKOWY, SHOULD jeśli integracje istnieją)

### 8.1. Timeouty i retry
- INT-001 (MUST): każde połączenie zewnętrzne ma timeout.
- INT-002 (SHOULD): retry z backoff (np. wykładniczy) i limitem.
- INT-003 (MUST): unikaj „hammeringu” integracji przy awariach – stosuj backoff lub ograniczanie częstotliwości prób/operacji.
- INT-004 (SHOULD): ogranicz powtarzalne logi błędów (throttling), aby nie zalewać journald.

### 8.2. Circuit breaker (zalecany)
- INT-010 (SHOULD): dla kluczowych integracji użyj circuit breaker (otwieraj po serii porażek, zamykaj po sukcesie).

### 8.3. Raportowanie do `/status`
- INT-020 (MUST): każda integracja jest raportowana w `deps`:
  - `state`, `lastOkAt`, `lastFailAt`, `msg`.
- INT-021 (SHOULD): przy zmianie stanu integracji loguj eventy:
  - `INT_<NAME>_UP`, `INT_<NAME>_DOWN`, `INT_<NAME>_DEGRADED`.
- INT-022 (SHOULD): utrzymuj połączenia/klienty między cyklami (reuse), a nie twórz nowych w każdej iteracji.
- INT-030 (MUST): zdefiniuj i stosuj bezpieczną wartość domyślną, gdy dane z integracji są brakujące lub nieprawidłowe; odnotuj to w logach i `deps`.

---

## 9. Moduł `diagnostics` (SHOULD)

### 9.1. Support bundle
- DIA-001 (SHOULD): aplikacja lub `appctl` potrafi wygenerować paczkę diagnostyczną:
  - wynik `/status`
  - ostatnie N minut logów (`journalctl`)
  - `manifest.json` release
  - (opcjonalnie) `configHash` i/lub config po anonimizacji


### 9.2. Diagnostyka: tryby `full` i `safe`

W tym projekcie **sekrety nie są celem ochrony** (repo i środowisko dev są zaufane). Jednocześnie czasem chcesz wkleić logi/bundle do AI albo wysłać komuś z zewnątrz.

Dlatego standard rozróżnia dwa tryby:
- `full` – pełne dane diagnostyczne (MAY zawierać sekrety). To jest tryb domyślny do prywatnego debugowania.
- `safe` – zredagowane/zanonimizowane dane do dzielenia się (np. maskowanie `password/token/secret` po kluczach, albo wycięcie sekcji configu).

- DIA-010 (MUST): support-bundle zawsze ma jawnie oznaczony tryb (`full` albo `safe`).
- DIA-011 (SHOULD): tool powinien wspierać `--safe` (lub `--mode safe`) i wtedy **nie dodawać** pełnego configu do bundle.
- DIA-012 (MUST): jeśli generujesz `full`, narzędzie musi wypisać wyraźne ostrzeżenie w stdout (żeby uniknąć przypadkowego wklejenia sekretów).
- DIA-013 (SHOULD): diagnostyka nie otwiera „debug endpointów” dostępnych publicznie, jeśli nie są konieczne.

---

## 10. Moduł `testing` (SHOULD)

Ten moduł dotyczy testów E2E (zwłaszcza po sealingu), które mają potwierdzać, że aplikacja działa w realnych warunkach.

- TEST-001 (MUST): każdy test E2E ma **timeout** (per‑test + per‑krok/await).
- TEST-002 (MUST): każdy subprocess w testach ma obsługę `error` i **nie może wisieć** (resolve/reject zawsze musi nastąpić).
- TEST-003 (MUST): procesy uruchamiane w testach muszą mieć drenowane stdout/stderr (`stdio: inherit` lub `data` handlers).
- TEST-004 (MUST): zasoby UI (browser/page) muszą być zamykane w `finally`, nawet przy błędzie.
- TEST-005 (SHOULD): E2E używa **szybkich fixture** (minimalny projekt), nie pełnych buildów produkcyjnych.
- TEST-006 (SHOULD): zewnętrzne integracje są stubowane lokalnie (brak zależności od internetu).
- TEST-007 (SHOULD): testy używają losowych portów (brak hardcode `3000`).
- TEST-008 (SHOULD): testy sprzątają katalogi tymczasowe po zakończeniu (żeby nie zapychać dysku).

## 11. Minimalny „kontrakt dla AI” (wersja promptable)

Poniższy fragment jest celowo krótki, żeby dało się go wkleić do prompta przy generowaniu projektu.

- Aplikacja **MUST** czytać config z `./config.runtime.json5` (CWD), walidować go na starcie i kończyć start przy błędzie.
- Aplikacja **MUST** mieć `GET /healthz` (niezależny od integracji) i `GET /status` (JSON, z `deps`).
- Logi w produkcji **MUST** być JSONL na stdout/stderr i zawierać pola `ts,lvl,evt`.
- Logi **MUST** używać stabilnych event codes (`APP_START`, `APP_READY`, `CFG_INVALID`, `APP_FATAL`, itd.).
- Obsłuż `SIGTERM` i kończ proces kontrolowanie.
- Nie używaj `eval`/`new Function` ani dynamicznych importów/require po stringach (kompatybilność bundla/SEA).
- Jeśli jest UI: pokazuj banner braku połączenia z backendem i czas ostatniej udanej aktualizacji.
- Jeśli naprawiasz błąd lub wprowadzasz regułę jakościową, **dopisz** ją do `SEAL_PITFALLS.md`, a regułę ogólną do `SEAL_STANDARD.md`.

### TL;DR dla review (AI/autor zmian)
Przed zamknięciem zadania:
1) Błąd/reguła dopisana do `SEAL_PITFALLS.md`.
2) Reguła ogólna dopisana do `SEAL_STANDARD.md`.
3) E2E ma timeouty per‑test/per‑krok.
4) Subprocessy mają obsługę `error` i nie wiszą.
5) Procesy w testach mają drenaż stdout/stderr.
6) Zasoby UI (browser/page) zamykane w `finally`.

---

## 12. Changelog

### v1.1
- Dodane tryby diagnostyki `full`/`safe` (bez konfliktu z polityką sekretów).
- Doprecyzowana odporność UI na chwilowe timeouty.

### v1.0 (pierwsza wersja)
- Zdefiniowane moduły core i warunkowe.
- Ustalony minimalny kontrakt logów (JSONL) i event codes.
- Ustalony kontrakt `/healthz` i `/status` z modelem zależności.
- Ustalony kontrakt UI resilience.
- Ustalony kontrakt procesu (SIGTERM, fatal errors).
