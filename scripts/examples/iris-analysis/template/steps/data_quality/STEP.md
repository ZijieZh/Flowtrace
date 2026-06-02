---
name: data_quality
description: Row-level checks: null counts, duplicates, range plausibility. Run before any modeling.
display_name: "Data Quality Checks"
reads:
  - runs/<run>/load_data/
writes:
  - runs/<run>/data_quality/quality_report.json
---

# Data Quality Checks

_Run row-level checks: null counts, duplicate rows, value-range sanity, class balance per species._

## Contract

- **Reads** from:
  - `runs/<run>/load_data/` (outputs of `load_data`)
- **Writes**:
  - `runs/<run>/data_quality/quality_report.json`
