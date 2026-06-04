---
name: parse_resume
description: Ingest the candidate's existing resume into structured work history, education, skills, certifications, and achievements.
reads:
  - inputs.resume_before
writes:
  - runs/<run>/parse_resume/resume_parsed.json
---

# Parse Resume

Source skill: **tailored-resume-generator** (Information Gathering — the candidate side).

The candidate-side ingest. Runs **in parallel with `read_jd`** — it depends only on the existing resume, not on the JD.

## What this step does

Read the raw `resume_before` and break it into addressable units, so every bullet can be individually scored and rewritten downstream.

## Output: `resume_parsed.json`

```json
{
  "contact": { "name": "...", "email": "...", "links": ["..."] },
  "summary": "...",
  "experience": [
    { "company": "...", "title": "...", "dates": "...",
      "bullets": [ { "id": "exp1_b1", "text": "..." } ] }
  ],
  "education": [ { "degree": "...", "school": "...", "year": "..." } ],
  "skills": ["..."],
  "certifications": ["..."]
}
```

## How to approach it

- Give every bullet a **stable `id`** (`exp1_b1`, `exp1_b2`, …). Scoring, rewriting, and reordering all reference these ids — they are the spine of the run.
- Capture verbatim; do not improve anything here. This step only *structures*. Improvement happens in `rewrite_bullets`.
- Preserve gaps (missing metrics, vague verbs) faithfully — those are exactly what `score_bullets` needs to detect.

## Contributes to

`score_bullets` (fans in alongside `extract_keywords`).
