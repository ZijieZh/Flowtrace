---
name: test_hypothesis
description: Phase 3 — test the hypothesis minimally (one variable) and trace the bad value to its source.
reads:
  - hypothesize/hypothesis.json
writes:
  - hypothesis_test.json
---

# Test Hypothesis

Source skill: **systematic-debugging** (Phase 3, step 2–3 — "Test Minimally" / "Verify Before
Continuing": *"Make the SMALLEST possible change to test hypothesis. One variable at a time."*)
plus **root-cause-tracing.md** ("Trace backward through the call chain until you find the
original trigger, then fix at the source").

## What this step does

Run **one** controlled experiment that can succeed only if the hypothesis is right, and nothing
else:

- **Probe (kills or confirms):** make the **smallest possible change** that toggles exactly the
  single variable under test, *in the test only*. If the symptom vanishes while everything else
  is held constant, the hypothesized factor is the cause; if it persists, the hypothesis is
  falsified and you loop back.
- **Backward trace:** from the point where the symptom appears, walk **up** the call chain to the
  original trigger — don't stop at the first place the bad state is observed. The endpoint of that
  trace is the source where the fix belongs.

One variable changed, prediction met, traced to the origin → proceed to Phase 4.

## Output: `hypothesis_test.json`

The experiment, the before/after failure counts, the backward-trace chain, and the verdict
(`confirmed` / `falsified`).

## Contributes to (fan-out)

- `root_cause` — record the confirmed source-level cause.
