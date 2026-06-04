---
name: scan_sca
description: Software Composition Analysis of the manifest/lockfile; CVE + exploit maturity + reachability.
reads:
  - intake/scan_target.json
writes:
  - sca.json
---

# SCA (Snyk / dependency scan)

Source skill: **performing-sca-dependency-scanning-with-snyk** (*Output Format* — the per-CVE block with Package / Severity (CVSS) / Exploit maturity / Fix / dependency Path; Key Concepts — *Reachable Vulnerability*, *Exploit Maturity*, *Transitive Dependency*).

One of the six parallel scan lanes. SCA matches the bumped dependency against the vulnerability
database and records, per finding, the CVE, CVSS, **exploit maturity**, and crucially whether the
vulnerable function is **reachable** from the changed code — the skill warns that "we don't call
that function" is a risky dismissal, so reachability is recorded, not assumed.

## What this step does

Resolve direct vs transitive for each bumped/added package and report any known CVE with its
CVSS, exploit maturity, a fix version, and the dependency path. Critically, determine whether the
vulnerable function is **reachable** from the changed code — if the new code path actually calls
into it — and record that rather than assuming "we don't call that function."

## Output: `sca.json`

```json
{
  "tool": "snyk", "manifest": "go.mod",
  "dependencies": { "direct": 0, "transitive": 0 },
  "findings": [
    { "id": "...", "package": "...", "version": "...", "direct": true,
      "cve": "CVE-...", "cvss": 0.0, "exploit_maturity": "...",
      "reachable": true, "fix": "...", "path": "...", "cwe": ["CWE-..."], "source": "..." }
  ]
}
```

## Contributes to (fan-in)

`triage` — the CVE + CVSS + exploit-maturity + reachability feed the KEV/EPSS enrichment and the
P-level decision directly.
