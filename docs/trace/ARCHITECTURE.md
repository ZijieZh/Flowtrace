# Trace Architecture

The data model and CLI surface for how a trace is installed, run, and submitted.

## Folder Structure

A trace is one git repo. Install location is decided at install time (default `~/traces/<id>/`). Everything (trace definition, runs, history) lives there.

```
~/traces/dream-analysis/                  one trace = one git repo
├─ .git/                                   git is the history + submit protocol
├─ trace.json                             trace definition (DAG of steps)
├─ steps/                                  step scripts / STEP.md files
│   ├─ gather_context/
│   │   └─ STEP.md
│   ├─ analyze_dream/
│   │   └─ run.py
│   └─ generate_report/
│       └─ render.py
└─ runs/
    └─ john/                               one run = one folder, named by user
        ├─ state.json                      run status (one file, atomic write)
        ├─ replies/                        append-only reply stream
        │   ├─ 0001.json
        │   └─ 0002.json
        ├─ gather_context/                 step folder: AI writes all step files here
        │   └─ context.md
        ├─ analyze_dream/
        │   ├─ candidate_a.png             scratch (not declared in state.assets)
        │   ├─ candidate_b.png             scratch
        │   └─ jung-shadow.png             declared in state.steps.analyze_dream.assets
        └─ generate_report/
            └─ dream_report.pdf
```

No `inputs/`, no `artifacts/`, no `deliverable/`, no `working/`. One step = one folder. The folder holds everything the step touches; `state.json` declares which files are official.

## state.json

One file per run, the only source of truth for status. Atomic write on every change.

```json
{
  "name": "john's case",
  "started_at": "2026-05-10T14:00:00Z",
  "paused": false,
  "aborted": false,
  "steps": {
    "gather_context": {
      "status": { "kind": "done", "message": "14 prior dreams loaded" },
      "assets": ["context.md"]
    },
    "analyze_dream": {
      "status": { "kind": "running", "message": "triangulating frameworks" },
      "assets": []
    },
    "generate_report": {
      "status": { "kind": "idle" },
      "assets": []
    }
  },
  "deliverable": {
    "status": { "kind": "idle" },
    "assets": []
  }
}
```

### Status

```
idle                                          step has not started
running { message: Option<String> }           in progress; message = "what I'm doing"
blocked { message: String }                   stuck; message = why (required)
done    { message: Option<String> }           finished; message = takeaway
error   { message: String }                   failed; message = error (required)
```

### Asset declaration

`state.steps[X].assets[]` is a list of file names (relative to the step folder). It declares *which files this step produced as official output*. The file listing of the step folder is *not* the same; folders may contain scratch / candidates / logs that the step didn't promote.

`state.deliverable.assets[]` is a list of paths (relative to the run folder, may cross steps): declares the run's final delivery, e.g. `["analyze_dream/jung-shadow.png", "generate_report/dream_report.pdf"]`. Files are not moved on accept; the declaration is enough.

Reply citations can reference *any* file in the run folder, asset or not.

## Reply stream

`runs/<run_name>/replies/NNNN.json`: append-only, four-digit auto-incrementing index. Each file is one StructuredOutput plus metadata.

```json
{
  "at": "2026-05-10T14:15:00Z",
  "step_id": "analyze_dream",
  "output": {
    "headline": "Three-framework symbolic analysis",
    "takeaway": "Convergent reading across frameworks.",
    "evidence": [
      {
        "type": "figure",
        "path": "runs/john/analyze_dream/jung-shadow.png"
      },
      {
        "type": "figure",
        "path": "runs/john/analyze_dream/candidate_a.png",
        "caption": "Rejected candidate, kept for reference"
      }
    ]
  }
}
```

`step_id` is optional; a reply may be run-level.

## CLI

Every command does three things atomically: write `state.json` (and other files if any), then `git add . && git commit -m "<derived message>"`. The git commit captures the full set of changes: `state.json` + any new step files + the new `replies/NNNN.json` if applicable.

### Run lifecycle

```
flowtrace run new --name <name>
flowtrace run list
flowtrace run show [--run <name>]
flowtrace run pause [--run <name>]
flowtrace run resume [--run <name>]
flowtrace run abort [--run <name>]
flowtrace run rename <new_name> [--run <name>]
```

### Step status

One unified command for all step state transitions.

```
flowtrace step <step_id> <status> [--message <msg>] [--asset <file>...] [--run <name>]

  status: idle | running | blocked | done | error
```

Rules:

| status  | message                        | asset                 |
|---------|--------------------------------|-----------------------|
| idle    | optional (reset note)          | usually omitted       |
| running | optional ("what I'm doing")    | usually omitted       |
| blocked | **required** (why blocked)     | usually omitted       |
| done    | optional (takeaway)            | usually traffic       |
| error   | **required** (error message)   | usually omitted       |

Examples:

```
flowtrace step analyze_dream running --message "triangulating frameworks"
flowtrace step analyze_dream done    --message "candidates a/b rejected" \
                                  --asset jung-shadow.png
flowtrace step generate_report blocked --message "pandoc not found"
```

Behind the scenes: read state → update `state.steps[X].status` and `.assets` → atomic write → `git commit -m "<step_id>: <status>: <message>"`.

### Reply

```
flowtrace reply [--step <step_id>] [--run <name>] (--json <s> | --file <path> | --stdin | --markdown <s>)
```

Append the next-numbered file in `runs/<name>/replies/`. Optional `--step` attaches the reply to a specific step (otherwise it's run-level).

### Deliverable

```
flowtrace deliverable <status> [--message <msg>] [--asset <path>...] [--run <name>]

  status: idle | running | blocked | done | error
```

`--asset` paths are run-relative (e.g. `generate_report/dream_report.pdf`). Same atomic state-write + commit pattern.

### Run-level

```
flowtrace run new --name <name>
flowtrace run pause / resume / abort
flowtrace run rename <new_name>
```

Each writes `state.json` and commits.

## Git

The trace folder is a plain git repo. There are no branches by default; everything goes to `main`. The history is the audit trail.

| Event                                | Commit message template                         |
|--------------------------------------|-------------------------------------------------|
| trace install                       | `init <trace_id>`                              |
| `run new --name X`                   | `run/X: start`                                  |
| `step <id> running --message M`      | `<id>: running: M`                              |
| `step <id> done --message M`         | `<id>: done: M`                                 |
| `step <id> blocked --message M`      | `<id>: blocked: M`                              |
| `step <id> error --message M`        | `<id>: error: M`                                |
| `reply --step <id>`                  | `reply: <id>: <headline-from-payload>`          |
| `deliverable done --message M`       | `deliverable: done: M`                          |
| `run pause / resume / abort`         | `run/X: paused` / `resumed` / `aborted`         |

To see history of a single step's reruns:

```
git log --oneline -- runs/john/analyze_dream/
```

To recover a previous version of a file:

```
git show <commit>:runs/john/analyze_dream/jung-shadow.png > /tmp/old.png
```

## Sync to frontend

A long-running watcher in `flowtrace serve` watches the trace folder. Any change to `state.json` or `replies/` is classified and broadcast via SSE to the frontend, which invalidates its TanStack Query cache and refetches.

Latency:

- Direct HTTP write: ~10 ms (handler writes + broadcasts inline)
- CLI write: ~210 ms (200 ms watcher debounce + 10 ms refetch)

## Install / Submit / Share

The flowtrace CLI deliberately ships no `install` / `update` / `export` wrappers;
distribution is plain `git`. A trace folder is just a git repo; everything below
uses standard git commands.

| Want                                    | Do                                                                          |
|-----------------------------------------|-----------------------------------------------------------------------------|
| install a trace from an upstream       | `git clone <upstream-url> ~/traces/<id>/`                                  |
| build a reference example from this repo| `bash scripts/examples/<id>/build.sh`, which creates `~/traces/<id>/` with a fresh `.git` + one demo run already done |
| work in another location                | `git clone ~/traces/<id> <target>` and operate there                       |
| submit work back to a canonical place   | `git push <remote>` (set up as a standard git remote)                       |
| recover a step's old output             | `git log` + `git show` (or `git checkout` on a branch)                      |
| share results with a collaborator       | `git push` to shared remote, or `tar` the folder and send it                |

The CLI's only job is to record execution state atomically: every `flowtrace step`
/ `flowtrace reply` / `flowtrace deliverable` writes the right files and `git commit`s
the change. Distribution semantics belong to git.

## Inputs (none)

The trace schema has no top-level `inputs` field. If a step needs external
data, the step's `STEP.md` describes what file(s) it reads from where; the
executor obtains them however it likes (prompts, downloads, prior step output).

`StepSpec.from_inputs` is an optional free-form label list. It is
purely cosmetic (rendered by the frontend StepCard as tags) and references
nothing. The trace contract is **files**, declared in `assets`, not logical
variables. See [PHILOSOPHY.md](./PHILOSOPHY.md) "Cross-step data flow goes
through files".
