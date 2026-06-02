---
name: business_quality
description: Moat, margins, growth durability, competitive position.
reads:
  - ingest_fundamentals/fundamentals.json
writes:
  - business_quality.json
---

# Business Quality

Source skill: **us-stock-analysis** (references/fundamental-analysis.md — business-quality assessment).

Judge the durable stuff: competitive moat, margin structure and trend, growth
sustainability and its drivers, management and industry position. Write
`business_quality.json` with a moat rating, the margin / growth read, and the top
strengths and red flags.
