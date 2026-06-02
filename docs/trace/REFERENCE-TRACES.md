# Reference Traces

Six builders under [`scripts/examples/`](../../scripts/examples/) that each
construct a working trace at `~/traces/<id>/`. Five walk the full
CLI-lifecycle surface (1 to 24 steps); the sixth (`spring-demo`) is a UI
animation showcase and stops after authoring the DAG.

## At a glance

| ID                | Steps | What it demonstrates                                                          | Builder                                              |
|-------------------|------:|-------------------------------------------------------------------------------|------------------------------------------------------|
| `minimal`         |   1   | Smallest valid trace; partial reply, rerun, time-travel, deliverable         | `bash scripts/examples/minimal/build.sh`             |
| `dream-analysis`  |   5   | Mixed code/instruction steps; partial→complete; blocked→resume; error→retry  | `bash scripts/examples/dream-analysis/build.sh`      |
| `nested-deps`     |   5   | Diamond DAG; multi-source synthesis; blocked-for-scope; error-retry           | `bash scripts/examples/nested-deps/build.sh`         |
| `iris-analysis`   |  24   | Branched data-analysis DAG; assumption-check block; ANOVA error retry; rerun-on-cleaned | `bash scripts/examples/iris-analysis/build.sh`       |
| `tailored-resume` |   7   | Source→trace walkthrough: a `SKILL.md` lifted into a fan-in/fan-out DAG (parallel roots, two joins, parallel terminal); before/after resume via `comparison` evidence | `bash scripts/examples/tailored-resume/build.sh`     |
| `spring-demo`     |   7   | UI animation showcase; paced commits so the NodeMap Spring entrance + edge-draw animations fire on each new step. No CLI lifecycle. | `bash scripts/examples/spring-demo/build.sh`         |

Each builder reads its content from `scripts/examples/<id>/template/`, copies
that into `~/traces/<id>/`, `git init`s the target, and walks the CLI
lifecycle. Result: a real trace folder with its own `.git`, one demo run
already populated, ready to view in `flowtrace serve`.

## Run them

```bash
# One at a time:
bash scripts/examples/<id>/build.sh

# All of them at once:
bash scripts/examples/regenerate-all.sh

# Build into somewhere other than ~/traces/<id>/:
TRACE_TARGET=/tmp/iris-tryout bash scripts/examples/iris-analysis/build.sh

# Rebuild from scratch (builders refuse to overwrite an existing target):
rm -rf ~/traces/iris-analysis
bash scripts/examples/iris-analysis/build.sh
```

After building, view in the UI:

```bash
flowtrace serve                                    # defaults to ~/traces/
# or focus a single one:
flowtrace serve --scope ~/traces/iris-analysis
```

## What each builder demonstrates

### `minimal`

The smallest end-to-end exercise of the CLI:

- `flowtrace validate` / `flowtrace lint` / `flowtrace show --fmt json|mermaid|dot`
- `flowtrace run new` → `run rename` → `run show`
- `flowtrace step say_hello running` (with `--message`)
- A partial reply (`status: "partial"`) followed by the complete reply
- A rerun: same asset path, new bytes (git history records both versions)
- `flowtrace deliverable done --asset say_hello/hello.txt`

One step, ~12 commits.

### `dream-analysis`

A realistic 5-step trace with the lifecycle's hard cases:

- `gather_context`: citation-heavy reply (no figures)
- `analyze_dream`: partial→complete with multi-asset declaration
- `analyze_patterns`: figure + table + per-check evidence
- `generate_dream_image`: `running → blocked` (awaiting reviewer pick) → `running → done`, then rerun with new bytes
- `generate_report`: `running → error → running → done`, then rerun with reviewer-revised content

Replies use multiple evidence types: `figure`, `document`, `table`, `comparison`, `check`, `citation`, `appendix`. ~35 commits.

### `nested-deps`

A diamond DAG: one source step (`gather_sources`) feeds two parallel extractors (`extract_facts`, `extract_quotes`), both feed `synthesize`, which feeds `format_report`. Exercises:

- Partial → complete on the first step (interim metadata before finalizing)
- `blocked` on `synthesize` (scope decision: include Lakatos?)
- Rerun on `synthesize` with revised content (editorial pass)
- `error → retry → done` on `format_report` (pandoc missing → install → succeed)

~32 commits.

### `iris-analysis`

The full surface, exercised at scale: 24 statistical steps with branching
dependencies (descriptive → distribution diagnostics → three outlier detectors
→ consensus → conditional parametric/non-parametric inference → classification
→ sensitivity rerun on cleaned data → composed report). Exercises:

- `run pause` / `run resume` mid-pipeline
- `assumption_check` blocks on borderline Shapiro-Wilk, resumes after analyst sign-off
- `method_select` blocks for analyst review
- `anova_oneway` errors on singular covariance matrix, retries after cleaning
- `classification_logistic` reruns (same asset path, new bytes)

~90 commits, 27 replies, full deliverable manifest.

### `tailored-resume`

The worked example behind the README's [Make your own trace](../../README.md#make-your-own-trace) section, lifting a `SKILL.md` into a trace. The `tailored-resume-generator` skill (ComposioHQ/awesome-claude-skills), six prose process steps, becomes a 7-node fan-in/fan-out DAG:

- two parallel roots (`read_jd`, `parse_resume`) fan into `score_bullets`
- `reorder_format` joins the rewritten bullets *and* the keywords directly
- `strategic_recommendations` is a parallel terminal branch (depends on keywords + scoring, not on the final resume)

The run tailors a deliberately generic resume to a backend-payments JD, so the before/after is visibly different; `reorder_format` emits a `comparison` evidence block pairing the original and tailored resumes. ~35 commits.

### `spring-demo`

Different category from the other five: a UI animation showcase rather than a
CLI lifecycle exercise. Authors a 7-step diamond + fan-out + merge DAG
(`load → clean+validate → analyze → model+visualise → report`) one step per
commit, with `STEP_DELAY=3` so the `flowtrace serve` watcher emits SSE updates
spaced out enough for the frontend to animate each new node with the production
Spring entrance + edge-draw motion. Each step declares assets so the StepCard
asset tray renders.

- No runs created, no `step running/done`, no deliverable commit;
  authoring only.
- Override pacing with `STEP_DELAY=N` (default 3s).
- Best viewed live: open `http://localhost:3001/traces/spring-demo` in the
  browser BEFORE running the builder, so each step animates in.

## Where to read more

- [PHILOSOPHY.md](./PHILOSOPHY.md): why traces are shaped this way
- [SCHEMA.md](./SCHEMA.md): the trace.json format
- [CLI.md](./CLI.md): the one-read system reference for any agent driving the binary
