import { useEffect, useRef } from 'react'

/**
 * Tags freshly-inserted `.react-flow__node` and `.react-flow__edge-path` DOM
 * with `data-entry-state="entering"` for 950ms so CSS entrance animations
 * (defined in node-map.css) can target only genuinely-new nodes/edges, and
 * normalises every edge path to `pathLength="100"` so stroke-dashoffset draw
 * animations behave uniformly regardless of the path's actual SVG length.
 *
 * Nodes already present at hook mount are pre-seeded into the "seen" set so
 * trace-load never spring-pops the initial graph — only steps added during
 * the session animate in. Edges are NOT pre-seeded: the initial trace load
 * DOES draw its edges, which gives the "structure forming" feel on first
 * open.
 *
 * 950ms matches the longest entrance choreography (350ms node-delay +
 * 520ms spring-pop + safety margin).
 */
export function useNodeEnterObserver(
  containerRef: React.RefObject<HTMLElement | null>,
) {
  const seenNodeIdsRef = useRef<Set<string>>(new Set())
  const seenEdgeIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    const seenNodeIds = seenNodeIdsRef.current
    const seenEdgeIds = seenEdgeIdsRef.current
    const pendingTimers = new Set<number>()

    const markEntering = (el: HTMLElement | SVGPathElement) => {
      el.setAttribute('data-entry-state', 'entering')
      const handle = window.setTimeout(() => {
        el.removeAttribute('data-entry-state')
        pendingTimers.delete(handle)
      }, 950)
      pendingTimers.add(handle)
    }

    const visit = (el: Element) => {
      if (
        el instanceof HTMLElement &&
        el.classList.contains('react-flow__node')
      ) {
        const id = el.getAttribute('data-id') || ''
        if (!id || seenNodeIds.has(id)) return
        seenNodeIds.add(id)
        markEntering(el)
        return
      }
      if (
        el instanceof SVGPathElement &&
        el.classList.contains('react-flow__edge-path')
      ) {
        // The edge's stable id lives on the parent <g class="react-flow__edge">.
        const edgeWrap = el.closest('.react-flow__edge')
        const id = edgeWrap?.getAttribute('data-id') || ''
        if (!el.hasAttribute('pathLength')) {
          el.setAttribute('pathLength', '100')
        }
        if (id && !seenEdgeIds.has(id)) {
          seenEdgeIds.add(id)
          markEntering(el)
        }
        return
      }
      for (const child of el.children) visit(child)
    }

    // Seed nodes that already exist at mount so the very first paint of an
    // opened trace doesn't spring-pop its entire graph.
    root.querySelectorAll<HTMLElement>('.react-flow__node').forEach((n) => {
      const id = n.getAttribute('data-id')
      if (id) seenNodeIds.add(id)
    })

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((added) => {
          if (added instanceof Element) visit(added)
        })
      }
    })
    observer.observe(root, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      pendingTimers.forEach((h) => clearTimeout(h))
      pendingTimers.clear()
      seenNodeIds.clear()
      seenEdgeIds.clear()
    }
  }, [containerRef])
}
