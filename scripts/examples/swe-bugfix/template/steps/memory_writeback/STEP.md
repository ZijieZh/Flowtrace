---
name: memory_writeback
description: Record the codebase-specific gotcha in memory.md so the next run skips this dead-end (the GROW memory).
reads:
  - writing_skills/new_skill.md
  - root_cause/root_cause.json
writes:
  - memory.md
---

# Memory Writeback

Source skill: **writing-skills** ("Don't create [a skill] for project-specific conventions —
put in CLAUDE.md / memory" — the explicit split between a *broadly reusable skill* and a
*project-specific note*) + **systematic-debugging** ("When Process Reveals 'No Root Cause' …
Document what you investigated; add monitoring for future investigation" — capture the learning).

This is the second half of the **GROW loop**, and the narrower one. `writing_skills` produced the
*general* technique; this node records the **codebase-specific** fact that does **not** belong in
a portable skill but is precisely what saves the next run from a dead-end.

## What this step does

Append to `memory.md` an accumulated-learning entry capturing the gotcha *for this repo*:

- which module / location was at fault,
- the **tell** — the specific signal in the logs / code that fingerprints this bug,
- where else the same shape lurks in this codebase (the other paths worth auditing),
- the **dead-end to skip next time** (the plausible-but-wrong fix this run ruled out, and why),
- a pointer to the new general skill and to this ticket.

## Output: `memory.md`

A real accumulated-learning note. On the **next** run of this trace against a related bug, the
`systematic-debugging` lane reads this first and skips straight past the ruled-out dead-end —
which is the whole point of the loop: same trace, run again, sharper.

## Closes

- the run's deliverable (fix + root cause + new skill + this memory).
