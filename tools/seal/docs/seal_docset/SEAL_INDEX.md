# SEAL_INDEX – Spis dokumentów i zasady docsetu

> Ten plik jest „wejściówką” do docsetu SEAL.

**Kompatybilność:**
- **CLI (seal):** używaj wersji z tego repo
- **Docset:** aktualny stan w git
- **Dokumenty stałe:** `SEAL_STANDARD`, `SEAL_CONTRACT_AI`

## Pliki w docsecie (linki)

- [SEAL_QUICK_START.md](SEAL_QUICK_START.md)
- [SEAL_FLOW_MAP.md](SEAL_FLOW_MAP.md)
- [SEAL_RELEASE_CHECKLIST.md](SEAL_RELEASE_CHECKLIST.md)
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

- [SEAL_SENTINEL_SPEC_FINAL.md](SEAL_SENTINEL_SPEC_FINAL.md) – specyfikacja sentinela (MVP‑ready)
- [SEAL_E2E_QUEUE.md](SEAL_E2E_QUEUE.md) – szkic kolejki E2E (draft)
- [SEAL_E2E_ADVANCED_RUN_SUMMARY.md](SEAL_E2E_ADVANCED_RUN_SUMMARY.md) – notatka z uruchomień advanced E2E
- [SEAL_ANTI_REVERSE_ENGINEERING_APPENDIX_A.md](SEAL_ANTI_REVERSE_ENGINEERING_APPENDIX_A.md) – appendix (verbatim)
- [SEAL_ANTI_REVERSE_ENGINEERING_APPENDIX_B.md](SEAL_ANTI_REVERSE_ENGINEERING_APPENDIX_B.md) – appendix (verbatim)
- [SEAL_ANTI_REVERSE_ENGINEERING_APPENDIX_C.md](SEAL_ANTI_REVERSE_ENGINEERING_APPENDIX_C.md) – appendix (verbatim)

## Co jest w docsecie

Docset składa się z:

- **SEAL_QUICK_START** – pierwsze 15 minut: od `seal init` do lokalnego testu sealed i pierwszego deployu.
- **SEAL_FLOW_MAP** – jednoplanszowa mapa przeplywow (build/deploy/airgap/diag).
- **SEAL_RELEASE_CHECKLIST** – checklista release (testy, deploy, artefakty).
- **SEAL_SCENARIOS** – lista typowych scenariuszy użytkownika (ściąga „co wpisać”).
- **SEAL_DEPLOY_SPEC** – wymagania i kontrakty dla narzędzia `seal` (SPEC/ARCH).
- **SEAL_DEPLOY_REFERENCE** – referencyjna implementacja i przykłady (REF).
- **SEAL_CONFIG_SPEC** – schema konfiguracji i precedencja (SOURCE OF TRUTH).
- **SEAL_COMPATIBILITY** – kompatybilność i migracje (docset/CLI/platformy).
- **SEAL_STANDARD** – standard jakości aplikacji sealowanych.
- **SEAL_E2E_FRAMEWORK_SPEC** – specyfikacja frameworka testow E2E (wspolne API i enforcement).
- **SEAL_CACHE_GUIDE** – mapa cache w Seal + polityka sprzatania i retencji.
- **SEAL_ENV_FLAGS_REFERENCE** – sciaga flag ENV (timeouty, E2E, docker).
- **SEAL_CONTRACT_AI** – krótki kontrakt „promptable” dla generatorów kodu.
- **SEAL_PITFALLS** – lista realnych błędów do uniknięcia + wymagania zapobiegawcze.
- **SEAL_TROUBLESHOOTING** – szybki runbook „symptom → fix”.
- **SEAL_PACKAGER_THIN_SPEC_SCALONA** – specyfikacja packagera `thin-split` (BOOTSTRAP).
- **SEAL_HOST_BINDING_RUNBOOK** – TPM/USB/NIC binding (payloadProtection + sentinel L4).
- **SEAL_ANTI_REVERSE_ENGINEERING** – scalony opis anti‑debug/anti‑RE + status implementacji i braki.
- **SEAL_CHANGELOG** – changelog całego docsetu.

## Legenda modalnosci

- [MUST] wymagane (brak spelnienia = blad wdrozeniowy)
- [SHOULD] silna rekomendacja
- [MAY] opcjonalne

## Jak czytać

1) Zacznij od **SEAL_QUICK_START** (jeśli chcesz szybko zobaczyć efekt).
2) Szybka orientacja: **SEAL_FLOW_MAP**.
3) Potem przeczytaj **SEAL_SCENARIOS** (żeby mieć „ściągę” do codziennej pracy).
4) Jeśli implementujesz narzędzie albo potrzebujesz precyzji: **SEAL_DEPLOY_SPEC**.
5) Jeśli implementujesz narzędzie i chcesz gotowe szablony: **SEAL_DEPLOY_REFERENCE**.
6) Jeśli piszesz/generujesz aplikację: **SEAL_CONTRACT_AI** + **SEAL_STANDARD**.

## Sciezki czytania (czas + priorytet)

- **Dev (ok. 25-35 min):** [MUST] `SEAL_QUICK_START.md`, `SEAL_SCENARIOS.md`; [SHOULD] `SEAL_PITFALLS.md`.
- **Ops/Deploy (ok. 35-50 min):** [MUST] `SEAL_DEPLOY_SPEC.md`, `SEAL_DEPLOY_REFERENCE.md`, `SEAL_TROUBLESHOOTING.md`; [SHOULD] `SEAL_CONFIG_SPEC.md`.
- **QA/E2E (ok. 25-40 min):** [MUST] `SEAL_E2E_FRAMEWORK_SPEC.md`, `SEAL_E2E_RUNBOOK.md`, `SEAL_E2E_COVERAGE.md`.
- **Security/Hardening (ok. 30-45 min):** [MUST] `SEAL_ANTI_REVERSE_ENGINEERING.md`; [SHOULD] `SEAL_HOST_BINDING_RUNBOOK.md`, `SEAL_SENTINEL_SPEC_FINAL.md`.

## Kto co czyta (szybka mapa)

- **Dev aplikacji:** `SEAL_QUICK_START.md`, `SEAL_FLOW_MAP.md`, `SEAL_SCENARIOS.md`, `SEAL_CONTRACT_AI.md`, `SEAL_STANDARD.md`
- **Deployer / ops:** `SEAL_FLOW_MAP.md`, `SEAL_DEPLOY_SPEC.md`, `SEAL_DEPLOY_REFERENCE.md`, `SEAL_CONFIG_SPEC.md`, `SEAL_TROUBLESHOOTING.md`
- **QA / E2E:** `SEAL_E2E_FRAMEWORK_SPEC.md`, `SEAL_E2E_RUNBOOK.md`, `SEAL_E2E_COVERAGE.md`
- **Security / hardening:** `SEAL_PACKAGER_THIN_SPEC_SCALONA.md`, `SEAL_HOST_BINDING_RUNBOOK.md`, `SEAL_ANTI_REVERSE_ENGINEERING.md`, `SEAL_SENTINEL_SPEC_FINAL.md`

## Najważniejsze zmiany mentalne

- **Docset jest scenariuszowy:** masz gotową listę „typowych zadań” i minimalnych komend.
- **CLI prowadzi za rękę:** `seal` bez argumentów działa jak „wizard” i mówi co dalej.
- **Lokalne testowanie zabezpieczenia jest first‑class:** `seal release` tworzy artefakt + folder do inspekcji, a `seal run-local` uruchamia sealed build lokalnie.
- **Airgap/CI ma oficjalny flow:** build artefaktu i deploy artefaktu to osobne scenariusze.
- **Są scenariusze lifecycle:** lista release, rollback, uninstall/cleanup, multi‑target.
