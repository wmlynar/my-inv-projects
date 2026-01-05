# ADR 0003: Reservation Transactions

## Context
Scheduling required safe multi-step reservation updates.

## Decision
Use `ReservationTable` with transactions (commit/rollback).

## Consequences
- Safer planning pipeline.
- Clear rollback path on failure.
