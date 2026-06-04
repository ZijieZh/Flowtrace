---
name: score_bullets
description: Match parsed resume bullets against the weighted keywords; mark each strong/weak/irrelevant, note transferable skills and gaps.
reads:
  - runs/<run>/extract_keywords/keywords.json
  - runs/<run>/parse_resume/resume_parsed.json
writes:
  - runs/<run>/score_bullets/bullet_scores.json
---

# Score Bullets

Source skill: **tailored-resume-generator** (Experience Mapping).

This is the **fan-in**: it needs *both* the weighted keywords (`extract_keywords`) and the structured resume (`parse_resume`). It cannot start until both upstream branches finish.

## What this step does

For every bullet in `resume_parsed.json`, score relevance against `keywords.json`, then label it and record what's missing.

## Output: `bullet_scores.json`

```json
{
  "bullets": [
    { "id": "exp1_b1", "text": "...",
      "matched_keywords": ["..."], "score": 0.0,
      "verdict": "strong|weak|irrelevant",
      "gap": "what would make it match better" }
  ],
  "coverage": { "must_have_covered": ["..."], "must_have_missing": ["..."] },
  "transferable": ["skills that map across even if not a literal keyword match"]
}
```

## How to approach it

- `score` = weighted overlap with `keywords.json`. A bullet hitting a `must` keyword outranks one hitting two `medium` keywords.
- **verdict**: `strong` (already sells a high-priority keyword), `weak` (relevant but buried / unquantified / vague verb), `irrelevant` (off-domain for this JD).
- **Special Guidance — career-changers**: weight *transferable* skills higher; a bullet that isn't a literal keyword match but demonstrates a must-have capability is `weak`, not `irrelevant`.
- `must_have_missing` feeds `strategic_recommendations` directly — be honest about real gaps, don't paper over them.

## Contributes to (fan-out)

- `rewrite_bullets` — rewrites everything marked `weak`
- `strategic_recommendations` — uses `coverage` + `transferable`
