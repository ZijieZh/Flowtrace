
import React, { useState, useEffect, useRef } from 'react'
import { ImageBroken } from '@phosphor-icons/react'
import { apiClient } from '@/shared/lib/api-client'
import { blobUrlCache, pendingDownloads } from './blob-cache'
import { TYPOGRAPHY } from '@/shared/styles'

/**
 * Workspace video component - checks existence, loads with auth, shows thumbnail with play button
 * Used by ReactMarkdown to render workspace videos in trace run output.
 * Clicks open FileViewerDialog (same as WorkspaceImage)
 */
export function WorkspaceVideo({ filename, traceId, runId, onVideoClick, executionId, version }: {
  filename: string
  traceId?: string
  runId?: string
  onVideoClick?: (filename: string, blobUrl?: string | null) => void
  executionId?: string  // Unique ID per tool execution for cache busting
  version?: number      // Pin to specific version (evidence snapshot)
}) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Download video with auth (same pattern as WorkspaceImage)
  useEffect(() => {
    if (!traceId) {
      setState('error')
      return
    }

    // Strip @ prefix from filename for cache key (@ is file reference marker)
    // Handle @file.png patterns
    const normalizedFilename = (filename.startsWith('@') ? filename.slice(1) : filename).replace(/\/@/g, '/')
    // Cache key includes version or executionId for isolation
    const cacheKey = version != null
      ? `${traceId}/${runId || 'no-project'}/${normalizedFilename}@v${version}`
      : executionId
        ? `${traceId}/${runId || 'no-project'}/${normalizedFilename}?exec=${executionId}`
        : `${traceId}/${runId || 'no-project'}/${normalizedFilename}`

    const cachedBlobUrl = blobUrlCache.get(cacheKey)

    if (cachedBlobUrl) {
      setBlobUrl(cachedBlobUrl)
      setState('loaded')
      return
    }

    const existingDownload = pendingDownloads.get(cacheKey)
    if (existingDownload) {
      existingDownload.then((url) => {
        setBlobUrl(url)
        setState('loaded')
      }).catch(() => setState('error'))
      return
    }

    const downloadPromise = (async () => {
      try {
        let cleanFilename = filename.startsWith('/workspace/')
          ? filename.slice('/workspace/'.length)
          : filename.startsWith('workspace/')
          ? filename.slice('workspace/'.length)
          : filename
        // Strip @ prefix if present (file references use @ as marker)
        // Handle @file.png patterns
        if (cleanFilename.startsWith('@')) {
          cleanFilename = cleanFilename.slice(1)
        }
        cleanFilename = cleanFilename.replace(/\/@/g, '/')

        // Single endpoint: ?version=N for pinned evidence
        const params = new URLSearchParams()
        if (runId) params.set('run_id', runId)
        if (version != null) params.set('version', String(version))
        const finalUrl = `/v1/agents/${traceId}/storage/files/${cleanFilename}?${params}`

        const { blob } = await apiClient.downloadBlob(finalUrl)
        const url = URL.createObjectURL(blob)

        blobUrlCache.set(cacheKey, url)
        return url
      } catch (error) {
        console.error('Failed to load workspace video:', error)
        throw error
      } finally {
        pendingDownloads.delete(cacheKey)
      }
    })()

    pendingDownloads.set(cacheKey, downloadPromise)
    downloadPromise.then((url) => {
      setBlobUrl(url)
      setState('loaded')
    }).catch(() => setState('error'))
  }, [filename, traceId, runId, executionId, version])

  // Capture first frame as thumbnail (same as VideoBlockRenderer)
  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !blobUrl || state !== 'loaded') {
      return
    }

    const captureFrame = () => {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/png')
        setThumbnailUrl(dataUrl)
      }
    }

    const handleLoadedMetadata = () => {
      video.currentTime = 0.5
    }

    const handleSeeked = () => {
      captureFrame()
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('seeked', handleSeeked)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('seeked', handleSeeked)
    }
  }, [blobUrl, state])

  if (state === 'loading') {
    return (
      <div className="my-4 p-4 border border-slate-200 rounded-lg bg-slate-50 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-300 rounded" />
          <div className="flex-1">
            <div className="h-4 bg-slate-300 rounded w-32 mb-2" />
            <div className="h-3 bg-slate-300 rounded w-48" />
          </div>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="my-4 p-4 border border-amber-200 rounded-lg bg-amber-50">
        <div className="flex items-center gap-3">
          <ImageBroken className="w-8 h-8 text-amber-600" />
          <div>
            <p className={`${TYPOGRAPHY.secondarySize} font-medium text-amber-900`}>Video not available</p>
            <p className={`${TYPOGRAPHY.labelSize} text-amber-700`}>{filename}</p>
            <p className={`${TYPOGRAPHY.labelSize} text-amber-600 mt-1`}>
              File may have been removed
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Loaded successfully - show thumbnail with play button
  return (
    <>
      {/* Hidden video for frame capture */}
      <video
        ref={videoRef}
        src={blobUrl || ''}
        muted
        style={{ position: 'fixed', top: 0, left: 0, width: '1px', height: '1px', opacity: 0, pointerEvents: 'none', zIndex: -1 }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Thumbnail with play button - click to open FileViewerDialog */}
      <div
        className="my-4 cursor-pointer group relative"
        onClick={() => onVideoClick?.(filename, blobUrl)}
      >
        {thumbnailUrl ? (
          <>
            <img
              src={thumbnailUrl}
              alt={filename}
              className="rounded-lg max-w-full h-auto border border-slate-200 transition-opacity group-hover:opacity-90"
            />
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/60 rounded-full p-4 transition-transform group-hover:scale-110">
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-slate-900 rounded-lg flex items-center justify-center min-h-[200px] border border-slate-200">
            <div className="text-center">
              <svg className="w-16 h-16 text-slate-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <span className={`${TYPOGRAPHY.secondarySize} text-slate-400`}>Loading...</span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
