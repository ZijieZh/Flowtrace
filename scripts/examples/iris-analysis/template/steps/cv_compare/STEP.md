---
name: cv_compare
description: Compare CV mean accuracy +/- SE across the three classifiers.
display_name: "Cross-Validation Comparison"
reads:
  - runs/<run>/classification_lda/
  - runs/<run>/classification_knn/
  - runs/<run>/classification_logistic/
writes:
  - runs/<run>/cv_compare/cv_compare.csv
  - runs/<run>/cv_compare/model_cv_compare.png
---

# Cross-Validation Comparison

_Compare CV mean accuracy +/- SE across the three classifiers; pick a leader._

## Contract

- **Reads** from:
  - `runs/<run>/classification_lda/` (outputs of `classification_lda`)
  - `runs/<run>/classification_knn/` (outputs of `classification_knn`)
  - `runs/<run>/classification_logistic/` (outputs of `classification_logistic`)
- **Writes**:
  - `runs/<run>/cv_compare/cv_compare.csv`
  - `runs/<run>/cv_compare/model_cv_compare.png`

## Implementation hint

Canonical visual produced by: `steps/cv_compare/scripts/model_cv_compare.R`

Run from the trace folder with:

```bash
TRACE_OUTPUT_DIR=runs/<run_id>/cv_compare \
TRACE_IRIS_CSV=data/iris.csv \
  Rscript steps/cv_compare/scripts/model_cv_compare.R
```
