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
- STD-015a (SHOULD): wykrywanie narzedzi nie moze zalezec od `bash` (np. `bash -lc command -v`); uzyj skanu `PATH` lub `/bin/sh`, a brak wymaganej powloki = fail‑fast z instrukcja.
- STD-026 (SHOULD): preflight i build uzywaja tych samych opcji i resolvera narzedzi, zeby uniknac rozjazdow.
- STD-032 (SHOULD): preflight sprawdza OS/arch i wersje toolchaina; mismatch = fail-fast.
- STD-032a (SHOULD): `esbuild` target nie moze byc wyzszy niz runtime Node na hoście; preflight loguje target + wykryta wersje Node i fail‑fast przy mismatch.
- STD-032b (SHOULD): buildId musi zawierac komponent losowy lub monotoniczny, aby uniknac kolizji przy rownoleglych buildach.
- STD-032c (SHOULD): native dodatki/addony sa kompilowane z naglowkami zgodnymi z wersja runtime Node na target (np. `--target` lub pobrane headers); mismatch = fail-fast w preflight/testach.
- STD-032d (SHOULD): kod native korzysta z API V8 warunkowo (guardy wersji/feature-detect) i ma fallback dla starszych wersji Node.
- STD-032e (SHOULD): jezeli addon wymaga konkretnego standardu C++ (np. C++20), preflight wykonuje probe kompilatora i fail‑fast z jasnym komunikatem.
- STD-032f (SHOULD): release nie zawiera sourcemap (`.map`) ani komentarzy `sourceMappingURL`; testy E2E weryfikuja brak map oraz brak `sourceMappingURL` w bundle.
- STD-032g (SHOULD): obfuskacja/mangle nie dotyka publicznych kontraktow API/JSON; utrzymuj liste `reserved/keep` dla nazw pol i pokryj to E2E (a gdy brak pewnosci, wylacz renameProperties).
- STD-032h (SHOULD): tree-shaking respektuje `sideEffects`, a moduly z efektami ubocznymi sa jawnie deklarowane/importowane; E2E potwierdza obecnosc efektow po sealingu.
- STD-032i (SHOULD): opcje minifikacji typu `unsafe`/`pure_getters` sa domyslnie OFF; wlaczaj je tylko z dedykowanym E2E i logiem "effective config".
- STD-032j (SHOULD): dynamiczne `require()` i native addon-y (`.node`) sa oznaczone jako `external`, a pliki `.node` kopiowane do release; E2E weryfikuje ladowanie po sealingu.
- STD-032k (SHOULD): bundler dostaje jawny `NODE_ENV` (np. `define: { 'process.env.NODE_ENV': '\"production\"' }`), aby dead-code elimination dzialalo deterministycznie.
- STD-032l (SHOULD): nie uzywaj `-march=native`/`-mtune=native` w artefaktach dystrybucyjnych; target CPU musi byc zgodny z docelowa maszyną (np. `-march=x86-64 -mtune=generic`).
- STD-035 (SHOULD): build zapisuje wersje narzedzi/zaleznosci; build nie pobiera rzeczy z internetu.
- STD-035a (SHOULD): manifest/hash artefaktow jest liczony po wszystkich krokach post-processingu (strip/packer/obfuscation), jako ostatni etap builda.
- STD-040 (SHOULD): preflight uzywa tych samych argumentow i srodowiska co runtime.
- STD-040a (SHOULD): runtime/serwis uruchamia aplikacje z `NODE_ENV=production` (jesli nie ustawiono inaczej), a testy E2E sprawdzaja ten tryb.
- STD-040b (SHOULD): runtime sanitizuje ryzykowne ENV (`NODE_OPTIONS`, `NODE_PATH`, `NODE_EXTRA_CA_CERTS`, `NODE_V8_COVERAGE`, `NODE_DEBUG`) aby nie wstrzykiwac hookow/inspect z hosta; debug uruchamiaj jawnie przez flagi runtime.
- STD-041 (SHOULD): release nie moze polegac na toolchainie builda na serwerze.

#### Operacje / niezawodnosc
- STD-024 (SHOULD): fallbacki obnizajace zabezpieczenia musza byc jawne (flag/config) i zawsze logowac ostrzezenie.
- STD-036 (SHOULD): ryzykowne opcje sa OFF domyslnie i wymagaja jawnego wlaczenia.
- STD-034 (SHOULD): wejscia z CLI/config sa walidowane typami/zakresami; bledne = fail-fast.
- STD-034a (SHOULD): wartosc podana, ale nieprawidlowa nie moze byc cicho normalizowana do defaultu; musi byc FAIL albo jawny warning + log „effective config”.
- STD-034b (SHOULD): walidacja configu (np. `packager`) jest wykonywana w loaderze i dotyczy **wszystkich** komend; nie zakladaj, ze uzytkownik uruchomil `seal check`.
- STD-025 (SHOULD): wszystkie generowane katalogi (cache/release/tmp) maja retention/pruning i loguja przyczyny czyszczenia.
- STD-025a (SHOULD): cache jest kluczowany po target+config+wersja/format; zmiana schematu wymusza czyszczenie lub nowy namespace cache.
- STD-028 (SHOULD): zapisy plikow krytycznych sa atomowe (tmp + rename), aby uniknac polowicznych stanow po crashu.
- STD-029 (SHOULD): operacje bootstrap/deploy/clean sa idempotentne (powtorka nie psuje stanu).
- STD-029a (SHOULD): szybkie sciezki (payload-only/fast) musza zachowywac parytet walidacji i listy plikow z pelnym deployem; ewentualne roznice musza byc jawnie opisane i testowane.
- STD-030 (SHOULD): build/deploy/clean uzywaja lockfile; kolizje maja czytelny komunikat i nie niszcza stanu.
- STD-030a (SHOULD): systemd `ExecStart` uzywa absolutnych sciezek; brak `WorkingDirectory` wymaga pelnych sciezek do binarki i configu.
- STD-030b (SHOULD): po aktualizacji pliku unit zawsze wykonaj `systemctl daemon-reload` (lub `--user`), aby uniknac starej konfiguracji.
- STD-030c (SHOULD): wywolania `systemctl` maja timeout i obsługę braku systemd/DBus (SKIP z powodem w testach).
- STD-030d (SHOULD): `serviceName` nie zawiera sufiksu `.service`; normalizuj lub fail‑fast z jasnym bledem.
- STD-031 (SHOULD): brak sudo domyslnie; eskalacja tylko jawnie. Waliduj owner/perms/umask w punktach krytycznych.
- STD-031a (SHOULD): komendy wymagajace `sudo` w trybie nieinteraktywnym uzywaja `sudo -n` i fail‑fast z instrukcja (brak wiszenia na promptach).
- STD-031b (SHOULD): gdy `sudo` jest konieczne, przekazuj wymagane ENV jawnie (`sudo -E` lub `sudo VAR=...`) i loguj kluczowe zmienne, aby uniknac rozjazdow zachowania.
- STD-031c (SHOULD): preferuj allowliste zmiennych przekazywanych do `sudo` (`sudo VAR=...`) zamiast pelnego `sudo -E`, aby ograniczyc niekontrolowany ENV.
- STD-033 (SHOULD): operacje zewnetrzne (ssh/scp/rsync/http) maja timeout i komunikat "co dalej".
- STD-033a (SHOULD): pobieranie przez `curl`/`wget` uzywa `--fail` + timeoutów (`--connect-timeout`, `--max-time`) i limitu retry; brak odpowiedzi = fail‑fast.
- STD-033b (SHOULD): `rsync` uruchamiaj z `--timeout` (limit bez aktywnosci) oraz globalnym timeoutem procesu.
- STD-033e (SHOULD): loguj `rsync --version` po obu stronach i fail‑fast, gdy wymagane flagi nie sa wspierane (z instrukcja aktualizacji).
- STD-033c (SHOULD): instalatory narzedzi zewnetrznych pinuja tag/commit, loguja wersje/commit i w miare mozliwosci weryfikuja checksumy; w razie braku zrodla wspieraja mirror/backup.
- STD-033d (SHOULD): instalatory narzedzi buildowanych ze zrodel preflightuja wymagane zaleznosci (`cmake`/`ninja`/`python3`/`cc`) i podaja konkretne instrukcje instalacji.
- STD-033f (SHOULD): instalatory korzystajace z git submodules uzywaja `git submodule update --init --recursive` i fail‑fast na bledach (chyba ze submoduly sa jawnie opcjonalne).
- STD-033g (SHOULD): dla bardzo duzych repo stosuj shallow clone (`--depth`/`--filter=blob:none`) z fallback do pelnego fetch, gdy potrzebny konkretny commit.
- STD-033h (SHOULD): parser lockfile narzedzi normalizuje CRLF/BOM/whitespace i waliduje skladnie; duplikaty sekcji i nieznane klucze = fail‑fast z lista problemow.
- STD-033i (SHOULD): nazwy narzedzi/binarek w lockfile sa walidowane jako bezpieczne basename (bez `/`, `..`, whitespace; tylko `[a-zA-Z0-9_.-]`).
- STD-038 (SHOULD): operacje destrukcyjne oferuja `--dry-run`.
- STD-039 (SHOULD): SIGINT/SIGTERM sprzataja procesy i pliki tymczasowe.
- STD-043 (SHOULD): waliduj wymagania **warunkowo** od poziomu/trybu (np. level 0/1/2), nie wymuszaj danych dla wyzszych poziomow.
- STD-044 (SHOULD): identyfikatory uzywane w sciezkach plikow musza byc sanitizowane do bezpiecznego alfabetu (brak path traversal).
- STD-044a (SHOULD): `appName`/`serviceName` sa walidowane do bezpiecznego zestawu znakow (bez spacji/slash), zanim trafia do sciezek lub komend deploy.
- STD-045 (SHOULD): przy wlaczonych zabezpieczeniach/stealth komunikaty bledow musza byc zunifikowane (opaque failure), bez ujawniania sciezek/rolek.
- STD-045a (SHOULD): endpointy `/health` i `/status` nie zdradzaja obecnosci sentinel/guardow (tresc i timing stabilne); szczegoly tylko w logach instalatora/CLI.
- STD-046 (SHOULD): idempotentne porownania/zapisy do plikow chronionych musza uzywac tych samych uprawnien co install (sudo lub dedykowana grupa); brak uprawnien = blad z instrukcja.
- STD-046a (SHOULD): detekcja procesu (status) filtruje wyniki `pgrep`/`ps` tak, aby nie zliczac wlasnych narzedzi; dopasuj sciezke binarki lub PID, nie tylko nazwe procesu.
- STD-046b (SHOULD): przy dopasowaniu procesu unikaj ucinania komendy (`ps`); preferuj `/proc/<pid>/cmdline` lub `ps -ww`.
- STD-047 (SHOULD): osadzone skrypty shellowe w template stringach musza escapowac `${` (np. `\\${VAR}`) oraz znak backtick, lub korzystac z bezpiecznego here-doc helpera, aby uniknac niezamierzonej interpolacji JS.
- STD-048 (SHOULD): tymczasowe pliki z danymi wrazliwymi tworz przez `mkdtemp` + pliki `0600`, z unikalna nazwa i sprzataniem w `finally` (unikaj przewidywalnych nazw w `/tmp`).
- STD-048a (SHOULD): tymczasowe pliki konfiguracyjne/transferowe nie moga miec przewidywalnych nazw (np. `/tmp/<service>-config.json5`); uzywaj `mktemp` i waliduj typ/owner przed uzyciem.
- STD-049 (SHOULD): przy zapisie plikow krytycznych (zwl. jako root) ustaw `umask 077`, zapisuj do tmp + `fsync` + `rename`, a potem `fsync` katalogu.
- STD-050 (SHOULD): nazwy plikow tymczasowych (szczegolnie na zdalnych hostach) musza miec losowy komponent; nie opieraj ich wylacznie na czasie (`Date.now()`).
- STD-051 (SHOULD): kazda operacja, ktora tworzy tmp na hoście (lokalnym lub zdalnym), musi sprzatac je w `finally`/`trap` (usun takze `*.tmp` po nieudanym zapisie).
- STD-052 (SHOULD): narzedzia wymagane przez mechanizmy lock (`flock`) musza byc sprawdzone przed uzyciem, z czytelnym bledem i instrukcja instalacji.
- STD-053 (SHOULD): generowany kod C (launchery, wrappery) musi uzywac helpera do C‑escape dla literałów string, aby uniknac bledow kompilacji przy `\n`, `\r`, `\t`, `\0`, `\"`, `\\`.
- STD-055 (SHOULD): generowany kod C musi byc sprawdzony w **obu** galeziach flag/feature (np. sentinel ON/OFF), bo bledy czesto siedza w rzadziej uzywanej konfiguracji.
- STD-057 (SHOULD): kazda zmiana w generatorach kodu (C/JS) musi miec automatyczny compile/smoke test w CI (nie tylko lint).
- STD-058 (SHOULD): generator kodu uzywa jednego helpera do escape/quoting; zakaz „recznego” doklejania stringow.
- STD-061 (SHOULD): smoke test generatora C uruchamia kompilator z `-Werror`, aby warningi nie maskowaly realnych bledow.
- STD-061a (SHOULD): compile-test C/C++ uruchamia `-Wshadow` (wraz z `-Werror`), aby shadowing nazw nie przechodzil do produkcji.
- STD-064 (SHOULD): toolchain kompilatora ma jawnie pinowane standardy i flagi (np. `-std=c11`), zeby unikac roznic miedzy maszynami.
- STD-067 (SHOULD): walidacja uprawnien nie moze zakladac dostepnosci `sudo`; jesli `serviceUser` == biezacy uzytkownik, uzyj bezposredniego `test -x`/`test -r`.
- STD-068 (SHOULD): output narzedzi systemowych (np. `lsblk`, `/proc/mounts`) musi byc normalizowany (trim, filtruj puste, obsluguj array/null), zanim podejmiesz decyzje.
- STD-069 (SHOULD): probe/inspect nie moga hard-fail na braku `sudo`; zwracaj wynik + note i kontynuuj.
- STD-102 (SHOULD): uruchamiaj komendy zewnetrzne przez `spawn`/`execFile` z args array i `shell: false`; gdy shell jest konieczny, stosuj `--` i bezpieczne quoting/sanitizacje.
- STD-102a (SHOULD): quoting do shella jest centralny (jedna biblioteka/helper), bez lokalnych kopii; dodaj testy edge‑case (`'`, spacje, newline, backslash).
- STD-103 (SHOULD): operacje destrukcyjne (rm/copy/rsync) musza weryfikowac `realpath` i czy sciezka miesci sie w dozwolonym root; nie podazaj za symlinkami.
- STD-106 (SHOULD): ssh/scp/rsync w trybie nieinteraktywnym musza byc uruchamiane z `BatchMode=yes` i fail-fast, bez wiszenia na prompt.
- STD-106a (SHOULD): dla git/ssh ustaw `GIT_TERMINAL_PROMPT=0`, `GIT_ASKPASS=/bin/false`, `SSH_ASKPASS=/bin/false` (brak promptów); brak danych = szybki fail z instrukcja.
- STD-106b (SHOULD): przy uruchamianiu `ssh` pod `sudo` zachowaj `SSH_AUTH_SOCK` lub ustaw `IdentityFile` + `IdentitiesOnly=yes`; ustaw jawny `HOME`/`known_hosts`.
- STD-106c (SHOULD): hostkey prompts eliminuje sie przez pre‑seed `known_hosts` albo jawny `StrictHostKeyChecking=accept-new` (gdy dozwolone); brak wpisu = fail‑fast z instrukcja.
- STD-106d (SHOULD): w testach/CI uzywaj tymczasowego `UserKnownHostsFile`, aby uniknac konfliktow hostkey miedzy uruchomieniami.
- STD-106e (SHOULD): ustawiaj prawidlowe permissje kluczy SSH (private key `0600`, `authorized_keys`/`known_hosts` `0644`), inaczej ssh je zignoruje.
- STD-106e.a (SHOULD): katalog `~/.ssh` ma perms `0700`; inne uprawnienia moga blokowac uzycie kluczy.
- STD-106f (SHOULD): gdy `git` uzywa SSH, ustaw `GIT_SSH_COMMAND` z `BatchMode=yes`, `UserKnownHostsFile=...`, `StrictHostKeyChecking=...`; git nie dziedziczy opcji ssh z innych wywolan, więc brak tego moze blokowac CI.
- STD-106g (SHOULD): preferuj ED25519/ECDSA; `ssh-rsa` jest dozwolone tylko jawnie (opcja `HostKeyAlgorithms`/`PubkeyAcceptedAlgorithms`) i musi byc logowane jako legacy.
- STD-106h (SHOULD): ogranicz liczbe kluczy prezentowanych serwerowi (`IdentitiesOnly=yes` + `IdentityFile`), aby uniknac `Too many authentication failures`.
- STD-106i (SHOULD): nie polegaj na `~/.ssh/config` uzytkownika w automacji; uzywaj `ssh -F /dev/null` lub jawnie nadpisuj opcje, i loguj kluczowe ustawienia.
- STD-106j (SHOULD): wspieraj wymuszenie IPv4/IPv6 (`AddressFamily`/`-4`/`-6`) i loguj wybrana rodzine adresu.
- STD-106k (SHOULD): transfery `scp/rsync` wymagaja „czystego” non‑interactive SSH; uzywaj `-T` i zapewnij brak bannerow/MOTD w shellu non‑interactive.
- STD-106l (SHOULD): jesli uzywasz `ControlMaster`, ustaw krotki `ControlPath` w temp i sprzataj stale sockety; w razie problemow wylacz multiplexing.
- STD-106m (SHOULD): wykrywaj wersje OpenSSH i nie uzywaj `StrictHostKeyChecking=accept-new` tam, gdzie opcja nie jest wspierana; fallback do `yes` + preseed `known_hosts`.
- STD-106n (SHOULD): preflight sprawdza dostepnosc `rsync` na hoście zdalnym (`command -v`); w razie potrzeby uzyj `--rsync-path` z absolutna sciezka.
- STD-106o (SHOULD): gdy `rsync` wymaga `sudo`, uzywaj `--rsync-path='sudo -n rsync'` lub jawnego NOPASSWD tylko dla rsync; brak sudo nie moze wisiec.
- STD-106p (SHOULD): wykrywaj serwery SFTP-only (`ForceCommand internal-sftp`/restricted shell) i zapewnij fallback do `sftp` lub jasny blad z instrukcja.
- STD-106q (SHOULD): limituj rownoleglosc polaczen SSH lub stosuj retry/backoff, aby uniknac limitow `MaxStartups`/`MaxSessions`; w kontrolowanych srodowiskach zwieksz limity serwera.
- STD-106r (SHOULD): preflight sprawdza dostepnosc SFTP (`ssh -s sftp`) i raportuje brak `Subsystem sftp`/`sftp-server` z instrukcja instalacji.
- STD-106s (SHOULD): wykrywaj `requiretty` w `sudo` na hoście i podawaj instrukcje wylaczenia; `ssh -tt` tylko awaryjnie i jawnie logowane.
- STD-106t (SHOULD): unikaj ukrytych promptow SSH: ustaw `PreferredAuthentications=publickey` oraz `KbdInteractiveAuthentication=no`/`PasswordAuthentication=no` w automacji.
- STD-107 (SHOULD): parsowanie outputu narzedzi systemowych powinno wymuszac `LC_ALL=C` (lub `LANG=C`) albo uzywac trybu `--json`/`--output`, aby uniknac roznic locale.
- STD-108 (SHOULD): unikaj `exec()` z domyslnym `maxBuffer`; uzywaj `spawn`/`execFile` lub ustaw `maxBuffer` i loguj przycinki outputu.
- STD-109 (SHOULD): zawsze stosuj `--` przed listą sciezek w komendach zewnetrznych (rm/cp/rsync/scp), aby sciezki zaczynajace sie od `-` nie byly traktowane jako opcje.
- STD-110 (SHOULD): dla komend nieinteraktywnych ustawiaj `stdin` na `ignore`/pusty input, by nie blokowac sie na promptach.
- STD-111 (SHOULD): skrypty shellowe uruchamiane zdalnie zaczynaja sie od `set -euo pipefail`, aby bledy w pipeline nie byly ukryte.
- STD-111a (SHOULD): instalatory systemowe (apt/dpkg) uruchamiaj w trybie nieinteraktywnym (`DEBIAN_FRONTEND=noninteractive`, `TZ=UTC`, `apt-get -y`); brak trybu non‑interactive = fail‑fast.
- STD-111b (SHOULD): gdy uzywasz `tee`/pipeline z `pipefail`, obsłuż SIGPIPE (np. kontrola `PIPESTATUS` lub lokalne wyłączenie `pipefail`), aby nie failować na zamkniętym odbiorcy.
- STD-111c (SHOULD): jesli uzywasz `pipefail`, uruchamiaj skrypt przez `bash` albo sprawdz wsparcie i ustawiaj `pipefail` warunkowo (dash tego nie obsluguje).
- STD-112 (SHOULD): dla synchronizacji katalogow przez rsync stosuj jawna semantyke trailing slash (sync zawartosci vs katalogu) i pokryj to testem.
- STD-112a (SHOULD): uzywaj `rsync --protect-args` (lub `-s`) aby uniknac interpretacji sciezek przez zdalny shell; brak wsparcia opcji = fail‑fast lub wymagaj sciezek bez spacji/metachar.
- STD-113 (SHOULD): parser JSON/JSON5 usuwa BOM i normalizuje CRLF (unikaj bledow na plikach z Windows).
- STD-114 (SHOULD): tmp dla operacji atomowych jest tworzony w tym samym katalogu/FS co plik docelowy (unikaj `EXDEV`).
- STD-115 (SHOULD): rozpakowywanie archiwow wymaga walidacji sciezek (brak `..`, brak absolutnych, brak symlink/hardlink) i twardego fail na naruszenia.
- STD-115a (SHOULD): przy tworzeniu/rozpakowaniu archiwow wylacz ACL/xattr (`--no-acls --no-xattrs`) lub jawnie je czysc po ekstrakcji.
- STD-116 (SHOULD): `rsync --delete` wymaga walidacji dst (w dozwolonym root) i jawnego trybu/zgody dla operacji ryzykownych.
- STD-117 (SHOULD): generowane skrypty maja LF (bez CRLF); w pipeline użyj `dos2unix`/normalizacji newline.
- STD-118 (SHOULD): timeouty i pomiary czasu opieraj na zegarze monotonicznym (`process.hrtime`/`performance.now`), nie na `Date.now()`.
- STD-119 (SHOULD): retry maja limit prób i limit czasu całkowitego (brak nieskończonych pętli), z logowaniem liczby prób.
- STD-120 (SHOULD): lockfile zawiera PID+timestamp; stale locki sa wykrywane i bezpiecznie czyszczone.
- STD-121 (SHOULD): skrypty zawierajace bash‑isms musza byc uruchamiane przez `bash` jawnie (nie domyslny `sh`).
- STD-121a (SHOULD): zdalne skrypty uruchamiane przez SSH nie zakladaja obecnosci `bash`; preferuj `/bin/sh -lc` albo preflightuj `bash` i fail‑fast z instrukcja.
- STD-122 (SHOULD): destrukcyjne kasowanie katalogow odbywa sie przez helper z walidacja niepustej sciezki i `realpath` w dozwolonym root.
- STD-123 (SHOULD): w skryptach z `set -e` operacje typu `grep`/`diff` musza miec jawne sprawdzenie exit code (1 = brak dopasowania) zamiast przerywac skrypt.
- STD-124 (SHOULD): nie parsuj `ls`; do list plikow uzywaj `find -print0`/`xargs -0` lub globbing z `nullglob`, aby uniknac bledow na spacjach/pustych katalogach.
- STD-125 (SHOULD): przed uruchomieniem skryptow czysc ryzykowne ENV (`BASH_ENV`, `ENV`, `CDPATH`, `GLOBIGNORE`) lub ustaw bezpieczne defaulty.
- STD-125a (SHOULD): build/testy czyszcza `NODE_OPTIONS`, `NODE_PATH`, `NODE_EXTRA_CA_CERTS`, `NODE_V8_COVERAGE`, `NODE_DEBUG` (lub ustawiają jawne wartości), aby uniknac wstrzykiwania hookow.
- STD-126 (SHOULD): w skryptach shellowych wszystkie zmienne musza byc cytowane (`"$VAR"`), chyba ze jawnie potrzebny jest splitting.
- STD-127 (SHOULD): unikaj `eval`; gdy musisz dynamicznie skladac komendy, uzywaj args array lub whitelisty tokenow.
- STD-128 (SHOULD): `xargs` uruchamiaj z `-r` (GNU) lub jawnie sprawdzaj, czy input nie jest pusty.
- STD-129 (SHOULD): limity czasu (expiry/licencja/sentinel) liczymy wg czasu **hosta docelowego**; runtime musi je sprawdzac okresowo (`checkIntervalMs`) i nie blokowac wyjscia (timer `unref`).
- STD-130 (SHOULD): jesli format bloba ma wiele wersji, runtime akceptuje znane wersje i waliduje spojnosc `version ↔ length`; nie toleruj cichych rozjazdow.
- STD-129a (SHOULD): rozpakowanie artefaktu odbywa sie w katalogu stagingowym; `current.buildId` aktualizuj dopiero po walidacji.
- STD-129b (SHOULD): dla sentinela z opoznionym wygasaniem uruchamiaj `sentinel verify` tym samym kodem co runtime przed release/deploy; pomijanie weryfikacji tylko jawnie (flaga/ENV) z ostrzezeniem; testy uzywaja krotszych okresow lub hooka czasu.
- STD-130b (SHOULD): dla krytycznych binarek nie polegaj na niekontrolowanym `PATH`; uzywaj `command -v` + whitelisty lub absolutnych sciezek, szczegolnie przy `sudo`.
- STD-130a (SHOULD): wykrywanie narzedzi z `node_modules/.bin` musi uwzgledniac monorepo/workspaces (sprawdzaj kilka poziomow lub uzyj `npm bin -w`/`npm exec`), inaczej CLI/testy beda false‑negative.
- STD-131 (SHOULD): przy ekstrakcji archiwow w deploy ustaw `--no-same-owner` i `--no-same-permissions` oraz ustaw jawne perm po rozpakowaniu.
- STD-132 (SHOULD): masowe operacje na plikach nie moga przekraczac `ARG_MAX`; uzywaj `find ... -exec ... +` lub `xargs -0`.
- STD-133 (SHOULD): odrzucaj absolutne segmenty sciezek w danych z configu i normalizuj `..` przed `path.join`.
- STD-134 (SHOULD): dla plikow runtime z danymi ustaw jawne permissje (np. 0640/0600) i waliduj je w preflight.
- STD-134a (SHOULD): pliki konfiguracyjne kopiowane na hosta maja jawne perms (np. 0640/0600); nie polegaj na domyslnym `umask`.
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
- STD-145a (SHOULD): `set -x`/xtrace tylko w trybie debug i z maskowaniem sekretow; domyslnie OFF.
- STD-146 (SHOULD): unikaj `~` i sciezek relatywnych przy `sudo`; uzywaj sciezek absolutnych i jawnego `HOME`/`cwd`.
- STD-147 (SHOULD): retry sieciowe maja exponential backoff + jitter oraz limit prob i max delay.
- STD-148 (SHOULD): ekstrakcja archiwow ma limit rozmiaru i liczby plikow (ochrona przed zip‑bomb).
- STD-149 (SHOULD): `host`/`user` w targetach sa walidowane (brak spacji/znakow kontrolnych; whitelist znakow).
- STD-149a (SHOULD): `target.host` nie zawiera `user@` ani `:port`; port jest tylko w `sshPort`. IPv6 literal jest normalizowany do `[addr]` dla ssh/scp/rsync.
- STD-150 (SHOULD): zanim uruchomisz `strip`/packer na pliku, zweryfikuj typ (ELF magic/`file`) i w razie braku zgodnosci wykonaj SKIP z powodem.
- STD-150a (SHOULD): po `strip`/packerze wykonaj szybki smoke test (np. `--version`/`--help` lub krótki run z timeoutem), aby wykryć uszkodzone binarki.
- STD-151 (SHOULD): gdy operacja wymaga uprawnien/sandbox escape, komunikat musi jasno prosic o zgode; brak cichych fallbackow.
- STD-152 (SHOULD): dla `thin-split` hardening (strip/packer) musi targetowac **launcher** (`b/a`), a nie wrapper `./<app>`; zapisuj w metadanych/logach, ktory plik byl celem.
- STD-153 (SHOULD): dla packagerów AIO (SEA/thin-single) hardening (strip/packer) jest ignorowany (auto-disabled) z jasnym ostrzeżeniem i rekomendacją `thin-split`; nie próbuj modyfikować AIO.
- STD-154 (SHOULD): dla `sea` `strip`/ELF packer jest ignorowany (auto-disabled) i powinien generować ostrzeżenie z sugestią `thin-split`.
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
- STD-027b (SHOULD): testy zawsze sprawdzaja `exit code` i `signal` procesu; crash sygnalem = FAIL z logiem.
- STD-027c (SHOULD): timeouty helperow/pollingu pochodza z jednego zrodla (run/step timeout) lub maja jawny per-tryb override; brak ukrytych limitow.
- STD-027d (SHOULD): testy funkcji wielomodalnych (np. kilka trybow bootstrapa) pokrywaja kazdy tryb co najmniej raz i loguja aktywny wariant.
- STD-027e (SHOULD): prereq check (narzedzia/feature) jest per‑test/per‑tryb; brak = SKIP z powodem, nie blokuje reszty suite.
- STD-027f (SHOULD): override timeoutow jest warunkowy i wlacza sie tylko, gdy dana funkcja/artefakt jest aktywna.
- STD-027g (SHOULD): runner E2E auto‑discoveruje testy lub uzywa manifestu z CI checkiem, aby zadny test nie byl „zapomniany”.
- STD-027h (SHOULD): gdy ustawiony jest filtr testow, runner loguje liste dopasowanych testow; brak dopasowan = FAIL lub jawny SKIP z instrukcja.
- STD-027i (SHOULD): defaulty E2E sa w pliku wzorcowym w repo, a lokalne override w `.seal/e2e.env` (lub `SEAL_E2E_CONFIG`); runner loguje zrodlo configu, a override jest gitignored.
- STD-027j (SHOULD): instalatory narzedzi E2E uzywaja locka per‑tool/cache i atomowego swapu (tmp + rename), a stamp jest zapisywany po sukcesie.
- STD-027k (SHOULD): lockfile narzedzi E2E jest walidowany schematem; brakujace pola (url/rev/bin) = fail‑fast z lista brakow.
- STD-027l (SHOULD): lokalne patche do narzedzi sa jawnie logowane i sterowane ENV, a wersja patcha/flag wchodzi do stempla cache.
- STD-027m (SHOULD): testy zalezne od funkcji kernela (cgroup/perf/ptrace) maja tryb strict (ENV), ktory zamienia SKIP na FAIL; w trybie domyslnym SKIP zawsze podaje instrukcje jak wymusic strict.
- STD-027n (SHOULD): runner E2E loguje aktywny toolset (np. core/full), a testy/instalatory respektuja go (brak narzedzi w toolsecie = SKIP lub jawny FAIL w trybie strict).
- STD-027s (SHOULD): wartosc `SEAL_E2E_TOOLSET` jest walidowana (allowlista), a nieznana wartosc daje FAIL lub wyrazny warning + fallback.
- STD-027t (SHOULD): ustawienia rownoległosci E2E (`SEAL_E2E_PARALLEL`, `SEAL_E2E_PARALLEL_MODE`, `SEAL_E2E_JOBS`) sa walidowane i logowane jako effective config; niepoprawne wartosci = FAIL lub jawny fallback.
- STD-027u (SHOULD): sciezki `SEAL_E2E_EXAMPLE_ROOT`/`SEAL_E2E_SEED_ROOT` sa walidowane jako bezpieczne (np. `/tmp`/`$TMPDIR`), nie wskazuja na repo/systemowe rooty; niebezpieczne = FAIL z instrukcja, chyba ze jawny override.
- STD-027v (SHOULD): `SEAL_E2E_SUMMARY_PATH` jest unikalny per‑run/grupa lub zapisy sa chronione lockiem, aby uniknac przeplatania w trybie rownoleglym.
- STD-027w (SHOULD): summary jest zapisywane poza repo (np. `/tmp`/`$TMPDIR`); zapis w repo wymaga jawnego override i ostrzezenia (zwl. przy uruchomieniu jako root).
- STD-027x (SHOULD): pola summary (group/test) sa sanitizowane (bez `\\t`/`\\n`) lub escapowane w stabilny sposob.
- STD-027o (SHOULD): jesli `SEAL_E2E_CONFIG` jest ustawiony i plik nie istnieje lub nie jest czytelny, runner daje FAIL albo wyrazny warning + log fallback.
- STD-027p (SHOULD): plik configu E2E jest parsowany jako `KEY=VALUE` (bez wykonywania kodu); jesli uzywasz `source`, sprawdz ownership/perms i blokuj world‑writable pliki.
- STD-027q (SHOULD): cache narzedzi E2E ma bezpieczne perms/ownership (nie world‑writable); wykrycie niebezpiecznych perms = fail‑fast.
- STD-027r (SHOULD): stempel cache narzedzi buildowanych ze zrodel uwzglednia wersje kompilatora/toolchaina i kluczowe flagi/patch version, aby wymusic rebuild przy zmianie.
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
- STD-070a (SHOULD): workspace `seal.json5` moze zawierac `defaults` dziedziczone przez projekty; merge jest deterministyczny (od najdalszego parenta do najblizszego), a tablice sa nadpisywane (nie łączone).
- STD-070b (SHOULD): `defaults` nie moga zawierac `projects`; konfiguracja projektu zawsze ma pierwszenstwo nad `defaults`.
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
- STD-157a (SHOULD): jeśli anti‑debug opiera się o `TracerPid`, sama kontrola na starcie nie wystarcza — check powinien być wykonywany okresowo lub w punktach krytycznych (np. przed odszyfrowaniem/uruchomieniem wrażliwego kodu).
- STD-158a (SHOULD): okresowe kontrole (np. `setInterval`) muszą być `unref()` aby nie blokowały naturalnego zakończenia procesu.
- STD-159a (SHOULD): jeśli włączono `tracerPidThreads`, sprawdzaj `TracerPid` dla wszystkich tasków (`/proc/self/task/<tid>/status`).
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
- STD-089i.c (SHOULD): testy wykrywaja `docker compose` (v2) vs `docker-compose` (v1), loguja wybrana binarke i w razie braku wypisuja instrukcje instalacji.
- STD-089j (SHOULD): testy uruchamiane jako root nie modyfikuja repo; pracuja na kopii lub temp‑workspace i sprzataja wszystko w `finally`.
- STD-089k (SHOULD): w testach ustaw `NO_COLOR=1` i `FORCE_COLOR=0`, aby ograniczyc ANSI w outputach narzedzi (latwiejsze parsowanie).
- STD-089l (SHOULD): w CI/E2E ustaw `NPM_CONFIG_FETCH_*` (retries/timeout) aby uniknac wiszenia npm przy problemach sieciowych.
- STD-089m (SHOULD): gdy npm działa jako root w CI/containers, ustaw `NPM_CONFIG_UNSAFE_PERM=true` lub uruchom npm jako nie‑root.
- STD-089n (SHOULD): w CI/E2E wyłącz `npm audit`/`fund` i progress (`NPM_CONFIG_AUDIT=false`, `NPM_CONFIG_FUND=false`, `NPM_CONFIG_PROGRESS=false`).
- STD-089o (SHOULD): w testach/CI ustaw `CI=1`, aby wymusic nieinteraktywny tryb narzedzi (brak promptow/spinnerow).
- STD-089p (SHOULD): w CI/E2E ustaw `NPM_CONFIG_UPDATE_NOTIFIER=false`, aby uniknac sieciowych promptow npm.
- STD-089q (SHOULD): narzedzia E2E maja pinowane wersje w repo (lockfile) i wspolny installer korzystajacy z locka; ten sam lock obowiazuje lokalnie i w CI/Dockerze.
- STD-089r (SHOULD): obrazy E2E budowane z Dockerfile maja label z hashem wejsc (Dockerfile/entrypoint); mismatch wymusza rebuild.
- STD-090c (SHOULD): preflight sprawdza **narzedzia CLI** (np. `postject` w `node_modules/.bin`/PATH), nie tylko obecność modulu.
- STD-091a (SHOULD): funkcje zalezne od architektury (np. CPUID) musza degradująco dzialac na platformach bez wsparcia (pusty/neutralny ID zamiast twardego bledu).
- STD-092a (SHOULD): `--skip-check` jest wyraznie oznaczony jako ryzykowny i zawsze wypisuje ostrzezenie; krytyczne braki toolchaina nie powinny byc maskowane.
- STD-093 (SHOULD): generowane binarki/skrypty maja jawny `chmod +x` i test uruchomienia, aby uniknac `Permission denied`.
- STD-094 (SHOULD): w razie bledu narzedzi zewnetrznych (cc/rsync/ssh) wypisz komendy i stderr/stdout (z limitem) dla diagnozy.
- STD-095 (SHOULD): szanuj `TMPDIR` oraz sytuacje `noexec` na `/tmp`; tymczasowe binarki uruchamiaj w bezpiecznym katalogu.
- STD-096 (SHOULD): przed startem procesu sprawdzaj zajety port; wypisz PID/komende procesu lub jasny hint naprawczy (zeby uniknac niejasnego `EADDRINUSE`).
- STD-097 (SHOULD): preflight/deploy sprawdza wolne miejsce na serwerze (`installDir` i `/tmp`) i failuje z instrukcja, jesli brak miejsca.
- STD-097a (SHOULD): preflight/deploy sprawdza mount options `installDir` i failuje, gdy wykryje `noexec` (z instrukcja wyboru innej sciezki).
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
- STA-004 (MUST): `/healthz` i `/status` MUST NOT expose protection details (seal/sentinel/anti-debug); weryfikacja tylko przez narzedzia deployera (np. `seal sentinel verify`).

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

## 9b. Dodatkowe standardy (SHOULD)

- STD-200 (SHOULD): loguj wersje narzedzi builda (`tool --version`) dla kazdego uzytego narzedzia.
- STD-201 (SHOULD): loguj absolutne sciezki do narzedzi (`which`/`command -v`), aby zdiagnozowac PATH.
- STD-202 (SHOULD): cache buildow kluczuj po `os+arch` (oraz wersji formatu), aby uniknac niezgodnosci.
- STD-203 (SHOULD): wspieraj deterministyczne buildy (`SOURCE_DATE_EPOCH`/stale czasy) i loguj tryb.
- STD-204 (SHOULD): archiwa tworzone w stabilnym porzadku plikow (sort po sciezce).
- STD-205 (SHOULD): waliduj TMPDIR (istnieje, `+w` i `+x`, brak `noexec`) i dawaj jasna instrukcje zmiany.
- STD-206 (SHOULD): umozliwiaj override katalogu temp oraz waliduj zapisywalnosc.
- STD-207 (SHOULD): ogranicz domyslna rownoleglosc kompilacji; pozwol na jawny override.
- STD-208 (SHOULD): `CFLAGS/CXXFLAGS/LDFLAGS` z ENV musza byc czyszczone lub jawnie logowane.
- STD-209 (SHOULD): brak wskazanego kompilatora = fail‑fast, bez cichych fallbackow.

- STD-210 (SHOULD): nazwa artefaktu zawiera `target+packager+buildId`, aby uniknac kolizji.
- STD-211 (SHOULD): nie nadpisuj artefaktow bez `--force` lub unikalnej nazwy.
- STD-212 (SHOULD): waliduj, ze artefakt nie jest pusty/uciety (rozmiar + minimalna zawartosc).
- STD-213 (SHOULD): ustawiaj jawne permissje dla plikow wykonywalnych i configow w release.
- STD-214 (SHOULD): przy rozpakowaniu na hostach uzywaj `--no-same-owner`/`--numeric-owner`.
- STD-215 (SHOULD): generuj manifest plikow z hashami dla releasu.
- STD-216 (SHOULD): zapisuj metadane wersji (`buildId`, `packager`, `configHash`).
- STD-217 (SHOULD): release dir jest czyszczony lub tworzony od nowa per build.
- STD-218 (SHOULD): symlinki w release musza byc blokowane albo jawnie walidowane.
- STD-219 (SHOULD): sciezki w artefakcie musza byc relatywne (brak absolutnych).

- STD-220 (SHOULD): zdalne skrypty deploy zaczynaja sie od `set -euo pipefail`.
- STD-221 (SHOULD): przed deploy sprawdz zgodnosc architektury (`uname -m`).
- STD-222 (SHOULD): przed deploy sprawdz kompatybilnosc runtime (glibc/musl).
- STD-223 (SHOULD): ustaw i weryfikuj `umask` podczas deploy na serwerze.
- STD-224 (SHOULD): aktualizuj `current` atomowo (`ln -sfn` + `fsync`).
- STD-225 (SHOULD): skladanie komend zdalnych przez bezpieczne quoting/array (bez konkatenacji).
- STD-226 (SHOULD): weryfikuj istnienie service usera (`id -u`) przed install.
- STD-227 (SHOULD): brak systemd = fail‑fast z instrukcja (bez cichych fallbackow).
- STD-228 (SHOULD): po deploy waliduj owner/perms kluczowych plikow.
- STD-229 (SHOULD): `current.buildId` zapisuj atomowo (tmp + rename + fsync).

- STD-230 (SHOULD): child procesy dostaja tylko allowlist ENV (bez wyciekow sekretow).
- STD-231 (SHOULD): sekrety nie moga byc przekazywane w CLI args (tylko plik/ENV).
- STD-232 (SHOULD): instalatory uzywaja tymczasowego `.npmrc` z ograniczonymi perms i cleanup.
- STD-233 (SHOULD): pobierane binarki musza miec checksumy/signature i byc weryfikowane.
- STD-234 (SHOULD): `LD_*` z ENV musi byc czyszczone przed exec child procesow.
- STD-235 (SHOULD): pliki sekretow tworzone z `umask 077` i `chmod 0600`.
- STD-236 (SHOULD): logi/diagnostyka redaguja klucze typu `password/token/secret`.
- STD-237 (SHOULD): sekrety przechowywane w dedykowanym katalogu z ograniczonymi perms.
- STD-238 (SHOULD): tymczasowe pliki z sekretami sa usuwane deterministycznie.
- STD-239 (SHOULD): core dumpy sa domyslnie wylaczone (opt‑in z ostrzezeniem).
- STD-239a (SHOULD): gdy proces jest uruchamiany przez systemd, ustaw `LimitCORE=0` (i ewentualnie `CoredumpFilter=`); dodatkowo `ulimit -c 0` w runtime dla spojnoci.

- STD-240 (SHOULD): unknown keys w configu daja warning/blad (strict schema).
- STD-241 (SHOULD): wartosci z ENV sa trimowane i walidowane.
- STD-242 (SHOULD): wartosci liczbowe sa parsowane i walidowane w zakresie.
- STD-243 (SHOULD): sciezki z configu sa normalizowane i weryfikowane w root.
- STD-244 (SHOULD): merge configu ma jawna strategie (deep merge lub explicit).
- STD-245 (SHOULD): defaulty stosuja `??`, nie `||`, aby nie nadpisywac `false/0`.
- STD-246 (SHOULD): auto‑create config tylko w dev (explicit flag), nie w prod.
- STD-247 (SHOULD): sprawdzaj owner/perms configu, gdy zawiera sekrety.
- STD-248 (SHOULD): loguj efektywne flagi/booleany.
- STD-249 (SHOULD): diff configu normalizuje kolejnosc, gdy order nie jest semantyczny.

- STD-250 (SHOULD): readiness to polling z timeoutem (nie `sleep`).
- STD-251 (SHOULD): testy snapshot/restore `process.env`.
- STD-252 (SHOULD): testy maja per‑test temp dir (`mkdtemp`).
- STD-253 (SHOULD): testy seeduja RNG i loguja seed.
- STD-254 (SHOULD): testy asercyjnie sprawdzaja exit code/signal child procesow.
- STD-255 (SHOULD): testy rownolegle izolują cache lub uzywaja locka.
- STD-256 (SHOULD): brak zaleznosci w testach = SKIP z instrukcja.
- STD-257 (SHOULD): przy failu testy zachowuja logi/artefakty (z limitem).
- STD-258 (SHOULD): testy ustawiają `TZ=UTC` i `LC_ALL=C`.
- STD-259 (SHOULD): testy izolują git config/hooks (`GIT_CONFIG_*`, `core.hooksPath=/dev/null`).

- STD-260 (SHOULD): logi zawsze zawieraja `appName/buildId`.
- STD-261 (SHOULD): timestampy w logach to UTC/ISO.
- STD-262 (SHOULD): bledy zawieraja exit code/signal.
- STD-263 (SHOULD): diagnostyka domyslnie w trybie safe; full tylko jawnie.
- STD-264 (SHOULD): `--verbose` loguje uruchomione komendy (z sanitizacja).
- STD-265 (SHOULD): pomiary czasu oparte o zegar monotoniczny.
- STD-266 (SHOULD): rate‑limit/sampling dla powtarzalnych bledow.
- STD-267 (SHOULD): biblioteki uzywaja centralnego loggera, nie `console`.
- STD-268 (SHOULD): na fatal exit logi sa flushowane przed `exit`.
- STD-269 (SHOULD): logi do pliku maja rotacje lub limit rozmiaru.

- STD-270 (SHOULD): workspace zwraca non‑zero przy bledzie projektu (chyba ze `--continue-on-error`).
- STD-271 (SHOULD): operacje multi‑project drukują summary (ok/fail/skip).
- STD-272 (SHOULD): help/docs aktualizowane razem ze zmianami opcji (CI check).
- STD-273 (SHOULD): nazwy opcji sa spojne (kebab‑case), bez nadmiaru aliasow.
- STD-274 (SHOULD): uzycie `--force` wypisuje ostrzezenie.
- STD-275 (SHOULD): dostępny tryb `--yes/--non-interactive` (bez promptow).
- STD-276 (SHOULD): dostępny `--json` dla automatyzacji.
- STD-277 (SHOULD): zawsze wypisz resolved root/workspace.
- STD-278 (SHOULD): zawsze wypisz efektywny target (bez ukrytych defaultow).
- STD-279 (SHOULD): nieznane argumenty = blad z sugestiami.

- STD-280 (SHOULD): `rm -rf` wymaga guardu (sciezka niepusta, w dozwolonym root).
- STD-281 (SHOULD): kopiowanie katalogow nie dereferuje symlinkow (albo jawnie blokuje).
- STD-282 (SHOULD): generowane pliki sa tylko w `seal-out`/outDir.
- STD-283 (SHOULD): temp dir tworzony w jawnej bazie i walidowany (noexec/permissions).
- STD-284 (SHOULD): operacje FS retry na `EINTR`.
- STD-285 (SHOULD): przed `kill` sprawdzaj PID/`cmdline`, nie tylko nazwe procesu.
- STD-286 (SHOULD): ustaw `FD_CLOEXEC` na deskryptorach tymczasowych/pipes.
- STD-287 (SHOULD): unikaj `chmod -R` na release; ustawiaj perms selektywnie.
- STD-288 (SHOULD): segmenty sciezek sanitizowane (brak `..`, brak absolutnych).
- STD-289 (SHOULD): `fsync` pliku i katalogu po zapisie krytycznych plikow.

- STD-290 (SHOULD): HTTP ma `connect` i `total` timeout dla kazdego requestu.
- STD-290a (SHOULD): narzedzie do HTTP checkow (curl/wget) jest preflightowane; brak = jasny blad z instrukcja lub jawny SKIP/fallback.
- STD-291 (SHOULD): retry tylko dla idempotentnych operacji (lub jawnie oznaczonych).
- STD-292 (SHOULD): komunikaty rozrozniaja DNS/timeout/TLS.
- STD-293 (SHOULD): wylaczenie TLS verify to opt‑in z ostrzezeniem.
- STD-294 (SHOULD): uzycie proxy z ENV tylko gdy jawnie dozwolone.
- STD-294a (SHOULD): lokalne/loopback HTTP checki musza omijac proxy niezaleznie od ENV (ustaw `NO_PROXY` i `no_proxy`, a dla `curl` dodaj `--noproxy "*"` lub whitelist).
- STD-295 (SHOULD): limituj redirecty i loguj finalny URL.
- STD-296 (SHOULD): sockety HTTP maja timeout/cleanup (brak wyciekow).
- STD-297 (SHOULD): polaczenia dlugie maja heartbeat/ping + timeout.
- STD-298 (SHOULD): skrypty używają portable `sed_inplace` (GNU/BSD) lub `perl -pi`/`python -i`; brak `sed -i` na ślepo.
- STD-299 (SHOULD): archiwa są deterministyczne (`gzip -n`, `tar --sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner`).
- STD-299a (SHOULD): dla dlugich sciezek uzywaj `tar --format=gnu` lub `--format=pax` i fail‑fast na ostrzezeniach truncation.
- STD-300 (SHOULD): przed ciężkimi operacjami sprawdzaj lokalne wolne miejsce (preflight).
- STD-301 (SHOULD): tmp w world‑writable używa `mkstemp`/`O_EXCL` + `lstat` (blokada symlink/hardlink).
- STD-302 (SHOULD): czytanie linii z plików przez `IFS= read -r` (bez utraty spacji/backslash).
- STD-303 (SHOULD): archiwizacja nie dereferuje symlinków (lub jawna walidacja).
- STD-304 (SHOULD): `PATH` jest jawnie ustawiony i nie zawiera `.`.
- STD-305 (SHOULD): sprawdzaj `ulimit -n` i ustaw minimalny limit dla procesu.
- STD-306 (SHOULD): transfery zachowują perms/mtime (`rsync -a`, `scp -p`) gdy jest to wymagane.
- STD-307 (SHOULD): rozpakowanie archiwów ma limity rozmiaru i liczby plików (anti zip‑bomb).
- STD-308 (SHOULD): instalatory `apt/dpkg` maja retry/backoff lub czekanie na lock z timeoutem.
- STD-309 (SHOULD): obrazy dockera w testach sa pinowane do digestu lub jawnej wersji.
- STD-310 (SHOULD): uzywaj wrappera dla `stat`/`date` lub `python -c` (portable metadane).
- STD-311 (SHOULD): skrypty bash przechodza `shellcheck` w CI.
- STD-312 (SHOULD): preflight sprawdza `python3` dla zaleznosci natywnych i podaje instrukcje instalacji.
- STD-313 (SHOULD): detekcja driftu czasu (np. >5 min) blokuje time‑based guardy i daje instrukcje NTP.
- STD-314 (SHOULD): limit rownoleglosci uwzglednia pamiec (cap mimo `nproc`).
- STD-315 (SHOULD): dla nieinteraktywnych wywolan `git` ustaw `GIT_PAGER=cat` oraz `PAGER=cat`.
- STD-316 (SHOULD): w CI ustaw `TERM=dumb` (i/lub `CI=1`) aby wymusic tryb nieinteraktywny.
- STD-317 (SHOULD): skrypty ustawiają `LC_ALL=C` tam, gdzie sort/parse zalezy od locale.
- STD-318 (SHOULD): bledy CLI trafiaja na stderr, a exit code jest nie‑zero; bledy uzycia maja osobny kod (np. 2).
- STD-319 (SHOULD): przed odczytem configu/sekretow wymusz `regular file` (odrzuc FIFO/urzadzenia).
- STD-320 (SHOULD): przy otwieraniu wrazliwych plikow stosuj `O_NOFOLLOW` lub `lstat` + `open` tylko na regular file.
- STD-321 (SHOULD): rozpakowanie archiwow odrzuca entries typu device/FIFO; dopuszczalne tylko file/dir/symlink.
- STD-322 (SHOULD): `--help` i komunikat “usage” pojawiaja sie przy bledach uzycia.
- STD-323 (SHOULD): `buildId`/timestamp uzywa UTC i stabilnego formatu (np. `YYYYMMDD-HHMMSS`).
- STD-324 (SHOULD): do ID/nonce uzywaj `crypto.randomUUID()`/`randomBytes` (nie `Math.random`).
- STD-325 (SHOULD): wartosci enum z configu sa normalizowane (lower‑case) i walidowane against whitelist.
- STD-326 (SHOULD): porty w configu maja walidacje zakresu 1‑65535 z jasnym bledem.
- STD-327 (SHOULD): bledy odnoszace sie do plikow wypisuja absolutne sciezki.
- STD-328 (SHOULD): skanowanie repo ignoruje `.git`, `node_modules`, `seal-out` i inne katalogi generowane.
- STD-329 (SHOULD): obliczanie hashy jest strumieniowe (bez wczytywania calego pliku do RAM).
- STD-330 (SHOULD): logi/raporty maja limit rozmiaru lub rotacje.
- STD-331 (SHOULD): generowane manifesty plikow zapisuj z jawnym `mode` (nie polegaj na umask).
- STD-332 (SHOULD): walidacja sciezek uzywa `realpath` i wymusza, by sciezka byla w dozwolonym root.
- STD-333 (SHOULD): operacje `rm -rf` ogranicz do jednego FS (`--one-file-system`) lub jawnie sprawdz mount point.
- STD-334 (SHOULD): zapisy JSON/manifestow sa deterministyczne (sort kluczy).
- STD-335 (SHOULD): rozpakowanie tar nie zachowuje luznych perms (`--no-same-permissions`) i/lub jawny `chmod`.
- STD-336 (SHOULD): synchronizacja zdalna wymusza oczekiwane perms (`--chmod` lub `--no-perms` + `chmod`).
- STD-337 (SHOULD): po kopiowaniu katalogow ustawiaj jawne perms dla katalogow docelowych.
- STD-338 (SHOULD): walidacja locka sprawdza start‑time/cmdline procesu (ochrona przed reuse PID).
- STD-339 (SHOULD): `chmod`/`chown` nie podaza za symlinkami (`--no-dereference`/`-h`).
- STD-340 (SHOULD): listy plikow z `readdir`/glob sa sortowane przed dalszym przetwarzaniem.
- STD-341 (SHOULD): rekurencyjne skanowanie ma limit glebokosci lub ochronę przed petlami symlink.
- STD-342 (SHOULD): skanowanie FS ogranicz do jednego mount‑pointu (`-xdev`) lub jawnego root.
- STD-343 (SHOULD): w trybie `--json` stdout zawiera tylko JSON; logi ida na stderr.
- STD-344 (SHOULD): brak `timeout` w systemie -> uzyj timeoutow zaimplementowanych w kodzie (bez wiszenia).
- STD-345 (SHOULD): cleanup obejmuje dotfiles (nie tylko `*`).
- STD-346 (SHOULD): brak dostepu do `/proc` (hidepid) daje jasny blad z instrukcja.
- STD-347 (SHOULD): `mkdir -p` poprzedzaj sprawdzeniem, czy sciezka nie jest plikiem.
- STD-348 (SHOULD): wykrywaj kolizje nazw na case‑insensitive FS i fail‑fast.
- STD-349 (SHOULD): operacje destrukcyjne maja denylistę niebezpiecznych sciezek (`/`, `/home`, `C:\\`).
- STD-350 (SHOULD): nazwy plikow są sanitizowane/escapowane w logach i przy budowie komend.
- STD-350a (SHOULD): sciezki przekazywane do `scp/ssh` nie moga zawierac spacji/metachar bez escapingu; preferuj nazwy z bezpiecznego alfabetu i losowy sufiks dla tmp na hoście zdalnym.
- STD-351 (SHOULD): waliduj dlugosc sciezek i dawaj jasny blad `ENAMETOOLONG`.
- STD-352 (SHOULD): watchery (`fs.watch`) nie steruja krytyczną logika; uzywaj polling/explicit checks.
- STD-353 (SHOULD): po rozpakowaniu usuwaj bity `setuid/setgid` i weryfikuj perms.
- STD-354 (SHOULD): filtruj pliki smieciowe (`.DS_Store`, `Thumbs.db`) w bundlingu/archiwizacji.
- STD-355 (SHOULD): duze dane przekazuj przez plik/STDIN, nie przez argumenty CLI (`E2BIG`).
- STD-356 (SHOULD): po rozpakowaniu/kopiowaniu ustawiaj jawne perms dla binarek i nie‑binarek.
- STD-357 (SHOULD): loguj sciezki do narzedzi i pozwol je wymusic w configu.
- STD-358 (SHOULD): nie uzywaj nieportowalnych opcji (`grep -P`, `sed -r`); wykrywaj wariant lub stosuj alternatywy.
- STD-359 (SHOULD): `realpath` musi byc portable (python/node) lub z detekcja platformy.
- STD-360 (SHOULD): weryfikacja checksum ma fallback gdy brak `sha256sum` (`shasum`/`openssl`).
- STD-361 (SHOULD): skrypty wymagajace GNU tar wykrywaja `tar --version` i fail‑fast z instrukcja.
- STD-362 (SHOULD): pipeline z `-print0` nie zaklada `sort -z` bez checka wsparcia.
- STD-363 (SHOULD): hosty `localhost`/IPv6 są jawnie ustawiane; unikaj niejawnego dual‑stack.
- STD-364 (SHOULD): porty testowe wybieraj przez bind na `0`, a nie przez losowanie z wyprzedzeniem.
- STD-365 (SHOULD): po starcie serwera loguj `host:port` (debuggability).
- STD-366 (SHOULD): domyslny bind to `127.0.0.1`; publiczny bind tylko jawnie.
- STD-367 (SHOULD): przy `EADDRINUSE` wypisz PID/komende i sugestie zmiany portu.
- STD-368 (SHOULD): systemd ma `RestartSec` i `StartLimit*` (backoff i limit restartow).
- STD-369 (SHOULD): ustaw `TimeoutStopSec` (i opcjonalny `ExecStop`) aby uniknac twardego kill bez sprzatania.
- STD-370 (SHOULD): ustaw `KillMode=control-group` (lub `mixed`) aby zabijac wszystkie procesy potomne.
- STD-371 (SHOULD): ustaw `LimitNOFILE` na bezpiecznym poziomie.
- STD-372 (SHOULD): `EnvironmentFile` uzywa absolutnych sciezek.
- STD-373 (SHOULD): skrypty cytuja zmienne i ustawiają `IFS=$'\\n\\t'` (brak word‑splitting/globbing).
- STD-374 (SHOULD): `flock` uzywa timeoutu (`-w`) i fail‑fast po przekroczeniu.
- STD-375 (SHOULD): uzywaj `printf` zamiast `echo -e` dla przenosnego outputu.
- STD-376 (SHOULD): `trap` cleanup ustawiaj na poczatku skryptu.
- STD-377 (SHOULD): pętle `while read` obsługują ostatnią linię bez `\\n`.
- STD-378 (SHOULD): skrypty uzywajace bash‑owych funkcji maja shebang bash albo sa POSIX‑sh.
- STD-379 (SHOULD): przekazywanie argumentow w bash uzywa `\"$@\"`, nie `$*`.
- STD-380 (SHOULD): tmp katalogi tworz przez `mktemp -d` (unikaj statycznych nazw).
- STD-381 (SHOULD): `pushd/popd` wymaga bash; w sh uzywaj `cd` + `pwd`.
- STD-382 (SHOULD): dla danych uzywaj `printf '%s\\n'`, nie `echo`.
- STD-383 (SHOULD): systemd unit ma ustawiony `UMask=` zgodnie z polityka uprawnien.
- STD-384 (SHOULD): uzywaj `RuntimeDirectory`/`StateDirectory` zamiast recznego mkdir.
- STD-385 (SHOULD): `--dry-run` jest bez‑efektowy (brak zapisow); loguje planowane akcje.
- STD-386 (SHOULD): `--json` output ma `schemaVersion` i stabilny format.
- STD-387 (SHOULD): w trybie `--json` ostrzezenia sa zwracane w polu `warnings[]`.
- STD-388 (SHOULD): na NFS lub nieobsługiwanych FS lock nie polega na `flock` (uzyj lock‑dir/atomic mkdir lub fail‑fast).
- STD-389 (SHOULD): gdy overwrite jest zabroniony, uzywaj `O_EXCL`/`flag: 'wx'`.
- STD-390 (SHOULD): input z ENV jest sanitizowany (brak kontrolnych znakow).
- STD-391 (SHOULD): ścieżki relatywne sa resolve do absolutnych na starcie.
- STD-392 (SHOULD): lockfile zawiera `hostname`/`pid`/`startTime` i jest weryfikowany.
- STD-393 (SHOULD): `systemctl`/`journalctl` uruchamiaj z `--no-pager` lub `SYSTEMD_PAGER=cat`.
- STD-394 (SHOULD): wykrywaj `sudo: sorry, you must have a tty` i zwracaj instrukcje naprawy.
- STD-395 (SHOULD): `rsync` uzywa `--partial-dir` i cleanup po przerwaniu.
- STD-396 (SHOULD): konfiguracja pozwala wymusic `scp -O` lub preferuje `rsync`/`sftp` dla kompatybilnosci.
- STD-397 (SHOULD): narzedzia uruchamiaj w trybie bez ANSI/pagera (NO_COLOR/--no-ansi).
- STD-398 (SHOULD): wykrywaj duplikaty kluczy w JSON/JSON5 (warning lub fail‑fast).
- STD-399 (SHOULD): config ma limit rozmiaru (max bytes) i jest odrzucany gdy przekroczony.
- STD-400 (SHOULD): config jest UTF‑8; pliki binarne/nie‑UTF8 są odrzucane.
- STD-401 (SHOULD): precedence configu jest jawny i logowany (CLI > ENV > file).
- STD-402 (SHOULD): brak `eval`/`new Function` w parsowaniu configu.
- STD-403 (SHOULD): obsluguj `EPIPE`/`SIGPIPE` przy zapisie stdout (ciche wyjscie).
- STD-404 (SHOULD): limituj rownoleglosc I/O aby uniknac `EMFILE`.
- STD-405 (SHOULD): deskryptory plikow sa zamykane w `finally` (brak wyciekow FD).
- STD-406 (SHOULD): przy `EEXIST` sprawdz, czy sciezka jest katalogiem; inaczej fail‑fast.
- STD-407 (SHOULD): krytyczne zapisy sa `fsync`owane po `writeFile`/`appendFile`.
- STD-408 (SHOULD): detekcja narzedzi nie wymaga bash; uzywaj PATH‑based resolvera lub POSIX sh.
- STD-409 (SHOULD): parsuj boolean‑like stringi (`true/false/1/0/yes/no/on/off`) z ENV.
- STD-410 (SHOULD): detekcja narzedzi sprawdza `X_OK` (wykonywalnosc), nie tylko istnienie.
- STD-411 (SHOULD): niepoprawne wartosci z ENV loguja ostrzezenie + wartosc domyslna.
- STD-412 (SHOULD): helpery E2E uzywaja wspolnego modułu do detekcji narzedzi.
- STD-413 (SHOULD): template/init nie wlacza opcjonalnych narzedzi/ochron bez jawnego opt‑in.
- STD-414 (SHOULD): przed buildem sprawdzaj dostepnosc narzedzi wymaganych przez wlaczone opcje.
- STD-415 (SHOULD): domyslny profil jest dev‑friendly; tryby strict/secure wymagaja jawnego wyboru.
- STD-416 (SHOULD): dokumentuj wymagania/konsekwencje kazdego zabezpieczenia (toolchain, OS).
- STD-417 (SHOULD): testy E2E obejmuja profil minimalny i maksymalny.

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
- TEST-009 (SHOULD): testy wypisują podsumowanie SKIP i mają tryb strict, w którym SKIP = FAIL (runy certyfikacyjne).
- TEST-010 (SHOULD): testy wykrywają ograniczenia środowiska (OS, brak systemd, brak capów) i oznaczają je jako SKIP z instrukcją naprawy.
- TEST-011 (SHOULD): testy bezpieczeństwa logują kontekst hosta (kernel/arch, seccomp, kluczowe sysctl), żeby wyniki były porównywalne.

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
