---
name: extract_keywords
description: From the parsed JD, pull ranked hard skills, soft skills, and ATS keywords the posting weights, tagged by priority.
reads:
  - runs/<run>/read_jd/jd_parsed.json
writes:
  - runs/<run>/extract_keywords/keywords.json
---

# Extract Keywords

The back half of the skill's **Job Analysis**. Turn the parsed JD into a **weighted keyword set** — the single artifact most of the pipeline scores and formats against.

## What this step does

Mine `jd_parsed.json` for the terms an ATS and a human screener actually reward, and assign each a weight from its priority in the JD.

## Output: `keywords.json`

```json
{
  "keywords": [
    { "term": "...", "type": "hard|soft|domain", "priority": "must|high|medium",
      "weight": 1.0, "aliases": ["..."] }
  ]
}
```

- `weight`: must ≈ 1.0, high ≈ 0.7, medium ≈ 0.4 — used directly by `score_bullets`.
- `aliases`: capture acronym/full-term pairs ("PostgreSQL" / "Postgres"; "CI/CD"). `reorder_format` uses these to expand acronyms ATS-safely.

## How to approach it

- Weight by **must_have vs nice_to_have** from the JD, not by your own sense of importance.
- Keep the JD's exact surface forms — ATS matches strings, not meanings.

## Contributes to (note: this is a fan-out node)

- `score_bullets` — scores each bullet against these weights
- `reorder_format` — incorporates keywords naturally + expands acronyms (this is why there is a **direct** `extract_keywords → reorder_format` edge, not just a transitive path)
- `strategic_recommendations` — unmet must-have keywords become the "gaps with solutions"
