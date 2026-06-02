---
name: analyze_patterns
description: Find recurring motifs and emotion trends across the user's dream history.
display_name: "Analyze Patterns"
writes:
  - runs/<run>/analyze_patterns/pattern_analysis.json
  - runs/<run>/analyze_patterns/dream_patterns_report.pdf
---

# Analyze Patterns

Independent entry-point step (no upstream dependencies). Read the user's accumulated dream history and surface recurring symbols, emotion trends, and unconscious themes.

## What this step does

Read `dream_history.json` from the working folder root (a JSON array of past dream summaries, accumulated by past runs of `generate_report`). Produce `pattern_analysis.json` summarizing the patterns. Optionally render a PDF pattern report.

## How to do it

1. Read `dream_history.json`. If the file doesn't exist or has fewer than 3 entries, write a placeholder JSON explaining there's not enough data, and exit gracefully.

2. Compute pattern features:
   - **`symbol_frequency`** — count occurrences of each `key_symbol` across all entries; rank.
   - **`emotion_trend`** — mean, max, min, and direction of `emotion_intensity` over time.
   - **`top_archetypes`** — most frequent Jungian archetype matches (top 3).
   - **`unconscious_themes`** — interpretive synthesis of recurring threads (this part is judgment work; render via the executor's reasoning, not a counter).
   - **`dream_count`** and **`date_range`**.

3. Write `pattern_analysis.json` to the working folder root.

4. Render `dream_patterns_report.pdf` — a brief (1-2 page) report summarizing the patterns. Reuse the rendering approach from `generate_report` if convenient.

## Why this is an independent entry point

Pattern analysis doesn't depend on the current run's dream — it depends on the *accumulated history*. A user who hasn't run analysis 3+ times has no patterns to find. So this step has `from_steps: []` and operates on whatever history is present in the working folder.

In practice, a user might run `gather_context → analyze_dream → ... → generate_report` for one dream, then later run `analyze_patterns` standalone after they've accumulated history.

## Materials in this folder

- `analyze.py` — the pattern computation script. Run it with the working folder as CWD.

## Inputs from the working folder

- `dream_history.json` — accumulated by prior runs of `generate_report`

## What this step contributes

- `pattern_analysis.json` — structured pattern features
- `dream_patterns_report.pdf` — formatted PDF summary
