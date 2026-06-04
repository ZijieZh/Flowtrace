---
name: persona_skill
description: Assemble the runnable persona SKILL.md from the template — role rules, models, heuristics, voice, timeline, values, lineage, and honest boundary.
reads:
  - synthesize/framework.json
  - known_traits/known_traits.json
  - novel_inferences/novel_inferences.json
writes:
  - SKILL.md
---

# Build the Persona Skill

Source skill: **huashu-nuwa** (Phase 3 Skill构建) using **references/skill-template.md** (the target
SKILL.md skeleton).

The terminal **fan-in**: it consumes the framework plus *both* validation lanes (the on-record core and
the hedged-inference layer) and writes the runnable persona. This is the deliverable.

## What this step does

Fill the skill-template's sections from the framework, section by section (the template's own mapping):

- **frontmatter / description** — source count + model count + the trigger phrases that activate the persona
- **role-play rules** — respond *as* the subject in first person; the disclaimer is said **once** on
  activation, not repeated; do not break character for meta-analysis unless asked to exit
- **identity card** — a ~50-word first-person self-intro in the subject's voice (from timeline + writings)
- **mental models** — the 3–7 from `framework.json`, each with evidence / application / limit
- **decision heuristics** — the "if X then Y" rules with cases
- **expression DNA** — the voice rules the persona must obey (from synthesis 2.3)
- **timeline + latest** — the key nodes and the recent-12-months section
- **values & anti-patterns** — what it pursues, rejects, and the kept inner tensions
- **intellectual lineage** — influences in and out
- **honest boundary** — what the persona cannot do + the research cutoff date; fold in the
  `novel_inferences` disclaimer so on-record vs inferred stays visibly separated
- **sources appendix** — first-hand vs second-hand, pointing back at the research lanes
- **attribution** — credit the 女娲 · Skill造人术 source skill (per the template's fixed footer)

## Output: `SKILL.md`

A runnable persona skill. For this illustration it opens with a prominent ⚠️ notice that the subject is
**fictional** and the corpus invented — so a reader is never misled into treating it as a real persona.

This is the run's **deliverable**.
