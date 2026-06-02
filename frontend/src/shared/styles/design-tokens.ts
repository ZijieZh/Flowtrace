/**
 * Design Tokens for Agent Renderers
 * Single source of truth for typography, spacing, and styling
 */

// Typography Scale (16px chat base for accessibility)
export const TYPOGRAPHY = {
  // Tool block header
  toolTitle: 'text-base',            // 16px - tool headers (= chatBody)
  toolTitleLarge: 'text-base',       // 16px - tool block titles (= chatBody)
  toolTitleWeight: 'font-semibold',

  // Body content (16px chat base)
  proseSize: 'prose-base',           // 16px base for prose plugin
  proseMaxWidth: 'max-w-none',
  proseBodySize: 'text-[17px]',
  chatBodySize: 'text-base',
  chatBodyLeading: 'leading-normal',
  secondarySize: 'text-sm',
  tertiarySize: 'text-xs',
  proseMonoSize: 'text-base',
  toolOutputSize: 'text-[15px]',
  calloutSize: 'text-[15px]',
  bodySize: 'text-lg',
  navSize: 'text-[15px]',

  // Code blocks and editors
  codeBlockSize: '16px',
  inlineCodeSize: 'text-base',
  codeFont: 'font-mono',
  sansFont: 'font-sans',
  editorSmallSize: '14px',
  editorSize: '16px',

  // Labels and metadata (smallest tier)
  labelSize: 'text-[13px]',
  labelWeight: 'font-bold',
  labelTracking: 'tracking-wider',
  labelCase: 'uppercase',

  // Font weights
  fontBold: 'font-bold',
  fontMedium: 'font-medium',
  fontSemibold: 'font-semibold',
} as const

const SPACING = {
  inlineCodePadding: 'px-1.5 py-0.5',
} as const

// Colors
export const COLORS = {
  // Backgrounds
  toolBlockBg: 'bg-white',
  toolBlockBgHover: 'hover:bg-slate-50',
  contentBg: 'bg-slate-50',
  iconBg: 'bg-slate-100',
  codeBlockBg: 'bg-slate-100',

  // Borders
  border: 'border-slate-200',
  codeBlockBorder: 'border-slate-300',

  // Text colors
  primary: 'text-slate-900',
  secondary: 'text-slate-700',
  tertiary: 'text-slate-500',
  error: 'text-red-600',
  success: 'text-green-600',
  codeText: 'text-slate-900',

  // Icon colors
  icon: 'text-slate-700',

  // Marker colors
  listMarker: 'prose-li:marker:text-slate-900',
} as const

const RADIUS = {
  button: 'rounded',
} as const

// Helper function for inline code styling
// Uses secondarySize (14px) - compact monospace
export function getInlineCodeClasses(): string {
  return [
    SPACING.inlineCodePadding,
    RADIUS.button,
    COLORS.codeBlockBg,
    TYPOGRAPHY.secondarySize,
    TYPOGRAPHY.codeFont,
  ].join(' ')
}
