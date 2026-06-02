import { useMemo, useState, useEffect } from 'react'
import {
  X,
  CaretRight,
  CheckCircle,
  Hourglass,
  PauseCircle,
  WarningCircle,
  CircleDashed,
} from '@phosphor-icons/react'
import {
  useRunCommits,
  useRunStateAt,
  type StatusKind,
} from '@/features/trace/api/trace-core'
import { emitFileClick } from '@/features/trace/lib/file-preview-bus'
import { FileThumbnail } from '@/features/trace/components/detail/thumbnails'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'

interface Props {
  open: boolean
  onClose: () => void
  traceId: string
  runId: string
  stepId: string
  stepName: string
}

export function RunHistoryModal({ open, onClose, traceId, runId, stepId, stepName }: Props) {
  const { data: allCommits = [], isLoading } = useRunCommits(open ? runId : undefined)
  const stepCommits = useMemo(
    () => allCommits.filter((c) => c.message.startsWith(`${stepId}:`)),
    [allCommits, stepId],
  )

  const [userPick, setUserPick] = useState<string | null>(null)
  const activeSha = open ? (userPick ?? stepCommits[0]?.sha) : undefined

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const { data: stateAt } = useRunStateAt(open ? runId : undefined, activeSha)
  const stepStateAt = stateAt?.steps?.[stepId]

  // One pass instead of separate find + findIndex.
  const activeMeta = useMemo(() => {
    const idx = stepCommits.findIndex((c) => c.sha === activeSha)
    return idx === -1 ? null : { idx, commit: stepCommits[idx] }
  }, [stepCommits, activeSha])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 font-sans backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative flex h-[min(800px,90vh)] w-[min(1100px,95vw)] flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl ring-1 ring-foreground/[0.03]"
        role="dialog"
        aria-label={`Step history: ${stepName}`}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-6 py-4">
          <div className="flex min-w-0 items-baseline gap-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              History
            </span>
            <h2 className="truncate text-sm font-semibold text-foreground">{stepName}</h2>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              · {stepCommits.length}
            </span>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="w-[300px] shrink-0 overflow-y-auto border-r border-border bg-background/30">
            {isLoading && (
              <p className="px-5 py-6 text-xs text-muted-foreground">Loading…</p>
            )}
            {!isLoading && stepCommits.length === 0 && (
              <p className="px-5 py-6 text-xs text-muted-foreground">
                No history yet — this step has not been written to.
              </p>
            )}
            <ol>
              {stepCommits.map((c, idx) => (
                <RailRow
                  key={c.sha}
                  commit={c}
                  kind={commitKind(c.message, stepId)}
                  isActive={c.sha === activeSha}
                  isLatest={idx === 0}
                  stepId={stepId}
                  onSelect={() => setUserPick(c.sha)}
                />
              ))}
            </ol>
          </aside>

          <section className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-gradient-to-br from-muted/20 via-card to-card">
            {!activeSha ? (
              <div className="flex flex-1 items-center justify-center px-10 text-sm text-muted-foreground">
                Select a commit on the left.
              </div>
            ) : (
              <ActiveCommitDetail
                key={activeSha}
                sha={activeSha}
                isLatest={activeMeta?.idx === 0}
                activeAt={activeMeta?.commit.at}
                stepStateAt={stepStateAt}
                stepId={stepId}
                traceId={traceId}
                runId={runId}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── subcomponents ──────────────────────────── */

interface CommitRow { sha: string; at: string; message: string }

function RailRow({
  commit, kind, isActive, isLatest, stepId, onSelect,
}: {
  commit: CommitRow
  kind: StatusKind
  isActive: boolean
  isLatest: boolean
  stepId: string
  onSelect: () => void
}) {
  return (
    <li>
      <button
        onClick={onSelect}
        aria-current={isActive ? 'true' : undefined}
        className={cn(
          'group flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors duration-150',
          isActive ? 'bg-accent/50' : 'hover:bg-accent/30',
        )}
      >
        <StatusIcon kind={kind} active={isActive} size={14} className="mt-[3px] shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span
              className="line-clamp-2 text-[14px] font-medium leading-[1.35] text-foreground"
              title={commit.message}
            >
              {commitTitle(commit.message, stepId)}
            </span>
            {isLatest && <LatestPill />}
          </span>
          {/* sha lives in the right pane's kicker — redundant here */}
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="font-medium">{kindLabel(kind)}</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="font-mono tabular-nums">{formatAt(commit.at)}</span>
          </span>
        </span>
      </button>
    </li>
  )
}

type RawStepStateAt =
  | NonNullable<NonNullable<ReturnType<typeof useRunStateAt>['data']>['steps']>[string]
  | undefined

function ActiveCommitDetail({
  sha, isLatest, activeAt, stepStateAt, stepId, traceId, runId,
}: {
  sha: string
  isLatest: boolean
  activeAt?: string
  stepStateAt: RawStepStateAt
  stepId: string
  traceId: string
  runId: string
}) {
  if (!stepStateAt) {
    return (
      <article className="px-9 pt-8 pb-10">
        <Kicker sha={sha} isLatest={isLatest} delay={0} />
        <p className="mt-10 text-sm text-muted-foreground">
          State not available at this commit.
        </p>
      </article>
    )
  }

  const kind = (stepStateAt.status?.kind ?? 'idle') as StatusKind
  const message = stepStateAt.status && 'message' in stepStateAt.status
    ? stepStateAt.status.message
    : undefined
  const assets = stepStateAt.assets ?? []

  return (
    <article className="px-9 pt-8 pb-10">
      <Kicker sha={sha} isLatest={isLatest} delay={0} />

      <p
        className={cn(
          STAGGER_CLASS,
          message
            ? 'mt-3 max-w-[58ch] text-[32px] font-normal leading-[1.15] tracking-tight text-foreground'
            : 'mt-3 text-[20px] italic font-normal text-muted-foreground',
        )}
        style={staggerStyle(50)}
      >
        {message ?? 'No message recorded at this commit.'}
      </p>

      <div
        className={cn(STAGGER_CLASS, 'mt-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]')}
        style={staggerStyle(100)}
      >
        <span className="inline-flex items-center gap-1.5 text-foreground">
          <StatusIcon kind={kind} active size={13} />
          <span className="font-medium">{kindLabel(kind)}</span>
        </span>
        {activeAt && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span className="font-mono tabular-nums text-muted-foreground">{formatAt(activeAt)}</span>
          </>
        )}
      </div>

      <section className={cn(STAGGER_CLASS, 'mt-9')} style={staggerStyle(150)}>
        <header className="flex items-baseline justify-between border-b border-border pb-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
            Artifacts
          </h3>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {assets.length} {assets.length === 1 ? 'file' : 'files'}
          </span>
        </header>

        {assets.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Nothing produced at this commit.
          </p>
        ) : (
          <AssetList assets={assets} sha={sha} stepId={stepId} traceId={traceId} runId={runId} />
        )}
      </section>
    </article>
  )
}

function Kicker({ sha, isLatest, delay }: { sha: string; isLatest: boolean; delay: number }) {
  return (
    <div className={cn(STAGGER_CLASS, 'flex items-center gap-2')} style={staggerStyle(delay)}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        State at commit
      </span>
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {sha.slice(0, 10)}
      </span>
      {isLatest && <LatestPill className="ml-auto" />}
    </div>
  )
}

function LatestPill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-background',
        className,
      )}
    >
      Latest
    </span>
  )
}

function AssetList({
  assets, sha, stepId, traceId, runId,
}: {
  assets: string[]
  sha: string
  stepId: string
  traceId: string
  runId: string
}) {
  return (
    <ul className="mt-3 divide-y divide-border">
      {assets.map((asset) => {
        const fullPath = asset.includes('/') ? asset : `${stepId}/${asset}`
        const name = asset.split('/').pop() || asset
        const ext = (name.split('.').pop() || '').toLowerCase()
        const dir = fullPath.replace(/\/[^/]+$/, '')
        return (
          <li key={asset}>
            <button
              onClick={() => emitFileClick({ path: fullPath, name, commit: sha })}
              className="group -mx-2 flex w-[calc(100%+1rem)] items-center gap-4 rounded-md px-2 py-3 text-left transition-colors duration-150 hover:bg-accent/40"
              title={fullPath}
            >
              <FileThumbnail
                fileName={name}
                filePath={fullPath}
                traceId={traceId}
                runId={runId}
                size="lg"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-semibold leading-tight text-foreground">
                  {name}
                </span>
                <span className="mt-1 block truncate text-[11px] text-muted-foreground" title={dir}>
                  {dir}
                </span>
              </span>
              {ext && (
                <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] text-foreground">
                  {ext}
                </span>
              )}
              <CaretRight
                size={14}
                className="shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground"
              />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/* ─────────────────────  achromatic status indicator  ───────────────────── */

function StatusIcon({
  kind, active = false, size = 14, className,
}: {
  kind: StatusKind | string
  active?: boolean
  size?: number
  className?: string
}) {
  // `running` is a static Hourglass — this is a historical view, a spinner
  // would falsely imply the step is still running now.
  const cls = cn(active ? 'text-foreground' : 'text-muted-foreground', className)
  switch (kind) {
    case 'done':    return <CheckCircle   weight="regular" size={size} className={cls} />
    case 'running': return <Hourglass     weight="regular" size={size} className={cls} />
    case 'blocked': return <PauseCircle   weight="regular" size={size} className={cls} />
    case 'error':   return <WarningCircle weight="regular" size={size} className={cls} />
    default:        return <CircleDashed  weight="bold"    size={size} className={cls} />
  }
}

/* ─────────────────────────────  helpers  ──────────────────────────────── */

const STAGGER_CLASS = 'animate-in fade-in-0 slide-in-from-bottom-1 duration-300'
const staggerStyle = (ms: number): React.CSSProperties => ({
  animationDelay: `${ms}ms`,
  animationFillMode: 'backwards',
})

const DATE_FMT = new Intl.DateTimeFormat(undefined, {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
})

function formatAt(s: string): string {
  try { return DATE_FMT.format(new Date(s)) } catch { return s }
}

const KIND_VALUES = ['idle', 'running', 'blocked', 'done', 'error'] as const

/** Commit messages from this codebase have the shape `<step>: <kind> — <msg>`. */
function commitKind(message: string, stepId: string): StatusKind {
  const head = message.replace(`${stepId}: `, '').split(' —')[0]
  return (KIND_VALUES as readonly string[]).includes(head) ? (head as StatusKind) : 'idle'
}

function commitTitle(message: string, stepId: string): string {
  const prefix = `${stepId}: `
  const head = message.startsWith(prefix) ? message.slice(prefix.length) : message
  return head.replace(/^(idle|running|blocked|done|error)\s*(?:—\s*)?/, '') || head
}

function kindLabel(kind: StatusKind | string): string {
  switch (kind) {
    case 'running': return 'In progress'
    case 'blocked': return 'Blocked'
    case 'done':    return 'Done'
    case 'error':   return 'Error'
    case 'idle':    return 'Idle'
    default:        return kind
  }
}
