# Trace: Field Rationale

Per-field guidance for AI authoring traces. Each field has:

- **What**: one-line definition
- **Why**: cognitive purpose (not just storage purpose)
- **When**: what to fill, what to skip
- **Common mistakes**: what to avoid

The schema (types, constraints, validation) is in [SCHEMA.md](./SCHEMA.md). This doc is the *judgment layer*: schema enforces edges; this doc trains taste.

---

# Top-level fields

## `id`

**What**: Stable identifier, slug-shaped: starts with a letter, then `[a-z0-9-]`, 1–63 chars total. Conventionally equals the trace's folder name.

**Why**: One name across folder, URL, and `trace.json`. The id is the trace's machine handle; `title` is its human handle. Keeping the id slug-shaped lets it be the folder name too, so there's exactly one name to learn.

**When**: Always. Never blank. Fork = pick a new folder name; the id changes with it.

**Common mistakes**:
- Using the title as the id (the id can't contain spaces or capitals)
- Embedding metadata in the id (versions, dates, authors); those go in their own fields

---

## `title`

**What**: Human-readable name, 1-5 words. Displayed in lists, UI, marketplaces.

**Why**: People recognize and recall traces by title. "Dream Analysis", not the bare slug `dream-analysis`. This is the trace's social handle.

**When**: Always. Allowed to change freely (unlike `id`).

**Common mistakes**:
- Repeating description in title ("Dream Analysis Trace That Analyzes Dreams")
- Adding "Trace for X" prefix (it's already a trace; the title is X)
- Using slug-style snake_case (titles are display strings; use natural casing)

---

## `description`

**What**: 1-2 sentences explaining what this trace does.

**Why**: When forking, sharing, browsing a marketplace, or returning to a trace months later, the description tells you whether this is the right trace before you read steps. It's the elevator pitch.

**When**: Always. Treat it like a README's first paragraph.

**Common mistakes**:
- Describing the implementation instead of the purpose
  - Wrong: "Calls OpenAI API and parses JSON"
  - Right: "Produces a structured analysis of a dream description"
- Listing all the steps (steps belong in `steps`)
- Marketing language ("the best dream analyzer ever"); be neutral

---

## `version`

**What**: Semver string. New traces start at `"0.1.0"`.

**Why**: Placeholder for the future evolution mechanism. The field exists now so old traces don't break when versioning conventions land later.

**When**: Always. Bumping convention is deferred; for now, leave it at the creation version unless deliberately revising.

**Common mistakes**:
- Treating it like an app version (don't go to 1.0 just because it works)
- Using non-semver formats (`v1`, `2024-05-08`, `latest`)

---

## `steps`

**What**: Map of slug → StepSpec. The DAG nodes.

**Why**: The trace's substance. Each step is one cognitive unit.

**When**: Always. A trace with no steps is a non-trace.

**Common mistakes**:
- One mega-step that does everything (split it, a step should be one cognitive unit you'd give a name to)
- Many trivial steps (merge them, a step should justify having a name and a `STEP.md`)
- Steps without clear deps (every step should answer: where does my input come from?)

---

## `deliverable`

**What**: `{description, assets}`. What the user receives at the end.

**Why**: Trace's **purpose declaration**. Without it, the trace is means without ends; AI can't judge "am I still on track?" mid-execution. With it, every step's relevance can be checked against the deliverable.

`deliverable.assets` also defines the implicit **intermediate vs final** split. Files declared in some `step.assets` but not in `deliverable.assets` are intermediate (consumed by downstream, not delivered). Set difference is the mechanism.

**When**: Always. Even if there's only one final file.

**Common mistakes**:
- Listing every asset from every step (those are intermediate; pick the ones the user actually receives)
- Empty `assets: []` with a non-empty description (if nothing tangible is delivered, what's the point?)
- Description that's just a title repeat (be specific about what's in those files)

---

## `environment`

**What**: `{python: [], r: []}`. Packages this trace needs installed.

**Why**: Reproducibility. Anyone can fork a trace and know what to install.

**When**: List every package any step's code imports. Auto-detected from code where possible.

**Common mistakes**:
- Pinning versions unnecessarily (let the executor decide unless a specific version matters)
- Listing stdlib modules (`json`, `os`)
- Forgetting to add a package after editing step code

---

# StepSpec fields

## `name`

**What**: 2-5 word display name for this step.

**Why**: Graph views, lists, dashboards. Display strings should read naturally.

**When**: Always.

**Common mistakes**:
- Repeating the slug verbatim ("Analyze Dream" when slug is `analyze_dream`, fine but a missed opportunity)
- Verbose ("Analyze the User's Dream Description and Produce Output")

---

## `does`

**What**: ≤12-word TLDR.

**Why**: Graph view tooltip, list row. Distinct from `STEP.md` (long form). The 12-word constraint forces precision.

**When**: Always. Verb plus noun, action-oriented.

**Common mistakes**:
- Restating `name`
- Going over 12 words
- Describing the implementation instead of the outcome
  - Wrong: "Loops through chapters and calls API"
  - Right: "Produce three-framework symbolic analysis"

---

## `from_inputs` (cosmetic, optional)

**What**: Free-form list of label strings. Rendered by the frontend StepCard's per-step Inputs tab.

**Why**: Visual hint to a reader of the DAG: "this step conceptually reads these things". Not load-bearing (the trace contract is files, not variables; see [PHILOSOPHY.md](./PHILOSOPHY.md)). No top-level `inputs` map exists for these labels to reference.

**When**: Optional. Include if the labels help someone reading the trace map. Skip if the step description is already clear about what feeds it.

**Common mistakes**:
- Treating them as a typed contract (they're not; anything passes)
- Relying on them at execution time (executors look at `assets` from `from_steps`, not at these labels)

---

## `from_steps`

**What**: List of upstream step slugs this step depends on.

**Why**: **The DAG edges.** This is what makes a trace a trace and not a step list. Reading `from_steps: ["gather_context"]` tells you instantly "this step runs after gather_context".

**When**:
- Empty list `[]` for entry-point steps (no upstream)
- List of step slugs for everything else

**Common mistakes**:
- Listing a step that doesn't exist (validation catches, but easy to miss when renaming)
- Forgetting to update when steps are reorganized
- Listing every prior step (only list actual dependencies, not "steps that must have run by now")

**Note on cross-step data flow**: `from_steps` is just the dependency edge. It does not bind specific variables or files. How a step actually consumes upstream output is described in its `STEP.md`, typically by referencing files declared in the upstream step's `assets`. Trace-level fields stay coarse; `STEP.md` handles the semantic detail.

---

## `assets`

**What**: List of file paths (relative to the executor's working folder) this step is intended to produce.

**Why**: Method-level declaration of what this step contributes physically. Downstream steps reference these files (per their `STEP.md`). The deliverable curates a subset.

**When**: List every file the step is *intended* to produce that someone (downstream step, deliverable, or user) might care about. Skip pure scratch / debug output.

**Common mistakes**:
- Absolute paths (`/workspace/report.pdf` is wrong; use `report.pdf`)
- Including files written by other steps
- Trying to use templating or placeholders (trace paths are static strings; if you need dynamic naming, that's the executor's choice)

**Note on real-time updating**: `assets` is a static method-level declaration, not a real-time record. The executor does not update `trace.json` based on what files actually got produced in a particular run. If the author wants to revise the trace (different filename, different output), they edit `trace.json` deliberately, like editing any document.

---

## `asset_title`

**What**: Optional UI label for the assets group (e.g., "Market Overview").

**Why**: When viewing artifacts, multiple files from one step group together; this is the section header.

**When**: Step has multiple related assets that benefit from a label. Skip for single-asset or self-explanatory cases.

---

# Step folder content (not in trace.json)

## `STEP.md` (required)

**What**: The step's description, long-form, addressed to whoever executes this step.

**Why**: It carries the actual instructions, the reasoning, the gotchas, the references: everything `does` (12 words) can't fit, addressed directly to whoever executes the step.

**When**: Always. Every step folder must have it.

**What goes in it**:
- What this step is doing (longer than `does`)
- How to do it (approach, methodology, tradeoffs)
- What context to load before executing (files, prior step outputs)
- What to produce (matching `assets`)
- What materials are in this step folder and how to use them
- Common pitfalls or constraints

**Common mistakes**:
- Duplicating `does` (`STEP.md` is the long form)
- Writing it as a code comment (it's the description, addressed to the executor; speak to them, not about the code)
- Skipping it for code steps ("the code is the doc": no; `STEP.md` explains *why* and *when*, code only shows *how*)

---

## `memory.md` (optional, conventional name)

**What**: Step-level accumulated knowledge: what this step has learned across runs.

**Why**: Traces evolve through use. When an executor learns something the trace author would want next time (gotcha, edge case, better approach), it can land here. Persists across runs.

**When**: Optional. Filled by execution and revision, not authoring (typically).

---

## Other files (anything you want)

The step folder is a free-form bundle. Put whatever helps:

- Code in any language, any name (`fetch.py`, `parse.R`, `render.sh`, `analyze.ipynb`)
- Data files (CSV, JSON, Parquet, images, PDFs)
- Reference materials (papers, screenshots, prior outputs)
- Prompt templates
- Sub-folders (`data/`, `refs/`, `prompts/`) when scale demands organization
- `.env` files for secrets the step needs (don't commit)

**The spec does not prescribe naming or layout for any of these.** `STEP.md` is the contract: it tells the executor what materials are present and how to use them.

---

# What is deliberately not a field

## No `gives`

Without a runtime that captures step return values, naming logical variables in `trace.json` would be fictional. Files are the truth; `assets` is the real interface.

If you want to refer to "the personal context" semantically in step `STEP.md` files, do so in prose. Don't try to declare it as a variable name in `trace.json`.

## No `type` per step

Step type (python, R, instruction) is an execution concern. The trace author doesn't need to declare it. The executor reads `STEP.md`, looks at materials, decides how to act.

## No conditionals or branches

If a step "sometimes runs, sometimes doesn't" depending on input, that's not trace shape. Either:
- Two traces, executor picks the right one by input shape
- One step whose internal logic handles both cases

## No body file naming convention

A step folder may have code or no code. If it has code, the file can be named anything. The spec does not require `{slug}.py` or `body.py` or any convention. The executor reads `STEP.md` to learn what to run.

## No run-state structure

How execution is tracked, where outputs go physically, how multiple runs are organized: none of this is in the trace spec. It's the executor's domain.
