# SEAL_DEPLOY_REFERENCE – Referencyjna implementacja (v0.5)
> **Cel:** ten dokument jest w 100% **REF**: zawiera blueprinty, przykłady, template’y i „jak to zrobić dziś”.
>
> **Ważne:** jeśli REF i SPEC kiedykolwiek się rozjadą, **SPEC wygrywa**.

---

## 1. Co tu jest

W docsecie v0.5 wynosimy z SEAL-DEPLOY-SPEC długie elementy implementacyjne, żeby specyfikacja nie była zakładnikiem aktualnych narzędzi.

W szczególności: przeniesiona sekcja **14.6** (blueprint implementacji SEA).

## 1.1 Wymagania (Ubuntu, zanim zainstalujesz SEAL)

Jeśli planujesz używać packagera `thin-split`, potrzebujesz kompilatora C oraz zstd:

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
- `packagers/fallback` – alternatywny (packager `bundle`, na wypadek ograniczeń SEA), ale **ten sam format outputu**.

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
- obfuscationProfile: `none` (pomija obfuskację), `minimal`, `balanced` (domyślny), `strict`, `max`, `test-fast` (eksperymentalny)
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

**F) Protection/pack (domyślnie włączone)**
- Domyślnie SEAL uruchamia **ELF packer** (kiteshield) dla `thin-split` (anti‑disassembly).  
  `SEA` i `thin-single` ignorują `strip`/ELF packer (auto-disabled); użyj `thin-split`, jeśli chcesz hardening binarki.
- Rekomendowana kolejność packerów: `kiteshield` → `midgetpack` → `upx`.
- Jeśli chcesz wyłączyć packer, usuń `protection.elfPacker` albo ustaw `elfPacker.tool=null`.
- Gdy SEA nie jest możliwe i **bundle fallback jest jawnie włączony**, backend bundle jest pakowany do `app.bundle.cjs.gz` i uruchamiany przez mały loader (żeby nie leżał czytelny plik JS).
- Bundle fallback wymaga jawnego włączenia: `build.packagerFallback=true` lub `packager=bundle`.
- Protection można wyłączyć w `seal.json5` (`build.protection.enabled=false`).
- Preset bezpieczeństwa: `build.securityProfile` domyślnie = `strict`.
  Profile ustawiają **domyślne wartości** (nie nadpisują jawnych pól):
  - `minimal`: obfuskacja `minimal`, a **anti-debug + integrity + nativeBootstrap + strip** są nadal włączone; `seccomp=kill`.
  - `balanced` (rekomendowany): obfuskacja `balanced`, `envMode=denylist`, anti‑debug/integrity/nativeBootstrap/strip ON.
  - `strict`: `balanced` + `snapshotGuard=ON` + `envMode=allowlist` + `obfuscationProfile=strict`.
  - `max`: `strict` + `seccomp.aggressive` + `obfuscationProfile=max`.
- Sentinel jest niezależny od profilu bezpieczeństwa: użyj `build.sentinel.profile: "required"` aby go wymusić (profile: `off|auto|required|strict`, czas nadal `off`).
- Po `sentinel install` domyslnie wykonywany jest runtime verify (thin launcher); pomin: `--skip-verify` / `--skip-sentinel-verify`.
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

### 3.1. `seal wizard` – przykładowy output

```
$ seal wizard

SEAL wizard
cwd: /home/user/project
projectRoot: /home/user/project

Projekt SEAL: appName=my-app entry=src/index.js
defaultTarget: local
config: /home/user/project/seal-config/configs/local.json5

Rekomendowane teraz: release (build)
Wybierz następną akcję:
 1) check (preflight) — sprawdza toolchain i kompatybilność przed buildem
 2) release (build) [rekomendowane] — buduje sealed release i artefakt .tgz
 3) verify --explain — weryfikuje artefakt i wypisuje checklistę
 4) run-local --sealed — uruchamia sealed build lokalnie
 5) deploy (artifact) → target — wdraża artefakt na serwer (bez kontroli serwisu)
 6) ship (build+deploy+restart) → target — jedno polecenie: build + deploy + restart
 7) remote (service control) — sterowanie usługą (up/enable/start/stop/status/logs)
 8) rollback → target — powrót do poprzedniego release
 9) uninstall → target — usuwa usługę SEAL z targetu
 0) wyjście

Opcja: 2
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
  // SSH jest non-interactive (BatchMode): wymagane klucze, brak promptów na hasło.
  installDir: "/home/admin/apps/my-app",
  serviceName: "my-app",
  serviceUser: "my-app",

  // MAY: protection preset
  // protection: "baseline",
}
```


### 3.3. `seal config add` – przykładowo generowany plik

```json5
// seal-config/configs/robot-01.json5 (generated template)
{
  http: {
    port: 8080,
  },

  // ... reszta configu aplikacji ...
}
```

### 3.4. Decoy (joker) – opcjonalny „fake project”

Cel: w release pojawia się wiarygodna struktura projektu Node (server.js, src/, public/),
żeby na pierwszy rzut oka wyglądało to jak zwykła aplikacja.

Konfiguracja w `seal.json5`:
```json5
build: {
  decoy: {
    mode: "none",      // none | soft | wrapper
    scope: "backend",  // backend | full
    sourceDir: "decoy",// katalog z plikami decoya (opcjonalny)
    overwrite: false,  // jeśli false, build fail‑fast przy kolizjach
    generator: "off"   // off | basic (generate decoy when sourceDir missing)
  }
}
```

Zasady:
- `scope=backend`: decoy tylko dla backendu (bez `public/`).
- `scope=full`: decoy dla backendu i frontendu (dodaje `public/`).
- `sourceDir`: jeśli istnieje, SEAL używa tego katalogu jako źródła decoya (np. wygenerowanego przez AI).  
  Jeśli nie istnieje i `generator=basic`, SEAL generuje **prosty** decoy w `seal-out/decoy/<app>-<buildId>` i stamtąd go instaluje.  
  Gdy `generator=off` (domyslnie), brak `sourceDir` powoduje blad.
- `profile` nie jest już wspierany — decoy pochodzi z `sourceDir` albo z generatora bazowego.
- `overwrite=true`: pozwala decoyowi **nadpisywać** pliki w release.  
  Domyślnie `overwrite=false`, więc każda kolizja kończy build błędem.
- `soft`: tylko pliki decoy (bez uruchamiania niczego).
- `wrapper`: dodatkowy plik `bin/worker.js` i kod startu worker‑a sterowany przez `NATIVE_WORKER=1`.

Uwaga: `scope=full` zastępuje frontend na dysku.  
Jeśli chcesz **realny frontend** i decoy tylko „na żądanie”, użyj `scope=backend`  
albo zastosuj mechanizm embedowania frontendowych assetów (serwowanie z loadera).

Runtime:
- `scope=backend` nie wpływa na uruchomienie aplikacji (backend działa z payloadu Seala, a frontend z prawdziwego `public/`).
- `scope=full` zmienia to, co serwuje aplikacja z dysku — realny frontend musi być wtedy osadzony/serwowany z innego źródła.

#### Wytyczne dla AI generujacej content decoya

Cel: wygladac maksymalnie wiarygodnie dla osoby, ktora oglada pliki na szybko,
ale **nie** ujawnic nic z chronionej aplikacji.

Zasady (MUST):
- Nie uzywaj slow: `seal`, `runner`, `bootstrap`, `sentinel`, `thin` ani nic, co zdradza mechanizm ochrony.
- Nie kopiuj zadnych fragmentow realnego kodu ani nazw endpointow, ktore moga ujawniac domenowe detale.
- Nie zapisuj sekretow, tokenow, kluczy ani prawdziwych adresow produkcyjnych.
- Kod powinien wygladac jak standardowy serwer Node (np. express/fastify), ale logika ma byc neutralna i ogolna.
- Decoy ma wygladac **jak chroniona aplikacja**: AI powinna przeskanowac strukture, nazwy modułów i UX chronionej aplikacji i stworzyc wiarygodny „look‑alike”, ale bez ujawniania szczegolow logiki ani danych.

Zasady (SHOULD):
- Udawaj „normalny” projekt: `package.json`, `server.js`, `src/routes`, `config/default.json`, `public/`.
- Endpointy maja byc wiarygodne, ale generyczne (np. `/healthz`, `/status`, `/api/overview`).
- API powinno byc spojne (np. `{ ok: true, data: ... }`) i przypominac styl prawdziwej aplikacji.
- Udawaj obsluge frontendu: statyczne pliki w `public/`, oraz endpoint typu `/ui/config`.
- Jeśli aplikacja „powinna” sluchac na porcie, to:
  - **nie** binduj do portu realnej uslugi,
  - mozna logowac „listening” bez realnego bindu, albo sluchac na alternatywnym porcie.
- UI/HTML/CSS: ma wygladac estetycznie i sensownie, ale bez jakichkolwiek wskazowek o prawdziwej domenie.

### 3.5. Workspace defaults (dziedziczenie z parenta)

Jeśli w katalogu nadrzędnym (workspace) masz `seal.json5` z listą projektów,
możesz tam dodać wspólne ustawienia dla wszystkich podprojektów.
Każdy projekt dziedziczy te wartości, a lokalny `seal.json5` nadpisuje tylko różnice.

Przykład `seal.json5` w root workspace:
```json5
{
  projects: [
    "modbus-sync-worksites",
    "nowy-styl-ui",
    "robot-task-manager",
    "robot-ui"
  ],
  defaults: {
    defaultTarget: "prod",
    build: {
      packager: "thin-split",
      securityProfile: "strict",
      protection: { enabled: true }
    }
  }
}
```

Zasady merge:
- `defaults` jest scalane w głąb z `seal.json5` projektu.
- wartości z projektu **wygrywają** nad `defaults`.
- tablice są **nadpisywane**, nie łączone (jeśli chcesz dodać element, wpisz całą tablicę w projekcie).

To działa kaskadowo: jeśli masz kilka parentów z `defaults`, są one scalane od najdalszego do najbliższego.

Uwaga: uruchomienie komendy w root workspace wykonuje ją automatycznie dla wszystkich projektów z listy `projects`.

### 3.6. Security profiles (`build.securityProfile`)

`securityProfile` to preset, który **ustawia domyślne wartości** (nie nadpisuje jawnych pól).
Domyślny profil w SEAL to `strict`.

**Mapa profili (skrót):**
- `minimal`: obfuskacja backendu `minimal`, ale anti‑debug + integrity + nativeBootstrap + strip są nadal ON (seccomp=kill).
- `balanced` (rekomendowany): obfuskacja backendu `balanced`, `envMode=denylist`, anti‑debug/integrity/nativeBootstrap/strip ON.
- `strict`: jak `balanced` + `snapshotGuard=ON` + `envMode=allowlist` + obfuskacja backendu `strict`.
- `max`: jak `strict` + `seccomp.aggressive` + obfuskacja backendu `max`.

Uwaga: frontend ma **oddzielny** profil (domyślnie `balanced`) i nie dziedziczy z backendu.

**Override**: każdą opcję możesz wyłączyć jawnie w projekcie:
```json5
build: {
  securityProfile: "strict",
  thin: { antiDebug: { enabled: false } }, // jawny override
  protection: { strip: { enabled: false } }
}
```

---

## 4. Artefakty `seal-out/run/` + `seal plan` (REF)

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
  "securityProfile": "strict",
  "obfuscationProfile": "strict",
  "initMode": "ADOPT",
  "inputs": {
    "projectRoot": ".",
    "entry": "src/index.js",
    "uiDir": "public/"
  },
  "resolvedConfig": {
    "packager": "sea",
    "obfuscation": "strict",
    "frontendObfuscation": {"enabled": true},
    "frontendMinify": {"enabled": true, "level": "safe"},
    "protection": {
      "enabled": true,
      // opcjonalnie, informacyjnie:
      "strings": {"obfuscation": "xorstr"},
      // domyslnie, dla launchera thin:
      "cObfuscator": {
        "tool": "obfuscator-llvm",
        "cmd": "/path/to/obfuscating-clang",
        "args": ["-mllvm", "-fla", "-mllvm", "-sub"]
      }
    }
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
      "alternatives": ["bundle"],
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
    "runDir": "seal-out/run/"
  }
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
1) wykryj root projektu (`seal.json5`); jeśli brak – komunikat „to nie jest projekt SEAL” + sugestia `seal init`.
2) wykryj stan:
   - brak `seal.json5` / brak `seal-config/configs/local.json5` → `seal init`,
   - brak targetów → `seal target add local`,
   - brak artefaktu → `seal release`,
   - jest artefakt → `seal verify` i `seal run-local`,
  - są targety serwerowe → `seal deploy <target>` + `seal remote <target> status`.
3) wypisz propozycje jako copy/paste (bez „filozofii”).
 4) (TTY) pozwól wybrać numer i uruchomić komendę bez opuszczania wizards.
 5) pokaż krótkie wyjaśnienie każdej komendy i wskaż rekomendowaną na teraz.

### 6.2. Rozpoznanie default target/config

Minimalny algorytm (zgodny ze SPEC v0.5):
- `default_target` z `seal.json5` → jeśli istnieje,
- inaczej `local` → jeśli istnieje,
- inaczej jedyny target → jeśli jest dokładnie jeden,
- inaczej: lista + wybór (interaktywnie) albo błąd z instrukcją.

`config` domyślnie = `target` (override tylko `--config`).

### 6.3. `seal-out/` – folder do inspekcji i local-run

Cel: po `seal release` użytkownik ma gotowy folder „do oglądania” i „do uruchomienia”.
`seal-out/` jest czyszczony przy każdym release (zostaje tylko ostatni build), z wyjątkiem `seal-out/cache/` (thin cache).
To katalog w pełni generowany (jak `target/`), więc nie trzymaj w nim nic ręcznie i dodaj go do `.gitignore`.

Struktura:
- `seal-out/release/` – rozpakowany release (jak na serwerze, ale lokalnie),
- `seal-out/meta.json` – metadane (buildId, artifact path, config),
- `seal-out/<app>-<buildId>.tgz` – artefakt release.

### 6.4. `seal run-local`

Implementacja:
- znajdź `seal-out/release/` (jeśli nie istnieje – zasugeruj `seal release` albo wykonaj `seal release` automatycznie),
- wybierz config (domyślnie `local`, override `--config`),
- skopiuj `seal-config/configs/<config>.json5` → `seal-out/release/config.runtime.json5`,
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
  - generuje `seal-out/run/` tak samo.

---

## 7.0. Readiness po `ship` / `deploy --restart`

- `seal ship <target>` **domyślnie czeka** na gotowość usługi po restarcie.
  - wyłączenie: `seal ship <target> --no-wait`
- `seal deploy <target> --restart --wait` robi to samo, ale tylko gdy jawnie włączysz `--wait`.
- Domyślna gotowość = **systemd active**. Opcjonalnie można dodać HTTP:
  - `--wait-url http://127.0.0.1:3000/healthz`
  - `--wait-mode systemd|http|both` (domyślnie: `both` gdy podano URL, inaczej `systemd`)

Przykład w `seal-config/targets/<name>.json5`:
```json5
{
  readiness: {
    enabled: true,
    mode: "both",
    url: "http://127.0.0.1:3000/healthz",
    timeoutMs: 60000,
    intervalMs: 1000,
    httpTimeoutMs: 2000
  }
}
```

Uwaga: dla targetów SSH tryb HTTP wymaga `curl` albo `wget` na serwerze.

---

## 7.1. Fast ship (unsafe) (`seal ship --fast`)

**Cel:** ultra-szybkie prototypowanie bez SEA (bundle + rsync).

Zasady:
- `seal ship <target> --fast` buduje bundle i synchronizuje go na serwer przez `rsync` (bez `.tgz`).
- Zawsze tworzy nowy katalog release: `appName-fast-<buildId>`, a po pełnym syncu przełącza `current.buildId` (brak aktualizacji in-place).
- Do release trafia `appctl` uruchamiający bundle (`app.bundle.cjs`).
- Frontend (public/) jest obfuskowany/minifikowany zgodnie z configiem.
- Backend jest obfuskowany w jednym bundlu (jak bundle packager).
- **Tryb unsafe**: brak SEA (mimo obfuskacji).
- `rsync` minimalizuje transfer (przy kolejnych deployach).
- Wymaga `rsync` lokalnie i na serwerze.
- `node_modules` nie jest używane (bundle zawiera zależności).
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
- Dodane: `seal-out/run/` + przykłady `plan.json`.
- Doprecyzowane: spójność z `seal init` / `securityProfile` + `obfuscationProfile`.

### v0.3
- Dokument dodany jako osobny „magazyn REF”, żeby SEAL_DEPLOY_SPEC mógł pozostać normatywny.
