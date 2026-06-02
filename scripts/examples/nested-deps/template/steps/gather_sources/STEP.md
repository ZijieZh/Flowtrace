---
name: gather_sources
description: Find and collect candidate sources for the topic.
display_name: "Gather Sources"
reads:
  - inputs.topic
  - inputs.depth
writes:
  - runs/<run>/gather_sources/sources.json
---

# Gather Sources

Entry-point step. Find and collect candidate sources for the research topic. Two downstream steps (`extract_facts` and `extract_quotes`) consume this step's output in parallel — that's why it's a single source for two consumers.

## What this step does

Given a topic and depth, search for relevant sources (papers, articles, books, primary documents). Save a structured list of sources as `sources.json` at the working folder root.

## How to do it

Use whatever search tool the executor has access to: web search, scholarly databases (arXiv, Google Scholar), local document collections, Wikipedia, news archives.

Aim for source count based on `depth`:

| `depth` | Source count |
| ------- | ------------ |
| shallow | 5 to 8       |
| standard | 10 to 15    |
| deep    | 20+          |

For each source, capture:

```json
{
  "id": "src_001",
  "title": "...",
  "authors": ["..."],
  "url_or_locator": "https://... or DOI:... or library callnumber",
  "published": "2024-03",
  "summary": "1-2 sentence abstract",
  "credibility_note": "peer-reviewed | preprint | journalism | blog | wiki | etc.",
  "relevance_score": 0.0
}
```

Output is a JSON array of these objects, written to `sources.json`.

Sort by `relevance_score` descending. Deduplicate.

## Why this is its own step

Source-finding is its own kind of work. It deserves its own STEP.md, its own care for quality (avoiding low-credibility sources, balancing perspectives), and its own visible output. Splitting it from extraction lets the downstream steps focus on their respective work without re-doing search.

## Inputs from the trace

- `topic` — the research question
- `depth` — how thorough to be (`shallow` / `standard` / `deep`)

## What this step contributes

`sources.json` — used by `extract_facts` and `extract_quotes` in parallel.

## Materials in this folder

Just this STEP.md. No code; the search tooling is the executor's.
