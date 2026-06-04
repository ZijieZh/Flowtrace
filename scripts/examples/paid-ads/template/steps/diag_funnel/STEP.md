---
name: diag_funnel
description: CRO read of the post-click path — value prop, headline match, CTA, trust, friction.
reads:
  - weekly_data/weekly_data.json
writes:
  - diag_funnel.json
---

# Diagnose Funnel

Source skill: **cro** (CRO Analysis Framework, in impact order: Value-Prop Clarity → Headline
Effectiveness → CTA → Visual Hierarchy → Trust/Social Proof → Objection Handling → Friction).

One of **five parallel diagnoses**. Read the post-click conversion path only.

Run the CRO framework against each landing path the brand runs (e.g. a direct product page and a
guided multi-step funnel) using their CVRs:

- **Message match:** does the landing headline match the ad's promise for each traffic source?
  A CTR problem on the ad and a CVR problem on the page can have the *same* root (message drift).
- **Where the CVR loss is:** if one path softens while another holds, that **localises** the
  problem to a single path rather than the site as a whole — and a dip that tracks lower-quality
  upstream traffic is *downstream* of the real constraint, not a new on-page defect. Distinguish
  the two before recommending a redesign.
- **Friction & trust:** flag the highest-impact, lowest-effort fixes (the skill's "Quick Wins")
  vs. the bigger "High-Impact Changes," and surface 1–2 **Test Ideas** for the hypothesis step.

Output the per-path CRO read + ranked fixes + seed test ideas, with confidence. Write `diag_funnel.json`.
