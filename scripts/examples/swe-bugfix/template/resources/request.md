> ⚠️ Illustrative — fictional codebase, bug, and fix; not about any real project.

# Bug Report — PAY-4815

**Title:** Intermittent duplicate charges under load (acme payments-service)

**Reported by:** on-call (page), corroborated by 3 customer tickets
**Severity (reporter's guess):** SEV-2, money-affecting
**Service:** `payments-service` (Python 3.11, FastAPI + asyncio, Postgres, Redis)

## Symptom

A small fraction of checkouts charge the customer **twice**. The second charge
posts within ~40 ms of the first and carries the **same** client-supplied
`Idempotency-Key`. Idempotency is supposed to make a retried `POST /charges`
a no-op that returns the original charge — but two charges land at the PSP.

Observed in production: **~0.3% of charges** during traffic spikes; **0 duplicates**
at low traffic. Always two requests with the **identical** idempotency key arriving
near-simultaneously (the mobile client retries on a 2s network timeout while the
first request is still in flight).

## Stack / log excerpt

```
payments-service  POST /charges  idem=ik_3af91c  -> psp_charge ch_A  201
payments-service  POST /charges  idem=ik_3af91c  -> psp_charge ch_B  201   # DUPLICATE
```

Both requests log:

```
app/payments/idempotency.py:48  cache MISS for ik_3af91c -> proceeding to charge
```

…i.e. **both** concurrent requests see a cache MISS and both proceed to charge.

## Repro signal

- Single request, or two requests spaced >250 ms apart: never duplicates.
- Two requests with the same key fired within the same ~50 ms window: duplicates
  appear. Higher concurrency → higher duplicate rate.
- Smells like a race: check-then-act on the idempotency cache with no mutual
  exclusion per key.

## What we need

A **root-caused**, test-backed fix — not a symptom patch. Then write down what we
learned so the next person (and the next run of this loop) does not re-discover it.

- **Repo:** `git@github.com:acme/payments-service.git`
- **Suspect module:** `app/payments/idempotency.py`
- **Constraints:** no double-charging; retried requests must return the *original*
  charge; fix must hold under concurrency, not just in the happy path.
