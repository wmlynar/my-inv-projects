# SEAL_ANTI_REVERSE_ENGINEERING — anti‑debug / anti‑reverse (spec + status)

Data: 2025-12-26  
Status: **canonical** (scalone + uaktualnione)

## 0. Cel i zakres
Ten dokument łączy w **jedno miejsce** wszystkie informacje o:
- utrudnianiu reverse engineeringu (anti‑casual extraction),
- mechanizmach anti‑debug / anti‑instrumentation,
- hardeningu launchera i warstwach ochrony w SEAL,
- ryzykach operacyjnych i brakach w implementacji.

**Założenie:** ochrona nie jest „anty‑root”. Celem jest podniesienie progu i eliminacja łatwego wydobycia kodu.

## 1. Źródła scalone (skąd to się wzięło)
Ten dokument powstał przez scalenie trzech wcześniejszych specyfikacji:
- model zagrożeń + warstwy ochrony,
- inwentarz narzędzi FOSS,
- notatka o TracerPid w runtime.

**Nic nie zginęło** — pełna treść tych dokumentów jest na końcu jako **Appendix (verbatim)**.

## 2. Aktualny stan w SEAL (implementacja)
Poniżej lista tego, co **już jest zaimplementowane** w SEAL (thin‑split):

### 2.1 Packager i format
- **Packager domyślny i rekomendowany:** `thin-split` (BOOTSTRAP).
- `thin-single` jest traktowany jako **legacy** (nie używamy w repo), ale kodowo nadal istnieje.

### 2.2 Anti‑debug (launcher + runtime)
Konfiguracja: `build.thin.antiDebug`.

Zaadaptowane mechanizmy:
- **TracerPid**: check na starcie + okresowo (runtime JS), opcjonalnie także per‑thread.
- **Env denylist**: blokada m.in. `LD_PRELOAD`, `LD_AUDIT`, `NODE_OPTIONS`, itp.
- **Maps denylist**: skan `/proc/self/maps` pod kątem znanych narzędzi (frida, gdb, itp.).
- **PTRACE guard**: `PR_SET_DUMPABLE=0`, plus guard na ptrace/detach.
- **Seccomp no‑debug**: blokady `ptrace` / `perf_event_open` (profil “errno/kill”).
- **Core dump off**: `RLIMIT_CORE=0`.
- **Loader guard**: kontrola loadera i środowiska (PT_INTERP + env).

**Opaque failure:** w trybie zabezpieczeń komunikaty są zunifikowane jako `"[thin] runtime invalid"` i jeden kod `exitCodeBlock`.

### 2.3 Snapshot guard (anti‑rollback / anti‑snapshot)
Konfiguracja: `build.thin.snapshotGuard`.
- Okresowy check monotonicznego czasu (`intervalMs`).
- Wykrywanie skoków do przodu (`maxJumpMs`) i do tyłu (`maxBackMs`).

### 2.4 Sentinel (anti‑clone / time limit)
Konfiguracja: `build.sentinel.*` (w tym `build.sentinel.profile`).
- **Blob v1/v2**: v2 dodaje `expires_at` (epoch‑sec). Blob ma 76B (v1) lub 84B (v2).
- **C pre‑launch check** + **JS periodic check** (`checkIntervalMs`).
- `timeLimit`: `expiresAt` (data/epoch) **lub** `validFor*` (liczone na hoście docelowym w chwili instalacji).
- `timeLimit.enforce = "mismatch"`: expiry jest egzekwowane tylko gdy fingerprint się nie zgadza lub brak blobu (opóźnione „wygaśnięcie” dla kopii).

### 2.5 Integrity (launcher self‑hash)
Konfiguracja: `build.thin.integrity`.
- Mode: `inline` (marker w binarce) lub `sidecar` (hash w `r/<file>`).
- Wymusza kompatybilność z ELF packerem (inline + packer = fail‑fast).

### 2.6 Hardening kompilatora / linker
Konfiguracja: `build.thin.launcherHardening` + `launcherHardeningCET`.
- RELRO/PIE/stack‑protector/fortify, opcjonalnie CET.
- Jeśli flagi nie wspierane przez compiler → fail‑fast (lub jawne wyłączenie).

### 2.7 Obfuskacja C (launcher)
Konfiguracja: `build.protection.cObfuscator`.
- Obsługiwane toolchainy (opcjonalnie): O‑LLVM, Hikari.

### 2.8 ELF packers/protectors
Konfiguracja: `build.protection.elfPacker`.
- Wspierane: `kiteshield`, `midgetpack`, `upx` (opcjonalne, wysokie ryzyko operacyjne).
- Rekomendowana kolejność (anti‑disassembly): `kiteshield` → `midgetpack` → `upx`.
- Domyślnie (thin‑split): `kiteshield` z `-n` (bez ptrace runtime; kompatybilne z anti‑debug).
- Pełny `kiteshield` używa ptrace i koliduje z `antiDebug.tracerPid/ptraceGuard` — wymaga świadomego luzowania tych guardów.
  - **Kiteshield**: szyfruje binarkę, ma loader i (w trybie pełnym) runtime‑engine z odszyfrowaniem funkcji „w locie” — najsilniejszy na disassembly.
  - **Midgetpack**: bardzo mocny na „kontrolę dostępu” (key exchange), ale po uruchomieniu wciąż możliwy dump pamięci; słabszy na disassembly niż Kiteshield.
  - **UPX**: głównie kompresja; łatwy do rozpakowania, więc najsłabszy z punktu widzenia anti‑disassembly.

### 2.9 Source‑level string obfuscation (metadata)
Konfiguracja: `build.protection.strings` (informacyjne, manualna integracja).

### 2.10 Test hooks (E2E)
Deterministyczne wymuszenia w trybie testowym:
- TracerPid: `SEAL_TRACERPID_FORCE`, `SEAL_TRACERPID_FORCE_THREADS`, `SEAL_TRACERPID_FORCE_AFTER_MS`.
- Snapshot: `SEAL_SNAPSHOT_FORCE`, `SEAL_SNAPSHOT_FORCE_AFTER_MS`.
- Sentinel expiry: `SEAL_SENTINEL_FORCE_EXPIRE`, `SEAL_SENTINEL_FORCE_EXPIRE_AFTER_MS`.
- Ptrace/seccomp/core: `SEAL_PTRACE_FORCE`, `SEAL_DUMPABLE_PROBE`, `SEAL_CORE_PROBE`, `SEAL_SECCOMP_PROBE`, `SEAL_SECCOMP_AGGRESSIVE_PROBE`, `SEAL_CORE_CRASH_PROBE`.
- LoaderGuard: `SEAL_LOADER_GUARD_FORCE`.
- E2E strict (root): `SEAL_E2E_STRICT_PROC_MEM`, `SEAL_E2E_STRICT_PTRACE`, `SEAL_E2E_STRICT_DENY_ENV`.

### 2.11 Warstwy ochrony — opis praktyczny (co robią i gdzie działają)
Poniżej „gruby” opis zabezpieczeń w SEAL, warstwa po warstwie. To są **warstwy tarcia**: nie chronią przed rootem, ale podnoszą koszt analizy, instrumentacji i patchowania.

**A. Artefakt i payload (packager + maskowanie)**
- `thin-split`: dzieli artefakt na **launcher** (`b/a`) i **runtime/payload** (`r/rt` + dane). Utrudnia szybkie „wyciągnięcie JS z binarki”.
- `bundle`/`sea`: `build.protection.bundle` i `build.protection.seaMain` pakują payload (kompresja + loader), żeby nie leżał w plain‑text.
- `build.thin.runtimeStore=memfd` (domyślnie) uruchamia runtime z pamięci, a nie z pliku — mniej śladów na dysku.

**B. Launcher C/C++ (twardość binarki)**
- `build.thin.launcherHardening` + `launcherHardeningCET`: RELRO/PIE/stack‑protector/fortify + opcjonalnie CET (utrudnia exploit/tamper).
- `build.thin.launcherObfuscation` + `build.protection.cObfuscator`: obfuskacja kodu C launchera.  
  Domyślnie: O‑LLVM (`ollvm-clang`) z `-fla` + `-sub` (fail‑fast, jeśli brak narzędzia).

**C. Anti‑disassembly na poziomie ELF**
- `build.protection.strip`: usuwa symbole/debug info (mniej „darmowych” podpowiedzi dla `strings`/`nm`).
- `build.protection.elfPacker`: packery/protectory (`kiteshield`, `midgetpack`, `upx`).  
  Domyślnie: `kiteshield -n` (bez ptrace runtime, zgodny z anti‑debug).  
  Uwaga: dla SEA/thin-single strip/packer są **ignorowane** (auto-disabled).

**D. Anti‑debug / anti‑instrumentation (runtime)**
- `build.thin.antiDebug`: TracerPid, denylist ENV, skan `/proc/self/maps`, ptrace guard, seccomp no‑debug, core‑dump off, loader guard.
- **Opaque failure**: zunifikowany komunikat `"[thin] runtime invalid"` i jeden kod wyjścia.
- `build.consoleMode` (np. `errors-only`) ogranicza logi w release, żeby nie ułatwiać analizy.

**E. Anti‑rollback i anti‑clone**
- `build.thin.snapshotGuard`: wykrywa snapshot/rollback na zegarze monotonicznym.
- `build.sentinel.*`: blob v1/v2 + C pre‑check + JS periodic check; `validFor*` liczone na hoście docelowym.

**F. App binding**
- `build.thin.appBind`: wiąże launcher z runtime/payload, żeby nie dało się prosto podmienić `b/a` lub `r/rt` z innego projektu.

**G. Obfuskacja i minify kodu JS**
- Backend: `build.backendMinify` (esbuild), następnie `build.backendTerser` (minify + inline), potem obfuskacja JS (`build.obfuscationProfile`).  
  Profile `none/minimal/balanced/strict/max` sterują m.in. DCI, renameGlobals, poziomem inliningu; string‑obfuscation jest wyłączona, a CFF wyłączone (ryzyko regresji).
- Frontend: `build.frontendObfuscation` (JS w `public/`) + `build.frontendMinify` (HTML/CSS/JS).

**H. Obfuskacja stringów w C/C++ (manualna)**
- `build.protection.strings` to **metadane** (np. `xorstr`, `crystr`, `obfuscate`) — integracja po stronie kodu, nie automatyczna.

**I. Fail‑fast jako „warstwa bezpieczeństwa”**
- Jeśli narzędzie jest wymagane (np. `cObfuscator`), build kończy się **jawnie błędem**.  
  Opcje niewspierane przez dany packager (np. strip/packer dla SEA/thin-single) są **auto‑disabled** z ostrzeżeniem.

### 2.11a Profile bezpieczeństwa (`securityProfile`) + podprofile obfuskacji
Ustaw `build.securityProfile` w `seal.json5`, aby jednym polem włączyć spójny poziom zabezpieczeń.  
Profil ustawia **domyślne wartości** (nie nadpisuje jawnych pól w `seal.json5` ani w `target`).

Podprofile obfuskacji:
- `build.obfuscationProfile` (backend JS)
- `build.frontendObfuscation.profile` (frontend JS)

Jeśli `obfuscationProfile` nie jest ustawione, dziedziczy poziom z `securityProfile`. Dodatkowo możesz ustawić `none` (pomija obfuskację).
Frontend **nie** dziedziczy profilu z backendu — ma własny profil (domyślnie `balanced`).

**Mapa profili (skrót):**
- `minimal`: obfuskacja `minimal` (jeśli nie ustawiona), ale **anti‑debug + integrity + nativeBootstrap + strip** są nadal włączone (seccomp=kill).
- `balanced`: obfuskacja `balanced` (jeśli nie ustawiona), `thin.envMode = "denylist"` oraz anti‑debug/integrity/nativeBootstrap/strip ON.
- `strict`: jak `balanced` + **snapshot guard** i twardsze środowisko:
  - `thin.snapshotGuard.enabled = true`
  - `thin.envMode = "allowlist"`
  - `obfuscationProfile = "strict"` (frontend pozostaje na `balanced`, jeśli nie ustawiony jawnie)
- `max`: jak `strict` + **mocniejsze blokady runtime**:
  - `thin.antiDebug.seccompNoDebug.aggressive = true`
  - `obfuscationProfile = "max"` (frontend pozostaje na `balanced`, jeśli nie ustawiony jawnie)

Domyślny profil (gdy nie ustawisz `securityProfile`) to `strict`.

Przykład (globalny profil + override tylko dla obfuskacji):
```json5
build: {
  securityProfile: "strict",
  obfuscationProfile: "max"
}
```

Uwagi:
- Profile zakładają `thin-split`; dla SEA/`thin-single` część opcji (np. strip/packer, native bootstrap) jest ignorowana (auto‑disabled) z ostrzeżeniem.
- `max` jest najbardziej restrykcyjny — może wymagać dopasowania środowiska (ENV) i testów E2E.

### 2.11b Profil sentinela (`build.sentinel.profile`)
Sentinel to funkcjonalność aplikacji (anti‑copy/licencja), niezależna od `securityProfile`.  
Profil ustawia **domyślne wartości** w `build.sentinel.*` (nie nadpisuje jawnych pól w `seal.json5` ani w `target`).

Profile:
- `off`: sentinel wyłączony.
- `auto`: sentinel włączany tylko dla `thin` + targetów `ssh` (domyślne zachowanie).
- `required`: sentinel wymagany (`enabled=true`, `level=auto`).
- `strict`: sentinel wymagany (`enabled=true`, `level=2`).

Przykład:
```json5
build: {
  sentinel: {
    profile: "required"
  }
}
```

Uwagi:
- Profil można nadpisać per‑target (`target.sentinel.profile` lub `target.build.sentinel.profile`).
- Jawne pola `build.sentinel.*` mają pierwszeństwo nad profilem.

### 2.12 Szczegóły mechanizmów (jak działa / przed czym chroni / implementacja)

#### 2.12.1 `thin-split` — container runtime/payload
- Jak działa: runtime i payload są pakowane do kontenerów chunkowanych (Zstd). Każdy chunk ma CRC32, a indeks + stopka są **maskowane** (xorshift32 stream + rotacja bajtu + dodanie + swap nibble). W stopce jest `appBind`.
- Chroni przed: szybkim „read‑and‑run” i prostym wyciągnięciem payloadu z pliku; wykrywa podmianę kontenera przez CRC/appBind.
- Implementacja: `encodeContainer` buduje `r/rt` i `r/pl`, launcher w C odkodowuje (`decode_bytes`), weryfikuje CRC i limity, a parametry kodeka (`THIN_CODEC_*`) są wkompilowane do launchera i cachowane per target.

#### 2.12.2 `runtimeStore` — memfd vs tmpfile
- Jak działa: domyślnie runtime i bundle są dekodowane do **memfd**; plik jest „sealowany” (`F_ADD_SEALS`) i uruchamiany przez `fexecve`.
- Chroni przed: zostawieniem artefaktów na dysku i prostym „cat” payloadu.
- Implementacja: `memfd_create` z `MFD_ALLOW_SEALING` + `F_ADD_SEALS`; fallback `tmpfile` używa `mkstemp` + `unlink` i `umask(077)`.

#### 2.12.3 `bundle`/`sea` — packowanie backendu
- Jak działa: backend bundle jest kompresowany (gzip/brotli), a loader odtwarza go **w pamięci** i kompiluje jako CJS.
- Chroni przed: leżeniem plain‑text JS na dysku po release.
- Implementacja: `packFallbackBundleGzip` (bundle) zapisuje `app.bundle.cjs.gz` i loader `seal.loader.cjs`; `packStageMainToLoader` (SEA) generuje loader z base64‑chunkami i `zlib.*DecompressSync`.

#### 2.12.4 `launcherHardening` / `launcherHardeningCET`
- Jak działa: kompilacja launchera z RELRO/PIE/stack‑protector/fortify, opcjonalnie CET.
- Chroni przed: prostymi exploitami i łatwym nadpisaniem kodu/stacka.
- Implementacja: flagi kompilatora/linkera są ustawiane w packagerze; brak wsparcia → fail‑fast.

#### 2.12.5 Obfuskacja C (`cObfuscator`)
- Jak działa: kompilacja launchera przez obfuscating clang (passy LLVM IR).
- Chroni przed: statyczną analizą i szybkim patchowaniem checków w launcherze.
- Implementacja: `build.protection.cObfuscator` wymaga `cmd` + `args`. Domyślnie O‑LLVM z `-mllvm -fla -mllvm -sub` (fail‑fast jeśli brak narzędzia).

#### 2.12.6 `strip` / ELF packer
- Jak działa: `strip` usuwa symbole/debug info; packer opakowuje binarkę i utrudnia disassembly.
- Chroni przed: „darmowym” rozpoznaniem funkcji/strings i prostą dekompilacją.
- Implementacja: `strip`/`elfPacker` działają na launcherze `b/a` (thin‑split). Dla SEA i thin‑single są ignorowane (auto‑disabled).

#### 2.12.7 Anti‑debug / anti‑instrumentation
- **Mini‑glossary (prosto):**  
  - **ptrace**: systemowe API Linuksa do „podpinania się” pod inny proces (debugger, tracer).  
  - **TracerPid**: pole w `/proc/<pid>/status` mówiące, czy proces jest debugowany (PID debuggera).  
  - **seccomp**: mechanizm kernela ograniczający dozwolone syscalle procesu.  
  - **BPF (Berkeley Packet Filter)**: mały „program‑filtr”, który kernel uruchamia przy każdym syscallu, aby zdecydować allow/deny.  
  - **core dump**: plik zrzutu pamięci procesu po crashu; można z niego odtworzyć dane/kod.  
  - **/proc/self/maps**: lista zmapowanych segmentów pamięci (biblioteki, loader, anon‑mem).
  - **/proc**: wirtualny system plików z informacjami o procesie. To „debug‑API” Linuksa w formie tekstu.  
  - **syscall**: wywołanie z programu do kernela (np. `open`, `ptrace`, `read`, `perf_event_open`).
  - **allowlist vs denylist (ENV)**: allowlist = reset do minimalnego zestawu zmiennych, denylist = usunięcie tylko tych niebezpiecznych.

- **Ważne ograniczenia (prosto):**
  - To nie jest „anty‑root” — root zawsze może dumpować pamięć lub zmieniać środowisko.  
  - Większość guardów wykrywa **popularne** techniki, ale nie wszystkie (stąd warstwowanie).

- **Miejsca wykonania (kolejność i kontekst)**  
  1) **Launcher C (przed uruchomieniem Node):** `apply_ptrace_guard()` → `anti_debug_checks()` (TracerPid/ENV/maps/loader) → `self_hash_check()` → `sentinel_check()`.  
  2) **Launcher C (po dekodowaniu runtime/payload):** `harden_env()` → `apply_core_dump_limit()` → `apply_seccomp_no_debug()` → `fexecve(node)`.  
  3) **Bootstrap JS (po starcie Node):** okresowe checki `TracerPid` + `snapshot` + `sentinel` (timery z `unref()`).
- **Zachowanie przy wykryciu:** fail‑fast, a przy aktywnym sentinel — komunikat i kod wyjścia są maskowane do wartości `exitCodeBlock` (opaque failure).

- **TracerPid**  
  Jak działa: odczyt `TracerPid` z `/proc/self/status`; opcjonalnie również `/proc/self/task/<tid>/status` (per‑thread).  
  Chroni przed: attach przez gdb/lldb/strace/ptrace i podstawową instrumentację ptrace.  
  Implementacja:  
  - C: `read_tracer_pid_file()` + opcjonalny `tracerpid_tasks()`; uruchamiane **przed** `fexecve`.  
  - JS: ten sam mechanizm w bootstrapie; kontrola okresowa (`tracerPidIntervalMs`).  
  - E2E: `SEAL_TRACERPID_FORCE*` wymusza trigger testowy (sekcja 2.10).
  Dla mniej zaawansowanych: jeśli `TracerPid` jest **> 0**, to znaczy, że proces jest debugowany. Wersja per‑thread wykrywa sytuację, gdy debugger podpiął się tylko do jednego wątku.
- **Denylist ENV**  
  Jak działa: sprawdza, czy w momencie startu procesu nie są ustawione podejrzane zmienne (`LD_PRELOAD`, `LD_AUDIT`, `NODE_OPTIONS`, `GCONV_PATH`, `LOCPATH`, `MALLOC_TRACE` itd.).  
  Chroni przed: wstrzykiwaniem hooków przez ENV i trikiem gconv.  
  Implementacja:  
  - C: natychmiastowy fail‑fast, jeśli którakolwiek zmienna jest ustawiona.  
  - `harden_env()`:
    - **allowlist** (domyślnie, gdy `thin.envMode=allowlist`): `clearenv()` + przywrócenie bezpiecznych zmiennych (`LANG/LC_*/TZ/TERM/HOME/USER/LOGNAME/SSL_CERT_*`) + bezpieczny `PATH`.  
    - **denylist** (gdy `thin.envMode=denylist`): usuwa tylko niebezpieczne zmienne, reszta zostaje.  
  - Override: `SEAL_THIN_ENV_STRICT=1|0` może wymusić tryb allow/deny.
  Dla mniej zaawansowanych: `LD_PRELOAD` to najprostszy sposób „wstrzyknięcia” własnej biblioteki do procesu jeszcze **przed** startem aplikacji. `NODE_OPTIONS` pozwala dodać własny `--require` i wstrzyknąć hooki do Node.
- **Maps denylist**  
  Jak działa: skan `/proc/self/maps` i dopasowanie substringów.  
  Chroni przed: prostym wstrzyknięciem bibliotek (np. `frida-agent.so`).  
  Implementacja: `maps_has_deny()` w C. Zalecenie: używać **precyzyjnych tokenów**, aby uniknąć false‑positives (np. `frida-agent` zamiast `frida`).
  Dla mniej zaawansowanych: `/proc/self/maps` to lista „co jest załadowane do pamięci”. Jeśli tam pojawi się biblioteka z narzędzia do analizy, wykrywamy to po nazwie.
- **Ptrace guard**  
  Jak działa: `prctl(PR_SET_DUMPABLE, 0)` blokuje attach i ogranicza `/proc/<pid>/mem` dla nieuprzywilejowanych.  
  Chroni przed: ptrace bez roota i częścią podstawowych debuggerów.  
  Implementacja: `apply_ptrace_guard()`; błąd `prctl` ⇒ fail‑fast.  
  E2E: `SEAL_PTRACE_FORCE=1` pozwala testowo wymusić fail.
  Dla mniej zaawansowanych: to jest „zatrzaśnięcie drzwi” dla debuggerów uruchomionych bez uprawnień roota.
- **Seccomp no‑debug**  
  Jak działa: filter BPF to „mini‑program”, który kernel uruchamia przy **każdym** syscallu.  
  My blokujemy `ptrace` i `perf_event_open`; w trybie agresywnym także `process_vm_readv/writev`, `kcmp`, `bpf`, `userfaultfd`, `pidfd_*`.  
  Chroni przed: instrumentacją i odczytem pamięci przez syscalls (np. `perf` i narzędzia do zdalnego czytania pamięci).  
  Implementacja: `PR_SET_NO_NEW_PRIVS` + `seccomp` (tryb `errno` zwraca `EPERM`, tryb `kill` zabija proces).  
  E2E: `SEAL_SECCOMP_PROBE` i `SEAL_SECCOMP_AGGRESSIVE_PROBE` testują skuteczność filtra.
  Dla mniej zaawansowanych: to działa jak „lista zakazanych drzwi” do kernela. Jeśli program próbuje użyć zabronionego syscalla, kernel go blokuje albo zabija proces (w zależności od trybu).
- **Core dump off**  
  Jak działa: `setrlimit(RLIMIT_CORE, 0)` wyłącza core dumpy.  
  Chroni przed: dumpami pamięci z wrażliwym kodem.  
  Implementacja: `apply_core_dump_limit()` w C.  
  E2E: `SEAL_CORE_PROBE`/`SEAL_CORE_CRASH_PROBE`.
  Dla mniej zaawansowanych: bez core dumpa nie powstaje plik z pełną pamięcią procesu po crashu.
- **Loader guard**  
  Jak działa: odczytuje PT_INTERP z ELF (`/proc/self/exe`) i sprawdza, czy interpreter jest faktycznie zmapowany w `/proc/self/maps`.  
  Chroni przed: niestandardowym loaderem, podmienionym interpreterem lub nietypowym chain‑load.  
  Implementacja: `read_elf_interp()` + `realpath()` + skan maps; brak PT_INTERP (binarka statyczna) = skip.
  Dla mniej zaawansowanych: każdy program ELF ma „domyślny loader” (np. `/lib64/ld-linux-x86-64.so.2`). Jeśli system uruchomił go inaczej, to jest podejrzane.

#### 2.12.8 Snapshot guard
- Jak działa: mierzy monotoniczny czas (`process.hrtime.bigint()`), wykrywa skoki w przód/tył.  
- Chroni przed: snapshot/rollback i sztucznym „cofaniem” runtime.  
- Implementacja: timer w JS bootstrapie; progi `intervalMs/maxJumpMs/maxBackMs`.

#### 2.12.9 Sentinel (anti‑clone / time‑limit)
- Jak działa: blob ma CRC32 + maskowanie z kluczem wyprowadzonym z `anchor` (SHA‑256); fingerprint z `machine-id`/root RID/CPU ID; opcjonalny `expires_at`.
- Chroni przed: prostym kopiowaniem release między hostami i uruchamianiem po terminie.
- Implementacja: check w C przed startem + okresowe checki w JS; tryb v1/v2 (76/84B), `timeLimit` i `checkIntervalMs`.

#### 2.12.10 Integrity (self‑hash launchera)
- Jak działa: CRC32 z całej binarki; tryb `inline` używa markera w pliku, `sidecar` trzyma hash w `r/<file>`.
- Chroni przed: patchowaniem launchera po buildzie.
- Implementacja: `self_hash_check()` czyta `/proc/self/exe`, zeruje marker, porównuje CRC; sidecar ma magic `SLIH`.

#### 2.12.11 App binding
- Jak działa: `appBind` to 64‑bit hash z `appName` + `entry` (lub jawne `value`), zapisany w stopce kontenera.
- Chroni przed: podmianą runtime/payload na artefakt z innego projektu.
- Implementacja: `computeAppBind()` → stopka kontenera; launcher sprawdza `THIN_APP_BIND`.

#### 2.12.12 Obfuskacja i minify backendu JS
- Jak działa: `esbuild` (bundle + minify), opcjonalnie Terser (mangle/inline), potem `javascript-obfuscator`.
- Chroni przed: łatwą analizą kodu JS i prostymi wzorcami (np. nazwami funkcji).
- Implementacja: `build.backendMinify`, `build.backendTerser`, `build.obfuscationProfile` (`none/minimal/balanced/strict/max`); CFF jest wyłączone.

#### 2.12.13 Obfuskacja/minify frontendu
- Jak działa: obfuskacja każdego pliku `public/*.js`, minify HTML/CSS/JS.
- Chroni przed: szybkim odczytem logiki klienta.
- Implementacja: `build.frontendObfuscation` + `build.frontendMinify`.

#### 2.12.14 Ograniczenie logów (`consoleMode`)
- Jak działa: w trybie `errors-only` usuwane są `console.log/info/debug/warn` na etapie bundlowania.
- Chroni przed: podpowiedziami w logach podczas analizy runtime.
- Implementacja: esbuild `pure` dla wybranych `console.*`.

#### 2.12.15 Native bootstrap (opcjonalne)
- Jak działa: natywny addon czyta bundle z FD do `ExternalString`, stosuje `MADV_DONTDUMP`/`mlock` i kompiluje CJS **w native** (V8 `CompileFunction`), bez JS‑owego stringa źródła i wrappera w JS.
- Chroni przed: dumpami pamięci i długim utrzymywaniem plaintextu w heapie.
- Implementacja: `build.thin.nativeBootstrap.enabled=true` + `nb.node` w `r/`.
  - `build.thin.nativeBootstrap.mode`: `compile` (domyślnie) lub `string` (legacy, używa `_compile`).
  - W E2E bootstrap może wygenerować dodatkowy string tylko na potrzeby self‑scan.

#### 2.12.16 Fail‑fast i brak cichych fallbacków
- Jak działa: brak wymaganych narzędzi albo niewspierany packager → twardy błąd.
- Chroni przed: „pozornym bezpieczeństwem” (build bez realnych zabezpieczeń).
- Implementacja: walidacje w `packagerConfig` i `build` (np. `cObfuscator` wymagany, strip/packer auto‑disabled dla SEA/thin-single).

## 3. Decyzje projektowe (dlaczego)
- **thin‑split jako jedyny rekomendowany packager**: umożliwia łączenie warstw ochrony (strip/ELF packer/integrity) bez korupcji payloadu.
- **Okresowe checki** (TracerPid, Snapshot, Sentinel): wykrywanie ataków w locie, nie tylko na starcie.
- **Brak fallbacków** w zabezpieczeniach: jeśli coś nie jest wspierane, build/run ma się zatrzymać jawnie.
- **Czas expiry liczony na hoście**: ogranicza przypadki, gdzie lokalny czas developera fałszuje wynik.

## 4. Czego jeszcze brakuje (niezaimplementowane)
- Zaawansowane detekcje hardware breakpoints (DR0–DR7) / single‑step.
- Anti‑instrumentation na poziomie LSM/AppArmor/IMA.
- Detekcja hooków GOT/PLT i self‑repair.
- PTRACE_TRACEME model (wymaga innego modelu uruchomienia — odłożone).
- Sentinel L3/L4 (PUID / external anchor), xattr mode, HMAC v2.
- VM/hypervisor heurystyki (DMI/CPUID/peryferia) — odłożone z uwagi na realne środowiska VM.

## 5. Nieaktualne / Legacy (nie usuwać)
- `thin-single` jako zalecany AIO packager — **legacy**. W repo nie używamy.
- “AIO najpierw, potem BOOTSTRAP” — decyzja odwrócona na rzecz `thin-split`.

## 6. Ryzyka operacyjne
- **EDR/AV**: packery + agresywne anti‑debug mogą powodować false‑positive.
- **Kompatybilność compilerów**: CET i obfuskatory wymagają odpowiednich wersji clang/gcc.
- **Systemd hardening**: poza zakresem tego dokumentu (może być osobnym trackiem).

---

# Appendix A — ubuntu-foss-anti-reverse-spec-v0.2-merged (verbatim)

# Ubuntu/Linux (ELF): FOSS narzędzia i pipeline utrudniania reverse engineeringu / dekompilacji
**Specyfikacja zmergowana:** v0.2 (merge v0.1 + recenzja Thinking)  
**Data:** 2025-12-25  
**Zakres:** Ubuntu/Linux, artefakty **ELF** (binarki i biblioteki `.so`) budowane z **C/C++** (i ogólnie: z dowolnego języka kompilowanego przez LLVM/GCC).  
**Cel:** zabezpieczyć *artefakt wykonywalny na Ubuntu* przed łatwą analizą (dekompilacją/pseudokodem) i szybkim zrozumieniem implementacji przez osobę, która ma dostęp do binarki oraz może ją uruchamiać.

> To jest **warstwowanie tarcia** (podnoszenie kosztu analizy), nie DRM i nie „100% nie‑do‑złamania”.  
> Jeśli przeciwnik ma **root** na hoście / pełną kontrolę nad środowiskiem, może dumpować pamięć i instrumentować proces — wówczas każda metoda po stronie klienta jest tylko opóźniaczem.

---

## 0) Najkrótsza rekomendacja (domyślny „zdrowy” pipeline)

**Domyślne minimum (R1 + H1 + strip):**
1) Kompilacja `-O2` + `-flto` + ukrywanie symboli (`-fvisibility=hidden`) + sekcjonowanie (`-ffunction-sections -fdata-sections`).  
2) Link: `--gc-sections`, opcjonalnie `--build-id=none`.  
3) Post-build: wydzielenie debug info do osobnego pliku + `strip` release.  
4) QA: automatyczne checki (`readelf`, `nm`, `strings`) w CI.  
5) Runtime/OS: w produkcji ograniczenia `ptrace` (Yama) + sandbox (systemd/AppArmor/seccomp), jeśli to ma sens dla Twojego modelu wdrożenia.

**Dla „core algorytmu”**: selektywna obfuskacja na poziomie LLVM IR (np. O‑MVLL / OLLVM / obfuscator‑pass) tylko dla wybranych modułów/funkcji + reszta w R1/H1.

---

## 1) Model zagrożeń i non‑goals (normatywne)

### 1.1 Przeciwnik i ograniczenia
- Przeciwnik ma **dostęp do binarki** (z dystrybucji lub z serwera) i może ją analizować (statycznie/dynamicznie).
- Przeciwnik może mieć:
  - tylko konto użytkownika (bez roota),
  - albo pełną kontrolę (root / debug attach / snapshoty / emulacja).

### 1.2 Cel ochrony
- Utrudnić:
  - szybkie znalezienie „funkcji‑serc” (core),
  - rekonstrukcję przepływu sterowania i struktur danych,
  - wyciąganie protokołów/endpointów/kluczy ze stringów,
  - proste hookowanie i patchowanie.

### 1.3 Non‑goals
- Nie obiecujemy braku reverse engineeringu.
- Nie bronimy przed root + czas + snapshoty (to wymaga architektury: sekrety po stronie serwera, HSM/TPM, itp. — poza zakresem).

---

## 2) Taksonomia warstw obrony (od źródeł do runtime)

### 2.1 Warstwa źródeł (source‑level): redukcja „wycieków”
To nie jest „obfuskacja”, ale często daje największy zwrot:
- **logi/komunikaty**: release nie może zdradzać nazw algorytmów, stanów, endpointów, formatów protokołu;
- **asserty/stack trace**: kontrola `assert()` (zwykle `-DNDEBUG`) i treści komunikatów;
- **__FILE__/ścieżki**: stosuj mapowanie prefixów (poniżej), żeby nie wyciekały ścieżki repo/build.

### 2.2 Warstwa kompilatora (GCC/Clang): optymalizacja jako „naturalna obfuskacja”
- `-O2` / `-O3`: inlining, DCE, propagacja stałych — dekompilacja robi się mniej czytelna.
- `-flto`: cross‑module inlining i „zacieranie granic” między modułami.

**Uwaga na debugowalność:** im agresywniejsze flagi, tym trudniejsza diagnostyka awarii.

### 2.3 LTO i pipeline linkera: sekcje + GC sekcji
- `-ffunction-sections -fdata-sections` + `-Wl,--gc-sections` usuwa martwy kod i zmniejsza binarkę (mniej materiału do analizy).

### 2.4 Ukrywanie API (visibility + kontrola eksportów)
- `-fvisibility=hidden` (+ C++: `-fvisibility-inlines-hidden`) redukuje liczbę symboli widocznych z zewnątrz.
- **Dla `.so`**: używaj **version script** (GNU ld) do twardej listy eksportów i ukrywania reszty.

### 2.5 Sanitizacja ścieżek buildowych (prefix‑map)
Żeby nie zdradzać ścieżek repo/CI w debug info i makrach:
- `-ffile-prefix-map=OLD=NEW` (jest „meta‑opcją” równoważną mapowaniom debug/macro; przydatne dla reproducible builds).
- `-fdebug-prefix-map=OLD=NEW` (debug info).
- `-fmacro-prefix-map=OLD=NEW` (makra typu `__FILE__`).

### 2.6 Post‑build (binutils/elfutils/LLVM): stripping i zarządzanie symbolami
- wydziel debug symbole do osobnego pliku (`objcopy --only-keep-debug`) i stripuj release (`strip` / `llvm-strip` / `eu-strip`).
- opcjonalnie `sstrip` (bardzo agresywny, ryzyko kompatybilności).

### 2.7 Obfuskacja na poziomie LLVM IR (najmocniejsza FOSS warstwa dla C/C++)
- działa jako passy LLVM (często `-fpass-plugin=` lub `opt -load-pass-plugin`).
- najrozsądniej stosować **selektywnie**: tylko core moduły/funkcje.

### 2.8 Packery / runtime‑loader (FOSS): największe ryzyko operacyjne
- utrudniają analizę statyczną przez pakowanie/loader, czasem anti‑debug.
- często powodują problemy reputacyjne (EDR/AV) i komplikują support.

### 2.9 Warstwa OS / runtime (FOSS): ograniczenie attach/debug/instrumentacji
- Yama `ptrace_scope` (sysctl) utrudnia `ptrace`/attach do procesów.
- systemd sandboxing / AppArmor / seccomp / kontenery.

---

## 3) Inwentarz narzędzi FOSS (Ubuntu/Linux) — „anti reverse engineering” w praktyce

> Poniżej są narzędzia FOSS, które realnie pojawiają się w pipeline’ach „utrudnij analizę”.  
> Licencje podane wg stron projektu/GitHuba; przed użyciem w produkcie komercyjnym zawsze sprawdź kompatybilność licencyjną (szczególnie GPL/AGPL).

### 3.1 Toolchain i binarne narzędzia post‑build
- **GNU binutils**: `strip`, `objcopy`, `readelf`, `nm` — podstawowy zestaw do cięcia symboli i inspekcji ELF.
- **LLVM toolchain**: `llvm-strip` — analog `strip` w świecie LLVM.
- **elfutils**: `eu-strip`, `eu-unstrip`, `eu-readelf`, `eu-strings` — alternatywy/uzupełnienia (często wygodne w CI).
- **ELFkickers**: `sstrip` — „hardcore strip” (GPLv2+ wg manpage); używać ostrożnie.

### 3.2 Obfuskacja LLVM IR (C/C++ i inne języki przez LLVM)
- **Obfuscator‑LLVM (OLLVM)** — klasyczny zestaw passów (instr substitution, bogus control flow, flattening); licencja jak LLVM (University of Illinois/NCSA).
- **Hikari** — fork/relicense OLLVM; licencja AGPLv3 (z dodatkowymi ograniczeniami projektu).
- **obfuscator-pass** — kolekcja passów (LLVM 15), licencja MIT (projekt edukacyjny).
- **O‑MVLL (Open‑Obfuscator / O‑MVLL)** — obfuskator jako plugin LLVM; licencja Apache‑2.0; nastawiony na Android/iOS toolchainy, ale technicznie to passy LLVM.

### 3.3 Packery / protectory ELF (FOSS)
Rekomendowana kolejność (anti‑disassembly): **Kiteshield → MidgetPack → UPX**.
- **Kiteshield** — packer/protector x86‑64 ELF, MIT; wielowarstwowe szyfrowanie + loader + techniki anti‑debug (projekt jawnie „academic exercise”).
- **MidgetPack** — secure packer ELF (Linux/FreeBSD); GitHub pokazuje „View license” (licencja nie jest automatycznie rozpoznana przez GitHub w UI — sprawdź plik LICENSE przed użyciem).
- **UPX** — popularny packer (GPL); świetny do rozmiaru, ale sam w sobie nie jest „krypto‑ochroną” (łatwo rozpakować) — traktuj bardziej jako kompresję.

### 3.4 Obfuskacja stringów/stałych (nagłówkowe biblioteki C/C++)
To usuwa „darmowe” podpowiedzi z `strings(1)` (choć string pojawi się w RAM w runtime).
- **Obfuscate** (C++14 header‑only) — Unlicense (public domain‑like).
- **xorstr** (C++17) — Apache‑2.0.
- **crystr** (C++20) — MIT; stringi + liczby.

### 3.5 Obfuskacja źródeł C/C++ (source‑to‑source / AST)
To jest osobna kategoria: obfuscator działa na poziomie źródeł/AST (łatwo też zrobić sobie krzywdę w utrzymaniu).
- **mutator / obfuscator** (terminaldweller/mutator) — GPL‑3.0; zawiera narzędzie „obfuscator” (identifier obfuscation itd.).  
  Uwaga: to jest głębokie narzędzie „suite”; wymaga weryfikacji do produkcyjnego use‑case.

---

## 4) Profile flag (copy/paste) — rozdzielone na „anti‑RE” i „hardening”

> Zasada: **anti‑RE** (czytelność) i **hardening** (odporność na exploit/tamper) to dwie osie.  
> Łącz je, ale utrzymuj osobne profile, żeby wiedzieć co psuje debug/ABI.

### 4.1 R1 — „Standard release” (najbezpieczniejszy w utrzymaniu)
```bash
CFLAGS="-O2 -flto -DNDEBUG -ffunction-sections -fdata-sections -fno-ident -fvisibility=hidden"
CXXFLAGS="$CFLAGS -fvisibility-inlines-hidden"
LDFLAGS="-Wl,--gc-sections -Wl,--build-id=none"
```

### 4.2 R2a — „Twardszy na RE (C / proste binarki)”
```bash
CFLAGS="-O3 -flto -DNDEBUG -ffunction-sections -fdata-sections -fno-ident -fvisibility=hidden -fomit-frame-pointer"
CXXFLAGS="$CFLAGS -fvisibility-inlines-hidden"
LDFLAGS="-Wl,--gc-sections -Wl,--build-id=none"
```

### 4.3 R2b — „Twardszy na RE (C++ produkcyjny)”
**Wersja ostrożna**: bez wyłączania unwind (żeby nie rozjechać EH/backtrace).
```bash
CFLAGS="-O3 -flto -DNDEBUG -ffunction-sections -fdata-sections -fno-ident -fvisibility=hidden"
CXXFLAGS="$CFLAGS -fvisibility-inlines-hidden"
LDFLAGS="-Wl,--gc-sections -Wl,--build-id=none"
```

> `-fno-unwind-tables` / `-fno-asynchronous-unwind-tables` zostaw jako **opcję eksperymentalną**; mogą utrudnić diagnostykę i w niektórych scenariuszach C++ robią więcej szkody niż pożytku.

### 4.4 H1 — „Hardening” (anti‑exploit / anti‑tamper)
```bash
CFLAGS_HARDEN="-fstack-protector-strong -D_FORTIFY_SOURCE=2 -fPIE"
LDFLAGS_HARDEN="-Wl,-z,relro -Wl,-z,now -Wl,-z,noexecstack -pie"
```

### 4.5 Prefix‑map (sanitizacja ścieżek)
```bash
CFLAGS_PREFIXMAP="-ffile-prefix-map=$PWD=. -fdebug-prefix-map=$PWD=. -fmacro-prefix-map=$PWD=."
```

---

## 5) Post‑build: debug symbole osobno + strip release (wzorzec)

```bash
# 1) build z -g (dla prywatnych symboli)
# 2) wyciągnij debug info:
objcopy --only-keep-debug mybin mybin.debug

# 3) strip release:
strip --strip-all mybin
# alternatywnie: llvm-strip mybin  /  eu-strip mybin

# 4) opcjonalnie: powiąż debuglink:
objcopy --add-gnu-debuglink=mybin.debug mybin
```

**QA po buildzie (minimum):**
```bash
readelf -S mybin | grep -E '\.debug|\.symtab|\.comment|build-id' || true
nm -a mybin | head || true
strings -a mybin | head || true
```

---

## 6) Kontrola eksportów dla `.so` (version scripts)

Dla bibliotek współdzielonych, poza `-fvisibility=hidden`, dołóż **version script** dla GNU ld:
- pozwala oznaczyć i ograniczyć eksporty (`global:`), resztę ukryć (`local:`).

To bywa najprostszy sposób, żeby nie wystawiać „mapy” biblioteki.

---

## 7) CI/QA — wymagania automatyczne (Definition of Done)

Build ma failować, jeśli:
- release zawiera `.debug_*` (lub inne zakazane sekcje wg polityki),
- `strings` znajduje zabronione frazy (lista/regex dla endpointów, nazw algorytmów, ścieżek repo),
- eksporty symboli przekraczają limit (np. liczba `GLOBAL` w `readelf -Ws`),
- brak artefaktów: `mybin` + `mybin.debug` + raporty QA.

---

## 8) Runtime/OS (FOSS): ogranicz attach/debug i powierzchnię ataku

- **Yama `ptrace_scope`**: ogranicza `ptrace`/attach do procesów (przydatne na serwerach, gdy atakujący ma tylko konto user).
- **systemd sandboxing**: `NoNewPrivileges=`, `ProtectSystem=`, `PrivateTmp=`, `RestrictAddressFamilies=`, `SystemCallFilter=` itd.
- **AppArmor / SELinux**: profilowanie dostępu do plików i syscalls.
- **seccomp (libseccomp)**: redukcja dostępnych syscalli.

To nie jest „obfuskacja binarki”, ale realnie podnosi koszt instrumentacji i exploitów.

---

## 9) Ryzyka i pułapki

- **Utrzymanie vs ochrona:** im więcej „trików”, tym droższy support i debug.
- **Wydajność:** obfuskacja IR i packery mogą mocno spowolnić.
- **ABI/kompatybilność:** visibility, wyjątki, RTTI, unwind — łatwo rozjechać integracje.
- **EDR/AV:** packery + anti‑debug mogą triggerować false positive (szczególnie w środowiskach enterprise).
- **Licencje:** GPL/AGPL mogą narzucić obowiązki dystrybucyjne — zwłaszcza jeśli wchodzisz w redystrybucję lub modyfikacje narzędzi.

---

## 10) Źródła / referencje (wybrane)

> URL w bloku kodu (żeby łatwo skopiować). To jest lista referencyjna, nie „instrukcja malware”.

```text
GCC: -ffile-prefix-map (meta-opcja), -fdebug-prefix-map, -fmacro-prefix-map:
  https://gcc.gnu.org/onlinedocs/gcc-11.2.0/gcc/Overall-Options.html
  https://gcc.gnu.org/onlinedocs/gcc-4.9.0/gcc/Debugging-Options.html
  https://gcc.gnu.org/onlinedocs/gcc-15.1.0/gcc/Overall-Options.html
  https://reproducible-builds.org/docs/build-path/

binutils strip/objcopy:
  https://www.sourceware.org/binutils/docs/binutils/strip.html
  https://sourceware.org/binutils/docs-2.17/binutils/strip.html
  https://man7.org/linux/man-pages/man1/objcopy.1.html

elfutils eu-strip/eu-unstrip:
  https://docs.redhat.com/en/documentation/red_hat_developer_toolset/11/html/user_guide/chap-elfutils
  https://rpm.pbone.net/manpage_idpl_101187457_numer_1_nazwa_eu-strip.html

ELFkickers / sstrip (GPLv2+ wg manpage):
  https://manpages.debian.org/testing/elfkickers/sstrip.1.en.html
  https://www.muppetlabs.com/~breadbox/software/elfkickers.html

Kiteshield (MIT):
  https://github.com/GunshipPenguin/kiteshield

Obfuscator-LLVM (NCSA/LLVM license):
  https://github.com/obfuscator-llvm/obfuscator/wiki/License
  https://github.com/obfuscator-llvm/obfuscator

Hikari (AGPLv3):
  https://github.com/HikariObfuscator/Hikari/wiki/License

obfuscator-pass (MIT):
  https://github.com/Yuerino/obfuscator-pass

O-MVLL (Apache-2.0):
  https://github.com/open-obfuscator/o-mvll
  https://obfuscator.re/omvll/

String obfuscation libs:
  Obfuscate (Unlicense): https://github.com/adamyaxley/Obfuscate
  xorstr (Apache-2.0):   https://github.com/JustasMasiulis/xorstr
  crystr (MIT):          https://github.com/android1337/crystr

mutator / obfuscator (GPL-3.0):
  https://github.com/terminaldweller/mutator

GNU ld version scripts (symbol export control):
  https://sourceware.org/binutils/docs-2.29/ld/VERSION.html
  https://www.gnu.org/software/gnulib/manual/html_node/LD-Version-Scripts.html
```


---

# Appendix B — spec-seal-ubuntu-anti-reverse-v0.2-model-pro (verbatim)

# SEAL / Ubuntu/Linux: warstwy ochrony kodu w artefaktach (FOSS) — anti‑casual extraction + utrudnianie reverse engineering (spec v0.2)

**Data:** 2025-12-25  
**Status:** roboczy standard / do wdrożenia (v0.2)  
**Dla:** projektów budowanych i wdrażanych przez **SEAL** (packagery: `thin-*`, `sea`, `bundle`, `none`) + ogólne zasady dla ELF na Ubuntu/Linux (C/C++/Rust/Go).  
**Uwaga (zakres):** hardening systemd jest **poza zakresem** tej specyfikacji (może być realizowany osobno w konfiguracji usług/ops).
**Założenie krytyczne:** **mamy źródła** (generator / build pipeline jest po naszej stronie), więc „ochronę” możemy robić **już na etapie generacji** i budowania artefaktu, a nie dopiero post‑factum.

> Ten dokument jest o **podnoszeniu kosztu** analizy i ekstrakcji logiki (tarcie / friction) oraz o **hardeningu bezpieczeństwa** wdrożenia.  
> Nie jest to obietnica „nie da się zreverse’ować”.

---

## Changelog (v0.2 vs v0.1)
Wersja v0.2:
- doprecyzowuje cel i **mierzalne DoD** (Definition of Done),
- dodaje osobną warstwę „**wycieki**” (logi/komunikaty/stringi/ścieżki),
- rozdziela **anti‑RE** vs **hardening** (osobne presety),
- wzmacnia sekcję linkera: **version script**, `--exclude-libs`, temat interpozycji,
- dodaje **pipeline/CI** jako wymaganie (artefakty + automatyczna weryfikacja),
- dostosowuje całość do **SEAL** (w szczególności `thin-*`) i opisuje, co robić **na etapie generacji**,
- porządkuje presety: rozdział R2 na **R2a/R2b**, dodaje profil **H1**.

---

## Executive summary

### Co chcemy osiągnąć
1) **Anti‑casual extraction** dla artefaktów SEAL: proste techniki (`file`, `strings`, `binwalk`, `zstd -d`, „odetnij ogon”, rozpakuj `.gz`) mają być niewystarczające.  
2) **Friction na RE**: statyczna i dynamiczna analiza ma być droższa (mniej wskazówek: symboli, debug info, czytelnych stringów, czytelnych granic funkcji).  
3) **Hardening runtime**: ograniczamy łatwe wstrzyknięcia i „debug‑wygody” (`NODE_OPTIONS`, `LD_PRELOAD`, core dumpy, luźne uprawnienia).

### Dwie osie (ważne)
- **Oś A — Anti‑RE / anti‑analysis (friction):** utrudnia zrozumienie logiki i szybkie „wyciągnięcie” kodu.  
- **Oś B — Security hardening:** zmniejsza podatność na exploitację i skutki błędów oraz utrudnia tampering/patching.

Te osie się uzupełniają, ale nie zastępują.

### Domyślna rekomendacja (dla większości wdrożeń)
- Packager: **`thin-split`** (BOOTSTRAP) + poziom **`low`** dla iteracji, **`high`** gdy IP jest wrażliwe.  
- Obfuskacja bundla: profil `balanced` (a nie „paranoja”, żeby nie rozwalić stabilności).  
- Ochrona przed „podglądem”: SEA main packing (Brotli) + bundle packing (gzip + loader).  
- Hardening: systemd baseline (`NoNewPrivileges`, `PrivateTmp`, `LimitCORE=0`, `UnsetEnvironment=NODE_OPTIONS`).  
- CI gate: automatyczne checki „czy coś nie wyciekło”.

---

## 0. Threat model, cele, non‑goals

### 0.1 Threat model (dla SEAL i ELF)
Rozważamy trzy klasy przeciwnika:

1) **Ciekawski użytkownik / konkurencja (bez roota):** ma artefakt, uruchamia go, używa `strings`, `file`, rozpakowuje, odpala Ghidrę.  
2) **Doświadczony reverse engineer:** statyka + dynamika, patching, własne skrypty, instrumentacja.  
3) **Ktoś z dostępem do hosta (czasem nawet root):** może czytać pliki, debugować proces, robić dump pamięci, manipulować środowiskiem uruchomienia.

Konsekwencja: wobec **zdeterminowanego** RE z rootem nie ma „poufności absolutnej”. Naszym celem jest, by „łatwe metody” przestały działać, a reszta wymagała kosztownej analizy.

### 0.2 Definition of Done (DoD) — mierzalne
System uznajemy za spełniający wymagania, jeśli:

**Artefakty / statyka**
- Release nie zawiera wrażliwych artefaktów developerskich (np. `.map`, `src/**`, `.ts`, `.git/**`) — wg polityki projektu.
- Dla ELF (tam gdzie dotyczy): release nie zawiera `.debug_*`; symbolika jest kontrolowana (brak `.symtab` w release, tylko `.dynsym` jeśli potrzebna).
- `strings -a` nie ujawnia: ścieżek repo/build, nazw krytycznych modułów/algo, endpointów/protokołu/formatów, „sekretnych” stałych.

**Anti‑casual extraction**
- W trybach „sealed” (SEA/bundle/thin) nie da się odzyskać kodu przez proste rozpakowanie standardową heurystyką (`gunzip`, `zstd -d`, „binwalk → extract”).  
- Wydobycie bundla wymaga analizy loadera/formatu albo debugowania (czyli faktycznego RE).

**Stabilność**
- Aplikacja startuje deterministycznie na wspieranych systemach i przechodzi testy regresji (unit/integration + smoke).

**Koszty (ustal progi)**
- Rozmiar/wydajność w granicach X% (dla presetów P1/P2); build time w granicach Y%.

### 0.3 Non‑goals (jawnie)
- Nie obiecujemy „anty‑root”. Root może patchować, dumpować pamięć i podmieniać zależności.  
- Nie obiecujemy „anti‑debug nie do złamania”.  
- Nie robimy egzotycznych mechanizmów typu Secure Boot / IMA / dm‑verity jako MUST (mogą być dodatkiem).  
- Nie trzymamy sekretów w kliencie i nie udajemy, że obfuskacja robi z tego kryptografię.

### 0.4 Mapowanie na scenariusze (kiedy który poziom ma sens)
- **S1 (serwer, przeciwnik bez roota):** największą różnicę robi hardening OS/usługi (systemd, separacja kont, brak debug artefaktów, polityka logów).  
- **S2 (dystrybucja do klienta / hostile host):** zakładaj, że artefakt będzie analizowany offline → `thin-split(high)` + mocna polityka „no leaks” + (opcjonalnie) THIN Poziom B/C.  
- **S3 (najbardziej wrażliwy algorytm / core IP):** jeśli to możliwe architektonicznie, rozważ wyniesienie krytycznej logiki do osobnej usługi (lub innego trust boundary). Obfuskacja nie zastąpi kontroli dostępu.

---

## 1. Warstwy ochrony w SEAL — gdzie co działa

W SEAL mamy trzy „poziomy” materiału do ochrony:

1) **Kod JS bundla backendu** (esbuild → `bundle.cjs` → obfuscator → `bundle.obf.cjs`).  
2) **Artefakt dystrybucyjny** (packager: `thin-*` / `sea` / `bundle`).  
3) **Native komponenty** (w `thin` generowany launcher w C; `sea` używa binarki Node z blobem; `bundle` uruchamia systemowego `node`).

Każdy poziom ma inne techniki i inne koszty.

---

## 2. Warstwa „źródła / generacja” — najtańsze, a często kluczowe

Ta warstwa usuwa „wycieki” zanim trafią do bundla/binarki.

### 2.1 Polityka logów i komunikatów (MUST)
**Zasada:** w buildach release nie emitujemy logów, które są mapą logiki.

- Debug i verbose logi: tylko w buildach **internal/dev**.
- Release: logi operacyjne mają być „neutralne”: bez nazw stanów, bez nazw algorytmów, bez formatów protokołu, bez ścieżek.

Praktyka:
- Poziomy `debug/info/warn/error` + kontrola przez config.
- Wrażliwe szczegóły loguj wyłącznie w trybie diagnostycznym na zaufanych hostach.

### 2.2 „Nie trzymamy sekretów w binarce / bundlu” (MUST)
Jeżeli coś **musi** pozostać tajne (klucz, token, algorytm o wartości IP), to:
- nie może zależeć od tego, że użytkownik nie zreverse’uje artefaktu,
- powinno być rozwiązane architekturą (serwer/KMS, kontrola dostępu, rotacja).

Obfuskacja stringów to tylko tarcie, nie kryptografia.

### 2.3 Kontrola wrażliwych stringów (MUST)
Checklista: endpointy, nazwy kolejek/tematów, nazwy algorytmów, formaty protokołu, stałe „magiczne”, nazwy plików konfig.

Techniki bez dodatkowych narzędzi:
- **Przenieś** wrażliwe nazwy do configu na serwerze (dane, nie kod).  
- **Generuj** część stringów w runtime (sklejanie / dekodowanie) tylko tam, gdzie realnie zwiększa to koszt `strings`.

### 2.4 Sanitizacja ścieżek i fingerprintów buildu (MUST tam gdzie dotyczy)
Dla natywnych modułów:
- `-ffile-prefix-map=…`
- `-fdebug-prefix-map=…`
- `-fmacro-prefix-map=…`

Dla JS bundla:
- nie generuj source map (`sourcemap=false`),
- unikaj embedowania pełnych ścieżek w błędach/logach,
- rozważ budowanie z kontrolowanym `absWorkingDir`/`cwd`, aby tooling nie wrzucał absolutów.

---

## 3. Packagery SEAL: co daje „sealed”, a co jest tylko wygodą

### 3.1 `packager=none`
Najmniej ochrony: bundle (nawet obfuskowany) jest plikiem czytelnym lub łatwo odczytywalnym.

Używaj tylko do dev/test lub gdy IP nie jest wrażliwe.

### 3.2 `packager=bundle`
- Uruchamia systemowego `node` + dostarcza obfuskowany bundle.
- Ochrona domyślna (post‑pack): `app.bundle.cjs` zastąpione przez `app.bundle.cjs.gz` + loader, aby na dysku nie leżał plain‑text JS.

To jest **anti‑peek** (utrudnia przypadkowe „otwarcie pliku”), ale `gunzip` nadal jest trywialne.  
Jeśli celem jest anti‑casual extraction, dodaj **maskowanie** (patrz §6.3.A).

### 3.3 `packager=sea`
- Single executable (Node SEA).  
- Ochrona domyślna: „SEA main packing” — main script jest spakowany (Brotli/Gzip loader), żeby w blobie nie było plain‑text JS.

To usuwa „łatwe podejrzenie”, ale nadal nie jest to kryptografia.

### 3.4 `packager=thin-split`
Dedykowany mechanizm **anti‑casual extraction**: runtime Node i payload są pakowane do kontenera (chunking + kompresja + maskowanie) i odtwarzane w runtime przez launcher.

To jest obecnie najmocniejsza warstwa ochrony kodu w SEAL, bo:
- payload nie leży w czytelnym pliku JS,
- proste `zstd -d`/`binwalk` nie dają gotowego kodu,
- launcher dba o „bezpieczniki” runtime (ENV, core dumpy, memfd).

---

## 4. Hardening ELF (launcher i inne binarki) — baseline, który ma sens

Ta sekcja jest ogólna (dla ELF na Ubuntu) i ma zastosowanie do launchera `thin`, ale też do Twoich natywnych binarek.

### 4.1 Minimalny baseline hardening (MUST, o ile nie ma przeciwwskazań)
- PIE: `-fPIE` + `-pie`
- RELRO + NOW: `-Wl,-z,relro -Wl,-z,now`
- Stack protector: `-fstack-protector-strong`
- FORTIFY (glibc): `-D_FORTIFY_SOURCE=2` (sensowne przy `-O2+`)
- NX stack: `-Wl,-z,noexecstack`

### 4.2 Anti‑RE „tanie” w ELF (MAY)
- optymalizacja + „mielenie”: `-O2/-O3` + `-flto`
- (opcjonalnie) `-Ofast` — bardzo agresywnie; może zmieniać semantykę obliczeń zmiennoprzecinkowych, używaj tylko świadomie.
- redukcja „szumu”: `-ffunction-sections -fdata-sections` + `-Wl,--gc-sections`
- ukrywanie symboli: `-fvisibility=hidden` (+ `-fvisibility-inlines-hidden` dla C++)
- redukcja metadanych:
  - `-fno-ident`
  - `-Wl,--build-id=none` (jeśli nie korzystasz z build-id)

### 4.3 Interpozycja / `LD_PRELOAD` — świadoma decyzja (MAY)
Opcje zależne od kompatybilności:
- `-fno-semantic-interposition` (GCC/Clang)  
- dla `.so`: `-Wl,-Bsymbolic-functions` (mocniej: `-Bsymbolic`)

To utrudnia hooking/interpozycję, ale może psuć plug‑iny i nietypowe integracje.

### 4.4 Kontrola eksportów w `.so` (MUST dla bibliotek)
- version script: `-Wl,--version-script=exports.map`
- ukrycie symboli ze statycznych `.a`: `-Wl,--exclude-libs,ALL` (lub selektywnie)

### 4.5 C++: RTTI i wyjątki (MAY, tylko gdy projekt to wspiera)
To jest „młotek” — potrafi zmniejszyć metadane typów i ścieżki EH, ale zmienia możliwości języka.

- `-fno-rtti`  
- `-fno-exceptions`

Uwaga operacyjna:
- mieszanie obiektów kompilowanych z RTTI i bez RTTI potrafi powodować problemy linkowania i subtelne bugi,
- w projektach z wyjątkami wyłączanie unwind tables bywa niekompatybilne.

### 4.6 Widoczność symboli jako polityka API (SHOULD)
Samo `-fvisibility=hidden` jest najskuteczniejsze, gdy jest wsparte polityką API:
- wprowadź makra `API_EXPORT` / `API_IMPORT` / `API_LOCAL` i stosuj konsekwentnie,
- uważaj na typy/wyjątki przechodzące przez granice DSO (często muszą mieć `default` visibility).

---

## 5. Warstwa post‑build (ELF): symbole, strip, debug store, QA

### 5.1 Rekomendowany workflow (MUST jeśli publikujesz ELF)
- Build z `-g` (debug info) tylko na potrzeby diagnostyki.
- Wyciągnij debug info:
  - `objcopy --only-keep-debug mybin mybin.debug`
- Zstripuj release:
  - `strip --strip-all mybin` (lub `llvm-strip`)
- (Opcjonalnie) debuglink:
  - `objcopy --add-gnu-debuglink=mybin.debug mybin`

### 5.2 Narzędzia i warianty (FOSS)
- `strip`, `objcopy`, `readelf`, `nm` (binutils)
- `llvm-strip` (LLVM)
- `eu-strip` (elfutils)
- `sstrip` (elfkickers) — bardzo agresywne, tylko jeśli akceptujesz ryzyko

### 5.3 Artefakty CI (MUST)
Pipeline powinien produkować i archiwizować:
- `mybin` (release, stripped)
- `mybin.debug` (prywatnie, symbol store)
- raport QA (tekst/JSON): wyniki `readelf`, `nm`, `strings` + checksumy

### 5.4 QA po buildzie (MUST w CI)
- `readelf -S` → brak `.debug_*`, polityka dla `.comment`/`.note.*`
- `readelf -Ws` / `nm` → kontrola ekspozycji symboli
- `strings -a` → brak słów‑kluczy / ścieżek / endpointów

---

## 6. Packager THIN — ochrona, co już jest, i co można dodać (zwłaszcza na etapie generacji)

### 6.1 Co THIN robi już teraz (Poziom A / MVP)
W obecnej implementacji THIN (`thin-split`) typowo mamy:

- **Kontener**: chunking + `zstd` + maskowanie bajtów per‑deployment (parametry kodeka losowe per build/target).  
- **Launcher w C** budowany na maszynie build:
  - hardening baseline (PIE/RELRO/NOW/SSP/FORTIFY/NX),
  - czyszczenie/ograniczenie ENV (blokady m.in. `LD_PRELOAD`, `LD_LIBRARY_PATH`, `NODE_OPTIONS` itd.),
  - wyłączenie core dumpów i ustawienie procesu jako niedumpowalny,
  - `memfd_create` (jeśli dostępne) + seale na memfd,
  - zamykanie zbędnych deskryptorów FD,
  - uruchomienie Node przez `fexecve` (runtime odtworzony z kontenera).

To daje solidny „anti‑casual extraction”: nie ma prostego pliku JS do przeczytania.

#### 6.1.1 Minimalizacja czasu plaintextu JS w pamięci (best‑effort)
Założenie: w `thin-split` plaintext JS **musi** pojawić się w pamięci na moment kompilacji przez Node. Staramy się, aby to okno było jak najkrótsze:

- Bundle jest czytany z **memfd** do `Buffer`, po czym FD jest natychmiast zamykany.
- `Buffer` jest zamieniany na string JS, a następnie **zerowany** (`fill(0)`) i dereferencjonowany.
- Po `Module._compile(...)` string z kodem jest zerowany logicznie (`code = null`).
- Bootstrap wyłącza mapy źródeł i skraca ślady (`process.setSourceMapsEnabled(false)`, `Error.stackTraceLimit = 0`), żeby ograniczyć utrwalanie plaintextu w trace/debug.
- Launcher uruchamia Node z `--expose-gc`, a bootstrap wykonuje `global.gc()` (best‑effort), żeby szybciej zwolnić pamięć z plaintextem.

Uwaga: to **nie jest gwarancja** braku plaintextu w pamięci (GC/JIT/cache/OS mogą go utrzymać). To tylko maksymalne skrócenie „okna” ekspozycji w typowym runtime.

### 6.2 Poziomy utrudnienia dla THIN (plan)
- **Poziom A (MVP):** fixed codec + losowe parametry per deployment (bez codegen, bez dict, bez noise).  
- **Poziom B:** polimorfizm (codegen dekodera/enkodera per deployment).  
- **Poziom C:** dict + padding + dummy/noise chunks + agresywniejsze ukrywanie metadanych.

### 6.3 Co można wzmocnić bez instalowania nowych narzędzi (najbardziej opłacalne)
Poniższe punkty zakładają zmiany w SEAL (generator), bez nowych zewnętrznych tooli.

**A) Ujednolicenie strategii: „nie wyglądaj jak standardowa kompresja” (MUST dla sealed)**
- Dla `bundle` i `sea`: dodaj opcjonalne maskowanie spakowanych danych (analogicznie do thin), żeby `file/binwalk/gunzip` nie dawały prostej ścieżki.  
  Cel: usunąć „najłatwiejszy wektor”.

**B) Polityka śladów w launcherze (MAY)**
- W kompilacji launchera dodaj:
  - `-fno-ident`
  - (opcjonalnie) `-Wl,--build-id=none`
- Rozważ (launcher C): `-fno-asynchronous-unwind-tables -fno-unwind-tables` jako opcję „anti‑trace”  
  Uwaga: koszt diagnostyki.

**C) Twardsza strategia ENV (MUST)**
- Docelowo: allowlista ENV jako standard, denylista jako fallback (gdy `clearenv()` nie działa).
- Zawsze blokuj `NODE_OPTIONS` i `LD_*` (to są najtańsze i najczęściej wykorzystywane wektory).

**D) `umask(077)` (MAY)**
Jeśli proces tworzy pliki tymczasowe (np. fallback bez memfd), ustaw `umask(077)`, żeby nie powstawały pliki world-readable.

**E) Anty‑korupcja kontenera (MUST)**
- CRC/hashe chunków + nagłówka/stopki, żeby:
  - przypadkowe uszkodzenia były wykrywane deterministycznie,
  - „ręczne dłubanie” w formacie nie dawało prostego sukcesu.

**F) Layout BOOTSTRAP mniej przewidywalny (MAY)**
- Nazwy plików/katalogów runtime/payload mogą być mniej „oczywiste” niż `rt/pl`.
  To nie jest kryptografia, ale redukuje heurystyczne skrypty.

### 6.4 Co brakuje względem pełniejszej specyfikacji THIN (B/C)
**Poziom B (polimorfizm) — do dodania**
- Codegen dekodera/enkodera per deployment:
  - inna kolejność operacji,
  - inne stałe,
  - warianty semantycznie równoważne,
  - utrudnienie budowy jednego uniwersalnego extractor’a.

**Poziom C (dict/padding/noise) — do dodania**
- Dictionary (per deployment) i/lub pseudo‑random padding w chunkach.
- Dummy/noise chunks, które mylą ekstrakcję.
- Rozproszenie metadanych (indeks/stopka) i wielostopniowe maskowanie.

---

## 7. Warstwa runtime / OS — co można zrobić „bez szkody dla systemu”

Rozróżnienie: (A) per‑service i mało inwazyjne, (B) globalne.

### 7.1 systemd: baseline (MUST)
Minimalne, zwykle bezpieczne:
- `UnsetEnvironment=NODE_OPTIONS` oraz `Environment=NODE_OPTIONS=`
- `NoNewPrivileges=true`
- `PrivateTmp=true`
- `ProtectHome=true`
- `LimitCORE=0`
- sensowne `WorkingDirectory`

Dodatkowo: w CI/ops używaj `systemd-analyze security <service>` jako metryki hardeningu.

### 7.2 systemd: „strict” (MAY, per projekt)
- `ProtectSystem=strict` + `ReadWritePaths=...`
- `RestrictNamespaces=yes`
- `LockPersonality=yes`
- `MemoryDenyWriteExecute=yes` (testuj z V8)
- `CapabilityBoundingSet=` (puste, jeśli nie potrzeba capów)
- `RestrictAddressFamilies=` (zależnie od sieci)

### 7.3 Globalne ustawienia (MAY) — „może szkodzić systemowi”
- Yama `ptrace_scope` (sysctl) — ogranicza ptrace w systemie; dobre na serwerach, ale może przeszkadzać w debugowaniu innych usług.
- AppArmor/SELinux — mocne, ale wymaga polityk i utrzymania.

---

## 8. Poziomy ochrony (presety) — plan wdrożenia i zależności

Poniżej presety praktyczne. Klucz: wskazujemy, co da się zrobić **bez dodatkowych narzędzi** (poza tym, co i tak jest potrzebne do SEAL/THIN), a co jest opcjonalnym dopalaczem.

### 8.1 P0 — Dev / debug (czytelność > tarcie)
- packager: `none` lub `bundle`
- obfuscationProfile: `minimal`
- brak dodatkowego maskowania
- systemd: minimal lub brak (dev)

### 8.2 P1 — Standard release (domyślny, bez nowych tooli)
- packager: `thin-split` (`low`) lub `sea` + `seaMain.pack`
- obfuscationProfile: `balanced`
- frontend obfuscation + minify: włączone
- systemd baseline: włączony
- QA w CI: polityka plików + `strings` + smoke tests

### 8.3 P2 — Hardened release (bez nowych tooli, większe tarcie)
- packager: `thin-split` (`high`) dla dystrybucji
- generator:
  - maskowanie także dla `bundle`/`sea` (żeby nie było prostego `gunzip`)
  - sanitizacja metadanych launchera (`-fno-ident`, opcjonalnie `--build-id=none`)
- polityka „no leaks”: brak `.map`, brak `src/**`, brak verbose logów
- systemd: `baseline` + wybrane elementy `strict` (po testach)
- CI gate: twarde reguły (fail build gdy wykryto forbidden globs / słowa‑klucze)

### 8.4 P3 — Advanced / R&D (wymaga dodatkowych narzędzi lub dużych zmian)
- THIN Poziom B/C: polimorfizm + dict/noise
- (Opcjonalnie) UPX / strip / eu-strip / sstrip — tylko gdy przetestowane na danym packagerze (SEA bywa wrażliwy na post‑processing)
- (Opcjonalnie) obfuskacja LLVM IR dla krytycznych natywnych modułów (zamrożony toolchain + testy)

---

## 9. Kolejne opcje zabezpieczeń — backlog (od „bez tooli” do „z toolami”)

### 9.1 Bez instalacji dodatkowych narzędzi (zmiany w SEAL / build config)
**Generator / build**
1) Utrzymuj i testuj DoD jako „kontrakt”: brak forbidden globs, brak sourcemapów, brak wycieków w `strings`.  
2) Dodaj „strict” / „max” profil obfuskacji JS:
   - mocniejsze transformacje struktury (DeadCode + agresywne manglowanie nazw) + inline przez Terser,
   - CFF jest wyłączone (potrafi psuć semantykę `let` w pętlach, wykryte w E2E),
   - (opcjonalnie) ukrywanie wrażliwych stringów tylko tam, gdzie nie psuje kontraktów.
3) Backend Terser (minify + inline) przed obfuskacją: `build.backendTerser` (domyślnie włączony dla wszystkich profili; `minimal`/`balanced` mają bezpieczne ustawienia, `strict`/`max` mocniejsze; dla `max` rekomendowane `passes=4`, `toplevel=true`).  
   Uwaga: `max` podnosi ryzyko regresji runtime i utrudnia diagnostykę — stosuj po testach E2E.  
   E2E: `SEAL_PROTECTION_E2E=1 node tools/seal/seal/scripts/test-protection-e2e.js` (zawiera check `max`).  
   Dodatkowo: `SEAL_OBFUSCATION_E2E=1 node tools/seal/seal/scripts/test-obfuscation-e2e.js` (sprawdza logikę JS pod `strict`/`max`, endpoint `/api/obf/checks`).  
4) Minifikacja bundla (esbuild) — domyślnie włączona; wyłączenie: `build.backendMinify=false`.  
5) Bundle/SEA: maskowanie payloadów (anti‑casual extraction; spójność z thin).  
6) THIN: dopracowanie Poziomu A do „twardego standardu” (regresje + kompatybilność).  
7) systemd: utrzymuj dwa presety (`baseline`, `strict`) + metryka `systemd-analyze security`.

**Launcher / runtime**
7) Launcher: `-fno-ident`, opcjonalnie `--build-id=none`, opcjonalnie wyłączenie unwind tables.  
8) Launcher: `umask(077)` i bezpieczne tworzenie plików tymczasowych (jeśli fallback).  
9) Launcher: dodatkowe drobne „tarcie” przeciw analizie (opcjonalnie): sprawdzenie `TracerPid`, wykrycie `LD_PRELOAD` mimo czyszczenia (fail closed).  
   (To nie obroni przed rootem, ale usuwa „najłatwiejsze sztuczki”.)

### 9.2 Wymaga dodatkowych narzędzi (opcjonalne dopalacze)
1) UPX dla wybranych artefaktów (nie domyślnie; testuj kompatybilność).  
2) `eu-strip`/`sstrip` (tylko jeśli kompatybilne i potrzebne).  
3) IR obfuscation (OLLVM / obfuscator-pass / Hikari — uwaga na licencje i wersje LLVM).  
4) Packer/protector typu Kiteshield (wysokie ryzyko operacyjne; traktować jako eksperyment R&D).  
5) Zaawansowane OS‑mechanizmy: AppArmor profile, SELinux, seccomp (często wymaga nowych zależności i utrzymania).

---

## 10. Aneks A — presety flag dla ELF (copy/paste)

> To jest uogólnienie dla projektów natywnych (nie tylko SEAL).  
> W SEAL/THIN launcher już ma hardening baseline; te presety są głównie dla Twoich własnych binarek C/C++/Rust/Go.

### 10.1 Profil R1 (RE friction, stabilny)
```bash
CFLAGS="-O2 -flto -DNDEBUG -ffunction-sections -fdata-sections -fno-ident"
CXXFLAGS="$CFLAGS -fvisibility=hidden -fvisibility-inlines-hidden"
LDFLAGS="-Wl,--gc-sections -Wl,--build-id=none"
```

### 10.2 Profil R2a (RE friction mocniejszy, koszty diagnostyki)
```bash
CFLAGS="-O3 -flto -DNDEBUG -ffunction-sections -fdata-sections -fno-ident -fomit-frame-pointer -fno-asynchronous-unwind-tables -fno-unwind-tables -fno-plt"
CXXFLAGS="$CFLAGS -fvisibility=hidden -fvisibility-inlines-hidden"
LDFLAGS="-Wl,--gc-sections -Wl,--build-id=none"
```
Uwaga: unikaj w C++ z wyjątkami (patrz R2b).

### 10.3 Profil R2b (C++ produkcyjny, wyjątki/EH zostają)
```bash
CFLAGS="-O3 -flto -DNDEBUG -ffunction-sections -fdata-sections -fno-ident -fomit-frame-pointer -fno-plt"
CXXFLAGS="$CFLAGS -fvisibility=hidden -fvisibility-inlines-hidden"
LDFLAGS="-Wl,--gc-sections -Wl,--build-id=none"
```

### 10.4 Profil H1 (hardening bezpieczeństwa, niezależnie od RE)
```bash
CFLAGS="-O2 -DNDEBUG -D_FORTIFY_SOURCE=2 -fstack-protector-strong -fPIE"
CXXFLAGS="$CFLAGS"
LDFLAGS="-pie -Wl,-z,relro -Wl,-z,now -Wl,-z,noexecstack"
```

### 10.5 Profil R3 (Max FOSS: toolchain + IR obfuscation + stripping)
1) Buduj jak R2a/R2b w zamrożonym toolchainie.  
2) Przepuść krytyczne moduły przez obfuskator LLVM (IR).  
3) Zrób `objcopy --only-keep-debug` + `strip` i trzymaj `.debug` prywatnie.  
4) Waliduj QA (readelf/nm/strings + testy runtime).

---

## 11. Aneks B — Go i Rust (minimalne presety release)

### 11.1 Go
- `-trimpath`
- `-ldflags="-s -w"`

### 11.2 Rust (Cargo)
W `Cargo.toml` (profil release):
- `lto = true`
- `codegen-units = 1`
- `strip = true` lub `strip = "symbols"`
- `panic = "abort"` (jeśli możesz)

---

## 12. Aneks C — lista kontrolna „nic nie wycieka”

**Artefakt**
- [ ] brak `.map`, brak `src/**`, brak `.ts`, brak `.git/**`
- [ ] `strings` nie pokazuje ścieżek repo / endpointów / protokołu / nazw algorytmów
- [ ] (ELF) brak `.debug_*` w release, polityka `.comment`/`.note.*`
- [ ] (ELF) kontrola eksportów (`--version-script`, `--exclude-libs`) dla `.so`

**Runtime**
- [ ] systemd baseline: `UnsetEnvironment=NODE_OPTIONS`, `LimitCORE=0`, `NoNewPrivileges=true`, `PrivateTmp=true`
- [ ] brak prostych wektorów wstrzyknięć przez ENV
- [ ] smoke test start/healthz/status

---

## 13. Ryzyka i pułapki (lista kontrolna)
- **Niezgodność ABI / integracji:** visibility, RTTI, wyjątki, interpozycja (`-Bsymbolic*`) mogą rozwalić plug‑iny, DSO, integracje.  
- **Koszt supportu:** im „twardszy” artefakt, tym trudniejsza diagnostyka awarii. Dlatego potrzebujesz symbol store i jasnych presetów.  
- **Stabilność:** obfuskacja IR potrafi ujawnić UB (undefined behavior) i generować edge‑case’y.  
- **Wydajność / build time:** LTO, agresywne obfuskacje i poziomy B/C w thin zwiększają czas buildów i/lub rozmiar.  
- **Reputacja/EDR/AV:** packery i agresywne anti‑debug bywają kojarzone z malware — testuj i rozważ, czy ryzyko operacyjne jest akceptowalne.  
- **Fałszywe poczucie bezpieczeństwa:** obfuskacja ≠ tajność. Sekrety i kontrola dostępu muszą być rozwiązane architekturą.

## 14. Źródła (wybrane, referencyjne)

Poniżej lista źródeł, które warto mieć pod ręką (URL w bloku kodu):
```text
GCC Optimize Options (O-levels, -Ofast, -flto, -ffunction-sections/-fdata-sections):
  https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html

GCC C++ Dialect Options (-fno-rtti, -fvisibility-inlines-hidden, odniesienia do -fvisibility=hidden):
  https://gcc.gnu.org/onlinedocs/gcc-14.1.0/gcc/C_002b_002b-Dialect-Options.html

GCC Code Gen Options (-fno-plt, unwind tables, -fno-ident):
  https://gcc.gnu.org/onlinedocs/gcc-6.4.0/gcc/Code-Gen-Options.html

GNU ld (--build-id=none):
  https://sourceware.org/binutils/docs-2.38/ld.pdf

binutils strip:
  https://www.sourceware.org/binutils/docs/binutils/strip.html

objcopy manpage:
  https://man7.org/linux/man-pages/man1/objcopy.1.html

llvm-strip:
  https://llvm.org/docs/CommandGuide/llvm-strip.html

elfkickers / sstrip:
  https://github.com/BR903/ELFkickers
  https://manpages.debian.org/testing/elfkickers/sstrip.1.en.html

Yama ptrace_scope:
  https://www.kernel.org/doc/Documentation/security/Yama.txt
Ubuntu ptrace/yama note:
  https://wiki.ubuntu.com/Security/Features

Kiteshield (MIT):
  https://github.com/GunshipPenguin/kiteshield

obfuscator-pass (MIT):
  https://github.com/Yuerino/obfuscator-pass

Hikari license (AGPLv3):
  https://github.com/HikariObfuscator/Hikari/wiki/License

Obfuscator-LLVM license note (NCSA/LLVM):
  https://github.com/obfuscator-llvm/obfuscator/wiki/License
```


---

# Appendix C — tracerpid_trakcie_dzialania (verbatim)

# TracerPid — czy trzeba sprawdzać tylko na starcie?

`TracerPid` **może się zmieniać w trakcie działania** procesu.

- Gdy nikt Cię nie śledzi: `TracerPid: 0`.
- Gdy ktoś zrobi **attach** (np. debugger/trace’owanie przez mechanizm `ptrace`): `TracerPid` stanie się PID-em procesu, który Cię śledzi.
- Gdy tracer zrobi **detach** albo zniknie (np. zakończy się), `TracerPid` zwykle wraca do `0`.

## Wniosek praktyczny

- Sprawdzenie **tylko przy starcie** wykryje uruchomienie „pod debuggerem”, ale **nie** wykryje późniejszego *attach*.
- Jeśli chcesz wykrywać *attach* „w locie”, sprawdzaj `TracerPid`:
  - **okresowo** (np. co kilka–kilkanaście sekund), albo
  - w **punktach krytycznych** (tuż przed odszyfrowaniem / załadowaniem wrażliwego kodu, wykonaniem licencji, itp.).

## Uwaga o wątkach

W Linuksie `/proc/<pid>/status` dotyczy konkretnego „taska” (w praktyce: wątku). W typowych przypadkach debugowanie obejmuje cały proces, ale technicznie można śledzić też pojedyncze TID. Jeśli chcesz być bardziej rygorystyczny, możesz sprawdzać również:

- `/proc/self/task/<tid>/status` dla wszystkich wątków.

---

Nota: poprzednio wkleiłem znaczniki typu `turn...` wyglądające jak cytowania — to nie były prawdziwe linki/źródła. Tutaj masz czystą, samowystarczalną wersję odpowiedzi.
