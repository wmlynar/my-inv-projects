# ADR 0004: Runner Pipeline

## Context
Planning, scheduling, and execution were intertwined.

## Decision
Create runner pipeline: snapshot -> intent -> schedule -> reservations -> dispatch.

## Consequences
- Cleaner separation of concerns.
- Contract tests apply uniformly across strategies.
