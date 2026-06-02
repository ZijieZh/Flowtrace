
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  getConnectedEdges,
} from '@xyflow/react'
import {
  NODE_WIDTH,
  NODE_HEIGHT_WITH_ASSETS,
  NODE_HEIGHT_NO_OUTPUT,
  DESCRIPTION_CHARS_PER_LINE,
  BASE_DESCRIPTION_LINES,
  DESCRIPTION_LINE_HEIGHT,
  getDescriptionLineCount,
  getStepNodeLayoutHeight,
  getStepNodeHeight,
  LANE_GAP,
  TIER_GAP,
  computeReducedEdges,
  getAllIncomers,
  getAllOutgoers,
  computeLayoutAsync,
  computeLayoutSync,
  buildEdges,
  type StepNodeData,
} from './NodeMapHelpers'
import { CircleNotch } from '@phosphor-icons/react'
import { useTraceWorkflow } from '@/features/trace/hooks/useTraceWorkflow'
import { useRunState } from '@/features/trace/api/trace-core'
import { cn } from '@/shared/lib/utils'
import { useNodeEnterObserver } from './useNodeEnterObserver'

import type { NodeMapStep, NodeStatus } from './types'
import { LAYOUT } from './types'
import { useTranslation } from 'react-i18next'

import '@xyflow/react/dist/style.css'
import './node-map.css'

// ============================================================================
// Types
// ============================================================================

interface NodeMapViewProps {
  traceId: string
  runId?: string
  hidePendingOutputStatus?: boolean
  className?: string
  onInterrupt?: () => void
  workflowOverride?: any
  showControls?: boolean
}

import { nodeTypes, edgeTypes } from './NodeMapNodes'

/** Pick the node closest to `target` whose id is in `valid`. Returns null
 *  when no candidate qualifies. Squared-distance only (no sqrt). */
function findClosestNode(
  nodes: readonly Node[],
  target: { x: number; y: number },
  valid: ReadonlySet<string>,
): { id: string; position: { x: number; y: number } } | null {
  let bestDist = Infinity
  let bestId: string | null = null
  let bestPos: { x: number; y: number } | null = null
  for (const n of nodes) {
    if (!valid.has(n.id)) continue
    const dx = n.position.x - target.x
    const dy = n.position.y - target.y
    const d = dx * dx + dy * dy
    if (d < bestDist) {
      bestDist = d
      bestId = n.id
      bestPos = n.position
    }
  }
  return bestId && bestPos ? { id: bestId, position: bestPos } : null
}

export default function NodeMapView({
  traceId,
  runId,
  hidePendingOutputStatus = false,
  className,
  onInterrupt,
  workflowOverride,
  showControls = true,
}: NodeMapViewProps) {
  const { t } = useTranslation('trace')

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<StepNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // Refs for differential updates (prevents drag state corruption)
  const prevStepIdsRef = useRef<Set<string>>(new Set())
  const prevGraphDataSignatureRef = useRef<string>('')
  const prevLayoutSignatureRef = useRef<string>('')
  const lastElkPositionsRef = useRef<{ x: number; y: number }[]>([])
  const hasFittedRef = useRef(false)
  const fitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (fitTimerRef.current != null) clearTimeout(fitTimerRef.current)
  }, [])
  const reactFlowInstance = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dataVersionRef = useRef(0)

  useNodeEnterObserver(containerRef)

  // Refs for path highlight (hover handlers need current arrays without stale closures)
  const nodesForPathRef = useRef<Node[]>([])
  const edgesForPathRef = useRef<Edge[]>([])
  const isHoveringNodeRef = useRef(false)

  // Fetch workflow structure
  const { data: workflowData, isLoading: workflowLoading } = useTraceWorkflow(traceId, runId)
  const effectiveWorkflow = workflowOverride ?? workflowData?.workflow
  const effectiveWorkflowLoading = workflowOverride ? false : workflowLoading

  // state.json drives status + message; `committed` is git's truth for
  // which declared assets exist at this commit.
  const { data: runDetail } = useRunState(runId)
  const stateSteps = runDetail?.steps
  const stateDeliverableAssets = runDetail?.deliverable?.assets
  const committedByStep = runDetail?.committed
  // Content-signature so memo deps don't recompute when React Query hands
  // back a new object ref with identical content.
  const committedSignature = useMemo(
    () => JSON.stringify(committedByStep ?? {}),
    [committedByStep],
  )

  // Currently-running step (drives autozoom + active visual).
  const currentStepId = useMemo(() => {
    if (!stateSteps) return null
    for (const [stepId, step] of Object.entries(stateSteps)) {
      if (step.status?.kind === 'running') return stepId
    }
    return null
  }, [stateSteps])

  // Build the visible asset list for a step (or the deliverable). `declared`
  // is the trace-json plan; `generated` is the git-confirmed subset. Slots
  // for declared-but-not-generated paths render as muted "not generated"
  // placeholders (a 404 click is impossible).
  const mergeAssetSlots = (declared: readonly string[], generated: readonly string[]) => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const p of declared) if (!seen.has(p)) { out.push(p); seen.add(p) }
    for (const p of generated) if (!seen.has(p)) { out.push(p); seen.add(p) }
    return out
  }

  // Convert workflow data to steps array. state.json is the single source of
  // truth for status/message/assets; trace.json contributes static metadata
  // (name, description, from_steps, declared assets).
  const allSteps: NodeMapStep[] = useMemo(() => {
    const stepsObj = (effectiveWorkflow as any)?.steps as Record<string, any> | undefined
    if (!stepsObj) return []

    const steps: NodeMapStep[] = Object.entries(stepsObj).map(([stepId, stepData]) => {
      const stateStep = stateSteps?.[stepId]
      const statusValue = stateStep?.status
      const kind = statusValue?.kind
      const status: NodeStatus =
        kind === 'running' || kind === 'blocked' || kind === 'done' || kind === 'error'
          ? kind
          : 'idle'
      // `message` lives on every Status variant except `idle`; narrow by kind.
      const message = statusValue && statusValue.kind !== 'idle' ? statusValue.message ?? undefined : undefined
      const declared = (stepData.assets || []).map((a: string) => `${stepId}/${a}`)
      const generatedAssets = (committedByStep?.[stepId] ?? []).map((a) => `${stepId}/${a}`)
      const assets = mergeAssetSlots(declared, generatedAssets)

      return {
        id: stepId,
        name: stepData.name || stepId,
        description: stepData.does || '',
        status,
        message,
        isCurrent: stepId === currentStepId,
        assets,
        generatedAssets,
        assetTitle: stepData.asset_title || '',
        fromInputs: stepData.from_inputs || [],
        fromSteps: typeof stepData.from_steps === 'object' ? stepData.from_steps : {},
      }
    })

    const deliverable = (effectiveWorkflow as any)?.deliverable
    const generatedDeliverable: string[] = stateDeliverableAssets ?? []
    const deliverableAssets = mergeAssetSlots(deliverable?.assets ?? [], generatedDeliverable)
    if (deliverableAssets.length > 0) {
      const hasDependent = new Set<string>()
      for (const s of steps) {
        for (const id of Object.values(s.fromSteps ?? {})) {
          if (typeof id === 'string') hasDependent.add(id)
        }
      }
      const deliverableFromSteps: Record<string, string> = {}
      steps
        .filter(s => !hasDependent.has(s.id) && (s.assets?.length ?? 0) > 0)
        .forEach((leaf, i) => { deliverableFromSteps[`from_${i}`] = leaf.id })

      steps.push({
        id: '__deliverable__',
        name: '',
        description: deliverable?.description || t('nodeMap.finalOutputs'),
        status: 'idle',
        assets: deliverableAssets,
        generatedAssets: generatedDeliverable,
        fromSteps: deliverableFromSteps,
      })
    }

    return steps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveWorkflow, currentStepId, t, stateSteps, stateDeliverableAssets, committedSignature])

  // Canonical fitView config — shared by auto-fit (post-layout, onInit, resize)
  // AND the <Controls> manual fit button, so they always agree.
  const isSoloStep = allSteps.length <= 1
  const fitViewOptions = useMemo(() => ({
    padding: 0.1,
    maxZoom: isSoloStep ? 1 : 1.6,
    duration: 800,
  }), [isSoloStep])

  const buildNodeData = useCallback((step: NodeMapStep): StepNodeData => ({
    step,
    traceId,
    runId,
    commit: runDetail?.commit ?? undefined,
    hidePendingOutputStatus,
    onInterrupt,
    _version: dataVersionRef.current,
  }), [traceId, runId, runDetail?.commit, hidePendingOutputStatus, onInterrupt])

  // Signatures gate layout / data-merge effects below.
  const graphDataSignature = useMemo(() => JSON.stringify(
    allSteps.map((step) => ({
      id: step.id,
      status: step.status,
      message: step.message || '',
      isCurrent: step.isCurrent,
      description: step.description || '',
      assets: step.assets || [],
      fromInputs: step.fromInputs || [],
      fromSteps: step.fromSteps || {},
    })),
  ), [allSteps])

  const layoutSignature = useMemo(() => JSON.stringify({
    steps: allSteps.map((step) => ({
      id: step.id,
      description: step.description || '',
      message: step.message || '',
      assets: step.assets || [],
      fromSteps: step.fromSteps || {},
    })),
  }), [allSteps])

  // Layout nodes and edges with DIFFERENTIAL updates
  // Only full replacement when structure changes (steps added/removed)
  // Data-only changes merge into existing nodes (preserves drag state)
  useEffect(() => {
    // FIX: Prevent infinite loop when node map is already empty.
    // When allSteps=[] and map is already cleared, setNodes([]) would trigger
    // a re-render → re-run this effect → setNodes([]) again → infinite loop.
    // This guard skips the no-op: "already empty + still empty = nothing to do."
    // Real transitions (non-empty → empty) still run because prevStepIdsRef.size > 0.
    if (allSteps.length === 0 && prevStepIdsRef.current.size === 0) {
      return
    }

    const prevStructureSignature = Array.from(prevStepIdsRef.current).sort().join('|')
    const currentStructureSignature = allSteps.map((step) => step.id).sort().join('|')
    const structureChanged = currentStructureSignature !== prevStructureSignature
    const graphDataChanged = graphDataSignature !== prevGraphDataSignatureRef.current
    const layoutChanged = layoutSignature !== prevLayoutSignatureRef.current

    if (!structureChanged && !graphDataChanged && !layoutChanged) {
      return
    }

    prevGraphDataSignatureRef.current = graphDataSignature
    prevLayoutSignatureRef.current = layoutSignature

    // Increment version to force React Flow to detect data changes
    dataVersionRef.current += 1

    if (allSteps.length === 0) {
      setNodes([])
      setEdges([])
      prevStepIdsRef.current = new Set()
      return
    }

    // Compute reduced edges ONCE (transitive reduction)
    // Used for both layout and rendering
    const reducedEdges = computeReducedEdges(allSteps)

    const currentIds = new Set(allSteps.map(s => s.id))

    if (structureChanged || layoutChanged) {
      // ── Anchor compensation ─────────────────────────────────────────────
      // ELK is global: any re-layout can shift every existing node, so the
      // user's viewport stays put but the graph slides underneath — looks
      // like a jump. Fix: pick an anchor (the existing node closest to the
      // viewport center) and capture its old position. After ELK returns,
      // translate ALL new positions by (oldAnchor - newAnchor) so the anchor
      // lands at the same flow coordinate. The user's focal point doesn't
      // move; the rest of the graph rearranges around it. ELK's layout
      // quality is untouched — we only translate the whole result.
      const prevNodesForAnchor = nodesForPathRef.current
      const anchor = (() => {
        if (!prevNodesForAnchor.length || !reactFlowInstance.current || !containerRef.current) return null
        const rect = containerRef.current.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return null
        const target = reactFlowInstance.current.screenToFlowPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        })
        const valid = new Set(allSteps.map(s => s.id))
        return findClosestNode(prevNodesForAnchor, target, valid)
      })()
      const anchorId = anchor?.id ?? null
      const anchorOldPos = anchor?.position ?? null

      // Structure changed → full replacement (need new layout)
      setNodes(prev => {
        const prevMap = new Map(prev.map(n => [n.id, n]))
        const prevList = prev
        const maxY = prevList.reduce((m, n) => Math.max(m, n.position?.y ?? 0), 0)

        const stepNodes: Node<StepNodeData>[] = allSteps.map((step) => {
          const existing = prevMap.get(step.id)
          if (existing) {
            return { ...existing, data: buildNodeData(step) }
          }

          return {
            id: step.id,
            type: 'step' as const,
            position: { x: 0, y: maxY + NODE_HEIGHT_WITH_ASSETS + TIER_GAP },
            data: buildNodeData(step),
            style: { opacity: 0, transition: 'opacity 800ms ease-out' },
          }
        })

        return stepNodes
      })
      setEdges(buildEdges(reducedEdges))
      prevStepIdsRef.current = currentIds

      // Run async ELK layout
      computeLayoutAsync(allSteps, reducedEdges).then(({ positions: elkPositions }) => {
        lastElkPositionsRef.current = elkPositions

        const stepIndexById = new Map(allSteps.map((s, i) => [s.id, i]))

        // Compute translation from anchor's ELK delta.
        let translateX = 0
        let translateY = 0
        if (anchorId && anchorOldPos) {
          const anchorIdx = stepIndexById.get(anchorId)
          const anchorNewPos = anchorIdx !== undefined ? elkPositions[anchorIdx] : null
          if (anchorNewPos) {
            translateX = anchorOldPos.x - anchorNewPos.x
            translateY = anchorOldPos.y - anchorNewPos.y
          }
        }

        setNodes(prev => prev.map((node) => {
          const idx = stepIndexById.get(node.id)
          if (idx === undefined) return node
          const elkPos = elkPositions[idx]
          const nextPos = elkPos
            ? { x: elkPos.x + translateX, y: elkPos.y + translateY }
            : node.position
          // Skip the no-op object spread when the position is unchanged AND
          // the previous style already had opacity 1 — avoids triggering a
          // React Flow re-render for every node on layouts that didn't move
          // it. Style equality is approximated by checking the current
          // opacity since that's the only field we set here.
          const sameStyle = (node.style as { opacity?: number } | undefined)?.opacity === 1
          if (
            node.position.x === nextPos.x &&
            node.position.y === nextPos.y &&
            sameStyle
          ) {
            return node
          }
          return {
            ...node,
            position: nextPos,
            style: { opacity: 1, transition: 'opacity 800ms ease-out' },
          }
        }))

        setEdges(buildEdges(reducedEdges))

        // Fit view only on the FIRST layout pass. Later structural / layout
        // changes (new node, removed node, card resize) must not steal the
        // user's current pan/zoom.
        if (!hasFittedRef.current) {
          if (fitTimerRef.current != null) clearTimeout(fitTimerRef.current)
          fitTimerRef.current = setTimeout(() => {
            fitTimerRef.current = null
            reactFlowInstance.current?.fitView(fitViewOptions)
            hasFittedRef.current = true
          }, 50)
        }
      })
    } else {
      // Same structure → merge data only (preserves drag state)
      const stepById = new Map(allSteps.map(s => [s.id, s]))
      setNodes(prev => prev.map(node => {
        const step = stepById.get(node.id)
        if (!step) return node
        return { ...node, data: buildNodeData(step) }
      }))
      // Skip edge rebuild while hovering to preserve path highlight styles
      if (!isHoveringNodeRef.current) {
        setEdges(buildEdges(reducedEdges))
      }
    }
  }, [allSteps, buildNodeData, graphDataSignature, layoutSignature, setEdges, setNodes])

  // Keep path refs in sync for hover handlers
  useEffect(() => {
    nodesForPathRef.current = nodes
    edgesForPathRef.current = edges
  }, [nodes, edges])

  // ── Path highlight on hover ─────────────────────────────────────────────

  const DEFAULT_EDGE_STYLE = { stroke: '#94a3b8', strokeWidth: 1, opacity: 0.6 }

  const onNodeMouseEnter = useCallback((_: any, hoveredNode: Node) => {
    isHoveringNodeRef.current = true
    const currentNodes = nodesForPathRef.current
    const currentEdges = edgesForPathRef.current

    const ancestors = getAllIncomers(hoveredNode, currentNodes, currentEdges)
    const descendants = getAllOutgoers(hoveredNode, currentNodes, currentEdges)
    const pathNodes = [hoveredNode, ...ancestors, ...descendants]
    const pathIds = new Set(pathNodes.map(n => n.id))
    const connectedEdges = getConnectedEdges(pathNodes, currentEdges)
      .filter(e => pathIds.has(e.source) && pathIds.has(e.target))
    const edgeIds = new Set(connectedEdges.map(e => e.id))

    setNodes(prev => prev.map(n => ({
      ...n,
      style: {
        ...n.style,
        opacity: pathIds.has(n.id) ? 1 : 0.15,
        transition: 'opacity 150ms ease',
      },
      className: n.id === hoveredNode.id ? 'highlighted-node' : undefined,
    })))

    setEdges(prev => prev.map(e => ({
      ...e,
      style: edgeIds.has(e.id)
        ? { stroke: '#3b82f6', strokeWidth: 2, opacity: 1 }
        : { stroke: '#94a3b8', strokeWidth: 1, opacity: 0.08 },
    })))
  }, [setNodes, setEdges])

  const onNodeMouseLeave = useCallback(() => {
    isHoveringNodeRef.current = false
    setNodes(prev => prev.map(n => ({
      ...n,
      style: { ...n.style, opacity: 1, transition: 'opacity 150ms ease' },
      className: undefined,
    })))
    setEdges(prev => prev.map(e => ({
      ...e,
      style: DEFAULT_EDGE_STYLE,
    })))
  }, [setNodes, setEdges])

  // Re-fit when the panel becomes visible (container width transitions 0 → positive).
  useEffect(() => {
    const el = containerRef.current
    if (!el || allSteps.length === 0) return
    let prevWidth = el.clientWidth
    const ro = new ResizeObserver(() => {
      const newWidth = el.clientWidth
      if (prevWidth === 0 && newWidth > 0 && reactFlowInstance.current) {
        reactFlowInstance.current.fitView(fitViewOptions)
      }
      prevWidth = newWidth
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [allSteps.length, fitViewOptions])

  // Loading state
  if (effectiveWorkflowLoading) {
    return (
      <div className={cn('flex items-center justify-center h-full bg-muted/30', className)}>
        <CircleNotch className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Empty state — render a dashed "ghost DAG" wireframe so users immediately
  // see what the view will look like once steps appear. Same visual language
  // (rounded nodes, directed edges) as the real graph, just muted + dashed.
  // No illustration; the surface teaches itself.
  if (allSteps.length === 0) {
    return (
      <div className={cn('h-full w-full bg-slate-50/50 relative', className)}>
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <svg
            viewBox="0 0 360 220"
            className="mb-6 w-full max-w-[360px] h-auto"
            aria-hidden="true"
            role="presentation"
          >
            <defs>
              <marker
                id="ghost-arrow"
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L8,4 L0,8 z" fill="#CBD5E1" />
              </marker>
            </defs>
            {/* Diamond DAG mirrored around the vertical centerline (x=180).
                Nodes 70x40 → A at top, B/C at mid (mirror across x=180), D at
                bottom. Edges go from node bottom-center to next node top-center. */}
            {[
              ['M180,60 L80,90',  'A→B'],
              ['M180,60 L280,90', 'A→C'],
              ['M80,130 L180,160',  'B→D'],
              ['M280,130 L180,160', 'C→D'],
            ].map(([d], i) => (
              <path
                key={i}
                d={d}
                stroke="#CBD5E1"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                fill="none"
                markerEnd="url(#ghost-arrow)"
              />
            ))}
            {[
              { x: 145, y: 20 },   // A — top, centered (cx=180)
              { x: 45,  y: 90 },   // B — mid-left  (cx=80, mirrors C)
              { x: 245, y: 90 },   // C — mid-right (cx=280, mirrors B)
              { x: 145, y: 160 },  // D — bottom, centered (cx=180)
            ].map(({ x, y }, i) => (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width="70"
                  height="40"
                  rx="6"
                  stroke="#CBD5E1"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  fill="#FFFFFF"
                />
                <line
                  x1={x + 12}
                  y1={y + 20}
                  x2={x + 58}
                  y2={y + 20}
                  stroke="#E2E8F0"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>
            ))}
          </svg>
          <p className="text-base text-slate-500 font-medium">{t('nodeMap.emptyState')}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn('node-map-root h-full w-full bg-white relative', className)}>
      <style>{`
        .highlighted-node .react-flow__node-step > div:first-child,
        .highlighted-node .react-flow__node-inputs > div:first-child {
          box-shadow: 0 0 0 2px rgba(59,130,246,0.3);
        }
        .react-flow__node { transition: opacity 150ms ease; }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onInit={(instance) => {
          // Store instance — the first fit is handled by the post-layout
          // block once ELK positions are known. Fitting here would snap to
          // zero-position nodes since onInit fires before layout resolves.
          reactFlowInstance.current = instance
        }}
        onPaneClick={() => {
          // Dispatch custom event to collapse expanded StepCard overlays
          // Only fires on actual click (not drag) - ReactFlow handles this
          document.dispatchEvent(new CustomEvent('nodemap:pane-click'))
          // Reset any hover highlight
          onNodeMouseLeave()
        }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#cbd5e1" />
        {showControls && <Controls showInteractive={false} fitViewOptions={fitViewOptions} />}
      </ReactFlow>
    </div>
  )
}
