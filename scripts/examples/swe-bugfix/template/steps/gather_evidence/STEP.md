---
name: gather_evidence
description: Phase 1 — instrument every component boundary, run once, capture which layer breaks.
reads:
  - reproduce/repro.json
writes:
  - evidence.json
---

# Gather Evidence

Source skill: **systematic-debugging** (Phase 1, step 4 — "Gather Evidence in Multi-Component
Systems": *"For EACH component boundary: log what data enters / exits … Run once to gather
evidence showing WHERE it breaks"*).

The system under test spans several components (request entry → application logic → data store →
cache → external call). The skill says: before proposing fixes, add diagnostic instrumentation at
each boundary, run **once**, and let the evidence point at the failing layer.

## What this step does

For **each** component boundary, log what data enters and exits (with timestamps and the relevant
correlation key):

1. entry point (request / event received),
2. the read side of the suspect operation,
3. the write side of the suspect operation,
4. the downstream side effect / external call.

Run the now-deterministic repro **once** and read the interleave. The evidence must show the
**time ordering** that explains the symptom — i.e. exactly where, between which two boundaries,
the invariant breaks.

## Output: `evidence.json`

An ordered, timestamped event trace at every boundary for the failing run, annotated with the
exact interval where the invariant breaks.

## Contributes to (fan-out)

- `pattern_analysis` — compare this broken interleave against a correct one.
