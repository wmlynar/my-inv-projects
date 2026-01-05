# ADR 0001: Modular Packages

## Context
Fleet-manager contained mixed responsibilities and large files.

## Decision
Split into layered packages under `packages/` with clear boundaries.

## Consequences
- Easier testing and refactoring.
- Explicit dependency rules enforced by structure.
