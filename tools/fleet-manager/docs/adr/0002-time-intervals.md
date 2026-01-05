# ADR 0002: Time Interval Semantics

## Context
Time semantics were inconsistent across modules.

## Decision
Standardize on `TimeMs` integers and `[start, end)` intervals.

## Consequences
- Easier overlap checks and deterministic scheduling.
- Adapters must conform to TimeMs.
