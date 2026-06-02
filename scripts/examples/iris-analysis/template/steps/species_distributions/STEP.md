---
name: species_distributions
description: Per-species boxplot + Q-Q for normality probe.
display_name: "Per-Species Distributions"
reads:
  - runs/<run>/descriptive_stats/
writes:
  - runs/<run>/species_distributions/dist_box.png
  - runs/<run>/species_distributions/dist_qq.png
---

# Per-Species Distributions

_Box + jittered scatter per feature x species; QQ grid for normality at a glance._

## Contract

- **Reads** from:
  - `runs/<run>/descriptive_stats/` (outputs of `descriptive_stats`)
- **Writes**:
  - `runs/<run>/species_distributions/dist_box.png`
  - `runs/<run>/species_distributions/dist_qq.png`

## Implementation hint

Canonical visual produced by: `steps/species_distributions/scripts/dist_qq.R`

Run from the trace folder with:

```bash
TRACE_OUTPUT_DIR=runs/<run_id>/species_distributions \
TRACE_IRIS_CSV=data/iris.csv \
  Rscript steps/species_distributions/scripts/dist_qq.R
```
