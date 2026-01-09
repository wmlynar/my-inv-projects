# robot-controller — Specyfikacja komponentu (v0.9)

## 1. Rola w systemie (MUST)
`robot-controller` jest celowo prostym narzędziem dev/test:
- weryfikuje, że rozumiemy RoboCore/Robokit,
- potrafi sterować robotem i `robokit-robot-sim` „tak jak Roboshop”,
- potrafi replayować sekwencje z `proxy-recorder` jako test integracyjny.

To jest komponent, który pozwala **odkleić ryzyko protokołu** od Core/Gateway.

## 2. Zakres i odpowiedzialności (normatywnie)
#### Dlaczego ten komponent istnieje
`robot-controller` jest celowo „płaski” i testowy: jego celem jest udowodnienie, że rozumiemy protokół RoboCore/Robokit i potrafimy sterować robotem identycznie jak Roboshop, a następnie przenieść tę wiedzę do Gateway.

#### Scope
- robot-controller łączy się bezpośrednio po TCP z robotem lub z robokit-robot-sim.
- robot-controller potrafi wysłać minimalny zestaw komend (goTarget, stop, forkHeight) i odbierać statusy.
- robot-controller potrafi wczytać capture z proxy-recorder i odtwarzać sekwencje (replay) jako test integracyjny.

#### Responsibilities
robot-controller MUST:
- współdzielić bibliotekę framing/parsing z gateway (albo używać tego samego modułu),
- umożliwiać uruchomienie scenariuszy „smoke”: połącz, wyślij goTarget, potwierdź status, podnieś widły, zatrzymaj,
- generować logi na dysk (polecenia + odebrane ramki + timestamp),
- umożliwiać replay z capture (deterministycznie, na ile pozwala protokół).

robot-controller MUST NOT:
- zawierać logiki domeny (tasks/streams/locks) — to jest narzędzie.

Related: `10_adapters-robokit.md` + `06_proxy-recorder.md` + testy z `99_pozostale.md`.

## 3. Minimalny zestaw funkcji (MVP-dev)
robot-controller MUST umieć co najmniej:
- połączyć się po TCP na porty `TASK` + `CTRL` + `OTHER` (+ opcjonalnie `STATE`),
- wysłać:
  - `goTarget` (API 3051) z `{"id": "<LM/AP>"}`,
  - `stop` (API 2000),
  - `forkHeight` (API 6040) z `{"height": <meters>}`,
- odebrać statusy i potwierdzić:
  - ACK (`apiNo+10000`) oraz „DONE” przez telemetrię (na ile możliwe),
- logować na dysk wszystkie wysłane/odebrane ramki z timestampami.

## 4. Interfejs uruchomieniowy (AI-friendly) (MUST)
- `robot-controller smoke --robot-id ... --host ... --task-port ... --ctrl-port ... --other-port ...`
- `robot-controller replay --capture <sessionDir> [--speed 1.0]`

Kontrakt: wspiera `--config <json5>` i `--print-effective-config`.

## 5. Współdzielenie kodu (MUST)
- robot-controller MUST współdzielić framing/parsing z `adapters-robokit` (biblioteka),
  albo używać dokładnie tej samej implementacji nagłówka i parsera.

## 6. Testy (MUST)
- Unit: encode/decode framingu + payloady.
- Integration: smoke przeciwko `robokit-robot-sim`.
- Golden: replay sesji z `proxy-recorder`.




## 7. Wejściowe API (CLI) — szczegółowy kontrakt (MUST)

`robot-controller` MUST mieć CLI zaprojektowane tak, żeby dało się nim sterować „promptem” (AI/Codex) bez domysłów.

### 7.1 `robot-controller smoke` (MUST)

Cel: minimalny, powtarzalny test „czy umiemy gadać z robotem”.

Przykład:
```bash
robot-controller smoke   --robot-id RB-01   --host 10.0.0.11   --ports '{"state":19204,"ctrl":19205,"task":19206,"other":19210,"push":19301}'   --target-node-id LM2   --fork-height-m 1.20   --log-dir ~/robokit_logs/2026-01-07_robot_RB-01_smoke/
```

**Zachowanie (MUST):**
1) Połącz na wymagane porty TCP (ctrl/task/other + opcjonalnie push/state).
2) Wyślij `goTarget` (target = `LocationMark|ActionPoint` ID).
3) Oczekuj protocol ACK (bounded timeout).
4) Obserwuj telemetrię aż do „arrived” lub do timeoutu (MVP: heurystyka).
5) Wyślij `forkHeight` (w metrach).
6) Wyślij `stop`.
7) Zakończ i wypisz raport.

Output (stdout, JSON):
```json5
{
  ok: true,
  robotId: "RB-01",
  steps: [
    { name: "connect", ok: true, tsMs: 1736160000000 },
    { name: "goTarget", ok: true, apiNo: 3051, ackApiNo: 13051 },
    { name: "forkHeight", ok: true, apiNo: 6040, ackApiNo: 16040 },
    { name: "stop", ok: true, apiNo: 2000, ackApiNo: 12000 },
  ],
  logs: { sessionDir: "~/robokit_logs/2026-01-07_robot_RB-01_smoke/" }
}
```

### 7.2 `robot-controller go-target` (MUST)
Wysyła pojedynczą komendę `goTarget`.

```bash
robot-controller go-target --robot-id RB-01 --host 10.0.0.11 --target-node-id AP22 ...
```

Response:
```json5
{ ok: true, apiNo: 3051, seq: 42, ackApiNo: 13051 }
```

### 7.3 `robot-controller fork-height` (MUST)
Wysyła `forkHeight` (metry).

```bash
robot-controller fork-height --robot-id RB-01 --host 10.0.0.11 --to-height-m 1.20 ...
```

### 7.4 `robot-controller replay` (MUST)
Replay sesji z `proxy-recorder` (dla testów integracyjnych):

```bash
robot-controller replay --capture-dir ~/robokit_logs/2026-01-07_robot_RB-01_gotarget_smoke/ --speed 1.0
```

**MUST:** replay odtwarza kolejność bajtów i czasy względne (w miarę możliwości), ale:
- nie gwarantuje identycznych odpowiedzi (robot/sim może odpowiadać inaczej),
- jego celem jest weryfikacja encoder/decoder i kompatybilności framingu.

---

## 8. Lokalne struktury danych (logi na dysk) (MUST)

`robot-controller` MUST zapisywać sesję na dysk (poza repo), np.:

```text
<logDir>/
  session.json               # parametry uruchomienia
  frames.jsonl               # zdekodowane ramki (jeśli dekoder działa)
  tcp/
    ctrl_c2s.bin
    ctrl_s2c.bin
    task_c2s.bin
    task_s2c.bin
    other_c2s.bin
    other_s2c.bin
  report.json                # wynik smoke/replay
```

`frames.jsonl` SHOULD zawierać:
```json5
{
  tsMs: 1736160000123,
  dir: "c2s",
  port: "ctrl",
  apiNo: 3051,
  seq: 42,
  payloadHex: "ab12...",
  payloadJson: { /* jeśli uda się zdekodować */ }
}
```

---

## 9. Pobieżny algorytm smoke/replay (jak to działa)

### 9.1 Smoke
```text
connect all ports
send goTarget(nodeId)
wait ack + observe status
send forkHeight(toHeight)
wait ack + observe status
send stop()
close
```

### 9.2 Replay
```text
read capture traffic.jsonl
for each entry:
  if dir == c2s: write bytes to upstream socket
  if dir == s2c: optionally validate decode
```

