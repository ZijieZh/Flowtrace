---
name: rerun_cleaned
description: Drop consensus outliers and re-run all three classifiers.
display_name: "Sensitivity - Rerun on Cleaned Data"
reads:
  - runs/<run>/cv_compare/
  - runs/<run>/outlier_consensus/
writes:
  - runs/<run>/rerun_cleaned/cv_compare_cleaned.csv
---

# Sensitivity - Rerun on Cleaned Data

_Drop union-of-three outlier rows and refit all three classifiers under identical CV._

## Contract

- **Reads** from:
  - `runs/<run>/cv_compare/` (outputs of `cv_compare`)
  - `runs/<run>/outlier_consensus/` (outputs of `outlier_consensus`)
- **Writes**:
  - `runs/<run>/rerun_cleaned/cv_compare_cleaned.csv`
