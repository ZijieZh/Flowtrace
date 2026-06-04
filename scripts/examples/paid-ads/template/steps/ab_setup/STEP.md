---
name: ab_setup
description: Design the chosen test — variable, metrics, sample size, duration, allocation.
reads:
  - hypothesis/hypothesis.json
writes:
  - ab_setup.json
---

# A/B Setup

Source skill: **ab-testing** (Test One Thing; Metrics Selection — primary / secondary /
guardrail; Sample Size quick-reference table + duration; Traffic Allocation; the Pre-Launch
Checklist and the Peeking Problem).

Take the top-ranked hypothesis (and at most one more) and turn it into a runnable test design.
Apply the skill's rigor:

- **One variable.** State the single thing that changes between control and treatment.
- **Metrics, three tiers:** the primary metric tied to the hypothesis, secondary metrics for
  interpretation, and guardrail metrics that must not get worse (CPA / refund / unsubscribe).
- **Sample size + duration:** read off the skill's baseline×lift table from the current CVR/CTR
  and the smallest lift worth detecting (MDE); convert to a duration at current traffic. Be
  honest if the test needs > ~2–4 weeks.
- **Allocation:** 50/50 default, or a conservative split if the variant carries risk.
- **Pre-commit to the sample size** (the Peeking Problem) and write the pre-launch checklist.

Write `ab_setup.json`: variable, hypothesis restated, metric tiers, sample size, duration,
allocation, and the launch gate. If a second experiment is included, keep it isolated so the
two don't confound.
