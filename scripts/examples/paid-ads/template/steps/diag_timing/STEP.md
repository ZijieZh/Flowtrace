---
name: diag_timing
description: Diagnose delivery timing, frequency, and attribution quality.
reads:
  - weekly_data/weekly_data.json
writes:
  - diag_timing.json
---

# Diagnose Timing

Source skill: **analytics** (Attribution + UTM Parameter Strategy; "platform attribution is
inflated — compare to GA4, look at blended CAC") composed with **ads** (frequency caps and
ad-fatigue thresholds in Retargeting Windows / Reporting).

One of **five parallel diagnoses**. Read delivery, frequency, and attribution only.

- **Frequency / fatigue:** is prospecting frequency rising — is delivery hitting the same people
  too often? Cross-reference with the creative diagnosis's fatigue read; a frequency climb is the
  delivery-side fingerprint of the same fatigue the creative lane may be seeing.
- **Attribution sanity:** is any reported platform CPA move real, or partly a measurement /
  windowing artefact? The skill's rule: platform CPA is inflated; trust blended CAC and UTM-based
  GA4 numbers over a single platform's claim. State whether the CPA move survives that check (a
  measurement glitch would not spare cleanly-attributed brand search while hitting blended).
- **Dayparting:** note any time-of-day / day-of-week signal worth respecting at launch.

Output the timing/attribution findings with confidence. Write `diag_timing.json`.
