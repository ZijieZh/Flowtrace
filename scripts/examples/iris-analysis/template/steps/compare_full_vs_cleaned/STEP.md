---
name: compare_full_vs_cleaned
description: Side-by-side accuracy on full vs outlier-removed data.
display_name: "Compare Full vs Cleaned"
reads:
  - runs/<run>/rerun_cleaned/
writes:
  - runs/<run>/compare_full_vs_cleaned/full_vs_cleaned.csv
---

# Compare Full vs Cleaned

_Side-by-side accuracy on full vs outlier-removed data; quantify whether outliers materially hurt the model._

## Contract

- **Reads** from:
  - `runs/<run>/rerun_cleaned/` (outputs of `rerun_cleaned`)
- **Writes**:
  - `runs/<run>/compare_full_vs_cleaned/full_vs_cleaned.csv`
