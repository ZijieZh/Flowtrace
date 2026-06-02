import { NodeMapView } from '.'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'

interface NodeMapPanelProps {
  traceId: string
  runId?: string
  onInterrupt?: () => void
}

/** Right-pane wrapper for the trace DAG. */
export function NodeMapPanel({ traceId, runId, onInterrupt }: NodeMapPanelProps) {
  return (
    <div className="w-full border-r bg-gray-50 flex flex-col h-full relative overflow-hidden">
      <ErrorBoundary variant="silent">
        <NodeMapView
          key={runId}
          traceId={traceId}
          runId={runId}
          className="h-full"
          onInterrupt={onInterrupt}
        />
      </ErrorBoundary>
    </div>
  )
}
