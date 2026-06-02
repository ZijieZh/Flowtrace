---
name: outlier_mahalanobis
description: Joint multivariate outliers via Mahalanobis distance.
display_name: "Outliers - Mahalanobis"
reads:
  - inputs.outlier_chi2_quantile
  - runs/<run>/data_quality/
writes:
  - runs/<run>/outlier_mahalanobis/outlier_mahalanobis.csv
  - runs/<run>/outlier_mahalanobis/outlier_mahalanobis.png
---

# Outliers - Mahalanobis

_Compute Mahalanobis D^2 against the joint multivariate mean; flag rows above chi-square quantile._

## Contract

- **Reads** from:
  - `inputs.outlier_chi2_quantile`
  - `runs/<run>/data_quality/` (outputs of `data_quality`)
- **Writes**:
  - `runs/<run>/outlier_mahalanobis/outlier_mahalanobis.csv`
  - `runs/<run>/outlier_mahalanobis/outlier_mahalanobis.png`

## Implementation hint

Canonical visual produced by: `steps/outlier_mahalanobis/scripts/outlier_mahalanobis.R`

Run from the trace folder with:

```bash
TRACE_OUTPUT_DIR=runs/<run_id>/outlier_mahalanobis \
TRACE_IRIS_CSV=data/iris.csv \
  Rscript steps/outlier_mahalanobis/scripts/outlier_mahalanobis.R
```
