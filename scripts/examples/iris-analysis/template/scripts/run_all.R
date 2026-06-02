#!/usr/bin/env Rscript
# run_all.R — render every plot script for this trace.
# Usage (from inside the trace folder, e.g. ~/traces/iris-analysis/):
#   TRACE_OUTPUT_DIR=runs/<run_id>/working \
#   TRACE_IRIS_CSV=data/iris.csv \
#   Rscript scripts/run_all.R
#
# Plot scripts live inside their owning step's `scripts/` folder (step-local
# bundles). This driver walks them in DAG order. The trace-root `_theme.R`
# is sourced by each plot script directly (relative to CWD = trace root).
scripts <- c(
  "steps/feature_distributions/scripts/dist_kde.R",
  "steps/species_distributions/scripts/dist_qq.R",
  "steps/species_distributions/scripts/dist_box.R",
  "steps/correlation_pca/scripts/corr_pearson.R",
  "steps/correlation_pca/scripts/corr_spearman.R",
  "steps/correlation_pca/scripts/pca_biplot.R",
  "steps/correlation_pca/scripts/pca_screeplot.R",
  "steps/outlier_mahalanobis/scripts/outlier_mahalanobis.R",
  "steps/outlier_iqr/scripts/outlier_iqr_box.R",
  "steps/outlier_consensus/scripts/outlier_consensus_venn.R",
  "steps/method_compare/scripts/effect_size_heatmap.R",
  "steps/tukey_hsd/scripts/tukey_hsd_forest.R",
  "steps/classification_lda/scripts/lda_decision_boundary.R",
  "steps/cv_compare/scripts/model_cv_compare.R"
)
for (s in scripts) {
  cat("\n=== ", s, " ===\n", sep = "")
  source(s, echo = FALSE)
}
