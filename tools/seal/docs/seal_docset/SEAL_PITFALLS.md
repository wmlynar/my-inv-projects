# SEAL_PITFALLS - Bledy do unikania

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

ID reguly: kazda pozycja `Zasada:` / `Blad:` ma unikalny identyfikator `PIT-XXXX` (stabilny w ramach pliku, do linkowania z innych dokumentow).

## Spis tresci (skrot)

- Wnioski ogolne (meta-zasady)
- Zasady ogólne (cross-cutting)
- Deploy / bootstrap (auto-bootstrap)
- Build / packaging
- Testy / CI
- Deploy / infrastruktura
- CLI / UX spojnosci
- Runtime config
- Logowanie / bezpieczenstwo
- UI availability / aktualizacje
- UI niezawodnosc / polaczenia
- UI input / tablety (klik, long-press, scroll)
- UI guidelines (praktyki z hali)
- Co sprawdzac po zmianach (checklist)
- Dodatkowe wnioski (batch 100+; kolejne sekcje "Dodatkowe wnioski ...")

## Wnioski ogolne (meta-zasady)

- [PIT-0001] Zasada: kazdy plik/artefakt ma jawny root, retention i komenda sprzatania; nowe cache wymagaja wpisu w `SEAL_CACHE_GUIDE`.
- [PIT-0002] Zasada: zero ukrytych tempow; tmp root musi byc kontrolowany i logowany.
- [PIT-0003] Zasada: jedno zrodlo prawdy dla defaultow/sciezek/cleanup; entrypointy nie maja lokalnych defaultow ani rozproszonego lifecycle tempow.
- [PIT-0004] Zasada: bezpieczne defaulty (single + stale katalogi); tryby ryzykowne tylko jawnie.
- [PIT-0005] Zasada: brak cichych fallbackow; kazdy fallback loguje powod, scope i konsekwencje.
- [PIT-0006] Zasada: preflight zasobow (disk/inodes/ram) i uprawnien przed startem; fail-fast z instrukcja.
- [PIT-0007] Zasada: loguj effective config, wersje narzedzi oraz sciezki (tmp/cache/log/summary) na starcie; to jedyny audyt runu.
- [PIT-0008] Zasada: cleanup deterministyczny i idempotentny na exit/SIGINT/SIGTERM, odporny na partial runy i sprawdzany w E2E.
- [PIT-0009] Zasada: operacje destrukcyjne tylko w allowlist roots + realpath check.
- [PIT-0010] Zasada: wspoldzielone zasoby pod lockiem; inaczej race i flake.
- [PIT-0011] Zasada: globalny stan (cache/tmp) izolowany per-run i oznaczony markerem ownera, aby cleanup po crashu byl bezpieczny.
- [PIT-0012] Zasada: E2E obejmuje negatywne sciezki, cleanup i raportowanie, nie tylko happy path.
- [PIT-0013] Zasada: kazdy cache ma jawny scope (build/e2e/toolchain/global) i nie miesza danych miedzy scope.
- [PIT-0014] Zasada: komendy sprzatania loguja docelowe sciezki i efekt (co usunieto/ominięto).
- [PIT-0015] Zasada: po instalacji narzedzi nie zostawiaj zrodel/buildow bez jawnej flagi "keep".
- [PIT-0016] Zasada: logi/summary trafiaja do trwalego katalogu cache, nie do tmp.

## Zasady ogólne (cross-cutting)

- [PIT-0017] Blad: brak walidacji argumentow/parametrow powodowal niejasne bledy runtime.
  - Wymaganie: wszystkie wejscia (CLI/config) maja walidacje typow/zakresow; bledne = fail-fast.

- [PIT-0018] Blad: komendy shellowe byly skladane przez konkatenacje stringow (sciezki z bialymi znakami, wstrzykniecia).
  - Wymaganie: uzywaj `spawn`/`execFile` z args array i `shell: false`.
  - Wymaganie: gdy shell jest konieczny (ssh/rsync), stosuj `--` i bezpieczne quoting; sanitizuj wszystkie fragmenty pochodzace z configu.

- [PIT-0019] Blad: `ssh` konkatenowal argumenty zdalnej komendy bez quoting (np. `ssh host bash -lc cmd arg`), co gubilo cudzyslowy i zmienialo znaczenie argumentow z spacjami.
  - Wymaganie: zdalna komenda dla `ssh` jest przekazywana jako **jedna** string‑komenda, a argumenty sa jawnie quotingowane (shell‑escape) po stronie klienta.

- [PIT-0020] Blad: `shQuote()` chronil przed metaznakami, ale wartosci z `\\n`/znakami kontrolnymi rozbijaly skrypt bash (multi‑line injection) przy wstawianiu do komend lub heredoc.
  - Wymaganie: przed `shQuote` waliduj brak znakow kontrolnych (`<0x20` i `DEL`), w tym `\\n/\\r/\\t`; invalid = fail‑fast.

- [PIT-0021] Blad: `exec()` z domyslnym `maxBuffer` obcinal output lub powodowal bledy przy wiekszych logach.
  - Wymaganie: preferuj `spawn`/`execFile`; jesli uzywasz `exec`, ustaw `maxBuffer` i loguj gdy zostal przekroczony.

- [PIT-0022] Blad: parsery polegaly na outputach narzedzi zaleznych od locale (np. `df`, `lsblk`) i rozjezdzaly sie na innych systemach.
  - Wymaganie: ustaw `LC_ALL=C` (lub `LANG=C`) dla komend parsowanych tekstowo, albo uzywaj trybu `--json`/`--output`.

- [PIT-0023] Blad: brakujace narzedzie (`ENOENT` z `spawnSync`) bylo raportowane jako ogolny blad, bez informacji o tym, co zainstalowac.
  - Wymaganie: wykrywaj `ENOENT` i wypisuj jasny komunikat "command not found" + instrukcje instalacji lub hint (check/preflight).

- [PIT-0024] Blad: sciezki zaczynajace sie od `-` byly interpretowane jako opcje (rm/cp/rsync/scp).
  - Wymaganie: zawsze wstaw `--` przed listą sciezek i waliduj, ze sciezka nie jest pusta.

- [PIT-0025] Blad: JSON5 z BOM/CRLF powodowal bledy parsowania na niektorych systemach.
  - Wymaganie: parser usuwa BOM i akceptuje CRLF (normalizuj `\\r\\n` -> `\\n`).

- [PIT-0026] Blad: narzedzia zapisywaly JSON5 przez `JSON.stringify`, co usuwalo komentarze, trailing commas i uklad, a uzytkownik tracil notatki.
  - Wymaganie: edycje JSON5 zachowuja komentarze/format (writer JSON5) albo narzedzie ostrzega o utracie komentarzy i robi backup; zapis nadal musi byc atomowy.

- [PIT-0027] Blad: bledy parsowania JSON/JSON5 nie zawieraly sciezki ani lokalizacji bledu, co utrudnialo debug w CI.
  - Wymaganie: parse error zawiera sciezke, line/col i hint (BOM/CRLF, duplikaty kluczy); brak = FAIL.

- [PIT-0028] Blad: merge configu dopuszczal `__proto__`/`constructor`/`prototype`, co pozwalalo na prototype pollution i dziwne bledy runtime.
  - Wymaganie: merge configu ignoruje/odrzuca klucze proto‑pollution na kazdym poziomie; bledne klucze = FAIL lub jawny warning.

- [PIT-0029] Blad: bardzo gleboko zagniezdzony config powodowal stack overflow lub nadmierny czas walidacji/merge.
  - Wymaganie: ustaw limit glebokosci/ilosci kluczy oraz max rozmiar configu; przekroczenie = fail‑fast z jasnym komunikatem.

- [PIT-0030] Blad: `spawn` dostawal ENV z wartosciami `undefined`/non‑string, co dawalo `ERR_INVALID_ARG_TYPE` albo literalny string `undefined` w procesie potomnym.
  - Wymaganie: przed uruchomieniem child procesow filtruj ENV do stringow; `null/undefined` usuwaj, inne typy serializuj jawnie lub fail‑fast.

- [PIT-0031] Blad: kilka buildow E2E uzywalo tego samego `outDir`, a `buildRelease` czyscil katalog; pozniejsze testy uruchamialy sie na nie tym buildzie (false PASS/FAIL).
  - Wymaganie: kazdy wariant builda w E2E ma osobny `outDir` (unikalny per build/run); nie nadpisuj buildow w tym samym katalogu.

- [PIT-0032] Blad: testy wymuszajace fail (np. `SEAL_*_FORCE=1`) polegaly na domyslnej konfiguracji, ktora mogla sie zmienic przez profil lub override; test byl wykonywany na buildzie bez aktywnej ochrony.
  - Wymaganie: testy wymuszajace fail ustawiają **jawnie** opcje ochrony w configu (np. `antiDebug.ptraceGuard.enabled=true`) i logują effective config lub build meta przed asercją.

- [PIT-0033] Blad: wewnetrzne uruchomienia `node` uzywaly binarki z PATH, co na maszynach z wieloma wersjami Node dawalo niespojne wyniki (inna wersja dla CLI i child procesu).
  - Wymaganie: uruchamiaj child‑node przez `process.execPath` (lub jawnie zweryfikowana sciezke), a w logach wypisz `node -v` i binarke.

- [PIT-0034] Blad: helper testowy tworzyl Promise wyjscia procesu bez konsumpcji; przy `failOnExit=false` dochodzilo do nieobsluzonego rejection.
  - Wymaganie: wszystkie background Promise (exit/error) sa konsumowane (`catch`), nawet gdy nie sa awaitowane; brak = FAIL.

- [PIT-0035] Blad: operacje na sciezkach (rm/rsync/copy) podazaly za symlinkami i mogly wyjsc poza root.
  - Wymaganie: przed operacjami destrukcyjnymi sprawdz `realpath` i czy jest w dozwolonym root.
  - Wymaganie: nie podazaj za symlinkami (`lstat` + blokada) i odrzucaj `..` w identyfikatorach.

- [PIT-0036] Blad: sprawdzanie istnienia pliku przez `accessSync` ignorowalo zerwane symlinki, przez co cleanup nie usuwal ich i kolejne operacje trafialy w nieoczekiwane sciezki.
  - Wymaganie: do cleanupu uzywaj `lstat`/`rm` z obsluga `ENOENT`, a nie `accessSync`; broken symlink traktuj jak istniejący.

- [PIT-0037] Blad: atomic rename failowal (EXDEV), bo tmp byl na innym filesystemie.
  - Wymaganie: tmp dla operacji atomowych tworz w tym samym katalogu/FS co plik docelowy.

- [PIT-0038] Blad: skrypty z CRLF (`^M`) nie uruchamialy sie na Linux (`/bin/sh^M`).
  - Wymaganie: generowane pliki skryptow zawsze z LF (`\n`), bez CRLF; w razie importu stosuj `dos2unix`.

- [PIT-0039] Blad: skrypty shellowe nie mialy `set -euo pipefail`, przez co ukrywaly bledy w pipeline.
  - Wymaganie: kazdy skrypt zdalny/produkcyjny zaczyna sie od `set -euo pipefail`.

- [PIT-0040] Blad: `echo "$VAR" | tee` zapisywalo dane w sposob nieprzewidywalny (wartosci zaczynajace sie od `-`, sekwencje `\\`, brak newline), co dawalo puste lub zmienione pliki konfiguracyjne.
  - Wymaganie: do zapisu danych uzywaj `printf '%s\\n' "$VAR"` (bez `echo`), zgodnie z STD-382.

- [PIT-0041] Blad: `pipefail` bylo uzywane pod `/bin/sh` (dash) i skrypt nie startowal (`set: Illegal option -o pipefail`).
  - Wymaganie: jesli uzywasz `pipefail`, uruchamiaj skrypt przez `bash` albo sprawdz wsparcie i ustawiaj `pipefail` warunkowo.

- [PIT-0042] Blad: pipeline z `tee` przerywal testy (SIGPIPE) gdy odbiorca zamknal stdout, a `pipefail` traktowal to jako błąd.
  - Wymaganie: przy `tee` obsłuż SIGPIPE (np. `set +o pipefail` dla tej linii lub kontrola `PIPESTATUS`), aby unikac fałszywych porażek.

- [PIT-0043] Blad: `rm -rf "$DIR"/*` przy pustym `DIR` kasowal `/` (lub inne krytyczne katalogi).
  - Wymaganie: przed destrukcyjnym `rm` wymagaj niepustego `DIR` + `realpath` w dozwolonym root.
  - Wymaganie: stosuj helper typu `safeRmDir(dir, root)` zamiast inline `rm`.

- [PIT-0044] Blad: `set -e` przerywal skrypt na `grep`/`diff` zwracajacych 1 (brak dopasowania), mimo ze to nie byl błąd.
  - Wymaganie: dla `grep`/`diff` uzywaj jawnego sprawdzania exit code lub `|| true` + test warunku.

- [PIT-0045] Blad: `grep` byl uzywany bez `-F` do wyszukiwania literalnych sciezek (np. `ExecStart=/path/run-current.sh`), przez co znaki regex (np. kropki) dawaly falszywe dopasowania.
  - Wymaganie: dla literalnych matchy uzywaj `grep -F` (lub escapuj regex), a dla sciezek zawsze traktuj wzorzec jako literal.

- [PIT-0046] Blad: procesy uruchamiane w trybie automatycznym miały stdin z TTY i wchodzily w tryb interaktywny.
  - Wymaganie: dla nieinteraktywnych komend ustaw `stdio: ["ignore", ...]` lub `input: ""`.

- [PIT-0047] Blad: narzedzia zewnetrzne (git/ssh/rsync) prosily o haslo/hostkey i testy/deploy wisialy bez wyjscia.
  - Wymaganie: ustaw `GIT_TERMINAL_PROMPT=0`, `GIT_ASKPASS=/bin/false`, `SSH_ASKPASS=/bin/false`.
  - Wymaganie: `ssh/scp/rsync` uruchamiaj z `BatchMode=yes` i timeoutem (`ConnectTimeout`, `ServerAliveInterval`).
  - Wymaganie: ustaw `ServerAliveCountMax`, aby unikać nieskończonych wiszeń przy zerwanych połączeniach.

- [PIT-0048] Blad: `ssh` czytal stdin (np. z pipe) i „pożerał” dane wejściowe lub wisiał na braku inputu.
  - Wymaganie: dla komend nieinteraktywnych używaj `ssh -n` albo `</dev/null`, aby odciąć stdin.
  - Wymaganie: wylacz `KbdInteractiveAuthentication`/`PasswordAuthentication` lub wymus `PreferredAuthentications=publickey`, aby unikac ukrytych promptow.

- [PIT-0049] Blad: globalny `~/.ssh/config` wlaczal `ForwardAgent`/`ForwardX11`, co w automacji dawało niepotrzebne forwarding lub ryzyko wycieku kluczy.
  - Wymaganie: w automacji jawnie wylacz forwarding (`-o ForwardAgent=no -o ForwardX11=no -o ForwardX11Trusted=no` lub `-o ClearAllForwardings=yes`).

- [PIT-0050] Blad: bardzo długie komendy `ssh` (wiele `VAR=...` i `&&`) przekraczaly limit dlugosci lub gubily quoting.
  - Wymaganie: dla wieloetapowych operacji uzywaj skryptu (upload + `bash`, lub `ssh host 'bash -s' < script`), zamiast ogromnego one-linera.

- [PIT-0051] Blad: `bash -lc` na hoście zdalnym kończył się kodem != 0 przez `.bash_logout` (np. `clear_console`), mimo że właściwa komenda się wykonała.
  - Wymaganie: do zdalnych jednorazowych komend używaj `bash -c` (nie login shell), albo zapewnij, że `.bash_logout` zwraca 0 i nie emituje outputu.

- [PIT-0052] Blad: katalog sentinela byl zakladany z permami `0710`, przez co serwis uruchamiany jako nie‑root nie mial prawa odczytu i runtime kończył się `[thin] runtime invalid`.
  - Wymaganie: katalog sentinela ma perms `0750` i grupę `serviceGroup`; plik sentinela `0640`, a weryfikacja runtime odbywa się jako `serviceUser`.

- [PIT-0053] Blad: zdalna komenda przez `ssh` (wrap `bash -lc` w jeden argument) zwracala kod != 0 mimo poprawnego wykonania (marker OK w stdout), co powodowalo fałszywy fail.
  - Wymaganie: w krytycznych ścieżkach parsuj marker sukcesu z stdout i nie opieraj się wyłącznie na exit code; preferuj `bash -c` + upload skryptu przy dłuższych komendach.

- [PIT-0054] Blad: poprawki w repozytorium nie mialy efektu, bo uruchamiany byl globalnie zainstalowany `seal` (inna wersja kodu).
  - Wymaganie: loguj sciezke binarki i wersje CLI przy starcie; w dev/test uruchamiaj lokalny CLI (np. `node tools/seal/seal/src/cli.js`) albo `npm link`/`npx` z workspace.

- [PIT-0055] Blad: testy uruchamiane jako root maskowaly problemy uprawnien (np. sentinel dir bez bitu read dla grupy).
  - Wymaganie: krytyczne testy security uruchamiaj jako nie‑root (uid/gid), a E2E musi zawierac wariant non‑root dla sentinela.

- [PIT-0056] Blad: argv0 runtimu bylo hardcoded na `node`, przez co `systemctl status`/`ps` ujawnialy technologie mimo sealowania.
  - Wymaganie: launcher ma konfigurowalny `thin.runtimeArgv0` (domyslnie `n`, opcja `appName`), a projekty ustawiają wartosc jawnie, gdy to istotne.

- [PIT-0057] Blad: deploy/ship nie wykonywal preflightu wolnego miejsca i inode na hoście, przez co upload/budowa zatrzymywały się w polowie z mało czytelnym bledem.
  - Wymaganie: preflight SSH sprawdza wolne miejsce i inodes w `installDir` (i ewentualnie `/tmp`) oraz fail‑fast z jasnym komunikatem i hintem konfiguracji progow (`target.preflight.minFreeMb/minFreeInodes` lub `SEAL_PREFLIGHT_MIN_FREE_*`).

- [PIT-0058] Blad: brak preflightu `/tmp` powodowal fail uploadu artefaktu/payload w polowie (brak miejsca lub brak katalogu).
  - Wymaganie: preflight sprawdza `/tmp` (lub `preflight.tmpDir`) dla miejsca/inodes i istniejącego katalogu; braki = fail‑fast z instrukcja.

- [PIT-0059] Blad: brak weryfikacji narzedzi na hoście (np. `tar`, `gzip`) powodowal błędy dopiero po uploadzie.
  - Wymaganie: preflight SSH sprawdza wymagane narzedzia (`preflight.requireTools`) i fail‑fast z instrukcja instalacji.

- [PIT-0060] Blad: installDir na filesystemie `noexec` powodowal nieczytelne błędy startu.
  - Wymaganie: preflight wykrywa `noexec` dla `installDir` i failuje z instrukcją lub wymaga jawnego override (`preflight.allowNoexec`).

- [PIT-0061] Blad: brak diagnostyki po niejednoznacznym błędzie powodował błądzenie użytkownika po logach.
  - Wymaganie: istnieje komenda `seal diag` generująca paczkę diagnostyczną (check/config/status) do `seal-out/diagnostics`.

- [PIT-0062] Blad: rownolegly deploy potrafil nadpisac `current.buildId` i zostawic host w polowie aktualizacji.
  - Wymaganie: deploy ma blokade (lock) z TTL oraz jasny komunikat o kolizji.

- [PIT-0063] Blad: `--json` w narzedziach zwracal obiekty z `BigInt`, co powodowalo runtime error "Do not know how to serialize a BigInt".
  - Wymaganie: output JSON zawsze serializuje `BigInt` do string/number (jawnie), bez throw; brak = FAIL.

- [PIT-0064] Blad: domyslne hardening flags (np. CET) powodowaly build fail na starszym kompilatorze.
  - Wymaganie: przed wlaczeniem hardeningu uruchom probe kompilatora i auto‑disable z ostrzezeniem; brak = FAIL.

- [PIT-0065] Blad: diagnoza runtime byla wykonywana narzedziami typu `strace`, co aktywowalo anti‑debug i dawalo falszywe "runtime invalid".
  - Wymaganie: dokumentuj tryb diagnostyczny (jawna flaga/ENV) lub bezpieczny probe tool, a E2E weryfikuje, ze diagnoza nie uruchamia anti‑debug bez opt‑in.

- [PIT-0066] Blad: długie deploye/ship konczyly sie timeoutem, zostawiajac artefakty w `/tmp` lub polowiczny stan na hoście, co psulo kolejne uruchomienia.
  - Wymaganie: timeout musi wywolywac cleanup (lokalny i zdalny) oraz logowac, co pozostalo; artefakty w `/tmp` musza byc jednoznacznie tagowane i ignorowane/odśmiecane przy następnym deployu.

- [PIT-0067] Blad: deploy przechodzil mimo „config drift”, a serwis startowal z innym configiem niz repo, co prowadzilo do nieprzewidywalnych zachowan.
  - Wymaganie: przy drift bez jawnej flagi (`--accept-drift`/`--warn-drift`) deploy ma FAIL; zawsze loguj diff i zrodlo configu.

- [PIT-0068] Blad: „auto‑bootstrap” maskowal brak prereq na hoście (np. brak runtime), przez co produkcja zachowywala sie inaczej niz stage.
  - Wymaganie: auto‑bootstrap musi logowac, co zainstalowal i z jakiej wersji; preflight w CI sprawdza kompatybilnosc bez auto‑bootstrap.

- [PIT-0069] Blad: weryfikacja runtime byla uruchamiana jako inny user niz `serviceUser`, co ukrywalo bledy uprawnien (np. brak read dla grupy).
  - Wymaganie: wszystkie weryfikacje runtime (sentinel/launcher) uruchamiaj jako `serviceUser`, a wynik loguj wraz z uid/gid.

- [PIT-0070] Blad: rozproszone defaulty (project/target/CLI) powodowaly sprzeczne ustawienia i bledne zalozenia o „domyslach”.
  - Wymaganie: loguj „effective config” z wyroznieniem zrodla kazdej wartosci (default vs override), a konflikty = warning lub fail‑fast.

- [PIT-0071] Blad: uzywanie stalego namespaceId/appId w wielu projektach powodowalo kolizje sentinela miedzy aplikacjami na tym samym hoście.
  - Wymaganie: namespaceId i appId musza byc unikalne per aplikacja/target; domyslnie generuj per‑target i zapisuj w prywatnym cache, bez recznego kopiowania miedzy projektami.

- [PIT-0072] Blad: reczne kasowanie tylko czesci artefaktow (`/b` lub `/r`) dawalo niekompletna instalacje i trudne do diagnozy bledy.
  - Wymaganie: cleanup ma byc atomowy i obejmowac caly layout release; jesli usuwasz recznie, usun caly `installDir` lub uzyj komendy narzedzia (np. `seal clean`).

- [PIT-0073] Blad: payload-only byl wlaczany, gdy runtime na hoście nie byl zgodny (brak runtime/launcher/metadata), co skutkowalo crashami po deployu.
  - Wymaganie: payload-only tylko przy zweryfikowanej zgodnosci runtime (marker/sha), inaczej wymusz full upload; loguj powod wyboru sciezki.

- [PIT-0074] Blad: bledy w `installDir` (spacje/nieabsolutna sciezka) ujawnialy sie dopiero na systemd/runnerze.
  - Wymaganie: waliduj `installDir` przed deployem i fail‑fast; loguj skorygowana wartosc tylko gdy jest jawna decyzja uzytkownika.

- [PIT-0075] Blad: po nieudanym starcie systemd nie wykonywano `reset-failed`, przez co kolejne restarty byly blokowane lub mylaco raportowane.
  - Wymaganie: po naprawie/redeploy wykonuj `systemctl reset-failed` i loguj status przed/po.

- [PIT-0076] Blad: status systemd `inactive/disabled` byl traktowany jako blad, mimo ze jest to poprawny stan dla zatrzymanego serwisu.
  - Wymaganie: rozrozniaj stan od bledu (np. `failed`/`activating`); tylko `failed` traktuj jako błąd wymagający interwencji.

- [PIT-0077] Blad: readiness weryfikowany tylko przez systemd, mimo ze serwis byl aktywny ale aplikacja nie odpowiadala (false OK).
  - Wymaganie: readiness musi wspierac HTTP (lub healthcheck) i tryb `both`; tryb `systemd` tylko gdy aplikacja nie ma endpointu.

- [PIT-0078] Blad: readiness HTTP byl wykonywany bez timeoutu lub zbyt agresywnie, co powodowalo flaky i fałszywe fail.
  - Wymaganie: timeout i interval musza byc konfigurowalne i logowane; brak ustawien = bezpieczne defaulty.

- [PIT-0079] Blad: rozne komendy (`seal ship`, `seal deploy`, `seal remote`) uzywaly innych domyslnych targetow/configow, co prowadzilo do pomylkowych deployow.
  - Wymaganie: loguj aktywny target/config na starcie kazdej komendy, a brak jawnego targetu w trybie wielo‑targetowym = fail‑fast.

- [PIT-0080] Blad: rozne profile (fast/strict) zmienialy kluczowe zabezpieczenia bez wyraznego logu, co mylilo uzytkownikow.
  - Wymaganie: przy aktywnym profilu wypisz liste nadpisanych opcji i ich wartosci; brak = FAIL w trybie strict.

- [PIT-0081] Blad: `seal check` raportowal OK, ale build/deploy uzywal innych ustawien (np. packager/target), przez co check nie wykrywal realnych bledow.
  - Wymaganie: `seal check` musi uzywac tego samego targetu/packagera/co build; brak jawnego targetu = fail‑fast.

- [PIT-0082] Blad: skrypty uruchamiane jako login shell (`bash -lc`) wykonywaly `.bashrc/.profile`, co zmienialo PATH/ENV i powodowalo nieprzewidywalne zachowanie.
  - Wymaganie: dla automatyzacji uzywaj `bash -c` lub czystego `env -i`; loguj skuteczny PATH/ENV w trybach diagnostycznych.

- [PIT-0083] Blad: brak rozgraniczenia ustawien dev vs prod powodowal, ze w prod dzialaly ustawienia debug (np. verbose/inspect), co zmniejszalo bezpieczenstwo.
  - Wymaganie: jawny rozdzial profili (dev/prod/fast/strict), a build/deploy musza logowac aktywny profil i tryb.

- [PIT-0084] Blad: stale timeouty w E2E byly niedopasowane do obciazenia maszyn, co dawalo flaky.
  - Wymaganie: timeouty w E2E musza byc konfigurowalne przez ENV i logowane; CI ustawia wyzsze progi.

- [PIT-0085] Blad: preflight nie wykrywal brakow narzedzi na hoście (np. brak `tar`/`gzip`), a bledy pojawialy sie dopiero w deployu.
  - Wymaganie: preflight musi weryfikowac wymagane narzedzia na hoście docelowym i fail‑fast z instrukcja instalacji.

- [PIT-0086] Blad: runner/deploy korzystaly z roznych `PATH`/`ENV`, przez co narzedzia znajdowaly sie w preflight, a brakowalo ich w runtime.
  - Wymaganie: loguj i normalizuj `PATH/ENV` dla preflight/build/deploy; brak spojnoci = warning albo fail‑fast.

- [PIT-0087] Blad: po ustawieniu `PR_SET_DUMPABLE=0` zapis do `/proc/self/coredump_filter` failowal z `EACCES`, co powodowalo fałszywy `[thin] runtime invalid`.
  - Wymaganie: gdy core dump jest już zablokowany, błąd `EACCES/EPERM` przy `coredump_filter` traktuj jako OK; inne błędy = fail‑fast.

- [PIT-0088] Blad: polecenia z `sudo` w trybie nieinteraktywnym wisialy na promptach hasla.
  - Wymaganie: uzywaj `sudo -n` (fail‑fast bez promptu) i wypisz instrukcje, gdy brak uprawnien.
- [PIT-0089] Blad: długie testy/deploy wymagały sudo, ale timestamp wygasał w trakcie i proces wisiał.
  - Wymaganie: przy długich runach odświeżaj `sudo -v` w tle albo wymagaj jednorazowej autoryzacji przed startem.
- [PIT-0090] Blad: `sudo` uruchamiane bez zachowania ENV gubilo krytyczne zmienne (np. `SEAL_*`, `NPM_*`), co zmienialo zachowanie testow.
  - Wymaganie: przekazuj wymagane ENV jawnie (`sudo -E` lub `sudo VAR=...`) i loguj kluczowe zmienne na starcie.
  - Wymaganie: preferuj allowliste zmiennych (`sudo VAR=...`) zamiast pelnego `sudo -E`, aby nie wprowadzac nieprzewidzianych wartosci.

- [PIT-0091] Blad: `curl`/`wget` bez timeoutow i `--fail` potrafil wisiec lub ignorowac HTTP error.
  - Wymaganie: pobieranie z sieci musi miec timeout (`--connect-timeout`, `--max-time`) i `--fail`/`--show-error`, plus ograniczone retry.

- [PIT-0092] Blad: pobrany plik byl HTML/komunikatem błędu (np. rate‑limit GitHub) mimo HTTP 200, co powodowalo mylace bledy rozpakowania lub cichy brak danych.
  - Wymaganie: waliduj typ/format pobranych plikow (np. `file`, `tar -tzf` dry‑run, magic bytes) i fail‑fast z komunikatem o możliwym rate‑limit lub nieprawidłowym URL.
  - Wymaganie: dla URLi z przekierowaniami (np. GitHub Releases) uzywaj `curl -L`/`wget --max-redirect`, inaczej pobierzesz stronę HTML zamiast artefaktu.
  - Wymaganie: wspieraj `GITHUB_TOKEN`/auth do pobran, aby ograniczyc rate‑limit; brak tokena = jawny warning.
  - Wymaganie: po pobraniu weryfikuj rozmiar (`Content-Length` gdy dostępny, lub minimalny próg rozmiaru pliku); zbyt mały plik = fail‑fast.

- [PIT-0093] Blad: HTTP 429/503 zwracal `Retry-After`, ale downloader natychmiast retry’ował lub failował bez instrukcji, co powodowało flakey.
  - Wymaganie: respektuj `Retry-After` (z limitem) i loguj powód oraz czas oczekiwania; po przekroczeniu limitu daj jasny błąd.

- [PIT-0094] Blad: pipeline `curl | tar` bez `pipefail` przechodzil mimo bledu pobierania, a `tar` dostawal puste wejscie (cichy FAIL).
  - Wymaganie: preferuj pobranie do pliku + weryfikacja + `tar -xf`; jeśli uzywasz pipe, wlacz `set -o pipefail` i waliduj rozmiar/format.

- [PIT-0095] Blad: brak `ca-certificates` powodowal bledy TLS przy `curl`/`git`, co maskowalo realny problem (wygladalo jak timeout lub 404).
  - Wymaganie: preflight instaluje `ca-certificates` i weryfikuje, ze TLS dziala (np. krótki `curl -I https://example.com`).

- [PIT-0096] Blad: tokeny/hasla byly przekazywane w URL (`https://token@...`) lub przez `curl -u`, co wyciekało w logach i `ps`.
  - Wymaganie: przekazuj sekrety przez naglowki/ENV/`--netrc` z prawami 0600; logi musza redagowac URL i naglowki autoryzacyjne.

- [PIT-0097] Blad: `rsync` bez timeoutu potrafil wisiec na zerwanym polaczeniu.
  - Wymaganie: uzywaj `--timeout` w `rsync` (sekundy bez aktywnosci) oraz jawny limit czasu calkowitego.

- [PIT-0098] Blad: lokalny i zdalny `rsync` mialy rozne wersje, przez co wybrane flagi nie byly wspierane i deploy failowal.
  - Wymaganie: loguj `rsync --version` po obu stronach i fail-fast, gdy wymagane flagi nie sa wspierane (z instrukcja aktualizacji).

- [PIT-0099] Blad: `rsync` podazal za symlinkami lub kopiuje je jako pliki, co moglo nadpisac dane poza docelowym rootem.
  - Wymaganie: uzywaj `--safe-links` (lub waliduj brak symlinkow w drzewie) i sprawdzaj `realpath` przed sync.
- [PIT-0100] Blad: `rsync -a` kopiowal pliki specjalne/urządzenia, gdy build był uruchamiany jako root.
  - Wymaganie: dodaj `--no-devices --no-specials` (lub waliduj typy plikow przed sync) aby nie przenosic device nodes.

- [PIT-0101] Blad: `git` korzystajacy z SSH nie dziedziczyl opcji nieinteraktywnych (BatchMode/known_hosts), co blokowalo CI.
  - Wymaganie: ustaw `GIT_SSH_COMMAND="ssh -o BatchMode=yes -o UserKnownHostsFile=... -o StrictHostKeyChecking=accept-new"` w testach/CI.

- [PIT-0102] Blad: prompt o zaufanie hosta SSH blokowal deploy (brak wpisu w `known_hosts`).
  - Wymaganie: pre‑seed `known_hosts` lub uzyj jawnego `StrictHostKeyChecking=accept-new` (tylko gdy zaakceptowane); bez tego fail‑fast z instrukcja.

- [PIT-0103] Blad: `REMOTE HOST IDENTIFICATION HAS CHANGED` blokowal deploy po reinstalacji serwera, a komunikat nie podpowiadal rozwiazania.
  - Wymaganie: wykrywaj ten błąd i podawaj instrukcje `ssh-keygen -R <host>` (lub ręczna edycja `known_hosts`); nie usuwaj wpisu automatycznie bez zgody.

- [PIT-0104] Blad: reuzycie globalnego `known_hosts` w testach powodowalo flakey wyniki (hostkey mismatch po przebudowie kontenera).
  - Wymaganie: testy/CI uzywaja tymczasowego `UserKnownHostsFile` (per run), aby uniknac kolizji host key.

- [PIT-0105] Blad: zbyt liberalne uprawnienia na kluczach SSH powodowaly `unprotected private key file` i brak polaczenia.
  - Wymaganie: klucze prywatne `0600`, `authorized_keys`/`known_hosts` `0644`.
  - Wymaganie: katalog `~/.ssh` ma perms `0700` (inaczej ssh ignoruje klucze).

- [PIT-0106] Blad: agent SSH mial wiele kluczy i serwer odrzucal polaczenie (`Too many authentication failures`).
  - Wymaganie: wymusz `IdentitiesOnly=yes` i jawny `IdentityFile`; w razie potrzeby czysc `SSH_AUTH_SOCK`.

- [PIT-0107] Blad: `IdentityFile` wskazywal na brakujacy plik lub zle uprawnienia, a SSH zwracal nieczytelny błąd.
  - Wymaganie: waliduj istnienie `IdentityFile` i perms (0600) przed polaczeniem; brak = fail‑fast z instrukcja.

- [PIT-0108] Blad: rownolegle polaczenia SSH byly zrywane przez limity serwera (`MaxStartups`/`MaxSessions`), co dawalo flakey deploy.
  - Wymaganie: limituj rownoleglosc polaczen lub dodaj retry/backoff; w srodowiskach kontrolowanych zwieksz limity w `sshd_config`.
- [PIT-0109] Blad: timeouts SSH byly zakodowane na sztywno (ConnectTimeout/ServerAlive), co failowalo na wolnych sieciach lub dalekich hostach.
  - Wymaganie: timeouty SSH musza byc konfigurowalne per‑target i logowane jako effective config.

- [PIT-0110] Blad: `~/.ssh/config` uzytkownika zmienial zachowanie (ProxyJump/ControlMaster/GSSAPI) i psul deterministycznosc deployu/testow.
  - Wymaganie: uzywaj `ssh -F /dev/null` lub jawnie nadpisuj opcje w `-o ...`; loguj kluczowe opcje SSH.

- [PIT-0111] Blad: server wypisywal banner/MOTD lub `.bashrc` emitowal output w trybie non‑interactive, przez co `scp/rsync` failowaly.
  - Wymaganie: dla transferow uzywaj `ssh -T` (bez TTY) i wymagaj ciszy w non‑interactive shellu (guard `if [ -z "$PS1" ]` w `.bashrc`).
- [PIT-0112] Blad: zdalne skrypty byly uruchamiane przez `bash -lc`, a target nie mial `bash` (tylko `/bin/sh`), co blokowalo deploy.
  - Wymaganie: preferuj `/bin/sh -lc` dla zdalnych skryptow; jesli wymagany jest `bash`, preflight sprawdza jego obecność i daje jasny blad z instrukcja.

- [PIT-0113] Blad: fallback do `sftp` nie dzialal, bo brakowalo `Subsystem sftp`/`sftp-server` na serwerze.
  - Wymaganie: preflight sprawdza dostepnosc SFTP (np. `ssh -s sftp`) i podaje instrukcje instalacji/konfiguracji.

- [PIT-0114] Blad: `ControlMaster`/`ControlPath` uzywal zbyt dlugiej sciezki lub zostawial stale sockety, co psulo kolejne polaczenia.
  - Wymaganie: jesli uzywasz multiplexingu, ustaw krotki `ControlPath` w temp i sprzataj stale sockety; w razie problemow wylacz `ControlMaster`.

- [PIT-0115] Blad: nowe OpenSSH wylaczalo `ssh-rsa`, a serwer wspieral tylko stare algorytmy (polaczenie failowalo bez jasnego powodu).
  - Wymaganie: preferuj ED25519/ECDSA; dla legacy serwerow wymagaj jawnego opt-in (`HostKeyAlgorithms`/`PubkeyAcceptedAlgorithms`) z ostrzezeniem w logach.

- [PIT-0116] Blad: `StrictHostKeyChecking=accept-new` nie bylo wspierane w starszym OpenSSH i powodowalo fail.
  - Wymaganie: wykryj wersje OpenSSH i fallbackuj do `yes`/preseed `known_hosts`, zamiast uzywac nieobslugiwanej opcji.

- [PIT-0117] Blad: DNS zwracal IPv6, a srodowisko nie mialo routingu IPv6, co dawalo dlugie time‑outy przy SSH.
  - Wymaganie: wspieraj wymuszenie IPv4 (`-4`/`AddressFamily=inet`) i loguj wybrana rodzine adresu.

- [PIT-0118] Blad: `rsync` nie byl dostepny w PATH zdalnego, bo non‑interactive shell ladowal inne PATH niz interaktywny.
  - Wymaganie: preflight sprawdza `command -v rsync` na hoście zdalnym i/lub uzywa `--rsync-path=/usr/bin/rsync` (absolutna sciezka).

- [PIT-0119] Blad: `rsync` byl uruchamiany przez `sudo` bez `-n`, co powodowalo wiszenie na promptach hasla.
  - Wymaganie: dla `--rsync-path` uzywaj `sudo -n rsync` (albo NOPASSWD tylko dla rsync) i loguj ostrzezenie, gdy sudo nie jest dostepne.
- [PIT-0120] Blad: sciezki z spacjami lub znakami specjalnymi byly interpretowane przez zdalny shell w `rsync`, co psulo transfer.
  - Wymaganie: uzywaj `rsync --protect-args` (lub `-s`) i preflightuj wsparcie opcji; bez wsparcia fail‑fast lub wymagaj sciezek bez spacji/shell‑metachar.

- [PIT-0121] Blad: `sudo` na hoście wymagalo TTY (`requiretty`), przez co nieinteraktywne komendy failowaly mimo poprawnych uprawnien.
  - Wymaganie: dla uzytkownika deploy wylacz `requiretty` lub w ostatecznosci uruchom `ssh -tt` tylko gdy to niezbedne (loguj ten fakt).

- [PIT-0122] Blad: serwer mial `ForceCommand internal-sftp` lub restricted shell, przez co `scp/rsync` failowaly mimo poprawnych kluczy.
  - Wymaganie: wykrywaj tryb SFTP-only i oferuj fallback do `sftp` (lub jasny blad z instrukcja).

- [PIT-0123] Blad: skrypty uzywaly niecytowanych zmiennych (`$VAR`), co powodowalo word‑splitting i globbing.
  - Wymaganie: kazda zmienna w shellu jest widocznie cytowana (`"$VAR"`), chyba ze jawnie potrzebny jest splitting.

- [PIT-0124] Blad: instalatory (apt/dpkg) w srodowiskach CI/Docker wisialy na promptach (np. tzdata/locales).
  - Wymaganie: ustaw `DEBIAN_FRONTEND=noninteractive` i `TZ=UTC`, a `apt-get` zawsze z `-y` (bez promptow).
  - Wymaganie: jesli instalacja i tak wymaga inputu, test/skrypt ma fail‑fast z jasnym komunikatem.

- [PIT-0125] Blad: `apt-get` failowal przez blokady `apt-daily`/`unattended-upgrades`, co powodowało flakey CI.
  - Wymaganie: przed instalacją sprawdź locki i poczekaj/wyłącz `apt-daily` w obrazie testowym.

- [PIT-0126] Blad: pakiet z repo APT nie istnial w danej dystrybucji (np. `criu` na niektorych Ubuntu), co przerywalo instalacje i blokowalo E2E.
  - Wymaganie: instalatory narzedzi musza obslugiwac brak pakietu (source build lub SKIP z instrukcja), a preflight/diagnostyka jasno wypisuje, ze pakiet nie ma kandydata w APT.

- [PIT-0127] Blad: instalator narzedzia zewnetrznego klonowal repo, ale struktura projektu byla inna niz oczekiwano (np. brak `llvm/` lub `tools/clang`), co konczylo sie nieczytelnym bledem w cmake.
  - Wymaganie: po clone **waliduj layout** repo (wymagane katalogi/plik `CMakeLists.txt`), a przy braku dawaj jasny blad z instrukcja zmiany repo/branchu.

- [PIT-0128] Blad: `pip install` failowal na nowych Ubuntu przez `externally-managed-environment`, albo instalowal narzedzia poza PATH (np. `~/.local/bin`), przez co testy nie widzialy binarek.
  - Wymaganie: instalacje pip rob w venv/pipx albo jawnie uzyj `python3 -m pip install --user` + dodaj `~/.local/bin` do PATH; w kontrolowanych obrazach dopuszczalne `PIP_BREAK_SYSTEM_PACKAGES=1`.
  - Wymaganie: ustaw `PIP_NO_INPUT=1` i `PIP_DISABLE_PIP_VERSION_CHECK=1`, zeby uniknac promptow i wiszenia.

- [PIT-0129] Blad: `eval`/`bash -lc "$CMD"` z danymi z configu pozwalal na wstrzykniecia lub bledy quoting.
  - Wymaganie: unikaj `eval`; uzywaj args array lub whitelisty dopuszczalnych tokenow.
- [PIT-0130] Blad: rozne moduly mialy wlasne implementacje `shQuote/shellQuote`, co prowadzilo do niespojnosci i edge‑case’ow.
  - Wymaganie: jeden wspolny helper do quoting (z testami dla `'`, spacji, newline, backslash), bez lokalnych kopii.
- [PIT-0131] Blad: heredoc bez cytowania (`<<EOF`) rozszerzal zmienne i backslash‑e, co psulo generowane skrypty/konfigi i moglo wstrzyknac dane.
  - Wymaganie: dla literalnych tresci uzywaj `<<'EOF'` (bez ekspansji) albo jawnie escapuj dane wejściowe.

- [PIT-0132] Blad: `xargs` bez `-r` wykonywal polecenie bez argumentow (na pustym input), co psulo logike.
  - Wymaganie: `xargs -0 -r` albo jawna blokada, gdy input jest pusty.

- [PIT-0133] Blad: wywolania narzedzi krytycznych polegaly na `PATH` uzytkownika (mozliwy PATH‑hijack lub inne wersje binarek).
  - Wymaganie: dla kluczowych binarek w trybie uprzywilejowanym uzywaj `command -v` + whitelisty katalogow albo absolutnych sciezek.
  - Wymaganie: gdy uruchamiasz przez `sudo`, nie polegaj na odziedziczonym `PATH` (ustaw jawny `PATH` albo sprawdz `secure_path`).

- [PIT-0134] Blad: segmenty sciezki pochodzace z configu mogly byc absolutne i omijaly `path.join`, prowadzac poza root.
  - Wymaganie: odrzucaj segmenty z `path.isAbsolute()` oraz normalizuj `..` przed uzyciem.

- [PIT-0135] Blad: `~` i sciezki relatywne w komendach `sudo` wskazywaly na niewlasciwe HOME (root), co psulo deploy.
  - Wymaganie: uzywaj sciezek absolutnych; nie polegaj na `~` pod `sudo`. Jawnie ustawiaj `HOME`/`cwd` gdy potrzeba.

- [PIT-0136] Blad: operacje SSH uruchamiane przez `sudo` tracily `SSH_AUTH_SOCK` i klucze z agenta, co konczylo sie promptem lub bledem.
  - Wymaganie: przy `sudo` zachowuj `SSH_AUTH_SOCK` (`sudo -E`) albo przekazuj `IdentityFile`/`IdentitiesOnly=yes`.
  - Wymaganie: jawnie ustaw `HOME`/`known_hosts` dla procesu `ssh` uruchamianego jako root.

- [PIT-0137] Blad: `SSH_AUTH_SOCK` wskazywal na nieistniejacy/stary socket agenta, co powodowalo mylace bledy SSH lub opoznienia.
  - Wymaganie: waliduj, ze `SSH_AUTH_SOCK` istnieje i jest socketem; w razie braku unsetuj go i loguj ten fakt.

- [PIT-0138] Blad: `known_hosts` bylo read‑only, a `StrictHostKeyChecking=accept-new` nie moglo zapisac wpisu, co powodowalo fail mimo poprawnego hosta.
  - Wymaganie: uzywaj zapisywalnego `UserKnownHostsFile` (w temp) lub pre‑seed `known_hosts`; brak zapisu = fail‑fast z instrukcja.

- [PIT-0139] Blad: skrypty polegaly na `ls`/globbingu (`for f in *`) i psuly sie na spacjach lub pustych katalogach.
  - Wymaganie: nie parsuj `ls`; uzywaj `find -print0` + `xargs -0` lub `glob` z `nullglob`.
  - Wymaganie: wszystkie operacje na plikach w shellu musza byc odporne na spacje i puste katalogi.

- [PIT-0140] Blad: srodowisko uruchomienia wstrzykiwalo zachowanie (`BASH_ENV`, `ENV`, `CDPATH`) i zmienialo logike skryptu.
  - Wymaganie: przed uruchomieniem skryptow czysc ryzykowne ENV (`BASH_ENV`, `ENV`, `CDPATH`, `GLOBIGNORE`) lub ustaw jawne bezpieczne wartosci.

- [PIT-0141] Blad: `exists`/`stat` przed zapisem powodowal race (TOCTOU) – plik zmienial sie miedzy check a write.
  - Wymaganie: uzywaj atomowych operacji (`open` z `O_EXCL`, lock, write+rename) i weryfikuj `fstat` po otwarciu.

- [PIT-0142] Blad: zmiana `umask` w procesie nie byla przywracana, co psulo uprawnienia kolejnych plikow.
  - Wymaganie: zmieniaj `umask` tylko lokalnie (snapshot + restore w `finally`).

- [PIT-0143] Blad: procesy potomne zostawaly jako sieroty (brak process group/kill), co blokowalo kolejne uruchomienia.
  - Wymaganie: przy exit/signal zabijaj caly process group lub sledz wszystkie PIDy i sprzataj deterministycznie.

- [PIT-0144] Blad: skrypt uruchamial zadania w tle (`&`) i konczyl sie bez `wait`, przez co bledy w tle byly ignorowane, a procesy zostawaly zywe.
  - Wymaganie: dla kazdego background job zbieraj PID i rob `wait`; jesli ktorys failuje, zwroc nie‑zero.
  - Wymaganie: cleanup zabija background joby w `trap` (i czeka na ich zakonczenie).

- [PIT-0145] Blad: `unhandledRejection`/`uncaughtException` nie byly logowane i proces znikał bez informacji.
  - Wymaganie: globalne handlery loguja blad i kończą proces z kodem != 0.

- [PIT-0146] Blad: w shellu uzywano `set -u` bez zabezpieczen dla opcjonalnych zmiennych, co przerywalo skrypt.
  - Wymaganie: dla opcjonalnych zmiennych uzywaj `${VAR:-}` lub `: "${VAR:=default}"`.

- [PIT-0147] Blad: `read` bez `-r` zjadalo backslashe i psulo dane (np. sciezki).
  - Wymaganie: uzywaj `read -r`.

- [PIT-0148] Blad: operacje wymagajace uprawnien byly „maskowane” fallbackiem zamiast jawnego zgloszenia potrzeby zgody.
  - Wymaganie: gdy potrzebne sa uprawnienia/sandbox escape, bledy musza byc jawne i wymagac zgody uzytkownika (bez cichych fallbackow).

- [PIT-0149] Blad: timeouts i pomiary czasu oparte o `Date.now()` byly wrażliwe na zmiany czasu/NTP.
  - Wymaganie: do timeoutów i elapsed używaj zegara monotonicznego (`process.hrtime`/`performance.now`).

- [PIT-0150] Blad: retry petle nie mialy limitu (wieczne wieszanie przy awarii sieci/SSH).
  - Wymaganie: kazdy retry ma limit prób i limit czasu calkowitego; loguj liczbe prób i powód przerwania.

- [PIT-0151] Blad: lockfile zostawal po crashu i blokowal kolejne operacje.
  - Wymaganie: lock zawiera PID+timestamp, a kod ma detekcje stale locka i bezpieczne odblokowanie.

- [PIT-0152] Blad: operacje workspace wykonywaly sie na wielu projektach bez potwierdzenia i jasnego zakresu.
  - Wymaganie: przy >1 projekcie pokaz liste i wymagaj jawnego `--yes/--workspace`.
  - Wymaganie: semantyka bledow (fail-fast vs continue) jest jawna, z opcja `--continue-on-error`.

- [PIT-0153] Blad: ryzykowne opcje/fallbacki byly wlaczone domyslnie.
  - Wymaganie: ryzykowne opcje OFF domyslnie; wymagaja jawnego wlaczenia i WARN.

- [PIT-0154] Blad: brak atomowosci zapisu (tmp/rename) powodowal polowiczne pliki po crashu.
  - Wymaganie: zapisy plikow krytycznych zawsze przez tmp + atomic rename.

- [PIT-0155] Blad: brak idempotencji komend (bootstrap/deploy/clean) powodowal reczne naprawy.
  - Wymaganie: operacje infrastrukturalne musza byc idempotentne (bez efektow ubocznych przy powtorzeniu).

- [PIT-0156] Blad: brak blokad wspolbieznosci powodowal nadpisywanie build/deploy.
  - Wymaganie: build/deploy/clean uzywa lockfile, z czytelnym komunikatem przy kolizji.

- [PIT-0157] Blad: operacje destrukcyjne bez trybu podgladu.
  - Wymaganie: akcje czyszczace/usuwajace maja `--dry-run`.

- [PIT-0158] Blad: brak sprzatania po SIGINT/SIGTERM.
  - Wymaganie: przerwania sprzataja procesy i pliki tymczasowe.

- [PIT-0159] Blad: walidacja uprawnien opierala sie wylacznie na `sudo`, przez co brak `sudo` powodowal falszywy negatyw (np. `serviceUser` = biezacy user).
  - Wymaganie: jesli `serviceUser` == biezacy uzytkownik, sprawdzaj uprawnienia bez `sudo`.
  - Wymaganie: brak `sudo` nie moze maskowac dostepu; fallback do lokalnego `test -x`.
  - Wymaganie: skrypty typu probe/inspect musza dzialac bez `sudo` (zamiast fail, zwracaja wynik + note).

- [PIT-0160] Blad: walidacja targetu (host/user/serviceName/installDir) byla rozproszona i niespojna miedzy modulami (deploy/ssh/sentinel), co dawalo rozne bledy w zaleznosci od komendy.
  - Wymaganie: jedna centralna walidacja targetu i wspolne helpery w kazdej komendzie.
- [PIT-0161] Blad: `appName` z targetu byl raz ignorowany (deploy), a raz respektowany (check/config), co dawalo niespojne nazwy/uslugi i mylace komunikaty.
  - Wymaganie: jedna zasada dla `appName`/`serviceName` (override dozwolony wszedzie albo zakazany); w obu przypadkach loguj `effective config`.
- [PIT-0162] Blad: `target.kind` z literowka (np. `shh`, `remote`) byl traktowany jak `local`, co moglo uruchomic deploy na zlym hoście.
  - Wymaganie: `target.kind` akceptuje tylko `local|ssh`; inne wartosci = fail‑fast z instrukcja.
- [PIT-0163] Blad: `defaultTarget` wskazywal na nieistniejacy target, co dawalo mylace bledy dopiero w trakcie deployu.
  - Wymaganie: `seal check` waliduje, ze `defaultTarget` istnieje w `seal-config/targets`.

- [PIT-0164] Blad: kilka targetow uzywalo tego samego `serviceName`/`installDir` na tym samym hoscie, co nadpisywalo unit i psulo deploy.
  - Wymaganie: preflight wykrywa kolizje `serviceName`/`installDir` per host+scope i wymaga jawnego opt‑in lub unikalnych nazw.

- [PIT-0165] Blad: parsowanie danych z narzedzi systemowych (np. `lsblk`) nie normalizowalo `mountpoints` (null/array/string), co dawalo puste wpisy i bledne wnioski o mountach.
  - Wymaganie: zawsze normalizuj output narzedzi (trim, filtruj puste, obsluguj array) przed decyzjami.

## Deploy / bootstrap (auto-bootstrap)

- [PIT-0166] Blad: auto‑bootstrap uruchamial operacje z `sudo` bez jawnego, projektowego przelacznika, co dawalo niespodziewane skutki w CI i na targetach.
  - Wymaganie: auto‑bootstrap ma jawne pole w `seal.json5` (`deploy.autoBootstrap`) i musi logowac aktywny tryb (ON/OFF) oraz powod uruchomienia.

- [PIT-0167] Blad: brak walidacji typu `deploy.autoBootstrap` (np. string/liczba) prowadzil do niezamierzonego wlaczenia auto‑bootstrap.
  - Wymaganie: waliduj, ze `deploy.autoBootstrap` jest boolean; niepoprawny typ = fail‑fast z jasnym komunikatem.

- [PIT-0168] Blad: scenariusze E2E dla deployu (lokalny vs SSH, auto‑bootstrap vs manual) byly sprzezone i blad jednego trybu blokowal test drugiego.
  - Wymaganie: niezalezne tryby uruchamiaj niezaleznie (osobne testy lub `continue-on-error`), aby awaria lokalna nie blokowala weryfikacji SSH.
  - Wymaganie: E2E zawsze pokrywa oba tryby: auto‑bootstrap ON i OFF.

- [PIT-0169] Blad: deploy konczyl sie bledem „Missing installDir” zamiast automatycznego bootstrapu na pierwszym uruchomieniu.
  - Wymaganie: gdy `installDir` nie istnieje i `deploy.autoBootstrap=true`, Seal uruchamia bootstrap i loguje powod; gdy `autoBootstrap=false`, zwraca jasna instrukcje (`--bootstrap` + manualny fallback).
  - Wymaganie: E2E obejmuje scenariusz „missing installDir” dla auto‑bootstrap ON oraz instrukcje dla OFF.

- [PIT-0170] Blad: po nieudanym restarcie lub braku gotowosci deploy zostawial target na nowym, niezdrowym release bez rollbacku.
  - Wymaganie: przy failu restart/ready Seal probuje rollback i loguje wynik; E2E pokrywa scenariusz braku gotowosci.

### Wnioski ogolne (deploy/automation)

- Domyslne automaty uruchamiajace `sudo` musza byc konfigurowalne i jawnie logowane.
- Kazda funkcja z trybami (auto/manual) musi miec testy E2E dla obu sciezek.
- Zmiany w zachowaniu deployu musza miec opis w dokumentacji + komunikat w CLI (co sie wydarzylo i dlaczego).
- Fallbacki musza byc deterministyczne i zawsze logowac powod (ops/CI musi wiedziec, czemu nastapil pelny upload).
- Kompatybilnosc runtime musi byc kodowana w metadanych release i weryfikowana przed reuse/payload‑only.

## Build / packaging

- [PIT-0171] Blad: build przechodzil mimo braku `postject` (SEA nie failowal).
  - Wymaganie: brak `postject` to **blad builda**.
- Packager `bundle` jest **jawny wybór** (`--packager bundle`); brak automatycznego fallbacku z SEA.

- [PIT-0172] Blad: pakowanie artefaktu uzywalo stalego katalogu tmp w `outDir` (np. `artifact-tmp`) i kasowalo go przed buildem, co przy rownoleglych buildach uszkadzalo artefakty.
  - Wymaganie: temp katalog dla artefaktu jest unikalny per build (mkdtemp/buildId), a cleanup jest w `finally`.

- [PIT-0173] Blad: `outDir`/`outDirOverride` byl czyszczony przez `rmrf` bez walidacji bezpiecznego rootu, co przy blednej sciezce moglo usunac niezamierzone katalogi.
  - Wymaganie: waliduj `outDir` jak `installDir` (absolutny, nie‑systemowy, minimalna glebokosc); `rmrf` tylko w dozwolonym root.

- [PIT-0174] Blad: SEA uruchamiany na Node < 20 (brak wsparcia) powodowal build fail lub runtime mismatch.
  - Wymaganie: `seal check`/`release` fail‑fast dla SEA, gdy `node -v` < 20, z jasna instrukcja podniesienia wersji albo uzycia `packager=bundle`.

- [PIT-0175] Blad: obfuskacja/minifikacja frontendu byla wylaczona.
  - Wymaganie: `build.frontendObfuscation` i `build.frontendMinify` sa **domyslnie wlaczone** dla UI.

- [PIT-0176] Blad: sourcemapy trafily do release i ułatwiały odtworzenie kodu.
  - Wymaganie: sourcemapy muszą być wyłączone lub trafiać wyłącznie do prywatnych artefaktów debug (nigdy na target); testy E2E sprawdzają brak `.map` w release.

- [PIT-0177] Blad: bundler zostawial `//# sourceMappingURL=...` w plikach JS mimo braku map, ujawniajac sciezki i prowokujac fetch z targetu.
  - Wymaganie: usuwaj `sourceMappingURL` w release (strip komentarza), a testy E2E sprawdzaja brak `sourceMappingURL` i brak `.map`.

- [PIT-0178] Blad: minify/obfuskacja psuły kod zależny od nazw (`Function.name`, `class.name`) albo dynamicznego dostępu do pól.
  - Wymaganie: krytyczne ścieżki mają E2E; jeśli kod zależy od nazw/reflect, wyłącz minify/rename lub użyj konfiguracji zachowującej nazwy na granicach API.

- [PIT-0179] Blad: renameProperties/mangle zmienialy nazwy pol publicznych (API/JSON) i psuly komunikacje (req/res, `in`, `hasOwnProperty`).
  - Wymaganie: renameProperties tylko dla prywatnych struktur; publiczne pola i dynamiczne klucze musza byc na liscie `reserved/keep`.
  - Wymaganie: gdy brak pewnosci, renameProperties wylaczone z jasnym logiem; E2E weryfikuje kontrakty API.

- [PIT-0180] Blad: tree-shaking/bundling usunal moduly z efektami ubocznymi (rejestracje, polyfille), bo `sideEffects` bylo bledne lub brakowalo jawnych importow.
  - Wymaganie: moduly z efektami ubocznymi sa oznaczone w `sideEffects` lub importowane jawnie; E2E weryfikuje obecnosc efektow po sealingu.
  - Wymaganie: w krytycznych sciezkach wylacz agresywne tree-shaking albo uzyj whitelisty modulow do zachowania.

- [PIT-0181] Blad: agresywne opcje minifikacji (`unsafe`, `pure_getters`, `reduce_funcs`) zmienialy semantyke (gettery z efektami ubocznymi, `this`-binding).
  - Wymaganie: opcje "unsafe" sa domyslnie OFF; wlaczaj je tylko z dedykowanymi testami E2E i logiem "effective config".

- [PIT-0182] Blad: bundler wchlanial `require()` dynamiczne lub native addon, przez co `.node` nie trafial do release (runtime `MODULE_NOT_FOUND`).
  - Wymaganie: dynamiczne `require()` i native addon-y sa oznaczone jako `external`, a pliki `.node` sa kopiowane do release.
  - Wymaganie: E2E testuje ladowanie native addon po sealingu.

- [PIT-0183] Blad: `elfPacker.tool="upx"` byl wlaczony, ale jego blad byl ignorowany (build przechodzil mimo `CantUnpackException` itp.).
  - Wymaganie: jezeli `elfPacker.tool="upx"` jest wlaczony i sie nie powiedzie, build **musi** sie przerwac z bledem.
  - Wymaganie: `elfPacker.tool="upx"` domyslnie wylaczony dla SEA; wlaczaj tylko po potwierdzeniu `upx -t` na binarce.

- [PIT-0184] Blad: UPX byl osobna opcja obok `elfPacker`, co tworzylo sprzeczne konfiguracje i dwie sciezki w kodzie.
  - Wymaganie: **jedno zrodlo prawdy** dla packerow (tylko `protection.elfPacker`); duplikaty/konflikty = twardy blad.
  - Wymaganie: template/init, przyklady i dokumentacja uzywaja tylko kanonicznych pol.

- [PIT-0185] Blad: zmiana schematu `seal.json5` (np. usuniecie `bundleFallback` na rzecz jawnego `packager=bundle`, `stripSymbols/upxPack` -> `strip/elfPacker`) nie byla zaktualizowana we wszystkich projektach, docs i testach.
  - Wymaganie: migracja schematu = aktualizacja **wszystkich** `seal.json5` w repo (takze workspace `defaults`) + init template + docs + testy.
  - Wymaganie: parser musi fail‑fast na nieznanych/starych kluczach z jasnym hintem migracji.
  - Wymaganie: CI/skript sprawdza brak starych kluczy w repo (scan).

- [PIT-0186] Blad: lista dozwolonych wartosci (packagery, `thin.level`) rozjechala sie miedzy kodem, dokumentacja i komunikatami CLI.
  - Wymaganie: lista dozwolonych wartosci pochodzi z jednego zrodla (konstanta) i jest uzywana w kodzie/CLI/completion.
  - Wymaganie: testy/CI sprawdzaja zgodnosc docs z kodem.
  - Wymaganie: nieznana wartosc (literowka) = fail-fast z sugestia "did you mean".
  - Wymaganie: aliasy/zmiany nazw sa jawne (deprecation warning) i mapowane do kanonicznej wartosci.
  - Wymaganie: w logach/testach uzywaj tylko kanonicznych nazw; aliasy sa dozwolone tylko w parserze wejscia.
  - Wymaganie: auto‑korekta tylko gdy dopasowanie jest jednoznaczne; w innych przypadkach fail‑fast z lista poprawnych wartosci.

- [PIT-0187] Blad: brak jawnej macierzy kompatybilnosci packager <-> opcje ochrony prowadzil do ad-hoc wylaczen lub cichego ignorowania opcji.
  - Wymaganie: jedna macierz kompatybilnosci (packager/opcja/narzedzie) + normalizacja configu.
  - Wymaganie: brak wsparcia dla pojedynczej opcji nie moze wylaczac calego `protection`; wylaczaj tylko niekompatybilny fragment i loguj ostrzezenie.
  - Wymaganie: loguj "effective config" po normalizacji i uzywaj go w testach/dokumentacji.
  - Wymaganie: ostrzezenia o niekompatybilnosci zawieraja powod i jasna rekomendacje (np. "uzyj thin-split").
  - Wymaganie: komunikaty/logi uzywaja pelnych nazw packagerow (bez skrotow), aby uniknac pomylek typu `thin-single` vs `thin-split`.

- [PIT-0188] Blad: `nativeBootstrap` byl dostepny dla `sea`/`thin-single`, mimo ze nie ma tam zastosowania.
  - Wymaganie: `nativeBootstrap` jest dozwolony tylko dla `thin-split` (lub jawnie zdefiniowanych packagerow).
  - Wymaganie: w innych trybach ustawienie jest ignorowane z ostrzezeniem albo fail-fast (spojne z macierza kompatybilnosci).

- [PIT-0189] Blad: `sentinel` byl wlaczony dla packagerow bez wsparcia (np. `sea`, `thin-single`), co konczylo sie bledem builda lub niejasnym zachowaniem.
  - Wymaganie: `sentinel` wspierany tylko dla `thin-split`; w innych packagerach jest auto‑disabled z ostrzezeniem.
  - Wymaganie: `seal config explain` pokazuje `sentinel: false (auto)` i podaje jasna notke kompatybilnosci.
  - Wymaganie: E2E pokrywa oba przypadki: `thin-split` (enabled) oraz packagery niekompatybilne (disabled + note).

- [PIT-0190] Blad: rozjazd wykrywania narzedzi i opcji miedzy `check` i `build` (postject/cc/packager).
  - Wymaganie: **jedno zrodlo prawdy** dla wykrywania narzedzi (resolver binarki).
- [PIT-0191] Blad: helper wykrywania narzedzi uruchamial `bash -lc "command -v ..."`, co failowalo na minimalnych systemach bez `bash`.
  - Wymaganie: wykrywaj narzedzia bez zaleznosci od `bash` (scan `PATH`/`command -v` przez `/bin/sh`); brak wymaganej powloki = fail‑fast z instrukcja.
- [PIT-0192] Blad: nieznany `packager` byl odrzucany tylko przez `seal check`, ale `seal release/deploy` potrafily isc dalej i failowac pozniej lub dzialac nieprzewidywalnie.
  - Wymaganie: waliduj `packager` w jednym miejscu (loader configu) i fail‑fast we **wszystkich** komendach, niezaleznie od `check`.
  - Wymaganie: `check` i `build` uzywaja tego samego PATH, targetu i packagera.
  - Wymaganie: release/ship przekazuja opcje preflight (`--check-verbose`, `--check-cc`).

- [PIT-0193] Blad: `seal check` „wieszal sie” na kompilacji testowej (brak timeoutu i brak outputu).
  - Wymaganie: wszystkie komendy preflight/build maja timeout i widoczny postep.
  - Wymaganie: dla dlugich krokow wymuszaj niebuforowany output (`PYTHONUNBUFFERED=1`, `stdbuf -oL -eL`) lub jawne flush w narzedziu, aby nie wygladalo na zwis.
  - Wymaganie: `seal check --verbose` pokazuje komendy i stdout/stderr narzedzi.
  - Wymaganie: preflight uzywa plikow tymczasowych (nie stdin), zeby narzedzia nie blokowaly sie na wejsciu.
  - Wymaganie: opcja override toolchaina (np. `--cc gcc`) dla srodowisk z wrapperami `cc`.

- [PIT-0194] Blad: `seal release --skip-check` maskowal braki toolchaina i zwracal niejasne bledy.
  - Wymaganie: `--skip-check` zawsze wypisuje wyrazne ostrzezenie i jest tylko dla zaawansowanych.
  - Wymaganie: jesli brakuje krytycznych narzedzi, build powinien fail‑fast nawet przy `--skip-check` (lub przynajmniej podac konkretne "co dalej").

- [PIT-0195] Blad: `postject` byl zainstalowany jako modul, ale brakowalo CLI w PATH (check ostrzegal, a build i tak failowal).
  - Wymaganie: `seal check` weryfikuje **CLI** (`node_modules/.bin/postject` lub PATH), nie sam modul.
- [PIT-0196] Blad: instalatory narzedzi zewnetrznych klonowaly repo bez pinu commita/tagu, co psulo reprodukowalnosc i wprowadzalo nagle zmiany.
  - Wymaganie: pinuj tag/commit, loguj wersje/commit i (gdy to mozliwe) weryfikuj checksumy; zapewnij offline backup/mirror.
  - Wymaganie: brak CLI = twardy blad z instrukcja instalacji.

- [PIT-0197] Blad: instalatory narzedzi (np. z lockfile) probowaly budowac bez wymaganych narzedzi builda (`cmake`/`ninja`/`python3`), a blad byl nieczytelny.
  - Wymaganie: installer preflightuje wymagane build deps i podaje konkretne instrukcje instalacji (pakiety).

- [PIT-0198] Blad: cache repo narzedzia z lockfile bywal w stanie "dirty" (stale locki lub pliki po przerwanym buildzie) i `git checkout` failowal przez untracked files.
  - Wymaganie: przed checkoutem usuwaj stale locki `.git/index.lock` i zawsze rob `git reset --hard` + `git clean -fdx` dla repo w cache.

- [PIT-0199] Blad: instalatory narzedzi zostawialy zrodla/build po instalacji, co zapychalo dysk i bylo niewidoczne dla uzytkownika.
  - Wymaganie: po sukcesie zostaw tylko binarki + stampy; zrodla/build kasuj domyslnie.
  - Wymaganie: zachowanie zrodel/build wymaga jawnej flagi `SEAL_TOOLCHAIN_KEEP_SRC=1` i logu.

- [PIT-0200] Blad: instalatory budujace ze zrodel wykonywaly `make install` do systemu (`/usr/local`), wymagaly sudo i zostawialy globalne artefakty.
  - Wymaganie: instaluj narzedzia do katalogu cache (`$SEAL_CACHE/tools/...`) przez `DESTDIR`/`CMAKE_INSTALL_PREFIX`, bez sudo; w PATH dodawaj tylko lokalny prefix.

- [PIT-0201] Blad: parser lockfile narzedzi byl wrazliwy na CRLF/BOM lub niestandardowe biale znaki, co psulo odczyt sekcji i powodowalo "brakujace" narzedzia.
  - Wymaganie: parser lockfile normalizuje CRLF/BOM, trimuje whitespace i jasno raportuje bledy skladni.

- [PIT-0202] Blad: lockfile zawieral duplikaty sekcji narzedzi lub nieznane klucze, a parser je cicho ignorowal (last‑wins), co dawalo niedeterministyczne buildy.
  - Wymaganie: wykrywaj duplikaty i nieznane klucze w lockfile; fail‑fast z lista problemow.

- [PIT-0203] Blad: nazwy narzedzi/binarek w lockfile zawieraly sciezki lub znaki specjalne, co pozwalalo na nadpisanie nieoczekiwanych plikow.
  - Wymaganie: nazwy tool/bin sa walidowane jako bezpieczny basename (bez `/`, `..`, whitespace; tylko `[a-zA-Z0-9_.-]`).

- [PIT-0204] Blad: submodule update w installerach byl ignorowany (`|| true`), co zostawialo niekompletny repo i dawalo pozniejsze, nieczytelne bledy.
  - Wymaganie: `git submodule update --init --recursive` musi fail‑fast (lub jawny SKIP z powodem, jesli submoduly sa opcjonalne).

- [PIT-0205] Blad: brak `git-lfs` powodowal, ze duze pliki byly tylko pointerami, a build/testy failowaly bez jasnej diagnozy.
  - Wymaganie: wykrywaj pliki LFS (pointery) i fail‑fast z instrukcja `git lfs install && git lfs pull`, albo jawnie SKIP w srodowiskach bez LFS.

- [PIT-0206] Blad: klonowanie bardzo duzych repo (np. LLVM) bez `--depth` powodowalo timeouts i ogromne zuzycie dysku.
  - Wymaganie: dla duzych repo stosuj shallow clone (`--depth`/`--filter=blob:none`) z fallback do pelnego fetch, gdy potrzebny konkretny commit.

- [PIT-0207] Blad: thin build failowal dopiero w trakcie kompilacji launchera (brak `libzstd-dev`), bez jasnej instrukcji instalacji.
  - Wymaganie: `seal check` wykrywa brakujace pakiety (np. `libzstd-dev`) i podaje **konkretne** `apt-get install ...`.
  - Wymaganie: `seal release` (thin) fail‑fast z czytelnym komunikatem, gdy toolchain jest niekompletny.

- [PIT-0208] Blad: `nativeBootstrap` failowal na starszych kompilatorach (brak C++20) albo bez naglowkow Node, dajac nieczytelne błędy.
  - Wymaganie: preflight sprawdza wsparcie C++20 i obecność naglowkow Node (np. `SEAL_NODE_INCLUDE_DIR`) i fail‑fast z instrukcją instalacji.
- [PIT-0209] Blad: parametry `thin.*` (np. `chunkSizeBytes`, `zstdLevel`, `timeoutMs`) byly walidowane dopiero w buildzie, a `seal check` przepuszczal bledna konfiguracje.
  - Wymaganie: waliduj limity/liczby w `seal check` i fail‑fast z jasnym bledem, nie dopiero podczas builda.
- [PIT-0210] Blad: `build.thin`/`target.thin` ustawione na `null` lub tablice powodowaly TypeError albo ciche pominiecie konfiguracji.
  - Wymaganie: `thin` musi byc plain object; `null`/array/string/number = fail‑fast z jasnym bledem (prefer w `seal check`).
- [PIT-0211] Blad: `build.protection` ustawione na `null`/string/array bylo traktowane jak puste `{}` (protection wlaczony), co maskowalo bledna konfiguracje.
  - Wymaganie: `build.protection` akceptuje tylko boolean lub obiekt; inne typy = fail‑fast (prefer w `seal check`).
- [PIT-0212] Blad: `thin.level` przyjmowal niepoprawne wartosci i byl walidowany dopiero w buildzie, wiec `seal check` przepuszczal bledna konfiguracje.
  - Wymaganie: waliduj `thin.level` (low/medium/high) w `seal check` i fail‑fast.
- [PIT-0213] Blad: `thin.antiDebug.seccompNoDebug.mode` z nieznana wartoscia byl cicho normalizowany do `errno`, co ukrywalo bledy konfiguracji.
  - Wymaganie: `seccompNoDebug.mode` akceptuje tylko `errno|kill`; inne wartosci = fail‑fast.
- [PIT-0214] Blad: `protection.*.args` oraz `protection.strings.obfuscation` akceptowaly bledne typy/nieznane wartosci i byly cicho ignorowane, co zmienialo skuteczna konfiguracje.
  - Wymaganie: waliduj typy/allowliste dla `args` i `strings.obfuscation`; bledy = fail‑fast lub jawny warning + log `effective config`.

- [PIT-0215] Blad: build byl niedeterministyczny lub wykonany na innej architekturze/OS niz target (AIO zawiera runtime z build machine).
  - Wymaganie: preflight waliduje OS/arch i wersje narzedzi; mismatch = fail-fast.
  - Wymaganie: zapisuj wersje toolchaina i zaleznosci; unikaj auto‑pobieran w buildzie.
  - Wymaganie: release nie moze polegac na toolchainie builda na serwerze.
  - Wymaganie: AIO buduj na tej samej architekturze/OS co target albo uzyj trybu BOOTSTRAP.

- [PIT-0216] Blad: artefakty byly budowane z "dirty" worktree i bez zapisu stanu repo, co utrudnialo reprodukcje.
  - Wymaganie: build/release loguje `git rev-parse HEAD` + status worktree; w CI domyslnie FAIL, chyba ze `--allow-dirty`.
  - Wymaganie: jesli uzywasz `git describe`, zapewnij dostep do tagow (shallow clone z `--tags`) albo fallback do `rev-parse`.

- [PIT-0217] Blad: `esbuild` target byl nowszy niz runtime Node na hoście, co powodowalo błędy składniowe po deployu.
  - Wymaganie: `esbuild` target musi byc <= wersji runtime (lub jawnie wymuszony w configu).
  - Wymaganie: preflight/logi wypisuja target i wykryta wersje Node na hoście (fail‑fast przy mismatch).

- [PIT-0218] Blad: ID builda oparty tylko o czas powodowal kolizje przy rownoleglych buildach (nazwa release nadpisywana).
  - Wymaganie: ID builda zawiera komponent losowy lub licznik monotoniczny; kolizje = fail‑fast.

- [PIT-0219] Blad: `thin` dopuszczal niespojne offsety/rozmiary kontenera (latwo o bledy przy uszkodzonych artefaktach).
  - Wymaganie: `index_len == chunk_count * THIN_INDEX_ENTRY_LEN`.
  - Wymaganie: `comp_len > 0` i `raw_len > 0`.
  - Wymaganie: `rt_off + rt_len` i `pl_off + pl_len` w granicach pliku (z kontrola overflow).
  - Wymaganie: brak overlapu runtime/payload (`rt_off + rt_len <= pl_off`).
  - Wymaganie: encoder odrzuca 0-B runtime/payload.

- [PIT-0220] Blad: generator C dla launchera `thin` wstawial `\n` do stringa bez ucieczki, co psulo kompilacje (`missing terminating " character`).
  - Wymaganie: wszystkie literały string w generowanym C przechodza przez funkcje C‑escape (escapuje `\\`, `"`, `\n`, `\r`, `\t`, `\0`).
  - Wymaganie: nie interpoluj „surowych” stringow do C; uzyj helpera budujacego bezpieczny literal.
  - Wymaganie: testuj generowane C w **obu** konfiguracjach flag (np. sentinel ON/OFF), bo bledy moga byc tylko w jednej galezi.

- [PIT-0221] Blad: generator C powodowal ostrzezenia/blędy kompilacji przez duplikaty makr lub identyfikatorow (np. `_GNU_SOURCE redefined`, `redefinition of fd`).
  - Wymaganie: makra typu `_GNU_SOURCE` zawsze owijaj w `#ifndef`/`#define` (brak duplikatow).
  - Wymaganie: identyfikatory w kodzie generowanym maja unikalny prefix i nie koliduja miedzy galeziami warunkowymi.
  - Wymaganie: generator C przechodzi compile‑test z `-Werror`, aby ostrzezenia nie przechodzily do produkcji.

- [PIT-0222] Blad: kod C/C++ generowany lub patchowany mial shadowing nazw (parametry/outer scope), co na niektorych toolchainach z `-Werror` powodowalo fail kompilacji.
  - Wymaganie: zakaz shadowingu w generatorach C/C++; stosuj jednoznaczne nazwy i prefixy.
  - Wymaganie: compile-test C/C++ uruchamiaj z `-Wshadow` (wraz z `-Werror`), aby wykrywac to w CI.

- [PIT-0223] Blad: native addon byl kompilowany z naglowkami/ABI niezgodnymi z wersja runtime Node (lub uzywal API V8 z nowszej wersji), co dawalo bledy kompilacji lub crash w runtime.
  - Wymaganie: build/test uzywa naglowkow odpowiadajacych wersji runtime Node na target (lub jawnego `--target`); mismatch = fail-fast.
  - Wymaganie: kod native ma guardy wersji/feature-detect dla API V8 i fallback dla starszych wersji Node.

- [PIT-0224] Blad: kompilacja z `-march=native`/`-mtune=native` powodowala `Illegal instruction` na starszych CPU.
  - Wymaganie: nie uzywaj `-march=native` w artefaktach dystrybucyjnych; ustaw `-march`/`-mtune` zgodnie z targetem (np. `x86-64`/`generic`).

- [PIT-0225] Blad: native addon wymagajacy nowszego standardu C++ (np. C++20) byl budowany bez wczesnego probe, a blad kompilacji byl nieczytelny.
  - Wymaganie: preflight sprawdza minimalny standard C++ (probe kompilatora) i fail-fast z jasnym komunikatem.
  - Wymaganie: testy E2E dla funkcji opcjonalnych robia SKIP, gdy brak wsparcia C++ (z powodem).

- [PIT-0226] Blad: narzedzia E2E byly instalowane w wersji "latest", co prowadzilo do driftu i flakey wynikow miedzy lokalnie/CI.
  - Wymaganie: E2E ma lockfile z wersjami narzedzi i jednolity installer korzystajacy z locka (takze w Dockerze).
  - Wymaganie: warianty "minimal/full" korzystaja z tego samego schematu locka, aby uniknac rozjazdow.

- [PIT-0227] Blad: w generatorach skryptów (template string) pozostawiono `${...}` bez escapowania, co powodowało SyntaxError w Node (interpolacja JS).
  - Wymaganie: w template stringach zawsze escapuj `${` jako `\\${}` w treści skryptu (patrz STD‑047).

- [PIT-0228] Blad: brak `chmod +x` na generowanych binarkach/skryptach (np. launcher, run-current) powodowal `Permission denied` lub `Exec format error`.
  - Wymaganie: kazdy generowany plik wykonywalny ma jawny `chmod 755` (i jest sprawdzony w testach).

- [PIT-0229] Blad: launcher AIO probowal fallbackowac do BOOTSTRAP po uszkodzeniu stopki (cichy tryb mieszany).
  - Wymaganie: tryb AIO i BOOTSTRAP sa **jawne**.
  - Wymaganie: launcher AIO **nie** szuka `r/rt`/`r/pl`; brak stopki AIO = blad.
  - Wymaganie: launcher BOOTSTRAP moze czytac `r/rt`/`r/pl`.

- [PIT-0230] Blad: BOOTSTRAP nie tworzyl struktury `b/a` + `r/rt` + `r/pl`, przez co `appctl run` nie dzialal.
  - Wymaganie: BOOTSTRAP zawsze tworzy `b/a` (launcher) i `r/rt`/`r/pl` (runtime/payload).
  - Wymaganie: w release dodaj wrapper `<app>` uruchamiajacy `b/a` (kompatybilnosc z `appctl`).

- [PIT-0231] Blad: thin uruchamial bootstrap przez sciezke memfd (`/proc/self/fd/...`) i Node probowal `realpath()`, co konczylo sie `ENOENT`.
  - Wymaganie: bootstrap nie moze byc uruchamiany przez sciezke memfd; uzyj `node -e` z wbudowanym JS albo pliku na dysku.

- [PIT-0232] Blad: memfd dla runtime/payload dostal fd 3/4 i zostal nadpisany przez `dup2`, co powodowalo `Exec format error`.
  - Wymaganie: memfd-y musza byc przenoszone na fd >= 10 przed `dup2(3/4)`.

- [PIT-0233] Blad: thin nie wypisywal postepu i nie mial timeoutu na kompresji `zstd`, przez co wygladalo jak zawieszenie (brak diagnozy).
  - Wymaganie: loguj postep (co kilka sekund) podczas kodowania runtime/payload.
  - Wymaganie: kompresja `zstd` musi miec timeout (domyslnie > 0) z jasnym bledem.
  - Wymaganie: timeout musi byc konfigurowalny (`build.thin.zstdTimeoutMs` / `targets.<target>.thin.zstdTimeoutMs` lub `SEAL_THIN_ZSTD_TIMEOUT_MS`).
  - Wymaganie: kompresja nie moze wisiec na `spawnSync` z `stdin` (uzyj streamu i obslugi `error`).
  - Wymaganie: dla dlugich krokow pokazuj progress i komunikaty "co teraz" (np. `Thin: runtime 3/15`).

- [PIT-0234] Blad: `codec_state` ginal miedzy deployami (brak zgodnosci kodeka).
  - Wymaganie: `codec_state` musi byc zapisywany lokalnie i utrzymany (`seal-out/cache/thin/<target>/codec_state.json`).
  - Wymaganie: `seal-out/` jest ignorowany w VCS.
  - Wymaganie: brak `codec_state` = rebootstrap.

- [PIT-0235] Blad: kilka roznych katalogow wyjsciowych (`.seal`, `seal-thin`, `seal-out`) powodowalo chaos i stale artefakty.
  - Wymaganie: jeden kanoniczny katalog `seal-out/`, a cache w podfolderach (`seal-out/cache/...`).
  - Wymaganie: narzedzia i docs uzywaja tej samej sciezki; brak „drugich” katalogow.

- [PIT-0236] Blad: generowane pliki trafialy poza `seal-out/` (np. `seal-config/.private`), co mylilo i brudzilo repo.
  - Wymaganie: wszystkie pliki generowane (cache/private/metadata/runtime) musza byc pod `seal-out/`.
  - Wymaganie: nowe potrzeby storage rozwiazuj przez podfolder `seal-out/cache/...` + migracje danych (bez nowych katalogow w root projektu).

- [PIT-0237] Blad: cache `seal-out/cache/thin` rosl bez limitu i zapychal dysk.
  - Wymaganie: cache ma limit (np. liczba wpisow/rozmiar/TTL) i auto-pruning.
  - Wymaganie: limit musi byc konfigurowalny (0 = wylacza cache), a pruning logowany.

- [PIT-0238] Blad: cache/artefakty byly wspoldzielone miedzy targetami/konfiguracjami, co powodowalo uzycie niezgodnych danych.
  - Wymaganie: cache musi byc kluczowany po target+config+wersja/format i czyszczony przy zmianie schematu.

- [PIT-0239] Blad: payload-only (BOOTSTRAP) nie sprawdzal zgodnosci kodeka z runtime na target.
  - Wymaganie: `release/r/c` musi istniec i byc porownany z `<installDir>/r/c`.
  - Wymaganie: mismatch lub brak `c` = **fallback do pelnego bootstrap**.

- [PIT-0240] Blad: payload-only nie weryfikowal wersji runtime Node, co pozwalalo na reuse po upgrade i mismatch runtime/payload.
  - Wymaganie: release zapisuje marker runtime (`sha256(process.version)`) w `r/nv` i porownuje z targetem; brak/mismatch = fallback do pelnego uploadu.
  - Wymaganie: marker na target jest binarny/obfuskowany (STD-012), nie plaintext.

- [PIT-0241] Blad: "szybkie sciezki" (payload-only) pomijaly czesc walidacji lub plikow layoutu, co prowadzilo do niespojnego stanu na target.
  - Wymaganie: sciezki payload-only musza miec parytet walidacji i listy plikow z pelnym deployem.
  - Wymaganie: kazda optymalizacja ma test parytetu (full vs payload-only) dla plikow i walidacji.

- [PIT-0242] Blad: fallback z payload-only do pelnego uploadu nie logowal powodu lub probowal pelnego uploadu bez artefaktu.
  - Wymaganie: fallback zawsze loguje powod; pelny upload tylko gdy artefakt jest dostepny, inaczej fail‑fast z instrukcja (np. `seal ship` bez `--payload-only` lub `--artifact`).

- [PIT-0243] Blad: brak app‑bindingu pozwalal uruchomic runtime/payload z innego projektu na tym samym launcherze.
  - Wymaganie: `thin.appBind` domyslnie wlaczony i weryfikowany w `footer` runtime/payload oraz stopce AIO.
  - Wymaganie: `appBind.value` powinien byc stabilnym ID projektu (nie zaleznym od sciezki), aby uniknac falszywych mismatchy po deployu.

- [PIT-0244] Blad: `launcherObfuscation` wlaczone bez skonfigurowanego obfuscatora C powodowalo niejasne fail w buildzie.
  - Wymaganie: brak `protection.cObfuscator` = twardy blad z jasnym komunikatem (fail‑fast, bez fallbacku).

- [PIT-0245] Blad: hardening CET (`-fcf-protection=full`) nie dzialal na starszym clangu (np. O‑LLVM), co wywalalo build.
  - Wymaganie: CET musi miec osobny toggle + pre‑probe kompilatora, a brak wsparcia ma dawac jasny blad z instrukcja wylaczenia lub zmiany toolchaina.

- [PIT-0246] Blad: narzedzia zewnetrzne (obfuscator/packer) nie wspieraly zadanych flag, ale brakowalo pre‑probe i blad byl nieczytelny.
  - Wymaganie: dla kazdego narzedzia i zestawu flag wykonuj pre‑probe (np. kompilacja/`--help`) i fail‑fast z jasnym komunikatem.

- [PIT-0247] Blad: obfuscating clang (O‑LLVM) nie widzial systemowych naglowkow (`stddef.h`) i kompilacja launchera failowala.
  - Wymaganie: przy uzyciu obfuscatora C dodaj include paths z toolchaina systemowego (np. `gcc -print-file-name=include`), albo jasno dokumentuj wymagany `--gcc-toolchain`.

- [PIT-0248] Blad: wersje obfuscatorów C nie pasowały do LLVM/Clanga w systemie, co kończyło się nieczytelnymi błędami kompilacji.
  - Wymaganie: pinuj wersje O‑LLVM/Hikari i loguj `clang --version`; mismatch = fail‑fast z instrukcją instalacji właściwego toolchaina.

- [PIT-0249] Blad: `thin.integrity` (inline) wlaczony razem z `protection.elfPacker` powodowal brak markera i fail weryfikacji.
  - Wymaganie: `thin.integrity` w trybie `inline` jest niekompatybilny z `protection.elfPacker`; build ma fail‑fast z jasnym komunikatem.
  - Wymaganie: gdy potrzebny `elfPacker`, uzyj `thin.integrity.mode=sidecar`.

- [PIT-0250] Blad: przy `thin.integrity.mode=sidecar` plik hasha nie byl kopiowany przy payload‑only deploy lub rollback.
  - Wymaganie: `r/<integrity.file>` musi byc kopiowany do release i do instalacji, takze przy payload‑only.
  - Wymaganie: cleanup/rollback usuwa `r/<integrity.file>` gdy brak go w release.

- [PIT-0251] Blad: deploy/rollback zakladal na sztywno nazwe `ih`, ignorujac `thin.integrity.file`.
  - Wymaganie: nazwa sidecara pochodzi zawsze z configu (fail‑fast przy niedozwolonej nazwie).

- [PIT-0252] Blad: nowy plik w layout (np. sidecar) nie byl uwzgledniony w deploy/rollback/cleanup, przez co stan na target byl niespojny.
  - Wymaganie: kazdy nowy plik w layout musi byc dodany do wszystkich sciezek deployu, rollbacku i cleanupu oraz pokryty testem.

- [PIT-0253] Blad: test UI E2E uruchamial AIO z wlaczonym `strip`/`elfPacker`, co jest ignorowane (auto-disabled) i zaciemnia intencje testu.
  - Wymaganie: testy UI używaja `thin-split` (lub jawnie wylaczaja `strip`/`elfPacker` dla AIO) i asercyjnie weryfikują ostrzeżenie/compat.

- [PIT-0254] Blad: testy uruchamialy AIO z wlaczonym `thin.integrity`, co zawsze failuje (integrity wymaga `thin-split`).
  - Wymaganie: testy dla AIO musza wylaczyc `thin.integrity` albo przejsc na `thin-split`.

- [PIT-0255] Blad: testy automatycznie wylaczaly funkcje (np. brak obfuscatora/packera), ale brakowalo osobnego testu pokrywajacego te funkcje.
  - Wymaganie: kazda funkcja wylaczana w testach musi miec osobny E2E (gated ENV), ktory wymusza jej wlaczenie i failuje przy braku narzedzia.

- [PIT-0256] Blad: lokalne testy E2E failowaly, bo `sentinel` byl wlaczony i brakowalo sentinel blob na hoście.
  - Wymaganie: lokalne E2E musza jawnie wylaczac `build.sentinel.enabled` albo instalowac sentinel przed uruchomieniem.

- [PIT-0257] Blad: `snapshotGuard` uruchomiony domyslnie generowal falszywe blokady (przerwy, resume VM).
  - Wymaganie: `snapshotGuard` jest opt‑in, ma jasne progi (`intervalMs`, `maxJumpMs`, `maxBackMs`) i nie trzyma event‑loop (timer `unref`).
  - Wymaganie: testy wymuszaja trigger tylko przez dedykowane ENV i nie uzywaja tego w produkcji.

- [PIT-0258] Blad: brak sprawdzania kodow bledu dla `PR_SET_DUMPABLE`/`setrlimit(RLIMIT_CORE)` powodowal “ciche” nieskuteczne zabezpieczenia.
  - Wymaganie: `ptraceGuard`/`coreDump` musza fail‑fast, jesli prctl/setrlimit nie dziala (bez fallbacku).

- [PIT-0259] Blad: seccomp wlaczony na kernelu bez wsparcia lub bez `no_new_privs` powodowal losowe awarie.
  - Wymaganie: `seccompNoDebug` ma czytelny fail‑fast (brak wsparcia = blad z instrukcja).
  - Wymaganie: testy E2E probuja `seccompNoDebug` w trybie `errno` (nie `kill`), aby mozna bylo asercyjnie sprawdzic blad.

- [PIT-0260] Blad: brak kontroli loadera pozwalal uruchomic launcher przez alternatywny `ld-linux` i ominac czyszczenie env.
  - Wymaganie: `loaderGuard` sprawdza `PT_INTERP` i obecność loadera w `/proc/self/maps`; mismatch = fail‑fast.

- [PIT-0261] Blad: metadane kodeka byly zapisywane jako JSON na serwerze.
  - Wymaganie: wszystko co trafia na target powinno byc binarne/obfuskowane (brak czytelnych JSON).
  - Wymaganie: nazwy plikow na target nie powinny zdradzac roli (uzywaj krotszych/nijakich nazw, np. `c` zamiast `codec.bin`).

- [PIT-0262] Blad: w release brakowalo `public/` lub `data/` (UI/plikowe zasoby nie dzialaly po sealingu).
  - Wymaganie: `build.includeDirs` musi zawierac wszystkie katalogi runtime (np. `public`, `data`).
  - Wymaganie: po `seal release` zawsze uruchom `seal run-local --sealed` i sprawdz UI/zasoby.

- [PIT-0263] Blad: kod szukal zasobow przez `__dirname`, co po bundlingu wskazywalo zla sciezke.
  - Wymaganie: zasoby runtime lokalizuj wzgledem `process.cwd()` (release dir) i jawnych katalogow (`public/`, `shared/`).

- [PIT-0264] Blad: runtime zachowywal sie jak w dev (brak `NODE_ENV=production`), co zmienialo logike lub wydajnosc.
  - Wymaganie: w uruchomieniu produkcyjnym ustaw `NODE_ENV=production` i testuj w tej konfiguracji.

- [PIT-0265] Blad: runtime dziedziczyl `NODE_OPTIONS`/`NODE_PATH` z hosta (np. `--inspect`, `--require`), co otwieralo debug lub wstrzykiwalo hooki.
  - Wymaganie: `run-current.sh`/launcher sanitizuje ryzykowne ENV (co najmniej `NODE_OPTIONS`, `NODE_PATH`, `NODE_EXTRA_CA_CERTS`).
  - Wymaganie: debug/testowe hooki uruchamiaj tylko jawnie przez dedykowane flagi runtime.
- [PIT-0266] Blad: runtime/testy dziedziczyly `NODE_V8_COVERAGE` lub `NODE_DEBUG`, co generowalo pliki coverage albo nadmierne logi (i wyciek sciezek), spowalniajac uruchomienia.
  - Wymaganie: launcher/testy czyszcza `NODE_V8_COVERAGE` i `NODE_DEBUG` (lub pozwalaja tylko na jawny opt‑in z logiem).

- [PIT-0267] Blad: bundler nie dostal jawnego `NODE_ENV`, przez co kod dev zostal w bundle i nie zadzialalo dead-code elimination.
  - Wymaganie: ustawiaj `define`/`env` w bundlerze (`process.env.NODE_ENV="production"`) i loguj effective config.

## Testy / CI

- [PIT-0268] Blad: testy E2E potrafily wisiec bez wyjscia (brak timeoutu na krokach/komendach).
  - Wymaganie: **kazdy** test E2E ma timeout (per‑test + per‑krok/subprocess).
  - Wymaganie: brak postepu > timeout = twarde przerwanie z jasnym bledem.
  - Wymaganie: E2E uzywa **szybkich przykladow/fixture** (minimalny projekt), nie pelnych produkcyjnych buildow.
  - Wymaganie: procesy uruchamiane w testach musza miec drenaz stdout/stderr (albo `stdio: inherit`), zeby nie blokowac procesu.
  - Wymaganie: testy nie polegaja na **kruchej** analizie stdout child procesu (ANSI/kolory/pipe). Preferuj JSON output, kody wyjscia, lub wywolania in‑process; zawsze stripuj ANSI.
  - Wymaganie: w testach ustaw `NO_COLOR=1` i `FORCE_COLOR=0`, aby ograniczyc ANSI w outputach narzedzi.
  - Wymaganie: helper `fail()` w testach musi **zatrzymac** test (throw/exit), a nie tylko logowac blad.
  - Wymaganie: testy UI musza zawsze zamykac browser (`finally`), nawet przy bledzie.
  - Wymaganie: subprocess musi zawsze obslugiwac zdarzenie `error` (i resolve/reject), aby nie zostawiac wiszacej obietnicy.
  - Wymaganie: testy E2E uzywaja losowych portow (bez hardcode `3000`), aby uniknac `EADDRINUSE`.
  - Wymaganie: po testach usuwaj katalogi tymczasowe (np. `/tmp/seal-*`) zeby nie zapychac dysku.
  - Wymaganie: gdy narzedzie nie ma wbudowanego timeoutu, owijaj je zewnetrznym `timeout` (lub wrapperem) i loguj czas.
  - Wymaganie: testy CLI uruchamiaj przez `bin/seal.js`/`seal`, nie przez `src/cli.js` (tam `main` nie jest auto‑run); ustaw `SEAL_BATCH_SKIP=1` w testach.
  - Wymaganie: dla narzedzi typu `strings` ustawiaj timeout i `maxBuffer` (albo streamuj output), bo duze binarki potrafia przeladowac bufor `spawnSync`.

- [PIT-0269] Blad: timeouts E2E były stałe i za niskie w Dockerze/na wolnych hostach, co powodowało fałszywe FAIL mimo poprawnego działania.
  - Wymaganie: wszystkie timeouty E2E (build/run/test, zstd/strings) muszą wspierać globalną skalę (`SEAL_E2E_TIMEOUT_SCALE` lub `SEAL_E2E_SLOW`).
  - Wymaganie: Docker E2E domyślnie podnosi timeouty (np. 2x) i loguje efektywną skalę.

- [PIT-0270] Blad: pomocnicze timeouty (np. polling/healthcheck) byly krotsze niz globalny `runTimeoutMs`, co dawalo falszywe FAIL mimo trwajacego startu.
  - Wymaganie: wszystkie timeouty w E2E pochodza z jednego zrodla (run/step timeout) albo maja jawny per-tryb override; brak ukrytych limitow.

- [PIT-0271] Blad: testy z wieloma trybami/variantami (np. dwa sposoby bootstrapa) sprawdzaly tylko jeden, zostawiajac niepokryte sciezki.
  - Wymaganie: E2E ma macierz trybow dla kazdej funkcji wielomodalnej i loguje aktywny tryb w output.

- [PIT-0272] Blad: brak prereq check per‑tryb powodowal globalny SKIP lub FAIL calej suite, mimo ze inne testy mogly sie wykonac.
  - Wymaganie: prereq (toolchain/feature) weryfikuj per‑test/per‑tryb; brak = SKIP z powodem, reszta suite dalej dziala.

- [PIT-0273] Blad: override timeoutow dla jednej funkcji wydluzal cale E2E, nawet gdy funkcja nie byla aktywna.
  - Wymaganie: override timeoutow jest warunkowy i aktywny tylko, gdy dany artefakt/funkcja jest obecna.

- [PIT-0274] Blad: testy uruchamiane jako root zostawialy root‑owned tmp przy bledzie builda (trudne sprzatanie bez sudo).
  - Wymaganie: E2E uruchamiane jako root tworza tmp na starcie i **zawsze** sprzataja w `finally` (nawet przy fail‑fast).

- [PIT-0275] Blad: kopiowanie projektu testowego z `node_modules/` powodowalo ogromne kopie i flakey E2E.
  - Wymaganie: fixture/test‑workspace nie kopiuje `node_modules/`; zaleznosci instaluj osobno (`npm ci`/`npm install`).
  - Wymaganie: testy loguja, czy instalacja zaleznosci jest fresh czy reuse.

- [PIT-0276] Blad: docker E2E instalowal zaleznosci za kazdym uruchomieniem, bo `node_modules` i cache npm nie byly mapowane do trwalego volume, a domyslne sciezki cache roznily sie miedzy skryptami.
  - Wymaganie: docker E2E mapuje trwale volume-y dla `node_modules` i `~/.npm`, a domyslny katalog cache jest spojny we wszystkich entrypointach (skrypty + docker-compose).
  - Wymaganie: cache jest kluczowany po lockfile/konfiguracji i loguje decyzje "fresh vs reuse".
  - Wymaganie: cache root jest jawny (nie zalezy od `HOME` root/user) i logowany na starcie testu.
  - Wymaganie: cache kluczuj dodatkowo po `node` major, `npm` major i `os+arch`, zeby uniknac ABI mismatch w `node_modules`.
  - Wymaganie: cache root musi byc zapisywalny i w dedykowanym katalogu (np. `seal-out/e2e/cache` lub `SEAL_E2E_CACHE_DIR`); brak zapisu = fail‑fast z instrukcja.
  - Wymaganie: weryfikuj, czy wspolny `node_modules`/symlink wskazuje na istniejący, zapisywalny katalog; inaczej rebuild lub fail‑fast z instrukcja.
  - Wymaganie: cache invaliduje sie po zmianie skryptow instalacyjnych lub wersji narzedzi; hash skryptow i wersji wchodzi do klucza cache.
  - Wymaganie: wspoldzielony `node_modules` jest chroniony lockiem podczas `npm ci/install`, aby uniknac uszkodzen przy rownoleglych runach.
  - Wymaganie: instalacja w shared cache musi tworzyc **pelny** layout `node_modules` (nie „goły” katalog), inaczej bundler nie rozwiaze zaleznosci.
  - Wymaganie: docker E2E cache nie jest współdzielony z lokalnym E2E (oddzielny katalog), aby uniknąć konfliktów ownership/ABI.
  - Wymaganie: loguj właściciela cache (`stat -c %U:%G`) i ostrzegaj, gdy różni się od użytkownika uruchamiającego testy.

- [PIT-0277] Blad: wspoldzielony cache E2E nie mial jawnego sposobu resetu i prowadzil do trudnych w debugowaniu falszywych "pass".
  - Wymaganie: skrypty maja flage/ENV do wymuszenia reinstall/flush cache i loguja aktywne ustawienia.

- [PIT-0278] Blad: skrypt E2E uruchamiany w Dockerze nie mial bitu wykonywalnosci, co konczylo sie `Permission denied` (np. `run-e2e-parallel.sh`).
  - Wymaganie: wszystkie skrypty uruchamiane bezposrednio maja `chmod +x` w repo i test walidujacy `git ls-files -m`/`stat`.
  - Wymaganie: w Docker E2E uruchamiaj skrypty przez `bash /path/script.sh` (nie polegaj tylko na `+x`), bo bind‑mount moze byc `noexec` mimo poprawnych uprawnien.

- [PIT-0279] Blad: obraz buildera nie mial `node`/`npm`, a uruchomienie z `SEAL_E2E_INSTALL_DEPS=0` konczylo sie `npm: command not found`.
  - Wymaganie: E2E robi preflight i fail‑fast z jasna instrukcja, jesli `node`/`npm` nie sa dostepne; w trybie "install deps=0" obraz musi miec minimalny runtime (`node`, `npm`) lub runner sam instaluje te narzedzia.

- [PIT-0280] Blad: wielolinijkowe komendy E2E (dziesiatki `SEAL_E2E_*` z `\\`) byly latwe do zepsucia (brak backslasha, przypadkowy komentarz), co ucinalo ENV i uruchamialo inny zakres testow.
  - Wymaganie: udostepnij jeden kanoniczny wrapper (skrypt) lub plik `.env`, a runner waliduje i loguje **effective config**; dokumentacja nie powinna wymagać ręcznego kopiowania długich "ścian" ENV.
- [PIT-0281] Blad: bardzo długie linie z wieloma `VAR=...` przekraczały `ARG_MAX` i uruchomienie kończyło się niejasnym błędem lub obciętym ENV.
  - Wymaganie: duże konfiguracje przekazuj przez plik `.env`/config, nie przez pojedynczą linię shell.

- [PIT-0282] Blad: docker buildy korzystaly ze starych obrazow bazowych, bo `--pull` nie byl jawnie kontrolowany.
  - Wymaganie: tryb pull jest jawny (`--pull`/`--no-pull`) i logowany, a bazowy obraz jest identyfikowany po tagu/digescie.
  - Wymaganie: loguj tryb BuildKit (`DOCKER_BUILDKIT`) i `BUILDKIT_PROGRESS`, zeby uniknac roznic w cache i output.

- [PIT-0283] Blad: `--network=host` nie jest wspierany na Docker Desktop/WSL, a skrypty zakladaly jego dostepnosc.
  - Wymaganie: wykrywaj platforme/daemon i w razie braku wsparcia uzyj sieci domyslnej lub oznacz test jako SKIP z instrukcja.

- [PIT-0284] Blad: skrypty zakladaly `docker compose` (plugin v2), a na hostach z `docker-compose` v1 testy nie startowaly.
  - Wymaganie: wykrywaj `docker compose` vs `docker-compose`, loguj wybrany binarny i wypisz instrukcje instalacji, gdy brak.

- [PIT-0285] Blad: docker build wciagal ogromny kontekst (`node_modules`, `seal-out`, `.git`), co spowalnialo buildy i wprowadzalo stale artefakty.
  - Wymaganie: utrzymuj `.dockerignore` (min. `node_modules`, `seal-out`, `.git`) i loguj rozmiar kontekstu z ostrzezeniem przy duzych wartosciach.

- [PIT-0286] Blad: Dockerfile mial `apt-get update` w osobnej warstwie niz `apt-get install`, co prowadzilo do 404/starych indeksow po uzyciu cache.
  - Wymaganie: lacz `apt-get update` i `apt-get install` w jednym `RUN`, aby cache nie psul instalacji pakietow.

- [PIT-0287] Blad: obraz testowego serwera byl reuse’owany mimo zmian w Dockerfile/entrypoincie (tag bez zmiany), co uruchamialo stary build.
  - Wymaganie: obraz ma label z hashem wejsc (Dockerfile/entrypoint); mismatch = wymuszenie rebuild.

- [PIT-0288] Blad: rozne entrypointy E2E mialy inne defaulty (cache, parallel), co utrudnialo reprodukcje miedzy lokalnym i dockerowym uruchomieniem.
  - Wymaganie: jeden publiczny entrypoint ustawia wspolne domyslne wartosci i jest jedynym rekomendowanym sposobem uruchomienia; pozostale skrypty sa wewnetrzne.

- [PIT-0289] Blad: ustawienia rownoległosci E2E (mode/jobs) nie byly walidowane ani logowane, co dawalo nieoczekiwany zakres testow i trudne debugowanie.
  - Wymaganie: runner loguje effective `SEAL_E2E_PARALLEL`, `SEAL_E2E_PARALLEL_MODE` i `SEAL_E2E_JOBS`, a niepoprawne wartosci sa odrzucane lub fallbackowane z ostrzezeniem.
  - Wymaganie: w kontenerach/drodkach CI domyslny `SEAL_E2E_JOBS` nie powinien byc rowny `nproc` hosta; ustaw limit (np. min(nproc, 8)) i loguj cap.

- [PIT-0290] Blad: uruchomienie E2E przez `sudo` bez zachowania ENV kasowalo filtry (`SEAL_E2E_TESTS`), co uruchamialo pelna suite mimo intencji.
  - Wymaganie: przy `sudo` zawsze przekazuj ENV jawnie (`sudo VAR=...`) albo uzywaj `sudo -E` + allowlista; runner loguje effective filters.

- [PIT-0291] Blad: rownolegle uruchomienia E2E probowaly instalowac globalne narzedzia (packery/obfuscatory) jednoczesnie, co powodowalo wyscigi i uszkodzenia.
  - Wymaganie: instalatory narzedzi globalnych uzywaja locka (np. `flock` na cache) i czekaja/skipuja, gdy instalacja juz trwa.
  - Wymaganie: instalacja jest atomowa (tmp + rename), a stamp zapisywany **po** sukcesie.
  - Wymaganie: lock ma timeout i loguje czas oczekiwania, aby uniknac wiszenia w CI.

- [PIT-0292] Blad: `npm install` w CI modyfikowal lockfile i wprowadzał drift wersji.
  - Wymaganie: w CI/E2E preferuj `npm ci` (deterministyczny), a `npm install` tylko lokalnie.
  - Wymaganie: brak `package-lock.json` przy `npm ci` = FAIL z instrukcja wygenerowania lockfile.
  - Wymaganie: po instalacji sprawdzaj, czy lockfile nie zostal zmieniony; w CI zmiana = FAIL z diffem.

- [PIT-0293] Blad: rozne wersje `npm` przepisywaly lockfile (lockfileVersion) i psuly deterministycznosc.
  - Wymaganie: pinuj wersje `npm` (lub loguj `npm -v` i egzekwuj oczekiwany major); mismatch = WARN/FAIL.
  - Wymaganie: loguj uzywany package manager i jego wersje; gdy repo wymaga `npm`, blokuj `yarn/pnpm` bez jawnego opt‑in.
  - Wymaganie: jesli `corepack` jest aktywny, loguj jego wersje i wymusz `packageManager` z `package.json` (albo jawnie go wylacz).

- [PIT-0294] Blad: `npm ci/install` wisial przy problemach sieciowych (brak timeoutow lub zbyt dlugie retry).
  - Wymaganie: ustaw `NPM_CONFIG_FETCH_RETRIES`, `NPM_CONFIG_FETCH_TIMEOUT`, `NPM_CONFIG_FETCH_RETRY_MINTIMEOUT` i `NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT` w testach/CI.
  - Wymaganie: ustaw `NPM_CONFIG_LOGLEVEL=warn` (lub `error`) w CI, aby ograniczyc szum i przyspieszyc logi.

- [PIT-0295] Blad: zmiany w domyslnym zachowaniu `npm` dla peer deps powodowaly losowe FAIL w zaleznosci od wersji.
  - Wymaganie: jawnie ustaw `NPM_CONFIG_STRICT_PEER_DEPS` lub `NPM_CONFIG_LEGACY_PEER_DEPS` i loguj aktywna wartosc.

- [PIT-0296] Blad: `NODE_ENV=production` podczas E2E powodowal pomijanie devDependencies i brak narzedzi testowych.
  - Wymaganie: dla instalacji testowych wymusz `NODE_ENV=development` lub `npm ci --include=dev`, a tryb instalacji loguj na starcie.

- [PIT-0297] Blad: `NPM_CONFIG_IGNORE_SCRIPTS=1` w srodowisku CI wylaczal postinstall i psul build narzedzi natywnych.
  - Wymaganie: w E2E jawnie ustaw `NPM_CONFIG_IGNORE_SCRIPTS=false` (lub wykryj i FAIL z instrukcja), a wartosc loguj.

- [PIT-0298] Blad: `NPM_CONFIG_PRODUCTION=1`/`--omit=dev` byl aktywny w E2E, co pomijalo narzedzia testowe.
  - Wymaganie: w E2E wymusz instalacje devDependencies i loguj efektywny tryb (`production`/`omit`).

- [PIT-0299] Blad: `npm` uruchamiany jako root w containerze blokowal skrypty postinstall (brak `unsafe-perm`) lub wykonywal je z innymi uprawnieniami.
  - Wymaganie: w kontenerach uruchamiaj `npm` jako nie‑root lub ustaw `NPM_CONFIG_UNSAFE_PERM=true`.

- [PIT-0300] Blad: `npm ci/install` uruchomione jako root tworzylo root‑owned `node_modules` w workspace, blokujac kolejne runy (EACCES) i zostawiajac brud w repo.
  - Wymaganie: instaluj zaleznosci jako nie‑root (mapuj UID/GID w kontenerze) albo instaluj do cache poza repo; jesli musisz uzyc root, wykonaj `chown -R` po instalacji i loguj ownership.

- [PIT-0301] Blad: E2E uruchomione przez `sudo` zapisywaly cache npm w `/root` (inny `HOME`), co powodowalo powtórne instalacje i root‑owned artefakty.
  - Wymaganie: przy `sudo` ustaw jawny `HOME` i `NPM_CONFIG_CACHE` (np. do katalogu temp/volume) albo uruchamiaj testy bez `sudo` z odpowiednimi uprawnieniami.

- [PIT-0302] Blad: `npm` uruchamial audit/fund i siegal do sieci, co w CI powodowalo timeouty lub flakey wyniki.
  - Wymaganie: w CI/E2E ustaw `NPM_CONFIG_AUDIT=false`, `NPM_CONFIG_FUND=false`, `NPM_CONFIG_PROGRESS=false`.

- [PIT-0303] Blad: narzedzia zachowywaly sie inaczej poza trybem CI (np. interaktywne prompt‑y, spinner), co psulo logi.
  - Wymaganie: w testach/CI ustaw `CI=1` (oraz `FORCE_COLOR=0`) aby wymusic nieinteraktywny tryb narzedzi.

- [PIT-0304] Blad: `npm` update‑notifier kontaktowal sie z siecia i wieszal CI.
  - Wymaganie: w CI/E2E ustaw `NPM_CONFIG_UPDATE_NOTIFIER=false`.

- [PIT-0305] Blad: uruchomienie testow przez `sudo` uzywalo innej wersji Node (np. systemowej) niz wymaganej, co konczylo sie `MODULE_NOT_FOUND` lub regresjami.
  - Wymaganie: testy loguja `node -v` + `which node` na starcie i fail‑fast, gdy wersja < wymaganej.
  - Wymaganie: przy `sudo` uzywaj `sudo -E` lub absolutnej sciezki do `node`, aby nie tracic wersji z nvm/asdf.

- [PIT-0306] Blad: brak informacji o wersji kodu uruchomionego w E2E (commit/dirty) utrudnial odtwarzanie bledow.
  - Wymaganie: testy loguja `git rev-parse HEAD` i `git status --porcelain` (lub "no git"), razem z OS/arch.

- [PIT-0307] Blad: test uruchomiony z innego CWD nie znajdowal skryptow (relative path), co dawalo `MODULE_NOT_FOUND`.
  - Wymaganie: skrypty E2E wyznaczaja repo root wzgledem `__dirname` i dzialaja niezaleznie od CWD.
  - Wymaganie: dokumentacja komend testowych podaje jawne `cwd` albo absolutna sciezke do skryptu.

- [PIT-0308] Blad: testy „expect fail” nie drenowaly stdout/stderr child procesu, co moglo blokowac proces i zafalszowac timeout.
  - Wymaganie: drenaż stdout/stderr jest wymagany **we wszystkich** sciezkach testu (takze przy spodziewanej porazce).

- [PIT-0309] Blad: testy ignorowaly `signal` z `child.on('exit')`, przez co crash SIGKILL/SIGSEGV byl raportowany jako "ok".
  - Wymaganie: testy loguja i failuja na `signal` (i rozrozniaja `code` vs `signal`), aby nie maskowac crashy.

- [PIT-0310] Blad: testy „expect fail” akceptowaly dowolny błąd (np. brak configu) zamiast tego konkretnego, ktory mial byc wykryty.
  - Wymaganie: negatywne testy musza asercyjnie weryfikowac **konkretny** sygnal (kod wyjscia lub wzorzec stderr); inne bledy = FAIL.

- [PIT-0311] Blad: testy zalezne od narzedzi (postject/strip/packery) failowaly zamiast graczejnego SKIP, gdy narzedzia nie byly zainstalowane.
  - Wymaganie: testy tool‑dependent sprawdzaja dostepnosc narzedzi i robia SKIP z powodem (chyba ze env wymusza fail).

- [PIT-0312] Blad: testy `strip`/packer mialy tylko czesciowa weryfikacje, bo brakowalo narzedzi weryfikacyjnych (np. `readelf`, `eu-readelf`, `objdump`, `dwarfdump`, `binwalk`, `file`, `strings`, `zstd`).
  - Wymaganie: na maszynie testowej zainstaluj `binutils` + `elfutils` + `binwalk` + `zstd` + `dwarfdump`; w trybie strict brak narzedzi = FAIL.

- [PIT-0313] Blad: lockfile narzedzi mial brakujace pola (url/rev/bin) lub literowki, a instalator nie failowal jasno.
  - Wymaganie: waliduj schema lockfile i fail‑fast z lista narzedzi/kluczy, ktorych brakuje.

- [PIT-0314] Blad: lokalne patche do narzedzi z lockfile byly stosowane cicho, a cache nie uwzglednial wersji patcha, co prowadzilo do uzycia starej binarki.
  - Wymaganie: kazdy patch jest jawnie logowany i sterowany ENV (on/off), a stamp cache uwzglednia wersje patcha/flag.

- [PIT-0315] Blad: cache narzedzi E2E byl world‑writable lub mial nieoczekiwanego ownera, co pozwalalo na podmiane binarek.
  - Wymaganie: katalog cache i binarki musza byc wlasnoscia biezacego uzytkownika/roota i miec bezpieczne perms (np. 0700/0755); inaczej fail‑fast.

- [PIT-0316] Blad: stamp cache nie uwzglednial wersji kompilatora/toolchaina, przez co uzywano binarek zbudowanych na innym toolchainie (ABI mismatch).
  - Wymaganie: stempel cache zawiera wersje kompilatora (`gcc`/`clang`), system i kluczowe flagi/patch version, aby wymusic rebuild przy zmianie.

- [PIT-0317] Blad: brak metryk czasu ukrywal najwolniejsze testy i utrudnial planowanie rownoległości.
  - Wymaganie: testy E2E logują czas per‑test/per‑grupa oraz sumaryczny czas, zeby mozna było priorytetyzowac optymalizacje.
  - Wymaganie: summary E2E zawiera zestawienie per‑kategoria (PASS/FAIL/SKIP) oraz czas na kategorie, aby latwo wykryc najwolniejsze obszary.

- [PIT-0318] Blad: E2E uruchamiane na nielinuxowych systemach dawaly false‑negative (testy packer/obfuscation są linux‑only).
  - Wymaganie: pelny zestaw E2E uruchamiaj na Linux; inne OS powinny jawnie SKIP z powodem.

- [PIT-0319] Blad: testy E2E auto‑modyfikowaly konfiguracje (np. wylaczenie ochron/packerow) bez jawnego logu, przez co maskowaly regresje.
  - Wymaganie: kazda automatyczna zmiana configu w testach musi byc logowana i uzasadniona.
  - Wymaganie: wylaczenia musza byc granularne (tylko niekompatybilna opcja), bez globalnego `protection.enabled=false` jako obejscia.

- [PIT-0320] Blad: testy/skrypty pomijaly kroki (np. instalacje narzedzi, runtime checki) bez jasnej informacji.
  - Wymaganie: kazdy SKIP musi wypisac powód i instrukcje jak wymusic pelny test.

- [PIT-0321] Blad: zmiana domyslnych ustawien E2E wymagala edycji skryptow w repo, co zostawialo lokalne diffy i rozjazdy miedzy srodowiskami.
  - Wymaganie: defaulty E2E sa w repo jako plik wzorcowy, a lokalne override przechowuj w `.seal/e2e.env` lub pod `SEAL_E2E_CONFIG` (poza repo); runner loguje zrodlo configu.
  - Wymaganie: lokalny plik override jest ignorowany przez git (brak przypadkowych commitow).
  - Wymaganie: jawne ENV ustawione przez uzytkownika (np. `SEAL_E2E_TESTS`) ma wyzszy priorytet niz config plik; jeśli chcesz pominąć config, ustaw `SEAL_E2E_CONFIG=/dev/null`.
  - Wymaganie: pliki env powinny ustawiać tylko defaulty (`VAR="${VAR:-default}"`), aby nie nadpisywać jawnie ustawionych wartości.

- [PIT-0322] Blad: `SEAL_E2E_CONFIG` wskazywal na nieistniejacy plik, a runner cicho wracal do defaultow, co mylilo wyniki.
  - Wymaganie: przy jawnym wskazaniu pliku brak = FAIL albo wyrazny warning + log fallback.

- [PIT-0323] Blad: loader configu wywolywal helper (`fail`) zdefiniowany ponizej, co przy bledzie configu konczylo sie `fail: command not found`.
  - Wymaganie: helpery uzywane w preflight/config load musza byc zdefiniowane **przed** ich uzyciem; w shell nie zakladaj istnienia funkcji ponizej miejsca wywolania.

- [PIT-0324] Blad: uruchomienie E2E przez `sudo` nie moglo odczytac `SEAL_E2E_CONFIG` (plik w `$HOME` z perms 600) albo wskazywalo na nieistniejacy plik (inny `HOME`/CWD), co powodowalo fallback lub fail w pozniejszym kroku.
  - Wymaganie: config E2E jest rozwiazywany do sciezki absolutnej **przed** eskalacja albo jest czytelny dla uzytkownika uruchamiajacego test (root). Loguj `whoami` + sciezke configu.

- [PIT-0325] Blad: plik configu E2E byl `source`-owany jako shell, co pozwalalo na wykonanie polecen z pliku.
  - Wymaganie: plik env jest traktowany jako dane (`KEY=VALUE`), albo przed `source` sprawdz ownership/perms (owner-only, bez world-writable) i loguj ostrzezenie.

- [PIT-0326] Blad: brak podsumowania SKIP dawał fałszywe poczucie “all green”.
  - Wymaganie: testy musza wypisać liczbę i listę SKIP oraz mieć tryb strict, który traktuje SKIP jako FAIL w runach certyfikacyjnych.

- [PIT-0327] Blad: wspolny `SEAL_E2E_SUMMARY_PATH` przy rownoleglych uruchomieniach powodowal przeplatanie wpisow i uszkodzony TSV.
  - Wymaganie: summary path jest unikalny per‑run/grupa lub zapisy chronione lockiem (append atomowy).

- [PIT-0328] Blad: `SEAL_E2E_SUMMARY_PATH` wskazywal na katalog w repo (zwl. przy uruchomieniu jako root), co zostawialo root‑owned artefakty i przypadkowe commity.
  - Wymaganie: summary path jest w `seal-out/e2e/summary` (domyslnie) lub jawnie ustawiony; gdy jest w repo poza `seal-out`, wymagaj jawnego override i ostrzezenia.

- [PIT-0329] Blad: pola summary (group/test) zawieraly taby/nowe linie, co psulo format TSV.
  - Wymaganie: sanitizuj pola summary (stripuj `\\t`/`\\n`) lub escapuj je w stabilny sposob.

- [PIT-0330] Blad: filtr testow E2E (np. `SEAL_E2E_TESTS`) z literowka powodowal pusta suite lub pomijal testy bez ostrzezenia.
  - Wymaganie: przy aktywnym filtrze loguj liste dopasowanych testow; brak dopasowan = FAIL lub jawny SKIP z instrukcja.
  - Wymaganie: waliduj kazdy token filtra przeciwko znanej liscie testow; nieznane nazwy = FAIL (chyba ze tryb "allow-unknown").

- [PIT-0331] Blad: nowe pliki testow E2E nie byly dodawane do runnera i w praktyce nigdy sie nie uruchamialy.
  - Wymaganie: runner ma auto‑discover albo manifest z CI checkiem, ktory failuje, gdy test nie jest zarejestrowany.

- [PIT-0332] Blad: tryb toolsetu (core/full) nie byl logowany, a testy probowaly uruchamiac niedostepne narzedzia mimo ustawionego ograniczenia.
  - Wymaganie: runner loguje aktywny toolset, a testy/instalatory respektuja go (brak narzedzi w toolsecie = SKIP lub jawny FAIL w trybie strict).

- [PIT-0333] Blad: niepoprawna wartosc `SEAL_E2E_TOOLSET` byla akceptowana bez ostrzezenia, co konczylo sie nieoczekiwanym zakresem testow.
  - Wymaganie: toolset jest walidowany przeciwko allowliscie (np. `core|full`); nieznana wartosc = FAIL lub wyrazny warning + fallback.

- [PIT-0334] Blad: `NODE_OPTIONS`/`NODE_PATH` z srodowiska wstrzykiwaly `--require` lub inne hooki, psujac build/testy.
  - Wymaganie: testy i buildy czyszcza ryzykowne ENV (`NODE_OPTIONS`, `NODE_PATH`, `NODE_EXTRA_CA_CERTS`) albo jawnie ustawiają bezpieczne wartości.

- [PIT-0335] Blad: testy E2E uruchamialy build z wlaczona obfuskacja C, ale bez zainstalowanego obfuscating clang, co konczylo sie nieczytelnym bledem.
  - Wymaganie: testy wykrywaja brak obfuscatora i **jawnie** wylaczaja launcherObfuscation (lub robia SKIP), z jasnym logiem.
  - Wymaganie: testy obfuskacji logują wymagania (np. `SEAL_E2E_TOOLSET=full`, `SEAL_E2E_INSTALL_OBFUSCATORS=1`) i wskazują jak je spełnić.

- [PIT-0336] Blad: testy E2E nie wypisywaly wystarczajacego kontekstu przy porazce (brak stdout/stderr/command/config).
  - Wymaganie: przy failu test wypisuje command line, fragment stdout/stderr (z limitem) i effective config.
  - Wymaganie: gdy test waliduje wiele sub‑checkow, musi podac liste tych, ktore padly (got/expected), nie tylko `ok=false`.

- [PIT-0337] Blad: testy modyfikowaly `config.runtime.json5` lub inne pliki projektu i nie przywracaly ich (efekt uboczny w repo).
  - Wymaganie: testy pracuja na kopii projektu albo uzywaja `outDirOverride` + temp config w katalogu release.
  - Wymaganie: kazda modyfikacja plikow w repo musi byc przywrocona w `finally`.

- [PIT-0338] Blad: uruchomienie testow jako root zostawialo root‑owned artefakty w repo (np. `node_modules`, `seal-out`), co psulo prace bez sudo.
  - Wymaganie: testy uruchamiane jako root pracuja na kopii projektu lub w temp‑workspace; nie dotykaja repo.
  - Wymaganie: jesli testy musza operowac na repo, ustaw `umask 022` i wykonuj sprzatanie w `finally`.

- [PIT-0339] Blad: testy polegaly na `sleep()` zamiast aktywnego wait na gotowosc (`/status`), co bylo flakey.
  - Wymaganie: start procesu = aktywny wait na health/status z retry, nie twardy sleep.
  - Wymaganie: test monitoruje wczesne wyjscie procesu i failuje natychmiast z logiem.

- [PIT-0340] Blad: testy modyfikowaly zmienne `SEAL_*` i nie przywracaly ich, co psulo kolejne testy.
  - Wymaganie: snapshot i restore `process.env` (albo kluczowych `SEAL_*`) w `finally`.

- [PIT-0341] Blad: testy zmienialy `process.cwd()` i nie przywracaly go, co psulo kolejne kroki.
  - Wymaganie: snapshot i restore `process.cwd()` w `finally`.

- [PIT-0342] Blad: testy tworzyly artefakty w katalogu projektu (`seal-out/`) i zostawialy je po porazce.
  - Wymaganie: E2E uzywa `outDirOverride` w temp dir; sprzatanie po tescie jest obowiazkowe.

- [PIT-0343] Blad: E2E budowaly ciezkie warianty (np. wysoki poziom `thin`) przez co testy byly zbyt wolne.
  - Wymaganie: testy E2E wymuszaja szybkie ustawienia (`thin.level=low` lub mniejsze chunkSize) i minimalne payloady.

- [PIT-0344] Blad: `SEAL_E2E_EXAMPLE_ROOT`/`SEAL_E2E_SEED_ROOT` wskazywal na niebezpieczna sciezke (np. repo lub katalog systemowy), a runner wykonywal `rm -rf`, co grozilo utrata danych.
  - Wymaganie: E2E waliduje, ze rooty workspace/seed sa w bezpiecznym katalogu (np. `/tmp`/`$TMPDIR`) i nie wskazuja na repo; inaczej fail‑fast z instrukcja.
  - Wymaganie: ewentualne obejscie wymaga jawnej flagi typu `SEAL_E2E_ALLOW_UNSAFE_ROOT=1` z ostrzezeniem.

- [PIT-0345] Blad: zabezpieczenia anti‑debug/snapshot nie mialy deterministycznych wyzwalaczy w testach, przez co E2E byly flakey.
  - Wymaganie: kazda funkcja ochronna ma dedykowane, jawne “test hooks” (ENV) do deterministycznego wywolania w E2E.
  - Wymaganie: test hooks sa aktywne tylko w trybie testowym i domyslnie wylaczone w produkcji.

- [PIT-0346] Blad: testy/skripty zakladaly, ze `/tmp` jest wykonywalny i bezpieczny, ale na niektorych systemach jest `noexec`.
  - Wymaganie: respektuj `TMPDIR` i unikaj uruchamiania binarek z `/tmp` bez sprawdzenia.

- [PIT-0347] Blad: generowany kod C oraz skrypty helperów miały na sztywno `/tmp`, ignorując `TMPDIR`, co psuło działanie na systemach z restrykcjami lub noexec.
  - Wymaganie: używaj `TMPDIR` (z fallbackiem do `/tmp`) zarówno w generatorach C, jak i w skryptach shellowych.

- [PIT-0348] Blad: `TMPDIR` był ustawiony na nieistniejącą lub niewritable/nie‑executable ścieżkę i `mktemp` failował w losowych miejscach.
  - Wymaganie: waliduj `TMPDIR` (czy katalog istnieje, jest zapisywalny **i** ma `+x`) oraz fallback do `/tmp` lub fail‑fast z instrukcją.

- [PIT-0349] Blad: testy E2E uruchamialy operacje systemowe (systemd/`installDir` w realnych sciezkach) i psuly srodowisko.
  - Wymaganie: testy uzywaja sandbox `installDir` w temp i unikalnych nazw uslug.
  - Wymaganie: operacje systemowe sa gated env‑flaga i domyslnie SKIP.

- [PIT-0350] Blad: E2E remote/user‑flow failowal przez brak configu na target (drift), bo test nie pushował konfiguracji.
  - Wymaganie: testy remote zawsze używają `--push-config` (lub jawnie `--accept-drift`) i nie polegają na stanie z poprzednich uruchomień.

- [PIT-0351] Blad: testy polegaly na `localhost`, co w niektorych systemach rozwiązywalo sie do IPv6 i powodowalo fail.
  - Wymaganie: testy jawnie binduja do `127.0.0.1` i uzywaja adresu IPv4.

- [PIT-0352] Blad: testy dockerowe zostawialy kontenery/sieci po porazce i kolejne uruchomienia kolidowaly.
  - Wymaganie: testy dockerowe musza miec `trap`/cleanup i usuwac kontenery/sieci nawet przy error.
  - Wymaganie: opcja `KEEP=1` moze pominac cleanup, ale domyslnie cleanup jest zawsze.

- [PIT-0353] Blad: `docker build` ukrywal output (domyslny progress UI), co utrudnialo diagnoze w CI.
  - Wymaganie: w trybie CI/logowanie ustaw `--progress=plain` lub `BUILDKIT_PROGRESS=plain`.

- [PIT-0354] Blad: docker E2E zapisywal klucze/`known_hosts` w repo (np. `tools/.../docker/e2e/ssh`) i montowal je jako `/root/.ssh` (RW), co tworzylo root‑owned pliki i blokowalo cleanup.
  - Wymaganie: klucze przechowuj poza repo (cache/temp) i montuj **read‑only** (np. `/tmp/seal-ssh`), a do `/root/.ssh` kopiuj **wewnatrz kontenera**; `known_hosts` ma byc w temp kontenera, nie w repo.
  - Wymaganie: dla docker‑compose `SEAL_DOCKER_E2E_SSH_DIR` wskazuje katalog poza repo (domyslnie `/tmp/seal-ssh`).
  - Wymaganie: po przypadkowym zapisie w repo wyczysc root‑owned pliki (np. `sudo rm -f tools/seal/seal/docker/e2e/ssh/known_hosts*`).

- [PIT-0355] Blad: testy dockerowe z systemd/sshd nie startowaly bez `--privileged` i poprawnie zamontowanego cgroup.
  - Wymaganie: w obrazach testowych generuj host keys (`ssh-keygen -A`) lub upewnij sie, ze sa obecne; brak kluczy powoduje cichy fail startu sshd.
  - Wymaganie: testy wymagajace systemd sprawdzaja dostepnosc cgroup (`/sys/fs/cgroup`) i w razie braku robia SKIP z powodem.
  - Wymaganie: dokumentacja testow podaje wymagane flagi (`--privileged`, `--cgroupns=host`).

- [PIT-0356] Blad: kontenery testowe bez init nie sprzataly zombie procesow, co powodowalo flakey timeouts.
  - Wymaganie: uruchamiaj kontenery testowe z `--init` (tini) lub zapewnij init w obrazie.

- [PIT-0357] Blad: po dodaniu uzytkownika do grupy `docker` testy nadal failowaly (brak re‑loginu), co dawalo mylące błędy „permission denied”.
  - Wymaganie: po `usermod -aG docker $USER` wymagany jest nowy login/shell; do czasu odswiezenia uzywaj `sudo docker`.

- [PIT-0358] Blad: testy dockerowe uruchamialy sie na innym Docker context/daemon, co dawalo inne obrazy i cache i mylilo wyniki.
  - Wymaganie: skrypty loguja `docker context show` i `docker info` (server), a uruchomienie moze wskazac jawny context (`DOCKER_CONTEXT=`).
  - Wymaganie: przy `sudo` zachowuj `DOCKER_CONFIG` i `DOCKER_CONTEXT` (albo loguj ich brak), bo inaczej docker moze uzyc innego kontekstu/daemonu.
  - Wymaganie: loguj identyfikatory obrazow (`docker image inspect --format '{{.Id}}'`) i wersje obrazu/testu, zeby nie uruchamiac "starych" buildow.
  - Wymaganie: bind‑mounty z hosta nie moga tworzyc root‑owned artefaktow w repo; uzywaj cache poza repo lub uruchamiaj kontener z mapowanym UID/GID.
  - Wymaganie: loguj architekture hosta i obrazu (`docker info`/`docker inspect`) oraz tryb emulacji; mismatch arch/`--platform` = WARN lub FAIL.
  - Wymaganie: dla cross‑arch uruchomien ustaw `--platform` lub `DOCKER_DEFAULT_PLATFORM`, a w trybie emulacji wydluz timeouty lub ustaw jawny SKIP.

- [PIT-0359] Blad: docker‑compose uzywal domyslnego `project name` i kolidowal z innymi runami (sieci/volumes/containers).
  - Wymaganie: ustaw `COMPOSE_PROJECT_NAME`/`--project-name` na unikalna wartosc per run.

- [PIT-0360] Blad: rownolegle uruchomienia E2E kolidowaly na wspolnych nazwach uslug/plikach (`current.buildId`, instalacje), co dawalo flakey wyniki.
  - Wymaganie: testy musza byc bezpieczne dla rownoleglego uruchomienia (unikalne nazwy uslug, unikalne installDir, izolowane temp rooty).
  - Wymaganie: sharding testow jest deterministyczny (stala kolejnosc listy) i loguje, ktore testy trafily do danego sharda.

- [PIT-0361] Blad: runner rownolegly nie propagowal porazki (exit code=0) lub zostawial dzialajace procesy po FAIL.
  - Wymaganie: tryb rownolegly musi zwrocic non‑zero przy pierwszej porazce i sprzatac pozostale procesy/worker-y.
  - Wymaganie: logi z workerow musza miec prefix testu/workera albo osobne pliki, zeby uniknac interleavingu.

- [PIT-0362] Blad: testy dzielily cache (np. `seal-out/cache`) i wyniki byly zalezne od poprzednich uruchomien.
  - Wymaganie: testy izolują cache (osobny temp project root lub `SEAL_THIN_CACHE_LIMIT=0`).

- [PIT-0363] Blad: testy zapisywaly do `HOME`/`XDG_*`, zostawiajac smieci w profilu uzytkownika.
  - Wymaganie: ustaw `HOME`/`XDG_*` na temp w testach E2E.

- [PIT-0364] Blad: cache npm byl współdzielony miedzy testami i powodowal flakey wyniki (stare artefakty).
  - Wymaganie: w testach ustaw `NPM_CONFIG_CACHE` na temp (per run) lub czyść cache deterministycznie.

- [PIT-0365] Blad: testy uruchamialy komendy, ktore prosily o interaktywny input (git/ssh), przez co CI wisial.
  - Wymaganie: testy maja ustawione `GIT_TERMINAL_PROMPT=0` i nie wywolują interaktywnych narzedzi bez jawnego flag/sekretow.
  - Wymaganie: testy integracyjne/remote sa jawnie gated env‑flaga i bez niej zawsze SKIP.

- [PIT-0366] Blad: UI E2E wymagaly recznego logowania (np. konto produkcyjne), przez co uruchomienia wisialy.
  - Wymaganie: UI E2E uzywa testowych kont/fixture lub mocka auth; brak kredencjalow = SKIP z instrukcja; brak recznych promptow.

- [PIT-0367] Blad: testy E2E polegaly na sieci/DNS (npm/git/HTTP) bez jawnego gate, co powodowalo flakey wyniki lub wiszenie przy braku internetu.
  - Wymaganie: testy nie wymagaja sieci domyslnie; operacje sieciowe sa gated env‑flaga i maja timeouty.

- [PIT-0368] Blad: zmiany w generatorach kodu byly testowane tylko lintem, bez realnego compile/smoke testu.
  - Wymaganie: generator C/JS musi miec automatyczny compile/smoke test (przynajmniej minimalny).
  - Wymaganie: smoke test generatora C uruchamia kompilator z `-Werror`.
  - Wymaganie: standard kompilatora (np. `-std=c11`) jest jawnie ustawiony i spójny na wszystkich maszynach.

- [PIT-0369] Blad: negatywne scenariusze nie byly objete E2E (symlink, zle prawa, brak pliku), przez co regresje wychodzily dopiero na produkcji.
  - Wymaganie: E2E zawsze zawiera scenariusze negatywne.

- [PIT-0370] Blad: sprzatanie tmp/procesow bylo „best-effort”, co zostawialo smieci po bledzie.
  - Wymaganie: cleanup jest deterministyczny i sprawdzany w testach (brak tmp/procesow po zakonczonym tescie).

- [PIT-0371] Blad: testy zalezne od roota/SSH/portow nie sygnalizowaly jawnie, ze zostaly pominiete.
  - Wymaganie: takie testy maja domyslny SKIP i zawsze wypisuja powod.

- [PIT-0372] Blad: testy uruchamialy skrypty przez `/usr/bin/env bash`, a na minimalnych systemach `bash` nie byl dostepny (`/usr/bin/env: bash: No such file or directory`).
  - Wymaganie: testy i helpery uzywaja POSIX `/bin/sh` lub jawnie sprawdzaja dostepnosc `bash` i oznaczaja SKIP.

- [PIT-0373] Blad: brak asercji „brak tmp” pozwalal na ukryty wyciek plikow tymczasowych.
  - Wymaganie: po E2E sprawdzaj, czy nie zostaly pliki poza `SEAL_E2E_ROOT` (w szczegolnosci w `/tmp`); fail jeśli tak.

- [PIT-0374] Blad: zachowanie zalezne od ENV bylo niejawne i rozne miedzy maszynami.
  - Wymaganie: ENV ma jawne defaulty, a „effective config” jest logowane.

- [PIT-0375] Blad: format binarny nie mial wersji, a nieznana wersja powodowala niejasne bledy.
  - Wymaganie: formaty binarne maja wersjonowanie i twardy fail na nieznana wersje.
  - Wymaganie: testy nie zalezne od internetu; zewnetrzne call'e stubuj lokalnie.
  - Wymaganie: jesli srodowisko blokuje `listen` (EPERM), testy powinny sie jawnie oznaczyc jako SKIP **z instrukcja** (np. „uruchom z eskalacja/zezwoleniem”).

### Anti-debug E2E (środowisko testowe)

- [PIT-0376] Blad: testy anti-debug byly uruchamiane w kontenerze z restrykcyjnym seccomp/AppArmor/Yama, co blokowalo attach i dawalo falszywe “OK”.
  - Wymaganie: uruchom przynajmniej jeden baseline test na procesie **niechronionym** (attach ma sie udac), albo uruchom pelny zestaw w srodowisku permissive (`seccomp=unconfined` / bez AppArmor). Loguj aktywne polityki.

- [PIT-0377] Blad: brak flag `SEAL_E2E_STRICT_*` powodowal, ze udany attach byl raportowany jako SKIP zamiast FAIL.
  - Wymaganie: dla certyfikacji bezpieczenstwa wlacz `SEAL_E2E_STRICT_PTRACE=1` oraz odpowiadajace flagi (perf/rr/bpftrace/...), aby sukces attach byl traktowany jako regresja.

- [PIT-0378] Blad: domyślny profil seccomp Dockera blokował `perf_event_open`/`ptrace`, przez co testy dawały fałszywe SKIP/OK.
  - Wymaganie: dla pełnych testów uruchamiaj kontener z `--security-opt seccomp=unconfined` i/lub `--privileged`.

- [PIT-0379] Blad: brak `debugfs`/`tracefs`/`bpffs` powodowal SKIP dla bpftrace/perf/trace-cmd/lttng.
  - Wymaganie: przy testach strict montuj `/sys/kernel/debug`, `/sys/kernel/tracing`, `/sys/fs/bpf` z hosta (w kontenerze tylko `--privileged`) i weryfikuj mounty przed startem.

- [PIT-0380] Blad: rootless Docker/WSL ograniczal ptrace/perf/cgroup i uniemożliwiał pełne testy anti-debug.
  - Wymaganie: pelne anti-debug E2E uruchamiaj na bare‑metal/VM z uprzywilejowanym kontenerem; w rootless/WSL ustaw jawny SKIP.

- [PIT-0381] Blad: `perf`/`trace-cmd`/`rr` nie dzialaly, bo narzedzia nie pasowaly do kernela hosta.
  - Wymaganie: instaluj `linux-tools-$(uname -r)` na hoście testowym (a nie tylko w kontenerze) i loguj `uname -r` + `perf --version`.

- [PIT-0382] Blad: `systemtap`/`lttng`/`sysdig` zwracaly “not supported / no debuginfo” (brak modulow/headers).
  - Wymaganie: na hoście testowym musza byc kernel headers + debug packages + możliwość ładowania modułów; w kontenerach bez tego traktuj jako SKIP z jasnym powodem.

- [PIT-0383] Blad: SELinux/lockdown blokowaly `ptrace`/`perf` mimo poprawnej konfiguracji narzędzi.
  - Wymaganie: loguj stan SELinux (`getenforce`) i tryb lockdown; w srodowiskach certyfikacyjnych ustaw permissive lub jawnie akceptuj SKIP.

- [PIT-0384] Blad: `mlock`/memlock nie dzialal przez niski limit `ulimit -l`, co psulo testy ochron pamięci.
  - Wymaganie: na maszynie testowej ustaw odpowiednio wysoki limit `memlock` (ulimit lub systemd unit).

- [PIT-0385] Blad: `auditctl`/`auditd` nie byly dostępne lub brakowalo CAP_AUDIT_CONTROL, przez co testy mogly byc puste.
  - Wymaganie: na maszynie testowej zainstaluj i uruchom `auditd` oraz loguj, czy `auditctl` dziala; w kontenerze bez capów oznacz SKIP.

- [PIT-0386] Blad: `sysdig` nie dzialal bez zainstalowanego drivera (kernel module / eBPF), co mylnie wygladalo jak “blocked”.
  - Wymaganie: upewnij sie, ze sysdig ma aktywny driver (np. `sysdig-probe` lub eBPF) i loguj tryb pracy; inaczej SKIP z powodem.

- [PIT-0387] Blad: `bpftrace` nie dzialal (brak BTF / eBPF) i testy zwracaly “unsupported”.
  - Wymaganie: kernel musi miec BTF (`/sys/kernel/btf/vmlinux`) i eBPF; loguj `kernel.unprivileged_bpf_disabled` i wersje kernela.

- [PIT-0388] Blad: brak wsparcia kernelowego dla memfd seals/MADV_* powodował nieoczekiwane SKIP.
  - Wymaganie: w środowisku certyfikacyjnym używaj kernela z wymaganymi funkcjami i loguj wersję (minimum 5.x).

- [PIT-0389] Blad: `rr` nie dzialal przez restrykcyjny `perf_event_paranoid` i brak uprawnień.
  - Wymaganie: na maszynie testowej ustaw `kernel.perf_event_paranoid` odpowiednio nisko lub uruchamiaj testy jako root i loguj wartość sysctl.

- [PIT-0390] Blad: zbyt permisyjny `kernel.yama.ptrace_scope=0` powodowal, ze attach mogl sie udac i test konczyl sie SKIP zamiast FAIL.
  - Wymaganie: w srodowisku certyfikacyjnym ustaw `kernel.yama.ptrace_scope>=1` i wlacz `SEAL_E2E_STRICT_PTRACE=1` (attach success = FAIL).

- [PIT-0391] Blad: `dmesg` byl zablokowany (`kernel.dmesg_restrict=1` lub brak CAP_SYSLOG) i skan logow byl zawsze SKIP.
  - Wymaganie: na maszynie testowej odblokuj `dmesg` (sysctl lub cap) albo traktuj SKIP jako brak weryfikacji.

- [PIT-0392] Blad: snapshot‑guard oparty o cgroup v2 byl zawsze SKIP, bo cgroup v2 nie byl dostepny lub niewritable w kontenerze.
  - Wymaganie: uruchamiaj testy na hoście z cgroup v2 i montuj `/sys/fs/cgroup` jako RW; loguj, czy `cgroup.freeze` jest dostępny.

- [PIT-0393] Blad: snapshot‑guard (cgroup freeze) w Dockerze failowal, bo proces konczyl sie zanim test zdazyl wejsc w faze “ready”.
  - Wymaganie: w Dockerze traktuj ten przypadek jako SKIP **tylko** w trybie nie‑strict; loguj instrukcje ustawienia `SEAL_E2E_STRICT_SNAPSHOT_GUARD=1`.

- [PIT-0394] Blad: narzedzia DynamoRIO/Pin byly zainstalowane, ale brakowalo konfiguracji klienta.
  - Wymaganie: ustaw `SEAL_E2E_DRRUN_TOOL` (dla `drrun`) oraz `SEAL_E2E_PIN_TOOL`/`SEAL_E2E_PIN_CMD` (dla Pin); bez tego testy sa SKIP.

- [PIT-0395] Blad: brak `/dev/disk/by-uuid` w kontenerze powodowal SKIP dla sentinel level=2 (RID).
  - Wymaganie: bind‑mount `/dev/disk` z hosta lub uruchamiaj test na VM/bare‑metal; loguj źródło root device (overlay vs real disk).

- [PIT-0396] Blad: kontener bez odpowiednich capabilities (np. CAP_SYS_ADMIN / CAP_SYS_PTRACE) blokowal narzedzia attach i zaciemnial wniosek.
  - Wymaganie: dla testów strict uruchamiaj z `--privileged` lub jawnie dodaj potrzebne capy; loguj effective capabilities w starcie testu.

- [PIT-0397] Blad: `journalctl`/`coredumpctl` nie dzialaly w obrazie bez systemd, przez co czesc testow anti-debug byla niema.
  - Wymaganie: uruchamiaj te testy w obrazie z systemd (lub na hoście), a brak systemd oznaczaj jako SKIP z instrukcją.

- [PIT-0398] Blad: narzedzia “manual-only” (np. Intel Pin / AVML) nie byly zainstalowane, przez co testy byly zawsze SKIP.
  - Wymaganie: instaluj je ręcznie na maszynie testowej i dodaj do `PATH`; w CI oznacz jawnie, że te subtesty są opcjonalne.

- [PIT-0399] Blad: `frida` nie byla dostępna w repozytoriach dystrybucji, przez co testy byly stale SKIP.
  - Wymaganie: instaluj `frida-tools` przez pip lub dostarcz binarke w toolchainie testowym; loguj sposób instalacji.

- [PIT-0400] Blad: brak realnego testu dumpu pamieci powodowal, ze “anti-debug” wygladal na skuteczny, mimo ze dump zawieral markery.
  - Wymaganie: uruchamiaj testy real-dump (`SEAL_E2E_REAL_DUMP=1`), z baseline na procesie niechronionym (marker musi byc widoczny) i z buildem chronionym (marker musi zniknac).

- [PIT-0401] Blad: skan dumpu omijal tokeny podpisu bundla, przez co czesciowy leak nadal przechodzil jako OK.
  - Wymaganie: skanuj dumpy pod katem markerow **i** tokenow podpisu bundla; obecność któregokolwiek = FAIL.

- [PIT-0402] Blad: brak jawnego testu “kill-mode” seccomp powodowal, ze profil mógł wyglądać na aktywny, a w rzeczywistosci tylko logowal.
  - Wymaganie: włącz probe `SEAL_SECCOMP_KILL_PROBE=1` i oczekuj SIGSYS/SIGKILL; brak kill = FAIL.

- [PIT-0403] Blad: brak baseline dla core-dump powodowal, ze blokada core byla mylona z brakiem dumpow w systemie.
  - Wymaganie: dla trybu certyfikacyjnego ustaw `SEAL_E2E_STRICT_CORE_BASELINE=1` i upewnij sie, ze baseline (anti-debug OFF) tworzy core; w przeciwnym razie traktuj jako SKIP.

- [PIT-0404] Blad: brak testu “maps denylist” dla wstrzyknietej biblioteki (LD_PRELOAD) nie wykrywal regresji.
  - Wymaganie: testuj wstrzykniecie liba o nazwie z denylist (np. `frida`) i oczekuj FAIL uruchomienia.

- [PIT-0405] Blad: testy leak-check nie rozroznialy wariantu z/bez `nativeBootstrap`, co dawalo falszywe wnioski o tym, co realnie wycieka.
  - Wymaganie: uruchamiaj leak-check w dwóch wariantach (nativeBootstrap on/off) i porownuj wyniki; brak native bootstrap nie moze maskowac realnych leakow.

- [PIT-0406] Blad: nowe flagi strict nie byly dokumentowane, przez co tryb certyfikacyjny nadal “przepuszczal” SKIP.
  - Wymaganie: uzywaj `SEAL_E2E_STRICT_ATTACH_BASELINE=1`, `SEAL_E2E_STRICT_TOOL_BASELINE=1`, `SEAL_E2E_STRICT_HOST_BASELINE=1`, `SEAL_E2E_STRICT_REAL_DUMP=1` oraz `SEAL_E2E_STRICT_CORE_BASELINE=1` w srodowiskach, gdzie oczekujesz twardych FAIL.

### Wnioski ogolne (security/E2E)

- [PIT-0407] Blad: testy weryfikowaly tylko "czy mechanizm jest wlaczony", zamiast tego, czy realnie utrudnia wydobycie kodu.
  - Wymaganie: kazdy mechanizm bezpieczenstwa ma test skutecznosci (symulacja ataku + oczekiwany wynik), nie tylko sprawdzenie flag.

- [PIT-0408] Blad: brak baseline na procesie niechronionym powodowal falszywe OK (bo atak w ogole nie dzialal w srodowisku).
  - Wymaganie: kazdy test ataku ma baseline "bez ochrony", ktory **musi** przejsc, inaczej wynik jest SKIP/FAIL.

- [PIT-0409] Blad: funkcje niekompatybilne z packagerem byly ignorowane (silent no-op), co wygladalo jak dzialajaca ochrona.
  - Wymaganie: niekompatybilne kombinacje musza fail-fast z jasnym komunikatem; E2E pokrywa przypadek "supported" i "unsupported".

- [PIT-0410] Blad: SKIP bez jawnego powodu ukrywal realny brak weryfikacji.
  - Wymaganie: kazdy SKIP musi zawierac przyczyne i instrukcje odblokowania; tryb certyfikacyjny zamienia SKIP na FAIL.

- [PIT-0411] Blad: testy uruchamialy procesy z `stdio: "pipe"` bez drenażu, co moglo blokowac proces i zawieszac E2E.
  - Wymaganie: zawsze drenowac stdout/stderr (lub uzywac `inherit`/`ignore`) i obslugiwac wczesny exit procesu.

- [PIT-0412] Blad: testy z `waitForReady` nie odroznialy wczesnego exitu od prawidlowego zakonczenia po "ready", co dawalo falszywe FAIL/timeouty.
  - Wymaganie: po sygnale "ready" ignoruj wczesny exit, a przed "ready" traktuj go jako FAIL; zawsze obsluguj `child.on("error")`.

- [PIT-0413] Blad: tryb `ready-file` akceptowal niepoprawny/ucinany JSON, przez co test mogl przejsc mimo bledu w sygnale gotowosci.
  - Wymaganie: w trybie `ready-file` waliduj JSON i w razie potrzeby ponawiaj odczyt przez krotki czas (retry) zanim uznasz blad.

- [PIT-0414] Blad: testy uruchamiajace procesy przez `spawn` nie obslugiwaly `error`, przez co awaria uruchomienia mogla zawiesic test.
  - Wymaganie: zawsze obsluguj `child.on("error")` i uwzgledniaj to w `Promise.race`/`exitPromise`.

- [PIT-0415] Blad: testy z `waitForReady` nie robily `Promise.race` z wczesnym `exit`, przez co timeout maskowal rzeczywisty blad startu.
  - Wymaganie: `waitForReady` zawsze sciga sie z `exit`/`error`, a wynik "exit przed ready" jest twardym FAIL.

- [PIT-0416] Blad: testy ekstrakcji opieraly sie tylko na analizie plikow na dysku, pomijajac wycieki w pamieci runtime.
  - Wymaganie: testy obejmuja co najmniej jedna metode runtime (dump/core/ptrace) oraz skan markerow i tokenow podpisu.

- [PIT-0417] Blad: stale markery w testach prowadziły do falszywych pozytywow (cache, artefakty z poprzednich runow).
  - Wymaganie: markery sa losowe per run, a testy zawsze sprzataja artefakty i cache.

- [PIT-0418] Blad: brak pinowania wersji narzedzi bezpieczenstwa powodowal rozjazdy miedzy CI/hostem.
  - Wymaganie: wersje narzedzi testowych sa pinowane i logowane; brak zgodnosci = FAIL lub jawny SKIP.

- [PIT-0419] Blad: brak logu "effective config" powodowal, ze nie bylo wiadomo, jakie realne zabezpieczenia weszly w build.
  - Wymaganie: kazdy build/test loguje effective config (packager, profile, mechanizmy ON/OFF).

### Wnioski ogolne (funkcjonalnosc Seal / anti-debug/hack)

- [PIT-0420] Blad: obfuskacja/minify byly traktowane jako ochrona przed runtime dumpem lub debugiem.
  - Wymaganie: obfuskacja to tylko warstwa utrudniajaca; realna ochrona wymaga runtime guardow (anti-debug) i wczesnego uruchomienia guardow (najlepiej przed zaladowaniem JS).

- [PIT-0421] Blad: funkcje anti-debug byly wlaczane na packagerach, ktore ich nie wspieraja, co dawalo falszywe poczucie ochrony.
  - Wymaganie: matrix "packager -> wspierane funkcje" jest jawna, a build failuje, gdy wymagany mechanizm nie jest wspierany.

- [PIT-0422] Blad: guardy przechodzily w tryb "log-only" lub byly cicho wylaczane po bledzie systemowym.
  - Wymaganie: domyslnie "fail-closed" (blad aktywacji = przerwanie uruchomienia), a tryb tolerancyjny wymaga jawnej decyzji.

- [PIT-0423] Blad: weryfikacja release konczyla sie na sprawdzeniu plikow JS na dysku, bez analizy binarek.
  - Wymaganie: po buildzie skanuj binarki (np. `strings`/`rg`) pod katem markerow/fragmentow JS; znalezienie = FAIL.

- [PIT-0424] Blad: "anti-debug" byl wykonywany tylko na starcie, co pozwalalo na pozniejsze attach/dump.
  - Wymaganie: guardy krytyczne powinny miec re-check (interval lub event-based), a testy musza to pokrywac.

- [PIT-0425] Blad: brak rozdzielenia "ochrona build-time" vs "ochrona runtime" mieszal odpowiedzialnosc i mylil uzytkownikow.
  - Wymaganie: CLI/dokumentacja jasno grupuja zabezpieczenia (build vs runtime) i loguja, co realnie weszlo do artefaktu i co aktywne w runtime.

- [PIT-0426] Blad: testy anti-debug sprawdzaly pojedynczy wektor (np. ptrace), a inne pozostawaly niezweryfikowane.
  - Wymaganie: E2E ma macierz wektorow (ptrace/process_vm_readv/proc-mem/LD_PRELOAD/dump) i przynajmniej jeden test z kazdej kategorii.

- [PIT-0427] Blad: brak jawnego threat modelu (root vs user) powodowal nierealne oczekiwania co do "pelnej" ochrony.
  - Wymaganie: dokumentacja/CLI jasno komunikuje ograniczenia (root moze odzyskac kod), a cel to maksymalne utrudnienie i czas.

- [PIT-0428] Blad: zabezpieczenia byly konfigurowane w kilku miejscach (build/target/ENV), a uzytkownik nie widzial stanu koncowego.
  - Wymaganie: `seal check`/`seal config explain` wypisuje "effective config" oraz powody wylaczen/override.

- [PIT-0429] Blad: wymagania kernelowe/uprawnienia dla anti-debug byly wykrywane dopiero w runtime.
  - Wymaganie: preflight sprawdza wymagane funkcje/capy przed build/deploy; brak = fail-fast z instrukcja.

- [PIT-0430] Blad: brak bezpiecznego trybu serwisowego/debug wymuszal wylaczanie calych profili zabezpieczen.
  - Wymaganie: dedykowany override dla operatora (jawny, logowany, opcjonalnie z TTL) pozwala czasowo wylaczyc wybrane guardy bez zmiany profilu.

- [PIT-0431] Blad: brak budzetu wydajnosciowego dla guardow powodowal, ze zabezpieczenia byly odbierane jako "bugi" (wolny start/latencja).
  - Wymaganie: mierz i loguj overhead (czas startu, pamiec), definiuj limity i tuningi (np. interwal re-check).

- [PIT-0432] Blad: komunikaty z guardow zdradzaly obecnosci Seal lub szczegoly implementacji.
  - Wymaganie: komunikaty runtime sa neutralne, a szczegoly trafiaja tylko do logow instalatora/CLI.

- [PIT-0433] Blad: mechanizmy ochrony zakladaly, ze inne guardy zawsze dzialaja, co przy czesciowym wylaczeniu tworzylo luki.
  - Wymaganie: kazdy guard jest niezalezny; brak jednego guardu nie moze wylaczyc pozostalych, a degradacja musi byc jawnie zalogowana.

- [PIT-0434] Blad: brak widocznego zrodla konfiguracji (plik/ENV/CLI) utrudnial audyt i debug.
  - Wymaganie: `seal check` i logi builda pokazuja effective config razem ze zrodlem kazdej wartosci (file/env/cli/default).

- [PIT-0435] Blad: brak self-testu guardow w runtime pozwalal na "ciche" niepowodzenie zabezpieczenia.
  - Wymaganie: krytyczne guardy maja probe/self-test (np. proba ptrace/denylist/dump) i twardy FAIL przy braku efektu.

- [PIT-0436] Blad: brak jawnej sciezki kompatybilnosci wymuszal wylaczanie calych profili dla narzedzi operacyjnych (APM/profilery/crash).
  - Wymaganie: istnieje jawny allowlist/compat mode (auditowany i logowany), a domyslne profile pozostaja bezpieczne.

- [PIT-0437] Blad: rozne kody wyjscia lub czasy startu zalezne od ataku tworzyly side-channel (da sie wykryc aktywny guard).
  - Wymaganie: reakcje guardow sa deterministyczne (stale kody/komunikaty), a timingi maja ograniczony jitter.

- [PIT-0438] Blad: rozproszone logi ujawnialy szczegoly ochron w publicznych logach aplikacji.
  - Wymaganie: logi "user-facing" nie ujawniaja informacji o guardach; szczegoly trafiaja do logow instalatora/CLI.

- [PIT-0439] Blad: mechanizmy opieraly sie tylko na blackliscie nazw procesow/narzedzi, co bylo latwe do obejscia.
  - Wymaganie: detekcja powinna byc behavior-based (syscall/ptrace/dump), a nazwy traktuj jako sygnal pomocniczy.

- [PIT-0440] Blad: guardy chronily tylko proces glowny, a worker/child byl uruchamiany bez ochrony.
  - Wymaganie: procesy potomne dziedzicza guardy albo sa uruchamiane przez wrapper; E2E weryfikuje ten scenariusz.

- [PIT-0441] Blad: release/installDir byl writable dla nieuprzywilejowanych, co umozliwialo podmiane runtime/payload lub plikow JS.
  - Wymaganie: katalog release jest read-only dla runtime usera, a zmiany wymagaja jawnego deployu i integrity check.

- [PIT-0442] Blad: dynamiczne ladowanie kodu (eval/Function/dynamic import z writable path) omijalo obfuskacje i integrity.
  - Wymaganie: w profilach secure blokuj eval/Function oraz ogranicz dynamic import do allowlisty katalogow read-only.

- [PIT-0443] Blad: override ochron (np. w serwisie) byl mozliwy bez audytu i bez ograniczen czasowych.
  - Wymaganie: override musi byc jawny, logowany i time-bound (TTL), a w produkcji wymaga dodatkowego potwierdzenia.

- [PIT-0444] Blad: re-check guardow byl oparty o timer w watku event loop i mogl byc blokowany przez dlugie operacje.
  - Wymaganie: guardy krytyczne korzystaja z niezaleznego zegara/monitoru i wykrywaja nadmierne opoznienia.

- [PIT-0445] Blad: packager fallback (np. thin-split -> bundle) zmienial model bezpieczenstwa bez jasnego komunikatu.
  - Wymaganie: fallback jest jawny i zawsze loguje zmiane poziomu ochrony; tryb secure failuje zamiast fallbacku.

### Sentinel E2E (środowisko testowe)

- [PIT-0446] Blad: brak `/etc/machine-id` w kontenerze powodowal SKIP lub flakey wyniki sentinela.
  - Wymaganie: generuj `/etc/machine-id` na starcie testów (np. `systemd-machine-id-setup`) albo bind‑mount z hosta.

- [PIT-0447] Blad: klonowane VM-y miały identyczny `machine-id`, więc sentinel nie rozróżniał hostów.
  - Wymaganie: po klonowaniu obrazu regeneruj `machine-id` (np. `systemd-machine-id-setup`) i traktuj to jako wymóg dla produkcji.

- [PIT-0448] Blad: sentinel E2E uruchamiany jako non‑root nie mógł tworzyć root‑owned `baseDir`, przez co testy były zawsze SKIP.
  - Wymaganie: uruchamiaj sentinel E2E jako root (albo w kontenerze, który ma root) i loguj ten fakt.

### UI E2E (Playwright)

- [PIT-0449] Blad: brak zainstalowanych przegladarek Playwright (offline) powodowal fail/skip UI E2E.
  - Wymaganie: pre‑bake przegladarki w obrazie testowym albo jawnie wylacz UI E2E (`SEAL_UI_E2E=0`) w srodowiskach offline.

- [PIT-0450] Blad: Playwright mial pobrane przegladarki, ale brakowalo bibliotek systemowych (np. `libasound2`), co dawalo `error while loading shared libraries`.
  - Wymaganie: instaluj zaleznosci Playwright w obrazie testowym (np. `npx playwright install --with-deps chromium` albo preinstalowane pakiety), a marker instalacji nie moze pomijac brakujacych libs.

- [PIT-0451] Blad: UI E2E uruchomione w trybie nie‑headless bez X11/Xvfb powodowaly fail.
  - Wymaganie: w kontenerach/CI ustaw `SEAL_UI_E2E_HEADLESS=1` albo zainstaluj i uruchom `xvfb`.

- [PIT-0452] Blad: Playwright w Dockerze crashowal (małe `/dev/shm`), co dawalo losowe błędy przeglądarki.
  - Wymaganie: uruchamiaj kontener z wiekszym `/dev/shm` (np. `--shm-size=1g`) albo ustaw `--disable-dev-shm-usage` w uruchomieniu Chromium.

- [PIT-0453] Blad: selektory UI oparte o tekst/DOM byly niestabilne (zmiany copy/i18n), co dawalo flakey testy.
  - Wymaganie: uzywaj stabilnych selektorow (`data-testid`/role+name) i utrzymuj je jako kontrakt testowy.

- [PIT-0454] Blad: przy failu UI E2E brakowalo artefaktow diagnostycznych.
  - Wymaganie: na porazke zapisuj screenshot/trace/video i loguj sciezki (z limitem rozmiaru).

- [PIT-0455] Blad: brak ustalonego viewportu/locale/animacji powodowal roznice w layout (responsive) i flakey asercje.
  - Wymaganie: ustaw jawny viewport, deviceScaleFactor i locale/timezone w UI E2E; wylacz animacje (np. `prefers-reduced-motion`/global CSS).

- [PIT-0456] Blad: Playwright pobieral przegladarki przy kazdym uruchomieniu (brak cache), co wydluzalo E2E i zwiekszalo flakey.
  - Wymaganie: ustaw `PLAYWRIGHT_BROWSERS_PATH` na trwały cache (poza repo) i loguj jego lokalizacje.
  - Wymaganie: cache przegladarek jest kluczowany po wersji Playwright; mismatch = reinstall.
- [PIT-0457] Blad: marker instalacji i cache Playwrighta byly w roznych rootach (np. marker w `CACHE_ROOT`, a cache w `/root/.cache`), co dawalo falszywe "installed" albo wymuszalo reinstall przy zmianie usera.
  - Wymaganie: marker instalacji i cache przegladarek musza uzywac tego samego rootu (`PLAYWRIGHT_BROWSERS_PATH` lub `${XDG_CACHE_HOME:-$HOME/.cache}`); unikaj twardego `/root` poza Dockerem; loguj oba pathy.

- [PIT-0458] Blad: marker instalacji Playwright istnial, ale binarki przegladarek zostaly usuniete, co powodowalo fail mimo „cache ok”.
  - Wymaganie: przed pominieciem instalacji sprawdzaj realna obecność binarek w `PLAYWRIGHT_BROWSERS_PATH`; brak = reinstall i jawny log.

- [PIT-0459] Blad: UI E2E nie failowal na `console.error`/unhandled rejection, co maskowalo regresje w runtime.
  - Wymaganie: testy UI zbieraja `console` i `pageerror`, a bledy failuja test (z whitelist dla znanych, niekrytycznych warningow).

## Deploy / infrastruktura

- [PIT-0460] Blad: instalacja w `/opt` (mala partycja) powodowala brak miejsca.
  - Wymaganie: domyslny `installDir` dla uslug to `/home/admin/apps/<app>`.

- [PIT-0461] Blad: `installDir` lub katalog release byl na mount z `noexec`, przez co launcher nie startowal (`Permission denied`/`Exec format error`).
  - Wymaganie: preflight/deploy sprawdza mount options `installDir` (wymaga `exec`); w razie `noexec` fail‑fast z instrukcja wyboru innej sciezki.

- [PIT-0462] Blad: `seal uninstall` mogl usunac zbyt wysoki katalog (np. przez bledny `installDir`).
  - Wymaganie: Seal odmawia `rm -rf` jesli `installDir` jest zbyt plytki lub jest katalogiem systemowym.
  - Wymaganie: awaryjnie mozna ustawic `SEAL_ALLOW_UNSAFE_RM=1`, ale jest to **niebezpieczne**.

- [PIT-0463] Blad: lokalne komendy `systemctl` dla `serviceScope=system` uzywaly `sudo` nawet przy UID 0, co na minimalnych hostach bez `sudo` konczylo sie bledem.
  - Wymaganie: gdy proces dziala jako root, uruchamiaj `systemctl` bez `sudo`.

- [PIT-0464] Blad: `stop/disable/uninstall` failowaly, gdy unit nie istnial (np. po recznym usunieciu), mimo ze stan koncowy byl OK.
  - Wymaganie: operacje stop/disable sa idempotentne: brak unitu = noop + log, nie twardy FAIL.

- [PIT-0465] Blad: `installDir` w targetach lokalnych nie byl walidowany (relatywne sciezki/spacje/znaki shellowe), a trafial do `run-current.sh` i unitu systemd, co dawalo bledy lub nieprzewidziane ekspansje.
  - Wymaganie: `installDir` musi byc absolutny i bez whitespace/metaznakow; walidacja dotyczy **takze** targetow lokalnych.

- [PIT-0466] Blad: `run-current.sh` i katalog aplikacji mialy zlego wlasciciela (root) i brak prawa wykonania.
  - Wymaganie: `installDir` i `run-current.sh` musza byc wlascicielem uzytkownika uslugi i `run-current.sh` musi byc wykonywalny.

- [PIT-0467] Blad: wrapper skrypt (np. `run-current.sh`) uruchamial proces bez `exec`, przez co systemd wysylal sygnal do shella, a proces docelowy zostawal sierota.
  - Wymaganie: ostatnia linia uruchamiajaca aplikacje w wrapperze uzywa `exec`, aby poprawnie propagowac sygnaly i exit code.

- [PIT-0468] Blad: `serviceUser`/`serviceGroup` nie istnialy na hoście, a systemd failowal z mylacym komunikatem.
  - Wymaganie: preflight sprawdza istnienie user/group (`getent passwd/group`) i fail‑fast z instrukcja utworzenia.

- [PIT-0469] Blad: podwojne uploadowanie artefaktu przy pierwszym deployu (brak configu na serwerze).
  - Wymaganie: sprawdzaj `shared/config.json5` przed uploadem; artefakt wysylany **tylko raz**.

- [PIT-0470] Blad: tymczasowy config byl zapisywany pod przewidywalna sciezka `/tmp/<service>-config.json5`, co powodowalo kolizje rownoleglych deployow i ryzyko symlink‑attack.
  - Wymaganie: uzywaj `mktemp`/losowej nazwy (0600) i waliduj typ/owner; sprzataj w `finally`.
- [PIT-0471] Blad: tymczasowy artefakt na hoście zdalnym uzywal nazwy z `basename` (spacje/metachar), co psulo `scp` i kolidowalo przy rownoleglych deployach.
  - Wymaganie: generuj zdalny tmp z losowym sufiksem (mktemp) i sanitizuj nazwy do bezpiecznego alfabetu; scp nie moze dostac sciezki ze spacjami bez escapingu.
- [PIT-0472] Blad: payload/artefakt upload na SSH uzywal przewidywalnych nazw w `/tmp` (np. `${appName}-payload-${Date.now()}`), co powodowalo kolizje rownoleglych deployow i otwieralo wektor symlink‑attack.
  - Wymaganie: zdalne tempy tworzy `mktemp` na hoście (po SSH), a `scp` uzywa wygenerowanej sciezki; brak losowosci = FAIL.
- [PIT-0473] Blad: po `scp`/`cp` konfiguracji na hosta perms pozostawaly domyslne (np. 0644), co moglo ujawniac sekrety.
  - Wymaganie: dla configow z sekretami wymusz `umask 077` lub `chmod 0600/0640` po kopii.
- [PIT-0474] Blad: tymczasowy plik konfigu z `scp` (np. do diffu) zostawal na dysku lokalnym, co kumulowalo smieci i moglo ujawniac dane.
  - Wymaganie: uzywaj `mktemp` + perms 0600 i sprzataj w `finally` po diff/porownaniu.
- [PIT-0475] Blad: aktualizacja `config.json5` odbywala sie przez zwykle `cp`/`copyFile` (bez atomowosci), co moglo zostawic polowiczny plik po crashu.
  - Wymaganie: zapisuj config atomowo (tmp w tym samym katalogu + `rename` + `fsync` katalogu).

- [PIT-0476] Blad: szybkie kopiowanie release (`copyDir`) pomijalo symlinki bez ostrzezenia, co powodowalo brak plikow i trudny debug.
  - Wymaganie: symlinki w release musza byc jawnie obslugiwane (copy jako link lub twardy FAIL), nie cicho pomijane.

- [PIT-0477] Blad: brak wczesnej walidacji wolnego miejsca na serwerze powodowal `tar: Cannot mkdir: No space left on device`.
  - Wymaganie: preflight sprawdza wolne miejsce w `installDir` oraz `/tmp` i failuje z instrukcja, jesli za malo miejsca.

- [PIT-0478] Blad: testy E2E i cache (node_modules/logi/artefakty/Docker volumes) rosly bez limitu i potrafily trafic do nieznanych katalogow (np. /tmp), zapychajac dysk bez wiedzy uzytkownika.
  - Wymaganie: **NIE MOZNA DOPUSZCZAC, ABY PLIKI ROSLY W NIEZNANYM FOLDERZE I ZAPCHALY DYSK.**
  - Wymaganie: wszystkie artefakty E2E musza byc w `seal-out/e2e` (lub jawnie ustawionym `SEAL_E2E_ROOT`/`SEAL_E2E_TMP_ROOT`), a sciezki sa logowane na starcie.
  - Wymaganie: domyslny layout uzywa stalego `run/`, a `SEAL_E2E_RUN_LAYOUT=concurrent`
    tworzy `concurrent-runs/<runId>`; po runie sprzataj `tmp/` i `workers/`.
  - Wymaganie: E2E loguje zuzycie dysku przed/po runie i ma retention/limit (liczba/rozmiar/TTL) dla cache/logow/artefaktow.
  - Wymaganie: cache E2E jest w dedykowanym katalogu w `seal-out/e2e/cache` (lub `SEAL_E2E_CACHE_DIR`), latwym do wyczyszczenia; dokumentuj szybki cleanup.
  - Wymaganie: gdy zabraknie miejsca (`ENOSPC`), testy podaja konkretne kroki cleanup (cache, volumes, obrazy) zamiast ogolnego bledu.
- [PIT-0479] Blad: brak prostego, powtarzalnego sygnalu o rosnieciu `seal-out/` powodowal, ze problem wychodzil dopiero po zapełnieniu dysku.
  - Wymaganie: po E2E loguj rozmiar `seal-out/e2e` i ostrzegaj, gdy `seal-out/` przekracza prog
    (konfigurowalny w E2E, domyslnie 10GB).
  - Wymaganie: ostrzezenie musi byc E2E‑specyficzne (`SEAL_E2E_*`), aby nie mieszac E2E z CLI.
- [PIT-0480] Blad: brak jawnej komendy sprzatania cache powodowal, ze uzytkownik nie wiedzial co czyscic i gdzie rosnie.
  - Wymaganie: udostepnij `seal clean` (projekt) oraz `seal clean-global-cache <scope>` (global), i dokumentuj scope/efekty.
  - Wymaganie: komendy czyszczenia loguja docelowe sciezki (bez zgadywania) i nie dotykaja katalogow spoza scope.
  - Wymaganie: nowy cache dodaje wpis do `SEAL_CACHE_GUIDE` i zakres do `seal clean-global-cache <scope>` (lub jawne "nie dotyczy").
- [PIT-0481] Blad: mieszanie flag/konfiguracji E2E z CLI (build/deploy) powodowalo zamieszanie i ryzyko niezamierzonego zachowania narzedzia.
  - Wymaganie: wszystkie flagi E2E maja prefix `SEAL_E2E_*` i sa dokumentowane tylko w E2E runbooku.
  - Wymaganie: config E2E nie moze zmieniac semantyki komend CLI (build/deploy); dotyczy tylko test runnera.
- [PIT-0482] Blad: duplikacja logiki (np. rozmiary dysku) w kilku runnerach prowadziła do dryfu i niespójnych logów.
  - Wymaganie: wspolna logika E2E jest w jednym helperze, a runnery tylko ja wywoluja.
- [PIT-0483] Blad: brak jawnej dokumentacji domyslnych wartosci E2E powodowal, ze uzytkownik nie wiedzial, co tak naprawde jest aktywne.
  - Wymaganie: wszystkie domyslne flagi E2E maja wpis w `e2e-config.env` oraz sa streszczone w runbooku.
- [PIT-0484] Blad: ostrzezenia o fallbackach (np. busy run, zewnetrzny tmp) byly niewidoczne w logach podsumowania.
  - Wymaganie: fallback zawsze loguje ostrzezenie na STDOUT i jest widoczny w summary/koncu runa.
- [PIT-0485] Blad: cleanup po bledzie/kill nie byl gwarantowany, co zostawialo tymczasowe katalogi po nieudanych runach.
  - Wymaganie: cleanup jest w `finally` i uruchamia sie takze po wyjatkach/exit(1).
  - Wymaganie: tryb debug (`KEEP_TMP`/`KEEP_RUNS`) jest jawny i logowany w naglowku.
- [PIT-0486] Blad: brak limitu/ostrzezenia na wzrost cache w CI powodowal nagle failure na kolejnych jobach.
  - Wymaganie: w CI raportuj rozmiar cache po runie i failuj/ostrzegaj po przekroczeniu progu.
- [PIT-0487] Blad: brak walidacji konfliktu runow (np. rownolegly start) prowadzil do nadpisan i losowych failow.
  - Wymaganie: zawsze uzywaj locka dla shared run i jasnego fallbacku do `concurrent-runs`.
- [PIT-0488] Blad: rozproszone flagi (legacy + nowe) tworzyly niejednoznaczny stan (np. SEAL_E2E_PARALLEL vs SEAL_E2E_RUN_MODE).
  - Wymaganie: legacy flagi sa mapowane do nowego API i logowane jako "alias".
  - Wymaganie: dokumentuj kanoniczne flagi, a legacy tylko jako kompatybilnosc.
- [PIT-0489] Blad: brak czytelnego, jednolitego opisu katalogow (run/cache/logs/tmp) powodowal zgadywanie, gdzie co lezy.
  - Wymaganie: utrzymuj jedna "mape katalogow" w dokumentacji i zawsze ja aktualizuj przy zmianach.
- [PIT-0490] Blad: brak twardych guardow na sciezki cleanupu mogl skutkowac czyszczeniem poza projektem.
  - Wymaganie: wszystkie rm -rf przechodza przez guard-helper i loguja docelowa sciezke.
- [PIT-0491] Blad: brak jednoznacznego opisu retencji/keep flags powodowal, ze uzytkownicy zostawiali dane nie wiedzac o kosztach.
  - Wymaganie: flagi `KEEP_*` musza byc jawnie oznaczone jako debug-only i logowane na starcie runa.
  - Wymaganie: kazda flaga keep ma wskazana komenda/porada cleanup.
- [PIT-0492] Blad: nie było szybkiego sposobu, by sprawdzic czy E2E zostawilo pliki poza root.
  - Wymaganie: dodaj "leak check" w E2E lub checkliste w runbooku (tmp/cache/logs poza `seal-out/e2e`).
- [PIT-0493] Blad: brak konsekwentnych nazw katalogow "run/logs/tmp" w kodzie i docs utrudnial automatyczny cleanup.
  - Wymaganie: uzywaj ustandaryzowanej struktury run root i nie wprowadzaj nowych nazw bez aktualizacji docs.
- [PIT-0494] Blad: brak jednoznacznego opisu co jest cache, a co artefaktem tymczasowym powodowal bledne czyszczenia (np. usuwanie cache build w srodku runa).
  - Wymaganie: dokumentuj rozdzial "cache vs tmp vs artefakty" i trzymaj to w kodzie/cleanup.
- [PIT-0495] Blad: brak testu regresyjnego na "disk summary" i ostrzezenia powodowal, ze logi mialy czasem inne nazwy lub znikały.
  - Wymaganie: E2E ma test/asserte na obecność podsumowania i ostrzezenia przy przekroczonym progu.
- [PIT-0496] Blad: brak jawnej informacji o tym, które komendy czyszczenia wymagają bycia w projekcie (cwd), powodował mylące "missing project" błędy.
  - Wymaganie: dokumentuj jasno, które clean scope wymagają projektu i dawaj jasny komunikat w CLI.
- [PIT-0497] Blad: brak spójnego prefixu logów dla E2E utrudniał filtrowanie i automatyczną analizę.
  - Wymaganie: wszystkie logi E2E muszą mieć spójny prefix (`[seal-e2e]` / `[seal-e2e-parallel]`).
- [PIT-0498] Blad: brak jawnego rozdziału odpowiedzialności (co jest „E2E harness”, a co „CLI”) powodował rozlane zmiany w nieodpowiednich modułach.
  - Wymaganie: zmiany E2E trzymać w `tools/seal/seal/scripts/*` + docs, CLI tylko gdy to konieczne.
- [PIT-0499] Blad: brak “default-off” dla ryzykownych operacji (np. zewnętrzny tmp) prowadził do przypadkowych wycieków danych.
  - Wymaganie: ryzykowne zachowania muszą być opt‑in i wprost oznaczone jako niezalecane.
- [PIT-0500] Blad: brak jasnego podsumowania co zostalo po runie utrudnial manualny cleanup i diagnoze.
  - Wymaganie: run zawsze podaje "co zostaje" (logs, summary, cache) oraz link/komende czyszczenia.
- [PIT-0501] Blad: brak jednolitego miejsca na logi powodowal ich rozproszenie i trudny debugging.
  - Wymaganie: logi E2E zawsze trafiaja do `seal-out/e2e/run/logs` lub `concurrent-runs/<id>/logs`, a override jest jawny i logowany.
- [PIT-0502] Blad: cache/artefakty byly tworzone bez "manifestu" (kto/po co/jak wyczyscic), przez co uzytkownik nie wiedzial skad sie biora.
  - Wymaganie: kazdy trwały katalog ma krotki manifest (owner/purpose/cleanup command) lub przynajmniej jawny log startowy ze sciezkami i instrukcja czyszczenia.
- [PIT-0503] Blad: retencja cache byla oparta o czas (TTL) zamiast o faktyczne wejscia (hash lockfile/wersje), co dawalo przypadkowe "hit/miss".
  - Wymaganie: cache kluczuj po tresci (hash lockfile/konfiguracji) i wersjach narzedzi/OS/arch; TTL tylko jako dodatkowy bezpiecznik.
- [PIT-0504] Blad: cleanup byl "best-effort" i cicho ignorowal bledy, co zostawialo smieci po runie.
  - Wymaganie: cleanup jest deterministyczny; przy niepowodzeniu loguj sciezke i przyczyne, a w CI/E2E traktuj jako FAIL.
- [PIT-0505] Blad: `rm -rf` na sciezkach z ENV bez walidacji moglo usunac niewlasciwe katalogi (root/home/empty).
  - Wymaganie: wszystkie operacje `rm -rf` przechodza przez guard-helper (blokada root/home/puste sciezki) i loguja docelowy katalog.
- [PIT-0506] Blad: mieszano scope cache (build/e2e/toolchain/global), co powodowalo regresje i "dziwne" reuse.
  - Wymaganie: cache ma rozdzielone scope i jawne komendy czyszczenia per-scope.
- [PIT-0507] Blad: brak testu "creates & cleans" pozwalal na wycieki plikow poza root.
  - Wymaganie: kazda nowa funkcja, ktora tworzy cache/tmp, ma E2E "leak test" (brak plikow poza root po runie).
- [PIT-0508] Blad: docker build cache/obrazy narastaly bez limitu i zapychaly dysk, mimo czyszczenia wolumenow.
  - Wymaganie: testy raportuja rozmiar cache/obrazow (`docker system df`) i udostepniaja jawny tryb cleanup (`docker builder prune`/`docker image prune`).
  - Wymaganie: dla E2E rekomenduj dedykowany `data-root` Dockera lub osobny disk/volume na cache obrazow.

- [PIT-0509] Blad: uruchamianie aplikacji jako root (np. przez sudo) bez potrzeby.
  - Wymaganie: domyslnie uruchamiamy jako uzytkownik uslugi; `--sudo` tylko jawnie.
  - Wymaganie: waliduj owner/perms/umask w miejscach krytycznych.

- [PIT-0510] Blad: unit systemd nie ustawial `WorkingDirectory`, przez co `config.runtime.json5` nie byl znajdowany.
  - Wymaganie: `WorkingDirectory` wskazuje katalog release (albo `run-current.sh` ustawia CWD przed startem).

- [PIT-0511] Blad: systemd unit uzywal względnych sciezek w `ExecStart`, co psulo start po zmianie CWD.
  - Wymaganie: `ExecStart` zawsze uzywa absolutnych sciezek (lub `WorkingDirectory` + `./bin` tylko jesli jawnie wspierane).

- [PIT-0512] Blad: `ExecStart` zawieral konstrukcje shellowe (`&&`, `>`, `$VAR`, `~`), a systemd nie uruchamia shella, wiec unit nie startowal.
  - Wymaganie: `ExecStart` uruchamia prosty wrapper skrypt; zlozone komendy wykonywane sa wewnatrz wrappera (lub jawnie przez `/bin/sh -c`, z logiem i sanitizacja).

- [PIT-0513] Blad: unit file mial zle owner/perms (np. world-writable lub root-owned w user scope), przez co systemd go ignorowal albo logowal ostrzezenia.
  - Wymaganie: waliduj owner/perms unitu (system scope: root:root 0644, user scope: owner=user 0644); bledne = fail‑fast z instrukcja.
- [PIT-0514] Blad: unit file byl nadpisywany "w miejscu", a systemd zaczytywal go w trakcie zapisu, co powodowalo bledne parsowanie lub cache starej konfiguracji.
  - Wymaganie: zapisuj unit atomowo (tmp + `fsync` + `rename` + `fsync` katalogu), a dopiero potem wykonuj `systemctl daemon-reload`.

- [PIT-0515] Blad: wartosci w pliku unit zawieraly `%` i byly interpretowane jako specifiers, co zmienialo sciezki lub zmienne.
  - Wymaganie: escapuj `%` jako `%%` (lub uzyj `systemd-escape`) i waliduj wartosci przed zapisem unitu.

- [PIT-0516] Blad: unit/komendy operowaly na zlej nazwie uslugi (status/stop/restart nie trafialy w odpowiedni unit).
  - Wymaganie: nazwa uslugi jest zapisywana w `<root>/service.name` i uzywana konsekwentnie przez `seal` i `appctl`.
- [PIT-0517] Blad: `appName` zawieral spacje/znaki specjalne i byl uzywany w sciezkach/nazwach plikow, co psulo deploy i `scp`.
  - Wymaganie: waliduj `appName/serviceName` do bezpiecznego alfabetu (np. `[a-zA-Z0-9._-]`) i normalizuj przed uzyciem w sciezkach/komendach.
- [PIT-0518] Blad: `serviceName` byl zbyt dlugi lub zawieral znaki nieakceptowane przez systemd, co dawalo `Invalid unit name` lub brak startu.
  - Wymaganie: waliduj `serviceName` pod katem dozwolonych znakow i limitu dlugosci; przy przekroczeniu generuj bezpieczny fallback (np. `app-<hash>`).
- [PIT-0519] Blad: generowany `appctl` wstawial `APP_NAME`/`APP_ENTRY` w podwojnych cudzyslowach bez escapingu `/`` ``, co powodowalo ekspansje zmiennych lub command substitution przy nietypowych nazwach.
  - Wymaganie: wartosci wstawiane do skryptow shellowych musza byc shell‑escapowane (np. single quotes/`printf %q`) lub walidowane do bezpiecznego alfabetu.
- [PIT-0520] Blad: `serviceName` zawieral sufiks `.service`, co dawalo `foo.service.service` w systemctl i mylace logi.
  - Wymaganie: wymagaj `serviceName` bez sufiksu `.service` (strip lub fail‑fast z jasnym komunikatem).

- [PIT-0521] Blad: `serviceScope` z nieprawidlowa wartoscia byl cicho traktowany jak `system`, co uruchamialo `sudo` i dawalo mylace bledy.
  - Wymaganie: `serviceScope` akceptuje tylko `user`/`system`; inne wartosci = fail‑fast z instrukcja.

- [PIT-0522] Blad: po zmianie pliku unit systemd brakowalo `daemon-reload`, przez co systemd uzywal starej konfiguracji.
  - Wymaganie: po zapisie/aktualizacji unitu zawsze wykonaj `systemctl daemon-reload` (lub `--user` odpowiednio do scope).
- [PIT-0523] Blad: `daemon-reload` bylo wywolywane bez sprawdzenia exit code, a bootstrap raportowal sukces mimo braku systemd lub bledu komendy.
  - Wymaganie: sprawdzaj wynik `systemctl` i fail‑fast z instrukcja (np. brak systemd, brak uprawnien).

- [PIT-0524] Blad: `systemctl` potrafil wisiec (np. brak dbus/systemd w kontenerze), blokujac deploy/testy.
  - Wymaganie: wywolania `systemctl` maja timeout i czytelny SKIP/blad, gdy systemd nie jest dostepny.
- [PIT-0525] Blad: brak `sudo` na hoście (lub `sudo` poza PATH) dawalo mylace wyniki `systemctl` i ukryte FAIL.
  - Wymaganie: preflight sprawdza obecność `sudo` gdy jest wymagane i podaje jasne instrukcje instalacji/konfiguracji.
- [PIT-0526] Blad: komendy na SSH uzywaly `sudo` nawet gdy user to `root`, co psulo deploy na minimalnych hostach bez `sudo`.
  - Wymaganie: gdy user= root, nie uzywaj `sudo` (lub preflightuj `sudo` tylko gdy faktycznie potrzebne).
- [PIT-0527] Blad: `journalctl` dla `serviceScope=system` nie dzialal bez sudo (brak uprawnien do logow), co dawalo mylace "brak logow".
  - Wymaganie: dla system scope uzywaj `sudo journalctl` lub zapewnij odpowiednie uprawnienia/grupy (np. `systemd-journal`).

- [PIT-0528] Blad: stare releasy rosly bez limitu (brak cleanup).
  - Wymaganie: retention (np. ostatnie N release) + usuwanie starych katalogow.

- [PIT-0529] Blad: `sshPort` w target config byl ignorowany (SSH/SCP/rsync uzywaly domyslnego portu).
  - Wymaganie: `sshPort` musi byc uwzgledniany we wszystkich polaczeniach (ssh/scp/rsync).
- [PIT-0530] Blad: `target.host` zawieral `user@` lub `:port` (albo surowy IPv6 bez nawiasow), co dawalo `user@user@host` lub bledy parsowania w ssh/scp.
  - Wymaganie: `host` to **tylko** hostname/IP (bez `user@` i bez `:port`); port zawsze w `sshPort`.
  - Wymaganie: IPv6 literal normalizuj do `[addr]` dla ssh/scp/rsync.
- [PIT-0531] Blad: `host` zaczynal sie od `-` lub zawieral znaki kontrolne, co bylo interpretowane jako opcje `ssh`.
  - Wymaganie: waliduj `host` against allowlista (brak `-` na poczatku, brak whitespace/CTL).
- [PIT-0532] Blad: ostrzezenia SSH (np. "Permanently added host key") trafialy do stderr i psuly parsowanie outputu (np. `systemctl is-active`).
  - Wymaganie: przy parsowaniu wynikow SSH ignoruj ostrzezenia (filtruj stderr) albo ustaw `LogLevel=ERROR`/preseed `known_hosts`.

- [PIT-0533] Blad: ssh/scp/rsync w trybie nieinteraktywnym potrafily wisiec na prompt (host key / haslo).
  - Wymaganie: ustawiaj `BatchMode=yes` i fail-fast z jasnym komunikatem, gdy wymagany jest input.
  - Wymaganie: respektuj `StrictHostKeyChecking` z configu (brak ukrytych promptow).

- [PIT-0534] Blad: polityka SSH byla twardo ustawiona (sporne zachowanie bez opcji).
  - Wymaganie: parametry sporne/ryzykowne (np. `StrictHostKeyChecking`) musza byc konfigurowalne per‑target.

- [PIT-0535] Blad: rsync bez trailing slash kopiowal katalog zamiast jego zawartosci, co psulo layout release.
  - Wymaganie: zdefiniuj semantyke syncu i zawsze wymuszaj trailing slash dla katalogow zrodlowych (plus test e2e).

- [PIT-0536] Blad: `rsync --delete` potrafil usunac niezamierzone pliki przy zlej sciezce docelowej.
  - Wymaganie: przed `rsync --delete` waliduj, ze dst jest w dozwolonym root (np. `installDir`) i nie jest pusty.
  - Wymaganie: dla ryzykownych syncow wymagaj jawnego `--force-delete` lub warning + prompt w wizardzie.

- [PIT-0537] Blad: rozpakowanie archiwum bez walidacji sciezek pozwalalo na path traversal lub nadpisywanie symlinkow.
  - Wymaganie: waliduj archiwa (brak `..`, brak absolutnych, brak linkow) i fail‑fast przy naruszeniach.
- [PIT-0538] Blad: archiwum zawieralo nazwy plikow z znakami kontrolnymi / nowymi liniami, co psulo parsowanie i logi.
  - Wymaganie: odrzucaj wpisy z `\\n/\\r/\\t` lub innymi znakami kontrolnymi w nazwach.
- [PIT-0539] Blad: rozpakowanie tar bez `--no-same-owner/--no-same-permissions` zachowywalo owner/perms z archiwum (ryzyko setuid lub zlych praw).
  - Wymaganie: przy ekstrakcji zawsze uzywaj `--no-same-owner --no-same-permissions` i po rozpakowaniu ustaw jawne perms.
- [PIT-0540] Blad: `tar`/`gzip` na hoście zdalnym byl brakujacy lub nie wspieral `-z`, co psulo deploy z nieczytelnym bledem.
  - Wymaganie: preflight sprawdza obecność `tar` z `-z`/`-tzf` i podaje instrukcje instalacji.

- [PIT-0541] Blad: rozpakowanie artefaktu bez stagingu zostawialo polowiczny release po bledzie.
  - Wymaganie: rozpakowuj do katalogu tymczasowego i dopiero po walidacji przenos do `releases/<buildId>`.
  - Wymaganie: `current.buildId` aktualizuj **po** udanym extract+validate.

- [PIT-0542] Blad: `tar` nadpisywal owner/permissions z archiwum (ryzyko niezamierzonych uprawnien).
  - Wymaganie: przy ekstrakcji w trybie deploy ustaw `--no-same-owner` i `--no-same-permissions`, a permissje ustaw jawnie po rozpakowaniu.

- [PIT-0543] Blad: `rm -rf`/`chmod`/`chown` na duzej liczbie plikow failowal przez `ARG_MAX`.
  - Wymaganie: przy masowych operacjach uzywaj `find ... -print0 | xargs -0` lub `find -exec ... +`.

- [PIT-0544] Blad: `strip` byl uruchamiany na pliku, ktory nie byl ELF (np. skrypt), co powodowalo bledy.
  - Wymaganie: przed uruchomieniem `strip` sprawdz typ pliku (ELF magic lub `file`) i w razie niezgodnosci SKIP z powodem.

- [PIT-0545] Blad: ELF packer/strip zwracał sukces, ale binarka byla uszkodzona i crashowala w runtime.
  - Wymaganie: po hardeningu wykonaj smoke‑test (np. uruchomienie `--help`/`--version` z timeoutem) albo minimalny self‑check, aby wykryc uszkodzone binarki przed deployem.
  - Wymaganie: waliduj rozmiar wyjsciowy (min size / brak zero‑length) i loguj rozmiar przed/po dla kazdego kroku hardeningu.
  - Wymaganie: po packerze/stripie wykonaj szybki smoke test (np. uruchomienie z `--version`/`--health` lub `file` + krótki run z timeoutem).

- [PIT-0546] Blad: w `thin-split` `strip`/ELF packer byl uruchamiany na wrapperze (`<app>`), a nie na faktycznym launcherze (`b/a`), przez co ochrona nie dzialala lub dawla falszywe wyniki.
  - Wymaganie: dla `thin-split` targetuj realny ELF launchera (`b/a`) i zapisuj w metadanych/logach, ze celem byl `launcher`.

- [PIT-0547] Blad: w AIO probowano `strip`/ELF packer na pliku z doklejonym payloadem, co psulo runtime.
  - Wymaganie: `strip`/packer dla AIO musi być ignorowany (auto-disabled) z jasnym ostrzeżeniem; dokumentacja ma wyraźnie wskazywać `thin-split` jako tryb produkcyjny.

- [PIT-0548] Blad: `strip` na binarce SEA powodowal crash (SIGSEGV) mimo udanego builda.
  - Wymaganie: dla `sea`/`thin-single` `strip` jest ignorowany (auto-disabled) z jasnym ostrzeżeniem.

- [PIT-0549] Blad: rozne implementacje `strip` (GNU vs llvm) dawaly rozne sekcje (np. `.comment`) i flaky asercje/testy.
  - Wymaganie: tooling/testy wykrywaja wariant `strip` (`strip --version`) i dostosowuja oczekiwania albo wymuszaja konkretny `strip` w E2E.
  - Wymaganie: jesli wymagane jest usuniecie `.comment`, weryfikuj flagi/wersje i loguj "effective config".

- [PIT-0550] Blad: detekcja narzedzi (`postject`, packery) nie uwzgledniala monorepo/workspace i szukala tylko w `./node_modules/.bin`, przez co testy/CLI nie widzialy narzedzia mimo instalacji.
  - Wymaganie: przy wykrywaniu CLI sprawdzaj kilka poziomow `node_modules/.bin` lub uzywaj mechanizmu typu `npm bin -w`/`npm exec`.

- [PIT-0551] Blad: zbyt szeroka `mapsDenylist` (np. `libc`) powodowala falszywe alarmy i blokowala poprawne uruchomienia.
  - Wymaganie: listy deny powinny byc precyzyjne (np. `frida`, `gdb`, `ltrace`), a testy musza pokrywac scenariusz false‑positive.

- [PIT-0552] Blad: sprawdzanie `TracerPid` tylko przy starcie nie wykrywalo późniejszego attach/debug.
  - Wymaganie: jeśli `TracerPid` jest używany jako anti‑debug, check musi być okresowy lub wykonywany w punktach krytycznych.

- [PIT-0553] Blad: okresowy check `TracerPid` byl zrobiony na `setInterval`, ale timer nie byl `unref()`, co blokowalo procesy ktore mialy sie naturalnie zakonczyc.
  - Wymaganie: wszystkie background timery w launcherze/bootstrapie musza byc `unref()` (o ile platforma to wspiera).

- [PIT-0554] Blad: check `TracerPid` nie obejmowal watkow (`/proc/self/task/*`), wiec attach do pojedynczego TID mogl zostac przeoczony.
  - Wymaganie: gdy wlaczone `tracerPidThreads`, sprawdzaj `TracerPid` dla wszystkich taskow.

- [PIT-0555] Blad: self‑hash launchera padal przez kolizje markera (np. string `THIN_SELF_HASH:` pojawial sie w innym miejscu binarki), co dawalo falszywe `runtime invalid`.
  - Wymaganie: identyfikuj marker po **pelnym wzorcu** (marker + hex) lub waliduj hex i ignoruj nie‑hex; obsluz wiele wystapien i wymagaj spojnosc hasha.

- [PIT-0556] Blad: self‑hash byl wstawiany przed hardeningiem/packerem i uniewaznial sie po pozniejszych modyfikacjach binarki.
  - Wymaganie: obliczaj i wstawiaj hash **po** wszystkich operacjach post‑pack (ostatni krok).

- [PIT-0557] Blad: kompilator optymalizowal nieuzywany string markera, przez co patcher nie znajdowal placeholdera.
  - Wymaganie: utrzymuj marker w binarce (np. `volatile` lub jawna referencja), zeby patchowanie bylo deterministyczne.

- [PIT-0558] Blad: pliki binarne byly czytane/zapisywane z `utf8`, co uszkadzalo dane (codec/payload).
  - Wymaganie: binarki czytaj/zapisuj jako `Buffer` (bez encoding), a tekst jawnie jako `utf8`.

- [PIT-0559] Blad: diff configu porownywal formatowanie (kolejnosc kluczy/whitespace), dajac falszywe roznice.
  - Wymaganie: diff opiera sie na kanonicznej reprezentacji (parse+stable sort+stringify).

- [PIT-0560] Blad: transfer artefaktu byl uznawany za poprawny bez walidacji (rozmiar/sha), co maskowalo uszkodzenia.
  - Wymaganie: po transferze weryfikuj checksum (np. sha256) lub przynajmniej rozmiar.

- [PIT-0561] Blad: odczyt duzych plikow w calosci powodowal skoki pamieci.
  - Wymaganie: dla potencjalnie duzych plikow uzywaj streamow i limitow rozmiaru.

- [PIT-0562] Blad: retry sieciowe byly natychmiastowe i bez jittera, powodujac thundering herd i dalsze awarie.
  - Wymaganie: retry ma exponential backoff + jitter, z limitem prob i max delay.

- [PIT-0563] Blad: rozpakowanie archiwum nie mialo limitow rozmiaru/ilosci plikow (zip‑bomb).
  - Wymaganie: limituj maksymalny rozmiar i liczbe plikow przy ekstrakcji.

- [PIT-0564] Blad: niepoprawnie sformatowany `host/user` w targetach powodowal bledy lub ryzyko wstrzykniec.
  - Wymaganie: waliduj `host`/`user` (brak spacji i znakow kontrolnych; whitelist dla dozwolonych znakow).

- [PIT-0565] Blad: brak timeoutow na operacjach zewnetrznych (ssh/scp/rsync/http) blokowal deploy.
  - Wymaganie: kazda operacja zewnetrzna ma timeout + jasny komunikat "co dalej".

- [PIT-0566] Blad: `status` lapal przypadkowe procesy (np. edytor `nano appctl`) i mylil z running service.
  - Wymaganie: detekcja procesu musi byc precyzyjna (systemd lub filtr na faktyczna binarke/PID).

- [PIT-0567] Blad: `seal run` zostawial proces po zamknieciu konsoli.
  - Wymaganie: foreground run musi zbijac proces przy rozlaczeniu lub miec `--kill`.
  - Wymaganie: `--kill` dziala bez sudo (ten sam user), bez ubijania cudzych procesow.

- [PIT-0568] Blad: `seal run` uruchamial bezposrednio `appctl` z release, ignorujac `run-current.sh`.
  - Wymaganie: `seal run` uruchamia `run-current.sh` (jezeli istnieje), zeby zachowac zgodnosc z usluga i BOOTSTRAP.

- [PIT-0569] Blad: `seal run` nie sprawdzal czy port jest wolny, a `EADDRINUSE` byl niejasny dla operatora.
  - Wymaganie: przed uruchomieniem sprawdz czy port jest zajety i wypisz PID/komende procesu lub jasne “co dalej”.

- [PIT-0570] Blad: rollback wybieral release innej aplikacji.
  - Wymaganie: rollback filtruje releasy po `appName`.

- [PIT-0571] Blad: `status` nie wykrywal procesu uruchomionego przez BOOTSTRAP (`$ROOT/b/a`) przy braku unitu.
  - Wymaganie: fallback `status` uwzglednia `$ROOT/b/a` w detekcji procesu.

- [PIT-0572] Blad: detekcja procesu (pgrep) lapala wlasne narzedzia (`pgrep`, edytory, shell), dajac falszywy wynik „process running”.
  - Wymaganie: filtruj wyniki po PID (pomijaj PID testu/pgrep) i uzywaj dopasowania sciezki binarki, nie tylko nazwy procesu.

- [PIT-0573] Blad: detekcja procesu opierala sie na `ps` z ucinanym `cmd`, co dawalo falszywe dopasowania.
  - Wymaganie: do identyfikacji procesu uzywaj `/proc/<pid>/cmdline` lub `ps -ww` (pełna komenda).

- [PIT-0574] Blad: `serviceScope=user` na SSH prowadzil do blednych komend `sudo systemctl`.
  - Wymaganie: SSH wspiera tylko `serviceScope=system` (inaczej blad), albo implementujemy wariant `--user`.

- [PIT-0575] Blad: sentinel instalowal sie nawet gdy brakowalo `machine-id`/`rid`, mimo ze wybrany level ich nie wymagal.
  - Wymaganie: waliduj `mid`/`rid` **warunkowo** (tylko dla leveli, ktore tego potrzebuja).
  - Wymaganie: `auto` nie moze wymuszac wyzszego levelu bez danych; fallback do nizszego levelu.

- [PIT-0576] Blad: idempotentny install sentinela probowal porownywac blob bez uprawnien (cmp jako zwykly user).
  - Wymaganie: porownania/zapisy do plikow chronionych wykonuj z tymi samymi uprawnieniami co install (sudo lub group access).
  - Wymaganie: brak uprawnien = jasny blad z instrukcja (dodaj user do group lub uzyj sudo).

- [PIT-0577] Blad: nazwa targetu byla uzywana w sciezkach bez sanitizacji (mozliwy path traversal).
  - Wymaganie: wszystkie identyfikatory uzywane jako fragment sciezki musza byc normalizowane do bezpiecznego alfabetu (`[a-zA-Z0-9_.-]`).

- [PIT-0578] Blad: `configName`/`targetName` z CLI trafialy bez walidacji do `path.join` (`seal-config/configs/<name>.json5`, `targets/<name>.json5`), co pozwalalo na path traversal (`../`) lub mylace nazwy plikow.
  - Wymaganie: waliduj nazwy config/target jako bezpieczne segmenty (brak `/`/`..`/znakow kontrolnych); po `path.join` weryfikuj `realpath` w katalogu config/targets.

- [PIT-0579] Blad: `current.buildId` byl czytany bez walidacji i uzywany jako fragment sciezki (`$ROOT/releases/$CUR` / `path.join`), wiec podmieniony plik mogl wskazac poza `releases/` (absolutna sciezka lub `../`), a `rm/pkill/exec` dzialaly na niepoprawnym katalogu.
  - Wymaganie: waliduj `current.buildId` przy odczycie (bez `/` i `..`, tylko bezpieczny alfabet, limit dlugosci).
  - Wymaganie: po zlozeniu sciezki wymusz, by `realpath` byl w `releasesDir`; niezgodnosc = fail‑fast z komunikatem.

- [PIT-0580] Blad: `buildId` przekazywany z CLI (np. `--buildId` przy payload-only) byl uzywany w nazwach plikow i sciezkach bez walidacji, co prowadzilo do zlych sciezek (spacje, `/`, `..`) i problemow ze scp/rsync.
  - Wymaganie: waliduj `buildId` do bezpiecznego alfabetu (`[a-zA-Z0-9._-]`), limit dlugosci, brak `/`/`..`/znakow kontrolnych; w razie potrzeby normalizuj.

- [PIT-0581] Blad: pliki wskaznikowe (`current.buildId`, `service.name`, `service.scope`) byly czytane bez sprawdzenia typu/rozmiaru; symlink do urzadzenia lub bardzo duzy plik mogl spowodowac hang/DoS.
  - Wymaganie: `lstat` + tylko regular file + limit rozmiaru (np. 4KB) + `O_NOFOLLOW` gdzie mozliwe.

- [PIT-0582] Blad: tryb security/stealth w launcherze nadal wypisywal szczegolowe bledy (rozroznialne failure paths).
  - Wymaganie: przy aktywnych zabezpieczeniach komunikaty i exit code musza byc zunifikowane (opaque failure).

- [PIT-0583] Blad: sentinel/anti‑debug zmienialy tresc lub timing `/health`/`/status`, co ujawnialo obecność ochron.
  - Wymaganie: `/health` i `/status` sa stabilne niezaleznie od obecnosci sentinel/guardow; szczegoly trafiaja tylko do logow instalatora/CLI.

- [PIT-0584] Blad: `cpuIdSource` wymagal recznego `off` na architekturach bez CPUID (np. ARM).
  - Wymaganie: na architekturach bez CPUID launcher uzywa pustego/neutralnego ID i **nie** wymaga zmiany konfiguracji.

- [PIT-0585] Blad: limit czasu sentinela liczony lokalnie, a nie wg czasu docelowego hosta.
  - Wymaganie: czas `validFor*` liczony w **momencie instalacji** na hoście docelowym (epoch‑sec z hosta).
  - Wymaganie: weryfikacja expiry w `sentinel verify` uzywa czasu hosta (nie lokalnego).

- [PIT-0586] Blad: sentinel weryfikowany tylko przed startem, brak okresowej kontroli.
  - Wymaganie: kontrole okresowe maja minimalny interwal + jitter, a kosztowne checki sa cache’owane (np. min. co N sekund), aby uniknac spike I/O/CPU na flocie.
  - Wymaganie: przy `checkIntervalMs>0` okresowo weryfikuj blob i expiry (setInterval + unref).
  - Wymaganie: test E2E musi sprawdzac “start OK → po czasie exitCodeBlock”.

- [PIT-0587] Blad: sentinel z opoznionym wygasnieciem przechodzil build/testy, ale aplikacja padala po czasie w produkcji.
  - Wymaganie: przed release/deploy uruchamiaj `sentinel verify` tym samym kodem co runtime (na docelowym hoście lub w identycznym runnerze).
  - Wymaganie: testy używaja krótkiego `validFor*`/`checkIntervalMs` lub test hooka czasu (bez dlugich sleepów).
  - Wymaganie: pominiecie weryfikacji jest tylko jawnie (flaga/ENV) i loguje ostrzezenie.

- [PIT-0588] Blad: zmiana formatu bloba (v1/v2) psula runtime (niezgodne rozmiary / CRC).
  - Wymaganie: runtime akceptuje **oba** rozmiary i waliduje spojnosc (version ↔ length).
  - Wymaganie: nowe pole (np. `expires_at`) musi byc ignorowane przez v1 i jawnie sprawdzane w v2.

- [PIT-0589] Blad: zegar hosta byl rozjechany (brak NTP), przez co sentinel z limitem czasu wygasal natychmiast albo za późno.
  - Wymaganie: na hostach produkcyjnych i testowych wymagaj synchronizacji czasu (NTP) i loguj odchyłkę, jeśli dostępna.

- [PIT-0590] Blad: w template stringach z bash/script wystapily nie‑escapowane sekwencje `${...}`, co psulo skladnie JS.
  - Wymaganie: w osadzonych skryptach shellowych zawsze escapuj `${` jako `\\${` (lub użyj helpera do here‑doc), zeby uniknac interpolacji JS.
  - Wymaganie: dotyczy to zwlaszcza bash‑owego `${VAR:-default}` — w JS musi byc `\\${VAR:-default}` albo `String.raw`.

- [PIT-0591] Blad: `${VAR:-default}` pojawilo sie w template stringu jako literal i JS nie parsowal pliku (SyntaxError przy `require`).
  - Wymaganie: trzymaj takie fragmenty w osobnych stalych (np. `const TMPDIR_EXPR = "${TMPDIR:-/tmp}"`) i wstrzykuj je jako zwykly tekst do skryptu, albo uzyj `String.raw` + walidacji.
  - Wymaganie: dodaj szybki smoke‑test parsowania (np. `node -e "require('...')"`) dla plikow generatorow po zmianach.

- [PIT-0592] Blad: generator JS wklejal template literal (backtick + `${...}`) do stringa JS, co psulo skladnie builda.
  - Wymaganie: w kodzie generowanym przez template string unikaj backticków albo escapuj `${` i same backticki.

- [PIT-0593] Blad: uruchomienie testow/skryptow przez `sudo` uzywalo innej wersji Node (np. v18) i innego `PATH`/`HOME`, co powodowalo brak modulow i tworzylo pliki root‑owned.
  - Wymaganie: przed uruchomieniem przez `sudo` waliduj wersje Node i `PATH` (fail‑fast przy niezgodnosci).
  - Wymaganie: uruchamiaj `sudo` z jawnie ustawionym `PATH`/`HOME`/`XDG_CACHE_HOME`/`SEAL_CACHE` (tak, by cache trafial do projektu, nie do `/root`).
  - Wymaganie: loguj effective `node -v` i `which node` w trybie E2E.

- [PIT-0594] Blad: skrypt uruchamiany w kontenerze/CI skonczyl sie `Permission denied` (brak bitu wykonywalnego albo CRLF w shebangu).
  - Wymaganie: skrypty wykonywalne w repo musza miec ustawiony bit `+x` i byc weryfikowane w CI (test `-x`).
  - Wymaganie: w Dockerfile/entrypoint ustaw `chmod +x` dla skryptow uruchamianych; alternatywnie uruchamiaj jawnie `bash <script>`.
  - Wymaganie: normalizuj newline do LF w skryptach (CRLF moze psuc shebang).

- [PIT-0595] Blad: skrypt zawieral bash‑isms (`[[`/`source`/`{1..3}`/process substitution), ale byl uruchamiany przez `/bin/sh` w kontenerze/CI i failowal.
  - Wymaganie: jesli skrypt uzywa bash‑isms, musi miec shebang `#!/usr/bin/env bash` i preflight sprawdza obecność `bash` (fail‑fast z instrukcja).
  - Wymaganie: dla `/bin/sh` stosuj wyłącznie POSIX (`[ ]`, `.` zamiast `source`, brak process substitution).

- [PIT-0596] Blad: tryb decoy nadpisywal pliki release „po cichu” lub w nieprzewidywalnym zakresie.
  - Wymaganie: domyślne zachowanie decoya musi być **jawne** (overwrite ON/OFF).
  - Wymaganie: jeśli `overwrite=false`, każda kolizja (np. `public/`, `src/`, `package.json`) kończy build błędem z listą konfliktów.
  - Wymaganie: jeśli `overwrite=true`, loguj zakres decoya (`scope=backend|full`) i źródło (`sourceDir`/generated), żeby było jasne co zostało nadpisane.

- [PIT-0597] Blad: tymczasowe pliki z danymi wrazliwymi byly tworzone w /tmp z przewidywalna nazwa i zbyt luznymi uprawnieniami.
  - Wymaganie: tworz temp‑dir przez `mkdtemp`, pliki z `0600`, a po uzyciu zawsze sprzataj.
  - Wymaganie: unikaj `Date.now()` jako jedynego komponentu nazwy pliku.

- [PIT-0598] Blad: instalacja/uninstall sentinela nie miala locka i fsync (ryzyko race/partial write).
  - Wymaganie: `flock` w `<opaque_dir>` + `umask 077` + `fsync` pliku i katalogu przed/po rename.
  - Wymaganie: tmp na serwerze ma losowy sufiks (unikaj kolizji).

- [PIT-0599] Blad: instalacja sentinela zostawiala pliki tymczasowe po bledzie (np. `$FILE.tmp` lub zdalny blob w `/tmp`).
  - Wymaganie: cleanup na `EXIT` usuwa tmp na serwerze i lokalne `.tmp` (bez wyciekow po awarii).

- [PIT-0600] Blad: brak `flock` na hoście dawal nieczytelny error (np. `flock: not found`).
  - Wymaganie: jawny check `command -v flock` z czytelnym komunikatem i kodem bledu.

## CLI / UX spojnosci

- [PIT-0601] Blad: niespojne nazwy/semantyka komend (np. stop/disable).
  - Wymaganie: ta sama nazwa = ta sama semantyka w CLI i docs.

- [PIT-0602] Blad: `appctl` i `seal remote` mialy rozne komendy i semantyke.
  - Wymaganie: komendy sa symetryczne (`up/down/start/stop/restart/enable/disable/status/logs`).
  - Wymaganie: `appctl up` == `seal remote <target> up` (ta sama operacja).

- [PIT-0603] Blad: 3 osobne kroki (release + deploy + restart) powodowaly pomylki.
  - Wymaganie: jedno polecenie `seal ship <target>` wykonuje release + deploy + restart.

- [PIT-0604] Blad: `npx seal` z podfolderu monorepo nie widzial CLI.
  - Wymaganie: zapewnij globalny link (`tools/seal/scripts/link-global-seal.sh`) albo uzywaj `npx --prefix <repo-root>`.

- [PIT-0605] Blad: instalacja zaleznosci uruchamiala sie w zlym workspace (root zamiast `tools/seal`), przez co brakowalo lokalnych binarek.
  - Wymaganie: przy pracy w monorepo jawnie wskazuj workspace (`npm -w <name> install`) lub `--prefix`, a runner loguje aktywny prefix/workspace.

- [PIT-0606] Blad: `npx` bez `--no-install` probowal pobierac pakiety z sieci i wieszal testy/CI bez internetu.
  - Wymaganie: w CI/testach uzywaj `npx --no-install` lub bezposrednio `./node_modules/.bin/<tool>`.

- [PIT-0607] Blad: uruchomienie komendy w monorepo rekurencyjnie (workspace) uzywalo relatywnej sciezki CLI i padalo w podprojektach.
  - Wymaganie: rekurencyjne uruchomienia CLI musza uzywac **absolutnej** sciezki do binarki/JS.

- [PIT-0608] Blad: projekty w workspace byly przetwarzane w niestabilnej kolejnosci (FS order), co psulo logi i testy.
  - Wymaganie: lista projektow jest sortowana deterministycznie (np. po `name`/`path`) i wypisywana w tej kolejnosci.

- [PIT-0609] Blad: `seal check` uruchomiony poza projektem nadal tworzyl pliki i generowal mylace warningi.
  - Wymaganie: brak `seal.json5` = fail-fast **bez efektow ubocznych**.

- [PIT-0610] Blad: `seal check` ostrzegal o brakujacych narzedziach (np. `upx`), mimo ze nie byly wymagane przez aktualna konfiguracje.
  - Wymaganie: preflight ostrzega **tylko** o narzedziach faktycznie wymaganych przez wybrany packager/protection.

- [PIT-0611] Blad: `seal config diff <sciezka>` zwracal `Missing target`.
  - Wymaganie: `config diff` przyjmuje **nazwe targetu**; nowe targety dodaj `seal target add <target> <config>`.

- [PIT-0612] Blad: TAB completion podpowiadal targety i blokowal opcje (np. `seal deploy --`).
  - Wymaganie: gdy biezacy token zaczyna sie od `-`, completion **zawsze** podpowiada opcje.
  - Wymaganie: po napotkaniu `--` completion traktuje kolejne tokeny jako argumenty pozycyjne (bez podpowiedzi opcji), aby nie psuc oczekiwanych argumentow plikow.
  - Wymaganie: podpowiedzi targetow nie moga maskowac opcji (opcje maja priorytet).
  - Wymaganie: completion musi byc aktualizowany po kazdej zmianie CLI (komendy/opcje).

- [PIT-0613] Blad: wizard bez kontekstu (lista komend bez wyjasnien) utrudnial decyzje.
  - Wymaganie: wizard opisuje kazda komende 1 linijka i wskazuje rekomendowana akcje na teraz.
  - Wymaganie: wizard dziala krok-po-kroku (petla), nie tylko pojedynczy ekran.

- [PIT-0614] Blad: output CLI byl mylacy (duplikaty, niepotrzebne puste linie).
  - Wymaganie: output ma byc zwięzly i bez duplikatow (np. artefakt tylko raz).
  - Wymaganie: kazda linia ma sens (puste linie tylko gdy poprawiaja czytelnosc).

- [PIT-0615] Blad: logowanie do pliku bez rotacji/limitu powodowalo zapelnienie dysku i awarie runtime.
  - Wymaganie: logi produkcyjne na stdout/stderr; jesli logujesz do pliku, wymagaj rotacji/limitu rozmiaru/TTL i loguj aktywne ustawienia.

- [PIT-0616] Blad: w dokumentacji standardow pojawily sie duplikaty identyfikatorow STD, co utrudnialo odniesienia i automatyczne sprawdzanie zgodnosci.
  - Wymaganie: kazdy identyfikator STD musi byc **unikalny**; gdy dodajesz wariant, uzyj sufiksu (`a/b/...`) i sprawdz duplikaty automatycznie (np. `rg -o "STD-[0-9]+[a-z]?(?:\\.[a-z])?" | sort | uniq -d`).

- [PIT-0617] Blad: brakowalo jasnych instrukcji instalacji narzedzi (np. libzstd-dev).
  - Wymaganie: `seal check` zwraca **konkretne** instrukcje naprawy (nazwy pakietow, np. `apt-get install ...`).
  - Wymaganie: dokumentacja onboardingowa musi zawierac te same kroki.

- [PIT-0618] Blad: rozjazd miedzy CLI, completion, wizard i docs (niespojne komendy/opcje).
  - Wymaganie: zmiany CLI **zawsze** aktualizuja completion + wizard + docs w tym samym PR.
  - Wymaganie: nowe komendy/opcje musza byc widoczne w wizardzie i completion.

## Runtime config

- [PIT-0619] Blad: `config.runtime.json5` brakowal lub byl parsowany przez `JSON.parse`.
  - Wymaganie: `config.runtime.json5` jest **wymagany**, a parse to **JSON5**. Brak/blad = exit z kodem bledu.

- [PIT-0620] Blad: uzywanie `.env` jako runtime configu w produkcji.
  - Wymaganie: `.env` nie jest runtime configiem; uzywamy `config.runtime.json5`.

- [PIT-0621] Blad: `config.runtime.json5` mial zbyt szerokie uprawnienia (world‑readable) i mogl ujawnic dane.
  - Wymaganie: ustaw permissje plikow runtime (np. 0640/0600) i weryfikuj w preflight.

- [PIT-0622] Blad: dane RDS (login/haslo/lang) byly w configach lub logach.
  - Wymaganie: RDS login/haslo/lang sa stalymi w kodzie (swiadomy wyjatek), bez ekspozycji w logach.

- [PIT-0623] Blad: domyslne wartosci byly ustawiane przez `||`, co nadpisywalo poprawne `0`/`false`.
  - Wymaganie: dla configu uzywaj `??` (nullish) albo jawnej walidacji typow.

## Logowanie / bezpieczenstwo

- [PIT-0624] Blad: logowanie `JSESSIONID` i komunikatow login/logout.
  - Wymaganie: **nie logujemy danych uwierzytelniajacych ani sesji**. Logi auth maja byc wyciszone lub zakomentowane.

- [PIT-0625] Blad: logowanie pelnych payloadow/odpowiedzi (duze logi, ryzyko sekretow).
  - Wymaganie: loguj tylko metadane i krotkie preview (limit znakow), bez pelnych body.
  - Wymaganie: logi minimalne, tylko dane potrzebne do diagnozy.

- [PIT-0626] Blad: `set -x`/xtrace w skryptach logowal sekrety (tokeny/hasla/URL).
  - Wymaganie: `set -x` tylko w trybie debug i z maskowaniem sekretow; domyslnie OFF.

- [PIT-0627] Blad: logi JSONL byly psute przez znaki nowej linii lub binarne dane w polach.
  - Wymaganie: dane z zewnatrz sa normalizowane/escapowane (np. `\\n`), a binarne pola kodowane (base64/hex).

## UI availability / aktualizacje

- [PIT-0628] Blad: UI odswiezal sie po bledzie backendu i pokazywal strone z bledem.
  - Wymaganie: UI nie robi reloadu na bledzie backendu.
  - Wymaganie: backend wystawia `/api/status` z `buildId`.
  - Wymaganie: UI pokazuje overlay po ok. 2s braku polaczenia.
  - Wymaganie: UI robi reload **tylko** po zmianie `buildId` i po odzyskaniu polaczenia.
  - Wymaganie: polling do `/api/status` ma timeout (AbortController), aby zawieszone requesty nie blokowaly kolejnych prob.
  - Wymaganie: `?debug=1` moze pokazywac badge `buildId` i toast przed reloadem.

- [PIT-0629] Blad: UI używal service worker/cache i pokazywal stary build po deployu.
  - Wymaganie: wylacz service worker albo wersjonuj cache i wymusz reload po zmianie `buildId`.

- [PIT-0630] Blad: UI uzywalo `fetch` bez timeoutu, co zamrazalo stan UI.
  - Wymaganie: `fetch` zawsze z `AbortController` i limitem czasu.

## UI niezawodnosc / polaczenia

- [PIT-0631] Blad: UI uzywalo blokujacych `alert()` przy problemach polaczenia (psulo UX).
  - Wymaganie: bledy polaczen komunikujemy przez **nieblokujacy overlay** lub toast.

- [PIT-0632] Blad: UI probowalo zgadywac brak RDS na podstawie pustych danych.
  - Wymaganie: backend zwraca **jawny status** polaczenia z RDS (`rdsOk`, opcjonalnie `rdsSource`).
  - Wymaganie: backend zwraca `rdsOk`/`rdsSource` **takze przy non-200** (np. 404/500).
  - Wymaganie: UI parsuje JSON nawet przy `resp.ok=false` i na tej podstawie aktualizuje overlay.
  - UI pokazuje dwa rozne komunikaty:
    - "Brak polaczenia z serwerem aplikacji" (stan RDS nieznany),
    - "Brak polaczenia serwera z RDS" (backend dziala, RDS nie).
  - Komunikat powinien zawierac prosty tekst do przekazania serwisowi ("Zglos: ...").

## UI input / tablety (klik, long-press, scroll)

- [PIT-0633] Blad: klik/long-press na przyciskach i tabach nie reagowal (dlugie przytrzymanie lub lekki ruch palca).
  - Wymaganie: uzywaj wspolnego `setupPressAction`:
    - `pointerdown` (touch/pen) uruchamia akcje od razu; `pointerup` dla myszy.
    - `setPointerCapture` + "slop" (np. 22px) i sprawdzenie `inside` na `pointerup`.
    - ignoruj zdublowane `click` (okno 600-800 ms).
    - `contextmenu` -> `preventDefault`.
  - CSS dla `.btn`/`.tab`: `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none`, `-webkit-tap-highlight-color: transparent`.

- [PIT-0634] Blad: klik na panelu/boxach gasl po chwili (drag/long-press).
  - Wymaganie: akcja toggle albo na `pointerdown` (touch) albo na `pointerup` z "slopem".
  - Nie polegaj na samym `click` na tabletach.

- [PIT-0635] Blad: szybki polling nadpisywal lokalne zmiany w UI (migotanie stanu).
  - Wymaganie: optimistic UI + lokalny grace 300-500 ms zanim backend nadpisze stan.

- [PIT-0636] Blad: scroll blokowal sie po lekkim ruchu w bok (poziomy pan "przejmowal" gest).
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

- `seal release` bez `postject` musi failowac (dla SEA); w razie potrzeby wybierz `--packager bundle`.
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
- CLI: `appctl` i `seal remote` maja te same komendy/semantyke; `seal ship` dziala jako 1 krok.
- CLI: `seal` jest dostepny globalnie (link lub `npx --prefix`) i `config diff` uzywa nazwy targetu.
- Cache/retention: brak niczego, co rosnie bez limitu (cache, tmp, logi, releasy).

## Dodatkowe wnioski (batch 100)

- [PIT-0637] Blad: build nie logowal wersji narzedzi (cc/strip/packer), co utrudnial reprodukcje.
  - Wymaganie: loguj `tool --version` dla kazdego uzytego narzedzia.
- [PIT-0638] Blad: binarki C/C++ zawieraly sciezki builda (debug info), co ujawnialo layout projektu mimo stripu.
  - Wymaganie: ustaw `-fdebug-prefix-map`/`-ffile-prefix-map` (lub odpowiednik w clang/gcc), aby zanonimizowac sciezki builda.
- [PIT-0639] Blad: nie bylo wiadomo, z jakiej sciezki pochodzi kompilator (PATH), co utrudnialo diagnoze.
  - Wymaganie: loguj absolutna sciezke do kazdego narzedzia (`which`/`command -v`).
- [PIT-0640] Blad: cache buildow byl wspoldzielony miedzy OS/arch, przez co pojawialy sie niezgodne artefakty.
  - Wymaganie: kluczuj cache po `os+arch` (i wersji formatu).
- [PIT-0641] Blad: buildy nie byly deterministyczne przez timestampy w archiwach.
  - Wymaganie: wspieraj deterministyczne buildy (`SOURCE_DATE_EPOCH`, stałe czasy).
- [PIT-0642] Blad: archiwa mialy niestabilny porzadek plikow, co psulo porownania.
  - Wymaganie: sortuj liste plikow w archiwum w sposob stabilny.
- [PIT-0643] Blad: TMPDIR byl na `noexec` lub readonly i build wysypywal sie bez jasnego powodu.
  - Wymaganie: sprawdz mount flags TMPDIR i dawaj jasna instrukcje zmiany.
- [PIT-0644] Blad: brak mozliwosci zmiany katalogu tymczasowego powodowal problemy na NFS/slow FS.
  - Wymaganie: pozwol nadpisac katalog temp (`SEAL_TMPDIR`) i waliduj zapisywalnosc.
- [PIT-0645] Blad: domyslny `-j` w kompilacji nadmiernie obciazal CPU/RAM i powodowal flaki.
  - Wymaganie: ustaw bezpieczny limit rownoleglosci i daj opcje override.
- [PIT-0646] Blad: build dziedziczyl `CFLAGS/CXXFLAGS/LDFLAGS` z ENV, co psulo spojnosc.
  - Wymaganie: albo czysc te zmienne, albo loguj je jawnie jako czesc configu.
- [PIT-0647] Blad: brak oczekiwanego kompilatora powodowal cichy fallback na inny toolchain.
  - Wymaganie: fail‑fast, gdy wskazany kompilator nie jest dostepny.
- [PIT-0648] Blad: automatyczny wybor artefaktu bral "ostatni po mtime", co przy wielu targetach/packerach prowadzilo do deployu niezgodnego builda.
  - Wymaganie: wybieraj artefakt po metadanych (`target+packager+config`) albo wymagaj jawnego `--artifact`.

- [PIT-0649] Blad: nazwy artefaktow kolidowaly miedzy targetami/packerami.
  - Wymaganie: nazwa artefaktu zawiera `target+packager+buildId`.
- [PIT-0650] Blad: artefakty byly nadpisywane bez ostrzezenia.
  - Wymaganie: nadpisywanie tylko z `--force` albo unikalna nazwa.
- [PIT-0651] Blad: artefakt byl pusty lub ucity, a pipeline szedl dalej.
  - Wymaganie: waliduj rozmiar i oczekiwana zawartosc artefaktu.
- [PIT-0652] Blad: pliki wykonywalne w release nie mialy +x.
  - Wymaganie: ustaw jawne permissje dla binarek i skryptow.
- [PIT-0653] Blad: tar na serwerze zachowywal ownera i psul uprawnienia.
  - Wymaganie: uzywaj `--no-same-owner`/`--numeric-owner`.
- [PIT-0654] Blad: brak manifestu plikow utrudnial walidacje releasu.
  - Wymaganie: generuj manifest z hashami.
- [PIT-0655] Blad: manifest/hash byl liczony przed strip/packer/obfuscation, przez co nie zgadzal sie z finalnym artefaktem.
  - Wymaganie: generuj manifest **po** wszystkich krokach post-processingu (ostatni etap builda).
- [PIT-0656] Blad: brak metadanych wersji utrudnial diagnostyke.
  - Wymaganie: zapisuj `buildId/packager/config-hash` w metadanych.
- [PIT-0657] Blad: ponowne buildy zostawialy stare pliki w release.
  - Wymaganie: czysc release albo tworz nowe katalogi per build.
- [PIT-0658] Blad: symlinki wchodzily do releasu i mogly wyciec poza root.
  - Wymaganie: blokuj symlinki albo jawnie je waliduj.
- [PIT-0659] Blad: archiwum zawieralo sciezki absolutne.
  - Wymaganie: kazda sciezka w artefakcie musi byc relatywna.
- [PIT-0660] Blad: `tar` uzywal domyslnego formatu USTAR i ucinal dlugie sciezki (limit 100 znakow), przez co release byl niekompletny.
  - Wymaganie: uzywaj `--format=gnu` lub `--format=pax` oraz fail‑fast na ostrzezeniach `tar` o truncation.
- [PIT-0661] Blad: archiwa przenosily ACL/xattr (np. SELinux context), co zmienialo uprawnienia na serwerze.
  - Wymaganie: przy tworzeniu/rozpakowaniu wylacz ACL/xattr (`--no-acls --no-xattrs`) lub jawnie je czysc po ekstrakcji.

- [PIT-0662] Blad: skrypty zdalne nie uzywaly `set -euo pipefail`, co ukrywalo bledy.
  - Wymaganie: wymusz `set -euo pipefail` dla skryptow deploy.
- [PIT-0663] Blad: deploy szedl na niezgodna architekture.
  - Wymaganie: waliduj `uname -m` na serwerze przed deploy.
- [PIT-0664] Blad: deploy szedl na niezgodny runtime (glibc/musl).
  - Wymaganie: waliduj kompatybilnosc runtime (np. `ldd --version`).
- [PIT-0665] Blad: uprawnienia na serwerze byly zbyt szerokie przez `umask`.
  - Wymaganie: ustaw i zweryfikuj `umask` podczas deploy.
- [PIT-0666] Blad: aktualizacja `current` byla nieatomowa.
  - Wymaganie: uzywaj `ln -sfn` + `fsync` dla atomowej zmiany.
- [PIT-0667] Blad: sciezki zdalne z spacjami rozbijaly komendy.
  - Wymaganie: skladanie komend tylko z bezpiecznym quoting/array.
- [PIT-0668] Blad: serwisowy user nie istnial i instalacja padala w polowie.
  - Wymaganie: sprawdz `id -u` i dawaj instrukcje utworzenia.
- [PIT-0669] Blad: brak `systemctl` na hostcie dawal nieczytelny blad.
  - Wymaganie: wykryj brak systemd i fail‑fast z instrukcja.
- [PIT-0670] Blad: po deployu nie bylo walidacji owner/perms.
  - Wymaganie: po deployu waliduj owner/perms kluczowych plikow.
- [PIT-0671] Blad: `current.buildId` byl zapisywany bez atomowosci.
  - Wymaganie: zapis tmp + rename + fsync.

- [PIT-0672] Blad: child procesy dziedziczyly wszystkie ENV i wyciekaly sekrety.
  - Wymaganie: allowlistuj ENV przekazywane do child procesow.
- [PIT-0673] Blad: sekrety byly przekazywane w CLI args (widoczne w `ps`).
  - Wymaganie: sekrety tylko w pliku lub ENV, nie w args.
- [PIT-0674] Blad: globalne `.npmrc` z tokenami bylo uzywane przez instalatory.
  - Wymaganie: ustaw `NPM_CONFIG_USERCONFIG` na temp plik i sprzataj.
- [PIT-0675] Blad: `npm` korzystal z innego registry niz oczekiwane (globalny `.npmrc`/ENV), co dawalo 404 lub zle paczki.
  - Wymaganie: jawnie ustaw `NPM_CONFIG_REGISTRY` dla runow testowych i loguj aktywne registry.
- [PIT-0676] Blad: pobieranie binarek bez weryfikacji checksum.
  - Wymaganie: wymagaj sha256/signature i weryfikuj.
- [PIT-0677] Blad: `LD_LIBRARY_PATH/LD_PRELOAD` z ENV wplywal na uruchomienia.
  - Wymaganie: czysc `LD_*` przed exec child procesow.
- [PIT-0678] Blad: pliki sekretow mialy zbyt szerokie uprawnienia.
  - Wymaganie: `umask 077` i `chmod 0600` dla sekretow.
- [PIT-0679] Blad: logi zawieraly pelne sekrety z configu.
  - Wymaganie: redaguj klucze typu `password/token/secret`.
- [PIT-0680] Blad: sekrety lezaly w publicznie dostepnym katalogu.
  - Wymaganie: dedykowany katalog z ograniczonymi perms.
- [PIT-0681] Blad: tymczasowe pliki z sekretami nie byly sprzatane.
  - Wymaganie: usuwaj je deterministycznie po uzyciu.
- [PIT-0682] Blad: core dumpy byly wlaczone w produkcji.
  - Wymaganie: domyslnie wylacz core dumpy (opt‑in z ostrzezeniem).
- [PIT-0683] Blad: wylaczenie core dump przez `ulimit` nie dzialalo dla procesu uruchamianego przez systemd (hostowe limity nadpisywaly ustawienia).
  - Wymaganie: w unit systemd ustaw `LimitCORE=0` (i ewentualnie `CoredumpFilter=`), a w runtime dodatkowo `ulimit -c 0` dla spojnoci.

- [PIT-0684] Blad: nieznane klucze w configu byly ignorowane.
  - Wymaganie: waliduj schema i ostrzegaj/failuj na unknown keys.
- [PIT-0685] Blad: nadpisania z ENV mialy spacje i biale znaki.
  - Wymaganie: trim i waliduj input z ENV.
- [PIT-0686] Blad: liczby w configu byly parsowane jako stringi.
  - Wymaganie: parse + walidacja zakresu.
- [PIT-0687] Blad: nieprawidlowe wartosci w configu (np. `sshPort`, `sshStrictHostKeyChecking`) byly cicho normalizowane do defaultow, co ukrywalo bledy konfiguracji.
  - Wymaganie: jesli wartosc jest podana i nieprawidlowa, fail‑fast z jasnym bledem; fallback tylko jawnie i z logiem „effective config”.
- [PIT-0688] Blad: booleany z configu byly „coerced” (`!!value`), wiec `"false"` stawalo sie `true` i wlaczalo funkcje mimo intencji.
  - Wymaganie: booleany musza byc typu `true/false`; stringi/number = blad walidacji (fail‑fast).
- [PIT-0689] Blad: sciezki w configu nie byly normalizowane.
  - Wymaganie: `path.resolve` + walidacja w dozwolonym root.
- [PIT-0690] Blad: merge configu byl plytki i gubil nested klucze.
  - Wymaganie: jawny deep‑merge lub explicit config.
- [PIT-0691] Blad: uzycie `||` w defaultach nadpisywalo poprawne `false/0`.
  - Wymaganie: uzywaj `??` lub jawnego sprawdzenia.
- [PIT-0692] Blad: config byl auto‑tworzony w produkcji bez zgody.
  - Wymaganie: auto‑create tylko w dev (explicit flag).
- [PIT-0693] Blad: brak walidacji owner/perms dla configu z sekretami.
  - Wymaganie: sprawdzaj owner/perms configu.
- [PIT-0694] Blad: wlaczone flagi nie byly logowane.
  - Wymaganie: loguj efektywne flagi/booleany.
- [PIT-0695] Blad: diff configu porownywal listy w zaleznosci od kolejnosci.
  - Wymaganie: normalizuj kolejnosc tam, gdzie order nie ma znaczenia.

- [PIT-0696] Blad: testy oczekiwaly gotowosci po `sleep`, co bylo flakey.
  - Wymaganie: polling z timeoutem zamiast `sleep`.
- [PIT-0697] Blad: testy modyfikowaly `process.env` i nie przywracaly.
  - Wymaganie: snapshot/restore `process.env` w `finally`.
- [PIT-0698] Blad: testy dzielily temp dir i wzajemnie sobie przeszkadzaly.
  - Wymaganie: per‑test temp dir (`mkdtemp`).
- [PIT-0699] Blad: losowe dane w testach byly niepowtarzalne.
  - Wymaganie: seeduj RNG i loguj seed.
- [PIT-0700] Blad: testy nie asercjonowaly exit code child procesow.
  - Wymaganie: jawnie sprawdzaj exit code/signal.
- [PIT-0701] Blad: testy rownolegle korzystaly ze wspolnego cache.
  - Wymaganie: izoluj cache lub uzyj locka.
- [PIT-0702] Blad: testy padaly na brakujacych zaleznosciach zamiast SKIP.
  - Wymaganie: brak zaleznosci = SKIP z instrukcja instalacji.
- [PIT-0703] Blad: przy failu brakowalo artefaktow do diagnozy.
  - Wymaganie: zachowuj logi/artefakty (z limitem) przy failu.
- [PIT-0704] Blad: testy zalezne od timezone/locale byly flakey.
  - Wymaganie: `TZ=UTC`, `LC_ALL=C` w testach.
- [PIT-0705] Blad: globalny git config/hooks wplywal na testy.
  - Wymaganie: izoluj git config (`GIT_CONFIG_*`, `core.hooksPath=/dev/null`).
- [PIT-0706] Blad: `git` w kontenerze (root) odmawial pracy na repo przez "dubious ownership".
  - Wymaganie: w testach/CI ustaw `GIT_SAFE_DIRECTORY` lub dodaj repo do `safe.directory` i loguj to jawnie.

- [PIT-0707] Blad: logi nie zawieraly `appName/buildId`, przez co nie bylo kontekstu.
  - Wymaganie: logi zawsze zawieraja `appName/buildId`.
- [PIT-0708] Blad: logi byly w lokalnym czasie i nieporownywalne.
  - Wymaganie: czas w logach tylko UTC/ISO.
- [PIT-0709] Blad: komunikaty bledu nie zawieraly kodu wyjscia.
  - Wymaganie: loguj exit code/signal.
- [PIT-0710] Blad: diagnostyka domyslnie zbierala dane w trybie full.
  - Wymaganie: domyslnie tryb safe; full tylko jawnie.
- [PIT-0711] Blad: `--verbose` nie pokazywal uruchomionych komend.
  - Wymaganie: w verbose loguj command line (z sanitizacja).
- [PIT-0712] Blad: pomiary czasu uzywaly `Date.now()`.
  - Wymaganie: uzywaj zegara monotonicznego.
- [PIT-0713] Blad: powtarzalne bledy zalewaly logi.
  - Wymaganie: rate‑limit/sampling dla identycznych bledow.
- [PIT-0714] Blad: biblioteki logowaly bezposrednio na stdout.
  - Wymaganie: uzywaj centralnego loggera.
- [PIT-0715] Blad: logi gubily sie przy `process.exit`.
  - Wymaganie: flush logow przed wyjsciem.
- [PIT-0716] Blad: logi do pliku rosly bez ograniczen.
  - Wymaganie: rotacja lub limit rozmiaru.

- [PIT-0717] Blad: workspace zwracal `0` mimo bledow w podprojektach.
  - Wymaganie: non‑zero exit przy bledzie (chyba ze `--continue-on-error`).
- [PIT-0718] Blad: brak podsumowania statusu dla wielu projektow.
  - Wymaganie: drukuj summary (ok/fail/skip) po zakonczeniu.
- [PIT-0719] Blad: help/opisy nie byly aktualizowane po zmianach opcji.
  - Wymaganie: aktualizuj help/docs w tej samej zmianie (CI check).
- [PIT-0720] Blad: nazwy opcji byly niespojnie nazywane.
  - Wymaganie: spojny kebab‑case bez nadmiaru aliasow.
- [PIT-0721] Blad: `--force` nie ostrzegal o ryzyku.
  - Wymaganie: jawny warning w output.
- [PIT-0722] Blad: brak trybu `--yes/--non-interactive` utrudnial CI.
  - Wymaganie: dodaj tryb bez promptow.
- [PIT-0723] Blad: brak `--json` utrudnial automatyzacje.
  - Wymaganie: `--json` dla kluczowych komend.
- [PIT-0724] Blad: brak informacji o wykrytym root/workspace.
  - Wymaganie: wypisz resolved root w output.
- [PIT-0725] Blad: domyslny target byl ukryty.
  - Wymaganie: zawsze wypisuj efektywny target.
- [PIT-0726] Blad: nieznane argumenty byly ignorowane.
  - Wymaganie: fail‑fast z sugestiami.

- [PIT-0727] Blad: `rm -rf $VAR` z pustym VAR usuwal zle katalogi.
  - Wymaganie: guard na pusta sciezke i walidacja root.
- [PIT-0728] Blad: kopiowanie `cp -r` dereferowalo symlinki.
  - Wymaganie: zachowuj symlinki albo jawnie je blokuj.
- [PIT-0729] Blad: nowe pliki byly tworzone poza `seal-out`.
  - Wymaganie: generowane pliki tylko w `seal-out`/outDir.
- [PIT-0730] Blad: `mktemp` korzystalo z domyslnego /tmp na `noexec`.
  - Wymaganie: jawny base dir + walidacja mount flags.
- [PIT-0731] Blad: bledy `EINTR` nie byly obslugiwane.
  - Wymaganie: retry na `EINTR` dla kluczowych operacji FS.
- [PIT-0732] Blad: `pkill` ubijal zle procesy po nazwie.
  - Wymaganie: weryfikuj PID i `cmdline` przed kill.
- [PIT-0733] Blad: otwarte FD wyciekaly do child procesow.
  - Wymaganie: ustaw `FD_CLOEXEC` i zamykaj w `finally`.
- [PIT-0734] Blad: `chmod -R` zmienial perms na calym release.
  - Wymaganie: ustawiaj perms selektywnie.
- [PIT-0735] Blad: segmenty sciezki z inputu umozliwialy path traversal.
  - Wymaganie: sanitizuj segmenty (brak `..`/absolutnych).
- [PIT-0736] Blad: brak `fsync` po zapisie krytycznych plikow.
  - Wymaganie: `fsync` pliku i katalogu.

- [PIT-0737] Blad: requesty HTTP wisialy bez timeoutow.
  - Wymaganie: `connect` i `total` timeout dla kazdego requestu.
- [PIT-0738] Blad: health‑check HTTP zakladal obecność `curl`/`wget`, a brak narzedzia dawalo nieczytelny blad lub fail w runtime.
  - Wymaganie: preflight wykrywa brak narzedzia (curl/wget) i podaje instrukcje instalacji lub fallback/skip.
- [PIT-0739] Blad: retry byly wykonywane dla nie‑idempotentnych operacji.
  - Wymaganie: retry tylko dla idempotentnych lub jawnie oznaczonych.
- [PIT-0740] Blad: komunikaty nie rozrozniay DNS/timeout/TLS.
  - Wymaganie: rozrozniaj typ bledu w komunikacie.
- [PIT-0741] Blad: TLS wylaczony przez ENV bez ostrzezenia.
  - Wymaganie: `TLS verify off` tylko opt‑in z ostrzezeniem.
- [PIT-0742] Blad: proxy z ENV bylo uzywane mimo braku zgody.
  - Wymaganie: proxy tylko gdy jawnie wlaczone w configu.
  - Wymaganie: gdy proxy jest wlaczone, ustaw `NO_PROXY` dla `localhost,127.0.0.1,::1` i loguj efektywne wartosci proxy.
- [PIT-0743] Blad: lokalne health‑checki (`curl`/`wget`) przechodzily przez proxy mimo `NO_PROXY`, bo brakowalo `no_proxy` lub `curl --noproxy`, co dawalo false‑negative.
  - Wymaganie: dla checkow loopback ustawiaj `NO_PROXY` i `no_proxy`, a dla `curl` dodawaj `--noproxy "*"` (lub whitelist), aby ominac proxy niezaleznie od ENV.
- [PIT-0744] Blad: redirecty bez limitu mogly zawiesic request.
  - Wymaganie: limituj redirecty i loguj finalny URL.
- [PIT-0745] Blad: polaczenia HTTP nie byly domykane i wyciekaly.
  - Wymaganie: ustaw keep‑alive z timeoutem lub zamykaj sockety.
- [PIT-0746] Blad: brak heartbeat dla polaczen dlugich (ws/long‑poll).
  - Wymaganie: heartbeat/ping + timeout.

## Dodatkowe wnioski (batch 101-110)

- [PIT-0747] Blad: uzycie `sed -i` bez uwzglednienia roznic GNU/BSD powodowalo awarie skryptow.
  - Wymaganie: stosuj wrapper `sed_inplace` z detekcja platformy albo `perl -pi`/`python -i`.
- [PIT-0748] Blad: archiwa (`.tgz/.gz`) zawieraly timestampy i byly niedeterministyczne.
  - Wymaganie: dla gzip uzywaj `-n`, a dla tar ustaw `--sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner`.
- [PIT-0749] Blad: brak preflight wolnego miejsca lokalnie powodowal fail podczas builda.
  - Wymaganie: sprawdz `df`/wolne miejsce lokalnie przed ciezkimi operacjami.
- [PIT-0750] Blad: tymczasowe pliki byly tworzone w katalogu world‑writable bez zabezpieczen przed symlink attack.
  - Wymaganie: tworz tmp przez `mkstemp`/`O_EXCL` + `lstat` (brak symlink/hardlink).
- [PIT-0751] Blad: `read` bez `IFS=` i `-r` tracil biale znaki/backslashe w liniach.
  - Wymaganie: uzywaj `IFS= read -r` dla wierszy z plikow.
- [PIT-0752] Blad: archiwizacja dereferowala symlinki i mogla wyciagnac pliki spoza root.
  - Wymaganie: blokuj/detekuj symlinki przed archiwizacja (lub archiwizuj linki jako linki).
- [PIT-0753] Blad: `PATH` zawieral `.` i uruchamial zly binarny (hijack).
  - Wymaganie: ustaw bezpieczny `PATH` bez `.` i loguj go.
- [PIT-0754] Blad: zbyt niski limit `ulimit -n` powodowal losowe bledy I/O.
  - Wymaganie: sprawdz `ulimit -n` i ostrzegaj/ustaw minimalny limit.
- [PIT-0755] Blad: transfery nie zachowywaly `mtime`/perms, co psulo diff/rollback.
  - Wymaganie: przy synchronizacji uzywaj odpowiednich flag (`rsync -a`, `scp -p`).
- [PIT-0756] Blad: rozpakowanie archiwum bez limitu rozmiaru/liczby plikow moglo zrobic „zip bomb”.
  - Wymaganie: narzuc limity (max size/entries) i fail‑fast po przekroczeniu.

## Dodatkowe wnioski (batch 111-120)

- [PIT-0757] Blad: `apt/dpkg` byl zablokowany przez inny proces, a instalator wisial bez konca.
  - Wymaganie: dodaj retry/backoff lub czekanie na lock z timeoutem i jasnym komunikatem.
- [PIT-0758] Blad: testy dockerowe uzywaly niepinowanych obrazow, co dawalo dryf zachowania.
  - Wymaganie: pinuj obrazy do digestu (sha256) lub jawnej wersji.
- [PIT-0759] Blad: `stat`/`date` mialy inne flagi na roznych dystrybucjach, co psulo skrypty.
  - Wymaganie: stosuj wrapper z detekcja wariantu lub `python -c` do uzyskania metadanych.
- [PIT-0760] Blad: skrypty bash nie byly lintowane i zawieraly subtelne bledy.
  - Wymaganie: uruchamiaj `shellcheck` w CI dla wszystkich skryptow.
- [PIT-0761] Blad: zaleznosci natywne (`node-gyp`) failowaly przez brak `python3`.
  - Wymaganie: preflight sprawdza `python3` i daje instrukcje instalacji.
- [PIT-0762] Blad: time‑based guardy failowaly przy duzym drift czasu systemowego.
  - Wymaganie: wykrywaj duzy drift (np. >5 min) i fail‑fast z instrukcja synchronizacji czasu.
- [PIT-0763] Blad: `nproc` zwracal wysoka wartosc w CI i kompilacja wysypywala RAM.
  - Wymaganie: limituj rownoleglosc takze wzgledem dostepnej pamieci.
- [PIT-0764] Blad: buildy narzedzi ze zrodel uzywaly domyslnej rownoległości `make`/`ninja`, co ignorowalo limity cgroup i powodowalo OOM.
  - Wymaganie: narzucaj jawny limit `-j` (np. z wyliczonego `jobs`) oraz ustaw `CMAKE_BUILD_PARALLEL_LEVEL`/`MAKEFLAGS` w installerach.
- [PIT-0765] Blad: limity CPU w cgroup nie byly uwzgledniane, co powodowalo oversubscription i timeouty.
  - Wymaganie: przy wyliczaniu `jobs` uwzgledniaj limity cgroup (quota/period) i loguj wykryta liczbe CPU.
- [PIT-0766] Blad: procesy Node.js w CI/containers dostawaly OOM przez zbyt niski limit pamieci.
  - Wymaganie: wykrywaj limit pamieci (cgroup) i ustaw `NODE_OPTIONS=--max-old-space-size`, albo zmniejsz równoległość; loguj limit pamieci.
- [PIT-0767] Blad: komendy `git` wisialy na pagerze (`less`) w trybie nieinteraktywnym.
  - Wymaganie: ustaw `GIT_PAGER=cat` i `PAGER=cat` dla nieinteraktywnych wywolan.
- [PIT-0768] Blad: narzedzia wykrywaly TTY i wlaczaly tryb interaktywny mimo CI.
  - Wymaganie: ustaw `TERM=dumb` lub `CI=1`, aby wymusic tryb nieinteraktywny.
- [PIT-0769] Blad: brak jawnego `LC_ALL=C` w skryptach powodowal roznice sortowania.
  - Wymaganie: ustaw `LC_ALL=C` w miejscach, gdzie parse/sort zalezy od locale.

## Dodatkowe wnioski (batch 121-125)

- [PIT-0770] Blad: bledy CLI byly wypisywane na stdout, a exit code byl 0.
  - Wymaganie: bledy pisz do stderr i zwracaj nie‑zero; bledy uzycia maja osobny kod.
- [PIT-0771] Blad: pliki konfiguracyjne/sekretow byly czytane bez weryfikacji typu (mogly byc FIFO/urzadzenie).
  - Wymaganie: przed odczytem sprawdz `lstat` i wymagaj **regular file**.
- [PIT-0772] Blad: otwieranie wrazliwych plikow podazalo za symlinkami.
  - Wymaganie: stosuj `O_NOFOLLOW` albo jawny `lstat` + `open` tylko na regular file.
- [PIT-0773] Blad: rozpakowanie archiwum pozwalalo na pliki specjalne (device/FIFO).
  - Wymaganie: odrzucaj entries inne niz regular file/dir/symlink.
- [PIT-0774] Blad: CLI nie rozroznial bledow uzycia od bledow runtime.
  - Wymaganie: bledy uzycia zwracaja kod (np. 2) i wypisuja skrocony help.

## Dodatkowe wnioski (batch 126-130)

- [PIT-0775] Blad: `buildId`/timestamp byl generowany w lokalnej strefie i mylil daty w nazwach artefaktow.
  - Wymaganie: uzywaj UTC (ISO/`YYYYMMDD-HHMMSS`) i dokumentuj format.
- [PIT-0776] Blad: identyfikatory/nonce byly generowane przez `Math.random`, co jest slabe kryptograficznie.
  - Wymaganie: do ID/nonce uzywaj `crypto.randomUUID()` lub `crypto.randomBytes`.
- [PIT-0777] Blad: opcje enum (np. `packager`) byly case‑sensitive, co prowadzilo do trudnych bledow.
  - Wymaganie: normalizuj do lower‑case i waliduj przeciwko whitelist.
- [PIT-0778] Blad: porty w configu nie byly walidowane (0/ujemne/>65535), co dawalo niejasne bledy.
  - Wymaganie: waliduj zakres portu 1‑65535 i dawaj jasny blad.
- [PIT-0779] Blad: komunikaty bledow podawaly sciezki relatywne, przez co diagnostyka byla mylaca.
  - Wymaganie: wypisuj absolutna sciezke do pliku w bledach.

## Dodatkowe wnioski (batch 131-135)

- [PIT-0780] Blad: rekurencyjne skanowanie katalogow bralo `.git`, `node_modules`, `seal-out`, co powodowalo spowolnienia i przypadkowe artefakty.
  - Wymaganie: przy skanowaniu repo zawsze ignoruj katalogi generowane i VCS.
- [PIT-0781] Blad: obliczanie hashy ladowalo caly plik do pamieci, co crashowalo na duzych plikach.
  - Wymaganie: hashuj strumieniowo, nie trzymac calego pliku w RAM.
- [PIT-0782] Blad: raporty/logi rosly bez ograniczen i zapychaly dysk.
  - Wymaganie: limituj rozmiar logow/raportow (rotacja, max lines/bytes).
- [PIT-0783] Blad: generowane manifesty byly zapisywane bez jawnego `mode`, co dawalo losowe uprawnienia.
  - Wymaganie: ustawiaj `mode` przy `fs.open` (np. `0o600/0o644`) zamiast polegac na umask.
- [PIT-0784] Blad: walidacja sciezek dopuszczala `..` po normalizacji (np. `path.join` z absolutnym segmentem).
  - Wymaganie: zawsze sprawdz `realpath` i wymagaj, by sciezka byla w dozwolonym root.

## Dodatkowe wnioski (batch 136-140)

- [PIT-0785] Blad: `rm -rf` przekraczal granice mount pointow i usuwal za duzo.
  - Wymaganie: stosuj `--one-file-system` lub jawne sprawdzenie mount pointu.
- [PIT-0786] Blad: zapisy JSON/manifestow byly niestabilne (kolejnosc kluczy losowa).
  - Wymaganie: sortuj klucze i zapisuj stabilnie (deterministyczny stringify).
- [PIT-0787] Blad: rozpakowanie tar zachowywalo zbyt szerokie perms z archiwum.
  - Wymaganie: uzywaj `--no-same-permissions` i/lub jawnego `chmod` po rozpakowaniu.
- [PIT-0788] Blad: `rsync` zachowywal perms, ktore nie pasowaly do wymaganego modelu uprawnien.
  - Wymaganie: wymusz perms przez `--chmod=...` albo `--no-perms` + jawny `chmod`.
- [PIT-0789] Blad: narzedzia ignorowaly `umask` przy tworzeniu katalogow przez `cp -a`/`tar`.
  - Wymaganie: po kopiowaniu jawnie ustaw perms na katalogach docelowych.

## Dodatkowe wnioski (batch 141-145)

- [PIT-0790] Blad: lock PID byl weryfikowany bez sprawdzania start‑time/cmdline, co powodowalo false‑positive przez reuse PID.
  - Wymaganie: przy walidacji locka sprawdzaj start‑time/cmdline procesu.
- [PIT-0791] Blad: `chmod`/`chown` podazaly za symlinkami i modyfikowaly pliki poza root.
  - Wymaganie: uzywaj `--no-dereference`/`-h` lub jawnie blokuj symlinki.
- [PIT-0792] Blad: `readdir`/`glob` zwracaly losowa kolejnosc, co psulo deterministyczne operacje.
  - Wymaganie: sortuj liste plikow przed dalszym przetwarzaniem.
- [PIT-0793] Blad: rekurencyjne skanowanie nie mialo limitu i moglo wpasc w petle (symlinki).
  - Wymaganie: stosuj limit glebokosci lub trackuj inode/realpath, aby uniknac petli.
- [PIT-0794] Blad: `find`/skanowanie przechodzilo przez mount‑pointy i lapalo niechciane FS.
  - Wymaganie: uzywaj `-xdev` lub jawnego ograniczenia do jednego FS.

## Dodatkowe wnioski (batch 146-150)

- [PIT-0795] Blad: `--json` output byl zanieczyszczony logami i nie dało sie go parsować.
  - Wymaganie: w trybie `--json` stdout zawiera tylko JSON, a logi ida na stderr.
- [PIT-0796] Blad: `timeout` byl niedostepny lub roznil sie na busybox, przez co procesy wisialy.
  - Wymaganie: sprawdz `timeout` i w razie braku uzyj wlasnych timeoutow w kodzie.
- [PIT-0797] Blad: skrypty sprzatania usuwaly tylko `*`, zostawiajac dotfiles.
  - Wymaganie: cleanup musi obejmowac dotfiles (np. `find` albo `shopt -s dotglob`).
- [PIT-0798] Blad: `/proc` byl niedostepny (hidepid=2), co psulo checki bez jasnego komunikatu.
  - Wymaganie: wykryj brak dostepu do `/proc` i fail‑fast z instrukcja zmiany mount options.
- [PIT-0799] Blad: `mkdir -p` na istniejacym pliku dawało mylące bledy.
  - Wymaganie: przed `mkdir -p` sprawdz, czy sciezka nie wskazuje na plik.

## Dodatkowe wnioski (batch 151-155)

- [PIT-0800] Blad: case‑insensitive FS powodowal kolizje nazw (np. `App` vs `app`).
  - Wymaganie: wykrywaj kolizje case‑insensitive i fail‑fast z jasnym bledem.
- [PIT-0801] Blad: destrukcyjne operacje byly dozwolone na niebezpiecznych sciezkach (`/`, `/home`, `C:\\`).
  - Wymaganie: jawna denylista niebezpiecznych katalogow i twardy fail.
- [PIT-0802] Blad: nazwy plikow z kontrolnymi znakami psuly logi lub komendy shell.
  - Wymaganie: sanitizuj/escapuj nazwy plikow w logach i przy budowie komend.
- [PIT-0803] Blad: zbyt dlugie sciezki (`ENAMETOOLONG`) dawaly nieczytelny blad w polowie operacji.
  - Wymaganie: waliduj dlugosc sciezek i wypisz jasna instrukcje skrocenia.
- [PIT-0804] Blad: `fs.watch`/watchery byly uzywane do krytycznych decyzji, mimo ze sa niestabilne.
  - Wymaganie: watchery tylko pomocniczo; logika krytyczna opiera sie na polling/explicit checks.

## Dodatkowe wnioski (batch 156-160)

- [PIT-0805] Blad: archiwa przenosily bity `setuid/setgid`, co moglo eskalowac uprawnienia po rozpakowaniu.
  - Wymaganie: po rozpakowaniu usuwaj bity `setuid/setgid` (chmod u-s,g-s) i weryfikuj perms.
- [PIT-0806] Blad: artefakty zawieraly szum systemowy (`.DS_Store`, `Thumbs.db`), co psulo diffy i kontrole.
  - Wymaganie: filtruj znane pliki smieciowe na etapie bundlingu/archiwizacji.
- [PIT-0807] Blad: przekazywanie duzych danych przez CLI powodowalo `E2BIG`.
  - Wymaganie: duze dane przekazuj przez plik/STDIN, nie przez argumenty.
- [PIT-0808] Blad: `tar`/`cp -a` zachowywal bity wykonywalne na plikach, ktore nie powinny byc wykonywalne.
  - Wymaganie: po rozpakowaniu/kopiowaniu jawnie ustaw `chmod` dla binarek i pozostalych plikow.
- [PIT-0809] Blad: `PATH` wybieral narzedzia z nieoczekiwanych lokalizacji (np. snap), co dawalo inne zachowanie.
  - Wymaganie: loguj sciezki i pozwol wymusic konkretne binarki w configu.

## Dodatkowe wnioski (batch 161-165)

- [PIT-0810] Blad: skrypty uzywaly `grep -P`/`sed -r`, ktore nie dzialaja na busybox/bsd.
  - Wymaganie: unikaj nieportowalnych opcji lub wykrywaj wariant i stosuj alternatywy.
- [PIT-0811] Blad: `readlink -f` nie dzialal na macOS, co psulo realpath.
  - Wymaganie: uzywaj portable `realpath` (python/node) albo wykrywaj platforme.
- [PIT-0812] Blad: uzycie nieportable `date -d`/`stat -c`/`stat -f` psulo skrypty na macOS/BSD (inne flagi/formaty).
  - Wymaganie: do dat/rozmiarow uzywaj portablego helpera (python/node) lub wykrywaj OS i wybieraj odpowiednie flagi; brak zgodnosci = fail‑fast z instrukcja.
- [PIT-0813] Blad: brak `sha256sum` powodowal awarie w weryfikacji checksum.
  - Wymaganie: sprawdz dostepnosc hashera i zapewnij fallback (`shasum -a 256`/`openssl dgst`).
- [PIT-0814] Blad: skrypty zakladaly GNU tar, a na busybox brakowalo flag.
  - Wymaganie: wykrywaj `tar --version` i fail‑fast z instrukcja, gdy brakuje wymaganych opcji.
- [PIT-0815] Blad: `sort -z` nie bylo dostepne, przez co pipeline z `-print0` sie psul.
  - Wymaganie: unikaj `sort -z` lub sprawdzaj wsparcie i przechodz na alternatywę.

## Dodatkowe wnioski (batch 166-170)

- [PIT-0816] Blad: `localhost` rozwiązywal sie do IPv6, a serwis nasluchiwal tylko na IPv4 (lub odwrotnie).
  - Wymaganie: uzywaj jawnego hosta (`127.0.0.1`/`::1`) albo wymuszaj dual‑stack.
- [PIT-0817] Blad: losowanie portu przed startem serwera dawalo race i `EADDRINUSE`.
  - Wymaganie: binduj na porcie `0` i odczytuj faktycznie przydzielony port.
- [PIT-0818] Blad: testy/diagnostyka nie logowaly docelowego host/port, utrudniajac debug.
  - Wymaganie: zawsze loguj `host:port` po starcie serwera.
- [PIT-0819] Blad: domyslnie bindowano na `0.0.0.0`, co wystawialo serwis publicznie w dev/test.
  - Wymaganie: domyslny bind to `127.0.0.1`, a publiczny bind tylko jawnie.
- [PIT-0820] Blad: przy `EADDRINUSE` brakowalo czytelnej sugestii kolejnego kroku.
  - Wymaganie: przy kolizji portu wypisz PID/komende i zasugeruj inny port.

## Dodatkowe wnioski (batch 171-175)

- [PIT-0821] Blad: unit systemd restartowal w petli bez backoff, zalewajac logi i CPU.
  - Wymaganie: ustaw `RestartSec` i `StartLimit*` (backoff, limit restartow).
- [PIT-0822] Blad: `TimeoutStopSec` byl zbyt niski lub domyslny, przez co proces byl ubijany bez sprzatania.
  - Wymaganie: ustaw odpowiedni `TimeoutStopSec` i opcjonalny `ExecStop`.
- [PIT-0823] Blad: `KillMode` pozwalal pozostac procesom potomnym po `stop`.
  - Wymaganie: ustaw `KillMode=control-group` (lub `mixed`) aby zabijac cala grupę.
- [PIT-0824] Blad: brak `LimitNOFILE` powodowal losowe bledy przy wiekszej liczbie polaczen.
  - Wymaganie: ustaw `LimitNOFILE` do bezpiecznej wartosci.
- [PIT-0825] Blad: `EnvironmentFile` w unit byl względny i nie byl znajdowany.
  - Wymaganie: uzywaj absolutnych sciezek w `EnvironmentFile`.

## Dodatkowe wnioski (batch 176-180)

- [PIT-0826] Blad: brak cudzyslowu wokol zmiennych w bash powodowal word‑splitting i globbing.
  - Wymaganie: zawsze cytuj zmienne (`\"$var\"`) i ustaw `IFS=$'\\n\\t'` w skryptach.
- [PIT-0827] Blad: `flock` bez timeoutu wisial, blokujac operacje na locku.
  - Wymaganie: uzywaj `flock -w <sec>` i dawaj czytelny blad po timeout.
- [PIT-0828] Blad: `echo -e` zachowywal sie inaczej miedzy shellami i psul output.
  - Wymaganie: uzywaj `printf` zamiast `echo -e`.
- [PIT-0829] Blad: `trap` na cleanup byl ustawiany za pozno, więc bledy wczesne zostawialy smieci.
  - Wymaganie: `trap` ustawiaj na poczatku skryptu.

- [PIT-0830] Blad: `trap 'cleanup' EXIT` nadpisywal kod wyjscia skryptu (cleanup konczyl sie sukcesem), przez co realny fail znikał.
  - Wymaganie: w `trap` zachowaj `status=$?`, wylacz `set -e/-u` na czas sprzatania i zakoncz `exit $status`.
  - Wymaganie: cleanup nie moze zmieniac exit code (chyba ze jawnie nadpisujesz go w celach testowych).
- [PIT-0831] Blad: petle `while read` gubily ostatnia linie bez `\\n`.
  - Wymaganie: uzywaj `while IFS= read -r line || [ -n \"$line\" ]; do ...`.
- [PIT-0832] Blad: `cmd | while read` uruchamial petle w subshellu, a zmiany zmiennych po petli ginely.
  - Wymaganie: uzywaj process substitution (`while ...; do ...; done < <(cmd)`) albo zapisuj wyniki do pliku tymczasowego.

## Dodatkowe wnioski (batch 181-185)

- [PIT-0833] Blad: skrypt uzywal bash‑owych funkcji pod `/bin/sh`, co psulo wykonanie.
  - Wymaganie: ustaw poprawny shebang (`#!/usr/bin/env bash`) lub pisz czysty POSIX sh.
- [PIT-0834] Blad: uzycie `$*` gubilo rozdzielenie argumentow.
  - Wymaganie: przekazuj parametry jako `"$@"`.
- [PIT-0835] Blad: tmp katalog byl tworzony recznie (`/tmp/foo`), co prowadzilo do kolizji i race.
  - Wymaganie: uzywaj `mktemp -d` z losowym sufiksem.
- [PIT-0836] Blad: uzycie `mktemp -u` (tylko nazwa) powodowalo TOCTOU i ryzyko przechwycenia pliku przez inny proces.
  - Wymaganie: nie uzywaj `mktemp -u`; zawsze tworz plik/katalog atomowo przez `mktemp`.
- [PIT-0837] Blad: `pushd/popd` w /bin/sh nie dzialalo i psulo skrypty.
  - Wymaganie: w sh uzywaj `cd` + `pwd` lub wymagaj bash.
- [PIT-0838] Blad: `echo` interpretowal `-n`/`-e` w danych i psul output.
  - Wymaganie: do danych uzywaj `printf '%s\n'`.

## Dodatkowe wnioski (batch 186-190)

- [PIT-0839] Blad: brak `UMask` w unit powodowal zbyt szerokie perms dla plikow tworzonych przez serwis.
  - Wymaganie: ustaw `UMask=` w unit zgodnie z polityka uprawnien.
- [PIT-0840] Blad: katalogi runtime/state byly tworzone recznie z blednymi perms.
  - Wymaganie: uzywaj `RuntimeDirectory`/`StateDirectory` w systemd zamiast recznego mkdir.
- [PIT-0841] Blad: `--dry-run` wykonywal czesciowe zmiany (tmp/pliki), co mylilo uzytkownika.
  - Wymaganie: `--dry-run` nie ma efektow ubocznych; loguje planowane akcje.
- [PIT-0842] Blad: `--json` output nie mial wersji schematu, co psulo automatyzacje po zmianach.
  - Wymaganie: dodaj `schemaVersion` i utrzymuj kompatybilnosc wsteczna.
- [PIT-0843] Blad: CLI zwracal exit code 0 przy ostrzezeniach, bez informacji w JSON.
  - Wymaganie: dla ostrzezen dodaj pole `warnings[]` i jawnie je wypisz.

## Dodatkowe wnioski (batch 191-195)

- [PIT-0844] Blad: `flock` na NFS nie dzialal, wiec lock nie chronil przed rownoleglym uruchomieniem.
  - Wymaganie: wykryj NFS/nieobsługiwany FS i uzyj lock‑dir/atomic mkdir lub fail‑fast.
- [PIT-0845] Blad: pliki byly nadpisywane mimo oczekiwania "create‑only".
  - Wymaganie: uzywaj `O_EXCL`/`flag: 'wx'` gdy overwrite nie jest dozwolony.
- [PIT-0846] Blad: wartosci z ENV zawieraly znaki nowej linii, co psulo logi i komendy.
  - Wymaganie: sanitizuj/stripuj kontrolne znaki z inputu ENV.
- [PIT-0847] Blad: ścieżki relatywne byly rozstrzygane po zmianie `cwd`, co prowadzilo do bledow.
  - Wymaganie: resolve do absolutnych sciezek na starcie i używaj tylko ich.
- [PIT-0848] Blad: lockfile nie zawieral hosta, przez co w środowiskach współdzielonych mylono procesy.
  - Wymaganie: zapisuj w locku `hostname`/`pid`/`startTime` i weryfikuj zgodnosc.

## Dodatkowe wnioski (batch 196-200)

- [PIT-0849] Blad: `systemctl`/`journalctl` uruchamialy pager i wisialy w trybie nieinteraktywnym.
  - Wymaganie: uzywaj `--no-pager` lub `SYSTEMD_PAGER=cat`.
- [PIT-0850] Blad: `sudo` wymagalo TTY (`requiretty`) i komendy failowaly bez czytelnej informacji.
  - Wymaganie: wykrywaj ten blad i podawaj instrukcje (sudoers/ssh -t).
- [PIT-0851] Blad: `rsync` zostawial `.*.partial` po przerwanym transferze.
  - Wymaganie: uzywaj `--partial-dir` w temp i sprzataj przy failu.
- [PIT-0852] Blad: `scp` w nowych OpenSSH domyslnie uzywa SFTP i nie dziala z niektorymi serwerami.
  - Wymaganie: pozwol wymusic `scp -O` lub preferuj `rsync`/`sftp`.
- [PIT-0853] Blad: logi z narzedzi mialy ANSI/pager i psuly parse.
  - Wymaganie: ustaw `NO_COLOR=1`/`--no-ansi`/`--no-pager` tam gdzie to mozliwe.

## Dodatkowe wnioski (batch 201-205)

- [PIT-0854] Blad: JSON/JSON5 z duplikatami kluczy nadpisywal wartosci bez ostrzezenia.
  - Wymaganie: wykrywaj duplikaty kluczy i fail‑fast lub loguj warning.
- [PIT-0855] Blad: config mial nieoczekiwanie duzy rozmiar (MB), co psulo parse i pamiec.
  - Wymaganie: ustaw max size dla configu i odrzuc zbyt duze pliki.
- [PIT-0856] Blad: config zawieral binarne dane/nie‑UTF8, co psulo parser i logi.
  - Wymaganie: wymusz UTF‑8 i odrzuc binarne pliki.
- [PIT-0857] Blad: brak jasnej kolejnosci precedence (CLI/ENV/file) dawalo niespodziewane wartosci.
  - Wymaganie: zdefiniuj i loguj precedence (np. CLI > ENV > file).
- [PIT-0858] Blad: parser evalowal wartosci z configu (np. `new Function`), co bylo ryzykowne.
  - Wymaganie: brak `eval`; tylko bezpieczny parser + walidacja.

## Dodatkowe wnioski (batch 206-210)

- [PIT-0859] Blad: zapis na stdout przy zamknietym pipe powodowal `EPIPE` i crash.
  - Wymaganie: obsluguj `EPIPE`/`SIGPIPE` i koncz proces cicho.
- [PIT-0860] Blad: masowe operacje FS otwieraly zbyt wiele plikow (`EMFILE`).
  - Wymaganie: limituj równoległość I/O (kolejka/semafor).
- [PIT-0861] Blad: deskryptory plikow nie byly domykane przy bledzie.
  - Wymaganie: zawsze `close()` w `finally` (takze przy error).
- [PIT-0862] Blad: `mkdir -p` przechodzil mimo `EEXIST`, gdy pod sciezka byl plik, co psulo logike.
  - Wymaganie: przy `EEXIST` sprawdz, czy to katalog; inaczej fail‑fast.
- [PIT-0863] Blad: `writeFile`/`appendFile` bez `fsync` powodowal utrate danych po crashu.
  - Wymaganie: dla krytycznych plikow uzywaj `fsync` po zapisie.

## Dodatkowe wnioski (batch 211-215)

- [PIT-0864] Blad: testy sprawdzaly narzedzia przez `bash -lc command -v`, co failowalo na minimalnych obrazach bez bash.
  - Wymaganie: wykrywaj narzedzia przez PATH (bez bash) lub uzyj POSIX `/bin/sh` z jasnym SKIP.
- [PIT-0865] Blad: env override przyjmowal tylko wąski zestaw wartosci i ignorowal `true/false/1/0`.
  - Wymaganie: parsuj boolean‑like stringi (`true/false/1/0/yes/no/on/off`).
- [PIT-0866] Blad: detekcja komendy sprawdzala tylko istnienie pliku, bez `X_OK`, co dawalo false‑positive.
  - Wymaganie: sprawdz `X_OK`/wykonywalnosc przy detekcji narzedzi.
- [PIT-0867] Blad: niepoprawne wartosci w ENV byly ignorowane bez ostrzezenia.
  - Wymaganie: loguj ostrzezenie i pokazuj przyjeta wartosc domyslna.
- [PIT-0868] Blad: helpery E2E duplikowaly logike wykrywania narzedzi, co prowadzilo do niespojnosci.
  - Wymaganie: uzywaj wspolnego helpera do detekcji narzedzi.

## Dodatkowe wnioski (batch 216-220)

- [PIT-0869] Blad: szablon/init wlaczal opcjonalne narzedzia (np. obfuscator) bez pewnosci instalacji, co psulo pierwszy build.
  - Wymaganie: template nie wlacza opcjonalnych narzedzi domyslnie; wymagany jest jawny opt‑in.
- [PIT-0870] Blad: brak rozroznienia miedzy „feature enabled” a „tool dostępny” powodowal niejasne awarie.
  - Wymaganie: przed buildem sprawdz dostepnosc narzedzia i dawaj jasny blad z instrukcja.
- [PIT-0871] Blad: domyslna konfiguracja byla „production‑strict” i zbyt wymagajaca dla dev.
  - Wymaganie: domyslny profil jest bezpieczny dla dev; tryby stricte‑secure wymagaja jawnego wyboru.
- [PIT-0872] Blad: brak informacji o skutkach wlaczenia zabezpieczen (np. potrzeba toolchain).
  - Wymaganie: dokumentuj koszt/warunki wlaczenia kazdego zabezpieczenia (toolchain, OS).
- [PIT-0873] Blad: brak testu „minimalnego” profilu utrudnial diagnoze regresji.
  - Wymaganie: testy E2E obejmuja profil minimalny + profil maksymalny.

## Dodatkowe wnioski (batch 221-225)

- [PIT-0874] Blad: `systemctl --user` failowal w non-interactive/SSH bez `XDG_RUNTIME_DIR`/`DBUS_SESSION_BUS_ADDRESS`, co dawalo niejasne bledy.
  - Wymaganie: przy `--user` waliduj wymagane ENV i podawaj instrukcje (np. `loginctl enable-linger`), albo wymus `serviceScope=system`.
- [PIT-0875] Blad: skrypty zakladaly binarke `node`, a na niektorych systemach jest tylko `nodejs`, co dawalo `command not found`.
  - Wymaganie: wykrywaj `node` lub `nodejs`, loguj wybrana binarke i podawaj instrukcje instalacji.
- [PIT-0876] Blad: bind-mounty w Docker na hostach z SELinux dawaly `permission denied` mimo poprawnych praw.
  - Wymaganie: dla SELinux uzywaj `:z`/`:Z` (volume) albo `--security-opt label=disable` i loguj `getenforce`.
- [PIT-0877] Blad: `docker compose exec` bez `-T` w CI wieszal sie lub generowal zaklocone outputy (TTY).
  - Wymaganie: w non-interactive zawsze dodawaj `-T` i loguj tryb TTY.
- [PIT-0878] Blad: procesy ubijane przez OOM/SIGTERM (exit 137/143) byly raportowane jako ogolny FAIL bez diagnozy.
  - Wymaganie: mapuj exit code 137/143 na OOM/SIGKILL/SIGTERM i loguj hint (limit pamieci, rownoleglosc).

## Dodatkowe wnioski (batch 226-230)

- [PIT-0879] Blad: globalne `git config` (`core.autocrlf`/`core.filemode`) zmienialy CRLF lub gubily bit +x, co psulo skrypty i testy.
  - Wymaganie: wymusz LF i exec bity przez `.gitattributes`/preflight oraz dokumentuj zalecane ustawienia `git config`.
- [PIT-0880] Blad: Dockerfile kopiowal cale repo przed `npm ci`, przez co kazda zmiana uniewazniala cache i instalowala zaleznosci od nowa.
  - Wymaganie: kopiuj najpierw `package*.json`, uruchamiaj `npm ci`, a dopiero potem `COPY .`; opcjonalnie uzywaj BuildKit cache dla npm.
- [PIT-0881] Blad: docker-compose zostawial wolumeny po testach, co z czasem zapychalo dysk i wprowadzalo flakey stany.
  - Wymaganie: cleanup obejmuje `docker compose down -v` lub usuwanie wolumenow per-run; loguj nazwy wolumenow.
- [PIT-0882] Blad: `docker compose down` bez `--remove-orphans` zostawial osierocone kontenery z poprzednich uruchomien.
  - Wymaganie: cleanup E2E uzywa `docker compose down --remove-orphans` (lub jawnie sprzata orphans) i loguje co zostalo usuniete.
- [PIT-0883] Blad: unit systemd zostawal w stanie `failed` i kolejne starty byly blokowane mimo naprawy.
  - Wymaganie: po naprawie/deploy wykonuj `systemctl reset-failed <svc>` (lub `--user`) i loguj wynik.

- [PIT-0884] Blad: `systemctl` bez `reset-failed` zostawial jednostki w `failed`, przez co kolejne `start` konczyly sie od razu mimo poprawnych plikow.
  - Wymaganie: jesli wykryjesz `failed`, wykonaj `systemctl reset-failed` przed restartem; loguj status przed/po.

- [PIT-0885] Blad: Docker build wlaczal do obrazu pliki z sekretami (`.npmrc`, `.env`, klucze SSH), a pozostawione warstwy ujawnialy je w historii.
  - Wymaganie: `.dockerignore` musi wykluczac pliki sekretow; build uzywa BuildKit secrets/SSH mounts zamiast `COPY` sekretow; po buildzie sprzataj tymczasowe kredencjale.

- [PIT-0886] Blad: obrazy Node bez full-ICU dawaly inne wyniki `Intl` (daty/liczby), co psulo testy/UI.
  - Wymaganie: uzywaj obrazu z full-ICU lub ustaw `NODE_ICU_DATA` i jawny locale w testach.

## Dodatkowe wnioski (batch 231-235)

- [PIT-0887] Blad: preflight sprawdzal inny binarny plik niz uzywany w runtime (np. Playwright uruchamia `chrome-headless-shell`, a check weryfikowal `chromium`), przez co brakujace biblioteki wychodzily dopiero w trakcie testu.
  - Wymaganie: detekcja zaleznosci sprawdza **dokladny** binarny plik uzywany w runtime (sciezka z narzedzia/ENV), a brak libs = reinstall lub SKIP z jasnym logiem.
- [PIT-0888] Blad: logi E2E w trybie rownoleglym trafialy do katalogow tmp sprzatanych po runie, przez co brakowalo artefaktow diagnostycznych.
  - Wymaganie: log dir E2E jest w stalym cache (poza tmp rootem), per‑grupa/test ma osobny podkatalog, a sciezka jest logowana.
- [PIT-0889] Blad: Docker E2E probowal uruchamiac testy wymagajace pelnego hosta (systemd/kernel) bez jawnego opt‑in, co dawalo FAIL/flake.
  - Wymaganie: domyslnie w Docker E2E dziala tryb host‑limited (skip host‑only), a testy wymagajace pelnego hosta sa oznaczone w manifeście i uruchamiane tylko po explicit opt‑in (np. `SEAL_DOCKER_E2E_HOST=1`).

## Dodatkowe wnioski (batch 236-240)

- [PIT-0890] Blad: marker wersji runtime byl zapisywany jako plaintext na target, co lamalo STD-012 i ujawnialo wersje wprost.
  - Wymaganie: marker runtime jest binarny/obfuskowany (np. `sha256(process.version)`) i traktowany jako opaque bytes.
- [PIT-0891] Blad: odczyt binarnych metadanych przez `cat` na SSH byl kruchy (newline/encoding), co dawalo falszywe mismatch.
  - Wymaganie: binarne markery czytaj przez base64 i dekoduj lokalnie; nie zakladaj UTF‑8.
- [PIT-0892] Blad: porownania markerow zakladaly jeden format i nie byly kompatybilne z migracjami (legacy plaintext -> hash).
  - Wymaganie: normalizuj markery do jednego formatu (np. hash) i wspieraj legacy formaty w okresie przejsciowym.
- [PIT-0893] Blad: E2E asercje sprawdzaly plaintext `process.version`, co wprowadzalo regresje po obfuskacji metadanych.
  - Wymaganie: testy porownuja znormalizowany marker (hash) i obejmuja scenariusz migracji formatu markera.
- [PIT-0894] Blad: metadane binarne byly parsowane jako text w kodzie pomocniczym, co dawalo `trim()` na danych binarnych.
  - Wymaganie: funkcje helper nie konwertuja na text bez potrzeby; binarne pliki sa obslugiwane jako `Buffer`.

## Dodatkowe wnioski (batch 241-245)

- [PIT-0895] Blad: wielolinijkowe komendy E2E (dziesiatki `SEAL_E2E_*`) byly kopiowane z losowymi backslashami/typo (`\\E=...`, `\\0`), co zlepialo linie z nazwa skryptu i dawalo `MODULE_NOT_FOUND` lub uruchamialo zly zestaw testow.
  - Wymaganie: preferuj **pliki ENV** (`SEAL_E2E_CONFIG`) lub wrappery (np. `e2e.sh`) zamiast ręcznego paste; waliduj `SEAL_E2E_*` i fail‑fast przy nieznanych/niepoprawnych kluczach.
  - Wymaganie: loguj efektywny config i ostrzegaj o „pustych” zmiennych wynikajacych z blednej kontynuacji linii (trailing spacje po `\\`).
- [PIT-0896] Blad: lock katalogowy (mkdir) w E2E pozostawal po crashu, co blokowalo kolejne uruchomienia i powodowalo “wiszenie” bez logu.
  - Wymaganie: lock dir ma timeout oraz detekcje stale lock (mtime/TTL) z czytelnym logiem i instrukcja recovery.
  - Wymaganie: lock zawiera `owner.json` + heartbeat, a stale‑lock weryfikuje PID/startTime, żeby nie usuwać aktywnych locków przy długich buildach.
- [PIT-0897] Blad: uruchamianie skryptow E2E z podfolderu powodowalo zly `cwd` i sciezki względne wskazywaly na nieistniejace pliki (np. `.../example/tools/...`).
  - Wymaganie: skrypty maja auto‑detekcje repo root (`git rev-parse --show-toplevel` lub `realpath`) i uzywaja sciezek absolutnych; w logach wypisuja `repo_root`.

## Dodatkowe wnioski (batch 246-250)

- [PIT-0898] Blad: cleanup `rm -rf "$VAR"` byl wykonywany przy pustym lub blednym `$VAR`, co grozilo skasowaniem niepoprawnej sciezki.
  - Wymaganie: przed `rm -rf` zawsze waliduj, ze sciezka jest absolutna, nie jest `/` ani `.` i nie jest pusta; stosuj helper `safe_rm`.
  - Wymaganie: `find ... -delete` uzywa `-mindepth 1` i sprawdza root katalogu, aby nie usunac katalogu glownego.
- [PIT-0899] Blad: parallel E2E uruchamialo zbyt wiele jobow (np. `SEAL_E2E_JOBS=32`) bez uwzglednienia CPU/RAM/cgroup, co powodowalo timeouts i `ENOSPC`.
  - Wymaganie: domyslny poziom rownoleglosci jest ograniczony do `min(nproc, limit_cgroup)` oraz loguje ostrzezenie, gdy jobs > CPU lub RAM < limit.
  - Wymaganie: skrypty E2E maja jawny limit zasobow (np. `SEAL_E2E_MAX_RAM_MB`) i fail‑fast/skalowanie timeoutow przy niskich zasobach.
- [PIT-0900] Blad: agresywne cleanupy Dockera (`docker system prune`, `builder prune`) niszczyly cudze obrazy/cache.
  - Wymaganie: cleanup jest ograniczony do zasobow z labela `seal-e2e` lub unikalnego `COMPOSE_PROJECT_NAME`; globalny prune tylko przy explicit opt‑in.

- [PIT-0901] Blad: marker runtime byl tylko „gołym” hashem bez wersji/algorytmu, co utrudnialo zmiane formatu i migracje w przyszlosci.
  - Wymaganie: marker ma format z magic/wersja/algId (jak codec), aby przyszle zmiany (np. sha512) byly jednoznaczne.
- [PIT-0902] Blad: marker runtime oparty tylko o `process.version` nie wykrywal rozjazdow ABI/build (np. custom build, OpenSSL/ICU), co pozwalalo na niekompatybilny reuse.
  - Wymaganie: marker uwzglednia ABI/arch/platform (np. `process.versions.modules`, `process.versions.openssl`, `process.arch`, `process.platform`) lub osobne pole kompatybilnosci.
- [PIT-0903] Blad: logi mismatchy wypisywaly pelne hashe markerow, co bylo nieczytelne i niepotrzebnie ujawnialo identyfikatory.
  - Wymaganie: loguj tylko fakt mismatchu + opcjonalnie krotki prefix hasha i/lub czytelna wersje lokalna; nie loguj pelnych markerow.
- [PIT-0904] Blad: odczyt markerow przez SSH zakladal istnienie `base64`, co na minimalnych hostach powodowalo ciche bledy.
  - Wymaganie: preflight sprawdza `base64` (lub fallback `python3`/`openssl`); brak = fail‑fast z instrukcja instalacji.

## Dodatkowe wnioski (batch 251-255)

- [PIT-0905] Blad: testy E2E startowaly przy prawie pelnym dysku i padaly dopiero w srodku runu (ENOSPC), co tracilo czas i zostawialo smieci.
  - Wymaganie: preflight sprawdza wolne miejsce dla cache/log/tmp (np. `df -Pm`) i fail‑fast z instrukcja cleanup/limitu, zanim zacznie sie build.
- [PIT-0906] Blad: Dockerfile nie byl uporzadkowany pod cache (ciężkie kompilacje lub instalatory w poznych warstwach), przez co drobne zmiany wymuszaly pełny rebuild.
  - Wymaganie: najcięższe, najrzadziej zmieniane kroki (kompilacje zrodel, toolchain) musza byc wczesniej; kroki często zmieniane (skrypty/testy) na koncu.
  - Wymaganie: warstwy instalujace zaleznosci kluczuj po lockfile/wersjach narzedzi (hash pliku), aby cache byl stabilny.
- [PIT-0907] Blad: tryb bez instalacji zaleznosci (`SEAL_E2E_INSTALL_DEPS=0`) uruchamial testy bez weryfikacji prerekwizytow, co dawalo nieczytelne `command not found`.
  - Wymaganie: gdy instalacja jest wylaczona, runner robi preflight `command -v` dla wymaganych narzedzi i daje jasny blad z instrukcja, jaka flaga wlaczyc.

- [PIT-0908] Blad: payload-only zakladal obecność launchera/runtime i kopiowal tylko payload; przy usunietym `b/a` lub `r/rt` powstawal niespojny stan.
  - Wymaganie: payload-only weryfikuje obecność launchera i runtime; brak = full upload z logiem powodu.
- [PIT-0909] Blad: payload-only reuse nie sprawdzal `r/n` (native bootstrap), co prowadzilo do crashy przy starcie.
  - Wymaganie: gdy release wymaga native bootstrap, sprawdz `r/n` na target; brak = fallback do pelnego uploadu.
- [PIT-0910] Blad: bootstrap nie walidowal typu `installDir` (plik/symlink), co dawalo niejasne bledy przy `mkdir/chown`.
  - Wymaganie: preflight sprawdza, ze `installDir` jest katalogiem (bez symlink); inaczej fail‑fast z instrukcja.
- [PIT-0911] Blad: bootstrap po `sudo mkdir` nie weryfikowal owner/perms, przez co zostawal root‑owned installDir i kolejne deploye padaly.
  - Wymaganie: po bootstrapie waliduj owner/perms kluczowych katalogow i w razie bledu daj instrukcje naprawy (lub retry `chown`).

## Dodatkowe wnioski (batch 256-260)

- [PIT-0912] Blad: logi/summary E2E trafialy do stalych sciezek, przez co rownolegle uruchomienia nadpisywaly sie i gubily artefakty diagnostyczne.
  - Wymaganie: domyslny layout uzywa `run/`, a tryb `concurrent` ma unikalny `RUN_ID`;
    logi/summary sa per‑run i skrypt loguje te sciezki na starcie.
- [PIT-0913] Blad: keep‑alive `sudo -v` uruchomiony w tle nie byl sprzatany, zostawiajac procesy po zakonczeniu testow.
  - Wymaganie: background keep‑alive jest zawsze ubijany w `trap` (z zachowaniem exit code), a jego PID jest logowany.

- [PIT-0914] Blad: deploy z `--push-config=false` pomijal konfiguracje nawet gdy `shared/config.json5` nie istnial, co konczylo sie startem bez configu lub crash.
  - Wymaganie: brak configu na target = seed config niezaleznie od `--push-config` i loguj "config missing -> seeded" (albo fail‑fast z instrukcja w trybie strict).
- [PIT-0915] Blad: deploy zaczynal operacje zdalne zanim zweryfikowal lokalny config (brak pliku / brak uprawnien / bledny JSON5), przez co zostawial polowiczny release.
  - Wymaganie: waliduj, ze config istnieje i jest poprawnym JSON5 przed jakimikolwiek zmianami na target; blad = fail‑fast bez efektow ubocznych.
- [PIT-0916] Blad: aktualizacja configu byla wykonywana zawsze, nawet gdy zawartosc identyczna, co prowadzilo do zbednych restartow i rotacji.
  - Wymaganie: porownuj kanoniczny hash configu i pomijaj update, jesli brak zmian; loguj "config unchanged".
- [PIT-0917] Blad: logi nie rozroznialy "config updated" vs "config preserved", przez co uzytkownik nie wiedzial, czy override poszedl.
  - Wymaganie: loguj jawnie stan: `config seeded` / `config updated` / `config preserved` wraz z powodem (pushConfig/drift/missing).

## Dodatkowe wnioski (batch 261-265)

- [PIT-0918] Blad: SSH uruchomione z ControlMaster/ControlPath (dziedziczone z `~/.ssh/config`) zostawialo stale sockety i wplywalo na kolejne runy (permission denied / reuse z innym userem).
  - Wymaganie: skrypty ustawiają jawnie `-o ControlMaster=no -o ControlPath=none` lub dedykowany, krótki `ControlPath` w cache; loguj effective SSH options.
- [PIT-0919] Blad: zbyt dlugi `ControlPath` (głęboka ścieżka w repo) powodowal `too long for Unix domain socket`, co przerywalo SSH/rsync.
  - Wymaganie: jeśli używasz multiplexingu, generuj krótki ControlPath (np. hash), albo wyłącz multiplexing dla automatyzacji.
- [PIT-0920] Blad: rozpakowanie archiwum `tar` bez walidacji sciezek pozwalalo na path traversal (`../` lub absolutne sciezki).
  - Wymaganie: przed `tar -xf` wykonaj `tar -tf` i odrzuć wpisy z `..`/`/`; po ekstrakcji weryfikuj, że wszystkie pliki są pod katalogiem docelowym.

## Dodatkowe wnioski (batch 266-270)

- [PIT-0921] Blad: SSH odmawial uzycia klucza, bo uprawnienia `~/.ssh`/`id_*` byly zbyt szerokie (np. 755/644), co konczylo sie promptem lub `Permission denied (publickey)`.
  - Wymaganie: przed uzyciem kluczy ustaw `chmod 700 ~/.ssh` oraz `chmod 600 ~/.ssh/id_*` i loguj, jesli perms sa zbyt otwarte.
- [PIT-0922] Blad: klucze SSH w repo miały CRLF/BOM i ssh zwracał „invalid format”.
  - Wymaganie: normalizuj newline do LF (`dos2unix`) i sprawdzaj `ssh-keygen -y -f key` w preflight; brak = fail‑fast z instrukcją.

## Dodatkowe wnioski (batch 271-275)

- [PIT-0923] Blad: `systemctl is-active`/`is-enabled` zwracaly nie‑zero dla stanów prawidłowych (np. `inactive`), a skrypty traktowały to jako błąd.
  - Wymaganie: interpretuj exit code `systemctl` zgodnie z dokumentacją; statusy `inactive`/`disabled` nie są błędem przy odczycie stanu.
- [PIT-0924] Blad: ekstrakcja `tar` pozwalała na symlinki/hardlinki prowadzące poza katalog docelowy (po ekstrakcji można było odczytać/napisać pliki spoza root).
  - Wymaganie: przed ekstrakcją odrzuć wpisy będące symlink/hardlink poza root lub ustaw `--no-same-owner` + weryfikuj po ekstrakcji realpath każdego pliku.
- [PIT-0925] Blad: po uploadzie plików uruchomieniowych na host docelowy brakowało `+x` (umask/rsync/scp zrzucały uprawnienia), co powodowało „Permission denied”.
  - Wymaganie: po rozpakowaniu/uploadzie jawnie ustaw `chmod +x` dla runnerów/skryptów oraz weryfikuj permsy (fail‑fast).

## Dodatkowe wnioski (batch 276-280)

- [PIT-0926] Blad: `/tmp` bez sticky bit (brak `1777`) lub zbyt restrykcyjne perms powodowal losowe błędy `mktemp` i ryzyko ataków między userami.
  - Wymaganie: preflight sprawdza perms `/tmp` (powinno być `drwxrwxrwt`); w razie braku użyj prywatnego `SEAL_TMPDIR` lub fail‑fast z instrukcją.
- [PIT-0927] Blad: cache/stempel zależał tylko od `mtime` (lub rozmiaru), co przy clock‑skew lub ręcznych zmianach dawało fałszywe “cache hit”.
  - Wymaganie: stempel cache opiera się o hash zawartości i kluczowe wersje (toolchain/flags), nie tylko o `mtime`.
- [PIT-0928] Blad: `rsync` kończył się kodem 24 (`some files vanished`) i był traktowany jak twardy błąd mimo, że dotyczył plików tymczasowych.
  - Wymaganie: obsłuż kod 24 jako ostrzeżenie (gdy wyraźnie dopuszczone), loguj listę plików i w trybie strict fail‑fast.
- [PIT-0929] Blad: `tar` zwracał exit code 1 dla ostrzeżeń (np. `file changed as we read it`) i skrypt traktował to jak pełen FAIL lub ignorował całkowicie.
  - Wymaganie: rozróżniaj warning vs fatal dla `tar` (parsing stderr) i podejmuj decyzję wg trybu (strict vs warn); zawsze loguj kontekst.

## Dodatkowe wnioski (batch 281-285)

- [PIT-0930] Blad: `rsync`/`scp`/`ssh` dziedziczyly `RSYNC_RSH`/`GIT_SSH_COMMAND`/`SSH_CONFIG` z srodowiska, co nadpisywalo nasze opcje (ProxyCommand/ControlPath) i psulo deterministycznosc.
  - Wymaganie: ustawiaj jawnie `RSYNC_RSH`/`GIT_SSH_COMMAND` albo używaj `ssh -F /dev/null` i loguj effective SSH args.
- [PIT-0931] Blad: bardzo długa lista `SEAL_E2E_*` w komendzie przekraczała `ARG_MAX`/limity shella, co kończyło się urwanymi ENV i dziwnymi błędami.
  - Wymaganie: dla wielu zmiennych używaj pliku env (`SEAL_E2E_CONFIG`/`--env-file`) zamiast ogromnej linii poleceń.
- [PIT-0932] Blad: E2E uruchomione w sandboxie (np. Codex) padaly na `spawnSync`/`exec` z `EPERM`, a runner nie wykrywal przyczyny i uruchamial tylko czesc krokow.
  - Wymaganie: preflight/entrypoint wykrywa `EPERM` dla procesu potomnego i natychmiast wymusza eskalacje lub fail‑fast z instrukcja (bez polowicznego runu).
- [PIT-0933] Blad: eskalacja byla wykonywana dopiero po utworzeniu cache/log/tmp, co prowadzilo do mieszania ownerow i pozniejszych `EACCES`/root‑owned artefaktow.
  - Wymaganie: eskaluj **przed** tworzeniem cache/log/tmp; po eskalacji loguj effective user i sciezki artefaktow.

## Dodatkowe wnioski (batch 286-290)

- [PIT-0934] Blad: SSH próbował dziesiątek kluczy z agenta, kończąc na `Too many authentication failures` lub wiszeniu na password‑prompt.
  - Wymaganie: używaj `-o IdentitiesOnly=yes -o PreferredAuthentications=publickey -o PubkeyAuthentication=yes` i jawnego `-i <key>`; w testach wyłącz `SSH_AUTH_SOCK`, jeśli niepotrzebny.
- [PIT-0935] Blad: `SEAL_E2E_INSTALL_EXAMPLE_DEPS=0` przy pustym `node_modules` w example powodowal błędy bundlera (brak `express/json5`), zamiast jasnej instrukcji.
  - Wymaganie: gdy instalacja deps example jest wyłączona, runner weryfikuje `node_modules`/shared cache i fail‑fast z instrukcją (`SEAL_E2E_PREPARE_SEED=1` lub `SEAL_E2E_INSTALL_EXAMPLE_DEPS=1`).

## Dodatkowe wnioski (batch 291-295)

- [PIT-0936] Blad: non‑interactive shell (CI/cron/ssh) nie ładował `nvm/asdf`, przez co `node` nie był w PATH lub był w złej wersji.
  - Wymaganie: używaj absolutnej ścieżki do `node` albo waliduj `node -v`/`which node` na starcie i dawaj jasną instrukcję instalacji.
- [PIT-0937] Blad: `scp/rsync` z IPv6 nie działał, bo adres bez nawiasów był interpretowany jak `host:port`/`path`.
  - Wymaganie: dla IPv6 zawsze używaj nawiasów (`[addr]`) i/lub `-6`, a parser targetu musi to wspierać.

## Dodatkowe wnioski (batch 296-300)

- [PIT-0938] Blad: w systemd unit pliki z `%` w sciezkach/argumentach powodowaly błędy, bo `%` to escape w unitach (np. `%i`), a nie literal.
  - Wymaganie: w unitach zawsze escapuj `%` jako `%%`, albo waliduj i fail‑fast gdy `serviceName`/ścieżki zawierają `%`.
- [PIT-0939] Blad: `ExecStart` w systemd byl generowany z oczekiwaniem, że zadziałają bash‑izmy (np. `|`, `&&`, `$VAR`), ale systemd nie używa shella.
  - Wymaganie: jeśli potrzebny jest shell, użyj jawnie `/bin/sh -c` z bezpiecznym quoting; w przeciwnym razie przekazuj args jako czyste tokeny.

## Dodatkowe wnioski (batch 301-305)

- [PIT-0940] Blad: `WorkingDirectory` w unicie wskazywał na nieistniejący katalog lub był względny, co powodowało natychmiastowy FAIL startu.
  - Wymaganie: `WorkingDirectory` jest absolutne i katalog jest tworzony przed startem; brak = fail‑fast z instrukcją.
- [PIT-0941] Blad: `EnvironmentFile=` w unicie wskazywał na brakujący plik, przez co systemd odmawiał startu.
  - Wymaganie: używaj prefiksu `-` (`EnvironmentFile=-/path`) jeśli plik jest opcjonalny, albo preflight/instalator tworzy plik przed startem.
- [PIT-0942] Blad: domyślny `TimeoutStartSec` był zbyt krótki dla wolnych initów (obfuskacja/IO), więc systemd zabijał proces w trakcie startu.
  - Wymaganie: ustaw jawny `TimeoutStartSec` adekwatny do profilu (lub loguj ostrzeżenie i rekomendację).
- [PIT-0943] Blad: unit `Type` nie odpowiadał zachowaniu procesu (np. forking/daemonizing), co kończyło się fałszywym „start ok” lub restart loop.
  - Wymaganie: procesy uruchamiane przez Seala nie daemonizują się; ustaw `Type=simple`/`exec` i testuj rzeczywisty stan procesu.

## Dodatkowe wnioski (batch 306-310)

- [PIT-0944] Blad: `systemd` restartował usługę zbyt agresywnie (brak `StartLimit*`), powodując pętle restartów i zalewanie logów.
  - Wymaganie: ustaw `StartLimitIntervalSec` + `StartLimitBurst` oraz `RestartSec` dla backoff; loguj politykę restartu.
- [PIT-0945] Blad: unit miał `Restart=always` nawet dla `oneshot`, co prowadziło do niekończących się restartów po sukcesie.
  - Wymaganie: `Restart=` dobieraj do typu usługi (np. `on-failure` dla long‑running), a `oneshot` bez restartu.

- [PIT-0946] Blad: kopiowanie workspace `example` do `SEAL_E2E_EXAMPLE_ROOT` failowalo, gdy katalog nadrzedny nie istnial (np. cache pod `/root/.cache/...`), co przerywalo caly run.
  - Wymaganie: przed `cp -a` tworz katalog nadrzedny (`mkdir -p "$(dirname "$dst")"`), loguj efektowny `EXAMPLE_ROOT` i dodaj go do safe-roots, jesli siedzi w cache.
- [PIT-0947] Blad: runner rownolegly uruchamial child‑runnera bez przekazania sciezek cache (`SEAL_E2E_CACHE_DIR`/`SEAL_E2E_CACHE_BIN`), co powodowalo `set -u`/unbound albo rozjechane cache.
  - Wymaganie: wrappery przekazuja **pelny** zestaw zmiennych cache/safe‑roots; gdy dodajesz nowe ENV, aktualizuj wszystkie miejsca uruchomien.
- [PIT-0948] Blad: seed cache byl kluczowany przez `SUDO_USER/USER`, ktore w kontenerze bywa puste; skutkiem byly nieczytelne sciezki typu `.../unknown` i kolizje cache.
  - Wymaganie: wyznacz seed user stabilnie (`id -un` lub `id -u`) i pozwol na jawne override `SEAL_E2E_SEED_ROOT`; zawsze loguj efektywna sciezke.

## Dodatkowe wnioski (batch 311-315)

- [PIT-0949] Blad: włączone hardeningi systemd (`ProtectSystem=strict`, `ReadOnlyPaths`, `ReadWritePaths`) blokowały zapis do `installDir`/logów/cache, co dawało „Permission denied” mimo poprawnego deployu.
  - Wymaganie: jeśli używasz `ProtectSystem`, jawnie ustaw `ReadWritePaths` dla katalogów runtime (installDir, shared, logs) i testuj start usługi z tym profilem.
- [PIT-0950] Blad: `PrivateTmp=true` izolował `/tmp`, a procesy oczekiwały wspólnego `/tmp` (np. do IPC z innymi narzędziami), co powodowało nieoczekiwane błędy.
  - Wymaganie: `PrivateTmp` włączaj tylko gdy wiesz, że proces nie potrzebuje współdzielonego `/tmp`, albo ustaw jawny `SEAL_TMPDIR` w `RuntimeDirectory`.

- [PIT-0951] Blad: wrapper uruchamiajacy testy nie czyscil `BASH_ENV/ENV/CDPATH/GLOBIGNORE`, przez co **jeszcze przed** startem runnera wykonywaly sie obce hooki i pojawialy sie losowe bledy skladni.
  - Wymaganie: kazdy entrypoint/wrapper (nie tylko runner) czyści ryzykowne ENV albo używa `env -i` z allowlista, zanim uruchomi kolejne skrypty.
- [PIT-0952] Blad: `SEAL_E2E_SAFE_ROOTS` zawieral spacje lub trailing separator, a parser traktowal je jako osobne tokeny, przez co bezpieczny katalog byl odrzucany.
  - Wymaganie: safe‑roots podawaj jako sciezki bez spacji (lub jawnie escapowane) i bez trailing separatorow; loguj znormalizowana liste.
- [PIT-0953] Blad: `mktemp` failowal przez brak inode w `/tmp` przy bardzo rownoleglych runach (duzo malych katalogow/plikow), mimo ze wolne miejsce było OK.
  - Wymaganie: preflight sprawdza wolne inodes (np. `df -Pi`) dla temp/cache i sugeruje inny `SEAL_E2E_TMP_ROOT` przy niskich wartościach.

## Dodatkowe wnioski (batch 316-320)

- [PIT-0954] Blad: systemd `WorkingDirectory`/`RuntimeDirectory` nie byly tworzone lub miały zły owner, co powodowało fail startu i błędy zapisu.
  - Wymaganie: używaj `StateDirectory/RuntimeDirectory` lub twórz katalogi z poprawnym ownerem przed startem; waliduj perms.
- [PIT-0955] Blad: `journalctl -u` zwracał dane z pagera i blokował skrypty w trybie nieinteraktywnym.
  - Wymaganie: ustaw `SYSTEMD_PAGER=cat`/`--no-pager` dla `journalctl` i loguj, że pager jest wyłączony.

- [PIT-0956] Blad: entrypoint uruchamial `bash -lc`, co powodowalo wczytanie `~/.bash_profile`/`/etc/profile` i nieprzewidywalne modyfikacje PATH/ENV (albo `exit/return`), psujac automatyzacje.
  - Wymaganie: w automatyzacji uzywaj `bash -c`/`sh -c` z czystym ENV lub jawnie wyłącz profile; loguj użyty shell i aktywne profile.
- [PIT-0957] Blad: `set -e` w polaczeniu z `wait` na jobach w tle przerywal runnera po pierwszym failu, przez co nie zapisywano summary/logow.
  - Wymaganie: `wait` zawsze obsluguj jawnie (`if wait ...; then ... else ... fi`), agreguj statusy i wypisuj summary niezaleznie od pojedynczych porazek.
- [PIT-0958] Blad: `SEAL_E2E_EXAMPLE_ROOT`/`SEAL_E2E_SEED_ROOT` byly podawane jako sciezki relatywne, co przy `rm -rf` dzialalo w nieoczekiwanym katalogu.
  - Wymaganie: wymagaj sciezek absolutnych (lub normalizuj przez `realpath`) i loguj efektowny root przed uzyciem.

## Dodatkowe wnioski (batch 321-325)

- [PIT-0959] Blad: aktualizacja `summary/last.tsv` w trybie rownoleglym powodowala wyscigi (kilka procesow zapisuje “last” naraz), przez co “last” nie odpowiadal faktycznie ostatniemu runowi.
  - Wymaganie: `last.tsv` aktualizuje tylko proces nadrzedny albo zapis jest chroniony lockiem; loguj, kto i kiedy aktualizuje “last”.
- [PIT-0960] Blad: `SEAL_E2E_TESTS` z duplikatami lub pustymi tokenami powodowal powtórne uruchomienia testow albo mylacy “pusty filtr”.
  - Wymaganie: normalizuj listy testow (trim, usun puste, dedupe) i loguj finalny zestaw uruchamianych testow.
- [PIT-0961] Blad: tryb fail‑fast ubijal grupy, ale zostawial procesy potomne i nie drukowal summary.
  - Wymaganie: fail‑fast zabija cala grupe procesow (PGID) i **zawsze** wypisuje summary/cleanup w `trap`, nawet przy wczesnym wyjsciu.

## Dodatkowe wnioski (batch 326-330)

- [PIT-0962] Blad: logi E2E byly zapisywane do katalogu bez praw zapisu (np. read‑only volume), co powodowalo pozny fail lub brak artefaktow diagnostycznych.
  - Wymaganie: przed startem testow weryfikuj zapisywalnosc `SEAL_E2E_LOG_DIR` (lub domyslnego log root) i fail‑fast z instrukcja.
- [PIT-0963] Blad: `SEAL_E2E_SUMMARY_PATH` wskazywal na katalog albo plik bez uprawnien zapisu, przez co summary psulo sie dopiero na koncu.
  - Wymaganie: preflight sprawdza, ze parent `SEAL_E2E_SUMMARY_PATH` istnieje i jest zapisywalny, a docelowa sciezka jest plikiem lub nie istnieje.
- [PIT-0964] Blad: nazwy testow/grup rozniace sie tylko wielkoscia liter powodowaly kolizje katalogow logow na FS case‑insensitive (macOS/Windows).
  - Wymaganie: nazwy katalogow logow sa sanitizowane i wzbogacone o krótki hash, aby uniknac kolizji niezaleznie od FS.

## Dodatkowe wnioski (batch 331-335)

- [PIT-0965] Blad: `SEAL_E2E_ISOLATE_HOME=1` izolowal HOME, ale nie ustawial `XDG_RUNTIME_DIR`, przez co testy z `systemctl --user` failowaly mimo poprawnej konfiguracji.
  - Wymaganie: w trybie izolacji HOME ustawiaj `XDG_RUNTIME_DIR` (tymczasowy) albo jawnie skipuj testy user‑systemd z czytelnym powodem.
- [PIT-0966] Blad: `SEAL_E2E_HOME_KEEP=1` pozostawial katalogi HOME na stale, co z czasem zapychalo dysk lub zostawialo dane testowe.
  - Wymaganie: `HOME_KEEP` uzywaj tylko do debug; loguj sciezke i dodaj instrukcje cleanup/retention.
- [PIT-0967] Blad: izolowane HOME bylo wspoldzielone miedzy runami (brak per‑run sufiksu), przez co pliki z poprzednich uruchomien wplywaly na wyniki.
  - Wymaganie: izolowany HOME jest zawsze unikalny per‑run (np. suffix z `RUN_ID`) i sprzatany w `trap`, chyba ze `HOME_KEEP=1`.

## Dodatkowe wnioski (batch 336-340)

- [PIT-0968] Blad: porownywanie wersji (Node/OpenSSL/tools) stringowo (`"18" > "9"`) lub przez zwykly `sort` dawalo bledne decyzje (np. zly gate w preflight).
  - Wymaganie: do porownan uzywaj semver (lib) lub `sort -V` i loguj wartosci we/wy.
- [PIT-0969] Blad: zdalne one‑linery przez `ssh "cmd1; cmd2"` ignorowaly bledy pierwszych polecen (brak `set -e`/`pipefail`) i zwracaly exit code tylko ostatniego.
  - Wymaganie: kazda zdalna komenda inline zaczyna sie od `set -euo pipefail` (lub `bash -euo pipefail -c ...`) i propaguje exit code; loguj pelna komende.
- [PIT-0970] Blad: wartosci w `EnvironmentFile` zawieraly spacje lub `#`, przez co systemd obcinal je lub traktowal reszte jako komentarz.
  - Wymaganie: dla zlozonych wartosci uzywaj `Environment=` w unicie albo zapisuj `EnvironmentFile` z poprawnym quoting/escaping + test odczytu.

- [PIT-0971] Blad: duplikaty nazw testow w manifeście powodowaly nadpisanie metadanych (ostatnia linia wygrywa), co ukrywalo brakujace testy.
  - Wymaganie: wykrywaj duplikaty nazw testow w manifeście i fail‑fast z lista konfliktow.
- Zmiana: manifest E2E jest w `e2e-tests.json5` (JSON5).
- [PIT-0972] Blad: `TMPDIR`/`SEAL_E2E_TMP_ROOT` wskazywal na katalog wewnatrz per-run tmp, a testy uzywaly `os.tmpdir()`; inne grupy sprzataly tmp i pojawial sie `ENOENT` w trakcie builda.
  - Wymaganie: tmp dla E2E musi byc stabilny i poza run root (np. `/tmp`); cache typu `NODE_COMPILE_CACHE` nie moze zalezec od `TMPDIR`.
- [PIT-0973] Blad: shared `node_modules` bylo symlinkiem do siebie lub `npm install` dzialal na symlinku, co dawalo `ELOOP`/braki deps.
  - Wymaganie: instaluj do realnego katalogu, potem sync do shared cache i dopiero linkuj; wykrywaj i usuwaj self‑symlink przed uzyciem.
- [PIT-0974] Blad: uruchomienie E2E z `sudo` nastepowalo po utworzeniu cache/log/tmp przez usera, co mieszalo ownership i dawalo `EACCES`/niedeterministyczne cleanupy.
  - Wymaganie: eskaluj **przed** tworzeniem jakichkolwiek cache/log/tmp; loguj effective user oraz sciezki artefaktow.
- [PIT-0975] Blad: zbyt krotki timeout wrappera ubijal suite w trakcie, bez cleanup, zostawiajac gigabajty tmp/cache.
  - Wymaganie: timeouty dostosuj do toolsetu i `SEAL_E2E_JOBS`; uzywaj heartbeat, a cleanup uruchamiaj zawsze w `finally`/`trap`.
- [PIT-0976] Blad: testy rownolegle wspoldzielily outDir/release lub globalny `seal-out`, a cleanup jednej grupy usuwal artefakty innych.
  - Wymaganie: unikalny `outDir` per test/run; child‑runner nie moze czyscic globalnych katalogow (tylko swoje scope).
  - Wymaganie: JSON5 jest jedynym źródłem prawdy.

## Dodatkowe wnioski (batch 341-345)

- [PIT-0977] Blad: skrypty parsowaly tekst `systemctl status` (lokalizacja/ANSI/truncation), co dawalo niestabilne wyniki.
  - Wymaganie: do logiki uzywaj `systemctl show --property=... --value` albo `systemctl is-active/is-enabled`; parsowanie `status` tylko do diagnostyki.
- [PIT-0978] Blad: w unitach systemd uzywano `~`/`$HOME` w sciezkach, a systemd ich nie rozwijał, co powodowalo bledne CWD lub brak plikow.
  - Wymaganie: w unitach podawaj sciezki absolutne; jesli potrzebny `HOME`, ustaw go jawnie w `Environment=` i używaj w kodzie, nie w samym unicie.
- [PIT-0979] Blad: oczekiwano ekspansji zmiennych w `EnvironmentFile` (np. `FOO=$BAR`), ale systemd nie wykonuje substytucji, wiec wartosci byly literalne.
  - Wymaganie: generuj plik env z juz‑rozwinietymi wartosciami albo przeliczaj je w wrapperze aplikacji przed startem.
- [PIT-0980] Blad: output `ssh ... | tee` maskowal exit code zdalnej komendy (pipeline zwracal status `tee`), przez co bledy zdalne ginely.
  - Wymaganie: po pipeline odczytuj `${PIPESTATUS[0]}` albo nie uzywaj pipe do logowania (redirect do pliku + osobny `cat`); w testach assertuj exit code zdalnego polecenia.

- [PIT-0981] Blad: listy testow (`SEAL_E2E_TESTS`/`SEAL_E2E_SKIP`) byly parsowane z wlaczonym globbingiem, a znaki `*`/`?` rozwijaly sie do nazw plikow z CWD.
  - Wymaganie: przy parsowaniu list wylacz globbing (`set -f`) lub uzyj bezpiecznego splitu po separatorach; w dokumentacji zaznacz, ze wildcardy nie sa wspierane.
- [PIT-0982] Blad: `SEAL_E2E_RUN_ID` ustawiony przez uzytkownika zawieral spacje lub znaki `/`, co psulo sciezki logow/summary.
  - Wymaganie: waliduj/sanitizuj `RUN_ID` (np. `[a-zA-Z0-9._-]`) i w razie potrzeby dodaj hash; loguj efektowny `RUN_ID`.
- [PIT-0983] Blad: nazwy testow/grup zawieraly znaki `/` lub `..`, co moglo tworzyc katalogi poza log rootem albo psuc `mktemp`.
  - Wymaganie: waliduj nazwy testow/grup do bezpiecznego alfabetu i uzywaj `safe_name` + hash dla sciezek na dysku.

## Dodatkowe wnioski (batch 346-350)

- [PIT-0984] Blad: `SEAL_E2E_TOOLSET=full` bylo uruchamiane na obrazie buildera bez toolchaina (core), co powodowalo masowe SKIPy i fałszywe “green”.
  - Wymaganie: weryfikuj zgodnosc toolsetu z obrazem/instalacjami i fail‑fast (lub automatycznie przełącz obraz), loguj wykryty toolset + builder image.
- [PIT-0985] Blad: `SEAL_E2E_LOG_DIR`/`SEAL_E2E_SUMMARY_PATH` ustawione jako sciezki relatywne ladowaly w innym CWD (np. po `sudo`), zostawiajac artefakty w repo lub w `/root`.
  - Wymaganie: wymagaj sciezek absolutnych lub normalizuj przez `realpath`, a wynik loguj na starcie.
- [PIT-0986] Blad: bardzo dlugie nazwy testow/grup powodowaly przekroczenie limitu dlugosci sciezek (`ENAMETOOLONG`) przy tworzeniu katalogow logow/tmp.
  - Wymaganie: skracaj nazwy katalogow (prefix + hash) i loguj mapowanie `name -> dir`.

## Dodatkowe wnioski (batch 351-355)

- [PIT-0987] Blad: `SEAL_E2E_RERUN_FAILED=1` wskazywal na summary z poprzedniej wersji manifestu (nowe/usuniete testy), co powodowalo puste lub mylace reruny.
  - Wymaganie: przy rerun weryfikuj, czy testy z summary istnieja w aktualnym manifeście; nieznane = ostrzezenie lub fail‑fast z instrukcja.
- [PIT-0988] Blad: `SEAL_E2E_SUMMARY_APPEND=1` powodowal, ze plik summary zawieral stare fail'e, a rerun odpalal testy, ktore juz byly naprawione.
  - Wymaganie: przy append zapisuj run_id w summary i filtruj po ostatnim runie, albo ustaw `SUMMARY_APPEND=0` dla rerun.
- [PIT-0989] Blad: `SEAL_E2E_RERUN_FROM` wskazywal na sciezke bez aktualnych uprawnien (np. po `sudo`), co dawalo mylace „brak failed tests”.
  - Wymaganie: przed rerun waliduj, ze summary jest czytelny; brak dostepu = fail‑fast z jasnym komunikatem.

## Dodatkowe wnioski (batch 356-360)

- [PIT-0990] Blad: `SEAL_E2E_LOG_TAIL_LINES` mial wartosc nienumeryczna lub 0, przez co `tail` failowal albo logi byly puste.
  - Wymaganie: waliduj `LOG_TAIL_LINES` jako dodatnia liczbe i stosuj bezpieczny fallback (np. 40) z ostrzezeniem.
- [PIT-0991] Blad: `SEAL_E2E_CAPTURE_LOGS=0` wylaczalo logi nawet przy FAIL, co utrudnialo diagnostyke.
  - Wymaganie: przy porazkach automatycznie wlacz `capture_logs` (lub wypisz wyrazny hint jak odpalic z logami).
- [PIT-0992] Blad: `SEAL_E2E_TIMEOUT_SCALE` ustawione na 0/ujemne/tekst powodowalo zerowe timeouty lub bledy w `awk`.
  - Wymaganie: waliduj `TIMEOUT_SCALE` jako liczbe > 0; w razie blednej wartosci fail‑fast albo fallback do 1 z ostrzezeniem.

## Dodatkowe wnioski (batch 361-365)

- [PIT-0993] Blad: manifest E2E dopuszczal puste `description`/`skipRisk`/`failHint` (lub brak `category`), przez co raport/summary byl nieczytelny i trudno bylo ocenic SKIP.
  - Wymaganie: waliduj, ze pola metadanych sa niepuste (`category`, `description`, `skipRisk`, `failHint`); brak = FAIL w trybie strict lub jawny warning + placeholder w summary.
- [PIT-0994] Blad: runner ignorowal `parallel=false` w manifeście i uruchamial testy rownolegle, co powodowalo kolizje portow/plikow i flakey wyniki.
  - Wymaganie: runner respektuje `parallel` per-test (serial/exclusive) i loguje, gdy test jest wymuszony do trybu sekwencyjnego.
- [PIT-0995] Blad: `SEAL_E2E_RERUN_FAILED` uruchamial testy na innym manifeście/konfiguracji (toolset/filtry), co dawalo nieporownywalne wyniki.
  - Wymaganie: summary zapisuje fingerprint manifestu i konfiguracji (hash pliku E2E + kluczowe ENV), a rerun sprawdza zgodnosc; mismatch = FAIL lub wymaga `--force`.
- [PIT-0996] Blad: raport z E2E nie zawieral informacji o buildzie (buildId/outDir/variant), przez co diagnoza trafiala w nie ten artefakt.
  - Wymaganie: testy loguja buildId/outDir/variant dla kazdego builda, a summary przechowuje te metadane per test.

## Dodatkowe wnioski (batch 366-370)

- [PIT-0997] Blad: manifest E2E zawieral nieznane `requirements` (literowki lub nieudokumentowane tokeny), co skutkowalo cichym SKIP bez jasnego powodu.
  - Wymaganie: `requirements` jest walidowane against allowlista; nieznane wartosci = FAIL (strict) lub warning + lista znanych tokenow.
- [PIT-0998] Blad: `category` i `skipRisk` mialy literowki/rozne formaty (`Security`, `security `), co rozbijalo raporty na wiele pseudo‑kategorii i utrudnialo ocene ryzyka.
  - Wymaganie: `category`/`skipRisk` sa normalizowane i walidowane (allowlista, np. `low|medium|high`); nieznane = warning + fallback do `misc/unknown`.
- [PIT-0999] Blad: `script` w manifeście wskazywal nieistniejacy plik lub niewykonywalny skrypt, a błąd pojawial sie dopiero w trakcie runu.
  - Wymaganie: preflight sprawdza istnienie i uruchamialnosc `script` (file + perms); brak = fail‑fast z pełną ścieżką.
- [PIT-1000] Blad: summary zawieral tylko statusy/czasy, bez metadanych testu (category/description/skipRisk/failHint/requirements), co utrudnialo szybka diagnoze i rerun.
  - Wymaganie: summary zawsze zawiera metadane testu i reason SKIP/planu, tak aby raport byl samowystarczalny.

## Dodatkowe wnioski (batch 371-375)

- [PIT-1001] Blad: po `PR_SET_DUMPABLE=0` zapis do `/proc/self/coredump_filter` zwracal `EACCES/EPERM`, a runtime traktowal to jako bledne zabezpieczenie i failowal (`[thin] runtime invalid`).
  - Wymaganie: `EACCES/EPERM` przy `coredump_filter` po ustawieniu dumpable=0 jest akceptowalne; loguj, ale nie przerywaj startu. Dodaj E2E, ktore to wykrywa.

## Dodatkowe wnioski (batch 376-380)

- [PIT-1002] Blad: deploy startowal service mimo braku katalogu `WorkingDirectory` lub brakujacego `run-current.sh`, co dawalo `status=200/CHDIR` i automatyczny rollback bez jasnej diagnozy.
  - Wymaganie: przed restartem waliduj istnienie `installDir`/`release`/`run-current.sh` na target; brak = fail‑fast z jasnym komunikatem i instrukcja naprawy. Wrapper startowy ma jawnie `cd` z kontrola bledu.

## Dodatkowe wnioski (batch 381-385)

- [PIT-1003] Blad: diagnostyczne artefakty (strace, tarball, logi) ladowaly w root repo lub `/tmp`, co zasmiecalo workspace i generowalo komunikaty snapshot/clean.
  - Wymaganie: wszystkie artefakty diagnostyczne zapisywac do `seal-out/diagnostics/` (lub katalogu z `SEAL_DIAG_DIR`) i ignorowac je przez `.gitignore`; skrypty diagnostyczne nie powinny domyslnie uzywac `/tmp`.

## Dodatkowe wnioski (batch 386-390)

- [PIT-1004] Blad: nadmiarowe wpisy konfiguracyjne w podprojektach nadpisywaly domyslne wartosci (np. `packager`, `thin.*`, `includeDirs`) i rozjezdzaly sie z oczekiwanymi defaultami, co dawalo warningi i niespojne zachowanie.
  - Wymaganie: trzymaj domyslne ustawienia tylko w jednym miejscu (parent/global), a w podprojektach zostawiaj tylko realne nadpisania; dodaj walidacje "effective config" (np. `seal check`) i testy, ktore wykrywaja niepotrzebne nadpisania.

## Dodatkowe wnioski (batch 391-395)

- [PIT-1005] Blad: w trybie thin‑split serwis startowal z CWD na `installDir`, przez co Express static nie widzial `public` z release, a UI zwracalo 404 na `/`.
  - Wymaganie: w trybie thin ustaw CWD na katalog release lub serwuj staticy z `process.cwd()` z fallbackiem do `__dirname`; dodaj smoke‑test HTTP `/` w E2E po deployu.

## Dodatkowe wnioski (batch 396-400)

- [PIT-1006] Blad: readiness/monitoring uderzal w `/healthz` lub `/` bez gwarancji, ze endpoint istnieje, co dawalo falszywy FAIL mimo dzialajacej aplikacji.
  - Wymaganie: implementuj stabilny endpoint zdrowia (np. `/healthz` lub `/api/status`) i konfiguruj `waitUrl`/monitoring tak, aby trafial w faktycznie obslugiwany URL; w razie braku HTTP sprawdzaj tylko systemd.

## Dodatkowe wnioski (batch 401-405)

- [PIT-1007] Blad: service padal z `status=200/CHDIR` lub `appctl: No such file`, a komunikat nie sugerowal, ze potrzebny jest `--bootstrap` lub ponowna instalacja runnera.
  - Wymaganie: runner i readiness musza wypisywac jasny hint (np. `seal ship <target> --bootstrap`); dodaj E2E, ktore weryfikuje poprawny komunikat.
- [PIT-1008] Blad: brak sentinela skutkowal `runtime invalid` i kodem 200 bez jednoznacznej instrukcji naprawy.
  - Wymaganie: gdy sentinel jest wlaczony i exit code wskazuje na blokade, wypisz hint `seal sentinel install <target>`; dodaj E2E na ten przypadek.

## Dodatkowe wnioski (batch 406-410)

- [PIT-1009] Blad: deploy przerywal przez config drift (roznice miedzy repo a target), a uzytkownik nie wiedzial, czy pushowac config czy akceptowac drift.
  - Wymaganie: przy drift wypisuj jasny komunikat z dwiema opcjami (`seal config push <target>` albo `--accept-drift`); dokumentuj polityke driftu i to, gdzie leza sekrety.

## Dodatkowe wnioski (batch 411-415)

- [PIT-1010] Blad: sentinel install/verify failowal przy `__SEAL_SENTINEL_MISSING__` i zwracal ogolny error bez kontekstu, co blokowalo automatyczna instalacje.
  - Wymaganie: `verify` powinien interpretowac brak pliku jako stan "missing" (nie fatal), a `install` powinien kontynuowac; w komunikacie podawaj sciezke i hint instalacji.

## Dodatkowe wnioski (batch 416-420)

- [PIT-1011] Blad: payload‑only deploy nie kopiowal "release extras" (np. `public/`, `appctl`, `version.json`), co powodowalo brak UI i bledy `appctl: No such file`.
  - Wymaganie: przy payload‑only zawsze przenos extras z release (wszystko poza `b/` i `r/`); w E2E sprawdz, ze `public/` i `appctl` sa obecne po payload‑only.

## Dodatkowe wnioski (batch 421-425)

- [PIT-1012] Blad: smoke test UI byl robiony tylko na `/`, ale aplikacja nie serwowala root lub wymagany byl inny path, co dawalo fałszywe alarmy.
  - Wymaganie: dla UI zdefiniuj jawny endpoint health (np. `/api/status`) i testuj oba: `GET /` (jeśli istnieje) + `GET /api/status`; jeśli `/` nieobslugiwany, test nie powinien failowac.
