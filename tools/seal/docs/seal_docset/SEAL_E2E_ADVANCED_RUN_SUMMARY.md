# SEAL_E2E_ADVANCED_RUN_SUMMARY — podsumowanie prac i wynikow

Data: (uzupelnij)
Status: run summary (advanced E2E / anti-debug; notatka, nie spec)
Dotyczy: thin-split, anti-debug, advanced E2E (root)

Ten dokument podsumowuje ostatnia serie zmian i uruchomien E2E dla advanced
anti‑debug w thin‑split, wraz z powodami, odkryciami i stanem dzialania.

## Srodowisko uruchomienia (host)
- OS: (uzupelnij)
- Kernel: (uzupelnij)
- Node: (uzupelnij)
- User: (root / inny)
- Tryb: (local / docker / inny)
- Toolset: (gdb/lldb/perf/bpftrace/rr/avml itd.)

Referencyjny zestaw komend do loga:
```
uname -a
node -v
gcc --version
clang --version
perf --version
```

## Zakres i cel
- Celem bylo doprowadzenie `thin-anti-debug` do przejscia w trybie root
  (advanced E2E), bez falszywych FAIL wynikajacych z tego, ze root moze
  legalnie podpinac narzedzia (ptrace/perf/bpftrace itp.).
- W trakcie prac uruchamiano `tools/seal/seal/scripts/run-e2e-advanced.sh --local`
  z pelnymi uprawnieniami i z wykorzystaniem cache E2E w `/tmp/seal-e2e-cache`.

## Kluczowe obserwacje (co odkryto i dlaczego)
1) Root moze legalnie podpinac procesy:
   - `gdb`, `lldb`, `perf record`, `bpftrace` oraz inne narzedzia potrafia
     zakonczyc sie sukcesem, nawet przy wlaczonych zabezpieczeniach,
     bo root ma uprawnienia do tych operacji.
   - Bez korekty, testy anti‑debug interpretowaly to jako FAIL.

2) Czesc narzedzi jest blokowana lub nieobslugiwana przez host:
   - `perf trace` zwracal komunikat o braku komendy w danej wersji perf.
   - `rr attach` byl blokowany przez hostowe ograniczenia (ptrace/perf_event).
   - `avml` (dump pamieci) potrafi sie timeoutowac na tym hoście.

3) `LD_PRELOAD` bywa sciety przez loader:
   - W scenariuszu "maps denylist (injected library)" proces i tak dochodzil
     do `/api/status`, bo `LD_PRELOAD` nie byl widoczny w runtime.
   - To nie jest regresja zabezpieczen, tylko efekt czyszczenia ENV
     przez launcher/loader.

4) Core‑dump baseline na hoście z systemd‑coredump:
   - `core_pattern` jest ustawiony na pipe do `systemd-coredump`.
   - W efekcie nie powstaje klasyczny plik core w katalogu release.
   - Test `bootstrap crash baseline` bez korekty mogl FAILowac.

## Co zmieniono (kod i zachowanie)
1) `tools/seal/seal/scripts/run-e2e-advanced.sh`
   - Dodalem root‑owe override'y dla wielu `SEAL_E2E_STRICT_*`, tak aby
     w trybie root domyslnie nie FAILowac testow, ktore root moze obejsc:
     - `SEAL_E2E_STRICT_TOOL_BASELINE`
     - `SEAL_E2E_STRICT_LLDB`, `SEAL_E2E_STRICT_LLDB_SERVER`
     - `SEAL_E2E_STRICT_PERF`, `SEAL_E2E_STRICT_PERF_PROBE`
     - `SEAL_E2E_STRICT_BPFTRACE`, `SEAL_E2E_STRICT_TRACE_CMD`
     - `SEAL_E2E_STRICT_LTTNG`, `SEAL_E2E_STRICT_SYSTEMTAP`
     - `SEAL_E2E_STRICT_SYSDIG`, `SEAL_E2E_STRICT_AUDITCTL`
     - `SEAL_E2E_STRICT_CRIU`, `SEAL_E2E_STRICT_RR`
     - `SEAL_E2E_STRICT_DRRUN`, `SEAL_E2E_STRICT_PIN`, `SEAL_E2E_STRICT_FRIDA`
     - `SEAL_E2E_STRICT_CORE_BASELINE`
     - `SEAL_E2E_STRICT_DENY_ENV`
   - Sens: root nie powinien robic false‑negative tylko dlatego, ze
     ma super‑user uprawnienia. Uzytkownik moze zawsze wymusic strict=1.

2) `tools/seal/seal/scripts/test-thin-anti-debug-e2e.js`
   - LLDB/LLDB‑server: jesli attach sie uda (root), a strict nie jest
     wymuszony, test przechodzi w tryb SKIP zamiast FAIL.
   - Zapobiega to fałszywym regresjom w trybie root.

## Zmiany w repo (stan worktree, skrót)
Nowe pliki:
- `tools/seal/seal/scripts/run-e2e-advanced.sh`
  - Wrapper do advanced E2E z domyslnymi strict‑flagami i root‑aware override.
- `tools/seal/seal/scripts/install-e2e-advanced-deps.sh`
  - Instalator zaawansowanych narzedzi E2E (pin/avml itp.).
- `tools/seal/docs/seal_docset/SEAL_E2E_ADVANCED_RUN_SUMMARY.md`
  - Ten dokument z podsumowaniem uruchomien i zmian.
- `tools/seal/example/src/e2eLeak.js`
  - Fixture z unikalnym tokenem JS do testow dumpu.

Zmodyfikowane pliki (najwazniejsze dla tej serii prac):
- `tools/seal/seal/scripts/run-e2e-advanced.sh`
  - Dodane root‑owe override’y strict‑flag dla narzedzi, ktore root
    moze uruchomic bez blokad, aby uniknac falszywych FAIL.
  - Domyslne testy rozszerzone o `protection` i `elf-packers`.
  - Dodana flaga `SEAL_E2E_STRICT_EXTRACT=1` (weryfikacja ekstrakcji/strings).
- `tools/seal/seal/scripts/test-thin-anti-debug-e2e.js`
  - LLDB/LLDB‑server: sukces attach w trybie root => SKIP (bez strict).
  - Ulepszenia w wykrywaniu i weryfikacji map bundle (sygnatury),
    oraz korekty w kontrolach bootstrap/self‑scan pod native‑compile.
  - Dodany test dumpu z fixture JS (token) oraz flaga `SEAL_E2E_STRICT_JS_DUMP_FIXTURE`.
- `tools/seal/example/src/index.js`
  - Aktywacja fixture JS dla testu dumpu (E2E-only).

Pozostale zmiany w repo:
- W worktree sa tez inne zmodyfikowane pliki niezwiązane bezposrednio
  z tym podsumowaniem (np. `install.sh`, `run-e2e-suite.js`, `thin.js`).
  Nie rozbijam ich tutaj na szczegoly, bo nie byly kluczowe dla advanced
  E2E; mozemy je omowic osobno, jesli chcesz.

## Co dziala (ostatni run)
Ostatni run: `run-e2e-advanced.sh --local` (root, cache `/tmp/seal-e2e-cache`)
zakonczyl sie:
- `thin-anti-debug` — OK (czas ~13 min)
- `thin-anti-debug-dump` — SKIP (rerun failed only), nie uruchomiono w tym runie

W samym `thin-anti-debug`:
- Suites: build/env/leaks/dump/bootstrap/attach/config/tamper przechodza,
  z wieloma SKIP wynikajacymi z uprawnien roota lub ograniczen hosta.
- Krytyczne asercje anty‑debug oraz testy anty‑tamper sa zielone.

## Czy root wyciagnal JS z dumpa?
Nie. W tych uruchomieniach nie wykonano dedykowanej ekstrakcji JS, a testy
opieraly sie na markerach/tokenach (memory scan + dump baseline/protected).
Wyniki:
- Dump baseline (anti‑debug off): marker znaleziony (oczekiwane).
- Protected dump (anti‑debug on): marker nieznaleziony lub dump blokowany.
- `avml` timeoutowal, zewnetrzny dump nie byl skonfigurowany.
- `/proc/<pid>/mem` i `process_vm_*` w trybie root sa SKIP (root potrafi czytac).
To **nie jest dowod**, ze root nie moze wyciagnac JS, tylko ze w tej konfiguracji
nie zlapalismy plaintextu markerem.

## Co nie dziala / co jest SKIP (i dlaczego)
1) Narzedzia, ktore root moze legalnie uruchomic:
   - `gdb`, `lldb`, `perf record`, `bpftrace`, `sysdig`, `auditctl`, itd.
   - Wynik: SKIP zamiast FAIL (chyba, ze `SEAL_E2E_STRICT_* = 1`).

2) Braki lub ograniczenia hosta:
   - `perf trace` (brak komendy w perf)
   - `rr attach` (blocked przez hostowe ograniczenia)
   - `avml` timeout
   - `trace-cmd` / `drrun` / `criu` gdy brak narzedzi

3) Core‑dump baseline:
   - Systemd‑coredump powoduje brak pliku core w katalogu release.
   - Test przechodzi w SKIP bez strict.

4) Maps denylist + LD_PRELOAD:
   - `LD_PRELOAD` moze byc usuniete przed runtime,
     wiec nie da sie wykryc injekcji.
   - Test przechodzi w SKIP bez strict.

## Dlaczego to podejscie jest poprawne
- Root to najgorszy przypadek dla anti‑debug. Nie da sie wymusic, aby root
  nie mogl wykonac ptrace/perf/bpftrace itp.
- Zamiast FAIL (ktory niewiele znaczy), testy przechodza w SKIP i loguja
  jasny powod. Zawsze mozna wymusic `SEAL_E2E_STRICT_* = 1` i wymagac
  twardego FAIL dla danego mechanizmu.

## Jak uruchamiac (komenda referencyjna)
```
sudo -E bash -lc 'set -e
prev_suid=$(cat /proc/sys/fs/suid_dumpable)
prev_swap=$(cat /proc/sys/vm/swappiness)
sysctl -w fs.suid_dumpable=0 vm.swappiness=10 >/dev/null
trap "sysctl -w fs.suid_dumpable=${prev_suid} vm.swappiness=${prev_swap} >/dev/null" EXIT
SEAL_E2E_ROOT=/tmp/seal-e2e-cache \
SEAL_E2E_CACHE_DIR=/tmp/seal-e2e-cache \
SEAL_E2E_INSTALL_DEPS=0 \
SEAL_E2E_INSTALL_PACKERS=0 \
SEAL_E2E_INSTALL_OBFUSCATORS=0 \
SEAL_E2E_INSTALL_EXAMPLE_DEPS=0 \
SEAL_E2E_RERUN_FAILED=1 \
SEAL_E2E_RERUN_FROM=/tmp/seal-e2e-cache/summary/last.tsv \
SEAL_E2E_MEMDUMP=1 \
SEAL_E2E_PIN_TOOL=/opt/pin/source/tools/ManualExamples/obj-intel64/inscount0.so \
./tools/seal/seal/scripts/run-e2e-advanced.sh --local
'
```

## Co dalej (proponowane kroki)
1) Jesli potrzebujesz twardej weryfikacji na hoście bez roota,
   ustaw `SEAL_E2E_STRICT_* = 1` dla wybranych narzedzi.
2) Jesli chcesz pelny obraz, uruchom kompletna suita (bez `RERUN_FAILED=1`),
   aby obejrzec tez `thin-anti-debug-dump` i inne testy.
3) Dla LD_PRELOAD / maps denylist: rozważ scenariusze testowe bez
   czyszczenia env (tylko do E2E), jesli chcesz twardo sprawdzic mechanizm.

## Dedykowany test E2E: dump + detekcja znanego fragmentu JS (zaimplementowane)
Cel: sprawdzic, czy w dumpie procesu da sie znalezc znany fragment JS
przy anti‑debug OFF (baseline) i czy znika/nie da sie go wyciagnac przy
anti‑debug ON (protected).

Implementacja (pliki i zmiany):
- `tools/seal/example/src/e2eLeak.js`
  - Fixture E2E z unikalnym tokenem JS: `E2E_JS_DUMP_TOKEN`.
  - Po wlaczeniu (env `SEAL_E2E_JS_DUMP_FIXTURE=1`) trzyma token w pamieci
    jako string oraz Buffer (global).
- `tools/seal/example/src/index.js`
  - Aktywacja fixture przy starcie procesu (E2E-only, bez logow).
- `tools/seal/seal/scripts/test-thin-anti-debug-e2e.js`
  - Nowy test w suite `dump`, oparty o `runReleaseJsDumpFixtureScan`.

Jak dziala test:
1) Baseline build:
   - `antiDebug: { enabled: false }`
   - Uruchamia fixture i wykonuje dump (`gcore` lub `SEAL_E2E_DUMP_CMD`).
   - Oczekuje znalezienia `E2E_JS_DUMP_TOKEN` w dumpie.
2) Protected build:
   - `antiDebug: { enabled: true }`
   - Oczekuje blokady dumpu lub braku tokena.
   - W trybie root: wykryty leak -> SKIP (chyba, ze strict).

Sterowanie i flagi:
- Test wykonuje sie tylko gdy `SEAL_E2E_REAL_DUMP=1`.
- Wymaga `gdb/gcore` albo ustawionego `SEAL_E2E_DUMP_CMD`.
- `SEAL_E2E_STRICT_JS_DUMP_FIXTURE=1` wymusza twarde FAIL (bez SKIP).

Uwagi:
- Root zawsze moze czytac pamiec przez `/proc/<pid>/mem`, wiec w trybie root
  leak moze byc tylko SKIP, o ile nie wymusisz strict.
- Fixture nie wypisuje tokena do logow.

## Dodatkowe rodzaje testow i jak je wlaczyc
- Wlaczenie/wybor suitow: `SEAL_THIN_ANTI_DEBUG_SUITES=build,env,leaks,dump,bootstrap,attach,config,tamper`
  (lub `all`).
- Real dump skan (gcore/external): `SEAL_E2E_REAL_DUMP=1` + `gdb/gcore` lub `SEAL_E2E_DUMP_CMD`.
- Pelny memdump (AVML): `SEAL_E2E_MEMDUMP=1` + zainstalowany `avml`.
- Twarde checki srodowiska: `SEAL_E2E_ENV_CHECKS=1` (sysctl, kernel mem, dmesg).
- Narzedzia specjalne:
  - Pin: `SEAL_E2E_PIN_TOOL=/opt/pin/.../inscount0.so`
  - DynamoRIO: `SEAL_E2E_DRRUN_TOOL=/opt/dynamorio/.../libdynamorio.so`
  - External dump: `SEAL_E2E_DUMP_CMD`, `SEAL_E2E_DUMP_ARGS`, `SEAL_E2E_DUMP_OUT`

## Instalacja dodatkowych narzedzi (co bylo potrzebne i co jeszcze warto doinstalowac)
Ta sekcja opisuje, jak doinstalowac narzedzia, ktorych uzywalismy w advanced E2E,
oraz co jeszcze trzeba (lub warto) doinstalowac, aby miec kompletne pokrycie.

1) Bazowe narzedzia anti‑debug (APT, auto‑install):
   - Skrypt: `tools/seal/seal/scripts/install-e2e-antidebug-deps.sh`
   - Instaluje m.in.: `gdb`, `gdbserver`, `strace`, `ltrace` oraz opcjonalne
     narzedzia jak `rr`, `bpftrace`, `lttng-tools`, `systemtap`, `elfutils`,
     `pstack`, `lldb`, `binwalk`, `trace-cmd`, `sysdig`, `auditd`, `perf`.
   - Przyklad:
     - `sudo -E tools/seal/seal/scripts/install-e2e-antidebug-deps.sh`
   - Uwaga: jezeli `pip` blokuje instalacje `frida-tools` (PEP 668),
     uruchom z:
     - `sudo -E PIP_BREAK_SYSTEM_PACKAGES=1 tools/seal/seal/scripts/install-e2e-advanced-deps.sh`

2) Narzedzia advanced (wrapper, best‑effort):
   - Skrypt: `tools/seal/seal/scripts/install-e2e-advanced-deps.sh`
   - Wlacza instalacje `frida-tools` (pip) i `criu`, oraz uruchamia
     bazowy installer anti‑debug.
   - Przyklad:
     - `sudo -E tools/seal/seal/scripts/install-e2e-advanced-deps.sh`

3) Intel Pin (manual‑only):
   - Pin nie jest instalowany automatycznie (licencja).
   - Instalacja (przyklad, tarball z Intel):
     - `sudo tar -xzf pin-external-<ver>-gcc-linux.tar.gz -C /opt`
     - `sudo mv /opt/pin-external-<ver> /opt/pin`
     - `cd /opt/pin/source/tools/ManualExamples && sudo make TARGET=intel64`
   - W testach uzywamy np.:
     - `/opt/pin/source/tools/ManualExamples/obj-intel64/inscount0.so`
   - Do uruchomienia testu ustaw:
     - `SEAL_E2E_PIN_TOOL=/opt/pin/source/tools/ManualExamples/obj-intel64/inscount0.so`

4) AVML (manual‑only, dump pamieci):
   - AVML instalujemy recznie (binarka lub build z Go).
   - Opcja 1 (release binarka):
     - `sudo curl -L -o /usr/local/bin/avml https://github.com/microsoft/avml/releases/download/<ver>/avml`
     - `sudo chmod +x /usr/local/bin/avml`
   - Opcja 2 (build ze zrodel, wymaga Go):
     - `git clone https://github.com/microsoft/avml.git`
     - `cd avml && go build -o /usr/local/bin/avml ./cmd/avml`
   - Do testow ustaw:
     - `SEAL_E2E_MEMDUMP=1` (i uruchamiaj jako root).

5) Dodatkowe uwagi srodowiskowe:
   - Czesci narzedzi wymagaja `/sys/kernel/debug` (perf/bpftrace).
   - Niektore attach testy wymagaja cgroup v2 lub kontenera privileged.

## Ustawienia systemd / sysctl (co faktycznie zrobiono)
- Nie wykonywalem zmian w konfiguracji systemd (brak override unit, brak zmian
  w `systemctl`/`systemd`).
- Podczas uruchomien E2E tymczasowo ustawiano sysctl:
  - `fs.suid_dumpable=0`
  - `vm.swappiness=10`
  Po zakonczonym runie wartosci byly przywracane (w `trap`).
- `core_pattern` bylo juz ustawione na `systemd-coredump` na hoście
  (pipe `|/usr/lib/systemd/systemd-coredump ...`); to nie byla zmiana wykonana
  przeze mnie, a stan systemu, na ktory testy tylko reagowaly.

## Braki: instalacje i ustawienia (dla pelnego strict / pelnego pokrycia)
Instalacje brakujace na tej maszynie:
- `gstack` (brak w PATH) — opcjonalne, testy uzywaja `pstack`/`eu-stack` jako fallback.
- `criu` — brak; mozna zainstalowac przez `tools/seal/seal/scripts/install-criu.sh`
  lub `sudo apt-get install criu` (jesli pakiet dostepny).
- `drrun` (DynamoRIO) — brak; zainstaluj `dynamorio` z APT lub z paczki release.

Dodatkowe pakiety, ktore czesto sa wymagane do pelnego pokrycia (w zaleznosci od hosta):
- `linux-tools-$(uname -r)` + `linux-tools-common` (dla `perf trace` i pelnego perf).
- `lttng-tools` + `lttng-modules-dkms` (tracing LTTng).
- `sysdig` + `sysdig-dkms` lub `sysdig-probe` (wymagany modul kernela).
- `bpftrace` + `linux-headers-$(uname -r)` + `llvm` (uprobes/BPF).
- `systemtap` + `systemtap-runtime` + kernel headers + debuginfo (dla stap).
- `auditd` (serwis musi dzialac).
- `binutils` / `elfutils` (readelf/objdump/eu-stack).

Ustawienia/warunki srodowiska, ktore nadal ograniczaja testy:
- `perf trace` niedostepny w zainstalowanej wersji perf — potrzebny nowszy
  `linux-tools-$(uname -r)` lub `linux-tools-common`, ktory zawiera subkomende `trace`.
- `bpftrace uprobe` potrafi timeoutowac — zwykle pomaga:
  - mount `tracefs`/`debugfs` (`/sys/kernel/tracing`, `/sys/kernel/debug`)
  - kernel z `CONFIG_BPF`, `CONFIG_BPF_SYSCALL`, `CONFIG_UPROBES`
- `sysdig` wymaga zaladowanego modulu kernela (np. `sysdig-probe`) i dostepu do tracefs.
- `lttng` wymaga dzialajacego `lttng-sessiond` i zaladowanych modulow LTTng.
- Core‑dump baseline przy `systemd-coredump` moze nie generowac plikow:
  - wymagane ustawienie `kernel.core_pattern` na plik (nie pipe) **albo**
    systemd‑coredump z `Storage=external` i niezerowymi limitami.
- Dla core dump baseline czesto potrzebny jest `ulimit -c unlimited`.
- `rr` i `perf record` moga wymagac odpowiednich sysctl:
  - `kernel.perf_event_paranoid` (najczesciej <= 1)
  - `kernel.kptr_restrict=0` (dla symboli/stosu)
- `LD_PRELOAD` bywa sciety przez loader — jesli chcesz twardo testowac
  maps‑denylist z injekcja, potrzebujesz trybu, w ktorym `LD_PRELOAD`
  dociera do runtime (np. testowy build bez scrubbera).
