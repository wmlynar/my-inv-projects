# SEAL-DEPLOY – Dokument wymagań i standard jakości (v0.5)
> **Cel dokumentu:** zdefiniować kompletne wymagania dla narzędzia **seal-deploy** (dalej: **Seal**) oraz powiązanego **standardu jakości** dla aplikacji, które będą „sealowane” i wdrażane na środowiska wrogie (serwer/robot offline). Dokument jest podstawą implementacji.
>
> **Priorytet (P0):** Seal istnieje przede wszystkim po to, aby **wdrażać aplikacje Node.js na serwer/robota w postaci „sealed” (zaciemnionej, spakowanej) tak, żeby osoby mające dostęp do hosta miały maksymalnie utrudniony odczyt logiki/backendowego kodu źródłowego**. Wszystkie pozostałe elementy (systemd, `appctl`, standard jakości, UI fallback) są podporządkowane temu, aby sealed wdrożenia były **stabilne i serwisowalne** mimo obfuskacji.

---

## 0. Jak czytać ten dokument (v0.4)

### 0.1. Warstwy dokumentu (PRD/REQ, ARCH, REF)

Ten plik celowo jest „samowystarczalny” (wszystko w jednym miejscu), ale dzieli się na 3 warstwy:

- **PRD/REQ (wymagania produktu):** *co* Seal ma robić, jakie są cele, kryteria akceptacji i reguły zachowania.
- **ARCH (decyzje architektoniczne):** *dlaczego* wybraliśmy takie podejście (SEA, atomowe przełączanie wersji, journald, itd.) oraz jakie kompromisy świadomie akceptujemy.
- **REF (referencyjna implementacja):** przykłady, szablony, „blueprint” krok‑po‑kroku i formaty plików.

W praktyce:
- W każdej ważnej sekcji znajduje się podsekcja **„Wymagania normatywne (REQ-…)”** – to jest kontrakt.
- Reszta tekstu wyjaśnia i doprecyzowuje, ale nie jest „wiążąca” jeśli nie jest sformułowana jako wymaganie.



**Uwaga (docset v0.4):** w tej iteracji utrzymujemy nadal trzy warstwy myślowe (PRD/REQ, ARCH, REF), ale elementy **czysto implementacyjne** są systematycznie przenoszone do osobnego dokumentu **SEAL_DEPLOY_REFERENCE v0.4**.

- W tym pliku trzymamy wymagania i kontrakty (SPEC) + krótkie uzasadnienia (ARCH).
- W SEAL_DEPLOY_REFERENCE trzymamy: długie blueprinty, przykładowe pliki i szablony, gotowe „copy‑paste” fragmenty.

### 0.2. Słownik modalności (normatywny język)

W dokumencie używamy słów kluczowych:
- **MUST / NIE WOLNO** – wymaganie twarde (brak spełnienia = błąd wdrożeniowy).
- **SHOULD / NIEZALECANE** – silna rekomendacja; dopuszczalne odstępstwo, ale świadome i udokumentowane.
- **MAY** – opcja.

### 0.3. Numeracja wymagań

Każde wymaganie normatywne ma identyfikator w formacie:

- `REQ-<OBSZAR>-<NNN>`

Przykład: `REQ-SEA-004`.

**Przykładowe obszary:** `P0`, `SEC`, `SEA`, `DEP`, `CFG`, `CLI`, `SRV`, `STD`, `OPS`, `QA`.

### 0.4. Zasada prostoty i iteracyjnego „utwardzania”

Seal ma być **super prosty i mało inwazyjny**: użytkownik ma się skupiać na logice aplikacji, a nie na DevOpsach i zabezpieczeniach. v0.4 celowo redukuje pojęcia i liczbę komend.

Jednocześnie – bezpieczeństwo będzie rosnąć wersjami:
- v0.x: **najpierw działa** (minimalna liczba ryzyk i „magii”, dużo logów i diagnostyki),
- v1.x+: stopniowo dokładamy mocniejsze mechanizmy (hardening, weryfikacje, licencje/anti‑copy), ale tak, by nie rozwalić ergonomii.

### 0.5. Polityka sekretów (ważne i jawne)

Repozytorium aplikacji po stronie użytkownika Seal jest traktowane jako **środowisko zaufane**.  
W tej filozofii:
- konfigi w repo **MOGĄ** zawierać sekrety,
- snapshoty konfiguracji pobierane z serwera **MOGĄ** zawierać sekrety,
- Seal **NIE** ma chronić przed wyciekiem sekretów z repo,
- Seal ma chronić przede wszystkim przed **wyciekiem kodu źródłowego / logiki** oraz przed „łatwym” skopiowaniem aplikacji z hosta.



### 0.6. Zmiany w v0.4 (skrót)

Najważniejsze zmiany względem v0.3.1:
- `env` → **`config`** (wariant konfiguracji runtime). Zostaje **target** (host) + **config** (wariant w `seal-config/configs`).
- Jedna główna komenda: **`seal ship <target>`** (a `seal deploy` pozostaje trybem manualnym).
- Bootstrap serwera jest częścią shipu: **`seal ship <target> --bootstrap`** (deploy też wspiera `--bootstrap`).
- Jeden format konfiguracji Seala: **JSON5** (`seal.json5` + `seal-config/*`).
- Serwer bez symlinków: aktywny release jest wskazywany przez `current.buildId`, a `run-current.sh` uruchamia `appctl` z aktywnego release.
- Retencja release’ów: domyślnie `keep_releases=1` (tylko ostatni release) + cleanup po udanym deployu.
- Drift configu: domyślnie **błąd** (wymusza jawne `pull-config --apply` albo `--push-config`).

## Idea przewodnia (guiding idea)

Seal ma zdejmować z głowy temat „jak zabezpieczyć kod, żeby mnie nie okradli”.

**Jedno zdanie:** uruchamiasz `seal` w katalogu projektu → Seal robi sealed release → kopiuje na serwer/robota → uruchamia jako usługę → a na serwerze nie zostaje nic, co łatwo zamienić w Twój kod źródłowy.

### Najważniejsze zasady projektowe (design principles)

1) **Super proste użycie (minimum kroków):** domyślnie ma istnieć jedna główna ścieżka: `seal ship <target>` (a `seal deploy` to tryb manualny).
2) **Convention over configuration:** jak najwięcej wynika z konwencji (np. `target == config`, `config.runtime.json5`), a nie z ręcznego mapowania.
3) **Zero zbędnego narzutu dla dewelopera:** w dev pracujesz jak w normalnym projekcie Node.js. Sealing uruchamia się dopiero na etapie release/deploy.
4) **Wszystko w repo aplikacji:** po `git clone` da się uruchomić lokalnie i wdrożyć na serwer bez szukania dodatkowych plików.
5) **Serwer jest wrogi:** na serwer trafiają tylko minimalne artefakty uruchomieniowe + trwały config (edytowalny). Nie trafia struktura projektu ani czytelne źródła.
6) **Standard jakości jako „pas bezpieczeństwa”:** po obfuskacji debug bywa trudny, więc standard (logi/status/UI awarie) istnieje po to, aby serwis był szybki i przewidywalny.
7) **AI-first projekty:** standardy i kontrakt mają być tak jasne, żeby AI mogło generować aplikacje zgodne „z automatu” — Ty masz myśleć o funkcjach, nie o zabezpieczaniu.

---

## Spis treści

- 0. Jak czytać ten dokument (v0.4)
- Idea przewodnia (guiding idea)
- 1. Kontekst i cele
- 2. Definicje i pojęcia
- 3. Założenia, ograniczenia i model zagrożeń
- 4. Zakres projektu: co dostarczamy
- 5. Ogólna koncepcja rozwiązania
- 6. Minimalna integracja w nowym projekcie
- 7. Konwencje repozytorium aplikacji
- 8. Konwencje repozytorium seal-deploy
- 9. Workflow użytkownika (dev → seal → deploy → serwis)
- 10. Konfiguracja: rozdzielenie „deploy” vs „config aplikacji”
- 11. Serwer/robot: przygotowanie środowiska (bootstrap z `seal deploy --bootstrap`)
- 12. Artefakty wdrożeniowe i struktura na serwerze
- 13. Usługa systemd + `appctl`
- 14. Sealing: bundlowanie, minifikacja, obfuskacja, binarka
- 15. Frontend: opcjonalne zabezpieczenie
- 16. Zasoby (assets) i pliki danych
- 17. Mechanizm anty-kopiowania (opcjonalnie)
- 18. Standard jakości SEAL_STANDARD v1.3 (modułowy)
- 19. Wersjonowanie standardu i “lock” w projekcie
- 20. Przykładowa aplikacja referencyjna
- 21. Kryteria akceptacyjne (Definition of Done)
- 22. Zakres poza projektem (non-goals)
- 23. Aneksy: przykłady plików i formatów
- 24. Specyfikacja CLI (komendy, parametry, wyjścia, exit codes)
- 25. Specyfikacje plików i schematy (project/targets/configs/manifest w `seal.json5` + `seal-config/`)
- 26. Algorytmy operacyjne (release, deploy, rollback, snapshot config)
- 27. Scenariusze end-to-end i plan testów
- 28. Plan implementacji (milestones)
- 29. Specyfikacja metadanych projektu (`seal.json5`)
- 30. Specyfikacja szablonu usługi systemd (`systemd.service.tpl`)
- 31. Specyfikacja `appctl` (narzędzie serwisowe na serwerze)
- 32. Specyfikacja obsługi UI i static assets w trybie single executable
- 33. Toolchain i instalacja offline (żeby implementacja była wykonalna)
- 34. Deterministyczne buildId, wersja i retencja release
- 35. Open questions / TBD
- 36. Lista zmian (v0.5)
- 37. Rzeczy, które wypadły z poprzedniej wersji (v0.2)

---

## 1. Kontekst i cele

### 1.1. Kontekst
- Aplikacje są tworzone w **Node.js**:
  - backend: JavaScript/TypeScript + Express,
  - frontend: HTML/CSS/JS serwowany przez backend.
- Środowisko docelowe jest **offline** (bez internetu). Odpadają rozwiązania SaaS oraz „logika zdalnie”.
- Serwer/robot jest traktowany jako **środowisko wrogie**:
  - potencjalny złodziej ma dostęp do maszyny i może próbować skopiować artefakty,
  - chcemy maksymalnie utrudnić odczytanie kodu źródłowego backendu,
  - dodatkowo chcemy utrudnić nieautoryzowane użycie skopiowanej binarki.

### 1.2. Cele główne
- **Ochrona IP przez sealed release (cel nadrzędny):** pipeline tworzy artefakt produkcyjny możliwie najtrudniejszy do analizy i odzyskania kodu:
  - brak czytelnych źródeł `.js` na hoście docelowym,
  - maksymalna minifikacja i agresywna obfuskacja backendu,
  - preferowany pojedynczy artefakt uruchomieniowy (binarka/single-file),
  - minimalny footprint na serwerze (bez struktury projektu, bez `node_modules`, jeśli możliwe).
- **One-click deploy sealed artefaktu:** szybkie wdrażanie i aktualizacje na serwer/robota:
  - instalacja jako usługa systemd,
  - restart usługi po aktualizacji,
  - narzędzia do serwisu (status/logi/restart/foreground).
- **Dev lokalnie:** praca i debug w „czystym Node.js” (czytelny kod, normalne stack trace w dev), a sealing uruchamiany dopiero na etapie release.
- **Parametry/konfiguracja:**
  - wszystko przechowywane w repo aplikacji,
  - lokalnie: wiele środowisk/konfiguracji,
  - na serwer: tylko minimalny runtime config potrzebny do działania,
  - możliwość edycji configu na serwerze (serwis), przy zachowaniu repo jako źródła prawdy.

### 1.3. Cele dodatkowe
- Opcjonalne zabezpieczenie frontendu.
- Opcjonalny mechanizm anty-kopiowania binarki (sentinel/licencja).
- Standard jakości: wspólne, powtarzalne wzorce (logowanie, health/status, UI komunikaty awarii, itp.).

---

## 2. Definicje i pojęcia

- **Seal (seal-deploy)** – narzędzie CLI instalowane na komputerze deweloperskim, które:
  - definiuje standard jakości,
  - generuje sealed release,
  - wdraża na serwer/robota,
  - ułatwia serwis.

- **Target** – definicja celu wdrożenia (host, user, ścieżki instalacji, nazwa usługi), np. `robot-01`.

- **Config** – nazwa wariantu konfiguracji runtime aplikacji (plik `seal-config/configs/<config>.json5`).

  Domyślna konwencja: **`config == target`** (np. `robot-01` → `seal-config/configs/robot-01.json5`).

- **Runtime config** – konfiguracja aplikacji używana w czasie działania, w formie pliku (JSON/JSON5) zawierającego tablice/obiekty.

- **Sealed release** – paczka wdrożeniowa zawierająca binarkę/artefakt oraz minimalne pliki narzędziowe (appctl + manifest; unit/runner instalowane przez bootstrap).

- **Shared directory** – katalog na serwerze zawierający rzeczy trwałe między wersjami (np. config, dane, licencja).

- **SEAL_STANDARD** – wersjonowany standard jakości aplikacji „sealowanych”. Seal dostarcza dokument standardu i referencyjne szablony.

---

## 3. Założenia, ograniczenia i model zagrożeń

### 3.1. Założenia
- Repo aplikacji jest przechowywane i używane w środowisku zaufanym (u właściciela).
- Serwer/robot jest środowiskiem potencjalnie wrogim.
- Seal działa na komputerze deweloperskim (zaufanym) – nie zakładamy, że Seal jest zainstalowany na serwerze.

### 3.2. Ograniczenia (uczciwe)
- Jeśli atakujący ma pełny dostęp do hosta (root, debug, dump pamięci), nie da się “matematycznie” zagwarantować 100% ochrony IP.
- Celem jest **maksymalne utrudnienie** i podniesienie kosztu ataku.

### 3.3. Model zagrożeń (Threat model)

W tym projekcie zakładamy „wrogi host” w sposób **maksymalnie realistyczny**:

- Atakujący może:
  - skopiować pliki z dysku,
  - podejrzeć uruchomione procesy,
  - analizować binarkę statycznie,
  - **mieć pełny dostęp do runtime** (np. debug/attach, zrzuty pamięci),
  - próbować podmieniać pliki i uruchamiać u siebie (kopiowanie / klonowanie środowiska).

Dla porządku rozróżniamy klasy atakującego (nie po to, żeby się oszukiwać, tylko żeby wiedzieć „po co” są warstwy zabezpieczeń):

- **A1 (curious user):** bez roota, może czytać pliki w katalogu aplikacji.
- **A2 (admin-opportunist):** root, ale ograniczony czas/umiejętności; próbuje „szybkich zwycięstw”.
- **A3 (root + RE):** root + czas + narzędzia reverse‑engineering (docelowy, najbardziej wymagający przypadek).

**Priorytet P0** nadal pozostaje ten sam: nie chodzi o „nie do złamania”, tylko o to, aby odzyskanie logiki było **bardzo trudne i kosztowne**.

#### Wymagania normatywne (REQ-SEC)

- REQ-SEC-001 (MUST): wdrożenie na hoście docelowym nie pozostawia czytelnych źródeł backendu (`.js/.ts`) ani struktury projektu ułatwiającej analizę.
- REQ-SEC-002 (MUST): Seal ma jasno komunikować ograniczenia (pełny dostęp do hosta zawsze daje drogę ataku); celem jest maksymalne utrudnienie, nie gwarancja.
- REQ-SEC-003 (SHOULD): wdrożenie stosuje podejście „warstwowe” (bundle + agresywna obfuskacja + single executable + baseline hardening), bo sama obfuskacja bywa deobfuskowalna (również z pomocą AI).
- REQ-SEC-004 (MAY): mechanizm anty‑kopiowania (sekcja 17) utrudnia uruchomienie skopiowanej binarki na innym hoście, ale nie jest sprzedawany jako „nie do złamania”.

---

### 3.4. Wykonalność i ograniczenia (Non-goals / limitations) (v0.4)

Ta sekcja ma zapobiec obiecywaniu „magii”. Seal ma podnosić koszt kradzieży IP i upraszczać wdrożenia, ale nie daje absolutnych gwarancji w modelu atakującego z pełnym dostępem do hosta.

#### Co jest w pełni deterministyczne (łatwe/średnie)
- Generowanie plików i konfiguracji (`seal init`, `seal wizard`, `seal print-defaults`).
- SSH deploy (release dirs + atomowe przełączenie przez `current.buildId` + systemd + rollback).
- `seal verify` jako checklista artefaktów (skan plików, wzorce, hashe, manifest).
- `seal-out/run` + `seal-out/run.last_failed`.
- Drift detection configu (snapshot/diff/pull).

#### Co jest trudne/ryzykowne (wymaga fallbacków)
- SEA / single executable dla Node w „różnorodnych” projektach (dynamic `require`, native addons).
- Agresywna obfuskacja bez psucia kompatybilności.
- Automatyczna ocena części wymagań standardu, które zależą od runtime i integracji.

#### Czego nie da się zagwarantować
- Brak „matematycznej” gwarancji ochrony IP przy pełnym dostępie do hosta (Seal podnosi koszt kopiowania, nie zapewnia absolutnej niekopiowalności).
- Pełna ochrona przed manipulacją runtime w modelu atakującego z rootem.

**Wniosek:** dokumentacja rozdziela:
- MUST (deterministyczne),
- SHOULD (możliwe, ale zależne),
- aspiracyjne/utrudniające.


## 4. Zakres projektu: co dostarczamy

### 4.1. Seal jako narzędzie
Seal jest instalowany globalnie na komputerze deweloperskim jako komenda (np. `seal`).

Seal dostarcza:
- standard jakości **SEAL_STANDARD v1.3** (dokumenty + szablony),
- komendy do pełnego workflow:
  - przygotowanie repo projektu: `seal init`,
  - kontrola kompatybilności przed sealingiem: `seal check`,
  - sealed build: `seal release <target>`,
  - weryfikacja artefaktu: `seal verify <target|artifact>`,
  - deploy+restart+readiness (główny flow): `seal ship <target>`,
  - przygotowanie serwera (pierwszy raz): `seal ship <target> --bootstrap`,
  - serwis: `seal remote <target> logs|status|restart|stop|disable|down` + `seal run <target>`,
  - operacje na konfiguracji: `seal diff-config <target>`, `seal pull-config <target>`,
- przykład (sample app) i/lub zestaw testów referencyjnych.

**Ergonomia i diagnostyka:**
- Seal ma mieć **ekstensywne logowanie** krok‑po‑kroku (szczególnie w `ship`), tak aby w razie problemu użytkownik miał gotowe logi do wklejenia do AI / do debugowania.
- Seal powinien oferować `--verbose`, `--dry-run` oraz (dla automatyzacji) `--json` dla wybranych komend (szczegóły w sekcji 24).

#### Wymagania normatywne (REQ-CLI-LOG)

- REQ-CLI-LOG-001 (MUST): logi Seala muszą pokazywać **krok** (np. `SHIP/UPLOAD`, `SHIP/UNPACK`), wykonaną komendę (lub opis operacji), exit code oraz czytelny „next step hint”.
- REQ-CLI-LOG-002 (SHOULD): dla kluczowych komend (`ship`, `verify`, `status`) Seal powinien wspierać `--json` jako raport machine‑readable (łatwy do wklejenia do AI / automatyzacji).
- REQ-CLI-LOG-003 (MUST): jeśli błąd wynika z braku bootstrapa lub uprawnień (np. brak `sudo`), Seal musi wypisać **konkretną** instrukcję naprawczą (np. `seal ship <target> --bootstrap` lub komendę `ssh ... sudo mkdir/chown`).

**Aliasowanie komend (MAY):** można utrzymać aliasy historyczne, ale **główną ścieżką** jest `seal ship <target>`, a `seal deploy` to tryb manualny.

### 4.2. Skrypt serwerowy
Seal używa skryptu `seal-server.sh` uruchamianego na serwerze (`sudo bash ...`), który przygotowuje środowisko.

Seal może:
- wygenerować ten skrypt i szablony w projekcie,
- wgrać i uruchomić go zdalnie przez SSH.

### 4.3. Dokumentacja
- `SEAL_DEPLOY_SPEC.md` (ten dokument) – spec wymagań.
- `SEAL_STANDARD.md` – standard jakości.
- “Quick start” – minimalne kroki integracji.

---

## 5. Ogólna koncepcja rozwiązania

### 5.1. Rozdzielenie odpowiedzialności
- **Seal**:
  - definiuje standardy,
  - buduje sealed release,
  - wdraża release na host,
  - instaluje/aktualizuje usługę systemd,
  - zapewnia `appctl`.
- **Aplikacja**:
  - przestrzega standardów (konfiguracja, logowanie, statusy, UI fallback),
  - działa w dev bez sealingu.
- **AI** (opcjonalnie):
  - może czytać standard i dostosowywać projekt do zgodności,
  - Seal nie musi tego automatycznie egzekwować (ale standard ma być jednoznaczny).

### 5.2. Konwencja „target == config”
- `robot-01` jako target deploy ma odpowiadać konfiguracji aplikacji `seal-config/configs/robot-01.json5`.
- Dzięki temu unikamy mapowania plików config w deploy (JSON5).

### 5.3. Jeden stały plik runtime config
- Aplikacja **zawsze** czyta `config.runtime.json5` (stała nazwa).
- W dev `config.runtime.json5` jest częścią repo (domyślnie kopia `seal-config/configs/local.json5`).
- Na serwerze `shared/config.json5` jest trwałym configiem, a `config.runtime.json5` w aktywnym release jest jego kopią (odświeżaną przez `appctl` przy starcie).

### 5.4. Słownik decyzji (ARCH) – „dlaczego” w 2 strony

Ta sekcja jest celowo krótka: ma umożliwić szybkie zrozumienie *dlaczego* Seal wygląda tak, a nie inaczej.

1) **Auto jako domyślny packager (obecnie thin-split)**  
   Bo daje szybkie aktualizacje i pełne „sealed” bez ręcznej zmiany konfiguracji, gdy pojawią się lepsze packagery. Alternatywy są dopuszczalne jako plug‑in, ale kontrakt outputu ma być stały.

2) **Symlink `current` + katalogi `releases/`**  
   Bo to daje atomowość deployu, prosty rollback i przewidywalny layout na serwerze.

3) **`target == config` jako konwencja domyślna**  
   Bo usuwa „konfigurację konfiguracji”. Wyjątki są jawne (`--config` / mapowanie), żeby nie robić magii.

4) **Config edytowalny na serwerze + repo jako źródło prawdy**  
   Bo serwis czasem wymaga hotfixu na miejscu, ale repo ma pozostać canonical. Stąd drift detection + `pull-config` jako domknięcie pętli.

5) **Sekrety w repo i snapshotach są OK**  
   Bo środowisko z repo jest zaufane, a celem jest ochrona kodu źródłowego, nie ochrona sekretów.

6) **Baseline hardening systemd (minimalny)**  
   Bo daje realny wzrost kosztu „łatwych” ataków (NODE_OPTIONS, core dumps) bez rozwalania integracji.

7) **Pack bundla + ELF packer domyślnie (thin‑split)**  
   Bo usuwa „czytelny kod” z artefaktów bez ryzykownych modyfikacji binarki:
   - **SEA**: main script jest spakowany (Brotli/Gzip loader) zanim trafi do blobu.
   - **bundle** (jawny wybór): `app.bundle.cjs` jest zastąpione przez `.gz` + loader.
   - **thin‑split**: domyślnie uruchamiany jest ELF packer (kiteshield, `-n`) dla launchera `b/a`.
   `SEA` i `thin-single` ignorują `strip`/ELF packer (auto-disabled); użyj `thin-split`, jeśli chcesz hardening binarki.
   Rekomendowana kolejność packerów: `kiteshield` → `midgetpack` → `upx`.

8) **Publiczne `/healthz` i `/status`**  
   Bo aplikacje w tym kontekście bywają wdrażane „normalnie”, a UI i serwis potrzebują tych endpointów na standardowym porcie.


---

## 6. Minimalna integracja w nowym projekcie

### 6.1. Wymóg “git clone → działa”
Po pobraniu repo aplikacji:
- lokalny start ma działać bez dodatkowych plików spoza repo,
- domyślny `config.runtime.json5` musi istnieć w repo.

### 6.2. `seal init` (lokalnie; NEW/ADOPT)

Seal oferuje jedną ścieżkę startową:

- `seal init` działa w pustym i niepustym katalogu.
- `seal init` automatycznie wybiera tryb:
  - **NEW** (folder pusty / skeleton)
  - **ADOPT** (istniejący projekt)
- `seal init` materializuje wyniki w plikach, w tym:
  - `seal.json5` (sekcje: `build`, `deploy`, `policy`)
  - `seal-config/configs/local.json5` (oraz przykładowe warianty configów)
  - `seal-config/targets/local.json5`
  - `config.runtime.json5`
- W przypadku niejednoznaczności rozpoznania projektu: narzędzie **nie zgaduje w ciszy** — przenosi „niepewność” do `seal plan` (decision trace).

Opcje deterministyczne (MAY):
- `seal init --force-new`
- `seal init --force-adopt`

**Kompatybilność wstecz:** `seal bootstrap` może pozostać jako alias (DEPRECATED) dla `seal init` do czasu usunięcia.

---


## 7. Konwencje repozytorium aplikacji

### 7.1. Struktura minimalna
```
my-app/
  src/
  public/
  package.json

  seal.json5
  seal-config/
    configs/
      local.json5
    targets/
      local.json5
    standard.lock.json
  config.runtime.json5

  # generowane automatycznie (gitignore):
  seal-out/
    run/
    run.last_failed/
    release/
    my-app-<buildId>.tgz
    remote/
      robot-01.current.json5
      robot-01.history/
        2025-12-20_1615.json5
```

### 7.2. Zasady
- `seal-config/configs` zawiera tylko konfiguracje aplikacji.
- `seal-config/targets` zawiera tylko konfiguracje deploymentu.
- `seal-out/` jest w pełni generowany (jak `target/` w Maven) i może być czyszczony przy każdym `seal release`/`seal verify`/`seal deploy` – wyjątkiem jest `seal-out/cache/` (thin cache), który jest zachowywany; nie trzymaj tam nic ręcznie.
- `seal-out/remote/` jest zarządzany automatycznie przez Seal (snapshoty configu z serwera) i jest **generowany** (gitignore).
  - Snapshoty mogą zawierać sekrety – to jest akceptowane (repo nie ma „zabezpieczać przed wyciekiem sekretów”, tylko przed wyciekiem kodu).
  - Jeśli użytkownik nie chce snapshotów, używa `--no-snapshot` w `seal deploy`.
- `seal-out/run/` jest katalogiem roboczym „ostatniego uruchomienia” (nadpisywany przy każdym `seal plan/deploy/verify`) i powinien być domyślnie w `.gitignore`.
- `seal-out/run.last_failed/` jest snapshotem ostatniego nieudanego uruchomienia (nadpisywany wyłącznie przy failu) i również powinien być w `.gitignore`.

#### Wymagania normatywne (REQ-OUT)
- REQ-OUT-001 (MUST): `seal-out/` jest katalogiem w pełni generowanym; Seal czyści go przed każdym `seal release`/`seal verify`/`seal deploy`, z wyjątkiem `seal-out/cache/` (cache thin).
- REQ-OUT-002 (MUST): `seal-out/release/` zawiera tylko ostatni lokalny release (zawsze nadpisywany).
- REQ-OUT-003 (MUST): `seal-config/` zawiera wyłącznie konfiguracje (configs/targets); Seal nie zapisuje tam artefaktów build/deploy.

---


## 8. Konwencje repozytorium seal-deploy

### 8.1. Struktura minimalna
```
seal-deploy/
  docs/
    SEAL_DEPLOY_SPEC.md
    standard/
      v1/
        SEAL_STANDARD.md
        modules/
          logging.md
          config.md
          status.md
          service.md
          ui_resilience.md
          integrations.md
        examples/
          status.example.json
          logs.example.jsonl
  templates/
    server/
      seal-server.sh
      systemd.service.tpl
      appctl
    app/
      logger.js
      status-routes.js
      config-loader.js
      ui/
        connection-banner.js
  examples/
    sample-app/
  cli/
    seal (entry)
```

### 8.2. Rola Seal
- Seal dostarcza standard i szablony, aby projekty były spójne.
- Seal nie musi implementować automatycznego “lint-check” zgodności, ale może dostarczać narzędzia pomocnicze.

---

## 9. Workflow użytkownika (dev → seal → deploy → serwis)

### 9.1. Dev lokalnie
- Użytkownik uruchamia aplikację w dev.
- Aplikacja czyta `config.runtime.json5`.
- Logi w dev są czytelne; stack trace nie jest obfuskowany.

### 9.2. Plan (debug / decision trace)
- `seal plan <target>` generuje:
  - `seal-out/run/plan.md` (dla człowieka),
  - `seal-out/run/plan.json` (dla AI/narzędzi),
  oraz zapisuje pozostałe artefakty runa do `seal-out/run/` (sekcja 18.5 + 25).
- `plan` zawiera **decision trace**: co narzędzie rozpoznało i dlaczego, jakie defaulty zastosowało, jakie gałęzie odrzuciło.
- `seal ship <target>` jako pierwszy krok generuje plan i wykonuje kroki zgodnie z planem.

### 9.3. Sealed release
- `seal release <target>` tworzy artefakt w `seal-out/`.

### 9.4. Ship (deploy + restart + readiness)
- `seal ship <target>` wykonuje:
  1) snapshot configu z serwera do `seal-out/remote/` (jeśli serwer już działa i ma config),
  2) upload release,
  3) instalację wersji do `/home/admin/apps/<app>/releases/<buildId>`,
  4) ustawienie `current.buildId`,
  5) restart usługi,
  6) (opcjonalnie) health-check i rollback.

`seal deploy <target>` to tryb **manualny** (kopiowanie plików + instalacja release). Restart jest tylko wtedy, gdy jawnie użyjesz `--restart`.

### 9.5. Serwis
Seal zapewnia szybkie komendy:
- `seal remote <target> logs` – tail logów usługi
- `seal remote <target> status` – status systemd + `/status`
- `seal remote <target> restart`
- `seal remote <target> disable` – stop + disable autostart (systemd)
- `seal run <target>` – uruchomienie w foreground (diagnostyka)

> **Zasada prostoty:** użytkownik ma pamiętać tylko jedną komendę do wdrożeń: `seal ship <target>`. Reszta to narzędzia pomocnicze.

---


## 10. Konfiguracja: rozdzielenie „deploy” vs „config aplikacji”

### 10.1. Deployment config (JSON5)
Plik `seal-config/targets/<target>.json5` zawiera wyłącznie:
- host, user, sshPort
- sshStrictHostKeyChecking (opcjonalnie; domyślnie `accept-new`)
- installDir
- serviceName

**Wymaganie:** brak parametrów aplikacji w plikach deploy Seala.

### 10.2. Runtime config aplikacji (JSON/JSON5)
- `seal-config/configs/<config>.json5` – pełny config aplikacji dla danego wariantu.
- `config.runtime.json5` – aktywny config używany przez aplikację.

**Wymaganie:** config ma wspierać obiekty i tablice wprost.

### 10.3. Seed configu na serwerze
- Jeśli `/home/admin/apps/<app>/shared/config.json5` nie istnieje – tworzymy go na podstawie `seal-config/configs/<config>.json5`.
- Jeśli istnieje – nie nadpisujemy (domyślnie).

### 10.4. Edycja configu na serwerze (serwis)

- Config runtime na serwerze (`shared/config.json5`) jest **edytowalny** (serwis / hotfixy).
- Każdy `seal deploy` **domyślnie** tworzy snapshot configu z serwera w `seal-out/remote/` (generowane, gitignore).

#### Wymagania normatywne (REQ-CFG)

- REQ-CFG-001 (MUST): plik `seal-config/targets/<target>.json5` zawiera **wyłącznie** konfigurację wdrożeniową (host/user/ścieżki/nazwa usługi) i **nie** zawiera parametrów aplikacji.
- REQ-CFG-002 (MUST): aplikacja w każdym trybie (dev i production) czyta runtime config ze stałej ścieżki `config.runtime.json5`.
- REQ-CFG-003 (MUST): `seal deploy` **nie nadpisuje** configu na serwerze, jeśli użytkownik nie użyje `--push-config`.
- REQ-CFG-004 (MUST): jeśli na serwerze istnieje `shared/config.json5`, `seal deploy` wykonuje snapshot do `seal-out/remote/` (chyba że `--no-snapshot`).
- REQ-CFG-005 (MUST): `seal deploy` wykrywa **drift** (różnice) pomiędzy `seal-config/configs/<config>.json5` w repo a `shared/config.json5` na serwerze.
  - Domyślnie drift = **błąd** (exit != 0) z jasną instrukcją „co dalej”.
- REQ-CFG-006 (MAY): flaga `--accept-drift` zmienia drift z błędu w ostrzeżenie (dla przypadków, gdzie celowo zarządzasz configiem ręcznie na serwerze).
- REQ-CFG-006a (MAY): flaga `--warn-drift` uruchamia preflight diff przed deployem i tylko ostrzega (bez przerywania), aby wykryć drift przed uploadem.

### 10.5. Konwencja `target == config` oraz wyjątki

- Domyślnie: `config == target` (np. `robot-01` → `seal-config/configs/robot-01.json5`).
- Wyjątki są dopuszczalne i jawne:
  - `seal deploy <target> --config <config>` (jednorazowo),
  - albo `config: "<config>"` w `seal-config/targets/<target>.json5`.

**Wymaganie:** jeśli `seal-config/configs/<config>.json5` nie istnieje – Seal kończy się błędem z jednoznaczną informacją co stworzyć / jak nazwać plik.

### 10.6. Drift detection i synchronizacja configu (repo ↔ serwer)

W tej wersji dokumentu przyjmujemy zasadę:

- **Repo jest źródłem prawdy**, ale zmiana zrobiona na serwerze może zostać *świadomie* „adoptowana” z powrotem do repo.

Mechanizmy:
- `seal diff-config <target>` – pokazuje różnice pomiędzy `seal-config/configs/<config>.json5` (repo) a `shared/config.json5` (serwer) lub ostatnim snapshotem.
- `seal pull-config <target>` – pobiera aktualny config z serwera:
  - zawsze zapisuje `seal-out/remote/<target>.current.json5` + wpis do `seal-out/remote/<target>.history/`,
  - opcjonalnie `--apply` kopiuje ten plik jako `seal-config/configs/<config>.json5` (czyli „przenosi” zmianę z serwera do repo).
- `seal deploy --push-config` – nadpisuje `shared/config.json5` configiem z repo (świadome „przywrócenie” repo na serwerze).

**Uwaga o sekretach:** w tym projekcie configi i snapshoty **mogą** zawierać sekrety i jest to akceptowane. Seal nie ma chronić przed ich wyciekiem – jego celem jest ochrona kodu/logiki.


### 10.7. Samoopisująca konfiguracja (v0.3): brak ukrytych defaultów

> **Cel:** użytkownik ma móc „patrzeć w pliki” i zobaczyć wszystkie opcje – bez przekopywania dokumentacji i bez „magicznych” domyślnych zachowań ukrytych w kodzie.

#### Wymagania normatywne (REQ-CFG)

- REQ-CFG-007 (MUST): Seal **materializuje defaulty** do plików. Jeśli Seal ma parametr sterujący zachowaniem (retencja, timeouty, health-check, hardening, itp.), to:
  - albo parametr ma jawne pole w `seal.json5` / `seal-config/targets/<target>.json5`,
  - albo Seal potrafi wygenerować/wyświetlić „pełny config” (patrz `seal print-defaults`) i jednoznacznie wskazać, skąd wzięła się każda wartość.

- REQ-CFG-008 (MUST): tworzenie nowego targetu/config‑wariantu **nie wymaga ręcznego kopiowania plików**. Seal zapewnia komendy:
  - `seal target add <target>` → generuje `seal-config/targets/<target>.json5` (z pełną listą pól i placeholderami),
  - `seal config add <config> [--from <template|existing>]` → generuje `seal-config/configs/<config>.json5` jako pełny template.

- REQ-CFG-009 (MUST): Seal zapewnia `seal wizard`, który wykrywa stan projektu i podpowiada **następne kroki** (init/config/target/release/deploy).

- REQ-CFG-010 (MAY): jeśli chcesz krótszych plików, Seal może mieć tryb „compact/normalize”, ale domyślnie preferujemy jawność.

- REQ-CFG-011 (SHOULD): zachowania zależne od zmiennych środowiskowych są **niezalecane**. Jeśli istnieją (np. do diagnostyki), muszą być jawnie opisane w dokumentacji projektu i sygnalizowane w output (np. `seal check`).

## 11. Serwer/robot: bootstrap środowiska (seal-server.sh)

> W v0.4 nie chcemy osobnej „ścieżki mentalnej” w stylu `seal deploy --bootstrap`. Bootstrap jest trybem `seal deploy`.

### 11.1. Założenia
- Na serwerze nie ma zainstalowanego Seal.
- Seal łączy się przez SSH.
- SSH używa `StrictHostKeyChecking=accept-new` **celowo** (pierwsze połączenie akceptuje nowy host key). Możesz to zmienić per‑target przez `sshStrictHostKeyChecking` w `seal-config/targets/<target>.json5`.
- SSH działa w trybie **non‑interactive** (BatchMode) i **nie** obsługuje haseł/keyboard‑interactive. Wymagane są klucze SSH (ssh-agent/authorized_keys).
- Host jest offline, a wdrożenia są idempotentne.

### 11.2. Kiedy bootstrap jest potrzebny
Serwer jest „nieprzygotowany”, jeśli brakuje któregokolwiek z:
- `<installDir>/releases/`
- `<installDir>/shared/`
- `<installDir>/run-current.sh`
- systemd unit `{{serviceName}}.service`

### 11.3. Jak uruchomić bootstrap
- Pierwszy deploy:
  - `seal ship <target> --bootstrap`
- Domyślnie Seal wykonuje auto‑bootstrap, jeśli wykryje brak przygotowania (`deploy.autoBootstrap=true`).
- Jeśli auto‑bootstrap jest wyłączony i nie użyjesz `--bootstrap` na nieprzygotowanym serwerze, Seal **MUST** zakończyć się błędem z jedną, konkretną instrukcją naprawczą.

(MAY) Ręcznie na serwerze (gdy SSH jest nietypowe lub chcesz przygotować hosta bez Seala):
- `sudo bash seal-server.sh`

### 11.4. Co robi bootstrap
Bootstrap (skrypt `seal-server.sh`) MUST:
- Utworzyć strukturę katalogów:
  - `<installDir>/releases/`
  - `<installDir>/shared/`
- Ustawić właściciela `<installDir>` na użytkownika SSH (deploy zapisuje bez sudo).
- (Po pierwszym deployu) zainstalować runner `run-current.sh` i unit systemd:
  - `WorkingDirectory=<installDir>`
  - `ExecStart=<installDir>/run-current.sh`
- `current.buildId` jest zapisywany podczas deployu (pierwszy raz przy wdrożeniu).
- `appctl` jest częścią release (`releases/<buildId>/appctl`).
- Ustawić uprawnienia tak, aby użytkownik usługi mógł:
  - uruchamiać binarkę w `releases/<buildId>/`,
  - czytać i edytować `shared/config.json5`,
  - zapisać `current.buildId`,
  - skopiować `shared/config.json5` → `releases/<buildId>/config.runtime.json5` przed startem.

### 11.5. Idempotencja
- Wielokrotne uruchomienie bootstrapu nie psuje istniejącego stanu.
- Bootstrap **nie** nadpisuje `shared/config.json5` (to robi tylko `seal deploy --push-config`).

### 11.6. Kontrakt sudo / uprawnienia wdrożeniowe
`seal deploy --bootstrap` i `seal deploy` wykonują operacje typu:
- (bootstrap) utworzenie katalogów w `<installDir>` + ustawienie właściciela na użytkownika SSH,
- (bootstrap) instalacja/aktualizacja runnera + unit systemd,
- (deploy) zapis/zmiany w `<installDir>` **bez sudo** (po poprawnym bootstrapie),
- restart usługi systemd.

MVP: wymagamy `sudo` do operacji bootstrap/systemd; po bootstrapie zapis w `<installDir>` odbywa się jako użytkownik SSH.

---


## 12. Artefakty wdrożeniowe i struktura na serwerze

### 12.1. Struktura

> v0.4: **bez symlinków** jako domyślna polityka (mniej „gotcha” na dziwnych FS-ach).

```
/home/admin/apps/my-app/
  releases/
    2025-12-20_1615/
      my-app            (binarka)
      appctl            (narzędzie serwisowe, uruchamia binarkę)
      manifest.json
      config.runtime.json5   (kopiowany z shared/config.json5 przed startem)
      public/            (jeśli UI jest serwowane jako pliki)

  current.buildId        (aktywny buildId)

  shared/
    config.json5         (trwały config edytowalny na serwerze)
    data/                (opcjonalnie)

  run-current.sh         (runner usługi, uruchamia appctl z aktywnego release)

/var/lib/my-app/
  .lic                   (opcjonalnie)

/etc/systemd/system/my-app.service
```

**Jak to działa:**
- Seal wrzuca nowe release do `releases/<buildId>/...`.
- Aktywacja to ustawienie `current.buildId` na nowy buildId + restart usługi.
- `run-current.sh` uruchamia `releases/<buildId>/appctl`, który startuje binarkę z katalogu `releases/<buildId>/` (ustawia CWD) i przed startem kopiuje `shared/config.json5` → `config.runtime.json5` w release.

### 12.2.
 Manifest
Release musi zawierać `manifest.json` z co najmniej:
- `app`
- `version`
- `buildId`
- `buildTime`
- `commit` / `gitCommit` (jeśli dostępne)
- checksumami kluczowych plików (artefaktów runtime)
- (MAY) polem `signature` jeśli wdrożysz podpisywanie paczek (patrz `seal verify` w sekcji 24)

---

## 13. Usługa systemd + `appctl`

### 13.1. Wymagania systemd

- `WorkingDirectory=/home/admin/apps/<app>`
- `ExecStart=/home/admin/apps/<app>/run-current.sh`
- `Restart=on-failure` lub `always`
- uruchomienie jako osobny user (nie root)
- logi w journald (StandardOutput/StandardError = journal)
- konfiguracja runtime:
  - standard: aplikacja czyta `config.runtime.json5` z CWD,
  - `run-current.sh` uruchamia `appctl run` z aktywnego release, a `appctl` kopiuje `shared/config.json5` do `releases/<buildId>/config.runtime.json5`.

**Baseline hardening (w v0.4 rekomendowany jako domyślny, bo mało inwazyjny):**
- `NoNewPrivileges=true`
- `PrivateTmp=true`
- `ProtectHome=true`
- `LimitCORE=0` (wyłącza core dumpy)
- `UnsetEnvironment=NODE_OPTIONS` (lub ustawienie `Environment=NODE_OPTIONS=`), żeby utrudnić wtrysk flag runtime

Mocniejsze opcje sandboxingu są opisane w sekcji 30 jako „hardening opcjonalny”, bo mogą łamać integracje.

### 13.2. appctl
W implementacji v0.6 `appctl` jest dostarczany w każdym release (`releases/<buildId>/appctl`), a runner `run-current.sh` używa go do startu.
`appctl` ma zapewniać:
- `status` – systemd status
- `restart`, `stop`, `start`
- `logs -f` – live journald
- `run` – foreground
- `doctor` – szybka diagnostyka
- `rollback` – powrót do poprzedniej wersji (jeśli dostępne)
- (opcjonalnie) `support-bundle` – paczka diagnostyczna

---

## 14. Sealing: bundlowanie, minifikacja, obfuskacja, binarka

### 14.0. Jak „silne” jest to rozwiązanie (bez marketingu)

Seal ma być **bardzo trudny do zreverse‑engineerowania**, ale nie „magiczny”.

Warstwy (od najbardziej praktycznych):
1) **Single Executable (SEA)** → na hoście nie ma czytelnych źródeł backendu i nie ma `node_modules`.
2) **Bundle do 1 pliku + agresywna obfuskacja** → nawet jeśli ktoś wyciąga logikę z runtime, dostaje „zupę” trudną do zrozumienia.
3) **Baseline hardening systemd** → utrudnia szybkie sztuczki typu `NODE_OPTIONS=--inspect`, core dumpy, itp.
4) **(Opcjonalnie) Anti‑copy / licencja** → utrudnia uruchomienie skopiowanej binarki na innym hoście.
5) **(Domyślnie) Pack bundla (SEA, bundle tylko jawnie)** → brak plaintext kodu w artefaktach (SEA main packing + gzip loader w bundle, gdy włączony).
6) **ELF packer (domyślnie, thin‑split)** → kiteshield (`-n`) dla launchera `b/a`; `SEA` i `thin-single` ignorują packer/strip (auto-disabled).

W praktyce:
- przeciw A1/A2 (z sekcji 3.3) rozwiązanie jest bardzo mocne,
- przeciw A3 jest „tylko” bardzo kosztowne do złamania. O to chodzi.

### 14.1. Wymóg ogólny
- Projekt działa w dev bez sealingu.
- „Zero refactor” jest celem ergonomii, ale **nie jest gwarancją**: projekty muszą być bundlowalne i SEA‑kompatybilne, a Seal powinien to wykrywać zawczasu (`seal check`).

### 14.2. Poziomy zabezpieczeń
- **Minifikacja**: usunięcie białych znaków, skrócenie symboli.
- **Obfuskacja agresywna**: zaciemnianie przepływu, string encoding, dead code.
- **Bundlowanie**: ograniczenie liczby plików.
- **Single artifact**: preferowany jeden plik uruchomieniowy.
- **Domyślnie**: pack bundla (SEA main packing + gzip loader w bundle, gdy włączony) – bez plaintext JS w artefaktach.

**Domyślnie (thin‑split)**: ELF packer (kiteshield, `-n`).  
`SEA` i `thin-single` ignorują packer/strip; użyj `thin-split` albo wyłącz `elfPacker`.  
Rekomendowana kolejność packerów: `kiteshield` → `midgetpack` → `upx`.


#### 14.2.1. Definicja „SEALED” (weryfikowalna checklista)

Poniższe reguły dotyczą domyślnego trybu `packager=sea` (single executable). Dla packagera bundle Seal może mieć osobny zestaw reguł.

**FORBIDDEN w paczce release (MUST):**
- pliki źródłowe backendu: `**/*.js`, `**/*.ts` **poza** `public/**` (UI)
- sourcemapy: `**/*.map` oraz osadzone `sourcesContent`
- ślady sourcemap: linie `//# sourceMappingURL=...` (również poza `public/**`)
- struktura projektu ułatwiająca analizę: katalogi `src/`, `node_modules/`, `test/` (chyba że jawny tryb bundle)

**ALLOWED (MUST):**
- binarka aplikacji (single executable)
- `manifest.json`
- `config.runtime.json5` (kopia `shared/config.json5`, przygotowywana przez `appctl` przed startem)
- `public/**` (jeśli UI istnieje; UI i tak jest do odczytu w przeglądarce)
- `appctl` w release (narzędzie serwisowe)

**Wymagania narzędziowe:**
- REQ-SEA-010 (MUST): `seal verify` potrafi wykryć naruszenia tej checklisty lokalnie (na `.tgz`) i zdalnie (na `current`).
- REQ-SEA-011 (MUST): `seal deploy` uruchamia `seal verify` jako preflight (przed uploadem i/lub przed ustawieniem `current.buildId`).
- REQ-SEA-012 (SHOULD): `seal verify --summary` wypisuje czytelny „poziom sealed” (np. HIGH/MED) na tle klas atakującego A1/A2/A3.
### 14.3. Tryby pakowania
Seal powinien wspierać co najmniej jeden stabilny tryb, preferencyjnie:
- tryb A: single executable (np. SEA lub inne podejście) + wbudowany kod.

Dopuszczalne jest zaprojektowanie Seal jako systemu “pluggable packagers”, aby w przyszłości zmieniać narzędzia bez zmiany standardu.


#### 14.3.1. Ograniczenia i „gotcha” dla Node SEA (MUST do przeczytania)

SEA w Node (Single Executable Application) ma twarde ograniczenia, które determinują cały pipeline:

- SEA osadza **jeden** entry script i w praktyce wymaga, aby wynik bundla był **pojedynczym plikiem CommonJS**.
- Wersja Node użyta do wygenerowania blobu i binarka, do której blob jest wstrzykiwany, **musi** być zgodna (praktycznie: ta sama wersja z pinowanego toolchainu).
- SEA jest oznaczone jako *experimental* w CLI Node – dlatego:
  - Seal **pinuję** wersję Node w toolchainie,
  - Seal ma plan awaryjny (bundle packager / tryb mniej agresywny), jeśli SEA zawiedzie na danym OS/arch.

**Cross‑build:** w v0.4 MVP zakłada build na tej samej platformie co target (najmniej ryzyk). Cross‑build jest dopuszczalny jako MAY, ale wymaga jawnych ustawień „bezpiecznych” dla SEA (bez snapshot/cache tam, gdzie to problematyczne).

**Wtrysk flag runtime:** w v0.4 stosujemy podejście warstwowe:
- SEA: ograniczamy execArgv injection w konfiguracji SEA (jeśli dostępne w danej wersji Node),
- systemd: `UnsetEnvironment=NODE_OPTIONS` jako baseline.

### 14.4. Wymagania kompatybilności kodu
- brak `eval`/`new Function` w runtime,
- brak dynamicznych importów/require po stringach,
- minimalizacja zależności natywnych,
- nie polegać na nazwach funkcji/klas w logice (obfuskacja je zmienia).


### 14.5. Rekomendowana metoda „super sealing” (domyślna): Bundle → Obfuscate → Node SEA → Protection/Pack

> **Cel:** uzyskać na serwerze/robocie **pojedynczy artefakt uruchomieniowy** (binarka/single-file) bez czytelnych źródeł `.js`, przy zachowaniu przewidywalnego workflow dev → release → deploy.

#### 14.5.1. Założenia
- Sealed artefakt jest **platform-specific** (OS/arch). Seal buduje osobny release dla każdego typu hosta docelowego.
- Aplikacja w dev działa w czystym Node.js.
- Sealing jest uruchamiany dopiero przy `seal deploy` (wewnętrznie: etap release).
- Toolchain używany do sealingu jest **pinowany** (wersje narzędzi i Node) i dostępny offline.

#### 14.5.2. Kroki build (normatywne)
1) **Bundle backendu do jednego pliku (CommonJS):**
   - wynik: `seal-out/stage/bundle.cjs` (pojedynczy plik, `format=cjs`).
   - sourcemapy: generowane jako plik zewnętrzny wyłącznie do użytku lokalnego (nie trafiają na serwer).

2) **Obfuskacja zbundlowanego pliku:**
   - wejście: `seal-out/stage/bundle.cjs` → wyjście: `seal-out/stage/bundle.obf.cjs`.
   - Seal definiuje profile obfuskacji (co najmniej):
     - `minimal` (najbardziej kompatybilny),
     - `balanced` (domyślny „balanced-but-stable”),
     - `strict` (wysoka ochrona, po E2E),
     - `max` (najsilniejszy, opcjonalny – może wpływać na wydajność/rozmiar).

3) **Przygotowanie blobu SEA (Single Executable Application):**
   - generacja `seal-out/stage/sea-prep.blob` na podstawie `seal-out/stage/bundle.obf.cjs`.
   - Seal używa pinowanej wersji Node do generacji blobu.

4) **Złożenie binarki:**
   - Seal kopiuje binarkę `node` (tej samej wersji) do `seal-out/release/<app>`.
   - Następnie **wstrzykuje** `sea-prep.blob` do binarki (sekcja/fuse dla SEA).
   - Seal ustawia parametry ograniczające „wtrysk” opcji runtime (np. wyłączenie rozszerzeń `execArgv`), aby utrudnić manipulacje środowiskowe na hoście docelowym.

5) **(Opcjonalnie) Wbudowanie read-only assets:**
   - Jeśli dane (np. stałe JSON-y) są częścią IP i są read-only, powinny zostać:
     - albo wciągnięte do bundla przez import/require,
     - albo (jeśli packager to wspiera) wbudowane jako assets w artefakt.

6) **Protection/pack (domyślnie włączone):**
   - **SEA:** Seal domyślnie pakuje backend bundle do „loadera” (Brotli/Gzip) *przed* generacją blobu SEA, aby w blobie nie było plaintext JS.
   - **Bundle (jawny wybór):** packager `bundle` pakuje backend bundle do `app.bundle.cjs.gz` i uruchamia go przez mały loader (brak czytelnego pliku JS obok launchera).
   - **ELF packer (thin‑split):** domyślnie uruchamiany jest `kiteshield` (`-n`) na launcherze `b/a`.  
     `SEA` i `thin-single` ignorują packer/strip (auto-disabled).
     - Gdy `elfPacker.tool="upx"` jest włączony i nie działa (brak narzędzia lub błąd typu `CantUnpackException: bad e_phoff`), build **musi** się przerwać z błędem.
     - Gdy `strip` jest włączony i narzędzie jest niedostępne, Seal wypisuje ostrzeżenie (bez przerywania builda).
  - Użytkownik **MUST** mieć możliwość wyłączenia protection w `seal.json5` (np. `build.protection.enabled=false`).
   - (MAY) w przyszłości: self-integrity / anti-tamper jako opcja (nie domyślna w v0.5).

7) **Utworzenie paczki release:**
   - `seal-out/<app>-<buildId>.tgz` zawiera:
     - binarkę `/<app>` (single executable),
     - `manifest.json`,
     - `config.runtime.json5` przygotowany jako kopia `shared/config.json5` przed startem.
   - Paczka **nie** zawiera sourcemap i nie zawiera źródeł projektu.

#### 14.5.3. Wymogi dla środowiska build
- Seal musi umożliwiać budowanie na tej samej platformie co target (rekomendowane) lub zapewnić jasną strategię cross-build.
- Wersja Node użyta do SEA jest częścią toolchainu i jest pinowana w Seal.
- Seal przechowuje narzędzia buildowe w sposób umożliwiający użycie offline (bez pobierania z internetu w trakcie build).

#### 14.5.4. Ograniczenia i kompromisy
- Obfuskacja „max” może:
  - zwiększać rozmiar binarki,
  - pogarszać czas startu,
  - czasem obniżać kompatybilność.
  Dlatego profil `balanced` jest domyślny, a `strict`/`max` są świadomymi opcjami.
- „Niemożliwe do odczytania” nie jest gwarantowalne przy pełnym dostępie do hosta; celem jest maksymalne utrudnienie i podniesienie kosztu ataku.

#### 14.5.5. Tryby alternatywne (bundle)
- Seal powinien przewidywać możliwość wpięcia alternatywnego packagera (np. w razie ograniczeń SEA):
  - zachowując **ten sam interfejs** `seal deploy` i format paczki wdrożeniowej.




### 14.6. Blueprint implementacji „super sealing (SEA)” – przeniesione do SEAL_DEPLOY_REFERENCE (v0.4)

> W docsecie v0.3 długie elementy implementacyjne (blueprinty, szablony krok‑po‑kroku) są utrzymywane w osobnym dokumencie **SEAL_DEPLOY_REFERENCE v0.4**.
>
> Dzięki temu SPEC nie jest zakładnikiem aktualnych narzędzi (SEA/postject/esbuild), a jednocześnie nic nie ginie.

Zobacz: **SEAL_DEPLOY_REFERENCE v0.4**, sekcja „Blueprint: implementacja super sealing (SEA)”.

---


## 15. Frontend: zabezpieczenie (domyślnie włączone)

Frontend zawsze będzie „łatwiejszy do podejrzenia” (bo działa w przeglądarce). SEAL nie obiecuje magii — celem jest **utrudnienie prostego podglądu** (view-source / proste otwarcie pliku), a nie kryptografia.

### 15.1. Zachowanie domyślne (v0.5)
- Podczas `seal release` oraz `seal deploy` SEAL **obfuskuje pliki frontendu** w `public/**/*.js` (pomija `*.min.js`).
- SEAL **bezpiecznie minifikuje** `public/**/*.html` i `public/**/*.css` (pomija `*.min.html` i `*.min.css`), domyślny poziom: `safe`.
- Obfuskacja jest „browser-safe” (konserwatywna): nie robi agresywnych transformacji, które często psują DOM i API.
- Minifikacja ma poziomy i opcje per-przypadek (patrz 15.2).
- SEAL zapisuje podsumowanie lokalnie w `seal-out/meta.json` (pola `frontendObfuscation`, `frontendMinify`). Plik `meta.json` **nie trafia do artefaktu release**.
- SEAL nie zapisuje żadnych markerów "toolowych" w release (żadne pliki zaczynające się od `.seal_` nie powinny trafiać do artefaktu).

### 15.2. Konfiguracja
W `seal.json5`:

#### Poziomy minifikacji
- `safe` (domyślny):
  - usuwa **puste** komentarze HTML (może złamać SSR/hydration, jeśli używasz pustych komentarzy jako anchorów),
  - zwija białe znaki **między tagami** (może wpływać na layout z `white-space: pre*`),
  - usuwa komentarze CSS (może zepsuć niektóre niecytowane `data:` URI i usuwa komentarze licencyjne),
  - zwija białe znaki w CSS.
- `minimal`:
  - nie usuwa komentarzy HTML/CSS,
  - nie zwija białych znaków między tagami,
  - zostawia tylko bezpieczne zwijanie białych znaków w CSS (możesz je wyłączyć per-przypadek).

- wyłączenie:
```json5
build: {
  frontendObfuscation: { enabled: false }
}
```

- ustawienie profilu:
```json5
build: {
  frontendObfuscation: { enabled: true, profile: "minimal" } // albo "balanced" / "strict" / "max"
}
```

- wyłączenie minifikacji:
```json5
build: {
  frontendMinify: { enabled: false }
}
```

- ustawienie poziomu:
```json5
build: {
  frontendMinify: { enabled: true, level: "minimal" }
}
```

- wyłączenie tylko CSS lub HTML:
```json5
build: {
  frontendMinify: { enabled: true, html: true, css: false }
}
```

- case-by-case (nadpisanie poziomu):
```json5
build: {
  frontendMinify: {
    level: "minimal",
    html: { stripComments: true, collapseWhitespace: false },
    css: { stripComments: false, collapseWhitespace: true }
  }
}
```

Opcje:
- `html.stripComments`: usuwa tylko puste komentarze HTML (`<!--   -->`).
- `html.collapseWhitespace`: zwija białe znaki między tagami.
- `css.stripComments`: usuwa komentarze `/* ... */`.
- `css.collapseWhitespace`: zwija białe znaki w CSS.

### 15.3. Wymagania normatywne
- **REQ-SEC-FE-001:** Obfuskacja frontendu **MUST** być włączona domyślnie.
- **REQ-SEC-FE-002:** Użytkownik **MUST** móc ją jawnie wyłączyć w konfiguracji projektu.
- **REQ-SEC-FE-003:** Domyślne ustawienia obfuskacji **MUST** być „browser-safe” (nie psuć typowych aplikacji bez frameworków).
- **REQ-SEC-FE-004:** Minifikacja HTML/CSS **MUST** być domyślnie włączona, z poziomem `safe`.
- **REQ-SEC-FE-005:** Poziom `minimal` **MUST NOT** usuwać komentarzy HTML/CSS ani zwijać białych znaków między tagami.
- **REQ-SEC-FE-006:** Użytkownik **MUST** móc wyłączyć minifikację globalnie, per-typ (HTML/CSS) oraz per-zachowanie (komentarze/whitespace).

---

## 16. Zasoby (assets) i pliki danych

### 16.1. Read-only assets (część IP)
- Jeśli pliki danych (np. JSON) są stałe i nieedytowalne, preferowane jest wciągnięcie ich do bundla (import/require), aby nie leżały obok binarki.

### 16.2. Editable/runtime assets
- Config i dane runtime muszą być poza artefaktem (shared).

---

## 17. Mechanizm anty-kopiowania (opcjonalnie)

### 17.1. Cel
- Utrudnić uruchomienie skopiowanej binarki poza autoryzowanym hostem.

### 17.2. Wymagania
- sentinel/licencja przechowywana w katalogu tylko dla usługi (np. `/var/lib/<app>/.lic`).
- weryfikacja podpisu (preferowana kryptografia asymetryczna).
- fingerprint hosta (np. machine-id + dodatkowe elementy).
- tryb awarii mało-informacyjny (ale diagnozowalny dla serwisu).

---

## 18. Standard jakości SEAL_STANDARD v1.3 (modułowy)

> Ten standard jest częścią Seal. Seal dostarcza dokument standardu i referencyjne szablony do jego implementacji.

### 18.1. Zasady ogólne
- Standard opisuje wymagania MUST/SHOULD.
- Standard jest wersjonowany.
- Projekt deklaruje wersję i moduły w `seal-config/standard.lock.json`.

### 18.2. Moduły Core (MUST)

#### A) Logging (MUST)
- Logi strukturalne (JSON Lines) w produkcji.
- Minimalne pola: `ts`, `lvl`, `evt`.
- `evt` to kod zdarzenia z ustalonego słownika (odporny na obfuskację).
  - Konwencja: namespace w stylu `APP_*`, `DEP_*`, `CFG_*`, `INT_*`.
  - (MAY) wersjonowanie słownika eventów (np. `evtSchemaVersion` w `/status` lub w `APP_START`).
- Każdy błąd generuje `errorId`.
- Polityka „logi bez sekretów” nie jest wymuszana przez Seal (sekrety nie są celem ochrony w tym projekcie).
- Log startu aplikacji (`APP_START`) zawiera: version, buildTime, commit, ścieżkę configu.

#### B) Config (MUST)
- Konfiguracja runtime jest w pliku `config.runtime.json5` (lub json).
- Walidacja configu na starcie (czytelny błąd wskazujący pole/typ).
- (MAY) `configVersion` (opcjonalne; w v0.4 nie jest wymagane).

#### C) Health/Status (MUST)
- `GET /healthz`:
  - zwraca 200, jeśli proces żyje,
  - nie zależy od systemów zewnętrznych,
  - jest szybki.
- `GET /status`:
  - zawiera wersję/build/uptime,
  - raportuje zależności jako: `ok|degraded|down` + `lastOkAt` + `msg`.
  - **Minimalny schemat (normatywnie):** `version`, `buildId` (lub `build`), `buildTime` (jeśli znane), `uptimeSec`, `deps`.
  - Dostępność: w v0.4 endpointy `/healthz` i `/status` są traktowane jako **publiczne** (na tym samym porcie co aplikacja). (MAY) jeżeli kiedyś wystawisz to do internetu, możesz je schować za reverse‑proxy / firewallem.

#### D) Service readiness (MUST)
- Obsługa SIGTERM (graceful shutdown).
  - (SHOULD) limit czasu na shutdown (np. max 10s), żeby systemd nie wisiał.
- `uncaughtException`/`unhandledRejection`:
  - log + kontrolowane zakończenie procesu (exit != 0).

#### E) systemd + appctl (MUST)
- Referencyjny unit systemd i `appctl`.
- `appctl doctor` minimalnie:
  - status systemd,
  - test `/healthz` i `/status`.

### 18.3. Moduły UI resilience (MUST jeśli UI istnieje)
- UI odświeża `/status` cyklicznie.
- Brak połączenia z backendem:
  - banner/ekran “Brak połączenia”,
  - pokazanie czasu ostatniego udanego update.
- Backend OK, dependency down:
  - UI pokazuje “System działa, ale …” + `lastOkAt`.
- Stopka UI:
  - last update,
  - status backend,
  - version/build.

### 18.4. Moduły Integrations (SHOULD/MUST zależnie od projektu)
- Timeouty na każde połączenie.
- Retry/backoff z limitem.
- Circuit breaker (zalecany).
- Raport stanu integracji do `/status`.

### 18.5. Moduły Diagnostics (SHOULD)
- `appctl support-bundle`:
  - snapshot `/status`,
  - wersja/build,
  - logi z ostatnich N minut,
  - oznaczenie trybu bundle: `full|safe` (patrz SEAL_STANDARD v1.3),
  - (opcjonalnie) `configHash` i/lub config (w trybie `full`),
  - manifest release.

### 18.6. Kontrakt dla AI (SHOULD, ale silnie zalecane)

> **Cel:** maksymalnie przenieść „myślenie o sealowaniu” do standardu i do promptów dla AI, tak aby projekty generowane przez AI były z góry kompatybilne z sealingiem.

W ramach SEAL_STANDARD v1.3 Seal dostarcza plik (do skopiowania do repo aplikacji):
- `SEAL_CONTRACT_AI.md` – krótka, jednoznaczna lista zasad dla kodu generowanego przez AI (np. brak `eval`, brak dynamicznych importów, statyczne importy assets, jednolity loader configu, wymagane endpointy `/healthz` i `/status`, format logów).

W repo aplikacji plik ten może żyć jako:
- `SEAL_CONTRACT_AI.md` (wersjonowany razem z projektem).

**Wymaganie:** treść kontraktu musi być zwięzła i „promptable” (łatwa do wklejenia do AI), bez wieloznaczności.

---

## 19. Wersjonowanie standardu i “lock” w projekcie

### 19.1. Plik lock
`seal-config/standard.lock.json` zawiera:
- nazwę standardu,
- wersję,
- listę modułów.

Przykład:
```json
{
  "standard": "SEAL_STANDARD",
  "version": 1,
  "modules": ["logging", "config", "status", "service", "ui_resilience", "integrations"]
}
```

### 19.2. Zasada kompatybilności
- Projekt implementuje wymagania standardu zgodnie z lock.
- Zmiana standardu (np. v1 → v2) jest jawna (zmiana lock).

---

## 20. Przykładowa aplikacja referencyjna

Seal dostarcza sample-app, która implementuje:
- config.runtime.json5 + walidacja,
- /healthz i /status,
- logowanie event codes,
- UI z bannerem braku połączenia i stopką last update,
- uruchamianie jako systemd + appctl.

Celem sample-app jest:
- umożliwienie testu end-to-end: init → ship --bootstrap → ship → remote status/logs.

---

## 21. Kryteria akceptacyjne (Definition of Done)

### 21.1. Minimalne
- Nowy projekt można przygotować `seal init`.
- Po `git clone` repo aplikacji można uruchomić lokalnie bez plików spoza repo.
- `seal ship <target> --bootstrap` przygotowuje serwer (uruchamia bootstrap przez SSH).
- `seal ship <target>` wdraża nową wersję jako systemd service.
- Na serwerze dostępne jest `appctl logs -f` i `appctl doctor`.
- Runtime config na serwerze nie jest nadpisywany przez deploy (domyślnie).
- `seal ship` zapisuje snapshot configu z serwera do repo.

### 21.2. Zabezpieczenie (cel nadrzędny)
- Artefakt produkcyjny **nie zawiera czytelnych źródeł `.js`** projektu ani struktury ułatwiającej analizę (np. katalogów źródeł).
- Artefakt jest możliwie pojedynczy (single file / single executable) i uruchamialny na hoście docelowym.
- Domyślny tryb „super sealing” generuje single executable (SEA) dla danego target OS/arch.
- Obfuskacja backendu jest “maksymalna praktycznie” (agresywna) w ramach zachowania poprawnego działania.
- Opcjonalna kompresja/ukrycie binarki działa jako przełącznik.

### 21.3. Standard jakości
- Sample-app spełnia SEAL_STANDARD v1.3.
- Szablony w Seal umożliwiają szybkie zastosowanie standardu.

---

## 22. Zakres poza projektem (non-goals)

- 100% ochrona przed reverse engineering przy pełnym dostępie root (nierealne).
- Wymóg pełnej przenośności binarki między wszystkimi systemami bez ograniczeń (może wymagać osobnych buildów per OS/arch).
- Automatyczne “naprawianie” projektu przez Seal (to może robić AI/człowiek; Seal definiuje standard).

---

## 23. Aneksy: przykłady plików i formatów

### 23.1. Przykład `seal-config/targets/robot-01.json5`
```json5
{
  host: "10.0.0.23",
  user: "robot",
  sshPort: 22,
  installDir: "/home/admin/apps/my-app",
  serviceName: "my-app",
  serviceUser: "my-app",
}
```

### 23.2. Przykład `seal-config/configs/robot-01.json5`
```json5
{
  http: { port: 8080 },
  rds: { url: "http://127.0.0.1:8080" },
  allowedRobots: ["AGV-01", "AGV-02"],
  features: {
    // przykładowe flagi runtime aplikacji (nie związane z SEAL)
    debugUi: false,
    logLevel: "info"
  }
}
```

### 23.3. Przykład logów (JSONL)
```json
{"ts":"2025-12-20T16:20:01.123Z","lvl":"info","evt":"APP_START","ver":"1.0.0","build":"2025-12-20_1615"}
{"ts":"2025-12-20T16:20:03.017Z","lvl":"error","evt":"RDS_CONN_FAIL","errorId":"E7K3-2Q9M","msg":"ECONNREFUSED"}
```

### 23.4. Przykład `/status`
```json
{
  "version": "1.0.0",
  "build": "2025-12-20_1615",
  "uptimeSec": 1234,
  "deps": {
    "backend": {"state": "ok"},
    "rds": {"state": "down", "lastOkAt": "2025-12-20T15:10:00Z", "msg": "ECONNREFUSED"}
  }
}
```

---

## 24. Specyfikacja CLI (komendy, parametry, wyjścia, exit codes)

> **Cel tej sekcji:** doprecyzować zachowanie Seala tak, aby implementacja była jednoznaczna, a UX „łatwy do zapamiętania”.
>
> **Zasada nadrzędna:** SEAL ma prowadzić za rękę. Użytkownik nie powinien „znać specyfikacji”, żeby działać skutecznie.

### 24.1. Zasady ogólne CLI

- Seal jest instalowany lokalnie na komputerze deweloperskim jako komenda `seal`.
- Seal jest uruchamiany w katalogu projektu (lub podkatalogu). Root projektu wykrywa po obecności `seal.json5`.
- Seal nie wymaga istnienia Seala na serwerze.
- Seal działa w trybie offline (nie wymaga internetu do typowego działania; toolchain może być instalowany lokalnie/prefetch).
- **Zasada minimalnych komend (MUST):**
  - lokalny loop zabezpieczenia: `seal release` → `seal verify` → `seal run-local`,
- wdrożenie: `seal ship <target>` (a `seal deploy` to tryb manualny).

### 24.2. Domyślności (żeby nie pisać tego samego)

**Rozpoznanie default targetu (MUST):**
1) jeśli `seal.json5` zawiera `default_target`, użyj go,
2) w przeciwnym razie, jeśli istnieje target `local`, użyj `local`,
3) w przeciwnym razie, jeśli istnieje dokładnie jeden target, użyj go,
4) w przeciwnym razie wypisz listę targetów i:
   - (SHOULD) pozwól wybrać interaktywnie,
   - albo zakończ czytelnym błędem i instrukcją.

**Konwencja `config == target` (MUST):**
- jeśli komenda przyjmuje `<config>` i nie podano `--config`, to `config = <target>`.
- jeśli `seal-config/configs/<config>.json5` nie istnieje, SEAL:
  - (SHOULD) proponuje utworzenie przez `seal config add <config>`.

**Artefakt ostatniego builda (MUST):**
- SEAL zapisuje metadane „ostatniego release” do `seal-out/meta.json` (lub równoważnie) tak, aby:
  - `seal verify` i `seal run-local` mogły działać bez podawania ścieżki.

### 24.3. `seal` jako wizard / help (MUST)

`seal` bez argumentów ma działać jako „wizard”:
- wykrywa stan projektu (brak `seal.json5` → brak targetów → brak configów → brak buildów),
- wypisuje 3–5 **najbardziej sensownych następnych kroków**,
- podaje przykładowe komendy dokładnie w formie „copy/paste”.
- (SHOULD) w trybie TTY pyta o wybór i uruchamia wybraną komendę.
- (SHOULD) opisuje krótko każdą komendę i wskazuje rekomendowaną na teraz.

Przykładowe reguły:
- jeśli brak `seal.json5` → sugeruj `seal init`,
- jeśli brak `seal-config/configs/local.json5` → sugeruj `seal init` (naprawa),
- jeśli brak artefaktu → sugeruj `seal release`,
- jeśli ostatni release jest OK → sugeruj `seal run-local` i `seal verify`,
- jeśli są targety serwerowe → sugeruj `seal ship <target>`.

Alias (MAY): `seal wizard`.

### 24.4. Konwencje nazw
- `<target>`: nazwa targetu, np. `robot-01` → `seal-config/targets/robot-01.json5`.
- `<config>`: nazwa wariantu configu runtime, np. `robot-01` → `seal-config/configs/robot-01.json5`.
- `<artifact>`: plik artefaktu `.tgz` w `seal-out/`.

### 24.5. Komendy

#### `seal init`
**Cel:** podłączyć projekt pod SEAL (NEW/ADOPT).

**MUST**
- tworzy `seal.json5` wraz z minimalną konfiguracją,
- tworzy `seal-config/configs/local.json5`,
- tworzy `config.runtime.json5` (dla dev-run),
- tworzy `seal-config/targets/local.json5`,
- ustawia `default_target=local`.

**Wyjście (MUST):**
- informacja co utworzono,
- „next step hint” (np. `node <entrypoint>` oraz `seal release`).

---

#### `seal check`
**Cel:** wykryć problemy kompatybilności (bundlowanie/SEA/standard) zanim wejdziesz w obfuskację i binarki.

- wykrywa typowe „miny” (np. `eval`, dynamiczne importy, wymagania natywne),
- zwraca listę findings + sugestie.

---


---

#### `seal wizard`
**Cel:** interaktywnie przeprowadzić użytkownika przez „co dalej”.

- w trybie TTY: pokazuje menu i uruchamia wybraną komendę,
- bez TTY: wypisuje sugerowane następne kroki jako gotowe komendy,
- wykrywa brakujące elementy (`seal.json5`, config, target) i podpowiada jak je utworzyć.

---

#### `seal plan [<target>]`
**Cel:** wygenerować plan (decision trace) bez wykonywania release/deploy.

- generuje `seal-out/run/plan.md` i `seal-out/run/plan.json`.

#### `seal release [<target>]`
**Cel:** zbudować sealed release lokalnie.

**Domyślne zachowanie (MUST):**
- jeśli nie podano `<target>`, używa default targetu (sekcja 24.2),
- uruchamia `seal check` (fail-fast),
- buduje artefakt `seal-out/<app>-<buildId>.tgz`,
- rozpakowuje artefakt do `seal-out/release/` (zawsze tylko ostatni release),
- zapisuje metadane last-build (żeby `verify/run-local` działały bez argumentów),
- generuje `seal-out/run/plan.md` + `seal-out/run/plan.json`.

**Flagi:**
- `--config <config>`: override konwencji `config == target`.
- `--skip-check`: pomija `seal check` (tylko dla power-userów).
- `--artifact-only`: nie rozpakowuje do `seal-out/release/` (tylko `seal-out/*.tgz`).
- `--out <dir>`: docelowy katalog dla rozpakowanego release (alternatywa dla `seal-out/`).

---

#### `seal verify [<artifact>|<target>]`
**Cel:** zweryfikować, że artefakt jest „sealed” i zgodny ze standardem.

- bez argumentów: weryfikuje ostatni build (metadane z 24.2),
- `--explain`: wypisuje czytelną checklistę (co sprawdzono i dlaczego).

---

#### `seal run-local [<target>]`
**Cel:** uruchomić sealed build lokalnie (test zabezpieczenia bez deployu).

**MUST**
- używa `seal-out/release/` (lub buduje, jeśli brak),
- zapewnia `config.runtime.json5` (kopia z `seal-config/configs/<config>.json5`),
- uruchamia binarkę i przekazuje stdout/stderr wprost.

---

#### `seal target add <target>`
**Cel:** dodać nowy target (szablon `seal-config/targets/<target>.json5`).

#### `seal config add <config>`
**Cel:** dodać nowy config runtime (szablon `seal-config/configs/<config>.json5`).

---

#### `seal ship <target...> [--bootstrap]`
**Cel:** build + deploy + restart + readiness (główna ścieżka).

**MUST**
- wspiera wiele targetów: `seal ship robot-01 robot-02`,
- generuje `seal-out/run/`,
  - ma atomowe przełączenie release + restart + health-check + rollback.

**Flagi (skrót):**
- `--bootstrap`: przygotowanie serwera (katalogi + uprawnienia; po udanym deployu instalacja runnera + unit, bez autostartu).
- `--push-config`: świadomie nadpisuje `shared/config.json5` na serwerze wersją z repo.
- `--profile-overlay <name>` / `--fast`: tymczasowe nadpisania builda.
- `--no-wait` lub `--wait-*`: sterowanie readiness po restarcie.

#### `seal deploy <target...> [--bootstrap]`
**Cel:** manualny deploy (kopiowanie + instalacja release). Restart tylko z `--restart`.

**MUST**
- wspiera wiele targetów: `seal deploy robot-01 robot-02`,
- generuje `seal-out/run/`.

**Flagi (skrót):**
- `--bootstrap`, `--push-config`, `--artifact <path>`, `--restart`, `--wait-*`.

---

#### Komendy serwisowe
- `seal remote <target> status` – status usługi + „co jest current”.
- `seal remote <target> logs` – journalctl dla usługi.
- `seal remote <target> restart` – restart usługi.
- `seal remote <target> disable` – stop + disable autostart.
- `seal releases <target>` – lista release (z oznaczeniem current + last-known-good).
- `seal rollback <target> [--to <buildId>]` – rollback do poprzedniego lub konkretnego release.

---

#### Konfiguracja i drift
Docelowe API (MUST) jako podkomendy:
- `seal config diff <target>` – różnice configu repo vs serwer/snapshot,
- `seal config pull <target> [--apply]` – pobierz config z serwera (świadome „serwer → repo”),
- `seal config push <target>` – świadomie wypchnij config z repo na serwer.

Kompatybilność (MAY): aliasy historyczne `seal diff-config`, `seal pull-config`.

---

#### Diagnostyka i toolchain
- `seal doctor` (MUST): jedna komenda sprawdzająca typowe problemy (lokalne + połączenie + prawa).
- `seal toolchain status|install` (MAY): prefetch/instalacja toolchainu do pracy offline.

---

#### `seal uninstall <target> [--keep-config]`
**Cel:** odinstalować usługę i pliki (lifecycle po testach).

- usuwa unit systemd,
- usuwa katalog instalacji,
- `--keep-config` zostawia `shared/config.json5` (jeśli istnieje).

### 24.6. Exit codes (globalne)
- 0: OK
- 10: błąd użycia CLI (argumenty)
- 20: błąd lokalny (build/seal)
- 30: błąd komunikacji (SSH/transport)
- 40: błąd po stronie serwera (bootstrap/systemd/struktura)
- 50: health-check failed / rollback failed

---

## 25. Specyfikacje plików i schematy (project/targets/configs/manifest w `seal.json5` + `seal-config/`)

> **Cel tej sekcji:** usunąć niejednoznaczności implementacyjne poprzez jawne “schematy” plików.

### 25.1. `seal-config/targets/<target>.json5` (deploy-only)
**Wymagane pola:**
- `host` (string)
- `user` (string)
- `sshPort` (number, domyślnie 22)
- `installDir` (string, domyślnie `/home/admin/apps/<app>`)
- `serviceName` (string)

**Opcjonalnie:**
- `serviceUser` (string; domyślnie `user`)

**Zakazane:** dowolne parametry aplikacji.

### 25.2. `seal-config/standard.lock.json`
- `standard` (string)
- `version` (number)
- `modules` (array[string])

### 25.3. `seal-config/configs/<config>.json5` i `config.runtime.json5`
- Format: JSON5 (lub JSON).
- Musi być możliwe wyrażanie obiektów i tablic.
- Zalecane pola meta: `configVersion`.

### 25.4. `manifest.json` w release
**Wymagane pola:**
- `app` (string)
- `version` (string)
- `buildId` (string)
- `buildTime` (string ISO)
- `commit` (string, opcjonalnie)
- `artifact` (opis plików w release, w tym checksumy)


### 25.5. `seal-out/run/` (artefakty uruchomienia; ostatni run)

**Wymaganie (MUST, v0.4):** SEAL zapisuje artefakty ostatniego uruchomienia do jednego katalogu: `seal-out/run/` (nadpisywanego).

`seal-out/run/` zawiera minimum:
- `plan.md`, `plan.json`
- `run.log`, `run.json`
- `verify-report.json`
- `context.json`

**Snapshot awarii (SHOULD):**
- Jeśli uruchomienie zakończy się błędem, SEAL zachowuje ostatni fail jako:
  - `seal-out/run.last_failed/` (nadpisywany wyłącznie przy failu)

### 25.6. `plan.json` (minimalny format)

**Cel:** format dla AI/narzędzi.  
**Wymóg:** zawiera *decision trace* (co wybrano i dlaczego) oraz listę kroków wykonania.

Minimalne pola (MUST):
- `version` (int)
- `target` (string)
- `securityProfile` (string: `minimal|balanced|strict|max`, opcjonalnie)
- `initMode` (string: `NEW|ADOPT`)
- `resolvedConfig` (object)
- `decisions[]` (lista decyzji: `id/chosen/alternatives/reason`)
- `steps[]` (lista kroków: `id/cmd/cwd/envVars/expectedArtifacts`)


---

## 26. Algorytmy operacyjne (release, deploy, rollback, snapshot config)

> **Cel:** opisać krok po kroku, co ma się wydarzyć, aby implementacja była prosta i przewidywalna.

### 26.0. Minimalny blueprint architektury narzędzia (v0.4)

- **Engine:** Plan → Execute → Verify → Report
  - *Plan* (`seal plan`) generuje decision trace + kroki jako dane.
  - *Execute* (`seal deploy`) wykonuje kroki zgodnie z planem i zapisuje wyniki do `seal-out/run/`.
  - *Verify* (`seal verify`) jest bramką: reguły + checklista SEALED + raport naruszeń.
  - *Report* materializuje artefakty debug (`seal-out/run/`) gotowe do analizy.
- **Konfiguracja:** `ResolvedConfig` + jawne „sources of values” (pliki/CLI/defaulty widoczne w planie).
- **Artefakty debug:** `seal-out/run/` + `seal-out/run.last_failed/`.
- **Remote ops:** atomowy deploy + rollback.
- **Packager:** jedna domyślna ścieżka bez automatycznych fallbacków (SEA fail‑fast).

### 26.1. Algorytm `release`
1) Wykryj root projektu.
2) Wczytaj target deploy.
3) Ustal `config` (domyślnie `config == target`, z możliwością nadpisania).
4) Zbundle’uj backend do **jednego** pliku (dla SEA: CommonJS).
5) Wykonaj minifikację + agresywną obfuskację **na zbundlowanym pliku**.
6) Spakuj do single artifact (preferowane: SEA → single executable).
7) Protection/pack: domyślnie ELF packer (kiteshield, `-n`) dla thin‑split; opcjonalnie `strip`/inne packery (np. `midgetpack`, `upx`).
8) Zbuduj `manifest.json`.
9) (opcjonalnie) Decoy/joker: generuj wiarygodną strukturę projektu Node (bez nadpisywania istniejących plików).
10) Utwórz paczkę `seal-out/<app>-<buildId>.tgz`.

### 26.2. Algorytm `ship` (deploy manual)
1) (opcjonalnie) zrób `release`, jeśli nie ma paczki / jest nieświeża.
2) Ustal `config` (domyślnie `config == target`, z możliwością nadpisania).
3) (SHOULD) Załóż lock na serwerze (żeby uniknąć równoległych deployów).
4) Po SSH sprawdź istnienie `shared/config.json5` oraz podstawową strukturę katalogów.
5) Jeśli config istnieje i snapshot jest włączony:
   - pobierz plik i zapisz do `seal-out/remote/<target>.current.json5` oraz do history.
6) (SHOULD) Drift detection:
   - porównaj `seal-config/configs/<config>.json5` z configiem z serwera (snapshot),
   - ostrzeż lub zakończ błędem (domyślnie) lub tylko ostrzeż przy `--accept-drift`.
7) Upload paczki do serwera (np. `/tmp/<app>-<buildId>.tgz`).
8) Rozpakuj do `releases/<buildId>` (bez zmiany `current.buildId`).
9) Upewnij się, że `shared/config.json5` istnieje:
   - jeśli brak → seed z `seal-config/configs/<config>.json5`,
   - jeśli jest i `--push-config` → nadpisz.
10) Zapisz `current.buildId` na nowy buildId (aktywacja wersji).

Uwagi:
- `seal deploy` używa tego samego flow, ale **nie restartuje** usługi bez `--restart` i **nie czeka** na readiness bez `--wait`.
11) Restart systemd (usługa uruchomi nowy release przez `appctl`).
12) Readiness / health-check:
    - `seal ship` **domyślnie czeka** na gotowość (systemd active).
    - `seal deploy --restart --wait` robi to samo tylko gdy jawnie włączysz `--wait`.
    - (opcjonalnie) HTTP `/healthz` (`--wait-url`, `--wait-mode http|both`).
    - jeśli fail → rollback: ustaw `current.buildId` na poprzedni buildId, restart.

### 26.3. Algorytm rollback
- Rollback ustawia `current.buildId` na poprzedni release (ostatni znany dobry) i restartuje usługę.
- Mechanizm przechowuje co najmniej N ostatnich release.

---

## 27. Scenariusze end-to-end i plan testów

> **Cel:** zapewnić, że implementacja Seala i standardu jest możliwa do weryfikacji w sposób powtarzalny.
>
> **Uwaga:** pełna „ściąga” scenariuszy jest w `SEAL_SCENARIOS v0.5`. Ta sekcja definiuje scenariusze jako testy akceptacyjne.

### 27.1. E2E: nowy projekt (init → dev-run)
1) `seal init`
2) `node <entrypoint>` lub `npm run dev`
3) Aplikacja czyta `config.runtime.json5` i wystawia `/healthz`.

**Akceptacja:**
- `seal.json5` istnieje,
- `seal-config/configs/local.json5` istnieje,
- `config.runtime.json5` istnieje.

### 27.2. E2E: adopt istniejącego projektu (bez zmiany dev-run)
1) W istniejącym repo: `seal init`
2) Uruchom jak dotychczas (node/npm)

**Akceptacja:**
- dev-run działa bez użycia Seala,
- aplikacja spełnia minimalne MUST z SEAL_STANDARD (logging + health/status).

### 27.3. E2E: local preflight (check)
1) `seal check`

**Akceptacja:**
- findings są czytelne,
- exit code != 0 gdy znaleziono krytyczne „miny”.

### 27.4. E2E: local release + verify + inspect
1) `seal release`
2) `seal verify --explain`
3) `ls seal-out/` oraz `ls seal-out/release/`

**Akceptacja:**
- powstaje `seal-out/<app>-<buildId>.tgz`,
- powstaje `seal-out/release/`,
- verify potwierdza brak źródeł/sourcemap i spójność manifestu.

### 27.5. E2E: local run sealed (bez deployu)
1) `seal release`
2) `seal run-local`

**Akceptacja:**
- aplikacja startuje z `seal-out/release/`,
- logi lecą na stdout/stderr,
- `/healthz` działa.

### 27.6. E2E: pierwszy deploy na nowy serwer (bootstrap)
1) `seal init`
2) `seal target add robot-01` + uzupełnij `seal-config/targets/robot-01.json5`
3) `seal config add robot-01` + uzupełnij `seal-config/configs/robot-01.json5`
4) `seal deploy robot-01 --bootstrap`
5) `seal deploy robot-01`
6) `seal remote robot-01 status` i `seal remote robot-01 logs`

**Akceptacja:**
- serwer ma strukturę katalogów,
- usługa działa, `/healthz` OK.

### 27.7. E2E: aktualizacja bez nadpisywania configu
1) Zmień kod aplikacji.
2) Zmień ręcznie `shared/config.json5` na serwerze.
3) `seal deploy robot-01`
4) `seal config diff robot-01`

**Akceptacja:**
- config nie został nadpisany,
- drift jest widoczny w `config diff`,
- snapshot configu trafia do `seal-out/remote/` (lub równoważnie).

### 27.8. E2E: świadome nadpisanie configu (push-config)
1) Zmień `seal-config/configs/robot-01.json5` w repo.
2) `seal deploy robot-01 --push-config`

**Akceptacja:**
- `shared/config.json5` na serwerze odpowiada repo,
- operacja jest jawnie odnotowana w logu (REQ-CLI-LOG).

### 27.9. E2E: rollback po nieudanym health-check
1) Wdróż wersję z celowo zepsutym `/healthz`.
2) `seal deploy robot-01` musi wykonać rollback.

**Akceptacja:**
- current wraca do poprzedniego buildId,
- `seal remote <target> status` pokazuje rollback,
- logi wskazują przyczynę i buildId.

### 27.10. E2E: manual rollback + lista release
1) `seal releases robot-01`
2) `seal rollback robot-01 --to <buildId>` lub bez `--to`.

**Akceptacja:**
- lista pokazuje current i dostępne buildId,
- rollback działa deterministycznie.

### 27.11. E2E: build-only vs deploy-only (CI/airgap)
1) Na maszynie z kodem: `seal release --artifact-only`
2) Skopiuj `seal-out/<app>-<buildId>.tgz` na maszynę deploy-only.
3) Na maszynie deploy-only: `seal deploy robot-01 --artifact <path>`

**Akceptacja:**
- deploy działa bez dostępu do źródeł,
- nadal generuje `seal-out/run/` i plan.

### 27.12. E2E: deploy multi-target
1) `seal deploy robot-01 robot-02`

**Akceptacja:**
- dla każdego targetu logi są separowane,
- końcowy exit code sygnalizuje czy któryś target nie wyszedł (SHOULD: raport per-target).

### 27.13. E2E: diagnostyka po awarii
1) Spowoduj błąd deploy/release.
2) `seal doctor`
3) Sprawdź `seal-out/run/`.

**Akceptacja:**
- `seal-out/run/` zawiera plan, logi i kluczowe konfiguracje.

### 27.14. E2E: uninstall/cleanup
1) `seal uninstall robot-01`
2) `seal uninstall robot-01 --keep-config`

**Akceptacja:**
- usługa znika,
- katalog instalacji znika,
- `--keep-config` zachowuje config (jeśli był).

---

## 28. Plan implementacji (milestones)

### 28.1. Milestone 1 – minimalny działający deploy
- `seal init`, `seal release`, `seal deploy --bootstrap`, `seal deploy`, `seal remote <target> logs|status|restart`, `seal doctor`.
- Struktura `/home/admin/apps/<app>/releases/` + `shared/` + `current.buildId`.

### 28.2. Milestone 2 – atomic deploy + rollback + manifest
- current.buildId, buildId, health-check, rollback.

### 28.3. Milestone 3 – standard jakości i sample-app
- sample-app spełniający SEAL_STANDARD v1.3.
- szablony logger/status w `seal-config/configs`.

### 28.4. Milestone 4 – frontend obfuskacja + hardening + licencja (opcjonalnie)
- frontend obfuskacja (domyślnie włączona, z opt-out),
- frontend minifikacja HTML/CSS (domyślnie włączona, safe),
- hardening binarki/bundla (ELF packer: domyślnie `kiteshield`, opcjonalnie `strip`/`upx`), gzip bundle),
- sentinel/licencja (opcjonalnie).

---

## 29. Specyfikacja metadanych projektu (`seal.json5`)

> **Cel:** usunąć zgadywanie w implementacji Seala (nazwa aplikacji, entrypoint, katalog UI, domyślne opcje packagera). Plik jest prosty i generowany przez `seal init`.

### 29.1. Zasada
- Seal może próbować odczytać nazwę z `package.json`, ale **rekomendowane** jest jawne `seal.json5` w repo (szczególnie dla projektów generowanych przez AI).
- `seal init` tworzy ten plik z sensownymi defaultami.


### 29.2. Minimalny format
Przykład (aktualny dla v0.5):
```json5
{
  appName: "my-app",
  entry: "src/index.js",
  defaultTarget: "local",

  build: {
    // packager (kolejnosc rekomendowana): thin-split, sea, bundle, none (auto = thin-split)
    // none = raw bundle + wrapper (bez protection/bundle.pack; tylko do diagnostyki)
    // UWAGA: thin-split = produkcja i baza do łączenia zabezpieczeń
    packager: "auto",

    // Poziom zabezpieczeń (ustawia domyślne wartości, bez nadpisywania jawnych pól)
    // minimal | balanced | strict | max
    securityProfile: "strict",

    // Opcjonalny override tylko dla obfuskacji JS:
    // obfuscationProfile: "strict",

    // Thin-specific settings (used by thin packagers)
    thin: {
      mode: "split",          // split
      level: "low",           // low | medium | high
      chunkSizeBytes: 2097152,
      zstdLevel: 1,
      zstdTimeoutMs: 120000,
      envMode: "denylist",    // denylist | allowlist
      runtimeStore: "memfd",  // memfd | tmpfile
      nativeBootstrap: { enabled: false, mode: "compile" }, // thin-split only: native addon (ExternalString + MADV_DONTDUMP/mlock + native CJS compile, requires C++20)
      appBind: { enabled: true }, // bind launcher to runtime/payload (use value for stable project ID)
      launcherHardening: true,    // CET/RELRO/PIE/stack-protector/fortify
      launcherHardeningCET: true, // CET only; disable for older clang (e.g., O-LLVM)
      launcherObfuscation: true,  // requires protection.cObfuscator (fail-fast if missing)
      snapshotGuard: { enabled: false, intervalMs: 1000, maxJumpMs: 60000, maxBackMs: 100 },
      // Anti-debug (opcjonalne; domyslnie wlaczone podstawowe checki):
      antiDebug: {
        enabled: true,
        tracerPid: true,
        tracerPidIntervalMs: 10000, // 0 = wylacz okresowe sprawdzanie
        tracerPidThreads: true,     // sprawdza /proc/self/task/<tid>/status
        denyEnv: true,
        mapsDenylist: [],     // np. ["frida", "gdb", "ltrace"] (gdy ustawione, fail-fast)
        ptraceGuard: { enabled: true, dumpable: true },
        seccompNoDebug: { enabled: true, mode: "errno", aggressive: false }, // errno | kill
        coreDump: true,
        loaderGuard: true       // kontrola loadera (PT_INTERP vs /proc/self/maps)
      },
      // Integrity (thin-split only): self-hash launchera b/a
      // - mode: inline (marker w binarce) lub sidecar (hash w pliku r/<file>)
      integrity: { enabled: false, mode: "inline", file: "ih" }
    },

    // Frontend assets (public/**/*.js) – domyślnie obfuskowane
    frontendObfuscation: { enabled: true },

    // Frontend HTML/CSS – domyślnie bezpiecznie minifikowane
    frontendMinify: { enabled: true, level: "safe", html: true, css: true },

    // Protection (anti-peek) – domyślnie włączone
    // - SEA/thin-single: strip/elfPacker są ignorowane (auto-disabled)
    // - thin-split: elfPacker domyślnie kiteshield (-n), target: launcher b/a
    // - thin.integrity (inline) + elfPacker: NIEkompatybilne (build fail-fast; użyj mode=sidecar)
    // - bundle: bundle.pack = gzip-pack backend bundle + loader
    protection: {
      enabled: true,
      seaMain: { pack: true, method: "brotli", chunkSize: 8000 },
      bundle: { pack: true },
      strip: { enabled: false, cmd: "strip", args: ["--strip-all"] }, // strip | llvm-strip | eu-strip | sstrip
      // ELF packers/protectors (rekomendowane: kiteshield → midgetpack → upx):
      elfPacker: { tool: "kiteshield", cmd: "kiteshield", args: ["-n", "{in}", "{out}"] },
      // Source-level string obfuscation libs (informacyjne, manualna integracja):
      // strings: { obfuscation: "xorstr" | "crystr" | "obfuscate" | ["xorstr", "crystr"] },
      // C-level obfuscation (dla launchera thin; wymaga obfuscating clang):
      // cObfuscator: { tool: "obfuscator-llvm" | "hikari", cmd: "/path/to/obfuscating-clang", args: ["-mllvm", "-fla", "-mllvm", "-sub"] },
      // Native bootstrap obfuscation (C++ addon; tylko gdy thin.nativeBootstrap.enabled=true):
      // nativeBootstrapObfuscator: { cmd: "/path/to/obfuscating-clang++", args: ["-mllvm", "-fla", "-mllvm", "-sub"] },
    },

    // Katalogi kopiowane 1:1 do release (np. static assets, dane)
    includeDirs: ["public", "data"],

  },
  deploy: {
    autoBootstrap: true, // auto bootstrap, gdy SSH target nieprzygotowany
  },
}
```

### 29.3. Reguły domyślne (jeśli pola brak)
- Uwaga: `build.securityProfile` domyślnie = `strict` i **ustawia domyślne wartości** (np. `thin.integrity`, `thin.nativeBootstrap`, `thin.antiDebug`, `protection.strip`, `thin.envMode`).  
  Jeśli chcesz zachować „gołe” defaulty, ustaw `securityProfile: "minimal"` lub nadpisz pola jawnie.
- `appName`: z `package.json:name` (fallback: nazwa katalogu).
- `entry`: kolejno próby: `package.json:main`, `src/index.js`, `index.js`.
- `defaultTarget`: `local`.
- `build.packager`: `auto` (domyślnie `thin-split`).
- `build.securityProfile`: preset poziomu zabezpieczeń (`minimal|balanced|strict|max`), **domyślnie `strict`**. Preset ustawia **domyślne wartości** (nie nadpisuje jawnych pól).
- `build.obfuscationProfile`: jeśli nie ustawione jawnie, dziedziczy poziom z `securityProfile` (`minimal|balanced|strict|max`). Dodatkowa wartość: `none`.
- `build.profileOverlays`: opcjonalna mapa overlay (np. `fast`) używana przez `--profile-overlay <name>` (alias: `--fast`); wartości to **częściowe** nadpisania sekcji `build` (bez zmian na dysku).
- `build.sentinel.profile`: domyślnie `auto` (sentinel włączany tylko dla `thin` + targetów `ssh`); opcje: `off|auto|required|strict`.
- `build.sentinel.timeLimit.enforce`: `always` (domyślnie) lub `mismatch` (expiry tylko przy niedopasowaniu fingerprintu lub braku blobu).
- `build.includeDirs`: `["public", "data"]`.
- `build.thin.mode`: `split`.
- `build.thin.level`: `low` | `medium` | `high`.
- `build.thin.appBind`: domyślnie `{ enabled: true }`.
- `build.thin.nativeBootstrap`: domyślnie `{ enabled: false }` (tylko thin-split, addon trafia do `r/n`).
- `build.thin.launcherHardening`: domyślnie `true`.
- `build.thin.launcherHardeningCET`: domyślnie `true` (jeśli compiler nie wspiera `-fcf-protection=full`, build fail‑fast; wyłącz ręcznie).
- `build.thin.launcherObfuscation`: domyślnie `true` (wymaga `build.protection.cObfuscator`).
- `build.thin.snapshotGuard`: domyślnie `{ enabled: false }`.
- `build.thin.antiDebug.ptraceGuard`: domyślnie `{ enabled: true, dumpable: true }`.
- `build.thin.antiDebug.seccompNoDebug`: domyślnie `{ enabled: true, mode: "errno", aggressive: false }`.
- `build.thin.antiDebug.coreDump`: domyślnie `true`.
- `build.thin.antiDebug.loaderGuard`: domyślnie `true`.
- `build.frontendObfuscation`: domyślnie `{ enabled: true, profile: "balanced" }` (frontend nie dziedziczy profilu z backendu).
- `build.frontendMinify`: domyślnie `{ enabled: true, level: "safe", html: true, css: true }`.
- `build.protection`: domyślnie `{ enabled: true, seaMain:{pack:true,method:"brotli",chunkSize:8000}, bundle:{pack:true}, strip:{enabled:false,cmd:"strip"}, elfPacker:{tool:"kiteshield",cmd:"kiteshield",args:["-n","{in}","{out}"]}, cObfuscator:{tool:"obfuscator-llvm",cmd:"ollvm-clang",args:["-mllvm","-fla","-mllvm","-sub"]} }`.
- `build.protection.strip.cmd`: `strip` | `llvm-strip` | `eu-strip` | `sstrip` (domyślnie `strip`).
- `build.protection.strip.args`: opcjonalne argumenty dla strip (placeholder `{in}` podstawia ścieżkę binarki); jeśli nie podasz — używane jest `--strip-all`.
- `build.protection.elfPacker.tool`: packer/protector ELF: `kiteshield` | `midgetpack` | `upx` (domyślnie `kiteshield`).
- `build.protection.elfPacker.cmd`: nadpisuje nazwę komendy (np. pełna ścieżka).
- `build.protection.elfPacker.args`: **wymagane** dla `kiteshield`/`midgetpack`; użyj `{in}` i `{out}` jako placeholderów. Brak args = błąd (dla `upx` nie wymagane).
- `build.protection.strings.obfuscation`: **informacyjne**; lista lub string (`xorstr`, `crystr`, `obfuscate`). SEAL nie wstrzykuje tych bibliotek automatycznie – integracja jest po stronie kodu C/C++.
- `build.protection.cObfuscator.tool`: obfuscator dla kodu C (launchera thin). Wartości: `obfuscator-llvm` lub `hikari`.
- `build.protection.cObfuscator.cmd`: ścieżka do obfuscating clang (wymagane, jeśli `cObfuscator` ustawione).
- `build.protection.cObfuscator.args`: **wymagane**; argumenty obfuscatora (np. `-mllvm -fla -mllvm -sub`). Brak args = błąd.
- `build.protection.nativeBootstrapObfuscator.cmd`: obfuscating C++ compiler dla native bootstrap (addon thin); używane tylko, gdy `thin.nativeBootstrap.enabled=true`.
- `build.protection.nativeBootstrapObfuscator.args`: **wymagane**, jeśli `nativeBootstrapObfuscator` ustawione; argumenty obfuscatora (np. `-mllvm -fla -mllvm -sub`).

### 29.4. Polityka (`seal.json5#policy`)

**Cel:** jedno, jawne miejsce na reguły pakowania i weryfikacji (bez wyboru presetów/szablonów w UX).

**Wymaganie (MUST, v0.4):**
- Po `seal init` istnieje jedna polityka domyślna (spójna i przewidywalna), używana automatycznie.
- Polityka może być nadpisywalna w **jednym** pliku (`seal.json5#policy`) poprzez jawne reguły include/exclude/exception.
- Narzędzie nie oferuje wyboru „policy templates” jako elementu UX.

Przykład (minimalny, poglądowy):
```json5
{
  version: 1,

  // Reguły per profil (jawne — bez „ukrytej magii”):
  profiles: {
    prod: {
      publicMinify: true,
      forbidSourceMaps: true
    },
    debug: {
      publicMinify: false,
      forbidSourceMaps: false
    }
  },

  // Weryfikacja paczki/release:
  verify: {
    forbidGlobs: [
      "src/**",
      ".git/**",
      "**/*.ts",
      "**/*.map" // w profilu prod dodatkowo fail
    ]
  }
}
```

---

## 30. Specyfikacja szablonu usługi systemd (`systemd.service.tpl`)

> **Cel:** przewidywalna usługa, która uruchamia „aktywny release” bez symlinków.

### 30.1. Wymagania funkcjonalne
- `WorkingDirectory` ustawione na `<installDir>`.
- `ExecStart` uruchamia `run-current.sh` (który:
  - czyta `current.buildId`,
  - uruchamia `releases/<buildId>/appctl run`,
  - ustawia CWD na `releases/<buildId>`,
  - kopiuje `shared/config.json5` → `config.runtime.json5`,
  - uruchamia binarkę).
- Logi lądują w journald.
- Restart przy awarii.

### 30.2. Minimalny szablon (przykładowy)
> Poniższy szablon jest referencyjny. `seal-server.sh` wypełnia placeholders.

```ini
[Unit]
Description={{SERVICE_NAME}}
After=network.target

[Service]
Type=simple
User={{SERVICE_USER}}
WorkingDirectory={{INSTALL_DIR}}
ExecStart={{INSTALL_DIR}}/run-current.sh
Restart=on-failure
RestartSec=2

# Baseline: utrudnij wtrysk flag runtime przez zmienne środowiskowe
UnsetEnvironment=NODE_OPTIONS
Environment=NODE_OPTIONS=

# Logi
StandardOutput=journal
StandardError=journal

# Hardening (domyślnie umiarkowany; rozszerzenia opcjonalne)
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
LimitCORE=0

[Install]
WantedBy=multi-user.target
```

### 30.3. Hardening opcjonalny (flagi)
- Seal powinien umożliwiać (w bootstrapie lub w target) włączenie mocniejszych opcji systemd:
  - `ProtectSystem=strict`
  - `ReadWritePaths=` (np. `{{INSTALL_DIR}}/shared` i/lub `/var/lib/{{APP}}`)
  - `RestrictAddressFamilies=`
  - `MemoryMax=`

---


## 31. Specyfikacja `appctl` (narzędzie serwisowe na serwerze)

> **Cel:** jeden, stały interfejs serwisowy niezależnie od projektu, aby po latach nie pamiętać ścieżek i komend systemd.

### 31.1. Instalacja
- `appctl` jest dostarczany w każdym release (`releases/<buildId>/appctl`) i uruchamiany przez `run-current.sh`.
- (MAY) `seal-server.sh` może zainstalować wrapper/symlink w `/usr/local/bin/{{APP}}ctl` (np. `my-appctl`).
- `appctl` zna:
  - `SERVICE_NAME`,
  - `INSTALL_DIR`,
  - ścieżkę configu w shared.

### 31.2. Komendy (MUST)
- `status` → `systemctl status {{SERVICE_NAME}} --no-pager`
- `restart` → `sudo systemctl restart {{SERVICE_NAME}}`
- `start/stop` → `sudo systemctl start/stop {{SERVICE_NAME}}`
- `logs [-f] [--since ...]` → `journalctl -u {{SERVICE_NAME}}` (tail/live)
- `run` → uruchom w foreground:
  - zatrzymaj usługę,
  - ustaw CWD na `{{INSTALL_DIR}}/releases/<buildId>/` i uruchom `{{APP_BIN}}` w terminalu,
  - po zakończeniu (opcjonalnie) start usługi.
- `doctor` → szybka diagnostyka:
  - status systemd,
  - check plików: `current.buildId`, `releases/`, `shared/config.json5`,
  - request do `http://127.0.0.1:<port>/healthz` (jeśli port znany; może pobrać z configu),
  - wypisanie wersji/build z `/status`.

### 31.3. Komendy (SHOULD)
- `version` → wypisz buildId/commit z manifestu lub `/status`.
- `rollback` → ustaw `current.buildId` na poprzedni release i restart.
- `support-bundle` → paczka diagnostyczna.

---

## 32. Specyfikacja obsługi UI i static assets w trybie single executable

> **Problem:** kod backendu jest w binarce, ale UI pliki (HTML/CSS/JS) muszą gdzieś fizycznie istnieć, jeśli serwujesz je jako static.

### 32.1. Zasada MVP (domyślna)
- **Frontend assets są kopiowane jako zwykłe pliki obok binarki** (np. katalog `public/`).
- To nie narusza celu ochrony IP backendu (frontend i tak jest do odczytu w przeglądarce), a upraszcza implementację.

### 32.2. Wymóg dla aplikacji (żeby działało w SEA)
- Aplikacja nie może polegać na `__dirname` wewnątrz bundla do odnajdywania `public/`.
- Standardowa ścieżka do UI:
  - `path.join(process.cwd(), 'public')`
  - ponieważ `appctl` uruchamia proces z katalogu release (CWD).


### 32.3. Co trafia do paczki release
- SEAL dodaje minimalistyczny `version.json` (bez informacji o obfuskacji/releasie) — tylko wersja aplikacji.
- Jeśli katalog `public/` istnieje w repo projektu, SEAL kopiuje `public/**` do release.
- Domyślnie (v0.5): SEAL **obfuskuje** `public/**/*.js` (pomija `*.min.js`).
  - SEAL **bezpiecznie minifikuje** `public/**/*.html` i `public/**/*.css` (pomija `*.min.html`/`*.min.css`).
- Podsumowanie obfuskacji/minifikacji jest zapisywane lokalnie w `seal-out/meta.json` (pola `frontendObfuscation`, `frontendMinify`). `meta.json` nie jest częścią paczki release.
- Wyłączenie jest możliwe w `seal.json5` (patrz sekcja 15).

### 32.4. Rozszerzenie (opcjonalne)
- W przyszłości Seal może wspierać serwowanie UI z wbudowanych assets (np. SEA assets) bez katalogu `public/`, ale nie jest to wymagane dla MVP.

---


## 33. Toolchain i instalacja offline (żeby implementacja była wykonalna)

### 33.0. Compatibility Matrix


**v0.4 (MVP):**
- Host docelowy: Linux x86_64 + systemd.
- Build sealed release: na maszynie, która ma kompatybilny glibc/arch (najprościej: ten sam typ systemu co target).
- Cross-build: **out of scope** w v0.4 (MAY w przyszłości).

**Toolchain (pinowany):**
- Node (SEA) – pinowana wersja dostarczana przez Seal.
- Bundler, obfuscator, postject (lub równoważny) – pinowane wersje.

**Hardening tools (opcjonalne, ale domyślnie używane jeśli dostępne):**
- `strip` (pakiet binutils) – usuwa symbole z binarki ELF.
- `elfPacker.tool="upx"` – pakuje binarkę (zmniejsza rozmiar i utrudnia proste `strings`).

Seal działa bez tych narzędzi, ale `seal check` **SHOULD** ostrzegać, gdy ich brakuje.

**Wymaganie:** `seal doctor` / `seal check` musi umieć wykryć typowe niezgodności (arch, brak systemd, brak narzędzi) zanim zaczniesz deploy.

### 33.1. Zasada
- Seal nie może polegać na `npx` ani pobieraniu narzędzi podczas `seal release`.
- Toolchain (Node do SEA, postject, bundler, obfuscator) musi być:
  - zainstalowany razem z Seal,
  - albo pobrany wcześniej przez dedykowaną komendę i cache’owany lokalnie.

### 33.2. Rekomendowana komenda
- `seal toolchain install`:
  - pobiera/instaluje pinowaną wersję Node (per OS/arch komputera build),
  - weryfikuje checksumy,
  - przygotowuje ścieżki typu `~/.seal/toolchain/node/<version>/<platform>/node`.

### 33.3. Wymaganie minimalne MVP
- Seal w MVP może wymagać, aby na komputerze build:
  - była dostępna właściwa wersja `node` (pinowana),
  - oraz aby zależności Seala (postject/bundler/obfuscator) były zainstalowane lokalnie.

---

## 34. Deterministyczne buildId, wersja i retencja release

### 34.1. buildId
- buildId powinien być jednoznaczny i sortowalny, np. `YYYY-MM-DD_HHMMSS` + krótki suffix.
- buildId trafia do:
  - nazwy katalogu release,
  - manifestu,
  - logu `APP_START`.

### 34.2. version
- `version` domyślnie z `package.json:version`.
- `commit` (opcjonalnie) pobrany z git (jeśli repo jest git).


### 34.2.1. Propozycja polityki wersjonowania (żeby było prosto)

- `version` (SemVer) w `package.json` jest **manualne** (świadoma decyzja autora aplikacji).
- `buildId` jest **automatyczny** i nie wymaga żadnego commita w repo. Rekomendacja:
  - `buildId = YYYY-MM-DD_HHMMSS-<gitShort>` (jeśli git dostępny),
  - jeśli git niedostępny: `YYYY-MM-DD_HHMMSS-<rand4>`.

**Wymaganie ergonomii:** `seal deploy` nie powinien domyślnie „podnosić wersji” w repo ani robić commitów. Jeśli kiedyś będzie potrzebna automatyka, to jako jawna opcja (MAY) typu `seal version bump` / `--bump-version`, a nie zachowanie domyślne.


### 34.3. Retencja (polityka domyślna)

**Cel:** prostota operacyjna i brak „starych binarek”, które tylko zajmują miejsce.

- `keep_releases` (MUST): domyślnie **1** (tylko ostatni release).
- Cleanup (MUST): po **udanym** deployu Seal usuwa stare release’y tak, aby:
  - nigdy nie usuwać release wskazanego przez `current.buildId`,
  - po cleanupie na dysku jest maksymalnie `keep_releases` katalogów w `releases/`.
- Jeśli chcesz rollback, ustaw `keep_releases >= 2` (MAY); wtedy Seal nie usuwa poprzedniej wersji.

**Prosta reguła implementacyjna (REF):** sortuj release’y po `buildId` (albo `buildTime`), zachowaj najnowsze `keep_releases`, ale do tej listy zawsze dołącz „current”. Jeśli `keep_releases >= 2`, dołącz też „previous”, a dopiero potem tnij.

---


## 35. Open questions / TBD

Ta sekcja zbiera tematy „do decyzji” lub „do dopięcia” – żeby nie rozpraszać specyfikacji w losowych miejscach.

1) **Podpisywanie artefaktów i weryfikacja na serwerze**  
   Czy chcemy wprowadzić podpis (np. Ed25519) i weryfikację przed zmianą `current.buildId`? W v0.4 `seal verify` jest przewidziane, ale podpisy są (na razie) opcjonalne.

2) **Anti‑copy (sekcja 17) – poziom ambicji**  
   Minimalny sentinel vs pełna licencja z podpisem i fingerprintem hosta. Jak bardzo chcemy utrudniać patchowanie przez roota?

3) **Cross‑build vs build‑on‑target**  
   MVP jest „build na platformie docelowej”. Jeśli potrzebujemy cross‑build, trzeba dopiąć zasady i testy dla SEA per OS/arch.

4) **Profile obfuskacji i testy regresji**  
   Jak mierzymy „strict‑but‑stable”? Jakie testy E2E są wymagane przed `deploy`?

5) **Hardening systemd – gdzie jest granica**  
   Baseline jest bezpieczny i mało inwazyjny, ale opcje typu `ProtectSystem=strict` mogą łamać integracje. Jakie presety udostępniamy (np. `baseline`, `strict`)?

6) **Support-bundle**  
   `appctl support-bundle` jest opisane jako SHOULD. Czy Seal ma mieć również `seal support-bundle <target>` zbierające dane po SSH?

---



## 36. Lista zmian (v0.5)

### 36.1. v0.5 względem v0.4

- Dodane: **SEAL_SCENARIOS v0.5** (pełna lista scenariuszy użytkownika).
- Doprecyzowane: „SEAL prowadzi za rękę” jako wymóg UX:
  - `seal` bez argumentów działa jak wizard,
  - domyślności dla target/config (`seal-config/configs`) i ostatniego builda.
- Doprecyzowane: lokalne testowanie zabezpieczenia:
  - `seal release` buduje artefakt + rozpakowuje do `seal-out/release/`,
  - `seal run-local` uruchamia sealed lokalnie.
- Dodane scenariusze „z realu”: toolchain/prefetch, preflight, airgap, multi-target, uninstall, manual rollback + lista release, support bundle jako scenariusz.
- Zaktualizowane referencje: `SEAL_STANDARD v1.3`, `SEAL_CONTRACT_AI v1.3`.

---

## 37. Rzeczy, które wypadły z poprzedniej wersji (v0.2)

Nic kluczowego nie zostało usunięte funkcjonalnie.

Świadome zmiany organizacyjne (wprowadzone w v0.3 i utrzymane w v0.4):
- sekcja **14.6 (Blueprint implementacji SEA)** została przeniesiona do osobnego dokumentu **SEAL_DEPLOY_REFERENCE v0.4**.
- w szablonie systemd (sekcja 30) usunięto `APP_CONFIG` jako standardowy mechanizm konfiguracji (zostaje jako MAY – override diagnostyczny).

Jeżeli w kolejnych iteracjach coś będzie realnie wycofywane (np. zmiana formatu plików), ta sekcja będzie zawierać pełną listę wraz z uzasadnieniem.
