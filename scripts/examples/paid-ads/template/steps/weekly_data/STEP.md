---
name: weekly_data
description: Parse this week's account pull into structured metrics, audience signals, and competitor moves.
reads:
  - resources/request.md
writes:
  - weekly_data.json
---

# Weekly Data

Source skill: **ads** (Reporting & Analysis — Weekly Review: spend vs. budget, CPA/ROAS vs.
target, top/bottom ads, audience breakdown, frequency/fatigue, landing CVR).

This is the **root**. Turn the raw weekly brief into one structured object the five diagnoses
all read. Pull every line from `request.md` — do not invent numbers — and normalise them:

- **Pacing:** spend vs. budget.
- **Efficiency:** blended + per-channel CPA and ROAS vs. the 4-week average, with the deltas.
- **Funnel rates:** CTR by placement (call out the highest-spend creative separately), CVR by landing path.
- **Audience signals:** which segments / lookalikes are moving, with direction.
- **Competitor moves:** anything in the brief that explains auction pressure (per the skill's
  "Attribution Considerations" — platform CPA is inflated; note blended where given).

Flag the **biggest movers** so the diagnoses know where to look. Write `weekly_data.json`.
