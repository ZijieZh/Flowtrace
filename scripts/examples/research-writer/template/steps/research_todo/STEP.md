---
name: research_todo
description: Enumerate every claim and datum that must be sourced, framed for the fixed audience and angle.
reads:
  - understand_project/project.json
writes:
  - research_todo/research_todo.json
---

# Research To-Do

Source skill: content-research-writer (Instructions step 2 — "Collaborative Outlining",
the **Research To-Do** subsection: `- [ ] Find data on [topic]` / `- [ ] Get examples of
[concept]` / `- [ ] Source citation for [claim]`).

Depends on `understand_project`: the audience and main argument decide *which* claims are
load-bearing and therefore worth sourcing — the framing fixed upstream determines which
facts must not be hand-waved and which are merely nice-to-have.

For each to-do, capture the claim, what kind of evidence would settle it (market data /
example / expert quote), and which outline section it feeds.

## Output: `research_todo.json`

```json
{
  "framing_ref": "understand_project/project.json",
  "todos": [
    { "id": "rt1", "claim": "...", "evidence_needed": "market_data|example|quote",
      "feeds_section": "...", "status": "open" }
  ]
}
```

Be honest about what is still vaporware — a to-do can exist to *kill* a claim, not just
support it.
