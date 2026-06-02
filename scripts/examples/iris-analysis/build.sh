#!/usr/bin/env bash
# Iris-analysis demo — 24-step pipeline.
#
# Two phases:
#   Phase A — authoring: simulate an AI building the trace from scratch
#             (init shell → add memory/refs → add data/theme → author 24 steps
#             one at a time → add run_all driver).  ~30 commits.
#
#   Phase B — execution: run the lifecycle (cli step / reply / deliverable),
#             exercising blocked→resume on assumption_check + method_select,
#             error→retry on anova_oneway, and rerun on classification_logistic.
#             Replies are rich: multiple evidence types, support/findings/
#             suggestions/citations/appendices.  ~90 commits.
#
# Tweak the cadence with STEP_DELAY (seconds between any commit). Default 0.

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/../_lib.sh"

FIX="$HERE/fixtures"
if [[ ! -f "$FIX/dist_kde.png" ]]; then
  RSCRIPT="${RSCRIPT:-Rscript}"
  if command -v "$RSCRIPT" >/dev/null 2>&1; then
    "$RSCRIPT" "$FIX/generate.R" >/dev/null
  else
    echo "warn: $RSCRIPT not found — fixtures missing" >&2
  fi
fi

# ════════════════════════════════════════════════════════════════════════════
# Phase A — Authoring narrative
#
# Not strict topological order. Real authoring goes: ground in priors, sketch
# bookends, fill in spine, add classification path, realize you need outlier
# consensus + upfront validation, finally drop memory & references after the
# scaffolding settles.
# ════════════════════════════════════════════════════════════════════════════

# Stage 1: shell + grounding
init_empty
author_file memory.md            "memory: notes distilled from prior iris analyses"

# Stage 2: bookends — start with entry + exit, decide deliverable
author_step load_data            "scaffold: load_data (entry point)"
author_step compose_report       "scaffold: compose_report (exit — wire-up TBD)"
scaffold_deliverable

# Stage 3: descriptive spine
author_step descriptive_stats    "scaffold: descriptive_stats (core summary)"
author_step feature_distributions "scaffold: feature_distributions (first plot)"
author_file scripts/_theme.R     "theme: slate palette (first plot script needs it)"
author_step species_distributions "scaffold: species_distributions (companion to feature_distributions)"

# Stage 4: assumption + inference branch
author_step assumption_check     "scaffold: assumption_check (Shapiro + Levene gate)"
author_step method_select        "scaffold: method_select (parametric vs non-parametric decision)"
author_step anova_oneway         "scaffold: anova_oneway (parametric test)"
author_step tukey_hsd            "scaffold: tukey_hsd (post-hoc on ANOVA)"
author_step kruskal_wallis       "scaffold: kruskal_wallis (non-parametric backup)"
author_step method_compare       "scaffold: method_compare (parametric/non-parametric agreement check)"

# Stage 5: classification path
author_step correlation_pca      "scaffold: correlation_pca (feature reduction before classifiers)"
author_step classification_lda   "scaffold: classification_lda (first classifier)"
author_step classification_knn   "scaffold: classification_knn"
author_step classification_logistic "scaffold: classification_logistic"
author_step cv_compare           "scaffold: cv_compare (fan-in across classifiers)"

# Stage 6: outlier consensus — added as a group; we realize the analysis needs
# a sensitivity layer to address reviewer pushback
author_step outlier_iqr          "insert: outlier_iqr (first detector — sensitivity work begins)"
author_step outlier_zscore       "insert: outlier_zscore (second detector — univariate complement)"
author_step outlier_mahalanobis  "insert: outlier_mahalanobis (third — multivariate complement)"
author_step outlier_consensus    "insert: outlier_consensus (fan-in of the three detectors)"
author_step rerun_cleaned        "insert: rerun_cleaned (sensitivity branch on outlier-removed data)"
author_step compare_full_vs_cleaned "insert: compare_full_vs_cleaned (does outlier removal matter?)"

# Stage 7: upstream validation — caught late; needed to reduce risk of anova_oneway error
author_step schema_validate      "insert: schema_validate (upstream of stats — should validate inputs)"
author_step data_quality         "insert: data_quality (null/dup checks before descriptive_stats)"

# Stage 8: step-local memory.md additions — written after step bodies stabilize,
# distilling gotchas encountered while authoring/testing
author_file steps/assumption_check/memory.md \
    "memory: assumption_check — sepal_width Shapiro is borderline but n=50 makes ANOVA robust"
author_file steps/outlier_consensus/memory.md \
    "memory: outlier_consensus — 3-of-3 unanimous = drop; 2-of-3 = keep with care"
author_file steps/anova_oneway/memory.md \
    "memory: anova_oneway — singular covariance matrix usually means a duplicate row"
author_file steps/compose_report/memory.md \
    "memory: compose_report — every claim cites a step asset or external ref"

# Stage 9: framing docs — trace-level references added once the shape is clear
author_dir references            "framing: parametric-vs-nonparametric + outlier-consensus methodology"

# Stage 10: final wiring — input data + driver, last because they need everything else
author_file data/iris.csv        "input: data/iris.csv (Fisher 1936 — 150 rows × 5 cols)"
author_file scripts/run_all.R    "driver: scripts/run_all.R (invoke every step plot script in order)"

# ════════════════════════════════════════════════════════════════════════════
# Phase B — Execution: walk the lifecycle on the now-fully-authored trace
# ════════════════════════════════════════════════════════════════════════════

# ── Orientation: exercise read-side CLI surfaces ──────────────────────────
cli validate >/dev/null
cli lint >/dev/null 2>&1 || true
cli show --fmt json    >/dev/null
cli show --fmt mermaid >/dev/null
cli show --fmt dot     >/dev/null
cli show --fmt ascii   >/dev/null

# ── Start the run ─────────────────────────────────────────────────────────
RUN=$(cli run new --name "iris (untitled)" | tail -1)
cli run list >/dev/null
cli run show --run "$RUN" >/dev/null
mkdir_step() { mkdir -p "runs/$RUN/$1"; }

# Helper: running → place assets → done → reply (with checkpoint injected).
quick_step() {
  local id=$1 msg=$2 reply_json=$3
  shift 3
  cli step "$id" running >/dev/null
  mkdir_step "$id"
  local assets=()
  for f in "$@"; do
    cp "$FIX/$f" "runs/$RUN/$id/$f"
    assets+=(--asset "$f")
  done
  cli step "$id" done "${assets[@]}" --message "$msg" >/dev/null
  printf '%s' "${reply_json/\{/\{\"checkpoint\":\{\"step_id\":\"$id\"\},}" | cli reply >/dev/null
}

# ── 1. load_data ──────────────────────────────────────────────────────────
quick_step load_data "150 rows × 5 cols loaded" \
  '{"headline":"150 rows loaded","status":"complete","support":["3 species","4 numeric measurements","balanced (50/50/50)","no header issues"],"findings":[{"title":"row count","detail":"150 — matches Fisher 1936 dataset"},{"title":"class balance","detail":"50 rows per species — no resampling needed"}],"evidence":[{"type":"check","label":"row count","passed":true,"expected":150,"actual":150},{"type":"check","label":"unique species","passed":true,"expected":3,"actual":3},{"type":"check","label":"class balance","passed":true,"expected":"1.0","actual":"1.0"},{"type":"document","path":"load_data/iris.csv","title":"iris.csv"}]}' \
  iris.csv

# ── 2. schema_validate ────────────────────────────────────────────────────
quick_step schema_validate "5 columns, types ok" \
  '{"headline":"schema OK","status":"complete","support":["4 float columns","1 string label","no missing values in any column"],"findings":[{"title":"feature types","detail":"all four measurements are continuous (float64)"},{"title":"label column","detail":"species — categorical string"}],"evidence":[{"type":"document","path":"schema_validate/schema.md","title":"data dictionary"},{"type":"citation","id":"fisher1936","title":"The use of multiple measurements in taxonomic problems","authors":"R. A. Fisher","year":1936},{"type":"check","label":"all columns typed","passed":true,"expected":5,"actual":5},{"type":"check","label":"no nulls in any column","passed":true,"expected":0,"actual":0}]}' \
  schema.md

# ── 3. data_quality ───────────────────────────────────────────────────────
quick_step data_quality "no missing, no dups" \
  '{"headline":"quality clean","status":"complete","support":["zero missing values","zero duplicate rows","perfect class balance"],"evidence":[{"type":"check","label":"missing values","passed":true,"expected":0,"actual":0},{"type":"check","label":"duplicate rows","passed":true,"expected":0,"actual":0},{"type":"check","label":"species balance ratio","passed":true,"expected":1.0,"actual":1.0},{"type":"check","label":"unit consistency","passed":true,"actual":"all measurements in cm"},{"type":"document","path":"data_quality/quality_report.json","title":"quality report"}],"takeaway":"data is clean; proceed to descriptive stats"}' \
  quality_report.json

# ── Run-level events ──────────────────────────────────────────────────────
cli run rename "iris — full lifecycle demo" --run "$RUN" >/dev/null
cli run pause  --run "$RUN" >/dev/null
cli run resume --run "$RUN" >/dev/null

# ── 4. descriptive_stats ──────────────────────────────────────────────────
quick_step descriptive_stats "stats computed" \
  '{"headline":"summary stats","status":"complete","support":["petal features show largest spread","sepal features more tightly clustered"],"findings":[{"title":"petal length spread","detail":"std=1.77, mean=3.76 — most variable feature"},{"title":"sepal width tight","detail":"std=0.44, mean=3.06 — narrowest distribution"}],"evidence":[{"type":"table","title":"feature summary","columns":["feature","mean","std","min","max"],"rows":[["sepal length","5.84","0.83","4.30","7.90"],["sepal width","3.06","0.44","2.00","4.40"],["petal length","3.76","1.77","1.00","6.90"],["petal width","1.20","0.76","0.10","2.50"]],"source_file":"descriptive_stats/summary_table.csv"},{"type":"check","label":"all features have nonzero variance","passed":true,"actual":"4/4"}]}' \
  summary_table.csv

# ── 5. feature_distributions ──────────────────────────────────────────────
quick_step feature_distributions "distributions rendered" \
  '{"headline":"feature distributions","status":"complete","support":["per-feature KDE shows clear species separation","per-feature boxplot confirms petal features as the strongest discriminators"],"findings":[{"title":"setosa stands apart","detail":"setosa is linearly separable from versicolor + virginica on petal length alone"},{"title":"versicolor↔virginica overlap","detail":"the two non-setosa species overlap on sepal features but separate on petal features"}],"evidence":[{"type":"figure","path":"feature_distributions/dist_kde.png","caption":"per-feature KDE by species"},{"type":"figure","path":"feature_distributions/dist_box.png","caption":"boxplot by species"},{"type":"check","label":"setosa separable on petal length","passed":true,"actual":"yes"}]}' \
  dist_kde.png dist_box.png

# ── 6. species_distributions ──────────────────────────────────────────────
quick_step species_distributions "Q-Q normality" \
  '{"headline":"normality probe","status":"complete","support":["near-linear Q-Q for sepal length within each species","minor tails in setosa sepal width"],"evidence":[{"type":"figure","path":"species_distributions/dist_qq.png","caption":"Q-Q plot for sepal length"},{"type":"check","label":"per-species normality (visual)","passed":true,"actual":"yes for petal features"},{"type":"appendix","title":"normality test detail","markdown":"## Q-Q\n\nSample quantiles plotted against theoretical normal quantiles. The near-linear pattern indicates approximate normality, supporting parametric tests."}],"takeaway":"safe to use ANOVA-class tests; non-parametric backup available if needed"}' \
  dist_qq.png

# ── 7. assumption_check — partial → BLOCKED → resume → done ───────────────
cli step assumption_check running --message "Shapiro-Wilk + Levene" >/dev/null
mkdir_step assumption_check; cp "$FIX/assumption_table.csv" "runs/$RUN/assumption_check/"
cli reply <<EOF >/dev/null
{
  "headline": "interim: 3 of 4 pass",
  "status": "partial",
  "note": "awaiting sign-off on borderline Shapiro for sepal width",
  "support": [
    "Shapiro-Wilk passes on sepal length, petal length, petal width",
    "Shapiro-Wilk on sepal width is borderline (p=0.04)",
    "Levene's test for homogeneity of variance passes (p=0.18)"
  ],
  "evidence": [
    { "type": "check", "label": "Shapiro sepal length", "passed": true,  "actual": "p=0.21" },
    { "type": "check", "label": "Shapiro sepal width",  "passed": false, "expected": "p>.05", "actual": "p=0.04" },
    { "type": "check", "label": "Shapiro petal length", "passed": true,  "actual": "p=0.14" },
    { "type": "check", "label": "Levene homogeneity",   "passed": true,  "actual": "p=0.18" }
  ],
  "checkpoint": { "step_id": "assumption_check" }
}
EOF
cli step assumption_check blocked --message "awaiting analyst on borderline sepal width" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "awaiting analyst",
  "status": "blocked",
  "note": "runtime paused until decision",
  "suggestions": [
    "accept (p≈.04 is borderline; n=150 is large enough)",
    "apply Box-Cox transform on sepal width",
    "drop sepal width feature entirely"
  ],
  "support": [
    "sample size (n=150) makes parametric tests robust to mild non-normality",
    "Levene's test passing means variance homogeneity isn't an issue"
  ],
  "evidence": [
    { "type": "check", "label": "sample size adequate", "passed": true, "expected": ">=30 per group", "actual": "50/group" }
  ],
  "checkpoint": { "step_id": "assumption_check" }
}
EOF
cli step assumption_check running --message "analyst: accept; sample size large enough" >/dev/null
cli step assumption_check done --asset assumption_table.csv --message "assumptions met (n=150 large enough)" >/dev/null

# ── 8–10. outlier_iqr / outlier_zscore / outlier_mahalanobis ──────────────
quick_step outlier_iqr "IQR found 5" \
  '{"headline":"IQR outliers","status":"complete","support":["3 sepal-width outliers (1 high, 2 low)","2 petal-length outliers (both high)"],"evidence":[{"type":"figure","path":"outlier_iqr/outlier_iqr_box.png","caption":"IQR fences"},{"type":"table","title":"flagged rows","columns":["row","feature","value","fence"],"rows":[["7","sepal width","4.45","4.21"],["63","sepal width","1.55","2.05"],["87","petal length","6.85","6.61"]],"source_file":"outlier_iqr/outlier_iqr.csv"},{"type":"check","label":"<5% of dataset flagged","passed":true,"expected":"<=5%","actual":"3.3%"}]}' \
  outlier_iqr.csv outlier_iqr_box.png

quick_step outlier_zscore "z-score found 4" \
  '{"headline":"z>3 outliers","status":"complete","support":["4 points with |z|>3","high agreement with IQR method (3/4 overlap)"],"evidence":[{"type":"document","path":"outlier_zscore/z_outliers.csv","title":"z-score outliers"},{"type":"check","label":"<5% flagged","passed":true,"actual":"2.7%"}]}' \
  z_outliers.csv

quick_step outlier_mahalanobis "mahalanobis at 97th pctile" \
  '{"headline":"mahalanobis outliers","status":"complete","support":["3 points jointly extreme across all 4 features"],"evidence":[{"type":"figure","path":"outlier_mahalanobis/outlier_mahalanobis.png","caption":"mahalanobis distance per row; threshold = 97th pctile"},{"type":"check","label":"complementary to IQR/z","passed":true,"actual":"finds multivariate outliers IQR misses"}],"takeaway":"3 points jointly extreme — multivariate signal, not just univariate"}' \
  outlier_mahalanobis.png

quick_step outlier_consensus "consensus = 5 rows" \
  '{"headline":"consensus voting","status":"complete","support":["2 rows flagged by all 3 methods","2 rows flagged by 2 of 3","1 row flagged by 1 method only"],"evidence":[{"type":"figure","path":"outlier_consensus/outlier_consensus_venn.png","caption":"agreement Venn across the 3 methods"},{"type":"table","title":"consensus","columns":["row","methods_flagging"],"rows":[["7","3"],["87","3"],["63","2"],["17","2"],["132","1"]],"source_file":"outlier_consensus/outlier_consensus.csv"},{"type":"check","label":"unanimous outliers exist","passed":true,"expected":">=1","actual":"2"}],"suggestions":["drop unanimously flagged rows for sensitivity analysis","keep them for the main analysis (they look like real measurements)"]}' \
  outlier_consensus.csv outlier_consensus_venn.png

# ── 11. method_select — review checkpoint ─────────────────────────────────
cli step method_select running --message "drafting method choice" >/dev/null
cli step method_select blocked --message "awaiting analyst sign-off on test choice" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "awaiting analyst",
  "status": "blocked",
  "support": [
    "ANOVA is the natural fit if assumptions hold (and they marginally do)",
    "Kruskal-Wallis is a non-parametric backup",
    "Both should reach the same qualitative conclusion"
  ],
  "suggestions": [
    "approve ANOVA (assumption_check marked accept)",
    "approve Kruskal-Wallis (more conservative)",
    "request more data before deciding"
  ],
  "evidence": [
    { "type": "check", "label": "assumption_check done", "passed": true, "actual": "yes" },
    { "type": "check", "label": "sample size adequate", "passed": true, "actual": "n=150" }
  ],
  "checkpoint": { "step_id": "method_select" }
}
EOF
cli step method_select running --message "analyst chose ANOVA" >/dev/null
mkdir_step method_select; echo "anova" > "runs/$RUN/method_select/decision.md"
cli step method_select done --asset decision.md --message "method = ANOVA" >/dev/null

# ── 12. anova_oneway — error → retry → done ───────────────────────────────
cli step anova_oneway running --message "fitting one-way ANOVA" >/dev/null
cli step anova_oneway error   --message "singular cov matrix (cleaning needed)" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "fit failed",
  "status": "error",
  "note": "covariance matrix singular — likely a duplicate row; clean and retry",
  "support": [
    "singular matrix → at least one feature is a linear combination of the others (or a duplicate)",
    "this is recoverable by removing the offending row"
  ],
  "suggestions": ["drop duplicate rows and retry", "regularize the covariance matrix"],
  "evidence": [
    { "type": "check", "label": "cov matrix invertible", "passed": false, "expected": "yes", "actual": "singular" }
  ],
  "checkpoint": { "step_id": "anova_oneway" }
}
EOF
cli step anova_oneway running --message "retry after cleaning" >/dev/null
mkdir_step anova_oneway; cp "$FIX/anova.json" "runs/$RUN/anova_oneway/"
cli step anova_oneway done --asset anova.json --message "F=119.26, p<1e-32" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "ANOVA significant",
  "status": "complete",
  "support": [
    "F=119.26 across 3 groups, df=(2, 147)",
    "p<1e-32 — overwhelmingly reject H0",
    "η²=0.62 — large effect (>.14 threshold)"
  ],
  "findings": [
    { "title": "species differ significantly", "detail": "at least one species mean differs from the others" },
    { "title": "effect size is large",          "detail": "η²=0.62 — 62% of variance explained by species" }
  ],
  "evidence": [
    { "type": "document", "path": "anova_oneway/anova.json", "title": "ANOVA summary" },
    { "type": "check",    "label": "reject H0",        "passed": true, "expected": "p<.05", "actual": "p<1e-32" },
    { "type": "check",    "label": "effect size η²",   "passed": true, "expected": ">.14",  "actual": "0.62" }
  ],
  "checkpoint": { "step_id": "anova_oneway" }
}
EOF

# ── 13. tukey_hsd ─────────────────────────────────────────────────────────
quick_step tukey_hsd "all pairs significant" \
  '{"headline":"Tukey HSD","status":"complete","support":["setosa↔versicolor: large difference","setosa↔virginica: largest difference","versicolor↔virginica: moderate but significant"],"findings":[{"title":"all 3 pairs differ","detail":"all 95% CIs exclude 0"},{"title":"setosa most distant","detail":"largest pairwise distance from both versicolor and virginica"}],"evidence":[{"type":"figure","path":"tukey_hsd/tukey_hsd_forest.png","caption":"pairwise mean differences with 95% CI"},{"type":"check","label":"all pairs reject H0","passed":true,"expected":"3/3","actual":"3/3"}],"takeaway":"all three pairs differ significantly"}' \
  tukey_hsd_forest.png

# ── 14. kruskal_wallis ────────────────────────────────────────────────────
quick_step kruskal_wallis "H=96.9, p<1e-22" \
  '{"headline":"Kruskal-Wallis corroborates","status":"complete","support":["non-parametric backup confirms the ANOVA result","H=96.9, df=2, p<1e-22"],"evidence":[{"type":"document","path":"kruskal_wallis/kruskal.json","title":"Kruskal-Wallis"},{"type":"check","label":"non-parametric agreement","passed":true,"actual":"both reject H0"},{"type":"check","label":"effect strength","passed":true,"expected":"H>10","actual":"96.9"}],"takeaway":"the parametric assumption concern is moot — both tests agree"}' \
  kruskal.json

# ── 15. method_compare ────────────────────────────────────────────────────
quick_step method_compare "ANOVA ≈ KW" \
  '{"headline":"parametric vs non-parametric agreement","status":"complete","support":["all 3 pairwise effect sizes agree in sign","magnitudes match to within 5%"],"evidence":[{"type":"figure","path":"method_compare/effect_size_heatmap.png","caption":"Cohens d across pairs"},{"type":"check","label":"sign agreement","passed":true,"expected":"100%","actual":"100%"},{"type":"check","label":"magnitude agreement","passed":true,"expected":"within 10%","actual":"within 5%"}],"takeaway":"safe to report ANOVA results; non-parametric confirms"}' \
  effect_size_heatmap.png

# ── 16. correlation_pca ───────────────────────────────────────────────────
cli step correlation_pca running --message "computing correlation + PCA" >/dev/null
mkdir_step correlation_pca
for f in pca_screeplot.png pca_biplot.png corr_pearson.png corr_spearman.png; do
  cp "$FIX/$f" "runs/$RUN/correlation_pca/"
done
cli step correlation_pca done \
  --asset pca_screeplot.png --asset pca_biplot.png \
  --asset corr_pearson.png --asset corr_spearman.png \
  --message "PC1 = 72.8% variance" >/dev/null
cli reply <<'EOF' >/dev/null
{
  "headline": "PC1 captures 72.8%",
  "status": "complete",
  "support": [
    "PC1 dominates: 72.8% of total variance",
    "PC1+PC2 together: 95.8%",
    "petal length is the strongest contributor to PC1",
    "sepal width loads orthogonally onto PC2"
  ],
  "findings": [
    { "title": "PC1 ≈ petal size",       "detail": "petal length + petal width together drive PC1" },
    { "title": "PC2 ≈ sepal proportion", "detail": "PC2 separates sepal-width variation from the rest" }
  ],
  "evidence": [
    { "type": "figure",   "path": "correlation_pca/pca_screeplot.png", "caption": "scree" },
    { "type": "figure",   "path": "correlation_pca/pca_biplot.png",    "caption": "biplot" },
    { "type": "figure",   "path": "correlation_pca/corr_pearson.png",  "caption": "Pearson correlation" },
    { "type": "figure",   "path": "correlation_pca/corr_spearman.png", "caption": "Spearman correlation" },
    { "type": "check",    "label": "PC1+PC2 >= 90%",  "passed": true, "expected": ">=0.9", "actual": "0.958" },
    { "type": "appendix", "title": "PC interpretation",
      "markdown": "## PC interpretation\n\n$$\\mathrm{PC1} \\approx 0.52 \\cdot \\text{petal\\_len} + 0.50 \\cdot \\text{petal\\_wid} + 0.36 \\cdot \\text{sepal\\_len}$$\n\nDominant axis = petal size." }
  ],
  "checkpoint": { "step_id": "correlation_pca" }
}
EOF

# ── 17–18. classification_lda / classification_knn ────────────────────────
quick_step classification_lda "LDA 97.3%" \
  '{"headline":"LDA — 97.3% accuracy","status":"complete","support":["near-perfect separation on first 2 LDA components","misclassifications confined to the versicolor↔virginica boundary"],"evidence":[{"type":"figure","path":"classification_lda/lda_decision_boundary.png","caption":"LDA decision regions on first 2 PCs"},{"type":"check","label":"accuracy","passed":true,"expected":">=0.95","actual":"0.973"}]}' \
  lda_decision_boundary.png

quick_step classification_knn "KNN k=5: 96.7%" \
  '{"headline":"KNN k=5: 96.7%","status":"complete","support":["k=5 chosen via 5-fold CV","accuracy stable in k∈[3,9] window"],"evidence":[{"type":"document","path":"classification_knn/knn.json","title":"KNN result"},{"type":"check","label":"accuracy","passed":true,"expected":">=0.95","actual":"0.967"}]}' \
  knn.json

# ── 19. classification_logistic + rerun (time-travel demo) ────────────────
cli step classification_logistic running --message "fitting logistic" >/dev/null
mkdir_step classification_logistic; cp "$FIX/logistic.json" "runs/$RUN/classification_logistic/"
cli step classification_logistic done --asset logistic.json --message "C=1.0, acc=0.973" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "v1 — C=1.0",
  "status": "complete",
  "support": ["default regularization", "97.3% 5-fold CV accuracy"],
  "evidence": [
    { "type": "document", "path": "classification_logistic/logistic.json", "title": "logistic v1" },
    { "type": "check",    "label": "accuracy",  "passed": true, "expected": ">=0.95", "actual": "0.973" }
  ],
  "suggestions": ["tune C via grid search to see if regularization helps"],
  "checkpoint": { "step_id": "classification_logistic" }
}
EOF
cli step classification_logistic running --message "retuning with C grid search" >/dev/null
python3 -c "import json; json.dump({'C':0.1,'accuracy':0.980,'auc_roc':0.997}, open('runs/$RUN/classification_logistic/logistic.json','w'), indent=2)"
cli step classification_logistic done --asset logistic.json --message "v2: C=0.1, acc=0.980" >/dev/null
cli reply <<EOF >/dev/null
{
  "headline": "v2 — tuned C=0.1",
  "status": "complete",
  "note": "same path, new bytes; v1 still recoverable via git history",
  "support": [
    "C=0.1 (more regularization) gives a 0.7-point gain",
    "AUC-ROC also improves: 0.997",
    "the previous version of logistic.json is preserved in git"
  ],
  "evidence": [
    { "type": "comparison", "title": "before / after tuning",
      "left":  { "label": "v1 C=1.0", "path": "classification_logistic/logistic.json" },
      "right": { "label": "v2 C=0.1", "path": "classification_logistic/logistic.json" } },
    { "type": "check", "label": "accuracy improved", "passed": true, "expected": ">v1", "actual": "0.980 > 0.973" }
  ],
  "checkpoint": { "step_id": "classification_logistic" }
}
EOF

# ── 20. cv_compare ────────────────────────────────────────────────────────
quick_step cv_compare "5-fold CV across 4 models" \
  '{"headline":"5-fold CV","status":"complete","support":["logistic + LDA tie at the top","RF close behind","all 4 models >95% accuracy"],"findings":[{"title":"top performers","detail":"logistic and LDA both at 0.973"},{"title":"variance across folds","detail":"all models show <1% fold-to-fold variance"}],"evidence":[{"type":"figure","path":"cv_compare/model_cv_compare.png","caption":"5-fold CV accuracy"},{"type":"check","label":"all models > 0.95","passed":true,"actual":"min 0.953"},{"type":"check","label":"low fold variance","passed":true,"expected":"<2%","actual":"<1%"}]}' \
  model_cv_compare.png

# ── 21. rerun_cleaned ─────────────────────────────────────────────────────
quick_step rerun_cleaned "rerun without 5 outliers" \
  '{"headline":"cleaned rerun","status":"complete","support":["dropped the 5 consensus outliers and re-ran the model bake-off","performance moved by less than 1pp"],"findings":[{"title":"outliers were real","detail":"removing them did not materially change conclusions"}],"evidence":[{"type":"document","path":"rerun_cleaned/rerun_summary.md","title":"rerun summary"},{"type":"check","label":"conclusion stable","passed":true,"expected":"yes","actual":"yes"}],"takeaway":"outliers were real measurements; performance changes are negligible"}' \
  rerun_summary.md

# ── 22. compare_full_vs_cleaned ───────────────────────────────────────────
quick_step compare_full_vs_cleaned "delta negligible" \
  '{"headline":"full vs cleaned: Δ ≤ 1%","status":"complete","support":["all 4 models gain slightly when outliers removed","none lose","KNN benefits most (+0.8%)"],"evidence":[{"type":"table","title":"acc delta by model","columns":["model","acc_full","acc_cleaned","delta"],"rows":[["logistic","0.973","0.974","+0.1%"],["LDA","0.967","0.969","+0.2%"],["KNN","0.953","0.961","+0.8%"],["RF","0.967","0.973","+0.6%"]],"source_file":"compare_full_vs_cleaned/compare_table.csv"},{"type":"check","label":"no model gets worse","passed":true,"actual":"4/4 gain"}],"takeaway":"reporting either version is defensible; cleaned slightly preferred"}' \
  compare_table.csv

# ── 23. compose_report ────────────────────────────────────────────────────
quick_step compose_report "final report shipped" \
  '{"headline":"final report","status":"complete","support":["executive summary + per-step appendices","figures embedded inline"],"evidence":[{"type":"document","path":"compose_report/report.md","title":"final report"},{"type":"check","label":"all figures embedded","passed":true,"actual":"yes"},{"type":"appendix","title":"executive summary","markdown":"## Executive summary\n\nAll three iris species are linearly separable on the 4-feature space.\n- **logistic** + **LDA** tie at 97.3% 5-fold CV\n- petal length is the single most discriminative feature (η² = 0.81)\n- 5 consensus outliers are real measurements; pipeline is robust to their inclusion"}],"suggestions":["ship to stakeholders","schedule follow-up on borderline sepal width"]}' \
  report.md

# ── 24. deliverable ───────────────────────────────────────────────────────
cli deliverable running --message "assembling final" >/dev/null
cli deliverable done \
  --asset "compose_report/report.md" \
  --asset "correlation_pca/pca_biplot.png" \
  --asset "cv_compare/model_cv_compare.png" \
  --message "iris analysis delivered" >/dev/null

# ── Summary ───────────────────────────────────────────────────────────────
echo
echo "=== summary ==="
python3 -c "
import json, os
s = json.load(open('runs/$RUN/state.json'))
done = sum(1 for x in s['steps'].values() if x['status']['kind'] == 'done')
print(f'  {len(s[\"steps\"])} steps, {done} done')
print(f'  replies: {len(os.listdir(f\"runs/$RUN/replies\"))}')
print(f'  deliverable: {s[\"deliverable\"][\"status\"][\"kind\"]}')
"
echo "git commits: $(git log --oneline | wc -l)"
