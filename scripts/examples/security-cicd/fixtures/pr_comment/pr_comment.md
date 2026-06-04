> ⚠️ Illustrative — fictional service & findings; not a real vulnerability report about any real project.

# 🔴 Security gate: **BLOCKED** — 2 confirmed-exploitable findings

**`acme/payments-gateway` PR #482** — *Add Stripe webhook receiver + bump JWT lib* · base `a1b2c3d` → head `f9e8d7c`

This PR cannot merge. The gate blocks on findings that are **both** High+ severity (triaged, CVSS v4.0 / EPSS / KEV) **and** confirmed exploitable by adversary emulation on the deduped finding set. Two findings meet that bar. Detection rules have shipped as a compensating control, but they do **not** unblock a confirmed-exploitable High.

---

## ❌ Must fix to merge

### T-001 · SQL injection via `Stripe-Event-Id` — **Critical** (CVSS 9.3) · CWE-89
`internal/webhooks/stripe.go:147` (idempotency query) **and** `:201` (audit insert) — *one* tainted source (`Stripe-Event-Id` header), two sinks. SAST found the first; taint analysis found the second; triage merged them. Red-team reproduced injection through the forged-signature path (ATT&CK **T1190**).

```go
// vulnerable (:147)
db.Query("SELECT processed FROM idempotency WHERE event_id = '" + evtID + "'")
// fix — parameterize (pgx $N); the same fix at :201 closes both sinks
db.Query("SELECT processed FROM idempotency WHERE event_id = $1", evtID)
```

### T-002 · Forgeable webhook signature — **High** (CVSS 8.7) · CWE-798 + CWE-208/347
A signing secret is committed at `internal/config/webhooks.go:18` (**rotate it in Stripe now** — it is in git history), and the HMAC is compared with `==` at `internal/webhooks/stripe.go:96`, a timing oracle. Either lets an attacker present a valid `Stripe-Signature` for events they authored. Red-team forged a signature end-to-end (ATT&CK **T1552.001 → T1212**) — this is what makes T-001 remotely reachable.

```go
// vulnerable (:96)
if computedMAC == headerMAC { /* accept */ }
// fix — constant-time compare
if hmac.Equal(computedMAC, headerMAC) { /* accept */ }
```
Plus: rotate `whsec_…`, load from env/Vault, and purge it from history (`git filter-repo`).

---

## 🟡 Tracked, not blocking (ship with SLA)

| ID | Finding | Severity | Why not blocking | SLA |
|----|---------|----------|------------------|-----|
| T-003 | `golang-jwt` v3.2.0 alg-confusion (CVE-2022-29217) | High | Reachable, but red-team **could not chain it** — the call site already pins HS256. Upgrade anyway. | 7d |
| T-004 | OOB read in signature-header parser | Medium | Availability-only (panic→500); not an exploit chain. | 30d |
| T-005 | `math/rand` replay nonce | Low | Not directly exploitable. | 90d |

---

## 🛡️ Detections deployed (compensating control — does **not** unblock)

- **Sigma** `b3d9e7a1` — SQL tokens in `Stripe-Event-Id` (T1190)
- **Sigma** `a7f1c0e2` — signature-verify failure spike → accept (T1212)
- **YARA** `acme_leaked_stripe_webhook_secret` — flags the leaked secret in any build artifact (T1552.001)

> Re-run the gate after fixing **T-001** and **T-002**. Detection coverage on the parser-DoS (T1499.004) is still a residual gap — see the posture report.
