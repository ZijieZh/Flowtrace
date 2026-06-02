import React, { useEffect, useState } from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import { ScrollArea } from '@/shared/components/ui/scroll-area'

interface DocxPreviewProps {
  arrayBuffer: ArrayBuffer
}

/**
 * DOCX preview using `mammoth` (HTML conversion). Mammoth produces clean
 * HTML for headings/paragraphs/lists/tables — that's enough for read-only
 * preview of agent-produced reports.
 */
export function DocxPreview({ arrayBuffer }: DocxPreviewProps) {
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const loadDocx = async () => {
      setLoading(true)
      setError(null)
      try {
        const mammoth: any = await import('mammoth')
        const result = await mammoth.convertToHtml({ arrayBuffer })
        if (cancelled) return
        setHtml(result.value || '')
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to render DOCX')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadDocx()
    return () => { cancelled = true }
  }, [arrayBuffer])

  if (error) {
    return (
      <div className="flex-1 border rounded-md overflow-hidden bg-white flex items-center justify-center">
        <div className="text-red-600 text-sm">DOCX preview error: {error}</div>
      </div>
    )
  }

  return (
    <div className="flex-1 border rounded-md overflow-hidden bg-white flex flex-col relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <div className="flex flex-col items-center gap-2">
            <CircleNotch className="w-6 h-6 animate-spin text-gray-400" />
            <span className="text-sm text-gray-500">Loading DOCX…</span>
          </div>
        </div>
      )}
      <ScrollArea className="h-full w-full">
        <div className="p-8 max-w-3xl mx-auto prose prose-slate prose-sm">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </ScrollArea>
    </div>
  )
}
