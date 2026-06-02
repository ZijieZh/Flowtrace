---
name: technical_read
description: Trend, S/R, indicators, patterns → technical outlook.
reads:
  - ingest_price/price_pack.json
writes:
  - technical.json
---

# Technical Read

Source skill: **us-stock-analysis** (Technical workflow + references/technical-analysis.md).

Read the indicator pack into an outlook: trend direction & strength, MA posture (price vs
MA20 / 50 / 200), support / resistance levels, RSI / MACD / Bollinger interpretation, and
any chart pattern. Confirm signals across indicators; note divergences. Write
`technical.json` with trend, key levels, indicator reads, and a short / medium-term outlook.
