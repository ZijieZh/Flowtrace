import { lazy, useMemo, useState } from 'react'
import { PageLoading } from '@/shared/components/PageLoading'
import {
  StructuredResponseRenderer,
  parseStructuredOutput,
} from '@/features/trace/components/detail/output-card'
import { useTrace, useTraceRuns, useRunReplies, useRunState } from '@/features/trace/api/trace-core'

import { WifiSlash, FileMagnifyingGlass, Lock, ShieldWarning, Warning, Books } from '@phosphor-icons/react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/shared/components/ui/resizable'
import { NetworkError, HTTPError, calculateRetryDelay } from '@/shared/lib/errors'
import { ErrorState } from '@/shared/components/ErrorState'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import { useTraceDetail } from './useTraceDetail'
import { useTranslation } from 'react-i18next'

import { TraceDetailHeader } from '@/features/trace/components/detail/TraceDetailHeader'
import { TraceDocsDrawer } from '@/features/trace/components/detail/TraceDocsDrawer'
import { FilePreview } from '@/features/trace/components/detail/file-preview/FilePreview'
import { RunHistoryModal } from '@/features/trace/components/detail/run-history/RunHistoryModal'
import { useTraceFiles } from '@/features/trace/api/trace-core'

const NodeMapPanel = lazy(() =>
  import('@/features/trace/components/detail/node-map/NodeMapPanel').then(
    mod => ({ default: mod.NodeMapPanel }),
  ),
)

function TraceReplyScroll({ traceId, runId }: { traceId: string; runId: string | null }) {
  const { data: trace } = useTrace(traceId)
  const { data: runs } = useTraceRuns(traceId)
  // Follow the URL-bound currentRunId; fall back to first run if URL hasn't
  // synced yet on first paint.
  const activeRun = runId ?? runs?.[0]?.run_id ?? null

  // Lookup table: stepId → display name (from trace.json)
  const stepNames = useMemo(() => {
    if (!trace?.steps) return {} as Record<string, string>
    const m: Record<string, string> = {}
    for (const [id, spec] of Object.entries(trace.steps)) {
      m[id] = (spec as { name: string }).name ?? id
    }
    return m
  }, [trace])

  const { data: replies = [] } = useRunReplies(activeRun ?? undefined)

  if (!activeRun) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-slate-500 px-6 text-center">
        No runs yet — start one with{' '}
        <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">trace run new</code>.
      </div>
    )
  }

  if (replies.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-slate-500 px-6 text-center">
        Run <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">{activeRun}</code> has
        no replies yet.
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-6 lg:px-8 pt-8 pb-8">
      <div className="mx-auto max-w-3xl flex flex-col gap-10">
        <div className="text-xs text-slate-400 font-mono">run {activeRun}</div>
        {replies.map((reply) => {
          const parsed = parseStructuredOutput(reply.output as Record<string, unknown>)
          if (!parsed) return null
          const label = reply.step_id ? (stepNames[reply.step_id] ?? reply.step_id) : 'reply'
          return (
            <div key={reply.seq} className="flex flex-col gap-1.5">
              <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
              <StructuredResponseRenderer
                response={parsed}
                traceId={traceId}
                runId={activeRun ?? undefined}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function TraceDetailView({ traceId: trace_id }: { traceId: string }) {
  const {
    agent, agentError, agentLoading, failureCount, refetch,
    runsList,
    currentRunId,
    workflowData,

    isEditingName,
    editedName, setEditedName,

    handleStartEditName,
    handleCancelEditName,
    handleSaveName,

    selectedFile,
    closeFilePreview,
    historyStep,
    closeRunHistory,

    router,
  } = useTraceDetail(trace_id)

  const { data: runDetail } = useRunState(currentRunId ?? undefined)
  const { t } = useTranslation('trace')
  const [isTraceDocsOpen, setIsTraceDocsOpen] = useState(false)
  const { data: traceFiles } = useTraceFiles(trace_id)
  const traceFileCount = traceFiles?.length ?? 0

  if ((!agent || runsList === undefined || !workflowData) && !agentError) {
      return (
        <PageLoading
          message={failureCount > 0 ? t('error.retrying', { count: failureCount }) : t('error.oneMoment')}
          className="h-full"
        />
      )
  }

  if (agentError) {
    if (agentError instanceof NetworkError) {
      const nextRetryDelay = calculateRetryDelay(failureCount)
      const retryInfo =
        failureCount > 0
          ? t('error.autoRetrying', { seconds: Math.ceil(nextRetryDelay / 1000), count: failureCount })
          : undefined

      return (
        <ErrorState
          icon={<WifiSlash className="w-6 h-6" />}
          title={t('error.connectionError')}
          description={agentError.userMessage}
          actions={[
            {
              label: failureCount > 0 ? t('error.retryNowWithCount', { count: failureCount }) : t('error.retry'),
              onClick: () => refetch(),
              loading: agentLoading,
            },
            {
              label: t('error.backToAgents'),
              onClick: () => router('/traces'),
              variant: 'outline',
            },
          ]}
          details={agentError.technicalDetails}
          retryInfo={retryInfo}
        />
      )
    }

    if (agentError instanceof HTTPError) {
      if (agentError.statusCode === 404) {
        return (
          <ErrorState
            icon={<FileMagnifyingGlass className="w-6 h-6" />}
            title={t('error.agentNotFound')}
            description={t('error.agentNotFoundDesc')}
            actions={[
              {
                label: t('error.backToAgents'),
                onClick: () => router('/traces'),
              },
            ]}
          />
        )
      }

      if (agentError.statusCode === 401) {
        return (
          <ErrorState
            icon={<Lock className="w-6 h-6" />}
            title={t('error.sessionExpired')}
            description={t('error.sessionExpiredDesc')}
            actions={[
              {
                label: t('error.logIn'),
                onClick: () => router('/login'),
              },
            ]}
          />
        )
      }

      if (agentError.statusCode === 403) {
        return (
          <ErrorState
            icon={<ShieldWarning className="w-6 h-6" />}
            title={t('error.accessDenied')}
            description={t('error.accessDeniedDesc')}
            actions={[
              {
                label: t('error.backToAgents'),
                onClick: () => router('/traces'),
              },
            ]}
          />
        )
      }

      if (agentError.statusCode && agentError.statusCode >= 500) {
        const nextRetryDelay = calculateRetryDelay(failureCount)
        const retryInfo =
          failureCount > 0
            ? t('error.autoRetrying', { seconds: Math.ceil(nextRetryDelay / 1000), count: failureCount })
            : undefined

        return (
          <ErrorState
            icon={<Warning className="w-6 h-6" />}
            title={t('error.serverError')}
            description={agentError.userMessage}
            actions={[
              {
                label: t('error.retryWithCount', { count: failureCount }),
                onClick: () => refetch(),
                loading: agentLoading,
              },
              {
                label: t('error.backToAgents'),
                onClick: () => router('/traces'),
                variant: 'outline',
              },
            ]}
            retryInfo={retryInfo}
            details={agentError.technicalDetails}
          />
        )
      }
    }

    return (
      <ErrorState
        icon={<Warning className="w-6 h-6" />}
        title={t('error.somethingWentWrong')}
        description={agentError instanceof Error ? agentError.message : t('error.unexpectedError')}
        actions={[
          { label: t('error.retry'), onClick: () => refetch() },
          { label: t('error.backToAgents'), onClick: () => router('/traces'), variant: 'outline' },
        ]}
      />
    )
  }

  if (!agent) {
    return (
      <ErrorState
        icon={<Warning className="w-6 h-6" />}
        title={t('error.agentNotFound')}
        description={t('error.unableToLoad')}
        actions={[{ label: t('error.backToAgents'), onClick: () => router('/traces') }]}
      />
    )
  }

  const chatPanelContent = (
    <div className="h-full flex flex-col">
      <TraceDetailHeader
        traceId={trace_id}
        agentName={agent.name}
        runId={currentRunId ?? undefined}
        runName={runDetail?.name}
        isEditingName={isEditingName}
        editedName={editedName}
        onBack={() => router('/traces')}
        onStartEdit={handleStartEditName}
        onCancelEdit={handleCancelEditName}
        onSaveName={handleSaveName}
        onNameChange={setEditedName}
        headerRight={
          traceFileCount > 0 ? (
            <button
              type="button"
              onClick={() => setIsTraceDocsOpen(true)}
              title="Trace-level resources & scripts"
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 h-8 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Books size={14} weight="regular" />
              <span>Resources</span>
              <span className="tabular-nums text-[11px] text-slate-400">{traceFileCount}</span>
            </button>
          ) : null
        }
      />

      <div className="flex-1 min-h-0">
        <ErrorBoundary variant="silent">
          <TraceReplyScroll traceId={trace_id} runId={currentRunId ?? null} />
        </ErrorBoundary>
      </div>
    </div>
  )

  const activityPanelContent = (
    <div className="h-full relative">
      <NodeMapPanel
        traceId={trace_id}
        runId={currentRunId ?? undefined}
      />
    </div>
  )

  return (
    <div className="h-full w-full flex bg-white overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        <ResizablePanel defaultSize={50} minSize={30}>
          {chatPanelContent}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={36} maxSize={70}>
          {activityPanelContent}
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Overlays — top-level, sit over the resizable group */}
      {selectedFile && currentRunId && (
        <FilePreview
          traceId={trace_id}
          runId={currentRunId}
          file={{
            path: selectedFile.path,
            name: selectedFile.name,
            type: selectedFile.type,
          }}
          commit={selectedFile.commit}
          onClose={closeFilePreview}
        />
      )}
      {historyStep && currentRunId && (
        <RunHistoryModal
          open={true}
          onClose={closeRunHistory}
          traceId={trace_id}
          runId={currentRunId}
          stepId={historyStep.stepId}
          stepName={historyStep.stepName}
        />
      )}
      {isTraceDocsOpen && (
        <TraceDocsDrawer
          traceId={trace_id}
          traceTitle={agent.name}
          description={agent.description}
          onClose={() => setIsTraceDocsOpen(false)}
        />
      )}
    </div>
  )
}

