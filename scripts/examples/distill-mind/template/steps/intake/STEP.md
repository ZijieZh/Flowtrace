---
name: intake
description: Frame the persona brief — who is being distilled, the focus dimension, the intended use, and whether local corpus is supplied.
reads:
  - resources/request.md
writes:
  - persona_brief.json
---

# Persona Intake

Source skill: **huashu-nuwa** (Phase 0A 需求澄清 — the direct-path clarification: who/what is the
subject, full portrait vs a focused dimension, the intended use, new-vs-update, and the local-corpus
question) + the 核心理念 framing (distill **HOW they think** — mental models, decision heuristics,
expression DNA, anti-patterns, honest boundary — not WHAT they said).

The root node. Read `request.md` and turn the ask into a structured **persona brief** the six research
lanes can all read from:

- `subject` — who/what is being distilled (and, for this illustration, that it is a fictional figure)
- `focus` — full portrait vs a specific dimension to concentrate on
- `intended_use` — thinking advisor / decision reference / role-play
- `mode` — new build vs update; and the **corpus mode** (pure web-search default, local-corpus-first,
  or pure-local) per Phase 1's mode table
- `research_plan` — the six standard lanes (writings / conversations / expression-DNA / external /
  decisions / timeline) and what each must look for
- `rules` — the skill's own guardrails carried verbatim (HOW-not-WHAT; keep contradictions; honest-60-
  over-fake-90), since the verify and synthesis nodes test against them

Everything downstream reads from this. Write `persona_brief.json`. This is a *framing* step — it does
no distillation itself.
