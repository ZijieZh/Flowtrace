#!/usr/bin/env Rscript
# outlier_mahalanobis.R — chi-square Q-Q of squared Mahalanobis distances
source("scripts/_theme.R")

iris <- read_iris()
F <- as.matrix(iris[, c("sepal_length","sepal_width","petal_length","petal_width")])
mu <- colMeans(F)
S  <- cov(F)
md2 <- mahalanobis(F, mu, S)

n  <- nrow(F)
df <- data.frame(
  theoretical = qchisq(ppoints(n), df = ncol(F)),
  observed    = sort(md2)
)
crit <- qchisq(0.975, df = ncol(F))
df$flagged <- df$observed > crit

p <- ggplot(df, aes(theoretical, observed)) +
  geom_abline(slope = 1, intercept = 0, colour = "grey60", linetype = "dashed") +
  geom_point(aes(colour = flagged), size = 1.6, alpha = 0.85) +
  geom_hline(yintercept = crit, colour = trace_palette(2, "teal")[1],
             linewidth = 0.4) +
  scale_colour_manual(values = c("FALSE" = trace_palette(3, "bluegrey")[2],
                                 "TRUE"  = "#b35a3d")) +
  labs(title = "Mahalanobis chi-square Q-Q",
       subtitle = sprintf("threshold = %.2f (chi^2_{0.975, df=4})", crit),
       x = "theoretical chi-square quantile",
       y = "observed Mahalanobis D^2") +
  theme(legend.position = "none")

ggsave_default(working_path("outlier_mahalanobis.png"), p)
cat("wrote", working_path("outlier_mahalanobis.png"), "\n")
