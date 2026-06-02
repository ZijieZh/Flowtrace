#!/usr/bin/env Rscript
# pca_biplot.R — fviz_pca_biplot on standardised features
source("scripts/_theme.R")
suppressPackageStartupMessages({
  library(factoextra)
})

iris <- read_iris()
X <- scale(iris[, c("sepal_length","sepal_width","petal_length","petal_width")])
pc <- prcomp(X, center = FALSE, scale. = FALSE)

p <- fviz_pca_biplot(pc,
                     habillage = factor(iris$species),
                     palette   = trace_palette(3, "ocean"),
                     addEllipses = TRUE, ellipse.level = 0.95,
                     label = "var", repel = TRUE,
                     col.var = "grey25") +
  labs(title = "PCA biplot — standardised features",
       subtitle = "PC1 + PC2 capture ~95.8% of variance")

ggsave_default(working_path("pca_biplot.png"), p, w = 800, h = 600)
cat("wrote", working_path("pca_biplot.png"), "\n")
