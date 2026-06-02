# memory — assumption_check

Gotchas this step has surfaced across runs.

## `sepal_width` borderline Shapiro is a false alarm here

Shapiro-Wilk reliably reports `p ≈ 0.04` for `sepal_width` in setosa (in some
runs versicolor too). The first instinct — fall back to non-parametric tests —
is wrong for this dataset.

- n = 50 per species → CLT covers mild non-normality
- Levene's homogeneity-of-variance test passes (the harder assumption)
- ANOVA results converge with Kruskal-Wallis (see `method_compare` step)

**What to write in the reply**: `status: "complete"` with `note: "borderline
sepal_width Shapiro; sample size makes ANOVA robust"`. Don't block. Don't push
toward Kruskal — both branches will run and `method_compare` will document that
they agree.

When this guidance *reverses*: if `n < 30` per group in some future variant of
this dataset, the borderline Shapiro becomes load-bearing and you should
prefer non-parametric.

## Independence is not testable from the data

Shapiro tests normality. Levene tests homogeneity. **Independence** is the
third ANOVA assumption and there's no within-data test for it — it depends on
how the data was collected (Fisher's iris flowers were independently sampled,
so we're safe by design).

Mention this in the reply's `findings` so readers don't think we forgot.

## Reply payload conventions for this step

- Always emit one `check` evidence item per test run (4 Shapiro + 1 Levene)
- Each check needs `expected: "p>.05"` and `actual: "p=0.XX"` so the UI can
  render a clear pass/fail badge
- Include a `findings` entry titled "sample size adequate" with detail like
  "n=50 per group — parametric tests robust to mild non-normality"
