---
name: bug_report
description: Parse the incoming bug report into symptom, stack/log excerpt, and a concrete repro signal.
reads:
  - resources/request.md
writes:
  - bug_report.json
---

# Bug Report

Source skill: **systematic-debugging** (Phase 1, step 1 — "Read Error Messages Carefully":
don't skip past errors; note line numbers, file paths, error codes).

The root node. Turn the free-text report (`resources/request.md`) into a structured record the
rest of the trace can consume — *without* proposing a fix. Per the skill's **Iron Law**
(`NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST`), this step only *reads and records*.

## What this step does

Extract, verbatim where possible:

- the **symptom** (what the user sees) and its business impact,
- the **stack / log excerpt** and the exact file:line it points at,
- the **repro signal** the reporter already noticed (the conditions under which it does / doesn't fire),
- the suspect module and the hard constraints on any fix.

## Output: `bug_report.json`

```json
{ "id": "...", "symptom": "...", "log_excerpt": ["..."],
  "suspect_file": "...:NN", "repro_signal": "...",
  "constraints": ["..."], "fix_proposed": false }
```

`fix_proposed` is pinned `false` here on purpose — it is the trace's record that the Iron Law
held at the entry point.

## Contributes to (fan-out)

- `triage_priority` — severity / priority decision built on this record.
