# Fleet manager: wymagania i sterowanie (Robokit API)

Cel: zbudowac fleet manager, ktory steruje wieloma robotami, zachowuje obstacle
avoidance po stronie robota i zapobiega kolizjom miedzy robotami.

Zakres: robot API + formaty map. RoboCore traktujemy jako opcjonalne inspiracje,
bez uzalezniania systemu od wbudowanego schedulera.

## Kluczowe wymagania
- Sterowanie wysokiego poziomu, aby robot uzywal wlasnego planera i czujnikow.
- Kontrola ruchu wielu robotow w czasie i przestrzeni (brak kolizji).
- Stale monitorowanie statusu, blokad, i postepu zadan.
- Zrozumienie mapy, grafu drog, punktow i ukladu wspolrzednych.
- Mechanizmy push/telemetrii dla reakcji w czasie rzeczywistym.

## Zasada nadrzedna
Nie sterujemy predkoscia w petli. Fleet manager wysyla komendy nawigacyjne
(cele lub sciezki) i reaguje na statusy robota.

## Obstacle avoidance: zasady sterowania
Najbezpieczniej sterowac przez API nawigacji (cele i sciezki), a nie przez
open-loop. Wtedy robot korzysta z wbudowanego planera oraz warstw
bezpieczenstwa. Fleet manager powinien:
- Reagowac na blokady i status nawigacji oraz w razie potrzeby replanowac.
- Uzywac dynamicznych przeszkod i wylaczania sciezek, aby odzwierciedlac
  zmiany w srodowisku.

## Unikanie kolizji wielu robotow
To jest odpowiedzialnosc fleet managera. Potrzebne sa:
- Globalne planowanie na grafie mapy i rezerwacje czasowo-przestrzenne
  (MAPF / priorytety / sloty czasowe).
- Blokady na waskich gardlach (np. mutual block group) lub dynamiczne
  przeszkody jako "soft lock".
- Zasady pierwszenstwa, timeouty, i bezpieczne wycofanie/replan.
- Biezace monitorowanie postepu i blokad, aby nie wysylac nowych zadan
  do robota, ktory jest zablokowany.

## Blokady i rezerwacje odcinkow (plan inkrementalny)
Cel: zapobiec kolizjom miedzy robotami bez sterowania predkoscia w petli.
Robimy to po stronie fleet managera, rezerwujac odcinki grafu w czasie.

### Krok 1: Rezerwacje na poziomie wezlow (MVP)
- Dla kazdego robota planujesz trase jako liste wezlow.
- Rezerwujesz wezel na okno czasu (eta_start, eta_end) dla robota.
- Konflikt: inny robot ma rezerwacje tego samego wezla w tym samym czasie.
- Reakcja: zatrzymaj sie w poprzednim wezle lub przelicz trase.

### Krok 2: Rezerwacje odcinkow (edges)
- Rezerwujesz odcinek (edge) na okno czasu przejazdu.
- Konflikt: dwa roboty na tym samym odcinku w przeciwnych kierunkach lub
  w tej samej chwili.
- Reakcja: wprowadz czekanie w wezlach buforowych lub zmien trase.

### Krok 3: Waskie gardla i locki
- Oznaczasz segmenty jako lock group (np. korytarze, tunele, bramy).
- W danej chwili tylko jeden robot moze wejsc do lock group.
- Reakcja: pozostale roboty czekaja w punktach oczekiwania przed lockiem.

### Krok 4: Czas i priorytety
- Rezerwacje maja timeout (expires_at).
- Priorytety zadan/robotow rozstrzygaja kto dostaje rezerwacje.
- W razie deadlocka: cofka, replan, albo wymuszenie pierwszenstwa.

## Jak uwzgledniac gabaryty robota
- Uzyj obrysu robota (footprint) + margines bezpieczenstwa (buffer).
- Dla kazdego odcinka wylicz minimalna szerokosc korytarza.
- Jesli korytarz < footprint + buffer, oznacz jako waskie gardlo (lock group).
- ETA liczymy z predkosci maksymalnej oraz dlosci odcinka.
- W wezlach rozpatruj nie punkt, a okrag o promieniu (footprint/2 + buffer).

## Minimalny algorytm unikania kolizji (bez predkosci w petli)
1) Planner globalny liczy trase (lista wezlow).
2) Fleet manager buduje rezerwacje czasowe dla wezlow/odcinkow.
3) Jesli konflikt:
   - wstaw wait w punkcie buforowym albo
   - przelicz trase, albo
   - odloz zadanie w czasie.
4) Wysylasz robotowi tylko cele/segmenty (np. kolejny target).
5) Robot lokalnie omija przeszkody, ale nie wchodzi w zarezerwowany odcinek
   bez przydzielonego okna czasowego.

## Jak laczymy globalne planowanie z lokalnym avoidance
Model: globalny plan rezerwuje korytarze i okna czasowe, a robot lokalnie
omija przeszkody w granicach tego korytarza.
- Fleet manager planuje trase na grafie i wyznacza korytarz przejazdu.
- Trase dzieli na segmenty z bezpiecznymi punktami oczekiwania.
- Dla segmentu rezerwuje odcinki w czasie; waskie gardla zabezpiecza lockami.
- Wysyla segment jako designated path lub liste punktow (jesli brak, to
  wymusza korytarz przez wylaczenie sciezek lub dynamiczne przeszkody).
- Robot lokalnie omija przeszkody, ale nie powinien opuszczac korytarza.
- Gdy robot opoznia sie lub stoi, harmonogram aktualizuje rezerwacje,
  a kolejne roboty sa wstrzymywane w bezpiecznych punktach.
- Konflikt lub duze odchylenie => replan i odswiezenie rezerwacji/lockow.

## Mapy i uklad wspolrzednych
Fleet manager musi rozumiec format mapy i uklad wspolrzednych, aby:
- Budowac graf drog/punktow i liczyc koszty tras.
- Unikac kolizji przez rezerwacje odcinkow.
- Importowac/aktualizowac mapy, jesli sa przeuczane.

## Telemetria i zdarzenia
Sterowanie wieloma robotami wymaga ciaglego odczytu stanu i szybkiej reakcji:
- Statusy nawigacji, blokad, lokalizacji, baterii, alarmow.
- Push/MQTT, gdy potrzeba reakcji w czasie rzeczywistym.

## Minimalny przeplyw (skrót)
- Zbierz mapy i zbuduj graf drog.
- Zbierz statusy i dostepnosc robotow.
- Zaplanuj trasy z rezerwacjami czasu i odcinkow.
- Wyslij zadania nawigacyjne i monitoruj statusy.
- Reaguj na blokady (dynamiczne przeszkody, replan, wstrzymanie).

## Roadmapa MVP
- Etap 1: pojedynczy robot (vertical slice)
  - Parser mapy -> graf drog + shortest path.
  - Robot adapter: status, nawigacja (cel/sciezka), cancel, blocked status.
  - Prosty executor zadan: kroki `go_to`/`wait` wykonywane sekwencyjnie.
  - Telemetria: cykliczny status + logowanie przebiegu.
- Etap 2: dwa roboty, najprostsza kolizja
  - Reservation table: rezerwacje odcinkow grafu w czasie.
  - Segmentacja trasy na odcinki + punkty oczekiwania.
  - Dispatch segmentami: wysylasz kolejny segment po zwolnieniu konfliktu.
- Etap 3: konflikty i waskie gardla
  - Locki na krytycznych odcinkach (mutual block group).
  - Replan przy opoznieniach/stopie.
- Etap 4: stabilizacja i operacje
  - Timeouty, retry, replan, awaryjne wstrzymanie.
  - Minimalny panel stanu (lista robotow, trasy, rezerwacje).

## Etap 1: checklist implementacyjny (pojedynczy robot)
- Mapy: wczytaj Smap/3D, zbuduj graf (wezly, odcinki, atrybuty, version).
- Planner: A* / Dijkstra, zwraca liste punktow lub odcinkow.
- Robot adapter: nawigacja (cel/sciezka), cancel, status, blocked status.
- Task runner: kolejka zadan, kroki `go_to`/`wait`, timeouty, retry.
- Telemetria: polling + push (jesli dostepne), normalizacja statusow.
- Storage: zapis stanu robota i zadan (np. sqlite/json).
- API/CLI: tworzenie zadan i podglad stanu.
- Observability: logi zadan i zdarzen.

## Minimalny schemat danych
- MapGraph: map_id, version, nodes[], edges[].
- MapNode: id, x, y, kind, tags.
- MapEdge: id, from, to, length_m, allowed_dirs, speed_limit, tags, capacity.
- RobotState: id, map_id, pose(x,y,theta), status, battery_pct, task_id,
  segment_id, last_seen.
- Task: id, priority, constraints, steps[].
- TaskStep: op, target/site, params, timeout_s.
- TaskRun: task_id, step_index, state, started_at, updated_at, error.
- Reservation: resource_id(edge/node), robot_id, t_start, t_end, segment_id.
- SegmentPlan: robot_id, path_edges, checkpoints, eta_start, eta_end, locks[].
- Lock: resource_id, robot_id, state, expires_at.
- Event: robot_id, type, payload, ts.

## Robot adapter (Robokit wrapper)
Robokit jest docelowym API robota, ale w fleet managerze warto miec cienka
warstwe adaptera. Ten adapter:
- daje spójne API w kodzie (latwiejsze testy, mocki, logowanie),
- normalizuje statusy i bledy z Robokita,
- ukrywa roznice wersji/protokolow (np. TCP vs HTTP), jesli kiedys dojdzie.

Minimalny interfejs adaptera:
- send_goal(robot_id, site_or_pose)
- send_path(robot_id, path_points)
- cancel(robot_id)
- get_status(robot_id)
- get_task_state(robot_id, task_id)
- set_push_config(robot_id, endpoint)

Implementacja MVP: adapter to cienka fasada nad Robokit bez dodatkowej logiki.

## Model zadan (task chain)
Zadanie w fleet managerze mozna budowac jako task chain:
- Krok typu move: jedz do lokacji (site/pose).
- Krok typu action: wykonaj akcje, np. widly/rolki/ramie.
- Krok action moze zawierac wlasna lokacje (wtedy powstaje sekwencja
  move -> action).

Takie podejscie pasuje do Robokita i daje sie mapowac na API robotow bez
sterowania predkoscia w petli.

Powiazane strony w wiki (koncepcje i przyklady):
- Task chain API (query): https://seer-group.feishu.cn/wiki/T0dqwODv2itr0xkcFw1cvPYenog
- Task chain list: https://seer-group.feishu.cn/wiki/G6hxw7QRui4kgkkabgycCoe1nHg
- Execute pre-stored tasks: https://seer-group.feishu.cn/wiki/W1NAw8rIOimRZUkfNapc4MYGndd
- Roboshop: scheduling usage: https://seer-group.feishu.cn/wiki/Gpd7wdxaDijE4UkhwKYc4StqnJg
- Roboshop: G-MAPF params: https://seer-group.feishu.cn/wiki/UpTQw5uwXiBlfkkEthZcdBHSngd
- Roboshop: APIs used: https://seer-group.feishu.cn/wiki/Le8Ew7Y1wioNf6kdFbpcnIWBnae

## Rodzaje misji (use-case patterns do MVP)
Ponizej sa wzorce misji, ktore pokrywaja realne przypadki i skalowalne
zachowania. Kazdy wzorzec rozklada sie na task chain, ale decyzje i logika
sa wyzej (w fleet managerze).

- Pick-group -> Drop-group (warunkowe uruchomienie):
  - Warunek startu: istnieje zajete pole w grupie pick i wolne w grupie drop.
  - Polityka wyboru: najblizsze/priorytet/least-congested.
  - Rezultat: dispatch robota z akcja pobrania i odlozenia.
- Pick-group -> Drop-group (odroczona decyzja drop):
  - Robot jedzie w okolice strefy drop bez twardego wyboru pola.
  - Na ostatnim odcinku wybiera docelowe pole na podstawie aktualnej
    zajetosci (stan mogl sie zmienic w trakcie jazdy).
  - W razie braku wolnych pol: przejscie do bufora/hold i ponowna decyzja.
- Pick-group z rezerwacja + retry:
  - Wstepna rezerwacja pick i planowany drop (soft reservation).
  - Jesli pick staje sie niedostepny, misja jest anulowana lub przeliczana.
  - Jesli drop staje sie zajety, misja przechodzi w tryb odroczony.
- Buffer/holding pattern:
  - Gdy nie ma wolnego drop lub istnieje konflikt, robot jedzie do bufora
    i czeka (task chain z hold), az warunek misji zostanie spelniony.

## Reguly wyboru pola docelowego (drop)
Przy wyborze pola drop stosujemy polityke punktacji i aktualny stan zajetosci:
- koszt = dystans + kara_za_korek + kara_za_priorytet + kara_za_zajetosc
- wybieramy pole z najnizszym kosztem, z filtem na typ kontenera i wymagania

## Commit distance (moment decyzji drop)
Aby stan drop nie zmienial sie zbyt pozno, ustawiamy prog:
- commit_distance_m: dystans, przy ktorym wybor pola staje sie ostateczny
- przed tym progiem wybor moze sie zmieniac (np. nowa zajetosc)

## Jezyk opisu procesow (konfiguracja, bez zmian w kodzie)
Cel: definiowac przeplywy produkcyjne i logike misji przez konfiguracje.
W MVP uzywamy strumieni (streams), ktore stale obserwuja stany (np. obecnosci
palet) i generuja misje pick->drop.

Format: JSON5 (komentarze, trailing comma, latwe roznice w repo).

Minimalne elementy jezyka:
- groups: zbiory worksite (np. PICK-GROUP, DROP-GROUP-01..)
- states: stany/demand (np. obecnosci palet z czujnikow)
- streams: definicje strumieni pracy (pick->drop)
- policies: wybor drop, priorytety, commit_distance_m

Przykladowy szkic (JSON5, uproszczony):
```
{
  groups: {
    PICK_GROUP: ["AP1", "AP2"],
    DROP_GROUP_01: ["AP3", "AP4"],
    DROP_GROUP_02: ["AP5", "AP6"],
    BUFFER: ["AP7"],
  },
  occupancy: {
    source: "sensor",
    pick_groups: ["PICK_GROUP"],
    drop_groups: ["DROP_GROUP_01", "DROP_GROUP_02"],
  },
  streams: [
    {
      id: "stream_1",
      pick_group: "PICK_GROUP",
      drop_group_order: ["DROP_GROUP_01", "DROP_GROUP_02"],
      pick_policy: {selection: "occupied_only"},
      drop_policy: {
        selection: "first_available_in_order",
        access_rule: "preceding_empty",
        commit_distance_m: 8,
      },
    },
  ],
}
```

## MVP case: pojedynczy strumien pick->drop (Nowy Styl)
Opis procesu:
- Pick: palety na polach PICK sa wykrywane przez czujniki.
- Drop: pola sa ulozone w kolejnosci; wolne pole jest tylko wtedy, gdy
  wszystkie poprzedzajace w tej samej grupie sa puste (przejazd).
- Wybieramy pierwsze dostepne pole w pierwszej dostepnej grupie drop.

Logika wyboru (prosto):
1) znajdz dowolne zajete pole pick
2) iteruj po drop_group_order:
   - w grupie wybierz pierwsze puste pole
   - jezeli wszystkie poprzednie sa puste -> ok
   - jezeli jakiekolwiek poprzednie zajete -> grupa niedostepna
3) wyslij misje pick->drop

Uwaga:
- Kolejnosc pol w grupie drop musi odzwierciedlac realny dostep (od wejscia
  do najdalszego). W przeciwnym razie algorytm dostepnosci bedzie bledny.


W ten sposob linia moze zmieniac typ kontenera w danym momencie, a przeplyw
pozostaje konfigurowalny bez zmian w kodzie.

## Testowanie bez robota
Najprostszy sposob to symulator + mock adaptera robota.

- Symulator robota (adapter mock):
  - implementuje send_goal/send_path/cancel/get_status
  - porusza robota po grafie mapy, zwraca status nawigacji i blocked
  - emuluje opoznienia, stop/start i proste avoidance (zatrzymanie)
- Scenario runner:
  - wczytuje JSON5 i generuje misje
  - uruchamia symulacje i zbiera logi oraz metryki

Co testowac:
- invariants: brak kolizji, brak deadlockow > X s, zakonczenie zadan w T
- stress: N robotow, M misji, losowe blokady i zmiany stanow
- stability: opoznienia, anulowanie, utrata robota, ponowny dispatch
- regresje: scenariusze z ustalonym seedem

Metryki:
- sredni czas realizacji, liczba replanow, procent zadan zakonczonych
- liczba konfliktow na odcinkach, utilization robotow

## Testy: unit / integracyjne / e2e
Unit:
- planner: shortest path, koszt, rezerwacje i wykrywanie kolizji
- polityki wyboru drop: scoring, commit_distance, fallback
- parser mapy + walidacja grafu
- workflow: czy stany generuja poprawne misje

Integracyjne:
- map + planner + rezerwacje + task runner
- adapter mock: mapowanie misji na komendy robota
- replan po zmianie stanu lub opoznieniach

E2E (wirtualny czas):
- scenario runner z kilkoma robotami i konfliktami
- invarianty: brak kolizji, brak deadlockow > X s, domkniecie misji
- regresje z ustalonym seedem

Kontraktowe:
- testy zgodnosci adaptera z Robokit (mock vs realne API)

## Persystencja i recovery po awarii
Cel: po crashu nic nie ginie, a system wstaje w spojnosc z robotami.

Zrodlo prawdy (DB):
- zadania, kroki, stany (Task/TaskRun)
- stany demand (need_empty, shipment_ready)
- rezerwacje/locki z TTL
- ostatni stan robota (pose, task_id, map_id)
- konfiguracja JSON5 + wersje
- metadane map (checksum, wersja, plik)

Outbox (dziennik komend):
- kazda komenda do robota trafia do tabeli outbox w tej samej transakcji
- worker wysyla, zapisuje ack i idempotency_key
- po restarcie ponawia tylko pending (bez duplikatow)

Recovery przy starcie:
- oznacz in-flight jako recovering
- odczytaj statusy robotow i porownaj z taskami w DB
- odbuduj rezerwacje z planow lub zrestartuj planowanie
- wygas TTL lockow i zwolnij stale blokady

Spójnosc i idempotencja:
- jednoznaczne id task/step/command
- optimistic locking (version) na krytycznych rekordach
- polityka “at-least-once” z deduplikacja po idempotency_key

Uwagi implementacyjne:
- MVP: SQLite z WAL; produkcja: Postgres
- mapy trzymac na dysku, w DB tylko metadane + checksum
- jeden writer dla scheduler-a (unikamy konfliktow)

### Minimalny schemat tabel (propozycja)
- robots: id, name, ip, map_id, last_pose, status, battery_pct, last_seen, version
- tasks: id, priority, state, created_at, updated_at
- task_steps: id, task_id, step_index, op, target, params, state
- task_runs: task_id, step_index, state, started_at, updated_at, error
- demands: id, state_type, scope, payload, active, updated_at
- reservations: id, resource_id, robot_id, t_start, t_end, state, ttl_expires_at
- locks: id, resource_id, robot_id, state, ttl_expires_at
- maps: id, name, version, checksum, file_path, updated_at
- outbox: id, robot_id, command_type, payload, idempotency_key, state, created_at
- outbox_ack: id, outbox_id, ack_payload, received_at
- events: id, robot_id, type, payload, ts

### Recovery: procedura resync krok po kroku
1) Oznacz in-flight tasks jako recovering.
2) Odczytaj statusy robotow (online/offline, task_id, nav_state).
3) Dla kazdego robota:
   - jesli robot ma aktywne zadanie i to zadanie istnieje w DB -> kontynuuj
   - jesli robot raportuje zadanie nieznane -> oznacz jako orphan i anuluj
   - jesli robot offline -> wstrzymaj jego taski i zwolnij locki po TTL
4) Odbuduj rezerwacje:
   - z aktywnych task_runs i segmentow
   - wygas stare rezerwacje po ttl_expires_at
5) Outbox:
   - ponow wysylke komend w stanie pending
   - deduplikuj po idempotency_key
6) Wznow scheduler:
   - ponowne planowanie dla waiting/blocked
   - weryfikacja demandow aktywnych

## MVP checklist (wdrozenie u klienta)
Cel: minimalny zakres, ktory pozwala wykonac realne przeplywy na hali.

Priorytet P0 (musi byc):
- Stabilny adapter Robokit (nawigacja, statusy, cancel/stop, retry).
- Import mapy + graf drog + shortest path.
- Planner z rezerwacjami odcinkow (reservation table).
- Segmentacja tras + bezpieczne punkty oczekiwania.
- Workflow JSON5 ze stanami demand/shipment.
- Wybór pick/drop + commit_distance + fallback na bufor.
- Monitoring: lista robotow + aktywne zadania + podstawowe logi.
- Persystencja (DB, outbox) + recovery po restarcie.

Priorytet P1 (wysoko zalecane):
- Locki na waskich gardlach (mutual block group / dynamic obstacles).
- Push/MQTT dla statusow (mniej polling).
- Panel operatorski (widok mapy + statusy + alarmy).
- Walidacja konfiguracji JSON5 (schema + lint).

Priorytet P2 (po wdrozeniu):
- GUI do edycji procesow (flow builder).
- Zaawansowane polityki optymalizacji (MAPF, priorytety SLA).
- Raporty KPI (czas cyklu, utilization, kolizje/konflikty).

Kryteria akceptacji MVP (przykladowe):
- Realizacja przeplywu pick -> drop w trybie automatycznym.
- Brak kolizji w scenariuszu 2–3 robotow na wspolnych odcinkach.
- Recovery po awarii w < 2 min bez utraty zadan.

## Integracja z Roboshop (gateway)
Cel: Roboshop widzi fleet manager i moze pobierac status oraz wgrywac mapy.

Podejscie:
- warstwa gateway, ktora mowi protokolem Roboshopa i tlumaczy na operacje
  fleet managera (statusy, mapy, zadania)
- opcja A: wirtualny robot per fizyczny robot (Roboshop widzi wiele wpisow)
- opcja B: jeden agregat "fleet" (Roboshop widzi jeden wpis + status floty)
- upload mapy: gateway przyjmuje mape, zapisuje w FM, uruchamia dystrybucje
  na roboty przez Robokit, zwraca job_id i status asynchronicznie

Wskazowka z dokumentacji Roboshop:
- w logach Roboshopa widac TCP do portu 19208 i komendy typu
  5045 robot_core_alxnet_req -> 15045 (odczyt konfiguracji sieci)
- to sugeruje uzycie protokolu RobotTcp/robot_core_* dla komunikacji

Nastepny krok:
- przechwycic ruch Roboshopa (tcpdump/wireshark) lub zebrane logi,
  aby spisac liste wymaganych komend (statusy, mapy, itd.)

### Plan przechwytywania ruchu (tcpdump/wireshark)
Cel: poznac liste komend, ktorymi Roboshop odpytuje robota.

1) Ustal interfejs sieciowy na maszynie z Roboshopem:
   - `ip -br link` lub `ip route`
2) Uruchom przechwytywanie tylko portu Roboshopa (przyklad 19208):
   - `sudo tcpdump -i eth0 -w roboshop.pcap port 19208`
3) Wykonaj akcje w Roboshopie (status, upload mapy, zmiana ustawien).
4) Zatrzymaj capture i otworz `roboshop.pcap` w Wireshark.
5) Zidentyfikuj:
   - format ramek/protokolu (naglowki, request/response)
   - typy komend i parametry (status, listy map, upload)

Uwagi:
- Jesli Roboshop dziala na Windows, najlatwiej uzyc Wireshark na tej maszynie.
- Alternatywnie: wbudowane logi/narzedzia Roboshopa do analizy protokolu.

### Mini-spec gateway (kontrakty danych)
Ponizej minimalny zakres operacji, ktore gateway powinien obslugiwac.
Mapowanie na realny protokol Roboshopa powstaje po przechwyceniu ruchu.

Status robota:
- robot_id, name, ip, online
- pose (x,y,theta), map_id
- nav_state (idle/moving/blocked)
- battery_pct, alarms[]
- task_id, task_state

Mapy:
- list: map_id, name, version, checksum, size
- upload: job_id, requested_at, status (queued/running/succeeded/failed)
- per-robot status: robot_id -> status + error

Operacje podstawowe:
- get_status(robot_id)
- list_robots()
- list_maps()
- upload_map(file) -> job_id
- get_map_job(job_id)
- apply_map(map_id, robot_ids[])

Kodowanie bledow:
- error_code, error_message, retryable (true/false)

### Format ramki/protokolu (po przechwyceniu)
Po zebraniu pcap/logow spisujemy:
- strukturę ramki: naglowek, dlugosc, typ/komenda, payload, checksum
- endian, kodowanie liczb i stringow
- schemat request/response i korelacja (np. request_id)
- kody bledow i retry policy

### Statusy i mapowanie (abstrakcja)
Wewnetrzne statusy w fleet managerze powinny byc stabilne, niezalezne
od Robokita i Roboshopa. Przyklad:
- idle, moving, blocked, waiting, charging, error, offline

Mapowanie robimy przez adapter:
- Robokit -> internal status (normalizacja)
- internal status -> Roboshop payload

Przykladowa maszyna stanow (skrót):
- idle -> moving (po wyslaniu celu/sciezki)
- moving -> blocked (wykryta przeszkoda / brak postepu)
- blocked -> moving (po wznowieniu)
- moving -> idle (cel osiagniety)
- * -> error (awaria/estop)
- error -> idle (po skasowaniu)
- * -> offline (brak heartbeat)

Definicje (propozycja):
- blocked: robot nie jedzie z powodu przeszkody lub braku postepu
- waiting: robot stoi, bo czeka na warunek zewnetrzny (lock, bufor, okno czasu)
- charging: robot jest w trybie ladowania (task lub manual)
- error: awaria lub estop (wymaga interwencji/clear)
- offline: brak polaczenia/heartbeat

Rozszerzona tabela przejsc:
- idle -> waiting (brak wolnych zasobow, oczekiwanie w buforze)
- waiting -> moving (zwolnienie locka/pojawienie sie celu)
- moving -> charging (przejazd do stacji zakonczony, start ladowania)
- charging -> idle (zakonczenie ladowania lub przerwanie)
- moving -> error (estop, krytyczny alarm)
- blocked -> waiting (decyzja fleet managera: wstrzymaj i czekaj)
- blocked -> error (blokada krytyczna / brak mozliwosci kontynuacji)
- offline -> idle (powrot heartbeat + re-sync statusu)
- error -> waiting (po skasowaniu, ale z blokada ponownego startu)

Pelna tabela przejsc (state x event, wersja bazowa):
| current  | event                 | next     | notes |
|---------|------------------------|----------|-------|
| idle    | goal_sent              | moving   | start nawigacji |
| idle    | lock_denied            | waiting  | brak zasobu / bufor |
| idle    | manual_pause           | waiting  | operator stop |
| moving  | goal_reached           | idle     | cel osiagniety |
| moving  | obstacle_detected      | blocked  | brak postepu |
| moving  | no_progress_timeout    | blocked  | timeout postepu |
| moving  | lock_denied            | waiting  | wstrzymanie przed odcinkiem |
| moving  | estop                  | error    | krytyczny alarm |
| moving  | heartbeat_lost         | offline  | brak polaczenia |
| blocked | obstacle_cleared       | moving   | wznowienie |
| blocked | manual_pause           | waiting  | decyzja operatora |
| blocked | no_progress_timeout    | error    | eskalacja |
| waiting | lock_acquired          | moving   | zwolniony zasob |
| waiting | goal_updated           | moving   | replan i start |
| waiting | cancel_task            | idle     | anulowanie |
| charging| charge_finished        | idle     | koniec ladowania |
| charging| cancel_task            | idle     | przerwanie ladowania |
| error   | error_cleared          | idle     | reset stanu |
| offline | heartbeat_restored     | idle     | re-sync |

Definicje eventow (warunki i zrodla):
- goal_sent: fleet manager wyslal nowy cel/sciezke i otrzymal ack
- lock_denied: brak dostepu do zasobu (odcinek/strefa) lub brak wolnego drop
- manual_pause: operator lub system ustawil pauze (np. maintenance)
- goal_reached: robot raportuje osiagniecie celu/sciezki
- obstacle_detected: robot raportuje przeszkode lub brak postepu w nawigacji
- no_progress_timeout: przekroczony prog czasu bez zmiany pozycji
- estop: e-stop lub krytyczny alarm z robota
- heartbeat_lost: brak heartbeat/statusu przez N sekund
- obstacle_cleared: robot raportuje usuniecie przeszkody lub wznowienie
- lock_acquired: uzyskano lock na zasobie lub pojawil sie wolny drop
- goal_updated: replan lub zmiana celu w trakcie misji
- cancel_task: anulowanie przez system lub operatora
- charge_finished: bateria >= prog docelowy lub zadanie ladowania zakonczone
- error_cleared: alarm skasowany (manual/auto)
- heartbeat_restored: heartbeat wrocil i status zostal zsynchronizowany

Parametry progow (konfigurowalne):
- heartbeat_timeout_s
- no_progress_timeout_s
- blocked_retry_limit
- charge_target_pct
- commit_distance_m

Rozszerzenia stanow (opcjonalne):
- manual_override: operator przejal sterowanie (blokada automatyki)
- maintenance: robot wycofany z uzycia (serwis, kalibracja)

Przykladowy blok JSON5 (progi i stany):
```
{
  thresholds: {
    heartbeat_timeout_s: 5,
    no_progress_timeout_s: 20,
    blocked_retry_limit: 3,
    charge_target_pct: 85,
    commit_distance_m: 8,
  },
  state_overrides: {
    manual_override: true,
    maintenance: false,
  },
}
```

## Linki do wiki: sterowanie i unikanie kolizji
- Robot navigation API: https://seer-group.feishu.cn/wiki/ADDSw6LfBivhnnkMQvccu5nqnmd
- Path navigation: https://seer-group.feishu.cn/wiki/OLxIw8U5CiGrdak3SVHc23KXndd
- Designated path navigation: https://seer-group.feishu.cn/wiki/MBx2wprM6inmd5kZpllcWTqynCc
- Query navigation status: https://seer-group.feishu.cn/wiki/BnYCw0QYHiku1zkr0RacAJ48nsc
- Query path between two points: https://seer-group.feishu.cn/wiki/UUGNwOgnWilq9Yk9GKJcwgpSnxh
- Enable/disable paths: https://seer-group.feishu.cn/wiki/P1Upwbh0XiWDExkjj71csQebnoc
- Insert dynamic obstacle (world): https://seer-group.feishu.cn/wiki/EXsFwhGMpin7OEkiF7zcj3uRnFb
- Insert dynamic obstacles (robot coord): https://seer-group.feishu.cn/wiki/HKn4w0ngQi9TMSkqD0OcYyhtnGb
- Remove dynamic obstacles: https://seer-group.feishu.cn/wiki/JfnpwOxFJiUAmXkEwGscayupn5c
- Query blocked status: https://seer-group.feishu.cn/wiki/B3qdw6SDIiklNnkzuPRcX8BZnjg
- Multi-agent path finding reference: https://seer-group.feishu.cn/wiki/We2swmw0Pi9CFAk6konc0J1Sn7b
- Mutual block group: https://seer-group.feishu.cn/wiki/HThbwmAmHiWWutkaK8KciELEnYd
- Occupy mutual block group: https://seer-group.feishu.cn/wiki/YdEHwAVQSiAIMgkDUf4cmU2NnQh
- Release mutual block group: https://seer-group.feishu.cn/wiki/ZfFzwOBTfisTO6kyJMec1hx0ngc
- Query mutual block group status: https://seer-group.feishu.cn/wiki/Ah3ZwzImYinQAskTtVXcU5w2nRd

## Linki do wiki: mapy i koordynaty
- Coordinate system: https://seer-group.feishu.cn/wiki/IqEawUb3LiUehUkrZ4ccLaqAnUc
- Smap map format parsing: https://seer-group.feishu.cn/wiki/HzsJwoKR2iXN41kFfRccfk1hnld
- 3D map format: https://seer-group.feishu.cn/wiki/FLw5wABA4i83SnkYydacvEZRnvg
- Query loaded and stored maps: https://seer-group.feishu.cn/wiki/OLEWwQ6xviAlmgkcODIcFkHLnrd
- Query map loading status: https://seer-group.feishu.cn/wiki/F9kKwAhAuiQyAnkwBkdcyMubnhg
- Query map list MD5: https://seer-group.feishu.cn/wiki/Xs5lw1uLfiCze6kgRnicNdjCnDh
- Query station info in loaded map: https://seer-group.feishu.cn/wiki/WYwQwzIJFi9A88kRyoGchPuYnzg
- Query cost map: https://seer-group.feishu.cn/wiki/PbYNwzJqmiYC6DkppvscUB80nAe

## Linki do wiki: statusy, telemetria, zdarzenia
- Robot status API: https://seer-group.feishu.cn/wiki/BAKswyH5biNRHgk2piNcULZWnZd
- Query robot location: https://seer-group.feishu.cn/wiki/RUyuwbFCYilWh9k3j4xc4FEhnIg
- Query robot speed: https://seer-group.feishu.cn/wiki/CGqbw9yZFiOVa6kSi8BcnYctnVb
- Query robot battery status: https://seer-group.feishu.cn/wiki/VVlmwVPzviY2f8kyzT9cUF8Hn3g
- Query robot alarm status: https://seer-group.feishu.cn/wiki/DBjuw8GfKicYgukXIz5ch7axnDh
- Query robot I/O status: https://seer-group.feishu.cn/wiki/S6D7wPaG4i58IZklekhcdZGfnhf
- Query robot ultrasonic status: https://seer-group.feishu.cn/wiki/HYUhwuasKi4xl7kkVaUcAKcPnwg
- Query robot localization status: https://seer-group.feishu.cn/wiki/EqyHwIHSQi667wk8QBgcTimlntG
- Robot push API: https://seer-group.feishu.cn/wiki/V0XtwaktpiQLqHkJU5YcLGFkn1c
- Robot push: https://seer-group.feishu.cn/wiki/OF7UwiSovixbWlkPKqOcU3VXnSh
- Configure robot push port: https://seer-group.feishu.cn/wiki/Uu2nwdIg4iYXSukmGTKcD0bFnte
- Set robot push port: https://seer-group.feishu.cn/wiki/SWqrwfORGiyJ3nkOoglcfu50ncZ
- MQTT: https://seer-group.feishu.cn/wiki/LD1CwUmdXiTwY2kc2sQcp5nJnJe

## Linki do wiki: kontrola i konfiguracja
- Robot control API: https://seer-group.feishu.cn/wiki/LIQlwZE9ZiXKGWkRicLcGNqfnic
- Robot configuration API: https://seer-group.feishu.cn/wiki/ANBgwMCDJiiTiJkY3SJc6VWPnab
- Preempt control: https://seer-group.feishu.cn/wiki/A1uZwQLqdizG3qk0NKYcZjF2nGd
- Release control: https://seer-group.feishu.cn/wiki/ObL7wCTHUiilLPkhfbDc8do6nsZ
- Query robot parameters: https://seer-group.feishu.cn/wiki/RA0iw3e1TiTpCSkctrtcxDbTnZc
- Query current control owner: https://seer-group.feishu.cn/wiki/SXQvwrEOAiQy1Mk4NMYc4GNNnR7
- Configure ultrasonic: https://seer-group.feishu.cn/wiki/GzLDwZkQ6inXnckqlmYcZPygnmc
- Configure DI: https://seer-group.feishu.cn/wiki/ShSKwldHBiUHwMkl4dQczzt5ntg
- Set up safety lasers: https://seer-group.feishu.cn/wiki/F8yBwbnboiCaubksdOdc4CFwnOe

## Linki do wiki: zadania robota
- Implement scheduling: https://seer-group.feishu.cn/wiki/M0YdwXIXUizjGakNgCWcXoBJnaf
- Query robot task status: https://seer-group.feishu.cn/wiki/G2SewpozViMG8PkhfuNcFeRnn7d
- Query robot task list: https://seer-group.feishu.cn/wiki/DIQQwNjqDi2GtYkbWtHcY3aLnNe
- Query robot task chain: https://seer-group.feishu.cn/wiki/T0dqwODv2itr0xkcFw1cvPYenog
- Query robot task chain list: https://seer-group.feishu.cn/wiki/G6hxw7QRui4kgkkabgycCoe1nHg
- Execute pre-stored tasks: https://seer-group.feishu.cn/wiki/W1NAw8rIOimRZUkfNapc4MYGndd
- Configure robot dispatchable status: https://seer-group.feishu.cn/wiki/VD0kwki6fiGyMJkjMN3cNDa0nzb
