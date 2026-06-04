---
name: image_prompts
description: Write text-only image-generation prompts (style-matched, per-slot aspect ratio) for the hero / figure slots. No real image generation.
reads:
  - rhythm_table/rhythm.json
  - choose_style/style_decision.json
writes:
  - image_prompts/image_prompts.json
---

# Image Prompts

Source skill: **op7418/guizang-ppt-skill** (歸藏) — `references/image-prompts.md` (*GPT-M 2.0 配图提示词*:
通用规则 / 比例选择 / 图片标准化策略, and the per-style rules — Style A *电子杂志 × 电子墨水* documentary &
grayscale-infographic prompts; Style B *瑞士国际主义* grid prompts) + `SKILL.md` *可选配图 (Optional Image
Generation)*, which is explicitly an **optional** branch off the deck. **Workflow-only lift — our own
prose; no source prompt text is copied.**

Runs in PARALLEL with `select_layouts`. **This step writes prompts ONLY — it does NOT call any image
model.** The deck ships with CSS placeholder blocks; these prompts are what a user would hand to an image
model *later* to fill those exact slots.

## What this step does

For each hero / figure slot named in the rhythm (and later bound by `select_layouts`), write one prompt:

- `slot` — the slot id (`NN-semantic`) and its target `aspect` (e.g. `16:9`, `21:9`, `4:3`).
- `prompt` — a style-matched text prompt (for Style A: editorial × e-ink, documentary or grayscale
  infographic, warm restraint; for Style B: Swiss grid, single accent).
- `negative` — what to avoid (e.g. "no stock-photo gloss, no logos, no real brands").
- `placeholder` — the label the CSS block shows in the deck until a real image replaces it.

## Output: `image_prompts.json`

```json
{
  "style": "A",
  "generated_images": false,
  "policy": "text prompts only; deck uses CSS placeholder blocks",
  "prompts": [
    { "slot": "01-hero", "aspect": "16:9",
      "prompt": "...", "negative": "...", "placeholder": "HERO · ..." }
  ]
}
```

## How to approach it

- Match the prompt's vocabulary to the chosen style (this is the skill's rule — A-prompts and B-prompts
  read differently).
- Set each prompt's aspect ratio to the slot's ratio from the rhythm/layouts — the skill forbids raw
  source ratios; slots are standardized.
- Keep `generated_images: false`. The placeholder label is what `assemble_deck` renders.

## Contributes to

`assemble_deck` — supplies the placeholder labels (and, in a live run, the would-be image slots). Joins
with `select_layouts` there.
