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
- STD-032a (SHOULD): `esbuild` target nie moze byc wyzszy niz runtime Node na hoście; preflight loguje target + wykryta wersje Node i fail‑fast przy mismatch.
- STD-032b (SHOULD): buildId musi zawierac komponent losowy lub monotoniczny, aby uniknac kolizji przy rownoleglych buildach.
- STD-035 (SHOULD): build zapisuje wersje narzedzi/zaleznosci; build nie pobiera rzeczy z internetu.
- STD-040 (SHOULD): preflight uzywa tych samych argumentow i srodowiska co runtime.
- STD-041 (SHOULD): release nie moze polegac na toolchainie builda na serwerze.

#### Operacje / niezawodnosc
- STD-024 (SHOULD): fallbacki obnizajace zabezpieczenia musza byc jawne (flag/config) i zawsze logowac ostrzezenie.
- STD-036 (SHOULD): ryzykowne opcje sa OFF domyslnie i wymagaja jawnego wlaczenia.
- STD-034 (SHOULD): wejscia z CLI/config sa walidowane typami/zakresami; bledne = fail-fast.
- STD-025 (SHOULD): wszystkie generowane katalogi (cache/release/tmp) maja retention/pruning i loguja przyczyny czyszczenia.
- STD-025a (SHOULD): cache jest kluczowany po target+config+wersja/format; zmiana schematu wymusza czyszczenie lub nowy namespace cache.
- STD-028 (SHOULD): zapisy plikow krytycznych sa atomowe (tmp + rename), aby uniknac polowicznych stanow po crashu.
- STD-029 (SHOULD): operacje bootstrap/deploy/clean sa idempotentne (powtorka nie psuje stanu).
- STD-029a (SHOULD): szybkie sciezki (payload-only/fast) musza zachowywac parytet walidacji i listy plikow z pelnym deployem; ewentualne roznice musza byc jawnie opisane i testowane.
- STD-030 (SHOULD): build/deploy/clean uzywaja lockfile; kolizje maja czytelny komunikat i nie niszcza stanu.
- STD-030a (SHOULD): systemd `ExecStart` uzywa absolutnych sciezek; brak `WorkingDirectory` wymaga pelnych sciezek do binarki i configu.
- STD-030b (SHOULD): po aktualizacji pliku unit zawsze wykonaj `systemctl daemon-reload` (lub `--user`), aby uniknac starej konfiguracji.
- STD-031 (SHOULD): brak sudo domyslnie; eskalacja tylko jawnie. Waliduj owner/perms/umask w punktach krytycznych.
- STD-031a (SHOULD): komendy wymagajace `sudo` w trybie nieinteraktywnym uzywaja `sudo -n` i fail‑fast z instrukcja (brak wiszenia na promptach).
- STD-033 (SHOULD): operacje zewnetrzne (ssh/scp/rsync/http) maja timeout i komunikat "co dalej".
- STD-033a (SHOULD): pobieranie przez `curl`/`wget` uzywa `--fail` + timeoutów (`--connect-timeout`, `--max-time`) i limitu retry; brak odpowiedzi = fail‑fast.
- STD-038 (SHOULD): operacje destrukcyjne oferuja `--dry-run`.
- STD-039 (SHOULD): SIGINT/SIGTERM sprzataja procesy i pliki tymczasowe.
- STD-043 (SHOULD): waliduj wymagania **warunkowo** od poziomu/trybu (np. level 0/1/2), nie wymuszaj danych dla wyzszych poziomow.
- STD-044 (SHOULD): identyfikatory uzywane w sciezkach plikow musza byc sanitizowane do bezpiecznego alfabetu (brak path traversal).
- STD-045 (SHOULD): przy wlaczonych zabezpieczeniach/stealth komunikaty bledow musza byc zunifikowane (opaque failure), bez ujawniania sciezek/rolek.
- STD-046 (SHOULD): idempotentne porownania/zapisy do plikow chronionych musza uzywac tych samych uprawnien co install (sudo lub dedykowana grupa); brak uprawnien = blad z instrukcja.
- STD-046a (SHOULD): detekcja procesu (status) filtruje wyniki `pgrep`/`ps` tak, aby nie zliczac wlasnych narzedzi; dopasuj sciezke binarki lub PID, nie tylko nazwe procesu.
- STD-047 (SHOULD): osadzone skrypty shellowe w template stringach musza escapowac `${` (np. `\\${VAR}`) lub korzystac z bezpiecznego here‑doc helpera, aby uniknac niezamierzonej interpolacji JS.
- STD-048 (SHOULD): tymczasowe pliki z danymi wrazliwymi tworz przez `mkdtemp` + pliki `0600`, z unikalna nazwa i sprzataniem w `finally` (unikaj przewidywalnych nazw w `/tmp`).
- STD-049 (SHOULD): przy zapisie plikow krytycznych (zwl. jako root) ustaw `umask 077`, zapisuj do tmp + `fsync` + `rename`, a potem `fsync` katalogu.
- STD-050 (SHOULD): nazwy plikow tymczasowych (szczegolnie na zdalnych hostach) musza miec losowy komponent; nie opieraj ich wylacznie na czasie (`Date.now()`).
- STD-051 (SHOULD): kazda operacja, ktora tworzy tmp na hoście (lokalnym lub zdalnym), musi sprzatac je w `finally`/`trap` (usun takze `*.tmp` po nieudanym zapisie).
- STD-052 (SHOULD): narzedzia wymagane przez mechanizmy lock (`flock`) musza byc sprawdzone przed uzyciem, z czytelnym bledem i instrukcja instalacji.
- STD-053 (SHOULD): generowany kod C (launchery, wrappery) musi uzywac helpera do C‑escape dla literałów string, aby uniknac bledow kompilacji przy `\n`, `\r`, `\t`, `\0`, `\"`, `\\`.
- STD-055 (SHOULD): generowany kod C musi byc sprawdzony w **obu** galeziach flag/feature (np. sentinel ON/OFF), bo bledy czesto siedza w rzadziej uzywanej konfiguracji.
- STD-057 (SHOULD): kazda zmiana w generatorach kodu (C/JS) musi miec automatyczny compile/smoke test w CI (nie tylko lint).
- STD-058 (SHOULD): generator kodu uzywa jednego helpera do escape/quoting; zakaz „recznego” doklejania stringow.
- STD-061 (SHOULD): smoke test generatora C uruchamia kompilator z `-Werror`, aby warningi nie maskowaly realnych bledow.
- STD-064 (SHOULD): toolchain kompilatora ma jawnie pinowane standardy i flagi (np. `-std=c11`), zeby unikac roznic miedzy maszynami.
- STD-067 (SHOULD): walidacja uprawnien nie moze zakladac dostepnosci `sudo`; jesli `serviceUser` == biezacy uzytkownik, uzyj bezposredniego `test -x`/`test -r`.
- STD-068 (SHOULD): output narzedzi systemowych (np. `lsblk`, `/proc/mounts`) musi byc normalizowany (trim, filtruj puste, obsluguj array/null), zanim podejmiesz decyzje.
- STD-069 (SHOULD): probe/inspect nie moga hard-fail na braku `sudo`; zwracaj wynik + note i kontynuuj.
- STD-102 (SHOULD): uruchamiaj komendy zewnetrzne przez `spawn`/`execFile` z args array i `shell: false`; gdy shell jest konieczny, stosuj `--` i bezpieczne quoting/sanitizacje.
- STD-103 (SHOULD): operacje destrukcyjne (rm/copy/rsync) musza weryfikowac `realpath` i czy sciezka miesci sie w dozwolonym root; nie podazaj za symlinkami.
- STD-106 (SHOULD): ssh/scp/rsync w trybie nieinteraktywnym musza byc uruchamiane z `BatchMode=yes` i fail-fast, bez wiszenia na prompt.
- STD-106a (SHOULD): dla git/ssh ustaw `GIT_TERMINAL_PROMPT=0`, `GIT_ASKPASS=/bin/false`, `SSH_ASKPASS=/bin/false` (brak promptów); brak danych = szybki fail z instrukcja.
- STD-106b (SHOULD): przy uruchamianiu `ssh` pod `sudo` zachowaj `SSH_AUTH_SOCK` lub ustaw `IdentityFile` + `IdentitiesOnly=yes`; ustaw jawny `HOME`/`known_hosts`.
- STD-106c (SHOULD): hostkey prompts eliminuje sie przez pre‑seed `known_hosts` albo jawny `StrictHostKeyChecking=accept-new` (gdy dozwolone); brak wpisu = fail‑fast z instrukcja.
- STD-106d (SHOULD): w testach/CI uzywaj tymczasowego `UserKnownHostsFile`, aby uniknac konfliktow hostkey miedzy uruchomieniami.
- STD-107 (SHOULD): parsowanie outputu narzedzi systemowych powinno wymuszac `LC_ALL=C` (lub `LANG=C`) albo uzywac trybu `--json`/`--output`, aby uniknac roznic locale.
- STD-108 (SHOULD): unikaj `exec()` z domyslnym `maxBuffer`; uzywaj `spawn`/`execFile` lub ustaw `maxBuffer` i loguj przycinki outputu.
- STD-109 (SHOULD): zawsze stosuj `--` przed listą sciezek w komendach zewnetrznych (rm/cp/rsync/scp), aby sciezki zaczynajace sie od `-` nie byly traktowane jako opcje.
- STD-110 (SHOULD): dla komend nieinteraktywnych ustawiaj `stdin` na `ignore`/pusty input, by nie blokowac sie na promptach.
- STD-111 (SHOULD): skrypty shellowe uruchamiane zdalnie zaczynaja sie od `set -euo pipefail`, aby bledy w pipeline nie byly ukryte.
- STD-111a (SHOULD): instalatory systemowe (apt/dpkg) uruchamiaj w trybie nieinteraktywnym (`DEBIAN_FRONTEND=noninteractive`, `TZ=UTC`, `apt-get -y`); brak trybu non‑interactive = fail‑fast.
- STD-111b (SHOULD): gdy uzywasz `tee`/pipeline z `pipefail`, obsłuż SIGPIPE (np. kontrola `PIPESTATUS` lub lokalne wyłączenie `pipefail`), aby nie failować na zamkniętym odbiorcy.
- STD-112 (SHOULD): dla synchronizacji katalogow przez rsync stosuj jawna semantyke trailing slash (sync zawartosci vs katalogu) i pokryj to testem.
- STD-113 (SHOULD): parser JSON/JSON5 usuwa BOM i normalizuje CRLF (unikaj bledow na plikach z Windows).
- STD-114 (SHOULD): tmp dla operacji atomowych jest tworzony w tym samym katalogu/FS co plik docelowy (unikaj `EXDEV`).
- STD-115 (SHOULD): rozpakowywanie archiwow wymaga walidacji sciezek (brak `..`, brak absolutnych, brak symlink/hardlink) i twardego fail na naruszenia.
- STD-116 (SHOULD): `rsync --delete` wymaga walidacji dst (w dozwolonym root) i jawnego trybu/zgody dla operacji ryzykownych.
- STD-117 (SHOULD): generowane skrypty maja LF (bez CRLF); w pipeline użyj `dos2unix`/normalizacji newline.
- STD-118 (SHOULD): timeouty i pomiary czasu opieraj na zegarze monotonicznym (`process.hrtime`/`performance.now`), nie na `Date.now()`.
- STD-119 (SHOULD): retry maja limit prób i limit czasu całkowitego (brak nieskończonych pętli), z logowaniem liczby prób.
- STD-120 (SHOULD): lockfile zawiera PID+timestamp; stale locki sa wykrywane i bezpiecznie czyszczone.
- STD-121 (SHOULD): skrypty zawierajace bash‑isms musza byc uruchamiane przez `bash` jawnie (nie domyslny `sh`).
- STD-122 (SHOULD): destrukcyjne kasowanie katalogow odbywa sie przez helper z walidacja niepustej sciezki i `realpath` w dozwolonym root.
- STD-123 (SHOULD): w skryptach z `set -e` operacje typu `grep`/`diff` musza miec jawne sprawdzenie exit code (1 = brak dopasowania) zamiast przerywac skrypt.
- STD-124 (SHOULD): nie parsuj `ls`; do list plikow uzywaj `find -print0`/`xargs -0` lub globbing z `nullglob`, aby uniknac bledow na spacjach/pustych katalogach.
- STD-125 (SHOULD): przed uruchomieniem skryptow czysc ryzykowne ENV (`BASH_ENV`, `ENV`, `CDPATH`, `GLOBIGNORE`) lub ustaw bezpieczne defaulty.
- STD-125a (SHOULD): build/testy czyszcza `NODE_OPTIONS`, `NODE_PATH`, `NODE_EXTRA_CA_CERTS` (lub ustawiają jawne wartości), aby uniknac wstrzykiwania hookow.
- STD-126 (SHOULD): w skryptach shellowych wszystkie zmienne musza byc cytowane (`"$VAR"`), chyba ze jawnie potrzebny jest splitting.
- STD-127 (SHOULD): unikaj `eval`; gdy musisz dynamicznie skladac komendy, uzywaj args array lub whitelisty tokenow.
- STD-128 (SHOULD): `xargs` uruchamiaj z `-r` (GNU) lub jawnie sprawdzaj, czy input nie jest pusty.
- STD-129 (SHOULD): limity czasu (expiry/licencja/sentinel) liczymy wg czasu **hosta docelowego**; runtime musi je sprawdzac okresowo (`checkIntervalMs`) i nie blokowac wyjscia (timer `unref`).
- STD-130 (SHOULD): jesli format bloba ma wiele wersji, runtime akceptuje znane wersje i waliduje spojnosc `version ↔ length`; nie toleruj cichych rozjazdow.
- STD-129 (SHOULD): rozpakowanie artefaktu odbywa sie w katalogu stagingowym; `current.buildId` aktualizuj dopiero po walidacji.
- STD-130 (SHOULD): dla krytycznych binarek nie polegaj na niekontrolowanym `PATH`; uzywaj `command -v` + whitelisty lub absolutnych sciezek, szczegolnie przy `sudo`.
- STD-130a (SHOULD): wykrywanie narzedzi z `node_modules/.bin` musi uwzgledniac monorepo/workspaces (sprawdzaj kilka poziomow lub uzyj `npm bin -w`/`npm exec`), inaczej CLI/testy beda false‑negative.
- STD-131 (SHOULD): przy ekstrakcji archiwow w deploy ustaw `--no-same-owner` i `--no-same-permissions` oraz ustaw jawne perm po rozpakowaniu.
- STD-132 (SHOULD): masowe operacje na plikach nie moga przekraczac `ARG_MAX`; uzywaj `find ... -exec ... +` lub `xargs -0`.
- STD-133 (SHOULD): odrzucaj absolutne segmenty sciezek w danych z configu i normalizuj `..` przed `path.join`.
- STD-134 (SHOULD): dla plikow runtime z danymi ustaw jawne permissje (np. 0640/0600) i waliduj je w preflight.
- STD-135 (SHOULD): pliki binarne czytaj/zapisuj jako `Buffer` (bez encoding), a tekst jako `utf8`.
- STD-136 (SHOULD): diff konfiguracji opieraj na kanonicznej reprezentacji (parse+stable sort+stringify), nie na whitespace.
- STD-137 (SHOULD): unikaj TOCTOU na plikach — używaj atomowych operacji (`O_EXCL`, lock, write+rename) i weryfikuj `fstat` po otwarciu.
- STD-138 (SHOULD): jeśli zmieniasz `umask`, zawsze przywracaj poprzednią wartość w `finally`.
- STD-139 (SHOULD): procesy potomne muszą być sprzątane (kill całej grupy procesów lub tracking PID) przy exit/signal.
- STD-140 (SHOULD): obsługuj `unhandledRejection`/`uncaughtException` globalnie, loguj i kończ proces kodem != 0.
- STD-141 (SHOULD): przy `set -u` dla opcjonalnych zmiennych stosuj `${VAR:-}` lub `: "${VAR:=default}"`, aby uniknac naglych abortow.
- STD-142 (SHOULD): w skryptach uzywaj `read -r`, zeby nie tracić backslashy.
- STD-143 (SHOULD): po transferze artefaktow weryfikuj checksum (np. sha256) lub rozmiar.
- STD-144 (SHOULD): dla duzych plikow uzywaj streamow i limitow rozmiaru zamiast `readFile` w calosci.
- STD-145 (SHOULD): logi JSONL nie moga zawierac surowych znakow nowych linii lub binarnych bajtow; normalizuj/escapuj dane.
- STD-146 (SHOULD): unikaj `~` i sciezek relatywnych przy `sudo`; uzywaj sciezek absolutnych i jawnego `HOME`/`cwd`.
- STD-147 (SHOULD): retry sieciowe maja exponential backoff + jitter oraz limit prob i max delay.
- STD-148 (SHOULD): ekstrakcja archiwow ma limit rozmiaru i liczby plikow (ochrona przed zip‑bomb).
- STD-149 (SHOULD): `host`/`user` w targetach sa walidowane (brak spacji/znakow kontrolnych; whitelist znakow).
- STD-150 (SHOULD): zanim uruchomisz `strip`/packer na pliku, zweryfikuj typ (ELF magic/`file`) i w razie braku zgodnosci wykonaj SKIP z powodem.
- STD-150a (SHOULD): po `strip`/packerze wykonaj szybki smoke test (np. `--version`/`--help` lub krótki run z timeoutem), aby wykryć uszkodzone binarki.
- STD-151 (SHOULD): gdy operacja wymaga uprawnien/sandbox escape, komunikat musi jasno prosic o zgode; brak cichych fallbackow.
- STD-152 (SHOULD): dla `thin-split` hardening (strip/packer) musi targetowac **launcher** (`b/a`), a nie wrapper `./<app>`; zapisuj w metadanych/logach, ktory plik byl celem.
- STD-153 (SHOULD): dla packagerów AIO (SEA) hardening (strip/packer) jest niedozwolony — fail‑fast z jasnym komunikatem i nie probuj modyfikowac AIO.
- STD-154 (SHOULD): dla `sea` `strip`/ELF packer jest niewspierany i musi fail‑fast z jasnym komunikatem.
- STD-157 (SHOULD): `thin.appBind` jest domyślnie włączony i używa stabilnego ID projektu (nie ścieżek); w razie kolizji `appName`/`entry` ustaw jawne `appBind.value`.
- STD-158 (SHOULD): `thin.launcherObfuscation` domyślnie włączone i **fail‑fast**, jeśli brak `protection.cObfuscator` (brak fallbacków).
- STD-159 (SHOULD): `thin.snapshotGuard` jest opt‑in; testy muszą wymuszać trigger poprzez dedykowane ENV, a produkcja nie polega na testowych override.
- STD-160 (SHOULD): `antiDebug.ptraceGuard` i `antiDebug.coreDump` muszą sprawdzać kody błędów (`prctl`/`setrlimit`) i fail‑fast (bez cichych skipów).
- STD-161 (SHOULD): `antiDebug.seccompNoDebug` ma czytelny tryb działania (`errno`/`kill`), a testy używają trybu `errno` do asercji błędów.
- STD-162 (SHOULD): aktywny guard `PTRACE_TRACEME` wymaga modelu fork/parent‑handshake i `Type=forking` w systemd; domyślny tryb simple exec go nie wspiera (używaj `dumpable+seccomp`).
- STD-163 (SHOULD): `antiDebug.loaderGuard` weryfikuje loader (PT_INTERP vs `/proc/self/maps`) i fail‑fast przy mismatch; testy muszą mieć wymuszenie kontrolowane przez ENV.

#### Testy / CI
- STD-018 (SHOULD): testy automatyczne nie polegają na kruchym parsowaniu stdout/stderr child procesów; preferuj JSON output, kody wyjścia lub wywołania in‑process; gdy parsujesz, zawsze usuwaj ANSI.
- STD-027 (SHOULD): testy/subprocessy zawsze maja timeout per‑krok i drenaż stdout/stderr; brak postepu = kill + blad.
- STD-027a (SHOULD): gdy narzedzie nie ma wbudowanego timeoutu, testy owijaja je `timeout` (np. GNU `timeout --foreground`) i loguja limit czasu.
- STD-056 (SHOULD): drenaż stdout/stderr dotyczy **wszystkich** scenariuszy testowych (takze gdy spodziewasz sie porazki procesu).
- STD-059 (SHOULD): testy E2E musza obejmowac scenariusze negatywne (brak plikow, zle uprawnienia, symlink), bo tam najczesciej wychodza regresje.
- STD-060 (SHOULD): testy musza deterministycznie sprzatac zasoby (tmp/porty/procesy), a brak sprzatania jest traktowany jako fail.
- STD-155 (SHOULD): negatywne testy E2E musza asercyjnie weryfikowac **konkretny** sygnal bledu (exit code lub wzorzec stderr); inne bledy = FAIL.
- STD-156 (SHOULD): gdy krok testu wymaga uprawnien (EPERM/EACCES, brak `ptrace`, brak bind), test oznacza **SKIP z instrukcja** jak uruchomic z eskalacja/zezwoleniem.
- STD-062 (SHOULD): testy wymagajace roota/SSH/portow musza byc domyslnie wylaczone i raportowac **jawny SKIP z powodem**.
- STD-063 (SHOULD): po E2E dodaj asercje „brak tmp” (np. `/tmp/seal-*`), zeby wykryc brak sprzatania.
- STD-065 (SHOULD): kazda funkcja zalezna od ENV ma jawny default i loguje „effective config”.
- STD-066 (SHOULD): formaty binarne musza miec wersjonowanie i twardy fail na nieznana wersje.
- STD-054 (SHOULD): testy E2E uruchamiane jako root tworza tmp na starcie i **zawsze** sprzataja w `finally`, aby nie zostawiac root‑owned plikow w `/tmp`.

#### CLI / UX
- STD-016 (SHOULD): rekurencyjne uruchamianie CLI (workspace/monorepo) **zawsze** używa ścieżek absolutnych, aby nie zależeć od CWD.
- STD-017 (SHOULD): komenda uruchomiona poza projektem ma fail‑fast i nie generuje efektów ubocznych (brak tworzenia plików/ostrzeżeń „z innego katalogu”).
- STD-104 (SHOULD): przy wykryciu wielu projektow CLI pokazuje liste i wymaga jawnej zgody (`--yes/--workspace`), aby uniknac przypadkowych operacji masowych.
- STD-105 (SHOULD): semantyka multi‑project jest jawna (domyslnie fail‑fast); `--continue-on-error` musi byc wyraznie wskazany.
- STD-105a (SHOULD): kolejnosc projektow w workspace jest deterministyczna (sort po `name`/`path`) i jawnie logowana.
- STD-019 (SHOULD): shell completion nie moze maskowac opcji (gdy token zaczyna sie od `-`, podpowiada opcje). Aktualizuj completion po kazdej zmianie CLI.
- STD-020 (SHOULD): wizard CLI powinien podawac krotkie opisy komend i rekomendowana akcje na teraz; w trybie TTY dziala krok-po-kroku (petla).
- STD-021 (SHOULD): output CLI ma byc jednoznaczny i akcjonowalny (bledy/warningi z konkretnym "co dalej" i bez duplikatow).
- STD-022 (SHOULD): `seal check` podaje dokladne kroki naprawcze (np. nazwy pakietow apt-get) i wskazuje brakujace narzedzia wprost.
- STD-023 (SHOULD): po zmianach w CLI aktualizuj dokumentacje, completion i wizard jednoczesnie, zeby uniknac rozjazdow UX.
- STD-037 (SHOULD): nazwy komend i semantyka sa spójne w CLI i dokumentacji.
- STD-070 (SHOULD): zmiana schematu `seal.json5` wymaga jednoczesnej aktualizacji template/init, przykladow, docs i testow; parser musi fail‑fast na starych kluczach z jasnym hintem migracji.
- STD-071 (SHOULD): nie dubluj opcji sterujacych tym samym zachowaniem (jedno pole = jedna semantyka). Sprzeczne ustawienia musza byc odrzucane z jasnym bledem.
- STD-072 (SHOULD): `seal check` ostrzega tylko o narzedziach rzeczywiscie wymaganych przez wybrany packager/protection (bez szumu).
- STD-073 (SHOULD): lista dozwolonych wartosci (packagery, poziomy) pochodzi z jednego zrodla i jest wspoldzielona przez CLI, completion i docs; CI ma test zgodnosci.
- STD-074 (SHOULD): przykladowe `seal.json5` w repo musza przechodzic walidacje schematu (test/CI).
- STD-074a (SHOULD): w CI/testach narzedzia uruchamiane przez `npx` musza uzywac `--no-install` (brak pobierania z sieci); preferuj lokalne `node_modules/.bin`.
- STD-075 (SHOULD): generowany kod C nie moze redefiniowac makr (np. `_GNU_SOURCE`) ani duplikowac identyfikatorow; stosuj `#ifndef` i unikalne prefiksy.
- STD-076 (SHOULD): bledy toolchaina musza pokazywac pelne stderr/stdout i kod wyjscia; nie traktuj ostrzezen jako bledow, chyba ze jawnie uzywasz `-Werror`.
- STD-077 (SHOULD): dlugie kroki builda/testow loguja postep (co kilka sekund) i w trybie verbose przepuszczaja stdout/stderr narzedzi.
- STD-077a (SHOULD): flaga hardeningu wymagajaca wsparcia kompilatora (np. `-fcf-protection=full`) musi miec jawny toggle i pre‑probe; brak wsparcia = czytelny blad z instrukcja wylaczenia lub zmiany toolchaina.
- STD-090 (SHOULD): self‑integrity hash binarki musi byc liczony **po** wszystkich operacjach post‑pack (hardening/packery); po tym kroku nie wolno juz modyfikowac pliku.
- STD-090a (SHOULD): gdy wlaczony jest ELF packer, self‑integrity nie moze modyfikowac binarki po spakowaniu — uzyj trybu sidecar (hash w osobnym pliku).
- STD-090b (SHOULD): przy `thin.integrity.mode=sidecar` plik `r/<integrity.file>` musi byc przenoszony w deploy/rollback/cleanup oraz aktualizowany przy payload‑only; brak pliku = fail‑fast.
- STD-091 (SHOULD): self‑hash marker musi byc wykrywany bez falszywych trafien (waliduj hex, ignoruj nie‑hex) i obslugiwac wiele wystapien, wymagajac spojnosc hasha.
- STD-092 (SHOULD): marker/hash placeholder w generowanym C musi byc utrzymany w binarce (np. `volatile`/jawna referencja), aby patcher zawsze go znalazl.
- STD-157 (SHOULD): jeśli anti‑debug opiera się o `TracerPid`, sama kontrola na starcie nie wystarcza — check powinien być wykonywany okresowo lub w punktach krytycznych (np. przed odszyfrowaniem/uruchomieniem wrażliwego kodu).
- STD-158 (SHOULD): okresowe kontrole (np. `setInterval`) muszą być `unref()` aby nie blokowały naturalnego zakończenia procesu.
- STD-159 (SHOULD): jeśli włączono `tracerPidThreads`, sprawdzaj `TracerPid` dla wszystkich tasków (`/proc/self/task/<tid>/status`).
- STD-078 (SHOULD): skrypty/testy nie zakladaja `bash` – uzywaja `/bin/sh` albo sprawdzaja dostepnosc i robia jawny SKIP.
- STD-079 (SHOULD): jeden kanoniczny katalog wyjsciowy (`seal-out/`); cache i artefakty trafiaja do podfolderow tego katalogu, bez alternatywnych sciezek.
- STD-079a (SHOULD): wszystkie pliki generowane (cache/private/metadata/runtime) musza byc zapisywane pod `seal-out/` (np. `seal-out/cache/...`); pojawienie sie nowych katalogow obok projektu (np. `seal-config/.private`) traktuj jako blad i migruj dane do `seal-out/`.
- STD-080 (SHOULD): testy E2E nie modyfikuja plikow w repo; uzywaja kopii projektu lub `outDirOverride` i sprzataja wszystko w `finally`.
- STD-081 (SHOULD): testy E2E snapshotuja i przywracaja `process.env` (zwl. `SEAL_*`) aby uniknac wyciekow miedzy testami.
- STD-082 (SHOULD): testy uruchamiaja procesy z aktywnym wait na gotowosc (health/status) i monitoruja wczesne exit; brak gotowosci = fail z logiem.
- STD-083 (SHOULD): testy integracyjne/remote sa gated przez jawne ENV; bez flagi zawsze SKIP z powodem.
- STD-084 (SHOULD): testy nie uzywaja `sleep()` jako synchronizacji, tylko retry z timeoutem i jitterem/backoff.
- STD-085 (SHOULD): testy nie wywoluja interaktywnych narzedzi (git/ssh); ustaw `GIT_TERMINAL_PROMPT=0` i fail/skip gdy brakuje dostepu.
- STD-086 (SHOULD): testy zalezne od narzedzi (packery/strip/postject) sprawdzaja dostepnosc i robia SKIP z powodem, chyba ze env wymusza fail.
- STD-087 (SHOULD): przy porazce testu wypisuj command line i fragment stdout/stderr oraz effective config (z limitem dlugosci).
- STD-087a (SHOULD): jesli testy E2E auto‑modyfikuja konfiguracje (np. wylaczaja opcje), musza to jawnie logowac wraz z powodem.
- STD-087b (SHOULD): jesli konfiguracja wymaga obfuscatora C, testy musza sprawdzic jego dostepnosc i jawnie przejsc w tryb SKIP lub wylaczyc obfuskacje z logiem.
- STD-087c (SHOULD): jesli test zmienia packager (np. `sea` vs `thin-split`), musi dostosowac zalezne opcje (integrity/strip/elfPacker) albo fail‑fast z jasnym komunikatem.
- STD-087d (SHOULD): jeśli test automatycznie wyłącza funkcję z powodu brakującego narzędzia, musi istnieć osobny test (gated ENV), który **wymusza** tę funkcję i failuje przy braku zależności.
- STD-087e (SHOULD): funkcje ochronne (anti‑debug/snapshot) musza miec deterministyczne “test hooks” aktywowane tylko w trybie testowym (ENV), aby E2E byly stabilne.
- STD-087f (SHOULD): testy E2E musza byc bezpieczne dla uruchomien rownoleglych (unikalne serviceName/installDir/outDir i brak wspolnych plikow globalnych).
- STD-087g (SHOULD): testy E2E ustawiają deterministyczne locale i strefę czasu (`LC_ALL=C`, `TZ=UTC`), aby uniknąć różnic między środowiskami.
- STD-087h (SHOULD): testy nie wymagają sieci domyślnie; operacje sieciowe są gated ENV i zawsze mają timeout.
- STD-088 (SHOULD): testy przywracaja `process.cwd()` po zmianach (snapshot/restore).
- STD-089 (SHOULD): testy E2E wymuszaja szybkie ustawienia (np. `thin.level=low`) i minimalne payloady, aby nie blokowac CI.
- STD-089a (SHOULD): testy loguja `node -v` i `which node` na starcie oraz fail‑fast, gdy wersja < wymaganej; przy `sudo` uzywaj jawnego PATH lub `sudo -E`.
- STD-089b (SHOULD): skrypty E2E wyznaczaja repo root wzgledem `__dirname` (CWD‑independent) i loguja effective root.
- STD-089c (SHOULD): gdy test waliduje wiele sub‑checkow, musi wypisac liste tych, ktore padly (nazwa + got/expected), nie tylko `ok=false`.
- STD-089d (SHOULD): dlugie pakiety E2E (np. docker) maja konfigurowalny globalny timeout i heartbeat log postepu; kroki instalacyjne musza byc opcjonalne (ENV‑gated).
- STD-089e (SHOULD): testy dockerowe sprzataja kontenery/sieci w `trap` (cleanup na error); `KEEP=1` tylko jawnie wylacza cleanup.
- STD-089e.a (SHOULD): w CI uzywaj `--progress=plain` (lub `BUILDKIT_PROGRESS=plain`) dla `docker build`, aby logi byly diagnostyczne.
- STD-089f (SHOULD): test‑workspace nie kopiuje `node_modules/`; zaleznosci instaluje osobno (deterministycznie) i loguje czy instalacja byla fresh.
- STD-089g (SHOULD): kazdy SKIP w testach musi wypisac powod oraz instrukcje jak wymusic pelny test (ENV/flag).
- STD-089h (SHOULD): w CI/E2E uzywaj `npm ci` dla deterministycznych zaleznosci; `npm install` tylko lokalnie (bez modyfikacji lockfile).
- STD-089i (SHOULD): testy dockerowe wymagajace systemd/sshd sprawdzaja cgroup i tryb privileged; brak = SKIP z jasnym powodem i instrukcja flag.
- STD-089i.a (SHOULD): kontenery testowe uruchamiaj z `--init` (tini) lub zapewnij init w obrazie, aby sprzatac zombie procesy.
- STD-089i.b (SHOULD): po dodaniu usera do grupy `docker` wymagany jest re‑login; do tego czasu testy powinny uzywac `sudo docker` lub jawnie fail‑fast z instrukcja.
- STD-089j (SHOULD): testy uruchamiane jako root nie modyfikuja repo; pracuja na kopii lub temp‑workspace i sprzataja wszystko w `finally`.
- STD-089k (SHOULD): w testach ustaw `NO_COLOR=1` i `FORCE_COLOR=0`, aby ograniczyc ANSI w outputach narzedzi (latwiejsze parsowanie).
- STD-089l (SHOULD): w CI/E2E ustaw `NPM_CONFIG_FETCH_*` (retries/timeout) aby uniknac wiszenia npm przy problemach sieciowych.
- STD-089m (SHOULD): gdy npm działa jako root w CI/containers, ustaw `NPM_CONFIG_UNSAFE_PERM=true` lub uruchom npm jako nie‑root.
- STD-089n (SHOULD): w CI/E2E wyłącz `npm audit`/`fund` i progress (`NPM_CONFIG_AUDIT=false`, `NPM_CONFIG_FUND=false`, `NPM_CONFIG_PROGRESS=false`).
- STD-090 (SHOULD): preflight sprawdza **narzedzia CLI** (np. `postject` w `node_modules/.bin`/PATH), nie tylko obecność modulu.
- STD-091 (SHOULD): funkcje zalezne od architektury (np. CPUID) musza degradująco dzialac na platformach bez wsparcia (pusty/neutralny ID zamiast twardego bledu).
- STD-092 (SHOULD): `--skip-check` jest wyraznie oznaczony jako ryzykowny i zawsze wypisuje ostrzezenie; krytyczne braki toolchaina nie powinny byc maskowane.
- STD-093 (SHOULD): generowane binarki/skrypty maja jawny `chmod +x` i test uruchomienia, aby uniknac `Permission denied`.
- STD-094 (SHOULD): w razie bledu narzedzi zewnetrznych (cc/rsync/ssh) wypisz komendy i stderr/stdout (z limitem) dla diagnozy.
- STD-095 (SHOULD): szanuj `TMPDIR` oraz sytuacje `noexec` na `/tmp`; tymczasowe binarki uruchamiaj w bezpiecznym katalogu.
- STD-096 (SHOULD): przed startem procesu sprawdzaj zajety port; wypisz PID/komende procesu lub jasny hint naprawczy (zeby uniknac niejasnego `EADDRINUSE`).
- STD-097 (SHOULD): preflight/deploy sprawdza wolne miejsce na serwerze (`installDir` i `/tmp`) i failuje z instrukcja, jesli brak miejsca.
- STD-098 (SHOULD): testy E2E uzywaja sandbox `installDir` i unikalnych nazw uslug; operacje systemowe sa gated env‑flaga i domyslnie SKIP.
- STD-099 (SHOULD): testy E2E izolują cache (osobny temp project root lub `SEAL_THIN_CACHE_LIMIT=0`), aby uniknac cross‑test contamination.
- STD-100 (SHOULD): testy E2E zawsze binduja do `127.0.0.1` (nie `localhost`), aby uniknac problemow IPv6/DNS.
- STD-101 (SHOULD): testy E2E ustawiają `HOME`/`XDG_*` na temp, by nie brudzic profilu uzytkownika.
- STD-101a (SHOULD): testy ustawiają `NPM_CONFIG_CACHE` na temp (per run) lub czyszcza cache npm deterministycznie.

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
7) Generator C używa helpera C‑escape i jest sprawdzony w obu konfiguracjach flag (np. sentinel ON/OFF).
8) E2E obejmuje scenariusze negatywne i sprząta tmp/procesy deterministycznie (także przy sudo).
9) Toolchain ma jawnie pinowane standardy/flag (np. `-std=c11`) i log „effective config” dla ENV.
10) Format binarny ma wersję i twardy fail na nieznaną wersję.

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
