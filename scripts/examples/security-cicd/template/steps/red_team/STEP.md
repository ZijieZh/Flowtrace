---
name: red_team
description: ATT&CK emulation / PoC validation against the DEDUPED findings; chain them; mark confirmed-exploitable.
reads:
  - triage/triage.json
  - threat_intel/threat_intel.json
writes:
  - red_team.json
---

# Red Team (ATT&CK emulation)

Source skill: **executing-red-team-exercise** (Step 1 — *Adversary Emulation Planning*: map each
phase to ATT&CK tactics; Step 5 — *Purple Team Integration*: technique-by-technique table with
detected? / MTTD; *Output Format* — the ATT&CK Technique Coverage table), composed with
**performing-threat-emulation-with-atomic-red-team** (run atomic tests per technique to validate
coverage) and using the technique set from `threat_intel`.

The second consumer of `triage` (alongside `blue_team`). Adversary emulation is expensive, so it
runs **only on the deduped, scored finding set** — `triage.blocking_candidates`, not raw scanner
output. For each candidate it answers the one question CVSS cannot: *is this actually exploitable
here, and what does chaining it achieve?*

## Why this is downstream of triage (the compose point)

Running PoC validation on un-deduped scanner output would re-prove the same SQLi twice and chase
false positives — the skill's own pitfall is "operating too aggressively for no value." Triage
first means every PoC cycle lands on a real, distinct, already-prioritized defect. The arrow
`triage → red_team` *is* the 90%-cost saving.

## What this step does

Chain the triaged `blocking_candidates` into an attack path and map each step to ATT&CK. The
emulation looks for how findings *compose* — e.g. whether an auth weakness (a leaked secret + a
timing-unsafe signature compare) lets an attacker reach an otherwise-internal sink (such as an
injection finding) with attacker-controlled input, turning two findings into one end-to-end path.

For each candidate, mark it `confirmed-exploitable` or `not-reproducible` (a High-by-CVSS finding
that does not actually chain *here* is recorded as not-reproducible — the value of running after
triage), record the technique IDs and the chained business impact, and (purple-team) hand the
confirmed techniques to `blue_team` semantics.

## Output: `red_team.json`

```json
{
  "engagement": "PR emulation (deduped set only)",
  "attack_chain": [{ "step": 0, "technique": "T....", "name": "...", "uses_finding": "...", "result": "..." }],
  "validated": [{ "finding": "...", "confirmed_exploitable": true, "technique": "T....", "note": "..." }],
  "objective_outcome": "...",
  "source": "..."
}
```

## Contributes to (fan-in → gate)

`severity_gate` reads this as the **red** half. `blue_team` reads `triage` directly but covers the
techniques this lane confirmed. `posture_report` uses the attack narrative + ATT&CK table.
