---
name: finish_branch
description: Tests pass — present integration options and open the PR with summary + test plan.
reads:
  - verify_completion/verification.json
writes:
  - branch_finish.json
---

# Finish Branch

Source skill: **finishing-a-development-branch** (Process: *Verify tests → Detect environment →
Present options → Execute choice → Clean up*; the standard 4-option menu; the PR body shape
"## Summary / ## Test Plan").

Verification is green, so this node integrates the work. Per the skill, the gate is **tests pass
first** (already satisfied by `verify_completion`), then present the structured options and
execute the chosen one — here, open a PR.

## What this step does

- **Verify tests** (carried from `verify_completion` — do not re-claim without it).
- **Present the 4 options** (merge locally / push + PR / keep as-is / discard).
- **Execute "push + PR":** push the branch, open the PR with a `## Summary` (root cause + fix +
   defense-in-depth) and a `## Test Plan` (the regression test + red-green proof).
   Worktree preserved for PR iteration (Options 2 and 3 never clean up).

## Output: `branch_finish.json`

The chosen option, the branch name, the PR title/body skeleton, and the test-plan checklist.

## Contributes to (fan-out)

- `writing_skills` — distill the reusable lesson now that the work is shipping.
