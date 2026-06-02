---
name: ingest_news
description: Gather recent news, the earnings calendar, and developing storylines.
reads:
  - resources/request.md
writes:
  - news.json
---

# Ingest News & Calendar

Source skill: **market-news-analyst** (news gathering) + **earnings-calendar**.

Gather recent company-specific news, the next earnings date, and developing storylines
(product, regulatory, supply-chain, guidance). Capture headline + date + source. Do not
yet judge direction — that is `catalysts_risks`.
