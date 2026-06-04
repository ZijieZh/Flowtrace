---
name: root_cause
description: Record the confirmed root cause at the source — the Iron Law's gate is now satisfied.
reads:
  - test_hypothesis/hypothesis_test.json
writes:
  - root_cause.json
---

# Root Cause

Source skill: **systematic-debugging** (The Iron Law — *"NO FIXES WITHOUT ROOT CAUSE
INVESTIGATION FIRST"*; "Fix at source, not at symptom") + **root-cause-tracing.md** ("Key
Principle: NEVER fix just where the error appears").

This node is the gate the Iron Law guards. Only now — Phase 1–3 complete and the cause confirmed
by experiment — is the trace permitted to design a fix. It states the cause at the **source**,
not at the symptom (the place the error surfaces is rarely the place to fix it).

## What this step does

Write the single, defensible root-cause statement plus the precise source location, and name the
*symptom-level fixes that would be wrong* (so the next step can't regress into one).

## Output: `root_cause.json`

```json
{ "root_cause": "...the confirmed source-level cause, in one defensible sentence...",
  "source_location": "<file> — <the specific construct at fault>",
  "symptom": "...what the user actually saw...",
  "not_the_fix": ["...symptom-level patches that would mask, not cure..."],
  "iron_law_satisfied": true }
```

## Contributes to (fan-out)

- `fix_design` — design the source fix + defense-in-depth.
