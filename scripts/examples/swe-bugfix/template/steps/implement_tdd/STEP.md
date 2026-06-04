---
name: implement_tdd
description: Implement the fix test-first — RED → GREEN → REFACTOR — dispatched as an implementer subagent.
reads:
  - fix_design/fix_design.md
writes:
  - fix_summary.md
  - tdd_evidence.json
---

# Implement (TDD)

Source skill: **test-driven-development** (Iron Law: *"NO PRODUCTION CODE WITHOUT A FAILING TEST
FIRST"*; the RED → GREEN → REFACTOR cycle; "Debugging Integration: Bug found? Write failing test
reproducing it") executed under **subagent-driven-development** (a fresh implementer subagent
"implements, tests, commits, self-reviews"; `./implementer-prompt.md`).

This is Phase 4 of systematic-debugging done the TDD way. The internal loop:

1. **RED — write the failing regression test first.** Encode the `fix_design.md` test contract as
   an automated test. Run it: it must **fail** — and fail for the *right reason* (the actual bug),
   not a typo.
2. **Verify RED.** Read the failure output and confirm it is the expected assertion failing.
3. **GREEN — minimal code.** Apply the source fix from `fix_design.md` and nothing more (YAGNI):
   the smallest change that turns the test green.
4. **Verify GREEN.** Re-run: the new test passes; the **whole** suite stays green; output pristine.
5. **REFACTOR.** Clean up names and structure, extract the new unit, add the structural-guard
   migration (Layer 3) — keeping every test green. No behavior change.

## Outputs

- **`fix_summary.md`** — what changed, the before/after of the hot path, the test, the migration.
- **`tdd_evidence.json`** — the machine-checkable red→green record (test id, RED output + fail
  count, GREEN output + pass count, full-suite totals). This is the evidence
  `verify_completion` will demand.

## Contributes to (fan-out)

- `review_spec` — stage-1 (does the diff match `fix_design.md`?).
- `review_quality` — stage-2 (code quality), gated behind spec review.
