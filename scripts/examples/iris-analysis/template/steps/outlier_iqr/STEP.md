---
name: outlier_iqr
description: Flag rows outside [Q1-1.5*IQR, Q3+1.5*IQR]. Univariate.
display_name: "Outliers - IQR Rule"
reads:
  - runs/<run>/data_quality/
writes:
  - runs/<run>/outlier_iqr/outlier_iqr.csv
  - runs/<run>/outlier_iqr/outlier_iqr_box.png
---

# Outliers - IQR Rule

_Flag rows with any feature outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR]._

## Contract

- **Reads** from:
  - `runs/<run>/data_quality/` (outputs of `data_quality`)
- **Writes**:
  - `runs/<run>/outlier_iqr/outlier_iqr.csv`
  - `runs/<run>/outlier_iqr/outlier_iqr_box.png`

## Implementation hint

Canonical visual produced by: `steps/outlier_iqr/scripts/outlier_iqr_box.R`

Run from the trace folder with:

```bash
TRACE_OUTPUT_DIR=runs/<run_id>/outlier_iqr \
TRACE_IRIS_CSV=data/iris.csv \
  Rscript steps/outlier_iqr/scripts/outlier_iqr_box.R
```
