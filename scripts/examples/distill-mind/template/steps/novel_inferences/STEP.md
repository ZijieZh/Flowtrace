---
name: novel_inferences
description: Apply the framework to questions the subject never addressed; derive a hedged inference per model. These are newly-derived and must not be stated as fact.
reads:
  - synthesize/framework.json
writes:
  - novel_inferences.json
---

# Edge Case — Novel Inferences

Source skill: **huashu-nuwa** (Phase 4 质量验证 — 4.2 边缘测试 / Edge Case), run independently of the
synthesis step to avoid self-grading bias.

**One of two validation lanes that split off `synthesize` in PARALLEL.** This lane covers what is
**newly derived**; its sibling `known_traits` covers what is **on the record**. Keeping them apart is
the point: an inference must never be presented with the confidence of an on-record fact.

## What this step does

Pick questions the subject has **never publicly addressed** but that fall in range, and run the
framework forward to a *hedged* inference:

- the expected shape (the skill states it explicitly): **"based on models X and Y, likely … but
  uncertain"** — generativity *with a hedge*
- it must **not** be stated flatly — an edge-case answer that sounds certain is a failure mode, because
  the framework is being extrapolated past its evidence
- each inference names **which models** generated it and **what would falsify** it

This lane is also where the skill's generativity test pays off: if the models cannot produce a credible
hedged inference on a new question, they are decorative, and that is flagged back to `synthesize`.

## Output: `novel_inferences.json`

Per probe: `question`, `inference` (hedged), `models_used[]`, `confidence` (deliberately not high),
`would_falsify`, and a standing `disclaimer` that these are extrapolations, not the subject's stated
views. For this illustration the disclaimer also restates that the subject is fictional.

## Contributes to

`persona_skill` — the hedged-inference layer, kept visibly separate from the on-record core.
