import React, { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/shared/lib/api-client'
import { traceFileUrl } from '@/features/trace/lib/file-resolver'

interface HtmlPreviewProps {
  content: string
  fileName: string
  traceId?: string
  runId?: string
  /** Directory of the HTML file (run-relative). Used to resolve relative refs. */
  basePath?: string
  /** Optional commit SHA — when set, nested asset refs resolve to `?at=<commit>`,
   *  making them content-addressed and cacheable. Threaded from FilePreview. */
  commit?: string
}

function isRelativePath(url: string): boolean {
  if (!url) return false
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('#') || url.startsWith('javascript:')) return false
  return true
}

/** Remove CDN/proxy injections (Cloudflare Rocket Loader, etc.). */
function stripProxyInjections(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  doc.querySelectorAll('script[src*="cdn-cgi"], script[src*="rocket-loader"]').forEach(el => el.remove())

  doc.querySelectorAll('script[type]').forEach(el => {
    const type = el.getAttribute('type') || ''
    if (type.includes('text/javascript') && type !== 'text/javascript') {
      el.setAttribute('type', 'text/javascript')
    }
  })

  doc.querySelectorAll('[onclick]').forEach(el => {
    const onclick = el.getAttribute('onclick') || ''
    if (onclick.includes('__cfRLUnblockHandlers')) {
      const match = onclick.match(/return\s+false;\s*(.+)$/)
      if (match) el.setAttribute('onclick', match[1])
    }
  })

  doc.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes)
      .filter(attr => attr.name.startsWith('data-cf-'))
      .forEach(attr => el.removeAttribute(attr.name))
  })

  return doc.documentElement.outerHTML
}

function collectRelativeUrls(html: string): string[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const urls = new Set<string>()

  doc.querySelectorAll('img[src], video[src], source[src], audio[src]').forEach(el => {
    const src = el.getAttribute('src') || ''
    if (isRelativePath(src)) urls.add(src)
  })
  doc.querySelectorAll('a[href]').forEach(el => {
    const href = el.getAttribute('href') || ''
    if (isRelativePath(href)) urls.add(href)
  })
  doc.querySelectorAll('link[href]').forEach(el => {
    const href = el.getAttribute('href') || ''
    if (isRelativePath(href)) urls.add(href)
  })

  return Array.from(urls)
}

function replaceUrlsInHtml(html: string, urlMap: Map<string, string>): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const replaceAttr = (selector: string, attr: string) => {
    doc.querySelectorAll(selector).forEach(el => {
      const val = el.getAttribute(attr) || ''
      const dataUri = urlMap.get(val)
      if (dataUri) el.setAttribute(attr, dataUri)
    })
  }

  replaceAttr('img[src]', 'src')
  replaceAttr('video[src]', 'src')
  replaceAttr('source[src]', 'src')
  replaceAttr('audio[src]', 'src')
  replaceAttr('a[href]', 'href')
  replaceAttr('link[href]', 'href')

  return doc.documentElement.outerHTML
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function fetchAsDataUri(
  relativePath: string,
  traceId: string,
  runId: string,
  basePath: string | undefined,
  commit: string | undefined,
): Promise<string | null> {
  // basePath is the HTML file's own directory (run-relative). Resolve nested
  // refs against it; absolute (run-relative) refs are used as-is.
  const path = relativePath.startsWith('/') ? relativePath.slice(1) :
    (basePath ? `${basePath.replace(/\/$/, '')}/${relativePath}` : relativePath)
  const url = traceFileUrl({ traceId, runId, path, commit })
  try {
    const { blob } = await apiClient.downloadBlob(url)
    if (blob.size > 0) return await blobToDataUri(blob)
  } catch {
    // missing assets are OK — original src stays in place.
  }
  return null
}

export function HtmlPreview({ content, fileName, traceId, runId, basePath, commit }: HtmlPreviewProps) {
  const cleanContent = useMemo(() => stripProxyInjections(content), [content])
  const [resolvedHtml, setResolvedHtml] = useState<string>(cleanContent)

  useEffect(() => {
    if (!traceId || !runId) {
      setResolvedHtml(cleanContent)
      return
    }

    let cancelled = false
    const resolve = async () => {
      const relativeUrls = collectRelativeUrls(cleanContent)
      if (relativeUrls.length === 0) {
        setResolvedHtml(cleanContent)
        return
      }

      const entries = await Promise.all(
        relativeUrls.map(async (url) => {
          const dataUri = await fetchAsDataUri(url, traceId, runId, basePath, commit)
          return [url, dataUri] as const
        })
      )
      if (cancelled) return

      const urlMap = new Map<string, string>()
      for (const [originalUrl, dataUri] of entries) {
        if (dataUri) urlMap.set(originalUrl, dataUri)
      }
      setResolvedHtml(urlMap.size > 0 ? replaceUrlsInHtml(cleanContent, urlMap) : cleanContent)
    }

    void resolve()
    return () => { cancelled = true }
  }, [cleanContent, traceId, runId, basePath, commit])

  return (
    <div className="flex-1 border rounded-md overflow-hidden bg-white">
      <iframe
        srcDoc={resolvedHtml}
        className="w-full h-full border-0"
        title={fileName}
        sandbox="allow-scripts allow-forms allow-downloads"
      />
    </div>
  )
}
