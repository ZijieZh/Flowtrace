---
name: tukey_hsd
description: Pairwise Tukey HSD with adjusted CIs. After anova_oneway.
display_name: "Tukey HSD (parametric)"
reads:
  - runs/<run>/anova_oneway/
writes:
  - runs/<run>/tukey_hsd/tukey_table.csv
  - runs/<run>/tukey_hsd/tukey_hsd_forest.png
---

# Tukey HSD (parametric)

_Pairwise Tukey HSD with Bonferroni-adjusted CIs on the species means._

## Contract

- **Reads** from:
  - `runs/<run>/anova_oneway/` (outputs of `anova_oneway`)
- **Writes**:
  - `runs/<run>/tukey_hsd/tukey_table.csv`
  - `runs/<run>/tukey_hsd/tukey_hsd_forest.png`

## Implementation hint

Canonical visual produced by: `steps/tukey_hsd/scripts/tukey_hsd_forest.R`

Run from the trace folder with:

```bash
TRACE_OUTPUT_DIR=runs/<run_id>/tukey_hsd \
TRACE_IRIS_CSV=data/iris.csv \
  Rscript steps/tukey_hsd/scripts/tukey_hsd_forest.R
```
