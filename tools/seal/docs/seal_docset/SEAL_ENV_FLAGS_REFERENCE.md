# SEAL_ENV_FLAGS_REFERENCE - referencja flag ENV

> Cel: szybka sciaga najczesciej uzywanych flag ENV w SEAL.
> Lista nie jest kompletna; aktualizuj wraz z kodem i dokumentacja.

## Jak aktualizowac

- Gdy dodajesz nowa flage, dopisz ja tutaj i w miejscu, gdzie jest uzywana.
- Loguj "effective config" w runtime/testach (patrz SEAL_PITFALLS).
- Pelna lista w repo: `rg -o "SEAL_[A-Z0-9_]+" docs seal | sort -u`.

## Ogolne (timeouty / diagnostyka)

| Flaga | Znaczenie | Uwagi / gdzie |
| --- | --- | --- |
| `SEAL_CHECK_CC_TIMEOUT_MS` | timeout kompilatora dla `seal check` | SEAL_QUICK_START |
| `SEAL_SPAWN_TIMEOUT_MS` | globalny timeout subprocessow | alias: `SEAL_CMD_TIMEOUT_MS` |
| `SEAL_CMD_TIMEOUT_MS` | alias dla `SEAL_SPAWN_TIMEOUT_MS` | SEAL_QUICK_START |
| `SEAL_UI_E2E` | wlacza UI E2E po sealingu | SEAL_QUICK_START |

## E2E runner (lokalne / docker)

| Flaga | Znaczenie | Uwagi / gdzie |
| --- | --- | --- |
| `SEAL_E2E_CONFIG` | sciezka do pliku env (np. `.seal/e2e.env`) | SEAL_E2E_RUNBOOK |
| `SEAL_E2E_REQUIRE_ESCALATION` | wymusza / blokuje sudo | SEAL_E2E_RUNBOOK |
| `SEAL_E2E_RUNNER_HEARTBEAT_SEC` | heartbeat runnera (watchdog) | SEAL_E2E_RUNBOOK |
| `SEAL_E2E_RUN_LAYOUT` | layout runow (`auto`/`concurrent`) | SEAL_E2E_RUNBOOK |
| `SEAL_E2E_CONCURRENT` | alias dla `SEAL_E2E_RUN_LAYOUT=concurrent` | SEAL_E2E_RUNBOOK |
| `SEAL_E2E_RUN_MODE` | `single` / `parallel` | SEAL_E2E_RUNBOOK |
| `SEAL_E2E_TMP_ALLOW_EXTERNAL` | pozwala na tmp poza `seal-out/e2e` | SEAL_E2E_RUNBOOK |
| `SEAL_E2E_KEEP_RUNS` | zostaw runy po tescie | tylko debug |
| `SEAL_E2E_KEEP_TMP` | zostaw tmp po tescie | tylko debug |
| `SEAL_E2E_GC` | cleanup starych runow | SEAL_E2E_RUNBOOK |
| `SEAL_E2E_DISK_SUMMARY` | raport dysku po runie | SEAL_E2E_RUNBOOK |
| `SEAL_E2E_SEAL_OUT_WARN_GB` | prog ostrzezen dla `seal-out/e2e` | SEAL_E2E_RUNBOOK |
| `SEAL_E2E_AUTO_CLEAN` | auto cleanup run artefaktow po przekroczeniu progu | SEAL_E2E_RUNBOOK |
| `SEAL_E2E_SUMMARY_KEEP` | retencja podsumowan (run-*.tsv/json) | SEAL_E2E_RUNBOOK |
| `SEAL_E2E_LOG_KEEP` | retencja katalogow logow w cache | SEAL_E2E_RUNBOOK |
| `SEAL_E2E_WORKSPACE_BATCH_TIMEOUT_MS` | timeout testu workspace-batch (ms) | SEAL_E2E_RUNBOOK |
| `SEAL_E2E_TOOLSET` | zakres narzedzi (`full`, itp.) | SEAL_E2E_RUNBOOK |

## Docker E2E

| Flaga | Znaczenie | Uwagi / gdzie |
| --- | --- | --- |
| `SEAL_DOCKER_E2E_REMOTE` | tryb 2 kontenerow (builder + host) | SEAL_E2E_RUNBOOK |
| `SEAL_DOCKER_E2E_REMOTE_FALLBACK` | brak fallbacku do 1 kontenera | SEAL_E2E_RUNBOOK |
| `SEAL_DOCKER_E2E_HOST` | wlacza host-only testy w Docker | SEAL_E2E_RUNBOOK |

## Advanced anti-debug (strictness)

Wiele testow advanced ma flagi `SEAL_E2E_STRICT_*` sterujace tym, czy wynik
ma byc FAIL czy SKIP. Przykladowe: `SEAL_E2E_STRICT_LLDB`,
`SEAL_E2E_STRICT_PERF`, `SEAL_E2E_STRICT_CORE_BASELINE`, `SEAL_E2E_STRICT_DENY_ENV`,
`SEAL_E2E_STRICT_EXTRACT` (strings‑scan artefaktow).
Szczegoly: `SEAL_E2E_ADVANCED_RUN_SUMMARY.md`.

## Inne (preflight / deploy)

| Flaga | Znaczenie | Uwagi / gdzie |
| --- | --- | --- |
| `SEAL_PREFLIGHT_MIN_FREE_MB` | prog miejsca dla preflight | SEAL_PITFALLS |
| `SEAL_PREFLIGHT_MIN_FREE_INODES` | prog inode dla preflight | SEAL_PITFALLS |

## Powiazane dokumenty

- `SEAL_QUICK_START.md`
- `SEAL_E2E_RUNBOOK.md`
- `SEAL_E2E_ADVANCED_RUN_SUMMARY.md`
- `SEAL_PITFALLS.md`
