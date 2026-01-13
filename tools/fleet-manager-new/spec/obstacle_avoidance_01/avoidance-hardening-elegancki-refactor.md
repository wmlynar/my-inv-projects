# Omijanie przeszkód – “hardening” + elegancki refactor (konkretny kod dla Waszego symulatora)

Ten dokument daje Ci **konkretny plan i konkretne fragmenty kodu** do wklejenia w repo, żeby avoidance było:

- **niezawodne** (brak teleportów, brak jitteru, mniej fałszywych blokad),
- **eleganckie** (czytelne, testowalne, mało “if-ów w if-ach”),
- nadal **proste** (bez A*/RRT, bez miliona plików).

Zakładam, że zostajemy przy Twoim obecnym, sensownym podejściu:
> **lokalne omijanie jako boczny offset w korytarzu segmentu** (`segmentPoseAtDistance()` + `segment.avoidPlan`).

---

## 0) Co dziś jest głównym źródłem “nieniezawodności”

W `packages/robokit-sim-core/core/obstacles.js` w gałęzi `shouldBlockForObstacle(..., segment)` masz dwa problemy:

1) **Teleport / skok toru**: gdy `avoidObstacles` nagle zniknie (np. przeszkoda usunięta), kod ustawia `segment.avoidPlan = null` natychmiast. W następnym ticku robot wraca “na środek trasy” bez rampy → wizualny skok.

2) **Jitter planu**: plan potrafi być przebudowywany często, a wybór offsetu bywa na granicy allowed-range (bez marginesu), co przy dyskretnym ticku i zakrętach może dawać “czasem zahaczy / czasem blokuje”.

---

## 1) Niezawodność: 5 zmian, które robią największą robotę

### 1.1. Plan jest “sticky” do końca (`r1`)
**Zasada:** jeśli avoidance plan już istnieje, to nie kasujemy go, dopóki robot nie dojedzie do `plan.r1`.

To usuwa teleporty i miganie.

### 1.2. Plan przebudowujemy tylko, gdy stał się niebezpieczny
Jeśli obecny offset nadal mieści się w allowed-range i przechodzi szybki collision-check → trzymamy plan.

### 1.3. Margines od krawędzi allowed-range (`eps`)
Zamiast jechać “po samej granicy”, wybieramy offset **wewnątrz** zakresu (np. 2–8 cm).  
To daje odporność na zaokrąglenia i próbkowanie.

### 1.4. Twardy collision-check po zbudowaniu planu (próbkowanie)
Po wygenerowaniu planu próbkujemy detour wzdłuż `[r0, r1]` i sprawdzamy dystans do przeszkód.  
Jeśli fail → próbujemy innego kandydata offsetu, a na końcu blokujemy.

### 1.5. Gładsza rampa (C2): `smoothstep5`
Zamiana obecnego smoothstep (cubic) na quintic “minimum jerk” daje łagodniejszy manewr i mniej “szarpnięć”.

---

## 2) Elegancja: prosty “pipeline” zamiast logiki rozsmarowanej po `shouldBlockForObstacle`

Chcemy, żeby gałąź segmentowa robiła:

1) wyczyść wygasły plan  
2) sprawdź `mode=block` → natychmiast blokuj  
3) jeśli jest plan aktywny i nadal bezpieczny → jedź  
4) jeśli są `mode=avoid` przeszkody → spróbuj zbudować nowy plan  
5) jak się nie da → blokuj

To jest czytelne i łatwe do testowania.

---

# 3) Konkretne zmiany w kodzie (do wklejenia)

Plik: **`packages/robokit-sim-core/core/obstacles.js`**

Poniżej masz fragmenty kodu w formie “patchy”. W większości to **doklejone helpery** i **podmieniona część gałęzi `segment`**.

---

## 3.1. Patch A — smoothstep5 + stałe do marginesu i próbkowania

Wstaw w okolicy obecnego `smoothstep()` (albo zastąp funkcję):

```js
  const clearance = Number.isFinite(OBSTACLE_CLEARANCE_M) ? OBSTACLE_CLEARANCE_M : 0.2;
  // Margines od krawędzi allowed-range (2–8 cm). To jest “tani” stabilizator.
  const AVOID_EDGE_EPS_M = clamp(clearance * 0.25, 0.02, 0.08);

  // Ile próbek robimy w collision-checku (im mniej, tym szybciej).
  const AVOID_SAMPLE_STEP_M = 0.15;
  const AVOID_MAX_SAMPLES = 64;

  function smoothstep5(t) {
    const u = clamp(t, 0, 1);
    // 6u^5 - 15u^4 + 10u^3  (C2 / minimum-jerk)
    return u * u * u * (u * (u * 6 - 15) + 10);
  }
```

A potem w `avoidOffsetAtS()` zamień `smoothstep(...)` na `smoothstep5(...)`:

```diff
-      return plan.offset * smoothstep((s - plan.r0) / denom);
+      return plan.offset * smoothstep5((s - plan.r0) / denom);

...
-    return plan.offset * smoothstep((plan.r1 - s) / denom);
+    return plan.offset * smoothstep5((plan.r1 - s) / denom);
```

---

## 3.2. Patch B — helpery: “czy offset dozwolony”, kandydaci, collision-check

Dodaj poniższe funkcje (np. pod `buildAllowedOffsetRanges` / `chooseOffsetFromRanges`):

```js
  function isOffsetAllowed(offset, ranges, eps = 0) {
    if (!Number.isFinite(offset) || !ranges || !ranges.length) {
      return false;
    }
    for (const [start, end] of ranges) {
      // Jeżeli zakres jest bardzo mały, nie “wycinamy” eps z obu stron.
      const width = end - start;
      if (width <= 0) continue;
      if (width < 2 * eps) {
        if (offset >= start && offset <= end) return true;
        continue;
      }
      if (offset >= start + eps && offset <= end - eps) {
        return true;
      }
    }
    return false;
  }

  function candidateOffsetsFromRanges(ranges, preferred, eps) {
    const candidates = [];
    if (Number.isFinite(preferred)) {
      candidates.push(preferred);
    }
    for (const [start, end] of ranges) {
      if (start <= 0 && end >= 0) {
        candidates.push(0);
      }
      candidates.push(start + eps);
      candidates.push(end - eps);
    }
    // filtr: zostaw tylko te, które faktycznie leżą w allowed ranges (bez eps)
    const filtered = [];
    for (const c of candidates) {
      if (isOffsetAllowed(c, ranges, 0)) {
        filtered.push(c);
      }
    }
    // dedupe (na mm)
    const seen = new Set();
    const unique = [];
    for (const c of filtered) {
      const key = Math.round(c * 1000);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(c);
    }
    // sort: minimalne zjechanie z trasy
    unique.sort((a, b) => Math.abs(a) - Math.abs(b));
    return unique;
  }

  function isAvoidPlanCollisionFree(segment, plan, obstacles, extraMargin = 0) {
    if (!segment || !segment.polyline || !plan || !obstacles || !obstacles.length) {
      return true;
    }
    const start = plan.r0;
    const end = plan.r1;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return false;
    }

    const span = end - start;
    const steps = clamp(Math.ceil(span / AVOID_SAMPLE_STEP_M), 12, AVOID_MAX_SAMPLES);

    for (let i = 0; i <= steps; i += 1) {
      const s = start + (span * i) / steps;
      const base = polylineAtDistance(segment.polyline, s);
      const offset = avoidOffsetAtS(plan, s);
      if (offset === 0) {
        continue;
      }
      const normal = { x: -Math.sin(base.heading), y: Math.cos(base.heading) };
      const px = base.x + normal.x * offset;
      const py = base.y + normal.y * offset;

      for (const info of obstacles) {
        const required = (Number.isFinite(info.required) ? info.required : 0) + extraMargin;
        const d = Math.hypot(px - info.obstacle.x, py - info.obstacle.y);
        if (d < required) {
          return false;
        }
      }
    }
    return true;
  }
```

---

## 3.3. Patch C — ulepszony `buildAvoidPlan()` (kandydaci + collision-check + lepsza rampa)

Zastąp treść funkcji `buildAvoidPlan(segment, obstacles, preferredOffset)` poniższą wersją:

```js
  function buildAvoidPlan(segment, obstacles, preferredOffset) {
    if (!segment || !segment.polyline || !obstacles || obstacles.length === 0) {
      return null;
    }
    const corridorWidth = Number.isFinite(segment.corridorWidth) ? segment.corridorWidth : 0;
    if (corridorWidth <= 0) {
      return null;
    }
    const maxOffset = corridorWidth / 2 - ROBOT_RADIUS_M - OBSTACLE_CLEARANCE_M;
    if (maxOffset <= 0) {
      return null;
    }

    const allowed = buildAllowedOffsetRanges(obstacles, maxOffset);
    if (!allowed.length) {
      return null;
    }

    const candidates = candidateOffsetsFromRanges(allowed, preferredOffset, AVOID_EDGE_EPS_M);
    if (!candidates.length) {
      return null;
    }

    // helper lokalny: buduje “geometrię” planu dla konkretnego offsetu
    function buildPlanForOffset(offset) {
      let s0 = Number.POSITIVE_INFINITY;
      let s1 = Number.NEGATIVE_INFINITY;
      let maxRequired = 0;

      for (const info of obstacles) {
        const buffer = info.required + OBSTACLE_CLEARANCE_M;
        s0 = Math.min(s0, info.projection.s - buffer);
        s1 = Math.max(s1, info.projection.s + buffer);
        if (info.required > maxRequired) {
          maxRequired = info.required;
        }
      }
      if (!Number.isFinite(s0) || !Number.isFinite(s1) || s0 > s1) {
        return null;
      }

      const totalLength = segment.polyline.totalLength;
      s0 = clamp(s0, 0, totalLength);
      s1 = clamp(s1, 0, totalLength);

      // rampa zależna też od wielkości offsetu (łagodniejsze skręty przy dużych objazdach)
      const ramp = clamp(maxRequired * 0.6 + Math.abs(offset) * 0.35, 0.5, 2.0);
      const r0 = clamp(s0 - ramp, 0, s0);
      const r1 = clamp(s1 + ramp, s1, totalLength);

      return {
        obstacleIds: obstacles.map((info) => info.obstacle.id),
        offset,
        s0,
        s1,
        r0,
        r1
      };
    }

    // wybieramy pierwszy kandydat, który przechodzi collision-check
    for (const offset of candidates) {
      const plan = buildPlanForOffset(offset);
      if (!plan) continue;

      if (isAvoidPlanCollisionFree(segment, plan, obstacles, AVOID_EDGE_EPS_M)) {
        return plan;
      }
    }

    return null;
  }
```

Co to daje?
- jeśli “najbliższy 0” kandydat jest ryzykowny (np. zakręt), plan wypadnie w collision-check i automatycznie spróbuje kolejnego offsetu,
- offset jest odsunięty od krawędzi zakresu,
- rampa jest dłuższa przy dużych objazdach.

---

## 3.4. Patch D — elegancki i niezawodny “segment branch” w `shouldBlockForObstacle`

W funkcji `shouldBlockForObstacle(polyline, task, segment)` podmień gałąź `if (segment) { ... }` na poniższą.

To jest ta część, która:
- usuwa teleporty,
- robi stickiness planu,
- minimalizuje przebudowy,
- zachowuje obecne zachowania block/manual.

```js
  function shouldBlockForObstacle(polyline, task, segment) {
    if (segment) {
      const corridorWidth = Number.isFinite(segment.corridorWidth) ? segment.corridorWidth : 0;
      const maxOffset =
        corridorWidth > 0 ? corridorWidth / 2 - ROBOT_RADIUS_M - OBSTACLE_CLEARANCE_M : 0;

      const progress = task && Number.isFinite(task.segmentProgress) ? task.segmentProgress : 0;

      // 0) jeżeli plan się zakończył, czyścimy go
      if (segment.avoidPlan && Number.isFinite(progress) && progress >= segment.avoidPlan.r1) {
        segment.avoidPlan = null;
      }

      // 1) przeszkody BLOCK zawsze wygrywają
      const blockingObstacles = collectSegmentObstacles(segment, progress, maxOffset, 'block');
      if (blockingObstacles.length) {
        segment.avoidPlan = null;
        const blockObstacle = blockingObstacles[0].obstacle;
        setRobotBlockedState(true, {
          reason: BLOCK_REASON_OBSTACLE,
          id: blockObstacle.id,
          x: blockObstacle.x,
          y: blockObstacle.y
        });
        return blockObstacle;
      }

      // 2) przeszkody AVOID – spróbuj utrzymać istniejący plan
      const avoidObstacles = collectSegmentObstacles(segment, progress, maxOffset, 'avoid');

      if (segment.avoidPlan && Number.isFinite(progress) && progress < segment.avoidPlan.r1) {
        // jeśli przeszkody “zniknęły” w tym ticku – trzymamy plan do końca, żeby nie teleportować
        if (!avoidObstacles.length) {
          if (
            robot.blocked &&
            robot.blockReason === BLOCK_REASON_OBSTACLE &&
            !robot.blockedForced
          ) {
            setRobotBlockedState(false);
          }
          return null;
        }

        // sprawdź, czy offset nadal jest dozwolony i bezkolizyjny
        if (corridorWidth > 0 && maxOffset > 0) {
          const allowed = buildAllowedOffsetRanges(avoidObstacles, maxOffset);
          const stillAllowed = isOffsetAllowed(segment.avoidPlan.offset, allowed, AVOID_EDGE_EPS_M);
          const stillSafe = stillAllowed
            ? isAvoidPlanCollisionFree(segment, segment.avoidPlan, avoidObstacles, AVOID_EDGE_EPS_M)
            : false;

          if (stillSafe) {
            if (
              robot.blocked &&
              robot.blockReason === BLOCK_REASON_OBSTACLE &&
              !robot.blockedForced
            ) {
              setRobotBlockedState(false);
            }
            return null;
          }
          // jeśli niebezpieczny – spróbujemy przebudować plan poniżej
        }
      }

      // 3) zbuduj nowy plan, jeśli to możliwe
      if (avoidObstacles.length && corridorWidth > 0) {
        const preferredOffset = segment.avoidPlan ? segment.avoidPlan.offset : null;
        const plan = buildAvoidPlan(segment, avoidObstacles, preferredOffset);
        if (plan) {
          segment.avoidPlan = plan;
          if (
            robot.blocked &&
            robot.blockReason === BLOCK_REASON_OBSTACLE &&
            !robot.blockedForced
          ) {
            setRobotBlockedState(false);
          }
          return null;
        }
      }

      // 4) opcjonalny fallback: jeśli robot jest przy węźle (CURRENT_POINT_DIST), spróbuj reroute
      // (tryAvoidObstacle samo sprawdzi odległość do currentStation)
      if (avoidObstacles.length && task && tryAvoidObstacle(task)) {
        if (
          robot.blocked &&
          robot.blockReason === BLOCK_REASON_OBSTACLE &&
          !robot.blockedForced
        ) {
          setRobotBlockedState(false);
        }
        return null;
      }

      // 5) nie da się ominąć → blokuj na najbliższej przeszkodzie AVOID
      if (!avoidObstacles.length) {
        if (
          robot.blocked &&
          robot.blockReason === BLOCK_REASON_OBSTACLE &&
          !robot.blockedForced
        ) {
          setRobotBlockedState(false);
        }
        return null;
      }

      const blockObstacle = avoidObstacles[0].obstacle;
      setRobotBlockedState(true, {
        reason: BLOCK_REASON_OBSTACLE,
        id: blockObstacle.id,
        x: blockObstacle.x,
        y: blockObstacle.y
      });
      return blockObstacle;
    }

    // ... reszta funkcji (bez segment) zostaje bez zmian ...
```

---

# 4) Dlaczego to jest “bardziej eleganckie”
- Masz wyraźne etapy (clean → block → keep → rebuild → fallback → block).
- “Zasady” (allowed/eps/collision-check) są zamknięte w małych helperach.
- Nie rośnie liczba plików: wszystko jest w jednym `obstacles.js`, ale czytelniej.

---

# 5) Dodatkowe, małe usprawnienia (opcjonalne, ale bardzo praktyczne)

### 5.1. Sortowanie przeszkód po “ahead distance” zamiast po euklidesie
W `collectSegmentObstacles()` zamiast sortować po `distToRobot`, możesz sortować po:
- `ahead = projection.s - progress` (preferuj to, co faktycznie jest *przed* na ścieżce)

To poprawia zachowanie na zakrętach (przeszkoda “blisko w powietrzu”, ale daleko po torze).

### 5.2. Log zdarzeń avoidance (debuggability)
Warto dodać *opcjonalny* logger:
- `deps.diagLog?.({type:'avoid_plan_created', ...})`
- to świetnie przyspiesza diagnozowanie.

---

## 6) Minimalny test manualny
1) ustaw w mapie `edge.props.width` (np. 2.0) na odcinkach, gdzie ma być objazd  
2) uruchom symulator  
3) wstaw przeszkodę `mode:"avoid"` blisko ścieżki  
4) sprawdź, że:
   - robot robi łagodny objazd
   - gdy przeszkoda zniknie, robot **nie teleporuje** do osi (dokończy plan)
   - plan nie “miga” co tick

---

Koniec dokumentu.
