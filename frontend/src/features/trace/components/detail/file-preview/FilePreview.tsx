import { lazy, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowsInSimple,
  ArrowsOutSimple,
  CircleNotch,
  Code,
  DownloadSimple,
  File,
  Minus,
  Plus,
  Warning,
  X,
} from '@phosphor-icons/react'
import { apiClient } from '@/shared/lib/api-client'
import { cn } from '@/shared/lib/utils'
import { createLogger } from '@/shared/lib/logger'
import { traceFileUrl } from '@/features/trace/lib/file-resolver'

import {
  downloadFile,
  getFileExtension,
  getLanguageFromExtension,
  isCodeFile,
  isCsvFile,
  isDocxFile,
  isExcelFile,
  isHtmlFile,
  isImageFile,
  isJsonFile,
  isJsonlFile,
  isMarkdownFile,
  isPdfFile,
  isPythonFile,
  isSupportedPreview,
  isVideoFile,
  normalizeSvgText,
} from './file-utils'

// Renderers — lazy-loaded so the modal shell stays light.
const ImagePreview = lazy(() => import('./renderers/ImagePreview').then(m => ({ default: m.ImagePreview })))
const VideoPreview = lazy(() => import('./renderers/VideoPreview').then(m => ({ default: m.VideoPreview })))
const PdfPreview = lazy(() => import('./renderers/PdfPreview').then(m => ({ default: m.PdfPreview })))
const CsvPreview = lazy(() => import('./renderers/CsvPreview').then(m => ({ default: m.CsvPreview })))
const HtmlPreview = lazy(() => import('./renderers/HtmlPreview').then(m => ({ default: m.HtmlPreview })))
const MarkdownPreview = lazy(() => import('./renderers/MarkdownPreview').then(m => ({ default: m.MarkdownPreview })))
const CodePreview = lazy(() => import('./renderers/CodePreview').then(m => ({ default: m.CodePreview })))
const TextEditor = lazy(() => import('./renderers/TextEditor').then(m => ({ default: m.TextEditor })))
const JsonPreview = lazy(() => import('./renderers/JsonPreview').then(m => ({ default: m.JsonPreview })))
const JsonlPreview = lazy(() => import('./renderers/JsonlPreview').then(m => ({ default: m.JsonlPreview })))
const ExcelPreview = lazy(() => import('./renderers/ExcelPreview').then(m => ({ default: m.ExcelPreview })))
const DocxPreview = lazy(() => import('./renderers/DocxPreview').then(m => ({ default: m.DocxPreview })))
const ZoomableContainer = lazy(() => import('./renderers/ZoomableContainer').then(m => ({ default: m.ZoomableContainer })))

const log = createLogger({ file: 'FilePreview.tsx', component: 'FilePreview' })

type ViewMode = 'preview' | 'source'

interface FilePreviewFile {
  path: string
  name?: string
  type?: 'image' | 'video' | 'file'
}

export interface FilePreviewProps {
  traceId: string
  /** Required — files only make sense in the context of a specific run.
   * Parent gates rendering on `currentRunId` being non-null. */
  runId: string
  file: FilePreviewFile
  /** Render the file at this git commit (uses `?at=<commit>`). */
  commit?: string
  onClose: () => void
}

export function FilePreview({ traceId, runId, file, commit, onClose }: FilePreviewProps) {
  const { t } = useTranslation('trace')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const [imageUrl, setImageUrl] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [content, setContent] = useState('')
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null)
  const [htmlViewMode, setHtmlViewMode] = useState<ViewMode>('preview')
  const [markdownViewMode, setMarkdownViewMode] = useState<ViewMode>('preview')
  const [pythonViewMode, setPythonViewMode] = useState<ViewMode>('preview')
  const [jsonViewMode, setJsonViewMode] = useState<ViewMode>('preview')
  const [jsonlViewMode, setJsonlViewMode] = useState<ViewMode>('preview')

  const filePath = file.path
  const fileName = file.name || filePath.split('/').pop() || filePath
  const isImage = isImageFile(fileName)
  const isSvg = fileName.toLowerCase().endsWith('.svg')
  const isPdf = isPdfFile(fileName)
  const isVideo = isVideoFile(fileName)
  const isCsv = isCsvFile(fileName)
  const isHtml = isHtmlFile(fileName)
  const isMarkdown = isMarkdownFile(fileName)
  const isPython = isPythonFile(fileName)
  const isJson = isJsonFile(fileName)
  const isJsonl = isJsonlFile(fileName)
  const isExcel = isExcelFile(fileName)
  const isDocx = isDocxFile(fileName)
  const isCode = isCodeFile(fileName) && !isPython && !isJson
  const isSupported = isSupportedPreview(fileName)
  // SVG goes through the text path so we can <div dangerouslySetInnerHTML> it.
  const isBlobType = (isImage && !isSvg) || isPdf || isVideo
  const isBinaryType = isExcel || isDocx || !isSupported

  // The HTML preview wants to know the file's directory to resolve relative refs.
  const lastSlash = filePath.lastIndexOf('/')
  const basePath = lastSlash > 0 ? filePath.substring(0, lastSlash + 1) : ''

  // Track latest fetch to discard stale results.
  const fetchIdRef = useRef(0)
  // Track every blob URL we create so each fetch's cleanup can revoke them.
  // Without this we leak a URL on every file change (the previous `[]`-deps
  // effect only ran on unmount, with stale closure-captured values).
  const createdUrlsRef = useRef<string[]>([])
  const trackUrl = (u: string) => {
    createdUrlsRef.current.push(u)
    return u
  }

  useEffect(() => {
    const fetchId = ++fetchIdRef.current
    setLoading(true)
    setError(null)
    setImageUrl('')
    setDownloadUrl('')
    setContent('')
    setArrayBuffer(null)
    setZoom(100)

    const url = traceFileUrl({ traceId, runId, path: filePath, commit })

    const fetchFile = async () => {
      try {
        const { blob } = await apiClient.downloadBlob(url)
        if (fetchId !== fetchIdRef.current) return

        if (!blob || blob.size === 0) throw new Error(`File not found: ${filePath}`)

        if (isBlobType) {
          const basename = filePath.split('/').pop() || filePath
          const fileObj = new globalThis.File([blob], basename, { type: blob.type })
          const blobUrl = trackUrl(URL.createObjectURL(fileObj))
          setImageUrl(blobUrl)
          setDownloadUrl(blobUrl)
        } else if (isBinaryType) {
          const buf = await blob.arrayBuffer()
          if (fetchId !== fetchIdRef.current) return
          setArrayBuffer(buf)
          setDownloadUrl(trackUrl(URL.createObjectURL(blob)))
        } else {
          const textContent = await blob.text()
          if (fetchId !== fetchIdRef.current) return
          const normalized = isSvg ? normalizeSvgText(textContent) : textContent
          setContent(normalized)
          setDownloadUrl(
            trackUrl(URL.createObjectURL(new Blob([textContent], { type: 'text/plain;charset=utf-8' }))),
          )
        }
      } catch (err) {
        if (fetchId !== fetchIdRef.current) return
        const msg = err instanceof Error ? err.message : String(err)
        if (!msg.toLowerCase().includes('not found')) {
          log.error('Failed to load file', { path: filePath, error: msg })
        }
        setError(msg)
      } finally {
        if (fetchId === fetchIdRef.current) setLoading(false)
      }
    }

    void fetchFile()

    return () => {
      fetchIdRef.current++
      // Revoke every URL produced by this fetch. Deduped against subsequent
      // creates by mutating the ref in-place.
      const urls = createdUrlsRef.current
      createdUrlsRef.current = []
      for (const u of urls) URL.revokeObjectURL(u)
    }
  }, [traceId, runId, filePath, commit, isBlobType, isBinaryType, isSvg])

  // Esc closes the modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFullscreen, onClose])

  // -------------------------------------------------------------------------
  // View-mode toggles
  // -------------------------------------------------------------------------

  const viewModeItems = [
    isHtml && { key: 'html', value: htmlViewMode, setValue: setHtmlViewMode },
    isMarkdown && { key: 'md', value: markdownViewMode, setValue: setMarkdownViewMode },
    isPython && { key: 'py', value: pythonViewMode, setValue: setPythonViewMode },
    isJson && { key: 'json', value: jsonViewMode, setValue: setJsonViewMode },
    isJsonl && { key: 'jsonl', value: jsonlViewMode, setValue: setJsonlViewMode },
  ].filter(Boolean) as Array<{
    key: string
    value: ViewMode
    setValue: (v: ViewMode) => void
  }>

  const renderZoomControls = () => {
    if (!isImage) return null
    return (
      <div className="flex items-center justify-center my-4">
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-full px-4 py-2">
          <button
            onClick={() => setZoom((p) => Math.max(10, p - 25))}
            className="text-slate-500 hover:text-slate-700 p-1"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-700 min-w-[40px] text-center">{zoom}%</span>
          <button
            onClick={() => setZoom((p) => Math.min(400, p + 25))}
            className="text-slate-500 hover:text-slate-700 p-1"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Body
  // -------------------------------------------------------------------------

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-full py-8">
          <CircleNotch className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      )
    }

    if (error) {
      const isNotFound = error.toLowerCase().includes('not found')
      if (isNotFound) {
        return (
          <div className="flex flex-col items-center justify-center py-8 h-full gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <File className="w-6 h-6 text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-slate-700 font-medium">{t('filePreview.notGenerated', 'Not generated yet')}</p>
              <p className="text-slate-500 text-sm mt-1 max-w-[280px]">
                {t('filePreview.notGeneratedHint', 'This file will appear once the step runs.')}
              </p>
            </div>
          </div>
        )
      }
      return (
        <div className="flex flex-col items-center justify-center py-8 h-full gap-3">
          <Warning className="w-8 h-8 text-amber-500" />
          <p className="text-slate-600 text-sm">{t('filePreview.loadFailed', 'Failed to load file')}</p>
          <p className="text-slate-400 text-xs max-w-[300px] text-center">{error}</p>
        </div>
      )
    }

    if (isSvg && content) {
      return (
        <ZoomableContainer zoom={zoom} onZoomChange={setZoom}>
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </ZoomableContainer>
      )
    }

    if (isImage && imageUrl) {
      return <ImagePreview imageUrl={imageUrl} fileName={fileName} zoom={zoom} onZoomChange={setZoom} />
    }

    if (isVideo && imageUrl) return <VideoPreview videoUrl={imageUrl} />
    if (isPdf && imageUrl) return <PdfPreview pdfUrl={imageUrl} fileName={fileName} />
    if (isCsv && content) return <CsvPreview content={content} />

    if (isHtml && content && htmlViewMode === 'preview') {
      return <HtmlPreview content={content} fileName={fileName} traceId={traceId} runId={runId} basePath={basePath} commit={commit} />
    }

    if (isMarkdown && content && markdownViewMode === 'preview') {
      return (
        <MarkdownPreview
          content={content}
          traceId={traceId}
          runId={runId}
          basePath={basePath}
        />
      )
    }

    if (isPython && content && pythonViewMode === 'preview') {
      return <CodePreview content={content} language="python" />
    }

    if (isJson && content && jsonViewMode === 'preview') return <JsonPreview content={content} />
    if (isJsonl && content && jsonlViewMode === 'preview') return <JsonlPreview content={content} />

    if (isCode && content) {
      return <CodePreview content={content} language={getLanguageFromExtension(fileName)} />
    }

    if (isExcel && arrayBuffer) return <ExcelPreview arrayBuffer={arrayBuffer} />
    if (isDocx && arrayBuffer) return <DocxPreview arrayBuffer={arrayBuffer} />

    if (!isSupportedPreview(fileName)) {
      const ext = getFileExtension(fileName).replace('.', '').toUpperCase()
      return (
        <div className="flex flex-col items-center justify-center py-12 h-full gap-4">
          <Warning className="w-10 h-10 text-amber-500" />
          <div className="text-center">
            <p className="text-slate-700 font-medium">{t('filePreview.unsupported', 'Preview not available')}</p>
            <p className="text-slate-500 text-sm mt-1">{ext}</p>
          </div>
          <button
            onClick={() => downloadFile(fileName, downloadUrl || imageUrl)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            <DownloadSimple className="w-4 h-4" />
            {t('filePreview.download', 'Download')}
          </button>
        </div>
      )
    }

    return <TextEditor content={content} loading={loading} readOnly />
  }

  // -------------------------------------------------------------------------
  // Header
  // -------------------------------------------------------------------------

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-3 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-base font-semibold text-slate-900 truncate max-w-[440px]">
          {fileName}
        </span>
        {commit && (
          <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
            @ {commit.slice(0, 7)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {viewModeItems.map((it) => (
          <button
            key={it.key}
            onClick={() => it.setValue(it.value === 'preview' ? 'source' : 'preview')}
            title={it.value === 'source' ? t('filePreview.preview', 'Preview') : t('filePreview.source', 'Source')}
            className={cn(
              'p-1.5 rounded hover:bg-slate-100 transition-colors',
              it.value === 'source' ? 'text-emerald-600' : 'text-slate-700',
            )}
          >
            <Code className="w-4 h-4" />
          </button>
        ))}
        <button
          onClick={() => downloadFile(fileName, downloadUrl || imageUrl)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700"
        >
          <DownloadSimple className="w-3.5 h-3.5" />
          {t('filePreview.download', 'Download')}
        </button>
        <button
          onClick={() => setIsFullscreen((v) => !v)}
          className="p-1.5 rounded hover:bg-slate-100 transition-colors text-slate-700"
          title={isFullscreen ? t('filePreview.minimize', 'Minimize') : t('filePreview.expand', 'Expand')}
        >
          {isFullscreen ? <ArrowsInSimple className="w-4 h-4" /> : <ArrowsOutSimple className="w-4 h-4" />}
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-slate-100 transition-colors text-slate-700"
          title={t('filePreview.close', 'Close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  // -------------------------------------------------------------------------
  // Modal shell — plain fixed-position overlay (no Dialog primitive in shared/ui).
  // -------------------------------------------------------------------------

  const innerPanelClass = isFullscreen
    ? 'fixed inset-0 bg-white z-[60] flex flex-col p-6'
    : 'relative bg-white rounded-lg shadow-2xl w-[min(1100px,95vw)] h-[min(800px,90vh)] flex flex-col p-5'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={innerPanelClass}>
        {renderHeader()}
        <div className="flex-1 min-h-0 bg-slate-50 rounded-md overflow-hidden flex flex-col">
          {renderContent()}
        </div>
        {renderZoomControls()}
      </div>
    </div>
  )
}

