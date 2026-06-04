---
name: pr_comment
description: Render the gate decision as the comment posted on the PR — verdict, blocking findings + fixes, detections.
reads:
  - severity_gate/gate_decision.json
writes:
  - pr_comment.md
---

# PR Comment

Source skill: **implementing-devsecops-security-scanning** (Step 7 — *Developer Feedback Loop*:
findings surfaced "as annotations or comments" on the PR; Step 5 gate verdict), with the fix-guidance
phrasing lifted from each finding's source skill (e.g. the parameterized-query remediation in
**exploiting-sql-injection-vulnerabilities** *Output Format*, the `ConstantTimeCompare` fix in
**performing-cryptographic-audit-of-application**, "rotate immediately" in **implementing-secret-scanning-with-gitleaks**).

Presentation node off `severity_gate`. It turns the machine decision into what the author actually
sees on the PR: a clear verdict, the blocking findings with copy-pasteable fixes, the non-blocking
tracked debt, and the detections that shipped.

## What this step does

Render `gate_decision.json` to markdown: a verdict banner reflecting the gate's allow/block
decision; a "must fix to merge" section (one entry per blocking finding, each with the concrete
remediation from its source skill); a "tracked, not blocking" section with SLAs; and a "detections
deployed" footer (the compensating controls).

## Output: `pr_comment.md`

A short, skimmable PR comment — verdict first, fixes next, everything else below the fold.

## Contributes to

Part of the deliverable; the human-readable face of the gate.
