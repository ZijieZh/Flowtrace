---
name: schema_validate
description: Confirm 5 columns with expected types and zero nulls.
display_name: "Validate Schema"
reads:
  - runs/<run>/load_data/
writes:
  - runs/<run>/schema_validate/schema_report.json
  - runs/<run>/schema_validate/data_dictionary.md
---

# Validate Schema

_Confirm 5 columns with expected types and zero nulls; flag any drift from the documented schema._

## Contract

- **Reads** from:
  - `runs/<run>/load_data/` (outputs of `load_data`)
- **Writes**:
  - `runs/<run>/schema_validate/schema_report.json`
  - `runs/<run>/schema_validate/data_dictionary.md`
