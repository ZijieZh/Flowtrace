import {
  BaseEdge,
  Handle,
  Position,
  type EdgeProps,
} from '@xyflow/react'

import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import { StepCard } from './index'
import { LAYOUT } from './types'
import type { StepNodeData } from './NodeMapHelpers'

function ElkEdge({ id, sourceX, sourceY, targetX, targetY, style }: EdgeProps) {
  const baseStyle = {
    strokeWidth: 1,
    strokeLinecap: 'round' as const,
    ...(typeof style === 'object' && style !== null ? style : {}),
  }

  // Same column: straight line
  if (Math.abs(targetX - sourceX) < 1) {
    return <BaseEdge id={id} path={`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`} style={baseStyle} />
  }

  // Simple S-curve - tight curvature to avoid wide swings
  const dy = targetY - sourceY
  const path = `M ${sourceX} ${sourceY} C ${sourceX} ${sourceY + dy * 0.3}, ${targetX} ${targetY - dy * 0.3}, ${targetX} ${targetY}`

  return <BaseEdge id={id} path={path} style={baseStyle} />
}

function StepNode({ data }: { data: StepNodeData }) {
  const topHandleOffset = LAYOUT.ACTION_BTN_SIZE + 4
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        className="!opacity-0 !w-0 !h-0 !border-0"
        style={{ top: topHandleOffset }}
      />
      <ErrorBoundary variant="silent">
        <StepCard
          step={data.step}
          traceId={data.traceId}
          runId={data.runId}
          commit={data.commit}
          hidePendingOutputStatus={data.hidePendingOutputStatus}
          onInterrupt={data.onInterrupt}
        />
      </ErrorBoundary>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!opacity-0 !w-0 !h-0 !border-0"
        style={{ bottom: 0 }}
      />
    </div>
  )
}

export const nodeTypes = {
  step: StepNode,
}

export const edgeTypes = {
  elk: ElkEdge,
}
