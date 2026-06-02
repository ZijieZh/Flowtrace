import { useEffect } from 'react'

/** A user clicked a file/asset somewhere; preview overlay should open. */
const FILE_CLICK_EVENT = 'trace:file-click'

/** A user clicked a step's outputs-folder; run-history modal should open. */
const RUN_HISTORY_EVENT = 'trace:open-run-history'

export interface FileClickEventData {
  /** Run-relative path (e.g. `<step_id>/file.png`). */
  path: string
  name?: string
  type?: 'image' | 'video' | 'file'
  /** Pre-loaded blob URL if the caller already has it. */
  url?: string
  /**
   * SHA of the git commit to render this file at. When present, fetches
   * append `?at=<commit>` and the backend serves historical bytes via libgit2.
   */
  commit?: string
  /** Inline (no on-disk) content, e.g. appendix markdown or rendered SVG. */
  inlineContent?: {
    content: string
    contentType: 'markdown' | 'svg'
  }
}

export interface RunHistoryEventData {
  /** Step the user clicked into; modal opens scoped to this step. */
  stepId: string
  /** Display name for the modal header. */
  stepName: string
  timestamp?: number
}

export function emitFileClick(data: FileClickEventData) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(FILE_CLICK_EVENT, {
      detail: {
        ...data,
        name: data.name || data.path.split('/').pop() || data.path,
      },
    }),
  )
}

export function emitOpenRunHistory(stepId: string, stepName: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(RUN_HISTORY_EVENT, {
      detail: { stepId, stepName, timestamp: Date.now() } as RunHistoryEventData,
    }),
  )
}

export function useFileClickListener(callback: (data: FileClickEventData) => void) {
  useEffect(() => {
    const handler = (event: Event) => callback((event as CustomEvent<FileClickEventData>).detail)
    window.addEventListener(FILE_CLICK_EVENT, handler)
    return () => window.removeEventListener(FILE_CLICK_EVENT, handler)
  }, [callback])
}

export function useRunHistoryListener(callback: (data: RunHistoryEventData) => void) {
  useEffect(() => {
    const handler = (event: Event) =>
      callback((event as CustomEvent<RunHistoryEventData>).detail || ({} as RunHistoryEventData))
    window.addEventListener(RUN_HISTORY_EVENT, handler)
    return () => window.removeEventListener(RUN_HISTORY_EVENT, handler)
  }, [callback])
}
