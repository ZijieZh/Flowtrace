---
name: ingest_fundamentals
description: Pull financials snapshot, key metrics, and analyst ratings/targets.
reads:
  - resources/request.md
writes:
  - fundamentals.json
---

# Ingest Fundamentals

Source skill: **us-stock-analysis** (Data Sources #2–#4 — financial statements, key
metrics, analyst ratings & price targets).

Pull the fundamentals snapshot: sector/industry, market cap, P/E (trailing + forward),
PEG, P/B, EPS TTM, revenue & margin trend, beta, dividend yield, and the analyst
rating / price-target consensus. Gather only — valuation and quality judgments are
downstream nodes.
