---
name: classification_logistic
description: Multinomial logistic regression with 10-fold CV. Baseline classifier.
display_name: "Multinomial Logistic"
reads:
  - runs/<run>/correlation_pca/
writes:
  - runs/<run>/classification_logistic/logistic_cv.csv
---

# Multinomial Logistic

_Multinomial logistic regression with 10-fold CV._

## Contract

- **Reads** from:
  - `runs/<run>/correlation_pca/` (outputs of `correlation_pca`)
- **Writes**:
  - `runs/<run>/classification_logistic/logistic_cv.csv`
