---
name: rhythm_table
description: Plan the slide sequence & pacing BEFORE layout — one row per slide with its theme (light / dark / hero) so hero pages set the rhythm.
reads:
  - intake/brief.json
  - choose_style/style_decision.json
writes:
  - rhythm_table/rhythm.json
---

# Rhythm Table

Source skill: **op7418/guizang-ppt-skill** (歸藏) — `SKILL.md` *Step 3.0.5 · 规划主题节奏 (Plan Theme
Rhythm)* and the README's rule *"先做主题节奏表,再从对应 layout 骨架里挑、粘、改文案"* (build the theme-rhythm
table FIRST, then pick layouts). The pacing rules lifted: map every slide's theme before writing HTML;
**no 3+ consecutive same-theme slides**; in an 8+ page deck require **≥1 hero**; insert ~1 hero per 3–4
regular slides ("hero pages set the rhythm"). **Workflow-only lift — our own prose; no source text is
copied.**

This is a judgment node and it runs **before** `select_layouts` on purpose: pacing is decided over the
whole deck, then each slide gets a layout that fits its assigned theme — not the other way round.

## What this step does

Turn the brief's ordered `beats` into a **slide-by-slide table** within the page budget. For each slide:

- `n` — slide number (1 … page_budget).
- `beat` — which argument beat it carries (cover / closing are structural).
- `theme` — one of `light`, `dark`, `hero-light`, `hero-dark`.
- `role` — `cover | argument | data | quote | contrast | closing` (a hint, not yet a layout).

Then enforce the pacing rules and record the check.

## Output: `rhythm.json`

```json
{
  "page_budget": 0,
  "slides": [
    { "n": 1, "beat": "cover",   "theme": "hero-dark", "role": "cover" }
  ],
  "rhythm_rules": {
    "no_3_consecutive_same_theme": true,
    "hero_count": 0,
    "hero_cadence": "≈1 per 3–4 slides"
  }
}
```

## How to approach it

- Open on a hero, close on a hero; let the heaviest beat (the worked contrast) land on its own page.
- Alternate light/dark so no run of three shares a theme — verify it and store the boolean, because
  `self_validate` re-checks it.
- Keep the row count at the page budget; if a beat won't fit, merge — don't overflow.

## Contributes to

`select_layouts` (each row's theme + role constrains the layout) and `image_prompts` (hero rows are the
slots that get prompts). Re-pacing here invalidates both, then `assemble_deck`.
