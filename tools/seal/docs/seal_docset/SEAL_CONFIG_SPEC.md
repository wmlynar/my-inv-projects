# SEAL_CONFIG_SPEC – Specyfikacja konfiguracji i precedencji (v0.5)

> **Cel:** jedna, spójna specyfikacja: jakie pliki konfiguracji istnieją, jak się składają,
> jaka jest precedencja i jakie są domyślne wartości. Ten dokument jest normatywny
> tam, gdzie używa MUST/SHOULD/MAY.

---

## 1) Pliki i ich role

**Źródła prawdy (MUST):**
- `seal.json5` — konfiguracja projektu (build/deploy/policy/sentinel).
- `seal-config/configs/<config>.json5` — runtime config aplikacji (kopiowany do `config.runtime.json5`).
- `seal-config/targets/<target>.json5` — definicje targetów (host, installDir, readiness, preflight).
- `seal-config/standard.lock.json` — deklaracja zgodności z SEAL_STANDARD (moduły + wersja).

**Pliki generowane (MUST NOT jako źródło prawdy):**
- `seal-out/**` — artefakty i staging; mogą być kasowane.
- `config.runtime.json5` — generowany runtime config (kopia z `seal-config/configs`).

---

## 2) Precedencja i merge (MUST)

### 2.1. Hierarchia źródeł
1) **Workspace defaults** (`seal.json5` z `projects` + `defaults` w parentach) — scalane od najdalszego parenta do najbliższego.
2) **Projekt** (`seal.json5` w katalogu projektu) — nadpisuje defaults.
3) **Profile overlay** (`build.profileOverlays.<name>` + `--profile-overlay/--fast`) — nadpisuje **tylko** `build.*`, nie zapisuje się na dysku.
4) **Target** (`seal-config/targets/<target>.json5`) — nadpisuje tylko pola dopuszczone do override (szczegóły niżej).
5) **CLI** — override tylko w obrębie danej komendy (np. `--packager`, `--config`, `--wait-*`).
6) **ENV** — override tam, gdzie jest jawnie wspierany (patrz `SEAL_ENV_FLAGS_REFERENCE.md`).

**Zasada globalna:** jeśli dla danej opcji istnieje CLI i ENV, **CLI ma wyższy priorytet**.

### 2.2. Zasady merge
- **Deep-merge** obiektów (rekurencyjnie), **tablice są nadpisywane** (nie łączone).
- `undefined` nie nadpisuje wartości bazowej.
- Klucze `__proto__`, `constructor`, `prototype` są ignorowane (ochrona przed prototype pollution).

### 2.3. Konwencje domyślne
- `target` domyślny: `defaultTarget` z projektu → `local` (jeśli istnieje) → `local` (fallback).
- `config` domyślnie = `target` (override tylko `--config` lub `targets/<target>.json5: config`).

---

## 3) Schema: `seal.json5` (projekt)

### 3.1. Pola core
- `appName` (string) — domyślnie: `package.json:name` (sanity) lub nazwa katalogu.
- `entry` (string) — domyślnie: `package.json:main` → `src/index.js` → `index.js`.
- `defaultTarget` (string) — domyślnie: `local`.
- `policy` (object) — retencja release’ów (patrz `SEAL_DEPLOY_SPEC.md`, sekcja retencji).

### 3.2. `build` (MUST)
Kluczowe pola (pełny opis w `SEAL_DEPLOY_SPEC.md` + `SEAL_PACKAGER_THIN_SPEC_SCALONA.md`):
- `packager`: `auto|thin-split|thin-single|sea|bundle|none` (domyślnie `auto`).
- `securityProfile`: `minimal|balanced|strict|max` (domyślnie `strict`).
- `obfuscationProfile`: `none|minimal|balanced|strict|max` (domyślnie `balanced`).
- `thin`: obiekt z opcjami packagera `thin-split` (mode/level/envMode/runtimeStore/antiDebug/integrity/nativeBootstrap/payloadProtection/...).
- `protection`: obiekt ochrony artefaktu (seaMain/bundle/strip/elfPacker/cObfuscator/nativeBootstrapObfuscator/strings).
- `frontendObfuscation` (domyślnie włączone, profil `balanced`).
- `frontendMinify` (domyślnie włączone, poziom `safe`).
- `includeDirs` (domyślnie `['public','data']`).
- `decoy`, `watermark` (domyślnie wyłączone, opis w `SEAL_ANTI_REVERSE_ENGINEERING.md`).
- `profileOverlays` — mapy overlay dla `--profile-overlay`.

### 3.3. `deploy`
- `autoBootstrap` (boolean, domyślnie `true`).
- `systemdHardening` (boolean|string|object, domyślnie `baseline`).

### 3.4. `sentinel`
- `build.sentinel` (object/boolean + opcjonalny `profile`).
- Szczegóły: `SEAL_SENTINEL_SPEC_FINAL_v1.0.md`.

### 3.5. Workspace-only (`seal.json5` w root workspace)
- `projects`: lista podprojektów (ścieżki względne).
- `defaults`: obiekt nakładany na każdy projekt (deep-merge, tablice nadpisywane).

---

## 4) Schema: `seal-config/targets/<target>.json5`

**Pola podstawowe:**
- `target` (string) — nazwa; domyślnie z nazwy pliku.
- `kind`: `local|ssh` (domyślnie auto z `host`).
- `host`, `user`, `sshPort` (SSH).
- `serviceScope`: `user|system` (domyślnie `user`).
- `installDir` (absolute) — domyślnie `~/.local/share/seal/<app>` (local) lub `/home/admin/apps/<app>` (ssh).
- `serviceName` (string) — domyślnie `appName`.
- `config` (string) — domyślnie `target`.
- `packager` — override `build.packager` tylko dla tego targetu.

**Override dozwolone na target (MUST):**
- `thin.*` — target nadpisuje `build.thin.*` (np. `level`, `envMode`, `payloadProtection`).
- `deploy.systemdHardening` — target > project.
- `sentinel` / `build.sentinel` — target > project.
- `readiness` — tylko target (URL/timeouty/waitMode).
- `preflight` — tylko target (minFreeMb/tmpDir/requireTools/requireSudo/allowNoexec).

**Nie-mieszane (MUST):**
- runtime config aplikacji nie jest scalany z `seal.json5` — pochodzi wyłącznie z `seal-config/configs/<config>.json5`.

---

## 5) Schema: `seal-config/configs/<config>.json5`

- JSON5 (dowolna struktura zgodna z aplikacją).
- W runtime trafia do `config.runtime.json5` (CWD = katalog release).
- Seal **nie** wykonuje merge z `seal.json5`.

---

## 6) Walidacja i typy (MUST/SHOULD)

- Typy są **twardo** walidowane (boolean to boolean, liczby to number). Brak coercion.
- Ścieżki (`installDir`, `externalAnchor.file.path`) muszą być absolutne i bez whitespace.
- `serviceName`, `target`, `config` muszą być bezpiecznymi identyfikatorami (brak `/`, `..`, znaków kontrolnych).
- `seal config explain` i `seal check` **logują efektywną konfigurację** i źródła override.

---

## 7) Efektywna konfiguracja (diagnostyka)

- `seal config explain <target>` — pokazuje źródła kluczowych opcji (default/project/target/overlay/ENV/CLI).
- `seal check <target>` — waliduje toolchain i konfigurację w kontekście targetu.

---

## 8) Cross-reference

- `SEAL_DEPLOY_SPEC.md` — pełny opis polityk i kontraktów.
- `SEAL_PACKAGER_THIN_SPEC_SCALONA.md` — szczegóły `build.thin.*`.
- `SEAL_ANTI_REVERSE_ENGINEERING.md` — profile bezpieczeństwa i hardening.
- `SEAL_SENTINEL_SPEC_FINAL_v1.0.md` — sentinel i external anchor.
- `SEAL_ENV_FLAGS_REFERENCE.md` — env override.
