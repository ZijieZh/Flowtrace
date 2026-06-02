---
name: kruskal_wallis
description: Rank-based non-parametric alternative to ANOVA.
display_name: "Kruskal-Wallis (non-parametric)"
reads:
  - inputs.alpha
  - runs/<run>/method_select/
writes:
  - runs/<run>/kruskal_wallis/kruskal_table.csv
---

# Kruskal-Wallis (non-parametric)

_Rank-based test as a robust alternative when normality / variance assumptions wobble._

## Contract

- **Reads** from:
  - `inputs.alpha`
  - `runs/<run>/method_select/` (outputs of `method_select`)
- **Writes**:
  - `runs/<run>/kruskal_wallis/kruskal_table.csv`
