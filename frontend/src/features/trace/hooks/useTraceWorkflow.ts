import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/shared/lib/api-client'
import { getWorkflowQueryKeyFull } from './queryKeys'

// ── Trace-as-workflow fetch ─────────────────────────────────────────────
// NodeMapView consumes `workflow.steps` (the static trace.json shape) for
// names/descriptions/from_steps. Status comes from `useRunState`, not here.

interface WorkflowResponse {
  workflow: {
    trace_id: string
    steps: Record<string, {
      id: string
      name: string
      does: string
      description: string
      /** Cosmetic labels — see PHILOSOPHY.md "files, not logical variables". */
      from_inputs: string[]
      from_steps: string[]
      assets: string[]
      asset_title?: string
      deprecated: boolean
    }>
    deliverable: { description: string; assets: string[] }
    environment: { python: string[]; r: string[] }
  }
}

export function useTraceWorkflow(traceId: string, runId?: string, options?: { verbose?: boolean }) {
  const verbose = options?.verbose ?? false
  return useQuery({
    queryKey: getWorkflowQueryKeyFull(traceId, runId, verbose),
    queryFn: async (): Promise<WorkflowResponse> => {
      type TraceShape = {
        id: string
        title: string
        description: string
        version: string
        steps: Record<string, { name: string; does: string; from_inputs?: string[]; from_steps: string[]; assets: string[]; asset_title?: string; deprecated?: boolean }>
        deliverable: { description: string; assets: string[] }
        environment: { python: string[]; r: string[] }
      }
      const trace = await apiClient.get<TraceShape>(`/api/traces/${traceId}`)
      const stepsRecord: WorkflowResponse['workflow']['steps'] = {}
      for (const [stepId, spec] of Object.entries(trace.steps)) {
        stepsRecord[stepId] = {
          id: stepId,
          name: spec.name,
          does: spec.does,
          description: spec.does,
          from_inputs: spec.from_inputs ?? [],
          from_steps: spec.from_steps,
          assets: spec.assets,
          asset_title: spec.asset_title,
          deprecated: !!spec.deprecated,
        }
      }
      return {
        workflow: {
          trace_id: trace.id,
          steps: stepsRecord,
          deliverable: trace.deliverable,
          environment: trace.environment,
        },
      }
    },
    enabled: !!traceId,
    staleTime: 5 * 1000,
    placeholderData: keepPreviousData,
  })
}
