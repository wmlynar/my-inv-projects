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

- Blad: obfuskacja/minifikacja frontendu byla wylaczona.
  - Wymaganie: `build.frontendObfuscation` i `build.frontendMinify` sa **domyslnie wlaczone** dla UI.

- Blad: `upx` byl wlaczony, ale jego blad byl ignorowany (build przechodzil mimo `CantUnpackException` itp.).
  - Wymaganie: jezeli `upx` jest wlaczony i sie nie powiedzie, build **musi** sie przerwac z bledem.
  - Wymaganie: `upx` domyslnie wylaczony dla SEA; wlaczaj tylko po potwierdzeniu `upx -t` na binarce.

- Blad: rozjazd wykrywania narzedzi i opcji miedzy `check` i `build` (postject/cc/packager).
  - Wymaganie: **jedno zrodlo prawdy** dla wykrywania narzedzi (resolver binarki).
  - Wymaganie: `check` i `build` uzywaja tego samego PATH, targetu i packagera.
  - Wymaganie: release/ship przekazuja opcje preflight (`--check-verbose`, `--check-cc`).

- Blad: `seal check` „wieszal sie” na kompilacji testowej (brak timeoutu i brak outputu).
  - Wymaganie: wszystkie komendy preflight/build maja timeout i widoczny postep.
  - Wymaganie: `seal check --verbose` pokazuje komendy i stdout/stderr narzedzi.
  - Wymaganie: preflight uzywa plikow tymczasowych (nie stdin), zeby narzedzia nie blokowaly sie na wejsciu.
  - Wymaganie: opcja override toolchaina (np. `--cc gcc`) dla srodowisk z wrapperami `cc`.

- Blad: build byl niedeterministyczny lub wykonany na innej architekturze/OS niz target (AIO zawiera runtime z build machine).
  - Wymaganie: preflight waliduje OS/arch i wersje narzedzi; mismatch = fail-fast.
  - Wymaganie: zapisuj wersje toolchaina i zaleznosci; unikaj auto‑pobieran w buildzie.
  - Wymaganie: release nie moze polegac na toolchainie builda na serwerze.
  - Wymaganie: AIO buduj na tej samej architekturze/OS co target albo uzyj trybu BOOTSTRAP.

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

- Blad: `codec_state` ginal miedzy deployami (brak zgodnosci kodeka).
  - Wymaganie: `codec_state` musi byc zapisywany lokalnie i utrzymany (`seal-out/cache/thin/<target>/codec_state.json`).
  - Wymaganie: `seal-out/` jest ignorowany w VCS.
  - Wymaganie: brak `codec_state` = rebootstrap.

- Blad: cache `seal-out/cache/thin` rosl bez limitu i zapychal dysk.
  - Wymaganie: cache ma limit (np. liczba wpisow/rozmiar/TTL) i auto-pruning.
  - Wymaganie: limit musi byc konfigurowalny (0 = wylacza cache), a pruning logowany.

- Blad: payload-only (BOOTSTRAP) nie sprawdzal zgodnosci kodeka z runtime na target.
  - Wymaganie: `release/r/c` musi istniec i byc porownany z `<installDir>/r/c`.
  - Wymaganie: mismatch lub brak `c` = **fallback do pelnego bootstrap**.

- Blad: metadane kodeka byly zapisywane jako JSON na serwerze.
  - Wymaganie: wszystko co trafia na target powinno byc binarne/obfuskowane (brak czytelnych JSON).
  - Wymaganie: nazwy plikow na target nie powinny zdradzac roli (uzywaj krotszych/nijakich nazw, np. `c` zamiast `codec.bin`).

- Blad: w release brakowalo `public/` lub `data/` (UI/plikowe zasoby nie dzialaly po sealingu).
  - Wymaganie: `build.includeDirs` musi zawierac wszystkie katalogi runtime (np. `public`, `data`).
  - Wymaganie: po `seal release` zawsze uruchom `seal run-local --sealed` i sprawdz UI/zasoby.

- Blad: kod szukal zasobow przez `__dirname`, co po bundlingu wskazywalo zla sciezke.
  - Wymaganie: zasoby runtime lokalizuj wzgledem `process.cwd()` (release dir) i jawnych katalogow (`public/`, `shared/`).

## Testy / CI

- Blad: testy E2E potrafily wisiec bez wyjscia (brak timeoutu na krokach/komendach).
  - Wymaganie: **kazdy** test E2E ma timeout (per‑test + per‑krok/subprocess).
  - Wymaganie: brak postepu > timeout = twarde przerwanie z jasnym bledem.
  - Wymaganie: E2E uzywa **szybkich przykladow/fixture** (minimalny projekt), nie pelnych produkcyjnych buildow.
  - Wymaganie: procesy uruchamiane w testach musza miec drenaz stdout/stderr (albo `stdio: inherit`), zeby nie blokowac procesu.
  - Wymaganie: testy nie polegaja na **kruchej** analizie stdout child procesu (ANSI/kolory/pipe). Preferuj JSON output, kody wyjscia, lub wywolania in‑process; zawsze stripuj ANSI.
  - Wymaganie: testy UI musza zawsze zamykac browser (`finally`), nawet przy bledzie.
  - Wymaganie: subprocess musi zawsze obslugiwac zdarzenie `error` (i resolve/reject), aby nie zostawiac wiszacej obietnicy.
  - Wymaganie: testy E2E uzywaja losowych portow (bez hardcode `3000`), aby uniknac `EADDRINUSE`.
  - Wymaganie: po testach usuwaj katalogi tymczasowe (np. `/tmp/seal-*`) zeby nie zapychac dysku.

- Blad: testy uruchamiane jako root zostawialy root‑owned tmp przy bledzie builda (trudne sprzatanie bez sudo).
  - Wymaganie: E2E uruchamiane jako root tworza tmp na starcie i **zawsze** sprzataja w `finally` (nawet przy fail‑fast).

- Blad: testy „expect fail” nie drenowaly stdout/stderr child procesu, co moglo blokowac proces i zafalszowac timeout.
  - Wymaganie: drenaż stdout/stderr jest wymagany **we wszystkich** sciezkach testu (takze przy spodziewanej porazce).

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

- Blad: brak asercji „brak tmp” pozwalal na ukryty wyciek plikow tymczasowych.
  - Wymaganie: po E2E sprawdzaj, czy nie zostaly `/tmp/seal-*` (fail jeśli tak).

- Blad: zachowanie zalezne od ENV bylo niejawne i rozne miedzy maszynami.
  - Wymaganie: ENV ma jawne defaulty, a „effective config” jest logowane.

- Blad: format binarny nie mial wersji, a nieznana wersja powodowala niejasne bledy.
  - Wymaganie: formaty binarne maja wersjonowanie i twardy fail na nieznana wersje.
  - Wymaganie: testy nie zalezne od internetu; zewnetrzne call'e stubuj lokalnie.
  - Wymaganie: jesli srodowisko blokuje `listen` (EPERM), testy powinny sie jawnie oznaczyc jako SKIP.

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

- Blad: uruchamianie aplikacji jako root (np. przez sudo) bez potrzeby.
  - Wymaganie: domyslnie uruchamiamy jako uzytkownik uslugi; `--sudo` tylko jawnie.
  - Wymaganie: waliduj owner/perms/umask w miejscach krytycznych.

- Blad: unit systemd nie ustawial `WorkingDirectory`, przez co `config.runtime.json5` nie byl znajdowany.
  - Wymaganie: `WorkingDirectory` wskazuje katalog release (albo `run-current.sh` ustawia CWD przed startem).

- Blad: unit/komendy operowaly na zlej nazwie uslugi (status/stop/restart nie trafialy w odpowiedni unit).
  - Wymaganie: nazwa uslugi jest zapisywana w `<root>/service.name` i uzywana konsekwentnie przez `seal` i `appctl`.

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

- Blad: polityka SSH byla twardo ustawiona (sporne zachowanie bez opcji).
  - Wymaganie: parametry sporne/ryzykowne (np. `StrictHostKeyChecking`) musza byc konfigurowalne per‑target.

- Blad: brak timeoutow na operacjach zewnetrznych (ssh/scp/rsync/http) blokowal deploy.
  - Wymaganie: kazda operacja zewnetrzna ma timeout + jasny komunikat "co dalej".

- Blad: `status` lapal przypadkowe procesy (np. edytor `nano appctl`) i mylil z running service.
  - Wymaganie: detekcja procesu musi byc precyzyjna (systemd lub filtr na faktyczna binarke/PID).

- Blad: `seal run` zostawial proces po zamknieciu konsoli.
  - Wymaganie: foreground run musi zbijac proces przy rozlaczeniu lub miec `--kill`.
  - Wymaganie: `--kill` dziala bez sudo (ten sam user), bez ubijania cudzych procesow.

- Blad: `seal run` uruchamial bezposrednio `appctl` z release, ignorujac `run-current.sh`.
  - Wymaganie: `seal run` uruchamia `run-current.sh` (jezeli istnieje), zeby zachowac zgodnosc z usluga i BOOTSTRAP.

- Blad: rollback wybieral release `*-fast-*` albo release innej aplikacji.
  - Wymaganie: rollback filtruje releasy po `appName` i **pomija** `*-fast-*`.

- Blad: `status` nie wykrywal procesu uruchomionego przez BOOTSTRAP (`$ROOT/b/a`) przy braku unitu.
  - Wymaganie: fallback `status` uwzglednia `$ROOT/b/a` w detekcji procesu.

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

- Blad: w template stringach z bash/script wystapily nie‑escapowane sekwencje `${...}`, co psulo skladnie JS.
  - Wymaganie: w osadzonych skryptach shellowych zawsze escapuj `${` jako `\\${` (lub użyj helpera do here‑doc), zeby uniknac interpolacji JS.

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

- Blad: uruchomienie komendy w monorepo rekurencyjnie (workspace) uzywalo relatywnej sciezki CLI i padalo w podprojektach.
  - Wymaganie: rekurencyjne uruchomienia CLI musza uzywac **absolutnej** sciezki do binarki/JS.

- Blad: `seal check` uruchomiony poza projektem nadal tworzyl pliki i generowal mylace warningi.
  - Wymaganie: brak `seal.json5` = fail-fast **bez efektow ubocznych**.

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
- `upx` wlaczony + blad `upx` => build musi failowac.
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
