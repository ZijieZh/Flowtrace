---
name: generate_dream_image
description: Render abstract imagery from the dominant analytical motif. Reviewer pick step.
display_name: "Generate Imagery"
reads:
  - runs/<run>/analyze_dream/
writes:
  - runs/<run>/generate_dream_image/dream_image.png
---

# Generate Imagery

Take the `image_prompt` from the analysis and produce a dream imagery illustration.

## What this step does

Read `dream_analysis.json` (produced by `analyze_dream`), pull out the `image_prompt` field, call whatever image generation service the executor has access to, and save the result as `dream_image.png` at the working folder root.

## How to do it

1. Read `dream_analysis.json` from the working folder root.
2. Extract `image_prompt` (a super-realism, first-person POV English prompt).
3. Call your image generation API — OpenAI, Stability, Midjourney, local SDXL, anything.
4. Save the resulting PNG to `dream_image.png` at the working folder root.

If the executor has no image generation available, skip this step. Downstream `generate_report` tolerates missing imagery — the report just won't have an imagery panel.

## Why this is a separate step

Two reasons:

1. **Different cognitive mode.** Analysis is interpretive judgment; image generation is API orchestration. Splitting them keeps each step's STEP.md focused on one kind of work.
2. **Optional.** Some executors have image gen, some don't. Keeping it separate lets the trace degrade gracefully.

## Why no code in this folder

The image generation is just an API call. The substantive work — crafting the right prompt — happened in `analyze_dream`. Here the executor uses its own image-gen tooling. No need to ship code; the STEP.md is enough.

## Inputs from upstream

- `dream_analysis.json` — read from the working folder root, written by `analyze_dream`. Use the `image_prompt` field.

## What this step contributes

`dream_image.png` at the working folder root.

## Materials in this folder

Just this STEP.md.
