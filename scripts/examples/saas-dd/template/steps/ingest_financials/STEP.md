---
name: ingest_financials
description: Pull the data room's financials into one validated pack — P&L, ARR bridge, unit economics, burn, cohorts.
reads:
  - intake/deal_brief.json
writes:
  - financials.json
---

# Ingest — Financials

Source skill: **financial-analyst** (Phase 1 Scoping + Phase 2 Data Analysis — validate input
completeness before computing the five ratio categories) + **saas-metrics-coach** (Step 1-2 —
collect MRR/ARR, churned/expansion, costs; compute ARR, NRR, CAC, LTV, payback) + **cfo-advisor**
(Rule of 40, burn multiple) + **cro-advisor** (GRR, magic number).

One of four parallel ingest lanes. Turn the financial data room into a single validated pack:
the **TTM P&L**, the **ARR bridge** (opening → new-logo + expansion − contraction − churn →
closing, with the implied YoY growth), the **unit economics** (NRR, GRR, LTV:CAC, CAC payback,
Rule of 40, burn multiple, magic number), the **cohort retention** trend, and the **customer
concentration** (top-3 and largest-account share of ARR). Flag the data-room gaps honestly.
This is a *read*, not a judgment — the CFO and CEO lenses judge it. Write `financials.json`.
