---
name: ingest_legal
description: Structure the legal data room — cap table, contracts, IP assignment, data/privacy, certifications.
reads:
  - intake/deal_brief.json
writes:
  - legal_pack.json
---

# Ingest — Legal & Compliance

Source skill: **general-counsel-advisor** (contract review checklist, IP strategy, the
regulatory-trigger table — HIPAA / GDPR / FDA / fintech / EU AI Act) — used here in *read* mode
to inventory the legal surface before the GC lens and the compliance gate judge it.

One of four parallel ingest lanes, and the one the **compliance gate** depends on. Structure
the legal data room along the GC's six axes: the **cap table** (entity, preferences,
anti-dilution, key-person/bus-factor), the **IP** (invention assignment for employees and
contractors, OSS/copyleft exposure, trademarks, patents), the **material contracts** (liability
caps and any uncapped indemnities, change-of-control consents, auto-renewal traps), the
**data/privacy** (what personal data is processed, subprocessor DPA status, data residency, any
AI processing of personal data), the **certifications** (SOC 2, ISO 27001, GDPR program
maturity), and the **regulatory triggers** the profile implies. Inventory what exists and flag
what is missing — do not adjudicate; the GC lens and the gate do that. Where the assessment
needs material that only a populated data room can provide, say so rather than assume. Write
`legal_pack.json`.
