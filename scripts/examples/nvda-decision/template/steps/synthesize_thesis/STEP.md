---
name: synthesize_thesis
description: Fan-in → bull/bear cases, assumptions, risk/reward, rating.
reads:
  - valuation/valuation.json
  - business_quality/business_quality.json
  - technical_read/technical.json
  - industry_health/industry.json
  - catalysts_risks/catalysts_risks.json
writes:
  - thesis.json
---

# Synthesize Thesis

Source skill: **us-stock-analysis** (Comprehensive Report step 5 — synthesize) +
**scenario-analyzer** (bull / base / bear framing).

This is the fan-in — the node that makes the trace more than its lanes. Integrate the
five reads into: a **bull case** and a **bear case** (3–5 evidence-backed points each),
the key assumptions the call rests on, a risk / reward read, and a **Buy / Hold / Sell**
rating with **conviction** (High / Medium / Low). Note where lanes disagree and how you
weighted them. Write `thesis.json`.
