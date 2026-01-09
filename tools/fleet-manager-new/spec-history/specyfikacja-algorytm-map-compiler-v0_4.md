# Specyfikacja algorytmu harmonogramowania i zarządzania ruchem dla Fleet Manager (v0.4)

**Data:** 2026-01-06  
**Status:** Draft implementowalny (MVP v1) + roadmap (future)  
**Zakres:** *task scheduling* + *traffic scheduling (Deterministic Corridor Locking 2D / DCL‑2D)* + *Rolling Target Point (RTP)* + kontrakty danych + testy/logi/replay.  
**Cel nadrzędny:** mieć algorytm, który **działa deterministycznie i bezpiecznie** już teraz, a jednocześnie mieć porządną specyfikację i interfejsy, które umożliwią kolejne wersje bez przepisywania całości.

---

> **Zestaw v0.4 (podział na 3 pliki):**
> - `specyfikacja-algorytm-kontrakty-i-akceptacja-v0_4.md`
> - `specyfikacja-algorytm-runtime-harmonogramowanie-ruch-v0_4.md`
> - `specyfikacja-algorytm-map-compiler-v0_4.md`

## 7. Model mapy i etap prekompilacji (Map Compiler)

Map Compiler jest procesem offline (lub uruchamianym przy starcie), który z mapy źródłowej buduje `CompiledMap` — strukturę danych zoptymalizowaną pod runtime (LockManager, DCL‑2D).

**[MVP] MUST:** runtime nie liczy ciężkiej geometrii „na żywo”, tylko używa wyników kompilacji (komórki, swept‑polygony, conflictSet, itp.).

---

### 7.1 Wejście: `.smap` → Graph → (opcjonalnie) `graph.json`

**Źródło prawdy:** plik `.smap` (Roboshop/Robokit map).  
W praktyce w repo już występuje eksport `graph.json`, którego format traktujemy jako **pośredni** (debug/artefakt builda).

Przykład (z `graph.json`) — krawędź jako `DegenerateBezier`:

```json5
{
  id: "LM35-AP22",
  className: "DegenerateBezier",
  start: "LM35",
  end: "AP22",
  startPos: { x: 21.42, y: 22.44 },
  endPos: { x: 21.42, y: 19.75 },
  controlPos1: { x: 21.42, y: 21.00 },
  controlPos2: { x: 21.42, y: 20.60 },
  props: {
    direction: 1,
    movestyle: 0,
    width: 4,
    forbiddenRotAngle: 90
  }
}
```

**Interpretacja MVP:**

- `className="DegenerateBezier"` oznacza krzywą Béziera stopnia 3:
  - `p0=startPos`, `p1=controlPos1`, `p2=controlPos2`, `p3=endPos`
- `props.direction` koduje dopuszczalny kierunek ruchu na tej krawędzi (lub jest redundantny, jeśli krawędzie są już zdublowane w dwóch kierunkach) — w MVP:
  - **Map Compiler MUST** umieć obsłużyć graf częściowo kierunkowy (nie każda krawędź ma rewers),
  - **RoutePlanner MUST** respektować kierunkowość wynikającą z grafu.

- `props.movestyle` koduje styl ruchu:
  - `0 = forward` (jazda przodem),
  - `1 = reverse` (jazda tyłem) — tylko jeśli robot ma to bezpiecznie wspierane jako element planowanej trasy.

- `props.width` to szerokość korytarza (w metrach; do walidacji z mapą) używana jako informacja pomocnicza (np. do single‑lane detection / debug).
- `forbiddenRotAngle` jest informacją mapową (MVP nie musi wykorzystywać, ale przenosimy do `CompiledMap`).

**[MVP] MUST:** Map Compiler waliduje:
- spójność grafu, brak brakujących referencji,
- jednostki (metry, radiany),
- że węzły `Pick/Drop` są typu `ActionPoint` (albo mapujemy je na `ActionPoint` przez metadane).

---

### 7.2 Parametryzacja łukowa (`edgeS`) dla `DegenerateBezier`

Runtime operuje w metrach. Dla każdej krawędzi musimy mieć funkcje:

- `edgeS = arcLength(t)` dla `t∈[0,1]`
- `t = inverseArcLength(edgeS)` (przybliżone)

**[MVP] MUST:** Map Compiler buduje LUT (look‑up table) o stałej rozdzielczości `arcLutStep` (np. 1–5 cm), żeby:
- wyznaczać długości krawędzi,
- wyznaczać pozycję/pochodną (tangent) w funkcji `edgeS`,
- generować polilinię do obliczeń swept‑polygon (z błędem kontrolowanym).

---

### 7.3 Korytarze (corridors) i `corridorId`

Celem jest grupowanie wielu krawędzi między skrzyżowaniami w jeden „korytarz logiczny”:

- korytarz może mieć **wiele węzłów po drodze** (np. długi korytarz z LocationMark’ami),
- direction token (`CORRIDOR_DIR`) dotyczy całego korytarza (single‑lane).

**Definicja MVP (deterministyczna):**
- w grafie nieskierowanym (ignorując duplikaty kierunków) bierzemy maksymalne łańcuchy, gdzie wszystkie węzły wewnętrzne mają stopień 2,
- końcami korytarza są węzły o stopniu != 2 (skrzyżowania, dead‑end, rozwidlenia).

Dla każdego korytarza Map Compiler wyznacza:

- `corridorId`
- `aNodeId`, `bNodeId` — końce korytarza
- oś `corridorS`: `0` w `A`, rośnie do `length` w `B`
- listę krawędzi składowych (w kolejności A→B) + offsety `corridorS0` dla każdej krawędzi

**[MVP] MUST:** `corridorId` jest stabilny i deterministyczny:
- wyznaczamy orientację A/B np. leksykograficznie po `nodeId` (A=min, B=max),
- `corridorId = "C:" + A + "→" + B + ":" + hash32(sequenceOfNodeIds)`.

---

### 7.4 Dyskretyzacja: komórki (`CELL`)

Każdy korytarz dzielimy na komórki długości `cellLen` (metry). Komórka jest najmniejszą jednostką lockowania 2D.

Dla każdej komórki zapisujemy:

- `cellId` (stabilny),
- `corridorId`,
- zakres w osi korytarza: `[corridorS0, corridorS1]`,
- referencję do fragmentu geometrii (które krawędzie i jakie `edgeS`),
- `sweptPolygon` (2D) po inflacji footprintu.

**Stabilne ID:**
- `cellId = corridorId + "#i=" + cellIndex + "#dir=" + (A_TO_B|B_TO_A)`  
  (w implementacji można użyć krótszego hash, ale musi być deterministyczny i odtwarzalny).

---

### 7.5 Swept‑polygon (2D obwiednia ruchu po krzywej)

Ponieważ **nie ma gwarancji**, że krawędzie są „wąską linią środka” ani że zakręty nie powodują zbliżeń 2D, wszystko opieramy na geometrii 2D.

Algorytm MVP (konserwatywny, implementowalny):

1) Próbkujemy trajektorię pivota po osi korytarza (lub po `edgeS`) co `sweepSampleStep` (np. 2–5 cm).  
2) W każdym sample wyznaczamy:
   - pozycję pivota `(x,y)`,
   - orientację robota `yaw` jako kąt stycznej (pochodnej) krzywej,
3) Budujemy polygon footprintu robota (prostokąt) i **inflatujemy** go o marginesy:
   - `poseMargin`, `trackingMargin`, `turningExtraMargin`,
4) `sweptPolygon` = unia wszystkich footprintów po samples (w praktyce: aproksymacja polygonem wypukłym / wielokątem prostym).

**[MVP] MUST:** swept‑polygon uwzględnia geometrię robota (head/tail/width) oraz to, że na zakręcie „tył zarzuca” — czyli sampling orientacji musi być zgodny z geometrią ruchu pivota.

---

### 7.6 Konflikty komórek (conflictSet)

Dla każdej komórki wyznaczamy `conflictSet` = wszystkie komórki, z którymi ma konflikt 2D:

- konflikt jeśli `intersects(sweptPolygon(cellA), sweptPolygon(cellB)) == true`,
- konflikt jest symetryczny,
- **self‑membership:** `cellId ∈ conflictSet(cellId)`.

**[MVP] MUST:** conflictSet jest prekomputowany i deterministyczny.

Implementacja: spatial index (R‑tree / grid hashing) + testy polygon‑polygon.

---

### 7.7 Strefy postoju/obrotu w węzłach (`NODE_STOP_ZONE`)

Jeżeli robot musi się zatrzymać w węźle (task, konflikt, zmiana stylu ruchu), węzeł musi mieć zarezerwowaną strefę na pełny obrót 360°.

Map Compiler wyznacza dla każdego węzła:

- `nodeStopZoneRadius = R_turn + poseMargin + trackingMargin`
- relacje konfliktów `NODE_STOP_ZONE(node)` ↔ `CELL(cell)` (jeśli `cell.sweptPolygon` przecina koło strefy)

**[MVP] MUST:** `NODE_STOP_ZONE` jest zasobem o `capacity=1`.

---

### 7.8 Tranzycje w węzłach: geometria (TANGENT/NON_TANGENT)

Map Compiler klasyfikuje przejścia przez węzeł geometrcznie:

- `transitionGeomKind = TANGENT` jeśli wektor styczny na końcu `inEdge` i na początku `outEdge` ma różnicę kąta ≤ `tangentEps` **i** `movestyle` jest kompatybilny,
- w przeciwnym razie `NON_TANGENT`.

**Uwaga:** to jest *tylko geometria*. Runtime może i tak zatrzymać robota w węźle (np. `TRAFFIC_HOLD`) — wtedy wymaga `NODE_STOP_ZONE`.

---

### 7.9 Determinism: sortowania + canonical hashing

**[MVP] MUST:** `CompiledMap` ma stabilny hash (`compiledMapHash`), liczony z kanonicznej reprezentacji:

- JSON bez komentarzy (JSON5 tylko jako format „dla ludzi”),  
- sortowanie kluczy obiektów i sortowanie list po stabilnych kluczach (`nodeId`, `edgeId`, `cellId`),  
- ujednolicone formaty liczb (np. zaokrąglenie do 1e‑6 w hash).

---

### 7.10 Pseudokod kompilacji (deterministyczny)

```text
compile(map.smap, params):
  graph = loadSmap(map.smap)              // lub loadGraphJson
  validate(graph)

  // 1) geometry
  for each edge in graph.edges sorted by edge.id:
    bezier = (p0,p1,p2,p3)
    lut = buildArcLengthLUT(bezier, arcLutStep)
    edge.arcLength = lut.totalLength
    edge.samples   = sampleByArcLength(lut, sweepSampleStep)

  // 2) corridors (na grafie nieskierowanym)
  corridors = buildCorridors(graph)       // stabilne sortowanie: by (aNodeId,bNodeId,hashPath)
  for corridor in corridors:
    corridor.axis = corridorS (A->B)
    corridor.segments = computeEdgeOffsets(corridor)

  // 3) cells
  cells = []
  for corridor in corridors sorted by corridorId:
    for each dir in [A_TO_B, B_TO_A]:
      for i = 0..ceil(length/cellLen)-1:
        cell = buildCell(corridor, dir, i)
        cell.sweptPolygon = computeSweptPolygon(cell.spans, robotModel, margins)
        cells.append(cell)

  // 4) conflict sets
  index = spatialIndex(cells by sweptPolygon bbox)
  for cell in cells sorted by cellId:
    candidates = index.query(cell.bbox)
    conflict = []
    for other in candidates:
      if intersects(cell.sweptPolygon, other.sweptPolygon):
        conflict.append(other.cellId)
    conflict.add(cell.cellId)   // self
    cell.conflictSet = sort(conflict)

  // 5) node zones + transitions
  nodeZones = computeNodeStopZones(graph.nodes, robotModel, margins)
  transitions = classifyTransitions(graph, tangentEps)

  // 6) canonical hash
  compiled = {meta,nodes,edges,corridors,cells,nodeZones,transitions,...}
  compiled.meta.compiledMapHash = sha256(canonicalJson(compiled))

  return compiled
```

**[MVP] MUST:** stabilność wyniku = stabilność sortowań + brak losowości + kanoniczny zapis liczb.


## 8. Kontrakt `CompiledMap` (JSON5 — czytelny dla ludzi)

Poniżej minimalny, czytelny kontrakt (JSON5).  
W runtime zalecamy trzymać też wersję „kanoniczną” (JSON) do hash.

```json5
{
  meta: {
    mapName: "hala_3",
    mapVersion: "1.0",
    source: { kind: "smap", filename: "hala_3.smap" },
    units: { length: "m", angle: "rad" },

    // parametry kompilacji (dla determinism/debug)
    compileParams: {
      cellLen: 0.80,              // [m]
      sweepSampleStep: 0.05,      // [m]
      arcLutStep: 0.02,           // [m]
      tangentEps: 0.0873          // [rad] ~5°
    },

    compiledMapHash: "sha256:..."
  },

  nodes: [
    { nodeId: "LM35", kind: "LocationMark", pos: {x: 21.42, y: 22.44} },
    { nodeId: "AP22", kind: "ActionPoint",  pos: {x: 21.42, y: 19.75} }
  ],

  edges: [
    {
      edgeId: "LM35-AP22",
      startNodeId: "LM35",
      endNodeId: "AP22",

      geometry: {
        kind: "DegenerateBezier",
        p0: {x: 21.42, y: 22.44},
        p1: {x: 21.42, y: 21.00},
        p2: {x: 21.42, y: 20.60},
        p3: {x: 21.42, y: 19.75}
      },

      // prekomputacje (opcjonalnie, ale zalecane do debug)
      samples: {
        arcLength: 2.69,
        points: [
          {x: 21.42, y: 22.44},
          {x: 21.42, y: 22.00},
          {x: 21.42, y: 21.50},
          {x: 21.42, y: 21.00},
          {x: 21.42, y: 20.50},
          {x: 21.42, y: 20.00},
          {x: 21.42, y: 19.75}
        ]
      },

      props: {
        direction: "A_TO_B",       // interpretacja po stronie compiler’a
        movestyle: "forward",      // "forward" | "reverse"
        width: 4.0,
        forbiddenRotAngle: 1.5708
      }
    }
  ],

  corridors: [
    {
      corridorId: "C:LM10→LM20:ab12cd34",
      aNodeId: "LM10",
      bNodeId: "LM20",
      length: 42.7,
      singleLane: true,

      // lista segmentów w kolejności A→B
      segments: [
        { edgeId: "LM10-LM11", corridorS0: 0.0,   aligned: true },
        { edgeId: "LM11-LM12", corridorS0: 5.3,   aligned: true },
        { edgeId: "LM12-LM20", corridorS0: 11.1,  aligned: true }
      ]
    }
  ],

  nodeStopZones: [
    { nodeId: "LM11", radius: 2.35 }   // [m]
  ],

  transitions: [
    {
      nodeId: "LM11",
      inEdgeId: "LM10-LM11",
      outEdgeId: "LM11-LM12",
      transitionGeomKind: "TANGENT"    // lub "NON_TANGENT"
    }
  ],

  cells: [
    {
      cellId: "C:LM10→LM20:ab12cd34#i=0#dir=A_TO_B",
      corridorId: "C:LM10→LM20:ab12cd34",
      corridorS0: 0.0,
      corridorS1: 0.80,

      // referencje do geometrii (opcjonalne)
      spans: [
        { edgeId: "LM10-LM11", edgeS0: 0.0, edgeS1: 0.80 }
      ],

      sweptPolygon: [
        {x: 10.0, y: 10.0}, {x: 11.0, y: 10.0}, {x: 11.0, y: 11.0}, {x: 10.0, y: 11.0}
      ],

      conflictSet: [
        "C:LM10→LM20:ab12cd34#i=0#dir=A_TO_B",
        "C:LM10→LM20:ab12cd34#i=1#dir=A_TO_B",
        "C:LM10→LM20:ab12cd34#i=0#dir=B_TO_A"
      ]
    }
  ],

  criticalSections: [
    { csId: "CS1", capacity: 1, cellIds: ["..."] }
  ]
}
```

---

## 9. Rzeczy przeniesione / deprecated

- `transitionKind = PASS_THROUGH|STOP_TURN` (v0.3) — zastąpione przez `transitionGeomKind = TANGENT|NON_TANGENT` (v0.4).  
- `NODE_TURN(nodeId)` (v0.3) — alias historyczny; w v0.4 mówimy `NODE_STOP_ZONE(nodeId)`.
