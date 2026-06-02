#!/usr/bin/env Rscript
# outlier_iqr_box.R — boxplots highlighting IQR-rule outliers
source("scripts/_theme.R")
suppressPackageStartupMessages({
  library(dplyr); library(tidyr)
})

iris <- read_iris()
long <- pivot_longer(iris,
                     cols = c(sepal_length, sepal_width, petal_length, petal_width),
                     names_to = "feature", values_to = "value")

flagged <- long %>%
  group_by(feature) %>%
  mutate(q1 = quantile(value, 0.25),
         q3 = quantile(value, 0.75),
         iqr = q3 - q1,
         outlier = value < q1 - 1.5*iqr | value > q3 + 1.5*iqr) %>%
  ungroup()

p <- ggplot(flagged, aes(feature, value)) +
  geom_boxplot(outlier.shape = NA, fill = trace_palette(3, "bluegrey")[3],
               alpha = 0.55, width = 0.45) +
  geom_jitter(aes(colour = outlier), width = 0.18, alpha = 0.7, size = 1.1) +
  scale_colour_manual(values = c("FALSE" = "grey55", "TRUE" = "#b35a3d")) +
  labs(title = "IQR-rule outliers",
       subtitle = "red points lie outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR]",
       x = NULL, y = NULL,
       colour = "IQR outlier")

ggsave_default(working_path("outlier_iqr_box.png"), p)
cat("wrote", working_path("outlier_iqr_box.png"), "\n")
