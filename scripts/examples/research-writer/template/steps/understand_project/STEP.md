---
name: understand_project
description: Fix the audience / goal / length / style for the whole piece — the judgment every downstream node is computed against.
reads:
  - resources/request.md
writes:
  - understand_project/project.json
---

# Understand the Project

Source skill: content-research-writer (Instructions step 1 — "Understand the Writing
Project": topic & main argument, target audience, desired length/format, goal, existing
sources, writing style).

This is the **root of the trace and the one judgment everything else depends on.** When
the brief deliberately does *not* say who the reader is, resolve the skill's six clarifying
questions into explicit decisions:

- **topic** and **main_argument** (the thesis the piece will defend)
- **audience** — *infer* it from the angle the brief takes and state it outright (who they
  are, what they already know, what they want from the piece).
- **goal** — educate / persuade / entertain / explain — chosen from the brief, not assumed.
- **length_format** and **style** (tone, POV, person)
- **call_to_action** the reader should take

## Output: `project.json`

```json
{
  "topic": "...",
  "main_argument": "...",
  "audience": { "who": "...", "what_they_know": "...", "what_they_want": "..." },
  "goal": "persuade|educate|explain|entertain",
  "length_format": "...",
  "style": { "tone": "...", "person": "...", "pov": "..." },
  "call_to_action": "...",
  "source_questions_resolved": ["topic", "audience", "length", "goal", "sources", "style"]
}
```

## Why this node is the steerable one

`outline`, `research_todo`, every drafted section, the hook, the section review, the
voice pass and the citation polish all read this brief. The audience and goal here decide
which sections exist, which claims get sourced, and how the hook lands. Change `audience`
and **every transitive dependent goes stale** — that is exactly the steer this trace
exists to demonstrate. `flowtrace show --downstream understand_project` lists the set that
would need to re-run.
