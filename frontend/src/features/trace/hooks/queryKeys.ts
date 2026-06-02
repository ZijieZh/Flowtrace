// Shared query keys for trace workflow. Import from both the fetch hook
// (useTraceWorkflow) and the SSE invalidator (sse-client) so a refresh
// hits the right cache entry.

export function getWorkflowQueryKey(traceId: string) {
  return ['traces', traceId, 'workflow'] as const
}

export function getWorkflowQueryKeyFull(
  traceId: string,
  runId?: string,
  verbose?: boolean,
) {
  return ['traces', traceId, 'workflow', runId, { verbose: verbose ?? false }] as const
}
