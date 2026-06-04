---
name: hypothesize
description: Phase 3 — state ONE specific, falsifiable root-cause hypothesis grounded in the evidence.
reads:
  - pattern_analysis/pattern.json
writes:
  - hypothesis.json
---

# Form Hypothesis

Source skill: **systematic-debugging** (Phase 3, step 1 — "Form Single Hypothesis": *"State
clearly: 'I think X is the root cause because Y.' Write it down. Be specific, not vague."*).

Exactly **one** hypothesis. The skill is emphatic that multiple simultaneous theories (and
multiple simultaneous fixes) make it impossible to isolate what is true.

## What this step does

Convert the load-bearing difference from Phase 2 into a single sentence of the form
"I think X is the root cause because Y", grounded in the evidence already gathered, plus the
prediction that would confirm it **and** the observation that would falsify it. State it
specifically, not vaguely — and resist the urge to carry more than one theory forward.

## Output: `hypothesis.json`

`{ statement, because, prediction_if_true, would_falsify }` — note the explicit kill condition,
so the next step is a real test and not a confirmation-seeking exercise.

## Contributes to (fan-out)

- `test_hypothesis` — the smallest possible change that proves or kills it.
