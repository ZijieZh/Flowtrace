---
name: intake
description: Parse the PR diff + dependency manifest into a scan target and fan out to the six scanners.
reads:
  - resources/request.md
writes:
  - scan_target.json
---

# Intake PR

Source skill: **implementing-devsecops-security-scanning** (Workflow — the `on: pull_request` trigger and the per-job fan-out: `secrets-scan`, `sast-scan`, `sca-scan`, `container-scan`).

This is the **root** of the trace and the shift-left trigger. The DevSecOps skill defines a
single CI pipeline where one PR event fans into independent scanning jobs; here that fan-out
is the trace's first six edges (`intake → scan_*`). Intake turns the raw PR into the target
every scanner consumes.

## What this step does

Parse `request.md` (the PR) into a structured scan target: the changed files, any new
endpoint and the function that handles it, any dependency bump, the languages present, and
the commit range to scan. Nothing is judged here — this only sets up what each lane will
look at.

## Output: `scan_target.json`

```json
{
  "repo": "...", "pr": 0, "commit_range": "...",
  "changed_files": [{ "path": "...", "language": "...", "kind": "added|modified" }],
  "new_endpoint": { "route": "...", "handler": "file:func" },
  "dependency_bump": { "ecosystem": "go", "package": "...", "from": "...", "to": "..." },
  "scanners": ["sast", "sca", "secrets", "variant", "crypto_timing", "mutation"]
}
```

## Contributes to (fan-out)

All six scan lanes read this: `scan_sast`, `scan_sca`, `scan_secrets`, `scan_variant`,
`scan_crypto_timing`, `scan_mutation`. They run in parallel — the knowledge that these are
independent reads of the same PR is the first thing the arrows encode.
