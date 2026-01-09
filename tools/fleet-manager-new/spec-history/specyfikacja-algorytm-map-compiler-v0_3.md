# Specyfikacja algorytmu harmonogramowania i zarządzania ruchem dla Fleet Manager (v0.3)

**Data:** 2026-01-06  
**Status:** Draft implementowalny (MVP v1) + roadmap (future)  
**Zakres:** *task scheduling* + *traffic scheduling (Deterministic Corridor Locking 2D, DCL‑2D)* + *Rolling Target Point (RTP)* + kontrakty danych + testy/logi/replay.  
**Cel nadrzędny:** mieć algorytm, który **działa deterministycznie i bezpiecznie**, a jednocześnie ma interfejsy i punkty rozszerzeń tak, żeby kolejne wersje były łatwe do zrobienia.

---
> **Zestaw v0.3 (podział monolitu na 3 pliki):**
> - `specyfikacja-algorytm-kontrakty-i-akceptacja-v0_3.md`
> - `specyfikacja-algorytm-runtime-harmonogramowanie-ruch-v0_3.md`
> - `specyfikacja-algorytm-map-compiler-v0_3.md`
## 7. Model mapy i etap prekompilacji (Map Compiler)

W MVP v1 runtime ma być prosty. Cała ciężka geometria dzieje się w Map Compiler.

### 7.1 Wejście mapy (Graph)

Wejście do Map Compiler:

- `nodes[]`: id, (x,y), atrybuty (np. pick/drop/parking).  
- `edges[]`: id, from, to, geometria 2D (krzywa), długość, dozwolone kierunki, `movestyle` per kierunek, opcjonalnie `width` (korytarz fizyczny).

**[MVP] MUST:** pick i drop to węzły (`nodeId`), nie „punkt na krawędzi”.

### 7.2 Parametryzacja po długości (arc-length)

Map Compiler MUSI zapewnić, że każda krawędź ma parametr `s` w metrach (arc‑length), a nie „t”.

- `s=0` na początku krawędzi kierunkowej, `s=L` na końcu.  
- Komórki rezerwacji mają zakresy `[s0, s1)`.

### 7.3 CorridorId: klasyfikacja wąskich korytarzy (single-lane)

Problem „długiego korytarza z wieloma węzłami po drodze” oznacza, że single-lane nie może być tylko „jedna krawędź”.

**[MVP] MUST:** Map Compiler generuje `corridors[]` (corridorId), które są ciągami krawędzi:

- corridor zaczyna się i kończy w **węzłach decyzyjnych** (skrzyżowania / rozwidlenia / strefy mijania),  
- w środku corridoru mogą być węzły „techniczne” (segmentacja geometrii), ale one nie zmieniają tego, że to jeden fizyczny przejazd.

Prosta heurystyka MVP (deterministyczna):

- corridor rośnie wzdłuż grafu tak długo, jak:
  - każdy węzeł pośredni ma stopień 2 (dla korytarza),  
  - brak alternatywnych wyjść (brak rozwidlenia),  
  - `width` i atrybuty ruchu nie zmieniają klasy (np. single-lane),  
  - brak oznaczenia „passingPlace=true”.

Jeśli nie da się jednoznacznie zbudować corridorów, Map Compiler MUSI wygenerować ostrzeżenie i może zdegradować do „edge-level” z dodatkowym oznaczeniem CS (bardziej konserwatywne).

### 7.4 Dyskretyzacja na komórki rezerwacji (cells)

Każdy `edgeKey` jest dzielony na komórki o długości `cellLen`:

- `cellId` jest deterministyczne (patrz §7.9).  
- Komórka ma geometrię (polyline/curve segment + swept corridor polygon).  
- Komórka zna: `edgeKey`, `corridorId`, `[s0,s1)`, `isTurnSegment` (dla turningExtraMargin).

**[MVP] MUST:** robot może rezerwować tylko prefiks komórek **od swojego aktualnego `s` w kierunku ruchu**, a nie „od początku krawędzi”.

### 7.5 Konflikty 2D (conflict sets)

Map Compiler wyznacza konflikty 2D pomiędzy komórkami (oraz pomiędzy komórkami i zasobami typu NODE_TURN).

**MVP model konfliktu:**
- każda komórka ma polygon swept corridor (dyskowy Minkowski sum).  
- konflikt zachodzi, jeśli polygony się przecinają lub odległość < 0 (po uwzględnieniu inflacji).

**[MVP] MUST:** `conflictSet` jest:
- **symetryczny**: jeśli `B` konfliktuje z `A`, to `A` konfliktuje z `B`,  
- **zawiera self**: komórka konfliktuje sama ze sobą (ułatwia implementację „zajęte, jeśli przyznane”).

### 7.6 Tranzycje w węzłach: PASS_THROUGH vs STOP_TURN

Map Compiler generuje tablicę tranzycji:

- dla każdego węzła i każdej pary (incomingEdgeKey, outgoingEdgeKey) definiuje `transitionKind`:

  - `PASS_THROUGH` jeśli:
    - krzywe są styczne w węźle w tolerancji `tangentEps` (np. 5°), **i**
    - planner deklaruje, że nie ma obowiązkowego stopu (np. brak pick/drop, brak zmiany `movestyle`, brak wymuszonego „alignment”).  
  - w przeciwnym razie `STOP_TURN`.

W praktyce, w MVP v1 decyzja „czy będzie stop” może być w części po stronie planner/scheduler (np. pick/drop zawsze stop). Dlatego `transitionKind` w CompiledMap jest **górnym ograniczeniem**:
- `PASS_THROUGH` oznacza „można przejechać bez obrotu, jeśli runtime nie wymusi stopu”,  
- `STOP_TURN` oznacza „obrót jest wymagany (brak styczności)”.

Runtime MUSI traktować STOP_TURN jako wymagający `NODE_TURN`.

### 7.7 Węzły jako obszary i sloty (opcjonalne, ale MVP‑ready)

Ponieważ dopuszczasz „więcej niż jeden robot w obrębie węzła” w pewnych przypadkach, model węzła jako punktu jest niewystarczający.

**[MVP] SHOULD:** Map Compiler może generować `nodeSlots[]`:
- sloty są punktami w obszarze węzła (np. 2–4 punkty),  
- każdy slot ma konflikt z innymi slotami jeśli dyski `R_turn` się przecinają.

MVP może zacząć od `nodeCapacity=1` (najbezpieczniej), a sloty włączyć później — bez zmiany runtime (to tylko więcej zasobów).

### 7.8 Wersjonowanie artefaktów mapy

CompiledMap ma:

- `compiledMapVersion` (semver),  
- `sourceMapHash` (hash wejściowej mapy),  
- `compiledMapHash` (hash wyniku),  
- `paramsHash` (hash parametrów kompilacji: cellLen, marginesy domyślne, tangentEps, itd.).

**[MVP] MUST:** te hashe są logowane w każdym snapshotcie.

### 7.9 Stabilne identyfikatory (ważne dla determinism + replay)

- `cellId` MUST być deterministyczne względem:
  - `edgeKey`, `cellIndex`, `compiledMapVersion`, `cellLen`, `sourceMapHash`  
- `conflictId` (jeśli używane) MUST być deterministyczne względem par cellId (np. `min(cellA,cellB) + ":" + max(...)`).

---

## 8. Kontrakt danych: CompiledMap (JSON5, z komentarzami)

Ta sekcja jest „twardym interfejsem” między Map Compiler a runtime.

### 8.1 Minimalny schema (MVP)

Poniżej przykładowy payload (JSON5). Komentarze są częścią dokumentacji.

```json5
{
  compiledMapVersion: "0.3.0",          // semver: wersja formatu CompiledMap
  sourceMapHash: "sha256:...",           // hash surowej mapy wejściowej
  compiledMapHash: "sha256:...",         // hash tej struktury (po kompilacji)
  paramsHash: "sha256:...",              // hash parametrów kompilacji

  units: { distance: "m", time: "ms", angle: "rad" },

  meta: {
    cellLen: 0.75,                       // [m] długość komórki
    tangentEpsRad: 0.087266,             // [rad] ~5° tolerancja styczności
  },

  nodes: [
    { nodeId: "N1", x: 0.0, y: 0.0 },     // [m]
    // ...
  ],

  // Krawędzie kierunkowe (edgeKey) — każda ma geometrię i parametryzację po s.
  edges: [
    {
      edgeKey: "E12@N1->N2",              // stable id: edgeId + direction
      fromNodeId: "N1",
      toNodeId: "N2",
      length: 12.34,                      // [m]
      movestyle: "forward",               // "forward" | "reverse" — jak robot jedzie na tej krawędzi
      corridorId: "C_Aisle_7",            // fizyczny korytarz (single-lane)
      geometry: {
        kind: "polyline",                 // MVP: polyline; FUTURE: bezier, spline
        points: [                         // [m]
          { x: 0.0, y: 0.0 },
          { x: 3.0, y: 0.0 },
          { x: 6.0, y: 1.0 },
        ],
      },
    },
  ],

  corridors: [
    {
      corridorId: "C_Aisle_7",
      singleLane: true,                   // wąski korytarz: jeden kierunek naraz
      edgeKeys: ["E12@N1->N2", "E23@N2->N3"], // ciąg krawędzi w korytarzu (od skrzyż. do skrzyż.)
    },
  ],

  // Komórki rezerwacji. Każda ma zakres s i conflictSet.
  cells: [
    {
      cellId: "cell:E12@N1->N2:0",
      edgeKey: "E12@N1->N2",
      corridorId: "C_Aisle_7",
      s0: 0.0,                             // [m] początek zakresu na krawędzi
      s1: 0.75,                            // [m] koniec zakresu
      isTurnSegment: false,                // wpływa na turningExtraMargin
      // Obszar 2D swept corridor dla tej komórki (MVP: dysk Minkowski sum).
      sweptPolygon: {
        kind: "aabb",                      // MVP: uproszczony; FUTURE: polygon
        minX: -0.5, minY: -0.5,            // [m]
        maxX:  1.2, maxY:  0.5,
      },
      conflictSet: [
        "cell:E12@N1->N2:0",               // self
        "cell:E12@N1->N2:1",
        "cell:E34@N3->N4:7",
      ],
      criticalSectionId: null,             // lub np. "CS:Intersection_1"
    },
  ],

  criticalSections: [
    {
      criticalSectionId: "CS:Intersection_1",
      cellIds: ["cell:E12@N1->N2:5", "cell:E99@N9->N1:0"],
      // capacity=1 (MVP). FUTURE: capacity>1.
      capacity: 1,
    },
  ],

  // Tranzycje w węzłach: PASS_THROUGH vs STOP_TURN.
  transitions: [
    {
      nodeId: "N2",
      incomingEdgeKey: "E12@N1->N2",
      outgoingEdgeKey: "E23@N2->N3",
      transitionKind: "PASS_THROUGH",      // "PASS_THROUGH" | "STOP_TURN"
    },
  ],
}
```

**[MVP] MUST:** runtime nie może uruchomić sceny bez poprawnego CompiledMap (walidator).

---
