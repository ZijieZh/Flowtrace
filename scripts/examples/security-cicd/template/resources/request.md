# Security Review Request — PR Gate

> ⚠️ **Illustrative — fictional service & findings; not a real vulnerability report about any
> real project.** `acme/payments-gateway` is an invented demo service; the PR, author, commits,
> and every finding below are fabricated to exercise a reusable AppSec/DevSecOps gate template.
> The standard identifiers (CWE / CVE / ATT&CK) appear only as method grounding and are **not**
> asserted as present in any real codebase, company, or maintained dependency.

**Question:** Should this pull request be allowed to merge?

- **Repository:** `acme/payments-gateway`
- **Stack:** Go 1.22 service (HTTP API behind an ALB; Postgres 15 for idempotency/ledger)
- **PR:** #482 — *"Add Stripe webhook receiver + bump JWT lib"*
- **Author:** `dev-mira`
- **Base → Head:** `main` (`a1b2c3d`) → `feature/stripe-webhooks` (`f9e8d7c`)
- **Commit range under review:** `a1b2c3d..f9e8d7c` (4 commits)

## What the PR changes

1. **New endpoint** `POST /v1/webhooks/stripe` in `internal/webhooks/stripe.go` — receives
   Stripe events, verifies the `Stripe-Signature` HMAC, and writes an idempotency record
   keyed on the event id before dispatching.
2. **New config** `internal/config/webhooks.go` — adds the webhook signing secret and the
   idempotency-store DSN.
3. **Dependency bump** in `go.mod` — `github.com/golang-jwt/jwt` `v3.2.0+incompatible`
   (was unused; now used to validate an internal service token on the webhook path).

## Manifest excerpt (`go.mod`)

```
require (
    github.com/golang-jwt/jwt v3.2.0+incompatible   // <-- bumped/added in this PR
    github.com/jackc/pgx/v5   v5.5.1
    github.com/stripe/stripe-go/v76 v76.6.0
)
```

## Gate policy (what "block" means here)

- A finding blocks the merge when it is **both** High+ severity after triage (CVSS v4.0,
  EPSS- and KEV-enriched) **and** confirmed exploitable by the red-team emulation on the
  *deduped* finding set.
- Detection coverage (Sigma/YARA shipped by the blue-team lane) is recorded as a
  **compensating control** — it informs the report but does not on its own unblock a PR.
- **Deliverable:** an allow/block decision with the blocking findings + fix guidance (the PR
  comment), the deployed detections, and the durable posture report.
