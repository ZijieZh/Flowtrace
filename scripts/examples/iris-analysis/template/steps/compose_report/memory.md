# memory — compose_report

## Citation requirements

Every figure, table, or claim in the final report must trace back to a step's
declared asset OR an external reference. Two failure modes from past runs:

1. **Orphan figure** — a figure rendered but never declared in any step's
   `assets` list. The report references it; readers can't find it in the
   audit trail. Fix: add the figure to the producing step's `assets`.
2. **Uncited factual claim** — a sentence like "all three species are
   linearly separable" without a citation to either Fisher (1936) or the
   `classification_lda` step output. Fix: every quantitative claim cites
   either an upstream step's reply or a literature reference.

The reply for this step must list every cited evidence item under `evidence[]`
(type `citation` for external references, type `document` or `figure` for
upstream step assets).

## Don't lead with sepal features

Even though the report covers all 4 features, **lead the executive summary
with petal_length**. It's the dominant discriminative feature (η² ≈ 0.94 across
species). Sepal features are interesting but secondary.

Pattern from prior runs that worked well:

1. Open with: "All three iris species are linearly separable on the 4-feature
   space; logistic regression and LDA tie at 97.3% 5-fold CV accuracy."
2. Then: "Petal length is the single most discriminative feature."
3. Then sepal-feature secondary findings, outlier discussion, sensitivity result.
4. Close with: "The 5 flagged outliers are retained — they are real
   measurements, not noise (sensitivity rerun shows <0.5% accuracy delta)."

## Reviewer pushback pattern: the v2 revision

The demo trajectory stages a `done → rerun → done` cycle on this step. That's
modeled on a real reviewer note from a past run:

- v1 cited Jung 1928. Reviewer pointed out the correct citation is Jung 1964
  (*Man and His Symbols*).
- v1 had the framework comparison as prose. Reviewer asked for a table.
- v1 had the motif-occurrence heatmap as a separate figure; reviewer asked to
  inline it.

If you're re-running this step after reviewer feedback, the v2 reply should
include a `comparison` evidence item (v1 vs v2) and a `changelog` appendix.

## Asset list for the deliverable

`compose_report` produces `report.pdf` + `report.md`. The deliverable also
references key figures from upstream:

- `compose_report/report.pdf` (the final)
- `compose_report/report.md` (markdown source for diffing/grep)
- `analyze_dream/jung-shadow-anima.png` ← (n/a for iris; this is dream-analysis pattern)
- For iris: `tukey_hsd/tukey_hsd_forest.png`, `correlation_pca/pca_biplot.png`,
  `cv_compare/model_cv_compare.png`, etc.

The deliverable is curated; don't list every figure from every step.
