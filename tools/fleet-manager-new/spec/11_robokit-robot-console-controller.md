# robokit-robot-console-controller — Specyfikacja (v0.1)

## 1. Cel i rola
Aplikacja `robokit-robot-console-controller` to proste narzędzie developerskie do ręcznego sterowania robotem lub `robokit-robot-sim` z poziomu terminala. Ma umożliwiać:
- sterowanie ruchem (jazda + obrót),
- sterowanie widłami,
- Soft‑EMC (software emergency stop),
- przejęcie/zwolnienie kontroli (seize/release),
- wysłanie `goTarget` po ID (LM/AP),
- podgląd najważniejszych statusów w jednym, nieprzewijanym widoku.

## 2. Zakres (MVP)
- TCP po RoboCore/Robokit na portach: `STATE`, `TASK`, `CTRL`, `OTHER`, `CONFIG`.
- Render stanu w terminalu (clear + redraw) bez przewijania.
- Obsługa klawiatury w trybie raw (TTY).
- Proste logowanie zdarzeń klawiatury do pliku JSONL (opcjonalnie).

### Poza zakresem
- Autonomiczna nawigacja, planowanie tras, mapy.
- UI graficzne, joystick, obsługa key‑up z systemu OS.
- Autoryzacja i bezpieczeństwo.

## 3. Uruchomienie (CLI)

```bash
node apps/robokit-robot-console-controller/index.js \
  --host 127.0.0.1 \
  --state-port 19204 \
  --task-port 19206 \
  --ctrl-port 19205 \
  --other-port 19210 \
  --config-port 19207 \
  --nick-name console-controller \
  --speed 0.6 \
  --omega-deg 15 \
  --poll-ms 200 \
  --send-ms 100 \
  --hold-ms 300 \
  --combo-hold-ms 700 \
  --key-log ./key-events.jsonl
```

Parametry (domyślne):
- `--host` (`127.0.0.1`)
- `--state-port` (`19204`)
- `--task-port` (`19206`)
- `--ctrl-port` (`19205`)
- `--other-port` (`19210`)
- `--config-port` (`19207`)
- `--nick-name` (`console-controller`)
- `--speed` (m/s, `0.6`)
- `--omega-deg` (deg/s, `15`)
- `--poll-ms` (`200`)
- `--send-ms` (`100`)
- `--hold-ms` (`300`)
- `--combo-hold-ms` (`700`)
- `--key-log` (pusty = brak logu)

## 4. Klawisze

- **Enter**: Soft‑EMC ON (`6004 {status:true}`)
- **Backspace**: Soft‑EMC OFF (`6004 {status:false}`)
- **Strzalki**: ruch (patrz §5)
- **Space**: Stop (`2000`) + fork stop (`6041`) + motion `0/0`
- **+ / -**: zmiana prędkości liniowej docelowej o `0.1 m/s`
- **Q / W**: zmiana prędkości obrotowej docelowej o `5 deg/s`
- **A / Z**: widły góra/dół o `0.1 m`
- **P**: Seize control (`4005` z `nick_name`)
- **L**: Release control (`4006`)
- **S**: prompt `goTarget` (LM/AP id)
- **Ctrl+C**: wyjście

W trybie prompt `goTarget`:
- **Enter**: wyślij `goTarget`
- **Esc**: anuluj
- **Backspace**: usuń znak

## 5. Logika ruchu (klawiatura)

Terminal nie udostępnia niezawodnych „key‑up” ani prawdziwego stanu „dwa klawisze na raz”, dlatego sterowanie opiera się na oknach czasowych:
- `hold-ms`: jak długo pojedynczy kierunek uznaje się za aktywny po ostatnim zdarzeniu.
- `combo-hold-ms`: okno czasowe dla kombinacji (np. `up+left`).

### Zasady
- Każde zdarzenie strzałki ustawia kierunek osi (liniowej lub kątowej) i czas ostatniego wciśnięcia.
- Jeśli druga strzałka pojawi się w `combo-hold-ms`, aktywuje się „combo latch” i obie osie są trzymane tak długo, jak przychodzą kolejne strzałki w oknie `combo-hold-ms`.
- Wysyłanie komend ruchu odbywa się co `send-ms`.

## 6. Ruch i widły — protokół

### Ruch (CTRL)
- `2010` `robot_control_motion_req` z payloadem:
  ```json
  { "vx": <m/s>, "vy": 0, "w": <rad/s>, "steer": 0, "real_steer": 0 }
  ```

### Stop (CTRL + OTHER)
- `2000` `robot_control_stop_req`
- `6041` `robot_other_forkstop_req`

### Widły (OTHER)
- `6040` `robot_other_forkheight_req` z `{ "height": <m> }`

### Soft‑EMC (OTHER)
- `6004` `robot_other_softemc_req` z `{ "status": true|false }`

### Seize/Release (CONFIG)
- `4005` z `{ "nick_name": "..." }`
- `4006` bez payloadu

### goTarget (TASK)
- `3051` `robot_task_gotarget_req` z `{ "id": "LM1" }`

## 6.1 Zasady bezpieczeństwa i tryby (MUST)

- Gdy `soft_emc=ON`, aplikacja MUST:
  - natychmiast wysłać `stop` + `forkstop`,
  - nie wysyłać nowych komend ruchu (`2010`), `goTarget` ani `forkHeight` do czasu `soft_emc=OFF`.
- Po `soft_emc=OFF` aplikacja MUST:
  - wznowić wysyłanie `motion` tylko, jeśli użytkownik ponownie wciśnie klawisze ruchu.
- W trybie prompt `S` (wprowadzanie celu) aplikacja MUST:
  - zablokować obsługę innych klawiszy sterujących (poza `Esc`, `Enter`, `Backspace`),
  - wyzerować bieżące komendy ruchu i wysłać `motion 0/0`.

## 6.2 Granice i klamrowanie (MUST)

- `speed` i `omega` MUST nie spaść poniżej zera.
- Krok zmian: `speed` = `0.1 m/s`, `omega` = `5 deg/s`, `fork` = `0.1 m`.
- Wysokość wideł MUST być ograniczona do sensownego zakresu robota (w MVP: `>= 0`).

## 6.3 Obsługa odpowiedzi i błędów (SHOULD)

- Po `goTarget` aplikacja SHOULD wyświetlić w UI ostatni wysłany cel oraz kod `ret_code` (lub błąd połączenia).
- W przypadku braku połączenia na porcie docelowym aplikacja SHOULD pokazać czytelny komunikat w UI.
- Timeouty TCP i reconnect SHOULD nie blokować UI.

## 6.4 Wyjście z aplikacji (MUST)

- Na `Ctrl+C` aplikacja MUST wysłać `stop` + `forkstop` i wyłączyć tryb raw w terminalu.
- Po wyjściu `soft_emc` nie jest automatycznie zwalniane.

## 6.5 Lock i kontrola (SHOULD)

- Aplikacja SHOULD działać bez `seize`, ale jeśli robot odrzuci komendy z powodu locka, UI SHOULD to pokazać (np. przez komunikat z `ret_code`).

## 6.6 Polityka retry/reconnect (MUST/SHOULD)

- Każdy port (`STATE`, `TASK`, `CTRL`, `OTHER`, `CONFIG`) jest łączony niezależnie.
- Po rozłączeniu aplikacja MUST próbować reconnectu co `~1s`.
- Reconnect SHOULD być nieblokujący dla UI i obsługi klawiatury.
- Brak połączenia na pojedynczym porcie SHOULD ograniczać tylko funkcje zależne od tego portu (np. brak `TASK` blokuje `goTarget`).

## 6.7 Bezpieczeństwo: soft_emc (MUST)

- `soft_emc=ON` ma absolutny priorytet nad wszystkimi innymi komendami.
- Podczas `soft_emc=ON` aplikacja MUST ignorować wszystkie próby ruchu i sterowania widłami.
- `soft_emc` nie jest automatycznie zwalniane przy wyjściu z aplikacji.

## 7. Statusy i polling

- Co `poll-ms` wysyłane jest `1100` `robot_status_all1_req`.
- Odpowiedź `11100` służy do aktualizacji:
  - pozycja (`x`, `y`, `yaw`),
  - prędkości (`vx`, `vy`, `w`),
  - `current_station`, `last_station`,
  - `soft_emc`,
  - `current_lock` (lock status),
  - `fork_height`.

## 8. UI w terminalu

Aplikacja czyści ekran i rysuje widok bez przewijania. Widok zawiera:
- host/porty i status połączeń,
- soft‑EMC + status kontroli,
- prędkości docelowe (liniowa i kątowa),
- prędkości aktualne,
- pozycję i orientację,
- current/last station,
- prompt `goTarget` lub ostatni wysłany cel,
- skrócony help klawiszy.

## 9. Logowanie klawiszy (opcjonalne)

Gdy `--key-log` jest ustawione, aplikacja zapisuje JSONL z każdym zdarzeniem klawiatury:
```json
{"tsMs":1234567890,"str":"","key":{"name":"left","sequence":"\u001b[D","ctrl":false,"meta":false,"shift":false}}
```
Plik zawiera też wpisy `start`/`stop`.

## 10. Obsługa błędów

- Połączenia TCP są automatycznie wznawiane po rozłączeniu.
- Brak połączenia na porcie blokuje tylko daną funkcję (np. brak `TASK` blokuje `goTarget`).
- UI pokazuje status połączeń per port.

## 11. Wymagania niefunkcjonalne

- ASCII-only output.
- Ma działać w standardowym TTY.
- Brak zależności zewnętrznych poza `robokit-lib`.

## 12. Testy manualne (MVP)

1) Połącz z `robokit-robot-sim` i sprawdź odczyt `current_station`.
2) Strzałki: ruch w miejscu + diagonale (up+left).
3) Soft‑EMC ON/OFF zmienia pole `soft_emc` w statusach.
4) `S` + `LM/AP` wysyła `goTarget`.
5) `A/Z` zmienia `fork_height`.
