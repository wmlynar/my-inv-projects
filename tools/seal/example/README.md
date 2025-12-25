# seal-example (przykład do SEAL)

Reprezentatywna aplikacja do testów SEAL:

- UI (HTML/CSS/JS) w `public/`
- API + static server (Express)
- runtime config z `config.runtime.json5` (JSON5)
- dodatkowe pliki lokalne w runtime (np. `data/feature_flags.json`)
- import biblioteki `md5`
- logowanie:
  - `debug` – pełne logi request/response do „external calls”
  - `error` – tylko błędy (prod‑like)
- endpoint `GET /api/external/ping` do testowania „external call” + logów

---

## DEV (bez sealing)

Wymagania: Node.js **>=20** (zalecane **24**).

```bash
npm install
npm run dev
```

Wejdź na: `http://127.0.0.1:3000`

Konfiguracja:

- `seal-config/configs/local.json5` – wariant configu (edytuj to)
- `config.runtime.json5` – aktywny runtime (ten plik czyta aplikacja przy `node src/index.js`)
- `data/feature_flags.json` – przykładowy plik „lokalny”, czytany w runtime

Uruchomienie „czystym Node” (bez npm scripts):

```bash
node src/index.js
```

---

## Sealed (lokalnie, bez deployu)

Podczas `seal release` SEAL obfuskuje też frontend (`public/*.js`) i bezpiecznie minifikuje HTML/CSS w `public/**` (pomija `*.min.*`) – domyślnie włączone (poziom: `safe`).

Dodatkowo, SEAL domyślnie wykonuje hardening (np. kompresja backend bundle w SEA/fallback).
`strip`/`upx` dla binarek SEA są **OFF by default** (postject-ed binarki potrafią się po tym wysypać).

```bash
npx seal check
npx seal release
npx seal verify --explain
npx seal run-local --sealed
```

Artefakty:

- `seal-out/` – `.tgz`
- `seal-out/release/` – folder do inspekcji i uruchomienia

---

## Deploy na serwer (SSH)

Dodane są przykładowe pliki:

- `example/seal-config/targets/server.json5` – target SSH (host `10.6.44.2`, user `admin`, installDir `/home/admin/apps/seal-example`)
- `example/seal-config/configs/server.json5` – runtime config (host `0.0.0.0`, port `3333`)

Bootstrap tworzy `/home/admin/apps/seal-example` przez `sudo` i ustawia właściciela na `admin`, a po deployu instaluje runner + unit (bez startu usługi).

Komendy do testu deployu i uruchomienia:

```bash
# 1) Preflight (lokalnie)
npx seal check server

# 2) Pierwszy deploy + instalacja usługi systemd
npx seal deploy server --bootstrap --restart

# 3) Status i logi
npx seal status server
npx seal logs server
```

Kolejne aktualizacje:

```bash
npx seal deploy server --restart
```

Uruchomienie w foreground na serwerze (debug):

```bash
npx seal run server
```

---

## Wymuszanie błędu (żeby przetestować logi)

### 1) Brak pliku feature flags (błąd na starcie)
W `seal-config/configs/local.json5` ustaw np.:

```json5
{
  // ...
  featuresFile: "./data/feature_flags_LOCAL_MISSING.json"
}
```

Potem:

```bash
npx seal release
npx seal run-local --sealed
```

W logach zobaczysz `features.read_failed` z `ENOENT`.

### 2) Błąd external call (502 + error log)
W `seal-config/configs/local.json5` ustaw:

```json5
{
  // ...
  external: { echoUrl: "http://127.0.0.1:9/anything", timeoutMs: 1500 }
}
```

A następnie:

```bash
curl -i http://127.0.0.1:3000/api/external/ping
```

Powinieneś dostać `502` i zobaczyć logi `external.request` + `external.error`.
