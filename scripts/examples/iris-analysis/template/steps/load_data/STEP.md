---
name: load_data
description: Read iris.csv and report row count, column types, head. Use as the trace's data entry point.
display_name: "Load Dataset"
reads:
  - inputs.dataset_path
writes:
  - runs/<run>/load_data/data_preview.json
---

# Load Dataset

_Read iris.csv and report row count, column types, and first-5 preview._

## Contract

- **Reads** from:
  - `inputs.dataset_path`
- **Writes**:
  - `runs/<run>/load_data/data_preview.json`
