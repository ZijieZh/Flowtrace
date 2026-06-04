---
name: triage_priority
description: Classify severity / blast radius / priority and commit to systematic debugging (no quick patch).
reads:
  - bug_report/bug_report.json
writes:
  - triage.json
---

# Triage & Priority

Source skill: **systematic-debugging** ("When to Use" + "Common Rationalizations" table —
*"Use this ESPECIALLY when under time pressure"*; *"Manager wants it fixed NOW → systematic
is faster than thrashing"*).

A high-impact bug is exactly the situation the skill warns is most tempting to hot-patch.
This node makes the explicit decision **not** to: it sets priority **and** records the
commitment to run the full Four-Phase process before any fix.

## What this step does

- Assign **severity** (graded by user/business impact), **blast radius** (who/what is affected,
  and under which conditions), and **priority**.
- Reject the tempting shortcuts in the skill's rationalization table and name them, so the
  trace shows the discipline was a choice, not an accident.
- Hand off to Phase 1 (`reproduce`).

## Output: `triage.json`

```json
{ "severity": "...", "priority": "...",
  "blast_radius": "...", "user_impact": "...",
  "decision": "systematic-debugging required",
  "rationalizations_rejected": [ { "excuse": "...", "reality": "..." } ] }
```

## Contributes to (fan-out)

- `reproduce` — the first phase-1 activity.
