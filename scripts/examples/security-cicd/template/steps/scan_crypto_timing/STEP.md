---
name: scan_crypto_timing
description: Audit the handler's crypto; flag timing-unsafe HMAC/signature compares and weak algorithms.
reads:
  - intake/scan_target.json
writes:
  - crypto_timing.json
---

# Crypto / Timing Audit

Source skill: **performing-cryptographic-audit-of-application** (*Objectives* — detect weak algorithms, insecure modes, hardcoded keys, validate RNG; *Cryptographic Weakness Categories* table — Weak Hashing / Hardcoded Secrets / Poor Entropy) + **implementing-digital-signatures-with-ed25519** (*Security Properties* — "side-channel resistant: constant-time implementation"; *Testing* — "verification fails for tampered message" — the grounding for flagging a non-constant-time signature/MAC compare as a forgeable-signature risk).

One of the six parallel scan lanes. The crypto audit reviews the new handler's cryptographic use:
algorithms, cipher modes, key handling, RNG — and the verification logic itself. On a handler that
verifies a signature, the verify path is the highest-value target, because a non-constant-time
comparison of the computed HMAC leaks timing and can enable signature forgery.

## What this step does

Scan the new handler's crypto. Flag any signature/MAC compared to a computed digest with a
**non-constant-time** equality (`==` / `bytes.Equal`) — a timing side-channel (`CWE-208`) that,
paired with a leaked signing secret, can make signatures forgeable (`CWE-347`) — plus any
weak-hash / weak-RNG / hardcoded-key hits. Record CWE, location, and the remediation
(`hmac.Equal` / `subtle.ConstantTimeCompare`).

## Output: `crypto_timing.json`

```json
{
  "tool": "crypto-audit",
  "findings": [
    { "id": "...", "category": "timing-unsafe-compare", "file": "...:LINE",
      "cwe": ["CWE-208", "CWE-347"], "severity": "...",
      "remediation": "use crypto/subtle ConstantTimeCompare / hmac.Equal", "source": "..." }
  ]
}
```

## Contributes to (fan-in)

`triage` — a timing-unsafe compare can be one half of an auth-bypass chain (the other half being a
leaked secret from `scan_secrets`); triage scores the *combination*, which red-team then validates
end to end.
