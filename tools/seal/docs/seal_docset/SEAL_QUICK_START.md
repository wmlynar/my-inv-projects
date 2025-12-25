# SEAL_QUICK_START – Szybki start (v0.5)

> **Cel:** pierwsze 15 minut z SEAL – od „gołego projektu” do:
> - lokalnego testu sealed (czyli: *czy zabezpieczenie działa*),
> - opcjonalnie pierwszego deployu jako usługa systemd.

## Zasada, która ratuje pamięć
Jeśli nie pamiętasz komend: uruchom po prostu:

```bash
seal
```

SEAL działa wtedy jak „wizard”: wykrywa stan projektu i mówi **co zrobić dalej**.

---

## 1) Wymagania

### Na komputerze deweloperskim
- Node.js (zgodny z toolchainem Seala)
- `seal` (CLI) dostępny w PATH

#### Ubuntu – wymagane pakiety (przed instalacją/uruchomieniem SEAL)
Jeśli używasz packagera `thin` (AIO), potrzebujesz kompilatora C i `zstd`:

```bash
sudo apt-get update
sudo apt-get install -y build-essential pkg-config zstd libzstd-dev
```

### Na serwerze (tylko jeśli robisz deploy)
- Linux + systemd
- dostęp SSH do użytkownika, który może wykonać akcje instalacyjne (przez `sudo`)

---

## 2) Nowy projekt albo istniejący projekt

Wejdź do katalogu projektu i uruchom:

```bash
seal init
```

`seal init`:
- tworzy `seal.json5` (konfiguracja projektu + policy, commitowana),
- tworzy `seal-config/configs/local.json5`,
- tworzy `config.runtime.json5` (domyślny link/kopia do uruchomień),
- tworzy `seal-config/targets/local.json5`,
- zapisuje `default_target=local`.

> **Ważne:** SEAL nie ma zastępować Node’a w dev. W dev nadal uruchamiasz aplikację normalnie (node/npm). SEAL jest od sealingu i deployu.

---

## 3) Uruchomienie w dev (bez sealingu)

Uruchom jak zwykle:

```bash
node <entrypoint>
# albo:
npm run dev
```

W logach aplikacji powinieneś widzieć, że czyta `config.runtime.json5`.

> **Tip:** jeśli `config.runtime.json5` nie istnieje, `seal check` i `seal run-local` utworzą go automatycznie z `seal-config/configs/<config>.json5`.
> **Tip:** jeśli `seal check` wygląda na „zawieszony”, uruchom `seal check --verbose` (pokazuje output narzędzi) lub zwiększ timeouty: `SEAL_CHECK_CC_TIMEOUT_MS=60000`. Możesz też wskazać kompilator: `seal check --cc gcc`.

---

## 4) Lokalny test zabezpieczenia (najczęstszy loop)

### Krok A: zbuduj sealed artefakt i folder do inspekcji

```bash
seal release
```

Domyślnie `seal release`:
- robi obfuskację backendu,
- **domyślnie obfuskuje też frontend** (public/**/*.js),
- **domyślnie bezpiecznie minifikuje HTML/CSS** (public/**/*.html, public/**/*.css), poziom: `safe`,
- **domyślnie wykonuje hardening**:
  - **SEA**: pakuje backend bundle do „loadera” (Brotli/Gzip) zanim trafi do SEA blobu (bez plaintext JS),
  - **fallback** (jawnie włączony): gzip + loader (brak `app.bundle.cjs` w prostym podglądzie),
  - **UPX/strip**: dostępne jako opcje, ale **OFF by default**, bo potrafią psuć postject-ed binarki.
- uruchamia `seal check` (fail-fast),
- buduje artefakt do `seal-out/<app>-<buildId>.tgz`,
- rozpakowuje build do `seal-out/release/` (zawsze tylko ostatni release).
- czyści `seal-out/` przed buildem (jak `target/`), z wyjątkiem `seal-out/cache/` (thin cache), więc zawsze zostaje tylko ostatni build.

Fallback jest wyłączony domyślnie; włącz go jawnie przez `build.allowFallback=true` albo `--packager fallback`.

### Krok B: sprawdź artefakt (czy „naprawdę jest sealed”)

```bash
seal verify
```

Jeśli chcesz mieć czytelne wytłumaczenie „co sprawdzono”:

```bash
seal verify --explain
```

### Krok C: przejrzyj artefakt

Najbardziej przydatne miejsca:
- `seal-out/` (kanoniczny artefakt do przenoszenia)
- `seal-out/release/` (folder do oglądania i uruchomienia)

Szybki sanity-check „czy nie ma źródeł / sourcemap”:

```bash
tar -tzf seal-out/*.tgz | egrep '(\.map|\.ts|\.tsx|\.jsx)$' && echo "BAD: wykryto sourcemap/TS/JSX" || echo "OK: brak sourcemap/TS/JSX"
# dodatkowo: brak katalogu src i node_modules
tar -tzf seal-out/*.tgz | egrep '(^|/)src/|(^|/)node_modules/' && echo "BAD: wykryto src/ lub node_modules/" || echo "OK: brak src/ i node_modules/"
```

### Krok D: uruchom sealed lokalnie

Najprościej:

```bash
seal run-local
```

Jeśli wolisz ręcznie (bez magii):
```bash
# utwórz config.runtime.json5 z seal-config/configs/local.json5 (kopiuj treść)
./seal-out/release/<app>
```

### Krok E: (opcjonalnie) E2E UI po sealingu

Jeśli masz UI i chcesz sprawdzić realne działanie w przeglądarce po sealingu:

1) Zainstaluj Playwright (jednorazowo):
```bash
npm --prefix tools/seal/seal install
npx playwright install
```

2) Uruchom test (przykład dla `example`):
```bash
SEAL_UI_E2E=1 npm --prefix tools/seal/seal run test:ui
```

Uwagi:
- test odpala **sealed** binarkę i otwiera przeglądarkę headless,
- timeouty są twarde; brak postępu = błąd,
- integracje zewnętrzne są stubowane lokalnie (brak zależności od internetu).

---

## 5) (Opcjonalnie) Lokalny deploy na localhost jako usługa systemd

To jest test ścieżki serwerowej, ale nadal bez „prawdziwego” serwera.

1) Upewnij się, że `seal-config/targets/local.json5` ma:
- `host=127.0.0.1`,
- `installDir=/tmp/seal-sandbox/<app>`,
- `serviceName=<app>-sandbox`.

2) Pierwszy raz:

```bash
seal deploy local --bootstrap
```

3) Kolejne aktualizacje:

```bash
seal deploy local
seal restart local    # (opcjonalnie) jeżeli chcesz uruchomić usługę po deployu
```

4) Serwis:

```bash
seal status local
seal logs local
seal restart local
seal stop local      # stop + disable autostart
seal rollback local
seal releases local
```

---

## 6) Pierwszy deploy na zdalny serwer

### Krok A: dodaj target i config

```bash
seal target add robot-01
seal config add robot-01
```

Uzupełnij:
- `seal-config/targets/robot-01.json5` (SSH, ścieżki, serviceName)
- `seal-config/configs/robot-01.json5` (runtime config aplikacji)

### Krok B: bootstrap (pierwszy raz)

```bash
seal deploy robot-01 --bootstrap
```

### Krok C: kolejne deploye

```bash
seal deploy robot-01
seal restart robot-01    # (opcjonalnie) jeżeli chcesz uruchomić usługę po deployu
```

### Krok D: serwis

```bash
seal status robot-01
seal logs robot-01
seal restart robot-01
seal stop robot-01      # stop + disable autostart
seal rollback robot-01
seal releases robot-01
```

---

## 7) Zmiana konfiguracji i drift

- porównaj config na serwerze z repo:
```bash
seal config diff robot-01
```

- pobierz config z serwera do repo (świadome „serwer → repo”):
```bash
seal config pull robot-01 --apply
```

- świadomie nadpisz config na serwerze z repo:
```bash
seal deploy robot-01 --push-config
```

---

## 8) Gdy coś nie działa (diagnostyka)

1) Uruchom:

```bash
seal doctor
```

2) Jeśli błąd dotyczy release/deploy, sprawdź artefakty w `seal-out/run/` i logi z konsoli (ułatwia to odtworzenie problemu).

---

## 9) Wersje dokumentów

- `SEAL_QUICK_START` v0.5 jest kompatybilny z:
  - `SEAL_SCENARIOS v0.5`
  - `SEAL_DEPLOY_SPEC v0.5`
  - `SEAL_DEPLOY_REFERENCE v0.5`
  - `SEAL_STANDARD v1.3`
  - `SEAL_CONTRACT_AI v1.3`
