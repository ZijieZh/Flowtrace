# payments-service — debugging memory

> ⚠️ *Illustrative — fictional codebase and findings; not about any real project.*

Accumulated, codebase-specific learning. Read this BEFORE debugging concurrency or
idempotency issues in this service — it exists so the next run (human or agent) skips the
dead-ends this one already ruled out. General, portable techniques live in the skill
`idempotent-side-effects`; repo-specific facts live here.

---

## 2026-06-03 · PAY-4815 · idempotency layer has no per-key locking

**Gotcha (this repo):** `app/payments/idempotency.py` guards charges with a check-then-act —
`lookup()` (SELECT) then, separately, `reserve()` (INSERT) — with the PSP charge in between and
**no per-key mutual exclusion**. Under concurrency, two same-key requests both MISS and both
charge → duplicate customer debit.

**The tell (look for this first):** in the logs, **both** racing requests print
`cache MISS for <key> -> proceeding to charge` at `app/payments/idempotency.py:48`. Two MISSes
for one key = the race. Reproduces at concurrency ≥ 8 / window ≤ 20 ms; invisible when serial.

**Fix that worked:** atomic reserve-or-get —
`INSERT ... ON CONFLICT (idempotency_key) DO NOTHING RETURNING` + a `UNIQUE(idempotency_key)`
constraint (migration `0042`). Only the winner charges; losers return the original charge. See
PR `fix/PAY-4815-idempotency-race` and the new skill `idempotent-side-effects`.

**Dead-ends — do NOT spend time here next run:**
- ❌ **Global / process lock** "to be safe" — kills throughput AND is per-process, so it does
  **not** serialize across our gunicorn workers / pods. Looks safe, isn't. (This was the tempting
  wrong turn; the atomic per-key INSERT is the right tool.)
- ❌ PSP-side dedupe or client debounce — symptom patch; the local race and other side effects
  stay unguarded.
- ❌ Raising the cache TTL / moving the cache to Redis — does nothing about check-and-claim
  atomicity.

**Where the same shape probably still lurks in this repo (audit these):**
- **Lifecycle / startup hooks** — `app/worker/lifecycle.py` warms caches on boot with the same
  `get`-then-`set` shape; concurrent worker boots could double-init. Check it.
- Any other `*.lookup()` … `*.reserve()/save()` cache path: `app/payments/refund.py`,
  `app/webhooks/dispatch.py` (outbound webhooks can double-send on retry).
- Rule of thumb here: if a handler reads a key and later writes it with a side effect in the
  middle, assume it races until proven atomic.

**Watch for:** crashed-owner hangs. The first fix busy-waited the loser with no timeout; a winner
that dies after `INSERT 'in_progress'` would hang every retry. We added a bounded deadline +
stale-`in_progress` reclaim. Any future reserve-or-get here must keep that.
