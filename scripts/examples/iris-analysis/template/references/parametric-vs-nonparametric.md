# Parametric vs non-parametric: when to use which

Framing doc for the `method_select` step. Decides which hypothesis-test family
the downstream `anova_oneway` / `tukey_hsd` vs `kruskal_wallis` branch should
take.

## The decision tree

```
┌─────────────────────────────────────────────────────┐
│  data per group:                                    │
│                                                     │
│  n < 15?  ───────────────────────►  non-parametric  │
│  (CLT doesn't bail you out)                         │
│                                                     │
│  n in [15, 30]?  ────► assumptions matter:          │
│      Shapiro p > 0.05  &  Levene p > 0.05           │
│                  YES ─► parametric                  │
│                  NO  ─► non-parametric              │
│                                                     │
│  n ≥ 30?  ────► parametric is robust;               │
│                   non-parametric is corroboration    │
│                   not replacement                    │
└─────────────────────────────────────────────────────┘
```

For iris (n=50 per species), we're in the third branch. Both methods are
appropriate; we run both for transparency.

## What each family assumes

### ANOVA (parametric)

- **Normality** of residuals within each group
- **Homogeneity of variance** across groups (Levene's test)
- **Independence** of observations

Violations of normality matter less as n grows (CLT). Violations of homogeneity
of variance matter more — that's what Welch's ANOVA fixes when needed.

### Kruskal-Wallis (non-parametric)

- **Independence** of observations
- **Same shape** of distribution across groups (not the same location)

No distributional assumption beyond "same shape." Loses statistical power vs
ANOVA when ANOVA's assumptions actually hold.

## When the two diverge

If ANOVA says "reject H₀" but Kruskal-Wallis says "fail to reject":
- usually a **distribution-shape** issue across groups (one is bimodal, others
  unimodal, etc.)
- inspect with KDE per group (`feature_distributions` step output)
- prefer Kruskal-Wallis in this case

If Kruskal-Wallis says "reject" but ANOVA says "fail to reject":
- usually an **outlier influence** issue (rank-based test is robust to them)
- check `outlier_consensus` output
- run `rerun_cleaned` and see if ANOVA p-value drops below threshold

If both agree (the common case for iris), report ANOVA F + Kruskal H side-by-side
and pick ANOVA as primary (more familiar to most readers).

## Effect sizes

When you report results, the test statistic alone is incomplete. Pair each with
an effect size:

| Test | Effect size | Interpretation |
|---|---|---|
| ANOVA | η² (eta-squared) | proportion of variance explained by group |
| ANOVA | ω² (omega-squared) | bias-corrected version of η² |
| Kruskal-Wallis | ε² (epsilon-squared) | non-parametric analogue of η² |

For iris on `petal_length`: η² ≈ 0.81 (species explains 81% of variance).
Threshold convention: > 0.14 = large effect.

## References

- Welch (1951) on Welch's ANOVA for unequal variances
- Conover & Iman (1981) on rank transforms — the bridge between Kruskal and ANOVA
- Field, *Discovering Statistics Using R* (5th ed.) — practical chapter on this exact decision
