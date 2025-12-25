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

Opcjonalnie (EXPERIMENTAL): `strip`/`upx` na binarce SEA – **OFF by default**, bo postject-ed binarki potrafią się po tym wysypać.

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
  bundleFallback: false, // ustaw true jeśli chcesz jawnie zezwolić na bundle fallback
  protection: {
    enabled: true,
    packSeaMain: true,
    packSeaMainMethod: "brotli",
    packSeaMainChunkSize: 8000,
    packBundle: true, // gzip backend bundle w bundle
    stripSymbols: false,
    upxPack: false
  }
}
```

> Tip: jeśli chcesz eksperymentować z `upxPack`/`stripSymbols`, włącz je jawnie w `seal.json5` i przetestuj uruchomienie na docelowym OS/arch (po postject bywa to wrażliwe).

## Packagery (kolejność rekomendowana)

1) `thin-split` – **najbardziej rekomendowany** (BOOTSTRAP: stały runtime + payload), szybkie aktualizacje.
2) `thin-single` – AIO (jeden artefakt).
3) `sea` – klasyczny SEA (single executable).
4) `bundle` – obfuskowany bundle JS (fallback bez SEA).
5) `none` – raw bundle + wrapper (bez protection/packBundle; tylko do diagnostyki).

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
- Jeśli SEA nie zadziała, build kończy się błędem, chyba że bundle fallback jest jawnie włączony (`build.bundleFallback=true` lub `--packager bundle`).

---

## AGENTS.md

W repo jest też `AGENTS.md` – zasady/konwencje projektu (struktura, komendy, styl).  
To jest szczególnie przydatne, gdy prosisz AI o zmiany w kodzie.
