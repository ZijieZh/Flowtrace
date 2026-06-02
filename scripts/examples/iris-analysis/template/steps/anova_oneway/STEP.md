---
name: anova_oneway
description: One-way ANOVA per feature across species. Parametric path.
display_name: "One-way ANOVA (parametric)"
reads:
  - inputs.alpha
  - runs/<run>/method_select/
writes:
  - runs/<run>/anova_oneway/anova_table.csv
---

# One-way ANOVA (parametric)

_Run one-way ANOVA per feature across species; report F, df, p-value._

## Contract

- **Reads** from:
  - `inputs.alpha`
  - `runs/<run>/method_select/` (outputs of `method_select`)
- **Writes**:
  - `runs/<run>/anova_oneway/anova_table.csv`

## Implementation hint

Implementation: inline R (no external script — uses base R `aov()`).


