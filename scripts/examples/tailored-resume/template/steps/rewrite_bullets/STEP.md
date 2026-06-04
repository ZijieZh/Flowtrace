---
name: rewrite_bullets
description: Rewrite low-scoring bullets to surface relevant impact with quantified results, no fabrication; craft the tailored summary.
reads:
  - runs/<run>/score_bullets/bullet_scores.json
  - runs/<run>/parse_resume/resume_parsed.json
writes:
  - runs/<run>/rewrite_bullets/bullets_rewritten.json
---

# Rewrite Bullets

Source skill: **tailored-resume-generator** (Resume Structure — the content half).

Take everything `score_bullets` marked `weak` and rewrite it to surface relevant impact — plus craft a tailored professional summary.

## What this step does

For each `weak` bullet, produce a rewrite that foregrounds the JD-relevant signal already present in the candidate's history. Leave `strong` bullets alone; drop/deprioritize `irrelevant` ones (handled in `reorder_format`).

## Output: `bullets_rewritten.json`

```json
{
  "summary": "tailored professional summary, 2-3 lines, role-aimed",
  "rewrites": [
    { "id": "exp1_b1", "before": "...", "after": "...",
      "keywords_surfaced": ["..."], "rationale": "..." }
  ]
}
```

## Best Practices (hard constraints from the skill — enforce, don't bend)

- **No fabrication.** Only reframe what the candidate actually did. If a metric isn't known, use a defensible qualitative impact, never an invented number.
- **Quantify** wherever a real number exists (latency %, throughput, # of users, $ saved).
- No first-person pronouns. Strong past-tense action verbs. Concise.

## Special Guidance (profile-conditioned emphasis)

- **Senior execs** → lead with strategic/business impact, not implementation detail.
- **Career-changers** → phrase transferable skills in the target domain's language.

## Contributes to

`reorder_format` (final assembly).
