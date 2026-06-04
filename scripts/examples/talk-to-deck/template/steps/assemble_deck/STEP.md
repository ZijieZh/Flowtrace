---
name: assemble_deck
description: Render the single-file, self-contained HTML deck from the rhythm + layouts (inline CSS, no external deps, placeholder blocks for images).
reads:
  - rhythm_table/rhythm.json
  - select_layouts/layouts.json
  - image_prompts/image_prompts.json
  - choose_style/style_decision.json
writes:
  - assemble_deck/deck.html
---

# Assemble Deck

Source skill: **op7418/guizang-ppt-skill** (歸藏) — `SKILL.md` *Step 2 · 拷贝模板 (Copy Template)* +
*Step 3 · 填充内容 (Fill Content)*: start from the style's base file, apply the chosen theme's `:root`
block, then fill each registered layout's `<section>` with the slide's copy / data / image slots. The
skill emits a **single self-contained HTML file** that opens in a browser with no server.

> ⚠️ **AGPL / OWN-RENDERER NOTE.** The source is AGPL-3.0. We lift only the *workflow* (assemble from
> rhythm + layouts into one self-contained HTML file). The renderer, the HTML/CSS, and every template
> shipped here are **our own original work** — **no** source file, template, theme block, or script is
> copied. (Same pattern as nvda-decision's `typeset.py` being ours.)

The fan-in: this is where `select_layouts` and `image_prompts` join.

## What this step does

Render `deck.html` — **one file**, self-contained, that a person can open and present from:

- **Single file, no external deps.** Inline `<style>`; no CDN, no web fonts that need the network, no
  external JS. System font stacks only.
- **Theme from `choose_style`.** Apply the chosen style's tokens (Style A: warm paper, serif headlines,
  one ink accent) using the carried accent colour.
- **One slide per rhythm row**, in order, each in the layout `select_layouts` bound, with its copy / data
  / quote in place and `must_keep` phrases present.
- **Image slots → CSS placeholder blocks.** Every image slot renders as a styled placeholder (its
  `placeholder` label + aspect box) — **no real images** are embedded.
- Keyboard / scroll navigation is fine but must be inline and optional; the deck must render with JS off.

## Output: `assemble_deck/deck.html`

A single `.html` file. Opening it shows the full deck; no build step, no assets folder.

## How to approach it

- Keep it genuinely self-contained — the deliverable check is "opens as a real page offline".
- Respect the rhythm: alternate light/dark sections; hero rows get the full-bleed treatment.
- Reproduce each `must_keep` phrase exactly so `self_validate` finds it.

## Optional renderer

A pure-stdlib Python renderer may ship under `scripts/` and emit this file from the upstream JSON; it is
**optional** and stdlib-only (no third-party deps — `environment.python` stays empty). The deck is an
authored, self-contained fixture either way.

## Contributes to

`self_validate` (audits this file) and `social_cover` (reuses its core message + accent).
