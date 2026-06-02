---
name: gather_context
description: Collect personal context (sleep, stressors, prior dreams) to ground analysis.
display_name: "Gather Context"
reads:
  - inputs.dream_description
writes:
  - runs/<run>/gather_context/dream_context.json
---

# Gather Context

Entry-point step. Before doing any symbolic analysis, ask the user 4 grounding questions. Without this context, archetypal analysis floats in abstraction.

## What this step does

Ask the user 4 personal-context questions, collect answers, save them as `dream_context.json` in the working folder.

## How to do it

Ask in a warm, curious tone. Each question is skippable (record `null` for skipped):

1. **Dream type** — first time / recurring / lucid / nightmare?
2. **Emotional intensity** — rate 1 to 10.
3. **Recent life pressure** — anything stressful or weighing on you lately?
4. **Life stage** — where are you in life right now (transition / stable / searching)?

After collecting answers, write them as JSON to `dream_context.json` at the working folder root:

```json
{
  "dream_type": "lucid_recurring",
  "emotion_intensity": 8,
  "recent_pressure": "...",
  "life_stage": "transition"
}
```

Close with a tip to the user: each new conversation starts fresh; if they want to track patterns across multiple dreams, they should download `dream_history.json` after analysis and paste it back next time.

## Why we collect this before analysis

Jung's archetypes, Freud's symbols, and Eastern dream readings all gain specificity from personal context. "A dream of falling" + "I just lost my job" reads differently from "A dream of falling" + "I'm starting a new chapter." The trace is generic; the analysis must be personal.

## Inputs from the trace

- `dream_description` — the original dream, used to phrase context-aware questions

## What this step contributes

`dream_context.json` at the working folder root. Downstream steps (specifically `analyze_dream`) read this file to ground the analysis.

## Materials in this folder

Just this STEP.md. The step is pure instruction — no code, no fixtures.
