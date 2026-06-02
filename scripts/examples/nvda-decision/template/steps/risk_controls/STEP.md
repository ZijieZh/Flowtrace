---
name: risk_controls
description: Stop plan, portfolio heat / exposure ceiling, monitoring triggers.
reads:
  - position_sizing/position.json
  - entry_levels/entry_levels.json
  - ingest_macro/macro.json
writes:
  - risk_controls.json
---

# Risk Controls & Monitoring

Source skill: **exposure-coach** (exposure ceiling, posture) + **position-sizer** key
principles (survival first, loss-cutting discipline).

Set the guardrails that make the position survivable: the hard stop and what invalidates
the thesis, the open-risk / portfolio-heat budget and exposure ceiling given the macro
posture, and the monitoring triggers (price, earnings, regime change) that would move the
call. Write `risk_controls.json`.
