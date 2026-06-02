---
name: method_select
description: Choose parametric vs non-parametric based on assumption_check. Human-in-the-loop allowed.
display_name: "Select Hypothesis-Test Method"
reads:
  - runs/<run>/assumption_check/
writes:
  - runs/<run>/method_select/method_decision.json
---

# Select Hypothesis-Test Method

_Decide parametric vs non-parametric per feature based on the assumption checks; emit a decision diagram._

## Contract

- **Reads** from:
  - `runs/<run>/assumption_check/` (outputs of `assumption_check`)
- **Writes**:
  - `runs/<run>/method_select/method_decision.json`
