import { useTraceFiles } from '@/features/trace/api/trace-core'
import { FilesDrawerShell, pickByName } from './file-viewer/parts'

const selectDefault = pickByName(['readme.md', 'memory.md'])

interface TraceDocsDrawerProps {
  onClose: () => void
  traceId: string
  traceTitle: string
  description?: string
}

/**
 * Trace-root files drawer: lists `README.md`, `memory.md`, `scripts/*`,
 * `resources/*`, and `styles/*` at the trace root. The sibling of
 * `StepDocsDrawer`, opened from the trace detail header.
 */
export function TraceDocsDrawer({
  onClose,
  traceId,
  traceTitle,
  description,
}: TraceDocsDrawerProps) {
  const { data: files, isLoading, isError } = useTraceFiles(traceId)

  return (
    <FilesDrawerShell
      onClose={onClose}
      eyebrow="Resources"
      title={traceTitle}
      subtitle={description}
      files={files}
      isLoading={isLoading}
      isError={isError}
      errorMessage="Failed to load trace files."
      defaultSelector={selectDefault}
      fileListHeader="Trace-level resources"
      emptyState={
        <div className="text-sm text-slate-400 italic">
          No trace-level files yet. Add{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">resources/</code>{' '}
          for shared static material used by 2+ steps, or{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">scripts/</code>{' '}
          for shared code.
        </div>
      }
    />
  )
}
