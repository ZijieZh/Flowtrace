---
name: memory_writeback
description: Append this week's decision + experiment-playbook entry to the brand memory.
reads:
  - launch_plan/launch_plan.md
writes:
  - memory.md
---

# Memory Writeback

Source skill: **ab-testing** (The Experiment Playbook — "when a test wins, don't just implement
it, document the pattern"; the playbook entry template) composed with **product-marketing**
(maintaining the `.agents/product-marketing.md` context document over time).

This is what **closes the GROW loop**. It rewrites `memory.md` so it carries one more week of
brand-specific judgment into the next cycle — exactly how product-marketing treats its context
doc as a living file, and how ab-testing turns a result into a reusable pattern.

- **Carry forward** every prior entry verbatim — memory is append-mostly, not replace; never lose
  a settled learning.
- **Add this week's decision block**: the binding constraint named, the experiment chosen and
  *why*, and which candidates were explicitly skipped because memory had already ruled them out
  (the pruning is part of the record).
- **Add a pending playbook stub** in ab-testing's template shape (Hypothesis / Sample size /
  Status: *running* — to be filled with the result next cycle). A test that hasn't read out yet
  is logged as *pending*, not a win.
- Keep it tight and scannable; this file is read at the top of every future hypothesis step.

Write `memory.md` — the updated brand playbook, now one week richer.
