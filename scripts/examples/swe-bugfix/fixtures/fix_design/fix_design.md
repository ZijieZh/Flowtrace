# Fix Design — PAY-4815: atomic idempotency reserve-or-get

> Source: **brainstorming** HARD-GATE (design before any code) + **systematic-debugging /
> defense-in-depth.md** (validate at every layer; make the bug structurally impossible).

**Root cause (from `root_cause.json`):** check-then-act TOCTOU race — `lookup()` then `reserve()`
are not atomic and there is no per-key mutual exclusion, so concurrent same-key requests both
MISS and both charge.

**Design principle:** collapse *check* and *claim* into one atomic operation at the **shared
store**, then surround it with defense-in-depth so a second charge becomes structurally
impossible — not merely unlikely. An in-process lock is explicitly rejected (per-process; does
not serialize across workers/pods).

## The fix (source change)

Replace the two-step `lookup()` → … → `reserve()` with a single atomic **reserve-or-get** on the
Postgres idempotency table:

```sql
-- atomic claim: winner inserts 'in_progress'; losers get nothing back and must read the winner's row
INSERT INTO idempotency_record (idempotency_key, status, request_hash)
VALUES (:key, 'in_progress', :request_hash)
ON CONFLICT (idempotency_key) DO NOTHING
RETURNING id;
```

```python
# app/payments/idempotency.py
async def reserve_or_get(self, key: str, request_hash: str) -> Reservation:
    row = await self.db.fetchrow(RESERVE_OR_GET_SQL, key, request_hash)
    if row is not None:
        return Reservation(owner=True, record_id=row["id"])   # we won the race -> we charge
    existing = await self.db.fetchrow(GET_SQL, key)            # someone else owns it
    return Reservation(owner=False, record=existing)           # -> wait/return their charge
```

Charge handler: only the **owner** calls `psp.charge()`. A non-owner waits for the owner's record
to reach a terminal state and returns the **original** charge (satisfies the "retried request
returns the original charge" constraint).

## Defense-in-depth (the four layers)

| Layer | Guard | Purpose |
|---|---|---|
| 1. Entry | Validate `Idempotency-Key` header present + non-empty; 400 otherwise | reject obviously bad input at the boundary |
| 2. Business logic | `reserve_or_get()` atomic claim (the source fix) | one winner per key — eliminates the race |
| 3. Database | `ALTER TABLE idempotency_record ADD CONSTRAINT uq_idem UNIQUE (idempotency_key)` | structural backstop: a 2nd row is impossible even via a future code path |
| 4. Observability | keep the per-key boundary log breadcrumb from `gather_evidence` | fast diagnosis if anything regresses |

## Test contract (TDD, written first — Phase 4)

`tests/load/test_idempotency_race.py::test_concurrent_same_key_charges_once`

- Fire **N = 50** concurrent `POST /charges` with one shared key inside a tight window.
- Assert the fake PSP received **exactly 1** charge.
- Assert every response body carries the **same** charge id (the original).
- MUST fail before the fix (currently 2+ charges); MUST pass after.

## Rollout / rollback

- Ship the `UNIQUE` migration first (idempotent; backfill-safe — no existing dup keys verified).
- Feature is pure server-side; no client change. Rollback = revert the handler + `reserve_or_get`;
  the `UNIQUE` constraint can stay (it is strictly safer).

## Explicitly out of scope (YAGNI)

No PSP-client changes, no retry framework, no Redis migration, no global lock. The atomic insert
already serializes per key at the shared store.
