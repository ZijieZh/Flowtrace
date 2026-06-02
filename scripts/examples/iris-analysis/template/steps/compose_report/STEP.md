---
name: compose_report
description: Assemble all figures, tables, findings into the final report.
display_name: "Compose Report"
reads:
  - runs/<run>/method_compare/
  - runs/<run>/compare_full_vs_cleaned/
writes:
  - runs/<run>/compose_report/report.md
  - runs/<run>/compose_report/report.pdf
---

# Compose Report

_Assemble all figures, tables, and findings into report.md and finalize a PDF; await reviewer sign-off._

## Contract

- **Reads** from:
  - `runs/<run>/method_compare/` (outputs of `method_compare`)
  - `runs/<run>/compare_full_vs_cleaned/` (outputs of `compare_full_vs_cleaned`)
- **Writes**:
  - `runs/<run>/compose_report/report.md`
  - `runs/<run>/compose_report/report.pdf`
