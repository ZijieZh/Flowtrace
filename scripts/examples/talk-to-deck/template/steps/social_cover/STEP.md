---
name: social_cover
description: Terminal branch — from the same core message, spec a matching social-cover pair (e.g. WeChat 21:9 + Xiaohongshu 3:4) and render them as one self-contained HTML sheet.
reads:
  - assemble_deck/deck.html
  - choose_style/style_decision.json
  - intake/brief.json
writes:
  - social_cover/covers.html
---

# Social Cover

Source skill: **op7418/guizang-ppt-skill** (歸藏) — the README's **平台封面 (platform covers)** pipeline:
*"基于文章或 PPT 核心观点生成平台封面 … 从同一份内容生成公众号 21:9、1:1 分享卡、小红书 3:4、视频号横版封面"*
(from the deck's core message, generate a matching set of platform covers — WeChat 公众号 21:9 banner, 1:1
share card, Xiaohongshu 3:4, video horizontal). This is a terminal branch off the finished deck.
**Workflow-only lift — our own prose; our own renderer; no source file is copied.**

The terminal node. It reuses the deck's one core message + the shared accent — it does **not** restart the
content design.

## What this step does

From the deck's core message, produce a **matching cover pair** as a single self-contained HTML sheet:

- pick the two highest-value formats for this talk — e.g. **WeChat 21:9** (wide banner) + **Xiaohongshu
  3:4** (portrait card);
- reuse the **same accent + type system** as the deck so the set reads as one family;
- carry the talk's hook / title as the cover headline (no new argument);
- render each cover as a correctly-proportioned box in `covers.html` — **placeholder background blocks,
  no real images.**

## Output: `social_cover/covers.html`

One self-contained `.html` sheet showing both covers at their true aspect ratios (21:9 and 3:4), inline
CSS, no external deps, no real images.

## How to approach it

- Keep it **a pair**, visibly the same family as the deck (one accent, one type system).
- Hold the true aspect ratios — the covers are platform-spec'd, not arbitrary boxes.
- No new claims: the cover compresses the deck's existing hook, nothing more.

## Contributes to

The deliverable — the share-ready cover pair that ships alongside the deck.
