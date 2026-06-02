import { useTranslation } from 'react-i18next'
import { useTraceRuns, type RunSummary } from '@/features/trace/api/trace-core'
import { formatRelativeTime } from '@/shared/lib/date-utils'
import { cn } from '@/shared/lib/utils'

type RunStatus = 'aborted' | 'paused' | 'blocked' | 'running' | 'done' | 'idle'

function statusOf(r: RunSummary): RunStatus {
  if (r.aborted) return 'aborted'
  if (r.paused) return 'paused'
  if (r.blocked.length > 0) return 'blocked'
  if (r.current) return 'running'
  if (r.completed.length > 0) return 'done'
  return 'idle'
}

const STATUS_DOT: Record<RunStatus, string> = {
  running: 'bg-emerald-600 animate-pulse',
  blocked: 'bg-amber-600',
  aborted: 'bg-rose-600',
  paused: 'bg-slate-400',
  done: 'bg-slate-400',
  idle: 'bg-slate-300',
}

function runLabel(r: RunSummary): string {
  const n = r.name?.trim()
  if (n) return n
  return r.started_at ? formatRelativeTime(r.started_at) : r.run_id
}

function metaSuffix(r: RunSummary, status: RunStatus): string {
  if (status === 'running') {
    const done = r.completed?.length ?? 0
    return `${done} done`
  }
  return r.started_at ? formatRelativeTime(r.started_at) : ''
}

export function AppSidebarRunList({
  traceId,
  currentRunId,
  onSelectRun,
}: {
  traceId: string
  currentRunId: string | null
  onSelectRun: (runId: string) => void
}) {
  const { t } = useTranslation('navigation')
  const { data: runs } = useTraceRuns(traceId)

  return (
    <div className="mt-7 flex flex-col">
      <div className="flex items-baseline justify-between px-3.5 pb-2.5">
        <span className="font-mono uppercase tracking-[0.14em] text-[11px] font-medium text-slate-400">
          {t('runs')}
        </span>
        <span className="font-mono text-[11px] text-slate-300">
          {runs?.length ?? 0}
        </span>
      </div>

      {!runs?.length ? (
        <div className="px-3.5 py-2 text-[12.5px] text-slate-400 leading-relaxed">
          no runs yet — try{' '}
          <code className="font-mono text-[11.5px] bg-slate-900/[0.04] text-slate-500 px-1.5 py-0.5 rounded">
            trace run new
          </code>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {runs.map((run) => {
            const status = statusOf(run)
            const isActive = run.run_id === currentRunId
            return (
              <button
                key={run.run_id}
                type="button"
                onClick={() => onSelectRun(run.run_id)}
                className={cn(
                  'group flex flex-col items-stretch text-left px-3.5 py-2.5 rounded-md cursor-pointer transition-colors',
                  isActive
                    ? 'bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03),0_1px_3px_rgba(15,23,42,0.03)]'
                    : 'hover:bg-slate-900/[0.04]',
                )}
              >
                <span
                  className={cn(
                    'text-sm leading-[1.3] tracking-[-0.005em] truncate',
                    isActive ? 'text-slate-900 font-semibold' : 'text-slate-600 font-medium',
                  )}
                >
                  {runLabel(run)}
                </span>
                <span className="mt-1.5 font-mono text-[11.5px] text-slate-400 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[status])} aria-hidden />
                    {status}
                  </span>
                  {metaSuffix(run, status) && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span>{metaSuffix(run, status)}</span>
                    </>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
