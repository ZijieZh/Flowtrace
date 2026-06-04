---
name: writing_skills
description: Distill this run's learning into a NEW reusable skill, written back to the library (the GROW writeback).
reads:
  - finish_branch/branch_finish.json
  - root_cause/root_cause.json
writes:
  - new_skill.md
---

# Writing Skills (library writeback)

Source skill: **writing-skills** (*"Writing skills IS Test-Driven Development applied to process
documentation"*; "Create when: technique wasn't intuitively obvious … pattern applies broadly";
SKILL.md structure; CSO description rule — *"Use when…", triggering conditions only, NEVER
summarize the workflow*).

This is the first half of the **GROW loop**. When the run uncovers a class of problem that was
**not** intuitively obvious and **applies broadly** (beyond this one bug), that is exactly
`writing-skills`' bar for "create a skill" — so we write one back to the library. (When the
learning is *only* project-specific, it goes to memory instead — that's the next node's job.)

## What this step does

Author a new, reusable skill (not a narrative of this one bug) following the SKILL.md structure:

- `name` in hyphen-case, verb-first / active (CSO §3 naming).
- `description` starts with **"Use when…"** and lists *triggering symptoms only* — and
   deliberately does **not** summarize the fix (CSO: a workflow summary makes future Claude skip
   the body).
- Core pattern: the before/after, a quick-reference table, common mistakes, and a regression-test
   recipe.
- A `Real-World Impact` line that grounds the skill in the run that produced it without turning
   the skill into a one-off story.

## Output: `new_skill.md`

A deployable `SKILL.md` with valid frontmatter, ready to drop into `skills/`. This is the artifact
that makes "the trace sharpens" literal: a future run that hits the same class of problem can load
this skill instead of re-deriving it.

## Contributes to (fan-out)

- `memory_writeback` — the codebase-specific gotcha (narrower than the general skill).
