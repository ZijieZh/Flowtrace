---
name: scan_secrets
description: Scan the PR commit range for hardcoded credentials; new-vs-baseline.
reads:
  - intake/scan_target.json
writes:
  - secrets.json
---

# Secret Scan (Gitleaks)

Source skill: **implementing-secret-scanning-with-gitleaks** (*Output Format* — NEW FINDINGS (blocking) with Rule / File:line / Commit / Entropy and `QUALITY GATE: FAILED`; Step 4 — custom rules incl. the `jwt-secret` rule; Step 5 — baseline so only *new* findings block).

One of the six parallel scan lanes. Gitleaks scans the PR's commit range for credentials, using
default + custom org rules, and separates **new** findings (which block) from baseline (pre-existing,
already tracked). Per the skill, a new finding means "rotate the exposed credential immediately."

## What this step does

Scan the PR's commit range for secrets with the default + custom org rules. For each hit record
the rule, file:line, commit, entropy, the secret class (e.g. a hardcoded signing secret is
`CWE-798`), and the `new` flag (only new findings block; baseline ones are already tracked). A new
finding means rotate the exposed credential immediately.

## Output: `secrets.json`

```json
{
  "tool": "gitleaks", "commit_range": "...", "commits_scanned": 0,
  "findings": [
    { "id": "...", "rule": "...", "file": "...:LINE", "commit": "...",
      "entropy": 0.0, "new": true, "cwe": ["CWE-798"],
      "secret_class": "...", "remediation": "rotate + git-filter-repo", "source": "..." }
  ]
}
```

## Contributes to (fan-in)

`triage` — a leaked secret rarely stands alone: paired with a related weakness (e.g. a
timing-unsafe signature compare from `scan_crypto_timing`) it can become an auth-bypass chain, so
triage scores the combination rather than the secret in isolation.
