---
name: format_report
description: Render synthesis into HTML + markdown with citations.
display_name: "Format Report"
reads:
  - runs/<run>/synthesize/
writes:
  - runs/<run>/format_report/report.pdf
  - runs/<run>/format_report/report.md
---

# Format Report

Take the synthesis draft and turn it into a polished final report — resolve citations, render PDF, copy a clean Markdown alongside.

## What this step does

Read `synthesis.md` and `sources.json`. Resolve `[src_NNN]` citation markers into proper inline citations and a bibliography section. Render to PDF. Save the cleaned Markdown alongside.

## How to do it

1. Read `synthesis.md` (the synthesis draft with `[src_NNN]` markers).
2. Read `sources.json` to look up each source's full citation info.
3. Replace `[src_NNN]` markers with formatted inline citations (e.g., `(Lastname, Year)` or `[1]`, `[2]` — author's choice of style).
4. Append a bibliography section at the end of the document, listing all cited sources in order of first appearance.
5. Save the final Markdown as `report.md`.
6. Render to PDF via WeasyPrint and save as `report.pdf`.

## Materials in this folder

- `format.py` — the citation-resolution and rendering script. Reads `synthesis.md` and `sources.json` from the working folder; writes `report.md` and `report.pdf`.
- `report.css` — stylesheet for PDF rendering.

The script uses a numbered citation style by default. To switch to author-year, edit `format.py`'s `CITATION_STYLE` constant.

## Why this is a separate step from `synthesize`

Synthesis is judgment. Citation formatting is mechanical. They benefit from separate execution paths — synthesis can be re-done without re-formatting; formatting can be tweaked (different style) without touching the synthesis.

## Inputs from upstream

- `synthesis.md` — from `synthesize`
- `sources.json` — from `gather_sources` (referenced for citation resolution)

## What this step contributes

- `report.pdf` — final rendered report
- `report.md` — final Markdown with resolved citations and bibliography
