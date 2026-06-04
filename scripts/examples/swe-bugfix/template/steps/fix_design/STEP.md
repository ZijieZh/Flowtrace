---
name: fix_design
description: Design the source fix plus defense-in-depth layers BEFORE writing any code.
reads:
  - root_cause/root_cause.json
writes:
  - fix_design.md
---

# Fix Design

Source skill: **brainstorming** (HARD-GATE: *"Do NOT … write any code … until you have
presented a design"* — design before implementing) + **systematic-debugging / defense-in-depth.md**
("Validate at EVERY layer … make the bug structurally impossible" — the Four Layers).

The root cause is known; resist jumping to code. Design the fix, including the layers that make
the failure **structurally impossible**, not merely unlikely.

## What this step does

Specify the fix at the source and the defense-in-depth stack — validate at every layer so no
single regression can reopen the bug:

- **Source fix (Layer 2, business logic):** the minimal change at the root-cause location that
  removes the cause itself (not the symptom).
- **Layer 1 (entry):** validate / reject bad input at the boundary before it reaches the logic.
- **Layer 3 (data / structural guard):** a constraint or invariant in the lower layer that
  backstops the fix so even a future code path cannot reintroduce the failure.
- **Layer 4 (observability):** keep a permanent diagnostic breadcrumb (carried from
  `gather_evidence`) so a regression would be caught fast.

Also specify the **failing test** the implementer must write first (Phase 4 / TDD): the precise,
falsifiable assertion that fails today and will pass once the source fix lands.

## Output: `fix_design.md`

The design doc: source change, the defense-in-depth layers, the test contract, and
rollout/rollback notes.

## Contributes to (fan-out)

- `implement_tdd` — build it test-first.
