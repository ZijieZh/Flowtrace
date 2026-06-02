---
name: analyze_dream
description: Three-framework symbolic analysis: Jungian, Freudian, Eastern. Core analytic step.
display_name: "Analyze Dream"
reads:
  - inputs.dream_description
writes:
  - runs/<run>/analyze_dream/dream_analysis.json
---

# Analyze Dream

The core analytic step. Take the dream and personal context and produce a structured three-framework symbolic analysis.

## What this step does

Read the user's `dream_description` (input) and `dream_context.json` (produced by `gather_context`), then produce `dream_analysis.json` containing structured symbolic analysis through three lenses.

## Output JSON shape

```json
{
  "dream_title": "...",
  "dream_type": "lucid_recurring",
  "emotion_intensity": 8,
  "emotional_tone": {
    "primary": "...",
    "secondary": "...",
    "texture": "..."
  },
  "key_symbols": [
    {"symbol": "...", "meaning": "..."}
  ],
  "three_framework_analysis": {
    "jung_archetypal": {
      "archetype_match": "...",
      "interpretation": "..."
    },
    "freudian_symbolic": {
      "interpretation": "..."
    },
    "eastern_symbolic": {
      "five_elements": "...",
      "yin_yang": "...",
      "interpretation": "..."
    }
  },
  "personalized_insight": "...",
  "image_prompt": "...",
  "core_message": "...",
  "life_connection": "...",
  "action_suggestion": "...",
  "encouragement": "..."
}
```

`image_prompt` should be in English, super-realism style, first-person POV — this gets consumed by the next step (`generate_dream_image`).

## How to approach it

This step is the heart of the trace. The analysis should:

- **Take the personal context seriously.** Don't generate generic analysis if `recent_pressure` says "I'm caregiving for a sick parent" — that context should saturate every symbol reading.
- **Hold three frameworks in tension.** Jung sees archetypes; Freud sees repressed desire; Eastern reading sees energy and timing. Each has truth; let them speak side by side, not blended.
- **Avoid pathologizing.** A nightmare isn't a diagnosis. Frame everything as the unconscious offering material to integrate, not symptoms to fix.

Language: match the user's input language automatically. Chinese dream → Chinese analysis. English dream → English analysis.

## Why this step has no code

Analysis is judgment work. Code can't replace the executor's reading of nuance. The output is structured (JSON), but the structuring is cognitive, not mechanical.

## Inputs from upstream

- `dream_description` — the trace input (raw text)
- `dream_context.json` — read from the working folder root, written by `gather_context`

## What this step contributes

`dream_analysis.json` at the working folder root. Downstream steps (`generate_dream_image`, `generate_report`) read it.

## Materials in this folder

Just this STEP.md. The step is pure instruction.
