---
name: research_3
description: Mine the subject's short-form output for the expression fingerprint — sentence shape, signature vocabulary, taboo words, humor, certainty register.
reads:
  - intake/persona_brief.json
writes:
  - 03-expression-dna.json
---

# Research — Expression DNA

Source skill: **huashu-nuwa** (Phase 1 多源信息采集 — Agent 3 「表达」, output `03-expression-dna.md`),
quantified via **references/extraction-framework.md §二 表达DNA的量化方法** (sentence fingerprint,
style tags, taboo words & verbal tics).

**One of six research lanes that run in PARALLEL** (independent Agent swarm). Read only
`persona_brief.json`.

Short-form output is where *voice* lives. Sample the subject's posts/short talks and extract the
**expression fingerprint** the persona must later speak in:

- **sentence fingerprint** — mean sentence length, question ratio, analogy density per 1k words,
  first-person rate, certainty register ("clearly" vs "maybe"), turn-of-thought frequency
- **signature vocabulary** — high-frequency phrases and self-coined terms (use sparingly later — too
  much becomes a caricature, the skill's explicit warning)
- **taboo words** — words this subject never uses (so the persona never uses them either)
- **humor mode** — irony / self-deprecation / absurd / dry / none
- the most **contested** public stances (the skill: 争议 > 共识 — the controversy reveals what is
  distinctive)

## How to approach it

- Note source and credibility; separate first-hand text from second-hand description; keep contradictions.

Write `03-expression-dna.json`. A *read*, not a judgment.

## Contributes to

`triple_verify` (fan-in) and, through it, `synthesize` (it becomes the persona's voice rules).
