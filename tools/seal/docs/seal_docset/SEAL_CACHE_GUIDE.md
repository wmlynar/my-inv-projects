# SEAL_CACHE_GUIDE - Mapa cache i polityka sprzatania (v0.5)

Ten dokument opisuje wszystkie znane cache w Seal, ich domyslne lokalizacje,
zmienne srodowiskowe oraz zasady sprzatania. Cel: brak niejawnego wzrostu
rozmiaru i latwe, swiadome zarzadzanie przestrzenia na dysku.

## Zasady globalne (MUST/SHOULD)
- MUST: cache musi byc w znanym katalogu (preferuj `seal-out/` lub jawny env);
  unikaj /tmp jako domyslnej lokalizacji.
- MUST: loguj aktywne sciezki cache w runie (E2E robi to w naglowku runa).
- MUST: kazdy cache musi miec jasna polityke retencji/cleanupu.
- SHOULD: gdy nie potrzebujesz historii runow, uzywaj trybu single, aby nadpisywac
  jeden katalog (bez mnozenia run-id).

## Komendy czyszczenia (preferowane)
Projekt (seal-out):
```
seal clean
seal clean cache
seal clean e2e
seal clean runs
seal clean all
```

Cache globalne / docker / playwright:
```
seal clean-global-cache
seal clean-global-cache global
seal clean-global-cache playwright
seal clean-global-cache docker
seal clean-global-cache all
```

Tabela: scope → komenda → katalog (skrot)
| Scope | Komenda | Katalog |
| --- | --- | --- |
| project/all | `seal clean` | `seal-out/` |
| project/cache | `seal clean cache` | `seal-out/cache/` |
| project/e2e | `seal clean e2e` | `seal-out/e2e/` |
| project/runs | `seal clean runs` | `seal-out/e2e/run/` + `seal-out/e2e/concurrent-runs/` |
| global | `seal clean-global-cache global` | `~/.cache/seal` + toolchain caches |
| docker | `seal clean-global-cache docker` | `SEAL_DOCKER_E2E_CACHE_DIR` (domyslnie `/var/tmp/seal-e2e-cache`) |
| playwright | `seal clean-global-cache playwright` | `PLAYWRIGHT_BROWSERS_PATH` / XDG cache |
| global/all | `seal clean-global-cache all` | global + docker + playwright |

Uwagi:
- `seal clean` (bez scope) usuwa caly `seal-out/`.
- `seal clean e2e` usuwa `seal-out/e2e` (projekt).
- `seal clean runs` usuwa tylko `seal-out/e2e/run` i `seal-out/e2e/concurrent-runs`.
- `seal clean cache` usuwa `seal-out/cache`.
- `seal clean-global-cache` (bez scope) usuwa global + docker + playwright.
- `seal clean-global-cache docker` usuwa `SEAL_DOCKER_E2E_CACHE_DIR`
  (domyslnie `/var/tmp/seal-e2e-cache`).
- `seal clean` (scope `e2e`/`runs`) sprzata projektowe E2E cache i runy.

## Mapa cache (skrot)
- Per-projekt: `seal-out/cache/*` (thin codec_state, sentinel private).
- E2E: `seal-out/e2e/cache/*` + `seal-out/e2e/run/*` +
  `seal-out/e2e/concurrent-runs/*` + `seal-out/e2e/summary/*`.
- Docker E2E: `SEAL_DOCKER_E2E_CACHE_DIR` (domyslnie /var/tmp/seal-e2e-cache).
- Per-user toolchain: `~/.cache/seal/...` (packery, obfuscatory, criu).
- Playwright: `PLAYWRIGHT_BROWSERS_PATH` / `SEAL_PLAYWRIGHT_CACHE_DIR`
  (instalator) i `SEAL_E2E_PLAYWRIGHT_CACHE_ROOT` (E2E).

## 1) seal-out/cache (per-projekt)
Sciezka: `<project>/seal-out/cache/`

- `seal-out/cache/thin/<target>/codec_state.json`
  - Uzywane przez packager thin do stabilizacji codec state i payload-only.
  - Retencja: `SEAL_THIN_CACHE_LIMIT` (domyslnie 2). `0` = brak prune.
  - Usuniecie: `rm -rf seal-out/cache/thin` (odtworzy sie przy buildzie).

- `seal-out/cache/private/targets/<target>.json5`
  - Prywatne ID namespace dla sentinel (stabilny anchor).
  - Uwaga: usuniecie zresetuje namespace i zmieni fingerprint/anchor.

`seal clean` czysci caly `seal-out/` (chyba ze podasz scope).

## 2) seal-out/e2e (cache + artefakty run)
Root: `SEAL_E2E_ROOT` (domyslnie `tools/seal/example/seal-out/e2e`, przez e2e.sh).
Jesli root jest pusty, cache root spada do `~/.cache/seal`.

### Cache E2E (`seal-out/e2e/cache/`)
- `bin/` - lokalne binaria i wrappery narzedzi (ollvm/hikari/kiteshield/midgetpack).
- `npm/` - NPM_CONFIG_CACHE dla instalacji deps.
- `stamps/` - sygnatury deps (czy trzeba reinstall).
- `e2e-home/` - izolowany HOME (`SEAL_E2E_ISOLATE_HOME=1`).
- `e2e-seed/` - seed data dla testow.
- `playwright-installed` - marker instalacji Playwright (browser cache w XDG cache).
- `node_modules/` - wspolny cache deps, gdy ustawisz `SEAL_E2E_NODE_MODULES_ROOT`.

### Run artefakty (`seal-out/e2e/run/` + `seal-out/e2e/concurrent-runs/`)
- `SEAL_E2E_RUN_LAYOUT=auto` wybiera wspolny `run/`, a gdy jest zajety
  robi fallback do `concurrent-runs/<run-id>` (loguje ostrzezenie).
- `SEAL_E2E_RUN_LAYOUT=shared` zawsze uzywa `run/` (jeden katalog, nadpisywany).
- `SEAL_E2E_RUN_LAYOUT=concurrent` zawsze uzywa `concurrent-runs/<run-id>`.
- `SEAL_E2E_CONCURRENT=1` to prosty alias dla `SEAL_E2E_RUN_LAYOUT=concurrent`.
- W srodku: `tmp/` (TMPDIR), `workers/` (kopiowany projekt), `logs/`.
  `SEAL_E2E_TMP_ROOT` jest wymuszony pod run root (chyba ze `SEAL_E2E_TMP_ALLOW_EXTERNAL=1`).

### Summary (`seal-out/e2e/summary/`)
- `run-<id>.tsv` i `last.tsv` (podsumowania runa).

### Retencja i cleanup
- Domyslnie `tmp/` i `workers/` sa czyszczone po runie.
- `SEAL_E2E_KEEP_TMP=1` - zostawia tmp.
- `SEAL_E2E_KEEP_RUNS=1` - zostawia `run/` lub `concurrent-runs/<run-id>`.
- `SEAL_E2E_GC=1` - usuwa stare `concurrent-runs` na starcie (opcjonalnie; tylko gdy nie ma aktywnych concurrent runow).

### Override sciezek
- `SEAL_E2E_CACHE_DIR`, `SEAL_E2E_CACHE_BIN`
- `SEAL_E2E_TMP_ROOT`, `SEAL_E2E_EXAMPLE_ROOT`
- `SEAL_E2E_NODE_MODULES_ROOT`, `SEAL_E2E_HOME_ROOT`
- `SEAL_E2E_RUN_ID`, `SEAL_E2E_RUN_MODE=single|parallel`, `SEAL_E2E_RUN_LAYOUT`

## 3) Docker E2E cache
Root: `SEAL_DOCKER_E2E_CACHE_DIR` (default `/var/tmp/seal-e2e-cache` gdy
uruchamiasz `test-docker-e2e.sh` bez `e2e.sh`).

Zawartosc:
- `node_modules/`, `example-node_modules/`, `npm/`
- `ssh/` (klucze i auth dla SSH w docker E2E)
- `images/` (cache obrazow)
- `playwright/` (cache przegladarek)

Rekomendacja: uruchamiaj przez
`tools/seal/seal/scripts/e2e.sh --docker` albo ustaw
`SEAL_DOCKER_E2E_CACHE_DIR` na katalog w repo (np. `tools/seal/example/seal-out/e2e/cache`).

## 4) Cache toolchain (per-user)
Wiecej miejsca zajmuja repo/kompilaty packerow i obfuscatorow.
Domyslne sciezki:
- `~/.cache/seal/kiteshield` (`SEAL_KITESHIELD_DIR`)
- `~/.cache/seal/midgetpack` (`SEAL_MIDGETPACK_DIR`)
- `~/.cache/seal/criu` (`SEAL_CRIU_DIR`)
- `~/.cache/seal/obfuscators/obfuscator-llvm` (`SEAL_OLLVM_DIR`)
- `~/.cache/seal/obfuscators/hikari` (`SEAL_HIKARI_DIR`)
- `~/.cache/seal/third-party` (`SEAL_THIRD_PARTY_CACHE`, docker builder/full tools)

Uwaga: w kodzie **nie** ma globalnego `SEAL_CACHE`. To konwencja w docs;
realnie uzywaj konkretnych zmiennych z listy powyzej.
Instalatory toolchain sprzataja zrodla/build po instalacji; ustaw
`SEAL_TOOLCHAIN_KEEP_SRC=1`, jesli chcesz je zachowac.
Do czyszczenia: `seal clean-global-cache`.

## 5) Playwright cache
- Instalator CLI: `SEAL_PLAYWRIGHT_CACHE_DIR` lub `PLAYWRIGHT_BROWSERS_PATH`
  (domyslnie `/usr/local/share/ms-playwright`).
- E2E runner: `SEAL_E2E_PLAYWRIGHT_CACHE_ROOT` albo `XDG_CACHE_HOME`,
  plus `PLAYWRIGHT_BROWSERS_PATH` gdy ustawione.
Uwaga: sciezki systemowe moga wymagac sudo przy czyszczeniu.

## 6) Szybkie sprzatanie (manual)
`seal clean` usuwa caly `seal-out/`. Jesli chcesz wyzerowac wszystko (w tym globalne cache):
```
rm -rf seal-out/cache
rm -rf seal-out/e2e
rm -rf ~/.cache/seal
rm -rf /var/tmp/seal-e2e-cache
```

## 7) Kontrola rozmiaru
Ostrzezenie rozmiaru `seal-out/` po E2E:
- `SEAL_E2E_SEAL_OUT_WARN_GB` (domyslnie `10`) - loguje WARN jesli `seal-out/` przekracza prog.
- `SEAL_E2E_SEAL_OUT_WARN_GB=0` - wylacza ostrzezenie.
- `SEAL_E2E_DISK_SUMMARY=0` - wylacza caly raport dysku po E2E.

Najprostszy audyt:
```
du -sh seal-out/cache seal-out/e2e ~/.cache/seal /var/tmp/seal-e2e-cache 2>/dev/null
```
