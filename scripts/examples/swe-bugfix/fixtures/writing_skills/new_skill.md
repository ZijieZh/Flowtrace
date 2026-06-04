---
name: idempotent-side-effects
description: Use when a request can fire the same external side effect twice (duplicate charge, duplicate email, duplicate webhook, double-provision), especially under retries or concurrency, when two same-key requests both report a cache/lookup MISS, or when an idempotency / dedupe key is checked and then acted on in two separate steps.
---

> ⚠️ *Illustrative — distilled in a fictional demo run; not about any real project.*

# Idempotent Side Effects

## Overview

A side effect guarded by "look up the key, and if it's missing, do the thing, then record the
key" is a **check-then-act (TOCTOU) race**. Two concurrent requests with the same key both pass
the lookup before either records, so the effect fires twice.

**Core principle:** Check and claim must be ONE atomic operation at the shared store. Looking up
a key is not reserving it.

## When to Use

- A retried or concurrent request can duplicate an external effect (payment, email, webhook,
  resource creation).
- Logs show **two requests with the same key both MISS** the cache/store.
- The guard is "SELECT then (later) INSERT", or an in-memory `set`/dict of seen keys.
- Duplicates appear only **under load** and vanish when requests are serialized — a race tell.

**Not for:** effects that are naturally idempotent (PUT to a fixed key, set-a-flag), or
single-threaded batch jobs with no concurrency.

## Core Pattern

```sql
-- BAD: check-then-act. Two requests both see "missing", both proceed.
SELECT id FROM idem WHERE key = :k;          -- both return nothing
-- ...do the side effect...
INSERT INTO idem (key, ...) VALUES (:k, ...); -- both insert

-- GOOD: atomic reserve-or-get. Exactly one winner per key.
INSERT INTO idem (key, status) VALUES (:k, 'in_progress')
ON CONFLICT (key) DO NOTHING
RETURNING id;        -- non-null => you won the race => you do the effect
                     -- null     => someone else owns it => read & return their result
```

Only the **winner** performs the side effect. Losers wait for the winner's record to reach a
terminal state and return the **original** result (so a retry returns the original charge, not a
new one or an error).

## Quick Reference

| Concern | Do |
|---|---|
| Mutual exclusion | Atomic insert on a **UNIQUE** key at the shared store — not an in-process lock |
| Cross-process safety | Shared store (DB/Redis) does the serialization; in-process locks don't span workers/pods |
| Structural backstop | `UNIQUE (key)` constraint so a second row is impossible even via a new code path |
| Loser behavior | Wait on a **condition** (record status) with a **bounded deadline**, then return the original result |
| Crashed winner | Make a stale `in_progress` older than a lease **reclaimable** so retries don't hang forever |
| Throughput | Per-key serialization only — never a global lock |

## Common Mistakes

- **In-process lock** (`asyncio.Lock`, `threading.Lock`): serializes one process; multiple
  workers each hold their own, so the race survives across pods. Use the shared store.
- **Global lock** "to be safe": serializes *all* requests — throughput cliff — and is still
  per-process.
- **Fixing at the symptom** (PSP-side dedupe, client debounce): the local race and other
  unguarded effects remain.
- **No UNIQUE constraint**: the atomic INSERT relies on `ON CONFLICT (key)`; without the
  constraint there's no conflict to detect.
- **Busy-wait without timeout** for the loser: a crashed winner hangs the retry forever.

## Regression Test (write it first)

```python
# Fire N concurrent same-key requests; the external effect must happen exactly once,
# and every response must carry the SAME result id (the original).
async def test_concurrent_same_key_fires_once():
    ids = await asyncio.gather(*[do_request(key="ik_test") for _ in range(50)])
    assert fake_psp.charge_count("ik_test") == 1
    assert len(set(ids)) == 1            # all callers get the original result
```

It must **fail** before the fix (multiple effects) and **pass** after — the red-green proof.

## Real-World Impact

PAY-4815 (payments-service): ~0.3% of charges double-debited under traffic spikes. Root cause was
`lookup()`/`reserve()` split with no per-key critical section. After atomic reserve-or-get +
`UNIQUE(idempotency_key)`: duplicate rate under load 74% → 0%. Distilled here so the next
dedupe-shaped bug is recognized, not re-derived.
