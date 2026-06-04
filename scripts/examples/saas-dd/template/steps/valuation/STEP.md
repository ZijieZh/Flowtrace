---
name: valuation
description: Price the target three ways (DCF, comps, NPV/IRR on synergy cash flows) and reconcile to a recommended offer range — after the thesis.
reads:
  - thesis_pro/thesis_pro.json
  - thesis_contra/thesis_contra.json
  - ingest_financials/financials.json
  - synergy_model/synergy_model.json
writes:
  - valuation.json
---

# Valuation

Source skill: **financial-analyst** (DCF with WACC + terminal value; cross-check DCF outputs
against comparables; sensitivity analysis) + **business-investment-advisor** (NPV / IRR vs the
acquirer's hurdle, the downside case, walk-away discipline, earn-out to bridge a price shortfall) +
**cfo-advisor** (Rule of 40 → the Rule-of-40-adjusted ARR multiple).

Deliberately placed **after** the thesis — it reads both thesis sides plus the financials and the
synergy model — so the number reconciles to the argument instead of anchoring it. Price three
ways: **comps** (Rule-of-40-adjusted ARR multiple), **DCF** (FCF + WACC + terminal value,
cross-checked against the comps band), and **NPV/IRR on the synergy cash flows** swept by entry
price against the hurdle. Identify the entry multiple at which the deal first clears the hurdle,
and whether the ask sits above or below it. Reconcile to a **recommended offer and a walk-away
price**, with an earn-out to bridge any shortfall to the ask, and state whether the bear case
still loses at the offer (so the deal is sized for the downside). Write `valuation.json`.
