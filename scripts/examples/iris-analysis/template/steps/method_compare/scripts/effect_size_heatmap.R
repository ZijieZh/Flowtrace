#!/usr/bin/env Rscript
# effect_size_heatmap.R — eta^2 (ANOVA) vs epsilon^2 (Kruskal) per feature
source("scripts/_theme.R")
suppressPackageStartupMessages({
  library(dplyr); library(tidyr)
})

iris <- read_iris()
features <- c("sepal_length","sepal_width","petal_length","petal_width")

eta2 <- sapply(features, function(f) {
  fit <- aov(iris[[f]] ~ factor(iris$species))
  s   <- summary(fit)[[1]]
  s[1, "Sum Sq"] / sum(s[, "Sum Sq"])
})

eps2 <- sapply(features, function(f) {
  k <- kruskal.test(iris[[f]] ~ factor(iris$species))
  unname(k$statistic) / (nrow(iris) - 1)
})

df <- tibble::tibble(feature = features) %>%
  mutate(eta_sq = eta2, eps_sq = eps2) %>%
  pivot_longer(c(eta_sq, eps_sq), names_to = "metric", values_to = "value")
df$metric <- factor(df$metric, levels = c("eta_sq", "eps_sq"),
                    labels = c("eta^2 (ANOVA)", "epsilon^2 (KW)"))

p <- ggplot(df, aes(metric, feature, fill = value)) +
  geom_tile(colour = "white", linewidth = 1.2) +
  geom_text(aes(label = sprintf("%.3f", value)), size = 4) +
  scale_fill_gradientn(colours = trace_palette(6, "ocean"),
                       limits = c(0, 1)) +
  labs(title = "Effect size per feature",
       subtitle = "parametric vs non-parametric, on the same data",
       x = NULL, y = NULL, fill = NULL)

ggsave_default(working_path("effect_size_heatmap.png"), p, w = 700, h = 480)
cat("wrote", working_path("effect_size_heatmap.png"), "\n")
