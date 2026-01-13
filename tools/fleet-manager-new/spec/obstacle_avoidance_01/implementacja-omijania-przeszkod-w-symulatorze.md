# Implementacja omijania przeszkód w *tym* symulatorze (robokit-robot-sim)

Poniżej opisuję **konkretnie**, jak zrobiłbym omijanie przeszkód w Twoim repo – bazując na tym, jak ten symulator już jest zbudowany.

Najważniejsze: w kodzie już masz bardzo sensowny “hak” na avoidance, więc zamiast doklejać nowy system, warto **dokończyć i wygładzić to, co już działa**.

---

## 1) Gdzie to się powinno dziać w Waszym kodzie

W `apps/robokit-robot-sim` symulacja ruchu idzie tak:

1) Tick silnika: `packages/robokit-sim-core/core/engine.js`
   - przed ruchem na segmencie woła:
     - `shouldBlockForObstacle(segment.polyline, task, segment)`
   - po decyzji o blokadzie / avoidance wyznacza pozycję na segmencie przez:
     - `segmentPoseAtDistance(segment, distance)`

2) Implementacja przeszkód jest w:
   - `packages/robokit-sim-core/core/obstacles.js`

3) A podpięcie jest w:
   - `apps/robokit-robot-sim/app/server.js`:
     ```js
     const obstacleManager = createObstacleManager(...);
     shouldBlockForObstacle = obstacleManager.shouldBlockForObstacle;
     segmentPoseAtDistance = obstacleManager.segmentPoseAtDistance;
     ```

**Wniosek:** jeśli chcemy “tymczasową trasę” omijania przeszkody, która:
- minimalnie zjeżdża z trasy,
- omija,
- wraca na trasę,
- nie rozjeżdża task progress,

to najlepsze miejsce to **`obstacles.js`** – dokładnie tak jak jest teraz.

---

## 2) Jaki algorytm wybrałbym tu konkretnie

### ✅ Wybrałbym: Frenet / “lateral offset in corridor” + gładki profil (C2)

I to praktycznie już masz:

- przeszkody są rzutowane na polylinię segmentu (`projectPointToPolyline`)
- liczysz **signed distance** przeszkody od osi segmentu
- budujesz “zakazane” zakresy offsetu i wybierasz offset o najmniejszej wartości bezwzględnej (czyli **minimalne zjechanie**)
- `segmentPoseAtDistance()` zwraca punkt segmentu odsunięty o `offset` wzdłuż normalnej

To jest super jako “symulatorowy avoidance”, bo:
- nie budujesz nowej globalnej ścieżki (A*, RRT…)
- nie musisz zmieniać `task.pathNodes`
- robot “jedzie dalej po segmencie”, tylko fizycznie odchylony w bok, a potem wraca

### Co bym poprawił: wygładzenie rampy do C2 (minimum jerk)
W tej chwili w `obstacles.js` rampowanie offsetu robi `smoothstep(t)=t²(3-2t)` – to jest OK, ale ma nieciągłą drugą pochodną na łączeniach (wyjdzie “delikatny szarp” krzywizny).

Do symulatora bardzo łatwo zrobić to “ładniej”:
- użyć quintic smoothstep (minimum jerk):  
  `h(u) = 6u^5 - 15u^4 + 10u^3`
- wtedy masz:
  - `h'(0)=h'(1)=0`
  - `h''(0)=h''(1)=0`  
  czyli manewr wygląda jak gładka zmiana pasa.

To daje efekt zbliżony do “dwóch Bézierów” w praktyce (gładkie wejście i wyjście), bez komplikowania modelu.

---

## 3) Minimalny patch: zmiana smoothstep na quintic (C2)

Plik: `packages/robokit-sim-core/core/obstacles.js`

Znajdź funkcję:

```js
function smoothstep(t) {
  const clamped = clamp(t, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}
```

Zamień na:

```js
function smoothstep5(t) {
  const u = clamp(t, 0, 1);
  // 6u^5 - 15u^4 + 10u^3 (minimum jerk / C2 smoothstep)
  return u * u * u * (u * (u * 6 - 15) + 10);
}
```

Następnie w `avoidOffsetAtS()` zamień wywołania `smoothstep(...)` na `smoothstep5(...)`.

To jest praktycznie cała zmiana, a wizualnie daje dużo.

---

## 4) Tuning: jak dobrać długość rampy, żeby było “łagodnie”

W `buildAvoidPlan()` masz:

```js
const ramp = clamp(maxRequired * 0.6, 0.4, 1.2);
```

To jest całkiem sensowne. Ja bym rozważył dwa ulepszenia (bez rozbudowy plików):

1) Rampa zależna też od **|offset|**:
   - im większy boczny manewr, tym dłuższa rampa
   - np.:
     ```js
     const ramp = clamp(maxRequired * 0.6 + Math.abs(offset) * 0.4, 0.5, 2.0);
     ```

2) Opcjonalny override z ENV (łatwe testowanie):
   - `OBSTACLE_AVOID_RAMP_MIN_M`, `OBSTACLE_AVOID_RAMP_MAX_M`, `OBSTACLE_AVOID_RAMP_FACTOR`
   - ale to już “nice to have”.

---

## 5) Warunek, żeby avoidance zadziałało: segment musi mieć “corridorWidth”

W Waszym kodzie avoidance “lateral offset” działa tylko jeśli segment ma dodatnią szerokość korytarza:

- `packages/robokit-sim-core/core/task.js`:
  - `corridorWidth` bierze z `edge.width`
- `packages/robokit-sim-core/core/navigation.js`:
  - `edge.width` bierze z `edge.props.width` w mapie

**Czyli:** jeśli w mapie nie ustawisz `props.width` na krawędziach, to `corridorWidth=0` i avoidance plan nie powstanie → robot będzie się blokował.

Do symulatora: ustaw np. `width: 2.0` (metry) na liniach, na których ma być “miejsce na objazd”.

---

## 6) Jak to odpalić i przetestować w symulatorze

Symulator ma HTTP stub na porcie domyślnym `8088` (`apps/robokit-robot-sim/app/adapter_http.js`).

Dodanie przeszkody:

```bash
curl -X POST http://127.0.0.1:8088/sim/obstacles \
  -H "Content-Type: application/json" \
  -d '{"x": 5.2, "y": 1.7, "radius": 0.8, "mode": "avoid"}'
```

Lista przeszkód:

```bash
curl http://127.0.0.1:8088/sim/obstacles
```

Czyszczenie:

```bash
curl -X POST http://127.0.0.1:8088/sim/obstacles/clear
```

`mode`:
- `"avoid"` – próbuje ominąć (jeśli corridorWidth > 0 i plan się da zbudować)
- `"block"` – zawsze blokuje

---

## 7) Dlaczego nie robiłbym tu “dwóch Bézierów” jako osobnego scriptPath (w tej wersji)

Da się zrobić objazd jako 2 Béziery i odpalić `robot.scriptPath`, ale w Waszej architekturze to wprowadza nowe problemy:

- `task.segmentProgress` nadal rośnie wzdłuż segmentu, a scriptPath jest „obok” – trzeba mapować postęp i synchronizować
- albo trzeba “oszukać” segmentProgress (ustawić od razu na s1), co psuje telemetrię postępu w UI
- dochodzą edge-case’y: co jeśli w trakcie objazdu pojawi się druga przeszkoda?

Natomiast obecny model (offset plan w `segmentPoseAtDistance`) jest:
- prostszy,
- stabilniejszy,
- i działa “wprost” z `engine.js` bez specjalnych trybów.

Jeśli kiedyś zechcesz “Bézier detour” dla wyglądu – wtedy robiłbym to jako **wariant** w `segmentPoseAtDistance` (prekomputowana polylinia detour), a nie jako odrębny scriptPath.

---

## 8) Szybkie “bonusy” (mało kodu, duży efekt)

1) **Histereza**: gdy plan już istnieje, trzymaj go dopóki przeszkoda nie zniknie lub offset nie przestanie być możliwy (masz już częściowo przez `preferredOffset`).
2) **Diag log**: loguj kiedy plan się zmienia:
   - obstacle ids
   - offset
   - s0/s1/r0/r1
3) **Fallback**: jeśli brak corridorWidth albo brak możliwego offsetu:
   - dla `mode=avoid` można spróbować globalnego reroute (już macie `findPathAvoidingObstacles`), albo po prostu blokować (symulatorowo ok).

---

### TL;DR
W Waszym symulatorze **najprościej i najlepiej** jest wdrożyć avoidance jako **lateral offset w korytarzu** w `packages/robokit-sim-core/core/obstacles.js`, bo to już jest wpięte w tick ruchu. Ja bym tylko:
- zamienił smoothstep na `smoothstep5` (C2),
- ewentualnie delikatnie dostroił rampę,
- dopilnował `edge.props.width` w mapie.

Koniec dokumentu.
