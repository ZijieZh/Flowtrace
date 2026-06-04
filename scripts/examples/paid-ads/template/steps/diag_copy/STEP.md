---
name: diag_copy
description: Diagnose the creative — winning vs. fatiguing angles, and what the CTR drop says.
reads:
  - weekly_data/weekly_data.json
writes:
  - diag_copy.json
---

# Diagnose Copy

Source skill: **ad-creative** (Iterating from Performance Data — Analyze Winners / Analyze
Losers; "Retiring creative too early" and ad-fatigue caveats).

One of **five parallel diagnoses** off `weekly_data`. Read the creative numbers only.

Per the skill's iteration loop (`Pull data → identify winning patterns → spot losers`):

- **Winners:** which angles / formats still pull above account CTR? (static vs. video vs. UGC.)
  Name the *pattern* that is working, not just the individual ad.
- **Losers:** where CTR has fallen, separate a **creative problem** (fatigue — an asset live
  unchanged for several weeks while frequency climbs) from a **message problem** (a competitor
  has taken the angle, diluting click intent). The skill says allow 1,000+ impressions before
  judging and watch for the fatigue curve; apply that test rather than retiring too early.
- **Character/spec hygiene:** note if any running headline is over platform limits.

Output a verdict per creative cluster with a `confidence` and a one-line `why`. Write `diag_copy.json`.
