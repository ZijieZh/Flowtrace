---
name: outlier_zscore
description: Flag rows with |z|>3 on any feature. Univariate.
display_name: "Outliers - Z-score"
reads:
  - runs/<run>/data_quality/
writes:
  - runs/<run>/outlier_zscore/outlier_zscore.csv
---

# Outliers - Z-score

_Flag rows where |z| > 3 on any feature (univariate, ignores species)._

## Contract

- **Reads** from:
  - `runs/<run>/data_quality/` (outputs of `data_quality`)
- **Writes**:
  - `runs/<run>/outlier_zscore/outlier_zscore.csv`
