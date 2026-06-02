
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  Check,
  Copy,
  X,
  File,
  FileCsv,
  Image as ImageIcon,
  ArrowRight,
  ArrowUpRight,
  CaretDown,
  CaretUp,
  CaretRight,
  Info,
} from '@phosphor-icons/react'
import { cn } from '@/shared/lib/utils'
import { EnhancedMarkdown } from '@/shared/components/EnhancedMarkdown'
import { emitFileClick } from '@/features/trace/lib/file-preview-bus'
import { TYPOGRAPHY } from '@/shared/styles'
import { WorkspaceImage } from '../workspace-renderer/WorkspaceImage'
import { WorkspaceVideo } from '../workspace-renderer/WorkspaceVideo'
import { SvgImage } from '../workspace-renderer/SvgImage'

import type {
  StructuredResponse,
  Finding,
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
  CitationRef,
  GroupedEvidence,
} from './types'
import { StatusBadge, FileGallery, extractFiles, TextWithCitations, type ResponseStatus } from './shared'
import { normalizeAssetPath } from '@/features/trace/lib/file-resolver'
import { FileThumbnail } from '@/features/trace/components/detail/thumbnails'
import {
  EvidenceBlock,
  CheckGroup,
  FigureGroup,
  AppendixSection,
  groupEvidence,
} from './OutputCardEvidence'

// ============================================
// SUPPORT BULLET
// ============================================

function SupportBullet({
  text,
  citations,
  onFileClick,
}: {
  text: string
  citations?: CitationRef[]
  onFileClick?: (path: string, name?: string, version?: number) => void
}) {
  return (
    <li className={`${TYPOGRAPHY.chatBodySize} text-slate-900 leading-relaxed flex items-start gap-2`}>
      <span className="text-slate-500 select-none">–</span>
      <TextWithCitations text={text} citations={citations} onFileClick={onFileClick} className="flex-1" />
    </li>
  )
}

// ============================================
// FINDING BULLET (new format)
// ============================================

function FindingBullet({
  finding,
  citations,
  onFileClick,
}: {
  finding: Finding
  citations?: CitationRef[]
  onFileClick?: (path: string, name?: string, version?: number) => void
}) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-slate-500 select-none mt-[2px]">–</span>
      <div className="flex-1 min-w-0">
        {/* Title with citations */}
        <div className={`${TYPOGRAPHY.chatBodySize} font-medium text-slate-900 leading-normal`}>
          <TextWithCitations text={finding.title} citations={citations} onFileClick={onFileClick} />
        </div>
        {/* Detail with citations */}
        {finding.detail && (
          <div className={`${TYPOGRAPHY.secondarySize} text-slate-500 leading-snug mt-0.5`}>
            <TextWithCitations text={finding.detail} citations={citations} onFileClick={onFileClick} />
          </div>
        )}
      </div>
    </li>
  )
}

// ============================================
// SUMMARY CARD
// ============================================

function SummaryCard({
  status,
  headline,
  findings,
  takeaway,
  support,
  note,
  citations,
  onFileClick,
}: {
  status: ResponseStatus
  headline: string
  findings?: Finding[]
  takeaway?: string
  support?: string[]
  note?: string
  citations?: CitationRef[]
  onFileClick?: (path: string, name?: string, version?: number) => void
}) {
  const isAwaiting = status === 'awaiting'
  const hasFindings = findings && findings.length > 0
  const hasSupport = support && support.length > 0

  return (
    <div>
      {/* Header: headline */}
      <div className="mb-2 last:mb-0">
        <h2 className="text-lg font-semibold text-slate-900">
          <TextWithCitations text={headline} citations={citations} onFileClick={onFileClick} />
        </h2>
      </div>

      {/* Takeaway: the point (new format) — italic interpretation voice, bar aligned to cap-height */}
      {takeaway && (
        <div className="mb-5 last:mb-0">
          <div className="pl-3 border-l-4 border-emerald-600 mt-[5px]">
            <p className={`${TYPOGRAPHY.calloutSize} text-slate-600 leading-relaxed italic -mt-[5px]`}>
              <TextWithCitations text={takeaway} citations={citations} onFileClick={onFileClick} />
            </p>
          </div>
        </div>
      )}

      {/* Findings: supporting details (new format) */}
      {hasFindings && (
        <div className="mb-4 last:mb-0">
          <ul className="space-y-3 ml-3">
            {findings.map((finding, i) => (
              <FindingBullet key={i} finding={finding} citations={citations} onFileClick={onFileClick} />
            ))}
          </ul>
        </div>
      )}

      {/* Support: old format fallback */}
      {!hasFindings && hasSupport && (
        <div className="mb-4 last:mb-0">
          <ul className="space-y-1.5 ml-3">
            {support.map((text, i) => (
              <SupportBullet key={i} text={text} citations={citations} onFileClick={onFileClick} />
            ))}
          </ul>
        </div>
      )}

      {note && (
        <div className="flex items-start gap-1.5 pl-2 py-1 mt-4 border-l-[3px] border-amber-400 bg-amber-50/30 rounded-r">
          <Info size={16} weight="fill" className="text-amber-500 shrink-0 mt-[3px]" />
          <span className="text-sm text-amber-900 leading-relaxed">
            <TextWithCitations text={note} citations={citations} onFileClick={onFileClick} />
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================
// EVIDENCE BLOCKS
// ============================================

function EvidenceSection({ evidence, traceId, runId, onFileClick, callId }: { evidence: Evidence[]; traceId?: string; runId?: string; onFileClick?: (path: string, name?: string, version?: number) => void; callId?: string }) {
  const [expanded, setExpanded] = useState(false)
  const INITIAL_SHOW = 3

  const EVIDENCE_PRIORITY: Record<string, number> = {
    figure: 0, comparison: 0, diagram: 0,
    table: 1, check: 1,
    citation: 2, document: 2,
  }
  const sorted = [...evidence].sort(
    (a, b) => (EVIDENCE_PRIORITY[a.type] ?? 9) - (EVIDENCE_PRIORITY[b.type] ?? 9)
  )
  const grouped = groupEvidence(sorted)
  const hasMore = grouped.length > INITIAL_SHOW
  const visibleEvidence = expanded ? grouped : grouped.slice(0, INITIAL_SHOW)
  const hiddenCount = grouped.length - INITIAL_SHOW

  return (
    <div className="px-8 py-4 space-y-4 border-b border-slate-100">
      {visibleEvidence.map((ev, i) => {
        if (ev.type === 'check-group') return <CheckGroup key={i} checks={ev.checks} />
        if (ev.type === 'figure-group') return <FigureGroup key={i} figures={ev.figures} traceId={traceId} runId={runId} onFileClick={onFileClick} callId={callId} />
        return <EvidenceBlock key={i} evidence={ev as Evidence} traceId={traceId} runId={runId} onFileClick={onFileClick} callId={callId} />
      })}

      {hasMore && !expanded && (
        <button onClick={() => setExpanded(true)} className="cursor-pointer w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
          <CaretDown size={14} weight="bold" />
          Show {hiddenCount} more
        </button>
      )}

      {hasMore && expanded && (
        <button onClick={() => setExpanded(false)} className="cursor-pointer w-full flex items-center justify-center gap-1.5 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-md transition-colors">
          <CaretUp size={14} />
          Show less
        </button>
      )}
    </div>
  )
}

// ============================================
// OUTPUT CARD - MAIN EXPORT
// ============================================

interface OutputCardProps {
  response: StructuredResponse
  traceId?: string
  runId?: string
  callId?: string
  filesChanged?: string[]
  resolvedCitations?: CitationRef[]
  evidenceVersions?: Record<string, number>
  progress?: string
  footer?: React.ReactNode
}

// Hide files with dot-prefixed path components
function shouldShowFile(path: string): boolean {
  const parts = path.split('/')
  return !parts.some(p => p.startsWith('.'))
}

export function OutputCard({ response, traceId, runId, callId, filesChanged, resolvedCitations, evidenceVersions, progress, footer }: OutputCardProps) {
  const handleFileClick = useCallback((filepath: string, name?: string) => {
    emitFileClick({ path: filepath, name })
  }, [])

  // Cited files: referenced in the structured response content
  const rawCited = extractFiles(response).filter(shouldShowFile)
  const citedByBasename = new Map<string, string>()
  for (const fp of rawCited) {
    const bn = fp.split('/').pop() || fp
    if (!citedByBasename.has(bn)) citedByBasename.set(bn, fp)
  }
  const dedupedCited = Array.from(citedByBasename.values())

  // Files changed: created/modified during execution, excluding already-cited basenames
  const rawChanged = (filesChanged || []).filter(shouldShowFile)
  const changedByBasename = new Map<string, string>()
  for (const fp of rawChanged) {
    const bn = fp.split('/').pop() || fp
    if (!citedByBasename.has(bn) && !changedByBasename.has(bn)) {
      changedByBasename.set(bn, fp)
    }
  }
  const dedupedChanged = Array.from(changedByBasename.values())

  const allFiles = [...dedupedCited, ...dedupedChanged]
  const hasFiles = allFiles.length > 0

  // Resolve citations: prefer SSE-resolved, fallback to response.citations if they're CitationRef objects
  const resolvedCitationsList = resolvedCitations ?? response.citations?.filter(c => typeof c === 'object' && c.title) ?? []

  // Enrich evidence with version numbers from SSE evidence_versions event.
  // Versions are keyed by basename (the file's leaf name within its step folder).
  const enrichedEvidence = useMemo(() => {
    if (!response.evidence || !evidenceVersions) return response.evidence
    return response.evidence.map(ev => {
      if ((ev.type === 'figure' || ev.type === 'document') && ev.path) {
        const basename = normalizeAssetPath(ev.path).split('/').pop() || ''
        const version = evidenceVersions[basename]
        if (version != null) return { ...ev, version }
      }
      if (ev.type === 'comparison') {
        const comp = ev as ComparisonEvidence
        const enrichSide = (item: ComparisonItem) => {
          if (!item.path) return item
          const basename = normalizeAssetPath(item.path).split('/').pop() || ''
          const version = evidenceVersions[basename]
          return version != null ? { ...item, version } : item
        }
        return { ...comp, left: enrichSide(comp.left), right: enrichSide(comp.right) }
      }
      return ev
    })
  }, [response.evidence, evidenceVersions])

  return (
    <div>
      <div className="pt-1">
        <StatusBadge status={response.status} progress={progress ?? response.checkpoint?.step_name} />
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mt-1.5">
      <div className="px-8 py-3 border-b border-slate-100">
        <SummaryCard
          status={response.status}
          headline={response.headline}
          findings={response.findings}
          takeaway={response.takeaway}
          support={response.support}
          note={response.note}
          citations={resolvedCitationsList}
          onFileClick={handleFileClick}
        />
      </div>

      {enrichedEvidence && enrichedEvidence.length > 0 && (() => {
        const nonAppendixEvidence = enrichedEvidence.filter(e => e.type !== 'appendix')
        const appendixEvidence = enrichedEvidence.filter(e => e.type === 'appendix') as AppendixEvidence[]

        return (
          <>
            {nonAppendixEvidence.length > 0 && (
              <EvidenceSection evidence={nonAppendixEvidence} traceId={traceId} runId={runId} onFileClick={handleFileClick} callId={callId} />
            )}
            {appendixEvidence.length > 0 && <AppendixSection appendixes={appendixEvidence} />}
          </>
        )
      })()}

      {/* Citations Section - academic reference format */}
      {resolvedCitationsList.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100">
            <h3 className="text-base font-medium text-slate-900 mb-2">References</h3>
            <ol className="space-y-1.5 list-none">
              {resolvedCitationsList.map((citation, i) => (
              <li key={i} className="text-sm text-slate-700 leading-normal flex gap-2">
                <span className="text-slate-900 shrink-0 tabular-nums w-6 text-right whitespace-nowrap">[{i + 1}]</span>
                <span>
                  {(citation.authors || citation.publisher) && <>{citation.authors || citation.publisher}{citation.year ? ` (${citation.year})` : ''}. </>}
                  {citation.url ? (
                    <a
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-900 hover:text-blue-600 transition-colors"
                    >
                      {citation.title}
                    </a>
                  ) : (
                    <span className="text-slate-900">{citation.title}</span>
                  )}
                  {citation.journal && <span className="italic text-slate-700">. {citation.journal}</span>}
                </span>
              </li>
            ))}
            </ol>
          </div>
      )}

      {hasFiles && (
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
          <FileGallery files={allFiles} citedCount={dedupedCited.length} traceId={traceId} runId={runId} onFileClick={handleFileClick} />
        </div>
      )}

      {footer}
    </div>
    </div>
  )
}
