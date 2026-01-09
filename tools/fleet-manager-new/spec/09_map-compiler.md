# map-compiler — Specyfikacja komponentu (v0.9)

## 1. Rola w systemie (MUST)

`map-compiler` jest deterministycznym narzędziem prekompilacji mapy (offline lub przy starcie sceny).

Wynik kompilacji służy **dwóm** odbiorcom:

1) **wizualizacja i narzędzia**: `SceneGraph` (czytelny graf z geometrią),
2) **algorytm ruchu (DCL‑2D / Rolling Target)**: `CompiledMap` (korytarze, komórki, swept-shapes, conflictSet).

**MUST (geometry):**
- Algorytm MUST mieć dostęp do geometrii krawędzi z `.smap`.  
  W eksporcie `graph.json` geometria musi występować jako `DegenerateBezier` (p0..p3).

**MUST (determinism):**
- Dla identycznych wejść wynik MUST być identyczny bitowo (po kanonicznej serializacji) — inaczej nie mamy „golden maps”.

---

## 2. Wejścia / wyjścia (MUST)

### 2.1 Wejścia
Map Compiler MUST przyjmować:

- `input.smap` — źródło prawdy mapy (Roboshop/Robokit),
- `compilerConfig` — parametry kompilacji,
- `robotGeometryProfile` — parametry geometrii robota używane do prekomputacji swept-shape.

**Uwaga (MVP):** jeśli w scenie są różne modele robotów, to:
- MVP SHOULD ograniczyć się do jednego profilu geometrii (najprościej),
- alternatywnie: compile „worst-case envelope” (fail-closed, ale może blokować ruch).

### 2.2 Wyjścia
Map Compiler MUST produkować:

- `sceneGraph.json` — kanoniczny `SceneGraph` (nodes/edges + geometria + lengthM),
- `compiledMap.json` — kanoniczny `CompiledMap` (corridors/cells/conflictSet).

W Scene Package (`fleet-core`), pliki te trafiają do:

```text
compiled/
  sceneGraph.json
  compiledMap.json
```

---

## 3. Wejściowe API (CLI / opcjonalnie HTTP)

### 3.1 CLI (MUST)

Map Compiler MUST dostarczyć CLI, które jest „promptable”:

```bash
map-compiler compile   --smap ./raw/map.smap   --out-dir ./compiled   --robot-profile ./config/robotProfile.json5   --config ./config/compiler.json5
```

CLI MUST:
- zwrócić kod wyjścia 0 tylko jeśli walidacja + kompilacja się udały,
- wypisać na stdout podsumowanie (JSON) z hashami artefaktów.

Przykładowy output:
```json5
{
  ok: true,
  compilerVersion: "map-compiler-0.9.0",
  inputs: { smapPath: "./raw/map.smap", robotProfile: "./config/robotProfile.json5" },
  outputs: {
    sceneGraphPath: "./compiled/sceneGraph.json",
    compiledMapPath: "./compiled/compiledMap.json",
    sceneGraphHash: "sha256:...",
    compiledMapHash: "sha256:..."
  },
  stats: { nodes: 120, edges: 240, corridors: 55, cells: 4800 }
}
```

### 3.2 (Opcjonalnie) HTTP API (MAY)
Jeśli wygodniej w narzędziach, map-compiler MAY wystawić:
- `POST /map-compiler/v1/compile` (multipart: `.smap` + config),
- `GET /map-compiler/v1/artifacts/{hash}`,
ale w MVP nie jest to wymagane.

---

## 4. Kontrakty danych (MUST, skrót)

### 4.1 `SceneGraph` (skrót)
```json5
{
  nodes: [
    {
      nodeId: "LM2",                 // LocationMark lub ActionPoint
      nodeType: "locationMark",      // locationMark | actionPoint
      pos: { xM: 21.42, yM: 22.44 }, // metry
      angleRad: 0.0,                 // radiany (jeśli znane)
      externalRefs: { stationId: "LM2" } // mapowanie do protokołu robota (opcjonalnie)
    }
  ],
  edges: [
    {
      edgeId: "LM35-AP22",
      className: "DegenerateBezier",
      startNodeId: "LM35",
      endNodeId: "AP22",
      p0: { xM: 21.42, yM: 22.44 },
      p1: { xM: 21.42, yM: 21.00 },
      p2: { xM: 21.42, yM: 20.60 },
      p3: { xM: 21.42, yM: 19.75 },
      props: {
        direction: 1,
        moveStyle: "forward",   // forward | reverse (w domenie FM)
        widthM: 4.0,
        forbiddenRotAngleRad: 1.57079632679
      },
      lengthM: 2.69
    }
  ]
}
```

### 4.2 `CompiledMap` (skrót, spójny z v0.5)
```json5
{
  compiledMapVersion: "0.9",
  source: { smapHash: "sha256:..." },

  parameters: {
    cellLenM: 0.5,
    arcLutStepM: 0.05,
    geomEpsM: 0.0001,
    maxRectsPerCell: 32
  },

  corridors: [
    {
      corridorId: "C:LM1→LM9:abcd1234",
      aNodeId: "LM1",
      bNodeId: "LM9",
      lengthM: 17.2,
      segments: [
        { edgeId: "LM1-LM2", corridorS0M: 0.0, corridorS1M: 1.8 },
        { edgeId: "LM2-LM3", corridorS0M: 1.8, corridorS1M: 3.6 }
      ]
    }
  ],

  cells: [
    {
      cellId: "C:LM1→LM9:abcd1234#i=0#dir=A_TO_B",
      corridorId: "C:LM1→LM9:abcd1234",
      dir: "A_TO_B",
      corridorS0M: 0.0,
      corridorS1M: 0.5,

      sweptShape: {
        kind: "multiRect",
        bbox: { minXM: 0, minYM: 0, maxXM: 1, maxYM: 1 },
        rects: [
          { cxM: 0.25, cyM: 0.10, angleRad: 0.0, hxM: 0.9, hyM: 0.6 }
        ]
      },

      conflictSet: [
        "C:LM1→LM9:abcd1234#i=0#dir=A_TO_B",
        "C:LM7→LM9:ef901234#i=3#dir=B_TO_A"
      ]
    }
  ]
}
```

---

## 5. Pobieżny algorytm kompilacji (spójny z v0.5)

### 5.1 Pipeline (MUST)

```text
parse .smap
  -> build raw graph (nodes/edges)
  -> convert units -> meters + radians
  -> for each edge:
       keep DegenerateBezier control points
       compute arc length (LUT)
  -> corridor extraction (degree-2 chains)
  -> discretize corridors into cells (cellLenM)
  -> compute sweptShape (multiRect) for each cell using robotGeometryProfile
  -> compute conflictSet by OBB intersection (spatial index)
  -> write sceneGraph.json + compiledMap.json (canonical ordering)
```

### 5.2 Walidacje (MUST)
Map Compiler MUST walidować:
- spójność referencji (start/end nodes istnieją),
- brak NaN/Infinity,
- poprawność jednostek,
- że `LocationMark`/`ActionPoint` mają unikalne `nodeId`,
- że `ActionPoint` wymagane do „pick/drop/forks” istnieją w mapie i w configu sceny.

### 5.3 Determinizm i stabilne ID (MUST)
- `corridorId` i `cellId` MUST być stabilne i deterministyczne (patrz v0.5: orientacja A/B + hash sekwencji).
- Listy w output MUST być sortowane (np. po `nodeId`, `edgeId`, `corridorId`, `cellId`).
- Floaty MUST być kanonicznie zaokrąglane (np. do `1e-6`) przed serializacją.

---

## 6. Testy (MUST)
- Golden: `.smap` → `sceneGraph.json` + `compiledMap.json`.
- Determinism: ten sam input → bitowo identyczny output.
- Geometry sanity: długości krawędzi dodatnie, konfliktSet symetryczny, self-membership.
- Performance smoke: duża mapa mieści się w budżecie czasu (na CI) i w budżecie pamięci.

---

## 7. Relacja do innych komponentów (MUST)

- `roboshop-bridge` MUST używać map-compiler do budowy Scene Package.
- `fleet-core` MUST przechowywać artefakty kompilacji w `sceneStoreDir`.
- `algorithm-service` MUST używać `compiledMap` (DCL‑2D), a `sceneGraph` do routingu/rolling target.
- `internalSim` (w gateway) MAY używać `sceneGraph.geometrySamples` do symulacji ruchu.


---

## Załącznik A — Map Compiler (verbatim z v0.7)
# Fleet Manager 2.0 — Map Compiler (v0.7)

Map Compiler to narzędzie (CLI/biblioteka), które tworzy kanoniczny `SceneGraph` z mapy `.smap`.

## 1. Wejścia / wyjścia (MUST)
Input:
- `.smap` (źródło geometrii)
- opcjonalne dodatkowe pliki (np. nazwy warstw, metadane)

Output:
- `map/graph.json` zgodny z `04_kontrakty_scena_i_mapa.md`.

## 2. Wymagania deterministyczności (MUST)
- Dla tego samego `.smap` wynik `graph.json` MUST być identyczny (bitwise), chyba że zmieniono wersję kompilatora.
- Kompilator MUST mieć `compilerVersion` w `meta` (SHOULD), np. `meta.compilerVersion = "map-compiler-0.4.0"`.

## 3. Geometria (MUST)
- Kompilator MUST zachować geometrię krawędzi, w tym `DegenerateBezier` (control points).
- Kompilator MUST wyliczać:
  - `lengthM` (arc length, deterministycznie),
  - `direction` (z props mapy),
  - `corridorWidthM` (z props width; jeśli brak to 0),
  - inne derived pola potrzebne algorytmowi (np. forbiddenRotAngleRad), jeśli istnieją w źródle.

## 4. Konwersja jednostek (MUST)
- Jeśli `.smap` używa innej skali: kompilator MUST przeliczyć do metrów (`xM`, `yM`).
- `meta.resolutionM` MUST odzwierciedlać końcową rozdzielczość.

## 5. Walidacje (MUST)
Kompilator MUST wykrywać i raportować:
- brakujące węzły referencjonowane przez krawędzie,
- duplikaty id,
- NaN/Infinity,
- puste grafy.

Raport walidacji SHOULD zawierać `causeCode` oraz listę błędów.

## 6. Opcjonalne próbkowanie geometrii (SHOULD)
Kompilator SHOULD dodawać `geometrySamples` na krawędziach (patrz `04_*`),
aby:
- uprościć symulację,
- uprościć wizualizację,
- uniknąć duplikowania implementacji Béziera w wielu modułach.

## 7. Testy Map Compiler (MUST)
- testy jednostkowe dla parsera `.smap`,
- testy deterministyczności,
- testy kompatybilności z `graph.json` (np. z dołączonym `graph.json` jako golden).

Szczegóły: `17_strategia_testow.md`.
