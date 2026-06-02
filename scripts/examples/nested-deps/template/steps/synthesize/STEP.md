---
name: synthesize
description: Weave facts and quotes into a coherent narrative.
display_name: "Synthesize"
reads:
  - inputs.topic
  - runs/<run>/extract_facts/
  - runs/<run>/extract_quotes/
writes:
  - runs/<run>/synthesize/synthesis.md
---

# Synthesize

The diamond-DAG join point. Consumes both `facts.json` (from `extract_facts`) and `quotes.json` (from `extract_quotes`) along with the original `topic` input, and weaves them into a coherent narrative.

This is the trace's most demanding step. It's why the parallel extraction matters — having both materials side by side is what makes synthesis possible.

## What this step does

Read `facts.json` and `quotes.json` from the working folder. Compose a Markdown document at `synthesis.md` that:

- Opens with a direct take on the topic (a thesis, not just a summary)
- Organizes findings into 4-7 thematic sections
- Weaves in facts with citations and quotes with attribution
- Acknowledges contradictions or open questions in the literature
- Closes with what's known, what's contested, what's unknown

## How to approach the writing

Three principles:

1. **Lead with stance, support with material.** Don't list everything you found and call it synthesis. Take a position on what the topic is really about, then use facts and quotes to support and complicate it.

2. **Quote sparingly but well.** A quote should do work no paraphrase can do. If a paraphrase would be just as good, paraphrase.

3. **Cite inline.** Use `[src_001]` style markers tied to source IDs. The next step (`format_report`) will resolve these into proper citations.

Example flow inside a section:

> The mechanism is well established: ribosomes read mRNA in three-nucleotide codons [src_004]. Crick's framing in 1958 — "the central dogma...the transfer of information from nucleic acid to protein" [Crick, src_002] — anchors the modern understanding, though as Lehninger noted, "the dogma proved more nuanced once retroviruses were studied" [Lehninger, src_007].

## Inputs from upstream

- `facts.json` — written by `extract_facts`
- `quotes.json` — written by `extract_quotes`

Plus the trace input `topic`, which orients the synthesis.

## What this step contributes

`synthesis.md` — a draft Markdown document with inline citations. Not yet formatted as a final report.

## Materials in this folder

Just this STEP.md. Synthesis is judgment work.
