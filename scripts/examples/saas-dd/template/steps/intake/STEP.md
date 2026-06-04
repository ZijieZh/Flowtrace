---
name: intake
description: Frame the deal — target, asking price, the IC question, and the diligence scope each lane must cover.
reads:
  - resources/request.md
writes:
  - deal_brief.json
---

# Deal Intake

Source skill: **ceo-advisor** (executive Go/No-Go decision framework, "what's the one
thing that kills us") + **business-investment-advisor** ("Before Starting" scoping — what is
the investment, total cost, alternative uses of the capital).

The root node. Read `request.md` and turn the banker's teaser into a structured **deal brief**:
the target, the **asking price and implied ARR multiple**, the headline metrics, the known
hairs, and — most important — the **diligence scope per lane** and the **decision rule**: five
lenses run in parallel (no cross-pollination), a two-sided thesis before valuation, and a
compliance gate that may veto. Capture the acquirer's constraints (hurdle IRR, max check)
verbatim, since the downstream valuation tests against them. Everything downstream reads from
this. Write `deal_brief.json`.
