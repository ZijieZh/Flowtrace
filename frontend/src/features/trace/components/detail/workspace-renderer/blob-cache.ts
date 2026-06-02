/**
 * Global blob URL cache to prevent re-downloads across component remounts
 * Maps data hash to blob URL
 * Blob URLs are never revoked - browser will garbage collect on page close
 */
export const blobUrlCache = new Map<string, string>()

/**
 * Track in-flight downloads to prevent race conditions from React StrictMode double-mounting
 * Maps cache key to Promise (null = not found)
 */
export const pendingDownloads = new Map<string, Promise<string | null>>()
