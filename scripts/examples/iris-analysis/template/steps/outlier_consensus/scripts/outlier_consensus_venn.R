#!/usr/bin/env Rscript
# outlier_consensus_venn.R — three-method outlier Venn diagram
source("scripts/_theme.R")
suppressPackageStartupMessages({
  library(VennDiagram); library(grid)
})

iris <- read_iris()
F <- iris[, c("sepal_length","sepal_width","petal_length","petal_width")]

# IQR per feature
iqr_idx <- unique(unlist(lapply(F, function(x) {
  q <- quantile(x, c(0.25, 0.75))
  iqr <- diff(q)
  which(x < q[1] - 1.5*iqr | x > q[2] + 1.5*iqr)
})))

# Z-score |z|>3
z_idx <- unique(unlist(lapply(F, function(x) which(abs(scale(x)) > 3))))

# Mahalanobis chi^2 0.975
md2 <- mahalanobis(as.matrix(F), colMeans(F), cov(F))
mh_idx <- which(md2 > qchisq(0.975, df = ncol(F)))

png(working_path("outlier_consensus_venn.png"),
    width = 800, height = 500, res = 110)
grid.newpage()
v <- draw.triple.venn(
  area1 = length(iqr_idx), area2 = length(z_idx), area3 = length(mh_idx),
  n12 = length(intersect(iqr_idx, z_idx)),
  n13 = length(intersect(iqr_idx, mh_idx)),
  n23 = length(intersect(z_idx, mh_idx)),
  n123 = length(Reduce(intersect, list(iqr_idx, z_idx, mh_idx))),
  category = c("IQR rule", "|z| > 3", "Mahalanobis (chi^2_{.975})"),
  fill = trace_palette(3, "ocean"),
  alpha = 0.55, lty = "blank",
  cex = 1.2, cat.cex = 1.05, cat.col = "grey25"
)
dev.off()
cat("wrote", working_path("outlier_consensus_venn.png"), "\n")
