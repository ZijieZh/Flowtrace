---
name: known_traits
description: Replay the framework against positions the subject has stated publicly; direction-match each. These are the established, on-record traits.
reads:
  - synthesize/framework.json
writes:
  - known_traits.json
---

# Sanity Check — Known Positions

Source skill: **huashu-nuwa** (Phase 4 质量验证 — 4.1 已知测试 / Sanity Check), run independently of
the synthesis step to avoid self-grading bias (the skill spawns a separate agent for validation).

**One of two validation lanes that split off `synthesize` in PARALLEL.** This lane covers what is
**on the record**; its sibling `novel_inferences` covers what is **newly derived**. The split is the
skill's own distinction between established positions (testable against reality) and inferences (which
must hedge).

## What this step does

Pick questions the subject **has publicly answered**, run the framework's mental models forward to a
predicted stance, then **direction-match** against the subject's actual known position:

- direction **matches** → the model is load-bearing, keep its weight
- direction **deviates** → trace back and adjust the model's weight in `synthesize`

The skill's bar: the prediction should land in the *direction* of the real stance. It also flags where
the framework is more *absolute* than the subject actually was (the validation note that says "real
position allowed a middle path the model skipped").

## Output: `known_traits.json`

Per probe: `question`, `framework_prediction` (which models fired), `known_position` (the on-record
stance), `verdict` (`match | partial | deviate`), and any `weight_adjustment` fed back to synthesis.
These are the **established traits** the persona can assert with confidence.

## Contributes to

`persona_skill` — the confident, on-record core of the persona (asserted, not hedged).
