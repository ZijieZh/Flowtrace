---
name: typeset_report
description: Render report.md + charts into a fixed-format research PDF (house style enforced in code).
reads:
  - investment_report/report.md
  - build_charts/price.png
  - build_charts/rsi.png
  - build_charts/macd.png
  - build_charts/drawdown.png
writes:
  - report.pdf
---

# Typeset PDF

The deliverable's **format is enforced in code** — `scripts/typeset.py` hard-codes the entire
house style (warm parchment, ink-blue accent, serif headlines, sans labels, table / figure
styling) and embeds the bundled fonts from `resources/fonts/`. This is the guarantee behind the
trace's goal: **anyone running this trace on any ticker gets an identically-formatted note** —
only the content changes.

Run the shipped script; it converts the markdown, base64-embeds the charts, applies the fixed
stylesheet, and renders the PDF (WeasyPrint if available, else headless Chrome):

```bash
python3 scripts/typeset.py \
  --report      runs/<RUN>/investment_report/report.md \
  --figures-dir runs/<RUN>/build_charts \
  --out         runs/<RUN>/typeset_report/report.pdf
```

Do not restyle the PDF by hand and do not change the CSS per-run — the format must stay
constant across runs. To change the house style, edit `scripts/typeset.py` once (it then
applies to every future run). The chart **content** is data-driven; the chart and page
**format** are code-driven.
