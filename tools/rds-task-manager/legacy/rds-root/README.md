# Fleet Manager Project

## Cel i zakres

Zbudowac wlasny fleet manager dla robotow Robokit, sterowany przez API robota. Docelowo system ma:
- planowac zadania (pick/drop),
- utrzymywac stan pol i mapy,
- wspolpracowac z Roboshop lub bezposrednio z robotem,
- zachowac obstacle avoidance po stronie robota.

To repozytorium zawiera prototypy, narzedzia do reverse engineering oraz dane procesu z mapy.

## Stan obecny (zrobione)

### Artefakty mapy i workflow
- Zapisane dane procesu i mapy: `scraped/graph.json`, `scraped/workflow.json5`.
- Skrypty do generowania/podsumowan w `scraped/scripts/`.

### UI (prototyp)
- `fleet-manager/` zawiera prototyp UI: mapa, roboty, streamy, zadania.
- Mapa ma pan/zoom, worksite z kontekstowym menu, action points, prosta symulacja zadan.
- To jest frontend bez realnego polaczenia z robotem.

### Symulator + scheduler (prototyp)
- `robokit-sim/` to prosty symulator Robokit TCP (GoTarget + status).
- `task-manager/` to prosty scheduler dla jednego robota, korzysta z `graph.json` i `workflow.json5` i komunikuje sie po TCP.

### Proxy do logowania TCP
- `robokit-proxy/` to TCP proxy z logami per polaczenie.
- Logi w `traffic.jsonl` + surowe strumienie `c2s.bin` i `s2c.bin`.
- Spec logowania: `robokit-proxy/SPEC.md`.

## Co pozostaje do zrobienia

### Reverse engineering API robota
- Zbierac logi z `robokit-proxy` na portach Roboshop <-> robot.
- Odtworzyc format ramek i reguly request/response.
- Zdefiniowac minimalny zakres komend, ktore musimy emulowac.

### Symulator zgodny z Roboshop
- Rozszerzyc TCP simulator, aby byl akceptowany przez Roboshop.
- Uzupelnic handshake i pelen zakres komend.
- Rozszerzyc stan robota (alarmy, IO, mapy, blokady).

### Backend fleet manager
- Polaczyc scheduler z realnym API robota.
- Persistencja stanu (worksites, zadania, roboty).
- Multi-robot i rezerwacje zasobow.

### Integracja UI
- Podlaczyc `fleet-manager/` do backendu.
- Zastapic symulacje klienta realnymi danymi.

## Kroki posrednie (roadmap)

1) Zbieranie logow (proxy) + analiza protokolu.
2) Minimalny emulator TCP, ktory Roboshop akceptuje.
3) Scheduler i backend dla jednego robota.
4) Integracja UI i podglad zadan/stanow.
5) Multi-robot + poprawki process-specific (kolejnosc drop, blokady).

## Repozytorium w skrocie

- `docs/` - dokumentacja techniczna i workflow analizy.
- `fleet-manager/` - UI prototyp (mapa, roboty, streamy, zadania).
- `fleet-sim-core/` - wspolny silnik symulacji (lokalny + Robokit).
- `robokit-proxy/` - TCP proxy do logowania ruchu Roboshop <-> robot.
- `robokit-sim/` - symulator TCP (RBK frames), moze korzystac z `fleet-sim-core`.
- `task-manager/` - prosty scheduler z `graph.json` i `workflow.json5`.
- `scraped/` - dane z mapy i workflow + skrypty pomocnicze.
- `nowy-styl-map/` - pliki mapy (smap).
- `nowy-styl-rds/`, `rds/`, `seer/` - materialy referencyjne i dekompilaty.

## Konfiguracja i dane

Najwazniejsze pliki:
- `scraped/graph.json` - graf mapy (wezly i krawedzie).
- `scraped/workflow.json5` - definicja grup pick/drop i streamow.
- `task-manager/state/worksites.json` - stan pol (filled/blocked).
- `task-manager/state/tasks.json` - historia zadan.
- `robokit-proxy/config.json5` - mapowania portow proxy.

Zmienne srodowiskowe:
- `ROBOKIT_HOST`, `ROBOKIT_STATE_PORT`, `ROBOKIT_TASK_PORT`, `GRAPH_PATH`, `WORKFLOW_PATH` (task-manager).
- `CONFIG_PATH` (robokit-proxy).

## Logi i analiza

Proxy zapisuje:
- `traffic.jsonl` (zdarzenia w kolejnosci czasowej),
- `c2s.bin` i `s2c.bin` (surowe strumienie TCP),
- opcjonalnie `c2s.jsonl` i `s2c.jsonl`.

Spec formatow: `robokit-proxy/SPEC.md`.
Instrukcja analizy: `docs/ANALYSIS_WORKFLOW.md`.

## Ograniczenia i zalozenia

- `robokit-sim` jest TCP, ale obsluguje tylko minimalny zestaw komend.
- `task-manager` obsluguje jeden stream i jednego robota.
- `fleet-manager` to UI prototyp i nie ma polaczenia z backendem.
- `robokit-proxy` loguje tylko TCP i wymaga ustawienia Roboshopa na proxy.

## Przenoszenie projektu

Instrukcja migracji: `docs/MIGRATION.md`.

## Szybkie odpalanie prototypow

- `robokit-proxy`: `npm --prefix /home/inovatica/seal/rds/robokit-proxy start`
- `robokit-sim`: `npm --prefix /home/inovatica/seal/rds/robokit-sim start`
- `task-manager`: `npm --prefix /home/inovatica/seal/rds/task-manager start`
- `fleet-manager`: `node /home/inovatica/seal/rds/fleet-manager/server.js`

## Dokumentacja dodatkowa

- `docs/ARCHITECTURE.md` - przeplyw danych i komponenty.
- `docs/CONFIGURATION.md` - konfiguracja wszystkich uslug.
- `docs/ANALYSIS_WORKFLOW.md` - jak zbierac i analizowac logi.
- `docs/PROTOCOL_NOTES.md` - szablon notatek protokolu.
- `docs/STATUS_CONTRACT.md` - mapowanie statusow Robokit <-> fleet-manager.
- `docs/DATA_GENERATION.md` - generowanie graph.json i workflow.json5.
- `docs/STATE_AND_RESET.md` - stan i czyszczenie danych.
- `docs/MIGRATION.md` - jak przeniesc projekt w nowe miejsce.
- `docs/OPERATIONS.md` - uruchamianie, porty, health i troubleshooting.
- `scraped/fleet_manager_requirements.md` - dluze notatki o wymaganiach i MVP.

Szczegoly w README kazdego komponentu.
