---
name: review_quality
description: Stage-2 review — code quality, naming, coupling — only after spec review is green.
reads:
  - implement_tdd/fix_summary.md
  - implement_tdd/tdd_evidence.json
writes:
  - quality_review.json
---

# Quality Review (stage 2 of 2)

Source skill: **subagent-driven-development** (two-stage review — code-quality reviewer;
`./code-quality-reviewer-prompt.md`) + **requesting-code-review** (severity buckets:
*"Fix Critical immediately; Important before proceeding; note Minor for later"*).

**Stage 2.** Assumes spec compliance is (or will be) satisfied; this pass judges *how well it's
built*, not *whether it matches spec*. Graded by severity, the way `requesting-code-review`
defines it.

## What this step does

A fresh code-quality reviewer subagent evaluates the diff for: correctness under the failure
conditions, clear naming, coupling, dead code, and test quality (real behavior vs. mock-testing,
per TDD's anti-patterns). Each finding is tagged **Critical / Important / Minor**.

## Output: `quality_review.json`

```json
{ "stage": "code-quality",
  "strengths": ["..."],
  "findings": [ { "severity": "Important", "issue": "...", "fix": "..." } ],
  "assessment": "approve-after-fixes|approved" }
```

This run flags one **Important** issue with a real bite (see fixture) — quality review earns its
keep.

## Contributes to (fan-in)

- `code_review` — adjudicated together with the spec review.
