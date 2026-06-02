#!/usr/bin/env Rscript
# pca_screeplot.R — variance-explained screeplot
source("scripts/_theme.R")

iris <- read_iris()
X <- scale(iris[, c("sepal_length","sepal_width","petal_length","petal_width")])
pc <- prcomp(X, center = FALSE, scale. = FALSE)
ev <- pc$sdev^2
ratio <- ev / sum(ev)

df <- data.frame(
  pc    = factor(paste0("PC", seq_along(ratio)), levels = paste0("PC", seq_along(ratio))),
  ratio = ratio,
  cum   = cumsum(ratio)
)

p <- ggplot(df, aes(pc, ratio)) +
  geom_col(fill = trace_palette(4, "ocean")[2], width = 0.65) +
  geom_line(aes(group = 1, y = cum), colour = trace_palette(2, "teal")[1],
            linewidth = 0.8) +
  geom_point(aes(y = cum), colour = trace_palette(2, "teal")[1], size = 2.4) +
  scale_y_continuous(labels = scales::percent_format(accuracy = 1),
                     limits = c(0, 1.02), expand = c(0, 0)) +
  labs(title = "PCA screeplot — variance explained",
       subtitle = "bars = per-component ratio; line = cumulative",
       x = NULL, y = NULL)

ggsave_default(working_path("pca_screeplot.png"), p)
cat("wrote", working_path("pca_screeplot.png"), "\n")
