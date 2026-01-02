# SEAL E2E Queue – szkic zmian

Status: szkic (roboczy)

Cel: dodac kolejke zadań E2E i workery, aby testy uruchamialy sie automatycznie wg dostepnosci zasobow, bez recznego dzielenia na “krotkie/dlugie”.

## Zakres i cele
- Automatyczne rozlozenie testow po workerach (pull‑based queue).
- Lepsze wykorzystanie zasobow: krotkie testy nie czekaja na długie.
- Brak zmian w pojedynczych testach (skrypty testowe pozostaja takie jak sa).
- Wspolne raportowanie: jeden summary + per‑test logi.
 - Behavioral parity: funkcjonalnosc i zakres testow pozostaja identyczne; zmienia sie tylko sposob uruchamiania.

## Behavioral parity (twarde wymaganie)
- Te same testy musza sie uruchomic z tymi samymi ENV i domyslami.
- Dopuszczalna jest inna kolejnosc wykonania i inny rozklad w czasie.
- Wyniki (statusy, asercje) musza byc zgodne z trybem klasycznym.
  - Różnice dopuszczalne tylko w metrykach czasu.

## Poza zakresem (na start)
- Zmiany w logice testow E2E.
- Zdalne workery (na innych hostach).
- Dynamiczne skalowanie workerow w czasie runu.

## Proponowana architektura
1) **Scheduler/Queue (orchestrator)**
   - Buduje plan z manifestu `e2e-tests.json5`.
   - Umieszcza testy w kolejce (z metadanymi: kategoria, wymagania, timeouty, waga).
   - Zarzadza limitami zasobow (jobs, cgroup/CPU/RAM, toolset).

2) **Worker**
   - Pobiera jedno zadanie z kolejki.
   - Uruchamia test w izolowanym workspace.
   - Zapisuje wynik (status, czas, log path) do wspolnego summary.

3) **Shared cache/logs**
   - Cache narzedzi i npm wspolny, ale tylko do odczytu przez workery (po przygotowaniu).
   - Logi per‑test w stabilnym katalogu (poza tmp rootem).

## Model danych kolejki
Minimalne pola zadania:
- `test` (nazwa w manifeście)
- `category`
- `parallel` (czy mozna uruchamiac rownolegle)
- `requirements` (np. host‑only, docker, root)
- `timeout` (build/run/test)
- `estimated_cost` (opcjonalnie: heurystyka na start)

## Scheduling i ograniczenia
- **Kolejka FIFO** z mozliwoscia priorytetu (np. smoke > full).
- **Blokady zasobow** dla testow wymagajacych exclusivity (np. systemd/ssh).
- **Throttle**: ograniczenie liczby “heavy” zadan naraz (np. thin‑anti‑debug).

## Izolacja i outDir
- Kazdy test dostaje unikalny `outDir` i `tmpRoot`.
- Worker NIE moze czyscic globalnych katalogow (`seal-out/`, shared cache).
- Cleanup tylko w zakresie swojego workspace.

## Konfiguracja i flagi (propozycja)
- `SEAL_E2E_QUEUE=1` – wlacza tryb kolejki.
- `SEAL_E2E_WORKERS=<n>` – liczba workerow.
- `SEAL_E2E_QUEUE_MODE=fifo|priority`
- `SEAL_E2E_HEAVY_MAX=<n>` – limit “heavy” w tym samym czasie.
- `SEAL_E2E_ESTIMATE_FILE=<path>` – opcjonalny plik z czasami historycznymi.

## Raportowanie
- Jeden wspolny summary (TSV/JSON) z:
  - status, czas, worker_id, log_path, buildId/outDir
- Per‑worker heartbeat.
- Wspolny “progress” (liczba zadan: pending/running/done).

## Migracja (etapy)
1) **Etap 1**: scheduler w jednym procesie + lokalni workery (fork).
2) **Etap 2**: kolejkowanie testow “parallel=1”, reszta jako serial.
3) **Etap 3**: dodanie heurystyk “heavy” + historyczne czasy.

## Ryzyka i punkty uwagi
- Wspolny summary musi byc synchronizowany (lock lub atomic append).
- Shared cache nie moze byc modyfikowany przez workery (tylko warm‑up).
- Timeout wrapper powinien byc per‑test, a nie globalny na suite.
- Wymagana walidacja, ze `TMPDIR`/`NODE_COMPILE_CACHE` nie wskazuja na tmp root workerow.

## Otwarta lista decyzji
- Format summary (TSV vs JSON) i mechanizm lockowania.
- Skad brac `estimated_cost` (statyczny plik czy runtime learning).
- Czy wymagamy osobnej kolejki dla “host‑only”.

## Detale implementacyjne (propozycja)
### Scheduler (proces nadrzedny)
- Czyta manifest i buduje liste zadan.
- Odpala workerow jako child processy (`node run-e2e-worker.js`).
- Utrzymuje kolejke w pamieci i przekazuje zadania przez IPC (stdin/stdout JSONL).
- Prowadzi stan: `pending`, `running`, `done`, `failed`.
- Zapisuje progress i summary.

### Worker (proces dziecka)
- Oczekuje na zadanie w formacie JSON.
- Przygotowuje izolowany workspace:
  - `SEAL_E2E_EXAMPLE_ROOT` ustawione na per‑test katalog.
  - `SEAL_E2E_TMP_ROOT` ustawione na per‑test tmp.
  - `SEAL_E2E_LOG_DIR` ustawione na per‑test log.
- Uruchamia konkretny test przez istniejący runner (`run-e2e-suite.js`) z `SEAL_E2E_TESTS=<test>`.
- Zwraca wynik w JSON (status, czas, log_path, buildId).

### Protokol IPC (JSONL)
Scheduler -> Worker:
```
{"type":"task","id":"t-001","test":"thin","timeout_ms":600000,"requirements":["root"]}
```
Worker -> Scheduler:
```
{"type":"result","id":"t-001","status":"ok","duration_s":123,"log_path":"/.../thin-xyz"}
```
```
{"type":"heartbeat","id":"t-001","elapsed_s":60}
```

### Locki i summary
- Summary w TSV: append z `flock` na pliku lub osobny writer w schedulerze.
- Logi per‑test w stabilnym katalogu (poza tmp), np. `seal-out/e2e/logs/<test>/<runId>/`.
- Scheduler odpowiada za agregacje i “Combined stats”.

### Szacunek czasu (estimated_cost)
Propozycja prostego modelu:
- `estimated_cost` = ostatni czas z `summary/last.tsv` lub z pliku `e2e-estimates.json`.
- Brak danych => domyslny koszt (np. 60s).
- “Heavy” = koszt > progu (np. 600s).

### Integracja z obecnymi flagami
- `SEAL_E2E_QUEUE=1` wlacza scheduler.
- `SEAL_E2E_WORKERS` mapuje sie na liczbe child‑workerow.
- `SEAL_E2E_JOBS` nadal steruje limitami wewnatrz testow (np. esbuild).

### Minimalne pliki do dodania
- `scripts/run-e2e-queue.js` (scheduler).
- `scripts/run-e2e-worker.js` (worker).
- Rozszerzenie `run-e2e-parallel.js` o tryb queue (opcjonalne).

### Tryb migracji bez ryzyka
- Domyslnie pozostaje obecny parallel.
- `SEAL_E2E_QUEUE=1` uruchamia nowy tryb tylko lokalnie/na CI‑opt‑in.
- Na start kolejka tylko dla testow `parallel=1`, reszta jako serial.

## Plan wdrozenia (krok po kroku)
1) **Scaffolding**
   - Dodaj `run-e2e-queue.js` i `run-e2e-worker.js` z minimalnym IPC JSONL.
   - Umozliw uruchomienie queue przez `SEAL_E2E_QUEUE=1`.

2) **Minimalny worker**
   - Worker uruchamia pojedynczy test (`SEAL_E2E_TESTS=<name>`).
   - Tylko stdout/stderr + podstawowy result JSON.

3) **Izolacja i logi**
   - Per‑test `SEAL_E2E_EXAMPLE_ROOT`, `SEAL_E2E_TMP_ROOT`, `SEAL_E2E_LOG_DIR`.
   - Logi zawsze poza tmp rootem.

4) **Summary writer**
   - Scheduler agreguje wynik i zapisuje TSV.
   - Dodaj lock (flock) lub single‑writer.

5) **Heurystyki i fairness**
   - Wstepny `estimated_cost` z `summary/last.tsv`.
   - Limit “heavy” na podstawie progu czasu.

6) **Tryb mieszany**
   - Testy `parallel=0` uruchamiane jako serial w schedulerze.
   - Pozostale w kolejce.

7) **Observability**
   - Heartbeat per worker.
   - Progress: pending/running/done.
   - Summary w stylu obecnego `run-e2e-parallel`.

8) **CI opt‑in**
   - Pipeline CI z `SEAL_E2E_QUEUE=1`.
   - Zachowaj stary tryb jako fallback.

9) **Twarde testy**
   - Dodaj E2E metatest: czy queue nie zostawia tmp/log/seed.
   - Wymus weryfikacje zasobow (disk/inodes) przed startem.

## Migracja (krok po kroku)
1) **Stan 0 – obecny tryb**
   - Zostaw `run-e2e-parallel.js` jako domyslny.
   - Dodaj tylko dokumentacje i flagi (bez efektu ubocznego).
   - Kryteria sukcesu: brak zmian w wynikach; brak nowych artefaktow/tmp.

2) **Stan 1 – opt‑in lokalny**
   - `SEAL_E2E_QUEUE=1` wlacza scheduler+worker.
   - Uruchom tylko testy `parallel=1` w kolejce, `parallel=0` serial.
   - Shadow‑mode (opcjonalnie): scheduler liczy plan/estimated_cost, ale wykonuje stary flow i loguje roznice.
   - Kryteria sukcesu: zgodnosc statusow z trybem klasycznym; brak leakow tmp/log.

3) **Stan 2 – CI opt‑in**
   - Osobny job CI z `SEAL_E2E_QUEUE=1`.
   - Porownaj wyniki z klasycznym runem (statusy i czasy).
   - Canary: uruchamiaj queue tylko na wybranych branchach lub 1/5 runow.
   - Kryteria sukcesu: flake rate <= tryb klasyczny; wall‑clock <= baseline + 10%.

4) **Stan 3 – stabilizacja**
   - Dodaj `estimated_cost` z `summary/last.tsv`.
   - Wprowadz limit “heavy”.
   - Weryfikuj brak tmp/log leak po runie.
   - Dodaj metryki zasobow (disk/inodes start/end, rozmiar cache/log/tmp).
   - Kryteria sukcesu: brak leakow, stabilny czas runu, brak regresji w summary.

5) **Stan 4 – default**
   - Przelacz domyslny wrapper na kolejke.
   - Zostaw `SEAL_E2E_QUEUE=0` jako fallback (czasowo).
   - Kryteria sukcesu: 2 tygodnie bez regresji; fallback nieuzywany.

6) **Stan 5 – cleanup**
   - Usun nieuzywane sciezki w starym runnerze.
   - Uporzadkuj CI i dokumentacje.
   - Kryteria sukcesu: jeden kanoniczny tryb + kompletna dokumentacja.

## Operational hardening (po migracji)
- **Gates w CI**: wymagaj X kolejnych runow bez regresji przed przejsciem na default.
- **Auto‑rollback**: jesli flake rate lub czas > prog, automatyczny fallback do starego trybu.
- **Kill‑switch**: `SEAL_E2E_QUEUE=0` zawsze respektowany, bez wzgledu na config.
- **Preflight gate**: sprawdz disk/inodes/perms przed startem scheduler.
- **Resource caps**: limity CPU/RAM per worker (unikaj oversubscription).
- **Historiogram czasu**: per‑test histogram i automatyczna aktualizacja `estimated_cost`.
- **Contract test**: worker nie dotyka globalnych katalogow; fail‑fast.
- **Tryb degraded**: automatyczne obnizenie `WORKERS` lub limit “heavy” na slabszych hostach.

## Ryzyka i bledy (oraz jak ich uniknac)
- **Race w summary**: wielu workerow zapisuje rownoczesnie i psuje plik.
  - Unikaj: jeden writer (scheduler) albo `flock` na pliku; zapis atomowy i walidacja wierszy.
- **Wycieki tmp/log**: worker konczy sie bez cleanup i zostawia GB danych.
  - Unikaj: `finally`/`trap` w workerze; cleanup tylko w swoim root; globalny cleanup na starcie.
- **Mieszanie ownership (sudo)**: cache/tmp tworzone jako user, potem worker jako root.
  - Unikaj: eskaluj przed tworzeniem cache/log/tmp; loguj `whoami` i sciezki.
- **Zle TMPDIR**: `TMPDIR` wskazuje na per‑run tmp; inne grupy go sprzataja.
  - Unikaj: `TMPDIR` stabilny (np. `/tmp`), `NODE_COMPILE_CACHE` poza tmp rootem.
- **Shared cache zapisywany przez workery**: korupcja lub race w node_modules.
  - Unikaj: warm‑up cache przed startem; w workerach tylko read‑only.
- **Stale locki**: lock plik/katalog zostaje po crashu i blokuje kolejne runy.
  - Unikaj: lock z TTL + log “stale lock”, opcja wymuszenia.
- **Deadlock kolejki**: testy z exclusivity blokuja kolejke na stale.
  - Unikaj: timeouts na jobie, watchdog na “running”; fallback do serialu.
- **Brak izolacji outDir**: cleanup jednej pracy usuwa artefakty innej.
  - Unikaj: unikalny `outDir` per job; worker nie czyści globalnych katalogow.
- **Niewlasciwe schedulowanie heavy**: zbyt wiele ciezkich testow na raz.
  - Unikaj: limit “heavy” i prosty koszt z historii.
- **Brak spojnoci manifestu**: zmiany manifestu w trakcie runu.
  - Unikaj: hash manifestu zapisywany w summary; worker weryfikuje zgodnosc.
