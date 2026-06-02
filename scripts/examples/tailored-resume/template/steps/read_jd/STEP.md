---
name: read_jd
description: Parse the target job description into role, responsibilities, and must-have vs nice-to-have requirements.
reads:
  - inputs.job_description
writes:
  - runs/<run>/read_jd/jd_parsed.json
---

# Read JD

The JD-side ingest of the skill's **Information Gathering** + the front half of **Job Analysis**. Turn a raw job posting into a structured object the rest of the pipeline can reason over.

## What this step does

Read the raw `job_description` and extract:

- `role` — title + seniority + team/domain
- `responsibilities` — what the person will actually do
- `must_have` — hard requirements (knock-out if absent)
- `nice_to_have` — bonus / differentiators

Separate **must-have from nice-to-have** explicitly — this priority split is what downstream scoring and the recommendations branch depend on.

## Output: `jd_parsed.json`

```json
{
  "role": { "title": "...", "seniority": "...", "domain": "..." },
  "responsibilities": ["..."],
  "must_have": ["..."],
  "nice_to_have": ["..."]
}
```

## How to approach it

- Don't paraphrase loosely — keep the JD's own phrasing for requirements, because `extract_keywords` will mine exact ATS terms from this.
- If the JD blurs must vs nice ("ideally", "a plus", "bonus"), classify by signal words: "required/must/strong" → must_have; "a plus/nice/ideally/bonus" → nice_to_have.

## Contributes to

`extract_keywords` (keyword mining) and — transitively, via keywords — `score_bullets`, `reorder_format`, and `strategic_recommendations`.
