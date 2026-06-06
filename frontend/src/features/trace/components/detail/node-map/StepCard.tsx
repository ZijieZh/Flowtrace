import { memo, useState, useRef, useEffect, useMemo } from 'react'
import { CaretRight, Pause } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { useStepFiles, useStepFileContent } from '@/features/trace/api/trace-core'
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

/** First method line of a STEP.md, plain-text, for the on-card spec teaser.
 *  Strips frontmatter, the leading H1, and any "Source skill:" line, then
 *  takes the first paragraph and removes markdown markers. CSS truncates it. */
function extractSpecTeaser(md: string | undefined): string | null {
  if (!md) return null
  let body = md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '') // frontmatter
  body = body.replace(/^\s*#[^\n]*\r?\n/, '') // leading H1
  // First paragraph that isn't the (possibly multi-line) "Source skill:" block.
  const para = body
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .find((p) => !/^source(\s+skill)?\s*:/i.test(p))
  if (!para) return null
  const plain = para
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\*([^*]*)\*/g, '$1')
    .replace(/^[->*\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain || null
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
  const { id, name, description, status, message, assets, generatedAssets, assetTitle } = step
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

  const [docsOpen, setDocsOpen] = useState(false)

  // Spec teaser — lazily fetch STEP.md only while the card is hovered.
  const [hovered, setHovered] = useState(false)
  const wantSpec = hovered && !isDeliverable && !!traceId
  const { data: stepFiles } = useStepFiles(traceId, wantSpec ? id : undefined)
  const stepMdPath = stepFiles?.find((f) => f.name.toLowerCase() === 'step.md')?.path
  const { data: stepMdText } = useStepFileContent(wantSpec ? stepMdPath : undefined)
  const specTeaser = useMemo(() => extractSpecTeaser(stepMdText), [stepMdText])

  const isRunning = status === 'running'

  return (
    <div
      className={cn('relative group')}
      style={{ width: LAYOUT.NODE_WIDTH }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Badge Row */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 4, minHeight: LAYOUT.ACTION_BTN_SIZE }}
      >
        {showBadge ? <StatusBadge status={status} /> : <div />}
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

          {/* Spec teaser — fills the slot the (empty) inputs placeholder used to
              occupy. Reveals on card hover: a one-line method teaser from
              STEP.md; click opens the full spec drawer. */}
          {!isDeliverable && traceId && (
            <div
              className="absolute left-0 right-0 z-40 hidden group-hover/card:block"
              style={{ top: '100%', marginTop: 4 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Open step spec"
                onClick={(e) => { e.stopPropagation(); setDocsOpen(true) }}
                className="nodrag flex w-full items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-400">Spec</span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-slate-600">
                  {specTeaser ?? 'View step spec'}
                </span>
                <CaretRight size={12} weight="bold" className="shrink-0 text-slate-300" />
              </button>
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
