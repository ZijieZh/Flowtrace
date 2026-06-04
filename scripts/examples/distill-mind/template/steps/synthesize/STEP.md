---
name: synthesize
description: Integrate the verified survivors into the persona's framework — mental models, decision heuristics, expression DNA, values & anti-patterns, inner tensions, lineage, and the honest boundary.
reads:
  - triple_verify/verification.json
writes:
  - framework.json
---

# Synthesize the Framework

Source skill: **huashu-nuwa** (Phase 2 框架提炼 / Synthesis — sections 2.1 through 2.6).

Take the triple-test survivors and assemble the **cognitive operating system** the persona will run.
This is the most judgment-heavy node (the skill pauses for a confirm checkpoint right after it).

## What this step does (the six Phase-2 sub-steps)

- **2.1 Mental models (3–7)** — order the model-tier survivors by *exclusivity* (most distinctive
  first) and keep the top 3–7. The skill is firm: **fewer but deeper** — three sharp models beat ten
  shallow principles. Each model records: name, one-line, evidence (≥2 scenes), when-to-apply, and its
  **limit** (the conditions under which it fails — not just its strengths).
- **2.2 Decision heuristics (5–10)** — the fast "if X then Y" rules, each with a concrete case from the
  decisions lane.
- **2.3 Expression DNA** — fold lane 3's fingerprint into the role-play voice rules (sentence shape,
  vocabulary, taboo words, rhythm, humor, certainty register, citation habit).
- **2.4 Values & anti-patterns** — 3–5 ranked values, the behaviors the subject explicitly rejects, and
  the **inner tensions** (the conflicts between values — the skill calls these the *source of depth*,
  kept, never reconciled).
- **2.5 Intellectual lineage** — who shaped the subject → the subject → whom they shaped.
- **2.6 Honest boundary** — what the persona *cannot* do: predict the subject on a brand-new problem,
  substitute their creativity/intuition, close the public-voice vs private-view gap; plus the
  information cutoff date.

## Output: `framework.json`

One object with `mental_models[]`, `decision_heuristics[]`, `expression_dna`, `values`,
`anti_patterns`, `tensions[]`, `lineage`, and `honest_boundary`. This is the spec `persona_skill` is
built from, and the source the two validation lanes test.

## Contributes to (fan-out)

- `known_traits` — sanity-checks the models against the subject's on-record positions
- `novel_inferences` — edge-tests the models on questions the subject never addressed
- `persona_skill` — assembles the runnable SKILL.md
