---
name: outlier_consensus
description: Cross-tag the three outlier methods. Run after all three.
display_name: "Outlier Consensus"
reads:
  - runs/<run>/outlier_iqr/
  - runs/<run>/outlier_zscore/
  - runs/<run>/outlier_mahalanobis/
writes:
  - runs/<run>/outlier_consensus/outlier_consensus.csv
  - runs/<run>/outlier_consensus/outlier_consensus_venn.png
---

# Outlier Consensus

_Cross-tag the three outlier sets; build a Venn diagram of agreement._

## Contract

- **Reads** from:
  - `runs/<run>/outlier_iqr/` (outputs of `outlier_iqr`)
  - `runs/<run>/outlier_zscore/` (outputs of `outlier_zscore`)
  - `runs/<run>/outlier_mahalanobis/` (outputs of `outlier_mahalanobis`)
- **Writes**:
  - `runs/<run>/outlier_consensus/outlier_consensus.csv`
  - `runs/<run>/outlier_consensus/outlier_consensus_venn.png`

## Implementation hint

Canonical visual produced by: `steps/outlier_consensus/scripts/outlier_consensus_venn.R`

Run from the trace folder with:

```bash
TRACE_OUTPUT_DIR=runs/<run_id>/outlier_consensus \
TRACE_IRIS_CSV=data/iris.csv \
  Rscript steps/outlier_consensus/scripts/outlier_consensus_venn.R
```
