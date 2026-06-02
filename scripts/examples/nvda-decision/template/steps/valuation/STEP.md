---
name: valuation
description: Valuation ratios vs history/peers, fair-value range, target price.
reads:
  - ingest_fundamentals/fundamentals.json
writes:
  - valuation.json
---

# Valuation

Source skill: **us-stock-analysis** (Fundamental workflow step 5 + references/financial-metrics.md).

From the fundamentals: compute P/E (trailing / forward), PEG, P/B, EV/EBITDA; compare to
the name's own history and to peers; estimate a fair-value range (conservative →
optimistic) and a target price with timeframe. State the method and key assumptions.
Write `valuation.json` with the ratios, fair-value range, target, and margin of safety
vs current price. Valuation is judgment, not ratio lookup.
