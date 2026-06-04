---
name: pattern_analysis
description: Phase 2 — find a working example, compare it to the broken path, list every difference.
reads:
  - gather_evidence/evidence.json
writes:
  - pattern.json
---

# Pattern Analysis

Source skill: **systematic-debugging** (Phase 2: Pattern Analysis — "Find Working Examples",
"Compare Against References", "Identify Differences": *"List every difference, however small.
Don't assume 'that can't matter'"*).

Phase 1 told us *where*. Phase 2 asks *why this path and not the one that works*. Find code in
the same codebase that handles the same class of problem correctly, and diff it against the
broken path.

## What this step does

- **Working example:** locate an analogous path in the same codebase that does **not** exhibit
  the bug under the same conditions, and read how it avoids it.
- **Reference:** check the relevant external contract / documented guidance for how the operation
  is *supposed* to behave.
- **Differences:** enumerate **every** gap between the working pattern and the broken one,
  however small ("don't assume 'that can't matter'"), then flag the one that most plausibly
  explains the failure.

## Output: `pattern.json`

`working_example`, `reference`, and a `differences[]` list with one flagged as the suspected
load-bearing difference.

## Contributes to (fan-out)

- `hypothesize` — turn the load-bearing difference into one testable hypothesis.
