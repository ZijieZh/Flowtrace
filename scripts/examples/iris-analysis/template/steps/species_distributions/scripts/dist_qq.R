#!/usr/bin/env Rscript
# dist_qq.R — Q-Q grid (4 features x 3 species = 12 panels)
source("scripts/_theme.R")
suppressPackageStartupMessages({
  library(dplyr); library(tidyr)
})

iris <- read_iris()
long <- pivot_longer(iris,
                     cols = c(sepal_length, sepal_width, petal_length, petal_width),
                     names_to = "feature", values_to = "value")
long$feature <- factor(long$feature,
                       levels = c("sepal_length","sepal_width","petal_length","petal_width"))

p <- ggplot(long, aes(sample = value, colour = species)) +
  stat_qq(size = 0.9, alpha = 0.85) +
  stat_qq_line(linewidth = 0.5, alpha = 0.7) +
  facet_grid(species ~ feature, scales = "free") +
  scale_colour_manual(values = trace_palette(3, "ocean")) +
  labs(title = "Q-Q grid — feature x species",
       subtitle = "Departures from the line indicate non-normality",
       x = "theoretical quantile", y = "sample quantile")

ggsave_default(working_path("dist_qq.png"), p, w = 900, h = 600)
cat("wrote", working_path("dist_qq.png"), "\n")
