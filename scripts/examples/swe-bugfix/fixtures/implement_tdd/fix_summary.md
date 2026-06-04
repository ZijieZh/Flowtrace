# Fix Summary — PAY-4815: atomic idempotency reserve-or-get

> ⚠️ Illustrative — fictional codebase, bug, and fix; not about any real project.

> Phase 4 (Implementation) of systematic-debugging, executed **test-first** per
> **test-driven-development** under **subagent-driven-development** (fresh implementer subagent:
> implements → tests → commits → self-reviews). Iron Law honored: the failing test came first.

## TL;DR

Replaced a check-then-act TOCTOU race in `app/payments/idempotency.py` with a single atomic
**reserve-or-get** (`INSERT … ON CONFLICT (idempotency_key) DO NOTHING RETURNING`), added a
`UNIQUE` constraint and header validation, and proved it with a concurrency regression test that
fails before and passes after. Duplicate rate under load: **74% → 0%**.

## RED → GREEN → REFACTOR

**RED.** Wrote `tests/load/test_idempotency_race.py::test_concurrent_same_key_charges_once`
first: 50 concurrent `POST /charges`, one shared key, assert the fake PSP saw exactly 1 charge.
Ran it — **failed** for the right reason:

```
FAILED tests/load/test_idempotency_race.py::test_concurrent_same_key_charges_once
AssertionError: expected exactly 1 PSP charge for ik_test, got 7
```

**GREEN.** Minimal change to pass the test (nothing extra):

```diff
# app/payments/charge_handler.py
-    hit = await store.lookup(key)
-    if hit:
-        return hit.charge
-    charge = await psp.charge(amount, ...)        # <-- both racers reached here
-    await store.reserve(key, charge.id)
+    res = await store.reserve_or_get(key, request_hash)
+    if not res.owner:
+        return await store.await_charge(res)       # return the winner's original charge
+    charge = await psp.charge(amount, ...)         # only the winner charges
+    await store.mark_charged(res.record_id, charge.id)
+    return charge
```

```diff
# app/payments/idempotency.py  (new atomic primitive)
+RESERVE_OR_GET = """
+INSERT INTO idempotency_record (idempotency_key, status, request_hash)
+VALUES ($1, 'in_progress', $2)
+ON CONFLICT (idempotency_key) DO NOTHING
+RETURNING id
+"""
+async def reserve_or_get(self, key, request_hash):
+    row = await self.db.fetchrow(RESERVE_OR_GET, key, request_hash)
+    if row is not None:
+        return Reservation(owner=True, record_id=row["id"])
+    return Reservation(owner=False, record=await self.db.fetchrow(GET, key))
```

Re-ran the test — **passed**. Full suite stayed green (212/212).

**REFACTOR.** Extracted `reserve_or_get()` / `await_charge()` into `IdempotencyStore` with clear
names; added the migration `migrations/0042_idempotency_unique.sql`
(`UNIQUE (idempotency_key)`, Layer 3) and header validation (Layer 1). No behavior change; suite
stayed green.

## Defense-in-depth shipped

- **L1** entry: `Idempotency-Key` required + non-empty → 400 otherwise.
- **L2** logic: atomic `reserve_or_get` (the source fix).
- **L3** db: `UNIQUE (idempotency_key)` — a second row is now structurally impossible.
- **L4** obs: per-key boundary log retained.

## Files

- `app/payments/idempotency.py` — `reserve_or_get`, `await_charge`, `mark_charged`
- `app/payments/charge_handler.py` — owner-only charge path
- `app/payments/api.py` — L1 header validation
- `migrations/0042_idempotency_unique.sql` — L3 UNIQUE constraint
- `tests/load/test_idempotency_race.py` — the regression test (RED→GREEN)

## Verification (carried to `verify_completion` for a fresh re-check)

- New regression test: PASS (1 charge for 50 concurrent same-key requests).
- Full suite: 212/212.
- Red-green proof recorded in `tdd_evidence.json`.
