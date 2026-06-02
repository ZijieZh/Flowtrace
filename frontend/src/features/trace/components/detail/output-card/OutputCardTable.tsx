import React, { useState } from 'react'
import { FileCsv, ArrowUpRight, CaretDown, CaretUp } from '@phosphor-icons/react'
import { cn } from '@/shared/lib/utils'
import { EnhancedMarkdown } from '@/shared/components/EnhancedMarkdown'
import type { TableEvidence } from './types'

function parseMarkdownTable(markdown: string): { columns: string[]; rows: string[][] } | null {
  const lines = markdown.trim().split('\n').filter(line => line.trim())
  if (lines.length < 2) return null

  const headerLine = lines[0]
  const columns = headerLine.split('|').map(c => c.trim()).filter(Boolean)
  if (columns.length === 0) return null

  const rows: string[][] = []
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i].split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length)
    const cleanCells = cells.map(cell => {
      let cleaned = cell.replace(/\*\*(.*?)\*\*/g, '$1')
      if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1)
      }
      return cleaned
    })
    if (cleanCells.length > 0) rows.push(cleanCells)
  }

  return { columns, rows }
}

export function TableBlock({ title, markdown, columns, rows, total, source_file, onFileClick, maxRows = 4 }: TableEvidence & { onFileClick?: (path: string, name?: string, version?: number) => void; maxRows?: number }) {
  const [expanded, setExpanded] = useState(false)

  if (markdown && !columns) {
    const parsed = parseMarkdownTable(markdown)
    if (parsed) {
      columns = parsed.columns
      rows = parsed.rows
    }
  }

  if (!columns || !rows) {
    if (markdown) {
      return (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          {title && (
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-medium text-slate-900">{title}</h3>
            </div>
          )}
          <div className="p-4">
            <EnhancedMarkdown>{markdown}</EnhancedMarkdown>
          </div>
        </div>
      )
    }
    return null
  }

  const hasMore = rows.length > maxRows
  const visibleRows = expanded ? rows : rows.slice(0, maxRows)
  const hiddenCount = rows.length - maxRows

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {(title || total || hasMore) && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
          {title && <h3 className="text-sm text-slate-600"><span className="font-medium text-slate-700">Table:</span> <EnhancedMarkdown inline>{title}</EnhancedMarkdown></h3>}
          {(total || hasMore) && <span className="text-xs text-slate-500">showing {visibleRows.length} of {total || rows.length}</span>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {columns.map((col, i) => (
                <th key={i} className="px-4 py-2 text-left text-xs font-medium text-slate-500">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50">
                {row.map((cell, j) => {
                  let cellStr = String(cell)
                  if ((cellStr.startsWith('"') && cellStr.endsWith('"')) || (cellStr.startsWith("'") && cellStr.endsWith("'"))) {
                    cellStr = cellStr.slice(1, -1)
                  }
                  return (
                    <td key={j} className={cn('px-4 py-2', j === 0 ? 'font-medium text-slate-900' : 'text-slate-700')}>
                      <EnhancedMarkdown inline>{cellStr}</EnhancedMarkdown>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="cursor-pointer w-full px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-1"
        >
          {expanded ? (
            <>
              <CaretUp size={14} />
              Show less
            </>
          ) : (
            <>
              <CaretDown size={14} />
              Show {hiddenCount} more rows
            </>
          )}
        </button>
      )}

      {source_file && (
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-2 cursor-pointer hover:bg-slate-100" onClick={() => onFileClick?.(source_file)}>
          <FileCsv size={14} className="text-slate-500" />
          <span className="text-xs text-slate-500 font-mono">{source_file}</span>
          <ArrowUpRight size={12} className="text-slate-400" />
        </div>
      )}
    </div>
  )
}
