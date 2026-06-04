---
name: threat_intel
description: Pull the ATT&CK technique set + advisory/KEV/EPSS context for this stack.
reads:
  - resources/request.md
writes:
  - threat_intel.json
---

# Threat Intel Feed

Source skill: **analyzing-apt-group-with-mitre-navigator** (Workflow Step 1 — *Query ATT&CK Data*; "Multi-Layer Analysis" — overlay adversary TTPs against detection coverage to find gaps), with advisory/KEV enrichment from **performing-cve-prioritization-with-kev-catalog** (Step 1 — *Fetch and Parse the KEV Catalog*).

The second **root**. A payment-webhook handler has a predictable adversary playbook; this lane
loads the relevant ATT&CK techniques (the ones an attacker chains against injection / weak-auth /
timing weaknesses) and the advisories touching the bumped dependency, so the red-team lane has a
threat model to emulate rather than improvising. It runs independently of the scans.

## What this step does

Assemble the technique set and advisory context for *this* PR's weakness classes — not a generic
dump. Map each candidate weakness class to the ATT&CK techniques an adversary would use, and pull
the KEV/EPSS status of the bumped package's CVE.

## Output: `threat_intel.json`

```json
{
  "attack_domain": "enterprise-attack",
  "relevant_techniques": [{ "id": "T....", "name": "...", "why": "..." }],
  "advisories": [{ "cve": "...", "in_kev": false, "epss": 0.0, "package": "..." }],
  "source": "..."
}
```

## Contributes to

`red_team` reads this alongside `triage` — the emulation chains the triaged findings using these
techniques. (The blue-team lane reuses the same technique IDs when it tags its Sigma rules.)
