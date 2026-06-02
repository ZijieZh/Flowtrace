
import React, { useState, useEffect } from 'react'
import { apiClient } from '@/shared/lib/api-client'
import { blobUrlCache, pendingDownloads } from './blob-cache'
import { traceFileUrl } from '@/features/trace/lib/file-resolver'

// Helper: sleep for ms
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/**
 * Workspace image component - checks existence and loads with auth
 * Used by ReactMarkdown to render workspace images in trace run output.
 *
 * Retries with backoff since S3 sync may be in progress
 */
export function WorkspaceImage({ filename, alt, traceId, runId, onImageClick, className, imgClassName, streaming, version, commit }: {
  filename: string
  alt?: string
  traceId?: string
  runId?: string
  onImageClick?: (filename: string, blobUrl?: string | null) => void
  className?: string   // Override container styling
  imgClassName?: string // Override img styling (for figures that need different constraints)
  /** When true, defers image fetching (file not in S3 yet during streaming) */
  streaming?: boolean
  /** Pin to specific file version (from evidence) */
  version?: number
  /** Optional commit SHA — when set, fetch the file at that commit (`?at=<sha>`),
   *  unlocking the backend's content-addressed immutable cache. */
  commit?: string
}) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (streaming) {
      return // Defer fetch — file not in S3 yet during streaming
    }

    if (!traceId) {
      setState('error')
      return
    }

    // Check global cache first (prevents re-downloads when component remounts)
    // Strip @ prefix from filename for cache key (@ is file reference marker)
    // Handle @file.png patterns
    const normalizedFilename = (filename.startsWith('@') ? filename.slice(1) : filename).replace(/\/@/g, '/')
    const cacheKey = version != null
      ? `${traceId}/${runId || 'no-project'}/${normalizedFilename}@v${version}`
      : `${traceId}/${runId || 'no-project'}/${normalizedFilename}`

    const cachedBlobUrl = blobUrlCache.get(cacheKey)

    if (cachedBlobUrl) {
      setBlobUrl(cachedBlobUrl)
      setState('loaded')
      return
    }

    // Check if there's already a download in progress for this image (prevents React StrictMode double-downloading)
    const existingDownload = pendingDownloads.get(cacheKey)
    if (existingDownload) {
      existingDownload.then((url) => {
        if (cancelled) return
        if (url) {
          setBlobUrl(url)
          setState('loaded')
        } else {
          setState('error')
        }
      })
      return
    }

    // Start new download with search fallback
    const downloadPromise = (async () => {
      void version
      if (!traceId || !runId) {
        return null
      }
      const finalUrl = traceFileUrl({ traceId, runId, path: filename, commit })

      // Retry with backoff for ALL paths (S3 sync may be in progress)
      const maxRetries = 4
      const retryDelays = [1000, 2000, 3000]   // 1s, 2s, 3s between retries

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const { blob } = await apiClient.downloadBlob(finalUrl)

          // 204 No Content = file not found (empty blob)
          if (blob.size === 0) {
            // Retry if not found yet (file may be syncing to S3)
            if (attempt < maxRetries - 1) {
              await sleep(retryDelays[attempt] || 3000)
              continue
            }
            return null
          }

          const url = URL.createObjectURL(blob)

          // Store in global cache (never revoke - browser will GC on page close)
          blobUrlCache.set(cacheKey, url)

          return url
        } catch (error: any) {
          // Retry on error (S3 sync may be in progress)
          if (attempt < maxRetries - 1) {
            await sleep(retryDelays[attempt] || 3000)
            continue
          }
          // Network error or other failure - return null (UI will hide)
          return null
        }
      }

      return null
    })()

    // Remove from pending downloads when done
    downloadPromise.finally(() => {
      pendingDownloads.delete(cacheKey)
    })

    // Store promise to prevent duplicate downloads
    pendingDownloads.set(cacheKey, downloadPromise)

    // Wait for download to complete
    downloadPromise.then((url) => {
      if (cancelled) return // Stale — version changed, don't overwrite
      if (url) {
        setBlobUrl(url)
        setState('loaded')
      } else {
        setState('error')
      }
    })

    return () => { cancelled = true }
  }, [filename, traceId, runId, streaming, version])

  if (state === 'loading') {
    // Use span-based layout to avoid div-inside-p hydration error in markdown
    return (
      <span className="inline-flex my-4 p-4 border border-slate-200 rounded-lg bg-slate-50 animate-pulse">
        <span className="flex items-center gap-3">
          <span className="inline-block w-8 h-8 bg-slate-300 rounded" />
          <span className="inline-flex flex-col">
            <span className="inline-block h-4 bg-slate-300 rounded w-32 mb-2" />
            <span className="inline-block h-3 bg-slate-300 rounded w-48" />
          </span>
        </span>
      </span>
    )
  }

  if (state === 'error') {
    // Hide completely if image not found (file may have been moved/renamed)
    return null
  }

  // Loaded successfully - show image with click to enlarge
  // Use span wrapper to avoid div-inside-p hydration error in markdown
  return (
    <span
      className={className || "inline-block my-4 cursor-pointer group relative max-w-[min(60%,480px)]"}
      onClick={() => {
        onImageClick?.(filename, blobUrl)
      }}
    >
      <img
        src={blobUrl || ''}
        alt={alt || filename}
        className={imgClassName || "rounded-lg max-w-full max-h-[300px] h-auto border border-slate-200 transition-opacity group-hover:opacity-90"}
        loading="lazy"
      />
    </span>
  )
}
