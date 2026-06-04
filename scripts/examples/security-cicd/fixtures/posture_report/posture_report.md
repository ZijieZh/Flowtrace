> ⚠️ Illustrative — fictional service & findings; not a real vulnerability report about any real project.

# Security Posture Report — `acme/payments-gateway` PR #482

**Verdict:** 🔴 **BLOCKED** · **As of:** 2026-06-03 · **Range:** `a1b2c3d..f9e8d7c` (4 commits)
**Change under review:** new `POST /v1/webhooks/stripe` receiver + `github.com/golang-jwt/jwt` bump to `v3.2.0+incompatible`.

The gate blocked the merge on **2 of 6** deduped findings — the two that are **both** High+ after triage **and** confirmed exploitable by adversary emulation. This report is the durable record behind that decision: what was found, what an attacker can actually do with it, what now detects it, and what residual risk remains.

---

## 1. Decision summary

| | |
|---|---|
| Decision | **block** |
| Rule | High+ (CVSS v4.0, EPSS/KEV-enriched) **AND** red-team confirmed-exploitable |
| Blocking findings | **T-001** (SQLi, Critical), **T-002** (forgeable signature, High) |
| Tracked, non-blocking | T-003 (High, not reproduced), T-004 (Medium), T-005 (Low) |
| Detection coverage | 3 / 4 threat-model techniques (Sigma ×2, YARA ×1) |
| Required to unblock | Fix T-001 and T-002 |

The decision is taken from the **combined red + blue** result, not from any single scanner's severity. A naive "any High blocks" gate over the six tools would have blocked on T-003 — which emulation proved is *not* exploitable as written — and could have under-rated T-002, where **neither** the leaked secret **nor** the timing-unsafe compare is independently scored High by its own tool. The risk is in the composition.

---

## 2. Finding inventory (deduped + scored)

7 raw scanner findings → **6 deduped**. The SAST SQLi (`F-SAST-001`) and the taint variant (`F-VAR-001`) share one tainted source (`Stripe-Event-Id`) reaching two sinks → merged into **T-001** (so the expensive red-team lane validates one defect, not two).

| ID | Title | CWE / CVE | CVSS v4.0 | Sev | EPSS | KEV | Pri | SLA | From |
|----|-------|-----------|-----------|-----|------|-----|-----|-----|------|
| **T-001** | SQLi via `Stripe-Event-Id` (2 sinks) | CWE-89 | **9.3** | Critical | — | — | P1 | 2d | SAST + Variant |
| **T-002** | Forgeable signature (secret + timing) | CWE-798/208/347 | **8.7** | High | — | — | P1 | 2d | Secrets + Crypto |
| T-003 | golang-jwt alg-confusion | CWE-347 / CVE-2022-29217 | 7.5 | High | 0.18 | No | P2 | 7d | SCA |
| T-004 | OOB read in header parser | CWE-125 | 5.3 | Medium | — | — | P4 | 30d | Mutation/Fuzz |
| T-005 | `math/rand` replay nonce | CWE-330 | 3.7 | Low | — | — | P5 | 90d | SAST |

---

## 3. Red-team narrative + ATT&CK coverage

**Objective achieved:** an unauthenticated attacker can forge webhook authenticity and pivot to SQL injection, reaching the event ledger from the public internet.

**Attack chain**

1. **T1552.001** — Recover the signing secret committed in `c4d5e6f` (config file).
2. **T1212** — Compute a valid HMAC and present a forged `Stripe-Signature`; the non-constant-time compare would also leak it byte-by-byte. → webhook trusts attacker-authored events.
3. **T1190** — Inside the trusted event, a SQLi payload in `Stripe-Event-Id` reaches both sinks. → read/write to `idempotency` + `webhook_audit`.

| Technique | ID | Uses | Confirmed exploitable? |
|-----------|----|------|------------------------|
| Unsecured Credentials In Files | T1552.001 | T-002 | ✅ Yes |
| Exploitation for Credential Access | T1212 | T-002 | ✅ Yes |
| Exploit Public-Facing Application | T1190 | T-001 | ✅ Yes |
| Exploit Public-Facing Application (JWT) | T1190 | **T-003** | ❌ **No — not reproducible** |

> **Why T-003 didn't block.** SCA rated it High and reachable. But the call site already pins HS256 before `jwt.Parse`, so the algorithm-confusion PoC did not chain on this PR. The library is still latent/brittle (upgrade scheduled), but it is not a merge blocker. This is the entire reason red-team runs *after* triage: CVSS measures intrinsic severity; only emulation tells you it is exploitable *here*.

---

## 4. Blue-team detection coverage (purple-team output)

Detection-as-code synthesized from the same triaged findings — the defensive mirror of the chain above.

| Technique | Detection | Status |
|-----------|-----------|--------|
| T1190 | Sigma `b3d9e7a1` — SQL tokens in `Stripe-Event-Id` | ✅ covered (sigma check PASS) |
| T1212 | Sigma `a7f1c0e2` — sig-verify failure spike → accept | ✅ covered (sigma check PASS) |
| T1552.001 | YARA `acme_leaked_stripe_webhook_secret` — leaked-secret artifact | ✅ covered |
| T1499.004 | (parser-crash DoS, T-004) | ⚠️ **residual gap — no rule yet** |

Coverage is a **compensating control**: it shortens MTTD if these are exploited in the wild, but it does not waive the block. You do not ship a confirmed-exploitable Critical because you can also alert on it.

---

## 5. Posture & SLA

- **Blocking debt (must clear to merge):** T-001, T-002 — both P1, 48h SLA.
- **Tracked debt (ships, on the clock):** T-003 (7d), T-004 (30d), T-005 (90d).
- **MTTD posture:** 3 of 4 modeled techniques now have a deployed detection; pre-PR these paths were dark. Residual blind spot: the header-parser DoS (T1499.004).
- **Trend tie-back:** the leaked-secret + non-constant-time-compare pattern (T-002) is the second webhook-signature finding this quarter — recommend a reusable `verify_signature` helper (constant-time, secret-from-Vault) and an org Semgrep rule to make this class un-mergeable at SAST time, before it reaches this report again.

---

*Sources (faithful lift): mukul975/Anthropic-Cybersecurity-Skills (Apache-2.0; "Anthropic" is the maintainer's repo name, not an official Anthropic project). Report format from `executing-red-team-exercise`; coverage overlay from `analyzing-apt-group-with-mitre-navigator` + `building-detection-rules-with-sigma`.*
