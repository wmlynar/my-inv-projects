# SEAL_E2E_RUNBOOK - uruchamianie testow E2E (v0.1)

Ten dokument opisuje, jak uruchamiac testy E2E w kilku trybach: Docker (2 kontenery), lokalnie bez specjalnych narzedzi, lokalnie z narzedziami advanced oraz ktore testy sa domyslnie wylaczone/skipowane.

## Szybki wybor (co uruchomic)

- Docker E2E (builder + "host" w drugim kontenerze): `tools/seal/seal/scripts/e2e.sh --docker`
- Lokalnie, bez specjalnych narzedzi: `tools/seal/seal/scripts/e2e.sh --local`
- Lokalnie, advanced anti-debug + dump: `tools/seal/seal/scripts/run-e2e-advanced.sh --local`
- Plan tylko (lista testow, bez uruchamiania): `tools/seal/seal/scripts/e2e.sh --local --plan`

## Wspolne przygotowanie (wszystkie tryby)

1) Opcjonalny plik konfiguracyjny E2E:
   - Skopiuj `tools/seal/seal/scripts/e2e-config.env` do `.seal/e2e.env`
   - lub ustaw `SEAL_E2E_CONFIG=/dev/null`, jesli nie chcesz ladowac configu.
2) Runner E2E sam wykrywa potrzebe eskalacji i uruchamia sie przez `sudo`,
   chyba ze ustawisz `SEAL_E2E_REQUIRE_ESCALATION=0`.
3) Testy uruchamiaj z repo root.

## Krytyczne: higiena dysku i tmp

**NIE MOZNA DOPUSZCZAC, ABY PLIKI ROSLY W NIEZNANYM FOLDERZE I ZAPCHALY DYSK.**
To zdarzylo sie w praktyce - E2E potrafilo zostawiac pliki w /tmp i ich
nie sprzatac. Ponizej jest lista bledow, napraw oraz zasad zapobiegania.

### Bledy (historyczne)

- Tymczasowe pliki i logi rosly w /tmp bez jasnego ownershipu i bez cleanup.
- Brak jednej kontrolowanej lokalizacji na artefakty E2E.
- Brak wyraznego rozroznienia trybu single/parallel powodowal przyrost katalogow run-id nawet bez potrzeby.

### Naprawione

- Wszystkie pliki E2E trafiaja do `tools/seal/example/seal-out/e2e`.
- Domyslny layout `SEAL_E2E_RUN_LAYOUT=auto` uzywa stalego `run/` (nadpisuje, bez nowych katalogow);
  gdy run jest zajety, robi fallback do `concurrent-runs/<run-id>` i loguje ostrzezenie.
- W trybie `concurrent` powstaje `concurrent-runs/<run-id>`, a po runie sprzatane sa `tmp/` i `workers/`.
- `SEAL_E2E_GC=1` jest opcjonalne i sluzy do czyszczenia starych `concurrent-runs/` (uruchamiaj gdy nie ma aktywnych concurrent runow).

### Zasady na przyszlosc (obowiazkowe)

- **Nigdy nie zostawiaj artefaktow w nieznanym miejscu (np. /tmp).**
- Wszystkie tymczasowe pliki musza byc pod `seal-out/e2e` (run/tmp lub concurrent-runs/<id>/tmp).
- Trzymaj `SEAL_E2E_RUN_LAYOUT=auto` (domyslnie); `concurrent` wlaczaj tylko gdy potrzebujesz kilku runow naraz.
- Szybki switch: `SEAL_E2E_CONCURRENT=1` (alias dla `SEAL_E2E_RUN_LAYOUT=concurrent`).
- `SEAL_E2E_RUN_MODE=single` jest domyslny; `parallel` wlaczaj tylko gdy jest potrzebny.
- Zewnetrzny tmp wymaga `SEAL_E2E_TMP_ALLOW_EXTERNAL=1` i powinien byc wyjatkiem.
- Nie wlaczaj `SEAL_E2E_KEEP_RUNS` i `SEAL_E2E_KEEP_TMP` na stale; to flagi tylko do debugowania.
- Po debugowaniu zawsze sprzataj: `rm -rf tools/seal/example/seal-out/e2e/run tools/seal/example/seal-out/e2e/concurrent-runs`.
- Alternatywnie: `seal clean runs` (tylko project).
- Regularnie monitoruj rozmiar: `du -sh tools/seal/example/seal-out/e2e`.

## Docker E2E (2 kontenery: builder + host)

### Przygotowanie

1) Zainstaluj Dockera (Ubuntu/Debian):
   - `tools/seal/seal/scripts/install-docker.sh`
2) Upewnij sie, ze `docker info` dziala.

### Uruchomienie

```
tools/seal/seal/scripts/e2e.sh --docker
```

### Najwazniejsze opcje Docker E2E

- `SEAL_DOCKER_E2E_REMOTE=1` (domyslnie) - tryb 2 kontenerow (builder + server).
- `SEAL_DOCKER_E2E_REMOTE_FALLBACK=0` - fail, jesli server kontener nie wystartuje (bez fallbacku).
- `SEAL_DOCKER_E2E_HOST=1` - uruchom host-only testy w Dockerze (wymaga uprzywilejowanego kontenera).
- `SEAL_E2E_TOOLSET=full` - wlacza testy wymagajace pelnego toolsetu.

## Lokalnie - bez specjalnych narzedzi

### Przygotowanie

1) Zainstaluj podstawowe zaleznosci:
   - `tools/seal/seal/scripts/install-seal-deps.sh`
   - Jesli chcesz pominac instalacje E2E tooling: `SEAL_INSTALL_E2E_TOOLS=0`.

### Uruchomienie

```
tools/seal/seal/scripts/e2e.sh --local
```

### Przydatne filtry

- `SEAL_E2E_TESTS=thin,thin-anti-debug` - uruchom tylko wybrane testy.
- `SEAL_E2E_SKIP=example-ui` - pomin wybrane testy.
- `SEAL_E2E_TOOLSET=core` (domyslnie) lub `full` (pelny zestaw).

## Lokalnie - advanced (anti-debug + dump + narzedzia)

### Przygotowanie

1) Zainstaluj advanced narzedzia (best-effort):
   - `sudo -E tools/seal/seal/scripts/install-e2e-advanced-deps.sh`
2) Zainstaluj narzedzia manualne (Pin + AVML):
   - `sudo -E tools/seal/seal/scripts/install-e2e-manual-tools.sh`
   - lub recznie (patrz `SEAL_E2E_ADVANCED_RUN_SUMMARY.md`).

### Uruchomienie

```
sudo -E tools/seal/seal/scripts/run-e2e-advanced.sh --local
```

Ten wrapper ustawia `SEAL_E2E_REAL_DUMP=1` i strict-flagi, a w trybie root
automatycznie luzuje je, zeby uniknac falszywych FAIL.

## UI E2E (Playwright)

Test `example-ui` wymaga Playwright i przegladarek.

1) Upewnij sie, ze masz `npx`:
   - `npx --version`
2) Zainstaluj przegladarki:
   - `npx playwright install --with-deps chromium`
3) Uruchom E2E normalnie (UI test jest wlaczony domyslnie):
   - `tools/seal/seal/scripts/e2e.sh --local`

Aby wylaczyc UI E2E: `SEAL_UI_E2E=0`.

## Deploy/SSH E2E (ship/config-sync/user-flow)

Te testy wymagaja SSH. W Docker E2E jest to zalatwione przez server kontener.
Poza Dockerem musisz ustawic target SSH:

- `SEAL_E2E_SSH=1`
- `SEAL_SHIP_SSH_HOST`, `SEAL_SHIP_SSH_USER`, `SEAL_SHIP_SSH_PORT`
- `SEAL_SHIP_SSH_INSTALL_DIR`, `SEAL_SHIP_SSH_SERVICE_NAME`

## Testy wylaczone / czesto skipowane (i jak je wlaczyc)

1) Dump / memdump:
   - Domyslnie: `SEAL_E2E_REAL_DUMP=0` -> testy dump sa SKIP.
   - Wlacz: `SEAL_E2E_REAL_DUMP=1` + `gdb/gcore` albo `SEAL_E2E_DUMP_CMD`.
   - Pelny memdump: `SEAL_E2E_MEMDUMP=1` + `avml`.

2) Srodowisko (sysctl/kernel/dmesg):
   - Domyslnie: `SEAL_E2E_ENV_CHECKS=0` -> SKIP.
   - Wlacz: `SEAL_E2E_ENV_CHECKS=1`.

3) Toolset "full":
   - Testy `full-packagers` i `full-protection` wymagaja `SEAL_E2E_TOOLSET=full`.
   - Doinstaluj packery/obfuskatory: `install-upx.sh`, `install-kiteshield.sh`,
     `install-midgetpack.sh`, `install-ollvm.sh`, `install-hikari-llvm15.sh`.

4) Anti-debug tooling (attach/instrumentation):
   - Brak narzedzi (gdb, bpftrace, rr, lttng, sysdig) = SKIP.
   - Wlacz: `tools/seal/seal/scripts/install-e2e-antidebug-deps.sh`.
   - Dodatkowo: Pin/AVML przez `install-e2e-manual-tools.sh`.

5) Docker host-limited:
   - W Dockerze domyslnie `SEAL_E2E_LIMITED_HOST=1` -> host-only testy SKIP.
   - Wlacz host-only w Docker: `SEAL_DOCKER_E2E_HOST=1`.

6) Strict tryb (SKIP -> FAIL):
   - Wlacz wybrane: `SEAL_E2E_STRICT_* = 1`.
   - Dla dump fixture: `SEAL_E2E_STRICT_JS_DUMP_FIXTURE=1`.

## Dodatkowe przydatne tryby runnera

- Plan tylko: `tools/seal/seal/scripts/e2e.sh --local --plan`
- Rerun failed: `SEAL_E2E_RERUN_FAILED=1` (+ opcjonalnie `SEAL_E2E_RERUN_FROM=...`)
- Setup only (instalacja deps bez testow): `SEAL_E2E_SETUP_ONLY=1`
