---
name: scan_sast
description: Static analysis of the changed code with security rules; emit CWE-tagged findings.
reads:
  - intake/scan_target.json
writes:
  - sast.json
---

# SAST (Semgrep)

Source skill: **implementing-semgrep-for-custom-sast-rules** (*Writing Custom Rules* — the `sql-injection-string-format` rule, `cwe: CWE-89`; *Best Practices* #8 "Run in CI as a blocking check for ERROR severity"). The `p/security-audit` + `p/owasp-top-ten` rule packs come from **implementing-devsecops-security-scanning** (Workflow Step 2 — *SAST with Semgrep*).

One of the six parallel scan lanes, all reading `intake`. Semgrep pattern-matches the changed
code for security anti-patterns and writes ERROR/WARNING findings with CWE + OWASP metadata.

## What this step does

Run the security rulesets over the changed handler and config. For each match record file:line,
the rule id, severity (the skill gates ERROR severity as blocking in CI), the CWE/OWASP tag, and
the **tainted source** — the source matters because `scan_variant` taint-tracks the same sources
and `triage` dedups any finding the two lanes share. (Injection patterns such as the skill's
canonical `sql-injection-string-format` / `CWE-89` rule, where user input is concatenated into a
query, are the high-value targets on a request handler.)

## Output: `sast.json`

```json
{
  "tool": "semgrep", "ruleset": ["p/security-audit", "p/owasp-top-ten", "org/custom"],
  "findings": [
    { "id": "...", "rule": "...", "severity": "ERROR",
      "file": "...:LINE", "cwe": ["CWE-..."], "owasp": "A03:2021",
      "tainted_source": "...", "message": "...", "source": "..." }
  ]
}
```

## Contributes to (fan-in)

`triage` — together with the other five lanes. Its `tainted_source` is the join key that lets
triage recognize the `scan_variant` hit as the *same* root cause, not a second bug.
