---
name: investment_report
description: Full Buy/Hold/Sell report per the us-stock-analysis report template.
reads:
  - valuation/valuation.json
  - business_quality/business_quality.json
  - technical_read/technical.json
  - industry_health/industry.json
  - catalysts_risks/catalysts_risks.json
  - synthesize_thesis/thesis.json
  - position_sizing/position.json
  - risk_controls/risk_controls.json
writes:
  - report.md
---

# Investment Report

Source skill: **us-stock-analysis** (references/report-template.md), written in the
house style of a **sell-side equity-research note** (Goldman / Morgan Stanley / JPMorgan).

**Open with a research masthead, not a casual summary line:**

- Company name + `EXCHANGE: TICKER` + sector + report date.
- A **rating block** (compact table): Rating (Buy / Hold / Sell), 12-month Price Target,
  Current Price, Implied Upside/Downside, Market Cap, 52-week range.
  **Do NOT put the reader's account size in the masthead** — account size is a position-
  sizing assumption, never a headline fact.
- A **House view** block: a bold one-line rating/target summary, then 3 bullet points
  (the thesis as bullets, not a prose sentence). These bullets become the cover summary.

Then the body per the report template: **Investment Thesis** (bull / bear), **Valuation**,
**Technical Analysis** (with the price / RSI / MACD / drawdown charts), **Macro & Industry**,
**Risk Assessment**, **Catalysts & Timeline**, and a **Recommendation** that reads as prose
plus tables — **never a loose bullet list of the rating**. Keep position sizing in its own
*Illustrative Sizing* block and state the account assumption (e.g. "on a \$100k book") only
there. The closing **Conclusion** is a tight prose paragraph, not bullets.

**Attribution by citation, not by prose.** Do not drop source names into the body text.
Instead place inline numeric citations `[n]` where a method or data source is used, and end
the report with a numbered `## References` section listing the methodology sources and the
market-data source. Close with a one-line disclaimer.

Tables for metrics; bold the key numbers; balance bull and bear; cite data dates. Write `report.md`.
