# Iris classification — final report

## Headline
All three iris species are linearly separable on the 4-feature space; logistic
regression and LDA tie at 97.3% 5-fold CV accuracy.

## Key findings
- petal length is the single most discriminative feature (η² = 0.81)
- 5 consensus outliers are real measurements, not noise
- ANOVA (F=119.3, p<1e-32) and Kruskal-Wallis (H=96.9) both reject H₀.

## Method
1. Quality check (no missing, no dups) → 2. assumption testing →
3. outlier consensus → 4. ANOVA + Tukey HSD → 5. classify (3 methods, 5-fold CV)
