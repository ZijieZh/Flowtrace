---
name: research_collect
description: Resolve each to-do into a credible source with an extracted fact, quote or datum and a citation.
reads:
  - research_todo/research_todo.json
writes:
  - research_collect/research.json
---

# Conduct Research

Source skill: content-research-writer (Instructions step 3 — "Conduct Research": search
for relevant information, find credible sources, extract key facts / quotes / data, add
citations; the `## Research: ...` → "Key Findings" + numbered "Citations" output block).

Depends on `research_todo`: walk each open to-do and resolve it. For every finding record
the extracted fact or quote, the source, and a citation entry that the later
`polish_citations` step can format.

## Output: `research.json`

```json
{
  "findings": [
    { "todo_id": "rt1", "finding": "...", "kind": "stat|example|quote",
      "citation_id": "C1", "verdict": "supports|kills|qualifies" }
  ],
  "citations": [
    { "id": "C1", "authors": "...", "year": 2025, "title": "...", "publication": "...", "url": "..." }
  ]
}
```

Follow the skill's research Best Practices: verify sources before citing, prefer recent
data, balance perspectives, link originals. A finding may **kill** a to-do's claim — say
so; that is how the piece stays honest rather than promotional.
