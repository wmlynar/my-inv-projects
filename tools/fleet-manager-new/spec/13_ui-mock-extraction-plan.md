# Plan ekstrakcji UI (mock) ze starej aplikacji (v0.2)

## 1) Cel i zalozenia
- UI ma byc wyjete ze starego projektu i dzialac jako osobna aplikacja z mock backendem.
- Kod mapy i menu kontekstowego ma byc przeniesiony 1:1, bez refaktorow w MVP.
- Kontrakty danych i eventow musza zostac zachowane.
- Bez uruchamiania starego UI (tylko statyczna analiza i przenoszenie 1:1).

## 2) Zakres i priorytety
- MVP (do szybkiego wdrozenia):
  - skopiowane UI 1:1 + mock `/api/fleet/status`,
  - mapa i menu dzialaja bez zmian,
  - prosty ruch robotow po grafie (tick + loop),
  - brak edycji mapy i brak map compilera.
- Po MVP (rozszerzenia):
  - wydzielenie `MapWindow`/`MapCore`, pluginy, warstwy,
  - rozbudowane UX (focus/follow, warstwy, command palette),
  - edytor mapy + integracja z map compilerem.

### 2.1) MVP definicja funkcjonalna (v0.1)
- Mapa:
  - render grafu z `graph.json` + worksites z `workflow.json5`,
  - minimapa, zoom/pan, reset/fit widoku.
- Roboty:
  - lista robotow (nazwa, status, bateria),
  - zaznaczenie na mapie + podswietlenie w liscie.
- Ruch:
  - prosty tick pozycji po krawedziach (loop po sciezce),
  - aktualizacja `pose`, `speed`, `currentStation/lastStation`.
- Menu/akcje:
  - menu kontekstowe mapy/robotow (minimum: focus, fit, go here UI-only).
- Odswiezanie danych:
  - polling `/api/fleet/status`, fallback na statyczne dane gdy brak odpowiedzi.
- UX minimalny:
  - komunikaty “brak danych” i “blad odswiezania”,
  - widoczne focus/selection.

### 2.2) Non-goals MVP
- brak edytora mapy i brak integracji z map compilerem,
- brak zaawansowanych paneli (tasks, workflows, diagnostyka),
- brak real-time WS (polling wystarczy),
- brak trwalego zapisu zmian (tylko UI/memory).

### 2.3) Akceptacja MVP
- UI renderuje mape i roboty bez bledow konsoli.
- Roboty poruszaja sie po grafie (widoczne na mapie).
- Menu kontekstowe dziala i nie psuje interakcji mapy.

## 3) Inwentaryzacja starego UI (statyczna)
- Zidentyfikowac entrypoint (np. `src/index`, `src/app`, router).
- Zmapowac strukture UI: layout, panele, mapa, menu kontekstowe.
- Znalezc wszystkie pliki zwiazane z mapa i menu:
  - eventy: `contextmenu`, `right click`, `onContextMenu`, `pointer`, `wheel`, `drag`, `zoom`, `pan`.
- Spisac kontrakt danych mapy: format wezlow, krawedzi, warstw, obiektow.
- Spisac kontrakt uslug: API fetch, event bus, store actions/selectors.

### 3.1) Wynik inwentaryzacji (apps/traffic-lab)
- Entrypoint: `apps/traffic-lab/public/index.html`.
  - Script order: `packaging_engine.js` -> `domain_store.js` -> `domain_repos.js` -> `domain_services.js` -> `domain_allocators.js` -> `app.js`.
- Core UI i mapa: `apps/traffic-lab/public/app.js` (monolit, IIFE).
  - Map rendering: `renderMap()`; kontekstowe menu: `initWorksiteMenu()`, `initManualMenu()`, `initMapMenu()`.
  - Map wrapper i menu: `.map-wrap`, `#worksite-menu`, `#manual-menu`, `#map-menu`.
- Style: `apps/traffic-lab/public/styles.css` (mapa, menu, roboty, worksite).
- Moduly domenowe: `apps/traffic-lab/public/domain_*.js`, `apps/traffic-lab/public/packaging_engine.js`.
- Dane mapy i scen: `apps/traffic-lab/public/data/graph.json`, `workflow.json5`, `robots.json`, `packaging.json`.
- Sceny: `apps/traffic-lab/scenes/` (np. `scenes.json`, `traffic/`, `entry-reservation/`).
- Serwer/hosting: `apps/traffic-lab/src/index.js`, `apps/traffic-lab/src/server.js` (statyczny hosting + API/proxy).

### 3.2) Kontrakt danych (mapa/roboty/workflow)
- `public/data/graph.json`:
  - `meta`: `{ source, mapType, mapName, version, resolution, bounds: { min: {x,y}, max: {x,y} } }`.
  - `nodes[]`: `{ id, className, pos: {x,y}, ignoreDir, props: { spin?, recfile?, prepoint? } }`.
    - `className`: `LocationMark`, `ActionPoint`, `ChargePoint`, `ParkPoint`.
  - `edges[]`: `{ id, className, start, end, startPos: {x,y}, endPos: {x,y}, controlPos1?, controlPos2?, props }`.
    - `className`: `DegenerateBezier`.
    - `props`: `direction`, `movestyle`, `width`, `maxspeed`, `loadMaxSpeed`, `forbiddenRotAngle`.
  - `lines[]`: `{ id, className, startPos: {x,y}, endPos: {x,y}, props }`.
    - `className`: `FeatureLine`, `props`: `direction`, `directionPosX`, `directionPosY`.
  - `areas[]`: `{ id, className, dir, posGroup: [{x,y},...], props, attribute }`.
    - `className`: `AdvancedArea`, `AreaShielded`.
    - `props`: `ShieldLaser`, `ShieldVirtualLaser`, `TextFontSize`, `forbidDNodeGroupId`, `forbidLaserGroupId`.
    - `attribute`: `colorPen`, `colorBrush`.
- `public/data/workflow.json5`:
  - `map`: `{ name, version, source }`.
  - `groups`: `{ [groupId]: string[] }` (lista `ActionPoint`).
  - `bin_locations`: `{ [worksiteId]: { group, point, pos: {x,y} } }` -> z tego powstaja worksite.
  - `action_points[]`: `{ id, pos: {x,y}, props: { spin } }` (nieuzywane w renderze mapy, ale zachowac).
  - `occupancy`: `{ source, pick_groups: string[], drop_groups: string[] }`.
  - `streams[]`: `{ id, pick_group, drop_group_order: string[], pick_policy, drop_policy, notes? }`.
  - `buffer_group`: string, `thresholds`: `{ heartbeat_timeout_s, no_progress_timeout_s, blocked_retry_limit, charge_target_pct, commit_distance_m }`.
- `public/data/robots.json`:
  - `strategy`: string, `traffic`: `{ yieldRecovery, forwardStopDistanceM }`.
  - `models`: `{ [name]: { head, tail, width } }`, `defaultModel`: string.
  - `robots[]`: `{ id, name, ref|point|start, pos?, model, battery, radius?, dispatchable, online, controlled, manualMode, heading?, speed? }`.
- `GET /api/fleet/status` (mock):
  - `robots[]`: `{ id, pose: { x, y, angle(rad) }, speed, battery, blocked, dispatchable, online, controlled, manualMode, currentStation?, lastStation?, state?, diagnostics? }`.
  - `tasks[]`: `{ id, robotId, status, phase, pickId?, dropId?, streamId?, kind?, meta? }` (moze byc puste).
  - `worksites[]`: `{ id, filled, blocked }` (dla menu worksite).

## 4) Nowy projekt UI-only
- Utworzyc nowy projekt (np. `apps/fleet-ui-mock`).
- Skonfigurowac aliasy/sciezki, aby importy dzialaly bez zmian.
- Zachowac oryginalne bundlery/konwencje (o ile mozliwe).

## 5) Kopiowanie kodu UI
- Skopiowac `apps/traffic-lab/public/` 1:1, bez zmian w mapie/menu.
- Zachowac `index.html` i kolejnosc skryptow (zaleznosci `domain_*.js` -> `app.js`).
- Skopiowac assety (SVG, fonty, ikony, tile) oraz `public/data/*`.
- Skopiowac style bez zmian (klasy, z-indexy, hierarchia DOM).

## 6) Adaptery (klucz do mocka)
- Zbudowac warstwe `ui-api` w jednym miejscu.
- Dla kazdego endpointu starego UI stworzyc mock o identycznym shape.
- Dodac mock event-bus lub store z tym samym interfejsem.

## 7) Mock backend (proste protezy)
- Lokalny JSON + in-memory store + timery.
- Zasymulowac:
  - odswiezanie statusow (tick),
  - reakcje na klik/przycisk (zmiana stanu).
- Jesli UI uzywa WS: stub emitter (MVP: polling wystarczy).
- Dac namiastke ruchu robotow:
  - przypisac kazdemu robotowi sciezke po krawedziach grafu (lista wezlow),
  - update `pose` (x,y,angle) i `speed` co tick, z zapetleniem trasy,
  - aktualizowac `currentStation`/`lastStation` na najblizszy wezel, gdy robot minie punkt.

## 8) Mapa i menu kontekstowe (MVP)
- Brak zmian w module mapy; tylko podmiana danych.
- Jesli mapa oczekuje loadera map, podlaczyc biblioteke z projektu albo dac stub z tym samym interfejsem.
- Zachowac wszystkie event handlers i CSS.

## 9) Docelowa architektura UI (mapa + roboty)
- Cel: modularne UI do mapy i robotow, latwe rozszerzenia i wysoka wygoda.

### 9.1) MVP scope UI
- `MapShell` z mapa + minimapa, podstawowy toolbar i status bar.
- `SidePanel` z lista robotow i prostym filtrem.
- `Selection` + `Focus` + `Follow`.
- `ContextMenu` tylko dla podstawowych akcji (focus, go here, fit).

### 9.2) Widoki/panele i layout
- Ukad bazowy (desktop):
  - lewy panel nawigacji (ikony + nazwy widokow),
  - srodkowe okno mapy (MapShell) z toolbar na gorze i status bar na dole,
  - prawy panel (SidePanel) jako drawer: lista robotow, szczegoly, filtry.
- MapShell:
  - toolbar: search, mode switch (browse/manual/inspect/edit), layer toggle, fit/reset.
  - status bar: zoom, coords, follow status, selection count, warnings.
  - minimapa w prawym dolnym rogu (draggable).
- SidePanel (zakladki):
  - Robots (lista + statusy + quick actions).
  - Tasks (kolejka zadan + filtry).
  - Worksites/Stations (statusy i filtrowanie).
  - Events/Logs (ostatnie zdarzenia UI).
- Inspector (kontekstowy):
  - dock po prawej lub floating card blisko selection.
  - pokazuje dane obiektu (robot/node/edge) + skruty akcji.
- Context menu:
  - akcje zalezne od selection i mode (go here, follow, show corridor, edit edge).
- Responsywnosc:
  - mobile: mapa fullscreen + bottom sheet jako SidePanel (swipe).
  - tablet: SidePanel jako overlay, mapa dominuje.

### 9.3) Modele stanu UI (frontend-only)
- Podzial stanu:
  - `UiState`: layout, panele, tryb, selection, layers, filters, command palette.
  - `MapState`: viewport, highlights, tool overlays, cursor state.
  - `DataViewState`: aktualny widok danych (robots, tasks, worksites).
- Kluczowe modele:
  - `Viewport`: `{ center: {x,y}, zoom, rotation, bounds? }`.
  - `Selection`: `{ type, ids[], primaryId?, multi }`.
  - `Mode`: `{ name, tool, locked? }`.
  - `LayerState`: `{ hiddenIds[], soloId?, zIndexOverrides? }`.
  - `FilterState`: `{ robots: { online?, batteryRange?, text? }, tasks: { status? } }`.
  - `FollowState`: `{ robotId?, enabled, smooth }`.
  - `PanelState`: `{ leftNavOpen, rightPanelTab, rightPanelOpen, inspectorOpen }`.
  - `CommandPaletteState`: `{ open, query, results[] }`.
  - `InputState`: `{ keysDown[], modifiers, pointerDown }`.
- Persistencja UI (local storage):
  - layout paneli, ostatni zoom i center, active layers, ostatni tryb.
- Undo/redo (UI-only):
  - historia zmian selection, layer visibility, filters, viewport.

### 9.4) Minimalne API komponentow (UI-only)
- `MapShell`:
  - props: `mapState`, `uiState`, `layers[]`, `interactions[]`, `onViewportChange`, `onSelectionChange`.
  - sloty: `toolbar`, `statusBar`, `overlay` (minimapa, toast, help).
  - eventy: `onContextMenu`, `onHover`, `onDrop`.
- `MapWindow` (wewnatrz MapShell):
  - props: `mapState`, `layers[]`, `interactions[]`, `cursor`, `selection`.
  - metody: `toMap(point)`, `toScreen(point)`, `requestRender()`.
- `SidePanel`:
  - props: `activeTab`, `tabs[]`, `filters`, `selection`, `onTabChange`, `onFilterChange`.
  - sloty: `header`, `body`, `footer`.
- `Inspector`:
  - props: `selection`, `data`, `actions[]`, `anchor`, `onAction`.
  - tryby: `dock` lub `floating`.
- `ContextMenu`:
  - props: `items[]`, `position`, `visible`, `onSelect`, `onClose`.
- `CommandPalette`:
  - props: `open`, `query`, `results[]`, `onQueryChange`, `onSelect`.
- `Legend/Toolbar/StatusBar`:
  - props: `mode`, `zoom`, `coords`, `warnings[]`, `onModeChange`.

### 9.5) Przeplywy UX (kluczowe scenariusze)
- Focus na robota:
  - user klik -> `Selection` = robot -> `Inspector` pokazuje akcje -> `Focus` centrowanie + opcja follow.
- Follow robot:
  - aktywacja `FollowState.enabled=true` -> viewport lock na pozycji robota -> auto-zoom opcjonalny.
- Manual inspect (mapa):
  - tryb `inspect` -> hover pokazuje tooltip -> click otwiera `Inspector` + highlight korytarza.
- Selection i multi-select:
  - shift-click dodaje do `Selection.ids[]`, esc czysci -> `SidePanel` filtruje listy po selection.
- Zmiana trybu (browse/manual/edit):
  - switch w toolbar -> aktywne narzedzia i skruty klawiaturowe sa wymieniane.
- Context menu:
  - prawy klik -> menu zalezne od `Selection` + `Mode` -> po akcji menu zamyka sie i triggeruje `Command`.
- Fit to selection:
  - przycisk w toolbar -> obliczenie bounds obiektow -> `Viewport` update.

### 9.6) Katalog akcji (UI-only)
- Robot:
  - `Focus` / `Follow` / `Stop` / `Pause` / `Resume`.
  - `Set target` (wybor LM/AP z listy lub klik na mapie).
  - `Toggle manual` (wlacz/wyłącz tryb manualny w UI).
  - `Show corridor` (highlight aktualnego korytarza).
- Wezel (LM/AP/CP/PP):
  - `Set as target` / `Center view` / `Show neighbors`.
  - `Show corridor segments` (podswietlenie krawedzi).
- Krawedz/korytarz:
  - `Highlight` / `Show width` / `Show overlap`.
  - `Isolate layer` / `Mute layer`.
- Obszar (areas):
  - `Toggle visibility` / `Show props`.
- Mapa (pusta przestrzen):
  - `Fit view` / `Reset view` / `Toggle grid`.
  - `Add annotation` (tylko UI, bez zapisu).

### 9.7) Menu kontekstowe per tryb (browse/inspect/manual/edit)
- Browse:
  - Robot: `Focus`, `Follow`, `Pause`, `Stop`, `Set target` (LM/AP).
  - Wezel: `Set as target`, `Center view`, `Show neighbors`.
  - Krawedz: `Highlight`, `Show width`, `Isolate layer`.
  - Pusta mapa: `Fit view`, `Reset view`, `Toggle grid`.
- Inspect:
  - Robot: `Show diagnostics` (UI-only panel), `Show corridor`, `Add annotation`.
  - Wezel: `Show metadata`, `Show connected edges`.
  - Krawedz: `Show overlap`, `Show corridor segments`.
  - Pusta mapa: `Toggle layers`, `Show legend`.
- Manual (UI-only sterowanie):
  - Robot: `Enable manual`, `Disable manual`, `Stop`, `Center view`.
  - Mapa: `Set target here` (punkt), `Cancel manual`.
  - Wezel: `Go here` (LM/AP), `Queue target` (UI-only).
- Edit (map editor):
  - Wezel: `Move`, `Delete`, `Add edge from here`.
  - Krawedz: `Edit curve`, `Split`, `Delete`, `Set width`.
  - Pusta mapa: `Add node`, `Add area`, `Paste`, `Reset selection`.
  - Obszar: `Edit polygon`, `Delete`, `Set props`.

### 9.8) Klawisze i gesty (UI ergonomia)
- Mapa:
  - scroll = zoom, LMB drag = pan, double click = zoom in.
  - `0` reset view, `F` fit view, `G` toggle grid.
  - `H` toggle hints/legend.
- Selection:
  - click = select, shift+click = multi-select, esc = clear.
  - `[` / `]` next/prev in selection (gdy multi).
- Roboty:
  - `R` focus on selected robot, `Shift+R` follow.
  - `Space` stop (UI-only), `P` pause/resume (UI-only).
- Tryby:
  - `1` browse, `2` inspect, `3` manual, `4` edit.
- Warstwy:
  - `L` toggle layer panel, `Alt+L` solo active layer.
- Command palette:
  - `Ctrl+K` otworz wyszukiwarke akcji.

### 9.9) UX polish i elegancja (komfort uzytkownika)
- Tryb `Focus`:
  - po wyborze robota pokazuje tylko kluczowe akcje i minimalny panel statusu.
  - reszta UI stonowana (mniej szumu).
- Pasek akcji kontekstowych:
  - 3–5 najczestszych akcji nad mapa zamiast rozbudowanego menu.
- Hover preview:
  - najechanie na LM/AP/korytarz pokazuje podglad trasy/segmentu bez klikania.
- Selection breadcrumbs:
  - szybkie cofanie selekcji (np. Robot -> Korytarz -> Wezel).
- Quick filters (chips):
  - `Tylko online`, `Zadania w toku`, `Bateria < 20%`.
- Follow z “relax”:
  - follow znika po manualnym przesunieciu mapy.
- Jedno miejsce na skroty:
  - tooltipy + overlay pod `H`.
- Plynne animacje:
  - zoom/pan/focus bez “skokow” elementow.
- `Quiet mode`:
  - wycisza warstwy pomocnicze i zostawia tylko roboty + sciezki.

### 9.10) Architektura prosta i odporna (AI-friendly)
- Zasady:
  - jednokierunkowe zaleznosci (`map-core` -> brak UI, `map-window` -> brak backendu).
  - jeden store i przeplyw danych: akcje -> reducer -> state.
  - czyste funkcje geometrii (deterministyczne).
  - jawne kontrakty wejsc/wyjsc + walidacja runtime na granicach.
  - pluginy rejestrowane centralnie, bez globali.
- Struktura pakietow:
  - `packages/map-core` (geometria, transformacje, hit-test, walidacje).
  - `packages/map-window` (render SVG/canvas + scheduler).
  - `packages/map-plugins` (layers/interactions).
  - `packages/map-adapters` (mapowanie danych do `MapState`).
  - `apps/fleet-ui` (kompozycja widokow i paneli).
- Odpornosc na bledy:
  - error boundaries dla mapy i paneli.
  - guardy na selection/viewport (brak null-ref/out-of-bounds).
  - render scheduler z limitem czasu + degradacja (np. mniej warstw).
  - centralny logger + debug overlay.
- AI-friendly dokumentacja:
  - `ARCHITECTURE.md` z grafem zaleznosci i przeplywem danych.
  - README per pakiet + “how-to” dla pluginow.
  - male moduly, spojnosc nazw, brak ukrytych zaleznosci.
  - testy `map-core` + snapshoty renderu warstw.

### 9.11) Szkielet `ARCHITECTURE.md`
- Sekcje:
  - `Overview` (co robi UI i gdzie jest mapa).
  - `Package Graph` (map-core -> map-window -> map-plugins/adapters -> app).
  - `Data Flow` (events -> actions -> reducer -> state -> render).
  - `Key Concepts` (MapState, Layers, Interactions, Selection).
  - `Extension Points` (jak dodac nowa warstwe/interaction).
  - `Error Handling` (fallback UI + logowanie).
  - `Testing` (map-core unit, render snapshot).
  - `Glossary`.

### 9.12) Kontrakty typow (UI-only)
- `MapState`:
  - `graph`: `{ nodes[], edges[], lines[], areas[] }`
  - `viewport`: `{ center: {x,y}, zoom, rotation }`
  - `selection`: `{ type, ids[], primaryId? }`
  - `layers`: `{ hiddenIds[], soloId?, zIndexOverrides? }`
  - `overlays`: `{ hoverId?, highlightIds[], warnings[] }`
  - `annotations`: `{ id, pos, text }[]`
- `UiState`:
  - `mode`: `{ name, tool }`
  - `panels`: `{ leftNavOpen, rightPanelOpen, rightPanelTab }`
  - `filters`: `{ robots, tasks, worksites }`
  - `follow`: `{ enabled, robotId?, smooth }`
  - `commandPalette`: `{ open, query, results[] }`
- `Action` (przyklady):
  - `SET_VIEWPORT`, `SELECT_ITEMS`, `TOGGLE_LAYER`, `SET_MODE`, `SET_FOLLOW`.

## 10) Architektura komponentu mapy (re-use)
- Wydziel `MapWindow` jako niezalezny komponent UI:
  - `MapWindow` = SVG + overlay + minimapa + kontrolki (bez domeny i bez logiki aplikacji).
  - `MapState` + `MapTransform` = wspolny stan mapy + konwersje mapa<->ekran.
- Pluginy/warstwy:
  - `MapLayer` (render krawedzi, wezlow, robotow, korytarzy, przeszkod).
  - `MapInteraction` (click/contextmenu/drag/wheel), emituje zdarzenia bez twardych zaleznosci.
- Adaptery danych:
  - `MapDataAdapter` (np. `FleetAdapter`, `CompilerAdapter`).
  - adapter mapuje dane wejsciowe na ustandaryzowany `MapState`.
- Podzial na warstwy (core/UI):
  - `MapCore` (geometria, hit-test, walidacje, transformacje).
  - `MapUI` (shell renderu: SVG/canvas + minimapa + zoom/pan).

### 10.1) Warstwy i widocznosc
- Model danych:
  - `layerId` i `zIndex` dla `edges` i `areas` (rozszerzenie w `props`).
  - `visibilityRules` w `MapState` (np. `hiddenLayers`, `soloLayer`).
- Render:
  - `LayerManager` sortuje `MapLayer` po `zIndex` i filtruje po `visibilityRules`.
  - `CorridorLayer` rysuje pasy korytarzy, `EdgeLayer` rysuje osie.
- Ukrywanie overlapp:
  - precompute `overlaps` na wielokatach korytarzy (bbox + test wielokatow).
  - priorytet: `selected` > `active` > `layerId` > `width` > `id`.
  - ukryj przegrywajace segmenty (clipPath albo segmentacja i pomijanie).
- UX:
  - panel warstw (checkboxy, `solo` i `mute`).
  - tryb debug `show-overlaps` (podswietlenie konfliktow zamiast ukrywania).

### 10.2) Wizualizacja korytarzy (viewer)
- Zrodlo: `graph.json` (krawedzie + `props.width`).
- Geometria: korytarz jako pas o szerokosci `edge.props.width` wokol krawedzi (aproksymacja beziera na segmenty).
- Interakcja:
  - klik na brzegu mapy = wykrycie bliskosci `meta.bounds`,
  - wybierz najblizszy korytarz (indeks przestrzenny po bbox segmentow),
  - pokaz highlight korytarza + panel/tooltip z metadanymi (id, szerokosc, dlugosc, kierunek).
- Warstwa `CorridorInspectorLayer` renderuje tylko highlight i podswietlenie; reszta mapy bez zmian.

## 11) Edycja mapy (po MVP)

### 11.1) Tryb editor (narzedzia i warstwy)
- Wydzielic tryb `edit` jako osobny zestaw interakcji i warstw (bez mieszania z runtime mapy).
- Narzedzia:
  - `Select/Move`: przesuwanie wezlow, action pointow i kotwic krzywych.
  - `Curve`: edycja `controlPos1/2` na krawedziach (bezier).
  - `Width`: edycja `edge.props.width` (szerokosc korytarza).
  - `Split/Merge`: rozcinanie i laczenie krawedzi, dodawanie LM/AP.
- Warstwy edycyjne:
  - `EditHandlesLayer` (uchwyty na wezlach i control pointach).
  - `CorridorPreviewLayer` (wizualizacja pasow korytarzy i ich kolizji).
  - `ConstraintOverlay` (podswietlenie konfliktow).

### 11.2) Pelna edycja mapy (od zera i modyfikacje)
- Model edycji:
  - `MapDocument` = `{ meta, nodes, edges, lines, areas }` zgodny z aktualnym formatem.
  - stabilne ID dla wezlow/krawedzi; renaming z aktualizacja referencji (workflow, worksite).
- Tryby pracy:
  - `Create`: ustawienie `meta` (bounds, resolution, nazwa), dodawanie wezlow i krawedzi od zera.
  - `Edit`: modyfikacje istniejacych elementow (pos, control points, width, props).
  - `Validate`: szybkie testy poprawnosci (kolizje korytarzy, rozlacznosc grafu, zbyt male odleglosci).
- Zasady bezpieczenstwa:
  - walidacja nakladania korytarzy (bbox + test wielokatow),
  - minimalne odleglosci miedzy krawedziami i wezlami (`minSeparation`),
  - blokada zapisu gdy krytyczne bledy (np. rozlacznosc grafu).
- UX edycji:
  - snapping (do siatki i do istniejacych wezlow),
  - undo/redo (stog zmian) + tryb `draft` vs `committed`,
  - tryb widoku: siatka, miary, highlight kolizji.
- Integracja z workflow:
  - przy zmianie ID wezla: aktualizacja w `workflow.json5` (`bin_locations`, `groups`),
  - przy usunieciu wezla: ostrzezenie i lista referencji.
- Import/Export:
  - import `graph.json` jako `MapDocument`,
  - export do `graph.json` bez zmian w formacie.

### 11.3) Inkrementalna edycja (docelowa)
- `GraphPatch`: `{ op, type, id, changes }` gdzie `op` = add/update/remove.
- `changedIds[]` przekazywane do preview i walidacji.
- Przeliczanie lokalne:
  - przelicz tylko krawedzie/wezly z `changedIds` + sasiadow (adjacency list),
  - cache geometrii korytarzy/bezier/bbox (dirty flag per edge),
  - overlap test ograniczony do obszaru bbox (spatial index).
- Pipeline:
  - drag -> lokalny patch -> update `MapState` -> szybki preview,
  - debounce -> wyslij tylko zmienione elementy do kompilatora (opcjonalnie),
  - odpowiedz -> aktualizacja tylko warstw preview.

### 11.4) Integracja z map compilerem (live preview)
- `CompilerAdapter` jako niezalezny modul (UI nie zna backendu).
- `CompilerPreviewLayer` renderuje wynik kompilacji (korytarze + ostrzezenia).
- `EditSession` trzyma wersje `draft` grafu oraz status kompilacji.
- Przeplyw:
  - drag sciezki -> lokalny preview (map-core, aproksymacja),
  - co X ms (debounce) -> wyslij patch do `CompilerAdapter`,
  - odpowiedz -> update `CompilerPreviewLayer` + warningi,
  - drop -> finalna kompilacja, zapis jako `draft`.
- Kontrakt:
  - wejscie: `{ graph: MapDocument, changedIds[], mode: "preview"|"final" }`,
  - wyjscie: `{ corridors[], overlaps[], warnings[] }`.
- UX:
  - status preview (busy/ok/error),
  - fallback do lokalnego preview przy error,
  - toggle: “strict preview” (zatrzymuje drag przy error).

### 11.5) Uproszczona architektura edycji (wariant minimalny)
- Alternatywa dla 11.3/11.4, gdy priorytetem jest prostota implementacji.
- Model danych:
  - tylko `SourceGraph` (edytowalny) + `RenderState` (prymitywy do rysowania),
  - brak osobnego `CompiledGraph` i brak delta-API.
- Kontroler:
  - `EditorController` jako jedyna “pompka”: UI input -> modyfikuje `SourceGraph` -> przelicza `RenderState` dla dirty krawedzi.
- Proste komendy:
  - `setNodePos`, `setEdgeControl`, `setEdgeWidth`, `addEdge`, `removeEdge`.
- Inkrementalnosc:
  - `DirtySet` po `edgeId` + przeliczenie tylko zmienionych krawedzi i ich sasiadow,
  - overlap/kolizje liczone dopiero po `drop`.
- Kompilator zewnetrzny (opcjonalnie):
  - wywolanie tylko po `drop`, jeden request, bez streamu/preview.

## 12) Walidacja statyczna
- Porownac liste plikow mapy/menu przed i po (diff).
- Sprawdzic, czy wszystkie zaleznosci i importy sa spojne.
- Sprawdzic, czy struktura DOM i klasy w mapie/menu nie zostaly naruszone.
- Utrzymac liste w `apps/fleet-ui-mock/VALIDATION.md` (checklisty statyczne + opcjonalne smoke/E2E).
- Zweryfikowac kolejnosc skryptow w `public/index.html` (bez zmian).
- Zweryfikowac kontrakty danych `public/data/*` (graph/workflow/robots/packaging).

## 13) Scenariusze mock danych
- Przygotowac 1-2 sceny:
  - mapa + kilka robotow,
  - lista LM/AP,
  - akcje z menu (np. "go here", "set target").
- Utrzymac nazwy pol dokladnie jak w starym UI.

## 14) Dokumentacja
- Opis co jest mockiem, co jest 1:1 ze starego UI (README).
- Lista zachowanych komponentow i ich lokalizacja (README).
- Instrukcja jak podmienic mock na realny backend (README).
- Checklista walidacji w `apps/fleet-ui-mock/VALIDATION.md`.

## 15) Plan migracji krok po kroku (stary prototyp -> UI mock)
- Krok 1: przygotuj nowy projekt `apps/fleet-ui-mock` (minimalny build + statyczny hosting).
- Krok 2: skopiuj `apps/traffic-lab/public/` 1:1 (HTML/CSS/JS + `public/data/*`).
- Krok 3: uruchom mock serwer statyczny dla `public/` (bez zmian w kodzie UI).
- Krok 4: dodaj mock API `/api/fleet/status` zgodny z kontraktem (na start stale dane).
- Krok 5: podlacz odswiezanie statusu (polling), sprawdz czy UI list/robots renderuje sie bez bledow.
- Krok 6: dodaj tick ruchu robotow (prosty loop po krawedziach grafu).
- Krok 7: dodaj obsluge menu kontekstowego (pozostaje bez zmian, dane z mocka).
- Krok 8: wprowadz `MapShell` jako wrapper nad istniejacym DOM (bez refaktoru `app.js`).
- Krok 9: wydziel `MapWindow` + `MapLayers` jako pluginy (stopniowo przenoszone z `app.js`).
- Krok 10: wprowadz `MapState/Store` i adaptery, podmieniajac bezposrednie mutable global state.
- Krok 11: dodaj panel warstw i podstawowe UX (fit, follow, legend).
- Krok 12: dokumentacja i checklisty walidacji (statyczny diff i akceptacja).

### 15.1) Ulepszenia planu migracji
- Zablokuj scope: najpierw “read-only UI” (bez edycji mapy), dopiero potem interakcje.
- Wydziel kamienie milowe z checkpointami:
  - M1: UI renderuje sie bez bledow (statyczne dane).
  - M2: mock status + ruch robotow.
  - M3: wydzielony `MapShell`/`MapWindow`.
  - M4: pluginy i `MapState`.
- Wprowadz kontrakt testowy:
  - snapshot DOM/CSS dla mapy/menu,
  - testy `map-core` na geometrii i hit-test.
- Dodaj “compat shim”:
  - warstwa, ktora mapuje stary kod (`app.js`) na nowe API bez refaktoru.
- Ogranicz ryzyko:
  - migruj najpierw mape (warstwy), potem panele, potem menu,
  - utrzymaj fallback do starego UI (feature flag).

## 16) Akceptacja (bez uruchamiania)
- Modul mapy i menu przeniesione bez zmian (ten sam kod).
- Ten sam shape danych w adapterze.
- Brak zmian w CSS klasach mapy/menu.
- Wszystkie importy i zaleznosci mapy/menu przechodza w nowym projekcie.
- W mocku widac przesuwanie znacznikow robotow (ruch po grafie).

## 17) Plan refaktoru modulowego (AI-friendly)
Cel: rozbic monolit na male moduly z jasnym API, bez zmiany zachowania UI.

### 17.1) Etap 1 - kontrakty i store
- Spisac API modulow: `MapCore`, `MapLayers`, `DataSource`, `ScenesManager`, `Views`.
- Zamrozic eventy (np. `map:context`, `scene:changed`, `selection:changed`).
- Utrzymywac stan tylko przez store (`getState/setState/subscribe`).

### 17.2) Etap 2 - MapCore
- Wydzielic `public/modules/core/map_core.js`.
- API: `init({svg, miniSvg, store, layers})`, `setData({graph, workflow, robots, obstacles})`, `destroy()`.
- Przeniesc: `renderMap`, `renderMiniMap`, `bindMapInteractions`, `bindKeyboardShortcuts`, `updateViewBox`.

### 17.3) Etap 3 - MapLayers (pluginy)
- Wydzielic `public/modules/core/map_layers.js`.
- API: `register(layer)`, `render(state)`, `setVisibility(layers)`.
- Warstwy jako osobne moduly: `layers/edges.js`, `layers/nodes.js`, `layers/worksites.js`, `layers/robots.js`, `layers/obstacles.js`.

### 17.4) Etap 4 - MapOverlay (menu i tooltipy)
- Wydzielic `public/modules/map_overlay.js`.
- API: `init({root, store, events})`, `destroy()`.
- Przeniesc: `initWorksiteMenu`, `initManualMenu`, `initMapMenu` + pozycjonowanie.

### 17.5) Etap 5 - DataSource i ScenesManager
- `public/modules/services/data_source.js`: `fetchConfig`, `fetchMapBundle`, `streamStatus`.
- `public/modules/services/scenes_manager.js`: `load()`, `activate(sceneId,mapId)` i event `scene:changed`.
- `app.js` nie robi bezposrednich fetchy.

### 17.6) Etap 6 - Views jako komponenty
- `public/modules/views/map_view.js`, `robots_view.js`, `streams_view.js`, `scenes_view.js`, `settings_view.js`.
- API: `init({root, store, services})`, `render(state)`.

### 17.7) Etap 7 - Compat shim
- `public/modules/compat/app_shim.js` mapuje stare wywolania na nowe moduly.
- Pozwala migrowac bez "big-bang".

### 17.8) Etap 8 - Testy i cleanup
- E2E bez zmian (mapa + sceny).
- Dodac minimalne testy kontraktowe (np. `MapCore.setData` nie rzuca).
- Usunac przeniesione fragmenty z `app.js`.
