---
name: synergy_model
description: Roll the operating lenses (CFO/CRO/CTO) into base/bull/bear revenue + cost synergies, net of integration and dis-synergy.
reads:
  - lens_cfo/cfo_review.json
  - lens_cro/cro_review.json
  - lens_cto/cto_review.json
writes:
  - synergy_model.json
---

# Synergy & Integration Model

Source skill: **financial-analyst** (Phase 2-3 — driver-based forecasting with base/bull/bear
scenario modeling) + **cfo-advisor** (scenario planning, "model the downside first") +
**business-investment-advisor** ("run the downside case at roughly half of projected revenue as
the primary decision input"; name the strategic reason for any negative-NPV bet).

A fan-in over the three **operating** lenses. Roll CFO discipline, CRO revenue, and CTO cost into
one model: **revenue synergy** (the cross-sell, credited only after its gating tech-debt ships
and underwritten on GRR not NRR per the CRO), **cost synergy**, the **integration cost** (using
the CTO's re-baselined figure if the model under-prices it), and **dis-synergy** (logo churn,
concentration, discount creep). Output base/bull/**bear** synergy NPV at the model discount rate;
carry the bear case as the primary input, however thin it comes out. This is the cash-flow input
to valuation. Write `synergy_model.json`.
