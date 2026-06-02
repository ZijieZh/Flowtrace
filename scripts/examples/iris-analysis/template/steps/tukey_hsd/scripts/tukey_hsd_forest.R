#!/usr/bin/env Rscript
# tukey_hsd_forest.R — pairwise Tukey HSD forest plot for the four features
source("scripts/_theme.R")
suppressPackageStartupMessages({
  library(dplyr); library(tidyr); library(broom)
})

iris <- read_iris()
features <- c("sepal_length","sepal_width","petal_length","petal_width")

rows <- do.call(rbind, lapply(features, function(f) {
  fit <- aov(iris[[f]] ~ factor(iris$species))
  th  <- TukeyHSD(fit, conf.level = 0.95)$`factor(iris$species)`
  data.frame(feature = f,
             contrast = rownames(th),
             diff = th[, "diff"],
             lwr  = th[, "lwr"],
             upr  = th[, "upr"],
             p    = th[, "p adj"],
             row.names = NULL)
}))
rows$feature <- factor(rows$feature, levels = features)

p <- ggplot(rows, aes(diff, contrast, colour = feature)) +
  geom_vline(xintercept = 0, linetype = "dashed", colour = "grey60") +
  geom_errorbarh(aes(xmin = lwr, xmax = upr), height = 0.18, linewidth = 0.55) +
  geom_point(size = 2.4) +
  facet_wrap(~ feature, ncol = 2, scales = "free_x") +
  scale_colour_manual(values = trace_palette(4, "ocean")) +
  labs(title = "Tukey HSD pairwise CIs",
       subtitle = "95% confidence intervals per feature",
       x = "mean difference", y = NULL) +
  theme(legend.position = "none")

ggsave_default(working_path("tukey_hsd_forest.png"), p, w = 800, h = 560)
cat("wrote", working_path("tukey_hsd_forest.png"), "\n")
