---
name: hypothesis
description: Turn the bottleneck + accumulated brand memory into 3 ICE-weighted candidate experiments.
reads:
  - problem_tree/problem_tree.json
  - memory.md
writes:
  - hypothesis.json
---

# Hypothesis

Source skill: **ab-testing** (Hypothesis Framework — the `Because [data], we believe [change]
will cause [outcome] for [audience]; we'll know when [metric]` structure — plus ICE
Prioritization and Hypothesis Generation sources) composed with **product-marketing** (the
`.agents/product-marketing.md` context document — read it before proposing anything).

**This is the GROW node.** It reads two things: this week's `problem_tree.json` *and* the
accumulated brand `memory.md` (the lift of the product-marketing context doc). The whole point
of the loop lives here — memory is what turns a generic A/B-testing skill into *this brand's*
judgment.

Procedure:

1. **Read `memory.md` first** (product-marketing's rule: read the context before asking/proposing).
   Treat every settled entry as a constraint on the experiment space.
2. **Generate candidates** for the binding constraint, sourced the way ab-testing's Hypothesis
   Generation prescribes (analytics drop-offs, customer research, competitor moves, past
   experiments).
3. **Prune against memory — explicitly.** For any candidate that contradicts a settled learning,
   *drop it and name the memory entry that ruled it out* (e.g. don't re-test an approach memory
   has already shown loses, and don't re-run a framing the playbook previously retired). This
   explicit skip — refusing a generic reflex by citing the week that settled it — is the
   brand-specificity made visible.
4. **Write each survivor in the hypothesis structure** and score **ICE** (Impact, Confidence,
   Ease, 1–10). Confidence must lean on memory/data, not gut — cite the supporting entry.
5. Rank by ICE; the top 1–2 go to `ab_setup`.

Write `hypothesis.json`: the candidates (with ICE + the memory entry each leans on), the
explicitly-pruned ones (with the entry that killed them), and the ranked recommendation.
