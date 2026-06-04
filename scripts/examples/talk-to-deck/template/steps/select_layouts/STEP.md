---
name: select_layouts
description: Per section, pick a named layout from the chosen style's layout library and bind each slide's copy / data / image slots.
reads:
  - rhythm_table/rhythm.json
  - choose_style/style_decision.json
writes:
  - select_layouts/layouts.json
---

# Select Layouts

Source skill: **op7418/guizang-ppt-skill** (歸藏) — `SKILL.md` *Step 3.1 · 挑布局 (Select Layouts)* +
`references/layouts.md` (the Style-A *页面布局库 / Layouts*: 开场封面 / 章节幕封 / 数据大字报 / 左文右图 /
图片网格 / 两列流水线 / 悬念收束 / 大引用页 / 并列对比 / 图文混排). The skill's discipline lifted: pick from
the **registered** layouts of the chosen style and bind text/data/image into the slot — do not invent new
structures. (Style B would instead draw from the 22 locked S01–S22 layouts; this run is Style A.)
**Workflow-only lift — our own prose; no source text or layout HTML is copied.**

Runs in PARALLEL with `image_prompts` — both depend only on the rhythm table, and neither needs the
other.

## What this step does

For every row in `rhythm.json`, choose **one named layout** from the chosen style's library that fits the
row's `theme` + `role`, and bind the slide's content into its slots:

- `layout` — the registered layout name (from `references/layouts.md` for Style A).
- `slots` — the copy / data / image bindings (headline, body, stat, quote, image-slot id + aspect).
- `notes` — any per-slide font-tier / cropping note implied by the layout.

## Output: `layouts.json`

```json
{
  "style": "A",
  "slides": [
    { "n": 1, "layout": "开场封面 (Hero Cover)",
      "slots": { "title": "...", "subtitle": "...", "meta": "..." },
      "image_slot": { "id": "01-hero", "aspect": "16:9" } }
  ]
}
```

## How to approach it

- Honor the registered library — a `数据大字报` for the worked-contrast numbers, a `大引用页` for the
  one-line claim, `开场封面` / `悬念收束` for the hero beats. No bespoke P11/P12.
- Name every image slot (`NN-semantic`) with its target aspect ratio so `image_prompts` and
  `assemble_deck` agree on the same slots.
- Carry `must_keep` phrases into the slot they live on, so `self_validate` can find them.

## Contributes to

`assemble_deck` (the layout + slot bindings the renderer lays out). Joins with `image_prompts` there.
