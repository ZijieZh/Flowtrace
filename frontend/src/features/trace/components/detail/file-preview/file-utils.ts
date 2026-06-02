// File-type detectors are owned by `lib/file-utils`; re-export them so the
// preview shell + its renderers can import everything from one module.
export {
  isImageFile,
  isVideoFile,
  isPdfFile,
  isCsvFile,
  isHtmlFile,
  isMarkdownFile,
  isJsonFile,
  isJsonlFile,
  isExcelFile,
  isDocxFile,
  isPythonFile,
  isCodeFile,
  isSupportedPreview,
  getLanguageFromExtension,
  getFileExtension,
} from '../../../lib/file-utils'

/** Save bytes already attached to a blob URL via an `<a download>` trick. */
export function downloadFile(fileName: string, downloadUrl?: string) {
  if (!downloadUrl) return
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  setTimeout(() => {
    document.body.removeChild(link)
  }, 100)
}

/** Minimal CSV parser — quoted cells only, no escape sequences. */
export function parseCSV(content: string): string[][] {
  const lines = (content || '').split('\n').filter((l) => l.trim())
  const result: string[][] = []
  for (const line of lines) {
    const row: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') inQuotes = !inQuotes
      else if (ch === ',' && !inQuotes) {
        row.push(cur.trim())
        cur = ''
      } else cur += ch
    }
    row.push(cur.trim())
    result.push(row)
  }
  return result
}

/**
 * Force an SVG's `<svg>` element to match its viewBox dimensions in pixels —
 * keeps it visible inside flex containers that would otherwise collapse it.
 */
export function normalizeSvgText(svgText: string) {
  const vbMatch = svgText.match(
    /viewBox\s*=\s*["']\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([-\d.]+)[\s,]+([-\d.]+)\s*["']/i,
  )
  if (!vbMatch) return svgText
  const w = Number(vbMatch[3])
  const h = Number(vbMatch[4])
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return svgText

  const hasWidthAttr = /<svg\b[^>]*\swidth\s*=/.test(svgText)
  const hasHeightAttr = /<svg\b[^>]*\sheight\s*=/.test(svgText)

  let out = svgText
  out = hasWidthAttr
    ? out.replace(/(<svg\b[^>]*?)\swidth\s*=\s*["'][^"']*["']/i, `$1 width="${w}"`)
    : out.replace(/<svg\b/i, `<svg width="${w}"`)
  out = hasHeightAttr
    ? out.replace(/(<svg\b[^>]*?)\sheight\s*=\s*["'][^"']*["']/i, `$1 height="${h}"`)
    : out.replace(/<svg\b/i, `<svg height="${h}"`)
  out = out.replace(/(<svg\b[^>]*?)\sstyle\s*=\s*["']([^"']*)["']/i, (_m, head, style) => {
    const next = (style as string)
      .replace(/width\s*:\s*[^;]+;?/i, `width:${w}px;`)
      .replace(/height\s*:\s*[^;]+;?/i, `height:${h}px;`)
    return `${head} style="${next}"`
  })
  return out
}
