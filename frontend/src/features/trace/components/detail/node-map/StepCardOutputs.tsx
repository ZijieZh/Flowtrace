import { useMemo, type CSSProperties } from 'react'
import { FolderOpen } from '@phosphor-icons/react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { FileThumbnail } from '../thumbnails'
import { LAYOUT, COLORS } from './types'
import {
  OutputThumbnailCard,
  isFolder,
  getAssetDisplayName,
  generateOutputTitle,
} from './StepCardHelpers'
import {
  emitFileClick,
  emitOpenRunHistory,
} from '@/features/trace/lib/file-preview-bus'

/** One slot in the deliverable's stacked-fan or 1/2-asset arrangement.
 *  Renders either a folder icon or a FileThumbnail, wrapped in a tooltip
 *  that shows the display name. Caller picks the wrapper className + style
 *  for positioning / rotation / shadow. */
function StackedThumb({
  asset,
  className,
  style,
  traceId,
  runId,
  onClick,
}: {
  asset: string
  className: string
  style: CSSProperties
  traceId?: string
  runId?: string
  onClick: () => void
}) {
  const name = getAssetDisplayName(asset)
  return (
    <Tooltip disableHoverableContent>
      <TooltipTrigger asChild>
        <div
          className={className}
          style={style}
          onClick={(e) => { e.stopPropagation(); onClick() }}
        >
          {isFolder(asset) ? (
            <FolderOpen weight="fill" className="w-5 h-5 text-slate-500" />
          ) : (
            <div className="w-full h-full [&>*]:w-full [&>*]:h-full">
              <FileThumbnail fileName={name} filePath={asset} traceId={traceId} runId={runId} size="lg" />
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        <span className="max-w-[220px] truncate block">{name}</span>
      </TooltipContent>
    </Tooltip>
  )
}

const FAN_SHELL = 'rounded-[4px] bg-slate-200 overflow-hidden cursor-pointer border-2 border-transparent hover:border-slate-900 flex items-center justify-center'

interface StepCardOutputsProps {
  isDeliverable: boolean
  stepAssets: string[]
  /** Subset of stepAssets that git confirms is committed at the current commit.
   *  Not-included slots render as "not generated yet" placeholders (not clickable). */
  stepGenerated: string[]
  hasOutputs: boolean
  description?: string
  assetTitle?: string
  hidePendingOutputStatus: boolean
  runLabel: string
  traceId?: string
  runId?: string
  /** Pinned commit SHA — threaded into thumbnail URLs for immutable caching. */
  commit?: string
  /** Step id + name used to route the outputs-folder click → RunHistoryModal. */
  stepId?: string
  stepName?: string
  t: (key: string, values?: Record<string, any>) => string
}

export function StepCardOutputs({
  isDeliverable,
  stepAssets,
  stepGenerated,
  hasOutputs,
  description,
  assetTitle,
  hidePendingOutputStatus,
  runLabel,
  traceId,
  runId,
  commit,
  stepId,
  stepName,
  t,
}: StepCardOutputsProps) {
  const generatedSet = useMemo(() => new Set(stepGenerated), [stepGenerated])
  // Click an asset thumbnail → emit file-preview event. Asset paths from
  // state.json are step-relative; join under step id so the resolver gets a
  // run-relative path (`<step_id>/<file>`).
  const handleAsset = (_fileName: string, assetPath: string) => {
    const fullPath = stepId && !assetPath.includes('/') ? `${stepId}/${assetPath}` : assetPath
    emitFileClick({ path: fullPath, name: assetPath.split('/').pop() || assetPath })
  }
  // Click the outputs-folder card → open RunHistoryModal scoped to this step.
  const handleOutputs = () => {
    if (stepId) emitOpenRunHistory(stepId, stepName || stepId)
  }
  const hasAssets = stepAssets && stepAssets.length > 0
  if (!hasAssets && !hasOutputs) return null

  /* ── Deliverable: stacked fan + view button ── */
  if (isDeliverable && hasAssets) {
    const visibleAssets = stepAssets.slice(0, 3)
    const overflowCount = Math.max(0, stepAssets.length - 3)

    return (
      <div style={{ width: 228 }}>
        <div
          className="border border-slate-300 bg-white rounded-[8px] shadow-sm"
          style={{ width: 228 }}
        >
          {/* Description — clamped to 3 lines with ellipsis; long deliverable
              descriptions otherwise blow out the card height. */}
          <div className="px-3 pt-3">
            <p
              className="line-clamp-3"
              title={description || ''}
              style={{ fontSize: 14, lineHeight: `${LAYOUT.DESC_LINE_HEIGHT}px`, color: COLORS.title }}
            >
              {description || t('nodeMap.finalOutputs')}
            </p>
          </div>

          {/* Stacked fan */}
          <div className="relative flex items-center justify-center" style={{ height: visibleAssets.length >= 3 ? 68 : 62, marginTop: 8 }}>
            {visibleAssets.length >= 3 ? (
              <>
                <StackedThumb
                  asset={visibleAssets[0]}
                  className={`absolute ${FAN_SHELL}`}
                  style={{ width: 55, height: 55, left: 32, transform: 'rotate(-2deg)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                  traceId={traceId}
                  runId={runId}
                  onClick={() => handleAsset(getAssetDisplayName(visibleAssets[0]), visibleAssets[0])}
                />
                <StackedThumb
                  asset={visibleAssets[1]}
                  className={`absolute ${FAN_SHELL}`}
                  style={{ width: 55, height: 55, right: 32, transform: 'rotate(2deg)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                  traceId={traceId}
                  runId={runId}
                  onClick={() => handleAsset(getAssetDisplayName(visibleAssets[1]), visibleAssets[1])}
                />
                <StackedThumb
                  asset={visibleAssets[2]}
                  className={`absolute z-10 ${FAN_SHELL}`}
                  style={{ width: 58, height: 58, left: '50%', transform: 'translateX(-50%) translateY(-4px)', boxShadow: '0 2px 6px rgba(15,23,42,0.18)' }}
                  traceId={traceId}
                  runId={runId}
                  onClick={() => handleAsset(getAssetDisplayName(visibleAssets[2]), visibleAssets[2])}
                />
              </>
            ) : visibleAssets.length === 2 ? (
              <div className="flex gap-2">
                {visibleAssets.map((asset, i) => (
                  <StackedThumb
                    key={i}
                    asset={asset}
                    className={FAN_SHELL}
                    style={{ width: 55, height: 55, boxShadow: '0 2px 6px rgba(15,23,42,0.12)' }}
                    traceId={traceId}
                    runId={runId}
                    onClick={() => handleAsset(getAssetDisplayName(asset), asset)}
                  />
                ))}
              </div>
            ) : (
              <StackedThumb
                asset={visibleAssets[0]}
                className={FAN_SHELL}
                style={{ width: 58, height: 58, boxShadow: '0 2px 6px rgba(15,23,42,0.12)' }}
                traceId={traceId}
                runId={runId}
                onClick={() => handleAsset(getAssetDisplayName(visibleAssets[0]), visibleAssets[0])}
              />
            )}
          </div>

          {overflowCount > 0 && (
            <p className="text-center text-slate-400" style={{ fontSize: 9 }}>
              {t('nodeMap.stepCard.moreOutputs', { count: overflowCount })}
            </p>
          )}

          {/* View button — outline style */}
          <div className="px-2 pb-2 pt-1 flex justify-center">
            <button
              className="flex items-center justify-center border border-[#3B82F6] rounded-[4px] text-[#3B82F6] cursor-pointer hover:bg-blue-50 transition-colors"
              style={{ height: 22, fontSize: 10, fontWeight: 500, paddingInline: 40 }}
              onClick={(e) => { e.stopPropagation(); handleOutputs() }}
            >
              {t('output.viewFinal')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Regular steps: original layout ── */
  const visibleAssets = stepAssets.slice(0, 3)
  const overflowCount = Math.max(0, stepAssets.length - 3)
  const outputTitle = assetTitle || (hasAssets ? generateOutputTitle(stepAssets, t) : t('nodeMap.stepCard.output'))
  const statusText = hasOutputs ? runLabel : t('nodeMap.stepCard.notGeneratedYet')

  return (
    <div className="mt-5 relative" style={{ width: LAYOUT.NODE_WIDTH }}>
      <div
        className="absolute left-1/2 -translate-x-1/2 bg-slate-300"
        style={{ width: 1, height: 20, top: -20 }}
      />
      <div
        className="cursor-pointer mx-auto"
        style={{ width: LAYOUT.OUTPUT_WIDTH }}
        onClick={(e) => {
          e.stopPropagation()
          if (hasOutputs || hasAssets) handleOutputs()
        }}
      >
        {hasAssets ? (
          <div className="group/output relative rounded-[8px] bg-slate-100" style={{ height: 76 }}>
            {visibleAssets.map((asset, idx) => (
              <OutputThumbnailCard
                key={idx}
                fileName={getAssetDisplayName(asset)}
                filePath={asset}
                traceId={traceId}
                runId={runId}
                commit={commit}
                idx={idx}
                generated={generatedSet.has(asset)}
                onAssetClick={handleAsset}
              />
            ))}

            {overflowCount > 0 && (
              <div
                className="absolute rounded-[4px] bg-black/30 flex items-center justify-center text-white font-semibold"
                style={{
                  width: 48,
                  height: 48,
                  top: -6,
                  left: 7 + (visibleAssets.length - 1) * 51,
                  fontSize: 12,
                }}
              >
                +{overflowCount}
              </div>
            )}

            <div
              className="absolute top-8 left-0 right-0 px-[7px] py-[4px] bg-slate-50 rounded-[8px]"
              style={{
                minHeight: 44,
                boxShadow: '0 -4px 4px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              <div className="font-medium text-black" style={{ fontSize: LAYOUT.DESC_FONT_SIZE, lineHeight: `${LAYOUT.DESC_LINE_HEIGHT}px` }}>
                {outputTitle}
              </div>
              {!hidePendingOutputStatus || hasOutputs ? (
                <div className="italic text-slate-500" style={{ fontSize: LAYOUT.DESC_FONT_SIZE, lineHeight: `${LAYOUT.DESC_LINE_HEIGHT}px` }}>
                  {statusText}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-[8px] h-[44px] overflow-hidden px-[8px] py-[4px]">
            <div className="font-medium text-black" style={{ fontSize: LAYOUT.DESC_FONT_SIZE, lineHeight: `${LAYOUT.DESC_LINE_HEIGHT}px` }}>
              {t('nodeMap.stepCard.output')}
            </div>
            {!hidePendingOutputStatus || hasOutputs ? (
              <div className="italic text-slate-500" style={{ fontSize: LAYOUT.DESC_FONT_SIZE, lineHeight: `${LAYOUT.DESC_LINE_HEIGHT}px` }}>
                {statusText}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
