#!/usr/bin/env Rscript
# model_cv_compare.R — 10-fold CV accuracy +/- SE for LDA / kNN / Logistic
source("scripts/_theme.R")
suppressPackageStartupMessages({
  library(MASS); library(class); library(nnet); library(dplyr)
})

set.seed(42)
iris <- read_iris()
iris$species <- factor(iris$species)
features <- c("sepal_length","sepal_width","petal_length","petal_width")

cv_acc <- function(method, k = 10) {
  folds <- sample(rep(1:k, length.out = nrow(iris)))
  acc <- numeric(k)
  for (i in 1:k) {
    train <- iris[folds != i, ]; test <- iris[folds == i, ]
    pred <- switch(method,
      lda = predict(MASS::lda(species ~ ., data = train[, c("species", features)]), test)$class,
      knn = class::knn(train[, features], test[, features], train$species, k = 5),
      logistic = {
        m <- nnet::multinom(species ~ ., data = train[, c("species", features)], trace = FALSE)
        predict(m, test)
      })
    acc[i] <- mean(pred == test$species)
  }
  c(mean = mean(acc), se = sd(acc) / sqrt(k))
}

res <- sapply(c("lda", "knn", "logistic"), cv_acc)
df <- data.frame(method = colnames(res), mean = res["mean", ], se = res["se", ])
df$method <- factor(df$method, levels = df$method[order(df$mean)])

p <- ggplot(df, aes(mean, method)) +
  geom_errorbarh(aes(xmin = mean - se, xmax = mean + se),
                 height = 0.18, linewidth = 0.55,
                 colour = trace_palette(3, "bluegrey")[1]) +
  geom_point(size = 3, colour = trace_palette(2, "ocean")[1]) +
  geom_text(aes(label = sprintf("%.3f", mean)), hjust = -0.4, size = 4) +
  scale_x_continuous(limits = c(0.92, 1.0), labels = scales::percent_format(accuracy = 1)) +
  labs(title = "10-fold CV accuracy by method",
       subtitle = "point = mean, bar = standard error",
       x = NULL, y = NULL)

ggsave_default(working_path("model_cv_compare.png"), p, w = 750, h = 380)
cat("wrote", working_path("model_cv_compare.png"), "\n")
