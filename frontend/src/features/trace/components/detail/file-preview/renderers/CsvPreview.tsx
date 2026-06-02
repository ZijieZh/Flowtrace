import React, { useMemo, useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { parseCSV } from '../file-utils'

interface CsvPreviewProps {
  content: string
}

const ROWS_PER_PAGE = 100

/** CSV preview — client-side parse + paginated plain table. */
export function CsvPreview({ content }: CsvPreviewProps) {
  const rows = useMemo(() => parseCSV(content), [content])
  const headers = rows[0] || []
  const dataRows = rows.slice(1)
  const totalRows = dataRows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE))

  const [page, setPage] = useState(0)
  const startIdx = page * ROWS_PER_PAGE
  const endIdx = Math.min(startIdx + ROWS_PER_PAGE, totalRows)
  const visibleRows = dataRows.slice(startIdx, endIdx)

  return (
    <div className="flex-1 border rounded-md flex flex-col bg-white min-h-0">
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <table className="w-full text-left border-collapse" style={{ tableLayout: 'auto' }}>
            <thead className="sticky top-0 bg-white z-10">
              <tr>
                {headers.map((header, i) => (
                  <th
                    key={i}
                    className="font-semibold bg-gray-50 border-b-2 border-slate-200 px-3 py-2 whitespace-nowrap text-slate-700 text-sm"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length || 1} className="text-center text-gray-500 py-6">
                    No data rows
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-slate-100">
                    {headers.map((_, cellIdx) => (
                      <td
                        key={cellIdx}
                        className="px-3 py-1.5 text-slate-700 text-sm align-top whitespace-nowrap overflow-hidden text-ellipsis max-w-[280px]"
                        title={row[cellIdx] ?? ''}
                      >
                        {row[cellIdx] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalRows > ROWS_PER_PAGE && (
        <div className="flex items-center justify-between px-4 py-2 border-t bg-gray-50 text-sm text-slate-600">
          <span>
            Showing {startIdx + 1}–{endIdx} of {totalRows.toLocaleString()} rows
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
