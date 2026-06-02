# Trace-level memory — Deep Iris Analysis

Cross-step lessons accumulated across runs of this trace. Not part of the
schema; loaded by anyone (human or AI) authoring or executing the trace to
avoid repeating mistakes earlier runs already paid for.

---

## Assumptions: parametric tests are robust here despite borderline Shapiro

`assumption_check` reliably reports `sepal_width` as **borderline** (Shapiro-Wilk
p ≈ 0.04 in most runs). The first instinct is to fall back to the
non-parametric branch (Kruskal-Wallis). **Don't.**

- Sample size is n=50 per species. Parametric tests are robust to mild
  non-normality at this scale. The Central Limit Theorem covers the gap.
- Levene's test passes (homogeneity of variance ≈ p > 0.15 across features),
  which is the stronger assumption for ANOVA validity.
- `method_compare` step exists specifically because both ANOVA and Kruskal-Wallis
  reach the same qualitative conclusion (`p < 1e-22` either way). The borderline
  Shapiro is informational, not load-bearing.

If `n < 30` per group, this guidance reverses. Document `n` per group in the
`assumption_check` reply.

---

## Outlier consensus: 2-of-3 agreement = real

The three outlier detectors find different things:

| Method | What it catches |
|---|---|
| IQR (per-feature) | univariate spikes, sensitive to skew |
| z-score (per-feature) | univariate spikes, sensitive to spread |
| Mahalanobis (joint) | multivariate extremes that look fine on any one axis |

Rule from prior runs:

- **3-of-3 unanimous**: real outlier, drop in sensitivity analysis (`rerun_cleaned`)
- **2-of-3**: keep with care — usually a measurement near the boundary of valid
- **1-of-3**: noise of the method; ignore

`outlier_consensus` reply ranks the consensus tier; downstream `rerun_cleaned`
drops only the 3-of-3 set.

---

## Petal length is the dominant feature

Across every run on this dataset:

- η² of species effect on `petal_length` ≈ 0.81 (vs 0.61 for sepal features)
- PCA: PC1 ≈ petal size, accounts for 72.8% of variance
- LDA decision boundary on PC1+PC2 reaches 97.3% accuracy

When a step's `does` description has to pick a "lead" feature for a one-sentence
takeaway, pick `petal_length`. Don't lead with sepal features.

---

## Outliers in this dataset are NOT measurement noise

The `compare_full_vs_cleaned` step reliably shows ≤0.5% accuracy delta between
the full-data model and the outlier-cleaned model. Interpretation: the flagged
points are **real measurements of unusual but valid flowers**, not data-entry
errors.

Concrete takeaway for the report (`compose_report`):

> "We retain the 5 unanimously-flagged outliers in the published result. The
> sensitivity rerun confirms they don't materially affect classification
> accuracy, and there is no methodological reason to suspect measurement error."

If a future dataset shows >2% accuracy delta on the sensitivity rerun, that's a
flag worth surfacing in the deliverable's "limitations" section.

---

## Why this trace has both `anova_oneway` AND `kruskal_wallis`

Not redundancy — methodological transparency. Some reviewers reject papers that
use ANOVA without showing the non-parametric backup. The `method_compare` step
exists to document the convergent result so the report can cite both.

`compose_report` should reference the η² (ANOVA) and ε² (Kruskal) side-by-side
in the methods section.

---

## Things this trace does NOT do (and why)

- **Standardize features before classification**: skipped because the three
  classifiers we use (LDA, kNN, logistic) handle the scale differences fine on
  this dataset. If you swap in SVM or a distance-sensitive method, add a
  `standardize_features` step before `classification_*`.
- **Cross-species pairwise classifiers**: skipped because all three species are
  separable in one go; the 2-vs-2 setup adds complexity without insight here.
  If accuracy ever drops below 95%, revisit.
- **Bootstrap CIs on accuracy**: would be nice; skipped to keep the runtime
  reasonable for the demo. Add a `bootstrap_cv` step if reviewers ask.
