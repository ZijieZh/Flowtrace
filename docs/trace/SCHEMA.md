# Trace: Schema

This is the source of truth for trace format. Validation tooling reads from here. Per-field rationale lives in [FIELDS.md](./FIELDS.md). Live shape (sourced from the Rust types the CLI validates against): `flowtrace explain trace`. Worked examples are constructed by the builders in [scripts/examples/](../../scripts/examples/); run one with `bash scripts/examples/<id>/build.sh` to populate a real trace folder at `~/traces/<id>/`.

---

## What the spec defines

The spec defines exactly two things:

1. **The trace folder structure**: what files must exist, what file names are reserved.
2. **The `trace.json` schema**: types, fields, constraints, validation rules.

The spec does **not** define:

- How a trace is executed
- Where step outputs go physically (that's the executor's working folder, not part of the trace)
- How execution state is tracked
- How multiple runs of the same trace are organized
- What body file (if any) exists inside a step folder, or how it is named

These are executor concerns. The trace is portable across any executor.

---

## Trace folder structure

```
{trace_id}/
├── trace.json               # required: schema spine
├── memory.md                 # optional: trace-level accumulated knowledge
├── styles/                   # optional: author-chosen subfolder for rendering assets
└── steps/                    # required: step bundles, one folder per step
    └── {slug}/
        ├── STEP.md         # required: the only mandatory file in a step folder
        └── ...               # any other files: code, data, refs, prompts, examples
```

### Reserved file names

| Path                          | Required | Purpose                                       |
| ----------------------------- | -------- | --------------------------------------------- |
| `trace.json` (at root)       | yes      | Schema spine                                  |
| `memory.md` (at root)         | no       | Trace-level accumulated knowledge            |
| `steps/`                      | yes      | Step bundles container                        |
| `steps/{slug}/STEP.md`      | yes      | Step description, addressed to the executor   |
| `steps/{slug}/memory.md`      | no       | Step-level accumulated knowledge              |

**Everything else has no naming constraint.** The author may put any files (PDF, JSON, CSV, code in any language, `.env`, screenshots, prompt templates) and may organize subfolders freely (`data/`, `refs/`, `prompts/`, anything). The spec does not prescribe step folder layout beyond the two reserved names above.

### Step folder examples

```
# Pure instruction step, no code
steps/gather_context/
└── STEP.md

# Step with a script and a few materials
steps/parse_corpus/
├── STEP.md
├── parse.py
├── stopwords.txt
└── reference_grammar.pdf

# Step organized as a project
steps/train_model/
├── STEP.md
├── pyproject.toml
├── src/
│   └── trainer/
│       └── model.py
├── tests/
└── configs/
    └── default.yaml
```

The executor reads `STEP.md` and decides how to act on the rest.

---

## Top-level: `Trace`

```ts
type Trace = {
  id:           string;                 // immutable identifier
  title:        string;                 // display name
  description:  string;                 // 1-2 sentences
  version:      string;                 // semver
  steps:        Record<Slug, StepSpec>;
  deliverable:  Deliverable;
  environment:  Environment;
};
```

---

## `Slug` constraint

```
Slug = ^[a-z][a-z0-9_]{0,62}$
```

Lowercase, snake_case, max 64 chars, must start with a letter. Slug is used as:

- key in `trace.json` `steps`
- folder name under `steps/`

Slug is intended to be stable for the lifetime of a step. Renaming a slug requires updating the folder name and any `from_steps` references that point to it.

---

## `id` format

```
id = [a-z][a-z0-9-]{0,62}
```

Slug-shaped; conventionally equals the folder name. A fork produces a new
trace with a new `id`; lineage tracking is a separate concern.

---

## `version` format

Standard semver: `MAJOR.MINOR.PATCH`. New traces start at `0.1.0`. Bumping convention is deferred; the field is required for forward compatibility.

---

## `StepSpec`

```ts
type StepSpec = {
  name:         string;          // 2-5 word display name
  does:         string;          // ≤12-word TLDR
  from_inputs?: string[];        // cosmetic label list (see note below)
  from_steps:   Slug[];          // upstream step slugs this step depends on (DAG edges)
  assets:       string[];        // files this step is intended to produce (paths in working folder)
  asset_title?: string;          // optional UI label for assets group
  deprecated?:  boolean;         // hides step from new runs while keeping it visible on older ones
};
```

`from_steps` is a flat list of upstream step slugs. An empty list means the step is an entry point (no upstream dependencies). The list expresses **DAG edges**; it does not bind specific variables. How downstream steps use upstream outputs is described in their `STEP.md`, typically by referencing files declared in upstream's `assets`.

`from_inputs` is a free-form list of labels, purely cosmetic, rendered by the frontend StepCard as tags. The trace contract is **files, not logical variables** (see [PHILOSOPHY.md](./PHILOSOPHY.md)); cross-step data flows through `assets` paths. It lets step cards show "this step conceptually reads X" without the trace declaring or validating an `inputs` map.

`assets` paths are relative to the executor's working folder. `dream_context.json` means "a file at the root of the working folder", `figures/qc.png` means "a file inside `figures/` within the working folder". The trace does not know or care where the working folder is.

---

## `Deliverable`

```ts
type Deliverable = {
  description:  string;        // 1-2 sentences, what the user receives
  assets:       string[];      // file paths constituting the deliverable
};
```

`deliverable.assets` is a curated subset of the union of all `step.assets` (the files that constitute the user-facing output). Files in some step's `assets` but not in `deliverable.assets` are **intermediate** (consumed by downstream steps, not delivered). Set difference is the only mechanism for distinguishing intermediate from final.

---

## `Environment`

```ts
type Environment = {
  python:       string[];      // pip-installable packages
  r:            string[];      // CRAN packages
};
```

Empty arrays are valid. Standard library modules should not be listed.

---

## Validation rules

1. `id` matches `[a-z][a-z0-9-]{0,62}`.
2. `version` parses as semver.
3. Every `from_steps` entry references an existing step slug.
4. Every step folder under `steps/` corresponds to a step entry in `trace.json`, and vice versa.
5. Every step folder contains `STEP.md`.
6. All step slugs match the slug regex.
7. `from_steps` lists must not contain cycles (DAG validation).
8. `deliverable.assets` paths should overlap meaningfully with the union of all `step.assets`; warn (don't error) if a deliverable asset is not produced by any step, since it might be a user-uploaded file or an intentional placeholder.

`from_inputs` is not cross-checked against anything; it is a free-form label list. Authors can write any strings; validation passes.

---

## Minimal valid trace

`trace.json`:

```json
{
  "id": "minimal",
  "title": "Hello",
  "description": "Print a greeting. The smallest valid trace.",
  "version": "0.1.0",
  "steps": {
    "say_hello": {
      "name": "Say Hello",
      "does": "Print hello world",
      "from_steps": [],
      "assets": []
    }
  },
  "deliverable": {
    "description": "A greeting (logged, not saved).",
    "assets": []
  },
  "environment": { "python": [], "r": [] }
}
```

Folder structure:

```
hello/
├── trace.json
└── steps/
    └── say_hello/
        └── STEP.md
```

See [REFERENCE-TRACES.md](./REFERENCE-TRACES.md) for the four reference traces and how to build them.

---

## What is not in the schema (and why)

| Removed                  | Why                                                                 |
| ------------------------ | ------------------------------------------------------------------- |
| `inputs` (top-level)     | Decorative: declared but never consumed at execution. Trace contract is files, not user-supplied values. (`StepSpec.from_inputs` survives as a cosmetic label list, not a cross-referenced field.) |
| `gives` per step         | Logical variable layer was a runtime artifact. Files are the truth. |
| `from_steps: {var: src}` | Variable binding belongs to runtimes that capture; trace declares dep edges only |
| `type` per step          | Step type is execution-layer concern, not method-layer              |
| `name` (top-level)       | Replaced by `title` (avoids collision with step `name`)             |
| Run folder structure     | Outputs live in the executor's working folder; not the spec's concern |
| Body file naming         | No required body filename. STEP.md is the only required file.     |
| Conditionals / branches  | Traces describe shape, not control flow                            |
| Schedules / triggers     | When to run is the executor's call                                  |
