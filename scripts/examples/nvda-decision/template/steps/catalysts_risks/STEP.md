---
name: catalysts_risks
description: Dated near-term catalysts + risk flags with direction/timing.
reads:
  - ingest_news/news.json
writes:
  - catalysts_risks.json
---

# Catalysts & Risks

Source skill: **market-news-analyst** (interpretation).

Turn the raw news / calendar into decision-grade items: dated positive catalysts
(earnings, product, policy) and dated risk flags (lockups, regulation, guidance), each
with direction and expected timing. Write `catalysts_risks.json`.
