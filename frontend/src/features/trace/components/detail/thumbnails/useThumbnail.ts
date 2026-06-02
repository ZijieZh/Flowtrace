
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/lib/api-client'
import { traceFileUrl, normalizeAssetPath } from '@/features/trace/lib/file-resolver'

const normalizeFilePath = normalizeAssetPath

/**
 * Fetch the file through `/api/files/...` and turn image bytes into a blob URL
 * for use as a thumbnail. Non-image content yields `null` (= "file exists, no
 * inline preview" — caller shows the fallback type icon). A 404 throws so the
 * caller can show a muted/broken-link icon.
 *
 * Backend has no separate thumbnail or list endpoint, so this just streams the
 * file. Acceptable for a demo; a real thumbnail service is a future concern.
 */
async function fetchThumbnail(
  traceId: string,
  runId: string,
  filePath: string,
  commit: string | undefined,
): Promise<string | null> {
  const url = traceFileUrl({ traceId, runId, path: filePath, commit })
  const { blob } = await apiClient.downloadBlob(url)
  if (blob.size === 0) throw new Error('Source file not found')
  if (blob.type.startsWith('image/')) {
    return URL.createObjectURL(blob)
  }
  return null
}

const IMAGE_EXTS = /\.(png|jpe?g|gif|webp|bmp|avif)$/i

export function useThumbnail(
  traceId: string | undefined,
  runId: string | undefined,
  fileName: string,
  filePath: string,
  streaming?: boolean,
  disabled?: boolean,
  /** Pinned commit SHA — see `TraceFileUrlInput.commit` in file-resolver.ts. */
  commit?: string,
) {
  const normalizedPath = normalizeFilePath(filePath)
  const isImage = IMAGE_EXTS.test(normalizedPath)

  // Non-image files never produce inline thumbnails. The earlier version
  // polled forever waiting for one — wasted full-file fetches every 15s.
  const query = useQuery({
    queryKey: ['thumbnail', traceId, runId, normalizedPath, commit],
    queryFn: () => fetchThumbnail(traceId!, runId!, filePath, commit),
    enabled: !!traceId && !!runId && !streaming && !disabled && isImage,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    throwOnError: false,
  })

  return {
    thumbnailUrl: isImage ? (query.data ?? null) : null,
    /** True when the file is known to exist (image fetch returned a blob, or
     *  the file isn't an image type and we skip the fetch entirely). */
    fileChecked: isImage ? query.isSuccess : true,
    isLoading: isImage && query.isLoading,
    isError: isImage && query.isError,
    refetch: query.refetch,
  }
}

