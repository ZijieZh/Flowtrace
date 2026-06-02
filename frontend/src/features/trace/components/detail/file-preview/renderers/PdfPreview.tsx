import React, { useEffect, useRef, useState } from 'react'
import { CircleNotch, DownloadSimple } from '@phosphor-icons/react'

interface PdfPreviewProps {
  pdfUrl: string
  fileName: string
}

function PdfPageCanvas({ doc, pageNum, width }: { doc: any; pageNum: number; width: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false

    async function renderPage() {
      const canvas = canvasRef.current
      if (!canvas || !width) return

      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
        renderTaskRef.current = null
      }

      const page = await doc.getPage(pageNum)
      if (cancelled) return

      const baseViewport = page.getViewport({ scale: 1 })
      const scale = width / baseViewport.width
      const viewport = page.getViewport({ scale })
      const dpr = window.devicePixelRatio || 1

      canvas.width = viewport.width * dpr
      canvas.height = viewport.height * dpr
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`

      const context = canvas.getContext('2d')
      if (!context) return
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.scale(dpr, dpr)

      const task = page.render({ canvasContext: context, viewport })
      renderTaskRef.current = task
      try {
        await task.promise
      } catch {
        // Ignore cancelled tasks.
      }
    }

    void renderPage()
    return () => {
      cancelled = true
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
        renderTaskRef.current = null
      }
    }
  }, [doc, pageNum, width])

  return <canvas ref={canvasRef} className="mx-auto block bg-white shadow-sm" />
}

/**
 * PDF preview using pdfjs-dist. Renders all pages as canvases — works
 * everywhere, no <iframe> sandbox quirks.
 */
export function PdfPreview({ pdfUrl, fileName }: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [doc, setDoc] = useState<any>(null)
  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [pageWidth, setPageWidth] = useState(0)

  useEffect(() => {
    setLoadFailed(false)
    setLoaded(false)
    setDoc(null)
    let cancelled = false

    async function loadPdf() {
      try {
        const pdfjsLib: any = await import('pdfjs-dist')
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
        }
        const response = await fetch(pdfUrl)
        const buffer = await response.arrayBuffer()
        const nextDoc = await pdfjsLib.getDocument({ data: buffer }).promise
        if (cancelled) return
        setDoc(nextDoc)
        setLoaded(true)
      } catch {
        if (!cancelled) setLoadFailed(true)
      }
    }

    void loadPdf()
    return () => { cancelled = true; setDoc(null) }
  }, [pdfUrl])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateWidth = () => {
      const rect = el.getBoundingClientRect()
      setPageWidth(Math.max(rect.width - 24, 0))
    }
    updateWidth()
    const ro = new ResizeObserver(updateWidth)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (loadFailed) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
        <p className="text-sm">Preview unavailable</p>
        <a
          href={pdfUrl}
          download={fileName}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
        >
          <DownloadSimple size={16} />
          Download {fileName}
        </a>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative flex-1 min-h-0">
      <div className="h-full overflow-auto bg-slate-100">
        {!loaded && (
          <div className="flex h-full min-h-[240px] items-center justify-center gap-3 text-slate-500">
            <CircleNotch className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading preview…</span>
          </div>
        )}
        {loaded && doc && pageWidth > 0 && (
          <div className="flex flex-col items-center gap-3 p-3">
            {Array.from({ length: doc.numPages }, (_, index) => (
              <PdfPageCanvas
                key={index + 1}
                doc={doc}
                pageNum={index + 1}
                width={pageWidth}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
