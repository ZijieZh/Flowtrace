// SSE subscriber: listens to /api/events and triggers TanStack Query
// invalidations so queries refresh on backend changes.
//
// Invalidations are batched over a 500ms window so a burst of events
// (a noisy fs watcher on WSL2, a trace run flipping many step states)
// coalesces into a single re-fetch per query key.
//
// Mapping `EventKind → cache keys` is a declarative table (not a switch);
// adding an EventKind makes TypeScript flag every QUERIES entry that needs
// reconsideration. Dev-mode runtime check shouts when an event arrives
// that no query listens for.

const BATCH_WINDOW_MS = 500

import { useEffect } from 'react'
import { useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query'
import { logger } from '@/shared/lib/logger'
import { traceKeys, type RunReply } from '@/features/trace/api/trace-core'
import { getWorkflowQueryKey } from '@/features/trace/hooks/queryKeys'
import { apiClient } from '@/shared/lib/api-client'

// ──────────────────────────────────────────────────────────────────────────
// Event taxonomy (mirrors `SseEventBody` in crates/trace-cli/src/serve/events.rs)
// ──────────────────────────────────────────────────────────────────────────

type EventKind =
  | 'trace_created'
  | 'trace_updated'
  | 'trace_removed'
  | 'run_created'
  | 'run_updated'
  | 'run_removed'
  | 'reply_appended'
  | 'asset_changed'
  /** Heartbeat keepalive (every 15s). Intentionally no query listens for it. */
  | 'ping'

interface TraceEvent {
  kind: EventKind
  trace_id?: string
  run_id?: string
  seq?: number
  path?: string
}

// ──────────────────────────────────────────────────────────────────────────
// Declarative query → event subscription table.
//
// Each entry: which cache key to invalidate, on which events. `key(event)`
// returns null when the event lacks fields the query needs (e.g. a
// run-scoped query getting a trace-only event).
// ──────────────────────────────────────────────────────────────────────────

interface QuerySpec {
  key: (event: TraceEvent) => QueryKey | null
  invalidateOn: readonly EventKind[]
}

const QUERIES: readonly QuerySpec[] = [
  // Top-level trace collection — list + detail refresh follow from
  // `traceKeys.all` being a prefix of both.
  {
    key: () => traceKeys.all,
    invalidateOn: ['trace_created', 'trace_removed'],
  },
  // Trace detail (trace.json contents).
  {
    key: (e) => (e.trace_id ? traceKeys.detail(e.trace_id) : null),
    invalidateOn: ['trace_updated', 'asset_changed'],
  },
  // Trace list — invalidated separately so title/description changes
  // refresh the sidebar even when the full trace detail is cached.
  {
    key: () => traceKeys.list(),
    invalidateOn: ['trace_updated'],
  },
  // NodeMap's DAG data — separate query key from trace detail.
  {
    key: (e) => (e.trace_id ? getWorkflowQueryKey(e.trace_id) : null),
    invalidateOn: ['trace_updated'],
  },
  // Per-trace run list.
  {
    key: (e) => (e.trace_id ? traceKeys.runs(e.trace_id) : null),
    invalidateOn: ['run_created', 'run_updated', 'run_removed'],
  },
  // Single run's state.json.
  {
    key: (e) => (e.run_id ? traceKeys.run(e.run_id) : null),
    invalidateOn: ['run_updated'],
  },
  // Per-run git commit history (RunHistoryModal).
  {
    key: (e) => (e.run_id ? traceKeys.commits(e.run_id) : null),
    invalidateOn: ['run_updated'],
  },
  // Per-run reply list — incremental `reply_appended` handler below merges
  // without invalidating; this entry is the cache-cold fallback.
  {
    key: (e) => (e.run_id ? traceKeys.replies(e.run_id) : null),
    invalidateOn: ['run_updated'],
  },
]

// ──────────────────────────────────────────────────────────────────────────
// Batcher (500ms window) — preserved from the original implementation.
// ──────────────────────────────────────────────────────────────────────────

class InvalidationBatcher {
  private keys = new Map<string, QueryKey>()
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(private qc: QueryClient) {}

  enqueue(key: QueryKey) {
    const id = JSON.stringify(key)
    if (!this.keys.has(id)) this.keys.set(id, key)
    if (this.timer == null) {
      this.timer = setTimeout(() => this.flush(), BATCH_WINDOW_MS)
    }
  }

  cancel() {
    if (this.timer != null) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.keys.clear()
  }

  private flush() {
    this.timer = null
    for (const key of this.keys.values()) {
      void this.qc.invalidateQueries({ queryKey: key })
    }
    this.keys.clear()
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Incremental reply append — preserved special case.
//
// `reply_appended` is not a plain invalidation: we incrementally fetch
// replies past the cached max-seq and merge in place, avoiding a full
// refetch of the entire stream every time a step writes.
// ──────────────────────────────────────────────────────────────────────────

function handleReplyAppended(qc: QueryClient, batcher: InvalidationBatcher, event: TraceEvent): void {
  if (!event.run_id) return
  const runId = event.run_id
  const key = traceKeys.replies(runId)
  const cached = qc.getQueryData<RunReply[]>(key)
  if (!cached) {
    // First observer — cache empty, fall through to full invalidation.
    batcher.enqueue(key)
    return
  }
  const maxSeq = cached.length > 0 ? cached[cached.length - 1].seq : 0
  if (typeof event.seq === 'number' && event.seq <= maxSeq) return
  void apiClient
    .get<RunReply[]>(`/api/runs/${runId}/replies?since=${maxSeq}`)
    .then((newOnes) => {
      if (newOnes.length === 0) return
      qc.setQueryData<RunReply[]>(key, (prev) => {
        const base = prev ?? []
        const seen = new Set(base.map((r) => r.seq))
        const merged = [...base, ...newOnes.filter((r) => !seen.has(r.seq))]
        merged.sort((a, b) => a.seq - b.seq)
        return merged
      })
    })
    .catch((err) => {
      logger.error('reply incremental fetch failed', {
        file: 'sse-client.ts',
        runId,
        maxSeq,
        error: err,
      })
    })
}

// ──────────────────────────────────────────────────────────────────────────
// The hook itself — single source of SSE consumption for the app.
// ──────────────────────────────────────────────────────────────────────────

export function useTraceSseBridge() {
  const qc = useQueryClient()
  useEffect(() => {
    const batcher = new InvalidationBatcher(qc)
    const es = new EventSource('/api/events')
    es.onmessage = (msg) => {
      let body: TraceEvent
      try {
        body = JSON.parse(msg.data) as TraceEvent
      } catch (err) {
        logger.error('SSE event parse failed', { file: 'sse-client.ts', error: err, data: msg.data })
        return
      }

      const { kind } = body

      // Special case: reply_appended uses incremental fetch, not invalidation.
      if (kind === 'reply_appended') {
        handleReplyAppended(qc, batcher, body)
        return
      }

      let anyMatched = false
      for (const spec of QUERIES) {
        if (spec.invalidateOn.includes(kind)) {
          const key = spec.key(body)
          if (key) {
            batcher.enqueue(key)
            anyMatched = true
          }
        }
      }

      // Dev tripwire: an event with no listener almost always means a new
      // EventKind was added to the backend without a frontend wiring.
      if (import.meta.env.DEV && !anyMatched && kind !== 'ping') {
        console.warn(`[sse] event '${kind}' has no listening query — add to QUERIES in sse-client.ts`)
      }
    }
    es.onerror = () => {
      // EventSource auto-reconnects; nothing to do
    }
    return () => {
      es.close()
      batcher.cancel()
    }
  }, [qc])
}
