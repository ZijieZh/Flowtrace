#!/usr/bin/env Rscript
# Generate real iris-pipeline fixtures with ggplot2, themed to the
# morph-traces slate palette. Self-contained: synthesizes iris-shaped data,
# so no external CSV needed.
#
# Run:   Rscript fixtures/generate.R

suppressPackageStartupMessages({
  library(ggplot2)
  library(scales)
})

# Resolve the directory this script lives in, whether sourced or run.
script_path <- (function() {
  args <- commandArgs(trailingOnly = FALSE)
  ix <- grep("--file=", args, fixed = TRUE)
  if (length(ix) > 0) return(sub("--file=", "", args[ix[1]]))
  if (sys.nframe() > 0L) {
    f <- tryCatch(sys.frame(1)$ofile, error = function(e) NULL)
    if (!is.null(f)) return(f)
  }
  "fixtures/generate.R"
})()
here <- dirname(normalizePath(script_path, mustWork = FALSE))
if (!dir.exists(here)) here <- "fixtures"

# ─── Palette + theme ────────────────────────────────────────────────────────
INK       <- "#0f172a"  # slate-900
INK_SOFT  <- "#334155"  # slate-700
INK_MUTED <- "#94a3b8"  # slate-400
SURFACE   <- "#f1f5f9"  # slate-100
EDGE      <- "#cbd5e1"  # slate-300
DONE      <- "#047857"  # green-700
RUNNING   <- "#1d4ed8"  # blue-700
BLOCKED   <- "#b45309"  # amber-700
ERROR     <- "#b91c1c"  # red-700

species_colors <- c(setosa = INK, versicolor = INK_SOFT, virginica = INK_MUTED)

theme_slate <- function(base_size = 11) {
  theme_minimal(base_size = base_size, base_family = "sans") +
    theme(
      plot.title       = element_text(color = INK,       face = "bold", hjust = 0, size = base_size + 1),
      plot.subtitle    = element_text(color = INK_MUTED, hjust = 0, size = base_size - 1, margin = margin(b = 8)),
      plot.background  = element_rect(fill = "white", color = NA),
      panel.background = element_rect(fill = "white", color = NA),
      panel.grid.major = element_line(color = EDGE,  linewidth = 0.3, linetype = "dotted"),
      panel.grid.minor = element_blank(),
      axis.text        = element_text(color = INK_MUTED, size = base_size - 2),
      axis.title       = element_text(color = INK_SOFT,  size = base_size - 1),
      axis.line        = element_blank(),
      axis.ticks       = element_line(color = EDGE,      linewidth = 0.3),
      legend.title     = element_text(color = INK_SOFT,  size = base_size - 1),
      legend.text      = element_text(color = INK_SOFT,  size = base_size - 2),
      legend.background= element_blank(),
      legend.key       = element_blank(),
      strip.text       = element_text(color = INK_SOFT,  size = base_size - 1, face = "bold")
    )
}

save_plot <- function(p, name, w = 6, h = 4) {
  out <- file.path(here, name)
  ggsave(out, plot = p, width = w, height = h, dpi = 144, units = "in",
         device = "png", bg = "white")
  cat("  ", name, "\n", sep = "")
}


# ─── Synthetic iris-shaped data (n = 150, 3 species × 50) ─────────────────
set.seed(42)
species <- c("setosa", "versicolor", "virginica")
mu <- list(
  setosa     = c(5.0, 3.4, 1.5, 0.25),
  versicolor = c(5.9, 2.8, 4.3, 1.30),
  virginica  = c(6.6, 3.0, 5.5, 2.00)
)
sigma <- c(0.10, 0.12, 0.13)
gen_class <- function(m, s) matrix(rnorm(50 * 4, mean = rep(m, each = 50), sd = sqrt(s)),
                                   nrow = 50, ncol = 4, byrow = FALSE)
data_mat <- rbind(gen_class(mu$setosa, sigma[1]),
                  gen_class(mu$versicolor, sigma[2]),
                  gen_class(mu$virginica, sigma[3]))
colnames(data_mat) <- c("sepal_length", "sepal_width", "petal_length", "petal_width")
labels <- factor(rep(species, each = 50), levels = species)

iris_df <- data.frame(data_mat, species = labels)

# ─── Side-effect: emit non-plot artifacts ──────────────────────────────────
write.csv(iris_df, file.path(here, "iris.csv"), row.names = FALSE, quote = FALSE)
cat("  iris.csv\n")

writeLines(c(
  "# iris schema", "",
  "| column         | type    | notes                |",
  "|----------------|---------|----------------------|",
  "| sepal_length   | float64 | cm                   |",
  "| sepal_width    | float64 | cm                   |",
  "| petal_length   | float64 | cm                   |",
  "| petal_width    | float64 | cm                   |",
  "| species        | factor  | setosa/versic/virg.  |"
), file.path(here, "schema.md"))
cat("  schema.md\n")

writeLines(jsonlite_helper <- {
  q <- function(x) paste0('"', x, '"')
  paste0(
    "{\n",
    '  "rows": 150,\n',
    '  "cols": 5,\n',
    '  "missing": { "sepal_length": 0, "sepal_width": 0, "petal_length": 0, "petal_width": 0, "species": 0 },\n',
    '  "duplicates": 0,\n',
    '  "pass": true\n',
    "}"
  )
}, file.path(here, "quality_report.json"))
cat("  quality_report.json\n")

# Summary table (used by descriptive_stats step)
summary_rows <- do.call(rbind, lapply(colnames(data_mat), function(c) {
  col <- iris_df[[c]]
  data.frame(feature = c,
             mean = sprintf("%.2f", mean(col)),
             std  = sprintf("%.2f", sd(col)),
             min  = sprintf("%.2f", min(col)),
             max  = sprintf("%.2f", max(col)))
}))
write.csv(summary_rows, file.path(here, "summary_table.csv"), row.names = FALSE, quote = FALSE)
cat("  summary_table.csv\n")

# ─── PLOTS ─────────────────────────────────────────────────────────────────

# dist_kde.png — per-feature density by species (4 facets)
long_df <- data.frame(
  feature = factor(rep(c("sepal length", "sepal width", "petal length", "petal width"),
                       each = nrow(iris_df)),
                   levels = c("sepal length", "sepal width", "petal length", "petal width")),
  value   = c(iris_df$sepal_length, iris_df$sepal_width, iris_df$petal_length, iris_df$petal_width),
  species = rep(iris_df$species, 4)
)
p <- ggplot(long_df, aes(x = value, fill = species, color = species)) +
  geom_density(alpha = 0.22, linewidth = 0.6) +
  facet_wrap(~ feature, scales = "free", ncol = 2) +
  scale_fill_manual(values = species_colors) +
  scale_color_manual(values = species_colors) +
  labs(title = "per-feature distributions", x = NULL, y = "density") +
  theme_slate()
save_plot(p, "dist_kde.png", w = 7, h = 4.5)

# dist_box.png — boxplots
p <- ggplot(long_df, aes(x = feature, y = value, fill = species)) +
  geom_boxplot(outlier.color = ERROR, outlier.size = 1.2, color = INK_SOFT,
               alpha = 0.65, linewidth = 0.4, width = 0.6, position = position_dodge(0.7)) +
  scale_fill_manual(values = species_colors) +
  labs(title = "feature × species boxplots", x = NULL, y = "cm") +
  theme_slate()
save_plot(p, "dist_box.png", w = 7, h = 4)

# dist_qq.png — sepal length QQ plot
qq_df <- data.frame(s = sort(iris_df$sepal_length),
                    t = qnorm(ppoints(nrow(iris_df))))
p <- ggplot(qq_df, aes(t, s)) +
  geom_point(color = INK_SOFT, alpha = 0.6, size = 1.6) +
  geom_smooth(method = "lm", se = FALSE, color = ERROR, linewidth = 0.7, formula = y ~ x) +
  labs(title = "Q-Q plot · sepal length", x = "theoretical", y = "sample") +
  theme_slate()
save_plot(p, "dist_qq.png", w = 5, h = 4.5)

# assumption_table.csv
assump <- data.frame(
  test = c(rep("Shapiro-Wilk", 4), "Levene"),
  feature = c(colnames(data_mat), "all"),
  statistic = sprintf("%.3f", c(runif(4, 0.95, 0.99), runif(1, 1, 2.5))),
  p_value = sprintf("%.3f", c(runif(4, 0.04, 0.6), runif(1, 0.04, 0.3))),
  pass = "yes"
)
write.csv(assump, file.path(here, "assumption_table.csv"), row.names = FALSE, quote = FALSE)
cat("  assumption_table.csv\n")

# outlier_iqr.csv + outlier_iqr_box.png
outlier_rows <- data.frame(
  row = sample(1:150, 5),
  feature = sample(colnames(data_mat), 5, replace = TRUE),
  value = sprintf("%.2f", runif(5, 0.1, 6.5)),
  fence = sprintf("%.2f", runif(5, 1, 7))
)
write.csv(outlier_rows, file.path(here, "outlier_iqr.csv"), row.names = FALSE, quote = FALSE)
cat("  outlier_iqr.csv\n")

# Inject visible outliers for the boxplot
iris_out <- iris_df
iris_out$sepal_width[8]  <- iris_out$sepal_width[8]  + 1.8
iris_out$sepal_width[64] <- iris_out$sepal_width[64] - 1.3
long_out <- data.frame(
  feature = factor(rep(c("sepal length", "sepal width", "petal length", "petal width"),
                       each = nrow(iris_out)),
                   levels = c("sepal length", "sepal width", "petal length", "petal width")),
  value   = c(iris_out$sepal_length, iris_out$sepal_width, iris_out$petal_length, iris_out$petal_width)
)
p <- ggplot(long_out, aes(feature, value)) +
  geom_boxplot(fill = SURFACE, color = INK_SOFT, outlier.color = ERROR, outlier.size = 2.5,
               linewidth = 0.4, width = 0.55) +
  labs(title = "IQR outliers", x = NULL, y = "cm") +
  theme_slate()
save_plot(p, "outlier_iqr_box.png", w = 6, h = 4)

# outlier_mahalanobis.png
center <- colMeans(data_mat); covm <- cov(data_mat); inv <- solve(covm)
md <- apply(data_mat, 1, function(r) (r - center) %*% inv %*% (r - center))
thresh <- quantile(md, 0.97)
md_df <- data.frame(idx = seq_along(md), md = md, out = md > thresh)
p <- ggplot(md_df, aes(idx, md)) +
  geom_point(aes(color = out), size = 1.6, alpha = 0.7) +
  geom_hline(yintercept = thresh, color = ERROR, linetype = "dashed", linewidth = 0.6) +
  scale_color_manual(values = c(`FALSE` = INK_SOFT, `TRUE` = ERROR), guide = "none") +
  annotate("text", x = 5, y = thresh * 1.1,
           label = paste0("97th pctile = ", sprintf("%.2f", thresh)),
           color = ERROR, hjust = 0, size = 3.2) +
  labs(title = "mahalanobis outliers", x = "row index", y = "mahalanobis distance") +
  theme_slate()
save_plot(p, "outlier_mahalanobis.png", w = 6, h = 4)

# outlier_consensus.csv + Venn (drawn as overlapping circles via geom_polygon)
write.csv(data.frame(row = c(7, 87, 63, 17, 132),
                     methods_flagging = c(3, 3, 2, 2, 1)),
          file.path(here, "outlier_consensus.csv"), row.names = FALSE, quote = FALSE)
cat("  outlier_consensus.csv\n")
venn_circle <- function(cx, cy, r, label, color, n = 80) {
  ang <- seq(0, 2 * pi, length.out = n)
  data.frame(x = cx + r * cos(ang), y = cy + r * sin(ang),
             grp = label, color = color)
}
venn_df <- rbind(venn_circle(-0.55,  0.40, 0.6, "IQR",         INK),
                 venn_circle( 0.55,  0.40, 0.6, "z-score",     INK_SOFT),
                 venn_circle( 0.00, -0.40, 0.6, "mahalanobis", INK_MUTED))
p <- ggplot(venn_df, aes(x, y, group = grp, fill = grp)) +
  geom_polygon(alpha = 0.32, color = NA) +
  scale_fill_manual(values = c(IQR = INK, `z-score` = INK_SOFT, mahalanobis = INK_MUTED)) +
  annotate("text", x = -0.85, y = 0.95, label = "IQR",         color = INK,       fontface = "bold", size = 3.6) +
  annotate("text", x =  0.85, y = 0.95, label = "z-score",     color = INK_SOFT,  fontface = "bold", size = 3.6) +
  annotate("text", x =  0.00, y = -1.10, label = "mahalanobis", color = INK_MUTED, fontface = "bold", size = 3.6) +
  annotate("text", x = 0, y = 0.15, label = "2", color = "white", fontface = "bold", size = 8) +
  coord_fixed() + xlim(-1.4, 1.4) + ylim(-1.4, 1.4) +
  labs(title = "outlier consensus (Venn)") +
  theme_slate() + theme(axis.text = element_blank(), axis.title = element_blank(),
                        panel.grid = element_blank(), legend.position = "none")
save_plot(p, "outlier_consensus_venn.png", w = 5, h = 4)

# z_outliers.csv
write.csv(data.frame(row = sample(1:150, 4),
                     feature = sample(colnames(data_mat), 4, replace = TRUE),
                     z_score = sprintf("%.2f", runif(4, 3, 4.5))),
          file.path(here, "z_outliers.csv"), row.names = FALSE, quote = FALSE)
cat("  z_outliers.csv\n")

# effect_size_heatmap.png
pairs <- c("set vs ver", "set vs vir", "ver vs vir")
eff_long <- expand.grid(pair = pairs, feature = c("sepal length", "sepal width", "petal length", "petal width"))
eff_long$d <- runif(nrow(eff_long), 0.2, 3.0)
p <- ggplot(eff_long, aes(feature, pair, fill = d)) +
  geom_tile(color = "white", linewidth = 0.5) +
  geom_text(aes(label = sprintf("%.2f", d),
                color = ifelse(d > 1.5, "white", INK)), size = 3, show.legend = FALSE) +
  scale_fill_gradient(low = SURFACE, high = INK, name = "d") +
  scale_color_identity() +
  labs(title = "Cohen's d (effect size)", x = NULL, y = NULL) +
  theme_slate() + theme(panel.grid = element_blank())
save_plot(p, "effect_size_heatmap.png", w = 6, h = 3.5)

# tukey_hsd_forest.png
tukey_df <- data.frame(
  pair = factor(c("setosa vs versicolor", "setosa vs virginica", "versicolor vs virginica"),
                levels = c("setosa vs versicolor", "setosa vs virginica", "versicolor vs virginica")),
  diff = c(-2.8, -4.1, -1.3),
  lo = c(-3.0, -4.28, -1.52),
  hi = c(-2.6, -3.92, -1.08)
)
p <- ggplot(tukey_df, aes(diff, pair)) +
  geom_vline(xintercept = 0, color = ERROR, linetype = "dashed", linewidth = 0.5) +
  geom_errorbarh(aes(xmin = lo, xmax = hi), height = 0.18, color = INK, linewidth = 0.6) +
  geom_point(size = 2.6, color = INK) +
  labs(title = "Tukey HSD", subtitle = "pairwise mean differences with 95% CI", x = NULL, y = NULL) +
  theme_slate()
save_plot(p, "tukey_hsd_forest.png", w = 6, h = 3.5)

# pca_screeplot.png + pca_biplot.png
centered <- scale(data_mat, center = TRUE, scale = FALSE)
pca <- prcomp(centered)
expl <- pca$sdev^2 / sum(pca$sdev^2)
scree_df <- data.frame(component = factor(paste0("PC", 1:4), levels = paste0("PC", 1:4)),
                       variance = expl,
                       cumulative = cumsum(expl))
p <- ggplot(scree_df, aes(component, variance)) +
  geom_col(fill = INK_SOFT, color = INK, width = 0.55) +
  geom_line(aes(group = 1, y = cumulative), color = ERROR, linewidth = 0.6) +
  geom_point(aes(y = cumulative), color = ERROR, size = 2.4) +
  scale_y_continuous(limits = c(0, 1), labels = scales::percent_format(accuracy = 1)) +
  labs(title = "PCA scree", x = NULL, y = "explained variance") +
  theme_slate()
save_plot(p, "pca_screeplot.png", w = 5, h = 3.5)

pcs <- as.data.frame(pca$x)
pcs$species <- iris_df$species
p <- ggplot(pcs, aes(PC1, PC2, color = species)) +
  geom_point(size = 2.4, alpha = 0.75) +
  scale_color_manual(values = species_colors) +
  labs(title = "PCA biplot") +
  theme_slate()
save_plot(p, "pca_biplot.png", w = 6, h = 5)

# Correlation heatmaps
plot_corr <- function(method, name) {
  m <- cor(data_mat, method = method)
  long <- as.data.frame(as.table(m))
  colnames(long) <- c("a", "b", "rho")
  p <- ggplot(long, aes(a, b, fill = rho)) +
    geom_tile(color = "white", linewidth = 0.5) +
    geom_text(aes(label = sprintf("%.2f", rho),
                  color = ifelse(abs(rho) > 0.6, "white", INK)), size = 3, show.legend = FALSE) +
    scale_fill_gradient2(low = "#1d4ed8", mid = "#f1f5f9", high = "#b91c1c", midpoint = 0,
                         name = expression(rho), limits = c(-1, 1)) +
    scale_color_identity() +
    labs(title = method, x = NULL, y = NULL) +
    theme_slate() + theme(panel.grid = element_blank(),
                          axis.text.x = element_text(angle = 30, hjust = 1))
  save_plot(p, name, w = 4.5, h = 4)
}
plot_corr("pearson",  "corr_pearson.png")
plot_corr("spearman", "corr_spearman.png")

# LDA decision boundary (synthesized, on PC1/PC2)
xx <- seq(min(pcs$PC1) - 0.4, max(pcs$PC1) + 0.4, length.out = 200)
yy <- seq(min(pcs$PC2) - 0.4, max(pcs$PC2) + 0.4, length.out = 200)
grid <- expand.grid(PC1 = xx, PC2 = yy)
grid$region <- factor((grid$PC1 > -1) + (grid$PC2 > 0))
region_fill <- c(`0` = SURFACE, `1` = EDGE, `2` = "#e2e8f0")
p <- ggplot() +
  geom_tile(data = grid, aes(PC1, PC2, fill = region), alpha = 0.55) +
  geom_point(data = pcs, aes(PC1, PC2, color = species), size = 1.8, alpha = 0.75) +
  scale_fill_manual(values = region_fill, guide = "none") +
  scale_color_manual(values = species_colors) +
  labs(title = "LDA decision boundary", subtitle = "97.3% accuracy") +
  theme_slate()
save_plot(p, "lda_decision_boundary.png", w = 6, h = 4.5)

# model_cv_compare.png
cv_df <- data.frame(
  model = factor(c("logistic", "LDA", "KNN", "random forest"),
                 levels = c("logistic", "LDA", "KNN", "random forest")),
  acc = c(0.973, 0.967, 0.953, 0.967),
  err = c(0.012, 0.015, 0.020, 0.014)
)
p <- ggplot(cv_df, aes(acc, model)) +
  geom_errorbarh(aes(xmin = acc - err, xmax = acc + err), height = 0.2, color = INK_MUTED, linewidth = 0.4) +
  geom_col(fill = INK_SOFT, color = INK, width = 0.55, alpha = 0.85) +
  geom_text(aes(label = sprintf("%.3f", acc)), hjust = -0.3, color = INK, size = 3) +
  coord_cartesian(xlim = c(0.92, 1.0)) +
  labs(title = "model comparison", subtitle = "5-fold CV accuracy (mean ± std)",
       x = NULL, y = NULL) +
  theme_slate()
save_plot(p, "model_cv_compare.png", w = 6, h = 3.5)

# json result fixtures
writeLines('{
  "F": 119.26,
  "df_between": 2,
  "df_within": 147,
  "p_value": "<1e-32",
  "eta_squared": 0.62
}', file.path(here, "anova.json"))
writeLines('{
  "H": 96.9,
  "df": 2,
  "p_value": "<1e-22"
}', file.path(here, "kruskal.json"))
writeLines('{
  "k": 5,
  "accuracy": 0.967,
  "precision": 0.97,
  "recall": 0.967
}', file.path(here, "knn.json"))
writeLines('{
  "C": 1.0,
  "accuracy": 0.973,
  "auc_roc": 0.995
}', file.path(here, "logistic.json"))
cat("  *.json files\n")

writeLines(c(
  "# Iris classification — final report", "",
  "## Headline",
  "All three iris species are linearly separable on the 4-feature space; logistic",
  "regression and LDA tie at 97.3% 5-fold CV accuracy.", "",
  "## Key findings",
  "- petal length is the single most discriminative feature (η² = 0.81)",
  "- 5 consensus outliers are real measurements, not noise",
  "- ANOVA (F=119.3, p<1e-32) and Kruskal-Wallis (H=96.9) both reject H₀.", "",
  "## Method",
  "1. Quality check (no missing, no dups) → 2. assumption testing →",
  "3. outlier consensus → 4. ANOVA + Tukey HSD → 5. classify (3 methods, 5-fold CV)"
), file.path(here, "report.md"))
cat("  report.md\n")

write.csv(data.frame(
  model = c("logistic", "LDA", "KNN", "RF"),
  acc_full = c(0.973, 0.967, 0.953, 0.967),
  acc_cleaned = c(0.974, 0.969, 0.961, 0.973),
  delta = c("+0.1%", "+0.2%", "+0.8%", "+0.6%")
), file.path(here, "compare_table.csv"), row.names = FALSE, quote = FALSE)
cat("  compare_table.csv\n")

writeLines(c(
  "# Cleaned-data rerun", "",
  "Re-ran the full pipeline after dropping 5 consensus outliers. Effect on accuracy:",
  "+0.1% on average. **Conclusion**: outliers are real measurements, not noise; keep",
  "them in the published result."
), file.path(here, "rerun_summary.md"))
cat("  rerun_summary.md\n")

cat("\ndone — fixtures in ", here, "\n", sep = "")
