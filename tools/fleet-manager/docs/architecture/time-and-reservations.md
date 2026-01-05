# Time and Reservations

## Time Semantics
- `TimeMs` is integer milliseconds.
- Intervals are `[start, end)`.
- `end` is exclusive, so adjacent intervals do not overlap.

## Reservations
- `ReservationTable` stores intervals per resource.
- `ReservationTransaction` provides `reserve`, `commit`, and `rollback`.
- Conflicts are detected via interval overlap.

## Safety, Dwell, Turn Time
- Applied in one place: `core-scheduler`.
- `safetyMs` extends schedule intervals.
- `dwellMs` inserts node dwell between segments.
- `turnTimeMs` is added before each segment (or per segment override).

## Schedule Repair
- Retiming shifts conflicting slots forward.
- Slot finding continues until conflicts clear or max attempts reached.
- Repair does not abort on first conflict.
