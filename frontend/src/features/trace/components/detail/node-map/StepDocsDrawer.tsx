import { useStepFiles } from '@/features/trace/api/trace-core'
import { FilesDrawerShell, pickByName } from '../file-viewer/parts'

const selectDefault = pickByName(['step.md'])

interface StepDocsDrawerProps {
  onClose: () => void
  traceId: string
  stepId: string
  stepName: string
  does?: string
}

/**
 * Per-step files drawer: lists `steps/<stepId>/{STEP.md,scripts/*,resources/*}`.
 *
 * Mount-only-when-open: parent (`StepCard`) conditional-renders this component
 * so the file hook subscriptions don't run for every step card. The drawer
 * portals to `<body>` to escape react-flow's transform context.
 */
export function StepDocsDrawer({
  onClose,
  traceId,
  stepId,
  stepName,
  does,
}: StepDocsDrawerProps) {
  const { data: files, isLoading, isError } = useStepFiles(traceId, stepId)

  return (
    <FilesDrawerShell
      onClose={onClose}
      eyebrow="Spec"
      title={stepName}
      subtitle={does}
      files={files}
      isLoading={isLoading}
      isError={isError}
      errorMessage="Failed to load step files."
      defaultSelector={selectDefault}
      fileListHeader="Files in this step"
      emptyState={
        <div className="text-sm text-slate-400 italic">
          No files in this step folder yet. Add{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
            steps/{stepId}/STEP.md
          </code>{' '}
          to document how this step should be done.
        </div>
      }
    />
  )
}
