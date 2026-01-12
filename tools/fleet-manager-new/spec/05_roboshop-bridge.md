# roboshop-bridge — Specyfikacja komponentu (v0.9)

## 1. Rola w systemie (MUST)
`roboshop-bridge` jest komponentem integracyjnym (opcjonalnym). Pobiera mapy/konfiguracje z Roboshop/RDS i generuje kanoniczny **Scene Package** dla `fleet-core`.
Bridge NIE jest domeną — to narzędzie integracji i migracji.

## 2. Zakres i odpowiedzialności (normatywnie)
#### Scope
Bridge jest opcjonalnym komponentem integracyjnym: pobiera mapy/konfiguracje z Roboshop/RDS i generuje paczki sceny dla Core.

Roboshop Bridge MUST:
- mapować formaty Roboshop/RDS na kanoniczny Scene Package (`07_scene-management.md`),
- dokumentować mapowanie ID (Roboshop ↔ SceneGraph nodeIds/externalRefs),
- umożliwiać import scen do Fleet Core (HTTP lub przez export paczki).

Related: `07_scene-management.md`, `09_map-compiler.md`, `14_map-compiler-visualizer.md`.

## 3. Interfejsy i przepływy
- Roboshop/RDS (HTTP) → Bridge
- Bridge uruchamia `map-compiler` (CLI lub biblioteka)
- Bridge wysyła paczkę sceny do Core: `POST /api/v1/scenes/import` + `POST /api/v1/scenes/{sceneId}/activate`

## 4. Kontrakty sceny (kanoniczne)
Scene Package i SceneGraph: patrz `07_scene-management.md` (kanon).

---

## Załącznik A — Integracja: Roboshop Bridge (verbatim z v0.7)
# Fleet Manager 2.0 — Integracja: Roboshop Bridge (v0.7)

Roboshop jest zewnętrzną aplikacją do mapowania i konfiguracji.
W architekturze Fleet Managera Roboshop Bridge jest osobnym komponentem (czytelność granic).

## 1. Rola Roboshop Bridge (MUST)
- Bridge MUST pobierać/odbierać mapę i konfiguracje z Roboshop.
- Bridge MUST transformować je do Scene Package (manifest.json5 + map/raw.smap + map/graph.json + config/*.json5).
- Bridge MUST wywołać import sceny do Fleet Core.

## 2. Interfejsy
W MVP zakładamy prosty wariant:
- Bridge ma dostęp do pliku `.smap` (export z Roboshop) i config JSON,
- Bridge tworzy katalog sceny i woła Core `/scenes/import`.

Future:
- Bridge może wystawiać HTTP endpointy zgodne z Roboshop, jeśli Roboshop potrafi push.

## 3. Wymagania dot. konwersji (MUST)
- Oryginalna mapa może mieć inne jednostki — Bridge/Map Compiler MUST skonwertować do metrów.
- Wszelkie identyfikatory LM/AP MUST zostać zachowane (spójne z robotem).
- Nieznane pola z Roboshop MUST być zachowane w `meta/roboshopExport.json` (dla debug), ale nie używane domenowo.

## 4. Proxy między Roboshop a robotem / RDS (kontekst)
Bridge nie zastępuje Proxy/Recorder.
Podsłuch protokołów to osobny tool (`06_proxy-recorder.md`).



## 5. Wejściowe API / CLI `roboshop-bridge` (MUST)

Bridge jest narzędziem integracyjnym; w MVP jego „API wejściowe” to przede wszystkim CLI (promptable dla AI/Codex).

### 5.1 Kontrakt CLI (MUST)

Bridge MUST udostępniać komendę:

- `roboshop-bridge import-scene ...`

Minimalne parametry:

```bash
roboshop-bridge import-scene   --scene-name "warehouseA"   --smap ./exports/warehouseA.smap   --worksites ./exports/worksites.json5   --streams ./exports/streams.json5   --robots ./exports/robots.json5   --core-url http://localhost:8080/api/v1   --activate true   --lease-id <optional>
```

**MUST:**
- Bridge MUST wyprodukować Scene Package na dysk (zanim wyśle do Core).
- Bridge MUST wypisać na stdout ścieżkę do paczki + `sceneId` z Core.

Przykładowy output (stdout, JSON):
```json5
{
  ok: true,
  sceneName: "warehouseA",
  scenePackageDir: "/tmp/fm_scene_warehouseA_2026-01-07/",
  compiledMapHash: "sha256:...",
  core: { imported: true, sceneId: "scene_01JH...", activated: true }
}
```

### 5.2 (Opcjonalne) HTTP API Bridge (MAY)
Jeśli później będzie wygodniej, Bridge MAY wystawić proste endpointy:
- `POST /bridge/v1/import-scene` (multipart: `.smap` + config),
- `GET /bridge/v1/exports/{id}` (pobranie paczki),
ale w MVP nie jest to wymagane.

---

## 6. Lokalne struktury danych i format Scene Package (MUST)

Bridge MUST budować Scene Package w układzie zgodnym z `fleet-core`:

```text
<scenePackageDir>/
  manifest.json5
  map/
    raw.smap              # oryginalna mapa (MAY)
    graph.json            # kanoniczny SceneGraph (MUST)
  compiled/
    compiledMap.json      # wynik map-compiler (kanon dla algorytmu)
  config/
    robots.json5
    worksites.json5
    streams.json5
    actionPoints.json5    # opcjonalnie (widły)
  meta/
    roboshopExport.json   # oryginalne metadane (MAY)
```

**MUST (jednostki):**
- Bridge i/lub map-compiler MUST skonwertować jednostki do metrów i radianów.
- Jeśli `.smap` jest w innych jednostkach, Bridge MUST to jawnie logować (np. `sourceUnits`) i zapisać w `meta`.

---

## 7. Pobieżny algorytm działania Bridge

```text
import-scene():
  read inputs (.smap + config)
  validate references (worksite -> nodeId, stream -> worksites, robot -> parkPoint)
  run map-compiler (CLI/library):
    compiledMap := compile(smap)
  assemble scene package dir (manifest + raw + compiled + config)
  POST core /scenes/import (zip/dir)
  if --activate: POST core /scenes/activate
  print result
```

**MUST (ID mapping):**
- Bridge MUST zachować spójność identyfikatorów LM/AP z robotem:
  - `nodeId` w SceneGraph MUST odpowiadać identyfikatorom używanym w protokole robota **albo** posiadać mapowanie w `externalRefs`.
- Bridge MUST zapisać mapping w `manifest` lub `meta` tak, aby Gateway mógł rozwiązać `targetExternalId`.
