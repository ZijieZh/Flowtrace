---
name: strategic_recommendations
description: Analyze competitive strengths, flag unmet requirements with solutions, suggest interview talking points and cover-letter hooks.
reads:
  - runs/<run>/extract_keywords/keywords.json
  - runs/<run>/score_bullets/bullet_scores.json
writes:
  - runs/<run>/strategic_recommendations/recommendations.md
---

# Strategic Recommendations

Source skill: **tailored-resume-generator** (Strategic Recommendations).

A **parallel terminal branch** — it depends on the keywords and the scoring, **not** on the formatted resume, so it runs alongside `rewrite_bullets`/`reorder_format`, not after them.

## What this step does

Step back from the document and advise the candidate on positioning for *this* role.

## Output: `recommendations.md`

Four sections:

1. **Competitive strengths** — where this candidate is genuinely strong for this JD (from `strong` bullets + `transferable`).
2. **Unmet requirements + solutions** — each `must_have_missing` keyword, paired with an honest mitigation (adjacent experience to lean on, a quick upskilling move, how to address it in interview).
3. **Interview talking points** — 3–5 specific stories the resume implies that are worth preparing.
4. **Cover-letter hooks** — 1–2 openings that connect the candidate's real history to the role's core need.

## How to approach it

- Be honest about gaps — this branch is the one place the system tells the truth about what's *missing*, not just what to emphasize. Pairing every gap with a solution is the value.
- Stay grounded in `bullet_scores.json`; don't invent strengths the scoring didn't find.

## Contributes to

The **deliverable** (secondary output: interview-prep guidance alongside the resume).
