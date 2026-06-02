// TanStack Query hooks for the Vite UI: HTTP/SSE against `trace serve` axum.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/lib/api-client'
import { resolveApiPath } from '@/shared/lib/api-url'
import type { Trace as TraceCore } from '../lib/trace-types'

export const traceKeys = {
  all: ['traces'] as const,
  list: (q?: string) => ['traces', 'list', q ?? null] as const,
  detail: (traceId: string) => ['traces', 'detail', traceId] as const,
  stepFiles: (traceId: string, stepId: string) =>
    ['traces', traceId, 'steps', stepId, 'files'] as const,
  traceFiles: (traceId: string) => ['traces', traceId, 'files'] as const,
  fileText: (path: string) => ['files', 'text-v2', path] as const,
  runs: (traceId: string) => ['traces', traceId, 'runs'] as const,
  run: (runId: string) => ['runs', runId] as const,
  runAt: (runId: string, at: string) => ['runs', runId, 'at', at] as const,
  replies: (runId: string) => ['runs', runId, 'replies'] as const,
  commits: (runId: string) => ['runs', runId, 'commits'] as const,
  config: ['config'] as const,
}

/** One entry in a run's commit history (newest first). */
export interface CommitInfo {
  sha: string
  at: string
  message: string
}

/** Every commit that touched `runs/<id>/`, newest first. */
export function useRunCommits(runId: string | undefined) {
  return useQuery<CommitInfo[]>({
    queryKey: traceKeys.commits(runId ?? ''),
    queryFn: () => apiClient.get(`/api/runs/${runId}/commits`),
    enabled: !!runId,
    // Commits are append-only; the list only grows. SSE `run_updated` events
    // invalidate this cache, so 60s is a safe upper bound for window/focus refetches.
    staleTime: 60_000,
  })
}

export interface StepFile {
  name: string
  path: string
  size: number
  mime: string
  kind: 'text' | 'binary'
}

/** Build a `/api/files/...` URL-safe path. The scope-relative `path` keeps its
 *  `/` separators but each segment is percent-encoded, so names with spaces,
 *  `#`, `?`, or `%` resolve to the right file instead of a truncated/malformed
 *  URL. Axum decodes the segments back before the `..` guard runs. */
export function encodeFilePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

export function useStepFiles(traceId: string | undefined, stepId: string | undefined) {
  return useQuery<StepFile[]>({
    queryKey: traceKeys.stepFiles(traceId ?? '', stepId ?? ''),
    queryFn: () =>
      apiClient.get<StepFile[]>(
        `/api/traces/${traceId}/steps/${stepId}/files`,
      ),
    enabled: !!traceId && !!stepId,
    staleTime: 60_000,
  })
}

/** Trace-root files: README.md, memory.md, scripts/*, resources/*, styles/*.
 *  Guards against an older `trace serve` that doesn't have this endpoint —
 *  in that case Axum's SPA fallback returns the index.html, and we surface
 *  that as a query error instead of letting the UI crash on `string.find`. */
export function useTraceFiles(traceId: string | undefined) {
  return useQuery<StepFile[]>({
    queryKey: traceKeys.traceFiles(traceId ?? ''),
    queryFn: async () => {
      const data = await apiClient.get<unknown>(`/api/traces/${traceId}/files`)
      if (!Array.isArray(data)) {
        throw new Error(
          'Trace files endpoint returned a non-array. Your `trace serve` ' +
          'binary may be older than this frontend — rebuild and restart it.',
        )
      }
      return data as StepFile[]
    },
    enabled: !!traceId,
    staleTime: 60_000,
    retry: false,
  })
}

export function useStepFileContent(path: string | undefined) {
  return useQuery<string>({
    queryKey: traceKeys.fileText(path ?? ''),
    queryFn: async () => {
      const res = await fetch(resolveApiPath(`/api/files/${encodeFilePath(path ?? '')}`), {
        credentials: 'same-origin',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.text()
    },
    enabled: !!path,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  })
}

export interface TraceSummary {
  trace_id: string
  id: string
  title: string
  description: string
  version: string
  step_count: number
  latest_run: string | null
  status: 'idle' | 'running' | 'done' | 'blocked' | 'aborted' | 'unknown'
}

export interface TraceDetail extends TraceCore {
  trace_id: string
  validation?: { ok: boolean; error: string | null } | null
  lint?: Array<{ kind: string; step_id: string | null; message: string }> | null
  formatted?: string | null
}

export function useTrace(traceId: string | undefined) {
  return useQuery<TraceDetail>({
    queryKey: traceKeys.detail(traceId ?? ''),
    queryFn: () => apiClient.get(`/api/traces/${traceId}?lint=1`),
    enabled: !!traceId,
    staleTime: 10_000,
  })
}

export interface RunSummary {
  run_id: string
  name: string
  started_at: string
  last_update: string
  current: string | null
  completed: string[]
  blocked: string[]
  paused: boolean
  aborted: boolean
}

export function useTraceRuns(traceId: string | undefined) {
  return useQuery<RunSummary[]>({
    queryKey: traceKeys.runs(traceId ?? ''),
    queryFn: () => apiClient.get(`/api/traces/${traceId}/runs`),
    enabled: !!traceId,
    staleTime: 5_000,
  })
}

// Generated from the Rust `RunDetail` struct via `trace explain run_detail`.
export type { RunDetail } from '@/generated/run_detail'
import type { RunDetail } from '@/generated/run_detail'

export function useRunState(runId: string | undefined) {
  return useQuery<RunDetail>({
    queryKey: traceKeys.run(runId ?? ''),
    queryFn: () => apiClient.get(`/api/runs/${runId}`),
    enabled: !!runId,
    staleTime: 5_000,
  })
}

/** Fetch the run state as of a specific commit SHA. */
export function useRunStateAt(runId: string | undefined, sha: string | undefined) {
  return useQuery<RunDetail>({
    queryKey: traceKeys.runAt(runId ?? '', sha ?? ''),
    queryFn: () => apiClient.get(`/api/runs/${runId}?at=${encodeURIComponent(sha!)}`),
    enabled: !!runId && !!sha,
    // (runId, sha) addresses an immutable git blob; never goes stale.
    staleTime: Infinity,
  })
}

/** One reply entry on a run's append-only stream. */
export interface RunReply {
  seq: number
  at: string
  step_id?: string
  /** SHA of the commit that introduced this reply (derived server-side). */
  commit?: string
  output: unknown
}

/** Fetch the run's full reply stream, ordered by seq ascending. */
export function useRunReplies(runId: string | undefined) {
  return useQuery<RunReply[]>({
    queryKey: traceKeys.replies(runId ?? ''),
    queryFn: () => apiClient.get(`/api/runs/${runId}/replies`),
    enabled: !!runId,
    staleTime: 5_000,
  })
}

type HttpMethod = 'POST' | 'PATCH'

interface RunMutationVars {
  stepId?: string
  body?: unknown
}

function makeRunMutation(
  buildPath: (runId: string, vars: RunMutationVars) => string,
  method: HttpMethod = 'POST',
) {
  return function useRunMutation(runId: string) {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: (vars: RunMutationVars) => {
        const path = buildPath(runId, vars)
        return method === 'PATCH'
          ? apiClient.patch(path, vars.body)
          : apiClient.post(path, vars.body)
      },
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: traceKeys.run(runId) })
      },
    })
  }
}

export type StatusKind = 'idle' | 'running' | 'blocked' | 'done' | 'error'

/** Rename a run. Body: `{ name }`. */
export const useRunRename = makeRunMutation(
  (runId) => `/api/runs/${runId}/name`,
  'PATCH',
)
