# Fleet Manager 2.0 — Specyfikacja UI / Mock UI (v0.1)

## Prompt

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

---

## 0. Informacje o dokumencie

**Wersja:** v0.1 (draft)  
**Data:** 2026-01-06  
**Status:** robocza specyfikacja UI + klikalny mock (zakres UX/wygląd)  
**Zakres:** wyłącznie UI/UX oraz mock danych; algorytm floty i architektura core są poza zakresem (są tylko tłem).

### 0.1 Źródła (co analizowano w starym prototypie)

UI prototypu (najważniejsze dla wyglądu i zachowań):
- `apps/traffic-lab/public/index.html`
- `apps/traffic-lab/public/styles.css`
- `apps/traffic-lab/public/app.js` (+ skrypty pomocnicze `domain_*.js`, `packaging_engine.js`)

Dokumenty kontekstowe (UI‑relevant: odporność, kontrakty, stany):
- `docs/rds/nowy-styl/requirements.md` (sekcja “Aplikacje UI (frontend)” + zasady odporności)
- `docs/rds/docs/STATUS_CONTRACT.md` (mapowanie statusów)
- `docs/rds/docs/MAP_API.md` (współrzędne i semantyka mapy)

---

## 1. Cele UX i zasady projektowe

### 1.1 Cele UX (co ma “czuć” użytkownik)

UI ma dawać operatorowi trzy rzeczy naraz:
1) **Orientację** (co się dzieje w systemie w tej chwili).  
2) **Kontrolę** (umiejętność wykonania bezpiecznych akcji operatorskich).  
3) **Zaufanie** (wiadomo, kiedy dane są aktualne, a kiedy UI “udaje”).

### 1.2 Zasady projektowe (normatywne)

- UI **MUST** być czytelne w 3 sekundy: po otwarciu widać, gdzie jestem (widok), co jest kluczowe (stan floty) i co mogę zrobić (akcje).  
- UI **MUST** dawać feedback na każdą akcję: *pending → success / error* (nawet w mocku).  
- UI **MUST NOT** wykonywać ryzykownych akcji “bez ostrzeżenia” (stop/pauza/tryb manual/aktywacja sceny).  
- UI **MUST** rozróżniać: brak danych / dane przestarzałe / dane aktualne.  
- UI **SHOULD** być możliwie “stateless” po stronie przeglądarki: persystuj tylko preferencje UI (np. filtry, widok mapy), a nie “prawdę o świecie”.  
- UI **SHOULD** działać w trybie multi‑frontend: kilka okien/komputerów jednocześnie patrzy na to samo (konflikty rozstrzyga backend; UI ostrzega, gdy ktoś inny zmienił stan).  

### 1.3 Persona i kontekst pracy

- **Operator (standard)**: obserwuje mapę i roboty, reaguje na blokady, ustawia occupancy/blocked worksites, czasem przełącza robot w manual.  
- **Inżynier uruchomień / serwis**: używa scen, ustawień algorytmów, diagnostyki i narzędzi symulacyjnych.  
- **Tryb demo / szkolenie**: mock z animacją robotów (żeby “coś żyło”), bez ryzyka realnych akcji.

---

## 2. Architektura informacji (IA) i nawigacja

### 2.1 Układ główny (zachować z prototypu)

**MUST** zachować layout 3‑częściowy:
- **Lewy sidebar**: logo + nazwa + lista widoków + przycisk wylogowania.  
- **Nagłówek (header)**: tytuł widoku + krótki opis + stan sesji / połączenia.  
- **Panel treści**: jeden aktywny panel na raz (stack).

### 2.2 Lista widoków (MUST)

1. **Mapa** — realtime mapa grafu, worksites, roboty, przeszkody, akcje manual.  
2. **Roboty** — tabela/lista robotów + akcje + diagnostyka + szybki podgląd tasków.  
3. **Pola** — lista worksites (pick/drop) + stany (filled/empty/blocked).  
4. **Bufory** — UI buforów opakowań + edycja komórek + zgłoszenia linii (mock może uprościć).  
5. **Streamy** — konfiguracja i stan strumieni.  
6. **Sceny** — lista scen i map, aktywacja sceny/mapy.  
7. **Ustawienia** — tryb danych (mock/live), tryb symulatora, wybór strategii dispatch/traffic, parametry.  
8. **Zadania** — lista tasków, status/phase, relacja pick→drop, robot, stream.  
9. **Diagnostyka** — widok blokad/locków/kolejek/stalli + powiązanie z mapą.  
10. **Awarie** — narzędzia do wstrzykiwania problemów (TYLKO w Mock/Sim; w Live ukryte).

### 2.3 Meta w nagłówku (MUST)

Header ma zawsze pokazywać:
- **Tytuł** widoku (krótki).  
- **Opis** (1 zdanie).  
- **Status połączenia**:
  - `Connected` / `No connection` / `Stale` (z tooltipem: ostatnia aktualizacja).  
- **Użytkownik** (nazwisko/login) + opcjonalnie rola (`Operator`, `Admin`).

---

## 3. Styl wizualny i design tokens

### 3.1 Kierunek wizualny (MUST)

Zachować “Nowy Styl” z prototypu:
- jasny, ciepły gradient tła,
- karty/panele z miękkimi zaokrągleniami,
- cienkie linie obramowania,
- delikatne cienie,
- akcent pomarańczowy + turkus jako status OK,
- typografia: **Space Grotesk** (lub zamiennik sans-serif).

### 3.2 Tokeny (zalecany zestaw bazowy)

**Kolory (propozycja kompatybilna z prototypem):**
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
- 6, 10, 12, 14, 16, 18, 24, 32 px (zależnie od komponentu).

### 3.3 Zasady typografii

- Nagłówek widoku (H1): 26–30px, bold.  
- Nagłówki paneli (H2/H3): 16–20px, semi-bold.  
- Tekst pomocniczy: 12–13px, `--muted`.  
- Dane/metryki: 13–14px, `--ink`.

---

## 4. Komponenty UI (design system)

Poniżej komponenty, które **MUST** istnieć w mocku (nawet jeśli proste). To jest “inwentarz” do późniejszego przekazania AI/frontendu.

### 4.1 Karta (Card)

- Zastosowanie: większość bloków treści, listy, tabele w kontenerze.  
- Stany: normal, hover, selected (delikatna ramka/akcent).  
- Karta może mieć: `CardTitle`, `CardMeta`, `CardBody`, `CardActions`.

### 4.2 Przyciski

- `PrimaryButton` — np. logowanie, potwierdzanie.  
- `GhostButton` — akcje drugorzędne (fit view, reset).  
- `DangerButton` — akcje ryzykowne (Stop, Cancel).  
- `ToggleButton` — on/off (np. dispatchable, manual).  
- Każdy przycisk:
  - **MUST** mieć stan `disabled` oraz `busy` (spinner lub zmiana tekstu).  
  - **SHOULD** mieć tooltip, gdy disabled (dlaczego).

### 4.3 Badge / Pill

- Używane do krótkich statusów:
  - online/offline,
  - blocked/clear,
  - diag state (stalled/holding/stale/clear),
  - task state (active/done/failed).

### 4.4 Toast / Snackbar (globalny feedback)

- UI **MUST** pokazywać toast:
  - po sukcesie komendy (“Wysłano: pauza RB‑01”),  
  - po błędzie (“Błąd: brak połączenia”),  
  - przy zmianie trybu danych, sceny itd.  
- Toasty **SHOULD** znikać automatycznie (np. 4–6s), z możliwością ręcznego zamknięcia.

### 4.5 Modal potwierdzeń

- **MUST** dla akcji ryzykownych:
  - Stop navigation / Cancel task,
  - przełączenie w Manual,
  - aktywacja sceny,
  - przełączenie trybu LIVE (jeśli może sterować realnym).  
- Modal **MUST** jasno mówić:
  - co się stanie,
  - na jakim robocie/zasobie,
  - czy akcja jest odwracalna,
  - (opcjonalnie) wymagać wpisania krótkiego powodu w trybie produkcyjnym.

### 4.6 Drawer / Panel szczegółów (preferowane dla Robotów)

- Klik w robot na mapie lub w tabeli robotów **SHOULD** otwierać panel szczegółów (z prawej).  
- Panel zawiera:
  - stan, bateria, diagnostyka, task, ostatnia aktualizacja, komendy.

### 4.7 Tabela (dla Robotów i Pól)

- **MUST** wspierać:
  - sticky header,
  - sortowanie po kluczowych kolumnach,
  - filtr tekstowy (search),
  - responsywność (na mniejszych ekranach: poziomy scroll lub widok “cards”).

---

## 5. Zachowania globalne (odporność, sesja, błędy)

### 5.1 Sesja i logowanie

W mocku można zachować prosty login (jak prototyp), ale w UI spec określamy zachowanie:

- UI **MUST** mieć ekran logowania z polami:
  - użytkownik,
  - hasło,
  - przycisk “Zaloguj”,
  - miejsce na błąd logowania.  
- UI **SHOULD** pamiętać sesję (np. token) w bezpieczny sposób. W mocku dopuszczalne jest LocalStorage z TTL (jak prototyp), ale docelowo: cookie httpOnly lub token krótkotrwały.

### 5.2 Status połączenia i “stale data” (MUST)

Wymóg produkcyjny (do zachowania w nowym UI):

- UI **MUST NOT** przeładowywać się na błąd backendu.  
- UI **MUST** pokazać overlay “Brak połączenia” dopiero po ~2s braku kontaktu (krótkie przerwy bez bannera).  
- UI **MUST** mieć polling do `/api/status` lub innego lekkiego healthchecku z timeoutem (AbortController), żeby zawieszone requesty nie blokowały kolejnych prób.  
- UI **MUST** automatycznie odświeżyć aplikację **tylko** po zmianie `buildId` i **tylko** po odzyskaniu połączenia.  
- `?debug=1` **MAY** pokazywać `buildId` i toast “Wykryto nową wersję, odświeżę po reconnect”.

### 5.3 Błędy komend i retry (UX)

- UI **MUST** odróżniać:
  - błąd “transportowy” (offline/timeout),
  - błąd walidacji (np. brak uprawnień),
  - błąd konfliktu (ktoś inny zmienił stan).  
- UI **SHOULD** dla błędów transportowych:
  - oznaczyć komendę jako “niepotwierdzoną”,
  - zaproponować retry (przycisk).  
- UI **MUST NOT** wysyłać w pętli tej samej komendy bez kontroli (debounce, blokada przycisku w stanie `busy`).

### 5.4 Wielu operatorów i konflikty

- UI **SHOULD** przygotować się na konflikt (np. optimistic concurrency):
  - jeśli backend zwraca 409 / ETag mismatch, UI pokazuje toast: “Stan zmienił się w międzyczasie — odświeżam”.  
- UI **SHOULD** pokazywać “kto ostatnio zmienił” (jeżeli backend wystawia audit). W mocku może to być placeholder.

---

## 6. Widok: Mapa (najważniejszy)

### 6.1 Layout widoku mapy (MUST)

Widok mapy zawiera (jak prototyp):
- nagłówek panelu: tytuł + opis,
- po prawej: legenda i akcje mapy,
- pod nagłówkiem: (a) **Nav Controls** (pauza/stop), (b) **Manual Drive** (WASD), oba chowane,
- główna część: **mapWrap** z mapą SVG, menu kontekstowymi i minimapą.

### 6.2 Warstwy mapy (rendering order)

Aby czytelność była stała, warstwy mapy **MUST** mieć stałą kolejność (od spodu do góry):
1. Krawędzie grafu (edges/corridors).  
2. Linki worksite→action point (jeśli istnieją).  
3. Przeszkody (obstacles: block/avoid).  
4. Węzły i etykiety węzłów (opcjonalnie, zależnie od zoomu).  
5. Action points (punkty akcji do manualnych komend).  
6. Worksites (pick/drop) + ring + label.  
7. Roboty (markery).  
8. UI overlays (menu, tooltips).

### 6.3 Pan/Zoom + skróty

- Mapa **MUST** wspierać:
  - scroll wheel: zoom,
  - drag (LMB): pan,
  - double click: reset view (opcjonalnie),
  - klawisze: `+` zoom in, `-` zoom out, `0` reset.  
- Map actions:
  - “Dopasuj” (fit view) — ustawia viewBox tak, by cała mapa mieściła się w panelu,
  - “Reset view” — resetuje do domyślnego viewBox (np. full bounds + margines).

### 6.4 Minimap

- **MUST** istnieć minimapa w prawym dolnym rogu mapy.  
- Minimap pokazuje:
  - zarys grafu,
  - roboty jako punkty,
  - prostokąt viewportu głównej mapy,
  - możliwość przeciągnięcia viewportu (drag).

### 6.5 Markery worksites (pick/drop)

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
- Zmiana w menu:
  - **MUST** natychmiast zmienić UI (optimistic) + wysłać do backendu (w LIVE),
  - **MUST** pokazać toast o sukcesie/błędzie.  
- Skala markerów i etykiet **MUST** zależeć od zoomu (żeby zawsze były czytelne, a nie gigantyczne).

### 6.6 Roboty na mapie

- Robot to marker kierunkowy (prostokąt + strzałka).  
- Kolor/stan markera **MUST** kodować:
  - manual (manualMode): wyróżniony,
  - paused: wyróżniony,
  - blocked/stuck: wyróżniony,
  - selected (manual target): dodatkowy ring/outline.  
- Klik w robota:
  - jeśli robot nie jest w manualMode → proponowane zachowanie jak prototyp: włączyć manualMode (po potwierdzeniu w LIVE; w mocku bezpiecznie),  
  - jeśli już manualMode → ustawia go jako “manual target” (ten, dla którego działają komendy manual).  
- Klik w robota **SHOULD** otwierać panel szczegółów (drawer) w nowej wersji (to jest duży upgrade UX).

### 6.7 Manual Menu (Action Points)

- Klik na Action Point otwiera **manual menu**:
  - nagłówek: “Manual: <nazwa robota>”,
  - akcje:
    - “Jedź tutaj” (goto),
    - “Jedź + Load”,
    - “Jedź + Unload”.  
- Manual menu **MUST** działać tylko, gdy:
  - istnieje jednoznaczny “manual target robot”,
  - robot ma `manualMode=true`.  
- W przeciwnym razie:
  - menu się nie otwiera albo przyciski są disabled + tooltip “Włącz manual na robocie”.

### 6.8 Manual Drive panel (WASD)

- Panel pokazuje:
  - “Sterowanie ręczne”,
  - robot: <id/nazwa>,
  - hint: “WASD / strzałki”,
  - przycisk toggle: “Włącz sterowanie” / “Wyłącz sterowanie”.  
- W trybie LIVE: sterowanie wysyła komendy `motion` w ticku (np. 140ms).  
- W mocku: sterowanie może poruszać robota bezpośrednio w symulacji.

### 6.9 Map Menu (prawy klik na pustej mapie)

Zachowanie jak prototyp:
- Prawy klik na pustej mapie otwiera menu z:
  - “Jedź tutaj (punkt)” — dostępne tylko w LIVE i tylko gdy manualMode robot jest aktywny,
  - “Dodaj przeszkodę (block)”,
  - “Dodaj przeszkodę (avoid)”.  
- Klik w przeszkodę usuwa przeszkodę (w prototypie tak jest) — w nowym UI **SHOULD** wymagać małego potwierdzenia lub undo (żeby nie kasować przypadkiem).

### 6.10 Nav Controls (pauza/stop)

- Jeśli istnieje robot w nawigacji lub manual target, panel Nav Controls się pokazuje:
  - “Nawigacja: <robot>”,
  - przyciski: “Pauzuj/Wznów”, “Zakończ”.  
- “Zakończ” **MUST** mieć potwierdzenie (modal).

---

## 7. Widok: Roboty (najbardziej dopracowany)

To jest kluczowy widok operatorski poza mapą. W prototypie jest tabela; w nowym UI zostaje tabela, ale dokładamy warstwę UX (filtry, szczegóły, bezpieczeństwo akcji).

### 7.1 Layout widoku Roboty (MUST)

Widok składa się z:
1) **Toolbar** nad tabelą (filtry, wyszukiwarka, szybkie statystyki).  
2) **Tabela robotów** (podstawowy przegląd).  
3) **Panel szczegółów** (drawer) po kliknięciu robota (SHOULD, ale rekomendowane jako MUST w v0.2).

### 7.2 Toolbar (rekomendowane)

Toolbar **SHOULD** zawierać:
- Search (po nazwie/id).  
- Filtry typu “chips”:
  - Online / Offline,
  - Dispatchable / Undispatchable,
  - Manual on,
  - Blocked / Stalled / Stale,
  - In task / Idle.  
- Statystyki w 1 linii:
  - `Robots: 8`,
  - `Online: 7`,
  - `In progress: 3`,
  - `Blocked: 1`,
  - `Stale: 0`.  
- Przycisk “Odśwież” (tylko jeśli LIVE bez streamu; w SSE niepotrzebny).

### 7.3 Tabela — kolumny (MUST)

Zachowujemy sens prototypu, ale doprecyzowujemy:

1. **Robot**  
   - Nazwa (bold) + ID (muted).  
2. **Status**  
   - badge: Online/Offline + (Dispatchable/Undispatchable).  
3. **Aktywność**  
   - tekst z mapowaniem (Idle, To pick, Picking, To drop, Dropping, Paused, Manual drive…).  
4. **Dispatch** (toggle)  
   - toggle on/off, disabled gdy offline albo tryb nie wspiera.  
5. **Control** (button)  
   - “Seize control” / “Release control”.  
6. **Manual** (toggle)  
   - on/off, disabled gdy offline.  
7. **Nawigacja** (actions)  
   - “Pauzuj/Wznów” + “Stop”.  
8. **Bateria**  
   - pasek + % (opcjonalnie).  
9. **Blocked**  
   - pill: Blocked/Clear (lub puste).  
10. **Diag**  
   - pill z etykietą i kolorem (stalled/holding/stale/clear) + skrócony powód.  
11. **Task**  
   - id taska lub `--`.

Tabela **SHOULD** umożliwiać ukrycie części kolumn (np. “Control” i “Manual” w trybie read-only).

### 7.4 Reguły disabled i bezpieczeństwo (MUST)

- Jeśli robot `online=false`:
  - Dispatch toggle **MUST** być disabled,
  - Manual toggle **MUST** być disabled,
  - Nav actions **MUST** być disabled,
  - Control **MAY** być disabled (zależnie od backendu), ale w prototypie “robokit mode” blokuje kontrolę — w nowym UI reguła wynika z capabilities.  
- Jeśli system jest offline (`No connection`):
  - akcje wysyłające komendy **MUST** być disabled,
  - UI pokazuje tooltip “Brak połączenia z core”.  
- Akcje ryzykowne:
  - “Stop” **MUST** wymagać potwierdzenia,
  - W LIVE: włączenie Manual **MUST** wymagać potwierdzenia (bo operator przejmuje sterowanie).

### 7.5 Szczegóły robota (drawer) — zawartość

Po kliknięciu wiersza/robota UI **SHOULD** pokazać panel:

**Sekcja A: Identyfikacja**
- Nazwa, ID, provider (Mock/Live), wersja firmware (jeśli dostępna).

**Sekcja B: Stan**
- Online/Offline, Dispatchable, Controlled, ManualMode,
- Ostatnia aktualizacja (timestamp + “age”).

**Sekcja C: Ruch**
- Pose: x, y, heading (czytelnie),
- Speed,
- Aktualna stacja / lastStation (jeśli występuje),
- Przycisk “Center on map” (przenosi mapę na robota).

**Sekcja D: Task**
- Task id, status, phase,
- Pick → Drop,
- Stream,
- Przyciski: Pause/Resume, Stop, (opcjonalnie) “Cancel task”.

**Sekcja E: Diagnostyka**
- Powód (reason) + od kiedy (since),
- Kontekst (np. “vs RB‑02”, “wait 2.1s”),
- Przycisk “Pokaż na mapie” (highlight blokujący edge/node/robot — jeśli diagnostyka to wspiera).

**Sekcja F: Komendy**
- Dispatch toggle, Control button, Manual toggle,
- Manual “Go to point” (jeśli manual).

**Sekcja G: Historia (opcjonalnie)**
- Ostatnie 20 eventów dla robota (mock może generować).

### 7.6 Diag badge — mapowanie i format

Zachowanie jak prototyp, ale formalnie:

- Jeśli brak diag → label `--`, klasa `clear`.  
- Jeśli diag.state:
  - `stalled` → klasa `stalled` (np. pomarańcz/czerwony),
  - `holding` → klasa `holding`,
  - `stale` lub `offline` → klasa `stale`.  
- Jeśli diag zawiera `since`, a state jest problematyczny → dopisz “· 2.4s”.  
- Dla wybranych reason dopisz kontekst:
  - reservation_wait/entry: “Czeka na rezerwacje 1.2s vs RB‑02”,
  - traffic: “Zablokowany ruchem vs RB‑03”,
  - edge_lock: “Blokada krawędzi vs RB‑01”.

### 7.7 Bulk actions (opcjonalnie)

W wersji produkcyjnej (niekoniecznie w mocku) warto przewidzieć:
- zaznaczanie wielu robotów,
- “Set dispatchable off” dla grupy,
- “Pause all” / “Resume all” z potężnym potwierdzeniem i uprawnieniami.

---

## 8. Widok: Pola (Worksites)

### 8.1 Podstawy

- Widok pokazuje listę worksites z atrybutami:
  - id,
  - grupa,
  - typ (pick/drop),
  - occupancy (filled/empty),
  - blocked (true/false).

### 8.2 Ulepszenia vs prototyp

- **MUST** mieć filtr po grupie i typie.  
- **SHOULD** mieć szybkie akcje (toggle) occupancy i blocked z potwierdzeniem w LIVE (bo to wpływa na realną logistykę).  
- Klik w wiersz **SHOULD** centrować mapę na worksite i otwierać menu worksite.

---

## 9. Widok: Bufory (Packaging)

To jest w prototypie rozbudowane. Dla mocku minimalnie zachowujemy układ i podstawową klikalność.

### 9.1 Layout (MUST)

- Siatka bufora (buffer-grid) — komórki.  
- Panel edycji komórki (buffer-editor).  
- Panel “Zapotrzebowanie linii” (line-requests).  
- Panel “Operacje miejsc” (place-ops).

### 9.2 Zachowanie komórek bufora (mock)

- Klik w komórkę:
  - podświetla komórkę,
  - w panelu edycji pokazuje: id, typ, ilość, status (np. dostępny/zablokowany),
  - pozwala zmienić ilość i typ (w mocku).  
- Line requests:
  - lista linii + status active/inactive,
  - przycisk “Toggle request” (mock).  
- Place ops:
  - proste akcje: “Reset buffer”, “Randomize”, “Mark as blocked” (tylko mock).

---

## 10. Widok: Streamy

- Lista streamów jako karty.  
- Każda karta pokazuje:
  - id + nazwa,
  - trigger,
  - routes count / steps,
  - aktywne zgłoszenia,
  - goodsType / goodsTypeMode,
  - next pick / next drop candidate (jeśli dostępne).

**SHOULD**: klik w stream otwiera szczegóły + listę aktualnych tasków związanych ze streamem.

---

## 11. Widok: Sceny

### 11.1 Lista scen

Każda scena jako karta:
- nazwa + id,
- createdAt,
- badge “Aktywna” (jeśli to aktywna scena),
- lista map w scenie:
  - nazwa + meta (typ/wersja/hash),
  - badge “Aktywna mapa”,
  - przycisk “Aktywuj” (jeśli nieaktywna).

### 11.2 Aktywacja sceny (MUST)

- Klik “Aktywuj” otwiera modal:
  - “Aktywujesz scenę X / mapę Y. To spowoduje reset runtime.”
- Po potwierdzeniu:
  - UI pokazuje stan “loading”,
  - po sukcesie: reload danych (graph/workflow/config) i toast “Aktywowano scenę”.  
- W razie błędu: toast + pozostanie na starych danych (nie gubić UI).

**SHOULD**: w LIVE aktywacja sceny wymaga roli “Admin/Engineer”.

---

## 12. Widok: Ustawienia

### 12.1 Najważniejsze: Tryb danych (MUST w nowym UI)

W nowym UI dodajemy sekcję “Źródło danych”:
- `MOCK` / `LIVE` (radio/select),
- pole `API Base URL` (tylko LIVE),
- przycisk “Połącz” / “Rozłącz”.

W mocku może być to uproszczone (np. przełącznik w settings).

### 12.2 Symulator i algorytmy (jak prototyp)

Sekcja Symulator:
- select trybu symulatora,
- notatka o trybie,
- przyciski: “Zastosuj”, “Reset”.

Sekcja Algorytmy:
- select dispatch strategy,
- select traffic strategy,
- parametr “Odstep stopu do przodu (m)”,
- notatka + “Zastosuj”, “Reset”.

### 12.3 Taksonomia algorytmów (MUST jako UI‑element)

Taksonomia jest świetna edukacyjnie. Zachować:
- Dispatch: “Wybrana strategia” + “Osie”,
- Traffic: “Wybrana strategia” + “Osie”,
- prezentacja w formie tabelki key/value.

**SHOULD**: tooltipy wyjaśniające oś (np. “optimality: …”).

---

## 13. Widok: Zadania

- Lista tasków jako karty. Każda karta pokazuje:
  - id,
  - stream + robot,
  - pick → drop,
  - extra meta (goodsType, lineId, kind),
  - badge status: active/done/failed + phase.  

**SHOULD**: filtrowanie po statusie, robocie, streamie.  
**MUST**: w LIVE możliwość “Cancel task” (z potwierdzeniem) — nawet jeśli w mocku to tylko symulacja.

---

## 14. Widok: Diagnostyka (Traffic)

W prototypie to placeholder. W nowym UI spec definiuje docelowe UX (mock może zasymulować dane).

### 14.1 Cztery panele (MUST)

- Edge locks  
- Edge queues  
- Node locks  
- Stalls / Yield

### 14.2 Element listy diagnostycznej (SHOULD)

Każdy wpis powinien zawierać:
- identyfikator zasobu (edgeId/nodeId),
- “holder” (robot trzymający),
- “waiting” (lista robotów czekających),
- wiek blokady (age),
- przycisk “Pokaż na mapie” (highlight).

### 14.3 Powiązanie z mapą (ważne UX)

- Klik w wpis diagnostyki:
  - centruje mapę na danym zasobie/obszarze,
  - chwilowo podświetla powiązane elementy (edge/node/robot).

---

## 15. Widok: Awarie / Narzędzia symulacyjne

### 15.1 Bezpieczeństwo (MUST)

- Widok Awarie **MUST** być dostępny tylko w trybie MOCK albo LOCAL SIM.  
- W trybie LIVE:
  - ukryty z menu, albo
  - pokazuje ostrzeżenie “Niedostępne w LIVE”.

### 15.2 Funkcje (jak prototyp)

- wybór robota,
- “Problem przy pobieraniu”,
- “Robot zablokowany”,
- “Problem przy odkładaniu”,
- “Przeszkoda (stop)”,
- “Przeszkoda (omijanie)”,
- “Usuń przeszkody”,
- “Odblokuj robota”.

**SHOULD**: dodać “Undo” dla wstrzykniętych awarii (w mocku bardzo proste).

---

## 16. Warstwa danych i API wymagane przez UI

Ten rozdział ma służyć temu, żeby mock i docelowy core miały minimalnie kompatybilne kontrakty.

### 16.1 Minimalne modele danych (UI-facing)

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

**Task**
- `id: string`
- `robotId?: string`
- `pickId?: string`
- `dropId?: string`
- `status: string` (in_progress/paused/completed/failed/cancelled)
- `phase?: string`
- `streamId?: string`
- `kind?: string`
- `meta?: object` (goodsType, lineId, itd.)

**Worksite**
- `id: string`
- `kind: "pick" | "drop"`
- `group?: string`
- `point?: string` (action point)
- `pos?: { x, y }`
- `filled: boolean`
- `blocked: boolean`

**Scene**
- `activeSceneId`
- `scenes: [{ id, name, createdAt, kind, maps: [...] , activeMapId }]`

### 16.2 Minimalne endpointy (kompatybilne z prototypem)

- `GET /api/fleet/config` (+ `POST` do zmiany ustawień w dev)  
- `GET /api/fleet/state` (snapshot)  
- `GET /api/fleet/status` (legacy)  
- `GET /api/fleet/stream` (SSE, event: `state`)  
- `POST /api/fleet/robots/:id/manual`  
- `POST /api/fleet/robots/:id/go-target`  
- `POST /api/fleet/robots/:id/go-point`  
- `POST /api/fleet/robots/:id/motion`  
- `POST /api/fleet/robots/:id/pause` / `resume` / `cancel`  
- `POST /api/fleet/worksites/:id` (update: filled/blocked)  
- `GET /api/scenes` + `POST /api/scenes/activate`  
- `GET /api/algorithms/catalog`

W mocku te endpointy mogą być zastąpione przez DataSource “in-memory”, ale UI powinno myśleć w tych kategoriach.

---

## 17. Specyfikacja mock backendu (klikany prototyp)

### 17.1 Cele mocka

- Mock ma pokazać “żywe UI”: roboty się poruszają, taski się zmieniają, pojawiają się diag/blocked.  
- Mock **MUST** być prosty (czytelny) i deterministyczny na tyle, by dało się debugować UI.  
- Mock **MUST** pozwolić zidentyfikować minimalne API dla prawdziwego core.

### 17.2 Minimalny model symulacji (propozycja)

- Wczytaj statyczny `graph.json` (lub prosto w kodzie).  
- Stwórz N robotów (np. 3–8) na losowych węzłach.  
- Każdy robot ma “plan” jako lista punktów (nodes) i interpoluje pozycję w czasie.  
- Co kilka sekund:
  - wygeneruj task (pick→drop) i przypisz robotowi dispatchable,
  - symuluj `taskStatus` i `phase` (to_pick → picking → to_drop → dropping → done).  
- Losowo (rzadko) wstrzyknij:
  - blocked_obstacle,
  - reservation_wait,
  - stale (symulacja braku update).

### 17.3 Warstwa DataSource (MUST)

UI ma używać abstrakcji:
- `subscribeState(cb)` / `unsubscribe()`  
- `getSnapshot()`  
- `sendCommand(robotId, type, payload)`  
- `updateWorksite(id, patch)`  
- `activateScene(sceneId, mapId)`  
- `setSettings(patch)`

Dwie implementacje:
- `MockDataSource` — in-memory + setInterval tick.  
- `LiveDataSource` — fetch + SSE + retry/backoff.  

### 17.4 Przełączanie mock ↔ live

- W Settings użytkownik wybiera tryb danych.  
- UI pokazuje wyraźny banner:
  - “MOCK MODE” (bezpieczny),
  - “LIVE MODE” (ostrożnie).  
- W LIVE, jeśli brak połączenia — UI automatycznie wraca do “read-only” (bez akcji).

---

## 18. Ryzyka, pułapki i jak je rozbroić

### 18.1 Największe ryzyko: UX bezpieczeństwa (operator kliknie “zły przycisk”)

**Problem:** w realnym świecie “Stop” albo “Manual” może mieć konsekwencje fizyczne.  
**Mitigacje:**
- MUST: modale potwierdzeń dla akcji ryzykownych.  
- SHOULD: rozdziel “soft stop / pause” od “cancel/stop” i opisz konsekwencje.  
- SHOULD: tryb “Read-only” domyślnie na nowych sesjach (w produkcji).  
- SHOULD: role i uprawnienia (RBAC).

### 18.2 “Stale data” i fałszywe poczucie kontroli

**Problem:** UI pokazuje dane sprzed 10s, operator myśli, że to live.  
**Mitigacje:**
- MUST: stan połączenia + “ostatnia aktualizacja” widoczna.  
- MUST: overlay “brak połączenia” po 2s.  
- SHOULD: wygaszanie kolorów / badge “STALE” na tabeli robotów.

### 18.3 Wydajność mapy (SVG vs duże mapy)

**Problem:** duża mapa + wiele etykiet = lag.  
**Mitigacje:**
- MUST: etykiety node/worksite zależne od zoomu (jak w prototypie).  
- SHOULD: tryb “hide labels” w UI.  
- MAY: przejście na Canvas/WebGL, zachowując styl (to później).

### 18.4 Konflikty wielu operatorów

**Problem:** dwie osoby zmieniają to samo, UI się “szarpie”.  
**Mitigacje:**
- SHOULD: optimistic concurrency i komunikat o konflikcie.  
- SHOULD: audit log + “kto zmienił”.  
- MUST: UI nie zakłada, że “jak kliknąłem to jest prawda”; zawsze przyjmuje snapshot z backendu jako źródło prawdy.

### 18.5 Zbyt rozbudowany mock “odciąga” od UX

**Problem:** symulacja staje się projektem samym w sobie.  
**Mitigacje:**
- MUST: mock tylko tyle, by było co klikać (ruch + task + diag).  
- SHOULD: jedna pętla tick + kilka funkcji, zero skomplikowanych plannerów.

---

## 19. Propozycje ulepszeń (po v0.1)

- “Dashboard” startowy (kafelki: online, tasks, alerts).  
- Globalny “Event log” z filtrem po robotach i możliwością eksportu.  
- “Replay mode” (odtwarzanie zarejestrowanych eventów).  
- Tryb nocny (dark) — jeśli kiedyś potrzebny.  
- Eksport/import scen z UI (upload ZIP).  
- Lepsze “Diagnostyka”: overlay na mapie (kolorowanie edge locków).

---

## 20. Checklist implementacyjny dla klikalnego mocka (praktyczne)

- [ ] Layout: login + app shell + sidebar + header + panel stack  
- [ ] Widoki: map/robots/fields/packaging/streams/scenes/settings/tasks/traffic/faults  
- [ ] Komponenty: Card, Table, Buttons, Pills, Toast, Modal, Drawer  
- [ ] Map: SVG render grafu + worksites + roboty + przeszkody + minimapa  
- [ ] Interakcje mapy: pan/zoom/fit/reset + menu worksite + menu mapy + menu manual  
- [ ] Roboty: tabela + akcje + podstawowe reguły disabled + diag pill  
- [ ] Settings: przełącznik trybu danych + algorytmy  
- [ ] MockDataSource: tick + ruch robotów + taski + diag + “awarie”  
- [ ] LiveDataSource: fetch snapshot + SSE + offline overlay + buildId reload logic (stub w v0.1)  
