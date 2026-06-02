---
name: feature_distributions
description: Per-feature KDE faceted by species. Use when distribution shape matters.
display_name: "Feature Distributions"
reads:
  - runs/<run>/descriptive_stats/
writes:
  - runs/<run>/feature_distributions/dist_kde.png
---

# Feature Distributions

_Render KDE per feature (4 facets, colored by species) for shape inspection._

## Contract

- **Reads** from:
  - `runs/<run>/descriptive_stats/` (outputs of `descriptive_stats`)
- **Writes**:
  - `runs/<run>/feature_distributions/dist_kde.png`

## Implementation hint

Canonical visual produced by: `steps/feature_distributions/scripts/dist_kde.R`

Run from the trace folder with:

```bash
TRACE_OUTPUT_DIR=runs/<run_id>/feature_distributions \
TRACE_IRIS_CSV=data/iris.csv \
  Rscript steps/feature_distributions/scripts/dist_kde.R
```
