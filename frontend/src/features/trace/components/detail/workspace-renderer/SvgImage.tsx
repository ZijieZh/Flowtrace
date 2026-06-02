
import React, { useState, useEffect } from 'react'
import { apiClient } from '@/shared/lib/api-client'

// Simple cache for SVG content
const svgContentCache = new Map<string, string>()

/**
 * SVG image component - fetches and renders SVG inline for better compatibility
 * Unlike WorkspaceImage which uses <img> tag, this renders the SVG directly
 * which preserves all styling, viewBox, and visual fidelity
 */
export function SvgImage({
  filename,
  traceId,
  runId,
  onImageClick,
  containerClassName,
  streaming,
  version,
}: {
  filename: string
  alt?: string
  traceId?: string
  runId?: string
  onImageClick?: (filename: string) => void
  containerClassName?: string
  /** When true, defers SVG fetching (file not in S3 yet during streaming) */
  streaming?: boolean
  /** Pin to specific file version (from evidence) */
  version?: number
}) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [svgContent, setSvgContent] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (streaming) {
      return // Defer fetch — file not in S3 yet during streaming
    }

    if (!traceId) {
      setState('error')
      return
    }

    // Strip @ prefix from filename for cache key (@ is file reference marker)
    // Handle @file.png patterns
    const normalizedFilename = (filename.startsWith('@') ? filename.slice(1) : filename).replace(/\/@/g, '/')
    const cacheKey = version != null
      ? `${traceId}/${runId || 'no-project'}/${normalizedFilename}@v${version}`
      : `${traceId}/${runId || 'no-project'}/${normalizedFilename}`

    // Check cache first
    const cached = svgContentCache.get(cacheKey)
    if (cached) {
      setSvgContent(cached)
      setState('loaded')
      return
    }

    const fetchSvg = async () => {
      try {
        // Strip leading /workspace/ if present
        let cleanFilename = filename.startsWith('/workspace/')
          ? filename.slice('/workspace/'.length)
          : filename.startsWith('workspace/')
          ? filename.slice('workspace/'.length)
          : filename
        // Strip @ prefix if present (file references use @ as marker)
        // Handle @file.png patterns
        if (cleanFilename.startsWith('@')) {
          cleanFilename = cleanFilename.slice(1)
        }
        cleanFilename = cleanFilename.replace(/\/@/g, '/')

        // Single endpoint: ?version=N for pinned evidence, search=true for current
        const params = new URLSearchParams()
        if (runId) params.set('run_id', runId)
        if (version != null) params.set('version', String(version))
        else params.set('search', 'true')
        const url = `/v1/agents/${traceId}/storage/files/${cleanFilename}?${params}`

        const { blob } = await apiClient.downloadBlob(url)

        if (blob.size === 0) {
          if (!cancelled) setState('error')
          return
        }

        // Get SVG as text
        const text = await blob.text()

        // Cache it
        let normalized = text
        try {
          const parser = new DOMParser()
          const doc = parser.parseFromString(text, 'image/svg+xml')
          const svg = doc.querySelector('svg')

          if (svg) {
            if (!svg.getAttribute('viewBox')) {
              const w = svg.getAttribute('width')
              const h = svg.getAttribute('height')
              if (w && h) {
                const vw = parseFloat(w)
                const vh = parseFloat(h)
                if (!Number.isNaN(vw) && !Number.isNaN(vh)) {
                  svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`)
                }
              }
            }
            // Remove hard sizing that causes overflow
            svg.removeAttribute('width')
            svg.removeAttribute('height')

            // Keep aspect ratio stable
            if (!svg.getAttribute('preserveAspectRatio')) {
              svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
            }

            // Force responsive sizing
            const prevStyle = svg.getAttribute('style') || ''
            svg.setAttribute(
              'style',
              `${prevStyle}${prevStyle ? '; ' : ''}width:100%; height:auto; max-width:100%; display:block;`
            )

            normalized = svg.outerHTML
          }
        } catch {
          // ignore parse failures; use raw text
        }

        // Cache it
        svgContentCache.set(cacheKey, normalized)

        if (!cancelled) {
          setSvgContent(normalized)
          setState('loaded')
        }
      } catch (error) {
        console.error('Failed to load SVG:', error)
        if (!cancelled) setState('error')
      }
    }

    fetchSvg()

    return () => { cancelled = true }
  }, [filename, traceId, runId, streaming, version])

  if (state === 'loading') {
    return (
      <span className="inline-flex my-4 p-4 border border-slate-200 rounded-lg bg-slate-50 animate-pulse">
        <span className="flex items-center gap-3">
          <span className="inline-block w-8 h-8 bg-slate-300 rounded" />
          <span className="inline-flex flex-col">
            <span className="inline-block h-4 bg-slate-300 rounded w-32 mb-2" />
            <span className="inline-block h-3 bg-slate-300 rounded w-48" />
          </span>
        </span>
      </span>
    )
  }

  if (state === 'error' || !svgContent) {
    return null
  }

  // Render SVG exactly as-is, no style modifications
  return (
    <span
      className={containerClassName || "inline-block cursor-pointer"}
      onClick={() => onImageClick?.(filename)}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  )
}
