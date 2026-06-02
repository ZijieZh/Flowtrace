import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useTraceWorkflow } from '@/features/trace/hooks/useTraceWorkflow'
import type { TraceInfo } from '@/features/trace/api/traces-api'
import { traceKeys, useTraceRuns, type TraceDetail } from '@/features/trace/api/trace-core'
import {
  useFileClickListener,
  useRunHistoryListener,
  type FileClickEventData,
} from '@/features/trace/lib/file-preview-bus'
import { apiClient } from '@/shared/lib/api-client'
import { toast } from 'sonner'
import { NetworkError, HTTPError, calculateRetryDelay } from '@/shared/lib/errors'
import { logger } from '@/shared/lib/logger'

export function useTraceDetail(traceId: string) {
  const trace_id = traceId

  const router = useNavigate()
  const [searchParams] = useSearchParams()
  const pathname = useLocation().pathname
  const queryClient = useQueryClient()

  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')

  // URL is the source of truth for the current run.
  const currentRunId = searchParams.get('run')

  const {
    data: agent,
    error: agentError,
    isLoading: agentLoading,
    failureCount,
    refetch,
  } = useQuery({
    queryKey: traceKeys.detail(trace_id),
    queryFn: () => apiClient.get<TraceDetail>(`/api/traces/${trace_id}?lint=1`),
    select: (r): TraceInfo => ({
      trace_id: r.trace_id,
      name: r.title,
      description: r.description,
    }),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof HTTPError && error.statusCode && error.statusCode < 500) {
        return false
      }
      if (
        error instanceof NetworkError ||
        (error instanceof HTTPError && error.statusCode && error.statusCode >= 500)
      ) {
        return failureCount < 5
      }
      return false
    },
    retryDelay: attemptIndex => calculateRetryDelay(attemptIndex),
    placeholderData: keepPreviousData,
  })

  const { data: runsList, isLoading: runsLoading } = useTraceRuns(
    agent ? trace_id : undefined,
  )

  // Workflow (DAG + inputs) for the active run.
  const { data: workflowData, isLoading: isLoadingWorkflow } = useTraceWorkflow(
    trace_id,
    currentRunId ?? undefined,
  )

  // First-load: if URL has no `?run=`, pick the user's last-used run from
  // localStorage, else the newest run, and update the URL.
  useEffect(() => {
    if (!agent || runsLoading || !runsList || runsList.length === 0) return
    if (currentRunId) return

    let runId: string | null = null
    try {
      const saved = localStorage.getItem(`trace:${trace_id}:currentRun`)
      if (saved && runsList.some((r) => r.run_id === saved)) {
        runId = saved
      }
    } catch (error) {
      logger.warn('Failed to load run from localStorage', { traceId: trace_id, error })
    }
    runId = runId ?? runsList[0]?.run_id ?? null

    if (runId) {
      const params = new URLSearchParams(window.location.search)
      params.set('run', runId)
      router(`${pathname}?${params.toString()}`)
    }
  }, [agent, runsLoading, runsList, trace_id, currentRunId, router, pathname])

  const handleProjectChange = async (runId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('run', runId)
    router(`${pathname}?${params.toString()}`)
    try {
      localStorage.setItem(`trace:${trace_id}:currentRun`, runId)
    } catch (error) {
      logger.warn('Failed to save run selection to localStorage', { traceId: trace_id, error })
    }
  }

  const handleStartEditName = () => {
    if (!agent) return
    setEditedName(agent.name)
    setIsEditingName(true)
  }

  const handleCancelEditName = () => {
    setIsEditingName(false)
    setEditedName('')
  }

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName === agent?.name) {
      handleCancelEditName()
      return
    }
    try {
      await apiClient.patch(`/api/traces/${trace_id}`, { title: editedName.trim() })
      await queryClient.invalidateQueries({ queryKey: traceKeys.detail(trace_id) })
      toast.success('Trace name updated')
      setIsEditingName(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Failed to update name', { description: errorMessage })
    }
  }

  // File-preview + run-history overlays (URL-independent, ephemeral UI state).
  const [selectedFile, setSelectedFile] = useState<FileClickEventData | null>(null)
  const [historyStep, setHistoryStep] = useState<{ stepId: string; stepName: string } | null>(null)

  const closeFilePreview = useCallback(() => setSelectedFile(null), [])
  const closeRunHistory = useCallback(() => setHistoryStep(null), [])

  useFileClickListener(useCallback((data: FileClickEventData) => setSelectedFile(data), []))
  useRunHistoryListener(
    useCallback((data) => {
      if (!data.stepId) return
      setHistoryStep({ stepId: data.stepId, stepName: data.stepName ?? data.stepId })
    }, []),
  )

  return {
    agent,
    agentError,
    agentLoading,
    failureCount,
    refetch,
    runsList,
    runsLoading,
    currentRunId,
    workflowData,
    isLoadingWorkflow,

    isEditingName,
    editedName,
    setEditedName,

    handleProjectChange,
    handleStartEditName,
    handleCancelEditName,
    handleSaveName,

    selectedFile,
    closeFilePreview,
    historyStep,
    closeRunHistory,

    router,
  }
}
