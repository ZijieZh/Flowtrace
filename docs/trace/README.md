# Trace

A trace is a structured-but-soft, evolving knowledge artifact for doing some kind of thing. It sits between skills (atomic capabilities) and workflows (rigid control flow), as a soft scaffold for cognition.

## Reading order

Read these in this order to understand traces from rationale through specification to lived form:

1. **[PHILOSOPHY.md](./PHILOSOPHY.md)**: what a trace is, why it exists, what it is and isn't, design principles. Start here.
2. **[SCHEMA.md](./SCHEMA.md)**: the format specification. Folder structure, `trace.json` schema, validation rules. Source of truth for tooling.
3. **[FIELDS.md](./FIELDS.md)**: per-field rationale. Why each field exists, when to use it, common mistakes. The judgment layer.
4. **[CLI.md](./CLI.md)**: the one-read system reference for any agent driving the binary: every command, the reply payload schema, the state machine, the error catalog.
5. **[Getting started](../../README.md#install)**: end-user walkthrough: install the tool, run a reference builder, and [make your own trace from any source](../../README.md#make-your-own-trace).
6. **[REFERENCE-TRACES.md](./REFERENCE-TRACES.md)**: the four reference traces (`minimal`, `dream-analysis`, `nested-deps`, `iris-analysis`) and what each demonstrates. Each ships as a builder under `scripts/examples/<id>/` that materializes a full trace folder at `~/traces/<id>/`.

## Audience

These docs are written for two audiences in priority order:

1. **AI agents** authoring or executing traces: the docs are structured so an agent reading them as system prompt context picks up the philosophy first, then the rules, then the field-level judgment, then sees concrete shape variants.
2. **Humans** building trace tooling (daemons, MCP servers, renderers, validators, marketplaces). These docs define what the tooling must respect about the trace format.

## What is not in these docs

These docs cover the trace format only. They do not cover:

- How traces are executed (runtime concern, not spec)
- Where outputs go physically (executor's working folder; not the spec's concern)
- Trace evolution mechanism (deferred; `version` field is a placeholder)
- Marketplace, sync, or sharing (separate sibling docs in the parent `docs/` folder)
- Renderer or daemon implementation (separate sibling docs)

The trace spec is deliberately small. It defines the artifact, not the ecosystem around it.
