import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  Check,
  Copy,
  X,
  Quotes,
  Image as ImageIcon,
  ArrowUpRight,
  CaretDown,
  CaretRight,
} from '@phosphor-icons/react'
import { cn } from '@/shared/lib/utils'
import { EnhancedMarkdown } from '@/shared/components/EnhancedMarkdown'
import { emitFileClick } from '@/features/trace/lib/file-preview-bus'
import { TYPOGRAPHY } from '@/shared/styles'
import { WorkspaceImage } from '../workspace-renderer/WorkspaceImage'
import { WorkspaceVideo } from '../workspace-renderer/WorkspaceVideo'
import { SvgImage } from '../workspace-renderer/SvgImage'
import { renderMermaid } from './lazy-mermaid'

import type {
  Evidence,
  FigureEvidence,
  DocumentEvidence,
  TableEvidence,
  ComparisonEvidence,
  ComparisonItem,
  CheckEvidence,
  CitationEvidence,
  DiagramEvidence,
  AppendixEvidence,
  GroupedEvidence,
} from './types'
import { normalizeAssetPath } from '@/features/trace/lib/file-resolver'
import { FileThumbnail, opticalSize } from '@/features/trace/components/detail/thumbnails'
import { TableBlock } from './OutputCardTable'
import { isVideoFile, isDocumentFile, basename } from '@/features/trace/lib/file-utils'

const EVIDENCE_CHIP_CLASS =
  'flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-100 cursor-pointer transition-colors'
const EVIDENCE_CHIP_DISABLED_CLASS =
  'flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-200 opacity-60'

function EvidenceChip({
  leading,
  body,
  trailing,
  href,
  onClick,
  disabled,
}: {
  leading: React.ReactNode
  body: React.ReactNode
  trailing?: React.ReactNode
  href?: string
  onClick?: () => void
  disabled?: boolean
}) {
  const className = disabled ? EVIDENCE_CHIP_DISABLED_CLASS : EVIDENCE_CHIP_CLASS
  const content = (
    <>
      {leading}
      <div className="flex-1 min-w-0">{body}</div>
      {trailing}
    </>
  )
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    )
  }
  return (
    <div className={className} onClick={onClick}>
      {content}
    </div>
  )
}

function FigureBlock({
  path,
  version,
  caption,
  traceId,
  runId,
  onFileClick,
  callId,
  compact = false,
  columns = 2,
}: FigureEvidence & {
  traceId?: string
  runId?: string
  onFileClick?: (path: string, name?: string, version?: number) => void
  callId?: string
  compact?: boolean
  columns?: number
}) {
  const compactHeight = columns >= 3 ? 'h-[180px]' : 'h-[240px]'
  const compactMaxH = columns >= 3 ? 'max-h-[160px]' : 'max-h-[220px]'
  const imagePath = path ? normalizeAssetPath(path) : undefined
  const displayFile = basename(imagePath)
  const isSvg = imagePath?.toLowerCase().endsWith('.svg')

  // Video files (mp4 / mov / webm) — render inline player. Without this branch
  // the file falls through to <img> below and shows as a broken image icon.
  if (isVideoFile(displayFile) && imagePath) {
    return (
      <figure className={compact ? 'bg-white rounded-lg shadow-sm' : 'w-3/4 mx-auto bg-white rounded-lg shadow-sm'}>
        {caption && (
          <figcaption className="px-3 pt-2 pb-1">
            <p className={`${TYPOGRAPHY.secondarySize} text-slate-600 leading-snug`}>
              <EnhancedMarkdown inline>{caption}</EnhancedMarkdown>
            </p>
          </figcaption>
        )}
        <div className="px-3 pb-3 pt-1 flex justify-center overflow-hidden">
          <WorkspaceVideo
            filename={imagePath}
            traceId={traceId}
            runId={runId}
            version={version}
            onVideoClick={() => onFileClick?.(imagePath, undefined, version)}
          />
        </div>
      </figure>
    )
  }

  // Fallback: if this is a document file wrongly classified as figure, render as document
  if (isDocumentFile(displayFile)) {
    return (
      <div
        className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-100 cursor-pointer transition-colors"
        onClick={() => imagePath && onFileClick?.(imagePath, undefined, version)}
      >
        <FileThumbnail fileName={displayFile || ''} filePath={imagePath || ''} traceId={traceId || ''} runId={runId} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{displayFile}</p>
          {caption && (
            <p className="text-sm text-slate-600 mt-1">
              <EnhancedMarkdown inline>{caption}</EnhancedMarkdown>
            </p>
          )}
        </div>
      </div>
    )
  }

  const containerClass = compact
    ? 'bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer'
    : 'w-3/4 mx-auto bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer'

  if (!imagePath) {
    return (
      <figure className={containerClass}>
        {caption && (
          <figcaption className="px-3 pt-2 pb-1">
            <p className={`${TYPOGRAPHY.secondarySize} text-slate-600 leading-snug`}>
              <EnhancedMarkdown inline>{caption}</EnhancedMarkdown>
            </p>
          </figcaption>
        )}
        <div className="px-3 pb-3 pt-1">
          <div className="bg-slate-100 rounded-md flex items-center justify-center h-32">
            <div className="text-center">
              <ImageIcon size={28} weight="light" className="text-slate-300 mx-auto" />
              <p className="mt-1 text-xs text-slate-400 font-mono">{displayFile}</p>
            </div>
          </div>
        </div>
      </figure>
    )
  }

  return (
    <figure className={containerClass} onClick={() => onFileClick?.(imagePath, undefined, version)}>
      {caption && (
        <figcaption className="px-3 pt-2 pb-1">
          <p className={`${TYPOGRAPHY.secondarySize} text-slate-600 leading-snug`}>
            <EnhancedMarkdown inline>{caption}</EnhancedMarkdown>
          </p>
        </figcaption>
      )}
      <div className={cn("px-3 pb-3 pt-1 flex justify-center overflow-hidden", compact && `items-center ${compactHeight}`)}>
        {isSvg ? (
          <SvgImage
            filename={imagePath}
            traceId={traceId}
            runId={runId}
            version={version}
            onImageClick={() => onFileClick?.(imagePath, undefined, version)}
          />
        ) : (
          <WorkspaceImage
            filename={imagePath}
            alt={caption || displayFile}
            traceId={traceId}
            runId={runId}
            version={version}
            onImageClick={() => onFileClick?.(imagePath, undefined, version)}
            className="max-w-full max-h-full"
            imgClassName={cn("max-w-full w-auto h-auto object-contain rounded-md", compact ? compactMaxH : "max-h-[320px]")}
          />
        )}
      </div>
    </figure>
  )
}


function DocumentBlock({
  path,
  version,
  title,
  page,
  caption,
  onFileClick,
  callId,
  traceId,
  runId,
}: DocumentEvidence & { onFileClick?: (path: string, name?: string, version?: number) => void; callId?: string; traceId?: string; runId?: string }) {
  const docPath = path ? normalizeAssetPath(path) : undefined
  const displayFile = basename(docPath)
  const displayTitle = title || displayFile

  if (!docPath) {
    return (
      <EvidenceChip
        disabled
        leading={<FileThumbnail fileName={displayFile || ''} filePath="" traceId={traceId || ''} runId={runId} size="md" />}
        body={
          <>
            <p className="font-medium text-slate-500 truncate">{displayTitle}</p>
            <p className="text-xs text-slate-400">File not available</p>
          </>
        }
      />
    )
  }

  return (
    <EvidenceChip
      onClick={() => onFileClick?.(docPath, displayFile, version)}
      leading={<FileThumbnail fileName={displayFile || ''} filePath={docPath} traceId={traceId || ''} runId={runId} size="md" />}
      body={
        <>
          <p className="text-sm font-medium text-slate-900 truncate">{displayTitle}</p>
          {title && <p className="mt-0.5 text-[11px] text-slate-500 font-mono truncate">{docPath}</p>}
          {page && <p className="text-sm text-slate-500">Page {page}</p>}
          {caption && (
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">
              <EnhancedMarkdown inline>{caption}</EnhancedMarkdown>
            </p>
          )}
        </>
      }
    />
  )
}

function StatsCard({ label, stats }: { label: string; stats: { label: string; value: string }[] }) {
  return (
    <div className="bg-slate-50 rounded-lg overflow-hidden">
      <div className="px-4 py-2">
        <span className="text-sm font-medium text-slate-900">{label}</span>
      </div>
      <div className="px-4 pb-3 space-y-1">
        {stats.map((stat, i) => (
          <div key={i} className="flex justify-between">
            <span className="text-xs text-slate-500">{stat.label}</span>
            <span className="text-sm text-slate-900">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ComparisonBlock({ title, left, right, caption, traceId, runId, onFileClick, callId }: ComparisonEvidence & { traceId?: string; runId?: string; onFileClick?: (path: string, name?: string, version?: number) => void; callId?: string }) {
  const leftImagePath = left.path ? normalizeAssetPath(left.path) : undefined
  const rightImagePath = right.path ? normalizeAssetPath(right.path) : undefined

  const renderItem = (item: ComparisonItem, imagePath: string | undefined) => {
    if (item.path) {
      const displayName = basename(imagePath)
      return (
        <div
          className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => imagePath && onFileClick?.(imagePath, undefined, item.version)}
        >
          <div className="px-3 pt-2 pb-1">
            <p className="text-[13px] font-medium text-slate-700">{item.label}</p>
            {item.caption && (
              <p className="text-xs text-slate-500 mt-0.5">
                <EnhancedMarkdown inline>{item.caption}</EnhancedMarkdown>
              </p>
            )}
          </div>
          <div className="px-3 pb-3 flex justify-center items-center h-[240px]">
            {imagePath ? (
              <WorkspaceImage
                filename={imagePath}
                alt={item.label}
                traceId={traceId}
                runId={runId}
                version={item.version}
                onImageClick={() => onFileClick?.(imagePath, undefined, item.version)}
                className="max-w-full max-h-full"
                imgClassName="max-w-full max-h-[220px] w-auto h-auto object-contain rounded-md"
              />
            ) : (
              <div className="bg-slate-100 rounded-md flex items-center justify-center h-24 w-full">
                <div className="text-center">
                  <ImageIcon size={24} weight="light" className="text-slate-300 mx-auto" />
                  <p className="mt-1 text-xs text-slate-400">{displayName}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    } else {
      return <StatsCard label={item.label} stats={item.stats || []} />
    }
  }

  return (
    <div className="space-y-3">
      {(title || caption) && (
        <div className="px-1">
          {title && <p className="text-sm font-medium text-slate-900">{title}</p>}
          {caption && <p className={`${TYPOGRAPHY.secondarySize} text-slate-600 mt-1`}><EnhancedMarkdown inline>{caption}</EnhancedMarkdown></p>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 items-start">
        {renderItem(left, leftImagePath)}
        {renderItem(right, rightImagePath)}
      </div>
    </div>
  )
}

function CheckBlock({ label, actual, expected, passed }: CheckEvidence) {
  const isLong = (String(actual ?? '').length) + (String(expected ?? '').length) > 80
  const icon = passed ? <Check weight="bold" className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <X weight="bold" className="w-4 h-4 text-amber-600 flex-shrink-0" />
  const actualColor = passed ? 'text-slate-900' : 'text-amber-600'

  if (isLong) {
    return (
      <div className="py-3 space-y-1.5">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-slate-900">{label}</span>
        </div>
        <div className="pl-6 space-y-1 text-sm">
          <p className={actualColor}>{actual}</p>
          <p className="text-slate-400">{expected}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-slate-700">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm font-mono">
        <span className={actualColor}>{actual}</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-400">{expected}</span>
      </div>
    </div>
  )
}

function CitationBlock({ title, authors, year, journal, cited, url }: CitationEvidence) {
  const formatCited = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k cited` : `${n} cited`
  const meta = [authors, journal, year].filter(Boolean).join(' · ')

  return (
    <EvidenceChip
      href={url}
      leading={
        <div className="w-10 h-10 rounded overflow-hidden shrink-0 border border-slate-200 bg-white flex items-center justify-center">
          <Quotes weight="fill" size={opticalSize(Quotes, 20)} className="text-slate-700" />
        </div>
      }
      body={
        <>
          <p className="text-sm font-medium text-slate-900 truncate">{title}</p>
          {(meta || cited != null) && (
            <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-500">
              {meta && <span className="truncate">{meta}</span>}
              {cited != null && <><span>·</span><span className="shrink-0">{formatCited(cited)}</span></>}
            </div>
          )}
        </>
      }
      trailing={url && <ArrowUpRight size={14} className="text-slate-400 shrink-0" />}
    />
  )
}

function DiagramBlock({ mermaid: code, caption }: DiagramEvidence) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!code) return

    let cancelled = false

    async function renderDiagram() {
      try {
        const id = `diagram-${Math.random().toString(36).substr(2, 9)}`
        // Mermaid detectors are case-sensitive (e.g. /^\s*gitGraph/) — normalize common variants
        const normalized = code.replace(/^\s*gitgraph/i, 'gitGraph')
        const { svg: renderedSvg } = await renderMermaid(id, normalized)
        if (!cancelled) {
          setSvg(renderedSvg)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to render diagram')
        }
      }
    }

    renderDiagram()
    return () => { cancelled = true }
  }, [code])

  const handleClick = useCallback(() => {
    if (!svg) return

    // Generate a virtual filename from the caption
    const slugifiedCaption = (caption || 'diagram')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const virtualPath = `${slugifiedCaption}.svg`

    // Emit file click with inline SVG - opens in right panel
    emitFileClick({
      path: virtualPath,
      name: caption || 'Diagram',
      inlineContent: {
        content: svg,
        contentType: 'svg',
      },
    })
  }, [svg, caption])

  if (error) {
    const handleCopy = (e: React.MouseEvent) => {
      e.stopPropagation()
      navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
    return (
      <figure className="w-full bg-white rounded-lg shadow-sm">
        {caption && (
          <figcaption className="px-3 pt-2 pb-1">
            <p className={`${TYPOGRAPHY.secondarySize} text-slate-600 leading-snug`}><EnhancedMarkdown inline>{caption}</EnhancedMarkdown></p>
          </figcaption>
        )}
        <div className="mx-3 mb-3 mt-1 rounded-md border border-slate-200 bg-slate-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200">
            <span className="text-xs text-slate-400">Couldn't render diagram</span>
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-slate-200 transition-colors"
              title="Copy source"
            >
              {copied
                ? <Check className="w-3.5 h-3.5 text-emerald-600" />
                : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </button>
          </div>
          <pre className="px-3 py-2 text-xs font-mono text-slate-600 overflow-x-auto whitespace-pre max-h-[200px]">{code}</pre>
        </div>
      </figure>
    )
  }

  return (
    <figure
      className="w-full bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      {caption && (
        <figcaption className="px-3 pt-2 pb-1">
          <p className={`${TYPOGRAPHY.secondarySize} text-slate-600 leading-snug`}><EnhancedMarkdown inline>{caption}</EnhancedMarkdown></p>
        </figcaption>
      )}
      <div className="px-4 pb-4 pt-2 flex items-center justify-center">
        {svg ? (
          <div ref={containerRef} className="w-full overflow-x-auto [&_svg]:mx-auto [&_svg]:w-full [&_svg]:h-auto [&_svg]:min-h-[100px]" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <div className="text-sm text-slate-400 animate-pulse">Rendering diagram...</div>
        )}
      </div>
    </figure>
  )
}

function AppendixLink({ markdown, title }: AppendixEvidence) {
  const handleClick = useCallback(() => {
    // Generate a virtual filename from the title
    const slugifiedTitle = (title || 'appendix')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const virtualPath = `${slugifiedTitle}.md`

    // Emit file click with inline content - opens in right panel
    emitFileClick({
      path: virtualPath,
      name: title || 'Appendix',
      inlineContent: {
        content: markdown,
        contentType: 'markdown',
      },
    })
  }, [markdown, title])

  return (
    <button
      onClick={handleClick}
      className="cursor-pointer flex items-center gap-1 py-1 text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
    >
      <span>{title}</span>
      <CaretRight size={12} />
    </button>
  )
}

export function AppendixSection({ appendixes }: { appendixes: AppendixEvidence[] }) {
  if (appendixes.length === 0) return null
  return (
    <div className="p-4 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-2">
      {appendixes.map((appendix, i) => <AppendixLink key={i} {...appendix} />)}
    </div>
  )
}

export function groupEvidence(evidence: Evidence[]): GroupedEvidence[] {
  const result: GroupedEvidence[] = []
  let currentCheckGroup: CheckEvidence[] = []
  let currentFigureGroup: FigureEvidence[] = []

  const flushChecks = () => {
    if (currentCheckGroup.length > 0) {
      result.push({ type: 'check-group', checks: currentCheckGroup })
      currentCheckGroup = []
    }
  }

  const flushFigures = () => {
    if (currentFigureGroup.length > 1) {
      result.push({ type: 'figure-group', figures: currentFigureGroup })
      currentFigureGroup = []
    } else if (currentFigureGroup.length === 1) {
      result.push(currentFigureGroup[0])
      currentFigureGroup = []
    }
  }

  for (const ev of evidence) {
    if (ev.type === 'check') {
      flushFigures()
      currentCheckGroup.push(ev)
    } else if (ev.type === 'figure') {
      flushChecks()
      currentFigureGroup.push(ev)
    } else {
      flushChecks()
      flushFigures()
      result.push(ev)
    }
  }

  flushChecks()
  flushFigures()

  return result
}

// Evidence routing
export function EvidenceBlock({ evidence, traceId, runId, onFileClick, callId }: { evidence: Evidence; traceId?: string; runId?: string; onFileClick?: (path: string, name?: string, version?: number) => void; callId?: string }) {
  switch (evidence.type) {
    case 'figure': return <FigureBlock {...evidence} traceId={traceId} runId={runId} onFileClick={onFileClick} callId={callId} />
    case 'document': return <DocumentBlock {...evidence} onFileClick={onFileClick} callId={callId} traceId={traceId} runId={runId} />
    case 'table': return <TableBlock {...evidence} onFileClick={onFileClick} />
    case 'comparison': return <ComparisonBlock {...evidence} traceId={traceId} runId={runId} onFileClick={onFileClick} callId={callId} />
    case 'check': return <CheckBlock {...evidence} />
    case 'citation': return <CitationBlock {...evidence} />
    case 'diagram': return <DiagramBlock {...evidence} />
    case 'appendix': return null
    default: return null
  }
}

export function CheckGroup({ checks }: { checks: CheckEvidence[] }) {
  return (
    <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
      {checks.map((check, i) => <div key={i} className="px-4"><CheckBlock {...check} /></div>)}
    </div>
  )
}

export function FigureGroup({ figures, traceId, runId, onFileClick, callId }: { figures: FigureEvidence[]; traceId?: string; runId?: string; onFileClick?: (path: string, name?: string, version?: number) => void; callId?: string }) {
  const columns = figures.length === 3 ? 3 : 2
  const gridClass = figures.length === 2 ? 'grid grid-cols-2 gap-4 items-start' : figures.length === 3 ? 'grid grid-cols-3 gap-3 items-start' : 'grid grid-cols-2 gap-4 items-start'

  return (
    <div className={gridClass}>
      {figures.map((fig, i) => <FigureBlock key={i} {...fig} traceId={traceId} runId={runId} onFileClick={onFileClick} callId={callId} compact columns={columns} />)}
    </div>
  )
}
