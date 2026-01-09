# Recenzja: „Fleet Manager 2.0 — Specyfikacja UI / Mock UI (v0.2)” pod kątem użycia jako specyfikacja UI do MVP

## 1) PROMPT użytkownika (z rozmowy) — wklejony kanonicznie

```text
no dobrze. to teraz co bys jeszcze poprawil w tej specyfikacji ui, czego jeszcze to brakuje do uzycia jej jako specyfikacji ui do MVP. w specyfikacji podales taki stack. w czym on bedzie lepszyod plan javascitpt? czy ai bedzie lepiej pracowac z takim stackiem czy w pllain javascipt jak dotychczas. gdzie bedzie mniej kodu? dodaj czesc jak sie ma ta specyfikacja do reszty architektury. no i jak zacac implementacje. najpierw od samego mocka i wygladu, tak zeby bardzo przypominal prototym, lacznie z zoomowaniem itp. zeby bylo odwzorowane. przygotuj dokument recenzji rej specyfikacji wskaz czego jeszcze brakuje i moje uwagi. podkresl tez, ze nie moze w specyfikacji znikac to co by lo w poprzednich dokumentach

w recenzji zamiesc moj promt i przeslij recensje w postaci pliku md
```

## 2) PROMPT, który wygenerował tę recenzję (dla powtarzalności)

```text
Rola: Jesteś krytycznym recenzentem specyfikacji UX/UI oraz lead frontend engineerem. Recenzujesz dokument: „Fleet Manager 2.0 — Specyfikacja UI / Mock UI (v0.2)”.

Cel: przygotuj recenzję pod kątem tego, czy dokument nadaje się jako specyfikacja UI do MVP oraz jako „brief implementacyjny” dla zespołu i AI.

Wymagania:
- Wypunktuj, czego jeszcze brakuje do MVP (braki krytyczne i braki jakościowe).
- Oceń stack (React+TypeScript+Vite+Zod) vs dotychczasowy plan plain JavaScript: wpływ na jakość, szybkość, ilość kodu, ryzyka, ergonomię dla AI.
- Dodaj sekcję: jak ta specyfikacja UI ma się do reszty architektury (granice odpowiedzialności UI vs Core; kontrakty danych; realtime; komendy).
- Zaproponuj plan startu implementacji: najpierw mock/wygląd maksymalnie podobny do prototypu (w tym pan/zoom/minimapa), potem dopiero integracje.
- Zawrzyj „uwagi użytkownika” i jawnie podkreśl zasadę: w kolejnych wersjach specyfikacji NIE WOLNO gubić treści z poprzednich dokumentów; ewentualne redukcje muszą trafiać do sekcji „Rzeczy usunięte / zdeprecjonowane” z uzasadnieniem.

Styl:
- Konkretnie, technicznie, ale czytelnie.
- Zamiast ogólników: checklisty, matryce, definicje DoD i ryzyk.
- Nie projektuj algorytmu floty; skup się na UI/UX i integracji kontraktowej.
```

---

## 3) Executive summary (co jeszcze brakuje do „MVP‑ready”)

Spec v0.2 jest mocna jako „duży opis intencji” (layout, safety, DataSource, tryby MOCK/LIVE, podstawy mapy i ergonomii). Żeby użyć jej jako *specyfikacji UI do MVP* bez „dziur interpretacyjnych”, brakuje głównie:

1) **Twardej definicji MVP** (P0/P1, co jest „must have” vs „nice to have”), + „Definition of Done” (DoD) dla MVP.
2) **Kontraktów w formie maszynowej**: TS types / Zod schemas / przykładowe payloady („golden files”) dla snapshotów, eventów i komend.
3) **Specyfikacji projektu wizualnego jako systemu**: tokeny (kolory, spacing, typografia), komponenty bazowe, warianty stanów (error/empty/loading), siatka i breakpoints.
4) **Matrycy stanów błędów i degradacji** (offline/stale/partial data/validation error) + dokładnie jakie UI elementy się wyłączają i kiedy.
5) **Checklisty implementacyjne, które redukują dowolność**: map pan/zoom „1:1 z prototypem”, skróty klawiszowe, zachowanie tabel (sort/filter/pagination), wymagania wydajnościowe i progi.

Dobra wiadomość: to są uzupełnienia „porządkujące”, a nie zmiana koncepcji.

---

## 4) Co bym jeszcze poprawił / czego brakuje do MVP (konkrety)

### 4.1 Brak „MVP scope” z priorytetami
**Problem:** dokument opisuje dużo widoków i zachowań, ale nie mówi jednoznacznie, co *musi* być w pierwszym releasie UX‑owym (klikalny mock) i co może poczekać.

**Propozycja dopisku (must):** sekcja „MVP Scope (P0) + MVP+ (P1/P2)” z listą funkcji oraz minimalnymi kryteriami.

Przykład (do wklejenia do spec):
- **P0 (MVP UI mock):** App shell, Mapa (pan/zoom/minimap), Roboty (tabela + drawer), Worksites/Fields (lista + edycja occupancy/blocked w mocku), Zadania (lista + status), Diagnostyka/Alerty (log + filtry), Settings (seed/freeze/step, przełączenie DataSource).
- **P1:** Sceny (lista + activate), Bufory, Streamy (podgląd), Awarie (dedykowany widok), „Capabilities gating” pełne.
- **P2:** eksport/import scen, zaawansowane diagnostyki (lock snapshots), wallboard, i18n.

### 4.2 Brak „visual spec” w postaci tokenów i komponentów
**Problem:** „duch Nowy Styl” jest opisany, ale implementacja nadal ma za dużo swobody.

**Do dopisania:**
- Tokeny: `color.*`, `space.*`, `radius.*`, `shadow.*`, `font.*`.
- Rozmiary: sidebar width, header height, map toolbar, drawer width, tabela row height.
- Zasady ikonografii (zestaw ikon, stroke width, rozmiary).
- Stany komponentów: default/hover/active/disabled/focus/error.

**Dlaczego:** to skraca czas „dopasowania do prototypu” bardziej niż jakikolwiek opis słowny.

### 4.3 Brak „1:1 map behavior spec” względem prototypu
W v0.2 jest pan/zoom i skróty, ale do „prawie identycznie jak prototyp” potrzebujesz doprecyzowania:
- Matematyka transformacji (SVG viewBox vs transform matrix),
- Zachowanie wheel zoom (anchor pod kursorem),
- Momentum panning? (raczej nie),
- Zoom limits (min/max),
- Fit/Reset: co to znaczy (fit do bounds mapy? do bounds grafu? do aktywnych elementów?),
- Minimap: czy pokazuje viewport rectangle; jak działa click‑to‑jump.

**Do dopisania:** „Mapa — kontrakt interakcji” + testy manualne (AC) w stylu: *zoom nie driftuje*, *fit zawsze wraca*, *minimap pokazuje aktualny viewport*.

### 4.4 Brak formalnych schematów danych (AI‑killer #1)
Masz DataSource w opisie, ale AI i ludzie będą „zgadywać” kształty danych.

**Do dopisania (must):**
- `schemas/` (Zod) + `examples/` (JSON) jako „golden files”: 
  - `FleetSnapshot`, `RobotState`, `WorksiteState`, `TaskState`, `Alert`, `CommandAck`, `CommandResult`, `Capabilities`.
- „Event envelope” + lista typów eventów.
- Jawna polityka wersjonowania: `schemaVersion` + kompatybilność.

To jest też najlepszy sposób, żeby później wpiąć LIVE bez bólu.

### 4.5 Brak matrycy stanów błędów i degradacji
W spec są zasady, ale nie ma kompletnego „co dokładnie UI robi” w każdym stanie.

**Do dopisania:** tabela:
- `Connected` / `Stale` / `Offline` / `DataInvalid` / `Partial` / `AuthExpired`
- Co w UI jest widoczne (banner/overlay)
- Co jest disabled (Operate, komendy, edycje)
- Czy UI pokazuje „ostatni snapshot” (read‑only)
- Jak wygląda retry/reconnect

### 4.6 Brak „user flows” dla 3–5 kluczowych scenariuszy
Nawet w MVP mocku warto mieć krótkie, jednoznaczne flow:
- „Operator widzi robota blocked → otwiera drawer → widzi reason → ustawia obstacle/blocked worksite → obserwuje zmianę”.
- „Operator chce ręcznie przejąć robota → uzbraja Operate → wybiera manual target → wysyła pause/stop”.
- „Stale/offline w trakcie operacji → UI auto przechodzi w Read‑only i pokazuje pending jako unknown”.

Flow = mniej dowolności, mniej „przypadkowych UX”.

### 4.7 Brak „DoD i test plan” stricte dla UI
W MVP spec powinna mieć:
- DoD: a11y minimalne (tab order, focus), brak crashy na zły payload, 0 krytycznych overlapów UI, 60 FPS pan/zoom na referencyjnej maszynie.
- Testy: smoke (routing, map pan/zoom), contract tests (Zod), e2e (Playwright/Cypress) dla 3 flow.

### 4.8 Brak „glossary + naming consistency” dla UI
Masz terminologię (selection/control), ale warto dodać:
- Słownik labeli w UI (żeby nie powstały 3 synonimy na to samo),
- Spójne nazwy statusów i tagów.

---

## 5) Stack: React + TypeScript + Vite (+ Zod) vs plain JavaScript (jak dotychczas)

### 5.1 Co jest lepsze w proponowanym stacku
- **TypeScript**: mniej klas błędów integracyjnych (złe pola, literówki, null/undefined), łatwiejszy refactor, łatwiejsze „prowadzenie” AI przez typy.
- **Zod** (runtime validation): chroni UI przed „krzywymi payloadami” i pozwala pokazać *Data error* zamiast crasha.
- **React (komponenty + stan)**: przy wielu widokach i powtarzalnych patternach (tabele, drawer, log, filtry) ilość *duplikacji* spada.
- **Vite**: szybki dev loop.

### 5.2 Co może być lepsze w plain JavaScript
- **Szybszy start** jeśli robisz tylko „statyczne klikanie” po DOM, bez rozbudowanej architektury.
- **Mniej boilerplate na wejściu**.

### 5.3 Czy AI będzie lepiej pracować z TS/React czy z plain JS?
Moja praktyczna ocena:
- Przy UI tej złożoności AI zwykle **lepiej dowozi w TS/React**, bo:
  - typy są „szynami kolejowymi” (kompilator i linter łapią sporo halucynacji API),
  - komponenty ograniczają powierzchnię zmian,
  - łatwiej kazać AI implementować „jeden komponent” zgodnie z kontraktem.
- W plain JS AI szybciej „nabazgrze”, ale rośnie ryzyko:
  - globalnego stanu,
  - wycieków event listenerów,
  - niespójnych modeli danych,
  - regresji w mapie (pan/zoom) przy kolejnych zmianach.

### 5.4 Gdzie będzie mniej kodu?
To zależy od horyzontu:
- **Na dzień 1–2**: plain JS często będzie krótszy.
- **Na tydzień 2–6**: React+TS zwykle daje mniej kodu *netto* (mniej duplikacji, mniej „napraw”, mniej ręcznych guardów), szczególnie gdy dojdą: filtry, walidacje, tryb offline, logika pending/ack.

**Wniosek dla MVP mocka:**
- Jeśli MVP to „klikany prototyp” bardzo podobny do istniejącego (SVG + CSS + proste panele) i nie chcesz od razu przerabiać architektury: plain JS jest OK.
- Jeśli MVP ma być od razu bazą pod produkcyjny UI (a tak brzmi cel): React+TS+Zod będzie bezpieczniejszą inwestycją.

### 5.5 Minimalna kompromisowa opcja (gdy chcesz zachować ducha prototypu)
- React+TS dla app shell/paneli/drawerów,
- osobny, izolowany moduł „MapViewport” napisany „imperatywnie” (bez nadmiernych rerenderów), wpięty jako komponent.

To daje najlepsze z obu światów.

---

## 6) Jak ta specyfikacja UI ma się do reszty architektury (granice odpowiedzialności)

### 6.1 UI jako „thin client” (to trzeba utrzymać)
W architekturze Fleet Managera UI ma być klientem, a system ma działać bez UI i wspierać wiele frontendów naraz. UI nie jest źródłem prawdy; jest narzędziem obserwacji i wysyłania komend. (To jest spójne z kierunkiem „REST + realtime stream” oraz multi‑frontend).

### 6.2 Jedyny „twardy styk”: kontrakty danych + komendy
Żeby UI dało się podpiąć do dowolnego core (sym, robokit-sim, real), potrzebujesz:
- Snapshot API (stan floty),
- Event stream (SSE/WS) z sekwencją i typami eventów,
- Command API (ack + result),
- Capabilities (feature gating),
- Health/connection semantics.

**Rekomendacja do dopisania w UI spec:** jawne odwołanie do kanonicznego API (nawet jeśli to dopiero „plan”) i konsekwentne mapowanie tego na DataSource.

### 6.3 Integracja przez DataSource = super pomysł, ale dopnij to formalnie
Warstwa DataSource jest właściwym „portem” UI. Żeby była przyszłościowa:
- DataSource interface musi być w repo jako TS types,
- testy kontraktowe na fixtures muszą być częścią CI,
- Live adapter może robić mapping ze „starego API” na nowe (compat).

### 6.4 Jak UI powinno traktować „algorytm i rezerwacje” (kontekst, bez wchodzenia w szczegóły)
Nawet jeśli algorytm jest poza zakresem, UI powinno mieć miejsce na:
- wyjaśnianie „dlaczego robot stoi” (blockedReason / lockDenied / wait),
- podgląd „lock snapshot” jako opcjonalny panel diagnostyczny,
- konsekwentne stany: blocked/waiting/offline/error.

To pozwala, by później core „włożył” debug payload bez zmiany UI.

---

## 7) Jak zacząć implementację: najpierw mock/wygląd 1:1 z prototypem

Poniżej plan, który minimalizuje ryzyko, że „UX się rozjedzie” zanim zaczniecie myśleć o core.

### Krok 0: „Baseline visual parity” (bez danych)
1) Skopiuj/odtwórz layout: sidebar + header + content.
2) Zaimplementuj statyczny widok Mapa z narzędziami i minimapą.
3) Zaimplementuj statyczny widok Roboty (tabela + drawer) na fixture danych.

Cel: screenshoty/porównanie do prototypu.

### Krok 1: Map pan/zoom/minimap (kontrakt interakcji)
1) Panning (drag) + zoom (wheel pod kursorem) + double‑click zoom in.
2) Fit/Reset + skróty klawiszowe.
3) Minimap z prostokątem viewportu + click‑to‑jump.

Cel: „to się klika jak prototyp”.

### Krok 2: DataSource = Mock (deterministyczny)
1) Wprowadź modele danych + Zod.
2) MockDataSource: tick, ruch robotów po grafie, kilka tasków, kilka alertów.
3) Settings: seed, freeze, step, speed.

Cel: UI żyje, ale logika mocka pozostaje mała i przewidywalna.

### Krok 3: Widoki P0 + spójne akcje UI (wciąż mock)
1) Roboty: filtry, sort, selection, manual target, Operate gating.
2) Worksites: przełączanie occupancy/blocked + Undo.
3) Tasks: lista + filtrowanie.
4) Globalny log zdarzeń.

Cel: MVP UX gotowy do „klikania” i oceny.

### Krok 4: „Integracja na sucho” (LiveDataSource bez core)
1) LiveDataSource z MSW lub stub serwera.
2) Contract tests: te same fixtures dla Mock i Live.

Cel: zanim podłączysz prawdziwy core, masz pewność, że UI/transport działa.

### Krok 5: Pierwsze podłączenie do prawdziwego core
- Podłącz health + snapshot + event stream.
- Pozostaw Operate=OFF jako default.

---

## 8) Jak ułatwić implementację i integrację mocka (żeby nie bolało później)

1) **„Spec as code” w repo**: schemas + examples + generated types.
2) **Fixtures jako kontrakt**: folder `fixtures/` z:
   - `snapshot.small.json`,
   - `events.replay.60s.jsonl`,
   - `capabilities.default.json`.
3) **Record/replay**: nawet proste (ostatnie 60s) — idealne do debug UI.
4) **Adaptery**:
   - `LiveAdapterV0` (kompatybilny z prototypem),
   - `LiveAdapterV1` (docelowy),
   - UI nie widzi różnicy.

---

## 9) Uwagi użytkownika, które muszą zostać „przybite gwoździami” w specyfikacji

1) UI ma bardzo przypominać prototyp (w tym zoomowanie/pan/minimap i ogólny styl).
2) Na start robimy klikalny mock i pracujemy nad UX/wyglądem.
3) Mock ma być na tyle „żywy”, by dało się ocenić doświadczenie (animacja robotów), ale nie może stać się projektem samym w sobie.
4) W kolejnych iteracjach specyfikacji **nie wolno gubić treści** z poprzednich dokumentów. Jeżeli coś ma zostać usunięte lub uproszczone, musi trafić do sekcji:
   - **„Rzeczy usunięte / zdeprecjonowane”**
   wraz z uzasadnieniem oraz wskazaniem, gdzie to było wcześniej.

To jest kluczowe, bo inaczej „prawda projektu” zacznie dryfować.

---

## 10) Ryzyka i pułapki (dla MVP UI)

1) **Dryf wizualny względem prototypu** (najczęstsze): bez tokenów i wymiarów UI będzie „podobne, ale nie to”.
   - Mitigacja: tokeny + porównanie screenshotów + lista różnic.

2) **Mapa w SVG zacznie lagować** przy rosnącej liczbie elementów.
   - Mitigacja: culling po zoom, ograniczenie re-renderów, warstwy.

3) **Za duży mock** zacznie udawać core.
   - Mitigacja: prosty tick, deterministyczne reguły, freeze/step, brak „smart” planowania.

4) **Niejasne kontrakty danych** spowodują koszt integracji LIVE.
   - Mitigacja: Zod + fixtures + contract tests.

5) **Zbyt łatwe wysyłanie komend** (UX safety) — operator kliknie coś przypadkiem.
   - Mitigacja: selection/control split + Operate gating + potwierdzenia.

---

## 11) Co konkretnie dopisałbym do spec v0.2 jako „MVP pack” (checklista)

To jest „lista braków”, które robią największą różnicę przy implementacji:

- [ ] Sekcja „MVP Scope P0/P1/P2” + DoD.
- [ ] Design tokens (kolor/typografia/spacing) + wymiary layoutu.
- [ ] Kompletna matryca stanów błędów i degradacji.
- [ ] User flows (3–5) + minimalne e2e testy.
- [ ] Zod schemas + TS types + examples (golden files).
- [ ] Map interaction contract (matematyka i testy manualne).
- [ ] Checklisty: a11y (tab order, focus), perf (map pan/zoom), stability (no crash on invalid data).

---

## 12) Najważniejsze przypomnienie (wprost): nic nie może „znikać”

W kolejnych wersjach dokumentu:
- NIE usuwamy treści „po cichu”.
- Każda redukcja musi zostać przeniesiona do sekcji „Rzeczy usunięte / zdeprecjonowane” z uzasadnieniem i odniesieniem do poprzedniej wersji.

To jest warunek, żeby specyfikacja nadawała się do pracy zespołowej i do pracy z AI (bez dryfu wymagań).
