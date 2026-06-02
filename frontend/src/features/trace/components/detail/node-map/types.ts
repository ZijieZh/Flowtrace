// Node Map Types
//
// Naming: status comes from state.json's tagged Status enum; we flatten to a
// single string here for ergonomic UI mapping (STATUS_STYLES table).

export type NodeStatus =
  | 'idle'
  | 'running'
  | 'blocked'
  | 'done'
  | 'error'

export interface NodeMapStep {
  id: string
  name: string
  description?: string
  status: NodeStatus
  message?: string                       // Status-driven one-liner from state.json
  isCurrent?: boolean                    // True when status === 'running'
  assets?: string[]                      // Declared asset paths (trace.json plan)
  generatedAssets?: string[]             // Subset of `assets` actually committed (state.json). Lookup, not index-paired.
  assetTitle?: string                    // Optional label for the asset strip
  fromInputs?: string[]                  // trace.json step.from_inputs
  fromSteps?: Record<string, string>     // DAG dependencies: {arg: source_step_id}
}

export const STATUS_STYLES: Record<NodeStatus, {
  badge: { bg: string; text: string; label: string } | null
  card: { bg: string; border: string }
}> = {
  idle: {
    badge: null,
    card: { bg: '#F1F5F9', border: '#E2E8F0' },
  },
  running: {
    badge: { bg: '#DBEAFE', text: '#1E40AF', label: 'Running' },
    card: { bg: '#EFF6FF', border: '#BFDBFE' },
  },
  blocked: {
    badge: { bg: '#FEF3C7', text: '#92400E', label: 'Blocked' },
    card: { bg: '#FFFBEB', border: '#FDE68A' },
  },
  done: {
    badge: null,
    card: { bg: '#FFFFFF', border: '#B9E1CF' },
  },
  error: {
    badge: { bg: '#FECACA', text: '#991B1B', label: 'Error' },
    card: { bg: '#FEF2F2', border: '#FECACA' },
  },
}

/** Single-character cue prepended to the state-driven message line on a step
 *  card. Empty when no message line is shown (idle). */
export const STATUS_MESSAGE_PREFIX: Record<NodeStatus, string> = {
  idle: '',
  running: '▸ ',
  blocked: '⚠ ',
  done: '✓ ',
  error: '✗ ',
}

export const LAYOUT = {
  // Timeline
  TIMELINE_X: 24,                // X position from canvas left
  TIMELINE_DOT_SIZE: 8,

  // Phase Label
  LABEL_LEFT: 40,                // From canvas left
  LABEL_PADDING_X: 8,
  LABEL_PADDING_Y: 4,
  LABEL_BORDER_RADIUS: 6,
  LABEL_FONT_SIZE: 14,
  LABEL_FONT_WEIGHT: 600,        // SemiBold
  LABEL_HEIGHT: 27,
  LABEL_TO_GROUP_GAP: 12,

  // Group Container
  GROUP_LEFT: 44,                // From canvas left
  GROUP_PADDING_TOP: 8,
  GROUP_PADDING_BOTTOM: 8,
  GROUP_PADDING_SIDE: 16,
  GROUP_BORDER_RADIUS: 6,
  ROW_GAP: 56,                   // Vertical gap between rows

  // Card
  NODE_WIDTH: 216,              // 27 × 8px grid
  NODE_PADDING: 12,
  NODE_GAP: 8,                   // Gap between elements inside card
  NODE_BORDER_RADIUS: 8,

  // Output Section (below card)
  OUTPUT_WIDTH: 163,             // Narrower than NODE_WIDTH
  OUTPUT_HEIGHT: 76,
  OUTPUT_THUMBNAIL_SIZE: 48,
  OUTPUT_THUMBNAIL_GAP: 3,       // Gap between thumbnails
  OUTPUT_MARGIN_X: 7,            // Left/right margin for thumbnails

  // Card Header
  HEADER_ICON_SIZE: 14,
  HEADER_ICON_GAP: 4,            // Gap between icon and title
  HEADER_TITLE_SIZE: 14,
  HEADER_TITLE_HEIGHT: 36,       // Fixed height for 2 lines (2 * 18px) - ensures consistent card height
  HEADER_CHEVRON_SIZE: 12,

  // Card Description
  DESC_FONT_SIZE: 10,
  DESC_LINE_HEIGHT: 16,

  // Connector (dot-line-dot)
  CONNECTOR_WIDTH: 40,
  CONNECTOR_DOT_SIZE: 4,

  // Status Badge
  BADGE_PADDING_X: 8,
  BADGE_PADDING_Y: 2,
  BADGE_BORDER_RADIUS: 12,       // Pill shape
  BADGE_ICON_SIZE: 12,
  BADGE_ICON_GAP: 6,
  BADGE_TO_CARD_GAP: 2,

  // Hover Action Buttons
  ACTION_BTN_SIZE: 20,
  ACTION_BTN_PADDING: 6,
  ACTION_BTN_ICON_SIZE: 12,
  ACTION_BTN_RADIUS: 4,
  ACTION_BTN_GAP: 4,

  // Expanded Card
  SEPARATOR_HEIGHT: 1,
  TAB_PADDING_X: 4,
  TAB_PADDING_Y: 2,
  TAB_RADIUS: 4,
  TAB_GAP: 8,
  TAB_ICON_SIZE: 16,
  TAB_FONT_SIZE: 12,
  TAB_FONT_SIZE_SM: 10,

  // Method Item
  METHOD_ITEM_HEIGHT: 24,
  METHOD_ITEM_PADDING: 4,
  METHOD_ITEM_RADIUS: 6,
  METHOD_CHECKBOX_SIZE: 12,
  METHOD_CHECKBOX_GAP: 8,
  METHOD_ITEM_GAP: 4,

  // Explore Link
  EXPLORE_ICON_SIZE: 16,
  EXPLORE_GAP: 6,

  // Max per row
  MAX_NODES_PER_ROW: 5,

  // Full card height calculation (for DAG layout spacing)
  // Badge row (24) + gap (4) + card (~100) + gap (12) + output section (76 max)
  CARD_TOTAL_HEIGHT: 220,
} as const

export const COLORS = {
  title: '#0F172A',              // slate-900
  description: '#0F172A',        // slate-900
  tabActiveBg: '#F1F5F9',        // slate-100
  tabText: '#0F172A',            // slate-900
} as const
