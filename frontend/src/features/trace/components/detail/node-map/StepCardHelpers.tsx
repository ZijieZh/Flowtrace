import { FolderOpen } from '@phosphor-icons/react'
import { cn } from '@/shared/lib/utils'
import { FileThumbnail, useThumbnail } from '../thumbnails'
import { getExt } from '@/features/trace/lib/file-utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

// ============================================================================
// Asset path helpers
// ============================================================================

/** Check if an asset path represents a folder (trailing slash or no file extension) */
export function isFolder(asset: string): boolean {
  if (asset.endsWith('/')) return true
  const lastSegment = asset.split('/').pop() || ''
  return !lastSegment.includes('.')
}

/** Get display name for an asset (folder or file) */
export function getAssetDisplayName(asset: string): string {
  if (isFolder(asset)) {
    const trimmed = asset.slice(0, -1)
    return trimmed.split('/').pop() || trimmed
  }
  return asset.split('/').pop() || asset
}

export function generateOutputTitle(assets: string[], t: (key: string, values?: Record<string, any>) => string): string {
  if (!assets || assets.length === 0) return t('nodeMap.stepCard.output')

  const categories: Record<string, number> = {}

  for (const file of assets) {
    if (isFolder(file)) {
      categories['folder'] = (categories['folder'] || 0) + 1
      continue
    }

    const ext = getExt(file)

    let category: string
    if (['pptx', 'ppt', 'key', 'odp'].includes(ext)) {
      category = 'slideshow'
    } else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
      category = 'graph'
    } else if (['pdf'].includes(ext)) {
      category = 'pdf'
    } else if (['csv', 'xlsx', 'xls'].includes(ext)) {
      category = 'spreadsheet'
    } else if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
      category = 'video'
    } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
      category = 'audio'
    } else if (['json', 'xml', 'yaml', 'yml'].includes(ext)) {
      category = 'data'
    } else if (['txt', 'md', 'doc', 'docx'].includes(ext)) {
      category = 'document'
    } else {
      category = 'file'
    }

    categories[category] = (categories[category] || 0) + 1
  }

  const parts: string[] = []
  for (const [cat, count] of Object.entries(categories)) {
    parts.push(
      count === 1
        ? t(`nodeMap.stepCard.assetCategory.${cat}`)
        : t('nodeMap.stepCard.assetCategoryCount', {
            count,
            category: t(`nodeMap.stepCard.assetCategoryPlural.${cat}`),
          })
    )
  }

  return parts.join(' & ')
}

// ============================================================================
// OutputThumbnailCard — thumbnail card with file-existence blue glow
// ============================================================================

export function OutputThumbnailCard({
  fileName,
  filePath,
  traceId,
  runId,
  commit,
  idx,
  generated = true,
  onAssetClick,
}: {
  fileName: string
  filePath: string
  traceId?: string
  runId?: string
  /** Pinned commit SHA — pins the fetch to a content-addressed URL so the
   *  backend can serve with `Cache-Control: immutable`. */
  commit?: string
  idx: number
  /** False when the file is declared in trace.json but not committed in git
   *  at `commit`. Renders muted: no blue glow, no fetch, no click. */
  generated?: boolean
  onAssetClick?: (fileName: string, filePath: string) => void
}) {
  const folder = isFolder(filePath)
  // Don't HEAD-probe a file that doesn't exist.
  const { fileChecked } = useThumbnail(traceId, runId, fileName, filePath, false, folder || !generated, commit)
  const hasBlueGlow = generated && !folder && fileChecked && !fileName.toLowerCase().endsWith('.svg')

  return (
    <Tooltip disableHoverableContent>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'absolute rounded-[4px] bg-white',
            generated
              ? 'cursor-pointer hover:ring-2 hover:ring-slate-900'
              : 'cursor-default opacity-60',
            hasBlueGlow && 'border-[1.5px] border-[#7DADDA] shadow-[0px_4px_6px_0px_#7DADDA66]',
          )}
          style={{ width: 48, height: 48, top: -6, left: 7 + idx * 51 }}
          onClick={(e) => {
            e.stopPropagation()
            if (generated) onAssetClick?.(fileName, filePath)
          }}
        >
          <div className="p-1 w-full h-full bg-slate-200 rounded-[3px] overflow-hidden flex items-center justify-center">
            {folder ? (
              <FolderOpen weight="fill" className="w-6 h-6 text-slate-500" />
            ) : (
              <FileThumbnail
                fileName={fileName}
                filePath={filePath}
                traceId={traceId}
                runId={runId}
                commit={commit}
                size="lg"
                />
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        <span className="max-w-[220px] truncate block">
          {generated ? fileName : `${fileName} (not generated yet)`}
        </span>
      </TooltipContent>
    </Tooltip>
  )
}
