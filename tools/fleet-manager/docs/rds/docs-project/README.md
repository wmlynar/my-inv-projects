# Documentation Project (AI-friendly)

This folder is a standalone documentation project designed for AI analysis and incremental updates.
It separates curated docs from raw sources and provides stable paths, metadata, and a catalog index.

## Goals
- Keep canonical docs in small, focused Markdown files.
- Track source provenance and verification status.
- Provide a searchable catalog for AI and humans.
- Store raw/scraped inputs separately from curated content.

## Structure
- docs/            Curated documentation (source of truth)
- sources/         Raw inputs (scraped PDFs, vendor docs, legacy notes)
- schemas/         Machine-readable specs (OpenAPI, JSON Schema)
- examples/        Request/response examples and datasets
- templates/       Authoring templates with front matter
- catalog.yaml     Catalog index for AI and automation
- mkdocs.yml       Optional site config (static build)

## Document conventions
Each doc in docs/ starts with YAML front matter:

---
id: unique-id
title: Short Title
area: project|robokit|seer|examples|scraping|policy
status: draft|verified
source: path/to/source
version: 0.1
last_verified: YYYY-MM-DD
related: [other-id]
---

Keep files small and single-topic. Use ASCII where possible.

## Update workflow
1) Add or update docs/ content using templates/.
2) Record source links in the doc front matter.
3) Update catalog.yaml with new entries.
4) Add examples and schemas as needed.
5) Mark status=verified only after cross-checking with sources.

## Source of truth
- docs/ and schemas/ are canonical.
- sources/ is for reference only.

## Split to a standalone repo
This folder can be extracted as a separate repo without code changes.
