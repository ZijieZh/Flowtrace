import React, { useEffect, useState } from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import { ScrollArea, ScrollBar } from '@/shared/components/ui/scroll-area'

interface ExcelPreviewProps {
  arrayBuffer: ArrayBuffer
}

interface SheetData {
  name: string
  data: string[][]
}

export function ExcelPreview({ arrayBuffer }: ExcelPreviewProps) {
  const [sheets, setSheets] = useState<SheetData[]>([])
  const [activeSheet, setActiveSheet] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadExcel = async () => {
      try {
        const XLSX: any = await import('xlsx')
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const loadedSheets: SheetData[] = []
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName]
          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]
          loadedSheets.push({ name: sheetName, data })
        }
        setSheets(loadedSheets)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to parse Excel file')
      } finally {
        setLoading(false)
      }
    }
    void loadExcel()
  }, [arrayBuffer])

  if (loading) {
    return (
      <div className="flex-1 border rounded-md overflow-hidden bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <CircleNotch className="w-6 h-6 animate-spin text-slate-400" />
          <span className="text-sm text-slate-500">Loading Excel file...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 border rounded-md overflow-hidden bg-white flex items-center justify-center">
        <div className="text-red-600 text-sm">Error: {error}</div>
      </div>
    )
  }

  if (sheets.length === 0) {
    return (
      <div className="flex-1 border rounded-md overflow-hidden bg-white flex items-center justify-center">
        <div className="text-slate-500 text-sm">No sheets found in Excel file</div>
      </div>
    )
  }

  const currentSheet = sheets[activeSheet]
  const headers = currentSheet.data[0] || []
  const rows = currentSheet.data.slice(1)

  return (
    <div className="flex-1 border rounded-md overflow-hidden bg-white flex flex-col">
      {sheets.length > 1 && (
        <div className="flex border-b bg-slate-50 px-2 pt-2">
          {sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              onClick={() => setActiveSheet(index)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${
                index === activeSheet
                  ? 'bg-white border border-b-white -mb-px text-slate-900'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      <ScrollArea className="h-full w-full">
        <div className="p-4 min-w-max">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10">
              <tr>
                {headers.map((header, i) => (
                  <th key={i} className="font-semibold whitespace-nowrap bg-slate-50 border-b-2 border-slate-200 px-3 py-2 text-sm text-slate-700">
                    {header ?? `Column ${i + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length || 1} className="text-center text-slate-500 py-6">No data rows</td>
                </tr>
              ) : (
                rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-slate-100">
                    {headers.map((_, cellIndex) => (
                      <td key={cellIndex} className="whitespace-nowrap px-3 py-1.5 text-sm text-slate-700">
                        {row[cellIndex] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
