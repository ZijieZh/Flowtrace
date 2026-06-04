---
name: triage
description: Fan-in → dedup by root cause, then CVSS v4.0 + EPSS + KEV scoring and a P-level/SLA per finding.
reads:
  - scan_sast/sast.json
  - scan_sca/sca.json
  - scan_secrets/secrets.json
  - scan_variant/variant.json
  - scan_crypto_timing/crypto_timing.json
  - scan_mutation/mutation.json
writes:
  - triage.json
---

# Triage (dedup + CVSS / EPSS / KEV)

Source skill: **prioritizing-vulnerabilities-with-cvss-scoring** (CVSS v4.0 vector strings + the
4.0 severity bands; Step 4 — *Multi-Factor Prioritization Matrix*; Step 5 — *Remediation SLAs*),
composed with **performing-cve-prioritization-with-kev-catalog** (the *KEV + EPSS Decision Matrix*
and "treat all KEV-listed CVEs as P1 regardless of CVSS") and **implementing-epss-score-for-vulnerability-prioritization** (the EPSS×CVSS priority table + percentile thresholds).

This is the **first fan-in** — and the node the whole compose story turns on. It reads all six
scan lanes and does two things the single tools cannot:

1. **Dedup by root cause.** When a `scan_sast` finding and a `scan_variant` taint hit share a
   `tainted_source` / `shares_root_with`, they are *one* defect surfaced twice; triage merges them
   into a single finding. This is why red-team is placed downstream of triage: validating PoCs
   against raw, un-deduped scanner output would burn most cycles re-proving duplicates and false
   positives. Triage is the filter that makes the expensive lane cheap.
2. **Score with combined context, not tool severity.** Each surviving finding gets a CVSS v4.0
   base vector, then EPSS (exploitation probability) and CISA-KEV enrichment, then a P-level and
   SLA from the multi-factor matrix. A "High" from one scanner can move up (KEV-listed / reachable)
   or down (availability-only) once scored in context.

## What this step does

Collapse the raw scanner findings into the deduped set; attach `{cvss_v4, vector, epss, in_kev,
priority, sla_days}` to each; and note explicitly which scanner findings merged and why. Where two
weaknesses only become dangerous in combination (e.g. a leaked secret + a timing-unsafe compose
into one auth-bypass risk), record them as a single scored finding — because neither half is
interesting alone; the *arrow between them* is — and list the deduped `blocking_candidates` that
warrant red-team validation.

## Output: `triage.json`

```json
{
  "raw_count": 0, "deduped_count": 0,
  "dedup": [{ "merged": ["...","..."], "into": "...", "reason": "..." }],
  "findings": [
    { "id": "...", "title": "...", "cwe": ["..."], "cve": "...",
      "cvss_v4": 0.0, "cvss_vector": "CVSS:4.0/...", "severity": "...",
      "epss": 0.0, "in_kev": false, "priority": "P?", "sla_days": 0,
      "from_scanners": ["..."], "source": "..." }
  ],
  "blocking_candidates": ["..."]
}
```

## Contributes to (fan-out)

- `red_team` — validates the `blocking_candidates` (deduped) against ATT&CK.
- `blue_team` — synthesizes detections for the same set (runs in parallel with red-team).
