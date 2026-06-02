---
name: entry_levels
description: Entry zone + ATR-based stop, reward:risk per level.
reads:
  - ingest_price/price_pack.json
  - technical_read/technical.json
writes:
  - entry_levels.json
---

# Entry & Stop Levels

Source skill: **us-stock-analysis** (references/technical-analysis.md — support/resistance, ATR for stop placement) + **position-sizer** (ATR-based stop distance, Step 1 prerequisite).

Off the technical read and the latest ATR, set: an entry zone (buy-stop above resistance
or pullback-to-support), an ATR-based stop (default 2.0× ATR below entry), and the
resulting per-share risk and reward:risk to the nearest target. Write `entry_levels.json`.
These feed sizing — get the stop distance right.
