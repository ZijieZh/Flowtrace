---
name: scan_variant
description: Taint-track SAST's flagged sources to every reachable sink to find sibling injection variants.
reads:
  - intake/scan_target.json
writes:
  - variant.json
---

# Variant Analysis (taint)

Source skill: **exploiting-sql-injection-vulnerabilities** (Step 1 — *Injection Point Discovery*: map all input vectors incl. headers, second-order; *Output Format* — the per-finding ID/Severity (CVSS)/Parameter/Injection-Type block), composed with **implementing-semgrep-for-custom-sast-rules** (*Taint Analysis* — `mode: taint`, pattern-sources/sinks/sanitizers).

One of the six parallel scan lanes. Single-pattern SAST finds the *first* injection; variant
analysis runs Semgrep in **taint mode** to follow the same user-controlled source to *every*
reachable sink — catching the sibling the literal pattern missed (the SQLi skill's lesson:
"test all parameter types," and check second-order / non-obvious sinks).

## What this step does

Taint-track the user-controlled sources from the new handler to every reachable sink. Where the
same tainted value reaches an additional sink beyond the one single-pattern SAST flagged (e.g. a
header value flowing unparameterized into a second query — a `CWE-89` variant with the *same root
source*), record the source and the sink and set `shares_root_with` to the SAST finding id, so
triage recognizes it as one root cause shared with `scan_sast` rather than a new bug.

## Output: `variant.json`

```json
{
  "tool": "semgrep-taint",
  "findings": [
    { "id": "...", "cwe": ["CWE-89"], "injection_type": "...",
      "tainted_source": "...", "sink": "...:LINE",
      "shares_root_with": "<sast finding id>", "severity": "...", "source": "..." }
  ]
}
```

## Contributes to (fan-in)

`triage` — `shares_root_with` + `tainted_source` are the dedup keys; triage merges this with the
SAST SQLi into a single scored finding (so red-team validates one root cause, not two).
