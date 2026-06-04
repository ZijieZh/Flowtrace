---
name: outline
description: Structure hook → intro → main sections → conclusion for the fixed audience and goal.
reads:
  - understand_project/project.json
writes:
  - outline/outline.json
---

# Collaborative Outline

Source skill: content-research-writer (Instructions step 2 — "Collaborative Outlining":
the `# Article Outline` skeleton — Hook, Introduction, Main Sections with key points +
"[Research needed]" markers, Conclusion with call to action).

Runs in **parallel** with `research_todo`; both read only `understand_project`. The
outline's section choices follow directly from the audience and goal fixed upstream — a
different reader or goal would put different sections first.

Produce the skill's outline structure: a hook slot, an introduction (context / problem /
what the piece covers), 3–5 main sections each with key points and a `research_needed`
marker, and a conclusion with the call to action.

## Output: `outline.json`

```json
{
  "framing_ref": "understand_project/project.json",
  "hook": { "slot": "...", "why_reader_cares": "..." },
  "introduction": ["context", "problem", "what_this_covers"],
  "sections": [
    { "id": "s1", "title": "...", "key_points": ["..."], "research_needed": ["..."] }
  ],
  "conclusion": { "summary": "...", "call_to_action": "..." }
}
```
