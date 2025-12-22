# SEAL_PITFALLS - Bledy do unikania (v0.5.x)

> Cel: lista realnych bledow, ktore juz naprawilismy. Traktuj ponizsze jako wymagania.

## Build / packaging

- Blad: SEA fallback uruchomil build bez postject (cichy spadek poziomu zabezpieczen).
  - Wymaganie: brak `postject` to **blad builda**.
  - Fallback do pakowania JS jest dozwolony **tylko jawnie** (`build.allowFallback=true` lub `--packager fallback`).

- Blad: obfuskacja/minifikacja frontendu byla wylaczona.
  - Wymaganie: `build.frontendObfuscation` i `build.frontendMinify` sa **domyslnie wlaczone** dla UI.

## Deploy / infrastruktura

- Blad: instalacja w `/opt` (mala partycja) powodowala brak miejsca.
  - Wymaganie: domyslny `installDir` dla uslug to `/home/admin/apps/<app>`.

- Blad: `run-current.sh` i katalog aplikacji mialy zlego wlasciciela (root) i brak prawa wykonania.
  - Wymaganie: `installDir` i `run-current.sh` musza byc wlascicielem uzytkownika uslugi i `run-current.sh` musi byc wykonywalny.

- Blad: podwojne uploadowanie artefaktu przy pierwszym deployu (brak configu na serwerze).
  - Wymaganie: sprawdzaj `shared/config.json5` przed uploadem; artefakt wysylany **tylko raz**.

- Blad: uruchamianie aplikacji jako root (np. przez sudo) bez potrzeby.
  - Wymaganie: domyslnie uruchamiamy jako uzytkownik uslugi; `--sudo` tylko jawnie.

## Runtime config

- Blad: `config.runtime.json5` brakowal lub byl parsowany przez `JSON.parse`.
  - Wymaganie: `config.runtime.json5` jest **wymagany**, a parse to **JSON5**. Brak/blad = exit z kodem bledu.

- Blad: uzywanie `.env` jako runtime configu w produkcji.
  - Wymaganie: `.env` nie jest runtime configiem; uzywamy `config.runtime.json5`.

- Blad: dane RDS (login/haslo/lang) byly w configach lub logach.
  - Wymaganie: RDS login/haslo/lang sa stalymi w kodzie (swiadomy wyjatek), bez ekspozycji w logach.

## Logowanie / bezpieczenstwo

- Blad: logowanie `JSESSIONID` i komunikatow login/logout.
  - Wymaganie: **nie logujemy danych uwierzytelniajacych ani sesji**. Logi auth maja byc wyciszone lub zakomentowane.

## UI availability / aktualizacje

- Blad: UI odswiezal sie po bledzie backendu i pokazywal strone z bledem.
  - Wymaganie: UI nie robi reloadu na bledzie backendu.
  - Backend wystawia `/api/status` z `buildId`.
  - UI pokazuje overlay po ok. 2s braku polaczenia.
  - UI robi reload **tylko** po zmianie `buildId` i po odzyskaniu polaczenia.
  - Polling do `/api/status` ma timeout (AbortController), aby zawieszone requesty nie blokowaly kolejnych prob.
  - `?debug=1` moze pokazywac badge `buildId` i toast przed reloadem.

## Co sprawdzac po zmianach (checklist)

- `seal release` bez `postject` musi failowac (chyba ze fallback jawnie wlaczony).
- `seal deploy` nie wysyla artefaktu podwojnie.
- `installDir` w targetach jest w `/home/admin/apps/...`.
- `config.runtime.json5` jest obecny i poprawny JSON5.
- UI: overlay po 2s braku polaczenia, reload tylko po zmianie `buildId`.
- Logi nie zawieraja `JSESSIONID` ani danych auth.
