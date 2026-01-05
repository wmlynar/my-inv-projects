# Protocol Notes (template)

Use this file to capture the evolving understanding of the Robokit TCP protocol.

## Handshake

- Connection initiator: client (Roboshop, task-manager) opens TCP to robot.
- First message direction: client sends a framed request.
- Required response: robot replies with apiNo + 10000 and same seq id.
- Timing constraints: not defined, use request timeout on client.

## Framing

- Length prefix: 4 bytes, big-endian, JSON body length.
- Header fields (order, size, meaning):
  - sync (1 byte, 0x5A)
  - version (1 byte, 0x01)
  - seq (2 bytes, big-endian)
  - body length (4 bytes, big-endian)
  - apiNo (2 bytes, big-endian)
  - reserved (6 bytes; some tools store JSON length in bytes 2-3)
- Payload format: JSON (UTF-8).

## Request/Response

- Request id field: `seq` in header.
- Response correlation rules: same `seq`, `apiNo = request apiNo + 10000`.
- Async push messages: not implemented in the simulator.

## Ports (observed)

- `19204` state/status (1000/1004/1007/1020/1100)
- `19205` control (2002)
- `19206` task (3051)
- `19210` other (6000+)
- `19301` push/notify (9300)

## Command list (observed)

- Command name:
- Direction:
- Parameters:
- Response:

## Errors and timeouts

- Error codes:
- Retry behavior:

## Raw examples

Add hex/base64 excerpts + decoded fields here.
