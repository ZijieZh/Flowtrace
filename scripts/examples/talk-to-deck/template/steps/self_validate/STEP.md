---
name: self_validate
description: Audit the assembled deck against the checklist (structure, typography, image cropping, theme rhythm, contrast, overflow) and record pass/fail per item.
reads:
  - assemble_deck/deck.html
  - rhythm_table/rhythm.json
  - intake/brief.json
writes:
  - self_validate/validation.json
---

# Self-Validate

Source skill: **op7418/guizang-ppt-skill** (歸藏) — `SKILL.md` *Step 4 · 对照检查清单自检 (Self-Check
Against Checklist)* + `references/checklist.md` (the *最终自检清单 / Final Self-Check Checklist*): its
categories — 预检 (pre-check), 内容 (content / pacing / no-emoji), 排版 (typography & layout: no 1-character
title orphans, fixed image heights, crop bottom only — top & sides intact), 视觉 (hero ↔ non-hero
alternation, restraint on shadows), and P0–P3 severity tiers. **Workflow-only lift — our own prose; no
source checklist text is copied.**

## What this step does

Open `deck.html` and audit it item-by-item, recording **pass/fail + a note** for each. The checks
(adapted to this example's own deck, Style A):

- **structure** — slide count within the page budget; cover + closing present.
- **theme_rhythm** — no 3+ consecutive same-theme slides; ≥1 hero (re-checks `rhythm.json`).
- **typography** — serif headlines for Style A; no one-character title orphans.
- **image_handling** — every image slot is a placeholder block at a standard aspect; no real images; no
  raw source ratios.
- **must_keep** — each `must_keep` phrase from the brief appears verbatim in the deck.
- **self_contained** — no external URLs / CDNs / network fonts; renders with JS off.
- **contrast / overflow** — readable title-to-body contrast; nothing collides with the bottom edge.

Assign each a severity if failed (P0 = blocks preview … P3 = polish) and an overall `ready` verdict.

## Output: `validation.json`

```json
{
  "target_ref": "assemble_deck/deck.html",
  "checks": [
    { "item": "self_contained", "passed": true, "severity": null, "note": "..." }
  ],
  "ready": true,
  "note": "..."
}
```

## How to approach it

- Check the deck **as built**, not as intended — read the actual HTML (e.g. grep for each `must_keep`
  string, confirm no `http`/`cdn` references, count slides).
- A failed P0/P1 should send you back to `assemble_deck` (or, if the cause is a pacing/style decision,
  upstream to `rhythm_table` / `choose_style`) and re-run downstream.

## Contributes to

The deliverable's quality gate; `social_cover` proceeds once the deck is `ready`.
