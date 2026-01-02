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

