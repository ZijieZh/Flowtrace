---
name: extract_facts
description: Pull factual claims with {source, claim, page} attributions.
display_name: "Extract Facts"
reads:
  - runs/<run>/gather_sources/
writes:
  - runs/<run>/extract_facts/facts.json
---

# Extract Facts

For each source in `sources.json`, pull out factual claims worth using in the synthesis. Run independently of `extract_quotes` — they consume the same source list and produce different outputs.

## What this step does

Read `sources.json` (produced by `gather_sources`). For each source, identify factual claims (numbers, dates, mechanisms, findings, definitions). Attribute each claim to its source. Save as `facts.json` at the working folder root.

## How to do it

For each source:

1. Read or fetch the source content (using `url_or_locator`).
2. Identify claims that are **factual**, not opinion. Examples:
   - "X causes Y" with mechanism described
   - Numerical findings (effect sizes, prevalence, dates)
   - Definitions of technical terms
   - Historical events or sequences
3. For each claim, capture the source citation (link back to source `id`) and a brief context snippet for verification.

Output structure:

```json
[
  {
    "claim": "Claim text in plain language.",
    "source_id": "src_001",
    "snippet": "A short quoted or paraphrased passage where the claim is supported.",
    "claim_type": "numerical | mechanism | definition | event"
  },
  ...
]
```

Writing to `facts.json` at the working folder root.

## Why this runs parallel to `extract_quotes`

Facts and quotes are different kinds of material that the synthesis step weaves together:

- Facts give *what is true*.
- Quotes give *how it was said*.

Splitting the extraction means each pass has a clear lens. They don't depend on each other; both depend only on `sources.json`.

## Inputs from upstream

- `sources.json` — written by `gather_sources`

## What this step contributes

`facts.json` — consumed by `synthesize`.

## Materials in this folder

Just this STEP.md. The work is judgment-driven extraction; no fixed code.
