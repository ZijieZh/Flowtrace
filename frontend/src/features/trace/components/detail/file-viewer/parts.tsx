// Shared pieces used by both StepDocsDrawer and TraceDocsDrawer.
//
// File viewing is the same regardless of whether the file came from a step
// folder or the trace root, so the rendering primitives, helpers, and the
// drawer shell live here. The two drawer components just supply the data
// source, the title block, and the empty-state copy.

import { useMemo, useState, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import {
  DownloadSimple,
  FileText,
  FileCode,
  FileImage,
  FilePdf,
  FileCss,
  FileHtml,
  FileVideo,
  FileAudio,
  FileArchive,
  X,
  File as FileIcon,
} from '@phosphor-icons/react'
import {
  useStepFileContent,
  encodeFilePath,
  type StepFile,
} from '@/features/trace/api/trace-core'
import { getLanguageFromExtension, isCodeFile } from '@/features/trace/lib/file-utils'
import { resolveApiPath } from '@/shared/lib/api-url'

export const md = {
  h1: (p: any) => (
    <h1 className="mt-0 mb-3 text-lg font-semibold text-slate-900 tracking-tight" {...p} />
  ),
  h2: (p: any) => (
    <h2 className="mt-6 mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500" {...p} />
  ),
  h3: (p: any) => (
    <h3 className="mt-4 mb-2 text-sm font-semibold text-slate-900" {...p} />
  ),
  p: (p: any) => (
    <p className="my-2 text-sm leading-6 text-slate-700" {...p} />
  ),
  ul: (p: any) => (
    <ul className="my-2 ml-5 list-disc text-sm leading-6 text-slate-700 [&>li]:my-1" {...p} />
  ),
  ol: (p: any) => (
    <ol className="my-2 ml-5 list-decimal text-sm leading-6 text-slate-700 [&>li]:my-1" {...p} />
  ),
  strong: (p: any) => <strong className="font-semibold text-slate-900" {...p} />,
  em: (p: any) => <em className="italic" {...p} />,
  a: (p: any) => (
    <a className="text-emerald-700 underline underline-offset-2 hover:text-emerald-900" target="_blank" rel="noreferrer" {...p} />
  ),
  hr: () => <hr className="my-6 border-slate-200" />,
  blockquote: (p: any) => (
    <blockquote className="my-3 border-l-2 border-slate-300 pl-3 text-sm italic text-slate-600" {...p} />
  ),
  code: ({ inline, className, children, ...rest }: any) => {
    if (inline) {
      return (
        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-800" {...rest}>
          {children}
        </code>
      )
    }
    return (
      <code className={`font-mono text-[12px] ${className ?? ''}`} {...rest}>
        {children}
      </code>
    )
  },
  pre: (p: any) => (
    <pre className="my-3 overflow-x-auto rounded-md bg-slate-50 border border-slate-200 p-3 text-[12px] leading-5 text-slate-800" {...p} />
  ),
  table: (p: any) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]" {...p} />
    </div>
  ),
  thead: (p: any) => <thead className="border-b border-slate-300" {...p} />,
  th: (p: any) => (
    <th className="px-2 py-1.5 text-left font-semibold text-slate-700" {...p} />
  ),
  td: (p: any) => (
    <td className="border-b border-slate-100 px-2 py-1.5 align-top text-slate-700" {...p} />
  ),
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function iconFor(file: StepFile) {
  const mime = file.mime || ''
  if (mime.startsWith('image/')) return FileImage
  if (mime === 'application/pdf') return FilePdf
  if (mime.startsWith('video/')) return FileVideo
  if (mime.startsWith('audio/')) return FileAudio
  if (mime.includes('zip') || mime.includes('compress') || mime.includes('tar')) {
    return FileArchive
  }
  if (mime === 'text/css') return FileCss
  if (mime === 'text/html') return FileHtml
  if (file.name.toLowerCase().endsWith('.md')) return FileText
  if (isCodeFile(file.name)) return FileCode
  if (mime.startsWith('text/')) return FileText
  return FileIcon
}

/** A default-file selector for the drawer: the first file whose name matches
 *  one of `names` (case-insensitive), else the first file. Call once at module
 *  scope so the returned selector has a stable identity — `FilesDrawerShell`
 *  reads it inside a `useEffect` dependency array. */
export function pickByName(names: string[]) {
  const wanted = names.map((n) => n.toLowerCase())
  return (files: StepFile[]): StepFile | undefined => {
    for (const n of wanted) {
      const hit = files.find((f) => f.name.toLowerCase() === n)
      if (hit) return hit
    }
    return files[0]
  }
}

export function FileRow({
  file,
  active,
  onClick,
}: {
  file: StepFile
  active: boolean
  onClick: () => void
}) {
  const Icon = iconFor(file)
  const iconColor = active ? '#0f766e' : '#64748b'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-2.5 px-6 py-1.5 text-left transition-colors ${
        active
          ? 'bg-emerald-50/70 border-l-2 border-emerald-700 pl-[22px]'
          : 'border-l-2 border-transparent hover:bg-slate-50'
      }`}
    >
      <Icon size={16} weight={active ? 'fill' : 'regular'} color={iconColor} />
      <span
        className={`flex-1 truncate font-mono text-[13px] ${
          active ? 'text-slate-900 font-medium' : 'text-slate-700'
        }`}
      >
        {file.name}
      </span>
      <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
        {formatSize(file.size)}
      </span>
    </button>
  )
}

function DownloadFallback({ file }: { file: StepFile }) {
  return (
    <div className="flex flex-col items-start gap-3 py-4">
      <div className="text-sm text-slate-500">
        Binary file ({file.mime || 'unknown'}, {formatSize(file.size)}). Preview not available.
      </div>
      <a
        href={resolveApiPath(`/api/files/${encodeFilePath(file.path)}`)}
        download={file.name}
        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
      >
        <DownloadSimple size={14} />
        Download
      </a>
    </div>
  )
}

/** Strip YAML front-matter and parse a few useful fields (reads/writes/display_name). */
function stripFrontMatter(content: string): {
  meta: Record<string, string | string[]>
  body: string
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return { meta: {}, body: content }
  const meta: Record<string, string | string[]> = {}
  let currentListKey: string | null = null
  for (const raw of match[1].split(/\r?\n/)) {
    if (!raw.trim()) {
      currentListKey = null
      continue
    }
    if (/^\s+-\s+/.test(raw) && currentListKey) {
      const item = raw.replace(/^\s+-\s+/, '').trim().replace(/^["']|["']$/g, '')
      const arr = meta[currentListKey]
      if (Array.isArray(arr)) arr.push(item)
      continue
    }
    const colonIdx = raw.indexOf(':')
    if (colonIdx > 0) {
      const key = raw.slice(0, colonIdx).trim()
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
      const value = raw.slice(colonIdx + 1).trim()
      if (value === '') {
        meta[key] = []
        currentListKey = key
      } else {
        meta[key] = value.replace(/^["']|["']$/g, '')
        currentListKey = null
      }
    }
  }
  return { meta, body: content.slice(match[0].length) }
}

function FrontMatterBlock({ meta }: { meta: Record<string, string | string[]> }) {
  const reads = meta.reads
  const writes = meta.writes
  if (!reads && !writes) return null

  const row = (label: string, value: string | string[] | undefined) => {
    if (!value) return null
    const items = Array.isArray(value) ? value : [value]
    return (
      <div className="flex gap-2 text-[12px]">
        <span className="shrink-0 w-14 font-semibold text-slate-500 uppercase tracking-wider text-[10px] pt-[3px]">
          {label}
        </span>
        <div className="flex-1 min-w-0 space-y-0.5">
          {items.map((item, i) => (
            <code key={i} className="block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700 text-[11px] break-all">
              {item}
            </code>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-5 rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2.5 space-y-1.5">
      {row('Reads', reads)}
      {row('Writes', writes)}
    </div>
  )
}

function TextViewer({ file }: { file: StepFile }) {
  const { data: text, isLoading, isError, error } = useStepFileContent(file.path)
  const isMd = file.name.toLowerCase().endsWith('.md')
  const parsed = useMemo(
    () => (isMd && text ? stripFrontMatter(text) : null),
    [isMd, text],
  )

  if (isLoading) return <div className="text-sm text-slate-400">Loading…</div>
  if (isError) {
    return (
      <div className="text-sm text-red-600">
        Failed to load file: {(error as Error)?.message ?? 'unknown error'}
      </div>
    )
  }
  if (text == null) return null

  if (parsed) {
    return (
      <>
        <FrontMatterBlock meta={parsed.meta} />
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>
          {parsed.body}
        </ReactMarkdown>
      </>
    )
  }

  return (
    <div style={{ width: 'max-content', minWidth: '100%' }}>
      <SyntaxHighlighter
        language={getLanguageFromExtension(file.name)}
        style={oneLight}
        customStyle={{
          margin: 0,
          padding: '12px 14px',
          fontSize: 12,
          lineHeight: '18px',
          background: '#fafafa',
          borderRadius: 6,
          border: '1px solid #e2e8f0',
          overflow: 'visible',
        }}
        codeTagProps={{ style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } }}
      >
        {text}
      </SyntaxHighlighter>
    </div>
  )
}

export function FileViewer({ file }: { file: StepFile }) {
  const src = resolveApiPath(`/api/files/${encodeFilePath(file.path)}`)
  const mime = file.mime || ''

  if (mime.startsWith('image/')) {
    return (
      <div className="flex flex-col items-start gap-2">
        <img
          src={src}
          alt={file.name}
          className="max-w-full rounded border border-slate-200 bg-slate-50"
        />
        <div className="text-xs text-slate-400">{file.mime} · {formatSize(file.size)}</div>
      </div>
    )
  }

  if (mime === 'application/pdf') {
    return (
      <div className="flex flex-col gap-2">
        <iframe
          src={src}
          title={file.name}
          className="w-full rounded border border-slate-200 bg-white"
          style={{ height: '70vh', minHeight: 480 }}
        />
        <a
          href={src}
          download={file.name}
          className="self-start inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900"
        >
          <DownloadSimple size={12} /> Download PDF
        </a>
      </div>
    )
  }

  if (mime.startsWith('video/')) {
    return (
      <video
        src={src}
        controls
        className="max-w-full rounded border border-slate-200 bg-black"
      />
    )
  }

  if (mime.startsWith('audio/')) {
    return <audio src={src} controls className="w-full" />
  }

  if (file.kind === 'text') {
    return <TextViewer file={file} />
  }

  return <DownloadFallback file={file} />
}

interface FilesDrawerShellProps {
  onClose: () => void
  title: string
  subtitle?: string
  files: StepFile[] | undefined
  isLoading: boolean
  isError: boolean
  defaultSelector?: (files: StepFile[]) => StepFile | undefined
  fileListHeader: ReactNode
  emptyState: ReactNode
  errorMessage?: string
}

/** The drawer chrome: backdrop, slide-in aside, header, file list, viewer.
 *
 *  `files` is coerced through `Array.isArray` before any list operation so a
 *  non-array (e.g. an older `trace serve` falling back to SPA HTML on an
 *  unknown route) cannot crash the drawer with `.find is not a function`. */
export function FilesDrawerShell({
  onClose,
  title,
  subtitle,
  files,
  isLoading,
  isError,
  defaultSelector,
  fileListHeader,
  emptyState,
  errorMessage = 'Failed to load files.',
}: FilesDrawerShellProps) {
  const safeFiles = Array.isArray(files) ? files : undefined

  const [selectedName, setSelectedName] = useState<string | null>(null)
  useEffect(() => {
    if (selectedName != null) return
    if (!safeFiles || safeFiles.length === 0) return
    const picked = defaultSelector?.(safeFiles) ?? safeFiles[0]
    setSelectedName(picked?.name ?? null)
  }, [safeFiles, selectedName, defaultSelector])

  const selectedFile = useMemo(
    () => safeFiles?.find((f) => f.name === selectedName) ?? null,
    [safeFiles, selectedName],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50"
        aria-hidden
      />

      <aside
        role="dialog"
        aria-label={title}
        className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-[560px] bg-white shadow-xl flex flex-col"
      >
        <div className="px-6 pt-6 pb-3 border-b flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-lg font-semibold text-slate-900 truncate">{title}</div>
            {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 -mr-1 -mt-1 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            style={{ width: 28, height: 28 }}
          >
            <X size={18} />
          </button>
        </div>

        {safeFiles && safeFiles.length > 0 && (
          <div className="border-b">
            <div className="px-6 pt-3 pb-1 text-[11px] font-medium text-slate-500">
              {fileListHeader} <span className="text-slate-400">· {safeFiles.length}</span>
            </div>
            <div className="pb-2">
              {safeFiles.map((f) => (
                <FileRow
                  key={f.path}
                  file={f}
                  active={f.name === selectedName}
                  onClick={() => setSelectedName(f.name)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto px-6 py-5">
          {isLoading ? (
            <div className="text-sm text-slate-400">Loading…</div>
          ) : isError ? (
            <div className="text-sm text-red-600">{errorMessage}</div>
          ) : !safeFiles || safeFiles.length === 0 ? (
            emptyState
          ) : selectedFile ? (
            <FileViewer file={selectedFile} />
          ) : null}
        </div>
      </aside>
    </>,
    document.body,
  )
}
