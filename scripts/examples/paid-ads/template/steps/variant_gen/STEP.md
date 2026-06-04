---
name: variant_gen
description: Produce control vs. treatment — ad creative (angle/headlines/specs) + matching landing changes.
reads:
  - ab_setup/ab_setup.json
writes:
  - variants.md
---

# Variant Generation

Source skill: **ad-creative** (Generating Ad Copy — Define Your Angles, Generate Variations,
Validate Against Specs; platform character limits for Meta / Google RSA) composed with **cro**
(Copy Alternatives — 2–3 headline/CTA options with rationale; message-match to the ad).

Build the actual assets the test will run, true to `ab_setup.json`'s single variable.

- **Ad creative:** define the treatment **angle** (from ad-creative's angle table), then write
  the headlines / primary text. **Validate every line against platform limits** and print the
  character count the way the skill mandates (Meta primary text, Google RSA ≤30-char headlines /
  ≤90-char descriptions). Keep the control spec'd alongside for a clean comparison.
- **Landing match:** apply CRO — the landing headline must match the ad's promise. Give the
  control vs. treatment copy for whatever element the test changes, with a one-line rationale.
- **Hold everything else constant** — only the tested variable differs, so the read is clean.

Write `variants.md` as a side-by-side control/treatment spec (ad + landing), specs validated.
