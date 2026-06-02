---
name: position_sizing
description: Fixed-fractional / ATR / half-Kelly → final share count.
reads:
  - synthesize_thesis/thesis.json
  - entry_levels/entry_levels.json
writes:
  - position.json
---

# Position Sizing

Source skill: **position-sizer**.

Only size if the thesis is not Sell. Using `account_size`, entry, and stop, compute three
sizes and reconcile to one:

- **Fixed-fractional** — risk 1% of equity ÷ per-share risk (the 1% rule).
- **ATR-based** — stop = entry − 2.0× ATR; size to the 1% risk budget.
- **Half-Kelly** — f = 0.5 × (W − (1−W)/R), scaled by conviction; never full Kelly.

Apply constraints (max position %, portfolio heat ≤ 6–8%), **round shares down**, and let
the strictest constraint win. Write `position.json` with each method, the final share
count, position value, and dollar / percent risk.
