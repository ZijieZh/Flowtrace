
import { memo, useState, useRef, useEffect } from 'react'
import { FileArrowDown, Pause, Info } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import type { NodeMapStep } from './types'
import { LAYOUT, COLORS, STATUS_STYLES, STATUS_MESSAGE_PREFIX } from './types'
import StatusBadge from './StatusBadge'
import { StepCardOutputs } from './StepCardOutputs'
import { StepDocsDrawer } from './StepDocsDrawer'

interface StepCardProps {
  step: NodeMapStep
  traceId?: string
  runId?: string
  /** Pinned commit SHA — threaded into asset URLs for immutable caching. */
  commit?: string
  hidePendingOutputStatus?: boolean
  onInterrupt?: () => void
}


function StepCard({
  step,
  traceId,
  runId,
  commit,
  hidePendingOutputStatus = false,
  onInterrupt,
}: StepCardProps) {
  const { t } = useTranslation('trace')
  const { id, name, description, status, message, assets, generatedAssets, assetTitle, fromInputs } = step
  const stepAssets = assets || []
  const stepGenerated = generatedAssets || []
  const hasOutputs = stepGenerated.length > 0

  const isDeliverable = id === '__deliverable__'

  const styles = isDeliverable
    ? { card: { bg: '#FFFFFF', border: '#E2E8F0' }, badge: null, icon: { bg: 'transparent', border: 'transparent' } }
    : STATUS_STYLES[status]

  const showBadge = !isDeliverable && (status === 'running' || status === 'blocked' || status === 'error') && styles.badge

  // Message line tracks the status accent (reuses badge.text where available).
  const messageColor = styles.badge?.text ?? (status === 'done' ? '#047857' : '#475569')

  // Measure description height for locked-height container
  const descRef = useRef<HTMLDivElement>(null)
  const [descHeight, setDescHeight] = useState<number>(0)
  useEffect(() => {
    if (descRef.current) setDescHeight(descRef.current.offsetHeight)
  }, [description])

  const displayName = name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())

  const visibleInputs = fromInputs ? fromInputs.slice(0, 8) : []
  const hiddenInputsCount = Math.max(0, (fromInputs?.length || 0) - visibleInputs.length)

  // Active tab for expanded view (memory tab removed; inputs only)
  const [tabs, setTabs] = useState<{ expanded: boolean; tab: 'inputs' | null }>({
    expanded: false,
    tab: null,
  })
  const overlayRef = useRef<HTMLDivElement>(null)
  const [docsOpen, setDocsOpen] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const previousNodeZIndex = useRef<string | null>(null)

  // Close expanded overlay on canvas click
  useEffect(() => {
    if (!tabs.expanded) return

    const handleCanvasClick = () => {
      setTabs({ expanded: false, tab: null })
    }

    document.addEventListener('nodemap:pane-click', handleCanvasClick)
    return () => document.removeEventListener('nodemap:pane-click', handleCanvasClick)
  }, [tabs.expanded])

  // Z-index boost when tabs are expanded
  useEffect(() => {
    const nodeElement = cardRef.current?.closest<HTMLElement>('.react-flow__node')
    if (!nodeElement) return

    const restoreZIndex = () => {
      if (previousNodeZIndex.current !== null) {
        nodeElement.style.zIndex = previousNodeZIndex.current
        previousNodeZIndex.current = null
      }
    }

    if (tabs.expanded) {
      if (previousNodeZIndex.current === null) {
        previousNodeZIndex.current = nodeElement.style.zIndex
      }
      nodeElement.style.zIndex = '1000'
      return () => { restoreZIndex() }
    }

    restoreZIndex()
  }, [tabs.expanded])

  const isRunning = status === 'running'

  return (
    <div
      ref={cardRef}
      className={cn('relative group')}
      style={{ width: LAYOUT.NODE_WIDTH }}
    >
      {/* Badge Row */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 4, minHeight: LAYOUT.ACTION_BTN_SIZE }}
      >
        {showBadge ? <StatusBadge status={status} /> : <div />}
        {!isDeliverable && traceId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Step documentation"
                onClick={(e) => { e.stopPropagation(); setDocsOpen(true) }}
                className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 nodrag"
                style={{ width: LAYOUT.ACTION_BTN_SIZE, height: LAYOUT.ACTION_BTN_SIZE }}
              >
                <Info size={16} weight="regular" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Open step docs</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Card (non-deliverable only — deliverable is a single merged card in output section) */}
      {!isDeliverable && (
      <div className="relative group/card" style={{ width: LAYOUT.NODE_WIDTH }}>
        {/* Hidden description for height measurement */}
        <div
          ref={descRef}
          aria-hidden
          style={{
            position: 'absolute',
            visibility: 'hidden',
            width: LAYOUT.NODE_WIDTH - LAYOUT.NODE_PADDING * 2,
            fontSize: LAYOUT.DESC_FONT_SIZE,
            lineHeight: `${LAYOUT.DESC_LINE_HEIGHT}px`,
          }}
        >
          {description}
        </div>

        {/* Animated border glow when running */}
        {isRunning && (
          <div
            className="absolute -inset-[1.5px] rounded-[9px]"
            style={{
              background: 'conic-gradient(from var(--border-angle, 0deg), #BFDBFE 0%, #60A5FA 25%, #3B82F6 50%, #60A5FA 75%, #BFDBFE 100%)',
              animation: 'borderGlow 3s linear infinite',
              zIndex: 0,
            }}
          />
        )}

        <div
          style={{
            width: LAYOUT.NODE_WIDTH,
            minHeight: 'auto',
            borderRadius: LAYOUT.NODE_BORDER_RADIUS,
            backgroundColor: styles.card.bg,
            borderColor: isRunning ? 'transparent' : styles.card.border,
            overflow: 'visible',
            position: 'relative',
            zIndex: 1,
          }}
          className={cn('relative flex flex-col border transition-all', !isRunning && 'hover:shadow-sm')}
        >
          <div
            style={{
              padding: LAYOUT.NODE_PADDING,
              gap: LAYOUT.NODE_GAP,
              maxHeight: 460,
              overflow: 'hidden',
              borderRadius: LAYOUT.NODE_BORDER_RADIUS,
            }}
            className="flex flex-col"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: LAYOUT.NODE_GAP, flexShrink: 0 }}>
              {/* Header */}
              <div className="flex items-start border-b-[0.5px] border-slate-300 pb-2" style={{ gap: LAYOUT.HEADER_ICON_GAP }}>
                <span className="relative flex flex-1 items-start min-w-0">
                  <span
                    className="shrink-0 break-words"
                    style={{
                      width: 149,
                      paddingRight: 2,
                      fontSize: LAYOUT.HEADER_TITLE_SIZE,
                      lineHeight: `${LAYOUT.DESC_LINE_HEIGHT}px`,
                      color: COLORS.title,
                    }}
                  >
                    {displayName}
                  </span>
                </span>

                {/* Stop button — only visible while running; calls the interrupt handler */}
                {!isDeliverable && isRunning && (
                  <Tooltip disableHoverableContent>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onInterrupt?.()
                        }}
                        className={cn('shrink-0 flex items-center justify-center border transition-all', 'cursor-pointer rounded-[4px] hover:bg-slate-100')}
                        style={{
                          width: LAYOUT.ACTION_BTN_SIZE,
                          height: LAYOUT.ACTION_BTN_SIZE,
                          borderRadius: LAYOUT.ACTION_BTN_RADIUS,
                          borderColor: '#CBD5E1',
                        }}
                      >
                        <Pause
                          weight="regular"
                          style={{ width: LAYOUT.ACTION_BTN_ICON_SIZE, height: LAYOUT.ACTION_BTN_ICON_SIZE, color: '#64748B' }}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8} side="top">{t('nodeMap.stepCard.stop')}</TooltipContent>
                  </Tooltip>
                )}
              </div>

              <div style={{ height: descHeight || undefined, overflow: 'hidden' }}>
                <p
                  style={{
                    fontSize: LAYOUT.DESC_FONT_SIZE,
                    lineHeight: `${LAYOUT.DESC_LINE_HEIGHT}px`,
                    color: COLORS.description,
                  }}
                >
                  {description || t('nodeMap.stepCard.noDescription')}
                </p>
              </div>

              {/* State-driven message line (running activity / blocked reason / done takeaway / error) */}
              {message && STATUS_MESSAGE_PREFIX[status] !== '' && (
                <div
                  className="pt-1.5 mt-0.5 border-t border-slate-200/70"
                  style={{
                    fontSize: LAYOUT.DESC_FONT_SIZE,
                    lineHeight: `${LAYOUT.DESC_LINE_HEIGHT}px`,
                    color: messageColor,
                    fontStyle: status === 'running' ? 'italic' : 'normal',
                    fontWeight: status === 'blocked' || status === 'error' ? 500 : 400,
                  }}
                >
                  {STATUS_MESSAGE_PREFIX[status]}{message}
                </div>
              )}
            </div>
          </div>

          {/* Hover bridge */}
          <div aria-hidden="true" className="absolute left-0 right-0 z-[9]" style={{ top: '100%', height: 4 }} />

          {/* Memory + Inputs tabs (overlay on hover, stays when expanded) */}
          {!isDeliverable && (
            <div
              ref={overlayRef}
              className={cn(
                "absolute -top-2 left-0 right-0 z-40 border border-slate-200 bg-white rounded-[8px] shadow-sm",
                tabs.expanded ? "block" : "hidden group-hover/card:block"
              )}
              style={{
                top: '100%',
                marginTop: 4,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-1.5 py-1">
                <div
                  className={cn('flex items-center w-full', tabs.expanded && 'mb-3')}
                  style={{ gap: LAYOUT.TAB_GAP, flexShrink: 0 }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setTabs((s) => {
                        const same = s.tab === 'inputs'
                        if (s.expanded && same) return { expanded: false, tab: null }
                        return { expanded: true, tab: 'inputs' }
                      })
                    }}
                    className="flex-1 justify-center cursor-pointer flex items-center gap-0.5 transition-colors hover:!bg-slate-50"
                    style={{
                      padding: `${LAYOUT.TAB_PADDING_Y}px ${LAYOUT.TAB_PADDING_X}px`,
                      borderRadius: LAYOUT.TAB_RADIUS,
                      backgroundColor: tabs.tab === 'inputs' ? COLORS.tabActiveBg : 'transparent',
                    }}
                  >
                    <FileArrowDown style={{ width: 12, height: 12, color: COLORS.tabText }} />
                    <span style={{ fontSize: LAYOUT.TAB_FONT_SIZE, lineHeight: `${LAYOUT.DESC_LINE_HEIGHT}px`, color: COLORS.tabText }}>
                      {t('nodeMap.stepCard.inputs')}
                    </span>
                  </button>
                </div>
                {tabs.expanded && tabs.tab === 'inputs' && (
                  <div
                    className="flex flex-col"
                    style={{ maxHeight: 240, paddingRight: 4, paddingBottom: 6 }}
                  >
                    <div className="flex-1 overflow-y-auto">
                      <div className="flex flex-col pl-1.5" style={{ gap: 8 }}>
                        {fromInputs && fromInputs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {visibleInputs.map((inputName) => (
                              <Badge
                                key={inputName}
                                variant="outline"
                                className="rounded-[4px] border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-normal leading-3 text-slate-600"
                              >
                                {inputName}
                              </Badge>
                            ))}
                            {hiddenInputsCount > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] leading-3 text-slate-400">
                                +{hiddenInputsCount}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">{t('nodeMap.stepCard.noUserInputs')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      <StepCardOutputs
        isDeliverable={isDeliverable}
        stepAssets={stepAssets}
        stepGenerated={stepGenerated}
        hasOutputs={!!hasOutputs}
        description={description}
        assetTitle={assetTitle}
        hidePendingOutputStatus={hidePendingOutputStatus}
        runLabel=""
        traceId={traceId}
        runId={runId}
        commit={commit}
        stepId={isDeliverable ? undefined : id}
        stepName={isDeliverable ? undefined : name}
        t={t}
      />

      {!isDeliverable && traceId && docsOpen && (
        <StepDocsDrawer
          onClose={() => setDocsOpen(false)}
          traceId={traceId}
          stepId={id}
          stepName={displayName}
          does={description}
        />
      )}
    </div>
  )
}

export default memo(StepCard)
