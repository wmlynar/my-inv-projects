# Wymagania produkcyjne – `modbus-sync-worksites`

## Wymagania szczegółowe dla tej usługi

- Konfiguracja:
  - Lista `SITES` z polami: `siteId`, `ip`, `port`, `slaveId`, `offset`, `default` (EMPTY/FILLED).
  - Walidacja konfiguracji przy starcie: unikalne `siteId`, poprawne `offset`, poprawne `default`.
  - Stałe konfiguracyjne na górze pliku: `RDS_HOST`, `RDS_USER`, `RDS_PASS`, `RDS_LANG`, `POLL_INTERVAL_MS`, `MODBUS_REQUEST_TIMEOUT_MS`, `RECONNECT_BACKOFF_MS`, `FILL_DEBOUNCE_MS`.
  - `RDS_USER`, `RDS_PASS` i `RDS_LANG` są stałymi w kodzie (nie występują w plikach config).

- Modbus:
  - Grupowanie site’ów po `(ip, port, slaveId)` i jeden klient Modbus na grupę.
  - Wymaganie: **na każdą grupę jest dokładnie jeden klient Modbus i jeden mechanizm backoffu**, a połączenie jest ponownie wykorzystywane między kolejnymi odczytami.
  - Timeout requestu: `client.setTimeout(MODBUS_REQUEST_TIMEOUT_MS)`.
  - Reconnect po błędzie z backoffem `RECONNECT_BACKOFF_MS` (nie spamujemy próbami co `POLL_INTERVAL_MS`).
  - Przy błędzie połączenia / odczytu:
    - zamykamy klienta,
    - logujemy błąd (adres grupy + treść),
    - ustawiamy dla wszystkich site’ów w tej grupie wartości domyślne.

- Domyślny stan + debounce:
  - Każdy `site` ma `default` (EMPTY/FILLED).
  - Stan logiczny:
    - startuje od `default`,
    - wraca natychmiast do `default`, jeśli surowy sygnał Modbus zgadza się z `default`,
    - zmienia się na przeciwny dopiero po stabilnym, przeciwnym sygnale przez `FILL_DEBOUNCE_MS`.
  - **Debounce jest liczony osobno dla każdego worksite (per `siteId`) i nie „miesza się” między site’ami w tej samej grupie.**
  - Przy błędzie Modbus:
    - reset debounce dla site’ów danej grupy,
    - ustawienie `default` w RDS.
  - Przy złej konfiguracji (brak wartości z Modbus – `undefined`):
    - log błędu z informacją o `siteId`, `offset` i indeksie,
    - ustawienie `default` w RDS,
    - reset debounce dla tego site’a.

- Globalne handlery błędów:
  - Wymaganie: usługa musi mieć globalne handlery:
    - `process.on("unhandledRejection", ...)`
    - `process.on("uncaughtException", ...)`
  - Żaden niezłapany wyjątek nie może zabić procesu **bez wpisu w logach** – wszystkie niespodziewane błędy muszą być zalogowane (stacktrace lub treść błędu).

- Obsługa wyłączania (sygnały):
  - Wymaganie: usługa obsługuje sygnały:
    - `SIGINT`,
    - `SIGTERM`.
  - Przy wyłączaniu:
    - loguje informację o zamykaniu,
    - **porządnie zamyka wszystkie połączenia Modbus** (zamyka klientów i sprząta stan),
    - kończy proces kodem 0 (czyste wyjście).

- Logowanie:
  - Flaga `DEBUG_LOG` steruje logami debug (`dlog(...)`); w produkcji `DEBUG_LOG = false`.
  - Błędy Modbus i RDS zawsze przez `console.error` (widoczne w journald), niezależnie od `DEBUG_LOG`.
  - Logi debug:
    - `[MODBUS-REQ]`, `[MODBUS-RESP]`,
    - `[DEBOUNCE] ...`,
    - sukcesy RDS `[RDS] Worksite ... => ...`,
    - informacje o backoffie.
  - Logi produkcyjne nie powinny być zalewane powtarzalnymi komunikatami – np. backoff jest logowany tylko w trybie debug.

- Zachowanie przy braku sterownika Modbus:
  - Pierwszy błąd połączenia / odczytu:
    - log: `[Modbus] Group X: communication error, using default states. Details: ...`,
    - ustawienie `default` w RDS dla wszystkich site’ów grupy.
  - W czasie backoff:
    - brak kolejnych logów błędu (tylko logi debug, jeżeli włączone),
    - brak ponownego nadpisywania RDS (stan domyślny już ustawiony i bezpieczny).

- Integracja z RDS:
  - W każdej iteracji dla każdego `site` po debouncu wysyłamy aktualny stan do RDS (API traktowane jako idempotentne).
  - Błąd wywołania API:
    - `console.error` z `siteId` i kontekstem.

- Wdrożenie przez SEAL (systemd):
  - Pierwszy raz: `seal deploy prod --bootstrap` – tworzy katalogi, instaluje usługę i runner.
  - Usługa: `modbus-sync-worksites.service`, `installDir=/home/admin/apps/modbus-sync-worksites`.
  - Sterowanie: `seal remote prod up|down|start|stop|restart|status|logs` lub `appctl` w katalogu release.

- Skrypty operatorskie (legacy):
  - Stare skrypty przeniesione do `old/scripts/` – nieużywane w produkcji po przejściu na SEAL.

- Test Modbus:
  - `modbus-read-test.js`: prosty skrypt Node:
    - łączy się z PLC,
    - co sekundę wywołuje `readDiscreteInputs`,
    - wypisuje surową tablicę `res.data`.

- Repozytorium:
  - Projekt w git + GitHub.
  - Commitowane: kod (`*.js`), `seal.json5`, `seal-config/configs/*.json5`, `seal-config/targets/*.json5`, skrypty bash (legacy), `package.json`, `package-lock.json`, `.gitignore`, dokumentacja (`requirements.md`).
  - `.gitignore` ignoruje `node_modules/`, logi, śmieci edytorów, `.env` itp.

---

## Ogólne wymagania dla usług produkcyjnych

- Konfiguracja:
  - wszystkie istotne parametry (hosty, timeouty, interwały) zebrane w jednym miejscu,
  - loginy/hasła/language dla RDS są stałymi w kodzie (świadomy wyjątek),
  - `config.runtime.json5` (JSON5) jest wymagany – brak/niepoprawny plik kończy proces z błędem,
  - nie używamy `.env` jako runtime configu w produkcji; config kopiuje się do `config.runtime.json5`,
  - walidacja konfiguracji przy starcie (duplikaty, zakresy, brakujące pola).

- Logowanie:
  - rozdział: debug vs error,
  - jeden język logów (np. angielski),
  - log błędu zawsze zawiera: co, gdzie, dla kogo (`siteId`, adres, itp.),
  - brak parsowania stringów błędów – logika rozróżnia przypadki, nie tekst komunikatu.
  - **Nie logujemy danych uwierzytelniających ani sesji** (np. `JSESSIONID`, login/logout).

- Obsługa błędów:
  - każdy błąd z systemu zewnętrznego (Modbus, HTTP, DB) jest:
    - złapany,
    - zalogowany,
    - obsłużony z jasną strategią: retry / backoff / stan awaryjny (default),
  - żaden niezłapany wyjątek nie może zabić procesu bez loga (`unhandledRejection`, `uncaughtException` muszą być obsłużone).

- Odporność:
  - zdefiniowane „bezpieczne stany domyślne” (default) dla krytycznych elementów,
  - jasne zachowanie przy:
    - braku komunikacji z systemem zewnętrznym,
    - błędnej konfiguracji,
    - restarcie usługi w trakcie pracy.

- Połączenia i stan w pamięci:
  - usługa powinna **ponownie wykorzystywać połączenia** (connection pooling / cache klienta) zamiast otwierać nowe połączenia w każdej iteracji,
  - stan w pamięci powinien być minimalny i jasno określony (np. cache połączeń, cache debounca), bez zbędnych globalnych „śmietników”.

- Integracja z systemd:
  - `Restart=always` + sensowne `RestartSec`,
  - uruchamianie na nierootowym użytkowniku,
  - `WorkingDirectory` ustawione na katalog projektu,
  - obsługa `SIGINT`/`SIGTERM` (sprzątanie połączeń, czyste wyjście).

- Aplikacje UI (frontend):
  - UI nie może przeładować się na błąd backendu (żeby nie pokazać strony błędu w przeglądarce).
  - Backend wystawia `/api/status` z `buildId` (z SEAL lub `version.json`).
  - UI pokazuje overlay „brak połączenia” dopiero po ~2s braku kontaktu (krótkie przerwy bez bannera).
  - UI odświeża się **tylko** po zmianie `buildId` i tylko po odzyskaniu połączenia.
  - Polling do `/api/status` ma **timeout** (AbortController), żeby zawieszone requesty nie blokowały kolejnych prób.
  - `?debug=1` może pokazywać znacznik `buildId` i krótki toast przed reloadem.

- Obserwowalność:
  - możliwość:
    - podglądu logów na żywo,
    - pobrania logów z zakresu czasu,
    - sprawdzenia statusu (`systemctl status`),
  - **w przyszłości** warto dodać prosty healthcheck (np. endpoint HTTP lub okresowe logi podsumowujące):
    - kiedy ostatnio udało się połączyć z systemem zewnętrznym,
    - kiedy ostatnio udało się wykonać operację na backendzie (np. RDS).

- Prostota:
  - brak zbędnych warstw abstrakcji przy prostych usługach,
  - kod możliwy do przeczytania od góry do dołu,
  - brak „sprytnych sztuczek” – zamiast tego proste stany i `if/else`.

- Testy / narzędzia:
  - osobny, prosty skrypt testowy komunikacji z systemem zewnętrznym (Modbus, DB, HTTP),
  - narzędzia operatorskie (SEAL/appctl): logi, restart, status, test.

- Budowanie / SEAL:
  - brak `postject` (SEA) to **błąd**, a bundle fallback jest dozwolony tylko jawnie (`build.bundleFallback=true` lub `--packager bundle`),
  - `installDir` dla usług w `/home/admin/apps/...` (unikamy małych partycji typu `/opt`).

- Repozytorium:
  - kod w gicie,
  - powtarzalny sposób wdrożenia przez SEAL (release + deploy),
  - `seal.json5`, `seal-config/configs/*.json5` i `seal-config/targets/*.json5` są wersjonowane; `.env` nie.
