---
name: draft
description: Write the body section by section against the locked outline and sourced research.
reads:
  - outline_final/outline_final.json
writes:
  - draft/draft.md
---

# Draft Sections

Source skill: content-research-writer (Instructions step 2 "Main Sections" written out +
the "Blog Post Workflow": *write introduction → write body sections → write conclusion*,
one section at a time).

Depends on `outline_final`. Write the full body in markdown — hook placeholder, intro,
each locked section in order, conclusion — pulling each section's beats and evidence
(`[C1]`-style inline markers) from the final outline. Hold the audience and goal from the
project brief in every paragraph: lead each section with what the fixed reader most needs
from it, and back every load-bearing claim with the sourced numbers.

Leave hook polish, the section-level critique, the voice pass and citation formatting to
the downstream nodes — this node's job is a complete, evidence-anchored first draft.

## Output: `draft.md`

A markdown draft with a `# Title`, a `## Hook` placeholder paragraph, an introduction,
each `## Section` with its sourced claims and inline `[Cn]` citation markers, and a
`## Conclusion` carrying the call to action. Every load-bearing number traces to a
citation id from `research.json`.
