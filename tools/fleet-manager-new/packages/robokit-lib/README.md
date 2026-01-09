# robokit-lib

Shared utilities for framing/parsing RoboCore/Robokit traffic.

Exports:
- `rbk.js`: framing constants, encoder, parser, API numbers.
- other helpers (map loader, motion kernel, clients) copied from the legacy `shared/` folder.

Use this module from proxy, gateway, controller, and tests instead of duplicating the parser logic.
