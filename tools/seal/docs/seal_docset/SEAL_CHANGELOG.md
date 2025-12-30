# SEAL_CHANGELOG – Changelog docsetu (v0.5)

## Repo/CLI v0.6.0 (docset v0.5.x)

### Build / struktura (P0)
- **Projekt + polityka:** przeniesione do `seal.json5` (w repo); targety/configi runtime pozostają w `seal-config/`.
- **Tylko ostatni release:** `seal-out/` jest czyszczony na każdym buildzie (brak historii i symlinków), z wyjątkiem `seal-out/cache/` (thin cache).
- **Runtime configs w jednym miejscu:** `seal-config/configs/` zamiast osobnego `config/` w root.
- **Nowa komenda `seal clean`:** usuwa `seal-out/` dla projektu (w monorepo działa na listę `projects`).
- **Utrzymanie cache:** `seal clean` czyści projekt (domyślnie cały `seal-out/`), a `seal clean-global-cache` czyści cache globalne/Docker/Playwright.
- **Toolchain cleanup:** instalatory zrodel sprzataja build/src po instalacji (`SEAL_TOOLCHAIN_KEEP_SRC=1` aby zachowac).
- **E2E run layout:** domyslnie uzywa stalego `seal-out/e2e/run/`, a dla rownoleglych runow `concurrent-runs/<run-id>` z auto‑fallbackiem i logiem.

### Deploy / serwer (P0)
- **Bootstrap SSH uproszczony:** tworzy katalogi i nadaje uprawnienia; service instalowany po deployu (bez auto‑startu).
- **Komendy serwisowe ujednolicone:** używaj `seal remote <target> <action>` (status/logs/restart/stop/disable/up/down).
- **Lepsze preflighty SSH:** `seal check <target>` podaje precyzyjne wskazówki (brak katalogu, sudo, bootstrap).

### Frontend hardening (P1)
- **Bezpieczna minifikacja HTML/CSS:** domyślnie włączona, z poziomami `safe`/`minimal` i override per‑sekcja.

### Docs (P1)
- **SEAL_PITFALLS v0.5:** zebrane realne błędy i wymagania, aby ich nie powtarzać.
- **SEAL_ANTI_REVERSE_ENGINEERING:** scalenie specyfikacji anti‑RE + tracerpid w jeden dokument z aktualnym statusem wdrożenia, decyzjami i brakami.
- **SEAL_CACHE_GUIDE v0.5:** mapa cache w Seal + polityka sprzatania i retencji.

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
- **Protection domyślnie włączony:**
  - **SEA**: main script jest pakowany do loadera (Brotli/Gzip) przed generacją blobu (bez plaintext JS w binarce),
  - **bundle** (jawnie włączony): backend bundle jest pakowany do `app.bundle.cjs.gz` + loader,
  - **thin‑split**: domyślnie włączony ELF packer (`kiteshield`, `-n`) na launcherze `b/a`,
  - `protection.strip.enabled` i alternatywne packery (`midgetpack`, `upx`) są opcjonalne i wymagają świadomego włączenia.

---

## Docset v0.4 (względem v0.3.1) – archiwum skrócone

- `env` → `config` (koniec mindfucka).
- Jedna główna komenda: `seal ship <target>` (`seal deploy` jako tryb manualny).
- `seal ship --bootstrap` zamiast osobnego kroku „server”.
- JSON5 jako wspólny format dla `seal.json5` i `seal-config/*`.
- Domyślna retencja release’ów + automatyczny cleanup.
