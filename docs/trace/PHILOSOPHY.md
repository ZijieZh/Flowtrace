# Trace Philosophy

A trace is not a workflow. Not a script. Not a chatbot prompt.

A trace is a **structured-but-soft, evolving knowledge artifact for doing some kind of thing.**

It sits alongside two familiar categories, at a different altitude:

- **Skills** (a Python function, an MCP tool, a `SKILL.md` playbook): where capabilities live
- **Workflows** (a CI pipeline, an orchestration graph): where control flow lives, with explicit order executed as written

Trace is the third: **a soft scaffold for cognition**, where composition lives. The DAG, the named edges, the typed dataflow describe *what doing this kind of thing looks like*, not *what to execute next*. The executor (AI or human) reads the trace as a structured reference, not a program to run.

---

## Why traces are needed

### Before: alignment cost collapses

Today an AI tells you what it plans to do as prose. You read 300 words to find the wrong premise. To intervene, you have to compose a paragraph countering it.

A trace is a **glance-able shared object**. You see the wrong node in 200ms, point at it, change it. Alignment shifts from natural-language back-and-forth to pointing at a structure both parties read.

This is not a UX improvement. It is a **medium upgrade for human-AI collaboration**. Natural language is a lossy translation between two minds. Structure is a shared object both minds point at.

### During: cognition becomes traceable

Today execution is a black box. AI says "I'll do X", you wait, it returns. You don't know where it is, whether it deviated, whether it's stuck.

A trace makes execution observable: current node, completed trail, deviations. The plan stops being a one-time promise (made at the start, then forgotten) and becomes a **persistently visible third party** in the room.

For knowledge work generally, cognitive labor has been invisible since forever. Complex task done, and only the deliverable remains; the process disappears. A trace is the first time cognition is traceable.

### After: the method itself is preserved

Skills reuse the moves, but the **composition knowledge** (how those moves string together for a kind of task) has no home of its own, so each new task gets re-assembled from scratch, even though the assembly experience is already in your head from prior tasks.

A trace persists the assembly. Next similar task, don't start from zero. Use this trace as skeleton. Regenerate content within it.

**Structure reuse plus content regeneration.** Not template-and-fill (rigid). Not from-scratch (wasteful). Skeleton plus flesh.

Each use can make it better. Using is modifying: the trace itself sharpens as you run it, run after run.

---

## The architectural gap trace fills

The current AI knowledge stack:

- **Weights**: implicit, immutable, opaque
- **Prompts**: static, written, brittle
- **RAG**: fragmented, no structure

There is nowhere to put **"the way of doing this kind of thing"**. Model upgrades lose it. Sessions lose it. Cross-agent transfer loses it.

Trace is the missing layer:

```
agent = model    (judgment)
      + traces  (methods: how to think about kinds of tasks)
      + skills   (capabilities, the moves)
```

Three layers, decoupled. Model-agnostic traces, trace-agnostic skills, skill-agnostic models. From "training agents" to **teaching agents**.

---

## What trace is not

### Not a workflow

A workflow says "do A, then B, then C". A trace says "B's reasoning needs A's output to make sense; if that input isn't there or isn't shaped right, B doesn't apply yet." That is not control flow. It is a **data-shape contract**, which is a method.

Executors can deviate from a trace. Skip steps. Reorder. Replace implementations. Override deliverables. The trace describes the method; it does not dictate the path.

### Not a prompt

A prompt tells an AI what to do for one task. A trace describes a **kind of task**, applicable to many instances and parameterized by inputs.

### Not a chatbot personality

A chatbot's character lives in its system prompt, hidden in the model. A trace lives on disk, in folders you can see, edit, fork.

### Not a workflow engine output

Workflow engines emit graphs as descriptions of execution plans. Traces are **knowledge artifacts** that *outlive* any particular execution. A trace accumulates knowledge across runs; an engine output dies after the run.

---

## The execution model is soft

Trace describes the method. Execution is whoever's doing it: a human, an AI agent, a daemon orchestrating subprocesses, anything.

The trace layer assumes nothing about how execution happens:

- No required runtime
- No required entry-point function signature
- No mandatory body file or naming convention inside step folders
- No required state-tracking infrastructure

Cross-step data flow goes through **files** (declared in `assets`), because files persist regardless of who or what executed the step. Logical variables are not part of the trace contract; files are.

---

## Design principles

1. **Filesystem-native.** A trace is files in folders. Git-able, diff-able, fork-able by anyone with `cp -r`. No database lookup required to know what a trace is.

2. **Self-describing.** A trace folder plus `trace.json` answers "what is this?" without external services. `id`, `title`, `description`, `version` are baked into the file.

3. **Soft over hard.** Fields describe shape; they never enforce execution. `from_steps` declares a dependency; it does not dictate ordering. The executor decides what to do with the description.

4. **Trace and outputs are physically separate.** A trace folder holds the method (template, materials, accumulated memory). A working folder is wherever the executor produces files. The two don't pollute each other.

5. **Direct address.** A trace speaks directly to whoever executes it. The `STEP.md` in each step folder is the description the executor reads.

6. **Step folder is a free-form bundle.** Each step is a folder. The only required file is `STEP.md`. Beyond that, the author puts whatever helps: code (any language, any name), data, references, examples, prompts, screenshots, accumulated memory.

7. **Traces evolve.** A trace is alive. As executors learn from running it, knowledge accumulates in `memory.md` files. As authors refine the method, fields and `STEP.md` files get edited. Trace revision is a deliberate edit, not a side effect of any particular run.

---

## What we deliberately exclude

- **Conditionals and branches.** Traces describe shape, not control flow. If a step always-or-never applies depending on input, that is two traces (or one step whose internal logic handles both cases).
- **Intermediary layers.** A trace is read directly by whoever executes it; nothing sits between the two. The instructions live in each step's `STEP.md`, addressed to the executor directly.
- **Versioning evolution mechanism.** The `version` field exists as a placeholder, but how traces evolve (curator, auto-merge, git-style) is a separate design concern, deliberately deferred.
- **Schedulers and triggers.** A trace is a method, not a job. When and whether to run is the executor's call.
- **Output validators.** The trace does not enforce "this step must produce JSON of shape X". That is the executor's responsibility.
- **Body file conventions.** A step folder has no required body filename. `STEP.md` is the only required file. The executor reads `STEP.md` and decides how to act on whatever materials are in the folder.
- **Run-state structures.** How execution is tracked, where outputs go physically, how multiple runs are organized: none of this is in the trace spec. It is the executor's domain.
- **Logical variable layer.** Traces do not declare cross-step variables. Cross-step data flow is via files (`assets`); the executor reads upstream's files when downstream needs them. Variable names belong in step `STEP.md` files, not in `trace.json`.
