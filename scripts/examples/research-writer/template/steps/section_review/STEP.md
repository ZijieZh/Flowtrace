---
name: section_review
description: Review every section for clarity, flow, evidence and style; record concrete line edits.
reads:
  - draft/draft.md
writes:
  - section_review/section_review.json
---

# Section-by-Section Review

Source skill: content-research-writer (Instructions step 5 — "Provide Section-by-Section
Feedback": the `# Feedback: [Section]` block — What Works Well, then Suggestions under
**Clarity / Flow / Evidence / Style**, plus **Specific Line Edits** original → suggested →
why).

Runs in **parallel** with `hook_rewrite`; both read the same `draft`. For each drafted
section, record what works and concrete improvements bucketed into the skill's four axes,
and capture the highest-value line edits as original/suggested/why triples.

## Output: `section_review.json`

```json
{
  "sections": [
    { "id": "s1", "title": "...",
      "works": ["..."],
      "clarity": ["issue → fix"], "flow": ["..."], "evidence": ["claim → add source"], "style": ["..."],
      "line_edits": [ { "original": "...", "suggested": "...", "why": "..." } ] }
  ],
  "overall": "..."
}
```

Feedback is keyed to the audience and goal from `understand_project`: what counts as an
"evidence" or "clarity" fix depends on who the reader is and what they came for. This
review feeds `voice_check`, which decides which edits to apply without flattening the
writer's voice.
