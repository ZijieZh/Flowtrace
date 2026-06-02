
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowUpRight,
  CaretDown,
} from '@phosphor-icons/react'
import type { StructuredResponse, FigureEvidence, ComparisonEvidence } from '../types'
import { normalizeAssetPath } from "@/features/trace/lib/file-resolver"
import { basename, getExt } from "@/features/trace/lib/file-utils"
import { FileThumbnail } from '@/features/trace/components/detail/thumbnails'

const VISIBLE_THRESHOLD = 6

// Type priority: lower = shown first
const TYPE_PRIORITY: Record<string, number> = {
  // Images
  png: 0, jpg: 0, jpeg: 0, gif: 0, svg: 0, webp: 0,
  // Data
  csv: 1, xlsx: 1, xls: 1, tsv: 1,
  // Documents
  pdf: 2, doc: 2, docx: 2, md: 2, txt: 2,
  // Code / config
  py: 3, js: 3, ts: 3, jsx: 3, tsx: 3, html: 3, css: 3,
  json: 4, yaml: 4, yml: 4, toml: 4, xml: 4,
}

function getTypePriority(filepath: string): number {
  return TYPE_PRIORITY[getExt(filepath)] ?? 5
}

interface FileGalleryProps {
  files: string[]
  citedCount?: number
  traceId?: string
  runId?: string
  onFileClick?: (path: string) => void
}

// File Gallery - shows all referenced files with thumbnails
export function FileGallery({ files, citedCount = 0, traceId, runId, onFileClick }: FileGalleryProps) {
  const { t } = useTranslation('trace')
  const [expanded, setExpanded] = useState(false)

  if (files.length === 0) return null

  const ordered = useMemo(() => {
    const cited = files.slice(0, citedCount)
    const changed = files.slice(citedCount)
    const sortedChanged = files.length > VISIBLE_THRESHOLD
      ? [...changed].sort((a, b) => getTypePriority(a) - getTypePriority(b))
      : changed
    return [...cited, ...sortedChanged]
  }, [files, citedCount])

  // Visible count: always show all cited, cap the rest
  const visibleCount = Math.max(VISIBLE_THRESHOLD, citedCount)
  const hasOverflow = ordered.length > visibleCount
  const visible = expanded || !hasOverflow ? ordered : ordered.slice(0, visibleCount)
  const hiddenCount = ordered.length - visibleCount

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-slate-500">{t('structuredResponse.files')}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {visible.map((filepath, i) => {
          const filename = basename(filepath) || filepath
          const displayName = filename === 'references.jsonl' ? 'References' : filename

          return (
            <button
              key={i}
              onClick={() => onFileClick?.(filepath)}
              className="cursor-pointer group flex items-center gap-2 h-[40px] px-2 py-1.5 bg-white border border-slate-200 rounded-[6px] hover:border-slate-300 hover:bg-slate-50 transition-colors overflow-hidden"
              title={filepath}
            >
              <FileThumbnail
                fileName={filename}
                filePath={filepath}
                traceId={traceId || ''}
                runId={runId}
                size="sm"
              />
              <span className="text-sm text-slate-900 truncate flex-1 text-left">
                {displayName}
              </span>
              <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-600 shrink-0" />
            </button>
          )
        })}
      </div>
      {hasOverflow && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <CaretDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? t('structuredResponse.showLess') : t('structuredResponse.showMore', { count: hiddenCount })}
        </button>
      )}
    </div>
  )
}

// Extract all file references from structured output
export function extractFiles(response: StructuredResponse): string[] {
  const files = new Set<string>()

  for (const text of response.support ?? []) {
    const matches = text.match(/@([\w./-]+\.\w+)/g)
    if (matches) {
      for (const match of matches) {
        files.add(match.slice(1))
      }
    }
  }

  if (response.evidence) {
    for (const ev of response.evidence) {
      if (ev.type === 'figure') {
        const fig = ev as FigureEvidence
        if (fig.path) files.add(normalizeAssetPath(fig.path))
      }
      if (ev.type === 'comparison') {
        const comp = ev as ComparisonEvidence
        if (comp.left?.path) files.add(normalizeAssetPath(comp.left.path))
        if (comp.right?.path) files.add(normalizeAssetPath(comp.right.path))
      }
      if (ev.type === 'table' && ev.source_file) {
        files.add(normalizeAssetPath(ev.source_file))
      }
    }
  }

  return Array.from(files)
}
