---
id: project-overview
title: Project Overview
area: project
status: draft
source: README.md
version: 0.1
last_verified: 2026-01-03
related: [project-architecture, project-status, glossary]
---

# Project Overview

## Summary
Brief description of the RDS stack, robots, simulation, and fleet management. (TODO: derive from README.md)

## Scope
- Fleet manager UI and backend
- Robot simulation (local)
- Robokit proxy and integration
- Seer tooling and SMAP assets
- Scraped vendor documentation

## Components (observed in repo)
- `fleet-manager/`
- `robokit-sim/`
- `robokit-proxy/`
- `seer/`
- `scraped/`
- `sanden-spec/`
- `rds/`
- `shared/`
- `task-manager/`

## Open Questions
- What is the primary production deployment flow?
- Which modules are authoritative for robot control?

## Sources
- `README.md`
- `docs/` (project notes)
