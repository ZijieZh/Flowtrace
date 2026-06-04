---
name: scan_mutation
description: Coverage-guided fuzzing of the new parser under ASan; record crashes + memory-safety CWE.
reads:
  - intake/scan_target.json
writes:
  - mutation.json
---

# Mutation / Fuzz

Source skill: **implementing-fuzz-testing-in-cicd-with-aflplusplus** (*Workflow* Step 1 harness + Step 4 CI integration — `AFL_USE_ASAN=1`, "Check for crashes → exit 1"; Step 6 — *Crash Triage*, deduplicate by stack trace).

One of the six parallel scan lanes. AFL++ coverage-guided fuzzing exercises the new parser on the
request path (untrusted input) under AddressSanitizer, seeded from valid inputs. Per the skill's
CI mode, any unique crash fails the job; crashes are deduped by stack trace before reporting.

## What this step does

Fuzz the new header/payload decoder. For each unique crash after stack-trace dedup, record the
crashing input class, the ASan stack signature, and the memory-safety CWE (e.g. an out-of-bounds
read is `CWE-125`). Memory-safety in a parser on the request path is typically a DoS/availability
concern, scored as such in triage.

## Output: `mutation.json`

```json
{
  "tool": "aflplusplus", "harness": "fuzz_stripe_sig_header", "asan": true,
  "execs": 0, "unique_crashes_after_dedup": 0,
  "findings": [
    { "id": "...", "crash_class": "...", "cwe": ["CWE-125"],
      "asan": "heap-buffer-overflow READ", "input": "...", "severity": "...", "source": "..." }
  ]
}
```

## Contributes to (fan-in)

`triage` — scored on its own merits (an availability-only impact, with no confidentiality or
integrity loss, lands lower than an injection or auth bypass under the multi-factor matrix): a
reminder that not every scanner finding is necessarily a blocker.
