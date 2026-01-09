# Recenzja — Fleet Manager 2.0: Specyfikacja UI / Mock UI (v0.1)

**Recenzowany dokument:** `specyfikacja_ui_fleet_manager_v0_1.md` (v0.1 / 2026-01-06)  
**Zakres recenzji:** UI/UX + mock (bez recenzji algorytmów floty).  
**Data recenzji:** 2026-01-06

---

## Prompt, który spowodował wygenerowanie tej recenzji

```text
Rola: Jesteś principal UX/UI designerem oraz lead frontend engineerem. Masz zrecenzować dokument „Fleet Manager 2.0 — Specyfikacja UI / Mock UI (v0.1)”.

Cel: przygotuj bezlitosną, ale konstruktywną recenzję specyfikacji UI tak, aby:
- była bardziej jednoznaczna (mniej interpretacji),
- była bardziej profesjonalna (standardy dokumentowania),
- była bardziej odporna na błędy (UX safety + błędy danych/połączenia),
- lepiej nadawała się do implementacji (przez człowieka i przez AI),
- była future‑proof (ewolucja produktu i backendu),
- a równocześnie zachowała ducha „Nowy Styl” i UX układu ze starego prototypu.

W recenzji opisz:
- co byś poprawił,
- jakie błędy/nieścisłości widzisz,
- co byś ulepszył,
- jak zrobić ją future‑proof,
- jak podnieść jakość i profesjonalizm,
- jak zwiększyć odporność na błędy,
- jak przygotować spec pod pracę z AI,
- jak poprawić intuicyjność dla operatora,
- jak uprościć implementację,
- jak zaprojektować mock tak, żeby później integracja z prawdziwym core była maksymalnie bezbolesna.

Wymagania:
- Odwołuj się do konkretnych sekcji/elementów specyfikacji.
- Proponuj konkretne dopiski/zmiany, nie ogólne „warto rozważyć”.
- Nie zmieniaj scope (to nadal spec UI+mock), ale możesz wskazać interfejsy i kontrakty potrzebne UI.
Wyjście: recenzja w Markdown, z czytelnymi nagłówkami odpowiadającymi punktom listy.
```

---

## TL;DR — najważniejsze „quick wins” do v0.2

1. **Nadaj wymaganiom identyfikatory i domknij niejednoznaczności**: np. `UI-MAP-001`, `UI-ROBOTS-012` + kryteria akceptacji.  
2. **Ujednolić kontrakty połączenia i endpointy**: w tekście pojawia się `/api/status`, a później `/api/fleet/status` — trzeba jednego kanonicznego healthchecku i jednego modelu „stale/offline”.  
3. **Rozdziel „selection” od „control” dla robota**: klik w robota nie powinien domyślnie włączać manual (ryzyko safety + błędy operatora).  
4. **Doprecyzuj semantykę komend i feedbacku**: ACK transportowy vs efekt w świecie, idempotency key, timeouty, retry i to, jak UI to prezentuje.  
5. **Dodaj rozdział Accessibility + operacyjne ergonomie**: klawiatura, focus, kontrasty, tryb „duże ekrany/ściana TV”, a nie tylko „ładnie wygląda”.  
6. **Spisz minimalne schemy danych (JSON Schema / Zod) + przykładowe payloady**: to turbo‑podnosi jakość i AI‑friendliness.  
7. **W mocku przewidź record/replay lub deterministic seed**: debug UX bez „losowości”, łatwiejsze testy i integracja.

---

## 1) Co bym w niej poprawił

### 1.1 Struktura dokumentu: dwie warstwy (normatywna vs opisowa)
W dokumencie jest sporo dobrych „MUST/SHOULD”, ale miejscami miesza się:
- wymaganie (co musi być),
- z propozycją (jak można),
- z uzasadnieniem (dlaczego).

**Zmiana do v0.2:**
- Na początku każdego widoku dodać krótką sekcję **„Wymagania minimalne (MUST)”** + **„Zalecenia (SHOULD)”** + **„Uwagi (Notes)”**.
- Wyrzucić „opcjonalnie” z miejsc, które wpływają na architekturę UX (np. panel szczegółów robota jest opisany jako SHOULD, ale jest kluczowy dla ergonomii i redukcji ryzyka; to powinno zostać decyzją: albo MUST od v0.2, albo jawnie „nie w MVP”).

### 1.2 Słownik pojęć (terminologia)
Spec operuje pojęciami: *manualMode, controlled, dispatchable, taskStatus, activity, diag, stale* itd. Bez słownika łatwo o rozjazdy implementacyjne.

**Dodałbym sekcję „Słownik/Terminologia”** z definicjami i regułami:
- **selected robot** vs **manual target robot** (to są dwa różne stany),
- **manualMode** (tryb robota) vs **manual drive panel enabled** (tryb UI),
- **pause/resume** (pauza taska? pauza nawigacji? pauza ruchu?),
- **stop/cancel** (czy stop oznacza „zatrzymaj nawigację” czy „anuluj task”),
- **blocked** vs **stalled** vs **holding** (w UI to się miesza, a operator musi rozumieć różnicę).

### 1.3 Kryteria akceptacji / „Definition of Done” per widok
Masz checklistę w rozdziale 20 — super — ale brakuje kryteriów, które da się obiektywnie odhaczyć.

**Propozycja:**
- Dla każdego widoku 8–15 kryteriów w stylu:
  - „Gdy offline >2s, overlay się pokazuje, a przyciski komend są disabled (tooltip wyjaśnia).”
  - „Klik w robota otwiera drawer, a akcje ryzykowne zawsze wymagają modala.”
  - „Minimap zawsze pokazuje viewport głównej mapy i umożliwia drag.”

### 1.4 Ujednolicenie stylu kontraktów UI↔Backend
Rozdział 16 jest bardzo przydatny, ale:
- miesza „minimalne modele” z „minimalnymi endpointami” bez precyzyjnych payloadów,
- nie mówi o **SSE envelope** (format zdarzeń, `seq`, `ts`, `type`),
- nie określa zasad kompatybilności (wersjonowanie).

**W v0.2 dodałbym:**
- minimalną specyfikację streamu zdarzeń (nawet jeśli to „tylko UI”): `EventEnvelope { seq, ts, type, data }`,
- OpenAPI albo chociaż JSON Schema + przykładowe odpowiedzi dla 5 najważniejszych endpointów.

---

## 2) Jakie błędy / nieścisłości widzę

### 2.1 Niespójność endpointów health/status
W rozdziale 5.2 pojawia się polling do **`/api/status`**, a w rozdziale 16.2 występuje **`GET /api/fleet/status`** oraz `GET /api/fleet/state`.

**Dlaczego to problem:** implementator nie wie, co jest kanoniczne; łatwo o dwa równoległe mechanizmy.

**Poprawka:** wybrać jedno:
- `GET /api/health` (najprościej) jako „transport OK”,
- `GET /api/fleet/state` jako „dane domenowe”,
- i jasno opisać, który endpoint steruje stanem Connected/Stale/No connection.

### 2.2 Klik w robota włącza manualMode (ryzyko UX safety)
W rozdziale 6.6 jest zachowanie „jak prototyp”: klik w robota może włączyć manualMode.

**Błąd projektowy:** to miesza *wybór obiektu* z *akcją sterującą* i zwiększa ryzyko przypadkowego przejęcia sterowania.

**Poprawka (proponowana reguła):**
- Klik = **select + open details** (zero efektów w świecie).
- ManualMode włączane tylko:
  - z wyraźnego przycisku (w drawerze / w tabeli),
  - zawsze z potwierdzeniem w LIVE,
  - z dodatkowym „armed state” (np. operator musi aktywować „Tryb manual” w UI jako osobny krok).

### 2.3 „Double click reset view” może kolidować z oczekiwaniami
W mapach zwykle double‑click zoomuje, a nie resetuje. Jeśli zmienimy to na reset, użytkownik będzie się mylił (szczególnie serwis/technicy, którzy używają innych map).

**Poprawka:** zostawić double‑click jako „zoom in” (standard), a reset/fit jako jawne przyciski + skróty klawiaturowe.

### 2.4 Semantyka „Stop / Cancel / Zakończ” jest rozmyta
W spec pojawia się:
- „Zakończ” w Nav Controls,
- „Stop” w tabeli robotów,
- „Cancel task” w zadaniach,
- „Stop navigation / Cancel task” w potwierdzeniach.

**Ryzyko:** implementacja zrobi 3 różne endpointy i 3 różne skutki.

**Poprawka:** wprowadzić 2–3 kanoniczne komendy z definicją skutku:
- `pauseNavigation` (odwracalne),
- `stopNavigation` (zatrzymaj i wyczyść aktualny cel, ale nie zabij taska),
- `cancelTask` (destrukcyjne, task kończy się w stanie cancelled).

### 2.5 Brak formalnej definicji „stale”
Dokument mówi o „Stale” i „ostatniej aktualizacji”, ale nie ma reguły:
- kiedy stale się zapala (np. >2× expected interval?),
- kiedy gaśnie,
- jak stale wpływa na możliwość wysyłania komend.

**Poprawka:** dodać parametry:
- `expectedStateIntervalMs` (np. 200–1000ms w SSE, 1–2s w polling),
- `staleAfterMs` (np. 3000ms),
- `offlineAfterMs` (np. 2000ms bez healthchecku),
- i opisać UI: stale = „dane mogą być stare, ale połączenie jest”, offline = „nie ma połączenia”.

### 2.6 „Capabilities” są wspomniane, ale nie mają modelu
W rozdziale 7.4 jest sugestia, że reguły disabled wynikają z capabilities, ale nie ma nigdzie listy capability ani jak je pobrać.

**Poprawka:** dodać minimalne pole w `Robot`:
- `capabilities: { canManual: boolean, canPause: boolean, canSeizeControl: boolean, canGoToPoint: boolean, ... }`
albo globalny katalog capability per provider.

---

## 3) Co bym ulepszył (konkretnie)

### 3.1 Widok Roboty: redukcja „przeładowania akcjami”
Tabela w 7.3 ma bardzo dużo kolumn akcyjnych (Dispatch, Control, Manual, Nav). Na mniejszych ekranach to będzie „pulpit cockpit”, ale bez ergonomii.

**Ulepszenie UX:**
- Zostawić w tabeli:
  - najważniejsze statusy + 1–2 akcje „bezpieczne”,
- resztę przenieść do:
  - **kolumny „Actions” jako menu (⋯)**,
  - lub do **drawer** (docelowo).
To jest też łatwiejsze do implementacji i do utrzymania.

### 3.2 Widok Mapa: tryb „obserwacja” vs „operowanie”
Mapa jest miejscem, gdzie łatwo popełnić błąd.

**Ulepszenie:**
- Dodać przełącznik trybu:
  - **Observe** (domyślnie) — żadnych komend, tylko selekcja i podgląd,
  - **Operate** — dopiero wtedy aktywne menu manual/obstacles (z wyraźnym oznaczeniem).
To minimalizuje „misclick disasters”.

### 3.3 Alerty i awarie: toasty są za mało trwałe
Toasty znikają. Operator czasem potrzebuje listy „co się stało”.

**Ulepszenie:**
- Globalny **Event/Alert drawer** (ikonka dzwonka w headerze) z historią ostatnich N zdarzeń i filtrami.
- Toast = tylko „snack”, ale wszystko trafia do logu.

### 3.4 Empty states i loading states per widok
Spec mówi o spinnerach i toastach, ale nie definiuje „co widać, gdy nie ma danych”.

**Ulepszenie:** dodać dla każdego widoku:
- stan „loading” (skeleton),
- stan „empty” (brak scen/robotów),
- stan „error” (z retry).

### 3.5 Design tokens: kontrast i dostępność
Tokeny kolorów są miłe, ale nie ma wymagań kontrastowych ani focus states.

**Ulepszenie:** dodać wymagania:
- minimalny kontrast tekstu do tła,
- widoczny focus ring,
- obsługa klawiatury (Tab/Shift+Tab, Enter, Esc),
- ARIA dla menu kontekstowych i modali.

---

## 4) Jak zrobić, żeby spec była bardziej future‑proof

### 4.1 Wersjonowanie kontraktów (UI nie może „zgadywać”)
Wprowadzić zasady:
- `/api/v1/...` albo `X-Api-Version`,
- `schemaVersion` w payloadach,
- kompatybilność wsteczna (UI toleruje dodatkowe pola, ale nie brak krytycznych).

### 4.2 Feature flags i capability‑driven UI
Zamiast „hardcoded reguł”, UI powinno pytać:
- co jest dostępne w danej instalacji (różne roboty, różne providery).

**Przykład:**
- `GET /api/fleet/capabilities` (globalne)
- + `Robot.capabilities` (per robot)
Dzięki temu UI przetrwa zmianę backendu bez przepisywania logiki disabled.

### 4.3 Skalowanie: więcej robotów i większe mapy
Już teraz warto dodać w spec:
- limit docelowy (np. 50/100/300 robotów),
- strategię renderingu mapy (SVG + culling; później Canvas/WebGL),
- w tabelach: wirtualizacja (np. react-window) od progu N.

### 4.4 Multi‑map / multi‑site
Sceny już sugerują wiele map. Future‑proofing:
- w headerze i w sidebarze stale widoczny kontekst „aktywny site/mapa/scena”,
- w linkach/route uwzględniać `sceneId/mapId` (nawet jeśli w MVP jest jedna).

### 4.5 Internationalization (i18n) i formatowanie liczb/jednostek
Nawet jeśli UI ma być po polsku:
- formatowanie liczb, jednostek, timestampów powinno być przez jedną warstwę (np. `format.ts`),
- wszystkie stringi przez dictionary (ułatwia później tłumaczenia i spójność).

---

## 5) Jak podnieść jakość specyfikacji (żeby była „lepszej jakości”)

### 5.1 Identyfikatory wymagań + testowalność
Każdy wymóg MUST/SHOULD powinien mieć:
- ID,
- krótkie uzasadnienie (opcjonalnie),
- kryterium akceptacji.

To robi różnicę między „ładnym opisem” a specyfikacją.

### 5.2 Wzorce interakcji opisane jako „flows”
Dodać 6–10 kluczowych flow (1–2 strony każdy):
- „Operator widzi stale → przechodzi do robota → sprawdza diag → center on map → włącza operate → dodaje obstacle → weryfikuje poprawę”.
- „Manual: select robot → arm manual → go-to-point → pause/resume → release”.

Flow powinny mieć:
- preconditions,
- kroki,
- expected UI feedback,
- failure paths.

### 5.3 Przykładowe payloady
W rozdziale 16 są modele, ale brakuje przykładów JSON.

Dodałbym (minimum):
- `Robot` (online i offline),
- `Task` (in_progress i failed),
- `Worksite`,
- `EventEnvelope` dla SSE.

### 5.4 „Out of scope” też dla UI
Dokument ma zakres, ale dodałbym jawne non‑goals UI, np.:
- brak edytora grafu/mapy w UI v0.x,
- brak zarządzania użytkownikami,
- brak raportowania KPI (jeśli to nie jest celem MVP).

---

## 6) Jak zrobić, żeby była bardziej profesjonalna

### 6.1 Document control
Dodać sekcję:
- owner dokumentu,
- status (draft),
- changelog (v0.1 → v0.2),
- linki do zależnych speców (STATUS_CONTRACT, MAP_API),
- lista otwartych decyzji (z ownerem i terminem decyzji).

### 6.2 Standardy UI: accessibility + responsywność
Profesjonalne UI w 2026 bez accessibility to dług technologiczny od pierwszego dnia.

Dopisać:
- minimalny poziom WCAG (choćby „AA dla tekstów i kluczowych kontrolek”),
- minimalne breakpointy (np. 1366×768 jako minimum operatorskie),
- zasady dla „wallboard” (duży ekran, read‑only).

### 6.3 Zasady logowania zdarzeń i audytu w UI
W środowisku przemysłowym:
- „kto kliknął co i kiedy” jest często obowiązkowe.

UI powinno:
- wysyłać `actor` (użytkownik) wraz z komendą,
- pokazywać `commandId`,
- a w przyszłości: link do audit log.

---

## 7) Jak zwiększyć odporność na wszelkiego typu błędy

### 7.1 Walidacja runtime danych z backendu
Typy w TS nie wystarczą. W LIVE trzeba zakładać, że payload może być:
- niekompletny,
- w starej wersji,
- z nullami.

**Rekomendacja:** runtime validation (Zod/Valibot/io-ts):
- waliduj krytyczne modele (Robot/Task/Worksite),
- błędy walidacji nie wywalają UI — pokazują „Data error” + event log.

### 7.2 Błędy sieci i retry: polityka
Spec mówi „nie w pętli” — dobrze — ale warto doprecyzować:
- backoff (np. 0.5s → 1s → 2s → 5s),
- limit retry,
- manual „Retry now”.

### 7.3 Error Boundaries i izolacja widoków
W React‑owym świecie: jeden błąd renderowania nie może zabić całej aplikacji.

**Dopisać:** global error boundary + per‑view boundary:
- MapView ma swój fallback (np. „Mapa niedostępna, spróbuj odświeżyć dane”),
- RobotsView działa nadal.

### 7.4 Idempotency i „ghost commands”
UI powinno generować `commandId` i pokazywać go w toście/logu. Backend może wtedy:
- deduplikować retry,
- a UI może bezpiecznie powtórzyć komendę.

W spec (rozdz. 5.3) jest ogólnik o retry — dodałbym konkret:
- `POST /commands` zawsze przyjmuje `{ commandId, actor, ts, payload }`.

### 7.5 Bezpieczne defaulty w LIVE
Dopisać zasady:
- LIVE startuje w trybie **read‑only** (dopiero operator przełącza na operate),
- wszystkie akcje ryzykowne są „gated” (confirm + reason w produkcji),
- przy stale/offline: automatycznie wraca do read‑only.

---

## 8) Jak zrobić, żeby lepiej nadawała się do pracy z AI

### 8.1 Struktura „AI‑parsowalna”
AI lubi jednoznaczne, atomowe wymagania.

Dopisałbym:
- sekcję **„Konwencje nazewnictwa”** (komponenty, eventy, statusy),
- sekcję **„Kontrakty (kanoniczne schemy)”** jako osobne bloki JSON,
- listę wymagań jako checklisty z ID.

### 8.2 „Komponent katalogowy” z API komponentów
W rozdziale 4 masz inwentarz, ale brakuje:
- propsów i eventów (np. `ModalConfirm` ma `title`, `danger`, `requireReason`),
- przykładów użycia.

AI łatwiej wygeneruje kod, jeśli dostanie mini‑API komponentów w formie:
- tabelki/sekcji: `Component: Table`, `Props`, `Events`, `States`.

### 8.3 Wyraźny „golden path” implementacji
Dodać rozdział „Kolejność budowy prototypu”, np.:
1) App shell + routing,
2) DataSource (mock),
3) Robots view,
4) Map view,
5) Settings + toggle mock/live,
6) reszta widoków jako skeletony.

AI wtedy mniej „dryfuje” i nie buduje wszystkiego naraz.

### 8.4 Kontrakt testowy (fixtures)
Dodać folder „fixtures” (w spec jako wymaganie):
- kilka stałych snapshotów stanu floty,
- kilka eventów SSE,
- scenariusze: offline, stale, blocked, manual, task fail.

To pozwala AI (i ludziom) robić snapshot/visual tests.

---

## 9) Jak zrobić, żeby była lepsza i bardziej intuicyjna dla użytkownika

### 9.1 Priorytety informacji: „najpierw problem”
Operator zwykle chce:
- które roboty są problematyczne,
- gdzie jest problem na mapie,
- co można bezpiecznie zrobić.

**Propozycje:**
- domyślne sortowanie tabeli: problems first (stalled/blocked/offline),
- w headerze licznik alertów,
- w mapie możliwość „highlight only issues”.

### 9.2 Spójna nawigacja między widokami
W drawerze robota dodać quick links:
- „Zobacz task” (przenosi do Zadania z filtrem),
- „Zobacz diag” (przenosi do Diagnostyka z highlight),
- „Zobacz na mapie” (już jest — super).

### 9.3 Redukcja ryzyka pomyłek
- Wyraźnie odróżniać kolorem i tekstem:
  - manual target (aktywny),
  - selected (podgląd),
  - controlled by someone else.
- Dodać „undo” dla przeszkód (już zasugerowane) jako standard, nie „może”.

### 9.4 Mikro‑feedback i edukacja
Masz tooltips i toasty — super. Ulepszyłbym:
- mini‑help overlay (?), który pokazuje skróty klawiaturowe,
- onboarding w mocku: „Kliknij robota, otwórz szczegóły, spróbuj dodać przeszkodę”.

---

## 10) Jak zrobić, żeby była łatwiejsza do implementacji

### 10.1 Doprecyzować stack i granice (nawet jeśli elastyczne)
Spec nie mówi, czy to React/Vue/Svelte. Jeśli to ma być prototyp szybko:
- warto wskazać rekomendowany stack (np. React + Vite + TS),
- oraz minimalne biblioteki (router, state, SSE).

Nie musi być dogmat, ale oszczędza czas i rozjazdy.

### 10.2 Mniej „prawie endpointów”, więcej „jednego modelu komend”
Zamiast mnożyć endpointy typu `/robots/:id/go-point`, `/go-target`, `/motion`:
- rozważyć jeden endpoint `POST /robots/:id/commands` z `type`.

To ułatwia zarówno mock, jak i live (adapter pattern).

### 10.3 Rozdziel UI state od domain state (konkretnie)
W spec jest zasada „stateless”, ale implementator i tak zapisze coś gdzieś.

Dopisać listę:
- **persistowane preferencje**: filtry, widoczność warstw mapy, ostatni widok,
- **nie‑persistowane**: selected robot, manual target, otwarte menu kontekstowe.

### 10.4 Wskazać progi wydajnościowe
Proste liczby pomagają implementacji:
- ile FPS/ile ms na tick,
- ile robotów bez virtualizacji,
- ile elementów mapy.

---

## 11) Jak zrobić, żeby mock był łatwiejszy do zintegrowania (później z core)

### 11.1 Mock powinien „udawać LIVE” na poziomie kontraktów
Masz DataSource adapter — to świetny kierunek. Żeby integracja była bezbolesna:
- mock powinien emitować **te same eventy** co live (ten sam envelope),
- i używać **tych samych modeli** (Robot/Task/Worksite/Scene).

### 11.2 Determinizm + record/replay
Losowe awarie są fajne, ale utrudniają debug. Minimum:
- seed do RNG (ustawiany w Settings),
- przycisk „Freeze / Step” (tick ręczny),
- opcjonalnie: nagrywanie ostatnich 60s eventów i replay.

To przyspiesza prace UX i testy regresji.

### 11.3 Mock jako warstwa HTTP (opcjonalnie, ale bardzo praktyczne)
Zamiast in-memory bezpośrednio w UI:
- użyć MSW (Mock Service Worker) i wystawiać „prawie prawdziwe” endpointy.
Wtedy przełączenie na LIVE to realnie zmiana baseURL, a nie inny kod-path.

### 11.4 Contract tests
Dodać wymaganie:
- „MockDataSource i LiveDataSource MUSZĄ przechodzić te same testy kontraktowe” (fixtures + test harness).
To jest najtańszy sposób na uniknięcie „mock działa, live nie działa”.

---

## Dodatkowe propozycje (bonus)

- **Tryb „Read‑only wallboard”**: widok mapy + kluczowe metryki bez akcji.  
- **Jedno miejsce na „Safety interlock”**: banner w headerze + przełącznik „Operate” + status „Armed”.  
- **Eksport/Import ustawień UI** (filtry, layout) — przydatne w uruchomieniach.  
- **Ujednolicone formatowanie czasu**: wszędzie „age” + timestamp w tooltipie.

---

## Proponowana lista zmian do v0.2 (najkrócej)

- [ ] Ujednolić health/status endpointy i definicję stale/offline.  
- [ ] Rozdzielić select robota od manual/control (klik nie uruchamia manual).  
- [ ] Wprowadzić słownik pojęć + mapowanie komend (pause/stop/cancel).  
- [ ] Dodać JSON Schema/Zod + przykładowe payloady + SSE envelope.  
- [ ] Dodać accessibility requirements (focus, klawiatura, kontrast).  
- [ ] Dodać requirement IDs + acceptance criteria per widok.  
- [ ] Mock: deterministic seed + (opcjonalnie) record/replay + wspólny kontrakt testowy.
