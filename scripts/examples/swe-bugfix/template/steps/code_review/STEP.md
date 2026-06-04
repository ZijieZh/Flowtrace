---
name: code_review
description: Fan-in both review stages; evaluate each finding technically and act on it (no performative agreement).
reads:
  - review_spec/spec_review.json
  - review_quality/quality_review.json
writes:
  - code_review.json
---

# Code Review (adjudication)

Source skill: **receiving-code-review** (The Response Pattern: *READ → UNDERSTAND → VERIFY →
EVALUATE → RESPOND → IMPLEMENT*; *"Verify before implementing. … No performative agreement"*)
+ **requesting-code-review** (act on feedback by severity).

This is the **fan-in**: the two independent review stages converge here. Per `receiving-code-review`,
each finding is *evaluated against codebase reality*, then either implemented (one at a time) or
pushed back on with technical reasoning — not accepted reflexively.

## What this step does

For every finding from `spec_review.json` and `quality_review.json`:

1. **Verify** it against the actual diff / codebase.
2. **Evaluate** — sound for *this* codebase? (YAGNI check on any "add more" suggestion.)
3. **Decide** — `fix` (with the change made) or `pushback` (with technical reasoning).
4. Implement fixes in order: blocking → simple → complex; one at a time.

The fixture shows both: a sound finding is **fixed**, and at least one suggestion is met with
reasoned **pushback** (the proposed change would cost more than it buys, and the chosen design
already covers the case). No "You're absolutely right" — actions over words.

## Output: `code_review.json`

```json
{ "items": [ { "from": "spec|quality", "finding": "...", "decision": "fix|pushback",
               "resolution": "..." } ],
  "all_blocking_resolved": true }
```

## Contributes to (fan-out)

- `verify_completion` — fresh verification that the now-amended fix actually passes.
