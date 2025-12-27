# SEAL v0.6.0 – monorepo (CLI + przykład)

To repo jest „piaskownicą” do testowania SEAL end‑to‑end:

- `seal/` – implementacja CLI (budowanie artefaktu, obfuskacja, SEA/bundle, verify, run-local, minimalny deploy baseline)
- `example/` – reprezentatywna aplikacja webowa do testów „sealed” (runtime config w `seal-config/configs/`, pliki lokalne, UI, external calls, logowanie)
- `docs/seal_docset/` – docset v0.5 (specyfikacja + scenariusze)

---

## Wymagania

- Linux
- Node.js **>= 20** (zalecane **24**)
- npm (instaluje się razem z Node)
- (opcjonalnie) `curl`, `git`, `unzip`

---

## Instalacja Node.js 24 (zalecane)

Najprościej przez **nvm** (działa bez grzebania w systemowym Node):

```bash
sudo apt-get update
sudo apt-get install -y curl ca-certificates

# instalacja nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# przeładuj powłokę (albo otwórz nowy terminal)
source ~/.bashrc

# Node 24
nvm install 24
nvm use 24
nvm alias default 24

node -v
npm -v
```

Jeśli zmieniałeś wersję Node w katalogu, gdzie już był `node_modules`, zrób „fresh install”:

```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Instalacja zależności repo

Po rozpakowaniu ZIP / sklonowaniu repo:

```bash
cd <katalog_z_repo>
npm install
```

---

## Uruchomienie przykładu w DEV (bez sealing)

Opcja 1 (z roota repo):

```bash
npm run dev
```

Opcja 2 (w katalogu example):

```bash
cd example
npm run dev
```

Aplikacja wystartuje domyślnie na `http://127.0.0.1:3000`.

---

## Jak uruchamiać CLI `seal`

### Zalecane: używaj `npx` (zero instalacji globalnej, zawsze właściwa wersja)
W katalogu projektu (np. `example/`):

```bash
npx seal --help
npx seal check
```

### Opcjonalnie: zainstaluj `seal` jako komendę systemową (`seal ...`)
To jest wygodne, ale pamiętaj: globalny `seal` może potem wskazywać na inną wersję niż ta w repo.

**Wariant A (najprostszy przy nvm):**

```bash
cd seal
npm link

# sprawdź:
which seal
seal --help
```

Szybka wersja (skrypt w repo):

```bash
./scripts/link-global-seal.sh
```

Usuwanie globalnego linka:

```bash
./scripts/unlink-global-seal.sh
```

**Wariant B (globalny install z lokalnej ścieżki):**

```bash
npm install -g ./seal
seal --help
```

---

## Bash completion (podpowiedzi TAB)

Jeśli używasz `seal` jako komendy systemowej, możesz włączyć podpowiedzi:

Jednorazowo w sesji:

```bash
source <(seal completion bash)
```

Na stałe (dla użytkownika):

```bash
mkdir -p ~/.local/share/bash-completion/completions
seal completion bash > ~/.local/share/bash-completion/completions/seal
```

Alternatywnie, systemowo (wymaga sudo):

```bash
sudo seal completion bash > /etc/bash_completion.d/seal
```

---

## Struktura konfiguracji i artefaktów

- `seal.json5` – konfiguracja projektu + polityka (commitowane w repo).
- `seal-config/` – runtime configi (`configs/`) i targety deployu (`targets/`) (commitowane w repo).
- `seal-out/` – artefakty generowane (jak `target/`); przy `seal release`/`seal verify`/`seal deploy` czyszczone są katalogi robocze, ale `seal-out/cache/` (thin cache) jest zachowywany; dodaj do `.gitignore`.
- `seal clean` – usuwa `seal-out/` dla projektu (w monorepo uruchom w root, zadziała dla wszystkich podprojektów).

---

## Wiele projektów (monorepo)

Jeśli w katalogu znajduje się `seal.json5` z sekcją `projects`, **każde polecenie SEAL** uruchomione w tym katalogu wykona się dla wszystkich projektów z listy:

```bash
seal deploy prod
```

Aby wykonać komendę tylko dla jednego projektu, przejdź do katalogu projektu i uruchom ją tam.

Wpisy `projects` mogą być stringami (`"robot-ui"`) albo obiektami `{ name, path }`. Gdy `path` jest pominięte, SEAL używa wartości `name`.

---

## Frontend obfuskacja (domyślnie włączona)

Podczas `seal release` SEAL **obfuskuje również pliki frontendu** w `public/*.js` (np. `public/app.js`).

Jeśli z jakiegoś powodu chcesz to wyłączyć (np. debugowanie), dodaj w `seal.json5`:

```json5
build: {
  frontendObfuscation: { enabled: false }
}
```

## Backend terser (opcjonalnie, domyślnie włączony dla wszystkich profili)

SEAL może przepuścić backendowy bundle przez **Terser** (agresywny minifier/optimizer),
żeby mocniej spłaszczyć strukturę kodu (inline + compress) przed obfuskacją.
Domyślnie jest włączony dla wszystkich profili: `minimal`/`balanced` używają bezpiecznych ustawień,
`strict`/`max` mają mocniejsze (toplevel + mangle).

Konfiguracja (w `seal.json5`):

```json5
build: {
  obfuscationProfile: "strict", // lub "max"
  backendTerser: { enabled: true, passes: 3 }
}
```

Profil bardziej agresywny (maksymalny inline + dead-code):

```json5
build: {
  obfuscationProfile: "max",
  backendTerser: {
    enabled: true,
    passes: 4,
    toplevel: true,
    compress: { passes: 4, inline: 3 },
    mangle: { toplevel: true }
  }
}
```

Uwaga: `max` zwiększa ryzyko regresji i utrudnia diagnostykę runtime. Używaj po testach E2E.  
W profilach `strict`/`max` CFF jest wyłączone (potrafi psuć semantykę `let` w pętlach); spłaszczanie robi Terser + DCI.

Backend minify (esbuild) jest domyślnie włączony dla wszystkich profili. Wyłączenie:

```json5
build: {
  backendMinify: false
}
```

Uwaga: minify może wpływać na kod zależny od nazw funkcji/klas (`Function.name`).

Test E2E (obejmuje `max`):

```bash
SEAL_PROTECTION_E2E=1 node tools/seal/seal/scripts/test-protection-e2e.js
```

Test E2E obfuskacji logiki (`strict` + `max`):

```bash
SEAL_OBFUSCATION_E2E=1 node tools/seal/seal/scripts/test-obfuscation-e2e.js
```

Test odpala sealed binarkę i weryfikuje `/api/obf/checks` oraz `/api/md5`.

## E2E anti-debug (thin-split)

Wymaga narzędzi systemowych: `gdb`, `gdbserver`, `strace`, `ltrace` (opcjonalnie `coredumpctl`).
Instalacja:

```bash
tools/seal/seal/scripts/install-e2e-tools.sh
```

Lub przez główny installer:

```bash
SEAL_INSTALL_E2E_TOOLS=1 tools/seal/seal/scripts/install-seal-deps.sh
```

Uruchomienie testu:

```bash
SEAL_THIN_ANTI_DEBUG_E2E=1 node tools/seal/seal/scripts/test-thin-anti-debug-e2e.js
```

Opcjonalnie (ostrzej, zwłaszcza jako root):

```bash
SEAL_E2E_STRICT_PROC_MEM=1 SEAL_E2E_STRICT_PTRACE=1 SEAL_THIN_ANTI_DEBUG_E2E=1 \
  node tools/seal/seal/scripts/test-thin-anti-debug-e2e.js
```

```bash
SEAL_E2E_STRICT_DENY_ENV=1 SEAL_THIN_ANTI_DEBUG_E2E=1 \
  node tools/seal/seal/scripts/test-thin-anti-debug-e2e.js
```

Wyłączenie:

```json5
build: {
  backendTerser: false
}
```

## Console stripping (backend)

To jest **osobna opcja**, niezależna od profilu obfuskacji:
usuwanie `console.log/info/debug/warn` (zostaje `console.error`).
Przydaje się na produkcji, ale w dev zwykle chcesz pełne logi.

```json5
build: {
  consoleMode: "full" // lub "errors-only"
}
```

Możesz też nadpisać na czas builda:

```bash
SEAL_CONSOLE_MODE=errors-only seal release
```

Dobór profilu obfuskacji (skrót):
- `minimal`: kod dynamiczny (eval/Function), dużo refleksji/metaprogramowania.
- `balanced`: domyślny, bezpieczny dla większości aplikacji.
- `strict`: produkcja po pełnych E2E, renameGlobals + Terser + DCI.
- `max`: maksymalne utrudnienie (wyższy DCI + Terser passes=4), tylko po E2E.
Alias: `aggressive` → `strict`, `prod-strict`/`prod-max` → `strict`/`max` (emitują warning).

## Frontend minifikacja HTML/CSS (domyślnie włączona)

Podczas `seal release` SEAL **bezpiecznie minifikuje** `public/**/*.html` i `public/**/*.css` (pomija `*.min.html` oraz `*.min.css`).
Jest to ostrożna minifikacja, ale ma poziomy i opcje per-przypadek.

Poziomy:
- `safe` (domyślny): usuwa **puste** komentarze HTML, zwija białe znaki **między tagami**, usuwa komentarze CSS i zwija białe znaki w CSS.
- `minimal`: **nie** usuwa komentarzy HTML/CSS i **nie** zwija białych znaków między tagami (mniej ryzykowny dla SSR/hydration i `white-space: pre*`). Zostawia tylko bezpieczne zwijanie białych znaków w CSS (do wyłączenia per-przypadek).

Jeśli używasz frameworków, które polegają na pustych komentarzach (np. anchor’y hydracji), albo masz layout wrażliwy na whitespace — wybierz `minimal` lub wyłącz konkretne zachowania.

Wyłączenie:

```json5
build: {
  frontendMinify: { enabled: false }
}
```

Ustawienie poziomu:

```json5
build: {
  frontendMinify: { enabled: true, level: "minimal" }
}
```

Lub tylko wybrane typy:

```json5
build: {
  frontendMinify: { enabled: true, html: true, css: false }
}
```

Case-by-case (nadpisanie poziomu):

```json5
build: {
  frontendMinify: {
    level: "minimal",
    html: { stripComments: true, collapseWhitespace: false },
    css: { stripComments: false, collapseWhitespace: true }
  }
}
```

Uwaga: `html.stripComments` usuwa tylko puste komentarze HTML (`<!--   -->`), a `html.collapseWhitespace` działa tylko między tagami.


## Protection (anti-peek) binarki i backend bundle (domyślnie włączone)

SEAL domyślnie dokłada dodatkową warstwę "anti-peek" (utrudnia proste podglądanie zawartości plików):

- **SEA (binarka)**: pakuje backend bundle do „loadera” (Brotli/Gzip) *przed* generacją blobu SEA – w binarce nie ma plaintext JS.
- **Bundle** (opcja jawna): backendowy bundle jest pakowany do `app.bundle.cjs.gz` + mały loader (`seal.loader.cjs`), żeby nie leżał obok czytelny plik JS.

Domyślnie, dla `thin-split` uruchamiany jest **ELF packer** (kiteshield) – to podnosi koszt disassembly.
`SEA` nie wspiera `strip`/ELF packera (build fail‑fast).

To nie jest kryptografia – celem jest utrudnienie "zobaczę od razu po otwarciu pliku" i podniesienie kosztu analizy.

Jeśli chcesz to wyłączyć (np. do debugowania), dodaj w `seal.json5`:

```json5
build: {
  protection: { enabled: false }
}
```

Możesz też sterować szczegółami:

```json5
build: {
  packagerFallback: false, // ustaw true jeśli chcesz jawnie zezwolić na bundle fallback
  protection: {
    enabled: true,
    seaMain: { pack: true, method: "brotli", chunkSize: 8000 },
    bundle: { pack: true }, // gzip backend bundle w bundle
    strip: { enabled: false, cmd: "strip" },
    elfPacker: { tool: "kiteshield", cmd: "kiteshield", args: ["-n", "{in}", "{out}"] }
  }
}
```

Kolejność rekomendowana (anti‑disassembly, od najmocniejszego):
1) `kiteshield`
2) `midgetpack`
3) `upx`

Instalacja kiteshield (wymagane dla defaultu):
`tools/seal/seal/scripts/install-kiteshield.sh`
lub `SEAL_INSTALL_KITESHIELD=1 tools/seal/seal/scripts/install-seal-deps.sh` (domyślnie włączone; `SEAL_INSTALL_KITESHIELD=0` aby pominąć).

Uwaga: `kiteshield` w trybie pełnym używa ptrace (może kolidować z `antiDebug.tracerPid/ptraceGuard`).  
Domyślnie używamy `-n` (bez runtime engine) dla kompatybilności z anti‑debug.

> Tip: jeśli chcesz eksperymentować z `protection.elfPacker.tool="upx"`/`protection.strip.enabled`, włącz je jawnie w `seal.json5` i przetestuj uruchomienie na docelowym OS/arch (po postject bywa to wrażliwe).

## Packagery (kolejność rekomendowana)

1) `thin-split` – **najbardziej rekomendowany** (BOOTSTRAP: stały runtime + payload), szybkie aktualizacje.
2) `sea` – klasyczny SEA (single executable).
3) `bundle` – obfuskowany bundle JS (fallback bez SEA).
4) `none` – raw bundle + wrapper (bez protection/bundle.pack; tylko do diagnostyki).

`auto` oznacza obecnie `thin-split` i jest polecany, jeśli chcesz automatycznie przechodzić na lepszy packager w przyszłości.

## Najkrótsza ścieżka testu „job security” (lokalnie)

W katalogu `example/`:

```bash
npx seal check
npx seal release
npx seal verify --explain
npx seal run-local --sealed
```

Gdzie są artefakty:

- `example/seal-out/<app>-<buildId>.tgz` – paczka release
- `example/seal-out/release/` – rozpakowany release do inspekcji

---

## Co jest celowo uproszczone w tej implementacji v0.6

- Deploy zdalny przez SSH jest dodany jako „baseline”, ale nie jest jeszcze „battle tested”.
- SEA w Node jest funkcją eksperymentalną (Node wypisze warning). To normalne.
- Jeśli SEA nie zadziała, build kończy się błędem, chyba że bundle fallback jest jawnie włączony (`build.packagerFallback=true` lub `--packager bundle`).

---

## AGENTS.md

W repo jest też `AGENTS.md` – zasady/konwencje projektu (struktura, komendy, styl).  
To jest szczególnie przydatne, gdy prosisz AI o zmiany w kodzie.
