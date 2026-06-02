#!/usr/bin/env Rscript
# corr_spearman.R — Spearman (rank) correlation heatmap
source("scripts/_theme.R")
suppressPackageStartupMessages({
  library(ggcorrplot)
})

iris <- read_iris()
M <- cor(iris[, c("sepal_length","sepal_width","petal_length","petal_width")],
         method = "spearman")

p <- ggcorrplot(M, type = "lower", lab = TRUE, lab_size = 4.2,
                colors = c(trace_palette(3, "bluegrey")[1], "white",
                           trace_palette(3, "teal")[1])) +
  labs(title = "Spearman correlation",
       subtitle = "rank-based monotonic association")

ggsave_default(working_path("corr_spearman.png"), p, w = 700, h = 600)
cat("wrote", working_path("corr_spearman.png"), "\n")
