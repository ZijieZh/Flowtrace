
import { memo } from 'react'
import { CircleNotch, WarningCircle, Warning } from '@phosphor-icons/react'
import type { NodeStatus } from './types'
import { STATUS_STYLES, LAYOUT } from './types'

interface StatusBadgeProps {
  status: NodeStatus
}

// Icon per status
const STATUS_ICONS: Record<NodeStatus, typeof CircleNotch | null> = {
  idle: null,
  running: CircleNotch,
  blocked: Warning,
  done: null,
  error: WarningCircle,
}

function StatusBadge({ status }: StatusBadgeProps) {
  const styles = STATUS_STYLES[status]

  // No badge for default status
  if (!styles.badge) return null

  const Icon = STATUS_ICONS[status]

  return (
    <div
      className="inline-flex items-center justify-center shrink-0 self-start"
      style={{
        gap: LAYOUT.BADGE_ICON_GAP,
        paddingLeft: LAYOUT.BADGE_PADDING_X,
        paddingRight: LAYOUT.BADGE_PADDING_X,
        paddingTop: LAYOUT.BADGE_PADDING_Y,
        paddingBottom: LAYOUT.BADGE_PADDING_Y,
        borderRadius: LAYOUT.BADGE_BORDER_RADIUS,
        backgroundColor: styles.badge.bg,
      }}
    >
      {Icon && (
        <Icon
          className={status === 'running' ? 'animate-spin' : ''}
          style={{
            width: LAYOUT.BADGE_ICON_SIZE,
            height: LAYOUT.BADGE_ICON_SIZE,
            color: styles.badge.text,
            flexShrink: 0,
          }}
        />
      )}
      <span
        className="font-normal whitespace-nowrap"
        style={{
          fontSize: LAYOUT.TAB_FONT_SIZE,
          lineHeight: `${LAYOUT.DESC_LINE_HEIGHT}px`,
          color: styles.badge.text,
        }}
      >
        {styles.badge.label}
      </span>
    </div>
  )
}

export default memo(StatusBadge)
