---
name: ingest_macro
description: Read the macro backdrop — risk-on/off, VIX, rates, rotation.
writes:
  - macro.json
---

# Ingest Market Environment

Source skill: **market-environment-analysis** (Core Workflow steps 1–2).

Collect the market backdrop a single-name decision sits inside: major indices, VIX
(volatility regime), Treasury yields, and which sectors capital is rotating into / out
of. Classify the environment **risk-on / risk-off / neutral** and a short-term
direction. Write `macro.json`. This sets the exposure baseline before any stock-level
work (the exposure-coach principle: regime sets the baseline, breadth adjusts within it).
