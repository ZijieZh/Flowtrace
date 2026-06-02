---
name: assumption_check
description: Shapiro-Wilk + Levene. Run before choosing parametric vs non-parametric.
display_name: "Assumption Checks"
reads:
  - inputs.alpha
  - runs/<run>/feature_distributions/
  - runs/<run>/species_distributions/
writes:
  - runs/<run>/assumption_check/assumption_table.csv
---

# Assumption Checks

_Shapiro-Wilk per feature x species (normality), Levene's test per feature (homogeneity of variance), and an independence note._

## Contract

- **Reads** from:
  - `inputs.alpha`
  - `runs/<run>/feature_distributions/` (outputs of `feature_distributions`)
  - `runs/<run>/species_distributions/` (outputs of `species_distributions`)
- **Writes**:
  - `runs/<run>/assumption_check/assumption_table.csv`
