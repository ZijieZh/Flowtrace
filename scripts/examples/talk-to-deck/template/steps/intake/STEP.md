---
name: intake
description: Frame the deck — ingest the talk's source content and the short brief (audience, duration→page budget, must-keep points, theme, image needs).
reads:
  - inputs.request
writes:
  - intake/brief.json
---

# Intake

Source skill: **op7418/guizang-ppt-skill** (歸藏) — `SKILL.md` *Step 1 · 需求澄清 (Requirement
Clarification)* and its seven clarification questions (audience & context, duration → page count,
existing materials, screenshots, color theme, hard constraints). **Workflow-only lift — our own
prose; no source text is copied.**

The root. Read the raw `request` (the talk's content + the brief) and normalize it into one object the
rest of the pipeline reasons over. This is a *read*, not a design judgment — `choose_style` makes the
first call.

## What this step does

Extract from the request:

- `talk` — title, speaker, venue, the ordered **argument beats** (the spine the deck must carry).
- `audience` — who's in the room and the setting (affects tone + contrast).
- `duration_min` + `page_budget` — map duration to a slide count (the skill's *~15 min ≈ 10 pages*).
- `must_keep` — phrases / facts that MUST appear (knock-out if dropped).
- `avoid` — topics / claims to exclude.
- `images` — what visual material exists (here: none → placeholder blocks + prompts only).
- `theme_hint` — any color-theme preference, kept as a hint for `choose_style` to resolve to a preset.

## Output: `brief.json`

```json
{
  "talk": { "title": "...", "speaker": "...", "venue": "...", "beats": ["..."] },
  "audience": "...",
  "duration_min": 0,
  "page_budget": 0,
  "must_keep": ["..."],
  "avoid": ["..."],
  "images": { "supplied": false, "policy": "placeholder blocks; prompts only" },
  "theme_hint": "..."
}
```

## How to approach it

- Keep the argument **beats in order** — `rhythm_table` paces them and `select_layouts` binds each to a
  layout, so the spine has to survive ingest intact.
- Record `must_keep` verbatim; downstream `self_validate` checks these literally.
- Convert duration to a page budget but keep both — the budget is a target, not a hard cap.

## Contributes to

`choose_style` (the governing judgment), then transitively the whole deck.
