---
name: extract_quotes
description: Pull direct quotes worth citing, with page numbers.
display_name: "Extract Quotes"
reads:
  - runs/<run>/gather_sources/
writes:
  - runs/<run>/extract_quotes/quotes.json
---

# Extract Quotes

For each source in `sources.json`, pull out direct quotes worth citing in the synthesis. Runs independently of `extract_facts` — same input, different output.

## What this step does

Read `sources.json` (produced by `gather_sources`). For each source, identify direct quotes that are vivid, well-phrased, or carry persuasive weight beyond their factual content. Attribute each quote to its source and speaker. Save as `quotes.json` at the working folder root.

## How to do it

For each source:

1. Read or fetch the source content.
2. Identify quotes that are worth using verbatim, not paraphrasable. Good criteria:
   - The phrasing itself is the point (rhetorical, idiomatic, memorable)
   - The speaker has authority such that direct attribution matters
   - The quote captures a stance or framing that paraphrase would dull
3. For each quote, capture exact text, speaker, source citation.

Output structure:

```json
[
  {
    "quote": "Exact text, with original punctuation.",
    "speaker": "Name of speaker or author",
    "source_id": "src_001",
    "context_note": "Brief context for when/why this was said.",
    "page_or_locator": "p. 42 | timestamp 14:30 | section 3.1"
  },
  ...
]
```

Writing to `quotes.json`.

## Selection bar — keep quotes few but strong

Better to extract 3 sharp quotes per source than 10 mediocre ones. Quotes that the synthesis can't really use are noise.

## Inputs from upstream

- `sources.json` — written by `gather_sources`

## What this step contributes

`quotes.json` — consumed by `synthesize`.

## Materials in this folder

Just this STEP.md.
