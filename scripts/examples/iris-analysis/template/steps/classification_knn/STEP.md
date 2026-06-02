---
name: classification_knn
description: kNN (k=5) with 10-fold CV. Baseline classifier.
display_name: "kNN Baseline"
reads:
  - runs/<run>/correlation_pca/
writes:
  - runs/<run>/classification_knn/knn_cv.csv
---

# kNN Baseline

_k-Nearest-Neighbours (k=5) with 10-fold CV._

## Contract

- **Reads** from:
  - `runs/<run>/correlation_pca/` (outputs of `correlation_pca`)
- **Writes**:
  - `runs/<run>/classification_knn/knn_cv.csv`
