---
name: descriptive_stats
description: Mean/sd/median/IQR per feature x species. Foundation for everything downstream.
display_name: "Descriptive Statistics"
reads:
  - runs/<run>/load_data/
writes:
  - runs/<run>/descriptive_stats/summary_table.csv
---

# Descriptive Statistics

_Compute mean, sd, median, IQR per feature x species; produce summary table._

## Contract

- **Reads** from:
  - `runs/<run>/load_data/` (outputs of `load_data`)
- **Writes**:
  - `runs/<run>/descriptive_stats/summary_table.csv`
