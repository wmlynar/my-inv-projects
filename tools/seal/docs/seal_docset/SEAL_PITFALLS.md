# SEAL_PITFALLS - Bledy do unikania (v0.5.x)

> Cel: lista realnych bledow, ktore juz naprawilismy. Traktuj ponizsze jako wymagania.
> AI/autor zmian **MUST** dopisywac nowe bledy i wymagania zapobiegawcze do tego pliku.

**TL;DR review:**
1) Bledy/reguly dopisane do `SEAL_PITFALLS.md`.
2) Reguly ogolne dopisane do `SEAL_STANDARD.md`.
3) E2E ma timeouty per‑test/per‑krok.
4) Subprocessy obsluguja `error` i nie wisza.
5) Procesy w testach maja drenaz stdout/stderr.
6) UI testy zamykaja browser/page w `finally`.
7) Generatory C uzywaja helpera C‑escape i sa testowane w obu galeziach flag (np. sentinel ON/OFF).
8) E2E obejmuje scenariusze negatywne i sprzata tmp/procesy deterministycznie (takze przy sudo).
9) Toolchain ma jawnie pinowane standardy/flag (np. `-std=c11`) i log „effective config” dla ENV.
10) Format binarny ma wersje i twardy fail na nieznana wersje.

## Zasady ogólne (cross-cutting)

- Blad: brak walidacji argumentow/parametrow powodowal niejasne bledy runtime.
  - Wymaganie: wszystkie wejscia (CLI/config) maja walidacje typow/zakresow; bledne = fail-fast.

- Blad: komendy shellowe byly skladane przez konkatenacje stringow (sciezki z bialymi znakami, wstrzykniecia).
  - Wymaganie: uzywaj `spawn`/`execFile` z args array i `shell: false`.
  - Wymaganie: gdy shell jest konieczny (ssh/rsync), stosuj `--` i bezpieczne quoting; sanitizuj wszystkie fragmenty pochodzace z configu.

- Blad: `exec()` z domyslnym `maxBuffer` obcinal output lub powodowal bledy przy wiekszych logach.
  - Wymaganie: preferuj `spawn`/`execFile`; jesli uzywasz `exec`, ustaw `maxBuffer` i loguj gdy zostal przekroczony.

- Blad: parsery polegaly na outputach narzedzi zaleznych od locale (np. `df`, `lsblk`) i rozjezdzaly sie na innych systemach.
  - Wymaganie: ustaw `LC_ALL=C` (lub `LANG=C`) dla komend parsowanych tekstowo, albo uzywaj trybu `--json`/`--output`.

- Blad: sciezki zaczynajace sie od `-` byly interpretowane jako opcje (rm/cp/rsync/scp).
  - Wymaganie: zawsze wstaw `--` przed listą sciezek i waliduj, ze sciezka nie jest pusta.

- Blad: JSON5 z BOM/CRLF powodowal bledy parsowania na niektorych systemach.
  - Wymaganie: parser usuwa BOM i akceptuje CRLF (normalizuj `\\r\\n` -> `\\n`).

- Blad: operacje na sciezkach (rm/rsync/copy) podazaly za symlinkami i mogly wyjsc poza root.
  - Wymaganie: przed operacjami destrukcyjnymi sprawdz `realpath` i czy jest w dozwolonym root.
  - Wymaganie: nie podazaj za symlinkami (`lstat` + blokada) i odrzucaj `..` w identyfikatorach.

- Blad: atomic rename failowal (EXDEV), bo tmp byl na innym filesystemie.
  - Wymaganie: tmp dla operacji atomowych tworz w tym samym katalogu/FS co plik docelowy.

- Blad: skrypty z CRLF (`^M`) nie uruchamialy sie na Linux (`/bin/sh^M`).
  - Wymaganie: generowane pliki skryptow zawsze z LF (`\n`), bez CRLF; w razie importu stosuj `dos2unix`.

- Blad: skrypty shellowe nie mialy `set -euo pipefail`, przez co ukrywaly bledy w pipeline.
  - Wymaganie: kazdy skrypt zdalny/produkcyjny zaczyna sie od `set -euo pipefail`.

- Blad: pipeline z `tee` przerywal testy (SIGPIPE) gdy odbiorca zamknal stdout, a `pipefail` traktowal to jako błąd.
  - Wymaganie: przy `tee` obsłuż SIGPIPE (np. `set +o pipefail` dla tej linii lub kontrola `PIPESTATUS`), aby unikac fałszywych porażek.

- Blad: `rm -rf "$DIR"/*` przy pustym `DIR` kasowal `/` (lub inne krytyczne katalogi).
  - Wymaganie: przed destrukcyjnym `rm` wymagaj niepustego `DIR` + `realpath` w dozwolonym root.
  - Wymaganie: stosuj helper typu `safeRmDir(dir, root)` zamiast inline `rm`.

- Blad: `set -e` przerywal skrypt na `grep`/`diff` zwracajacych 1 (brak dopasowania), mimo ze to nie byl błąd.
  - Wymaganie: dla `grep`/`diff` uzywaj jawnego sprawdzania exit code lub `|| true` + test warunku.

- Blad: procesy uruchamiane w trybie automatycznym miały stdin z TTY i wchodzily w tryb interaktywny.
  - Wymaganie: dla nieinteraktywnych komend ustaw `stdio: ["ignore", ...]` lub `input: ""`.

- Blad: narzedzia zewnetrzne (git/ssh/rsync) prosily o haslo/hostkey i testy/deploy wisialy bez wyjscia.
  - Wymaganie: ustaw `GIT_TERMINAL_PROMPT=0`, `GIT_ASKPASS=/bin/false`, `SSH_ASKPASS=/bin/false`.
  - Wymaganie: `ssh/scp/rsync` uruchamiaj z `BatchMode=yes` i timeoutem (`ConnectTimeout`, `ServerAliveInterval`).

- Blad: polecenia z `sudo` w trybie nieinteraktywnym wisialy na promptach hasla.
  - Wymaganie: uzywaj `sudo -n` (fail‑fast bez promptu) i wypisz instrukcje, gdy brak uprawnien.
- Blad: długie testy/deploy wymagały sudo, ale timestamp wygasał w trakcie i proces wisiał.
  - Wymaganie: przy długich runach odświeżaj `sudo -v` w tle albo wymagaj jednorazowej autoryzacji przed startem.

- Blad: `curl`/`wget` bez timeoutow i `--fail` potrafil wisiec lub ignorowac HTTP error.
  - Wymaganie: pobieranie z sieci musi miec timeout (`--connect-timeout`, `--max-time`) i `--fail`/`--show-error`, plus ograniczone retry.

- Blad: `rsync` bez timeoutu potrafil wisiec na zerwanym polaczeniu.
  - Wymaganie: uzywaj `--timeout` w `rsync` (sekundy bez aktywnosci) oraz jawny limit czasu calkowitego.

- Blad: `git` korzystajacy z SSH nie dziedziczyl opcji nieinteraktywnych (BatchMode/known_hosts), co blokowalo CI.
  - Wymaganie: ustaw `GIT_SSH_COMMAND="ssh -o BatchMode=yes -o UserKnownHostsFile=... -o StrictHostKeyChecking=accept-new"` w testach/CI.

- Blad: prompt o zaufanie hosta SSH blokowal deploy (brak wpisu w `known_hosts`).
  - Wymaganie: pre‑seed `known_hosts` lub uzyj jawnego `StrictHostKeyChecking=accept-new` (tylko gdy zaakceptowane); bez tego fail‑fast z instrukcja.

- Blad: reuzycie globalnego `known_hosts` w testach powodowalo flakey wyniki (hostkey mismatch po przebudowie kontenera).
  - Wymaganie: testy/CI uzywaja tymczasowego `UserKnownHostsFile` (per run), aby uniknac kolizji host key.

- Blad: zbyt liberalne uprawnienia na kluczach SSH powodowaly `unprotected private key file` i brak polaczenia.
  - Wymaganie: klucze prywatne `0600`, `authorized_keys`/`known_hosts` `0644`.

- Blad: skrypty uzywaly niecytowanych zmiennych (`$VAR`), co powodowalo word‑splitting i globbing.
  - Wymaganie: kazda zmienna w shellu jest widocznie cytowana (`"$VAR"`), chyba ze jawnie potrzebny jest splitting.

- Blad: instalatory (apt/dpkg) w srodowiskach CI/Docker wisialy na promptach (np. tzdata/locales).
  - Wymaganie: ustaw `DEBIAN_FRONTEND=noninteractive` i `TZ=UTC`, a `apt-get` zawsze z `-y` (bez promptow).
  - Wymaganie: jesli instalacja i tak wymaga inputu, test/skrypt ma fail‑fast z jasnym komunikatem.

- Blad: `apt-get` failowal przez blokady `apt-daily`/`unattended-upgrades`, co powodowało flakey CI.
  - Wymaganie: przed instalacją sprawdź locki i poczekaj/wyłącz `apt-daily` w obrazie testowym.

- Blad: `eval`/`bash -lc "$CMD"` z danymi z configu pozwalal na wstrzykniecia lub bledy quoting.
  - Wymaganie: unikaj `eval`; uzywaj args array lub whitelisty dopuszczalnych tokenow.

- Blad: `xargs` bez `-r` wykonywal polecenie bez argumentow (na pustym input), co psulo logike.
  - Wymaganie: `xargs -0 -r` albo jawna blokada, gdy input jest pusty.

- Blad: wywolania narzedzi krytycznych polegaly na `PATH` uzytkownika (mozliwy PATH‑hijack lub inne wersje binarek).
  - Wymaganie: dla kluczowych binarek w trybie uprzywilejowanym uzywaj `command -v` + whitelisty katalogow albo absolutnych sciezek.
  - Wymaganie: gdy uruchamiasz przez `sudo`, nie polegaj na odziedziczonym `PATH` (ustaw jawny `PATH` albo sprawdz `secure_path`).

- Blad: segmenty sciezki pochodzace z configu mogly byc absolutne i omijaly `path.join`, prowadzac poza root.
  - Wymaganie: odrzucaj segmenty z `path.isAbsolute()` oraz normalizuj `..` przed uzyciem.

- Blad: `~` i sciezki relatywne w komendach `sudo` wskazywaly na niewlasciwe HOME (root), co psulo deploy.
  - Wymaganie: uzywaj sciezek absolutnych; nie polegaj na `~` pod `sudo`. Jawnie ustawiaj `HOME`/`cwd` gdy potrzeba.

- Blad: operacje SSH uruchamiane przez `sudo` tracily `SSH_AUTH_SOCK` i klucze z agenta, co konczylo sie promptem lub bledem.
  - Wymaganie: przy `sudo` zachowuj `SSH_AUTH_SOCK` (`sudo -E`) albo przekazuj `IdentityFile`/`IdentitiesOnly=yes`.
  - Wymaganie: jawnie ustaw `HOME`/`known_hosts` dla procesu `ssh` uruchamianego jako root.

- Blad: skrypty polegaly na `ls`/globbingu (`for f in *`) i psuly sie na spacjach lub pustych katalogach.
  - Wymaganie: nie parsuj `ls`; uzywaj `find -print0` + `xargs -0` lub `glob` z `nullglob`.
  - Wymaganie: wszystkie operacje na plikach w shellu musza byc odporne na spacje i puste katalogi.

- Blad: srodowisko uruchomienia wstrzykiwalo zachowanie (`BASH_ENV`, `ENV`, `CDPATH`) i zmienialo logike skryptu.
  - Wymaganie: przed uruchomieniem skryptow czysc ryzykowne ENV (`BASH_ENV`, `ENV`, `CDPATH`, `GLOBIGNORE`) lub ustaw jawne bezpieczne wartosci.

- Blad: `exists`/`stat` przed zapisem powodowal race (TOCTOU) – plik zmienial sie miedzy check a write.
  - Wymaganie: uzywaj atomowych operacji (`open` z `O_EXCL`, lock, write+rename) i weryfikuj `fstat` po otwarciu.

- Blad: zmiana `umask` w procesie nie byla przywracana, co psulo uprawnienia kolejnych plikow.
  - Wymaganie: zmieniaj `umask` tylko lokalnie (snapshot + restore w `finally`).

- Blad: procesy potomne zostawaly jako sieroty (brak process group/kill), co blokowalo kolejne uruchomienia.
  - Wymaganie: przy exit/signal zabijaj caly process group lub sledz wszystkie PIDy i sprzataj deterministycznie.

- Blad: `unhandledRejection`/`uncaughtException` nie byly logowane i proces znikał bez informacji.
  - Wymaganie: globalne handlery loguja blad i kończą proces z kodem != 0.

- Blad: w shellu uzywano `set -u` bez zabezpieczen dla opcjonalnych zmiennych, co przerywalo skrypt.
  - Wymaganie: dla opcjonalnych zmiennych uzywaj `${VAR:-}` lub `: "${VAR:=default}"`.

- Blad: `read` bez `-r` zjadalo backslashe i psulo dane (np. sciezki).
  - Wymaganie: uzywaj `read -r`.

- Blad: operacje wymagajace uprawnien byly „maskowane” fallbackiem zamiast jawnego zgloszenia potrzeby zgody.
  - Wymaganie: gdy potrzebne sa uprawnienia/sandbox escape, bledy musza byc jawne i wymagac zgody uzytkownika (bez cichych fallbackow).

- Blad: timeouts i pomiary czasu oparte o `Date.now()` byly wrażliwe na zmiany czasu/NTP.
  - Wymaganie: do timeoutów i elapsed używaj zegara monotonicznego (`process.hrtime`/`performance.now`).

- Blad: retry petle nie mialy limitu (wieczne wieszanie przy awarii sieci/SSH).
  - Wymaganie: kazdy retry ma limit prób i limit czasu calkowitego; loguj liczbe prób i powód przerwania.

- Blad: lockfile zostawal po crashu i blokowal kolejne operacje.
  - Wymaganie: lock zawiera PID+timestamp, a kod ma detekcje stale locka i bezpieczne odblokowanie.

- Blad: operacje workspace wykonywaly sie na wielu projektach bez potwierdzenia i jasnego zakresu.
  - Wymaganie: przy >1 projekcie pokaz liste i wymagaj jawnego `--yes/--workspace`.
  - Wymaganie: semantyka bledow (fail-fast vs continue) jest jawna, z opcja `--continue-on-error`.

- Blad: ryzykowne opcje/fallbacki byly wlaczone domyslnie.
  - Wymaganie: ryzykowne opcje OFF domyslnie; wymagaja jawnego wlaczenia i WARN.

- Blad: brak atomowosci zapisu (tmp/rename) powodowal polowiczne pliki po crashu.
  - Wymaganie: zapisy plikow krytycznych zawsze przez tmp + atomic rename.

- Blad: brak idempotencji komend (bootstrap/deploy/clean) powodowal reczne naprawy.
  - Wymaganie: operacje infrastrukturalne musza byc idempotentne (bez efektow ubocznych przy powtorzeniu).

- Blad: brak blokad wspolbieznosci powodowal nadpisywanie build/deploy.
  - Wymaganie: build/deploy/clean uzywa lockfile, z czytelnym komunikatem przy kolizji.

- Blad: operacje destrukcyjne bez trybu podgladu.
  - Wymaganie: akcje czyszczace/usuwajace maja `--dry-run`.

- Blad: brak sprzatania po SIGINT/SIGTERM.
  - Wymaganie: przerwania sprzataja procesy i pliki tymczasowe.

- Blad: walidacja uprawnien opierala sie wylacznie na `sudo`, przez co brak `sudo` powodowal falszywy negatyw (np. `serviceUser` = biezacy user).
  - Wymaganie: jesli `serviceUser` == biezacy uzytkownik, sprawdzaj uprawnienia bez `sudo`.
  - Wymaganie: brak `sudo` nie moze maskowac dostepu; fallback do lokalnego `test -x`.
  - Wymaganie: skrypty typu probe/inspect musza dzialac bez `sudo` (zamiast fail, zwracaja wynik + note).

- Blad: parsowanie danych z narzedzi systemowych (np. `lsblk`) nie normalizowalo `mountpoints` (null/array/string), co dawalo puste wpisy i bledne wnioski o mountach.
  - Wymaganie: zawsze normalizuj output narzedzi (trim, filtruj puste, obsluguj array) przed decyzjami.

## Build / packaging

- Blad: SEA bundle fallback uruchomil build bez postject (cichy spadek poziomu zabezpieczen).
  - Wymaganie: brak `postject` to **blad builda**.
- Bundle fallback do pakowania JS jest dozwolony **tylko jawnie** (`build.packagerFallback=true` lub `--packager bundle`).

- Blad: SEA uruchamiany na Node < 20 (brak wsparcia) powodowal build fail lub runtime mismatch.
  - Wymaganie: `seal check`/`release` fail‑fast dla SEA, gdy `node -v` < 20, z jasna instrukcja podniesienia wersji albo uzycia `packager=bundle`.

- Blad: obfuskacja/minifikacja frontendu byla wylaczona.
  - Wymaganie: `build.frontendObfuscation` i `build.frontendMinify` sa **domyslnie wlaczone** dla UI.

- Blad: sourcemapy trafily do release i ułatwiały odtworzenie kodu.
  - Wymaganie: sourcemapy muszą być wyłączone lub trafiać wyłącznie do prywatnych artefaktów debug (nigdy na target); testy E2E sprawdzają brak `.map` w release.

- Blad: minify/obfuskacja psuły kod zależny od nazw (`Function.name`, `class.name`) albo dynamicznego dostępu do pól.
  - Wymaganie: krytyczne ścieżki mają E2E; jeśli kod zależy od nazw/reflect, wyłącz minify/rename lub użyj konfiguracji zachowującej nazwy na granicach API.

- Blad: `elfPacker.tool="upx"` byl wlaczony, ale jego blad byl ignorowany (build przechodzil mimo `CantUnpackException` itp.).
  - Wymaganie: jezeli `elfPacker.tool="upx"` jest wlaczony i sie nie powiedzie, build **musi** sie przerwac z bledem.
  - Wymaganie: `elfPacker.tool="upx"` domyslnie wylaczony dla SEA; wlaczaj tylko po potwierdzeniu `upx -t` na binarce.

- Blad: UPX byl osobna opcja obok `elfPacker`, co tworzylo sprzeczne konfiguracje i dwie sciezki w kodzie.
  - Wymaganie: **jedno zrodlo prawdy** dla packerow (tylko `protection.elfPacker`); duplikaty/konflikty = twardy blad.
  - Wymaganie: template/init, przyklady i dokumentacja uzywaja tylko kanonicznych pol.

- Blad: zmiana schematu `seal.json5` (np. `bundleFallback` -> `packagerFallback`, `stripSymbols/upxPack` -> `strip/elfPacker`) nie byla zaktualizowana we wszystkich projektach, docs i testach.
  - Wymaganie: migracja schematu = aktualizacja **wszystkich** `seal.json5` w repo + init template + docs + testy.
  - Wymaganie: parser musi fail‑fast na nieznanych/starych kluczach z jasnym hintem migracji.
  - Wymaganie: CI/skript sprawdza brak starych kluczy w repo (scan).

- Blad: lista dozwolonych wartosci (packagery, `thin.level`) rozjechala sie miedzy kodem, dokumentacja i komunikatami CLI.
  - Wymaganie: lista dozwolonych wartosci pochodzi z jednego zrodla (konstanta) i jest uzywana w kodzie/CLI/completion.
  - Wymaganie: testy/CI sprawdzaja zgodnosc docs z kodem.
  - Wymaganie: nieznana wartosc (literowka) = fail-fast z sugestia "did you mean".
  - Wymaganie: aliasy/zmiany nazw sa jawne (deprecation warning) i mapowane do kanonicznej wartosci.
  - Wymaganie: w logach/testach uzywaj tylko kanonicznych nazw; aliasy sa dozwolone tylko w parserze wejscia.

- Blad: brak jawnej macierzy kompatybilnosci packager <-> opcje ochrony prowadzil do ad-hoc wylaczen lub cichego ignorowania opcji.
  - Wymaganie: jedna macierz kompatybilnosci (packager/opcja/narzedzie) + normalizacja configu.
  - Wymaganie: brak wsparcia dla pojedynczej opcji nie moze wylaczac calego `protection`; wylaczaj tylko niekompatybilny fragment i loguj ostrzezenie.
  - Wymaganie: loguj "effective config" po normalizacji i uzywaj go w testach/dokumentacji.

- Blad: `nativeBootstrap` byl dostepny dla `sea`/`thin-single`, mimo ze nie ma tam zastosowania.
  - Wymaganie: `nativeBootstrap` jest dozwolony tylko dla `thin-split` (lub jawnie zdefiniowanych packagerow).
  - Wymaganie: w innych trybach ustawienie jest ignorowane z ostrzezeniem albo fail-fast (spojne z macierza kompatybilnosci).

- Blad: rozjazd wykrywania narzedzi i opcji miedzy `check` i `build` (postject/cc/packager).
  - Wymaganie: **jedno zrodlo prawdy** dla wykrywania narzedzi (resolver binarki).
  - Wymaganie: `check` i `build` uzywaja tego samego PATH, targetu i packagera.
  - Wymaganie: release/ship przekazuja opcje preflight (`--check-verbose`, `--check-cc`).

- Blad: `seal check` „wieszal sie” na kompilacji testowej (brak timeoutu i brak outputu).
  - Wymaganie: wszystkie komendy preflight/build maja timeout i widoczny postep.
  - Wymaganie: `seal check --verbose` pokazuje komendy i stdout/stderr narzedzi.
  - Wymaganie: preflight uzywa plikow tymczasowych (nie stdin), zeby narzedzia nie blokowaly sie na wejsciu.
  - Wymaganie: opcja override toolchaina (np. `--cc gcc`) dla srodowisk z wrapperami `cc`.

- Blad: `seal release --skip-check` maskowal braki toolchaina i zwracal niejasne bledy.
  - Wymaganie: `--skip-check` zawsze wypisuje wyrazne ostrzezenie i jest tylko dla zaawansowanych.
  - Wymaganie: jesli brakuje krytycznych narzedzi, build powinien fail‑fast nawet przy `--skip-check` (lub przynajmniej podac konkretne "co dalej").

- Blad: `postject` byl zainstalowany jako modul, ale brakowalo CLI w PATH (check ostrzegal, a build i tak failowal).
  - Wymaganie: `seal check` weryfikuje **CLI** (`node_modules/.bin/postject` lub PATH), nie sam modul.
- Blad: instalatory narzedzi zewnetrznych klonowaly repo bez pinu commita/tagu, co psulo reprodukowalnosc i wprowadzalo nagle zmiany.
  - Wymaganie: pinuj tag/commit, loguj wersje/commit i (gdy to mozliwe) weryfikuj checksumy; zapewnij offline backup/mirror.
  - Wymaganie: brak CLI = twardy blad z instrukcja instalacji.

- Blad: thin build failowal dopiero w trakcie kompilacji launchera (brak `libzstd-dev`), bez jasnej instrukcji instalacji.
  - Wymaganie: `seal check` wykrywa brakujace pakiety (np. `libzstd-dev`) i podaje **konkretne** `apt-get install ...`.
  - Wymaganie: `seal release` (thin) fail‑fast z czytelnym komunikatem, gdy toolchain jest niekompletny.

- Blad: `nativeBootstrap` failowal na starszych kompilatorach (brak C++20) albo bez naglowkow Node, dajac nieczytelne błędy.
  - Wymaganie: preflight sprawdza wsparcie C++20 i obecność naglowkow Node (np. `SEAL_NODE_INCLUDE_DIR`) i fail‑fast z instrukcją instalacji.

- Blad: build byl niedeterministyczny lub wykonany na innej architekturze/OS niz target (AIO zawiera runtime z build machine).
  - Wymaganie: preflight waliduje OS/arch i wersje narzedzi; mismatch = fail-fast.
  - Wymaganie: zapisuj wersje toolchaina i zaleznosci; unikaj auto‑pobieran w buildzie.
  - Wymaganie: release nie moze polegac na toolchainie builda na serwerze.
  - Wymaganie: AIO buduj na tej samej architekturze/OS co target albo uzyj trybu BOOTSTRAP.

- Blad: `esbuild` target byl nowszy niz runtime Node na hoście, co powodowalo błędy składniowe po deployu.
  - Wymaganie: `esbuild` target musi byc <= wersji runtime (lub jawnie wymuszony w configu).
  - Wymaganie: preflight/logi wypisuja target i wykryta wersje Node na hoście (fail‑fast przy mismatch).

- Blad: ID builda oparty tylko o czas powodowal kolizje przy rownoleglych buildach (nazwa release nadpisywana).
  - Wymaganie: ID builda zawiera komponent losowy lub licznik monotoniczny; kolizje = fail‑fast.

- Blad: `thin` dopuszczal niespojne offsety/rozmiary kontenera (latwo o bledy przy uszkodzonych artefaktach).
  - Wymaganie: `index_len == chunk_count * THIN_INDEX_ENTRY_LEN`.
  - Wymaganie: `comp_len > 0` i `raw_len > 0`.
  - Wymaganie: `rt_off + rt_len` i `pl_off + pl_len` w granicach pliku (z kontrola overflow).
  - Wymaganie: brak overlapu runtime/payload (`rt_off + rt_len <= pl_off`).
  - Wymaganie: encoder odrzuca 0-B runtime/payload.

- Blad: generator C dla launchera `thin` wstawial `\n` do stringa bez ucieczki, co psulo kompilacje (`missing terminating " character`).
  - Wymaganie: wszystkie literały string w generowanym C przechodza przez funkcje C‑escape (escapuje `\\`, `"`, `\n`, `\r`, `\t`, `\0`).
  - Wymaganie: nie interpoluj „surowych” stringow do C; uzyj helpera budujacego bezpieczny literal.
  - Wymaganie: testuj generowane C w **obu** konfiguracjach flag (np. sentinel ON/OFF), bo bledy moga byc tylko w jednej galezi.

- Blad: generator C powodowal ostrzezenia/blędy kompilacji przez duplikaty makr lub identyfikatorow (np. `_GNU_SOURCE redefined`, `redefinition of fd`).
  - Wymaganie: makra typu `_GNU_SOURCE` zawsze owijaj w `#ifndef`/`#define` (brak duplikatow).
  - Wymaganie: identyfikatory w kodzie generowanym maja unikalny prefix i nie koliduja miedzy galeziami warunkowymi.
  - Wymaganie: generator C przechodzi compile‑test z `-Werror`, aby ostrzezenia nie przechodzily do produkcji.

- Blad: kod C/C++ generowany lub patchowany mial shadowing nazw (parametry/outer scope), co na niektorych toolchainach z `-Werror` powodowalo fail kompilacji.
  - Wymaganie: zakaz shadowingu w generatorach C/C++; stosuj jednoznaczne nazwy i prefixy.
  - Wymaganie: compile-test C/C++ uruchamiaj z `-Wshadow` (wraz z `-Werror`), aby wykrywac to w CI.

- Blad: native addon byl kompilowany z naglowkami/ABI niezgodnymi z wersja runtime Node (lub uzywal API V8 z nowszej wersji), co dawalo bledy kompilacji lub crash w runtime.
  - Wymaganie: build/test uzywa naglowkow odpowiadajacych wersji runtime Node na target (lub jawnego `--target`); mismatch = fail-fast.
  - Wymaganie: kod native ma guardy wersji/feature-detect dla API V8 i fallback dla starszych wersji Node.

- Blad: native addon wymagajacy nowszego standardu C++ (np. C++20) byl budowany bez wczesnego probe, a blad kompilacji byl nieczytelny.
  - Wymaganie: preflight sprawdza minimalny standard C++ (probe kompilatora) i fail-fast z jasnym komunikatem.
  - Wymaganie: testy E2E dla funkcji opcjonalnych robia SKIP, gdy brak wsparcia C++ (z powodem).

- Blad: narzedzia E2E byly instalowane w wersji "latest", co prowadzilo do driftu i flakey wynikow miedzy lokalnie/CI.
  - Wymaganie: E2E ma lockfile z wersjami narzedzi i jednolity installer korzystajacy z locka (takze w Dockerze).
  - Wymaganie: warianty "minimal/full" korzystaja z tego samego schematu locka, aby uniknac rozjazdow.

- Blad: w generatorach skryptów (template string) pozostawiono `${...}` bez escapowania, co powodowało SyntaxError w Node (interpolacja JS).
  - Wymaganie: w template stringach zawsze escapuj `${` jako `\\${}` w treści skryptu (patrz STD‑047).

- Blad: brak `chmod +x` na generowanych binarkach/skryptach (np. launcher, run-current) powodowal `Permission denied` lub `Exec format error`.
  - Wymaganie: kazdy generowany plik wykonywalny ma jawny `chmod 755` (i jest sprawdzony w testach).

- Blad: launcher AIO probowal fallbackowac do BOOTSTRAP po uszkodzeniu stopki (cichy tryb mieszany).
  - Wymaganie: tryb AIO i BOOTSTRAP sa **jawne**.
  - Wymaganie: launcher AIO **nie** szuka `r/rt`/`r/pl`; brak stopki AIO = blad.
  - Wymaganie: launcher BOOTSTRAP moze czytac `r/rt`/`r/pl`.

- Blad: BOOTSTRAP nie tworzyl struktury `b/a` + `r/rt` + `r/pl`, przez co `appctl run` nie dzialal.
  - Wymaganie: BOOTSTRAP zawsze tworzy `b/a` (launcher) i `r/rt`/`r/pl` (runtime/payload).
  - Wymaganie: w release dodaj wrapper `<app>` uruchamiajacy `b/a` (kompatybilnosc z `appctl`).

- Blad: thin uruchamial bootstrap przez sciezke memfd (`/proc/self/fd/...`) i Node probowal `realpath()`, co konczylo sie `ENOENT`.
  - Wymaganie: bootstrap nie moze byc uruchamiany przez sciezke memfd; uzyj `node -e` z wbudowanym JS albo pliku na dysku.

- Blad: memfd dla runtime/payload dostal fd 3/4 i zostal nadpisany przez `dup2`, co powodowalo `Exec format error`.
  - Wymaganie: memfd-y musza byc przenoszone na fd >= 10 przed `dup2(3/4)`.

- Blad: thin nie wypisywal postepu i nie mial timeoutu na kompresji `zstd`, przez co wygladalo jak zawieszenie (brak diagnozy).
  - Wymaganie: loguj postep (co kilka sekund) podczas kodowania runtime/payload.
  - Wymaganie: kompresja `zstd` musi miec timeout (domyslnie > 0) z jasnym bledem.
  - Wymaganie: timeout musi byc konfigurowalny (`build.thin.zstdTimeoutMs` / `targets.<target>.thin.zstdTimeoutMs` lub `SEAL_THIN_ZSTD_TIMEOUT_MS`).
  - Wymaganie: kompresja nie moze wisiec na `spawnSync` z `stdin` (uzyj streamu i obslugi `error`).
  - Wymaganie: dla dlugich krokow pokazuj progress i komunikaty "co teraz" (np. `Thin: runtime 3/15`).

- Blad: `codec_state` ginal miedzy deployami (brak zgodnosci kodeka).
  - Wymaganie: `codec_state` musi byc zapisywany lokalnie i utrzymany (`seal-out/cache/thin/<target>/codec_state.json`).
  - Wymaganie: `seal-out/` jest ignorowany w VCS.
  - Wymaganie: brak `codec_state` = rebootstrap.

- Blad: kilka roznych katalogow wyjsciowych (`.seal`, `seal-thin`, `seal-out`) powodowalo chaos i stale artefakty.
  - Wymaganie: jeden kanoniczny katalog `seal-out/`, a cache w podfolderach (`seal-out/cache/...`).
  - Wymaganie: narzedzia i docs uzywaja tej samej sciezki; brak „drugich” katalogow.

- Blad: generowane pliki trafialy poza `seal-out/` (np. `seal-config/.private`), co mylilo i brudzilo repo.
  - Wymaganie: wszystkie pliki generowane (cache/private/metadata/runtime) musza byc pod `seal-out/`.
  - Wymaganie: nowe potrzeby storage rozwiazuj przez podfolder `seal-out/cache/...` + migracje danych (bez nowych katalogow w root projektu).

- Blad: cache `seal-out/cache/thin` rosl bez limitu i zapychal dysk.
  - Wymaganie: cache ma limit (np. liczba wpisow/rozmiar/TTL) i auto-pruning.
  - Wymaganie: limit musi byc konfigurowalny (0 = wylacza cache), a pruning logowany.

- Blad: cache/artefakty byly wspoldzielone miedzy targetami/konfiguracjami, co powodowalo uzycie niezgodnych danych.
  - Wymaganie: cache musi byc kluczowany po target+config+wersja/format i czyszczony przy zmianie schematu.

- Blad: payload-only (BOOTSTRAP) nie sprawdzal zgodnosci kodeka z runtime na target.
  - Wymaganie: `release/r/c` musi istniec i byc porownany z `<installDir>/r/c`.
  - Wymaganie: mismatch lub brak `c` = **fallback do pelnego bootstrap**.

- Blad: "szybkie sciezki" (payload-only/fast) pomijaly czesc walidacji lub plikow layoutu, co prowadzilo do niespojnego stanu na target.
  - Wymaganie: fast paths musza miec parytet walidacji i listy plikow z pelnym deployem.
  - Wymaganie: kazda optymalizacja ma test parytetu (full vs fast) dla plikow i walidacji.

- Blad: brak app‑bindingu pozwalal uruchomic runtime/payload z innego projektu na tym samym launcherze.
  - Wymaganie: `thin.appBind` domyslnie wlaczony i weryfikowany w `footer` runtime/payload oraz stopce AIO.
  - Wymaganie: `appBind.value` powinien byc stabilnym ID projektu (nie zaleznym od sciezki), aby uniknac falszywych mismatchy po deployu.

- Blad: `launcherObfuscation` wlaczone bez skonfigurowanego obfuscatora C powodowalo niejasne fail w buildzie.
  - Wymaganie: brak `protection.cObfuscator` = twardy blad z jasnym komunikatem (fail‑fast, bez fallbacku).

- Blad: hardening CET (`-fcf-protection=full`) nie dzialal na starszym clangu (np. O‑LLVM), co wywalalo build.
  - Wymaganie: CET musi miec osobny toggle + pre‑probe kompilatora, a brak wsparcia ma dawac jasny blad z instrukcja wylaczenia lub zmiany toolchaina.

- Blad: narzedzia zewnetrzne (obfuscator/packer) nie wspieraly zadanych flag, ale brakowalo pre‑probe i blad byl nieczytelny.
  - Wymaganie: dla kazdego narzedzia i zestawu flag wykonuj pre‑probe (np. kompilacja/`--help`) i fail‑fast z jasnym komunikatem.

- Blad: obfuscating clang (O‑LLVM) nie widzial systemowych naglowkow (`stddef.h`) i kompilacja launchera failowala.
  - Wymaganie: przy uzyciu obfuscatora C dodaj include paths z toolchaina systemowego (np. `gcc -print-file-name=include`), albo jasno dokumentuj wymagany `--gcc-toolchain`.

- Blad: wersje obfuscatorów C nie pasowały do LLVM/Clanga w systemie, co kończyło się nieczytelnymi błędami kompilacji.
  - Wymaganie: pinuj wersje O‑LLVM/Hikari i loguj `clang --version`; mismatch = fail‑fast z instrukcją instalacji właściwego toolchaina.

- Blad: `thin.integrity` (inline) wlaczony razem z `protection.elfPacker` powodowal brak markera i fail weryfikacji.
  - Wymaganie: `thin.integrity` w trybie `inline` jest niekompatybilny z `protection.elfPacker`; build ma fail‑fast z jasnym komunikatem.
  - Wymaganie: gdy potrzebny `elfPacker`, uzyj `thin.integrity.mode=sidecar`.

- Blad: przy `thin.integrity.mode=sidecar` plik hasha nie byl kopiowany przy payload‑only deploy lub rollback.
  - Wymaganie: `r/<integrity.file>` musi byc kopiowany do release i do instalacji, takze przy payload‑only.
  - Wymaganie: cleanup/rollback usuwa `r/<integrity.file>` gdy brak go w release.

- Blad: deploy/rollback zakladal na sztywno nazwe `ih`, ignorujac `thin.integrity.file`.
  - Wymaganie: nazwa sidecara pochodzi zawsze z configu (fail‑fast przy niedozwolonej nazwie).

- Blad: nowy plik w layout (np. sidecar) nie byl uwzgledniony w deploy/rollback/fast/cleanup, przez co stan na target byl niespojny.
  - Wymaganie: kazdy nowy plik w layout musi byc dodany do wszystkich sciezek deployu, rollbacku i cleanupu oraz pokryty testem.

- Blad: test UI E2E uruchamial AIO z wlaczonym `strip`/`elfPacker`, co jest ignorowane (auto-disabled) i zaciemnia intencje testu.
  - Wymaganie: testy UI używaja `thin-split` (lub jawnie wylaczaja `strip`/`elfPacker` dla AIO) i asercyjnie weryfikują ostrzeżenie/compat.

- Blad: testy uruchamialy AIO z wlaczonym `thin.integrity`, co zawsze failuje (integrity wymaga `thin-split`).
  - Wymaganie: testy dla AIO musza wylaczyc `thin.integrity` albo przejsc na `thin-split`.

- Blad: testy automatycznie wylaczaly funkcje (np. brak obfuscatora/packera), ale brakowalo osobnego testu pokrywajacego te funkcje.
  - Wymaganie: kazda funkcja wylaczana w testach musi miec osobny E2E (gated ENV), ktory wymusza jej wlaczenie i failuje przy braku narzedzia.

- Blad: lokalne testy E2E failowaly, bo `sentinel` byl wlaczony i brakowalo sentinel blob na hoście.
  - Wymaganie: lokalne E2E musza jawnie wylaczac `build.sentinel.enabled` albo instalowac sentinel przed uruchomieniem.

- Blad: `snapshotGuard` uruchomiony domyslnie generowal falszywe blokady (przerwy, resume VM).
  - Wymaganie: `snapshotGuard` jest opt‑in, ma jasne progi (`intervalMs`, `maxJumpMs`, `maxBackMs`) i nie trzyma event‑loop (timer `unref`).
  - Wymaganie: testy wymuszaja trigger tylko przez dedykowane ENV i nie uzywaja tego w produkcji.

- Blad: brak sprawdzania kodow bledu dla `PR_SET_DUMPABLE`/`setrlimit(RLIMIT_CORE)` powodowal “ciche” nieskuteczne zabezpieczenia.
  - Wymaganie: `ptraceGuard`/`coreDump` musza fail‑fast, jesli prctl/setrlimit nie dziala (bez fallbacku).

- Blad: seccomp wlaczony na kernelu bez wsparcia lub bez `no_new_privs` powodowal losowe awarie.
  - Wymaganie: `seccompNoDebug` ma czytelny fail‑fast (brak wsparcia = blad z instrukcja).
  - Wymaganie: testy E2E probuja `seccompNoDebug` w trybie `errno` (nie `kill`), aby mozna bylo asercyjnie sprawdzic blad.

- Blad: brak kontroli loadera pozwalal uruchomic launcher przez alternatywny `ld-linux` i ominac czyszczenie env.
  - Wymaganie: `loaderGuard` sprawdza `PT_INTERP` i obecność loadera w `/proc/self/maps`; mismatch = fail‑fast.

- Blad: metadane kodeka byly zapisywane jako JSON na serwerze.
  - Wymaganie: wszystko co trafia na target powinno byc binarne/obfuskowane (brak czytelnych JSON).
  - Wymaganie: nazwy plikow na target nie powinny zdradzac roli (uzywaj krotszych/nijakich nazw, np. `c` zamiast `codec.bin`).

- Blad: w release brakowalo `public/` lub `data/` (UI/plikowe zasoby nie dzialaly po sealingu).
  - Wymaganie: `build.includeDirs` musi zawierac wszystkie katalogi runtime (np. `public`, `data`).
  - Wymaganie: po `seal release` zawsze uruchom `seal run-local --sealed` i sprawdz UI/zasoby.

- Blad: kod szukal zasobow przez `__dirname`, co po bundlingu wskazywalo zla sciezke.
  - Wymaganie: zasoby runtime lokalizuj wzgledem `process.cwd()` (release dir) i jawnych katalogow (`public/`, `shared/`).

- Blad: runtime zachowywal sie jak w dev (brak `NODE_ENV=production`), co zmienialo logike lub wydajnosc.
  - Wymaganie: w uruchomieniu produkcyjnym ustaw `NODE_ENV=production` i testuj w tej konfiguracji.

## Testy / CI

- Blad: testy E2E potrafily wisiec bez wyjscia (brak timeoutu na krokach/komendach).
  - Wymaganie: **kazdy** test E2E ma timeout (per‑test + per‑krok/subprocess).
  - Wymaganie: brak postepu > timeout = twarde przerwanie z jasnym bledem.
  - Wymaganie: E2E uzywa **szybkich przykladow/fixture** (minimalny projekt), nie pelnych produkcyjnych buildow.
  - Wymaganie: procesy uruchamiane w testach musza miec drenaz stdout/stderr (albo `stdio: inherit`), zeby nie blokowac procesu.
  - Wymaganie: testy nie polegaja na **kruchej** analizie stdout child procesu (ANSI/kolory/pipe). Preferuj JSON output, kody wyjscia, lub wywolania in‑process; zawsze stripuj ANSI.
  - Wymaganie: w testach ustaw `NO_COLOR=1` i `FORCE_COLOR=0`, aby ograniczyc ANSI w outputach narzedzi.
  - Wymaganie: testy UI musza zawsze zamykac browser (`finally`), nawet przy bledzie.
  - Wymaganie: subprocess musi zawsze obslugiwac zdarzenie `error` (i resolve/reject), aby nie zostawiac wiszacej obietnicy.
  - Wymaganie: testy E2E uzywaja losowych portow (bez hardcode `3000`), aby uniknac `EADDRINUSE`.
  - Wymaganie: po testach usuwaj katalogi tymczasowe (np. `/tmp/seal-*`) zeby nie zapychac dysku.
  - Wymaganie: gdy narzedzie nie ma wbudowanego timeoutu, owijaj je zewnetrznym `timeout` (lub wrapperem) i loguj czas.

- Blad: pomocnicze timeouty (np. polling/healthcheck) byly krotsze niz globalny `runTimeoutMs`, co dawalo falszywe FAIL mimo trwajacego startu.
  - Wymaganie: wszystkie timeouty w E2E pochodza z jednego zrodla (run/step timeout) albo maja jawny per-tryb override; brak ukrytych limitow.

- Blad: testy z wieloma trybami/variantami (np. dwa sposoby bootstrapa) sprawdzaly tylko jeden, zostawiajac niepokryte sciezki.
  - Wymaganie: E2E ma macierz trybow dla kazdej funkcji wielomodalnej i loguje aktywny tryb w output.

- Blad: brak prereq check per‑tryb powodowal globalny SKIP lub FAIL calej suite, mimo ze inne testy mogly sie wykonac.
  - Wymaganie: prereq (toolchain/feature) weryfikuj per‑test/per‑tryb; brak = SKIP z powodem, reszta suite dalej dziala.

- Blad: override timeoutow dla jednej funkcji wydluzal cale E2E, nawet gdy funkcja nie byla aktywna.
  - Wymaganie: override timeoutow jest warunkowy i aktywny tylko, gdy dany artefakt/funkcja jest obecna.

- Blad: testy uruchamiane jako root zostawialy root‑owned tmp przy bledzie builda (trudne sprzatanie bez sudo).
  - Wymaganie: E2E uruchamiane jako root tworza tmp na starcie i **zawsze** sprzataja w `finally` (nawet przy fail‑fast).

- Blad: kopiowanie projektu testowego z `node_modules/` powodowalo ogromne kopie i flakey E2E.
  - Wymaganie: fixture/test‑workspace nie kopiuje `node_modules/`; zaleznosci instaluj osobno (`npm ci`/`npm install`).
  - Wymaganie: testy loguja, czy instalacja zaleznosci jest fresh czy reuse.

- Blad: docker E2E instalowal zaleznosci za kazdym uruchomieniem, bo `node_modules` i cache npm nie byly mapowane do trwalego volume, a domyslne sciezki cache roznily sie miedzy skryptami.
  - Wymaganie: docker E2E mapuje trwale volume-y dla `node_modules` i `~/.npm`, a domyslny katalog cache jest spojny we wszystkich entrypointach (skrypty + docker-compose).
  - Wymaganie: cache jest kluczowany po lockfile/konfiguracji i loguje decyzje "fresh vs reuse".
  - Wymaganie: cache root jest jawny (nie zalezy od `HOME` root/user) i logowany na starcie testu.
  - Wymaganie: cache kluczuj dodatkowo po `node` major, `npm` major i `os+arch`, zeby uniknac ABI mismatch w `node_modules`.
  - Wymaganie: cache root musi byc zapisywalny i poza repo; brak zapisu = fail‑fast z instrukcja.

- Blad: wspoldzielony cache E2E nie mial jawnego sposobu resetu i prowadzil do trudnych w debugowaniu falszywych "pass".
  - Wymaganie: skrypty maja flage/ENV do wymuszenia reinstall/flush cache i loguja aktywne ustawienia.

- Blad: rozne entrypointy E2E mialy inne defaulty (cache, parallel), co utrudnialo reprodukcje miedzy lokalnym i dockerowym uruchomieniem.
  - Wymaganie: jeden publiczny entrypoint ustawia wspolne domyslne wartosci i jest jedynym rekomendowanym sposobem uruchomienia; pozostale skrypty sa wewnetrzne.

- Blad: `npm install` w CI modyfikowal lockfile i wprowadzał drift wersji.
  - Wymaganie: w CI/E2E preferuj `npm ci` (deterministyczny), a `npm install` tylko lokalnie.

- Blad: `npm ci/install` wisial przy problemach sieciowych (brak timeoutow lub zbyt dlugie retry).
  - Wymaganie: ustaw `NPM_CONFIG_FETCH_RETRIES`, `NPM_CONFIG_FETCH_TIMEOUT`, `NPM_CONFIG_FETCH_RETRY_MINTIMEOUT` i `NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT` w testach/CI.

- Blad: `npm` uruchamiany jako root w containerze blokowal skrypty postinstall (brak `unsafe-perm`) lub wykonywal je z innymi uprawnieniami.
  - Wymaganie: w kontenerach uruchamiaj `npm` jako nie‑root lub ustaw `NPM_CONFIG_UNSAFE_PERM=true`.

- Blad: `npm` uruchamial audit/fund i siegal do sieci, co w CI powodowalo timeouty lub flakey wyniki.
  - Wymaganie: w CI/E2E ustaw `NPM_CONFIG_AUDIT=false`, `NPM_CONFIG_FUND=false`, `NPM_CONFIG_PROGRESS=false`.

- Blad: narzedzia zachowywaly sie inaczej poza trybem CI (np. interaktywne prompt‑y, spinner), co psulo logi.
  - Wymaganie: w testach/CI ustaw `CI=1` (oraz `FORCE_COLOR=0`) aby wymusic nieinteraktywny tryb narzedzi.

- Blad: `npm` update‑notifier kontaktowal sie z siecia i wieszal CI.
  - Wymaganie: w CI/E2E ustaw `NPM_CONFIG_UPDATE_NOTIFIER=false`.

- Blad: uruchomienie testow przez `sudo` uzywalo innej wersji Node (np. systemowej) niz wymaganej, co konczylo sie `MODULE_NOT_FOUND` lub regresjami.
  - Wymaganie: testy loguja `node -v` + `which node` na starcie i fail‑fast, gdy wersja < wymaganej.
  - Wymaganie: przy `sudo` uzywaj `sudo -E` lub absolutnej sciezki do `node`, aby nie tracic wersji z nvm/asdf.

- Blad: brak informacji o wersji kodu uruchomionego w E2E (commit/dirty) utrudnial odtwarzanie bledow.
  - Wymaganie: testy loguja `git rev-parse HEAD` i `git status --porcelain` (lub "no git"), razem z OS/arch.

- Blad: test uruchomiony z innego CWD nie znajdowal skryptow (relative path), co dawalo `MODULE_NOT_FOUND`.
  - Wymaganie: skrypty E2E wyznaczaja repo root wzgledem `__dirname` i dzialaja niezaleznie od CWD.
  - Wymaganie: dokumentacja komend testowych podaje jawne `cwd` albo absolutna sciezke do skryptu.

- Blad: testy „expect fail” nie drenowaly stdout/stderr child procesu, co moglo blokowac proces i zafalszowac timeout.
  - Wymaganie: drenaż stdout/stderr jest wymagany **we wszystkich** sciezkach testu (takze przy spodziewanej porazce).

- Blad: testy ignorowaly `signal` z `child.on('exit')`, przez co crash SIGKILL/SIGSEGV byl raportowany jako "ok".
  - Wymaganie: testy loguja i failuja na `signal` (i rozrozniaja `code` vs `signal`), aby nie maskowac crashy.

- Blad: testy „expect fail” akceptowaly dowolny błąd (np. brak configu) zamiast tego konkretnego, ktory mial byc wykryty.
  - Wymaganie: negatywne testy musza asercyjnie weryfikowac **konkretny** sygnal (kod wyjscia lub wzorzec stderr); inne bledy = FAIL.

- Blad: testy zalezne od narzedzi (postject/strip/packery) failowaly zamiast graczejnego SKIP, gdy narzedzia nie byly zainstalowane.
  - Wymaganie: testy tool‑dependent sprawdzaja dostepnosc narzedzi i robia SKIP z powodem (chyba ze env wymusza fail).

- Blad: testy `strip`/packer mialy tylko czesciowa weryfikacje, bo brakowalo narzedzi weryfikacyjnych (np. `readelf`, `eu-readelf`, `objdump`, `dwarfdump`, `binwalk`, `file`, `strings`, `zstd`).
  - Wymaganie: na maszynie testowej zainstaluj `binutils` + `elfutils` + `binwalk` + `zstd` + `dwarfdump`; w trybie strict brak narzedzi = FAIL.

- Blad: brak metryk czasu ukrywal najwolniejsze testy i utrudnial planowanie rownoległości.
  - Wymaganie: testy E2E logują czas per‑test/per‑grupa oraz sumaryczny czas, zeby mozna było priorytetyzowac optymalizacje.

- Blad: E2E uruchamiane na nielinuxowych systemach dawaly false‑negative (testy packer/obfuscation są linux‑only).
  - Wymaganie: pelny zestaw E2E uruchamiaj na Linux; inne OS powinny jawnie SKIP z powodem.

- Blad: testy E2E auto‑modyfikowaly konfiguracje (np. wylaczenie ochron/packerow) bez jawnego logu, przez co maskowaly regresje.
  - Wymaganie: kazda automatyczna zmiana configu w testach musi byc logowana i uzasadniona.
  - Wymaganie: wylaczenia musza byc granularne (tylko niekompatybilna opcja), bez globalnego `protection.enabled=false` jako obejscia.

- Blad: testy/skrypty pomijaly kroki (np. instalacje narzedzi, runtime checki) bez jasnej informacji.
  - Wymaganie: kazdy SKIP musi wypisac powód i instrukcje jak wymusic pelny test.

- Blad: brak podsumowania SKIP dawał fałszywe poczucie “all green”.
  - Wymaganie: testy musza wypisać liczbę i listę SKIP oraz mieć tryb strict, który traktuje SKIP jako FAIL w runach certyfikacyjnych.

- Blad: `NODE_OPTIONS`/`NODE_PATH` z srodowiska wstrzykiwaly `--require` lub inne hooki, psujac build/testy.
  - Wymaganie: testy i buildy czyszcza ryzykowne ENV (`NODE_OPTIONS`, `NODE_PATH`, `NODE_EXTRA_CA_CERTS`) albo jawnie ustawiają bezpieczne wartości.

- Blad: testy E2E uruchamialy build z wlaczona obfuskacja C, ale bez zainstalowanego obfuscating clang, co konczylo sie nieczytelnym bledem.
  - Wymaganie: testy wykrywaja brak obfuscatora i **jawnie** wylaczaja launcherObfuscation (lub robia SKIP), z jasnym logiem.

- Blad: testy E2E nie wypisywaly wystarczajacego kontekstu przy porazce (brak stdout/stderr/command/config).
  - Wymaganie: przy failu test wypisuje command line, fragment stdout/stderr (z limitem) i effective config.
  - Wymaganie: gdy test waliduje wiele sub‑checkow, musi podac liste tych, ktore padly (got/expected), nie tylko `ok=false`.

- Blad: testy modyfikowaly `config.runtime.json5` lub inne pliki projektu i nie przywracaly ich (efekt uboczny w repo).
  - Wymaganie: testy pracuja na kopii projektu albo uzywaja `outDirOverride` + temp config w katalogu release.
  - Wymaganie: kazda modyfikacja plikow w repo musi byc przywrocona w `finally`.

- Blad: uruchomienie testow jako root zostawialo root‑owned artefakty w repo (np. `node_modules`, `seal-out`), co psulo prace bez sudo.
  - Wymaganie: testy uruchamiane jako root pracuja na kopii projektu lub w temp‑workspace; nie dotykaja repo.
  - Wymaganie: jesli testy musza operowac na repo, ustaw `umask 022` i wykonuj sprzatanie w `finally`.

- Blad: testy polegaly na `sleep()` zamiast aktywnego wait na gotowosc (`/status`), co bylo flakey.
  - Wymaganie: start procesu = aktywny wait na health/status z retry, nie twardy sleep.
  - Wymaganie: test monitoruje wczesne wyjscie procesu i failuje natychmiast z logiem.

- Blad: testy modyfikowaly zmienne `SEAL_*` i nie przywracaly ich, co psulo kolejne testy.
  - Wymaganie: snapshot i restore `process.env` (albo kluczowych `SEAL_*`) w `finally`.

- Blad: testy zmienialy `process.cwd()` i nie przywracaly go, co psulo kolejne kroki.
  - Wymaganie: snapshot i restore `process.cwd()` w `finally`.

- Blad: testy tworzyly artefakty w katalogu projektu (`seal-out/`) i zostawialy je po porazce.
  - Wymaganie: E2E uzywa `outDirOverride` w temp dir; sprzatanie po tescie jest obowiazkowe.

- Blad: E2E budowaly ciezkie warianty (np. wysoki poziom `thin`) przez co testy byly zbyt wolne.
  - Wymaganie: testy E2E wymuszaja szybkie ustawienia (`thin.level=low` lub mniejsze chunkSize) i minimalne payloady.

- Blad: zabezpieczenia anti‑debug/snapshot nie mialy deterministycznych wyzwalaczy w testach, przez co E2E byly flakey.
  - Wymaganie: kazda funkcja ochronna ma dedykowane, jawne “test hooks” (ENV) do deterministycznego wywolania w E2E.
  - Wymaganie: test hooks sa aktywne tylko w trybie testowym i domyslnie wylaczone w produkcji.

- Blad: testy/skripty zakladaly, ze `/tmp` jest wykonywalny i bezpieczny, ale na niektorych systemach jest `noexec`.
  - Wymaganie: respektuj `TMPDIR` i unikaj uruchamiania binarek z `/tmp` bez sprawdzenia.

- Blad: generowany kod C oraz skrypty helperów miały na sztywno `/tmp`, ignorując `TMPDIR`, co psuło działanie na systemach z restrykcjami lub noexec.
  - Wymaganie: używaj `TMPDIR` (z fallbackiem do `/tmp`) zarówno w generatorach C, jak i w skryptach shellowych.

- Blad: `TMPDIR` był ustawiony na nieistniejącą lub niewritable/nie‑executable ścieżkę i `mktemp` failował w losowych miejscach.
  - Wymaganie: waliduj `TMPDIR` (czy katalog istnieje, jest zapisywalny **i** ma `+x`) oraz fallback do `/tmp` lub fail‑fast z instrukcją.

- Blad: testy E2E uruchamialy operacje systemowe (systemd/`installDir` w realnych sciezkach) i psuly srodowisko.
  - Wymaganie: testy uzywaja sandbox `installDir` w temp i unikalnych nazw uslug.
  - Wymaganie: operacje systemowe sa gated env‑flaga i domyslnie SKIP.

- Blad: testy polegaly na `localhost`, co w niektorych systemach rozwiązywalo sie do IPv6 i powodowalo fail.
  - Wymaganie: testy jawnie binduja do `127.0.0.1` i uzywaja adresu IPv4.

- Blad: testy dockerowe zostawialy kontenery/sieci po porazce i kolejne uruchomienia kolidowaly.
  - Wymaganie: testy dockerowe musza miec `trap`/cleanup i usuwac kontenery/sieci nawet przy error.
  - Wymaganie: opcja `KEEP=1` moze pominac cleanup, ale domyslnie cleanup jest zawsze.

- Blad: `docker build` ukrywal output (domyslny progress UI), co utrudnialo diagnoze w CI.
  - Wymaganie: w trybie CI/logowanie ustaw `--progress=plain` lub `BUILDKIT_PROGRESS=plain`.

- Blad: docker E2E zapisywal klucze/`known_hosts` w repo (np. `tools/.../docker/e2e/ssh`) i montowal je jako `/root/.ssh` (RW), co tworzylo root‑owned pliki i blokowalo cleanup.
  - Wymaganie: klucze przechowuj poza repo (cache/temp) i montuj **read‑only** (np. `/tmp/seal-ssh`), a do `/root/.ssh` kopiuj **wewnatrz kontenera**; `known_hosts` ma byc w temp kontenera, nie w repo.
  - Wymaganie: dla docker‑compose `SEAL_DOCKER_E2E_SSH_DIR` wskazuje katalog poza repo (domyslnie `/tmp/seal-ssh`).
  - Wymaganie: po przypadkowym zapisie w repo wyczysc root‑owned pliki (np. `sudo rm -f tools/seal/seal/docker/e2e/ssh/known_hosts*`).

- Blad: testy dockerowe z systemd/sshd nie startowaly bez `--privileged` i poprawnie zamontowanego cgroup.
  - Wymaganie: testy wymagajace systemd sprawdzaja dostepnosc cgroup (`/sys/fs/cgroup`) i w razie braku robia SKIP z powodem.
  - Wymaganie: dokumentacja testow podaje wymagane flagi (`--privileged`, `--cgroupns=host`).

- Blad: kontenery testowe bez init nie sprzataly zombie procesow, co powodowalo flakey timeouts.
  - Wymaganie: uruchamiaj kontenery testowe z `--init` (tini) lub zapewnij init w obrazie.

- Blad: po dodaniu uzytkownika do grupy `docker` testy nadal failowaly (brak re‑loginu), co dawalo mylące błędy „permission denied”.
  - Wymaganie: po `usermod -aG docker $USER` wymagany jest nowy login/shell; do czasu odswiezenia uzywaj `sudo docker`.

- Blad: testy dockerowe uruchamialy sie na innym Docker context/daemon, co dawalo inne obrazy i cache i mylilo wyniki.
  - Wymaganie: skrypty loguja `docker context show` i `docker info` (server), a uruchomienie moze wskazac jawny context (`DOCKER_CONTEXT=`).
  - Wymaganie: loguj identyfikatory obrazow (`docker image inspect --format '{{.Id}}'`) i wersje obrazu/testu, zeby nie uruchamiac "starych" buildow.

- Blad: rownolegle uruchomienia E2E kolidowaly na wspolnych nazwach uslug/plikach (`current.buildId`, instalacje), co dawalo flakey wyniki.
  - Wymaganie: testy musza byc bezpieczne dla rownoleglego uruchomienia (unikalne nazwy uslug, unikalne installDir, izolowane temp rooty).

- Blad: testy dzielily cache (np. `seal-out/cache`) i wyniki byly zalezne od poprzednich uruchomien.
  - Wymaganie: testy izolują cache (osobny temp project root lub `SEAL_THIN_CACHE_LIMIT=0`).

- Blad: testy zapisywaly do `HOME`/`XDG_*`, zostawiajac smieci w profilu uzytkownika.
  - Wymaganie: ustaw `HOME`/`XDG_*` na temp w testach E2E.

- Blad: cache npm byl współdzielony miedzy testami i powodowal flakey wyniki (stare artefakty).
  - Wymaganie: w testach ustaw `NPM_CONFIG_CACHE` na temp (per run) lub czyść cache deterministycznie.

- Blad: testy uruchamialy komendy, ktore prosily o interaktywny input (git/ssh), przez co CI wisial.
  - Wymaganie: testy maja ustawione `GIT_TERMINAL_PROMPT=0` i nie wywolują interaktywnych narzedzi bez jawnego flag/sekretow.
  - Wymaganie: testy integracyjne/remote sa jawnie gated env‑flaga i bez niej zawsze SKIP.

- Blad: UI E2E wymagaly recznego logowania (np. konto produkcyjne), przez co uruchomienia wisialy.
  - Wymaganie: UI E2E uzywa testowych kont/fixture lub mocka auth; brak kredencjalow = SKIP z instrukcja; brak recznych promptow.

- Blad: testy E2E polegaly na sieci/DNS (npm/git/HTTP) bez jawnego gate, co powodowalo flakey wyniki lub wiszenie przy braku internetu.
  - Wymaganie: testy nie wymagaja sieci domyslnie; operacje sieciowe sa gated env‑flaga i maja timeouty.

- Blad: zmiany w generatorach kodu byly testowane tylko lintem, bez realnego compile/smoke testu.
  - Wymaganie: generator C/JS musi miec automatyczny compile/smoke test (przynajmniej minimalny).
  - Wymaganie: smoke test generatora C uruchamia kompilator z `-Werror`.
  - Wymaganie: standard kompilatora (np. `-std=c11`) jest jawnie ustawiony i spójny na wszystkich maszynach.

- Blad: negatywne scenariusze nie byly objete E2E (symlink, zle prawa, brak pliku), przez co regresje wychodzily dopiero na produkcji.
  - Wymaganie: E2E zawsze zawiera scenariusze negatywne.

- Blad: sprzatanie tmp/procesow bylo „best-effort”, co zostawialo smieci po bledzie.
  - Wymaganie: cleanup jest deterministyczny i sprawdzany w testach (brak tmp/procesow po zakonczonym tescie).

- Blad: testy zalezne od roota/SSH/portow nie sygnalizowaly jawnie, ze zostaly pominiete.
  - Wymaganie: takie testy maja domyslny SKIP i zawsze wypisuja powod.

- Blad: testy uruchamialy skrypty przez `/usr/bin/env bash`, a na minimalnych systemach `bash` nie byl dostepny (`/usr/bin/env: bash: No such file or directory`).
  - Wymaganie: testy i helpery uzywaja POSIX `/bin/sh` lub jawnie sprawdzaja dostepnosc `bash` i oznaczaja SKIP.

- Blad: brak asercji „brak tmp” pozwalal na ukryty wyciek plikow tymczasowych.
  - Wymaganie: po E2E sprawdzaj, czy nie zostaly `/tmp/seal-*` (fail jeśli tak).

- Blad: zachowanie zalezne od ENV bylo niejawne i rozne miedzy maszynami.
  - Wymaganie: ENV ma jawne defaulty, a „effective config” jest logowane.

- Blad: format binarny nie mial wersji, a nieznana wersja powodowala niejasne bledy.
  - Wymaganie: formaty binarne maja wersjonowanie i twardy fail na nieznana wersje.
  - Wymaganie: testy nie zalezne od internetu; zewnetrzne call'e stubuj lokalnie.
  - Wymaganie: jesli srodowisko blokuje `listen` (EPERM), testy powinny sie jawnie oznaczyc jako SKIP **z instrukcja** (np. „uruchom z eskalacja/zezwoleniem”).

### Anti-debug E2E (środowisko testowe)

- Blad: testy anti-debug byly uruchamiane w kontenerze z restrykcyjnym seccomp/AppArmor/Yama, co blokowalo attach i dawalo falszywe “OK”.
  - Wymaganie: uruchom przynajmniej jeden baseline test na procesie **niechronionym** (attach ma sie udac), albo uruchom pelny zestaw w srodowisku permissive (`seccomp=unconfined` / bez AppArmor). Loguj aktywne polityki.

- Blad: brak flag `SEAL_E2E_STRICT_*` powodowal, ze udany attach byl raportowany jako SKIP zamiast FAIL.
  - Wymaganie: dla certyfikacji bezpieczenstwa wlacz `SEAL_E2E_STRICT_PTRACE=1` oraz odpowiadajace flagi (perf/rr/bpftrace/...), aby sukces attach byl traktowany jako regresja.

- Blad: domyślny profil seccomp Dockera blokował `perf_event_open`/`ptrace`, przez co testy dawały fałszywe SKIP/OK.
  - Wymaganie: dla pełnych testów uruchamiaj kontener z `--security-opt seccomp=unconfined` i/lub `--privileged`.

- Blad: brak `debugfs`/`tracefs`/`bpffs` powodowal SKIP dla bpftrace/perf/trace-cmd/lttng.
  - Wymaganie: przy testach strict montuj `/sys/kernel/debug`, `/sys/kernel/tracing`, `/sys/fs/bpf` z hosta (w kontenerze tylko `--privileged`) i weryfikuj mounty przed startem.

- Blad: rootless Docker/WSL ograniczal ptrace/perf/cgroup i uniemożliwiał pełne testy anti-debug.
  - Wymaganie: pelne anti-debug E2E uruchamiaj na bare‑metal/VM z uprzywilejowanym kontenerem; w rootless/WSL ustaw jawny SKIP.

- Blad: `perf`/`trace-cmd`/`rr` nie dzialaly, bo narzedzia nie pasowaly do kernela hosta.
  - Wymaganie: instaluj `linux-tools-$(uname -r)` na hoście testowym (a nie tylko w kontenerze) i loguj `uname -r` + `perf --version`.

- Blad: `systemtap`/`lttng`/`sysdig` zwracaly “not supported / no debuginfo” (brak modulow/headers).
  - Wymaganie: na hoście testowym musza byc kernel headers + debug packages + możliwość ładowania modułów; w kontenerach bez tego traktuj jako SKIP z jasnym powodem.

- Blad: SELinux/lockdown blokowaly `ptrace`/`perf` mimo poprawnej konfiguracji narzędzi.
  - Wymaganie: loguj stan SELinux (`getenforce`) i tryb lockdown; w srodowiskach certyfikacyjnych ustaw permissive lub jawnie akceptuj SKIP.

- Blad: `mlock`/memlock nie dzialal przez niski limit `ulimit -l`, co psulo testy ochron pamięci.
  - Wymaganie: na maszynie testowej ustaw odpowiednio wysoki limit `memlock` (ulimit lub systemd unit).

- Blad: `auditctl`/`auditd` nie byly dostępne lub brakowalo CAP_AUDIT_CONTROL, przez co testy mogly byc puste.
  - Wymaganie: na maszynie testowej zainstaluj i uruchom `auditd` oraz loguj, czy `auditctl` dziala; w kontenerze bez capów oznacz SKIP.

- Blad: `sysdig` nie dzialal bez zainstalowanego drivera (kernel module / eBPF), co mylnie wygladalo jak “blocked”.
  - Wymaganie: upewnij sie, ze sysdig ma aktywny driver (np. `sysdig-probe` lub eBPF) i loguj tryb pracy; inaczej SKIP z powodem.

- Blad: `bpftrace` nie dzialal (brak BTF / eBPF) i testy zwracaly “unsupported”.
  - Wymaganie: kernel musi miec BTF (`/sys/kernel/btf/vmlinux`) i eBPF; loguj `kernel.unprivileged_bpf_disabled` i wersje kernela.

- Blad: brak wsparcia kernelowego dla memfd seals/MADV_* powodował nieoczekiwane SKIP.
  - Wymaganie: w środowisku certyfikacyjnym używaj kernela z wymaganymi funkcjami i loguj wersję (minimum 5.x).

- Blad: `rr` nie dzialal przez restrykcyjny `perf_event_paranoid` i brak uprawnień.
  - Wymaganie: na maszynie testowej ustaw `kernel.perf_event_paranoid` odpowiednio nisko lub uruchamiaj testy jako root i loguj wartość sysctl.

- Blad: zbyt permisyjny `kernel.yama.ptrace_scope=0` powodowal, ze attach mogl sie udac i test konczyl sie SKIP zamiast FAIL.
  - Wymaganie: w srodowisku certyfikacyjnym ustaw `kernel.yama.ptrace_scope>=1` i wlacz `SEAL_E2E_STRICT_PTRACE=1` (attach success = FAIL).

- Blad: `dmesg` byl zablokowany (`kernel.dmesg_restrict=1` lub brak CAP_SYSLOG) i skan logow byl zawsze SKIP.
  - Wymaganie: na maszynie testowej odblokuj `dmesg` (sysctl lub cap) albo traktuj SKIP jako brak weryfikacji.

- Blad: snapshot‑guard oparty o cgroup v2 byl zawsze SKIP, bo cgroup v2 nie byl dostepny lub niewritable w kontenerze.
  - Wymaganie: uruchamiaj testy na hoście z cgroup v2 i montuj `/sys/fs/cgroup` jako RW; loguj, czy `cgroup.freeze` jest dostępny.

- Blad: narzedzia DynamoRIO/Pin byly zainstalowane, ale brakowalo konfiguracji klienta.
  - Wymaganie: ustaw `SEAL_E2E_DRRUN_TOOL` (dla `drrun`) oraz `SEAL_E2E_PIN_TOOL`/`SEAL_E2E_PIN_CMD` (dla Pin); bez tego testy sa SKIP.

- Blad: brak `/dev/disk/by-uuid` w kontenerze powodowal SKIP dla sentinel level=2 (RID).
  - Wymaganie: bind‑mount `/dev/disk` z hosta lub uruchamiaj test na VM/bare‑metal; loguj źródło root device (overlay vs real disk).

- Blad: kontener bez odpowiednich capabilities (np. CAP_SYS_ADMIN / CAP_SYS_PTRACE) blokowal narzedzia attach i zaciemnial wniosek.
  - Wymaganie: dla testów strict uruchamiaj z `--privileged` lub jawnie dodaj potrzebne capy; loguj effective capabilities w starcie testu.

- Blad: `journalctl`/`coredumpctl` nie dzialaly w obrazie bez systemd, przez co czesc testow anti-debug byla niema.
  - Wymaganie: uruchamiaj te testy w obrazie z systemd (lub na hoście), a brak systemd oznaczaj jako SKIP z instrukcją.

- Blad: narzedzia “manual-only” (np. Intel Pin / AVML) nie byly zainstalowane, przez co testy byly zawsze SKIP.
  - Wymaganie: instaluj je ręcznie na maszynie testowej i dodaj do `PATH`; w CI oznacz jawnie, że te subtesty są opcjonalne.

- Blad: `frida` nie byla dostępna w repozytoriach dystrybucji, przez co testy byly stale SKIP.
  - Wymaganie: instaluj `frida-tools` przez pip lub dostarcz binarke w toolchainie testowym; loguj sposób instalacji.

### Sentinel E2E (środowisko testowe)

- Blad: brak `/etc/machine-id` w kontenerze powodowal SKIP lub flakey wyniki sentinela.
  - Wymaganie: generuj `/etc/machine-id` na starcie testów (np. `systemd-machine-id-setup`) albo bind‑mount z hosta.

- Blad: klonowane VM-y miały identyczny `machine-id`, więc sentinel nie rozróżniał hostów.
  - Wymaganie: po klonowaniu obrazu regeneruj `machine-id` (np. `systemd-machine-id-setup`) i traktuj to jako wymóg dla produkcji.

- Blad: sentinel E2E uruchamiany jako non‑root nie mógł tworzyć root‑owned `baseDir`, przez co testy były zawsze SKIP.
  - Wymaganie: uruchamiaj sentinel E2E jako root (albo w kontenerze, który ma root) i loguj ten fakt.

### UI E2E (Playwright)

- Blad: brak zainstalowanych przegladarek Playwright (offline) powodowal fail/skip UI E2E.
  - Wymaganie: pre‑bake przegladarki w obrazie testowym albo jawnie wylacz UI E2E (`SEAL_UI_E2E=0`) w srodowiskach offline.

- Blad: UI E2E uruchomione w trybie nie‑headless bez X11/Xvfb powodowaly fail.
  - Wymaganie: w kontenerach/CI ustaw `SEAL_UI_E2E_HEADLESS=1` albo zainstaluj i uruchom `xvfb`.

- Blad: Playwright w Dockerze crashowal (małe `/dev/shm`), co dawalo losowe błędy przeglądarki.
  - Wymaganie: uruchamiaj kontener z wiekszym `/dev/shm` (np. `--shm-size=1g`) albo ustaw `--disable-dev-shm-usage` w uruchomieniu Chromium.

## Deploy / infrastruktura

- Blad: instalacja w `/opt` (mala partycja) powodowala brak miejsca.
  - Wymaganie: domyslny `installDir` dla uslug to `/home/admin/apps/<app>`.

- Blad: `seal uninstall` mogl usunac zbyt wysoki katalog (np. przez bledny `installDir`).
  - Wymaganie: Seal odmawia `rm -rf` jesli `installDir` jest zbyt plytki lub jest katalogiem systemowym.
  - Wymaganie: awaryjnie mozna ustawic `SEAL_ALLOW_UNSAFE_RM=1`, ale jest to **niebezpieczne**.

- Blad: `run-current.sh` i katalog aplikacji mialy zlego wlasciciela (root) i brak prawa wykonania.
  - Wymaganie: `installDir` i `run-current.sh` musza byc wlascicielem uzytkownika uslugi i `run-current.sh` musi byc wykonywalny.

- Blad: podwojne uploadowanie artefaktu przy pierwszym deployu (brak configu na serwerze).
  - Wymaganie: sprawdzaj `shared/config.json5` przed uploadem; artefakt wysylany **tylko raz**.

- Blad: brak wczesnej walidacji wolnego miejsca na serwerze powodowal `tar: Cannot mkdir: No space left on device`.
  - Wymaganie: preflight sprawdza wolne miejsce w `installDir` oraz `/tmp` i failuje z instrukcja, jesli za malo miejsca.

- Blad: uruchamianie aplikacji jako root (np. przez sudo) bez potrzeby.
  - Wymaganie: domyslnie uruchamiamy jako uzytkownik uslugi; `--sudo` tylko jawnie.
  - Wymaganie: waliduj owner/perms/umask w miejscach krytycznych.

- Blad: unit systemd nie ustawial `WorkingDirectory`, przez co `config.runtime.json5` nie byl znajdowany.
  - Wymaganie: `WorkingDirectory` wskazuje katalog release (albo `run-current.sh` ustawia CWD przed startem).

- Blad: systemd unit uzywal względnych sciezek w `ExecStart`, co psulo start po zmianie CWD.
  - Wymaganie: `ExecStart` zawsze uzywa absolutnych sciezek (lub `WorkingDirectory` + `./bin` tylko jesli jawnie wspierane).

- Blad: unit/komendy operowaly na zlej nazwie uslugi (status/stop/restart nie trafialy w odpowiedni unit).
  - Wymaganie: nazwa uslugi jest zapisywana w `<root>/service.name` i uzywana konsekwentnie przez `seal` i `appctl`.

- Blad: po zmianie pliku unit systemd brakowalo `daemon-reload`, przez co systemd uzywal starej konfiguracji.
  - Wymaganie: po zapisie/aktualizacji unitu zawsze wykonaj `systemctl daemon-reload` (lub `--user` odpowiednio do scope).

- Blad: `systemctl` potrafil wisiec (np. brak dbus/systemd w kontenerze), blokujac deploy/testy.
  - Wymaganie: wywolania `systemctl` maja timeout i czytelny SKIP/blad, gdy systemd nie jest dostepny.

- Blad: stare releasy rosly bez limitu (brak cleanup).
  - Wymaganie: retention (np. ostatnie N release) + usuwanie starych katalogow.
  - Wymaganie: cleanup dotyczy takze `*-fast`.

- Blad: tryb FAST byl uruchamiany niejawnie lub zostawial niebezpieczne artefakty.
  - Wymaganie: FAST jest **jawny** (`--fast`) i zawsze ostrzega o ryzyku.
  - Wymaganie: FAST nie tworzy SEA ani `.tgz`, uzywa osobnego katalogu `*-fast`.
  - Wymaganie: zwykly deploy usuwa poprzedni `*-fast` (zeby nie zostawiac zrodel na dysku).
  - Wymaganie: FAST usuwa `b/a` + `r/rt` + `r/pl`, zeby nie uruchamiac starego BOOTSTRAP runtime.

- Blad: `sshPort` w target config byl ignorowany (SSH/SCP/rsync uzywaly domyslnego portu).
  - Wymaganie: `sshPort` musi byc uwzgledniany we wszystkich polaczeniach (ssh/scp/rsync).

- Blad: ssh/scp/rsync w trybie nieinteraktywnym potrafily wisiec na prompt (host key / haslo).
  - Wymaganie: ustawiaj `BatchMode=yes` i fail-fast z jasnym komunikatem, gdy wymagany jest input.
  - Wymaganie: respektuj `StrictHostKeyChecking` z configu (brak ukrytych promptow).

- Blad: polityka SSH byla twardo ustawiona (sporne zachowanie bez opcji).
  - Wymaganie: parametry sporne/ryzykowne (np. `StrictHostKeyChecking`) musza byc konfigurowalne per‑target.

- Blad: rsync bez trailing slash kopiowal katalog zamiast jego zawartosci, co psulo layout release.
  - Wymaganie: zdefiniuj semantyke syncu i zawsze wymuszaj trailing slash dla katalogow zrodlowych (plus test e2e).

- Blad: `rsync --delete` potrafil usunac niezamierzone pliki przy zlej sciezce docelowej.
  - Wymaganie: przed `rsync --delete` waliduj, ze dst jest w dozwolonym root (np. `installDir`) i nie jest pusty.
  - Wymaganie: dla ryzykownych syncow wymagaj jawnego `--force-delete` lub warning + prompt w wizardzie.

- Blad: rozpakowanie archiwum bez walidacji sciezek pozwalalo na path traversal lub nadpisywanie symlinkow.
  - Wymaganie: waliduj archiwa (brak `..`, brak absolutnych, brak linkow) i fail‑fast przy naruszeniach.

- Blad: rozpakowanie artefaktu bez stagingu zostawialo polowiczny release po bledzie.
  - Wymaganie: rozpakowuj do katalogu tymczasowego i dopiero po walidacji przenos do `releases/<buildId>`.
  - Wymaganie: `current.buildId` aktualizuj **po** udanym extract+validate.

- Blad: `tar` nadpisywal owner/permissions z archiwum (ryzyko niezamierzonych uprawnien).
  - Wymaganie: przy ekstrakcji w trybie deploy ustaw `--no-same-owner` i `--no-same-permissions`, a permissje ustaw jawnie po rozpakowaniu.

- Blad: `rm -rf`/`chmod`/`chown` na duzej liczbie plikow failowal przez `ARG_MAX`.
  - Wymaganie: przy masowych operacjach uzywaj `find ... -print0 | xargs -0` lub `find -exec ... +`.

- Blad: `strip` byl uruchamiany na pliku, ktory nie byl ELF (np. skrypt), co powodowalo bledy.
  - Wymaganie: przed uruchomieniem `strip` sprawdz typ pliku (ELF magic lub `file`) i w razie niezgodnosci SKIP z powodem.

- Blad: ELF packer/strip zwracał sukces, ale binarka byla uszkodzona i crashowala w runtime.
  - Wymaganie: po packerze/stripie wykonaj szybki smoke test (np. uruchomienie z `--version`/`--health` lub `file` + krótki run z timeoutem).

- Blad: w `thin-split` `strip`/ELF packer byl uruchamiany na wrapperze (`<app>`), a nie na faktycznym launcherze (`b/a`), przez co ochrona nie dzialala lub dawla falszywe wyniki.
  - Wymaganie: dla `thin-split` targetuj realny ELF launchera (`b/a`) i zapisuj w metadanych/logach, ze celem byl `launcher`.

- Blad: w AIO probowano `strip`/ELF packer na pliku z doklejonym payloadem, co psulo runtime.
  - Wymaganie: `strip`/packer dla AIO musi być ignorowany (auto-disabled) z jasnym ostrzeżeniem; dokumentacja ma wyraźnie wskazywać `thin-split` jako tryb produkcyjny.

- Blad: `strip` na binarce SEA powodowal crash (SIGSEGV) mimo udanego builda.
  - Wymaganie: dla `sea`/`thin-single` `strip` jest ignorowany (auto-disabled) z jasnym ostrzeżeniem.

- Blad: rozne implementacje `strip` (GNU vs llvm) dawaly rozne sekcje (np. `.comment`) i flaky asercje/testy.
  - Wymaganie: tooling/testy wykrywaja wariant `strip` (`strip --version`) i dostosowuja oczekiwania albo wymuszaja konkretny `strip` w E2E.
  - Wymaganie: jesli wymagane jest usuniecie `.comment`, weryfikuj flagi/wersje i loguj "effective config".

- Blad: detekcja narzedzi (`postject`, packery) nie uwzgledniala monorepo/workspace i szukala tylko w `./node_modules/.bin`, przez co testy/CLI nie widzialy narzedzia mimo instalacji.
  - Wymaganie: przy wykrywaniu CLI sprawdzaj kilka poziomow `node_modules/.bin` lub uzywaj mechanizmu typu `npm bin -w`/`npm exec`.

- Blad: zbyt szeroka `mapsDenylist` (np. `libc`) powodowala falszywe alarmy i blokowala poprawne uruchomienia.
  - Wymaganie: listy deny powinny byc precyzyjne (np. `frida`, `gdb`, `ltrace`), a testy musza pokrywac scenariusz false‑positive.

- Blad: sprawdzanie `TracerPid` tylko przy starcie nie wykrywalo późniejszego attach/debug.
  - Wymaganie: jeśli `TracerPid` jest używany jako anti‑debug, check musi być okresowy lub wykonywany w punktach krytycznych.

- Blad: okresowy check `TracerPid` byl zrobiony na `setInterval`, ale timer nie byl `unref()`, co blokowalo procesy ktore mialy sie naturalnie zakonczyc.
  - Wymaganie: wszystkie background timery w launcherze/bootstrapie musza byc `unref()` (o ile platforma to wspiera).

- Blad: check `TracerPid` nie obejmowal watkow (`/proc/self/task/*`), wiec attach do pojedynczego TID mogl zostac przeoczony.
  - Wymaganie: gdy wlaczone `tracerPidThreads`, sprawdzaj `TracerPid` dla wszystkich taskow.

- Blad: self‑hash launchera padal przez kolizje markera (np. string `THIN_SELF_HASH:` pojawial sie w innym miejscu binarki), co dawalo falszywe `runtime invalid`.
  - Wymaganie: identyfikuj marker po **pelnym wzorcu** (marker + hex) lub waliduj hex i ignoruj nie‑hex; obsluz wiele wystapien i wymagaj spojnosc hasha.

- Blad: self‑hash byl wstawiany przed hardeningiem/packerem i uniewaznial sie po pozniejszych modyfikacjach binarki.
  - Wymaganie: obliczaj i wstawiaj hash **po** wszystkich operacjach post‑pack (ostatni krok).

- Blad: kompilator optymalizowal nieuzywany string markera, przez co patcher nie znajdowal placeholdera.
  - Wymaganie: utrzymuj marker w binarce (np. `volatile` lub jawna referencja), zeby patchowanie bylo deterministyczne.

- Blad: pliki binarne byly czytane/zapisywane z `utf8`, co uszkadzalo dane (codec/payload).
  - Wymaganie: binarki czytaj/zapisuj jako `Buffer` (bez encoding), a tekst jawnie jako `utf8`.

- Blad: diff configu porownywal formatowanie (kolejnosc kluczy/whitespace), dajac falszywe roznice.
  - Wymaganie: diff opiera sie na kanonicznej reprezentacji (parse+stable sort+stringify).

- Blad: transfer artefaktu byl uznawany za poprawny bez walidacji (rozmiar/sha), co maskowalo uszkodzenia.
  - Wymaganie: po transferze weryfikuj checksum (np. sha256) lub przynajmniej rozmiar.

- Blad: odczyt duzych plikow w calosci powodowal skoki pamieci.
  - Wymaganie: dla potencjalnie duzych plikow uzywaj streamow i limitow rozmiaru.

- Blad: retry sieciowe byly natychmiastowe i bez jittera, powodujac thundering herd i dalsze awarie.
  - Wymaganie: retry ma exponential backoff + jitter, z limitem prob i max delay.

- Blad: rozpakowanie archiwum nie mialo limitow rozmiaru/ilosci plikow (zip‑bomb).
  - Wymaganie: limituj maksymalny rozmiar i liczbe plikow przy ekstrakcji.

- Blad: niepoprawnie sformatowany `host/user` w targetach powodowal bledy lub ryzyko wstrzykniec.
  - Wymaganie: waliduj `host`/`user` (brak spacji i znakow kontrolnych; whitelist dla dozwolonych znakow).

- Blad: brak timeoutow na operacjach zewnetrznych (ssh/scp/rsync/http) blokowal deploy.
  - Wymaganie: kazda operacja zewnetrzna ma timeout + jasny komunikat "co dalej".

- Blad: `status` lapal przypadkowe procesy (np. edytor `nano appctl`) i mylil z running service.
  - Wymaganie: detekcja procesu musi byc precyzyjna (systemd lub filtr na faktyczna binarke/PID).

- Blad: `seal run` zostawial proces po zamknieciu konsoli.
  - Wymaganie: foreground run musi zbijac proces przy rozlaczeniu lub miec `--kill`.
  - Wymaganie: `--kill` dziala bez sudo (ten sam user), bez ubijania cudzych procesow.

- Blad: `seal run` uruchamial bezposrednio `appctl` z release, ignorujac `run-current.sh`.
  - Wymaganie: `seal run` uruchamia `run-current.sh` (jezeli istnieje), zeby zachowac zgodnosc z usluga i BOOTSTRAP.

- Blad: `seal run` nie sprawdzal czy port jest wolny, a `EADDRINUSE` byl niejasny dla operatora.
  - Wymaganie: przed uruchomieniem sprawdz czy port jest zajety i wypisz PID/komende procesu lub jasne “co dalej”.

- Blad: rollback wybieral release `*-fast-*` albo release innej aplikacji.
  - Wymaganie: rollback filtruje releasy po `appName` i **pomija** `*-fast-*`.

- Blad: `status` nie wykrywal procesu uruchomionego przez BOOTSTRAP (`$ROOT/b/a`) przy braku unitu.
  - Wymaganie: fallback `status` uwzglednia `$ROOT/b/a` w detekcji procesu.

- Blad: detekcja procesu (pgrep) lapala wlasne narzedzia (`pgrep`, edytory, shell), dajac falszywy wynik „process running”.
  - Wymaganie: filtruj wyniki po PID (pomijaj PID testu/pgrep) i uzywaj dopasowania sciezki binarki, nie tylko nazwy procesu.

- Blad: detekcja procesu opierala sie na `ps` z ucinanym `cmd`, co dawalo falszywe dopasowania.
  - Wymaganie: do identyfikacji procesu uzywaj `/proc/<pid>/cmdline` lub `ps -ww` (pełna komenda).

- Blad: `serviceScope=user` na SSH prowadzil do blednych komend `sudo systemctl`.
  - Wymaganie: SSH wspiera tylko `serviceScope=system` (inaczej blad), albo implementujemy wariant `--user`.

- Blad: sentinel instalowal sie nawet gdy brakowalo `machine-id`/`rid`, mimo ze wybrany level ich nie wymagal.
  - Wymaganie: waliduj `mid`/`rid` **warunkowo** (tylko dla leveli, ktore tego potrzebuja).
  - Wymaganie: `auto` nie moze wymuszac wyzszego levelu bez danych; fallback do nizszego levelu.

- Blad: idempotentny install sentinela probowal porownywac blob bez uprawnien (cmp jako zwykly user).
  - Wymaganie: porownania/zapisy do plikow chronionych wykonuj z tymi samymi uprawnieniami co install (sudo lub group access).
  - Wymaganie: brak uprawnien = jasny blad z instrukcja (dodaj user do group lub uzyj sudo).

- Blad: nazwa targetu byla uzywana w sciezkach bez sanitizacji (mozliwy path traversal).
  - Wymaganie: wszystkie identyfikatory uzywane jako fragment sciezki musza byc normalizowane do bezpiecznego alfabetu (`[a-zA-Z0-9_.-]`).

- Blad: tryb security/stealth w launcherze nadal wypisywal szczegolowe bledy (rozroznialne failure paths).
  - Wymaganie: przy aktywnych zabezpieczeniach komunikaty i exit code musza byc zunifikowane (opaque failure).

- Blad: `cpuIdSource` wymagal recznego `off` na architekturach bez CPUID (np. ARM).
  - Wymaganie: na architekturach bez CPUID launcher uzywa pustego/neutralnego ID i **nie** wymaga zmiany konfiguracji.

- Blad: limit czasu sentinela liczony lokalnie, a nie wg czasu docelowego hosta.
  - Wymaganie: czas `validFor*` liczony w **momencie instalacji** na hoście docelowym (epoch‑sec z hosta).
  - Wymaganie: weryfikacja expiry w `sentinel verify` uzywa czasu hosta (nie lokalnego).

- Blad: sentinel weryfikowany tylko przed startem, brak okresowej kontroli.
  - Wymaganie: przy `checkIntervalMs>0` okresowo weryfikuj blob i expiry (setInterval + unref).
  - Wymaganie: test E2E musi sprawdzac “start OK → po czasie exitCodeBlock”.

- Blad: zmiana formatu bloba (v1/v2) psula runtime (niezgodne rozmiary / CRC).
  - Wymaganie: runtime akceptuje **oba** rozmiary i waliduje spojnosc (version ↔ length).
  - Wymaganie: nowe pole (np. `expires_at`) musi byc ignorowane przez v1 i jawnie sprawdzane w v2.

- Blad: zegar hosta byl rozjechany (brak NTP), przez co sentinel z limitem czasu wygasal natychmiast albo za późno.
  - Wymaganie: na hostach produkcyjnych i testowych wymagaj synchronizacji czasu (NTP) i loguj odchyłkę, jeśli dostępna.

- Blad: w template stringach z bash/script wystapily nie‑escapowane sekwencje `${...}`, co psulo skladnie JS.
  - Wymaganie: w osadzonych skryptach shellowych zawsze escapuj `${` jako `\\${` (lub użyj helpera do here‑doc), zeby uniknac interpolacji JS.
  - Wymaganie: dotyczy to zwlaszcza bash‑owego `${VAR:-default}` — w JS musi byc `\\${VAR:-default}` albo `String.raw`.

- Blad: generator JS wklejal template literal (backtick + `${...}`) do stringa JS, co psulo skladnie builda.
  - Wymaganie: w kodzie generowanym przez template string unikaj backticków albo escapuj `${` i same backticki.

- Blad: tryb decoy nadpisywal pliki release „po cichu” lub w nieprzewidywalnym zakresie.
  - Wymaganie: domyślne zachowanie decoya musi być **jawne** (overwrite ON/OFF).
  - Wymaganie: jeśli `overwrite=false`, każda kolizja (np. `public/`, `src/`, `package.json`) kończy build błędem z listą konfliktów.
  - Wymaganie: jeśli `overwrite=true`, loguj zakres decoya (`scope=backend|full`) i źródło (`sourceDir`/generated), żeby było jasne co zostało nadpisane.

- Blad: tymczasowe pliki z danymi wrazliwymi byly tworzone w /tmp z przewidywalna nazwa i zbyt luznymi uprawnieniami.
  - Wymaganie: tworz temp‑dir przez `mkdtemp`, pliki z `0600`, a po uzyciu zawsze sprzataj.
  - Wymaganie: unikaj `Date.now()` jako jedynego komponentu nazwy pliku.

- Blad: instalacja/uninstall sentinela nie miala locka i fsync (ryzyko race/partial write).
  - Wymaganie: `flock` w `<opaque_dir>` + `umask 077` + `fsync` pliku i katalogu przed/po rename.
  - Wymaganie: tmp na serwerze ma losowy sufiks (unikaj kolizji).

- Blad: instalacja sentinela zostawiala pliki tymczasowe po bledzie (np. `$FILE.tmp` lub zdalny blob w `/tmp`).
  - Wymaganie: cleanup na `EXIT` usuwa tmp na serwerze i lokalne `.tmp` (bez wyciekow po awarii).

- Blad: brak `flock` na hoście dawal nieczytelny error (np. `flock: not found`).
  - Wymaganie: jawny check `command -v flock` z czytelnym komunikatem i kodem bledu.

## CLI / UX spojnosci

- Blad: niespojne nazwy/semantyka komend (np. stop/disable).
  - Wymaganie: ta sama nazwa = ta sama semantyka w CLI i docs.

- Blad: `appctl` i `seal remote` mialy rozne komendy i semantyke.
  - Wymaganie: komendy sa symetryczne (`up/down/start/stop/restart/enable/disable/status/logs`).
  - Wymaganie: `appctl up` == `seal remote <target> up` (ta sama operacja).

- Blad: 3 osobne kroki (release + deploy + restart) powodowaly pomylki.
  - Wymaganie: jedno polecenie `seal ship <target>` wykonuje release + deploy + restart.

- Blad: `npx seal` z podfolderu monorepo nie widzial CLI.
  - Wymaganie: zapewnij globalny link (`tools/seal/scripts/link-global-seal.sh`) albo uzywaj `npx --prefix <repo-root>`.

- Blad: `npx` bez `--no-install` probowal pobierac pakiety z sieci i wieszal testy/CI bez internetu.
  - Wymaganie: w CI/testach uzywaj `npx --no-install` lub bezposrednio `./node_modules/.bin/<tool>`.

- Blad: uruchomienie komendy w monorepo rekurencyjnie (workspace) uzywalo relatywnej sciezki CLI i padalo w podprojektach.
  - Wymaganie: rekurencyjne uruchomienia CLI musza uzywac **absolutnej** sciezki do binarki/JS.

- Blad: projekty w workspace byly przetwarzane w niestabilnej kolejnosci (FS order), co psulo logi i testy.
  - Wymaganie: lista projektow jest sortowana deterministycznie (np. po `name`/`path`) i wypisywana w tej kolejnosci.

- Blad: `seal check` uruchomiony poza projektem nadal tworzyl pliki i generowal mylace warningi.
  - Wymaganie: brak `seal.json5` = fail-fast **bez efektow ubocznych**.

- Blad: `seal check` ostrzegal o brakujacych narzedziach (np. `upx`), mimo ze nie byly wymagane przez aktualna konfiguracje.
  - Wymaganie: preflight ostrzega **tylko** o narzedziach faktycznie wymaganych przez wybrany packager/protection.

- Blad: `seal config diff <sciezka>` zwracal `Missing target`.
  - Wymaganie: `config diff` przyjmuje **nazwe targetu**; nowe targety dodaj `seal target add <target> <config>`.

- Blad: TAB completion podpowiadal targety i blokowal opcje (np. `seal deploy --`).
  - Wymaganie: gdy biezacy token zaczyna sie od `-`, completion **zawsze** podpowiada opcje.
  - Wymaganie: podpowiedzi targetow nie moga maskowac opcji (opcje maja priorytet).
  - Wymaganie: completion musi byc aktualizowany po kazdej zmianie CLI (komendy/opcje).

- Blad: wizard bez kontekstu (lista komend bez wyjasnien) utrudnial decyzje.
  - Wymaganie: wizard opisuje kazda komende 1 linijka i wskazuje rekomendowana akcje na teraz.
  - Wymaganie: wizard dziala krok-po-kroku (petla), nie tylko pojedynczy ekran.

- Blad: output CLI byl mylacy (duplikaty, niepotrzebne puste linie).
  - Wymaganie: output ma byc zwięzly i bez duplikatow (np. artefakt tylko raz).
  - Wymaganie: kazda linia ma sens (puste linie tylko gdy poprawiaja czytelnosc).

- Blad: w dokumentacji standardow pojawily sie duplikaty identyfikatorow STD, co utrudnialo odniesienia i automatyczne sprawdzanie zgodnosci.
  - Wymaganie: kazdy identyfikator STD musi byc **unikalny**; gdy dodajesz wariant, uzyj sufiksu (`a/b/...`) i sprawdz duplikaty automatycznie (np. `rg -o "STD-[0-9]+[a-z]?(?:\\.[a-z])?" | sort | uniq -d`).

- Blad: brakowalo jasnych instrukcji instalacji narzedzi (np. libzstd-dev).
  - Wymaganie: `seal check` zwraca **konkretne** instrukcje naprawy (nazwy pakietow, np. `apt-get install ...`).
  - Wymaganie: dokumentacja onboardingowa musi zawierac te same kroki.

- Blad: rozjazd miedzy CLI, completion, wizard i docs (niespojne komendy/opcje).
  - Wymaganie: zmiany CLI **zawsze** aktualizuja completion + wizard + docs w tym samym PR.
  - Wymaganie: nowe komendy/opcje musza byc widoczne w wizardzie i completion.

## Runtime config

- Blad: `config.runtime.json5` brakowal lub byl parsowany przez `JSON.parse`.
  - Wymaganie: `config.runtime.json5` jest **wymagany**, a parse to **JSON5**. Brak/blad = exit z kodem bledu.

- Blad: uzywanie `.env` jako runtime configu w produkcji.
  - Wymaganie: `.env` nie jest runtime configiem; uzywamy `config.runtime.json5`.

- Blad: `config.runtime.json5` mial zbyt szerokie uprawnienia (world‑readable) i mogl ujawnic dane.
  - Wymaganie: ustaw permissje plikow runtime (np. 0640/0600) i weryfikuj w preflight.

- Blad: dane RDS (login/haslo/lang) byly w configach lub logach.
  - Wymaganie: RDS login/haslo/lang sa stalymi w kodzie (swiadomy wyjatek), bez ekspozycji w logach.

- Blad: domyslne wartosci byly ustawiane przez `||`, co nadpisywalo poprawne `0`/`false`.
  - Wymaganie: dla configu uzywaj `??` (nullish) albo jawnej walidacji typow.

## Logowanie / bezpieczenstwo

- Blad: logowanie `JSESSIONID` i komunikatow login/logout.
  - Wymaganie: **nie logujemy danych uwierzytelniajacych ani sesji**. Logi auth maja byc wyciszone lub zakomentowane.

- Blad: logowanie pelnych payloadow/odpowiedzi (duze logi, ryzyko sekretow).
  - Wymaganie: loguj tylko metadane i krotkie preview (limit znakow), bez pelnych body.
  - Wymaganie: logi minimalne, tylko dane potrzebne do diagnozy.

- Blad: `set -x`/xtrace w skryptach logowal sekrety (tokeny/hasla/URL).
  - Wymaganie: `set -x` tylko w trybie debug i z maskowaniem sekretow; domyslnie OFF.

- Blad: logi JSONL byly psute przez znaki nowej linii lub binarne dane w polach.
  - Wymaganie: dane z zewnatrz sa normalizowane/escapowane (np. `\\n`), a binarne pola kodowane (base64/hex).

## UI availability / aktualizacje

- Blad: UI odswiezal sie po bledzie backendu i pokazywal strone z bledem.
  - Wymaganie: UI nie robi reloadu na bledzie backendu.
  - Wymaganie: backend wystawia `/api/status` z `buildId`.
  - Wymaganie: UI pokazuje overlay po ok. 2s braku polaczenia.
  - Wymaganie: UI robi reload **tylko** po zmianie `buildId` i po odzyskaniu polaczenia.
  - Wymaganie: polling do `/api/status` ma timeout (AbortController), aby zawieszone requesty nie blokowaly kolejnych prob.
  - Wymaganie: `?debug=1` moze pokazywac badge `buildId` i toast przed reloadem.

- Blad: UI używal service worker/cache i pokazywal stary build po deployu.
  - Wymaganie: wylacz service worker albo wersjonuj cache i wymusz reload po zmianie `buildId`.

- Blad: UI uzywalo `fetch` bez timeoutu, co zamrazalo stan UI.
  - Wymaganie: `fetch` zawsze z `AbortController` i limitem czasu.

## UI niezawodnosc / polaczenia

- Blad: UI uzywalo blokujacych `alert()` przy problemach polaczenia (psulo UX).
  - Wymaganie: bledy polaczen komunikujemy przez **nieblokujacy overlay** lub toast.

- Blad: UI probowalo zgadywac brak RDS na podstawie pustych danych.
  - Wymaganie: backend zwraca **jawny status** polaczenia z RDS (`rdsOk`, opcjonalnie `rdsSource`).
  - Wymaganie: backend zwraca `rdsOk`/`rdsSource` **takze przy non-200** (np. 404/500).
  - Wymaganie: UI parsuje JSON nawet przy `resp.ok=false` i na tej podstawie aktualizuje overlay.
  - UI pokazuje dwa rozne komunikaty:
    - "Brak polaczenia z serwerem aplikacji" (stan RDS nieznany),
    - "Brak polaczenia serwera z RDS" (backend dziala, RDS nie).
  - Komunikat powinien zawierac prosty tekst do przekazania serwisowi ("Zglos: ...").

## UI input / tablety (klik, long-press, scroll)

- Blad: klik/long-press na przyciskach i tabach nie reagowal (dlugie przytrzymanie lub lekki ruch palca).
  - Wymaganie: uzywaj wspolnego `setupPressAction`:
    - `pointerdown` (touch/pen) uruchamia akcje od razu; `pointerup` dla myszy.
    - `setPointerCapture` + "slop" (np. 22px) i sprawdzenie `inside` na `pointerup`.
    - ignoruj zdublowane `click` (okno 600-800 ms).
    - `contextmenu` -> `preventDefault`.
  - CSS dla `.btn`/`.tab`: `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none`, `-webkit-tap-highlight-color: transparent`.

- Blad: klik na panelu/boxach gasl po chwili (drag/long-press).
  - Wymaganie: akcja toggle albo na `pointerdown` (touch) albo na `pointerup` z "slopem".
  - Nie polegaj na samym `click` na tabletach.

- Blad: szybki polling nadpisywal lokalne zmiany w UI (migotanie stanu).
  - Wymaganie: optimistic UI + lokalny grace 300-500 ms zanim backend nadpisze stan.

- Blad: scroll blokowal sie po lekkim ruchu w bok (poziomy pan "przejmowal" gest).
  - Wymaganie (CSS): `touch-action: pan-y; overflow-x: hidden; overscroll-behavior-x: none; -webkit-overflow-scrolling: touch` na kontenerze scrolla.
  - Wymaganie (JS): `setupTouchScrollAssist` dla kontenera scrolla:
    - nasluch `touchstart`/`touchmove`, start tylko poza `.btn/.tab`.
    - po przekroczeniu progu (np. 8px) wymus `preventDefault()` i aktualizuj `scrollTop`.

## UI guidelines (praktyki z hali)

- Pokazuj zrodlo danych i czas ostatniej aktualizacji (np. RDS/Mock + timestamp).
- Uzywaj stanow przyciskow: `loading/disabled/success/error` zamiast blokowania UI.
- Akcje niekrytyczne: optimistic UI + debounce 300-500 ms, zeby uniknac podwojnych klikow.
- Etykiety dlugie musza sie zawijac (`white-space: normal`) dla akcji krytycznych.
- Tablet-first: duze hit-area, brak zaleznosci od hover, akcja na `pointerdown`.
- Tylko destrukcyjne akcje wymagaja potwierdzen; reszta jednym kliknieciem.
- Overlay z opóźnieniem 1-2 s; brak panicznych komunikatow przy krotkich przerwach.
- `?debug=1` pokazuje buildId, timestamp, ostatni blad polaczenia (pomoc serwisowi).
- Teksty overlayu musza byc spójne w HTML i JS (najlepiej z jednego zrodla).
- Backend mapping (np. slotId -> siteId) musi pokrywac wszystkie elementy widoczne w UI.

## Co sprawdzac po zmianach (checklist)

- `seal release` bez `postject` musi failowac (chyba ze bundle fallback jawnie wlaczony).
- `elfPacker.tool="upx"` wlaczony + blad `upx` => build musi failowac.
- `seal deploy` nie wysyla artefaktu podwojnie.
- `installDir` w targetach jest w `/home/admin/apps/...`.
- `config.runtime.json5` jest obecny i poprawny JSON5.
- UI: overlay po 2s braku polaczenia, reload tylko po zmianie `buildId`.
- UI: brak `alert()` przy bledach polaczen; overlay rozroznia backend vs RDS na podstawie `rdsOk`.
- UI: backend zwraca `rdsOk`/`rdsSource` takze przy non-200; UI parsuje JSON mimo `resp.ok=false`.
- UI: optimistic toggle nie miga (grace 300-500 ms).
- UI (tablet): klik/long-press dziala na `.btn/.tab` i scroll nie blokuje sie po ruchu w bok.
- Logi nie zawieraja `JSESSIONID` ani danych auth.
- FAST: `seal ship --fast` ostrzega, nie tworzy `.tgz`, zapisuje do `*-fast`, a cleanup usuwa stare fast releasy.
- CLI: `appctl` i `seal remote` maja te same komendy/semantyke; `seal ship` dziala jako 1 krok.
- CLI: `seal` jest dostepny globalnie (link lub `npx --prefix`) i `config diff` uzywa nazwy targetu.
- Cache/retention: brak niczego, co rosnie bez limitu (cache, tmp, logi, releasy).

## Dodatkowe wnioski (batch 100)

- Blad: build nie logowal wersji narzedzi (cc/strip/packer), co utrudnial reprodukcje.
  - Wymaganie: loguj `tool --version` dla kazdego uzytego narzedzia.
- Blad: nie bylo wiadomo, z jakiej sciezki pochodzi kompilator (PATH), co utrudnialo diagnoze.
  - Wymaganie: loguj absolutna sciezke do kazdego narzedzia (`which`/`command -v`).
- Blad: cache buildow byl wspoldzielony miedzy OS/arch, przez co pojawialy sie niezgodne artefakty.
  - Wymaganie: kluczuj cache po `os+arch` (i wersji formatu).
- Blad: buildy nie byly deterministyczne przez timestampy w archiwach.
  - Wymaganie: wspieraj deterministyczne buildy (`SOURCE_DATE_EPOCH`, stałe czasy).
- Blad: archiwa mialy niestabilny porzadek plikow, co psulo porownania.
  - Wymaganie: sortuj liste plikow w archiwum w sposob stabilny.
- Blad: TMPDIR byl na `noexec` lub readonly i build wysypywal sie bez jasnego powodu.
  - Wymaganie: sprawdz mount flags TMPDIR i dawaj jasna instrukcje zmiany.
- Blad: brak mozliwosci zmiany katalogu tymczasowego powodowal problemy na NFS/slow FS.
  - Wymaganie: pozwol nadpisac katalog temp (`SEAL_TMPDIR`) i waliduj zapisywalnosc.
- Blad: domyslny `-j` w kompilacji nadmiernie obciazal CPU/RAM i powodowal flaki.
  - Wymaganie: ustaw bezpieczny limit rownoleglosci i daj opcje override.
- Blad: build dziedziczyl `CFLAGS/CXXFLAGS/LDFLAGS` z ENV, co psulo spojnosc.
  - Wymaganie: albo czysc te zmienne, albo loguj je jawnie jako czesc configu.
- Blad: brak oczekiwanego kompilatora powodowal cichy fallback na inny toolchain.
  - Wymaganie: fail‑fast, gdy wskazany kompilator nie jest dostepny.

- Blad: nazwy artefaktow kolidowaly miedzy targetami/packerami.
  - Wymaganie: nazwa artefaktu zawiera `target+packager+buildId`.
- Blad: artefakty byly nadpisywane bez ostrzezenia.
  - Wymaganie: nadpisywanie tylko z `--force` albo unikalna nazwa.
- Blad: artefakt byl pusty lub ucity, a pipeline szedl dalej.
  - Wymaganie: waliduj rozmiar i oczekiwana zawartosc artefaktu.
- Blad: pliki wykonywalne w release nie mialy +x.
  - Wymaganie: ustaw jawne permissje dla binarek i skryptow.
- Blad: tar na serwerze zachowywal ownera i psul uprawnienia.
  - Wymaganie: uzywaj `--no-same-owner`/`--numeric-owner`.
- Blad: brak manifestu plikow utrudnial walidacje releasu.
  - Wymaganie: generuj manifest z hashami.
- Blad: brak metadanych wersji utrudnial diagnostyke.
  - Wymaganie: zapisuj `buildId/packager/config-hash` w metadanych.
- Blad: ponowne buildy zostawialy stare pliki w release.
  - Wymaganie: czysc release albo tworz nowe katalogi per build.
- Blad: symlinki wchodzily do releasu i mogly wyciec poza root.
  - Wymaganie: blokuj symlinki albo jawnie je waliduj.
- Blad: archiwum zawieralo sciezki absolutne.
  - Wymaganie: kazda sciezka w artefakcie musi byc relatywna.

- Blad: skrypty zdalne nie uzywaly `set -euo pipefail`, co ukrywalo bledy.
  - Wymaganie: wymusz `set -euo pipefail` dla skryptow deploy.
- Blad: deploy szedl na niezgodna architekture.
  - Wymaganie: waliduj `uname -m` na serwerze przed deploy.
- Blad: deploy szedl na niezgodny runtime (glibc/musl).
  - Wymaganie: waliduj kompatybilnosc runtime (np. `ldd --version`).
- Blad: uprawnienia na serwerze byly zbyt szerokie przez `umask`.
  - Wymaganie: ustaw i zweryfikuj `umask` podczas deploy.
- Blad: aktualizacja `current` byla nieatomowa.
  - Wymaganie: uzywaj `ln -sfn` + `fsync` dla atomowej zmiany.
- Blad: sciezki zdalne z spacjami rozbijaly komendy.
  - Wymaganie: skladanie komend tylko z bezpiecznym quoting/array.
- Blad: serwisowy user nie istnial i instalacja padala w polowie.
  - Wymaganie: sprawdz `id -u` i dawaj instrukcje utworzenia.
- Blad: brak `systemctl` na hostcie dawal nieczytelny blad.
  - Wymaganie: wykryj brak systemd i fail‑fast z instrukcja.
- Blad: po deployu nie bylo walidacji owner/perms.
  - Wymaganie: po deployu waliduj owner/perms kluczowych plikow.
- Blad: `current.buildId` byl zapisywany bez atomowosci.
  - Wymaganie: zapis tmp + rename + fsync.

- Blad: child procesy dziedziczyly wszystkie ENV i wyciekaly sekrety.
  - Wymaganie: allowlistuj ENV przekazywane do child procesow.
- Blad: sekrety byly przekazywane w CLI args (widoczne w `ps`).
  - Wymaganie: sekrety tylko w pliku lub ENV, nie w args.
- Blad: globalne `.npmrc` z tokenami bylo uzywane przez instalatory.
  - Wymaganie: ustaw `NPM_CONFIG_USERCONFIG` na temp plik i sprzataj.
- Blad: pobieranie binarek bez weryfikacji checksum.
  - Wymaganie: wymagaj sha256/signature i weryfikuj.
- Blad: `LD_LIBRARY_PATH/LD_PRELOAD` z ENV wplywal na uruchomienia.
  - Wymaganie: czysc `LD_*` przed exec child procesow.
- Blad: pliki sekretow mialy zbyt szerokie uprawnienia.
  - Wymaganie: `umask 077` i `chmod 0600` dla sekretow.
- Blad: logi zawieraly pelne sekrety z configu.
  - Wymaganie: redaguj klucze typu `password/token/secret`.
- Blad: sekrety lezaly w publicznie dostepnym katalogu.
  - Wymaganie: dedykowany katalog z ograniczonymi perms.
- Blad: tymczasowe pliki z sekretami nie byly sprzatane.
  - Wymaganie: usuwaj je deterministycznie po uzyciu.
- Blad: core dumpy byly wlaczone w produkcji.
  - Wymaganie: domyslnie wylacz core dumpy (opt‑in z ostrzezeniem).

- Blad: nieznane klucze w configu byly ignorowane.
  - Wymaganie: waliduj schema i ostrzegaj/failuj na unknown keys.
- Blad: nadpisania z ENV mialy spacje i biale znaki.
  - Wymaganie: trim i waliduj input z ENV.
- Blad: liczby w configu byly parsowane jako stringi.
  - Wymaganie: parse + walidacja zakresu.
- Blad: sciezki w configu nie byly normalizowane.
  - Wymaganie: `path.resolve` + walidacja w dozwolonym root.
- Blad: merge configu byl plytki i gubil nested klucze.
  - Wymaganie: jawny deep‑merge lub explicit config.
- Blad: uzycie `||` w defaultach nadpisywalo poprawne `false/0`.
  - Wymaganie: uzywaj `??` lub jawnego sprawdzenia.
- Blad: config byl auto‑tworzony w produkcji bez zgody.
  - Wymaganie: auto‑create tylko w dev (explicit flag).
- Blad: brak walidacji owner/perms dla configu z sekretami.
  - Wymaganie: sprawdzaj owner/perms configu.
- Blad: wlaczone flagi nie byly logowane.
  - Wymaganie: loguj efektywne flagi/booleany.
- Blad: diff configu porownywal listy w zaleznosci od kolejnosci.
  - Wymaganie: normalizuj kolejnosc tam, gdzie order nie ma znaczenia.

- Blad: testy oczekiwaly gotowosci po `sleep`, co bylo flakey.
  - Wymaganie: polling z timeoutem zamiast `sleep`.
- Blad: testy modyfikowaly `process.env` i nie przywracaly.
  - Wymaganie: snapshot/restore `process.env` w `finally`.
- Blad: testy dzielily temp dir i wzajemnie sobie przeszkadzaly.
  - Wymaganie: per‑test temp dir (`mkdtemp`).
- Blad: losowe dane w testach byly niepowtarzalne.
  - Wymaganie: seeduj RNG i loguj seed.
- Blad: testy nie asercjonowaly exit code child procesow.
  - Wymaganie: jawnie sprawdzaj exit code/signal.
- Blad: testy rownolegle korzystaly ze wspolnego cache.
  - Wymaganie: izoluj cache lub uzyj locka.
- Blad: testy padaly na brakujacych zaleznosciach zamiast SKIP.
  - Wymaganie: brak zaleznosci = SKIP z instrukcja instalacji.
- Blad: przy failu brakowalo artefaktow do diagnozy.
  - Wymaganie: zachowuj logi/artefakty (z limitem) przy failu.
- Blad: testy zalezne od timezone/locale byly flakey.
  - Wymaganie: `TZ=UTC`, `LC_ALL=C` w testach.
- Blad: globalny git config/hooks wplywal na testy.
  - Wymaganie: izoluj git config (`GIT_CONFIG_*`, `core.hooksPath=/dev/null`).

- Blad: logi nie zawieraly `appName/buildId`, przez co nie bylo kontekstu.
  - Wymaganie: logi zawsze zawieraja `appName/buildId`.
- Blad: logi byly w lokalnym czasie i nieporownywalne.
  - Wymaganie: czas w logach tylko UTC/ISO.
- Blad: komunikaty bledu nie zawieraly kodu wyjscia.
  - Wymaganie: loguj exit code/signal.
- Blad: diagnostyka domyslnie zbierala dane w trybie full.
  - Wymaganie: domyslnie tryb safe; full tylko jawnie.
- Blad: `--verbose` nie pokazywal uruchomionych komend.
  - Wymaganie: w verbose loguj command line (z sanitizacja).
- Blad: pomiary czasu uzywaly `Date.now()`.
  - Wymaganie: uzywaj zegara monotonicznego.
- Blad: powtarzalne bledy zalewaly logi.
  - Wymaganie: rate‑limit/sampling dla identycznych bledow.
- Blad: biblioteki logowaly bezposrednio na stdout.
  - Wymaganie: uzywaj centralnego loggera.
- Blad: logi gubily sie przy `process.exit`.
  - Wymaganie: flush logow przed wyjsciem.
- Blad: logi do pliku rosly bez ograniczen.
  - Wymaganie: rotacja lub limit rozmiaru.

- Blad: workspace zwracal `0` mimo bledow w podprojektach.
  - Wymaganie: non‑zero exit przy bledzie (chyba ze `--continue-on-error`).
- Blad: brak podsumowania statusu dla wielu projektow.
  - Wymaganie: drukuj summary (ok/fail/skip) po zakonczeniu.
- Blad: help/opisy nie byly aktualizowane po zmianach opcji.
  - Wymaganie: aktualizuj help/docs w tej samej zmianie (CI check).
- Blad: nazwy opcji byly niespojnie nazywane.
  - Wymaganie: spojny kebab‑case bez nadmiaru aliasow.
- Blad: `--force` nie ostrzegal o ryzyku.
  - Wymaganie: jawny warning w output.
- Blad: brak trybu `--yes/--non-interactive` utrudnial CI.
  - Wymaganie: dodaj tryb bez promptow.
- Blad: brak `--json` utrudnial automatyzacje.
  - Wymaganie: `--json` dla kluczowych komend.
- Blad: brak informacji o wykrytym root/workspace.
  - Wymaganie: wypisz resolved root w output.
- Blad: domyslny target byl ukryty.
  - Wymaganie: zawsze wypisuj efektywny target.
- Blad: nieznane argumenty byly ignorowane.
  - Wymaganie: fail‑fast z sugestiami.

- Blad: `rm -rf $VAR` z pustym VAR usuwal zle katalogi.
  - Wymaganie: guard na pusta sciezke i walidacja root.
- Blad: kopiowanie `cp -r` dereferowalo symlinki.
  - Wymaganie: zachowuj symlinki albo jawnie je blokuj.
- Blad: nowe pliki byly tworzone poza `seal-out`.
  - Wymaganie: generowane pliki tylko w `seal-out`/outDir.
- Blad: `mktemp` korzystalo z domyslnego /tmp na `noexec`.
  - Wymaganie: jawny base dir + walidacja mount flags.
- Blad: bledy `EINTR` nie byly obslugiwane.
  - Wymaganie: retry na `EINTR` dla kluczowych operacji FS.
- Blad: `pkill` ubijal zle procesy po nazwie.
  - Wymaganie: weryfikuj PID i `cmdline` przed kill.
- Blad: otwarte FD wyciekaly do child procesow.
  - Wymaganie: ustaw `FD_CLOEXEC` i zamykaj w `finally`.
- Blad: `chmod -R` zmienial perms na calym release.
  - Wymaganie: ustawiaj perms selektywnie.
- Blad: segmenty sciezki z inputu umozliwialy path traversal.
  - Wymaganie: sanitizuj segmenty (brak `..`/absolutnych).
- Blad: brak `fsync` po zapisie krytycznych plikow.
  - Wymaganie: `fsync` pliku i katalogu.

- Blad: requesty HTTP wisialy bez timeoutow.
  - Wymaganie: `connect` i `total` timeout dla kazdego requestu.
- Blad: retry byly wykonywane dla nie‑idempotentnych operacji.
  - Wymaganie: retry tylko dla idempotentnych lub jawnie oznaczonych.
- Blad: komunikaty nie rozrozniay DNS/timeout/TLS.
  - Wymaganie: rozrozniaj typ bledu w komunikacie.
- Blad: TLS wylaczony przez ENV bez ostrzezenia.
  - Wymaganie: `TLS verify off` tylko opt‑in z ostrzezeniem.
- Blad: proxy z ENV bylo uzywane mimo braku zgody.
  - Wymaganie: proxy tylko gdy jawnie wlaczone w configu.
- Blad: redirecty bez limitu mogly zawiesic request.
  - Wymaganie: limituj redirecty i loguj finalny URL.
- Blad: polaczenia HTTP nie byly domykane i wyciekaly.
  - Wymaganie: ustaw keep‑alive z timeoutem lub zamykaj sockety.
- Blad: brak heartbeat dla polaczen dlugich (ws/long‑poll).
  - Wymaganie: heartbeat/ping + timeout.

## Dodatkowe wnioski (batch 101-110)

- Blad: uzycie `sed -i` bez uwzglednienia roznic GNU/BSD powodowalo awarie skryptow.
  - Wymaganie: stosuj wrapper `sed_inplace` z detekcja platformy albo `perl -pi`/`python -i`.
- Blad: archiwa (`.tgz/.gz`) zawieraly timestampy i byly niedeterministyczne.
  - Wymaganie: dla gzip uzywaj `-n`, a dla tar ustaw `--sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner`.
- Blad: brak preflight wolnego miejsca lokalnie powodowal fail podczas builda.
  - Wymaganie: sprawdz `df`/wolne miejsce lokalnie przed ciezkimi operacjami.
- Blad: tymczasowe pliki byly tworzone w katalogu world‑writable bez zabezpieczen przed symlink attack.
  - Wymaganie: tworz tmp przez `mkstemp`/`O_EXCL` + `lstat` (brak symlink/hardlink).
- Blad: `read` bez `IFS=` i `-r` tracil biale znaki/backslashe w liniach.
  - Wymaganie: uzywaj `IFS= read -r` dla wierszy z plikow.
- Blad: archiwizacja dereferowala symlinki i mogla wyciagnac pliki spoza root.
  - Wymaganie: blokuj/detekuj symlinki przed archiwizacja (lub archiwizuj linki jako linki).
- Blad: `PATH` zawieral `.` i uruchamial zly binarny (hijack).
  - Wymaganie: ustaw bezpieczny `PATH` bez `.` i loguj go.
- Blad: zbyt niski limit `ulimit -n` powodowal losowe bledy I/O.
  - Wymaganie: sprawdz `ulimit -n` i ostrzegaj/ustaw minimalny limit.
- Blad: transfery nie zachowywaly `mtime`/perms, co psulo diff/rollback.
  - Wymaganie: przy synchronizacji uzywaj odpowiednich flag (`rsync -a`, `scp -p`).
- Blad: rozpakowanie archiwum bez limitu rozmiaru/liczby plikow moglo zrobic „zip bomb”.
  - Wymaganie: narzuc limity (max size/entries) i fail‑fast po przekroczeniu.

## Dodatkowe wnioski (batch 111-120)

- Blad: `apt/dpkg` byl zablokowany przez inny proces, a instalator wisial bez konca.
  - Wymaganie: dodaj retry/backoff lub czekanie na lock z timeoutem i jasnym komunikatem.
- Blad: testy dockerowe uzywaly niepinowanych obrazow, co dawalo dryf zachowania.
  - Wymaganie: pinuj obrazy do digestu (sha256) lub jawnej wersji.
- Blad: `stat`/`date` mialy inne flagi na roznych dystrybucjach, co psulo skrypty.
  - Wymaganie: stosuj wrapper z detekcja wariantu lub `python -c` do uzyskania metadanych.
- Blad: skrypty bash nie byly lintowane i zawieraly subtelne bledy.
  - Wymaganie: uruchamiaj `shellcheck` w CI dla wszystkich skryptow.
- Blad: zaleznosci natywne (`node-gyp`) failowaly przez brak `python3`.
  - Wymaganie: preflight sprawdza `python3` i daje instrukcje instalacji.
- Blad: time‑based guardy failowaly przy duzym drift czasu systemowego.
  - Wymaganie: wykrywaj duzy drift (np. >5 min) i fail‑fast z instrukcja synchronizacji czasu.
- Blad: `nproc` zwracal wysoka wartosc w CI i kompilacja wysypywala RAM.
  - Wymaganie: limituj rownoleglosc takze wzgledem dostepnej pamieci.
- Blad: komendy `git` wisialy na pagerze (`less`) w trybie nieinteraktywnym.
  - Wymaganie: ustaw `GIT_PAGER=cat` i `PAGER=cat` dla nieinteraktywnych wywolan.
- Blad: narzedzia wykrywaly TTY i wlaczaly tryb interaktywny mimo CI.
  - Wymaganie: ustaw `TERM=dumb` lub `CI=1`, aby wymusic tryb nieinteraktywny.
- Blad: brak jawnego `LC_ALL=C` w skryptach powodowal roznice sortowania.
  - Wymaganie: ustaw `LC_ALL=C` w miejscach, gdzie parse/sort zalezy od locale.

## Dodatkowe wnioski (batch 121-125)

- Blad: bledy CLI byly wypisywane na stdout, a exit code byl 0.
  - Wymaganie: bledy pisz do stderr i zwracaj nie‑zero; bledy uzycia maja osobny kod.
- Blad: pliki konfiguracyjne/sekretow byly czytane bez weryfikacji typu (mogly byc FIFO/urzadzenie).
  - Wymaganie: przed odczytem sprawdz `lstat` i wymagaj **regular file**.
- Blad: otwieranie wrazliwych plikow podazalo za symlinkami.
  - Wymaganie: stosuj `O_NOFOLLOW` albo jawny `lstat` + `open` tylko na regular file.
- Blad: rozpakowanie archiwum pozwalalo na pliki specjalne (device/FIFO).
  - Wymaganie: odrzucaj entries inne niz regular file/dir/symlink.
- Blad: CLI nie rozroznial bledow uzycia od bledow runtime.
  - Wymaganie: bledy uzycia zwracaja kod (np. 2) i wypisuja skrocony help.

## Dodatkowe wnioski (batch 126-130)

- Blad: `buildId`/timestamp byl generowany w lokalnej strefie i mylil daty w nazwach artefaktow.
  - Wymaganie: uzywaj UTC (ISO/`YYYYMMDD-HHMMSS`) i dokumentuj format.
- Blad: identyfikatory/nonce byly generowane przez `Math.random`, co jest slabe kryptograficznie.
  - Wymaganie: do ID/nonce uzywaj `crypto.randomUUID()` lub `crypto.randomBytes`.
- Blad: opcje enum (np. `packager`) byly case‑sensitive, co prowadzilo do trudnych bledow.
  - Wymaganie: normalizuj do lower‑case i waliduj przeciwko whitelist.
- Blad: porty w configu nie byly walidowane (0/ujemne/>65535), co dawalo niejasne bledy.
  - Wymaganie: waliduj zakres portu 1‑65535 i dawaj jasny blad.
- Blad: komunikaty bledow podawaly sciezki relatywne, przez co diagnostyka byla mylaca.
  - Wymaganie: wypisuj absolutna sciezke do pliku w bledach.

## Dodatkowe wnioski (batch 141-145)

- Blad: lock PID byl weryfikowany bez sprawdzania start‑time/cmdline, co powodowalo false‑positive przez reuse PID.
  - Wymaganie: przy walidacji locka sprawdzaj start‑time/cmdline procesu.
- Blad: `chmod`/`chown` podazaly za symlinkami i modyfikowaly pliki poza root.
  - Wymaganie: uzywaj `--no-dereference`/`-h` lub jawnie blokuj symlinki.
- Blad: `readdir`/`glob` zwracaly losowa kolejnosc, co psulo deterministyczne operacje.
  - Wymaganie: sortuj liste plikow przed dalszym przetwarzaniem.
- Blad: rekurencyjne skanowanie nie mialo limitu i moglo wpasc w petle (symlinki).
  - Wymaganie: stosuj limit glebokosci lub trackuj inode/realpath, aby uniknac petli.
- Blad: `find`/skanowanie przechodzilo przez mount‑pointy i lapalo niechciane FS.
  - Wymaganie: uzywaj `-xdev` lub jawnego ograniczenia do jednego FS.

## Dodatkowe wnioski (batch 146-150)

- Blad: `--json` output byl zanieczyszczony logami i nie dało sie go parsować.
  - Wymaganie: w trybie `--json` stdout zawiera tylko JSON, a logi ida na stderr.
- Blad: `timeout` byl niedostepny lub roznil sie na busybox, przez co procesy wisialy.
  - Wymaganie: sprawdz `timeout` i w razie braku uzyj wlasnych timeoutow w kodzie.
- Blad: skrypty sprzatania usuwaly tylko `*`, zostawiajac dotfiles.
  - Wymaganie: cleanup musi obejmowac dotfiles (np. `find` albo `shopt -s dotglob`).
- Blad: `/proc` byl niedostepny (hidepid=2), co psulo checki bez jasnego komunikatu.
  - Wymaganie: wykryj brak dostepu do `/proc` i fail‑fast z instrukcja zmiany mount options.
- Blad: `mkdir -p` na istniejacym pliku dawało mylące bledy.
  - Wymaganie: przed `mkdir -p` sprawdz, czy sciezka nie wskazuje na plik.

## Dodatkowe wnioski (batch 151-155)

- Blad: case‑insensitive FS powodowal kolizje nazw (np. `App` vs `app`).
  - Wymaganie: wykrywaj kolizje case‑insensitive i fail‑fast z jasnym bledem.
- Blad: destrukcyjne operacje byly dozwolone na niebezpiecznych sciezkach (`/`, `/home`, `C:\\`).
  - Wymaganie: jawna denylista niebezpiecznych katalogow i twardy fail.
- Blad: nazwy plikow z kontrolnymi znakami psuly logi lub komendy shell.
  - Wymaganie: sanitizuj/escapuj nazwy plikow w logach i przy budowie komend.
- Blad: zbyt dlugie sciezki (`ENAMETOOLONG`) dawaly nieczytelny blad w polowie operacji.
  - Wymaganie: waliduj dlugosc sciezek i wypisz jasna instrukcje skrocenia.
- Blad: `fs.watch`/watchery byly uzywane do krytycznych decyzji, mimo ze sa niestabilne.
  - Wymaganie: watchery tylko pomocniczo; logika krytyczna opiera sie na polling/explicit checks.

## Dodatkowe wnioski (batch 156-160)

- Blad: archiwa przenosily bity `setuid/setgid`, co moglo eskalowac uprawnienia po rozpakowaniu.
  - Wymaganie: po rozpakowaniu usuwaj bity `setuid/setgid` (chmod u-s,g-s) i weryfikuj perms.
- Blad: artefakty zawieraly szum systemowy (`.DS_Store`, `Thumbs.db`), co psulo diffy i kontrole.
  - Wymaganie: filtruj znane pliki smieciowe na etapie bundlingu/archiwizacji.
- Blad: przekazywanie duzych danych przez CLI powodowalo `E2BIG`.
  - Wymaganie: duze dane przekazuj przez plik/STDIN, nie przez argumenty.
- Blad: `tar`/`cp -a` zachowywal bity wykonywalne na plikach, ktore nie powinny byc wykonywalne.
  - Wymaganie: po rozpakowaniu/kopiowaniu jawnie ustaw `chmod` dla binarek i pozostalych plikow.
- Blad: `PATH` wybieral narzedzia z nieoczekiwanych lokalizacji (np. snap), co dawalo inne zachowanie.
  - Wymaganie: loguj sciezki i pozwol wymusic konkretne binarki w configu.

## Dodatkowe wnioski (batch 161-165)

- Blad: skrypty uzywaly `grep -P`/`sed -r`, ktore nie dzialaja na busybox/bsd.
  - Wymaganie: unikaj nieportowalnych opcji lub wykrywaj wariant i stosuj alternatywy.
- Blad: `readlink -f` nie dzialal na macOS, co psulo realpath.
  - Wymaganie: uzywaj portable `realpath` (python/node) albo wykrywaj platforme.
- Blad: brak `sha256sum` powodowal awarie w weryfikacji checksum.
  - Wymaganie: sprawdz dostepnosc hashera i zapewnij fallback (`shasum -a 256`/`openssl dgst`).
- Blad: skrypty zakladaly GNU tar, a na busybox brakowalo flag.
  - Wymaganie: wykrywaj `tar --version` i fail‑fast z instrukcja, gdy brakuje wymaganych opcji.
- Blad: `sort -z` nie bylo dostepne, przez co pipeline z `-print0` sie psul.
  - Wymaganie: unikaj `sort -z` lub sprawdzaj wsparcie i przechodz na alternatywę.

## Dodatkowe wnioski (batch 166-170)

- Blad: `localhost` rozwiązywal sie do IPv6, a serwis nasluchiwal tylko na IPv4 (lub odwrotnie).
  - Wymaganie: uzywaj jawnego hosta (`127.0.0.1`/`::1`) albo wymuszaj dual‑stack.
- Blad: losowanie portu przed startem serwera dawalo race i `EADDRINUSE`.
  - Wymaganie: binduj na porcie `0` i odczytuj faktycznie przydzielony port.
- Blad: testy/diagnostyka nie logowaly docelowego host/port, utrudniajac debug.
  - Wymaganie: zawsze loguj `host:port` po starcie serwera.
- Blad: domyslnie bindowano na `0.0.0.0`, co wystawialo serwis publicznie w dev/test.
  - Wymaganie: domyslny bind to `127.0.0.1`, a publiczny bind tylko jawnie.
- Blad: przy `EADDRINUSE` brakowalo czytelnej sugestii kolejnego kroku.
  - Wymaganie: przy kolizji portu wypisz PID/komende i zasugeruj inny port.

## Dodatkowe wnioski (batch 171-175)

- Blad: unit systemd restartowal w petli bez backoff, zalewajac logi i CPU.
  - Wymaganie: ustaw `RestartSec` i `StartLimit*` (backoff, limit restartow).
- Blad: `TimeoutStopSec` byl zbyt niski lub domyslny, przez co proces byl ubijany bez sprzatania.
  - Wymaganie: ustaw odpowiedni `TimeoutStopSec` i opcjonalny `ExecStop`.
- Blad: `KillMode` pozwalal pozostac procesom potomnym po `stop`.
  - Wymaganie: ustaw `KillMode=control-group` (lub `mixed`) aby zabijac cala grupę.
- Blad: brak `LimitNOFILE` powodowal losowe bledy przy wiekszej liczbie polaczen.
  - Wymaganie: ustaw `LimitNOFILE` do bezpiecznej wartosci.
- Blad: `EnvironmentFile` w unit byl względny i nie byl znajdowany.
  - Wymaganie: uzywaj absolutnych sciezek w `EnvironmentFile`.

## Dodatkowe wnioski (batch 176-180)

- Blad: brak cudzyslowu wokol zmiennych w bash powodowal word‑splitting i globbing.
  - Wymaganie: zawsze cytuj zmienne (`\"$var\"`) i ustaw `IFS=$'\\n\\t'` w skryptach.
- Blad: `flock` bez timeoutu wisial, blokujac operacje na locku.
  - Wymaganie: uzywaj `flock -w <sec>` i dawaj czytelny blad po timeout.
- Blad: `echo -e` zachowywal sie inaczej miedzy shellami i psul output.
  - Wymaganie: uzywaj `printf` zamiast `echo -e`.
- Blad: `trap` na cleanup byl ustawiany za pozno, więc bledy wczesne zostawialy smieci.
  - Wymaganie: `trap` ustawiaj na poczatku skryptu.
- Blad: petle `while read` gubily ostatnia linie bez `\\n`.
  - Wymaganie: uzywaj `while IFS= read -r line || [ -n \"$line\" ]; do ...`.
## Dodatkowe wnioski (batch 131-135)

- Blad: rekurencyjne skanowanie katalogow bralo `.git`, `node_modules`, `seal-out`, co powodowalo spowolnienia i przypadkowe artefakty.
  - Wymaganie: przy skanowaniu repo zawsze ignoruj katalogi generowane i VCS.
- Blad: obliczanie hashy ladowalo caly plik do pamieci, co crashowalo na duzych plikach.
  - Wymaganie: hashuj strumieniowo, nie trzymac calego pliku w RAM.
- Blad: raporty/logi rosly bez ograniczen i zapychaly dysk.
  - Wymaganie: limituj rozmiar logow/raportow (rotacja, max lines/bytes).
- Blad: generowane manifesty byly zapisywane bez jawnego `mode`, co dawalo losowe uprawnienia.
  - Wymaganie: ustawiaj `mode` przy `fs.open` (np. `0o600/0o644`) zamiast polegac na umask.
- Blad: walidacja sciezek dopuszczala `..` po normalizacji (np. `path.join` z absolutnym segmentem).
  - Wymaganie: zawsze sprawdz `realpath` i wymagaj, by sciezka byla w dozwolonym root.

## Dodatkowe wnioski (batch 136-140)

- Blad: `rm -rf` przekraczal granice mount pointow i usuwal za duzo.
  - Wymaganie: stosuj `--one-file-system` lub jawne sprawdzenie mount pointu.
- Blad: zapisy JSON/manifestow byly niestabilne (kolejnosc kluczy losowa).
  - Wymaganie: sortuj klucze i zapisuj stabilnie (deterministyczny stringify).
- Blad: rozpakowanie tar zachowywalo zbyt szerokie perms z archiwum.
  - Wymaganie: uzywaj `--no-same-permissions` i/lub jawnego `chmod` po rozpakowaniu.
- Blad: `rsync` zachowywal perms, ktore nie pasowaly do wymaganego modelu uprawnien.
  - Wymaganie: wymusz perms przez `--chmod=...` albo `--no-perms` + jawny `chmod`.
- Blad: narzedzia ignorowaly `umask` przy tworzeniu katalogow przez `cp -a`/`tar`.
  - Wymaganie: po kopiowaniu jawnie ustaw perms na katalogach docelowych.

## Dodatkowe wnioski (batch 181-185)

- Blad: skrypt uzywal bash‑owych funkcji pod `/bin/sh`, co psulo wykonanie.
  - Wymaganie: ustaw poprawny shebang (`#!/usr/bin/env bash`) lub pisz czysty POSIX sh.
- Blad: uzycie `$*` gubilo rozdzielenie argumentow.
  - Wymaganie: przekazuj parametry jako `"$@"`.
- Blad: tmp katalog byl tworzony recznie (`/tmp/foo`), co prowadzilo do kolizji i race.
  - Wymaganie: uzywaj `mktemp -d` z losowym sufiksem.
- Blad: `pushd/popd` w /bin/sh nie dzialalo i psulo skrypty.
  - Wymaganie: w sh uzywaj `cd` + `pwd` lub wymagaj bash.
- Blad: `echo` interpretowal `-n`/`-e` w danych i psul output.
  - Wymaganie: do danych uzywaj `printf '%s\n'`.

## Dodatkowe wnioski (batch 186-190)

- Blad: brak `UMask` w unit powodowal zbyt szerokie perms dla plikow tworzonych przez serwis.
  - Wymaganie: ustaw `UMask=` w unit zgodnie z polityka uprawnien.
- Blad: katalogi runtime/state byly tworzone recznie z blednymi perms.
  - Wymaganie: uzywaj `RuntimeDirectory`/`StateDirectory` w systemd zamiast recznego mkdir.
- Blad: `--dry-run` wykonywal czesciowe zmiany (tmp/pliki), co mylilo uzytkownika.
  - Wymaganie: `--dry-run` nie ma efektow ubocznych; loguje planowane akcje.
- Blad: `--json` output nie mial wersji schematu, co psulo automatyzacje po zmianach.
  - Wymaganie: dodaj `schemaVersion` i utrzymuj kompatybilnosc wsteczna.
- Blad: CLI zwracal exit code 0 przy ostrzezeniach, bez informacji w JSON.
  - Wymaganie: dla ostrzezen dodaj pole `warnings[]` i jawnie je wypisz.

## Dodatkowe wnioski (batch 191-195)

- Blad: `flock` na NFS nie dzialal, wiec lock nie chronil przed rownoleglym uruchomieniem.
  - Wymaganie: wykryj NFS/nieobsługiwany FS i uzyj lock‑dir/atomic mkdir lub fail‑fast.
- Blad: pliki byly nadpisywane mimo oczekiwania "create‑only".
  - Wymaganie: uzywaj `O_EXCL`/`flag: 'wx'` gdy overwrite nie jest dozwolony.
- Blad: wartosci z ENV zawieraly znaki nowej linii, co psulo logi i komendy.
  - Wymaganie: sanitizuj/stripuj kontrolne znaki z inputu ENV.
- Blad: ścieżki relatywne byly rozstrzygane po zmianie `cwd`, co prowadzilo do bledow.
  - Wymaganie: resolve do absolutnych sciezek na starcie i używaj tylko ich.
- Blad: lockfile nie zawieral hosta, przez co w środowiskach współdzielonych mylono procesy.
  - Wymaganie: zapisuj w locku `hostname`/`pid`/`startTime` i weryfikuj zgodnosc.

## Dodatkowe wnioski (batch 196-200)

- Blad: `systemctl`/`journalctl` uruchamialy pager i wisialy w trybie nieinteraktywnym.
  - Wymaganie: uzywaj `--no-pager` lub `SYSTEMD_PAGER=cat`.
- Blad: `sudo` wymagalo TTY (`requiretty`) i komendy failowaly bez czytelnej informacji.
  - Wymaganie: wykrywaj ten blad i podawaj instrukcje (sudoers/ssh -t).
- Blad: `rsync` zostawial `.*.partial` po przerwanym transferze.
  - Wymaganie: uzywaj `--partial-dir` w temp i sprzataj przy failu.
- Blad: `scp` w nowych OpenSSH domyslnie uzywa SFTP i nie dziala z niektorymi serwerami.
  - Wymaganie: pozwol wymusic `scp -O` lub preferuj `rsync`/`sftp`.
- Blad: logi z narzedzi mialy ANSI/pager i psuly parse.
  - Wymaganie: ustaw `NO_COLOR=1`/`--no-ansi`/`--no-pager` tam gdzie to mozliwe.

## Dodatkowe wnioski (batch 201-205)

- Blad: JSON/JSON5 z duplikatami kluczy nadpisywal wartosci bez ostrzezenia.
  - Wymaganie: wykrywaj duplikaty kluczy i fail‑fast lub loguj warning.
- Blad: config mial nieoczekiwanie duzy rozmiar (MB), co psulo parse i pamiec.
  - Wymaganie: ustaw max size dla configu i odrzuc zbyt duze pliki.
- Blad: config zawieral binarne dane/nie‑UTF8, co psulo parser i logi.
  - Wymaganie: wymusz UTF‑8 i odrzuc binarne pliki.
- Blad: brak jasnej kolejnosci precedence (CLI/ENV/file) dawalo niespodziewane wartosci.
  - Wymaganie: zdefiniuj i loguj precedence (np. CLI > ENV > file).
- Blad: parser evalowal wartosci z configu (np. `new Function`), co bylo ryzykowne.
  - Wymaganie: brak `eval`; tylko bezpieczny parser + walidacja.

## Dodatkowe wnioski (batch 206-210)

- Blad: zapis na stdout przy zamknietym pipe powodowal `EPIPE` i crash.
  - Wymaganie: obsluguj `EPIPE`/`SIGPIPE` i koncz proces cicho.
- Blad: masowe operacje FS otwieraly zbyt wiele plikow (`EMFILE`).
  - Wymaganie: limituj równoległość I/O (kolejka/semafor).
- Blad: deskryptory plikow nie byly domykane przy bledzie.
  - Wymaganie: zawsze `close()` w `finally` (takze przy error).
- Blad: `mkdir -p` przechodzil mimo `EEXIST`, gdy pod sciezka byl plik, co psulo logike.
  - Wymaganie: przy `EEXIST` sprawdz, czy to katalog; inaczej fail‑fast.
- Blad: `writeFile`/`appendFile` bez `fsync` powodowal utrate danych po crashu.
  - Wymaganie: dla krytycznych plikow uzywaj `fsync` po zapisie.

## Dodatkowe wnioski (batch 211-215)

- Blad: testy sprawdzaly narzedzia przez `bash -lc command -v`, co failowalo na minimalnych obrazach bez bash.
  - Wymaganie: wykrywaj narzedzia przez PATH (bez bash) lub uzyj POSIX `/bin/sh` z jasnym SKIP.
- Blad: env override przyjmowal tylko wąski zestaw wartosci i ignorowal `true/false/1/0`.
  - Wymaganie: parsuj boolean‑like stringi (`true/false/1/0/yes/no/on/off`).
- Blad: detekcja komendy sprawdzala tylko istnienie pliku, bez `X_OK`, co dawalo false‑positive.
  - Wymaganie: sprawdz `X_OK`/wykonywalnosc przy detekcji narzedzi.
- Blad: niepoprawne wartosci w ENV byly ignorowane bez ostrzezenia.
  - Wymaganie: loguj ostrzezenie i pokazuj przyjeta wartosc domyslna.
- Blad: helpery E2E duplikowaly logike wykrywania narzedzi, co prowadzilo do niespojnosci.
  - Wymaganie: uzywaj wspolnego helpera do detekcji narzedzi.

## Dodatkowe wnioski (batch 216-220)

- Blad: szablon/init wlaczal opcjonalne narzedzia (np. obfuscator) bez pewnosci instalacji, co psulo pierwszy build.
  - Wymaganie: template nie wlacza opcjonalnych narzedzi domyslnie; wymagany jest jawny opt‑in.
- Blad: brak rozroznienia miedzy „feature enabled” a „tool dostępny” powodowal niejasne awarie.
  - Wymaganie: przed buildem sprawdz dostepnosc narzedzia i dawaj jasny blad z instrukcja.
- Blad: domyslna konfiguracja byla „production‑strict” i zbyt wymagajaca dla dev.
  - Wymaganie: domyslny profil jest bezpieczny dla dev; tryby stricte‑secure wymagaja jawnego wyboru.
- Blad: brak informacji o skutkach wlaczenia zabezpieczen (np. potrzeba toolchain).
  - Wymaganie: dokumentuj koszt/warunki wlaczenia kazdego zabezpieczenia (toolchain, OS).
- Blad: brak testu „minimalnego” profilu utrudnial diagnoze regresji.
  - Wymaganie: testy E2E obejmuja profil minimalny + profil maksymalny.
