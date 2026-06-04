---
name: reproduce
description: Phase 1 — build a reliable reproduction and read the error carefully before anything else.
reads:
  - triage_priority/triage.json
writes:
  - repro.json
---

# Reproduce Consistently

Source skill: **systematic-debugging** (Phase 1: Root Cause Investigation — step 1 "Read Error
Messages Carefully" + step 2 "Reproduce Consistently": *"Can you trigger it reliably? … If not
reproducible → gather more data, don't guess"*).

When the bug is intermittent, the first job is to make it **not** intermittent on demand. A flaky
repro is a dead end — the skill is explicit that you gather more data rather than guess.

## What this step does

- Read the error / log line carefully and extract the one fact the rest of the investigation
  pulls on (the skill's step 1 — don't skim past it).
- Construct a **deterministic** repro: find the conditions that trigger the failure on demand and
  drive them directly, measuring the failure rate as you vary the suspected trigger.
- Establish the **boundary conditions** — which inputs / timings / states make it fire vs. stay
  safe — so later phases have a stable test bed.

## Output: `repro.json`

A repro recipe + a small results table (varied trigger → failure rate) proving it is now reliably
triggerable, plus the key observation the read surfaced.

## Contributes to (fan-out)

- `gather_evidence` — instrument the boundaries of the now-reproducible failure.
