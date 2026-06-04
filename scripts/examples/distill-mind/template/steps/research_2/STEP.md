---
name: research_2
description: Mine the subject's long conversations — interviews, podcasts, AMAs — for how they answer when pushed, improvised analogies, and position shifts.
reads:
  - intake/persona_brief.json
writes:
  - 02-conversations.json
---

# Research — Conversations

Source skill: **huashu-nuwa** (Phase 1 多源信息采集 — Agent 2 「对话」, output `02-conversations.md`).

**One of six research lanes that run in PARALLEL** (independent Agent swarm; the lanes do not read
each other). Read only `persona_brief.json`.

Long, unscripted talk reveals the *improvised* thinking the writings polish away. Mine interviews,
podcasts, and AMAs for:

- how the subject **answers when pushed** — the move they make under follow-up pressure
- **improvised analogies** reached for in real time (a tell for the underlying model)
- the **moments they changed position** (the skill: 变化 > 固定 — a shift carries more signal than
  a long-held view)
- the **questions they refuse** to answer (a boundary is itself data)

## How to approach it (the skill's hard requirements for every lane)

- Note source and credibility; first-hand (the actual exchange) over second-hand summary.
- Separate "what they said" / "what others said of them" / "what you inferred".
- Keep contradictions; do not smooth them.

Write `02-conversations.json`. A *read*, not a judgment.

## Contributes to

`triple_verify` (fan-in) and, through it, `synthesize`.
