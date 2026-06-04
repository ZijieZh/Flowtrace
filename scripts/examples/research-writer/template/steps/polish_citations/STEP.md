---
name: polish_citations
description: Apply the chosen hook and voice-checked edits, format citations and a references list, final polish.
reads:
  - voice_check/voice_check.json
  - hook_rewrite/hooks.json
writes:
  - polish_citations/report.md
---

# Polish + Citations

Source skill: content-research-writer (Instructions step 7 — "Citation Management":
inline / numbered / footnote styles + a running `## References` list — composed with
step 8 "Final Review and Polish" line-level polish).

This is the **second fan-in**: it needs *both* the voice-checked edits (`voice_check`) and
the recommended hook (`hook_rewrite`). Assemble the publication-ready piece:

1. Swap in the recommended hook from `hooks.json`.
2. Apply every `accept`/`soften` decision from `voice_check.json`; skip the `reject`s.
3. Convert the draft's `[Cn]` markers to the chosen citation style and emit a numbered
   `## References` section listing each source.
4. Final polish: transitions, parallelism, kill repetition, tighten the conclusion.

## Output: `report.md`

The full, publishable deep-dive in the writer's voice: the chosen hook, intro, all
sections with formatted inline citations, a conclusion with the call to action, and a
numbered `## References` list. This is the run's headline deliverable. Add a small
`> source:` HTML comment or front-note tying it back to the project brief is optional;
the references list is mandatory.
