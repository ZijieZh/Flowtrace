---
name: severity_gate
description: Block/allow the PR from the COMBINED red+blue result — High+ AND confirmed-exploitable blocks.
reads:
  - red_team/red_team.json
  - blue_team/detections.json
writes:
  - gate_decision.json
---

# Severity Gate

Source skill: **implementing-devsecops-security-scanning** (Step 5 — *Aggregate Results and Enforce
Security Gates*: the `security-gate` job that `needs:` the scan jobs and exits 1 to block; Step 6 —
*Branch Protection* required status check), with the severity threshold + SLA semantics from
**prioritizing-vulnerabilities-with-cvss-scoring** (Step 5 SLAs) / **performing-cve-prioritization-with-kev-catalog** (KEV ⇒ P1).

The **second fan-in**. The DevSecOps skill's gate fails the pipeline if any scan job fails — but a
raw "any High severity blocks" gate over six tools is noisy and game-able. This gate is the compose
upgrade: it decides from the **combined red+blue result**, not from any single scanner's severity.

## The decision rule (combined, not single-tool)

A finding **blocks** the merge iff it is **both**:

- **High+ after triage** (CVSS v4.0, EPSS/KEV-enriched — from the red-team input, which carries the
  triaged scores it validated), **and**
- **confirmed-exploitable** by `red_team`.

Detection coverage from `blue_team` is folded in as a **compensating control**: it is recorded on
the decision and lowers residual risk, but it never on its own turns a block into an allow — you do
not ship a confirmed-exploitable High because you can also alert on it. Findings that are High but
*not* reproduced, or exploitable but *not* High (e.g. an availability-only fuzz crash), do **not**
block; they ship as tracked debt with their SLA.

## What this step does

Join `red_team.validated` with `blue_team` coverage; apply the rule above; emit the verdict, the
exact blocking finding(s), the compensating controls, and the per-finding disposition.

## Output: `gate_decision.json`

```json
{
  "pr": 0, "decision": "block|allow", "rule": "High+ AND confirmed-exploitable",
  "blocking_findings": [{ "finding": "...", "severity": "...", "confirmed_exploitable": true, "technique": "T...." }],
  "compensating_controls": [{ "finding": "...", "detection": "sigma|yara:...", "effect": "residual-risk-reduced-not-waived" }],
  "non_blocking": [{ "finding": "...", "why": "...", "sla_days": 0 }],
  "check": { "label": "PR merge gate", "passed": false },
  "source": "..."
}
```

## Contributes to (fan-out)

`pr_comment` (developer-facing verdict) and `posture_report` (durable record).
