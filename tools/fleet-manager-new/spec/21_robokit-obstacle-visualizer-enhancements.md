# robokit-obstacle-visualizer - Ulepszenia (v0.2)

## 1. Cel
Rozszerzyc obecne narzedzie o lepszy przeglad zmian w czasie:
- okno czasowe z podswietlaniem punktow (trajektoria + obstacles + errors),
- panel bledow z lista zdarzen i lokalizacja na mapie,
- podglad zmian statusow (blocked, slowed, emergency, running_status) przy przewijaniu.

## 2. Nowe funkcje UI (MUST)
### 2.1 Okno czasowe dla podswietlania punktow
Gdy uzytkownik przesuwa suwak czasu:
- aktywne jest okno [t, t + windowMs].
- wszystkie punkty z tego zakresu sa podswietlane:
  - trajectory: grubszy/jasniejszy odcinek,
  - blocks/nearest: powiekszone markery,
  - errors: marker z obwodka (zachowac obecny styl).

Sterowanie oknem:
- w UI slider lub dropdown: `windowMs` (np. 2000/5000/10000 ms).
- gdy `windowMs=0`, podswietlenie dotyczy tylko aktualnego punktu.

### 2.2 Panel bledow na dole
Nowy blok UI w dolnej czesci (ponizej mapy) z lista bledow:
- tabela/lista: tsMs, x,y, error codes, emergency, running_status, task_status.
- klik w wpis -> skok suwaka do czasu bledu + zaznaczenie na mapie + wypelnienie details.
- filtr: pokazuj tylko emergency true (checkbox).
- licznik: ile bledow w sesji + ile w oknie czasowym.

### 2.3 Podglad statusow przy przewijaniu
W prawym panelu (Details) dodac sekcje "Status" z:
- blocked, manualBlock, slowed, slow_reason,
- emergency, soft_emc, driver_emc,
- running_status, task_status, current_station, target_id.

Zasady:
- wartosci maja pochodzic z najblizszego frame w oknie czasu (t).
- gdy brak danych, pokazac "n/a".
- kazda zmiana statusu (np. blocked true->false) powinna byc widoczna w osi czasu (marker w Events).

## 3. Nowe dane z serwera (MUST)
### 3.1 API
Dodac endpoint (lub rozszerzyc istniejacy):
- `GET /api/status` -> lista timeline zmian statusow,
  format:
  ```
  { statuses: [
      { tsMs, x, y, blocked, manualBlock, slowed, slow_reason, emergency, soft_emc, driver_emc, running_status, task_status, current_station, target_id }
    ] }
  ```

Opcja alternatywna (mniejszy payload):
- `GET /api/status?mode=changes` zwraca tylko punkty, gdy status sie zmienia.

### 3.2 Backend log_pipeline
- w `buildDataset` wyliczyc "status timeline":
  - `statusFrames`: minimalny snapshot statusow z kazdego frame.
  - `statusChanges`: tylko zmiany (diff) + timestamp.
- wykorzystac to w UI:
  - do panelu Status i do markerow w Events.

## 4. Warstwy mapy (MUST)
Dodac nowe warstwy SVG:
- `trajectory-window` (overlay highlight w oknie czasu).
- `blocks-window` i `nearest-window` (opcjonalnie przez styl markerow).

Mozliwa implementacja:
- nie dublowac layerow, tylko dodac class `is-window` dla punktow z zakresu.
- warstwa `cursor` pozostaje (pozycja chwili t).

## 5. UX szczegoly (MUST)
- Podczas drag slidera: aktualizowac podswietlenie w czasie rzeczywistym.
- Przycisk "Next error" skacze do kolejnego error w liscie.
- Przy zmianie windowMs, UI nie resetuje pozycji suwaka.

## 5a. Kontrakty czasu i okna (MUST)
Definicje:
- **t**: czas aktualnego suwaka w ms, liczony z `trajectory[sliderIndex].tsMs`.
- Okno czasu: **[t, t + windowMs]** (inkluzivne na obu koncach).
- Wszystkie operacje highlightu i filtrowania odnosza sie do **tsMs z logow**.

Konsekwencje:
- Gdy `windowMs=0`, highlight dotyczy tylko punktow o `tsMs == t`.
- Gdy w oknie brak punktow, highlight nie jest rysowany.
- Highlight wykorzystuje **downsampled trajectory** z `/api/trajectory` (brak odrebnego raw stream).

## 5b. Algorytm statusChanges (MUST)
Zakres pol, ktore bierzemy do diff:
- `blocked`, `manualBlock`, `slowed`, `slow_reason`,
- `emergency`, `soft_emc`, `driver_emc`,
- `running_status`, `task_status`,
- `current_station`, `target_id`.

Zasady:
- `statusChanges` zawiera rekord tylko, gdy **jakiekolwiek** z powyzszych pol zmienilo wartosc.
- Dla pol tekstowych (`current_station`, `target_id`): zmiana na inny string lub `null`.
- Dla pol liczbowych: zmiana wartosci.
- Dla booleans: zmiana true/false.

Format statusChanges:
```
{ tsMs, x, y, changed: { blocked: { prev, next }, ... }, snapshot: { ...full status... } }
```

## 5c. Kontrakt /api/status (MUST)
Endpoint:
- `GET /api/status` domyslnie zwraca **statusFrames**.
- `GET /api/status?mode=changes` zwraca **statusChanges**.

Zasady mapowania polozenia:
- `x/y` bierzemy z frame statusu.
- Jesli `x/y` brak (nie powinno sie zdarzyc w statusach), ustawiac `null`.

## 5d. Powiazanie blokad i bledow (MUST)
Panel bledow pokazuje dodatkowo:
- `block_points_in_window`: liczba block/nearest punktow w [t, t+windowMs].
- `blocked_status`: wartosc `blocked` w czasie t (snapshot).

Definicja "punkty blokujace wozek":
- wszystkie punkty z `blocks` w oknie czasu.
- opcjonalnie `nearest` jako osobna kolumna (licznik).

## 5e. Render i wydajnosc (MUST)
- Highlight okna czasu NIE przebudowuje calych warstw SVG.
- Implementacja zalecana: class `is-window` na markerach i osobny `<path>` dla podswietlonego fragmentu trajektorii.
- Uzywac binarnego wyszukiwania po `tsMs` dla wyznaczenia indeksow okna.

## 5f. Edge cases (MUST)
- Brak `/api/status`: ukryc panel Status i markery zmian statusu.
- Brak `trajectory`: mapa pokazuje tylko errors/obstacles bez highlightu; suwak disabled.
- Brak `errors`: panel bledow pokazuje "0 errors" i jest zwijany.
- Brak mapy: highlight i panning dzialaja na bbox trajektorii jak w v0.1.

## 6. Testy (SHOULD)
- Unit tests parsera: sprawdz czy `statusChanges` zwraca zmiany blocked/slowed/emergency.
- UI smoke test (manual): przewijanie suwaka -> aktualizacja panelu statusu i listy bledow.

## 6a. Minimalizacja ryzyka regresji (MUST)
Zasady, ktore maja ograniczyc ryzyko pogorszenia obecnej aplikacji:
- **Brak zmian domyslnych**: nowe funkcje sa domyslnie wylaczone (np. `windowMs=0`, panel bledow zwiniety).
- **Backward compatibility**: istniejace endpointy i formaty odpowiedzi pozostaja bez zmian; nowe dane sa dodawane tylko jako dodatkowe pola/endpointy.
- **Feature flagi**: w UI przelaczniki dla highlightu okna czasu i panelu bledow (toggle on/off).
- **Bez naruszania renderu mapy**: brak zmian w warstwach edges/nodes/trajectory poza nowymi klasami CSS.
- **Wydajnosc**: highlight i panel bledow nie moga powodowac pelnego przebudowywania SVG przy kazdym ticku playbacku.
- **Degradacja lagodna**: jesli brak `/api/status` lub brakuje pol w logach, UI dziala jak dzis (bez status panelu).

Akceptacja regresji (MUST):
- uruchomienie z `windowMs=0` i bez mapy daje identyczny widok i zachowanie jak obecny v0.1.
- `GET /api/trajectory`, `/api/obstacles`, `/api/errors`, `/api/events` pozostaja bez zmian.

## 7. Plan wdrozenia (MUST)
1) Rozszerzyc `log_pipeline.js` o statusFrames + statusChanges.
2) Dodac endpoint `/api/status`.
3) Rozbudowac `viewer.js`:
 - okno czasowe i highlight,
 - panel bledow na dole,
 - panel statusu w Details,
 - event markers dla zmian statusow.
4) Dodac style w `viewer.css`.
5) Dodac testy parsera.

## 8. Poza zakresem
- Automatyczne wykrywanie przyczyn stop/slow na podstawie mapy.
- Live streaming.
