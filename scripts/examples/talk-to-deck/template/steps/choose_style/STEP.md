---
name: choose_style
description: The first, governing judgment — pick the visual system (Style A editorial × e-ink, or Style B Swiss international) from the brief.
reads:
  - intake/brief.json
writes:
  - choose_style/style_decision.json
---

# Choose Style

Source skill: **op7418/guizang-ppt-skill** (歸藏) — `SKILL.md` *Step 1 · 需求澄清*, the **first
clarification question** ("Style A or B?", which the skill makes *before* any other decision because it
selects the template, the layout library, and the theme file) and the two systems' guiding principles
(*Style A: Editorial × E-Ink — restraint over spectacle, structure over decoration*; *Style B: Swiss
International — single anchor color, extreme contrast, sans-serif only, right angles*). **Workflow-only
lift — our own prose; no source text is copied.**

This is the node the headline steer rides on. In the source skill, the A/B choice is the first question
asked because everything downstream forks on it — so here it is its own node, and re-deciding it
invalidates `rhythm_table`, `select_layouts`, and `assemble_deck` (run `flowtrace show --downstream
choose_style`).

## What this step does

Read `brief.json` and **choose A or B**, with reasons drawn from the brief — not assumed:

- **Style A — editorial × e-ink:** warm paper, serif headlines, generous whitespace, image-as-citizen.
  Fits narrative / argumentative / personal-voice talks where tone matters.
- **Style B — Swiss international:** sans-serif, one accent color, hard grid, extreme title-to-body
  contrast, no gradient / shadow / radius. Fits factual / product / data-dense decks.

Then resolve the brief's `theme_hint` to **one named preset** of the chosen style (the skill forbids
custom hex — you pick a preset, not a colour).

## Output: `style_decision.json`

```json
{
  "style": "A" ,
  "style_name": "editorial-eink",
  "theme_preset": "...",
  "accent": "#...",
  "rationale": ["why this style beats the other for THIS brief"],
  "rejected": { "style": "B", "why": "..." },
  "downstream_locked": ["rhythm_table", "select_layouts", "assemble_deck"]
}
```

## How to approach it

- Decide from signal in the brief: audience, content type (argument vs data), and tone hint. State why the
  **rejected** style would have been wrong here — that contrast is what makes the steer legible.
- Pick exactly one theme preset; carry its accent colour forward so `assemble_deck` and `social_cover`
  share one anchor.

## Contributes to

`rhythm_table` (which pacing rules apply), `select_layouts` (which layout library), `assemble_deck`
(template + theme), and `social_cover` (shared accent).
