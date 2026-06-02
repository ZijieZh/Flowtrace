#!/usr/bin/env Rscript
# dist_box.R — box + jittered points per feature x species
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

p <- ggplot(long, aes(species, value, fill = species)) +
  geom_boxplot(outlier.shape = NA, alpha = 0.6, width = 0.55) +
  geom_jitter(width = 0.16, alpha = 0.55, size = 0.9, colour = "grey25") +
  facet_wrap(~ feature, scales = "free_y", ncol = 4) +
  scale_fill_manual(values = trace_palette(3, "teal")) +
  labs(title = "Box + jitter per feature",
       x = NULL, y = NULL) +
  theme(legend.position = "none")

ggsave_default(working_path("dist_box.png"), p, w = 900, h = 420)
cat("wrote", working_path("dist_box.png"), "\n")
