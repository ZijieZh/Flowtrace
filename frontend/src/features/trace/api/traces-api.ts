import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { apiClient as baseApiClient } from '@/shared/lib/api-client'
import { traceKeys, type TraceSummary } from './trace-core'

export interface TraceInfo {
  trace_id: string
  name: string
  description?: string
}

export interface TraceFilters {
  search?: string
}

export interface TracesResponse {
  agents: TraceInfo[]
}

export function useTraces(filters?: TraceFilters): UseQueryResult<TracesResponse, Error> {
  return useQuery({
    queryKey: traceKeys.list(filters?.search),
    queryFn: () => {
      const q = filters?.search ? `?q=${encodeURIComponent(filters.search)}` : ''
      return baseApiClient.get<TraceSummary[]>(`/api/traces${q}`)
    },
    select: (list) => ({
      agents: list.map((r) => ({
        trace_id: r.trace_id,
        name: r.title,
        description: r.description,
      })),
    }),
    retry: 1,
    staleTime: 10 * 1000,
  })
}

