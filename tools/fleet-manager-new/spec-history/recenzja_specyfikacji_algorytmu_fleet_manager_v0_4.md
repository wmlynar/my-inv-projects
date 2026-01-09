# Recenzja specyfikacji algorytmu Fleet Manager — v0.4 (3 pliki)

**Data:** 2026-01-06  
**Recenzowane pliki (v0.4):**
- `specyfikacja-algorytm-kontrakty-i-akceptacja-v0_4.md`
- `specyfikacja-algorytm-runtime-harmonogramowanie-ruch-v0_4.md`
- `specyfikacja-algorytm-map-compiler-v0_4.md`

---

## Prompt, który spowodował wygenerowanie tej recenzji

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

koniecnie dorzuc swoje wnioski z poprzedniej odpowiedzi

WAZNE: obwiednia zajętości na fragmencie trasy nie powinna byc suma Minkowskiego, bo to uniemozliwi mijanie wozko w wazkich korytarzach - niech bedzie to robione za pomoca dokładniejszego model prostokątnego, czyli wezszy na prostych a zarzucajacy tylem na zakretach. sklladany z prostokatow. alle moze masz inny pomysl

prosze przeslij swoja recenzje wedlug powyzszych punktow. i przeslij link do pliku .md do pobrania tej recenzji. zalacz tez prompt, ktory spowodowal wygenerowanie do tej recenzji
```

---

## 0) Executive summary (co jest już bardzo dobre)

v0.4 jest zauważalnie dojrzalsza od v0.3: masz spójny trzon DCL‑2D, twarde *Assumptions→Guarantees*, „one‑pager” z parametrami, deterministyczny tick, lifecycle locków (`occupied/granted/released`), anti‑oscillation oraz dopięcie integracji: `.smap`/`DegenerateBezier` i RTP jako `LocationMark|ActionPoint`.

Największy „killer” do poprawy to **niezgodność między runtime a Map Compiler w temacie obwiedni**: runtime wciąż opisuje MVP jako dysk/Minkowski, a Map Compiler opisuje sampling prostokątów i `sweptPolygon`. To jest jednocześnie:
- błąd merytoryczny (dwie różne definicje bezpieczeństwa),
- i dokładnie miejsce, które wskazałeś jako krytyczne („nie Minkowski”).

Reszta rzeczy to głównie doprecyzowania kontraktów i „domykanie” brakujących algorytmów tak, żeby implementator nie musiał nic zgadywać.

---

## 1) Co jeszcze bym poprawił

### 1.1 Spójność między 3 plikami (najwyższy priorytet)
1) **Ujednolicić definicję obwiedni w MVP**  
   - runtime §6.4.1: usuń opis „dysk + Minkowski” jako MVP, bo jest sprzeczny z Map Compiler §7.5 i Twoim wymaganiem.  
   - MVP powinno jednoznacznie mówić: *„cells mają swept shape wynikający z próbkowania footprintu prostokątnego po krzywej”*.

2) **Naprawić drobne „artefakty wersji”**  
   - w `specyfikacja-algorytm-kontrakty-i-akceptacja-v0_4.md` wciąż pojawia się nagłówek „Część 2 — Specyfikacja (v0.3)”. To powinno być v0.4 (albo neutralnie: „Część 2 — Specyfikacja”).  
   - podobnie: sprawdź, czy nie ma jeszcze pojedynczych odwołań do nazw z v0.3 (`NODE_TURN` vs `NODE_STOP_ZONE`, `transitionKind` vs `transitionGeomKind`) — najlepiej usuń stare nazwy z rdzenia i zostaw je wyłącznie w sekcji „deprecated”.

3) **Nazewnictwo parametrów: jedno miejsce prawdy + 0 duplikatów**  
   W praktyce w dokumentach „telemetryRateMin/telemetryHzMin”, „tickPeriod/tickMs” mogą się rozjechać. Zalecenie:
   - trzymaj *jeden canonical zestaw nazw* (one‑pager),
   - w pozostałych sekcjach odwołuj się wyłącznie do tych nazw (bez „aliasów”).

### 1.2 Dopisać brakujące elementy „implementowalności”
1) **Algorytm wyznaczania `occupied(R)` musi być opisany 1:1**  
   Jest lifecycle, są inwarianty, jest release — ale brakuje jednego twardego przepisu:
   - jak z `(routeS, yaw, leadClear, trailExt, poseMargin, trackingMargin)` wyznaczasz zestaw komórek „na teraz”.  
   Bez tego implementacje będą różne → rozjazd bezpieczeństwa i testów.

2) **Konkretny mechanizm egzekwowania `stopStandoff`**  
   W v0.4 świetnie rozdzieliłeś `safety*` vs `stopStandoff`, ale musisz dodać:
   - gdzie dokładnie `stopStandoff` jest „aplikowany” w logice (np. w `occupied` jako „wydłużenie w lead”, albo w hold‑point jako dodatkowe cięcie względem lidera).  
   To jest must-have dla scenariusza leader/follower.

3) **Kontrakt FM↔Gateway dla `stopLineRouteS` wymaga doprecyzowania odpowiedzialności**  
   W dokumentach pojawia się wymóg, że Gateway „MUST dopilnować, aby robot nie przekroczył stopLineRouteS”.  
   Żeby to było wykonalne, Gateway musi mieć *jak* to mierzyć:
   - albo dostaje `routeId + CompiledMap` i sam liczy `routeS` z telemetrii,
   - albo Fleet Manager bierze tę odpowiedzialność (Gateway tylko forwarduje komendy STOP/PAUSE, a FM wysyła je w odpowiednim momencie).  
   Na MVP polecałbym: **FM jest źródłem prawdy o `routeS` i egzekwuje stop‑line**, a Gateway robi watchdog + emergency stop w przypadku braku komend (fail‑closed).

### 1.3 Anti-oscillation: dopiąć „nie tylko locki, ale i target”
Masz już metryki oscylacji (GO/HOLD, jitter holdpoint, flip dir). Dodałbym jeszcze:
- metrykę `rtpTargetJitter(windowMs)` oraz
- normatywny limit (np. p95 zmiany targetu ≤ `maxTargetAdvancePerTick`, p95 cofnięcia targetu ~0 poza fail-closed).  
I co ważniejsze: *konkretne reguły histerezy* dla targetu (część jest, ale warto zebrać w 1 miejscu jako MUST).

---

## 2) Co jeszcze bym dodał

### 2.1 Zestaw „golden scenarios” rozszerzony o geometrię 2D i „mijanki”
Masz dobre minimum. Dodałbym jeszcze 4 scenariusze (bo dotykają najdroższych bugów):

9) **Wąskie równoległe krawędzie (blisko siebie) + zakręt**  
   Dwa roboty jadą po różnych krawędziach, które na zakręcie zbliżają się do siebie bardziej niż na prostej. Oczekiwane: conflictSet blokuje *tylko* w miejscu realnego zbliżenia, nie „po całości”.

10) **„Mijanie” na odcinku, który powinien przepuszczać**  
   To jest dokładnie test przeciwko nadmiernie konserwatywnej obwiedni.  
   Oczekiwane: dla prostych segmentów swept shape nie blokuje równoległego ruchu jeśli geometria faktycznie na to pozwala.

11) **RTP marks sparse**  
   Na trasie jest duża luka w LocationMark (większa niż `rtpLookahead`). Oczekiwane: system przechodzi w tryb „wymuszaj stop-line przez STOP/PAUSE” *albo* scena jest odrzucona przez walidator (jeśli uznasz marks jako requirement mapy).

12) **ActionPoint „forkheight” + traffic hold**  
   Robot jedzie do ActionPoint, dostaje HOLD tuż przed, potem GO, dojeżdża, zatrzymuje się, wykonuje fork, wraca do GO. Oczekiwane: `NODE_STOP_ZONE` jest wymagane podczas akcji i nie ma konfliktu z innymi.

### 2.2 „Proof sketch” (krótki szkic dowodu) — super pomocny dla ludzi i AI
Dopisanie 10–15 linijek, które jasno mówią:
- jakie są założenia,
- jakie kroki algorytmu gwarantują brak kolizji,
- i gdzie są „jedyny możliwe dziury” (telemetria stale, pose jump) oraz jak fail‑closed je łata.

To dramatycznie ułatwia:
- testy property-based (wiadomo, co jest inwariantem),
- code review,
- pracę z AI (model nie będzie „fantazjował” poza założeniami).

### 2.3 Konkrety walidatora sceny i kodów błędów
Masz walidacje opisane, ale przyda się normatywna lista:
- `E_MAP_MISSING_NODE_REF`, `E_MAP_NON_MANIFOLD_CORRIDOR`, `E_MAP_NO_MARKS_DENSITY`, ...  
To robi różnicę w „production readiness” i w debugowaniu w terenie.

---

## 3) Jakie błędy widzę (konkretne)

1) **Sprzeczność w MVP obwiedni (Minkowski vs sweptPolygon)**  
   - runtime opisuje dysk/Minkowski jako MVP,  
   - Map Compiler opisuje sampling prostokątów i `sweptPolygon` jako MVP.  
   To trzeba rozstrzygnąć na 100% w jedną stronę.

2) **Błąd wersji w nagłówkach**  
   - `Część 2 — Specyfikacja (v0.3)` w pliku v0.4 jest mylące i grozi kopiowaniem złych sekcji.

3) **Niedomknięta odpowiedzialność za `stopLineRouteS`**  
   Wymóg „Gateway MUST dopilnować stop‑line” jest obecny, ale brakuje warunków wykonalności (jak Gateway zna postęp). To grozi implementacją „na czuja” albo przerzucaniem winy między modułami.

4) **Brak definicji formatu `sweptPolygon` w sensie „geometry contract”**  
   Jest lista punktów, ale brakuje minimalnych reguł:
   - czy wielokąt jest domknięty/otwarty,
   - CW/CCW,
   - czy może być wklęsły,
   - czy dopuszczamy self-intersections,
   - co to znaczy `intersects` (touching? epsilon?).
   To jest ważne, bo od tego zależy konfliktSet.

---

## 4) Co bym ulepszył (żeby implementacja była prostsza i mniej ryzykowna)

### 4.1 “Single source of truth” dla geometrii obwiedni
Zrób jedną sekcję (np. w Map Compiler), która definiuje:
- *jaki kształt jest generowany* (`sweptShape`),
- *jak jest testowana kolizja* (`overlap(shapeA, shapeB)`),
- i *jak z tego powstaje conflictSet*.  
A runtime niech już tylko konsumuje conflictSet.

### 4.2 Reprezentacja obwiedni: nie polygon wypukły, tylko „składane prostokąty”
Jeśli zrobisz „aproksymację wypukłą”, wrócisz do problemu nadmiernej konserwatywności (tylko inną drogą).  
Lepsza opcja MVP, która jest nadal prosta:

- `sweptShape.kind = "multiRect"`
- `rects[]` to lista OBB (oriented bounding box): `{cx, cy, yaw, halfL, halfW}`
- `bbox` jako AABB do szybkiego indeksowania.

KonfliktSet: dwa cells konfliktują, jeśli **jakikolwiek** prostokąt z listy A przecina **jakikolwiek** prostokąt z listy B (dla N~10–30 to nadal OK offline).

### 4.3 Wyraźne granice „korytarz logiczny” vs „krawędź mapy”
Bardzo dobry kierunek z `corridorId`. Dopisz tylko twardo:
- czy `corridorId` jest single-lane zawsze, czy ma flagę `singleLane`,
- czy `width` mapy ma wpływ na `singleLane`,
- i jak wykrywasz „passingPlace”.

---

## 5) Jak bym zrobił, żeby było jeszcze bardziej future-proof

1) **Wersjonowanie artefaktów `CompiledMap` i kontraktów**  
   - `compiledMapVersion`, `contractVersion`, `mapFormatVersion`  
   - narzędzie migracji (nawet jeśli na start to tylko „fail if mismatch”).

2) **Capability negotiation dla robota**  
   Skoro target jest markiem/ActionPointem, dodaj jawne capabilities:
   - `supportsGoTarget`, `supportsPauseResume`, `supportsStop`, `supportsForkHeight`, `supportsStationTelemetry`, ...  
   Wtedy FM może zrobić sensowny degrade (np. jeśli brak `supportsPause`, to tylko STOP/GO).

3) **Przygotowane miejsce na „spatio‑temporal”**  
   Bez implementacji, ale z interfejsem:
   - w przyszłości `CELL` może mieć okna czasowe, a `grant` może być `(cellId, t0, t1)`.  
   Dziś trzymaj to jako „future extension point”, nie jako „pomysł w tekście”.

---

## 6) Jak bym zrobił, żeby była lepszej jakości

- Dodać **ID wymagania** przy każdym MUST (np. `S1`, `L2`, `D3`, `C1` — już masz, ale warto konsekwentniej).  
- Dodać mini‑sekcje „Expected output” tam, gdzie jest pseudokod (np. Map Compiler: dokładnie jakie pola muszą powstać).  
- Zrobić na początku każdego pliku 5–10 linijek „scope + non-goals” (żeby czytelnik nie musiał skakać między plikami).

---

## 7) Jak bym zrobił, żeby była bardziej profesjonalna

- Spis treści + stałe numerowanie sekcji (łatwiej robić review).  
- „Definition of Done (MVP)” jako checklista *na końcu* każdego pliku (masz checklisty — utrzymaj, ale lokalnie do pliku).  
- Jednoznaczne „Error handling contract” (kody, poziomy, logowanie).  
- Ujednolicony styl JSON5:
  - komentarz przy każdym polu: znaczenie + jednostki,
  - przykłady request/response w parach.

---

## 8) Jak bym zrobił, żeby była bardziej odporna na wszelkiego typu błędy

1) **Twardy protokół „comm gap” (przerwa w komunikacji)**  
   Jest fail‑closed, ale dodaj:
   - kto wydaje STOP (FM vs Gateway vs robot),
   - jak wracamy (re-sync window, replan, re-grant),
   - jak unikamy „ghost commands” (stare `seq`).

2) **Pose jump/off-route: dopisać „no surprise unlock”**  
   Masz zamrożenie, ale dopisz jawnie:
   - w trybie `SAFETY_STOP` nie zwalniamy żadnych zasobów, które *mogą* być jeszcze zajęte, dopóki nie ma stabilnego dopasowania.

3) **Twarde limity pamięci/logowania**  
   Masz tryb `LOGGING_DEGRADED` — dopisz jeszcze:
   - minimalna retencja ring‑buffera (np. ostatnie 30–120 s),
   - i obowiązkowy „dump snapshot on incident”.

---

## 9) Jak byśmy zrobili, żeby jeszcze lepiej nadawała się do pracy z AI

- Każde MUST ma:
  1) **test** (unit/integration/scenario),
  2) **fixture** (JSON5),
  3) **invariant checker** (np. `assertNoConflicts()`).

- Utrzymać repo‑strukturę „spec jako dane”:
  - `spec/fixtures/scenarios/*.json5`
  - `spec/fixtures/maps/*.smap` (lub `graph.json` jako debug)
  - `spec/fixtures/compiledMaps/*.json`
  - `spec/fixtures/replays/*.jsonl`

- Dodać „lint spec”:
  - sprawdza, że nie ma dwóch nazw tego samego parametru,
  - sprawdza, że każdy MUST ma ID,
  - sprawdza, że każdy kontrakt JSON5 ma komentarze jednostek.

---

## 10) WAZNE: obwiednia bez sumy Minkowskiego — rekomendacja do v0.5 (i poprawka v0.4)

### 10.1 Co zmienić w tekście v0.4
- W runtime §6.4.1 usuń „model dyskowy jako MVP” i zastąp go:
  - „MVP używa `sweptShape` z Map Compiler (sampling footprintu prostokątnego).”
- W Map Compiler §7.5 doprecyzuj, że **nie wolno** robić aproksymacji wypukłej, jeśli ma to psuć przepustowość (np. wąskie korytarze, bliskie krawędzie):
  - preferowane: `multiRect` (lista OBB) albo wielokąt wklęsły / multipolygon.

### 10.2 Proponowany model MVP (prosty, dokładniejszy, nadal implementowalny)
**Model:** „swept multi‑rectangle” (składany z prostokątów).

1) Próbkuj po `edgeS` / `corridorS` co `ds` (np. 0.05 m).  
2) W każdym sample wyznacz pose robota:
   - `(x,y)` z krzywej,
   - `yaw` z tangensa,
   - `movestyle` determinuje, co jest „lead” (front vs tail).
3) Zbuduj OBB robota:
   - półdługości i półszerokości wynikają z `head/tail/width + safety + poseMargin + trackingMargin`,
   - na zakrętach dodaj `turningExtraMargin` **asymetrycznie** (np. bardziej na zewnętrznej stronie zakrętu, jeśli umiesz to policzyć; jeśli nie — symetrycznie, ale tylko dla segmentów oznaczonych jako „turn”).
4) Dla komórki:
   - zbierz OBB z przedziału `[s0, s1]`,
   - uprość: „merge” sąsiednie OBB o podobnym `yaw` (żeby nie było 200 prostokątów).
5) ConflictSet:
   - prostokąt–prostokąt intersection (SAT) w prekompilacji + spatial index na bbox.

**Efekt:**  
Na prostych obwiednia jest wąska (prawie stały prostokąt), na zakrętach rośnie zgodnie z realną kinematyką i „zarzucaniem tyłu” (bo yaw i translacja zmieniają położenie narożników).

### 10.3 Alternatywa (jeśli chcesz jeszcze prościej)
- Użyj „rounded rectangle” (prostokąt + półokrągłe końce) jako OBB; to wciąż nie jest Minkowski z dyskiem *o promieniu R_turn*, tylko lokalny kształt robota.  
- W praktyce implementacyjnie to nadal robi się jako kilka prostokątów (więc wracasz do `multiRect`).

---

## 11) Wnioski z poprzednich recenzji (skondensowane i nadal aktualne)

1) **Assumptions→Guarantees** to najważniejsza część spec — utrzymać i pilnować spójności z kodem.  
2) **Deterministyczny replay** to „czarna skrzynka” systemu: każdy incydent musi dać się odtworzyć z logu.  
3) **StopStandoff** nie „wynika samo” z conflictSet — musi być jawnie egzekwowane.  
4) **Re-entrant konflikty** (owner może posiadać zasoby konfliktujące z samym sobą) muszą być wyraźnie zapisane (masz to — super).  
5) **Replan w ruchu**: zasady atomowości przejścia `routeA→routeB` muszą być spisane tak, by nigdy nie powstała „dziura bezpieczeństwa” między grantami.

---

## 12) Minimalna lista zmian, które bym zrobił „od razu” (największy ROI)

1) Naprawić sprzeczność obwiedni (runtime vs map compiler) i usunąć Minkowski z MVP.  
2) Dopisać twardy algorytm `occupied(R)` + twardy mechanizm egzekwowania `stopStandoff`.  
3) Doprecyzować odpowiedzialność FM vs Gateway dla `stopLineRouteS`.  
4) Dopisać geometry contract dla `sweptShape` i `intersects` (epsilon, wklęsłość, domknięcie).  
5) Dodać 2–4 golden scenariusze skupione na „nadmiernej konserwatywności” i gęstości marków.

