# Fleet Manager 2.0 — Specyfikacja UI / Mock UI (v0.3)

## PROMPT (kanoniczny)

```text
Rola: Jesteś doświadczonym projektantem UX/UI oraz lead frontend engineerem (TypeScript). Twoim zadaniem jest przygotować klikalny prototyp (mock) nowego Fleet Managera do zarządzania autonomicznymi wózkami widłowymi.

Cel:
- Zbuduj UI „jak produkt”: spójny, intuicyjny, odporny na błędy, przygotowany na integrację z prawdziwym core.
- Skup się na UX i wyglądzie. Logika sterowania flotą i algorytmy są poza zakresem — mock ma tylko „ożywiać” UI.

Wymagania nadrzędne:
- Zachowaj ducha i estetykę prototypu („Nowy Styl”): jasny, ciepły motyw, lewy sidebar, header, karty/panele, mapa w SVG + minimapa.
- Priorytetyzuj wdrożenie jako MVP: najpierw P0 (patrz rozdz. 1.5), potem P1/P2.
- W trybie MOCK odtwórz kluczowe zachowania UX prototypu tam, gdzie to wpływa na „czucie” aplikacji (zwłaszcza Mapa: pan/zoom/minimapa zgodne z prototypem i opisane w rozdz. 7.4).
- Specyfikacja jest „append-only”: nic nie znika; rzeczy zdezaktualizowane przenoś do końcowej sekcji „Rzeczy usunięte / zdezaktualizowane”.
- Specyfikacja ma być wygodna dla AI i łatwa do implementacji: utrzymuj typy/schemy (Zod) i fixtures jako artefakty implementacyjne (patrz rozdz. 17.8).

- Zaimplementuj wszystkie widoki opisane w specyfikacji (Mapa, Roboty, Pola, Bufory, Streamy, Sceny, Ustawienia, Zadania, Diagnostyka, Awarie).
- Prototyp ma mieć dwa tryby źródła danych (jedna abstrakcja DataSource):
  1) MOCK (domyślny): wbudowany mini‑symulator poruszający roboty po grafie, generujący taski i diagnostykę w sposób prosty i deterministyczny.
  2) LIVE: możliwość podłączenia do backendu przez Base URL; UI używa tych samych modeli i eventów co w MOCK (tylko inny adapter).
- Bezpieczeństwo UX jest priorytetem:
  - UI rozdziela „selection” (wybór robota) od „control” (komendy). Kliknięcie nie może mieć skutków w świecie.
  - W LIVE aplikacja startuje w trybie Read‑only (Operate = OFF). Operator świadomie uzbraja (Operate = ON) zanim pojawią się aktywne akcje.
  - Akcje ryzykowne i destrukcyjne zawsze wymagają potwierdzeń oraz czytelnego feedbacku (pending → success / error).
- Odporność:
  - UI nigdy nie „wywraca się” od błędnych danych lub błędów sieci.
  - Pokazuj overlay „Brak połączenia” dopiero po ~2 sekundach braku kontaktu z endpointem health.
  - Wykonuj runtime validation danych (np. Zod) i obsługuj „Data error” bez crasha.
- Spójność kontraktów:
  - W MOCK i LIVE te same typy danych, ten sam format eventów (SSE envelope) i ten sam model komend (commandId, idempotency, statusy).
- Ergonomia i dostępność:
  - UI obsługuje klawiaturę (Tab/Enter/Esc), focus ring, sensowne aria-label.
  - Kontrasty i czytelność są traktowane jak wymagania (nie „ładny dodatek”).
- Implementuj zgodnie z częścią normatywną (MUST/SHOULD) i wymaganiami z identyfikatorami (FMUI-...); dodaj testowalne kryteria akceptacji (AC-...).
- Mock ma być prosty i utrzymywalny: jedna pętla tick + kilka funkcji; bez złożonych plannerów. Dodaj deterministyczny seed i możliwość wstrzymania/stepowania symulacji (przyspiesza testy UX).

Preferowany stack (dla szybkości prototypowania):
- React + TypeScript + Vite
- Router (React Router)
- Runtime validation (Zod)
- SSE (EventSource) w LIVE; MSW jako opcjonalna warstwa mockowania HTTP
- Tabele: wirtualizacja od progu N (np. react-window)

Wyjście:
- Działający klikalny mock: przełączanie widoków, selekcja robota, drawer szczegółów, menu kontekstowe na mapie, tryb Operate/Read-only, dodawanie przeszkód z Undo, log zdarzeń/alertów.
- Kod modularny: komponenty UI + warstwa DataSource (MockDataSource/LiveDataSource) + schemy/fixtures.
```

---

## DOKUMENT: Specyfikacja UI / Mock UI (v0.3)

> Konwencja normatywna: słowa **MUST / MUST NOT / SHOULD / MAY** są użyte w znaczeniu RFC 2119.
> Każde wymaganie ma identyfikator `FMUI-...`, a każdy zestaw kryteriów akceptacji ma identyfikator `AC-...`.

### 0. Informacje o dokumencie (Document Control)

**Nazwa:** Fleet Manager 2.0 — Specyfikacja UI / Mock UI  
**Wersja:** v0.3 (draft)  
**Data:** 2026-01-07  
**Status:** robocza specyfikacja UI + klikalny mock (zakres UX/wygląd)  
**Owner:** TBD (Product/UX)  
**Współwłaściciel:** TBD (Frontend/Engineering)  
**Zakres:** wyłącznie UI/UX oraz mock danych; algorytm floty i architektura core są poza zakresem (są tylko tłem).

#### 0.1 Źródła (co analizowano w starym prototypie)

UI prototypu (kluczowe dla wyglądu i zachowań):
- `apps/traffic-lab/public/index.html`
- `apps/traffic-lab/public/styles.css`
- `apps/traffic-lab/public/app.js` (+ skrypty pomocnicze `domain_*.js`, `packaging_engine.js`)

Dokumenty kontekstowe (UI‑relevant: odporność, kontrakty, stany):
- `docs/rds/nowy-styl/requirements.md` (sekcja “Aplikacje UI (frontend)” + zasady odporności)
- `docs/rds/docs/STATUS_CONTRACT.md` (mapowanie statusów)
- `docs/rds/docs/MAP_API.md` (współrzędne i semantyka mapy)

#### 0.2 Zmiany względem v0.2 (changelog skrócony)

**Nowości v0.3:**
- Dodano definicję MVP (P0/P1/P2) + Definition of Done + minimalny plan testów (MVP-ready).
- Dodano regułę utrzymania specyfikacji „append-only” + stabilne identyfikatory (żeby treść nie „znikała” między wersjami).
- Rozszerzono design tokens o typografię, layout constants, motion i z-index oraz wartości 1:1 z prototypu.
- Doprecyzowano zachowanie mapy 1:1 z prototypu (matematyka viewBox, wheel zoom, clamp, minimapa) + profile interakcji (Prototype/Standard).
- Dodano matrycę degradacji (Connected/Stale/Offline/Auth/Data error) i reguły co jest disabled/ukryte.
- Rozszerzono kontrakty danych: „spec as code” (Zod schemas, TS types, fixtures, contract tests) oraz opis relacji UI↔core w architekturze.
- Doprecyzowano plan startu implementacji: najpierw mock + pixel/interaction parity, potem LiveDataSource i integracja.

##### 0.2.1 (Archiwum) Zmiany v0.2 względem v0.1

- Dodano identyfikatory wymagań (FMUI-*) oraz kryteria akceptacji (AC-*).
- Ujednolicono semantykę połączenia (Connected/Stale/No connection) i kanoniczne endpointy (health/state/events).
- Rozdzielono „selection” od „control” dla robota: klik nie uruchamia manual.
- Wprowadzono globalny tryb **Read‑only vs Operate (armed)**.
- Doprecyzowano komendy (pause/stop/cancel) oraz zasady ACK vs efekt w świecie + idempotency.
- Dodano wymagania dostępności (a11y), focus, klawiatura, kontrasty.
- Rozszerzono mock o deterministyczny seed + możliwość freeze/step + (opcjonalnie) record/replay.
- Dodano globalny log zdarzeń/alertów (drawer w headerze).
- Zmieniono interakcję double‑click na mapie: domyślnie zoom in (reset przez przyciski/skróty).
- Zredukowano przeładowanie akcjami w tabeli Roboty (akcje w menu/drawerze).
- Dodano sekcję Non‑goals (out of scope) oraz future‑proofing (capabilities/feature flags, multi‑site, i18n).

#### 0.3 Lista otwartych decyzji (Open decisions)

- `DEC-001` (UI tech): React vs inny framework — rekomendacja: React+TS (dla szybkości prototypu).
- `DEC-002` (Transport LIVE): SSE vs WebSocket — rekomendacja: SSE jako baseline; WS jako opcja.
- `DEC-003` (Komendy): jeden endpoint `POST /commands` vs per‑resource — rekomendacja: jeden model komend w DataSource; REST może być adapterem.
- `DEC-004` (A11y target): minimalny poziom WCAG — rekomendacja: AA dla krytycznych elementów.
- `DEC-005` (Skala): docelowa liczba robotów (50/100/300) — rekomendacja: projektuj na 100 (z wirtualizacją).

#### 0.4 Zasady utrzymania specyfikacji (quality + AI‑friendly)

Ta sekcja jest tu po to, żeby dokument nadawał się do pracy zespołowej i do pracy z AI bez „dryfu”.

- `FMUI-DOC-001` Specyfikacja **MUST** być utrzymywana w trybie *append‑only*: treść nie znika między wersjami.
  - Jeśli coś przestaje być kanoniczne, **MUST** trafić do sekcji „Rzeczy usunięte / zdezaktualizowane” (rozdz. 23) wraz z powodem i następcą.
- `FMUI-DOC-002` Identyfikatory `FMUI-*` oraz `AC-*` są **stabilne**: nie zmieniają znaczenia i nie są ponownie używane.
- `FMUI-DOC-003` Każdy element „MUST” **MUST** mieć testowalne kryterium akceptacji (AC) albo jawnie opisany sposób weryfikacji (np. „sprawdź w logu komend”).
- `FMUI-DOC-004` Każdy widok **SHOULD** mieć w specyfikacji komplet:
  - *cel widoku*,
  - *sekcje UI*,
  - *stany empty/loading/error*,
  - *akcje użytkownika* i ich reguły disabled,
  - *kontrakty danych* (jakie pola są potrzebne),
  - *telemetrię* (jak mierzymy, że działa).
- `FMUI-DOC-005` Specyfikacja **SHOULD** zawierać „golden path implementacji” i checklistę (rozdz. 21–22), żeby ograniczyć ryzyko rozjechania UX.

**Kryteria akceptacji (AC-DOC-001):**
- Nowa wersja dokumentu ma uzupełniony changelog (0.2) i w razie zmian usuwa/oznacza rzeczy w archiwum (23), zamiast je kasować.
- Wymagania krytyczne mają jawne AC albo jawny sposób weryfikacji.

#### 0.5 Stack frontend i uzasadnienie (React+TS vs plain JavaScript)

W prototypie UI było zrobione w „vanilla” HTML/CSS/JS. To jest szybkie na start, ale przy większej liczbie widoków i stanów łatwo o dług techniczny.

**Rekomendacja MVP (domyślna):** React + TypeScript + Vite + Zod (runtime validation).

Dlaczego to pomaga:

- **Jakość i odporność:** TypeScript + Zod wyłapują klasę błędów, które w plain JS wychodzą dopiero „na produkcji” (undefined, brak pola, zły typ).
- **Mniej dryfu przy refaktorach:** typy są „szynami”, po których jedzie kod.
- **Lepsza współpraca z AI:** AI robi mniej „kreatywnej interpretacji”, gdy ma typy, schemy i fixtures. TypeScript jest też lepszy w generowaniu zmian mechanicznych (rename, migracje).
- **Mniej powtórzeń w UI:** komponenty (Card/Table/Drawer) redukują copy‑paste HTML.

Gdzie plain JS bywa lepszy:

- **Minimalny mock na 1 widok:** mniej setupu, mniej plików, krótszy „hello world”.
- **Imperatywne SVG** (mapa) i tak często kończy jako moduł z `addEventListener`, niezależnie od React.

**Pragmatyczny kompromis (zalecany):**
- UI w React+TS,
- Mapa jako *imperatywny moduł* (np. `MapCanvas.ts`) sterowany przez referencję do `<svg>` oraz „viewport state” — żeby nie renderować setek elementów przy każdym ticku.
- Warstwa `DataSource` jest jedynym miejscem zależnym od „core API” — reszta UI nie zna endpointów.

**Gdzie będzie mniej kodu (realnie):**
- Dla jednego ekranu: zwykle plain JS.
- Dla MVP z 8–10 widokami, drawerami, menu, stanami błędów i testami kontraktów: zwykle React+TS (mniej powtórzeń, mniej debugowania, mniej „klejenia” stanu).

`DEC-001` (z 0.3) pozostaje otwarte jako „polityka”, ale dla MVP mocka rekomendacja jest jednoznaczna: React+TS.



---

## 1. Zakres, cele i zasady projektowe

### 1.1 Cele UX (co ma “czuć” użytkownik)

UI ma dawać operatorowi trzy rzeczy naraz:
1) **Orientację** — co się dzieje w systemie w tej chwili.  
2) **Kontrolę** — umiejętność wykonania bezpiecznych akcji operatorskich.  
3) **Zaufanie** — jasność, kiedy dane są aktualne, a kiedy UI „nie ma kontaktu” lub „dane są stare”.

### 1.2 Non‑goals (Out of scope)

- `FMUI-SCOPE-001` UI v0.x **MUST NOT** zawierać edytora map/grafu (tylko podgląd).  
- `FMUI-SCOPE-002` UI v0.x **MUST NOT** zawierać zarządzania użytkownikami (RBAC tylko jako kontrakt/placeholder).  
- `FMUI-SCOPE-003` UI v0.x **MUST NOT** implementować KPI/raportów floty (może istnieć prosty wallboard, bez analityki).  
- `FMUI-SCOPE-004` Mock **MUST NOT** implementować złożonych algorytmów dispatch/traffic (symulacja ma wspierać UX).

**Kryterium akceptacji (AC-SCOPE-001):**
- Repo UI nie zawiera ekranu „Map Editor”.
- Mock nie zawiera planowania tras poza prostym ruchem po grafie.

### 1.3 Zasady projektowe (normatywne)

- `FMUI-GEN-001` UI **MUST** być czytelne w 3 sekundy: po otwarciu widać *gdzie jestem (widok)*, *co jest kluczowe (stan floty)* i *czy mogę wykonywać akcje (Read‑only/Operate)*.  
- `FMUI-GEN-002` UI **MUST** dawać feedback na każdą akcję: *pending → success / error* (w tym w mocku).  
- `FMUI-GEN-003` UI **MUST NOT** wykonywać akcji w świecie jako efekt uboczny selekcji (kliknięcia) — selekcja ≠ sterowanie.  
- `FMUI-GEN-004` UI **MUST** rozróżniać: brak danych / dane przestarzałe / dane aktualne / brak połączenia.  
- `FMUI-GEN-005` UI **MUST** mieć bezpieczne defaulty w LIVE: start w Read‑only (Operate=OFF), automatyczny powrót do Read‑only przy Stale/Offline.  
- `FMUI-GEN-006` UI **SHOULD** być możliwie “stateless”: persystuj tylko preferencje UI (filtry, widoczność warstw mapy), nie „prawdę o świecie”.  
- `FMUI-GEN-007` UI **SHOULD** działać w trybie multi‑frontend: kilka okien/komputerów jednocześnie patrzy na to samo, a konflikty rozstrzyga backend; UI czytelnie informuje o konfliktach.

**Kryteria akceptacji (AC-GEN-001):**
- Każdy widok ma jednoznaczny tytuł i opis w headerze.
- Header zawsze pokazuje: Connection state + „age” danych + tryb Operate/Read‑only.
- Kliknięcie robota nie wysyła komend (weryfikowalne w logu komend).

### 1.4 Persona i kontekst pracy

- **Operator (standard)**: obserwuje mapę i roboty, reaguje na blokady, ustawia occupancy/blocked worksites, czasem przełącza robota w manual.  
- **Inżynier uruchomień / serwis**: używa scen, ustawień algorytmów, diagnostyki i narzędzi symulacyjnych.  
- **Tryb demo / szkolenie**: mock z animacją robotów (żeby „coś żyło”), bez ryzyka realnych akcji.

### 1.5 MVP: zakres, priorytety i Definition of Done

Ta sekcja zamienia „ładny opis” w plan wykonania MVP. Jest to kluczowe, żeby specyfikacja była używalna jako kontrakt implementacyjny.

#### 1.5.1 Zakres funkcjonalny — priorytety (P0 / P1 / P2)

**P0 (MVP — MUST dla pierwszej wersji klikalnego mocka):**
- App shell (login → aplikacja): sidebar, header, panel treści, routing.
- Globalny stan połączenia: Connected/Stale/Offline + „age” danych + czytelne komunikaty.
- Globalny przełącznik **Read‑only / Operate** (Operate=OFF domyślnie) + auto‑powrót do Read‑only przy Stale/Offline.
- **Mapa** (rozdz. 7) z zachowaniami 1:1 jak prototyp (pan/zoom/minimapa; w tym stałe i matematyka z 7.4) + warstwy: graf, worksites, roboty, przeszkody.
- **Roboty** (rozdz. 8): tabela + sortowanie „problems first” + filtr + akcje w menu + drawer szczegółów.
- **Pola (Worksites)** (rozdz. 9): lista + edycja occupancy/blocked + podgląd na mapie.
- **Zadania** (rozdz. 14): lista + podstawowe statusy + filtr.
- **Ustawienia** (rozdz. 13): przełączanie MOCK/LIVE, baseURL, seed, freeze/step, profil interakcji mapy.
- **MockDataSource** (rozdz. 18): deterministyczny tick, kilka robotów, proste taski, incydenty (blocked/stale/offline symulowane).
- „Spec as code”: schemy runtime (Zod) + fixtures + contract tests (rozdz. 17.8).
- Podstawowa dostępność: Tab/Enter/Esc, focus ring, aria dla menu/modali.

**P1 (kolejna iteracja, po dowiezieniu P0):**
- Sceny (rozdz. 12): lista scen + aktywacja sceny/mapy (z confirm w LIVE).
- Diagnostyka (rozdz. 15): czytelny podgląd kolejki/traffic (minimalny).
- Rozszerzony log zdarzeń: filtrowanie, eksport JSON.
- Record/replay eventów w mocku (jeśli nie wchodzi w P0).

**P2 (nice‑to‑have / future):**
- Wallboard/TV mode, wskaźniki KPI.
- WebSocket jako alternatywa SSE.
- Canvas/WebGL dla mapy przy bardzo dużych scenach.

#### 1.5.2 Definition of Done (DoD) dla MVP UI (P0)

MVP jest „done”, gdy:

- Wszystkie elementy P0 działają w mocku i da się je „przeklikać” bez dead‑endów.
- Mapa ma **wierność interakcji** względem prototypu: zoom pod kursorem, pan z clampem, minimapa drag; skróty klawiszowe działają. (AC w 7.4)
- UI nie crashuje na:
  - brak połączenia,
  - stale,
  - częściowo błędne dane (walidacja Zod → „Data error”).
- Operate gating działa: w Read‑only komendy są disabled i nie wychodzą żadne requesty „write”.
- Każda akcja ma feedback: pending → success/error (toast + stan w UI).
- Minimalna a11y: da się przejść klawiaturą przez sidebar, tabelę robotów, menu akcji i zamknąć modale/drawery Esc.
- Repo ma „golden fixtures” i test kontraktowy, który przechodzi dla MockDataSource.

#### 1.5.3 Minimalny plan testów (MVP)

- **Contract tests** (MUST): fixtures JSON dla `/fleet/state`, eventów SSE i komend; walidacja Zod.
- **E2E smoke** (SHOULD): Playwright/Cypress — 3 ścieżki:
  1) wejście → Mapa → select robot → drawer,
  2) Roboty → actions menu → (mock) pause/stop → toast,
  3) Settings → freeze/step → UI aktualizuje się bez glitchy.
- **Manual QA checklist** (MUST): zgodność z prototypem w pan/zoom/minimapie + brak misclicków w akcjach.


---

## 2. Terminologia (Słownik pojęć)

Ta sekcja jest **normatywna** — terminy mają znaczenie implementacyjne.

### 2.1 Robot: selection vs control

- **Selected robot**: robot wybrany do podglądu (highlight na mapie/tabeli, otwarty drawer).  
- **Manual target robot**: robot, dla którego aktywne są komendy manual (Go to…, Manual Drive, itp.). Manual target to *osobny stan* od selected.  
- `FMUI-TERM-001` UI **MUST** rozdzielać `selectedRobotId` od `manualTargetRobotId`.  
- `FMUI-TERM-002` UI **MUST** jasno wizualnie odróżniać:
  - selected (podgląd),
  - manual target (sterowanie),
  - controlled by someone else (zablokowane sterowanie).

### 2.2 Tryby bezpieczeństwa w UI

- **Read‑only (Operate=OFF)**: UI pokazuje dane, pozwala selekcjonować, filtrować, otwierać detale, ale **nie** wysyła komend (wszystkie akcje są disabled/ukryte).  
- **Operate (Armed)**: UI umożliwia wysyłanie komend; wymaga świadomego przełączenia.  
- `FMUI-TERM-003` UI **MUST** mieć globalny przełącznik Operate/Read‑only widoczny w headerze.  
- `FMUI-TERM-004` UI **MUST** automatycznie wyłączać Operate przy `Stale` lub `No connection`.

### 2.3 Stany połączenia i świeżości danych

- **Connected**: healthcheck OK i dostajemy aktualizacje stanu w oczekiwanym oknie czasu.  
- **Stale**: healthcheck OK, ale dane stanu nie aktualizowały się dłużej niż `staleAfterMs`.  
- **No connection (Offline)**: healthcheck nieudany dłużej niż `offlineAfterMs`.  
- `FMUI-TERM-005` UI **MUST** bazować stan połączenia na *kanonicznym* healthchecku (patrz rozdz. 6).  
- `FMUI-TERM-006` UI **MUST** pokazywać „age” danych stanu (np. „last update 1.2s ago”), a dokładny timestamp w tooltipie.

### 2.4 Semantyka komend: pause/stop/cancel

Dla uniknięcia chaosu nazewnictwa przyjmujemy kanoniczne znaczenia:

- **pauseNavigation**: wstrzymuje ruch/nawigację robota; odwracalne (`resumeNavigation`). Task zwykle zostaje (stan „paused” lub „in_progress but paused”).  
- **stopNavigation**: zatrzymuje nawigację i czyści aktualny cel nawigacyjny; nie musi anulować taska (zależne od core, ale UI traktuje to jako akcję „duża, ale mniej destrukcyjna niż cancel”).  
- **cancelTask**: anuluje aktualny task (destrukcyjne, wymaga potwierdzenia).  

`FMUI-TERM-007` UI **MUST** używać w UI tylko tych trzech „pojęć akcji” (pause/resume, stop navigation, cancel task) i mapować je do backendu przez DataSource.

### 2.5 Słownik labeli i nazewnictwo w UI (spójność)

Ta sekcja redukuje ryzyko, że w różnych miejscach UI pojawią się 2–3 synonimy na to samo (co rozwala ergonomię i utrudnia pracę z AI).

`FMUI-LABEL-001` UI **MUST** używać dokładnie tych labeli (PL; EN opcjonalnie później) w kluczowych miejscach:

**Header / global:**
- Status połączenia: `Connected`, `Stale`, `Offline` (w PL odpowiednio: `Połączono`, `Dane nieaktualne`, `Brak połączenia`)
- Toggle trybu: `Operate` / `Read‑only` (lub „Uzbrojone” / „Podgląd” — ale jedna para, konsekwentnie)
- Drawer zdarzeń: `Alerty` / `Zdarzenia`

**Mapa:**
- Przyciski: `Dopasuj` (Fit), `Reset view`
- Tooltip skrótów: `Skróty` / `Pomoc`
- Menu mapy: `Dodaj przeszkodę`, `Usuń przeszkodę`
- Menu pola: `Zajęte`, `Zablokowane`, `Odblokuj`

**Roboty / komendy:**
- Komendy: `Pauza`, `Wznów` (jeśli istnieje), `Stop`, `Anuluj zadanie`
- Statusy: `Idle`, `Moving`, `Paused`, `Blocked`, `Error` (z mapowaniem do PL, jeśli UI jest PL)

`FMUI-LABEL-002` Nazwy w kodzie (`status`, `mode`, `capabilities`) **MUST** mieć 1:1 mapowanie do labeli w UI (słownik w jednym miejscu, np. `labels.ts`).


---

## 3. Architektura informacji (IA) i nawigacja

### 3.1 Układ główny (zachować z prototypu)

- `FMUI-LAYOUT-001` UI **MUST** zachować layout 3‑częściowy:
  - lewy sidebar,
  - header,
  - panel treści (pojedynczy aktywny widok).

### 3.2 Sidebar (MUST)

- Logo + nazwa aplikacji.
- Lista widoków (z ikoną i etykietą).
- Przycisk wylogowania (lub profil).

`FMUI-LAYOUT-002` Sidebar **MUST** jednoznacznie wskazywać aktywny widok.  
`FMUI-LAYOUT-003` Sidebar **SHOULD** umożliwiać zwinięcie (ikony) przy mniejszej szerokości.

### 3.3 Lista widoków (MUST)

1. **Mapa** — realtime mapa grafu, worksites, roboty, przeszkody, operowanie manual.  
2. **Roboty** — tabela/lista robotów + podgląd + akcje przez menu/drawer.  
3. **Pola** — lista worksites (pick/drop) + stany (filled/empty/blocked).  
4. **Bufory** — UI buforów opakowań + edycja komórek + zgłoszenia linii (mock może uprościć).  
5. **Streamy** — konfiguracja i stan strumieni.  
6. **Sceny** — lista scen i map, aktywacja sceny/mapy.  
7. **Ustawienia** — źródło danych (mock/live), parametry symulatora, parametry algorytmów (UI), seed/debug.  
8. **Zadania** — lista tasków, status/phase, relacja pick→drop, robot, stream.  
9. **Diagnostyka** — widok blokad/locków/kolejek/stalli + powiązanie z mapą.  
10. **Awarie** — narzędzia do wstrzykiwania problemów (TYLKO w Mock/Sim; w Live ukryte).

### 3.4 Header: meta i bezpieczeństwo (MUST)

Header ma zawsze pokazywać:
- Tytuł widoku + 1‑zdaniowy opis.
- Status połączenia: `Connected / Stale / No connection` + „age” ostatniej aktualizacji (tooltip: timestamp).
- Kontekst sceny/mapy: `Scene: <name>` + `Map: <name>` (nawet jeśli w MVP jest jedna — future‑proof).
- Przełącznik **Operate / Read‑only** (z czytelnym stanem i tooltipem).
- Ikona alertów (dzwonek) otwierająca **Event/Alert drawer**.
- Użytkownik (login + rola).

`FMUI-LAYOUT-004` Header **MUST** utrzymywać stały układ niezależnie od widoku (żeby operator nie „gubił się”).  
`FMUI-LAYOUT-005` Operate toggle **MUST** być globalny i zawsze widoczny.

---

## 4. Styl wizualny, design tokens i dostępność

### 4.1 Kierunek wizualny (MUST)

Zachować “Nowy Styl” z prototypu:
- jasny, ciepły gradient tła,
- karty/panele z miękkimi zaokrągleniami,
- cienkie linie obramowania,
- delikatne cienie,
- akcent pomarańczowy + turkus jako status OK,
- typografia: **Space Grotesk** (lub zamiennik sans-serif).

### 4.2 Tokeny (bazowy zestaw)

**Kolory (kompatybilne z prototypem):**
- `--bg`: #f3efe6  
- `--bg-deep`: #e3d5bf  
- `--panel`: #fbfaf8  
- `--ink`: #1d1a17  
- `--muted`: #6b6055  
- `--accent`: #dd6a1f  
- `--accent-soft`: #f6b88f  
- `--teal`: #1b9aaa  
- `--line`: rgba(32, 26, 22, 0.12)  
- `--shadow`: 0 24px 60px rgba(25, 16, 6, 0.18)

**Promienie:**
- `r-sm`: 12px (przyciski/fieldy)  
- `r-md`: 18px (karty)  
- `r-lg`: 24px (panele, sidebar)  
- `r-pill`: 999px (badge/pill)

**Spacing (skala):**
- 6, 10, 12, 14, 16, 18, 24, 32 px.

### 4.2.1 Typografia (tokeny; wartości bazowe z prototypu)

`FMUI-TYPO-001` UI **MUST** używać jednej rodziny fontów (bez miksowania) w całej aplikacji.

Rekomendowane tokeny (CSS variables lub odpowiednik w TS):

- `--font-family-sans: "Space Grotesk", system-ui, -apple-system, Segoe UI, Roboto, sans-serif;`
- `--font-weight-regular: 400;`
- `--font-weight-semibold: 600;`
- `--font-weight-bold: 700;`

Skala rozmiarów (z prototypu / bezpieczne defaulty):
- `--font-size-xs: 12px;` (meta, badge)
- `--font-size-sm: 13px;` (tabele, legendy)
- `--font-size-md: 14px;` (tekst bazowy, inputy)
- `--font-size-lg: 16px;` (nagłówki kart/paneli)
- `--font-size-xl: 20px;` (brand title)
- `--font-size-2xl: 28px;` (nagłówek widoku w headerze)

Line-height:
- `--line-height-tight: 1.15;`
- `--line-height-normal: 1.35;`
- `--line-height-loose: 1.55;`

#### 4.2.2 Layout constants (pixel‑baseline z prototypu)

Te wartości są „bazą referencyjną”, żeby nowy mock wyglądał i „klikał się” jak prototyp.

- `--layout-app-max-width: 1320px;`
- `--layout-app-min-height: 860px;`
- `--layout-shell-padding: 32px;`
- `--layout-grid-gap: 24px;`
- `--layout-sidebar-width: 240px;`
- `--layout-sidebar-padding: 24px;`
- `--layout-panel-padding: 24px;`
- `--layout-panel-radius: 24px;`
- `--layout-map-min-height: 420px;`
- `--layout-map-radius: 20px;`
- `--layout-minimap-width: 190px;`
- `--layout-minimap-height: 140px;`
- `--layout-minimap-padding: 10px;`
- `--layout-minimap-offset: 16px;` (od prawego/dolnego rogu)
- `--layout-help-tooltip-width: 200px;`

Tabela Roboty (bazowe):
- `--table-font-size: 13px;`
- `--table-cell-padding-y: 12px;`
- `--table-cell-padding-x: 10px;`
- `--table-row-hover-bg: rgba(221, 106, 31, 0.06);`

#### 4.2.3 Motion, warstwy i „z-index”

- `--motion-fast: 0.2s;` (hover, tooltip)
- `--motion-medium: 0.4s;` (panel enter)
- `--motion-slow: 0.6s;` (login fade)

Proponowana hierarchia z-index (żeby uniknąć „tooltip pod modalem”):
- `--z-base: 0;`
- `--z-sticky: 10;` (np. header w table)
- `--z-dropdown: 100;`
- `--z-tooltip: 200;`
- `--z-overlay: 900;` (offline/stale)
- `--z-modal: 1000;`
- `--z-toast: 1100;`

#### 4.2.4 Tokeny mapy (wartości referencyjne z prototypu)

Te tokeny są w „jednostkach mapy” (metry / jednostki grafu), nie w px.

- `MAP_OUTER_MARGIN = 10`
- `ROBOT_RADIUS = 0.6`
- `OBSTACLE_RADIUS = 0.8`
- `LABEL_SIZE_PX = 40`, `LABEL_OFFSET_PX = 40`
- `NODE_LABEL_SIZE_PX = 40`, `NODE_LABEL_OFFSET_PX = -40`
- `LABEL_MIN_ZOOM = 1` (prototyp: etykiety od tego progu)

### 4.3 Minimalne wymagania dostępności (A11y) i ergonomii

- `FMUI-A11Y-001` UI **MUST** mieć widoczny focus ring dla elementów interaktywnych (klawiatura).  
- `FMUI-A11Y-002` UI **MUST** wspierać nawigację klawiaturą:
  - `Tab/Shift+Tab` (focus),
  - `Enter/Space` (aktywacja),
  - `Esc` (zamykanie modali/drawerów/menu).  
- `FMUI-A11Y-003` UI **MUST** zapewnić minimalny kontrast tekstu do tła dla elementów krytycznych (preferencja: WCAG AA).  
- `FMUI-A11Y-004` Elementy typu menu kontekstowe i modal **MUST** mieć poprawne aria role/label i focus trap.  
- `FMUI-A11Y-005` UI **SHOULD** oferować tryb „duży ekran / wallboard” (czytelne karty, brak akcji).

**Kryteria akceptacji (AC-A11Y-001):**
- Da się obsłużyć: otwarcie menu, wybór akcji, zamknięcie (Esc) bez myszy.
- Fokus nie „gubi się” po zamknięciu modala (wraca do przycisku, który go otworzył).

### 4.4 Breakpointy / responsywność

- `FMUI-RESP-001` UI **MUST** działać poprawnie w 1366×768 (minimum operatorskie).  
- `FMUI-RESP-002` UI **SHOULD** optymalizować układ dla dużych ekranów (1920×1080 i wyżej).  
- `FMUI-RESP-003` Widok Roboty **MUST** mieć strategię dla wąskich ekranów (horyzontalny scroll tabeli lub przejście na cards).

---

## 5. Design system — komponenty i ich mini‑API

Poniżej komponenty, które **MUST** istnieć w mocku (nawet jeśli proste). To jest katalog do implementacji.

> Uwaga: tu opisujemy zachowanie i interfejs komponentów; szczegółowy wygląd wynika z tokenów.

### 5.1 Card

- `FMUI-DS-001` `Card` **MUST** wspierać: `title`, `meta`, `body`, `actions` oraz stan `selected`.  
- `FMUI-DS-002` `Card` **SHOULD** mieć wariant „compact” (dla list).

### 5.2 Buttons

Warianty:
- `PrimaryButton`
- `GhostButton`
- `DangerButton`
- `ToggleButton`

Wspólne wymagania:
- `FMUI-DS-010` Każdy przycisk **MUST** mieć stan `disabled` i `busy` (spinner/zmiana tekstu).  
- `FMUI-DS-011` Każdy przycisk **SHOULD** pokazywać tooltip, gdy disabled (dlaczego).  

### 5.3 Badge / Pill

- `FMUI-DS-020` `Pill` **MUST** wspierać warianty: neutral/success/warn/danger oraz ikonę (opcjonalnie).  
- `FMUI-DS-021` `Pill` **MUST** mieć czytelny tekst (nie tylko kolor).

### 5.4 Toast / Snackbar + Event/Alert log

- `FMUI-DS-030` UI **MUST** pokazywać toast po: sukcesie komendy, błędzie komendy, zmianie trybu danych, aktywacji sceny.  
- `FMUI-DS-031` Toast **SHOULD** znikać automatycznie (4–6s) i mieć możliwość zamknięcia.  
- `FMUI-DS-032` Wszystkie toasty i zdarzenia **MUST** trafiać do trwałej listy w Event/Alert drawer (historia ostatnich N zdarzeń).

### 5.5 Modal potwierdzeń

- `FMUI-DS-040` Modal potwierdzeń **MUST** być używany dla akcji ryzykownych: stopNavigation, cancelTask, setManualMode w LIVE, activateScene, przełączenie LIVE.  
- `FMUI-DS-041` Modal **MUST** jasno komunikować: co się stanie, na jakim zasobie, czy odwracalne, oraz pokazać poziom ryzyka (np. ikona „Danger”).  
- `FMUI-DS-042` W trybie produkcyjnym modal **MAY** wymagać wpisania powodu (pole tekstowe); w mocku dopuszczalny placeholder.

### 5.6 Drawer / panel szczegółów

- `FMUI-DS-050` Drawer **MUST** istnieć dla robota: klik w robota w tabeli lub na mapie otwiera drawer (podgląd).  
- `FMUI-DS-051` Drawer **MUST NOT** wysyłać komend po otwarciu (czysty podgląd).  
- `FMUI-DS-052` Drawer **SHOULD** zawierać quick links: „Zobacz na mapie”, „Zobacz task”, „Zobacz diag”.

### 5.7 Table

- `FMUI-DS-060` `Table` **MUST** wspierać: sticky header, sortowanie, filtr tekstowy, stan loading (skeleton), stan empty, stan error.  
- `FMUI-DS-061` `Table` **SHOULD** mieć wirtualizację od progu N (konfigurowalne).

---


### 5.8 Konwencje nazewnictwa i „kanoniczne słowniki” (AI‑friendly)

Ta sekcja jest po to, żeby implementacja (człowiek i AI) nie rozjechała się na nazewnictwie.

#### 5.8.1 Nazwy komponentów

- Prefiks komponentów aplikacji: `Fm` (np. `FmHeader`, `FmSidebar`, `FmRobotTable`, `FmMapView`).  
- Komponenty design systemu: `Ds` (np. `DsButton`, `DsModalConfirm`, `DsToast`, `DsDrawer`).  
- Hooki: `use...` (np. `useConnectionState`, `useFleetState`, `useCommandQueue`).  
- Pliki z kontraktami/schemami: `schema/*.ts`, `contracts/*.ts`, `fixtures/*.json`.

`FMUI-AI-001` Projekt **MUST** utrzymywać spójne nazewnictwo komponentów, żeby łatwo było generować i refaktorować kod.

#### 5.8.2 Nazwy zdarzeń (event types) w UI

Zdarzenia w Event/Alert log mają typy (string) — UI używa ich także w mocku:

- `connection.connected`
- `connection.stale`
- `connection.offline`
- `data.error`
- `command.sent`
- `command.ack`
- `command.result`
- `scene.activated`
- `obstacle.added`
- `obstacle.removed`
- `robot.selected`
- `robot.manualTargetSet`

`FMUI-AI-002` UI **SHOULD** używać powyższych typów eventów konsekwentnie (łatwiejsze testy i integracja).

#### 5.8.3 Kanoniczne statusy (enumy UI)

UI operuje na spójnych enumach (nie „luźnych stringach”):

- `ConnectionState = "connected" | "stale" | "offline" | "connecting"`
- `OperateState = "readOnly" | "operate"`
- `CommandStatus = "pending" | "accepted" | "succeeded" | "failed" | "unknown"`

`FMUI-AI-003` Te enumy **MUST** istnieć w kodzie (wspólne dla mock/live).

### 5.9 Minimalne kontrakty komponentów (props/events/states)

To nie jest pełny design system, ale minimalny „kompas” dla implementacji.

#### 5.9.1 `DsModalConfirm`

**Props (TypeScript):**
```ts
type DsModalConfirmProps = {
  open: boolean;
  title: string;
  message: string;
  danger?: boolean;          // visual severity
  requireReason?: boolean;   // w produkcji może być true
  confirmText?: string;
  cancelText?: string;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
};
```

**States:**
- `open/closed`
- `busy` podczas wysyłania komendy (przycisk confirm disabled + spinner)

#### 5.9.2 `FmOperateToggle`

```ts
type FmOperateToggleProps = {
  state: "readOnly" | "operate";
  disabled?: boolean; // np. offline/stale
  reasonDisabled?: string;
  onToggle: (next: "readOnly" | "operate") => void;
};
```

#### 5.9.3 `FmEventDrawer`

```ts
type EventSeverity = "info" | "success" | "warn" | "danger";

type FmEventItem = {
  id: string;
  ts: number;
  type: string;              // np. "command.result"
  severity: EventSeverity;
  title: string;
  details?: string;
  entity?: { kind: "robot" | "task" | "worksite" | "scene"; id: string };
  commandId?: string;
};

type FmEventDrawerProps = {
  open: boolean;
  items: FmEventItem[];
  filters: {
    severity?: EventSeverity[];
    types?: string[];
    entityId?: string;
  };
  onClose: () => void;
  onClear?: () => void;
  onFilterChange?: (filters: FmEventDrawerProps["filters"]) => void;
};
```

#### 5.9.4 `FmActionsMenu`

- Wspólny komponent menu akcji (⋯) używany w tabelach i na mapie.
- **MUST** wspierać disabled + tooltip per item.

`FMUI-AI-010` Kluczowe komponenty (ModalConfirm, OperateToggle, EventDrawer, ActionsMenu) **MUST** mieć jawne kontrakty propsów, bo to najszybciej redukuje „dryf implementacyjny”.


## 6. Zachowania globalne: sesja, połączenie, błędy, komendy

### 6.1 Sesja i logowanie

- `FMUI-AUTH-001` UI **MUST** mieć ekran logowania (user, password, submit, miejsce na błąd).  
- `FMUI-AUTH-002` UI **SHOULD** pamiętać sesję; w mocku dopuszczalny LocalStorage z TTL.

### 6.2 Połączenie: health, stale, offline

#### 6.2.1 Kanoniczne endpointy (dla LIVE)

UI nie implementuje core, ale potrzebuje stabilnego kontraktu:

- `GET /api/v1/health` — lekki healthcheck (transport OK)  
- `GET /api/v1/fleet/state` — snapshot stanu (dane domenowe)  
- `GET /api/v1/fleet/events` — SSE (event stream, opcjonalnie)  

`FMUI-CONN-001` UI **MUST** używać jednego kanonicznego healthchecku do ustalania `No connection`.  
`FMUI-CONN-002` UI **MUST** rozdzielać: transport (health) od danych domenowych (state/events).

#### 6.2.2 Parametry czasowe (domyślne)

- `healthIntervalMs`: 1000 ms  
- `offlineAfterMs`: 2000 ms (brak udanego healthchecku)  
- `expectedStateIntervalMs`: 250–1000 ms (zależnie od SSE/polling)  
- `staleAfterMs`: 3000 ms (brak aktualizacji state/events przy health OK)

`FMUI-CONN-003` UI **MUST** pokazać overlay “Brak połączenia” dopiero po `offlineAfterMs`.  
`FMUI-CONN-004` UI **MUST** pokazać stan `Stale` po `staleAfterMs` bez update danych przy health OK.

#### 6.2.3 UI w stanach połączenia

- `FMUI-CONN-010` W `No connection`: wszystkie akcje wysyłające komendy **MUST** być disabled, a aplikacja pokazuje overlay + przycisk „Retry now”.  
- `FMUI-CONN-011` W `Stale`: UI **MUST** wyłączyć Operate (powrót do Read‑only) i oznaczyć dane jako potencjalnie nieaktualne.  
- `FMUI-CONN-012` UI **MUST NOT** przeładowywać się na błąd backendu; ewentualny reload tylko po zmianie `buildId` i tylko po reconnect.

#### 6.2.4 Matryca degradacji (connected/stale/offline/auth/data)

Ten fragment jest „anty‑chaosowy”: definiuje dokładnie, co UI robi w typowych awariach, żeby użytkownik nie musiał zgadywać.

| Sytuacja | Warunek (przykład) | Co pokazuje UI | Operate / akcje | Jak wraca do normalności |
|---|---|---|---|---|
| **Connected (fresh)** | health OK + update state/events < `staleAfterMs` | zielony status, `age` rośnie od 0 | Operate dostępny (ale domyślnie OFF) | bez akcji |
| **Stale** | health OK, ale brak update state/events ≥ `staleAfterMs` | żółty status + badge „STALE”, `age` na żółto | `Operate` **MUST** auto‑OFF; akcje write disabled; UI pokazuje ostatni snapshot jako „stary” | automatycznie po pierwszym świeżym update; manualnie „Retry now” |
| **Offline (No connection)** | health FAIL ≥ `offlineAfterMs` | overlay „Brak połączenia” + ostatni snapshot wyszarzony | `Operate` auto‑OFF; wszystkie write disabled; read‑only nadal działa (filtry, selekcja) | automatycznie po health OK; przycisk „Retry now” |
| **Auth expired / 401** | health/state zwraca 401/403 | banner „Sesja wygasła” + CTA „Zaloguj” | write disabled; opcjonalnie read‑only z cache | przejście do login (bez utraty ustawień UI) |
| **Data error (validation)** | payload nie przechodzi Zod | toast + wpis w „Alert drawer”; widok pokazuje „Data error” zamiast crasha | write disabled tylko jeśli dotyczy krytycznych pól; w innym wypadku selektywne | po naprawie payloadów lub po przełączeniu na MOCK/inną scenę |
| **Partial data** | część pól brakująca (tolerowane) | UI pokazuje brak jako `—` + tooltip „brak danych” | akcje zależą od capabilities; brakujące pole nie blokuje całej aplikacji | automatycznie |

`FMUI-CONN-020` UI **MUST** mieć jeden centralny „ConnectionStore” obliczający stan (Connected/Stale/Offline/Auth/DataError) i udostępniający go headerowi oraz widokom.  
`FMUI-CONN-021` UI **MUST** wymuszać Read‑only, gdy stan ≠ Connected(fresh).  
`FMUI-CONN-022` UI **SHOULD** umożliwić ręczny „Retry now” (health + state), ale bez spamowania backendu (debounce).

### 6.3 Błędy danych i runtime validation

- `FMUI-ERR-001` UI **MUST** walidować krytyczne payloady runtime (Robot/Task/Worksite/FleetState) i obsłużyć błędy walidacji bez crasha.  
- `FMUI-ERR-002` Błędy walidacji **MUST** trafiać do Event/Alert log (typ: `data.error`) z minimalnym opisem (bez spamowania).  
- `FMUI-ERR-003` UI **MUST** stosować Error Boundaries: globalny + per‑view (Mapa ma fallback, Roboty nadal działają).

### 6.4 Komendy: semantyka, ACK vs efekt, idempotency, retry

#### 6.4.1 Model komendy (UI-facing)

- `FMUI-CMD-001` UI **MUST** generować `commandId` (UUID) dla każdej komendy i pokazywać go w logu/tooltipie.  
- `FMUI-CMD-002` UI **MUST** odróżniać:
  - **ACK transportowy** (komenda przyjęta do przetworzenia),
  - od **efektu w świecie** (komenda wykonana/odrzucona).  

`FMUI-CMD-003` UI **MUST** pokazywać stan komendy jako:
- `pending` (czekam na ACK),
- `accepted` (ACK otrzymany),
- `succeeded` / `failed` (wynik),
- `unknown` (timeout bez wyniku).

#### 6.4.2 Retry / backoff (tylko transportowe)

- `FMUI-CMD-010` UI **MUST NOT** wysyłać w pętli tej samej komendy bez kontroli (przycisk busy, debounce).  
- `FMUI-CMD-011` UI **SHOULD** wspierać retry dla błędów transportowych z backoff (0.5s → 1s → 2s → 5s) i limitem prób.  
- `FMUI-CMD-012` Retry **MUST** używać tego samego `commandId` (idempotency) lub jawnego `idempotencyKey`.

### 6.5 Konflikty wielu operatorów

- `FMUI-CONFLICT-001` Jeśli backend zwraca konflikt (np. 409), UI **MUST** pokazać toast: „Stan zmienił się w międzyczasie — odświeżam” i odświeżyć snapshot.  
- `FMUI-CONFLICT-002` UI **SHOULD** pokazywać „controlled by <actor>” jeśli informacja jest dostępna.

### 6.6 Feature flags i capability‑driven UI

- `FMUI-CAP-001` UI **MUST** bazować reguły disabled na `capabilities` (per robot i/lub globalnie), a nie na hardcode.  
- `FMUI-CAP-002` UI **SHOULD** wspierać feature flags (np. brak manual drive w danej instalacji).

### 6.7 i18n i formatowanie

- `FMUI-I18N-001` UI **SHOULD** trzymać wszystkie teksty w słowniku (dictionary), nawet jeśli na start tylko PL.  
- `FMUI-I18N-002` UI **MUST** formatować liczby, jednostki i czas przez jedną warstwę (np. `format.ts`), aby nie rozjechały się „sekundy vs ms”.

### 6.8 UI state vs domain state (persistencja)

- `FMUI-STATE-001` UI **MUST** jawnie rozdzielić:
  - state domenowy (snapshot/eventy),
  - state UI (selection, otwarte menu, filtry),
  - state sesji/połączenia (connected/stale/offline).  
- `FMUI-STATE-002` UI **MUST** persystować tylko preferencje: filtry, widoczność warstw mapy, layout tabeli.  
- `FMUI-STATE-003` UI **MUST NOT** persystować stanów ryzykownych: Operate=ON, manual target, itp. (po odświeżeniu wraca do bezpiecznego defaultu).

---


### 6.9 Event/Alert drawer (globalny log zdarzeń)

To jest „pamięć operacyjna” UI. Toasty są ulotne, a operator potrzebuje historii.

#### 6.9.1 Zasady

- `FMUI-EVENTS-001` UI **MUST** utrzymywać listę ostatnich N zdarzeń (domyślnie N=200).  
- `FMUI-EVENTS-002` Każdy toast **MUST** równolegle dodawać wpis do logu.  
- `FMUI-EVENTS-003` Log **MUST** zawierać co najmniej:
  - typ zdarzenia,
  - severity,
  - tytuł i szczegóły,
  - timestamp + age,
  - powiązanie z encją (robot/task/worksite),
  - `commandId` (jeśli dotyczy komendy).  
- `FMUI-EVENTS-004` UI **SHOULD** umożliwiać filtrowanie logu: severity, typ, robot/task id.  
- `FMUI-EVENTS-005` UI **MAY** umożliwiać eksport logu do JSON (przydatne w uruchomieniach).

#### 6.9.2 UI/UX

- Ikona dzwonka w headerze pokazuje badge z liczbą „unread” (od ostatniego otwarcia drawer).  
- Drawer otwiera się z prawej (lub jako modal na małych ekranach).  
- Element listy ma:
  - ikonę severity,
  - tytuł (1 linia),
  - szczegóły (do 2 linii, reszta w „expand”),
  - „age” + tooltip z timestamp,
  - linki akcji kontekstowych (np. „Pokaż robota”, „Pokaż na mapie”).

**Kryteria akceptacji (AC-EVENTS-001):**
- Każdy błąd połączenia, błąd danych i komenda ma wpis w logu.
- Klik w wpis z `entity=robot` otwiera drawer robota i/lub centruje mapę (jeśli user wybierze akcję).

### 6.10 Kluczowe flows operatorskie (testowalne scenariusze)

Poniższe flow opisują „jak operator używa UI”. Są równocześnie świetnymi scenariuszami testów (manualnych i automatycznych).

#### Flow 1 — „Robot zablokowany” (Mapa → Diagnostyka → akcja)

**Preconditions:** Connection=Connected, Operate=OFF (Read‑only).  
**Kroki:**
1) Operator widzi w headerze badge alertów >0 i na mapie marker robota z problemem (blocked/stalled).  
2) Klik w robota → otwiera drawer (selected).  
3) W drawerze operator klika „Pokaż diag” → przechodzi do Diagnostyki z highlight.  
4) Operator wraca do Mapy, klika „Operate ON” (uzbraja).  
5) Operator dodaje przeszkodę (block/avoid) lub pauzuje nawigację.

**Expected feedback:** toast + wpis w logu + stan pending/accepted/result.  
**Failure paths:** offline/stale w kroku 4 → Operate automatycznie OFF, akcje disabled + tooltip.

#### Flow 2 — „Manual go-to point” (Roboty → Set manual target → Action point)

**Preconditions:** Operate=ON, robot ma capability canManual/canGoToPoint.  
**Kroki:**
1) W Roboty operator wybiera robota → drawer.  
2) Klik „Set as manual target”.  
3) Włącza manualMode (w LIVE: modal confirm).  
4) Na Mapie klika action point → manual menu → „Jedź + Load”.

**Expected feedback:** UI pokazuje manual target ring, toast, log, status komendy.  
**Failure paths:** robot controlled by someone else → przycisk disabled + informacja „controlled by …”.

#### Flow 3 — „Dodaj przeszkodę z Undo” (Mapa)

**Preconditions:** Operate=ON.  
**Kroki:**
1) Prawy klik na mapie → „Dodaj przeszkodę (block)”.  
2) UI dodaje obstacle (optimistic) + toast z przyciskiem Undo.  
3) Operator klika Undo → obstacle znika, UI wysyła komendę remove.

**Expected feedback:** oba kroki zapisane w logu.  
**Failure paths:** komenda remove fail → UI przywraca obstacle i pokazuje błąd.

#### Flow 4 — „Pause vs Stop vs Cancel” (Nav Controls)

**Preconditions:** robot ma aktywny task.  
**Kroki:**
1) Operator klika Pause → natychmiast widzi stan „pending”.  
2) Operator klika Stop navigation → modal confirm.  
3) Operator klika Cancel task → modal confirm z ostrzeżeniem.

**Expected feedback:** UI rozróżnia efekty; nazwy akcji są jednoznaczne.  
**Failure paths:** stale → Operate OFF, akcje disabled.

#### Flow 5 — „Przełączenie sceny/mapy” (Sceny)

**Preconditions:** rola Engineer/Admin w LIVE lub dowolna w MOCK.  
**Kroki:**
1) Operator otwiera Sceny i klika „Aktywuj”.  
2) Modal confirm → potwierdza.  
3) UI pokazuje loading, a po sukcesie: odświeża state i mapę.

**Failure paths:** błąd aktywacji → UI zostaje na starej scenie i pokazuje błąd.

#### Flow 6 — „Utrata połączenia” (global)

**Preconditions:** Connected.  
**Kroki:**
1) Symulujemy brak healthchecku >2s.  
2) UI pokazuje overlay „Brak połączenia”, Operate OFF.  
3) Po reconnect UI wraca do Connected, ale nadal Operate=OFF.

**Expected feedback:** wpisy w logu connection.offline/connected.

#### Flow 7 — „Błąd danych” (runtime validation)

**Preconditions:** backend/mock wysyła payload z brakującym polem krytycznym.  
**Kroki:**
1) UI wykrywa błąd walidacji.  
2) UI nie crashuje; pokazuje „Data error” na widoku, loguje zdarzenie.  
3) Inne widoki nadal działają.

#### Flow 8 — „Awarie w mocku” (Awarie → Mapa)

**Preconditions:** MOCK.  
**Kroki:**
1) Operator wstrzykuje „Robot zablokowany”.  
2) Mapa/Roboty od razu pokazują problem.  
3) Operator klika Undo → problem znika.

`FMUI-FLOWS-001` Te flows **SHOULD** być traktowane jako „Definition of Done” dla prototypu UX (przynajmniej w mocku).


## 7. Widok: Mapa

### 7.0 Wymagania minimalne (MUST)

- `FMUI-MAP-001` Widok mapy **MUST** zawierać: mapę SVG + minimapę + legendę/akcje + drawer robota (wspólny).  
- `FMUI-MAP-002` Widok mapy **MUST** działać w dwóch trybach:
  - Observe (Read‑only),
  - Operate (po uzbrojeniu).  
- `FMUI-MAP-003` Mapa **MUST** wspierać pan/zoom i przyciski Fit/Reset.  
- `FMUI-MAP-004` Menu kontekstowe mapy (prawy klik) **MUST** respektować tryb Read‑only/Operate.  
- `FMUI-MAP-005` Dodawanie/usuwanie przeszkód **MUST** mieć Undo lub potwierdzenie usunięcia.

### 7.1 Layout widoku mapy (jak prototyp)

Widok mapy zawiera:
- nagłówek panelu: tytuł + opis,
- po prawej: legenda i akcje mapy,
- pod nagłówkiem: (a) **Nav Controls** (pauza/stop/cancel), (b) **Manual Drive**, oba chowane,
- główna część: **mapWrap** z mapą SVG, menu kontekstowymi i minimapą.

### 7.2 Tryby: Observe vs Operate

- Observe (domyślnie w LIVE): selekcja obiektów, podgląd, brak komend.  
- Operate: aktywne akcje (manual/obstacles/go‑to/pause/stop), zawsze z feedbackiem i potwierdzeniami.

`FMUI-MAP-010` UI **MUST** wizualnie oznaczać tryb Operate (np. badge „OPERATE” w headerze + akcent koloru).  
`FMUI-MAP-011` Przejście do Operate **MUST** wymagać świadomego kliknięcia toggle (brak auto‑enable).  
`FMUI-MAP-012` W Operate przy braku manual target robota, akcje manual **MUST** być disabled z tooltipem.

### 7.3 Warstwy mapy (rendering order)

Warstwy mapy **MUST** mieć stałą kolejność (od spodu do góry):
1. Krawędzie grafu (edges/corridors).  
2. Linki worksite→action point (jeśli istnieją).  
3. Przeszkody (obstacles: block/avoid).  
4. Węzły i etykiety węzłów (opcjonalnie, zależnie od zoomu).  
5. Action points (punkty akcji do manualnych komend).  
6. Worksites (pick/drop) + ring + label.  
7. Roboty (markery).  
8. UI overlays (menu, tooltips).

### 7.4 Pan/Zoom + skróty — kontrakt interakcji (1:1 z prototypu)

Ten fragment jest krytyczny dla „feelingu” UI. W MVP mocku **domyślnie** trzymamy się zachowania prototypu 1:1 (żeby użytkownicy „wiedzieli jak klikać”).

#### 7.4.1 Model viewportu (SVG `viewBox`)

Mapa jest renderowana w `<svg>` i sterowana przez `viewBox`.

Minimalny stan viewportu (nazwa przykładowa: `MapViewportState`):

- `x, y, width, height` — aktualny `viewBox`
- `baseWidth, baseHeight` — bazowe wymiary mapy (bez marginesu)
- `minWidth` — minimalna szerokość viewBox (maksymalny zoom-in)
- `maxWidth, maxHeight` — maksymalny viewBox (maksymalny zoom-out)
- `offsetX, offsetY` — przesunięcie do „świata” (granice grafu)

W prototypie:
- `MAP_OUTER_MARGIN = 10`
- startowy viewport: `x = -MAP_OUTER_MARGIN`, `y = -MAP_OUTER_MARGIN`, `width = baseWidth + 2*MAP_OUTER_MARGIN`, `height = baseHeight + 2*MAP_OUTER_MARGIN`
- „Reset view”: `x = 0`, `y = 0`, `width = baseWidth`, `height = baseHeight`

`FMUI-MAP-110` UI **MUST** trzymać viewport mapy w jednym, jawnym stanie (a nie „rozlany” po DOM).  
`FMUI-MAP-111` `viewBox` **MUST** być jedynym mechanizmem zoom/pan (bez dodatkowych transformacji CSS), żeby uniknąć driftu.

#### 7.4.2 Układ współrzędnych: `project` / `unproject` (prototyp)

W prototypie oś Y jest odwrócona (SVG rośnie w dół). Kontrakt:

- `projectPoint({x,y}) -> { x: x - offsetX, y: offsetY - y }`
- `unprojectPoint({x,y}) -> { x: x + offsetX, y: offsetY - y }`

`FMUI-MAP-112` UI **MUST** jawnie dokumentować i testować to mapowanie (łatwo o błąd „mirror Y”).

#### 7.4.3 Wheel zoom: zoom pod kursorem (anchor) — dokładna matematyka

Zdarzenie `wheel`:
- `event.preventDefault()` (żeby strona nie scrollowała)
- `factor = event.deltaY > 0 ? 1.05 : 0.95`  *(prototyp)*
- `center = getSvgPoint(event)` — punkt w układzie SVG (screen → svg)
- `applyZoom(factor, center)`

Pseudokod `applyZoom` (zgodny z prototypem):

```ts
function applyZoom(factor: number, center: {x:number;y:number}) {
  // factor mnoży aktualne width/height viewBox
  const minScale = viewport.minWidth / viewport.width;
  const maxScaleW = viewport.maxWidth / viewport.width;
  const maxScaleH = viewport.maxHeight / viewport.height;
  const scale = clamp(factor, minScale, Math.min(maxScaleW, maxScaleH));
  if (scale === 1) return;

  const newWidth = viewport.width * scale;
  const newHeight = viewport.height * scale;

  viewport.x = center.x - (center.x - viewport.x) * scale;
  viewport.y = center.y - (center.y - viewport.y) * scale;
  viewport.width = newWidth;
  viewport.height = newHeight;

  clampViewport();
  updateViewBoxAttr();
}
```

`FMUI-MAP-113` Wheel zoom **MUST** zachowywać punkt pod kursorem (brak „uciekania” mapy).

#### 7.4.4 Pan (drag LMB): matematyka

Zdarzenia pointer:
- `pointerdown` (LMB) na pustym obszarze mapy zaczyna pan.
- `pointermove` liczy przesunięcie w jednostkach viewBox:

```ts
const dx = ((clientX - startX) / rect.width) * viewport.width;
const dy = ((clientY - startY) / rect.height) * viewport.height;
viewport.x = startViewX - dx;
viewport.y = startViewY - dy;
```

- `pointerup/pointercancel` kończy pan.

`FMUI-MAP-114` Podczas panowania kursor **MUST** zmienić się na „grabbing” (jak w prototypie).  
`FMUI-MAP-115` Pan **MUST NOT** startować, gdy pointerdown był na markerze robota/worksite/przeszkody (żeby klik nie „przeskakiwał”).

#### 7.4.5 Clamp viewportu (żeby nie uciec w kosmos)

W prototypie viewport jest przycinany (po każdej zmianie):

- `x ∈ [-width, baseWidth]`
- `y ∈ [-height, baseHeight]`

`FMUI-MAP-116` UI **MUST** clampować viewport dokładnie w tej logice dla profilu PROTOTYPE (spójność feelingu).

#### 7.4.6 Skróty klawiszowe (prototyp)

Gdy focus nie jest w input/textarea:

- `+` lub `=` → zoom in: `applyZoom(0.9, mapCenter)`
- `-` lub `_` → zoom out: `applyZoom(1.1, mapCenter)`
- `0` → `resetViewBox()`

`FMUI-MAP-117` UI **MUST** obsługiwać skróty mapy i pokazać je w tooltipie „?” (jak w prototypie).

#### 7.4.7 Double click i profile interakcji

Wprowadzamy pojęcie profilu interakcji (żeby pogodzić „wierność prototypu” z przyszłą ergonomią):

- **PROTOTYPE (domyślny dla MVP mocka):** `dblclick` → `resetViewBox()` (tak jest w prototypie).
- **STANDARD (opcjonalny):** `dblclick` → zoom in (np. `applyZoom(0.9, cursor)`).

`FMUI-MAP-118` UI **MUST** mieć ustawienie `mapInteractionProfile` (`prototype|standard`) w Settings i persystować je lokalnie.  
`FMUI-MAP-119` Dla MVP mocka domyślny profil **MUST** być `prototype`.  
`FMUI-MAP-121` Zachowanie `dblclick` **MUST** zależeć od profilu interakcji (a nie być „ukrytym” zachowaniem).

#### 7.4.8 Fit/Reset buttons (z prototypu)

- “Dopasuj” (fit view) — ustawia viewBox tak, by istotne elementy (roboty + worksites) mieściły się w panelu z marginesem (~8% jak w prototypie).
- “Reset view” — resetuje do bazowego viewBox.

`FMUI-MAP-020` UI **MUST** dostarczyć przyciski Fit/Reset zawsze widoczne (w panelu mapy).

**Kryteria akceptacji (AC-MAP-001):**
- Wheel zoom nie przesuwa punktu pod kursorem (subiektywnie i poprzez test manualny: krawędź grafu „stoi” pod myszką).
- Pan ma takie samo „przeliczenie” px→world jak prototyp (ten sam wzór).
- Min/max zoom działa (nie da się powiększyć w nieskończoność).
- `dblclick` w profilu PROTOTYPE resetuje view; w profilu STANDARD robi zoom in.



### 7.5 Minimap

- `FMUI-MAP-030` Minimap **MUST** istnieć w prawym dolnym rogu mapy.  
- Minimap pokazuje:
  - zarys grafu,
  - roboty jako punkty,
  - prostokąt viewportu głównej mapy,
  - możliwość przeciągnięcia viewportu (drag).

### 7.6 Worksites (pick/drop): marker + menu

Zachowanie z prototypu + doprecyzowanie:

- Każdy worksite jest kołem z klasą zależną od:
  - typu: `pick` lub `drop`,
  - occupancy: `filled` lub `empty`,
  - blocked: true/false (dodatkowa klasa).  
- Klik / prawy przycisk na worksite:
  - otwiera **worksite menu** przy kursrorze,
  - menu pozwala ustawić:
    - occupancy: Filled / Unfilled,
    - blocked: Blocked / Unblocked.  

`FMUI-MAP-040` W Operate zmiana w menu worksites **MUST** dawać optimistic update + komenda do backendu (LIVE) + toast.  
`FMUI-MAP-041` W Read‑only menu worksites **MUST** być tylko do podglądu (akcje disabled/ukryte).  
`FMUI-MAP-042` Skala markerów i etykiet **MUST** zależeć od zoomu.

### 7.7 Roboty na mapie (markery)

- Robot to marker kierunkowy (prostokąt + strzałka).  
- Kolor/stan markera **MUST** kodować:
  - manualMode (tryb robota),
  - paused,
  - blocked/stalled,
  - selected (outline),
  - manual target (bardziej wyraźny ring + ikonka „steering”).  

**Interakcja:**
- `FMUI-MAP-050` Klik w robota **MUST**: ustawić `selectedRobotId` + otworzyć drawer szczegółów.  
- `FMUI-MAP-051` Klik w robota **MUST NOT** włączać manualMode ani przejmować kontroli.  
- `FMUI-MAP-052` Ustawienie manual target **MUST** być jawne (przycisk „Set as manual target” w drawerze / w menu akcji).

### 7.8 Manual Menu (Action Points)

- Klik na Action Point otwiera **manual menu**:
  - nagłówek: “Manual: <nazwa robota>”,
  - akcje:
    - “Jedź tutaj” (goto),
    - “Jedź + Load”,
    - “Jedź + Unload”.

`FMUI-MAP-060` Manual menu **MUST** działać tylko, gdy spełnione są warunki:
- Operate=ON,
- istnieje `manualTargetRobotId`,
- robot ma `manualMode=true`,
- robot ma capability `canGoToPoint=true`.

W przeciwnym razie:
- menu się nie otwiera lub przyciski są disabled z tooltipem (przyczyna).

### 7.9 Manual Drive panel (WASD)

- Panel pokazuje:
  - “Sterowanie ręczne”,
  - robot: <id/nazwa>,
  - hint: “WASD / strzałki”,
  - toggle: “Włącz sterowanie” / “Wyłącz sterowanie”.

`FMUI-MAP-070` Manual Drive **MUST** wymagać Operate=ON i manual target.  
`FMUI-MAP-071` W LIVE manual drive **SHOULD** wysyłać komendy motion w ticku (np. 140ms) i mieć wyraźny wskaźnik „armed”.  
`FMUI-MAP-072` Manual Drive **MUST** mieć przycisk „Emergency stop” (w UI: stopNavigation z potwierdzeniem lub szybki stop z podwójnym potwierdzeniem — zależne od polityki safety; w mocku to placeholder).

### 7.10 Map Menu (prawy klik na pustej mapie)

Menu kontekstowe na pustej mapie:
- “Jedź tutaj (punkt XY)” — tylko gdy Operate=ON i manualMode aktywny na manual target,
- “Dodaj przeszkodę (block)” — tylko Operate=ON,
- “Dodaj przeszkodę (avoid)” — tylko Operate=ON.

`FMUI-MAP-080` Dodanie przeszkody **MUST** generować toast + wpis w Event log.  
`FMUI-MAP-081` Usuwanie przeszkody **MUST** mieć Undo (preferowane) lub potwierdzenie (modal mini).

### 7.11 Nav Controls (pause/stop/cancel)

Panel Nav Controls:
- pokazuje, którego robota dotyczy (manual target lub robot z aktywną nawigacją),
- przyciski: Pause/Resume, Stop navigation, Cancel task (jeśli jest task).

`FMUI-MAP-090` `stopNavigation` i `cancelTask` **MUST** wymagać potwierdzenia.  
`FMUI-MAP-091` UI **MUST** używać kanonicznych nazw i konsekwencji (rozdz. 2.4).

### 7.12 Stany widoku mapy (loading/empty/error)

- Loading: skeleton mapy + overlay „Ładowanie mapy…”  
- Empty: komunikat „Brak aktywnej sceny/mapy” + link do Sceny  
- Error: komunikat + przycisk Retry (bez crasha aplikacji)

`FMUI-MAP-100` Widok mapy **MUST** mieć osobny error boundary fallback.

### 7.13 Kryteria akceptacji (Mapa)

- `AC-MAP-001` Double click na mapie powiększa widok (zoom in).  
- `AC-MAP-002` Fit/Reset są dostępne jako przyciski i działają niezależnie od zoom.  
- `AC-MAP-003` Klik w robota tylko selekcjonuje i otwiera drawer; nie wysyła komend.  
- `AC-MAP-004` Operate=OFF powoduje, że menu akcji jest disabled/ukryte, a tooltips wyjaśniają dlaczego.  
- `AC-MAP-005` Dodanie przeszkody tworzy toast + wpis w logu; Undo przywraca stan sprzed akcji.  
- `AC-MAP-006` Stale/Offline automatycznie wyłącza Operate.  
- `AC-MAP-007` Minimap pokazuje viewport i pozwala go przeciągać.

---

## 8. Widok: Roboty

### 8.0 Wymagania minimalne (MUST)

- `FMUI-ROB-001` Widok Roboty **MUST** zawierać: toolbar + tabelę robotów + drawer szczegółów robota.  
- `FMUI-ROB-002` Tabela **MUST** domyślnie sortować „problemy na górę” (offline/stale/blocked/stalled).  
- `FMUI-ROB-003` Akcje sterujące **MUST** być dostępne przez menu akcji (⋯) i/lub w drawerze, a nie przez wiele osobnych kolumn.  
- `FMUI-ROB-004` Akcje w LIVE **MUST** respektować Read‑only/Operate oraz potwierdzenia.

### 8.1 Layout widoku Roboty

Widok składa się z:
1) Toolbar nad tabelą (filtry, wyszukiwarka, statystyki).  
2) Tabela robotów (przegląd).  
3) Drawer szczegółów robota (po kliknięciu wiersza/robota).

### 8.2 Toolbar (rekomendowane)

Toolbar **SHOULD** zawierać:
- Search (po nazwie/id).  
- Filtry typu chips:
  - Online / Offline,
  - Dispatchable / Undispatchable,
  - Manual on,
  - Blocked / Stalled / Stale,
  - In task / Idle.  
- Statystyki:
  - Robots: N, Online: N, In progress: N, Blocked: N, Stale: N  
- Przycisk „Odśwież” (jeśli LIVE bez SSE).

### 8.3 Tabela — kolumny (v0.2)

Minimalny zestaw kolumn (czytelność > „cockpit”):
1. **Robot** — nazwa (bold) + id (muted).  
2. **Connectivity** — Online/Offline/Stale + „age”.  
3. **Activity** — Idle / To pick / Picking / To drop / Dropping / Paused / Manual…  
4. **Task** — id + status/phase (lub `--`).  
5. **Battery** — % + wskaźnik.  
6. **Issues** — Blocked/Clear + Diag pill (stalled/holding/clear) z krótkim powodem.  
7. **Actions** — przycisk menu (⋯).

`FMUI-ROB-010` UI **MUST** unikać wielu „gorących” przycisków w każdej linii tabeli (mniej misclicków).  
`FMUI-ROB-011` Menu Actions **MUST** grupować akcje:
- Safe (np. center on map, open details),
- Operate (dispatch/manual/pause/stop/cancel),
- Admin (scene-related lub seize control) — jeśli dotyczy.

### 8.4 Reguły disabled i bezpieczeństwo

- `FMUI-ROB-020` Jeśli robot `online=false`:
  - akcje komend **MUST** być disabled,
  - menu pokazuje powód (tooltip).  
- `FMUI-ROB-021` Jeśli `No connection` albo `Operate=OFF`: akcje komend **MUST** być disabled.  
- `FMUI-ROB-022` Akcje ryzykowne:
  - stopNavigation i cancelTask **MUST** wymagać potwierdzenia,
  - setManualMode w LIVE **MUST** wymagać potwierdzenia.  
- `FMUI-ROB-023` UI **MUST** opierać disabled na capabilities.

### 8.5 Drawer robota (szczegóły)

Po kliknięciu wiersza UI pokazuje drawer z sekcjami:

**A) Identyfikacja**
- nazwa, id, provider (Mock/Live), wersja firmware (jeśli dostępna).

**B) Stan**
- Online/Offline/Stale, Dispatchable, Controlled, ManualMode,
- „Last update” (timestamp + age).

**C) Ruch**
- Pose: x, y, heading,
- Speed,
- lastStation (jeśli występuje),
- “Center on map”.

**D) Task**
- Task id, status, phase,
- Pick → Drop,
- Stream,
- Przyciski: pause/resume, stop navigation, cancel task (jeśli wspierane).

**E) Diagnostyka**
- state + reason + since,
- kontekst (np. vs RB‑02),
- “Pokaż na mapie”.

**F) Komendy**
- “Set as manual target” (ustawia manual target),
- dispatch toggle,
- seize/release control,
- manual toggle,
- manual go‑to (jeśli manual).

**G) Historia / eventy**
- ostatnie N eventów związanych z robotem (z globalnego logu, filtrowane).

`FMUI-ROB-030` Drawer **MUST** zawierać quick links: Task view (z filtrem), Diagnostyka (z highlight), Map view (center + highlight).  
`FMUI-ROB-031` Drawer **MUST** pokazywać, czy robot jest „controlled by someone else” i kto.

### 8.6 Diag badge — mapowanie i format

- brak diag → label `--`, klasa `clear`  
- `stalled` → klasa `stalled` (warn/danger)  
- `holding` → klasa `holding`  
- `stale/offline` → klasa `stale`

Jeśli diag ma `since`: dopisz „· 2.4s”.  
Dla wybranych reason dopisz kontekst:
- reservation_wait: “Czeka na rezerwacje 1.2s vs RB‑02”,
- traffic: “Zablokowany ruchem vs RB‑03”,
- edge_lock: “Blokada krawędzi vs RB‑01”.

### 8.7 Bulk actions (opcjonalnie)

- `FMUI-ROB-040` UI **MAY** wspierać zaznaczanie wielu robotów i akcje grupowe (np. „Set dispatchable off”), ale wymaga to uprawnień i potwierdzeń.

### 8.8 Stany widoku Roboty (loading/empty/error)

- Loading: skeleton tabeli + spinner w toolbar.  
- Empty: „Brak robotów w scenie” + link do Sceny/Settings.  
- Error: komunikat + Retry.

### 8.9 Kryteria akceptacji (Roboty)

- `AC-ROB-001` Domyślne sortowanie podnosi problemy (offline/stale/blocked) na górę.  
- `AC-ROB-002` Tabela nie ma więcej niż 1–2 bezpośrednie przyciski na wiersz (menu akcji jest główne).  
- `AC-ROB-003` W Read‑only wszystkie akcje komend są disabled (w menu i drawerze) z tooltipem.  
- `AC-ROB-004` Klik w wiersz otwiera drawer; nie wysyła komend.  
- `AC-ROB-005` Komendy pokazują pending/accepted/success/error i zapisują się w Event log.

---

## 9. Widok: Pola (Worksites)

### 9.1 Podstawy

Widok pokazuje listę worksites z atrybutami:
- id,
- grupa,
- typ (pick/drop),
- occupancy (filled/empty),
- blocked (true/false).

### 9.2 Wymagania

- `FMUI-FIELDS-001` Widok Pola **MUST** mieć filtr po grupie i typie.  
- `FMUI-FIELDS-002` Widok Pola **SHOULD** mieć szybkie akcje occupancy/blocked:
  - w Operate: aktywne + potwierdzenie w LIVE,
  - w Read‑only: disabled.  
- `FMUI-FIELDS-003` Klik w wiersz **SHOULD** centrować mapę na worksite i otwierać menu worksite (lub drawer worksite, jeśli dodany w przyszłości).

### 9.3 Stany

- loading/empty/error analogicznie jak w Roboty.

### 9.4 Kryteria akceptacji (Pola)

- `AC-FIELDS-001` Filtry po typie i grupie działają i są persystowane jako preferencja UI.  
- `AC-FIELDS-002` W Operate=OFF akcje zmiany occupancy/blocked są disabled z tooltipem.  
- `AC-FIELDS-003` Klik w worksite centruje mapę i pokazuje highlight worksitu.

---

## 10. Widok: Bufory (Packaging)

To jest w prototypie rozbudowane. Dla mocku minimalnie zachowujemy układ i podstawową klikalność.

### 10.1 Layout (MUST)

- Siatka bufora (buffer-grid) — komórki.  
- Panel edycji komórki (buffer-editor).  
- Panel “Zapotrzebowanie linii” (line-requests).  
- Panel “Operacje miejsc” (place-ops).

### 10.2 Zachowanie komórek bufora (mock)

- Klik w komórkę:
  - podświetla komórkę,
  - w panelu edycji pokazuje: id, typ, ilość, status,
  - pozwala zmienić ilość i typ (w mocku).  
- Line requests:
  - lista linii + status active/inactive,
  - przycisk “Toggle request” (mock).  
- Place ops:
  - “Reset buffer”, “Randomize”, “Mark as blocked” (tylko mock).

`FMUI-BUF-001` Widok Bufory **MUST** być dostępny i klikalny w mocku (nawet jeśli dane są uproszczone).

### 10.3 Kryteria akceptacji (Bufory)

- `AC-BUF-001` Klik w komórkę aktualizuje panel edycji bez opóźnienia i bez przeładowania widoku.  
- `AC-BUF-002` Zmiana ilości/typu w mocku od razu aktualizuje UI (optimistic) i pojawia się toast „Zapisano (mock)”.  
- `AC-BUF-003` Funkcje „Reset/Randomize” są dostępne tylko w MOCK.  

---

## 11. Widok: Streamy

- Lista streamów jako karty.  
- Każda karta pokazuje:
  - id + nazwa,
  - trigger,
  - routes count / steps,
  - aktywne zgłoszenia,
  - goodsType / goodsTypeMode,
  - next pick / next drop candidate (jeśli dostępne).

`FMUI-STREAMS-001` Klik w stream **SHOULD** otwierać szczegóły + listę tasków powiązanych (filtrowane).

### 11.1 Kryteria akceptacji (Streamy)

- `AC-STREAMS-001` Lista streamów ma loading/empty/error i nie crashuje przy brakujących polach meta.  
- `AC-STREAMS-002` Klik w stream otwiera szczegóły lub filtruje Zadania po streamie.  
- `AC-STREAMS-003` W Read‑only nie ma akcji sterujących (jeśli dodane w przyszłości — muszą być gated Operate).

---

## 12. Widok: Sceny

### 12.1 Lista scen

Każda scena jako karta:
- nazwa + id,
- createdAt,
- badge “Aktywna”,
- lista map w scenie:
  - nazwa + meta (typ/wersja/hash),
  - badge “Aktywna mapa”,
  - przycisk “Aktywuj” (jeśli nieaktywna).

### 12.2 Aktywacja sceny (MUST)

- `FMUI-SCENE-001` Klik „Aktywuj” **MUST** otwierać modal z ostrzeżeniem („reset runtime”).  
- `FMUI-SCENE-002` Po potwierdzeniu UI pokazuje loading + po sukcesie: reload danych + toast.  
- `FMUI-SCENE-003` Po błędzie: toast + pozostanie na starych danych (nie gubić UI).  
- `FMUI-SCENE-004` W LIVE aktywacja sceny **SHOULD** wymagać roli Admin/Engineer (kontrakt/placeholder).

### 12.3 Kryteria akceptacji (Sceny)

- `AC-SCENE-001` Aktywacja sceny zawsze wymaga modala potwierdzenia.  
- `AC-SCENE-002` Po sukcesie aktywacji UI odświeża mapę i stan, a w headerze zmienia się kontekst Scene/Map.  
- `AC-SCENE-003` Po błędzie aktywacji UI pozostaje w poprzedniej scenie i pokazuje toast + wpis w logu.

---

## 13. Widok: Ustawienia

### 13.1 Źródło danych (MUST)

Sekcja “Źródło danych”:
- `MOCK` / `LIVE` (radio/select),
- `API Base URL` (tylko LIVE),
- przycisk “Połącz” / “Rozłącz”.

`FMUI-SET-001` UI **MUST** pokazywać wyraźny banner trybu:
- „MOCK MODE” (bezpieczny),
- „LIVE MODE” (ostrożnie).  
`FMUI-SET-002` Przejście do LIVE **MUST** wymagać potwierdzenia (bo może sterować realnym).  
`FMUI-SET-003` W LIVE start Operate=OFF.

### 13.2 Symulator i algorytmy (jak prototyp)

Sekcja Symulator:
- select trybu symulatora,
- notatka o trybie,
- przyciski: “Zastosuj”, “Reset”.

Sekcja Algorytmy:
- select dispatch strategy,
- select traffic strategy,
- parametr “Odstep stopu do przodu (m)”,
- notatka + “Zastosuj”, “Reset”.

### 13.3 Taksonomia algorytmów (MUST jako UI‑element)

Zachować:
- Dispatch: “Wybrana strategia” + “Osie”,
- Traffic: “Wybrana strategia” + “Osie”,
- prezentacja w formie tabelki key/value.

### 13.4 Debug / deterministyczny seed (v0.2)

- `FMUI-SET-010` W mocku Settings **MUST** umożliwiać ustawienie `seed` symulatora.  
- `FMUI-SET-011` Settings **SHOULD** mieć przyciski: Freeze/Unfreeze, Step (1 tick), Reset simulation.

### 13.5 Kryteria akceptacji (Ustawienia)

- `AC-SET-001` Przełączenie MOCK↔LIVE wymaga potwierdzenia i zapisuje zdarzenie w logu.  
- `AC-SET-002` W LIVE po reconnect UI nie włącza Operate automatycznie (zawsze wraca do Read‑only).  
- `AC-SET-003` Zmiana seed + Reset symulacji daje deterministycznie powtarzalny ruch robotów.

---

## 14. Widok: Zadania

- Lista tasków jako karty. Każda karta pokazuje:
  - id,
  - stream + robot,
  - pick → drop,
  - extra meta (goodsType, lineId, kind),
  - badge status: active/done/failed/cancelled + phase.

`FMUI-TASKS-001` Widok Zadania **SHOULD** mieć filtrowanie po statusie, robocie, streamie.  
`FMUI-TASKS-002` W LIVE UI **MUST** umożliwiać cancel task z potwierdzeniem (jeśli core wspiera).

### 14.1 Kryteria akceptacji (Zadania)

- `AC-TASKS-001` Filtry po statusie/robocie/streamie działają i nie resetują się przy przejściu między widokami (preferencje).  
- `AC-TASKS-002` Cancel task wymaga modala i zapisuje commandId w logu.  
- `AC-TASKS-003` Klik w task otwiera szczegóły i linkuje do robota/mapy.

---

## 15. Widok: Diagnostyka (Traffic)

### 15.1 Cztery panele (MUST)

- Edge locks  
- Edge queues  
- Node locks  
- Stalls / Yield

### 15.2 Element listy diagnostycznej (SHOULD)

Każdy wpis zawiera:
- identyfikator zasobu (edgeId/nodeId),
- holder (robot trzymający),
- waiting (lista robotów czekających),
- wiek blokady (age),
- “Pokaż na mapie” (highlight).

### 15.3 Powiązanie z mapą

- Klik w wpis diagnostyki:
  - centruje mapę na zasobie/obszarze,
  - podświetla powiązane elementy (edge/node/robot).

`FMUI-DIAG-001` Diagnostyka **MUST** być spójna z mapą: highlight jest ten sam w Mapie i w Diagnostyce.

### 15.4 Kryteria akceptacji (Diagnostyka)

- `AC-DIAG-001` Klik w wpis diagnostyki centruje mapę i podświetla edge/node/robot.  
- `AC-DIAG-002` Lista diagnostyki pokazuje age i nie gubi się przy szybkim napływie eventów.  
- `AC-DIAG-003` Widok działa w Read‑only zawsze; w Operate nie dodaje dodatkowych akcji (diagnostyka jest obserwacyjna).

---

## 16. Widok: Awarie / Narzędzia symulacyjne

### 16.1 Bezpieczeństwo

- `FMUI-FAULTS-001` Widok Awarie **MUST** być dostępny tylko w trybie MOCK/LOCAL SIM.  
- W LIVE:
  - ukryty z menu, albo
  - pokazuje ostrzeżenie “Niedostępne w LIVE”.

### 16.2 Funkcje (jak prototyp)

- wybór robota,
- “Problem przy pobieraniu”,
- “Robot zablokowany”,
- “Problem przy odkładaniu”,
- “Przeszkoda (stop)”,
- “Przeszkoda (omijanie)”,
- “Usuń przeszkody”,
- “Odblokuj robota”.

`FMUI-FAULTS-010` UI **SHOULD** mieć Undo dla wstrzykniętych awarii (w mocku proste: cofnięcie ostatniego zdarzenia).

### 16.3 Kryteria akceptacji (Awarie)

- `AC-FAULTS-001` Widok Awarie jest ukryty lub zablokowany w LIVE.  
- `AC-FAULTS-002` Wstrzyknięcie awarii natychmiast zmienia stan robota na mapie/tabeli i dodaje wpis do logu.  
- `AC-FAULTS-003` Undo cofa ostatnią awarię (w mocku) i również loguje zdarzenie.

---

## 17. Kontrakty danych i API wymagane przez UI (UI-facing)

Ten rozdział służy temu, żeby mock i docelowy core miały minimalnie kompatybilne kontrakty.

### 17.0 UI a architektura systemu (granice odpowiedzialności)

Ten dokument dotyczy UI, ale UI nie istnieje w próżni. Poniżej minimalny „most” do reszty architektury (bez wchodzenia w algorytmy).

**Założenie architektoniczne:** UI jest cienkim klientem. Jedyną bramą do świata jest warstwa `DataSource` (MockDataSource / LiveDataSource). UI nie zna bezpośrednio endpointów i nie zawiera logiki domenowej (dispatch/traffic).

- `FMUI-ARCH-001` UI **MUST** komunikować się z „core” wyłącznie przez interfejs `DataSource` (port).
- `FMUI-ARCH-002` `DataSource` **MUST** udostępniać:
  - `getSnapshot()` / `subscribeEvents()` (state & eventy),
  - `sendCommand()` (komendy),
  - `getCapabilities()` (co wolno, zależnie od środowiska),
  - `getHealth()` (stan połączenia).
- `FMUI-ARCH-003` UI **MUST NOT** implementować reguł algorytmicznych core (np. wybór trasy); UI tylko je wizualizuje.

**Jak to się łączy z dokumentami architektury:**
- Kontrakty HTTP/SSE opisane tu są „UI-facing” i mogą być adapterem do wewnętrznych kontraktów core.
- Jeśli core ma inne endpointy, LiveDataSource robi mapowanie → UI pozostaje niezmienione.

**Kryterium akceptacji (AC-ARCH-001):**
- Zmiana adresów endpointów nie wymaga zmian w komponentach widoków; wystarczy adapter LiveDataSource.

### 17.1 Zasady future‑proof kontraktów

- `FMUI-API-001` Wszystkie payloady **SHOULD** zawierać `schemaVersion`.  
- `FMUI-API-002` UI **MUST** tolerować dodatkowe pola (forward compatible), ale **MUST** obsłużyć brak pól krytycznych jako „Data error” (a nie crash).  
- `FMUI-API-003` API **SHOULD** być wersjonowane (`/api/v1/...` lub nagłówek wersji).

### 17.2 Event stream (SSE) — envelope

Minimalny format zdarzenia:

```json
{
  "seq": 12345,
  "ts": 1736200000000,
  "type": "fleet.state",
  "data": { }
}
```

`FMUI-API-010` SSE envelope **MUST** zawierać `seq`, `ts`, `type`, `data`.  
`FMUI-API-011` UI **MUST** ignorować nieznane `type` (log + brak crasha).

### 17.3 Minimalne modele danych (UI-facing)

**Robot**
- `id: string`
- `name: string`
- `online: boolean`
- `dispatchable: boolean`
- `controlled: boolean`
- `manualMode: boolean`
- `blocked: boolean`
- `battery: number` (0–100)
- `pose: { x: number, y: number, angle: number }`
- `speed?: number`
- `taskStatus?: number | string`
- `activity?: string`
- `diagnostics?: { state, reason, detail?, since?, lastMoveAt? }`
- `capabilities?: { canManual?: boolean, canPause?: boolean, canGoToPoint?: boolean, ... }`

**Task**
- `id: string`
- `robotId?: string`
- `pickId?: string`
- `dropId?: string`
- `status: string` (in_progress/paused/completed/failed/cancelled)
- `phase?: string`
- `streamId?: string`
- `kind?: string`
- `meta?: object`

**Worksite**
- `id: string`
- `kind: "pick" | "drop"`
- `group?: string`
- `point?: string`
- `pos?: { x, y }`
- `filled: boolean`
- `blocked: boolean`

**Scene**
- `activeSceneId`
- `scenes: [{ id, name, createdAt, kind, maps: [...], activeMapId }]`

### 17.4 Minimalne endpointy (kanoniczne)

- `GET /api/v1/health`
- `GET /api/v1/fleet/state`
- `GET /api/v1/fleet/events` (SSE)
- `POST /api/v1/commands` (model komend)
- `GET /api/v1/capabilities` (global + per provider)
- `GET /api/v1/scenes` + `POST /api/v1/scenes/activate`
- `GET /api/v1/algorithms/catalog`

> Uwaga: jeśli istnieją endpointy legacy (`/api/status`, `/api/fleet/status`, `/api/fleet/stream`), są one traktowane jako kompatybilność wsteczna i nie są kanoniczne (patrz „Rzeczy usunięte”).

### 17.5 Przykładowe payloady (minimum)

**health**
```json
{ "status": "ok", "buildId": "fm-ui-2026.01.06+123", "ts": 1736200000000 }
```

**fleet.state (fragment)**
```json
{
  "schemaVersion": "1.0",
  "ts": 1736200000000,
  "scene": { "id": "S1", "name": "Demo" },
  "map": { "id": "M1", "name": "Warehouse A" },
  "robots": [
    {
      "id": "RB-01",
      "name": "RB-01",
      "online": true,
      "dispatchable": true,
      "controlled": false,
      "manualMode": false,
      "blocked": false,
      "battery": 87,
      "pose": { "x": -12.93, "y": 4.06, "angle": 1.57 },
      "activity": "to_pick",
      "diagnostics": { "state": "clear" },
      "capabilities": { "canManual": true, "canGoToPoint": true, "canPause": true }
    }
  ],
  "tasks": [
    { "id": "T-1001", "robotId": "RB-01", "pickId": "PICK-01", "dropId": "DROP-01", "status": "in_progress", "phase": "to_pick" }
  ],
  "worksites": [
    { "id": "PICK-01", "kind": "pick", "group": "PICK-GROUP", "filled": true, "blocked": false, "pos": { "x": -12.93, "y": 6.41 } }
  ]
}
```

---


### 17.6 Model komend (przykład kanoniczny)

UI używa jednego modelu komend niezależnie od tego, czy backend ma REST per zasób czy jeden endpoint.

**Request — `POST /api/v1/commands`:**
```json
{
  "schemaVersion": "1.0",
  "commandId": "3b5a1a6a-0c2e-4a4e-8d2b-8d3a7f1b2a11",
  "ts": 1736200000000,
  "actor": { "id": "op-01", "name": "Jan Kowalski", "role": "Operator" },
  "target": { "kind": "robot", "id": "RB-01" },
  "type": "robot.setManualMode",
  "payload": { "enabled": true }
}
```

**ACK (transport) — 202 Accepted:**
```json
{
  "commandId": "3b5a1a6a-0c2e-4a4e-8d2b-8d3a7f1b2a11",
  "accepted": true,
  "acceptedAt": 1736200000123
}
```

**Wynik (efekt w świecie) — event `command.result` w SSE:**
```json
{
  "seq": 20001,
  "ts": 1736200000456,
  "type": "command.result",
  "data": {
    "commandId": "3b5a1a6a-0c2e-4a4e-8d2b-8d3a7f1b2a11",
    "status": "succeeded",
    "target": { "kind": "robot", "id": "RB-01" },
    "message": "Manual mode enabled"
  }
}
```

`FMUI-API-020` UI **MUST** pokazywać komendy jako pending aż do ACK, a wynik jako succeeded/failed po `command.result` (lub po obserwacji zmiany w `fleet.state`, jeśli backend nie emituje result eventów).  
`FMUI-API-021` UI **MUST** obsłużyć timeout braku wyniku: status `unknown` + opcja retry.

### 17.7 Capabilities (payload przykładowy)

**`GET /api/v1/capabilities`**
```json
{
  "schemaVersion": "1.0",
  "global": {
    "features": {
      "manualDrive": true,
      "obstacles": true,
      "sceneActivation": true
    }
  },
  "robotDefaults": {
    "canManual": true,
    "canPause": true,
    "canGoToPoint": true,
    "canSeizeControl": false
  }
}
```

`FMUI-API-030` UI **SHOULD** łączyć `capabilities` globalne i per‑robot (jeśli per‑robot istnieją) w jedną warstwę decyzyjną disabled.


### 17.8 „Spec as code”: typy, schemy, fixtures i contract tests (MVP‑critical)

Żeby specyfikacja była realnie wykonywalna (także przez AI), część kontraktu musi istnieć jako pliki w repo.

`FMUI-API-200` Repo UI **MUST** zawierać katalog `src/contracts/` (typy) oraz `src/schemas/` (Zod) i `src/fixtures/` (payloady referencyjne).  
`FMUI-API-201` Każdy payload przychodzący z DataSource **MUST** przejść przez walidację runtime (Zod). Błąd walidacji → „Data error” (bez crash).  
`FMUI-API-202` Fixtures **MUST** być użyte w testach kontraktowych (CI), żeby uniknąć dryfu UI↔core.

**Proponowany układ plików (minimalny):**
- `src/contracts/fleet.ts` — TS typy domenowe (Robot/Task/Worksite/Obstacle/FleetState)
- `src/contracts/events.ts` — Event envelope + typy eventów
- `src/contracts/commands.ts` — Command request/response + statusy
- `src/schemas/*.schema.ts` — Zod schemy (mirror TS)
- `src/fixtures/state.sample.json`
- `src/fixtures/events.sample.jsonl` (eventy jako JSONL)
- `src/fixtures/capabilities.sample.json`
- `src/__tests__/contracts.spec.ts` — testy walidujące fixtures (oraz kilka „negative fixtures”)

**Minimalny przykład (Zod + TS):**

```ts
import { z } from "zod";

export const SchemaVersion = z.string().min(1);

export const RobotSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  pose: z.object({
    x: z.number(),
    y: z.number(),
    theta: z.number().optional(),
  }),
  status: z.enum(["idle","moving","paused","blocked","error"]).optional(),
  batteryPct: z.number().min(0).max(100).optional(),
  lastUpdateTs: z.number().int().optional(),
});

export type Robot = z.infer<typeof RobotSchema>;

export const FleetStateSchema = z.object({
  schemaVersion: SchemaVersion,
  ts: z.number().int(),
  robots: z.array(RobotSchema),
  tasks: z.array(z.any()).default([]),
  worksites: z.array(z.any()).default([]),
  obstacles: z.array(z.any()).default([]),
});
export type FleetState = z.infer<typeof FleetStateSchema>;
```

**Event envelope (SSE):**

```ts
export const EventEnvelopeSchema = z.object({
  seq: z.number().int().nonnegative(),
  ts: z.number().int(),
  type: z.string().min(1),
  data: z.unknown(),
  schemaVersion: SchemaVersion.optional(),
});
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
```

**Command model (kanoniczny):**
- UI wysyła `commandId` (UUID) + `idempotencyKey`.
- UI traktuje `ACK` jako „przyjęto do realizacji”, a efekt w świecie przychodzi eventem lub snapshotem.

`FMUI-API-203` UI **MUST** mieć jeden moduł mapujący: *UI action → command payload* (żeby uniknąć rozjechania).  

**Kryteria akceptacji (AC-API-001):**
- Fixtures przechodzą walidację Zod w CI.
- „Negative fixture” (brak `robots`) powoduje kontrolowany „Data error” w UI, nie crash.

## 18. Specyfikacja mock backendu (klikany prototyp)

### 18.1 Cele mocka

- Mock pokazuje „żywe UI”: roboty się poruszają, taski się zmieniają, pojawia się diag/blocked.  
- Mock **MUST** być prosty i deterministyczny.  
- Mock **MUST** emitować te same modele i eventy co LIVE (ten sam kontrakt).

### 18.2 Determinizm + sterowanie symulacją

- `FMUI-MOCK-001` Mock **MUST** mieć `seed` RNG ustawiany w Settings.  
- `FMUI-MOCK-002` Mock **MUST** mieć tryb Freeze + Step (tick ręczny).  
- `FMUI-MOCK-003` Mock **SHOULD** mieć opcję record/replay ostatnich 60s eventów (opcjonalne w v0.2, ale rekomendowane).

### 18.3 Minimalny model symulacji (z v0.1, doprecyzowany)

- Wczytaj statyczny `graph.json`.  
- Stwórz N robotów (3–8) na węzłach.  
- Każdy robot ma plan jako lista punktów i interpoluje pozycję w czasie.  
- Co kilka sekund:
  - wygeneruj task (pick→drop) i przypisz robotowi,
  - symuluj `status/phase` (to_pick → picking → to_drop → dropping → done).  
- Rzadko wstrzyknij:
  - blocked_obstacle,
  - reservation_wait,
  - stale (symulacja braku update).

### 18.4 Warstwa DataSource (MUST)

UI używa abstrakcji:

- `subscribeEvents(cb)` / `unsubscribe()`
- `getSnapshot()`
- `sendCommand(command)` (z commandId)
- `updateWorksite(id, patch)` (może być komendą)
- `activateScene(sceneId, mapId)` (może być komendą)
- `setSettings(patch)`

Dwie implementacje:
- `MockDataSource` — in-memory + tick.
- `LiveDataSource` — fetch + SSE + retry/backoff.

### 18.5 Mock jako warstwa HTTP (opcjonalnie)

`FMUI-MOCK-010` Mock **SHOULD** dać się uruchomić przez MSW, aby symulować prawdziwe endpointy (łatwiejsza integracja).

### 18.6 Contract tests + fixtures

- `FMUI-MOCK-020` MockDataSource i LiveDataSource **SHOULD** przechodzić te same testy kontraktowe na fixtures (snapshoty stanów + eventy).

---

## 19. Wydajność i skalowanie (future‑proof)

- `FMUI-PERF-001` UI **SHOULD** być projektowane na min. 100 robotów (wirtualizacja tabeli od progu).  
- `FMUI-PERF-002` Mapa **SHOULD** mieć culling warstw/etykiet zależnie od zoomu.  
- `FMUI-PERF-003` UI **MAY** przejść na Canvas/WebGL później, ale kontrakty interakcji mapy muszą pozostać.

### 19.1 Progi wydajnościowe (konkretne liczby)

Te liczby nie są „prawdą objawioną”, ale dają implementacji twarde granice.

- `FMUI-PERF-010` UI **SHOULD** utrzymywać płynność interakcji mapy (pan/zoom) bez zauważalnych lagów przy 100 robotach.  
- `FMUI-PERF-011` Render mapy **SHOULD** mieścić się w budżecie ~16ms na frame podczas interakcji (docelowo 60 FPS), a aktualizacje stanu mogą być rzadsze (np. 4–10 FPS) bez utraty UX.  
- `FMUI-PERF-012` Tabela Roboty **MUST** utrzymywać scroll bez „skakania” (wirtualizacja od progu).  
- `FMUI-PERF-013` UI **SHOULD** limitować częstość re-renderu ciężkich komponentów (Mapa, Tabela) przez memoization/selector.

**Praktyczne wskazówki implementacyjne (nie‑normatywne):**
- trzymać „view model” mapy osobno (zredukowany, tylko to co potrzebne do renderu),
- aktualizować SVG warstwami (nie cały DOM na każdy tick),
- labels/culling zależne od zoom.

---

## 20. Ryzyka, pułapki i jak je rozbroić

### 20.1 UX safety (operator kliknie “zły przycisk”)

Mitigacje:
- potwierdzenia dla akcji ryzykownych,
- rozdział selection/control,
- globalny Operate/Read‑only,
- role/uprawnienia (kontrakt).

### 20.2 Stale data i fałszywe poczucie kontroli

Mitigacje:
- jawny status połączenia + age,
- automatyczne wyłączenie Operate przy stale,
- wygaszanie/oznaczenie danych stale.

### 20.3 Wydajność mapy (SVG)

Mitigacje:
- etykiety zależne od zoomu,
- tryb „hide labels”,
- ew. Canvas/WebGL.

### 20.4 Konflikty wielu operatorów

Mitigacje:
- obsługa 409,
- audit log (actor + commandId),
- backend jako źródło prawdy.

### 20.5 Mock odciąga od UX

Mitigacje:
- deterministyczny, prosty tick,
- możliwość freeze/step,
- brak złożonej logiki.

---

## 21. Golden path implementacji (żeby AI i ludzie nie dryfowali)

1) App shell: login + sidebar + header + routing.  
2) Design tokens + komponenty bazowe (Card/Button/Modal/Toast/Drawer).  
3) DataSource + schemy runtime (Zod) + fixtures.  
4) Widok Roboty (tabela + drawer + actions menu).  
5) Widok Mapa (SVG + pan/zoom + roboty/worksites + minimapa).  
6) Operate/Read‑only gating + komendy + log zdarzeń.  
7) Pozostałe widoki jako klikalne szkielety, potem dopracowanie.  
8) Mock: seed + freeze/step + awarie.  
9) LiveDataSource (jeśli dostępny backend) + testy kontraktowe.

### 21.1 Jak zacząć implementację (rekomendowana kolejność: mock → pixel/interaction parity → live)

Ta kolejność minimalizuje ryzyko: najpierw „wygląda i klika się jak prototyp”, dopiero potem dokładamy integrację z core.

#### Krok 0 — Parity wizualne („Nowy Styl”)

- Przenieś tokeny kolorów i layout constants (rozdz. 4.2) 1:1 z prototypu.
- Zbuduj komponenty bazowe: `Card`, `Panel`, `Button (primary/ghost)`, `Pill/Badge`, `Toast`, `Modal`, `Drawer`.
- Zrób jeden „screen referencyjny” (Mapa) i porównaj z prototypem na screenshotach.

**DoD Krok 0:** layout, spacing, typografia i „ogólne wrażenie” są zgodne z prototypem.

#### Krok 1 — Mapa: interakcje 1:1 (najbardziej zdradliwy element)

- Zaimplementuj `viewBox` state + wheel zoom pod kursorem + pan + clamp + minimapę dokładnie wg 7.4 i tokenów mapy.
- Dodaj przyciski Fit/Reset + tooltip „?” ze skrótami.
- Dopiero potem dodaj markery robotów/worksites i warstwy.

**DoD Krok 1:** spełnione AC-MAP-001.

#### Krok 2 — Robots view (tabela + drawer) + selekcja bez skutków ubocznych

- Tabela robotów, sort „problems first”, filtr, selection → drawer.
- Akcje „write” (pause/stop/cancel) tylko w Operate i tylko z potwierdzeniem.

#### Krok 3 — DataSource + „spec as code”

- Zaimplementuj interfejs `DataSource`.
- Dodaj Zod schemy + fixtures + testy kontraktowe (17.8).
- MockDataSource generuje deterministyczne eventy i snapshoty.

#### Krok 4 — Stany degradacji i odporność

- Zaimplementuj ConnectionStore i matrycę degradacji (6.2.4).
- Error boundaries w React, „Data error” per‑view, globalny alert drawer.

#### Krok 5 — LiveDataSource (bez zmiany UI)

- Implementacja adaptera: `fetch` snapshot + `EventSource` SSE + `sendCommand`.
- Dopiero na końcu: integracja z prawdziwym core i dopasowanie mapowania statusów.

#### Krok 6 — Domknięcie P0 i polish

- Przejście po P0 checklist (22).
- Manual QA (MVP) + poprawki ergonomii.

### 21.2 Mock → Live: jak zrobić, żeby integracja była łatwa

- `FMUI-IMPL-001` UI **MUST** mieć jedną „fabrykę DataSource” (Settings: MOCK/LIVE), a reszta aplikacji tylko konsumuje interfejs.
- `FMUI-IMPL-002` Różnice kontraktów core **MUST** być rozwiązywane w adapterze LiveDataSource, nie w widokach.
- `FMUI-IMPL-003` MockDataSource **SHOULD** emulować opóźnienia, stale/offline i błędy walidacji (toggle w Settings) — to odkrywa błędy UX wcześnie.

**Kryteria akceptacji (AC-IMPL-001):**
- Przełączenie MOCK→LIVE nie wymaga zmian w komponentach widoków (tylko konfiguracja DataSource).
- Użycie innego backendu (zmiana baseURL) nie wymaga zmian w UI.



---

## 22. Checklist implementacyjny (v0.3)

- [ ] Layout: login + app shell + sidebar + header + panel stack  
- [ ] Header: status połączenia + age + scene/map + Operate toggle + alerts bell  
- [ ] Event/Alert drawer (historia zdarzeń)  
- [ ] Widoki: map/robots/fields/packaging/streams/scenes/settings/tasks/traffic/faults  
- [ ] Komponenty: Card, Table, Buttons, Pills, Toast, Modal, Drawer  
- [ ] A11y: focus ring, klawiatura, aria dla menu/modali  
- [ ] Map: SVG render grafu + worksites + roboty + przeszkody + minimapa  
- [ ] Interakcje mapy: pan/zoom/fit/reset + menu worksite + menu mapy + menu manual  
- [ ] Roboty: tabela (z Actions menu) + drawer + sorting „problems first” + disabled rules  
- [ ] Settings: mock/live + base URL + seed + freeze/step  
- [ ] MockDataSource: tick + ruch + taski + diag + awarie (deterministyczne)  
- [ ] LiveDataSource: health + snapshot + SSE + backoff + offline overlay  
- [ ] Runtime validation: Zod + „Data error” bez crasha  
- [ ] Contract tests: fixtures dla obu DataSource
- [ ] MVP P0: wszystkie elementy z rozdz. 1.5.1 (P0) są zaimplementowane i przeklikiwalne  
- [ ] DoD MVP: spełnione punkty z rozdz. 1.5.2 (Operate gating, brak crashy, AC-MAP-001, a11y)  
- [ ] Matryca degradacji (6.2.4): stany Connected/Stale/Offline/Auth/DataError działają i mają poprawne reguły disabled  
- [ ] Ustawienie mapInteractionProfile (prototype|standard) działa i jest zapamiętywane  
- [ ] „Spec as code” (17.8): contracts + schemas + fixtures + test w CI (positive/negative)  
- [ ] E2E smoke (1.5.3): 3 ścieżki przechodzą automatycznie (Playwright/Cypress)  
- [ ] Performance sanity: mapa 100 robotów, pan/zoom płynny (bez stutter)  
- [ ] Dokumentacja repo: jak uruchomić mock, jak przełączyć na LIVE, gdzie są fixtures i kontrakty  


---

## 23. Rzeczy usunięte / zdezaktualizowane (archiwum v0.1–v0.2)

Ta sekcja istnieje po to, żeby nic z poprzednich wersji (v0.1, v0.2) nie „zniknęło”, ale żeby w bieżącej wersji (v0.3) nie mieszało się z kanonicznymi decyzjami.

### 23.1 Interakcje mapy (v0.1)

- **Usunięte jako default:** „double click: reset view”.  
  - Powód: kolizja z powszechnym zachowaniem map (double‑click zoom in).  
  - Zastąpione przez: double‑click zoom in + przyciski Fit/Reset + skrót `0`.

### 23.2 Roboty na mapie (v0.1)

- **Usunięte:** „Klik w robota (gdy nie manualMode) włącza manualMode”.  
  - Powód: safety + mieszanie selection z control.  
  - Zastąpione przez: klik = select + drawer; manualMode tylko z jawnej akcji (i potwierdzeniem w LIVE).

### 23.3 Endpointy status (v0.1)

- **Legacy (niekanoniczne):**
  - Polling do `/api/status`
  - `GET /api/fleet/status`
  - `GET /api/fleet/stream` (zamiast `/api/v1/fleet/events`)
- Powód: niespójność; w v0.2 wprowadzono kanoniczne `/api/v1/health`, `/api/v1/fleet/state`, `/api/v1/fleet/events`.

### 23.4 Tabela Roboty — kolumny (v0.1)

W v0.1 tabela miała wiele kolumn akcyjnych:
- Dispatch (toggle), Control (button), Manual (toggle), Nawigacja (actions) jako osobne kolumny.

W v0.2:
- akcje przeniesiono do menu (⋯) i drawer, aby zmniejszyć ryzyko misclick oraz poprawić responsywność.

### 23.5 Prompt v0.1 (archiwum)

```text
Rola: Jesteś doświadczonym projektantem UX/UI oraz inżynierem frontendu (TypeScript). Twoim zadaniem jest przygotować klikalny prototyp (mock) nowego Fleet Managera do zarządzania autonomicznymi wózkami widłowymi.

Wymagania nadrzędne:
- Skup się na UX i wyglądzie, nie na algorytmie sterowania flotą.
- Zachowaj ogólny układ i estetykę prototypu (jasny, ciepły motyw “Nowy Styl”, lewy sidebar, nagłówek, panele; mapa w SVG + minimapa).
- Zaimplementuj wszystkie widoki opisane w specyfikacji: Mapa, Roboty, Pola, Bufory, Streamy, Sceny, Ustawienia, Zadania, Diagnostyka, Awarie.
- Prototyp ma mieć tryb danych:
  1) MOCK (domyślny): wbudowany “mini-symulator” poruszający roboty po grafie, generujący taski i diagnostykę w prosty sposób (animacja ma tylko wspierać UX).
  2) LIVE: możliwość podłączenia do prawdziwego backendu przez skonfigurowany base URL; UI ma korzystać z tej samej warstwy DataSource (adapter).
- UI ma być odporne na błędy: nie może się wywracać ani przeładowywać na błędy backendu; pokazuje overlay “brak połączenia” dopiero po ok. 2 sekundach bez kontaktu.
- Zadbaj o bezpieczeństwo UX: akcje destrukcyjne lub ryzykowne muszą mieć potwierdzenia i jasny feedback (pending/sukces/błąd).
- Implementuj zgodnie z normatywną częścią dokumentu (MUST/SHOULD), a gdy czegoś brakuje — wybieraj rozwiązania najprostsze i najbardziej intuicyjne.
- Wszędzie gdzie to ma sens, dodaj mikro‑feedback: tooltips, stany disabled, wskaźnik ładowania, toasty, informacja o “ostatniej aktualizacji”.
- Nie twórz skomplikowanej logiki backendowej; mock ma być możliwy do zrozumienia i utrzymania „od góry do dołu” w jednym module.

Wyjście:
- Klika się jak produkt: przełączanie widoków, wybór robota, menu kontekstowe na mapie, włączanie trybu manual, podgląd detali.
- Kod ma być modularny i czytelny (komponenty + warstwa DataSource).

Wejście kontekstowe:
- Ta specyfikacja UI (poniżej).
- Inspiracja wizualna i zachowania z prototypu: lewy sidebar, karty, tabela robotów, mapa SVG, minimapa, menu worksite, menu manual, menu mapy (przeszkody).
```

### 23.6 Interakcje mapy (archiwum v0.2 — zdezaktualizowane w v0.3)

W v0.2 próbowaliśmy ustandaryzować zachowanie mapy (double‑click = zoom in) poprzez wymaganie `FMUI-MAP-021`.  
W v0.3 wracamy do **wierności prototypu** w trybie MVP (profil `prototype`) i wprowadzamy profile interakcji (`FMUI-MAP-118/119/121`).

Poniższy fragment był kanoniczny w v0.2 i jest zachowany „bez zmian” dla historii:

```md
### 7.4 Pan/Zoom + skróty

- Mapa **MUST** wspierać:
  - scroll wheel: zoom,
  - drag (LMB): pan,
  - double click: **zoom in** (standard),
  - klawisze: `+` zoom in, `-` zoom out, `0` reset/fit (konfigurowalne).  
- Map actions:
  - “Dopasuj” (fit view) — ustawia viewBox tak, by cała mapa mieściła się w panelu,
  - “Reset view” — resetuje do domyślnego viewBox (np. full bounds + margines).

`FMUI-MAP-020` UI **MUST** dostarczyć przyciski Fit/Reset zawsze widoczne (np. w prawym górnym rogu mapy).  
`FMUI-MAP-021` Double click **MUST NOT** resetować widoku (unikamy konfliktu z oczekiwaniami użytkownika).
```

### 23.7 Prompt v0.2 (archiwum)

Poniżej prompt z v0.2 (bez dopisków v0.3) — zachowany dla porównania i powtarzalności:

```text
Rola: Jesteś doświadczonym projektantem UX/UI oraz lead frontend engineerem (TypeScript). Twoim zadaniem jest przygotować klikalny prototyp (mock) nowego Fleet Managera do zarządzania autonomicznymi wózkami widłowymi.

Cel:
- Zbuduj UI „jak produkt”: spójny, intuicyjny, odporny na błędy, przygotowany na integrację z prawdziwym core.
- Skup się na UX i wyglądzie. Logika sterowania flotą i algorytmy są poza zakresem — mock ma tylko „ożywiać” UI.

Wymagania nadrzędne:
- Zachowaj ducha i estetykę prototypu („Nowy Styl”): jasny, ciepły motyw, lewy sidebar, header, karty/panele, mapa w SVG + minimapa.
- Zaimplementuj wszystkie widoki opisane w specyfikacji (Mapa, Roboty, Pola, Bufory, Streamy, Sceny, Ustawienia, Zadania, Diagnostyka, Awarie).
- Prototyp ma mieć dwa tryby źródła danych (jedna abstrakcja DataSource):
  1) MOCK (domyślny): wbudowany mini‑symulator poruszający roboty po grafie, generujący taski i diagnostykę w sposób prosty i deterministyczny.
  2) LIVE: możliwość podłączenia do backendu przez Base URL; UI używa tych samych modeli i eventów co w MOCK (tylko inny adapter).
- Bezpieczeństwo UX jest priorytetem:
  - UI rozdziela „selection” (wybór robota) od „control” (komendy). Kliknięcie nie może mieć skutków w świecie.
  - W LIVE aplikacja startuje w trybie Read‑only (Operate = OFF). Operator świadomie uzbraja (Operate = ON) zanim pojawią się aktywne akcje.
  - Akcje ryzykowne i destrukcyjne zawsze wymagają potwierdzeń oraz czytelnego feedbacku (pending → success / error).
- Odporność:
  - UI nigdy nie „wywraca się” od błędnych danych lub błędów sieci.
  - Pokazuj overlay „Brak połączenia” dopiero po ~2 sekundach braku kontaktu z endpointem health.
  - Wykonuj runtime validation danych (np. Zod) i obsługuj „Data error” bez crasha.
- Spójność kontraktów:
  - W MOCK i LIVE te same typy danych, ten sam format eventów (SSE envelope) i ten sam model komend (commandId, idempotency, statusy).
- Ergonomia i dostępność:
  - UI obsługuje klawiaturę (Tab/Enter/Esc), focus ring, sensowne aria-label.
  - Kontrasty i czytelność są traktowane jak wymagania (nie „ładny dodatek”).
- Implementuj zgodnie z częścią normatywną (MUST/SHOULD) i wymaganiami z identyfikatorami (FMUI-...); dodaj testowalne kryteria akceptacji (AC-...).
- Mock ma być prosty i utrzymywalny: jedna pętla tick + kilka funkcji; bez złożonych plannerów. Dodaj deterministyczny seed i możliwość wstrzymania/stepowania symulacji (przyspiesza testy UX).

Preferowany stack (dla szybkości prototypowania):
- React + TypeScript + Vite
- Router (React Router)
- Runtime validation (Zod)
- SSE (EventSource) w LIVE; MSW jako opcjonalna warstwa mockowania HTTP
- Tabele: wirtualizacja od progu N (np. react-window)

Wyjście:
- Działający klikalny mock: przełączanie widoków, selekcja robota, drawer szczegółów, menu kontekstowe na mapie, tryb Operate/Read-only, dodawanie przeszkód z Undo, log zdarzeń/alertów.
- Kod modularny: komponenty UI + warstwa DataSource (MockDataSource/LiveDataSource) + schemy/fixtures.
```

