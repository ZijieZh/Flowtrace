---
name: diag_channel
description: Diagnose channel economics and read the competitor moves driving auction pressure.
reads:
  - weekly_data/weekly_data.json
writes:
  - diag_channel.json
---

# Diagnose Channel

Source skill: **ads** (Platform Selection Guide + Campaign Optimization — "If CPA is too high"
/ "If CPM is high" lever trees) composed with **competitor-profiling** (Positioning & Messaging /
Strengths reads applied to the competitor moves in the brief).

One of **five parallel diagnoses**. Compare the two channels and explain external pressure.

- **Channel split:** Meta vs. Google economics (CPM / CPC / CPA). Where is any CPA rise
  concentrated — prospecting vs. brand vs. non-brand? Brand search holding while non-brand and
  Meta prospecting deteriorate localises the problem to top-of-funnel paid, not the brand itself.
- **Lever read:** walk the skill's "CPA too high" / "CPM high" checklists — is the problem
  pre-click (auction / targeting) or post-click (landing)?
- **Competitor read:** read whatever competitor moves the brief reports (sales, a new messaging
  angle) for their effect on shared-interest CPMs and on the angles you compete for. Profile each
  move with competitor-profiling: is it **transient** (a seasonal sale that will lapse) or
  **structural** (a positioning land-grab)? Separate controllable levers from external pressure
  that will normalise on its own.

Output per-channel diagnosis + the competitor read, each with confidence. Write `diag_channel.json`.
