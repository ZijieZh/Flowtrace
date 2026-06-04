---
name: posture_report
description: Compose the durable posture artifact — finding inventory, red-team narrative + ATT&CK coverage, blue-team detection coverage, MTTD/SLA.
reads:
  - severity_gate/gate_decision.json
  - red_team/red_team.json
  - blue_team/detections.json
writes:
  - posture_report.md
---

# Posture Report

Source skill: **executing-red-team-exercise** (*Output Format* — the full exercise report:
ATT&CK Technique Coverage table, Detection Summary with MTTD/MTTR, Priority Recommendations),
composed with **analyzing-apt-group-with-mitre-navigator** (*Multi-Layer Analysis* — overlay
adversary TTPs against detection coverage to read the gap) and the **building-detection-rules-with-sigma**
coverage map.

The long-running fan-in: it reads the gate decision, the full red-team result, and the blue-team
detections, and composes the durable security-posture record behind the PR gate. Where `pr_comment`
is the quick verdict, this is the artifact security keeps — the technique-by-technique coverage, the
attack narrative, and the detection-gap read.

## What this step does

Compose `posture_report.md`:

1. **Verdict & scope** — the gate decision and the PR under review.
2. **Finding inventory** — the deduped, scored findings (CVSS/EPSS/KEV/priority/SLA).
3. **Red-team narrative + ATT&CK coverage table** — the attack chain, each step's technique, and
   confirmed/ not-reproduced status (the exercise-report format).
4. **Blue-team detection coverage** — which techniques now have a Sigma/YARA rule (the overlay:
   tested vs covered), and the residual gap.
5. **Posture & SLA** — MTTD posture, the SLA clock on non-blocking debt, and the trend tie-back.

## Output: `posture_report.md`

The durable, audit-friendly report. Deliverable centerpiece.

## Contributes to

The deliverable — alongside the PR comment, the triage output, and the gate decision.
