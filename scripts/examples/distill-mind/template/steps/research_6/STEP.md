---
name: research_6
description: Build the subject's timeline from start to now — milestones, inflection points, and the most recent twelve months as an anti-staleness guard.
reads:
  - intake/persona_brief.json
writes:
  - 06-timeline.json
---

# Research — Timeline

Source skill: **huashu-nuwa** (Phase 1 多源信息采集 — Agent 6 「时间线」, output `06-timeline.md`).

**One of six research lanes that run in PARALLEL** (independent Agent swarm). Read only
`persona_brief.json`.

The other five lanes read *across* the corpus; this one reads it *along time*. Build the timeline from
the subject's start to now:

- **key milestones** — the events that mark the arc
- **inflection points** — where the thinking visibly turned (these align with the position-shifts that
  Agent 2 surfaces)
- the **most recent twelve months** — the skill calls this out specifically as an **anti-staleness**
  guard, so the persona is not frozen at an old version of the subject

## How to approach it

- A timeline entry earns its place by carrying *influence on the thinking*, not mere chronology — note,
  per milestone, what it changed about how the subject reasons.
- Note source and credibility; keep contradictions (disputed dates/sequence are flagged, not guessed).

Write `06-timeline.json`. A *read*, not a judgment — it dates the framework and feeds the persona's
"latest" section and honest-boundary cutoff.

## Contributes to

`triple_verify` (fan-in) and, through it, `synthesize` (the timeline + the honest-boundary cutoff date).
