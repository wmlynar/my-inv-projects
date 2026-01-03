# SEAL_ANTI_REVERSE_ENGINEERING — anti‑debug / anti‑reverse (spec + status)

Data: 2025-12-26  
Status: **canonical** (scalone + uaktualnione)

## Spis treści

- 0. Cel i zakres
- 0a. Jak zwiekszac ochrone (warstwy i koszty)
- 1. Źródła scalone (skąd to się wzięło)
- 2. Aktualny stan w SEAL (implementacja)
- 3. Decyzje projektowe (dlaczego)
- 4. Czego jeszcze brakuje (niezaimplementowane)
- 5. Nieaktualne / Legacy (nie usuwać)
- 6. Ryzyka operacyjne
- Appendices (verbatim; osobne pliki)

## 0. Cel i zakres
Ten dokument łączy w **jedno miejsce** wszystkie informacje o:
- utrudnianiu reverse engineeringu (anti‑casual extraction),
- mechanizmach anti‑debug / anti‑instrumentation,
- hardeningu launchera i warstwach ochrony w SEAL,
- ryzykach operacyjnych i brakach w implementacji.

**Cel nadrzedny:** ochrona wlasnosci intelektualnej (logiki/backendu) przez podniesienie progu i eliminacje latwego wydobycia kodu.
**Zalozenie:** ochrona nie jest „anty‑root”. To anti‑casual extraction, nie DRM.

## 0a. Jak zwiekszac ochrone (warstwy i koszty)

Zasada: im wyzsza ochrona, tym wieksze tarcie operacyjne i ryzyko kompatybilnosci. Zaczynaj od warstw o niskim koszcie.

**Baseline (bez nowych narzedzi):**
- Wymus `thin-split`, brak fallbackow; fail-fast zamiast cichego degradowania zabezpieczen.
- Wlacz `build.thin.antiDebug`, `build.thin.snapshotGuard`, `build.thin.integrity`.
- Rozwaz `build.thin.nativeBootstrap.enabled=true` (minimalizacja plaintextu JS w pamieci).
- Frontend: obfuskacja + minify (domyslnie wlaczone).

**Wzmocnienia (wymaga narzedzi / wieksze ryzyko operacyjne):**
- `build.thin.launcherHardening` (+ CET, jesli wspierany), `build.protection.cObfuscator`.
- `build.protection.elfPacker=kiteshield` (opcjonalnie, wysoki koszt utrzymania).
- Sentinel: L2 jako minimum; L4 (external anchor) **dostepny** (usb/file/lease/tpm2).

**Operacyjne / detekcja wycieku:**
- Watermark per-deploy / per-klient (unikalny marker) + decoy/joker (patrz SEAL_DEPLOY_REFERENCE).
- E2E strict + testy ekstrakcji (SEAL_E2E_RUNBOOK + SEAL_E2E_ADVANCED_RUN_SUMMARY).
- Systemd/OS hardening: baseline jest domyslny w nowych projektach; tryb strict tylko z jawnym opt‑in i testami.

## 1. Źródła scalone (skąd to się wzięło)
Ten dokument powstał przez scalenie trzech wcześniejszych specyfikacji:
- model zagrożeń + warstwy ochrony,
- inwentarz narzędzi FOSS,
- notatka o TracerPid w runtime.

**Nic nie zginęło** — pełna treść tych dokumentów jest w osobnych plikach **Appendix (verbatim)**:
- `SEAL_ANTI_REVERSE_ENGINEERING_APPENDIX_A.md`
- `SEAL_ANTI_REVERSE_ENGINEERING_APPENDIX_B.md`
- `SEAL_ANTI_REVERSE_ENGINEERING_APPENDIX_C.md`

## 2. Aktualny stan w SEAL (implementacja)
Poniżej lista tego, co **już jest zaimplementowane** w SEAL (thin‑split):

### 2.0 Status implementacji (skrot)

| Obszar | Status | Uwagi |
| --- | --- | --- |
| Packager `thin-split` (BOOTSTRAP) | implemented | produkcyjny default |
| `thin-single` | legacy | niezalecany |
| Anti-debug (launcher + runtime) | implemented (baseline) | patrz 2.2 |
| Snapshot guard | implemented | patrz 2.3 |
| Sentinel (L1–L4) | implemented | L4: external anchor (usb/file) |
| Integrity (self-hash) | implemented | inline/sidecar |
| Hardening / obfuskacja | partial | zalezne od toolchain |
| ELF packers | optional | kiteshield default; inne opcjonalne |
| Native bootstrap | optional | wlaczane jawnie |

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
- **Blob v1/v2**: v2 dodaje `expires_at` (epoch‑sec). Blob ma 76B lub 84B.
- **C pre‑launch check** + **JS periodic check** (`checkIntervalMs`).
- **L3**: PUID (product‑uuid), **L4**: external anchor (usb/file).
- `level=auto` wybiera L3, gdy `puid` jest dostępny i `rid` stabilny; w przeciwnym razie L2/L1.
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
- `build.thin.antiDebug`: TracerPid, denylist ENV, skan `/proc/self/maps`, ptrace guard, seccomp no‑debug, core‑dump off, loader guard, opcjonalny wymóg CPUID hypervisor bit (VM‑only).
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
- Opcjonalnie: `build.thin.payloadProtection` szyfruje `r/pl` (klucz z TPM lub zewnętrznego sekretu) i może być związany z MAC/IP; bez poprawnego klucza/bind payload nie startuje.

#### 2.12.2 `runtimeStore` — memfd vs tmpfile
- Jak działa: domyślnie runtime i bundle są dekodowane do **memfd**; plik jest „sealowany” (`F_ADD_SEALS`) i uruchamiany przez `fexecve`.
- Chroni przed: zostawieniem artefaktów na dysku i prostym „cat” payloadu.
- Implementacja: `memfd_create` z `MFD_ALLOW_SEALING` + `F_ADD_SEALS`; tryb `tmpfile` jest ustawiany jawnie (`thin.runtimeStore=tmpfile`) i używa `mkstemp` + `unlink` + `umask(077)`.

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
- Implementacja: `build.thin.nativeBootstrap.enabled=true` + `n` w `r/`.
  - `build.thin.nativeBootstrap.mode`: `compile` (domyślnie) lub `string` (legacy, używa `_compile`).
  - `build.thin.nativeBootstrap.wipeSource`: `true` (domyślnie) nadpisuje bufor źródła po native compile; w E2E możesz wyłączyć.
  - Opcjonalnie: `build.protection.nativeBootstrapObfuscator` (obfuscating clang++ + args) dla C++ addonu.
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
- Sentinel: external anchor lease/tpm2, xattr mode, HMAC v2.
- VM/hypervisor heurystyki (DMI/peryferia) — odłożone; mamy tylko opcjonalny wymóg CPUID hypervisor bit.

### 4.1. Plan wdrożenia (propozycja)

1) **Sentinel L4 (lease/tpm2) + HMAC v2**  
   Najpierw rozszerzyć istniejący model sentinel (najmniejszy koszt integracji).

2) **Hypervisor heurystyki (opcjonalne)**  
   DMI/peryferia jako dodatkowa flaga, ale tylko w trybie opt‑in (ryzyko false‑positive).

3) **Hardware breakpoints / single‑step**  
   Implementacja tylko dla x86_64, z testami E2E w trybie strict.

4) **GOT/PLT hooks**  
   Detekcja i soft‑fail (log + exitCodeBlock), bez auto‑repair w MVP.

5) **LSM/AppArmor/IMA**  
   Integracje tylko tam, gdzie host ma jawne polityki; brak = SKIP, bez fail‑fast.

Każdy etap wymaga: testów E2E, jawnego toggle i dokumentacji ryzyk operacyjnych.

## 5. Nieaktualne / Legacy (nie usuwać)
- `thin-single` jako zalecany AIO packager — **legacy**. W repo nie używamy.
- “AIO najpierw, potem BOOTSTRAP” — decyzja odwrócona na rzecz `thin-split`.

## 6. Ryzyka operacyjne
- **EDR/AV**: packery + agresywne anti‑debug mogą powodować false‑positive.
- **Kompatybilność compilerów**: CET i obfuskatory wymagają odpowiednich wersji clang/gcc.
- **Systemd hardening**: poza zakresem tego dokumentu (może być osobnym trackiem).

---

## Appendices (verbatim)

- Appendix A: `SEAL_ANTI_REVERSE_ENGINEERING_APPENDIX_A.md`
- Appendix B: `SEAL_ANTI_REVERSE_ENGINEERING_APPENDIX_B.md`
- Appendix C: `SEAL_ANTI_REVERSE_ENGINEERING_APPENDIX_C.md`
