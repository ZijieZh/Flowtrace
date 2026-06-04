---
name: blue_team
description: Synthesize Sigma + YARA detections from the triaged findings; map each to its ATT&CK technique.
reads:
  - triage/triage.json
writes:
  - detections.json
---

# Blue Team (Sigma + YARA)

Source skill: **building-detection-rules-with-sigma** (*Common Scenarios* — "Purple Team Output:
Convert red team findings into Sigma rules"; Step 1 rule body + Step 4 — *Map to MITRE ATT&CK*),
composed with **performing-yara-rule-development-for-detection** (*Rule Structure* meta/strings/
condition; *String Selection Strategy* — anchor on a stable, unique artifact).

The other consumer of `triage`, running **in parallel with `red_team`** (`red_team ∥ blue_team`).
Detection-as-code is the defensive mirror of the offensive lane: for the same triaged findings, it
writes rules that would *catch* the exploitation the red-team is proving, so a gap the scan found
also becomes a thing the SOC can see.

## What this step does

- **Sigma** rule for the exploitation behavior the red-team chain would produce (e.g. anomalous
  signature-verification failures / accepted-event patterns), tagged with that step's ATT&CK
  technique, in the skill's `logsource`/`detection`/`condition` form, validated with `sigma check`.
- **YARA** rule anchored on a stable, unique artifact from the finding (per the skill's string-
  selection strategy — e.g. a leaked-credential string) so it is flagged if it appears in any build
  artifact or image — defense-in-depth until the underlying issue is fixed.

Each rule carries its ATT&CK mapping and a false-positive note.

## Output: `detections.json`

```json
{
  "sigma": [{ "id": "...", "title": "...", "attack": ["T...."], "level": "...",
              "logsource": "...", "covers_finding": "...", "validated": true, "falsepositives": ["..."] }],
  "yara": [{ "rule": "...", "anchor": "...", "covers_finding": "...", "note": "..." }],
  "coverage_note": "...",
  "source": "..."
}
```

## Contributes to (fan-in → gate)

`severity_gate` reads this as the **blue** half: detection coverage is a *compensating control* in
the decision, recorded but never sufficient on its own to unblock. `posture_report` reports the
coverage map.
