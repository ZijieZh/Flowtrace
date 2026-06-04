---
name: problem_tree
description: Fan in all five diagnoses; name the ONE binding bottleneck and rank the rest.
reads:
  - diag_copy/diag_copy.json
  - diag_audience/diag_audience.json
  - diag_timing/diag_timing.json
  - diag_channel/diag_channel.json
  - diag_funnel/diag_funnel.json
writes:
  - problem_tree.json
---

# Problem Tree

Source skill: **marketing-psychology** (Theory of Constraints — "every system has one bottleneck
limiting throughput; find and fix that constraint before optimizing elsewhere"; supported by
Local vs. Global Optima and Occam's Razor).

This is the **fan-in** — the node that makes the trace more than five parallel reads. It cannot
start until all five diagnoses finish.

Integrate the five reads into a single causal picture and apply Theory of Constraints:

- **Name the one binding constraint this week.** Not a list — the single bottleneck that, left
  unfixed, caps the account regardless of what else you optimise. (Occam's Razor: prefer the
  simplest cause that explains the most movers.)
- **Rank the rest** as contributing / downstream / noise, and say *why each is subordinate* to
  the binding one (e.g. a metric can matter in general yet not be this week's constraint because
  a parallel path held and the loss is traceable upstream of it).
- **Separate structural from seasonal/transient** causes so the hypothesis chases a durable win.
- State **where the diagnoses disagree** and how you weighted them.

Write `problem_tree.json` with the binding constraint, the ranked contributors, and the rationale.
