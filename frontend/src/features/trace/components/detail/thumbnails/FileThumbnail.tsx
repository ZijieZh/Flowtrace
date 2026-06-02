import { useState } from 'react'
import {
  File,
  FilePdf,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FileJs,
  FileCss,
  FileHtml,
  FileCsv,
  FileDoc,
  FileXls,
  FilePpt,
  FileZip,
  FileText,
  Database,
  Quotes,
} from '@phosphor-icons/react'

import { useThumbnail } from './useThumbnail'
import { getExt } from '@/features/trace/lib/file-utils'

type IconComponent = typeof File

const HEAVY_ICONS: Set<IconComponent> = new Set([Database, Quotes])

const OPTICAL_SHRINK = 0.78

/** Render size for `Icon` aimed at the same visual mass as a File-family icon
 *  at `targetSize`. Heavy icons get shrunk; everything else passes through. */
export function opticalSize(Icon: IconComponent, targetSize: number): number {
  return HEAVY_ICONS.has(Icon) ? Math.round(targetSize * OPTICAL_SHRINK) : targetSize
}

const EXT_TO_ICON: Record<string, IconComponent> = {
  pdf: FilePdf,
  doc: FileDoc,
  docx: FileDoc,
  txt: FileText,
  md: FileText,
  xls: FileXls,
  xlsx: FileXls,
  csv: FileCsv,
  tsv: FileCsv,
  ppt: FilePpt,
  pptx: FilePpt,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
  webp: FileImage,
  svg: FileImage,
  bmp: FileImage,
  ico: FileImage,
  avif: FileImage,
  mp4: FileVideo,
  mov: FileVideo,
  avi: FileVideo,
  webm: FileVideo,
  mp3: FileAudio,
  wav: FileAudio,
  ogg: FileAudio,
  m4a: FileAudio,
  js: FileJs,
  jsx: FileJs,
  ts: FileJs,
  tsx: FileJs,
  css: FileCss,
  scss: FileCss,
  less: FileCss,
  html: FileHtml,
  py: FileCode,
  r: FileCode,
  java: FileCode,
  c: FileCode,
  cpp: FileCode,
  go: FileCode,
  rs: FileCode,
  json: Database,
  jsonl: Database,
  ndjson: Database,
  xml: Database,
  yaml: Database,
  yml: Database,
  toml: Database,
  zip: FileZip,
  tar: FileZip,
  gz: FileZip,
  rar: FileZip,
}

function getFileIcon(fileName: string, iconSize: number) {
  const Icon = EXT_TO_ICON[getExt(fileName)] ?? File
  return <Icon weight="fill" size={opticalSize(Icon, iconSize)} className="text-slate-700" />
}

interface FileThumbnailProps {
  fileName: string
  filePath: string
  traceId?: string
  runId?: string
  /** Size variant: 'sm' (20×20), 'md' (40×40), or 'lg' (48×48). */
  size?: 'sm' | 'md' | 'lg'
  /** Pins fetch to a specific commit SHA — enables immutable backend cache. */
  commit?: string
}

const SIZE_CLASSES = {
  sm: 'w-5 h-5',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
}

const ICON_SIZES = {
  sm: 12,
  md: 20,
  lg: 24,
}

export function FileThumbnail({
  fileName,
  filePath,
  traceId,
  runId,
  size = 'lg',
  commit,
}: FileThumbnailProps) {
  const [imageError, setImageError] = useState(false)
  const { thumbnailUrl } = useThumbnail(traceId, runId, fileName, filePath, false, false, commit)
  const showImage = thumbnailUrl && !imageError

  return (
    <div
      className={`${SIZE_CLASSES[size]} rounded overflow-hidden shrink-0 border border-slate-200 bg-white flex items-center justify-center`}
    >
      {showImage ? (
        <img
          src={thumbnailUrl}
          alt={fileName}
          className="w-full h-full object-contain"
          onError={() => setImageError(true)}
        />
      ) : (
        getFileIcon(fileName, ICON_SIZES[size])
      )}
    </div>
  )
}
