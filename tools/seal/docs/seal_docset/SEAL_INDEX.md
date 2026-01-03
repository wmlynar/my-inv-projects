# SEAL_INDEX – Spis dokumentów i zasady docsetu (v0.5)

> Ten plik jest „wejściówką” do docsetu SEAL.

**Wersje (kompatybilność):**
- **CLI (seal):** `0.6.0`
- **Docset:** `0.5.x` (poziom stabilności i zakres funkcji)
- **Dokumenty stałe:** `SEAL_STANDARD v1.3`, `SEAL_CONTRACT_AI v1.3`

## Pliki w docsecie (linki)

- [SEAL_QUICK_START.md](SEAL_QUICK_START.md)
- [SEAL_SCENARIOS.md](SEAL_SCENARIOS.md)
- [SEAL_DEPLOY_SPEC.md](SEAL_DEPLOY_SPEC.md)
- [SEAL_DEPLOY_REFERENCE.md](SEAL_DEPLOY_REFERENCE.md)
- [SEAL_CONFIG_SPEC.md](SEAL_CONFIG_SPEC.md)
- [SEAL_COMPATIBILITY.md](SEAL_COMPATIBILITY.md)
- [SEAL_STANDARD.md](SEAL_STANDARD.md)
- [SEAL_E2E_FRAMEWORK_SPEC.md](SEAL_E2E_FRAMEWORK_SPEC.md)
- [SEAL_E2E_RUNBOOK.md](SEAL_E2E_RUNBOOK.md)
- [SEAL_E2E_COVERAGE.md](SEAL_E2E_COVERAGE.md)
- [SEAL_CACHE_GUIDE.md](SEAL_CACHE_GUIDE.md)
- [SEAL_ENV_FLAGS_REFERENCE.md](SEAL_ENV_FLAGS_REFERENCE.md)
- [SEAL_CONTRACT_AI.md](SEAL_CONTRACT_AI.md)
- [SEAL_PITFALLS.md](SEAL_PITFALLS.md)
- [SEAL_TROUBLESHOOTING.md](SEAL_TROUBLESHOOTING.md)
- [SEAL_PACKAGER_THIN_SPEC_SCALONA.md](SEAL_PACKAGER_THIN_SPEC_SCALONA.md)
- [SEAL_HOST_BINDING_RUNBOOK.md](SEAL_HOST_BINDING_RUNBOOK.md)
- [SEAL_ANTI_REVERSE_ENGINEERING.md](SEAL_ANTI_REVERSE_ENGINEERING.md)
- [SEAL_CHANGELOG.md](SEAL_CHANGELOG.md)

**TL;DR review checklist:** zob. poczatek `SEAL_PITFALLS.md` + `SEAL_STANDARD.md` (sekcja “TL;DR dla review”).

## Dokumenty dodatkowe / robocze (poza rdzeniem docsetu)

- [SEAL_SENTINEL_SPEC_FINAL_v1.0.md](SEAL_SENTINEL_SPEC_FINAL_v1.0.md) – specyfikacja sentinela (MVP‑ready)
- [SEAL_E2E_QUEUE.md](SEAL_E2E_QUEUE.md) – szkic kolejki E2E (draft)
- [SEAL_E2E_ADVANCED_RUN_SUMMARY.md](SEAL_E2E_ADVANCED_RUN_SUMMARY.md) – notatka z uruchomień advanced E2E
- [SEAL_ANTI_REVERSE_ENGINEERING_APPENDIX_A.md](SEAL_ANTI_REVERSE_ENGINEERING_APPENDIX_A.md) – appendix (verbatim)
- [SEAL_ANTI_REVERSE_ENGINEERING_APPENDIX_B.md](SEAL_ANTI_REVERSE_ENGINEERING_APPENDIX_B.md) – appendix (verbatim)
- [SEAL_ANTI_REVERSE_ENGINEERING_APPENDIX_C.md](SEAL_ANTI_REVERSE_ENGINEERING_APPENDIX_C.md) – appendix (verbatim)

## Co jest w docsecie

Docset v0.5 składa się z:

- **SEAL_QUICK_START v0.5** – pierwsze 15 minut: od `seal init` do lokalnego testu sealed i pierwszego deployu.
- **SEAL_SCENARIOS v0.5** – lista typowych scenariuszy użytkownika (ściąga „co wpisać”).
- **SEAL_DEPLOY_SPEC v0.5** – wymagania i kontrakty dla narzędzia `seal` (SPEC/ARCH).
- **SEAL_DEPLOY_REFERENCE v0.5** – referencyjna implementacja i przykłady (REF).
- **SEAL_CONFIG_SPEC v0.5** – schema konfiguracji i precedencja (SOURCE OF TRUTH).
- **SEAL_COMPATIBILITY v0.5** – kompatybilność i migracje (docset/CLI/platformy).
- **SEAL_STANDARD v1.3** – standard jakości aplikacji sealowanych.
- **SEAL_E2E_FRAMEWORK_SPEC v0.1** – specyfikacja frameworka testow E2E (wspolne API i enforcement).
- **SEAL_CACHE_GUIDE v0.5** – mapa cache w Seal + polityka sprzatania i retencji.
- **SEAL_ENV_FLAGS_REFERENCE v0.5** – sciaga flag ENV (timeouty, E2E, docker).
- **SEAL_CONTRACT_AI v1.3** – krótki kontrakt „promptable” dla generatorów kodu.
- **SEAL_PITFALLS v0.5** – lista realnych błędów do uniknięcia + wymagania zapobiegawcze.
- **SEAL_TROUBLESHOOTING v0.5** – szybki runbook „symptom → fix”.
- **SEAL_PACKAGER_THIN_SPEC_SCALONA** – specyfikacja packagera `thin-split` (BOOTSTRAP).
- **SEAL_HOST_BINDING_RUNBOOK v0.5** – TPM/USB/NIC binding (payloadProtection + sentinel L4).
- **SEAL_ANTI_REVERSE_ENGINEERING** – scalony opis anti‑debug/anti‑RE + status implementacji i braki.
- **SEAL_CHANGELOG v0.5** – changelog całego docsetu.

## Zasady wersjonowania

- Docset ma wersję `0.x` (system jest w fazie prototypu/eksperymentów).
- Dokumenty „rdzenia” mają wersję docsetu: `SEAL_QUICK_START`, `SEAL_SCENARIOS`, `SEAL_DEPLOY_SPEC`, `SEAL_DEPLOY_REFERENCE`, `SEAL_CHANGELOG`.
- Dokumenty „stałe” (standard jakości i kontrakt AI) mają własne wersje (`v1.x`), ale są kompatybilne z docsetem, jeśli tak mówi `SEAL_QUICK_START`.

## Jak czytać

1) Zacznij od **SEAL_QUICK_START** (jeśli chcesz szybko zobaczyć efekt).
2) Potem przeczytaj **SEAL_SCENARIOS** (żeby mieć „ściągę” do codziennej pracy).
3) Jeśli implementujesz narzędzie albo potrzebujesz precyzji: **SEAL_DEPLOY_SPEC**.
4) Jeśli implementujesz narzędzie i chcesz gotowe szablony: **SEAL_DEPLOY_REFERENCE**.
5) Jeśli piszesz/generujesz aplikację: **SEAL_CONTRACT_AI** + **SEAL_STANDARD**.

## Kto co czyta (szybka mapa)

- **Dev aplikacji:** `SEAL_QUICK_START.md`, `SEAL_SCENARIOS.md`, `SEAL_CONTRACT_AI.md`, `SEAL_STANDARD.md`
- **Deployer / ops:** `SEAL_DEPLOY_SPEC.md`, `SEAL_DEPLOY_REFERENCE.md`, `SEAL_CONFIG_SPEC.md`, `SEAL_TROUBLESHOOTING.md`
- **QA / E2E:** `SEAL_E2E_FRAMEWORK_SPEC.md`, `SEAL_E2E_RUNBOOK.md`, `SEAL_E2E_COVERAGE.md`
- **Security / hardening:** `SEAL_PACKAGER_THIN_SPEC_SCALONA.md`, `SEAL_HOST_BINDING_RUNBOOK.md`, `SEAL_ANTI_REVERSE_ENGINEERING.md`, `SEAL_SENTINEL_SPEC_FINAL_v1.0.md`

## Najważniejsze zmiany mentalne w v0.5

- **Docset jest scenariuszowy:** masz gotową listę „typowych zadań” i minimalnych komend.
- **CLI prowadzi za rękę:** `seal` bez argumentów działa jak „wizard” i mówi co dalej.
- **Lokalne testowanie zabezpieczenia jest first‑class:** `seal release` tworzy artefakt + folder do inspekcji, a `seal run-local` uruchamia sealed build lokalnie.
- **Airgap/CI ma oficjalny flow:** build artefaktu i deploy artefaktu to osobne scenariusze.
- **Są scenariusze lifecycle:** lista release, rollback, uninstall/cleanup, multi‑target.
