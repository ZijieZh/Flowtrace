---
name: ic_memo
description: Compose the investment-committee memo — recommendation, price, both thesis sides, conditions to close, and the gate's verdict.
reads:
  - valuation/valuation.json
  - thesis_pro/thesis_pro.json
  - thesis_contra/thesis_contra.json
  - compliance_gate/compliance_gate.json
writes:
  - ic_memo.md
---

# IC Memo

Source skill: **cross-eval** (Output Format — vote tally, consensus vs divergent concerns,
the GO / PAUSE / STOP recommendation) + **ceo-advisor** (the decision-memo voice: Bottom Line →
What → Why → How to Act → Your Decision) + **compliance-readiness** (the binding conditions and
verdict that close the memo).

The deliverable, fanning in from **valuation, both thesis sides, and the compliance gate**. Write
the investment-committee memo: the **recommendation** (GO / GO WITH CONDITIONS / NO-GO) with the
**recommended offer and walk-away price** from the valuation, the **five lens votes** side by side
(note whether they converged — divergence is itself a finding), the case **for** and **against**,
the **valuation** reconciliation showing where the ask sits relative to the hurdle, the
**compliance gate** verdict and whether it makes the offer contingent, and the consolidated
**conditions to close**. End on the decision in one line. Write `ic_memo.md`.
