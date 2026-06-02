import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollArea, ScrollBar } from '@/shared/components/ui/scroll-area'
import { ArrowSquareOut, SlidersHorizontal } from '@phosphor-icons/react'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { TYPOGRAPHY, COLORS } from '@/shared/styles'
import { cn } from '@/shared/lib/utils'
import { detectShape } from './json-shape'

interface JsonPreviewProps {
  content: string
}

// ============================================================
// Smart value formatting
// ============================================================

function smartFormat(value: any): string | null {
  if (value == null) return null
  if (typeof value !== 'object') return null

  // CSL-JSON author array: [{family, given}, ...]
  if (Array.isArray(value) && value.length > 0 && value[0]?.family) {
    const authors = value.map(a => [a.family, a.given].filter(Boolean).join(' '))
    if (authors.length <= 3) return authors.join(', ')
    return `${authors.slice(0, 3).join(', ')}, et al.`
  }
  // CSL-JSON issued: {date-parts: [[2026]]}
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
    <span className="group items-baseline gap-1 -m-1 p-1 rounded hover:bg-slate-50 cursor-pointer" onClick={() => setExpanded(true)}>
      <span>
        {text.slice(0, TRUNCATE_AT)}
        <span className="text-slate-400">…</span>
        <span className="text-emerald-600 text-[12px] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">more</span>
      </span>
    </span>
  )
}

function isSimpleObject(value: any): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  return Object.values(value).every(v => typeof v !== 'object' || v === null)
}

function CollapsibleSection({ label, children, depth, itemCount }: { label: string; children: React.ReactNode; depth: number; itemCount?: number }) {
  const [expanded, setExpanded] = useState(depth < 3)
  const isTopLevel = depth <= 1
  return (
    <div>
      <div
        className={`flex items-baseline gap-1.5 cursor-pointer group ${isTopLevel ? 'py-0.5' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <span className={`${isTopLevel ? TYPOGRAPHY.secondarySize : TYPOGRAPHY.labelSize} font-medium ${COLORS.secondary} group-hover:text-emerald-600`}>
          {formatKey(label)}
        </span>
        <span className="text-slate-400 text-[12px] group-hover:text-emerald-600">
          {expanded ? '−' : `+${itemCount !== undefined ? itemCount : ''}`}
        </span>
      </div>
      {expanded && (
        <div className={`${isTopLevel ? 'mt-2 pl-4' : 'mt-1.5 pl-3'} border-l border-slate-200`}>
          {children}
        </div>
      )}
    </div>
  )
}

function NestedBlock({ value, depth = 0 }: { value: any; depth?: number }) {
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
    return <span>{value}</span>
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className={COLORS.tertiary}>—</span>
    if (value.every(v => typeof v !== 'object' || v === null)) {
      return <span>{value.join(', ') || '—'}</span>
    }
    return (
      <div className="space-y-2">
        {value.map((item, idx) => (
          <CollapsibleSection key={idx} label={`${idx + 1}`} depth={depth + 1} itemCount={Object.keys(item || {}).length}>
            <NestedBlock value={item} depth={depth + 1} />
          </CollapsibleSection>
        ))}
      </div>
    )
  }
  if (isSimpleObject(value)) {
    const entries = Object.entries(value)
    const allShort = entries.every(([, v]) => String(v).length < 40)
    if (entries.length <= 3 && allShort) {
      return (
        <span>
          {entries.map(([k, v], i) => (
            <span key={k}>
              <span className="text-slate-500">{formatKey(k)}:</span>{' '}
              <span>{String(v)}</span>
              {i < entries.length - 1 && <span className="text-slate-300 mx-1">·</span>}
            </span>
          ))}
        </span>
      )
    }
  }
  const entries = Object.entries(value)
  return (
    <div className={depth < 2 ? 'space-y-3' : 'space-y-1.5'}>
      {entries.map(([key, val]) => {
        const isComplex = typeof val === 'object' && val !== null && !Array.isArray(val) && !isSimpleObject(val)
        const isLongSimple = typeof val === 'object' && val !== null && !Array.isArray(val) && isSimpleObject(val) && Object.values(val).some(v => String(v).length > 40)
        const isNested = isComplex || isLongSimple
        const isArrayOfObjects = Array.isArray(val) && val.length > 0 && typeof val[0] === 'object'
        if (isNested || isArrayOfObjects) {
          const count = Array.isArray(val) ? val.length : Object.keys(val).length
          return (
            <CollapsibleSection key={key} label={key} depth={depth + 1} itemCount={count}>
              <NestedBlock value={val} depth={depth + 1} />
            </CollapsibleSection>
          )
        }
        return (
          <div key={key} className="flex items-baseline gap-2">
            <span className={`${TYPOGRAPHY.labelSize} text-slate-500 shrink-0`}>{formatKey(key)}:</span>
            <span className={`${TYPOGRAPHY.labelSize} ${COLORS.primary}`}>
              <NestedBlock value={val} depth={depth + 1} />
            </span>
          </div>
        )
      })}
    </div>
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
    return <ExpandableText text={value} />
  }
  const smart = smartFormat(value)
  if (smart) return <ExpandableText text={smart} />
  return <NestedBlock value={value} />
}

function formatKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

// --- Table view for array of objects ---

function ObjectTable({ items, meta }: { items: any[]; meta?: Record<string, any> }) {
  const { allColumns, titleColumn } = useMemo(() => {
    const freq = new Map<string, number>()
    for (const item of items) {
      for (const key of Object.keys(item)) {
        freq.set(key, (freq.get(key) || 0) + 1)
      }
    }
    const minFreq = Math.max(1, Math.floor(items.length * 0.3))
    const ordered = Object.keys(items[0] || {}).filter(k => (freq.get(k) || 0) >= minFreq)
    for (const [key, count] of freq) {
      if (count >= minFreq && !ordered.includes(key)) ordered.push(key)
    }
    const titleKey = ordered.find(k => {
      const lk = k.toLowerCase().replace(/[_-]/g, '')
      return lk === 'title' || lk === 'name' || lk.endsWith('name') || lk === 'label' || lk === 'heading'
    })
    const idKey = ordered.find(k => {
      const lk = k.toLowerCase().replace(/[_-]/g, '')
      return lk === 'id' || lk.endsWith('id')
    })
    const rest = ordered.filter(k => k !== titleKey && k !== idKey)
    const reordered = [
      ...(titleKey ? [titleKey] : []),
      ...rest,
      ...(idKey ? [idKey] : []),
    ]
    return { allColumns: reordered, titleColumn: titleKey ?? null }
  }, [items])

  const [visibleSet, setVisibleSet] = useState<Set<string>>(() => new Set(allColumns))
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pickerOpen) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pickerOpen])

  const visibleColumns = allColumns.filter(c => visibleSet.has(c))
  const allSelected = allColumns.every(c => visibleSet.has(c))

  const toggleColumn = (col: string) => {
    setVisibleSet(prev => {
      const next = new Set(prev)
      if (next.has(col)) {
        if (next.size > 1) next.delete(col)
      } else {
        next.add(col)
      }
      return next
    })
  }
  const toggleAll = () => {
    if (allSelected) setVisibleSet(new Set([allColumns[0]]))
    else setVisibleSet(new Set(allColumns))
  }

  return (
    <div className="space-y-2">
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

      <div ref={pickerRef} className="relative inline-block">
        <button
          type="button"
          onClick={() => setPickerOpen(!pickerOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-colors cursor-pointer ${
            pickerOpen
              ? 'border-slate-300 bg-slate-50 shadow-sm'
              : allSelected
                ? 'border-slate-200 bg-white hover:bg-slate-50'
                : 'border-amber-300 border-[1.5px] bg-white hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
          <span className={`${TYPOGRAPHY.labelSize} ${COLORS.secondary}`}>Columns</span>
          <span className={`${TYPOGRAPHY.labelSize} ${allSelected ? COLORS.tertiary : 'text-amber-600'}`}>
            {visibleColumns.length}/{allColumns.length}
          </span>
        </button>

        {pickerOpen && (
          <div className="absolute top-full left-0 mt-1.5 z-50 w-56 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/50">
              <span className={`${TYPOGRAPHY.labelSize} font-medium ${COLORS.secondary}`}>Toggle columns</span>
              <button
                type="button"
                onClick={toggleAll}
                className={`${TYPOGRAPHY.labelSize} text-emerald-600 hover:text-emerald-700 cursor-pointer`}
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="py-1 max-h-[260px] overflow-y-auto">
              {allColumns.map(col => {
                const checked = visibleSet.has(col)
                return (
                  <label
                    key={col}
                    className="flex items-center gap-2.5 w-full px-3 py-1.5 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleColumn(col)} />
                    <span className={`${TYPOGRAPHY.labelSize} ${checked ? COLORS.secondary : COLORS.tertiary} truncate`}>{formatKey(col)}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="border border-slate-200 rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className={`${TYPOGRAPHY.labelSize} font-medium ${COLORS.tertiary} px-3 py-2 w-10`}>#</th>
                {visibleColumns.map(col => (
                  <th key={col} className={`${TYPOGRAPHY.labelSize} font-medium ${COLORS.secondary} px-3 py-2 whitespace-nowrap max-w-[200px]`}>
                    {formatKey(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className={`${TYPOGRAPHY.labelSize} ${COLORS.tertiary} px-3 py-2 tabular-nums`}>{idx + 1}</td>
                  {visibleColumns.map(col => (
                    <td
                      key={col}
                      className={cn(
                        col === titleColumn ? `${TYPOGRAPHY.secondarySize} font-medium` : TYPOGRAPHY.labelSize,
                        COLORS.primary,
                        'px-3 py-2 align-top',
                      )}
                    >
                      <div className="block min-w-0 max-w-[200px] whitespace-normal break-words [overflow-wrap:anywhere]">
                        <CellValue value={item[col]} />
                      </div>
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

// --- Key-value view for single object ---

function ObjectKeyValue({ data }: { data: Record<string, any> }) {
  const entries = Object.entries(data)
  const hasNestedObjects = entries.some(([, v]) => {
    if (typeof v !== 'object' || v === null) return false
    if (Array.isArray(v)) return v.some(item => typeof item === 'object' && item !== null)
    return !isSimpleObject(v)
  })
  if (hasNestedObjects) return <NestedBlock value={data} />

  const hasLongValues = entries.some(([, v]) => formatCompact(v).length > 40)
  if (hasLongValues) {
    return (
      <div className="space-y-2">
        {entries.map(([key, value]) => (
          <div key={key} className="bg-slate-50 rounded-md px-3 py-2.5">
            <div className={`${TYPOGRAPHY.labelSize} text-slate-500 mb-1`}>{formatKey(key)}</div>
            <div className={`${TYPOGRAPHY.secondarySize} ${COLORS.primary} leading-snug`}>
              <CellValue value={value} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-slate-50/50 rounded-md px-3 py-2.5 w-fit">
      <table>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-b border-slate-200 last:border-0">
              <td className="text-[13px] text-slate-500 py-1.5 pr-8 align-top whitespace-nowrap">{formatKey(key)}</td>
              <td className={`text-[13px] font-medium ${COLORS.primary} py-1.5`}>
                <CellValue value={value} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

function ValueRenderer({ value }: { value: any }) {
  if (value == null) return <span className={COLORS.tertiary}>—</span>
  if (typeof value !== 'object') return <CellValue value={value} />
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className={COLORS.tertiary}>Empty list</span>
    const allObjects = value.every((v: any) => v != null && typeof v === 'object' && !Array.isArray(v))
    if (allObjects) return <ObjectTable items={value} />
    return <PrimitiveList items={value} />
  }
  return <ObjectKeyValue data={value} />
}

function sectionLabel(key: string): string { return formatKey(key) }

function ObjectSections({ data }: { data: Record<string, any> }) {
  const entries = Object.entries(data)
  const nonPrimitiveEntries = entries.filter(([, v]) => typeof v === 'object' && v !== null)
  if (entries.length <= 1 || nonPrimitiveEntries.length === 0) {
    return <ObjectKeyValue data={data} />
  }

  const tabOptions = entries
    .filter(([, v]) => typeof v === 'object' && v !== null)
    .map(([key]) => ({ label: sectionLabel(key), value: key }))

  const primitiveEntries = entries.filter(([, v]) => typeof v !== 'object' || v === null)

  const defaultTab = entries
    .filter(([, v]) => Array.isArray(v))
    .sort((a, b) => (b[1] as any[]).length - (a[1] as any[]).length)[0]?.[0]
    ?? tabOptions[0]?.value

  const [activeTab, setActiveTab] = useState(defaultTab)

  if (tabOptions.length === 1) {
    return (
      <div className="space-y-4">
        {primitiveEntries.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            {primitiveEntries.map(([k, v]) => (
              <span key={k} className={`${TYPOGRAPHY.labelSize} ${COLORS.tertiary}`}>
                {formatKey(k)}: <span className={COLORS.secondary}>{String(v)}</span>
              </span>
            ))}
          </div>
        )}
        <ValueRenderer value={data[tabOptions[0].value]} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {primitiveEntries.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {primitiveEntries.map(([k, v]) => (
            <span key={k} className={`${TYPOGRAPHY.labelSize} ${COLORS.tertiary}`}>
              {formatKey(k)}: <span className={COLORS.secondary}>{String(v)}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-200">
        {tabOptions.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setActiveTab(opt.value)}
            className={`${TYPOGRAPHY.secondarySize} px-3 py-1.5 transition-colors cursor-pointer -mb-px ${
              activeTab === opt.value
                ? 'text-slate-900 font-medium border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {data[activeTab] != null && (
        <div key={activeTab} className="animate-in fade-in duration-200">
          <ValueRenderer value={data[activeTab]} />
        </div>
      )}
    </div>
  )
}

// ============================================================
// Main component
// ============================================================

export function JsonPreview({ content }: JsonPreviewProps) {
  let parsedJson: any = null
  let parseError: string | null = null

  try {
    parsedJson = JSON.parse(content)
  } catch (e) {
    parseError = e instanceof Error ? e.message : 'Invalid JSON'
  }

  if (parseError || parsedJson == null) {
    return (
      <div className="flex-1 border rounded-md overflow-hidden bg-white flex flex-col p-4">
        <div className="text-red-600 text-sm mb-2">JSON Parse Error: {parseError || 'Invalid JSON'}</div>
        <pre className="text-xs font-mono text-slate-600 whitespace-pre-wrap">{content}</pre>
      </div>
    )
  }

  const shape = detectShape(parsedJson)

  if (shape.type === 'array-of-objects') {
    const hasRichMeta = shape.meta && Object.values(shape.meta).some(v => typeof v === 'object' && v !== null)
    if (hasRichMeta && !Array.isArray(parsedJson)) {
      return <Wrapper><ObjectSections data={parsedJson} /></Wrapper>
    }
    return <Wrapper><ObjectTable items={shape.items} meta={shape.meta} /></Wrapper>
  }
  if (shape.type === 'object') return <Wrapper><ObjectSections data={shape.data} /></Wrapper>
  if (shape.type === 'array-of-primitives') return <Wrapper><PrimitiveList items={shape.items} /></Wrapper>

  return (
    <div className="flex-1 border rounded-md overflow-hidden bg-white flex flex-col">
      <ScrollArea className="h-full w-full">
        <pre className="p-4 font-mono text-[13px] text-slate-700 whitespace-pre-wrap leading-relaxed">
          {JSON.stringify(parsedJson, null, 2)}
        </pre>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 border rounded-md overflow-hidden bg-white flex flex-col [&_[data-slot=scroll-area-thumb]]:bg-slate-300 hover:[&_[data-slot=scroll-area-thumb]]:bg-slate-400">
      <ScrollArea className="h-full w-full">
        <div className="p-4 space-y-3 w-max min-w-full">{children}</div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
