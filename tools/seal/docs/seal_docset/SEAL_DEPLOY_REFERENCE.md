# SEAL_DEPLOY_REFERENCE – Referencyjna implementacja (v0.5)
> **Cel:** ten dokument jest w 100% **REF**: zawiera blueprinty, przykłady, template’y i „jak to zrobić dziś”.
>
> **Ważne:** jeśli REF i SPEC kiedykolwiek się rozjadą, **SPEC wygrywa**.

---

## 1. Co tu jest

W docsecie v0.5 wynosimy z SEAL-DEPLOY-SPEC długie elementy implementacyjne, żeby specyfikacja nie była zakładnikiem aktualnych narzędzi.

W szczególności: przeniesiona sekcja **14.6** (blueprint implementacji SEA).

## 1.1 Wymagania (Ubuntu, zanim zainstalujesz SEAL)

Jeśli planujesz używać packagera `thin` (AIO), potrzebujesz kompilatora C oraz zstd:

```bash
sudo apt-get update
sudo apt-get install -y build-essential pkg-config zstd libzstd-dev
```

---

## 2. Blueprint: implementacja „super sealing (SEA)”

Poniższa treść pochodzi z poprzednich wersji i jest utrzymywana jako REF.

### 14.6. Blueprint implementacji „super sealing (SEA)” w Seal (konkretny plan)

> **Cel tej sekcji:** opisać wprost, jak to zakodować w pierwszej wersji Seala, żeby implementacja była mechaniczna (bez interpretowania intencji).

#### 14.6.1. MVP platformowy
- **MVP:** Linux `x86_64` (najprostszy i najbardziej przewidywalny start).
- Kolejne platformy (opcjonalnie): Linux `arm64`, Windows, macOS.
- Wymóg: release jest **per target OS/arch** (nie próbujemy robić „jednej binarki na wszystko”).

#### 14.6.2. Packager jako moduł (plug-in)
Seal powinien mieć interfejs packagera, aby można było podmieniać metodę pakowania bez zmiany CLI i formatu paczki.

- `packagers/sea` – domyślny (super sealing).
- `packagers/fallback` – alternatywny (na wypadek ograniczeń SEA), ale **ten sam format outputu**.

**Kontrakt packagera (proponowany):**
- input: `projectRoot`, `entry`, `appName`, `target`, `buildId`, `obfuscationProfile`, `options`
- output: ścieżka do folderu `releaseDir` w stagingu zawierającego pliki do spakowania.

#### 14.6.3. Sugerowana struktura kodu w repo seala
- `src/packagers/sea.ts` – implementacja SEA packagera
- `src/build/bundle.ts` – bundlowanie (np. esbuild)
- `src/build/obfuscate.ts` – obfuskacja (np. javascript-obfuscator)
- `src/toolchain/node.ts` – pinowana binarka Node do SEA (blob + runtime)
- `src/toolchain/postject.ts` – injekcja blobu do binarki
- `src/release/manifest.ts` – generacja `manifest.json`
- `src/release/tar.ts` – pakowanie `.tgz`
- `src/ssh/*` – deploy/ssh helpers (już opisane w sekcjach deploy)

#### 14.6.4. Staging i layout plików (żeby nic nie „brudziło” repo)
- Seal buduje w stagingu:
  - `seal-out/stage/...`
- Finalnie generuje:
  - `seal-out/<app>-<buildId>.tgz`
  - (opcjonalnie lokalnie) `seal-out/<app>-<buildId>.debug/` (sourcemapy, raporty obfuskacji – **nie wysyłane** na serwer)

#### 14.6.5. Konkretne kroki w „build sealed release” (SEA)

> W CLI użytkownika ta faza jest częścią `seal deploy`. W implementacji możesz ją mieć jako wewnętrzną funkcję lub subkomendę (np. `seal build`).

**A) Bundle do jednego pliku CJS**
- wejście: `entry` (np. `src/server.js`)
- wyjście: `seal-out/stage/bundle.cjs`
- wymagania bundla:
  - `format=cjs` (SEA wymaga CommonJS)
  - `platform=node`
  - `splitting=false` (zero chunków)
  - brak runtime-ładowania modułów z dysku (bundle ma być self-contained)
  - sourcemap jako plik zewnętrzny tylko lokalnie (np. `app.cjs.map` w debug dir)

**B) Obfuskacja**
- wejście: `bundle.cjs`
- wyjście: `bundle.obf.cjs`
- profile: `safe`, `aggressive` (domyślny), `max` (opcjonalny)
- zasada: obfuskacja działa na **pojedynczym** zbundlowanym pliku.

**C) Generacja blobu SEA**
- Seal tworzy `sea-config.json` w stagingu wskazujący `main=bundle.obf.cjs` i `output=sea-prep.blob`.
- Seal uruchamia pinowaną binarkę Node:
  - `node --experimental-sea-config sea-config.json`
- Wymóg: pinowana wersja Node użyta do blobu i do binarki runtime musi być zgodna (ta sama linia wersji w toolchainie).

**D) Złożenie binarki (copy node + inject)**
- Seal kopiuje pinowaną binarkę `node` do `seal-out/release/<app>`.
- Seal injekuje blob `sea-prep.blob` do binarki narzędziem `postject` (zainstalowanym lokalnie jako część Seala/toolchainu – bez `npx`).
- Seal ustawia tryb ograniczający runtime-injection argumentów (np. blokowanie rozszerzeń `execArgv`), aby utrudnić manipulacje na hoście docelowym.

**E) (Opcjonalnie) Read-only assets w środku artefaktu**
- Jeśli pewne zasoby są read-only i są częścią IP, Seal ma wspierać ich dołączenie:
  - preferowane: przez import/require (wchodzą do bundla),
  - alternatywnie: przez mechanizm assets SEA (jeśli packager to wspiera w danej wersji).

**F) Hardening/pack (domyślnie włączone)**
- Domyślnie SEAL próbuje wykonać `strip` (Linux) oraz spakować binarkę przez `upx` (jeśli dostępny).
- Gdy SEA nie jest możliwe i **fallback jest jawnie włączony**, backend bundle jest pakowany do `app.bundle.cjs.gz` i uruchamiany przez mały loader (żeby nie leżał czytelny plik JS).
- Fallback wymaga jawnego włączenia: `build.allowFallback=true` lub `packager=fallback`.
- Hardening można wyłączyć w `seal-config/project.json5` (`build.hardening.enabled=false`).
- (MAY w przyszłości) self-integrity / anti-tamper jako opt-in.

**G) Manifest i paczka `.tgz`**
- Seal generuje `manifest.json` (wymagane pola w sekcji 25.4) oraz checksumy.
- Seal tworzy folder release w stagingu, np. `seal-out/release/` z:
  - `<app>` (single executable),
  - `manifest.json`,
  - `config.runtime.json5` jako plik runtime (pusty placeholder albo kopia), który przed startem jest nadpisywany kopią `shared/config.json5` przez `appctl run`.
- Seal pakuje `release/` do `seal-out/<app>-<buildId>.tgz`.
- Wymóg: paczka **nie** zawiera sourcemap, nie zawiera źródeł projektu.

#### 14.6.6. Toolchain (offline-friendly)
- Seal utrzymuje własny toolchain (pinowane wersje):
  - Node (do SEA i runtime),
  - postject,
  - bundler,
  - obfuscator.
- Toolchain jest częścią instalacji Seala (globalnie), a nie repo projektu.
- Seal nie pobiera nic z internetu podczas `seal release` (może wymagać wcześniejszego przygotowania toolchainu).

#### 14.6.7. Minimalne wymagania dla aplikacji (żeby SEA działało stabilnie)
- brak `eval` / `new Function`.
- brak dynamicznych `require()`/importów po stringach.
- brak ładowania własnych modułów/plików „po ścieżkach projektu” w runtime (wszystko ma być w bundlu albo w shared).
- config runtime zawsze z `config.runtime.json5`.


---

## 3. Przykłady ergonomii v0.4 (REF)

### 3.1. `seal explain` – przykładowy output

```
$ seal explain robot-01

EFFECTIVE CONFIG (robot-01)

project.json5:
  app.name = my-app
  seal.packager = sea
  seal.obfuscation = aggressive
  retention.keep_releases = 1

robot-01.json5:
  host = 10.0.0.23
  user = robot

runtime (repo):
  config = robot-01
  configPath = config/robot-01.json5

healthcheck:
  url = http://127.0.0.1:8080/healthz  (from config.http.port)

NOTES:
  - No hidden defaults: use `seal print-defaults`.
```


### 3.2. `seal target add` – przykładowo generowany plik

```json5
// seal-config/targets/robot-01.json5 (generated)
// Wszystkie pola są jawne (nawet jeśli default).
{
  host: "10.0.0.23",
  user: "robot",
  sshPort: 22,
  // accept-new | yes | no | ask
  sshStrictHostKeyChecking: "accept-new",
  installDir: "/home/admin/apps/my-app",
  serviceName: "my-app",
  serviceUser: "my-app",

  // MAY: hardening preset
  // hardening: "baseline",
}
```


### 3.3. `seal config add` – przykładowo generowany plik

```json5
// config/robot-01.json5 (generated template)
{
  http: {
    port: 8080,
  },

  // ... reszta configu aplikacji ...
}
```

---

## 4. Artefakty `seal-out/run/` + `seal plan` + paczka dla AI (`seal-out/ai.zip`) (REF)

### 4.1. Katalog `seal-out/run/` (ostatni run, nadpisywany)

> Intencja: odpowiednik Mavenowego `target/` – zawsze wiadomo, gdzie są najświeższe artefakty.

Minimalna struktura (wymagana w v0.4):

```text
seal-out/run/
  plan.md
  plan.json
  run.log
  run.json
  verify-report.json
  context.json
```

Po błędzie SEAL SHOULD zachować jeden snapshot awarii:

```text
seal-out/run.last_failed/
  (ta sama struktura co `seal-out/run/`)
```

### 4.2. `seal plan <target>` – minimalny przykład `plan.json`

> `plan.json` jest *dla AI i narzędzi*, `plan.md` – *dla człowieka*.  
> Najważniejsze: **decision trace** (co wybrano i dlaczego).

```json
{
  "version": 1,
  "target": "robot-01",
  "profile": "prod",
  "initMode": "ADOPT",
  "inputs": {
    "projectRoot": ".",
    "entry": "src/index.js",
    "uiDir": "public/"
  },
  "resolvedConfig": {
    "packager": "sea",
    "obfuscation": "aggressive",
    "frontendObfuscation": {"enabled": true},
    "frontendMinify": {"enabled": true, "level": "safe"},
    "hardening": {"enabled": true}
  },
  "decisions": [
    {
      "id": "INIT_MODE",
      "chosen": "ADOPT",
      "alternatives": ["NEW"],
      "reason": "Wykryto istniejący projekt (package.json + src/)."
    },
    {
      "id": "PACKAGER",
      "chosen": "sea",
      "alternatives": ["fallback"],
      "reason": "Brak wykrytych blockerów SEA; profil=prod."
    }
  ],
  "steps": [
    {
      "id": "CHECK",
      "cmd": "seal check robot-01",
      "cwd": ".",
      "envVars": {},
      "expectedOutputs": ["stdout", "stderr", "exitCode"]
    },
    {
      "id": "RELEASE",
      "cmd": "seal release robot-01",
      "cwd": ".",
      "envVars": {},
      "expectedArtifacts": ["seal-out/my-app-<buildId>.tgz"]
    },
    {
      "id": "SHIP",
      "cmd": "seal ship robot-01",
      "cwd": ".",
      "envVars": {},
      "expectedRemoteState": ["systemd running", "healthz ok"]
    }
  ],
  "expectedArtifacts": {
    "runDir": "seal-out/run/",
    "aiBundle": "seal-out/ai.zip"
  }
}
```

### 4.3. Minimalny `ai_prompt.md` (template)

> Ten plik ma sprawić, że AI od razu rozumie kontekst i wie, jaki ma „definition of done”.

```md
# SEAL AI Diagnostic Prompt

## Cel
Zdiagnozuj dlaczego `seal ship` / `seal release` / `seal verify` nie przeszło i zaproponuj minimalną poprawkę.

## Kontekst
- Narzędzie: SEAL (seal-deploy) v0.5
- Projekt: Node.js (SEA)
- Profil: {{profile}}
- Target: {{target}}

## Co jest w paczce
- plan.md / plan.json (decyzje i kroki)
- run.log / run.json (logi i wyniki kroków)
- verify-report.json (reguły i naruszenia)
- context.json (wersje toolchain, OS, parametry)

## Oczekiwany rezultat
1) Krótka diagnoza (1–3 hipotezy, z uzasadnieniem).
2) Konkretne poprawki (najlepiej patch/diff lub komendy).
3) Jeśli problem jest ograniczeniem SEA/obfuskacji – wskaż fallback i minimalny kompromis.
```

### 4.4. Minimalny `manifest.json` w `seal-out/ai.zip`

```json
{
  "format": "seal-ai-bundle",
  "version": 1,
  "generatedAt": "2025-12-21T04:30:00Z",
  "files": [
    { "path": "plan.md", "sha256": "<sha256>", "bytes": 1234 },
    { "path": "plan.json", "sha256": "<sha256>", "bytes": 2345 },
    { "path": "run.log", "sha256": "<sha256>", "bytes": 3456 },
    { "path": "run.json", "sha256": "<sha256>", "bytes": 4567 },
    { "path": "verify-report.json", "sha256": "<sha256>", "bytes": 5678 },
    { "path": "context.json", "sha256": "<sha256>", "bytes": 6789 },
    { "path": "ai_prompt.md", "sha256": "<sha256>", "bytes": 7890 }
  ]
}
```


## 5. Support bundle – sugerowany format (REF)

Propozycja pliku:
- `bundle_<app>_<target>_<buildId>_<mode>.tar.gz`

Struktura:
- `status.json`
- `manifest.json`
- `journal.jsonl` (ostatnie N minut)
- `unit.service`
- `seal_ship_report.json` (jeśli dostępne)
- `config_snapshot.json5` (tylko w trybie `full`)

---

## 6. UX / ergonomia CLI (v0.5)

Ta sekcja jest stricte „jak to zaimplementować”, żeby SEAL był używalny codziennie (częste scenariusze, zero pamiętania).

### 6.1. `seal` bez argumentów jako wizard (MUST)

**Cel:** użytkownik wpisuje `seal` i dostaje 3–5 komend „co dalej”.

Proponowana implementacja:
1) wykryj root projektu (`seal-config/standard.lock.json`); jeśli brak – komunikat „to nie jest projekt SEAL” + sugestia `seal init`.
2) wykryj stan:
   - brak `seal-config/` / brak `config/local.json5` → `seal init`,
   - brak targetów → `seal target add local`,
   - brak artefaktu → `seal release`,
   - jest artefakt → `seal verify` i `seal run-local`,
   - są targety serwerowe → `seal deploy <target>` + `seal status <target>`.
3) wypisz propozycje jako copy/paste (bez „filozofii”).

### 6.2. Rozpoznanie default target/config

Minimalny algorytm (zgodny ze SPEC v0.5):
- `default_target` z `seal-config/project.json5` → jeśli istnieje,
- inaczej `local` → jeśli istnieje,
- inaczej jedyny target → jeśli jest dokładnie jeden,
- inaczej: lista + wybór (interaktywnie) albo błąd z instrukcją.

`config` domyślnie = `target` (override tylko `--config`).

### 6.3. `seal-out/` – folder do inspekcji i local-run

Cel: po `seal release` użytkownik ma gotowy folder „do oglądania” i „do uruchomienia”.
`seal-out/` jest czyszczony przy każdym release (zostaje tylko ostatni build).
To katalog w pełni generowany (jak `target/`), więc nie trzymaj w nim nic ręcznie i dodaj go do `.gitignore`.

Struktura:
- `seal-out/release/` – rozpakowany release (jak na serwerze, ale lokalnie),
- `seal-out/meta.json` – metadane (buildId, artifact path, config),
- `seal-out/<app>-<buildId>.tgz` – artefakt release.

### 6.4. `seal run-local`

Implementacja:
- znajdź `seal-out/release/` (jeśli nie istnieje – zasugeruj `seal release` albo wykonaj `seal release` automatycznie),
- wybierz config (domyślnie `local`, override `--config`),
- skopiuj `config/<config>.json5` → `seal-out/release/config.runtime.json5`,
- uruchom binarkę w foreground (CWD = `seal-out/release/`),
- przekaż stdout/stderr 1:1.

---

## 7. Deploy-only / airgap (`seal deploy --artifact`)

**Cel:** rozdzielić build (tam gdzie są źródła) od deployu (tam gdzie jest tylko artefakt).

Implementacja:
- `seal deploy --artifact <path>`:
  - weryfikuje artefakt (`seal verify`) zanim zacznie SSH,
  - uploaduje `.tgz` i rozpakowuje po stronie serwera,
  - reszta algorytmu jak normalnie (switch/restart/health/rollback),
  - generuje `seal-out/run/` i `seal-out/ai.zip` tak samo.

---

## 7.1. Fast ship (unsafe) (`seal ship --fast`)

**Cel:** ultra-szybkie prototypowanie bez SEA (fallback bundle + rsync).

Zasady:
- `seal ship <target> --fast` buduje fallback bundle i synchronizuje go na serwer przez `rsync` (bez `.tgz`).
- Zawsze tworzy nowy katalog release: `appName-fast-<buildId>`, a po pełnym syncu przełącza `current.buildId` (brak aktualizacji in-place).
- Do release trafia `appctl` uruchamiający fallback bundle (`app.bundle.cjs`).
- Frontend (public/) jest obfuskowany/minifikowany zgodnie z configiem.
- Backend jest obfuskowany w jednym bundlu (jak fallback).
- **Tryb unsafe**: brak SEA (mimo obfuskacji).
- `rsync` minimalizuje transfer (przy kolejnych deployach).
- Wymaga `rsync` lokalnie i na serwerze.
- `node_modules` nie jest używane (fallback bundle zawiera zależności).
  - `--fast-no-node-modules` jest ignorowane w tym trybie.
- Po udanym zwykłym deployu SEAL usuwa wszystkie `*-fast` release'y (niezależnie od retention), żeby nie zostawiać źródeł na dysku.

---

## 8. Multi-target deploy

Implementacja:
- `seal deploy t1 t2 t3` iteruje po targetach.
- (SHOULD) generuje per-target raport: `seal-out/run/<target>/...` lub raport JSON agregujący.
- exit code:
  - 0 jeśli wszystkie OK,
  - != 0 jeśli przynajmniej jeden fail (i w logu widać które).

---

## 9. Uninstall / cleanup (`seal uninstall`)

Implementacja:
- stop + disable systemd unit,
- usuń unit i `run-current.sh`,
- usuń katalog instalacji (opcjonalnie zostaw `shared/config.json5` gdy `--keep-config`).

---

## 10. Zmiany w dokumencie

### v0.5
- Dodane: UX wizard (`seal` bez args), `seal-out/`, `run-local`, `deploy --artifact`, multi-target, uninstall.
- Zaktualizowane: przykłady pod SPEC v0.5.

### v0.4
- Dodane: `seal-out/run/` + `seal-out/ai.zip` + przykłady `plan.json` i `ai_prompt.md`.
- Doprecyzowane: spójność z `seal init` / profile `prod|debug`.

### v0.3
- Dokument dodany jako osobny „magazyn REF”, żeby SEAL_DEPLOY_SPEC mógł pozostać normatywny.
