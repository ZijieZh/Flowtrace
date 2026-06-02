---
name: ingest_price
description: Pull OHLCV, 52-week range, average volume, and the indicator stack for the ticker.
reads:
  - resources/request.md
writes:
  - price_pack.json
  - indicators.parquet
---

# Ingest Price & Volume

Source skill: **us-stock-analysis** (Data Sources #1 & #7 — current price/volume, technical data).

Pull daily OHLCV for `ticker` over `lookback`, then derive the standard indicator
stack (MA20 / MA50 / MA200, RSI14, MACD, Bollinger, ATR14) plus the 52-week range and
average volume. This is an *ingest* node: gather and structure, do not interpret — the
read happens in `technical_read`.

Run the shipped script:

```bash
python3 scripts/price_pack.py --ticker <TICKER> --lookback <LOOKBACK> --out-dir runs/<RUN>/ingest_price
```

It writes `price_pack.json` (last close, 52w high/low, avg volume, support/resistance, latest
indicator row) **and** `indicators.parquet` (the full series, consumed by `build_charts`).
yfinance is the reference source; any equivalent feed substitutes.
