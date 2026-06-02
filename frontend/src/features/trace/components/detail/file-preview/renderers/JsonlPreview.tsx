import React, { useMemo, useState } from 'react'
import { ScrollArea, ScrollBar } from '@/shared/components/ui/scroll-area'
import { ArrowSquareOut } from '@phosphor-icons/react'
import { TYPOGRAPHY, COLORS } from '@/shared/styles'

interface JsonlPreviewProps {
  content: string
}

function smartFormat(value: any): string | null {
  if (value == null) return null
  if (typeof value !== 'object') return null
  if (Array.isArray(value) && value.length > 0 && value[0]?.family) {
    const authors = value.map(a => [a.family, a.given].filter(Boolean).join(' '))
    if (authors.length <= 3) return authors.join(', ')
    return `${authors.slice(0, 3).join(', ')}, et al.`
  }
  if (value['date-parts'] && Array.isArray(value['date-parts'])) {
    const parts = value['date-parts'][0]
    if (Array.isArray(parts)) return parts.join('-')
  }
  if (Array.isArray(value) && value.every(v => typeof v !== 'object')) {
    return value.join(', ')
  }
  if (!Array.isArray(value)) {
    const entries = Object.entries(value)
    if (entries.length <= 4 && entries.every(([, v]) => typeof v !== 'object')) {
      return entries.map(([k, v]) => `${k}: ${v}`).join(', ')
    }
  }
  return null
}

function formatCompact(value: any): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

const TRUNCATE_AT = 80

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  if (text.length <= TRUNCATE_AT) return <span>{text}</span>
  if (expanded) {
    return (
      <span>
        {text}
        <button
          onClick={() => setExpanded(false)}
          className="ml-1 text-emerald-600 hover:text-emerald-700 hover:underline text-[12px] cursor-pointer"
        >
          less
        </button>
      </span>
    )
  }
  return (
    <span className="group inline-flex items-baseline gap-1 -m-1 p-1 rounded hover:bg-slate-50 cursor-pointer" onClick={() => setExpanded(true)}>
      <span>{text.slice(0, TRUNCATE_AT)}<span className="text-slate-400">…</span></span>
      <span className="text-emerald-600 text-[12px] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">more</span>
    </span>
  )
}

function CellValue({ value }: { value: any }) {
  if (value == null) return <span className={COLORS.tertiary}>—</span>
  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>
  if (typeof value === 'number') return <span className="tabular-nums">{value.toLocaleString()}</span>
  if (typeof value === 'string') {
    if (/^https?:\/\//.test(value)) {
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline inline-flex items-baseline gap-1">
          <span className="truncate max-w-[200px]">{value.replace(/^https?:\/\/(www\.)?/, '')}</span>
          <ArrowSquareOut className="w-3 h-3 shrink-0" />
        </a>
      )
    }
    if (/^10\.\d{4,}\//.test(value)) {
      return (
        <a href={`https://doi.org/${value}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline inline-flex items-baseline gap-1">
          <span>{value}</span>
          <ArrowSquareOut className="w-3 h-3 shrink-0" />
        </a>
      )
    }
    return <ExpandableText text={value} />
  }
  const smart = smartFormat(value)
  if (smart) return <ExpandableText text={smart} />
  return <ExpandableText text={formatCompact(value)} />
}

function formatKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function ObjectTable({ items, meta }: { items: any[]; meta?: Record<string, any> }) {
  const columns = useMemo(() => {
    const freq = new Map<string, number>()
    for (const item of items) {
      for (const key of Object.keys(item)) {
        freq.set(key, (freq.get(key) || 0) + 1)
      }
    }
    const sorted = [...freq.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([key]) => key)
    const titleKey = sorted.find(k => k.toLowerCase() === 'title')
    const idKey = sorted.find(k => k.toLowerCase() === 'id')
    const rest = sorted.filter(k => k.toLowerCase() !== 'title' && k.toLowerCase() !== 'id')
    const reordered = [
      ...(titleKey ? [titleKey] : []),
      ...rest,
      ...(idKey ? [idKey] : []),
    ]
    return reordered.slice(0, 8)
  }, [items])

  return (
    <div className="space-y-3">
      {meta && Object.keys(meta).length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(meta).map(([k, v]) => (
            typeof v === 'string' || typeof v === 'number' ? (
              <span key={k} className={`${TYPOGRAPHY.labelSize} ${COLORS.tertiary}`}>
                {formatKey(k)}: <span className={COLORS.secondary}>{String(v)}</span>
              </span>
            ) : null
          ))}
          <span className={`${TYPOGRAPHY.labelSize} ${COLORS.tertiary}`}>&middot; {items.length} rows</span>
        </div>
      )}
      {!meta && (
        <span className={`${TYPOGRAPHY.labelSize} ${COLORS.tertiary}`}>{items.length} rows</span>
      )}

      <div className="border border-slate-200 rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className={`${TYPOGRAPHY.labelSize} font-medium ${COLORS.tertiary} px-3 py-2 w-8`}>#</th>
                {columns.map(col => (
                  <th key={col} className={`${TYPOGRAPHY.labelSize} font-medium ${COLORS.secondary} px-3 py-2 whitespace-nowrap`}>
                    {formatKey(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className={`${TYPOGRAPHY.labelSize} ${COLORS.tertiary} px-3 py-2 tabular-nums`}>{idx + 1}</td>
                  {columns.map(col => (
                    <td key={col} className={`${TYPOGRAPHY.labelSize} ${COLORS.primary} px-3 py-2 max-w-[300px]`}>
                      <CellValue value={item[col]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function PrimitiveList({ items }: { items: any[] }) {
  return (
    <div className="space-y-0.5">
      <span className={`${TYPOGRAPHY.labelSize} ${COLORS.tertiary}`}>{items.length} items</span>
      {items.map((item, idx) => (
        <div key={idx} className="flex items-baseline gap-2 px-3 py-1">
          <span className={`${TYPOGRAPHY.labelSize} ${COLORS.tertiary} w-5 text-right shrink-0 tabular-nums`}>{idx + 1}.</span>
          <span className={`${TYPOGRAPHY.labelSize} ${COLORS.primary}`}>
            <CellValue value={item} />
          </span>
        </div>
      ))}
    </div>
  )
}

interface ParseResult {
  items: any[]
  errors: { line: number; error: string }[]
}

function parseJsonl(content: string): ParseResult {
  const lines = content.split('\n')
  const items: any[] = []
  const errors: { line: number; error: string }[] = []
  lines.forEach((line, idx) => {
    const trimmed = line.trim()
    if (!trimmed) return
    try {
      items.push(JSON.parse(trimmed))
    } catch (e) {
      errors.push({ line: idx + 1, error: e instanceof Error ? e.message : 'Invalid JSON' })
    }
  })
  return { items, errors }
}

export function JsonlPreview({ content }: JsonlPreviewProps) {
  const { items, errors } = useMemo(() => parseJsonl(content), [content])

  if (items.length === 0 && errors.length > 0) {
    return (
      <div className="flex-1 border rounded-md overflow-hidden bg-white flex flex-col p-4">
        <div className="text-red-600 text-sm mb-2">JSONL Parse Error: No valid JSON objects found</div>
        <div className="text-xs text-slate-600 space-y-1">
          {errors.slice(0, 5).map((err, idx) => (
            <div key={idx}>Line {err.line}: {err.error}</div>
          ))}
          {errors.length > 5 && <div>...and {errors.length - 5} more errors</div>}
        </div>
        <pre className="text-xs font-mono text-slate-600 whitespace-pre-wrap mt-4">{content.slice(0, 500)}{content.length > 500 ? '...' : ''}</pre>
      </div>
    )
  }

  const allObjects = items.every(item => item != null && typeof item === 'object' && !Array.isArray(item))
  const allPrimitives = items.every(item => item == null || typeof item !== 'object')

  if (allObjects && items.length > 0) {
    return <Wrapper errors={errors}><ObjectTable items={items} /></Wrapper>
  }
  if (allPrimitives) {
    return <Wrapper errors={errors}><PrimitiveList items={items} /></Wrapper>
  }

  return (
    <div className="flex-1 border rounded-md overflow-hidden bg-white flex flex-col">
      <ScrollArea className="h-full w-full">
        {errors.length > 0 && (
          <div className="px-4 pt-4">
            <div className="text-amber-600 text-xs mb-2">
              {errors.length} line{errors.length !== 1 ? 's' : ''} failed to parse
            </div>
          </div>
        )}
        <pre className="p-4 font-mono text-[13px] text-slate-700 whitespace-pre-wrap leading-relaxed">
          {JSON.stringify(items, null, 2)}
        </pre>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

function Wrapper({ children, errors }: { children: React.ReactNode; errors?: { line: number; error: string }[] }) {
  return (
    <div className="flex-1 border rounded-md overflow-hidden bg-white flex flex-col">
      <ScrollArea className="h-full w-full">
        <div className="p-4 space-y-3 w-max min-w-full">
          {errors && errors.length > 0 && (
            <div className="text-amber-600 text-xs">
              {errors.length} line{errors.length !== 1 ? 's' : ''} failed to parse
            </div>
          )}
          {children}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
