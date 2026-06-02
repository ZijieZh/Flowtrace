#!/usr/bin/env Rscript
# lda_decision_boundary.R — 2-D LDA decision regions on PC1 x PC2
source("scripts/_theme.R")
suppressPackageStartupMessages({
  library(MASS); library(dplyr)
})

iris <- read_iris()
F <- iris[, c("sepal_length","sepal_width","petal_length","petal_width")]
X <- scale(F)
pc <- prcomp(X, center = FALSE, scale. = FALSE)
scores <- as.data.frame(pc$x[, 1:2])
scores$species <- factor(iris$species)

fit <- MASS::lda(species ~ PC1 + PC2, data = scores)

# decision-region grid
grid <- expand.grid(
  PC1 = seq(min(scores$PC1) - 0.4, max(scores$PC1) + 0.4, length.out = 220),
  PC2 = seq(min(scores$PC2) - 0.4, max(scores$PC2) + 0.4, length.out = 220)
)
grid$pred <- predict(fit, grid)$class

p <- ggplot() +
  geom_raster(data = grid, aes(PC1, PC2, fill = pred), alpha = 0.32) +
  geom_point(data = scores, aes(PC1, PC2, colour = species),
             size = 1.6, alpha = 0.9) +
  scale_fill_manual(values  = trace_palette(3, "teal"), guide = "none") +
  scale_colour_manual(values = trace_palette(3, "ocean")) +
  labs(title = "LDA decision boundary",
       subtitle = "PC1 vs PC2 — shaded regions = LDA prediction",
       x = "PC1", y = "PC2", colour = "species")

ggsave_default(working_path("lda_decision_boundary.png"), p, w = 800, h = 560)
cat("wrote", working_path("lda_decision_boundary.png"), "\n")
