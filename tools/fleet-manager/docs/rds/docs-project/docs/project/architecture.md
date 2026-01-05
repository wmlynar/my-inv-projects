---
id: project-architecture
title: Architecture Notes
area: project
status: draft
source: docs/ARCHITECTURE.md
version: 0.1
last_verified: 2026-01-03
related: [project-overview, project-status]
---

# Architecture Notes

## System Context
(TODO: summarize system context diagram or narrative)

## Runtime Components
- Fleet manager backend
- Fleet manager UI
- Robot simulators
- Robokit proxy
- External robot controllers (Robokit, Seer)

## Data Flows
- Robot telemetry updates
- Task dispatch and routing
- Map and scene management

## Interfaces
- HTTP APIs (REST)
- TCP protocols (Robokit)

## Gaps
- Confirm canonical component boundaries.
