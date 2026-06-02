# memory — anova_oneway

## Singular covariance matrix = duplicate rows

The step has errored exactly once in production: `Error: singular cov matrix
(cleaning needed)`. The cause was not a numerical edge case — it was an
**exact-duplicate row** in `data/iris.csv`.

Symptoms:
- `aov()` itself succeeds, but downstream pairwise tests (or some assumption
  checks that invert the covariance matrix) blow up
- error message says "singular" or "system is computationally singular" or
  "cov.matrix not invertible"

Recovery (matches the `error → retry` pattern in the demo trajectory):
1. Mark step `error` with message `"singular cov matrix (cleaning needed)"`
2. Drop the duplicate via `data_quality` rerun
3. Re-emit step `running` with message `"retry after cleaning"`
4. Re-emit step `done`

In the demo build.sh this is staged on purpose to exercise the error→retry UI
path. In real runs it should be rare; if it happens, log the duplicate row in
the reply's `evidence` as a `check` with `passed: false`.

## Expected F values for this dataset

For iris with 3 groups and ~50 obs each:

| Feature | F | η² | p |
|---|---|---|---|
| sepal_length | ~119 | ~0.62 | < 1e-32 |
| sepal_width | ~49 | ~0.40 | < 1e-15 |
| petal_length | ~1180 | ~0.94 | < 1e-90 |
| petal_width | ~960 | ~0.93 | < 1e-85 |

If any of these comes back with η² < 0.20 or p > 0.01, something is off
upstream — most likely outlier consensus dropped too many real points, or
data_quality didn't catch a feature-mixup.

The demo reply uses F=119.26, η²=0.62 (sepal_length values) since the demo
reports a single composite ANOVA across features for narrative simplicity.

## Why we run ANOVA AND Kruskal-Wallis

Not redundancy — methodological transparency for the report. See the
trace-level `references/parametric-vs-nonparametric.md` for the framing. This
step's reply should mention "Kruskal-Wallis corroboration follows in the
non-parametric branch" so the reader sees the design intent.
