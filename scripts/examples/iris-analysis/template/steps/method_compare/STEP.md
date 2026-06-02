---
name: method_compare
description: Side-by-side ANOVA vs Kruskal-Wallis on the same feature.
display_name: "Compare Parametric vs Non-parametric"
reads:
  - runs/<run>/anova_oneway/
  - runs/<run>/kruskal_wallis/
writes:
  - runs/<run>/method_compare/method_compare.csv
  - runs/<run>/method_compare/effect_size_heatmap.png
---

# Compare Parametric vs Non-parametric

_Side-by-side ANOVA vs Kruskal-Wallis effect sizes (eta^2 vs epsilon^2) and p-values._

## Contract

- **Reads** from:
  - `runs/<run>/anova_oneway/` (outputs of `anova_oneway`)
  - `runs/<run>/kruskal_wallis/` (outputs of `kruskal_wallis`)
- **Writes**:
  - `runs/<run>/method_compare/method_compare.csv`
  - `runs/<run>/method_compare/effect_size_heatmap.png`

## Implementation hint

Canonical visual produced by: `steps/method_compare/scripts/effect_size_heatmap.R`

Run from the trace folder with:

```bash
TRACE_OUTPUT_DIR=runs/<run_id>/method_compare \
TRACE_IRIS_CSV=data/iris.csv \
  Rscript steps/method_compare/scripts/effect_size_heatmap.R
```
