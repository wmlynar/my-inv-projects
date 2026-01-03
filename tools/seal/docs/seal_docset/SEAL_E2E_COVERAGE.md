# SEAL_E2E_COVERAGE – Mapa pokrycia E2E

> **Cel:** szybka odpowiedź „co jest pokryte jakim testem” oraz które testy są
> core vs gated/advanced. To nie jest manifest runnera, tylko mapa pokrycia.

---

## 1) Minimalny zestaw akceptacyjny (CORE)

**MUST uruchamiać przy każdej zmianie w Sealu:**
- `test-thin-e2e.js` (SEAL_THIN_E2E=1)
- `test-thin-anti-debug-e2e.js` (SEAL_THIN_ANTI_DEBUG_E2E=1, suites=config)
- `test-ship-e2e.js` (SEAL_SHIP_E2E=1; SSH część opcjonalna)
- `test-sentinel-e2e.js` (SEAL_SENTINEL_E2E=1 jeśli dostępny target SSH)

---

## 2) Mapa pokrycia – obszary i testy

**Build / packagery:**
- `test-thin-e2e.js` – thin-split + thin-single, payload-only, native bootstrap, payload protection (secret/bind/TPM).
- `test-full-packagers-e2e.js`, `test-legacy-packagers-e2e.js` – komplet packagerów i tryby legacy.
- `test-compat-e2e.js`, `test-install-e2e.js` – kompatybilność toolchain i instalacje.

**Protection / obfuskacja / hardening:**
- `test-protection-e2e.js`, `test-full-protection-e2e.js`
- `test-obfuscation-e2e.js`
- `test-strip-e2e.js`, `test-elf-packers-e2e.js`, `test-c-obfuscators-e2e.js`
- `test-decoy-e2e.js`

**Anti‑debug / anti‑instrumentation:**
- `test-thin-anti-debug-e2e.js` (główne mechanizmy)
- `test-thin-anti-debug-*.js` (attach/env/dump/tamper/build/leaks/bootstrap) – tryby rozszerzone

**Sentinel / anti‑clone:**
- `test-sentinel-e2e.js`

**Deploy / SSH / rollback:**
- `test-ship-e2e.js` (local + SSH)
- `test-config-sync-e2e.js`
- `test-user-flow-e2e.js`

**Config / workspace / profile overlays:**
- `test-profile-overlay-e2e.js`
- `test-workspace-defaults-e2e.js`
- `test-workspace-batch-e2e.js`

**Diag / cleanup:**
- `test-diag-e2e.js`
- `test-clean-e2e.js`, `test-e2e-cleanup-e2e.js`

**UI (Playwright):**
- `test-example-ui-e2e.js` (SEAL_UI_E2E=1)

---

## 3) Gating / wymagania środowiskowe

- `SEAL_THIN_E2E=1` – podstawowe testy thin.
- `SEAL_THIN_ANTI_DEBUG_E2E=1` – anti‑debug; opcjonalne suite przez `SEAL_THIN_ANTI_DEBUG_SUITES`.
- `SEAL_SHIP_E2E=1` – deploy local; `SEAL_SHIP_SSH_E2E=1` + SSH env dla testów zdalnych.
- `SEAL_UI_E2E=1` – UI/Playwright.
- `SEAL_E2E_REAL_DUMP=1` – testy dump (gdb/gcore/avml).
- `SEAL_E2E_TOOLSET=full` – pełny toolset (kiteshield/ollvm/itd.).

---

## 4) Znane luki w pokryciu (jawne)

- **TPM payloadProtection**: testy wymagają realnego TPM + tpm2-tools (często SKIP).
- **VM/hypervisor heurystyki**: tylko CPUID hypervisor bit (opcjonalny); brak głębokich heurystyk.
- **Systemd hardening strict/sandbox**: wymaga środowiska z pełnym systemd; w CI bywa SKIP.
- **USB external anchor w sentinel**: wymaga realnego device (często SKIP).

---

## 5) Dodawanie nowych testów (MUST)

- Test musi mieć jasną kategorię i odpowiadać konkretnemu REQ (SPEC/STD/PIT).
- Gdy test wymaga narzędzia lub uprawnień, musi być **SKIP z instrukcją**.
- Testy muszą być bezpieczne dla równoległości (unikalne porty, tmp, serviceName).

---

## 6) Cross‑reference

- `SEAL_E2E_FRAMEWORK_SPEC.md` — docelowy framework i wymogi techniczne.
- `SEAL_E2E_RUNBOOK.md` — jak uruchamiać E2E.
- `SEAL_PITFALLS.md` — lista realnych regresji do uniknięcia.
