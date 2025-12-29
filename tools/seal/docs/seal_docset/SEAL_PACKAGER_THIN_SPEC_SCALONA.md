# SEAL PACKAGER THIN — specyfikacja scalona (anti‑casual extraction, Ubuntu) — v0.8-merged

Data: 2025-12-24  
Status: **proposal → implementacja**  
Dotyczy: **packager thin** w frameworku SEAL: `thin-split`  
(`thin-single` traktujemy jako **legacy** i nie używamy w repo)

Źródła scalone w tym dokumencie:
- v0.1 (model thinking, “maksymalnie doprecyzowany”)  
- v0.2 (robocza specyfikacja, “żeby nie mieszać pojęć”)  
- v0.7 (uproszczona specyfikacja, draft)

> **Cel praktyczny**: nie “tajemnica wobec roota”, tylko **anti‑casual extraction** — podnieść próg tak, by proste techniki (`file/strings/binwalk/zstd -d/unzip/odcięcie ogona`) nie wystarczały, a wydobycie kodu wymagało RE/dezasemblacji/debugowania launchera lub formatu.

> **UWAGA (BARDZO WAŻNE):** **`thin-split` to packager produkcyjny i domyślnie rekomendowany.**

---

## 0. Założenia, threat model, cele, non‑goals

### 0.1 Threat model (świadomie brutalny)
- Atakujący może mieć **root** i:
  - czytać wszystkie pliki na serwerze,
  - kopiować artefakty offline,
  - uruchamiać procesy, debugować, patchować binarki,
  - manipulować środowiskiem uruchomienia (o ile mu na to pozwolimy).

Konsekwencja:
- **nie da się** zapewnić poufności kodu wobec zdeterminowanego RE mającego roota,
- **da się** sprawić, by “łatwe” metody ekstrakcji były bezużyteczne.

### 0.2 Co obiecujemy (Definition of Done)
System uznajemy za “sukces”, jeśli:
1) artefakty nie wyglądają jak standardowe archiwum/kompresja,
2) proste `file`, `strings`, `binwalk`, `tail|zstd -d` nie wydobywają JS/runtime,
3) uruchomienie jest stabilne/deterministyczne na wspieranych Ubuntu,
4) ekstrakcja wymaga RE/analizy loadera/formatu albo debugowania runtime.

### 0.3 Czego nie obiecujemy (non‑goals)
- “Anty‑tamper” jako realna bariera (root i tak może patchować).
- “Nie da się zdebugować” (root i tak może).
- Podpisów cyfrowych / zdalnej atestacji / secure enclave.
- Pełnej ochrony przed podmianą systemowych bibliotek/loadera przy root (minimalizujemy tylko łatwe wstrzyknięcia przez ENV).
- Egzotycznych OS‑level mechanizmów (IMA, verity, Secure Boot), FUSE/SquashFS itp.
- Rozbudowanej diagnostyki na serwerze (trzymamy minimalizm; szczegóły tylko lokalnie).

---

## 1. Terminologia i osie projektu (żeby nie mieszać pojęć)

### 1.1 Packager vs wariant dystrybucji vs poziom “sprytu”
- **Packager**: moduł SEAL budujący release. Tutaj: **`thin-split`**.
- **Wariant dystrybucji (operacyjny)**:
  - **AIO**: jeden artefakt (launcher + runtime Node + payload aplikacji).
  - **BOOTSTRAP**: stały launcher + osobne pliki runtime/payload (payload aktualizowany często).
- **Poziom utrudnienia (implementacyjny)**:
  - **Poziom A (MVP)**: fixed codec (stała sekwencja transformacji) + **losowe seedy/tablice per deployment**, bez codegen, bez dict, bez dummy/padding.
  - **Poziom B**: polimorfizm (codegen dekodera/enkodera per deployment).
  - **Poziom C**: dict + padding + dummy chunks/noise i inne utrudniacze heurystyczne.

**Plan wdrożenia** (wspólny dla źródeł): najpierw **Poziom A + wariant BOOTSTRAP**, potem Poziomy B/C.

### 1.2 Zasada upraszczająca (MUST)
BOOTSTRAP korzysta z **tego samego formatu kontenera THIN** i **tego samego dekodera** w launcherze; różni się wyłącznie to, **skąd launcher czyta bajty** (z plików obok w BOOTSTRAP).

---

## 2. UX i integracja w SEAL

### 2.1 Minimalny UX (do zapamiętania)
Docelowo użytkownik ma 1–2 komendy:

```bash
# pierwszy raz / gdy brakuje runtime / gdy brak codec_state:
npx seal ship prod --packager thin-split --bootstrap --push-config

# kolejne deploye (payload only, jeśli BOOTSTRAP jest już gotowy):
npx seal ship prod --packager thin-split
```

Opcjonalnie (lokalny build bez deploy):
```bash
npx seal release prod --packager thin-split
```

**Konfiguracja trybu (MUST):**
- `build.packager: "thin-split"` (domyślnie: `thin-split` w nowych projektach).
- `targets/<target>.json5` może nadpisać przez `packager`.

**Poziomy wydajności (MUST):**
- `build.thin.level: "low" | "medium" | "high"` (domyślnie `"low"`).
  - `low`: chunk ok. **2MB**, `zstd` level **1** (szybsze buildy).
  - `medium`: chunk ok. **512KB**, `zstd` level **2** (balans).
  - `high`: chunk ok. **64KB**, `zstd` level **3** (wolniejsze, mniejsze paczki).
- `targets/<target>.json5` może nadpisać przez `thin.level`.
- Dodatkowe override (opcjonalne, najwyższy priorytet):
  - `build.thin.chunkSizeBytes` / `targets.<target>.thin.chunkSizeBytes` (liczba bajtów).
  - `build.thin.zstdLevel` / `targets.<target>.thin.zstdLevel` (1..19).
  - `build.thin.zstdTimeoutMs` / `targets.<target>.thin.zstdTimeoutMs` (ms; `0` = bez limitu).
  - ENV: `SEAL_THIN_ZSTD_TIMEOUT_MS` (ms; nadpisuje domyślne).
- Tryb polityki ENV (opcjonalny):
  - `build.thin.envMode: "allowlist" | "denylist"` (domyślnie `"denylist"`),
  - `targets.<target>.thin.envMode` może nadpisać.
  - Runtime override: `SEAL_THIN_ENV_STRICT=1` wymusza allowlist, `SEAL_THIN_ENV_STRICT=0` wymusza denylist.
  - Allowlist wymaga `clearenv()`; jeśli się nie powiedzie, launcher kończy się błędem (bez fallbacku do denylist).
- Tryb magazynu runtime/payload (opcjonalny, bez fallbacku):
  - `build.thin.runtimeStore: "memfd" | "tmpfile"` (domyślnie `"memfd"`).
  - `targets.<target>.thin.runtimeStore` może nadpisać.
  - `memfd` wymaga wsparcia jądra; brak wsparcia = błąd uruchomienia.
  - `tmpfile` używa `mkstemp` i usuwa plik z dysku (unlink), ale nie używa memfd; pliki tymczasowe są tworzone z `umask(077)`.
- Native bootstrap (opcjonalny, tylko thin-split):
  - `build.thin.nativeBootstrap: { enabled: false, mode: "compile" }`.
  - Addon trafia do `r/n` (bez rozszerzenia `.node`).
  - `mode: "compile" | "string"`:
    - `compile` (domyślnie): natywny addon kompiluje CJS w native (`CompileFunction`), bez JS‑owego stringa źródła i bez wrappera w JS.
    - `string` (legacy): natywny addon tworzy `ExternalString`, a bootstrap używa klasycznego `_compile`.
  - Zysk: mniej kopii plaintextu w JS heapie i krótszy czas życia jawnego kodu (poza pamięcią wewnętrzną V8).
  - W trybie E2E może zostać wygenerowany dodatkowy string wyłącznie na potrzeby self‑scan.
  - Wymaga nagłówków Node (np. `/usr/include/node` lub `SEAL_NODE_INCLUDE_DIR`) oraz kompilatora C++ z obsługą C++20.
  - Opcjonalnie: `build.protection.nativeBootstrapObfuscator` (obfuscating clang++ + args) dla C++ addonu.

**Anti‑debug / integrity (opcjonalne):**
- `build.thin.antiDebug`:
  - `enabled` (domyślnie `true`),
  - `tracerPid` (domyślnie `true`) — sprawdza `TracerPid` w `/proc/self/status`,
  - `tracerPidIntervalMs` (domyślnie `10000`, `0` = wyłącz) — okresowy check `TracerPid` w runtime (po starcie),
  - `tracerPidThreads` (domyślnie `true`) — sprawdza `/proc/self/task/<tid>/status` dla wszystkich wątków,
  - `denyEnv` (domyślnie `true`) — fail‑fast, jeśli wykryje zmienne typu `LD_PRELOAD`, `LD_AUDIT`, `NODE_OPTIONS` itd.,
  - `mapsDenylist` (domyślnie `[]`) — lista substringów; jeśli pojawią się w `/proc/self/maps`, launcher kończy się błędem.
  - `ptraceGuard` (domyślnie `{ enabled: true, dumpable: true }`) — ustawia `PR_SET_DUMPABLE=0` (blokada ptrace/coredump).
  - `seccompNoDebug` (domyślnie `{ enabled: true, mode: "errno", aggressive: false }`) — seccomp blokuje `ptrace` i `perf_event_open`.
    - `mode: "errno" | "kill"`: `errno` zwraca `EPERM`, `kill` natychmiast kończy proces.
    - `aggressive: true` dodatkowo blokuje syscall'e często używane do dump/instrumentation (`process_vm_readv`, `process_vm_writev`, `kcmp`, `bpf`, `userfaultfd`, `pidfd_open`, `pidfd_getfd`). Może obniżyć kompatybilność na niektórych hostach.
    - brak wsparcia seccomp = **fail‑fast** (bez fallbacku).
  - `coreDump` (domyślnie `true`) — ustawia `RLIMIT_CORE=0` (brak core‑dumpów).
  - `loaderGuard` (domyślnie `true`) — weryfikuje loader z `PT_INTERP` vs `/proc/self/maps` (blokuje uruchomienie przez alternatywny `ld-linux`).
- **Brak aktywnego `PTRACE_TRACEME` guard**: wymagałby modelu fork/parent‑handshake (TRACEME → SIGTRAP → parent `PTRACE_DETACH`) oraz zmian w unitach systemd (`Type=forking`/PIDFile) i przekazywania sygnałów/logów. Obecnie używamy `PR_SET_DUMPABLE` + seccomp jako twardej blokady.

**Jak wyglądałaby implementacja aktywnego `PTRACE_TRACEME` (opcjonalny projekt):**
- **Child**:
  - `ptrace(PTRACE_TRACEME)` → jeśli `EPERM`, **fail‑fast** (już debugowany).
  - `execve` runtime (u nas: `fexecve` Node).
  - Po `exec` child dostaje `SIGTRAP` i **wstrzymuje się** do czasu akcji parenta.
- **Parent**:
  - `waitpid(child, &st, WUNTRACED)`; oczekuje na `SIGTRAP`.
  - wykonuje weryfikacje (opcjonalnie: `TracerPid`, env denylist, itd.).
  - `ptrace(PTRACE_DETACH, child, 0, SIGCONT)` — dopiero wtedy child kontynuuje.
- **Systemd / uruchomienie usługi**:
  - Wymagany **forking model**: `Type=forking` + `PIDFile`, albo **parent‑shim** utrzymujący się przy życiu.
  - Parent musi forwardować `SIGTERM/SIGINT` do childa (inaczej `systemctl stop` nie kończy usługi).
  - Stdout/stderr childa muszą być przekierowane przez parenta (w trybie `seal run`/foreground).
- **Konsekwencje w Sealu**:
  - Zmiana launcher‑workflow (fork + handshake).
  - Aktualizacja unitów systemd generowanych przez `appctl`/`seal remote`.
  - Aktualizacja `seal run` i E2E (run‑local/foreground wymaga obsługi forka i sygnałów).

**Uwaga (testy E2E):**
- W testach okresowego `TracerPid` używane są tylko w trybie E2E specjalne ENV:
  - `SEAL_TRACERPID_FORCE=1`
  - `SEAL_TRACERPID_FORCE_THREADS=1`
  - `SEAL_TRACERPID_FORCE_AFTER_MS=...`
- Są one aktywne wyłącznie, gdy `SEAL_THIN_ANTI_DEBUG_E2E=1`. Nie są to opcje produkcyjne.
- W testach `snapshotGuard` używane są tylko w trybie E2E specjalne ENV:
  - `SEAL_SNAPSHOT_FORCE=1`
  - `SEAL_SNAPSHOT_FORCE_AFTER_MS=...`
  - (aktywne tylko przy `SEAL_THIN_ANTI_DEBUG_E2E=1`).
- W testach `ptrace/core/seccomp` używane są tylko w trybie E2E specjalne ENV:
  - `SEAL_PTRACE_FORCE=1`
  - `SEAL_DUMPABLE_PROBE=1`
  - `SEAL_CORE_PROBE=1`
  - `SEAL_SECCOMP_PROBE=1`
  - `SEAL_SECCOMP_AGGRESSIVE_PROBE=1`
  - `SEAL_CORE_CRASH_PROBE=1`
- W testach `loaderGuard` używany jest tylko w trybie E2E specjalny ENV:
  - `SEAL_LOADER_GUARD_FORCE=1`
- W testach `/proc` i `ptrace` (zwłaszcza jako root) można wymusić brak wyjątków:
  - `SEAL_E2E_STRICT_PROC_MEM=1`
  - `SEAL_E2E_STRICT_PTRACE=1`
- W testach `denyEnv` (LD_PRELOAD/LD_AUDIT) można wymusić twardą asercję:
  - `SEAL_E2E_STRICT_DENY_ENV=1`
- `build.thin.integrity`:
  - `enabled` (domyślnie `false`) — weryfikuje self‑hash launchera (`b/a`) w `thin-split`.
  - **Tylko `thin-split`**; dla AIO build kończy się błędem.
  - `mode`: `inline` (marker w binarce) lub `sidecar` (hash w pliku `r/<file>`).
  - `file`: nazwa pliku sidecar (domyślnie `ih`).
  - Inline: hash jest osadzany w launcherze **po** wszystkich operacjach post‑pack (hardening/obfuscation). Każda modyfikacja binarki po tym kroku unieważnia hash.
  - Sidecar: hash trzymany jest w osobnym pliku, aby można było użyć ELF packera bez modyfikacji binarki po spakowaniu.

**App binding / hardening / snapshot (opcjonalne):**
- `build.thin.appBind` (domyślnie `enabled: true`):
  - wiąże launchera z runtime/payload (zapobiega podmianie `b/a` lub `r/rt` z innego projektu),
  - `value` (opcjonalne) — własny, stabilny identyfikator projektu; zalecane, gdy aplikacje mogą mieć takie same `appName` i `entry`.
- `build.thin.launcherHardening` (domyślnie `true`):
  - włącza profil hardening kompilatora (CET/RELRO/PIE/stack‑protector/fortify),
  - `false` wyłącza tylko te flagi (nie zmienia zachowania thin).
- `build.thin.launcherObfuscation` (domyślnie `true`):
  - wymusza obfuskację C‑launchera (CF‑flattening/opaque predicates przez obfuscating clang),
  - jeśli brak `build.protection.cObfuscator` → **build fail‑fast** (brak fallbacku).
- `build.thin.snapshotGuard` (domyślnie `enabled: false`):
  - wykrywa suspend/resume i duże skoki czasu monotonicznego,
  - `intervalMs` (domyślnie `1000`), `maxJumpMs` (domyślnie `60000`), `maxBackMs` (domyślnie `100`).

**Błędy runtime (bez sentinel):**
- brak `memfd` przy `runtimeStore=memfd` → `[thin] runtime fd failed` (27) / `[thin] payload fd failed` (29),
- `clearenv()` niepowodzenie w trybie allowlist → `[thin] runtime invalid` (74).

**Błędy runtime (z sentinel):**
- komunikaty są zanonimizowane do `[thin] runtime invalid` (exit code blokujący).

### 2.3 Idempotencja i rozpoznawanie stanu (MUST)
`seal ship --packager thin-split`:
- rozpoznaje stan targetu (runtime/payload/usługa),
- wykonuje minimalne potrzebne kroki,
- jest bezpieczne do ponawiania.

`--bootstrap` znaczy: **wymuś bootstrap / wymień launcher+runtime**, a nie “zmień cały tryb”.

### 2.4 “Wytrychy” operacyjne (MUST/SHOULD)
W praktyce potrzebne są dwa wytrychy:
- `--force-bootstrap` / `--rebootstrap` (aliasy) — zawsze wymień launcher+runtime i wgraj payload nowym kodekiem.
- automatyczne rebootstrap, gdy:
  - brak lokalnego `codec_state` (stan kodeka zniknął),
  - wykryto `codec_id` mismatch po stronie targetu (patrz §9).

**MUST:** AIO i BOOTSTRAP są trybami jawnie wybieranymi. Launcher AIO **nie** próbuje szukać `r/rt`/`r/pl` — brak stopki AIO to błąd. Launcher BOOTSTRAP może używać `r/rt`/`r/pl`.

### 2.5 Kiedy wykonywany jest natywny build (C) (MUST)
- Launcher (ELF) budujemy **na build‑machine** (Ubuntu), **nigdy na serwerze**.
- Build jest wywoływany przez `seal release` (a `seal ship` woła `release`).
- Build ma cache (per: wariant/poziom/format/kodek). Jeśli artefakt pasuje → użyj; jeśli nie → buduj.

W Poziomie B/C natywny build obejmuje też codegen dekodera (część bootstrap/first-release).

---

## 3. Model systemu i artefakty

### 3.1 Elementy logiczne (zawsze te same)
Niezależnie od wariantu dystrybucji, system ma logicznie:
- `launcher` (ELF): dekoduje kontener THIN, dekompresuje zstd strumieniowo, sklada runtime Node do `memfd` i uruchamia go przez `fexecve`/`execveat`, przekazuje bundla przez FD 4 i uruchamia bootstrap JS przez `node -e` (bez realpath na memfd).
- `node.runtime`: runtime Node w formie **kontenera THIN** (nie “jawny ELF na dysku” w sensie łatwego odczytu; w AIO może być ogonem binarki).
- `app.payload`: bundle aplikacji jako **kontener THIN**.
- `shared/` + (opcjonalnie) `data/` lub `var/`: zwykłe pliki na dysku (config, assety, dane), bo w MVP świadomie upraszczamy operacje.

### 3.2 Wariant AIO (MVP)
Artefakt: jeden plik wykonywalny zawiera:
- launcher,
- runtime Node (THIN),
- payload aplikacji (THIN),
- oraz na końcu (logicznie) tablice/offsety do elementów ogona (np. `TAIL_TABLE` — maskowana).

Deploy: jeden plik + katalogi zewnętrzne (np. `shared/`, `var/`).

### 3.3 Wariant BOOTSTRAP
Pliki na serwerze (przykładowe krótkie nazwy):

(Uwaga operacyjna: nazwy plików/katalogów mogą być krótkie i **nieopisowe** — bez jawnych słów typu `node`, `payload` w nazwach.)

- `<installDir>/b/a`   — launcher (ELF)
- `<installDir>/r/rt`  — runtime node (THIN)
- `<installDir>/r/pl`  — payload aplikacji (THIN)
- `<installDir>/shared/` — config/assety (zwykłe pliki)
- `<installDir>/data/` albo `<installDir>/var/` — write‑paths (opcjonalnie, zależnie od ustaleń)

Unit systemd:
- `ExecStart=<installDir>/b/a` (bez argumentów)

Launcher w BOOTSTRAP sam odnajduje `r/rt` i `r/pl` względnie do własnej lokalizacji (np. na bazie `realpath()` katalogu `b/`).

**Uwaga praktyczna (MVP):** dla kompatybilności z `appctl run` w release można dodać wrapper `<app>` w katalogu głównym, który wykonuje `b/a`.

**Zasada operacyjna (MUST):** usługa jest instalowana/uruchamiana dopiero gdy istnieje payload (`r/pl`). Brak “warunkowych unitów” — logika stanu jest po stronie `seal ship`.

### 3.4 Kontrakt zapisu (write‑paths) — dwa spójne warianty
W źródłach pojawiają się dwa podejścia; oba zachowujemy jako możliwe, ale trzeba wybrać jeden jako “produktowy standard”:

- **Wariant FS‑A (v0.1):**
  - `<installDir>/shared/` — read‑only (assety/config),
  - `<installDir>/data/` — read‑write (jeśli aplikacja musi pisać).
- **Wariant FS‑B (v0.2):**
  - `<installDir>/shared/` — assety + config,
  - `<installDir>/var/` — write‑paths (logi/cache/DB), jeśli potrzebny.

W v0.7 pojawia się jeszcze uproszczenie “pisz tylko do `shared/`”, ale operacyjnie najczytelniejszy jest FS‑B (RO/RW rozdzielone).  
Niezależnie od wyboru: launcher nie zapisuje runtime/payload na dysk w trakcie startu (używa `memfd`).

---

## 4. Kontrakt aplikacji (payload) i runtime FS

### 4.1 JS entry: CJS vs ESM (MVP)
- **MVP:** wspieramy **CommonJS** (`bundle.cjs`).
- ESM/dynamic import: dopiero później (wymaga innego bootstrapu/loadera i komplikuje kontrakt).

### 4.2 Bundling: single‑file jako wymóg (MVP)
`thin` zakłada, że kod aplikacji jest **single‑file bundle**:
- brak runtime “ładowania modułów z dysku” jako części logiki aplikacji,
- brak `require("./innePliki")` do źródeł.

Jeśli aplikacja wymaga plików na dysku: muszą być jawnie w `shared/`/`var`/`data` i ładowane jako assety (patrz 4.5).

### 4.3 Wirtualna ścieżka: stabilne `__dirname/__filename`
Bootstrap JS uruchamia bundla jako CJS z “wirtualną ścieżką”, żeby `__dirname/__filename` były stabilne.

Propozycja (spójna między źródłami):
- `SEAL_VIRTUAL_ENTRY = "<installDir>/app/app.bundle.cjs"` (wyliczane przez launcher)
- `process.argv[1]` ustawione na tę ścieżkę
- `Module._nodeModulePaths(dirname(SEAL_VIRTUAL_ENTRY))` ustawione, aby działały typowe resolvery

### 4.4 Dynamiczny `require()` i importy
MVP wspiera typowe importy statyczne. Problematyczne są:
- `require(someVar)` zależne od runtime,
- ładowanie “plików obok bundla” przez `fs` jeśli pliki nie są w `shared/`/`var`/`data`.

Kontrakt (MVP):
- jeśli dependency wymaga dynamic require, trzeba je przerobić albo jawnie dostarczyć zasoby na dysku i ładować po ścieżce.

### 4.5 Assety, config i filesystem runtime
Ustalenie wspólne: **assety/config na dysku** (MVP).
- `shared/` (i ewentualnie `data/`/`var/`) jest częścią instalacji.
- `thin` nie próbuje w MVP “montować assetów w pamięci”.

Konfiguracja:
- z dysku (np. `<installDir>/shared/config.json5`) **albo** z env ustawianych przez SEAL.

### 4.6 Native addony (`*.node`)
W źródłach są dwa poziomy ostrożności; scalamy to jako kontrakt MVP + opcję “stage 2”:

- **MVP (bez wsparcia/ostrożnie):**
  - jeśli dependency używa `.node`, `thin` może odmówić lub wymagać świadomego trybu.
- **Opcja Stage 2 (jawny kontrakt na dysku):**
  - `.node` są deployowane jako zwykłe pliki w `shared/native/` (lub analogicznym katalogu),
  - aplikacja/dependency ładuje je po jawnej ścieżce pliku.

### 4.7 Inne ograniczenia i zachowania runtime
- `child_process`: dozwolone, ale pamiętać o higienie env i PATH (launcher czyści env; child_process dziedziczy env Node).
- `worker_threads`: dozwolone.
- Debug/inspect: nie wspieramy w produkcji (patrz §7 i §8: env wipe i minimalizm).

### 4.8 Env kontrakt dla aplikacji
Launcher czyści większość ENV, ale musi przekazać stabilne ścieżki instalacji (whitelist).

Minimalny kontrakt (z v0.2 + uzupełnienie):
- `SEAL_APP_DIR=<installDir>`
- `SEAL_SHARED_DIR=<installDir>/shared`
- `SEAL_VAR_DIR=<installDir>/var` **lub** `SEAL_DATA_DIR=<installDir>/data` (zależnie od wybranego FS wariantu)

---

## 5. Minimalne wymagania platformy (Ubuntu)

### 5.1 Architektura i OS
- MVP: `x86_64` (amd64)
- `aarch64`: opcjonalnie później (oddzielny runtime Node)

OS: Ubuntu LTS (praktycznie: 20.04+; rekomendowane 22.04/24.04).

Uwaga o “deterministyczności”: chodzi o **powtarzalne uruchomienie** na wspieranych środowiskach, nie o bit‑identyczne buildy.

### 5.2 Kernel/syscalls
Launcher używa (w różnych źródłach):
- `memfd_create`
- `fexecve` **lub** `execveat(AT_EMPTY_PATH)`
- `dup2`, `close_range` (opcjonalnie), `fcntl`
- odczyt `/proc/self/fd` (fallback zamykania FD)
- memfd seals (`F_ADD_SEALS`, `F_SEAL_*`) — jeśli dostępne

Minimalny kernel dla `memfd_create`: Linux >= 3.17 (praktycznie spełnione na Ubuntu).

Runtime store (manualny wybór, brak automatycznego fallbacku):
- `thin.runtimeStore=memfd` (domyślny) lub `thin.runtimeStore=tmpfile` (tmpfs + unlink dla runtime ELF).

### 5.3 Runtime Node
- `thin` nie zależy od systemowego `node` w PATH — runtime jest częścią artefaktów THIN.
- Node może być dynamicznie linkowany i używać systemowego loadera (`ld-linux`) i bibliotek:
  - to jest **jawny non‑goal** w threat modelu root (root i tak może podmienić system libs),
  - minimalizujemy tylko łatwe wstrzyknięcia przez env (`LD_*`, `NODE_OPTIONS`) przez env wipe.

---

## 6. Lifecycle serwera i algorytm deploy (szczególnie BOOTSTRAP)

### 6.1 Zdalne sprawdzane stany (SSH) — propozycja (MUST dla idempotencji)
Definicje ścieżek (BOOTSTRAP):
- `LAUNCHER=<installDir>/b/a`
- `RUNTIME=<installDir>/r/rt`
- `PAYLOAD=<installDir>/r/pl`
- `UNIT=seal-<app>.service`

Stany:
- `hasLauncher`: `test -x "$LAUNCHER"`
- `hasRuntime`:  `test -f "$RUNTIME"`
- `hasPayload`:  `test -f "$PAYLOAD"`
- `hasUnit`:     `systemctl cat "$UNIT" >/dev/null 2>&1`
- `isEnabled`:   `systemctl is-enabled "$UNIT" >/dev/null 2>&1`
- `isRunning`:   `systemctl is-active "$UNIT" >/dev/null 2>&1`

### 6.2 Atomowe uploady (MUST)
Każdy upload kontenera:
1) upload do `*.tmp` (np. `r/pl.tmp`)
2) (opcjonalnie) walidacja na target (sanity footer/index/hash)
   - opcjonalnie: uruchom launchera w trybie „self‑check” (bez startu Node), aby potwierdzić poprawność kontenera przed restartem usługi.
3) `fsync` (jeśli możliwe)
4) atomowy `mv`/`rename` do docelowej nazwy

Rollback (MVP):
- trzymaj `r/pl.prev` (jedna poprzednia wersja).
- przed podmianą `r/pl`: przenieś istniejący do `r/pl.prev`.

Propozycja UX (opcjonalnie, ale spójne ze źródłami):
- `seal rollback` przywraca `r/pl.prev` → `r/pl` i restartuje usługę.

Lock (opcjonalnie / SHOULD):
- `<installDir>/seal-out/thin/deploy.lock` — drugi deploy czeka albo failuje.

### 6.3 Algorytm `seal ship --packager thin-split` (BOOTSTRAP) — propozycja
1) Ensure directories: `<installDir>/b`, `<installDir>/r`, `<installDir>/shared` (+ `var`/`data` jeśli używane).
2) Jeśli `--bootstrap` lub `!hasRuntime`:
   - upload launcher (`b/a.tmp`→`b/a`)
   - upload runtime (`r/rt.tmp`→`r/rt`)
   - **nie instaluj usługi jeszcze** (dopóki nie ma payload).
3) Zawsze:
   - build lokalny payload kontenera (zgodny z codec_state)
   - upload payload (`r/pl.tmp`→`r/pl`), zachowując `r/pl.prev`.
4) Jeśli `hasPayload`:
   - jeśli `!hasUnit`: instaluj unit + `daemon-reload`
   - `enable` jeśli nie enabled
   - jeśli running → restart, inaczej start
5) Jeśli `!hasPayload`: nie instaluj usługi.

### 6.4 AIO — deploy (prosto)
- upload jednego pliku (np. `<installDir>/b/a`) atomowo (`*.tmp`→rename),
- restart usługi (lub start jeśli pierwsza instalacja).

---

## 7. Launcher: kontrakt uruchomienia (memfd + FD 4) i hardening

### 7.1 Uruchomienie Node bez zapisywania na dysk
- Launcher dekoduje `node.runtime` do `memfd_node` i uruchamia przez `fexecve(memfd_node, argv, envp)` (lub `execveat`).
- Launcher dekoduje bundla do `memfd_bundle`.
- Bootstrap JS jest uruchamiany przez `node -e` (inline) i czyta bundla z FD 4.

### 7.2 Kontrakt FD 4 (MUST)
- **FD 4**: bundle CJS (zdekompresowany)

W launcherze (przed `fexecve/execveat`):
- mapuj deskryptor dokładnie na 4 przez `dup2(fd, 4)`,
- zdejmij `FD_CLOEXEC` z FD 4 (musi przeżyć `exec`):
  - `fcntl(4, F_SETFD, flags & ~FD_CLOEXEC)`,
- zamknij wszystkie FD > 4:
  - preferowane: `close_range(5, UINT_MAX, 0)`,
  - fallback: iteracja po `/proc/self/fd` i zamknięcie wszystkiego > 4.

### 7.3 Higiena ENV (MUST)
- `clearenv()` + whitelist env:
  - dozwolone: minimalne systemowe (`LANG`, `LC_ALL`, `TZ` opcjonalnie) + `SEAL_*` (ścieżki instalacji),
  - niedozwolone: `NODE_OPTIONS`, `NODE_PATH`, `LD_PRELOAD`, `LD_LIBRARY_PATH`, `LD_AUDIT`, `LD_DEBUG`, `NODE_V8_COVERAGE`, itp.
- bundle idzie przez FD 4; bootstrap jest uruchamiany przez `node -e`.

### 7.4 Core dumps i dumpowalność (MUST/SHOULD)
- `setrlimit(RLIMIT_CORE, 0)` (MUST)
- `prctl(PR_SET_DUMPABLE, 0)` (SHOULD)
- opcjonalnie: `madvise(MADV_DONTDUMP)` na bufory z payloadem/runtime.

### 7.5 Memfd seals (MUST jeśli wspierane)
Po zapisaniu `memfd_bundle` i `memfd_node` dodaj seale:
- zakaz zapisu,
- zakaz zmiany rozmiaru,
- opcjonalnie zakaz dalszych seal’i.

Jeśli kernel nie wspiera — launcher działa, ale może sygnalizować to tylko w trybie debug.

### 7.6 Bezpieczne otwieranie plików (BOOTSTRAP) (MUST/SHOULD)
Dla `r/rt` i `r/pl`:
- `open(path, O_RDONLY|O_CLOEXEC|O_NOFOLLOW)` (tam gdzie możliwe),
- `fstat(fd)` i wymagaj `S_ISREG(st_mode)`,
- opcjonalnie: sprawdź owner/permissions (np. nie writable dla group/other).

To stabilizuje zachowanie i usuwa klasy footgunów (nie “pokonuje roota”).

### 7.7 Hardening build flags dla launchera (MUST w release)
Launcher parsuje binarne dane, więc w release:
- compile: `-O2 -fstack-protector-strong -D_FORTIFY_SOURCE=2 -fPIE`
- link: `-Wl,-z,relro,-z,now -Wl,-z,noexecstack -pie`
- strip: `strip` / `-s`

Dev (lokalnie):
- ASan/UBSan: `-fsanitize=address,undefined` (testy, fuzzing).

### 7.8 Minimalne logowanie i `SEAL_DEBUG`
Produkcja:
- launcher nie wypisuje szczegółów formatu; tylko krótki kod błędu.
Debug:
- tylko gdy `SEAL_DEBUG=1` (lub analogiczny mechanizm) można wypisać więcej.

---

## 8. Bootstrap JS (inline) — kontrakt minimalny

### 8.1 Rola bootstrapu
Bootstrap jest krótki i stały (kilkadziesiąt linii):
- uruchamiany przez `node -e` (inline),
- czyta bundle z FD 4,
- uruchamia go jako CommonJS z wirtualną ścieżką (§4.3).

### 8.2 Minimalne wymagania
- brak zależności od dysku poza `shared/` i `var`/`data` używanymi przez aplikację,
- brak wrażliwych stałych/magiców (poza koniecznymi).

### 8.3 Minimalizacja czasu plaintextu JS w pamięci (best‑effort)
Bootstrap dąży do tego, żeby plaintext JS żył w pamięci możliwie krótko:

- bundle jest czytany z FD 4 do `Buffer`, FD jest od razu zamykany,
- po konwersji do stringa `Buffer` jest zerowany (`fill(0)`) i dereferencjonowany,
- po `Module._compile(...)` string z kodem jest zerowany logicznie (`code = null`),
- bootstrap wyłącza source maps i ślady (`process.setSourceMapsEnabled(false)`, `Error.stackTraceLimit = 0`),
- uruchomienie Node z `--expose-gc` pozwala wykonać `global.gc()` i szybciej zwolnić pamięć.

Uwaga: to nie gwarantuje, że plaintext nie zostanie utrwalony (GC/JIT/cache/OS). Celem jest maksymalne skrócenie okna ekspozycji.

**Ubuntu (build machine):** wymagane pakiety dla `thin` (AIO):

```bash
sudo apt-get update
sudo apt-get install -y build-essential pkg-config zstd libzstd-dev
```

---

## 9. Kontener THIN — format binarny, encode/decode i zgodność

> Anti‑casual ≠ kryptografia. Format ma być jednoznaczny i parsowalny, ale **maskowany** w pliku (brak plaintext magic).

### 9.1 Cele formatu
- trudny do rozpoznania heurystykami sygnaturowymi,
- brak “jednej komendy dekompresji”,
- streaming + limity (bez crashy),
- minimalne metadane, wszystko maskowane.

### 9.2 Ustalenia ogólne (MUST)
- endianness: **little‑endian**
- twarde limity:
  - `MAX_CHUNKS`
  - `MAX_CHUNK_RAW_BYTES`
  - `MAX_INDEX_BYTES`
  - `MAX_TOTAL_RAW_BYTES`
- launcher nie alokuje “w ciemno”; wszystko przez limity i streaming.

Przykładowe wartości (nie normatywne, do dopasowania do produktu):
- `RAW_BLOCK = 64 KiB`
- `MAX_CHUNKS` rzędu 1_000_000 (twardy limit parsera)
- `MAX_TOTAL_RAW_BYTES` rzędu 1–4 GiB (albo niżej, jeśli produkt tego nie potrzebuje)

### 9.3 Layout wysokiego poziomu (wspólny)
Kontener jest zbudowany jako:
```
[ chunk_0 ][ chunk_1 ] ... [ chunk_{n-1} ][ index ][ footer ]
```

- `chunk_i` = `codec( zstd(raw_i) )`
- `index` i `footer` są też maskowane przez ten sam `codec()`
- `footer` ma stały rozmiar `FOOTER_LEN` (czytany z końca pliku).

Warianty:
- w v0.1/v0.7 `index_off` jest wyliczalny jako `filesize - FOOTER_LEN - index_len`,
- w v0.2 występuje jawne `index_off` w footerze (opcjonalne pole).

### 9.4 Chunking i kompresja
- raw dzielimy na chunki (domyślnie **64 KiB**, ostatni mniejszy),
- każdy chunk kompresujemy **zstd niezależnie** (stream-friendly),
- w MVP brak dictionary (to Poziom C).

### 9.5 Maskowanie (codec) — Poziom A (MVP)
Poziom A: stała sekwencja transformacji, ale z losowymi parametrami/tablicami per deployment.

Przykładowe prymitywy (odwracalne, mieszane w pipeline):
- XOR keystream z PRNG (np. xorshift) seedowany (np. `seed ^ chunk_index ^ nonce`)
- rotacja bitów (rotl/rotr)
- add/sub stałej
- nibble swap
- shuffle16 z tablicą i jej inwersją

Maskujemy:
- bytes każdego chunku,
- bytes indeksu,
- bytes footera.

### 9.6 Integralność (hash) — preferencje i warianty
Cel: wykrywanie korupcji/przerwanych uploadów i sanity (to nie “security” przeciw rootowi).

W źródłach pojawiają się warianty:
- v0.1: CRC32 (odradzane) lub “lepiej: szybki hash”
- v0.7: hash 128‑bit (16 bajtów, truncation) dla `raw_hash` + `footer_hash`
- v0.2: hash 256‑bit (32 bajty) dla chunków + `container_hash` w footerze

Scalona rekomendacja:
- używać **szybkiego hasha** (nie CRC32),
- dopuszczać 16B (trunc) lub 32B (pełne) jako parametr formatu (np. przez `entry_size`/`flags`/`index_version`).

### 9.7 Index i footer — trzy zgodne propozycje (do wyboru implementacyjnego)
Żeby zachować wszystkie informacje ze źródeł, opisujemy trzy kompatybilne “profile” kontenera. W praktyce implementacja MVP powinna wybrać **jeden** profil i zamrozić go jako `format_version`.

#### Profil P‑1 (minimalny, v0.1)
- **Footer**: stałe **32B** (maskowane), pola (LE):
  - `u32 version` (np. 1)
  - `u32 codec_id`
  - `u32 index_len`
  - `u32 chunk_count`
  - `u64 raw_size_total`
  - `u64 reserved`
- **Index record** (po odmaskowaniu):
  - `u64 chunk_off`
  - `u32 comp_len`
  - `u32 raw_len`
  - `u32 check` (CRC32 lub lepiej: 32‑bit hash)
  - `u32 nonce` (opcjonalny)

Zaleta: proste. Wada: słabsza integralność, mniej “self‑describing”.

#### Profil P‑2 (64B footer + index header, v0.7)
- **Footer**: stałe **64B** (maskowane), pola (LE):
  - `u32 format_version`
  - `u32 flags`
  - `u64 codec_id`
  - `u64 node_runtime_id`
  - `u64 index_len`
  - `u32 chunk_count`
  - `u32 footer_len` (zawsze 64)
  - `u64 total_raw_len`
  - `bytes[16] footer_hash` (hash 128‑bit z pól footera bez hash)

  Sanity check (MUST):
  - `footer_len == 64`
  - `chunk_count > 0` i `chunk_count <= MAX_CHUNKS`
  - `index_len > 0` i `index_len <= MAX_INDEX_BYTES`
  - `total_raw_len <= MAX_TOTAL_RAW_BYTES`
- **Index**: header + entries, maskowany:
  - `u32 index_version` (np. 1)
  - `u32 entry_size` (np. 40B)
  - `u32 chunk_count` (== footer.chunk_count)
  - `u32 reserved`
  - `entries[chunk_count]`, gdzie entry (MVP):
    - `u64 offset`
    - `u32 comp_len`
    - `u32 raw_len`
    - `bytes[16] raw_hash` (hash 128‑bit)
    - `u64 nonce` (opcjonalny; może być 0)


  Sanity check indexu (MUST):
  - `index.chunk_count == footer.chunk_count`
  - `offset + comp_len` nie wychodzi poza sekcję chunków
  - chunki nie nachodzą na `index`/`footer`
  - `raw_len <= MAX_CHUNK_RAW_BYTES`
  - suma `raw_len` == `footer.total_raw_len`

#### Profil P‑3 (footer z index_off + container_hash, v0.2)
- **Footer**: stały rozmiar (np. 96–128B; zależy od pól), maskowany:
  - `u16 format_version`
  - `u16 flags`
  - `u64 codec_id`
  - `u64 runtime_id`
  - `u64 index_off`
  - `u32 index_len`
  - `bytes[32] container_hash` (hash 256‑bit całego kontenera)  
  (i ewentualne padding/rezervy do stałej długości)
- **Index record**:
  - `u64 off`
  - `u32 len` (comp)
  - `u32 raw_len`
  - `bytes[32] h` (hash 256‑bit chunku)

Zaleta: bardzo jednoznaczne sanity. Wada: większy footer.

### 9.8 Jak launcher znajduje footer “bez magiców” (MUST)
Wspólna metoda:
- `FOOTER_LEN` jest stałą w launcherze dla wybranego profilu (np. 32/64/128),
- launcher czyta ostatnie `FOOTER_LEN` bajtów, odmaskowuje, robi sanity check:
  - wersja formatu w zakresie,
  - `index_len` w granicach (<= MAX_INDEX_BYTES),
  - `chunk_count` w granicach,
  - spójność sum (`total_raw_len` / suma `raw_len`),
  - `index_off`/wyliczony offset w granicach pliku,
  - hash (footer_hash/container_hash) się zgadza.
Jeśli sanity nie przechodzi → kontener uszkodzony/nieobsługiwany.

**Dodatkowe sanity checks (praktyczne MVP, MUST):**
- `index_len == chunk_count * THIN_INDEX_ENTRY_LEN` (odrzucić brak spójności),
- `comp_len > 0` oraz `raw_len > 0`,
- `rt_off + rt_len` i `pl_off + pl_len` w granicach pliku (z kontrolą overflow),
- brak overlapu runtime/payload (np. `rt_off + rt_len <= pl_off`),
- brak pustych wejść do encoderów (runtime/payload nie mogą być 0‑B).

### 9.9 Packer (encode side) — kontrakt (MUST)
Packer musi:
- generować kontener zgodny z wybranym profilem (P‑1/P‑2/P‑3),
- stosować ten sam codec (parametry) co dekoder,
- tworzyć index+footer po odmaskowaniu, a następnie maskować je przed zapisem,
- generować testy round‑trip (patrz §11).

---

## 10. Stan kodeka, cache i zgodność launcher ↔ payload (BOOTSTRAP krytyczne)

### 10.1 Problem (MUST rozwiązać)
W BOOTSTRAP launcher jest stały. Payloady muszą być kodowane tym samym “kodekiem” (parametrami maskowania) co launcher. Jeśli developer zgubi stan kodeka, nie zbuduje kompatybilnego payloadu.

### 10.2 Kontrakt: `codec_id` + lokalny `codec_state`
- Przy budowie launchera (bootstrap lub AIO) generujemy:
  - `codec_id` (u64 lub u32 zależnie od profilu),
  - parametry kodeka (seedy/tablice),
  - identyfikator runtime Node (`runtime_id`/`node_runtime_id`).
- SEAL zapisuje stan kodeka lokalnie per target/env:
  - `seal-out/cache/thin/<target>/codec_state.json`
- Na target (BOOTSTRAP) zapisuje się też metadane zgodności kodeka **w formie binarnej i nieopisowej**:
  - `<installDir>/r/c`
  - w release: `<release>/r/c`

**Wymóg praktyczny:** na serwerze **nie zapisujemy** metadanych w formie czytelnej (JSON). Wszystko co trafia na target powinno być binarne/obfuskowane.

**Wymóg praktyczny:** `codec_state` musi przetrwać między deployami (dodaj `seal-out/` do `.gitignore`).

**Wymóg praktyczny:** cache nie może rosnąć bez limitu — SEAL automatycznie sprząta `seal-out/cache/thin/` (domyślnie zostawia ostatnie 2 wpisy).
Uwaga praktyczna: cache jest kluczowany m.in. po **target/poziom/format/kodek**. Przy częstym przełączaniu środowisk (np. `local`/`prod`), wariantów builda lub buildera, powstają nowe wpisy i stare mogą zostać wyparte przez limit. Jeśli często skaczesz między wariantami i zależy Ci na unikaniu pełnych rebuildów, zwiększ limit przez `SEAL_THIN_CACHE_LIMIT`.
Limit można ustawić przez `SEAL_THIN_CACHE_LIMIT` (0 = brak sprzątania).

### 10.3 Recovery gdy cache zniknie (MUST)
Jeśli brak `codec_state` lokalnie:
- SEAL wykonuje **re-bootstrap** (wgrywa nowy launcher + runtime) i od tego momentu używa nowego `codec_id`.

SEAL ma to komunikować wprost: “brak kodeka → wymuszam bootstrap”.

### 10.4 Wykrywanie mismatch (MUST)
Launcher podczas startu porównuje:
- `footer.codec_id` payloadu vs swój zaszyty `codec_id`,
- `footer.format_version` vs obsługiwana wersja,
- opcjonalnie `runtime_id`/`node_runtime_id` (gdy runtime jest osobnym plikiem).

Payload-only (BOOTSTRAP) MUSI sprawdzić zgodność `codec_hash`:
- `release/r/c` vs `<installDir>/r/c`,
- jeśli brak albo mismatch → **fallback do pełnego bootstrap**.

Payload-only (BOOTSTRAP) MUSI sprawdzić zgodność markera runtime (Node):
- `release/r/nv` vs `<installDir>/r/nv`,
- `r/nv` to binarny hash (`sha256(process.version)`), nie plaintext,
- jeśli brak albo mismatch → **fallback do pełnego uploadu/runtime**.

Przy mismatch:
- launcher kończy się stabilnym kodem błędu (patrz §12),
- `seal ship` interpretuje to jako potrzebę re-bootstrap (automatycznie lub po `--force-bootstrap`).

### 10.5 Rotacja kodeka (SHOULD)
- `--force-bootstrap` (albo `--rotate-codec`) generuje nowe parametry i nowe `codec_id`.
- W BOOTSTRAP rotacja oznacza wymianę launchera (re-bootstrap).

---

## 11. Testy i QA (brama jakości)

### 11.1 Round‑trip testy (MUST, CI)
- `pack(raw) -> container -> unpack(container) == raw`
- testy graniczne: 0B/1B/64KiB±1/duże pliki/dużo chunków
- testy “złe dane”: flip bit w chunk/index/footer → kontrolowany błąd bez crasha
- limity: przekroczenie `MAX_*` → kontrolowany błąd

### 11.2 Testy akceptacyjne anti‑casual (SHOULD, DoD)
- `file <artifact>` nie rozpoznaje zstd/zip/gzip (ma być “ELF” albo “data”),
- `strings <artifact>` nie pokazuje oczywistych markerów (np. “ZSTD”, “payload”, ścieżek),
- `tail | zstd -d` failuje,
- `binwalk` nie znajduje banalnych sygnatur archiwów (albo widzi tylko “noise”),
- celowe uszkodzenie 1 bajtu → jednoznaczny exit code,
- `NODE_OPTIONS`/`LD_PRELOAD` nie wpływa na uruchomienie (env wipe).

### 11.3 Fuzzing i sanitizers (etap 2, SHOULD)
- fuzz parsera kontenera (corrupted containers),
- build launchera z ASan/UBSan w CI na testach.

---

## 12. Błędy, exit codes i minimalna diagnostyka

W źródłach są dwie propozycje numeracji; scalamy je jako “zestaw minimalny + rozszerzony”. Implementacja powinna wybrać jedną mapę i zamrozić.

### 12.1 Minimalny zestaw (wspólny sens)
- brak runtime (BOOTSTRAP)
- brak payload (BOOTSTRAP)
- format/codec mismatch
- invalid index / hash mismatch / korupcja
- przekroczone limity dekompresji
- błąd exec runtime / OS unsupported

### 12.2 Przykładowa mapa (superset z trzech źródeł)
- `0`  — OK (Node przejął proces)
- `10` — brak runtime (`E_RT_MISSING`)
- `11` — brak payload (`E_PL_MISSING`)
- `12` — format nieobsługiwany (`E_FORMAT_UNSUPPORTED`)
- `13` — codec mismatch (`E_CODEC_MISMATCH`)
- `14` — index invalid (`E_INDEX_INVALID`)
- `15` — hash mismatch / korupcja (`E_HASH_MISMATCH`)
- `16` — przekroczone limity rozpakowania (`E_DECOMP_LIMIT`)
- `17` — OS/syscall unsupported (`E_OS_UNSUPPORTED`)
- `30` — błąd uruchomienia node (`E_EXEC_NODE`)
- `40` — błąd wewnętrzny I/O (`E_INTERNAL`)

### 12.3 Alternatywna mapa (historyczna propozycja v0.1)
W v0.1 pojawia się prostsze numerowanie (inny zakres), np.:
- `10`: brak runtime
- `11`: brak payload
- `20`: błąd dekodowania kontenera / codec mismatch / format
- `21`: przekroczony limit dekompresji
- `22`: checksum/hash mismatch
- `30`: błąd uruchomienia node
- `40`: błąd wewnętrzny (I/O)

Jeśli wybierasz tę mapę, warto dopisać wewnętrzne rozróżnienie błędów po stronie SEAL (po stronie developera), bo `20` łączy kilka klas problemów (np. mismatch codec/format oraz ogólne błędy dekodowania).

Produkcja: krótkie kody. Szczegóły tylko w trybie debug (`SEAL_DEBUG=1`).

---

## 13. Roadmap (żeby nie było chaosu)

### 13.1 MVP (Etap 1)
- Kontener THIN v1: chunking + zstd + codec maskowanie + index + footer + szybki hash (bez dict, bez padding/dummy).
- Launcher: decode+decompress do memfd, FD 4, `fexecve/execveat`.
- Hardening: env wipe, FD hygiene, RLIMIT_CORE, O_NOFOLLOW/fstat, memfd seals.
- Wariant AIO end‑to‑end.

### 13.2 Etap 1b
- Wariant BOOTSTRAP (launcher + `r/rt` + `r/pl`).
- `codec_state` cache + `--force-bootstrap`.
- Atomic deploy (tmp→rename) + `.prev` rollback.

### 13.3 Etap 2 (Poziom B)
- Codegen / polimorfizm (generator tworzy encoder+decoder+test vectors).
- Fuzzing + ASan/UBSan w CI.
- (Opcjonalnie) rotacja kodeka jako funkcja użytkowa.

### 13.4 Etap 3 (Poziom C)
- Zstd dictionary w launcherze + `dict_id` i polityka rotacji.
- Padding między chunkami + dummy chunks/noise layer.
- Dalsze utrudnienia heurystyczne.

---

## 14. Załącznik: zasada “jedno źródło prawdy” dla kodeka (rekomendacja implementacyjna)

Żeby uniknąć dryfu między encoderem (packer) i decoderem (launcher):
- generator losuje “recepturę” (w Poziomie A: parametry; w B: kod),
- generator produkuje:
  - C: `decode_bytes()` do launchera,
  - build‑time: `encode_bytes()` dla packera,
  - test vectors do round‑trip.

To jest kluczowe zwłaszcza w Poziomie B (codegen).

---
