# memory — outlier_consensus

## Drop only 3-of-3, keep 2-of-3

The downstream `rerun_cleaned` step expects this consensus to define **a tight
high-confidence outlier set** — the rows where all three independent methods
(IQR, z-score, Mahalanobis) agree. Anything looser dilutes the sensitivity
analysis.

Rule from prior runs:

- **3-of-3 (unanimous)**: drop for sensitivity rerun. 2 rows typical.
- **2-of-3 (majority)**: keep with care. Document in the reply's `findings`. 2-3 rows typical.
- **1-of-3 (single method)**: ignore. Noise of the specific method, not a real anomaly.

## What `outlier_consensus.csv` must contain

The downstream step reads this CSV. Schema:

```csv
row,methods_flagging
7,3
87,3
63,2
17,2
132,1
```

`row` = 1-indexed row in the original iris.csv. `methods_flagging` = integer 1, 2, or 3.

If the CSV is missing the `methods_flagging` column, `rerun_cleaned` will fail
silently (drop everything or drop nothing, depending on parse). Don't refactor
the column names without coordinating.

## The Venn diagram is a story tool, not analysis

`outlier_consensus_venn.png` is for the reader. It doesn't drive `rerun_cleaned`.
If you ever skip the figure to save time, the rest of the pipeline still works.

## Pitfall: Mahalanobis flagging too many

In runs where covariance estimation went off (e.g., a duplicate row inflating
variance estimates), Mahalanobis flagged 8+ rows. That cascades into consensus.

If consensus 3-of-3 count exceeds 5, check the `outlier_mahalanobis` step's
output first — most likely it's over-flagging, not the dataset having unusually
many outliers.
