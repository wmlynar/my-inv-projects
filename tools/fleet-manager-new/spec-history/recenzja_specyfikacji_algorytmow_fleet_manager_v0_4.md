# Recenzja specyfikacji algorytmów Fleet Manager v0.4 (3 pliki)

**Data:** 2026-01-06  
**Zakres recenzji:**  
- `specyfikacja-algorytm-kontrakty-i-akceptacja-v0_4.md`  
- `specyfikacja-algorytm-runtime-harmonogramowanie-ruch-v0_4.md`  
- `specyfikacja-algorytm-map-compiler-v0_4.md`

---

## Prompt użyty do wygenerowania tej recenzji

```text
dzieki za przeslanie nowej wersji specyfikacji w trzech plikach. to teraz ponownie zrob recenzje i przedstaw w postaci dokumentu recenzji specyfikacji algorytmow
- co jeszcze bys w nich poprawil
- co jeszcze bys tam dodal
- jakie bledy widzisz
- co bys ulepszyl
- jak bys zrobicl zeby byla jeszcze bardziej future proof
- jak bys zrobil, zeby byla lepszej jakosci
- jak bys zrobil zeby byla bardziej projesjponalna
- jak bys zrobil, zeby byla bardziej odporna na wszelkiego typu bledy
- jak bysmy zrobili, zeby jeszcze lepiej sie nadawala do pracy z AI

WAZNE: obwiednia zajętości na fragmencie trasy nie powinna byc suma Minkowskiego, bo to uniemozliwi mijanie wozko w wazkich korytarzach - niech bedzie to robione za pomoca dokładniejszego model prostokątnego, czyli wezszy na prostych a zarzucajacy tylem na zakretach. sklladany z prostokatow. alle moze masz inny pomysl
```

---

## 1. Najważniejsze wnioski (executive summary)

### Co jest już bardzo dobre w v0.4

- **Podział na 3 pliki** (kontrakty/akceptacja, runtime, map compiler) realnie zmniejsza chaos i ułatwia pracę iteracyjną.
- Widać „kręgosłup produkcyjny”: **deterministyczny tick**, **fail‑closed zamiast TTL**, **logi + replay/time‑warp**, metryki anti‑oscillation.
- **Kontrakty RTP jako `LocationMark`/`ActionPoint`** oraz mapowanie na ramki Robokit są spójne z kodem adaptera (`rbk.js`, `robokit_client.js`).
- Map Compiler ma sensowny kierunek: **arc‑length**, **cells**, **swept geometry**, **conflictSet**, oraz rozróżnienie **TANGENT vs NON_TANGENT**.

### Najważniejsze problemy (blockery do “production‑ready”)

1) **Niespójność geometrii obwiedni między plikami + sprzeczność z Twoją uwagą „nie Minkowski”**  
   - Runtime (§6.4.1) opisuje MVP jako **dysk + Minkowski sum**.  
   - Map Compiler (§7.5) opisuje **swept polygon** (rect‑sweep).  
   - Kontrakty/plan wdrożenia nadal wspominają „model dyskowy (R_move)”.  
   To trzeba ujednolicić – i skoro Twoje wymaganie jest jasne: *Minkowski sum jako podstawowy model MVP odpada*.

2) **Niespójne identyfikatory i „układ współrzędnych postępu” między plikami (cellId/routeS/corridorS)**  
   - Map Compiler definiuje `cellId` w stylu `C:...#i=...#dir=...` i współrzędne `corridorS0/S1`.  
   - Kontrakty mają przykłady `cell:E12@N1->N2:6` (edge‑based) – to wygląda jak inny system komórek.  
   - Runtime liczy `hold_standoff` w oparciu o **`routeS` dwóch różnych robotów**, co jest **z definicji nieporównywalne** (routeS jest per‑route).  
   Te rzeczy trzeba doprecyzować i scalić, inaczej implementacja będzie „zgadywaniem”.

3) **Brak kilku krytycznych definicji kontraktów, mimo że interfejsy je używają**  
   - `LockSnapshot` (struktura, tokeny, holders, czasy, itd.) jest używany w interfejsach, ale nie ma jednoznacznego payloadu JSON5.  
   - `RobotCapabilities` jest wspomniane, ale nie jest zdefiniowane (a to ważne dla reverse/turning/stopline/pick/drop).

4) **Semantyka zasobów typu `CORRIDOR_DIR` jest w praktyce “specjalnym przypadkiem”, ale nie jest opisana formalnie**  
   Jeśli potraktujesz `CORRIDOR_DIR(corridorId, dir)` jak zwykły zasób‑ID w setach, to dwa roboty jadące w tym samym kierunku mogą się blokować „przez przypadek”. Potrzebujesz jawnej reguły konfliktu: *ten sam corridorId + różny dir = konflikt*, a *ten sam corridorId + ten sam dir = dozwolone (wielu holderów)*.

5) **Map Compiler: orientacja robota na próbkach nie uwzględnia `movestyle`/kierunku** (ryzyko przy `head != tail`)  
   Swept geometry musi bazować na **orientacji (yaw) robota**, a nie tylko na tangencie krzywej w kierunku parametryzacji. Przy jeździe tyłem orientacja robota i wektor prędkości są przeciwne – to ma znaczenie, jeśli przód i tył mają inną geometrię/marginesy.

---

## 2. Co jeszcze bym w tym poprawił

### 2.1 Porządek i spójność między trzema plikami

- **Ujednolić nazwy i stare referencje**:  
  - w `kontrakty` wciąż pojawia się „PASS_THROUGH/STOP_TURN” w checklistach, podczas gdy v0.4 używa `TANGENT/NON_TANGENT`.  
  - w `kontrakty` jest nagłówek `# Część 2 — Specyfikacja (v0.3)` mimo że to plik v0.4 (to wygląda jak błąd w dokumencie, który potem będzie mylił recenzentów/AI).
- **Ujednolicić format `cellId` i `edgeKey`**: jeden format w całym zestawie + 1 sekcja “ID conventions”.
- **Dodać mały “master ToC”** (spis treści) na początku `kontrakty`, wskazujący gdzie jest:
  - definicja geometrii i zasobów,
  - runtime tick, lock manager, hold‑point,
  - kompilacja mapy i konfliktów,
  - testy i golden scenariusze.

### 2.2 Doprecyzować miejsca, które nadal wymagają “zgadywania implementacyjnego”

- Zdefiniować **dokładnie**:
  - jak `CorridorBuilder` mapuje `(edgeKey, edgeS)` na `cellId` oraz na `corridorS`,  
  - jak liczymy `grantEndRouteS` z listy `cellId` (czy to wynik z `RoutePlan`, czy trzymamy per‑resource `routeS0/routeS1`).
- Doprecyzować **jak wyznaczamy `occupied(R)`** (teraz jest kontrakt/inwariant, ale brakuje algorytmu).

---

## 3. Co jeszcze bym tam dodał

### 3.1 Minimalne brakujące kontrakty danych (MVP MUST)

1) **`LockSnapshot` – JSON5**
   - stan `CORRIDOR_DIR` dla każdego `corridorId` (dir, holders[], emptySinceMs),  
   - stan `CRITICAL_SECTION` (holder albo holders + capacity),  
   - mapowanie `robotId -> grantedResources[]` + `firstBlockedAtMs`,  
   - (opcjonalnie) “sticky winner” metadata.

2) **`RobotCapabilities` – JSON5**
   - `canReverseSafely` (MVP: false jako mechanizm ustąpienia; ale trasy mogą mieć reverse),  
   - `canTurnInPlace` (węzły),  
   - `supportsStopLine` (czy robot/gateway potrafi egzekwować stop‑line bez gęstych marków),  
   - `fork` capabilities (max height, resolution, ack semantics).

3) **`CorridorProgress` / wspólna oś do porównań między robotami**
   - dla każdego robota (jeśli jest na korytarzu): `{ corridorId, dir, corridorS }` + `cellIndex`  
   - to jest kluczowe, żeby policzyć follow‑distance/stopStandoff **bez porównywania routeS**.

### 3.2 “Wymagania mapy” dla RTP (mark density albo gateway stopline)

W runtime słusznie zauważasz problem: targetRef to mark/AP, a stop‑line może wypadać “pomiędzy”.  
W spec brakuje twardego rozstrzygnięcia MVP:

- **Opcja A (prosta, kontraktowa):** mapa MUSI mieć mark’i co ≤ `rtpLookaheadGranularity` (np. co 0.5–1.0 m) na wszystkich korytarzach.  
  Map Compiler waliduje i fail‑start, jeśli jest rzadziej.
- **Opcja B (bardziej systemowa):** RobotGateway MUSI umieć wyhamować na `stopLineRouteS` bez gęstych marków (czyli potrzebuje geometrii trasy i progresu).  
  Wtedy spec musi doprecyzować “jak gateway liczy progres”.

Bez jednego z tych punktów, RTP będzie albo zbyt konserwatywne (wczesne zatrzymania), albo ryzykowne (overshoot).

### 3.3 Golden scenario: “mijanie w wąskim korytarzu / bliskie krawędzie”

Dodałbym scenariusz testowy stricte pod Twoją uwagę o Minkowski:

- Dwie równoległe krawędzie (dwa “pasy”) na odległość niewiele większą niż 2×(width+side margins).  
- Oczekiwanie: **dla modelu prostokątnego** conflictSet *nie blokuje* jednoczesnego przejazdu, a dla dysku Minkowskiego blokuje.  
- Ten scenariusz powinien być “dowodem regresji” na zbyt konserwatywną geometrię.

---

## 4. Jakie błędy widzę (konkretne)

### 4.1 Niespójność “MVP dysk” vs “MVP swept polygon”
- Runtime (§6.4.1) opisuje MVP jako dysk + Minkowski sum.  
- Map Compiler (§7.5) opisuje obwiednię jako union footprintów (rectangles) i buduje `sweptPolygon`.  
- Kontrakty/plan wdrożenia i checklisty jeszcze nawiązują do „modelu dyskowego (R_move)”.

**Skutek:** implementator nie wie, co jest źródłem prawdy, a testy będą sprzeczne.

### 4.2 `hold_standoff` używa `routeS` (błąd koncepcyjny)
W runtime (§11.8.2) limit standoff jest liczony jako funkcja `leaderRouteS`.  
Jeśli lider i follower mają różne `routeId`, `routeS` jest nieporównywalne.  
To grozi:
- fałszywymi STOP (zbyt mały hold),
- albo brakiem STOP (zbyt duży hold).

**Naprawa:** liczyć standoff w **osi wspólnej**: `corridorS` (albo `edgeS` jeśli to ta sama krawędź), nigdy w routeS per‑robot.

### 4.3 `cellId` i format komórek niespójny między plikami
- Map Compiler: `cellId` = corridor+index+dir.  
- Kontrakty: przykłady cellId = edge+index.

**Naprawa:** 1 canonical format + aktualizacja wszystkich przykładów.

### 4.4 `NODE_STOP_ZONE` radius może być “podwójnie” inflatowany
Runtime liczy `R_turn` z `frontExt/rearExt/sideExt`, które już zawierają `poseMargin + trackingMargin`.  
Map Compiler wspomina `nodeStopZoneRadius = R_turn + poseMargin + trackingMargin`.  
To może (w zależności od interpretacji R_turn) dodać marginesy drugi raz.

**Naprawa:** jedna definicja wzoru w jednym miejscu, a Map Compiler i runtime tylko ją cytują.

### 4.5 `CORRIDOR_DIR` jako zasób – brak formalnej semantyki konfliktu
W spec jest opis tokenu, ale brakuje precyzyjnego “resource conflict rule”, co jest kluczowe dla implementacji w LockManager.

---

## 5. Co bym ulepszył (algorytmicznie i implementacyjnie)

### 5.1 Obwiednia zajętości: porzucić Minkowski sum jako model “default”

Twoje “WAZNE” jest trafione: dyskowy Minkowski jest **za bardzo konserwatywny** i realnie potrafi zabić przepustowość (w tym mijanie na dwóch bliskich krawędziach / pasach).

**Rekomendacja dla MVP v0.4+ (najprostsza implementowalna i dokładniejsza):**

- Obwiednia komórki (`cell.swept`) = **unia prostokątów (OBB)** z próbkowania trajektorii pivota:
  - w punktach co `sweepSampleStep` wzdłuż parametru `s`,
  - w każdym punkcie: prostokąt inflated footprint, obrócony o yaw robota,
  - w rezultacie przechowujemy *listę OBB* (np. 5–30 na cell) zamiast pojedynczego wielokąta.

**Dlaczego OBB‑lista, a nie Minkowski ani “jedno polygon union”?**
- jest dużo mniej konserwatywna niż dysk,
- jest deterministyczna i prosta do testowania,
- daje “wąsko na prostych” naturalnie: na prostym odcinku yaw prawie stały → OBB‑y prawie się pokrywają → możesz je zredukować,
- na zakrętach automatycznie “rozlewa się” przez tail‑swing.

**ConflictSet** offline:
- `cellA` konfliktuje z `cellB` jeśli **jakikolwiek OBB** z A przecina **jakikolwiek OBB** z B (SAT dla OBB).

Opcjonalnie: dla pamięci, OBB‑y można zredukować/połączyć (np. greedy merge) przy zachowaniu gwarancji, że nie “ucinamy” obwiedni.

**Gdzie zostawić dysk?**  
Jako *fallback fail‑closed* dla robotów “unknown/stale/off‑route” (czyli w trybie degradacji), nie jako geometria normalnej pracy.

### 5.2 Urealnić “mijanie w korytarzu”
Jeżeli “mijanie” ma znaczyć: **dwa roboty jadą obok siebie w jednym fizycznym korytarzu**, to sama geometria obwiedni nie wystarczy – potrzebujesz:
- albo dwóch osobnych krawędzi/lanes w mapie (najprościej),
- albo “multi‑lane corridor” z lokalnym plannerem (to jest FUTURE).

W v0.4 najczyściej:
- zakładamy, że “mijanie” jest modelowane mapą jako **dwie bliskie krawędzie** (dwa pasy), a conflictSet ma nie blokować, jeśli obwiednie się nie przecinają.

To warto dopisać jako explicit assumption lub decyzję MVP (żeby nikt nie zakładał “magicznego” zjeżdżania na bok bez lane’ów).

### 5.3 Doprecyzować wyznaczanie yaw w Map Compiler
- Dla `movestyle=forward`: yaw = tangent w kierunku ruchu.  
- Dla `movestyle=reverse`: yaw = tangent + π (bo robot “patrzy” odwrotnie).  
- Dla `dir=B_TO_A`: analogicznie uwzględnić odwrócenie parametryzacji.

Bez tego obwiednie dla `head != tail` będą błędne.

### 5.4 Formalna definicja “porównywalnego postępu”
Wprowadzić w runtime stały, wspólny “progress space”:

- `corridorS` w corridorze (od A do B) jako podstawowy do:
  - follow distance / stopStandoff,
  - direction arbitration,
  - occupancy slicing (jakie cellIndex są “przed/za”).

`routeS` zostaje do:
- RTP lookahead,
- logów i debug (na poziomie per‑robot planu).

---

## 6. Jak zrobić, żeby było jeszcze bardziej future‑proof

- **Wersjonowanie kontraktów**: `contractVersion` (semver) w każdym payloadzie, plus `compiledMapVersion`.  
  MVP: kompatybilność wstecz w obrębie minor.
- **Heterogeniczna flota**: dziś CompiledMap jest “dla robota”.  
  Future‑proof: określić, czy:
  - kompilujemy per “robot class” (np. F1, F2), albo
  - kompilujemy dla “worst‑case envelope” (bezpieczne, ale bardziej konserwatywne).
- **Feature flags w geometrii**: np. `geometryModel = OBB_SWEEP | POLYGON_SWEEP | DISK_FALLBACK`.  
  Pozwala testować i włączać etapami.
- **Przygotować miejsce na time‑reservations** (space‑time) bez zmiany kontraktów:
  - np. do resource przydziału można dodać opcjonalnie `[t0,t1]`,
  - ale MVP działa bez.

---

## 7. Jak zrobić, żeby była lepszej jakości

- **Jedno źródło prawdy dla definicji**:  
  definicje `cell`, `conflictSet`, `resource`, `occupied/granted/released`, `holdPoint` – najlepiej raz, a inne pliki tylko linkują.
- **Wyrównać wszystkie przykłady payloadów do tych samych ID‑konwencji** (to jest najczęstszy “papierowy bug” w specach).
- **Dodać 2–3 “end‑to‑end tick snapshots”** jako przykłady (input→requests→grants→holdPoint→command), bo to najlepiej uczy i ludzi, i AI.

---

## 8. Jak zrobić, żeby była bardziej profesjonalna

- W każdym pliku: metadata (wersja, status, zakres, zależności, owner).  
- Spójny styl normatywny: MUST/SHOULD/MAY + definicje “fail‑start / fail‑closed”.  
- Sekcja “Non‑goals” (np. dynamic obstacle avoidance w FM, jeśli to ma być po stronie robota).  
- “Change log” zostawić, ale dodać **linki do sekcji** i krótki opis wpływu na implementację.

---

## 9. Jak zrobić, żeby była bardziej odporna na błędy

### 9.1 Determinizm geometrii (bardzo praktyczne)
Operacje geometrii 2D (union/intersection) są podatne na:
- różnice floating‑point,
- nieokreślony porządek wierzchołków,
- zależności od biblioteki.

Dla odporności:
- w Map Compiler wprowadzić **kwantyzację** punktów (np. do 1 mm) i canonical ordering,  
- trzymać OBB‑listy zamiast “dowolnych wielokątów” (mniej problemów numerycznych),
- w testach: snapshoty hashów artefaktów geometrii.

### 9.2 Fail‑closed w degradacji: rozszerzyć spec o “inflation ladder”
Już masz podejście fail‑closed, ale warto dopisać “drabinkę inflacji”:

- NORMAL: OBB‑sweep z realnymi marginesami,
- UNCERTAIN: zwiększ marginesy (poseMargin/trackingMargin) + dodatkowe cell’e,
- UNKNOWN: fallback dyskowy + duży “unknownExtraDistance”.

To jest proste, a zamyka dyskusje “co robimy gdy X”.

### 9.3 Sanity checks w runtime (MVP MUST)
- `occupied ⊆ granted` asercja runtime + natychmiast `SAFETY_STOP`,
- `conflictSet` symetryczny walidowany w start‑up,
- `dir token` nie może się flipować, jeśli holders non‑empty (asercja),
- “anti‑oscillation watchdog”: jeśli metryki przekroczone → log “OSCILLATION_ALERT” + w trybie serwisowym ogranicz throughput (np. większa histereza).

---

## 10. Jak zrobić, żeby jeszcze lepiej nadawała się do pracy z AI

- **Strukturyzować wymagania w danych**: oprócz tekstu, dodać `requirements.json5`:
  - `{ id: "S1", level: "MUST", text: "...", test: "golden/..." }`
- **Jednoznaczne payloady + walidator w CI**:  
  JSON5 examples są super dla ludzi; AI i CI skorzystają dodatkowo z:
  - TypeScript types (już częściowo są),
  - lub JSON Schema (nie musi być teraz, ale dobrze mieć plan).
- **Scenariusze jako dataset**: to już jest w spec, ale dodałbym:
  - “Scenario runner” z automatycznym sprawdzaniem inwariantów po każdym ticku,
  - eksport metryk (oscylacje, fairness) do pliku obok snapshotów.
- **A/B replay** jako standard: dwa algorytmy na tym samym logu → diff wyników (grants/holdPoint/reason codes). AI uwielbia takie “paired data”.

---

## 11. Proponowana lista zmian (krótka, egzekwowalna)

Jeśli miałbym to zamknąć w “PR checklist” do v0.4.1:

1) **Usunąć Minkowski jako default**: w runtime przenieść dysk do “fallback/unknown”, a MVP oprzeć o OBB‑sweep (zgodnie z Map Compiler).  
2) **Ujednolicić cellId** w 3 plikach + poprawić wszystkie przykłady JSON5.  
3) **Wprowadzić `corridorProgress`** i przepisać `hold_standoff` na corridorS.  
4) **Dodać kontrakt `LockSnapshot` + `RobotCapabilities`** (JSON5).  
5) **Doprecyzować yaw vs movestyle** w Map Compiler.  
6) **Naprawić stare nazwy** (PASS_THROUGH/STOP_TURN) oraz “v0.3” w nagłówku części 2.  
7) Dodać golden scenario „mijanie / bliskie krawędzie” jako test regresji geometrii.

---

**Koniec recenzji.**
