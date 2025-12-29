# SEAL_E2E_FRAMEWORK_SPEC – Specyfikacja frameworka testow E2E (v0.1)

Ten dokument opisuje docelowy, wspolny framework dla testow E2E w SEAL. Celem jest ujednolicenie wzorcow, wymuszenie poprawnych praktyk i eliminacja powtarzalnych bledow w testach.

## Cel i zakres

- Standaryzacja sposobu uruchamiania procesow, ready/health, timeoutow i cleanupu.
- Zapobieganie znanym bledom E2E (deadlock na pipe, brak race z exit/error, brak walidacji ready-file).
- Uproszczenie pisania nowych testow i migracja istniejecego zestawu.
- Framework dotyczy testow w `tools/seal/seal/scripts` i ich uruchomien przez runner E2E.

## Poza zakresem (non-goals)

- Nie zmienia istniejacego runnera E2E (manifest, summary, parallelism) – framework ma byc warstwa nad testami.
- Nie zastapi pelnej logiki aplikacji/testow, tylko narzuca bezpieczne wzorce wykonania.
- Nie implementuje nowych scenariuszy; sluzy jako podstawa do migracji testow.

## Terminologia

- **Test**: pojedynczy scenariusz E2E.
- **Suite**: grupa testow uruchamiana razem.
- **Runner**: proces uruchamiajacy testy (manifest, parallel, summary).
- **Framework**: biblioteka uzywana przez testy (API + enforcement).
- **Ready**: sygnal gotowosci aplikacji (HTTP lub ready-file).
- **Baseline**: wariant bez ochrony, ktory musi przejsc, aby test ataku byl wiarygodny.

## Wymagania funkcjonalne (MUST)

1) **Jedyny sposob uruchamiania procesow**: testy uzywaja tylko wrapperow frameworka, nie `child_process.spawn`/`spawnSync`.
2) **Timeouty**: kazdy test i kazdy krok asynchroniczny ma timeout; czas globalny skaluje `SEAL_E2E_TIMEOUT_SCALE`.
3) **Race z exit/error**: `waitForReady` zawsze sciga sie z `exit` i `error`. Exit przed ready = FAIL.
4) **Drenaz stdout/stderr**: procesy uruchamiane z `pipe` musza byc drenowane, inaczej test FAIL.
5) **Ready-file**: JSON musi byc zwalidowany; dopuszczalny jest krotki retry (np. 1s).
6) **Cleanup**: procesy i zasoby tymczasowe sa sprzatane zawsze w `finally`.
7) **Baseline**: testy ataku musza miec baseline (bez ochrony). Brak baseline = SKIP/FAIL.
8) **Deterministyczny output**: test raportuje polecenie, stderr/stdout (limitowane) i effective config.

## Wymagania niefunkcjonalne (SHOULD)

- Narzut frameworka ma byc minimalny; bez nowych zaleznych runtime.
- Logi musza byc stabilne (bez ANSI), latwe do parsowania.
- Framework wspiera tryb strict (SKIP -> FAIL) dla certyfikacji.
- Framework gwarantuje izolacje (unique tmp, brak modyfikacji repo).

## API frameworka (minimalne)

Punktem wejscia jest modul `e2e-framework` (nazwa robocza), ktory zapewnia:

- `suite(name, fn)` – rejestruje suite i udostepnia kontekst `ctx`.
- `test(name, fn)` – rejestruje testy w suite.
- `ctx.runSealedBinary(opts)` – uruchamia sealed binary przez wrapper, z ready/timeout/cleanup.
- `ctx.waitForReady(opts)` – wrapper na HTTP/ready-file z walidacja i race.
- `ctx.exec(cmd, args, opts)` – bezpieczny spawn z timeoutem, drenazem, i wyjsciem.
- `ctx.tmpDir(label)` / `ctx.withTmpDir(label, fn)` – zarzadzanie temp.
- `ctx.log/ctx.warn/ctx.fail/ctx.skip` – spójne logowanie i statusy.

## Zachowanie wrapperow procesow

Wrapper uruchamiajacy proces:

- ustawia timeout i killSignal,
- drenowac stdout/stderr jesli `pipe`,
- rejestruje `exit` oraz `error`,
- zwraca wynik z kodem, sygnalem i przyciętym outputem,
- w testach z ready zawsze robi `Promise.race(ready, exit, error)`.

## Enforcement (bez mozliwosci obejscia)

1) **Monkey patch**: w procesie testu `child_process.spawn` i `spawnSync` rzucaja blad, jesli uzyte poza frameworkiem.
2) **Lint/CI**: check `rg "spawn\\(" tools/seal/seal/scripts` i FAIL, jesli nie jest allowlistowane.
3) **Template testu**: nowy test startuje z gotowego szablonu, bez miejsca na "surowy" spawn.

## Integracja z istniejacym runnerem

- Framework uzywa `e2e-utils` (np. `withSealedBinary`, `waitForReady`), ale wzmacnia je o polityki MUST.
- Runner (manifest/summary/parallel) pozostaje bez zmian.
- Framework eksportuje metadane (kategoria, wymagania) kompatybilne z manifestem.

## Tryb strict i baseline

- `SEAL_E2E_STRICT=1` konwertuje SKIP na FAIL dla testow krytycznych.
- `SEAL_E2E_REQUIRE_BASELINE=1` wymusza baseline; brak = FAIL.
- Testy ataku sa wiarygodne tylko, gdy baseline przechodzi.

## Migracja

1) Wydzielenie frameworka jako modulu.
2) Przepiecie 2-3 testow referencyjnych (thin, sentinel, obfuscation).
3) Dodanie enforcement w runnerze (patch + lint).
4) Migracja reszty testow etapami.

## Przyklad (pseudo)

```
suite("thin-anti-debug", (t) => {
  t.test("ptrace blocked", async (ctx) => {
    const app = await ctx.runSealedBinary({ releaseDir, runTimeoutMs });
    await ctx.expectBlocked("ptrace", app.pid);
  });
});
```

