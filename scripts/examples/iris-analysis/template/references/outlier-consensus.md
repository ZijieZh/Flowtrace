# Three-method outlier consensus

Framing doc for the `outlier_iqr` / `outlier_zscore` / `outlier_mahalanobis` →
`outlier_consensus` chain. The motivating question: *how do we decide what
counts as an outlier without picking favorites among methods?*

## Why three methods, not one

Each detector has a different blind spot:

| Method | Sees | Misses |
|---|---|---|
| **IQR** (per-feature) | univariate spikes outside Q1±1.5·IQR | points that are extreme jointly but normal on any single feature |
| **z-score** (per-feature) | univariate \|z\| > 3 from feature's mean | same as IQR — single-feature lens |
| **Mahalanobis** (joint) | multivariate distance > chi² quantile from joint mean | nothing structurally — but sensitive to covariance estimation, so it can be fooled by clusters |

Iris has 4 features, 3 species. A point can sit near the median on every individual
feature yet land far from the joint mean of its species — Mahalanobis catches that;
IQR and z-score don't.

## The consensus tier system

After running all three on the same dataset:

```
For each row, count how many methods flagged it:
  3-of-3  →  high-confidence outlier  → drop in sensitivity rerun
  2-of-3  →  candidate  → keep, but document in report
  1-of-3  →  noise of the method  →  ignore
  0-of-3  →  clean
```

Rationale:
- **3-of-3**: the three methods are nearly independent (different math). Unanimous
  agreement is hard to achieve by chance. A row flagged by all three is genuinely
  unusual.
- **2-of-3**: the row is at the edge of one method's lens. Possibly real, possibly
  measurement quirk. Keep for the main analysis; rerun without it to see if
  conclusions change.
- **1-of-3**: more likely a quirk of that specific method than a real anomaly.
  IQR fences shift if you change quantile cutoff; z-score depends on the mean
  estimate it's computing against; Mahalanobis depends on the covariance estimate.
  Single-method flags are noisy.

## What `outlier_consensus` reply should contain

- count per tier (3-of-3, 2-of-3, 1-of-3)
- the Venn diagram (`outlier_consensus_venn.png`)
- the table of flagged rows with their tier
- a takeaway line: "drop N rows for sensitivity analysis; keep the rest"

## What happens downstream

- `rerun_cleaned` drops only the 3-of-3 set, refits the three classifiers.
- `compare_full_vs_cleaned` compares accuracies. The expected delta is small
  (< 1%) — see trace-level `memory.md` for the "outliers are real measurements"
  finding.

## Pitfalls observed across past runs

- **Mahalanobis with small n**: covariance estimate is noisy; threshold may
  flag too many or too few. n=150 (iris size) is fine; n < 50 needs robust
  covariance (MCD).
- **IQR with skewed features**: 1.5·IQR is calibrated for roughly-normal data.
  Heavy-tailed features (e.g., income, count data) will flood the flagged set.
  Iris features are roughly normal so this isn't an issue here.
- **z-score with outliers in the mean**: the mean itself is pulled by outliers,
  shrinking |z| for the very rows you want to flag. Modified z-score (uses MAD
  instead of stdev) is more robust. Not used here because iris's outliers are
  too few to bias the mean meaningfully.

## References

- Tukey (1977), *Exploratory Data Analysis* — original 1.5·IQR rule
- Rousseeuw & Van Driessen (1999) on Minimum Covariance Determinant (MCD) for
  robust Mahalanobis
- Iglewicz & Hoaglin (1993) on modified z-score with MAD
