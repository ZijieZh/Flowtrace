---
name: prepub_checklist
description: Run the final-review checklist — every claim sourced, citations formatted, transitions smooth, CTA present.
reads:
  - polish_citations/report.md
writes:
  - prepub_checklist/checklist.json
---

# Pre-Publish Checklist

Source skill: content-research-writer (Instructions step 8 — "Final Review and Polish",
the **Pre-Publish Checklist**: all claims sourced / citations formatted / examples clear /
transitions smooth / call to action present / proofread for typos — "Ready to publish!").

Depends on `polish_citations`. Run the skill's checklist against the finished `report.md`
as the final gate: each item passes or fails with a one-line note pointing at the evidence.
A failed item here is the signal to re-enter an upstream node, not to ship anyway.

## Output: `checklist.json`

```json
{
  "target_ref": "polish_citations/report.md",
  "checks": [
    { "item": "all_claims_sourced", "passed": true, "note": "..." },
    { "item": "citations_formatted", "passed": true, "note": "..." },
    { "item": "examples_clear", "passed": true, "note": "..." },
    { "item": "transitions_smooth", "passed": true, "note": "..." },
    { "item": "call_to_action_present", "passed": true, "note": "..." },
    { "item": "proofread_typos", "passed": true, "note": "..." }
  ],
  "ready_to_publish": true
}
```
