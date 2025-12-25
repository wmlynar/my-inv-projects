# SEAL_CHANGELOG – Changelog docsetu (v0.5)

## Repo/CLI v0.6.0 (docset v0.5.x)

### Build / struktura (P0)
- **Projekt + polityka:** przeniesione do `seal.json5` (w repo); targety/configi runtime pozostają w `seal-config/`.
- **Tylko ostatni release:** `seal-out/` jest czyszczony na każdym buildzie (brak historii i symlinków), z wyjątkiem `seal-out/cache/` (thin cache).
- **Runtime configs w jednym miejscu:** `seal-config/configs/` zamiast osobnego `config/` w root.

### Deploy / serwer (P0)
- **Bootstrap SSH uproszczony:** tworzy katalogi i nadaje uprawnienia; service instalowany po deployu (bez auto‑startu).
- **Nowa komenda `seal stop <target>`:** stop + disable autostart (systemd).
- **Lepsze preflighty SSH:** `seal check <target>` podaje precyzyjne wskazówki (brak katalogu, sudo, bootstrap).

### Frontend hardening (P1)
- **Bezpieczna minifikacja HTML/CSS:** domyślnie włączona, z poziomami `safe`/`minimal` i override per‑sekcja.

### Docs (P1)
- **SEAL_PITFALLS v0.5:** zebrane realne błędy i wymagania, aby ich nie powtarzać.

## Docset v0.5 (względem v0.4)

### UX / prostota (P0)
- **Docset jest scenariuszowy:** dodany dokument **SEAL_SCENARIOS v0.5** + rozbudowane scenariusze w SPEC.
- **`seal` jako wizard (MUST):** uruchomienie `seal` bez argumentów wykrywa stan projektu i podpowiada „co dalej”.
- **Domyślności, żeby nie pisać tego samego:**
  - `seal release` / `seal verify` / `seal run-local` używają domyślnego targetu (`default_target`) lub `local`.
  - domyślnie `config == target` (override tylko jeśli naprawdę chcesz).
- **`seal release` jest jedną bramką:** domyślnie uruchamia `seal check` (fail-fast), buduje artefakt i przygotowuje folder do inspekcji.
- **Lokalne testy zabezpieczenia są first‑class:**
  - `seal release` rozpakowuje build do `seal-out/release/` (zawsze tylko ostatni release),
  - `seal run-local` uruchamia `seal-out/release/` z właściwą konfiguracją runtime.

### Scenariusze „z realu” (P0/P1)
- Oficjalnie opisane:
  - **toolchain install/update** (prefetch offline),
  - **preflight** (`seal check` i auto-check w `seal release`),
  - **build-only vs deploy-only** (CI/airgap) przez `seal release --artifact-only` i `seal deploy --artifact`,
  - **diagnostyka** (`seal-out/run/`) jako scenariusz użytkowy,
  - **manual rollback + lista wersji** (`seal releases`, `seal rollback`),
  - **uninstall/cleanup** (`seal uninstall`),
  - **multi-target deploy** (fleet) jako wprost wspierany flow.

### Spójność terminologii (P0)
- Utrzymane: **target + config**, brak pojęcia „env” jako bytu konfiguracyjnego Seala.
- Dokumenty `SEAL_STANDARD` i `SEAL_CONTRACT_AI` doprecyzowane i zsynchronizowane (v1.3).

### Bezpieczeństwo / utrudnianie analizy (P0/P1)
- **Frontend obfuskacja domyślnie włączona:** `public/**/*.js` (bez `*.min.js`) jest obfuskowane podczas `seal release`.
- **Frontend minifikacja domyślnie włączona:** `public/**/*.html` i `public/**/*.css` (bez `*.min.html`/`*.min.css`) są bezpiecznie minifikowane podczas `seal release`.
- Minifikacja ma poziomy (`safe`/`minimal`) oraz opcje per-zachowanie (komentarze/whitespace).
- SEAL nie zapisuje żadnych "toolowych" markerów w release (np. `public/.seal_frontend_obfuscated` nie trafia do artefaktu).
- **Hardening domyślnie włączony:**
  - **SEA**: main script jest pakowany do loadera (Brotli/Gzip) przed generacją blobu (bez plaintext JS w binarce),
  - **fallback** (jawnie włączony): backend bundle jest pakowany do `app.bundle.cjs.gz` + loader,
  - `strip`/`upx` są dostępne jako opcje, ale **OFF by default** (kompatybilność postject).

---

## Docset v0.4 (względem v0.3.1) – archiwum skrócone

- `env` → `config` (koniec mindfucka).
- Jedna główna komenda: `seal deploy <target>` (`seal ship` jako alias).
- `seal deploy --bootstrap` zamiast osobnego kroku „server”.
- JSON5 jako wspólny format dla `seal.json5` i `seal-config/*`.
- Domyślna retencja release’ów + automatyczny cleanup.
