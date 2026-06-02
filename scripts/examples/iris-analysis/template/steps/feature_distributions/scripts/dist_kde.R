#!/usr/bin/env Rscript
# dist_kde.R — KDE per feature x species (4 facets, 3 colors)
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

p <- ggplot(long, aes(value, fill = species, colour = species)) +
  geom_density(alpha = 0.45, linewidth = 0.6) +
  facet_wrap(~ feature, scales = "free", ncol = 2) +
  scale_fill_manual(values  = trace_palette(3, "ocean")) +
  scale_colour_manual(values = trace_palette(3, "ocean")) +
  labs(title = "Feature distributions by species",
       subtitle = "Kernel density — bandwidth: nrd0 default",
       x = NULL, y = "density")

ggsave_default(working_path("dist_kde.png"), p)
cat("wrote", working_path("dist_kde.png"), "\n")
