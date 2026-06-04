---
name: verify_completion
description: Run the full suite fresh; confirm red→green and zero regressions BEFORE any completion claim.
reads:
  - code_review/code_review.json
  - implement_tdd/tdd_evidence.json
writes:
  - verification.json
---

# Verify Completion

Source skill: **verification-before-completion** (Iron Law: *"NO COMPLETION CLAIMS WITHOUT FRESH
VERIFICATION EVIDENCE"*; the Gate Function: IDENTIFY → RUN → READ → VERIFY → claim) + its
"Regression tests (TDD Red-Green)" pattern: *"Write → Run (pass) → Revert fix → Run (MUST FAIL)
→ Restore → Run (pass)"*.

Review changed the code (a fix was applied), so the earlier green is **stale**. The skill is
explicit: you may not claim success on a previous run's evidence. Re-verify, fresh, now.

## What this step does

1. **IDENTIFY** the commands that prove "fixed + no regressions": the full test suite + the
   red-green revert check on the regression test.
2. **RUN** them fresh, in full (not a subset).
3. **READ** the complete output: exit code, pass/fail counts.
4. **Red-green proof:** temporarily revert the source fix → the regression test **must fail**
   (proves the test actually catches the bug) → restore → it passes again.
5. **VERIFY** against the original requirements checklist (each constraint the report imposed on
   the fix) — line by line, evidence per item.

## Output: `verification.json`

The fresh command outputs, suite totals, the red-green revert evidence, and the requirements
checklist — each item checked with evidence, not assertion.

## Contributes to (fan-out)

- `finish_branch` — tests verifiably green → safe to integrate.
