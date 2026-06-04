---
name: hook_rewrite
description: Analyze the opening and offer three stronger hooks (bold statement / story / surprising data).
reads:
  - draft/draft.md
writes:
  - hook_rewrite/hooks.json
---

# Improve Hook

Source skill: content-research-writer (Instructions step 4 — "Improve Hooks": Current Hook
Analysis (what works / what could be stronger / emotional impact), then **three** Suggested
Alternatives — Option 1 bold statement, Option 2 personal story, Option 3 surprising data —
each with a "Why it works", plus the "Questions to hook" check).

Runs in **parallel** with `section_review`; both read the same `draft`. Read the draft's
`## Hook` placeholder, analyze it, then produce exactly three candidate hooks in the skill's
three flavors, each justified, and recommend one for the audience fixed upstream.

## Output: `hooks.json`

```json
{
  "current_analysis": { "works": ["..."], "weaker": ["..."], "emotional_impact": "..." },
  "candidates": [
    { "kind": "bold_statement", "text": "...", "why_it_works": "..." },
    { "kind": "personal_story",  "text": "...", "why_it_works": "..." },
    { "kind": "surprising_data", "text": "...", "why_it_works": "..." }
  ],
  "recommended": "surprising_data",
  "hook_checks": { "creates_curiosity": true, "promises_value": true, "specific": true, "matches_audience": true }
}
```

The recommended hook is consumed by `polish_citations`. Whether it matches the audience is
judged against `understand_project` — change the audience and the recommendation should
change too.
