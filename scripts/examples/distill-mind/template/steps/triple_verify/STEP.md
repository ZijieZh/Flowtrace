---
name: triple_verify
description: Cross-check the six research lanes; put every candidate claim through the triple test (cross-domain recurrence, generativity, exclusivity); keep contradictions.
reads:
  - research_1/01-writings.json
  - research_2/02-conversations.json
  - research_3/03-expression-dna.json
  - research_4/04-external-views.json
  - research_5/05-decisions.json
  - research_6/06-timeline.json
writes:
  - verification.json
---

# Triple-Verify Research

Source skill: **huashu-nuwa** (Phase 1.5 调研Review检查点 — the post-swarm quality gate) +
**references/extraction-framework.md §一 心智模型识别的三重验证** (the three tests) and **§三
矛盾处理原则** (keep contradictions).

This is the **fan-in**: it needs *all six* lanes and cannot start until every one is done. It is the
gate the skill puts between research and synthesis — "garbage in, garbage out; cheaper to stop it here
than to rework it in Phase 4."

## What this step does

1. **Roll up** the six lanes into one candidate list — every claim, coined term, and pattern the swarm
   surfaced (the skill expects ~15–30 candidates at this point).
2. **Triple-test each candidate** (the heart of the extraction framework). A candidate is a genuine
   **mental model** only if it passes all three:
   - **cross-domain recurrence** — appears in ≥2 different domains/topics the subject discusses
   - **generativity** — you can use it to predict the subject's stance on a *new* problem
   - **exclusivity** — not every smart person reasons this way; it is distinctive to this subject
   Pass 3/3 → mental-model candidate. Pass 1–2 → **downgrade** to a decision heuristic. Pass 0 → drop.
3. **Cross-check across lanes** — corroborate first-hand claims against the outside view (lane 4) and
   the revealed-behavior lane (lane 5); flag any claim that only one lane supports.
4. **Keep contradictions** — record them as *tensions* (temporal / domain / essential per §三), never
   reconcile them. Note any dimension that came back **information-poor**.

## Output: `verification.json`

Per candidate: `claim`, the three test verdicts, the resulting `tier`
(`mental_model | heuristic | dropped`), the `corroborating_lanes`, and a `note` on conflicts. Plus a
top-level `tensions[]` and `thin_dimensions[]`.

## Contributes to

`synthesize` — which builds the framework from the survivors and the recorded tensions.
