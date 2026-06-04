---
name: voice_check
description: Apply the review as suggestions not rewrites; keep the writer's tone and POV intact.
reads:
  - section_review/section_review.json
writes:
  - voice_check/voice_check.json
---

# Preserve Voice

Source skill: content-research-writer (Instructions step 6 — "Preserve Writer's Voice":
learn their style, **suggest don't replace**, match tone, respect their choices, enhance
don't override; the periodic "Does this sound like you?" check).

Depends on `section_review`. Triage each proposed edit: **accept** (a real clarity/evidence
fix that keeps the voice), **soften** (apply the intent but in the writer's words), or
**reject** (correct in the abstract but flattens the voice or POV). The target style — its
tone, person and POV — comes from `understand_project`.

## Output: `voice_check.json`

```json
{
  "style_target_ref": "understand_project/project.json",
  "decisions": [
    { "edit_ref": "s1.line_edits[0]", "verdict": "accept|soften|reject",
      "rationale": "...", "applied_text": "..." }
  ],
  "voice_notes": ["what to protect: contrarian POV, first-person asides, ..."],
  "sounds_like_you": true
}
```

The accepted/softened edits and voice notes are handed to `polish_citations` to apply.
This is where the skill's "enhance, don't override" principle keeps the section review from
homogenizing the piece.
