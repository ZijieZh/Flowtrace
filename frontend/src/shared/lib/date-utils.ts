/**
 * Centralized date/time utilities for consistent timezone handling.
 *
 * All timestamps from the backend are stored as timestamptz in UTC.
 * These utilities ensure proper parsing and display in the user's local timezone.
 */

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const WEEK_MS = 7 * DAY_MS
const MONTH_MS = 30 * DAY_MS
const YEAR_MS = 365 * DAY_MS

const relativeTimeFormatters = new Map<string, Intl.RelativeTimeFormat>()

function getRelativeTimeFormatter(locale: string): Intl.RelativeTimeFormat {
  const existing = relativeTimeFormatters.get(locale)
  if (existing) return existing

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  relativeTimeFormatters.set(locale, formatter)
  return formatter
}

/**
 * Parse timestamp, treating as UTC if no timezone specified.
 * This handles the case where PostgreSQL returns timestamps without explicit timezone.
 * Also handles Date objects and numbers (epoch ms) passed through.
 */
function parseTimestamp(timestamp: string | Date | number | null | undefined): Date {
  if (timestamp == null) return new Date(NaN)
  if (timestamp instanceof Date) return timestamp
  if (typeof timestamp === 'number') return new Date(timestamp)
  if (typeof timestamp !== 'string') return new Date(NaN)
  if (!timestamp) return new Date(NaN)
  if (!timestamp.endsWith('Z') && !timestamp.match(/[+-]\d{2}:?\d{2}$/)) {
    return new Date(timestamp + 'Z')
  }
  return new Date(timestamp)
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago", "5 minutes ago")
 * Uses user's local timezone.
 */
export function formatRelativeTime(timestamp: string, locale = 'en-US'): string {
  try {
    const date = parseTimestamp(timestamp)
    if (isNaN(date.getTime())) return ''

    const rtf = getRelativeTimeFormatter(locale)
    const diffMs = date.getTime() - Date.now()
    const absDiffMs = Math.abs(diffMs)

    if (absDiffMs < 30 * 1000) {
      return rtf.format(0, 'second')
    }
    if (absDiffMs < HOUR_MS) return rtf.format(Math.round(diffMs / MINUTE_MS), 'minute')
    if (absDiffMs < DAY_MS) return rtf.format(Math.round(diffMs / HOUR_MS), 'hour')
    if (absDiffMs < WEEK_MS) return rtf.format(Math.round(diffMs / DAY_MS), 'day')
    if (absDiffMs < MONTH_MS) return rtf.format(Math.round(diffMs / WEEK_MS), 'week')
    if (absDiffMs < YEAR_MS) return rtf.format(Math.round(diffMs / MONTH_MS), 'month')
    return rtf.format(Math.round(diffMs / YEAR_MS), 'year')
  } catch {
    return ''
  }
}
