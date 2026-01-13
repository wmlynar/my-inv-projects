# map-compiler-visualizer - Specyfikacja komponentu (v0.1)

## 1. Rola w systemie (MUST)
`map-compiler-visualizer` to narzedzie dev/test do wizualizacji artefaktow
generowanych przez `map-compiler`: `map/graph.json` i `compiledMap.json`.
Pomaga szybko zweryfikowac geometrie, korytarze, komorki i konflikty bez
uruchamiania calego systemu.

## 2. Zakres i odpowiedzialnosci (normatywnie)
#### Scope
- Local-only viewer (HTTP + statyczne pliki) do map i kompilacji.
- Odczyt artefaktow z dysku, bez modyfikacji.
- Warstwy debugowe i podglad danych.

#### Wariant implementacyjny: reuse mapy z `fleet-ui` (MUST)
- UI MUST bazowac na mapowym layoutcie i stylach z `apps/fleet-ui/public`.
- Wymagane identyfikatory DOM: `map-shell`, `map-wrap`, `map-svg`, `mini-map-svg`,
  `fit-view-btn`, `reset-view-btn`.
- Visualizer MUST uzywac modulu: `map_runtime.js` z `packages/robokit-map-ui/public`
  (zapewnia `MapWindow`, `MapLayers`, `MapStore`, `MapAdapters`).
- Visualizer MUST uruchamiac widok mapy oraz menu wizualizacji (sidebar jak w mock-ui),
  bez loginu i paneli domenowych (robots/tasks/packaging).
- Visualizer MUST pozostac w pelni offline: usunac z HTML zewnetrzne fonty/asset
  lub zapewnic lokalny fallback.
- Visualizer MUST NOT ladowac `apps/fleet-ui/public/app.js` ani domenowych
  modulow (robot/task/packaging); uzywa tylko mapowych modulow + wlasnego `viewer.js`.

#### Responsibilities (MUST)
- Wczytac `map/graph.json` i `compiled/compiledMap.json` z katalogu sceny.
- Narysowac geometrie krawedzi `DegenerateBezier`.
- Pokazac wezly (LM/AP/CP/PP) oraz korytarze i komorki.
- Udostepnic inspekcje danych po kliknieciu (edge/node/cell/corridor).

#### Non-goals (MUST NOT)
- Nie modyfikuje map ani nie generuje artefaktow.
- Nie wymaga polaczen sieciowych poza lokalnym HTTP.

Related: `09_map-compiler.md`, `99_pozostale.md`.

## 3. Wejscia / wyjscia (MUST)

### 3.1 Wejscia
- `map/graph.json` (kanoniczny graf z geometria)
- `compiledMap.json` (korytarze, komorki, swept-shape, conflictSet)
- Opcjonalnie: `meta.json` (informacyjnie)

#### Rozwiazywanie sciezek (MUST)
- `--dir` wskazuje katalog sceny, w ktorym MUSZA istniec:
  - `<dir>/map/graph.json`
  - `<dir>/compiled/compiledMap.json`
  - opcjonalnie: `<dir>/compiled/meta.json`
- `--compare-dir` (jesli podane) MUST wskazywac katalog z analogicznymi plikami
  (`map/graph.json` + `compiled/compiledMap.json`), uzywanymi do trybu diff.
- CLI MAY przyjac jawne nadpisanie:
  - `--scene-graph <path>`
  - `--compiled-map <path>`
  - `--meta <path>`
- Jesli wymagany plik nie istnieje, CLI MUST zwrocic kod != 0 i opisac brak.

### 3.2 Wyjscia
- Interaktywny podglad mapy (HTML/SVG; reuse mapy z mock-ui)
- Opcjonalny raport walidacji (MAY) jako `report.json`

## 4. Interfejs uruchomieniowy (CLI) (MUST)

```
map-compiler-visualizer \
  --dir ./scene \
  --scene-graph ./scene/map/graph.json \
  --compiled-map ./scene/compiled/compiledMap.json \
  --meta ./scene/compiled/meta.json \
  --compare-dir ./scene_prev \
  --host 127.0.0.1 \
  --port 8092 \
  --open false \
  --validate true
```

Parametry:
- `--dir` (MUST) katalog sceny z artefaktami
- `--scene-graph` (MAY) jawna sciezka do `map/graph.json`
- `--compiled-map` (MAY) jawna sciezka do `compiled/compiledMap.json`
- `--meta` (MAY) jawna sciezka do `compiled/meta.json`
- `--compare-dir` (MAY) katalog z drugim zestawem artefaktow do trybu diff
- `--host` (default `127.0.0.1`)
- `--port` (default `8092`)
- `--open` (default `true`) otwiera przegladarke
- `--validate` (default `false`) uruchamia walidacje i zapisuje `report.json`

CLI MUST zwracac kod wyjscia 0 tylko, gdy serwer wystartowal poprawnie.

## 5. UI i zachowanie (MUST)

### 5.1 Warstwy wizualizacji
- **SceneGraph edges**: krzywe `DegenerateBezier` (polylines z probkowaniem)
- **Nodes**: punkty LM/AP/CP/PP z kolorami wg klasy
- **Corridors**: polylines grubszym stylem
- **Cells**: prostokaty z `sweptShape.rects` (polozone, obrocone)
- **ConflictSet**: po wyborze komorki podswietl konfliktujace komorki

Warstwy MUSZA byc wlaczalne/wylaczalne niezaleznie.

### 5.2 Interakcje
- Pan + zoom (mysz/trackpad).
- `Fit to bounds` dla sceneGraph.
- Klik na element -> panel szczegolow (id, dlugosci, props, conflictSet).
- Wyszukiwarka po `nodeId`, `edgeId`, `corridorId`, `cellId`.

### 5.3 Kolory i legenda (MUST)
- Czytelna legenda warstw i typow wezlow.
- Konflikty musza byc jednoznacznie oznaczone (np. czerwony highlight).

### 5.4 Menu wizualizacji i widoki (MUST)
UI MUST miec pasek boczny (sidebar) jak w mock-ui, pozwalajacy przelaczac
widoki (kazdy widok to panel z wlasnym opisem i kontrolkami).

Minimalne widoki:
- **Map**: standardowa mapa + warstwy (edges/nodes/corridors/cells/conflicts).
- **Coverage**: pokrycie korytarzy przez komorki; czerwone "gaps" na mapie.
- **Conflicts**: heatmapa konfliktow i rozklad `conflictSet` (liczby + histogram).
- **Connectivity**: liczba spojnych skladowych; podswietlenie odcietych fragmentow.
- **Length sanity**: porownanie `edge.lengthM` vs dlugosc krzywej (LUT).
- **Determinism** (MAY, gdy `--compare-dir`): roznice ID/cell/corridor/hash.
- **Report**: podglad `report.json` i "Compile Health" summary.

Widoki MUST uzywac tego samego obszaru mapy (map-shell) i nie tworzyc
osobnych instancji canvas/SVG.

## 6. Transformacje i geometria (MUST)
- Jednostki w `sceneGraph` i `compiledMap` sa w metrach i radianach.
- Viewer MUST wspierac dowolny zakres wspolrzednych (ujemne i dodatnie).
- Probkowanie Bezier:
  - domyslny krok `sampleStepM` (np. 0.2 m),
  - fallback `samplesPerEdge` (np. 24) dla bardzo krotkich krawedzi.
- Rysowanie prostokatow z `sweptShape.rects` uwzglednia `angleRad`.
- LOD (MUST):
  - `cells` renderowane tylko gdy zoom >= `cellsMinZoom` (konfigurowalne).
  - `corridors` renderowane niezaleznie od zoom (o ile warstwa wlaczona).
  - `nodes` i `edges` zawsze widoczne, ale z ograniczeniem liczby etykiet.

### 6.1 Analizy poprawnosci (MUST)
Viewer MUST wspierac nastepujace analizy i sygnaly poprawnosci:
- **Coverage gaps**: odcinki korytarzy bez komorek (czerwone odcinki).
- **Length mismatch**: roznica miedzy `edge.lengthM` a LUT krzywej > threshold.
- **Conflict density**: heatmapa liczby konfliktow per cell (skala kolorow).
- **Connectivity**: liczba skladowych grafu; highlight skladowych < max (odciete).
- **Determinism diff** (gdy `--compare-dir`): roznice w liczbie i ID komorek,
  corridorId, hashach artefaktow (podsumowanie + highlight na mapie).

### 6.2 Metryki "Compile Health" (MUST)
Panel zdrowia kompilacji MUST wyswietlac co najmniej:
- `nodes`, `edges`, `corridors`, `cells`
- liczbe gapow coverage
- liczbe konfliktow (srednia/median/max)
- liczbe bledow i ostrzezen z walidacji
- liczbe skladowych grafu

## 7. Walidacje widoczne w UI (SHOULD)
UI SHOULD sygnalizowac (badge/alert):
- brakujace referencje (edge -> node),
- `lengthM <= 0`,
- `NaN/Infinity` w punktach,
- niesymetryczny `conflictSet`,
- brak `DegenerateBezier` w edges, gdy `className` wskazuje na geometrie.

#### Format raportu walidacji (MUST, gdy `--validate=true`)
`report.json`:
```json5
{
  ok: false,
  errors: [
    { code: "MISSING_NODE", severity: "error", ref: "edgeId:LM1-LM2" }
  ],
  warnings: [
    { code: "CONFLICTSET_ASYMMETRIC", severity: "warn", ref: "cellId:..." }
  ]
}
```
- `ok` jest true tylko gdy brak `errors`.
- CLI MUST zwrocic kod != 0, jesli `errors` niepuste.

## 8. Wydajnosc (MUST)
- Viewer MUST byc uzywalny dla map z >= 100k krawedzi.
- Komorki (cells) moga byc renderowane warstwowo (np. tylko przy powiekszeniu).
- Selekcja elementow moze uzywac prostego indeksu przestrzennego (grid).

## 9. Struktury danych UI (informacyjne)
Minimalny stan:
```json5
{
  layers: { edges: true, nodes: true, corridors: false, cells: false, conflicts: true },
  selection: { kind: "cell", id: "C:...#i=12#dir=A_TO_B" },
  filters: { search: "LM2" },
  viewport: { zoom: 1.2, panX: 120, panY: -40 }
}
```

#### Minimalny `mapState` (dla adaptera)
```json5
{
  bounds: { minXM: -10, minYM: -5, maxXM: 20, maxYM: 15 },
  nodes: [ { id: "LM1", className: "LocationMark", pos: { xM: 1.2, yM: 3.4 } } ],
  edges: [ { id: "LM1-LM2", p0: { xM: 1, yM: 2 }, p1: { xM: 2, yM: 2 } } ],
  corridors: [ { id: "C:...", segments: [ { edgeId: "LM1-LM2" } ] } ],
  cells: [ { id: "C:...#i=0#dir=A_TO_B", rects: [ { cxM: 1, cyM: 2, angleRad: 0, hxM: 0.5, hyM: 0.2 } ] } ]
}
```

## 10. Integracja (MUST)
- Narzedzie dziala niezaleznie od `fleet-core`.
- `roboshop-bridge` i `map-compiler` jedynie przygotowuja dane na dysku.

## 11. Warstwy i adaptery (MUST, reuse mock-ui)
W ramach reuse z `fleet-ui`:
- `map_layers` rejestruje warstwy: `sceneGraph`, `corridors`, `cells`, `conflicts`, `nodes`.
- `map_adapters` dostarcza adapter, ktory mapuje `map/graph.json` i `compiledMap.json`
  na stan mapy (min/max bounds, listy elementow, indeksery).
- Warstwa `conflicts` musi uzywac `conflictSet` tylko przy aktywnej selekcji,
  aby ograniczyc koszt renderu.

#### Kontrakt adaptera (MUST)
- Adapter MUST zapewnic:
  - `mapState.bounds` (min/max w metrach) dla `Fit to bounds`.
  - Indeks przestrzenny (grid) do selekcji elementow.
  - Redukcje warstw (filtered arrays) dla aktywnych toggli.
