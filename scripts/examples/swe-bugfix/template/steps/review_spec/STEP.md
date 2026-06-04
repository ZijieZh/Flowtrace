---
name: review_spec
description: Stage-1 review — does the diff match the fix design? Nothing missing, nothing extra.
reads:
  - implement_tdd/fix_summary.md
  - implement_tdd/tdd_evidence.json
  - fix_design/fix_design.md
writes:
  - spec_review.json
---

# Spec Review (stage 1 of 2)

Source skill: **subagent-driven-development** (two-stage review — *"spec compliance review
first, then code quality review"*; `./spec-reviewer-prompt.md`). This is **stage 1**, and per the
skill's red flags you do **not** start quality review until spec compliance is green ("Start code
quality review before spec compliance is ✅ → wrong order").

## What this step does

A fresh spec-reviewer subagent compares the diff against `fix_design.md` only — *not* against
taste. Two questions:

- **Missing?** Is **every** designed element present — each defense-in-depth layer and the
  regression test the design called for?
- **Extra?** Anything built that the design did **not** call for (over-building / scope creep)?

Finds exactly the kind of thing the skill's example catches: a designed element omitted, or an
un-asked-for addition.

## Output: `spec_review.json`

```json
{ "stage": "spec-compliance",
  "missing": ["..."], "extra": ["..."],
  "verdict": "changes-requested|compliant" }
```

This run surfaces one real **missing** item (see fixture) — so the review is not a rubber stamp.

## Contributes to (fan-in)

- `code_review` — adjudicated together with the quality review.
