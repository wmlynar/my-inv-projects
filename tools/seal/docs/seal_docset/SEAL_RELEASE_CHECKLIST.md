# SEAL_RELEASE_CHECKLIST – checklista release

Cel: twarda, powtarzalna checklista do wypuszczenia Seala.

## A. Stabilizacja zakresu

- Zamrozic scope releasu (lista funkcji, bez nowych)
- Zamknac otwarte regresje blokujace
- Uzgodnic semver i plan migracji (jesli dotyczy)

## B. Wersjonowanie i dokumentacja

- Zaktualizowac `SEAL_CHANGELOG.md` (sekcja releasu)
- Zaktualizowac `SEAL_QUICK_START.md` i `SEAL_TROUBLESHOOTING.md`
- Zweryfikowac `SEAL_ENV_FLAGS_REFERENCE.md` (nowe flagi)
- Sprawdzic `SEAL_INDEX.md` (linki i aktualnosc docsetu)

## C. Testy (must pass)

- E2E local: toolset=core + toolset=full
- E2E docker (2 kontenery): toolset=full + host-only testy
- E2E diag (SEAL_DIAG_E2E=1)
- Smoke: `seal check`, `seal release`, `seal run-local --sealed`

## D. Deploy smoke

- `seal ship` na staging (local + ssh)
- Weryfikacja health/ready i UI (jesli dotyczy)
- Test auto-bootstrap i rollback

## E. Artefakty

- Build binarek/CLI i checksumy
- Build/push obrazow docker (jesli dotyczy)
- Weryfikacja wersji (`seal --version`)

## F. Tag i publikacja

- Tag release w git
- Release notes (skrot z changelogu)
- Finalny push i weryfikacja CI

## G. Post-release

- Monitorowanie pierwszych deployow
- Plan hotfix i okno wsparcia
