---
name: correlation_pca
description: Pearson + Spearman matrices + PCA on standardized features.
display_name: "Correlation + PCA"
reads:
  - runs/<run>/descriptive_stats/
writes:
  - runs/<run>/correlation_pca/corr_pearson.png
  - runs/<run>/correlation_pca/corr_spearman.png
  - runs/<run>/correlation_pca/pca_biplot.png
  - runs/<run>/correlation_pca/pca_screeplot.png
  - runs/<run>/correlation_pca/pca_loadings.csv
---

# Correlation + PCA

_Pearson + Spearman correlation matrices; PCA on standardised features; biplot + scree._

## Contract

- **Reads** from:
  - `runs/<run>/descriptive_stats/` (outputs of `descriptive_stats`)
- **Writes**:
  - `runs/<run>/correlation_pca/corr_pearson.png`
  - `runs/<run>/correlation_pca/corr_spearman.png`
  - `runs/<run>/correlation_pca/pca_biplot.png`
  - `runs/<run>/correlation_pca/pca_screeplot.png`
  - `runs/<run>/correlation_pca/pca_loadings.csv`

## Implementation hint

Canonical visual produced by: `steps/correlation_pca/scripts/{corr_pearson,corr_spearman,pca_biplot,pca_screeplot}.R`

Run from the trace folder with:

```bash
TRACE_OUTPUT_DIR=runs/<run_id>/correlation_pca \
TRACE_IRIS_CSV=data/iris.csv \
  Rscript steps/correlation_pca/scripts/corr_pearson.R
```
