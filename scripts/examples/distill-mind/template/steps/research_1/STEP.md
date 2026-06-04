---
name: research_1
description: Mine the subject's writings — books, long essays, papers — for repeated core claims, coined terms, and reading lists.
reads:
  - intake/persona_brief.json
writes:
  - 01-writings.json
---

# Research — Writings

Source skill: **huashu-nuwa** (Phase 1 多源信息采集 — Agent 1 「著作」, output `01-writings.md`).

**One of six research lanes that run in PARALLEL.** The skill spawns the six as an independent Agent
swarm; they deliberately do not read each other, and each writes its own `0X` file. Run serially they
would contaminate each other's read.

Read only `persona_brief.json`. Mine the subject's **long-form** record — books, essays/newsletters,
papers — for:

- the **core claims repeated ≥3 times** (the skill's bar for a *true belief*, vs a one-off remark)
- **self-coined terms / concepts** (a signature of an actual framework)
- the **reading list / influences** the writings reveal (intellectual lineage)

## How to approach it (the skill's hard requirements for every lane)

- Note **source and credibility** per item; rank first-hand (the subject's own writing) above second-hand.
- **Separate** "what they wrote" from "what others said about it" from "what you inferred".
- **Keep contradictions** — do not reconcile them here; the verify node decides.
- The skill's taste rule: **long-form > soundbites** — a 3000-word essay reveals structure a post cannot.

Write `01-writings.json`. This is a *read*, not a judgment — `triple_verify` and `synthesize` judge it.

## Contributes to

`triple_verify` (fan-in over all six lanes) and, through it, `synthesize`.
