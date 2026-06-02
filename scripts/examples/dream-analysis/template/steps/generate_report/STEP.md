---
name: generate_report
description: Compose the final markdown report and render to PDF.
display_name: "Compose Report"
reads:
  - runs/<run>/analyze_dream/
  - runs/<run>/generate_dream_image/
writes:
  - runs/<run>/generate_report/dream_report.pdf
  - runs/<run>/generate_report/dream_report.md
  - runs/<run>/generate_report/dream_history.json
---

# Compose Report

Compose the analysis JSON and imagery into a polished Markdown report, then render to PDF.

## What this step does

Read `dream_analysis.json` and (if present) `dream_image.png` from the working folder. Compose a structured Markdown report at `dream_report.md`, render to PDF at `dream_report.pdf`. Append a summary entry to `dream_history.json` for cross-dream pattern analysis later.

## Report structure

1. Title page (from `dream_title`, with type label)
2. Emotional palette visualization (from `emotional_tone` and intensity)
3. Imagery panel (if `dream_image.png` exists)
4. Key symbols table (from `key_symbols`)
5. Three-framework analysis sections
6. Personalized insight (connection to user's life context)
7. Core message (callout)
8. Life connection and action suggestion
9. Closing encouragement

If `dream_history.json` exists in the working folder (from prior runs the user has uploaded back), append a "your dream patterns so far" section to the report.

After rendering, append the current dream's summary entry to `dream_history.json`. If the file doesn't exist yet, create it.

## Materials in this folder

- `render.py` — the rendering script. Run it with the working folder as CWD; it reads `dream_analysis.json` and writes `dream_report.md` + `dream_report.pdf`.
- `report.css` — stylesheet used by WeasyPrint for the PDF rendering.
- `template.md.j2` — Jinja2 template for the Markdown report.

The executor can either run `render.py` as-is or rewrite it to use a different rendering pipeline (pandoc, typst, manual). The STEP.md is the contract; the code is one valid implementation.

## How to invoke

```bash
cd /path/to/working/folder
python /path/to/trace/steps/generate_report/render.py
```

(Adjust paths as needed. Or copy the script into the working folder first.)

## Inputs from upstream

- `dream_analysis.json` — written by `analyze_dream`
- `dream_image.png` — written by `generate_dream_image` (optional; report tolerates absence)

## What this step contributes

- `dream_report.pdf` — the polished PDF report (final deliverable)
- `dream_report.md` — the Markdown source (also delivered)
- `dream_history.json` — appended-to summary log (final deliverable for users tracking patterns)
