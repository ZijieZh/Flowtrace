---
name: diag_audience
description: Diagnose the audience — which segments convert, where intent decays, what JTBD the movers map to.
reads:
  - weekly_data/weekly_data.json
writes:
  - diag_audience.json
---

# Diagnose Audience

Source skill: **customer-research** (Extraction Framework — Jobs to Be Done, Pain Points,
Trigger Events; confidence labelling) composed with **ads** (Audience Targeting — lookalikes
"by LTV, not all customers"; retargeting by funnel stage).

One of **five parallel diagnoses**. Read the audience signals only.

- **Segment economics:** which segments / lookalikes are converting, which are decaying, and
  by how much. Separate the durable high-LTV segments from the softening ones.
- **JTBD read:** map each moving segment to the job they're hiring the product for. A decaying
  segment may be a *seasonal* JTBD shift (a job whose demand ebbs and flows with the calendar),
  not a targeting failure — call that out so the brand doesn't over-correct on a transient dip.
- **Lookalike quality:** apply the skill's rule — base lookalikes on best customers by LTV;
  note if a wider lookalike tier is dragging efficiency and should be trimmed back toward the
  tighter, higher-intent seed.

Label each finding High / Medium / Low confidence (customer-research guardrail). Write `diag_audience.json`.
