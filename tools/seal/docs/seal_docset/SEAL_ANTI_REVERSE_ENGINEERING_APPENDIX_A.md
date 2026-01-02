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

