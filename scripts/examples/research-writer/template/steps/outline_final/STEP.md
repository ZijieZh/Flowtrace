---
name: outline_final
description: Fold the research back into the outline; close gaps, fix flow, lock section order.
reads:
  - outline/outline.json
  - research_collect/research.json
writes:
  - outline_final/outline_final.json
---

# Iterate Outline

Source skill: content-research-writer (Instructions step 2 — "Iterate on outline": adjust
based on feedback, ensure logical flow, identify research gaps, mark sections for deep
dives).

This is the **first fan-in**: it needs *both* the draft outline (`outline`) and the
compiled research (`research_collect`). It cannot start until both upstream branches
finish.

Attach each finding to its section, drop or reframe any claim the research **killed**,
resolve every `research_needed` marker (or flag it as an explicit open gap), and lock the
section order for drafting.

## Output: `outline_final.json`

```json
{
  "framing_ref": "understand_project/project.json",
  "sections": [
    { "id": "s1", "title": "...", "beats": ["..."],
      "evidence": ["C1", "C2"], "status": "ready|open_gap" }
  ],
  "conclusion": { "summary": "...", "call_to_action": "..." },
  "changes_from_draft": ["what moved / merged / got cut and why"]
}
```

Locking the order here is what lets `draft` write section by section without re-deciding
structure — and what makes a later change to the audience cascade cleanly.
