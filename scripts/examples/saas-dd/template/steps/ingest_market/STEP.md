---
name: ingest_market
description: Structure the market read — TAM/segment, competitive position, pipeline, retention cohorts, ICP fit.
reads:
  - intake/deal_brief.json
writes:
  - market_gtm.json
---

# Ingest — Market & GTM

Source skill: **cro-advisor** (revenue waterfall, NRR/GRR, magic number, pipeline coverage,
discount discipline, ICP/segmentation) — used here in *read* mode to assemble the GTM picture
before the CRO lens judges it.

One of four parallel ingest lanes. Structure the market and go-to-market read: the **category
and segment** (TAM, segment served, competitive position), the **competitive read** (win-rate
level and trajectory, what caps the asset, moat durability), the **GTM motion** (pipeline
coverage vs target, quota attainment, ramp time, discount level and trend, source mix), the
**retention cohorts** (NRR vs GRR, expansion share, logo churn, at-risk ARR), and the **ICP fit
with the acquirer** (the cross-sell opportunity and what it is gated on). This is a *read*, not
a verdict — the CRO lens judges it. Write `market_gtm.json`.
