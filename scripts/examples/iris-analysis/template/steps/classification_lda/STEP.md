---
name: classification_lda
description: LDA with 10-fold CV. Baseline classifier.
display_name: "LDA Baseline"
reads:
  - runs/<run>/correlation_pca/
writes:
  - runs/<run>/classification_lda/lda_cv.csv
  - runs/<run>/classification_lda/lda_decision_boundary.png
---

# LDA Baseline

_Fit Linear Discriminant Analysis with 10-fold CV; render the 2-D decision boundary._

## Contract

- **Reads** from:
  - `runs/<run>/correlation_pca/` (outputs of `correlation_pca`)
- **Writes**:
  - `runs/<run>/classification_lda/lda_cv.csv`
  - `runs/<run>/classification_lda/lda_decision_boundary.png`

## Implementation hint

Canonical visual produced by: `steps/classification_lda/scripts/lda_decision_boundary.R`

Run from the trace folder with:

```bash
TRACE_OUTPUT_DIR=runs/<run_id>/classification_lda \
TRACE_IRIS_CSV=data/iris.csv \
  Rscript steps/classification_lda/scripts/lda_decision_boundary.R
```
