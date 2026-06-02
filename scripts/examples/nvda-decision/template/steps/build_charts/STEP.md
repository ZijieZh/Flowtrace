---
name: build_charts
description: Render the price/RSI/MACD/drawdown charts from the real indicator series.
reads:
  - ingest_price/indicators.parquet
  - ingest_price/price_pack.json
  - entry_levels/entry_levels.json
writes:
  - price.png
  - rsi.png
  - macd.png
  - drawdown.png
---

# Build Charts

Presentation infrastructure (not a lifted skill move) — the chart style is **fixed in code**
so every run produces the same chart format.

Run the shipped script; it reads the indicator series + the entry/stop levels and writes the
four charts (price + MA20/50/200 + Bollinger with entry-zone / stop / resistance lines; RSI;
MACD; underwater drawdown):

```bash
python3 scripts/make_charts.py \
  --indicators   runs/<RUN>/ingest_price/indicators.parquet \
  --price-pack   runs/<RUN>/ingest_price/price_pack.json \
  --entry-levels runs/<RUN>/entry_levels/entry_levels.json \
  --out-dir      runs/<RUN>/build_charts
```

Do not hand-edit the charts — the script is the single source of chart format.
