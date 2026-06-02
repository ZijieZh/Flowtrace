import ELK, { ElkNode } from 'elkjs/lib/elk.bundled.js'
import type { Node, Edge } from '@xyflow/react'
import { getIncomers, getOutgoers } from '@xyflow/react'
import type { NodeMapStep } from './types'
import { LAYOUT } from './types'

// Use LAYOUT constants for consistency
export const NODE_WIDTH = LAYOUT.NODE_WIDTH
export const NODE_HEIGHT_WITH_ASSETS = LAYOUT.CARD_TOTAL_HEIGHT      // Badge(24) + card(~92) + gap(20) + line(20) + output(76) ≈ 220
export const NODE_HEIGHT_NO_OUTPUT = 126                             // Badge(24) + card(~92) + bottom margin

export const DESCRIPTION_CHARS_PER_LINE = 28
export const BASE_DESCRIPTION_LINES = 1
export const DESCRIPTION_LINE_HEIGHT = LAYOUT.DESC_LINE_HEIGHT - 2

export function getDescriptionLineCount(description?: string): number {
  if (!description) return BASE_DESCRIPTION_LINES
  const normalized = description.trim()
  if (!normalized) return BASE_DESCRIPTION_LINES
  return Math.max(BASE_DESCRIPTION_LINES, Math.ceil(normalized.length / DESCRIPTION_CHARS_PER_LINE))
}

export function getStepNodeLayoutHeight(step: { assets?: string[] }): number {
  return (step.assets && step.assets.length > 0) ? NODE_HEIGHT_WITH_ASSETS : NODE_HEIGHT_NO_OUTPUT
}

// State-driven message line height: 6px top padding + 1px divider + line(s) of text
const MESSAGE_LINE_BASE = 7
const MESSAGE_CHARS_PER_LINE = 32

export function getStepNodeHeight(step: { assets?: string[]; description?: string; message?: string }): number {
  const baseHeight = getStepNodeLayoutHeight(step)
  const descriptionLines = getDescriptionLineCount(step.description)
  const extraLines = Math.max(0, descriptionLines - BASE_DESCRIPTION_LINES)
  let height = baseHeight + extraLines * DESCRIPTION_LINE_HEIGHT
  if (step.message) {
    const messageLines = Math.max(1, Math.ceil(step.message.length / MESSAGE_CHARS_PER_LINE))
    height += MESSAGE_LINE_BASE + messageLines * DESCRIPTION_LINE_HEIGHT
  }
  return height
}

export const LANE_GAP = 54
export const TIER_GAP = 8

/**
 * Compute transitive reduction of edges.
 * If A→B→C exists, remove direct A→C edge (it's redundant).
 * Returns array of {source, target} pairs.
 */
export function computeReducedEdges(steps: NodeMapStep[]): Array<{ source: string; target: string }> {
  const stepIds = new Set(steps.map(s => s.id))

  // Build adjacency list: parent → children (using ALL edges)
  const children = new Map<string, Set<string>>()
  for (const step of steps) {
    const parentIds = [...new Set(Object.values(step.fromSteps || {}) as string[])]
      .filter(id => stepIds.has(id))
    for (const parentId of parentIds) {
      if (!children.has(parentId)) children.set(parentId, new Set())
      children.get(parentId)!.add(step.id)
    }
  }

  // Check if there's an alternative path from 'from' to 'to' (not using direct edge)
  function hasAlternativePath(from: string, to: string): boolean {
    const visited = new Set<string>()
    const queue = [...(children.get(from) || [])].filter(c => c !== to)

    while (queue.length > 0) {
      const current = queue.shift()!
      if (current === to) return true
      if (visited.has(current)) continue
      visited.add(current)

      const currentChildren = children.get(current)
      if (currentChildren) {
        for (const child of currentChildren) {
          if (!visited.has(child)) queue.push(child)
        }
      }
    }
    return false
  }

  // Build reduced edges
  const reducedEdges: Array<{ source: string; target: string }> = []

  for (const step of steps) {
    const parentIds = [...new Set(Object.values(step.fromSteps || {}) as string[])]
      .filter(id => stepIds.has(id))

    for (const parentId of parentIds) {
      if (hasAlternativePath(parentId, step.id)) continue
      reducedEdges.push({ source: parentId, target: step.id })
    }
  }

  return reducedEdges
}

// ============================================================================
// Path Highlight Helpers
// ============================================================================

export function getAllIncomers(node: Node, nodes: Node[], edges: Edge[], visited = new Set<string>()): Node[] {
  if (visited.has(node.id)) return []
  visited.add(node.id)
  return getIncomers(node, nodes, edges).reduce<Node[]>(
    (acc, n) => [...acc, n, ...getAllIncomers(n, nodes, edges, visited)], []
  )
}

export function getAllOutgoers(node: Node, nodes: Node[], edges: Edge[], visited = new Set<string>()): Node[] {
  if (visited.has(node.id)) return []
  visited.add(node.id)
  return getOutgoers(node, nodes, edges).reduce<Node[]>(
    (acc, n) => [...acc, n, ...getAllOutgoers(n, nodes, edges, visited)], []
  )
}

// ============================================================================
// ELK Layout
// ============================================================================

// ELK instance (reused)
const elk = new ELK()

/**
 * ELK-based DAG Layout
 *
 * Uses ELK's layered algorithm with NETWORK_SIMPLEX node placement
 * for balanced, visually pleasing layouts with proper merge centering.
 *
 * IMPORTANT: Uses FILTERED edges (transitive reduction) for layout.
 */
export async function computeLayoutAsync(
  steps: NodeMapStep[],
  reducedEdges: Array<{ source: string; target: string }>
): Promise<{
  positions: { x: number; y: number }[];
  tiers: Record<string, number>;
}> {
  if (steps.length === 0) return { positions: [], tiers: {} }

  // Find entry nodes (no incoming edges) to force them to top layer
  const hasIncomingEdge = new Set(reducedEdges.map(e => e.target))
  const hasOutgoingEdge = new Set(reducedEdges.map(e => e.source))

  // Get entry node IDs (no incoming edges)
  const entryNodeIds = steps
    .filter(s => !hasIncomingEdge.has(s.id))
    .map(s => s.id)

  // Build ELK graph — step nodes only (Inputs positioned after)
  // Sort steps: connected entry nodes first, then other nodes, disconnected last
  const entryNodeSet = new Set(entryNodeIds)
  const sortedSteps = [...steps].sort((a, b) => {
    const aIsEntry = entryNodeSet.has(a.id)
    const bIsEntry = entryNodeSet.has(b.id)
    const aConnected = hasOutgoingEdge.has(a.id)
    const bConnected = hasOutgoingEdge.has(b.id)

    // Entry nodes with outgoing edges first
    if (aIsEntry && aConnected && !(bIsEntry && bConnected)) return -1
    if (bIsEntry && bConnected && !(aIsEntry && aConnected)) return 1
    // Then other connected nodes
    if (aConnected && !bConnected) return -1
    if (bConnected && !aConnected) return 1
    return 0
  })

  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': String(LANE_GAP),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(TIER_GAP),
      'elk.layered.layering.strategy': 'LONGEST_PATH_SOURCE',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
      'elk.edgeRouting': 'POLYLINE',
    },
    children: sortedSteps.map(step => ({
      id: step.id,
      width: NODE_WIDTH,
      height: getStepNodeLayoutHeight(step),
      // Force entry nodes to first layer using ELK's built-in constraint
      ...(entryNodeSet.has(step.id) && {
        layoutOptions: { 'elk.layering.layerConstraint': 'FIRST' }
      }),
    })),
    edges: reducedEdges.map(e => ({
      id: `${e.source}-${e.target}`,
      sources: [e.source],
      targets: [e.target],
    })),
  }

  // Run ELK layout
  const layoutedGraph = await elk.layout(elkGraph)

  const realChildren = layoutedGraph.children || []

  // Extract positions (centered horizontally)
  const nodeMap = new Map(realChildren.map(n => [n.id, n]))
  const allX = realChildren.map(n => n.x || 0)
  const allY = realChildren.map(n => n.y || 0)
  const minX = Math.min(...allX)
  const maxX = Math.max(...allX)
  const offsetX = -(minX + maxX + NODE_WIDTH) / 2  // Center horizontally

  // Build tier map (layer index from ELK)
  const tiers: Record<string, number> = {}
  const sortedY = [...new Set(allY)].sort((a, b) => a - b)
  const tierHeights = sortedY.map(() => 0)

  steps.forEach((step) => {
    const node = nodeMap.get(step.id)
    const tierIndex = Math.max(0, sortedY.indexOf(node?.y || 0))
    tiers[step.id] = tierIndex
    tierHeights[tierIndex] = Math.max(tierHeights[tierIndex], getStepNodeHeight(step))
  })

  const tierOffsets: number[] = []
  tierHeights.reduce((acc, height, index) => {
    tierOffsets[index] = acc
    return acc + height + TIER_GAP
  }, 0)

  const positions = steps.map((step) => {
    const node = nodeMap.get(step.id)
    const x = (node?.x || 0) + offsetX
    const tierIndex = tiers[step.id] ?? 0
    const y = tierOffsets[tierIndex] ?? 0
    return { x, y }
  })

  return { positions, tiers }
}

// Synchronous fallback for initial render (simple topological layout)
export function computeLayoutSync(steps: NodeMapStep[]): { positions: { x: number; y: number }[]; tiers: Record<string, number> } {
  if (steps.length === 0) return { positions: [], tiers: {} }

  const stepIds = new Set(steps.map(s => s.id))
  const getParents = (step: NodeMapStep) =>
    [...new Set(Object.values(step.fromSteps || {}) as string[])].filter(id => stepIds.has(id))

  // Simple tier assignment (longest path from roots)
  const tiers: Record<string, number> = {}
  const computeTier = (id: string, visited = new Set<string>()): number => {
    if (id in tiers) return tiers[id]
    if (visited.has(id)) return 0
    visited.add(id)

    const step = steps.find(s => s.id === id)
    if (!step) return 0

    const parents = getParents(step)
    if (parents.length === 0) {
      tiers[id] = 0
    } else {
      tiers[id] = Math.max(...parents.map(p => computeTier(p, visited))) + 1
    }
    return tiers[id]
  }

  steps.forEach(s => computeTier(s.id))

  // Group by tier and assign lanes
  const tierGroups = new Map<number, NodeMapStep[]>()
  steps.forEach(step => {
    const tier = tiers[step.id]
    if (!tierGroups.has(tier)) tierGroups.set(tier, [])
    tierGroups.get(tier)!.push(step)
  })

  const lanes: Record<string, number> = {}
  tierGroups.forEach((group) => {
    group.forEach((step, i) => {
      lanes[step.id] = i
    })
  })

  // Calculate positions (centered)
  const maxLane = Math.max(...Object.values(lanes), 0)
  const totalWidth = maxLane * (NODE_WIDTH + LANE_GAP)
  const offsetX = -totalWidth / 2

  const tierHeights = new Map<number, number>()
  steps.forEach(step => {
    const tier = tiers[step.id]
    const height = getStepNodeHeight(step)
    const current = tierHeights.get(tier) ?? 0
    if (height > current) tierHeights.set(tier, height)
  })

  const sortedTiers = [...new Set(Object.values(tiers))].sort((a, b) => a - b)
  const tierOffsets = new Map<number, number>()
  let yOffset = 0
  sortedTiers.forEach((tier) => {
    tierOffsets.set(tier, yOffset)
    yOffset += (tierHeights.get(tier) ?? NODE_HEIGHT_WITH_ASSETS) + TIER_GAP
  })

  const positions = steps.map(step => ({
    x: lanes[step.id] * (NODE_WIDTH + LANE_GAP) + offsetX,
    y: tierOffsets.get(tiers[step.id]) ?? 0,
  }))

  return { positions, tiers }
}

// ============================================================================
// Edge Building (uses shared transitive reduction)
// ============================================================================

export function buildEdges(reducedEdges: Array<{ source: string; target: string }>): Edge[] {
  return reducedEdges.map(e => ({
    id: `${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    type: 'elk',
    data: {},
    style: {
      stroke: '#94a3b8',
      strokeWidth: 1,
      opacity: 0.6,
    },
  }))
}

// ============================================================================
// Step Node Data Type
// ============================================================================

export interface StepNodeData extends Record<string, unknown> {
  step: NodeMapStep
  traceId: string
  runId?: string
  /** HEAD or `?at=` SHA — threaded into thumbnail URLs for immutable caching. */
  commit?: string
  hidePendingOutputStatus?: boolean
  onInterrupt?: () => void
  /** Bumps when step data changes so React Flow re-renders the node. */
  _version: number
}
