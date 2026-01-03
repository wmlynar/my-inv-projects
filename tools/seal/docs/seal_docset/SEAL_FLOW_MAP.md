# SEAL_FLOW_MAP – Mapa przeplywow (v0.5)

> **Cel:** jedna strona, ktora pokazuje glowne sciezki: build, deploy, airgap, diagnostyka.
> Szczegoly: `SEAL_QUICK_START.md`, `SEAL_DEPLOY_SPEC.md`, `SEAL_DEPLOY_REFERENCE.md`.

**Legenda modalnosci:** [MUST] wymagane, [SHOULD] silna rekomendacja, [MAY] opcjonalne.

---

## 1) Build + lokalna walidacja (najczestsza sciezka)

1) [MUST] `seal check <target>`
2) [MUST] `seal release`
3) [SHOULD] `seal verify --explain`
4) [SHOULD] `seal run-local`

Powiazane: `SEAL_QUICK_START.md`, `SEAL_PITFALLS.md`, `SEAL_TROUBLESHOOTING.md`.

---

## 2) Deploy (lokalny lub SSH)

1) [MUST] Pierwszy raz: `seal ship <target> --bootstrap`
2) [MUST] Kolejne release: `seal ship <target>`
3) [SHOULD] `seal remote <target> status` + `seal remote <target> logs`
4) [MAY] `seal rollback <target>`

Powiazane: `SEAL_DEPLOY_SPEC.md`, `SEAL_DEPLOY_REFERENCE.md`.

---

## 3) Airgap / CI (build-only + deploy-only)

1) [MUST] `seal release --artifact-only`
2) [MUST] Przenies artefakt `.tgz` na host docelowy
3) [MUST] `seal deploy --artifact <path> <target>`
4) [SHOULD] `seal remote <target> status`

Powiazane: `SEAL_DEPLOY_REFERENCE.md` (sekcja airgap/CI).

---

## 4) Diagnostyka i naprawa

1) [MUST] `seal diag <target>`
2) [SHOULD] `seal config explain <target>`
3) [SHOULD] `seal verify --explain`
4) [MAY] `seal remote <target> logs`

Powiazane: `SEAL_TROUBLESHOOTING.md`, `SEAL_PITFALLS.md`.

---

## 5) Hardening (opcjonalnie)

1) [MUST] Okresl profile: `build.securityProfile`, `build.obfuscationProfile`
2) [SHOULD] Wybierz binding: TPM/secret/NIC (`SEAL_HOST_BINDING_RUNBOOK.md`)
3) [MAY] Sentinel L4 (external anchor)

Powiazane: `SEAL_ANTI_REVERSE_ENGINEERING.md`, `SEAL_HOST_BINDING_RUNBOOK.md`.
