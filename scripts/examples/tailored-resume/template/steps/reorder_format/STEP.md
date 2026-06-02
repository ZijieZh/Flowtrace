---
name: reorder_format
description: Reorder sections/bullets by relevance and apply ATS-safe formatting; render the final tailored resume.
reads:
  - runs/<run>/rewrite_bullets/bullets_rewritten.json
  - runs/<run>/extract_keywords/keywords.json
  - runs/<run>/score_bullets/bullet_scores.json
  - runs/<run>/parse_resume/resume_parsed.json
writes:
  - runs/<run>/reorder_format/resume_after.md
---

# Reorder & Format

The skill's **ATS Optimization** + the ordering half of **Resume Structure**. This is a **join**: it consumes the rewritten bullets *and* the keywords directly (the `extract_keywords → reorder_format` edge exists precisely because ATS keyword incorporation happens here, at format time).

## What this step does

Assemble the final resume: rewritten bullets + untouched strong bullets, reordered by relevance, irrelevant bullets dropped or demoted, formatted ATS-safe.

## Output: `resume_after.md`

A clean Markdown resume:

- Standard section headings (`Summary`, `Skills`, `Experience`, `Education`) — ATS parsers expect these exact words.
- JD keywords incorporated naturally (from `keywords.json`); acronyms expanded on first use via `aliases`.
- Bullets ordered so the highest-`score` ones lead each role.
- No tables, columns, or graphics — clean linear layout.

## Special Guidance (section ordering by candidate profile)

- **Recent grads** → Education before Experience.
- **Technical roles** → a prominent Skills section near the top.
- **Creative roles** → include a portfolio link, but keep the layout ATS-parseable (no images/columns).

## Best Practices

- Drop irrelevant older positions rather than padding. No "references available upon request." Proofread.

## Contributes to

The **deliverable** (`resume_after.md` is the primary output).
