# SEAL_CONTRACT_AI – Kontrakt dla generatorów kodu (v1.3)

> **Cel:** ten dokument jest krótki, jednoznaczny i “promptable”. Wklej go do prompta dla AI / generatora kodu, aby nowa aplikacja była kompatybilna z **Seal** (seal-deploy) i zgodna z **SEAL_STANDARD v1.3**.
>
> **Priorytet:** kompatybilność z bundlowaniem + agresywną obfuskacją + single executable (Node SEA / podobny packager) oraz diagnozowalność po sealingu.

---

## 0) Najważniejsze założenia (w 30 sekund)

- Generator musi zachować **dev-friendly** projekt: da się uruchomić aplikację normalnie (node/npm), bez Seala.
- Aplikacja w runtime czyta `config.runtime.json5` (a SEAL kopiuje/ustawia ten plik w deployu).
- SEAL operuje pojęciami **target** (gdzie wdrażam) i **config** (jaki wariant konfiguracji runtime). Domyślnie `config == target`.
- Jeśli naprawiasz błąd lub dodajesz reguły jakościowe, **MUST** uaktualnij `SEAL_PITFALLS.md` i (jeśli reguła jest generyczna) `SEAL_STANDARD.md`.



## 0) Zasady „samoopisujących plików” (MUST)

1. Generator **MUST** tworzyć komplet plików `seal-config/*` i `config/*` w wersji „w pełni opisanej” (wszystkie opcje jawne, nawet jeśli część jest default).
2. Generator **MUST NOT** wprowadzać „ukrytych” zachowań zależnych od zmiennych środowiskowych, jeśli da się je opisać w pliku konfiguracyjnym.

## 1) Zasady kompatybilności z sealingiem (MUST)

1. **NIE używaj `eval()` ani `new Function()`** (ani podobnych dynamicznych konstrukcji).  
   Uzasadnienie: bundlery i obfuskatory oraz SEA bardzo często nie działają poprawnie z dynamicznym kodem.

2. **NIE używaj dynamicznych importów/require po stringach** (np. `require(someVar)`, `import(pathFromConfig)`).  
   Importy muszą być **statyczne**.

3. **Unikaj zależności natywnych** (`node-gyp`, binarki, moduły C++). Jeśli musisz – zaznacz to jawnie i przygotuj fallback.

4. **Nie polegaj na nazwach funkcji/klas w logice** (np. `fn.name` jako klucz). Obfuskacja je zmieni.

5. **Nie polegaj na strukturze plików źródłowych w runtime.** Po sealingu pliki `.js` nie istnieją jako czytelne źródła.

---

## 2) Konfiguracja (MUST)

1. Aplikacja **MUST** czytać konfigurację runtime z pliku:
   - `./config.runtime.json5` (z katalogu roboczego `process.cwd()`).

2. Konfiguracja **MUST** wspierać obiekty i tablice (JSON5 lub JSON).

3. Na starcie aplikacja **MUST**:
   - wczytać config,
   - zwalidować go (typy + wymagane pola),
   - przy błędzie zalogować `CFG_INVALID` + `errorId` + ścieżkę pola (np. `rds.url`),
   - zakończyć start (exit != 0).

4. Aplikacja **MUST NOT** wymagać dodatkowych plików konfiguracyjnych poza `config.runtime.json5`, chyba że są jawnie opisane jako dane runtime w `shared/`.

---

## 3) Endpointy diagnostyczne (MUST)

1. Aplikacja **MUST** wystawiać:

- `GET /healthz`  
  - zawsze szybkie,
  - zwraca `200` jeśli proces żyje,
  - **nie** zależy od integracji zewnętrznych.

- `GET /status`  
  - zwraca JSON,
  - zawiera co najmniej: `standard`, `standardVersion`, `version`, `buildId`, `uptimeSec`, `now`, `deps`.

2. Jeśli aplikacja ma integracje (DB, RDS, API, PLC, itp.) – **MUST** raportować je w `deps` w formie:
- `state: ok|degraded|down`
- `lastOkAt` (SHOULD)
- `lastFailAt` (MAY)
- `msg` (SHOULD)

---

## 4) Logowanie (MUST)

1. W produkcji logi **MUST** być emitowane na stdout/stderr w formacie **JSON Lines** (1 JSON na linię).

2. Każdy rekord logu **MUST** zawierać:
- `ts` (ISO UTC)
- `lvl` (`debug|info|warn|error|fatal`)
- `evt` (stabilny event code)

3. `evt` **MUST** być stabilnym kodem odpornym na obfuskację (np. `APP_START`, `APP_READY`, `CFG_INVALID`, `APP_FATAL`, `INT_RDS_CONN_FAIL`).

4. Dla błędów `error|fatal` **MUST** generować `errorId`.

5. Aplikacja **MUST** emitować eventy lifecycle:
- `APP_START` (z `version`, `buildId`, `configPath`)
- `APP_READY`
- `APP_STOP` (graceful shutdown)
- `APP_FATAL` (fatal error, exit != 0)

---

## 5) Zachowanie procesu (MUST)

1. Aplikacja **MUST** obsługiwać `SIGTERM` i wykonać graceful shutdown.

2. Aplikacja **MUST** obsłużyć:
- `uncaughtException`
- `unhandledRejection`

…i w obu przypadkach:
- zalogować `APP_FATAL` + `errorId` + `err` (name/message/stack),
- zakończyć proces (exit != 0).

---

## 6) UI (MUST jeśli UI istnieje)

1. UI **MUST** cyklicznie pobierać `/status`.

2. Gdy UI nie może pobrać `/status` (timeout/brak połączenia):
- pokazać wyraźny banner/ekran „Brak połączenia z backendem”,
- pokazać czas ostatniej udanej aktualizacji.

3. Jeśli backend działa, ale `deps.*.state != ok`:
- UI **MUST** pokazać „System działa, ale …” + nazwę integracji + jej `state` i `lastOkAt`.

4. UI **MUST** mieć małą stopkę diagnostyczną z:
- `version/buildId`,
- czas ostatniego update,
- stan połączenia z backendem.

---

## 7) Static assets (jeśli serwujesz UI)

1. Aplikacja nie może polegać na `__dirname` wewnątrz bundla do znajdowania `public/`.

2. Jeśli serwujesz UI jako statyczne pliki, używaj:
- `path.join(process.cwd(), 'public')`

…bo systemd ustawia `WorkingDirectory` na katalog release.

---

## 8) Minimalny zestaw event codes (rekomendacja)

- `APP_START`, `APP_READY`, `APP_STOP`, `APP_FATAL`
- `CFG_LOADED`, `CFG_INVALID`
- `HTTP_REQ` (opcjonalnie)
- `INT_<NAME>_UP`, `INT_<NAME>_DOWN`, `INT_<NAME>_DEGRADED` (jeśli integracje)

---

## 9) Nauka na błędach (MUST)

1. Po znalezieniu błędu lub ryzyka **MUST**:
   - dodać wpis do `SEAL_PITFALLS.md` (błąd + wymaganie zapobiegawcze),
   - jeżeli reguła jest ogólna (jakość/testy/UX/bezpieczeństwo), dopisać ją też do `SEAL_STANDARD.md`.
2. Dla testów E2E **MUST**:
   - timeouty per‑test i per‑krok/await,
   - obsługa `error` w subprocessach (brak wiszących obietnic),
   - drenaż stdout/stderr procesów uruchamianych w testach,
   - `finally` dla zamknięcia browserów/zasobów UI.

## 10) Checklist AI review (MUST)

Przed zamknięciem zadania AI **MUST** potwierdzić:
1) Czy błąd/zmiana została dopisana do `SEAL_PITFALLS.md`?
2) Czy reguła ogólna trafiła do `SEAL_STANDARD.md`?
3) Czy testy E2E mają timeouty per‑test i per‑krok?
4) Czy subprocessy mają obsługę `error` i nie mogą wisieć?
5) Czy procesy testowe mają drenaż stdout/stderr?
6) Czy zasoby UI (browser/page) są zamykane w `finally`?

## 11) Wersja kontraktu

- `SEAL_CONTRACT_AI` v1.3 jest kompatybilny z:
  - `SEAL_STANDARD v1.3`
  - `SEAL-DEPLOY_SPEC v0.4`

Jeśli zmieni się standard lub workflow Seala, kontrakt dla AI będzie wersjonowany i aktualizowany.
