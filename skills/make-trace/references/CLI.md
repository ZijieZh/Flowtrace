<!-- Vendored copy of docs/trace/CLI.md, bundled so the make-trace skill is
     self-contained when copied out of the repo. Keep in sync with the source;
     it intentionally differs only in repo-relative pointers (no `./` doc links). -->

# Trace CLI Reference

The single document an agent (human or AI) needs to use the `flowtrace` CLI correctly. Read it once and you have the full system surface. After this, `flowtrace <cmd> --help` and `flowtrace explain <type>` give you the same information piecewise from the binary itself, useful when you don't have this file in context.

---

## 1. Concepts

| Term | Meaning |
|---|---|
| **Trace** | A static plan. Lives as `trace.json` at `<trace_root>/trace.json`. Declares steps with DAG dependencies, assets per step, and a deliverable. (No top-level `inputs`: the contract is files, not user-supplied values.) |
| **Run** | One execution of a trace. Lives at `<trace_root>/runs/<run_id>/`. Auto-created by `flowtrace run new`. |
| **Step** | A node in the trace DAG. Declared in `trace.json#steps`. At runtime, each step has a folder `runs/<run_id>/<step_id>/` for its files. |
| **state.json** | The single source of truth for run status. Lives at `runs/<run_id>/state.json`. Every CLI write touches this file atomically and commits. |
| **Reply** | One structured-output payload written by the executor. Append-only stream at `runs/<run_id>/replies/NNNN.json`. Sequence is allocated by the CLI. |
| **Asset** | A file the step declared as official output, listed in `state.steps.<id>.assets[]`. Other files in the step folder are scratch (not committed). |
| **Deliverable** | The run's final output. Status and asset list recorded in `state.deliverable`. Asset paths are run-relative. |

Every CLI write produces **exactly one git commit**, scoped to exactly the paths it touches (`state.json` plus declared assets; or the new reply file plus its cited evidence paths). Nothing else is staged.

---

## 2. Bootstrap order for an AI

Two reads are enough:

1. **This file**: once per session. The whole system contract is here.
2. **`trace.json`**: once per trace folder you work in. Step IDs, dependencies, expected assets.

After that, all you need is the binary itself. The binary self-documents:

- **Invocation** → `flowtrace <cmd> --help`: every flag, with an EXAMPLES block.
- **Schema** → `flowtrace explain <type>[.<field>]`: drill into types like `kubectl explain`.

Both come from the same Rust types this binary already validates against. They can't drift.

---

## 3. Path conventions

Every path the CLI accepts (`--asset`, every `evidence[].path`) follows the same rules:

| | Good | Bad |
|---|---|---|
| Separator | `a/b/c.png` | `a\b\c.png` (backslash rejected) |
| Anchoring | `analyze_dream/x.png` | `/abs/x.png` (absolute rejected) |
| Traversal | `gather/notes.md` | `../escape.txt` (`..` rejected) |
| Encoding | NFC Unicode | NFD (server normalizes; do not rely on it) |
| Reserved names | `report.pdf` | `CON.txt`, `LPT1.log` (Windows-reserved, rejected) |
| Reserved characters | `report-v2.pdf` | `r?p.pdf`, `r:p.pdf`, `r*p.pdf` (`< > : " \| ? *` rejected) |
| Segments | `a/b/c` | `a//b`, `a/`, `a/./b`, `a/. /b` (empty / dot-only / trailing space rejected) |

- `--asset` on `flowtrace step` is **step-relative** (resolved under `runs/<id>/<step_id>/`).
- `--asset` on `flowtrace deliverable` is **run-relative** (resolved under `runs/<id>/`).
- `evidence[].path` inside a reply is **run-relative**.

Every path must exist on disk at call time. The CLI refuses to commit a declaration for a file that isn't there.

---

## 4. State machine

```
                 ┌────────────┐
                 │   idle     │
                 └─────┬──────┘
                       │ flowtrace step <id> running
                       ▼
                 ┌────────────┐
   blocked  ◄────┤  running   ├────►  done
   error    ◄────┘            └────►  (can re-enter running for a rerun)
```

| Status   | message              | typical assets |
|----------|----------------------|----------------|
| `idle`     | optional (reset note) | usually omitted |
| `running`  | optional ("what I'm doing") | usually omitted |
| `blocked`  | **required** (why) | usually omitted |
| `done`     | optional (takeaway) | the step's outputs |
| `error`    | **required** (error) | usually omitted |

Calling `flowtrace step <id> blocked` (or `error`) without `--message` exits non-zero.

The diagram shows the common path, not a gate. Any status may follow any status (`blocked → error`, `done → running`, etc.); the only enforced rule is the `--message` requirement on `blocked` and `error`.

### Re-running and steering

`done` is not final. Re-enter a finished step into `running`, redo the work, and mark it `done` again — that is the diagram's "can re-enter running for a rerun" edge, and it is how you steer a run after changing your mind about a node.

Re-running a step **invalidates its descendants**: every step that transitively depends on it (through `from_steps`) was computed from the old output and should be re-run too. The CLI does not track this for you — there is no stored "stale" flag, by design (the trace is soft; the executor owns propagation). Ask for the exact set:

```
flowtrace show --downstream <step_id>     # transitive dependents, one per line, in topological order
```

The output is topologically ordered, so re-run the steps front-to-back. After the steps settle, re-close the deliverable (`flowtrace deliverable done --asset …`) — it is not in `--downstream` output and carries no staleness signal of its own, so a steer that changes the final output means re-confirming the deliverable too. (The web UI surfaces the same staleness visually; `--downstream` is the headless equivalent.)

---

## 5. CLI commands

Every command operates on the trace folder containing the current working directory (walks up from `cwd` until it finds `trace.json`). For full per-command help, run `flowtrace <cmd> --help`.

### Inspect

```
flowtrace show [--fmt json|ascii|mermaid|dot]   # render trace.json
flowtrace show --downstream <step_id>           # steps to re-run after changing <step_id>
flowtrace validate                              # check trace.json against the schema
flowtrace lint                                  # non-fatal warnings
flowtrace explain <type>[.<field>]              # schema for `reply` / `state` / `trace`
```

`flowtrace show --fmt json | jq .steps` is the standard way for an agent to discover step IDs. `flowtrace show --downstream <step_id>` lists that step's transitive dependents — the set to re-run after editing it (see [§4 Re-running and steering](#4-state-machine)).

### Run lifecycle

```
flowtrace run new --name <name>                 # creates runs/<run_id>/, prints run_id
flowtrace run list                              # list run_ids
flowtrace run show [--run <id>]                 # prints state.json (default: latest run)
flowtrace run pause   [--run <id>]              # paused: true
flowtrace run resume  [--run <id>]              # paused: false
flowtrace run abort   [--run <id>]              # aborted: true
flowtrace run rename  <name> [--run <id>]       # replace state.name
```

`pause` and `abort` set run-level flags only; neither changes any step's status. `abort` is advisory, not a lock — `step`/`deliverable`/`reply` writes to an aborted run still succeed. Start a fresh run with `run new` whenever you want a clean slate. `paused` / `aborted` are present in `state.json` only once set (absent means `false`).

### Step status

```
flowtrace step <step_id> <status> [--message <m>] [--asset <p>]... [--run <id>]
```

- `<step_id>` must exist in `trace.json#steps`.
- `<status>` is one of `idle | running | blocked | done | error`.
- `--message` required for `blocked` and `error`.
- `--asset` is step-relative; repeat for multiple; each must exist on disk.
- The CLI never creates the step folder or the asset file. Write them first — `mkdir -p runs/<id>/<step_id>/` then produce the file — before declaring it, or the call fails with `asset '<a>' not found on disk`.
- The commit stages exactly `runs/<id>/state.json` plus each declared asset.

### Deliverable

```
flowtrace deliverable <status> [--message <m>] [--asset <p>]... [--run <id>]
```

Same shape as `step`, but `--asset` paths are run-relative (e.g. `analyze_dream/foo.png`).

### Reply

```
flowtrace reply [--run <id>]  < payload.json
```

Reads the payload from stdin as a JSON [`StructuredOutput`](#6-reply-payload-schema). The step this reply is "about" comes from `checkpoint.step_id` inside the payload; run-level replies omit the checkpoint. Every cited `evidence[].path` must exist on disk; the commit stages the new reply file plus those cited files.

Examples:

```bash
flowtrace reply < reply.json
echo '{"headline":"hello","status":"complete"}' | flowtrace reply
```

To draft a payload, start from the skeleton:

```bash
flowtrace explain reply --output example > skeleton.json
# edit skeleton.json, then:
flowtrace reply < skeleton.json
```

### Serve / completions

```
flowtrace serve [--scope <dir>] [--port <n>] [--open]
flowtrace completion <bash|zsh|fish|powershell|elvish>
```

---

## 6. Reply payload schema

The minimum valid payload:

```json
{ "headline": "…", "status": "complete" }
```

Required fields:

- **`headline`** *(string)*: one-line summary the UI prints.
- **`status`** *(string)*: one of `partial | complete | blocked | error`.

Optional fields:

- **`checkpoint`** *(object)*: `{ "step_id": "<id>", "step_name": "?" }`. Pins this reply to a specific step. Omit for a run-level reply.
- **`support`** *(string[])*: bullet supporting points.
- **`findings`** *(`{title, detail}[]`)*: structured bullet findings.
- **`suggestions`** *(string[])*: next-action suggestions.
- **`evidence`** *(`Evidence[]`)*: typed evidence blocks. See below.
- **`note`** *(string)*: caveat / disclaimer.
- **`takeaway`** *(string)*: one-paragraph conclusion.

### Evidence variants

Every entry in `evidence[]` has a `type` discriminator. The variants:

```json
{ "type": "figure", "path": "<run-relative>", "caption": "?" }

{ "type": "document", "path": "<run-relative>", "title": "?" }

{ "type": "table",
  "title": "?",
  "columns": ["…"],
  "rows": [["…"]],
  "source_file": "<run-relative>?" }

{ "type": "comparison",
  "title": "?",
  "left":  { "label": "before", "path": "<run-relative>" },
  "right": { "label": "after",  "path": "<run-relative>" } }

{ "type": "check",
  "label": "…",
  "passed": true,
  "expected": <any>,
  "actual":   <any> }

{ "type": "citation",
  "id": "…", "title": "…",
  "authors": "?", "year": 0, "url": "?" }

{ "type": "appendix", "title": "…", "markdown": "…" }
```

Every path-bearing field (`figure.path`, `document.path`, `table.source_file`, `comparison.left.path`, `comparison.right.path`) is validated to exist on disk before the reply commits.

For the binary's source-of-truth view of these:

```bash
flowtrace explain reply.evidence              # list all variants
flowtrace explain reply.evidence.figure       # drill into one variant
flowtrace explain reply --output jsonschema   # formal JSON Schema
```

Forward-compatibility: unknown top-level fields in the payload are tolerated. Agents emitting fields the CLI doesn't know about will not be rejected.

---

## 7. state.json schema

`state.json` is the runtime state of a run. Shape:

```json
{
  "name": "…",
  "started_at": "2026-05-11T17:00:00Z",
  "paused": false,
  "aborted": false,
  "steps": {
    "<step_id>": {
      "status": { "kind": "running", "message": "…" },
      "assets": ["…"]
    }
  },
  "deliverable": {
    "status": { "kind": "done", "message": "…" },
    "assets": ["<step_id>/…"]
  }
}
```

Status variants (the `kind` discriminator):

```json
{ "kind": "idle" }
{ "kind": "running", "message": "?" }
{ "kind": "blocked", "message": "REQUIRED" }
{ "kind": "done",    "message": "?" }
{ "kind": "error",   "message": "REQUIRED" }
```

For the binary's view: `flowtrace explain state`, `flowtrace explain state.steps`, `flowtrace explain state.steps.status`.

---

## 8. trace.json schema

```json
{
  "id": "<slug>",                  // trace id; conventionally equals folder name
  "title": "…",
  "description": "…",
  "version": "0.1.0",
  "steps": {
    "<step_id>": {
      "name": "…",
      "does": "…",
      "from_inputs": ["…"],   // optional cosmetic labels; see note below
      "from_steps":  ["<step_id>"],
      "assets":      ["…"],
      "asset_title": "?",
      "deprecated":  false
    }
  },
  "deliverable": { "description": "…", "assets": ["…"] },
  "environment": { "python": ["…"], "r": ["…"] }
}
```

For the binary's view: `flowtrace explain trace`, `flowtrace explain trace.steps`.

---

## 9. Error catalog

Every error message the CLI emits, and what it means.

| Error string (substring) | Meaning |
|---|---|
| `path traversal ('..') is not allowed` | `--asset` or `evidence[].path` contains `..` |
| `path must be relative (no leading '/')` | absolute path passed |
| `path must use POSIX '/' separators (no backslash)` | Windows-style path |
| `path uses a Windows-reserved name` | basename matches CON / PRN / AUX / NUL / COM1-9 / LPT1-9 |
| `path contains a reserved character` | one of `< > : " \| ? *` in a segment |
| `path is empty` / `path has an empty segment` | empty path or `a//b` |
| `path segment must not end with space or '.'` | trailing whitespace / dot |
| `status=blocked requires a message` | `blocked` without `--message` |
| `status=error requires a message` | `error` without `--message` |
| `step '<id>' is not declared in trace.json` | step id not in `trace.json#steps` |
| `no trace.json found in ... or any parent` | cwd is outside a trace folder |
| `run '<id>' not found` | `--run <id>` doesn't exist |
| `reply payload must be valid JSON (StructuredOutput shape; see `flowtrace explain reply`)` | stdin empty / not valid JSON / wrong shape |
| `evidence path '<p>' not found on disk` | a cited evidence path doesn't exist in the run folder |
| `asset '<a>' not found on disk` | `--asset` path doesn't exist |
| `unknown root '<x>'; expected one of: reply, state, trace` | `flowtrace explain <root>` with an unknown root |

---

## 10. End-to-end worked example

This is the smallest realistic flow: one step, one reply, one deliverable.

```bash
# Discover the trace
flowtrace show --fmt json | python3 -c \
  "import json,sys; print(list(json.load(sys.stdin)['steps']))"   # → ['say_hello']

# Start a run
RUN=$(flowtrace run new --name "first hello" | tail -1)

# Step running
flowtrace step say_hello running --message "drafting greeting"

# Do work: write the asset to disk
mkdir -p "runs/$RUN/say_hello"
echo "hello world" > "runs/$RUN/say_hello/hello.txt"

# Mark done with the declared asset
flowtrace step say_hello done \
    --asset hello.txt \
    --message "one greeting emitted"

# Compose a reply (start from the skeleton):
flowtrace explain reply --output example > /tmp/reply.json
# …edit /tmp/reply.json to be:
#   { "headline": "hello!", "status": "complete",
#     "checkpoint": { "step_id": "say_hello" },
#     "evidence": [
#       { "type": "document", "path": "say_hello/hello.txt", "title": "greeting" }
#     ] }
flowtrace reply < /tmp/reply.json

# Close the run
flowtrace deliverable done --asset "say_hello/hello.txt" --message "greeting delivered"

# Inspect what happened:
flowtrace run show --run "$RUN"
git log --oneline                                   # five commits, one per CLI write
```

The Flowtrace repo ships reference trace builders under `scripts/examples/` that exercise the same surface at varying scale: `minimal` is one step; `iris-analysis` is twenty-four with blocks, errors, retries, and reruns. Each `bash scripts/examples/<id>/build.sh` materializes a full trace folder + one demo run at `~/traces/<id>/`. (For the full write-up, see `docs/trace/REFERENCE-TRACES.md` in the Flowtrace repo.)

---

## 11. Where the data lives

```
<trace_root>/
├─ .git/                                git is the audit trail
├─ trace.json                          the static plan
└─ runs/
   └─ <run_id>/
      ├─ state.json                     sole status SOT, atomic write per command
      ├─ replies/
      │  ├─ 0001.json                   append-only, four-digit seq
      │  └─ 0002.json
      └─ <step_id>/                     where this run's step output lands
         ├─ scratch.tmp                 not in state.assets → not committed
         └─ official.png                in state.steps.<id>.assets → committed
```

Commit-message shape:

| Event | Message |
|---|---|
| `run new --name X` | `run/X: start` |
| `step <id> running --message M` | `<id>: running, M` |
| `step <id> done` (no message) | `<id>: done` |
| `step <id> blocked --message M` | `<id>: blocked, M` |
| `deliverable done --message M` | `deliverable: done, M` |
| `reply` (step-scoped) | `reply: <step_id> (NNNN)` |
| `reply` (run-level) | `reply: (NNNN)` |
| `run pause / resume / abort / rename` | `run/<id>: paused` / `resumed` / `aborted` / `renamed to <name>` |
